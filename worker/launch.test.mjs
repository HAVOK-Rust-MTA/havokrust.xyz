// node --test worker/  — depois da inauguração: lista de espera encerrada (painel congelado, sem botão) e /api/server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closedMessage, closedOn } from './waitlist/join.js';
import worker from './waitlist.js';

test('WAITLIST_CLOSED só vale com data aaaa-mm-dd', () => {
  assert.equal(closedOn({ WAITLIST_CLOSED: '2026-10-24' }), '2026-10-24');
  assert.equal(closedOn({ WAITLIST_CLOSED: 'sim' }), '');
  assert.equal(closedOn({}), '');
});

test('painel encerrado: mantém a fila, troca título e texto, mostra o IP e tira o botão', () => {
  const prev = { title: '🎟️ WAITING LIST · STATUS', url: 'https://havokrust.xyz/?wl=1.2.3', fields: [{ name: '🔴 Vanguard', value: '`#01` kpital\n`#02` sason\n`#03` 888' }] };
  const m = closedMessage(prev, '2026-10-24', '177.54.146.12:22360');
  assert.deepEqual(m.components, []);
  assert.match(m.embeds[0].title, /ENCERRADA/);
  assert.equal(m.embeds[0].fields, prev.fields);
  assert.match(m.embeds[0].description, /24\/10\/2026/);
  assert.match(m.embeds[0].description, /\*\*3\*\* sobreviventes/);
  assert.match(m.embeds[1].description, /177\.54\.146\.12:22360/);
});

test('/api/server devolve IP e jogadores da lista do MTA, com CORS do site', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([{ ip: '177.54.146.12', port: 22360, players: 12, maxplayers: 85, password: 0 }]), { status: 200 });
  const res = await worker.fetch(new Request('https://w/api/server', { headers: { Origin: 'https://havokrust.xyz' } }), { ALLOWED_ORIGINS: 'https://havokrust.xyz' }, { waitUntil() {} });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://havokrust.xyz');
  const j = await res.json();
  assert.deepEqual([j.addr, j.online, j.locked, j.players, j.max], ['177.54.146.12:22360', true, false, 12, 85]);
});
