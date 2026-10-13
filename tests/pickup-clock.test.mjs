// v1.204 (D.22 step 4, Michael: A on "A better game" 3, "a clock"): the Pickup Game board's Clock row, Off or 3, 5 or 10
// minutes. Time up, the side with more lives left wins (in a free-for-all, more than any one kid); level is a draw,
// paid as a loss, as the flags' clock (v1.191). The HUD shows the time and the lives it will be decided on.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// The board's Clock row: Off to start; 3:00 lit and written into the match and its briefing
const b = await page.evaluate(() => {
  openPickupBoard();
  const grp = k => [...document.querySelectorAll(`#modalBody .pk-opt[data-grp="${k}"]`)];
  const before = { opts: grp('clock').map(x => x.textContent), on: grp('clock').filter(x => x.classList.contains('on')).map(x => x.textContent) };
  document.querySelector('#modalBody .pk-opt[data-grp="clock"][data-val="180"]').click();
  const lit = grp('clock').filter(x => x.classList.contains('on')).map(x => x.textContent);
  document.getElementById('pickupPlayBtn').click();
  const sc = SCENARIOS.pickup_game;
  return { before, lit, clock: sc.pickup.clock, desc: sc.desc, win: describeWinCondition(sc), mode: Game.mode };
});
console.log('  ', b.desc);
check('the board has a Clock row: Off, 3:00, 5:00, 10:00, with Off lit', b.before.opts.join() === 'Off,3:00,5:00,10:00' && b.before.on.join() === 'Off', b.before);
check('clicking 3:00 lights it, and PLAY builds a match with a 180 s clock', b.lit.join() === '3:00' && b.clock === 180 && b.mode === 'scenario_intro', b);
check('the briefing says how time decides it', /more lives left at 3:00/.test(b.desc) && b.win === 'Last team standing, or most lives left at 3:00', b);
await page.waitForFunction(() => { const x = document.getElementById('introBeginBtn'); return x && x.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; });

const hud = () => page.evaluate(() => ({ shown: document.getElementById('timerHud').style.display,
  value: document.getElementById('timerValue').textContent, label: document.getElementById('timerLabel').textContent }));
await g.spin(60);
const h0 = await hud();
const lives0 = await page.evaluate(() => ({ max: Game.player.maxHits, kids: Game.scenario.enemies.map(e => `${e.team || 'enemy'}:${e.lives}`) }));
check('in the match the HUD shows the clock running down from 3:00 and the lives each side has left', h0.shown === 'block'
  && /^2:5\d$/.test(h0.value) && /^LIVES \d+–\d+$/.test(h0.label), { h0, lives0 });
await g.shot('pickup-clock-hud');

// Time up with more lives on our side: a win, $3, and the result says so
const runOut = async (setup) => {
  const cash = await page.evaluate(setup);
  await g.spin(40);
  await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
  return page.evaluate(cash => ({ mode: Game.mode, paid: Game.persist.cash - cash, up: Game.scenario.pickupTimeUp,
    outcome: document.getElementById('outcomeText').textContent, cls: document.getElementById('outcomeText').className,
    flavor: document.getElementById('flavorText').textContent, done: !!Game.persist.completed.pickup_game }), cash);
};
const w = await runOut(() => {
  Game.scenario.roundTime = 179.6;
  Game.player._graceT = 5;
  for (const e of Game.scenario.enemies) if (e.team !== 'player') e.lives = 1;
  return Game.persist.cash;
});
console.log('  ', w.outcome, '·', w.flavor);
check('time up with more lives left on our side: a win, paid $3, no ladder win', w.mode === 'result' && w.up && w.up.ours > w.up.theirs
  && /win/.test(w.cls) && /^TIME — \d+ LIVES TO \d+$/.test(w.outcome) && w.paid === 3 && !w.done, w);

// Level at time: a draw, paid as a loss
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 2, tod: 'day', lives: 3, clock: 300 }));
await g.scenario('pickup_game');
const d = await runOut(() => {
  Game.scenario.roundTime = 299.6;
  Game.player._graceT = 5;
  Game.player.hitsTaken = Game.player.maxHits - 2;
  for (const e of Game.scenario.enemies) e.lives = e.team === 'player' ? 1 : (e === Game.scenario.enemies.find(k => k.team !== 'player') ? 3 : 0);
  for (const e of Game.scenario.enemies) if (!e.lives) e.health = 0;
  return Game.persist.cash;
});
console.log('  ', d.outcome, '·', d.flavor);
check('level at time (3 lives each): a draw, paid as a loss ($1)', d.mode === 'result' && d.up && d.up.ours === 3 && d.up.theirs === 3
  && /lose/.test(d.cls) && /^DRAW/.test(d.outcome) && d.paid === 1, d);

// Fewer at time: a loss
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 2, tod: 'day', lives: 5, clock: 600 }));
await g.scenario('pickup_game');
const l = await runOut(() => {
  Game.scenario.roundTime = 599.6;
  Game.player._graceT = 5;
  Game.player.hitsTaken = Game.player.maxHits - 1;
  for (const e of Game.scenario.enemies) if (e.team === 'player') e.lives = 1;
  return Game.persist.cash;
});
console.log('  ', l.outcome, '·', l.flavor);
check('fewer lives left at time: a loss, $1', l.mode === 'result' && l.up && l.up.ours < l.up.theirs && /lose/.test(l.cls)
  && /^TIME — THEY HAD \d+ TO \d+$/.test(l.outcome) && l.paid === 1, l);

// A free-for-all with a clock: you need more than any one kid
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', mode: 'ffa', ways: 4, tod: 'day', lives: 3, clock: 180 }));
await g.scenario('pickup_game');
await g.spin(30);
const fh = await hud();
const fsc = await page.evaluate(() => ({ win: describeWinCondition(SCENARIOS.pickup_game), desc: SCENARIOS.pickup_game.desc }));
check('a free-for-all shows your lives against the most any kid has', fh.shown === 'block' && /^YOUR LIVES \d+ · MOST \d+$/.test(fh.label)
  && fsc.win === 'Last kid standing, or most lives left at 3:00' && /most lives left at 3:00/.test(fsc.desc), { fh, fsc });
const f = await runOut(() => {
  Game.scenario.roundTime = 179.6;
  Game.player._graceT = 5;
  Game.player.hitsTaken = 0;
  Game.scenario.enemies.forEach((e, i) => { e.lives = i === 0 ? 3 : 1; });
  return Game.persist.cash;
});
console.log('  ', f.outcome, '·', f.flavor);
check('…and level with the best kid at time is a draw, not a win', f.mode === 'result' && f.up && f.up.theirs === 3 && f.up.ours === 3 && /^DRAW/.test(f.outcome), f);

// Clock Off: no clock on the HUD, and a long round is still decided only by last standing
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 2, tod: 'day', lives: 3 }));
await g.scenario('pickup_game');
const off = await page.evaluate(() => { Game.scenario.roundTime = 1000; Game.player._graceT = 5; return null; });
await g.spin(60);
const oh = await hud();
const om = await page.evaluate(() => ({ mode: Game.mode, clock: Game.scenario.pickupClock, up: Game.scenario.pickupTimeUp, wc: Game.scenario.winCondition }));
check('with the clock Off there is no clock and no time-up', oh.shown === 'none' && om.mode === 'scenario' && !om.clock && !om.up && om.wc === 'last_team_standing', { oh, om });
// a ladder match is untouched
await g.scenario('bunratty_team_4v4');
await g.spin(30);
const lad = await page.evaluate(() => ({ clock: Game.scenario.pickupClock, shown: document.getElementById('timerHud').style.display }));
check('a ladder team battle has no pickup clock', !lad.clock && lad.shown === 'none', lad);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
