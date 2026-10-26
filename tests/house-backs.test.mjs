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
await g.scenario('winnmark_cul_de_sac');   // v1.341: a match in the box (Seth's 1v1 plays in his area now, the box baked to a view)
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
  // v1.341: in a lane behind house 1 that the match's yard props leave clear (Storm the Cul-de-Sac's fall elsewhere)
  const clear = x => !Game.player.obstacles.some(o => o.h < 4 && o.maxX > x - 0.6 && o.minX < x + 0.6 && o.maxZ > -24.5 && o.minZ < -19.6);
  const lane = [8, 7, 9, 6, 10, 5, 11].find(clear);
  Game.player.pos.x = lane; Game.player.pos.z = -24; Game.player.yaw = Math.PI;
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
// v1.305 (D.51 step 2): Bunratty's street is its own six houses now (BR_NEIGHBOURS, baked into one group): each has a
// door on its back wall, and below 2 m over its main floor nothing on the back stands more than 0.3 m off the wall
const br = await page.evaluate(() => {
  const grp = Game.scene.getObjectByName('bunrattyNeighbours'); if (!grp) return [];
  const v = new THREE.Vector3();
  return BR_NEIGHBOURS.map(h => {
    const P = brNeighbourPlan(h), zb = h.zf + P.k * h.d;
    const main = Game.player.obstacles.find(o => o.mesh === grp && o.minX === h.x0 && o.maxX === h.x1);
    const Fy = main.baseY;   // the walls' foot
    let door = 0, out = 0;
    for (const m of grp.children) {
      const pa = m.geometry.attributes.position, isDoor = m.material.color.getHex() === 0x4a3020;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i);
        if (v.x < h.x0 + 0.05 || v.x > h.x1 - 0.05) continue;
        const d = (v.z - zb) * P.k;   // how far past the back wall
        if (isDoor && d > 0.01 && d < 0.12) door++;
        if (v.y > Fy && v.y < Fy + 0.3 + 2.0 + 0.45 && d > 0) out = Math.max(out, d);
      }
    }
    return { backDoor: door >= 8, out: +out.toFixed(3) };
  });
});
console.log('  bunratty', JSON.stringify(br));
check('Bunratty\'s six houses have a back door, nothing below 2 m over 0.3 m off the wall', br.length === 6 && br.every(h => h.backDoor && h.out <= 0.3), br);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
