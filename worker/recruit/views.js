// Mensagens do Discord (embeds, botões e modais). Só monta objetos; quem envia é interactions.js.
import { BRAND, SITE, LOGO, BANNER_VERSION, COLORS, PANEL, QUESTIONS, STEP1, STEP2, TEXT, slotsWord } from './config.js';

export const EPHEMERAL = 64;
const BUTTON = { primary: 1, secondary: 2, success: 3, danger: 4 };
const MAX_MESSAGE_CHARS = 5800; // limite do Discord: 6000 somando todos os embeds de uma mensagem
const MAX_FIELDS = 25;

// IDs dos botões e modais. Só dizem QUAL coisa; quem pode agir é decidido no servidor a cada clique.
export const IDS = {
  apply: 'recruit:apply',
  start: 'recruit:start',
  continue: (session) => `recruit:continue:${session}`,
  modal1: 'recruit:m1',
  modal2: (session) => `recruit:m2:${session}`,
  approve: (id) => `recruit:approve:${id}`,
  reject: (id) => `recruit:reject:${id}`,
};

const pad = (n) => String(n).padStart(4, '0');
export const appNumber = (id) => `#${pad(id)}`;
const ts = (s, style = 'f') => `<t:${s}:${style}>`;

// texto do usuário dentro de embed: corta no limite e neutraliza @everyone/@here por garantia
export const safe = (s, max = 1024) => {
  const t = String(s ?? '').replace(/@(everyone|here)/gi, '@\u200b$1');
  return t.length > max ? t.slice(0, max - 1) + '…' : t || '—';
};

// nick e username aparecem como escritos (com _ [ ] etc.), sem virar formatação
const plain = (s, max) => safe(String(s ?? '').replace(/[\\*_~`|>#[\]()<]/g, '\\$&'), max);

const row = (...components) => ({ type: 1, components });
const button = (custom_id, label, style, disabled = false) => ({ type: 2, custom_id, label, style, disabled });

// //------------------- PAINEL PÚBLICO -------------------\\
const box = (text) => `\`\`\`\n${text}\n\`\`\``;
const plainEmoji = (name, fallback = '') => fallback;
const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const UNICODE_DIGITS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const digit = (em, n) => em(DIGITS[n], UNICODE_DIGITS[n]);

// vagas em blocos: laranja = livre, preto = preenchida
export function slotsBar(left, max) {
  return '🟧'.repeat(left) + '⬛'.repeat(Math.max(0, max - left));
}

// base = URL pública do Worker (PUBLIC_URL), de onde o Discord baixa o banner; em = emojis do servidor (emojis.js)
export function panelMessage(process, approved, base, em = plainEmoji) {
  const max = process ? process.max_slots : 2;
  const status = process ? process.status : 'closed';
  const open = status === 'open';
  const left = Math.max(0, max - approved);
  const lead = open
    ? `${em('moderator', '🛡️')} ${PANEL.intro}`
    : `🔒 **${status === 'filled' ? TEXT.filled(max) : TEXT.closed}**`;
  const embed = {
    author: { name: `${BRAND} · Recrutamento`, url: SITE, icon_url: LOGO },
    title: PANEL.title,
    description: lead,
    color: open ? COLORS.brand : COLORS.closed,
    fields: [
      { name: 'Inscrições', value: `${open ? '🟢' : '🔴'}\n${box(open ? 'ABERTAS' : 'ENCERRADAS')}`, inline: true },
      { name: 'Vagas livres', value: `${max <= 10 ? slotsBar(left, max) + '\n' : ''}${box(`${left}/${max}`)}`, inline: true },
      { name: 'Requisitos', value: PANEL.requirements.map((r) => `${em('verified', '✔️')} ${r}`).join('\n') },
      { name: 'Etapas', value: PANEL.steps.map((s, i) => `${digit(em, i + 1)} ${s}`).join('\n'), inline: true },
      ...(open ? [{ name: 'Como se candidatar', value: `${em('member', '👤')} ${PANEL.how}`, inline: true }] : []),
    ],
    footer: { text: PANEL.footer, icon_url: LOGO },
  };
  if (base) embed.image = { url: `${base.replace(/\/$/, '')}/recruit/banner-${open ? 'open' : 'closed'}.jpg?v=${BANNER_VERSION}` };
  return {
    content: '',
    embeds: [embed],
    components: [row(button(IDS.apply, open ? PANEL.button : PANEL.buttonClosed, open ? BUTTON.primary : BUTTON.secondary, !open))],
  };
}

// //------------------- CANDIDATO -------------------\\
export const introMessage = () => ({
  flags: EPHEMERAL,
  embeds: [{ title: `${BRAND} — Candidatura à Staff`, description: TEXT.intro, color: COLORS.brand }],
  components: [row(button(IDS.start, 'Começar candidatura', BUTTON.primary))],
});

export const step1DoneMessage = (session) => ({
  flags: EPHEMERAL,
  content: TEXT.step1Done,
  components: [row(button(IDS.continue(session), 'Continuar candidatura', BUTTON.primary))],
});

const input = (key) => {
  const q = QUESTIONS[key];
  return row({
    type: 4,
    custom_id: key,
    label: q.label,
    style: q.style === 'short' ? 1 : 2,
    min_length: q.min,
    max_length: q.max,
    required: true,
    ...((q.placeholder || q.full) ? { placeholder: (q.placeholder || q.full).slice(0, 100) } : {}),
  });
};

export const modal1 = () => ({ custom_id: IDS.modal1, title: 'Candidatura Staff — Etapa 1 de 2', components: STEP1.map(input) });
export const modal2 = (session) => ({ custom_id: IDS.modal2(session), title: 'Candidatura Staff — Etapa 2 de 2', components: STEP2.map(input) });

// //------------------- ANÁLISE (canal privado) -------------------\\
const STATUS = {
  pending: { label: '🟡 PENDENTE', color: COLORS.pending },
  approved: { label: '🟢 APROVADO', color: COLORS.approved, by: 'Aprovado por' },
  rejected: { label: '🔴 REPROVADO', color: COLORS.rejected, by: 'Reprovado por' },
};

// Devolve uma ou mais mensagens. A primeira tem o status e os botões; se as respostas não couberem
// (limite de 6000 caracteres por mensagem), o resto vai em mensagens seguintes com o mesmo número.
export function reviewMessages(app, em = plainEmoji) {
  const answers = typeof app.answers === 'string' ? JSON.parse(app.answers) : app.answers;
  const st = STATUS[app.status] || STATUS.pending;
  const head = [
    { name: 'Status', value: `**${st.label}**`, inline: true },
    { name: 'Candidato', value: `<@${app.user_id}>`, inline: true },
    { name: 'Discord ID', value: `\`${app.user_id}\``, inline: true },
    { name: 'Username', value: plain(app.display_name && app.display_name !== app.username ? `${app.username} (${app.display_name})` : app.username, 200), inline: true },
    { name: 'Nick no jogo', value: plain(app.game_nick, 100), inline: true },
    { name: 'Enviada em', value: ts(app.created_at), inline: true },
  ];
  if (st.by && app.decided_by) head.push({ name: st.by, value: `${em('staff', '🛠️')} <@${app.decided_by}> · ${ts(app.decided_at, 'R')}`, inline: false });
  const qa = Object.keys(QUESTIONS).map((k, i) => ({ name: safe(`${i + 1}. ${QUESTIONS[k].full || QUESTIONS[k].label}`, 256), value: safe(answers[k]) }));

  const title = `${BRAND} — NOVA CANDIDATURA ${appNumber(app.id)}`;
  const size = (f) => f.name.length + f.value.length;
  const messages = [];
  let fields = [...head];
  let chars = title.length + head.reduce((n, f) => n + size(f), 0);
  const flush = (first) => {
    messages.push({ embeds: [{ title: first ? title : `${title} (continuação)`, color: st.color, fields }] });
    fields = [];
    chars = title.length + 20;
  };
  for (const f of qa) {
    if (fields.length >= MAX_FIELDS || chars + size(f) > MAX_MESSAGE_CHARS) flush(messages.length === 0);
    fields.push(f);
    chars += size(f);
  }
  flush(messages.length === 0);
  messages[0].embeds[0].footer = { text: `Candidatura ${appNumber(app.id)} · processo ${app.process_id}` };
  const decided = app.status !== 'pending';
  messages[0].components = [row(
    button(IDS.approve(app.id), 'Aprovar', BUTTON.success, decided),
    button(IDS.reject(app.id), 'Reprovar', BUTTON.danger, decided),
  )];
  return messages;
}

export const filledNotice = (max) => ({ content: `**${BRAND}** — ${TEXT.filled(max)}` });

export function statusText(process, stats) {
  if (!process) return 'Nenhum processo seletivo foi criado ainda. Use `/staff abrir`.';
  const label = { open: 'ABERTAS', closed: 'ENCERRADAS', filled: `ENCERRADAS (${slotsWord(process.max_slots)} vagas preenchidas)` }[process.status];
  const lines = [
    `**Processo seletivo #${process.id}** — inscrições ${label}`,
    `Candidaturas: **${stats.total}** (pendentes ${stats.pending}, aprovadas ${stats.approved}, reprovadas ${stats.rejected})`,
    `Vagas: **${stats.approved}/${process.max_slots}** aprovadas · restam **${Math.max(0, process.max_slots - stats.approved)}**`,
  ];
  if (stats.unposted) lines.push(`Atenção: ${stats.unposted} candidatura(s) ainda não apareceram no canal de análise (o sistema tenta de novo a cada minuto; \`/staff sincronizar\` força agora).`);
  if (process.panel_dirty) lines.push('O painel público está desatualizado (o sistema tenta de novo a cada minuto; `/staff sincronizar` força agora).');
  return lines.join('\n');
}
