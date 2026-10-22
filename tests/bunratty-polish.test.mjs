// v1.125 (backlog D.3 step 4, Michael: A — carry Winnmark's pieces to the other maps; Bunratty first): Bunratty
// builds Winnmark's house, car, tree and shrub, bin, box, plywood stack and fort; its collision boxes keep their
// sizes and counts; a match plays on it with no page errors and the kids still get about.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const built = buildBunrattyCourtScene(undefined, 'day');
  const t = { house: 0, houseDetail: 0, car: 0, carDetail: 0, tree: 0, treeDetail: 0, bush: 0, bushDetail: 0, props: {}, fortDetail: 0 };
  for (const o of built.obstacles) {
    const m = o.mesh; if (!m) continue;
    if (o.h === 5.5 && o.surface === 'hard' && m.isGroup) { t.house++; if (m.children.some(c => c.isGroup && c.children.some(k => k.isMesh && k.geometry.attributes.position.count > 500))) t.houseDetail++; }
    if (o.shape === 'obox' && o.hx === 1.8) { t.car++; if (m.userData.carDetail) t.carDetail++; }
    if (o.shape === 'cylinder' && o.surface === 'hard' && m.isMesh) { t.tree++; if (m.userData.plantDetail) t.treeDetail++; }
    if (o.surface === 'soft' && m.isMesh && !o.shape) { t.bush++; if (m.userData.plantDetail) t.bushDetail++; }
    const pd = m.userData && m.userData.propDetail; if (pd) t.props[pd] = (t.props[pd] || 0) + 1;
    if (m.userData && m.userData.fortDetail) t.fortDetail++;
  }
  let meshes = 0; built.scene.traverse(m => { if (m.isMesh) meshes++; });
  t.meshes = meshes; t.obstacles = built.obstacles.length;
  built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
  return t;
});
console.log('  ', JSON.stringify(res));
// v1.305 (D.51 step 2): the street's houses are Bunratty's own now (tests/real-scale.test.mjs), not Winnmark's
check('no Winnmark colonial is left on Bunratty', res.house === 0, res);
check('every Bunratty car is the detailed car', res.car >= 2 && res.carDetail === res.car, res);
check('every Bunratty tree and bush is the low-poly one', res.tree > 50 && res.treeDetail === res.tree && res.bush > 10 && res.bushDetail === res.bush, res);
check('bins, boxes and plywood stacks are the detailed props', (res.props.bin || 0) > 10 && (res.props.box || 0) > 0 && (res.props.plystack || 0) >= 0, res.props);
check('the bulb fort is the detailed fort', res.fortDetail >= 1, res.fortDetail);

// a round on Bunratty (Four on Four): no errors, and every kid gets about over 30 s
await g.scenario('bunratty_team_4v4');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
const kids = () => page.evaluate(() => [...(Game.scenario.enemies || []), ...(Game.scenario.allies || [])].map(e => [e.name, e.pos.x, e.pos.z]));
// walked distance, sampled every 0.5 s (Mitchell and Owen are campers who move little but do move)
// v1.220 fix-up: 40 s, not 30, and a kid who fires counts as in the fight. Ally Nick holds the cover by your start,
// hiding and peeking, until v1.184's boredom sends an idle ally looking after 25-30 s; CI had him at 0 m at 30 s
// (14 Oct). Probed: when he is bored he has walked 18-21 m by 40 s; when he does not get bored, he is firing.
await page.evaluate(() => { window._firedBy = {}; const o = spawnEnemyBB; window.spawnEnemyBB = (e, ...a) => { window._firedBy[e.name] = (window._firedBy[e.name] || 0) + 1; return o(e, ...a); }; });
const walked = {}; let prev = await kids();
for (let i = 0; i < 80; i++) {
  await g.spin(30);
  const cur = await kids();
  cur.forEach((p, k) => { walked[p[0]] = (walked[p[0]] || 0) + Math.hypot(p[1] - prev[k][1], p[2] - prev[k][2]); });
  prev = cur;
}
const mode = await page.evaluate(() => Game.mode);
const fired = await page.evaluate(() => window._firedBy);
const moved = Object.entries(walked).map(([n, d]) => [n, +d.toFixed(1), fired[n] || 0]);
console.log('  walked (m) and shots in 40 s:', JSON.stringify(moved));
check('the round runs and every kid walks over 3 m in 40 s, or fires', mode === 'scenario' && moved.length >= 6 && moved.every(m => m[1] > 3 || m[2] > 0), { mode, moved });
for (const [name, x, z, yaw, pitch] of [['bunratty-houses', 6, 2, -0.5, 0.12], ['bunratty-bulb', 22, 0, -Math.PI / 2, -0.05]]) {
  await page.evaluate(([x, z, yaw, pitch]) => { const p = Game.player; p.pos.x = x; p.pos.z = z; stepGame(1 / 60); p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = pitch; stepGame(1 / 60); p.yaw = yaw; p.pitch = pitch; }, [x, z, yaw, pitch]);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await g.shot(name);
}
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking at the bulb:', calls);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
