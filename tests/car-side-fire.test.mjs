// v1.135 (Found in play, v1.126): cover-fire failed once at 5.3% when Sean or Mitchell, hiding at (18.7, 6.8) in
// Bunratty Hold the Fort, put 51 BBs within 1.6 m into the cabin box of the lane car at (20.9, 6.9). Not reproduced
// on v1.134 (8 rounds: 0 near shots). This holds the spot: a kid at four points beside that car fires at targets
// all round the east side (5–30 m out, below and above him, his yaw off the bearing by up to ±180°; since v1.183, ±0.55 rad), and every BB's
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
  // v1.219: the spots are set off the car's own west side (they were fixed at x 18.7–19.4; after the v1.216 fix-up the
  // car stood 0.45 m further west, at x 19.15–23.03, so two of them were inside it and every pull there held)
  const cz = car ? (car.minZ + car.maxZ) / 2 : 6.9, cx0 = car ? car.minX : 19.8;
  for (const [sx, sz] of [[cx0 - 1.1, cz - 0.1], [cx0 - 0.9, cz], [cx0 - 0.6, cz - 0.3], [cx0 - 0.4, cz + 0.3]]) {
    e.pos.x = sx; e.pos.z = sz; e.pos.y = scenarioGroundY(sx, sz);
    for (const R of [5, 9, 15, 30]) for (const up of [0.3, 1.0, 2.0]) for (let a = -80; a <= 80; a += 8) {
      const rad = a * Math.PI / 180, tx = sx + Math.cos(rad) * R, tz = sz + Math.sin(rad) * R;
      const tp = new THREE.Vector3(tx, scenarioGroundY(tx, tz) + up, tz);
      for (let i = 0; i < 6; i++) {
        // v1.183: a kid's body is within KID_FIRE_TURN of the line when he fires (he holds while turning), so his
        // facing is drawn from that band, not all round
        e.yaw = Math.atan2(tx - sx, tz - sz) + (Math.random() - 0.5) * 2 * 0.55;
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
  window.makeBB = mk; e.pendingBurst = [];   // v1.470: put back, as the round goes on under the next match's entry
  return { car: !!car, calls, held, bbs, near, intoCar, pctNear: +(near / Math.max(1, bbs) * 100).toFixed(2) };
});
console.log('  ' + JSON.stringify(r));
check('the lane car is parked at (21.1, 6.9)', r.car);
check('the kid fired', r.bbs > 1000, r.bbs);
check('under 0.5% of BBs hit anything within 1.6 m', r.pctNear < 0.5, r);
check('none of them into the car', r.intoCar === 0, r.intoCar);
check('he still shoots (under 25% of pulls held)', r.held / r.calls < 0.25, { calls: r.calls, held: r.held });

// v1.470 (Found in play, critic 10 Nov): Trey on Overwatch, Seth taken out, you standing on the street 45 m due east of
// Trey's step. His eye line clears the sedan parked 15 m in front of him, his muzzle's did not, and the clear line cast
// only its first 3 m: all 14 of his BBs in 40 s stopped in the car's cabin and none reached you. With an eye line the
// muzzle's line is now cast to 3 m short of you (15 cm under it too, for the BB's sag): he lifts over the car, or holds
// and moves to a spot where he can shoot.
// Seth is left out of the match's setup (as scripts/balance.mjs's duel_trey does), then the setup is put back.
await page.evaluate(() => { const S = SCENARIOS.winnmark_sniper_overwatch; window.__setup = S.enemySetup; S.enemySetup = S.enemySetup.filter(s => s.charId === 'trey'); });
await g.scenario('winnmark_sniper_overwatch');
await page.evaluate(() => { SCENARIOS.winnmark_sniper_overwatch.enemySetup = window.__setup; });
const t = await page.evaluate(() => {
  const sc = Game.scenario, trey = sc.enemies.find(k => k.charId === 'trey');
  const P = Game.player; P.pos.x = trey.pos.x + 45; P.pos.z = trey.pos.z; P.pos.y = scenarioGroundY(P.pos.x, P.pos.z);
  const at = { x: trey.pos.x, z: trey.pos.z }, mk = makeBB, hit = applyBBHit, shots = [];
  window.makeBB = function (pos, vel, owner, ref) { const b = mk.apply(this, arguments); if (ref === trey) shots.push({ b, p0: pos.clone(), last: pos.clone() }); return b; };
  let hits = 0;
  window.applyBBHit = function (bb, c) { if (c === P) { if (bb.enemyRef === trey) hits++; return; } return hit.apply(this, arguments); };
  for (let i = 0; i < 2400 && Game.mode === 'scenario'; i++) {
    stepGame(1 / 60);
    for (const s of shots) if (!s.done) { if (sc.bbs.includes(s.b)) s.last.copy(s.b.pos); else s.done = true; }
  }
  window.makeBB = mk; window.applyBBHit = hit;
  const short = shots.filter(s => Math.hypot(s.last.x - s.p0.x, s.last.z - s.p0.z) < 20).length;
  return { trey: [+at.x.toFixed(1), +at.z.toFixed(1)], now: [+trey.pos.x.toFixed(1), +trey.pos.z.toFixed(1)], shots: shots.length, short, hits };
});
console.log('    Trey on Overwatch, 45 m due east:', JSON.stringify(t));
check('Overwatch, 45 m due east of Trey: he fires at you', t.shots >= 4, t);
check('...and under a third of his BBs stop within 20 m of him (14 of 14 did, in the sedan 15 m out)', t.short / Math.max(1, t.shots) < 1 / 3, t);
check('...and his BBs reach you', t.hits >= 2, t);

// v1.473 (Found in play, critic 12 Nov): Two in the Yards, Jamie out, you standing at your start on the road. Devon's
// eye line and the clear line tested obstacles only, never the ground: from the back yards the lawn's crest hides you
// entirely, and all 146 of his BBs in 8 rounds stopped in the grass 35 m out. Sight lines and the far cast now test the
// ground too: at the start he holds (no line), and from a spot he can see he still shoots and hits.
const yards = [];
for (const spot of [null, [122, 20]]) {
  await g.scenario('winnmark_two_in_the_yards');
  yards.push(await page.evaluate((spot) => {
    const sc = Game.scenario, P = Game.player; P.maxHits = 999;
    const dev = sc.enemies.find(k => k.charId === 'devon'), jamie = sc.enemies.find(k => k.charId === 'jamie');
    jamie.health = 0; jamie.pos.x -= 500;
    const at = spot || [P.pos.x, P.pos.z], mk = makeBB, hit = applyBBHit, shots = [];
    window.makeBB = function (pos, vel, owner, ref) { const b = mk.apply(this, arguments); if (ref === dev) shots.push({ b, last: pos.clone() }); return b; };
    let hits = 0;
    window.applyBBHit = function (bb, c) { if (c === P) { if (bb.enemyRef === dev && !bb._t473) { bb._t473 = 1; hits++; } return; } return hit.apply(this, arguments); };
    for (let i = 0; i < 3600 && Game.mode === 'scenario'; i++) {
      P.pos.x = at[0]; P.pos.z = at[1]; P.pos.y = scenarioGroundY(at[0], at[1]);
      stepGame(1 / 60);
      for (const s of shots) if (!s.done) { if (sc.bbs.includes(s.b)) s.last.copy(s.b.pos); else s.done = true; }
    }
    window.makeBB = mk; window.applyBBHit = hit;
    // a BB that ended on the ground more than 4 m short of you
    const inGrass = shots.filter(s => s.done && !s.b._t473 && Math.hypot(s.last.x - at[0], s.last.z - at[1]) > 4 &&
      s.last.y - scenarioGroundY(s.last.x, s.last.z) < 0.3).length;
    return { at: at.map(v => +v.toFixed(1)), devon: [+dev.pos.x.toFixed(1), +dev.pos.z.toFixed(1)], shots: shots.length, hits, inGrass };
  }, spot));
}
console.log('    Two in the Yards, Devon:', JSON.stringify(yards));
check('Two in the Yards, at your start: none of Devon\'s BBs end in the grass short of you (146 of 146 did)', yards[0].inGrass === 0, yards[0]);
check('...in the open at (122, 20) he still shoots', yards[1].shots >= 4, yards[1]);
check('...and hits you', yards[1].hits >= 2, yards[1]);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
