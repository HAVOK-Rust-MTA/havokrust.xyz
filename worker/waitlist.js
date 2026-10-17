// HAVOK — contador da lista de espera (Cloudflare Worker).
// Conta quantos membros do Discord têm o cargo "Waiting List" e devolve em JSON para o site.
//
//   GET /waitlist  ->  { count, goal, updatedAt, stale }
//
// O token do bot fica só no Secret DISCORD_BOT_TOKEN; GUILD_ID, ROLE_ID, GOAL e ALLOWED_ORIGINS
// ficam em [vars] no wrangler.toml. Nunca inventa número: se o Discord falhar e não houver
// leitura recente guardada, responde erro.

const API = 'https://discord.com/api/v10';
const FRESH_MS = 60_000;            // leitura nova no máximo a cada 60 s
const STALE_MS = 6 * 60 * 60_000;   // se o Discord cair, ainda serve a última leitura por até 6 h
const TIMEOUT_MS = 8_000;
const SNOWFLAKE = /^\d{17,20}$/;

// cache do isolate (o Cache API do Cloudflare não funciona em *.workers.dev, então este é o principal)
let memo = null;       // { count, at }
let inflight = null;   // uma só ida ao Discord por vez
let pauseUntil = 0;    // depois de uma falha, espera antes de tentar de novo (não martela o Discord)

class DiscordError extends Error {
  constructor(status, retryAfter) {
    super(`discord ${status}`);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  const h = { Vary: 'Origin' };
  if (origin) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function json(body, status, origin, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(origin),
    },
  });
}

async function discord(env, path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API + path, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, Accept: 'application/json', 'User-Agent': 'HAVOK-Waitlist (https://havokrust.xyz, 1.0)' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new DiscordError(res.status, Number(res.headers.get('Retry-After')) || 0);
    return await res.json();
  } catch (e) {
    if (e instanceof DiscordError) throw e;
    throw new DiscordError(e.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCount(env) {
  const counts = await discord(env, `/guilds/${env.GUILD_ID}/roles/member-counts`);
  if (!counts || typeof counts !== 'object') throw new DiscordError('bad-body');
  const n = counts[env.ROLE_ID];
  if (n !== undefined) {
    if (!Number.isInteger(n) || n < 0) throw new DiscordError('bad-body');
    return n;
  }
  // cargo fora da lista: pode ser cargo sem ninguém ou ROLE_ID errado. Confere antes de dizer 0.
  const roles = await discord(env, `/guilds/${env.GUILD_ID}/roles`);
  if (Array.isArray(roles) && roles.some((r) => r.id === env.ROLE_ID)) return 0;
  throw new DiscordError('role-not-found');
}

async function getCount(env, now) {
  if (memo && now - memo.at < FRESH_MS) return { ...memo, stale: false };
  if (!inflight) {
    if (now < pauseUntil) {
      if (memo && now - memo.at < STALE_MS) return { ...memo, stale: true };
      throw new DiscordError('paused');
    }
    inflight = fetchCount(env)
      .then((count) => (memo = { count, at: Date.now() }))
      .catch((e) => {
        pauseUntil = Date.now() + Math.max(30_000, (e.retryAfter || 0) * 1000);
        throw e;
      })
      .finally(() => { inflight = null; });
  }
  try {
    const fresh = await inflight;
    return { ...fresh, stale: false };
  } catch (e) {
    // Discord fora / limite: devolve a última leitura real, marcada como antiga
    if (memo && now - memo.at < STALE_MS) return { ...memo, stale: true };
    throw e;
  }
}

function configError(env) {
  if (!env.DISCORD_BOT_TOKEN) return 'missing DISCORD_BOT_TOKEN';
  if (!SNOWFLAKE.test(String(env.GUILD_ID || ''))) return 'invalid GUILD_ID';
  if (!SNOWFLAKE.test(String(env.ROLE_ID || ''))) return 'invalid ROLE_ID';
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (url.pathname !== '/waitlist') return json({ error: 'not_found' }, 404, origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, origin);

    const bad = configError(env);
    if (bad) {
      console.error('config:', bad);
      return json({ error: 'unavailable' }, 503, origin);
    }

    const goal = Math.max(1, parseInt(env.GOAL, 10) || 30);
    try {
      const r = await getCount(env, Date.now());
      return json({ count: r.count, goal, updatedAt: new Date(r.at).toISOString(), stale: r.stale }, 200, origin, r.stale ? 30 : 60);
    } catch (e) {
      // o motivo fica no log do Worker; o site só recebe "indisponível"
      console.error('waitlist:', e.message);
      return json({ error: 'unavailable' }, 502, origin);
    }
  },
};

// só para os testes
export const _reset = () => { memo = null; inflight = null; pauseUntil = 0; };
