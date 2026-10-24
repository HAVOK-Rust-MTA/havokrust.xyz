// O próprio Worker registra os comandos (/staff e /waitinglist) com o token que ele já tem: ninguém precisa rodar nada.
// Roda no cron; só chama o Discord quando a definição do comando mudou (hash guardado no Cache API, 30 dias).
import { discordRequest } from './discord.js';
import { STAFF_COMMAND } from './commands.js';
import { WAITLIST_COMMAND } from '../waitlist/commands.js';
import { WIPE_COMMAND } from '../wipe/service.js';
import { REPORT_COMMAND } from '../reports/service.js';
import { TICKET_COMMAND } from '../tickets/service.js';

export const ALL_COMMANDS = [STAFF_COMMAND, WAITLIST_COMMAND, WIPE_COMMAND, REPORT_COMMAND, TICKET_COMMAND];

const SNOWFLAKE = /^\d{17,20}$/;
let doneHash = null; // já conferido neste isolate

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ensureCommands(env) {
  if (!SNOWFLAKE.test(String(env.DISCORD_APPLICATION_ID || ''))) return 'sem DISCORD_APPLICATION_ID';
  const hash = await sha(`${env.DISCORD_APPLICATION_ID}:${env.GUILD_ID}:${JSON.stringify(ALL_COMMANDS)}`);
  if (doneHash === hash) return 'ok';
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`https://cache.havok/recruit-command/${hash}`);
  if (cache && await cache.match(key).catch(() => null)) {
    doneHash = hash;
    return 'ok';
  }
  // POST cria ou sobrescreve cada comando pelo nome (não mexe em outros comandos do app)
  for (const command of ALL_COMMANDS) {
    await discordRequest(env, 'POST', `/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.GUILD_ID}/commands`, command);
  }
  doneHash = hash;
  if (cache) await cache.put(key, new Response('1', { headers: { 'Cache-Control': 'max-age=2592000' } })).catch(() => {});
  console.log('comandos registrados: ' + ALL_COMMANDS.map((c) => '/' + c.name).join(' '));
  return 'registered';
}

export const _resetCommands = () => { doneHash = null; };
