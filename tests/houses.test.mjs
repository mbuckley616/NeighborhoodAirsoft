// v1.104 (backlog D.3, Michael: D — Winnmark end to end, step 1): Winnmark's eight houses are the detailed
// house (hip roof with eaves, cross gable, framed windows and shutters, panelled door, gutters, chimney),
// merged to a few draw calls each; their collision box is unchanged; Bunratty still builds the old house.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

async function houses() {
  return page.evaluate(() => Game.player.obstacles
    .filter(o => o.h === 5.5 && o.surface === 'hard' && o.mesh && o.mesh.isGroup)
    .map(o => {
      let meshes = 0, tris = 0, detail = false;
      o.mesh.traverse(m => {
        if (!m.isMesh) return;
        meshes++;
        const gg = m.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3;
      });
      // the detailed house carries a nested, yawed front group
      o.mesh.children.forEach(c => { if (c.isGroup && c.children.some(k => k.isMesh && k.material.color && k.geometry.attributes.position.count > 500)) detail = true; });
      const size = [o.maxX - o.minX, o.maxZ - o.minZ].map(v => +v.toFixed(2));
      return { at: [+((o.minX + o.maxX) / 2).toFixed(1), +((o.minZ + o.maxZ) / 2).toFixed(1)], size, meshes, tris: Math.round(tris), detail };
    }));
}

await g.scenario('winnmark_seth_house');
// The page's own frame loop keeps the round running while the houses are inspected; on a slow CI runner that is
// long enough for Seth to tag a one-life player, the round ends, and the walk below goes nowhere (CI, v1.105: -8).
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
const wm = await houses();
console.log('  winnmark', JSON.stringify(wm));
check('Winnmark has eight houses', wm.length === 8, wm.length);
check('every Winnmark house is the detailed house', wm.every(h => h.detail), wm.map(h => h.detail));
check('each costs at most 20 meshes', wm.every(h => h.meshes <= 20), wm.map(h => h.meshes));
check('collision boxes keep their footprints (8–9 × 7 m, 5.5 m tall)', wm.every(h => [8, 9].includes(h.size[0]) && h.size[1] === 7), wm.map(h => h.size));

// the player can't walk into a house: pushed against Seth's front wall, he stops at it
const stop = await page.evaluate(() => {
  Game.mouse.locked = true;   // updatePlayer moves no one without it; CI's Chromium may refuse the real pointer lock
  Game.player.pos.x = 24; Game.player.pos.z = -8; Game.player.yaw = 0;
  const kd = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }); document.dispatchEvent(kd);
  for (let i = 0; i < 240; i++) stepGame(1 / 60);
  const ku = new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }); document.dispatchEvent(ku);
  return { z: +Game.player.pos.z.toFixed(2), mode: Game.mode };
});
check('walking north into Seth\'s house stops at its front wall (z −11.5)', stop.mode === 'scenario' && stop.z > -11.5 && stop.z < -10.5, stop);

await page.evaluate(() => { Game.player.pos.x = 24; Game.player.pos.z = -4; Game.player.yaw = 0; Game.player.pitch = 0.15; stepGame(1 / 60); Game.player.pitch = 0.15; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('houses-winnmark-seth');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking at Seth\'s house:', calls);

// v1.312 (D.55 step 4): the street's three real finishes. B and C carry cream quoins, B the belt course all round,
// every house the steep roof (4 m rise, was 2.3) and the arched entry; Northcliff's four stucco houses are fieldstone
const looks = () => page.evaluate(() => {
  const out = [];
  Game.scene.traverse(o => {
    if (!o.isGroup) return;
    const front = o.children.find(c => c.isGroup && c.children.some(k => k.userData && k.userData.part));
    if (!front) return;
    // v1.339 (D.51 step 2): the street's real-size houses past the box are winnmark-real's to measure
    const B = Game.scenario.bounds; if (o.position.x > B.maxX || o.position.x < B.minX) return;
    const parts = front.children.filter(k => k.userData.part).map(k => k.userData.part);
    const roof = o.children.find(c => c.isMesh && c.material.side === THREE.DoubleSide && !c.userData.part);
    let rise = null;
    if (roof) { roof.geometry.computeBoundingBox(); const bb = roof.geometry.boundingBox; rise = +(bb.max.y - bb.min.y).toFixed(2); }
    out.push({ at: [+o.position.x.toFixed(0), +o.position.z.toFixed(0)], quoin: parts.includes('quoin'), stone: parts.includes('stone'), rise });
  });
  return out;
});
const wl = await looks();
console.log('  winnmark looks', JSON.stringify(wl));
check('Winnmark: six of the eight houses have quoins (B and C), two plain rose-tan brick (A)', wl.length === 8 && wl.filter(h => h.quoin).length === 6, wl.map(h => h.quoin));
check('Winnmark: every roof rises 4 m (was 2.3)', wl.every(h => h.rise === 4), wl.map(h => h.rise));
await page.evaluate(() => endScenario('lose'));
await g.scenario('northcliff_1v1_evan');
await g.spin(10);
const nl = await looks();
console.log('  northcliff looks', JSON.stringify(nl));
check('Northcliff: four stucco houses with fieldstone, two brick without', nl.length === 6 && nl.filter(h => h.stone).length === 4, nl.map(h => h.stone));
await page.evaluate(() => endScenario('lose'));
await g.scenario('bunratty_sean');
await g.spin(10);
const br = await houses();
// v1.125 (D.3 step 4) built Winnmark's house on Bunratty too; v1.305 (D.51 step 2) gave the street its own six at about
// real size (tests/real-scale.test.mjs measures them), so no Winnmark colonial stands there now
const brOwn = await page.evaluate(() => !!Game.scene.getObjectByName('bunrattyNeighbours'));
check('Bunratty builds its own street\'s houses, not the colonial', br.length === 0 && brOwn, { colonials: br.length, brOwn });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
