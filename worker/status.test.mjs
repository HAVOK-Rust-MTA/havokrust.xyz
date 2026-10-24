// node --test worker/  — status do servidor: lê a lista pública do MTA e edita a mensagem só quando muda. Discord simulado.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleStatus, statusCron, statusMessage } from './status/service.js';

const dir = new URL('./migrations/', import.meta.url);
const MIGRATION = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
}
class FakeD1 { constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(MIGRATION); } prepare(sql) { return new Stmt(this.db, sql); } }

let env, calls, pending, list, editStatus;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await pending.shift(); };
globalThis.fetch = async (url, init = {}) => {
  if (String(url).startsWith('https://mtasa.com/api')) return new Response(JSON.stringify(list), { status: 200 });
  const path = String(url).replace('https://discord.com/api/v10', '');
  calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined });
  if (init.method === 'PATCH' && path.startsWith('/channels/')) return new Response(JSON.stringify({ message: 'x' }), { status: editStatus });
  return new Response(JSON.stringify({ id: '700000000000000001' }), { status: 200 });
};
const srv = (players, password = 0) => [{ ip: '1.2.3.4', port: 22003, players: 9 }, { ip: '177.54.146.12', port: 22360, players, maxplayers: 85, password }];
const edits = () => calls.filter((c) => c.method === 'PATCH' && c.path.startsWith('/channels/'));

beforeEach(async () => {
  env = { DB: new FakeD1(), DISCORD_BOT_TOKEN: 'x', DISCORD_APPLICATION_ID: '1' };
  calls = []; pending = []; list = srv(3); editStatus = 200;
  await handleStatus(env, { id: String(Math.random()), type: 2, channel_id: '800000000000000001', member: { user: { id: '1' }, roles: [] }, application_id: '1', token: 't', data: { name: 'servidor' } }, ctx, { isAdmin: () => true });
  await flush();
});

test('publica com IP e jogadores; só admin', async () => {
  const post = calls.find((c) => c.method === 'POST' && c.path === '/channels/800000000000000001/messages');
  assert.match(post.body.embeds[0].description, /177\.54\.146\.12:22360/);
  assert.match(post.body.embeds[0].description, /3\/85/);
  const no = await (await handleStatus(env, { id: 'z', type: 2, member: { user: { id: '2' }, roles: [] }, data: { name: 'servidor' } }, ctx, { isAdmin: () => false })).json();
  assert.match(no.data.content, /permissão/);
});

test('edita só quando muda; offline só depois de 3 minutos fora da lista', async () => {
  assert.equal(await statusCron(env), 'igual');
  list = srv(7);
  assert.equal(await statusCron(env), 'atualizado');
  assert.match(edits().pop().body.embeds[0].description, /7\/85/);
  list = [];
  assert.equal(await statusCron(env), 'fora da lista');
  assert.equal(await statusCron(env), 'fora da lista');
  assert.equal(await statusCron(env), 'atualizado');
  assert.match(edits().pop().body.embeds[0].title, /OFFLINE/);
  list = srv(0, 1);
  await statusCron(env);
  assert.match(edits().pop().body.embeds[0].title, /FECHADO/);
});

test('mensagem apagada: para de editar', async () => {
  list = srv(5); editStatus = 404;
  assert.equal(await statusCron(env), 'mensagem apagada');
  assert.equal(await statusCron(env), 'sem painel');
});

test('barra de jogadores', () => {
  assert.match(statusMessage({}, { players: 0, max: 85, locked: false }).embeds[0].description, /^```177/);
});
