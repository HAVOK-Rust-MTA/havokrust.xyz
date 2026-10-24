// Ciclo de wipe: regras e banco (D1). O Worker é o calendário oficial; o servidor MTA executa o wipe de verdade
// (havok_wipe: cópia do banco e depois limpeza) e só então confirma. Um ciclo novo nasce SÓ dessa confirmação.
//
// A fase é sempre calculada da hora atual contra scheduled_wipe_at (nunca um contador decrementado), então
// sobrevive a reinício, deploy e cron atrasado.

export const DEFAULT_CYCLE_S = 15 * 86400;   // 1.296.000 s
export const FINAL_PVP_S = 24 * 3600;
export const nowS = () => Math.floor(Date.now() / 1000);

export const cycleSeconds = (env) => {
  const n = parseInt(env.WIPE_CYCLE_SECONDS, 10);
  return n >= 3600 && n <= 120 * 86400 ? n : DEFAULT_CYCLE_S;
};

// NORMAL -> FINAL_PVP (24 h finais) -> WIPE_PENDING (chegou a zero / servidor fazendo) ; FAILED = servidor avisou falha
export function phaseOf(cycle, t = nowS()) {
  if (!cycle) return 'NONE';
  if (cycle.status === 'failed') return 'FAILED';
  if (cycle.status === 'wiping' || t >= cycle.scheduled_wipe_at) return 'WIPE_PENDING';
  if (t >= cycle.scheduled_wipe_at - FINAL_PVP_S) return 'FINAL_PVP';
  return 'NORMAL';
}

// visão pública/servidor: só o que qualquer visitante pode saber
export function cycleView(cycle, t = nowS()) {
  if (!cycle) return { status: 'NONE', mode: 'NONE', serverTime: new Date(t * 1000).toISOString(), serverTimeUnix: t };
  const phase = phaseOf(cycle, t);
  const duration = cycle.scheduled_wipe_at - cycle.started_at;
  const remaining = Math.max(0, cycle.scheduled_wipe_at - t);
  const elapsed = Math.min(duration, Math.max(0, t - cycle.started_at));
  return {
    cycleId: cycle.id,
    status: phase,
    mode: phase === 'FINAL_PVP' ? 'FINAL_PVP' : phase === 'NORMAL' ? 'NORMAL' : phase,
    pvpActive: phase === 'FINAL_PVP' && !!cycle.pvp_confirmed_at,
    startedAt: new Date(cycle.started_at * 1000).toISOString(),
    scheduledWipeAt: new Date(cycle.scheduled_wipe_at * 1000).toISOString(),
    finalPvpStartsAt: new Date((cycle.scheduled_wipe_at - FINAL_PVP_S) * 1000).toISOString(),
    serverTime: new Date(t * 1000).toISOString(),
    durationSeconds: duration,
    remainingSeconds: remaining,
    progressPercent: Math.round((elapsed / duration) * 1000) / 10,
    // os mesmos instantes em segundos Unix (o servidor MTA usa estes)
    startedAtUnix: cycle.started_at,
    scheduledWipeAtUnix: cycle.scheduled_wipe_at,
    serverTimeUnix: t,
    finalPvpSeconds: FINAL_PVP_S,
  };
}

export const currentCycle = (db) => db.prepare('SELECT * FROM wipe_cycles WHERE is_current = 1').first();
export const getCycle = (db, id) => db.prepare('SELECT * FROM wipe_cycles WHERE id = ?').bind(id).first();
export const recentCycles = (db, n = 5) => db.prepare('SELECT * FROM wipe_cycles ORDER BY id DESC LIMIT ?').bind(n).all().then((r) => r.results);

// registra um evento; com dedupe_key, a segunda vez não grava e devolve false
export async function logEvent(db, { cycleId = null, type, origin, metadata = null, dedupe = null, at = nowS() }) {
  const r = await db.prepare(
    `INSERT OR IGNORE INTO wipe_events (cycle_id, event_type, event_at, origin, metadata, dedupe_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(cycleId, type, at, origin, metadata === null ? null : JSON.stringify(metadata).slice(0, 2000), dedupe, nowS()).run();
  return r.meta.changes === 1;
}

// //------------------- ADMINISTRAÇÃO -------------------\\
// /wipe definir: agenda o próximo wipe.
//  - sem ciclo: cria o primeiro (começa agora, termina na data escolhida; os seguintes têm a duração padrão)
//  - ciclo contando: muda a data
//  - ciclo com falha: volta a contar para a nova data (recuperação)
//  - wipe em andamento no servidor: recusa
// Devolve { ok, cycle?, reason? }
export async function defineWipe(db, { at, actor, t = nowS() }) {
  if (!Number.isInteger(at)) return { ok: false, reason: 'invalid' };
  if (at < t + 15 * 60) return { ok: false, reason: 'too_soon' };
  if (at > t + 120 * 86400) return { ok: false, reason: 'too_far' };
  const cur = await currentCycle(db);
  if (!cur) {
    try {
      const r = await db.prepare(
        `INSERT INTO wipe_cycles (started_at, scheduled_wipe_at, status, is_current, created_by, created_at, updated_at)
         VALUES (?, ?, 'active', 1, ?, ?, ?)`,
      ).bind(t, at, actor, t, t).run();
      await logEvent(db, { cycleId: r.meta.last_row_id, type: 'cycle_created', origin: `admin:${actor}`, metadata: { scheduled: at } });
      return { ok: true, cycle: await getCycle(db, r.meta.last_row_id), created: true };
    } catch (e) {
      if (/UNIQUE/i.test(String(e.message))) return { ok: false, reason: 'race' };
      throw e;
    }
  }
  if (cur.status === 'wiping') return { ok: false, reason: 'wiping', cycle: cur };
  // muda a data só se o ciclo ainda está do mesmo jeito (sem corrida com uma confirmação do servidor)
  const r = await db.prepare(
    `UPDATE wipe_cycles SET scheduled_wipe_at = ?, status = 'active', updated_at = ?
     WHERE id = ? AND status IN ('active', 'failed') AND is_current = 1 AND ? > started_at`,
  ).bind(at, t, cur.id, at).run();
  if (r.meta.changes !== 1) return { ok: false, reason: 'race' };
  await logEvent(db, { cycleId: cur.id, type: cur.status === 'failed' ? 'cycle_recovered' : 'cycle_rescheduled', origin: `admin:${actor}`, metadata: { from: cur.scheduled_wipe_at, to: at } });
  return { ok: true, cycle: await getCycle(db, cur.id), created: false };
}

// //------------------- EVENTOS DO SERVIDOR MTA -------------------\\
// Todos idempotentes: repetir o mesmo evento não muda nada nem duplica aviso.
// Devolve { ok, status (HTTP), result, notify? }
export async function applyServerEvent(db, ev, { env, t = nowS() } = {}) {
  const id = Number(ev.cycleId);
  if (!Number.isInteger(id) || id < 1) return { ok: false, status: 400, result: 'bad_cycle' };
  const cycle = await getCycle(db, id);
  if (!cycle) return { ok: false, status: 404, result: 'unknown_cycle' };

  switch (ev.type) {
    case 'pvp_on': {
      // 2 min de folga para relógios levemente diferentes entre o servidor e o Worker
      const inWindow = t >= cycle.scheduled_wipe_at - FINAL_PVP_S - 120;
      if (cycle.status !== 'active' || !inWindow) return { ok: false, status: 409, result: 'not_final_phase' };
      await db.prepare('UPDATE wipe_cycles SET pvp_confirmed_at = COALESCE(pvp_confirmed_at, ?), updated_at = ? WHERE id = ?').bind(t, t, id).run();
      const fresh = await logEvent(db, { cycleId: id, type: 'pvp_on', origin: 'mta', dedupe: `pvp_on:${id}` });
      return { ok: true, status: 200, result: 'pvp_on', notify: fresh ? 'pvp' : null };
    }
    case 'wipe_started': {
      if (cycle.status === 'completed') return { ok: true, status: 200, result: 'already_completed' };
      if (t < cycle.scheduled_wipe_at - 120) return { ok: false, status: 409, result: 'too_early' };
      await db.prepare(`UPDATE wipe_cycles SET status = 'wiping', wipe_started_at = COALESCE(wipe_started_at, ?), updated_at = ? WHERE id = ? AND status IN ('active', 'failed')`).bind(t, t, id).run();
      const fresh = await logEvent(db, { cycleId: id, type: 'wipe_started', origin: 'mta', dedupe: `wipe_started:${id}` });
      return { ok: true, status: 200, result: 'wiping', notify: fresh ? 'started' : null };
    }
    case 'wipe_failed': {
      if (cycle.status === 'completed') return { ok: true, status: 200, result: 'already_completed' };
      await db.prepare(`UPDATE wipe_cycles SET status = 'failed', updated_at = ? WHERE id = ? AND status IN ('active', 'wiping')`).bind(t, id).run();
      const fresh = await logEvent(db, { cycleId: id, type: 'wipe_failed', origin: 'mta', metadata: { detail: String(ev.detail || '').slice(0, 300) }, dedupe: `wipe_failed:${id}:${cycle.wipe_started_at || 0}` });
      return { ok: true, status: 200, result: 'failed', notify: fresh ? 'failed' : null };
    }
    case 'wipe_done': {
      // a hora do wipe real (o servidor manda); o próximo ciclo conta a partir dela
      let at = Number(ev.at);
      if (!Number.isInteger(at) || at > t + 120 || at < cycle.started_at) at = t;
      const next = await db.prepare('SELECT * FROM wipe_cycles WHERE previous_cycle_id = ?').bind(id).first();
      if (cycle.status === 'completed') {
        // confirmação repetida (o servidor reenviou): devolve o ciclo que já foi criado
        return { ok: true, status: 200, result: 'already_completed', nextCycleId: next ? next.id : null };
      }
      if (t < cycle.scheduled_wipe_at - 120 && cycle.status !== 'wiping') return { ok: false, status: 409, result: 'too_early' };
      const duration = cycleSeconds(env || {});
      const [closed] = await db.batch([
        db.prepare(`UPDATE wipe_cycles SET status = 'completed', is_current = NULL, actual_wipe_at = ?, wipe_confirmed_at = ?, updated_at = ?
                     WHERE id = ? AND status IN ('active', 'wiping', 'failed')`).bind(at, t, t, id),
        db.prepare(`INSERT INTO wipe_cycles (started_at, scheduled_wipe_at, status, is_current, previous_cycle_id, created_by, created_at, updated_at)
                    SELECT ?, ?, 'active', 1, ?, 'mta', ?, ? WHERE changes() = 1`).bind(at, at + duration, id, t, t),
        db.prepare(`INSERT OR IGNORE INTO wipe_events (cycle_id, event_type, event_at, origin, metadata, dedupe_key, created_at)
                    VALUES (?, 'wipe_done', ?, 'mta', NULL, ?, ?)`).bind(id, at, `wipe_done:${id}`, t),
      ]);
      if (closed.meta.changes === 1) {
        // o ranking do site zera junto com o jogo (jogadores e grupos são "deste wipe").
        // Os vínculos com o Discord (players) e os logins do site NÃO: o vínculo é permanente.
        const reset = [db.prepare('DELETE FROM game_players'), db.prepare('DELETE FROM game_groups')];
        try { await db.batch(reset); } catch (e) { console.log('wipe: reset do site falhou', String(e)); }
      }
      const created = await db.prepare('SELECT * FROM wipe_cycles WHERE previous_cycle_id = ?').bind(id).first();
      return { ok: true, status: 200, result: closed.meta.changes === 1 ? 'completed' : 'already_completed', nextCycleId: created ? created.id : null, notify: closed.meta.changes === 1 ? 'done' : null };
    }
    default:
      return { ok: false, status: 400, result: 'unknown_type' };
  }
}
