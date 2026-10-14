// v1.216 (backlog D.27, Michael 13 Oct: "The houses are nice from the front, but the backyards look really
// janky/unpolished"): the detailed house's back gets a door with a step, hood and light, the belt course, a window
// over the door, the meter, a hose reel and the dryer vent. Below head height nothing on the back stands more than
// 0.3 m off the wall (a body's radius), so the collision box is still the whole story; the mesh count is unchanged.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
const read = () => page.evaluate(() => Game.player.obstacles
  .filter(o => o.h === 5.5 && o.surface === 'hard' && o.mesh && o.mesh.isGroup)
  .map(o => {
    const front = o.mesh.children.find(c => c.isGroup && c.children.some(k => k.isMesh && k.geometry.attributes.position.count > 500));
    if (!front) return { detail: false };
    o.mesh.updateMatrixWorld(true);
    const yaw = front.rotation.y, bx = -Math.sin(yaw), bz = -Math.cos(yaw);   // the back's outward direction
    const cx = (o.minX + o.maxX) / 2, cz = (o.minZ + o.maxZ) / 2;
    const half = Math.abs(bx) > 0.5 ? (o.maxX - o.minX) / 2 : (o.maxZ - o.minZ) / 2;
    let out = 0, meshes = 0;
    const v = new THREE.Vector3();
    o.mesh.traverse(m => {
      if (!m.isMesh) return; meshes++;
      if (m.parent !== front) return;
      const pa = m.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        const d = (v.x - cx) * bx + (v.z - cz) * bz - half;   // how far past the back wall
        const y = v.y - o.mesh.position.y;   // houses stand on the terrain: heights from the house's own base
        if (y < 2.0 && y > 0.02) out = Math.max(out, d);
      }
    });
    // the door: the material named 'door' is the panelled slab's; does any of it lie on the back face?
    let backDoor = false;
    front.children.forEach(m => {
      if (!m.isMesh) return;
      const pa = m.geometry.attributes.position;
      let onBack = 0;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        const d = (v.x - cx) * bx + (v.z - cz) * bz - half;
        const y = v.y - o.mesh.position.y;
        if (d > 0.02 && d < 0.12 && y > 0.1 && y < 2.3) onBack++;
      }
      if (m.userData.part === 'door' && onBack >= 8) backDoor = true;
    });
    return { detail: true, at: [+cx.toFixed(1), +cz.toFixed(1)], out: +out.toFixed(3), meshes, backDoor };
  }));
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
const wm = await read();
console.log('  winnmark', JSON.stringify(wm));
check('Winnmark\'s eight houses are the detailed house', wm.length === 8 && wm.every(h => h.detail));
check('each has a door on its back wall', wm.every(h => h.backDoor), wm.map(h => h.backDoor));
check('below 2 m nothing on the back stands more than 0.3 m off the wall', wm.every(h => h.out <= 0.3), wm.map(h => h.out));
check('each still costs at most 20 meshes', wm.every(h => h.meshes <= 20), wm.map(h => h.meshes));
// walking at the back wall stops at it, the same as the front
const stop = await page.evaluate(() => {
  Game.mouse.locked = true;
  Game.player.pos.x = 8; Game.player.pos.z = -24; Game.player.yaw = Math.PI;
  const kd = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }); document.dispatchEvent(kd);
  for (let i = 0; i < 240; i++) stepGame(1 / 60);
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
  return { z: +Game.player.pos.z.toFixed(2), mode: Game.mode };
});
check('walking south into a house\'s back stops at its back wall (z −19.5)', stop.mode === 'scenario' && stop.z < -19.5 && stop.z > -20.5, stop);
await page.evaluate(() => { Game.player.pos.x = 7; Game.player.pos.z = -27; Game.player.yaw = Math.PI; Game.player.pitch = 0.05; });
await g.spin(2);
await g.shot('house-backs');
await page.evaluate(() => endScenario('lose'));
await g.scenario('bunratty_sean');
const br = await read();
check('Bunratty\'s houses have the back door too, nothing over 0.3 m off the wall', br.length > 0 && br.every(h => h.detail && h.backDoor && h.out <= 0.3), br.map(h => [h.backDoor, h.out]));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
