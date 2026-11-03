// node --test worker/  — ranking de sempre: a foto da season no começo do wipe. D1 = SQLite real com TODAS as migrations,
// Discord simulado, assinatura HMAC real. Nenhum wipe de verdade acontece aqui.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './waitlist.js';
import { defineWipe, DEFAULT_CYCLE_S } from './wipe/cycle.js';
import { hmacHex, parseBrasilia } from './wipe/service.js';

const DIR = new URL('./migrations/', import.meta.url);
const MIGRATION = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, DIR), 'utf8')).join('\n');
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
  exec(sql) { this.db.exec(sql); }
}

const REAL_NOW = Date.now;
let clock, env, pending;
const advance = (sec) => { clock += sec * 1000; };
const nowS = () => Math.floor(clock / 1000);
const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const ctx = { waitUntil: (p) => pending.push(p) };
globalThis.fetch = async () => Response.json({ id: '1' });

beforeEach(() => {
  clock = parseBrasilia('2026-11-01 20:00') * 1000;
  Date.now = () => clock;
  env = { DB: new FakeD1(), DISCORD_BOT_TOKEN: 'b0t', WIPE_SECRET: SECRET, WIPE_CYCLE_SECONDS: String(DEFAULT_CYCLE_S), ALLOWED_ORIGINS: 'https://havokrust.xyz' };
  pending = [];
});
afterEach(() => { Date.now = REAL_NOW; });

async function event(payload) {
  const ts = String(nowS());
  const body = JSON.stringify(payload);
  const sig = await hmacHex(SECRET, `${ts}\nPOST\n/api/wipe/mta/event\n${body}`);
  const res = await worker.fetch(new Request('https://w.example/api/wipe/mta/event', { method: 'POST', headers: { 'X-Havok-Timestamp': ts, 'X-Havok-Signature': sig, 'Content-Type': 'application/json' }, body }), env, ctx);
  while (pending.length) await Promise.all(pending.splice(0));
  return res.json();
}

function seed() {
  const t = nowS();
  const p = env.DB.db.prepare(`INSERT INTO game_players (account, pid, nick, level, kills, deaths, play_minutes, group_name, badges, first_seen, last_seen, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?)`);
  p.run('SERIAL-A', 'aaaaaaaaaa', 'Alfa', 12, 30, 10, 600, 'Biriri', t, t, t);
  p.run('SERIAL-B', 'bbbbbbbbbb', 'Bravo', 5, 4, 2, 120, null, t, t, t);
  p.run('SERIAL-C', 'cccccccccc', 'Charlie', 1, 0, 0, 0, null, t, t, t); // entrou e nunca jogou: fica de fora
  for (const [acc, pid] of [['SERIAL-A', 'aaaaaaaaaa'], ['SERIAL-B', 'bbbbbbbbbb'], ['SERIAL-C', 'cccccccccc']]) env.DB.db.prepare('INSERT OR IGNORE INTO player_ids (account, pid) VALUES (?, ?)').run(acc, pid);
  const g = env.DB.db.prepare('INSERT INTO game_groups (name, slug, tag, color, rank, xp, kills, deaths, members, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  g.run('Biriri', 'biriri', 'BIRI', '#ff6a00', 1, 5000, 40, 12, JSON.stringify([{ account: 'SERIAL-A', role: 'Leader' }, { account: 'SERIAL-B', role: 'Member' }]), t);
  g.run('Lobos', 'lobos', 'LOB', null, 2, 1200, 8, 9, JSON.stringify([{ account: 'SERIAL-X', role: 'Leader' }]), t);
}

async function cycleAtWipe() {
  const r = await defineWipe(env.DB, { at: nowS() + 15 * 86400, actor: 'admin1' });
  advance(15 * 86400 + 10);
  return r.cycle;
}

test('wipe_started fotografa jogadores e grupos da season', async () => {
  seed();
  const c = await cycleAtWipe();
  assert.equal((await event({ cycleId: c.id, type: 'wipe_started' })).result, 'wiping');
  const ps = env.DB.rows('SELECT cycle_id, account, nick, level, kills, deaths, play_minutes, group_name FROM player_seasons ORDER BY account');
  assert.deepEqual(ps.map((r) => ({ ...r })), [
    { cycle_id: c.id, account: 'SERIAL-A', nick: 'Alfa', level: 12, kills: 30, deaths: 10, play_minutes: 600, group_name: 'Biriri' },
    { cycle_id: c.id, account: 'SERIAL-B', nick: 'Bravo', level: 5, kills: 4, deaths: 2, play_minutes: 120, group_name: null },
  ]);
  const gs = env.DB.rows('SELECT cycle_id, name, tag, rank, xp, kills, deaths, members_count FROM group_seasons ORDER BY rank');
  assert.deepEqual(gs.map((r) => ({ ...r })), [
    { cycle_id: c.id, name: 'Biriri', tag: 'BIRI', rank: 1, xp: 5000, kills: 40, deaths: 12, members_count: 2 },
    { cycle_id: c.id, name: 'Lobos', tag: 'LOB', rank: 2, xp: 1200, kills: 8, deaths: 9, members_count: 1 },
  ]);
});

test('wipe refeito atualiza a foto em vez de duplicar', async () => {
  seed();
  const c = await cycleAtWipe();
  await event({ cycleId: c.id, type: 'wipe_started' });
  env.DB.exec("UPDATE game_players SET kills = 99 WHERE account = 'SERIAL-A'");
  await event({ cycleId: c.id, type: 'wipe_failed', detail: 'backup falhou' });
  await event({ cycleId: c.id, type: 'wipe_started' });
  const rows = env.DB.rows("SELECT kills FROM player_seasons WHERE account = 'SERIAL-A'");
  assert.deepEqual(rows.map((r) => r.kills), [99]);
});

test('wipe_done ainda apaga game_players, mas player_ids e as seasons ficam', async () => {
  seed();
  const c = await cycleAtWipe();
  await event({ cycleId: c.id, type: 'wipe_started' });
  advance(300);
  assert.equal((await event({ cycleId: c.id, type: 'wipe_done', at: nowS() })).result, 'completed');
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM game_players').n, 0);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM game_groups').n, 0);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM player_ids').n, 3);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM player_seasons').n, 2);
  assert.equal(env.DB.row('SELECT COUNT(*) n FROM group_seasons').n, 2);
});
