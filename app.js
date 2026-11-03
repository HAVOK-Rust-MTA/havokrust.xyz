(() => {
  const W = window.WIKI;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- language
  let lang = (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  try {
    const saved = localStorage.getItem('havok-lang');
    if (saved === 'en' || saved === 'pt') lang = saved;
  } catch (e) { /* sem storage: usa o idioma do navegador */ }

  const T = {
    en: {
      nav_wiki: 'Wiki', search: 'Search items...', browse: 'Browse', guides_h: 'Guides', all_items: 'All Items', all_guides: 'All Guides',
      wiki_title: 'Game Wiki', wiki_sub: 'Every item, recipe and system on HAVOK, checked against the server.', categories: 'Categories', systems: 'Systems', guides: 'Guides',
      items_count: '{n} items', items_title: 'Items', items_desc: 'Browse every item in the game', showing: 'Showing {n} of {t} items',
      no_results: 'No items found', all_types: 'All types', craftable: 'Craftable', has_bp: 'Needs Blueprint', workbench: 'Workbench', filter_here: 'Filter this list...', sort: 'Sort', sort_name: 'A–Z', sort_level: 'By level', open_search: 'Search',
      faq_desc: 'Quick answers to the most common questions about progression, survival, and support.',
      guides_desc: 'Practical guides for progression, farming, loot, crafting, building, and combat.',
      weapon_stats: 'Weapon Stats', damage: 'Base damage', damage_hint: '% of max health', range: 'Range', mag: 'Magazine Size', ammo: 'Ammunition',
      recipe: 'Crafting Recipe', receive: 'You receive', anywhere: 'Anywhere', needs_bench: 'At a Workbench', level: 'Level {n}', vip_level: 'Legendary: Level {n}',
      properties: 'Properties', type: 'Type', stack: 'Max Stack', bench_req: 'Workbench Required', yes: 'Yes', no: 'No', level_req: 'Level Required',
      blueprint: 'Blueprint', bp_cost: '{n} Scrap', bp_loot: 'Loot only', health: 'Health', slots: 'Storage Slots', limit: 'Placement Limit', upgrade: 'Upgrades To',
      how_obtain: 'How To Obtain', obtain_craft: 'Can be crafted', obtain_furnace: 'Smelting / Cooking', obtain_recycler: 'Recycling other items',
      recycler: 'Recycler Output', furnace: 'Furnace Result', speed: 'Speed', used_in: 'Used In Crafting', compatible: 'Compatible Weapons', related: 'Related Items',
      back: 'Back', not_found: 'Item not found', prev: 'Previous Guide', next: 'Next Guide', soon_video: 'Video coming soon', soon_shot: 'Screenshot coming soon',
      footer_desc: 'A Rust survival gamemode for Multi Theft Auto: farm, craft, build your base and raid — on the streets of San Andreas.',
      footer_wiki: 'WIKI', footer_server: 'SERVER', footer_copy: '© 2026 HAVOK — Rust Survival. Not affiliated with Facepunch Studios.',
      bp_badge: 'Blueprint: {n} Scrap', loot_badge: 'Loot only', bench_badge: 'Workbench', bp_tip: 'Needs a blueprint: you must learn this recipe before you can craft it.', bench_tip: 'Needs a Workbench nearby to craft.', bp_explain: 'You must learn this blueprint before crafting. Put the item and Scrap in a Research Table to get the blueprint, or find one in airdrops and the patrol helicopter, then right click it → Learn. Learning is permanent.', bp_explain_loot: 'This blueprint cannot be researched. Find it in loot, then right click it → Learn. Learning is permanent.', bp_how: 'How blueprints work', legend_bp: 'needs a blueprint (learn the recipe first)', legend_bench: 'needs a Workbench',
      speeds: { fast: 'Fast', medium: 'Medium', slow: 'Slow', 'very-slow': 'Very slow' },
      nav_store: 'VIP Store', nav_badges: 'Badges', nav_play: 'Play', nav_wipe: 'Wipe', nav_profile: 'Profile', nav_ranking: 'Ranking', rk_full: 'See the full ranking',
     
      store_h1a: 'PLAY WITH', store_h1b: 'PRESENCE.', store_sub: 'Three plans, from more XP to a legendary base — support HAVOK and survive in style.',
      store_t1: 'Tied to your account', store_t2: 'Activated by the staff', store_t3: 'Monthly price; other periods on Discord',
      store_perks: 'Everything you get', store_compare: 'Compare', perk: 'Perk', player: 'Player', store_plans: 'Plans',
      cmp_inv: 'Inventory slots', cmp_base: 'Base piece limit', cmp_upkeep: 'Upkeep cost', cmp_respawn: 'Choose respawn region',
      plan_day: 'Days', plan_day_d: 'Try it out — from 1 day.', plan_month: 'Months', plan_month_d: 'The best value for regular players.', plan_perm: 'Permanent', plan_perm_d: 'VIP forever, no renewals.', popular: 'Most popular',
      tier_survivor: 'Survivor', tier_veteran: 'Veteran', tier_legendary: 'Legendary',
      tier_survivor_d: 'Start supporting: more XP, a bigger backpack and a spare bed.', tier_veteran_d: 'Base perks: half the upkeep, faster respawns and the [VIP] tag.', tier_legendary_d: 'Everything, plus cheaper crafting, starter tools and the gold frame.',
      store_get: 'Get on Discord', cmp_xp: 'XP boost', cmp_slot: 'Reserved slot', cmp_beds: 'Beds', cmp_bedtime: 'Bed respawn cooldown', cmp_tools: 'Hatchet + pickaxe on respawn', cmp_craft: 'Crafting cost',
      store_base_note: '* Without a Wardrobe the limit is 15 pieces for everyone, VIP included. With a Wardrobe it is 15 + your level, up to 50. Veteran gets 50 right away, Legendary 65.',
      store_cta: 'Get VIP on Discord', per_month: '/month', per_period: '/period', price_ask: 'Ask on Discord', currency: 'Currency', price: 'Price', free: 'Free', store_fine: 'Open a ticket on our Discord to buy. Type /vip in game to see how much time you have left. Being VIP does not exempt anyone from the rules.',
      discord: 'Discord', featured: 'Tutorial #1 — HUD & interface', nav_home: 'Home',
      nav_map: 'Map', nav_groups: 'Groups', nav_first: 'Never played MTA?', footer_community: 'COMMUNITY', wiki_home: 'Wiki home',
      tags: { new: 'New', fix: 'Fix', balance: 'Balance', event: 'Event' },
      media_title: 'Media checklist', media_desc: 'Every video and screenshot the guides are waiting for. Drop the file in media/ with the exact name.',
    },
    pt: {
      nav_wiki: 'Wiki', search: 'Buscar itens...', browse: 'Navegar', guides_h: 'Guias', all_items: 'Todos os Itens', all_guides: 'Todos os Guias',
      wiki_title: 'Wiki do Jogo', wiki_sub: 'Todos os itens, receitas e sistemas do HAVOK, conferidos com o servidor.', categories: 'Categorias', systems: 'Sistemas', guides: 'Guias',
      items_count: '{n} itens', items_title: 'Itens', items_desc: 'Navegue por todos os itens do jogo', showing: 'Mostrando {n} de {t} itens',
      no_results: 'Nenhum item encontrado', all_types: 'Todos os tipos', craftable: 'Fabricável', has_bp: 'Precisa de Blueprint', workbench: 'Bancada', filter_here: 'Filtrar esta lista...', sort: 'Ordenar', sort_name: 'A–Z', sort_level: 'Por level', open_search: 'Buscar',
      faq_desc: 'Respostas rápidas para as dúvidas mais comuns sobre progressão, sobrevivência e suporte.',
      guides_desc: 'Guias práticos de progressão, coleta, loot, fabricação, construção e combate.',
      weapon_stats: 'Estatísticas da Arma', damage: 'Dano base', damage_hint: '% da vida máxima', range: 'Alcance', mag: 'Tamanho do Carregador', ammo: 'Munição',
      recipe: 'Receita de Fabricação', receive: 'Você recebe', anywhere: 'Em qualquer lugar', needs_bench: 'Na Bancada', level: 'Level {n}', vip_level: 'Legendary: Level {n}',
      properties: 'Propriedades', type: 'Tipo', stack: 'Pilha Máxima', bench_req: 'Bancada Necessária', yes: 'Sim', no: 'Não', level_req: 'Nível Necessário',
      blueprint: 'Blueprint', bp_cost: '{n} de Sucata', bp_loot: 'Só no loot', health: 'Vida', slots: 'Slots de Armazenamento', limit: 'Limite de Colocação', upgrade: 'Melhora Para',
      how_obtain: 'Como Obter', obtain_craft: 'Pode ser fabricado', obtain_furnace: 'Fundição / Cozimento', obtain_recycler: 'Reciclando outros itens',
      recycler: 'Resultado do Reciclador', furnace: 'Resultado da Fornalha', speed: 'Velocidade', used_in: 'Usado na Fabricação de', compatible: 'Armas Compatíveis', related: 'Itens Relacionados',
      back: 'Voltar', not_found: 'Item não encontrado', prev: 'Guia Anterior', next: 'Próximo Guia', soon_video: 'Vídeo em breve', soon_shot: 'Print em breve',
      footer_desc: 'Um modo de sobrevivência no estilo Rust para o Multi Theft Auto: farme, crafte, construa sua base e raide — nas ruas de San Andreas.',
      footer_wiki: 'WIKI', footer_server: 'SERVIDOR', footer_copy: '© 2026 HAVOK — Rust Survival. Sem afiliação com a Facepunch Studios.',
      bp_badge: 'Blueprint: {n} de Sucata', loot_badge: 'Só no loot', bench_badge: 'Bancada', bp_tip: 'Precisa de blueprint: você tem que aprender esta receita antes de craftar.', bench_tip: 'Precisa de uma Bancada perto para craftar.', bp_explain: 'Você precisa aprender esta blueprint antes de craftar. Coloque o item e Sucata na Mesa de Pesquisa para ganhar a blueprint, ou ache uma no airdrop e no helicóptero de patrulha. Depois clique com o botão direito nela → Aprender. Aprender é para sempre.', bp_explain_loot: 'Esta blueprint não dá para pesquisar. Ache no loot e clique com o botão direito nela → Aprender. Aprender é para sempre.', bp_how: 'Como funcionam as blueprints', legend_bp: 'precisa de blueprint (aprender a receita antes)', legend_bench: 'precisa de Bancada',
      speeds: { fast: 'Rápida', medium: 'Média', slow: 'Lenta', 'very-slow': 'Muito lenta' },
      nav_store: 'Loja VIP', nav_badges: 'Badges', nav_play: 'Jogar', nav_wipe: 'Wipe', nav_profile: 'Perfil', nav_ranking: 'Ranking', rk_full: 'Ver o ranking completo',
     
      store_h1a: 'JOGUE COM', store_h1b: 'PRESENÇA.', store_sub: 'Três planos, de mais XP até uma base lendária — apoie o HAVOK e sobreviva com estilo.',
      store_t1: 'Vinculado à sua conta', store_t2: 'Ativado pela staff', store_t3: 'Preço por mês; outros períodos no Discord',
      store_perks: 'Tudo que você ganha', store_compare: 'Compare', perk: 'Vantagem', player: 'Jogador', store_plans: 'Planos',
      cmp_inv: 'Slots no inventário', cmp_base: 'Limite de peças da base', cmp_upkeep: 'Custo do upkeep', cmp_respawn: 'Escolher região do respawn',
      plan_day: 'Dias', plan_day_d: 'Para experimentar — a partir de 1 dia.', plan_month: 'Meses', plan_month_d: 'O melhor custo para quem joga sempre.', plan_perm: 'Permanente', plan_perm_d: 'VIP para sempre, sem renovar.', popular: 'Mais escolhido',
      tier_survivor: 'Survivor', tier_veteran: 'Veteran', tier_legendary: 'Legendary',
      tier_survivor_d: 'Para começar a apoiar: mais XP, mochila maior e uma cama extra.', tier_veteran_d: 'Vantagens de base: metade do upkeep, respawn mais rápido e tag [VIP].', tier_legendary_d: 'Tudo, mais craft mais barato, ferramentas ao nascer e moldura dourada.',
      store_get: 'Pegar no Discord', cmp_xp: 'Bônus de XP', cmp_slot: 'Vaga reservada', cmp_beds: 'Camas', cmp_bedtime: 'Espera da cama', cmp_tools: 'Machado + picareta ao nascer', cmp_craft: 'Custo de craft',
      store_base_note: '* Sem Armário o limite é 15 peças para todo mundo, VIP incluso. Com Armário é 15 + o seu level, até 50. Veteran já começa com 50, Legendary com 65.',
      store_cta: 'Pegar VIP no Discord', per_month: '/mês', per_period: '/período', price_ask: 'Consulte no Discord', currency: 'Moeda', price: 'Preço', free: 'Grátis', store_fine: 'Abra um ticket no nosso Discord para comprar. Digite /vip no jogo para ver quanto tempo falta. Ser VIP não livra ninguém das regras.',
      discord: 'Discord', featured: 'Tutorial #1 — HUD e interface', nav_home: 'Início',
      nav_map: 'Mapa', nav_groups: 'Grupos', nav_first: 'Nunca jogou MTA?', footer_community: 'COMUNIDADE', wiki_home: 'Início da wiki',
      tags: { new: 'Novo', fix: 'Correção', balance: 'Ajuste', event: 'Evento' },
      media_title: 'Checklist de mídias', media_desc: 'Todos os vídeos e prints que os guias estão esperando. Coloque o arquivo em media/ com o nome exato.',
    },
  };
  const t = (k, vars) => {
    let s = (T[lang][k] ?? T.en[k] ?? k);
    if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  const L = (o) => (o ? (o[lang] ?? o.en) : '');

  // categorias: rótulos do data.js (gerado do jogo); a lista abaixo só vale se o data.js for antigo.
  // "cosmeticos" não é categoria de item: abre a galeria de roupas (/wiki/categoria/cosmeticos).
  const CATS = [...((W.categories && W.categories.length) ? W.categories : [
    { id: 'weapons', icon: 'crosshair', en: 'Weapons', pt: 'Armas' },
    { id: 'tools', icon: 'wrench', en: 'Tools', pt: 'Ferramentas' },
    { id: 'resources', icon: 'gem', en: 'Resources', pt: 'Recursos' },
    { id: 'components', icon: 'cog', en: 'Components & Items', pt: 'Componentes e Itens' },
    { id: 'ammo', icon: 'target', en: 'Ammunition', pt: 'Munição' },
    { id: 'food-medical', icon: 'apple', en: 'Food & Medical', pt: 'Comida e Medicamentos' },
    { id: 'armor-clothing', icon: 'shield', en: 'Armor', pt: 'Armaduras' },
    { id: 'clothing', icon: 'user', en: 'Clothing', pt: 'Roupas' },
    { id: 'building', icon: 'building', en: 'Base Building', pt: 'Construção de Bases' },
    { id: 'constructions', icon: 'hammer', en: 'Constructions', pt: 'Construções' },
  ]), { id: 'cosmeticos', icon: 'shirt', en: 'Cosmetics', pt: 'Cosméticos', gallery: true }];
  const TYPES = {
    'Primary Weapon': ['Primary Weapon', 'Arma Primária'], 'Secondary Weapon': ['Secondary Weapon', 'Arma Secundária'], Explosive: ['Explosive', 'Explosivo'],
    Tool: ['Tool', 'Ferramenta'], Resource: ['Resource', 'Recurso'], Item: ['Component', 'Componente'], Ammo: ['Ammo', 'Munição'], Food: ['Food', 'Comida'],
    'Raw Food': ['Raw Food', 'Comida Crua'], Drink: ['Drink', 'Bebida'], Medicament: ['Medical', 'Medicamento'], 'Empty Can': ['Empty Can', 'Lata Vazia'],
    Helmet: ['Helmet', 'Capacete'], Vest: ['Vest', 'Colete'], Hazmat: ['Hazmat', 'Hazmat'], Shirt: ['Shirt', 'Camisa'], Pants: ['Pants', 'Calça'], Shoes: ['Shoes', 'Calçado'], Hat: ['Hat', 'Chapéu'], 'Base Object': ['Base Object', 'Estrutura de Base'],
    Construction: ['Construction', 'Construção'], 'Vehicle Part': ['Vehicle Part', 'Peça de Veículo'],
    ...(W.types || {}),
  };
  const typeName = (ty) => (TYPES[ty] ? TYPES[ty][lang === 'pt' ? 1 : 0] : ty);
  const SOURCES = {
    'default-barrel': ['Barrels', 'Barris'], 'industrial-barrel': ['Industrial barrels', 'Barris industriais'], 'flammable-barrel': ['Red fuel barrels', 'Barris vermelhos'],
    'default-box': ['Loot crates', 'Caixas de loot'], 'military-box': ['Military crates', 'Caixas militares'], 'military-barrel': ['Military barrels', 'Barris militares'],
    helicopter: ['Patrol helicopter wreck', 'Destroços do helicóptero'], airdrop: ['Airdrop', 'Airdrop'], hospital: ['Hospital med packs', 'Kits médicos dos hospitais'],
    tree: ['Trees', 'Árvores'], rock: ['Grey rocks', 'Pedras cinzas'], 'iron-rock': ['Iron rocks', 'Pedras de ferro'], 'sulfur-rock': ['Yellow sulfur rocks', 'Pedras amarelas de enxofre'],
    planter: ['Grown in a Planter', 'Plantado na Plantadora'], fill: ['Fill a canteen at a lake, river, Well or Water Barrel', 'Encha o cantil num lago, rio, Poço ou Barril de Água'],
    cook: ['Cook Raw Meat on a Campfire or Furnace', 'Cozinhe Carne Crua na Fogueira ou Fornalha'],
    ...(W.sourceNames || {}),
  };
  const SRC_ICON = { tree: 'tree', rock: 'pickaxe', 'iron-rock': 'pickaxe', 'sulfur-rock': 'pickaxe', planter: 'sprout', fill: 'droplet', cook: 'flame', helicopter: 'zap', airdrop: 'package', hospital: 'cross' };

  // ---------------------------------------------------------------- icons (lucide-like paths)
  const P = {
    crosshair: '<circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
    car: '<path d="M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3z"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 0-5-5l2.3 2.3-2 2-2.3-2.3a4 4 0 0 0 5 5"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6-4 12"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    apple: '<path d="M12 7c-2-2-7-2-7 4 0 5 3 10 5 10 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 5-5 5-10 0-6-5-6-7-4z"/><path d="M12 7c0-2 1-4 3-4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    hammer: '<path d="m15 12-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 15 22 10.6 13.4 2 9 6.4z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-4A13 13 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    'heart-pulse': '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.2 12H9l.5-1 2 4.5 2-7 1.5 3.5h5.3"/>',
    pickaxe: '<path d="M14.5 12.5 4 23 1 20l10.5-10.5"/><path d="M16 3a14 14 0 0 1 5 5M3 8a14 14 0 0 1 13-5l5 5a14 14 0 0 1-5 13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    scroll: '<path d="M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M10 8h6M10 12h6"/>',
    flask: '<path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20L14 9V3"/><path d="M7 15h10"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.3 1.8 1.4 2.7 2.5 2.7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    map: '<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', arrowl: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', star: '<path d="m12 2 3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z"/>',
    tree: '<path d="M12 22v-6M7 16h10l-3-4h2l-4-5h1L12 3 9 7h1l-4 5h2z"/>', sprout: '<path d="M7 20h10M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 12c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
    droplet: '<path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z"/>', zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>', package: '<path d="M16.5 9.4 7.5 4.2M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>', box: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>', recycle: '<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.8L7 10M11 19h9.2a1.8 1.8 0 0 0 1.6-2.8l-1.6-2.6M14 16l-3 3 3 3M8.3 13.6 7 10l-3.8 1.3M9.3 5.6 11 3a1.8 1.8 0 0 1 3.2 0l4.7 7.5M13.4 10.3 19 10.5l-.2-3.8"/>',
    video: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/>', image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    list: '<path d="M10 6h11M10 12h11M10 18h11M3 6h.01M3 12h.01M3 18h.01"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    chevrons: '<path d="m6 17 6-5 6 5"/><path d="m6 11 6-5 6 5"/>', gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    bug: '<path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 1 1 6 0v1.1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
    skull: '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2M12.5 17l-.5-1-.5 1zM16 20a2 2 0 0 0 1.6-.9A8 8 0 1 0 6.4 19.1 2 2 0 0 0 8 20"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    youtube: '<path d="M22 8.6c-.2-1.6-1-2.7-2.7-2.9C16.9 5.4 12 5.4 12 5.4s-4.9 0-7.3.3C3 5.9 2.2 7 2 8.6 1.8 10 1.8 12 1.8 12s0 2 .2 3.4c.2 1.6 1 2.7 2.7 2.9 2.4.3 7.3.3 7.3.3s4.9 0 7.3-.3c1.7-.2 2.5-1.3 2.7-2.9.2-1.4.2-3.4.2-3.4s0-2-.2-3.4Z"/><path d="m10 15 5-3-5-3Z"/>',
    tiktok: '<path d="M16 3c.4 2.6 2 4.2 4.5 4.4v3.2c-1.6 0-3.1-.5-4.5-1.4V15a6 6 0 1 1-6-6v3.3A2.7 2.7 0 1 0 12.7 15V3Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    play: '<path d="M7 4v16l13-8Z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    discord: '<path d="M8 12h.01M16 12h.01M7.5 7.5c3-1 6-1 9 0M7 16.5c3.3 1.3 6.7 1.3 10 0M15.5 17l1 2c2-.6 3.9-1.6 5.5-3 .4-4.6-.8-8.6-3-12-1.3-.6-2.7-1-4-1.3L14.5 4M8.5 17l-1 2c-2-.6-3.9-1.6-5.5-3-.4-4.6.8-8.6 3-12 1.3-.6 2.7-1 4-1.3L9.5 4"/>',
  };
  const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.box}</svg>`;

  // peças de construção: desenho simples por tipo, cor por material
  const TIER_COL = ['#d9b97e', '#b07a45', '#a8a39d', '#7f93a6', '#ff8a33'];
  const PIECE_SVG = {
    foundation: '<path d="M3 15l9-5 9 5-9 5z"/><path d="M3 15v3l9 5 9-5v-3"/>',
    'foundation-triangular': '<path d="M3 17l9-12 9 12z"/><path d="M3 17v2h18v-2"/>',
    'foundation-div': '<path d="M3 15l9-5 4.5 2.5-9 5z"/><path d="M3 15v3l4.5 2.5v-3"/>',
    wall: '<rect x="4" y="3" width="16" height="18"/><path d="M4 9h16M4 15h16M10 3v6M14 9v6M10 15v6"/>',
    'wall-div': '<rect x="4" y="11" width="16" height="10"/><path d="M4 16h16M10 11v5M14 16v5"/>',
    wallport: '<path d="M4 3h16v18h-5v-9H9v9H4z"/>', window: '<rect x="4" y="3" width="16" height="18"/><rect x="8" y="8" width="8" height="6"/><path d="M12 8v6"/>',
    stairs: '<path d="M3 21h4v-4h4v-4h4V9h4V5h2v16z"/>', gate: '<rect x="3" y="4" width="18" height="17"/><path d="M12 4v17M7 4v17M17 4v17M3 10h18"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r="1"/>', ceiling: '<path d="M2 10l10-5 10 5-10 5z"/><path d="M2 10v2l10 5 10-5v-2"/>',
    'ceiling-div': '<path d="M2 10l10-5 5 2.5-10 5z"/><path d="M2 10v2l5 2.5v-2"/>', 'ceiling-triangular': '<path d="M3 15 12 5l9 10z"/><path d="M3 15v2h18v-2"/>',
    'ceiling-stairs': '<path d="M2 10l10-5 10 5-10 5z"/><path d="M8 10l4-2 4 2-4 2z"/>',
  };
  // caminhos do data.js são relativos (icons/x.png): com rotas como /wiki/item/x precisam começar na raiz
  const abs = (u) => (!u || /^(https?:|data:|\/)/.test(u) ? u : '/' + u);
  const iconOf = (it, cls = 'ic') => {
    if (!it) return `<span class="${cls}">${svg('box')}</span>`;
    if (it.icon) return `<span class="${cls}"><img src="${abs(it.icon)}" alt="" loading="lazy"></span>`;
    if (it.piece) return `<span class="${cls}" style="color:${TIER_COL[it.tier]}"><svg viewBox="0 0 24 24">${PIECE_SVG[it.piece] || P.box}</svg></span>`;
    return `<span class="${cls}">${svg('box')}</span>`;
  };

  const byId = Object.fromEntries(W.items.map((i) => [i.id, i]));
  const name = (it) => (it ? L(it.name) : '?');
  const sortByName = (a, b) => name(a).localeCompare(name(b), lang === 'pt' ? 'pt-BR' : 'en');

  // ---------------------------------------------------------------- sidebar
  function renderSide(cur) {
    const a = (href, icon, label) => `<a href="${href}" class="${cur === href ? 'on' : ''}"${cur === href ? ' aria-current="page"' : ''}>${svg(icon)}<span>${esc(label)}</span></a>`;
    // no celular o menu do topo some: as páginas principais ficam aqui em cima
    $('#sideNav').innerHTML = `
      <div class="nav-group side-main"><h5>HAVOK</h5>
        ${a('/', 'rocket', t('nav_home'))}
        ${a('/mapa', 'map', t('nav_map'))}
        ${a('/ranking', 'award', t('nav_ranking'))}
        ${a('/ranking?tab=grupos', 'users', t('nav_groups'))}
        ${a('/wipe', 'clock', t('nav_wipe'))}
        ${a('/loja', 'crown', t('nav_store'))}
        ${a('/badges', 'shield', t('nav_badges'))}
        ${a('/perfil', 'user', acct && acct.loggedIn ? t('nav_profile') : (lang === 'pt' ? 'Conectar Discord' : 'Connect Discord'))}
        <a href="/play/">${svg('play')}<span>${esc(t('nav_play'))}</span></a>
        <a href="${esc((window.HAVOK || {}).discord || '#')}" target="_blank" rel="noopener">${svg('discord')}<span>Discord ↗</span></a>
      </div>
      <div class="nav-group"><h5>Wiki</h5>
        ${a('/wiki', 'book', t('wiki_home'))}
        ${a('/wiki/itens', 'grid', t('all_items'))}
        ${CATS.map((c) => a('/wiki/categoria/' + c.id, c.icon, c[lang])).join('')}
        ${a('/wiki/veiculos', 'car', lang === 'pt' ? 'Veículos' : 'Vehicles')}
        ${a('/wiki/faq', 'help', 'FAQ')}
      </div>
      <div class="nav-group"><h5>${t('guides_h')}</h5>
        ${a('/wiki/guias', 'book', t('all_guides'))}
        ${W.guides.map((g) => a('/wiki/guia/' + g.slug, g.icon, L(g).title)).join('')}
      </div>`;
  }

  // ---------------------------------------------------------------- pages
  // //------------------- wiki (B3): textos, ícones extras e ajudantes -------------------\\
  // Textos da wiki e do mapa ficam aqui (e não no T lá de cima) para a wiki mudar sem mexer no resto do site.
  const WT = {
    en: {
      hero_t: 'HAVOK Wiki', hero_s: 'Every item, recipe, loot spot and system on the server, read straight from the game code.',
      search_ph: 'Search items, guides, outfits, vehicles…', s_items: 'items', s_guides: 'guides', s_cos: 'outfits', s_veh: 'vehicles',
      try: 'Popular', start_h: 'New here? Start with these', all_guides: 'All guides', cats_h: 'Categories', guides_h: 'Guides', more_h: 'Reference',
      soon: 'Coming soon', soon_h: 'Coming in the next update', soon_s: 'Already running on the test server. They land on the official server with the next update.',
      soon_note: 'Already in the game on the test server; it reaches the official server with the next update. Numbers can still change.',
      results: '{n} results for “{q}”', res_items: 'Items', res_guides: 'Guides', res_cos: 'Cosmetics', res_veh: 'Vehicles',
      no_match: 'Nothing found for “{q}”. Try the name in English or Portuguese, or browse the categories below.', see_all: 'See all {n}',
      shop_h: 'Shop', shop_for: 'for {n}', shop_unit: 'each', scrap: 'Scrap', shop_how: 'How the shop works', shop_sec: 'Section',
      where_h: 'Where to find', bp_drop: 'Ready-made blueprint', m_reward: 'Mission reward', m_bp: 'Blueprint from a mission', m_need: 'Mission asks for it',
      air_chance: '{n}% chance in each airdrop', air_bp: 'blueprint: {n}%', missions_how: 'How missions work',
      equip_h: 'Equipment', slot: 'Body slot', bonus: 'Extra inventory slots', durability: 'Durability', note: 'Good to know',
      slots: ['Head', 'Mask', 'Torso', 'Legs', 'Vest', 'Backpack', 'Suit', 'Feet', 'Glasses', 'Radio'], equip_how: 'Equipment & backpacks',
      f_shop: 'In the shop', f_soon: 'Coming soon', f_all: 'All', clear: 'Clear filters',
      read_min: '{n} min read', on_page: 'On this page', in_guide: 'Items in this guide', guide_soon: 'Part of this guide covers features coming in the next update.',
      faq_more: 'Still stuck?', faq_more_s: 'Ask on Discord: staff and players answer there.', faq_filter: 'Filter questions…', faq_none: 'No question matches that.',
      cos_t: 'Cosmetics', cos_s: '{n} clothes and accessories for your character. Looks only: protection comes from vests, helmets, masks and suits.',
      cos_note: 'Cosmetics come with the character creator in the next update. Prices and drops below are from the test server.',
      cos_card: 'Clothes, caps, glasses and backpacks for your character', cos_open: 'Open the gallery',
      tier: 'Tier', male: 'Male only', price: '{n} Scrap', all: 'All', cos_none: 'No outfit with these filters.',
      w: { shop: 'Shop', loot: 'Loot', airdrop: 'Airdrop', craft: 'Craft' }, w_from: 'Drops from',
      bonus_slots: '+{n} slots', see_item: 'See the item',
      // mapa
      map_h: 'Reading the map', map_s: 'Drag to move, scroll or pinch to zoom, click a marker for details. The filter panel hides or shows each layer.',
      air_h: 'Airdrop', air_none: 'No crate in the air right now.', air_every: 'A plane drops a crate every {n} min somewhere on the map. The marker shows up on its own: no need to reload.',
      air_falling: 'Falling now{near}.', air_landed: 'On the ground, still closed{near}.', air_opened: 'Already opened{near}.', air_err: 'Could not reach the server; the map keeps trying.', air_near: ' near {z}',
      air_guide: 'What comes in the crate', map_guides: 'Related guides',
      lg: {
        safezone: 'No damage inside. Protection lasts {s} s after you leave; no building within {b} m.',
        shop: 'Buy and sell for Scrap.', mission: 'Hand in items for rewards and XP.',
        military: 'The best loot on the map, and the most players.', gate: 'Open with a KeyCard of the right color.',
        radiation: 'Burns your blood. Gas mask or Radiation Suit.', cold: 'Freezes without an Arctic Suit.',
        hospital: 'Med packs to loot.', recycler: 'Turn junk into Scrap and parts.', gas: 'Fill a Gas Can at the pump.',
        oil: 'Out at sea, guarded loot.', island: 'Reach them by boat.', radio: 'HAVOK Radio plays here.',
      },
    },
    pt: {
      hero_t: 'Wiki do HAVOK', hero_s: 'Todos os itens, receitas, lugares de loot e sistemas do servidor, lidos direto do código do jogo.',
      search_ph: 'Buscar itens, guias, roupas, veículos…', s_items: 'itens', s_guides: 'guias', s_cos: 'roupas', s_veh: 'veículos',
      try: 'Mais buscados', start_h: 'Chegou agora? Comece por estes', all_guides: 'Todos os guias', cats_h: 'Categorias', guides_h: 'Guias', more_h: 'Consulta',
      soon: 'Em breve', soon_h: 'Chega na próxima atualização', soon_s: 'Já rodando no servidor de testes. Sobe para o oficial no próximo pacote.',
      soon_note: 'Já está no jogo no servidor de testes e chega ao servidor oficial na próxima atualização. Os números ainda podem mudar.',
      results: '{n} resultados para “{q}”', res_items: 'Itens', res_guides: 'Guias', res_cos: 'Cosméticos', res_veh: 'Veículos',
      no_match: 'Nada encontrado para “{q}”. Tente o nome em português ou inglês, ou navegue pelas categorias abaixo.', see_all: 'Ver todos os {n}',
      shop_h: 'Loja', shop_for: 'por {n}', shop_unit: 'cada', scrap: 'Sucata', shop_how: 'Como funciona a loja', shop_sec: 'Seção',
      where_h: 'Onde achar', bp_drop: 'Blueprint pronta', m_reward: 'Recompensa de missão', m_bp: 'Blueprint de missão', m_need: 'Missão pede este item',
      air_chance: '{n}% de chance em cada airdrop', air_bp: 'blueprint: {n}%', missions_how: 'Como funcionam as missões',
      equip_h: 'Equipamento', slot: 'Espaço do corpo', bonus: 'Espaços extras no inventário', durability: 'Durabilidade', note: 'Bom saber',
      slots: ['Cabeça', 'Máscara', 'Tronco', 'Pernas', 'Colete', 'Mochila', 'Traje', 'Pés', 'Óculos', 'Rádio'], equip_how: 'Equipamento e mochilas',
      f_shop: 'Na loja', f_soon: 'Em breve', f_all: 'Todos', clear: 'Limpar filtros',
      read_min: '{n} min de leitura', on_page: 'Nesta página', in_guide: 'Itens deste guia', guide_soon: 'Parte deste guia fala de coisas que chegam na próxima atualização.',
      faq_more: 'Ainda com dúvida?', faq_more_s: 'Pergunte no Discord: a staff e os jogadores respondem lá.', faq_filter: 'Filtrar perguntas…', faq_none: 'Nenhuma pergunta com isso.',
      cos_t: 'Cosméticos', cos_s: '{n} roupas e acessórios para o seu personagem. Só visual: quem protege é colete, capacete, máscara e traje.',
      cos_note: 'Os cosméticos chegam junto com o criador de personagem na próxima atualização. Preços e drops abaixo são do servidor de testes.',
      cos_card: 'Roupas, bonés, óculos e mochilas para o seu personagem', cos_open: 'Abrir a galeria',
      tier: 'Raridade', male: 'Só masculino', price: '{n} de Sucata', all: 'Todos', cos_none: 'Nenhuma roupa com esses filtros.',
      w: { shop: 'Loja', loot: 'Loot', airdrop: 'Airdrop', craft: 'Craft' }, w_from: 'Cai em',
      bonus_slots: '+{n} espaços', see_item: 'Ver o item',
      map_h: 'Como ler o mapa', map_s: 'Arraste para mover, use a roda ou dois dedos para o zoom e clique num ponto para ver os detalhes. O painel de filtros mostra ou esconde cada camada.',
      air_h: 'Airdrop', air_none: 'Nenhuma caixa no ar agora.', air_every: 'Um avião solta uma caixa a cada {n} min em algum ponto do mapa. O marcador aparece sozinho, sem recarregar a página.',
      air_falling: 'Caindo agora{near}.', air_landed: 'No chão, ainda fechada{near}.', air_opened: 'Já foi aberta{near}.', air_err: 'Sem resposta do servidor; o mapa continua tentando.', air_near: ' perto de {z}',
      air_guide: 'O que vem na caixa', map_guides: 'Guias relacionados',
      lg: {
        safezone: 'Ninguém leva dano lá dentro. A proteção dura {s} s depois de sair; não dá para construir a menos de {b} m.',
        shop: 'Compra e venda por Sucata.', mission: 'Entregue itens e ganhe recompensa e XP.',
        military: 'O melhor loot do mapa, e a maior parte dos jogadores.', gate: 'Abre com o KeyCard da cor certa.',
        radiation: 'Tira sangue. Máscara de gás ou Roupa Anti-Radiação.', cold: 'Congela sem o Traje Ártico.',
        hospital: 'Kits médicos para lootear.', recycler: 'Transforma lixo em Sucata e peças.', gas: 'Encha o Galão na bomba.',
        oil: 'No meio do mar, loot com guarda.', island: 'Só de barco.', radio: 'Onde toca a HAVOK Rádio.',
      },
    },
  };
  const wt = (k, vars) => {
    let s = WT[lang][k] ?? WT.en[k] ?? k;
    if (vars && typeof s === 'string') for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  Object.assign(P, {
    shirt: '<path d="M8 3 4 5.5 2 10l3 1.5V21h14v-9.5L22 10l-2-4.5L16 3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
    hourglass: '<path d="M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10"/>',
    backpack: '<path d="M5 20V10a7 7 0 0 1 14 0v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 4.5V3h6v1.5M8 22v-6h8v6M8 12h8"/>',
    shield2: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 7v10M8 11h8"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    // os mesmos desenhos do mapa (mapa/mapa.js), para a legenda da página /mapa
    m_fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 2v8a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    m_card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    m_rad: '<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4 9.2 5.6a7.5 7.5 0 0 1 5.6 0zM13.4 12.8l5.5.1a7.5 7.5 0 0 1-2.8 4.9zM10.6 12.8l-2.7 5a7.5 7.5 0 0 1-2.8-4.9z"/>',
    m_snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>',
    m_speaker: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    m_oil: '<path d="M8 21 12 3l4 18M9.5 14h5M10.5 9h3M4 21h16M12 3v-1"/><path d="M16 8h4v3"/>',
  });
  const SLOT_IC = ['user', 'skull', 'shirt', 'user', 'shield', 'backpack', 'shield2', 'user', 'search', 'megaphone'];
  const isSoon = (x) => !!(x && x.soon);
  const soonTag = (cls = '') => `<span class="soon-tag ${cls}" title="${esc(wt('soon_note'))}">${svg('hourglass')}${esc(wt('soon'))}</span>`;
  const fmtN = (n) => Number(n).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const scrapIc = () => (byId.scrap && byId.scrap.icon ? `<img class="scrap-ic" src="${abs(byId.scrap.icon)}" alt="" width="20" height="20" loading="lazy">` : svg('coins'));
  const COS = (W.cosmetics || []);
  const cosAll = COS.flatMap((c) => c.items.map((i) => Object.assign({ cat: c.id }, i)));
  const cosTier = (k) => L((W.cosmeticTiers || {})[k]) || k;
  const missionById = Object.fromEntries((W.missions || []).map((m) => [m.id, m]));
  const shopCat = Object.fromEntries((W.shop || []).map((c) => [c.id, c]));
  const guideBySlug = Object.fromEntries(W.guides.map((g) => [g.slug, g]));
  const guideLink = (slug, label) => (guideBySlug[slug] ? `<a class="g-link" href="/wiki/guia/${slug}">${svg(guideBySlug[slug].icon)}<span>${esc(label || L(guideBySlug[slug]).title)}</span>${svg('chevron')}</a>` : '');
  const catCount = (c) => (c.gallery ? cosAll.length : W.items.filter((i) => i.cat === c.id).length);

  const crumbs = (parts) => `<nav class="crumbs" aria-label="breadcrumb">${parts.map((p, i) => (i < parts.length - 1 ? `<a href="${p[1]}">${esc(p[0])}</a>${svg('chevron')}` : `<span class="cur" aria-current="page">${esc(p[0])}</span>`)).join('')}</nav>`;

  function featuredVideo() {
    const yt = youtubeId((window.HAVOK || {}).featured);
    if (!yt) return '';
    return `<div class="section-title">${t('featured')}</div>
      <figure class="media"><div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${t('featured')}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div></figure>`;
  }

  // //------------------- busca da wiki (itens, guias, cosméticos, veículos) -------------------\\
  // nome começando com o termo vem antes de nome que só contém o termo; o outro idioma e o tipo também contam
  function wikiFind(qRaw) {
    const q = norm(qRaw.trim());
    if (!q) return null;
    const sc = (main, other, extra) => { const a = norm(main); return a.startsWith(q) ? 0 : a.split(/\s+/).some((w) => w.startsWith(q)) ? 1 : a.includes(q) ? 2 : norm(other).includes(q) ? 3 : norm(extra).includes(q) ? 4 : 9; };
    const rank = (arr, f) => arr.map((x) => [x, f(x)]).filter((x) => x[1] < 9).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
    return {
      q: qRaw.trim(),
      items: rank(W.items, (i) => sc(name(i), lang === 'pt' ? i.name.en : i.name.pt, typeName(i.type) + ' ' + (i.key || ''))),
      guides: rank(W.guides, (g) => sc(L(g).title, (lang === 'pt' ? g.en : g.pt).title, L(g).description)),
      cos: rank(cosAll, (c) => sc(L(c.name), lang === 'pt' ? c.name.en : c.name.pt, c.key)),
      veh: rank(W.vehicles || [], (v) => sc(v.name, '', v.cat)),
    };
  }
  function wikiResults(r) {
    if (!r) return '';
    const n = r.items.length + r.guides.length + r.cos.length + r.veh.length;
    if (!n) return `<div class="ws-empty">${svg('search')}<p>${esc(wt('no_match', { q: r.q }))}</p></div>`;
    const sec = (title, list, max, row, more) => (list.length ? `<section class="ws-sec"><h3>${esc(title)} <span>${list.length}</span></h3><div class="ws-list">${list.slice(0, max).map(row).join('')}</div>${list.length > max && more ? more : ''}</section>` : '');
    return `<p class="ws-count" role="status">${esc(wt('results', { n, q: r.q }))}</p>
      ${sec(wt('res_items'), r.items, 12, itemCard, `<a class="ws-more" href="/wiki/itens?q=${encodeURIComponent(r.q)}">${esc(wt('see_all', { n: r.items.length }))} ${svg('arrowr')}</a>`)}
      ${sec(wt('res_guides'), r.guides, 6, (g) => `<a class="ws-guide" href="/wiki/guia/${g.slug}"><span class="w-guide-ic">${svg(g.icon)}</span><span><b>${esc(L(g).title)}</b><small>${esc(L(g).description)}</small></span></a>`)}
      ${sec(wt('res_cos'), r.cos, 8, cosCard, `<a class="ws-more" href="/wiki/categoria/cosmeticos">${esc(wt('cos_open'))} ${svg('arrowr')}</a>`)}
      ${sec(wt('res_veh'), r.veh, 6, (v) => `<a class="ws-veh" href="/wiki/veiculos"><img src="/vehicles/${v.id}.webp" alt="" loading="lazy" width="102" height="62"><b>${esc(v.name)}</b></a>`)}`;
  }

  // //------------------- início da wiki -------------------\\
  const POPULAR = ['c4', 'assault-rifle', 'furnace', 'workbench', 'backpack-alice-camo', 'helmet', 'scrap', 'sleeping-bag'];
  function pageHome() {
    const nVeh = (W.vehicles || []).length;
    const start = ['first-10-minutes', 'getting-started', 'survival-basics'].map((s) => guideBySlug[s]).filter(Boolean);
    const soonItems = W.items.filter(isSoon);
    // 3 ícones de itens de verdade por categoria (os de maior level primeiro: mais reconhecíveis)
    const peek = (c) => (c.gallery ? cosAll.filter((x) => x.image).slice(0, 40).filter((_, i) => i % 13 === 0).slice(0, 3).map((x) => x.image)
      : W.items.filter((i) => i.cat === c.id && i.icon).sort((a, b) => (b.blueprint || 0) - (a.blueprint || 0) || (b.level || 0) - (a.level || 0)).slice(0, 3).map((i) => i.icon));
    // peças de base não têm ícone no jogo: o desenho da peça na cor do material
    const pieces = (c) => [['foundation', 2], ['wall', 3], ['door', 4]].map(([pc, tier]) => `<svg class="wk-piece" viewBox="0 0 24 24" style="color:${TIER_COL[tier]}">${PIECE_SVG[pc]}</svg>`).join('');
    const popular = POPULAR.map((id) => byId[id]).filter(Boolean);
    setTimeout(() => {
      const inp = $('#wq'), out = $('#wqOut'), rest = $('#wRest');
      if (!inp) return;
      const run = () => {
        const r = wikiFind(inp.value);
        out.innerHTML = wikiResults(r);
        out.hidden = !r;
        rest.hidden = !!r;
        try { history.replaceState(history.state, '', r ? `/wiki?q=${encodeURIComponent(r.q)}` : '/wiki'); } catch (e) { /* segue */ }
      };
      inp.addEventListener('input', run);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { const a = out.querySelector('a[href]'); if (a) { e.preventDefault(); go(a.getAttribute('href')); } }
        if (e.key === 'Escape') { inp.value = ''; run(); }
      });
      const q0 = new URLSearchParams(location.search).get('q');
      if (q0) { inp.value = q0; run(); }
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !q0) inp.focus({ preventScroll: true });
      document.querySelectorAll('.wq-pop button').forEach((b) => b.onclick = () => { inp.value = b.dataset.q; run(); inp.focus(); });
    });
    return `<div class="wk">
      <section class="wk-hero">
        <h1 class="wk-title">${esc(wt('hero_t'))}</h1>
        <p class="wk-sub">${esc(wt('hero_s'))}</p>
        <label class="wq">${svg('search')}<input id="wq" type="search" placeholder="${esc(wt('search_ph'))}" autocomplete="off" spellcheck="false" aria-label="${esc(wt('search_ph'))}" enterkeyhint="go"></label>
        <div class="wq-pop"><span>${esc(wt('try'))}</span>${popular.map((i) => `<button type="button" data-q="${esc(name(i))}">${iconOf(i)}${esc(name(i))}</button>`).join('')}</div>
        <dl class="wk-stats">
          <div><dt>${esc(wt('s_items'))}</dt><dd>${W.items.length}</dd></div>
          <div><dt>${esc(wt('s_guides'))}</dt><dd>${W.guides.length}</dd></div>
          <div><dt>${esc(wt('s_cos'))}</dt><dd>${cosAll.length}</dd></div>
          <div><dt>${esc(wt('s_veh'))}</dt><dd>${nVeh}</dd></div>
        </dl>
      </section>
      <div id="wqOut" class="ws" hidden aria-live="polite"></div>
      <div id="wRest">
        ${featuredVideo()}
        <section class="wk-sec">
          <h2 class="wk-h">${esc(wt('start_h'))}</h2>
          <div class="wk-start">${start.map((g, i) => `<a class="card wk-step" href="/wiki/guia/${g.slug}"><span class="wk-step-n">${i + 1}</span><span class="wk-step-ic">${svg(g.icon)}</span><b>${esc(L(g).title)}</b><small>${esc(L(g).description)}</small></a>`).join('')}</div>
        </section>
        <section class="wk-sec">
          <h2 class="wk-h">${esc(wt('cats_h'))}</h2>
          <div class="wk-cats">${CATS.map((c) => `<a class="card wk-cat${c.gallery ? ' is-gallery' : ''}" href="/wiki/categoria/${c.id}">
              <span class="wk-cat-art">${peek(c).map((src) => `<img src="${abs(src)}" alt="" loading="lazy">`).join('') || (W.items.some((i) => i.cat === c.id && i.piece) ? pieces(c) : svg(c.icon))}</span>
              <span class="wk-cat-txt"><b>${esc(c[lang])}</b><small>${t('items_count', { n: catCount(c) })}${c.gallery ? ` · ${esc(wt('soon'))}` : ''}</small></span></a>`).join('')}
            <a class="card wk-cat" href="/wiki/veiculos"><span class="wk-cat-art is-veh">${(W.vehicles || []).slice(0, 1).map((v) => `<img src="/vehicles/${v.id}.webp" alt="" loading="lazy">`).join('')}</span><span class="wk-cat-txt"><b>${lang === 'pt' ? 'Veículos' : 'Vehicles'}</b><small>${nVeh} ${esc(wt('s_veh'))}</small></span></a>
          </div>
        </section>
        ${soonItems.length ? `<section class="wk-sec wk-soon">
          <div class="wk-soon-head"><h2 class="wk-h">${soonTag()} ${esc(wt('soon_h'))}</h2><p>${esc(wt('soon_s'))}</p></div>
          <div class="wk-soon-row">${soonItems.map((i) => `<a href="/wiki/item/${i.id}" title="${esc(name(i))}">${iconOf(i)}<span>${esc(name(i))}</span></a>`).join('')}
            <a href="/wiki/categoria/cosmeticos" class="is-cos"><span class="ic">${svg('shirt')}</span><span>${esc(wt('cos_t'))} · ${cosAll.length}</span></a></div>
        </section>` : ''}
        <section class="wk-sec">
          <div class="wk-sec-head"><h2 class="wk-h">${esc(wt('guides_h'))}</h2><a class="wk-more" href="/wiki/guias">${esc(wt('all_guides'))} ${svg('arrowr')}</a></div>
          <div class="wk-guides">${W.guides.map((g) => guideRow(g)).join('')}</div>
        </section>
        <section class="wk-sec">
          <h2 class="wk-h">${esc(wt('more_h'))}</h2>
          <div class="wk-ref">
            <a class="card wk-refc" href="/wiki/itens">${svg('grid')}<b>${t('all_items')}</b><small>${W.items.length} ${esc(wt('s_items'))}</small></a>
            <a class="card wk-refc" href="/wiki/veiculos">${svg('car')}<b>${lang === 'pt' ? 'Veículos' : 'Vehicles'}</b><small>${nVeh} ${esc(wt('s_veh'))}</small></a>
            <a class="card wk-refc" href="/wiki/faq">${svg('help')}<b>FAQ</b><small>${(W.faq[lang] || W.faq.en).length} ${lang === 'pt' ? 'perguntas' : 'questions'}</small></a>
            <a class="card wk-refc" href="/mapa">${svg('map')}<b>${t('nav_map')}</b><small>${lang === 'pt' ? 'Safe zones, bases, radiação, airdrop' : 'Safe zones, bases, radiation, airdrop'}</small></a>
          </div>
        </section>
      </div>
    </div>`;
  }
  const guideRow = (g) => `<a class="w-guide${g.soon ? ' is-soon' : ''}" href="/wiki/guia/${g.slug}"><span class="w-guide-ic">${svg(g.icon)}</span><span><b>${esc(L(g).title)}${g.soon ? ' ' + soonTag('sm') : ''}</b><small>${esc(L(g).description)}</small></span></a>`;

  // //------------------- lista de itens -------------------\\
  const filt = { q: '', type: '', craft: false, bp: false, bench: false, shop: false, soon: false, sort: 'name' };
  function itemCard(it) {
    if (!it) return '';
    const marks = [];
    if (it.blueprint !== undefined) marks.push(`<span class="m bp" title="${esc(t('bp_tip'))}">${svg('scroll')}BP</span>`);
    if (it.bench) marks.push(`<span class="m bench" title="${esc(t('bench_tip'))}">${svg('hammer')}</span>`);
    const price = it.shop ? `<span class="ic-price" title="${esc(wt('shop_h'))}">${svg('coins')}${fmtN(it.shop.price)}</span>` : '';
    return `<a class="item-card${isSoon(it) ? ' is-soon' : ''}" href="/wiki/item/${it.id}">${iconOf(it)}<span class="ic-txt"><b>${esc(name(it))}</b><small>${esc(typeName(it.type))}</small>${price}</span>${marks.length ? `<span class="tags">${marks.join('')}</span>` : ''}${isSoon(it) ? soonTag('corner') : ''}</a>`;
  }
  function pageList(catId) {
    const cat = CATS.find((c) => c.id === catId);
    if (cat && cat.gallery) return pageCosmetics();
    const base = W.items.filter((i) => !catId || i.cat === catId);
    const types = [...new Set(base.map((i) => i.type))].sort((a, b) => typeName(a).localeCompare(typeName(b)));
    if (filt.type && !types.includes(filt.type)) filt.type = '';
    const q0 = new URLSearchParams(location.search).get('q');
    if (q0 !== null) filt.q = q0;
    const title = cat ? cat[lang] : t('items_title');
    const tab = (href, label, on) => `<a href="${href}" class="${on ? 'on' : ''}"${on ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
    const hasShop = base.some((i) => i.shop), hasSoon = base.some(isSoon);
    const chip = (k, label, extra = '') => `<button type="button" class="chip ${filt[k] ? 'on' : ''}" data-f="${k}" aria-pressed="${filt[k]}">${extra}${esc(label)}</button>`;
    const html = `${crumbs(cat ? [['Wiki', '/wiki'], [t('items_title'), '/wiki/itens'], [title]] : [['Wiki', '/wiki'], [title]])}
      <header class="wl-head"><h1 class="page-title">${esc(title)}</h1><span class="wl-n">${base.length}</span></header>
      <nav class="w-tabs" aria-label="${t('categories')}">${tab('/wiki/itens', t('all_items'), !catId)}${CATS.map((c) => tab('/wiki/categoria/' + c.id, c[lang], c.id === catId)).join('')}</nav>
      <div class="w-filters">
        <label class="w-q">${svg('search')}<input type="search" id="fq" placeholder="${t('filter_here')}" value="${esc(filt.q)}" autocomplete="off" aria-label="${t('filter_here')}"></label>
        <div class="w-toggles">
          ${chip('craft', t('craftable'))}${chip('bp', t('has_bp'))}${chip('bench', t('workbench'))}
          ${hasShop ? chip('shop', wt('f_shop'), svg('coins')) : ''}${hasSoon ? chip('soon', wt('f_soon'), svg('hourglass')) : ''}
          <select id="fsort" aria-label="${t('sort')}"><option value="name">${t('sort_name')}</option><option value="level" ${filt.sort === 'level' ? 'selected' : ''}>${t('sort_level')}</option><option value="price" ${filt.sort === 'price' ? 'selected' : ''}>${lang === 'pt' ? 'Preço na loja' : 'Shop price'}</option></select>
        </div>
        ${types.length > 1 ? `<div class="w-types">${[['', t('all_types')], ...types.map((ty) => [ty, typeName(ty)])].map(([v, l]) => `<button type="button" class="chip type ${filt.type === v ? 'on' : ''}" data-type="${esc(v)}" aria-pressed="${filt.type === v}">${esc(l)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="w-meta"><div class="count" id="fcount" aria-live="polite"></div>
        <div class="w-legend"><span><span class="m bp">${svg('scroll')}BP</span> ${t('legend_bp')}</span><span><span class="m bench">${svg('hammer')}</span> ${t('legend_bench')}</span></div></div>
      <div class="item-grid" id="flist"></div>`;
    setTimeout(() => {
      const draw = () => {
        const q = norm(filt.q);
        const list = base.filter((i) => (!q || norm(name(i)).includes(q) || norm(i.name.en).includes(q) || norm(i.name.pt).includes(q) || norm(typeName(i.type)).includes(q))
          && (!filt.type || i.type === filt.type) && (!filt.craft || i.recipe) && (!filt.bp || i.blueprint !== undefined) && (!filt.bench || i.bench)
          && (!filt.shop || i.shop) && (!filt.soon || isSoon(i)))
          .sort(filt.sort === 'level' ? (a, b) => (a.level || 0) - (b.level || 0) || sortByName(a, b)
            : filt.sort === 'price' ? (a, b) => (a.shop ? 0 : 1) - (b.shop ? 0 : 1) || ((a.shop || {}).price || 0) - ((b.shop || {}).price || 0) || sortByName(a, b) : sortByName);
        $('#fcount').textContent = t('showing', { n: list.length, t: base.length });
        $('#flist').innerHTML = list.length ? list.map(itemCard).join('') : `<div class="empty-state">${svg('search')}<p>${t('no_results')}</p><button type="button" class="btn btn-ghost sm" id="fclear">${esc(wt('clear'))}</button></div>`;
        const c = $('#fclear');
        if (c) c.onclick = () => { Object.assign(filt, { q: '', type: '', craft: false, bp: false, bench: false, shop: false, soon: false }); route(); };
      };
      $('#fq').oninput = (e) => { filt.q = e.target.value; draw(); };
      $('#fsort').onchange = (e) => { filt.sort = e.target.value; draw(); };
      document.querySelectorAll('.w-toggles .chip').forEach((b) => b.onclick = () => {
        const k = b.dataset.f; filt[k] = !filt[k]; b.classList.toggle('on', filt[k]); b.setAttribute('aria-pressed', filt[k]); draw();
      });
      document.querySelectorAll('.w-types .chip').forEach((b) => b.onclick = () => {
        filt.type = b.dataset.type; document.querySelectorAll('.w-types .chip').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); draw();
      });
      const on = $('.w-tabs .on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      draw();
    });
    return html;
  }

  // //------------------- ficha do item -------------------\\
  function ingRow(id, qty, extra = '') {
    const it = byId[id];
    return `<div class="ing">${iconOf(it)}<a href="/wiki/item/${id}"><b>${esc(name(it))}</b></a>${extra}<span class="qty">×${fmtN(qty)}</span></div>`;
  }
  const srcName = (s) => (SOURCES[s] ? SOURCES[s][lang === 'pt' ? 1 : 0] : s);
  const mName = (id) => { const m = missionById[id]; return m ? L(m.name) : '#' + id; };
  function pageItem(id) {
    const it = byId[id];
    if (!it) return pageNotFound();
    const cat = CATS.find((c) => c.id === it.cat);
    const left = [];
    const right = [];
    const badges = [`<span class="badge type">${esc(typeName(it.type))}</span>`];
    if (isSoon(it)) badges.unshift(soonTag('lg'));
    if (it.blueprint) badges.push(`<span class="badge bp" title="${esc(t('bp_tip'))}">${svg('scroll')} ${t('bp_badge', { n: fmtN(it.blueprint) })}</span>`);
    else if (it.blueprint === 0) badges.push(`<span class="badge bp" title="${esc(t('bp_tip'))}">${svg('scroll')} Blueprint · ${t('loot_badge')}</span>`);
    if (it.bench) badges.push(`<span class="badge bench">${svg('hammer')} ${t('bench_badge')}</span>`);

    // números grandes logo abaixo do nome: o que mais se procura de cada item
    const kpi = [];
    if (it.weapon && it.weapon.damage != null) kpi.push([t('damage'), it.weapon.damage + '%']);
    if (it.weapon && it.weapon.mag) kpi.push([t('mag'), it.weapon.mag]);
    if (it.bonus) kpi.push([wt('bonus'), '+' + it.bonus]);
    if (it.durability) kpi.push([wt('durability'), fmtN(it.durability)]);
    if (it.hp) kpi.push([t('health'), fmtN(it.hp)]);
    if (it.slots) kpi.push([t('slots'), it.slots]);
    if (it.shop) kpi.push([wt('shop_h'), `${scrapIc()}${fmtN(it.shop.price)}`, true]);
    if (it.stack && it.stack > 1 && kpi.length < 4) kpi.push([t('stack'), fmtN(it.stack)]);

    if (isSoon(it)) left.push(`<div class="soon-note">${svg('hourglass')}<div><b>${esc(wt('soon'))}</b><p>${esc(wt('soon_note'))}</p></div></div>`);
    if (it.note) left.push(`<div class="note-box">${svg('info')}<div><b>${esc(wt('note'))}</b><p>${esc(L(it.note))}</p></div></div>`);
    if (it.weapon) {
      const w = it.weapon;
      left.push(`<h2 class="section-title">${t('weapon_stats')}</h2><div class="box">
        ${w.damage != null ? `<div class="row"><span>${t('damage')} <small class="muted">(${t('damage_hint')})</small></span><b>${w.damage}%</b></div>` : ''}
        <div class="row"><span>${t('range')}</span><b>${w.range} m</b></div>
        ${w.mag ? `<div class="row"><span>${t('mag')}</span><b>${w.mag}</b></div>` : ''}
        ${w.ammo ? `<div class="row" style="border:0;padding-bottom:6px"><span>${t('ammo')}</span></div><div class="ammo-card">${itemCard(byId[w.ammo])}</div>` : ''}
      </div>`);
    }
    if (it.recipe) {
      const foot = [`<span>${svg('hammer')} ${it.bench ? t('needs_bench') : t('anywhere')}</span>`];
      if (it.level) foot.push(`<span>${svg('star')} ${t('level', { n: it.level })}</span><span class="vip">${t('vip_level', { n: Math.floor(it.level * 0.75) })}</span>`);
      if (it.receive) foot.push(`<span>${t('receive')}: <b>×${it.receive}</b></span>`);
      left.push(`<h2 class="section-title">${t('recipe')}</h2><div class="box">${it.recipe.map((r) => ingRow(r.id, r.qty)).join('')}<div class="box-foot">${foot.join('')}</div></div>`);
      if (it.blueprint !== undefined) left.push(`<div class="bp-note">${svg('scroll')}<div><b>Blueprint</b><p>${t(it.blueprint ? 'bp_explain' : 'bp_explain_loot')}</p><a href="/wiki/guia/loot-crafting-and-blueprints">${t('bp_how')} ${svg('chevron')}</a></div></div>`);
    }
    // onde achar: loot, blueprint pronta, airdrop (com a chance), missões, fornalha, reciclagem
    const where = [];
    const airLoot = (((W.systems || {}).airdrop || {}).loot || []).filter((l) => l.id === it.id);
    const airNormal = airLoot.find((l) => !l.bp), airBp = airLoot.find((l) => l.bp);
    if (it.recipe) where.push(`<div class="obtain">${svg('hammer')}<span>${t('obtain_craft')}</span></div>`);
    W.items.filter((x) => x.furnace && x.furnace.to === it.id).forEach((x) => where.push(`<div class="obtain">${svg('flame')}<span>${t('obtain_furnace')}: <a href="/wiki/item/${x.id}"><b>${esc(name(x))}</b></a></span></div>`));
    if (W.items.some((x) => (x.recycler || []).some((r) => r.id === it.id))) where.push(`<div class="obtain">${svg('recycle')}<span>${t('obtain_recycler')}</span></div>`);
    (it.sources || []).forEach((s) => {
      const extra = s === 'airdrop' && airNormal ? ` <small>${esc(wt('air_chance', { n: airNormal.chance }))}</small>` : '';
      where.push(`<div class="obtain">${svg(SRC_ICON[s] || 'box')}<span>${esc(srcName(s))}${extra}</span></div>`);
    });
    (it.rewardOf || []).forEach((m) => where.push(`<div class="obtain">${svg('gift')}<span>${esc(wt('m_reward'))}: <a href="/wiki/guia/missions"><b>${esc(mName(m))}</b></a></span></div>`));
    if (where.length) right.push(`<div class="box"><h3>${t('how_obtain')}</h3>${where.join('')}</div>`);
    const bpw = [];
    (it.bpSources || []).forEach((s) => bpw.push(`<div class="obtain">${svg(SRC_ICON[s] || 'scroll')}<span>${esc(srcName(s))}${s === 'airdrop' && airBp ? ` <small>${esc(wt('air_bp', { n: airBp.chance }))}</small>` : ''}</span></div>`));
    (it.bpRewardOf || []).forEach((m) => bpw.push(`<div class="obtain">${svg('gift')}<span>${esc(wt('m_bp'))}: <a href="/wiki/guia/missions"><b>${esc(mName(m))}</b></a></span></div>`));
    if (bpw.length) right.push(`<div class="box"><h3>${esc(wt('bp_drop'))}</h3>${bpw.join('')}</div>`);
    if (it.shop) {
      const sc = shopCat[it.shop.cat];
      right.push(`<div class="box shop-box"><h3>${esc(wt('shop_h'))}</h3>
        <div class="shop-price">${scrapIc()}<b>${fmtN(it.shop.price)}</b><span>${esc(wt('scrap'))}${it.shop.qty > 1 ? ' ' + esc(wt('shop_for', { n: it.shop.qty })) : ''}</span></div>
        ${sc ? `<div class="row"><span>${esc(wt('shop_sec'))}</span><b>${esc(L(sc.name))}</b></div>` : ''}
        <a class="box-link" href="/wiki/guia/shop-and-scrap">${esc(wt('shop_how'))} ${svg('chevron')}</a></div>`);
    }
    if (it.equip) {
      const rows = [`<div class="row"><span>${esc(wt('slot'))}</span><b><span class="slot-n">${it.equip}</span> ${esc(wt('slots')[it.equip - 1] || '')}</b></div>`];
      if (it.bonus) rows.push(`<div class="row"><span>${esc(wt('bonus'))}</span><b>+${it.bonus}</b></div>`);
      if (it.durability) rows.push(`<div class="row"><span>${esc(wt('durability'))}</span><b>${fmtN(it.durability)}</b></div>`);
      right.push(`<div class="box"><h3>${esc(wt('equip_h'))}</h3>${rows.join('')}<a class="box-link" href="/wiki/guia/equipment-and-backpacks">${esc(wt('equip_how'))} ${svg('chevron')}</a></div>`);
    }
    if ((it.neededBy || []).length) right.push(`<div class="box"><h3>${esc(wt('m_need'))}</h3>${it.neededBy.map((m) => `<div class="obtain">${svg('list')}<a href="/wiki/guia/missions"><b>${esc(mName(m))}</b></a></div>`).join('')}</div>`);
    if (it.ammoFor) left.push(`<h2 class="section-title">${t('compatible')}</h2><div class="item-grid">${it.ammoFor.map((x) => itemCard(byId[x])).join('')}</div>`);
    if (it.usedIn) left.push(`<h2 class="section-title">${t('used_in')}</h2><div class="item-grid">${it.usedIn.map((x) => itemCard(byId[x])).filter(Boolean).join('')}</div>`);

    const props = [`<div class="row"><span>${t('type')}</span><b>${esc(typeName(it.type))}</b></div>`];
    if (it.stack) props.push(`<div class="row"><span>${t('stack')}</span><b>${fmtN(it.stack)}</b></div>`);
    if (it.recipe) props.push(`<div class="row"><span>${t('bench_req')}</span><b>${it.bench ? t('yes') : t('no')}</b></div>`);
    if (it.level) props.push(`<div class="row"><span>${t('level_req')}</span><b>Lv. ${it.level} <small class="muted">(Legendary ${Math.floor(it.level * 0.75)})</small></b></div>`);
    if (it.blueprint !== undefined) props.push(`<div class="row"><span>${t('blueprint')}</span><b class="blue">${it.blueprint ? t('bp_cost', { n: fmtN(it.blueprint) }) : t('bp_loot')}</b></div>`);
    if (it.hp) props.push(`<div class="row"><span>${t('health')}</span><b>${fmtN(it.hp)}</b></div>`);
    if (it.slots) props.push(`<div class="row"><span>${t('slots')}</span><b>${it.slots}</b></div>`);
    if (it.limit) props.push(`<div class="row"><span>${t('limit')}</span><b>${esc(L(it.limit))}</b></div>`);
    if (it.upgradeTo) props.push(`<div class="row"><span>${t('upgrade')}</span><b><a class="accent" href="/wiki/item/${it.upgradeTo}">${esc(name(byId[it.upgradeTo]))}</a></b></div>`);
    right.unshift(`<div class="box"><h3>${t('properties')}</h3>${props.join('')}</div>`);
    if (it.furnace) right.push(`<div class="box"><h3>${t('furnace')}</h3>${ingRow(it.furnace.to, 1)}<div class="box-foot"><span>${svg('clock')} ${t('speed')}: ${T[lang].speeds[it.furnace.speed]}</span></div></div>`);
    if (it.recycler) right.push(`<div class="box"><h3>${t('recycler')}</h3>${it.recycler.map((r) => ingRow(r.id, r.qty)).join('')}</div>`);
    // cosmético que é o mesmo item (mochilas): mostra a peça na galeria
    const cosTwin = cosAll.find((c) => c.item === it.id);

    const related = W.items.filter((x) => x.id !== it.id && x.type === it.type && (!it.piece || x.piece === it.piece || x.tier === it.tier)).sort(sortByName).slice(0, 6);

    return `${crumbs([['Wiki', '/wiki'], [cat ? cat[lang] : t('items_title'), cat ? '/wiki/categoria/' + cat.id : '/wiki/itens'], [name(it)]])}
      <div class="item-head${isSoon(it) ? ' is-soon' : ''}">${iconOf(it)}<div class="item-head-txt"><div class="badges">${badges.join('')}</div><h1>${esc(name(it))}</h1><p>${esc(L(it.desc))}</p>
        ${kpi.length ? `<dl class="kpis">${kpi.slice(0, 4).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}</div></div>
      <div class="cols"><div class="cols-main">${left.join('')}</div><aside class="cols-side">${right.join('')}${cosTwin ? `<a class="box-link solo" href="/wiki/categoria/cosmeticos?c=${cosTwin.cat}">${svg('shirt')} ${esc(wt('cos_t'))} ${svg('chevron')}</a>` : ''}</aside></div>
      ${related.length ? `<h2 class="section-title related-h">${t('related')}</h2><div class="item-grid">${related.map(itemCard).join('')}</div>` : ''}`;
  }

  // //------------------- galeria de cosméticos -------------------\\
  const cosF = { cat: '', tier: '', where: '' };
  function cosCard(c) {
    const where = (c.where || []).map((w) => `<span class="cw cw-${w}">${esc(wt('w')[w] || w)}</span>`).join('');
    const tip = (c.lootFrom || []).length ? `${wt('w_from')}: ${c.lootFrom.map(srcName).join(', ')}` : '';
    const inner = `<span class="cos-art">${c.image ? `<img src="${abs(c.image)}" alt="" loading="lazy">` : svg('shirt')}</span>
      <span class="cos-tier t-${esc(c.tier)}">${esc(cosTier(c.tier))}</span>
      <b>${esc(L(c.name))}</b>
      <span class="cos-meta">${where}${c.price ? `<span class="cos-price">${svg('coins')}${fmtN(c.price)}</span>` : ''}</span>
      ${c.bonus ? `<span class="cos-bonus">${esc(wt('bonus_slots', { n: c.bonus }))}</span>` : ''}
      ${c.maleOnly ? `<span class="cos-male">${svg('user')}${esc(wt('male'))}</span>` : ''}`;
    return c.item && byId[c.item] ? `<a class="cos-card t-${esc(c.tier)}" href="/wiki/item/${c.item}" title="${esc(tip)}">${inner}</a>` : `<div class="cos-card t-${esc(c.tier)}" title="${esc(tip)}">${inner}</div>`;
  }
  function pageCosmetics() {
    const qc = new URLSearchParams(location.search).get('c');
    if (qc && COS.some((c) => c.id === qc)) cosF.cat = qc;
    const tiers = Object.keys(W.cosmeticTiers || {});
    const wheres = [...new Set(cosAll.flatMap((c) => c.where || []))];
    const chip = (k, v, label, extra = '') => `<button type="button" class="chip ${cosF[k] === v ? 'on' : ''}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${cosF[k] === v}">${extra}${esc(label)}</button>`;
    setTimeout(() => {
      const draw = () => {
        const list = COS.filter((c) => !cosF.cat || c.id === cosF.cat).map((c) => [c, c.items.map((i) => Object.assign({ cat: c.id }, i)).filter((i) => (!cosF.tier || i.tier === cosF.tier) && (!cosF.where || (i.where || []).includes(cosF.where)))]).filter((x) => x[1].length);
        const n = list.reduce((a, x) => a + x[1].length, 0);
        $('#ccount').textContent = t('showing', { n, t: cosAll.length }).replace(lang === 'pt' ? 'itens' : 'items', lang === 'pt' ? 'peças' : 'pieces');
        $('#clist').innerHTML = n ? list.map(([c, items]) => `<section class="cos-sec"><h2 class="wk-h">${esc(L(c.name))} <span>${items.length}</span></h2><div class="cos-grid">${items.map(cosCard).join('')}</div></section>`).join('')
          : `<div class="empty-state">${svg('shirt')}<p>${esc(wt('cos_none'))}</p></div>`;
      };
      document.querySelectorAll('.cos-filters .chip').forEach((b) => b.onclick = () => {
        cosF[b.dataset.k] = b.dataset.v;
        document.querySelectorAll(`.cos-filters .chip[data-k="${b.dataset.k}"]`).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        draw();
      });
      draw();
    });
    return `${crumbs([['Wiki', '/wiki'], [wt('cos_t')]])}
      <header class="cos-hero">
        <div><div class="badges">${soonTag('lg')}</div><h1 class="page-title">${esc(wt('cos_t'))}</h1><p class="page-sub">${esc(wt('cos_s', { n: cosAll.length }))}</p></div>
        <div class="cos-hero-art" aria-hidden="true">${cosAll.filter((c) => c.tier === 'rare' && c.image).slice(0, 5).map((c) => `<img src="${abs(c.image)}" alt="" loading="lazy">`).join('')}</div>
      </header>
      <div class="soon-note">${svg('hourglass')}<div><p>${esc(wt('cos_note'))}</p></div></div>
      <div class="cos-filters">
        <div class="w-types">${chip('cat', '', wt('all'))}${COS.map((c) => chip('cat', c.id, L(c.name))).join('')}</div>
        <div class="w-types">${chip('tier', '', wt('tier') + ': ' + wt('all'))}${tiers.map((k) => chip('tier', k, cosTier(k), `<i class="tdot t-${k}"></i>`)).join('')}
          <span class="cos-sep"></span>${chip('where', '', (lang === 'pt' ? 'Onde: ' : 'Where: ') + wt('all'))}${wheres.map((w) => chip('where', w, wt('w')[w] || w)).join('')}</div>
      </div>
      <div class="count" id="ccount" aria-live="polite"></div>
      <div id="clist"></div>`;
  }

  // ---------------------------------------------------------------- markdown (o suficiente para os guias)
  // nomes de itens nos guias: "**Machado**" vira link para a página do item (nos dois idiomas, aceita plural simples)
  let itemNames = null;
  function itemByName(txt) {
    if (!itemNames) {
      itemNames = new Map();
      W.items.forEach((i) => [i.name.en, i.name.pt].forEach((n) => { const k = norm(n); if (k && !itemNames.has(k)) itemNames.set(k, i.id); }));
      // apelidos usados nos guias
      Object.entries({ machado: 'hatchet', atadura: 'bandage', britadeira: 'jackhammer', bancada: 'workbench', 'cans of beans': 'can-of-beans',
        'latas de feijao': 'can-of-beans', 'hq metal ore': 'hq-metal-ore', 'minerio de metal de alta': 'hq-metal-ore' })
        .forEach(([k, id]) => { if (byId[id] && !itemNames.has(k)) itemNames.set(k, id); });
    }
    const k = norm(txt.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'));
    if (k === 'arrows' || k === 'setas') return null; // "setas" do teclado, não as flechas da besta
    return itemNames.get(k) || itemNames.get(k.replace(/(es|s)$/, '')) || itemNames.get(k.replace(/s$/, ''));
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, (m, txt) => { const id = itemByName(txt); return id ? `<a class="item-link" href="/wiki/item/${id}"><strong>${txt}</strong></a>` : `<strong>${txt}</strong>`; }).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  }
  // aceita o ID puro ou qualquer link do YouTube (watch, youtu.be, shorts, embed)
  function youtubeId(v) {
    if (!v) return '';
    const m = String(v).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/) || String(v).match(/^([\w-]{11})$/);
    return m ? m[1] : '';
  }
  // gravações com o serial do jogador e o chat no canto: o site usa a cópia "<nome>-limpo" (tools/media-sem-serial.sh).
  // É também a lista do que existe em media/: mídia nova gravada no jogo passa pelo script e entra aqui (senão aparece "em breve").
  const MEDIA_CLEAN = new Set(['barrels', 'build-wheel', 'crates', 'first-house', 'gather-tools', 'place-object', 'upgrade', 'vehicles', 'hero', 'spawn', 'pvp', 'hud', 'craft-menu', 'upkeep']);
  const mediaFile = (id) => (MEDIA_CLEAN.has(id) ? id + '-limpo' : id);
  function media(kind, id, caption) {
    const soon = `<div class="soon"><div>${svg(kind === 'video' ? 'video' : 'image')}<b>${t(kind === 'video' ? 'soon_video' : 'soon_shot')}</b>${esc(caption)}</div></div>`;
    // vídeo no YouTube: o link vai em config.js (HAVOK.youtube), pelo nome da mídia (serve até no lugar de um print)
    const yt = youtubeId(((window.HAVOK || {}).youtube || {})[id]);
    if (yt) {
      return `<figure class="media"><div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${esc(caption)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    // arquivo que ainda não foi gravado (não está na lista das versões limpas): mostra o "em breve" direto, sem caixa preta vazia
    if (!MEDIA_CLEAN.has(id)) return `<figure class="media${kind === 'shot' ? ' shot' : ''}">${soon}<figcaption>${esc(caption)}</figcaption></figure>`;
    const f = mediaFile(id);
    // "GIF": mp4 mudo, em loop, sem controles; só baixa e toca quando aparece na tela (lazyMedia)
    if (((window.HAVOK || {}).loops || []).includes(id)) {
      return `<figure class="media"><video class="loop" muted loop playsinline preload="none" data-lazy aria-label="${esc(caption)}"><source data-src="/media/${f}.webm" type="video/webm"><source data-src="/media/${f}.mp4" type="video/mp4"></video><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    if (kind === 'video') {
      return `<figure class="media"><video data-src="/media/${f}.mp4" muted loop playsinline preload="none" data-lazy onerror="this.outerHTML=this.nextElementSibling.innerHTML"></video><template>${soon}</template><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    return `<figure class="media shot"><img src="/media/${f}.webp" alt="${esc(caption)}" loading="lazy" data-alt="png,jpg" onerror="havokImgFallback(this)"><template>${soon}</template><figcaption>${esc(caption)}</figcaption></figure>`;
  }
  window.havokImgFallback = (img) => {
    const alts = (img.dataset.alt || '').split(',').filter(Boolean);
    if (alts.length) {
      const next = alts.shift();
      img.dataset.alt = alts.join(',');
      img.src = img.src.replace(/\.[a-z]+$/, '.' + next);
    } else {
      img.outerHTML = img.nextElementSibling.innerHTML;
    }
  };
  // vídeos dos guias: baixam e tocam só quando aparecem (economiza a internet do celular); fora da tela pausam
  function lazyMedia(root) {
    const vids = [...root.querySelectorAll('video[data-lazy]')];
    const start = (v) => {
      if (!v.dataset.on) {
        v.dataset.on = 1;
        if (v.dataset.src) v.src = v.dataset.src;
        v.querySelectorAll('source').forEach((s) => { s.src = s.dataset.src; });
        v.load();
      }
      if (!reduced()) v.play().catch(() => {});
    };
    if (!('IntersectionObserver' in window)) { vids.forEach(start); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) start(e.target); else e.target.pause(); }), { rootMargin: '150px 0px', threshold: 0.2 });
    vids.forEach((v) => io.observe(v));
    onLeave(() => io.disconnect());
  }
  const slugify = (s) => norm(s.replace(/<[^>]+>/g, '')).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function md(src) {
    const lines = src.split('\n');
    let html = '', list = null, table = null, para = [];
    const flushP = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
    const flushL = () => { if (list) { html += `<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`; list = null; } };
    const flushT = () => {
      if (table) {
        const rows = table.filter((r) => !/^\|[\s|:-]+\|$/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        html += `<div class="table-wrap"><table><thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        table = null;
      }
    };
    const flush = () => { flushP(); flushL(); flushT(); };
    for (const raw of lines) {
      const l = raw.trim();
      let m;
      if (!l) { flush(); continue; }
      if ((m = l.match(/^@(video|shot) ([a-z0-9-]+) \| (.+)$/))) { flush(); html += media(m[1], m[2], m[3]); continue; }
      if ((m = l.match(/^(#{2,3}) (.+)$/))) { flush(); html += `<h${m[1].length} id="${slugify(m[2])}">${inline(m[2])}</h${m[1].length}>`; continue; }
      if (l.startsWith('|')) { flushP(); flushL(); (table = table || []).push(l); continue; }
      if ((m = l.match(/^- (.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ul') { flushL(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^\d+\. (.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ol') { flushL(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushL(); flushT(); para.push(l);
    }
    flush();
    return html;
  }

  // //------------------- guias -------------------\\
  // ordem de leitura: começo, sobrevivência, base, luta, mundo, sistemas
  const GUIDE_GROUPS = [
    { en: 'First steps', pt: 'Primeiros passos', slugs: ['first-10-minutes', 'getting-started', 'survival-basics', 'resource-gathering'] },
    { en: 'Crafting & base', pt: 'Craft e base', slugs: ['loot-crafting-and-blueprints', 'furnaces-recyclers-and-processing', 'base-building', 'equipment-and-backpacks', 'suits'] },
    { en: 'Fighting & the world', pt: 'Luta e o mundo', slugs: ['combat-raiding-and-recovery', 'world-and-events', 'airdrop', 'cold-and-radiation', 'safe-zones'] },
    { en: 'Server systems', pt: 'Sistemas do servidor', slugs: ['shop-and-scrap', 'missions', 'radio', 'teams-and-groups', 'wipe-kit', 'vip'] },
  ];
  function guideGroups() {
    const used = new Set(GUIDE_GROUPS.flatMap((g) => g.slugs));
    const groups = GUIDE_GROUPS.map((g) => ({ name: g[lang], list: g.slugs.map((s) => guideBySlug[s]).filter(Boolean) }));
    const rest = W.guides.filter((g) => !used.has(g.slug));
    if (rest.length) groups.push({ name: lang === 'pt' ? 'Outros' : 'More', list: rest });
    return groups.filter((g) => g.list.length);
  }
  const readMin = (g) => Math.max(1, Math.round(L(g).body.replace(/@\w+ .*$/gm, '').split(/\s+/).length / 200));
  function pageGuides() {
    return `${crumbs([['Wiki', '/wiki'], [t('guides')]])}<h1 class="page-title">${t('guides')}</h1><p class="page-sub">${t('guides_desc')}</p>
      ${guideGroups().map((gr) => `<section class="wk-sec"><h2 class="wk-h">${esc(gr.name)}</h2><div class="wk-guides">${gr.list.map((g) => `<a class="w-guide${g.soon ? ' is-soon' : ''}" href="/wiki/guia/${g.slug}"><span class="w-guide-ic">${svg(g.icon)}</span><span><b>${esc(L(g).title)}${g.soon ? ' ' + soonTag('sm') : ''}</b><small>${esc(L(g).description)}</small><i class="w-guide-min">${esc(wt('read_min', { n: readMin(g) }))}</i></span></a>`).join('')}</div></section>`).join('')}`;
  }
  function pageGuide(slug) {
    const i = W.guides.findIndex((g) => g.slug === slug);
    if (i < 0) return pageNotFound();
    const g = W.guides[i], c = L(g), prev = W.guides[i - 1], next = W.guides[i + 1];
    const body = md(c.body);
    const toc = [...c.body.matchAll(/^## (.+)$/gm)].map((m) => [slugify(m[1]), m[1].replace(/\*\*/g, '')]);
    // itens citados no guia (os nomes em negrito que viraram link), na ordem em que aparecem
    const cited = [...new Set([...body.matchAll(/href="\/wiki\/item\/([a-z0-9-]+)"/g)].map((m) => m[1]))].map((id) => byId[id]).filter(Boolean);
    setTimeout(() => {
      const art = $('.prose');
      if (!art) return;
      lazyMedia(art);
      // sumário: marca a seção que está na tela
      const links = [...document.querySelectorAll('.g-toc a')];
      if (!links.length || !('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      }), { rootMargin: '-20% 0px -70% 0px' });
      art.querySelectorAll('h2[id]').forEach((h) => io.observe(h));
      onLeave(() => io.disconnect());
      document.querySelectorAll('.g-toc a').forEach((a) => a.onclick = (e) => { e.preventDefault(); const h = document.getElementById(a.getAttribute('href').slice(1)); if (h) h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); });
    });
    return `${crumbs([['Wiki', '/wiki'], [t('guides'), '/wiki/guias'], [c.title]])}
      <header class="g-head"><span class="g-ic">${svg(g.icon)}</span><div>
        <h1 class="page-title">${esc(c.title)}</h1><p class="page-sub">${esc(c.description)}</p>
        <p class="g-meta">${svg('clock')} ${esc(wt('read_min', { n: readMin(g) }))}${g.soon ? ' ' + soonTag() : ''}</p></div></header>
      <div class="g-wrap">
        <article class="prose">${g.soon ? `<div class="soon-note">${svg('hourglass')}<div><p>${esc(wt('guide_soon'))}</p></div></div>` : ''}${body}</article>
        <aside class="g-side">
          ${toc.length > 2 ? `<nav class="g-toc" aria-label="${esc(wt('on_page'))}"><h3>${esc(wt('on_page'))}</h3>${toc.map(([id, txt]) => `<a href="#${id}">${esc(txt)}</a>`).join('')}</nav>` : ''}
          ${cited.length ? `<div class="g-items"><h3>${esc(wt('in_guide'))}</h3>${cited.slice(0, 14).map((it) => `<a href="/wiki/item/${it.id}">${iconOf(it)}<span>${esc(name(it))}</span></a>`).join('')}</div>` : ''}
        </aside>
      </div>
      <nav class="pager">${prev ? `<a href="/wiki/guia/${prev.slug}"><small>${t('prev')}</small><b>${esc(L(prev).title)}</b></a>` : '<span></span>'}
      ${next ? `<a class="next" href="/wiki/guia/${next.slug}"><small>${t('next')}</small><b>${esc(L(next).title)}</b></a>` : ''}</nav>`;
  }
  function pageFaq() {
    const list = W.faq[lang] || W.faq.en;
    setTimeout(() => {
      const inp = $('#faqq');
      if (!inp) return;
      inp.oninput = () => {
        const q = norm(inp.value.trim());
        let n = 0;
        document.querySelectorAll('.faq details').forEach((d) => { const on = !q || norm(d.textContent).includes(q); d.hidden = !on; if (on) n++; if (q && on) d.open = true; });
        $('#faqNone').hidden = n > 0;
      };
    });
    return `${crumbs([['Wiki', '/wiki'], ['FAQ']])}<h1 class="page-title">FAQ</h1><p class="page-sub">${t('faq_desc')}</p>
      <label class="w-q faq-q">${svg('search')}<input type="search" id="faqq" placeholder="${esc(wt('faq_filter'))}" aria-label="${esc(wt('faq_filter'))}" autocomplete="off"></label>
      <div class="faq">${list.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${inline(a)}</p></details>`).join('')}
        <p class="empty-state" id="faqNone" hidden>${esc(wt('faq_none'))}</p></div>
      <div class="card faq-more">${svg('discord')}<div><b>${esc(wt('faq_more'))}</b><p>${esc(wt('faq_more_s'))}</p></div><a class="btn btn-discord sm" href="${esc((window.HAVOK || {}).discord || '#')}" target="_blank" rel="noopener">Discord</a></div>`;
  }



  // ---------------------------------------------------------------- veículos (stoneage_vehicles/config.lua via build)
  const VCATS = { armored: ['Armored', 'Blindados'], offroad: ['Off-road', 'Off-road'], sport: ['Sport', 'Esportivos'], sedan: ['Cars', 'Carros'],
    pickup: ['Pickups & vans', 'Picapes e vans'], bike: ['Motorcycles', 'Motos'], utility: ['Utility', 'Utilitários'], boat: ['Boats', 'Barcos'] };
  const VT = {
    en: { title: 'Vehicles', sub: 'Every vehicle on the server and what it needs to run.', all: 'All', map: 'On the map', mapv: 'up to {n}', trunk: 'Trunk', slots: '{n} slots', slot1: '1 slot',
      fuel: 'Fuel', fuelv: 'up to {n}', spawn: 'Spawns', sp: { car: 'Roads and cities', boat: 'Coast and docks', armored: 'Military areas only', bike: 'Trails and back roads', offroad: 'Countryside and hills', pickup: 'Farms and dealers', van: 'City streets', motorhome: 'One spot only' },
      armor: 'Armored: takes half the bullet damage', armor30: 'Heavy truck: takes 30% less bullet damage', needs: 'Needs to run', how: 'How to get one running',
      howtxt: 'Abandoned vehicles are missing parts. Hold right click on one to see what it needs, install the parts, refuel with a Gas Can and press K to start the engine. Without tires a car does not move.',
      none: 'Not on the map yet' },
    pt: { title: 'Veículos', sub: 'Todos os veículos do servidor e o que cada um precisa para andar.', all: 'Todos', map: 'No mapa', mapv: 'até {n}', trunk: 'Porta-malas', slots: '{n} slots', slot1: '1 slot',
      fuel: 'Gasolina', fuelv: 'até {n}', spawn: 'Nasce em', sp: { car: 'Estradas e cidades', boat: 'Litoral e cais', armored: 'Só em áreas militares', bike: 'Trilhas e estradas de terra', offroad: 'Interior e morros', pickup: 'Fazendas e concessionárias', van: 'Ruas da cidade', motorhome: 'Um único ponto' },
      armor: 'Blindado: leva metade do dano de bala', armor30: 'Caminhão pesado: leva 30% menos dano de bala', needs: 'Precisa para andar', how: 'Como colocar um para andar',
      howtxt: 'Veículos abandonados estão sem peças. Segure o clique direito num deles para ver o que falta, instale as peças, abasteça com um Galão com Gasolina e aperte K para ligar o motor. Sem pneu o carro não sai do lugar.',
      none: 'Ainda não nasce no mapa' },
  };
  let vCat = '';
  function pageVehicles() {
    const V = VT[lang], list = (W.vehicles || []).filter((v) => !vCat || v.cat === vCat);
    const fmt = (str, n) => str.replace('{n}', n);
    const part = (id, n) => (n > 0 && byId[id] ? `<a class="vh-part" href="/wiki/item/${id}" title="${esc(name(byId[id]))}">${iconOf(byId[id], 'ic')}<b>×${n}</b></a>` : '');
    setTimeout(() => document.querySelectorAll('.vh-filter button').forEach((b) => b.onclick = () => { vCat = b.dataset.c; route(); }));
    const cats = Object.keys(VCATS).filter((c) => (W.vehicles || []).some((v) => v.cat === c));
    return `${crumbs([['Wiki', '/wiki'], [V.title]])}
      <h1 class="page-title">${V.title}</h1><p class="page-sub">${V.sub}</p>
      <div class="vh-how">${svg('wrench')}<div><b>${V.how}</b><p>${V.howtxt}</p>
        <div class="vh-how-items">${['engine', 'car-battery', 'tire', 'gas-can'].filter((id) => byId[id]).map((id) => `<a href="/wiki/item/${id}">${iconOf(byId[id])}<span>${esc(name(byId[id]))}</span></a>`).join('')}</div></div></div>
      <div class="vh-filter">${[['', V.all], ...cats.map((c) => [c, VCATS[c][lang === 'pt' ? 1 : 0]])].map(([c, n]) => `<button type="button" class="chip ${vCat === c ? 'on' : ''}" data-c="${c}">${esc(n)}</button>`).join('')}</div>
      <div class="vh-grid">${list.map((v) => `<article class="vh-card${v.armored ? ' armored' : ''}">
          <div class="vh-img"><img src="/vehicles/${v.id}.webp" alt="${esc(v.name)}" loading="lazy" width="204" height="125">${v.armored ? `<span class="vh-badge">${svg('shield')}</span>` : ''}</div>
          <div class="vh-body"><b>${esc(v.name)}</b><small>${esc(VCATS[v.cat][lang === 'pt' ? 1 : 0])}</small>
            ${v.armored ? `<p class="vh-armor">${svg('shield')} ${v.armor === 30 ? V.armor30 : V.armor}</p>` : ''}
            <div class="vh-needs"><span>${V.needs}</span><div>${part('engine', v.engine)}${part('car-battery', v.battery)}${part('tire', v.tires)}</div></div>
            <dl><div><dt>${V.fuel}</dt><dd>${fmt(V.fuelv, v.fuel)}</dd></div><div><dt>${V.trunk}</dt><dd>${v.slots === 1 ? V.slot1 : fmt(V.slots, v.slots)}</dd></div>
              <div><dt>${V.map}</dt><dd>${fmt(V.mapv, v.max)}</dd></div><div><dt>${V.spawn}</dt><dd>${V.sp[String(v.spawn).split(',')[0]] || v.spawn}</dd></div></dl></div>
        </article>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- badges (as mesmas do jogo: havok_badges)
  const BRAR = { common: ['Common', '#c9c2b6'], rare: ['Rare', '#4ea8ff'], epic: ['Epic', '#b07bff'], legendary: ['Legendary', '#ffae2e'], mythic: ['Mythic', '#ff3d52'] };
  // arte que só existe em PNG (gerada junto com a do jogo); o resto é SVG
  const BADGE_PNG = new Set(['youtuber', 'tiktoker', 'opening']);
  const badgeImg = (id) => `/badges/${id}.${BADGE_PNG.has(id) || /^newyear\d{4}$/.test(id) ? 'png' : 'svg'}`;
  const BADGE_LIST = [
    ['founder', 'Founder', 'mythic', 'team', 'Part of the team that built HAVOK.', 'Faz parte da equipe que construiu o HAVOK.'],
    ['vanguard', 'Vanguard', 'mythic', 'list', 'One of the first 5 on the waiting list.', 'Um dos 5 primeiros da lista de espera.'],
    ['pioneer', 'Pioneer', 'legendary', 'list', 'Spot 6 to 10 on the waiting list.', 'Posição 6 a 10 da lista de espera.'],
    ['champion', 'Wipe Champion', 'legendary', 'auto', 'Be in the #1 group when the wipe ends. It is a title: it only lasts until the next wipe, then goes to the new #1.', 'Estar no grupo nº 1 quando o wipe fecha. É um título: só vale até o próximo wipe, aí passa para o novo nº 1.'],
    ['creator', 'Content Creator', 'legendary', 'ticket', 'Make videos or streams of HAVOK.', 'Gravar vídeos ou fazer lives do HAVOK.'],
    ['youtuber', 'YouTuber', 'legendary', 'ticket', 'HAVOK content creator on YouTube. Comes with the influencer VIP.', 'Criador de conteúdo do HAVOK no YouTube. Vem com o VIP de influenciador.'],
    ['tiktoker', 'TikToker', 'legendary', 'ticket', 'HAVOK content creator on TikTok. Comes with the influencer VIP.', 'Criador de conteúdo do HAVOK no TikTok. Vem com o VIP de influenciador.'],
    ['early', 'Early Survivor', 'epic', 'list', 'Spot 11 to 15 on the waiting list.', 'Posição 11 a 15 da lista de espera.'],
    ['podium', 'Podium', 'epic', 'auto', 'Be in the #2 or #3 group when the wipe ends. Only lasts until the next wipe: get back on the podium to keep it.', 'Estar no grupo nº 2 ou nº 3 quando o wipe fecha. Só vale até o próximo wipe: volte ao pódio para manter.'],
    ['hunter', 'Hunter Slayer', 'epic', 'auto', 'Shoot down the patrol helicopter.', 'Derrubar o helicóptero de patrulha.'],
    ['firstblood', 'First Blood', 'rare', 'auto', 'Get the first kill after a wipe.', 'Fazer a primeira kill depois de um wipe.'],
    ['killer', 'Killer', 'rare', 'auto', 'Reach 100 kills in a single wipe.', 'Chegar a 100 kills num mesmo wipe.'],
    ['immortal', 'Immortal', 'rare', 'auto', 'Stay alive for 12 hours of play. Offline and AFK do not count.', 'Ficar 12 horas vivo jogando. Offline e AFK não contam.'],
    ['bughunter', 'Bug Hunter', 'rare', 'ticket', 'Report a real bug.', 'Reportar um bug de verdade.'],
    ['veteran', 'Veteran', 'common', 'auto', 'Reach level 50.', 'Chegar ao level 50.'],
  ];
  const BT = {
    en: { title: 'BADGES', sub: 'Earned in game, kept forever. A wipe resets everything except your badge collection.', all: 'All', how: { auto: 'Automatic in game', ticket: 'Ask with a Discord ticket', list: 'Waiting list reward', team: 'HAVOK team only' },
      ingame: 'In game, every badge you own shows next to your name and in the player list. Type /badges to see your collection.',
      wall: 'Waiting list founders', wall_sub: 'The first 15 on the waiting list get a badge for life, plus VIP Survivor days at launch.',
      tiers: [['vanguard', '#01–05', '30 days VIP Survivor'], ['pioneer', '#06–10', '15 days VIP Survivor'], ['early', '#11–15', '7 days VIP Survivor']],
      open: 'Open spot', join: 'Join the Discord', wall_err: 'Could not load the list right now.' },
    pt: { title: 'BADGES', sub: 'Conquistadas no jogo, guardadas para sempre. O wipe zera tudo, menos a sua coleção de badges.', all: 'Todas', how: { auto: 'Automática no jogo', ticket: 'Peça por ticket no Discord', list: 'Prêmio da lista de espera', team: 'Só a equipe do HAVOK' },
      ingame: 'No jogo, todas as badges que você tem aparecem do lado do seu nome e na lista de jogadores. Digite /badges para ver a sua coleção.',
      wall: 'Fundadores da lista de espera', wall_sub: 'Os 15 primeiros da lista ganham uma badge para sempre e dias de VIP Survivor na inauguração.',
      tiers: [['vanguard', '#01–05', '30 dias de VIP Survivor'], ['pioneer', '#06–10', '15 dias de VIP Survivor'], ['early', '#11–15', '7 dias de VIP Survivor']],
      open: 'Vaga aberta', join: 'Entrar no Discord', wall_err: 'Não deu para carregar a lista agora.' },
  };
  let bRar = '';
  function pageBadges() {
    const B = BT[lang], H = window.HAVOK || {};
    const api = ((H.waitlist || {}).api || '').replace(/\/waitlist$/, '/waitlist/first');
    setTimeout(async () => {
      document.querySelectorAll('.bd-filter button').forEach((b) => b.onclick = () => { bRar = b.dataset.r; route(); });
      const wall = $('#bdWall');
      if (!wall || !api) return;
      let first = null;
      try { const r = await fetch(api, { cache: 'no-cache' }); const j = r.ok ? await r.json() : null; first = j && Array.isArray(j.first) ? j.first : null; } catch (e) { first = null; }
      if (!$('#bdWall')) return;
      if (!first) { wall.innerHTML = `<p class="muted">${B.wall_err}</p>`; return; }
      wall.innerHTML = B.tiers.map(([id, range, prize], t) => {
        const slots = Array.from({ length: 5 }, (_, i) => { const pos = t * 5 + i + 1, who = first.find((f) => f.pos === pos);
          return `<li class="${who ? '' : 'open'}"><span>#${String(pos).padStart(2, '0')}</span>${who ? `<b>${esc(who.name)}</b>` : `<i>${B.open}</i>`}</li>`; }).join('');
        const [, name, rar] = BADGE_LIST.find((b) => b[0] === id);
        return `<div class="bd-tier" style="--rc:${BRAR[rar][1]}"><header><img src="${badgeImg(id)}" alt=""><div><b>${name}</b><small>${range} · ${prize}</small></div></header><ol>${slots}</ol></div>`;
      }).join('');
    });
    const list = BADGE_LIST.filter((b) => !bRar || b[2] === bRar);
    return `<section class="bd-hero"><p class="l-kicker">HAVOK · ${B.all === 'All' ? 'Collection' : 'Coleção'}</p><h1 class="page-title">${B.title}</h1><p class="page-sub">${B.sub}</p></section>
      <div class="bd-filter">${[['', B.all], ...Object.entries(BRAR).reverse().map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button type="button" class="chip ${bRar === k ? 'on' : ''}" data-r="${k}" ${k ? `style="--rc:${BRAR[k][1]}"` : ''}>${n}</button>`).join('')}</div>
      <div class="bd-grid">${list.map(([id, name, rar, how, en, pt]) => `<article class="bd-card r-${rar}" style="--rc:${BRAR[rar][1]}">
          <div class="bd-art"><img src="${badgeImg(id)}" alt="${esc(name)}" loading="lazy"></div>
          <b>${esc(name)}</b><span class="bd-rar">${BRAR[rar][0]}</span>
          <p>${esc(lang === 'pt' ? pt : en)}</p><small class="bd-how how-${how}">${B.how[how]}</small></article>`).join('')}</div>
      <p class="bd-ingame">${svg('info')} ${B.ingame}</p>
      <section class="bd-wall-sec"><p class="l-kicker">${B.wall}</p><p class="page-sub">${B.wall_sub}</p><div class="bd-wall" id="bdWall">${spinner()}</div>
        <a class="btn btn-discord" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')}<span>${B.join}</span></a></section>`;
  }

  // ---------------------------------------------------------------- loja VIP
  const TIERS = [
    { id: 'survivor', icon: 'tree', color: '#cd8a4e', perks: [
      ['star', '+15% XP boost', '+15% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+1 extra bed', '+1 cama extra'],
      ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['megaphone', 'Soft name in global chat + scoreboard', 'Nome destacado no chat global e no placar'] ] },
    { id: 'veteran', icon: 'shield', color: '#ff6a00', hot: true, perks: [
      ['star', '+30% XP boost', '+30% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+2 extra beds', '+2 camas extras'],
      ['clock', 'Faster bed respawn', 'Respawn mais rápido na cama'], ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['building', 'Base limit 50 + 50% less upkeep', 'Limite de 50 peças + 50% menos upkeep'],
      ['megaphone', '[VIP] tag in global chat + highlighted scoreboard row', 'Tag [VIP] no chat global + linha destacada no placar'] ] },
    { id: 'legendary', icon: 'crown', color: '#f5b83d', perks: [
      ['star', '+50% XP boost', '+50% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+3 extra beds', '+3 camas extras'],
      ['clock', 'Fastest bed respawn', 'Respawn na cama ainda mais rápido'], ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['building', 'Base limit 65 + 50% less upkeep', 'Limite de 65 peças + 50% menos upkeep'],
      ['pickaxe', 'Hatchet and pickaxe when you respawn', 'Nasce com machado e picareta'],
      ['hammer', '25% less crafting cost (materials and level)', '25% menos custo de craft (material e level)'],
      ['megaphone', 'Gold [VIP] tag in global chat + legendary scoreboard frame', 'Tag [VIP] dourada no chat + moldura lendária no placar'] ] },
  ];
  const COMPARE = [
    ['xp', '—', '+15%', '+30%', '+50%'], ['slot', '—', '✓', '✓', '✓'], ['inv', '28', '42', '42', '42'], ['beds', '1', '2', '3', '4'],
    ['bedtime', '10 min', '10 min', '5 min', '3 min'], ['respawn', '—', '✓', '✓', '✓'], ['base', '15–50*', '15–50*', '50', '65'],
    ['upkeep', '100%', '100%', '50%', '50%'], ['tools', '—', '—', '—', '✓'], ['craft', '100%', '100%', '100%', '75%'],
  ];
  // Loja: página própria (sem o menu da wiki). Preços em config.js (vip.prices), em reais e em dólar.
  let cur = null;
  const money = (v, c) => (c === 'brl' ? 'R$ ' + v.toFixed(2).replace('.', ',') : 'US$ ' + v.toFixed(2));
  function pageStore() {
    const H = window.HAVOK || {}, d = H.discord || '#';
    const vip = H.vip || {}, prices = vip.prices || {};
    if (!cur) cur = lang === 'pt' ? 'brl' : 'usd';
    const L = lang === 'pt' ? 2 : 1;
    const per = t(vip.period === 'month' ? 'per_month' : 'per_period');
    setTimeout(() => document.querySelectorAll('.cur-toggle button').forEach((b) => b.onclick = () => { cur = b.dataset.cur; route(); }));
    const price = (id) => {
      const p = prices[id];
      if (!p || p[cur] == null) return `<div class="sp-price"><b class="ask">${t('price_ask')}</b></div>`;
      const other = cur === 'brl' ? 'usd' : 'brl';
      return `<div class="sp-price"><b>${money(p[cur], cur)}</b><span>${per}</span></div>${p[other] != null ? `<small class="sp-alt">≈ ${money(p[other], other)}</small>` : ''}`;
    };
    return `<section class="sp-head">
        <div>
          <p class="l-kicker">HAVOK · VIP</p>
          <h1>${t('store_h1a')} <span>${t('store_h1b')}</span></h1>
          <p class="sp-sub">${t('store_sub')}</p>
        </div>
        <div class="cur-toggle" role="group" aria-label="${t('currency')}"><button data-cur="brl" class="${cur === 'brl' ? 'on' : ''}">R$ BRL</button><button data-cur="usd" class="${cur === 'usd' ? 'on' : ''}">US$ USD</button></div>
      </section>
      <div class="sp-plans">${TIERS.map((tr, i) => `<article class="sp-plan${tr.hot ? ' hot' : ''}" style="--tc:${tr.color}">
          ${tr.hot ? `<span class="sp-flag">${t('popular')}</span>` : ''}
          <header><span class="sp-rank">${String(i + 1).padStart(2, '0')}</span><span class="tier-ic">${svg(tr.icon)}</span><b>${t('tier_' + tr.id)}</b></header>
          ${price(tr.id)}
          <p class="sp-desc">${t('tier_' + tr.id + '_d')}</p>
          <ul>${tr.perks.map((p) => `<li>${svg(p[0])}<span>${esc(p[L])}</span></li>`).join('')}</ul>
          <a class="sp-btn" href="${esc(d)}" target="_blank" rel="noopener">${svg('discord')} ${t('store_get')}</a>
        </article>`).join('')}</div>
      <div class="sp-trust"><span>${svg('user')} ${t('store_t1')}</span><span>${svg('zap')} ${t('store_t2')}</span><span>${svg('clock')} ${t('store_t3')}</span></div>
      <div class="section-title">${t('store_compare')}</div>
      <div class="table-wrap"><div class="compare wide"><div class="crow head"><span>${t('perk')}</span><span>${t('player')}</span>${TIERS.map((tr) => `<span style="color:${tr.color}">${t('tier_' + tr.id)}</span>`).join('')}</div>
        <div class="crow price"><span>${t('price')}</span><span class="muted">${t('free')}</span>${TIERS.map((tr) => { const p = prices[tr.id]; return `<span style="color:${tr.color}">${p && p[cur] != null ? money(p[cur], cur) : '—'}</span>`; }).join('')}</div>
        ${COMPARE.map(([k, ...v]) => `<div class="crow"><span>${t('cmp_' + k)}</span>${v.map((x, i) => `<span${i ? ` style="color:${TIERS[i - 1].color}"` : ' class="muted"'}>${x}</span>`).join('')}</div>`).join('')}</div></div>
      <p class="fine">${t('store_base_note')}</p>
      <div class="sp-cta"><a class="cta" href="${esc(d)}" target="_blank" rel="noopener">${svg('discord')} ${t('store_cta')}</a><p class="fine">${t('store_fine')}</p></div>`;
  }

  // ---------------------------------------------------------------- home
  // Quem chega do vídeo vê em 5 s: JOGAR AGORA, DISCORD e que o servidor está vivo (status + gráfico de 24 h).
  // Embaixo: wipe, prévia do mapa, "nunca jogou", feed do Discord, melhores sobreviventes e os 5 vídeos do ciclo.
  const LT = {
    en: {
      hero_sub: 'Rust survival inside MTA: San Andreas. Farm, build your base, join a group and raid the others.',
      play: 'Play now', join_discord: 'Join the Discord', first: 'Never played MTA?', no_open: 'Nothing opened? You need MTA installed first.', no_open_link: 'See how',
      st_on: 'Server online', st_off: 'Server offline', st_locked: 'Opening soon', st_load: 'Checking the server…', st_err: 'No answer from the server right now',
      playing: 'playing', ip: 'IP', copy: 'Copy IP', copied: 'Copied',
      last24: 'Last 24 h', peak: 'peak {n}', avg: 'avg {n}', hist_empty: 'The chart fills in as the first hours are recorded.', hist_err: 'History unavailable right now.', at_time: '{t} · {n} playing',
      season: 'Season {n}',
      wipe_h: 'Next wipe', u_d: 'days', u_h: 'h', u_m: 'min', wipe_note: '{d} · last 24 h = insane PvP', wipe_pvp: 'Insane PvP until the wipe', wipe_pending: 'Wipe in progress', wipe_failed: 'Wipe delayed', wipe_none: 'The next wipe date comes out on Discord.', wipe_more: 'See the wipe',
      map_h: 'Server map', map_open: 'Open map', map_sub: 'Safe zones, vendors, military bases and the live airdrop.',
      first_h: 'Never played MTA?', steps: ['Have GTA San Andreas for PC', 'Get MTA:SA (free)', 'Click Play now'], first_more: 'Step by step',
      feed_h: 'News from Discord', feed_sync: 'synced from Discord', tabs: { anuncios: 'Announcements', atualizacoes: 'Updates', midia: 'Media' },
      feed_empty: 'Nothing on this tab yet. News shows up on Discord first.', feed_err: 'The feed did not answer right now. News is still on Discord.', feed_go: 'Open Discord',
      see_discord: 'See on Discord', read_more: 'Read more', read_less: 'Show less', edited: 'edited',
      top_h: 'Top survivors', scope: { wipe: 'Wipe', all: 'All time' }, by: { kills: 'Kills', hours: 'Time', kd: 'K/D' }, top_more: 'Full ranking and groups',
      top_empty_wipe: 'Nobody has scored this wipe yet. The first kills show up here.', top_empty_all: 'The all-time ranking starts counting this wipe.', top_empty_kd: 'K/D shows up from 10 kills.', top_err: 'Ranking is down right now. Try again in a moment.',
      u_kills: 'kills', u_kd: 'K/D',
      loop_h: 'You start with nothing. Everything else is earned.',
      loop: [
        ['spawn', 'Wake up', 'You spawn with almost nothing. Everyone starts the same way.', 'getting-started'],
        ['gather-tools', 'Gather', 'Trees, rocks and ore. Better tools, faster farming.', 'resource-gathering'],
        ['first-house', 'Build', 'Foundation, walls, a door and a Wardrobe to keep it standing.', 'base-building'],
        ['vehicles', 'Explore', 'Fix up cars, loot military zones and fight for airdrops.', 'world-and-events'],
        ['pvp', 'Fight', 'Take on other players and shoot down the patrol helicopter.', 'combat-raiding-and-recovery'],
      ],
      cd_wipe: 'Next wipe in', cd_pvp: 'FINAL 24 HOURS · INSANE PvP: weapons and loot are easier to find until the wipe', cd_every: 'full wipe every {n} days', cd_at: 'Next wipe: {d}', cd_pending: 'Wipe in progress', cd_failed: 'Wipe delayed', cd_stale: 'No connection to the server right now; trying again…', cd_more: 'See the wipe',
      wp_kicker: 'Current wipe', wp_title: 'The race for the island', wp_sub: 'At this time the server resets everything: bases, items and the ranking. Badges and paid VIP stay.',
    },
    pt: {
      hero_sub: 'Rust survival dentro do MTA: San Andreas. Farme, construa sua base, entre num grupo e raide os outros.',
      play: 'Jogar agora', join_discord: 'Entrar no Discord', first: 'Nunca jogou MTA?', no_open: 'Não abriu? Primeiro instale o MTA.', no_open_link: 'Ver como',
      st_on: 'Servidor online', st_off: 'Servidor offline', st_locked: 'Abrindo em breve', st_load: 'Conferindo o servidor…', st_err: 'Sem resposta do servidor agora',
      playing: 'jogando', ip: 'IP', copy: 'Copiar IP', copied: 'Copiado',
      last24: 'Últimas 24 h', peak: 'pico {n}', avg: 'média {n}', hist_empty: 'O gráfico enche conforme as primeiras horas são registradas.', hist_err: 'Histórico indisponível agora.', at_time: '{t} · {n} jogando',
      season: 'Season {n}',
      wipe_h: 'Próximo wipe', u_d: 'dias', u_h: 'h', u_m: 'min', wipe_note: '{d} · últimas 24 h = PvP insano', wipe_pvp: 'PvP insano até o wipe', wipe_pending: 'Wipe em andamento', wipe_failed: 'Wipe adiado', wipe_none: 'A data do próximo wipe sai no Discord.', wipe_more: 'Ver o wipe',
      map_h: 'Mapa do servidor', map_open: 'Abrir mapa', map_sub: 'Safe zones, vendedores, bases militares e o airdrop ao vivo.',
      first_h: 'Nunca jogou MTA?', steps: ['Tenha o GTA San Andreas de PC', 'Baixe o MTA:SA (grátis)', 'Clique em Jogar agora'], first_more: 'Passo a passo',
      feed_h: 'Novidades do Discord', feed_sync: 'sincronizado do Discord', tabs: { anuncios: 'Anúncios', atualizacoes: 'Atualizações', midia: 'Mídia' },
      feed_empty: 'Nada nesta aba ainda. Os avisos saem primeiro no Discord.', feed_err: 'O feed não respondeu agora. Os avisos continuam no Discord.', feed_go: 'Abrir o Discord',
      see_discord: 'Ver no Discord', read_more: 'Ler mais', read_less: 'Mostrar menos', edited: 'editado',
      top_h: 'Melhores sobreviventes', scope: { wipe: 'Wipe', all: 'De sempre' }, by: { kills: 'Abates', hours: 'Tempo', kd: 'K/D' }, top_more: 'Ranking completo e grupos',
      top_empty_wipe: 'Ninguém pontuou neste wipe ainda. Os primeiros abates aparecem aqui.', top_empty_all: 'O ranking de sempre começa a contar a partir deste wipe.', top_empty_kd: 'O K/D entra a partir de 10 abates.', top_err: 'Ranking fora do ar agora. Tente de novo em instantes.',
      u_kills: 'abates', u_kd: 'K/D',
      loop_h: 'Você começa sem nada. Todo o resto é conquistado.',
      loop: [
        ['spawn', 'Acordar', 'Você nasce quase sem nada. Todo mundo começa igual.', 'getting-started'],
        ['gather-tools', 'Coletar', 'Árvores, pedras e minérios. Ferramenta melhor, coleta mais rápida.', 'resource-gathering'],
        ['first-house', 'Construir', 'Fundação, paredes, porta e um Armário para manter de pé.', 'base-building'],
        ['vehicles', 'Explorar', 'Monte carros, saqueie zonas militares e dispute airdrops.', 'world-and-events'],
        ['pvp', 'Lutar', 'Enfrente outros jogadores e derrube o helicóptero de patrulha.', 'combat-raiding-and-recovery'],
      ],
      cd_wipe: 'Próximo wipe em', cd_pvp: 'ÚLTIMAS 24 HORAS · PvP INSANO: armas e loot mais fáceis até o wipe', cd_every: 'wipe completo a cada {n} dias', cd_at: 'Próximo wipe: {d}', cd_pending: 'Wipe em andamento', cd_failed: 'Wipe adiado', cd_stale: 'Sem conexão com o servidor agora; tentando de novo…', cd_more: 'Ver o wipe',
      wp_kicker: 'Wipe atual', wp_title: 'A disputa pela ilha', wp_sub: 'Nesse horário o servidor zera tudo: bases, itens e o ranking. Badges e VIP pago ficam.',
    },
  };
  const lt = (k, vars) => {
    let s = LT[lang][k] ?? LT.en[k] ?? k;
    if (vars && typeof s === 'string') for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  const locale = () => (lang === 'pt' ? 'pt-BR' : 'en-US');

  // fetch com tempo-limite; erro/timeout = null (cada bloco mostra o próprio estado de erro)
  async function getJson(url, opts = {}) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), opts.timeout || 10000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: opts.cache || 'no-cache', credentials: opts.credentials });
      return r.ok ? await r.json() : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(to);
    }
  }
  // scripts sob demanda (o mapa só baixa quando a prévia aparece na tela)
  const scripts = {};
  const loadScript = (src) => scripts[src] || (scripts[src] = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = ok;
    s.onerror = () => { delete scripts[src]; fail(new Error(src)); };
    document.head.appendChild(s);
  }));
  // só quando o elemento aparece na tela (sem IntersectionObserver: na hora)
  function whenVisible(el, fn, margin = '200px') {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
    io.observe(el);
    onLeave(() => io.disconnect());
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // celular/tablet sem mouse: não tem MTA, o JOGAR AGORA leva para o passo a passo
  const noMta = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches);
  // contagem animada do número (sobe de onde estava até o novo valor)
  function countTo(el, to, ms = 700) {
    if (!el) return;
    const from = Number(el.dataset.n || 0);
    el.dataset.n = to;
    if (reduced() || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // //------------------- status do servidor (online agora + IP + gráfico de 24 h) -------------------\\
  const API = () => pfApi() || 'https://api.havokrust.xyz';
  function statusCard() {
    const H = window.HAVOK || {}, addr = H.server || '';
    setTimeout(() => {
      const copy = $('#stCopy');
      if (copy) copy.onclick = () => {
        const done = () => { copy.classList.add('ok'); copy.querySelector('span').textContent = lt('copied'); setTimeout(() => { if (copy.isConnected) { copy.classList.remove('ok'); copy.querySelector('span').textContent = lt('copy'); } }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, () => {});
      };
      loadStatus();
      loadHistory();
      const t1 = setInterval(() => { if (!document.hidden) loadStatus(); }, 30000);
      const t2 = setInterval(() => { if (!document.hidden) loadHistory(); }, 5 * 60000);
      onLeave(() => { clearInterval(t1); clearInterval(t2); });
    });
    return `<aside class="card st" id="st" data-state="loading" aria-live="polite">
        <div class="st-top"><span class="st-state"><i class="st-dot"></i><span id="stState">${lt('st_load')}</span></span><span class="st-season" id="stSeason"></span></div>
        <div class="st-mid">
          <div class="st-count"><b id="stNum">--</b><span id="stMax"></span><small>${lt('playing')}</small></div>
          ${addr ? `<div class="st-ip"><span>${lt('ip')}</span><button type="button" id="stCopy" class="st-copy" title="${lt('copy')}"><code>${esc(addr)}</code>${svg('copy')}<span class="sr">${lt('copy')}</span></button></div>` : ''}
        </div>
        <div class="st-chart" id="stChart"><div class="st-chart-empty">${spinner()}</div></div>
        <div class="st-foot"><span>${lt('last24')}</span><span id="stStats"></span></div>
      </aside>`;
  }
  async function loadStatus() {
    const api = ((window.HAVOK || {}).serverStatus || {}).api;
    const d = api ? await getJson(api) : null;
    const box = $('#st');
    if (!box) return;
    const ok = d && typeof d.online === 'boolean';
    box.dataset.state = !ok ? 'error' : !d.online ? 'off' : d.locked ? 'locked' : 'ok';
    $('#stState').textContent = !ok ? lt('st_err') : !d.online ? lt('st_off') : d.locked ? lt('st_locked') : lt('st_on');
    if (ok && d.online) { countTo($('#stNum'), d.players | 0); $('#stMax').textContent = d.max ? ` / ${d.max}` : ''; } else { $('#stNum').textContent = '--'; $('#stNum').dataset.n = 0; $('#stMax').textContent = ''; }
  }
  async function loadHistory() {
    const d = await getJson(`${API()}/api/status/history?hours=24`);
    const box = $('#stChart');
    if (!box) return;
    const samples = d && Array.isArray(d.samples) ? d.samples.filter((s) => Number.isFinite(s.t) && Number.isFinite(s.online)) : null;
    if (!samples) { box.innerHTML = `<p class="st-chart-empty">${lt('hist_err')}</p>`; $('#stStats').textContent = ''; return; }
    $('#stStats').textContent = samples.length ? `${lt('peak', { n: d.peak })} · ${lt('avg', { n: Math.round(d.avg) })}` : '';
    if (samples.length < 2) { box.innerHTML = `<svg class="st-svg" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><path class="st-base" d="M0 69H300"/></svg><p class="st-chart-empty">${lt('hist_empty')}</p>`; return; }
    drawChart(box, samples, d.peak);
  }
  // gráfico próprio (SVG): eixo x = 24 h até agora; buraco > 15 min entre amostras = servidor fora (linha quebra)
  function drawChart(box, samples, peak) {
    const W = 300, H = 70, now = Date.now() / 1000, t0 = now - 24 * 3600;
    const top = Math.max(4, peak || 0) * 1.18;
    const x = (t) => Math.max(0, Math.min(W, ((t - t0) / (now - t0)) * W));
    const y = (v) => H - 2 - (v / top) * (H - 6);
    const segs = [];
    let cur = [];
    samples.forEach((s, i) => {
      if (i && s.t - samples[i - 1].t > 900) { if (cur.length) segs.push(cur); cur = []; }
      cur.push(s);
    });
    if (cur.length) segs.push(cur);
    const line = segs.map((sg) => sg.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)} ${y(s.online).toFixed(1)}`).join('')).join('');
    const area = segs.filter((sg) => sg.length > 1).map((sg) => `M${x(sg[0].t).toFixed(1)} ${H}` + sg.map((s) => `L${x(s.t).toFixed(1)} ${y(s.online).toFixed(1)}`).join('') + `L${x(sg[sg.length - 1].t).toFixed(1)} ${H}Z`).join('');
    box.innerHTML = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="stFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        <path class="st-base" d="M0 ${H - 1}H${W}"/><path class="st-area" d="${area}" fill="url(#stFill)"/><path class="st-line" d="${line}"/></svg>
      <i class="st-pt" hidden></i><span class="st-tip" hidden></span>`;
    const pt = box.querySelector('.st-pt'), tip = box.querySelector('.st-tip');
    const hm = (t) => new Date(t * 1000).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    const show = (e) => {
      const r = box.getBoundingClientRect();
      const tx = t0 + ((e.clientX - r.left) / r.width) * (now - t0);
      let best = samples[0];
      for (const s of samples) if (Math.abs(s.t - tx) < Math.abs(best.t - tx)) best = s;
      const px = (x(best.t) / W) * 100, py = (y(best.online) / H) * 100;
      pt.hidden = tip.hidden = false;
      pt.style.left = px + '%'; pt.style.top = py + '%';
      tip.textContent = lt('at_time', { t: hm(best.t), n: best.online });
      tip.style.left = Math.max(18, Math.min(82, px)) + '%';
    };
    box.onpointermove = show;
    box.onpointerdown = show;
    box.onpointerleave = () => { pt.hidden = tip.hidden = true; };
  }

  // //------------------- wipe (cartão da faixa) -------------------\\
  function wipeCard() {
    if (!((window.HAVOK || {}).wipe || {}).api) return '';
    setTimeout(() => {
      loadWipe(false).then(paintWipeCard);
      const tm = setInterval(() => { paintWipeCard(); }, 1000);
      const re = setInterval(() => { if (!document.hidden) loadWipe(false).then(paintWipeCard); }, 60000);
      onLeave(() => { clearInterval(tm); clearInterval(re); });
    });
    return `<a class="card strip-card wc" id="wc" href="/wipe">
        <span class="card-h">${lt('wipe_h')}</span>
        <span class="wc-left" id="wcLeft"><b>--</b><i>${lt('u_d')}</i><b>--</b><i>${lt('u_h')}</i><b>--</b><i>${lt('u_m')}</i></span>
        <span class="bar"><span id="wcBar"></span></span>
        <span class="card-note" id="wcNote">&nbsp;</span>
        <span class="card-link">${lt('wipe_more')} ${svg('chevron')}</span>
      </a>`;
  }
  function paintWipeCard() {
    const box = $('#wc');
    if (!box) return;
    const d = wipeData;
    const season = $('#stSeason');
    if (season && d && d.cycleId) season.textContent = lt('season', { n: d.cycleId });
    if (!d || !d.scheduledWipeAt || d.status === 'NONE') { $('#wcLeft').innerHTML = `<span class="wc-msg">${lt('wipe_none')}</span>`; $('#wcNote').textContent = ''; return; }
    const now = Date.now() + wipeOffset, at = Date.parse(d.scheduledWipeAt), start = Date.parse(d.startedAt);
    const left = Math.max(0, at - now);
    const pending = d.status === 'WIPE_PENDING' || d.status === 'FAILED' || left === 0;
    const pvp = !pending && left <= PVP_MS;
    box.classList.toggle('pvp', pvp);
    box.classList.toggle('pending', pending);
    let s = Math.floor(left / 1000);
    const dd = Math.floor(s / 86400); s %= 86400;
    const hh = Math.floor(s / 3600); s %= 3600;
    $('#wcLeft').innerHTML = pending ? `<span class="wc-msg">${lt(d.status === 'FAILED' ? 'wipe_failed' : 'wipe_pending')}</span>`
      : `<b>${dd}</b><i>${lt('u_d')}</i><b>${p2(hh)}</b><i>${lt('u_h')}</i><b>${p2(Math.floor(s / 60))}</b><i>${lt('u_m')}</i>`;
    const pct = pending ? 1 : Math.min(1, Math.max(0, (now - start) / (at - start)));
    $('#wcBar').style.transform = `scaleX(${pct.toFixed(4)})`;
    const when = new Date(at).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    $('#wcNote').textContent = pvp ? lt('wipe_pvp') : lt('wipe_note', { d: when });
  }

  // //------------------- prévia do mapa (o módulo só baixa quando o cartão aparece) -------------------\\
  function mapCard() {
    setTimeout(() => {
      const view = $('#mcView');
      whenVisible(view, async () => {
        try {
          await loadScript('/mapa/mapa.js');
          if (!view.isConnected || !window.HavokMap) return;
          const holder = document.createElement('div');
          holder.className = 'mc-live';
          view.appendChild(holder);
          const m = await window.HavokMap.mount(holder, { lang, airdropUrl: `${API()}/api/airdrop`, compact: true, href: '/mapa' });
          if (!holder.isConnected) { m.destroy(); return; }
          view.classList.add('live');
          onLeave(() => m.destroy());
        } catch (e) { /* fica a imagem de prévia, que já leva para o mapa */ }
      });
    });
    return `<div class="card strip-card mc">
        <div class="card-row"><span class="card-h">${lt('map_h')}</span><a class="card-link" href="/mapa">${lt('map_open')} ${svg('chevron')}</a></div>
        <div class="mc-view" id="mcView"><a class="mc-prev" href="/mapa" aria-label="${lt('map_open')}"><img src="/mapa/preview.webp" alt="" loading="lazy" width="800" height="800"></a></div>
        <span class="card-note">${lt('map_sub')}</span>
      </div>`;
  }

  function firstCard() {
    return `<a class="card strip-card fc" href="/play/">
        <span class="card-h">${lt('first_h')}</span>
        <ol class="fc-steps">${lt('steps').map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <span class="card-link">${lt('first_more')} ${svg('chevron')}</span>
      </a>`;
  }

  // //------------------- feed do Discord -------------------\\
  const FEED_API = () => String(((window.HAVOK || {}).feed || {}).api || 'https://havok-waitlist.havokrust.workers.dev/api/feed');
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  // markdown do Discord -> HTML (o texto é escapado antes; só o que está aqui vira tag)
  function discordMd(src) {
    const keep = [];
    const stash = (html) => `\u0000${keep.push(html) - 1}\u0000`;
    let s = esc(String(src || ''));
    s = s.replace(/```(?:[a-z0-9+-]*\n)?([\s\S]*?)```/gi, (m, code) => stash(`<pre><code>${code.replace(/^\n|\n$/g, '')}</code></pre>`));
    s = s.replace(/`([^`\n]+)`/g, (m, code) => stash(`<code>${code}</code>`));
    const inl = (t) => t
      .replace(/&lt;(a?):([\w~]{1,40}):(\d{5,25})&gt;/g, (m, a, n, id) => stash(`<img class="emo" src="https://cdn.discordapp.com/emojis/${id}.${a ? 'gif' : 'webp'}?size=48" alt=":${n}:" title=":${n}:" loading="lazy">`))
      .replace(/&lt;#\d{5,25}&gt;/g, '#canal')
      .replace(/&lt;t:(\d{1,12})(?::[tTdDfFR])?&gt;/g, (m, ts) => new Date(Number(ts) * 1000).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }))
      .replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^)\s]+)\)/g, (m, txt, u) => stash(`<a href="${u}" target="_blank" rel="noopener nofollow">${txt}</a>`))
      .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (m, u) => stash(`<a href="${u}" target="_blank" rel="noopener nofollow">${u}</a>`))
      .replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)'"])/g, (m, pre, u) => pre + stash(`<a href="${u}" target="_blank" rel="noopener nofollow">${u.replace(/^https?:\/\//, '').slice(0, 48)}${u.length > 56 ? '…' : ''}</a>`))
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" tabindex="0">$1</span>');
    const out = [];
    let list = null;
    const flush = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };
    for (const raw of s.split('\n')) {
      const l = raw.trimEnd();
      let m;
      if ((m = l.match(/^(#{1,3}) (.+)$/))) { flush(); out.push(`<p class="md-h${m[1].length}">${inl(m[2])}</p>`); continue; }
      if ((m = l.match(/^-# (.+)$/))) { flush(); out.push(`<p class="md-sub">${inl(m[1])}</p>`); continue; }
      if ((m = l.match(/^\s*[-*•] (.+)$/))) { (list = list || []).push(`<li>${inl(m[1])}</li>`); continue; }
      if ((m = l.match(/^&gt;&gt;&gt; ?(.*)$/)) || (m = l.match(/^&gt; ?(.*)$/))) { flush(); out.push(`<blockquote>${inl(m[1])}</blockquote>`); continue; }
      flush();
      if (!l.trim()) { out.push('<p class="md-gap"></p>'); continue; }
      out.push(`<p>${inl(l)}</p>`);
    }
    flush();
    return out.join('').replace(/(<p class="md-gap"><\/p>)+/g, '<p class="md-gap"></p>').replace(/^<p class="md-gap"><\/p>|<p class="md-gap"><\/p>$/g, '')
      .replace(/\u0000(\d+)\u0000/g, (m, i) => keep[i]).replace(/\u0000(\d+)\u0000/g, (m, i) => keep[i]);
  }
  const relTime = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    const s = (t - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
    const a = Math.abs(s);
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day');
    return new Date(t).toLocaleDateString(locale(), { day: '2-digit', month: 'short' });
  };
  function postCard(p) {
    const imgs = (p.attachments || []).filter((a) => a.type === 'image' && safeUrl(a.url));
    const vids = (p.attachments || []).filter((a) => a.type === 'video' && safeUrl(a.url));
    const embeds = (p.embeds || []).slice(0, 2);
    const mediaHtml = imgs.length ? `<div class="post-media${imgs.length > 1 ? ' multi' : ''}">${imgs.slice(0, 4).map((a) => `<img src="${esc(a.url)}" alt="${esc(a.name || '')}" loading="lazy" decoding="async"${a.width && a.height ? ` width="${a.width | 0}" height="${a.height | 0}"` : ''}>`).join('')}</div>`
      : vids.length ? `<div class="post-media"><video src="${esc(vids[0].url)}" controls playsinline preload="none"></video></div>` : '';
    const embHtml = embeds.map((e) => `<div class="post-embed" style="--ec:${/^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : 'var(--line2)'}">
        ${e.title ? (safeUrl(e.url) ? `<a class="pe-t" href="${esc(e.url)}" target="_blank" rel="noopener nofollow">${esc(e.title)}</a>` : `<b class="pe-t">${esc(e.title)}</b>`) : ''}
        ${e.description ? `<div class="pe-d">${discordMd(e.description)}</div>` : ''}
        ${!imgs.length && safeUrl(e.image) ? `<img src="${esc(e.image)}" alt="" loading="lazy">` : ''}</div>`).join('');
    const reac = (p.reactions || []).slice(0, 6).map((r) => `<span class="reac">${safeUrl(r.url) ? `<img src="${esc(r.url)}" alt="${esc(r.emoji)}" loading="lazy">` : esc(r.emoji)}<b>${num(r.count)}</b></span>`).join('');
    const a = p.author || {};
    return `<article class="card post">
        <header class="post-who">${a.avatar && safeUrl(a.avatar) ? `<img class="post-av" src="${esc(a.avatar)}" alt="" loading="lazy">` : '<span class="post-av"></span>'}
          <b>${esc(a.name || 'HAVOK')}</b><time datetime="${esc(p.createdAt || '')}">${esc(relTime(p.createdAt))}</time>${p.editedAt ? `<small>(${lt('edited')})</small>` : ''}</header>
        ${p.content ? `<div class="post-body md">${discordMd(p.content)}</div>` : ''}
        ${embHtml}${mediaHtml}
        <footer class="post-foot">${reac}${safeUrl(p.url) ? `<a class="post-link" href="${esc(p.url)}" target="_blank" rel="noopener">${lt('see_discord')} ${svg('external')}</a>` : ''}</footer>
      </article>`;
  }
  let feedTab = 'anuncios';
  const feedCache = {};
  function feedSection() {
    setTimeout(() => {
      document.querySelectorAll('#feedTabs button').forEach((b) => b.onclick = () => {
        if (b.dataset.tab === feedTab) return;
        feedTab = b.dataset.tab;
        document.querySelectorAll('#feedTabs button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        loadFeed();
      });
      loadFeed();
    });
    const tabs = Object.entries(lt('tabs')).map(([k, n]) => `<button type="button" role="tab" data-tab="${k}" class="${k === feedTab ? 'on' : ''}" aria-selected="${k === feedTab}">${esc(n)}</button>`).join('');
    return `<section class="feed" aria-labelledby="feedH">
        <div class="sec-head"><h2 class="sec-h" id="feedH">${lt('feed_h')}</h2><span class="sec-note">${svg('discord')} ${lt('feed_sync')}</span></div>
        <div class="tabs" role="tablist" id="feedTabs">${tabs}</div>
        <div class="feed-list" id="feedList" role="tabpanel">${spinner()}</div>
      </section>`;
  }
  async function loadFeed() {
    const tab = feedTab, box = $('#feedList');
    if (!box) return;
    if (!feedCache[tab]) box.classList.add('busy');
    const d = feedCache[tab] || await getJson(`${FEED_API()}?tab=${tab}&limit=5`);
    if (!$('#feedList') || tab !== feedTab) return;
    if (d && Array.isArray(d.posts)) feedCache[tab] = d;
    box.classList.remove('busy');
    const H = window.HAVOK || {};
    const go = `<a class="btn btn-discord sm" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')} ${lt('feed_go')}</a>`;
    if (!d || !Array.isArray(d.posts)) { box.innerHTML = `<div class="empty card">${svg('discord')}<p>${lt('feed_err')}</p>${go}</div>`; return; }
    if (!d.posts.length) { box.innerHTML = `<div class="empty card">${svg('megaphone')}<p>${lt('feed_empty')}</p>${go}</div>`; return; }
    box.innerHTML = d.posts.slice(0, 5).map(postCard).join('');
    fadeIn(box);
    // texto longo: corta e mostra "Ler mais"
    box.querySelectorAll('.post-body').forEach((b) => {
      if (b.scrollHeight <= b.clientHeight + 4) { b.classList.add('full'); return; }
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'post-more'; btn.textContent = lt('read_more');
      btn.onclick = () => { const open = b.classList.toggle('open'); btn.textContent = lt(open ? 'read_less' : 'read_more'); };
      b.after(btn);
    });
    box.querySelectorAll('.spoiler').forEach((sp) => { sp.onclick = sp.onkeydown = (e) => { if (!e.key || e.key === 'Enter' || e.key === ' ') sp.classList.add('shown'); }; });
  }
  const fadeIn = (el) => { if (reduced()) return; el.classList.remove('fade'); void el.offsetWidth; el.classList.add('fade'); };

  // //------------------- melhores sobreviventes (top 5) -------------------\\
  let topScope = 'wipe', topBy = 'kills';
  const topCache = {};
  function topSection() {
    setTimeout(() => {
      document.querySelectorAll('#topScope button, #topBy button').forEach((b) => b.onclick = () => {
        if (b.dataset.scope) topScope = b.dataset.scope; else topBy = b.dataset.by;
        document.querySelectorAll('#topScope button').forEach((x) => { x.classList.toggle('on', x.dataset.scope === topScope); x.setAttribute('aria-pressed', x.dataset.scope === topScope); });
        document.querySelectorAll('#topBy button').forEach((x) => { x.classList.toggle('on', x.dataset.by === topBy); x.setAttribute('aria-pressed', x.dataset.by === topBy); });
        loadTop();
      });
      loadTop();
    });
    const seg = (id, key, cur, items, cls = '') => `<div class="seg${cls}" id="${id}" role="group">${Object.entries(items).map(([k, n]) => `<button type="button" data-${key}="${k}" class="${k === cur ? 'on' : ''}" aria-pressed="${k === cur}">${esc(n)}</button>`).join('')}</div>`;
    return `<section class="card top" aria-labelledby="topH">
        <div class="top-head"><h2 class="sec-h" id="topH">${lt('top_h')}</h2>${seg('topScope', 'scope', topScope, lt('scope'))}</div>
        ${seg('topBy', 'by', topBy, lt('by'), ' seg-line')}
        <ol class="top-list" id="topList">${spinner()}</ol>
        <a class="top-more" href="/ranking${topScope === 'all' ? '?scope=all' : ''}">${lt('top_more')} ${svg('chevron')}</a>
      </section>`;
  }
  async function loadTop() {
    const key = `${topScope}:${topBy}`, box = $('#topList');
    if (!box) return;
    if (!topCache[key]) box.classList.add('busy');
    const d = topCache[key] || await getJson(`${API()}/api/ranking/players?scope=${topScope}&by=${topBy}`);
    if (!$('#topList') || key !== `${topScope}:${topBy}`) return;
    box.classList.remove('busy');
    if (d && Array.isArray(d.players)) topCache[key] = d;
    if (!d || !Array.isArray(d.players)) { box.innerHTML = `<li class="top-empty">${lt('top_err')}</li>`; return; }
    const list = d.players.slice(0, 5);
    if (!list.length) { box.innerHTML = `<li class="top-empty">${lt(topBy === 'kd' ? 'top_empty_kd' : topScope === 'all' ? 'top_empty_all' : 'top_empty_wipe')}</li>`; return; }
    const val = (p) => {
      if (topBy === 'hours') { const m = p.playMinutes | 0; return m < 60 ? `<b>${m}</b><small>min</small>` : `<b>${num(Math.floor(m / 60))}</b><small>h</small>`; }
      if (topBy === 'kd') return `<b>${Number(p.kd ?? (p.kills / Math.max(1, p.deaths))).toFixed(2)}</b>`;
      return `<b>${num(p.kills)}</b>`;
    };
    box.innerHTML = list.map((p, i) => `<li><a class="top-row${i === 0 ? ' first' : ''}" href="/jogador/${encodeURIComponent(p.pid)}">
        <span class="top-pos">${p.rank || i + 1}</span>${avatar(p.avatarUrl, 'top-av')}
        <span class="top-nick">${esc(p.nick)}${p.group && p.group.tag ? ` ${tagPill(p.group)}` : ''}</span>
        <span class="top-val">${val(p)}</span></a></li>`).join('');
    fadeIn(box);
    const more = $('.top-more');
    if (more) more.href = `/ranking${topScope === 'all' ? '?scope=all' : ''}`;
  }

  // //------------------- os 5 blocos com vídeo -------------------\\
  function loopSection() {
    setTimeout(() => {
      const vids = [...document.querySelectorAll('.loop-card video')];
      if (!('IntersectionObserver' in window) || reduced()) return;
      // cada vídeo só baixa e toca quando aparece (economiza a internet do celular)
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) { if (!v.dataset.on) { v.dataset.on = 1; v.querySelectorAll('source').forEach((s) => { s.src = s.dataset.src; }); v.load(); } v.play().catch(() => {}); } else v.pause();
      }), { threshold: 0.35 });
      vids.forEach((v) => io.observe(v));
      onLeave(() => io.disconnect());
    });
    return `<section class="loops" aria-labelledby="loopH">
        <h2 class="sec-h" id="loopH">${lt('loop_h')}</h2>
        <div class="loop-grid">${lt('loop').map(([id, title, desc, guide]) => `<a class="card loop-card" href="/wiki/guia/${guide}">
            <span class="loop-media"><video muted loop playsinline preload="none" aria-hidden="true"><source data-src="/media/${id}.webm" type="video/webm"><source data-src="/media/${id}.mp4" type="video/mp4"></video></span>
            <span class="loop-txt"><b>${esc(title)}</b><small>${esc(desc)}</small></span></a>`).join('')}</div>
      </section>`;
  }

  function pageLanding() {
    const H = window.HAVOK || {}, addr = H.server || '';
    const playHref = addr && !noMta() ? `mtasa://${addr}` : '/play/';
    setTimeout(() => {
      // vídeo do hero: entra depois do primeiro desenho; sem ele (economia de dados / menos movimento) fica a imagem
      const v = $('#heroVid');
      const save = navigator.connection && navigator.connection.saveData;
      if (v && !save && !reduced()) {
        v.innerHTML = '<source src="/media/hero.webm" type="video/webm"><source src="/media/hero.mp4" type="video/mp4">';
        v.load();
        v.play().catch(() => {});
      }
      // mtasa:// sem MTA instalado não faz nada: se a página não perder o foco, mostra o atalho para o passo a passo
      const play = $('#playBtn');
      if (play && play.getAttribute('href').startsWith('mtasa:')) play.addEventListener('click', () => {
        let left = false;
        const off = () => { left = true; };
        window.addEventListener('blur', off, { once: true });
        setTimeout(() => { window.removeEventListener('blur', off); const n = $('#noOpen'); if (!left && n) n.hidden = false; }, 1600);
      });
    });
    return `<div class="home">
      <section class="hero">
        <video class="hero-bg" id="heroVid" muted loop playsinline preload="metadata" poster="/media/hero.webp" aria-hidden="true"></video>
        <div class="hero-in wrap">
          <div class="hero-copy">
            <img class="hero-logo" src="/logo-text.png" alt="HAVOK" width="1522" height="507" fetchpriority="high">
            <h1 class="hero-title">Survive. Build. <em>Raid.</em></h1>
            <p class="hero-sub">${lt('hero_sub')}</p>
            <div class="hero-cta">
              <a class="btn btn-play" id="playBtn" href="${esc(playHref)}">${svg('play')} ${lt('play')}</a>
              <a class="btn btn-discord" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')} ${lt('join_discord')}</a>
              <a class="hero-first" href="/play/">${lt('first')}</a>
            </div>
            <p class="hero-noopen" id="noOpen" hidden>${lt('no_open')} <a href="/play/">${lt('no_open_link')} ${svg('chevron')}</a></p>
          </div>
          ${statusCard()}
        </div>
      </section>
      <div class="wrap home-body">
        <div class="strip">${wipeCard()}${mapCard()}${firstCard()}</div>
        <div class="home-main">${feedSection()}${topSection()}</div>
        ${loopSection()}
      </div>
    </div>`;
  }

  // //------------------- mapa (página /mapa): o módulo HavokMap em tela cheia + legenda, airdrop e guias -------------------\\
  // Trocar o idioma redesenha a página: o mapa montado é guardado e volta para o lugar com setLang (sem baixar tudo de novo
  // e sem perder o zoom). Saindo para outra página, destroy().
  let mapKeep = null; // { el, m }
  const MAP_LEGEND = [
    ['safezone', 'safe-zones'], ['shop', 'shop-and-scrap'], ['mission', 'missions'], ['military', 'world-and-events'], ['gate', 'world-and-events'],
    ['radiation', 'cold-and-radiation'], ['cold', 'cold-and-radiation'], ['hospital', 'world-and-events'], ['recycler', 'furnaces-recyclers-and-processing'],
    ['gas', 'world-and-events'], ['oil', 'world-and-events'], ['island', 'world-and-events'], ['radio', 'radio'],
  ];
  function mapLegendIcon(c) {
    const ic = String(c.icon || '');
    if (ic.endsWith('.png')) return `<img src="/mapa/icons/${esc(ic)}" alt="" width="22" height="22" loading="lazy">`;
    return svg(ic.startsWith('svg:') && P['m_' + ic.slice(4)] ? 'm_' + ic.slice(4) : 'map');
  }
  function paintAir(box, d) {
    if (!box) return;
    const sys = (W.systems || {}).airdrop || {};
    const every = sys.every || ((W.systems || {}).timers || {}).airdropMinutes || 30;
    const st = d && d.state && d.state !== 'none' ? d.state : null;
    const near = d && d.zone ? wt('air_near', { z: d.zone }) : '';
    box.dataset.state = d === null ? 'error' : st || 'none';
    box.querySelector('.ma-now').textContent = d === null ? wt('air_err') : st ? wt('air_' + (['falling', 'landed', 'opened'].includes(st) ? st : 'landed'), { near }) : wt('air_none');
    box.querySelector('.ma-every').textContent = wt('air_every', { n: every });
  }
  function pageMap() {
    const D = window.HAVOK_MAP_DATA;
    const sz = (W.systems || {}).safezone || {};
    const lg = wt('lg');
    setTimeout(async () => {
      const slot = $('#mapFull');
      if (!slot) return;
      // volta o mapa já montado (troca de idioma): só reencaixa e traduz
      if (mapKeep) {
        slot.replaceWith(mapKeep.el);
        mapKeep.m.setLang(lang);
        requestAnimationFrame(() => mapKeep && mapKeep.m.map.invalidateSize());
      } else {
        try {
          await loadScript('/mapa/mapa.js');
          if (!slot.isConnected) return;
          const m = await window.HavokMap.mount(slot, { lang, airdropUrl: `${API()}/api/airdrop` });
          if (!slot.isConnected) { m.destroy(); return; }
          mapKeep = { el: slot, m };
          paintLegend();
        } catch (e) {
          if (slot.isConnected) slot.innerHTML = `<div class="empty">${svg('map')}<p>${lang === 'pt' ? 'Não deu para carregar o mapa. Confira a conexão e recarregue a página.' : 'Could not load the map. Check your connection and reload the page.'}</p><button type="button" class="btn btn-ghost sm" onclick="location.reload()">${lang === 'pt' ? 'Recarregar' : 'Reload'}</button></div>`;
        }
      }
      paintLegend();
      // airdrop: o mapa já mostra o marcador; aqui vai a frase em texto (a cada 30 s, só com a aba aberta)
      const box = $('#mapAir');
      const pull = async () => { if (!document.hidden && box && box.isConnected) paintAir(box, await getJson(`${API()}/api/airdrop`, { timeout: 8000 })); };
      pull();
      const iv = setInterval(pull, 30000);
      onLeave(() => clearInterval(iv));
      // sai do /mapa (ou só redesenha): na próxima página decide se destrói
      onLeave(() => setTimeout(() => {
        if (mapKeep && document.body.dataset.page !== 'map') { try { mapKeep.m.destroy(); } catch (e) { /* segue */ } mapKeep = null; }
      }));
    });
    // legenda: precisa do map-data.js (vem junto com o mapa.js); sem ele fica só o texto
    function paintLegend() {
      const el = $('#mapLegend'), Dm = window.HAVOK_MAP_DATA;
      if (!el || !Dm || el.dataset.done) return;
      el.dataset.done = 1;
      const cats = Object.fromEntries(Dm.categories.map((c) => [c.id, c]));
      el.innerHTML = MAP_LEGEND.filter(([id]) => cats[id]).map(([id, g]) => {
        const c = cats[id];
        return `<a class="ml-row" href="/wiki/guia/${g}" style="--mc:${esc(c.color || '#ff6a00')}"><span class="ml-ic">${mapLegendIcon(c)}</span><span class="ml-txt"><b>${esc(L(c.name))} <i>${c.count}</i></b><small>${esc((lg[id] || '').replace('{s}', sz.leaveSeconds || 10).replace('{b}', sz.noBuild || 80))}</small></span></a>`;
      }).join('');
    }
    return `<div class="map-page">
      <div class="map-full" id="mapFull"></div>
      <section class="map-info">
        <div class="map-info-in">
          <div class="mi-intro">
            <h1 class="mi-title">${esc(t('nav_map'))} <span>San Andreas</span></h1>
            <p>${esc(wt('map_s'))}</p>
            <div class="card ma" id="mapAir" data-state="loading"><span class="ma-dot"></span><div><b>${esc(wt('air_h'))}</b><p class="ma-now">…</p><small class="ma-every"></small></div>
              <a class="ma-link" href="/wiki/guia/airdrop">${esc(wt('air_guide'))} ${svg('chevron')}</a></div>
            <h2 class="mi-h">${esc(wt('map_guides'))}</h2>
            <div class="mi-guides">${['safe-zones', 'cold-and-radiation', 'airdrop', 'world-and-events', 'missions'].map((s) => guideLink(s)).join('')}</div>
          </div>
          <div class="mi-legend"><h2 class="mi-h">${esc(wt('map_h'))}</h2><div class="ml" id="mapLegend">${D ? '' : `<p class="muted">…</p>`}</div></div>
        </div>
      </section>
    </div>`;
  }

  function pageNotFound() {
    const pt = lang === 'pt';
    return `<div class="nf card">
        <span class="nf-code">404</span>
        <h1 class="page-title">${pt ? 'Página não encontrada' : 'Page not found'}</h1>
        <p class="page-sub">${pt ? 'O link pode ter mudado. Tente a wiki ou volte para o início.' : 'The link may have changed. Try the wiki or go back home.'}</p>
        <div class="nf-go"><a class="btn btn-play sm" href="/">${pt ? 'Ir para o início' : 'Go home'}</a><a class="btn btn-ghost sm" href="/wiki">Wiki</a></div>
      </div>`;
  }

  // contagem do wipe: calendário OFICIAL do Worker (/api/wipe/status, o mesmo que o Discord e o servidor usam).
  // O relógio do site é corrigido pela hora do Worker; o contador anda a cada segundo aqui mesmo e o site só pergunta
  // de novo a cada minuto (ou quando a aba volta a ficar visível). Sem resposta por 5 min: avisa que está sem conexão.
  const WIPE_REFRESH_MS = 60000, WIPE_STALE_MS = 5 * 60000, PVP_MS = 24 * 3600000;
  let cdTimer = null, wipeData = null, wipeAt = 0, wipeOffset = 0, wipeLoading = null;
  function loadWipe(force) {
    const api = ((window.HAVOK || {}).wipe || {}).api;
    if (!api) return Promise.resolve(null);
    if (wipeLoading) return wipeLoading;
    if (!force && wipeData && Date.now() - wipeAt < WIPE_REFRESH_MS) return Promise.resolve(wipeData);
    const sent = Date.now();
    wipeLoading = fetch(api, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        const got = Date.now();
        const server = Date.parse(d.serverTime);
        if (Number.isFinite(server)) wipeOffset = server - (sent + got) / 2; // meio da ida e volta
        wipeData = d; wipeAt = got;
        return d;
      })
      .catch(() => wipeData)
      .finally(() => { wipeLoading = null; });
    return wipeLoading;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('#cdBox')) loadWipe(true).then(paintWipe);
  });

  const p2 = (n) => String(n).padStart(2, '0');
  function paintWipe() {
    const box = $('#cdBox');
    if (!box) { clearInterval(cdTimer); cdTimer = null; return; }
    const d = wipeData;
    if (!d || !d.scheduledWipeAt || d.status === 'NONE') { box.hidden = true; return; }
    box.hidden = false;
    const now = Date.now() + wipeOffset;
    const at = Date.parse(d.scheduledWipeAt), start = Date.parse(d.startedAt);
    const left = Math.max(0, at - now);
    const pending = d.status === 'WIPE_PENDING' || d.status === 'FAILED' || left === 0;
    const pvp = !pending && left <= PVP_MS;
    box.className = `cd${box.dataset.big ? ' cd-big' : ''}${pvp ? ' pvp' : ''}${pending ? ' pending' : ''}${Date.now() - wipeAt > WIPE_STALE_MS ? ' stale' : ''}`;
    let s = Math.floor(left / 1000);
    const dd = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    $('#cdLeft').innerHTML = pending ? `<b>${lt(d.status === 'FAILED' ? 'cd_failed' : 'cd_pending')}</b>`
      : `<b>${dd}</b><i>d</i><b>${p2(h)}</b><i>h</i><b>${p2(Math.floor(s / 60))}</b><i>m</i><b>${p2(s % 60)}</b><i>s</i>`;
    const pct = Math.min(100, Math.max(0, ((now - start) / (at - start)) * 100));
    $('#cdBar').style.transform = `scaleX(${pending ? 1 : (pct / 100).toFixed(4)})`;
    if ($('#cdPct')) $('#cdPct').textContent = pending ? '100%' : `${Math.floor(pct)}%`;
    const when = new Date(at).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
    $('#cdNote').textContent = Date.now() - wipeAt > WIPE_STALE_MS ? lt('cd_stale')
      : pvp ? lt('cd_pvp') : `${lt('cd_at', { d: when })} · ${lt('cd_every', { n: Math.round((d.durationSeconds || 1296000) / 86400) })}`;
  }
  function countdownBox(more) {
    if (!((window.HAVOK || {}).wipe || {}).api) return '';
    setTimeout(() => {
      clearInterval(cdTimer);
      let ticks = 0;
      loadWipe(false).then(paintWipe);
      cdTimer = setInterval(() => {
        paintWipe();
        if (++ticks % 60 === 0) loadWipe(false).then(paintWipe); // revalida a cada minuto, sem pedir a cada segundo
      }, 1000);
    });
    return `<div class="cd${more ? '' : ' cd-big'}" id="cdBox" ${more ? '' : 'data-big="1"'} hidden><span class="cd-label">${lt('cd_wipe')}</span><span class="cd-left" id="cdLeft"></span>
      <span class="cd-bar"><span id="cdBar"></span><em class="cd-pct" id="cdPct"></em></span><small id="cdNote"></small>${more ? `<a class="cd-more" href="/wipe">${lt('cd_more')} ${svg('chevron')}</a>` : ''}</div>`;
  }

  function pageWipe() {
    return `<div class="wp">
        <div class="wp-hero">
        <p class="l-kicker">${lt('wp_kicker')}</p>
        <h1 class="wp-title">${lt('wp_title')}</h1>
        <p class="wp-sub">${lt('wp_sub')}</p>
        ${countdownBox(false)}
        </div>
      </div>`;
  }


  // ---------------------------------------------------------------- perfil (/perfil): login com Discord + vínculo com o jogo
  const PF = {
    en: { kicker: 'HAVOK · Profile', title: 'YOUR PROFILE', sub: 'Your stats, group and badges in one place, with your Discord picture on the ranking.',
      login: 'Sign in with Discord', connect: 'Connect Discord', my_profile: 'My profile', how: 'Then join the server: the link screen shows up by itself. Point your phone at the QR or click COPY LINK. No commands.',
      unlinked: 'Almost there: join the HAVOK server and the link screen opens by itself. One click on Discord and your game account is here.',
      linked_ok: 'Linked! Your game account is now on your profile.', logout: 'Sign out', nodata: 'Your stats show up here after your next minutes in game.',
      level: 'Level', kills: 'Kills', deaths: 'Deaths', kd: 'K/D', hours: 'Hours played', group: 'Group', nogroup: 'No group', badges: 'Badges', nobadges: 'No badges yet.',
      err: { codigo: 'That link expired or was already used. Open the screen in game again.', ja_vinculada: 'That game account is already linked to another Discord.',
        expirou: 'The sign in took too long. Try again.', discord: 'Discord did not answer. Try again.', cancelado: 'Sign in cancelled.', config: 'Sign in is not available yet.' },
      down: 'Could not load your profile right now.', anon: 'Discord not linked', notfound: 'Player not found.', notfound_group: 'Group not found (groups reset every wipe).',
      in_rank: 'in the ranking', see_group: 'See group', edit: 'Edit profile', save: 'Save', cancel: 'Cancel', bio_l: 'About you', bio_ph: 'A short message for whoever opens your profile (240 characters)',
      yt_ph: 'youtube.com/@yourchannel or @yourchannel', tt_ph: 'tiktok.com/@you or @you', saved: 'Profile saved.', saving: 'Saving…', save_err: 'Could not save right now. Try again in a moment.', bad_youtube: 'That YouTube link is not valid.', bad_tiktok: 'That TikTok link is not valid.',
      kicker_player: 'HAVOK · Player', kicker_group: 'HAVOK · Group', members: 'members', member: 'member', nomembers: 'No members yet.',
      rk_kicker: 'HAVOK · This wipe', rk_title: 'RANKING', rk_sub: 'Every group and every player of the current wipe. Click a group to see its members. Resets every wipe.',
      rk_groups: 'Groups', rk_players: 'Players', by: { kills: 'Kills', level: 'Level', hours: 'Hours' }, kills_l: 'kills', hours_l: 'played',
      prize: (z) => z.hours ? `Prize: ${z.hours} h of VIP for the whole group` : `Prize: ${z.days}-day VIP for ${z.winners} drawn members (leader included)`, prize_note: 'The top 3 groups of the wipe win VIP for every member, valid next wipe (8 h, 6 h and 4 h of play).', xp: 'XP', nogroups: 'No groups yet this wipe.', noplayers: 'Nobody has played this wipe yet.' },
    pt: { kicker: 'HAVOK · Perfil', title: 'SEU PERFIL', sub: 'Seus números, grupo e badges num lugar só, com a sua foto do Discord no ranking.',
      login: 'Entrar com Discord', connect: 'Conectar Discord', my_profile: 'Meu perfil', how: 'Depois é só entrar no servidor: a tela de vínculo aparece sozinha. Aponte o celular para o QR ou clique em COPIAR LINK. Nada de comando.',
      unlinked: 'Falta pouco: entre no servidor do HAVOK e a tela de vínculo abre sozinha. Um clique no Discord e a sua conta do jogo aparece aqui.',
      linked_ok: 'Vinculado! Sua conta do jogo já está no seu perfil.', logout: 'Sair', nodata: 'Seus números aparecem aqui depois dos próximos minutos no jogo.',
      level: 'Level', kills: 'Kills', deaths: 'Mortes', kd: 'K/D', hours: 'Horas jogadas', group: 'Grupo', nogroup: 'Sem grupo', badges: 'Badges', nobadges: 'Nenhuma badge ainda.',
      err: { codigo: 'Esse link venceu ou já foi usado. Abra a tela no jogo de novo.', ja_vinculada: 'Essa conta do jogo já está vinculada a outro Discord.',
        expirou: 'O login demorou demais. Tente de novo.', discord: 'O Discord não respondeu. Tente de novo.', cancelado: 'Login cancelado.', config: 'O login ainda não está disponível.' },
      down: 'Não deu para carregar seu perfil agora.', anon: 'Discord não vinculado', notfound: 'Jogador não encontrado.', notfound_group: 'Grupo não encontrado (os grupos zeram a cada wipe).',
      in_rank: 'no ranking', see_group: 'Ver grupo', edit: 'Editar perfil', save: 'Salvar', cancel: 'Cancelar', bio_l: 'Sobre você', bio_ph: 'Uma mensagem curta para quem abrir o seu perfil (240 caracteres)',
      yt_ph: 'youtube.com/@seucanal ou @seucanal', tt_ph: 'tiktok.com/@voce ou @voce', saved: 'Perfil salvo.', saving: 'Salvando…', save_err: 'Não deu pra salvar agora. Tente de novo daqui a pouco.', bad_youtube: 'Esse link do YouTube não vale.', bad_tiktok: 'Esse link do TikTok não vale.',
      kicker_player: 'HAVOK · Jogador', kicker_group: 'HAVOK · Grupo', members: 'membros', member: 'membro', nomembers: 'Nenhum membro ainda.',
      rk_kicker: 'HAVOK · Este wipe', rk_title: 'RANKING', rk_sub: 'Todos os grupos e todos os jogadores do wipe atual. Clique num grupo para ver os membros. Zera a cada wipe.',
      rk_groups: 'Grupos', rk_players: 'Jogadores', by: { kills: 'Kills', level: 'Level', hours: 'Horas' }, kills_l: 'kills', hours_l: 'jogadas',
      prize: (z) => z.hours ? `Prêmio: ${z.hours} h de VIP para todo o grupo` : `Prêmio: VIP de ${z.days} dia${z.days > 1 ? 's' : ''} para ${z.winners} sorteados (o líder sempre ganha)`, prize_note: 'Os 3 primeiros grupos do wipe ganham VIP para todos os membros, valendo no próximo wipe (8 h, 6 h e 4 h de jogo).', xp: 'XP', nogroups: 'Nenhum grupo neste wipe ainda.', noplayers: 'Ninguém jogou neste wipe ainda.' },
  };
  const BADGE_EXTRA = { opening: ['Grand Opening', 'mythic'] }; // badges só do jogo (sem SVG no site): arte em PNG
  const badgeInfo = (id) => {
    const b = BADGE_LIST.find((x) => x[0] === id);
    if (b) return { name: b[1], rar: b[2], img: badgeImg(id) };
    const y = /^newyear(\d{4})$/.exec(id);
    if (y) return { name: `New Year ${y[1]}`, rar: 'legendary', img: `/badges/${id}.png` };
    const e = BADGE_EXTRA[id];
    return e ? { name: e[0], rar: e[1], img: `/badges/${id}.png` } : null;
  };
  // carregando: círculo girando + texto, até a API responder
  const spinner = () => `<div class="loading" role="status"><span class="spin" aria-hidden="true"></span>${lang === 'pt' ? 'Carregando…' : 'Loading…'}</div>`;
  const ANON = '/img/avatar-anon.svg'; // jogador sem Discord vinculado: avatar cinza
  const pfApi = () => (((window.HAVOK || {}).account || {}).api || '').replace(/\/+$/, '');
  const num = (v) => Number(v || 0).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const avatar = (url, cls = 'pf-avatar') => `<img class="${cls}" src="${esc(url || ANON)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${ANON}'">`;
  const ROLE = { en: { Leader: 'Leader', Staff: 'Officer', Sub: 'Co-leader', Member: 'Member' }, pt: { Leader: 'Líder', Staff: 'Oficial', Sub: 'Sub-líder', Member: 'Membro' } };
  const gColor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#ff6a00');
  // emblema do grupo (silhueta branca do jogo) pintado com a cor do grupo
  const emblem = (g, cls = 'gp-emblem') => `<span class="${cls}" style="--gc:${gColor(g.color)}">${/^\d{2}$/.test(g.emblem || '') ? `<i style="-webkit-mask-image:url(/img/emblems/${g.emblem}.png);mask-image:url(/img/emblems/${g.emblem}.png)"></i>` : `<b>${esc((g.tag || g.name || '?').slice(0, 3))}</b>`}</span>`;
  const groupLink = (g) => (g ? `<a href="/grupo/${esc(g.slug)}"><b>${esc(g.name)}</b>${g.tag ? ` ${tagPill(g)}` : ''}</a>` : '');
  // etiqueta da tag na cor do grupo (cor escura fica mais clara no texto para dar para ler)
  const tagPill = (g) => (g && g.tag ? `<span class="gtag" style="--gc:${gColor(g.color)}">${esc(g.tag)}</span>` : '');

  // cartão do jogador (perfil próprio e perfil público): p = {nick, level, kills, deaths, playMinutes, badges, group, avatarUrl, linked}
  function playerCard(p, extra = {}) {
    const P = PF[lang];
    const stat = (k, v, hot) => `<div class="pf-stat${hot ? ' hot' : ''}"><b>${v}</b><span>${P[k]}</span></div>`;
    const RORD = ['mythic', 'legendary', 'epic', 'rare', 'common'];
    const badges = Object.entries(p.badges || {}).map(([id, c]) => [badgeInfo(id), c]).filter(([b]) => b).sort((x, y) => RORD.indexOf(x[0].rar) - RORD.indexOf(y[0].rar))
      .map(([b, c]) => `<div class="pf-badge" style="--rc:${BRAR[b.rar][1]}" title="${esc(b.name)}"><img src="${b.img}" alt="${esc(b.name)}" loading="lazy"><b>${esc(b.name)}${c > 1 ? ` <small>x${c}</small>` : ''}</b><span>${BRAR[b.rar][0]}</span></div>`).join('');
    const sub = [extra.discordName ? `Discord: ${esc(extra.discordName)}` : (p.linked ? '' : `<span class="pf-anon">${P.anon}</span>`)].filter(Boolean).join(' · ');
    const so = p.social || {};
    const links = [so.youtube ? `<a class="pf-link yt" href="${esc(so.youtube)}" target="_blank" rel="noopener nofollow">${svg('youtube')}YouTube</a>` : '',
      so.tiktok ? `<a class="pf-link tt" href="${esc(so.tiktok)}" target="_blank" rel="noopener nofollow">${svg('tiktok')}TikTok</a>` : ''].join('');
    const g = p.group;
    const groupCard = g ? `<a class="pf-group" href="/grupo/${esc(g.slug)}" style="--gc:${gColor(g.color)}">${emblem(g)}
        <div><b>${esc(g.name)} ${tagPill(g)}</b><small>#${g.rank} ${P.in_rank} · ${ROLE[lang][g.role] || g.role} · ${num(g.members)} ${g.members === 1 ? P.member : P.members}</small></div>
        <span class="pf-group-go">${P.see_group} ›</span></a>` : `<p class="pf-nogroup muted">${P.nogroup}</p>`;
    return `<div class="pf-card">
        <header class="pf-head">${avatar(p.avatarUrl)}
          <div><h2>${esc(p.nick || extra.discordName || '?')}${g ? ` ${tagPill(g)}` : ''}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}${links ? `<div class="pf-links">${links}</div>` : ''}</div>${extra.action || ''}</header>
        ${so.bio ? `<p class="pf-bio">${esc(so.bio)}</p>` : ''}
        ${extra.edit || ''}
        <h3 class="pf-sec">${P.group}</h3>${groupCard}
        <div class="pf-stats">${stat('level', num(p.level))}${stat('kills', num(p.kills), true)}${stat('deaths', num(p.deaths))}${stat('kd', p.deaths ? (p.kills / p.deaths).toFixed(2) : num(p.kills))}${stat('hours', num(Math.floor((p.playMinutes || 0) / 60)))}</div>
        <h3 class="pf-sec">${P.badges}</h3><div class="pf-badges">${badges || `<p class="muted">${P.nobadges}</p>`}</div>
      </div>`;
  }

  // botão da conta no topo: "Conectar Discord" ou a foto + nome de quem já entrou
  let acct = null;
  async function refreshAccount() {
    const btn = $('#acctBtn');
    const api = pfApi();
    if (!btn || !api) return;
    try { const r = await fetch(`${api}/api/me`, { credentials: 'include', cache: 'no-store' }); acct = r.ok ? await r.json() : null; } catch (e) { acct = null; }
    drawAccount();
  }
  function drawAccount() {
    const btn = $('#acctBtn');
    if (!btn || !acct) return;
    btn.hidden = false;
    btn.classList.toggle('on', !!acct.loggedIn);
    btn.innerHTML = acct.loggedIn
      ? `${avatar(acct.avatarUrl, 'acct-av')}<span>${esc(acct.nick || acct.discordName)}</span>${svg('chevron')}`
      : `${svg('discord')}<span>${PF[lang].connect}</span>`;
    // logado: o clique abre o menu (Meu perfil / Sair) em vez de ir direto
    btn.onclick = acct.loggedIn ? (e) => { e.preventDefault(); toggleAcctMenu(); } : null;
  }

  function toggleAcctMenu(force) {
    let menu = $('#acctMenu');
    const open = force !== undefined ? force : !(menu && !menu.classList.contains('closing'));
    if (menu) {
      if (!open) {
        menu.classList.add('closing');
        setTimeout(() => menu.remove(), 160);
        return;
      }
      menu.remove();
    }
    if (!open) return;
    const P = PF[lang];
    menu = document.createElement('div');
    menu.id = 'acctMenu';
    menu.className = 'acct-menu';
    menu.innerHTML = `<a href="/perfil">${svg('user')}${P.my_profile}</a><button type="button" class="out">${svg('logout')}${P.logout}</button>`;
    $('#acctBtn').after(menu);
    menu.querySelector('a').onclick = () => toggleAcctMenu(false);
    menu.querySelector('.out').onclick = async () => {
      toggleAcctMenu(false);
      try { await fetch(`${pfApi()}/api/logout`, { method: 'POST', credentials: 'include' }); } catch (e) { /* offline */ }
      acct = { loggedIn: false };
      drawAccount();
      route();
    };
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('#acctMenu, #acctBtn')) toggleAcctMenu(false); });

  function pagePerfil(query) {
    const P = PF[lang];
    const api = pfApi();
    const q = new URLSearchParams(query || '');
    const note = q.get('vinculado') ? `<p class="pf-note ok">${P.linked_ok}</p>` : q.get('erro') ? `<p class="pf-note bad">${esc(P.err[q.get('erro')] || P.down)}</p>` : '';
    setTimeout(async () => {
      const box = $('#pfBox');
      if (!box) return;
      if (!api) { box.innerHTML = `<p class="muted">${P.err.config}</p>`; return; }
      let me = null;
      try { const r = await fetch(`${api}/api/me`, { credentials: 'include', cache: 'no-store' }); me = r.ok ? await r.json() : null; } catch (e) { me = null; }
      if (!$('#pfBox')) return;
      if (!me) { box.innerHTML = `<p class="muted">${P.down}</p>`; return; }
      if (!me.loggedIn) {
        box.innerHTML = `<div class="pf-login"><a class="cta" href="${esc(me.loginUrl || `${api}/auth/discord`)}">${svg('discord')} ${P.login}</a><p class="muted">${P.how}</p></div>`;
        return;
      }
      const action = `<div class="pf-actions"><button type="button" class="chip" id="pfEdit">${svg('scroll')}${P.edit}</button><button type="button" class="chip danger" id="pfOut">${svg('logout')}${P.logout}</button></div>`;
      if (me.linked && me.profile) {
        const so = me.social || {};
        const edit = `<div class="pf-edit-wrap" id="pfWrap" aria-hidden="true"><div class="pf-edit-clip"><form class="pf-edit" id="pfForm">
            <label>${P.bio_l}<textarea name="bio" maxlength="240" rows="3" placeholder="${esc(P.bio_ph)}">${esc(so.bio || '')}</textarea></label>
            <label><span>${svg('youtube')} YouTube</span><input name="youtube" maxlength="120" value="${esc(so.youtube || '')}" placeholder="${esc(P.yt_ph)}"></label>
            <label><span>${svg('tiktok')} TikTok</span><input name="tiktok" maxlength="120" value="${esc(so.tiktok || '')}" placeholder="${esc(P.tt_ph)}"></label>
            <p class="pf-edit-msg" id="pfMsg" role="status"></p>
            <div class="pf-edit-btns"><button type="button" class="chip" id="pfCancel">${P.cancel}</button><button type="submit" class="chip on">${P.save}</button></div>
          </form></div></div>`;
        box.innerHTML = playerCard({ ...me.profile, social: so, avatarUrl: me.avatarUrl, linked: true }, { discordName: me.discordName, action, edit });
        const form = $('#pfForm');
        // abre/fecha com animação (a classe .open faz a transição no CSS)
        const wrap = $('#pfWrap');
        const setOpen = (on) => {
          wrap.classList.toggle('open', on);
          wrap.setAttribute('aria-hidden', on ? 'false' : 'true');
          $('#pfEdit').classList.toggle('on', on);
          if (on) setTimeout(() => form.bio.focus(), 250);
        };
        $('#pfEdit').onclick = () => setOpen(!wrap.classList.contains('open'));
        $('#pfCancel').onclick = () => setOpen(false);
        form.onsubmit = async (e) => {
          e.preventDefault();
          const body = { bio: form.bio.value, youtube: form.youtube.value, tiktok: form.tiktok.value };
          const msg = $('#pfMsg');
          const show = (kind, text) => { msg.className = `pf-edit-msg ${kind}`; msg.innerHTML = `${svg(kind === 'bad' ? 'info' : 'award')}<span>${esc(text)}</span>`; };
          show('wait', P.saving);
          let r = null;
          try { r = await fetch(`${api}/api/me/profile`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (err) { r = null; }
          const j = r ? await r.json().catch(() => ({})) : {};
          if (r && r.ok) { show('ok', P.saved); setTimeout(route, 900); } else { show('bad', P[j.error] || P.save_err); }
        };
      } else {
        box.innerHTML = `<div class="pf-card"><header class="pf-head">${avatar(me.avatarUrl)}<div><h2>${esc(me.discordName)}</h2><p class="muted">Discord: ${esc(me.discordName)}</p></div>${action}</header>
          <p class="pf-note">${me.linked ? P.nodata : P.unlinked}</p></div>`;
      }
      const out = $('#pfOut');
      if (out) out.onclick = async () => { try { await fetch(`${api}/api/logout`, { method: 'POST', credentials: 'include' }); } catch (e) { /* offline */ } go('/perfil', { replace: true, force: true }); refreshAccount(); };
    });
    return `<section class="bd-hero"><p class="l-kicker">${P.kicker}</p><h1 class="page-title">${P.title}</h1><p class="page-sub">${P.sub}</p></section>${note}<div id="pfBox" class="pf">${spinner()}</div>`;
  }

  // perfil público (/jogador/<pid>): com ou sem Discord
  function pageJogador(pid) {
    const P = PF[lang];
    setTimeout(async () => {
      let p = null;
      try { const r = await fetch(`${pfApi()}/api/player/${encodeURIComponent(pid)}`); p = r.ok ? await r.json() : null; } catch (e) { p = null; }
      const box = $('#pfBox');
      if (!box) return;
      box.innerHTML = p ? playerCard(p) : `<p class="muted">${P.notfound}</p>`;
      if (p) document.title = `${p.nick} — HAVOK`;
    });
    return `<section class="bd-hero"><p class="l-kicker">${P.kicker_player}</p></section><div id="pfBox" class="pf">${spinner()}</div>`;
  }

  // ranking completo do wipe (/ranking): grupos com emblema/cor/descrição e jogadores com foto ou avatar cinza
  let rkBy = 'kills';
  function pageRanking() {
    const P = PF[lang];
    const api = pfApi();
    setTimeout(async () => {
      document.querySelectorAll('.rkp-sort button').forEach((b) => b.onclick = () => { rkBy = b.dataset.by; route(); });
      const get = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch (e) { return null; } };
      // cada lista aparece assim que a sua resposta chega (uma não espera a outra)
      const plP = get(`${api}/api/ranking/players?by=${rkBy}`);
      const gr = await get(`${api}/api/groups`);
      const gBox = $('#rkpGroups');
      if (!gBox) return;
      const MEDAL = ['gold', 'silver', 'bronze'];
      const CREATOR_BADGES = ['youtuber', 'tiktoker', 'creator'];
      const ico = (n) => `<span class="rkp-ic">${svg(n)}</span>`;
      gBox.innerHTML = !gr ? `<p class="muted">${P.down}</p>` : gr.groups.map((g) => {
        const medal = MEDAL[g.rank - 1];
        return `<a class="rkp-group${medal ? ` podium ${medal}` : ''}" href="/grupo/${esc(g.slug)}" style="--gc:${gColor(g.color)}">
          <span class="rkp-pos">${medal ? svg('award') : ''}${String(g.rank).padStart(2, '0')}</span>${emblem(g)}
          <div class="rkp-gtxt"><b>${esc(g.name)} ${tagPill(g)}</b>${g.description ? `<p>${esc(g.description)}</p>` : ''}
            <span class="rkp-stats">${ico('users')}${num(g.members)} <em>${g.members === 1 ? P.member : P.members}</em>${ico('skull')}${num(g.kills)} <em>${P.kills_l}</em>${ico('star')}${num(g.xp)} <em>XP</em></span>
            ${medal && g.prize ? `<span class="rkp-prize">${svg('gift')}${esc(P.prize(g.prize))}</span>` : ''}</div></a>`;
      }).join('') || `<p class="muted">${P.nogroups}</p>`;
      if (gr && gr.groups.some((g) => g.prize)) gBox.insertAdjacentHTML('beforeend', `<p class="rkp-note">${svg('gift')}${P.prize_note}</p>`);
      const pl = await plP;
      const pBox = $('#rkpPlayers');
      if (!pBox) return;
      // o número da direita diz o que é: caveira = kills, divisas = level, relógio = horas
      const val = (p) => (rkBy === 'level' ? `${svg('chevrons')}<b>${num(p.level)}</b><em>LEVEL</em>`
        : rkBy === 'hours' ? `${svg('clock')}<b>${num(Math.floor(p.playMinutes / 60))}<small>h</small></b><em>${P.hours_l}</em>`
          : `${svg('skull')}<b>${num(p.kills)}</b><em>${P.kills_l}</em>`);
      pBox.innerHTML = !pl ? `<p class="muted">${P.down}</p>` : pl.players.map((p) => {
        const medal = MEDAL[p.rank - 1];
        return `<a class="rkp-player${medal ? ` podium ${medal}` : ''}" href="/jogador/${esc(p.pid)}">
          <span class="rkp-pos">${String(p.rank).padStart(2, '0')}</span>${avatar(p.avatarUrl, 'gp-avatar')}
          <div><b>${esc(p.nick)}${p.group && p.group.tag ? ` ${tagPill(p.group)}` : ''}${(p.badges || []).filter((id) => CREATOR_BADGES.includes(id)).map((id) => `<img class="rkp-badge" src="${badgeImg(id)}" alt="${esc(id)}" title="${esc((BADGE_LIST.find((x) => x[0] === id) || [])[1] || id)}">`).join('')}</b><span class="rkp-stats">${p.group && !p.group.tag ? `<i>${esc(p.group.name)}</i>` : ''}${ico('chevrons')}Lv ${num(p.level)}${ico('crosshair')}K/D ${p.deaths ? (p.kills / p.deaths).toFixed(2) : num(p.kills)}</span></div>
          <span class="rkp-val">${val(p)}</span></a>`;
      }).join('') || `<p class="muted">${P.noplayers}</p>`;
    });
    const SORT_ICON = { kills: 'skull', level: 'chevrons', hours: 'clock' };
    const sort = Object.entries(P.by).map(([k, n]) => `<button type="button" class="chip ${rkBy === k ? 'on' : ''}" data-by="${k}">${svg(SORT_ICON[k])}${n}</button>`).join('');
    return `<section class="bd-hero"><p class="l-kicker">${P.rk_kicker}</p><h1 class="page-title">${P.rk_title}</h1><p class="page-sub">${P.rk_sub}</p></section>
      <div class="rkp">
        <section class="rkp-col"><h3>${P.rk_groups}</h3><div id="rkpGroups">${spinner()}</div></section>
        <section class="rkp-col"><div class="rkp-colhead"><h3>${P.rk_players}</h3><div class="rkp-sort">${sort}</div></div><div id="rkpPlayers">${spinner()}</div></section>
      </div>`;
  }

  // grupo (/grupo/<slug>): todos os membros; quem não vinculou o Discord aparece com o nick e o avatar cinza
  function pageGrupo(slug) {
    const P = PF[lang];
    setTimeout(async () => {
      let g = null;
      try { const r = await fetch(`${pfApi()}/api/group/${encodeURIComponent(slug)}`); g = r.ok ? await r.json() : null; } catch (e) { g = null; }
      const box = $('#pfBox');
      if (!box) return;
      if (!g) { box.innerHTML = `<p class="muted">${P.notfound_group}</p>`; return; }
      document.title = `${g.name} — HAVOK`;
      const members = g.members.map((m) => `<a class="gp-member" href="/jogador/${esc(m.pid)}">${avatar(m.avatarUrl, 'gp-avatar')}
          <div><b>${esc(m.nick)}</b><small>${ROLE[lang][m.role] || m.role} · Lv ${num(m.level)}</small></div>
          <span class="gp-k"><b>${num(m.kills)}</b><small>${P.kills}</small></span></a>`).join('');
      box.innerHTML = `<div class="pf-card">
          <header class="gp-head">${emblem(g, 'gp-emblem big')}<div><h2><span class="gp-rank">#${g.rank}</span> ${esc(g.name)} ${tagPill(g)}</h2>
            ${g.description ? `<p class="gp-desc">${esc(g.description)}</p>` : ''}
            <p class="muted">${num(g.members.length)} ${g.members.length === 1 ? P.member : P.members} · ${num(g.kills)} ${P.kills.toLowerCase()} · ${num(g.deaths)} ${P.deaths.toLowerCase()} · ${num(g.xp)} ${P.xp}</p></div></header>
          <div class="gp-list">${members || `<p class="muted">${P.nomembers}</p>`}</div></div>`;
    });
    return `<section class="bd-hero"><p class="l-kicker">${P.kicker_group}</p></section><div id="pfBox" class="pf">${spinner()}</div>`;
  }

  // ---------------------------------------------------------------- anti-cheat: gravação (link só no canal de staff)
  function pageAc(id) {
    const pt = lang === 'pt';
    const api = pfApi();
    if (!/^[0-9a-f]{32}$/.test(id || '')) return `<div class="pf-card ac-card"><p class="muted">${pt ? 'Gravação não encontrada.' : 'Recording not found.'}</p></div>`;
    setTimeout(async () => {
      const box = $('#acBox');
      if (!box) return;
      let c = null;
      try { const r = await fetch(`${api}/api/ac/clip/${id}`); c = r.ok ? await r.json() : null; } catch (e) { c = null; }
      if (!c) { box.innerHTML = `<p class="muted">${pt ? 'Gravação não encontrada ou já apagada (ficam 14 dias).' : 'Recording not found or already deleted (kept for 14 days).'}</p>`; return; }
      const when = new Date(c.created_at * 1000).toLocaleString(pt ? 'pt-BR' : 'en-US');
      const fps = Math.max(1, Number(c.fps) || 1);
      const src = (n) => `${api}/api/ac/clip/${id}/${n}.jpg`;
      box.innerHTML = `<div class="ac-head"><b>${esc(c.player)}</b><span class="ac-reason">${esc(c.reason)}</span><span class="muted">${esc(when)}</span></div>
        ${c.detail ? `<p class="ac-detail">${esc(c.detail)}</p>` : ''}
        <div class="ac-stage"><img id="acImg" alt="" src="${src(c.frames - 1)}"><span id="acTime" class="ac-time"></span></div>
        <div class="ac-ctrl"><button id="acPlay" class="ac-play">${pt ? 'Pausar' : 'Pause'}</button>
          <input id="acSeek" type="range" min="0" max="${c.frames - 1}" value="0" aria-label="${pt ? 'Quadro' : 'Frame'}">
          <span class="ac-speed">${[1, 2, 4].map((v) => `<button data-sp="${v}" class="${v === 1 ? 'on' : ''}">${v}x</button>`).join('')}</span></div>
        <p class="muted ac-note">${pt ? `${c.frames} quadros, ${fps} por segundo: o último é o momento do alerta. Isto é evidência para a staff analisar, não prova sozinha.` : `${c.frames} frames, ${fps} per second: the last one is the moment of the alert. This is evidence for staff review, not proof on its own.`}</p>`;
      // pré-carrega todos os quadros e toca em loop
      const imgs = [...Array(c.frames)].map((_, n) => { const im = new Image(); im.src = src(n); return im; });
      let n = 0, speed = 1, playing = true, timer;
      const show = () => { $('#acImg').src = imgs[n].src; $('#acSeek').value = n; $('#acTime').textContent = `${((n - (c.frames - 1)) / fps).toFixed(fps > 1 ? 1 : 0)}s`; };
      const tick = () => { if (!$('#acImg')) return clearInterval(timer); n = (n + 1) % c.frames; show(); };
      const restart = () => { clearInterval(timer); if (playing) timer = setInterval(tick, 1000 / (speed * fps)); };
      $('#acPlay').onclick = () => { playing = !playing; $('#acPlay').textContent = playing ? (pt ? 'Pausar' : 'Pause') : (pt ? 'Tocar' : 'Play'); restart(); };
      $('#acSeek').oninput = (e) => { n = Number(e.target.value); show(); };
      document.querySelectorAll('.ac-speed button').forEach((b) => b.onclick = () => {
        speed = Number(b.dataset.sp);
        document.querySelectorAll('.ac-speed button').forEach((x) => x.classList.toggle('on', x === b));
        restart();
      });
      show();
      restart();
    }, 0);
    return `<div class="pf-card ac-card"><h1 class="ac-title">${pt ? 'Gravação do anti-cheat' : 'Anti-cheat recording'}</h1><div id="acBox">${spinner()}</div></div>`;
  }

  // ---------------------------------------------------------------- roteador (History API; tabela em routes.js)
  // Cada página registra o que precisa parar ao sair (timers, mapa) com onLeave(fn).
  const leaveFns = [];
  function onLeave(fn) { leaveFns.push(fn); }
  const WIKI_PAGES = ['wiki', 'items', 'category', 'item', 'vehicles', 'guides', 'guide', 'faq'];
  const PAGE_TITLE = {
    en: { home: 'HAVOK — Rust Survival on MTA:SA', wiki: 'Wiki — HAVOK', items: 'Items — HAVOK Wiki', vehicles: 'Vehicles — HAVOK Wiki', guides: 'Guides — HAVOK Wiki', faq: 'FAQ — HAVOK',
      map: 'Map — HAVOK', ranking: 'Ranking — HAVOK', wipe: 'Wipe — HAVOK', store: 'VIP Store — HAVOK', badges: 'Badges — HAVOK', perfil: 'Profile — HAVOK', group: 'Group — HAVOK', player: 'Player — HAVOK', ac: 'Anti-cheat — HAVOK', notfound: 'Page not found — HAVOK' },
    pt: { home: 'HAVOK — Rust Survival no MTA:SA', wiki: 'Wiki — HAVOK', items: 'Itens — Wiki HAVOK', vehicles: 'Veículos — Wiki HAVOK', guides: 'Guias — Wiki HAVOK', faq: 'Perguntas frequentes — HAVOK',
      map: 'Mapa — HAVOK', ranking: 'Ranking — HAVOK', wipe: 'Wipe — HAVOK', store: 'Loja VIP — HAVOK', badges: 'Badges — HAVOK', perfil: 'Perfil — HAVOK', group: 'Grupo — HAVOK', player: 'Jogador — HAVOK', ac: 'Anti-cheat — HAVOK', notfound: 'Página não encontrada — HAVOK' },
  };
  function pageTitle(r) {
    const T0 = PAGE_TITLE[lang], wikiT = lang === 'pt' ? 'Wiki HAVOK' : 'HAVOK Wiki';
    if (r.page === 'item' && byId[r.id]) return `${name(byId[r.id])} — ${wikiT}`;
    if (r.page === 'category') { const c = CATS.find((x) => x.id === r.id); if (c) return `${c[lang]} — ${wikiT}`; }
    if (r.page === 'guide') { const g = W.guides.find((x) => x.slug === r.id); if (g) return `${L(g).title} — ${lang === 'pt' ? 'Guia do HAVOK' : 'HAVOK Guide'}`; }
    return T0[r.page] || T0.home;
  }

  let curKey = null;
  function route(opts = {}) {
    leaveFns.splice(0).forEach((f) => { try { f(); } catch (e) { /* segue */ } });
    clearInterval(cdTimer); cdTimer = null;
    const r = HavokRoutes.parse(location.pathname);
    const query = location.search.slice(1);
    const key = location.pathname + location.search;
    const changed = key !== curKey;
    curKey = key;
    const wiki = WIKI_PAGES.includes(r.page);
    let html;
    switch (r.page) {
      case 'home': html = pageLanding(); break;
      case 'wiki': html = pageHome(); break;
      case 'items': html = pageList(null); break;
      case 'category': html = CATS.some((c) => c.id === r.id) ? pageList(r.id) : pageNotFound(); break;
      case 'item': html = pageItem(r.id); break;
      case 'vehicles': html = pageVehicles(); break;
      case 'guides': html = pageGuides(); break;
      case 'guide': html = pageGuide(r.id); break;
      case 'faq': html = pageFaq(); break;
      case 'map': html = pageMap(); break;
      case 'ranking': html = pageRanking(); break;
      case 'wipe': html = pageWipe(); break;
      case 'store': html = pageStore(); break;
      case 'badges': html = pageBadges(); break;
      case 'perfil': html = pagePerfil(query); break;
      case 'group': html = pageGrupo(r.id); break;
      case 'player': html = pageJogador(r.id); break;
      case 'ac': html = pageAc(r.id); break;
      default: html = pageNotFound();
    }
    const body = document.body;
    body.dataset.page = r.page;
    body.classList.toggle('landing', r.page === 'home');
    body.classList.toggle('wiki-mode', wiki);
    body.classList.toggle('standalone', !wiki && r.page !== 'home' && r.page !== 'map');
    $('#main').innerHTML = html;
    renderSide(r.page === 'item' && byId[r.id] ? '/wiki/categoria/' + byId[r.id].cat : location.pathname + location.search);
    setMenu(false);
    const groups = r.page === 'group' || (r.page === 'ranking' && /(^|&)tab=grupos/.test(query));
    const navOn = wiki ? 'wiki' : groups ? 'groups' : r.page === 'player' ? 'ranking' : r.page;
    document.querySelectorAll('.topnav a').forEach((x) => {
      const on = x.dataset.nav === navOn;
      x.classList.toggle('on', on);
      if (on) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
    });
    if ($('#acctBtn')) $('#acctBtn').classList.toggle('cur', r.page === 'perfil');
    document.title = pageTitle(r);
    // página nova: topo (ou a posição salva ao voltar); a mesma página redesenhada (filtro, idioma): fica onde está
    if (opts.scroll !== undefined) requestAnimationFrame(() => window.scrollTo(0, opts.scroll));
    else if (changed) window.scrollTo(0, 0);
  }

  // abre um caminho do site sem recarregar
  function go(href, opts = {}) {
    const u = new URL(href, location.href);
    const to = u.pathname + u.search + u.hash;
    if (to === location.pathname + location.search + location.hash && !opts.force) { window.scrollTo(0, 0); setMenu(false); return; }
    try { history.replaceState(Object.assign({}, history.state, { y: window.scrollY }), ''); } catch (e) { /* segue */ }
    history[opts.replace ? 'replaceState' : 'pushState']({ y: 0 }, '', to);
    route({ scroll: 0 });
    // leitor de tela: o foco vai para o conteúdo novo
    const m = $('#main');
    if (m) m.focus({ preventScroll: true });
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('popstate', (e) => route({ scroll: (e.state && e.state.y) || 0 }));
  // links internos: sem recarregar (Ctrl/⌘/botão do meio, target e download seguem o navegador)
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const u = new URL(href, location.href);
    if (u.origin !== location.origin || !HavokRoutes.isApp(u.pathname)) return;
    e.preventDefault();
    go(u.href);
  });
  // link antigo com # (Discord, favoritos): troca pelo caminho novo, sem entrada a mais no histórico
  function fixLegacyHash() {
    const to = HavokRoutes.fromHash(location.hash);
    if (to === null) return false;
    history.replaceState({ y: 0 }, '', to);
    return true;
  }
  window.addEventListener('hashchange', () => { if (fixLegacyHash()) route({ scroll: 0 }); });

  function setMenu(open) {
    $('#sidebar').classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    $('#menuBtn').setAttribute('aria-expanded', open);
  }

  function applyLang() {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('#lang button').forEach((b) => { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', b.dataset.lang === lang); });
    $('#search').placeholder = t('search');
    $('#searchBtn').setAttribute('aria-label', t('open_search'));
    document.querySelectorAll('[data-discord]').forEach((x) => { x.href = (window.HAVOK || {}).discord || '#'; });
  }
  document.querySelectorAll('#lang button').forEach((b) => b.addEventListener('click', () => {
    if (lang === b.dataset.lang) return;
    lang = b.dataset.lang;
    try { localStorage.setItem('havok-lang', lang); } catch (e) { /* sem storage */ }
    applyLang();
    route();
    drawAccount();
  }));
  $('#menuBtn').addEventListener('click', () => setMenu(!$('#sidebar').classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });

  // ---------------------------------------------------------------- global search
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sIn = $('#search'), sRes = $('#searchResults');
  let sel = 0;
  function search() {
    const q = norm(sIn.value.trim());
    if (!q) { sRes.classList.remove('open'); return; }
    // nome começando com o termo vem antes de nome que só contém o termo
    const score = (i) => { const a = norm(name(i)), b = norm(lang === 'pt' ? i.name.en : i.name.pt); return a.startsWith(q) ? 0 : a.includes(q) ? 1 : b.includes(q) ? 2 : 9; };
    const hits = W.items.map((i) => [i, score(i)]).filter((x) => x[1] < 9).sort((a, b) => a[1] - b[1] || sortByName(a[0], b[0])).slice(0, 10).map((x) => x[0]);
    const guides = W.guides.filter((g) => norm(L(g).title).includes(q) || norm(L(g).description).includes(q)).slice(0, 3);
    sel = 0;
    const rows = hits.map((i) => `<a href="/wiki/item/${i.id}">${iconOf(i)}<span>${esc(name(i))}<small>${esc(typeName(i.type))}</small></span></a>`)
      .concat(guides.map((g) => `<a href="/wiki/guia/${g.slug}"><span class="ic">${svg(g.icon)}</span><span>${esc(L(g).title)}<small>${t('guides')}</small></span></a>`));
    sRes.innerHTML = rows.length ? rows.join('').replace('<a ', '<a class="sel" ') : `<div class="empty">${t('no_results')}</div>`;
    sRes.classList.add('open');
  }
  sIn.addEventListener('input', search);
  sIn.addEventListener('keydown', (e) => {
    const links = [...sRes.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % Math.max(links.length, 1);
      links.forEach((l, n) => l.classList.toggle('sel', n === sel));
    } else if (e.key === 'Enter' && links[sel]) {
      const href = links[sel].getAttribute('href');
      sIn.value = ''; sRes.classList.remove('open'); sIn.blur();
      go(href);
    } else if (e.key === 'Escape') { sRes.classList.remove('open'); sIn.blur(); }
  });
  sRes.addEventListener('click', () => { sIn.value = ''; sRes.classList.remove('open'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) sRes.classList.remove('open'); });
  // no celular a busca mora no menu lateral: abre o menu e já foca o campo
  function openSearch() {
    // fora da wiki (no computador) a barra lateral não aparece: abre a wiki e foca a busca
    if (window.matchMedia('(max-width: 860px)').matches) setMenu(true);
    else if (!document.body.classList.contains('wiki-mode')) { go('/wiki'); setTimeout(() => sIn.focus(), 60); return; }
    sIn.focus(); sIn.select();
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  });
  $('#searchBtn').addEventListener('click', openSearch);

  fixLegacyHash();
  refreshAccount();
  applyLang();
  route();
})();
