#!/bin/bash
# Gera versões dos vídeos e prints de media/ SEM o serial do jogador e sem o chat.
#
# As gravações do MTA mostram o serial (canto de cima à esquerda, ex. "ECF1A…") e as linhas do chat logo abaixo.
# O site nunca pode mostrar o serial, então cada arquivo ganha uma cópia "<nome>-limpo.<ext>":
#   - gravação crua: corta a faixa de cima inteira (serial + chat + bússola), mantém a largura;
#   - hud (vídeo editado, com o logo em cima): borra só o serial e a faixa do chat, sem cortar o logo.
# O app.js usa a versão -limpo nos guias (lista MEDIA_CLEAN). Arquivo novo de media/ com serial:
# acrescente aqui, rode de novo e ponha o nome na lista MEDIA_CLEAN do app.js.
#
#   tools/media-sem-serial.sh            # gera só o que falta
#   FORCE=1 tools/media-sem-serial.sh    # refaz tudo
#
# Pesado para o notebook: no máximo 4 threads + nice (o guarda térmico, se existir, pausa acima de 88 °C).
set -euo pipefail
cd "$(dirname "$0")/../media"
GUARDA=~/Music/HAVOK_RadioZona_Producao/PRODUCAO_24_VOLUMES_FINAL/09_SCRIPTS_REPRODUCAO/guarda-temperatura.sh
run() { if [ -x "$GUARDA" ]; then "$GUARDA" nice -n 10 "$@"; else nice -n 10 "$@"; fi; }

# nome -> filtro. A faixa cortada vale para chat de até 5 linhas (1280x800: chat termina em ~y=130).
declare -A VF=(
  [barrels]="crop=iw:ih-150:0:150"
  [build-wheel]="crop=iw:ih-150:0:150"
  [crates]="crop=iw:ih-150:0:150"
  [first-house]="crop=iw:ih-150:0:150"
  [gather-tools]="crop=iw:ih-150:0:150"
  [place-object]="crop=iw:ih-150:0:150"
  [upgrade]="crop=iw:ih-150:0:150"
  [vehicles]="crop=iw:ih-150:0:150"
  [hero]="crop=iw:ih-150:0:150"
  [spawn]="crop=iw:ih-140:0:140"
  [pvp]="crop=iw:ih-112:0:112"
  [hud]="split=3[a][b][c];[b]crop=330:26:0:0,boxblur=luma_radius=10:luma_power=3:chroma_radius=5:chroma_power=3[s];[c]crop=480:64:0:96,boxblur=luma_radius=10:luma_power=3:chroma_radius=5:chroma_power=3[m];[a][s]overlay=0:0[t];[t][m]overlay=0:96"
)

for id in "${!VF[@]}"; do
  [ -f "$id.mp4" ] || { echo "sem $id.mp4, pulei"; continue; }
  f=${VF[$id]}
  if [ -n "${FORCE:-}" ] || [ ! -f "$id-limpo.mp4" ]; then
    echo "-> $id-limpo.mp4"
    run ffmpeg -v error -y -i "$id.mp4" -filter_complex "$f" -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -threads 4 "$id-limpo.mp4"
  fi
  if [ -f "$id.webm" ] && { [ -n "${FORCE:-}" ] || [ ! -f "$id-limpo.webm" ]; }; then
    echo "-> $id-limpo.webm"
    run ffmpeg -v error -y -i "$id.mp4" -filter_complex "$f" -an -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good -cpu-used 4 -threads 4 "$id-limpo.webm"
  fi
done

# prints: serial em cima e chat logo abaixo -> corta a faixa de cima (fração da altura; o hero.webp é o pôster do vídeo)
declare -A CUT=([craft-menu]=0.17 [upkeep]=0.17 [hero]=0.19)
for id in "${!CUT[@]}"; do
  [ -f "$id.webp" ] || continue
  if [ -n "${FORCE:-}" ] || [ ! -f "$id-limpo.webp" ]; then
    echo "-> $id-limpo.webp"
    python3 - "$id" "${CUT[$id]}" <<'PY'
import sys
from PIL import Image
n, frac = sys.argv[1], float(sys.argv[2])
im = Image.open(n + '.webp')
w, h = im.size
cut = round(h * frac)
im.crop((0, cut, w, h)).save(n + '-limpo.webp', quality=82, method=6)
PY
  fi
done
echo pronto
