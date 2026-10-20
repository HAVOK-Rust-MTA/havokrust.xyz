// Vínculo conta do jogo <-> Discord e login do site (perfil).
//
// Jogo (assinado com HMAC, igual ao wipe):
//   POST /api/link/mta/code     {account, nick}           -> {code, url, expiresIn} ou {linked, discordName}
//   POST /api/link/mta/status   {codes: [...]}            -> {linked: {code: {account, discordName}}}
//   POST /api/link/mta/lookup   {accounts: [...]}         -> {linked: {account: discordName}}
// (os números, grupo e badges de todo jogador chegam pelo /api/game/mta/sync, com ou sem vínculo: game/)
// Jogador (navegador):
//   GET  /v/<código>            link/QR da tela do jogo: vai direto para o "Autorizar" do Discord
//   GET  /auth/discord          "Entrar com Discord" do site (sem código)
//   GET  /auth/discord/callback volta do Discord: liga a conta (se veio de um código), abre a sessão, manda para o perfil
//   GET  /api/me                quem está logado (cookie da sessão; CORS só para o site)
//   POST /api/logout
//
// Segurança: o código só nasce pelo servidor do jogo (assinado) para a conta logada lá, e só vira vínculo quando alguém
// autoriza com o Discord. Ninguém vincula a conta de outro só sabendo o ID ou o serial dele.
import { json, nowS, verifyServer, siteCors, clean, account, avatarUrl } from '../lib/util.js';
import { playerByAccount, playerView } from '../game/service.js';

const CODE_TTL_S = 15 * 60;
const STATE_TTL_S = 10 * 60;
const SESSION_TTL_S = 30 * 86400;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32: sem 0/O/1/I
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const COOKIE = 'havok_s';
const DISCORD = 'https://discord.com/api/v10';

// //------------------- UTIL -------------------\\
const redirect = (to, headers = {}) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...headers } });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export function newCode() {
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => CODE_ALPHABET[b & 31]).join('');
}


const siteUrl = (env) => String(env.SITE_URL || '').replace(/\/+$/, '');
const apiUrl = (env) => String(env.API_PUBLIC_URL || '').replace(/\/+$/, '');
const redirectUri = (env) => `${apiUrl(env)}/auth/discord/callback`;

function cookieOf(request) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  return m ? m[1] : null;
}
const setCookie = (env, token, maxAge) => [
  `${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', `Max-Age=${maxAge}`,
  env.COOKIE_DOMAIN ? `Domain=${env.COOKIE_DOMAIN}` : null,
].filter(Boolean).join('; ');

// //------------------- JOGO (assinado) -------------------\\
async function mta(request, env, path) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await verifyServer(request, env, path);
  if (body === null) return json({ error: 'unauthorized' }, 401);
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const db = env.DB;
  const t = nowS();

  if (path === '/api/link/mta/code') {
    const acc = account(data.account);
    if (!acc) return json({ error: 'bad_account' }, 400);
    const linked = await db.prepare('SELECT discord_name FROM players WHERE account = ?').bind(acc).first();
    if (linked) return json({ linked: true, discordName: linked.discord_name });
    // reaproveita o código ainda válido (a tela pode abrir de novo sem gerar outro)
    let row = await db.prepare('SELECT code, expires_at FROM link_codes WHERE account = ? AND used_at IS NULL AND expires_at > ? ORDER BY expires_at DESC').bind(acc, t + 120).first();
    if (!row) {
      row = { code: newCode(), expires_at: t + CODE_TTL_S };
      await db.prepare('INSERT INTO link_codes (code, account, nick, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(row.code, acc, clean(data.nick) || '?', t, row.expires_at).run();
    }
    return json({ linked: false, code: row.code, url: `${apiUrl(env)}/v/${row.code}`, expiresIn: row.expires_at - t });
  }

  if (path === '/api/link/mta/status') {
    const codes = (Array.isArray(data.codes) ? data.codes : []).filter((c) => CODE_RE.test(c)).slice(0, 50);
    const out = {};
    for (const code of codes) {
      const r = await db.prepare(`SELECT c.account, p.discord_name FROM link_codes c JOIN players p ON p.discord_id = c.discord_id
                                  WHERE c.code = ? AND c.used_at IS NOT NULL AND p.account = c.account`).bind(code).first();
      if (r) out[code] = { account: r.account, discordName: r.discord_name };
    }
    return json({ linked: out });
  }

  if (path === '/api/link/mta/lookup') {
    const accounts = (Array.isArray(data.accounts) ? data.accounts : []).map(account).filter(Boolean).slice(0, 100);
    const out = {};
    for (const acc of accounts) {
      const r = await db.prepare('SELECT discord_name FROM players WHERE account = ?').bind(acc).first();
      if (r) out[acc] = r.discord_name;
    }
    return json({ linked: out });
  }

  return json({ error: 'not_found' }, 404);
}

// //------------------- DISCORD (navegador) -------------------\\
async function startOAuth(env, linkCode) {
  // tudo vem do wrangler.toml/secrets; faltando algo, não inventa endereço
  if (!siteUrl(env)) return json({ error: 'not_configured' }, 503);
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_CLIENT_SECRET || !apiUrl(env)) return redirect(`${siteUrl(env)}/#/perfil?erro=config`);
  const state = randomHex(16);
  await env.DB.prepare('INSERT INTO oauth_states (state, link_code, created_at) VALUES (?, ?, ?)').bind(state, linkCode, nowS()).run();
  const q = new URLSearchParams({
    client_id: env.DISCORD_APPLICATION_ID, response_type: 'code', scope: 'identify', redirect_uri: redirectUri(env), state, prompt: 'none',
  });
  return redirect(`https://discord.com/oauth2/authorize?${q}`);
}

async function discordUser(env, code) {
  const tok = await fetch(`${DISCORD}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_APPLICATION_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri(env),
    }),
  });
  if (!tok.ok) throw new Error(`token ${tok.status}`);
  const { access_token: access } = await tok.json();
  const me = await fetch(`${DISCORD}/users/@me`, { headers: { Authorization: `Bearer ${access}` } });
  if (!me.ok) throw new Error(`me ${me.status}`);
  const u = await me.json();
  if (!/^\d{17,20}$/.test(String(u.id))) throw new Error('bad user');
  return { id: String(u.id), name: clean(u.global_name || u.username, 40) || 'Discord', avatar: /^(a_)?[0-9a-f]{32}$/.test(String(u.avatar)) ? u.avatar : null };
}

async function callback(request, env, url) {
  const site = siteUrl(env);
  const db = env.DB;
  const t = nowS();
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  if (url.searchParams.get('error')) return redirect(`${site}/#/perfil?erro=cancelado`);
  const st = /^[0-9a-f]{32}$/.test(state) ? await db.prepare('SELECT link_code, created_at FROM oauth_states WHERE state = ?').bind(state).first() : null;
  if (st) await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
  if (!st || t - st.created_at > STATE_TTL_S || !code) return redirect(`${site}/#/perfil?erro=expirou`);

  let user;
  try {
    user = await discordUser(env, code);
  } catch (e) {
    console.error('link oauth:', e.message);
    return redirect(`${site}/#/perfil?erro=discord`);
  }
  await db.prepare(`INSERT INTO players (discord_id, discord_name, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (discord_id) DO UPDATE SET discord_name = excluded.discord_name, avatar = excluded.avatar, updated_at = excluded.updated_at`)
    .bind(user.id, user.name, user.avatar, t, t).run();

  let result = '';
  if (st.link_code) {
    const lc = await db.prepare('SELECT account, nick, expires_at, used_at FROM link_codes WHERE code = ?').bind(st.link_code).first();
    const owner = lc && await db.prepare('SELECT discord_id FROM players WHERE account = ?').bind(lc.account).first();
    if (!lc || lc.used_at || lc.expires_at < t) {
      result = 'erro=codigo';
    } else if (owner && owner.discord_id !== user.id) {
      result = 'erro=ja_vinculada'; // a conta do jogo já é de outro Discord
    } else {
      // um Discord = uma conta do jogo: se ele já tinha outra, passa a ser esta
      await db.batch([
        db.prepare('UPDATE players SET account = ?, nick = ?, linked_at = ?, updated_at = ? WHERE discord_id = ?').bind(lc.account, lc.nick, t, t, user.id),
        db.prepare('UPDATE link_codes SET used_at = ?, discord_id = ? WHERE code = ?').bind(t, user.id, st.link_code),
      ]);
      result = 'vinculado=1';
    }
  }

  const token = randomHex(32);
  await db.prepare('INSERT INTO sessions (token_hash, discord_id, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), user.id, t, t + SESSION_TTL_S).run();
  return redirect(`${site}/#/perfil${result ? `?${result}` : ''}`, { 'Set-Cookie': setCookie(env, token, SESSION_TTL_S) });
}

async function sessionUser(request, env) {
  const token = cookieOf(request);
  if (!token) return null;
  const s = await env.DB.prepare('SELECT discord_id, expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first();
  if (!s || s.expires_at < nowS()) return null;
  return env.DB.prepare('SELECT discord_id, account, nick, discord_name, avatar, linked_at FROM players WHERE discord_id = ?').bind(s.discord_id).first();
}

// //------------------- ROTEADOR -------------------\\
export function isLinkPath(path) {
  return path.startsWith('/api/link/') || path.startsWith('/v/') || path.startsWith('/auth/discord') || path === '/api/me' || path === '/api/logout';
}

export async function handleLinkHttp(request, env, ctx, url) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  if (path.startsWith('/api/link/mta/')) return mta(request, env, path);

  if (path.startsWith('/v/') && request.method === 'GET') {
    const code = path.slice(3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const lc = CODE_RE.test(code) && await env.DB.prepare('SELECT expires_at, used_at FROM link_codes WHERE code = ?').bind(code).first();
    if (!lc || lc.used_at || lc.expires_at < nowS()) return redirect(`${siteUrl(env)}/#/perfil?erro=codigo`);
    return startOAuth(env, code);
  }
  if (path === '/auth/discord' && request.method === 'GET') return startOAuth(env, null);
  if (path === '/auth/discord/callback' && request.method === 'GET') return callback(request, env, url);

  const h = siteCors(request, env, true);
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (path === '/api/me' && request.method === 'GET') {
    const p = await sessionUser(request, env);
    if (!p) return json({ loggedIn: false, loginUrl: `${apiUrl(env)}/auth/discord` }, 200, h);
    // números, grupo e badges vêm do jogo (game_players): o histórico de antes do vínculo vem junto
    const g = p.account ? await playerByAccount(env.DB, p.account) : null;
    return json({
      loggedIn: true, linked: !!p.account, discordName: p.discord_name, avatarUrl: avatarUrl(p.discord_id, p.avatar),
      nick: (g && g.nick) || p.nick, linkedAt: p.linked_at, profile: g ? await playerView(env.DB, g) : null,
    }, 200, h);
  }
  if (path === '/api/logout' && request.method === 'POST') {
    const token = cookieOf(request);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, { ...h, 'Set-Cookie': setCookie(env, '0'.repeat(64), 0) });
  }
  return json({ error: 'not_found' }, 404, h);
}

// cron: limpa o que venceu
export async function linkCron(env) {
  if (!env.DB) return;
  const t = nowS();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM link_codes WHERE used_at IS NULL AND expires_at < ?').bind(t - 86400),
    env.DB.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(t - STATE_TTL_S),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
  ]);
}
