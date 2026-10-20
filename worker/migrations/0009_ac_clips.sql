-- anti-cheat (havok_ac): gravações dos últimos segundos de um jogador (1 quadro/s, JPEG) e prints
-- o id é aleatório (128 bits) e só aparece no canal de staff do Discord; tudo some sozinho em 14 dias (cron)
CREATE TABLE IF NOT EXISTS ac_clips (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  player TEXT NOT NULL,
  account TEXT,
  reason TEXT NOT NULL,
  detail TEXT,
  frames INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ac_clips_created ON ac_clips (created_at);

CREATE TABLE IF NOT EXISTS ac_frames (
  clip_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (clip_id, idx)
);
