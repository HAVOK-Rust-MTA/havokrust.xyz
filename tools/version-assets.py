#!/usr/bin/env python3
# Carimba ?v=<hash do conteúdo> nos arquivos do site em index.html.
# A Cloudflare guarda .js/.css por horas: com o carimbo, arquivo mudado = endereço novo = baixado na hora.
# Rode antes de commitar mudanças no site: python3 tools/version-assets.py
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
index = root / 'index.html'
html = index.read_text(encoding='utf-8')

def stamp(match):
    attr, name = match.group(1), match.group(2)
    f = root / name
    if not f.is_file():
        return match.group(0)
    h = hashlib.sha256(f.read_bytes()).hexdigest()[:10]
    return f'{attr}="{name}?v={h}"'

new = re.sub(r'(src|href)="([\w./-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', stamp, html)
if new != html:
    index.write_text(new, encoding='utf-8')
    print('index.html atualizado')
else:
    print('nada mudou')
