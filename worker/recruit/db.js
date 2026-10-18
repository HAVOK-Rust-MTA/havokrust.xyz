// Operações no D1. Toda escrita que decide alguma coisa é UMA instrução condicional (ou um batch, que o D1
// roda como transação): o banco decide, não o Worker. Assim dois cliques ao mesmo tempo não furam regra.

export const nowS = () => Math.floor(Date.now() / 1000);

// processo atual = o mais recente do servidor
export const currentProcess = (db, guildId) =>
  db.prepare('SELECT * FROM recruitment_processes WHERE guild_id = ? ORDER BY id DESC LIMIT 1').bind(guildId).first();

export const getProcess = (db, id) => db.prepare('SELECT * FROM recruitment_processes WHERE id = ?').bind(id).first();

export async function processStats(db, processId) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'approved'), 0) AS approved,
            COALESCE(SUM(status = 'rejected'), 0) AS rejected,
            COALESCE(SUM(status = 'pending'), 0) AS pending,
            COALESCE(SUM(review_message_id IS NULL OR review_message_id LIKE 'posting:%'), 0) AS unposted
       FROM staff_applications WHERE process_id = ?`,
  ).bind(processId).first();
  return row;
}

export const audit = (db, { processId = null, applicationId = null, actor, action, detail = null }) =>
  db.prepare('INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(processId, applicationId, actor, action, detail === null ? null : String(detail).slice(0, 500), nowS());

// marca a interação como tratada; false = já tinha sido (reenvio)
export async function claimInteraction(db, id) {
  const r = await db.prepare('INSERT OR IGNORE INTO processed_interactions (id, created_at) VALUES (?, ?)').bind(id, nowS()).run();
  return r.meta.changes === 1;
}

// //------------------- PROCESSO -------------------\\
// cria um processo aberto; o índice único impede dois abertos ao mesmo tempo
export async function createProcess(db, { guildId, maxSlots, actor, panelChannelId = null, panelMessageId = null }) {
  const t = nowS();
  try {
    const r = await db.prepare(
      `INSERT INTO recruitment_processes (guild_id, status, max_slots, panel_channel_id, panel_message_id, panel_dirty, created_by, created_at)
       VALUES (?, 'open', ?, ?, ?, 1, ?, ?)`,
    ).bind(guildId, maxSlots, panelChannelId, panelMessageId, actor, t).run();
    const id = r.meta.last_row_id;
    await audit(db, { processId: id, actor, action: 'process_create', detail: `vagas=${maxSlots}` }).run();
    return id;
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return null; // já existe um aberto
    throw e;
  }
}

// muda o status só se ele ainda for o esperado; devolve true se mudou
export async function setProcessStatus(db, { processId, from, to, actor, action }) {
  const closedAt = to === 'open' ? null : nowS();
  // reabrir só com vaga sobrando (o filtro está na própria instrução)
  const extra = to === 'open'
    ? `AND (SELECT COUNT(*) FROM staff_applications WHERE process_id = recruitment_processes.id AND status = 'approved') < max_slots`
    : '';
  const [r] = await db.batch([
    db.prepare(`UPDATE recruitment_processes SET status = ?, closed_at = ?, panel_dirty = 1 WHERE id = ? AND status = ? ${extra}`)
      .bind(to, closedAt, processId, from),
    db.prepare(`INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at)
                SELECT ?, NULL, ?, ?, ?, ? WHERE changes() = 1`).bind(processId, actor, action, `${from}->${to}`, nowS()),
  ]);
  return r.meta.changes === 1;
}

// muda o total de vagas. Nunca abaixo dos já aprovados (a condição está na instrução).
// Igual aos aprovados -> o processo fica preenchido; preenchido que ganha vaga -> reabre.
// Devolve { ok, approved, status }
export async function setMaxSlots(db, { processId, slots, actor }) {
  const t = nowS();
  const approved = `(SELECT COUNT(*) FROM staff_applications WHERE process_id = recruitment_processes.id AND status = 'approved')`;
  const [r] = await db.batch([
    db.prepare(`UPDATE recruitment_processes SET max_slots = ?1, panel_dirty = 1,
                  status = CASE WHEN status = 'open' AND ?1 <= ${approved} THEN 'filled'
                                WHEN status = 'filled' AND ?1 > ${approved} THEN 'open' ELSE status END,
                  closed_at = CASE WHEN status = 'open' AND ?1 <= ${approved} THEN ?2
                                   WHEN status = 'filled' AND ?1 > ${approved} THEN NULL ELSE closed_at END
                WHERE id = ?3 AND ?1 >= ${approved}`).bind(slots, t, processId),
    db.prepare(`INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at)
                SELECT ?, NULL, ?, 'process_slots', ?, ? WHERE changes() = 1`).bind(processId, actor, `vagas=${slots}`, t),
  ]);
  const p = await getProcess(db, processId);
  const stats = await processStats(db, processId);
  return { ok: r.meta.changes === 1, approved: stats.approved, status: p.status };
}

export const setPanelMessage = (db, processId, channelId, messageId) =>
  db.prepare('UPDATE recruitment_processes SET panel_channel_id = ?, panel_message_id = ?, panel_dirty = 0 WHERE id = ?')
    .bind(channelId, messageId, processId).run();

export const setPanelDirty = (db, processId, dirty) =>
  db.prepare('UPDATE recruitment_processes SET panel_dirty = ? WHERE id = ?').bind(dirty ? 1 : 0, processId).run();

// //------------------- RASCUNHO (1ª etapa) -------------------\\
export async function saveDraft(db, { processId, userId, session, answers, ttl }) {
  const t = nowS();
  await db.prepare(
    `INSERT INTO application_drafts (process_id, user_id, session, answers, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (process_id, user_id) DO UPDATE SET session = excluded.session, answers = excluded.answers,
       created_at = excluded.created_at, expires_at = excluded.expires_at`,
  ).bind(processId, userId, session, JSON.stringify(answers), t, t + ttl).run();
}

export async function getDraft(db, { userId, session }) {
  const row = await db.prepare('SELECT * FROM application_drafts WHERE user_id = ? AND session = ? AND expires_at > ?')
    .bind(userId, session, nowS()).first();
  if (!row) return null;
  try {
    return { ...row, answers: JSON.parse(row.answers) };
  } catch {
    return null;
  }
}

// //------------------- CANDIDATURA -------------------\\
export const findApplication = (db, processId, userId) =>
  db.prepare('SELECT id, status FROM staff_applications WHERE process_id = ? AND user_id = ?').bind(processId, userId).first();

export const getApplication = (db, id) => db.prepare('SELECT * FROM staff_applications WHERE id = ?').bind(id).first();

// grava a candidatura completa e apaga o rascunho, numa transação.
// Só entra se o processo ainda estiver aberto; UNIQUE (processo, usuário) barra duplicada.
// Devolve { id } | { error: 'duplicate' | 'closed' }
export async function submitApplication(db, { processId, guildId, user, answers }) {
  const t = nowS();
  try {
    const [ins] = await db.batch([
      db.prepare(
        `INSERT INTO staff_applications (process_id, guild_id, user_id, username, display_name, game_nick, answers, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM recruitment_processes WHERE id = ? AND status = 'open')`,
      ).bind(processId, guildId, user.id, user.username, user.displayName, answers.q1, JSON.stringify(answers), t, processId),
      db.prepare('DELETE FROM application_drafts WHERE process_id = ? AND user_id = ?').bind(processId, user.id),
      db.prepare(`INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at)
                  SELECT process_id, id, user_id, 'application_submit', NULL, created_at
                    FROM staff_applications WHERE process_id = ? AND user_id = ? AND created_at = ?`)
        .bind(processId, user.id, t),
    ]);
    if (ins.meta.changes !== 1) return { error: 'closed' };
    return { id: ins.meta.last_row_id };
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return { error: 'duplicate' };
    throw e;
  }
}

export const setReviewMessage = (db, applicationId, channelId, messageId) =>
  db.prepare('UPDATE staff_applications SET review_channel_id = ?, review_message_id = ? WHERE id = ?')
    .bind(channelId, messageId, applicationId).run();

// Publicação no canal de análise: quem "reserva" a candidatura publica (o envio logo após a candidatura e o cron
// não publicam a mesma duas vezes). Uma reserva de mais de 2 min sem terminar é considerada perdida.
const POST_CLAIM_S = 120;
const UNPOSTED = `(review_message_id IS NULL OR (review_message_id LIKE 'posting:%' AND CAST(substr(review_message_id, 9) AS INTEGER) < ?))`;

export async function claimReviewPost(db, applicationId) {
  const t = nowS();
  const r = await db.prepare(`UPDATE staff_applications SET review_message_id = ? WHERE id = ? AND ${UNPOSTED}`)
    .bind(`posting:${t}`, applicationId, t - POST_CLAIM_S).run();
  return r.meta.changes === 1;
}

export const releaseReviewPost = (db, applicationId) =>
  db.prepare(`UPDATE staff_applications SET review_message_id = NULL WHERE id = ? AND review_message_id LIKE 'posting:%'`).bind(applicationId).run();

export const unpostedApplications = (db, limit = 5) =>
  db.prepare(`SELECT * FROM staff_applications WHERE ${UNPOSTED} ORDER BY id LIMIT ?`).bind(nowS() - POST_CLAIM_S, limit).all()
    .then((r) => r.results);

// Aprovar: uma instrução só, que exige candidatura pendente E vaga sobrando (o trigger do banco é a segunda trava).
// No mesmo batch: se chegou ao limite, encerra o processo ('filled'); e registra na auditoria.
// Devolve { ok, reason?, filled }
export async function decide(db, { applicationId, decision, actor }) {
  const t = nowS();
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const slotRule = decision === 'approve'
    ? `AND (SELECT COUNT(*) FROM staff_applications a WHERE a.process_id = staff_applications.process_id AND a.status = 'approved')
         < (SELECT max_slots FROM recruitment_processes p WHERE p.id = staff_applications.process_id)`
    : '';
  let results;
  try {
    results = await db.batch([
      db.prepare(`UPDATE staff_applications SET status = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending' ${slotRule}`)
        .bind(status, actor, t, applicationId),
      db.prepare(`INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at)
                  SELECT process_id, id, ?, ?, NULL, ? FROM staff_applications WHERE id = ? AND changes() = 1`)
        .bind(actor, decision === 'approve' ? 'application_approve' : 'application_reject', t, applicationId),
      db.prepare(`UPDATE recruitment_processes SET status = 'filled', closed_at = ?, panel_dirty = 1
                   WHERE id = (SELECT process_id FROM staff_applications WHERE id = ?) AND status <> 'filled'
                     AND (SELECT COUNT(*) FROM staff_applications WHERE process_id = recruitment_processes.id AND status = 'approved') >= max_slots`)
        .bind(t, applicationId),
    ]);
  } catch (e) {
    if (/slots_full/.test(String(e.message))) return { ok: false, reason: 'full', filled: true };
    throw e;
  }
  const filled = results[2].meta.changes === 1;
  if (results[0].meta.changes === 1) return { ok: true, filled };
  // não mudou: descobre por quê
  const app = await getApplication(db, applicationId);
  if (!app) return { ok: false, reason: 'missing' };
  if (app.status !== 'pending') return { ok: false, reason: 'decided', status: app.status };
  return { ok: false, reason: 'full', filled: true };
}

// Desfazer uma decisão errada: volta para pendente, com motivo na auditoria. Se era uma aprovação de um processo
// já preenchido, o processo fica 'closed' (não reabre sozinho: a administração decide com /staff reabrir).
export async function undoDecision(db, { applicationId, actor, reason }) {
  const t = nowS();
  const [r, , proc] = await db.batch([
    db.prepare(`UPDATE staff_applications SET status = 'pending', decided_by = NULL, decided_at = NULL
                 WHERE id = ? AND status IN ('approved', 'rejected')`).bind(applicationId),
    db.prepare(`INSERT INTO recruitment_audit_log (process_id, application_id, actor_id, action, detail, created_at)
                SELECT process_id, id, ?, 'decision_undo', ?, ? FROM staff_applications WHERE id = ? AND changes() = 1`)
      .bind(actor, String(reason).slice(0, 500), t, applicationId),
    db.prepare(`UPDATE recruitment_processes SET status = 'closed', panel_dirty = 1
                 WHERE id = (SELECT process_id FROM staff_applications WHERE id = ?) AND status = 'filled'
                   AND (SELECT COUNT(*) FROM staff_applications WHERE process_id = recruitment_processes.id AND status = 'approved') < max_slots`)
      .bind(applicationId),
  ]);
  return { ok: r.meta.changes === 1, reopenedToClosed: proc.meta.changes === 1 };
}

// limpeza do cron
export async function cleanup(db, keepInteractionsS) {
  const t = nowS();
  await db.batch([
    db.prepare('DELETE FROM application_drafts WHERE expires_at <= ?').bind(t),
    db.prepare('DELETE FROM processed_interactions WHERE created_at < ?').bind(t - keepInteractionsS),
  ]);
}
