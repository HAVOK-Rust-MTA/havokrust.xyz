// Comando /waitinglist (registrado sozinho pelo Worker: recruit/register.js).
// default_member_permissions "8" só ESCONDE de quem não é admin; quem pode usar é conferido no Worker a cada uso.
export const WAITLIST_COMMAND = {
  name: 'waitinglist',
  description: 'Painéis da lista de espera',
  type: 1,
  contexts: [0],
  default_member_permissions: '8',
  options: [
    {
      type: 1, name: 'setup', description: 'Publica (ou atualiza) o painel: fila + botão numa mensagem só',
      options: [{ type: 5, name: 'apagar_antigo', description: 'Apaga o painel antigo da lista (o do webhook)', required: false }],
    },
    { type: 1, name: 'refresh', description: 'Atualiza os dois painéis agora' },
  ],
};
