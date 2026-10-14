// v1.230 (backlog D.2 step 1; decisions "Online play: how do two friends find each other", Michael: A): two headless
// games joined through a stub transport (no network in CI), as PLAY ONLINE on the Pickup Game board joins them through
// PeerJS. The host opens a room and gets a code, the guest joins with it, both press BEGIN, and a 1v1 on Winnmark runs
// with the host's game as the referee. Checked: each sees the other where he is; the guest's tag reaches the host and
// the host's reaches the guest, and the lives agree on both screens; the last tag ends it for both, with nothing paid
// and the bags as they were; a dropped friend ends the match cleanly for the other; nothing loads at startup; and the
// PeerJS adapter maps its events and errors.
import { boot, check } from './lib/game.mjs';

const A = await boot(), B = await boot();   // A hosts, B joins
await A.bedroom(); await B.bedroom();
const a = A.page, b = B.page;

// Nothing loads at startup: no PeerJS script, no Peer
const idle = await a.evaluate(() => ({ peer: typeof window.Peer, scripts: [...document.scripts].filter(s => /peerjs/.test(s.src)).length, net: Net.active }));
check('nothing online loads at startup', idle.peer === 'undefined' && idle.scripts === 0 && !idle.net, idle);

const stub = p => p.evaluate(() => {
  Net.makeTransport = (role, code, h) => {
    window.__h = h; window.__out = [];
    Promise.resolve().then(() => h.ready(code));
    return { send: m => window.__out.push(JSON.stringify(m)), close: () => { window.__closedTx = (window.__closedTx || 0) + 1; } };
  };
});
await stub(a); await stub(b);
// One way: what `from` sent, delivered to `to`
const pump = async (from, to) => {
  const ms = await from.evaluate(() => (window.__out || []).splice(0));
  if (ms.length) await to.evaluate(ms => ms.forEach(m => window.__h && window.__h.data(JSON.parse(m))), ms);
  return ms.length;
};
const pumpBoth = async () => (await pump(a, b)) + (await pump(b, a));
// Both games step together, the messages crossing every two frames (about 33 ms of lag)
const run = async (frames) => { for (let i = 0; i < frames; i += 2) { await A.spin(2); await B.spin(2); await pumpBoth(); } };

const before = async p => p.evaluate(() => ({ cash: Game.persist.cash, bag: Game.persist.bag, done: Object.keys(Game.persist.completed).length }));
const a0 = await before(a), b0 = await before(b);

// The host: the board, PLAY ONLINE, HOST A ROOM
async function host() {
  await a.evaluate(() => { openPickupBoard(); pickupState.lives = 3; pickupState.clock = 0; pickupState.tod = 'day'; renderPickupBoard();
    document.getElementById('pickupOnlineBtn').click(); document.getElementById('netName').value = 'Hosty';
    document.getElementById('netName').dispatchEvent(new Event('input')); document.getElementById('netHostBtn').click(); });
  await a.waitForFunction(() => document.getElementById('netCode'));
  return a.evaluate(() => ({ code: document.getElementById('netCode').textContent, status: document.getElementById('netStatus').textContent, phase: Net.phase }));
}
async function join(code) {
  await b.evaluate(code => { openPickupBoard(); document.getElementById('pickupOnlineBtn').click();
    document.getElementById('netName').value = 'Guesty'; document.getElementById('netName').dispatchEvent(new Event('input'));
    document.getElementById('netJoinCode').value = code; document.getElementById('netJoinBtn').click(); }, code);
  await b.waitForFunction(() => (window.__out || []).length > 0);
}
async function begin() {
  await pump(b, a);   // hello
  await pump(a, b);   // match
  const intro = [await A.mode(), await B.mode()];
  await a.evaluate(() => document.getElementById('introBeginBtn').click());
  const waiting = await a.evaluate(() => document.getElementById('introBeginBtn').textContent);
  await b.evaluate(() => document.getElementById('introBeginBtn').click());
  await pump(b, a);   // ready: the host says go
  await pump(a, b);
  await a.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 20000 });
  await b.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 20000 });
  for (const p of [a, b]) await p.evaluate(() => { Game.mouse.locked = true; });
  return { intro, waiting };
}

const h = await host();
check('HOST A ROOM shows a four-letter code and waits', /^[A-HJ-NP-Z]{4}$/.test(h.code) && h.phase === 'lobby' && /Waiting/.test(h.status), h);
await join(h.code);
const st = await begin();
check('both get the briefing, and BEGIN waits for the friend', st.intro[0] === 'scenario_intro' && st.intro[1] === 'scenario_intro'
  && /WAITING FOR GUESTY/.test(st.waiting), st);

const setup = async p => p.evaluate(() => ({ name: SCENARIOS.pickup_game.scenarioName, kids: Game.scenario.enemies.length,
  kid: Net.kid && { name: Net.kid.name, remote: Net.kid.remote, lives: Net.kid.lives, weapon: Net.kid.weapon },
  hits: Game.player.maxHits, ammo: Game.gun.ammo, pos: Game.player.pos.toArray().map(n => +n.toFixed(2)) }));
const sa = await setup(a), sb = await setup(b);
console.log('   host', JSON.stringify(sa), '\n   guest', JSON.stringify(sb));
check('a 1v1: the one kid on each side is the other player, by his name, with 3 lives each',
  sa.kids === 1 && sb.kids === 1 && sa.kid.name === 'Guesty' && sb.kid.name === 'Hosty' && sa.kid.remote && sb.kid.remote
  && sa.kid.lives === 3 && sb.kid.lives === 3 && sa.hits === 3 && sb.hits === 3 && sa.ammo > 0 && sb.ammo > 0, { sa, sb });

// Each moves; each sees the other where he is
await run(30);
await a.evaluate(() => { Game.keys['KeyW'] = true; });
await b.evaluate(() => { Game.keys['KeyD'] = true; });
await run(60);
await a.evaluate(() => { Game.keys['KeyW'] = false; });
await b.evaluate(() => { Game.keys['KeyD'] = false; });
await run(30);
const where = async () => {
  const pa = await a.evaluate(() => ({ me: Game.player.pos.toArray(), him: Net.kid.pos.toArray(), vis: Net.kid.mesh.group.visible }));
  const pb = await b.evaluate(() => ({ me: Game.player.pos.toArray(), him: Net.kid.pos.toArray(), vis: Net.kid.mesh.group.visible }));
  const d = (u, v) => +Math.hypot(u[0] - v[0], u[2] - v[2]).toFixed(3);
  return { hostSeesGuest: d(pa.him, pb.me), guestSeesHost: d(pb.him, pa.me), hostMoved: d(pa.me, sa.pos), guestMoved: d(pb.me, sb.pos), vis: pa.vis && pb.vis };
};
const w = await where();
check('each sees the other where he is (within 5 cm), after both walk', w.vis && w.hostMoved > 1 && w.guestMoved > 1 && w.hostSeesGuest < 0.05 && w.guestSeesHost < 0.05, w);

// Put `p`'s player d m from the other one (as `p` sees him) and aim at his chest, then let the positions cross
async function face(p, other, dist) {
  await p.evaluate(dist => {
    const k = Net.kid, P = Game.player;
    P.pos.set(k.pos.x + dist, P.pos.y, k.pos.z); P.vel.set(0, 0, 0);
    P.pos.y = scenarioGroundY(P.pos.x, P.pos.z);
  }, dist);
  await run(10);
  await p.evaluate(() => {
    const k = Net.kid, P = Game.player;
    const eye = P.pos.y + P.eyeOffset, dx = k.pos.x - P.pos.x, dz = k.pos.z - P.pos.z;
    P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(k.pos.y + 0.85 - eye, Math.hypot(dx, dz));
  });
  await run(4);
}
const shoot = async p => p.evaluate(() => { Game.player.pitch = Math.atan2(Net.kid.pos.y + 0.85 - (Game.player.pos.y + Game.player.eyeOffset),
  Math.hypot(Net.kid.pos.x - Game.player.pos.x, Net.kid.pos.z - Game.player.pos.z)); Game.player.yaw = Math.atan2(-(Net.kid.pos.x - Game.player.pos.x), -(Net.kid.pos.z - Game.player.pos.z));
  stepGame(1 / 60); Game.gun.ammo = Math.max(Game.gun.ammo, 5); return fireBB(); });
const score = async () => ({
  host: await a.evaluate(() => ({ myHits: Game.player.hitsTaken, hisLives: Net.kid.lives, left: pickupLivesLeft(), mode: Game.mode })),
  guest: await b.evaluate(() => ({ myHits: Game.player.hitsTaken, hisLives: Net.kid.lives, left: pickupLivesLeft(), mode: Game.mode })),
});

// The guest tags the host
let s1, tries = 0;
await face(b, a, 3.5);
do { await shoot(b); await run(30); s1 = await score(); tries++; } while (s1.host.myHits === 0 && tries < 6);
console.log('   after the guest shoots', tries, 'times:', JSON.stringify(s1));
check("the guest's tag reaches the host: one of the host's lives gone on both screens",
  s1.host.myHits === 1 && s1.guest.hisLives === 2 && s1.host.left.ours === 2 && s1.guest.left.theirs === 2 && s1.host.mode === 'scenario', s1);
const hostBack = await a.evaluate(() => ({ d: +Math.hypot(Game.player.pos.x - Game.scenario.playerStart.pos.x, Game.player.pos.z - Game.scenario.playerStart.pos.z).toFixed(2), resp: Game.scenario.playerRespawns, grace: Game.player._graceT }));
check('the host goes back to his start, as in a pickup game', hostBack.d < 0.5 && hostBack.resp === 1, hostBack);

// The host tags the guest
await run(130);   // past his 2 s of cover
let s2; tries = 0;
await face(a, b, 3.5);
do { await shoot(a); await run(30); s2 = await score(); tries++; } while (s2.guest.myHits === 0 && tries < 6);
console.log('   after the host shoots', tries, 'times:', JSON.stringify(s2));
check("the host's tag reaches the guest: the lives agree on both screens (2 and 2)",
  s2.guest.myHits === 1 && s2.host.hisLives === 2 && s2.host.left.ours === 2 && s2.host.left.theirs === 2
  && s2.guest.left.ours === 2 && s2.guest.left.theirs === 2, s2);
const guestBack = await b.evaluate(() => ({ back: Math.hypot(Game.player.pos.x - Game.scenario.playerStart.pos.x, Game.player.pos.z - Game.scenario.playerStart.pos.z) < 0.5, grace: Game.player._graceT > 0 }));
await run(10);
const hostSees = await where();
check('the guest goes back to his start, and the host sees him there', guestBack.back && hostSees.hostSeesGuest < 0.1, { guestBack, hostSees });

// The guest takes the host's last two lives: the match ends on both, the host lost and the guest won
for (let n = 0; n < 2; n++) {
  await run(130);
  let s; tries = 0;
  await face(b, a, 3.5);
  do { await shoot(b); await run(30); s = await score(); tries++; } while (s.host.myHits === 1 + n && s.host.mode === 'scenario' && tries < 6);
}
await run(60);
await a.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
await run(4);
await b.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const res = async p => p.evaluate(() => ({ mode: Game.mode, out: document.getElementById('outcomeText').className, flavor: document.getElementById('flavorText').textContent,
  again: document.getElementById('navAgainBtn').disabled, cash: Game.persist.cash, bag: Game.persist.bag, done: Object.keys(Game.persist.completed).length }));
const ra = await res(a), rb = await res(b);
console.log('   host', JSON.stringify(ra), '\n   guest', JSON.stringify(rb));
check('the last tag ends it for both: the host lost, the guest won', ra.mode === 'result' && rb.mode === 'result'
  && /lose|out/.test(ra.out) && /win/.test(rb.out) && /Guesty got you/.test(ra.flavor) && /You beat Hosty/.test(rb.flavor), { ra, rb });
check('nothing on the line: cash, bag and wins as they were, no Play Again', ra.cash === a0.cash && rb.cash === b0.cash
  && ra.bag === a0.bag && rb.bag === b0.bag && ra.done === a0.done && rb.done === b0.done && ra.again && rb.again, { a0, b0, ra, rb });

// Back home; a second match, and the guest drops out of it
for (const p of [a, b]) await p.evaluate(() => document.getElementById('returnBtn').click());
const home = [await A.mode(), await B.mode(), await a.evaluate(() => Net.active), await a.evaluate(() => !!CHARACTERS.net_friend)];
check('BACK TO YOUR ROOM closes the link', home[0] === 'bedroom' && home[1] === 'bedroom' && !home[2] && !home[3], home);
const h2 = await host();
await join(h2.code);
await begin();
await run(60);
await a.evaluate(() => window.__h.closed());   // the guest's browser went away
await run(4);
const drop = await a.evaluate(() => ({ mode: Game.mode, title: document.getElementById('modalTitle').textContent,
  shown: document.getElementById('modalScreen').classList.contains('active'), net: Net.active, bag: Game.persist.bag, enemies: Game.scenario.enemies.length }));
check('a dropped friend ends the match cleanly: "Your friend left", back in the bedroom, bag as it was',
  drop.mode === 'modal' && drop.title === 'Your friend left' && drop.shown && !drop.net && drop.bag === a0.bag && drop.enemies === 0, drop);
await a.evaluate(() => closeModal());
await b.evaluate(() => netLost());
const bdrop = await b.evaluate(() => ({ mode: Game.mode, title: document.getElementById('modalTitle').textContent, net: Net.active }));
check('and the other side too', bdrop.mode === 'modal' && bdrop.title === 'Your friend left' && !bdrop.net, bdrop);
await b.evaluate(() => closeModal());

// The board's own PLAY is a plain pickup game again, kids and all
await a.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 1, tod: 'day', lives: 3, clock: 0 }));
await A.scenario('pickup_game');
await A.spin(240);
const sp = await a.evaluate(() => ({ kids: Game.scenario.enemies.map(e => ({ id: e.charId, remote: !!e.remote, state: e.state })), net: Net.active }));
check('after it, a pickup game on the board is the plain one (a kid, not your friend)', sp.kids.length === 1 && sp.kids[0].id !== 'net_friend'
  && !sp.kids[0].remote && !sp.net, sp);

// The PeerJS adapter, against a stand-in Peer: the room id, the events, the errors
const adapter = await a.evaluate(async () => {
  const made = [];
  class FakeEmitter { constructor() { this.h = {}; } on(k, f) { (this.h[k] = this.h[k] || []).push(f); } fire(k, ...v) { (this.h[k] || []).forEach(f => f(...v)); } }
  class FakeConn extends FakeEmitter { constructor(id, opts) { super(); this.peer = id; this.opts = opts; this.open = false; this.sent = []; } send(m) { this.sent.push(m); } close() { this.fire('close'); } }
  class FakePeer extends FakeEmitter { constructor(id) { super(); this.id = id; made.push(this); } connect(id, opts) { this.conn = new FakeConn(id, opts); return this.conn; } disconnect() { this.gone = true; } destroy() {} }
  window.Peer = FakePeer;
  const log = [];
  const hnd = { ready: c => log.push('ready ' + c), connected: () => log.push('connected'), data: m => log.push('data ' + JSON.stringify(m)), closed: () => log.push('closed'), error: k => log.push('error ' + k) };
  const tx = netPeerTransport('host', 'KXRB', hnd);
  await new Promise(r => setTimeout(r, 0));
  const hp = made[0]; hp.fire('open');
  const c = new FakeConn('x'); hp.fire('connection', c); c.open = true; c.fire('open');
  tx.send({ t: 'h' }); c.fire('data', { t: 's' }); c.fire('close');
  const g = netPeerTransport('guest', 'KXRB', hnd);
  await new Promise(r => setTimeout(r, 0));
  const gp = made[1]; gp.fire('open');
  const gc = gp.conn;
  const g2 = netPeerTransport('guest', 'ZZZZ', hnd);
  await new Promise(r => setTimeout(r, 0));
  made[2].fire('error', { type: 'peer-unavailable' });
  delete window.Peer;
  return { hostId: hp.id, sent: c.sent, gone: !!hp.gone, guestTo: gc.peer, ser: gc.opts.serialization, log };
});
console.log('   adapter', JSON.stringify(adapter));
check('the PeerJS adapter: the room is nbhd-airsoft-<code>, the guest joins it, and its events and errors come through',
  adapter.hostId === 'nbhd-airsoft-KXRB' && adapter.guestTo === 'nbhd-airsoft-KXRB' && adapter.ser === 'json' && adapter.gone
  && adapter.sent.length === 1 && adapter.log.join('|') === 'ready KXRB|connected|data {"t":"s"}|closed|error noroom', adapter);

const errs = A.errs.concat(B.errs);
check('no page errors in either game', errs.length === 0, errs);
await A.close(); await B.close();
