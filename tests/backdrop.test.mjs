// v1.252 (backlog D.24, Michael: B): every map has scenery past its edge (a ground skirt out past the fog, houses,
// trees, shops, lots, fields, the street running on), and none of it is solid or reachable: nothing goes into the
// obstacles, nothing stands within 6 m of the bounds (BBs are dropped at bounds + 2 m in x, + 5 m in z), and the
// player still stops at the bounds. It costs one draw call by day, two at night (lit windows), three in the store
// (its sky card); the budget checked here is 4. It draws its own seeded numbers after the map is built, so the cover
// layouts are untouched and a map's scenery is the same every round.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// v1.338 (D.51 step 1): Winnmark builds its own surroundings on every side (tests/winnmark-real.test.mjs), so it has none
const FNS = ['buildBunrattyCourtScene', 'buildHollowScene', 'buildMarketLotScene', 'buildNorthcliffScene',
  'buildTreehouseYardScene', 'buildBellfieldCourtScene', 'buildHighSchoolScene', 'buildCountryClubScene', 'buildGroceryStoreScene'];
const res = await page.evaluate((FNS) => {
  const out = {};
  for (const fn of FNS) for (const tod of ['day', 'night']) {
    const built = withSeededRandom(fn, () => window[fn](undefined, tod));
    const obsBefore = built.obstacles.length, B = built.bounds;
    const coverKey = () => JSON.stringify(built.obstacles.map(o => [o.minX, o.maxX, o.minZ, o.maxZ, o.x, o.z, o.baseY]));
    const covers = coverKey();
    const sum = g => { let s = 0; g.traverse(m => { if (m.isMesh) { const a = m.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 7) s += a[i]; } }); return Math.round(s); };
    const first = addEdgeBackdrop(built, fn, tod);
    built.scene.remove(first);
    const grp = addEdgeBackdrop(built, fn, tod);
    const r = { ok: !!grp, same: !!first && sum(first) === sum(grp) && coverKey() === covers, obsSame: built.obstacles.length === obsBefore, meshes: 0, tris: 0, near: Infinity, skirtInside: 0, solid: 0 };
    if (grp) {
      grp.traverse(m => {
        if (!m.isMesh) return;
        r.meshes++;
        if (built.obstacles.some(o => o.mesh === m || o.mesh === grp)) r.solid++;
        if (!m.geometry.attributes.color) return;   // the sky card
        const p = m.geometry.attributes.position.array, sk = m.userData.skirtVerts || 0;
        r.tris += p.length / 9;
        for (let i = 0; i < p.length / 3; i++) {
          const x = p[i * 3], z = p[i * 3 + 2];
          const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ);   // how far outside the bounds (< 0 inside)
          if (i < sk) { if (out < -0.01) r.skirtInside++; }
          else r.near = Math.min(r.near, out);
        }
      });
      r.stats = grp.userData.stats;
      r.inScene = grp.parent === built.scene;
    }
    r.near = +r.near.toFixed(2);
    out[fn.replace(/^build|Scene$/g, '') + ' ' + tod] = r;
    built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  }
  return out;
}, FNS);
for (const [k, r] of Object.entries(res)) {
  console.log('  ', k, JSON.stringify({ meshes: r.meshes, tris: r.tris, near: r.near, ...(r.stats || {}) }));
  // v1.307 (D.51 step 3): the Hollow's woods, river and far bank are its own; the backdrop keeps only the Bunratty
  // houses along the bluff's top, 66 m out, which the night's fog (58 m) hides, so at night none is built
  if (k === 'Hollow night') { check(`${k}: none is built past the night's fog, and no obstacle was added`, !r.ok && r.obsSame, r); continue; }
  check(`${k}: a backdrop is built into the map's own scene`, r.ok && r.inScene, r);
  // the store at night: its fog closes at 52 m, so the lot, the road and the shops across it are all that show
  if (k === 'GroceryStore night') check(`${k}: the lot, cars and shops in it`, r.stats && r.stats.shops >= 4 && r.stats.cars >= 10, r.stats);
  else check(`${k}: houses and trees in it`, r.stats && r.stats.houses >= 8 && r.stats.trees >= 40, r.stats);
  check(`${k}: nothing in it is an obstacle, and no obstacle was added`, r.obsSame && r.solid === 0, r);
  check(`${k}: nothing stands within 6 m of the bounds (BBs drop at 5)`, r.near >= 6, r.near);
  check(`${k}: the ground skirt stays outside the bounds`, r.skirtInside === 0, r.skirtInside);
  check(`${k}: at most 3 meshes, under 60k triangles`, r.meshes <= 3 && r.tris < 60000, { meshes: r.meshes, tris: r.tris });
  check(`${k}: the same scenery every time, the cover untouched`, r.same, r.same);
}

// in play: the scenario carries it, it costs at most 4 draw calls in any view, and the player still stops at the edge
for (const [id, fn] of [['bunratty_sean', 'Bunratty'], ['lot_1v1_marcus', 'Market lot'], ['store_1v1_tyler', 'Store'], ['bellfield_1v1_mason', 'Bellfield']]) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    applyBBHit = () => true;
    for (const e of Game.scenario.enemies || []) e.update = () => {};
    const grp = Game.scene.getObjectByName('edgeBackdrop');
    const B = Game.scenario.bounds, cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
    const out = { has: !!grp, views: {}, walk: {} };
    for (const [side, yaw, px, pz] of [['N', 0, cx, B.minZ + 3], ['S', Math.PI, cx, B.maxZ - 3], ['W', Math.PI / 2, B.minX + 3, cz], ['E', -Math.PI / 2, B.maxX - 3, cz]]) {
      Game.player.pos.x = px; Game.player.pos.z = pz; Game.player.yaw = yaw; Game.player.pitch = 0.03; stepGame(1 / 60);
      Game.player.yaw = yaw; Game.player.pitch = 0.03; Game.camera.updateMatrixWorld(true);
      Game.renderer.render(Game.scene, Game.camera); const withIt = Game.renderer.info.render.calls;
      grp.visible = false; Game.renderer.render(Game.scene, Game.camera); const without = Game.renderer.info.render.calls; grp.visible = true;
      out.views[side] = [without, withIt];
      for (let f = 0; f < 240; f++) { Game.keys.KeyW = true; Game.player.yaw = yaw; stepGame(1 / 60); }
      Game.keys.KeyW = false;
      const p = Game.player.pos;
      out.walk[side] = [+p.x.toFixed(2), +p.z.toFixed(2), p.x >= B.minX - 0.01 && p.x <= B.maxX + 0.01 && p.z >= B.minZ - 0.01 && p.z <= B.maxZ + 0.01];
    }
    return out;
  });
  console.log('  ', fn, JSON.stringify(r));
  check(`${fn}: the scenario's scene has the backdrop`, r.has);
  check(`${fn}: it costs at most 4 draw calls looking out each way`, Object.values(r.views).every(([a, b]) => b - a <= 4), r.views);
  check(`${fn}: walking out each way stops inside the bounds`, Object.values(r.walk).every(w => w[2]), r.walk);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); enterBedroom(); });
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
