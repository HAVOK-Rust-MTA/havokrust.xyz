// Definição do comando /staff (registrado por register-commands.mjs).
// default_member_permissions "8" (Administrador) só ESCONDE o comando de quem não é admin. Quem pode usar de verdade
// é conferido no Worker a cada uso (STAFF_ADMIN_ROLE_IDS / STAFF_ADMIN_USER_IDS).

const SUB = 1;
const STRING = 3;
const INTEGER = 4;
const BOOLEAN = 5;
const CHANNEL = 7;
const GUILD_TEXT = 0;

export const STAFF_COMMAND = {
  name: 'staff',
  description: 'Recrutamento da equipe de moderação',
  type: 1,
  contexts: [0], // só em servidor
  default_member_permissions: '8',
  options: [
    {
      type: SUB, name: 'painel', description: 'Publica ou sincroniza o painel de recrutamento',
      options: [{ type: CHANNEL, name: 'canal', description: 'Canal do painel (padrão: este canal)', channel_types: [GUILD_TEXT], required: false }],
    },
    {
      type: SUB, name: 'abrir', description: 'Abre as inscrições',
      options: [
        { type: INTEGER, name: 'vagas', description: 'Quantas vagas este recrutamento terá (padrão: 2)', min_value: 1, max_value: 25, required: false },
        { type: BOOLEAN, name: 'novo', description: 'Começar um processo NOVO: encerra o atual e todos podem se inscrever de novo', required: false },
      ],
    },
    {
      type: SUB, name: 'vagas', description: 'Muda a quantidade de vagas do recrutamento atual',
      options: [{ type: INTEGER, name: 'quantidade', description: 'Total de vagas (não pode ser menor que os já aprovados)', min_value: 1, max_value: 25, required: true }],
    },
    { type: SUB, name: 'fechar', description: 'Encerra as inscrições' },
    { type: SUB, name: 'reabrir', description: 'Reabre as inscrições do mesmo processo (as aprovações continuam valendo)' },
    { type: SUB, name: 'status', description: 'Inscrições, candidaturas e vagas' },
    {
      type: SUB, name: 'desfazer', description: 'Volta uma candidatura avaliada para pendente (fica registrado)',
      options: [
        { type: INTEGER, name: 'numero', description: 'Número da candidatura (ex.: 12)', min_value: 1, required: true },
        { type: STRING, name: 'motivo', description: 'Por que a decisão está sendo desfeita', min_length: 5, max_length: 300, required: true },
      ],
    },
    {
      type: SUB, name: 'avisar', description: 'Manda de novo a DM do resultado (e os cargos, se aprovado) para o candidato',
      options: [{ type: INTEGER, name: 'numero', description: 'Número da candidatura (ex.: 3)', min_value: 1, required: true }],
    },
    { type: SUB, name: 'sincronizar', description: 'Atualiza o painel e publica candidaturas que faltam no canal de análise' },
  ],
};
