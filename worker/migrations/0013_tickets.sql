-- tickets do Discord (suporte, vendas, sugestão, bug): botão no painel -> formulário com o motivo -> thread privada
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  nick TEXT,
  thread_id TEXT,
  created_at INTEGER NOT NULL,
  claimed_by TEXT,
  closed_at INTEGER,
  closed_by TEXT
);
CREATE INDEX IF NOT EXISTS tickets_user_open ON tickets (user_id, closed_at);
CREATE INDEX IF NOT EXISTS tickets_thread ON tickets (thread_id);
