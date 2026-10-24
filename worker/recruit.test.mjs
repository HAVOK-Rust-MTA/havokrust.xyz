// node --test worker/  — recrutamento da staff: D1 simulado com SQLite de verdade (node:sqlite) rodando a migration,
// assinatura Ed25519 de verdade e a API do Discord simulada (nenhum token real, nada sai da máquina).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './waitlist.js';
import { recruitCron } from './recruit/interactions.js';
import { QUESTIONS } from './recruit/config.js';
import { modal1, modal2, reviewMessages } from './recruit/views.js';
import { STAFF_COMMAND } from './recruit/commands.js';
import { _resetEmojis } from './recruit/emojis.js';
import { _resetCommands } from './recruit/register.js';

// //------------------- D1 simulado -------------------\\
const MIGRATION = ['0001_recruitment.sql', '0002_bot_settings.sql', '0003_wipe.sql'].map((f) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8')).join('\n');
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  runSync() {
    const r = this.db.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async run() { return this.runSync(); }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { success: true, results: this.db.prepare(this.sql).all(...this.args), meta: {} }; }
}
class FakeD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec(MIGRATION); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) { // o D1 roda batch como transação
    this.db.exec('BEGIN');
    try {
      const out = stmts.map((s) => s.runSync());
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  row(sql, ...a) { return this.db.prepare(sql).get(...a); }
  rows(sql, ...a) { return this.db.prepare(sql).all(...a); }
}

// //------------------- Discord simulado -------------------\\
const GUILD = '100000000000000001';
const REVIEW = '100000000000000002';
const PANEL_CH = '100000000000000003';
const ADMIN_ROLE = '100000000000000004';
const APP_ID = '100000000000000005';
const ADMIN1 = '200000000000000001';
const ADMIN2 = '200000000000000002';
const NOBODY = '200000000000000009';
const userId = (n) => `30000000000000${String(n).padStart(4, '0')}`;

let keys, publicHex, env, calls, fail, nextMsg, pending, seq, emojiList;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await Promise.all(pending.splice(0)); };

// lista de espera simulada: membros com cargos, cargos do servidor e a mensagem de status do webhook
let wl;
const WL_ROLE = '100000000000000099';
const resetWaitlist = () => {
  wl = {
    members: new Map(),
    roles: [
      { id: GUILD, name: '@everyone', position: 0, permissions: '0' },
      { id: WL_ROLE, name: 'Waiting List', position: 1, permissions: '0' },
      { id: '100000000000000098', name: 'HAVOK bot', position: 5, permissions: String(1 << 28) },
    ],
    botRoles: ['100000000000000098'],
    status: { id: '400000000000000000', channel_id: PANEL_CH, embeds: [] },
    deleted: new Set(),
    msgs: new Map(),
    statusDeleted: false,
  };
};
const wlMember = (id, roles = [], joined = '2026-10-01') => {
  wl.members.set(id, { user: { id, username: `u${id.slice(-4)}`, global_name: `Sobrevivente ${id.slice(-4)}` }, roles: [...roles], joined_at: joined });
  return wl.members.get(id);
};

globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace('https://discord.com/api/v10', '').replace('https://discord.com/api', '');
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method || 'GET', path, body, auth: init.headers && init.headers.Authorization });
  const f = fail.find((x) => x.method === (init.method || 'GET') && x.match.test(path));
  if (f) {
    if (f.times !== undefined && --f.times <= 0) fail.splice(fail.indexOf(f), 1);
    return new Response(JSON.stringify({ message: 'fail', retry_after: 0 }), { status: f.status });
  }
  let m;
  if ((init.method === 'POST') && (m = path.match(/^\/channels\/(\d+)\/messages$/))) {
    const id = String(++nextMsg);
    wl.msgs.set(id, { id, channel_id: m[1], ...body });
    return Response.json({ id });
  }
  if (init.method === 'PATCH' && (m = path.match(/^\/channels\/\d+\/messages\/(\d+)$/)) && wl.msgs.has(m[1])) {
    Object.assign(wl.msgs.get(m[1]), body);
    return Response.json(wl.msgs.get(m[1]));
  }
  if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/)) && init.method === 'PUT') {
    const mem = wl.members.get(m[1]);
    if (mem && !mem.roles.includes(m[2])) mem.roles.push(m[2]);
    return new Response(null, { status: 204 });
  }
  if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)$/))) {
    if (m[1] === APP_ID) return Response.json({ user: { id: APP_ID, bot: true }, roles: wl.botRoles });
    return wl.members.has(m[1]) ? Response.json(wl.members.get(m[1])) : new Response('{}', { status: 404 });
  }
  if (/^\/guilds\/\d+\/members\?/.test(path)) return Response.json([...wl.members.values()]);
  if (/^\/guilds\/\d+\/roles$/.test(path)) return Response.json(wl.roles);
  if (/^\/webhooks\/1\/SECRET\/messages\/\d+$/.test(path)) {
    if (init.method === 'PATCH') wl.status.embeds = body.embeds;
    if (init.method === 'DELETE') { wl.statusDeleted = true; return new Response(null, { status: 204 }); }
    return wl.statusDeleted ? new Response('{}', { status: 404 }) : Response.json(wl.status);
  }
  if ((m = path.match(/^\/channels\/\d+\/messages\/(\d+)$/)) && (init.method || 'GET') === 'GET') {
    return wl.deleted.has(m[1]) ? new Response('{}', { status: 404 }) : Response.json(wl.msgs.get(m[1]) || { id: m[1] });
  }
  if (init.method === 'DELETE' && (m = path.match(/\/messages\/(\d+)$/))) wl.deleted.add(m[1]);
  if (/\/guilds\/\d+\/emojis$/.test(path)) return Response.json(emojiList || []);
  if (init.method === 'DELETE') return new Response(null, { status: 204 });
  return Response.json({ id: '1' });
};

const hex = (buf) => Buffer.from(buf).toString('hex');
async function signed(payload, { tamper = false, age = 0, key = keys.privateKey } = {}) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000) - age);
  const sig = new Uint8Array(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(timestamp + body)));
  return new Request('https://havok-waitlist.example.workers.dev/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': hex(sig), 'X-Signature-Timestamp': timestamp },
    body: tamper ? body.replace('"type"', '"type" ') : body,
  });
}
const member = (id, roles = []) => ({ user: { id, username: `user${id.slice(-4)}`, global_name: `Jogador ${id.slice(-4)}` }, roles });
const base = (type, who, extra = {}) => ({ id: String(++seq), type, application_id: APP_ID, token: `tok${seq}`, guild_id: GUILD, channel_id: PANEL_CH, member: who, ...extra });
const admin = (id = ADMIN1) => member(id, [ADMIN_ROLE]);

async function send(payload) {
  const res = await worker.fetch(await signed(payload), env, ctx);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* texto */ }
  return { status: res.status, json, text };
}
const command = (who, sub, options = []) => send(base(2, who, { data: { name: 'staff', options: [{ type: 1, name: sub, options }] } }));
const click = (who, custom_id, message = { id: '999' }) => send(base(3, who, { data: { custom_id, component_type: 2 }, message }));
const submit = (who, custom_id, values, message = { id: '998' }) =>
  send(base(5, who, { data: { custom_id, components: Object.entries(values).map(([k, v]) => ({ type: 1, components: [{ type: 4, custom_id: k, value: v }] })) }, message }));

const ANSWERS = {
  q1: 'Kpital_BR', q2: '18 a 24 anos', q3: 'Umas três horas por dia, das 19h às 22h.',
  q4: 'Quero ajudar a manter o servidor justo e divertido para todo mundo.',
  q5: 'Peço calma, aviso que vou observar o jogador e não puno sem provas.',
  q6: 'Aplico a mesma regra que aplicaria a qualquer outro jogador, sem exceção.',
  q7: 'Fui moderador de um servidor de SA-MP por um ano, cuidando de denúncias.',
};
const step1 = (a = ANSWERS) => ({ q1: a.q1, q2: a.q2, q3: a.q3, q4: a.q4 });
const step2 = (a = ANSWERS) => ({ q5: a.q5, q6: a.q6, q7: a.q7 });
const sessionFrom = (r) => r.json.data.components[0].components[0].custom_id.split(':')[2];

// candidatura completa: botão -> começar -> etapa 1 -> continuar -> etapa 2
async function apply(who, answers = ANSWERS) {
  await click(who, 'recruit:apply');
  await click(who, 'recruit:start');
  const r1 = await submit(who, 'recruit:m1', step1(answers));
  const session = sessionFrom(r1);
  await click(who, `recruit:continue:${session}`);
  const r2 = await submit(who, `recruit:m2:${session}`, step2(answers));
  await flush();
  return r2;
}
const appIdOf = (uid) => env.DB.row('SELECT id FROM staff_applications WHERE user_id = ?', uid).id;
const reply = (r) => (r.json.data && r.json.data.content) || '';

async function openWithPanel() {
  await command(admin(), 'abrir');
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: PANEL_CH }]);
  await flush();
}

beforeEach(async () => {
  keys ??= await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  publicHex ??= hex(await crypto.subtle.exportKey('raw', keys.publicKey));
  env = {
    DB: new FakeD1(), DISCORD_BOT_TOKEN: 'b0t-t0k3n', DISCORD_PUBLIC_KEY: publicHex, GUILD_ID: GUILD,
    STAFF_REVIEW_CHANNEL_ID: REVIEW, STAFF_ADMIN_ROLE_IDS: ADMIN_ROLE, PUBLIC_URL: 'https://havok-waitlist.example.workers.dev', ROLE_ID: '100000000000000099', STAFF_APPROVED_ROLE_IDS: '100000000000000077,100000000000000078', ALLOWED_ORIGINS: '',
    GOAL: '125', WAITLIST_WEBHOOK: 'https://discord.com/api/webhooks/1/SECRET', WAITLIST_MESSAGE_ID: '400000000000000000',
  };
  calls = []; fail = []; nextMsg = 500000000000000000; pending = []; seq = 0; emojiList = null;
  _resetEmojis();
  resetWaitlist();
  _resetCommands();
});

// //------------------- SEGURANÇA -------------------\\
test('assinatura inválida, adulterada, velha ou ausente: 401', async () => {
  const other = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  assert.equal((await worker.fetch(await signed({ type: 1 }, { key: other.privateKey }), env, ctx)).status, 401);
  assert.equal((await worker.fetch(await signed({ type: 1 }, { tamper: true }), env, ctx)).status, 401);
  assert.equal((await worker.fetch(await signed({ type: 1 }, { age: 600 }), env, ctx)).status, 401);
  const bare = new Request('https://x/interactions', { method: 'POST', body: '{"type":1}' });
  assert.equal((await worker.fetch(bare, env, ctx)).status, 401);
  assert.equal(calls.length, 0);
});

test('PING oficial responde PONG; GET é recusado', async () => {
  const r = await send({ id: '1', type: 1, application_id: APP_ID });
  assert.deepEqual(r.json, { type: 1 });
  assert.equal((await worker.fetch(new Request('https://x/interactions'), env, ctx)).status, 405);
});

test('interação de outro servidor é recusada', async () => {
  const r = await send({ ...base(3, member(userId(1)), { data: { custom_id: 'recruit:apply' } }), guild_id: '999999999999999999' });
  assert.match(reply(r), /só funciona no servidor/);
});

test('sem D1/configuração: avisa e não quebra (lista de espera segue igual)', async () => {
  delete env.DB;
  const r = await click(member(userId(1)), 'recruit:apply');
  assert.match(reply(r), /ainda não foi configurado/);
  await recruitCron(env); // cron sem D1 não faz nada
});

test('a mesma interação reenviada não é processada duas vezes', async () => {
  await openWithPanel();
  const payload = base(3, member(userId(1)), { data: { custom_id: 'recruit:apply' }, message: { id: '1' } });
  const first = await send(payload);
  const again = await send(payload);
  assert.equal(first.json.data.embeds[0].title.includes('Candidatura'), true);
  assert.match(reply(again), /já foi processada/);
});

// //------------------- CANDIDATO -------------------\\
test('fluxo completo em duas etapas: grava, publica na análise com tudo e botões', async () => {
  await openWithPanel();
  const who = member(userId(1));
  const intro = await click(who, 'recruit:apply');
  assert.equal(intro.json.data.flags, 64);
  assert.match(intro.json.data.embeds[0].description, /Preencha as perguntas com atenção/);
  const m1 = await click(who, 'recruit:start');
  assert.equal(m1.json.type, 9);
  assert.equal(m1.json.data.components.length, 4);
  const r1 = await submit(who, 'recruit:m1', step1());
  assert.equal(r1.json.type, 7); // troca a mensagem privada pela próxima etapa
  assert.match(reply(r1), /Primeira etapa concluída/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM staff_applications').n, 0); // incompleta não aparece
  const session = sessionFrom(r1);
  const m2 = await click(who, `recruit:continue:${session}`);
  assert.equal(m2.json.type, 9);
  assert.equal(m2.json.data.components.length, 3);
  const r2 = await submit(who, `recruit:m2:${session}`, step2());
  await flush();
  assert.match(reply(r2), /enviada com sucesso/);

  const app = env.DB.row('SELECT * FROM staff_applications');
  assert.equal(app.user_id, userId(1));
  assert.equal(app.game_nick, 'Kpital_BR');
  assert.equal(app.guild_id, GUILD);
  assert.equal(app.status, 'pending');
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM application_drafts').n, 0);
  const post = calls.find((c) => c.method === 'POST' && c.path === `/channels/${REVIEW}/messages`);
  assert.ok(post, 'publicou no canal de análise');
  assert.equal(post.auth, 'Bot b0t-t0k3n');
  assert.deepEqual(post.body.allowed_mentions, { parse: [] });
  const text = JSON.stringify(post.body);
  for (const v of Object.values(ANSWERS)) assert.ok(text.includes(v), `resposta presente: ${v}`);
  assert.match(text, /PENDENTE/);
  assert.match(text, new RegExp(`<@${userId(1)}>`));
  assert.deepEqual(post.body.components[0].components.map((b) => b.custom_id), [`recruit:approve:${app.id}`, `recruit:reject:${app.id}`]);
  assert.equal(app.review_message_id, String(nextMsg));
});

test('candidatura duplicada: barrada no botão e no envio final (mesmo com duas abas)', async () => {
  await openWithPanel();
  const who = member(userId(1));
  // duas abas: as duas passam da etapa 1 antes de qualquer envio final
  const a = sessionFrom(await submit(who, 'recruit:m1', step1()));
  const b = sessionFrom(await submit(who, 'recruit:m1', step1()));
  assert.match(reply(await submit(who, `recruit:m2:${b}`, step2())), /enviada com sucesso/);
  assert.match(reply(await submit(who, `recruit:m2:${a}`, step2())), /expirou|já possui/);
  assert.match(reply(await click(who, 'recruit:apply')), /já possui uma candidatura/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM staff_applications').n, 1);
});

test('candidatura incompleta não vai para análise e expira', async () => {
  await openWithPanel();
  const who = member(userId(1));
  const session = sessionFrom(await submit(who, 'recruit:m1', step1()));
  await flush();
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM staff_applications').n, 0);
  assert.ok(!calls.some((c) => c.path === `/channels/${REVIEW}/messages`));
  env.DB.db.exec('UPDATE application_drafts SET expires_at = 0');
  assert.match(reply(await click(who, `recruit:continue:${session}`)), /expirou/);
  await recruitCron(env);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM application_drafts').n, 0);
});

test('sessão de outra pessoa ou inventada não serve', async () => {
  await openWithPanel();
  const session = sessionFrom(await submit(member(userId(1)), 'recruit:m1', step1()));
  assert.match(reply(await click(member(userId(2)), `recruit:continue:${session}`)), /expirou/);
  assert.match(reply(await submit(member(userId(2)), `recruit:m2:${session}`, step2())), /expirou/);
  assert.match(reply(await submit(member(userId(2)), 'recruit:m2:xyz', step2())), /expirou/);
});

test('respostas vazias/curtas/longas são recusadas e limpas', async () => {
  await openWithPanel();
  const who = member(userId(1));
  assert.match(reply(await submit(who, 'recruit:m1', { ...step1(), q4: 'curta' })), /vazia, curta ou longa/);
  assert.match(reply(await submit(who, 'recruit:m1', { ...step1(), q3: 'x'.repeat(301) })), /vazia, curta ou longa/);
  const r = await submit(who, 'recruit:m1', { ...step1(), q1: '  [HVK]Kp_ital\u200b  \n  **x** ' });
  const draft = env.DB.row('SELECT answers FROM application_drafts');
  assert.equal(JSON.parse(draft.answers).q1, '[HVK]Kp_ital **x**'); // guardado como escrito, sem invisíveis/quebras
  assert.match(reply(r), /Primeira etapa/);
  // no canal de análise aparece literal (sem virar negrito/link)
  const view = reviewMessages({ id: 1, process_id: 1, user_id: userId(1), username: 'a_b', game_nick: '[HVK]Kp_ital **x**', answers: ANSWERS, status: 'pending', created_at: 1 });
  const nick = view[0].embeds[0].fields.find((f) => f.name === 'Nick no jogo').value;
  assert.equal(nick, '\\[HVK\\]Kp\\_ital \\*\\*x\\*\\*');
});

test('inscrições encerradas: recusa no botão, no meio do caminho e no envio final', async () => {
  await openWithPanel();
  const who = member(userId(1));
  const session = sessionFrom(await submit(who, 'recruit:m1', step1()));
  await command(admin(), 'fechar');
  await flush();
  assert.match(reply(await click(member(userId(2)), 'recruit:apply')), /encerradas/);
  assert.match(reply(await click(who, `recruit:continue:${session}`)), /encerradas/);
  assert.match(reply(await submit(who, `recruit:m2:${session}`, step2())), /encerradas/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM staff_applications').n, 0);
  // o painel foi editado para ENCERRADAS com o botão desligado
  const edit = calls.filter((c) => c.method === 'PATCH' && c.path.startsWith(`/channels/${PANEL_CH}/messages/`)).pop();
  assert.match(JSON.stringify(edit.body.embeds[0].fields), /ENCERRADAS/);
  assert.equal(edit.body.components[0].components[0].disabled, true);
});

// //------------------- ADMINISTRAÇÃO -------------------\\
test('quem não é admin não aprova, não reprova e não usa /staff', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  const id = appIdOf(userId(1));
  // até o candidato "inventando" o botão com o custom_id certo
  assert.match(reply(await click(member(NOBODY), `recruit:approve:${id}`)), /não tem permissão/);
  assert.match(reply(await click(member(userId(1)), `recruit:reject:${id}`)), /não tem permissão/);
  assert.match(reply(await command(member(NOBODY), 'fechar')), /não tem permissão/);
  assert.equal(env.DB.row('SELECT status FROM staff_applications').status, 'pending');
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'open');
  // admin por ID explícito também vale
  env.STAFF_ADMIN_USER_IDS = NOBODY;
  assert.equal((await click(member(NOBODY), `recruit:reject:${id}`)).json.type, 7);
});

test('aprovar e reprovar: atualiza o embed, desliga os botões e registra quem decidiu', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  await apply(member(userId(2)));
  const a = await click(admin(ADMIN1), `recruit:approve:${appIdOf(userId(1))}`);
  assert.equal(a.json.type, 7);
  const ta = JSON.stringify(a.json.data);
  assert.match(ta, /APROVADO/);
  assert.match(ta, new RegExp(`Aprovado por.*<@${ADMIN1}>`));
  assert.ok(a.json.data.components[0].components.every((b) => b.disabled));
  const r = await click(admin(ADMIN2), `recruit:reject:${appIdOf(userId(2))}`);
  assert.match(JSON.stringify(r.json.data), new RegExp(`REPROVADO.*Reprovado por.*<@${ADMIN2}>`));
  const rows = env.DB.rows('SELECT status, decided_by, decided_at FROM staff_applications ORDER BY id');
  assert.deepEqual(rows.map((x) => [x.status, x.decided_by]), [['approved', ADMIN1], ['rejected', ADMIN2]]);
  assert.ok(rows.every((x) => x.decided_at > 0));
  // idempotente: clicar de novo não muda nada
  assert.match(reply(await click(admin(ADMIN2), `recruit:reject:${appIdOf(userId(1))}`)), /já foi avaliada \(APROVADO\)/);
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM recruitment_audit_log WHERE action IN ('application_approve', 'application_reject')`).n, 2);
});

test('dois admins aprovando ao mesmo tempo a última vaga: só um consegue', async () => {
  await openWithPanel();
  for (const n of [1, 2, 3]) await apply(member(userId(n)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  const [x, y] = await Promise.all([
    click(admin(ADMIN1), `recruit:approve:${appIdOf(userId(2))}`),
    click(admin(ADMIN2), `recruit:approve:${appIdOf(userId(3))}`),
  ]);
  await flush();
  assert.equal([x, y].filter((r) => r.json.type === 7).length, 1);
  assert.match(reply([x, y].find((r) => r.json.type !== 7)), /duas vagas disponíveis foram preenchidas/);
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM staff_applications WHERE status = 'approved'`).n, 2);
});

test('mesma candidatura aprovada por dois admins ao mesmo tempo: uma decisão só', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  const id = appIdOf(userId(1));
  const rs = await Promise.all([click(admin(ADMIN1), `recruit:approve:${id}`), click(admin(ADMIN2), `recruit:approve:${id}`)]);
  assert.equal(rs.filter((r) => r.json.type === 7).length, 1);
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM recruitment_audit_log WHERE action = 'application_approve'`).n, 1);
});

test('segunda aprovação encerra tudo; terceira é impossível (nem forçando no banco)', async () => {
  await openWithPanel();
  for (const n of [1, 2, 3]) await apply(member(userId(n)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await click(admin(), `recruit:approve:${appIdOf(userId(2))}`);
  await flush();
  const proc = env.DB.row('SELECT * FROM recruitment_processes');
  assert.equal(proc.status, 'filled');
  assert.equal(proc.panel_dirty, 0);
  // painel público: encerrado, botão desligado, 00 vagas
  const edit = calls.filter((c) => c.method === 'PATCH' && c.path === `/channels/${PANEL_CH}/messages/${proc.panel_message_id}`).pop();
  assert.match(JSON.stringify(edit.body.embeds[0].fields), /ENCERRADAS/);
  assert.match(edit.body.embeds[0].fields[1].value, /^⬛⬛\n```\n0\/2\n```$/);
  assert.match(edit.body.embeds[0].image.url, /\/recruit\/banner-closed\.jpg\?v=\d+$/);
  assert.equal(edit.body.components[0].components[0].disabled, true);
  // aviso no canal de análise
  assert.ok(calls.some((c) => c.method === 'POST' && c.path === `/channels/${REVIEW}/messages` && /vagas disponíveis foram preenchidas/.test(c.body.content || '')));
  // terceira aprovação: recusada
  assert.match(reply(await click(admin(), `recruit:approve:${appIdOf(userId(3))}`)), /preenchidas/);
  // nova inscrição: recusada
  assert.match(reply(await click(member(userId(4)), 'recruit:apply')), /preenchidas/);
  // nem uma escrita direta no banco passa do limite (trigger)
  assert.throws(() => env.DB.db.prepare(`UPDATE staff_applications SET status = 'approved' WHERE user_id = ?`).run(userId(3)), /slots_full/);
  // reprovar a que sobrou continua permitido
  assert.equal((await click(admin(), `recruit:reject:${appIdOf(userId(3))}`)).json.type, 7);
});

test('reabrir: só o mesmo processo, sem mexer no limite; preenchido não reabre', async () => {
  await openWithPanel();
  await command(admin(), 'fechar');
  await flush();
  const r = await command(admin(), 'reabrir');
  await flush();
  assert.equal(r.json.type, 5); // resposta adiada
  const followups = () => calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).map((c) => c.body.content);
  assert.match(followups().pop(), /Inscrições reabertas/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM recruitment_processes').n, 1);
  assert.equal(env.DB.row('SELECT max_slots FROM recruitment_processes').max_slots, 2);

  await apply(member(userId(1)));
  await apply(member(userId(2)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await click(admin(), `recruit:approve:${appIdOf(userId(2))}`);
  await flush();
  await command(admin(), 'reabrir');
  await flush();
  assert.match(followups().pop(), /não pode ser reaberto/);
  await command(admin(), 'abrir');
  await flush();
  assert.match(followups().pop(), /abrir novo:true/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM recruitment_processes').n, 1); // nada criado por acidente
  // o token da interação não vaza nos logs de erro
  assert.ok(calls.every((c) => !c.path.includes('/webhooks/') || c.auth === undefined));
});

test('desfazer decisão errada: volta a pendente, processo preenchido fica fechado, tudo auditado', async () => {
  await openWithPanel();
  for (const n of [1, 2, 3]) await apply(member(userId(n)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await click(admin(), `recruit:approve:${appIdOf(userId(2))}`);
  await flush();
  await command(admin(ADMIN2), 'desfazer', [{ type: 4, name: 'numero', value: appIdOf(userId(2)) }, { type: 3, name: 'motivo', value: 'Aprovado por engano' }]);
  await flush();
  assert.equal(env.DB.row('SELECT status FROM staff_applications WHERE user_id = ?', userId(2)).status, 'pending');
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'closed');
  const log = env.DB.row(`SELECT * FROM recruitment_audit_log WHERE action = 'decision_undo'`);
  assert.equal(log.actor_id, ADMIN2);
  assert.equal(log.detail, 'Aprovado por engano');
  // a vaga liberada pode ir para outra pessoa, e o limite continua 2
  assert.equal((await click(admin(), `recruit:approve:${appIdOf(userId(3))}`)).json.type, 7);
  await flush();
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'filled');
  assert.match(reply(await click(admin(), `recruit:approve:${appIdOf(userId(2))}`)), /preenchidas/);
});

test('processo novo só com novo:true; candidatos do anterior podem se candidatar de novo', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  await command(admin(), 'fechar');
  await command(admin(), 'abrir', [{ type: 5, name: 'novo', value: true }]);
  await flush();
  const procs = env.DB.rows('SELECT id, status, panel_message_id FROM recruitment_processes ORDER BY id');
  assert.deepEqual(procs.map((p) => p.status), ['closed', 'open']);
  assert.equal(procs[1].panel_message_id, procs[0].panel_message_id); // o painel continua o mesmo
  assert.match((await apply(member(userId(1)))).json.data.content, /enviada com sucesso/);
});

// //------------------- FALHAS DO DISCORD -------------------\\
test('Discord fora ao publicar a candidatura: fica salva e o cron publica depois (uma vez só)', async () => {
  await openWithPanel();
  fail.push({ method: 'POST', match: new RegExp(`/channels/${REVIEW}/messages$`), status: 500 });
  const r = await apply(member(userId(1)));
  assert.match(reply(r), /enviada com sucesso/); // o candidato não perde nada
  const app = env.DB.row('SELECT * FROM staff_applications');
  assert.equal(app.review_message_id, null);
  fail.length = 0;
  const before = calls.length;
  await recruitCron(env);
  await recruitCron(env); // a segunda rodada não publica de novo
  const posts = calls.slice(before).filter((c) => c.method === 'POST' && c.path === `/channels/${REVIEW}/messages` && c.body.components);
  assert.equal(posts.length, 1);
  assert.equal(env.DB.row('SELECT review_message_id FROM staff_applications').review_message_id, String(nextMsg));
});

test('Discord fora ao editar o painel: o banco fica certo e o cron sincroniza', async () => {
  await openWithPanel();
  fail.push({ method: 'PATCH', match: new RegExp(`/channels/${PANEL_CH}/messages/`), status: 503 });
  await command(admin(), 'fechar');
  await flush();
  let proc = env.DB.row('SELECT * FROM recruitment_processes');
  assert.equal(proc.status, 'closed');
  assert.equal(proc.panel_dirty, 1);
  fail.length = 0;
  await recruitCron(env);
  proc = env.DB.row('SELECT * FROM recruitment_processes');
  assert.equal(proc.panel_dirty, 0);
});

test('429 do Discord: espera o retry_after e tenta de novo', async () => {
  await openWithPanel();
  fail.push({ method: 'POST', match: new RegExp(`/channels/${REVIEW}/messages$`), status: 429, times: 1 });
  await apply(member(userId(1)));
  assert.notEqual(env.DB.row('SELECT review_message_id FROM staff_applications').review_message_id, null);
});

test('painel: publica, sincroniza no mesmo canal e muda de canal apagando o antigo', async () => {
  await command(admin(), 'abrir');
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: PANEL_CH }]);
  await flush();
  const first = env.DB.row('SELECT panel_message_id FROM recruitment_processes').panel_message_id;
  const post = calls.find((c) => c.method === 'POST' && c.path === `/channels/${PANEL_CH}/messages`);
  assert.match(post.body.embeds[0].title, /PROCESSO SELETIVO/);
  assert.match(post.body.embeds[0].author.name, /HAVOK RUST/);
  assert.match(JSON.stringify(post.body.embeds[0].fields), /ABERTAS/);
  assert.match(post.body.embeds[0].fields[1].value, /^🟧🟧\n```\n2\/2\n```$/);
  assert.equal(post.body.embeds[0].image.url, 'https://havok-waitlist.example.workers.dev/recruit/banner-open.jpg?v=1');
  assert.equal(post.body.components[0].components[0].label, 'Candidatar-se à Staff');
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: PANEL_CH }]);
  await flush();
  assert.equal(env.DB.row('SELECT panel_message_id FROM recruitment_processes').panel_message_id, first);
  const OTHER = '100000000000000077';
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: OTHER }]);
  await flush();
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.path === `/channels/${PANEL_CH}/messages/${first}`));
  assert.equal(env.DB.row('SELECT panel_channel_id FROM recruitment_processes').panel_channel_id, OTHER);
});

test('/staff status mostra abertas/fechadas, candidaturas, aprovados e vagas', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await command(admin(), 'status');
  await flush();
  const text = calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content;
  assert.match(text, /ABERTAS/);
  assert.match(text, /Candidaturas: \*\*1\*\*/);
  assert.match(text, /1\/2\*\* aprovadas · restam \*\*1\*\*/);
});

// //------------------- LIMITES DO DISCORD -------------------\\
test('formulários e mensagens dentro dos limites do Discord', () => {
  for (const m of [modal1(), modal2('a'.repeat(32))]) {
    assert.ok(m.title.length <= 45);
    assert.ok(m.components.length <= 5);
    assert.ok(m.custom_id.length <= 100);
    for (const r of m.components) {
      const c = r.components[0];
      assert.ok(c.label.length <= 45, c.label);
      assert.ok(!c.placeholder || c.placeholder.length <= 100, c.placeholder);
      assert.ok(c.max_length <= 4000);
    }
  }
  const big = Object.fromEntries(Object.entries(QUESTIONS).map(([k, q]) => [k, 'x'.repeat(q.max)]));
  const msgs = reviewMessages({ id: 1, process_id: 1, user_id: userId(1), username: 'u'.repeat(32), display_name: 'd'.repeat(32), game_nick: 'n'.repeat(32), answers: big, status: 'approved', created_at: 1, decided_by: ADMIN1, decided_at: 2 });
  for (const m of msgs) {
    const e = m.embeds[0];
    const total = e.title.length + (e.footer ? e.footer.text.length : 0) + e.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
    assert.ok(total <= 6000, `embed com ${total}`);
    assert.ok(e.fields.length <= 25);
    for (const f of e.fields) assert.ok(f.value.length <= 1024 && f.name.length <= 256);
  }
  assert.ok(msgs[0].components);
  assert.ok(STAFF_COMMAND.options.every((o) => o.description.length <= 100));
});

test('/staff painel num canal sem permissão explica o que falta', async () => {
  await command(admin(), 'abrir');
  fail.push({ method: 'POST', match: new RegExp(`/channels/${PANEL_CH}/messages$`), status: 403 });
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: PANEL_CH }]);
  await flush();
  const text = calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content;
  assert.match(text, /não tem permissão nesse canal/);
});

test('banners servidos pelo Worker são JPEG; nome desconhecido dá 404', async () => {
  for (const name of ['banner-open.jpg', 'banner-closed.jpg']) {
    const res = await worker.fetch(new Request(`https://x/recruit/${name}?v=1`), env, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xff, 0xd8, 0xff]);
  }
  assert.equal((await worker.fetch(new Request('https://x/recruit/../waitlist.js'), env, ctx)).status, 404);
  assert.equal((await worker.fetch(new Request('https://x/recruit/toString'), env, ctx)).status, 404);
});

test('cada aprovação atualiza as vagas do painel; desfazer devolve a vaga', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  const panelEdits = () => calls.filter((c) => c.method === 'PATCH' && c.path.startsWith(`/channels/${PANEL_CH}/messages/`));
  const before = panelEdits().length;
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await flush();
  const after = panelEdits();
  assert.equal(after.length, before + 1);
  assert.match(after.pop().body.embeds[0].fields[1].value, /^🟧⬛\n```\n1\/2\n```$/);
  assert.equal(env.DB.row('SELECT panel_dirty FROM recruitment_processes').panel_dirty, 0);
  // reprovar não muda as vagas: não edita o painel
  await apply(member(userId(2)));
  const n = panelEdits().length;
  await click(admin(), `recruit:reject:${appIdOf(userId(2))}`);
  await flush();
  assert.equal(panelEdits().length, n);
  await command(admin(), 'desfazer', [{ type: 4, name: 'numero', value: appIdOf(userId(1)) }, { type: 3, name: 'motivo', value: 'teste de vaga' }]);
  await flush();
  assert.match(panelEdits().pop().body.embeds[0].fields[1].value, /2\/2/);
});

test('usa os emojis do servidor quando existem (e os comuns quando não)', async () => {
  emojiList = [{ id: '700000000000000001', name: 'verified' }, { id: '700000000000000002', name: 'one' }, { id: '700000000000000003', name: 'moderator', animated: true }];
  await openWithPanel();
  const post = calls.find((c) => c.method === 'POST' && c.path === `/channels/${PANEL_CH}/messages`);
  const e = post.body.embeds[0];
  assert.match(e.description, /^<a:moderator:700000000000000003> /);
  assert.match(e.fields[2].value, /^<:verified:700000000000000001> Maturidade/);
  assert.match(e.fields[3].value, /^<:one:700000000000000002> Inscrição/);
  assert.match(e.fields[3].value, /\n2️⃣ Análise/); // :two: não existe nesta lista: usa o comum
});

test('abrir novo:true com o processo aberto: encerra o atual, abre outro e quem já se inscreveu pode de novo', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  await command(admin(), 'abrir');
  await flush();
  assert.match(calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content, /abrir novo:true/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM recruitment_processes').n, 1); // sem novo:true nada muda
  await command(admin(), 'abrir', [{ type: 5, name: 'novo', value: true }]);
  await flush();
  assert.deepEqual(env.DB.rows('SELECT status FROM recruitment_processes ORDER BY id').map((p) => p.status), ['closed', 'open']);
  assert.match(calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content, /processo #1 ficou encerrado/);
  assert.match(reply(await apply(member(userId(1)))), /enviada com sucesso/);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM staff_applications WHERE user_id = ?', userId(1)).n, 2);
  // o painel continua o mesmo e mostra o processo novo aberto, com 2 vagas
  const edit = calls.filter((c) => c.method === 'PATCH' && c.path.startsWith(`/channels/${PANEL_CH}/messages/`)).pop();
  assert.match(edit.body.embeds[0].fields[1].value, /2\/2/);
});

test('o Worker registra o /staff sozinho no cron, uma vez só por versão do comando', async () => {
  env.DISCORD_APPLICATION_ID = APP_ID;
  await recruitCron(env);
  await recruitCron(env);
  const regs = calls.filter((c) => c.method === 'POST' && c.path === `/applications/${APP_ID}/guilds/${GUILD}/commands`);
  assert.deepEqual(regs.map((r) => r.body.name), ['staff', 'waitinglist', 'wipe', 'denuncias', 'tickets', 'servidor']); // todos, uma vez só
  assert.equal(regs[0].auth, 'Bot b0t-t0k3n');
  // sem Application ID configurado: não tenta
  _resetCommands();
  delete env.DISCORD_APPLICATION_ID;
  await recruitCron(env);
  assert.equal(calls.filter((c) => c.path.endsWith('/commands')).length, 6);
});

test('vagas à escolha: abrir com N, mudar no meio, nunca abaixo dos aprovados', async () => {
  await command(admin(), 'abrir', [{ type: 4, name: 'vagas', value: 3 }]);
  await command(admin(), 'painel', [{ type: 7, name: 'canal', value: PANEL_CH }]);
  await flush();
  assert.equal(env.DB.row('SELECT max_slots FROM recruitment_processes').max_slots, 3);
  const lastPanel = () => calls.filter((c) => c.path.startsWith(`/channels/${PANEL_CH}/messages`) && c.body).pop().body.embeds[0];
  assert.match(lastPanel().fields[1].value, /^🟧🟧🟧\n```\n3\/3\n```$/);
  const lastReply = () => calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content;

  for (const n of [1, 2]) await apply(member(userId(n)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await click(admin(), `recruit:approve:${appIdOf(userId(2))}`);
  await flush();
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'open'); // 2 de 3

  await command(admin(), 'vagas', [{ type: 4, name: 'quantidade', value: 1 }]);
  await flush();
  assert.match(lastReply(), /já existem 2 aprovados/);
  assert.equal(env.DB.row('SELECT max_slots FROM recruitment_processes').max_slots, 3);

  await command(admin(), 'vagas', [{ type: 4, name: 'quantidade', value: 2 }]); // igual aos aprovados: encerra
  await flush();
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'filled');
  assert.match(lastPanel().fields[0].value, /ENCERRADAS/);

  await command(admin(), 'vagas', [{ type: 4, name: 'quantidade', value: 12 }]); // ganhou vaga: reabre
  await flush();
  assert.equal(env.DB.row('SELECT status FROM recruitment_processes').status, 'open');
  assert.match(lastReply(), /12 vagas \(2 aprovados; inscrições abertas\)/);
  assert.equal(lastPanel().fields[1].value, '```\n10/12\n```'); // mais de 10 vagas: só o número
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM recruitment_audit_log WHERE action = 'process_slots'`).n, 2);
  // o trigger respeita o novo total
  await apply(member(userId(3)));
  assert.equal((await click(admin(), `recruit:approve:${appIdOf(userId(3))}`)).json.type, 7);
});

// //------------------- LISTA DE ESPERA (painel único: fila + botão) -------------------\\
const joinClickAs = (uid, roles = []) => send(base(3, member(uid, roles), { data: { custom_id: 'waitlist:join', component_type: 2 }, message: { id: '1' } }));
const lastFollowup = () => calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content;
const wlSetup = (who = admin(), options = []) => send(base(2, who, { data: { name: 'waitinglist', options: [{ type: 1, name: 'setup', options }] } }));
const wlRefresh = (who = admin()) => send(base(2, who, { data: { name: 'waitinglist', options: [{ type: 1, name: 'refresh' }] } }));
const panelId = () => env.DB.row(`SELECT value FROM bot_settings WHERE key = 'waitlist.join.message'`)?.value;
const panel = () => wl.msgs.get(panelId());
const queueNames = () => panel().embeds[0].fields.filter((f) => /Vanguard|Pioneer|Early Survivor|Next in line/.test(f.name))
  .flatMap((f) => f.value.split('\n')).map((l) => l.match(/^`#\d+` (.+)$/)?.[1]).filter((x) => x && x !== '─');
const panelEdits = () => calls.filter((c) => c.method === 'PATCH' && c.path === `/channels/${PANEL_CH}/messages/${panelId()}`);
const name = (n) => `Sobrevivente ${userId(n).slice(-4)}`;

// fila antiga guardada no painel do webhook: 3, 1, 2 (fora da ordem de entrada no servidor, de propósito)
function legacyQueue(...ns) {
  for (const n of ns) wlMember(userId(n), [WL_ROLE], `2026-10-${String(n).padStart(2, '0')}`);
  wl.status.embeds = [{ url: `https://havokrust.xyz/?wl=${ns.map(userId).join('.')}`, fields: [] }];
}

test('setup: UMA mensagem do bot com a fila (mesma ordem do painel antigo) + convite + botão', async () => {
  legacyQueue(3, 1, 2);
  await wlSetup();
  await flush();
  const posts = calls.filter((c) => c.method === 'POST' && c.path === `/channels/${PANEL_CH}/messages`);
  assert.equal(posts.length, 1);
  const msg = panel();
  assert.equal(msg.embeds.length, 2);
  assert.match(msg.embeds[0].title, /WAITING LIST · STATUS/);
  assert.match(msg.embeds[1].description, /Só entre se você vai jogar no dia da inauguração/);
  assert.match(msg.embeds[1].description, /Only join if you will actually play on launch day/);
  assert.ok(!/BE ONE OF THE FIRST/.test(JSON.stringify(msg)));
  assert.equal(msg.components[0].components[0].custom_id, 'waitlist:join');
  assert.deepEqual(queueNames(), [name(3), name(1), name(2)]); // ninguém perdeu a posição
  assert.match(lastFollowup(), /mesma ordem de antes/);
  assert.match(lastFollowup(), /painel antigo \(webhook\) parou de ser atualizado/);
  assert.ok(!wl.statusDeleted); // o antigo só é apagado com confirmação
  // de novo: não cria outra mensagem
  await wlSetup();
  await flush();
  assert.equal(calls.filter((c) => c.method === 'POST' && c.path === `/channels/${PANEL_CH}/messages`).length, 1);
  assert.match(lastFollowup(), /já existe/);
  // com confirmação: apaga o painel antigo do webhook
  await wlSetup(admin(), [{ type: 5, name: 'apagar_antigo', value: true }]);
  await flush();
  assert.ok(wl.statusDeleted);
  assert.match(lastFollowup(), /Painel antigo \(webhook\) apagado/);
});

test('botão: primeira vez recebe o cargo, resposta bilíngue privada, entra no fim da fila', async () => {
  legacyQueue(1, 2);
  await wlSetup();
  await flush();
  wlMember(userId(100), [], '2026-09-01'); // entrou no servidor antes, mas clicou agora: vai para o fim
  const r = await joinClickAs(userId(100));
  assert.deepEqual([r.json.type, r.json.data.flags], [5, 64]);
  await flush();
  assert.ok(calls.some((c) => c.method === 'PUT' && c.path === `/guilds/${GUILD}/members/${userId(100)}/roles/${WL_ROLE}`));
  assert.match(lastFollowup(), /YOU'RE ON THE WAITING LIST![\s\S]*VOCÊ ESTÁ NA LISTA DE ESPERA!/);
  assert.deepEqual(queueNames(), [name(1), name(2), name(100)]);
  assert.equal(panel().embeds[0].fields[0].value, '**03** / 125');
});

test('botão: já inscrito não chama o Discord; dois cliques juntos dão o cargo uma vez', async () => {
  wlMember(userId(1), [WL_ROLE]);
  const before = calls.length;
  await joinClickAs(userId(1), [WL_ROLE]);
  await flush();
  assert.match(lastFollowup(), /YOU'RE ALREADY REGISTERED![\s\S]*VOCÊ JÁ ESTÁ INSCRITO!/);
  assert.ok(!calls.slice(before).some((c) => c.method === 'PUT'));
  wlMember(userId(5));
  await Promise.all([joinClickAs(userId(5)), joinClickAs(userId(5))]);
  await flush();
  assert.equal(wl.members.get(userId(5)).roles.filter((x) => x === WL_ROLE).length, 1);
  assert.ok(calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).every((c) => !/SOMETHING WENT WRONG/.test(c.body.content)));
});

test('botão: sem permissão de cargo -> erro bilíngue sem detalhe técnico e explicação no log; Discord fora -> erro', async () => {
  wlMember(userId(7));
  fail.push({ method: 'PUT', match: /\/roles\/\d+$/, status: 403 });
  const logs = [];
  const orig = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  try {
    await joinClickAs(userId(7));
    await flush();
  } finally {
    console.error = orig;
  }
  assert.match(lastFollowup(), /SOMETHING WENT WRONG![\s\S]*OCORREU UM ERRO!/);
  assert.ok(!/403|token|discord/i.test(lastFollowup()));
  assert.ok(logs.some((l) => /Gerenciar cargos/.test(l) && /ACIMA do cargo Early Survivor/.test(l)));
  fail.length = 0;
  fail.push({ method: 'PUT', match: /\/roles\/\d+$/, status: 500 });
  await joinClickAs(userId(8));
  await flush();
  assert.match(lastFollowup(), /SOMETHING WENT WRONG/);
});

test('setup avisa quando o bot não consegue dar o cargo (sem Gerenciar cargos / cargo abaixo)', async () => {
  wl.roles[2].permissions = '0';
  wl.roles[2].position = 1;
  wl.roles[1].position = 2;
  await wlSetup();
  await flush();
  assert.match(lastFollowup(), /Gerenciar cargos/);
  assert.match(lastFollowup(), /ABAIXO do cargo \*\*Waiting List\*\*/);
});

test('cron: só edita quando muda, nunca cria mensagem e não mexe mais no painel do webhook; ordem estável', async () => {
  legacyQueue(2, 1);
  await wlSetup();
  await flush();
  const { refreshWaitlist } = await import('./waitlist/join.js');
  const edits = panelEdits().length;
  const posts = calls.filter((c) => c.method === 'POST').length;
  const webhookPatches = () => calls.filter((c) => c.method === 'PATCH' && c.path.startsWith('/webhooks/1/')).length;
  const wh = webhookPatches();
  await refreshWaitlist(env);
  await refreshWaitlist(env);
  assert.equal(panelEdits().length, edits);
  wlMember(userId(3), [WL_ROLE], '2026-01-01');
  await refreshWaitlist(env);
  assert.equal(panelEdits().length, edits + 1);
  assert.deepEqual(queueNames(), [name(2), name(1), name(3)]); // a ordem guardada vale mais que a data de entrada
  assert.equal(calls.filter((c) => c.method === 'POST').length, posts);
  assert.equal(webhookPatches(), wh);
  // apagaram o painel no Discord: esquece e volta a usar o do webhook até um novo setup
  wl.deleted.add(panelId());
  assert.equal((await refreshWaitlist(env)).status, 'gone');
  assert.equal(panelId(), undefined);
});

test('faixas 1–5 / 6–10 / 11–15 / 16+ e meta de 125: 100%, 0 vagas, registrado; a lista continua aceitando', async () => {
  legacyQueue(...Array.from({ length: 130 }, (_, i) => i + 1));
  await wlSetup();
  await flush();
  const [status, join] = panel().embeds;
  const byName = Object.fromEntries(status.fields.map((f) => [f.name, f.value]));
  assert.match(byName['🔴 Vanguard'], /^`#01` .+\n[\s\S]*`#05` /);
  assert.match(byName['🟠 Pioneer'], /^`#06` /);
  assert.match(byName['🟣 Early Survivor'], /^`#11` [\s\S]*`#15` /);
  assert.match(byName['Next in line · Próximos da fila'], /^`#16` /);
  assert.equal(byName['⏳ Spots left · Vagas'], '**0**');
  assert.match(byName['Progress · Progresso'], /^(🟧){20}  \*\*100%\*\*$/);
  assert.match(join.description, /Meta alcançada/);
  assert.ok(env.DB.row(`SELECT value FROM bot_settings WHERE key = 'waitlist.goal_reached_at'`));
  wlMember(userId(500));
  await joinClickAs(userId(500));
  await flush();
  assert.match(lastFollowup(), /YOU'RE ON THE WAITING LIST/);
});

test('mural do site lê os 15 primeiros do painel novo', async () => {
  legacyQueue(4, 2, 9);
  await wlSetup();
  await flush();
  const res = await worker.fetch(new Request('https://x/waitlist/first'), env, ctx);
  const body = await res.json();
  assert.deepEqual(body.first.map((x) => x.name), [name(4), name(2), name(9)]);
});

test('/waitinglist: só admin; refresh atualiza; recrutamento continua funcionando junto', async () => {
  assert.match(reply(await wlSetup(member(NOBODY))), /não tem permissão/);
  assert.match(reply(await wlRefresh(member(NOBODY))), /não tem permissão/);
  legacyQueue(1);
  await wlSetup();
  await flush();
  await wlRefresh();
  await flush();
  assert.match(lastFollowup(), /Inscritos agora: \*\*1\*\* de 125/);
  await openWithPanel();
  assert.match(reply(await apply(member(userId(9)))), /enviada com sucesso/);
});

// //------------------- AVISO AO CANDIDATO -------------------\\
const HELPER = '100000000000000077', HELPER2 = '100000000000000078';
const dms = () => calls.filter((c) => c.method === 'POST' && c.path === '/channels/1/messages').map((c) => c.body.content);

test('aprovado: recebe o cargo de helper e uma DM; recusado: só a DM padrão', async () => {
  await openWithPanel();
  for (const n of [1, 2]) await apply(member(userId(n)));
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await click(admin(), `recruit:reject:${appIdOf(userId(2))}`);
  await flush();
  const roleCalls = calls.filter((c) => c.path.includes('/roles/'));
  assert.deepEqual(roleCalls.map((c) => [c.method, c.path]), [HELPER, HELPER2].map((r) => ['PUT', `/guilds/${GUILD}/members/${userId(1)}/roles/${r}`]));
  const opens = calls.filter((c) => c.method === 'POST' && c.path === '/users/@me/channels').map((c) => c.body.recipient_id);
  assert.deepEqual(opens, [userId(1), userId(2)]);
  const [ok, no] = dms();
  assert.match(ok, /aprovada/);
  assert.match(ok, /já recebeu seus cargos/);
  assert.match(no, /não foi aprovada/);
  // admins recebem a confirmação no canal de análise, em resposta à candidatura
  const notes = calls.filter((c) => c.method === 'POST' && c.path === `/channels/${REVIEW}/messages` && /^✅/.test(c.body.content || ''));
  assert.equal(notes.length, 2);
  assert.match(notes[0].body.content, /APROVADO: cargos dados: <@&100000000000000077> <@&100000000000000078> · DM entregue/);
  assert.match(notes[1].body.content, /REPROVADO: DM entregue/);
  assert.ok(notes[0].body.message_reference.message_id);
  assert.ok(!calls.some((c) => c.path === `/channels/${REVIEW}/messages` && /⚠️/.test(c.body.content || '')));
});

test('DM fechada e cargo sem permissão viram aviso no canal de análise', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  fail.push({ method: 'POST', match: /^\/channels\/1\/messages$/, status: 403 });
  fail.push({ method: 'PUT', match: /\/roles\//, status: 403 });
  await click(admin(), `recruit:approve:${appIdOf(userId(1))}`);
  await flush();
  const warn = calls.find((c) => c.method === 'POST' && c.path === `/channels/${REVIEW}/messages` && /⚠️/.test(c.body.content || ''));
  assert.ok(warn);
  assert.match(warn.body.content, /DM/);
  assert.match(warn.body.content, /não consegui dar <@&/);
  assert.match(warn.body.content, /staff avisar numero:/);
  assert.deepEqual(warn.body.allowed_mentions, { parse: [] });
  // a aprovação em si continua valendo
  assert.equal(env.DB.row('SELECT status FROM staff_applications').status, 'approved');
});

test('desfazer uma aprovação tira o cargo de helper', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  const id = appIdOf(userId(1));
  await click(admin(), `recruit:approve:${id}`);
  await flush();
  await command(admin(), 'desfazer', [{ type: 4, name: 'numero', value: id }, { type: 3, name: 'motivo', value: 'aprovado por engano' }]);
  await flush();
  for (const r of [HELPER, HELPER2]) assert.ok(calls.some((c) => c.method === 'DELETE' && c.path === `/guilds/${GUILD}/members/${userId(1)}/roles/${r}`));
});

test('/staff avisar repete a DM e os cargos de uma candidatura já avaliada', async () => {
  await openWithPanel();
  await apply(member(userId(1)));
  const id = appIdOf(userId(1));
  const lastFollowup = () => calls.filter((c) => c.path.startsWith(`/webhooks/${APP_ID}/`)).pop().body.content;
  await command(admin(), 'avisar', [{ type: 4, name: 'numero', value: id }]);
  await flush();
  assert.match(lastFollowup(), /pendente/);
  fail.push({ method: 'POST', match: /^\/channels\/1\/messages$/, status: 403, times: 1 });
  await click(admin(), `recruit:approve:${id}`);
  await flush();
  await command(admin(), 'avisar', [{ type: 4, name: 'numero', value: id }]);
  await flush();
  assert.match(lastFollowup(), /^✅ .*DM entregue/);
});
