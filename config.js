// Configuração do site HAVOK. Edite aqui sem mexer no resto.
window.HAVOK = {
  // convite do Discord (botão do topo, da Store e do rodapé)
  discord: 'https://discord.gg/WZqhuFb2w5',
  // lista de espera: URL do Worker (worker/README.md). Vazio = o contador não aparece.
  // ex.: api: 'https://havok-waitlist.SEU-USUARIO.workers.dev/waitlist'
  waitlist: { api: 'https://havok-waitlist.havokrust.workers.dev/waitlist', goal: 30 },
  // wipe: calendário oficial do Worker (o mesmo do Discord e do servidor). Sem wipe agendado, o contador não aparece.
  wipe: { api: 'https://havok-waitlist.havokrust.workers.dev/api/wipe/status' },
  // ranking do wipe atual (o servidor do jogo manda a cada 5 min). Vazio = a seção não aparece.
  ranking: { api: 'https://havok-waitlist.havokrust.workers.dev/api/ranking' },
  // perfil / login com Discord: o Worker no subdomínio do site (o cookie do login só funciona no mesmo domínio).
  // Vazio = a página de perfil avisa que o login ainda não está disponível.
  account: { api: 'https://api.havokrust.xyz' },
  // preços do VIP (por mês) em reais e dólar. Tirar um preço = mostra "Consulte no Discord".
  vip: {
    period: 'month',
    prices: {
      survivor: { brl: 15.00, usd: 2.99 },
      veteran: { brl: 45.00, usd: 7.99 },
      legendary: { brl: 90.00, usd: 15.99 },
    },
  },
  // endereço do servidor MTA para a página /play e o card da home. Vazio = página sem o botão.
  server: '177.54.146.12:22360',
  // jogadores online (o Worker lê a lista pública do MTA). Vazio = sem a contagem.
  serverStatus: { api: 'https://havok-waitlist.havokrust.workers.dev/api/server' },
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
