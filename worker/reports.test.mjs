// node --test worker/  — denúncias: código do jogo vira ticket privado (thread) com as gravações. Discord simulado.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleReport, isReportInteraction } from './reports/service.js';

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

let env, calls, pending;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await pending.shift(); };
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace('https://discord.com/api/v10', '');
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method, path, body });
  if (path.endsWith('/threads')) return new Response(JSON.stringify({ id: '900000000000000001' }), { status: 200 });
  if (init.method === 'PUT') return new Response(null, { status: 204 });
  return new Response(JSON.stringify({ id: '1' }), { status: 200 });
};

const USER = { id: '400000000000000001', username: 'vitima' };
const member = { user: USER, roles: [] };
let n = 0;
const modal = (code, reason = 'Ele me matou atrás da parede, com a mira grudada.') => ({
  id: String(++n), type: 5, channel_id: '800000000000000001', member, application_id: '1', token: 't',
  data: { custom_id: 'report:modal', components: [{ components: [{ custom_id: 'code', value: code }] }, { components: [{ custom_id: 'reason', value: reason }] }] },
});
const last = async (res) => { await flush(); return calls.filter((c) => c.path.startsWith('/webhooks/')).pop().body.content; };
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  env = { DB: new FakeD1(), SITE_URL: 'https://havokrust.xyz', API_PUBLIC_URL: 'https://api.havokrust.xyz', STAFF_ADMIN_ROLE_IDS: '500000000000000001', DISCORD_BOT_TOKEN: 'x', DISCORD_APPLICATION_ID: '1' };
  calls = []; pending = [];
  env.DB.db.prepare('INSERT INTO ac_reports (code, created_at, expires_at, reporter, reporter_account, target, target_account, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('HV-ABCDEF', now(), now() + 86400, 'Vitima', 'SERIAL-V', 'Cheater', 'SERIAL-CHEATER', 'AK, 30 m');
  env.DB.db.prepare('INSERT INTO players (discord_id, discord_name, account, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('600000000000000001', 'cheaterzin', 'SERIAL-CHEATER', now(), now());
  env.DB.db.prepare('INSERT INTO ac_clips (id, created_at, player, reason, frames, fps, report) VALUES (?, ?, ?, ?, ?, ?, ?)').run('a'.repeat(32), now(), 'Cheater', 'Denúncia de morte', 60, 6, 'HV-ABCDEF');
});

test('reconhece só as interações de denúncia', () => {
  assert.ok(isReportInteraction({ type: 3, data: { custom_id: 'report:open' } }));
  assert.ok(isReportInteraction({ type: 2, data: { name: 'denuncias' } }));
  assert.ok(!isReportInteraction({ type: 3, data: { custom_id: 'recruit:apply' } }));
});

test('botão abre o formulário; código válido abre thread privada com a staff e as gravações, uma vez só', async () => {
  const open = await handleReport(env, { id: 'x', type: 3, member, data: { custom_id: 'report:open' } }, ctx, { isAdmin: () => false });
  assert.equal((await open.json()).type, 9);
  const msg = await last(await handleReport(env, modal('hv-abcdef'), ctx, { isAdmin: () => false }));
  assert.match(msg, /Ticket aberto: <#900000000000000001>/);
  const thread = calls.find((c) => c.path === '/channels/800000000000000001/threads');
  assert.equal(thread.body.type, 12); // privada
  assert.ok(calls.some((c) => c.method === 'PUT' && c.path === `/channels/900000000000000001/thread-members/${USER.id}`));
  const post = calls.find((c) => c.path === '/channels/900000000000000001/messages').body;
  assert.match(post.content, /<@&500000000000000001>/);
  assert.match(post.embeds[0].description, /Cheater/);
  assert.match(post.embeds[0].description, /SERIAL-CHEATER/);
  assert.match(post.embeds[0].description, /<@600000000000000001> \(cheaterzin\)/);
  assert.match(post.embeds[0].description, /SERIAL-V` · sem Discord vinculado/);
  assert.match(post.embeds[0].description, /havokrust\.xyz\/#\/ac\/a{32}/);
  assert.equal(post.embeds.length, 4); // galeria de 4 quadros
  assert.match(await last(await handleReport(env, modal('HV-ABCDEF'), ctx, { isAdmin: () => false })), /já foi usado: <#900000000000000001>/);
});

test('código inventado, com formato errado ou vencido é recusado', async () => {
  assert.match(await last(await handleReport(env, modal('HV-ZZZZZZ'), ctx, { isAdmin: () => false })), /Não achei/);
  assert.match(await last(await handleReport(env, modal('abc'), ctx, { isAdmin: () => false })), /inválido/);
  env.DB.db.prepare('UPDATE ac_reports SET expires_at = ? WHERE code = ?').run(now() - 1, 'HV-ABCDEF');
  assert.match(await last(await handleReport(env, modal('HV-ABCDEF'), ctx, { isAdmin: () => false })), /expirou/);
});

test('painel só para admin', async () => {
  const cmd = (id) => ({ id, type: 2, channel_id: '800000000000000001', member, application_id: '1', token: 't', data: { name: 'denuncias', options: [{ name: 'painel' }] } });
  const r = await handleReport(env, cmd('p1'), ctx, { isAdmin: () => false });
  assert.match((await r.json()).data.content, /permissão/);
  await last(await handleReport(env, cmd('p2'), ctx, { isAdmin: () => true }));
  assert.ok(calls.some((c) => c.path === '/channels/800000000000000001/messages' && c.body.components));
});

test('ticket tem o botão Concluir; só a staff conclui; fica guardado e a thread é arquivada e trancada', async () => {
  await last(await handleReport(env, modal('HV-ABCDEF'), ctx, { isAdmin: () => false }));
  const post = calls.find((c) => c.path === '/channels/900000000000000001/messages').body;
  assert.equal(post.components[0].components[0].custom_id, 'report:close:HV-ABCDEF');
  const btn = (id) => ({ id, type: 3, channel_id: '900000000000000001', member, application_id: '1', token: 't', data: { custom_id: 'report:close:HV-ABCDEF' } });
  const denied = await handleReport(env, btn('c1'), ctx, { isAdmin: () => false });
  assert.match((await denied.json()).data.content, /Só a staff/);
  const form = await handleReport(env, btn('c2'), ctx, { isAdmin: () => true });
  const f = await form.json();
  assert.equal(f.type, 9);
  assert.equal(f.data.custom_id, 'report:closed:HV-ABCDEF');
  const submit = (id) => ({ id, type: 5, channel_id: '900000000000000001', member, application_id: '1', token: 't',
    data: { custom_id: 'report:closed:HV-ABCDEF', components: [{ components: [{ custom_id: 'verdict', value: 'Cheater banido' }] }] } });
  assert.match(await last(await handleReport(env, submit('c3'), ctx, { isAdmin: () => true })), /concluída/);
  const row = env.DB.db.prepare('SELECT closed_at, closed_by, verdict FROM ac_reports WHERE code = ?').get('HV-ABCDEF');
  assert.ok(row.closed_at);
  assert.equal(row.closed_by, USER.id);
  assert.equal(row.verdict, 'Cheater banido');
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.path === '/channels/900000000000000001' && c.body.archived && c.body.locked));
  assert.match(await last(await handleReport(env, submit('c4'), ctx, { isAdmin: () => true })), /já foi concluída/);
});

test('painel explica onde fica o código e mostra a imagem só se for https', async () => {
  const cmd = (id) => ({ id, type: 2, channel_id: '800000000000000001', member, application_id: '1', token: 't', data: { name: 'denuncias', options: [{ name: 'painel' }] } });
  env.REPORT_HELP_IMAGE = 'https://havokrust.xyz/img/denuncia.gif';
  await last(await handleReport(env, cmd('h1'), ctx, { isAdmin: () => true }));
  const msg = calls.filter((c) => c.path === '/channels/800000000000000001/messages').pop().body;
  assert.match(msg.embeds[0].description, /F5/);
  assert.equal(msg.embeds[0].image.url, 'https://havokrust.xyz/img/denuncia.gif');
  env.REPORT_HELP_IMAGE = 'javascript:alert(1)';
  await last(await handleReport(env, cmd('h2'), ctx, { isAdmin: () => true }));
  assert.equal(calls.filter((c) => c.path === '/channels/800000000000000001/messages').pop().body.embeds[0].image, undefined);
});

test('/denuncias concluir dentro do ticket antigo abre o formulário de conclusão (só staff)', async () => {
  env.DB.db.prepare('UPDATE ac_reports SET used_at = ?, thread_id = ? WHERE code = ?').run(now(), '900000000000000009', 'HV-ABCDEF');
  const cmd = (mem, channel = '900000000000000009') => ({ id: String(++n), type: 2, channel_id: channel, member: mem, data: { name: 'denuncias', options: [{ name: 'concluir', type: 1 }] } });
  const staffMember = { user: { id: '400000000000000009', username: 'staff' }, roles: ['500000000000000001'] };
  const isStaff = (_e, mem) => (mem.roles || []).includes('500000000000000001');
  const no = await (await handleReport(env, cmd(member), ctx, { isAdmin: isStaff })).json();
  assert.match(no.data.content, /Só a staff/);
  const outside = await (await handleReport(env, cmd(staffMember, '800000000000000001'), ctx, { isAdmin: isStaff })).json();
  assert.match(outside.data.content, /dentro do ticket/);
  const ok = await (await handleReport(env, cmd(staffMember), ctx, { isAdmin: isStaff })).json();
  assert.equal(ok.type, 9);
  assert.equal(ok.data.custom_id, 'report:closed:HV-ABCDEF');
});
