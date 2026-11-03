/* HAVOK — mapa interativo do servidor (módulo independente).
 *
 *   HavokMap.mount(el, { lang: 'pt' | 'en', airdropUrl?: string, compact?: boolean, href?: string })
 *     → Promise<{ map, setLang(lang), focus(id), destroy() }>
 *
 * - Carrega sozinho o Leaflet (cdnjs, versão fixa + SRI), o mapa.css e o map-data.js da mesma pasta deste arquivo.
 * - compact: prévia para a home (sem filtros/busca, sem arrastar); clicar leva para `href` (padrão '/mapa').
 * - airdropUrl: consulta a cada 20 s; resposta {state: 'falling'|'landed'|'opened'|'none', x, y, at, id}
 *   com x/y em coordenadas do mundo do GTA. 'none' (ou erro) = sem marcador.
 * Dados gerados por tools/build-map.py (não publica loot nem os pontos possíveis de airdrop).
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var BASE = SCRIPT && SCRIPT.src ? new URL('.', SCRIPT.src).href : '/mapa/';
  var LEAFLET = {
    js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    jsSri: 'sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==',
    css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    cssSri: 'sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==',
  };
  var AIR_EVERY = 20000;
  var DEFAULT_OFF = ['radio']; // cornetas: muitas e perto das vilas; liga quem quiser
  var STORE_KEY = 'havok-map-filters';
  var COMPACT_CATS = ['safezone', 'shop', 'mission', 'military', 'radiation', 'cold']; // prévia da home: só o essencial

  var T = {
    pt: {
      title: 'Mapa do servidor', search: 'Buscar lugar, base, vendedor…', filters: 'Filtros', all: 'Mostrar tudo', none: 'Esconder tudo',
      close: 'Fechar', open_full: 'Abrir mapa completo', no_results: 'Nada com esse nome', place: 'Lugar', center: 'Centralizar',
      zoom_in: 'Aproximar', zoom_out: 'Afastar', reset: 'Ver o mapa inteiro', hide_panel: 'Esconder painel', show_panel: 'Mostrar filtros',
      air: 'Airdrop', falling: 'caindo', landed: 'no chão', opened: 'aberto', near: 'perto de', ago: 'há {t}',
      air_falling: 'Caixa descendo de paraquedas. Chegue antes dos outros.', air_landed: 'Caixa no chão, ainda fechada.', air_opened: 'Alguém já abriu esta caixa.',
      loading: 'Carregando mapa…', failed: 'Não deu para carregar o mapa. Confira a conexão e recarregue a página.',
      coords: 'Coordenadas', layers_hint: 'Toque numa categoria para mostrar ou esconder',
    },
    en: {
      title: 'Server map', search: 'Search place, base, vendor…', filters: 'Filters', all: 'Show all', none: 'Hide all',
      close: 'Close', open_full: 'Open full map', no_results: 'Nothing by that name', place: 'Place', center: 'Center',
      zoom_in: 'Zoom in', zoom_out: 'Zoom out', reset: 'Show the whole map', hide_panel: 'Hide panel', show_panel: 'Show filters',
      air: 'Airdrop', falling: 'falling', landed: 'on the ground', opened: 'opened', near: 'near', ago: '{t}',
      air_falling: 'Crate coming down on a parachute. Get there first.', air_landed: 'Crate on the ground, still closed.', air_opened: 'Someone already opened this crate.',
      loading: 'Loading map…', failed: 'Could not load the map. Check your connection and reload the page.',
      coords: 'Coordinates', layers_hint: 'Tap a category to show or hide it',
    },
  };

  // ícones desenhados para o que não tem blip no jogo (traço único, 24×24)
  var SVG = {
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 2v8a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    rad: '<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4 9.2 5.6a7.5 7.5 0 0 1 5.6 0zM13.4 12.8l5.5.1a7.5 7.5 0 0 1-2.8 4.9zM10.6 12.8l-2.7 5a7.5 7.5 0 0 1-2.8-4.9z"/>',
    snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>',
    speaker: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    chevron: '<path d="m15 18-6-6 6-6"/>',
    target: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    oil: '<path d="M8 21 12 3l4 18M9.5 14h5M10.5 9h3M4 21h16M12 3v-1"/><path d="M16 8h4v3"/>',
    crate: '<path d="M12 3a8 8 0 0 0-8 8h16a8 8 0 0 0-8-8zM4 11l6 6M20 11l-6 6M12 11v6"/><rect x="9" y="17" width="6" height="4" rx=".8"/>',
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'hvm-ic') + '" viewBox="0 0 24 24" aria-hidden="true">' + (SVG[name] || '') + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---------------------------------------------------------------- carregamento sob demanda
  var loads = {};
  function loadScript(src, sri) {
    if (loads[src]) return loads[src];
    loads[src] = new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      if (sri) {
        s.integrity = sri;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
      }
      s.onload = ok;
      s.onerror = function () {
        delete loads[src];
        fail(new Error('load ' + src));
      };
      document.head.appendChild(s);
    });
    return loads[src];
  }
  function loadCss(href, sri, id) {
    if (document.getElementById(id)) return;
    var l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = href;
    if (sri) {
      l.integrity = sri;
      l.crossOrigin = 'anonymous';
      l.referrerPolicy = 'no-referrer';
    }
    document.head.appendChild(l);
  }
  function deps() {
    loadCss(LEAFLET.css, LEAFLET.cssSri, 'hvm-leaflet-css');
    if (!document.querySelector('link[href*="mapa.css"]')) loadCss(BASE + 'mapa.css', null, 'hvm-css');
    var lf = window.L && window.L.map ? Promise.resolve() : loadScript(LEAFLET.js, LEAFLET.jsSri);
    var data = window.HAVOK_MAP_DATA ? Promise.resolve() : loadScript(BASE + 'map-data.js');
    return Promise.all([lf, data]);
  }

  // ---------------------------------------------------------------- utilidades de coordenada
  function worldToPx(x, y) {
    return [(x + 4096) / 2, (4096 - y) / 2];
  }
  function pxToWorld(p) {
    return [Math.round(p[0] * 2 - 4096), Math.round(4096 - p[1] * 2)];
  }

  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      localStorage.setItem(STORE_KEY, JSON.stringify(val));
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------- montagem
  function mount(el, opts) {
    opts = opts || {};
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return Promise.reject(new Error('HavokMap.mount: elemento não encontrado'));
    var lang = opts.lang === 'en' ? 'en' : 'pt';
    var compact = !!opts.compact;
    var href = opts.href || '/mapa';
    var airEvery = opts.airdropEvery || AIR_EVERY;

    el.innerHTML = '';
    var root = h('div', 'hvm' + (compact ? ' hvm--compact' : '') + ' is-loading');
    root.innerHTML = '<div class="hvm-map"></div><div class="hvm-status" role="status">' + esc(T[lang].loading) + '</div>';
    el.appendChild(root);

    return deps().then(
      function () {
        return build(root, el, window.HAVOK_MAP_DATA, { lang: lang, compact: compact, href: href, airdropUrl: opts.airdropUrl, airEvery: airEvery });
      },
      function (err) {
        root.classList.remove('is-loading');
        root.classList.add('is-failed');
        root.querySelector('.hvm-status').textContent = T[lang].failed;
        throw err;
      }
    );
  }

  function build(root, host, D, o) {
    var L = window.L;
    var lang = o.lang;
    var t = function (k) {
      return (T[lang] || T.pt)[k] || k;
    };
    var Lx = function (obj) {
      return obj ? obj[lang] || obj.pt : '';
    };
    var hoverable = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cats = {};
    D.categories.forEach(function (c) {
      cats[c.id] = c;
    });

    var mapEl = root.querySelector('.hvm-map');
    var Z = D.maxNativeZoom; // 4: z4 = pixel do map.png (projeção dos pontos)
    var TZ = D.tileMaxZoom || Z; // último zoom com tiles (5 = satélite do continente, mais nítido)
    var map = L.map(mapEl, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 110,
      maxBoundsViscosity: 0.9,
      dragging: !o.compact,
      scrollWheelZoom: !o.compact,
      doubleClickZoom: !o.compact,
      touchZoom: !o.compact,
      boxZoom: false,
      keyboard: !o.compact,
      tap: false,
      fadeAnimation: true,
    });
    var P = function (p) {
      return map.unproject(p, Z);
    };
    var full = L.latLngBounds(P([0, D.image]), P([D.image, 0]));
    var land = L.latLngBounds(P([520, 3620]), P([3720, 520])); // continente + ilhas próximas

    if (o.compact) {
      L.imageOverlay(BASE + 'preview.webp', full, { className: 'hvm-base' }).addTo(map);
    } else {
      L.tileLayer(BASE + 'tiles/{z}/{x}/{y}.webp', {
        tileSize: D.tile,
        noWrap: true,
        bounds: full,
        minNativeZoom: 0,
        maxNativeZoom: TZ,
        minZoom: -2,
        maxZoom: TZ + 1,
        keepBuffer: 4,
        className: 'hvm-base',
      }).addTo(map);
    }

    // o painel lateral cobre a esquerda no computador: o mapa centraliza no espaço que sobra
    function fitView(animate) {
      if (o.compact) {
        map.setView(land.getCenter(), map.getBoundsZoom(land, false), { animate: false });
        return;
      }
      var wide = root.clientWidth >= 720 && root.classList.contains('panel-open');
      map.fitBounds(land, { animate: !!animate, paddingTopLeft: [wide ? 320 : 12, 12], paddingBottomRight: [12, 12] });
    }
    map.setMaxBounds(full.pad(0.3)); // folga para o painel/cartão não esconderem a borda do mapa
    fitView(false);
    map.setMinZoom(Math.max(map.getBoundsZoom(land) - 1, -2));
    map.setMaxZoom(TZ + 1);
    map.on('resize', function () {
      var fz = map.getBoundsZoom(land);
      map.setMinZoom(Math.max(fz - 1, -2));
    });

    // padrões SVG (hachura da radiação, pontilhado do frio) no renderer das áreas
    var renderer = L.svg({ padding: 0.5 });
    map.addLayer(renderer);
    var defsHost = renderer._container;
    if (defsHost) {
      var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML =
        '<pattern id="hvm-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="rgba(198,227,74,.10)"/><rect width="3" height="9" fill="rgba(198,227,74,.38)"/></pattern>';
      defsHost.insertBefore(defs, defsHost.firstChild);
    }
    var AREA_STYLE = {
      safezone: { color: '#6cc070', weight: 2, fillColor: '#6cc070', fillOpacity: 0.18, dashArray: null },
      radiation: { color: '#c6e34a', weight: 1.5, fillColor: 'url(#hvm-hatch)', fillOpacity: 1, dashArray: '6 4' },
      cold: { color: '#9fd3ff', weight: 1.5, fillColor: '#9fd3ff', fillOpacity: 0.12, dashArray: '2 5' },
    };

    // ------------------------------------------------ estado
    var saved = store(true);
    var on = {};
    D.categories.forEach(function (c) {
      on[c.id] = saved && typeof saved[c.id] === 'boolean' ? saved[c.id] : DEFAULT_OFF.indexOf(c.id) < 0;
    });
    var groups = {};
    var byId = {};
    var labelLayer = L.layerGroup().addTo(map);
    var selected = null;

    function iconHtml(cat, iconOverride) {
      var c = cats[cat];
      var ic = iconOverride || c.icon;
      var inner = ic.indexOf('svg:') === 0 ? svg(ic.slice(4), 'hvm-pin-svg') : '<img src="' + BASE + 'icons/' + ic + '" alt="" width="16" height="16" draggable="false">';
      return '<span class="hvm-pin" style="--c:' + c.color + '">' + inner + '</span>';
    }

    function tipHtml(item) {
      return '<b>' + esc(Lx(item.name)) + '</b><span>' + esc(Lx(item.desc)) + '</span>';
    }

    function buildLayers() {
      Object.keys(groups).forEach(function (k) {
        map.removeLayer(groups[k]);
      });
      groups = {};
      byId = {};
      D.categories.forEach(function (c) {
        groups[c.id] = L.layerGroup();
      });

      D.areas.forEach(function (a) {
        var st = AREA_STYLE[a.cat] || { color: cats[a.cat].color, weight: 1.5, fillOpacity: 0.15 };
        var poly = L.polygon(
          a.poly.map(P),
          L.extend({ renderer: renderer, interactive: !o.compact, className: 'hvm-area hvm-area--' + a.cat, lineJoin: 'round' }, st)
        );
        if (!o.compact) {
          if (hoverable) poly.bindTooltip(tipHtml(a), { sticky: true, direction: 'top', className: 'hvm-tip', offset: [0, -10], opacity: 1 });
          poly.on('click', function () {
            select(a.id, true);
          });
        }
        poly.addTo(groups[a.cat]);
        byId[a.id] = { item: a, layer: poly, at: a.c ? P(a.c) : poly.getBounds().getCenter() };
        // radiação e frio: um pino no centro também (dá para achar e clicar)
        if (a.c && !o.compact) {
          var m = L.marker(P(a.c), {
            icon: L.divIcon({ className: 'hvm-mk', html: iconHtml(a.cat), iconSize: [28, 28], iconAnchor: [14, 14] }),
            keyboard: true,
            title: Lx(a.name),
            riseOnHover: true,
          });
          if (hoverable) m.bindTooltip(tipHtml(a), { direction: 'top', className: 'hvm-tip', offset: [0, -16], opacity: 1 });
          m.on('click', function () {
            select(a.id, true);
          });
          m.addTo(groups[a.cat]);
          byId[a.id].marker = m;
        }
      });

      D.points.forEach(function (p) {
        if (o.compact && COMPACT_CATS.indexOf(p.cat) < 0) return;
        var m = L.marker(P(p.p), {
          icon: L.divIcon({ className: 'hvm-mk', html: iconHtml(p.cat, p.icon), iconSize: [28, 28], iconAnchor: [14, 14] }),
          keyboard: !o.compact,
          interactive: !o.compact,
          title: o.compact ? '' : Lx(p.name),
          riseOnHover: true,
        });
        if (!o.compact) {
          if (hoverable) m.bindTooltip(tipHtml(p), { direction: 'top', className: 'hvm-tip', offset: [0, -16], opacity: 1 });
          m.on('click', function () {
            select(p.id, true);
          });
        }
        m.addTo(groups[p.cat]);
        byId[p.id] = { item: p, layer: m, marker: m, at: P(p.p) };
      });

      D.categories.forEach(function (c) {
        if (o.compact ? COMPACT_CATS.indexOf(c.id) >= 0 : on[c.id]) groups[c.id].addTo(map);
      });

      labelLayer.clearLayers();
      D.labels.forEach(function (l) {
        if (o.compact && (l.tier > 1 || l.county)) return;
        L.marker(P(l.p), {
          icon: L.divIcon({ className: 'hvm-lbl t' + l.tier + (l.county ? ' county' : ''), html: '<span>' + esc(Lx(l.name)) + '</span>', iconSize: null }),
          interactive: false,
          keyboard: false,
          zIndexOffset: -1000,
        }).addTo(labelLayer);
      });
      if (selected && byId[selected]) markSelected(selected);
    }

    // rótulos e tamanho dos pinos conforme o zoom
    function zoomClass() {
      var z = map.getZoom();
      var rel = z - map.getBoundsZoom(land); // 0 = mapa inteiro na tela
      root.classList.toggle('z-far', rel < 0.5);
      root.classList.toggle('z-mid', rel >= 0.5);
      root.classList.toggle('z-near', rel >= 1.5);
    }
    map.on('zoomend', zoomClass);

    // ------------------------------------------------ prévia (home)
    if (o.compact) {
      var cta = h('a', 'hvm-cta', '<span>' + esc(t('open_full')) + '</span>' + svg('arrow'));
      cta.href = o.href;
      var cover = h('a', 'hvm-cover');
      cover.href = o.href;
      cover.setAttribute('aria-label', t('open_full'));
      root.appendChild(cover);
      root.appendChild(cta);
      buildLayers();
      zoomClass();
      root.classList.remove('is-loading');
      var air0 = airdrop();
      var api0 = {
        map: map,
        setLang: function (l) {
          lang = l === 'en' ? 'en' : 'pt';
          cta.querySelector('span').textContent = t('open_full');
          cover.setAttribute('aria-label', t('open_full'));
          buildLayers();
          air0.render();
        },
        focus: function () {},
        destroy: function () {
          air0.stop();
          map.remove();
          host.innerHTML = '';
        },
      };
      return api0;
    }

    // ------------------------------------------------ painel (filtros + busca)
    var side = h('aside', 'hvm-side');
    side.setAttribute('aria-label', t('filters'));
    side.innerHTML =
      '<div class="hvm-grip" aria-hidden="true"></div>' +
      '<header class="hvm-head"><h2 class="hvm-title"></h2><button type="button" class="hvm-iconbtn hvm-collapse">' + svg('chevron') + '</button></header>' +
      '<div class="hvm-search"><label class="hvm-field">' + svg('search') + '<input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"></label><ul class="hvm-results" role="listbox" hidden></ul></div>' +
      '<div class="hvm-chips" role="group"></div>' +
      '<footer class="hvm-foot"><span class="hvm-hint"></span><button type="button" class="hvm-link hvm-toggle-all"></button></footer>';
    root.appendChild(side);

    var top = h('div', 'hvm-top');
    top.innerHTML =
      '<button type="button" class="hvm-pill hvm-open-filters">' + svg('sliders') + '<span></span><b class="hvm-badge"></b></button>' +
      '<button type="button" class="hvm-pill hvm-pill--icon hvm-open-search">' + svg('search') + '</button>';
    root.appendChild(top);

    var ctrls = h('div', 'hvm-ctrls');
    ctrls.innerHTML =
      '<button type="button" class="hvm-iconbtn" data-z="in">' + svg('plus') + '</button>' +
      '<button type="button" class="hvm-iconbtn" data-z="out">' + svg('minus') + '</button>' +
      '<button type="button" class="hvm-iconbtn" data-z="fit">' + svg('expand') + '</button>';
    root.appendChild(ctrls);

    var card = h('section', 'hvm-card');
    card.setAttribute('aria-live', 'polite');
    card.hidden = true;
    root.appendChild(card);

    var chipsEl = side.querySelector('.hvm-chips');
    var input = side.querySelector('input');
    var results = side.querySelector('.hvm-results');

    function renderSide() {
      side.querySelector('.hvm-title').textContent = t('title');
      side.querySelector('.hvm-collapse').setAttribute('aria-label', t('hide_panel'));
      input.placeholder = t('search');
      input.setAttribute('aria-label', t('search'));
      side.querySelector('.hvm-hint').textContent = t('layers_hint');
      chipsEl.setAttribute('aria-label', t('filters'));
      chipsEl.innerHTML = D.categories
        .map(function (c) {
          return (
            '<button type="button" class="hvm-chip" data-cat="' + c.id + '" aria-pressed="' + !!on[c.id] + '" style="--c:' + c.color + '">' +
            iconHtml(c.id) + '<span class="hvm-chip-name">' + esc(Lx(c.name)) + '</span><span class="hvm-chip-n">' + c.count + '</span></button>'
          );
        })
        .join('');
      top.querySelector('.hvm-open-filters span').textContent = t('filters');
      top.querySelector('.hvm-open-filters').setAttribute('aria-label', t('show_panel'));
      top.querySelector('.hvm-open-search').setAttribute('aria-label', t('search'));
      ctrls.querySelector('[data-z=in]').setAttribute('aria-label', t('zoom_in'));
      ctrls.querySelector('[data-z=out]').setAttribute('aria-label', t('zoom_out'));
      ctrls.querySelector('[data-z=fit]').setAttribute('aria-label', t('reset'));
      ctrls.querySelectorAll('button').forEach(function (b) {
        b.title = b.getAttribute('aria-label');
      });
      syncChips();
    }
    function syncChips() {
      var allOn = true;
      var shown = 0;
      D.categories.forEach(function (c) {
        var b = chipsEl.querySelector('[data-cat="' + c.id + '"]');
        if (b) b.setAttribute('aria-pressed', on[c.id] ? 'true' : 'false');
        if (on[c.id]) shown++;
        else allOn = false;
        if (on[c.id] && !map.hasLayer(groups[c.id])) groups[c.id].addTo(map);
        if (!on[c.id] && map.hasLayer(groups[c.id])) map.removeLayer(groups[c.id]);
      });
      side.querySelector('.hvm-toggle-all').textContent = allOn ? t('none') : t('all');
      top.querySelector('.hvm-badge').textContent = shown + '/' + D.categories.length;
    }
    chipsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.hvm-chip');
      if (!b) return;
      var id = b.getAttribute('data-cat');
      on[id] = !on[id];
      store(false, on);
      syncChips();
    });
    side.querySelector('.hvm-toggle-all').addEventListener('click', function () {
      var allOn = D.categories.every(function (c) {
        return on[c.id];
      });
      D.categories.forEach(function (c) {
        on[c.id] = !allOn;
      });
      store(false, on);
      syncChips();
    });

    // painel: no computador recolhe para o lado; no celular é gaveta de baixo
    function setPanel(open) {
      root.classList.toggle('panel-open', open);
      root.classList.toggle('panel-closed', !open);
      if (open && isNarrow()) closeCard();
    }
    function isNarrow() {
      return root.clientWidth < 720;
    }
    side.querySelector('.hvm-collapse').addEventListener('click', function () {
      setPanel(false);
    });
    top.querySelector('.hvm-open-filters').addEventListener('click', function () {
      setPanel(!root.classList.contains('panel-open'));
    });
    top.querySelector('.hvm-open-search').addEventListener('click', function () {
      setPanel(true);
      setTimeout(function () {
        input.focus();
      }, 60);
    });
    // arrastar a gaveta para baixo fecha (celular)
    (function () {
      var grip = side.querySelector('.hvm-grip');
      var y0 = null;
      grip.addEventListener('pointerdown', function (e) {
        y0 = e.clientY;
        grip.setPointerCapture(e.pointerId);
      });
      grip.addEventListener('pointerup', function (e) {
        if (y0 != null && e.clientY - y0 > 40) setPanel(false);
        y0 = null;
      });
      grip.addEventListener('click', function () {
        setPanel(false);
      });
    })();
    L.DomEvent.disableClickPropagation(side);
    L.DomEvent.disableScrollPropagation(side);
    L.DomEvent.disableClickPropagation(card);
    L.DomEvent.disableScrollPropagation(card);
    L.DomEvent.disableClickPropagation(top);
    L.DomEvent.disableClickPropagation(ctrls);

    ctrls.addEventListener('click', function (e) {
      var b = e.target.closest('[data-z]');
      if (!b) return;
      var z = b.getAttribute('data-z');
      if (z === 'in') map.zoomIn();
      else if (z === 'out') map.zoomOut();
      else fitView(true);
    });

    // ------------------------------------------------ busca
    var index = [];
    function buildIndex() {
      index = [];
      D.points.forEach(function (p) {
        index.push({ id: p.id, cat: p.cat, name: Lx(p.name), sub: Lx(p.desc), key: norm(p.name.pt + ' ' + p.name.en + ' ' + Lx(cats[p.cat].name)) });
      });
      D.areas.forEach(function (a) {
        if (a.cat === 'safezone') return; // já tem o ponto
        index.push({ id: a.id, cat: a.cat, name: Lx(a.name), sub: Lx(a.desc), key: norm(a.name.pt + ' ' + a.name.en + ' ' + Lx(cats[a.cat].name)) });
      });
      D.labels.forEach(function (l, i) {
        index.push({ id: 'label-' + i, label: l, name: Lx(l.name), sub: t('place'), key: norm(l.name.pt + ' ' + l.name.en) });
      });
    }
    var hits = [];
    var cursor = -1;
    function runSearch() {
      var q = norm(input.value.trim());
      cursor = -1;
      if (!q) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }
      var words = q.split(/\s+/);
      hits = index
        .filter(function (r) {
          return words.every(function (w) {
            return r.key.indexOf(w) >= 0;
          });
        })
        .sort(function (a, b) {
          return (a.label ? 0 : 1) - (b.label ? 0 : 1) || (norm(a.name).indexOf(q) === 0 ? -1 : 0) - (norm(b.name).indexOf(q) === 0 ? -1 : 0);
        })
        .slice(0, 8);
      results.hidden = false;
      results.innerHTML = hits.length
        ? hits
            .map(function (r, i) {
              var ic = r.label ? '<span class="hvm-pin hvm-pin--place">' + svg('target', 'hvm-pin-svg') + '</span>' : iconHtml(r.cat);
              return '<li role="option" id="hvm-r' + i + '" data-i="' + i + '">' + ic + '<span><b>' + esc(r.name) + '</b><small>' + esc(r.sub) + '</small></span></li>';
            })
            .join('')
        : '<li class="hvm-empty">' + esc(t('no_results')) + '</li>';
    }
    function pick(i) {
      var r = hits[i];
      if (!r) return;
      results.hidden = true;
      input.value = r.name;
      input.blur();
      if (r.label) {
        map.flyTo(P(r.label.p), Math.max(map.getZoom(), map.getBoundsZoom(land) + (r.label.tier === 1 ? 1 : 2)), { duration: 0.8 });
        if (isNarrow()) setPanel(false);
        return;
      }
      if (!on[r.cat]) {
        on[r.cat] = true;
        store(false, on);
        syncChips();
      }
      if (isNarrow()) setPanel(false);
      select(r.id, true, true);
    }
    input.addEventListener('input', runSearch);
    input.addEventListener('focus', runSearch);
    input.addEventListener('keydown', function (e) {
      var n = hits.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!n) return;
        cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        results.querySelectorAll('li').forEach(function (li, i) {
          li.classList.toggle('on', i === cursor);
          li.setAttribute('aria-selected', i === cursor ? 'true' : 'false');
        });
        input.setAttribute('aria-activedescendant', 'hvm-r' + cursor);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pick(cursor >= 0 ? cursor : 0);
      } else if (e.key === 'Escape') {
        input.value = '';
        runSearch();
      }
    });
    results.addEventListener('mousedown', function (e) {
      e.preventDefault(); // não perde o foco antes do clique
    });
    results.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-i]');
      if (li) pick(+li.getAttribute('data-i'));
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        results.hidden = true;
      }, 120);
    });

    // ------------------------------------------------ painel de detalhes
    function markSelected(id) {
      root.querySelectorAll('.hvm-pin.is-on').forEach(function (e) {
        e.classList.remove('is-on');
      });
      Object.keys(byId).forEach(function (k) {
        var r = byId[k];
        if (r.layer && r.layer.setStyle) r.layer.setStyle({ weight: k === id ? 3 : (AREA_STYLE[r.item.cat] || {}).weight || 1.5 });
      });
      var r = byId[id];
      if (r && r.marker && r.marker._icon) {
        var pin = r.marker._icon.querySelector('.hvm-pin');
        if (pin) pin.classList.add('is-on');
      }
    }
    function closeCard() {
      card.hidden = true;
      root.classList.remove('card-open');
      selected = null;
      markSelected(null);
    }
    function select(id, show, fly) {
      var r = byId[id];
      if (!r) return;
      selected = id;
      var it = r.item;
      var c = cats[it.cat];
      var world = pxToWorld(it.p || it.c || [map.project(r.at, Z).x, map.project(r.at, Z).y]);
      var det = it.details ? Lx(it.details) : [];
      card.style.setProperty('--c', c.color);
      card.innerHTML =
        '<header class="hvm-card-head">' + iconHtml(it.cat, it.icon) +
        '<div><span class="hvm-card-cat">' + esc(Lx(c.name)) + '</span><h3>' + esc(Lx(it.name)) + '</h3></div>' +
        '<button type="button" class="hvm-iconbtn hvm-card-x" aria-label="' + esc(t('close')) + '">' + svg('x') + '</button></header>' +
        '<p class="hvm-card-desc">' + esc(Lx(it.desc)) + '</p>' +
        (det.length ? '<ul class="hvm-card-list">' + det.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
        '<footer class="hvm-card-foot"><span class="hvm-coords" title="' + esc(t('coords')) + '">X ' + world[0] + ' · Y ' + world[1] + '</span>' +
        '<button type="button" class="hvm-link hvm-card-center">' + svg('target') + esc(t('center')) + '</button></footer>';
      card.hidden = false;
      root.classList.add('card-open');
      if (isNarrow()) setPanel(false);
      card.querySelector('.hvm-card-x').addEventListener('click', closeCard);
      card.querySelector('.hvm-card-center').addEventListener('click', function () {
        flyTo(r);
      });
      markSelected(id);
      if (fly) flyTo(r);
      else if (show) {
        // o cartão não pode cobrir o ponto escolhido
        var box = freeBox();
        var sp = map.latLngToContainerPoint(r.at);
        if (sp.x < box.l + 30 || sp.x > root.clientWidth - box.r - 30 || sp.y < box.t + 30 || sp.y > root.clientHeight - box.b - 30) flyCentered(r.at, map.getZoom());
      }
    }
    // área livre do mapa (sem o painel, o cartão ou a gaveta por cima)
    function freeBox() {
      var w = root.clientWidth;
      var hgt = root.clientHeight;
      var narrow = isNarrow();
      var l = !narrow && root.classList.contains('panel-open') ? 320 : 0;
      var r = !narrow && !card.hidden ? card.offsetWidth + 28 : 0;
      var b = narrow && !card.hidden ? card.offsetHeight + 16 : 0;
      var tp = narrow ? 60 : 0;
      return { l: l, r: r, t: tp, b: b, cx: (l + w - r) / 2, cy: (tp + hgt - b) / 2, w: w - l - r, h: hgt - tp - b };
    }
    // voa até `ll` deixando o ponto no meio da área livre
    function flyCentered(ll, zoom) {
      var box = freeBox();
      var size = map.getSize();
      var pt = map.project(ll, zoom).subtract(L.point(box.cx - size.x / 2, box.cy - size.y / 2));
      map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.8 });
    }
    function flyTo(r) {
      var target = r.layer && r.layer.getBounds ? r.layer.getBounds() : null;
      var box = freeBox();
      if (target && !r.item.p) {
        var sz = map.getSize();
        var pad = L.point(sz.x - Math.max(box.w - 80, 120), sz.y - Math.max(box.h - 80, 120)); // getBoundsZoom recebe a margem total
        var z = Math.min(map.getBoundsZoom(target, false, pad), Z + 1);
        flyCentered(target.getCenter(), z);
      } else flyCentered(r.at, Math.max(map.getZoom(), map.getBoundsZoom(land) + 2.25));
    }
    map.on('click', function () {
      if (!card.hidden) closeCard();
      if (isNarrow() && root.classList.contains('panel-open')) setPanel(false);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !card.hidden) closeCard();
    });

    // ------------------------------------------------ pronto
    buildLayers();
    buildIndex();
    renderSide();
    zoomClass();
    setPanel(!isNarrow());
    fitView(false);
    zoomClass();
    root.classList.remove('is-loading');
    var air = airdrop();

    return {
      map: map,
      setLang: function (l) {
        lang = l === 'en' ? 'en' : 'pt';
        var keep = selected;
        buildLayers();
        buildIndex();
        renderSide();
        runSearch();
        air.render();
        if (keep) select(keep, true);
      },
      focus: function (id) {
        select(id, true, true);
      },
      destroy: function () {
        air.stop();
        map.remove();
        host.innerHTML = '';
      },
    };

    // ------------------------------------------------ airdrop ao vivo
    function airdrop() {
      var state = null;
      var marker = null;
      var pill = null;
      var timer = null;
      var tick = null;
      if (!o.airdropUrl) return { render: function () {}, stop: function () {} };

      function nearName(px) {
        var best = null;
        D.labels.forEach(function (l) {
          if (l.tier > 2) return;
          var d = Math.hypot(l.p[0] - px[0], l.p[1] - px[1]);
          var lim = l.tier === 1 ? 1e9 : 450;
          if (d < lim && (!best || d < best.d - (l.tier === 2 ? 200 : 0))) best = { d: d, l: l };
        });
        return best ? Lx(best.l.name) : '';
      }
      function since(at) {
        if (!at) return '';
        var ms = typeof at === 'number' ? (at < 1e12 ? at * 1000 : at) : Date.parse(at);
        if (!isFinite(ms)) return '';
        var s = Math.max(0, (Date.now() - ms) / 1000);
        var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(lang === 'pt' ? 'pt-BR' : 'en', { numeric: 'auto', style: 'short' }) : null;
        if (!rtf) return '';
        if (s < 60) return rtf.format(-Math.round(s), 'second');
        if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
        return rtf.format(-Math.round(s / 3600), 'hour');
      }
      function render() {
        var live = state && state.state && state.state !== 'none' && isFinite(+state.x) && isFinite(+state.y);
        if (!live) {
          if (marker) map.removeLayer(marker);
          marker = null;
          if (pill) pill.remove();
          pill = null;
          root.classList.remove('has-air');
          return;
        }
        var st = ['falling', 'landed', 'opened'].indexOf(state.state) >= 0 ? state.state : 'landed';
        var px = worldToPx(+state.x, +state.y);
        var ll = P(px);
        var place = nearName(px);
        var label = t('air') + ' · ' + t(st);
        var html = '<span class="hvm-air hvm-air--' + st + '"><i></i><i></i>' + svg('crate', 'hvm-air-svg') + '</span>';
        if (!marker) {
          marker = L.marker(ll, {
            icon: L.divIcon({ className: 'hvm-mk hvm-mk--air', html: html, iconSize: [44, 44], iconAnchor: [22, 22] }),
            zIndexOffset: 2000,
            keyboard: !o.compact,
            interactive: !o.compact,
            title: label,
          }).addTo(map);
          if (!o.compact) {
            if (hoverable) marker.bindTooltip('', { direction: 'top', className: 'hvm-tip', offset: [0, -22], opacity: 1 });
            marker.on('click', function () {
              map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), map.getBoundsZoom(land) + 2), { duration: 0.8 });
            });
          }
        } else {
          marker.setLatLng(ll);
          marker.setIcon(L.divIcon({ className: 'hvm-mk hvm-mk--air', html: html, iconSize: [44, 44], iconAnchor: [22, 22] }));
        }
        var line = (place ? t('near') + ' ' + place : '') + (state.at ? ' · ' + since(state.at) : '');
        if (marker.getTooltip()) marker.setTooltipContent('<b>' + esc(label) + '</b><span>' + esc(t('air_' + st)) + (line ? '<br>' + esc(line) : '') + '</span>');
        if (!pill) {
          pill = h('button', 'hvm-airpill');
          pill.type = 'button';
          L.DomEvent.disableClickPropagation(pill);
          pill.addEventListener('click', function (e) {
            if (o.compact) return;
            e.preventDefault();
            map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), map.getBoundsZoom(land) + 2), { duration: 0.8 });
          });
          root.appendChild(pill);
        }
        pill.className = 'hvm-airpill hvm-airpill--' + st;
        pill.innerHTML = '<span class="hvm-dot"></span><b>' + esc(label) + '</b>' + (line ? '<small>' + esc(line) + '</small>' : '');
        root.classList.add('has-air');
      }
      function poll() {
        if (document.hidden) return;
        fetch(o.airdropUrl, { cache: 'no-store', headers: { accept: 'application/json' } })
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .then(function (j) {
            state = j;
            render();
          })
          .catch(function () {
            // falha de rede: mantém o último estado; some na próxima resposta 'none'
          });
      }
      function onVis() {
        if (!document.hidden) poll();
      }
      poll();
      timer = setInterval(poll, o.airEvery);
      tick = setInterval(function () {
        if (state && state.at) render();
      }, 30000);
      document.addEventListener('visibilitychange', onVis);
      return {
        render: render,
        stop: function () {
          clearInterval(timer);
          clearInterval(tick);
          document.removeEventListener('visibilitychange', onVis);
        },
      };
    }
  }

  window.HavokMap = { mount: mount, worldToPx: worldToPx };
})();
