// Found in play (builder, v1.110): in tests/cover-fire's Hollow 3v3 the held trigger pulls (a kid pulls with a wall
// inside 3 m, so no BB) swung from 19 to 199 a run on the same build. v1.122: it was one kid a run parked at a fort
// wall. Rebecca, reacting to fire from inside her fort, ran for the one cover in reach, past the fort's back wall,
// wedged in the corner (−0.93, 27.55) and pulled into the wall there 35–60 times a minute; Sean did the same in the
// other fort. Kids now take cover only where they can walk a straight line, and three held pulls in a row move them.
// Four 60 s rounds, player untaggable at spawn; counts held pulls per kid per 1 m spot (the 2.5 s opening hold aside).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
const runs = [];
for (let run = 0; run < 4; run++) {
  await g.scenario('hollow_skirmish_3v3');
  runs.push(await page.evaluate(() => {
    const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    const mk = makeBB; let made = 0;
    window.makeBB = function (pos, vel, owner, e) { if (owner === 'enemy' && e) made++; return mk.apply(this, arguments); };
    const sp = spawnEnemyBB; let calls = 0, held = 0; const spot = {};
    window.spawnEnemyBB = function (e) {
      if (inOpeningHold()) return sp.apply(this, arguments);
      calls++; const m0 = made; const r = sp.apply(this, arguments);
      if (made === m0) { held++; const k = `${e.character?.name} @${e.pos.x.toFixed(0)},${e.pos.z.toFixed(0)}`; spot[k] = (spot[k] || 0) + 1; }
      return r;
    };
    for (let f = 0; f < 3600 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
    window.makeBB = mk; window.applyBBHit = hit; window.spawnEnemyBB = sp;
    const worst = Object.entries(spot).sort((a, b) => b[1] - a[1])[0] || ['none', 0];
    const R = Game.scenario.enemies.find(k => k.character?.name === 'Rebecca');
    return { calls, held, worst, rebecca: R && [+R.pos.x.toFixed(2), +R.pos.z.toFixed(2)] };
  }));
  console.log('  run', run + 1, JSON.stringify(runs[run]));
  if (await g.mode() === 'scenario') await g.page.evaluate(() => endScenario('forfeit'));
  await page.evaluate(() => enterBedroom()); await g.spin(5);
}
// the burst queue: a held pull empties it mid-burst (v1.112), and the burst loop must stop there, not read on
await g.scenario('hollow_skirmish_3v3');
const burst = await page.evaluate(() => {
  const e = Game.scenario.enemies.find(k => k.team === 'enemy' && k.health > 0), sp = spawnEnemyBB;
  e.pendingBurst = [{ dueIn: -1 }, { dueIn: -1 }, { dueIn: -1 }];
  window.spawnEnemyBB = function (k) { if (k === e) { e.pendingBurst.length = 0; return; } return sp.apply(this, arguments); };
  let err = null; try { stepGame(1 / 60); } catch (x) { err = String(x).slice(0, 120); }
  window.spawnEnemyBB = sp;
  return { err, left: e.pendingBurst.length };
});
check('a burst emptied by a held pull ends cleanly (no "dueIn" error)', burst.err === null && burst.left === 0, burst);
const calls = runs.reduce((s, r) => s + r.calls, 0), held = runs.reduce((s, r) => s + r.held, 0);
check('kids shoot (100+ trigger pulls a round)', runs.every(r => r.calls >= 100), runs.map(r => r.calls));
check('no kid holds fire 20 times or more from one spot in a round', runs.every(r => r.worst[1] < 20), runs.map(r => r.worst));
check('under 10% of trigger pulls held over the four rounds', held / calls < 0.10, { held, calls, pct: +(100 * held / calls).toFixed(1) });
check('Rebecca never ends a round in the fort\'s south-west corner', runs.every(r => !r.rebecca || Math.hypot(r.rebecca[0] + 0.93, r.rebecca[1] - 27.55) > 0.3), runs.map(r => r.rebecca));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
