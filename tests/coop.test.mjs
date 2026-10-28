// v1.380 (backlog D.73, card fable/d73-coop; Michael 28 Oct, B: 1B 2A 3A 4A): co-op, a friend over (v1.381: and in
// your matches: a team match with Bluey in a crew place, a solo one with him beside you and a kid more against, his
// tags, the result's pay on his save and the win on yours, the host out while Bluey plays on, F, PLAY AGAIN, a race). Two headless
// games joined by a stub transport (no network in CI; tests/online.test.mjs keeps the PeerJS adapter): the host has
// a friend over from the CO-OP button on his phone, Bluey goes over by the code from his. Checked: each game is told
// who the other is; each sees the other's kid in the room where the other's game has him, walking; at the host's the
// guest can't start a match, shop, use the workbench or sleep (2A), and is told so, but can use his phone; a Pickup
// Game room code is turned away; GO HOME on the guest's phone ends it for both, and so does the host sending him home.
import { boot, check } from './lib/game.mjs';

const G = [await boot(), await boot()];   // G[0] the host, G[1] Bluey
for (const g of G) await g.bedroom();
const [H, R] = G.map(g => g.page);
for (const p of [H, R]) await p.evaluate(() => {
  Net.makeTransport = (role, code, h) => {
    window.__h = h; window.__out = []; window.__closed = false;
    Promise.resolve().then(() => h.ready(code));
    return { send: (m, to) => window.__out.push({ m: JSON.stringify(m), to: to || null }), drop: id => { (window.__dropped = window.__dropped || []).push(id); },
      voice: () => {}, close: () => { window.__closed = true; } };
  };
});
// One evaluate a game: what reached it, a few steps, what it sent. The host's words go to Bluey's game, and his to
// the host's as from link 'g1'.
const stepIn = (p, inbox, frames) => p.evaluate(([inbox, frames]) => {
  inbox.forEach(([m, from]) => window.__h && window.__h.data(JSON.parse(m), from));
  for (let i = 0; i < frames; i++) stepGame(1 / 60);
  return (window.__out || []).splice(0);
}, [inbox, frames]);
let toHost = [], toBluey = [];
async function tick(frames = 2) {
  const out = await stepIn(H, toHost.splice(0), frames);
  for (const o of out) toBluey.push([o.m, 'host']);
  const rout = await stepIn(R, toBluey.splice(0), frames);
  for (const o of rout) toHost.push([o.m, 'g1']);
}
const run = async n => { for (let i = 0; i < n; i++) await tick(); };
const phoneCoop = (p, name) => p.evaluate(name => {
  openPhone(); document.getElementById('phCoopBtn').click();
  const n = document.getElementById('coopName'); n.value = name; n.dispatchEvent(new Event('input'));
}, name);

// The host opens his door; Bluey goes over by the code
await phoneCoop(H, 'Hosty');
const btn = await H.evaluate(() => document.querySelector('#modalBody .ph-coop-btn') === null);   // the CO-OP screen replaced the texts
await H.evaluate(() => document.getElementById('coopHostBtn').click());
await H.waitForFunction(() => document.getElementById('coopCode'));
const code = await H.evaluate(() => document.getElementById('coopCode').textContent);
await phoneCoop(R, 'Bluey');
await R.evaluate(code => { document.getElementById('coopJoinCode').value = code; document.getElementById('coopJoinBtn').click(); }, code);
await R.waitForFunction(() => (window.__out || []).length > 0);
await run(3);
const st = p => p.evaluate(() => ({ other: Coop.other && Coop.other.name, me: Net.me, phase: Net.phase, coop: Net.coop, role: Net.role,
  note: (document.getElementById('coopNote') || {}).textContent || '', hud: document.getElementById('netHud').textContent, kid: !!Coop.kid }));
const s1 = await st(H), s2 = await st(R);
console.log('   host', JSON.stringify(s1), '\n   guest', JSON.stringify(s2));
check('the host opens his door from the phone (a code), and Bluey goes over by it: each game knows who the other is',
  btn && /^[A-Z]{4}$/.test(code) && s1.other === 'Bluey' && s2.other === 'Hosty' && s2.me === 'net_p1' && s1.phase === 'coop' && s2.phase === 'coop'
  && /Bluey is over/.test(s1.note) && /at Hosty/.test(s2.note) && /BLUEY CAME OVER/.test(s1.hud) && /AT HOSTY/.test(s2.hud) && s1.kid && s2.kid, { s1, s2 });

// The phones close; each walks somewhere in the room, and each sees the other's kid there
for (const p of [H, R]) await p.evaluate(() => { closeModal(); Game.mouse.locked = true; });
const modes = [await G[0].mode(), await G[1].mode()];
await H.evaluate(() => { Game.player.yaw = Math.PI / 2; Game.keys['KeyW'] = true; });   // the host walks west
await R.evaluate(() => { Game.player.yaw = 0; Game.keys['KeyW'] = true; });             // Bluey walks north into the room
await run(25);
const walking = await H.evaluate(() => Coop.kid.walkInt);
for (const p of [H, R]) await p.evaluate(() => { Game.keys['KeyW'] = false; });
await run(15);
const where = p => p.evaluate(() => ({ me: Game.player.pos.toArray(), kid: Coop.kid && Coop.kid.mesh.group.position.toArray(), shown: !!(Coop.kid && Coop.kid.mesh.group.visible),
  inScene: !!(Coop.kid && Coop.kid.mesh.group.parent === Scenes.bedroom.scene), gun: !!(Coop.kid && Coop.kid.mesh.gunGroup.visible) }));
const wH = await where(H), wR = await where(R);
const d = (u, v) => Math.hypot(u[0] - v[0], u[2] - v[2]);
const err = { hostSeesBluey: +d(wH.kid, wR.me).toFixed(3), blueySeesHost: +d(wR.kid, wH.me).toFixed(3) };
console.log('   where', modes, JSON.stringify(wH), JSON.stringify(wR), JSON.stringify(err), 'walking', walking);
check('each sees the other’s kid in the room where he is (within 5 cm), walking as he walks, no gun in the house',
  modes.every(m => m === 'bedroom') && wH.shown && wR.shown && wH.inScene && wR.inScene && !wH.gun && !wR.gun
  && err.hostSeesBluey < 0.05 && err.blueySeesHost < 0.05 && walking > 0.3 && d(wR.me, [0, 0, 0]) > 0, { err, walking });

// 2A: at the host's, Bluey can't start a match, shop, use the workbench or sleep; his phone works
const useE = (p, type) => p.evaluate(type => {
  const it = Game.interactables.find(i => i.type === type);
  Game.focusedInteractable = it;
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
  return { mode: Game.mode, hud: document.getElementById('netHud').textContent };
}, type);
const blocked = [];
for (const t of ['map_table', 'computer', 'hall_closet', 'bed', 'closet', 'pickup_board']) blocked.push([t, await useE(R, t)]);
const phone = await useE(R, 'phone');
await R.evaluate(() => closeModal());
const hostOk = await H.evaluate(() => ['map_table', 'computer', 'bed'].every(t => !coopBlocks(Game.interactables.find(i => i.type === t))));
console.log('   blocked', JSON.stringify(blocked), 'phone', JSON.stringify(phone));
check('at the host’s, Bluey can’t open the map, shop, use the workbench or the closet, sleep or set a pickup game, and is told why; his phone opens; the host’s room is his own',
  blocked.every(([, r]) => r.mode === 'bedroom' && /HOSTY’S ROOM · ONLY HOSTY CAN DO THAT/.test(r.hud)) && phone.mode === 'modal' && hostOk, { blocked, phone });

// A Pickup Game room's guest at a co-op door is turned away (and the other way round)
const kindH = await H.evaluate(() => { window.__h.data({ t: 'hello', ver: netVersion(), name: 'Reddy', look: {}, gun: 'pistol' }, 'g9');
  return { nope: (window.__out || []).splice(0).map(o => o.m).join(), dropped: (window.__dropped || []).includes('g9'), other: Coop.other.name }; });
check('a Pickup Game guest at the co-op door is turned away ("kind") and Bluey stays over',
  /"nope"/.test(kindH.nope) && /"kind"/.test(kindH.nope) && kindH.dropped && kindH.other === 'Bluey', kindH);

// v1.381 (step 2, 3A 4A 1B): the host's matches, with Bluey in them. The host's saves open every match; Bluey's is new.
const freshBluey = await R.evaluate(() => ({ locked: !isScenarioUnlocked('winnmark_team_2v2'), cash: Game.persist.cash, bag: Game.persist.bag,
  done: Object.keys(Game.persist.completed).length }));
const hostBag = await H.evaluate(() => { isScenarioUnlocked = () => true; return Game.persist.bag; });
async function together(id) {
  await H.evaluate(id => enterScenario(id), id);
  await run(2);
  const intro = [await G[0].mode(), await G[1].mode()];
  await H.evaluate(() => document.getElementById('introBeginBtn').click());
  const waitTxt = await H.evaluate(() => document.getElementById('introBeginBtn').textContent);
  await R.evaluate(() => document.getElementById('introBeginBtn').click());
  await run(3);
  for (const p of [H, R]) await p.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000, polling: 250 });
  for (const p of [H, R]) await p.evaluate(() => { Game.mouse.locked = true; });
  await run(3);
  return { intro, waitTxt };
}
const setup = p => p.evaluate(() => ({ me: Net.me, phase: Net.phase, hits: Game.player.maxHits, bag: Game.persist.bag,
  others: Game.scenario.enemies.map(e => `${e.charId}:${e.team === 'player' ? 'ally' : 'foe'}:${e.remote ? 'r' : 'ai'}`).sort().join(','),
  friendLives: Net.ents.get(Net.role === 'host' ? 'net_p1' : 'net_p0') && Net.ents.get(Net.role === 'host' ? 'net_p1' : 'net_p0').lives }));
const team = await together('winnmark_team_2v2');
const tH = await setup(H), tR = await setup(R);
console.log('   team', JSON.stringify(team), '\n   host', JSON.stringify(tH), '\n   bluey', JSON.stringify(tR));
check('3A in a team match: the host’s match starts in both games (past Bluey’s own locks), Bluey in Seth’s place, BEGIN waits for him; the host runs the kids, Bluey’s game moves them all from his word',
  freshBluey.locked && team.intro.every(m => m === 'scenario_intro') && /WAITING FOR BLUEY/.test(team.waitTxt)
  && tH.others === 'brooke:foe:ai,net_p1:ally:r,trey:foe:ai' && tR.others === 'brooke:foe:r,net_p0:ally:r,trey:foe:r' && tH.phase === 'play' && tR.phase === 'play', { tH, tR });
check('4A: Bluey plays with a full bag of BBs and the match’s lives, and the host’s game counts the same; the host’s bag is his own',
  tR.bag >= 1900 && tH.bag < hostBag && tR.hits === 1 && tH.friendLives === 1 && tH.hits === 1, { tR, tH, hostBag });

// Both walk; each sees the other where he is, and Bluey sees the kids where the host's game has them
await H.evaluate(() => { Game.keys['KeyW'] = true; }); await R.evaluate(() => { Game.keys['KeyA'] = true; });
await run(20);
for (const p of [H, R]) await p.evaluate(() => { Game.keys['KeyW'] = Game.keys['KeyA'] = false; });
await run(10);
const pos = p => p.evaluate(() => { const o = { [Net.me]: Game.player.pos.toArray() }; for (const [id, e] of Net.ents) o[id] = e.pos.toArray(); return o; });
const pH = await pos(H), pR = await pos(R);
const dd = (u, v) => Math.hypot(u[0] - v[0], u[2] - v[2]);
const seen = { hostSeesBluey: dd(pH.net_p1, pR.net_p1), blueySeesHost: dd(pR.net_p0, pH.net_p0), kids: Math.max(dd(pR.trey, pH.trey), dd(pR.brooke, pH.brooke)) };
for (const k in seen) seen[k] = +seen[k].toFixed(3);
console.log('   seen', JSON.stringify(seen));
check('in the match each sees the other within 10 cm, and Bluey sees the kids within 40 cm of where the host’s game has them',
  seen.hostSeesBluey < 0.1 && seen.blueySeesHost < 0.1 && seen.kids < 0.4, seen);

// Bluey's tags are the host's game's: his BBs at Trey from 3 m (the host's game decides; Bluey's shows the hit)
const nextTo = (p, id, dist) => p.evaluate(([id, dist]) => { const k = Net.ents.get(id), P = Game.player;
  P.pos.set(k.pos.x + dist, scenarioGroundY(k.pos.x + dist, k.pos.z), k.pos.z); P.vel.set(0, 0, 0); }, [id, dist]);
const shoot = (p, id) => p.evaluate(id => { const k = Net.ents.get(id), P = Game.player;
  P.pitch = Math.atan2(k.pos.y + 0.85 - (P.pos.y + P.eyeOffset), Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z));
  P.yaw = Math.atan2(-(k.pos.x - P.pos.x), -(k.pos.z - P.pos.z)); stepGame(1 / 60); Game.gun.ammo = Math.max(Game.gun.ammo, 5); return fireBB(); }, id);
const treyLives = () => H.evaluate(() => Net.ents.get('trey').lives);
const treyBefore = await treyLives(), blueyTagged = () => R.evaluate(() => Game.scenario.stats.tags.some(t => t.name === 'Trey'));
let tries = 0;
while (!(await blueyTagged()) && tries < 8 && await G[1].mode() === 'scenario') { await nextTo(R, 'trey', 3); await run(2); await shoot(R, 'trey'); await run(25); tries++; }
const tag = { treyBefore, treyNow: await treyLives(), tries, blueyTags: await R.evaluate(() => Game.scenario.stats.tags.map(t => t.name).join()), modes: [await G[0].mode(), await G[1].mode()] };
console.log('   bluey’s tag', JSON.stringify(tag));
check('Bluey’s shot at Trey tags him in the host’s game (a life gone), and Bluey’s game shows it as his tag', tag.treyNow < tag.treyBefore && /Trey/.test(tag.blueyTags), tag);

// The rest of their side out (the host's game, as from Bluey's gun): the win is the host's; Bluey takes home the pay (1B)
await H.evaluate(() => { const f = Net.ents.get('net_p1');
  for (const e of Game.scenario.enemies) if (e.team !== 'player' && Game.mode === 'scenario') {
    Object.assign(e, { lives: 1, state: 'hiding', health: e.maxHealth || 1, _graceT: 0 });   // each on his last life, so one tag each ends it
    applyBBHit({ owner: 'enemy', enemyRef: f, pos: e.pos.clone(), spawnPos: f.pos.clone(), vel: new THREE.Vector3(1, 0, 0) }, e);
  } });
await H.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 100 });
await run(2);
await R.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 100 });
const res = p => p.evaluate(() => ({ out: document.getElementById('resultScreen').className, title: (document.querySelector('#resultScreen h1, #resultScreen .result-title') || {}).textContent,
  cash: Game.persist.cash, bag: Game.persist.bag, won: !!Game.persist.completed.winnmark_team_2v2, phase: Net.phase, together: !!Coop.other,
  again: document.getElementById('navAgainBtn').textContent, againOff: document.getElementById('navAgainBtn').disabled,
  next: document.getElementById('navNextBtn').disabled, note: document.getElementById('reloadNote').textContent, outcome: Game.scenario.lastOutcome || null }));
const rH = await res(H), rR = await res(R);
console.log('   result host', JSON.stringify(rH), '\n   result bluey', JSON.stringify(rR));
check('1B: the win goes on the host’s summer; Bluey’s save gets the pay and not the win, his bag put back; the next match is the host’s call; both still hanging out',
  rH.won && !rR.won && rR.cash > freshBluey.cash && rR.bag === freshBluey.bag && /HOSTY’S CALL/.test(rR.again) && rR.againOff && rR.next && /pay is yours/.test(rR.note)
  && !/CALL/.test(rH.again) && rH.phase === 'coop' && rR.phase === 'coop' && rH.together && rR.together, { rH, rR, freshBluey });

// The host goes home from the result; Bluey's game follows him
await H.evaluate(() => document.getElementById('returnBtn').click());
await run(3);
const home = [await G[0].mode(), await G[1].mode(), await R.evaluate(() => document.getElementById('navAgainBtn').textContent)];
await run(10);
const homeKid = await H.evaluate(() => !!(Coop.kid && Coop.kid.mesh.group.visible && Coop.kid.mesh.group.parent === Scenes.bedroom.scene));
check('BACK TO YOUR ROOM: the host home and Bluey’s game with him, each seeing the other in the room again',
  home[0] === 'bedroom' && home[1] === 'bedroom' && !/CALL/.test(home[2]) && homeKid, { home, homeKid });

// 3A in a match where you are alone: Bluey beside you, and the other side a kid bigger. The host is out; Bluey plays on.
const solo = await together('winnmark_seth_house');
const sH = await setup(H), sR = await setup(R);
console.log('   solo host', JSON.stringify(sH), '\n   solo bluey', JSON.stringify(sR));
const foes = sH.others.split(',').filter(s => /:foe:/.test(s));
check('3A alone: Bluey stands with you and Seth gets a kid of his street beside him; both games build the same',
  /net_p1:ally:r/.test(sH.others) && foes.length === 2 && /seth:foe:ai/.test(sH.others) && /net_p0:ally:r/.test(sR.others)
  && sR.others.split(',').filter(s => /:foe:r/.test(s)).length === 2, { sH, sR });
await H.evaluate(() => { const k = Net.ents.get('seth'); applyBBHit({ owner: 'enemy', enemyRef: k, pos: Game.player.pos.clone(), spawnPos: k.pos.clone(), vel: new THREE.Vector3(1, 0, 0) }, Game.player); });
await run(40);
const hostOut = [await G[0].mode(), await G[1].mode(), await H.evaluate(() => Game.player._netOut), await R.evaluate(() => Net.ents.get('net_p0').lives)];
check('the host tagged out: the match goes on for Bluey, and his game shows the host out', hostOut[0] === 'scenario' && hostOut[1] === 'scenario' && hostOut[2] && hostOut[3] === 0, hostOut);
await H.evaluate(() => { const k = Net.ents.get('seth'), f = Net.ents.get('net_p1'); applyBBHit({ owner: 'enemy', enemyRef: k, pos: f.pos.clone(), spawnPos: k.pos.clone(), vel: new THREE.Vector3(1, 0, 0) }, f); });
await H.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 100 });
await run(2);
await R.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 100 });
const lost = [await R.evaluate(() => ({ hits: Game.player.hitsTaken, max: Game.player.maxHits })), await H.evaluate(() => Game.persist.completed.winnmark_seth_house || false)];
check('Bluey tagged out too: the match is lost in both games', lost[0].hits >= lost[0].max, lost);
// PLAY AGAIN on the host's card takes both straight into it again
await H.evaluate(() => document.getElementById('navAgainBtn').click());
await run(2);
const again = [await G[0].mode(), await G[1].mode()];
check('PLAY AGAIN on the host’s card takes Bluey along, from his own result card', again[0] === 'scenario_intro' && again[1] === 'scenario_intro', again);
// Bluey sits it out (F): his kid plays on in the host's game; he is still over
await H.evaluate(() => document.getElementById('introBeginBtn').click());
await R.evaluate(() => document.getElementById('introBeginBtn').click());
await run(3);
for (const p of [H, R]) await p.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000, polling: 250 });
await R.evaluate(() => endScenario('forfeit'));
await run(4);
const sat = await H.evaluate(() => { const f = Net.ents.get('net_p1'); return { mode: Game.mode, remote: f.remote, bot: f.netBot, hud: document.getElementById('netHud').textContent, other: Coop.other && Coop.other.name }; });
check('Bluey sits one out (F): his kid plays on in the host’s game, and he is still over', sat.mode === 'scenario' && !sat.remote && sat.bot && /BLUEY SAT THIS ONE OUT/.test(sat.hud) && sat.other === 'Bluey', sat);
await H.evaluate(() => endScenario('forfeit'));
await H.evaluate(() => document.getElementById('returnBtn').click());
await run(3);
// A match co-op leaves alone: Bluey waits at home, and is told so
await H.evaluate(() => { coopScenario('bunratty_go_cart'); });
await run(2);
const wait = await R.evaluate(() => ({ mode: Game.mode, hud: document.getElementById('netHud').textContent }));
check('a race is one player’s: Bluey waits at home and is told so', wait.mode === 'bedroom' && /HOSTY PLAYS THIS ONE ALONE/.test(wait.hud), wait);

// GO HOME on Bluey's phone: his link closes; the host's game hears the drop
await R.evaluate(() => { openPhone(); document.getElementById('phCoopBtn').click(); document.getElementById('coopLeaveBtn').click(); });
const gone = await R.evaluate(() => ({ closed: window.__closed, active: Net.active, kid: !!Coop.kid, other: !!Coop.other, note: document.querySelector('#modalBody .ph-coop') ? document.getElementById('coopHostBtn') !== null : false }));
await H.evaluate(() => window.__h.closed('g1'));
const hGone = await H.evaluate(() => ({ other: !!Coop.other, kid: !!Coop.kid, inScene: Scenes.bedroom.scene.children.some(c => c.userData && c.userData.coop), hud: document.getElementById('netHud').textContent,
  waiting: Net.active && Net.coop && Net.phase === 'coop', people: Net.people.length }));
console.log('   go home', JSON.stringify(gone), JSON.stringify(hGone));
check('GO HOME on Bluey’s phone closes his link and he is home; the host’s game takes his kid out and says so, door still open',
  gone.closed && !gone.active && !gone.kid && !gone.other && gone.note && !hGone.other && !hGone.kid && /BLUEY WENT HOME/.test(hGone.hud) && hGone.waiting && hGone.people === 1, { gone, hGone });
await R.evaluate(() => closeModal());

// Bluey comes back by the same code; then the host sends him home
await R.evaluate(code => { window.__out = []; openPhone(); document.getElementById('phCoopBtn').click(); document.getElementById('coopJoinCode').value = code; document.getElementById('coopJoinBtn').click(); }, code);
await R.waitForFunction(() => (window.__out || []).length > 0);
await R.evaluate(() => closeModal());
await run(3);
const back = (await st(H)).other === 'Bluey' && (await st(R)).other === 'Hosty';
await H.evaluate(() => { openPhone(); document.getElementById('phCoopBtn').click(); });
const sendTxt = await H.evaluate(() => document.getElementById('coopLeaveBtn').textContent);
await H.evaluate(() => document.getElementById('coopLeaveBtn').click());
await R.evaluate(() => window.__h.closed('host'));
const ended = await R.evaluate(() => ({ mode: Game.mode, title: document.getElementById('modalTitle').textContent, active: Net.active, kid: !!Coop.kid }));
await R.evaluate(() => closeModal());
const after = [await G[0].mode(), await G[1].mode(), await H.evaluate(() => Net.active)];
console.log('   sent home', back, sendTxt, JSON.stringify(ended), after);
check('Bluey comes back by the same code; SEND BLUEY HOME ends it, and Bluey’s game says so and leaves him in his own room',
  back && sendTxt === 'SEND BLUEY HOME' && ended.mode === 'modal' && /Hosty ended co-op/.test(ended.title) && !ended.active && !ended.kid
  && after[0] === 'modal' && after[1] === 'bedroom' && after[2] === false, { back, sendTxt, ended, after });

// v1.381: Bluey's browser closes mid-match: his kid plays on in the host's game, and co-op is over; his own game, cut
// off, ends the match and is home with nothing lost
await H.evaluate(() => { closeModal(); openPhone(); document.getElementById('phCoopBtn').click(); document.getElementById('coopHostBtn').click(); });
await H.waitForFunction(() => document.getElementById('coopCode'));
const code2 = await H.evaluate(() => { const c = document.getElementById('coopCode').textContent; closeModal(); return c; });
await R.evaluate(code => { window.__out = []; openPhone(); document.getElementById('phCoopBtn').click(); document.getElementById('coopJoinCode').value = code; document.getElementById('coopJoinBtn').click(); }, code2);
await R.waitForFunction(() => (window.__out || []).length > 0);
await R.evaluate(() => closeModal());
await run(3);
await together('winnmark_seth_house');
const cashBefore = await R.evaluate(() => Game.persist.cash);
await H.evaluate(() => window.__h.closed('g1'));
await run(30);
const dropH = await H.evaluate(() => { const f = Game.scenario.enemies.find(e => e.charId === 'net_p1'); return { mode: Game.mode, bot: !!(f && f.netBot), remote: !!(f && f.remote),
  hud: document.getElementById('netHud').textContent, other: !!Coop.other, coop: Net.active && Net.coop }; });
await R.evaluate(() => window.__h.closed('host'));
const dropR = await R.evaluate(() => ({ mode: Game.mode, title: document.getElementById('modalTitle').textContent, net: Net.active, bag: Game.persist.bag }));
const dropCash = await R.evaluate(() => Game.persist.cash);
console.log('   dropped', JSON.stringify(dropH), JSON.stringify(dropR), cashBefore, dropCash);
check('Bluey’s link drops mid-match: his kid plays on in the host’s game and co-op is over; Bluey’s game ends it, home, bag as it was, unpaid',
  dropH.mode === 'scenario' && dropH.bot && !dropH.remote && /BLUEY LEFT · A KID PLAYS THE SPOT/.test(dropH.hud) && !dropH.other
  && dropR.mode === 'modal' && dropR.title === 'The host left' && !dropR.net && dropR.bag === freshBluey.bag && dropCash === cashBefore, { dropH, dropR, cashBefore, dropCash });

const errs = G.flatMap(g => g.errs);
check('no page errors in either game', errs.length === 0, errs);
for (const g of G) await g.close();
