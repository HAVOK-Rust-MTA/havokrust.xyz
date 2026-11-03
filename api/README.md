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
- **Hall da fama** `GET /api/seasons` (cache 60 s): uma entrada por season que já fechou (a em andamento fica de fora),
  da mais nova para a mais velha, até 20: `{seasons: [{cycle, startedAt, endedAt, groups: [{rank, name, tag, color, emblem,
  kills, xp, members}] (top 3), top: {pid, nick, kills, deaths, kd, linked, avatarUrl} | null}]}`. Lê `group_seasons` e
  `player_seasons`; sem nenhuma season fechada = `{seasons: []}`.
- **Perfil** `GET /api/player/<pid>`: além dos números do wipe traz `inWipe`, `allTime` (`{seasons, kills, deaths,
  playMinutes, kd}` ou `null`) e, para quem não jogou neste wipe, `inWipe: false` + `lastSeason` (`{cycle, level, kills,
  deaths, playMinutes, group}`) com os números da última season no lugar dos do wipe (sem grupo nem badges).

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

## Site ao vivo (`live/`)

Tabela `server_samples` na migration `0015_live.sql` (rodar antes do deploy).

- **Histórico de jogadores** — o `POST /api/game/mta/live` (que o `havok_link` já manda a cada entrada/saída e 1x por
  minuto) passa a gravar uma amostra em `server_samples(ts, online, max)` **no máximo a cada 5 min**, e apaga o que tem
  mais de 7 dias. Não precisa mudar nada no MTA.

  `GET /api/status/history?hours=24` (público, CORS do site, cache 60 s). `hours` vai de 1 a 168 (fora disso é cortado;
  vazio ou inválido = 24).
  ```json
  { "hours": 24, "samples": [{ "t": 1793700000, "online": 12, "max": 85 }], "peak": 30, "avg": 13.5, "now": 7 }
  ```
  `t` = unix (s). `peak`/`avg` = pico e média de `online` nas amostras do período (sem amostra: 0). `now` = jogadores
  agora pelo último `live` (null se o servidor não avisa há mais de 150 s: desligado ou reiniciando).

- **Airdrop ao vivo** — `POST /api/game/mta/airdrop`, assinado igual ao `/api/game/mta/live` (`WIPE_SECRET`):
  ```json
  { "state": "falling", "x": 1125, "y": -875, "at": 1793700000, "id": 7, "landAt": 1793700270, "zone": "Flint County" }
  ```
  `state` = `falling` (avião/paraquedas) | `landed` (caixa no chão) | `opened` (alguém mexeu na caixa) | `none` (acabou).
  `x`/`y` obrigatórios fora do `none`, entre −4096 e 4096. `landAt` e `zone` opcionais. Fica em `bot_settings`
  (`airdrop.live`). Sem assinatura = 401; estado ou posição inválidos = 400.

  `GET /api/airdrop` (público, CORS do site, cache 15 s):
  `{ state, x, y, at, id, landAt, zone }`. Volta `state: "none"` (o resto null) quando não há airdrop, 15 min depois do
  `opened`, ou se o último aviso tem mais de 2 h (servidor caiu sem mandar o `none`).
  O `havok_link` manda a posição **arredondada** (centro de um quadrado de 250 m, `AIRDROP_SITE_GRID` no `s.main.lua`):
  no jogo a posição exata é segredo da corneta da rádio. `AIRDROP_SITE_GRID = 0` manda a exata.
