-- prêmio da posição (só top 3), como o jogo manda: {winners, days, tier}
ALTER TABLE game_groups ADD COLUMN prize TEXT;
