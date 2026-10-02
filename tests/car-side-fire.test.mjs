// v1.135 (Found in play, v1.126): cover-fire failed once at 5.3% when Sean or Mitchell, hiding at (18.7, 6.8) in
// Bunratty Hold the Fort, put 51 BBs within 1.6 m into the cabin box of the lane car at (20.9, 6.9). Not reproduced
// on v1.134 (8 rounds: 0 near shots). This holds the spot: a kid at four points beside that car fires at targets
// all round the east side (5–30 m out, below and above him, his yaw off the bearing by up to ±180°), and every BB's
// first 1.6 m is cast against the map. The v1.93 clear line, with its v1.101 margin, should lift over the cabin or hold.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_hold_the_fort');
const r = await page.evaluate(() => {
  Game.scenario.roundTime = 10;                      // past the opening hold
  const e = Game.scenario.enemies.find(k => k.name === 'Sean') || Game.scenario.enemies[0];
  const solid = Game.player.obstacles.filter(o => !o.bbPass);
  const car = solid.find(o => o.minX != null && o.minX < 21.1 && o.maxX > 21.1 && o.minZ < 6.9 && o.maxZ > 6.9 && o.h > 0.5);
  const mk = makeBB, made = [];
  window.makeBB = function (pos, vel, owner, ref) { if (ref === e) made.push({ p: pos.clone(), v: vel.clone() }); return mk.apply(this, arguments); };
  let calls = 0, held = 0, bbs = 0, near = 0, intoCar = 0;
  for (const [sx, sz] of [[18.7, 6.8], [18.9, 6.9], [19.2, 6.6], [19.4, 7.2]]) {
    e.pos.x = sx; e.pos.z = sz; e.pos.y = scenarioGroundY(sx, sz);
    for (const R of [5, 9, 15, 30]) for (const up of [0.3, 1.0, 2.0]) for (let a = -80; a <= 80; a += 8) {
      const rad = a * Math.PI / 180, tx = sx + Math.cos(rad) * R, tz = sz + Math.sin(rad) * R;
      const tp = new THREE.Vector3(tx, scenarioGroundY(tx, tz) + up, tz);
      for (let i = 0; i < 6; i++) {
        e.yaw = Math.atan2(-(tx - sx), -(tz - sz)) + (Math.random() - 0.5) * 2 * Math.PI;
        e.pendingBurst = null; e._firingOverCover = 0; made.length = 0; calls++;
        spawnEnemyBB(e, tp);
        if (!made.length) { held++; continue; }
        for (const m of made) {
          const d = m.v.clone().normalize(); bbs++;
          if (raycastObstacles(m.p.x, m.p.y, m.p.z, d.x, d.y, d.z, 1.6, solid) < 1.6) {
            near++;
            if (car && obsRayDist(car, m.p.x, m.p.y, m.p.z, d.x, d.y, d.z, 1.6) >= 0) intoCar++;
          }
        }
      }
      for (const b of Game.scenario.bbs) if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
      Game.scenario.bbs.length = 0;
    }
  }
  window.makeBB = mk;
  return { car: !!car, calls, held, bbs, near, intoCar, pctNear: +(near / Math.max(1, bbs) * 100).toFixed(2) };
});
console.log('  ' + JSON.stringify(r));
check('the lane car is parked at (21.1, 6.9)', r.car);
check('the kid fired', r.bbs > 1000, r.bbs);
check('under 0.5% of BBs hit anything within 1.6 m', r.pctNear < 0.5, r);
check('none of them into the car', r.intoCar === 0, r.intoCar);
check('he still shoots (under 25% of pulls held)', r.held / r.calls < 0.25, { calls: r.calls, held: r.held });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
