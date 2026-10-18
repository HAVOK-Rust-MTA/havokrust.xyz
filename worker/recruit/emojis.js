// Emojis do servidor do HAVOK (:verified:, :one:, :moderator:...). O Worker busca a lista pelo nome no Discord
// (os IDs mudam se alguém recriar um emoji); se não achar um, usa o emoji comum do fallback.
// Emoji de servidor só aparece em descrição e valor de campo (não em título, nome de campo, autor nem rodapé).
import { discordRequest } from './discord.js';

const TTL_MS = 10 * 60_000;
let cache = { at: 0, map: null };

export async function loadEmojis(env) {
  if (cache.map && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const list = await discordRequest(env, 'GET', `/guilds/${env.GUILD_ID}/emojis`);
    const map = {};
    for (const e of Array.isArray(list) ? list : []) {
      if (e && e.id && e.name && e.available !== false) map[e.name] = `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`;
    }
    cache = { at: Date.now(), map };
  } catch (e) {
    console.error('recruit emojis:', e.message);
    cache = { at: Date.now() - TTL_MS + 60_000, map: cache.map || {} }; // tenta de novo em 1 min
  }
  return cache.map;
}

// sem esperar o Discord (para respostas que têm prazo de 3 s): o que já estiver guardado
export const cachedEmojis = () => cache.map || {};

// em('verified', '✅') -> "<:verified:123>" ou "✅"
export const emojiPicker = (map) => (name, fallback = '') => (map && map[name]) || fallback;

export const _resetEmojis = () => { cache = { at: 0, map: null }; };
