// Status do servidor no Discord: uma mensagem fixa com o IP e os jogadores online, editada sozinha pelo cron.
// Os jogadores vêm da lista pública do MTA (mtasa.com/api, a mesma do navegador de servidores do jogo, ~1 min de atraso):
// não precisa de nada no servidor de jogo.
//
//   /servidor painel   (admin) publica a mensagem neste canal; o cron passa a editar ela
//   cron (1 min)       -> lê a lista e edita a mensagem só quando algo mudou (jogadores, online/offline, senha)
import { sendMessage, editMessage, editOriginal, NO_MENTIONS, DiscordError } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';
import { BRAND, SITE, LOGO, COLORS } from '../recruit/config.js';

const EPHEMERAL = 64;
const KEY = 'status.panel';
const LIST_URL = 'https://mtasa.com/api/';
const nowS = () => Math.floor(Date.now() / 1000);
// IP:porta do servidor (SERVER_ADDR no wrangler.toml troca sem mexer no código)
const addr = (env) => String((env && env.SERVER_ADDR) || '177.54.146.12:22360');
export const serverAddr = addr;

export const STATUS_COMMAND = {
  name: 'servidor',
  description: 'Status do servidor (IP e jogadores online)',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [{ type: 1, name: 'painel', description: 'Publica a mensagem de status neste canal (atualiza sozinha)' }],
};

export const isStatusInteraction = (i) => i.type === 2 && i.data && i.data.name === 'servidor';

const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const reply = (content) => json({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } });

// procura o servidor na lista do MTA; null = não está na lista (desligado ou reiniciando)
export async function fetchServer(env) {
  const [ip, port] = addr(env).split(':');
  const res = await fetch(LIST_URL, { cf: { cacheTtl: 30, cacheEverything: true }, headers: { 'User-Agent': 'HAVOK-Status (https://havokrust.xyz, 1.0)' } });
  if (!res.ok) throw new Error(`lista do MTA: HTTP ${res.status}`);
  const list = await res.json();
  const s = Array.isArray(list) && list.find((x) => x && x.ip === ip && Number(x.port) === Number(port));
  return s ? { players: Number(s.players) || 0, max: Number(s.maxplayers) || 0, locked: !!s.password } : null;
}

const bar = (n, max) => {
  const slots = 10, full = max > 0 ? Math.min(slots, Math.round((n / max) * slots)) : 0;
  return '🟧'.repeat(n > 0 ? Math.max(1, full) : 0) + '⬛'.repeat(slots - (n > 0 ? Math.max(1, full) : 0));
};

export function statusMessage(env, s) {
  const state = !s ? { icon: '🔴', text: 'OFFLINE', color: 0x3a3632 }
    : s.locked ? { icon: '🟠', text: 'FECHADO (manutenção)', color: 0xd99a1e }
    : { icon: '🟢', text: 'ONLINE', color: COLORS.brand };
  // IP e players lado a lado, os dois em bloco (fácil de copiar no celular)
  const fields = [{ name: '🌐 IP', value: `\`\`\`${addr(env)}\`\`\``, inline: true }];
  if (s) fields.push({ name: '👥 Players', value: `\`\`\`${s.players}/${s.max}\`\`\``, inline: true }, { name: '\u200b', value: bar(s.players, s.max), inline: false });
  return {
    embeds: [{
      author: { name: BRAND, url: SITE, icon_url: LOGO },
      title: `${state.icon} ${state.text}`,
      color: state.color,
      fields,
      footer: { text: 'Atualiza sozinho · MTA:SA → Quick Connect', icon_url: LOGO },
      timestamp: new Date().toISOString(),
    }],
    allowed_mentions: NO_MENTIONS,
  };
}

// LAYOUT entra na chave: mudou o visual, o cron redesenha a mensagem que já está no canal
const LAYOUT = 2;
const viewKey = (s) => `${LAYOUT}:` + (s ? `${s.players}/${s.max}/${s.locked ? 1 : 0}` : 'off');

const loadPanel = async (db) => {
  const row = await db.prepare('SELECT value FROM bot_settings WHERE key = ?').bind(KEY).first();
  return row ? JSON.parse(row.value) : null;
};
const savePanel = (db, panel) => db.prepare(
  `INSERT INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?)
   ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
).bind(KEY, JSON.stringify(panel), nowS()).run();

export async function statusCron(env) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return 'off';
  const panel = await loadPanel(env.DB);
  if (!panel) return 'sem painel';
  const s = await fetchServer(env);
  const key = viewKey(s);
  // a lista some por 1 leitura quando o servidor reinicia: só mostra OFFLINE depois de 3 minutos fora
  if (!s) {
    panel.missing = (panel.missing || 0) + 1;
    if (panel.missing < 3) { await savePanel(env.DB, panel); return 'fora da lista'; }
  } else {
    panel.missing = 0;
  }
  if (key === panel.last) { await savePanel(env.DB, panel); return 'igual'; }
  try {
    await editMessage(env, panel.channel, panel.message, statusMessage(env, s));
  } catch (e) {
    // mensagem apagada: para de editar até alguém publicar de novo
    if (e instanceof DiscordError && e.status === 404) {
      await env.DB.prepare('DELETE FROM bot_settings WHERE key = ?').bind(KEY).run();
      return 'mensagem apagada';
    }
    throw e;
  }
  panel.last = key;
  await savePanel(env.DB, panel);
  return 'atualizado';
}

export async function handleStatus(env, i, ctx, { isAdmin }) {
  if (!env.DB) return reply('O banco (D1) não está configurado.');
  if (!isAdmin(env, i.member)) return reply('Você não tem permissão para fazer isso.');
  if (!(await claimInteraction(env.DB, String(i.id)))) return reply('Esta ação já foi processada.');
  ctx.waitUntil((async () => {
    const s = await fetchServer(env).catch(() => null);
    const msg = await sendMessage(env, i.channel_id, statusMessage(env, s));
    await savePanel(env.DB, { channel: i.channel_id, message: msg.id, last: viewKey(s), missing: 0 });
    return 'Status publicado neste canal. Ele se atualiza sozinho a cada minuto (o painel antigo, se havia, parou de ser editado).';
  })()
    .catch((e) => (e instanceof DiscordError && e.status === 403 ? 'O bot não tem permissão nesse canal (Ver canal, Enviar mensagens).' : 'Não consegui publicar agora.'))
    .then((content) => editOriginal(env, i, { content }))
    .catch((e) => console.error('status panel:', e.message)));
  return json({ type: 5, data: { flags: EPHEMERAL } });
}
