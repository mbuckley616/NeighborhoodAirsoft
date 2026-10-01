// v1.112 (backlog D.3 step 2, Michael: A — go on to step 2, Winnmark's cars first): every car on Winnmark is the
// detailed car (profiled body with wheel arches, glass greenhouse and pillars, bumpers, grille, lights, plates,
// seams, handles, mirrors, hubcaps), merged to a few draw calls; its drawn shape stays inside the two collision
// boxes it always had; Bunratty and the lot still build the box car.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const inv = new THREE.Matrix4(), v = new THREE.Vector3();
  for (const fn of ['buildWinnmarkCourtScene', 'buildBunrattyCourtScene', 'buildMarketLotScene']) {
    const cars = [];
    for (let r = 0; r < 3; r++) {
      const built = window[fn](undefined, 'day');
      const bodies = built.obstacles.filter(o => o.shape === 'obox' && o.hx === 1.8 && Math.abs(o.hz - 0.775) < 1e-6 && o.baseYLocal === 0);
      for (const o of bodies) {
        const grp = o.mesh; grp.updateMatrixWorld(true); inv.copy(grp.matrixWorld).invert();
        let meshes = 0, tris = 0;
        const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
        grp.traverse(m => {
          if (!m.isMesh) return;
          meshes++;
          const pa = m.geometry.attributes.position;
          tris += (m.geometry.index ? m.geometry.index.count : pa.count) / 3;
          for (let i = 0; i < pa.count; i++) {
            v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
            bb.x0 = Math.min(bb.x0, v.x); bb.x1 = Math.max(bb.x1, v.x);
            bb.y0 = Math.min(bb.y0, v.y); bb.y1 = Math.max(bb.y1, v.y);
            bb.z0 = Math.min(bb.z0, v.z); bb.z1 = Math.max(bb.z1, v.z);
          }
        });
        const cab = o._stacked;
        cars.push({ detail: !!grp.userData.carDetail, meshes, tris: Math.round(tris),
          wheels: grp.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry').length,
          bb: Object.fromEntries(Object.entries(bb).map(([k, x]) => [k, +x.toFixed(3)])),
          cabin: cab ? [cab.offX, cab.hx, cab.hz, +cab.baseYLocal.toFixed(2), +cab.h.toFixed(2)] : null });
      }
      built.scene && built.scene.traverse && built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
    }
    out[fn] = cars;
  }
  return out;
});

const wm = res.buildWinnmarkCourtScene;
console.log('  winnmark car', JSON.stringify(wm[0]));
check('Winnmark has cars (3 builds)', wm.length >= 9, wm.length);
check('every Winnmark car is the detailed car', wm.every(c => c.detail), wm.map(c => c.detail));
check('each detailed car costs at most 12 meshes', wm.every(c => c.meshes <= 12), wm.map(c => c.meshes));
check('each keeps its four separate tyres', wm.every(c => c.wheels === 4), wm.map(c => c.wheels));
check('collision unchanged: cabin box at −0.15, 1.0 × 0.7 m, 1.15–1.70 m', wm.every(c => JSON.stringify(c.cabin) === JSON.stringify([-0.15, 1, 0.7, 1.15, 0.55])), wm[0].cabin);
// drawn shape inside the boxes: length ±1.8 (+ plates, bumpers, exhaust ≤ 0.1), width ±0.775 (+ mirrors, hubcaps ≤ 0.2),
// roof no higher than the cabin box's top (1.70)
const b = wm[0].bb;
check('drawn length within the body box (+10 cm for plates and bumpers)', b.x0 >= -1.9 && b.x1 <= 1.9, b);
check('drawn roof within the cabin box (≤ 1.71 m)', b.y1 <= 1.71, b.y1);
check('drawn width within the body box (+20 cm for mirrors and hubcaps)', b.z0 >= -0.98 && b.z1 <= 0.98, b);
check('nothing drawn below the tyres', b.y0 >= -0.001, b.y0);
check('more shape than the box car (> 1,000 triangles)', wm.every(c => c.tris > 1000), wm.map(c => c.tris));
for (const fn of ['buildBunrattyCourtScene', 'buildMarketLotScene']) {
  const cs = res[fn];
  check(`${fn.replace(/^build|Scene$/g, '')} still builds the box car`, cs.length > 0 && cs.every(c => !c.detail), cs.map(c => c.detail));
}

// a look at the bulb cars in a real match, and the draw-call cost
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
await page.evaluate(() => { Game.player.pos.x = -23.5; Game.player.pos.z = 1.5; Game.player.yaw = -Math.PI / 2 - 0.35; Game.player.pitch = -0.2; stepGame(1 / 60); Game.player.pitch = -0.2; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('winnmark-cars-bulb');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking at the bulb cars:', calls);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
