// Rotas do front (routes.js, na raiz do site): caminho -> página, links antigos com # -> caminho novo.
// O arquivo é um script de navegador: carrega como o navegador carrega (window.HavokRoutes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const box = { window: {} };
vm.runInNewContext(readFileSync(new URL('../routes.js', import.meta.url), 'utf8'), box);
const { parse, fromHash, isApp } = box.window.HavokRoutes;
const plain = (o) => JSON.parse(JSON.stringify(o));

test('tabela de rotas: cada caminho abre a sua página', () => {
  const want = {
    '/': { page: 'home' },
    '/wiki': { page: 'wiki' },
    '/wiki/': { page: 'wiki' },
    '/wiki/itens': { page: 'items' },
    '/wiki/categoria/weapons': { page: 'category', id: 'weapons' },
    '/wiki/item/c4': { page: 'item', id: 'c4' },
    '/wiki/veiculos': { page: 'vehicles' },
    '/wiki/guias': { page: 'guides' },
    '/wiki/guia/base-building': { page: 'guide', id: 'base-building' },
    '/wiki/faq': { page: 'faq' },
    '/mapa': { page: 'map' },
    '/ranking': { page: 'ranking' },
    '/ranking/': { page: 'ranking' },
    '/wipe': { page: 'wipe' },
    '/grupo/biriri': { page: 'group', id: 'biriri' },
    '/jogador/42': { page: 'player', id: '42' },
    '/loja': { page: 'store' },
    '/badges': { page: 'badges' },
    '/perfil': { page: 'perfil' },
    '/ac/0123abcd': { page: 'ac', id: '0123abcd' },
  };
  for (const [p, r] of Object.entries(want)) assert.deepEqual(plain(parse(p)), r, p);
});

test('caminho desconhecido ou incompleto = 404 (sem quebrar)', () => {
  for (const p of ['/xyz', '/wiki/item', '/wiki/item/a/b', '/wiki/nada', '/grupo', '/jogador/', '/ranking/x', '/store', '/items/c4', '/wiki/categoria/']) {
    assert.equal(parse(p).page, 'notfound', p);
  }
});

test('nome com acento ou %: decodificado; % quebrado não derruba', () => {
  assert.equal(parse('/grupo/s%C3%A3o').id, 'são');
  assert.equal(parse('/jogador/%E0%A4%A').id, '%E0%A4%A');
});

test('links antigos com # vão para o caminho novo', () => {
  const want = {
    '#/': '/',
    '#/wiki': '/wiki',
    '#/items': '/wiki/itens',
    '#/items/c4': '/wiki/item/c4',
    '#/category/weapons': '/wiki/categoria/weapons',
    '#/vehicles': '/wiki/veiculos',
    '#/guides': '/wiki/guias',
    '#/guides/base-building': '/wiki/guia/base-building',
    '#/faq': '/wiki/faq',
    '#/ranking': '/ranking',
    '#/wipe': '/wipe',
    '#/grupo/biriri': '/grupo/biriri',
    '#/jogador/42': '/jogador/42',
    '#/store': '/loja',
    '#/badges': '/badges',
    '#/perfil': '/perfil',
    '#/perfil?vinculado=1': '/perfil?vinculado=1',
    '#/perfil?erro=codigo': '/perfil?erro=codigo',
    '#/ac/0123abcd': '/ac/0123abcd',
    '#/media': '/',
    '#/plano': '/',
  };
  for (const [h, p] of Object.entries(want)) assert.equal(fromHash(h), p, h);
});

test('âncora comum não é rota antiga', () => {
  for (const h of ['', '#', '#grupos', '#top']) assert.equal(fromHash(h), null, h);
});

test('só caminhos de página passam pelo roteador (arquivos e /play/ recarregam)', () => {
  for (const p of ['/', '/wiki/item/c4', '/ranking', '/grupo/x']) assert.equal(isApp(p), true, p);
  for (const p of ['/play/', '/play', '/media/hero.mp4', '/og/home.jpg', '/mapa/demo.html', '/logo.png']) assert.equal(isApp(p), false, p);
});
