-- Vínculo conta do jogo <-> Discord e login do site.
-- O jogo pede um código (assinado, HMAC); o jogador abre o link/QR, autoriza no Discord e o código liga as duas contas.
-- Uma conta do jogo tem um Discord e um Discord tem uma conta do jogo.
CREATE TABLE link_codes (
  code        TEXT    PRIMARY KEY,           -- 8 caracteres sem ambíguos (sem 0/O/1/I)
  account     TEXT    NOT NULL,              -- conta do jogo (a mesma chave que o servidor usa)
  nick        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  discord_id  TEXT,                          -- preenchido quando alguém autoriza com o Discord
  used_at     INTEGER
);
CREATE INDEX idx_link_codes_account ON link_codes (account);

CREATE TABLE players (
  discord_id    TEXT    PRIMARY KEY,
  account       TEXT    UNIQUE,              -- NULL = logou no site mas ainda não vinculou no jogo
  nick          TEXT,                        -- nick no jogo (último visto)
  discord_name  TEXT    NOT NULL,
  avatar        TEXT,                        -- hash do avatar do Discord (cdn.discordapp.com/avatars/<id>/<hash>.png)
  profile       TEXT,                        -- JSON público que o jogo manda: level, kills, grupo, badges...
  linked_at     INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- sessão do site: o cookie leva o token; aqui fica só o SHA-256 dele
CREATE TABLE sessions (
  token_hash  TEXT    PRIMARY KEY,
  discord_id  TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_discord ON sessions (discord_id);

-- "state" do OAuth (anti-CSRF): de onde veio e qual código de vínculo leva junto
CREATE TABLE oauth_states (
  state       TEXT    PRIMARY KEY,
  link_code   TEXT,
  created_at  INTEGER NOT NULL
);
