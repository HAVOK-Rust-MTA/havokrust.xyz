#!/usr/bin/env python3
# Gera as imagens de preview (Open Graph, 1200x630) de cada seção do site em og/<seção>.jpg.
# Fundo = captura do jogo (media/), texto à esquerda na identidade do site (fundo quase preto, laranja #ff6a00).
# Re-executável: python3 tools/og-images.py   (precisa de Pillow; ffmpeg para tirar quadros dos vídeos;
# rsvg-convert para as badges em SVG). Depois rode python3 tools/build-og-data.py para carimbar a versão das imagens.
#
# Fonte: Oswald se estiver instalada; senão Anton (a mais próxima); senão DejaVu Sans Condensed Bold.
# O canto de cima das capturas (serial do MTA e FPS) é sempre cortado.
import pathlib, random, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'og'
W, H = 1200, 630
BG = (14, 11, 9)
ORANGE = (255, 106, 0)
TEXT = (244, 238, 230)
MUTED = (196, 186, 174)


def font_file(names):
    """Primeiro arquivo de fonte encontrado (fc-match), na ordem pedida."""
    for name in names:
        try:
            out = subprocess.run(['fc-match', '-f', '%{file}\n%{family}', name], capture_output=True, text=True).stdout
        except FileNotFoundError:
            break
        path, _, family = out.partition('\n')
        if path and name.split(':')[0].lower() in family.lower():
            return path
    for p in ['/usr/share/fonts/TTF/DejaVuSansCondensed-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf']:
        if pathlib.Path(p).is_file():
            return p
    sys.exit('nenhuma fonte encontrada (instale Oswald ou Anton)')


HEAD = font_file(['Oswald:bold', 'Anton', 'Bebas Neue', 'DejaVu Sans Condensed:bold'])
BODY = font_file(['Barlow:medium', 'Noto Sans:medium', 'DejaVu Sans'])
BODY_B = font_file(['Barlow:bold', 'Noto Sans:bold', 'DejaVu Sans:bold'])
MONO = font_file(['JetBrains Mono:bold', 'Noto Sans Mono:bold', 'DejaVu Sans Mono:bold'])


def F(path, size):
    return ImageFont.truetype(path, size)


def video_frame(name, frac):
    """Quadro do vídeo media/<name>.mp4 na fração `frac` da duração (None se não der)."""
    src = ROOT / 'media' / f'{name}.mp4'
    if not src.is_file() or not shutil.which('ffmpeg'):
        return None
    try:
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(src)],
                                   capture_output=True, text=True).stdout)
    except ValueError:
        dur = 1.0
    at = round(dur * frac, 2)
    with tempfile.TemporaryDirectory() as d:
        out = pathlib.Path(d) / 'f.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(at), '-i', str(src), '-frames:v', '1', str(out)], check=False)
        return Image.open(out).convert('RGB') if out.is_file() else None


def still(name):
    p = ROOT / 'media' / name
    return Image.open(p).convert('RGB') if p.is_file() else None


def crop_frac(im, box):
    """Recorta por frações (x0, y0, x1, y1) da imagem."""
    if im is None:
        return None
    w, h = im.size
    x0, y0, x1, y1 = box
    return im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))


def cover(im, size):
    """Redimensiona cobrindo `size` (corta o excesso no centro)."""
    tw, th = size
    s = max(tw / im.width, th / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - tw) // 2, (im.height - th) // 2
    return im.crop((x, y, x + tw, y + th))


def grain(img, amount=10, seed=7):
    """Textura de grão fina (a mesma do site), igual em todas as imagens."""
    rnd = random.Random(seed)
    noise = Image.frombytes('L', (W // 2, H // 2), bytes(rnd.randrange(256) for _ in range(W * H // 4))).resize((W, H))
    layer = Image.merge('RGB', (noise, noise, noise))
    return Image.blend(img, layer, amount / 255)


def background(im, x0=430, darken=0.62):
    """Captura à direita, escurecida, sumindo para o fundo à esquerda."""
    canvas = Image.new('RGB', (W, H), BG)
    if im is None:
        return canvas
    shot = cover(im, (W - x0, H))
    shot = Image.blend(Image.new('RGB', shot.size, BG), shot, darken)
    canvas.paste(shot, (x0, 0))
    # máscara: o fundo escuro cobre a esquerda e some em ~360 px
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    fade = 380
    for x in range(W):
        if x < x0:
            a = 255
        elif x < x0 + fade:
            t = (x - x0) / fade
            a = round(255 * (1 - t) ** 1.6)
        else:
            a = 0
        md.line([(x, 0), (x, H)], fill=a)
    dark = Image.new('RGB', (W, H), BG)
    canvas = Image.composite(dark, canvas, mask)
    # vinheta embaixo e em cima (deixa o rodapé e o logo limpos)
    vign = Image.new('L', (W, H), 0)
    vd = ImageDraw.Draw(vign)
    for y in range(H):
        v = 0
        if y > H - 190:
            v = round(200 * ((y - (H - 190)) / 190) ** 1.4)
        elif y < 110:
            v = round(120 * (1 - y / 110) ** 1.5)
        vd.line([(0, y), (W, y)], fill=v)
    return Image.composite(dark, canvas, vign)


def text_w(draw, s, font):
    return draw.textlength(s, font=font)


def wrap(draw, s, font, maxw):
    lines, cur = [], ''
    for word in s.split():
        t = (cur + ' ' + word).strip()
        if text_w(draw, t, font) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def spaced(draw, xy, s, font, fill, track=3):
    """Texto com espaçamento entre letras (rótulos em mono)."""
    x, y = xy
    for ch in s:
        draw.text((x, y), ch, font=font, fill=fill)
        x += text_w(draw, ch, font) + track
    return x


def compose(sec):
    img = background(sec.get('bg'), x0=sec.get('x0', 430), darken=sec.get('darken', 0.62))
    if sec.get('extra'):
        sec['extra'](img)
    img = grain(img)
    d = ImageDraw.Draw(img)
    left, maxw = 72, sec.get('maxw', 600)

    # logo
    logo = Image.open(ROOT / 'logo-text.png').convert('RGBA')
    lh = 66
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    img.paste(logo, (left, 54), logo)

    # bloco de texto, alinhado embaixo do logo e centrado na altura que sobra
    kick_f = F(MONO, 21)
    lines = sec['lines']
    size = sec.get('size', 104)
    while size > 60:
        hf = F(HEAD, size)
        if all(sum(text_w(d, part, hf) for part, _ in line) <= maxw for line in lines):
            break
        size -= 2
    hf = F(HEAD, size)
    lead = round(size * 1.04)
    sub_f = F(BODY, 29)
    sub = wrap(d, sec['sub'], sub_f, maxw)
    block = 34 + lead * len(lines) + 26 + 40 * len(sub)
    y = 150 + (400 - block) // 2

    d.rectangle([left, y + 3, left + 5, y + 22], fill=ORANGE)
    spaced(d, (left + 18, y), sec['kicker'], kick_f, ORANGE, track=2)
    y += 34
    for line in lines:
        x = left
        for part, hot in line:
            d.text((x, y), part, font=hf, fill=ORANGE if hot else TEXT)
            x += text_w(d, part, hf)
        y += lead
    y += 26
    for s in sub:
        d.text((left, y), s, font=sub_f, fill=MUTED)
        y += 40

    # rodapé: endereço + barra laranja
    foot = F(MONO, 22)
    spaced(d, (left, H - 62), 'HAVOKRUST.XYZ', foot, TEXT, track=3)
    d.rectangle([0, H - 8, W, H], fill=ORANGE)
    return img


# //------------------- extras por seção -------------------\\
def big_rank(img):
    """'#1' grande e vazado à direita (ranking)."""
    f = F(HEAD, 330)
    s = '#1'
    w = ImageDraw.Draw(img).textlength(s, font=f)
    x, y = W - w - 80, 110
    outer, inner = Image.new('L', (W, H), 0), Image.new('L', (W, H), 0)
    ImageDraw.Draw(outer).text((x, y), s, font=f, fill=255, stroke_width=5, stroke_fill=255)
    ImageDraw.Draw(inner).text((x, y), s, font=f, fill=255)
    ring = Image.composite(Image.new('L', (W, H), 0), outer, inner)  # contorno = de fora menos o miolo
    img.paste(Image.new('RGB', (W, H), ORANGE), (0, 0), ring)


def badge_row(img):
    """As badges do site numa fileira à direita."""
    names = ['founder', 'champion', 'killer', 'immortal', 'veteran', 'firstblood']
    tiles = []
    for n in names:
        svg = ROOT / 'badges' / f'{n}.svg'
        if svg.is_file() and shutil.which('rsvg-convert'):
            png = subprocess.run(['rsvg-convert', '-w', '150', str(svg)], capture_output=True).stdout
            if png:
                import io
                tiles.append(Image.open(io.BytesIO(png)).convert('RGBA'))
    for n in ['opening', 'youtuber', 'tiktoker']:
        p = ROOT / 'badges' / f'{n}.png'
        if p.is_file() and len(tiles) < 6:
            tiles.append(Image.open(p).convert('RGBA'))
    tiles = tiles[:6]
    cols, cell = 3, 150
    x0, y0 = W - cols * cell - 70, 150
    for i, t in enumerate(tiles):
        t = t.copy()
        t.thumbnail((128, 128), Image.LANCZOS)
        cx = x0 + (i % cols) * cell + (cell - t.width) // 2
        cy = y0 + (i // cols) * cell + (cell - t.height) // 2
        img.paste(t, (cx, cy), t)


def sections():
    hero = still('hero.webp')
    return {
        'home': dict(bg=crop_frac(hero, (0.30, 0.06, 1.0, 0.74)) if hero else None, x0=380, darken=0.8,
                     kicker='SOBREVIVÊNCIA ESTILO RUST · MTA:SA',
                     lines=[[('ACORDE SEM NADA.', 0)], [('SAIA ', 0), ('DONO DO MAPA.', 1)]], size=96,
                     sub='Farme, monte sua base, junte seu grupo e dê raid. De graça.'),
        'wiki': dict(bg=crop_frac(still('craft-menu.webp'), (0.35, 0.16, 0.93, 0.80)), x0=470, darken=0.75,
                     kicker='WIKI DO JOGO',
                     lines=[[('TODO ITEM.', 0)], [('TODA ', 0), ('RECEITA.', 1)]],
                     sub='Itens, receitas, blueprints e guias conferidos com o servidor.'),
        'ranking': dict(bg=crop_frac(video_frame('pvp', 0.7), (0.2, 0.08, 0.86, 0.9)), x0=430, darken=0.5, extra=big_rank,
                        kicker='RANKING · WIPE E DE SEMPRE',
                        lines=[[('QUEM MANDA', 0)], [('NO ', 0), ('WIPE?', 1)]],
                        sub='Top jogadores e grupos por abates, tempo de jogo e K/D.'),
        'wipe': dict(bg=crop_frac(video_frame('first-house', 0.1), (0.15, 0.1, 0.85, 0.8)), x0=430, darken=0.85,
                     kicker='WIPE · TODO MUNDO DO ZERO',
                     lines=[[('O MAPA', 0)], [('ZERA.', 1)]], size=124,
                     sub='Quando o próximo ciclo começa, a corrida vale desde o primeiro minuto.'),
        'mapa': dict(bg=crop_frac(video_frame('gather-tools', 0.5), (0.1, 0.08, 0.92, 0.8)), x0=430, darken=0.85,
                     kicker='MAPA INTERATIVO',
                     lines=[[('CONHEÇA O', 0)], [('TERRENO.', 1)]], size=116,
                     sub='Monumentos, radiação, base militar e onde cai o airdrop.'),
        'loja': dict(bg=crop_frac(video_frame('vehicles', 0.4), (0.12, 0.08, 0.88, 0.82)), x0=430, darken=0.9,
                     kicker='LOJA VIP',
                     lines=[[('JOGUE COM', 0)], [('PRESENÇA.', 1)]], size=116,
                     sub='Três planos, de mais XP até uma base lendária. Apoie o HAVOK.'),
        'grupo': dict(bg=crop_frac(video_frame('first-house', 0.2), (0.1, 0.08, 0.9, 0.8)), x0=430, darken=0.85,
                      kicker='GRUPOS DO WIPE',
                      lines=[[('SEU GRUPO', 0)], [('NO ', 0), ('TOPO.', 1)]], size=116,
                      sub='Membros, abates e a posição no ranking do wipe.'),
        'jogador': dict(bg=crop_frac(video_frame('gather-tools', 0.2), (0.15, 0.08, 0.95, 0.8)), x0=430, darken=0.85,
                        kicker='PERFIL DE JOGADOR',
                        lines=[[('NÍVEL, ABATES', 0)], [('E ', 0), ('FAMA.', 1)]], size=110,
                        sub='Os números, o grupo e as badges de cada sobrevivente.'),
        'badges': dict(bg=None, extra=badge_row, kicker='BADGES',
                       lines=[[('MARCAS DE', 0)], [('QUEM ', 0), ('JOGA.', 1)]], size=112, maxw=520,
                       sub='Conquistas do jogo e do Discord que aparecem no seu perfil.'),
    }


def main():
    OUT.mkdir(exist_ok=True)
    only = set(sys.argv[1:])
    for name, sec in sections().items():
        if only and name not in only:
            continue
        compose(sec).save(OUT / f'{name}.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
        print(f'og/{name}.jpg')
    print('fontes:', pathlib.Path(HEAD).name, pathlib.Path(BODY).name, pathlib.Path(MONO).name)


if __name__ == '__main__':
    main()
