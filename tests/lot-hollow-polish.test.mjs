// v1.126 (backlog D.3 step 4, Michael: A — carry Winnmark's pieces to the other maps): the Riverside Market lot's
// parked cars are Winnmark's detailed car and its island and verge trees the low-poly tree; the Hollow's round
// (hardwood) trees are the low-poly tree too, and its pines stay pines (the low-poly tree is a round crown). Collision
// boxes keep their sizes and counts; a match plays on each with no page errors and the kids still get about.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  for (const fn of ['buildMarketLotScene', 'buildHollowScene']) {
    const built = window[fn](undefined, 'day');
    const t = { car: 0, carDetail: 0, cabinOk: 0, tree: 0, treeDetail: 0 };
    for (const o of built.obstacles) {
      const m = o.mesh; if (!m) continue;
      if (o.shape === 'obox' && o.hx === 1.8 && o.baseYLocal === 0) {
        t.car++; if (m.userData.carDetail) t.carDetail++;
        const c = o._stacked; if (c && c.offX === -0.15 && c.hx === 1 && c.hz === 0.7 && +c.h.toFixed(2) === 0.55) t.cabinOk++;
      }
      if (o.shape === 'cylinder' && o.surface === 'hard' && m.isMesh) { t.tree++; if (m.userData.plantDetail) t.treeDetail++; }
    }
    let meshes = 0; built.scene.traverse(m => { if (m.isMesh) meshes++; });
    t.meshes = meshes; t.obstacles = built.obstacles.length;
    built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
    out[fn] = t;
  }
  return out;
});
console.log('  ', JSON.stringify(res));
const lot = res.buildMarketLotScene, hol = res.buildHollowScene;
check('every lot car is the detailed car, cabin box unchanged', lot.car > 30 && lot.carDetail === lot.car && lot.cabinOk === lot.car, lot);
check('every lot tree is the low-poly tree', lot.tree >= 16 && lot.treeDetail === lot.tree, lot);
check('the Hollow: its round trees are the low-poly tree (about half; the rest are pines)', hol.tree > 100 && hol.treeDetail > hol.tree * 0.3 && hol.treeDetail < hol.tree * 0.7, hol);

const kids = () => page.evaluate(() => [...(Game.scenario.enemies || []), ...(Game.scenario.allies || [])].map(e => [e.name, e.pos.x, e.pos.z]));
for (const [id, shot, x, z, yaw, pitch] of [['lot_team_3v3', 'lot-cars', 2, 21, 0.25, -0.08], ['hollow_skirmish_3v3', 'hollow-trees', 28, 12, -Math.PI / 2 + 0.4, 0.1]]) {
  await g.scenario(id);
  await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
  const walked = {}; let prev = await kids();
  for (let i = 0; i < 40; i++) {
    await g.spin(30);
    const cur = await kids();
    cur.forEach((p, k) => { walked[p[0]] = (walked[p[0]] || 0) + Math.hypot(p[1] - prev[k][1], p[2] - prev[k][2]); });
    prev = cur;
  }
  const mode = await page.evaluate(() => Game.mode);
  const moved = Object.entries(walked).map(([n, d]) => [n, +d.toFixed(1)]);
  console.log(`  ${id}: walked in 20 s:`, JSON.stringify(moved));
  // (one camper a side may hold still: lot 3v3's Brooke walks 0 m on v1.125 too, the Hollow's Rebecca 0–5 m)
  const still = moved.filter(m => m[1] <= 3).length, med = moved.map(m => m[1]).sort((a, b) => a - b)[moved.length >> 1];
  check(`${id}: the round runs, the kids get about (at most one under 3 m, median over 15 m in 20 s)`, mode === 'scenario' && moved.length >= 4 && still <= 1 && med > 15, { mode, moved });
  await page.evaluate(([x, z, yaw, pitch]) => { const p = Game.player; p.pos.x = x; p.pos.z = z; stepGame(1 / 60); p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = pitch; stepGame(1 / 60); p.yaw = yaw; p.pitch = pitch; }, [x, z, yaw, pitch]);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await g.shot(shot);
  const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
  console.log(`  ${id}: draw calls`, calls);
  await page.evaluate(() => endScenario('lose'));
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
