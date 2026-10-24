// node --test worker/  — tickets: botão do tipo -> formulário com motivo -> thread privada com a staff. Discord simulado.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleTicket, isTicketInteraction, panelMessage } from './tickets/service.js';

const dir = new URL('./migrations/', import.meta.url);
const MIGRATION = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
}
class FakeD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(MIGRATION); }
  prepare(sql) { return new Stmt(this.db, sql); }
}

let env, calls, pending, failThreads;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await pending.shift(); };
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace('https://discord.com/api/v10', '');
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method, path, body });
  if (path.endsWith('/threads')) {
    if (failThreads) return new Response(JSON.stringify({ message: 'Missing Permissions' }), { status: 403 });
    return new Response(JSON.stringify({ id: '900000000000000001' }), { status: 200 });
  }
  if (init.method === 'PUT') return new Response(null, { status: 204 });
  return new Response(JSON.stringify({ id: '1' }), { status: 200 });
};

const USER = { id: '400000000000000001', username: 'jogador' };
const OTHER = { id: '400000000000000002', username: 'outro' };
const STAFF = { id: '400000000000000003', username: 'staff' };
const m = (user, roles = []) => ({ user, roles });
let n = 0;
const sendModal = (kind, reason = 'Perdi meus itens no wipe', user = USER) => ({
  id: String(++n), type: 5, channel_id: '800000000000000001', member: m(user), application_id: '1', token: 't',
  data: { custom_id: `ticket:modal:${kind}`, components: [{ components: [{ custom_id: 'reason', value: reason }] }, { components: [{ custom_id: 'details', value: 'aconteceu ontem' }] }, { components: [{ custom_id: 'nick', value: 'Jogador' }] }] },
});
const button = (cid, member) => ({ id: String(++n), type: 3, channel_id: '900000000000000001', member, application_id: '1', token: 't', data: { custom_id: cid } });
const isAdmin = (_e, mem) => (mem.roles || []).includes('500000000000000001');
const last = async () => { await flush(); return calls.filter((c) => c.path.startsWith('/webhooks/')).pop().body.content; };

beforeEach(() => {
  env = { DB: new FakeD1(), STAFF_ADMIN_ROLE_IDS: '500000000000000001', DISCORD_BOT_TOKEN: 'x', DISCORD_APPLICATION_ID: '1' };
  calls = []; pending = []; failThreads = false;
});

test('reconhece só as interações de ticket', () => {
  assert.ok(isTicketInteraction({ type: 3, data: { custom_id: 'ticket:menu' } }));
  assert.ok(isTicketInteraction({ type: 2, data: { name: 'tickets' } }));
  assert.ok(!isTicketInteraction({ type: 3, data: { custom_id: 'report:open' } }));
});

test('painel tem o menu com as categorias, Limpar seleção e o banner', () => {
  const p = panelMessage({ SITE_URL: 'https://havokrust.xyz' });
  const sel = p.components[0].components[0];
  assert.equal(sel.type, 3);
  assert.deepEqual(sel.options.map((o) => o.value), ['suporte', 'vip', 'sugestao', 'bug', 'limpar']);
  assert.equal(p.embeds[0].image.url, 'https://havokrust.xyz/og.jpg');
  for (const k of ['suporte', 'vip', 'sugestao', 'bug']) {
    const md = sel.options.find((o) => o.value === k);
    assert.ok(md.label.length <= 100 && md.description.length <= 100);
  }
});

const pick = (value, member) => ({ ...button('ticket:menu', member), data: { custom_id: 'ticket:menu', component_type: 3, values: [value] } });
test('menu abre formulário com motivo obrigatório; Limpar só reseta; categoria inventada é recusada', async () => {
  const res = await (await handleTicket(env, pick('vip', m(USER)), ctx, { isAdmin })).json();
  assert.equal(res.type, 9);
  assert.equal(res.data.custom_id, 'ticket:modal:vip');
  assert.equal(res.data.components[0].components[0].required, true);
  for (const row of res.data.components) assert.ok(row.components[0].label.length <= 45);
  const clear = await (await handleTicket(env, pick('limpar', m(USER)), ctx, { isAdmin })).json();
  assert.equal(clear.type, 7);
  assert.equal(clear.data.components[0].components[0].custom_id, 'ticket:menu');
  const bad = await (await handleTicket(env, pick('hack', m(USER)), ctx, { isAdmin })).json();
  assert.equal(bad.type, 4);
});

test('abre thread privada com quem abriu e a staff; 1 aberto por tipo', async () => {
  await handleTicket(env, sendModal('suporte'), ctx, { isAdmin });
  assert.match(await last(), /Ticket aberto: <#900000000000000001>/);
  const th = calls.find((c) => c.path.endsWith('/threads'));
  assert.equal(th.body.type, 12);
  assert.ok(calls.some((c) => c.method === 'PUT' && c.path.endsWith(`/thread-members/${USER.id}`)));
  const msg = calls.find((c) => c.path === '/channels/900000000000000001/messages').body;
  assert.match(msg.content, /<@&500000000000000001>/);
  assert.match(msg.embeds[0].description, /Perdi meus itens no wipe/);
  await handleTicket(env, sendModal('suporte'), ctx, { isAdmin });
  assert.match(await last(), /já tem um ticket de Suporte aberto/);
  await handleTicket(env, sendModal('bug', 'O carro some ao relogar'), ctx, { isAdmin });
  assert.match(await last(), /Ticket aberto/);
});

test('falha ao criar a thread não deixa ticket preso', async () => {
  failThreads = true;
  await handleTicket(env, sendModal('suporte'), ctx, { isAdmin });
  assert.match(await last(), /não tem permissão/);
  assert.equal(env.DB.db.prepare('SELECT COUNT(*) c FROM tickets').get().c, 0);
});

test('só staff assume; fechar: quem abriu ou staff, uma vez só', async () => {
  await handleTicket(env, sendModal('vip', 'Quero comprar VIP'), ctx, { isAdmin });
  await flush();
  const id = env.DB.db.prepare('SELECT id FROM tickets').get().id;
  const nope = await (await handleTicket(env, button(`ticket:claim:${id}`, m(OTHER)), ctx, { isAdmin })).json();
  assert.match(nope.data.content, /Só a staff/);
  const ok = await (await handleTicket(env, button(`ticket:claim:${id}`, m(STAFF, ['500000000000000001'])), ctx, { isAdmin })).json();
  assert.equal(ok.type, 7);
  await handleTicket(env, button(`ticket:close:${id}`, m(OTHER)), ctx, { isAdmin });
  assert.match(await last(), /Só quem abriu ou a staff/);
  await handleTicket(env, button(`ticket:close:${id}`, m(USER)), ctx, { isAdmin });
  assert.match(await last(), /fechado/);
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body && c.body.locked === true));
  await handleTicket(env, button(`ticket:close:${id}`, m(STAFF, ['500000000000000001'])), ctx, { isAdmin });
  assert.match(await last(), /já foi fechado/);
  // fechado libera abrir outro do mesmo tipo
  await handleTicket(env, sendModal('vip', 'Outra compra'), ctx, { isAdmin });
  assert.match(await last(), /Ticket aberto/);
});

test('/tickets painel só para admin', async () => {
  const res = await (await handleTicket(env, { id: String(++n), type: 2, channel_id: '8', member: m(USER), data: { name: 'tickets' } }, ctx, { isAdmin })).json();
  assert.match(res.data.content, /permissão/);
});
