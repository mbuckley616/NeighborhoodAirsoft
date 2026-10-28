// v1.259 (backlog D.42, Michael 15 Oct: the Hollow's forts are ugly, with random intersecting meshes, and being inside
// is a disadvantage; a staircase or ramp inside up to the top, high ground and cover up there, like wooden
// crenellations). Each fort now has a deck over its front half at the walls' top, a ramp up the side wall to it and
// merlons round it. Checked in both forts: you walk up the ramp onto the deck and stand there 2.6 m up; the merlons
// and the rail keep you on it and the gaps between merlons are open to shoot through; under the deck you still walk
// in and out through the port; a kid (terrain feet) is stopped at the ramp's first step; nothing is left inside a wall.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('hollow_skirmish_3v3');
const forts = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player._graceT = 1e9;
  for (const e of Game.scenario.enemies) { e.noFire = true; e.pos.x += 200; }   // out of the way
  return Game.player.obstacles.filter(o => o.ramp).map(o => ({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ, ...o.ramp }));
});
check('two forts, a ramp in each', forts.length === 2, forts.length);
const walk = (yaw, frames, key = 'KeyW') => page.evaluate(([yaw, frames, key]) => {
  const p = Game.player; p.yaw = yaw; Game.mouse.locked = true; Game.keys[key] = true;
  let maxY = -1e9;
  for (let i = 0; i < frames; i++) { stepGame(1 / 60); maxY = Math.max(maxY, p.pos.y); }
  Game.keys[key] = false; for (let i = 0; i < 10; i++) stepGame(1 / 60);
  return { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), maxY: +maxY.toFixed(2), ground: +scenarioGroundY(p.pos.x, p.pos.z).toFixed(2), onGround: p.onGround };
}, [yaw, frames, key]);
for (const [i, R] of forts.entries()) {
  const facing = Math.sign(R.z1 - R.z0), cx = (R.minX + R.maxX) / 2, fortGy = R.y0 - 0.2, top = R.y1;
  const side = await page.evaluate(([cx]) => {   // which side of the fort the ramp is on: away from the fort's middle
    const deck = Game.player.obstacles.find(o => o.h === 0.15 && o.minX < cx + 4 && o.maxX > cx - 4 && Math.abs(o.baseY - 0) > 1);
    return deck ? Math.sign(cx - (deck.minX + deck.maxX) / 2) : 0;
  }, [cx]);
  // on the fort floor beside the ramp's step, then sideways onto the step and up the ramp
  const inX = cx - side * 1.0;
  await page.evaluate(([x, z]) => { const p = Game.player; p.pos.set(x, scenarioGroundY(x, z), z); p.vel.set(0, 0, 0); p.velY = 0; p.onGround = true; p._lastGroundY = p.pos.y; }, [inX, R.z0 + facing * 0.35]);
  const onStep = await walk(side > 0 ? -Math.PI / 2 : Math.PI / 2, 40);   // yaw −π/2 faces +x
  check(`fort ${i + 1}: from the floor you step sideways onto the ramp's foot`, Math.abs(onStep.y - R.y0) < 0.05 && Math.abs(onStep.x - cx) < 0.35, onStep);
  const upYaw = facing > 0 ? Math.PI : 0;   // yaw 0 faces −z
  const up = await walk(upYaw, 150);
  console.log(`   fort ${i + 1}: ramp x ${R.minX.toFixed(2)}–${R.maxX.toFixed(2)}, up → ${JSON.stringify(up)}`);
  check(`fort ${i + 1}: walking up the ramp takes you to the top, ${(top - fortGy).toFixed(1)} m up`, Math.abs(up.y - top) < 0.05, up);
  // step off the landing sideways onto the deck (away from the side wall)
  const onDeck = await walk(side > 0 ? Math.PI / 2 : -Math.PI / 2, 70);   // yaw π/2 faces −x
  check(`fort ${i + 1}: from the landing you step onto the deck and stand on it`, Math.abs(onDeck.y - top) < 0.05 && onDeck.onGround && Math.abs(onDeck.x - cx) > 0.8, onDeck);
  // toward the front: the merlons stop you at the wall
  const front = await walk(upYaw, 120);
  const frontZ = R.z1 + facing * 0.3;
  check(`fort ${i + 1}: walking at the front wall, the merlons keep you on the deck`, Math.abs(front.y - top) < 0.05 && (front.z - frontZ) * facing < -0.15, { front, frontZ });
  // back toward the inside: the rail keeps you on it
  const back = await walk(upYaw + Math.PI, 150);
  check(`fort ${i + 1}: walking to the deck's back edge, the rail keeps you up`, Math.abs(back.y - top) < 0.05, back);
  // a crenel is open: a BB from the deck out through a gap is not stopped within 2 m
  const gap = await page.evaluate(([facing, frontZ, top]) => {
    const ms = Game.player.obstacles.filter(o => o.noStand && o.h === 0.9 && Math.abs((o.minZ + o.maxZ) / 2 - frontZ) < 0.2).sort((a, b) => a.minX - b.minX);
    const gapX = (ms[1].maxX + ms[2].minX) / 2, at = new THREE.Vector3(gapX, top + 0.4, frontZ - facing * 0.6);
    const bb = makeBB(at.clone(), new THREE.Vector3(0, 0, facing * 60), 'player', null, null, 'player'); bb.curveStrength = 0;
    Game.scenario.bbs.push(bb); for (let i = 0; i < 3; i++) stepGame(1 / 60);
    return { merlons: ms.length, gapW: +(ms[2].minX - ms[1].maxX).toFixed(2), gone: !Game.scenario.bbs.includes(bb), z: +bb.pos.z.toFixed(2) };
  }, [facing, frontZ, top]);
  check(`fort ${i + 1}: ${gap.merlons} merlons on the front wall, and a BB goes out through a gap`, gap.merlons >= 6 && gap.gapW > 0.3 && (gap.z - frontZ) * facing > 1.5, gap);
  // a kid's body (terrain feet) is stopped at the ramp's first step
  const kid = await page.evaluate(([x, z]) => collidesObstacles(x, z, 0.33), [cx, R.z0 + facing * 0.4]);
  check(`fort ${i + 1}: a kid can't walk onto the ramp`, kid === true);
}
// under the deck: walk from the back of fort 1 out through the port
const R = forts[0], facing = Math.sign(R.z1 - R.z0);
const out = await page.evaluate(([R, facing]) => {
  const p = Game.player, cx = (R.minX + R.maxX) / 2;
  // the fort's middle is 2.6 m from the ramp strip's centre, toward the inside
  const deck = p.obstacles.find(o => o.h === 0.15 && o.baseY > R.y0 + 1 && o.minZ <= Math.max(R.z0, R.z1) && o.maxZ >= Math.min(R.z0, R.z1) && o.minX < R.maxX + 6 && o.maxX > R.minX - 6);
  const mx = (deck.minX + deck.maxX) / 2 + (cx < (deck.minX + deck.maxX) / 2 ? 0.5 : -0.5);
  p.pos.set(mx, R.y0 - 0.2, R.z0 + facing * 0.6); p.velY = 0; p.onGround = true; p._lastGroundY = p.pos.y; p.yaw = facing > 0 ? Math.PI : 0;
  Game.keys.KeyW = true; let maxY = -9;
  for (let i = 0; i < 180; i++) { stepGame(1 / 60); maxY = Math.max(maxY, p.pos.y - scenarioGroundY(p.pos.x, p.pos.z)); }
  Game.keys.KeyW = false;
  return { z: +p.pos.z.toFixed(2), frontZ: +(R.z1 + facing * 0.3).toFixed(2), maxLift: +maxY.toFixed(2) };
}, [R, facing]);
check('under the deck you walk through the fort and out of the port, on the ground', (out.z - out.frontZ) * facing > 1 && out.maxLift < 0.1, out);
// nothing left inside a wall: no fort mesh's middle lies inside a wall's lower band (the old lookout posts and the lean-to did)
const inWall = await page.evaluate(() => {
  const bands = Game.player.obstacles.filter(o => o.h === 0.75 && o.surface === 'hard' && (o.maxX - o.minX < 0.5 || o.maxZ - o.minZ < 0.5));
  const bad = [];
  Game.scene.traverse(m => {
    if (!m.isMesh || m.geometry.type !== 'CylinderGeometry') return;
    // v1.264 fix-up: not your own first-person gun, which hangs off the camera in the scene: where the camera stood when
    // the page last rendered is up to the frame timing, and on the deck by the merlons its barrel read as a pole in a wall
    for (let p = m.parent; p; p = p.parent) if (p === Game.camera) return;
    const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    for (const b of bands) if (c.x > b.minX + 0.05 && c.x < b.maxX - 0.05 && c.z > b.minZ + 0.05 && c.z < b.maxZ - 0.05 && c.y > b.baseY && c.y < b.baseY + 2.6) bad.push([+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)]);
  });
  return bad;
});
check('no post or pole stands inside a fort wall (the flag poles were in the back walls)', inWall.length === 0, inWall);
check('v1.345: the 3v3\'s south fort has no blast wall and its 0.75 m sill', await page.evaluate(() =>
  !Game.player.obstacles.some(o => o.blastWall) && Game.player.obstacles.filter(o => o.h === 0.75 && o.minZ > 26 && o.maxZ < 34).length >= 5));
// v1.319 (backlog B.13, Michael 22 Oct: Hold the South Fort is very hard; "move the enemy spawn point to the opposite
// base, so that shooting an enemy has a greater effect / longer cooldown"). The five still open from their huddle by the
// east redoubt; tagged, they walk back to the north fort and come again from there. 90 s with you untaggable in the
// fort, crouched; an attacker who has spent 2 s within 22 m of you is tagged, as you would tag him. Before: back
// within 25 m 17.5-19.1 s after a tag, 67-70 attacker-seconds within 25 m, 15-16 tags.
await g.scenario('hollow_defend_south_fort');
const hold = await page.evaluate(() => {
  const orig = applyBBHit; let hits = 0;
  applyBBHit = (bb, t) => { if (t === Game.player) { hits++; return true; } return orig(bb, t); };
  const p = Game.player; Game.mouse.locked = true; p.crouching = true;
  const E = Game.scenario.enemies, nf = Game.scenario.placements ? Game.scenario.placements.cluster_north : null;
  const homes = E.map(e => ({ id: e.charId, start: [+e.pos.x.toFixed(1), +e.pos.z.toFixed(1)], back: e._respawnPos ? [+e._respawnPos.x.toFixed(1), +e._respawnPos.z.toFixed(1)] : null }));
  const inT = {}, tagAt = {}, backs = []; let near = 0, firstNear = null, tags = 0;
  for (let i = 0; i < 60 * 90 && Game.mode === 'scenario'; i++) {
    stepGame(1 / 60);
    for (const e of E) {
      if (e.health <= 0 || e.state === 'retreating') { inT[e.charId] = 0; continue; }
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (d < 25) {
        near += 1 / 60; if (firstNear == null) firstNear = +(i / 60).toFixed(1);
        if (tagAt[e.charId] != null) { backs.push(+(i / 60 - tagAt[e.charId]).toFixed(1)); tagAt[e.charId] = null; }
      }
      inT[e.charId] = d < 22 ? (inT[e.charId] || 0) + 1 / 60 : 0;
      if (inT[e.charId] > 2) { inT[e.charId] = 0; eliminateEnemy(e); tags++; tagAt[e.charId] = i / 60; }
    }
  }
  applyBBHit = orig;
  return { homes, hits, tags, firstNear, near: Math.round(near), backs, backAvg: backs.length ? +(backs.reduce((a, b) => a + b, 0) / backs.length).toFixed(1) : null, you: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)] };
});
console.log('  south fort', JSON.stringify(hold));
check('Hold the South Fort: the five open from the east redoubt (z under 5) and go back to the north fort (z under -28)',
  hold.homes.length === 5 && hold.homes.every(h => h.start[1] < 5 && h.back && h.back[1] < -28 && Math.abs(h.back[0]) < 5), hold.homes);
check('the first of them still reaches 25 m of the fort inside 15 s', hold.firstNear != null && hold.firstNear < 15, hold.firstNear);
check('a tagged attacker takes 24 s or more on average to come back within 25 m (was 17.5-19.1)', hold.backs.length >= 3 && hold.backAvg >= 24, hold.backs);
check('and they keep coming: 5 or more tags in 90 s', hold.tags >= 5, hold.tags);
// v1.345 (backlog B.17, Michael: A on "Hold the South Fort is still lost before the first tag", 26 Oct: "a taller wall
// and better crenellations"). Every BB that tagged you on the floor came in by the open port (Devon from 37 m, Seth and
// Sean from 20 m), or over the 0.75 m sill of a window at a crouched head. In this match the south fort has a blast wall
// 1.6 m out from the port, a 1.15 m solid wall under its windows and 1.25 m merlons; the 3v3's fort is as it was (above).
await g.scenario('hollow_defend_south_fort');
const walls = await page.evaluate(() => {
  const O = Game.player.obstacles, bw = O.filter(o => o.blastWall), gy = scenarioGroundY(2, 33);
  return { bw: bw.map(o => ({ minX: +o.minX.toFixed(2), maxX: +o.maxX.toFixed(2), z: +((o.minZ + o.maxZ) / 2).toFixed(2), h: o.h })),
    sills: O.filter(o => o.h === 1.15 && o.minZ > 26 && o.maxZ < 34).length,
    merlons: O.filter(o => o.noStand && o.h === 1.25 && o.minZ > 26 && o.maxZ < 34).length, gy };
});
check('the south fort has a blast wall before its port (x 0.6–3.4, wall z 27), as tall as the fort, and 1.15 m sills',
  walls.bw.length === 1 && walls.bw[0].minX < 0.4 && walls.bw[0].maxX > 3.6 && walls.bw[0].z > 25 && walls.bw[0].z < 26 && walls.bw[0].h >= 2.5 && walls.sills >= 5 && walls.merlons >= 10, walls);
// standing at the front-right window you still shoot out, past the blast wall's end
const out2 = await page.evaluate(() => {
  const p = Game.player, gy = scenarioGroundY(2, 33), res = [];
  for (const [x, tx] of [[4.45, 4.45], [4.45, 9.25], [-0.45, -0.45], [-0.45, -5.25]]) {   // the windows: x 4.0–4.9, −0.9–0
    const at = new THREE.Vector3(x, gy + 1.35, 27.6), v = new THREE.Vector3(tx - x, 0, -12).normalize().multiplyScalar(60);
    const bb = makeBB(at, v, 'player', null, null, 'player'); bb.curveStrength = 0; Game.scenario.bbs.push(bb);
    for (let i = 0; i < 4; i++) stepGame(1 / 60);
    res.push({ gone: !Game.scenario.bbs.includes(bb), z: +bb.pos.z.toFixed(2) });
  }
  return res;
});
check('standing at a front window (eye 1.35 m) your BBs go out, north and out to the side', out2.every(r => r.z < 25), out2);
// from the floor you walk out of the port and round the blast wall's end into the field
const round = await page.evaluate(() => {
  const p = Game.player; Game.mouse.locked = true; p.crouching = false;
  const go = (yaw, n) => { p.yaw = yaw; Game.keys.KeyW = true; for (let i = 0; i < n; i++) stepGame(1 / 60); Game.keys.KeyW = false; };
  const gy = scenarioGroundY(2, 30); p.pos.set(2, gy, 28.6); p.vel.set(0, 0, 0); p.velY = 0; p.onGround = true;
  go(0, 30); const atWall = +p.pos.z.toFixed(2);   // north, up to the blast wall
  go(-Math.PI / 2, 80);                             // east along it
  go(0, 120);                                       // north again, past its end
  return { atWall, x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) };
});
check('out of the port you meet the blast wall, walk along it and out round its end', round.atWall > 25.6 && round.z < 22, round);
// 30 s at your start, untaggable, crouched and then standing: how many BBs reach you. On main before v1.345, crouched,
// the first came by the port at 8.5-14.8 s (Devon's at 8.5); with the blast wall alone 36-41 came over the 0.75 m sill;
// with the 1.15 m sill too, 2-3, the first at 17-22 s.
for (const crouch of [true, false]) {
  await g.scenario('hollow_defend_south_fort');
  const r = await page.evaluate(([crouch]) => {
    const p = Game.player; Game.mouse.locked = true; p.crouching = crouch;
    const orig = applyBBHit; let n = 0, first = null, t = 0; const by = {};
    applyBBHit = (bb, c) => { if (c === Game.player) { n++; if (first == null) first = +t.toFixed(1); const w = bb.enemyRef ? bb.enemyRef.charId : '?'; by[w] = (by[w] || 0) + 1; return true; } return orig(bb, c); };
    for (let i = 0; i < 60 * 30 && Game.mode === 'scenario'; i++) { stepGame(1 / 60); t += 1 / 60; }
    applyBBHit = orig;
    return { n, first, by };
  }, [crouch]);
  console.log(`  ${crouch ? 'crouched' : 'standing'} at the start, 30 s:`, JSON.stringify(r));
  if (crouch) check('crouched at your start, 10 or fewer BBs reach you in 30 s, none in the first 10 s', r.n <= 10 && (r.first == null || r.first >= 10), r);
}
// v1.367 (Found in play, critic v1.353): Devon (sniper) stood 6.5-7.5 s at the blast wall's east end and in its gap, his
// pulls held at the wall 2-3 s apart (the bolt cycle) until the move-on after three. Crouched at your start, untaggable,
// 40 s a round: he never stands still there longer than 4 s (before: 6.5-7.3 s in 4 of 5 rounds; after: 0-3 s in 8).
const stalls = [];
for (let r = 0; r < 3; r++) {
  await g.scenario('hollow_defend_south_fort');
  stalls.push(await page.evaluate(() => {
    const p = Game.player; p.maxHits = 999; p.crouching = true;
    const d = Game.scenario.enemies.find(e => e.charId === 'devon'), bw = p.obstacles.find(o => o.blastWall);
    let still = 0, worst = 0, at = null; const last = d.pos.clone();
    for (let i = 1; i <= 60 * 40 && Game.mode === 'scenario'; i++) {
      p._graceT = 1e9; p.crouching = true; stepGame(1 / 60);
      if (i % 15) continue;
      const mv = Math.hypot(d.pos.x - last.x, d.pos.z - last.z); last.copy(d.pos);
      const near = d.pos.x > bw.minX - 1.2 && d.pos.x < bw.maxX + 1.2 && d.pos.z > bw.minZ - 0.6 && d.pos.z < bw.maxZ + 1.6;
      if (mv < 0.05 && near && !d.out) { still += 0.25; if (still > worst) { worst = still; at = [+d.pos.x.toFixed(2), +d.pos.z.toFixed(2), d.state]; } }
      else still = 0;
    }
    return { worst, at };
  }));
}
console.log('  Devon standing still by the blast wall, 3 rounds:', JSON.stringify(stalls));
check('Devon never stands still by the blast wall for more than 4 s', stalls.every(s => s.worst <= 4), stalls);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
