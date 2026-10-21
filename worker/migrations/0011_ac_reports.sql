-- denúncias de morte: o jogo cria o código (vale 14 dias) e as gravações apontam para ele; o bot do Discord abre o
-- ticket com o código (uma vez só)
CREATE TABLE IF NOT EXISTS ac_reports (
  code TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  reporter TEXT NOT NULL,
  reporter_account TEXT,
  target TEXT NOT NULL,
  target_account TEXT,
  info TEXT,
  used_at INTEGER,
  used_by TEXT,
  thread_id TEXT
);
CREATE INDEX IF NOT EXISTS ac_reports_reporter ON ac_reports (reporter_account, created_at);
ALTER TABLE ac_clips ADD COLUMN report TEXT;
CREATE INDEX IF NOT EXISTS ac_clips_report ON ac_clips (report);
