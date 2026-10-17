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
      nav_store: 'Store', nav_play: 'Play',
     
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
      nav_store: 'Loja', nav_play: 'Jogar',
     
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

  const CATS = [
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
  ];
  const TYPES = {
    'Primary Weapon': ['Primary Weapon', 'Arma Primária'], 'Secondary Weapon': ['Secondary Weapon', 'Arma Secundária'], Explosive: ['Explosive', 'Explosivo'],
    Tool: ['Tool', 'Ferramenta'], Resource: ['Resource', 'Recurso'], Item: ['Component', 'Componente'], Ammo: ['Ammo', 'Munição'], Food: ['Food', 'Comida'],
    'Raw Food': ['Raw Food', 'Comida Crua'], Drink: ['Drink', 'Bebida'], Medicament: ['Medical', 'Medicamento'], 'Empty Can': ['Empty Can', 'Lata Vazia'],
    Helmet: ['Helmet', 'Capacete'], Vest: ['Vest', 'Colete'], Hazmat: ['Hazmat', 'Hazmat'], Shirt: ['Shirt', 'Camisa'], Pants: ['Pants', 'Calça'], Shoes: ['Shoes', 'Calçado'], Hat: ['Hat', 'Chapéu'], 'Base Object': ['Base Object', 'Estrutura de Base'],
    Construction: ['Construction', 'Construção'], 'Vehicle Part': ['Vehicle Part', 'Peça de Veículo'],
  };
  const typeName = (ty) => (TYPES[ty] ? TYPES[ty][lang === 'pt' ? 1 : 0] : ty);
  const SOURCES = {
    'default-barrel': ['Barrels', 'Barris'], 'industrial-barrel': ['Industrial barrels', 'Barris industriais'], 'flammable-barrel': ['Red fuel barrels', 'Barris vermelhos'],
    'default-box': ['Loot crates', 'Caixas de loot'], 'military-box': ['Military crates', 'Caixas militares'], 'military-barrel': ['Military barrels', 'Barris militares'],
    helicopter: ['Patrol helicopter wreck', 'Destroços do helicóptero'], airdrop: ['Airdrop', 'Airdrop'], hospital: ['Hospital med packs', 'Kits médicos dos hospitais'],
    tree: ['Trees', 'Árvores'], rock: ['Grey rocks', 'Pedras cinzas'], 'iron-rock': ['Iron rocks', 'Pedras de ferro'], 'sulfur-rock': ['Yellow sulfur rocks', 'Pedras amarelas de enxofre'],
    planter: ['Grown in a Planter', 'Plantado na Plantadora'], fill: ['Fill a canteen at a lake, river, Well or Water Barrel', 'Encha o cantil num lago, rio, Poço ou Barril de Água'],
    cook: ['Cook Raw Meat on a Campfire or Furnace', 'Cozinhe Carne Crua na Fogueira ou Fornalha'],
  };
  const SRC_ICON = { tree: 'tree', rock: 'pickaxe', 'iron-rock': 'pickaxe', 'sulfur-rock': 'pickaxe', planter: 'sprout', fill: 'droplet', cook: 'flame', helicopter: 'zap', airdrop: 'package', hospital: 'cross' };

  // ---------------------------------------------------------------- icons (lucide-like paths)
  const P = {
    crosshair: '<circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
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
  const iconOf = (it, cls = 'ic') => {
    if (!it) return `<span class="${cls}">${svg('box')}</span>`;
    if (it.icon) return `<span class="${cls}"><img src="${it.icon}" alt="" loading="lazy"></span>`;
    if (it.piece) return `<span class="${cls}" style="color:${TIER_COL[it.tier]}"><svg viewBox="0 0 24 24">${PIECE_SVG[it.piece] || P.box}</svg></span>`;
    return `<span class="${cls}">${svg('box')}</span>`;
  };

  const byId = Object.fromEntries(W.items.map((i) => [i.id, i]));
  const name = (it) => (it ? L(it.name) : '?');
  const sortByName = (a, b) => name(a).localeCompare(name(b), lang === 'pt' ? 'pt-BR' : 'en');

  // ---------------------------------------------------------------- sidebar
  function renderSide(route) {
    const cur = '#' + route;
    const a = (href, icon, label) => `<a href="${href}" class="${cur === href ? 'on' : ''}">${svg(icon)}<span>${esc(label)}</span></a>`;
    $('#sideNav').innerHTML = `
      <div class="nav-group"><h5>${t('browse')}</h5>
        ${a('#/items', 'grid', t('all_items'))}
        ${CATS.map((c) => a('#/category/' + c.id, c.icon, c[lang])).join('')}
        ${a('#/faq', 'help', 'FAQ')}
      </div>
      <div class="nav-group"><h5>${t('guides_h')}</h5>
        ${a('#/guides', 'book', t('all_guides'))}
        ${W.guides.map((g) => a('#/guides/' + g.slug, g.icon, L(g).title)).join('')}
      </div>
      <div class="nav-group"><h5>HAVOK</h5>
        ${a('#/', 'rocket', t('nav_home'))}
        ${a('#/wiki', 'book', 'Wiki')}
        ${a('#/store', 'crown', t('nav_store'))}
        <a href="${esc((window.HAVOK || {}).discord || '#')}" target="_blank" rel="noopener">${svg('discord')}<span>Discord ↗</span></a>
      </div>`;
  }

  // ---------------------------------------------------------------- pages
  const crumbs = (parts) => `<div class="crumbs">${parts.map((p, i) => (i < parts.length - 1 ? `<a href="${p[1]}">${esc(p[0])}</a>${svg('chevron')}` : `<span class="cur">${esc(p[0])}</span>`)).join('')}</div>`;

  function featuredVideo() {
    const yt = youtubeId((window.HAVOK || {}).featured);
    if (!yt) return '';
    return `<div class="section-title">${t('featured')}</div>
      <figure class="media"><div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${t('featured')}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div></figure>`;
  }
  function pageHome() {
    const count = (id) => W.items.filter((i) => i.cat === id).length;
    setTimeout(() => {
      // a busca grande da wiki usa a mesma busca global
      const big = $('#wikiSearch');
      if (big) big.onclick = () => openSearch();
    });
    return `<section class="w-hero">
        <p class="l-kicker">HAVOK · Wiki</p>
        <h1 class="page-title">${t('wiki_title')}</h1><p class="page-sub">${t('wiki_sub')}</p>
        <button type="button" class="w-search" id="wikiSearch">${svg('search')}<span>${t('search')}</span><kbd>Ctrl K</kbd></button>
      </section>
      ${featuredVideo()}
      <div class="section-title">${t('categories')}</div>
      <div class="w-cats">${CATS.map((c) => `<a class="w-cat" href="#/category/${c.id}"><span class="w-cat-ic">${svg(c.icon)}</span><b>${esc(c[lang])}</b><small>${t('items_count', { n: count(c.id) })}</small></a>`).join('')}
        <a class="w-cat" href="#/items"><span class="w-cat-ic">${svg('grid')}</span><b>${t('all_items')}</b><small>${t('items_count', { n: W.items.length })}</small></a></div>
      <div class="section-title">${t('guides')}</div>
      <div class="w-guides">${W.guides.map((g, i) => `<a class="w-guide" href="#/guides/${g.slug}"><span class="w-guide-n">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(L(g).title)}</b><small>${esc(L(g).description)}</small></span></a>`).join('')}
        <a class="w-guide" href="#/faq"><span class="w-guide-n">?</span><span><b>FAQ</b><small>${t('faq_desc')}</small></span></a></div>`;
  }

  const filt = { q: '', type: '', craft: false, bp: false, bench: false, sort: 'name' };
  function itemCard(it) {
    if (!it) return '';
    const marks = [];
    if (it.blueprint !== undefined) marks.push(`<span class="m bp" title="${esc(t('bp_tip'))}">${svg('scroll')}BP</span>`);
    if (it.bench) marks.push(`<span class="m bench" title="${esc(t('bench_tip'))}">${svg('hammer')}</span>`);
    return `<a class="item-card" href="#/items/${it.id}">${iconOf(it)}<span class="ic-txt"><b>${esc(name(it))}</b><small>${esc(typeName(it.type))}</small></span>${marks.length ? `<span class="tags">${marks.join('')}</span>` : ''}</a>`;
  }
  function pageList(catId) {
    const cat = CATS.find((c) => c.id === catId);
    const base = W.items.filter((i) => !catId || i.cat === catId);
    const types = [...new Set(base.map((i) => i.type))].sort((a, b) => typeName(a).localeCompare(typeName(b)));
    if (filt.type && !types.includes(filt.type)) filt.type = '';
    const title = cat ? cat[lang] : t('items_title');
    const tab = (href, label, on) => `<a href="${href}" class="${on ? 'on' : ''}">${esc(label)}</a>`;
    const html = `${crumbs(cat ? [['Wiki', '#/wiki'], [t('items_title'), '#/items'], [title]] : [['Wiki', '#/wiki'], [title]])}
      <h1 class="page-title">${esc(title)}</h1>
      <nav class="w-tabs" aria-label="${t('categories')}">${tab('#/items', t('all_items'), !catId)}${CATS.map((c) => tab('#/category/' + c.id, c[lang], c.id === catId)).join('')}</nav>
      <div class="w-filters">
        <label class="w-q">${svg('search')}<input type="search" id="fq" placeholder="${t('filter_here')}" value="${esc(filt.q)}" autocomplete="off"></label>
        <div class="w-toggles">
          <button type="button" class="chip ${filt.craft ? 'on' : ''}" data-f="craft" aria-pressed="${filt.craft}">${t('craftable')}</button>
          <button type="button" class="chip ${filt.bp ? 'on' : ''}" data-f="bp" aria-pressed="${filt.bp}">${t('has_bp')}</button>
          <button type="button" class="chip ${filt.bench ? 'on' : ''}" data-f="bench" aria-pressed="${filt.bench}">${t('workbench')}</button>
          <select id="fsort" aria-label="${t('sort')}"><option value="name">${t('sort_name')}</option><option value="level" ${filt.sort === 'level' ? 'selected' : ''}>${t('sort_level')}</option></select>
        </div>
        ${types.length > 1 ? `<div class="w-types">${[['', t('all_types')], ...types.map((ty) => [ty, typeName(ty)])].map(([v, l]) => `<button type="button" class="chip type ${filt.type === v ? 'on' : ''}" data-type="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="w-meta"><div class="count" id="fcount" aria-live="polite"></div>
        <div class="w-legend"><span><span class="m bp">${svg('scroll')}BP</span> ${t('legend_bp')}</span><span><span class="m bench">${svg('hammer')}</span> ${t('legend_bench')}</span></div></div>
      <div class="item-grid" id="flist"></div>`;
    setTimeout(() => {
      const draw = () => {
        const q = norm(filt.q);
        const list = base.filter((i) => (!q || norm(name(i)).includes(q) || norm(i.name.en).includes(q) || norm(i.name.pt).includes(q) || norm(typeName(i.type)).includes(q))
          && (!filt.type || i.type === filt.type) && (!filt.craft || i.recipe) && (!filt.bp || i.blueprint !== undefined) && (!filt.bench || i.bench))
          .sort(filt.sort === 'level' ? (a, b) => (a.level || 0) - (b.level || 0) || sortByName(a, b) : sortByName);
        $('#fcount').textContent = t('showing', { n: list.length, t: base.length });
        $('#flist').innerHTML = list.length ? list.map(itemCard).join('') : `<div class="empty-state">${t('no_results')}</div>`;
      };
      $('#fq').oninput = (e) => { filt.q = e.target.value; draw(); };
      $('#fsort').onchange = (e) => { filt.sort = e.target.value; draw(); };
      document.querySelectorAll('.w-toggles .chip').forEach((b) => b.onclick = () => {
        const k = b.dataset.f; filt[k] = !filt[k]; b.classList.toggle('on', filt[k]); b.setAttribute('aria-pressed', filt[k]); draw();
      });
      document.querySelectorAll('.w-types .chip').forEach((b) => b.onclick = () => {
        filt.type = b.dataset.type; document.querySelectorAll('.w-types .chip').forEach((x) => x.classList.toggle('on', x === b)); draw();
      });
      const on = $('.w-tabs .on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      draw();
    });
    return html;
  }

  function ingRow(id, qty, extra = '') {
    const it = byId[id];
    return `<div class="ing">${iconOf(it)}<a href="#/items/${id}"><b>${esc(name(it))}</b></a>${extra}<span class="qty">x${qty}</span></div>`;
  }
  function pageItem(id) {
    const it = byId[id];
    if (!it) return `<div class="empty-state">${t('not_found')}</div>`;
    const cat = CATS.find((c) => c.id === it.cat);
    const left = [];
    const right = [];
    const badges = [`<span class="badge type">${esc(typeName(it.type))}</span>`];
    if (it.blueprint) badges.push(`<span class="badge bp" title="${esc(t('bp_tip'))}">${svg('scroll')} ${t('bp_badge', { n: it.blueprint })}</span>`);
    else if (it.blueprint === 0) badges.push(`<span class="badge bp" title="${esc(t('bp_tip'))}">${svg('scroll')} Blueprint · ${t('loot_badge')}</span>`);
    if (it.bench) badges.push(`<span class="badge bench">${svg('hammer')} ${t('bench_badge')}</span>`);

    if (it.weapon) {
      const w = it.weapon;
      left.push(`<div class="section-title">${t('weapon_stats')}</div><div class="box">
        ${w.damage != null ? `<div class="row"><span>${t('damage')} <small class="muted">(${t('damage_hint')})</small></span><b>${w.damage}%</b></div>` : ''}
        <div class="row"><span>${t('range')}</span><b>${w.range} m</b></div>
        ${w.mag ? `<div class="row"><span>${t('mag')}</span><b>${w.mag}</b></div>` : ''}
        ${w.ammo ? `<div class="row" style="border:0;padding-bottom:6px"><span>${t('ammo')}</span></div><div class="ammo-card">${itemCard(byId[w.ammo])}</div>` : ''}
      </div>`);
    }
    if (it.recipe) {
      const foot = [`<span>${svg('hammer')} ${it.bench ? t('needs_bench') : t('anywhere')}</span>`];
      if (it.level) foot.push(`<span>${svg('star')} ${t('level', { n: it.level })}</span><span class="vip">${t('vip_level', { n: Math.floor(it.level * 0.75) })}</span>`);
      if (it.receive) foot.push(`<span>${t('receive')}: <b>x${it.receive}</b></span>`);
      left.push(`<div class="section-title">${t('recipe')}</div><div class="box">${it.recipe.map((r) => ingRow(r.id, r.qty)).join('')}<div class="box-foot">${foot.join('')}</div></div>`);
      if (it.blueprint !== undefined) left.push(`<div class="bp-note">${svg('scroll')}<div><b>Blueprint</b><p>${t(it.blueprint ? 'bp_explain' : 'bp_explain_loot')}</p><a href="#/guides/loot-crafting-and-blueprints">${t('bp_how')} ${svg('chevron')}</a></div></div>`);
    }
    if (it.ammoFor) left.push(`<div class="section-title">${t('compatible')}</div><div class="item-grid">${it.ammoFor.map((x) => itemCard(byId[x])).join('')}</div>`);
    if (it.usedIn) left.push(`<div class="section-title">${t('used_in')}</div><div class="item-grid">${it.usedIn.map((x) => itemCard(byId[x])).filter(Boolean).join('')}</div>`);

    const props = [`<div class="row"><span>${t('type')}</span><b>${esc(typeName(it.type))}</b></div>`];
    if (it.stack) props.push(`<div class="row"><span>${t('stack')}</span><b>${it.stack}</b></div>`);
    if (it.recipe) props.push(`<div class="row"><span>${t('bench_req')}</span><b>${it.bench ? t('yes') : t('no')}</b></div>`);
    if (it.level) props.push(`<div class="row"><span>${t('level_req')}</span><b>Lv. ${it.level} <small class="muted">(Legendary ${Math.floor(it.level * 0.75)})</small></b></div>`);
    if (it.blueprint !== undefined) props.push(`<div class="row"><span>${t('blueprint')}</span><b class="blue">${it.blueprint ? t('bp_cost', { n: it.blueprint }) : t('bp_loot')}</b></div>`);
    if (it.hp) props.push(`<div class="row"><span>${t('health')}</span><b>${it.hp}</b></div>`);
    if (it.slots) props.push(`<div class="row"><span>${t('slots')}</span><b>${it.slots}</b></div>`);
    if (it.limit) props.push(`<div class="row"><span>${t('limit')}</span><b>${esc(L(it.limit))}</b></div>`);
    if (it.upgradeTo) props.push(`<div class="row"><span>${t('upgrade')}</span><b><a class="accent" href="#/items/${it.upgradeTo}">${esc(name(byId[it.upgradeTo]))}</a></b></div>`);
    right.push(`<div class="box"><h3>${t('properties')}</h3>${props.join('')}</div>`);

    const ob = [];
    if (it.recipe) ob.push(`<div class="obtain">${svg('hammer')}${t('obtain_craft')}</div>`);
    W.items.filter((x) => x.furnace && x.furnace.to === it.id).forEach((x) => ob.push(`<div class="obtain">${svg('flame')}${t('obtain_furnace')}: <a href="#/items/${x.id}"><b>${esc(name(x))}</b></a></div>`));
    if (W.items.some((x) => (x.recycler || []).some((r) => r.id === it.id))) ob.push(`<div class="obtain">${svg('recycle')}${t('obtain_recycler')}</div>`);
    (it.sources || []).forEach((s) => ob.push(`<div class="obtain">${svg(SRC_ICON[s] || 'box')}${esc(SOURCES[s] ? SOURCES[s][lang === 'pt' ? 1 : 0] : s)}</div>`));
    if (ob.length) right.push(`<div class="box"><h3>${t('how_obtain')}</h3>${ob.join('')}</div>`);
    if (it.furnace) right.push(`<div class="box"><h3>${t('furnace')}</h3>${ingRow(it.furnace.to, 1)}<div class="box-foot"><span>${svg('clock')} ${t('speed')}: ${T[lang].speeds[it.furnace.speed]}</span></div></div>`);
    if (it.recycler) right.push(`<div class="box"><h3>${t('recycler')}</h3>${it.recycler.map((r) => ingRow(r.id, r.qty)).join('')}</div>`);

    const related = W.items.filter((x) => x.id !== it.id && x.type === it.type && (!it.piece || x.piece === it.piece || x.tier === it.tier)).sort(sortByName).slice(0, 6);

    return `${crumbs([['Wiki', '#/wiki'], [cat ? cat[lang] : t('items_title'), cat ? '#/category/' + cat.id : '#/items'], [name(it)]])}
      <div class="item-head">${iconOf(it)}<div><h1>${esc(name(it))}</h1><div class="badges">${badges.join('')}</div><p>${esc(L(it.desc))}</p></div></div>
      <div class="cols"><div>${left.join('') || ''}</div><div style="margin-top:34px">${right.join('')}</div></div>
      ${related.length ? `<div class="section-title" style="margin-top:44px">${t('related')}</div><div class="item-grid">${related.map(itemCard).join('')}</div>` : ''}`;
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
    return esc(s).replace(/\*\*(.+?)\*\*/g, (m, txt) => { const id = itemByName(txt); return id ? `<a class="item-link" href="#/items/${id}"><strong>${txt}</strong></a>` : `<strong>${txt}</strong>`; }).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  }
  // aceita o ID puro ou qualquer link do YouTube (watch, youtu.be, shorts, embed)
  function youtubeId(v) {
    if (!v) return '';
    const m = String(v).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/) || String(v).match(/^([\w-]{11})$/);
    return m ? m[1] : '';
  }
  function media(kind, id, caption) {
    const soon = `<div class="soon"><div>${svg(kind === 'video' ? 'video' : 'image')}<b>${t(kind === 'video' ? 'soon_video' : 'soon_shot')}</b>${esc(caption)}<br><code>media/${id}.${kind === 'video' ? 'mp4' : 'webp'}</code></div></div>`;
    // vídeo no YouTube: o link vai em config.js (HAVOK.youtube), pelo nome da mídia (serve até no lugar de um print)
    const yt = youtubeId(((window.HAVOK || {}).youtube || {})[id]);
    if (yt) {
      return `<figure class="media"><div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${esc(caption)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    // "GIF": mp4 mudo, em loop, sem controles (no lugar de um print ou de um vídeo)
    if (((window.HAVOK || {}).loops || []).includes(id)) {
      return `<figure class="media"><video class="loop" autoplay muted loop playsinline preload="auto" aria-label="${esc(caption)}"><source src="media/${id}.webm" type="video/webm"><source src="media/${id}.mp4" type="video/mp4"></video><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    if (kind === 'video') {
      return `<figure class="media"><video src="media/${id}.mp4" autoplay muted loop playsinline preload="metadata" onerror="this.outerHTML=this.nextElementSibling.innerHTML"></video><template>${soon}</template><figcaption>${esc(caption)}</figcaption></figure>`;
    }
    return `<figure class="media shot"><img src="media/${id}.webp" alt="${esc(caption)}" loading="lazy" data-alt="png,jpg" onerror="havokImgFallback(this)"><template>${soon}</template><figcaption>${esc(caption)}</figcaption></figure>`;
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
      if ((m = l.match(/^(#{2,3}) (.+)$/))) { flush(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
      if (l.startsWith('|')) { flushP(); flushL(); (table = table || []).push(l); continue; }
      if ((m = l.match(/^- (.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ul') { flushL(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^\d+\. (.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ol') { flushL(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushL(); flushT(); para.push(l);
    }
    flush();
    return html;
  }

  function pageGuides() {
    return `${crumbs([['Wiki', '#/wiki'], [t('guides')]])}<h1 class="page-title">${t('guides')}</h1><p class="page-sub">${t('guides_desc')}</p>
      <div class="grid">${W.guides.map((g) => `<a class="tile tall" href="#/guides/${g.slug}"><span class="tile-ic">${svg(g.icon)}</span><span><b>${esc(L(g).title)}</b><small>${esc(L(g).description)}</small></span></a>`).join('')}</div>`;
  }
  function pageGuide(slug) {
    const i = W.guides.findIndex((g) => g.slug === slug);
    if (i < 0) return `<div class="empty-state">404</div>`;
    const g = W.guides[i], c = L(g), prev = W.guides[i - 1], next = W.guides[i + 1];
    return `${crumbs([['Wiki', '#/wiki'], [t('guides'), '#/guides'], [c.title]])}
      <h1 class="page-title">${esc(c.title)}</h1><p class="page-sub">${esc(c.description)}</p>
      <article class="prose">${md(c.body)}</article>
      <div class="pager">${prev ? `<a href="#/guides/${prev.slug}"><small>${t('prev')}</small><b>${esc(L(prev).title)}</b></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/guides/${next.slug}"><small>${t('next')}</small><b>${esc(L(next).title)}</b></a>` : ''}</div>`;
  }
  function pageFaq() {
    const list = W.faq[lang] || W.faq.en;
    return `${crumbs([['Wiki', '#/wiki'], ['FAQ']])}<h1 class="page-title">FAQ</h1><p class="page-sub">${t('faq_desc')}</p>
      <div class="faq">${list.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  }
  function pageMedia() {
    return `${crumbs([['Wiki', '#/wiki'], [t('media_title')]])}<h1 class="page-title">${t('media_title')}</h1><p class="page-sub">${t('media_desc')}</p>
      <div class="box">${W.media.map((m) => `<div class="obtain">${svg(m.kind === 'video' ? 'video' : 'image')}<code>media/${m.id}.${m.kind === 'video' ? 'mp4' : 'webp'}</code><span class="muted">— ${esc(m.caption)}</span><a href="#/guides/${m.guide}" style="margin-left:auto" class="muted">${esc(m.guide)}</a></div>`).join('')}</div>`;
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

  // ---------------------------------------------------------------- home (pré-lançamento)
  // A página inicial gira em torno da inauguração: contador real da lista de espera (worker/waitlist.js,
  // que conta o cargo "Waiting List" no Discord), como o jogo funciona, como participar e dúvidas.
  // Loja e VIP ficam fora deste fluxo de propósito.
  const LT = {
    en: {
      eyebrow: 'MTA: San Andreas · Rust survival · Pre-launch',
      h1a: 'SURVIVE', h1b: 'THE FIRST DAY.',
      sub: 'HAVOK opens its doors once {n} survivors are on the waiting list. Join now and get the launch date first, on Discord.',
      wl: 'Waiting list', wl_of: 'of {n} survivors', wl_join: 'Join the waiting list', wl_note: 'Free · Through Discord · PC',
      wl_left: '{n} spots to go until the launch is scheduled.', wl_left1: '1 spot to go until the launch is scheduled.',
      wl_full: 'Goal reached! The launch date is coming on Discord.', wl_err: 'Counter unavailable right now.', wl_load: 'Checking the list...',
      wiki: 'Explore the wiki', scroll: 'How it works',
      how: 'How it works', how_h: 'You start with nothing. Everything else is earned.',
      loop: [
        ['spawn', 'Wake up', 'You spawn with almost nothing. Every survivor starts the same way.', 'getting-started'],
        ['gather-tools', 'Gather', 'Hit trees, rocks and ore nodes. Better tools, faster farming.', 'resource-gathering'],
        ['first-house', 'Build', 'Foundation, walls, door and a Wardrobe to keep your base standing.', 'base-building'],
        ['vehicles', 'Explore', 'Fix up cars, loot military zones and fight for airdrops.', 'world-and-events'],
        ['pvp', 'Fight', 'Take on other players and shoot down the patrol helicopter for its loot.', 'combat-raiding-and-recovery'],
      ],
      join: 'How to join the launch', join_h: 'Three steps. Less than a minute.',
      steps: [
        ['Enter the Discord', 'Use the button below. It is free and takes a few seconds.'],
        ['Pick the waiting list', 'In the welcome questions, choose the waiting list option. You get the Waiting List role and count on this page.'],
        ['Wait for the call', 'When the bar fills up, the launch date is announced and everyone on the list gets pinged.'],
      ],
      faq: 'Questions', faqs: [
        ['Do I have to pay to play?', 'No. The server is free. You only need GTA San Andreas for PC and Multi Theft Auto (MTA:SA), which is also free.'],
        ['When does the server open?', 'When the waiting list reaches {n} survivors, the date is announced on Discord. The more people join, the sooner it opens.'],
        ['Is it like Rust?', 'The loop is: gather, craft, build a base, protect it and raid others. Everything happens on the San Andreas map, with its own mechanics.'],
        ['Can I play with friends?', 'Yes. Groups have up to 8 members, with their own tag, emblem and color, plus a group ranking.'],
        ['Does it run on a weak PC?', 'MTA runs on modest hardware. The server interface was built to stay light.'],
      ],
      cd_launch: 'Server launch in', cd_wipe: 'Next wipe in', cd_pvp: 'INSANE PvP: weapons in every barrel until the wipe', cd_every: 'Full wipe every {n} days',
      news: 'Latest changes', all_news: 'Show older changes', social: 'Follow HAVOK', social_sub: 'Clips, updates and the launch countdown.',
    },
    pt: {
      eyebrow: 'MTA: San Andreas · Rust survival · Pré-lançamento',
      h1a: 'SOBREVIVA', h1b: 'AO PRIMEIRO DIA.',
      sub: 'O HAVOK abre as portas quando {n} sobreviventes estiverem na lista de espera. Entre agora e saiba a data antes de todo mundo, no Discord.',
      wl: 'Lista de espera', wl_of: 'de {n} sobreviventes', wl_join: 'Entrar na lista de espera', wl_note: 'Grátis · Pelo Discord · PC',
      wl_left: 'Faltam {n} vagas para marcar a inauguração.', wl_left1: 'Falta 1 vaga para marcar a inauguração.',
      wl_full: 'Meta batida! A data da inauguração sai no Discord.', wl_err: 'Contador indisponível no momento.', wl_load: 'Conferindo a lista...',
      wiki: 'Conhecer a wiki', scroll: 'Como funciona',
      how: 'Como funciona', how_h: 'Você começa sem nada. Todo o resto é conquistado.',
      loop: [
        ['spawn', 'Acorde', 'Você nasce quase sem nada. Todo sobrevivente começa igual.', 'getting-started'],
        ['gather-tools', 'Colete', 'Bata em árvores, pedras e minérios. Ferramenta melhor, coleta mais rápida.', 'resource-gathering'],
        ['first-house', 'Construa', 'Fundação, paredes, porta e um Armário para manter a base de pé.', 'base-building'],
        ['vehicles', 'Explore', 'Monte carros, saqueie zonas militares e dispute airdrops.', 'world-and-events'],
        ['pvp', 'Lute', 'Enfrente outros jogadores e derrube o helicóptero de patrulha para pegar o loot.', 'combat-raiding-and-recovery'],
      ],
      join: 'Como participar da inauguração', join_h: 'Três passos. Menos de um minuto.',
      steps: [
        ['Entre no Discord', 'Use o botão abaixo. É grátis e leva poucos segundos.'],
        ['Escolha a lista de espera', 'Nas perguntas de boas-vindas, marque a opção da lista de espera. Você ganha o cargo Waiting List e passa a contar nesta página.'],
        ['Aguarde o chamado', 'Quando a barra encher, a data da inauguração é anunciada e todo mundo da lista é avisado.'],
      ],
      faq: 'Perguntas frequentes', faqs: [
        ['Preciso pagar para jogar?', 'Não. O servidor é gratuito. Você só precisa do GTA San Andreas para PC e do Multi Theft Auto (MTA:SA), que também é grátis.'],
        ['Quando o servidor abre?', 'Quando a lista de espera chegar a {n} sobreviventes, a data sai no Discord. Quanto mais gente entrar, mais cedo abre.'],
        ['É parecido com Rust?', 'O ciclo é: coletar, craftar, construir a base, protegê-la e raidar os outros. Tudo no mapa de San Andreas, com mecânicas próprias.'],
        ['Dá para jogar com amigos?', 'Sim. Grupos têm até 8 membros, com tag, emblema e cor próprios, e um ranking de grupos.'],
        ['Roda em PC fraco?', 'O MTA roda em máquinas modestas. A interface do servidor foi feita para ser leve.'],
      ],
      cd_launch: 'Inauguração em', cd_wipe: 'Próximo wipe em', cd_pvp: 'PvP INSANO: armas em todo barril até o wipe', cd_every: 'Wipe completo a cada {n} dias',
      news: 'Últimas mudanças', all_news: 'Ver mudanças antigas', social: 'Siga o HAVOK', social_sub: 'Clipes, atualizações e a contagem para a inauguração.',
    },
  };
  const lt = (k, vars) => {
    let s = LT[lang][k] ?? LT.en[k] ?? k;
    if (vars && typeof s === 'string') for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return lang === 'pt' ? `${dd}/${m}/${y}` : `${m}/${dd}/${y}`; };
  let newsAll = false;

  // lista de espera: barra com uma marca por vaga (até 60; acima disso 50 marcas proporcionais)
  let wlTimer = null, wlLast = null;
  const WL_EVERY = 30000;
  const wlGoal = () => (wlLast && wlLast.goal) || ((window.HAVOK || {}).waitlist || {}).goal || 30;
  function waitlistCard() {
    const H = window.HAVOK || {}, cfg = H.waitlist || {};
    const goal = wlGoal();
    // até 60 vagas: uma marca por vaga; acima disso, 50 marcas proporcionais (igual ao painel do Discord)
    const nCells = goal <= 60 ? goal : 50;
    const cells = Array.from({ length: nCells }, () => '<i></i>').join('');
    if (cfg.api) setTimeout(() => { if (wlLast) paintWaitlist(wlLast); loadWaitlist(); wlTimer = setInterval(() => { if (!document.hidden) loadWaitlist(); }, WL_EVERY); });
    return `<div class="wl" id="wl" data-state="${cfg.api ? 'loading' : 'error'}">
        <div class="wl-top"><span class="wl-label"><i class="wl-live"></i>${lt('wl')}</span><span class="wl-of">${lt('wl_of', { n: goal })}</span></div>
        <div class="wl-count" aria-live="polite"><b id="wlNum">--</b><span>/${goal}</span></div>
        <div class="wl-cells" style="--cols:${Math.ceil(nCells / 2)};--cols-m:${nCells % 10 ? Math.ceil(nCells / 3) : 10}" id="wlCells" role="progressbar" aria-label="${lt('wl')}" aria-valuemin="0" aria-valuemax="${goal}">${cells}</div>
        <p class="wl-msg" id="wlMsg">${cfg.api ? lt('wl_load') : lt('wl_err')}</p>
        <a class="wl-btn" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')}<span>${lt('wl_join')}</span></a>
        <small class="wl-note">${lt('wl_note')}</small>
      </div>`;
  }
  function paintWaitlist(data) {
    const box = $('#wl');
    if (!box) return;
    const num = $('#wlNum'), msg = $('#wlMsg'), cells = $('#wlCells');
    if (!data) {
      // sem leitura real: nada de número. Se já tinha um na tela, mantém e só avisa.
      if (box.dataset.state !== 'ok') box.dataset.state = 'error';
      msg.textContent = lt('wl_err');
      return;
    }
    const goal = data.goal, n = data.count;
    box.dataset.state = n >= goal ? 'full' : 'ok';
    num.textContent = String(n).padStart(2, '0');
    cells.setAttribute('aria-valuenow', n);
    const total = cells.children.length, lit = total === goal ? n : Math.round((Math.min(n, goal) / goal) * total);
    [...cells.children].forEach((c, i) => { c.classList.toggle('on', i < lit); c.style.transitionDelay = (i * 25) + 'ms'; });
    const left = goal - n;
    msg.textContent = left <= 0 ? lt('wl_full') : left === 1 ? lt('wl_left1') : lt('wl_left', { n: left });
  }
  async function loadWaitlist() {
    const cfg = (window.HAVOK || {}).waitlist || {};
    let data = null;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(cfg.api, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(to);
      const j = r.ok ? await r.json() : null;
      if (j && Number.isInteger(j.count) && j.count >= 0 && Number.isInteger(j.goal) && j.goal > 0) data = j;
    } catch (e) { data = null; }
    if (data) {
      // a meta mudou no Worker: redesenha a barra com o número certo de marcas
      const regoal = wlLast ? wlLast.goal !== data.goal : data.goal !== wlGoal();
      wlLast = data;
      if (regoal && $('#wl')) { route(); return; }
    }
    paintWaitlist(data);
  }

  // contagem: inauguração (antes de wipe.start) ou próximo wipe (a cada wipe.everyDays). Mesma conta do havok_wipe.
  let cdTimer = null;
  function wipeTimes() {
    const w = (window.HAVOK || {}).wipe || {};
    const m = String(w.start || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) return null;
    const start = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5]); // Brasília = UTC-3
    const period = (w.everyDays || 45) * 86400000, now = Date.now();
    if (now < start) return { kind: 'launch', at: start, every: w.everyDays || 45 };
    const at = start + (Math.floor((now - start) / period) + 1) * period;
    return { kind: 'wipe', at, every: w.everyDays || 45, pvp: at - now <= (w.pvpHours || 24) * 3600000 };
  }
  function countdownBox() {
    const w = wipeTimes();
    if (!w) return '';
    const paint = () => {
      const el = $('#cdLeft');
      if (!el) { clearInterval(cdTimer); return; }
      const cur = wipeTimes();
      let s = Math.max(0, Math.floor((cur.at - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const mi = Math.floor(s / 60), se = s % 60;
      const p2 = (n) => String(n).padStart(2, '0');
      el.innerHTML = `<b>${d}</b><i>d</i><b>${p2(h)}</b><i>h</i><b>${p2(mi)}</b><i>m</i><b>${p2(se)}</b><i>s</i>`;
    };
    setTimeout(() => { clearInterval(cdTimer); paint(); cdTimer = setInterval(paint, 1000); });
    return `<div class="cd${w.pvp ? ' pvp' : ''}"><span class="cd-label">${lt(w.kind === 'launch' ? 'cd_launch' : 'cd_wipe')}</span><span class="cd-left" id="cdLeft"></span>
      <small>${w.pvp ? lt('cd_pvp') : lt('cd_every', { n: w.every })}</small></div>`;
  }

  function pageLanding() {
    const H = window.HAVOK || {};
    const so = Object.assign({ discord: H.discord }, H.socials || {});
    const goal = wlGoal();
    const news = (window.HAVOK_NEWS || []);
    const shown = newsAll ? news : news.slice(0, 2);
    const loop = (id) => `<video muted loop playsinline preload="none" aria-hidden="true"><source src="media/${id}.webm" type="video/webm"><source src="media/${id}.mp4" type="video/mp4"></video>`;
    setTimeout(() => {
      // os vídeos só tocam quando aparecem na tela (economiza banda e CPU)
      const vids = document.querySelectorAll('.l-step video');
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.3 });
        vids.forEach((v) => io.observe(v));
      }
      const more = $('#newsMore');
      if (more) more.onclick = () => { newsAll = true; route(); };
      // âncora sem mexer no hash (o hash é a rota)
      const go = $('#toHow');
      if (go) go.onclick = () => $('#how').scrollIntoView({ behavior: 'smooth' });
    });
    return `<section class="l-hero">
        <video class="l-hero-bg" autoplay muted loop playsinline preload="auto" poster="media/hero.webp" aria-hidden="true"><source src="media/hero.webm" type="video/webm"><source src="media/hero.mp4" type="video/mp4"></video>
        <div class="l-hero-in">
          <div class="l-copy">
            <img class="l-logo" src="logo-text.png" alt="HAVOK" width="560" height="140">
            <p class="l-eyebrow">${lt('eyebrow')}</p>
            <h1 class="l-h1"><span>${lt('h1a')}</span> <span class="hot">${lt('h1b')}</span></h1>
            <p class="l-sub">${lt('sub', { n: goal })}</p>
            ${countdownBox()}
            <div class="l-links"><a href="#/wiki">${svg('book')} ${lt('wiki')}</a><button type="button" id="toHow">${svg('chevron')} ${lt('scroll')}</button></div>
          </div>
          ${waitlistCard()}
        </div>
      </section>
      <div class="l-body">
        <section class="l-sec" id="how">
          <p class="l-kicker">01 · ${lt('how')}</p>
          <h2 class="l-h2">${lt('how_h')}</h2>
          <div class="l-loop">${lt('loop').map(([id, title, desc, guide], i) => `<a class="l-step" href="#/guides/${guide}">
              <div class="l-step-media">${loop(id)}<span class="l-step-n">${String(i + 1).padStart(2, '0')}</span></div>
              <b>${esc(title)}</b><small>${esc(desc)}</small></a>`).join('')}</div>
        </section>

        <section class="l-sec l-join">
          <div>
            <p class="l-kicker">02 · ${lt('join')}</p>
            <h2 class="l-h2">${lt('join_h')}</h2>
            <ol class="l-steps">${lt('steps').map(([title, desc]) => `<li><b>${esc(title)}</b><span>${esc(desc)}</span></li>`).join('')}</ol>
            <a class="wl-btn inline" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')}<span>${lt('wl_join')}</span></a>
          </div>
        </section>

        <section class="l-sec">
          <p class="l-kicker">03 · ${lt('faq')}</p>
          <div class="faq l-faq">${lt('faqs').map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('{n}', goal))}</p></details>`).join('')}</div>
        </section>

        ${news.length ? `<section class="l-sec">
          <p class="l-kicker">${lt('news')}</p>
          <div class="l-news">${shown.map((n) => `<article class="l-post">
              <header><time datetime="${n.date}">${fmtDate(n.date)}</time><h3>${esc(n.title[lang] || n.title.en)}</h3></header>
              <ul>${n.items.map((i) => `<li><span class="tag ${i.tag}">${esc(T[lang].tags[i.tag] || i.tag)}</span><span>${esc(i[lang] || i.en)}</span></li>`).join('')}</ul>
            </article>`).join('')}
            ${news.length > shown.length ? `<button class="l-more" id="newsMore">${lt('all_news')}</button>` : ''}</div>
        </section>` : ''}

        <div class="l-social">
          <div><h2>${lt('social')}</h2><p>${lt('social_sub')}</p></div>
          <div class="l-social-links">${[['discord', 'Discord'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['instagram', 'Instagram']].filter(([k]) => so[k]).map(([k, n]) => `<a class="l-soc ${k}" href="${esc(so[k])}" target="_blank" rel="noopener">${svg(k)}<span>${n}</span></a>`).join('')}</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- plano de mídias + roteiro de teste
  // Página de trabalho da equipe (fora do menu): lê o MIDIAS.md, então editar o arquivo atualiza a página.
  // "- [ ] tarefa" vira uma caixinha; o que foi marcado fica salvo só neste navegador.
  function pagePlan() {
    setTimeout(async () => {
      const box = $('#plan');
      if (!box) return;
      let src = '';
      try {
        const r = await fetch('MIDIAS.md', { cache: 'no-cache' });
        src = r.ok ? await r.text() : '';
      } catch (e) { src = ''; }
      if (!src) { box.innerHTML = '<p class="muted">Não consegui carregar o MIDIAS.md.</p>'; return; }
      const title = (src.match(/^# (.+)$/m) || [])[1] || 'Plano';
      src = src.replace(/^# .+$/m, '').replace(/^---$/gm, '@@HR@@');
      box.innerHTML = `<h1 class="page-title">${esc(title)}</h1>` + md(src).replace(/<p>@@HR@@<\/p>/g, '<hr class="plan-hr">');
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('havok:plan') || '{}'); } catch (e) { saved = {}; }
      box.querySelectorAll('li').forEach((li) => {
        const m = li.innerHTML.match(/^\[( |x)\] ?([\s\S]*)$/i);
        if (!m) return;
        const key = li.textContent.replace(/^\[( |x)\] ?/i, '').trim();
        const done = key in saved ? saved[key] : m[1].toLowerCase() === 'x';
        li.classList.add('check');
        li.innerHTML = `<label><input type="checkbox" ${done ? 'checked' : ''}><span>${m[2]}</span></label>`;
        li.querySelector('input').onchange = (e) => {
          saved[key] = e.target.checked;
          try { localStorage.setItem('havok:plan', JSON.stringify(saved)); } catch (err) { /* sem storage: só não lembra */ }
        };
      });
    });
    return `${crumbs([['Wiki', '#/wiki'], ['Plano']])}<div id="plan" class="prose plan"><p class="muted">Carregando...</p></div>`;
  }

  // ---------------------------------------------------------------- router
  function route() {
    clearInterval(wlTimer);
    const h = (location.hash || '#/').slice(1) || '/';
    const parts = h.split('/').filter(Boolean);
    let html;
    const landing = !parts.length;
    document.body.classList.toggle('landing', landing);
    document.body.classList.toggle('standalone', parts[0] === 'store');
    if (landing) html = pageLanding();
    else if (parts[0] === 'wiki') html = pageHome();
    else if (parts[0] === 'items' && parts[1]) html = pageItem(parts[1]);
    else if (parts[0] === 'items') html = pageList(null);
    else if (parts[0] === 'category') html = pageList(parts[1]);
    else if (parts[0] === 'guides' && parts[1]) html = pageGuide(parts[1]);
    else if (parts[0] === 'guides') html = pageGuides();
    else if (parts[0] === 'faq') html = pageFaq();
    else if (parts[0] === 'media') html = pageMedia();
    else if (parts[0] === 'plano' || parts[0] === 'plan') html = pagePlan();
    else if (parts[0] === 'store') html = pageStore();
    else html = pageHome();
    $('#main').innerHTML = html;
    renderSide(h.startsWith('/items/') ? '/category/' + (byId[parts[1]] || {}).cat : h);
    $('#sidebar').classList.remove('open');
    document.querySelectorAll('.topnav a').forEach((x) => x.classList.toggle('on', x.dataset.nav === (landing ? 'home' : parts[0] === 'store' ? 'store' : 'wiki')));
    const it = parts[0] === 'items' && byId[parts[1]];
    document.title = landing ? 'HAVOK — Rust Survival' : (it ? name(it) + ' — ' : '') + 'HAVOK Wiki';
    window.scrollTo(0, 0);
  }

  function applyLang() {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    $('#search').placeholder = t('search');
    $('#searchBtn').setAttribute('aria-label', t('open_search'));
    document.querySelectorAll('[data-discord]').forEach((x) => { x.href = (window.HAVOK || {}).discord || '#'; });
  }
  document.querySelectorAll('#lang button').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('havok-lang', lang); } catch (e) { /* sem storage */ }
    applyLang();
    route();
  }));
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

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
    const rows = hits.map((i) => `<a href="#/items/${i.id}">${iconOf(i)}<span>${esc(name(i))}<small>${esc(typeName(i.type))}</small></span></a>`)
      .concat(guides.map((g) => `<a href="#/guides/${g.slug}"><span class="ic">${svg(g.icon)}</span><span>${esc(L(g).title)}<small>${t('guides')}</small></span></a>`));
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
      location.hash = links[sel].getAttribute('href');
      sIn.value = ''; sRes.classList.remove('open'); sIn.blur();
    } else if (e.key === 'Escape') { sRes.classList.remove('open'); sIn.blur(); }
  });
  sRes.addEventListener('click', () => { sIn.value = ''; sRes.classList.remove('open'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) sRes.classList.remove('open'); });
  // no celular a busca mora no menu lateral: abre o menu e já foca o campo
  function openSearch() {
    if (window.matchMedia('(max-width: 860px)').matches) $('#sidebar').classList.add('open');
    else if (document.body.classList.contains('landing')) { location.hash = '#/wiki'; setTimeout(() => sIn.focus(), 60); return; }
    sIn.focus(); sIn.select();
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  });
  $('#searchBtn').addEventListener('click', openSearch);

  window.addEventListener('hashchange', route);
  applyLang();
  route();
})();
