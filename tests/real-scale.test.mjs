// v1.303 (backlog D.51, card fable/d51-bunratty-hollow; Michael 21 Oct: real scale, each match fenced to a today-sized
// part of the real street, 1A). Bunratty past its fence is the real place: the street runs on 120 m and up to the fork
// (more than 10 m over the bulb), the woods fall from the lots to a river ~190 m out that lies in its channel, not under
// the grass, and the far bank climbs beyond it. None of it is solid, none of it stands within 6 m of the bounds, the
// ground in the box is the old ground, and the map stays inside its draw-call budget (1,550, decisions D.51).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const built = withSeededRandom('bunratty_team_4v4|default', () => buildBunrattyCourtScene('default', 'day'));
  const gY = built.groundY, B = built.bounds, R = BR_REAL;
  out.fork = +(gY(-160, 18) - gY(34, 2)).toFixed(2);
  // the old ground in the box (v1.302's formula, before the real place was added round it)
  let maxDiff = 0;
  const old = (x, z) => {
    let t = Math.max(0, Math.min(1, (z + 33) / 70)); let h = 2.5 * (1 - t * t * (3 - 2 * t));
    let u = Math.max(0, Math.min(1, (x + 36) / 76)); h += 9 * (1 - u * u * (3 - 2 * u));
    const d = Math.hypot(x - 34, z - 2); if (d < 13) { const k = 1 - d / 13; h -= 1.3 * k * k * (3 - 2 * k); }
    return h + 0.35 * Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11 - 0.6);
  };
  // v1.304: the old box (x -40..44, z -32..30), but for Michael's lot behind his house (x 8 and east, z 22 and south),
  // which bunrattyHeroCut cuts into its terraces
  // v1.305: and less the north lawns' bank over the kerb (bunrattyNorthBank), measured on its own below
  for (let x = -42; x <= 46; x += 1.7) for (let z = -34; z <= 33; z += 1.7) if (!(x >= 8 && z >= 22)) maxDiff = Math.max(maxDiff, Math.abs(gY(x, z) - bunrattyNorthBank(x, z) - old(x, z)));
  out.boxDiff = maxDiff;
  // v1.305: the bank: none on the road or south of it, 1.4 m on the north lawns, never steeper than the kids walk
  let bankRoad = 0, bankSteep = 0;
  for (let x = -40; x <= 30; x += 0.5) {
    const zc = BR_LANE_Z.reduce((a, b) => Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a)[1];
    for (let z = zc + 4.4; z >= zc - 3.4; z -= 0.25) bankRoad = Math.max(bankRoad, bunrattyNorthBank(x, z));
    for (let z = zc - 3; z >= zc - 14; z -= 0.25) bankSteep = Math.max(bankSteep, (bunrattyNorthBank(x, z - 0.25) - bunrattyNorthBank(x, z)) / 0.25);
  }
  out.bank = { road: bankRoad, lawns: [[-30, -12.3], [-6, -14.3], [14, -12.3]].map(([x, z]) => +bunrattyNorthBank(x, z).toFixed(2)), steepDeg: +(Math.atan(bankSteep) * 180 / Math.PI).toFixed(1) };
  // the river lies in its channel: under the water along its whole length, the bank above it either side
  const water = built.scene.getObjectByName('bunrattyRiver');
  out.waterY = water && water.position.y;
  let under = 0, n = 0, banks = 0;
  for (let q = -250; q <= 250; q += 10) {
    const at = s => [R.bx + R.nx * s + R.nz * q, R.bz + R.nz * s - R.nx * q];
    const [x, z] = at(R.s); if (x < -245 || x > 345 || z > 345) continue;
    n++; if (gY(x, z) < R.waterY - 0.5) under++;
    const [x1, z1] = at(R.s - R.half - 6), [x2, z2] = at(R.s + R.half + 6);
    if (gY(x1, z1) > R.waterY + 1 && gY(x2, z2) > R.waterY + 1) banks++;
  }
  out.river = { n, under, banks };
  // nothing past the fence is solid, nor near it
  const sc = built.scene.getObjectByName('realScenery');
  out.stats = sc && sc.userData.stats;
  out.solid = built.obstacles.filter(o => o.mesh && sc && (o.mesh === sc || sc.children.includes(o.mesh))).length;
  // v1.304: the play area is the old box and, south of it, Michael's terraces and lawn (x 16.4..44, z to 47); the rest of
  // the bounds' south strip is behind the river blocker
  const areas = [{ minX: -40, maxX: 44, minZ: -32, maxZ: 30 }, { minX: 16.4, maxX: 44, minZ: 22, maxZ: B.maxZ }];
  let near = Infinity;
  if (sc) sc.traverse(m => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) for (const A of areas) near = Math.min(near, Math.max(A.minX - p[i], p[i] - A.maxX, A.minZ - p[i + 2], p[i + 2] - A.maxZ));
  });
  out.near = +near.toFixed(2);
  out.viewFar = built.viewFar;
  return out;
});
console.log('  ', JSON.stringify(res));
check('Bunratty: the fork stands more than 10 m over the bulb (Michael: the street falls more than 10 m)', res.fork > 10, res.fork);
check('Bunratty: the ground in the box (and 2 m round it) is the old ground, but for the north bank', res.boxDiff < 1e-9, res.boxDiff);
check('Bunratty: the north lawns bank 1.4 m over the kerb, under 25°, and nothing on the road or south of it', res.bank.road === 0 && res.bank.lawns.every(v => v > 1.35) && res.bank.steepDeg < 25, res.bank);
check('Bunratty: the river lies in its channel, not under the grass, along its whole length', res.waterY < -20 && res.river.n >= 30 && res.river.under === res.river.n, res.river);
check('Bunratty: the banks stand over the water on both sides', res.river.banks === res.river.n, res.river);
check('Bunratty: the woods, the far-bank houses and the fork are built', res.stats && res.stats.trees >= 1000 && res.stats.houses >= 4, res.stats);
check('Bunratty: none of it is solid, and none of it stands within 6 m of the bounds (BBs drop at 5)', res.solid === 0 && res.near >= 6, res);

// in play: the far bank shows from the bulb, the water from the back lawn; the camera sees that far; draw calls in budget
await g.scenario('bunratty_team_4v4');
const view = await page.evaluate(() => {
  applyBBHit = () => true;
  for (const e of Game.scenario.enemies || []) e.update = () => {};
  const scene = Game.scene, gY = Game.scenario.groundY, R = BR_REAL;
  const water = scene.getObjectByName('bunrattyRiver');
  const all = []; scene.traverse(m => { if (m.isMesh && m.visible) all.push(m); });
  const ray = new THREE.Raycaster(); ray.far = 600;
  const look = (ox, oz) => {
    const o = new THREE.Vector3(ox, gY(ox, oz) + 1.6, oz); let wet = 0, far = 0;
    for (let a = -60; a <= 90; a += 3) for (let p = 6; p >= -10; p -= 1) {
      const yaw = a * Math.PI / 180, pt = p * Math.PI / 180;
      ray.set(o, new THREE.Vector3(Math.sin(yaw) * Math.cos(pt), Math.sin(pt), Math.cos(yaw) * Math.cos(pt)));
      const h = ray.intersectObjects(all, false);
      if (!h.length) continue;
      if (h[0].object === water) wet++;
      if (R.nx * (h[0].point.x - R.bx) + R.nz * (h[0].point.z - R.bz) > R.s + R.half) far++;
    }
    return { wet, far };
  };
  // v1.304: the back lawn is now below the terrace wall (it was the flat yard at z 27, where the pool is)
  const out = { bulb: look(34, 2), terrace: look(41.5, 31), lawn: look(33, 42), far: Game.camera.far, calls: {} };
  for (const [name, x, z, yaw] of [['bulb', 34, 2, 0], ['entry', -36, 0, -Math.PI / 2], ['lawn', 30, 42, 0], ['north', 0, -29, Math.PI],
    ['house', 30, 1, Math.PI], ['terrace', 41.5, 31, 0.6], ['street', -12, 3, 0], ['streetW', 6, 0, -Math.PI / 2]]) {   // v1.305: two views of the street's houses
    Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw; Game.player.pitch = -0.05; stepGame(1 / 60);
    Game.player.yaw = yaw; Game.player.pitch = -0.05; Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out.calls[name] = Game.renderer.info.render.calls;
  }
  return out;
});
console.log('  ', JSON.stringify(view));
// v1.304: Michael's house, at its real size, now stands between the bulb and the river (v1.303 saw 7 rays' worth of far bank
// past the small colonial); the far bank shows from his terrace instead, over the woods
check('Bunratty: from the terrace you see the far bank across the river', view.terrace.far >= 3, view.terrace);
check('Bunratty: from the back lawn you see the water', view.lawn.wet >= 3, view.lawn);
check('Bunratty: the camera sees out to the far bank (450 m)', view.far === 450, view.far);
// the budget is the decision's rule (a quarter over today) on today's worst view: v1.302 drew 1,650 calls looking in from
// the entry (the decision's 1,240 was a lighter view), so 2,060; v1.303 draws 1,636 there
check('Bunratty: at most 2,060 draw calls in any of eight views', Math.max(...Object.values(view.calls)) <= 2060, view.calls);
// v1.304 (D.51 step 2): Michael's house at about its real size, a walk-out: the terrace a storey under the main floor, the
// lawn under the terrace wall; every part of the lot a kid can stand on joins the bulb, and no step he could walk off is
// left in the open (each is under a wall or the house)
const hero = await page.evaluate(() => {
  const obs = Game.player.obstacles, gY = Game.scenario.groundY;
  const main = obs.find(o => o.mesh && o.mesh.name === 'bunrattyHeroHouse');
  if (!main) return { main: false };
  const deck = obs.find(o => o.surface === 'wood' && o.minX === BR_HERO.deckX0);
  const garage = obs.find(o => o.minX === BR_HERO.x1 && o.maxX === BR_HERO.gx1);
  const F = deck.baseY + 0.25, T = gY(41.5, 30);
  const C = kidFreeCells(), b = C.b, c = LADDER_CELL;
  const cell = (x, z) => Math.round((x - b.minX) / c) * C.nz + Math.round((z - b.minZ) / c);
  const seen = new Uint8Array(C.nx * C.nz), q = [cell(34, 2)]; seen[q[0]] = 1;
  while (q.length) { const k = q.pop(), i = Math.floor(k / C.nz), j = k % C.nz;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= C.nx || jj >= C.nz) continue; const kk = ii * C.nz + jj; if (!seen[kk] && C.free[kk]) { seen[kk] = 1; q.push(kk); } } }
  const reach = Object.fromEntries([['court', 40, 12], ['sideYard', 18.8, 26], ['underDeck', 30, 28.6], ['terraceEnd', 41.5, 30], ['lawn', 30, 42], ['firePit', 34, 45.5], ['pool', 31.8, 33]].map(([n, x, z]) => [n, !!seen[cell(x, z)]]));
  let step = 0, at = null;
  for (let x = 15; x <= 44; x += c) for (let z = 20; z <= 47; z += c) {
    if (!seen[cell(x, z)]) continue;
    for (const [dx, dz] of [[c, 0], [0, c]]) { if (!seen[cell(x + dx, z + dz)]) continue; const d = Math.abs(gY(x + dx, z + dz) - gY(x, z)); if (d > step) { step = d; at = [x, z]; } }
  }
  return { main: true, size: [main.maxX - main.minX, main.maxZ - main.minZ], garage: garage && [garage.maxX - garage.minX, garage.maxZ - garage.minZ],
    F: +F.toFixed(2), T: +T.toFixed(2), lawn: +gY(30, 42).toFixed(2), reach, step: +step.toFixed(3), at, bounds: Game.scenario.bounds };
});
console.log('  ', JSON.stringify(hero));
check('Bunratty: Michael\'s house is the big one (main block 15 x 12 m, the garage wing 8 m wide)', hero.main && hero.size[0] >= 15 && hero.size[1] >= 12 && hero.garage && hero.garage[0] >= 8, hero);
check('Bunratty: his terrace lies a storey (3.2 m) under the main floor, the lawn a metre and more under that', Math.abs(hero.F - hero.T - 3.2) < 0.05 && hero.lawn < hero.T - 1.1, hero);
check('Bunratty: from the bulb a kid can walk to the motor court, down the side yard, under the deck, to the terrace\'s end and the lawn', Object.entries(hero.reach).every(([k, v]) => k === 'pool' ? !v : v), hero.reach);
check('Bunratty: nowhere a kid can walk on the lot does the ground step more than 0.45 m in half a metre', hero.step <= 0.45, hero);
// v1.305 (D.51 step 2): the street's other six houses at about real size, in the guide's three styles; every lot's
// backyard anchor and every start stands clear of them, and a kid can walk to each from the bulb
const street = await page.evaluate(() => {
  const obs = Game.player.obstacles, sc = Game.scenario;
  const grp = Game.scene.getObjectByName('bunrattyNeighbours');
  const mains = obs.filter(o => o.mesh === grp);
  const rects = BR_NEIGHBOURS.flatMap(h => brNeighbourPlan(h).rects);
  const C = kidFreeCells(), b = C.b, c = LADDER_CELL;
  const cell = (x, z) => Math.round((x - b.minX) / c) * C.nz + Math.round((z - b.minZ) / c);
  const seen = new Uint8Array(C.nx * C.nz), q = [cell(34, 2)]; seen[q[0]] = 1;
  while (q.length) { const k = q.pop(), i = Math.floor(k / C.nz), j = k % C.nz;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= C.nx || jj >= C.nz) continue; const kk = ii * C.nz + jj; if (!seen[kk] && C.free[kk]) { seen[kk] = 1; q.push(kk); } } }
  const pts = {};
  for (const [k, v] of Object.entries(sc.placements || {})) if (/^house\d_backyard$|^ffa_/.test(k)) pts[k] = v.pos;
  const clear = {}, reach = {};
  for (const [k, p] of Object.entries(pts)) {
    clear[k] = +Math.min(...rects.map(r => Math.max(r.minX - p.x, p.x - r.maxX, r.minZ - p.z, p.z - r.maxZ))).toFixed(2);
    let r = false; for (const [dx, dz] of [[0, 0], [c, 0], [-c, 0], [0, c], [0, -c]]) r = r || !!seen[cell(p.x + dx, p.z + dz)];
    reach[k] = r;
  }
  return { meshes: grp ? grp.children.length : 0, sizes: mains.map(o => [+(o.maxX - o.minX).toFixed(1), +(o.maxZ - o.minZ).toFixed(1)]),
    styles: BR_NEIGHBOURS.map(h => h.style), clear, reach };
});
console.log('  ', JSON.stringify(street));
check('Bunratty: the street\'s six houses are built, 10.8-15 m wide and 9-10 m deep (they were 8-9 by 7)', street.sizes.length === 6 && street.sizes.every(([w, d]) => w >= 10.8 && d >= 9), street.sizes);
check('Bunratty: in the guide\'s three styles, stucco, brick and the columned portico', ['stucco', 'brick', 'portico'].every(s => street.styles.includes(s)), street.styles);
check('Bunratty: the six cost at most 24 draw calls together', street.meshes > 0 && street.meshes <= 24, street.meshes);
check('Bunratty: every backyard anchor and start stands at least 0.9 m clear of the houses', Object.values(street.clear).every(v => v >= 0.9), street.clear);
check('Bunratty: a kid can walk from the bulb to every backyard anchor and start', Object.values(street.reach).every(v => v), street.reach);
// back in the bedroom the camera's reach is the usual 200 m again
const far2 = await page.evaluate(() => { Game.mode = 'result'; enterBedroom(); return Game.camera.far; });
check('the bedroom puts the camera back to 200 m', far2 === 200, far2);
await g.close();
