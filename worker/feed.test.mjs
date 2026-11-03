// node --test worker/  — feed do Discord no site: /site feed (só admin), cron de 10 min que relê as 30 últimas
// mensagens de cada canal, apaga as que sumiram e serve GET /api/feed. D1 = SQLite real, Discord simulado.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './waitlist.js';
import { handleSiteCommand, feedCron, FEED_COMMAND, isSiteInteraction } from './feed/service.js';
import { ALL_COMMANDS } from './recruit/register.js';

const dir = new URL('./migrations/', import.meta.url);
const MIGRATION = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  runSync() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes) } }; }
  async run() { return this.runSync(); }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
}
class FakeD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(MIGRATION); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) { this.db.exec('BEGIN'); try { const o = stmts.map((s) => s.runSync()); this.db.exec('COMMIT'); return o; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  rows(sql, ...a) { return this.db.prepare(sql).all(...a); }
}

const REAL_NOW = Date.now;
let clock;
const advance = (sec) => { clock += sec * 1000; };
const TOKEN = 'token-secreto-do-bot';
const GUILD = '1560345146703482890';
const ANUNCIOS = '300000000000000001';
const MIDIA = '300000000000000002';
const ADMIN = { user: { id: '200000000000000001' }, roles: ['900000000000000001'] };
const USER = { user: { id: '200000000000000002' }, roles: [] };
const AUTHOR_ID = '400000000000000077';
const SITE = 'https://havokrust.xyz';

// Discord simulado: cada canal é uma lista de mensagens (mais nova no fim); o GET devolve as 30 mais novas, mais nova primeiro
let channels, calls, rate, pending, env;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await Promise.all(pending.splice(0)); };
const snow = (n) => String(((BigInt(Date.UTC(2026, 10, 1)) - 1420070400000n + BigInt(n) * 60000n) << 22n));
const msg = (n, extra = {}) => ({
  id: snow(n), type: 0, channel_id: ANUNCIOS, content: `mensagem ${n} para <@${AUTHOR_ID}>`, timestamp: new Date(Date.UTC(2026, 10, 1) + n * 60000).toISOString(), edited_timestamp: null,
  author: { id: AUTHOR_ID, username: 'kp1tal', global_name: 'Kapital', avatar: 'b'.repeat(32) },
  mentions: [{ id: AUTHOR_ID, username: 'kp1tal', global_name: 'Kapital' }],
  embeds: [], attachments: [], ...extra,
});

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const path = u.replace('https://discord.com/api/v10', '');
  calls.push({ method: init.method || 'GET', path, auth: init.headers && init.headers.Authorization, body: init.body ? JSON.parse(init.body) : undefined });
  const m = path.match(/^\/channels\/(\d+)\/messages\?limit=30$/);
  if (m) {
    if (rate) return new Response(JSON.stringify({ retry_after: rate, global: false }), { status: 429, headers: { 'Retry-After': String(rate) } });
    if (!channels[m[1]]) return new Response('{"message":"Missing Access"}', { status: 403 });
    return new Response(JSON.stringify(channels[m[1]].slice(-30).reverse()), { status: 200 });
  }
  return new Response(JSON.stringify({ id: '700000000000000001' }), { status: 200 });
};

const cmd = async (member, sub, options = []) => {
  const res = await handleSiteCommand(env, {
    id: String(Math.random()), type: 2, guild_id: GUILD, channel_id: ANUNCIOS, member, application_id: '1', token: 'tok',
    data: { name: 'site', options: [{ type: 2, name: 'feed', options: [{ type: 1, name: sub, options }] }] },
  }, ctx, { isAdmin: (e, mem) => (mem.roles || []).includes('900000000000000001') });
  const body = await res.json();
  await flush();
  // resposta adiada (type 5): o texto vai no PATCH do @original
  if (body.type === 5) return calls.filter((c) => c.path.includes('/messages/@original')).pop().body.content;
  return body.data.content;
};
const add = (channel, tab) => cmd(ADMIN, 'adicionar', [{ name: 'canal', type: 7, value: channel }, { name: 'aba', type: 3, value: tab }]);
const feed = async (qs, origin = SITE) => {
  const res = await worker.fetch(new Request(`https://havok-waitlist.havokrust.workers.dev/api/feed${qs}`, { headers: origin ? { Origin: origin } : {} }), env, ctx);
  return { status: res.status, headers: res.headers, text: await res.text() };
};
const posts = () => env.DB.rows('SELECT * FROM discord_posts ORDER BY created_at');

beforeEach(() => {
  clock = Date.UTC(2026, 10, 3, 12);
  Date.now = () => clock;
  env = { DB: new FakeD1(), DISCORD_BOT_TOKEN: TOKEN, GUILD_ID: GUILD, ALLOWED_ORIGINS: SITE, DISCORD_APPLICATION_ID: '1' };
  channels = { [ANUNCIOS]: [], [MIDIA]: [] };
  calls = []; rate = 0; pending = [];
});
afterEach(() => { Date.now = REAL_NOW; });

test('/site feed: só admin mexe; comando registrado junto com os outros', async () => {
  assert.match(await add(ANUNCIOS, 'anuncios').then(() => cmd(USER, 'adicionar', [{ name: 'canal', type: 7, value: MIDIA }, { name: 'aba', type: 3, value: 'midia' }])), /permissão/);
  assert.match(await cmd(USER, 'listar'), /permissão/);
  assert.match(await cmd(USER, 'remover', [{ name: 'canal', type: 7, value: ANUNCIOS }]), /permissão/);
  assert.match(await cmd(USER, 'sincronizar'), /permissão/);
  const saved = JSON.parse(env.DB.rows("SELECT value FROM bot_settings WHERE key = 'feed.channels'")[0].value);
  assert.deepEqual(saved, [{ id: ANUNCIOS, tab: 'anuncios' }]);
  assert.ok(ALL_COMMANDS.includes(FEED_COMMAND));
  assert.equal(FEED_COMMAND.default_member_permissions, '8');
  assert.ok(isSiteInteraction({ type: 2, data: { name: 'site' } }));
});

test('adicionar, listar, trocar aba e remover (remover apaga as mensagens do canal)', async () => {
  assert.match(await add(ANUNCIOS, 'anuncios'), /<#300000000000000001>.*Anúncios/);
  assert.match(await add(MIDIA, 'midia'), /Mídia/);
  assert.match(await add(MIDIA, 'nada'), /Aba inválida/);
  channels[MIDIA] = [msg(1, { channel_id: MIDIA })];
  await feedCron(env);
  assert.equal(posts()[0].tab, 'midia');
  assert.match(await add(MIDIA, 'atualizacoes'), /Atualizações/);
  assert.equal(posts()[0].tab, 'atualizacoes');
  const list = await cmd(ADMIN, 'listar');
  assert.match(list, /<#300000000000000001> → Anúncios/);
  assert.match(list, /<#300000000000000002> → Atualizações/);
  assert.match(await cmd(ADMIN, 'remover', [{ name: 'canal', type: 7, value: MIDIA }]), /removido/);
  assert.equal(posts().length, 0);
  assert.match(await cmd(ADMIN, 'remover', [{ name: 'canal', type: 7, value: MIDIA }]), /não está/);
});

test('cron: grava as mensagens, só a cada 10 min; sincronizar força', async () => {
  await add(ANUNCIOS, 'anuncios');
  channels[ANUNCIOS] = [msg(1), msg(2, {
    embeds: [{ title: 'Wipe', description: 'dia 16', color: 0xff6600, image: { url: 'https://cdn.discordapp.com/x.png', proxy_url: 'https://media.discordapp.net/x.png' } }],
    attachments: [{ id: '1', filename: 'print.png', url: 'https://cdn.discordapp.com/attachments/1/2/print.png?ex=1', proxy_url: 'p', content_type: 'image/png', width: 800, height: 600, size: 10 }],
    reactions: [{ emoji: { id: null, name: '🔥' }, count: 7, me: false }, { emoji: { id: '500000000000000001', name: 'havok', animated: false }, count: 2 }],
  })];
  assert.equal(await feedCron(env), 'ok');
  assert.equal(posts().length, 2);
  const p = posts()[1];
  assert.equal(p.author_name, 'Kapital');
  assert.equal(p.content, 'mensagem 2 para @Kapital');
  assert.deepEqual(JSON.parse(p.embeds), [{ title: 'Wipe', description: 'dia 16', url: null, image: 'https://cdn.discordapp.com/x.png', color: '#ff6600' }]);
  assert.deepEqual(JSON.parse(p.attachments), [{ url: 'https://cdn.discordapp.com/attachments/1/2/print.png?ex=1', type: 'image', name: 'print.png', width: 800, height: 600 }]);
  assert.deepEqual(JSON.parse(p.reactions), [{ emoji: '🔥', url: null, count: 7 }, { emoji: 'havok', url: 'https://cdn.discordapp.com/emojis/500000000000000001.webp?size=48', count: 2 }]);
  assert.ok(calls.some((c) => c.path === `/channels/${ANUNCIOS}/messages?limit=30` && c.auth === `Bot ${TOKEN}`));

  channels[ANUNCIOS].push(msg(3));
  advance(300);
  assert.equal(await feedCron(env), 'cedo');
  assert.equal(posts().length, 2);
  assert.match(await cmd(ADMIN, 'sincronizar'), /Sincronizado/);
  assert.equal(posts().length, 3);
  advance(599);
  assert.equal(await feedCron(env), 'cedo');
  advance(1);
  assert.equal(await feedCron(env), 'ok');
});

test('cron: editada atualiza (URL do anexo renovada); apagada no Discord some; fora da janela fica', async () => {
  await add(ANUNCIOS, 'anuncios');
  // uma mensagem antiga já no banco, mais velha que a janela das 30 últimas
  for (let n = 1; n <= 35; n++) channels[ANUNCIOS].push(msg(n, { attachments: [{ url: `https://cdn/a${n}?ex=old`, filename: 'a.mp4', content_type: 'video/mp4' }] }));
  await feedCron(env);
  assert.equal(posts().length, 30);
  assert.equal(posts()[0].id, snow(6));
  env.DB.db.prepare("INSERT INTO discord_posts (id, channel_id, tab, author_name, created_at, updated_at) VALUES (?, ?, 'anuncios', 'x', 1, 1)").run(snow(2), ANUNCIOS);

  // apagam a 20, editam a 30
  channels[ANUNCIOS] = channels[ANUNCIOS].filter((m) => m.id !== snow(20));
  const i = channels[ANUNCIOS].findIndex((m) => m.id === snow(30));
  channels[ANUNCIOS][i] = msg(30, { content: 'corrigido', edited_timestamp: new Date(Date.UTC(2026, 10, 3, 11)).toISOString(), attachments: [{ url: 'https://cdn/a30?ex=new', filename: 'a.mp4', content_type: 'video/mp4' }] });
  advance(600);
  await feedCron(env);
  const ids = posts().map((p) => p.id);
  assert.ok(!ids.includes(snow(20)), 'apagada some');
  assert.ok(ids.includes(snow(5)), 'a 5 entrou na janela');
  assert.ok(ids.includes(snow(2)), 'mais velha que a janela não é apagada');
  const e = posts().find((p) => p.id === snow(30));
  assert.equal(e.content, 'corrigido');
  assert.equal(e.edited_at, Date.UTC(2026, 10, 3, 11) / 1000);
  assert.equal(JSON.parse(e.attachments)[0].url, 'https://cdn/a30?ex=new');
  assert.equal(JSON.parse(e.attachments)[0].type, 'video');

  // canal esvaziado no Discord: tudo dele some
  channels[ANUNCIOS] = [];
  advance(600);
  await feedCron(env);
  assert.equal(posts().length, 0);
});

test('429: para na hora (não apaga nada) e tenta no próximo ciclo', async () => {
  await add(ANUNCIOS, 'anuncios');
  await add(MIDIA, 'midia');
  channels[ANUNCIOS] = [msg(1)];
  await feedCron(env);
  assert.equal(posts().length, 1);
  channels[ANUNCIOS] = [];
  rate = 30;
  advance(600);
  calls = [];
  assert.equal(await feedCron(env), 'limite');
  assert.equal(calls.filter((c) => c.path.includes('/messages?')).length, 1, 'não insiste nos outros canais');
  assert.equal(posts().length, 1, 'nada apagado por causa do 429');
  rate = 0;
  calls = [];
  advance(20);
  assert.equal(await feedCron(env), 'cedo', 'ainda dentro do Retry-After');
  assert.equal(calls.length, 0);
  advance(60);
  assert.equal(await feedCron(env), 'ok');
  assert.equal(posts().length, 0);
});

test('Message Content desligado (mensagem vazia sem embed/anexo): aviso no listar', async () => {
  await add(ANUNCIOS, 'anuncios');
  channels[ANUNCIOS] = [msg(1, { content: '' }), msg(2, { content: '' })];
  await feedCron(env);
  assert.match(await cmd(ADMIN, 'listar'), /Message Content/);
  channels[ANUNCIOS] = [msg(1), msg(2)];
  advance(600);
  await feedCron(env);
  assert.doesNotMatch(await cmd(ADMIN, 'listar'), /Message Content/);
});

test('canal sem acesso: aviso no listar, os outros seguem', async () => {
  await add('300000000000000009', 'anuncios');
  await add(MIDIA, 'midia');
  channels[MIDIA] = [msg(1, { channel_id: MIDIA })];
  assert.equal(await feedCron(env), 'ok');
  assert.equal(posts().length, 1);
  assert.match(await cmd(ADMIN, 'listar'), /<#300000000000000009>.*sem acesso/);
});

test('GET /api/feed: público, por aba, mais nova primeiro, sem token nem ids de usuário, cache 60 s', async () => {
  await add(ANUNCIOS, 'anuncios');
  await add(MIDIA, 'midia');
  channels[ANUNCIOS] = [msg(1), msg(2), msg(3)];
  channels[MIDIA] = [msg(4, { channel_id: MIDIA })];
  await feedCron(env);

  const r = await feed('?tab=anuncios&limit=2');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), SITE);
  assert.match(r.headers.get('Cache-Control'), /max-age=60/);
  const body = JSON.parse(r.text);
  assert.equal(body.tab, 'anuncios');
  assert.deepEqual(body.posts.map((p) => p.id), [snow(3), snow(2)]);
  const p = body.posts[0];
  assert.equal(p.url, `https://discord.com/channels/${GUILD}/${ANUNCIOS}/${snow(3)}`);
  assert.deepEqual(p.author, { name: 'Kapital', avatar: `https://cdn.discordapp.com/avatars/${AUTHOR_ID}/${'b'.repeat(32)}.png?size=64` });
  assert.equal(p.content, 'mensagem 3 para @Kapital');
  assert.equal(p.createdAt, new Date(Date.UTC(2026, 10, 1) + 3 * 60000).toISOString());
  assert.equal(p.editedAt, null);
  assert.deepEqual(Object.keys(p).sort(), ['attachments', 'author', 'content', 'createdAt', 'editedAt', 'embeds', 'id', 'reactions', 'url']);
  assert.ok(!r.text.includes(TOKEN));
  assert.ok(!r.text.includes(`"${AUTHOR_ID}"`) && !r.text.includes(`<@${AUTHOR_ID}>`));

  assert.deepEqual(JSON.parse((await feed('?tab=midia')).text).posts.map((x) => x.id), [snow(4)]);
  assert.equal(JSON.parse((await feed('?tab=atualizacoes')).text).posts.length, 0);
  assert.equal((await feed('?tab=xyz')).status, 400);
  assert.equal(JSON.parse((await feed('?tab=anuncios&limit=999')).text).posts.length, 3);
  // outra origem: responde, mas sem liberar CORS
  assert.equal((await feed('?tab=anuncios', 'https://evil.example')).headers.get('Access-Control-Allow-Origin'), null);
  const post = await worker.fetch(new Request('https://havok-waitlist.havokrust.workers.dev/api/feed?tab=anuncios', { method: 'POST' }), env, ctx);
  assert.equal(post.status, 405);
});
