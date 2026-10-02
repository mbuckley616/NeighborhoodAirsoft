// v1.116 (backlog D.3 step 2, the road and kerbs on Winnmark). The road is one ribbon mesh on the ground plus a polar bulb,
// with a concrete gutter and rolled kerb along both edges and round the bulb, dropped at the driveways; the ~115 asphalt
// discs are gone. Raycasts check the asphalt covers the old road (centreline ±3.4 m and the bulb), sits 3–9 cm over the
// ground, and that the kerb stands ~9 cm over the gutter except across a driveway. (Bunratty got the same road in v1.127.)
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const built = buildWinnmarkCourtScene('seth_house', 'day');
  const road = {}; let discs = 0;
  built.scene.traverse(m => {
    if (!m.isMesh) return;
    if (m.userData.wmRoad) (road[m.userData.wmRoad] = road[m.userData.wmRoad] || []).push(m);
    if (m.geometry.type === 'CircleGeometry' && m.geometry.parameters.radius >= 2.3 && m.material.color && m.material.color.getHex() === 0x3a3a3a) discs++;
  });
  out.kinds = Object.fromEntries(Object.entries(road).map(([k, v]) => [k, v.length]));
  out.meshes = Object.values(road).reduce((a, v) => a + v.length, 0);
  out.discs = discs;
  // the same bezier as _wmRoadPoint, and the ground (any obstacle's groundY is not exposed; sample the asphalt's own builder)
  const P = t => ({ x: (1 - t) * (1 - t) * 34 + 2 * (1 - t) * t * 4 + t * t * -30, z: 2 * (1 - t) * t * 7 });
  const D = t => { const x = 2 * (1 - t) * (4 - 34) + 2 * t * (-30 - 4), z = 2 * (1 - t) * 7 - 2 * t * 7, l = Math.hypot(x, z); return { nx: -z / l, nz: x / l }; };
  const gY = (x, z) => { const u = Math.max(0, Math.min(1, (x - 38) / (-32 - 38))), s = u * u * (3 - 2 * u); return 3.0 * (1 - s) + 0.25 * Math.sin(z * 0.12 + 0.5) * Math.cos(x * 0.1); };
  const ray = new THREE.Raycaster(); const down = new THREE.Vector3(0, -1, 0);
  const hitY = (list, x, z) => { ray.set(new THREE.Vector3(x, 30, z), down); const h = ray.intersectObjects(list, false); return h.length ? h[0].point.y : null; };
  const asph = [...(road.asphalt || []), ...(road.bulb || [])];
  let n = 0, miss = 0, lo = 1, hi = -1;
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const p = P(t), d = D(t);
    for (let o = -3.4; o <= 3.401; o += 0.85) {
      const x = p.x + d.nx * o, z = p.z + d.nz * o;
      const y = hitY(asph, x, z); n++;
      if (y === null) { miss++; continue; }
      const dy = y - gY(x, z); lo = Math.min(lo, dy); hi = Math.max(hi, dy);
    }
  }
  for (let r = 0; r <= 6.01; r += 1) for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const x = -30 + Math.cos(a) * r, z = Math.sin(a) * r, y = hitY(asph, x, z); n++;
    if (y === null) { miss++; continue; }
    const dy = y - gY(x, z); lo = Math.min(lo, dy); hi = Math.max(hi, dy);
  }
  out.cover = { n, miss, lo: +lo.toFixed(3), hi: +hi.toFixed(3) };
  // the kerb top (3.45 + 0.61 m out) along both sides: full height away from driveways, dropped across them
  const drives = [[24, -1], [8, -1], [-8, -1], [-18, -1], [22, 1], [7, 1], [-9, 1], [-17, 1]];   // houseCenters' x, and the side (−1 north)
  const kerb = road.kerb || [];
  const full = [], dropped = [];
  for (let t = 0.02; t <= 0.8; t += 0.005) {
    const p = P(t), d = D(t);
    for (const side of [-1, 1]) {
      const x = p.x + d.nx * side * 4.06, z = p.z + d.nz * side * 4.06;
      if (Math.hypot(x + 30, z) < 7.2) continue;
      const north = z < p.z ? -1 : 1;
      const dist = Math.min(...drives.filter(([, s]) => s === north).map(([dx]) => Math.abs(x - dx)));
      const y = hitY(kerb, x, z); if (y === null) continue;
      const hgt = y - gY(x, z) - 0.06;
      if (dist > 2.7) full.push(hgt); else if (dist < 2.0) dropped.push(hgt);
    }
  }
  const stat = a => a.length ? { n: a.length, min: +Math.min(...a).toFixed(3), max: +Math.max(...a).toFixed(3) } : { n: 0 };
  out.kerbFull = stat(full); out.kerbDropped = stat(dropped);
  built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  // Bunratty: the disc road until v1.127, the same builder since
  const bn = buildBunrattyCourtScene(undefined, 'day'); let bd = 0, bk = 0;
  bn.scene.traverse(m => { if (m.isMesh && m.geometry.type === 'CircleGeometry' && m.geometry.parameters.radius >= 2.3) bd++; if (m.userData && m.userData.wmRoad) bk++; });
  out.bunratty = { discs: bd, wmRoad: bk };
  bn.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  return out;
});
console.log('  ', JSON.stringify(res));
check('Winnmark: asphalt ribbon, bulb, kerb and road marks, in a handful of meshes', res.kinds.asphalt === 1 && res.kinds.bulb === 1 && res.kinds.kerb === 1 && res.kinds.marks >= 1 && res.meshes <= 8, res.kinds);
check('the asphalt discs are gone', res.discs === 0, res.discs);
check('the asphalt covers the old road (centreline ±3.4 m, and the bulb) with no gaps', res.cover.miss === 0 && res.cover.n > 800, res.cover);
check('the asphalt sits 3–9 cm over the ground everywhere', res.cover.lo >= 0.03 && res.cover.hi <= 0.09, res.cover);
check('the kerb stands 6–12 cm over the gutter away from the driveways', res.kerbFull.n > 100 && res.kerbFull.min >= 0.06 && res.kerbFull.max <= 0.12, res.kerbFull);
check('the kerb drops flat (under 2 cm) across each driveway', res.kerbDropped.n > 20 && res.kerbDropped.max <= 0.02, res.kerbDropped);
check('Bunratty has the same road since v1.127 (no discs; tests/bunratty-road.test.mjs checks it)', res.bunratty.discs === 0 && res.bunratty.wmRoad >= 4, res.bunratty);

// a look down the street
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
await page.evaluate(() => { const p = Game.player; const put = () => { p.pos.x = 12; p.pos.z = 1; p.yaw = Math.PI / 2 - 0.25; p.pitch = -0.12; }; put(); stepGame(1 / 60); put(); });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('winnmark-road');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('   draw calls, looking down the street:', calls);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
