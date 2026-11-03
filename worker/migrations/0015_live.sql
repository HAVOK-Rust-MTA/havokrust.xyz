-- Site ao vivo (03/11/2026): feed do Discord e histórico de jogadores online.
-- O airdrop ao vivo não tem tabela: fica em bot_settings ('airdrop.live').

-- mensagens dos canais escolhidos com /site feed (havok-waitlist relê as 30 últimas de cada canal a cada 10 min)
-- embeds/attachments/reactions = JSON já limpo para o site (sem token, sem id de usuário)
CREATE TABLE discord_posts (
  id             TEXT    PRIMARY KEY,          -- id da mensagem (snowflake)
  channel_id     TEXT    NOT NULL,
  tab            TEXT    NOT NULL,             -- anuncios | atualizacoes | midia
  author_name    TEXT    NOT NULL,
  author_avatar  TEXT,                         -- URL do avatar (CDN do Discord)
  content        TEXT    NOT NULL DEFAULT '',  -- markdown do Discord, menções de usuário já trocadas por @nome
  embeds         TEXT    NOT NULL DEFAULT '[]',-- [{title, description, url, image, color}]
  attachments    TEXT    NOT NULL DEFAULT '[]',-- [{url, type, name, width, height}] (URL expira: o cron renova)
  reactions      TEXT    NOT NULL DEFAULT '[]',-- [{emoji, url, count}] (url só em emoji custom)
  created_at     INTEGER NOT NULL,             -- unix
  edited_at      INTEGER,                      -- unix ou null
  updated_at     INTEGER NOT NULL              -- unix da última leitura no Discord
);
CREATE INDEX idx_discord_posts_tab ON discord_posts (tab, created_at DESC);
CREATE INDEX idx_discord_posts_channel ON discord_posts (channel_id);

-- jogadores online a cada 5 min (havok-api, no POST /api/game/mta/live); apaga o que tem mais de 7 dias
CREATE TABLE server_samples (
  ts      INTEGER PRIMARY KEY,                 -- unix
  online  INTEGER NOT NULL,
  max     INTEGER NOT NULL
);
