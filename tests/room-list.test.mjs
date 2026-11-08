// v1.460 (backlog D.2 step 3, card fable/d2-room-list; Michael: B, 28 Oct): the title's CAMPAIGN / ONLINE / SETTINGS and
// the room list. Two headless games; the matchmaker is server/matchmaker/rooms.mjs itself, run here in Node behind a
// routed address (no network in CI), on a clock this suite moves. The link between the games is a stub transport, as in
// tests/online-teams.test.mjs. Checked: the title's three buttons go where they should (CAMPAIGN keeps CONTINUE / NEW
// GAME and its BACK; a save loads through ONLINE as through CONTINUE); with no address there is no list and nothing is
// fetched, at startup or on the online screen; with one, a private room never shows, a listed one shows in the other
// game's list and its JOIN lands in the same room a code does; the room comes off the list when its match starts, when
// the host leaves, and on its own 45 s after a host who vanished; a matchmaker that is down leaves the codes working.
import { boot, check } from './lib/game.mjs';
import { Rooms, handle, STALE_MS } from '../server/matchmaker/rooms.mjs';

const MM = 'https://mm.test';
const rooms = new Rooms();
let now = 1e6, down = false, hits = 0;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Room-Key' };
async function serve(route) {
  const req = route.request();
  hits++;
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (down) return route.fulfill({ status: 502, headers: CORS, body: 'down' });
  let body = null;
  try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch (e) {}
  const r = handle(rooms, req.method(), new URL(req.url()).pathname, body, req.headers()['x-room-key'] || '', now);
  return route.fulfill({ status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(r.body) });
}

const G = [await boot(), await boot()];   // G[0] hosts (a new kid), G[1] (Reddy, with a summer of his own) joins
const [H, R] = G.map(g => g.page);
for (const p of [H, R]) await p.route(MM + '/**', serve);

// 1) the title, and nothing fetched at startup
const t0 = await H.evaluate(() => {
  const vis = id => { const e = document.getElementById(id); return !!(e && e.getClientRects().length); };
  const net = performance.getEntriesByType('resource').map(e => e.name).filter(n => !/^file:|three(\.min)?\.js|fonts\.g/.test(n));
  return { main: ['titleCampaignBtn', 'titleOnlineBtn', 'titleSettingsBtn'].every(vis), start: vis('startBtn'), url: Net.mm.url, fetches: Net.mm.fetches, net };
});
check('the title offers CAMPAIGN, ONLINE and SETTINGS, NEW GAME a page in; no matchmaker set, and nothing fetched at startup',
  t0.main && !t0.start && t0.url === '' && t0.fetches === 0 && !t0.net.length, t0);
const t1 = await H.evaluate(() => {
  const vis = id => { const e = document.getElementById(id); return !!(e && e.getClientRects().length); };
  document.getElementById('titleCampaignBtn').click();
  const r = { start: vis('startBtn'), text: document.getElementById('startBtn').textContent, story: vis('titleStoryBtn'), online: vis('titleOnlineBtn') };
  document.getElementById('titleBackBtn').click();
  r.back = vis('titleOnlineBtn') && !vis('startBtn');
  document.getElementById('titleSettingsBtn').click();
  r.settings = document.getElementById('settingsScreen').classList.contains('active');
  document.getElementById('settingsDoneBtn').click();
  r.mode = Game.mode;
  return r;
});
check('CAMPAIGN turns to NEW GAME (no save here) and STORY, BACK turns back; SETTINGS opens the settings over the title',
  t1.start && /MIKE/.test(t1.text) && t1.story && !t1.online && t1.back && t1.settings && t1.mode === 'title', t1);

// 2) ONLINE with no summer, and no matchmaker: the codes only
await H.evaluate(() => document.getElementById('titleOnlineBtn').click());
await H.waitForFunction(() => Game.mode === 'modal' && document.getElementById('netHostBtn'), null, { timeout: 90000 });
const o0 = await H.evaluate(() => ({ title: document.getElementById('modalTitle').textContent, from: Net.fromTitle, list: document.getElementById('netRoomList').textContent,
  rows: document.querySelectorAll('.pk-room').length, coop: !!document.getElementById('netCoopBtn'), coopNote: (document.getElementById('netCoopNote') || {}).textContent,
  back: document.getElementById('netBackBtn').textContent, fetches: Net.mm.fetches, saving: !!Game._saveEnabled }));
check('ONLINE with no save: the online screen over a new kid who saves nothing; no list, "joined by their code", nothing fetched; co-op waits for a summer',
  o0.title === 'Online' && o0.from === 'new' && /joined by their code/.test(o0.list) && !o0.rows && o0.fetches === 0 && !o0.saving
  && !o0.coop && /CAMPAIGN/.test(o0.coopNote) && /TITLE/.test(o0.back) && hits === 0, o0);
await H.evaluate(() => document.getElementById('netBackBtn').click());
const o1 = await H.evaluate(() => ({ mode: Game.mode, title: document.getElementById('titleScreen').classList.contains('active'), from: Net.fromTitle }));
check('its way back is the title', o1.mode === 'title' && o1.title && !o1.from, o1);

// Reddy has a summer: ONLINE loads it as CONTINUE does
await R.evaluate(() => { Game.persist.cash = 77; Game.persist.look = Object.assign({}, Game.persist.look); saveGame();
  Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); Game._saveEnabled = false; });

// 3) the matchmaker set, in both games, and the stub link
for (const p of [H, R]) await p.evaluate(mm => {
  Net.mm.url = mm;
  Net.makeTransport = (role, code, h) => {
    window.__h = h; window.__out = []; window.__tx = { role, code };
    Promise.resolve().then(() => h.ready(code));
    return { send: (m, to) => window.__out.push({ m: JSON.stringify(m), to: to || null }), drop: () => {}, voice: () => {}, close: () => { window.__closed = (window.__closed || 0) + 1; } };
  };
}, MM);
const pump = async () => {
  for (let i = 0; i < 4; i++) {
    const ho = await H.evaluate(() => (window.__out || []).splice(0));
    await R.evaluate(ms => ms.forEach(m => window.__h && window.__h.data(JSON.parse(m), 'host')), ho.filter(o => !o.to || o.to === 'g1').map(o => o.m));
    const ro = await R.evaluate(() => (window.__out || []).splice(0));
    await H.evaluate(ms => ms.forEach(m => window.__h && window.__h.data(JSON.parse(m), 'g1')), ro.map(o => o.m));
  }
};
const until = async (f, ms = 3000) => { for (let t = 0; t < ms && !f(); t += 50) await new Promise(r => setTimeout(r, 50)); return f(); };
const listOf = p => p.evaluate(() => netMmRefresh().then(ok => ({ ok, codes: [...document.querySelectorAll('.pk-room')].map(e => e.dataset.code),
  text: (document.getElementById('netRoomList') || {}).textContent || '' })));

await H.evaluate(() => { document.getElementById('titleOnlineBtn').click(); });
await H.waitForFunction(() => Game.mode === 'modal' && document.getElementById('netHostBtn'), null, { timeout: 90000 });
await R.evaluate(() => { document.getElementById('titleOnlineBtn').click(); });
await R.waitForFunction(() => Game.mode === 'modal' && document.getElementById('netHostBtn'), null, { timeout: 90000 });
const s1 = await R.evaluate(() => ({ cash: Game.persist.cash, from: Net.fromTitle, saving: !!Game._saveEnabled, coop: !!document.getElementById('netCoopBtn'),
  back: document.getElementById('netBackBtn').textContent }));
check('ONLINE with a save loads it, as CONTINUE would; its way back is your room, and co-op is a button',
  s1.cash === 77 && s1.from === 'save' && s1.saving && s1.coop && /ROOM/.test(s1.back), s1);
const e0 = await listOf(R);
check('with a matchmaker set, the screen asks it for rooms (none yet)', e0.ok && !e0.codes.length && /No open rooms/.test(e0.text), e0);

// The host opens a room: private until he says Listed
await H.evaluate(() => { document.getElementById('netName').value = 'Hosty'; document.getElementById('netName').dispatchEvent(new Event('input'));
  document.getElementById('netHostBtn').click(); });
await H.waitForFunction(() => document.getElementById('netCode') && document.getElementById('netListedRow'));
const code = await H.evaluate(() => Net.code);
const p0 = await H.evaluate(() => ({ priv: document.querySelector('[data-grp="listed"][data-val="0"]').classList.contains('on'), listed: Net.mm.listed }));
await H.evaluate(() => netMmTick());
const e1 = await listOf(R);
check('a new room is Private: it never shows on the list', p0.priv && !p0.listed && !e1.codes.length && rooms.list(now).length === 0, { p0, e1 });

await H.evaluate(() => document.querySelector('[data-grp="listed"][data-val="1"]').click());
await H.waitForFunction(code => Net.mm.listedCode === code, code);
const e2 = await listOf(R);
const row = await R.evaluate(() => (document.querySelector('.pk-room') || {}).textContent || '');
check('Listed: the room shows in the other game’s list, with the host, the match and who is in',
  e2.codes.length === 1 && e2.codes[0] === code && /Hosty/.test(row) && /on Winnmark/.test(row) && /1\//.test(row), { e2, row });

// JOIN from the list: the same room a code reaches
await R.evaluate(() => { document.getElementById('netName').value = 'Reddy'; document.getElementById('netName').dispatchEvent(new Event('input'));
  document.querySelector('.pk-room-join').click(); });
await R.waitForFunction(() => (window.__out || []).length > 0);
await pump();
const j1 = await H.evaluate(() => ({ people: Net.people.map(p => p.name + ':' + p.side).join(',') }));
const j2 = await R.evaluate(() => ({ tx: window.__tx, code: Net.code, role: Net.role, me: Net.me, people: Net.people.map(p => p.name + ':' + p.side).join(',') }));
check('JOIN on the list opens the link to that code, as JOIN by code does, and lands in the host’s room',
  j2.tx.role === 'guest' && j2.tx.code === code && j2.code === code && j2.me === 'net_p1' && j1.people === 'Hosty:A,Reddy:B' && j2.people === j1.people, { j1, j2 });
await H.evaluate(() => netMmBeat());
const b1 = rooms.list(now).find(r => r.code === code);
check('the host’s next word counts Reddy in', b1 && b1.people === 2, b1);

// A match starting takes it off the list; back in the room it comes back
await H.evaluate(() => { Net.phase = 'begin'; netMmTick(); });
await until(() => rooms.list(now).length === 0);
const m1 = rooms.list(now).length;
await H.evaluate(() => { Net.phase = 'lobby'; Net.mm.beatAt = 0; netMmTick(); });
await H.waitForFunction(code => Net.mm.listedCode === code, code);
check('a match started takes the room off the list, and it is back when the room is', m1 === 0 && rooms.list(now).length === 1, { m1 });

// Reddy leaves; the host leaves: off the list at once
await R.evaluate(() => document.getElementById('netBackBtn').click());
await H.evaluate(() => document.getElementById('netBackBtn').click());
await until(() => rooms.list(now).length === 0);
check('the host leaving takes his room off the list at once', rooms.list(now).length === 0);

// A host who vanished (his tab died, no word and no goodbye): gone 45 s after his last word
await H.evaluate(() => document.getElementById('titleOnlineBtn').click());   // he left to the title (no summer)
await H.waitForFunction(() => Game.mode === 'modal' && document.getElementById('netHostBtn'), null, { timeout: 90000 });
await H.evaluate(() => document.getElementById('netHostBtn').click());
await H.waitForFunction(() => document.getElementById('netListedRow'));
await H.evaluate(() => document.querySelector('[data-grp="listed"][data-val="1"]').click());
await H.waitForFunction(() => !!Net.mm.listedCode);
await H.evaluate(() => { clearInterval(Net.mm.timer); Net.mm.timer = null; Net.mm.listedCode = null; Net.mm.listed = false; });
await R.evaluate(() => { openPickupBoard(); openNetPanel(); });   // Reddy left to his room: the board's PLAY ONLINE
const v1 = await listOf(R);
now += STALE_MS - 5000;
const v2 = await listOf(R);
now += 10000;
const v3 = await listOf(R);
check('a vanished host’s room stays while it is fresh and is gone 45 s after his last word', v1.codes.length === 1 && v2.codes.length === 1 && !v3.codes.length, { v1, v2, v3 });

// The matchmaker down: the screen says so, and the codes are still there
down = true;
const d1 = await listOf(R);
const d2 = await R.evaluate(() => ({ join: !!document.getElementById('netJoinBtn') && !document.getElementById('netJoinBtn').disabled }));
check('a matchmaker that is down: "join by the code instead", and JOIN by code is still there', !d1.ok && /Couldn’t reach/.test(d1.text) && d2.join, { d1, d2 });
down = false;

for (const g of G) check('no page errors', !g.errs.length, g.errs);
for (const g of G) await g.close();
