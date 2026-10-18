-- Configurações persistentes do bot (sobrevivem a deploys). Hoje: o painel "entrar na lista de espera"
-- (canal, mensagem, última contagem desenhada) e o controle da atualização imediata depois de um clique.
CREATE TABLE bot_settings (
  key        TEXT    PRIMARY KEY,
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);
