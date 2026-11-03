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
- **pid para sempre** (`player_ids`): a conta volta depois do wipe com o mesmo pid, então o link do perfil não quebra.
- **Ranking** `GET /api/ranking/players?scope=wipe|all&by=kills|hours|kd|level` (top 50, cache 60 s):
  - `scope=wipe` (padrão): só o wipe atual. `scope=all`: de sempre = seasons guardadas (`player_seasons`, foto tirada pelo
    havok-waitlist no `wipe_started`) + o wipe atual, sem contar a season que está sendo wipada duas vezes.
  - `by=kd`: abates / mortes (morte zero conta como 1), só quem tem 10+ abates. `by=level` só no `scope=wipe`.
  - Resposta: `{scope, by, players: [{rank, pid, nick, kills, deaths, playMinutes, kd, seasons?, linked, avatarUrl, group, badges}]}`.

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
