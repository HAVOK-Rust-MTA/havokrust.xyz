# HAVOK API (`havok-api`)

Worker separado do bot (`../worker`, o `havok-waitlist`), em **api.havokrust.xyz**, no mesmo banco D1.
Cuida do login com Discord, do vínculo com o jogo, dos perfis e dos grupos que o site mostra.

## O que faz

- **Todo jogador que joga** entra no banco (`game_players`), com ou sem Discord. A conta/serial é privada:
  fora do servidor o jogador é um `pid` (`#/jogador/<pid>`). Sem vínculo, o site mostra o nick e o avatar cinza.
- **Grupos** (`game_groups`): a lista completa do wipe com os membros; `#/grupo/<slug>` mostra cada membro com foto
  (vinculado) ou avatar cinza (não vinculado).
- **Vínculo**: o jogo mostra a tela com QR/COPIAR LINK; `/v/<código>` cai direto no "Autorizar" do Discord. Vinculou,
  o histórico que já existia (números, grupo, badges) aparece no perfil com a foto do Discord.

```
jogo --(assinado)--> POST /api/link/mta/code | status | lookup     vínculo (tela do jogo)
jogo --(assinado)--> POST /api/game/mta/sync                        jogadores + grupos (a cada 5 min e ao ligar)
navegador --> /v/<código> --> Discord --> /auth/discord/callback --> havokrust.xyz/#/perfil
site --> GET /api/me (cookie) | /api/groups | /api/group/<slug> | /api/player/<pid>
```

Assinatura do jogo: a mesma do wipe (`WIPE_SECRET`, HMAC-SHA256 de `<ts>\n<MÉTODO>\n<caminho>\n<corpo>`).

## Ligar (uma vez)

```bash
cd ~/www/havok-wiki/api
npx wrangler secret put WIPE_SECRET            # o MESMO valor do bot e do s.config.lua do havok_wipe
npx wrangler secret put DISCORD_CLIENT_SECRET  # Developer Portal -> OAuth2 -> Client Secret
npx wrangler d1 migrations apply havok-recruit --remote   # cria as tabelas 0004 e 0005
npx wrangler deploy                            # já registra o domínio api.havokrust.xyz
```

No Developer Portal → OAuth2 → **Redirects**: `https://api.havokrust.xyz/auth/discord/callback`.

Testes: `node --test` nesta pasta (D1 = SQLite real, Discord simulado).
