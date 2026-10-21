// HAVOK API: evidências do anti-cheat (resource havok_inventory do servidor MTA).
//
//   POST /api/ac/clip                 (assinado) abre uma gravação: jogador, motivo, fps -> { id }
//   POST /api/ac/frames               (assinado) acrescenta até 12 quadros JPEG (base64) a uma gravação aberta
//   POST /api/ac/report               (assinado) denúncia de morte: cria o código (14 dias) -> { code, expires_at }
//   POST /api/ac/mine                 (assinado) as denúncias de uma conta (/denuncias no jogo)
//   GET  /api/ac/clip/<id>            dados da gravação (jogador, motivo, quantos quadros, fps) para o site
//   GET  /api/ac/clip/<id>/<n>.jpg    um quadro
//
// Os quadros chegam em lotes pequenos e são guardados em base64 como vieram (no R2, bucket havok-ac): cada pedido gasta pouco processamento
// (o plano grátis do Worker tem ~10 ms de CPU por pedido); a conversão para imagem só acontece quando alguém abre.
// O id tem 128 bits aleatórios e só é publicado no canal de staff do Discord. Tudo é apagado em 14 dias (acCron).
import { json, nowS, verifyServer, siteCors, clean, account } from '../lib/util.js';

const MAX_FRAMES = 160;
const MAX_BATCH = 12;
const MAX_FRAME_B64 = 1300 * 1024; // print 1920x1080 em boa qualidade
const MAX_BODY = 6 * 1024 * 1024;
const OPEN_S = 3600; // gravação aberta aceita quadros por 1 h
const KEEP_S = 14 * 86400;
const ID_RE = /^[0-9a-f]{32}$/;
const CODE_RE = /^HV-[A-HJ-NP-Z2-9]{6}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REPORT_S = 14 * 86400;
const newCode = () => 'HV-' + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => CODE_ALPHABET[b & 31]).join('');
const B64_JPEG = /^\/9j\/[A-Za-z0-9+/]+=*$/; // JPEG (FF D8 FF) em base64 começa com "/9j/"

// quadros: no R2 (AC_BUCKET) quando existe; senão no D1 (ac_frames)
const frameKey = (id, i) => `clips/${id}/${i}`;
const putFrames = (env, id, start, frames) => (env.AC_BUCKET
  ? Promise.all(frames.map((f, i) => env.AC_BUCKET.put(frameKey(id, start + i), f)))
  : null);
const frameStmts = (env, id, start, frames) => (env.AC_BUCKET ? []
  : frames.map((f, i) => env.DB.prepare('INSERT INTO ac_frames (clip_id, idx, data) VALUES (?, ?, ?)').bind(id, start + i, f)));

const randomId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const okFrame = (f) => typeof f === 'string' && f.length > 8 && f.length <= MAX_FRAME_B64 && B64_JPEG.test(f);

const fromBase64 = (s) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export function isAcPath(path) {
  return path.startsWith('/api/ac/');
}

const parse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

async function openClip(request, env) {
  const body = parse(await verifyServer(request, env, '/api/ac/clip', MAX_BODY));
  if (!body) return json({ error: 'unauthorized' }, 401);
  const id = randomId();
  const fps = Math.max(1, Math.min(8, Math.floor(Number(body.fps) || 1)));
  const frames = Array.isArray(body.frames) ? body.frames.filter(okFrame).slice(0, MAX_BATCH) : [];
  const report = CODE_RE.test(body.report || '') ? body.report : null;
  await putFrames(env, id, 0, frames);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO ac_clips (id, created_at, player, account, reason, detail, frames, fps, report) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, nowS(), clean(body.player, 40) || '?', account(body.account), clean(body.reason, 60) || '?', clean(body.detail, 600), frames.length, fps, report),
    ...frameStmts(env, id, 0, frames),
  ]);
  return json({ id, frames: frames.length, fps });
}

async function addFrames(request, env) {
  const body = parse(await verifyServer(request, env, '/api/ac/frames', MAX_BODY));
  if (!body) return json({ error: 'unauthorized' }, 401);
  if (!ID_RE.test(body.id || '')) return json({ error: 'bad_id' }, 400);
  const clip = await env.DB.prepare('SELECT created_at, frames FROM ac_clips WHERE id = ?').bind(body.id).first();
  if (!clip || clip.created_at < nowS() - OPEN_S) return json({ error: 'not_found' }, 404);
  const frames = Array.isArray(body.frames) ? body.frames.filter(okFrame).slice(0, MAX_BATCH) : [];
  const start = clip.frames;
  if (frames.length === 0) return json({ id: body.id, frames: start });
  if (start + frames.length > MAX_FRAMES) return json({ error: 'too_many' }, 413);
  await putFrames(env, body.id, start, frames);
  await env.DB.batch([
    ...frameStmts(env, body.id, start, frames),
    env.DB.prepare('UPDATE ac_clips SET frames = ? WHERE id = ?').bind(start + frames.length, body.id),
  ]);
  return json({ id: body.id, frames: start + frames.length });
}

async function createReport(request, env) {
  const body = parse(await verifyServer(request, env, '/api/ac/report', 8192));
  if (!body) return json({ error: 'unauthorized' }, 401);
  const t = nowS();
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    const r = await env.DB.prepare('INSERT OR IGNORE INTO ac_reports (code, created_at, expires_at, reporter, reporter_account, target, target_account, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(code, t, t + REPORT_S, clean(body.reporter, 40) || '?', account(body.reporter_account), clean(body.target, 40) || '?', account(body.target_account), clean(body.info, 300)).run();
    if (r.meta && r.meta.changes) return json({ code, expires_at: t + REPORT_S });
  }
  return json({ error: 'busy' }, 503);
}

async function myReports(request, env) {
  const body = parse(await verifyServer(request, env, '/api/ac/mine', 2048));
  if (!body) return json({ error: 'unauthorized' }, 401);
  const acc = account(body.account);
  if (!acc) return json({ reports: [] });
  const { results } = await env.DB.prepare('SELECT code, created_at, expires_at, target, used_at FROM ac_reports WHERE reporter_account = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 15')
    .bind(acc, nowS()).all();
  return json({ reports: results || [] });
}

export async function handleAcHttp(request, env, url) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  if (path === '/api/ac/clip' && request.method === 'POST') return openClip(request, env);
  if (path === '/api/ac/frames' && request.method === 'POST') return addFrames(request, env);
  if (path === '/api/ac/report' && request.method === 'POST') return createReport(request, env);
  if (path === '/api/ac/mine' && request.method === 'POST') return myReports(request, env);

  const h = siteCors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (request.method !== 'GET') return json({ error: 'not_found' }, 404, h);

  const m = path.match(/^\/api\/ac\/clip\/([0-9a-f]{32})(?:\/(\d{1,3})\.jpg)?$/);
  if (!m || !ID_RE.test(m[1])) return json({ error: 'not_found' }, 404, h);
  if (m[2] !== undefined) {
    let row = null;
    if (env.AC_BUCKET) {
      const obj = await env.AC_BUCKET.get(frameKey(m[1], Number(m[2])));
      if (obj) row = { data: await obj.text() };
    }
    if (!row) row = await env.DB.prepare('SELECT data FROM ac_frames WHERE clip_id = ? AND idx = ?').bind(m[1], Number(m[2])).first();
    if (!row) return json({ error: 'not_found' }, 404, h);
    // novo: base64 (texto). Antigo: BLOB, que o D1 devolve como lista de números (não ArrayBuffer)
    const d = row.data;
    const bytes = typeof d === 'string' ? fromBase64(d) : d instanceof ArrayBuffer ? new Uint8Array(d) : ArrayBuffer.isView(d) ? d : Uint8Array.from(d || []);
    return new Response(bytes, {
      headers: { ...h, 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=1209600, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  const clip = await env.DB.prepare('SELECT id, created_at, player, reason, detail, frames, fps FROM ac_clips WHERE id = ?').bind(m[1]).first();
  if (!clip) return json({ error: 'not_found' }, 404, h);
  return json(clip, 200, h);
}

export async function acCron(env) {
  if (!env.DB) return;
  const old = nowS() - KEEP_S;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ac_frames WHERE clip_id IN (SELECT id FROM ac_clips WHERE created_at < ?)').bind(old),
    env.DB.prepare('DELETE FROM ac_clips WHERE created_at < ?').bind(old),
    env.DB.prepare('DELETE FROM ac_reports WHERE expires_at < ?').bind(nowS() - 86400),
  ]);
}
