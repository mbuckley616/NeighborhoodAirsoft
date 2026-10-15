// v1.241 (backlog D.38, Michael 14 Oct: "I think we have partial controller support - can we look into having full
// controller support?"). Before v1.241 nothing read a gamepad. Now a standard-layout pad plays a match and walks the
// bedroom without the pointer lock: left stick moves (analog), right stick looks, RT fires, LT aims, A jumps (E in the
// bedroom), B crouches, X reloads, Y/RB/LB and the d-pad pick slots, L3 sprints, Start pauses, Back asks to forfeit.
// The pad here is a stand-in for navigator.getGamepads(), set button by button from the test.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

await page.evaluate(() => {
  window.__pad = { buttons: Array(17).fill(0), axes: [0, 0, 0, 0], on: true };
  navigator.getGamepads = () => window.__pad.on ? [{
    id: 'test pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0,
    axes: window.__pad.axes.slice(),
    buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })),
  }] : [];
});
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, UP: 12, RIGHT: 15 };
const btn = (i, v) => page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [i, v]);
const axes = (a) => page.evaluate(a => { window.__pad.axes = a; }, a);
const tap = async (i) => { await btn(i, 1); await g.spin(2); await btn(i, 0); await g.spin(2); };
const P = () => page.evaluate(() => ({
  x: Game.player.pos.x, y: Game.player.pos.y, z: Game.player.pos.z, yaw: Game.player.yaw, pitch: Game.player.pitch,
  ads: Game.player.ads, crouch: !!Game.player.crouching, sprint: !!Game.player.sprinting, mode: Game.mode,
  paused: !!Game.paused, asking: !!Game.forfeitAsk, slot: Game.held.slotIdx, ammo: Game.gun.ammo,
  shots: Game.scenario?.stats?.shots ?? null, r: !!Game.keys.KeyR, hint: document.getElementById('pauseHint').style.display,
  active: Pad.active,
}));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

// 1) the bedroom: the stick walks him with no pointer lock
await page.evaluate(() => { Game.mouse.locked = false; });
const b0 = await P();
await g.spin(30);
check('in the bedroom, before the pad is touched, nothing moves', dist(b0, await P()) < 1e-6);
await axes([0, -1, 0, 0]);
await g.spin(30);
const b1 = await P();
await axes([0, 0, 0, 0]);
check('the left stick walks him in the bedroom, mouse not captured', dist(b0, b1) > 0.5 && b1.active, { moved: +dist(b0, b1).toFixed(2) });
check('no "click to capture" note while the pad is in use', b1.hint === 'none', b1.hint);

// 2) a match, no pointer lock
await page.evaluate(() => { Game.persist.loadoutSlots[1] = { kind: 'spare_mag', refId: 'spare_mag_10' }; });
await g.scenario('bunratty_sean');
await page.evaluate(() => { Game.mouse.locked = false; Game.player._graceT = 1e9; });
await g.spin(10);
const m0 = await P();
await axes([0, -1, 0, 0]);
await g.spin(60);
const m1 = await P();
await axes([0, -0.59, 0, 0]);   // half way past the dead zone
await g.spin(60);
const m2 = await P();
await axes([0, 0, 0, 0]);
const full = dist(m0, m1), half = dist(m1, m2);
console.log('   1 s full stick', full.toFixed(2), 'm; 1 s half stick', half.toFixed(2), 'm');
check('full left stick forward walks him in a match, mouse not captured', full > 2, full);
check('half a push walks about half as fast (analog)', half > full * 0.35 && half < full * 0.65, { full, half });
const fwd = { x: -Math.sin(m0.yaw), z: -Math.cos(m0.yaw) };
check('and it is forward, the way he faces', ((m1.x - m0.x) * fwd.x + (m1.z - m0.z) * fwd.z) / full > 0.9);

await axes([0, 0, 1, 0]);
await g.spin(60);
const l1 = await P();
await axes([0, 0, 0, 0]);
const turn = m2.yaw - l1.yaw;
console.log('   1 s of full right stick turns', turn.toFixed(2), 'rad');
check('right stick right turns him right, about 2.5 rad a second', turn > 1.8 && turn < 3.2, turn);
await axes([0, 0, 0, -0.6]);
await g.spin(20);
const l2 = await P();
await axes([0, 0, 0, 0]);
check('right stick up looks up', l2.pitch > l1.pitch + 0.05, { before: l1.pitch, after: l2.pitch });

// sprint: a click of the left stick while pushing it
await axes([0, -1, 0, 0]);
await tap(B.L3);
await g.spin(20);
const s1 = await P();
await axes([0, 0, 0, 0]);
await g.spin(4);
const s2 = await P();
check('L3 while pushing the stick sprints; letting the stick go stops it', s1.sprint && !s2.sprint, { s1: s1.sprint, s2: s2.sprint });

// aim: LT held
await btn(B.LT, 1);
await g.spin(40);
const a1 = await P();
await btn(B.LT, 0);
await g.spin(40);
const a2 = await P();
check('LT held aims down the sights, let go lowers them', a1.ads > 0.9 && a2.ads < 0.1, { held: a1.ads, let: a2.ads });

// fire: RT. A spring gun cocks on the first hold, fires on the next pull; pull a few times
const f0 = await P();
for (let i = 0; i < 6; i++) { await btn(B.RT, 1); await g.spin(45); await btn(B.RT, 0); await g.spin(20); }
const f1 = await P();
console.log('   ammo', f0.ammo, '→', f1.ammo, 'shots', f0.shots, '→', f1.shots);
check('RT fires the gun', f1.ammo < f0.ammo, { before: f0.ammo, after: f1.ammo });

// X: reload held as R
await btn(B.X, 1); await g.spin(2);
const x1 = await P();
await btn(B.X, 0); await g.spin(2);
const x2 = await P();
check('X holds R (reload) and lets it go', x1.r && !x2.r);

// A jumps, B crouches
const j0 = await P();
await btn(B.A, 1); await g.spin(10);
const j1 = await P();
await btn(B.A, 0); await g.spin(90);
check('A jumps', j1.y > j0.y + 0.1, { y0: j0.y, y1: j1.y });
await tap(B.B);
const c1 = await P();
await tap(B.B);
const c2 = await P();
check('B crouches, B again stands', c1.crouch && !c2.crouch);

// slots: Y / RB next, LB back, d-pad right = slot 2
await tap(B.Y);
const y1 = await P();
await tap(B.LB);
const y2 = await P();
await tap(B.RIGHT);
const y3 = await P();
await tap(B.UP);
const y4 = await P();
check('Y picks the next slot, LB the one before, d-pad right slot 2, d-pad up slot 1',
  y1.slot === 1 && y2.slot === 0 && y3.slot === 1 && y4.slot === 0, [y1.slot, y2.slot, y3.slot, y4.slot]);

// Start pauses and stops the match; Start again goes on
await tap(B.START);
const p1 = await page.evaluate(() => ({ paused: !!Game.paused, t: Game.scenario.roundTime }));
await g.spin(60);
const p2 = await page.evaluate(() => ({ paused: !!Game.paused, t: Game.scenario.roundTime }));
check('Start opens PAUSED and the match stops', p1.paused && p2.paused && p2.t === p1.t, { p1, p2 });
await axes([0, -1, 0, 0]); await g.spin(20); await axes([0, 0, 0, 0]);
check('the stick does not walk him while paused', dist(await P(), await P()) === 0 && (await P()).paused);
await tap(B.START);
await g.spin(30);
const p3 = await page.evaluate(() => ({ paused: !!Game.paused, t: Game.scenario.roundTime }));
check('Start again goes back and the clock runs', !p3.paused && p3.t > p2.t + 0.4, p3);
await tap(B.START);
await tap(B.B);
check('B on the pause menu goes back too', !(await P()).paused);

// Back asks to forfeit; B keeps playing; Back then A forfeits
await tap(B.BACK);
const q1 = await P();
await tap(B.B);
const q2 = await P();
check('Back asks the forfeit question, B keeps playing', q1.asking && !q2.asking && q2.mode === 'scenario', { q1: q1.asking, q2: q2.asking });
await tap(B.BACK);
await tap(B.A);
await g.spin(10);
const q3 = await P();
check('Back then A forfeits', q3.mode === 'result', q3.mode);

// unplugged: nothing is held
await page.evaluate(() => { window.__pad.on = false; });
await g.spin(5);
check('a pad unplugged leaves no stick held', await page.evaluate(() => Pad.move.x === 0 && Pad.move.z === 0));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
