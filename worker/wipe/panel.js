// Painel de wipe no Discord (uma mensagem do bot, editada) e avisos das transições (uma vez cada).
import { phaseOf, cycleView, nowS, FINAL_PVP_S } from './cycle.js';

const LOGO = 'https://havokrust.xyz/apple-touch-icon.png';
const COLOR = { normal: 0xff6a00, pvp: 0xd8282b, pending: 0x5a1416, failed: 0x3a3632, none: 0x3a3632 };

const two = (n) => String(n).padStart(2, '0');
export function countdown(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${two(h)}h ${two(m)}m` : `${two(h)}h ${two(m)}m`;
}

// barra de tempo decorrido do ciclo (20 quadrados)
export function timeBar(percent, color = '🟧') {
  const lit = Math.max(0, Math.min(20, Math.floor(percent / 5)));
  return `${color.repeat(lit)}${'⬛'.repeat(20 - lit)}  **${Math.floor(percent)}%**`;
}

const when = (unix) => `<t:${unix}:F> · <t:${unix}:R>`;

export function wipePanel(cycle, t = nowS()) {
  const footer = { text: '🇺🇸 Live · updates every minute  ·  🇧🇷 Ao vivo · atualiza a cada minuto' };
  const phase = phaseOf(cycle, t);
  if (phase === 'NONE') {
    return { embeds: [{
      title: 'HAVOK RUST — WIPE STATUS', color: COLOR.none, thumbnail: { url: LOGO }, footer,
      description: '🇺🇸 The first wipe is not scheduled yet. It is set after the server launch.\n'
        + '🇧🇷 O primeiro wipe ainda não foi agendado. A data sai depois da inauguração.',
    }] };
  }
  const v = cycleView(cycle, t);
  const at = cycle.scheduled_wipe_at;
  if (phase === 'NORMAL') {
    return { embeds: [{
      title: 'HAVOK RUST — WIPE STATUS', color: COLOR.normal, thumbnail: { url: LOGO }, footer,
      description: `🇺🇸 **NEXT WIPE** · 🇧🇷 **PRÓXIMO WIPE**\n# ${countdown(v.remainingSeconds)}`,
      fields: [
        { name: 'Mode · Modo', value: '🟠 **NORMAL**', inline: true },
        { name: 'Next wipe · Próximo wipe', value: when(at), inline: true },
        { name: 'Final PvP · PvP final', value: `<t:${at - FINAL_PVP_S}:F>`, inline: true },
        { name: 'Progress · Progresso', value: timeBar(v.progressPercent), inline: false },
      ],
    }] };
  }
  if (phase === 'FINAL_PVP') {
    const active = !!cycle.pvp_confirmed_at;
    return { embeds: [{
      title: 'HAVOK — FINAL 24 HOURS', color: COLOR.pvp, thumbnail: { url: LOGO }, footer,
      description: (active ? '🔴 **PVP MODE ACTIVE · MODO PVP ATIVO**\n\n' : '⏳ **PvP mode starting · Modo PvP iniciando** (waiting for the server · aguardando o servidor)\n\n')
        + '🇺🇸 The final 24 hours have begun! Weapons and loot are easier to obtain. Prepare for intense PvP.\n'
        + '🇧🇷 As últimas 24 horas começaram! Armas e loot estão mais fáceis de conseguir. Prepare-se para o PvP intenso.\n'
        + `# ${countdown(v.remainingSeconds)}`,
      fields: [
        { name: 'Wipe', value: when(at), inline: true },
        { name: 'Progress · Progresso', value: timeBar(v.progressPercent, '🟥'), inline: false },
      ],
    }] };
  }
  if (phase === 'FAILED') {
    return { embeds: [{
      title: 'HAVOK — WIPE DELAYED', color: COLOR.failed, thumbnail: { url: LOGO }, footer,
      description: '🇺🇸 The wipe was delayed. The team is on it; the new date will be posted here.\n'
        + '🇧🇷 O wipe atrasou. A equipe está resolvendo; a nova data aparece aqui.',
    }] };
  }
  // WIPE_PENDING: chegou a zero; o próximo ciclo só aparece depois que o servidor confirmar
  const started = cycle.status === 'wiping';
  return { embeds: [{
    title: 'HAVOK — WIPE IN PROGRESS', color: COLOR.pending, thumbnail: { url: LOGO }, footer,
    description: started
      ? '🇺🇸 The wipe is running on the server. The new cycle starts as soon as it is done.\n'
        + '🇧🇷 O wipe está sendo feito no servidor. O novo ciclo começa assim que terminar.'
      : '🇺🇸 Wipe time! Waiting for the game server to run it.\n'
        + '🇧🇷 Hora do wipe! Aguardando o servidor do jogo fazer o wipe.',
    fields: [{ name: 'Scheduled · Agendado', value: `<t:${at}:F>`, inline: true }],
  }] };
}

// avisos (canal do painel). Sem @everyone.
export function wipeAlert(kind, cycle) {
  const at = cycle && cycle.scheduled_wipe_at;
  const text = {
    pvp: '🔴 **FINAL 24 HOURS · ÚLTIMAS 24 HORAS**\n'
      + '🇺🇸 PvP mode is on: weapons and loot are easier to find until the wipe.\n'
      + '🇧🇷 Modo PvP ligado: armas e loot mais fáceis até o wipe.\n'
      + `Wipe: <t:${at}:F> (<t:${at}:R>)`,
    started: '🧹 **WIPE STARTED · WIPE COMEÇOU**\n'
      + '🇺🇸 The server is wiping now. It comes back fresh in a few minutes.\n'
      + '🇧🇷 O servidor está fazendo o wipe agora. Volta do zero em alguns minutos.',
    done: '✅ **WIPE DONE · WIPE CONCLUÍDO**\n'
      + '🇺🇸 A new cycle has started. Good luck, survivors!\n'
      + '🇧🇷 Um novo ciclo começou. Boa sorte, sobreviventes!'
      + (at ? `\nNext wipe · Próximo wipe: <t:${at}:F>` : ''),
    failed: '⚠️ **WIPE DELAYED · WIPE ATRASOU**\n'
      + '🇺🇸 Something went wrong with the wipe. The team is on it.\n'
      + '🇧🇷 Algo deu errado no wipe. A equipe está resolvendo.',
  }[kind];
  return { content: text };
}
