// havok-site: preview (Open Graph) próprio para cada página do site quando o link é compartilhado (Discord, WhatsApp...).
//
// Fica na frente do GitHub Pages SÓ nas rotas de página (ver wrangler.toml). Para cada uma:
//   1. busca https://havokrust.xyz/index.html (esse caminho não passa pelo Worker: vai direto ao Pages) e o og-data.json;
//   2. monta título/descrição/imagem da rota (item da wiki, guia, grupo e jogador vêm de dados; o resto é texto fixo);
//   3. com HTMLRewriter troca <title>, meta description, og:*, twitter:* e o canonical, e devolve 200 com o HTML.
// Qualquer falha devolve o index.html sem trocar nada (nunca derruba o site). Assets (imagens, .js, .css, /play/...) não
// passam por aqui; se algum cair aqui por engano, vai direto para o Pages sem mexer.
// www.havokrust.xyz/* -> 301 para havokrust.xyz mantendo caminho e query.

import { handle } from './og.js';

export default { fetch: (request, env) => handle(request, env) };
