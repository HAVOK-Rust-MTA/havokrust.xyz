# HAVOK — plano de mídias da wiki + roteiro de teste

Arquivos vão em `~/www/havok-wiki/media/` com o nome exato.
- **Vídeo/"GIF"**: me manda a gravação bruta (qualquer tamanho). Eu corto, deixo mudo em loop e gero `nome.webm` + `nome.mp4` (≈1–2 MB).
- **Print**: `nome.webp` ou `nome.png`, em 1920×1200 sem cortar.
- **Print + motion**: você faz o motion em cima do print (setas, zoom, destaque) e exporta em vídeo; eu converto igual aos outros.

Dica de gravação: **de dia**, HUD ligado, 10–30 s por assunto, sem chat poluído. Pode gravar tudo numa sessão longa e me mandar — eu acho os trechos (foi assim com as gravações de hoje).

---

## 1. Já está no site (12 de 37)

| Mídia | Guia | De onde veio |
|---|---|---|
| hud | Primeiros Passos | hud_1.mp4 |
| spawn | Primeiros Passos | gravação do Downloads (0:48–0:58) |
| gather-tools | Coleta | 16-35-52 (3:48–4:00 machado + 4:10–4:24 picareta) |
| barrels | Loot e Crafting | 16-35-52 (7:05–7:17) |
| crates | Loot e Crafting | 16-35-52 (7:17–7:27) |
| craft-menu (print) | Loot e Crafting | 16-35-52 (7:29) |
| build-wheel | Construção | 16-51-27 (15:49–16:05) |
| place-object | Construção | 16-51-27 (15:25–15:47) |
| first-house | Construção | 16-51-27 (15:00–19:20, timelapse 8x) |
| upgrade | Construção | 16-51-27 (19:25–19:37) |
| upkeep (print) | Construção | 16-51-27 (18:30) |
| vehicles | O Mundo | 18-15-55 (0:05–0:45, pneu + bateria + dirigindo) |

Os 30 CLIPs (formato vertical de TikTok) **não servem bem**: o jogo fica numa faixa pequena com legenda por cima. Só usar se não tiver outra opção (gather-hand no CLIP23 0:20–0:40, furnace no CLIP30 0:10–0:15).

---

## 2. Print + motion (telas — é aqui que o motion faz diferença)

| Mídia | O que mostrar | Como chegar na tela |
|---|---|---|
| keys | Painel de controles | **F2** → aba CONTROLES (print da tela inteira) |
| wardrobe | Senha e lista de permissões do Armário | segurar botão direito no Armário → Senha / Permissões |
| workbench | Abas de armas liberando perto da Bancada | TAB longe da bancada → print; perto → print (motion: antes/depois) |
| research | Mesa de Pesquisa com item + sucata | botão direito na Mesa → item no slot 1, Sucata no 2 |
| learn | Aprender a blueprint | inventário → botão direito na Blueprint → Aprender |
| furnace | Janela da Fornalha acesa | botão direito na Fornalha → minério + madeira → acender |
| recycler | Janela do Reciclador | Reciclador público → itens → rodar |
| groups | Criar grupo (tag, emblema, cor) e o painel do grupo | **F1** sem grupo (criar) e com grupo; **F6** ranking |
| upkeep | (já tem print) motion opcional destacando os slots | — |

---

## 3. Gravar gameplay (sem motion, só cortar)

| Mídia | O que gravar | Precisa de |
|---|---|---|
| gather-hand | Socando árvore/pedra sem ferramenta (10 s) | personagem novo |
| drink | Garrafa vazia na mão → mirar no lago → **botão direito → Encher Garrafa** | Cantil Vazio (arrumado hoje) |
| bleeding | Levar tiro/queda, sangrando, usar Atadura | Atadura |
| revive | Cair e um amigo levantar com Atadura | **2 pessoas** |
| craft-gun | Na Bancada, craftar uma arma e a munição | Bancada + blueprint (staff dá os itens) |
| armor | Equipar capacete e colete | os itens |
| sentry | Sentinela atirando em alguém | **2 pessoas** + Munição de Sentinela |
| raid | C4/Satchel abrindo uma parede/porta | base de teste + explosivos (modo staff: construir sem custo) |
| gas-station | Encher Galão Vazio na bomba | Galão Vazio |
| radiation | Entrar na zona com e sem a roupa | Roupa Anti-Radiação |
| military | Cartão de Acesso abrindo o portão | Cartão |
| helicopter | Helicóptero de patrulha atacando / caindo | sorte ou staff |
| airdrop | Avião passando e a caixa caindo | esperar o aviso no chat |
| hospital | Abrir kit médico do hospital | ir a um hospital |

**Prints simples:** `weapon-tiers` (armas lado a lado no chão ou no inventário, da Besta aos rifles) e `defenses` (espetos, barricadas e sacos de areia em volta de uma base).

Modo staff ajuda: `/modo` → painel (U) → dar itens, construir sem custo e voar (F3).

---

## 4. Roteiro de teste das telas

Marque ✅ ou anote o problema (print + o que aconteceu). Telas com ⭐ mudaram hoje ou nunca foram testadas.

**Entrada**
- [ ] Tela de carregamento e menu inicial (JOGAR / DISCORD / RANKING / CONFIG / REGRAS)
- [ ] ⭐ `/modo` staff ⇄ jogador: troca sem reconectar, inventário e posição de cada conta certos
- [ ] Morte: tela "MORTO", contagem, botão RESPAWN e CAMA; ⭐ VIP com várias camas

**Inventário (TAB / E)**
- [ ] ⭐ Clicar item da barra rápida mostra a informação; fechar o inventário não deixa nada laranja
- [ ] Arrastar entre inventário, barra rápida e corpo; dividir, comer, beber, dropar
- [ ] Blueprints: receita sem material avisa o que falta; craftar funciona
- [ ] Perto da Bancada: abas de armas/munição/explosivos liberam
- [ ] ⭐ VIP Legendary: custo de craft 25% menor aparece e é cobrado certo

**Base**
- [ ] Planta de construção: roda, R, scroll, PgUp/PgDn, segurar para colocar
- [ ] Martelo: Evoluir (palito → madeira → pedra → ferro → blindado)
- [ ] Armário: upkeep (slots), senha, permissões
- [ ] Objetos: colocar baú, fornalha, cama, sentinela, placa (texto), poço, planter
- [ ] Fornalha, Mesa de Pesquisa, Reciclador, Sentinela (munição)
- [ ] `/reset` (janela de destruir construções)

**Menus**
- [ ] ⭐ **F2** ajuda: aba CONTROLES e livro (virar página, sumário), ESC fecha sem abrir o menu
- [ ] ⭐ **F5** placar: domínio no topo, bandeira do idioma, tag e emblema do grupo, ping colorido
- [ ] ⭐ **F1** grupo: criar (nome, tag, emblema, cor), digitar sem abrir chat, convites
- [ ] ⭐ **F1** grupo (com grupo): promover, expulsar, portas, mensagem, editar visual, sair/destruir
- [ ] ⭐ **F6** ranking; F1 ⇄ F6 trocam de aba
- [ ] ⭐ Tag `[TAG]` no chat local (T), global (M) e em cima da cabeça
- [ ] **F11** mapa (scroll e arrastar)
- [ ] ESC → CONFIG (idioma: troque para os 6 e veja se nada vira "translate error"), RANKING, REGRAS

**Mundo**
- [ ] ⭐ Garrafa vazia mirando na água → Encher Garrafa
- [ ] Carro: peças, combustível, K liga, porta-malas
- [ ] Poço, posto de gasolina, airdrop, helicóptero, zona de radiação, base militar, hospital

**Staff**
- [ ] Painel (U): VIP com os 3 planos (dar, editar, pausar), itens, bans, grupos
- [ ] ⭐ `/vip` mostra plano e dias
- [ ] ⭐ Discord: RPC com nível, plano VIP, grupo, botões Discord e Website
