// v1.113 (backlog D.3 step 2, Winnmark's trees and bushes): every Winnmark tree is the low-poly tree (trunk with a
// root flare and limbs, a crown of lumpy flat-shaded clumps) and every foundation bush the clumped shrub; each tree is
// still two meshes and each bush one; the trunk's collision cylinder and the bush's box are unchanged; Bunratty keeps
// the ball-on-a-stick tree.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  for (const fn of ['buildWinnmarkCourtScene', 'buildBunrattyCourtScene']) {
    const built = window[fn](undefined, 'day');
    const trees = built.obstacles.filter(o => o.shape === 'cylinder' && o.surface === 'hard' && o.mesh && o.mesh.isMesh && o.mesh.geometry);
    const bushes = built.obstacles.filter(o => o.surface === 'soft' && o.mesh && o.mesh.isMesh && !o.shape);
    const tr = trees.map(o => ({ detail: !!o.mesh.userData.plantDetail, crown: !!o.mesh.userData.crown,
      r: o.radius }));
    const bu = bushes.map(o => ({ detail: !!o.mesh.userData.plantDetail, halfW: +(o.maxX - o.minX).toFixed(2) }));
    let meshes = 0; built.scene.traverse(m => { if (m.isMesh) meshes++; });
    out[fn] = { trees: tr.length, treeDetail: tr.filter(t => t.detail).length, withCrown: tr.filter(t => t.crown).length,
      bushes: bu.length, bushDetail: bu.filter(b => b.detail).length, meshes };
    built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  }
  return out;
});
console.log('  ', JSON.stringify(res));
const wm = res.buildWinnmarkCourtScene;
check('Winnmark: trees found', wm.trees > 100, wm.trees);
check('every Winnmark tree is the low-poly tree, with its crown', wm.treeDetail === wm.trees && wm.withCrown === wm.trees, wm);
check('every Winnmark foundation bush is the clumped shrub', wm.bushes > 10 && wm.bushDetail === wm.bushes, wm);
for (const fn of ['buildBunrattyCourtScene']) {
  const r = res[fn];
  check(`${fn.replace(/^build|Scene$/g, '')} keeps the old tree and bush`, r.trees > 0 && r.treeDetail === 0 && r.bushDetail === 0, r);
}

// a look down the street, and the draw-call cost
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
await page.evaluate(() => { Game.player.pos.x = 30; Game.player.pos.z = 12; Game.player.yaw = 1.2; Game.player.pitch = 0.05; stepGame(1 / 60); Game.player.yaw = 1.2; Game.player.pitch = 0.05; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('winnmark-trees');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking down the street:', calls);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
