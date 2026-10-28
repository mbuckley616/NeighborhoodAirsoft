// v1.354 (backlog D.71, Michael: A, 23 Oct: "the go-cart race first, on Bunratty's slope, gravity only, kids along the
// route shooting; reach the bottom with lives left"): Downhill Derby. Checked: you start in the cart at the top of the
// street with three lives; a driver that steers round the lane's cars reaches the bulb and wins; a cart nobody steers
// is stopped by a parked car; S brakes, W kicks you along from rest; a tag costs a life and you roll on, the third loses.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page, errs } = g;
await g.bedroom();

// the test's driver: steer to the nearest line across the lane that is clear for the next few metres, brake if none is
const DRIVE = () => {
  window.__drive = () => {
    const R = Game.scenario.race, foot = Game.player.pos.y + 0.3;
    const clear = (s, d) => { const c = racePos(R, s, d); return !collidesObstacles(c.x, c.z, 0.75, foot); };
    const sA = R.s + 3 + R.v * 1.3;
    let best = null;
    for (let d = -2.6; d <= 2.6; d += 0.1) {
      let ok = true;
      for (let q = R.s + 0.5; q <= sA; q += 0.5) if (!clear(q, d)) { ok = false; break; }
      if (ok && (best == null || Math.abs(d - R.d) < Math.abs(best - R.d))) best = d;
    }
    Game.keys.KeyA = best != null && best < R.d - 0.1; Game.keys.KeyD = best != null && best > R.d + 0.1;
    Game.keys.KeyS = best == null || Math.abs(best - R.d) > 0.9;
    Game.keys.KeyW = R.v < 1;
  };
};
await page.evaluate(DRIVE);
const ride = async (steer, secs) => {
  for (let c = 0; c < Math.ceil(secs / 2); c++) {
    const m = await page.evaluate((steer) => {
      for (let t = 0; t < 120 && Game.mode === 'scenario'; t++) { Game.player._graceT = 1e9; if (steer) __drive(); stepGame(1 / 60); }
      return Game.mode;
    }, steer);
    if (m !== 'scenario') break;
  }
  return page.evaluate(() => { const R = Game.scenario.race; return { mode: Game.mode, s: +R.s.toFixed(1), v: +R.v.toFixed(2),
    finish: R.finishT, finishS: +R.finishS.toFixed(1), crashes: R.crashes, top: +R.topV.toFixed(1), x: +Game.player.pos.x.toFixed(1),
    won: !!Game.persist.completed.bunratty_go_cart }; });
};

await g.scenario('bunratty_go_cart');
const start = await page.evaluate(() => {
  const R = Game.scenario.race, p = Game.player;
  let inScene = false; Game.scene.traverse(o => { if (o === R.mesh) inScene = true; });
  return { race: !!R, inScene, x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(2), end: +R.gY(R.xs[R.xs.length - 1], R.zs[R.zs.length - 1]).toFixed(2),
    lives: p.maxHits, crouched: p.crouching, bounds: p.bounds, v: R.v, mode: Game.mode };
});
console.log('   start: ' + JSON.stringify(start));
check('you start in the cart, in the match\'s scene, up the street past the entry, with three lives and no play box',
  start.race && start.inScene && start.x < -140 && start.lives >= 3 && start.bounds === null, start);
check('the bulb end is more than 12 m below the start', start.y - start.end > 12, [start.y, start.end]);
await g.spin(1);
check('you sit in it (crouched)', await page.evaluate(() => Game.player.crouching));

const run = await ride(true, 60);
console.log('   steered: ' + JSON.stringify(run));
check('steered round the lane\'s cars, nothing tagging you, the hill takes you to the bulb in under 45 s with no crash',
  run.finish != null && run.finish < 45 && run.crashes === 0 && run.s >= run.finishS, run);
check('and that is a win', run.mode === 'result' && run.won, run);
const card = () => page.evaluate(() => ({ outcome: document.getElementById('outcomeText').textContent, flavor: document.getElementById('flavorText').textContent }));
// v1.375 (Found in play, critic v1.372): the win read "The last one's out" with every kid still in
const winCard = await card();
check('the win card says you made it down, not that the last one is out (v1.375)', /MADE IT DOWN/.test(winCard.outcome) && /rolls to a stop in the bulb/.test(winCard.flavor) && !/last one/i.test(winCard.flavor), winCard);
check('top speed between 8 and 13 m/s', run.top >= 8 && run.top <= 13, run.top);

await page.evaluate(() => { Game.keys = {}; });
await g.scenario('bunratty_go_cart');
const loose = await ride(false, 50);
console.log('   unsteered: ' + JSON.stringify(loose));
check('a cart nobody steers is stopped by something on the lane before the bulb', loose.mode === 'scenario' && loose.crashes >= 1 && loose.v === 0 && loose.s < loose.finishS, loose);

await g.scenario('bunratty_go_cart');
await g.spin(60);
const kick = await page.evaluate(() => { const R = Game.scenario.race;
  // a spot on the dip's floor west of the entry with 3 m of clear lane ahead (the street's props move between layouts)
  const clear = (s, d) => { const c = racePos(R, s, d); return !collidesObstacles(c.x, c.z, 0.5, R.gY(c.x, c.z) + 0.3); };
  let at = null;
  for (let s = 86; s <= 94 && !at; s += 0.5) for (let d = -2.4; d <= 2.4 && !at; d += 0.4) { let ok = true; for (let q = s; q <= s + 3; q += 0.25) if (!clear(q, d)) ok = false; if (ok) at = [s, d]; }
  R.s = at[0]; R.d = at[1]; R.v = 0; Game.keys = { KeyW: true };
  for (let t = 0; t < 60; t++) stepGame(1 / 60); const v1 = R.v; Game.keys = { KeyS: true }; for (let t = 0; t < 90; t++) stepGame(1 / 60);
  Game.keys = {}; return [+v1.toFixed(2), +R.v.toFixed(2), at]; });
check('W kicks you along from rest on the flat (over 0.8 m/s in a second), S brakes you to a stop', kick[0] > 0.8 && kick[1] === 0, kick);

await g.scenario('bunratty_go_cart');
await g.spin(200);
const tags = await page.evaluate(() => {
  const p = Game.player, R = Game.scenario.race, hit = () => applyBBHit({ pos: p.pos.clone(), spawnPos: p.pos.clone() }, p);
  const v0 = R.v; hit(); const one = { hits: p.hitsTaken, mode: Game.mode, grace: p._graceT, v0: +v0.toFixed(2), v: +R.v.toFixed(2) };
  hit(); const inGrace = p.hitsTaken;
  for (let t = 0; t < 100; t++) stepGame(1 / 60);
  hit(); const two = { hits: p.hitsTaken, mode: Game.mode };
  for (let t = 0; t < 100; t++) stepGame(1 / 60);
  hit(); return { one, inGrace, two, three: { hits: p.hitsTaken, mode: Game.mode, won: !!Game.persist.completed.bunratty_go_cart } };
});
console.log('   tags: ' + JSON.stringify(tags));
check('a tag costs a life and you roll on, with 1.5 s in which nothing tags you', tags.one.hits === 1 && tags.one.mode === 'scenario' && tags.one.grace === 1.5 && tags.one.v === tags.one.v0 && tags.inGrace === 1, tags);
check('the third tag loses', tags.two.hits === 2 && tags.two.mode === 'scenario' && tags.three.hits === 3 && tags.three.mode !== 'scenario', tags);
const loseCard = await card();
check('the loss card says how far was left to go (v1.375)', /YOU'RE OUT/.test(loseCard.outcome) && /m still to go/.test(loseCard.flavor) && !/angles/.test(loseCard.flavor), loseCard);

check('it sits on Bunratty\'s ladder after Four on Four', await page.evaluate(() => {
  const ids = PIN_SCENARIO_GROUPS.bunratty_court; return ids[ids.indexOf('bunratty_go_cart') - 1] === 'bunratty_team_4v4'; }));
check('no page errors', errs.length === 0, errs);
await g.close();
