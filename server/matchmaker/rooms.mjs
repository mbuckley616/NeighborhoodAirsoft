// v1.460 (backlog D.2 step 3, card fable/d2-room-list; Michael: B, 28 Oct): the matchmaker's rules, with nothing of
// Cloudflare in them, so the game's tests run the same code in Node (tests/room-list.test.mjs).
// A room is what a host who chose "Listed" says about it every 15 s: its four-letter code, the host's name, the map,
// the mode, the size, how many people are in and how many fit, and the game's version. A room nobody has said anything
// about for STALE_MS is gone. Only the host can change or take down his room: his first word carries a random key,
// and every later one must carry the same key. Nothing here is a secret; the codes are already shared by hand.
export const STALE_MS = 45000;      // three missed beats (the game beats every 15 s)
export const MAX_ROOMS = 300;       // a cap so a flood of fake rooms can't fill the memory
export const LIST_MAX = 50;         // the most rooms one list returns
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;   // the game's own letters (no I or O)

const clip = (s, n, re) => String(s == null ? '' : s).replace(re, '').trim().slice(0, n);
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

export function cleanRoom(b) {
  if (!b || typeof b !== 'object') return null;
  const code = String(b.code || '');
  if (!CODE_RE.test(code)) return null;
  const key = clip(b.key, 40, /[^A-Za-z0-9]/g);
  if (key.length < 12) return null;
  const max = int(b.max, 2, 8);
  return {
    code, key,
    host: clip(b.host, 14, /[^A-Za-z0-9 _.-]/g) || 'Friend',
    map: clip(b.map, 24, /[^a-z0-9_]/g),
    mapName: clip(b.mapName, 32, /[^A-Za-z0-9 '’.&-]/g),
    mode: b.mode === 'ffa' ? 'ffa' : 'teams',
    size: int(b.size, 1, 4),
    people: int(b.people, 1, max),
    max,
    tod: b.tod === 'night' ? 'night' : 'day',
    ver: clip(b.ver, 16, /[^A-Za-z0-9.]/g),
  };
}

export class Rooms {
  constructor() { this.rooms = new Map(); }
  sweep(now) { for (const [c, r] of this.rooms) if (now - r.at > STALE_MS) this.rooms.delete(c); }
  // Lists a room, or beats for it. { ok } or { error, status }.
  put(body, now) {
    this.sweep(now);
    const r = cleanRoom(body);
    if (!r) return { error: 'bad room', status: 400 };
    const had = this.rooms.get(r.code);
    if (had && had.key !== r.key) return { error: 'not your room', status: 403 };
    if (!had && this.rooms.size >= MAX_ROOMS) return { error: 'full', status: 503 };
    this.rooms.set(r.code, Object.assign(r, { at: now, since: had ? had.since : now }));
    return { ok: true };
  }
  drop(code, key, now) {
    this.sweep(now);
    const had = this.rooms.get(String(code || ''));
    if (!had) return { ok: true };
    if (had.key !== String(key || '')) return { error: 'not your room', status: 403 };
    this.rooms.delete(had.code);
    return { ok: true };
  }
  // The open rooms, newest first, without their keys
  list(now) {
    this.sweep(now);
    return [...this.rooms.values()].sort((a, b) => b.since - a.since).slice(0, LIST_MAX)
      .map(({ key, at, since, ...pub }) => Object.assign(pub, { age: Math.round((now - since) / 1000) }));
  }
}

// One request in, one answer out, as plain values: { status, body }. The Worker and the tests both call this.
//   GET    /rooms           -> { rooms: [...] }
//   POST   /rooms           -> a room's word (JSON body as cleanRoom reads it)
//   DELETE /rooms/<code>    -> takes it down (header X-Room-Key, or ?key=)
export function handle(rooms, method, path, body, key, now) {
  const m = path.replace(/\/+$/, '');
  if (method === 'GET' && (m === '/rooms' || m === '')) return { status: 200, body: { rooms: rooms.list(now) } };
  if (method === 'POST' && m === '/rooms') {
    const r = rooms.put(body, now);
    return r.ok ? { status: 200, body: { ok: true } } : { status: r.status, body: { error: r.error } };
  }
  const d = /^\/rooms\/([A-Z]{4})$/.exec(m);
  if (method === 'DELETE' && d) {
    const r = rooms.drop(d[1], key, now);
    return r.ok ? { status: 200, body: { ok: true } } : { status: r.status, body: { error: r.error } };
  }
  return { status: 404, body: { error: 'not found' } };
}
