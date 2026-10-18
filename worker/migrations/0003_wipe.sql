-- Calendário oficial do wipe (o Worker/D1 manda; o servidor MTA executa e confirma).
-- Datas em segundos Unix (UTC). A fase (NORMAL / FINAL_PVP / WIPE_PENDING) sai da hora atual vs. scheduled_wipe_at:
-- nada é decrementado no banco.
CREATE TABLE wipe_cycles (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at        INTEGER NOT NULL,
  scheduled_wipe_at INTEGER NOT NULL,
  -- active  = contando (normal ou últimas 24 h)
  -- wiping  = o servidor avisou que começou o wipe
  -- failed  = o servidor avisou que o wipe falhou (fica até a administração resolver)
  -- completed = wipe confirmado pelo servidor (histórico)
  status            TEXT    NOT NULL CHECK (status IN ('active', 'wiping', 'failed', 'completed')),
  is_current        INTEGER UNIQUE CHECK (is_current IS NULL OR is_current = 1), -- 1 = o ciclo atual (só um)
  previous_cycle_id INTEGER UNIQUE REFERENCES wipe_cycles (id),                  -- uma confirmação gera um ciclo só
  pvp_confirmed_at  INTEGER,  -- o servidor confirmou o modo PvP das últimas 24 h
  wipe_started_at   INTEGER,
  actual_wipe_at    INTEGER,
  wipe_confirmed_at INTEGER,
  created_by        TEXT    NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (scheduled_wipe_at > started_at),
  CHECK ((status = 'completed') = (is_current IS NULL))
);

-- Tudo o que aconteceu (servidor, administração, avisos). dedupe_key impede evento ou aviso repetido.
CREATE TABLE wipe_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id   INTEGER,
  event_type TEXT    NOT NULL,
  event_at   INTEGER NOT NULL,
  origin     TEXT    NOT NULL,   -- 'mta', 'admin:<id>', 'cron'
  metadata   TEXT,
  dedupe_key TEXT    UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_wipe_events_cycle ON wipe_events (cycle_id);
