// v1.138 (backlog D.7, Michael: A): the Stoneglen Close treehouse. A platform 2.6 m up in an oak, a ladder you climb
// with W (looking at it) and climb down with S, a drop of 1.5 m or more empties your stamina, and a kid holds the
// platform. Keys through Game.keys and a real Space keydown, time through stepGame.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

await g.scenario('stoneglen_treehouse');
await page.evaluate(() => { Game.player.invuln = true; applyBBHit = () => {}; });   // nothing ends the round while we climb

const map = await page.evaluate(() => {
  const L = Game.scenario.ladders || [], kids = Game.scenario.enemies.map(e => ({ id: e.charId || e.id, y: +e.pos.y.toFixed(2), gy: +e.mesh.group.position.y.toFixed(2), perch: !!e.perch, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2) }));
  return { ladders: L.length, top: L[0] && L[0].top, kids, player: { x: +Game.player.pos.x.toFixed(2), y: +Game.player.pos.y.toFixed(2), z: +Game.player.pos.z.toFixed(2) } };
});
check('the yard has one ladder, to a platform 2.6 m up', map.ladders === 1 && map.top === 2.6, map);
const connor = map.kids.find(k => k.perch), haden = map.kids.find(k => !k.perch);
check('Connor starts up on the platform (feet and body at 2.6 m)', connor && connor.y === 2.6 && connor.gy === 2.6 && Math.abs(connor.x) < 1.3 && connor.z < -4.5 && connor.z > -7.5, connor);
check('Haden starts on the ground', haden && haden.y === 0, haden);

// --- Connor holds the platform for 20 s and fires from up there ---
// (v1.185: the player starts behind the shed, out of his sight, so he is put at the old side gate for this)
const hold = await page.evaluate(() => {
  const c = Game.scenario.enemies.find(e => e.perch), P = c.perch;
  Game.player.pos.x = -13; Game.player.pos.z = 14.4;
  let off = 0, minY = 99, maxY = -99, shots = 0, shotY = [], seen = new Set();
  for (let i = 0; i < 1200; i++) {
    stepGame(1 / 60);
    if (c.pos.x < P.minX - 1e-6 || c.pos.x > P.maxX + 1e-6 || c.pos.z < P.minZ - 1e-6 || c.pos.z > P.maxZ + 1e-6) off++;
    minY = Math.min(minY, c.pos.y); maxY = Math.max(maxY, c.pos.y);
    for (const b of Game.scenario.bbs) if (b.enemyRef === c && !seen.has(b)) { seen.add(b); shots++; if (shotY.length < 400) shotY.push(b.pos.y); }
  }
  return { off, minY, maxY, shots, minShotY: shotY.length ? +Math.min(...shotY).toFixed(2) : null, state: c.state, mode: Game.mode };
});
check('over 20 s Connor never leaves the platform (0 steps off its floor, feet at 2.6)', hold.off === 0 && hold.minY === 2.6 && hold.maxY === 2.6, hold);
check('he fires at the player at the side gate, from up there (every BB starts above 3 m)', hold.shots > 0 && hold.minShotY > 3, hold);

// a fresh round, the player at the gate: Haden comes for him or shoots (v1.138: as a fort defender he did neither in 60 s)
await g.scenario('stoneglen_treehouse');
const haden60 = await page.evaluate(() => {
  applyBBHit = () => {};
  const h = Game.scenario.enemies.find(e => !e.perch), o = spawnEnemyBB; let fired = 0, walked = 0;
  spawnEnemyBB = (e, t) => { if (e === h) fired++; return o(e, t); };
  for (let i = 0; i < 3600; i++) { const px = h.pos.x, pz = h.pos.z; stepGame(1 / 60); const m = Math.hypot(h.pos.x - px, h.pos.z - pz); if (m < 1.5) walked += m; }
  spawnEnemyBB = o;
  return { fired, walked: +walked.toFixed(1), at: [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)], state: h.state };
});
check('in 60 s Haden walks over 5 m and fires', haden60.walked > 5 && haden60.fired > 0, haden60);

// helpers: place the player, hold keys for n steps
const run = (o) => page.evaluate((o) => {
  const p = Game.player; Game.mouse.locked = true;
  if (o.at) { p.pos.x = o.at[0]; p.pos.y = o.at[1]; p.pos.z = o.at[2]; p.velY = 0; p.onGround = true; p.climbing = null; p.stamina = p.staminaMax; p.exhausted = false; p._dropPenalties = 0; p._lastGroundY = o.at[1]; }
  if (o.yaw != null) { p.yaw = o.yaw; p.pitch = 0; }
  Game.keys = Game.keys || {};
  let maxY = -99, minY = 99, climbed = 0, upAt = -1;
  for (let i = 0; i < o.n; i++) {
    Game.keys['KeyW'] = !!o.w; Game.keys['KeyS'] = !!o.s;
    if (i === o.spaceAt) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    stepGame(1 / 60);
    maxY = Math.max(maxY, p.pos.y); minY = Math.min(minY, p.pos.y);
    if (p.climbing) climbed++;
    if (upAt < 0 && o.untilY != null && p.pos.y >= o.untilY) { upAt = i; if (o.stopAtY) break; }
    if (o.stopWhenClimbing && p.climbing && p.pos.y >= o.stopWhenClimbing) break;
  }
  Game.keys['KeyW'] = false; Game.keys['KeyS'] = false;
  return { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(3), z: +p.pos.z.toFixed(2), onGround: p.onGround, climbing: !!p.climbing, maxY: +maxY.toFixed(2), minY: +minY.toFixed(2),
    climbed, upAt, stamina: +p.stamina.toFixed(2), staminaMax: p.staminaMax, exhausted: p.exhausted, penalties: p._dropPenalties || 0 };
}, o);

// --- climbing up ---
const up = await run({ at: [0, 0, -2.6], yaw: 0, w: true, n: 240, untilY: 2.6 });
check('holding W at the foot, looking at the ladder, he climbs onto the platform', up.onGround && up.y === 2.6 && up.z < -4.4 && up.z > -7.6 && !up.climbing, up);
check('the climb takes about 1.5 s from the foot (under 2.5 s from 2.6 m away)', up.upAt > 0 && up.upAt < 150, up);
const stay = await run({ n: 120 });
check('standing up there, he stays up', stay.onGround && stay.y === 2.6, stay);
const back = await run({ at: [0, 0, -2.6], yaw: Math.PI, s: true, n: 120 });
check('backing into the ladder with S from the ground does not climb it', back.maxY < 0.01 && back.climbed === 0, back);
const facingAway = await run({ at: [0, 0, -3.8], yaw: Math.PI, w: true, n: 60 });
check('walking into it with W, looking away, does not climb it either', facingAway.maxY < 0.01 && facingAway.climbed === 0, facingAway);

// --- the rail holds him on the platform ---
const rail = await run({ at: [0.8, 2.6, -6], yaw: Math.PI / 2, w: true, n: 120 });
check('walking into the west rail stops him on the floor', rail.onGround && rail.y === 2.6 && rail.x > -1.45, rail);

// --- climbing down ---
const down = await run({ at: [0, 2.6, -5.2], yaw: 0, s: true, n: 240 });
check('backing into the gap with S takes the ladder down to the grass', down.onGround && down.y === 0 && down.climbed > 30, down);
check('the ladder down costs no stamina', down.penalties === 0 && !down.exhausted && down.stamina > down.staminaMax - 0.1, down);

// --- the drop ---
const jump = await run({ at: [0, 2.6, -5.2], yaw: Math.PI, w: true, n: 120 });
check('walking off through the gap, looking out, drops him to the grass', jump.onGround && jump.y === 0 && jump.climbed === 0, jump);
check('the 2.6 m drop empties his stamina and locks sprint out', jump.penalties === 1 && jump.stamina < 0.5 && jump.exhausted, jump);
const sprint = await page.evaluate(() => { Game.keys['ShiftLeft'] = true; Game.keys['KeyW'] = true; for (let i = 0; i < 30; i++) stepGame(1 / 60); const s = Game.player.sprinting; Game.keys['ShiftLeft'] = false; Game.keys['KeyW'] = false; return s; });
check('straight after it he cannot sprint', sprint === false);
const jumpRail = await run({ at: [-1.1, 2.6, -6], yaw: 0, n: 120, spaceAt: 0 });
check('a jump in place up there lands back on the floor, no penalty', jumpRail.onGround && jumpRail.y === 2.6 && jumpRail.maxY > 3.2 && jumpRail.penalties === 0, jumpRail);
const letGoHigh = await run({ at: [0, 0, -3.5], yaw: 0, w: true, n: 200, stopWhenClimbing: 2.0 });
const fallHigh = await run({ n: 120, spaceAt: 0 });
check('letting go of the ladder 2 m up (Space) drops him, and the drop costs his stamina', letGoHigh.climbing && fallHigh.onGround && fallHigh.y === 0 && fallHigh.penalties === 1 && fallHigh.exhausted, { letGoHigh, fallHigh });
const letGoLow = await run({ at: [0, 0, -3.5], yaw: 0, w: true, n: 200, stopWhenClimbing: 1.0 });
const fallLow = await run({ n: 120, spaceAt: 0 });
check('letting go 1 m up costs nothing', letGoLow.climbing && fallLow.onGround && fallLow.y === 0 && fallLow.penalties === 0 && !fallLow.exhausted, { letGoLow, fallLow });
const table = await run({ at: [4, 0.78, 13.5], yaw: 0, w: true, n: 90 });
check('walking off the 0.78 m picnic table costs nothing (drops under 1.5 m are free)', table.onGround && table.y === 0 && table.penalties === 0, table);

// --- walking under it, kids and BBs ---
const under = await run({ at: [-1.0, 0, -2.6], yaw: 0, w: true, n: 150 });
check('he walks right under the platform (between the posts) on the grass', under.z < -8 && under.maxY < 0.01, under);
const kidCol = await page.evaluate(() => ({ under: collidesObstacles(-1.0, -6, 0.35), post: collidesObstacles(1.55, -4.55, 0.35) }));
check('kids walk under it too, and the posts stop them', !kidCol.under && kidCol.post, kidCol);
const bb = await page.evaluate(() => {
  const hits = Game.player.obstacles.filter(o => o.treehouseFloor);
  return { up: +obsRayDist(hits[0], 0.9, 1.5, -6, 0, 1, 0, 5).toFixed(2), down: +obsRayDist(hits[0], 0.9, 4, -6, 0, -1, 0, 5).toFixed(2) };
});
check('the floor stops BBs from below and from above', bb.up === 0.95 && bb.down === 1.4, bb);

// --- Connor can be tagged up there: a BB at his chest hits him ---
const tag = await page.evaluate(() => {
  const c = Game.scenario.enemies.find(e => e.perch);
  setKidCrouch(c.mesh, 0);
  return { chest: checkEnemyHit(c, new THREE.Vector3(c.pos.x, c.pos.y + 1.1, c.pos.z)), ground: checkEnemyHit(c, new THREE.Vector3(c.pos.x, 1.1, c.pos.z)) };
});
check('a BB at Connor\'s chest up there hits him; one at ground-chest height under him does not', !!tag.chest && !tag.ground, tag);

// screenshots: the yard from the gate, and the yard from the platform
await page.evaluate(() => { const p = Game.player; p.pos.set(-13, 0, 14.4); p.yaw = -0.55; p.pitch = 0.08; p.onGround = true; p.climbing = null; });
await g.spin(2);
await g.shot('treehouse-yard');
await page.evaluate(() => { const p = Game.player; p.pos.set(0.6, 2.6, -5.4); p.yaw = Math.PI; p.pitch = -0.2; p.onGround = true; });
await g.spin(2);
await g.shot('treehouse-platform');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
