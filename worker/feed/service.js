// Feed do Discord no site: as mensagens dos canais de anúncios / atualizações / mídia viram posts no havokrust.xyz.
//
//   /site feed adicionar canal:<#canal> aba:<Anúncios|Atualizações|Mídia>   (admin) o canal entra no feed
//   /site feed remover canal:<#canal>                                       (admin) sai, e as mensagens dele somem do site
//   /site feed listar                                                       (admin) canais, aba, última leitura e avisos
//   /site feed sincronizar                                                  (admin) relê agora, sem esperar os 10 min
//   cron (a cada 10 min)  -> GET /channels/{id}/messages?limit=30 de cada canal: grava/atualiza no D1 (discord_posts) e apaga
//                            as mensagens desse canal que sumiram da janela (apagadas no Discord). Reler também renova as
//                            URLs dos anexos, que expiram. 429 = para na hora e tenta depois do Retry-After (mín. 1 min).
//   GET /api/feed?tab=anuncios|atualizacoes|midia&limit=20   público (CORS do site), cache de 60 s
//
// Canais em bot_settings 'feed.channels' ([{id, tab}]); estado do cron em 'feed.state'. Precisa do intent
// "Message Content" ligado no Developer Portal: sem ele o Discord manda o texto vazio (o /site feed listar avisa).
import { NO_MENTIONS, DiscordError, editOriginal } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';

const API = 'https://discord.com/api/v10';
const EPHEMERAL = 64;
const SNOWFLAKE = /^\d{17,20}$/;
const WINDOW = 30;               // mensagens relidas por canal
const EVERY_S = 600;             // 10 min entre leituras
const MIN_RETRY_S = 60;          // depois de um 429
const TIMEOUT_MS = 8_000;
const MAX_CHANNELS = 10;
const KEY = { channels: 'feed.channels', state: 'feed.state' };
export const TABS = { anuncios: 'Anúncios', atualizacoes: 'Atualizações', midia: 'Mídia' };
const nowS = () => Math.floor(Date.now() / 1000);

// //------------------- CONFIGURAÇÕES (bot_settings) -------------------\\
const getJson = async (db, key, fallback) => {
  const row = await db.prepare('SELECT value FROM bot_settings WHERE key = ?').bind(key).first();
  try { return row ? JSON.parse(row.value) : fallback; } catch { return fallback; }
};
const setJson = (db, key, value) => db.prepare(
  'INSERT INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
).bind(key, JSON.stringify(value), nowS()).run();
const loadChannels = async (db) => (await getJson(db, KEY.channels, [])).filter((c) => c && SNOWFLAKE.test(String(c.id)) && TABS[c.tab]);

// //------------------- MENSAGEM DO DISCORD -> POST DO SITE -------------------\\
const unix = (iso) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
};
const https = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);
const str = (s, max) => (typeof s === 'string' ? s.slice(0, max) : '');
const avatarOf = (a) => {
  if (!a || !SNOWFLAKE.test(String(a.id))) return null;
  if (a.avatar) return `https://cdn.discordapp.com/avatars/${a.id}/${a.avatar}.${String(a.avatar).startsWith('a_') ? 'gif' : 'png'}?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(a.id) >> 22n) % 6}.png`;
};
const kindOf = (ct) => (/^image\//.test(ct || '') ? 'image' : /^video\//.test(ct || '') ? 'video' : /^audio\//.test(ct || '') ? 'audio' : 'file');
const hexColor = (c) => (Number.isInteger(c) && c >= 0 && c <= 0xffffff ? '#' + c.toString(16).padStart(6, '0') : null);

// menções de usuário viram @nome (o id da pessoa não vai para o site); cargo vira @cargo
function cleanContent(m) {
  const names = new Map((m.mentions || []).map((u) => [String(u.id), u.global_name || u.username || 'alguém']));
  return str(m.content, 4000)
    .replace(/<@!?(\d{17,20})>/g, (_, id) => `@${names.get(id) || 'alguém'}`)
    .replace(/<@&\d{17,20}>/g, '@cargo');
}

export function toPost(m, tab) {
  const a = m.author || {};
  return {
    id: String(m.id),
    channel_id: String(m.channel_id),
    tab,
    author_name: str(a.global_name || a.username || 'HAVOK', 80),
    author_avatar: avatarOf(a),
    content: cleanContent(m),
    embeds: (m.embeds || []).slice(0, 10).map((e) => ({
      title: str(e.title, 256) || null,
      description: str(e.description, 4096) || null,
      url: https(e.url),
      image: https((e.image && e.image.url) || (e.thumbnail && e.thumbnail.url)),
      color: hexColor(e.color),
    })),
    attachments: (m.attachments || []).slice(0, 10).filter((x) => https(x.url)).map((x) => ({
      url: x.url, type: kindOf(x.content_type), name: str(x.filename, 120),
      width: Number.isInteger(x.width) ? x.width : null, height: Number.isInteger(x.height) ? x.height : null,
    })),
    reactions: (m.reactions || []).slice(0, 20).map((r) => {
      const e = r.emoji || {};
      return {
        emoji: str(e.name, 64),
        url: e.id && SNOWFLAKE.test(String(e.id)) ? `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'webp'}?size=48` : null,
        count: Number.isInteger(r.count) ? r.count : 0,
      };
    }),
    created_at: unix(m.timestamp) ?? 0,
    edited_at: unix(m.edited_timestamp),
  };
}

// mensagem de usuário/bot (0) ou resposta (19); entrou-no-servidor, fixou etc. ficam fora
const isPostable = (m) => m && SNOWFLAKE.test(String(m.id)) && (m.type === 0 || m.type === 19);
// Discord sem o intent Message Content: chega tudo vazio (sem texto, embed nem anexo)
const looksEmpty = (m) => !m.content && !(m.embeds || []).length && !(m.attachments || []).length && !(m.sticker_items || []).length;

// //------------------- LEITURA NO DISCORD -------------------\\
class RateLimited extends Error {
  constructor(retry) { super('discord 429'); this.retry = retry; }
}

// sem esperar e sem insistir (o cron roda de novo): 429 -> RateLimited; outro erro -> DiscordError
async function fetchMessages(env, channel) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const path = `/channels/${channel}/messages?limit=${WINDOW}`;
  let res;
  try {
    res = await fetch(API + path, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, Accept: 'application/json', 'User-Agent': 'HAVOK-Feed (https://havokrust.xyz, 1.0)' },
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new DiscordError(e.name === 'AbortError' ? 'timeout' : 'network', path);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) {
    let wait = Number(res.headers.get('Retry-After')) || 0;
    try { wait = Number((await res.json()).retry_after) || wait; } catch { /* corpo vazio */ }
    throw new RateLimited(wait);
  }
  if (!res.ok) throw new DiscordError(res.status, path);
  const list = await res.json();
  if (!Array.isArray(list)) throw new DiscordError('bad-body', path);
  return list;
}

async function syncChannel(env, { id, tab }) {
  const list = await fetchMessages(env, id);
  const now = nowS();
  const posts = list.filter(isPostable).map((m) => toPost(m, tab));
  const empty = list.filter(isPostable).filter(looksEmpty).length;
  const db = env.DB;
  const stmts = posts.map((p) => db.prepare(
    `INSERT INTO discord_posts (id, channel_id, tab, author_name, author_avatar, content, embeds, attachments, reactions, created_at, edited_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET channel_id = excluded.channel_id, tab = excluded.tab, author_name = excluded.author_name,
       author_avatar = excluded.author_avatar, content = excluded.content, embeds = excluded.embeds, attachments = excluded.attachments,
       reactions = excluded.reactions, created_at = excluded.created_at, edited_at = excluded.edited_at, updated_at = excluded.updated_at`,
  ).bind(p.id, p.channel_id, p.tab, p.author_name, p.author_avatar, p.content, JSON.stringify(p.embeds), JSON.stringify(p.attachments),
    JSON.stringify(p.reactions), p.created_at, p.edited_at, now));

  // apagadas: o que está no banco dentro da janela lida e não veio. Janela cheia = da mais velha que veio para cima;
  // janela incompleta = o canal inteiro (o Discord mandou tudo o que tem).
  const seen = new Set(list.map((m) => String(m.id)));
  const oldest = list.length >= WINDOW ? list.reduce((min, m) => (BigInt(m.id) < min ? BigInt(m.id) : min), BigInt(list[0].id)) : null;
  const { results } = await db.prepare('SELECT id FROM discord_posts WHERE channel_id = ?').bind(id).all();
  for (const r of results) {
    if (seen.has(r.id) || (oldest !== null && BigInt(r.id) < oldest)) continue;
    stmts.push(db.prepare('DELETE FROM discord_posts WHERE id = ?').bind(r.id));
  }
  if (stmts.length) await db.batch(stmts);
  return { count: posts.length, empty };
}

// lê os canais; sem force, só se passaram 10 min da última leitura (e o Retry-After de um 429)
export async function feedCron(env, { force = false } = {}) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return 'off';
  const state = await getJson(env.DB, KEY.state, {});
  const now = nowS();
  if (!force && ((state.lastSync && now - state.lastSync < EVERY_S) || (state.retryAt && now < state.retryAt))) return 'cedo';
  const channels = await loadChannels(env.DB);
  const report = { ...(state.channels || {}) };
  let result = 'ok';
  for (const c of channels) {
    try {
      const r = await syncChannel(env, c);
      report[c.id] = { at: now, count: r.count, empty: r.empty };
    } catch (e) {
      if (e instanceof RateLimited) {
        state.retryAt = now + Math.max(MIN_RETRY_S, Math.ceil(e.retry));
        result = 'limite';
        break;
      }
      console.error('feed:', c.id, e.message);
      report[c.id] = { ...(report[c.id] || {}), error: e instanceof DiscordError && (e.status === 403 || e.status === 404) ? 'sem acesso' : 'falhou', errorAt: now };
    }
  }
  // só os canais que ainda estão no feed
  state.channels = Object.fromEntries(Object.entries(report).filter(([id]) => channels.some((c) => c.id === id)));
  if (result === 'ok') {
    state.lastSync = now;
    state.retryAt = 0;
  }
  await setJson(env.DB, KEY.state, state);
  return result;
}

// //------------------- /site feed -------------------\\
export const FEED_COMMAND = {
  name: 'site',
  description: 'Site do HAVOK',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [{
    type: 2, name: 'feed', description: 'Canais do Discord que aparecem no feed do site',
    options: [
      { type: 1, name: 'adicionar', description: 'Põe um canal no feed (ou troca a aba dele)',
        options: [
          { type: 7, name: 'canal', description: 'Canal', channel_types: [0, 5], required: true },
          { type: 3, name: 'aba', description: 'Aba do site', required: true, choices: Object.entries(TABS).map(([value, name]) => ({ name, value })) },
        ] },
      { type: 1, name: 'remover', description: 'Tira um canal do feed (as mensagens dele somem do site)',
        options: [{ type: 7, name: 'canal', description: 'Canal', channel_types: [0, 5], required: true }] },
      { type: 1, name: 'listar', description: 'Canais do feed, última leitura e avisos' },
      { type: 1, name: 'sincronizar', description: 'Relê os canais agora' },
    ],
  }],
};

export const isSiteInteraction = (i) => i.type === 2 && i.data && i.data.name === 'site';

const respond = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const reply = (content) => respond({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } });

async function listText(env) {
  const channels = await loadChannels(env.DB);
  if (!channels.length) return 'Nenhum canal no feed. Use `/site feed adicionar`.';
  const state = await getJson(env.DB, KEY.state, {});
  const info = state.channels || {};
  const lines = channels.map((c) => {
    const s = info[c.id] || {};
    const read = s.at ? ` · lido <t:${s.at}:R> (${s.count} mensagens)` : ' · ainda não lido';
    return `<#${c.id}> → ${TABS[c.tab]}${read}${s.error && (!s.at || s.errorAt >= s.at) ? ` · ⚠️ ${s.error === 'sem acesso' ? 'sem acesso (o bot precisa ver o canal e ler o histórico)' : 'última leitura falhou'}` : ''}`;
  });
  if (channels.some((c) => info[c.id] && info[c.id].empty > 0)) {
    lines.push('⚠️ Mensagens chegaram vazias: ligue o intent **Message Content** no Developer Portal (Bot → Privileged Gateway Intents).');
  }
  if (state.retryAt && nowS() < state.retryAt) lines.push(`⏳ Limite do Discord: próxima leitura <t:${state.retryAt}:R>.`);
  return lines.join('\n');
}

export async function handleSiteCommand(env, i, ctx, { isAdmin }) {
  if (!env.DB) return reply('O banco (D1) não está configurado.');
  if (!isAdmin(env, i.member)) return reply('Você não tem permissão para fazer isso.');
  if (!(await claimInteraction(env.DB, String(i.id)))) return reply('Esta ação já foi processada.');
  const group = (i.data.options || [])[0] || {};
  const sub = (group.options || [])[0] || {};
  if (group.name !== 'feed') return reply('Comando desconhecido.');
  const opt = (name) => (sub.options || []).find((o) => o.name === name)?.value;
  const db = env.DB;
  try {
    switch (sub.name) {
      case 'adicionar': {
        const id = String(opt('canal') || '');
        const tab = String(opt('aba') || '');
        if (!SNOWFLAKE.test(id)) return reply('Canal inválido.');
        if (!TABS[tab]) return reply('Aba inválida: use Anúncios, Atualizações ou Mídia.');
        const list = (await loadChannels(db)).filter((c) => c.id !== id);
        if (list.length >= MAX_CHANNELS) return reply(`No máximo ${MAX_CHANNELS} canais no feed.`);
        list.push({ id, tab });
        await setJson(db, KEY.channels, list);
        await db.prepare('UPDATE discord_posts SET tab = ? WHERE channel_id = ?').bind(tab, id).run();
        return reply(`<#${id}> entra no feed do site na aba **${TABS[tab]}**. Aparece na próxima leitura (até 10 min) ou já com \`/site feed sincronizar\`.`);
      }
      case 'remover': {
        const id = String(opt('canal') || '');
        const list = await loadChannels(db);
        if (!list.some((c) => c.id === id)) return reply(`<#${id}> não está no feed.`);
        await setJson(db, KEY.channels, list.filter((c) => c.id !== id));
        await db.prepare('DELETE FROM discord_posts WHERE channel_id = ?').bind(id).run();
        return reply(`<#${id}> removido do feed; as mensagens dele saíram do site.`);
      }
      case 'listar':
        return reply(await listText(env));
      case 'sincronizar':
        ctx.waitUntil(feedCron(env, { force: true })
          .then(async (r) => (r === 'limite' ? 'O Discord pediu para esperar (limite). Tento de novo sozinho em instantes.' : `Sincronizado.\n${await listText(env)}`))
          .catch((e) => { console.error('feed sync:', e.message); return 'Não consegui agora. Tente de novo em instantes.'; })
          .then((content) => editOriginal(env, i, { content }))
          .catch((e) => console.error('feed followup:', e.message)));
        return respond({ type: 5, data: { flags: EPHEMERAL } });
      default:
        return reply('Comando desconhecido.');
    }
  } catch (e) {
    console.error('site command:', e.message);
    return reply('Não consegui agora. Tente de novo em instantes.');
  }
}

// //------------------- GET /api/feed -------------------\\
function cors(request, env) {
  const origin = request.headers.get('Origin');
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !list.includes(origin)) return { Vary: 'Origin' };
  return { Vary: 'Origin', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' };
}
const json = (body, status, headers) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...headers },
});
const parse = (s) => { try { return JSON.parse(s); } catch { return []; } };
const iso = (t) => (t ? new Date(t * 1000).toISOString() : null);

async function feedBody(env, tab, limit) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM discord_posts WHERE tab = ? ORDER BY created_at DESC, id DESC LIMIT ?',
  ).bind(tab, limit).all();
  return {
    tab,
    posts: results.map((r) => ({
      id: r.id,
      url: `https://discord.com/channels/${env.GUILD_ID}/${r.channel_id}/${r.id}`,
      author: { name: r.author_name, avatar: r.author_avatar },
      content: r.content,
      embeds: parse(r.embeds),
      attachments: parse(r.attachments),
      reactions: parse(r.reactions),
      createdAt: iso(r.created_at),
      editedAt: iso(r.edited_at),
    })),
  };
}

export async function handleFeedHttp(request, env, ctx, url) {
  const h = cors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, h);
  if (!env.DB) return json({ error: 'unavailable' }, 503, h);
  const tab = url.searchParams.get('tab') || 'anuncios';
  if (!TABS[tab]) return json({ error: 'bad_tab' }, 400, h);
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit'), 10) || 20));
  const cacheHeaders = { 'Cache-Control': 'public, max-age=60' };
  // cache de borda: a mesma URL (aba + limite) vai ao banco no máximo 1x por minuto; o CORS é de quem pediu
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`https://cache.havok/api/feed?tab=${tab}&limit=${limit}`);
  if (cache) {
    const hit = await cache.match(key).catch(() => null);
    if (hit) return json(await hit.json(), 200, { ...h, ...cacheHeaders });
  }
  try {
    const body = await feedBody(env, tab, limit);
    if (cache) {
      const put = cache.put(key, new Response(JSON.stringify(body), { headers: cacheHeaders })).catch(() => {});
      if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
    }
    return json(body, 200, { ...h, ...cacheHeaders });
  } catch (e) {
    console.error('feed:', e.message);
    return json({ error: 'unavailable' }, 502, h);
  }
}
