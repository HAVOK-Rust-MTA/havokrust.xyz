import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderQueue, idsFromEmbed, buildEmbed, updatePanel } from './panel.js';

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
  assert.equal(e.fields[0].value, '### 02 / 50');
  assert.equal(e.fields[1].value, '### 48');
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
  assert.equal(patched.embeds[0].fields[0].value, '### 01 / 50');
  assert.equal(await updatePanel(env, fake), 'same');
  const failing = async () => new Response('{}', { status: 404 });
  await assert.rejects(updatePanel(env, failing), (e) => !e.message.includes('SECRET'));
});

test('sem webhook configurado não faz nada', async () => {
  assert.equal(await updatePanel({}, async () => { throw new Error('não devia chamar'); }), 'off');
});
