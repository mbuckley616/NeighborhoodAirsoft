// v1.115 (backlog D.3 step 2, the yard props on Winnmark). Every wheelie bin, moving box and plywood stack on Winnmark is
// the detailed prop (moulded cart; taped box with flaps and hand holes; sheets on sleepers with a lawn chair). Each keeps
// the old prop's collision box, draws within a few cm of it, and costs fewer meshes; Bunratty keeps the old props.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = { cmp: {} };
  const count = (o) => { let n = 0; o.traverse(m => { if (m.isMesh) n++; }); return n; };
  const key = o => [o.minX, o.maxX, o.minZ, o.maxZ, o.h].map(v => v.toFixed(4)).join(',');
  // the same prop, old and detailed, side by side (facing 0, so its box is axis-aligned)
  const props = [
    ['bin', (sc, d) => addCurbsideBin(sc, 0, 0, { variant: 'garbage', detail: d })],
    ['recycle', (sc, d) => addCurbsideBin(sc, 0, 0, { variant: 'recycle', detail: d })],
    ['tipped', (sc, d) => addCurbsideBin(sc, 0, 0, { variant: 'recycle', tipped: true, detail: d })],
    ['box', (sc, d) => addHomeDepotBox(sc, 0, 0, { w: 1.1, h: 0.95, d: 0.95, detail: d })],
  ];
  for (const [nm, mk] of props) {
    const a = mk(new THREE.Scene(), false), b = mk(new THREE.Scene(), true);
    const ba = new THREE.Box3().setFromObject(a.mesh), bb = new THREE.Box3().setFromObject(b.mesh);
    // how far the drawn prop reaches past its collision box (sides) and past the old drawing (anywhere)
    const pastBox = Math.max(b.minX - bb.min.x, bb.max.x - b.maxX, b.minZ - bb.min.z, bb.max.z - b.maxZ);
    const pastOld = Math.max(ba.min.x - bb.min.x, bb.max.x - ba.max.x, ba.min.y - bb.min.y, bb.max.y - ba.max.y, ba.min.z - bb.min.z, bb.max.z - ba.max.z);
    out.cmp[nm] = { same: key(a) === key(b) && a.surface === b.surface, detail: b.mesh.userData.propDetail,
      meshesOld: count(a.mesh), meshes: count(b.mesh), pastBox: +pastBox.toFixed(3), pastOld: +pastOld.toFixed(3),
      top: +bb.max.y.toFixed(3), h: a.h, bottom: +bb.min.y.toFixed(3) };
  }
  const st = buildPlyStack(0, 0, 0, 0.3), sb = new THREE.Box3().setFromObject(st);
  out.cmp.stack = { detail: st.userData.propDetail, meshes: count(st), minX: +sb.min.x.toFixed(3), maxX: +sb.max.x.toFixed(3),
    minZ: +sb.min.z.toFixed(3), maxZ: +sb.max.z.toFixed(3), top: +sb.max.y.toFixed(3), bottom: +sb.min.y.toFixed(3) };
  // the props as placed on the maps
  for (const [name, fn] of [['winnmark', 'buildWinnmarkCourtScene'], ['bunratty', 'buildBunrattyCourtScene']]) {
    const tally = { bin: 0, box: 0, plystack: 0, old: 0 };
    for (let k = 0; k < 3; k++) {
      const built = window[fn](undefined, 'day');
      for (const o of built.obstacles) {
        if (!o.mesh || !(o.surface === 'metal' || o.surface === 'soft' || o.surface === 'hard')) continue;
        const pd = o.mesh.userData && o.mesh.userData.propDetail;
        if (pd) tally[pd]++;
        else if (o.mesh.isGroup && o.mesh.children.some(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.radiusTop === 0.13)) tally.old++;      // the old bin's wheel
        else if (o.mesh.isGroup && o.mesh.children.some(c => c.material && c.material.color && c.material.color.getHex() === 0xf06a0a)) tally.old++;   // the old box's stripe
        else if (o.mesh.isMesh && o.mesh.geometry.type === 'BoxGeometry' && o.mesh.geometry.parameters.width === 1.6 && o.mesh.geometry.parameters.height === 0.5) tally.old++;   // the old slab
      }
      built.scene.traverse(m => { m.geometry && m.geometry.dispose && m.geometry.dispose(); });
    }
    out[name] = tally;
  }
  return out;
});
console.log('  ', JSON.stringify(res));
for (const nm of ['bin', 'recycle', 'tipped', 'box']) {
  const c = res.cmp[nm];
  check(`${nm}: the detailed prop keeps the old collision box`, c.same && c.detail, c);
  // (a tipped bin sinks into the ground on its pivot, old and new alike; the 5 cm check covers it)
  check(`${nm}: drawn within 5 cm of the old prop${nm === 'tipped' ? '' : ', on the ground'}, fewer meshes`, c.pastOld <= 0.05 && (nm === 'tipped' || c.bottom >= -0.001) && c.meshes < c.meshesOld, c);
}
check('box: nothing past its box but the labels (1.1 cm proud; the old ones were 1.5) or above it', res.cmp.box.pastBox <= 0.012 && res.cmp.box.top <= res.cmp.box.h + 0.005, res.cmp.box);
const st = res.cmp.stack;
check('plywood stack: inside its 1.6 × 0.9 m box up to the chair, on the ground', st.detail === 'plystack' && st.minX >= -0.8 && st.maxX <= 0.8 && st.minZ >= -0.56 && st.maxZ <= 0.56 && st.bottom >= -0.001 && st.top <= 0.68, st);
const wm = res.winnmark;
check('Winnmark: bins, boxes and plywood stacks are all the detailed props', wm.bin > 20 && wm.box > 3 && wm.plystack > 0 && wm.old === 0, wm);
// v1.125 (D.3 step 4): Bunratty's props are Winnmark's
check('Bunratty: bins, boxes and plywood stacks are all the detailed props', res.bunratty.bin > 10 && res.bunratty.box > 3 && res.bunratty.plystack > 0 && res.bunratty.old === 0, res.bunratty);

// a look at a backyard
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { const hit = applyBBHit; applyBBHit = (bb, who) => who === Game.player ? undefined : hit(bb, who); });
await g.spin(10);
const view = await page.evaluate(() => {
  // stand 3 m from the nearest detailed prop and face it
  const ps = Game.player.obstacles || [];
  const p = Game.player; let best = null, bd = 1e9;
  for (const o of ps) { const pd = o.mesh && o.mesh.userData && o.mesh.userData.propDetail; if (!pd || pd === 'bin') continue;
    const cx = (o.minX + o.maxX) / 2, cz = (o.minZ + o.maxZ) / 2, dd = Math.hypot(cx - p.pos.x, cz - p.pos.z); if (dd < bd) { bd = dd; best = { cx, cz, pd }; } }
  return best;
});
if (view) {
  await page.evaluate(({ cx, cz }) => { const p = Game.player; const put = () => { p.pos.x = cx + 2.4; p.pos.z = cz + 1.2; p.yaw = Math.atan2(2.4, 1.2); p.pitch = -0.3; }; put(); stepGame(1 / 60); put(); }, view);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await g.shot('winnmark-props');
}
console.log('   view:', JSON.stringify(view));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
