// v1.127 (backlog D.3 step 4, Bunratty's road). The lane's 73 asphalt discs and the bulb's 19 are gone: Bunratty uses
// Winnmark's road builder (buildStreetRoad) along its S-curve, a ribbon mesh on the ground plus a polar bulb, with a
// concrete gutter and 9 cm rolled kerb along both edges and round the bulb, dropped across each driveway (the hero
// house's off the bulb too). Raycasts check the asphalt covers the old road (centreline ±3.4 m and the bulb), sits
// 3–9 cm over the ground, and the kerb heights. Winnmark's road must come out as it was before the builder moved.
import { boot, check } from './lib/game.mjs';
const WM_V126 = { asphalt: 1539, bulb: 280, kerb: 9384, marks: 594 };   // Winnmark's road vertex counts on v1.126 (positions matched too, by probe)
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const built = buildBunrattyCourtScene('default', 'day');
  const gY = built.groundY;
  const road = {}; let discs = 0;
  built.scene.traverse(m => {
    if (!m.isMesh) return;
    if (m.userData.wmRoad) (road[m.userData.wmRoad] = road[m.userData.wmRoad] || []).push(m);
    if (m.geometry.type === 'CircleGeometry' && m.geometry.parameters.radius >= 2.3) discs++;
  });
  out.kinds = Object.fromEntries(Object.entries(road).map(([k, v]) => [k, v.length]));
  out.meshes = Object.values(road).reduce((a, v) => a + v.length, 0);
  out.discs = discs;
  // the lane's cubic bezier (roadPoint) and its tangent
  const A = { x: -38, z: 0 }, C1 = { x: -14, z: -10 }, C2 = { x: 14, z: 12 }, B = { x: 34, z: 2 };
  const P = t => { const m = 1 - t; return { x: m*m*m*A.x + 3*m*m*t*C1.x + 3*m*t*t*C2.x + t*t*t*B.x, z: m*m*m*A.z + 3*m*m*t*C1.z + 3*m*t*t*C2.z + t*t*t*B.z }; };
  const D = t => { const m = 1 - t; const x = 3*m*m*(C1.x - A.x) + 6*m*t*(C2.x - C1.x) + 3*t*t*(B.x - C2.x), z = 3*m*m*(C1.z - A.z) + 6*m*t*(C2.z - C1.z) + 3*t*t*(B.z - C2.z), l = Math.hypot(x, z); return { nx: -z / l, nz: x / l }; };
  const ray = new THREE.Raycaster(); const down = new THREE.Vector3(0, -1, 0);
  const hitY = (list, x, z) => { ray.set(new THREE.Vector3(x, 40, z), down); const h = ray.intersectObjects(list, false); return h.length ? h[0].point.y : null; };
  const asph = [...(road.asphalt || []), ...(road.bulb || [])];
  let n = 0, miss = 0, lo = 1, hi = -1;
  for (let t = 0; t <= 0.93; t += 0.01) {   // the bulb takes over at ~5 m from its centre
    const p = P(t), d = D(t);
    for (let o = -3.4; o <= 3.401; o += 0.85) {
      const x = p.x + d.nx * o, z = p.z + d.nz * o;
      const y = hitY(asph, x, z); n++;
      if (y === null) { miss++; continue; }
      const dy = y - gY(x, z); lo = Math.min(lo, dy); hi = Math.max(hi, dy);
    }
  }
  for (let r = 0; r <= 6.21; r += 1.2) for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const x = 34 + Math.cos(a) * r, z = 2 + Math.sin(a) * r, y = hitY(asph, x, z); n++;
    if (y === null) { miss++; continue; }
    const dy = y - gY(x, z); lo = Math.min(lo, dy); hi = Math.max(hi, dy);
  }
  out.cover = { n, miss, lo: +lo.toFixed(3), hi: +hi.toFixed(3) };
  // the road runs out through the west tree-wall gap (x −40)
  out.westEnd = hitY(asph, -40.5, P(0).z) !== null;
  // the kerb top (3.45 + 0.61 m out) along both sides of the lane: full height away from the driveways, dropped across
  const drives = [[-28, -1], [-6, -1], [16, -1], [-30, 1], [-8, 1], [12, 1], [33, 1]];   // houseDefs' x, and side (−1 north)
  const kerb = road.kerb || [];
  const full = [], dropped = [];
  for (let t = 0.02; t <= 0.9; t += 0.004) {
    const p = P(t), d = D(t);
    for (const side of [-1, 1]) {
      const x = p.x + d.nx * side * 4.06, z = p.z + d.nz * side * 4.06;
      if (Math.hypot(x - 34, z - 2) < 7.4) continue;
      const north = z < p.z ? -1 : 1;
      const dist = Math.min(...drives.filter(([, s]) => s === north).map(([dx]) => Math.abs(x - dx)));
      const y = hitY(kerb, x, z); if (y === null) continue;
      const hgt = y - gY(x, z) - 0.06;
      if (dist > 2.7) full.push(hgt); else if (dist < 2.0) dropped.push(hgt);
    }
  }
  // round the bulb: full except across the hero house's drive (x 33, south)
  const bulbFull = [], bulbDrop = [];
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = 34 + Math.cos(a) * (6.5 + 0.61), z = 2 + Math.sin(a) * (6.5 + 0.61);
    if (x < 30) continue;   // the mouth where the lane comes in
    const y = hitY(kerb, x, z); if (y === null) continue;
    const hgt = y - gY(x, z) - 0.06;
    if (z > 2 && Math.abs(x - 33) < 2.0) bulbDrop.push(hgt); else if (z <= 2 || Math.abs(x - 33) > 2.7) bulbFull.push(hgt);
  }
  const stat = a => a.length ? { n: a.length, min: +Math.min(...a).toFixed(3), max: +Math.max(...a).toFixed(3) } : { n: 0 };
  out.kerbFull = stat(full); out.kerbDropped = stat(dropped); out.bulbFull = stat(bulbFull); out.bulbDrop = stat(bulbDrop);
  built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  // Winnmark's road, through the shared builder: the same pieces and vertex counts as v1.126
  const wm = buildWinnmarkCourtScene('seth_house', 'day'); const wk = {};
  wm.scene.traverse(m => { if (m.isMesh && m.userData.wmRoad) wk[m.userData.wmRoad] = (wk[m.userData.wmRoad] || 0) + m.geometry.attributes.position.count; });
  out.winnmark = wk;
  wm.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  return out;
});
console.log('  ', JSON.stringify(res));
check('Bunratty: asphalt ribbon, bulb, kerb and road marks, in a handful of meshes', res.kinds.asphalt === 1 && res.kinds.bulb === 1 && res.kinds.kerb === 1 && res.kinds.marks >= 1 && res.meshes <= 8, res.kinds);
check('the asphalt discs are gone', res.discs === 0, res.discs);
check('the asphalt covers the old lane (centreline ±3.4 m, and the bulb) with no gaps', res.cover.miss === 0 && res.cover.n > 700, res.cover);
check('the asphalt sits 3–9 cm over the ground everywhere', res.cover.lo >= 0.03 && res.cover.hi <= 0.09, res.cover);
check('the road runs out through the west tree-wall gap', res.westEnd);
check('the kerb stands 6–12 cm over the gutter away from the driveways', res.kerbFull.n > 100 && res.kerbFull.min >= 0.06 && res.kerbFull.max <= 0.12, res.kerbFull);
check('the kerb drops flat (under 2 cm) across each driveway', res.kerbDropped.n > 20 && res.kerbDropped.max <= 0.02, res.kerbDropped);
check('round the bulb the kerb stands 6–12 cm', res.bulbFull.n > 50 && res.bulbFull.min >= 0.06 && res.bulbFull.max <= 0.12, res.bulbFull);
check('and drops flat across the hero house\'s drive', res.bulbDrop.n > 5 && res.bulbDrop.max <= 0.02, res.bulbDrop);
check('Winnmark\'s road is what it was (v1.126 vertex counts)', JSON.stringify(res.winnmark) === JSON.stringify(WM_V126), res.winnmark);

// a look up the lane, and one into the bulb
await g.scenario('bunratty_sean');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
const look = async (x, z, yaw, pitch, name) => {
  await page.evaluate(([x, z, yaw, pitch]) => { const p = Game.player; const put = () => { p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = pitch; }; for (let i = 0; i < 60; i++) { put(); stepGame(1 / 60); } put(); }, [x, z, yaw, pitch]);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await g.shot(name);
  return page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
};
const c1 = await look(-33, 1, -Math.PI / 2 - 0.2, -0.12, 'bunratty-road');
const c2 = await look(23, 5.5, -Math.PI / 2 + 0.1, -0.15, 'bunratty-bulb-road');
console.log('   draw calls, up the lane / into the bulb:', c1, c2);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
