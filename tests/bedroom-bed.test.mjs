// v1.214 (backlog D.26, Michael 13 Oct: "Can we make the room a bit more detailed / polished? Small touches on what's
// already there"): the bed and nightstands. Everything soft lies on the bed, the comforter falls to the frame, and the
// nightstand lamps stand on their tops with a lit bulb under the shade.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  Game.scene.updateMatrixWorld(true);
  const f = b => ({ y0: +b.min.y.toFixed(3), y1: +b.max.y.toFixed(3), x0: +b.min.x.toFixed(3), x1: +b.max.x.toFixed(3), z0: +b.min.z.toFixed(3), z1: +b.max.z.toFixed(3) });
  const by = {};
  Game.scene.traverse(o => { if (o.isMesh && (o.name.startsWith('bed_') || o.name.startsWith('ns_'))) (by[o.name] = by[o.name] || []).push(f(new THREE.Box3().setFromObject(o))); });
  let frame = null;
  Game.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 2.0 && o.geometry.parameters.depth === 1.45) frame = f(new THREE.Box3().setFromObject(o)); });
  const nsTops = [];
  Game.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.6 && o.geometry.parameters.depth === 0.55) nsTops.push(f(new THREE.Box3().setFromObject(o))); });
  const obst = Game.bedroomObstacles || null;
  return { by, frame, nsTops };
});
const B = r.by, top = B.bed_comforter[0].y1;
console.log('    comforter top', top, '· frame', JSON.stringify(r.frame));
check('two pillows and the red one on the bed', (B.bed_pillow || []).length === 2 && (B.bed_throw || []).length === 1, Object.keys(B));
check('each pillow lies on the comforter, pressed in under 2 cm', B.bed_pillow.every(p => p.y0 <= top + 0.002 && p.y0 >= top - 0.02), B.bed_pillow.map(p => p.y0));
check('the red pillow leans on the pillows and the bed, not in the air', B.bed_throw[0].y0 <= top + 0.01, B.bed_throw[0]);
check('the folded blanket lies on the foot of the comforter', Math.abs(B.bed_blanket[0].y0 - top) <= 0.01 && B.bed_blanket[0].x1 < B.bed_pillow[0].x0, B.bed_blanket[0]);
check('the sheet fold lies on the comforter', Math.abs(B.bed_fold[0].y0 - top) <= 0.002, B.bed_fold[0]);
const dr = B.bed_drape;
check('the comforter falls down both sides to the frame and over the foot to the footboard (0.55 m), inside the frame', dr.length === 3 &&
  dr.every(d => (Math.abs(d.y0 - r.frame.y1) <= 0.005 || Math.abs(d.y0 - 0.55) <= 0.005) && d.z0 >= r.frame.z0 - 0.001 && d.z1 <= r.frame.z1 + 0.001 && d.x0 >= r.frame.x0 - 0.06),
  { dr, frame: r.frame });
const bases = B.ns_lamp_base, tops = r.nsTops;
check('both nightstand lamps stand on the tops (they were sunk 2 cm in)', bases.length === 2 && tops.length === 2 &&
  bases.every(b => tops.some(t => Math.abs(b.y0 - t.y1) <= 0.002)), { bases, tops });
check('a bulb is lit inside each shade', B.ns_bulb.length === 2 && B.ns_bulb.every((b, i) => {
  const s = B.ns_shade.find(s => Math.abs((s.x0 + s.x1) / 2 - (b.x0 + b.x1) / 2) < 0.01 && Math.abs((s.z0 + s.z1) / 2 - (b.z0 + b.z1) / 2) < 0.01);
  return s && b.y0 >= s.y0 && b.y1 <= s.y1; }), { bulbs: B.ns_bulb, shades: B.ns_shade });
// the bed still saves the game from where it did
const save = await page.evaluate(() => { const it = Game.interactables.find(i => i.type === 'bed'); return it && it.box.min.x > 0 && it.box.max.y < 1.3; });
check('the bed is still the save spot, its box round the bed', save);
await page.evaluate(() => { Game.player.pos.set(1.0, 0, 1.9); Game.player.yaw = -0.9; Game.player.pitch = -0.35; });
await g.spin(2);
await g.shot('bedroom-bed');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
