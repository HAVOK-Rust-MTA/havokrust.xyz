#!/usr/bin/env python3
# Gera o mapa interativo do site a partir dos arquivos do servidor MTA:
#   mapa/tiles/{z}/{x}/{y}.webp   tiles 256 px para Leaflet CRS.Simple (zoom 0–4 do map.png; z5 nítido do continente)
#   mapa/preview.webp             miniatura (~800 px) para a prévia da home
#   mapa/icons/*.png              blips do jogo usados pelo site (só os usados)
#   mapa/map-data.js              pontos, áreas e rótulos (coordenadas já em pixel do map.png)
#
# Re-executável: python3 tools/build-map.py            (tudo)
#                python3 tools/build-map.py --data     (só map-data.js e ícones, sem refazer os tiles)
#
# Mundo do GTA: −4096..+4096 nos dois eixos; map.png 4096×4096 → px = (x + 4096) / 2, py = (4096 − y) / 2.
# NÃO publica loot (havok_pickups/*.map) nem os pontos de airdrop: o site só mostra o airdrop atual, ao vivo.
import argparse, json, math, pathlib, re, shutil, sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'mapa'
SRV = pathlib.Path.home() / 'MTA-Server/mods/deathmatch/resources/[HAVOK]/[dependencies]'
MAP_PNG = SRV / 'havok_map/assets/map.png'
BLIPS = SRV / 'havok_map/assets/blips'

TILE = 256
MAX_Z = 4  # 256 · 2^4 = 4096 (projeção dos pontos: px do map.png)
# zoom 5 mais nítido: foto de satélite do continente, 1 px por metro (mundo −3000..+3000 = px 1096..7096 no z5)
CONT_PNG = pathlib.Path.home() / 'MTA-Server/build/mapafoto/para-site/havok-mapa-satelite-6000-continente.png'
TILE_Z = 5 if CONT_PNG.exists() else MAX_Z


def to_px(x, y):
    return [round((x + 4096) / 2, 1), round((4096 - y) / 2, 1)]


def read(rel):
    return (SRV / rel).read_text(encoding='utf-8', errors='replace')


NUM = r'-?\d+(?:\.\d+)?'


def table_after(src, name):
    """Corpo { ... } da tabela Lua `name = { ... }` (com chaves balanceadas)."""
    m = re.search(r'(?:local\s+)?' + re.escape(name) + r'\s*=\s*\{', src)
    if not m:
        raise SystemExit(f'tabela {name} não encontrada')
    i, depth = m.end() - 1, 0
    for j in range(i, len(src)):
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
            if depth == 0:
                return src[i + 1:j]
    raise SystemExit(f'tabela {name} sem fim')


def strip_comments(src):
    return re.sub(r'--[^\n]*', '', src)


def tuples(body, n=2):
    """Listas {a, b, c...} numéricas de um corpo de tabela; devolve as n primeiras de cada."""
    out = []
    for m in re.finditer(r'\{\s*(' + NUM + r'(?:\s*,\s*' + NUM + r')*)\s*\}', body):
        vals = [float(v) for v in re.split(r'\s*,\s*', m.group(1))]
        if len(vals) >= n:
            out.append(vals[:n])
    return out


def cluster(pts, dist):
    """Agrupa pontos (x, y) por ligação simples a menos de `dist`."""
    groups = []
    for p in pts:
        hit = [g for g in groups if any(math.dist(p[:2], q[:2]) <= dist for q in g)]
        merged = [p]
        for g in hit:
            merged += g
            groups.remove(g)
        groups.append(merged)
    return groups


def centroid(pts):
    return [sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)]


def hull(points):
    pts = sorted(set((round(p[0], 1), round(p[1], 1)) for p in points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def point_in_poly(x, y, poly):
    inside, j = False, len(poly) - 1
    for i in range(len(poly)):
        xi, yi, xj, yj = poly[i][0], poly[i][1], poly[j][0], poly[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


# ---------------------------------------------------------------- rótulos (coordenadas do mundo do GTA SA)
# tier 1 = cidades e condados (sempre), 2 = vilas (zoom médio), 3 = lugares (zoom perto)
LABELS = [
    ('Los Santos', 'Los Santos', 1700, -1650, 1),
    ('San Fierro', 'San Fierro', -2250, 450, 1),
    ('Las Venturas', 'Las Venturas', 2050, 1850, 1),
    ('Red County', 'Red County', 900, -150, 1),
    ('Flint County', 'Flint County', -600, -1350, 1),
    ('Whetstone', 'Whetstone', -1750, -2150, 1),
    ('Bone County', 'Bone County', 550, 1350, 1),
    ('Tierra Robada', 'Tierra Robada', -1100, 2200, 1),
    ('Angel Pine', 'Angel Pine', -2150, -2400, 2),
    ('Palomino Creek', 'Palomino Creek', 2300, 30, 2),
    ('Blueberry', 'Blueberry', 230, -140, 2),
    ('Montgomery', 'Montgomery', 1300, 270, 2),
    ('Dillimore', 'Dillimore', 680, -550, 2),
    ('Fort Carson', 'Fort Carson', -170, 1110, 2),
    ('Bayside', 'Bayside', -2480, 2320, 2),
    ('El Quebrados', 'El Quebrados', -1480, 2620, 2),
    ('Las Barrancas', 'Las Barrancas', -780, 1520, 2),
    ('Las Payasadas', 'Las Payasadas', -230, 2680, 2),
    ('Área 51', 'Area 51', 230, 1920, 2),
    ('Monte Chiliad', 'Mount Chiliad', -2330, -1640, 2),
    ('Verdant Meadows', 'Verdant Meadows', 380, 2520, 3),
    ('Represa Sherman', 'Sherman Dam', -700, 2050, 3),
    ('Hunter Quarry', 'Hunter Quarry', 600, 880, 3),
    ('Octane Springs', 'Octane Springs', 560, 1650, 3),
    ("Lil' Probe Inn", "Lil' Probe Inn", -90, 1380, 3),
    ('Aeroporto de LS', 'LS Airport', 1820, -2450, 3),
    ('Aeroporto de SF', 'SF Airport', -1420, -260, 3),
    ('Aeroporto de LV', 'LV Airport', 1500, 1450, 3),
    ('Easter Basin', 'Easter Basin', -1600, 380, 3),
    ('Shady Creeks', 'Shady Creeks', -1700, -1900, 3),
    ('Back o Beyond', 'Back o Beyond', -700, -2150, 3),
    ('Leafy Hollow', 'Leafy Hollow', -1050, -1650, 3),
    ('The Panopticon', 'The Panopticon', -750, -350, 3),
    ('Fern Ridge', 'Fern Ridge', 880, -60, 3),
    ('Hampton Barns', 'Hampton Barns', 620, 330, 3),
    ('Verdant Bluffs', 'Verdant Bluffs', 1100, -2080, 3),
    ('Santa Maria Beach', 'Santa Maria Beach', 400, -1850, 3),
    ('Aldea Malvada', 'Aldea Malvada', -1300, 2520, 3),
    ('Bayside Marina', 'Bayside Marina', -2250, 2400, 3),
    ('Fallen Tree', 'Fallen Tree', -500, -150, 3),
    # lugares do HAVOK (o mapa do servidor troca o centro de LS por um lago e LV por deserto cercado)
    ('Ilha do Reator', 'Reactor Island', 3140, -630, 3),
    ('Lago de Los Santos', 'Los Santos Lake', 1500, -1250, 3),
    ('Porta-aviões', 'Aircraft carrier', -1380, 495, 3),
    ('K.A.C.C.', 'K.A.C.C.', 2610, 2760, 3),
]

TOWNS = [l for l in LABELS if l[4] in (1, 2)]


def near(x, y, tiers=(3, 2, 1)):
    """Nome do lugar conhecido mais perto (lugar exato > vila > condado)."""
    best = None
    for t in tiers:
        for pt, en, lx, ly, tier in LABELS:
            if tier != t:
                continue
            d = math.dist((x, y), (lx, ly))
            limit = 900 if t == 2 else 300 if t == 3 else 10 ** 9
            if d <= limit and (best is None or d < best[0]):
                best = (d, pt, en)
        if best:
            return best[1], best[2]
    return 'mar aberto', 'open sea'


# ---------------------------------------------------------------- loja
SHOP_CATS = {
    'PRIMARY WEAPON': ('armas primárias', 'primary weapons'),
    'SECUNDARY WEAPON': ('armas secundárias', 'secondary weapons'),
    'AMMO': ('munição', 'ammo'),
    'RAID ITENS': ('explosivos de raid', 'raid explosives'),
    'FOOD / DRINK': ('comida e água', 'food & water'),
    'MEDICINES': ('remédios', 'medicine'),
    'CAR PARTS': ('peças de carro', 'car parts'),
    'EQUIPMENT': ('capacete e colete', 'helmet & vest'),
    'FARMS': ('ferramentas de coleta', 'gathering tools'),
    'OTHERS': ('outros', 'other'),
    'CLOTHES': ('trajes (Radial, Artic, Diver)', 'suits (Radial, Artic, Diver)'),
    'APPAREL': ('roupas e acessórios', 'clothes & accessories'),
}


def parse_shop():
    src = read('havok_shop/config.lua')
    body = strip_comments(table_after(src, 'tblLoja'))
    cats = []
    for m in re.finditer(r'Categoria\s*=\s*"([^"]+)"\s*,\s*Itens\s*=\s*\{', body):
        start, depth = m.end() - 1, 0
        for j in range(start, len(body)):
            depth += body[j] == '{'
            depth -= body[j] == '}'
            if depth == 0:
                break
        items = re.findall(r'Nome\s*=\s*"([^"]+)"\s*,\s*Valor\s*=\s*(\d+)', body[start:j])
        cats.append((m.group(1), [(n, int(v)) for n, v in items]))
    npcs = []
    for m in re.finditer(r'\{\s*x\s*=\s*(' + NUM + r')\s*,\s*y\s*=\s*(' + NUM + r')[^}]*?\}', table_after(src, 'shopNpcData')):
        only = re.search(r"only\s*=\s*'([^']+)'", m.group(0))
        npcs.append((float(m.group(1)), float(m.group(2)), only.group(1) if only else None))
    return cats, npcs


def parse_safezones():
    body = strip_comments(table_after(read('havok_safezone/g.config.lua'), 'SAFE_ZONES'))
    zones = []
    for m in re.finditer(r'\{(\s*\{[^{}]+\}\s*,?)+\s*\}', body):
        zones.append(tuples(m.group(0)))
    nb = re.search(r'NO_BUILD_RADIUS\s*=\s*(\d+)', read('havok_safezone/g.config.lua'))
    return zones, int(nb.group(1)) if nb else 80


def parse_missions():
    src = read('havok_mission/config.lua')
    body = table_after(src, 'missions')
    names = re.findall(r'name\s*=\s*"([^"]+)"', body)
    # cada missão é um bloco [n] = { ... }; conta as desligadas
    blocks = re.split(r'\[\d+\]\s*=\s*\{', body)[1:]
    active = [b for b in blocks if not re.search(r'Disabled\s*=\s*true', b)]
    levels = sorted({int(v) for b in active for v in re.findall(r'levelRequired\s*=\s*(\d+)', b)})
    npcs = []
    for m in re.finditer(r'\{\s*x\s*=\s*(' + NUM + r')\s*,\s*y\s*=\s*(' + NUM + r')', table_after(src, 'MISSION_NPCS')):
        npcs.append((float(m.group(1)), float(m.group(2))))
    return len(names), len(active), (max(levels) if levels else 0), npcs


def parse_blips():
    src = read('havok_blips/c.main.lua')
    return {k: tuples(strip_comments(table_after(src, k))) for k in
            ('PETROLIFERAS_LOCATIONS', 'MILITARES_LOCATIONS', 'ILHAS_LOCATIONS')}


def parse_gates():
    src = read('havok_military/s_portoes.lua')
    body = table_after(src, 'pos')
    return [[float(a), float(b)] for a, b in
            re.findall(r"\['closed'\]\s*=\s*\{\s*(" + NUM + r")\s*,\s*(" + NUM + r")", body)]


def parse_radiation():
    src = read('havok_radiation_zones/zones.lua')
    pts = tuples(table_after(src, 'positions'), 2)
    r = re.search(r'createColSphere\(\s*x\s*,\s*y\s*,\s*z\s*,\s*(\d+)', read('havok_radiation_zones/c.main.lua'))
    return pts, int(r.group(1)) if r else 25


def parse_snow():
    body = table_after(read('havok_snow/settings.lua'), 'colPositions')
    nums = [float(v) for v in re.findall(NUM, strip_comments(body))]
    return [nums[i:i + 2] for i in range(0, len(nums) - 1, 2)]


def parse_antennas():
    data = json.loads(read('havok_radio/antenas.json'))
    out = []
    for group in data:
        for a in (group if isinstance(group, list) else [group]):
            if a.get('on') and not a.get('dim') and not a.get('int'):
                out.append(a)
    return out


# ---------------------------------------------------------------- montagem
CATEGORIES = [
    # id, nome PT, nome EN, ícone, cor (marcador / área)
    ('safezone', 'Safe zones', 'Safe zones', 'b38.png', '#6cc070'),
    ('shop', 'Vendedores', 'Vendors', 'b52.png', '#f5b83d'),
    ('mission', 'NPCs de missão', 'Mission NPCs', 'b62.png', '#8fd16a'),
    ('recycler', 'Recicladoras', 'Recyclers', 'b34.png', '#d9d2c9'),
    ('hospital', 'Hospitais', 'Hospitals', 'b22.png', '#e5544b'),
    ('gas', 'Postos', 'Gas stations', 'svg:fuel', '#ffb347'),
    ('military', 'Bases militares', 'Military bases', 'b56.png', '#ff6a00'),
    ('gate', 'Portões KeyCard', 'KeyCard gates', 'svg:card', '#ff8a33'),
    ('radiation', 'Radiação', 'Radiation', 'svg:rad', '#c6e34a'),
    ('cold', 'Zona de frio', 'Cold zone', 'svg:snow', '#9fd3ff'),
    ('oil', 'Petrolíferas', 'Oil rigs', 'svg:oil', '#c9b79c'),
    ('island', 'Ilhas', 'Islands', 'b20.png', '#e0a36b'),
    ('radio', 'Cornetas da rádio', 'Radio speakers', 'svg:speaker', '#ff6a00'),
]
EXTRA_ICONS = []  # ícones fora das categorias (a loja de roupa entra pelo próprio ponto)


def build_data():
    points, areas = [], []
    ids = {}

    def add(cat, x, y, name, desc, details=None, **extra):
        ids[cat] = ids.get(cat, 0) + 1
        p = {'id': f'{cat}-{ids[cat]}', 'cat': cat, 'p': to_px(x, y),
             'name': {'pt': name[0], 'en': name[1]}, 'desc': {'pt': desc[0], 'en': desc[1]}}
        if details:
            p['details'] = {'pt': details[0], 'en': details[1]}
        p.update(extra)
        points.append(p)
        return p

    # safe zones + vendedores
    zones, no_build = parse_safezones()
    cats, shop_npcs = parse_shop()
    for i, poly in enumerate(zones, 1):
        cx, cy = centroid(poly)
        place = near(cx, cy)
        inside = [n for n in shop_npcs if point_in_poly(n[0], n[1], poly)]
        sells = ('vendedor de equipamento' + (' e loja de roupas' if any(n[2] for n in inside) else ''),
                 'gear vendor' + (' and clothing shop' if any(n[2] for n in inside) else ''))
        areas.append({'id': f'safezone-{i}', 'cat': 'safezone', 'poly': [to_px(x, y) for x, y in poly],
                      'name': {'pt': f'Safe zone — {place[0]}', 'en': f'Safe zone — {place[1]}'},
                      'desc': {'pt': 'Sem PvP; ' + sells[0] + ' dentro', 'en': 'No PvP; ' + sells[1] + ' inside'}})
        add('safezone', cx, cy, (f'Safe zone — {place[0]}', f'Safe zone — {place[1]}'),
            ('Área segura: sem PvP; ' + sells[0] + ' dentro', 'Safe area: no PvP; ' + sells[1] + ' inside'),
            ([f'Ninguém toma dano de jogador dentro dos muros.',
              f'Ao sair você fica protegido por 10 s (atirar cancela).',
              f'Não dá para construir a menos de {no_build} m da borda.'],
             [f'Nobody takes player damage inside the walls.',
              f'Leaving gives 10 s of protection (shooting cancels it).',
              f'No building within {no_build} m of the edge.']))

    gear = [(c, it) for c, it in cats if c != 'APPAREL']
    apparel = dict(cats).get('APPAREL', [])
    gear_list_pt = ', '.join(SHOP_CATS.get(c, (c.lower(),))[0] for c, _ in gear)
    gear_list_en = ', '.join(SHOP_CATS.get(c, (None, c.lower()))[1] for c, _ in gear)

    def price_lines(lang):
        out = []
        for c, items in gear:
            if not items:
                continue
            lo, hi = min(v for _, v in items), max(v for _, v in items)
            label = SHOP_CATS.get(c, (c.lower(), c.lower()))[0 if lang == 'pt' else 1]
            rng = f'{lo}' if lo == hi else f'{lo}–{hi}'
            word = ('item' if len(items) == 1 else 'itens') if lang == 'pt' else ('item' if len(items) == 1 else 'items')
            out.append(f'{label[0].upper() + label[1:]}: {len(items)} {word}, {rng} Scrap')
        return out

    for x, y, only in shop_npcs:
        place = near(x, y)
        if only == 'APPAREL':
            lo, hi = min(v for _, v in apparel), max(v for _, v in apparel)
            add('shop', x, y, (f'Loja de roupas — {place[0]}', f'Clothing shop — {place[1]}'),
                (f'Roupas e acessórios ({len(apparel)} peças); paga em Scrap', f'Clothes & accessories ({len(apparel)} pieces); paid in Scrap'),
                ([f'{len(apparel)} peças: camisetas, calças, botas, bonés, máscaras e óculos.', f'De {lo} a {hi} Scrap Metal por peça.',
                  'Dá para montar o conjunto e pagar tudo de uma vez.'],
                 [f'{len(apparel)} pieces: shirts, pants, boots, caps, masks and glasses.', f'{lo} to {hi} Scrap Metal per piece.',
                  'You can build the full outfit and pay for it at once.']),
                icon='b45.png')
        else:
            add('shop', x, y, (f'Vendedor — {place[0]}', f'Vendor — {place[1]}'),
                ('Armas, munição, raid, comida, remédios e trajes; paga em Scrap', 'Weapons, ammo, raid, food, medicine and suits; paid in Scrap'),
                (price_lines('pt') + ['Também dá para transferir Scrap Metal para outro jogador.'],
                 price_lines('en') + ['You can also transfer Scrap Metal to another player.']))

    # missões
    total, active, max_lvl, mnpcs = parse_missions()
    for x, y in mnpcs:
        place = near(x, y)
        add('mission', x, y, (f'NPC de missões — {place[0]}', f'Mission NPC — {place[1]}'),
            (f'Entregue recursos e ganhe itens e XP ({active} missões)', f'Hand in resources for items and XP ({active} missions)'),
            ([f'{active} missões ativas; as mais fortes pedem nível (até {max_lvl}).', 'Chegue a até 20 m do NPC para assumir ou entregar.',
              'Os três NPCs têm a mesma lista de missões.'],
             [f'{active} active missions; the best ones need a level (up to {max_lvl}).', 'Get within 20 m of the NPC to take or hand in.',
              'All three NPCs share the same mission list.']))

    # recicladoras
    rec = tuples(strip_comments(table_after(read('havok_recycler/config.lua'), 'RECYCLER_LOCATIONS')), 2)
    for x, y in rec:
        place = near(x, y)
        add('recycler', x, y, (f'Recicladora — {place[0]}', f'Recycler — {place[1]}'),
            ('Transforma itens em recursos (Scrap, metal, tecido…)', 'Turns items into resources (Scrap, metal, cloth…)'),
            (['Coloque itens dentro (até 14 espaços) e ligue.', 'Cada item vira os materiais da receita dele.'],
             ['Put items inside (up to 14 slots) and turn it on.', 'Each item breaks down into its recipe materials.']))

    # hospitais (vários pacotes por hospital → agrupa)
    hosp = tuples(strip_comments(table_after(read('havok_hospitals/config.lua'), 'hospitalSpawns')), 2)
    for g in cluster(hosp, 80):
        cx, cy = centroid(g)
        place = near(cx, cy)
        add('hospital', cx, cy, (f'Hospital — {place[0]}', f'Hospital — {place[1]}'),
            (f'Kits médicos: bandagem, morfina, primeiros socorros ({len(g)} pacote{"s" if len(g) > 1 else ""})',
             f'Medical packs: bandage, morphine, first aid ({len(g)} pack{"s" if len(g) > 1 else ""})'),
            (['Pacotes de hospital com Bandage, Blood Kit, First Aid e Morphine.', 'Repõem sozinhos a cada 30–45 min.'],
             ['Hospital packs with Bandage, Blood Kit, First Aid and Morphine.', 'They restock on their own every 30–45 min.']))

    # postos (várias bombas por posto → agrupa)
    gas = tuples(strip_comments(table_after(read('havok_gas_stations/config.lua'), 'pos')), 2)
    for g in cluster(gas, 60):
        cx, cy = centroid(g)
        place = near(cx, cy)
        add('gas', cx, cy, (f'Posto — {place[0]}', f'Gas station — {place[1]}'),
            (f'Encha galões de gasolina ({len(g)} bomba{"s" if len(g) > 1 else ""})', f'Fill fuel gallons ({len(g)} pump{"s" if len(g) > 1 else ""})'),
            (['Use um galão vazio na bomba: 1 galão = 20 de combustível.', 'Cada bomba tem estoque próprio e reabastece a cada 5 h.'],
             ['Use an empty gallon on the pump: 1 gallon = 20 fuel.', 'Each pump has its own stock and refills every 5 h.']))

    # portões KeyCard
    gates = parse_gates()
    for x, y in gates:
        place = near(x, y)
        add('gate', x, y, (f'Portão militar — {place[0]}', f'Military gate — {place[1]}'),
            ('Precisa de KeyCard na mão (gasta 1)', 'Needs a KeyCard in hand (uses 1)'),
            (['Equipe o KeyCard e use o leitor ao lado do portão.', 'O portão abre por 10 s e fecha sozinho.'],
             ['Equip the KeyCard and use the reader next to the gate.', 'The gate opens for 10 s and closes on its own.']))

    # radiação: 387 esferas de 25 m → áreas desenháveis (casco das esferas de cada grupo)
    rad, rad_r = parse_radiation()
    rad_groups = cluster(rad, rad_r * 4)
    rad_areas = []
    for i, g in enumerate(sorted(rad_groups, key=len, reverse=True), 1):
        ring = [(x + rad_r * math.cos(a * math.pi / 8), y + rad_r * math.sin(a * math.pi / 8)) for x, y in g for a in range(16)]
        poly = hull(ring)
        cx, cy = centroid(g)
        place = near(cx, cy)
        rad_areas.append((cx, cy, poly))
        areas.append({'id': f'radiation-{i}', 'cat': 'radiation', 'poly': [to_px(x, y) for x, y in poly],
                      'name': {'pt': f'Radiação — {place[0]}', 'en': f'Radiation — {place[1]}'},
                      'desc': {'pt': 'Perde sangue rápido; traje Radial protege', 'en': 'Fast blood loss; the Radial suit protects you'},
                      'details': {'pt': ['Sem proteção: −300 de sangue por toque na zona.', 'Máscara corta pela metade; traje Radial quase zera.'],
                                  'en': ['Unprotected: −300 blood per hit.', 'A mask halves it; the Radial suit nearly removes it.']},
                      'spots': len(g)})

    # bases militares (blips) + ilha do reator
    blips = parse_blips()
    MIL_NAMES = {  # nome por base (o mais conhecido de cada lugar)
        (216, 1886): ('Área 51', 'Area 51'),
        (-1420, 493): ('Porta-aviões (Easter Basin)', 'Aircraft carrier (Easter Basin)'),
        (2619, 2729): ('K.A.C.C. (Las Venturas)', 'K.A.C.C. (Las Venturas)'),
        (1180, -2029): ('Verdant Bluffs (LS)', 'Verdant Bluffs (LS)'),
        (875, -1246): ('Margem do lago (LS)', 'Lakeshore (LS)'),
    }
    mil = [list(p) for p in blips['MILITARES_LOCATIONS']] + [[3150.0, -640.0]]
    for x, y in mil:
        nm = next((v for k, v in MIL_NAMES.items() if math.dist(k, (x, y)) < 60), None)
        if (x, y) == (3150.0, -640.0):
            nm = ('Ilha do Reator', 'Reactor Island')
        nm = nm or near(x, y)
        g_near = sum(1 for gx, gy in gates if math.dist((gx, gy), (x, y)) < 450)
        r_near = any(math.dist((cx, cy), (x, y)) < 450 for cx, cy, _ in rad_areas)
        bits_pt, bits_en = ['loot militar'], ['military loot']
        if r_near:
            bits_pt.append('radiação')
            bits_en.append('radiation')
        if g_near:
            bits_pt.append(f'{g_near} portão{"ões" if g_near > 1 else ""} KeyCard'.replace('portãoões', 'portões'))
            bits_en.append(f'{g_near} KeyCard gate{"s" if g_near > 1 else ""}')
        det_pt, det_en = ['Loot militar, o melhor do mapa: vá preparado.'], ['Military loot, the best on the map: come prepared.']
        if r_near:
            det_pt.append('Área radioativa: vá de traje Radial ou máscara.')
            det_en.append('Radioactive area: bring a Radial suit or a mask.')
        if g_near:
            det_pt.append('Portões trancados abrem com KeyCard.')
            det_en.append('Locked gates open with a KeyCard.')
        if nm[0] == 'Ilha do Reator':
            det_pt.append('O reator explode de tempos em tempos e espalha radiação.')
            det_en.append('The reactor blows from time to time and spreads radiation.')
        add('military', x, y, (f'Base militar — {nm[0]}', f'Military base — {nm[1]}'),
            ('; '.join(bits_pt)[0].upper() + '; '.join(bits_pt)[1:], '; '.join(bits_en)[0].upper() + '; '.join(bits_en)[1:]),
            (det_pt, det_en))

    # zona de frio
    snow = parse_snow()
    areas.append({'id': 'cold-1', 'cat': 'cold', 'poly': [to_px(x, y) for x, y in snow],
                  'name': {'pt': 'Zona de frio — Monte Chiliad', 'en': 'Cold zone — Mount Chiliad'},
                  'desc': {'pt': 'Sem o traje Artic você perde sangue', 'en': 'Without the Artic suit you lose blood'},
                  'details': {'pt': ['Neve e frio constante: o traje Artic protege 100%.', 'Quem acabou de nascer tem 2 min sem dano de frio.'],
                              'en': ['Snow and constant cold: the Artic suit gives 100% protection.', 'Fresh spawns get 2 min without cold damage.']}})

    # petrolíferas e ilhas
    for x, y in blips['PETROLIFERAS_LOCATIONS']:
        side = ('sudoeste', 'southwest') if x < 0 else ('nordeste', 'northeast')
        add('oil', x, y, (f'Petrolífera {side[0]}', f'{side[1].capitalize()} oil rig'),
            ('Plataforma em alto-mar; só de barco ou helicóptero', 'Offshore platform; boat or helicopter only'),
            (['Fica no canto do mapa, longe de tudo.', 'Lugar isolado: bom para loot com pouca gente.'],
             ['Sits at the map edge, far from everything.', 'Isolated spot: good loot with few people around.']))
    ISLAND_NAMES = [('Ilha de Santa Maria', 'Santa Maria Island'), ('Ilha do Sul', 'South Island'), ('Ilha do Leste', 'East Island')]
    for i, (x, y) in enumerate(blips['ILHAS_LOCATIONS']):
        place = near(x, y, tiers=(3, 2, 1))
        nm = ISLAND_NAMES[i] if i < len(ISLAND_NAMES) else (f'Ilha {i + 1}', f'Island {i + 1}')
        add('island', x, y, nm,
            ('Ilha fora do continente; chegue de barco', 'Offshore island; reach it by boat'),
            ([f'Perto de {place[0]}.' if place[0] != 'mar aberto' else 'Em mar aberto.', 'Só de barco, helicóptero ou nadando.'],
             [f'Near {place[1]}.' if place[1] != 'open sea' else 'In open sea.', 'Boat, helicopter or swimming only.']))

    # cornetas da rádio
    for a in parse_antennas():
        place = near(a['x'], a['y'])
        add('radio', a['x'], a['y'], (f'Corneta — {place[0]}', f'Speaker — {place[1]}'),
            (f'Toca a HAVOK Rádio; ouve-se a {int(a.get("alcance", 40))} m', f'Plays HAVOK Radio; heard within {int(a.get("alcance", 40))} m'))

    counties = {'Red County', 'Flint County', 'Whetstone', 'Bone County', 'Tierra Robada'}
    labels = [dict({'name': {'pt': pt, 'en': en}, 'p': to_px(x, y), 'tier': tier}, **({'county': True} if pt in counties else {}))
              for pt, en, x, y, tier in LABELS]

    counts = {}
    for p in points:
        counts[p['cat']] = counts.get(p['cat'], 0) + 1
    counts['radiation'] = sum(1 for a in areas if a['cat'] == 'radiation')
    counts['cold'] = 1
    # radiação e frio são áreas: o ponto clicável fica no centro de cada área
    for a in areas:
        if a['cat'] in ('radiation', 'cold'):
            xs, ys = [q[0] for q in a['poly']], [q[1] for q in a['poly']]
            a['c'] = [round(sum(xs) / len(xs), 1), round(sum(ys) / len(ys), 1)]

    data = {
        'version': 1,
        'image': 4096, 'tile': TILE, 'maxNativeZoom': MAX_Z, 'tileMaxZoom': TILE_Z,
        'world': {'min': -4096, 'max': 4096, 'note': 'px = (x + 4096) / 2, py = (4096 - y) / 2'},
        'categories': [{'id': c, 'name': {'pt': pt, 'en': en}, 'icon': ic, 'color': col, 'count': counts.get(c, 0)}
                       for c, pt, en, ic, col in CATEGORIES],
        'points': points, 'areas': areas, 'labels': labels,
    }
    js = ('// Gerado por tools/build-map.py a partir dos arquivos do servidor — não edite à mão.\n'
          '// Coordenadas "p" em pixel do map.png 4096×4096 (px = (x + 4096) / 2, py = (4096 − y) / 2).\n'
          'window.HAVOK_MAP_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (OUT / 'map-data.js').write_text(js, encoding='utf-8')
    print(f'map-data.js: {len(points)} pontos, {len(areas)} áreas ({len(rad)} esferas de radiação → {len(rad_groups)} áreas), {len(labels)} rótulos')
    return data


def copy_icons(data):
    used = {c['icon'] for c in data['categories'] if c['icon'].endswith('.png')} | set(EXTRA_ICONS)
    used |= {p['icon'] for p in data['points'] if p.get('icon')}
    dst = OUT / 'icons'
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    for name in sorted(used):
        src = BLIPS / (name[1:] if name.startswith('b') else name)  # 'b22.png' ← blips/22.png
        shutil.copyfile(src, dst / name)
    print(f'icons: {len(used)} ({", ".join(sorted(used))})')


def build_tiles():
    img = Image.open(MAP_PNG).convert('RGB')
    if img.size != (4096, 4096):
        sys.exit(f'map.png com tamanho inesperado: {img.size}')
    tiles_dir = OUT / 'tiles'
    if tiles_dir.exists():
        shutil.rmtree(tiles_dir)
    n = 0
    for z in range(MAX_Z + 1):
        size = TILE * 2 ** z
        level = img if size == 4096 else img.resize((size, size), Image.LANCZOS)
        for tx in range(2 ** z):
            d = tiles_dir / str(z) / str(tx)
            d.mkdir(parents=True, exist_ok=True)
            for ty in range(2 ** z):
                level.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE)).save(d / f'{ty}.webp', 'WEBP', quality=82, method=6)
                n += 1
    if TILE_Z > MAX_Z:
        # z5 = map.png ampliado 2× (mar e ilhas) com o continente nítido colado por cima
        Image.MAX_IMAGE_PIXELS = None
        size = TILE * 2 ** TILE_Z
        level = img.resize((size, size), Image.LANCZOS)
        cont = Image.open(CONT_PNG).convert('RGB')
        if cont.size != (6000, 6000):
            sys.exit(f'continente com tamanho inesperado: {cont.size}')
        level.paste(cont, (1096, 1096))
        cont.close()
        for tx in range(2 ** TILE_Z):
            d = tiles_dir / str(TILE_Z) / str(tx)
            d.mkdir(parents=True, exist_ok=True)
            for ty in range(2 ** TILE_Z):
                level.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE)).save(d / f'{ty}.webp', 'WEBP', quality=80, method=6)
                n += 1
        level = None
    img.resize((800, 800), Image.LANCZOS).save(OUT / 'preview.webp', 'WEBP', quality=80, method=6)
    total = sum(f.stat().st_size for f in tiles_dir.rglob('*.webp'))
    print(f'tiles: {n} arquivos, {total / 1024 / 1024:.1f} MB; preview.webp {(OUT / "preview.webp").stat().st_size // 1024} KB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', action='store_true', help='só map-data.js e ícones (não refaz os tiles)')
    args = ap.parse_args()
    if not SRV.is_dir():
        sys.exit(f'servidor não encontrado em {SRV}')
    OUT.mkdir(exist_ok=True)
    data = build_data()
    copy_icons(data)
    if not args.data:
        build_tiles()
