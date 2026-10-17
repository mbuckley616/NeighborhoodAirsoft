// v1.255 (backlog B.11, Michael: A): squad orders on a controller. In a match with teammates the d-pad gives the order
// at once, the wheel's way round (up push up, right find cover, down keep distance, left follow me); the wheel flashes
// it lit, a teammate answers, the HUD's hint reads D-PAD, and the gun stays where it was (slots are Y/RB and LB). In a
// match with no teammates the d-pad still picks slots. The pad is a stand-in for navigator.getGamepads(), as in gamepad.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => {
  window.__pad = { buttons: Array(17).fill(0), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [{
    id: 'test pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0, axes: window.__pad.axes.slice(),
    buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })),
  }];
  Game.persist.loadoutSlots[1] = { kind: 'spare_mag', refId: 'spare_mag_10' };
});
const B = { Y: 3, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const btn = (i, v) => page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [i, v]);
const S = () => page.evaluate(() => ({
  order: Game.scenario.squadOrder || null, reply: Game.scenario.squadReply?.name || null, slot: Game.held.slotIdx,
  shown: document.getElementById('squadWheel').style.display, lit: document.querySelector('#squadWheel .sq-opt.on')?.dataset.k || null,
  title: document.querySelector('#squadWheel .sq-title')?.textContent || null, hud: document.getElementById('squadHud').textContent,
  wheel: !!Game.squadWheel, active: Pad.active, mode: Game.mode,
}));

// a team match
await g.scenario('hollow_skirmish_3v3');
await page.evaluate(() => {
  Game.mouse.locked = false; Game.player.maxHits = 999;
  for (const e of Game.scenario.enemies) if (e.team !== 'player') e.noFire = true;
});
await btn(B.Y, 1); await g.spin(2); await btn(B.Y, 0); await g.spin(2);   // wakes the pad (and steps a slot)
const s0 = await S();
check('the pad is in use and the HUD hint reads D-PAD, not Q', s0.active && /D-PAD/.test(s0.hud) && !/hold Q/.test(s0.hud), s0.hud);
const res = {};
for (const [k, b] of [['push', B.UP], ['cover', B.RIGHT], ['distance', B.DOWN], ['follow', B.LEFT]]) {
  const before = await S();
  await btn(b, 1); await g.spin(1);
  const at = await S();
  await btn(b, 0); await g.spin(5);
  const mid = await S();
  await g.spin(40);   // past the 0.6 s flash
  const after = await S();
  res[k] = { order: at.order, lit: at.lit, shown: at.shown, title: at.title, reply: at.reply, slotKept: at.slot === before.slot,
    stillShown: mid.shown, after: after.shown, wheel: at.wheel, hud: after.hud };
}
console.log('   d-pad:', JSON.stringify(res));
check('each d-pad way gives its order at once: up push, right cover, down distance, left follow',
  Object.entries(res).every(([k, r]) => r.order === k), Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.order])));
check('the wheel flashes with that order lit, titled ORDER GIVEN, and no wheel is left open',
  Object.entries(res).every(([k, r]) => r.shown === 'block' && r.lit === k && r.title === 'ORDER GIVEN' && !r.wheel && r.stillShown === 'block'));
check('the flash is gone after 0.6 s', Object.values(res).every(r => r.after === 'none'));
check('a teammate answers each on the walkie', Object.values(res).every(r => r.reply));
check('the HUD shows the order standing', /FOLLOW ME/.test(res.follow.hud) && /D-PAD/.test(res.follow.hud), res.follow.hud);
check('the d-pad no longer changes the gun in a team match', Object.values(res).every(r => r.slotKept));
const log = await page.evaluate(() => Game.scenario.squadLog.map(l => l.key));
check('four orders logged, in order', log.join() === 'push,cover,distance,follow', log);

// paused: the d-pad gives nothing
await page.evaluate(() => openPauseMenu());
await btn(B.UP, 1); await g.spin(1); await btn(B.UP, 0); await g.spin(1);
const paused = await page.evaluate(() => ({ order: Game.scenario.squadOrder, n: Game.scenario.squadLog.length, paused: !!Game.paused }));
check('while paused the d-pad gives no order', paused.paused && paused.order === 'follow' && paused.n === 4, paused);
await page.evaluate(() => closePauseMenu());

// a 1v1: no teammates, the d-pad still picks slots
await g.scenario('bunratty_sean');
await page.evaluate(() => { Game.mouse.locked = false; Game.player._graceT = 1e9; });
await g.spin(5);
await btn(B.RIGHT, 1); await g.spin(2); await btn(B.RIGHT, 0); await g.spin(5);
const solo1 = await S();
await btn(B.UP, 1); await g.spin(2); await btn(B.UP, 0); await g.spin(5);
const solo0 = await S();
check('with no teammates the d-pad still picks slots (right 2, up 1), and no order or wheel shows',
  solo1.slot === 1 && solo0.slot === 0 && !solo0.order && solo0.shown !== 'block', { solo1: solo1.slot, solo0: solo0.slot, order: solo0.order, shown: solo0.shown });

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
