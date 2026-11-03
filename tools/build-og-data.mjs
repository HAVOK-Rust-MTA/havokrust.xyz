#!/usr/bin/env node
// Gera og-data.json (o que o Worker de preview, site/, precisa para montar o título/descrição/imagem de cada página)
// e o 404.html (cópia do index.html: se o Worker estiver fora, o GitHub Pages ainda abre o site em /wiki, /ranking...).
//
//   node tools/build-og-data.mjs
//
// Re-executável: rode de novo sempre que data.js, index.html ou as imagens de og/ mudarem, e commite o resultado.
// Lê data.js como o navegador lê (window.WIKI); as categorias vêm de WIKI.categories se existir, senão do CATS do app.js.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(ROOT + f, 'utf8');

// //------------------- wiki -------------------\\
const sandbox = { window: {} };
vm.runInNewContext(read('data.js'), sandbox, { filename: 'data.js' });
const W = sandbox.window.WIKI;
if (!W || !Array.isArray(W.items)) throw new Error('data.js sem window.WIKI.items');

const pt = (o) => (o && typeof o === 'object' ? o.pt || o.en || '' : String(o || ''));
const plain = (s) => String(s || '').replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

// descrição curta: até ~200 caracteres, cortando no fim de uma frase se der, senão na palavra
export function short(s, max = 200) {
  s = plain(s);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (dot > max * 0.5) return cut.slice(0, dot + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
}

function categories() {
  if (Array.isArray(W.categories)) return W.categories;
  // o CATS do app.js é uma lista literal: avalia só ela
  const m = read('app.js').match(/const CATS = (\[[\s\S]*?\]);/);
  return m ? vm.runInNewContext(m[1]) : [];
}

const items = {};
for (const it of W.items) {
  if (!it || !it.id) continue;
  items[it.id] = { n: plain(pt(it.name)), d: short(pt(it.desc)), i: it.icon || null, c: it.cat || null };
}
const cats = {};
for (const c of categories()) {
  cats[c.id] = { n: c.pt || c.en || c.id, count: W.items.filter((it) => it.cat === c.id).length };
}
// galeria de cosméticos (/wiki/categoria/cosmeticos): não é categoria de item, tem texto próprio
const nCos = (W.cosmetics || []).reduce((a, c) => a + (c.items || []).length, 0);
if (nCos) cats.cosmeticos = { n: 'Cosméticos', count: nCos, d: `${nCos} roupas e acessórios para o personagem no HAVOK: camisas, calças, bonés, óculos e mochilas, com raridade e onde conseguir.` };
const guides = {};
for (const g of W.guides || []) {
  const l = g.pt || g.en || {};
  guides[g.slug] = { t: plain(l.title), d: short(l.description) };
}

// //------------------- imagens (carimbo de versão: imagem nova = URL nova, o Discord não usa a antiga) -------------------\\
const images = {};
if (existsSync(ROOT + 'og')) {
  for (const f of readdirSync(ROOT + 'og').filter((f) => f.endsWith('.jpg')).sort()) {
    const h = createHash('sha256').update(readFileSync(ROOT + 'og/' + f)).digest('hex').slice(0, 8);
    images[f.replace(/\.jpg$/, '')] = `og/${f}?v=${h}`;
  }
}

const out = { items, cats, guides, images, vehicles: (W.vehicles || []).length };
writeFileSync(ROOT + 'og-data.json', JSON.stringify(out) + '\n');

// //------------------- 404.html = index.html -------------------\\
// o GitHub Pages devolve o 404.html para qualquer caminho que não existe; sendo o próprio site, o roteador abre a página certa
writeFileSync(ROOT + '404.html', read('index.html'));

console.log(`og-data.json: ${Object.keys(items).length} itens, ${Object.keys(cats).length} categorias, ${Object.keys(guides).length} guias, ${Object.keys(images).length} imagens; 404.html copiado do index.html`);
