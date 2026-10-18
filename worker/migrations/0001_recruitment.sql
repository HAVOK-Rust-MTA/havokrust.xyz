-- Recrutamento da staff (Discord). O D1 é a fonte de verdade; o Discord só mostra.
-- Datas em segundos Unix (o Discord formata com <t:...>).

-- Um processo seletivo por vez fica aberto. Fechado à mão = 'closed' (pode reabrir);
-- vagas preenchidas = 'filled' (não reabre; um processo novo precisa de /staff abrir novo:true).
CREATE TABLE recruitment_processes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT    NOT NULL,
  status           TEXT    NOT NULL CHECK (status IN ('open', 'closed', 'filled')),
  max_slots        INTEGER NOT NULL CHECK (max_slots BETWEEN 1 AND 25),
  panel_channel_id TEXT,
  panel_message_id TEXT,
  panel_dirty      INTEGER NOT NULL DEFAULT 1,  -- 1 = o painel no Discord precisa ser atualizado (o cron tenta de novo)
  created_by       TEXT    NOT NULL,
  created_at       INTEGER NOT NULL,
  closed_at        INTEGER
);
CREATE UNIQUE INDEX one_open_process ON recruitment_processes (guild_id) WHERE status = 'open';

-- Só candidaturas COMPLETAS (as duas etapas). Uma por pessoa em cada processo.
CREATE TABLE staff_applications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id        INTEGER NOT NULL REFERENCES recruitment_processes (id),
  guild_id          TEXT    NOT NULL,
  user_id           TEXT    NOT NULL,
  username          TEXT    NOT NULL,
  display_name      TEXT,
  game_nick         TEXT    NOT NULL,
  answers           TEXT    NOT NULL,  -- JSON {q1..q7}
  status            TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at        INTEGER NOT NULL,
  decided_by        TEXT,
  decided_at        INTEGER,
  review_channel_id TEXT,
  review_message_id TEXT,  -- NULL = ainda não foi publicada no canal de análise (o cron tenta de novo)
  UNIQUE (process_id, user_id)
);
CREATE INDEX idx_applications_process_status ON staff_applications (process_id, status);

-- Segunda barreira do limite de vagas (a primeira é o próprio UPDATE condicional):
-- nenhuma escrita consegue passar de max_slots aprovados, nem com cliques simultâneos.
CREATE TRIGGER staff_approval_limit
BEFORE UPDATE OF status ON staff_applications
WHEN NEW.status = 'approved' AND OLD.status <> 'approved'
BEGIN
  SELECT RAISE(ABORT, 'slots_full')
  WHERE (SELECT COUNT(*) FROM staff_applications WHERE process_id = NEW.process_id AND status = 'approved')
     >= (SELECT max_slots FROM recruitment_processes WHERE id = NEW.process_id);
END;

-- Toda candidatura nasce pendente.
CREATE TRIGGER staff_application_insert_pending
BEFORE INSERT ON staff_applications
WHEN NEW.status <> 'pending'
BEGIN
  SELECT RAISE(ABORT, 'must_start_pending');
END;

-- Primeira etapa do formulário, enquanto a segunda não chega. Expira (o cron apaga).
CREATE TABLE application_drafts (
  process_id INTEGER NOT NULL,
  user_id    TEXT    NOT NULL,
  session    TEXT    NOT NULL,
  answers    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (process_id, user_id)
);

CREATE TABLE recruitment_audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id     INTEGER,
  application_id INTEGER,
  actor_id       TEXT    NOT NULL,
  action         TEXT    NOT NULL,
  detail         TEXT,
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_audit_application ON recruitment_audit_log (application_id);

-- Interações já tratadas (a mesma interação reenviada não é processada duas vezes). O cron limpa.
CREATE TABLE processed_interactions (
  id         TEXT    PRIMARY KEY,
  created_at INTEGER NOT NULL
);
