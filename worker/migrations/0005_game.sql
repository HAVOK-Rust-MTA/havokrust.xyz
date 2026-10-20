-- Todo jogador que joga fica aqui, com ou sem Discord. A conta (serial) é privada: o site só vê o pid.
-- Quando o jogador vincula o Discord (players.account), a foto e o nome do Discord passam a aparecer junto.
CREATE TABLE game_players (
  account       TEXT    PRIMARY KEY,         -- conta do jogo (privada, nunca sai pela API pública)
  pid           TEXT    NOT NULL UNIQUE,     -- id público do perfil (#/jogador/<pid>)
  nick          TEXT    NOT NULL,
  level         INTEGER NOT NULL DEFAULT 0,
  kills         INTEGER NOT NULL DEFAULT 0,
  deaths        INTEGER NOT NULL DEFAULT 0,
  play_minutes  INTEGER NOT NULL DEFAULT 0,
  group_name    TEXT,
  badges        TEXT,                        -- JSON {id: quantidade}
  first_seen    INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_game_players_group ON game_players (group_name);

-- grupos do wipe atual, como o jogo manda (membros = contas + cargo)
CREATE TABLE game_groups (
  name        TEXT    PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,       -- #/grupo/<slug>
  tag         TEXT,
  color       TEXT,
  rank        INTEGER NOT NULL,
  xp          INTEGER NOT NULL DEFAULT 0,
  kills       INTEGER NOT NULL DEFAULT 0,
  deaths      INTEGER NOT NULL DEFAULT 0,
  members     TEXT    NOT NULL,              -- JSON [{account, role}]
  updated_at  INTEGER NOT NULL
);
