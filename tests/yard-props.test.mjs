// v1.217 (backlog D.27, Michael 13 Oct: "tighten up the environmental meshes ... some of the boxes"): the yards' moving
// boxes, bins and plywood stacks. Each is drawn where it stops you (a box turned to any angle used to keep the collision
// box of its unturned size: corners up to 0.55 m outside it, air that stopped you at its sides; a tipped bin lay half
// outside its box), and none stands through a fence, a house, a tree trunk or another prop.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
const res = [];
for (const id of ['winnmark_seth_house', 'bunratty_sean', 'northcliff_twins_3v3', 'bellfield_3v3']) {
  await g.scenario(id);
  res.push(await page.evaluate((id) => {
    const obs = Game.player.obstacles;
    const isProp = o => o.mesh && o.mesh.userData && ['box', 'bin', 'plystack'].includes(o.mesh.userData.propDetail);
    const props = obs.filter(isProp);
    let mism = 0, worst = 0;
    for (const p of props) {
      p.mesh.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(p.mesh);
      const m = Math.max(Math.abs(p.minX - b.min.x), Math.abs(b.max.x - p.maxX), Math.abs(p.minZ - b.min.z), Math.abs(b.max.z - p.maxZ));
      if (m > 0.12) mism++; worst = Math.max(worst, m);
    }
    const isFence = o => o.surface === 'metal' && (o.h || 0) >= 1.3 && Math.min(o.maxX - o.minX, o.maxZ - o.minZ) <= 0.3;
    let fence = 0, house = 0, prop = 0, trunk = 0;
    props.forEach((a, i) => obs.forEach(o => {
      if (o === a) return;
      if (o.shape === 'cylinder') {
        if (!isFinite(o.cx) || o.radius >= 0.8) return;
        const qx = Math.max(a.minX, Math.min(o.cx, a.maxX)), qz = Math.max(a.minZ, Math.min(o.cz, a.maxZ));
        if (Math.hypot(o.cx - qx, o.cz - qz) < o.radius - 0.01) trunk++;
        return;
      }
      if (!isFinite(o.minX)) return;
      const j = props.indexOf(o); if (j >= 0 && j < i) return;
      const ox = Math.min(a.maxX, o.maxX) - Math.max(a.minX, o.minX), oz = Math.min(a.maxZ, o.maxZ) - Math.max(a.minZ, o.minZ);
      if (ox > 0.02 && oz > 0.02) { if (j >= 0) prop++; else if ((o.h || 0) >= 5) house++; else if (isFence(o)) fence++; }
    }));
    return { id, props: props.length, mism, worst: +worst.toFixed(2), fence, house, prop, trunk };
  }, id));
  if (id !== 'bellfield_3v3') await page.evaluate(() => endScenario('lose'));
}
console.log('   ', JSON.stringify(res));
check('four maps with yard props', res.length === 4 && res.every(r => r.props >= 20), res.map(r => [r.id, r.props]));
check('every prop is drawn within 12 cm of its collision box (was 10–27 a map more than that, worst 0.55 m)', res.every(r => r.mism === 0), res.map(r => [r.id, r.mism, r.worst]));
check('no prop stands through an iron fence or a house', res.every(r => r.fence === 0 && r.house === 0), res.map(r => [r.id, r.fence, r.house]));
check('no prop stands round a tree trunk or inside another prop', res.every(r => r.trunk === 0 && r.prop === 0), res.map(r => [r.id, r.trunk, r.prop]));
// the boxes are squared up: every box and standing bin within 7° of a quarter turn
const tw = await page.evaluate(() => {
  let worst = 0;
  for (const o of Game.player.obstacles) if (o.mesh && o.mesh.userData && ['box', 'bin'].includes(o.mesh.userData.propDetail) && Math.abs(o.mesh.rotation.x) < 0.1) {
    const r = o.mesh.rotation.y, q = Math.round(r / (Math.PI / 2));
    worst = Math.max(worst, Math.abs(r - q * Math.PI / 2));
  }
  return +(worst * 180 / Math.PI).toFixed(1);
});
check('every box and standing bin sits within 7° of square', tw <= 7, tw);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
