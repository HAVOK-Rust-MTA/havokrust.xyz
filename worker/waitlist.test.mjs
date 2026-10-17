// node --test worker/  — testa o Worker com o fetch do Discord simulado
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker, { _reset } from './waitlist.js';

const ROLE = '1561000000000000001';
const env = { DISCORD_BOT_TOKEN: 't0k3n', GUILD_ID: '1560345146703482890', ROLE_ID: ROLE, GOAL: '30', ALLOWED_ORIGINS: 'https://havokrust.xyz,http://127.0.0.1:8080' };
const req = (origin = 'https://havokrust.xyz', method = 'GET', path = '/waitlist') =>
  new Request('https://havok-waitlist.example.workers.dev' + path, { method, headers: origin ? { Origin: origin } : {} });
const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers });
let calls;
const discordReturns = (...responses) => {
  calls = [];
  globalThis.fetch = mock.fn(async (url, init) => { calls.push({ url, init }); const r = responses.shift(); if (r instanceof Error) throw r; return r(); });
};

beforeEach(() => { _reset(); mock.timers.reset(); });

test('conta só o cargo Waiting List e manda o token no header', async () => {
  discordReturns(() => reply(200, { [ROLE]: 7, '999999999999999999': 300 }));
  const res = await worker.fetch(req(), env);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.count, 7);
  assert.equal(body.goal, 30);
  assert.equal(body.stale, false);
  assert.match(calls[0].url, /\/guilds\/1560345146703482890\/roles\/member-counts$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bot t0k3n');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://havokrust.xyz');
  assert.ok(!JSON.stringify(body).includes('t0k3n'));
});

test('cache: segunda chamada não vai ao Discord', async () => {
  discordReturns(() => reply(200, { [ROLE]: 3 }));
  await worker.fetch(req(), env);
  const res = await worker.fetch(req(), env);
  assert.equal((await res.json()).count, 3);
  assert.equal(calls.length, 1);
});

test('chamadas simultâneas viram uma só ida ao Discord', async () => {
  discordReturns(() => reply(200, { [ROLE]: 5 }));
  const all = await Promise.all([1, 2, 3, 4, 5].map(() => worker.fetch(req(), env)));
  assert.equal(calls.length, 1);
  for (const r of all) assert.equal((await r.json()).count, 5);
});

test('cargo ausente da contagem mas existente = 0', async () => {
  discordReturns(() => reply(200, {}), () => reply(200, [{ id: ROLE, name: 'Waiting List' }]));
  assert.equal((await (await worker.fetch(req(), env)).json()).count, 0);
});

test('ROLE_ID errado = erro, nunca 0 inventado', async () => {
  discordReturns(() => reply(200, {}), () => reply(200, [{ id: '1', name: 'outro' }]));
  const res = await worker.fetch(req(), env);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'unavailable' });
});

test('Discord fora sem leitura anterior = 502 sem número', async () => {
  discordReturns(() => reply(500, { message: 'boom' }));
  const res = await worker.fetch(req(), env);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).count, undefined);
});

test('Discord fora depois de uma leitura = devolve a última, marcada stale', async () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  discordReturns(() => reply(200, { [ROLE]: 12 }), () => reply(429, { retry_after: 5 }, { 'Retry-After': '5' }));
  await worker.fetch(req(), env);
  mock.timers.tick(31_000);
  const body = await (await worker.fetch(req(), env)).json();
  assert.equal(body.count, 12);
  assert.equal(body.stale, true);
  // em pausa depois da falha: não chama o Discord de novo
  await worker.fetch(req(), env);
  assert.equal(calls.length, 2);
});

test('rede/timeout vira 502', async () => {
  discordReturns(new TypeError('fetch failed'));
  assert.equal((await worker.fetch(req(), env)).status, 502);
});

test('CORS: origem de fora não recebe Allow-Origin; preflight 204/403', async () => {
  discordReturns(() => reply(200, { [ROLE]: 1 }));
  const res = await worker.fetch(req('https://evil.example'), env);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await worker.fetch(req('http://127.0.0.1:8080', 'OPTIONS'), env)).status, 204);
  assert.equal((await worker.fetch(req('https://evil.example', 'OPTIONS'), env)).status, 403);
});

test('rotas e métodos', async () => {
  assert.equal((await worker.fetch(req(undefined, 'GET', '/'), env)).status, 404);
  assert.equal((await worker.fetch(req(undefined, 'POST'), env)).status, 405);
});

test('config faltando = 503 sem chamar o Discord', async () => {
  discordReturns();
  assert.equal((await worker.fetch(req(), { ...env, DISCORD_BOT_TOKEN: '' })).status, 503);
  assert.equal((await worker.fetch(req(), { ...env, ROLE_ID: '' })).status, 503);
  assert.equal(calls.length, 0);
});
