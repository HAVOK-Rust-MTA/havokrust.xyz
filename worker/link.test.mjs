// node --test worker/  — vínculo conta do jogo <-> Discord: D1 = SQLite real com as migrations, Discord simulado,
// assinatura HMAC real. Nenhuma conta de verdade é tocada.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './waitlist.js';
import { hmacHex } from './wipe/service.js';
import { sanitizeProfile } from './link/service.js';

const MIGRATION = ['0001_recruitment.sql', '0002_bot_settings.sql', '0003_wipe.sql', '0004_link.sql']
  .map((f) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  runSync() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
  async run() { return this.runSync(); }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
}
class FakeD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(MIGRATION); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) { this.db.exec('BEGIN'); try { const o = stmts.map((s) => s.runSync()); this.db.exec('COMMIT'); return o; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  row(sql, ...a) { return this.db.prepare(sql).get(...a); }
}

const REAL_NOW = Date.now;
let clock;
const advance = (sec) => { clock += sec * 1000; };
const nowS = () => Math.floor(clock / 1000);
const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const API = 'https://api.havokrust.xyz';
const SITE = 'https://havokrust.xyz';
let env, discordUser, discordFail;
const ctx = { waitUntil: () => {} };

// Discord simulado: troca o code por token e devolve o usuário da vez
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (discordFail) return new Response('{}', { status: 400 });
  if (u.endsWith('/oauth2/token')) {
    const body = new URLSearchParams(init.body);
    assert.equal(body.get('redirect_uri'), `${API}/auth/discord/callback`);
    assert.equal(body.get('client_secret'), 'shh');
    return Response.json({ access_token: `tok-${body.get('code')}` });
  }
  if (u.endsWith('/users/@me')) return Response.json(discordUser);
  return new Response('{}', { status: 404 });
};

beforeEach(() => {
  clock = Date.UTC(2026, 10, 1, 23) ;
  Date.now = () => clock;
  env = {
    DB: new FakeD1(), WIPE_SECRET: SECRET, ALLOWED_ORIGINS: SITE, SITE_URL: SITE, API_PUBLIC_URL: API,
    DISCORD_APPLICATION_ID: '1560692623289614487', DISCORD_CLIENT_SECRET: 'shh', COOKIE_DOMAIN: '.havokrust.xyz',
  };
  discordUser = { id: '200000000000000001', username: 'joao', global_name: 'João', avatar: 'a'.repeat(32) };
  discordFail = false;
});
afterEach(() => { Date.now = REAL_NOW; });

async function server(path, payload, secret = SECRET) {
  const ts = String(nowS());
  const body = JSON.stringify(payload);
  const sig = await hmacHex(secret, `${ts}\nPOST\n${path}\n${body}`);
  const res = await worker.fetch(new Request(`${API}${path}`, { method: 'POST', headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': sig }, body }), env, ctx);
  return { status: res.status, json: await res.json() };
}
const get = (path, headers = {}) => worker.fetch(new Request(`${API}${path}`, { headers, redirect: 'manual' }), env, ctx);

// abre o link do jogo e volta do Discord; devolve a resposta final (redirect para o site) e o cookie
async function authorize(linkPath) {
  const r1 = await get(linkPath);
  assert.equal(r1.status, 302);
  const auth = new URL(r1.headers.get('Location'));
  assert.equal(auth.origin + auth.pathname, 'https://discord.com/oauth2/authorize');
  assert.equal(auth.searchParams.get('scope'), 'identify');
  const r2 = await get(`/auth/discord/callback?code=c0de&state=${auth.searchParams.get('state')}`);
  const cookie = (r2.headers.get('Set-Cookie') || '').split(';')[0];
  return { res: r2, location: r2.headers.get('Location'), cookie };
}

test('jogo pede código (assinado), jogador autoriza no Discord, conta fica vinculada', async () => {
  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'Joao#FF0000' });
  assert.equal(c.status, 200);
  assert.equal(c.json.linked, false);
  assert.match(c.json.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(c.json.url, `${API}/v/${c.json.code}`);

  // antes de autorizar, nada vinculado
  assert.deepEqual((await server('/api/link/mta/status', { codes: [c.json.code] })).json.linked, {});

  const a = await authorize(`/v/${c.json.code}`);
  assert.equal(a.location, `${SITE}/#/perfil?vinculado=1`);
  assert.match(a.res.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax; Max-Age=\d+; Domain=\.havokrust\.xyz/);

  const st = await server('/api/link/mta/status', { codes: [c.json.code] });
  assert.deepEqual(st.json.linked[c.json.code], { account: 'SERIAL-A', discordName: 'João' });
  assert.deepEqual((await server('/api/link/mta/lookup', { accounts: ['SERIAL-A', 'SERIAL-B'] })).json.linked, { 'SERIAL-A': 'João' });

  // pedir código de novo para conta já vinculada só responde quem é
  assert.deepEqual((await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'Joao' })).json, { linked: true, discordName: 'João' });

  // o site vê a sessão (com credenciais, só da origem do site)
  const me = await get('/api/me', { Cookie: a.cookie, Origin: SITE });
  assert.equal(me.headers.get('Access-Control-Allow-Origin'), SITE);
  assert.equal(me.headers.get('Access-Control-Allow-Credentials'), 'true');
  const body = await me.json();
  assert.equal(body.loggedIn, true);
  assert.equal(body.linked, true);
  assert.equal(body.nick, 'Joao');
  assert.equal(body.avatarUrl, `https://cdn.discordapp.com/avatars/200000000000000001/${'a'.repeat(32)}.png?size=256`);
});

test('sem assinatura válida o jogo não cria código nem consulta', async () => {
  assert.equal((await server('/api/link/mta/code', { account: 'X', nick: 'x' }, 'outro-segredo-qualquer-com-32-caracteres')).status, 401);
  const res = await worker.fetch(new Request(`${API}/api/link/mta/code`, { method: 'POST', body: '{"account":"X"}' }), env, ctx);
  assert.equal(res.status, 401);
});

test('código reaproveitado enquanto vale; vencido ou usado não serve', async () => {
  const a = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  assert.equal((await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' })).json.code, a.json.code);
  advance(16 * 60);
  const r = await get(`/v/${a.json.code}`);
  assert.equal(r.headers.get('Location'), `${SITE}/#/perfil?erro=codigo`);
  const b = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  assert.notEqual(b.json.code, a.json.code);
  await authorize(`/v/${b.json.code}`);
  // o mesmo link de novo (alguém viu o QR na live): já usado
  assert.equal((await get(`/v/${b.json.code}`)).headers.get('Location'), `${SITE}/#/perfil?erro=codigo`);
});

test('conta do jogo já vinculada a outro Discord não troca de dono', async () => {
  const a = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  // dois códigos da mesma conta abertos antes do vínculo (corrida): o segundo Discord não leva a conta
  env.DB.db.prepare(`INSERT INTO link_codes (code, account, nick, created_at, expires_at) VALUES ('ZZZZZZZZ', 'SERIAL-A', 'A', ?, ?)`).run(nowS(), nowS() + 900);
  await authorize(`/v/${a.json.code}`);
  discordUser = { id: '200000000000000002', username: 'intruso', avatar: null };
  const r = await authorize('/v/ZZZZZZZZ');
  assert.equal(r.location, `${SITE}/#/perfil?erro=ja_vinculada`);
  assert.deepEqual((await server('/api/link/mta/lookup', { accounts: ['SERIAL-A'] })).json.linked, { 'SERIAL-A': 'João' });
});

test('um Discord fica com uma conta só: vincular outra move o vínculo', async () => {
  const a = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  await authorize(`/v/${a.json.code}`);
  const b = await server('/api/link/mta/code', { account: 'SERIAL-B', nick: 'B' });
  await authorize(`/v/${b.json.code}`);
  assert.deepEqual((await server('/api/link/mta/lookup', { accounts: ['SERIAL-A', 'SERIAL-B'] })).json.linked, { 'SERIAL-B': 'João' });
});

test('state do OAuth: inventado, repetido ou vencido é recusado', async () => {
  assert.equal((await get('/auth/discord/callback?code=x&state=' + 'f'.repeat(32))).headers.get('Location'), `${SITE}/#/perfil?erro=expirou`);
  const r1 = await get('/auth/discord');
  const state = new URL(r1.headers.get('Location')).searchParams.get('state');
  advance(11 * 60);
  assert.equal((await get(`/auth/discord/callback?code=x&state=${state}`)).headers.get('Location'), `${SITE}/#/perfil?erro=expirou`);
});

test('login pelo site sem código: sessão aberta, ainda sem vínculo', async () => {
  const a = await authorize('/auth/discord');
  assert.equal(a.location, `${SITE}/#/perfil`);
  const me = await (await get('/api/me', { Cookie: a.cookie, Origin: SITE })).json();
  assert.equal(me.loggedIn, true);
  assert.equal(me.linked, false);
  // sair apaga a sessão
  await worker.fetch(new Request(`${API}/api/logout`, { method: 'POST', headers: { Cookie: a.cookie, Origin: SITE } }), env, ctx);
  assert.equal((await (await get('/api/me', { Cookie: a.cookie, Origin: SITE })).json()).loggedIn, false);
});

test('Discord falhou: volta para o site com erro, sem sessão', async () => {
  const r1 = await get('/auth/discord');
  const state = new URL(r1.headers.get('Location')).searchParams.get('state');
  discordFail = true;
  const r2 = await get(`/auth/discord/callback?code=x&state=${state}`);
  assert.equal(r2.headers.get('Location'), `${SITE}/#/perfil?erro=discord`);
  assert.equal(r2.headers.get('Set-Cookie'), null);
});

test('perfil que o jogo manda é limpo e só grava em conta vinculada', async () => {
  const a = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  const { cookie } = await authorize(`/v/${a.json.code}`);
  const r = await server('/api/link/mta/profile', { players: [
    { account: 'SERIAL-A', nick: '#FF6A00Jo<b>ao', level: 51.7, kills: -3, deaths: 10, group: 'Os Brabo', groupTag: 'BRB', badges: { founder: 1, newyear2026: 2, '../x': 1 } },
    { account: 'NAO-VINCULADA', nick: 'Z', level: 1 },
  ] });
  assert.equal(r.json.updated, 1);
  const me = await (await get('/api/me', { Cookie: cookie, Origin: SITE })).json();
  assert.deepEqual(me.profile, { nick: 'Jobao', level: 51, kills: 0, deaths: 10, playMinutes: 0, group: 'Os Brabo', groupTag: 'BRB', badges: { founder: 1, newyear2026: 2 } });
});

test('CORS do /api/me só libera a origem do site', async () => {
  const r = await get('/api/me', { Origin: 'https://malicioso.example' });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});

test('sanitizeProfile aguenta lixo', () => {
  assert.deepEqual(sanitizeProfile(null).badges, {});
  assert.equal(sanitizeProfile({ level: 'abc' }).level, 0);
});
