// v1.460 (backlog D.2 step 3, card fable/d2-room-list): the matchmaker as a Cloudflare Worker (free plan). Every request
// goes to one Durable Object, `Lobby`, so every player sees the same list wherever they are; it keeps the rooms in
// memory only (a room lives 45 s past its last beat, and the hosts' beats refill it if Cloudflare ever restarts it).
// The rules are in rooms.mjs. Open to every origin: the game runs from itch.io's page or from a downloaded file.
import { Rooms, handle } from './rooms.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Room-Key',
  'Access-Control-Max-Age': '86400',
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export class Lobby {
  constructor() { this.rooms = new Rooms(); }
  async fetch(request) {
    const url = new URL(request.url);
    let body = null;
    if (request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2000) return json(413, { error: 'too big' });
      try { body = JSON.parse(text); } catch (e) { return json(400, { error: 'bad json' }); }
    }
    const key = request.headers.get('X-Room-Key') || url.searchParams.get('key') || '';
    const r = handle(this.rooms, request.method, url.pathname, body, key, Date.now());
    return json(r.status, r.body);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === '/') return json(200, { ok: true, what: 'Neighborhood Airsoft matchmaker', rooms: '/rooms' });
    const lobby = env.LOBBY.get(env.LOBBY.idFromName('lobby'));
    return lobby.fetch(request);
  },
};
