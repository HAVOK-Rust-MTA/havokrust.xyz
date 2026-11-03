// Site ao vivo: histórico de jogadores online e airdrop do mapa.
//
//   GET  /api/status/history?hours=24   público: amostras (a cada 5 min, guardadas 7 dias) das últimas N horas (1–168),
//                                       com pico, média e o número de agora. Cache 60 s.
//   POST /api/game/mta/airdrop          servidor MTA, assinado (como /api/game/mta/live): {state, x, y, at, id, landAt?, zone?}
//                                       state = falling | landed | opened | none. Fica em bot_settings 'airdrop.live'.
//   GET  /api/airdrop                   público: o airdrop atual; 'opened' some 15 min depois de aberto. Cache 15 s.
//
// A amostra é gravada pelo POST /api/game/mta/live (game/service.js chama recordSample).
import { json, nowS, verifyServer, siteCors, int, ts } from '../lib/util.js';

const SAMPLE_EVERY_S = 300;
const KEEP_S = 7 * 86400;
const LIVE_MAX_AGE = 150; // s: o servidor manda o live pelo menos 1x por minuto
const OPENED_SHOW_S = 15 * 60;
const STUCK_S = 2 * 3600; // caindo/no chão sem notícia há mais de 2 h = servidor caiu sem avisar
const MAP = 4096; // o mapa vai de -4096 a +4096
const STATES = new Set(['falling', 'landed', 'opened', 'none']);
const NONE = { state: 'none', x: null, y: null, at: null, id: null, landAt: null, zone: null };

// //------------------- AMOSTRAS -------------------\\
// uma linha a cada 5 min no máximo (a condição está no próprio INSERT: dois avisos juntos não gravam duas vezes)
export async function recordSample(db, online, max) {
  const now = nowS();
  const r = await db.prepare(
    'INSERT INTO server_samples (ts, online, max) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM server_samples WHERE ts > ?)',
  ).bind(now, online, max, now - SAMPLE_EVERY_S).run();
  if (r.meta && r.meta.changes > 0) await db.prepare('DELETE FROM server_samples WHERE ts < ?').bind(now - KEEP_S).run();
}

async function history(db, url) {
  const raw = parseInt(url.searchParams.get('hours'), 10);
  const hours = Number.isFinite(raw) ? Math.max(1, Math.min(168, raw)) : 24;
  const { results } = await db.prepare('SELECT ts, online, max FROM server_samples WHERE ts >= ? ORDER BY ts').bind(nowS() - hours * 3600).all();
  const samples = results.map((r) => ({ t: r.ts, online: r.online, max: r.max }));
  const peak = samples.reduce((m, s) => Math.max(m, s.online), 0);
  const avg = samples.length ? Math.round((samples.reduce((a, s) => a + s.online, 0) / samples.length) * 10) / 10 : 0;
  let now = null;
  const row = await db.prepare("SELECT value FROM bot_settings WHERE key = 'status.live'").first();
  if (row) {
    try {
      const v = JSON.parse(row.value);
      if (nowS() - Number(v.at) <= LIVE_MAX_AGE) now = int(v.players);
    } catch { /* valor estragado: sem número de agora */ }
  }
  return { hours, samples, peak, avg, now };
}

// //------------------- AIRDROP -------------------\\
const coord = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= MAP ? Math.round(n * 10) / 10 : null;
};

async function postAirdrop(request, env) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await verifyServer(request, env, '/api/game/mta/airdrop', 1024);
  if (body === null) return json({ error: 'unauthorized' }, 401);
  let d;
  try {
    d = JSON.parse(body);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (!d || !STATES.has(d.state)) return json({ error: 'bad_state' }, 400);
  const now = nowS();
  let value = { ...NONE, id: d.id == null ? null : int(d.id) };
  if (d.state !== 'none') {
    const x = coord(d.x), y = coord(d.y);
    if (x === null || y === null) return json({ error: 'bad_position' }, 400);
    // horário do jogo, se for plausível; senão o da chegada
    const at = ts(d.at);
    value = {
      state: d.state, x, y, id: int(d.id),
      at: at && at <= now + 60 && at >= now - 3600 ? at : now,
      landAt: d.landAt == null ? null : ts(d.landAt) || null,
      zone: typeof d.zone === 'string' ? d.zone.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) || null : null,
    };
  }
  await env.DB.prepare(
    `INSERT INTO bot_settings (key, value, updated_at) VALUES ('airdrop.live', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify({ ...value, recv: now }), now).run();
  return json({ ok: true });
}

async function readAirdrop(db) {
  const row = await db.prepare("SELECT value FROM bot_settings WHERE key = 'airdrop.live'").first();
  if (!row) return NONE;
  let v;
  try { v = JSON.parse(row.value); } catch { return NONE; }
  const age = nowS() - Number(v.recv || 0);
  if (!STATES.has(v.state) || v.state === 'none') return NONE;
  if (v.state === 'opened' && age >= OPENED_SHOW_S) return NONE;
  if (age > STUCK_S) return NONE;
  return { state: v.state, x: v.x, y: v.y, at: v.at, id: v.id, landAt: v.landAt ?? null, zone: v.zone ?? null };
}

// //------------------- HTTP -------------------\\
export const isLivePath = (path) => path === '/api/status/history' || path === '/api/airdrop' || path === '/api/game/mta/airdrop';

// cache de borda por URL; o CORS é de quem pediu
async function edge(request, url, ctx, ttl, build) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.toString(), { method: 'GET' });
  if (cache) {
    const hit = await cache.match(key).catch(() => null);
    if (hit) return hit;
  }
  const res = await build();
  if (cache && res.status === 200) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('Cache-Control', `public, max-age=${ttl}`);
    const put = cache.put(key, copy).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return res;
}

export async function handleLiveHttp(request, env, url, ctx) {
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  const path = url.pathname;
  if (path === '/api/game/mta/airdrop') return postAirdrop(request, env);

  const ttl = path === '/api/airdrop' ? 15 : 60;
  const h = { ...siteCors(request, env), 'Cache-Control': `public, max-age=${ttl}` };
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, h);
  const res = await edge(request, url, ctx, ttl, async () => json(path === '/api/airdrop' ? await readAirdrop(env.DB) : await history(env.DB, url), 200, h));
  const out = new Response(res.body, res);
  out.headers.delete('Access-Control-Allow-Origin');
  for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
  return out;
}
