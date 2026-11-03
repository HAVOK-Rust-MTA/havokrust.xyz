-- Ranking de sempre (03/11/2026). O wipe apaga game_players/game_groups; o que fica guardado está aqui.

-- id público do jogador para sempre: a conta (serial) volta depois do wipe com o mesmo pid (link do perfil não quebra)
CREATE TABLE player_ids (
  account  TEXT  PRIMARY KEY,
  pid      TEXT  NOT NULL UNIQUE
);
INSERT OR IGNORE INTO player_ids (account, pid) SELECT account, pid FROM game_players;

-- foto de cada jogador no começo do wipe (evento wipe_started), uma linha por season
CREATE TABLE player_seasons (
  cycle_id      INTEGER NOT NULL,
  account       TEXT    NOT NULL,
  nick          TEXT    NOT NULL,
  level         INTEGER NOT NULL DEFAULT 0,
  kills         INTEGER NOT NULL DEFAULT 0,
  deaths        INTEGER NOT NULL DEFAULT 0,
  play_minutes  INTEGER NOT NULL DEFAULT 0,
  group_name    TEXT,
  saved_at      INTEGER NOT NULL,
  PRIMARY KEY (cycle_id, account)
);
CREATE INDEX idx_player_seasons_account ON player_seasons (account);

-- foto de cada grupo no começo do wipe, com a posição final
CREATE TABLE group_seasons (
  cycle_id       INTEGER NOT NULL,
  name           TEXT    NOT NULL,
  tag            TEXT,
  color          TEXT,
  emblem         TEXT,
  rank           INTEGER NOT NULL,
  xp             INTEGER NOT NULL DEFAULT 0,
  kills          INTEGER NOT NULL DEFAULT 0,
  deaths         INTEGER NOT NULL DEFAULT 0,
  members_count  INTEGER NOT NULL DEFAULT 0,
  saved_at       INTEGER NOT NULL,
  PRIMARY KEY (cycle_id, name)
);
