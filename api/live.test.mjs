// node --test api/  — status com histórico (amostra a cada 5 min, 7 dias) e airdrop ao vivo do mapa.
// D1 = SQLite real com as migrations, assinatura HMAC real, relógio simulado.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './index.js';
import { hmacHex } from './lib/util.js';

const dir = new URL('../worker/migrations/', import.meta.url);
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
let clock, env;
const advance = (sec) => { clock += sec * 1000; };
const nowS = () => Math.floor(clock / 1000);
const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const API = 'https://api.havokrust.xyz';
const SITE = 'https://havokrust.xyz';
const ctx = { waitUntil: () => {} };

async function server(path, payload, secret = SECRET) {
  const ts = String(nowS());
  const body = JSON.stringify(payload);
  const sig = await hmacHex(secret, `${ts}\nPOST\n${path}\n${body}`);
  const res = await worker.fetch(new Request(`${API}${path}`, { method: 'POST', headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': sig }, body }), env, ctx);
  return { status: res.status, json: await res.json() };
}
async function get(path, origin = SITE) {
  const res = await worker.fetch(new Request(`${API}${path}`, { headers: { Origin: origin } }), env, ctx);
  return { status: res.status, headers: res.headers, json: await res.json() };
}
const live = (players, max = 85) => server('/api/game/mta/live', { players, max });
const samples = () => env.DB.rows('SELECT * FROM server_samples ORDER BY ts').map((r) => ({ ...r }));

beforeEach(() => {
  clock = Date.UTC(2026, 10, 3, 12);
  Date.now = () => clock;
  env = { DB: new FakeD1(), WIPE_SECRET: SECRET, ALLOWED_ORIGINS: SITE };
});
afterEach(() => { Date.now = REAL_NOW; });

// //------------------- STATUS COM HISTÓRICO -------------------\\
test('live grava uma amostra no máximo a cada 5 min', async () => {
  assert.equal((await live(3)).status, 200);
  assert.deepEqual(samples(), [{ ts: nowS(), online: 3, max: 85 }]);
  advance(60);
  await live(4);
  advance(239);
  await live(5);
  assert.equal(samples().length, 1);
  advance(1);
  await live(6);
  assert.deepEqual(samples().map((s) => s.online), [3, 6]);
});

test('live sem assinatura não grava amostra', async () => {
  assert.equal((await server('/api/game/mta/live', { players: 9, max: 85 }, 'outro-segredo-qualquer-com-mais-de-32-chars')).status, 401);
  assert.equal(samples().length, 0);
});

test('amostras com mais de 7 dias são apagadas', async () => {
  const ins = env.DB.db.prepare('INSERT INTO server_samples (ts, online, max) VALUES (?, ?, 85)');
  ins.run(nowS() - 8 * 86400, 1);
  ins.run(nowS() - 7 * 86400 + 600, 2);
  await live(3);
  assert.deepEqual(samples().map((s) => s.online), [2, 3]);
});

test('history: amostras das últimas N horas, pico, média e agora; cache 60 s e CORS do site', async () => {
  const ins = env.DB.db.prepare('INSERT INTO server_samples (ts, online, max) VALUES (?, ?, 85)');
  ins.run(nowS() - 30 * 3600, 50); // fora das 24 h
  ins.run(nowS() - 20 * 3600, 10);
  ins.run(nowS() - 10 * 3600, 30);
  ins.run(nowS() - 3600, 5);
  await live(7); // amostra agora + status.live
  const r = await get('/api/status/history?hours=24');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('Cache-Control'), /max-age=60/);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), SITE);
  assert.deepEqual(r.json.samples, [
    { t: nowS() - 20 * 3600, online: 10, max: 85 }, { t: nowS() - 10 * 3600, online: 30, max: 85 },
    { t: nowS() - 3600, online: 5, max: 85 }, { t: nowS(), online: 7, max: 85 },
  ]);
  assert.equal(r.json.peak, 30);
  assert.equal(r.json.avg, 13);
  assert.equal(r.json.now, 7);
  assert.equal(r.json.hours, 24);

  assert.equal((await get('/api/status/history?hours=48')).json.peak, 50);
  assert.equal((await get('/api/status/history?hours=999')).json.hours, 168);
  assert.equal((await get('/api/status/history?hours=0')).json.hours, 1);
  assert.equal((await get('/api/status/history?hours=abc')).json.hours, 24);
  assert.equal((await get('/api/status/history')).json.hours, 24);
});

test('history: sem amostra = zeros; servidor calado há mais de 150 s = now null', async () => {
  let r = await get('/api/status/history?hours=1');
  assert.deepEqual(r.json, { hours: 1, samples: [], peak: 0, avg: 0, now: null });
  await live(4);
  advance(151);
  r = await get('/api/status/history?hours=1');
  assert.equal(r.json.now, null);
  assert.equal(r.json.peak, 4);
});

// //------------------- AIRDROP AO VIVO -------------------\\
test('airdrop: o servidor manda assinado, o site lê; sem nada = none; cache 15 s', async () => {
  let r = await get('/api/airdrop');
  assert.equal(r.status, 200);
  assert.equal(r.json.state, 'none');
  assert.match(r.headers.get('Cache-Control'), /max-age=15/);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), SITE);

  assert.equal((await server('/api/game/mta/airdrop', { state: 'falling', x: 1234.567, y: -987.12, at: nowS(), id: 7, landAt: nowS() + 270, zone: 'Los Santos' })).status, 200);
  r = await get('/api/airdrop');
  assert.deepEqual(r.json, { state: 'falling', x: 1234.6, y: -987.1, at: nowS(), id: 7, landAt: nowS() + 270, zone: 'Los Santos' });

  await server('/api/game/mta/airdrop', { state: 'landed', x: 1234.6, y: -987.1, at: nowS(), id: 7 });
  assert.equal((await get('/api/airdrop')).json.state, 'landed');
});

test('airdrop: sem assinatura, estado inventado ou posição fora do mapa não passam', async () => {
  const bad = await server('/api/game/mta/airdrop', { state: 'falling', x: 1, y: 2, at: nowS(), id: 1 }, 'outro-segredo-qualquer-com-mais-de-32-chars');
  assert.equal(bad.status, 401);
  const unsigned = await worker.fetch(new Request(`${API}/api/game/mta/airdrop`, { method: 'POST', body: JSON.stringify({ state: 'falling', x: 1, y: 2, id: 1 }) }), env, ctx);
  assert.equal(unsigned.status, 401);
  assert.equal((await server('/api/game/mta/airdrop', { state: 'exploded', x: 1, y: 2, at: nowS(), id: 1 })).status, 400);
  assert.equal((await server('/api/game/mta/airdrop', { state: 'falling', x: 99999, y: 2, at: nowS(), id: 1 })).status, 400);
  assert.equal((await server('/api/game/mta/airdrop', { state: 'falling', at: nowS(), id: 1 })).status, 400);
  assert.equal((await get('/api/airdrop')).json.state, 'none');
  const getPost = await worker.fetch(new Request(`${API}/api/airdrop`, { method: 'POST' }), env, ctx);
  assert.equal(getPost.status, 405);
});

test('airdrop: aberto some depois de 15 min; none apaga; preso há mais de 2 h some', async () => {
  await server('/api/game/mta/airdrop', { state: 'opened', x: 10, y: 20, at: nowS(), id: 3 });
  advance(15 * 60 - 1);
  assert.equal((await get('/api/airdrop')).json.state, 'opened');
  advance(1);
  assert.deepEqual((await get('/api/airdrop')).json, { state: 'none', x: null, y: null, at: null, id: null, landAt: null, zone: null });

  await server('/api/game/mta/airdrop', { state: 'landed', x: 10, y: 20, at: nowS(), id: 4 });
  await server('/api/game/mta/airdrop', { state: 'none', id: 4, at: nowS() });
  assert.equal((await get('/api/airdrop')).json.state, 'none');

  await server('/api/game/mta/airdrop', { state: 'landed', x: 10, y: 20, at: nowS(), id: 5 });
  advance(2 * 3600 + 1); // servidor caiu sem avisar
  assert.equal((await get('/api/airdrop')).json.state, 'none');
});
