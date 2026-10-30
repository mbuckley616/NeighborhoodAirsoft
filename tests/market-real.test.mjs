// v1.390 (backlog D.51, card fable/d51-market; Michael 16 Oct: real scale 1 C, the rows north-south at the doors 7 A,
// Guadalajara's patio in play 8 A; 21 Oct: each match in a fenced area about today's size). Riverside Market at real
// scale: the store 92 m across with its two towers, the double rows running straight at the doors, the west strip set
// back with Guadalajara at its end, all six lot matches in one 86 m area that takes in the patio. The start rules (the
// kids' sight rule, muzzle 1.05 m to chest 0.95 m or head 1.32 m since v1.385): at night no store-side start or huddle
// has a line to your start or your side's; every team match's first shot comes inside the guns' 10-40 m; nothing past the area is
// solid; the views stay inside the 1,200 draw-call budget (a quarter over v1.389's worst lot view, 940). Inside, the
// store keeps its floor behind the real front (the clerestory, the west vestibule, the walk and fire lane outside).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const leave = async () => { await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30); };

// the lot's plan, from one build
const plan = await page.evaluate(() => {
  const built = withSeededRandom('x|lot', () => buildMarketLotScene('default', 'day')), B = built.bounds, obs = built.obstacles;
  const inB = (x, z, m = 0) => x >= B.minX + m && x <= B.maxX - m && z >= B.minZ + m && z <= B.maxZ - m;
  const cars = obs.filter(o => o.shape === 'obox' && o.hx === 1.8 && o.baseYLocal === 0);
  const rowCars = cars.filter(c => c.cz > ML.rowZ0 && c.cz < ML.rowZ1);
  // a row car's long axis runs east-west (its nose into the double row's middle): yaw within 0.1 of 0 or PI
  const ns = rowCars.filter(c => Math.abs(Math.sin(c.angle)) < 0.1).length;
  // the row each car parks in, by its x: the double rows stand on the 18 m pitch round the aisle at the west doors
  const rowsOf = new Set(rowCars.map(c => Math.round((c.cx - 8) / 18)));
  const store = obs.find(o => o.minX === ML.storeX0 && o.maxX === ML.storeX1);
  const tower = obs.find(o => o.maxZ === ML.frontZ + 2 && o.h === 14.5 && o.minX === ML.storeX0);
  const cols = obs.filter(o => Math.abs(o.maxZ - (ML.stripZ + 3)) < 0.01 && o.h === 4.6);
  const fence = obs.filter(o => o.bbPass && o.h === 1.1);
  const tables = obs.filter(o => o.h === 0.78);
  // (the fifth row's west half, x 38.3-44.6, is the east fence: solid on purpose)
  const outside = obs.filter(o => o.h < 6 && !inB((o.minX + o.maxX) / 2, (o.minZ + o.maxZ) / 2, -1.2)
    && o !== store && !(o.maxX - o.minX > 30) && !(o.minX > B.maxX - 0.5 && o.maxX < 44.8 && o.minZ > -16 && o.maxZ < 28)).map(o => [+o.minX.toFixed(1), +o.minZ.toFixed(1), o.h]);
  const pts = [...Object.entries(built.placements), ...Object.entries(built.playerSpawns)];
  // v1.392: against the lot's own obstacles (collidesObstacles reads the player's, here the bedroom's)
  const was = Game.player.obstacles; Game.player.obstacles = obs;
  const bad = pts.filter(([, p]) => !inB(p.pos.x, p.pos.z, 0.4) || collidesObstacles(p.pos.x, p.pos.z, 0.3)).map(([k]) => k);
  Game.player.obstacles = was;
  return { size: [+(B.maxX - B.minX).toFixed(1), +(B.maxZ - B.minZ).toFixed(1)], storeW: store && store.maxX - store.minX,
    storeD: store && store.maxZ - store.minZ, tower: !!tower, doorsAisle: ML.storeX0 + 6,
    rowCars: rowCars.length, ns, rows: rowsOf.size, cols: cols.length, fence: fence.length, tables: tables.length,
    patioIn: inB(-35, -36) && inB(-35, -40.5), outside, anchors: pts.length, bad };
});
console.log('  ', JSON.stringify(plan));
check('the lot: the store is 92 m across and 70 m deep, with its west tower standing proud of the front',
  plan.storeW === 92 && plan.storeD === 70 && plan.tower, plan);
check('the lot: every parked car in the rows lies east-west, its nose into its double row: the rows run north-south',
  plan.rowCars >= 30 && plan.ns === plan.rowCars, plan);
check('the lot: five double rows on the 18 m pitch (four in play, the fifth one\'s cars the east fence), an aisle straight at the west doors (x -1)',
  plan.rows === 5 && plan.doorsAisle === -1, plan);
check("the lot: one area about today's size, widened west to Guadalajara's porch and patio (90 by 70 m at most)",
  plan.size[0] >= 80 && plan.size[0] <= 90 && plan.size[1] <= 70 && plan.patioIn, plan.size);
check("the lot: Guadalajara's four columns are solid, its patio fence stops a kid but not a BB, and its five tables are cover",
  plan.cols === 4 && plan.fence >= 3 && plan.tables === 5, plan);
check('the lot: nothing past the area is solid (the store, the edge walls and Fouts Rd\'s trees aside)', plan.outside.length <= 8, plan.outside);
check('the lot: every start and anchor is inside the area and clear of everything solid', plan.anchors >= 30 && plan.bad.length === 0, plan.bad);

// the team matches: at night no store-side start (the huddle behind the truck, a VIP) has a line to your start or your
// side's, and in all three the first shot comes inside the guns' 10-40 m, you standing at your start
for (const id of ['lot_team_3v3', 'lot_night_4v4', 'lot_vip_night']) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const obs = Game.player.obstacles, Y = [0.95, 1.32];
    const sees = (a, b) => Y.some(h => hasLineOfSight(a.x, 1.05, a.z, b.x, h, b.z, obs));
    const ours = [Game.player.pos, ...Game.scenario.enemies.filter(e => e.team === 'player').map(e => e._spawnPos || e.pos)];
    const theirs = Game.scenario.enemies.filter(e => e.team !== 'player');
    const seen = theirs.flatMap(e => ours.filter(o => sees(e._spawnPos || e.pos, o)).map(o => e.character.name + '→' + o.x.toFixed(1) + ',' + o.z.toFixed(1)));
    const hit = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    let d = null, t = 0; const o = spawnEnemyBB;
    const foes = e => [...(e.team === 'player' ? [] : [Game.player.pos]), ...Game.scenario.enemies.filter(k => k.team !== e.team && k.health > 0).map(k => k.pos)];
    spawnEnemyBB = (e, tg) => { if (d == null && !inOpeningHold()) d = Math.min(...foes(e).map(p => Math.hypot(e.pos.x - p.x, e.pos.z - p.z))); return o(e, tg); };
    for (let f = 0; f < 60 * 60 && d == null && Game.mode === 'scenario'; f++) { stepGame(1 / 60); t = f / 60; }
    spawnEnemyBB = o; applyBBHit = hit;
    return { seen, d: d && +d.toFixed(1), t: +t.toFixed(1) };
  });
  console.log(`   ${id}:`, JSON.stringify(r));
  // the night rule (no line from a start); by day Aisle Wars gathers at the doors in sight of the lot, as the old lot did
  if (id !== 'lot_team_3v3') check(`${id}: no line from their starts to yours or your side's (chest or head)`, r.seen.length === 0, r.seen);
  check(`${id}: the first shot is fired at 10-40 m`, r.d != null && r.d >= 10 && r.d <= 40, r);
  await leave();
}

// draw calls: views from the road end, the doors, Guadalajara's patio and the east edge in the busiest match
await g.scenario('lot_vip_night');
const calls = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) e.update = () => {};
  const out = {};
  for (const [n, x, z, yaw] of [['road', 36.5, 14.5, 0], ['doors', -1, -27, Math.PI], ['patio', -35, -36, Math.PI * 0.75], ['east', 40, -5, Math.PI / 2], ['mid', -1, 5, 0]]) {
    Game.camera.position.set(x, 1.6, z); Game.camera.rotation.set(-0.05, yaw, 0, 'YXZ'); Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out[n] = Game.renderer.info.render.calls;
  }
  return out;
});
console.log('   draw calls:', JSON.stringify(calls));
check('the lot: every view stays inside the 1,200 draw-call budget', Object.values(calls).every(c => c <= 1200), calls);
await leave();

// inside: the floor as it was, the real front's clerestory over the glass and the west vestibule outside it
await g.scenario('store_price_check_3v3');
const inside = await page.evaluate(() => {
  const B = Game.scenario.bounds; let clere = 0, vest = 0;
  Game.scene.traverse(m => { if (!m.isMesh || !m.geometry.parameters) return; const p = m.geometry.parameters;
    if (m.position.y === 4.3 && m.position.z === 17.9 && p.height === 2.2) clere++;
    if (m.position.z === 21.8 && m.position.x === -17 && p.width === 6) vest++; });
  return { B: [B.minX, B.maxX, B.minZ, B.maxZ], clere, vest };
});
console.log('   inside:', JSON.stringify(inside));
check('inside: the floor keeps its box (x ±25.6, z -29.6 to 17.6)', JSON.stringify(inside.B) === JSON.stringify([-25.6, 25.6, -29.6, 17.6]), inside.B);
check('inside: the clerestory glass over both runs of the front glass, and the west vestibule outside', inside.clere === 2 && inside.vest === 1, inside);
await leave();
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
