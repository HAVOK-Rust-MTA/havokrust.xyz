// Rotas do site (History API). Tabela fixa: ~/src/havok-wiki-notes/briefs/01-rotas.md.
// Arquivo à parte (sem depender do resto) para o app.js usar e o teste (site/routes.test.mjs) carregar no Node.
//
//   HavokRoutes.parse('/wiki/item/c4')  -> { page: 'item', id: 'c4' }
//   HavokRoutes.fromHash('#/items/c4')  -> '/wiki/item/c4'   (links antigos com # que circulam no Discord)
//   HavokRoutes.isApp('/wiki/item/c4')  -> true               (link interno que o roteador abre sem recarregar)
(function (root) {
  'use strict';

  const dec = (s) => {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  };

  // caminho -> página. Página desconhecida = 'notfound' (o roteador mostra o 404 bonito, sem recarregar)
  function parse(pathname) {
    const parts = String(pathname || '/').split('?')[0].split('/').filter(Boolean).map(dec);
    const [a, b, c] = parts;
    const n = parts.length;
    if (!n) return { page: 'home' };
    if (a === 'wiki') {
      if (n === 1) return { page: 'wiki' };
      if (b === 'itens' && n === 2) return { page: 'items' };
      if (b === 'categoria' && c && n === 3) return { page: 'category', id: c };
      if (b === 'item' && c && n === 3) return { page: 'item', id: c };
      if (b === 'veiculos' && n === 2) return { page: 'vehicles' };
      if (b === 'guias' && n === 2) return { page: 'guides' };
      if (b === 'guia' && c && n === 3) return { page: 'guide', id: c };
      if (b === 'faq' && n === 2) return { page: 'faq' };
      return { page: 'notfound' };
    }
    if (n === 1) {
      const fixed = { mapa: 'map', ranking: 'ranking', wipe: 'wipe', loja: 'store', badges: 'badges', perfil: 'perfil' };
      if (fixed[a]) return { page: fixed[a] };
    }
    if (n === 2 && b) {
      if (a === 'grupo') return { page: 'group', id: b };
      if (a === 'jogador') return { page: 'player', id: b };
      if (a === 'ac') return { page: 'ac', id: b };
    }
    return { page: 'notfound' };
  }

  // "#/items/c4?x=1" -> "/wiki/item/c4?x=1". Não é rota antiga (âncora comum, vazio) = null.
  function fromHash(hash) {
    const h = String(hash || '');
    if (!/^#\//.test(h)) return null;
    const [path, query] = h.slice(1).split('?');
    const p = path.split('/').filter(Boolean);
    const [a, b] = p;
    const q = query ? '?' + query : '';
    const enc = (s) => encodeURIComponent(dec(s));
    let to = '/';
    if (!a) to = '/';
    else if (a === 'wiki') to = '/wiki';
    else if (a === 'items') to = b ? `/wiki/item/${enc(b)}` : '/wiki/itens';
    else if (a === 'category') to = b ? `/wiki/categoria/${enc(b)}` : '/wiki/itens';
    else if (a === 'vehicles') to = '/wiki/veiculos';
    else if (a === 'guides') to = b ? `/wiki/guia/${enc(b)}` : '/wiki/guias';
    else if (a === 'faq') to = '/wiki/faq';
    else if (a === 'store') to = '/loja';
    else if (a === 'perfil' || a === 'profile') to = '/perfil';
    else if (a === 'ranking' || a === 'wipe' || a === 'badges') to = '/' + a;
    else if ((a === 'grupo' || a === 'jogador' || a === 'ac') && b) to = `/${a}/${enc(b)}`;
    // #/media, #/plano e o resto: deixaram de existir, vão para o início
    return to + (to === '/' && !['perfil', 'profile'].includes(a) ? '' : q);
  }

  // link que o roteador abre sozinho: caminho sem extensão de arquivo e fora de /play/ (pasta real)
  function isApp(pathname) {
    const p = String(pathname || '/');
    if (p === '/play' || p.startsWith('/play/')) return false;
    const last = p.split('/').pop();
    if (/\.[a-z0-9]{1,5}$/i.test(last)) return false;
    return true;
  }

  const api = { parse, fromHash, isApp };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HavokRoutes = api;
})(typeof window !== 'undefined' ? window : globalThis);
