// v1.380 (backlog D.73, card fable/d73-coop; Michael 28 Oct, B: 1B 2A 3A 4A): co-op, a friend over. Two headless
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

const errs = G.flatMap(g => g.errs);
check('no page errors in either game', errs.length === 0, errs);
for (const g of G) await g.close();
