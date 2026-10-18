// Lista de espera no Discord: UMA mensagem do bot com a fila completa (status) + o convite + o botão de entrar.
//
// - Antes o status era uma mensagem de webhook (WAITLIST_MESSAGE_ID). Botão em mensagem de webhook comum não funciona,
//   e duas mensagens separadas podem ficar longe uma da outra no canal. Agora é uma mensagem só, do bot.
// - A ORDEM DA FILA é preservada: o painel novo começa com a ordem guardada no painel antigo do webhook.
//   Enquanto o painel do bot não existir, o cron continua atualizando o do webhook como antes.
// - O botão dá o cargo ROLE_ID ("Early Survivor" no servidor). Vanguard / Pioneer / Early Survivor do painel são as
//   posições 1–15 da fila, não cargos.
// - IDs do painel ficam no D1 (bot_settings), então sobrevivem a deploys.
import { discordRequest, sendMessage, editMessage, deleteMessage, editOriginal, NO_MENTIONS, DiscordError } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';
import { loadEmojis } from '../recruit/emojis.js';
import { progress, updatePanel, roleMembers, orderQueue, idsFromEmbed, buildEmbed, signature, readFirst, readFirstFromEmbed } from '../panel.js';

export const JOIN_ID = 'waitlist:join';
const SNOWFLAKE = /^\d{17,20}$/;
const EPHEMERAL = 64;
const MANAGE_ROLES = 1n << 28n;
const ADMINISTRATOR = 1n << 3n;
const REFRESH_GAP_S = 15; // depois de um clique, atualiza o painel na hora no máximo a cada 15 s (o cron cobre o resto)
const ROLE_NAME = 'Early Survivor'; // nome do cargo ROLE_ID no servidor (só para os textos)

const KEY = {
  channel: 'waitlist.join.channel',
  message: 'waitlist.join.message',
  refresh: 'waitlist.refresh.at',
  goal: 'waitlist.goal_reached_at',
};

export const TEXT = {
  joined: '✅ **YOU\'RE ON THE WAITING LIST!**\nYou have successfully received your waiting list role.\nYour position will appear in the official list.\n\n'
    + '✅ **VOCÊ ESTÁ NA LISTA DE ESPERA!**\nVocê recebeu seu cargo da lista de espera com sucesso.\nSua posição aparecerá na lista oficial.',
  already: 'ℹ️ **YOU\'RE ALREADY REGISTERED!**\nYou are already on the HAVOK waiting list.\n\n'
    + 'ℹ️ **VOCÊ JÁ ESTÁ INSCRITO!**\nVocê já faz parte da lista de espera do HAVOK.',
  error: '❌ **SOMETHING WENT WRONG!**\nWe couldn\'t complete your registration. Please try again later.\n\n'
    + '❌ **OCORREU UM ERRO!**\nNão conseguimos concluir sua inscrição. Tente novamente mais tarde.',
  repeated: 'ℹ️ This action was already processed. · Esta ação já foi processada.',
  notAllowed: 'Você não tem permissão para fazer isso.',
};

const nowS = () => Math.floor(Date.now() / 1000);
const goalOf = (env) => Math.max(1, parseInt(env.GOAL, 10) || 125);

// //------------------- CONFIGURAÇÕES (D1) -------------------\\
const getSetting = async (db, key) => (await db.prepare('SELECT value FROM bot_settings WHERE key = ?').bind(key).first())?.value ?? null;
const setSetting = (db, key, value) => db.prepare(
  'INSERT INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
).bind(key, String(value), nowS()).run();
const deleteSettings = (db, keys) => db.batch(keys.map((k) => db.prepare('DELETE FROM bot_settings WHERE key = ?').bind(k)));

// reserva a atualização imediata: só um clique a cada REFRESH_GAP_S consegue (uma instrução só, sem corrida)
async function claimRefresh(db) {
  const t = nowS();
  const r = await db.prepare(
    `INSERT INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
     WHERE CAST(bot_settings.value AS INTEGER) <= ?`,
  ).bind(KEY.refresh, String(t), t, t - REFRESH_GAP_S).run();
  return r.meta.changes === 1;
}

// //------------------- PAINEL (fila + convite + botão) -------------------\\
// emoji do botão: o :member: do servidor se existir, senão 🎟️
function buttonEmoji(map) {
  const m = String((map && map.member) || '').match(/^<(a?):(\w+):(\d+)>$/);
  return m ? { id: m[3], name: m[2], animated: m[1] === 'a' } : { name: '🎟️' };
}

// o convite: compromisso, não propaganda. A contagem e a barra estão no embed da fila, logo acima.
export function joinEmbed(n, goal) {
  const reached = n >= goal
    ? '\n\n🎯 **Meta alcançada · Goal reached.** A lista continua aberta · The list stays open.'
    : '';
  return {
    title: '🎟️ ENTRAR NA LISTA · JOIN THE LIST',
    color: 0xff6a00,
    description:
      '🇧🇷 **Só entre se você vai jogar no dia da inauguração.**\n'
      + `Esta lista define a data: o servidor abre quando **${goal}** pessoas confirmarem que vão estar lá. `
      + `Clique no botão para receber o cargo **${ROLE_NAME}** e entrar na fila acima.\n\n`
      + '🇺🇸 **Only join if you will actually play on launch day.**\n'
      + `This list sets the launch date: the server opens when **${goal}** people confirm they will be there. `
      + `Click the button to get the **${ROLE_NAME}** role and join the queue above.`
      + reached,
  };
}

export function panelMessage(statusEmbed, n, goal, emojis = {}) {
  return {
    content: '',
    embeds: [statusEmbed, joinEmbed(n, goal)],
    components: [{ type: 1, components: [{ type: 2, style: 1, custom_id: JOIN_ID, label: 'Entrar na lista · Join the list', emoji: buttonEmoji(emojis) }] }],
  };
}

async function webhookMessage(env) {
  const url = `${String(env.WAITLIST_WEBHOOK).replace(/\/$/, '')}/messages/${env.WAITLIST_MESSAGE_ID}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HAVOK-Waitlist (https://havokrust.xyz, 1.0)' } });
  if (!res.ok) throw new DiscordError(res.status, '/webhooks/0/x/messages'); // o link do webhook nunca vai para o log
  return res.json();
}

// ordem guardada no painel antigo (webhook), para o painel novo começar com a MESMA fila
async function legacyOrder(env) {
  if (!env.WAITLIST_WEBHOOK || !env.WAITLIST_MESSAGE_ID) return [];
  const msg = await webhookMessage(env).catch(() => null);
  return idsFromEmbed(msg && msg.embeds && msg.embeds[0]);
}

const panelIds = async (db) => {
  const [channel, message] = await Promise.all([getSetting(db, KEY.channel), getSetting(db, KEY.message)]);
  return channel && message ? { channel, message } : null;
};

async function noteGoal(env, n, goal) {
  if (n >= goal && !(await getSetting(env.DB, KEY.goal))) {
    await setSetting(env.DB, KEY.goal, nowS());
    console.log(`waitlist: meta de ${goal} alcançada (${n} inscritos)`); // só registra; o servidor NÃO é iniciado sozinho
  }
}

// uma rodada: lê os membros com o cargo e o painel, e edita SÓ se algo mudou (nunca cria mensagem)
export async function refreshWaitlist(env, { force = false } = {}) {
  const ids = env.DB ? await panelIds(env.DB) : null;
  if (!ids) return { status: await updatePanel(env), count: null }; // ainda sem o painel do bot: segue o do webhook
  const goal = goalOf(env);
  let current;
  try {
    current = await discordRequest(env, 'GET', `/channels/${ids.channel}/messages/${ids.message}`);
  } catch (e) {
    if (e instanceof DiscordError && e.status === 404) {
      await deleteSettings(env.DB, [KEY.channel, KEY.message]);
      console.error('waitlist: o painel não existe mais no Discord (use /waitinglist setup)');
      return { status: 'gone', count: null };
    }
    throw e;
  }
  const prev = current && current.embeds && current.embeds[0];
  let order = idsFromEmbed(prev);
  if (!order.length) order = await legacyOrder(env);
  const queue = orderQueue(order, await roleMembers(env));
  await noteGoal(env, queue.length, goal);
  const status = buildEmbed(queue, goal);
  const sameButton = JSON.stringify((current.components || [])[0]?.components?.[0]?.custom_id) === JSON.stringify(JOIN_ID);
  if (!force && sameButton && current.embeds && current.embeds.length === 2 && signature(prev) === signature(status)) {
    return { status: 'same', count: queue.length };
  }
  status.timestamp = new Date().toISOString();
  await editMessage(env, ids.channel, ids.message, panelMessage(status, queue.length, goal, await loadEmojis(env)));
  return { status: 'updated', count: queue.length };
}

// os 15 primeiros para o mural do site: do painel do bot, ou do webhook enquanto ele não existir
export async function readFirstWaitlist(env) {
  const ids = env.DB ? await panelIds(env.DB).catch(() => null) : null;
  if (!ids) return readFirst(env);
  const msg = await discordRequest(env, 'GET', `/channels/${ids.channel}/messages/${ids.message}`);
  return readFirstFromEmbed(msg && msg.embeds && msg.embeds[0]);
}

// //------------------- BOTÃO -------------------\\
async function joinClick(env, i) {
  const role = String(env.ROLE_ID);
  const user = i.member.user;
  // a interação já traz os cargos do membro (assinada pelo Discord): quem já tem não gasta chamada nenhuma
  if ((i.member.roles || []).includes(role)) return { text: TEXT.already, joined: false };
  try {
    // PUT é idempotente: dois cliques ao mesmo tempo dão o cargo uma vez só
    await discordRequest(env, 'PUT', `/guilds/${env.GUILD_ID}/members/${user.id}/roles/${role}`);
    const member = await discordRequest(env, 'GET', `/guilds/${env.GUILD_ID}/members/${user.id}`);
    if (!member || !(member.roles || []).includes(role)) {
      console.error('waitlist: o Discord aceitou, mas o cargo não apareceu no membro');
      return { text: TEXT.error, joined: false };
    }
    return { text: TEXT.joined, joined: true };
  } catch (e) {
    if (e instanceof DiscordError && e.status === 403) {
      console.error(`waitlist: SEM PERMISSÃO para dar o cargo ${ROLE_NAME}. O bot precisa de "Gerenciar cargos" e o cargo do bot `
        + `precisa ficar ACIMA do cargo ${ROLE_NAME} (Configurações do servidor → Cargos → arraste o cargo do bot para cima).`);
    } else {
      console.error('waitlist join:', e.message);
    }
    return { text: TEXT.error, joined: false };
  }
}

// //------------------- /waitinglist setup | refresh -------------------\\
// confere se o bot consegue dar o cargo: "Gerenciar cargos" e cargo do bot acima do cargo da lista
export async function roleProblems(env, botId) {
  const [roles, me] = await Promise.all([
    discordRequest(env, 'GET', `/guilds/${env.GUILD_ID}/roles`),
    discordRequest(env, 'GET', `/guilds/${env.GUILD_ID}/members/${botId}`),
  ]);
  const byId = new Map(roles.map((r) => [r.id, r]));
  const target = byId.get(String(env.ROLE_ID));
  if (!target) return ['o cargo da lista (ROLE_ID) não existe no servidor'];
  const mine = [byId.get(env.GUILD_ID), ...(me.roles || []).map((id) => byId.get(id))].filter(Boolean);
  const perms = mine.reduce((acc, r) => acc | BigInt(r.permissions || '0'), 0n);
  const top = Math.max(0, ...mine.map((r) => r.position || 0));
  const out = [];
  if (!(perms & MANAGE_ROLES) && !(perms & ADMINISTRATOR)) out.push('o bot não tem a permissão **Gerenciar cargos**');
  if (top <= target.position) out.push(`o cargo do bot está ABAIXO do cargo **${target.name}**: em Configurações → Cargos, arraste o cargo do bot para cima dele`);
  return out;
}

// publica (ou atualiza) o painel único. replaceOld = apagar o painel antigo do webhook (só com confirmação explícita)
async function setup(env, i, replaceOld) {
  const notes = [];
  const problems = await roleProblems(env, i.application_id).catch((e) => [`não consegui conferir as permissões (${e.message})`]);
  if (problems.length) notes.push(`⚠️ O botão ainda não vai conseguir dar o cargo: ${problems.join('; ')}.`);

  const legacy = env.WAITLIST_WEBHOOK && SNOWFLAKE.test(String(env.WAITLIST_MESSAGE_ID || '')) ? await webhookMessage(env).catch(() => null) : null;
  let ids = await panelIds(env.DB);
  if (ids) {
    const alive = await discordRequest(env, 'GET', `/channels/${ids.channel}/messages/${ids.message}`).then(() => true).catch((e) => {
      if (e instanceof DiscordError && e.status === 404) return false;
      throw e;
    });
    if (!alive) ids = null;
  }
  let head;
  if (ids) {
    const r = await refreshWaitlist(env, { force: true });
    head = `✅ O painel já existe em <#${ids.channel}> e foi atualizado (fila + botão numa mensagem só). Inscritos: **${r.count}**.`;
  } else {
    // painel novo, no canal do painel antigo (ou neste canal), começando com a MESMA ordem da fila
    const channel = (legacy && legacy.channel_id) || i.channel_id;
    const goal = goalOf(env);
    const queue = orderQueue(idsFromEmbed(legacy && legacy.embeds && legacy.embeds[0]), await roleMembers(env));
    await noteGoal(env, queue.length, goal);
    const status = buildEmbed(queue, goal);
    status.timestamp = new Date().toISOString();
    const sent = await sendMessage(env, channel, panelMessage(status, queue.length, goal, await loadEmojis(env)));
    await setSetting(env.DB, KEY.channel, channel);
    await setSetting(env.DB, KEY.message, sent.id);
    ids = { channel, message: sent.id };
    head = `✅ Painel publicado em <#${channel}>: fila + botão numa mensagem só, com a mesma ordem de antes. Inscritos: **${queue.length}**.`;
  }
  if (legacy && legacy.id !== ids.message) {
    if (replaceOld) {
      const url = `${String(env.WAITLIST_WEBHOOK).replace(/\/$/, '')}/messages/${env.WAITLIST_MESSAGE_ID}`;
      const del = await fetch(url, { method: 'DELETE', headers: { 'User-Agent': 'HAVOK-Waitlist (https://havokrust.xyz, 1.0)' } });
      notes.push(del.ok || del.status === 404 ? '🗑️ Painel antigo (webhook) apagado.' : `⚠️ Não consegui apagar o painel antigo (Discord ${del.status}); apague à mão.`);
    } else {
      notes.push('ℹ️ O painel antigo (webhook) parou de ser atualizado. Apague à mão, ou rode `/waitinglist setup apagar_antigo:true`.');
    }
  }
  return [head, ...notes].join('\n');
}

// //------------------- ENTRADA (chamada pelo roteador de interações) -------------------\\
const respond = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const privateText = (content) => respond({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } });

export const isWaitlistInteraction = (i) =>
  (i.type === 2 && i.data && i.data.name === 'waitinglist') || (i.type === 3 && String((i.data && i.data.custom_id) || '').startsWith('waitlist:'));

export async function handleWaitlist(env, i, ctx, { isAdmin }) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN || !SNOWFLAKE.test(String(env.ROLE_ID || ''))) {
    console.error('waitlist config: precisa de DB, DISCORD_BOT_TOKEN e ROLE_ID');
    return privateText(TEXT.error);
  }
  try {
    if (!(await claimInteraction(env.DB, String(i.id)))) return privateText(TEXT.repeated);
  } catch (e) {
    console.error('waitlist:', e.message);
    return privateText(TEXT.error);
  }

  if (i.type === 3) {
    if (i.data.custom_id !== JOIN_ID) return privateText(TEXT.error);
    // responde na hora ("pensando...", só para quem clicou) e termina em segundo plano: o Discord só espera 3 s
    ctx.waitUntil((async () => {
      const r = await joinClick(env, i);
      await editOriginal(env, i, { content: r.text }).catch((e) => console.error('waitlist followup:', e.message));
      // painéis na hora (no máximo 1 vez a cada 15 s); se falhar, o cron do próximo minuto atualiza. O cargo já foi dado.
      if (r.joined && await claimRefresh(env.DB).catch(() => false)) {
        await refreshWaitlist(env).catch((e) => console.error('waitlist refresh:', e.message));
      }
    })());
    return respond({ type: 5, data: { flags: EPHEMERAL } });
  }

  if (!isAdmin(env, i.member)) return privateText(TEXT.notAllowed);
  const sub = (i.data.options || [])[0] || {};
  const replaceOld = (sub.options || []).find((o) => o.name === 'apagar_antigo')?.value === true;
  ctx.waitUntil((async () => {
    let content;
    try {
      if (sub.name === 'setup') content = await setup(env, i, replaceOld);
      else if (sub.name === 'refresh') {
        const r = await refreshWaitlist(env, { force: true });
        content = `✅ Painéis atualizados. Inscritos agora: **${r.count ?? '?'}** de ${goalOf(env)}.`;
      } else content = 'Comando desconhecido.';
    } catch (e) {
      console.error('waitlist command:', e.message);
      content = e instanceof DiscordError && e.status === 403
        ? 'O bot não tem permissão nesse canal (Ver canal, Enviar mensagens, Inserir links, Ler histórico).'
        : `Não consegui agora (${e instanceof DiscordError ? `Discord ${e.status}` : 'erro interno'}). Tente de novo em instantes.`;
    }
    await editOriginal(env, i, { content }).catch((e) => console.error('waitlist followup:', e.message));
  })());
  return respond({ type: 5, data: { flags: EPHEMERAL } });
}
