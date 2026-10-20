// HAVOK API (Cloudflare Worker em api.havokrust.xyz): login com Discord, vínculo com o jogo, perfis e grupos.
// Separado do bot (havok-waitlist): um cair não derruba o outro. Mesmo banco D1.
//
//   link/  -> /v/<código>, /auth/discord*, /api/me, /api/logout, /api/link/mta/*
//   game/  -> /api/game/mta/sync, /api/groups, /api/group/<slug>, /api/player/<pid>
import { handleLinkHttp, isLinkPath, linkCron } from './link/service.js';
import { handleGameHttp, isGamePath } from './game/service.js';
import { json } from './lib/util.js';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(linkCron(env).catch((e) => console.error('link cron:', e.message)));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (isLinkPath(url.pathname)) return await handleLinkHttp(request, env, ctx, url);
      if (isGamePath(url.pathname)) return await handleGameHttp(request, env, url);
    } catch (e) {
      console.error('api:', url.pathname, e.message);
      return json({ error: 'internal' }, 500);
    }
    return json({ error: 'not_found' }, 404);
  },
};
