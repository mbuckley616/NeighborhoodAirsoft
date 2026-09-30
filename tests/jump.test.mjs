// v1.105 (backlog D.4, Michael: A): the player jumps onto and over low things. Walking into a box stops you; a
// jump from beside it lands you on top, where you stay; walking off drops you back to the ground; a jump clears a
// low kerb; a 1.1 m wall still stops a jump. Kids keep ground collision. Keys are driven through Game.keys and a
// real Space keydown, time through stepGame.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

// pick an obstacle matching `want`, with a clear 2.5 m run-up on its south side and 1.5 m clear past its north side
const pick = (want) => page.evaluate((want) => {
  const obs = Game.player.obstacles, r = Game.player.radius;
  const P = (ax, u, c) => ax === 'z' ? [c, u] : [u, c];
  const other = (o, x, z) => obs.some(q => q !== o && obsOverlapsXZ(q, x, z, r + 0.05) && (q.baseY ?? 0) < scenarioGroundY(x, z) + 1.6);
  for (const ax of ['z', 'x']) {
    const cands = obs.filter(o => {
      const across = ax === 'z' ? o.maxX - o.minX : o.maxZ - o.minZ, along = ax === 'z' ? o.maxZ - o.minZ : o.maxX - o.minX;
      return o.shape !== 'obox' && o.shape !== 'cylinder' && !o.bbPass && Math.abs((o.baseY ?? 0) - scenarioGroundY((o.minX + o.maxX) / 2, (o.minZ + o.maxZ) / 2)) < 0.4 && (o.h ?? 5) >= want.hMin && (o.h ?? 5) <= want.hMax
        && across >= want.wMin && along >= want.dMin && along <= want.dMax;
    });
    for (const o of cands) {
      const lo = ax === 'z' ? o.minZ : o.minX, hi = ax === 'z' ? o.maxZ : o.maxX;
      const c = ax === 'z' ? (o.minX + o.maxX) / 2 : (o.minZ + o.maxZ) / 2;
      let ok = true;
      for (let u = hi + 0.2; u <= hi + 2.6 && ok; u += 0.2) if (other(o, ...P(ax, u, c))) ok = false;
      for (let u = lo - 0.2; u >= lo - 1.5 && ok; u -= 0.2) if (other(o, ...P(ax, u, c))) ok = false;
      for (let u = lo; u <= hi && ok; u += 0.1) if (other(o, ...P(ax, u, c))) ok = false;
      const b = Game.player.bounds;
      if (b) for (const u of [lo - 1.5, hi + 2.6]) { const [x, z] = P(ax, u, c); if (x < b.minX + 0.5 || x > b.maxX - 0.5 || z < b.minZ + 0.5 || z > b.maxZ - 0.5) ok = false; }
      if (ok) return { ax, c, lo, hi, h: o.h, top: +((o.baseY ?? 0) + o.h).toFixed(3) };
    }
  }
  return null;
}, want);

// stand at (x, z) facing north (−z); hold W for `walk` steps, optionally pressing Space after `jumpAt` steps
const run = (o, u, walk, jumpAt = -1, sprint = false) => page.evaluate(([o, u, walk, jumpAt, sprint]) => {
  const p = Game.player;
  const x = o.ax === 'z' ? o.c : u, z = o.ax === 'z' ? u : o.c;
  p.pos.x = x; p.pos.z = z; p.pos.y = scenarioGroundY(x, z); p.velY = 0; p.onGround = true; p.yaw = o.ax === 'z' ? 0 : Math.PI / 2; p.pitch = 0;
  Game.keys = Game.keys || {}; Game.keys['KeyW'] = walk > 0; Game.keys['ShiftLeft'] = sprint;
  let maxY = -99; const trace = [];
  for (let i = 0; i < Math.max(walk, 1); i++) {
    if (i === jumpAt) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    stepGame(1 / 60);
    maxY = Math.max(maxY, p.pos.y - scenarioGroundY(p.pos.x, p.pos.z));
  }
  Game.keys['KeyW'] = false; Game.keys['ShiftLeft'] = false;
  return { u: +(o.ax === 'z' ? p.pos.z : p.pos.x).toFixed(2), y: +p.pos.y.toFixed(3), ground: +scenarioGroundY(p.pos.x, p.pos.z).toFixed(3), onGround: p.onGround, rise: +maxY.toFixed(2) };
}, [o, u, walk, jumpAt, sprint]);
const idle = (n) => page.evaluate((n) => { const p = Game.player; for (let i = 0; i < n; i++) stepGame(1 / 60); return { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(3), onGround: p.onGround }; }, n);
const walkOn = (o, n) => page.evaluate(([o, n]) => { const p = Game.player; Game.keys['KeyW'] = true; for (let i = 0; i < n; i++) stepGame(1 / 60); Game.keys['KeyW'] = false;
  return { u: +(o.ax === 'z' ? p.pos.z : p.pos.x).toFixed(2), y: +p.pos.y.toFixed(3), ground: +scenarioGroundY(p.pos.x, p.pos.z).toFixed(3), onGround: p.onGround }; }, [o, n]);

for (const id of ['winnmark_seth_house', 'bunratty_sean']) {
  await g.scenario(id);
  await page.evaluate(() => { Game.player.invuln = true; applyBBHit = () => {}; });   // nothing ends the round while we climb
  await g.spin(5);
  console.log(`  -- ${id}`);
  const box = await pick({ hMin: 0.45, hMax: 0.72, wMin: 0.7, dMin: 0.6, dMax: 2.0 });
  if (!check(`${id}: a 0.45–0.72 m box with a clear run-up`, box, box)) continue;
  const start = box.hi + 1.4;
  const into = await run(box, start, 60);
  check(`${id}: walking into the ${box.h} m box stops at its face`, into.u > box.hi && into.u < box.hi + 0.5 && Math.abs(into.y - into.ground) < 0.02, into);
  const up = await run(box, start, 45, 6);
  check(`${id}: a jump from beside it lands on top (feet at ${box.top})`, up.onGround && Math.abs(up.y - box.top) < 0.02 && up.u < box.hi, up);
  const stay = await idle(90);
  check(`${id}: standing on it, the player stays up`, stay.onGround && Math.abs(stay.y - box.top) < 0.02, stay);
  const off = await walkOn(box, 80);
  check(`${id}: walking off the far side drops back to the ground`, off.u < box.lo && off.onGround && Math.abs(off.y - off.ground) < 0.03, off);
  // a wall too tall to stand on or jump over
  const wall = await pick({ hMin: 1.08, hMax: 1.3, wMin: 0.8, dMin: 0.1, dMax: 1.5 });
  if (check(`${id}: a 1.08–1.3 m wall with a clear run-up`, wall, wall)) {
    const w = await run(wall, wall.hi + 1.4, 70, 6);
    check(`${id}: a jump into the ${wall.h} m wall stays on the near side`, w.u > wall.hi && Math.abs(w.y - w.ground) < 0.03, w);
  }
  // kids keep ground collision: the box still blocks a kid-sized body at the terrain foot
  const kid = await page.evaluate((b) => { const m = (b.lo + b.hi) / 2; return b.ax === 'z' ? collidesObstacles(b.c, m, 0.35) : collidesObstacles(m, b.c, 0.35); }, box);
  check(`${id}: kids still collide with the box (no foot height passed)`, kid === true);
  await page.evaluate(() => endScenario('lose'));
}

// a low kerb (0.45 m high, 0.3 m deep) is cleared by a running jump. The maps have few such things in the open,
// so the test lays one across a clear stretch of the lot's middle aisle.
await g.scenario('lot_1v1_marcus');
await page.evaluate(() => { applyBBHit = () => {}; });
await g.spin(5);
const kerb = await page.evaluate(() => {
  const r = Game.player.radius, obs = Game.player.obstacles;
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) {
    let ok = true;
    for (let u = -2; u <= 3.2 && ok; u += 0.2) if (collidesObstacles(x, z + u, r + 0.1)) ok = false;
    if (!ok) continue;
    const o = { minX: x - 1, maxX: x + 1, minZ: z - 0.15, maxZ: z + 0.15, h: 0.45, baseY: scenarioGroundY(x, z), surface: 'hard' };
    obs.push(o);
    return { ax: 'z', c: x, lo: o.minZ, hi: o.maxZ, h: 0.45 };
  }
  return null;
});
if (check('lot: a clear stretch for a 0.45 m kerb', kerb, kerb)) {
  const blocked = await run(kerb, kerb.hi + 2.2, 60);
  check('lot: walking into the kerb stops at it', blocked.u > kerb.hi, blocked);
  const over = await run(kerb, kerb.hi + 2.2, 70, 12, true);
  check('lot: a running jump crosses it', over.u < kerb.lo && over.onGround && Math.abs(over.y - over.ground) < 0.03, over);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
