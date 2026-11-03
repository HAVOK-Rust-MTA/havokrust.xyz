// Jogadores e grupos do jogo para o site. Todo mundo que joga entra, com ou sem Discord vinculado.
//
//   POST /api/game/mta/sync   servidor MTA, assinado: {players: [...], groups: [...]?}
//   POST /api/game/mta/live   servidor MTA, assinado: {players, max} — quantos estão online AGORA (vem a cada entrada/saída
//                              e 1x por minuto). O site e a embed do Discord (havok-waitlist) leem daqui ('status.live').
//                              Também grava a amostra do histórico (server_samples, ver live/service.js).
//                              players = quem mudou (online, saiu, ou a carga completa quando o servidor liga)
//                              groups  = a lista COMPLETA de grupos do wipe (substitui a anterior)
//   GET  /api/groups          público: grupos do wipe (sem membros)
//   GET  /api/group/<slug>    público: o grupo com os membros (nick, cargo, números, foto do Discord ou null)
//   GET  /api/player/<pid>    público: perfil (nick, números, grupo, badges, foto do Discord ou null)
//   GET  /api/ranking/players?scope=wipe|all&by=kills|level|hours|kd   público: top 50 do wipe ou de sempre (ver README)
//
// A conta (serial) nunca sai daqui: fora do servidor o jogador é o pid.
import { json, nowS, verifyServer, siteCors, clean, int, ts, account, avatarUrl } from '../lib/util.js';
import { recordSample } from '../live/service.js';

const MAX_SYNC_BYTES = 512 * 1024;
const PID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const PID_RE = /^[a-km-np-z2-9]{10}$/;
const ROLES = new Set(['Leader', 'Staff', 'Sub', 'Member']);

// K/D: abates / mortes (morte zero conta como 1); só entra no ranking de K/D quem tem 10+ abates
const KD_MIN_KILLS = 10;
const KD = (t) => `(${t}.kills * 1.0 / MAX(${t}.deaths, 1))`;
const kd = (kills, deaths) => Math.round((kills / Math.max(deaths, 1)) * 100) / 100;

const newPid = () => [...crypto.getRandomValues(new Uint8Array(10))].map((b) => PID_ALPHABET[b & 31]).join('');
const color = (c) => (/^#[0-9a-fA-F]{6}$/.test(String(c)) ? String(c) : null);

export function sanitizeBadges(b) {
  const out = {};
  if (b && typeof b === 'object') {
    for (const [id, n] of Object.entries(b).slice(0, 64)) if (/^[a-z0-9]{1,24}$/.test(id)) out[id] = Math.max(1, Math.min(999, int(n)));
  }
  return out;
}

export function slugify(name) {
  const s = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'grupo';
}

// //------------------- JOGADORES ONLINE AGORA -------------------\\
async function live(request, env) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await verifyServer(request, env, '/api/game/mta/live', 1024);
  if (body === null) return json({ error: 'unauthorized' }, 401);
  let d;
  try {
    d = JSON.parse(body);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const players = Math.max(0, Math.min(1000, int(d.players)));
  const max = Math.max(0, Math.min(1000, int(d.max)));
  const value = JSON.stringify({ players, max, at: nowS() });
  await env.DB.prepare(
    `INSERT INTO bot_settings (key, value, updated_at) VALUES ('status.live', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(value, nowS()).run();
  // histórico do status (/api/status/history): no máximo uma amostra a cada 5 min, 7 dias
  await recordSample(env.DB, players, max);
  return json({ ok: true });
}

// //------------------- SYNC DO JOGO -------------------\\
async function sync(request, env) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await verifyServer(request, env, '/api/game/mta/sync', MAX_SYNC_BYTES);
  if (body === null) return json({ error: 'unauthorized' }, 401);
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const db = env.DB;
  const t = nowS();
  const stmts = [];

  const players = (Array.isArray(data.players) ? data.players : []).slice(0, 2000);
  for (const p of players) {
    const acc = account(p && p.account);
    const nick = clean(p && p.nick);
    if (!acc || !nick) continue;
    // pid só nasce no primeiro registro da conta e fica em player_ids para sempre (o wipe não apaga): é o link do perfil
    // quem já estava em game_players sem player_ids (sync da API antiga depois da migration) fica com o pid que tinha
    stmts.push(db.prepare('INSERT OR IGNORE INTO player_ids (account, pid) SELECT account, pid FROM game_players WHERE account = ?').bind(acc));
    stmts.push(db.prepare('INSERT OR IGNORE INTO player_ids (account, pid) VALUES (?, ?)').bind(acc, newPid()));
    stmts.push(db.prepare(`INSERT INTO game_players (account, pid, nick, level, kills, deaths, play_minutes, group_name, badges, first_seen, last_seen, updated_at)
                           VALUES (?, (SELECT pid FROM player_ids WHERE account = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT (account) DO UPDATE SET nick = excluded.nick, level = excluded.level, kills = excluded.kills, deaths = excluded.deaths,
                             play_minutes = excluded.play_minutes, group_name = excluded.group_name, badges = excluded.badges,
                             last_seen = MAX(game_players.last_seen, excluded.last_seen), updated_at = excluded.updated_at`)
      .bind(acc, acc, nick, int(p.level), int(p.kills), int(p.deaths), int(p.playMinutes), clean(p.group) || null,
        JSON.stringify(sanitizeBadges(p.badges)), t, ts(p.lastSeen) || t, t));
  }

  let groups = null;
  if (Array.isArray(data.groups)) {
    groups = 0;
    const used = new Set();
    stmts.push(db.prepare('DELETE FROM game_groups'));
    data.groups.slice(0, 500).forEach((g, i) => {
      const name = clean(g && g.name);
      if (!name || used.has(`n:${name}`)) return;
      let slug = slugify(name);
      for (let k = 2; used.has(`s:${slug}`); k++) slug = `${slugify(name)}-${k}`;
      used.add(`n:${name}`);
      used.add(`s:${slug}`);
      const members = (Array.isArray(g.members) ? g.members : []).slice(0, 32).map((m) => ({ account: account(m && m.acc), role: ROLES.has(m && m.role) ? m.role : 'Member' }))
        .filter((m) => m.account);
      // prêmio da posição (top 3): horas de VIP para todo o grupo (desde 21/10/2026) ou o sorteio antigo
      // (quantos sorteados e quantos dias), e qual VIP
      const pz = g.prize && typeof g.prize === 'object' ? { hours: Math.min(720, int(g.prize.hours)), winners: Math.min(99, int(g.prize.winners)), days: Math.min(365, int(g.prize.days)), tier: Math.min(3, int(g.prize.tier)) } : null;
      stmts.push(db.prepare(`INSERT INTO game_groups (name, slug, tag, color, emblem, description, rank, xp, kills, deaths, members, prize, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(name, slug, clean(g.tag, 8) || null, color(g.color), /^\d{2}$/.test(String(g.emblem)) ? String(g.emblem) : null, clean(g.desc, 160) || null,
          i + 1, int(g.xp), int(g.kills), int(g.deaths), JSON.stringify(members), pz && (pz.hours || (pz.winners && pz.days)) ? JSON.stringify(pz) : null, t));
      groups++;
    });
  }
  // D1 aceita lote grande, mas em pedaços fica dentro do limite por chamada
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  return json({ players: players.length, groups });
}

// //------------------- PÚBLICO -------------------\\
// jogador como o site mostra: foto do Discord só se vinculou
const publicPlayer = (r) => ({
  pid: r.pid, nick: r.nick, level: r.level, kills: r.kills, deaths: r.deaths, playMinutes: r.play_minutes,
  linked: !!r.discord_id, avatarUrl: avatarUrl(r.discord_id, r.avatar), lastSeen: r.last_seen,
});
// jogador + foto + grupo numa consulta só (o banco fica longe: cada ida e volta custa caro)
const PLAYER_SQL = `SELECT g.*, p.discord_id, p.avatar, p.bio, p.youtube, p.tiktok,
    gg.slug AS g_slug, gg.tag AS g_tag, gg.color AS g_color, gg.rank AS g_rank, gg.emblem AS g_emblem, gg.members AS g_members
  FROM game_players g LEFT JOIN players p ON p.account = g.account LEFT JOIN game_groups gg ON gg.name = g.group_name`;

export async function playerByAccount(db, acc) {
  return acc ? db.prepare(`${PLAYER_SQL} WHERE g.account = ?`).bind(acc).first() : null;
}

// r vem do PLAYER_SQL (já traz o grupo: emblema, posição e o cargo dele lá dentro)
export function playerView(r) {
  let badges = {};
  try { badges = JSON.parse(r.badges || '{}'); } catch { badges = {}; }
  let group = null;
  if (r.g_slug) {
    let members = [];
    try { members = JSON.parse(r.g_members || '[]'); } catch { members = []; }
    const me = members.find((m) => m.account === r.account);
    group = { name: r.group_name, slug: r.g_slug, tag: r.g_tag, color: r.g_color, rank: r.g_rank, emblem: r.g_emblem, members: members.length, role: me ? me.role : 'Member' };
  }
  // descrição e links: só de quem vinculou o Discord (foi ele que escreveu)
  const social = r.discord_id ? { bio: r.bio || '', youtube: r.youtube || '', tiktok: r.tiktok || '' } : null;
  return { ...publicPlayer(r), badges, group, social };
}

// páginas públicas guardadas 60 s na borda da Cloudflare: a segunda visita não vai ao banco
const EDGE_TTL = 60;
async function cached(request, url, ctx, build) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.toString(), { method: 'GET' });
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const res = await build();
  if (cache && res.status === 200) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('Cache-Control', `public, max-age=${EDGE_TTL}`);
    ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(key, copy)) : await cache.put(key, copy);
  }
  return res;
}

export function isGamePath(path) {
  return path === '/api/game/mta/sync' || path === '/api/game/mta/live' || path === '/api/groups' || path.startsWith('/api/group/') || path.startsWith('/api/player/') || path === '/api/ranking/players';
}

export async function handleGameHttp(request, env, url, ctx) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  if (path === '/api/game/mta/sync') return sync(request, env);
  if (path === '/api/game/mta/live') return live(request, env);

  const h = { ...siteCors(request, env), 'Cache-Control': 'public, max-age=60' };
  if (request.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, h);
  const db = env.DB;
  // o corpo vem do cache; o CORS é de quem pediu
  const withCors = (res) => {
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  };
  return withCors(await cached(request, url, ctx, () => publicRoute(db, path, url)));
}

async function publicRoute(db, path, url) {
  const h = { 'Cache-Control': 'public, max-age=60' };
  if (path === '/api/groups') {
    const { results } = await db.prepare('SELECT slug, name, tag, color, emblem, description, rank, xp, kills, deaths, members, prize FROM game_groups ORDER BY rank').all();
    return json({ groups: results.map(({ members, prize, ...g }) => ({ ...g, members: JSON.parse(members).length, prize: prize ? JSON.parse(prize) : null })) }, 200, h);
  }

  if (path.startsWith('/api/group/')) {
    const slug = decodeURIComponent(path.slice('/api/group/'.length));
    const g = /^[a-z0-9-]{1,48}$/.test(slug) && await db.prepare('SELECT * FROM game_groups WHERE slug = ?').bind(slug).first();
    if (!g) return json({ error: 'not_found' }, 404, h);
    // todos os membros numa consulta (json_each na lista de contas do grupo); quem nunca apareceu no sync fica de fora
    const { results } = await db.prepare(`SELECT g.*, p.discord_id, p.avatar, json_extract(j.value, '$.role') AS role
      FROM game_groups gr, json_each(gr.members) j JOIN game_players g ON g.account = json_extract(j.value, '$.account')
      LEFT JOIN players p ON p.account = g.account WHERE gr.slug = ?`).bind(slug).all();
    const members = results.map((r) => ({ ...publicPlayer(r), role: r.role }));
    const order = { Leader: 1, Staff: 2, Sub: 3, Member: 4 };
    members.sort((a, b) => (order[a.role] - order[b.role]) || (b.level - a.level));
    return json({ slug: g.slug, name: g.name, tag: g.tag, color: g.color, emblem: g.emblem, description: g.description, rank: g.rank, xp: g.xp,
      kills: g.kills, deaths: g.deaths, updatedAt: g.updated_at, prize: g.prize ? JSON.parse(g.prize) : null, members }, 200, h);
  }

  if (path === '/api/ranking/players') {
    const by = url.searchParams.get('by') || 'kills';
    const scope = url.searchParams.get('scope') || 'wipe';
    // ordem e filtro saem só destes mapas fixos: o texto da URL nunca entra no SQL
    const ORDER = {
      wipe: { kills: 'g.kills DESC, g.level DESC', level: 'g.level DESC, g.kills DESC', hours: 'g.play_minutes DESC, g.level DESC, g.kills DESC', kd: `${KD('g')} DESC, g.kills DESC` },
      all: { kills: 'a.kills DESC, a.play_minutes DESC', hours: 'a.play_minutes DESC, a.kills DESC', kd: `${KD('a')} DESC, a.kills DESC` },
    };
    const order = ORDER[scope] && ORDER[scope][by];
    if (!order) return json({ error: 'bad_sort' }, 400, h);
    const kdOnly = by === 'kd' ? ` AND ${scope === 'all' ? 'a' : 'g'}.kills >= ${KD_MIN_KILLS}` : '';
    const group = (r) => (r.g_slug ? { name: r.group_name, slug: r.g_slug, tag: r.g_tag, color: r.g_color } : null);

    if (scope === 'wipe') {
      // só quem jogou neste wipe (o wipe zera os números)
      const { results } = await db.prepare(`SELECT g.*, p.discord_id, p.avatar, gg.slug AS g_slug, gg.tag AS g_tag, gg.color AS g_color
        FROM game_players g LEFT JOIN players p ON p.account = g.account LEFT JOIN game_groups gg ON gg.name = g.group_name
        WHERE (g.kills > 0 OR g.play_minutes > 0)${kdOnly} ORDER BY ${order} LIMIT 50`).all();
      return json({ scope, by, players: results.map((r, i) => ({
        rank: i + 1, ...publicPlayer(r), kd: kd(r.kills, r.deaths), group: group(r),
        badges: (() => { try { return Object.keys(JSON.parse(r.badges || '{}')); } catch { return []; } })(),
      })) }, 200, h);
    }

    // de sempre = seasons fotografadas (menos a do ciclo atual: durante o wipe ela ainda está em game_players) + o wipe atual
    const { results } = await db.prepare(`WITH s AS (
        SELECT account, nick, kills, deaths, play_minutes, cycle_id AS c FROM player_seasons
          WHERE cycle_id <> COALESCE((SELECT id FROM wipe_cycles WHERE is_current = 1), -1)
        UNION ALL
        SELECT account, nick, kills, deaths, play_minutes, 2147483647 FROM game_players WHERE kills > 0 OR play_minutes > 0),
      a AS (SELECT account, SUM(kills) AS kills, SUM(deaths) AS deaths, SUM(play_minutes) AS play_minutes, COUNT(*) AS seasons FROM s GROUP BY account)
      SELECT a.*, (SELECT nick FROM s WHERE s.account = a.account ORDER BY c DESC LIMIT 1) AS nick, i.pid, p.discord_id, p.avatar,
        gp.group_name, gg.slug AS g_slug, gg.tag AS g_tag, gg.color AS g_color
      FROM a JOIN player_ids i ON i.account = a.account LEFT JOIN players p ON p.account = a.account
        LEFT JOIN game_players gp ON gp.account = a.account LEFT JOIN game_groups gg ON gg.name = gp.group_name
      WHERE 1${kdOnly} ORDER BY ${order} LIMIT 50`).all();
    return json({ scope, by, players: results.map((r, i) => ({
      rank: i + 1, pid: r.pid, nick: r.nick, kills: r.kills, deaths: r.deaths, playMinutes: r.play_minutes, kd: kd(r.kills, r.deaths), seasons: r.seasons,
      linked: !!r.discord_id, avatarUrl: avatarUrl(r.discord_id, r.avatar), group: group(r), badges: [],
    })) }, 200, h);
  }

  if (path.startsWith('/api/player/')) {
    const pid = path.slice('/api/player/'.length);
    const r = PID_RE.test(pid) && await db.prepare(`${PLAYER_SQL} WHERE g.pid = ?`).bind(pid).first();
    if (!r) return json({ error: 'not_found' }, 404, h);
    return json(playerView(r), 200, h);
  }
  return json({ error: 'not_found' }, 404, h);
}
