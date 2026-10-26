// v1.113 (backlog D.3 step 2, Winnmark's trees and bushes): every Winnmark tree is the low-poly tree (trunk with a
// root flare and limbs, a crown of lumpy flat-shaded clumps) and every foundation bush the clumped shrub; each tree is
// still two meshes and each bush one; the trunk's collision cylinder and the bush's box are unchanged; Bunratty keeps
// the ball-on-a-stick tree.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  for (const fn of ['buildWinnmarkCourtScene', 'buildBunrattyCourtScene', 'buildNorthcliffScene']) {
    const built = window[fn](undefined, 'day');
    const trees = built.obstacles.filter(o => o.shape === 'cylinder' && o.surface === 'hard' && o.mesh && o.mesh.isMesh && o.mesh.geometry);
    const bushes = built.obstacles.filter(o => o.surface === 'soft' && o.mesh && o.mesh.isMesh && !o.shape);
    const tr = trees.map(o => ({ detail: !!o.mesh.userData.plantDetail, crown: !!o.mesh.userData.crown,
      r: o.radius }));
    const bu = bushes.map(o => ({ detail: !!o.mesh.userData.plantDetail, halfW: +(o.maxX - o.minX).toFixed(2) }));
    let meshes = 0; built.scene.traverse(m => { if (m.isMesh) meshes++; });
    // v1.313 (D.55 step 5): the tall loblollies, their trunks' height and radius, and the pine straw under them
    const pines = trees.filter(o => o.mesh.userData.loblolly);
    out[fn] = { trees: tr.length, treeDetail: tr.filter(t => t.detail).length, withCrown: tr.filter(t => t.crown).length,
      bushes: bu.length, bushDetail: bu.filter(b => b.detail).length, meshes,
      pines: pines.length, pineH: pines.length ? [Math.min(...pines.map(o => o.h)), Math.max(...pines.map(o => o.h))].map(v => +v.toFixed(1)) : null,
      pineR: pines.length ? Math.min(...pines.map(o => o.radius)) : null, straw: !!built.scene.getObjectByName('pineStraw') };
    built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  }
  return out;
});
console.log('  ', JSON.stringify(res));
const wm = res.buildWinnmarkCourtScene;
check('Winnmark: trees found', wm.trees > 100, wm.trees);
check('every Winnmark tree is the low-poly tree, with its crown', wm.treeDetail === wm.trees && wm.withCrown === wm.trees, wm);
check('every Winnmark foundation bush is the clumped shrub', wm.bushes > 10 && wm.bushDetail === wm.bushes, wm);
check('Winnmark: a third to a half of its trees are tall pines, 12-15 m trunks of the same radius, over pine straw',
  wm.pines / wm.trees > 0.3 && wm.pines / wm.trees < 0.5 && wm.pineH[0] >= 12 && wm.pineH[1] <= 15 && wm.pineR >= 0.32 && wm.straw, wm);
const nc = res.buildNorthcliffScene;
check('Northcliff: tall pines (13-18 m trunks) over pine straw', nc.pines >= 14 && nc.pineH[0] >= 13 && nc.pineH[1] <= 18 && nc.straw, nc);
check('Bunratty: no pines from this (its trees are the D.51 card\'s)', res.buildBunrattyCourtScene.pines === 0, res.buildBunrattyCourtScene.pines);
for (const fn of ['buildBunrattyCourtScene']) {
  const r = res[fn];
  // v1.125 (D.3 step 4): Bunratty's trees and bushes are Winnmark's
  check(`${fn.replace(/^build|Scene$/g, '')} builds the low-poly tree and the clumped shrub`, r.trees > 50 && r.treeDetail === r.trees && r.withCrown === r.trees && r.bushes > 10 && r.bushDetail === r.bushes, r);
}

// a look down the street, and the draw-call cost
await g.scenario('winnmark_cul_de_sac');   // v1.341: a match in the box (Seth's 1v1 plays in his area now, the box baked to a view)
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
await page.evaluate(() => { Game.player.pos.x = 30; Game.player.pos.z = 12; Game.player.yaw = 1.2; Game.player.pitch = 0.05; stepGame(1 / 60); Game.player.yaw = 1.2; Game.player.pitch = 0.05; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('winnmark-trees');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking down the street:', calls);
// v1.301 (D.55 step 3): the golf course and the lake lie on the ground, not under it
await g.scenario('winnmark_cul_de_sac');   // v1.341: a match in the box (Seth's 1v1 plays in his area now, the box baked to a view)
const lay = await page.evaluate(() => {
  const gy = Game.scenario.groundY, s = Game.scene;
  let fairwayMax = -9, lakeOver = 0, lakeN = 0;
  for (let x = -50; x <= 50; x += 2) for (let z = -64; z <= -42; z += 1) fairwayMax = Math.max(fairwayMax, gy(x, z));
  let lake = null, fairway = null, green = null;
  s.traverse(m => {
    if (!m.isMesh || !m.geometry || m.geometry.type !== 'PlaneGeometry' && m.geometry.type !== 'CircleGeometry') return;
    const p = m.geometry.parameters;
    if (p.width === 20 && p.height === 80) lake = m;
    if (p.width === 100 && p.height === 22) fairway = m;
    if (p.radius === 5 && Math.abs(m.position.z + 48) < 0.01) green = m;
  });
  // v1.338 (D.51 step 1): the lake strip west of the bulb is gone; the real pond lies north-west on the course
  lake = s.getObjectByName('winnmarkPond');
  const P = WM_REAL.pond;
  for (let a = 0; a < 6.283; a += 0.1) for (const f of [0, 0.5, 0.95]) { lakeN++; if (gy(P.x + Math.cos(a) * P.rx * f, P.z + Math.sin(a) * P.rz * f) < lake.position.y) lakeOver++; }
  // in play nothing moved: the back yards and the bulb keep their ground
  const before = (x, z) => { let u = Math.max(0, Math.min(1, (x - 38) / (-32 - 38))); const sm = u * u * (3 - 2 * u);
    return 3.0 * (1 - sm) + 0.25 * Math.sin(z * 0.12 + 0.5) * Math.cos(x * 0.1); };
  let inPlay = 0, n = 0;
  for (let x = -37; x <= 40; x += 1) for (let z = -35; z <= 40; z += 1) { n++; if (Math.abs(gy(x, z) - before(x, z)) > 1e-9) inPlay++; }
  inPlay = { changed: inPlay, of: n };
  return { fairwayMax: +fairwayMax.toFixed(4), fairwayY: fairway && fairway.position.y, greenY: green && green.position.y,
    lakeY: lake && lake.position.y, lakeOver, lakeN, inPlay };
});
check('the fairway, green and bunkers are above the ground under them (ground ≤ 0.004 m there, the fairway at 0.005)',
  lay.fairwayY === 0.005 && lay.greenY === 0.01 && lay.fairwayMax <= 0.004, lay);
check('the pond is above the ground over its whole water (v1.338: the pond north-west of the bulb, not the lake strip)', lay.lakeOver === lay.lakeN, lay);
check('the ground inside the tree wall and the shore (x -37 to 40, z -35 to 40) is as it was', lay.inPlay.changed === 0 && lay.inPlay.of > 5000, lay.inPlay);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
