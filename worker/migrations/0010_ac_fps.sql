-- gravações do anti-cheat: quantos quadros por segundo (o site toca na velocidade certa)
ALTER TABLE ac_clips ADD COLUMN fps INTEGER NOT NULL DEFAULT 1;
