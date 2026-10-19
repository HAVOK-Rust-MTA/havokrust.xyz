// Chamadas REST ao Discord: token do bot só no header, sem menções acidentais, e respeito ao rate limit.

const API = 'https://discord.com/api/v10';
const TIMEOUT_MS = 8_000;
const MAX_WAIT_S = 5; // espera um 429 curto; mais que isso, desiste e o cron tenta depois

export const NO_MENTIONS = { parse: [] };

export class DiscordError extends Error {
  constructor(status, path) {
    // o caminho de webhook de interação leva o token: nunca vai para o log
    super(`discord ${status} ${String(path).replace(/\/webhooks\/(\d+)\/[^/]+/, '/webhooks/$1/***')}`);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function discordRequest(env, method, path, body, { bot = true } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HAVOK-Recruit (https://havokrust.xyz, 1.0)',
          ...(bot ? { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (attempt < 2) continue;
      throw new DiscordError(e.name === 'AbortError' ? 'timeout' : 'network', path);
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429) {
      let wait = Number(res.headers.get('Retry-After')) || 0;
      try { wait = (await res.json()).retry_after ?? wait; } catch { /* corpo vazio */ }
      if (attempt < 2 && wait <= MAX_WAIT_S) {
        await sleep(Math.ceil(wait * 1000) + 50);
        continue;
      }
      throw new DiscordError(429, path);
    }
    if (res.status >= 500 && attempt < 2) {
      await sleep(300 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new DiscordError(res.status, path);
    return res.status === 204 ? null : res.json();
  }
  throw new DiscordError('retries', path);
}

export const sendMessage = (env, channelId, message) =>
  discordRequest(env, 'POST', `/channels/${channelId}/messages`, { allowed_mentions: NO_MENTIONS, ...message });

export const editMessage = (env, channelId, messageId, message) =>
  discordRequest(env, 'PATCH', `/channels/${channelId}/messages/${messageId}`, { allowed_mentions: NO_MENTIONS, ...message });

export const deleteMessage = (env, channelId, messageId) =>
  discordRequest(env, 'DELETE', `/channels/${channelId}/messages/${messageId}`);

// resposta adiada de uma interação: edita a mensagem "pensando..." (usa o token da interação, não o do bot)
export const editOriginal = (env, interaction, message) =>
  discordRequest(env, 'PATCH', `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, { allowed_mentions: NO_MENTIONS, ...message }, { bot: false });

// DM: abre (ou reaproveita) o canal privado com a pessoa e manda a mensagem. 403 = DM fechada.
export async function sendDM(env, userId, message) {
  const channel = await discordRequest(env, 'POST', '/users/@me/channels', { recipient_id: userId });
  return sendMessage(env, channel.id, message);
}

export const addRole = (env, userId, roleId) =>
  discordRequest(env, 'PUT', `/guilds/${env.GUILD_ID}/members/${userId}/roles/${roleId}`);

export const removeRole = (env, userId, roleId) =>
  discordRequest(env, 'DELETE', `/guilds/${env.GUILD_ID}/members/${userId}/roles/${roleId}`);
