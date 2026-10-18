import sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageEnhance, ImageOps
# uso: python3 make-banner.py <saida> <pasta com Oswald.ttf e Barlow-SemiBold.ttf> ~/www/havok-wiki
# depois: gerar recruit/banners.js (base64) e trocar BANNER_VERSION em config.js
S, F, SITE = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1200, 440
hero = Image.open(f'{SITE}/media/hero.webp').convert('RGB')
bg = hero.crop((520, 20, 1280, 300)).resize((W, int(W * 280 / 760)), Image.LANCZOS)
bg = bg.crop((0, (bg.height - H) // 2, W, (bg.height - H) // 2 + H)) if bg.height >= H else bg.resize((W, H))
bg = bg.filter(ImageFilter.GaussianBlur(7))
bg = ImageEnhance.Brightness(bg).enhance(0.55)
# escurece da esquerda (onde fica o texto) para a direita
shade = Image.new('L', (W, H))
d = ImageDraw.Draw(shade)
for x in range(W):
    d.line([(x, 0), (x, H)], fill=int(235 - 150 * min(1, x / (W * 0.85))))
bg = Image.composite(Image.new('RGB', (W, H), (14, 12, 10)), bg, shade)
img = bg.copy()
draw = ImageDraw.Draw(img)

logo = Image.open(f'{SITE}/logo.png').convert('RGBA').resize((190, 190), Image.LANCZOS)
img.paste(logo, (70, (H - 190) // 2 - 10), logo)

def font(path, size, wght=None):
    f = ImageFont.truetype(path, size)
    if wght:
        f.set_variation_by_axes([wght])
    return f
big = font(f'{F}/Oswald.ttf', 104, 700)
mid = font(f'{F}/Oswald.ttf', 46, 600)
small = font(f'{F}/Barlow-SemiBold.ttf', 26)
x = 300
draw.text((x, 92), 'RECRUTAMENTO', font=big, fill=(242, 236, 228))
draw.text((x + 3, 222), 'EQUIPE DE MODERAÇÃO', font=mid, fill=(255, 106, 0))
draw.text((x + 4, 296), 'HAVOK RUST   ·   havokrust.xyz', font=small, fill=(168, 158, 148))
draw.rectangle([0, H - 8, W, H], fill=(255, 106, 0))
img.save(f'{S}/banner-open.jpg', quality=88, optimize=True, progressive=True)

gray = ImageOps.grayscale(img).convert('RGB')
gray = ImageEnhance.Brightness(gray).enhance(0.8)
gd = ImageDraw.Draw(gray)
gd.rectangle([0, H - 8, W, H], fill=(70, 66, 62))
tag = font(f'{F}/Oswald.ttf', 34, 600)
tw = gd.textlength('INSCRIÇÕES ENCERRADAS', font=tag)
gd.rectangle([W - tw - 90, 36, W - 40, 96], fill=(178, 58, 50))
gd.text((W - tw - 65, 41), 'INSCRIÇÕES ENCERRADAS', font=tag, fill=(255, 245, 238))
gray.save(f'{S}/banner-closed.jpg', quality=88, optimize=True, progressive=True)
