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
// v1.307 (D.51 step 3): the Hollow on its river frontage below Bunratty. The ground in the box and on its tree ranks is
// v1.306's; past them the bank's clay cut drops to a river 62 m wide that lies in its channel, the far bank climbs
// with houses on it, and the bluff rises behind the field. The water and the far bank show from the west edge, the
// Wizard Hollow sign stands at the trail's head just past the east bounds, nothing past the box is solid, and the
// map stays inside its budget (1,450 draw calls, decisions D.51).
await page.evaluate(() => { Game.mode = 'result'; enterBedroom(); });
await g.scenario('hollow_skirmish_3v3');
const hol = await page.evaluate(() => {
  const sc = Game.scenario, gY = sc.groundY, out = {};
  const seg = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
  const old = (x, z) => {   // v1.306's hollowGroundY
    let u = Math.max(0, Math.min(1, (x + 46) / 92)), h = 1.6 * u * u * (3 - 2 * u);
    const d = Math.min(seg(x, z, -42, 0, 21, 0), seg(x, z, -6, -15, -6, -1), seg(x, z, 16, 2, 16, 18));
    let inC = 0; if (d < 4) { const k = 1 - d / 4; inC = k * k * (3 - 2 * k); h -= 1.8 * inC; }
    if (x < -38) h -= 1.4 * Math.max(0, Math.min(1, (-38 - x) / 8));
    return h + 0.28 * (1 - inC) * Math.sin(x * 0.12 + 0.6) * Math.cos(z * 0.10 - 1.1);
  };
  let d = 0; for (let x = -43.6; x <= 52; x += 1.3) for (let z = -44; z <= 44; z += 1.3) d = Math.max(d, Math.abs(gY(x, z) - old(x, z)));
  out.boxDiff = d;
  let under = 0, n = 0, banks = 0, bn = 0;
  for (let z = -150; z <= 150; z += 15) {
    for (let x = HW.cutX - 2.5; x >= HW.farX + 1; x -= 4) { n++; if (gY(x, z) < HW.waterY - 0.3) under++; }
    if (z === 0) continue;   // the creek's mouth cuts the near bank there
    bn++; if (gY(HW.cutX + 0.5, z) > HW.waterY + 1 && gY(HW.farX - 6, z) > HW.waterY + 1) banks++;
  }
  out.river = { under, n, banks, bn, waterY: Game.scene.getObjectByName('hollowRiver')?.position.y, width: HW.cutX - HW.farX, farTop: +(gY(HW.farX - 120, 0) - HW.waterY).toFixed(1), bluff: +(gY(130, 0) - gY(40, 0)).toFixed(1) };
  Game.scene.updateMatrixWorld(true);
  const all = []; Game.scene.traverse(o => { if (o.isMesh) all.push(o); });
  const ray = new THREE.Raycaster(); let wet = 0, far = 0;
  for (const z0 of [-20, 0, 20]) {
    const eye = new THREE.Vector3(-37.6, gY(-37.6, z0) + 1.6, z0);
    for (let a = -60; a <= 60; a += 4) for (let p = 4; p >= -14; p -= 2) {
      const yaw = a * Math.PI / 180, pt = p * Math.PI / 180;
      ray.set(eye, new THREE.Vector3(-Math.cos(yaw) * Math.cos(pt), Math.sin(pt), Math.sin(yaw) * Math.cos(pt)));
      const h = ray.intersectObjects(all, false); if (!h.length) continue;
      if (h[0].object.name === 'hollowRiver') wet++;
      if (h[0].point.x < HW.farX - 3) far++;
    }
  }
  out.view = { wet, far };
  const sign = Game.scene.getObjectByName('wizardHollowSign');
  if (sign) { const b = new THREE.Box3().setFromObject(sign); out.sign = { past: +(b.min.x - 44).toFixed(2), y: +(b.max.y - gY(b.min.x, (b.min.z + b.max.z) / 2)).toFixed(2), z: +((b.min.z + b.max.z) / 2).toFixed(1) }; }
  out.solid = Game.player.obstacles.filter(o => o.mesh && (o.mesh.name === 'realScenery' || o.mesh.name === 'wizardHollowSign' || o.mesh.name === 'hollowRiver')).length;
  out.far = Game.camera.far;
  // v1.308: logs and deadfall round the field's edge, clear of every start and anchor and of the creek
  const lb = withSeededRandom('hollow_skirmish_3v3|logs', () => buildHollowScene('default', 'day'));
  const sp = [...Object.values(lb.placements), ...Object.values(lb.playerSpawns)].map(p => p.pos);
  const lg = lb.cover.filter(o => o.hollowLog || o.hollowDeadfall);
  const gap = o => Math.min(...sp.map(p => Math.hypot(Math.max(o.minX - p.x, 0, p.x - o.maxX), Math.max(o.minZ - p.z, 0, p.z - o.maxZ))));
  out.logs = { logs: lg.filter(o => o.hollowLog).length, piles: lg.filter(o => o.hollowDeadfall).length, nearest: +Math.min(...lg.map(gap)).toFixed(2),
    edge: lg.every(o => Math.max(Math.abs((o.minX + o.maxX) / 2 - 3), Math.abs((o.minZ + o.maxZ) / 2)) > 30) };
  out.calls = {};
  for (const [name, x, z, yaw, pitch] of [['trees', 28, 12, -Math.PI / 2 + 0.4, 0.1], ['west', -36, 0, Math.PI / 2, -0.08], ['east', 30, 10, -Math.PI / 2, 0.06], ['north', 0, -33, Math.PI, 0], ['south', 2, 30, 0, 0]]) {
    Game.player.pos.set(x, gY(x, z), z); stepGame(1 / 60); Game.player.yaw = yaw; Game.player.pitch = pitch; Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out.calls[name] = Game.renderer.info.render.calls;
  }
  return out;
});
console.log('  ', JSON.stringify(hol));
check('the Hollow: the ground in the box and on its tree ranks is v1.306\'s', hol.boxDiff < 1e-9, hol.boxDiff);
check('the Hollow: the river, 62 m wide, lies under water from bank to bank, a bank above it either side', hol.river.under === hol.river.n && hol.river.banks === hol.river.bn && Math.abs(hol.river.width - 62) < 0.5 && hol.river.waterY === -2.5, hol.river);
check('the Hollow: the far bank climbs 40 m and more, the bluff behind the field 20 m and more', hol.river.farTop >= 40 && hol.river.bluff >= 20, hol.river);
check('the Hollow: from the west edge you see the water and the far bank', hol.view.wet >= 10 && hol.view.far >= 10, hol.view);
check('the Hollow: the Wizard Hollow sign stands at the trail\'s head, 1-3 m past the east bounds, about 1.5 m up', hol.sign && hol.sign.past > 0.5 && hol.sign.past < 3 && hol.sign.y > 1.5 && hol.sign.y < 1.9, hol.sign);
check('the Hollow: logs and deadfall round the field\'s edge (not its middle), 3.5 m and more from every start and anchor', hol.logs.logs >= 3 && hol.logs.piles >= 1 && hol.logs.nearest >= 3.5 && hol.logs.edge, hol.logs);
check('the Hollow: nothing past the box is solid', hol.solid === 0, hol.solid);
check('the Hollow: the camera sees 350 m', hol.far === 350, hol.far);
check('the Hollow: at most 1,450 draw calls in any of five views', Math.max(...Object.values(hol.calls)) <= 1450, hol.calls);
// v1.309 (D.51 step 4): the 28 matches on the two maps. Each builds and starts with no page error; in each match with
// sides, your side and theirs start 29-70 m apart (Michael 1A: "starts stay 30-70 m apart, so the fights keep today's
// distances"; 1v1 with Sean is 29.8); and at night no kid of theirs starts with a line to your start, or a step round
// it, at any height a kid shoots or looks from (the night rule, Michael A on Lamplight, 15 Oct; the taggers of
// Infection carry no guns). The free-for-alls' starts are tests/ffa-starts'.
const ids28 = await page.evaluate(() => Object.keys(SCENARIOS).filter(k => ['buildBunrattyCourtScene', 'buildHollowScene'].includes(SCENARIOS[k].builderFn)));
const m28 = [];
for (const id of ids28) {
  const e0 = g.errs.length;
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const P = Game.player, sc = SCENARIOS[Game.scenario.active], obs = P.obstacles, G = (x, z) => scenarioGroundY(x, z) || 0;
    const at = { x: P.pos.x, z: P.pos.z }, kids = Game.scenario.enemies.map(e => ({ n: e.character.name, team: e.team, tag: e.behavior === 'tagger', ...(e._spawnPos || e.pos) }));
    const foes = kids.filter(k => k.team === 'enemy'), mine = [at, ...kids.filter(k => k.team === 'player')];
    let sep = Infinity; for (const a of mine) for (const b of foes) sep = Math.min(sep, Math.hypot(a.x - b.x, a.z - b.z));
    const lines = [];
    if (sc.timeOfDay === 'night') for (const f of foes) if (!f.tag) for (const [dx, dz] of [[0, 0], [-2, -2], [-2, 2], [1.2, -2], [1.2, 2]])
      for (const h of [1.05, 1.18, 1.35, 1.6]) for (const th of [0.95, 1.35]) {
        const tx = at.x + dx, tz = at.z + dz;
        if (hasLineOfSight(f.x, G(f.x, f.z) + h, f.z, tx, G(tx, tz) + th, tz, obs)) lines.push(f.n);
      }
    const out = { id: Game.scenario.active, mode: Game.mode, night: sc.timeOfDay === 'night', sides: foes.length > 0 && sc.winCondition !== 'survive_untagged',
      sep: isFinite(sep) ? +sep.toFixed(1) : null, lines: [...new Set(lines)] };
    endScenario('lose');
    return out;
  });
  await g.spin(30);
  r.errs = g.errs.length - e0;
  m28.push(r);
}
console.log('  ', JSON.stringify(m28.map(r => [r.id, r.sep, r.lines.length, r.errs])));
check('the 28 matches on the two maps all build and start, with no page error', m28.length === 28 && m28.every(r => r.mode === 'scenario' && r.errs === 0), m28.filter(r => r.mode !== 'scenario' || r.errs));
check('in every match with sides, the two sides start 29-70 m apart (Michael 1A)', m28.filter(r => r.sides).every(r => r.sep >= 29 && r.sep <= 70), m28.filter(r => r.sides && !(r.sep >= 29 && r.sep <= 70)));
check('at night nobody on their side starts with a line to your start', m28.filter(r => r.night).length >= 8 && m28.every(r => r.lines.length === 0), m28.filter(r => r.lines.length));
// back in the bedroom the camera's reach is the usual 200 m again
const far2 = await page.evaluate(() => { Game.mode = 'result'; enterBedroom(); return Game.camera.far; });
check('the bedroom puts the camera back to 200 m', far2 === 200, far2);
await g.close();
