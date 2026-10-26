// v1.338 (backlog D.51, card fable/d51-winnmark; Michael 16 Oct: real scale; 26 Oct: each match fenced to a today-sized
// part of the street, A). Winnmark Court past its tree walls is the real place: the street runs on to Winnmark Dr, 265 m
// from the bulb, rising 3-5 m from the bulb as the real one falls; the north lots fall to the golf course, the south lots
// into one shared wood with a creek in it that runs to the course; the pond lies north-west of the bulb, under water, not
// grass. None of it is solid, none of it stands within 6 m of the bounds, the ground in the box is the real one (v1.343), and the
// map stays inside its draw-call budget (2,060: a quarter over v1.337's worst view, 1,651, decisions D.51).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const built = withSeededRandom('winnmark_team_3v3|default', () => buildWinnmarkCourtScene('cul_de_sac', 'day'));
  const gY = built.groundY, B = built.bounds, R = WM_REAL;
  // the old ground in the box and its tree walls (v1.337's formula)
  const old = (x, z) => {
    let u = Math.max(0, Math.min(1, (x - 38) / (-32 - 38))); u = u * u * (3 - 2 * u);
    const h = 3.0 * (1 - u) + 0.25 * Math.sin(z * 0.12 + 0.5) * Math.cos(x * 0.1);
    const fz = Math.max(0, Math.min(1, (z + 42) / 7)), fx = Math.max(0, Math.min(1, (x + 42) / 5));
    return h * fz * fz * (3 - 2 * fz) * fx * fx * (3 - 2 * fx);
  };
  let boxDiff = 0;
  for (let x = R.box.minX; x <= R.box.maxX; x += 0.7) for (let z = R.box.minZ; z <= R.box.maxZ; z += 0.7) boxDiff = Math.max(boxDiff, Math.abs(gY(x, z) - old(x, z)));
  out.boxDiff = boxDiff;
  let realDiff = 0;   // v1.343
  for (let x = R.box.minX; x <= R.box.maxX; x += 0.7) for (let z = R.box.minZ; z <= R.box.maxZ; z += 0.7) realDiff = Math.max(realDiff, Math.abs(gY(x, z) - winnmarkRealScale(x, z, 0, true)));
  out.realDiff = realDiff;
  // the street: its length from the bulb's middle to Winnmark Dr, and its rise
  out.length = R.drX - (-30);
  out.rise = +(gY(R.drX - 6, 0) - gY(-30, 0)).toFixed(2);
  let steep = 0;
  for (let x = 40; x < R.drX - 8; x += 2) steep = Math.max(steep, Math.abs(gY(x + 2, 0) - gY(x, 0)) / 2);
  out.streetGrade = +(steep * 100).toFixed(2);
  // the lots fall away from the street: the north to the course at 0, the south into the wood to the creek
  out.north = [80, 144].map(x => [+gY(x, -12).toFixed(2), +gY(x, -60).toFixed(2)]);
  out.south = [100, 156].map(x => [+gY(x, 12).toFixed(2), +gY(x, 40).toFixed(2), +gY(x, winnmarkCreekZ(x) - 6).toFixed(2)]);
  // the creeks run downhill to the course, in a channel below their banks all the way
  const down = pts => pts.every((p, i) => !i || p[2] < pts[i - 1][2]);
  let inChannel = 0, n = 0;
  for (const pts of [R.creek, R.course]) for (let i = 0; i + 1 < pts.length; i++) for (let t = 0; t < 1; t += 0.1) {
    const a = pts[i], b = pts[i + 1], x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t + 0.25;
    if (x < -205 || x > 305 || z < -195 || z > 225) continue;
    if (Math.hypot(x - R.course[0][0], z - R.course[0][1]) < 3 || Math.hypot(x + 100, z - 30) < 3) continue;   // the pond's outlet, where the creeks meet
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    n++; if (gY(x, z) < y && gY(x + nx * 4, z + nz * 4) > y + 0.3 && gY(x - nx * 4, z - nz * 4) > y + 0.3) inChannel++;
  }
  out.creek = { down: down(R.creek) && down(R.course), n, inChannel };
  // the pond lies over its water, and no lake strip is left west of the bulb
  const P = R.pond, pond = built.scene.getObjectByName('winnmarkPond');
  let wet = 0, pn = 0;
  for (let a = 0; a < 6.283; a += 0.2) for (const f of [0, 0.3, 0.6, 0.9, 0.97]) { pn++; if (gY(P.x + Math.cos(a) * P.rx * f, P.z + Math.sin(a) * P.rz * f) < P.water) wet++; }
  out.pond = { y: pond && pond.position.y, wet, pn };
  let lake = 0; built.scene.traverse(m => { const p = m.geometry && m.geometry.parameters; if (p && p.width === 20 && p.height === 80) lake++; });
  out.lakeStrip = lake;
  // nothing past the walls is solid, nor within 6 m of the bounds
  const sc = built.scene.getObjectByName('realScenery');
  out.stats = sc && sc.userData.stats;
  out.solid = built.obstacles.filter(o => o.mesh && sc && (o.mesh === sc || sc.children.includes(o.mesh))).length;
  let near = Infinity;
  if (sc) sc.traverse(m => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) near = Math.min(near, Math.max(B.minX - p[i], p[i] - B.maxX, B.minZ - p[i + 2], p[i + 2] - B.maxZ));
  });
  out.near = +near.toFixed(2);
  // v1.339 (step 2): the street's houses past the box at real size, each a walk-out over a terrace held by a stone wall
  const lots = WM_LOTS.map(L => {
    const s = L.sgn, hob = built.obstacles.find(o => o.mesh && o.mesh.isGroup && Math.abs((o.minX + o.maxX) / 2 - L.x) < 0.01 && Math.abs((o.minZ + o.maxZ) / 2 - s * 21.5) < 0.01);
    const deck = built.obstacles.find(o => o.surface === 'wood' && Math.abs((o.minX + o.maxX) / 2 - L.x) < 0.01 && o.maxX - o.minX === 12);
    return { x: L.x, size: hob && [+(hob.maxX - hob.minX).toFixed(2), +(hob.maxZ - hob.minZ).toFixed(2)], floor: hob && +(hob.mesh.position.y - gY(L.x, s * 12)).toFixed(2),
      walk: +(L.F - gY(L.x, s * 34)).toFixed(2), terraceFlat: +Math.abs(gY(L.x - 9, s * 30) - gY(L.x + 9, s * 39)).toFixed(3), below: +(L.T - gY(L.x, s * 41)).toFixed(2),
      deck: deck && +(deck.baseY + 0.25 - L.F).toFixed(3), deckOver: deck && +(deck.baseY - gY(L.x, s * 31)).toFixed(2) };
  });
  out.lots = lots;
  out.wallOnGrid = Math.abs((70 - WM_LOT.wallD) / WM_LOT.cell - Math.round((70 - WM_LOT.wallD) / WM_LOT.cell)) < 1e-9;
  // v1.340 (step 3): Seth's lot. Its pad 2-3 m under the road down a 12-15 % driveway; the walk-out over the patio;
  // the hot tub under the big deck with room to stand at it; the pool on the patio; the yard down to the creek
  const H = WM_SETH, S = built.wmSeth, deck = built.obstacles.find(o => o.sethDeck), tub = built.obstacles.find(o => o.sethTub), pool = built.obstacles.find(o => o.sethPool);
  out.seth = {
    padBelowRoad: +(gY(H.drive, 0) - gY(H.drive, 21)).toFixed(2),
    driveGrade: +((gY(H.drive, 5) - gY(H.drive, 21)) / 16 * 100).toFixed(1),
    padFlat: +Math.abs(gY(H.drive, 21.5) - gY(H.drive + 3, 28.5)).toFixed(3),
    walk: +(H.F - gY(H.x, 45)).toFixed(2),
    tubUnderDeck: !!(deck && tub && tub.minX >= deck.minX && tub.maxX <= deck.maxX && tub.minZ >= deck.minZ - 0.01 && tub.maxZ <= deck.maxZ + 0.01),
    tubWidth: tub && +(tub.maxX - tub.minX).toFixed(2), poolSize: pool && [+(pool.maxX - pool.minX).toFixed(2), +(pool.maxZ - pool.minZ).toFixed(2)],
    headroom: deck && tub && +(deck.baseY - (tub.baseY + tub.h)).toFixed(2),
    poolOnPatio: pool && Math.abs(gY((pool.minX + pool.maxX) / 2, (pool.minZ + pool.maxZ) / 2) - H.T) < 1e-9,
    creekBelowPatio: +(H.T - _wmPolyNear(WM_REAL.creek, H.x, winnmarkCreekZ(H.x)).y).toFixed(2),
    house: S && S.house && [+(S.house.maxX - S.house.minX).toFixed(2), +(S.house.maxZ - S.house.minZ).toFixed(2)],
  };
  out.viewFar = built.viewFar;
  out.bounds = B;
  return out;
});
console.log('  ', JSON.stringify(res));
check('Winnmark: the ground where the box was is the real street\'s (v1.343: the box is retired)', res.realDiff < 1e-9 && res.boxDiff > 1, res);
check('Winnmark: the street runs 265 m from the bulb to Winnmark Dr (the real court)', res.length === 265, res.length);
check('Winnmark: the street rises 3-5 m from the bulb to Winnmark Dr, and never steeper than 2 %', res.rise >= 3 && res.rise <= 5 && res.streetGrade <= 2, res);
check('Winnmark: the north lots fall to the course at 0', res.north.every(([f, b]) => f > 3 && Math.abs(b) < 0.01), res.north);
check('Winnmark: the south lots fall into the wood, lower again by the creek', res.south.every(([f, w, c]) => f > w + 2 && w > c), res.south);
check('Winnmark: the creeks run downhill, in a channel under their banks along their whole length', res.creek.down && res.creek.n > 60 && res.creek.inChannel === res.creek.n, res.creek);
check('Winnmark: the pond lies on the course over its whole water, and the old lake strip is gone', res.pond.y === -0.3 && res.pond.wet === res.pond.pn && res.lakeStrip === 0, res);
check('Winnmark: the woods, Winnmark Dr\'s houses and the houses across the course are built', res.stats && res.stats.trees >= 1000 && res.stats.houses >= 15, res.stats);
check('Winnmark: none of it is solid, and none of it stands within 6 m of the bounds (BBs drop at 5)', res.solid === 0 && res.near >= 6, res);
check('Winnmark: seven houses on the street past the box, 20-24 m across and 15 m deep (the guide: 18-25 by 14-18)', res.lots.length === 7 && res.lots.every(l => l.size && l.size[0] >= 20 && l.size[0] <= 24 && l.size[1] === 15), res.lots);
check('Winnmark: each main floor 0.35 m over its front lawn, a walk-out 3 m over its terrace', res.lots.every(l => l.floor === 0.35 && l.walk === 3), res.lots);
check('Winnmark: each terrace flat to its wall, the yard below it 0.9 m or more lower, the wall on a ground grid line', res.wallOnGrid && res.lots.every(l => l.terraceFlat < 1e-9 && l.below >= 0.9), res.lots);
check('Winnmark: each deck at the main floor, 2.7 m or more over the terrace (you walk under it)', res.lots.every(l => l.deck === 0 && l.deckOver >= 2.7), res.lots);
check("Winnmark: Seth's pad is 2-3 m under the road, down a 12-15 % driveway, flat in front of the house", res.seth.padBelowRoad >= 2 && res.seth.padBelowRoad <= 3 && res.seth.driveGrade >= 12 && res.seth.driveGrade <= 15.5 && res.seth.padFlat < 1e-9, res.seth);
check("Winnmark: Seth's house is a 24 m walk-out, its main floor 3 m over the patio", res.seth.house && res.seth.house[0] === 24 && res.seth.walk === 3, res.seth);
check("Winnmark: the hot tub (3.6 m across, as big as half the pool) sits under the big deck, with 1.5 m or more over its rim", res.seth.tubUnderDeck && res.seth.tubWidth === 3.6 && res.seth.headroom >= 1.5, res.seth);
check("Winnmark: the pool lies on the patio, and the creek runs 3-4 m under it at the foot of the yard", res.seth.poolOnPatio && res.seth.creekBelowPatio >= 3 && res.seth.creekBelowPatio <= 4, res.seth);

// in play: you see down the street to Winnmark Dr; the camera sees that far; draw calls in budget
await g.scenario('winnmark_team_3v3');
const view = await page.evaluate(() => {
  applyBBHit = () => true;
  for (const e of Game.scenario.enemies || []) e.update = () => {};
  const out = { far: Game.camera.far, calls: {} };
  for (const [name, x, z, yaw] of [['bulb', -31, 0, -Math.PI / 2], ['entryOut', 36, 0, -Math.PI / 2], ['entryIn', 36, 0, Math.PI / 2],
    ['north', 8, -30, Math.PI], ['south', 7, 34, 0], ['west', -33, 0, Math.PI / 2], ['mid', 4, 4, -Math.PI / 2]]) {
    Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw; Game.player.pitch = -0.05; stepGame(1 / 60);
    Game.player.yaw = yaw; Game.player.pitch = -0.05; Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out.calls[name] = Game.renderer.info.render.calls;
  }
  // from the entry, the street to Winnmark Dr: rays down it reach past x 150
  const all = []; Game.scene.traverse(m => { if (m.isMesh && m.visible) all.push(m); });
  const ray = new THREE.Raycaster(); ray.far = 400; let past = 0;
  const gY = Game.scenario.groundY, o = new THREE.Vector3(38, gY(38, 0) + 1.6, 0);
  for (let a = -4; a <= 4; a += 1) for (let p = -3; p <= 0; p += 0.5) {
    const yaw = a * Math.PI / 180, pt = p * Math.PI / 180;
    ray.set(o, new THREE.Vector3(Math.cos(yaw) * Math.cos(pt), Math.sin(pt), Math.sin(yaw) * Math.cos(pt)));
    const h = ray.intersectObjects(all, false);
    if (h.length && h[0].point.x > 150) past++;
  }
  out.past = past;
  return out;
});
console.log('  ', JSON.stringify(view));
check('Winnmark: from the entry you see down the street past 150 m', view.past >= 3, view.past);
check('Winnmark: the camera sees down the street (380 m)', view.far === 380, view.far);
check('Winnmark: at most 2,060 draw calls in any of seven views', Math.max(...Object.values(view.calls)) <= 2060, view.calls);
await g.shot('winnmark-real-entry');
// v1.341 (step 4; Michael 26 Oct: A): Seth's nine matches play in his area, the other eight in the box
const SA_IDS = ['winnmark_seth_house', 'winnmark_seth_shotgun_duel', 'winnmark_ffa', 'winnmark_sniper_overwatch', 'winnmark_team_2v2',
  'winnmark_defend_treehouse', 'winnmark_two_in_the_yards', 'winnmark_night_prowl', 'winnmark_night_team_2v2'];
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30);
await g.scenario('winnmark_sniper_overwatch');
const sa = await page.evaluate((SA_IDS) => {
  const out = {}, B = Game.scenario.bounds, H = WM_SETH;
  const wm = Object.entries(SCENARIOS).filter(([id, sc]) => sc.builderFn === 'buildWinnmarkCourtScene');
  out.inArea = wm.filter(([, sc]) => winnmarkArea(sc.builderArg) === 'seth').map(([id]) => id).sort();
  out.size = [B.maxX - B.minX, B.maxZ - B.minZ];
  const inB = (x, z, m = 0) => x >= B.minX + m && x <= B.maxX - m && z >= B.minZ + m && z <= B.maxZ - m;
  out.holds = { pad: inB(H.drive, 21), road: inB(H.drive, 0), patio: inB(H.x, 45), creek: inB(H.x, winnmarkCreekZ(H.x) + 2), northLawn: inB(H.x, -10) };
  // every start and anchor of the area in its bounds and clear of everything solid (one build, as the match's)
  const built = withSeededRandom('x|seth_yards', () => buildWinnmarkCourtScene('seth_yards', 'day'));
  const pts = [...Object.entries(built.placements), ...Object.entries(built.playerSpawns)].filter(([, p]) => p.pos.x > 50);
  out.anchors = pts.length;
  out.bad = pts.filter(([k, p]) => !inB(p.pos.x, p.pos.z, 0.5) || collidesObstacles(p.pos.x, p.pos.z, 0.3)).map(([k]) => k);
  out.trey = +Math.hypot(built.placements.trey_overwatch.pos.x - H.drive, built.placements.trey_overwatch.pos.z - 21).toFixed(1);
  // its wood is solid: trunks in the bounds; the merged scenery keeps 3 m and more outside them
  out.trunks = built.obstacles.filter(o => o.shape === 'cylinder' && inB(o.cx, o.cz)).length;
  const sc = built.scene.getObjectByName('realScenery'); let near = Infinity;
  sc.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) if (_wmPolyNear(WM_REAL.creek, p[i], p[i + 2]).d > 1.5) near = Math.min(near, Math.max(B.minX - p[i], p[i] - B.maxX, B.minZ - p[i + 2], p[i + 2] - B.maxZ)); });
  out.sceneryOut = +near.toFixed(2);
  // v1.342 (step 4, second part): from Seth's area the bulb's end is the real place: six lots at real size round an 11 m
  // bulb, the street falling 3 m from Winnmark Dr to it, and nothing of the box left (its half-size houses, tree walls)
  const gS = built.groundY;
  out.bulbLots = WM_BULB_LOTS.map(L => {
    const f = L.front || WM_LOT.front, hob = built.obstacles.find(o => o.mesh && o.mesh.userData.wmLot && Math.abs((o.minX + o.maxX) / 2 - L.x) < 0.01 && Math.abs((o.minZ + o.maxZ) / 2 - L.sgn * (f + 7.5)) < 0.01);
    return { x: L.x, size: hob && [+(hob.maxX - hob.minX).toFixed(2), +(hob.maxZ - hob.minZ).toFixed(2)], inScene: !!(hob && hob.mesh.parent === built.scene),
      floor: +(L.F - gS(L.x, L.sgn * (f - 2))).toFixed(2), walk: +(L.F - gS(L.x, L.sgn * (f + 18))).toFixed(2) };
  });
  out.boxHouses = built.obstacles.filter(o => o.mesh && o.mesh.isGroup && o.maxX < 60 && o.maxX - o.minX < 10 && o.maxZ - o.minZ < 10 && o.h > 4).length;
  out.westTrunks = built.obstacles.filter(o => o.shape === 'cylinder' && o.cx < 60).length;
  out.streetFall = +(gS(WM_REAL.drX - 6, 0) - gS(-30, 0)).toFixed(2);
  let bulbR = 0; built.scene.traverse(m => { if (m.userData && m.userData.wmRoad === 'bulb') { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; bulbR = (b.max.x - b.min.x) / 2; } });
  out.bulbR = +bulbR.toFixed(2);
  // draw calls in five views of the area
  applyBBHit = () => true; for (const e of Game.scenario.enemies || []) e.update = () => {};
  out.calls = {};
  for (const [name, x, z, yaw] of [['east', 130, 0, Math.PI / 2], ['drive', 108, 6, Math.PI], ['patio', 100, 52, 0], ['creek', 92, 62, 0.4], ['north', 98, -10, Math.PI]]) {
    Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw; Game.player.pitch = -0.05; stepGame(1 / 60);
    Game.player.yaw = yaw; Game.player.pitch = -0.05; Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out.calls[name] = Game.renderer.info.render.calls;
  }
  return out;
}, SA_IDS);
console.log('  ', JSON.stringify(sa));
check("Winnmark: Seth's nine matches play in his area, the other eight in the bulb's", JSON.stringify(sa.inArea) === JSON.stringify([...SA_IDS].sort()), sa.inArea);
check("Winnmark: Seth's area is about today's box (70-80 m a side) and holds the road, his driveway's pad, the patio, the creek and the north lawn",
  sa.size.every(v => v >= 70 && v <= 80) && Object.values(sa.holds).every(Boolean), sa);
check("Winnmark: every start and anchor in Seth's area is inside it and clear of everything solid", sa.anchors >= 20 && sa.bad.length === 0, sa.bad);
check("Winnmark: Trey's overwatch is 45-55 m from Seth's driveway (Michael: A)", sa.trey >= 45 && sa.trey <= 55, sa.trey);
check("Winnmark: Seth's area's wood is solid trunks, the merged scenery (the creek's water aside) 3 m or more outside it", sa.trunks >= 25 && sa.sceneryOut >= 3, sa);
check("Winnmark: from Seth's area the bulb's six lots are built at real size (20-24 m by 15), each main floor 0.35 m over its lawn, a 2.5-3 m walk-out",
  sa.bulbLots.length === 6 && sa.bulbLots.every(l => l.inScene && l.size && l.size[0] >= 20 && l.size[0] <= 24 && l.size[1] === 15 && l.floor === 0.35 && l.walk >= 2.5 && l.walk <= 3), sa.bulbLots);
check("Winnmark: from Seth's area nothing of the box is left (its half-size houses, its tree walls), the bulb is 11 m across and 3 m under Winnmark Dr",
  sa.boxHouses === 0 && sa.westTrunks === 0 && Math.abs(sa.bulbR - 11) < 0.1 && sa.streetFall >= 2.9 && sa.streetFall <= 3.1, sa);
check("Winnmark: at most 2,060 draw calls in five views of Seth's area", Math.max(...Object.values(sa.calls)) <= 2060, sa.calls);
// the night matches: no kid's start has a line to yours or your side's (muzzle 1.05 m to chest 0.95 m)
for (const id of ['winnmark_night_prowl', 'winnmark_night_team_2v2']) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30);
  await g.scenario(id);
  const seen = await page.evaluate(() => {
    const G = (x, z) => scenarioGroundY(x, z) || 0, obs = Game.player.obstacles;
    const sees = (a, b) => hasLineOfSight(a.x, G(a.x, a.z) + 1.05, a.z, b.x, G(b.x, b.z) + 0.95, b.z, obs);
    const ours = [Game.player.pos, ...Game.scenario.enemies.filter(e => e.team === 'player').map(e => e._spawnPos || e.pos)];
    const theirs = Game.scenario.enemies.filter(e => e.team !== 'player');
    return theirs.flatMap(e => ours.filter(o => sees(e._spawnPos || e.pos, o) || sees(o, e._spawnPos || e.pos)).map(() => e.character.name));
  });
  check(`Winnmark: ${id}: no line from any start to yours at night`, seen.length === 0, seen);
}
// Two on Two: the first shot comes inside the guns' 10-40 m band (you stand at your start and can't be tagged)
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30);
await g.scenario('winnmark_team_2v2');
const first = await page.evaluate(() => {
  const hit = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
  let d = null, t = 0; const o = spawnEnemyBB;
  // the first shot's range: from the shooter to the nearest kid (or you) on the other side
  const foes = e => [...(e.team === 'player' ? [] : [Game.player.pos]), ...Game.scenario.enemies.filter(k => k.team !== e.team && k.health > 0).map(k => k.pos)];
  spawnEnemyBB = (e, tg) => { if (d == null && !inOpeningHold()) d = Math.min(...foes(e).map(p => Math.hypot(e.pos.x - p.x, e.pos.z - p.z))); return o(e, tg); };
  for (let f = 0; f < 60 * 60 && d == null && Game.mode === 'scenario'; f++) { stepGame(1 / 60); t = f / 60; }
  spawnEnemyBB = o;
  return { d: d && +d.toFixed(1), t: +t.toFixed(1) };
});
console.log('   Two on Two, first shot:', JSON.stringify(first));
check('Winnmark: Two on Two in Seth\'s area: the first shot is fired at 10-40 m', first.d != null && first.d >= 10 && first.d <= 40, first);
// v1.343 (step 4, second part): the bulb's eight matches play in its area on the real lots, and nothing of the box is left
const BA_IDS = ['winnmark_tutorial', 'winnmark_squad_basics', 'winnmark_cul_de_sac', 'winnmark_defend_culdesac', 'winnmark_team_2v3',
  'winnmark_whole_block', 'winnmark_team_3v3', 'winnmark_last_stand'];
const ba = await page.evaluate((BA_IDS) => {
  const out = {};
  const wm = Object.entries(SCENARIOS).filter(([, sc]) => sc.builderFn === 'buildWinnmarkCourtScene');
  out.inArea = wm.filter(([, sc]) => winnmarkArea(sc.builderArg) === 'bulb').map(([id]) => id).sort();
  const built = withSeededRandom('x|cul_de_sac', () => buildWinnmarkCourtScene('cul_de_sac', 'day')), B = built.bounds;
  out.size = [B.maxX - B.minX, B.maxZ - B.minZ];
  const inB = (x, z, m = 0) => x >= B.minX + m && x <= B.maxX - m && z >= B.minZ + m && z <= B.maxZ - m;
  out.holds = { bulb: inB(-30, 0) && inB(-41, 0), mouth: inB(32, 0), northLawn: inB(14, -12), terrace: inB(10, 37), sideYard: inB(-7, 24) };
  const pts = [...Object.entries(built.placements), ...Object.entries(built.playerSpawns)];
  out.anchors = pts.length;
  out.bad = pts.filter(([, p]) => !inB(p.pos.x, p.pos.z, 0.5) || collidesObstacles(p.pos.x, p.pos.z, 0.3)).map(([k]) => k);
  out.boxHouses = built.obstacles.filter(o => o.mesh && o.mesh.isGroup && o.maxX - o.minX >= 7 && o.maxX - o.minX < 10 && o.maxZ - o.minZ < 10 && o.h > 4).length;   // 8-9 by 7 m (not a lamp)
  out.lots = built.obstacles.filter(o => o.mesh && o.mesh.userData.wmLot && o.maxX > B.minX && o.minX < B.maxX).length;
  out.fort = []; built.scene.traverse(m => { if (m.userData.fortDetail) { const v = new THREE.Vector3(); m.getWorldPosition(v); out.fort.push([+v.x.toFixed(1), +v.z.toFixed(1)]); } });
  out.trunks = built.obstacles.filter(o => o.shape === 'cylinder' && inB(o.cx, o.cz)).length;
  const sc = built.scene.getObjectByName('realScenery'); let near = Infinity;
  sc.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) near = Math.min(near, Math.max(B.minX - p[i], p[i] - B.maxX, B.minZ - p[i + 2], p[i + 2] - B.maxZ)); });
  out.sceneryOut = +near.toFixed(2);
  return out;
}, BA_IDS);
console.log('  ', JSON.stringify(ba));
check("Winnmark: the bulb's eight matches play in its area", JSON.stringify(ba.inArea) === JSON.stringify([...BA_IDS].sort()), ba.inArea);
check("Winnmark: the bulb's area is about today's box (80-90 by 50-60 m) and holds the bulb, the box's old mouth, a north lawn, a terrace and a side yard",
  ba.size[0] >= 80 && ba.size[0] <= 90 && ba.size[1] >= 50 && ba.size[1] <= 60 && Object.values(ba.holds).every(Boolean), ba);
check("Winnmark: every start and anchor in the bulb's area is inside it and clear of everything solid", ba.anchors >= 30 && ba.bad.length === 0, ba.bad);
check("Winnmark: in the bulb's area nothing of the box is left (its half-size houses); six real lots reach into it, 10 or more solid trunks stand in it",
  ba.boxHouses === 0 && ba.lots === 6 && ba.trunks >= 10, ba);
check("Winnmark: the plank fort stands in the middle of the real bulb, and only there", ba.fort.length === 1 && Math.hypot(ba.fort[0][0] + 29, ba.fort[0][1]) < 1, ba.fort);
check("Winnmark: the merged scenery stands 6 m or more outside the bulb's area (BBs drop at 5)", ba.sceneryOut >= 6, ba.sceneryOut);
// the team matches: the first shot comes inside the guns' 10-40 m band (you stand at your start and can't be tagged)
for (const id of ['winnmark_team_2v3', 'winnmark_team_3v3']) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30);
  await g.scenario(id);
  const f = await page.evaluate(() => {
    const hit = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    let d = null, t = 0; const o = spawnEnemyBB;
    const foes = e => [...(e.team === 'player' ? [] : [Game.player.pos]), ...Game.scenario.enemies.filter(k => k.team !== e.team && k.health > 0).map(k => k.pos)];
    spawnEnemyBB = (e, tg) => { if (d == null && !inOpeningHold()) d = Math.min(...foes(e).map(p => Math.hypot(e.pos.x - p.x, e.pos.z - p.z))); return o(e, tg); };
    for (let f = 0; f < 60 * 60 && d == null && Game.mode === 'scenario'; f++) { stepGame(1 / 60); t = f / 60; }
    spawnEnemyBB = o; applyBBHit = hit;
    return { d: d && +d.toFixed(1), t: +t.toFixed(1) };
  });
  console.log(`   ${id}, first shot:`, JSON.stringify(f));
  check(`Winnmark: ${id} in the bulb's area: the first shot is fired at 10-40 m`, f.d != null && f.d >= 10 && f.d <= 40, f);
}
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30);
const far2 = await page.evaluate(() => { Game.mode = 'result'; enterBedroom(); return Game.camera.far; });
check('Winnmark: the camera goes back to 200 m in the bedroom', far2 === 200, far2);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
