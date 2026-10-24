import sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageEnhance
# banner do painel de tickets, no mesmo estilo do recrutamento (recruit/make-banner.py)
# uso: python3 make-banner.py <saida> <pasta com Oswald.ttf e Barlow-SemiBold.ttf> ~/www/havok-wiki
# depois: acrescentar 'banner-tickets.jpg' (base64) em recruit/banners.js e trocar TICKET_BANNER_VERSION em tickets/service.js
S, F, SITE = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1200, 440
hero = Image.open(f'{SITE}/media/hero.webp').convert('RGB')
# outro pedaço da cena do site (o recrutamento usa o lado direito)
bg = hero.crop((180, 60, 940, 340)).resize((W, int(W * 280 / 760)), Image.LANCZOS)
bg = bg.crop((0, (bg.height - H) // 2, W, (bg.height - H) // 2 + H)) if bg.height >= H else bg.resize((W, H))
bg = bg.filter(ImageFilter.GaussianBlur(7))
bg = ImageEnhance.Brightness(bg).enhance(0.55)
shade = Image.new('L', (W, H))
d = ImageDraw.Draw(shade)
for x in range(W):
    d.line([(x, 0), (x, H)], fill=int(235 - 150 * min(1, x / (W * 0.85))))
img = Image.composite(Image.new('RGB', (W, H), (14, 12, 10)), bg, shade)
draw = ImageDraw.Draw(img)

logo = Image.open(f'{SITE}/logo.png').convert('RGBA').resize((190, 190), Image.LANCZOS)
img.paste(logo, (70, (H - 190) // 2 - 10), logo)

def font(path, size, wght=None):
    f = ImageFont.truetype(path, size)
    if wght:
        try:
            f.set_variation_by_axes([wght])
        except OSError:
            pass
    return f
big = font(f'{F}/Oswald.ttf', 104, 700)
mid = font(f'{F}/Oswald.ttf', 46, 600)
small = font(f'{F}/Barlow-SemiBold.ttf', 26)
x = 300
draw.text((x, 92), 'TICKETS', font=big, fill=(242, 236, 228))
draw.text((x + 3, 222), 'ATENDIMENTO DA STAFF', font=mid, fill=(255, 106, 0))
draw.text((x + 4, 296), 'SUPORTE   ·   VIPS   ·   SUGESTÕES   ·   BUGS', font=small, fill=(168, 158, 148))
draw.rectangle([0, H - 8, W, H], fill=(255, 106, 0))
img.save(f'{S}/banner-tickets.jpg', quality=88, optimize=True, progressive=True)
