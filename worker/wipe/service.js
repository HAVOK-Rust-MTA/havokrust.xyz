// Wipe: endpoints HTTP, comando /wipe, painel no Discord e rotina do cron.
//
//   GET  /api/wipe/status      público (site): só o que qualquer visitante pode ver
//   GET  /api/wipe/mta/sync    servidor MTA, assinado (HMAC): o calendário oficial
//   POST /api/wipe/mta/event   servidor MTA, assinado: pvp_on | wipe_started | wipe_done | wipe_failed
//
// Assinatura do servidor: X-Havok-Timestamp (unix) + X-Havok-Signature = hex(HMAC-SHA256(WIPE_SECRET,
// "<timestamp>\n<MÉTODO>\n<caminho>\n<corpo>")). Fora de 5 min = recusado. Nada de segredo na URL.
// Eventos repetidos não fazem nada (idempotentes), então um replay dentro da janela não tem efeito.
import { sendMessage, editMessage, editOriginal, NO_MENTIONS, DiscordError } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';
import { currentCycle, recentCycles, cycleView, phaseOf, defineWipe, applyServerEvent, logEvent, nowS, getCycle } from './cycle.js';
import { wipePanel, wipeAlert, countdown } from './panel.js';

const SNOWFLAKE = /^\d{17,20}$/;
const EPHEMERAL = 64;
const MAX_SKEW_S = 300;
const KEY = { channel: 'wipe.panel.channel', message: 'wipe.panel.message', drawn: 'wipe.panel.drawn' };

// //------------------- CONFIGURAÇÕES (bot_settings) -------------------\\
const getSetting = async (db, key) => (await db.prepare('SELECT value FROM bot_settings WHERE key = ?').bind(key).first())?.value ?? null;
const setSetting = (db, key, value) => db.prepare(
  'INSERT INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
).bind(key, String(value), nowS()).run();

// //------------------- HTTP -------------------\\
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...headers },
});

function cors(request, env) {
  const origin = request.headers.get('Origin');
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !list.includes(origin)) return { Vary: 'Origin' };
  return { Vary: 'Origin', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' };
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h) => (/^[0-9a-f]{64}$/i.test(h) ? Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16)) : null);

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

// devolve o corpo se a assinatura do servidor MTA confere; senão null
async function verifyServer(request, env, path, t = nowS()) {
  if (!env.WIPE_SECRET || String(env.WIPE_SECRET).length < 32) return null;
  const ts = request.headers.get('X-Havok-Timestamp') || '';
  const sig = fromHex(request.headers.get('X-Havok-Signature') || '');
  if (!/^\d{9,12}$/.test(ts) || !sig || Math.abs(t - Number(ts)) > MAX_SKEW_S) return null;
  const body = request.method === 'GET' ? '' : await request.text();
  if (body.length > 4096) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.WIPE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${ts}\n${request.method}\n${path}\n${body}`)); // comparação em tempo constante
  return ok ? body : null;
}

export async function handleWipeHttp(request, env, ctx, url) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);

  if (path === '/api/wipe/status') {
    const h = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, h);
    try {
      const v = cycleView(await currentCycle(env.DB));
      // campos só do servidor de jogo ficam de fora; o resto é o mesmo calendário
      const { startedAtUnix, scheduledWipeAtUnix, serverTimeUnix, finalPvpSeconds, ...pub } = v;
      return json(pub, 200, { ...h, 'Cache-Control': 'public, max-age=15' });
    } catch (e) {
      console.error('wipe status:', e.message);
      return json({ error: 'unavailable' }, 502, h);
    }
  }

  if (path === '/api/wipe/mta/sync' || path === '/api/wipe/mta/event') {
    const method = path.endsWith('/sync') ? 'GET' : 'POST';
    if (request.method !== method) return json({ error: 'method_not_allowed' }, 405);
    const body = await verifyServer(request, env, path);
    if (body === null) {
      console.error('wipe: requisição do servidor recusada (assinatura/horário inválidos ou WIPE_SECRET ausente)');
      return json({ error: 'unauthorized' }, 401);
    }
    if (method === 'GET') return json(cycleView(await currentCycle(env.DB)));
    let ev;
    try {
      ev = JSON.parse(body);
    } catch {
      return json({ error: 'bad_json' }, 400);
    }
    const r = await applyServerEvent(env.DB, ev, { env });
    console.log(`wipe: evento do servidor ${ev.type} ciclo ${ev.cycleId} -> ${r.result}`);
    if (r.notify) ctx.waitUntil(notify(env, r.notify, Number(ev.cycleId)).catch((e) => console.error('wipe alert:', e.message)));
    ctx.waitUntil(syncPanel(env).catch((e) => console.error('wipe panel:', e.message)));
    const cur = await currentCycle(env.DB);
    return json({ ok: r.ok, result: r.result, nextCycleId: r.nextCycleId ?? null, current: cycleView(cur) }, r.status);
  }
  return json({ error: 'not_found' }, 404);
}

// //------------------- DISCORD: painel e avisos -------------------\\
export async function syncPanel(env, { force = false } = {}) {
  const [channel, message] = await Promise.all([getSetting(env.DB, KEY.channel), getSetting(env.DB, KEY.message)]);
  if (!channel || !message) return 'off';
  const msg = wipePanel(await currentCycle(env.DB));
  const drawn = JSON.stringify(msg);
  if (!force && drawn === (await getSetting(env.DB, KEY.drawn))) return 'same';
  try {
    await editMessage(env, channel, message, msg);
  } catch (e) {
    if (e instanceof DiscordError && e.status === 404) {
      await env.DB.batch([KEY.channel, KEY.message, KEY.drawn].map((k) => env.DB.prepare('DELETE FROM bot_settings WHERE key = ?').bind(k)));
      console.error('wipe: o painel não existe mais no Discord (use /wipe painel)');
      return 'gone';
    }
    throw e;
  }
  await setSetting(env.DB, KEY.drawn, drawn);
  return 'updated';
}

// aviso no canal do painel, uma vez por ciclo e tipo
async function notify(env, kind, cycleId) {
  const channel = await getSetting(env.DB, KEY.channel);
  if (!channel) return;
  if (!(await logEvent(env.DB, { cycleId, type: `alert_${kind}`, origin: 'cron', dedupe: `alert:${kind}:${cycleId}` }))) return;
  const cycle = kind === 'done' ? await currentCycle(env.DB) : await getCycle(env.DB, cycleId);
  try {
    await sendMessage(env, channel, { ...wipeAlert(kind, cycle), allowed_mentions: NO_MENTIONS });
  } catch (e) {
    // não saiu: libera para tentar de novo no próximo minuto
    await env.DB.prepare('DELETE FROM wipe_events WHERE dedupe_key = ?').bind(`alert:${kind}:${cycleId}`).run();
    throw e;
  }
}

// cron (1 min): painel + avisos que ficaram pendentes. Não apaga nada no servidor MTA (quem faz o wipe é ele).
export async function wipeCron(env) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return;
  const cycle = await currentCycle(env.DB);
  if (cycle && cycle.pvp_confirmed_at && phaseOf(cycle) === 'FINAL_PVP') await notify(env, 'pvp', cycle.id).catch((e) => console.error('wipe alert:', e.message));
  if (cycle && cycle.previous_cycle_id) await notify(env, 'done', cycle.previous_cycle_id).catch((e) => console.error('wipe alert:', e.message));
  await syncPanel(env).catch((e) => console.error('wipe panel:', e.message));
}

// //------------------- /wipe -------------------\\
export const WIPE_COMMAND = {
  name: 'wipe',
  description: 'Calendário de wipe',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [
    { type: 1, name: 'painel', description: 'Publica ou sincroniza o painel de wipe',
      options: [{ type: 7, name: 'canal', description: 'Canal do painel e dos avisos (padrão: este)', channel_types: [0], required: false }] },
    { type: 1, name: 'status', description: 'Ciclo atual, tempo restante e modo' },
    { type: 1, name: 'sincronizar', description: 'Atualiza o painel agora' },
    { type: 1, name: 'definir', description: 'Agenda a data do próximo wipe (horário de Brasília)',
      options: [
        { type: 3, name: 'data', description: 'AAAA-MM-DD HH:MM no horário de Brasília (ex.: 2026-11-20 20:00)', min_length: 16, max_length: 16, required: true },
        { type: 5, name: 'confirmar', description: 'Precisa ser true para valer', required: true },
      ] },
    { type: 1, name: 'historico', description: 'Últimos ciclos de wipe' },
  ],
};

// 'AAAA-MM-DD HH:MM' em Brasília (UTC-3, sem horário de verão desde 2019) -> unix
export function parseBrasilia(text) {
  const m = String(text || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const ms = Date.UTC(y, mo - 1, d, h + 3, mi);
  const back = new Date(ms - 3 * 3600_000);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || back.getUTCHours() !== h) return null; // 2026-02-31 etc.
  return ms / 1000;
}

const PHASE_PT = { NONE: 'sem wipe agendado', NORMAL: 'NORMAL', FINAL_PVP: 'ÚLTIMAS 24 H (PvP)', WIPE_PENDING: 'WIPE EM ANDAMENTO', FAILED: 'WIPE COM FALHA' };

async function runCommand(env, i, sub) {
  const opt = (name) => (sub.options || []).find((o) => o.name === name)?.value;
  const actor = i.member.user.id;
  switch (sub.name) {
    case 'painel': {
      const channel = String(opt('canal') || i.channel_id);
      if (!SNOWFLAKE.test(channel)) return 'Canal inválido.';
      const [oldChannel, oldMessage] = await Promise.all([getSetting(env.DB, KEY.channel), getSetting(env.DB, KEY.message)]);
      if (oldChannel === channel && oldMessage) {
        const r = await syncPanel(env, { force: true });
        if (r !== 'gone') return 'Painel de wipe sincronizado.';
      }
      const sent = await sendMessage(env, channel, wipePanel(await currentCycle(env.DB)));
      await setSetting(env.DB, KEY.channel, channel);
      await setSetting(env.DB, KEY.message, sent.id);
      await setSetting(env.DB, KEY.drawn, '');
      return `Painel de wipe publicado em <#${channel}> (os avisos também saem lá).${oldMessage && oldChannel !== channel ? ' O painel antigo continua no outro canal; apague à mão se quiser.' : ''}`;
    }
    case 'status': {
      const cycle = await currentCycle(env.DB);
      if (!cycle) return 'Nenhum wipe agendado. Use `/wipe definir`.';
      const v = cycleView(cycle);
      return [
        `**Ciclo #${cycle.id}** — ${PHASE_PT[v.status]}${v.status === 'FINAL_PVP' ? (cycle.pvp_confirmed_at ? ' · PvP confirmado pelo servidor' : ' · servidor ainda não confirmou o PvP') : ''}`,
        `Wipe: <t:${cycle.scheduled_wipe_at}:F> (<t:${cycle.scheduled_wipe_at}:R>) · faltam **${countdown(v.remainingSeconds)}**`,
        `Começou: <t:${cycle.started_at}:F> · progresso ${v.progressPercent}%`,
      ].join('\n');
    }
    case 'sincronizar': {
      const r = await syncPanel(env, { force: true });
      return r === 'off' || r === 'gone' ? 'Ainda não há painel. Use `/wipe painel`.' : 'Painel atualizado com o calendário oficial. (O servidor do jogo busca o calendário sozinho a cada minuto.)';
    }
    case 'definir': {
      if (opt('confirmar') !== true) return 'Nada mudou: para valer, use `confirmar:true`.';
      const at = parseBrasilia(opt('data'));
      if (!at) return 'Data inválida. Use `AAAA-MM-DD HH:MM` no horário de Brasília (ex.: `2026-11-20 20:00`).';
      const r = await defineWipe(env.DB, { at, actor });
      if (!r.ok) {
        return {
          too_soon: 'A data precisa ser pelo menos 15 minutos no futuro.',
          too_far: 'A data pode ser no máximo 120 dias no futuro.',
          wiping: 'O servidor está fazendo o wipe agora; espere ele confirmar.',
          race: 'O ciclo mudou enquanto você mandava o comando. Confira com `/wipe status` e tente de novo.',
          invalid: 'Data inválida.',
        }[r.reason] || 'Não foi possível.';
      }
      await syncPanel(env, { force: true }).catch(() => {});
      return `${r.created ? 'Primeiro ciclo criado' : 'Data alterada'}: wipe em <t:${at}:F> (<t:${at}:R>). As últimas 24 h viram PvP em <t:${at - 86400}:F>. `
        + 'Site e servidor pegam a data nova em até 1 minuto.';
    }
    case 'historico': {
      const rows = await recentCycles(env.DB, 6);
      if (!rows.length) return 'Nenhum ciclo ainda.';
      return rows.map((c) => `#${c.id} · ${{ active: 'ativo', wiping: 'fazendo wipe', failed: 'falhou', completed: 'concluído' }[c.status]} · `
        + `início <t:${c.started_at}:d> · wipe ${c.actual_wipe_at ? `<t:${c.actual_wipe_at}:f> (real)` : `<t:${c.scheduled_wipe_at}:f> (agendado)`}`).join('\n');
    }
    default:
      return 'Comando desconhecido.';
  }
}

export const isWipeInteraction = (i) => i.type === 2 && i.data && i.data.name === 'wipe';

export async function handleWipeCommand(env, i, ctx, { isAdmin }) {
  const reply = (content) => new Response(JSON.stringify({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } }), { headers: { 'Content-Type': 'application/json' } });
  if (!env.DB) return reply('O banco (D1) não está configurado.');
  if (!(await claimInteraction(env.DB, String(i.id)))) return reply('Esta ação já foi processada.');
  if (!isAdmin(env, i.member)) return reply('Você não tem permissão para fazer isso.');
  const sub = (i.data.options || [])[0] || {};
  ctx.waitUntil(
    runCommand(env, i, sub)
      .catch((e) => {
        console.error('wipe command:', e.message);
        return e instanceof DiscordError && e.status === 403
          ? 'O bot não tem permissão nesse canal (Ver canal, Enviar mensagens, Inserir links, Ler histórico).'
          : 'Não consegui agora. Tente de novo em instantes.';
      })
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('wipe followup:', e.message)),
  );
  return new Response(JSON.stringify({ type: 5, data: { flags: EPHEMERAL } }), { headers: { 'Content-Type': 'application/json' } });
}
