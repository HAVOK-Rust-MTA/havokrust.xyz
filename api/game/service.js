// Jogadores e grupos do jogo para o site. Todo mundo que joga entra, com ou sem Discord vinculado.
//
//   POST /api/game/mta/sync   servidor MTA, assinado: {players: [...], groups: [...]?}
//                              players = quem mudou (online, saiu, ou a carga completa quando o servidor liga)
//                              groups  = a lista COMPLETA de grupos do wipe (substitui a anterior)
//   GET  /api/groups          público: grupos do wipe (sem membros)
//   GET  /api/group/<slug>    público: o grupo com os membros (nick, cargo, números, foto do Discord ou null)
//   GET  /api/player/<pid>    público: perfil (nick, números, grupo, badges, foto do Discord ou null)
//   GET  /api/ranking/players?by=kills|level|hours   público: top 50 jogadores do wipe (com foto ou null e o grupo)
//
// A conta (serial) nunca sai daqui: fora do servidor o jogador é o pid.
import { json, nowS, verifyServer, siteCors, clean, int, account, avatarUrl } from '../lib/util.js';

const MAX_SYNC_BYTES = 512 * 1024;
const PID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const PID_RE = /^[a-km-np-z2-9]{10}$/;
const ROLES = new Set(['Leader', 'Staff', 'Sub', 'Member']);

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
    // pid só nasce no primeiro registro; depois não muda nunca (é o link do perfil)
    stmts.push(db.prepare(`INSERT INTO game_players (account, pid, nick, level, kills, deaths, play_minutes, group_name, badges, first_seen, last_seen, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT (account) DO UPDATE SET nick = excluded.nick, level = excluded.level, kills = excluded.kills, deaths = excluded.deaths,
                             play_minutes = excluded.play_minutes, group_name = excluded.group_name, badges = excluded.badges,
                             last_seen = MAX(game_players.last_seen, excluded.last_seen), updated_at = excluded.updated_at`)
      .bind(acc, newPid(), nick, int(p.level), int(p.kills), int(p.deaths), int(p.playMinutes), clean(p.group) || null,
        JSON.stringify(sanitizeBadges(p.badges)), t, int(p.lastSeen) || t, t));
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
      stmts.push(db.prepare(`INSERT INTO game_groups (name, slug, tag, color, emblem, description, rank, xp, kills, deaths, members, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(name, slug, clean(g.tag, 8) || null, color(g.color), /^\d{2}$/.test(String(g.emblem)) ? String(g.emblem) : null, clean(g.desc, 160) || null,
          i + 1, int(g.xp), int(g.kills), int(g.deaths), JSON.stringify(members), t));
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
const PLAYER_SQL = `SELECT g.*, p.discord_id, p.avatar, gg.slug AS g_slug, gg.tag AS g_tag, gg.color AS g_color, gg.rank AS g_rank
  FROM game_players g LEFT JOIN players p ON p.account = g.account LEFT JOIN game_groups gg ON gg.name = g.group_name`;

export async function playerByAccount(db, acc) {
  return acc ? db.prepare(`${PLAYER_SQL} WHERE g.account = ?`).bind(acc).first() : null;
}

// r vem do PLAYER_SQL (já traz o grupo)
export function playerView(r) {
  let badges = {};
  try { badges = JSON.parse(r.badges || '{}'); } catch { badges = {}; }
  return { ...publicPlayer(r), badges, group: r.g_slug ? { name: r.group_name, slug: r.g_slug, tag: r.g_tag, color: r.g_color, rank: r.g_rank } : null };
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
  return path === '/api/game/mta/sync' || path === '/api/groups' || path.startsWith('/api/group/') || path.startsWith('/api/player/') || path === '/api/ranking/players';
}

export async function handleGameHttp(request, env, url, ctx) {
  const path = url.pathname;
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  if (path === '/api/game/mta/sync') return sync(request, env);

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
    const { results } = await db.prepare('SELECT slug, name, tag, color, emblem, description, rank, xp, kills, deaths, members FROM game_groups ORDER BY rank').all();
    return json({ groups: results.map(({ members, ...g }) => ({ ...g, members: JSON.parse(members).length })) }, 200, h);
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
      kills: g.kills, deaths: g.deaths, updatedAt: g.updated_at, members }, 200, h);
  }

  if (path === '/api/ranking/players') {
    const col = { kills: 'g.kills', level: 'g.level', hours: 'g.play_minutes' }[url.searchParams.get('by') || 'kills'];
    if (!col) return json({ error: 'bad_sort' }, 400, h);
    // só quem jogou neste wipe (o wipe zera os números)
    const { results } = await db.prepare(`SELECT g.*, p.discord_id, p.avatar, gg.slug AS g_slug, gg.tag AS g_tag, gg.color AS g_color
      FROM game_players g LEFT JOIN players p ON p.account = g.account LEFT JOIN game_groups gg ON gg.name = g.group_name
      WHERE g.kills > 0 OR g.play_minutes > 0 ORDER BY ${col} DESC, g.level DESC, g.kills DESC LIMIT 50`).all();
    return json({ players: results.map((r, i) => ({
      rank: i + 1, ...publicPlayer(r), group: r.g_slug ? { name: r.group_name, slug: r.g_slug, tag: r.g_tag, color: r.g_color } : null,
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
