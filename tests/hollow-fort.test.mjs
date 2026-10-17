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
    const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    for (const b of bands) if (c.x > b.minX + 0.05 && c.x < b.maxX - 0.05 && c.z > b.minZ + 0.05 && c.z < b.maxZ - 0.05 && c.y > b.baseY && c.y < b.baseY + 2.6) bad.push([+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)]);
  });
  return bad;
});
check('no post or pole stands inside a fort wall (the flag poles were in the back walls)', inWall.length === 0, inWall);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
