// HAVOK API: evidências do anti-cheat (resource havok_ac do servidor MTA).
//
//   POST /api/ac/clip                 (assinado pelo servidor) guarda uma gravação: até 48 quadros JPEG em base64 (+ fps)
//   GET  /api/ac/clip/<id>            dados da gravação (jogador, motivo, quantos quadros) para a página do site
//   GET  /api/ac/clip/<id>/<n>.jpg    um quadro
//
// O id tem 128 bits aleatórios e só é publicado no canal de staff do Discord: quem não tem o link não acha a gravação.
// Tudo é apagado em 14 dias (acCron).
import { json, nowS, verifyServer, siteCors, clean, account } from '../lib/util.js';

const MAX_FRAMES = 48;
const MAX_FRAME_BYTES = 300 * 1024;
const MAX_BODY = 16 * 1024 * 1024;
const KEEP_S = 14 * 86400;
const ID_RE = /^[0-9a-f]{32}$/;

const randomId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromBase64 = (s) => {
  if (typeof s !== 'string' || s.length > MAX_FRAME_BYTES * 1.4) return null;
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};
const isJpeg = (b) => b && b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export function isAcPath(path) {
  return path.startsWith('/api/ac/');
}

async function saveClip(request, env) {
  const raw = await verifyServer(request, env, '/api/ac/clip', MAX_BODY);
  if (raw === null) return json({ error: 'unauthorized' }, 401);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const frames = Array.isArray(body.frames) ? body.frames.slice(-MAX_FRAMES) : [];
  const decoded = [];
  for (const f of frames) {
    const b = fromBase64(f);
    if (isJpeg(b) && b.length <= MAX_FRAME_BYTES) decoded.push(b);
  }
  if (decoded.length === 0) return json({ error: 'no_frames' }, 400);
  const id = randomId();
  const fps = Math.max(1, Math.min(4, Math.floor(Number(body.fps) || 1)));
  const stmts = [
    env.DB.prepare('INSERT INTO ac_clips (id, created_at, player, account, reason, detail, frames, fps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, nowS(), clean(body.player, 40) || '?', account(body.account), clean(body.reason, 60) || '?', clean(body.detail, 600), decoded.length, fps),
    ...decoded.map((b, i) => env.DB.prepare('INSERT INTO ac_frames (clip_id, idx, data) VALUES (?, ?, ?)').bind(id, i, b)),
  ];
  await env.DB.batch(stmts);
  return json({ id, frames: decoded.length, fps });
}

export async function handleAcHttp(request, env, url) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  if (path === '/api/ac/clip' && request.method === 'POST') return saveClip(request, env);

  const h = siteCors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (request.method !== 'GET') return json({ error: 'not_found' }, 404, h);

  const m = path.match(/^\/api\/ac\/clip\/([0-9a-f]{32})(?:\/(\d{1,2})\.jpg)?$/);
  if (!m || !ID_RE.test(m[1])) return json({ error: 'not_found' }, 404, h);
  if (m[2] !== undefined) {
    const row = await env.DB.prepare('SELECT data FROM ac_frames WHERE clip_id = ? AND idx = ?').bind(m[1], Number(m[2])).first();
    if (!row) return json({ error: 'not_found' }, 404, h);
    // o D1 devolve BLOB como lista de números (não ArrayBuffer): sem isto a imagem saía com 0 bytes
    const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : ArrayBuffer.isView(row.data) ? row.data : Uint8Array.from(row.data || []);
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
  ]);
}
