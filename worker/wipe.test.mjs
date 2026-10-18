// node --test worker/  — calendário de wipe: tempo simulado (Date.now trocado), D1 = SQLite real com as migrations,
// Discord simulado, assinatura HMAC real. Nenhum wipe de verdade acontece aqui: o servidor MTA é só simulado.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './waitlist.js';
import { phaseOf, cycleView, defineWipe, applyServerEvent, currentCycle, DEFAULT_CYCLE_S } from './wipe/cycle.js';
import { wipeCron, hmacHex, parseBrasilia, syncPanel } from './wipe/service.js';
import { countdown } from './wipe/panel.js';

const MIGRATION = ['0001_recruitment.sql', '0002_bot_settings.sql', '0003_wipe.sql'].map((f) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8')).join('\n');
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
  rows(sql, ...a) { return this.db.prepare(sql).all(...a); }
}

// relógio simulado
const REAL_NOW = Date.now;
let clock;
const setNow = (unix) => { clock = unix * 1000; };
const advance = (sec) => { clock += sec * 1000; };
const T0 = parseBrasilia('2026-11-01 20:00'); // horário de Brasília -> 23:00 UTC

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const CHANNEL = '100000000000000003';
let env, calls, fail, nextMsg, pending;
const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await Promise.all(pending.splice(0)); };

globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace('https://discord.com/api/v10', '');
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method || 'GET', path, body });
  if (fail.some((f) => f.test(path))) return new Response('{}', { status: 500 });
  if (init.method === 'POST' && /\/channels\/\d+\/messages$/.test(path)) return Response.json({ id: String(++nextMsg) });
  return Response.json({ id: '1' });
};

beforeEach(() => {
  setNow(T0);
  Date.now = () => clock;
  env = { DB: new FakeD1(), DISCORD_BOT_TOKEN: 'b0t', WIPE_SECRET: SECRET, WIPE_CYCLE_SECONDS: String(DEFAULT_CYCLE_S), ALLOWED_ORIGINS: 'https://havokrust.xyz' };
  calls = []; fail = []; nextMsg = 600000000000000000; pending = [];
});
afterEach(() => { Date.now = REAL_NOW; });

const nowS = () => Math.floor(clock / 1000);
// o servidor MTA: assina e chama o Worker
async function server(method, path, payload) {
  const ts = String(nowS());
  const body = payload === undefined ? '' : JSON.stringify(payload);
  const sig = await hmacHex(SECRET, `${ts}\n${method}\n${path}\n${body}`);
  const req = new Request(`https://w.example${path}`, { method, headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': sig, 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : body });
  const res = await worker.fetch(req, env, ctx);
  await flush();
  return { status: res.status, json: await res.json() };
}
const publicStatus = async (origin = 'https://havokrust.xyz') => {
  const res = await worker.fetch(new Request('https://w.example/api/wipe/status', { headers: { Origin: origin } }), env, ctx);
  return { status: res.status, json: await res.json(), headers: res.headers };
};
async function firstCycle(days = 15) {
  const r = await defineWipe(env.DB, { at: nowS() + days * 86400, actor: 'admin1' });
  assert.ok(r.ok);
  return r.cycle;
}
async function withPanel() {
  env.DB.db.prepare(`INSERT INTO bot_settings (key, value, updated_at) VALUES ('wipe.panel.channel', ?, 0), ('wipe.panel.message', '700000000000000001', 0)`).run(CHANNEL);
}
const panelEdits = () => calls.filter((c) => c.method === 'PATCH' && c.path === `/channels/${CHANNEL}/messages/700000000000000001`);
const alerts = () => calls.filter((c) => c.method === 'POST' && c.path === `/channels/${CHANNEL}/messages`).map((c) => c.body.content);

// //------------------- CICLO -------------------\\
test('ciclo de 15 dias: fases pela hora atual (nunca contador), 24 h finais = FINAL_PVP, zero = WIPE_PENDING', async () => {
  const c = await firstCycle();
  assert.equal(c.scheduled_wipe_at - c.started_at, 1296000);
  assert.equal(phaseOf(c), 'NORMAL');
  advance(14 * 86400 - 1);
  assert.equal(phaseOf(c, nowS()), 'NORMAL');
  advance(1);
  assert.equal(phaseOf(c, nowS()), 'FINAL_PVP'); // exatamente 24 h antes
  advance(86400 - 1);
  assert.equal(cycleView(c, nowS()).remainingSeconds, 1);
  advance(1);
  assert.equal(phaseOf(c, nowS()), 'WIPE_PENDING');
  advance(3 * 86400); // datas ultrapassadas: nada negativo, e NÃO começa outro ciclo sozinho
  const v = cycleView(c, nowS());
  assert.deepEqual([v.remainingSeconds, v.progressPercent, v.status], [0, 100, 'WIPE_PENDING']);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM wipe_cycles').n, 1);
});

test('fuso: Brasília 20:00 = 23:00 UTC; datas inválidas recusadas; a API devolve ISO em UTC', async () => {
  assert.equal(new Date(parseBrasilia('2026-11-20 20:00') * 1000).toISOString(), '2026-11-20T23:00:00.000Z');
  assert.equal(new Date(parseBrasilia('2026-12-31 22:30') * 1000).toISOString(), '2027-01-01T01:30:00.000Z'); // vira o ano
  assert.equal(parseBrasilia('2026-02-30 10:00'), null);
  assert.equal(parseBrasilia('20/11/2026 20:00'), null);
  await firstCycle();
  const { json } = await publicStatus();
  assert.match(json.scheduledWipeAt, /Z$/);
  assert.equal(json.durationSeconds, 1296000);
});

test('definir: valida a data, muda o ciclo atual, nunca cria dois ciclos', async () => {
  assert.equal((await defineWipe(env.DB, { at: nowS() + 60, actor: 'a' })).reason, 'too_soon');
  assert.equal((await defineWipe(env.DB, { at: nowS() + 200 * 86400, actor: 'a' })).reason, 'too_far');
  await firstCycle(10);
  const r = await defineWipe(env.DB, { at: nowS() + 20 * 86400, actor: 'a' });
  assert.ok(r.ok && !r.created);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM wipe_cycles').n, 1);
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM wipe_events WHERE event_type = 'cycle_rescheduled'`).n, 1);
  // o banco não aceita dois ciclos atuais nem forçando
  assert.throws(() => env.DB.db.prepare(`INSERT INTO wipe_cycles (started_at, scheduled_wipe_at, status, is_current, created_by, created_at, updated_at) VALUES (1, 2, 'active', 1, 'x', 1, 1)`).run(), /UNIQUE/);
});

// //------------------- SERVIDOR MTA -------------------\\
test('autenticação do servidor: sem assinatura, assinatura errada, horário velho ou segredo curto = 401', async () => {
  await firstCycle();
  const bare = await worker.fetch(new Request('https://w.example/api/wipe/mta/sync'), env, ctx);
  assert.equal(bare.status, 401);
  const ts = String(nowS());
  const bad = await worker.fetch(new Request('https://w.example/api/wipe/mta/event', { method: 'POST', headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': 'a'.repeat(64) }, body: '{"cycleId":1,"type":"wipe_done"}' }), env, ctx);
  assert.equal(bad.status, 401);
  // assinatura certa de 10 min atrás (replay velho)
  const old = String(nowS() - 600);
  const body = '{"cycleId":1,"type":"wipe_done"}';
  const sig = await hmacHex(SECRET, `${old}\nPOST\n/api/wipe/mta/event\n${body}`);
  const replay = await worker.fetch(new Request('https://w.example/api/wipe/mta/event', { method: 'POST', headers: { 'X-Havok-Timestamp': old, 'X-Havok-Signature': sig }, body }), env, ctx);
  assert.equal(replay.status, 401);
  // assinatura de outro caminho não vale aqui
  const sig2 = await hmacHex(SECRET, `${ts}\nGET\n/api/wipe/mta/sync\n`);
  const swapped = await worker.fetch(new Request('https://w.example/api/wipe/mta/event', { method: 'POST', headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': sig2 }, body }), env, ctx);
  assert.equal(swapped.status, 401);
  env.WIPE_SECRET = 'curto';
  assert.equal((await server('GET', '/api/wipe/mta/sync')).status, 401);
  // nada mudou no ciclo
  assert.equal((await currentCycle(env.DB)).status, 'active');
});

test('visitante público não confirma wipe: o status público é só leitura e não tem rota de escrita', async () => {
  await firstCycle();
  const post = await worker.fetch(new Request('https://w.example/api/wipe/status', { method: 'POST', body: '{}' }), env, ctx);
  assert.equal(post.status, 405);
  const { json, headers } = await publicStatus();
  assert.equal(headers.get('Access-Control-Allow-Origin'), 'https://havokrust.xyz');
  assert.ok(!('scheduledWipeAtUnix' in json));
  const other = await publicStatus('https://evil.example');
  assert.equal(other.headers.get('Access-Control-Allow-Origin'), null);
});

test('sync do servidor: devolve o calendário oficial com instantes em segundos', async () => {
  const c = await firstCycle();
  const r = await server('GET', '/api/wipe/mta/sync');
  assert.equal(r.status, 200);
  assert.deepEqual([r.json.cycleId, r.json.scheduledWipeAtUnix, r.json.serverTimeUnix, r.json.status], [c.id, c.scheduled_wipe_at, nowS(), 'NORMAL']);
});

test('PvP: só é anunciado depois que o servidor confirma; confirmar de novo não repete o aviso', async () => {
  await withPanel();
  const c = await firstCycle();
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'pvp_on' })).status, 409); // cedo demais
  advance(14 * 86400 + 60);
  await wipeCron(env);
  let panel = panelEdits().pop().body.embeds[0];
  assert.equal(panel.title, 'HAVOK — FINAL 24 HOURS');
  assert.equal(panel.color, 0xd8282b);
  assert.match(panel.description, /aguardando o servidor/);
  assert.ok(!/PVP MODE ACTIVE/.test(panel.description));
  assert.equal(alerts().length, 0);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'pvp_on' })).status, 200);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'pvp_on' })).status, 200);
  await wipeCron(env);
  panel = panelEdits().pop().body.embeds[0];
  assert.match(panel.description, /PVP MODE ACTIVE · MODO PVP ATIVO/);
  assert.equal(alerts().filter((a) => /ÚLTIMAS 24 HORAS/.test(a)).length, 1);
  assert.ok(alerts().every((a) => !/@everyone|@here/.test(a)));
});

test('wipe confirmado: fecha o ciclo, cria UM novo de 15 dias a partir da confirmação; confirmações repetidas não duplicam', async () => {
  await withPanel();
  const c = await firstCycle();
  advance(15 * 86400);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_started' })).json.result, 'wiping');
  assert.equal(phaseOf(await currentCycle(env.DB)), 'WIPE_PENDING');
  advance(300); // o servidor reinicia, faz a cópia e limpa
  const doneAt = nowS();
  const r1 = await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_done', at: doneAt });
  assert.equal(r1.json.result, 'completed');
  const next = await currentCycle(env.DB);
  assert.equal(next.id, r1.json.nextCycleId);
  assert.deepEqual([next.started_at, next.scheduled_wipe_at - next.started_at, next.previous_cycle_id, phaseOf(next)], [doneAt, 1296000, c.id, 'NORMAL']);
  // o servidor não recebeu a resposta e reenviou (duas vezes)
  const r2 = await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_done', at: doneAt });
  const r3 = await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_done', at: doneAt });
  assert.deepEqual([r2.json.result, r2.json.nextCycleId, r3.json.nextCycleId], ['already_completed', next.id, next.id]);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM wipe_cycles').n, 2);
  await wipeCron(env);
  await wipeCron(env);
  assert.equal(alerts().filter((a) => /WIPE CONCLUÍDO/.test(a)).length, 1);
  assert.equal(alerts().filter((a) => /WIPE COMEÇOU/.test(a)).length, 1);
  assert.match(panelEdits().pop().body.embeds[0].title, /WIPE STATUS/);
});

test('wipe com falha: fica FAILED (sem ciclo novo) até a administração reagendar', async () => {
  await withPanel();
  const c = await firstCycle();
  advance(15 * 86400 + 10);
  await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_started' });
  await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_failed', detail: 'backup falhou' });
  assert.equal(phaseOf(await currentCycle(env.DB)), 'FAILED');
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM wipe_cycles').n, 1);
  await wipeCron(env);
  assert.equal(panelEdits().pop().body.embeds[0].title, 'HAVOK — WIPE DELAYED');
  assert.equal(alerts().filter((a) => /WIPE ATRASOU/.test(a)).length, 1);
  // recuperação: nova data volta a contar o MESMO ciclo
  const r = await defineWipe(env.DB, { at: nowS() + 3 * 86400, actor: 'admin1' });
  assert.ok(r.ok);
  assert.equal(r.cycle.id, c.id);
  assert.equal(phaseOf(r.cycle, nowS()), 'NORMAL');
  // reagendar para dentro das 24 h finais já é a fase de PvP (o servidor liga sozinho)
  const soon = await defineWipe(env.DB, { at: nowS() + 3600, actor: 'admin1' });
  assert.equal(phaseOf(soon.cycle, nowS()), 'FINAL_PVP');
  assert.equal(env.DB.row(`SELECT COUNT(*) n FROM wipe_events WHERE event_type = 'cycle_recovered'`).n, 1);
});

test('servidor offline na hora do wipe: fica "aguardando o servidor", nada é apagado nem reiniciado pelo Worker', async () => {
  await withPanel();
  const c = await firstCycle();
  advance(15 * 86400 + 2 * 3600); // 2 h depois do horário e o servidor não apareceu
  await wipeCron(env);
  const panel = panelEdits().pop().body.embeds[0];
  assert.equal(panel.title, 'HAVOK — WIPE IN PROGRESS');
  assert.match(panel.description, /Aguardando o servidor do jogo/);
  assert.equal((await currentCycle(env.DB)).id, c.id);
  assert.ok(!calls.some((c2) => /wipe|delete/i.test(c2.path) && c2.method === 'DELETE'));
});

test('cron atrasado e novo deploy: a fase sai da hora real e do banco, não de memória', async () => {
  await withPanel();
  await firstCycle();
  advance(14 * 86400 + 5 * 3600); // o cron "perdeu" horas
  await wipeCron(env);
  assert.equal(panelEdits().pop().body.embeds[0].title, 'HAVOK — FINAL 24 HOURS');
  // "deploy": outro Worker lendo o mesmo banco vê o mesmo estado
  const { json } = await publicStatus();
  assert.equal(json.status, 'FINAL_PVP');
  assert.equal(json.remainingSeconds, 19 * 3600);
});

test('painel: edita a mesma mensagem só quando muda; Discord fora não quebra e o próximo minuto corrige', async () => {
  await withPanel();
  await firstCycle();
  await wipeCron(env);
  const n = panelEdits().length;
  await wipeCron(env); // mesmo minuto: nada
  assert.equal(panelEdits().length, n);
  advance(60);
  fail.push(/\/messages\/700000000000000001$/);
  await wipeCron(env); // falhou (com as tentativas automáticas): não grava como desenhado
  const afterFail = panelEdits().length;
  assert.ok(afterFail > n);
  fail.length = 0;
  await wipeCron(env); // o próximo minuto tenta de novo e consegue
  assert.equal(panelEdits().length, afterFail + 1);
  await wipeCron(env); // e depois disso, sem mudança, não edita mais
  assert.equal(panelEdits().length, afterFail + 1);
  assert.ok(!calls.some((c) => c.method === 'POST' && c.path.endsWith('/messages'))); // nunca cria mensagem nova
  assert.equal(countdown(14 * 86400 + 8 * 3600 + 32 * 60 + 59), '14d 08h 32m');
});

test('eventos com dados ruins são recusados sem mexer no ciclo', async () => {
  const c = await firstCycle();
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: 999, type: 'wipe_done' })).status, 404);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: 'x', type: 'wipe_done' })).status, 400);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'apagar_tudo' })).status, 400);
  assert.equal((await server('POST', '/api/wipe/mta/event', { cycleId: c.id, type: 'wipe_done' })).status, 409); // antes da hora
  assert.equal((await currentCycle(env.DB)).status, 'active');
});

test('sem ciclo: status público NONE e painel avisando que ainda não foi agendado', async () => {
  await withPanel();
  const { json } = await publicStatus();
  assert.equal(json.status, 'NONE');
  await syncPanel(env, { force: true });
  assert.match(panelEdits().pop().body.embeds[0].description, /ainda não foi agendado/);
});
