// HAVOK API: utilitários compartilhados (HTTP, assinatura do servidor MTA, CORS do site).
export const nowS = () => Math.floor(Date.now() / 1000);

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...headers },
});

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h) => (/^[0-9a-f]{64}$/i.test(h) ? Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16)) : null);

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

// Mesma assinatura do wipe (o servidor MTA usa o mesmo WIPE_SECRET): X-Havok-Timestamp + X-Havok-Signature =
// hex(HMAC-SHA256(WIPE_SECRET, "<ts>\n<MÉTODO>\n<caminho>\n<corpo>")), até 5 min de diferença. Devolve o corpo ou null.
export async function verifyServer(request, env, path, maxBytes = 16384) {
  if (!env.WIPE_SECRET || String(env.WIPE_SECRET).length < 32) return null;
  const ts = request.headers.get('X-Havok-Timestamp') || '';
  const sig = fromHex(request.headers.get('X-Havok-Signature') || '');
  if (!/^\d{9,12}$/.test(ts) || !sig || Math.abs(nowS() - Number(ts)) > 300) return null;
  const body = request.method === 'GET' ? '' : await request.text();
  if (body.length > maxBytes) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.WIPE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${ts}\n${request.method}\n${path}\n${body}`));
  return ok ? body : null;
}

export function siteCors(request, env, credentials = false) {
  const origin = request.headers.get('Origin');
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !list.includes(origin)) return { Vary: 'Origin' };
  return {
    Vary: 'Origin', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400',
    ...(credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  };
}

export const clean = (s, max = 32) => String(s ?? '').replace(/#[0-9a-fA-F]{6}/g, '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
export const int = (n) => Math.max(0, Math.min(1e9, Math.floor(Number(n) || 0)));
export const account = (a) => (typeof a === 'string' && a.length >= 1 && a.length <= 64 && !/[\u0000-\u001f]/.test(a) ? a : null);

// foto do Discord de quem vinculou; sem vínculo = null (o site mostra o avatar cinza)
export const avatarUrl = (id, hash) => (!id ? null : hash ? `https://cdn.discordapp.com/avatars/${id}/${hash}.png?size=256`
  : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`);
