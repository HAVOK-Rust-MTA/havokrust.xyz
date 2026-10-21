// node --test api/  — vínculo, jogadores e grupos: D1 = SQLite real com as migrations, Discord simulado,
// assinatura HMAC real. Nenhuma conta de verdade é tocada.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './index.js';
import { hmacHex } from './lib/util.js';
import { sanitizeBadges, slugify } from './game/service.js';

const MIGRATION = ['0001_recruitment.sql', '0002_bot_settings.sql', '0003_wipe.sql', '0004_link.sql', '0005_game.sql', '0006_group_style.sql', '0007_group_prize.sql', '0008_profile_social.sql', '0009_ac_clips.sql', '0010_ac_fps.sql']
  .map((f) => readFileSync(new URL(`../worker/migrations/${f}`, import.meta.url), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  runSync() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
  async run() { return this.runSync(); }
  // igual ao D1 de verdade: BLOB volta como lista de números
  async first() { const r = this.db.prepare(this.sql).get(...this.args) ?? null; if (r) for (const k in r) if (r[k] instanceof Uint8Array) r[k] = Array.from(r[k]); return r; }
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

test('jogo pega a foto (64px) só de quem vinculou', async () => {
  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  await authorize(`/v/${c.json.code}`);
  const r = await server('/api/link/mta/avatars', { accounts: ['SERIAL-A', 'SERIAL-B'] });
  assert.deepEqual(r.json.avatars, { 'SERIAL-A': `https://cdn.discordapp.com/avatars/200000000000000001/${'a'.repeat(32)}.png?size=64` });
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

const pub = async (path) => { const r = await get(path, { Origin: SITE }); return { status: r.status, json: await r.json(), headers: r.headers }; };
const syncGame = (players, groups) => server('/api/game/mta/sync', groups === undefined ? { players } : { players, groups });
const GROUP = { name: 'Os Brábo', tag: 'BRB', color: '#FF6A00', emblem: '07', desc: 'Raid toda noite.\n<script>', xp: 900, kills: 30, deaths: 10, members: [
  { acc: 'SERIAL-A', role: 'Leader' }, { acc: 'SERIAL-B', role: 'Member' }, { acc: 'SERIAL-C', role: 'Sub' }, { acc: 'SERIAL-SUMIDO', role: 'Member' }] };

test('jogador sem Discord entra no banco e aparece no grupo com nick e avatar cinza; o serial não sai', async () => {
  const r = await syncGame([
    { account: 'SERIAL-A', nick: 'Lider', level: 40, kills: 20, deaths: 5, playMinutes: 600, group: 'Os Brábo', badges: { founder: 1 } },
    { account: 'SERIAL-B', nick: '#00FF00Novato', level: 3, kills: 0, deaths: 2, group: 'Os Brábo' },
    { account: 'SERIAL-C', nick: 'Sub', level: 12, group: 'Os Brábo' },
  ], [GROUP]);
  assert.deepEqual(r.json, { players: 3, groups: 1 });

  const list = await pub('/api/groups');
  assert.equal(list.json.groups.length, 1);
  const slug = list.json.groups[0].slug;
  assert.equal(list.json.groups[0].members, 4);

  const g = await pub(`/api/group/${slug}`);
  assert.equal(g.status, 200);
  // membro que nunca apareceu no sync fica de fora; ordem: líder, sub, membro
  assert.deepEqual(g.json.members.map((m) => [m.nick, m.role, m.linked, m.avatarUrl]), [['Lider', 'Leader', false, null], ['Sub', 'Sub', false, null], ['Novato', 'Member', false, null]]);
  assert.ok(!JSON.stringify(g.json).includes('SERIAL'), 'serial não pode sair na API pública');

  const p = await pub(`/api/player/${g.json.members[0].pid}`);
  assert.equal(p.json.nick, 'Lider');
  assert.deepEqual(p.json.badges, { founder: 1 });
  assert.equal(p.json.group.slug, slug);
  assert.ok(!JSON.stringify(p.json).includes('SERIAL'));
});

test('vinculou depois: o histórico que já existia aparece com a foto do Discord, no perfil e no grupo', async () => {
  await syncGame([{ account: 'SERIAL-A', nick: 'Lider', level: 40, kills: 20, deaths: 5, playMinutes: 600, group: 'Os Brábo', badges: { founder: 1, newyear2026: 1 } }], [GROUP]);
  const before = await pub('/api/groups');
  const slug = before.json.groups[0].slug;
  const pidBefore = (await pub(`/api/group/${slug}`)).json.members[0].pid;

  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'Lider' });
  const { cookie } = await authorize(`/v/${c.json.code}`);
  const me = await (await get('/api/me', { Cookie: cookie, Origin: SITE })).json();
  assert.equal(me.profile.level, 40);
  assert.equal(me.profile.pid, pidBefore, 'o pid não muda com o vínculo');
  assert.deepEqual(me.profile.badges, { founder: 1, newyear2026: 1 });
  assert.equal(me.profile.group.name, 'Os Brábo');

  const m = (await pub(`/api/group/${slug}`)).json.members[0];
  assert.equal(m.linked, true);
  assert.equal(m.avatarUrl, `https://cdn.discordapp.com/avatars/200000000000000001/${'a'.repeat(32)}.png?size=256`);
});

test('sync atualiza números sem trocar o pid; lista de grupos nova substitui a antiga', async () => {
  await syncGame([{ account: 'SERIAL-A', nick: 'A', level: 1 }], [GROUP]);
  const pid = (await pub(`/api/group/${(await pub('/api/groups')).json.groups[0].slug}`)).json.members[0].pid;
  await syncGame([{ account: 'SERIAL-A', nick: 'A2', level: 9 }], []);
  assert.deepEqual((await pub('/api/groups')).json.groups, []);
  const p = await pub(`/api/player/${pid}`);
  assert.equal(p.json.nick, 'A2');
  assert.equal(p.json.level, 9);
  assert.equal(p.json.group, null);
  // sync só de jogadores (sem 'groups') não mexe nos grupos
  await syncGame([{ account: 'SERIAL-A', nick: 'A2', level: 9 }], [GROUP]);
  await syncGame([{ account: 'SERIAL-A', nick: 'A3', level: 10 }]);
  assert.equal((await pub('/api/groups')).json.groups.length, 1);
});

test('ranking de jogadores: ordena, traz grupo com cor e foto só de quem vinculou; emblema e descrição do grupo', async () => {
  await syncGame([
    { account: 'SERIAL-A', nick: 'Lider', level: 40, kills: 20, deaths: 5, playMinutes: 600, group: 'Os Brábo' },
    { account: 'SERIAL-B', nick: 'Matador', level: 10, kills: 99, deaths: 9, playMinutes: 100 },
    { account: 'SERIAL-Z', nick: 'NuncaJogou', level: 1, kills: 0, deaths: 0, playMinutes: 0 },
  ], [GROUP]);
  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'Lider' });
  await authorize(`/v/${c.json.code}`);
  const byKills = (await pub('/api/ranking/players')).json.players;
  assert.deepEqual(byKills.map((p) => [p.rank, p.nick]), [[1, 'Matador'], [2, 'Lider']]);
  assert.equal(byKills[0].avatarUrl, null);
  assert.ok(byKills[1].avatarUrl.startsWith('https://cdn.discordapp.com/'));
  assert.deepEqual(byKills[1].group, { name: 'Os Brábo', slug: 'os-brabo', tag: 'BRB', color: '#FF6A00' });
  assert.equal((await pub('/api/ranking/players?by=level')).json.players[0].nick, 'Lider');
  assert.equal((await pub('/api/ranking/players?by=hours')).json.players[0].nick, 'Lider');
  assert.equal((await pub('/api/ranking/players?by=xpto;drop')).status, 400);
  assert.ok(!JSON.stringify(byKills).includes('SERIAL'));
  const g = (await pub('/api/groups')).json.groups[0];
  assert.equal(g.emblem, '07');
  assert.equal(g.description, 'Raid toda noite.script');
  assert.equal((await pub('/api/group/os-brabo')).json.emblem, '07');
});

test('prêmio do pódio: o jogo manda, o site lê (limpo); fora do top 3 não tem', async () => {
  await syncGame([], [{ ...GROUP, prize: { winners: 6, days: 1, tier: 1, extra: 'x' } }, { ...GROUP, name: 'Outro', prize: null }]);
  const gs = (await pub('/api/groups')).json.groups;
  assert.deepEqual(gs[0].prize, { winners: 6, days: 1, tier: 1 });
  assert.equal(gs[1].prize, null);
  assert.deepEqual((await pub(`/api/group/${gs[0].slug}`)).json.prize, { winners: 6, days: 1, tier: 1 });
});

test('sync sem assinatura é recusado; perfil inexistente e slug inválido dão 404', async () => {
  assert.equal((await server('/api/game/mta/sync', { players: [] }, 'outro-segredo-qualquer-com-32-caracteres')).status, 401);
  assert.equal((await pub('/api/player/abcdefghij')).status, 404);
  assert.equal((await pub('/api/group/..%2Fx')).status, 404);
});

test('grupos com nome parecido ganham slugs diferentes', async () => {
  await syncGame([], [{ ...GROUP, name: 'Os Brabo' }, { ...GROUP, name: 'os brabo!' }]);
  assert.deepEqual((await pub('/api/groups')).json.groups.map((g) => g.slug), ['os-brabo', 'os-brabo-2']);
});

const editProfile = (cookie, body, origin = SITE) => worker.fetch(new Request(`${API}/api/me/profile`, {
  method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env, ctx);

test('perfil: o jogador escreve descrição e links (YouTube/TikTok); aparece no perfil público; grupo com emblema e cargo', async () => {
  await syncGame([{ account: 'SERIAL-A', nick: 'Lider', level: 40, group: 'Os Brábo' }], [GROUP]);
  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'Lider' });
  const { cookie } = await authorize(`/v/${c.json.code}`);
  const r = await editProfile(cookie, { bio: 'Raid toda noite.\n\n\n\nChama no Discord', youtube: '@havokrust', tiktok: 'https://www.tiktok.com/@havok.br' });
  assert.equal(r.status, 200);
  const me = await (await get('/api/me', { Cookie: cookie, Origin: SITE })).json();
  assert.deepEqual(me.social, { bio: 'Raid toda noite.\n\nChama no Discord', youtube: 'https://www.youtube.com/@havokrust', tiktok: 'https://www.tiktok.com/@havok.br' });
  assert.deepEqual(me.profile.group, { name: 'Os Brábo', slug: 'os-brabo', tag: 'BRB', color: '#FF6A00', rank: 1, emblem: '07', members: 4, role: 'Leader' });
  const pub1 = (await pub(`/api/player/${me.profile.pid}`)).json;
  assert.equal(pub1.social.youtube, 'https://www.youtube.com/@havokrust');
  assert.ok(!JSON.stringify(pub1).includes('SERIAL'));
});

test('perfil: link que não é YouTube/TikTok, sem sessão ou de outro site é recusado', async () => {
  const c = await server('/api/link/mta/code', { account: 'SERIAL-A', nick: 'A' });
  const { cookie } = await authorize(`/v/${c.json.code}`);
  assert.equal((await editProfile(cookie, { youtube: 'https://evil.example/@x' })).status, 400);
  assert.equal((await editProfile(cookie, { tiktok: 'javascript:alert(1)' })).status, 400);
  assert.equal((await editProfile('havok_s=' + 'b'.repeat(64), { bio: 'x' })).status, 401);
  assert.equal((await editProfile(cookie, { bio: 'x' }, 'https://malicioso.example')).status, 403);
  // jogador sem Discord não tem descrição nem links no perfil público
  await syncGame([{ account: 'SERIAL-Z', nick: 'Sem', level: 1, playMinutes: 5 }]);
  const pl = (await pub('/api/ranking/players')).json.players.find((p) => p.nick === 'Sem');
  assert.equal((await pub(`/api/player/${pl.pid}`)).json.social, null);
});

test('CORS do /api/me só libera a origem do site', async () => {
  const r = await get('/api/me', { Origin: 'https://malicioso.example' });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});

test('badges e slug aguentam lixo', () => {
  assert.deepEqual(sanitizeBadges(null), {});
  assert.deepEqual(sanitizeBadges({ '../x': 1, founder: 'abc' }), { founder: 1 });
  assert.equal(slugify('!!!'), 'grupo');
  assert.equal(slugify('Ação Ç'), 'acao-c');
});

// //------------------- ANTI-CHEAT: GRAVAÇÕES -------------------\\
const JPEG = (n) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, n, 1, 2, 3]).toString('base64');

test('ac: servidor guarda gravação assinada; o site lê pelo id; quadro sai como JPEG', async () => {
  const r = await server('/api/ac/clip', { player: 'Suspeito#FF0000', account: 'SERIAL-X', reason: 'Fly', detail: 'teste', fps: 2, frames: [JPEG(1), 'lixo', JPEG(2)] });
  assert.equal(r.status, 200);
  assert.match(r.json.id, /^[0-9a-f]{32}$/);
  assert.equal(r.json.frames, 2);
  const meta = (await pub(`/api/ac/clip/${r.json.id}`)).json;
  assert.equal(meta.player, 'Suspeito');
  assert.equal(meta.reason, 'Fly');
  assert.equal(meta.frames, 2);
  assert.equal(meta.fps, 2);
  assert.ok(!JSON.stringify(meta).includes('SERIAL-X'));
  const img = await worker.fetch(new Request(`${API}/api/ac/clip/${r.json.id}/1.jpg`), env, ctx);
  assert.equal(img.headers.get('Content-Type'), 'image/jpeg');
  const bytes = new Uint8Array(await img.arrayBuffer());
  assert.equal(bytes.length, 8);
  assert.equal(bytes[4], 2);
});

test('ac: sem assinatura, sem quadro válido ou id inventado não passa; some depois de 14 dias', async () => {
  const fake = await worker.fetch(new Request(`${API}/api/ac/clip`, { method: 'POST', body: JSON.stringify({ frames: [JPEG(1)] }) }), env, ctx);
  assert.equal(fake.status, 401);
  // lixo não vira quadro; a gravação abre vazia
  const empty = await server('/api/ac/clip', { player: 'x', reason: 'y', frames: ['nada'] });
  assert.equal(empty.json.frames, 0);
  assert.equal((await server('/api/ac/frames', { id: '0'.repeat(32), frames: [JPEG(1)] })).status, 404);
  assert.equal((await pub('/api/ac/clip/' + '0'.repeat(32))).status, 404);
  const r = await server('/api/ac/clip', { player: 'x', reason: 'y', frames: [JPEG(1)] });
  advance(15 * 86400);
  await worker.scheduled({}, env, { waitUntil: (p) => p });
  await new Promise((res) => setTimeout(res, 20));
  assert.equal((await pub(`/api/ac/clip/${r.json.id}`)).status, 404);
});

test('ac: quadros chegam em lotes e entram na ordem; gravação velha não aceita mais', async () => {
  const c = await server('/api/ac/clip', { player: 'Lote', reason: 'Fly', fps: 4 });
  assert.equal(c.json.frames, 0);
  assert.equal((await server('/api/ac/frames', { id: c.json.id, frames: [JPEG(10), JPEG(11)] })).json.frames, 2);
  assert.equal((await server('/api/ac/frames', { id: c.json.id, frames: [JPEG(12), 'lixo'] })).json.frames, 3);
  const meta = (await pub(`/api/ac/clip/${c.json.id}`)).json;
  assert.equal(meta.frames, 3);
  assert.equal(meta.fps, 4);
  const img = await worker.fetch(new Request(`${API}/api/ac/clip/${c.json.id}/2.jpg`), env, ctx);
  assert.equal(new Uint8Array(await img.arrayBuffer())[4], 12);
  advance(2 * 3600);
  assert.equal((await server('/api/ac/frames', { id: c.json.id, frames: [JPEG(13)] })).status, 404);
});
