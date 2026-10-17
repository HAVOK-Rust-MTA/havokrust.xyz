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
      wiki_title: 'Game Wiki', wiki_sub: 'Complete game reference for HAVOK — Rust Survival', categories: 'Categories', systems: 'Systems', guides: 'Guides',
      items_count: '{n} items', items_title: 'Items', items_desc: 'Browse every item in the game', showing: 'Showing {n} of {t} items',
      no_results: 'No items found', all_types: 'All types', craftable: 'Craftable', has_bp: 'Needs Blueprint', workbench: 'Workbench',
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
      bp_badge: 'Blueprint: {n} Scrap', loot_badge: 'Loot only', bench_badge: 'Workbench',
      speeds: { fast: 'Fast', medium: 'Medium', slow: 'Slow', 'very-slow': 'Very slow' },
      nav_badges: 'Badges', nav_store: 'Store', nav_play: 'Play', badges_desc: 'Collectible badges earned through gameplay, community contributions, and special events.',
      all_categories: 'All categories', all_rarities: 'All rarities', showing_badges: 'Showing {n} of {t} badges',
      store_h1a: 'PLAY WITH', store_h1b: 'PRESENCE.', store_sub: 'Three plans, from more XP to a legendary base — support HAVOK and survive in style.',
      store_t1: 'Tied to your account', store_t2: 'Activated by the staff', store_t3: 'Day, month or permanent',
      store_perks: 'Everything you get', store_compare: 'Compare', perk: 'Perk', player: 'Player', store_plans: 'Plans',
      cmp_inv: 'Inventory slots', cmp_base: 'Base piece limit', cmp_upkeep: 'Upkeep cost', cmp_respawn: 'Choose respawn region',
      plan_day: 'Days', plan_day_d: 'Try it out — from 1 day.', plan_month: 'Months', plan_month_d: 'The best value for regular players.', plan_perm: 'Permanent', plan_perm_d: 'VIP forever, no renewals.', popular: 'Most popular',
      tier_survivor: 'Survivor', tier_veteran: 'Veteran', tier_legendary: 'Legendary',
      tier_survivor_d: 'Start supporting: more XP, a bigger backpack and a spare sleeping bag.', tier_veteran_d: 'Base perks: half the upkeep, faster respawns and the [VIP] tag.', tier_legendary_d: 'Everything, plus cheaper crafting, starter tools and the gold frame.',
      store_get: 'Get on Discord', cmp_xp: 'XP boost', cmp_slot: 'Reserved slot', cmp_beds: 'Sleeping bags', cmp_bedtime: 'Sleeping bag cooldown', cmp_tools: 'Hatchet + pickaxe on respawn', cmp_craft: 'Crafting cost',
      store_base_note: '* Normal players unlock up to 50 pieces as they level up (15 + level). Veteran gets 50 right away, Legendary 65. You always need a Wardrobe.',
      store_cta: 'Get VIP on Discord', store_fine: 'Open a ticket on our Discord to buy. Type /vip in game to see how much time you have left. Being VIP does not exempt anyone from the rules.',
      discord: 'Discord', featured: 'Tutorial #1 — HUD & interface', nav_home: 'Home',
      l_h1a: 'SURVIVE.', l_h1b: 'BUILD.', l_h1c: 'RAID.', l_sub: 'Rust survival on the streets of San Andreas. Wake up with nothing, farm, craft, build your base and fight for everything you own.',
      wl_title: 'Waiting list', wl_join: 'Join the waiting list', wl_note: 'Free • Through Discord • PC', wl_goal: 'We are gathering the first {n} survivors to schedule the server launch.', wl_full: 'Goal reached! The launch date will be announced on Discord.', wl_err: 'Counter unavailable right now.', wl_load: 'Loading...',
      l_play: 'Play now', l_wiki: 'Open the wiki', l_feat: 'What awaits you', l_new: 'New to the server?', l_new_sub: 'Your first 10 minutes, step by step: from waking up with nothing to your first safe box.',
      l_new_btn: 'Read the starter guide', l_steps: ['Break barrels and hit trees and rocks', 'Craft a hatchet and a pickaxe', 'Build a small house with a Wardrobe inside'],
      l_media: 'See the game', l_news: 'News', l_social: 'Follow HAVOK', l_social_sub: 'Clips, updates and events first-hand.', l_all_news: 'Show older news',
      tags: { new: 'New', fix: 'Fix', balance: 'Balance', event: 'Event' },
      feats: [['pickaxe', 'Farm', 'Trees, rocks and ore nodes all over the map.', 'resource-gathering'], ['hammer', 'Craft', 'Over 100 recipes, blueprints and a research table.', 'loot-crafting-and-blueprints'], ['building', 'Build', 'Bases piece by piece, upgraded from twig to armored.', 'base-building'], ['crosshair', 'Raid', 'C4, rockets and sentries. Nothing is safe offline.', 'combat-raiding-and-recovery'], ['users', 'Groups', 'Up to 8 friends with a tag, emblem and ranking.', 'teams-and-groups'], ['map', 'Events', 'Airdrops, a patrol helicopter, radiation and a military base.', 'world-and-events']],
      media_title: 'Media checklist', media_desc: 'Every video and screenshot the guides are waiting for. Drop the file in media/ with the exact name.',
    },
    pt: {
      nav_wiki: 'Wiki', search: 'Buscar itens...', browse: 'Navegar', guides_h: 'Guias', all_items: 'Todos os Itens', all_guides: 'Todos os Guias',
      wiki_title: 'Wiki do Jogo', wiki_sub: 'Referência completa do HAVOK — Rust Survival', categories: 'Categorias', systems: 'Sistemas', guides: 'Guias',
      items_count: '{n} itens', items_title: 'Itens', items_desc: 'Navegue por todos os itens do jogo', showing: 'Mostrando {n} de {t} itens',
      no_results: 'Nenhum item encontrado', all_types: 'Todos os tipos', craftable: 'Fabricável', has_bp: 'Precisa de Blueprint', workbench: 'Bancada',
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
      bp_badge: 'Blueprint: {n} de Sucata', loot_badge: 'Só no loot', bench_badge: 'Bancada',
      speeds: { fast: 'Rápida', medium: 'Média', slow: 'Lenta', 'very-slow': 'Muito lenta' },
      nav_badges: 'Badges', nav_store: 'Loja', nav_play: 'Jogar', badges_desc: 'Badges colecionáveis conquistadas jogando, ajudando a comunidade e em eventos especiais.',
      all_categories: 'Todas as categorias', all_rarities: 'Todas as raridades', showing_badges: 'Mostrando {n} de {t} badges',
      store_h1a: 'JOGUE COM', store_h1b: 'PRESENÇA.', store_sub: 'Três planos, de mais XP até uma base lendária — apoie o HAVOK e sobreviva com estilo.',
      store_t1: 'Vinculado à sua conta', store_t2: 'Ativado pela staff', store_t3: 'Dias, meses ou permanente',
      store_perks: 'Tudo que você ganha', store_compare: 'Compare', perk: 'Vantagem', player: 'Jogador', store_plans: 'Planos',
      cmp_inv: 'Slots no inventário', cmp_base: 'Limite de peças da base', cmp_upkeep: 'Custo do upkeep', cmp_respawn: 'Escolher região do respawn',
      plan_day: 'Dias', plan_day_d: 'Para experimentar — a partir de 1 dia.', plan_month: 'Meses', plan_month_d: 'O melhor custo para quem joga sempre.', plan_perm: 'Permanente', plan_perm_d: 'VIP para sempre, sem renovar.', popular: 'Mais escolhido',
      tier_survivor: 'Survivor', tier_veteran: 'Veteran', tier_legendary: 'Legendary',
      tier_survivor_d: 'Para começar a apoiar: mais XP, mochila maior e uma cama extra.', tier_veteran_d: 'Vantagens de base: metade do upkeep, respawn mais rápido e tag [VIP].', tier_legendary_d: 'Tudo, mais craft mais barato, ferramentas ao nascer e moldura dourada.',
      store_get: 'Pegar no Discord', cmp_xp: 'Bônus de XP', cmp_slot: 'Vaga reservada', cmp_beds: 'Camas (sleeping bags)', cmp_bedtime: 'Espera da cama', cmp_tools: 'Machado + picareta ao nascer', cmp_craft: 'Custo de craft',
      store_base_note: '* Jogador comum libera até 50 peças subindo de level (15 + level). Veteran já começa com 50, Legendary com 65. O Armário é sempre obrigatório.',
      store_cta: 'Pegar VIP no Discord', store_fine: 'Abra um ticket no nosso Discord para comprar. Digite /vip no jogo para ver quanto tempo falta. Ser VIP não livra ninguém das regras.',
      discord: 'Discord', featured: 'Tutorial #1 — HUD e interface', nav_home: 'Início',
      l_h1a: 'SOBREVIVA.', l_h1b: 'CONSTRUA.', l_h1c: 'RAIDE.', l_sub: 'Sobrevivência no estilo Rust nas ruas de San Andreas. Acorde sem nada, farme, crafte, construa sua base e lute por tudo que é seu.',
      wl_title: 'Lista de espera', wl_join: 'Entrar na lista de espera', wl_note: 'Grátis • Pelo Discord • PC', wl_goal: 'Estamos reunindo os primeiros {n} sobreviventes para marcar a inauguração do servidor.', wl_full: 'Meta batida! A data da inauguração sai no Discord.', wl_err: 'Contador indisponível no momento.', wl_load: 'Carregando...',
      l_play: 'Jogar agora', l_wiki: 'Abrir a wiki', l_feat: 'O que te espera', l_new: 'Novo no servidor?', l_new_sub: 'Seus primeiros 10 minutos, passo a passo: de acordar sem nada até a sua primeira caixa segura.',
      l_new_btn: 'Ler o guia inicial', l_steps: ['Quebre barris e bata em árvores e pedras', 'Crafte um machado e uma picareta', 'Faça uma casinha com um Armário dentro'],
      l_media: 'Veja o jogo', l_news: 'Novidades', l_social: 'Siga o HAVOK', l_social_sub: 'Clipes, atualizações e eventos em primeira mão.', l_all_news: 'Ver novidades antigas',
      tags: { new: 'Novo', fix: 'Correção', balance: 'Ajuste', event: 'Evento' },
      feats: [['pickaxe', 'Farme', 'Árvores, pedras e minérios pelo mapa inteiro.', 'resource-gathering'], ['hammer', 'Crafte', 'Mais de 100 receitas, blueprints e mesa de pesquisa.', 'loot-crafting-and-blueprints'], ['building', 'Construa', 'Bases peça por peça, do palito ao blindado.', 'base-building'], ['crosshair', 'Raide', 'C4, foguetes e sentinelas. Nada fica seguro offline.', 'combat-raiding-and-recovery'], ['users', 'Grupos', 'Até 8 amigos com tag, emblema e ranking.', 'teams-and-groups'], ['map', 'Eventos', 'Airdrops, helicóptero de patrulha, radiação e base militar.', 'world-and-events']],
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
    planter: ['Grown in a Planter', 'Plantado num Canteiro'], fill: ['Fill a canteen at a lake, river, Well or Water Barrel', 'Encha o cantil num lago, rio, Poço ou Barril de Água'],
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
        ${a('#/badges', 'award', t('nav_badges'))}
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
    return `${crumbs([['Wiki', '#/wiki']])}
      <h1 class="page-title">${t('wiki_title')}</h1><p class="page-sub">${t('wiki_sub')}</p>
      ${featuredVideo()}
      <div class="section-title">${t('categories')}</div>
      <div class="grid">${CATS.map((c) => `<a class="tile" href="#/category/${c.id}"><span class="tile-ic">${svg(c.icon)}</span><span><b>${esc(c[lang])}</b><small>${t('items_count', { n: count(c.id) })}</small></span></a>`).join('')}</div>
      <div class="section-title">${t('systems')}</div>
      <div class="grid"><a class="tile tall" href="#/faq"><span class="tile-ic">${svg('help')}</span><span><b>FAQ</b><small>${t('faq_desc')}</small></span></a></div>
      <div class="section-title">${t('guides')}</div>
      <div class="grid">${W.guides.map((g) => `<a class="tile tall" href="#/guides/${g.slug}"><span class="tile-ic">${svg(g.icon)}</span><span><b>${esc(L(g).title)}</b><small>${esc(L(g).description)}</small></span></a>`).join('')}</div>`;
  }

  const filt = { q: '', type: '', craft: false, bp: false, bench: false };
  function itemCard(it) {
    const tags = [];
    if (it.blueprint !== undefined) tags.push(`<span class="dot" title="Blueprint"></span>`);
    return `<a class="item-card" href="#/items/${it.id}">${iconOf(it)}<span><b>${esc(name(it))}</b><small>${esc(typeName(it.type))}</small></span><span class="tags">${tags.join('')}</span></a>`;
  }
  function pageList(catId) {
    const cat = CATS.find((c) => c.id === catId);
    const base = W.items.filter((i) => !catId || i.cat === catId);
    const types = [...new Set(base.map((i) => i.type))];
    const title = cat ? cat[lang] : t('items_title');
    const html = `${crumbs(cat ? [['Wiki', '#/wiki'], [t('items_title'), '#/items'], [title]] : [['Wiki', '#/wiki'], [title]])}
      <h1 class="page-title">${esc(title)}</h1><p class="page-sub">${t('items_desc')}</p>
      <div class="filters">
        <input type="search" id="fq" placeholder="${t('search')}" value="${esc(filt.q)}">
        ${types.length > 1 ? `<select id="ftype"><option value="">${t('all_types')}</option>${types.map((ty) => `<option value="${esc(ty)}" ${filt.type === ty ? 'selected' : ''}>${esc(typeName(ty))}</option>`).join('')}</select>` : ''}
        <label class="chip ${filt.craft ? 'on' : ''}"><input type="checkbox" id="fcraft" ${filt.craft ? 'checked' : ''}>${t('craftable')}</label>
        <label class="chip ${filt.bp ? 'on' : ''}"><input type="checkbox" id="fbp" ${filt.bp ? 'checked' : ''}>${t('has_bp')}</label>
        <label class="chip ${filt.bench ? 'on' : ''}"><input type="checkbox" id="fbench" ${filt.bench ? 'checked' : ''}>${t('workbench')}</label>
      </div>
      <div class="count" id="fcount"></div><div class="item-grid" id="flist"></div>`;
    setTimeout(() => {
      const draw = () => {
        const q = norm(filt.q);
        const list = base.filter((i) => (!q || norm(name(i)).includes(q) || norm(i.name.en).includes(q))
          && (!filt.type || i.type === filt.type) && (!filt.craft || i.recipe) && (!filt.bp || i.blueprint !== undefined) && (!filt.bench || i.bench)).sort(sortByName);
        $('#fcount').textContent = t('showing', { n: list.length, t: base.length });
        $('#flist').innerHTML = list.length ? list.map(itemCard).join('') : `<div class="empty-state">${t('no_results')}</div>`;
      };
      $('#fq').oninput = (e) => { filt.q = e.target.value; draw(); };
      if ($('#ftype')) $('#ftype').onchange = (e) => { filt.type = e.target.value; draw(); };
      [['fcraft', 'craft'], ['fbp', 'bp'], ['fbench', 'bench']].forEach(([id, k]) => {
        $('#' + id).onchange = (e) => { filt[k] = e.target.checked; e.target.parentElement.classList.toggle('on', filt[k]); draw(); };
      });
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
    if (it.blueprint) badges.push(`<span class="badge bp">${t('bp_badge', { n: it.blueprint })}</span>`);
    else if (it.blueprint === 0) badges.push(`<span class="badge bp">Blueprint · ${t('loot_badge')}</span>`);
    if (it.bench) badges.push(`<span class="badge bench">${svg('hammer')} ${t('bench_badge')}</span>`);

    if (it.weapon) {
      const w = it.weapon;
      left.push(`<div class="section-title">${t('weapon_stats')}</div><div class="box">
        <div class="row"><span>${t('damage')} <small class="muted">(${t('damage_hint')})</small></span><b>${w.damage}%</b></div>
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
    }
    if (it.ammoFor) left.push(`<div class="section-title">${t('compatible')}</div><div class="item-grid">${it.ammoFor.map((x) => itemCard(byId[x])).join('')}</div>`);
    if (it.usedIn) left.push(`<div class="section-title">${t('used_in')}</div><div class="item-grid">${it.usedIn.map((x) => itemCard(byId[x])).filter(Boolean).join('')}</div>`);

    const props = [`<div class="row"><span>${t('type')}</span><b>${esc(typeName(it.type))}</b></div>`];
    if (it.stack) props.push(`<div class="row"><span>${t('stack')}</span><b>${it.stack}</b></div>`);
    if (it.recipe) props.push(`<div class="row"><span>${t('bench_req')}</span><b>${it.bench ? t('yes') : t('no')}</b></div>`);
    if (it.level) props.push(`<div class="row"><span>${t('level_req')}</span><b>Lv. ${it.level} <small class="muted">(Legendary ${Math.floor(it.level * 0.75)})</small></b></div>`);
    if (it.blueprint !== undefined) props.push(`<div class="row"><span>${t('blueprint')}</span><b class="gold">${it.blueprint ? t('bp_cost', { n: it.blueprint }) : t('bp_loot')}</b></div>`);
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
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
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

  // ---------------------------------------------------------------- badges
  const RARITY = {
    common: ['Common', 'Comum', '#a8a39d'], uncommon: ['Uncommon', 'Incomum', '#6cc070'], rare: ['Rare', 'Rara', '#5b9dff'],
    epic: ['Epic', 'Épica', '#b36bff'], legendary: ['Legendary', 'Lendária', '#ff8a33'], bronze: ['VIP Bronze', 'VIP Bronze', '#cd7f32'], silver: ['VIP Silver', 'VIP Prata', '#c9ced6'], vip: ['VIP Gold', 'VIP Ouro', '#f5b83d'],
  };
  const BADGE_CATS = { special: ['Special', 'Especial'], community: ['Community', 'Comunidade'], gameplay: ['Gameplay', 'Gameplay'], vip: ['VIP', 'VIP'] };
  const BADGES = [
    { icon: 'flask', rarity: 'rare', cat: 'special', en: ['Beta Tester', 'Played 3+ hours during beta'], pt: ['Beta Tester', 'Jogou 3+ horas durante o beta'] },
    { icon: 'bug', rarity: 'common', cat: 'community', en: ['Bug Reporter', 'Reported a confirmed bug'], pt: ['Caçador de Bug', 'Reportou um bug confirmado'] },
    { icon: 'sword', rarity: 'uncommon', cat: 'gameplay', en: ['First Blood', 'Got the first kill'], pt: ['Primeiro Sangue', 'Conseguiu a primeira kill'] },
    { icon: 'tree', rarity: 'bronze', cat: 'vip', en: ['VIP Survivor', 'Supporter on the Survivor plan.'], pt: ['VIP Survivor', 'Apoiador no plano Survivor.'] },
    { icon: 'shield', rarity: 'silver', cat: 'vip', en: ['VIP Veteran', 'Supporter on the Veteran plan.'], pt: ['VIP Veteran', 'Apoiador no plano Veteran.'] },
    { icon: 'crown', rarity: 'vip', cat: 'vip', en: ['VIP Legendary', 'Supporter on the Legendary plan — keeps HAVOK running.'], pt: ['VIP Legendary', 'Apoiador no plano Legendary — mantém o HAVOK de pé.'] },
    { icon: 'search', rarity: 'rare', cat: 'community', en: ['Bug Hunter', 'Reported 10+ confirmed bugs'], pt: ['Exterminador de Bugs', 'Reportou 10+ bugs confirmados'] },
    { icon: 'rocket', rarity: 'epic', cat: 'special', en: ['Early Adopter', 'Among the first 100 registered survivors'], pt: ['Pioneiro', 'Entre os 100 primeiros sobreviventes registrados'] },
    { icon: 'skull', rarity: 'legendary', cat: 'gameplay', en: ['Serial Killer', 'Reached 1000 kills'], pt: ['Serial Killer', 'Chegou a 1000 kills'] },
    { icon: 'megaphone', rarity: 'uncommon', cat: 'community', en: ['Community Voice', 'Had 5+ suggestions accepted'], pt: ['Voz da Comunidade', 'Teve 5+ sugestões aceitas'] },
    { icon: 'shield', rarity: 'epic', cat: 'special', en: ['Veteran', 'Account older than 1 year'], pt: ['Veterano', 'Conta com mais de 1 ano'] },
  ];
  const bf = { cat: '', rarity: '' };
  function pageBadges() {
    const R = (k) => RARITY[k][lang === 'pt' ? 1 : 0];
    const html = `<div class="hero"><span class="hero-ic">${svg('award')}</span><div><h1 class="page-title">BADGES</h1><p class="page-sub">${t('badges_desc')}</p></div></div>
      <div class="filters">
        <select id="bcat"><option value="">${t('all_categories')}</option>${Object.keys(BADGE_CATS).map((k) => `<option value="${k}" ${bf.cat === k ? 'selected' : ''}>${BADGE_CATS[k][lang === 'pt' ? 1 : 0]}</option>`).join('')}</select>
        <select id="brar"><option value="">${t('all_rarities')}</option>${Object.keys(RARITY).map((k) => `<option value="${k}" ${bf.rarity === k ? 'selected' : ''}>${R(k)}</option>`).join('')}</select>
        <span class="count" id="bcount" style="margin:0 0 0 auto"></span>
      </div>
      <div class="grid" id="blist"></div>`;
    setTimeout(() => {
      const draw = () => {
        const list = BADGES.filter((b) => (!bf.cat || b.cat === bf.cat) && (!bf.rarity || b.rarity === bf.rarity));
        $('#bcount').textContent = t('showing_badges', { n: list.length, t: BADGES.length });
        $('#blist').innerHTML = list.map((b) => {
          const c = RARITY[b.rarity][2], tx = b[lang] || b.en;
          return `<div class="badge-card${b.rarity === 'vip' ? ' gold' : ''}" style="--rc:${c}"><span class="badge-ic">${svg(b.icon)}</span>
            <span class="badge-body"><b>${esc(tx[0])}</b><small>${esc(tx[1])}</small><span class="badge-meta">${svg('folder')} ${BADGE_CATS[b.cat][lang === 'pt' ? 1 : 0]}</span></span>
            <span class="rarity">${R(b.rarity)}</span></div>`;
        }).join('');
      };
      $('#bcat').onchange = (e) => { bf.cat = e.target.value; draw(); };
      $('#brar').onchange = (e) => { bf.rarity = e.target.value; draw(); };
      draw();
    });
    return html;
  }

  // ---------------------------------------------------------------- store (VIP)
  // os 3 planos (mesma tabela do servidor: VIP_TIERS em gamemode/scripts/global/g.utils.lua)
  const TIERS = [
    { id: 'survivor', icon: 'tree', color: '#cd8a4e', perks: [
      ['star', '+15% XP boost', '+15% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+1 extra sleeping bag', '+1 cama extra'],
      ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['megaphone', 'Soft name in global chat + scoreboard', 'Nome destacado no chat global e no placar'],
      ['award', 'Bronze VIP badge', 'Badge VIP de bronze'] ] },
    { id: 'veteran', icon: 'shield', color: '#ff6a00', hot: true, perks: [
      ['star', '+30% XP boost', '+30% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+2 extra sleeping bags', '+2 camas extras'],
      ['clock', 'Faster sleeping bag respawn', 'Respawn mais rápido na cama'], ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['building', 'Base limit 50 + 50% less upkeep', 'Limite de 50 peças + 50% menos upkeep'],
      ['megaphone', '[VIP] tag in global chat + highlighted scoreboard row', 'Tag [VIP] no chat global + linha destacada no placar'],
      ['award', 'Silver VIP badge', 'Badge VIP de prata'] ] },
    { id: 'legendary', icon: 'crown', color: '#f5b83d', perks: [
      ['star', '+50% XP boost', '+50% de XP'], ['user', 'Reserved server slot', 'Vaga reservada no servidor'],
      ['bag', 'Expanded inventory (42 slots)', 'Inventário maior (42 slots)'], ['package', '+3 extra sleeping bags', '+3 camas extras'],
      ['clock', 'Fastest sleeping bag respawn', 'Respawn na cama ainda mais rápido'], ['map', 'Choose your respawn region', 'Escolha a região onde renasce'],
      ['building', 'Base limit 65 + 50% less upkeep', 'Limite de 65 peças + 50% menos upkeep'],
      ['pickaxe', 'Hatchet and pickaxe when you respawn', 'Nasce com machado e picareta'],
      ['hammer', '25% less crafting cost (materials and level)', '25% menos custo de craft (material e level)'],
      ['megaphone', 'Gold [VIP] tag in global chat + legendary scoreboard frame', 'Tag [VIP] dourada no chat + moldura lendária no placar'],
      ['award', 'Gold VIP badge', 'Badge VIP de ouro'] ] },
  ];
  const COMPARE = [
    ['xp', '—', '+15%', '+30%', '+50%'], ['slot', '—', '✓', '✓', '✓'], ['inv', '28', '42', '42', '42'], ['beds', '1', '2', '3', '4'],
    ['bedtime', '10 min', '10 min', '5 min', '3 min'], ['respawn', '—', '✓', '✓', '✓'], ['base', '15–50*', '15–50*', '50', '65'],
    ['upkeep', '100%', '100%', '50%', '50%'], ['tools', '—', '—', '—', '✓'], ['craft', '100%', '100%', '100%', '75%'],
  ];
  function pageStore() {
    const d = (window.HAVOK || {}).discord || '#';
    const L = lang === 'pt' ? 2 : 1;
    return `<section class="store-hero">
        <span class="pill">${svg('shield')} HAVOK VIP</span>
        <h1>${t('store_h1a')} <span>${t('store_h1b')}</span></h1>
        <p>${t('store_sub')}</p>
        <div class="trust"><span>${svg('user')} ${t('store_t1')}</span><span>${svg('zap')} ${t('store_t2')}</span><span>${svg('clock')} ${t('store_t3')}</span></div>
      </section>
      <div class="tiers">${TIERS.map((tr) => `<div class="tier${tr.hot ? ' hot' : ''}" style="--tc:${tr.color}">
          ${tr.hot ? `<span class="hot-tag">${t('popular')}</span>` : ''}
          <div class="tier-head"><span class="tier-ic">${svg(tr.icon)}</span><b>${t('tier_' + tr.id)}</b></div>
          <small class="tier-sub">${t('tier_' + tr.id + '_d')}</small>
          <div class="tier-label">${t('store_perks')}</div>
          <ul>${tr.perks.map((p) => `<li>${svg(p[0])}<span>${esc(p[L])}</span></li>`).join('')}</ul>
          <a class="tier-btn" href="${esc(d)}" target="_blank" rel="noopener">${t('store_get')} ${svg('chevron')}</a>
        </div>`).join('')}</div>
      <div class="section-title">${t('store_compare')}</div>
      <div class="table-wrap"><div class="compare wide"><div class="crow head"><span>${t('perk')}</span><span>${t('player')}</span>${TIERS.map((tr) => `<span style="color:${tr.color}">${t('tier_' + tr.id)}</span>`).join('')}</div>
        ${COMPARE.map(([k, ...v]) => `<div class="crow"><span>${t('cmp_' + k)}</span>${v.map((x, i) => `<span${i ? ` style="color:${TIERS[i - 1].color}"` : ' class="muted"'}>${x}</span>`).join('')}</div>`).join('')}</div></div>
      <p class="fine">${t('store_base_note')}</p>
      <a class="cta" href="${esc(d)}" target="_blank" rel="noopener">${svg('discord')} ${t('store_cta')}</a>
      <p class="fine">${t('store_fine')}</p>`;
  }

  // ---------------------------------------------------------------- lista de espera
  // Lê o contador do Worker (worker/waitlist.js), que conta o cargo "Waiting List" no Discord.
  // Sem config.waitlist.api o bloco não aparece. Erro = aviso discreto, nunca número inventado.
  let wlTimer = null;
  const WL_EVERY = 60000;
  function waitlistBox() {
    const H = window.HAVOK || {}, cfg = H.waitlist || {};
    if (!cfg.api) return '';
    const goal = cfg.goal || 30;
    setTimeout(() => { loadWaitlist(); wlTimer = setInterval(() => { if (!document.hidden) loadWaitlist(); }, WL_EVERY); });
    return `<div class="wl" id="wl" data-state="loading" aria-live="polite">
        <div class="wl-head"><b>${t('wl_title')}</b><span class="wl-num" id="wlNum">— / ${goal}</span></div>
        <div class="wl-bar" role="progressbar" aria-label="${t('wl_title')}" aria-valuemin="0" aria-valuemax="${goal}"><i id="wlBar"></i></div>
        <p class="wl-msg" id="wlMsg">${t('wl_load')}</p>
        <a class="wl-btn" href="${esc(H.discord || '#')}" target="_blank" rel="noopener">${svg('discord')} ${t('wl_join')}</a>
        <small class="wl-note">${t('wl_note')}</small>
      </div>`;
  }
  async function loadWaitlist() {
    const box = $('#wl');
    if (!box) return;
    const cfg = (window.HAVOK || {}).waitlist || {};
    let data = null;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(cfg.api, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(to);
      const j = r.ok ? await r.json() : null;
      if (j && Number.isInteger(j.count) && j.count >= 0) data = j;
    } catch (e) { data = null; }
    if (!$('#wl')) return; // saiu da página enquanto carregava
    const goal = (data && data.goal) || cfg.goal || 30;
    const bar = $('#wlBar'), num = $('#wlNum'), msg = $('#wlMsg');
    if (!data) {
      // mantém o último número real na tela se já tinha um; senão fica sem número
      if (box.dataset.state !== 'ok') { box.dataset.state = 'error'; num.textContent = `— / ${goal}`; bar.style.transform = 'scaleX(0)'; }
      msg.textContent = t('wl_err');
      return;
    }
    box.dataset.state = 'ok';
    num.textContent = `${data.count} / ${goal}`;
    bar.style.transform = `scaleX(${Math.min(1, data.count / goal)})`;
    bar.parentElement.setAttribute('aria-valuenow', data.count);
    msg.textContent = data.count >= goal ? t('wl_full') : t('wl_goal', { n: goal });
  }

  // ---------------------------------------------------------------- home (landing)
  const LANDING_MEDIA = [['spawn', 'spawn'], ['gather-tools', 'resource-gathering'], ['first-house', 'base-building'], ['vehicles', 'world-and-events'], ['build-wheel', 'base-building'], ['upgrade', 'base-building']];
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return lang === 'pt' ? `${dd}/${m}/${y}` : `${m}/${dd}/${y}`; };
  let newsAll = false;
  function pageLanding() {
    const H = window.HAVOK || {};
    const so = Object.assign({ discord: H.discord }, H.socials || {});
    const caption = (id) => (W.media.find((m) => m.id === id) || {}).caption || '';
    const loop = (id) => `<video autoplay muted loop playsinline preload="metadata" poster="" aria-label="${esc(caption(id))}"><source src="media/${id}.webm" type="video/webm"><source src="media/${id}.mp4" type="video/mp4"></video>`;
    const news = (window.HAVOK_NEWS || []);
    const shown = newsAll ? news : news.slice(0, 2);
    setTimeout(() => {
      // os vídeos da galeria só tocam quando aparecem na tela (economiza banda e CPU)
      const vids = document.querySelectorAll('.l-gallery video');
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.25 });
        vids.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); io.observe(v); });
      }
      const more = $('#newsMore');
      if (more) more.onclick = () => { newsAll = true; route(); };
    });
    return `<section class="l-hero">
        <video class="l-hero-bg" autoplay muted loop playsinline preload="auto" poster="media/hero.webp" aria-hidden="true"><source src="media/hero.webm" type="video/webm"><source src="media/hero.mp4" type="video/mp4"></video>
        <div class="l-hero-in">
          <img class="l-logo" src="logo-text.png" alt="HAVOK">
          <h1 class="l-h1"><span>${t('l_h1a')}</span> <span>${t('l_h1b')}</span> <span class="hot">${t('l_h1c')}</span></h1>
          <p class="l-sub">${t('l_sub')}</p>
          ${waitlistBox()}
          <div class="l-cta">
            <a class="l-btn primary" href="play/">${svg('play')} ${t('l_play')}</a>
            <a class="l-btn discord" href="${esc(so.discord || '#')}" target="_blank" rel="noopener">${svg('discord')} Discord</a>
            <a class="l-btn" href="#/wiki">${svg('book')} ${t('l_wiki')}</a>
          </div>
        </div>
        <div class="l-scroll" aria-hidden="true"></div>
      </section>
      <div class="l-body">
        <div class="section-title">${t('l_feat')}</div>
        <div class="l-feats">${T[lang].feats.map((f) => `<a class="l-feat" href="#/guides/${f[3]}"><span class="tile-ic">${svg(f[0])}</span><b>${esc(f[1])}</b><small>${esc(f[2])}</small></a>`).join('')}</div>

        <div class="l-new">
          <div class="l-new-txt">
            <h2>${t('l_new')}</h2>
            <p>${t('l_new_sub')}</p>
            <ol>${T[lang].l_steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
            <a class="l-btn primary" href="#/guides/getting-started">${svg('rocket')} ${t('l_new_btn')}</a>
          </div>
          <div class="l-new-media">${loop('hud')}</div>
        </div>

        <div class="section-title">${t('l_media')}</div>
        <div class="l-gallery">${LANDING_MEDIA.map(([id, g]) => `<a href="#/guides/${g}" class="l-shot">${loop(id)}<span>${esc(caption(id))}</span></a>`).join('')}</div>

        <div class="section-title">${t('l_news')}</div>
        <div class="l-news">${shown.map((n) => `<article class="l-post">
            <header><time datetime="${n.date}">${fmtDate(n.date)}</time><h3>${esc(n.title[lang] || n.title.en)}</h3></header>
            <ul>${n.items.map((i) => `<li><span class="tag ${i.tag}">${esc(T[lang].tags[i.tag] || i.tag)}</span><span>${esc(i[lang] || i.en)}</span></li>`).join('')}</ul>
          </article>`).join('')}
          ${news.length > shown.length ? `<button class="l-more" id="newsMore">${t('l_all_news')}</button>` : ''}</div>

        <div class="l-social">
          <div><h2>${t('l_social')}</h2><p>${t('l_social_sub')}</p></div>
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
    else if (parts[0] === 'badges') html = pageBadges();
    else if (parts[0] === 'store') html = pageStore();
    else html = pageHome();
    $('#main').innerHTML = html;
    renderSide(h.startsWith('/items/') ? '/category/' + (byId[parts[1]] || {}).cat : h);
    $('#sidebar').classList.remove('open');
    document.querySelectorAll('.topnav a').forEach((x) => x.classList.toggle('on', x.dataset.nav === (landing ? 'home' : ['badges', 'store'].includes(parts[0]) ? parts[0] : 'wiki')));
    const it = parts[0] === 'items' && byId[parts[1]];
    document.title = landing ? 'HAVOK — Rust Survival' : (it ? name(it) + ' — ' : '') + 'HAVOK Wiki';
    window.scrollTo(0, 0);
  }

  function applyLang() {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    $('#search').placeholder = t('search');
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
    const hits = W.items.filter((i) => norm(i.name.en).includes(q) || norm(i.name.pt).includes(q)).sort(sortByName).slice(0, 12);
    sel = 0;
    sRes.innerHTML = hits.length ? hits.map((i, n) => `<a href="#/items/${i.id}" class="${n === 0 ? 'sel' : ''}">${iconOf(i)}<span>${esc(name(i))}<small>${esc(typeName(i.type))}</small></span></a>`).join('') : `<div class="empty">${t('no_results')}</div>`;
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
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); sIn.focus(); sIn.select(); }
  });

  window.addEventListener('hashchange', route);
  applyLang();
  route();
})();
