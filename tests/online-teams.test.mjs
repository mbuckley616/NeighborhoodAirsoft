// v1.364 (backlog D.2 step 2, card fable/d2-online-teams; Michael: A on "go on to teams", 21 Oct, with D.67 and D.68):
// three headless games in one room through a stub transport (no network in CI; tests/online.test.mjs keeps the 1v1 and
// the PeerJS adapter). The host sets a 3v3 on Winnmark; the first friend lands on Red and the second moves himself to
// Blue; Red's friend picks one of his side's kids; START. Checked: every game builds the same six, each from its own
// side; everyone sees everyone where they are, kids included; a tag in any game reaches the host and every game agrees
// on the lives; a dropped friend's spot is taken by his kid on the host's AI and the match ends normally; REMATCH
// takes the room back to the board with whoever is still in it.
import { boot, check } from './lib/game.mjs';

const G = [await boot(), await boot(), await boot()];   // G[0] hosts, G[1] and G[2] join
for (const g of G) await g.bedroom();
const [H, R, B] = G.map(g => g.page);   // the host (Blue), Red's friend, Blue's friend
const pid = i => 'g' + i;

for (const p of G.map(g => g.page)) await p.evaluate(() => {
  Net.makeTransport = (role, code, h) => {
    window.__h = h; window.__out = [];
    Promise.resolve().then(() => h.ready(code));
    return { send: (m, to) => window.__out.push({ m: JSON.stringify(m), to: to || null }), drop: id => { (window.__dropped = window.__dropped || []).push(id); },
      close: () => { window.__closedTx = (window.__closedTx || 0) + 1; } };
  };
});
// One evaluate a game: what reached it, two steps, what it sends. The host's go to the guest they name, or to all.
const stepIn = (p, inbox, frames = 2) => p.evaluate(([inbox, frames]) => {
  inbox.forEach(([m, from]) => window.__h && window.__h.data(JSON.parse(m), from));
  for (let i = 0; i < frames && Game.mode !== 'title'; i++) if (Game.mode === 'scenario') stepGame(1 / 60);
  return (window.__out || []).splice(0);
}, [inbox, frames]);
let toHost = [], toGuest = { 1: [], 2: [] };
const live = { 1: true, 2: true };
async function tick(frames = 2) {
  const out = await stepIn(H, toHost.splice(0), frames);
  for (const o of out) for (const i of [1, 2]) if (live[i] && (!o.to || o.to === pid(i))) toGuest[i].push([o.m, 'host']);
  for (const i of [1, 2]) {
    if (!live[i]) continue;
    const gout = await stepIn(G[i].page, toGuest[i].splice(0), frames);
    for (const o of gout) toHost.push([o.m, pid(i)]);
  }
}
const run = async n => { for (let i = 0; i < n; i += 2) await tick(); await tick(0); };

// The room
await H.evaluate(() => { openPickupBoard(); Object.assign(pickupState, { map: 'winnmark', size: 3, lives: 3, clock: 0, tod: 'day' }); renderPickupBoard();
  document.getElementById('pickupOnlineBtn').click(); document.getElementById('netName').value = 'Hosty';
  document.getElementById('netName').dispatchEvent(new Event('input')); document.getElementById('netHostBtn').click(); });
await H.waitForFunction(() => document.getElementById('netCode'));
const code = await H.evaluate(() => document.getElementById('netCode').textContent);
for (const [i, name] of [[1, 'Reddy'], [2, 'Bluey']]) {
  await G[i].page.evaluate(([code, name]) => { openPickupBoard(); document.getElementById('pickupOnlineBtn').click();
    document.getElementById('netName').value = name; document.getElementById('netName').dispatchEvent(new Event('input'));
    document.getElementById('netJoinCode').value = code; document.getElementById('netJoinBtn').click(); }, [code, name]);
  await G[i].page.waitForFunction(() => (window.__out || []).length > 0);
  await tick(0); await tick(0);
}
const room = p => p.evaluate(() => ({ me: Net.me, people: Net.people.map(x => x.name + ':' + x.side).join(','), kids: JSON.stringify(Net.kids),
  a: (document.getElementById('netSideA') || {}).textContent, b: (document.getElementById('netSideB') || {}).textContent,
  start: (document.getElementById('netStartBtn') || {}).textContent, move: !!document.querySelector('[data-grp="side"]'), picks: document.querySelectorAll('#netKids .pk-kid').length }));
const r1 = await room(H), r2 = await room(B);
console.log('   room', JSON.stringify(r1), JSON.stringify(r2));
check('the host’s room: both friends in, on Red as they come; each side’s other slots are kids; START is open',
  r1.people === 'Hosty:A,Reddy:B,Bluey:B' && r2.people === r1.people && r2.me === 'net_p2' && /START/.test(r1.start) && r2.move && /Reddy/.test(r2.b), { r1, r2 });
// Bluey moves himself to Blue, and Reddy picks one of Red's kids
await B.evaluate(() => document.querySelector('[data-grp="side"][data-val="A"]').click());
await tick(0); await tick(0);
const pick = await R.evaluate(() => { const b = [...document.querySelectorAll('#netKids .pk-kid')].find(x => !x.classList.contains('on') && !x.disabled); const id = b.dataset.val;
  const on = document.querySelector('#netKids .pk-kid.on'); on.click(); return { off: on.dataset.val, id }; });
await tick(0); await tick(0);
await R.evaluate(id => document.querySelector(`#netKids .pk-kid[data-val="${id}"]`).click(), pick.id);
await tick(0); await tick(0);
const r3 = await room(H), r4 = await room(R), r5 = await room(B);
console.log('   room', JSON.stringify(r3), JSON.stringify(r4), JSON.stringify(r5));
const kidsNow = JSON.parse(r3.kids);
check('a friend moves himself to Blue, and Red’s friend picks his side’s kids: every game shows the same room',
  r3.people === 'Hosty:A,Reddy:B,Bluey:A' && r4.people === r3.people && r5.people === r3.people && kidsNow.A.length === 1 && kidsNow.B.length === 2
  && kidsNow.B.includes(pick.id) && !kidsNow.B.includes(pick.off) && r4.kids === r3.kids && r5.kids === r3.kids && r4.picks > 0, { r3, r4, r5, pick });

// START, the briefings, BEGIN everywhere
await H.evaluate(() => document.getElementById('netStartBtn').click());
await tick(0);
const intro = [];
for (const g of G) intro.push(await g.mode());
for (const p of [H, R, B]) await p.evaluate(() => document.getElementById('introBeginBtn').click());
await tick(0); await tick(0); await tick(0);
for (const p of [H, R, B]) await p.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000, polling: 250 });
for (const p of [H, R, B]) await p.evaluate(() => { Game.mouse.locked = true; });
check('START: everyone gets the briefing', intro.every(m => m === 'scenario_intro'), intro);
const setup = p => p.evaluate(() => ({ me: Net.me, name: SCENARIOS.pickup_game.scenarioName, hits: Game.player.maxHits,
  others: Game.scenario.enemies.map(e => `${e.charId}:${e.team === 'player' ? 'ally' : 'foe'}:${e.remote ? 'r' : 'ai'}`).sort().join(',') }));
const sH = await setup(H), sR = await setup(R), sB = await setup(B);
console.log('   host', JSON.stringify(sH), '\n   red ', JSON.stringify(sR), '\n   blue', JSON.stringify(sB));
const blueKid = kidsNow.A[0], redKids = kidsNow.B;
check('every game builds the same 3v3 from its own side: the host runs the kids, the guests move all five from the host’s word',
  sH.name === 'Online: 3v3' && sH.hits === 3 && sR.hits === 3
  && sH.others === [`${blueKid}:ally:ai`, 'net_p1:foe:r', 'net_p2:ally:r', ...redKids.map(k => `${k}:foe:ai`)].sort().join(',')
  && sR.others === [`${blueKid}:foe:r`, 'net_p0:foe:r', 'net_p2:foe:r', ...redKids.map(k => `${k}:ally:r`)].sort().join(',')
  && sB.others === [`${blueKid}:ally:r`, 'net_p0:ally:r', 'net_p1:foe:r', ...redKids.map(k => `${k}:foe:r`)].sort().join(','), { sH, sR, sB });

// Everyone walks; every game sees everyone where the game that moves him has him
await run(30);
await H.evaluate(() => { Game.keys['KeyW'] = true; }); await R.evaluate(() => { Game.keys['KeyA'] = true; }); await B.evaluate(() => { Game.keys['KeyD'] = true; });
await run(60);
for (const p of [H, R, B]) await p.evaluate(() => { Game.keys['KeyW'] = Game.keys['KeyA'] = Game.keys['KeyD'] = false; });
await run(20);
await tick(0);
const where = p => p.evaluate(() => { const o = { [Net.me]: Game.player.pos.toArray() }; for (const [id, e] of Net.ents) o[id] = e.pos.toArray(); return o; });
const wH = await where(H), wR = await where(R), wB = await where(B);
const d = (u, v) => Math.hypot(u[0] - v[0], u[2] - v[2]);
const err = { redSeesHost: d(wR.net_p0, wH.net_p0), blueSeesHost: d(wB.net_p0, wH.net_p0), hostSeesRed: d(wH.net_p1, wR.net_p1), hostSeesBlue: d(wH.net_p2, wB.net_p2),
  redSeesBlue: d(wR.net_p2, wB.net_p2), blueSeesRed: d(wB.net_p1, wR.net_p1),
  kids: Math.max(...[blueKid, ...redKids].map(k => Math.max(d(wR[k], wH[k]), d(wB[k], wH[k])))) };
for (const k in err) err[k] = +err[k].toFixed(3);
console.log('   where', JSON.stringify(err));
check('everyone sees everyone where he is: people within 10 cm (a friend’s friend comes through the host), kids within 40 cm',
  Object.entries(err).every(([k, v]) => k === 'kids' ? v < 0.4 : v < 0.1), err);

// The kids' shots fly in the guests' games, heard from where the kid is
await R.evaluate(() => { window.__kidShots = 0; const f = window.netSpawnShot; window.netSpawnShot = (m, k) => { if (!/^net_p/.test(m.id || '')) window.__kidShots++; return f(m, k); }; });
let ks = 0;
for (let i = 0; i < 40 && !ks; i++) { await run(30); ks = await R.evaluate(() => window.__kidShots); }
check('a kid’s shots in the host’s game fly in a guest’s too', ks > 0, ks);
// from here the kids hold fire and stay still, so the tags below are the people's
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (!e.remote) { e.noFire = true; e.state = 'hiding'; e.character = Object.assign({}, e.character, { aggression: 0 }); } });
for (const p of [H, R, B]) await p.evaluate(() => { Game.player.hitsTaken = 0; Game.player._goingHome = false; Game.player._graceT = 0; });
await H.evaluate(() => { for (const e of Net.ents.values()) if (e.remote) { e.lives = 3; e.health = e.maxHealth || 1; e._graceT = 0; } });
await run(10);

// Red's friend shoots Blue's friend at 3.5 m: the tag is the host's, and every game agrees on it
async function face(p, targetId, dist) {
  await p.evaluate(([id, dist]) => { const k = Net.ents.get(id), P = Game.player;
    P.pos.set(k.pos.x + dist, scenarioGroundY(k.pos.x + dist, k.pos.z), k.pos.z); P.vel.set(0, 0, 0); }, [targetId, dist]);
  await run(10);
}
const shoot = (p, id) => p.evaluate(id => { const k = Net.ents.get(id), P = Game.player;
  P.pitch = Math.atan2(k.pos.y + 0.85 - (P.pos.y + P.eyeOffset), Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z));
  P.yaw = Math.atan2(-(k.pos.x - P.pos.x), -(k.pos.z - P.pos.z)); stepGame(1 / 60); Game.gun.ammo = Math.max(Game.gun.ammo, 5); return fireBB(); }, id);
const lives = async () => ({
  host: await H.evaluate(() => ({ me: Game.player.maxHits - Game.player.hitsTaken, red: Net.ents.get('net_p1').lives, blue: Net.ents.get('net_p2').lives, left: pickupLivesLeft() })),
  red: await R.evaluate(() => ({ me: Game.player.maxHits - Game.player.hitsTaken, host: Net.ents.get('net_p0').lives, blue: Net.ents.get('net_p2').lives, left: pickupLivesLeft() })),
  blue: await B.evaluate(() => ({ me: Game.player.maxHits - Game.player.hitsTaken, host: Net.ents.get('net_p0').lives, red: Net.ents.get('net_p1').lives, left: pickupLivesLeft() })),
});
await face(R, 'net_p2', 3.5);
let L, tries = 0;
do { await shoot(R, 'net_p2'); await run(30); L = await lives(); tries++; } while (L.blue.me === 3 && tries < 8);
console.log('   after Red shoots Blue’s friend', tries, 'times:', JSON.stringify(L));
const marker = await R.evaluate(() => Game.scenario.stats.tags.length);
check('a friend’s tag on a friend goes through the host: two lives left for Bluey in all three games, and Reddy sees his tag',
  L.blue.me === 2 && L.host.blue === 2 && L.red.blue === 2 && marker >= 1 && L.host.left.ours === L.red.left.theirs && L.host.left.theirs === L.red.left.ours
  && L.blue.left.ours === L.host.left.ours && L.blue.left.theirs === L.host.left.theirs, { L, marker });
const walking = await B.evaluate(() => Game.player._goingHome);
check('and he walks home, as in the 1v1', walking, walking);

// The host shoots Red's friend
await run(150);
await face(H, 'net_p1', 3.5);
tries = 0;
do { await shoot(H, 'net_p1'); await run(30); L = await lives(); tries++; } while (L.red.me === 3 && tries < 8);
console.log('   after the host shoots Red’s friend', tries, 'times:', JSON.stringify(L));
check('the host’s tag on Red’s friend: two left in every game, and the lives left agree side for side',
  L.red.me === 2 && L.host.red === 2 && L.blue.red === 2 && L.host.left.ours === L.red.left.theirs && L.host.left.theirs === L.red.left.ours
  && L.blue.left.ours === L.host.left.ours, L);

// Red's friend drops: his kid plays on in the host's game, Blue's friend is told, and the match ends normally
live[1] = false;
await H.evaluate(() => window.__h.closed('g1'));
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (!e.remote) { e.noFire = false; } });
await run(120);
const dropH = await H.evaluate(() => { const k = Net.ents.get('net_p1'); return { mode: Game.mode, remote: k.remote, bot: k.netBot, state: k.state, lives: k.lives }; });
const dropB = await B.evaluate(() => ({ mode: Game.mode, hud: document.getElementById('netHud').textContent, red: Net.ents.get('net_p1').remote }));
console.log('   drop', JSON.stringify(dropH), JSON.stringify(dropB));
check('a dropped friend’s spot is taken by a kid: on the host’s AI with his lives left, and Bluey is told',
  dropH.mode === 'scenario' && !dropH.remote && dropH.bot && dropH.state !== 'online' && dropH.lives === 2
  && dropB.mode === 'scenario' && /REDDY LEFT · A KID PLAYS THE SPOT/.test(dropB.hud) && dropB.red, { dropH, dropB });
// Red runs out: each of its kids, the bot included, takes his last tag in the host's game
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (e.team !== 'player' && !e.remote) { e.lives = 1; e._graceT = 0; e.health = Math.max(1, e.health); e.state = 'hiding'; eliminateEnemy(e); } });
await run(60);
for (const p of [H, B]) await p.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 250 }).catch(() => {});
await tick(0);
const res = p => p.evaluate(() => ({ mode: Game.mode, out: document.getElementById('outcomeText').className, again: document.getElementById('navAgainBtn').textContent,
  dis: document.getElementById('navAgainBtn').disabled, flavor: document.getElementById('flavorText').textContent }));
const eH = await res(H), eB = await res(B);
console.log('   end', JSON.stringify(eH), JSON.stringify(eB));
check('the match ends normally: Blue won in the host’s game and in Bluey’s; REMATCH is the host’s to press',
  eH.mode === 'result' && eB.mode === 'result' && /win/.test(eH.out) && /win/.test(eB.out) && eH.again === 'REMATCH' && !eH.dis && eB.dis, { eH, eB });

// REMATCH: back to the room, Reddy gone, Bluey still on Blue
await H.evaluate(() => document.getElementById('navAgainBtn').click());
await tick(0); await tick(0); await tick(0);
const rH = await room(H), rB = await room(B), mH = await G[0].mode(), mB = await G[2].mode();
console.log('   rematch', mH, mB, JSON.stringify(rH), JSON.stringify(rB));
check('REMATCH takes the room back to the board: the host and Bluey there, Reddy gone, the code the same',
  mH === 'modal' && mB === 'modal' && rH.people === 'Hosty:A,Bluey:A' && rB.people === rH.people
  && await H.evaluate(c => Net.code === c && Net.phase === 'lobby', code) && await B.evaluate(() => Net.phase === 'lobby'), { rH, rB });

const errs = G.flatMap(g => g.errs);
check('no page errors in any game', errs.length === 0, errs);
for (const g of G) await g.close();
