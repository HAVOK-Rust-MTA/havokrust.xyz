-- emblema (id 01..12, img/emblems/<id>.png no site) e descrição de cada grupo, como o jogo mostra no F6
ALTER TABLE game_groups ADD COLUMN emblem TEXT;
ALTER TABLE game_groups ADD COLUMN description TEXT;
