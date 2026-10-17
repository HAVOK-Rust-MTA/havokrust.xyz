// Configuração do site HAVOK. Edite aqui sem mexer no resto.
window.HAVOK = {
  // convite do Discord (botão do topo, da Store e do rodapé)
  discord: 'https://discord.gg/WZqhuFb2w5',
  // lista de espera: URL do Worker (worker/README.md). Vazio = o contador não aparece.
  // ex.: api: 'https://havok-waitlist.SEU-USUARIO.workers.dev/waitlist'
  waitlist: { api: 'https://havok-waitlist.havokrust.workers.dev/waitlist', goal: 50 },
  // wipe: os mesmos números do havok_wipe (g.config.lua). start = inauguração em Brasília 'AAAA-MM-DD HH:MM', '' = sem contagem.
  // Antes da data o site conta para a inauguração; depois, para o próximo wipe.
  wipe: { start: '', everyDays: 45, pvpHours: 24 },
  // preços do VIP (por mês) em reais e dólar. Tirar um preço = mostra "Consulte no Discord".
  vip: {
    period: 'month',
    prices: {
      survivor: { brl: 15.00, usd: 2.99 },
      veteran: { brl: 45.00, usd: 7.99 },
      legendary: { brl: 90.00, usd: 15.99 },
    },
  },
  // endereço do servidor MTA para a página /play (ex.: '203.0.113.10:22003'). Vazio = página sem o botão.
  server: '',
  // redes sociais da home (vazio = escondido)
  socials: {
    youtube: 'https://www.youtube.com/@havokrust',
    tiktok: '',
    instagram: '',
  },

  // vídeos do YouTube por nome (o mesmo nome da lista de mídias). Pode colar o link inteiro.
  // ex.: spawn: 'https://youtu.be/XXXXXXXXXXX',
  youtube: {
  },
  // mídias que são um "GIF" (vídeo mudo em loop, bem mais leve que .gif): media/<nome>.webm + .mp4
  loops: ['hud', 'spawn', 'gather-tools', 'barrels', 'crates', 'build-wheel', 'place-object', 'first-house', 'upgrade', 'vehicles'],

  // vídeo em destaque na página inicial da wiki ('' esconde)
  featured: '',
};
