// Recrutamento da staff pelo Discord (Interactions por HTTP: sem bot conectado ao Gateway).
//
//   POST /interactions   ->  o Discord manda cliques, formulários e comandos para cá (URL no Developer Portal)
//   cron (1 min)         ->  recruitCron: tenta de novo o que falhou no Discord e limpa rascunhos vencidos
//
// Ordem de cada interação: assinatura Ed25519 -> PING -> servidor certo -> configuração -> não repetida -> ação.
// Quem pode aprovar/abrir/fechar sai dos cargos do membro que o PRÓPRIO Discord assina na interação,
// nunca do custom_id nem do canal.
import { verifyRequest } from './verify.js';
import { NO_MENTIONS, DiscordError, sendMessage, editMessage, deleteMessage, editOriginal } from './discord.js';
import * as db from './db.js';
import { QUESTIONS, STEP1, STEP2, TEXT, DEFAULT_SLOTS, DRAFT_TTL_S, INTERACTION_KEEP_S } from './config.js';
import { BANNERS } from './banners.js';
import { loadEmojis, cachedEmojis, emojiPicker } from './emojis.js';
import { ensureCommands } from './register.js';
import { isWaitlistInteraction, handleWaitlist } from '../waitlist/join.js';
import { isWipeInteraction, handleWipeCommand } from '../wipe/service.js';
import { EPHEMERAL, IDS, panelMessage, introMessage, step1DoneMessage, modal1, modal2, reviewMessages, filledNotice, statusText, appNumber } from './views.js';

const TYPE = { PING: 1, COMMAND: 2, COMPONENT: 3, MODAL: 5 };
const RESPONSE = { PONG: 1, MESSAGE: 4, DEFERRED_MESSAGE: 5, UPDATE: 7, MODAL: 9 };
const SNOWFLAKE = /^\d{17,20}$/;
const SESSION = /^[0-9a-f]{32}$/;

const respond = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const message = (data) => respond({ type: RESPONSE.MESSAGE, data: { allowed_mentions: NO_MENTIONS, ...data } });
const privateText = (content) => message({ flags: EPHEMERAL, content });
const update = (data) => respond({ type: RESPONSE.UPDATE, data: { allowed_mentions: NO_MENTIONS, ...data } });
const modal = (data) => respond({ type: RESPONSE.MODAL, data });

const idList = (s) => String(s || '').split(',').map((x) => x.trim()).filter((x) => SNOWFLAKE.test(x));
const maxSlots = (env) => {
  const n = parseInt(env.STAFF_MAX_SLOTS, 10);
  return n >= 1 && n <= 25 ? n : DEFAULT_SLOTS;
};

export function configProblem(env) {
  if (!env.DB) return 'missing D1 binding DB';
  if (!env.DISCORD_BOT_TOKEN) return 'missing DISCORD_BOT_TOKEN';
  if (!SNOWFLAKE.test(String(env.GUILD_ID || ''))) return 'invalid GUILD_ID';
  if (!SNOWFLAKE.test(String(env.STAFF_REVIEW_CHANNEL_ID || ''))) return 'invalid STAFF_REVIEW_CHANNEL_ID';
  if (!idList(env.STAFF_ADMIN_ROLE_IDS).length && !idList(env.STAFF_ADMIN_USER_IDS).length) return 'no STAFF_ADMIN_ROLE_IDS / STAFF_ADMIN_USER_IDS';
  return null;
}

export function isAdmin(env, member) {
  if (!member || !member.user) return false;
  if (idList(env.STAFF_ADMIN_USER_IDS).includes(member.user.id)) return true;
  const roles = new Set(idList(env.STAFF_ADMIN_ROLE_IDS));
  return (member.roles || []).some((r) => roles.has(r));
}

// //------------------- RESPOSTAS DO FORMULÁRIO -------------------\\
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

export function cleanAnswer(key, raw) {
  const q = QUESTIONS[key];
  let s = String(raw ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '');
  s = q.style === 'short' ? s.replace(/\s+/g, ' ') : s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.trim();
  return s.length < q.min || s.length > q.max ? null : s;
}

// valores dos campos do modal (formato antigo em action rows e o novo em Label)
function modalValues(interaction) {
  const out = {};
  for (const c of interaction.data.components || []) {
    for (const inner of [...(c.components || []), ...(c.component ? [c.component] : [])]) {
      if (inner && typeof inner.custom_id === 'string') out[inner.custom_id] = inner.value;
    }
  }
  return out;
}

function readStep(interaction, keys) {
  const values = modalValues(interaction);
  const answers = {};
  for (const k of keys) {
    const v = cleanAnswer(k, values[k]);
    if (v === null) return null;
    answers[k] = v;
  }
  return answers;
}

const randomSession = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

// //------------------- CANDIDATO -------------------\\
// processo aberto e sem candidatura dessa pessoa; senão devolve a resposta de recusa
async function applicantGate(env, userId) {
  const process = await db.currentProcess(env.DB, env.GUILD_ID);
  if (!process || process.status !== 'open') return { refuse: process && process.status === 'filled' ? TEXT.filled(process.max_slots) : TEXT.closed };
  if (await db.findApplication(env.DB, process.id, userId)) return { refuse: TEXT.duplicate };
  return { process };
}

async function onApplyButton(env, i, user) {
  const gate = await applicantGate(env, user.id);
  return gate.refuse ? privateText(gate.refuse) : message(introMessage());
}

async function onStartButton(env, i, user) {
  const gate = await applicantGate(env, user.id);
  return gate.refuse ? privateText(gate.refuse) : modal(modal1());
}

async function onStep1(env, i, user) {
  const gate = await applicantGate(env, user.id);
  if (gate.refuse) return privateText(gate.refuse);
  const answers = readStep(i, STEP1);
  if (!answers) return privateText('Alguma resposta ficou vazia, curta ou longa demais. Clique em **Candidatar-se à Staff** e tente de novo.');
  const session = randomSession();
  await db.saveDraft(env.DB, { processId: gate.process.id, userId: user.id, session, answers, ttl: DRAFT_TTL_S });
  const next = step1DoneMessage(session);
  // o formulário foi aberto pela mensagem privada de introdução: troca ela pela próxima etapa
  return i.message ? update({ content: next.content, embeds: [], components: next.components }) : message(next);
}

async function onContinueButton(env, i, user, session) {
  if (!SESSION.test(session)) return privateText(TEXT.expired);
  const draft = await db.getDraft(env.DB, { userId: user.id, session });
  if (!draft) return privateText(TEXT.expired);
  const gate = await applicantGate(env, user.id);
  if (gate.refuse) return privateText(gate.refuse);
  if (gate.process.id !== draft.process_id) return privateText(TEXT.expired);
  return modal(modal2(session));
}

async function onStep2(env, i, user, session, ctx) {
  if (!SESSION.test(session)) return privateText(TEXT.expired);
  const draft = await db.getDraft(env.DB, { userId: user.id, session });
  if (!draft) return privateText(TEXT.expired);
  const step2 = readStep(i, STEP2);
  if (!step2) return privateText('Alguma resposta ficou curta ou longa demais. Clique em **Continuar candidatura** e tente de novo.');
  // confere tudo de novo (a primeira etapa veio do banco, mas é barato e evita surpresa)
  const answers = {};
  for (const k of Object.keys(QUESTIONS)) {
    const v = cleanAnswer(k, k in step2 ? step2[k] : draft.answers[k]);
    if (v === null) return privateText(TEXT.expired);
    answers[k] = v;
  }
  const result = await db.submitApplication(env.DB, {
    processId: draft.process_id,
    guildId: env.GUILD_ID,
    user: { id: user.id, username: String(user.username || '?').slice(0, 64), displayName: user.global_name ? String(user.global_name).slice(0, 64) : null },
    answers,
  });
  if (result.error === 'duplicate') return privateText(TEXT.duplicate);
  if (result.error === 'closed') {
    const p = await db.getProcess(env.DB, draft.process_id);
    return privateText(p && p.status === 'filled' ? TEXT.filled(p.max_slots) : TEXT.closed);
  }
  ctx.waitUntil(postReview(env, result.id).catch((e) => console.error('recruit review post:', e.message)));
  return i.message ? update({ content: TEXT.done, embeds: [], components: [] }) : privateText(TEXT.done);
}

// publica a candidatura no canal de análise (uma vez só; se falhar, o cron tenta de novo)
export async function postReview(env, applicationId) {
  if (!(await db.claimReviewPost(env.DB, applicationId))) return false;
  const app = await db.getApplication(env.DB, applicationId);
  const [first, ...rest] = reviewMessages(app, emojiPicker(await loadEmojis(env)));
  let sent;
  try {
    sent = await sendMessage(env, env.STAFF_REVIEW_CHANNEL_ID, first);
  } catch (e) {
    await db.releaseReviewPost(env.DB, applicationId);
    throw e;
  }
  await db.setReviewMessage(env.DB, applicationId, env.STAFF_REVIEW_CHANNEL_ID, sent.id);
  for (const m of rest) {
    await sendMessage(env, env.STAFF_REVIEW_CHANNEL_ID, { ...m, message_reference: { message_id: sent.id, fail_if_not_exists: false } });
  }
  return true;
}

// //------------------- AVALIAÇÃO -------------------\\
async function onDecision(env, i, admin, decision, rawId, ctx) {
  if (!isAdmin(env, i.member)) return privateText(TEXT.notAllowed);
  const applicationId = /^\d{1,10}$/.test(rawId) ? Number(rawId) : 0;
  const app = applicationId && await db.getApplication(env.DB, applicationId);
  if (!app || app.guild_id !== env.GUILD_ID) return privateText('Candidatura não encontrada.');
  const r = await db.decide(env.DB, { applicationId, decision, actor: admin.id });
  if (!r.ok) {
    if (r.reason === 'decided') return privateText(`A candidatura ${appNumber(applicationId)} já foi avaliada (${r.status === 'approved' ? 'APROVADO' : 'REPROVADO'}).`);
    if (r.reason === 'full') {
      const p = await db.getProcess(env.DB, app.process_id);
      return privateText(TEXT.filled(p ? p.max_slots : DEFAULT_SLOTS));
    }
    return privateText('Candidatura não encontrada.');
  }
  if (r.filled) {
    ctx.waitUntil(afterFilled(env, app.process_id).catch((e) => console.error('recruit filled:', e.message)));
  } else if (decision === 'approve') {
    // uma vaga a menos: atualiza o painel (se falhar, fica marcado e o cron tenta de novo)
    await db.setPanelDirty(env.DB, app.process_id, true);
    ctx.waitUntil(db.getProcess(env.DB, app.process_id).then((p) => syncPanel(env, p)).catch((e) => console.error('recruit panel:', e.message)));
  }
  ctx.waitUntil(loadEmojis(env)); // o clique tem 3 s para responder: usa os emojis já guardados
  const [first] = reviewMessages(await db.getApplication(env.DB, applicationId), emojiPicker(cachedEmojis()));
  return update({ embeds: first.embeds, components: first.components });
}

async function afterFilled(env, processId) {
  const process = await db.getProcess(env.DB, processId);
  await syncPanel(env, process).catch((e) => console.error('recruit panel:', e.message));
  await sendMessage(env, env.STAFF_REVIEW_CHANNEL_ID, filledNotice(process.max_slots));
}

// //------------------- PAINEL -------------------\\
// edita o painel conforme o banco. Falhou? fica marcado e o cron tenta de novo.
export async function syncPanel(env, process) {
  if (!process || !process.panel_message_id) return 'sem painel publicado (use /staff painel)';
  const stats = await db.processStats(env.DB, process.id);
  try {
    await editMessage(env, process.panel_channel_id, process.panel_message_id, panelMessage(process, stats.approved, env.PUBLIC_URL, emojiPicker(await loadEmojis(env))));
  } catch (e) {
    await db.setPanelDirty(env.DB, process.id, true);
    if (e instanceof DiscordError && e.status === 404) return 'a mensagem do painel não existe mais (publique de novo com /staff painel)';
    throw e;
  }
  await db.setPanelDirty(env.DB, process.id, false);
  return 'painel atualizado';
}

async function publishPanel(env, process, channelId) {
  const stats = await db.processStats(env.DB, process.id);
  const msg = panelMessage(process, stats.approved, env.PUBLIC_URL, emojiPicker(await loadEmojis(env)));
  if (process.panel_message_id && process.panel_channel_id === channelId) {
    try {
      await editMessage(env, channelId, process.panel_message_id, msg);
      await db.setPanelDirty(env.DB, process.id, false);
      return 'Painel sincronizado.';
    } catch (e) {
      if (!(e instanceof DiscordError && e.status === 404)) throw e;
      // apagaram a mensagem: publica outra abaixo
    }
  }
  const sent = await sendMessage(env, channelId, msg);
  const old = process.panel_message_id && process.panel_channel_id !== channelId ? [process.panel_channel_id, process.panel_message_id] : null;
  await db.setPanelMessage(env.DB, process.id, channelId, sent.id);
  await db.audit(env.DB, { processId: process.id, actor: 'system', action: 'panel_publish', detail: `canal=${channelId}` }).run();
  if (old) await deleteMessage(env, old[0], old[1]).catch(() => {}); // painel antigo em outro canal
  return `Painel publicado em <#${channelId}>.`;
}

// //------------------- COMANDOS /staff -------------------\\
const option = (sub, name) => (sub.options || []).find((o) => o.name === name)?.value;

async function runCommand(env, i, admin) {
  const sub = (i.data.options || [])[0] || {};
  const actor = admin.id;
  const current = await db.currentProcess(env.DB, env.GUILD_ID);

  switch (sub.name) {
    case 'painel': {
      if (!current) return 'Ainda não há processo seletivo. Use `/staff abrir` primeiro e depois `/staff painel`.';
      const channelId = option(sub, 'canal') || i.channel_id;
      if (!SNOWFLAKE.test(String(channelId))) return 'Canal inválido.';
      return publishPanel(env, current, String(channelId));
    }
    case 'abrir': {
      const fresh = option(sub, 'novo') === true;
      if (current && current.status === 'open' && !fresh) {
        return `As inscrições do processo #${current.id} já estão abertas. Para encerrar este e começar um NOVO (todos podem se inscrever de novo), use \`/staff abrir novo:true\`.`;
      }
      // novo:true com o atual aberto: encerra ele primeiro (fica no histórico, com as candidaturas)
      if (current && current.status === 'open') {
        await db.setProcessStatus(env.DB, { processId: current.id, from: 'open', to: 'closed', actor, action: 'process_close_for_new' });
      }
      if (current && !fresh) {
        return current.status === 'filled'
          ? `As vagas do processo #${current.id} já foram preenchidas. Para começar um processo seletivo NOVO, use \`/staff abrir novo:true\`.`
          : `As inscrições do processo #${current.id} estão fechadas. Para reabrir o MESMO processo use \`/staff reabrir\`; para começar um NOVO, \`/staff abrir novo:true\`.`;
      }
      const wanted = Number(option(sub, 'vagas'));
      const slots = Number.isInteger(wanted) && wanted >= 1 && wanted <= 25 ? wanted : maxSlots(env);
      const id = await db.createProcess(env.DB, {
        guildId: env.GUILD_ID, maxSlots: slots, actor,
        panelChannelId: current ? current.panel_channel_id : null, panelMessageId: current ? current.panel_message_id : null,
      });
      if (!id) return 'Já existe um processo aberto.';
      const panel = await syncPanel(env, await db.getProcess(env.DB, id)).catch((e) => `painel não atualizado agora (${e.message}); o sistema tenta de novo a cada minuto`);
      const previous = current ? ` O processo #${current.id} ficou encerrado no histórico; quem se inscreveu nele pode se inscrever de novo.` : '';
      return `Processo seletivo #${id} aberto com ${slots} ${slots === 1 ? 'vaga' : 'vagas'}.${previous} ${panel === 'painel atualizado' ? 'Painel atualizado.' : `Obs.: ${panel}.`}`;
    }
    case 'fechar':
    case 'reabrir': {
      if (!current) return 'Ainda não há processo seletivo. Use `/staff abrir`.';
      const closing = sub.name === 'fechar';
      if (!closing && current.status === 'filled') return `As vagas do processo #${current.id} foram preenchidas: ele não pode ser reaberto. Para corrigir uma aprovação use \`/staff desfazer\`; para outro processo, \`/staff abrir novo:true\`.`;
      const changed = await db.setProcessStatus(env.DB, closing
        ? { processId: current.id, from: 'open', to: 'closed', actor, action: 'process_close' }
        : { processId: current.id, from: 'closed', to: 'open', actor, action: 'process_reopen' });
      if (!changed) return closing ? 'As inscrições já estavam fechadas.' : 'Não foi possível reabrir (já está aberto ou não há vaga sobrando).';
      const panel = await syncPanel(env, await db.getProcess(env.DB, current.id)).catch((e) => `painel não atualizado agora (${e.message}); o sistema tenta de novo a cada minuto`);
      return `${closing ? 'Inscrições encerradas' : 'Inscrições reabertas'} (processo #${current.id}). ${panel === 'painel atualizado' ? 'Painel atualizado.' : `Obs.: ${panel}.`}`;
    }
    case 'vagas': {
      if (!current) return 'Ainda não há processo seletivo. Use `/staff abrir vagas:N`.';
      const slots = Number(option(sub, 'quantidade'));
      if (!(Number.isInteger(slots) && slots >= 1 && slots <= 25)) return 'Escolha de 1 a 25 vagas.';
      const r = await db.setMaxSlots(env.DB, { processId: current.id, slots, actor });
      if (!r.ok) return `Não dá para ter ${slots} ${slots === 1 ? 'vaga' : 'vagas'}: já existem ${r.approved} aprovados neste recrutamento. Use \`/staff desfazer\` antes, se for o caso.`;
      const panel = await syncPanel(env, await db.getProcess(env.DB, current.id)).catch((e) => `painel não atualizado agora (${e.message}); o sistema tenta de novo a cada minuto`);
      const state = { open: 'inscrições abertas', closed: 'inscrições fechadas', filled: 'todas as vagas preenchidas: inscrições encerradas' }[r.status];
      return `Recrutamento #${current.id} agora tem ${slots} ${slots === 1 ? 'vaga' : 'vagas'} (${r.approved} ${r.approved === 1 ? 'aprovado' : 'aprovados'}; ${state}). ${panel === 'painel atualizado' ? 'Painel atualizado.' : `Obs.: ${panel}.`}`;
    }
    case 'status':
      return statusText(current, current ? await db.processStats(env.DB, current.id) : null);
    case 'desfazer': {
      const id = Number(option(sub, 'numero'));
      const reason = String(option(sub, 'motivo') || '').replace(CONTROL, '').trim();
      if (reason.length < 5) return 'Informe o motivo.';
      const app = Number.isInteger(id) && await db.getApplication(env.DB, id);
      if (!app || app.guild_id !== env.GUILD_ID) return 'Candidatura não encontrada.';
      const r = await db.undoDecision(env.DB, { applicationId: id, actor, reason });
      if (!r.ok) return `A candidatura ${appNumber(id)} já está pendente.`;
      const fresh = await db.getApplication(env.DB, id);
      const notes = [];
      if (fresh.review_message_id && !fresh.review_message_id.startsWith('posting:')) {
        const [first] = reviewMessages(fresh, emojiPicker(await loadEmojis(env)));
        await editMessage(env, fresh.review_channel_id, fresh.review_message_id, first).catch(() => notes.push('não consegui editar a mensagem de análise'));
      }
      if (r.reopenedToClosed) notes.push('o processo voltou a ter vaga e ficou FECHADO; use `/staff reabrir` se quiser receber novas inscrições');
      // a vaga volta a aparecer no painel
      await db.setPanelDirty(env.DB, fresh.process_id, true);
      await syncPanel(env, await db.getProcess(env.DB, fresh.process_id)).catch(() => notes.push('o painel atualiza no próximo minuto'));
      return `Candidatura ${appNumber(id)} voltou para PENDENTE (registrado na auditoria).${notes.length ? ' Obs.: ' + notes.join('; ') + '.' : ''}`;
    }
    case 'sincronizar': {
      if (!current) return 'Ainda não há processo seletivo.';
      const panel = await syncPanel(env, current).catch((e) => `falhou (${e.message})`);
      let posted = 0;
      for (const app of await db.unpostedApplications(env.DB, 10)) {
        if (await postReview(env, app.id).catch(() => false)) posted++;
      }
      return `Painel: ${panel}. Candidaturas publicadas agora no canal de análise: ${posted}.`;
    }
    default:
      return 'Comando desconhecido.';
  }
}

// erro do Discord explicado para quem usou o comando (o motivo técnico fica no log)
function commandError(e) {
  if (!(e instanceof DiscordError)) return TEXT.error;
  if (e.status === 403) return 'O bot não tem permissão nesse canal. Dê a ele **Ver canal, Enviar mensagens, Inserir links e Ler histórico** e tente de novo.';
  if (e.status === 404) return 'Canal ou mensagem não encontrado. Confira o canal escolhido.';
  if (e.status === 401) return 'O token do bot no Worker está inválido (`npx wrangler secret put DISCORD_BOT_TOKEN`).';
  return `O Discord recusou agora (${e.status}). Tente de novo em alguns instantes.`;
}

function onCommand(env, i, admin, ctx) {
  if (i.data.name !== 'staff') return privateText('Comando desconhecido.');
  if (!isAdmin(env, i.member)) return privateText(TEXT.notAllowed);
  // responde na hora ("pensando...") e termina em segundo plano: o Discord só espera 3 s
  ctx.waitUntil(
    runCommand(env, i, admin)
      .catch((e) => { console.error('recruit command:', e.message); return commandError(e); })
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('recruit followup:', e.message)),
  );
  return respond({ type: RESPONSE.DEFERRED_MESSAGE, data: { flags: EPHEMERAL } });
}

// //------------------- ENTRADA -------------------\\
export async function handleInteraction(request, env, ctx) {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!env.DISCORD_PUBLIC_KEY) {
    console.error('recruit config: missing DISCORD_PUBLIC_KEY');
    return new Response('not configured', { status: 503 });
  }
  const body = await verifyRequest(request, env.DISCORD_PUBLIC_KEY);
  if (body === null) return new Response('invalid request signature', { status: 401 });
  let i;
  try {
    i = JSON.parse(body);
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (i.type === TYPE.PING) return respond({ type: RESPONSE.PONG });

  if (i.guild_id !== env.GUILD_ID || !i.member || !i.member.user) return privateText(TEXT.wrongGuild);
  // lista de espera: mesmo endpoint e mesma verificação, mas não depende da configuração do recrutamento
  if (isWaitlistInteraction(i)) return handleWaitlist(env, i, ctx, { isAdmin });
  if (isWipeInteraction(i)) return handleWipeCommand(env, i, ctx, { isAdmin });
  const problem = configProblem(env);
  if (problem) {
    console.error('recruit config:', problem);
    return privateText(TEXT.notConfigured);
  }
  const user = i.member.user;
  try {
    if (!(await db.claimInteraction(env.DB, String(i.id)))) return privateText(TEXT.repeated);
    if (i.type === TYPE.COMMAND) return onCommand(env, i, user, ctx);

    const id = String((i.data && i.data.custom_id) || '');
    const [, action, arg = ''] = id.split(':');
    if (i.type === TYPE.COMPONENT && id.startsWith('recruit:')) {
      if (id === IDS.apply) return await onApplyButton(env, i, user);
      if (id === IDS.start) return await onStartButton(env, i, user);
      if (action === 'continue') return await onContinueButton(env, i, user, arg);
      if (action === 'approve' || action === 'reject') return await onDecision(env, i, user, action, arg, ctx);
    }
    if (i.type === TYPE.MODAL && id.startsWith('recruit:')) {
      if (id === IDS.modal1) return await onStep1(env, i, user);
      if (action === 'm2') return await onStep2(env, i, user, arg, ctx);
    }
    return privateText('Ação desconhecida.');
  } catch (e) {
    console.error('recruit:', e.message);
    return privateText(TEXT.error);
  }
}

// //------------------- BANNER -------------------\\
const bannerCache = {};
export function serveBanner(name) {
  const b64 = Object.hasOwn(BANNERS, name) && BANNERS[name];
  if (!b64) return new Response('not found', { status: 404 });
  bannerCache[name] ??= Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Response(bannerCache[name], {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}

// //------------------- CRON -------------------\\
export async function recruitCron(env) {
  if (configProblem(env)) return; // recrutamento ainda não configurado: não faz nada
  await ensureCommands(env).catch((e) => console.error('recruit register:', e.message));
  await db.cleanup(env.DB, INTERACTION_KEEP_S);
  const process = await db.currentProcess(env.DB, env.GUILD_ID);
  if (process && process.panel_dirty && process.panel_message_id) await syncPanel(env, process).catch((e) => console.error('recruit panel retry:', e.message));
  for (const app of await db.unpostedApplications(env.DB, 5)) {
    await postReview(env, app.id).catch((e) => console.error('recruit review retry:', e.message));
  }
}
