# Dados da wiki (data.js)

O `data.js` é **gerado**. Não edite à mão: os números vêm do código do jogo e os textos vêm de `tools/wiki-texts.json`.

## Regerar (quando o jogo mudar)

```bash
cd ~/www/havok-wiki
tools/build-wiki-data            # lê ~/MTA-Server, escreve data.js e copia ícones novos para icons/
node tools/check-wiki-data.js    # confere referências quebradas, ícones e o formato que o app.js lê
git diff --stat data.js icons/   # veja o que mudou antes de commitar
```

`tools/build-wiki-data --check` mostra o que mudaria sem escrever nada. Rodar duas vezes seguidas dá o mesmo arquivo.

Precisa de `python3`, `lua5.1` (ou `luajit`) e Pillow (`python3 -c 'import PIL'`; sem ele os ícones são copiados sem otimizar).

## De onde vem cada coisa

| No data.js | Arquivo do jogo (`resources/[HAVOK]/…`) |
|---|---|
| itens, pilha, dano, munição, receita, reciclagem, fornalha, espaço do corpo | `gamemode/scripts/global/g.dataConfig.lua` (`playerDataTable`) |
| o que aparece no menu de craft, bancada, blueprint | `gamemode/scripts/global/g.blueprints.lua` (só o que está no menu ganha receita) |
| peças de base, construções, vida, limites por level | `gamemode/scripts/global/g.objects.lua` |
| VIP, limite de peças, inventário, trajes | `g.utils.lua` (`VIP_TIERS`, `BASE_LIMIT_CURVE`), `g.equipment.lua` |
| nomes/descrições que faltam no texto curado | `[dependencies]/havok_translations` (`config.lua` + `extra.lua`) |
| preço na loja (`shop`) | `[dependencies]/havok_shop/config.lua` (`tblLoja`) |
| missões (`missions`, `rewardOf`, `neededBy`) | `[dependencies]/havok_mission/config.lua` |
| de onde sai (`sources`, `bpSources`) | `havok_pickups/config.lua`, `havok_airdrop/s_settings.lua` (modo ativo), `havok_helicopter/config.lua`, `havok_hospitals/server/s.main.lua`, `havok_farms/config.lua` |
| mochilas | `havok_backpacks/g.config.lua` |
| cosméticos (roupas do personagem) | `havok_custom/g.catalog.lua` + ícones de `havok_custom/icons` |
| veículos | `havok_vehicles/config.lua` + `client/c.armor.lua` (nome e categoria ficam no texto curado) |
| kit, wipe, safe zone, rádio, radiação | `havok_kitwipe/server.lua`, `havok_wipe/g.config.lua`, `havok_safezone/g.config.lua`, `havok_walkie/g.config.lua`, `havok_radiation_zones/zones.lua` |
| tempos (airdrop, decay, cama…) | `havok_settings/serverSettings.json` (só as chaves listadas em `SETTINGS_PUBLIC`; a senha do servidor nunca é lida para o site) |

A leitura é feita por `tools/wiki-dump.lua`: carrega cada resource num ambiente isolado, com as funções do MTA trocadas por um "boneco", e imprime JSON. Nada roda no servidor. Os resources do anticheat (`havok_ac`, `havok_inventory`, `havok_bike`, `havok_guard`) e a parte de staff **não são lidos**.

## O que é escrito à mão: `tools/wiki-texts.json`

- `items` — por **nome do item no jogo** (`"AK"`, `"Baú Pequeno"`…): `id` (endereço da página, não mude de item que já existe), `cat`, `type`, `name{en,pt}`, `desc{en,pt}`, `sources` extras (`planter`, `fill`, `cook`), `note`, `icon: false` (força sem ícone).
- `vehicles` — por id do modelo: `name` e `cat` (veículo que sai do jogo some da wiki sozinho; veículo novo sem entrada aqui fica de fora com aviso).
- `guides`, `faq`, `media` — os guias (markdown simples: `##`, tabelas, listas, `**negrito**` que vira link de item, `@video id | legenda`, `@shot id | legenda`). `soon: true` num guia marca "em breve".
- `categories`, `types`, `sourceNames`, `shopCategories`, `cosmeticCategories`, `cosmeticTiers`, `missions` (nome EN e correções do PT), `missionNpcs`, `keys` — rótulos PT/EN.
- `soon` — o que só existe no servidor local (ver abaixo).

Item novo no jogo sem texto curado: o gerador usa o nome/descrição do `havok_translations`, cria o `id` pelo nome em inglês e avisa (`itens novos sem texto curado`). Escreva a entrada em `items` e rode de novo.

## "Em breve" (só no servidor local)

Os scripts que sobem para o HeavyHost vão compilados e cifrados, então a comparação usa o que é aberto em `~/MTA-Server/build/deploy-heavyhost/`:

1. resources que não estão no pacote do oficial (`deathmatch/resources/[HAVOK]/[dependencies]` + `atualizacao-*/LISTA.txt`) → tudo que vem deles é `soon` (hoje: `havok_backpacks`, `havok_custom`, `havok_walkie`);
2. item cujo ícone não está nas imagens do gamemode que subiu (`atualizacao-*/resources/[HAVOK]/gamemode/files/images`) → `soon` (hoje: Ghillie, Rádio Comunicador);
3. a lista manual `soon.items` do `wiki-texts.json`, para o que mudou dentro de script.

**Depois de um deploy**: o pacote novo em `build/deploy-heavyhost/atualizacao-AAAAMMDD/` com a `LISTA.txt` já tira o selo sozinho na próxima regeração. Revise também os trechos "Em breve" escritos nos guias (procure `Em breve` / `Coming soon` em `wiki-texts.json`) e o `soon: true` dos guias.

## Avisos que o gerador pode dar

- `item que não existe no jogo numa tabela de loot` — nome errado numa config de loot (hoje `Sheet Potato`/`Sheet Pumpkin` no `havok_pickups/config.lua`, que deveriam ser `Seed Potato`/`Seed Pumpkin`); o item é ignorado.
- `sem ícone no jogo` — o item fica com `icon: null` (o app mostra um desenho genérico).
- `tipo de peça desconhecido` — peça de base nova: acrescente o tipo em `PIECES` no gerador.

## O que não é automático

Os **guias** citam números (preços, danos, tempos) escritos à mão. Quando mudar algo grande no jogo (loja, VIP, upkeep, kit), releia o guia correspondente. As páginas e o selo "em breve" são desenhados pelo `app.js`; os campos novos estão documentados no topo do `data.js`.
