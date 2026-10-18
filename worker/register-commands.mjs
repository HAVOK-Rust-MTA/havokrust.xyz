// NÃO é mais necessário: o Worker registra o /staff sozinho no cron (recruit/register.js). Fica só como alternativa manual.
// Registra (ou atualiza) o comando /staff no servidor do HAVOK.
// Usa POST (cria ou sobrescreve só o /staff): não apaga outros comandos do app.
//
//   read -rs DISCORD_BOT_TOKEN && export DISCORD_BOT_TOKEN      # cola o token sem aparecer na tela nem no histórico
//   DISCORD_APPLICATION_ID=<id do app> node register-commands.mjs
//
// GUILD_ID vem do wrangler.toml (ou da variável de ambiente GUILD_ID).
import { readFileSync } from 'node:fs';
import { STAFF_COMMAND } from './recruit/commands.js';

const SNOWFLAKE = /^\d{17,20}$/;
const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.GUILD_ID || (readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8').match(/^GUILD_ID\s*=\s*"(\d+)"/m) || [])[1];

if (!token) throw new Error('defina DISCORD_BOT_TOKEN (veja o topo deste arquivo)');
if (!SNOWFLAKE.test(appId || '')) throw new Error('defina DISCORD_APPLICATION_ID (Developer Portal → General Information → Application ID)');
if (!SNOWFLAKE.test(guildId || '')) throw new Error('GUILD_ID não encontrado');

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: 'POST',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'HAVOK-Recruit (https://havokrust.xyz, 1.0)' },
  body: JSON.stringify(STAFF_COMMAND),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`erro ${res.status}:`, JSON.stringify(body));
  process.exit(1);
}
console.log(`/staff registrado no servidor ${guildId} (comando ${body.id}).`);
