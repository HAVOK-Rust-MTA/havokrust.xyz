// cd site && node --test  — Worker de preview: rota -> meta tags, API fora -> texto padrão, www -> 301,
// caminhos fora das rotas passam direto, HTML escapado. index.html e og-data.json são os do repo; a rede é simulada.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import worker from './index.js';
import { isPageRoute, metaFor, groupMeta, playerMeta } from './og.js';

const ROOT = new URL('../', import.meta.url);
const INDEX = readFileSync(new URL('index.html', ROOT), 'utf8');
const OGDATA = readFileSync(new URL('og-data.json', ROOT), 'utf8');

// //------------------- HTMLRewriter de mentira (o do Workers não existe no Node) -------------------\\
// Só o que o index.js usa: seletor por nome da tag, getAttribute, remove, replace(html) e onEndTag().before(html).
// O conteúdo inserido não é reprocessado, como no de verdade.
class FakeRewriter {
  constructor() { this.h = []; }
  on(sel, handler) { this.h.push([sel, handler]); return this; }
  transform(res) {
    const hs = this.h;
    const body = res.text().then((html) => {
      let out = '', i = 0;
      const ends = {};
      const re = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
      let m;
      while ((m = re.exec(html))) {
        const [tag, close, nameRaw, attrs] = m;
        const name = nameRaw.toLowerCase();
        out += html.slice(i, m.index);
        i = m.index + tag.length;
        if (close) {
          for (const fn of ends[name] || []) { const pre = []; fn({ before: (s) => pre.push(s) }); out += pre.join(''); }
          delete ends[name];
          out += tag;
          continue;
        }
        const a = {};
        for (const [, k, v1, v2] of attrs.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[k.toLowerCase()] = v1 ?? v2;
        let action = null, repl = '';
        const el = {
          tagName: name,
          getAttribute: (k) => a[k.toLowerCase()] ?? null,
          remove: () => { action = 'remove'; },
          replace: (s) => { action = 'replace'; repl = s; },
          onEndTag: (fn) => { (ends[name] ||= []).push(fn); },
        };
        for (const [sel, hd] of hs) if (sel === name && hd.element) hd.element(el);
        if (!action) { out += tag; continue; }
        // elemento com conteúdo (title): some até o fechamento
        const endTag = `</${name}>`;
        const j = ['meta', 'link'].includes(name) ? -1 : html.toLowerCase().indexOf(endTag, i);
        if (j >= 0) i = j + endTag.length;
        if (action === 'replace') out += repl;
      }
      return out + html.slice(i);
    });
    return new Response(new ReadableStream({ async start(c) { c.enqueue(new TextEncoder().encode(await body)); c.close(); } }), res);
  }
}
globalThis.HTMLRewriter = FakeRewriter;

// //------------------- rede simulada -------------------\\
let api, calls, indexDown, ogDown;
const GROUP = { slug: 'biriri', name: 'Biriri', tag: 'BRR', rank: 1, kills: 1234, deaths: 10, description: 'Os donos da praia.', members: [{ nick: 'a' }, { nick: 'b' }, { nick: 'c' }] };
const PID = 'abcdefghjk';
const PLAYER = { pid: PID, nick: 'kpital', level: 12, kills: 34, deaths: 10, playMinutes: 750, group: { name: 'Biriri', tag: 'BRR', slug: 'biriri' } };

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  calls.push({ url, input, init });
  const u = new URL(url);
  if (u.hostname === 'havokrust.xyz' && u.pathname === '/index.html') {
    if (indexDown) throw new Error('pages fora');
    return new Response(INDEX, { headers: { 'content-type': 'text/html' } });
  }
  if (u.hostname === 'havokrust.xyz' && u.pathname === '/og-data.json') {
    if (ogDown) return new Response('nope', { status: 503 });
    return new Response(OGDATA, { headers: { 'content-type': 'application/json' } });
  }
  if (u.hostname === 'api.havokrust.xyz') return api(u, init);
  return new Response(`direto:${u.pathname}`, { status: 200, headers: { 'x-pages': '1' } });
};

beforeEach(() => {
  calls = []; indexDown = false; ogDown = false;
  api = (u) => {
    if (u.pathname === '/api/group/biriri') return Response.json(GROUP);
    if (u.pathname === `/api/player/${PID}`) return Response.json(PLAYER);
    return Response.json({ error: 'not_found' }, { status: 404 });
  };
});

const get = (path, init) => worker.fetch(new Request(`https://havokrust.xyz${path}`, init), {});
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function metas(html) {
  const head = html.split('</head>')[0];
  const all = (re) => [...head.matchAll(re)].map((m) => unesc(m[1]));
  const one = (attr, key) => {
    const v = all(new RegExp(`<meta ${attr}="${key.replace(/:/g, ':')}" content="([^"]*)"`, 'g'));
    assert.ok(v.length <= 1, `${key} repetido: ${v.length}`);
    return v[0];
  };
  const titles = all(/<title>([^<]*)<\/title>/g);
  assert.equal(titles.length, 1, 'um <title> só');
  const canon = all(/<link rel="canonical" href="([^"]*)"/g);
  assert.equal(canon.length, 1, 'um canonical só');
  return {
    title: titles[0], canonical: canon[0], description: one('name', 'description'), robots: one('name', 'robots'),
    ogTitle: one('property', 'og:title'), ogDesc: one('property', 'og:description'), ogImage: one('property', 'og:image'),
    ogUrl: one('property', 'og:url'), locale: one('property', 'og:locale'), card: one('name', 'twitter:card'),
    twTitle: one('name', 'twitter:title'), twImage: one('name', 'twitter:image'), ogWidth: one('property', 'og:image:width'),
  };
}

// //------------------- rotas -------------------\\
test('isPageRoute: só as páginas da tabela, nunca arquivos', () => {
  for (const p of ['/', '/wiki', '/wiki/', '/wiki/itens', '/wiki/item/c4', '/wiki/categoria/weapons', '/wiki/guia/base-building', '/wiki/faq',
    '/mapa', '/ranking', '/ranking/', '/wipe', '/grupo/biriri', '/jogador/abcdefghjk', '/loja', '/badges', '/perfil', '/ac/123']) {
    assert.equal(isPageRoute(p), true, p);
  }
  for (const p of ['/media/hero.webp', '/img/logo.png', '/icons/c4.png', '/play/', '/play/index.html', '/app.js', '/style.css',
    '/badges/founder.svg', '/og/ranking.jpg', '/og-data.json', '/index.html', '/404.html', '/grupo/', '/jogador', '/ac', '/favicon.png', '/wiki/item/x.png', '/rankingx']) {
    assert.equal(isPageRoute(p), false, p);
  }
});

test('www redireciona 301 para o domínio raiz mantendo caminho e query', async () => {
  const res = await worker.fetch(new Request('https://www.havokrust.xyz/grupo/biriri?aba=membros'), {});
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://havokrust.xyz/grupo/biriri?aba=membros');
  assert.equal(calls.length, 0);
});

test('caminho fora das rotas (asset) não é tocado: vai direto ao Pages', async () => {
  for (const p of ['/media/hero.webp', '/badges/founder.svg', '/play/', '/app.js']) {
    calls = [];
    const req = new Request(`https://havokrust.xyz${p}`);
    const res = await worker.fetch(req, {});
    assert.equal(await res.text(), `direto:${p}`);
    assert.equal(res.headers.get('x-pages'), '1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, req, 'o mesmo Request, sem mexer');
  }
});

test('POST numa rota de página também passa direto', async () => {
  const res = await get('/perfil', { method: 'POST', body: 'x' });
  assert.equal(await res.text(), 'direto:/perfil');
});

// //------------------- páginas fixas -------------------\\
test('/ranking: textos próprios, imagem da seção com versão, pt_BR e canonical', async () => {
  const res = await get('/ranking?scope=all');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  const m = metas(html);
  assert.equal(m.title, 'Ranking HAVOK — quem manda no wipe?');
  assert.equal(m.ogTitle, m.title);
  assert.equal(m.twTitle, m.title);
  assert.match(m.description, /abates, tempo de jogo e K\/D/);
  assert.equal(m.ogDesc, m.description);
  assert.match(m.ogImage, /^https:\/\/havokrust\.xyz\/og\/ranking\.jpg\?v=[0-9a-f]{8}$/);
  assert.equal(m.twImage, m.ogImage);
  assert.equal(m.ogUrl, 'https://havokrust.xyz/ranking');
  assert.equal(m.canonical, 'https://havokrust.xyz/ranking');
  assert.equal(m.locale, 'pt_BR');
  assert.equal(m.card, 'summary_large_image');
  assert.equal(m.ogWidth, '1200');
  // o resto do index.html continua igual
  assert.ok(html.includes('id="menuBtn"'));
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('<meta name="theme-color" content="#ff6a00">'));
  assert.ok(!html.includes('content="https://havokrust.xyz/og.jpg'), 'a imagem antiga sumiu das metas');
});

test('home, wipe, mapa, loja, badges: cada uma com título e imagem próprios', async () => {
  const want = { '/': 'home', '/wipe': 'wipe', '/mapa': 'mapa', '/loja': 'loja', '/badges': 'badges' };
  const titles = new Set();
  for (const [p, sec] of Object.entries(want)) {
    const m = metas(await (await get(p)).text());
    assert.match(m.ogImage, new RegExp(`/og/${sec}\\.jpg\\?v=`), p);
    assert.equal(m.ogUrl, `https://havokrust.xyz${p}`);
    titles.add(m.title);
  }
  assert.equal(titles.size, 5);
});

test('/perfil e /ac/<id> não são indexados', async () => {
  for (const p of ['/perfil', '/ac/42']) {
    const html = await (await get(p)).text();
    assert.equal(metas(html).robots, 'noindex', p);
    assert.equal((html.match(/name="robots"/g) || []).length, 1);
  }
});

// //------------------- wiki -------------------\\
test('/wiki/item/<id>: nome, descrição e ícone do item (cartão pequeno)', async () => {
  const m = metas(await (await get('/wiki/item/assault-rifle')).text());
  assert.equal(m.title, 'Rifle de Assalto — Wiki HAVOK');
  assert.match(m.description, /^O fuzil de cabeceira/);
  assert.equal(m.ogImage, 'https://havokrust.xyz/icons/assault-rifle.png');
  assert.equal(m.card, 'summary');
  assert.equal(m.ogWidth, undefined, 'ícone não é 1200x630');
});

test('/wiki/item inexistente e item sem ícone: textos da wiki', async () => {
  const m = metas(await (await get('/wiki/item/nao-existe')).text());
  assert.equal(m.title, 'Wiki do HAVOK — itens, receitas e guias');
  const data = JSON.parse(OGDATA);
  const semIcone = Object.entries(data.items).find(([, it]) => !it.i);
  if (semIcone) {
    const m2 = metas(await (await get(`/wiki/item/${semIcone[0]}`)).text());
    assert.equal(m2.title, `${semIcone[1].n} — Wiki HAVOK`);
    assert.match(m2.ogImage, /\/og\/wiki\.jpg/);
  }
});

test('categoria, guia, itens, veículos e faq têm título próprio', async () => {
  assert.equal(metas(await (await get('/wiki/categoria/weapons')).text()).title, 'Armas — Wiki HAVOK');
  assert.equal(metas(await (await get('/wiki/guia/getting-started')).text()).title, 'Tela e Teclas — Guia do HAVOK');
  const itens = metas(await (await get('/wiki/itens')).text());
  assert.equal(itens.title, 'Todos os itens — Wiki HAVOK');
  assert.match(itens.description, /^\d+ itens/);
  assert.match(metas(await (await get('/wiki/veiculos')).text()).description, /^\d+ veículos/);
  assert.equal(metas(await (await get('/wiki/faq')).text()).title, 'Perguntas frequentes — HAVOK');
});

test('/wiki/categoria/cosmeticos: galeria de roupas com texto próprio', async () => {
  const m = metas(await (await get('/wiki/categoria/cosmeticos')).text());
  assert.equal(m.title, 'Cosméticos — Wiki HAVOK');
  assert.match(m.description, /^\d+ roupas e acessórios/);
});

// //------------------- grupo e jogador (API) -------------------\\
test('/grupo/<slug>: tag, nome, posição, membros e abates da API', async () => {
  const m = metas(await (await get('/grupo/biriri')).text());
  assert.equal(m.title, '[BRR] Biriri — #1 no wipe · 3 membros · 1.234 abates');
  assert.match(m.description, /Os donos da praia\./);
  assert.match(m.ogImage, /\/og\/grupo\.jpg\?v=/);
  assert.ok(calls.some((c) => c.url === 'https://api.havokrust.xyz/api/group/biriri'));
});

test('/jogador/<pid>: nick, nível, abates e grupo da API', async () => {
  const m = metas(await (await get(`/jogador/${PID}`)).text());
  assert.equal(m.title, 'kpital — nível 12, 34 abates, [BRR] Biriri');
  assert.match(m.description, /K\/D 3,4 · 12 h de jogo/);
  assert.match(m.ogImage, /\/og\/jogador\.jpg/);
});

test('singular e sem grupo', () => {
  assert.equal(groupMeta({ name: 'Solo', members: [{}], kills: 1, rank: 0 }).title, 'Solo — 1 membro · 1 abate');
  assert.equal(playerMeta({ nick: 'x', level: 1, kills: 1, deaths: 0, playMinutes: 0, group: null }).title, 'x — nível 1, 1 abate, sem grupo');
});

test('API fora do ar, com erro ou lenta: texto padrão, 200', async () => {
  api = () => { throw new TypeError('rede'); };
  let res = await get('/grupo/biriri');
  assert.equal(res.status, 200);
  assert.equal(metas(await res.text()).title, 'Grupo — HAVOK');

  api = () => new Response('erro', { status: 500 });
  assert.equal(metas(await (await get(`/jogador/${PID}`)).text()).title, 'Jogador — HAVOK');

  api = () => new Response('<html>não é json', { status: 200 });
  assert.equal(metas(await (await get('/grupo/biriri')).text()).title, 'Grupo — HAVOK');

  // nunca responde: o timeout curto corta
  api = (u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason)));
  const t0 = Date.now();
  res = await get('/grupo/biriri');
  assert.equal(metas(await res.text()).title, 'Grupo — HAVOK');
  assert.ok(Date.now() - t0 < 4000, 'não espera a API para sempre');
});

test('slug/pid inválido nem chama a API', async () => {
  await get('/grupo/..%2F..%2Fapi%2Fme');
  await get('/jogador/<script>');
  assert.ok(!calls.some((c) => c.url.startsWith('https://api.havokrust.xyz')));
});

test('HTML escapado: nome de grupo com <script> não injeta nada', async () => {
  api = () => Response.json({ ...GROUP, name: '<script>alert(1)</script>', tag: '"><img src=x onerror=alert(2)>', description: "it's <b>&</b>" });
  const html = await (await get('/grupo/biriri')).text();
  const head = html.split('</head>')[0];
  assert.ok(!head.includes('<script>alert'), 'sem <script> cru');
  assert.ok(!head.includes('<img src=x'), 'sem tag injetada pelo atributo');
  assert.ok(!/content="[^"]*"><img/.test(head));
  assert.ok(head.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  const m = metas(html);
  assert.ok(m.title.includes('<script>alert(1)</script>'), 'o texto continua lá, só escapado');
});

// //------------------- falhas -------------------\\
test('og-data.json fora: textos fixos continuam, imagem sem versão', async () => {
  ogDown = true;
  const m = metas(await (await get('/ranking')).text());
  assert.equal(m.title, 'Ranking HAVOK — quem manda no wipe?');
  assert.equal(m.ogImage, 'https://havokrust.xyz/og/ranking.jpg');
  assert.equal(metas(await (await get('/wiki/item/assault-rifle')).text()).title, 'Wiki do HAVOK — itens, receitas e guias');
});

test('index.html fora: o pedido vai direto ao Pages (que responde com o 404.html = site)', async () => {
  indexDown = true;
  const res = await get('/ranking');
  assert.equal(await res.text(), 'direto:/ranking');
});

test('HTMLRewriter quebrado: devolve o index.html original com 200', async () => {
  const Real = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class { on() { return this; } transform() { throw new Error('boom'); } };
  try {
    const res = await get('/ranking');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-havok-og'), 'fallback');
    assert.equal(await res.text(), INDEX);
  } finally { globalThis.HTMLRewriter = Real; }
});

test('HEAD responde sem corpo', async () => {
  const res = await get('/ranking', { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '');
});

test('metaFor nunca lança, mesmo com caminho estranho e sem dados', async () => {
  for (const p of ['/wiki/item/%E0%A4%A', '/grupo/%', '/jogador/', '/wiki/categoria/']) {
    const m = await metaFor(p, null);
    assert.ok(m.title && m.image);
  }
});

// //------------------- arquivos gerados -------------------\\
test('og-data.json cobre a wiki e todas as imagens de seção existem', () => {
  const data = JSON.parse(OGDATA);
  global.window = {};
  // eslint-disable-next-line no-new-func
  new Function('window', readFileSync(new URL('data.js', ROOT), 'utf8'))(global.window);
  const W = global.window.WIKI;
  assert.deepEqual(Object.keys(data.items).sort(), W.items.map((i) => i.id).sort());
  assert.deepEqual(Object.keys(data.guides).sort(), W.guides.map((g) => g.slug).sort());
  for (const sec of ['home', 'wiki', 'ranking', 'wipe', 'mapa', 'loja', 'grupo', 'jogador', 'badges']) {
    assert.ok(data.images[sec], sec);
    assert.ok(existsSync(new URL(data.images[sec].split('?')[0], ROOT)), sec);
  }
  for (const it of Object.values(data.items)) if (it.i) assert.ok(existsSync(new URL(it.i, ROOT)), it.i);
  assert.equal(readFileSync(new URL('404.html', ROOT), 'utf8'), INDEX, '404.html = index.html (rode node tools/build-og-data.mjs)');
});
