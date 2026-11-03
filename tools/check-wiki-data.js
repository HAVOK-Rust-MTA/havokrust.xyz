// Confere o data.js gerado do jeito que o app.js usa: carrega window.WIKI e procura referência quebrada.
//   node tools/check-wiki-data.js        (sai com código 1 se achar erro)
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..');
global.window = {};
require(path.join(SITE, 'data.js'));
const W = window.WIKI;
const errs = [];
const err = (m) => errs.push(m);

for (const k of ['items', 'guides', 'faq', 'media', 'vehicles']) if (!W[k]) err('falta WIKI.' + k);
const byId = Object.fromEntries(W.items.map((i) => [i.id, i]));
if (Object.keys(byId).length !== W.items.length) err('id de item repetido');
const has = (id, where) => { if (!byId[id]) err(`${where}: item inexistente "${id}"`); };

// os mesmos campos que o app.js lê
const CATS = ['weapons', 'tools', 'resources', 'components', 'ammo', 'food-medical', 'armor-clothing', 'clothing', 'building', 'constructions'];
for (const it of W.items) {
  const w = `item ${it.id}`;
  if (!it.name || !it.name.en || !it.name.pt) err(`${w}: sem nome en/pt`);
  if (!it.desc || typeof it.desc.en !== 'string' || typeof it.desc.pt !== 'string') err(`${w}: sem desc`);
  if (!CATS.includes(it.cat)) err(`${w}: categoria "${it.cat}" que o app não conhece`);
  if (!it.type) err(`${w}: sem type`);
  if (it.icon && !fs.existsSync(path.join(SITE, it.icon))) err(`${w}: ícone não existe ${it.icon}`);
  (it.recipe || []).forEach((r) => has(r.id, w + ' recipe'));
  (it.recycler || []).forEach((r) => has(r.id, w + ' recycler'));
  (it.usedIn || []).forEach((x) => has(x, w + ' usedIn'));
  (it.ammoFor || []).forEach((x) => has(x, w + ' ammoFor'));
  if (it.upgradeTo) has(it.upgradeTo, w + ' upgradeTo');
  if (it.furnace) has(it.furnace.to, w + ' furnace');
  if (it.weapon && it.weapon.ammo) has(it.weapon.ammo, w + ' weapon.ammo');
  if (it.limit && (typeof it.limit.en !== 'string' || typeof it.limit.pt !== 'string')) err(`${w}: limit sem en/pt`);
  if (/^(Camisa|Calca|Sapato|Chapeu) \d+$/.test(it.key)) err(`${w}: roupa antiga do CJ`);
}
const slugs = new Set();
for (const g of W.guides) {
  if (slugs.has(g.slug)) err('guia repetido ' + g.slug);
  slugs.add(g.slug);
  for (const l of ['en', 'pt']) if (!g[l] || !g[l].title || !g[l].description || !g[l].body) err(`guia ${g.slug}: falta ${l}`);
}
for (const m of W.media) if (!slugs.has(m.guide)) err('mídia aponta para guia inexistente: ' + m.id);
for (const l of ['en', 'pt']) if (!Array.isArray(W.faq[l]) || W.faq[l].some((q) => q.length !== 2)) err('faq ' + l);
if (W.vehicles.some((v) => /dune/i.test(v.name))) err('Dune ainda está nos veículos');
for (const v of W.vehicles) if (!fs.existsSync(path.join(SITE, 'vehicles', v.id + '.webp'))) err(`veículo ${v.id} sem foto vehicles/${v.id}.webp`);
for (const c of W.cosmetics || []) for (const x of c.items) if (x.image && !fs.existsSync(path.join(SITE, x.image))) err('cosmético sem imagem ' + x.image);
for (const s of W.shop || []) for (const x of s.items) { if (x.id) has(x.id, 'loja ' + s.id); if (!(x.price > 0)) err('loja sem preço ' + JSON.stringify(x)); }
const cos = new Set((W.cosmetics || []).flatMap((c) => c.items.map((x) => x.id)));
for (const m of W.missions || []) for (const r of [...m.requires, ...m.rewards]) {
  if (r.id) has(r.id, 'missão ' + m.id); else if (r.cosmetic) { if (!cos.has(r.cosmetic)) err('missão ' + m.id + ': cosmético ' + r.cosmetic); } else err('missão ' + m.id + ': item sem id ' + JSON.stringify(r));
}

const n = (f) => W.items.filter(f).length;
console.log(`itens ${W.items.length} · com receita ${n((i) => i.recipe)} · com preço ${n((i) => i.shop)} · em breve ${n((i) => i.soon)} · guias ${W.guides.length} · cosméticos ${cos.size} · veículos ${W.vehicles.length}`);
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('ok');
