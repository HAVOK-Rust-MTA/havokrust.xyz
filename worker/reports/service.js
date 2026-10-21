// Denúncias do jogo (anti-cheat): o jogador morto clica "MORTE SUSPEITA", recebe um código (HV-XXXXXX, 14 dias)
// e cola aqui. O bot abre um ticket privado (thread que só ele e a staff veem) com as gravações da morte.
//
//   /denuncias painel     (admin) publica o painel com o botão neste canal
//   botão report:open  -> formulário (código + motivo) -> report:modal -> thread privada
//
// O bot precisa, no canal do painel: Ver canal, Enviar mensagens, Criar threads privadas, Enviar mensagens em threads,
// Inserir links. As tabelas (ac_reports, ac_clips) são do mesmo D1 da havok-api.
import { discordRequest, sendMessage, editOriginal, NO_MENTIONS, DiscordError } from '../recruit/discord.js';
import { claimInteraction } from '../recruit/db.js';

const EPHEMERAL = 64;
const CODE_RE = /^HV-[A-HJ-NP-Z2-9]{6}$/;
const nowS = () => Math.floor(Date.now() / 1000);
const site = (env) => String(env.SITE_URL || '').replace(/\/+$/, '');
const api = (env) => String(env.API_PUBLIC_URL || '').replace(/\/+$/, '');
const idList = (s) => String(s || '').split(',').map((x) => x.trim()).filter((x) => /^\d{17,20}$/.test(x));
const clip = (s, n) => String(s ?? '').replace(/[@`]/g, '').slice(0, n);

export const REPORT_COMMAND = {
  name: 'denuncias',
  description: 'Denúncias de jogadores (anti-cheat)',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [{ type: 1, name: 'painel', description: 'Publica o painel de denúncias neste canal' }],
};

export const isReportInteraction = (i) => (i.type === 2 && i.data && i.data.name === 'denuncias')
  || ((i.type === 3 || i.type === 5) && String((i.data && i.data.custom_id) || '').startsWith('report:'));

const reply = (content) => new Response(JSON.stringify({ type: 4, data: { flags: EPHEMERAL, content, allowed_mentions: NO_MENTIONS } }),
  { headers: { 'Content-Type': 'application/json' } });
const deferred = () => new Response(JSON.stringify({ type: 5, data: { flags: EPHEMERAL } }), { headers: { 'Content-Type': 'application/json' } });

export const panelMessage = () => ({
  embeds: [{
    title: '🚨 Denúncias · Reports',
    color: 0xe5544b,
    description: [
      'Morreu de um jeito estranho? Na tela de morte do jogo clique em **MORTE SUSPEITA**.',
      'Você recebe um **código** (ex.: `HV-7K3Q9A`) no chat do jogo. Ele vale **14 dias**; no jogo, `/denuncias` mostra os seus.',
      '',
      'Clique no botão abaixo, cole o código e conte o que aconteceu. A staff recebe as gravações da morte num ticket privado.',
      '',
      '_Died in a weird way? Click **SUSPICIOUS DEATH** on the death screen, get a code in the game chat (valid 14 days) and paste it here._',
    ].join('\n'),
  }],
  components: [{ type: 1, components: [{ type: 2, style: 4, custom_id: 'report:open', label: 'Abrir denúncia · Open report', emoji: { name: '🚨' } }] }],
});

const modal = () => ({
  type: 9,
  data: {
    custom_id: 'report:modal',
    title: 'Denúncia · Report',
    components: [
      { type: 1, components: [{ type: 4, custom_id: 'code', label: 'Código da denúncia (HV-...)', style: 1, min_length: 9, max_length: 9, required: true, placeholder: 'HV-7K3Q9A' }] },
      { type: 1, components: [{ type: 4, custom_id: 'reason', label: 'O que aconteceu?', style: 2, min_length: 10, max_length: 800, required: true }] },
    ],
  },
});

const field = (i, id) => {
  for (const row of (i.data && i.data.components) || []) {
    for (const c of row.components || []) {
      if (c.custom_id === id) return String(c.value || '');
    }
  }
  return '';
};

// abre o ticket: thread privada no canal do painel, com quem denunciou + aviso para a staff
async function openTicket(env, i, user) {
  const code = field(i, 'code').trim().toUpperCase();
  const reason = clip(field(i, 'reason').trim(), 800);
  if (!CODE_RE.test(code)) return 'Código inválido. Ele tem o formato `HV-XXXXXX` e aparece no chat do jogo depois da denúncia.';
  const rep = await env.DB.prepare('SELECT code, created_at, expires_at, reporter, reporter_account, target, target_account, info, used_at, thread_id FROM ac_reports WHERE code = ?').bind(code).first();
  if (!rep) return 'Não achei esse código. Confira no jogo com `/denuncias`.';
  if (rep.expires_at < nowS()) return 'Esse código já expirou (vale 14 dias).';
  if (rep.used_at) return `Esse código já foi usado${rep.thread_id ? `: <#${rep.thread_id}>` : ''}.`;
  // marca como usado antes de criar a thread: dois cliques ao mesmo tempo não abrem dois tickets
  const claim = await env.DB.prepare('UPDATE ac_reports SET used_at = ?, used_by = ? WHERE code = ? AND used_at IS NULL').bind(nowS(), user.id, code).run();
  if (!claim.meta || !claim.meta.changes) return 'Esse código acabou de ser usado.';
  const { results: clips } = await env.DB.prepare('SELECT id, player, reason, frames, fps FROM ac_clips WHERE report = ? ORDER BY created_at').bind(code).all();
  let thread;
  try {
    thread = await discordRequest(env, 'POST', `/channels/${i.channel_id}/threads`, {
      name: `denúncia ${code} · ${clip(rep.target, 40)}`.slice(0, 95), type: 12, invitable: false, auto_archive_duration: 10080,
    });
    await discordRequest(env, 'PUT', `/channels/${thread.id}/thread-members/${user.id}`);
  } catch (e) {
    await env.DB.prepare('UPDATE ac_reports SET used_at = NULL, used_by = NULL WHERE code = ?').bind(code).run();
    throw e;
  }
  await env.DB.prepare('UPDATE ac_reports SET thread_id = ? WHERE code = ?').bind(thread.id, code).run();
  const staff = idList(env.STAFF_ADMIN_ROLE_IDS);
  // quem matou primeiro (é a tela que mostra mira/wallhack), depois a visão da vítima
  const ordered = [...(clips || [])].sort((a, b) => (a.player === rep.target ? 0 : 1) - (b.player === rep.target ? 0 : 1));
  const links = ordered.map((c) => `▶ [${clip(c.player, 40)} — ${clip(c.reason, 60)} (${c.frames} quadros)](${site(env)}/#/ac/${c.id})`);
  // serial e Discord de quem foi acusado (e de quem denunciou), para a staff chegar no jogador
  const who = async (acc) => (acc ? env.DB.prepare('SELECT discord_id, discord_name FROM players WHERE account = ?').bind(acc).first() : null);
  const tgt = await who(rep.target_account);
  const rpt = await who(rep.reporter_account);
  const ident = (acc, d) => [acc ? `serial \`${clip(acc, 40)}\`` : 'serial ?', d && d.discord_id ? `<@${d.discord_id}> (${clip(d.discord_name, 40)})` : 'sem Discord vinculado'].join(' · ');
  const galleryOf = (c) => {
    const n = c.frames, seen = new Set(), out = [];
    for (const k of [0, Math.floor((n - 1) / 3), Math.floor((n - 1) * 2 / 3), n - 1]) {
      if (!seen.has(k)) { seen.add(k); out.push(k); }
    }
    return out;
  };
  const shown = ordered.filter((c) => c.frames > 0).slice(0, 2);
  const first = shown[0];
  const url = first ? `${site(env)}/#/ac/${first.id}` : site(env);
  const embeds = [{
    title: `🚨 Denúncia ${code}`, url, color: 0xe5544b,
    description: [
      `**Denunciado:** ${clip(rep.target, 40)}`,
      `↳ ${ident(rep.target_account, tgt)}`,
      `**Quem denunciou:** ${clip(rep.reporter, 40)} (<@${user.id}>)`,
      `↳ ${ident(rep.reporter_account, rpt)}`,
      rep.info ? `**Morte:** ${clip(rep.info, 300)}` : '',
      `**Quando:** <t:${rep.created_at}:f>`,
      '',
      `**Relato:**\n${reason}`,
      '',
      links.length ? `**Gravações:**\n${links.join('\n')}` : '_As gravações ainda estão subindo ou não chegaram: a staff confere no canal de alertas._',
    ].filter((x) => x !== '').join('\n'),
    footer: { text: 'Gravação é evidência para a staff analisar: não é prova sozinha.' },
  }];
  // uma galeria (até 4 imagens, mesma url) para cada gravação: primeiro a de quem matou
  shown.forEach((c, gi) => {
    const cUrl = `${site(env)}/#/ac/${c.id}`;
    const ks = galleryOf(c).reverse(); // o último quadro (o momento) primeiro
    ks.forEach((k, j) => {
      const img = { url: `${api(env)}/api/ac/clip/${c.id}/${k}.jpg` };
      if (gi === 0 && j === 0) { embeds[0].image = img; return; }
      if (j === 0) embeds.push({ title: `🎥 ${clip(c.player, 40)} — ${clip(c.reason, 60)}`, url: cUrl, color: 0xe5544b, image: img });
      else embeds.push({ url: cUrl, image: img });
    });
  });
  await sendMessage(env, thread.id, {
    content: `<@${user.id}>${staff.length ? ' ' + staff.map((r) => `<@&${r}>`).join(' ') : ''}`,
    embeds,
    allowed_mentions: { users: [user.id], roles: staff },
  });
  return `Ticket aberto: <#${thread.id}>. A staff vai analisar as gravações.`;
}

export async function handleReport(env, i, ctx, { isAdmin }) {
  if (!env.DB) return reply('O banco (D1) não está configurado.');
  const user = i.member.user;
  if (i.type === 3 && i.data.custom_id === 'report:open') {
    return new Response(JSON.stringify(modal()), { headers: { 'Content-Type': 'application/json' } });
  }
  if (!(await claimInteraction(env.DB, String(i.id)))) return reply('Esta ação já foi processada.');
  if (i.type === 2) {
    if (!isAdmin(env, i.member)) return reply('Você não tem permissão para fazer isso.');
    ctx.waitUntil(sendMessage(env, i.channel_id, panelMessage())
      .then(() => 'Painel de denúncias publicado neste canal.')
      .catch((e) => (e instanceof DiscordError && e.status === 403 ? 'O bot não tem permissão nesse canal (Ver canal, Enviar mensagens, Inserir links).' : 'Não consegui publicar agora.'))
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('report panel:', e.message)));
    return deferred();
  }
  if (i.type === 5 && i.data.custom_id === 'report:modal') {
    ctx.waitUntil(openTicket(env, i, user)
      .catch((e) => {
        console.error('report ticket:', e.message);
        return e instanceof DiscordError && e.status === 403
          ? 'O bot não tem permissão para criar o ticket neste canal (Criar threads privadas, Enviar mensagens em threads).'
          : 'Não consegui abrir o ticket agora. Tente de novo em instantes.';
      })
      .then((content) => editOriginal(env, i, { content }))
      .catch((e) => console.error('report followup:', e.message)));
    return deferred();
  }
  return reply('Ação desconhecida.');
}
