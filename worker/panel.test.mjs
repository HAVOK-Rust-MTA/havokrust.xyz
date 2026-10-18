import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderQueue, idsFromEmbed, buildEmbed, updatePanel, progress, readFirst } from './panel.js';

const ROLE = '1561050122446569643';
const mem = (id, name, joined, roles = [ROLE], extra = {}) => ({ user: { id, username: name, ...extra }, roles, joined_at: joined });

test('fila: quem já estava mantém a posição, novos vão para o fim, quem saiu some', () => {
  const ms = [mem('300000000000000003', 'c', '2026-10-03'), mem('100000000000000001', 'a', '2026-10-01'), mem('400000000000000004', 'd', '2026-10-02')];
  const q = orderQueue(['300000000000000003', '200000000000000002'], ms);
  assert.deepEqual(q.map((m) => m.user.username), ['c', 'a', 'd']);
});

test('embed: número, vagas, barra de 50, nomes sem markdown, ordem guardada no link', () => {
  const q = [mem('100000000000000001', '**hack**', 'x'), mem('200000000000000002', 'b', 'y')];
  const e = buildEmbed(q, 50);
  assert.equal(e.fields[0].value, '**02** / 50');
  assert.equal(e.fields[1].value, '**48**');
  assert.equal((e.fields[3].value.match(/🟧/g) || []).length, 1);
  assert.equal((e.fields[3].value.match(/⬛/g) || []).length, 19);
  assert.ok(e.fields[4].value.includes('`#01` hack'));
  assert.ok(e.fields[4].value.includes('`#03` ─'));
  assert.deepEqual(idsFromEmbed(e), ['100000000000000001', '200000000000000002']);
});

test('updatePanel: lê membros + painel, edita só quando mudou, nunca vaza o token do webhook', async () => {
  const env = { DISCORD_BOT_TOKEN: 't', GUILD_ID: '1560345146703482890', ROLE_ID: ROLE, GOAL: '50', WAITLIST_WEBHOOK: 'https://discord.com/api/webhooks/1/SECRET', WAITLIST_MESSAGE_ID: '99' };
  const members = [mem('100000000000000001', 'a', '1'), mem('200000000000000002', 'bot', '2', [ROLE], { bot: true }), mem('300000000000000003', 'x', '3', ['other'])];
  let patched = null, prev = { embeds: [] };
  const fake = async (url, init = {}) => {
    if (url.includes('/members')) return new Response(JSON.stringify(members));
    if (init.method === 'PATCH') { patched = JSON.parse(init.body); prev = patched; return new Response(JSON.stringify({})); }
    return new Response(JSON.stringify(prev));
  };
  assert.equal(await updatePanel(env, fake), 'updated');
  assert.equal(patched.embeds[0].fields[0].value, '**01** / 50');
  assert.equal(await updatePanel(env, fake), 'same');
  const failing = async () => new Response('{}', { status: 404 });
  await assert.rejects(updatePanel(env, failing), (e) => !e.message.includes('SECRET'));
});

test('sem webhook configurado não faz nada', async () => {
  assert.equal(await updatePanel({}, async () => { throw new Error('não devia chamar'); }), 'off');
});

test('progresso: 0, 24, 124, 125 e acima da meta (nunca passa de 100%, vagas nunca negativas)', () => {
  const count = (b, c) => (b.match(new RegExp(c, 'g')) || []).length;
  const p0 = progress(0, 125);
  assert.deepEqual([p0.pct, p0.left, count(p0.bar, '🟧'), count(p0.bar, '⬛')], [0, 125, 0, 20]);
  const p24 = progress(24, 125);
  assert.deepEqual([p24.pct, p24.left, count(p24.bar, '🟧')], [19, 101, 4]);
  assert.equal(count(progress(1, 125).bar, '🟧'), 1); // alguém inscrito: nunca barra vazia
  const p124 = progress(124, 125);
  assert.deepEqual([p124.pct, p124.left, count(p124.bar, '🟧'), p124.reached], [99, 1, 19, false]); // só enche na meta
  const p125 = progress(125, 125);
  assert.deepEqual([p125.pct, p125.left, count(p125.bar, '🟧'), p125.reached], [100, 0, 20, true]);
  const p200 = progress(200, 125);
  assert.deepEqual([p200.pct, p200.left, count(p200.bar, '🟧'), count(p200.bar, '⬛')], [100, 0, 20, 0]);
});

test('embed: sem ### (vira texto cru no Discord) e faixas 1–5 / 6–10 / 11–15 / 16+ preservadas', () => {
  const q = Array.from({ length: 18 }, (_, i) => mem(String(100000000000000000 + i + 1), `p${i + 1}`, String(i)));
  const e = buildEmbed(q, 125);
  assert.ok(!JSON.stringify(e).includes('###'));
  const byName = Object.fromEntries(e.fields.map((f) => [f.name, f.value]));
  assert.match(byName['🔴 Vanguard'], /^`#01` p1\n[\s\S]*`#05` p5$/);
  assert.match(byName['🟠 Pioneer'], /^`#06` p6\n[\s\S]*`#10` p10$/);
  assert.match(byName['🟣 Early Survivor'], /^`#11` p11\n[\s\S]*`#15` p15$/);
  assert.match(byName['Next in line · Próximos da fila'], /^`#16` p16\n`#17` p17\n`#18` p18$/);
});

test('updatePanel entrega a contagem da rodada (fonte única para o painel de inscrição)', async () => {
  const env = { DISCORD_BOT_TOKEN: 't', GUILD_ID: '1560345146703482890', ROLE_ID: ROLE, GOAL: '125', WAITLIST_WEBHOOK: 'https://discord.com/api/webhooks/1/S', WAITLIST_MESSAGE_ID: '99' };
  const fake = async (url, init = {}) => new Response(JSON.stringify(url.includes('/members') ? [mem('100000000000000001', 'a', '1')] : { embeds: [] }));
  let got;
  await updatePanel(env, fake, { onCount: (n, goal) => { got = [n, goal]; } });
  assert.deepEqual(got, [1, 125]);
});
