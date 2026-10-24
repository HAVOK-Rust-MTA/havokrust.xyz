// Tickets do Discord: suporte, VIPs, sugestão e bug. Sem código: o jogador escolhe a categoria no menu, escreve o motivo
// e o bot abre um ticket privado (thread que só ele e a staff veem).
//
//   /tickets painel        (admin) publica o painel com o menu de categorias neste canal
//   menu ticket:menu (valor <tipo>) -> formulário (motivo + detalhes + nick) -> ticket:modal:<tipo> -> thread privada
//   botão ticket:claim:<id>   (só staff) -> "fulano assumiu"
//   botão ticket:close:<id>   (staff ou quem abriu) -> a thread é arquivada e trancada
//
// Limite: 1 ticket aberto de cada tipo por pessoa. O bot precisa, no canal do painel: Ver canal, Enviar mensagens,
// Criar threads privadas, Enviar mensagens em threads, Gerenciar threads (para trancar ao fechar).
import { discordRequest, sendMessage, editOriginal, NO_MENTIONS, DiscordError } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';
import { BRAND, SITE, LOGO, COLORS } from '../recruit/config.js';

const EPHEMERAL = 64;
const nowS = () => Math.floor(Date.now() / 1000);
const idList = (s) => String(s || '').split(',').map((x) => x.trim()).filter((x) => /^\d{17,20}$/.test(x));
const clip = (s, n) => String(s ?? '').replace(/[@`]/g, '').slice(0, n);

export const KINDS = {
  suporte: { emoji: '🛠️', label: 'Suporte', color: 0x4ea8ff,
    hint: 'Problema no jogo, conta, itens perdidos, dúvidas',
    reason: 'Motivo do ticket', ex: 'Ex.: perdi meus itens, não consigo entrar', details: 'Explique o que aconteceu' },
  vip: { emoji: '💎', label: 'VIPs', color: 0xffae2e,
    hint: 'Comprar VIP, pagamentos e benefícios',
    reason: 'Motivo do ticket', ex: 'Ex.: quero comprar VIP, dúvida de pagamento', details: 'Detalhes (plano, forma de pagamento...)' },
  sugestao: { emoji: '💡', label: 'Sugestão', color: 0xb07bff,
    hint: 'Ideias para melhorar o servidor',
    reason: 'Sua sugestão em uma frase', details: 'Explique a ideia e por que melhora o servidor' },
  bug: { emoji: '🐞', label: 'Bug', color: 0xe5544b,
    hint: 'Algo quebrado no jogo ou no site',
    reason: 'Qual é o bug? (uma frase)', details: 'Como acontece? Onde? Passo a passo' },
};

export const TICKET_COMMAND = {
  name: 'tickets',
  description: 'Tickets de suporte, VIPs, sugestão e bug',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [{ type: 1, name: 'painel', description: 'Publica o painel de tickets neste canal' }],
};

export const isTicketInteraction = (i) => (i.type === 2 && i.data && i.data.name === 'tickets')
  || ((i.type === 3 || i.type === 5) && String((i.data && i.data.custom_id) || '').startsWith('ticket:'));

const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const reply = (content) => json({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } });
const deferred = () => json({ type: 5, data: { flags: EPHEMERAL } });

// banner do painel: TICKET_IMAGE (https) no wrangler.toml, senão o banner próprio servido pelo Worker
// (tickets/make-banner.py -> recruit/banners.js). Trocou a imagem: suba TICKET_BANNER_VERSION.
const TICKET_BANNER_VERSION = 1;
const banner = (env) => {
  const own = String((env && env.TICKET_IMAGE) || '');
  if (/^https:\/\/\S+$/.test(own)) return own;
  const base = String((env && env.PUBLIC_URL) || '').replace(/\/+$/, '');
  return /^https:\/\/\S+$/.test(base) ? `${base}/recruit/banner-tickets.jpg?v=${TICKET_BANNER_VERSION}` : '';
};

const menu = () => ({ type: 1, components: [{
  type: 3, custom_id: 'ticket:menu', placeholder: 'Selecione uma categoria...',
  options: [
    ...Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label, description: v.hint, emoji: { name: v.emoji } })),
    { value: 'limpar', label: 'Limpar seleção', description: 'Reseta o menu (não abre nenhum ticket)', emoji: { name: '🧹' } },
  ],
}] });

export const panelMessage = (env) => ({
  embeds: [{
    author: { name: `${BRAND} · Tickets`, url: SITE, icon_url: LOGO },
    title: 'ATENDIMENTO DA STAFF',
    color: COLORS.brand,
    description: [
      'Precisa falar com a staff? **Escolha a categoria no menu abaixo**, escreva o motivo e um ticket privado é aberto só para você e a staff.',
      '',
      ...Object.values(KINDS).map((v) => `${v.emoji} **${v.label}**: ${v.hint.toLowerCase()}.`),
      '',
      'Denúncia de jogador (cheater) é no painel de **🚨 Denúncias**, com o código do jogo.',
      '',
      '_Need the staff? Pick a category, write the reason and a private ticket opens for you and the staff only._',
    ].join('\n'),
    ...(banner(env) ? { image: { url: banner(env) } } : {}),
    footer: { text: `${BRAND} · 1 ticket aberto por categoria`, icon_url: LOGO },
  }],
  components: [menu()],
});

const modal = (kind) => {
  const k = KINDS[kind];
  return {
    type: 9,
    data: {
      custom_id: `ticket:modal:${kind}`,
      title: `Ticket · ${k.label}`.slice(0, 45),
      components: [
        { type: 1, components: [{ type: 4, custom_id: 'reason', label: k.reason.slice(0, 45), style: 1, ...(k.ex ? { placeholder: k.ex } : {}), min_length: 5, max_length: 100, required: true }] },
        { type: 1, components: [{ type: 4, custom_id: 'details', label: k.details.slice(0, 45), style: 2, max_length: 1500, required: false }] },
        { type: 1, components: [{ type: 4, custom_id: 'nick', label: 'Seu nick no jogo (opcional)', style: 1, max_length: 32, required: false }] },
      ],
    },
  };
};

const field = (i, id) => {
  for (const row of (i.data && i.data.components) || []) {
    for (const c of row.components || []) {
      if (c.custom_id === id) return String(c.value || '');
    }
  }
  return '';
};

const controls = (id, claimed) => [{ type: 1, components: [
  ...(claimed ? [] : [{ type: 2, style: 1, custom_id: `ticket:claim:${id}`, label: 'Assumir', emoji: { name: '🙋' } }]),
  { type: 2, style: 4, custom_id: `ticket:close:${id}`, label: 'Fechar ticket', emoji: { name: '🔒' } },
] }];

async function openTicket(env, i, user, kind) {
  const k = KINDS[kind];
  const reason = clip(field(i, 'reason').trim(), 100);
  const details = clip(field(i, 'details').trim(), 1500);
  const nick = clip(field(i, 'nick').trim(), 32);
  if (reason.length < 5) return 'Escreva o motivo do ticket.';
  const open = await env.DB.prepare('SELECT id, thread_id FROM tickets WHERE user_id = ? AND kind = ? AND closed_at IS NULL').bind(user.id, kind).first();
  if (open) return `Você já tem um ticket de ${k.label} aberto${open.thread_id ? `: <#${open.thread_id}>` : ''}.`;
  // grava antes de criar a thread: dois envios ao mesmo tempo não abrem dois tickets
  const ins = await env.DB.prepare(`INSERT INTO tickets (kind, user_id, user_name, reason, details, nick, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE user_id = ? AND kind = ? AND closed_at IS NULL)`)
    .bind(kind, user.id, clip(user.global_name || user.username, 40), reason, details || null, nick || null, nowS(), user.id, kind).run();
  if (!ins.meta || !ins.meta.changes) return `Você já tem um ticket de ${k.label} aberto.`;
  const row = await env.DB.prepare('SELECT id FROM tickets WHERE user_id = ? AND kind = ? AND closed_at IS NULL').bind(user.id, kind).first();
  let thread;
  try {
    thread = await discordRequest(env, 'POST', `/channels/${i.channel_id}/threads`, {
      name: `${k.emoji} ${kind} #${row.id} · ${clip(user.global_name || user.username, 40)}`.slice(0, 95), type: 12, invitable: false, auto_archive_duration: 10080,
    });
    await discordRequest(env, 'PUT', `/channels/${thread.id}/thread-members/${user.id}`);
  } catch (e) {
    await env.DB.prepare('DELETE FROM tickets WHERE id = ?').bind(row.id).run();
    throw e;
  }
  await env.DB.prepare('UPDATE tickets SET thread_id = ? WHERE id = ?').bind(thread.id, row.id).run();
  const staff = idList(env.STAFF_ADMIN_ROLE_IDS);
  await sendMessage(env, thread.id, {
    content: `<@${user.id}>${staff.length ? ' ' + staff.map((r) => `<@&${r}>`).join(' ') : ''}`,
    embeds: [{
      title: `${k.emoji} Ticket #${row.id} · ${k.label}`,
      color: k.color,
      description: [
        `**Aberto por:** <@${user.id}>${nick ? ` · nick no jogo: **${nick}**` : ''}`,
        `**Motivo:** ${reason}`,
        details ? `\n**Detalhes:**\n${details}` : '',
        '',
        'Escreva aqui embaixo e mande prints se precisar. A staff responde neste ticket.',
      ].filter((x) => x !== '').join('\n'),
      footer: { text: 'Quando resolver, clique em Fechar ticket.' },
      timestamp: new Date().toISOString(),
    }],
    allowed_mentions: { users: [user.id], roles: staff },
    components: controls(row.id, false),
  });
  return `Ticket aberto: <#${thread.id}>`;
}

async function closeTicket(env, i, user, id, staff) {
  const t = await env.DB.prepare('SELECT id, kind, user_id, thread_id, closed_at FROM tickets WHERE id = ?').bind(id).first();
  if (!t) return 'Ticket não encontrado.';
  if (t.user_id !== user.id && !staff) return 'Só quem abriu ou a staff fecha o ticket.';
  if (t.closed_at) return 'Esse ticket já foi fechado.';
  const r = await env.DB.prepare('UPDATE tickets SET closed_at = ?, closed_by = ? WHERE id = ? AND closed_at IS NULL').bind(nowS(), user.id, id).run();
  if (!r.meta || !r.meta.changes) return 'Esse ticket acabou de ser fechado.';
  const thread = t.thread_id || i.channel_id;
  await sendMessage(env, thread, {
    embeds: [{ title: `🔒 Ticket #${id} fechado`, color: 0x6cc070, description: `Fechado por <@${user.id}> em <t:${nowS()}:f>.` }],
    allowed_mentions: NO_MENTIONS,
  });
  // arquiva e tranca: some da lista e ninguém escreve mais (a staff ainda pode reabrir pelo Discord)
  await discordRequest(env, 'PATCH', `/channels/${thread}`, { archived: true, locked: true }).catch((e) => console.error('ticket archive:', e.message));
  return `Ticket #${id} fechado.`;
}

export async function handleTicket(env, i, ctx, { isAdmin }) {
  if (!env.DB) return reply('O banco (D1) não está configurado.');
  const user = i.member.user;
  const id = String((i.data && i.data.custom_id) || '');
  if (i.type === 3 && id === 'ticket:menu') {
    const kind = String(((i.data && i.data.values) || [])[0] || '');
    // "Limpar seleção" só redesenha o menu vazio (o Discord deixa a última opção marcada)
    if (kind === 'limpar') return json({ type: 7, data: { components: [menu()] } });
    if (!KINDS[kind]) return reply('Categoria de ticket desconhecida.');
    return json(modal(kind));
  }
  if (!(await claimInteraction(env.DB, String(i.id)))) return reply('Esta ação já foi processada.');
  if (i.type === 2) {
    if (!isAdmin(env, i.member)) return reply('Você não tem permissão para fazer isso.');
    ctx.waitUntil(sendMessage(env, i.channel_id, panelMessage(env))
      .then(() => 'Painel de tickets publicado neste canal.')
      .catch((e) => (e instanceof DiscordError && e.status === 403 ? 'O bot não tem permissão nesse canal (Ver canal, Enviar mensagens).' : 'Não consegui publicar agora.'))
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('ticket panel:', e.message)));
    return deferred();
  }
  const claim = /^ticket:claim:(\d+)$/.exec(id);
  if (i.type === 3 && claim) {
    if (!isAdmin(env, i.member)) return reply('Só a staff assume tickets.');
    const r = await env.DB.prepare('UPDATE tickets SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL AND closed_at IS NULL').bind(user.id, Number(claim[1])).run();
    if (!r.meta || !r.meta.changes) return reply('Esse ticket já foi assumido ou fechado.');
    // tira o botão Assumir da mensagem e avisa no ticket quem está atendendo
    ctx.waitUntil(sendMessage(env, i.channel_id, { content: `🙋 <@${user.id}> assumiu este ticket.`, allowed_mentions: NO_MENTIONS })
      .catch((e) => console.error('ticket claim:', e.message)));
    return json({ type: 7, data: { components: controls(claim[1], true) } });
  }
  const close = /^ticket:close:(\d+)$/.exec(id);
  if (i.type === 3 && close) {
    ctx.waitUntil(closeTicket(env, i, user, Number(close[1]), isAdmin(env, i.member))
      .catch((e) => { console.error('ticket close:', e.message); return 'Não consegui fechar agora. Tente de novo em instantes.'; })
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('ticket close followup:', e.message)));
    return deferred();
  }
  const sent = /^ticket:modal:(\w+)$/.exec(id);
  if (i.type === 5 && sent && KINDS[sent[1]]) {
    ctx.waitUntil(openTicket(env, i, user, sent[1])
      .catch((e) => {
        console.error('ticket open:', e.message);
        return e instanceof DiscordError && e.status === 403
          ? 'O bot não tem permissão para criar o ticket neste canal (Criar threads privadas, Enviar mensagens em threads).'
          : 'Não consegui abrir o ticket agora. Tente de novo em instantes.';
      })
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('ticket followup:', e.message)));
    return deferred();
  }
  return reply('Ação desconhecida.');
}
