# Contador da lista de espera (Cloudflare Worker)

O site é estático (GitHub Pages) e não pode guardar o token do Discord. Este Worker fica no meio:
o site pergunta "quantos na lista?", o Worker pergunta ao Discord com o token do bot e devolve só o número.

```
site (havokrust.xyz) --GET /waitlist--> Worker --Bot token--> Discord API
                                              GET /guilds/{guild}/roles/member-counts
```

Tudo grátis: plano Free do Cloudflare Workers (100 mil requisições/dia) e um bot do Discord.
O Worker lê o Discord no máximo 1 vez a cada 30 segundos (cache compartilhado do Cloudflare), não importa quantas pessoas abram o site.

## 1. Criar o bot do Discord

1. Abra https://discord.com/developers/applications → **New Application** → nome `HAVOK` → Create.
2. Menu **Bot**:
   - **Reset Token** → copie o token e guarde (ele só aparece uma vez). **Nunca** cole em arquivo do site nem mande em chat.
   - Desligue **Public Bot** (só você pode adicionar).
   - Nenhum "Privileged Gateway Intent" é necessário.
3. Menu **OAuth2 → URL Generator**: marque `bot`. Em *Bot Permissions* não marque nada.
   Abra o link gerado e adicione o bot ao servidor do HAVOK.

## 2. Pegar os IDs

1. Discord → Configurações do usuário → **Avançado** → ligue **Modo desenvolvedor**.
2. **GUILD_ID**: botão direito no ícone do servidor → *Copiar ID do servidor*.
   (Já está no `wrangler.toml`: `1560345146703482890`.)
3. **ROLE_ID**: Configurações do servidor → **Cargos** → botão direito em `Waiting List` → *Copiar ID do cargo*.
   Cole no `wrangler.toml` em `ROLE_ID`.

## 3. Discord Onboarding (quem entra escolhe a lista)

Configurações do servidor → **Integração** (Onboarding) → *Perguntas*:
- Pergunta: "Quer jogar na inauguração?" / opção "Sim, me coloca na lista de espera"
- Cargo da opção: `Waiting List`

Quem marcar a opção ganha o cargo e passa a contar no site.

## 4. Publicar o Worker

Precisa de uma conta grátis em https://dash.cloudflare.com (não precisa de cartão nem de domínio).

```bash
cd ~/www/havok-wiki/worker
npx wrangler login                          # abre o navegador para autorizar
npx wrangler secret put DISCORD_BOT_TOKEN   # cola o token quando pedir (fica só no Cloudflare)
npx wrangler deploy                         # mostra a URL: https://havok-waitlist.<usuario>.workers.dev
```

Teste:
```bash
curl -H 'Origin: https://havokrust.xyz' https://havok-waitlist.<usuario>.workers.dev/waitlist
# {"count":0,"goal":30,"updatedAt":"...","stale":false}
```

## 5. Ligar no site

Em `config.js`:
```js
waitlist: { api: 'https://havok-waitlist.<usuario>.workers.dev/waitlist', goal: 30 },
```
A meta que vale é a do `GOAL` no `wrangler.toml` (o `goal` do site só aparece antes da primeira leitura).
Para mudar a meta: edite `GOAL` e rode `npx wrangler deploy` de novo.

## Respostas e erros

| Resposta | Quando |
|---|---|
| `200 {count, goal, updatedAt, stale:false}` | leitura nova (até 30 s de idade) |
| `200 {..., stale:true}` | o Discord falhou agora, mas há leitura real de até 6 h atrás |
| `502 {error:"unavailable"}` | Discord fora sem leitura recente, token inválido, bot fora do servidor ou ROLE_ID errado |
| `503 {error:"unavailable"}` | falta o Secret ou os IDs no `wrangler.toml` |

O motivo exato fica no log: `npx wrangler tail`. O site nunca mostra número inventado: em erro aparece
"Contador indisponível no momento" e a barra fica vazia.

- **CORS**: só as origens de `ALLOWED_ORIGINS` recebem o cabeçalho de liberação.
- **Testes**: `node --test` nesta pasta (Discord simulado, não precisa de token).

## Painel no canal #waiting-list

O Worker também edita, a cada minuto (Cron Trigger), **uma mensagem fixa** no canal da lista:
número, vagas, barra de 50 e a fila numerada (`panel.js`). Ninguém precisa reenviar nada.

- O link do webhook do canal fica no Secret `WAITLIST_WEBHOOK` (`npx wrangler secret put WAITLIST_WEBHOOK`).
- `WAITLIST_MESSAGE_ID` no `wrangler.toml` é a mensagem que o webhook enviou uma vez. Para recriar o painel:
  apague a mensagem, envie uma nova pelo webhook com `?wait=true`, troque o ID e rode `npx wrangler deploy`.
- A ordem da fila fica guardada no link do título do próprio painel (sem banco). Quem perde o cargo sai da fila.
- O bot precisa poder listar membros: Developer Portal → Bot → **Server Members Intent** ligado.

### Painel da lista com botão (mensagem única do bot)

Uma mensagem só, enviada pelo **bot** (`waitlist/join.js`): a fila completa (o mesmo embed de status) + o convite
("só entre se você vai jogar na inauguração") + o botão **Entrar na lista · Join the list**.

- O clique dá o cargo `ROLE_ID` (**Early Survivor** no servidor) e responde em privado (PT/EN). Vanguard / Pioneer /
  Early Survivor do painel são as posições 1–15 da fila, não cargos.
- A ordem da fila vem do painel antigo (webhook) na primeira vez e depois fica guardada no próprio painel do bot.
  Enquanto o painel do bot não existir, o cron segue atualizando o do webhook como antes.
- Depois de um clique o painel atualiza na hora (no máximo 1 vez a cada 15 s); senão, no próximo minuto, e só se mudou.
  Passar de `GOAL` não fecha a lista: mostra 100% e 0 vagas e registra a data no D1.
- Precisa: bot com **Gerenciar cargos** e o cargo do bot **acima** do cargo Early Survivor (Configurações → Cargos).

| Comando | O que faz |
|---|---|
| `/waitinglist setup` | publica o painel (ou atualiza o que já existe; nunca duplica) |
| `/waitinglist setup apagar_antigo:true` | idem, e apaga o painel antigo do webhook |
| `/waitinglist refresh` | atualiza o painel agora |

Primeira vez: `npx wrangler d1 migrations apply havok-recruit --remote` (cria `bot_settings`), `npx wrangler deploy`,
espere 1 min (o Worker registra o `/waitinglist` sozinho) e rode `/waitinglist setup`.
Erros: `npx wrangler tail` (linhas `waitlist:`; sem permissão de cargo aparece explicado).

## Recrutamento da staff (Discord)

Candidatura e avaliação de moderadores **dentro do Discord**, no mesmo Worker (`recruit/`), sem bot conectado
ao Gateway: o Discord manda cada clique, formulário e comando por HTTPS para `POST /interactions`.
O banco **D1** é a fonte de verdade; as mensagens do Discord só mostram o que está no banco.

```
painel público  --[Candidatar-se]-->  mensagem privada --[Começar]--> formulário 1 (4 perguntas)
                --> rascunho no D1 (30 min) --[Continuar candidatura]--> formulário 2 (3 perguntas)
                --> candidatura completa no D1 --> canal privado de análise [Aprovar] [Reprovar]
```

- Várias pessoas podem se candidatar; **só 2 podem ser APROVADAS** (`STAFF_MAX_SLOTS`). Na 2ª aprovação o
  processo encerra sozinho, o painel vira "INSCRIÇÕES ENCERRADAS" e o canal de análise recebe o aviso.
- O limite é garantido pelo banco (UPDATE condicional + trigger `staff_approval_limit`): dois admins clicando
  juntos não geram 3 aprovações. Uma candidatura por pessoa por processo (`UNIQUE`).
- Permissão: cargos em `STAFF_ADMIN_ROLE_IDS` (e/ou pessoas em `STAFF_ADMIN_USER_IDS`), conferidos a cada
  clique com os dados que o próprio Discord assina. Esconder o comando (Administrador) é só visual.
- Se o Discord falhar ao publicar uma candidatura ou editar o painel, o banco fica certo e o **cron** (1 min)
  tenta de novo. `/staff sincronizar` força na hora.

### Comandos (só administração)

| Comando | O que faz |
|---|---|
| `/staff abrir` | cria o processo seletivo e abre as inscrições (com `novo:true`, começa um processo NOVO depois que o anterior fechou/encheu) |
| `/staff painel [canal]` | publica o painel no canal (ou sincroniza o existente; trocar de canal apaga o antigo) |
| `/staff fechar` | encerra as inscrições |
| `/staff reabrir` | reabre o MESMO processo (aprovações continuam valendo; não reabre se as vagas já foram preenchidas) |
| `/staff status` | aberto/fechado, candidaturas, aprovados e vagas restantes |
| `/staff desfazer numero motivo` | volta uma candidatura avaliada para pendente (fica na auditoria). Se liberar vaga de um processo cheio, ele fica FECHADO até `/staff reabrir`. Se era uma aprovação, o bot tira o cargo de Helper |
| `/staff avisar numero` | manda de novo a DM do resultado (e os cargos, se aprovado) |
| `/staff sincronizar` | atualiza o painel e publica candidaturas que faltam no canal de análise |

**Aviso ao candidato:** quando alguém clica em Aprovar ou Recusar, o bot manda uma DM para o candidato.
- **Aprovado:** recebe automaticamente os cargos de `STAFF_APPROVED_ROLE_IDS` (Helper e cargo base). O cargo com mais acesso é dado à mão.
- **Recusado:** recebe uma mensagem padrão dizendo que pode tentar de novo no próximo processo.
- **Confirmação:** o canal de análise sempre recebe uma resposta à candidatura com o resultado. Fica ✅ quando a DM foi entregue e os cargos foram dados, e ⚠️ quando algo falhou.
- **Se falhou:** `/staff avisar numero` manda tudo de novo.
- **Requisitos:** o bot precisa da permissão "Gerenciar cargos", e o cargo dele precisa ficar **acima** desses cargos na lista de cargos.

### Configurar (uma vez)

**1. IDs** (Discord com Modo desenvolvedor ligado → botão direito → Copiar ID), no `wrangler.toml`:

| Variável | Onde achar |
|---|---|
| `DISCORD_PUBLIC_KEY` | Developer Portal → seu app → **General Information → Public Key** |
| `STAFF_REVIEW_CHANNEL_ID` | canal PRIVADO da administração (só staff vê) |
| `STAFF_ADMIN_ROLE_IDS` | Configurações do servidor → Cargos → botão direito no cargo (vários: separe por vírgula) |
| `STAFF_ADMIN_USER_IDS` | opcional: IDs de pessoas, separados por vírgula |

O token continua só no Secret `DISCORD_BOT_TOKEN` (já existe; nada novo de segredo).

**2. Banco D1:**
```bash
cd ~/www/havok-wiki/worker
export WRANGLER_SEND_METRICS=false                       # sem telemetria do wrangler
npx wrangler d1 create havok-recruit                     # mostra o database_id
# descomente o bloco [[d1_databases]] no fim do wrangler.toml e cole o database_id
npx wrangler d1 migrations apply havok-recruit --remote  # cria as tabelas
```

**3. Permissões do bot** nos dois canais (painel e análise): Ver canal, Enviar mensagens, Inserir links (embeds),
Ler histórico. (Apagar o painel antigo ao trocar de canal não precisa de permissão extra: a mensagem é do próprio bot.)

**4. Publicar o Worker:** `npx wrangler deploy`

**5. URL de interações:** Developer Portal → seu app → **General Information → Interactions Endpoint URL**:
`https://havok-waitlist.<usuario>.workers.dev/interactions` → Save. O Discord manda um PING assinado; se salvar
sem erro, a verificação Ed25519 está funcionando. (O app não usa Gateway, então não há nada para migrar.)

**6. Registrar o `/staff`:** automático (o Worker registra no cron, com `DISCORD_APPLICATION_ID` do `wrangler.toml`). Manual, só se precisar:
```bash
read -rs DISCORD_BOT_TOKEN && export DISCORD_BOT_TOKEN   # cola o token (não aparece nem fica no histórico)
DISCORD_APPLICATION_ID=<Application ID do General Information> node register-commands.mjs
```
Se o comando não aparecer, adicione o app de novo ao servidor com os escopos `bot` e `applications.commands`.

**7. Usar:** `/staff abrir` → `/staff painel canal:#recrutamento`.

### Testes

`node --test` nesta pasta: D1 simulado com SQLite real rodando a migration, assinaturas Ed25519 reais e o Discord
simulado. Cobre assinatura inválida/velha, PING, servidor errado, interação repetida, fluxo das 2 etapas,
duplicada (inclusive com duas abas), incompleta/expirada, inscrições encerradas, não-admin, aprovar/reprovar,
cliques simultâneos, 3ª aprovação impossível (até forçando no banco), encerramento automático, reabrir/desfazer,
falhas e 429 do Discord, limites de tamanho do Discord. A lista de espera continua com os testes dela.

### Limitações e próximos passos

- A aprovação **não dá cargo** automaticamente (só registra a decisão). Dá para ligar depois.
- O candidato não recebe aviso do resultado (mensagem direta ficou fora desta versão).
- O histórico (auditoria) fica no D1; ver com `npx wrangler d1 execute havok-recruit --remote --command "SELECT * FROM recruitment_audit_log ORDER BY id DESC LIMIT 20"`.

## Wipe: calendário oficial (Discord + site + servidor MTA)

O Worker/D1 é o calendário; o servidor MTA (`havok_wipe`) faz o wipe de verdade e confirma. Ciclo de **15 dias**
(`WIPE_CYCLE_SECONDS`), **últimas 24 h = PvP** (barris com a tabela de armas do `stoneage_pickups`).

```
/wipe definir ──> D1 (wipe_cycles) ──GET /api/wipe/status──> site (conta cada segundo localmente)
                      │   ▲          ──cron 1 min──────────> painel no Discord (mesma mensagem, editada)
       GET /mta/sync  │   │ POST /mta/event (HMAC)
                      ▼   │  pvp_on · wipe_started · wipe_done · wipe_failed
                 havok_wipe (MTA)
```

- Fase sempre calculada pela hora atual contra a data oficial (nada é decrementado): reinício, deploy e cron atrasado não mudam nada.
- **O Worker nunca apaga nada.** Na hora zero o `havok_wipe` faz o procedimento de sempre: senha no servidor, prêmio do top 3,
  expulsa todos, reinicia, **copia o banco** (`havok_wipe/backups/`) e só então limpa `Accounts, Objects, Vehicles, Groups,
  GroupStyle, GroupFlags, AccountSwitchBackup` (VIP, badges, bans, staff e configurações ficam). Só depois disso manda `wipe_done`.
- Um ciclo novo nasce **só** da confirmação, a partir da hora real do wipe. Confirmação repetida não cria outro (`previous_cycle_id` único).
- Os avisos do servidor ficam numa fila no banco do MTA e são reenviados até o Worker receber; o wipe nunca é repetido.
- Falha (cópia do banco não deu certo): fica **WIPE DELAYED**, nada é apagado, o servidor tenta de novo a cada boot;
  a administração pode reagendar com `/wipe definir`.
- O painel só diz **"PvP MODE ACTIVE"** depois que o servidor confirma (`pvp_on`).

| Comando | O que faz |
|---|---|
| `/wipe painel [canal]` | publica (ou sincroniza) o painel; os avisos também saem nesse canal |
| `/wipe definir data:"AAAA-MM-DD HH:MM" confirmar:true` | agenda o próximo wipe (Brasília). Sem ciclo: cria o primeiro |
| `/wipe status` · `/wipe historico` · `/wipe sincronizar` | consulta / histórico / força o painel |
| `/wipedefinir AAAA-MM-DD HH:MM` (no jogo, staff) | o mesmo que `/wipe definir`, de dentro do servidor MTA; Discord e site atualizam sozinhos |

**Ranking do wipe no site:** o `havok_wipe` manda a cada 5 min (assinado, `POST /api/wipe/mta/ranking`) o top 10 de grupos
(`havok_groups`) e o top 10 de jogadores por kills (sem contas de staff). O Worker guarda só nome, tag e números e o site lê
`GET /api/ranking` (seção "Quem manda na ilha" na home, escondida enquanto não houver ninguém pontuando).

Endpoints: `GET /api/wipe/status` (público, CORS de `ALLOWED_ORIGINS`), `GET /api/wipe/mta/sync` e `POST /api/wipe/mta/event`
(só com `X-Havok-Timestamp` + `X-Havok-Signature` = HMAC-SHA256 de `"<ts>\n<MÉTODO>\n<caminho>\n<corpo>"` com `WIPE_SECRET`; 5 min de validade).

### Ligar

```bash
cd ~/www/havok-wiki/worker
export WRANGLER_SEND_METRICS=false
npx wrangler d1 migrations apply havok-recruit --remote      # cria wipe_cycles e wipe_events
# o mesmo segredo que está no havok_wipe/s.config.lua (não aparece na tela)
grep -oP "^WIPE_SECRET = '\K[^']+" "$HOME/MTA-Server/mods/deathmatch/resources/[STONEAGE]/[dependencies]/havok_wipe/s.config.lua" | npx wrangler secret put WIPE_SECRET
npx wrangler deploy
```
Depois: reiniciar o servidor MTA (o `havok_wipe` passa a buscar o calendário), `/wipe painel canal:#...` e, na inauguração,
`/wipe definir`. Logs: `npx wrangler tail` (linhas `wipe:`) e `server.log` do MTA (linhas `[WIPE-SYNC]` / `[WIPE]`).

### Voltar atrás

- Worker: `npx wrangler rollback`. As tabelas novas não atrapalham versões antigas.
- Servidor MTA: esvaziar `WIPE_API` e `WIPE_SECRET` em `havok_wipe/s.config.lua` volta ao calendário local (`WIPE.start`).
- Um wipe feito tem a cópia do banco em `havok_wipe/backups/wipe-N-<hora>.db` (com o servidor desligado, copie de volta para
  `stoneage_sql/database.db`).

## Perfil e login com Discord (`link/`)

O jogador **não digita nada**: entrou no jogo sem vínculo, aparece a tela com QR e o botão COPIAR LINK.
O link (`/v/<código>`) cai direto no "Autorizar" do Discord; autorizou, a tela do jogo fecha sozinha e o perfil aparece em `havokrust.xyz/#/perfil`.

```
jogo --(assinado, HMAC do wipe)--> POST /api/link/mta/code   -> código de 15 min para a conta logada
celular/navegador --> GET /v/<código> --> Discord (scope identify) --> /auth/discord/callback
                                                                      liga conta <-> Discord, abre sessão (cookie), volta para o site
jogo --(assinado)--> POST /api/link/mta/status a cada 4 s enquanto a tela está aberta
jogo --(assinado)--> POST /api/link/mta/profile a cada 5 min: level, kills, mortes, horas, grupo, badges dos vinculados
site --> GET /api/me (cookie)
```

Ninguém vincula a conta de outro: o código só nasce pelo servidor para quem está logado no jogo, e só vira vínculo
com o login do Discord de quem abriu. Conta do jogo já vinculada não troca de dono; um Discord tem uma conta só.

Para ligar (uma vez):

1. **Domínio da API**: Cloudflare → Workers → `havok-waitlist` → Settings → Domains & Routes → *Add Custom Domain* → `api.havokrust.xyz`
   (o domínio `havokrust.xyz` precisa estar na Cloudflare).
2. **Developer Portal** → o app do HAVOK → **OAuth2**:
   - *Redirects*: adicione `https://api.havokrust.xyz/auth/discord/callback`
   - copie o **Client Secret** e rode `npx wrangler secret put DISCORD_CLIENT_SECRET`
3. Banco: `npx wrangler d1 migrations apply havok-recruit --remote` (cria as tabelas de `0004_link.sql`)
4. `npx wrangler deploy`
5. Site: `account.api` no `config.js` já aponta para `https://api.havokrust.xyz`.

No jogo o resource é o `havok_link` (precisa do `havok_wipe` com WIPE_API/WIPE_SECRET ligados e do grupo de ACL `HavokWeb`).
