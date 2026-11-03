// Tudo do havok-site (o index.js só liga o handle): separado porque o workerd trata cada export do módulo
// principal como ponto de entrada e recusa constantes exportadas.
export const SITE = 'https://havokrust.xyz';
export const API = 'https://api.havokrust.xyz';
const SITE_NAME = 'HAVOK — Rust Survival';
const API_TIMEOUT_MS = 1500;
const SLUG_RE = /^[a-z0-9-]{1,48}$/;
const PID_RE = /^[a-km-np-z2-9]{10}$/;

// //------------------- rotas -------------------\\
// as mesmas do wrangler.toml; páginas com um nível só aceitam também a barra no fim
const EXACT = new Set(['/', '/mapa', '/ranking', '/wipe', '/loja', '/badges', '/perfil']);
const PREFIX = ['/grupo/', '/jogador/', '/ac/'];

export function isPageRoute(path) {
  if (/\.[a-z0-9]{1,5}$/i.test(path)) return false; // arquivo (imagem, .js, .css...): nunca é página
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (EXACT.has(p)) return true;
  if (p === '/wiki' || p.startsWith('/wiki/')) return true;
  return PREFIX.some((x) => p.startsWith(x) && p.length > x.length);
}

// //------------------- textos -------------------\\
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n) => {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};
// 12345 -> "12.345" (sem depender do Intl)
const num = (n) => String(Math.max(0, Math.floor(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const plural = (n, one, many) => `${num(n)} ${Number(n) === 1 ? one : many}`;

// seção -> imagem com o carimbo de versão do og-data.json (sem ele, sem o carimbo)
const img = (data, sec) => `${SITE}/${(data && data.images && data.images[sec]) || `og/${sec}.jpg`}`;

const DEFAULT = {
  title: 'HAVOK — Rust Survival no MTA:SA',
  description: 'Servidor de sobrevivência estilo Rust no MTA: San Andreas. Acorde sem nada, farme, monte sua base, junte seu grupo e dê raid. Entre de graça.',
  sec: 'home',
  alt: 'HAVOK — acorde sem nada, saia dono do mapa',
};

// textos fixos por página (pensados para quem vê o link no Discord e decide se clica)
const FIXED = {
  '/': DEFAULT,
  '/wiki': {
    title: 'Wiki do HAVOK — itens, receitas e guias',
    description: 'Todos os itens, receitas, blueprints e sistemas do servidor, conferidos com o jogo. Descubra o que craftar, onde lootar e como sobreviver à primeira noite.',
    sec: 'wiki', alt: 'Wiki do HAVOK: todo item, toda receita',
  },
  '/wiki/itens': {
    title: 'Todos os itens — Wiki HAVOK',
    description: '{items} itens do HAVOK com receita, onde achar, quanto rende na reciclagem e para que servem.',
    sec: 'wiki', alt: 'Wiki do HAVOK: todo item, toda receita',
  },
  '/wiki/veiculos': {
    title: 'Veículos — Wiki HAVOK',
    description: '{vehicles} veículos do servidor: onde nascem, porta-malas, combustível e as peças que cada um precisa para andar.',
    sec: 'wiki', alt: 'Wiki do HAVOK',
  },
  '/wiki/guias': {
    title: 'Guias — Wiki HAVOK',
    description: 'Guias práticos do HAVOK: primeiros passos, coleta, loot, fabricação, construção de base, combate e raid.',
    sec: 'wiki', alt: 'Wiki do HAVOK',
  },
  '/wiki/faq': {
    title: 'Perguntas frequentes — HAVOK',
    description: 'Como entrar no servidor, o que fazer nos primeiros minutos, como funciona o wipe, o VIP e os grupos. As dúvidas de todo mundo que começa.',
    sec: 'wiki', alt: 'Wiki do HAVOK',
  },
  '/mapa': {
    title: 'Mapa do HAVOK — monumentos, loot e eventos',
    description: 'Mapa interativo do servidor: monumentos, zonas de radiação, base militar, postos e onde cai o airdrop. Planeje a rota antes de sair de casa.',
    sec: 'mapa', alt: 'Mapa interativo do HAVOK',
  },
  '/ranking': {
    title: 'Ranking HAVOK — quem manda no wipe?',
    description: 'Os melhores jogadores e grupos do wipe atual e de todos os tempos, por abates, tempo de jogo e K/D. Seu nome está aí?',
    sec: 'ranking', alt: 'Ranking do HAVOK: quem manda no wipe?',
  },
  '/wipe': {
    title: 'Wipe do HAVOK — quando o mapa zera',
    description: 'Contagem para o próximo wipe, o que muda no novo ciclo e quem dominou o último. Todo mundo recomeça do zero: a corrida vale desde o primeiro minuto.',
    sec: 'wipe', alt: 'Wipe do HAVOK: o mapa zera',
  },
  '/loja': {
    title: 'Loja VIP — HAVOK',
    description: 'Três planos VIP, de mais XP e vaga reservada até uma base lendária. Apoie o servidor e sobreviva com estilo.',
    sec: 'loja', alt: 'Loja VIP do HAVOK: jogue com presença',
  },
  '/badges': {
    title: 'Badges do HAVOK',
    description: 'Todas as badges do servidor e como conseguir cada uma: conquistas do jogo, do wipe e do Discord que aparecem no seu perfil.',
    sec: 'badges', alt: 'Badges do HAVOK',
  },
  '/perfil': {
    title: 'Seu perfil — HAVOK',
    description: 'Entre com o Discord, vincule sua conta do jogo e mostre seus números, seu grupo e suas badges no site.',
    sec: 'jogador', alt: 'Perfil no HAVOK', robots: 'noindex',
  },
};

async function getJson(url, ms = API_TIMEOUT_MS) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), cf: { cacheTtl: 60 }, headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const GROUP_DEFAULT = {
  title: 'Grupo — HAVOK',
  description: 'Grupo do HAVOK, servidor de sobrevivência estilo Rust no MTA:SA. Veja os membros, os abates e a posição no ranking do wipe.',
  sec: 'grupo', alt: 'Grupos do HAVOK',
};
const PLAYER_DEFAULT = {
  title: 'Jogador — HAVOK',
  description: 'Perfil de sobrevivente no HAVOK, servidor estilo Rust no MTA:SA: nível, abates, grupo e badges.',
  sec: 'jogador', alt: 'Perfil de jogador no HAVOK',
};

export function groupMeta(g) {
  const name = clip(g.name, 40) || 'Grupo';
  const head = g.tag ? `[${clip(g.tag, 8)}] ${name}` : name;
  const members = Array.isArray(g.members) ? g.members.length : Number(g.members) || 0;
  const parts = [];
  if (Number(g.rank) > 0) parts.push(`#${num(g.rank)} no wipe`);
  parts.push(plural(members, 'membro', 'membros'));
  parts.push(plural(g.kills, 'abate', 'abates'));
  const about = clip(g.description, 140);
  return {
    title: `${head} — ${parts.join(' · ')}`,
    description: about ? `${about} · Grupo do HAVOK, sobrevivência estilo Rust no MTA:SA.` : GROUP_DEFAULT.description,
    sec: 'grupo', alt: `Grupo ${head} no HAVOK`,
  };
}

export function playerMeta(p) {
  const nick = clip(p.nick, 32) || 'Jogador';
  const g = p.group;
  const group = g && g.name ? (g.tag ? `[${clip(g.tag, 8)}] ${clip(g.name, 32)}` : clip(g.name, 32)) : 'sem grupo';
  const kd = Math.round((Number(p.kills) || 0) / Math.max(Number(p.deaths) || 0, 1) * 100) / 100;
  const hours = Math.floor((Number(p.playMinutes) || 0) / 60);
  return {
    title: `${nick} — nível ${num(p.level)}, ${plural(p.kills, 'abate', 'abates')}, ${group}`,
    description: `K/D ${String(kd).replace('.', ',')} · ${hours} h de jogo neste wipe. Perfil de sobrevivente no HAVOK, servidor estilo Rust no MTA:SA.`,
    sec: 'jogador', alt: `Perfil de ${nick} no HAVOK`,
  };
}

const fill = (s, data) => s.replace('{items}', num(data ? Object.keys(data.items || {}).length : 0)).replace('{vehicles}', num(data && data.vehicles));

// meta da rota: {title, description, image, alt, card, robots?}. Nunca lança: na dúvida, o texto padrão da seção.
export async function metaFor(path, data) {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const parts = p.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return ''; } });
  const page = (m) => ({ card: 'summary_large_image', ...m, image: m.image || img(data, m.sec) });

  if (FIXED[p]) {
    const f = FIXED[p];
    if (f.description.includes('{') && !data) return page({ ...FIXED['/wiki'] });
    return page({ ...f, description: fill(f.description, data) });
  }

  if (parts[0] === 'wiki') {
    const d = data || {};
    if (parts[1] === 'item' && d.items && d.items[parts[2]]) {
      const it = d.items[parts[2]];
      const cat = d.cats && d.cats[it.c];
      const m = {
        title: `${clip(it.n, 60)} — Wiki HAVOK`,
        description: it.d || `${it.n}${cat ? ` (${cat.n})` : ''}: receita, onde achar e para que serve no HAVOK.`,
        sec: 'wiki', alt: it.n,
      };
      // ícone do item (quadrado): cartão pequeno com a imagem ao lado, que é como ícone fica bonito no Discord
      if (it.i) return page({ ...m, image: `${SITE}/${it.i}`, card: 'summary', square: true });
      return page(m);
    }
    if (parts[1] === 'categoria' && d.cats && d.cats[parts[2]]) {
      const c = d.cats[parts[2]];
      return page({
        title: `${c.n} — Wiki HAVOK`,
        description: c.d || `${plural(c.count, 'item', 'itens')} de ${c.n.toLowerCase()} no HAVOK: receitas, onde achar e para que serve cada um.`,
        sec: 'wiki', alt: `${c.n} na wiki do HAVOK`,
      });
    }
    if (parts[1] === 'guia' && d.guides && d.guides[parts[2]]) {
      const g = d.guides[parts[2]];
      return page({ title: `${clip(g.t, 70)} — Guia do HAVOK`, description: g.d || FIXED['/wiki/guias'].description, sec: 'wiki', alt: g.t });
    }
    return page({ ...FIXED['/wiki'] });
  }

  if (parts[0] === 'grupo') {
    const slug = (parts[1] || '').toLowerCase();
    if (!SLUG_RE.test(slug)) return page(GROUP_DEFAULT);
    try { return page(groupMeta(await getJson(`${API}/api/group/${slug}`))); } catch { return page(GROUP_DEFAULT); }
  }

  if (parts[0] === 'jogador') {
    const pid = parts[1] || '';
    if (!PID_RE.test(pid)) return page(PLAYER_DEFAULT);
    try { return page(playerMeta(await getJson(`${API}/api/player/${pid}`))); } catch { return page(PLAYER_DEFAULT); }
  }

  if (parts[0] === 'ac') {
    return page({ title: 'Gravação do anticheat — HAVOK', description: 'Gravação interna da staff do HAVOK.', sec: 'home', alt: 'HAVOK', robots: 'noindex' });
  }
  return page(DEFAULT);
}

// //------------------- HTML -------------------\\
// bloco que entra no lugar do <title>: tudo escapado aqui (o HTMLRewriter recebe HTML pronto)
export function headBlock(m, url) {
  const T = esc(clip(m.title, 110)), D = esc(clip(m.description, 220)), U = esc(url), I = esc(m.image), A = esc(clip(m.alt || m.title, 120));
  const type = /\.png(\?|$)/i.test(m.image) ? 'image/png' : 'image/jpeg';
  const size = m.square ? '' : '\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">';
  return `<title>${T}</title>
  <meta name="description" content="${D}">
  <link rel="canonical" href="${U}">${m.robots ? `\n  <meta name="robots" content="${esc(m.robots)}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:title" content="${T}">
  <meta property="og:description" content="${D}">
  <meta property="og:url" content="${U}">
  <meta property="og:image" content="${I}">
  <meta property="og:image:secure_url" content="${I}">
  <meta property="og:image:type" content="${type}">${size}
  <meta property="og:image:alt" content="${A}">
  <meta name="twitter:card" content="${m.card === 'summary' ? 'summary' : 'summary_large_image'}">
  <meta name="twitter:title" content="${T}">
  <meta name="twitter:description" content="${D}">
  <meta name="twitter:image" content="${I}">
  <meta name="twitter:image:alt" content="${A}">`;
}

// tags do index.html que o bloco substitui (as outras ficam como estão)
function managed(el, robots) {
  const name = (el.getAttribute('name') || '').toLowerCase();
  const prop = (el.getAttribute('property') || '').toLowerCase();
  return name === 'description' || name.startsWith('twitter:') || prop.startsWith('og:') || (robots && name === 'robots');
}

export function rewrite(res, block, robots) {
  let done = false;
  return new HTMLRewriter()
    .on('title', { element(el) { if (done) el.remove(); else { el.replace(block, { html: true }); done = true; } } })
    .on('meta', { element(el) { if (managed(el, robots)) el.remove(); } })
    .on('link', { element(el) { if ((el.getAttribute('rel') || '').toLowerCase() === 'canonical') el.remove(); } })
    .on('head', { element(el) { el.onEndTag((end) => { if (!done) { end.before(block, { html: true }); done = true; } }); } })
    .transform(res);
}

// URL canônica: domínio raiz, sem query, sem barra no fim
export function canonical(url) {
  const p = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
  return SITE + p;
}

const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' };

export async function handle(request, env = {}) {
  const url = new URL(request.url);
  if (url.hostname.startsWith('www.')) {
    return new Response(null, { status: 301, headers: { location: SITE + url.pathname + url.search, 'cache-control': 'public, max-age=86400' } });
  }
  if ((request.method !== 'GET' && request.method !== 'HEAD') || !isPageRoute(url.pathname)) return fetch(request);

  const origin = env.ORIGIN || SITE;
  const [index, data] = await Promise.all([
    fetch(`${origin}/index.html`, { cf: { cacheTtl: 60, cacheEverything: true } }).catch(() => null),
    fetch(`${origin}/og-data.json`, { cf: { cacheTtl: 300, cacheEverything: true } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  // sem o index.html não há o que trocar: o próprio Pages responde (o 404.html dele é o site)
  if (!index || !index.ok) return fetch(request);
  const html = await index.text();
  const plain = () => new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: { ...HTML_HEADERS, 'x-havok-og': 'fallback' } });

  try {
    const meta = await metaFor(url.pathname, data);
    const out = rewrite(new Response(html, { headers: HTML_HEADERS }), headBlock(meta, canonical(url)), !!meta.robots);
    const body = await out.text(); // inteiro aqui: se o HTMLRewriter falhar, ainda dá para devolver o original
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: { ...HTML_HEADERS, 'x-havok-og': meta.sec || 'page' } });
  } catch {
    return plain();
  }
}
