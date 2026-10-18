// Painel vivo da lista de espera no canal do Discord.
// Uma mensagem só, enviada uma vez pelo webhook do canal. A cada minuto (Cron Trigger do Worker) ela é EDITADA
// com o número, a barra e a fila numerada. Nada de reenviar.
//
// A ordem da fila fica guardada no próprio painel (no link do título), então não precisa de banco:
// quem já estava continua na mesma posição; quem entrou depois vai para o fim (por ordem de entrada no servidor).
// Quem perde o cargo sai da fila.

const API = 'https://discord.com/api/v10';
const SITE = 'https://havokrust.xyz/';
const SHOW = 20; // nomes na fila; o resto vira "+ N"

const discordFetch = async (fetchImpl, url, init = {}) => {
  const res = await fetchImpl(url, { ...init, headers: { 'Content-Type': 'application/json', 'User-Agent': 'HAVOK-Waitlist (https://havokrust.xyz, 1.0)', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`discord ${res.status} ${url.replace(/\/webhooks\/\d+\/[^/]+/, '/webhooks/***')}`);
  return res.status === 204 ? null : res.json();
};

export async function roleMembers(env, fetchImpl = fetch) {
  const out = [];
  let after = '0';
  for (let page = 0; page < 10; page++) {
    const batch = await discordFetch(fetchImpl, `${API}/guilds/${env.GUILD_ID}/members?limit=1000&after=${after}`, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
    for (const m of batch) if (!m.user.bot && (m.roles || []).includes(env.ROLE_ID)) out.push(m);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out;
}

// nome visível sem markdown nem menção
const display = (m) => String(m.nick || m.user.global_name || m.user.username || '?').replace(/[\\*_~`|>#@[\]()]/g, '').trim().slice(0, 32) || '?';

export function orderQueue(previousIds, members) {
  const byId = new Map(members.map((m) => [m.user.id, m]));
  const kept = previousIds.filter((id) => byId.has(id));
  const known = new Set(kept);
  const fresh = members.filter((m) => !known.has(m.user.id))
    .sort((a, b) => String(a.joined_at || '').localeCompare(String(b.joined_at || '')) || (BigInt(a.user.id) < BigInt(b.user.id) ? -1 : 1));
  return [...kept, ...fresh.map((m) => m.user.id)].map((id) => byId.get(id));
}

export function idsFromEmbed(embed) {
  const m = String((embed && embed.url) || '').match(/[?&]wl=([\d.]+)/);
  return m ? m[1].split('.').filter(Boolean) : [];
}

// Progresso rumo à inauguração (GOAL = meta de lançamento, 125). A MESMA função desenha a barra nos dois painéis
// (status e "entrar na lista"). Passar da meta não é limite: a lista continua aceitando; só mostra 100% e 0 vagas.
// Quadrados proporcionais, com pelo menos 1 aceso se houver alguém, e a barra só enche quando a meta foi alcançada.
export function progress(n, goal, cells = 20) {
  const capped = Math.max(0, Math.min(n, goal));
  const pct = Math.min(100, Math.round((capped / goal) * 100));
  const lit = n >= goal ? cells : n <= 0 ? 0 : Math.min(cells - 1, Math.max(1, Math.round((capped / goal) * cells)));
  return { pct, left: Math.max(0, goal - n), reached: n >= goal, bar: `${'🟧'.repeat(lit)}${'⬛'.repeat(cells - lit)}  **${pct}%**` };
}

// colunas dos prêmios: #01–05, #06–10, #11–15
const TIERS = [['🔴 Vanguard', 0, 5], ['🟠 Pioneer', 5, 10], ['🟣 Early Survivor', 10, 15]];
const line = (m, i) => `\`#${String(i + 1).padStart(2, '0')}\` ${display(m)}`;

export function buildEmbed(queue, goal) {
  const n = queue.length;
  const { left, bar } = progress(n, goal);
  // guarda a ordem no link do título (limite do Discord para URL: deixa folga)
  let ids = queue.map((m) => m.user.id);
  while (ids.length && (SITE.length + 4 + ids.join('.').length) > 1900) ids = ids.slice(0, -1);
  const tierFields = TIERS.map(([name, from, to]) => {
    const rows = [];
    for (let i = from; i < to; i++) rows.push(queue[i] ? line(queue[i], i) : `\`#${String(i + 1).padStart(2, '0')}\` ─`);
    return { name, value: rows.join('\n'), inline: true };
  });
  const rest = queue.slice(15, 15 + SHOW).map((m, i) => line(m, i + 15));
  if (n > 15 + SHOW) rest.push(`+ ${n - 15 - SHOW} more · mais`);
  const fields = [
    { name: '👥 Survivors · Sobreviventes', value: `**${String(n).padStart(2, '0')}** / ${goal}`, inline: true },
    { name: '⏳ Spots left · Vagas', value: `**${left}**`, inline: true },
    { name: '🎯 Launch · Inauguração', value: `**${goal}**`, inline: true },
    { name: 'Progress · Progresso', value: bar, inline: false },
    ...tierFields,
  ];
  if (rest.length) fields.push({ name: 'Next in line · Próximos da fila', value: rest.join('\n'), inline: false });
  return {
    title: '🎟️ WAITING LIST · STATUS',
    url: `${SITE}?wl=${ids.join('.')}`,
    color: 0xff6a00,
    thumbnail: { url: `${SITE}apple-touch-icon.png` },
    description: `🇺🇸 The server launches when we reach **${goal}** survivors. Join with the button below.\n`
      + `🇧🇷 O servidor será inaugurado quando alcançarmos **${goal}** sobreviventes. Entre pelo botão abaixo.`,
    fields,
    footer: { text: '🇺🇸 Live · updates every minute  ·  🇧🇷 Ao vivo · atualiza a cada minuto' },
  };
}

// o que muda de verdade (sem horário), para só editar quando precisa
export const signature = (e) => JSON.stringify([e && e.url, e && e.description, ((e && e.fields) || []).map((f) => [f.name, f.value])]);

// onCount(n, goal): chamado com a contagem desta rodada (o painel "entrar na lista" usa a MESMA contagem)
export async function updatePanel(env, fetchImpl = fetch, { onCount } = {}) {
  if (!env.WAITLIST_WEBHOOK || !env.WAITLIST_MESSAGE_ID) return 'off';
  const goal = Math.max(1, parseInt(env.GOAL, 10) || 50);
  const msgUrl = `${env.WAITLIST_WEBHOOK.replace(/\/$/, '')}/messages/${env.WAITLIST_MESSAGE_ID}`;
  const [members, current] = await Promise.all([roleMembers(env, fetchImpl), discordFetch(fetchImpl, msgUrl)]);
  const prev = (current && current.embeds && current.embeds[0]) || null;
  const queue = orderQueue(idsFromEmbed(prev), members);
  if (onCount) await onCount(queue.length, goal);
  const embed = buildEmbed(queue, goal);
  if (signature(prev) === signature(embed)) return 'same';
  embed.timestamp = new Date().toISOString();
  await discordFetch(fetchImpl, msgUrl, { method: 'PATCH', body: JSON.stringify({ embeds: [embed] }) });
  return 'updated';
}

// os 15 primeiros da fila, lidos do próprio painel (para o mural do site)
export async function readFirst(env, fetchImpl = fetch, limit = 15) {
  if (!env.WAITLIST_WEBHOOK || !env.WAITLIST_MESSAGE_ID) return [];
  const msg = await discordFetch(fetchImpl, `${env.WAITLIST_WEBHOOK.replace(/\/$/, '')}/messages/${env.WAITLIST_MESSAGE_ID}`);
  return readFirstFromEmbed(msg && msg.embeds && msg.embeds[0], limit);
}

// os primeiros da fila a partir do embed de status (vale para o painel do webhook e o do bot)
export function readFirstFromEmbed(embed, limit = 15) {
  const fields = (embed && embed.fields) || [];
  const out = [];
  for (const f of fields) {
    for (const ln of String(f.value || '').split('\n')) {
      const m = ln.match(/^`#(\d+)`\s+(.+)$/);
      if (m && m[2].trim() !== '─') out.push({ pos: parseInt(m[1], 10), name: m[2].trim() });
    }
  }
  return out.sort((a, b) => a.pos - b.pos).slice(0, limit);
}
