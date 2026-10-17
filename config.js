// Configuração do site HAVOK. Edite aqui sem mexer no resto.
window.HAVOK = {
  // convite do Discord (botão do topo, da Store e do rodapé)
  discord: 'https://discord.gg/w4hqcT8ufS',
  // lista de espera: URL do Worker (worker/README.md). Vazio = o contador não aparece.
  // ex.: api: 'https://havok-waitlist.SEU-USUARIO.workers.dev/waitlist'
  waitlist: { api: 'https://havok-waitlist.havokrust.workers.dev/waitlist', goal: 50 },
  // preços do VIP (por mês) em reais e dólar. Tirar um preço = mostra "Consulte no Discord".
  vip: {
    period: 'month',
    prices: {
      survivor: { brl: 9.90, usd: 2.99 },
      veteran: { brl: 19.90, usd: 4.99 },
      legendary: { brl: 34.90, usd: 7.99 },
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
