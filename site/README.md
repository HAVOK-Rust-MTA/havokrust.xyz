# Preview do site (`havok-site`)

Worker pequeno na frente do GitHub Pages que dá a **cada página um preview próprio** quando o link é colado no
Discord, WhatsApp, X etc. Robô não roda JavaScript: sem isso, todo link mostra o mesmo título e a mesma imagem.

| Link | Preview |
|---|---|
| `/` | "HAVOK — Rust Survival no MTA:SA" + `og/home.jpg` |
| `/wiki`, `/wiki/itens`, `/wiki/veiculos`, `/wiki/guias`, `/wiki/faq` | textos da wiki + `og/wiki.jpg` |
| `/wiki/item/<id>` | nome e descrição do item + **ícone do item** (cartão pequeno) |
| `/wiki/categoria/<id>`, `/wiki/guia/<slug>` | nome da categoria (com a contagem) / título e resumo do guia |
| `/grupo/<slug>` | "[TAG] Nome — #1 no wipe · 3 membros · 1.234 abates" (da `api.havokrust.xyz`) + `og/grupo.jpg` |
| `/jogador/<pid>` | "Nick — nível 12, 34 abates, [TAG] Grupo" + K/D e horas + `og/jogador.jpg` |
| `/ranking`, `/wipe`, `/mapa`, `/loja`, `/badges` | texto fixo + imagem própria da seção |
| `/perfil`, `/ac/<id>` | texto genérico, `noindex` |
| `www.havokrust.xyz/*` | 301 para `havokrust.xyz` (mesmo caminho e query) |

Como funciona: busca `https://havokrust.xyz/index.html` e `og-data.json` (esses caminhos **não** passam pelo Worker,
vão direto ao Pages; cache de borda de 60 s / 5 min), troca com HTMLRewriter `<title>`, `description`, `og:*`,
`twitter:*` e o `canonical`, e devolve 200 com o HTML. A API de grupo/jogador tem 1,5 s; passou disso, texto padrão.
**Qualquer falha devolve o `index.html` sem trocar nada** (cabeçalho `x-havok-og: fallback`); se nem o `index.html`
vier, o pedido segue direto ao Pages, cujo `404.html` é o próprio site. O Worker nunca derruba o site.

Assets (`/media`, `/img`, `/icons`, `/badges/*.svg`, `/og/*.jpg`, `/play/`, `*.js`, `*.css`) não estão nas rotas.

## Arquivos

- `index.js` (entrada) e `og.js` (tudo: rotas, textos, HTML). Testes: `node --test` aqui dentro.
- `../og-data.json` — gerado por `node tools/build-og-data.mjs` a partir do `data.js` (nome/descrição PT/ícone de cada
  item, categorias, guias) + o carimbo de versão de cada imagem de `og/`. **Rode de novo sempre que o `data.js`, o
  `index.html` ou as imagens mudarem** e commite (o script também copia `index.html` para `404.html`).
- `../og/*.jpg` — imagens 1200×630 de cada seção, geradas por `python3 tools/og-images.py` (Pillow + ffmpeg, a partir
  de `media/` e `logo-text.png`; o canto com o serial é cortado). Depois de regerar, rode o `build-og-data.mjs`
  (versão nova = URL nova, o Discord não reaproveita a imagem velha).

## Publicar (dono)

1. Commitar e dar push no site (`og/`, `og-data.json`, `404.html`) e esperar o GitHub Pages publicar.
   Conferir: `curl -sI https://havokrust.xyz/og-data.json` e `https://havokrust.xyz/og/ranking.jpg` dão 200.
2. DNS na Cloudflare: o registro `www` tem que existir e estar **com a nuvem laranja (Proxied)**, senão o 301 do www
   não passa pelo Worker. O `havokrust.xyz` já é proxied (a API vive nele).
3. Publicar o Worker:
   ```bash
   cd ~/www/havok-wiki/site
   npx wrangler deploy
   ```
4. Conferir no painel: **Workers & Pages → havok-site → Settings → Domains & Routes**. Têm que aparecer exatamente:
   `havokrust.xyz/`, `havokrust.xyz/wiki*`, `havokrust.xyz/mapa`, `havokrust.xyz/ranking`, `havokrust.xyz/wipe`,
   `havokrust.xyz/loja`, `havokrust.xyz/badges`, `havokrust.xyz/perfil`, `havokrust.xyz/grupo/*`,
   `havokrust.xyz/jogador/*`, `havokrust.xyz/ac/*`, `www.havokrust.xyz/*`.
   Não pode ter `havokrust.xyz/*` (aí todo asset passaria pelo Worker) nem rota de outro Worker no mesmo caminho.
   `/badges` é exata de propósito: `/badges/` é a pasta das imagens das badges.
5. Testar como o Discord vê:
   ```bash
   curl -s -A Discordbot https://havokrust.xyz/ranking | grep -E '<title|og:(title|description|image)"'
   curl -s -A Discordbot https://havokrust.xyz/wiki/item/c4 | grep -E 'og:(title|image)"'
   curl -s -A Discordbot https://havokrust.xyz/grupo/biriri | grep '<title'
   curl -sI https://havokrust.xyz/ranking | grep -i x-havok-og          # ranking = trocou; fallback = algo falhou
   curl -sI https://www.havokrust.xyz/wipe | grep -iE '^(HTTP|location)' # 301 -> https://havokrust.xyz/wipe
   curl -sI https://havokrust.xyz/media/hero.webp | grep -i x-havok-og   # nada: asset não passa pelo Worker
   ```
6. Para o Discord esquecer um preview antigo de um link já colado: o cache dele é por URL; teste com `?v=2` no fim.
   Ferramentas úteis: https://www.opengraph.xyz/ e o "Sharing Debugger" do Facebook.

Desligar: apagar as rotas no painel (ou `npx wrangler delete` em `site/`). O site continua no ar pelo Pages.

## Testes

```bash
cd ~/www/havok-wiki/site && node --test
```
O HTMLRewriter do Workers não existe no Node: o teste usa um substituto mínimo com a mesma interface. O de verdade foi
conferido com `npx wrangler dev --var ORIGIN:http://127.0.0.1:8800` (site servido com `python3 -m http.server 8800`
na raiz do repo) e `curl -H 'Host: havokrust.xyz' http://127.0.0.1:8787/ranking`.
