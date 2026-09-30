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
await g.spin(10);
const wm = await houses();
console.log('  winnmark', JSON.stringify(wm));
check('Winnmark has eight houses', wm.length === 8, wm.length);
check('every Winnmark house is the detailed house', wm.every(h => h.detail), wm.map(h => h.detail));
check('each costs at most 20 meshes', wm.every(h => h.meshes <= 20), wm.map(h => h.meshes));
check('collision boxes keep their footprints (8–9 × 7 m, 5.5 m tall)', wm.every(h => [8, 9].includes(h.size[0]) && h.size[1] === 7), wm.map(h => h.size));

// the player can't walk into a house: pushed against Seth's front wall, he stops at it
const stop = await page.evaluate(() => {
  Game.player.pos.x = 24; Game.player.pos.z = -8; Game.player.yaw = 0;
  const kd = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }); document.dispatchEvent(kd);
  for (let i = 0; i < 240; i++) stepGame(1 / 60);
  const ku = new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }); document.dispatchEvent(ku);
  return +Game.player.pos.z.toFixed(2);
});
check('walking north into Seth\'s house stops at its front wall (z −11.5)', stop > -11.5 && stop < -10.5, stop);

await page.evaluate(() => { Game.player.pos.x = 24; Game.player.pos.z = -4; Game.player.yaw = 0; Game.player.pitch = 0.15; stepGame(1 / 60); Game.player.pitch = 0.15; });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await g.shot('houses-winnmark-seth');
const calls = await page.evaluate(() => { Game.renderer.render(Game.scene, Game.camera); return Game.renderer.info.render.calls; });
console.log('  draw calls, looking at Seth\'s house:', calls);

await page.evaluate(() => endScenario('lose'));
await g.scenario('bunratty_sean');
await g.spin(10);
const br = await houses();
check('Bunratty still builds the original house (no detail yet)', br.length > 0 && br.every(h => !h.detail), br.map(h => h.detail));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
