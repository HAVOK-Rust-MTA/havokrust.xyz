-- denúncias: a staff conclui o ticket pelo botão no Discord (quando, quem e o resultado); o jogo mostra "CONCLUÍDA" no F5
ALTER TABLE ac_reports ADD COLUMN closed_at INTEGER;
ALTER TABLE ac_reports ADD COLUMN closed_by TEXT;
ALTER TABLE ac_reports ADD COLUMN verdict TEXT;
