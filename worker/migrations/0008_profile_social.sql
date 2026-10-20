-- o que o próprio jogador escreve no perfil (só quem vinculou o Discord): descrição e links
ALTER TABLE players ADD COLUMN bio TEXT;
ALTER TABLE players ADD COLUMN youtube TEXT;
ALTER TABLE players ADD COLUMN tiktok TEXT;
