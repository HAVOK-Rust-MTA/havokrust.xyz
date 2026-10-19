// Textos, cores e perguntas do recrutamento. Mudar aqui muda tudo (painel, formulário e análise).

export const BRAND = 'HAVOK RUST';
export const SITE = 'https://havokrust.xyz/';
export const LOGO = 'https://havokrust.xyz/logo.png';
// banners servidos pelo próprio Worker (recruit/banners.js). Trocou a imagem? Suba este número: o Discord guarda cache pela URL
export const BANNER_VERSION = 1;

export const COLORS = {
  brand: 0xff6a00,     // laranja HAVOK (o mesmo do painel da lista de espera)
  closed: 0x3a3632,    // cinza escuro
  pending: 0xd99a1e,   // âmbar
  approved: 0x3f9a52,  // verde
  rejected: 0xb23a32,  // vermelho
};

export const DEFAULT_SLOTS = 2;
export const DRAFT_TTL_S = 30 * 60;       // a primeira etapa vale 30 min
export const INTERACTION_KEEP_S = 24 * 60 * 60;

// Discord: modal tem no máximo 5 campos, e o envio de um modal não pode abrir outro modal.
// Por isso são duas etapas com um botão "Continuar candidatura" entre elas.
// max ≤ 1000 para cada resposta caber inteira num campo de embed (limite 1024).
export const QUESTIONS = {
  q1: { label: 'Qual é seu nick no jogo (MTA)?', style: 'short', min: 2, max: 32, placeholder: 'Exatamente como aparece no servidor' },
  q2: { label: 'Qual é sua faixa etária?', style: 'short', min: 2, max: 30, placeholder: 'Ex.: 18 a 24 anos' },
  q3: { label: 'Quanto tempo por dia e em quais horários?', style: 'paragraph', min: 10, max: 300, placeholder: 'Ex.: 3 h por dia, das 19h às 22h (horário de Brasília)' },
  q4: { label: 'Por que quer entrar na equipe de moderação?', style: 'paragraph', min: 20, max: 1000 },
  q5: { label: 'Acusação de hack sem provas: como agiria?', full: 'Um jogador acusa outro de usar hacks, mas não apresenta provas. Como você agiria?', style: 'paragraph', min: 20, max: 1000 },
  q6: { label: 'Um amigo seu viola as regras. O que faria?', full: 'Um amigo seu viola as regras do servidor. O que você faria?', style: 'paragraph', min: 20, max: 1000 },
  q7: { label: 'Já foi staff? Conte sua experiência', full: 'Você já participou da staff de algum servidor? Explique sua experiência ou por que acredita estar preparado.', style: 'paragraph', min: 20, max: 1000, placeholder: 'Conte onde e o que fazia, ou por que acredita estar preparado.' },
};
export const STEP1 = ['q1', 'q2', 'q3', 'q4'];
export const STEP2 = ['q5', 'q6', 'q7'];

const NUMBERS = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco'];
export const slotsWord = (n) => NUMBERS[n] || String(n);

export const TEXT = {
  intro: `Preencha as perguntas com atenção. Sua candidatura será analisada pela administração do ${BRAND}.\n\nSão duas etapas curtas. Responda com sinceridade: respostas copiadas ou vagas pesam contra.`,
  step1Done: 'Primeira etapa concluída! Clique em **Continuar candidatura** para finalizar.',
  done: `Sua candidatura foi enviada com sucesso! A equipe ${BRAND} analisará suas respostas. Acompanhe o Discord para futuras informações.`,
  duplicate: 'Você já possui uma candidatura registrada neste processo seletivo.',
  closed: `As inscrições para a equipe ${BRAND} estão encerradas no momento.`,
  filled: (n) => `As ${slotsWord(n)} vagas disponíveis foram preenchidas. O processo seletivo foi encerrado.`,
  expired: 'Sua primeira etapa expirou ou não foi encontrada. Clique de novo em **Candidatar-se à Staff** para recomeçar.',
  notAllowed: 'Você não tem permissão para fazer isso.',
  wrongGuild: `Este sistema só funciona no servidor do ${BRAND}.`,
  notConfigured: 'O sistema de recrutamento ainda não foi configurado. Avise a administração.',
  repeated: 'Esta ação já foi processada.',
  error: 'Algo deu errado do nosso lado. Tente de novo em alguns instantes.',
  dmApproved: (name, gotRole) => `**Parabéns, ${name}!** Sua candidatura para a equipe de moderação do ${BRAND} foi **aprovada**. ${gotRole ? 'Você já recebeu seus cargos de staff no Discord.' : 'Seus cargos de staff serão liberados pela administração.'}\n\nA administração vai falar com você em breve com os próximos passos. Bem-vindo à equipe!`,
  dmRejected: (name) => `Olá, ${name}. Obrigado pelo interesse em fazer parte da equipe do ${BRAND}.\n\nDesta vez sua candidatura **não foi aprovada**. Você poderá se candidatar de novo quando abrirmos um próximo processo seletivo.`,
};

export const PANEL = {
  title: 'PROCESSO SELETIVO — EQUIPE DE MODERAÇÃO',
  intro: 'Estamos selecionando novos integrantes para a **equipe de moderação** do HAVOK RUST.',
  how: 'Clique em **Candidatar-se à Staff** e responda dois formulários curtos. As respostas são privadas: só a administração vê.',
  footer: 'HAVOK RUST · Uma candidatura por pessoa',
  requirements: [
    'Maturidade e responsabilidade.',
    'Respeito pelas regras.',
    'Boa comunicação.',
    'Disponibilidade para acompanhar o servidor.',
    'Imparcialidade na resolução de conflitos.',
    'Compromisso com a comunidade.',
  ],
  steps: ['Inscrição.', 'Análise das respostas.', 'Avaliação final pela administração.'],
  button: 'Candidatar-se à Staff',
  buttonClosed: 'Inscrições encerradas',
};
