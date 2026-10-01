// v1.110 (Found in play, critic v1.101): fast BBs don't pass through thin walls. updateBBs tested obstacles only
// at each 1/200 s sub-step's end point, so a BB moving more than a wall's thickness per sub-step skipped it: the
// critic saw 18% of BBs through Bunratty's 18 cm planter wall at 45 m/s and 61% at 75. Fires BBs straight at that
// wall from 0.4-0.9 m in front of it at 30-150 m/s, with a random start so the sub-step phase varies, and counts
// the ones that end up behind it still able to tag. Then the same against a kid standing behind the wall.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_pincer');
const wall = await page.evaluate(() => {
  const o = Game.player.obstacles.find(o => !o.bbPass && obsOverlapsXZ(o, 28.9, 2, 0) && (o.baseY ?? 0) < 1.2 && (o.baseY ?? 0) + (o.h || 5) > 1.2);
  return o && { shape: o.shape || 'aabb', minX: o.minX, maxX: o.maxX, h: o.h, baseY: o.baseY ?? 0 };
});
check('found the planter wall at x ≈ 28.8–29.0', wall && wall.maxX - wall.minX < 0.3, wall);
const rows = await page.evaluate(({ x0, x1 }) => {
  for (const e of Game.scenario.enemies) { e.pos.x = -40; e.pos.z = -40; }   // nobody in the line
  const out = [];
  for (const v of [30, 45, 60, 75, 90, 120, 150]) {
    let through = 0, n = 200;
    for (let k = 0; k < n; k++) {
      Game.scenario.bbs.length = 0;
      const bb = makeBB(new THREE.Vector3(x0 - 0.4 - Math.random() * 0.5, 1.2, 1.5 + Math.random()), new THREE.Vector3(v, 0, 0), 'player');
      bb.curveStrength = 0;
      Game.scenario.bbs.push(bb);
      let past = false;
      for (let s = 0; s < 20 && Game.scenario.bbs.includes(bb); s++) { updateBBs(1 / 200); if (bb.pos.x > x1 && bb.canDamage) past = true; }
      if (past) through++;
    }
    Game.scenario.bbs.length = 0;
    out.push({ v, through: +(100 * through / n).toFixed(1) });
  }
  return out;
}, { x0: wall.minX, x1: wall.maxX });
for (const r of rows) console.log(`   ${r.v} m/s: ${r.through}% through the wall`);
for (const r of rows) check(`at ${r.v} m/s no BB passes through the 18 cm wall`, r.through === 0, r);

// the player standing right behind the wall is safe from a kid's fast shot at it; with the wall made BB-transparent
// (the control) the same shots do tag, so the check measures the wall and not a miss
const shotsAtPlayer = (pass) => page.evaluate(({ x0, x1, pass }) => {
  const wall = Game.player.obstacles.find(o => !o.bbPass && obsOverlapsXZ(o, 28.9, 2, 0));
  const p = Game.player;
  p.pos.x = x1 + 0.45; p.pos.z = 2; p.pos.y = scenarioGroundY(p.pos.x, p.pos.z);
  p.maxHits = 999; let hits = 0;
  if (pass) wall.bbPass = true;
  for (let k = 0; k < 100; k++) {
    p.hitsTaken = 0;
    Game.scenario.bbs.length = 0;
    const bb = makeBB(new THREE.Vector3(x0 - 0.4 - Math.random() * 0.5, p.pos.y + 1.0, 2), new THREE.Vector3(90, 0, 0), 'enemy', null, null, 'enemy');
    bb.curveStrength = 0;
    Game.scenario.bbs.push(bb);
    for (let s = 0; s < 20 && Game.scenario.bbs.includes(bb); s++) updateBBs(1 / 200);
    if (p.hitsTaken > 0) hits++;
  }
  if (pass) delete wall.bbPass;
  p.hitsTaken = 0; Game.scenario.bbs.length = 0;
  return { hits };
}, { x0: wall.minX, x1: wall.maxX, pass });
const ctl = await shotsAtPlayer(true), behind = await shotsAtPlayer(false);
check('control: with the wall out of the way, 90 m/s shots tag the player behind it', ctl.hits > 50, ctl);
check('with the wall there, the player behind it takes no hits from 100 BBs at 90 m/s', behind.hits === 0, behind);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
