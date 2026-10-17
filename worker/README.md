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
