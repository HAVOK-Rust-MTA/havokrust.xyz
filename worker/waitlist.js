// HAVOK — contador da lista de espera (Cloudflare Worker).
// Conta quantos membros do Discord têm o cargo "Waiting List" e devolve em JSON para o site.
//
//   GET /waitlist  ->  { count, goal, updatedAt, stale }
//   cron (1 min)   ->  edita os painéis da lista no canal do Discord: status (panel.js) e inscrição (waitlist/join.js)
//   POST /interactions -> recrutamento da staff, lista de espera e /wipe pelo Discord (banco D1)
//   /api/wipe/*        -> calendário de wipe: status público (site) e sincronização assinada com o servidor MTA (wipe/)
//   /api/link/*, /v/*, /auth/discord*, /api/me -> vínculo conta do jogo <-> Discord e login do site (link/)
//
// O token do bot fica só no Secret DISCORD_BOT_TOKEN; GUILD_ID, ROLE_ID, GOAL e ALLOWED_ORIGINS
// ficam em [vars] no wrangler.toml. Nunca inventa número: se o Discord falhar e não houver
// leitura recente guardada, responde erro.

import { handleInteraction, recruitCron, serveBanner } from './recruit/interactions.js';
import { refreshWaitlist, readFirstWaitlist } from './waitlist/join.js';
import { handleWipeHttp, wipeCron } from './wipe/service.js';
import { handleLinkHttp, isLinkPath, linkCron } from './link/service.js';

const API = 'https://discord.com/api/v10';
const FRESH_MS = 30_000;            // leitura nova no máximo a cada 30 s
const STALE_MS = 6 * 60 * 60_000;   // se o Discord cair, ainda serve a última leitura por até 6 h
const TIMEOUT_MS = 8_000;
const SNOWFLAKE = /^\d{17,20}$/;

// cache do isolate; por cima dele, o Cache API (testado: funciona no workers.dev) divide a leitura entre todos os isolates
let memo = null;       // { count, at }
let inflight = null;   // uma só ida ao Discord por vez
let pauseUntil = 0;
let firstMemo = null;  // mural: { list, at }    // depois de uma falha, espera antes de tentar de novo (não martela o Discord)

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
  // a cada minuto: edita o painel da lista no canal do Discord (panel.js)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshWaitlist(env).then((r) => { if (r.status === 'updated') console.log('panel: updated'); }).catch((e) => console.error('panel:', e.message)));
    // recrutamento: tenta de novo o que falhou no Discord e limpa rascunhos (não faz nada sem o D1 configurado)
    ctx.waitUntil(recruitCron(env).catch((e) => console.error('recruit cron:', e.message)));
    // wipe: painel e avisos (quem executa o wipe é o servidor MTA, nunca o cron)
    ctx.waitUntil(wipeCron(env).catch((e) => console.error('wipe cron:', e.message)));
    // vínculo/login: limpa códigos, states e sessões vencidos
    ctx.waitUntil(linkCron(env).catch((e) => console.error('link cron:', e.message)));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // recrutamento da staff: o Discord entrega cliques, formulários e comandos aqui (assinados, Ed25519)
    if (url.pathname === '/interactions') return handleInteraction(request, env, ctx);
    if (url.pathname.startsWith('/api/wipe/') || url.pathname === '/api/ranking') return handleWipeHttp(request, env, ctx, url);
    // vínculo conta do jogo <-> Discord e login do site (link/)
    if (isLinkPath(url.pathname)) return handleLinkHttp(request, env, ctx, url);
    // banner do painel de recrutamento (o Discord baixa daqui)
    if (url.pathname.startsWith('/recruit/') && request.method === 'GET') return serveBanner(url.pathname.slice('/recruit/'.length));
    const origin = allowedOrigin(request, env);

    // mural dos 15 primeiros (página de badges do site)
    if (url.pathname === '/waitlist/first' && request.method === 'GET') {
      try {
        if (!firstMemo || Date.now() - firstMemo.at > 60_000) firstMemo = { list: await readFirstWaitlist(env), at: Date.now() };
        return json({ first: firstMemo.list }, 200, origin, 60);
      } catch (e) {
        console.error('first:', e.message);
        return json({ error: 'unavailable' }, 502, origin);
      }
    }
    if (request.method === 'OPTIONS' && url.pathname === '/waitlist/first') return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
    if (url.pathname !== '/waitlist') return json({ error: 'not_found' }, 404, origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, origin);

    const bad = configError(env);
    if (bad) {
      console.error('config:', bad);
      return json({ error: 'unavailable' }, 503, origin);
    }

    const goal = Math.max(1, parseInt(env.GOAL, 10) || 30);
    // cache compartilhado entre isolates (Cache API); se não estiver disponível, segue só com o memo
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request(`https://cache.havok/waitlist/${env.GUILD_ID}/${env.ROLE_ID}`);
    if (!memo || Date.now() - memo.at >= FRESH_MS) {
      try {
        const hit = cache && await cache.match(key);
        if (hit) {
          const c = await hit.json();
          if (Number.isInteger(c.count) && Date.now() - c.at < FRESH_MS) memo = c;
        }
      } catch (e) { /* sem cache: tudo bem */ }
    }
    try {
      const before = memo && memo.at;
      const r = await getCount(env, Date.now());
      if (cache && !r.stale && r.at !== before) {
        try {
          await cache.put(key, new Response(JSON.stringify({ count: r.count, at: r.at }), { headers: { 'Cache-Control': 'max-age=30' } }));
        } catch (e) { /* idem */ }
      }
      return json({ count: r.count, goal, updatedAt: new Date(r.at).toISOString(), stale: r.stale }, 200, origin, r.stale ? 15 : 30);
    } catch (e) {
      // o motivo fica no log do Worker; o site só recebe "indisponível"
      console.error('waitlist:', e.message);
      return json({ error: 'unavailable' }, 502, origin);
    }
  },
};

// só para os testes
export const _reset = () => { memo = null; inflight = null; pauseUntil = 0; };
