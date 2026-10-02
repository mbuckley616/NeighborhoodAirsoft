// v1.143 (backlog D.7, Michael: A): kids climb ladders. In King of the Treehouse, with the player up on the platform,
// Haden walks out of his fort (closed on the east side) to the ladder, climbs it, steps onto the floor and fights from
// there; once the player has left the platform he climbs back down. Connor, placed on the platform, never leaves it.
// A kid tagged on the ladder drops to the grass; `climb: false` keeps a kid on the ground. Time through stepGame.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

const climbRound = () => page.evaluate(() => {
  let hits = 0; applyBBHit = () => { hits++; };
  const p = Game.player; Game.mouse.locked = true;
  p.pos.set(0.6, 2.6, -6.6); p.onGround = true; p._lastGroundY = 2.6; p.yaw = Math.PI;
  const h = Game.scenario.enemies.find(e => !e.perch), c = Game.scenario.enemies.find(e => e.perch);
  const L = Game.scenario.ladders[0], P = Game.scenario.perches.treehouse;
  let upAt = -1, shotsUp = 0, maxFoot = 0, offPlat = 0, cOff = 0, onLadderY = [], stand = 0, maxStand = 0, lastX = h.pos.x, lastZ = h.pos.z, lastY = h.pos.y;
  const seen = new Set();
  for (let i = 0; i < 60 * 25; i++) {
    stepGame(1 / 60);
    if (upAt < 0 && h._climbed) upAt = i / 60;
    if (h._lad && h._lad.phase === 'up') onLadderY.push(h.mesh.group.position.y);
    if (h._climbed && (h.pos.y !== P.y || h.pos.x < P.minX - 1e-6 || h.pos.x > P.maxX + 1e-6 || h.pos.z < P.minZ - 1e-6 || h.pos.z > P.maxZ + 1e-6)) offPlat++;
    if (c.pos.y !== P.y) cOff++;
    for (const b of Game.scenario.bbs) if (b.enemyRef === h && !seen.has(b)) { seen.add(b); if (h._climbed) shotsUp++; }
    // before he is up: the longest he stands still on the walk (not waiting at the foot)
    if (upAt < 0) { const m = Math.hypot(h.pos.x - lastX, h.pos.z - lastZ) + Math.abs(h.pos.y - lastY); stand = m < 0.005 ? stand + 1 / 60 : 0; maxStand = Math.max(maxStand, stand); }
    lastX = h.pos.x; lastZ = h.pos.z; lastY = h.pos.y;
  }
  const upEnd = { climbed: !!h._climbed, y: h.pos.y, state: h.state };
  // the player drops to the grass at the far side of the yard
  p.pos.set(-12, 0, 12); p._lastGroundY = 0; p.onGround = true;
  let downAt = -1, cOff2 = 0;
  for (let i = 0; i < 60 * 10; i++) { stepGame(1 / 60); if (downAt < 0 && !h._climbed && !h._lad && h.pos.y < 0.01) downAt = i / 60; if (c.pos.y !== P.y) cOff2++; }
  const ly = onLadderY.length ? { min: +Math.min(...onLadderY).toFixed(2), max: +Math.max(...onLadderY).toFixed(2), n: onLadderY.length } : null;
  return { upAt, shotsUp, offPlat, cOff, cOff2, ly, maxStand: +maxStand.toFixed(2), upEnd, downAt, endState: h.state, mode: Game.mode };
});

const rounds = [];
for (let r = 0; r < 3; r++) { await g.scenario('stoneglen_treehouse'); rounds.push(await climbRound()); }
for (const [i, r] of rounds.entries()) console.log('  round', i, JSON.stringify(r));
check('with the player on the platform, Haden climbs up in under 15 s, every round', rounds.every(r => r.upAt > 0 && r.upAt < 15), rounds.map(r => r.upAt));
check('on the way he never stands still for 1.5 s (out of the fort, round to the ladder)', rounds.every(r => r.maxStand < 1.5), rounds.map(r => r.maxStand));
check('on the ladder his body rises from the grass to the floor (0 → 2.6 m)', rounds.every(r => r.ly && r.ly.min < 0.2 && r.ly.max > 2.3 && r.ly.max <= 2.6), rounds.map(r => r.ly));
check('up there his feet stay on the floor inside the rail (0 steps off)', rounds.every(r => r.offPlat === 0 && r.upEnd.climbed && r.upEnd.y === 2.6), rounds.map(r => [r.offPlat, r.upEnd]));
check('he fires from the platform', rounds.every(r => r.shotsUp > 0), rounds.map(r => r.shotsUp));
check('once the player is down, Haden climbs down inside 6 s', rounds.every(r => r.downAt > 0 && r.downAt < 6), rounds.map(r => r.downAt));
check('Connor (placed up there) never leaves the platform, player up or down', rounds.every(r => r.cOff === 0 && r.cOff2 === 0), rounds.map(r => [r.cOff, r.cOff2]));

// from other corners of the yard: behind the shed, the back fence, the patio, and north of the oak
const starts = [[11, -8.4], [-4, -13], [8, 12], [2, -11.5], [-15, 10]];
const fromAt = [];
for (const [sx, sz] of starts) {
  await g.scenario('stoneglen_treehouse');
  fromAt.push(await page.evaluate(([sx, sz]) => {
    applyBBHit = () => {};
    const p = Game.player; Game.mouse.locked = true;
    p.pos.set(0.6, 2.6, -6.6); p.onGround = true; p._lastGroundY = 2.6;
    const h = Game.scenario.enemies.find(e => !e.perch); h.pos.x = sx; h.pos.z = sz; h.state = 'advancing'; h.stateTime = 0;
    for (let i = 0; i < 60 * 20; i++) { stepGame(1 / 60); if (h._climbed) return { from: [sx, sz], upAt: +(i / 60).toFixed(1) }; }
    return { from: [sx, sz], upAt: -1, at: [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)], lad: h._lad && h._lad.phase };
  }, [sx, sz]));
}
check('from five corners of the yard he reaches the platform inside 15 s', fromAt.every(r => r.upAt > 0 && r.upAt < 15), fromAt);

// the player on the ladder counts as up; at the gate, nobody heads for the ladder
await g.scenario('stoneglen_treehouse');
const onLad = await page.evaluate(() => {
  applyBBHit = () => {};
  const h = Game.scenario.enemies.find(e => !e.perch), L = Game.scenario.ladders[0];
  let headed = 0;
  for (let i = 0; i < 600; i++) { stepGame(1 / 60); if (h._lad) headed++; }   // player at the side gate, 10 s
  const p = Game.player; p.climbing = L; p.pos.set(L.x, 1.2, L.z); p.onGround = false;
  Game.mouse.locked = true; Game.keys['KeyW'] = false; Game.keys['KeyS'] = false;
  stepGame(1 / 60);
  const goes = !!h._lad;
  return { headed, goes };
});
check('with the player at the side gate, Haden never heads for the ladder (10 s)', onLad.headed === 0, onLad);
check('with the player on the ladder, Haden heads for it', onLad.goes, onLad);

// tagged on the ladder: he drops to the grass, and (out for good in a skirmish) stays there
await g.scenario('stoneglen_treehouse');
const drop = await page.evaluate(() => {
  applyBBHit = () => {};
  const p = Game.player; Game.mouse.locked = true;
  p.pos.set(0.6, 2.6, -6.6); p.onGround = true; p._lastGroundY = 2.6;
  const h = Game.scenario.enemies.find(e => !e.perch);
  let i = 0;
  for (; i < 60 * 20; i++) { stepGame(1 / 60); if (h._lad && h._lad.phase === 'up' && h._lad.y > 1.5) break; }
  const at = +h.mesh.group.position.y.toFixed(2);
  h.health = 0; eliminateEnemy(h);
  let ys = [];
  for (let j = 0; j < 90; j++) { stepGame(1 / 60); ys.push(h.mesh.group.position.y); }
  return { at, endY: +ys[ys.length - 1].toFixed(3), monotone: ys.every((y, k) => k === 0 || y <= ys[k - 1] + 1e-6), lad: !!h._lad, perch: !!h.perch, x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2) };
});
check('a kid tagged 1.5 m up the ladder drops to the grass and stays there', drop.at > 1.5 && drop.endY === 0 && drop.monotone && !drop.lad && !drop.perch, drop);

// climb: false keeps a kid on the ground
await g.scenario('stoneglen_treehouse');
const stay = await page.evaluate(() => {
  applyBBHit = () => {};
  const p = Game.player; Game.mouse.locked = true;
  p.pos.set(0.6, 2.6, -6.6); p.onGround = true; p._lastGroundY = 2.6;
  const h = Game.scenario.enemies.find(e => !e.perch); h.noClimb = true;
  let maxY = 0, lad = 0;
  for (let i = 0; i < 60 * 15; i++) { stepGame(1 / 60); maxY = Math.max(maxY, h.pos.y); if (h._lad) lad++; }
  return { maxY, lad };
});
check('a kid set climb: false never climbs (15 s, player up top)', stay.maxY === 0 && stay.lad === 0, stay);

// no other map has ladders: the field is never built and nothing changes there
await g.scenario('winnmark_two_in_the_yards');
const other = await page.evaluate(() => { for (let i = 0; i < 120; i++) stepGame(1 / 60); return { ladders: Game.scenario.ladders, anyLad: Game.scenario.enemies.some(e => e._lad || e._climbed) }; });
check('Winnmark has no ladders and no kid ever takes one', !other.ladders && !other.anyLad, other);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
