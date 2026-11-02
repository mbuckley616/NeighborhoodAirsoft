// v1.421 (backlog D.51, card fable/d51-northcliff; Michael 16 Oct: real scale 1 C; 21 Oct: each match in a fenced area
// about today's size; 2 Nov: B, the road bends north at the west end as the real loop does). Northcliff Trace at real
// scale: the south leg about 130 m between its corners with the houses 15-17 m wide, the hill 7 m up behind the uphill
// yards and down to the creek bank, and at the west corner the road turning north up the hill, their base on the corner
// house's side lawn off it. The start rules (the kids' sight rule, muzzle 1.05 m to chest 0.95 m or head 1.32 m, each on
// the ground under him): at night no start of theirs has a line to yours or your crew's; every team match's first shot
// comes inside the guns' 10-40 m; nothing past the area is solid; the views stay inside the 1,300 draw-call budget (a
// fifth over v1.416's worst Northcliff view, 1,094).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const leave = async () => { await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30); };

const plan = await page.evaluate(() => {
  const built = withSeededRandom('x|nc', () => buildNorthcliffScene('default', 'day')), B = built.bounds, obs = built.obstacles, gy = built.groundY;
  const inB = (x, z, m = 0) => x >= B.minX + m && x <= B.maxX - m && z >= B.minZ + m && z <= B.maxZ - m;
  const houses = obs.filter(o => o.h >= 5 && (o.maxX - o.minX) >= 14 && (o.maxX - o.minX) <= 18 && (o.maxZ - o.minZ) >= 10 && (o.maxZ - o.minZ) <= 12);
  // the road: asphalt is there north of the bend, up the west leg, and none is left where the bulb was
  const road = []; built.scene.traverse(m => { if (m.userData && m.userData.wmRoad) road.push(m.userData.wmRoad); });
  // past the area, nothing low is solid (the edge walls along the creek and the street on east are, on purpose)
  const outside = obs.filter(o => o.h < 6 && !inB((o.minX + o.maxX) / 2, (o.minZ + o.maxZ) / 2, -3.5) && (o.maxX - o.minX) < 60)
    .map(o => [+o.minX.toFixed(1), +o.minZ.toFixed(1), +o.h.toFixed(1)]);
  const pts = [...Object.entries(built.placements), ...Object.entries(built.playerSpawns)];
  const was = Game.player.obstacles; Game.player.obstacles = obs;
  const bad = pts.filter(([, p]) => !inB(p.pos.x, p.pos.z, 0.4) || collidesObstacles(p.pos.x, p.pos.z, 0.3)).map(([k]) => k);
  Game.player.obstacles = was;
  // the base: the corner house stands between their start and the east end of the street
  const base = built.placements.cluster_bulb.pos, east = built.playerSpawns.road_east.pos;
  const hidden = !hasLineOfSight(base.x, gy(base.x, base.z) + 1.05, base.z, east.x, gy(east.x, east.z) + 1.32, east.z, obs);
  return { size: [+(B.maxX - B.minX).toFixed(1), +(B.maxZ - B.minZ).toFixed(1)], houses: houses.map(h => +(h.maxX - h.minX).toFixed(1)),
    road, bulb: road.includes('bulb'), outside, anchors: pts.length, bad, hidden,
    hill: { top: +gy(0, -38).toFixed(2), road: +gy(0, -1).toFixed(2), bank: +gy(0, 32).toFixed(2), creek: +gy(0, 38).toFixed(2), legTop: +gy(-41, -40).toFixed(2) } };
});
console.log('  ', JSON.stringify(plan));
check('the area is about today\'s size: 85-95 by 70-76 m', plan.size[0] >= 85 && plan.size[0] <= 95 && plan.size[1] >= 70 && plan.size[1] <= 76, plan.size);
check('five real-size houses in the area (15-17 m wide, 11 m deep)', plan.houses.length === 5, plan.houses);
check('the road has no bulb: it bends north at the west corner and climbs the west leg', !plan.bulb && plan.road.includes('asphalt') && plan.hill.legTop > 6, plan);
check('the hill: 7 m up behind the uphill yards, the road flat, down past the creek bank to the creek',
  plan.hill.top > 6 && Math.abs(plan.hill.road) < 0.4 && plan.hill.bank < -3 && plan.hill.creek < plan.hill.bank - 2, plan.hill);
check('nothing low past the area is solid', plan.outside.length === 0, plan.outside);
check('every start and anchor is inside the area and clear of everything solid', plan.anchors >= 20 && plan.bad.length === 0, plan.bad);
check('the corner house hides their base from the east end of the street', plan.hidden, plan);

for (const id of ['northcliff_1v1_evan', 'northcliff_twins_3v3', 'northcliff_defend_creek', 'northcliff_night_4v4']) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const obs = Game.player.obstacles, G = Game.scenario.groundY, Y = [0.95, 1.32];
    const sees = (a, b) => Y.some(h => hasLineOfSight(a.x, G(a.x, a.z) + 1.05, a.z, b.x, G(b.x, b.z) + h, b.z, obs));
    const ours = [Game.player.pos.clone(), ...Game.scenario.enemies.filter(e => e.team === 'player').map(e => (e._spawnPos || e.pos).clone())];
    const theirs = Game.scenario.enemies.filter(e => e.team !== 'player');
    const seen = theirs.flatMap(e => ours.filter(o => sees(e._spawnPos || e.pos, o)).map(o => e.character.name + '→' + o.x.toFixed(1) + ',' + o.z.toFixed(1)));
    // v1.421: every kid stands on the ground under him from the first step (a kid left at y 0 saw under a house up the hill)
    const floating = Game.scenario.enemies.filter(e => !e.perch && Math.abs(e.pos.y - G(e.pos.x, e.pos.z)) > 0.05).map(e => e.character.name);
    // draw calls from six views: the east end, mid-street, the bend, the high yard, the creek fort, their base
    const P = Game.player, save = [P.pos.clone(), P.yaw];
    let worst = 0;
    for (const [x, z, yaw] of [[39, -3, Math.PI / 2], [4, -1, Math.PI / 2], [-30, -10, Math.PI * 0.75], [10, -33, Math.PI * 0.9], [-6, 30, 0], [-38, -34, Math.PI]]) {
      P.pos.set(x, G(x, z) + 0.1, z); P.yaw = yaw; stepGame(1 / 60); Game.renderer.render(Game.scene, Game.camera); worst = Math.max(worst, Game.renderer.info.render.calls);
    }
    P.pos.copy(save[0]); P.yaw = save[1];
    const hit = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    let d = null, t = 0; const o = spawnEnemyBB;
    // the range of the shot itself, shooter to the point he aims at (the nearest foe can stand 1 m away behind a corner
    // while he fires at another 15 m off)
    spawnEnemyBB = (e, tg) => { if (d == null && !inOpeningHold() && tg) d = Math.hypot(e.pos.x - tg.x, e.pos.z - tg.z); return o(e, tg); };
    for (let f = 0; f < 60 * 60 && d == null && Game.mode === 'scenario'; f++) { stepGame(1 / 60); t = f / 60; }
    spawnEnemyBB = o; applyBBHit = hit;
    return { seen, floating, worst, d: d && +d.toFixed(1), t: +t.toFixed(1) };
  });
  console.log(`   ${id}:`, JSON.stringify(r));
  check(`${id}: every kid starts on the ground`, r.floating.length === 0, r.floating);
  if (id === 'northcliff_night_4v4') check(`${id}: no line from their starts to yours or your crew's (chest or head)`, r.seen.length === 0, r.seen);
  if (id !== 'northcliff_1v1_evan') check(`${id}: the first shot is fired at 10-40 m`, r.d != null && r.d >= 10 && r.d <= 40, r);
  check(`${id}: the worst of six views stays inside 1,300 draw calls`, r.worst <= 1300, r.worst);
  await leave();
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
