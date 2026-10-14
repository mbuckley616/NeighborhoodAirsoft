// v1.139 (Found in play, critic v1.137): Northcliff's road start held the player dead at (29.5, 1) against a
// parked car at an angle (an obox at 2.99 rad), because the move tests x and z apart and neither slides along a
// sloped face. The player now slides along an angled face. For every Northcliff match that starts on the road:
// hold W for 4 s from the start at five facings (the critic's 0°, 3° and 9° left, 9° right, 17° left) and see him
// get past the car. Then two checks that the slide doesn't let him through things: walking square into the car's
// long side still stops him, and he never stands inside an obstacle on any frame of any walk.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ids = await page.evaluate(() => Object.keys(SCENARIOS).filter(id =>
  /Northcliff/.test(SCENARIOS[id].builderFn) && SCENARIOS[id].playerSpawn === 'road_east'));
check('there are Northcliff matches that start on the road', ids.length > 0, ids);
const offsets = [0, 3, 9, -9, 17];   // degrees left (+) of the given facing
const rows = [];
let inside = 0, frames = 0;
for (const id of ids) {
  for (const off of offsets) {
    await g.scenario(id);
    await g.spin(2);
    const r = await page.evaluate(({ off }) => {
      const p = Game.player;
      const start = { x: p.pos.x, z: p.pos.z };
      p._slides = 0;
      p.yaw += off * Math.PI / 180;
      Game.keys.KeyW = true;
      let inside = 0, minX = p.pos.x;
      for (let i = 0; i < 240; i++) {
        Game.mouse.locked = true;   // updatePlayer moves no one without it; CI's Chromium may refuse the real pointer lock
        stepGame(1 / 60);
        if (Game.mode !== 'scenario') break;
        if (collidesObstacles(p.pos.x, p.pos.z, p.radius * 0.9, p.pos.y)) inside++;
        minX = Math.min(minX, p.pos.x);
      }
      Game.keys.KeyW = false;
      return { start, end: { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) }, minX: +minX.toFixed(2), inside, slides: p._slides || 0 };
    }, { off });
    rows.push({ id, off, ...r });
    inside += r.inside; frames += 240;
    await page.evaluate(() => { Game.mode = 'scenario'; endScenario('forfeit'); enterBedroom(); });
    await g.spin(3);
  }
}
for (const r of rows) console.log(`   ${r.id} ${String(r.off).padStart(3)}°  start (${r.start.x}, ${r.start.z}) → (${r.end.x}, ${r.end.z})  slides ${r.slides}`);
for (const r of rows) check(`${r.id} at ${r.off}°: holding W for 4 s gets him past the car (x under 27)`, r.minX < 27, r);
check('he never stands inside an obstacle', inside === 0, `${inside} of ${frames} frames`);

// Square into the car's long side: the slide has nothing to take, so he stays put.
await g.scenario(ids[0]);
await g.spin(2);
const head = await page.evaluate(() => {
  const p = Game.player;
  const car = (p.obstacles || []).filter(o => o.shape === 'obox' && o.hx > 1.5 && o.hx > o.hz)
    .sort((a, b) => Math.hypot(a.cx - p.pos.x, a.cz - p.pos.z) - Math.hypot(b.cx - p.pos.x, b.cz - p.pos.z))[0];
  if (!car) return null;
  // the car's local +z axis in world (THREE convention), and a spot 1.5 m out from that long side, facing it
  const nx = Math.sin(car.angle), nz = Math.cos(car.angle);
  p.pos.x = car.cx + nx * (car.hz + 1.5); p.pos.z = car.cz + nz * (car.hz + 1.5);
  p.pos.y = scenarioGroundY(p.pos.x, p.pos.z);
  p.yaw = Math.atan2(nx, nz);          // facing (-sin yaw, -cos yaw) = -normal, into the car
  const sx = p.pos.x, sz = p.pos.z;
  Game.keys.KeyW = true;
  let inside = 0;
  for (let i = 0; i < 180; i++) { Game.mouse.locked = true; stepGame(1 / 60); if (collidesObstacles(p.pos.x, p.pos.z, p.radius * 0.9, p.pos.y)) inside++; }
  Game.keys.KeyW = false;
  const along = (p.pos.x - sx) * nz - (p.pos.z - sz) * nx;   // movement along the side
  return { angle: +car.angle.toFixed(2), along: +along.toFixed(2), inside };
});
console.log('   square into the car:', JSON.stringify(head));
check('there is a long car to walk into', head !== null);
if (head) {
  check('walking square into a car\'s side, he slides under 0.3 m along it', Math.abs(head.along) < 0.3, head);
  check('and never enters it', head.inside === 0, head);
}
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
