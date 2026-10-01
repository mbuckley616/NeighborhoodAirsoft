// v1.114 (backlog D.3 step 2, the fort and yard props: Winnmark's kid fort). Both Winnmark forts (the bulb fort and the
// treehouse-defend fort) are the built-up fort: plywood sheets on a frame, posts, top plates, bracing, KEEP OUT on the
// attackers' face. The wall boxes are unchanged, and nothing drawn reaches outside the fort's footprint or above its walls;
// Bunratty's fort is still the slab fort.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  // the same fort, slab and detailed: identical boxes; the detailed one inside the footprint and under the wall top
  const cmp = [];
  for (const [fx, fz, o] of [[-29, 0, { faceDir: 'E', width: 3.6, depth: 2.2 }], [33, 0, { faceDir: 'W', width: 3.8, depth: 2.4 }]]) {
    const sA = new THREE.Scene(), sB = new THREE.Scene();
    const a = buildKidFort(sA, fx, fz, { ...o }), b = buildKidFort(sB, fx, fz, { ...o, detail: true });
    const key = w => [w.minX, w.maxX, w.minZ, w.maxZ, w.h].map(v => v.toFixed(4)).join(',');
    const walls = b.slice(0, 3);
    const fp = { minX: Math.min(...walls.map(w => w.minX)), maxX: Math.max(...walls.map(w => w.maxX)),
      minZ: Math.min(...walls.map(w => w.minZ)), maxZ: Math.max(...walls.map(w => w.maxZ)) };
    const bb = new THREE.Box3().setFromObject(b[0].mesh);
    let meshesA = 0, meshesB = 0;
    a[0].mesh.traverse(m => { if (m.isMesh) meshesA++; }); b[0].mesh.traverse(m => { if (m.isMesh) meshesB++; });
    let tris = 0; b[0].mesh.traverse(m => { if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
    cmp.push({ same: a.length === b.length && a.every((w, i) => key(w) === key(b[i])), detail: !!b[0].mesh.userData.fortDetail,
      paint: b[0].mesh.children.some(c => c.userData.fortPaint),
      out: +Math.max(fp.minX - bb.min.x, bb.max.x - fp.maxX, fp.minZ - bb.min.z, bb.max.z - fp.maxZ).toFixed(3),
      top: +bb.max.y.toFixed(3), bottom: +bb.min.y.toFixed(3), h: walls[0].h, meshesA, meshesB, tris: Math.round(tris) });
  }
  out.cmp = cmp;
  // the forts as built on the maps
  const forts = (built) => { const s = new Set(); for (const o of built.obstacles) if (o.mesh && o.mesh.children && o.mesh.children.length && o.h > 1.05 && o.h < 1.2 && o.surface === 'hard' && (o.mesh.userData.fortDetail || o.mesh.children.length >= 6)) s.add(o.mesh); return [...s]; };
  for (const [name, fn, v] of [['wm_culdesac', 'buildWinnmarkCourtScene', 'cul_de_sac'], ['wm_treehouse', 'buildWinnmarkCourtScene', 'treehouse'], ['bunratty', 'buildBunrattyCourtScene', undefined]]) {
    const built = window[fn](v, 'day');
    const f = forts(built);
    out[name] = { forts: f.length, detail: f.filter(m => m.userData.fortDetail).length };
    built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  }
  return out;
});
console.log('  ', JSON.stringify(res));
for (const [i, c] of res.cmp.entries()) {
  const nm = i ? 'treehouse fort' : 'bulb fort';
  check(`${nm}: the detailed fort has the same wall and bin boxes as the slab fort`, c.same && c.detail, c);
  check(`${nm}: nothing drawn outside the footprint (screw heads and paint sit 5 mm proud) or above the walls`, c.out <= 0.006 && c.top <= c.h + 0.001 && c.bottom >= -0.001, c);
  check(`${nm}: KEEP OUT on the back wall, fewer meshes than the slab fort`, c.paint && c.meshesB < c.meshesA, c);
}
check('Winnmark cul-de-sac: the bulb fort is the detailed fort', res.wm_culdesac.forts >= 1 && res.wm_culdesac.detail === res.wm_culdesac.forts, res.wm_culdesac);
check('Winnmark treehouse: both forts are the detailed fort', res.wm_treehouse.forts >= 2 && res.wm_treehouse.detail === res.wm_treehouse.forts, res.wm_treehouse);
check('Bunratty keeps the slab fort', res.bunratty.forts >= 1 && res.bunratty.detail === 0, res.bunratty);

// a look at the bulb fort from the attackers' side
await g.scenario('winnmark_defend_culdesac');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
await page.evaluate(() => { for (const e of Game.scenario.enemies || []) { e.pos.x = 40; } });
await page.evaluate(() => { const p = Game.player; p.pos.x = -24.5; p.pos.z = 1.6; stepGame(1 / 60); p.pos.x = -24.5; p.pos.z = 1.6; p.yaw = Math.atan2(-(-29 - p.pos.x), -(0 - p.pos.z)) ; p.pitch = -0.12; stepGame(1 / 60); p.yaw = Math.atan2(-(-29 - p.pos.x), -(0 - p.pos.z)); p.pitch = -0.12; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('winnmark-fort');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
