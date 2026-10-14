// v1.224 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Spring Shotgun against the gun it copies, a Remington 870 (drawn at about ×0.74, its receiver 14 cm): the butt pad
// is the stock's back face; the trigger guard hangs about 3.5 cm under the receiver (2.6 at this scale) with the
// trigger inside it; the wrist runs back from the receiver's rear into the stock. Before v1.224 the pad stood 3.9 cm
// above the stock's top line, the guard was 1.65 cm deep with 1.1 cm of trigger showing, and the wrist's front was
// 4.9 cm forward of the receiver's back, a lump under it. A side picture goes to tests/out/gun-shotgun-side.png (and,
// with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('shotgun');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), part = {};
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b);
    if (o.name) part[o.name] = { b, o };
  });
  const R = part.receiver.b, T = part.trigger.b, W = part.wrist.b;
  // the pad in the stock's own frame, against the stock's top and bottom
  const st = part.stock.o, inv = new THREE.Matrix4().copy(st.matrixWorld).invert();
  const pad = part.buttpad.o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, part.buttpad.o.matrixWorld));
  const sh = st.geometry.parameters.height / 2, sd = st.geometry.parameters.depth / 2;
  let guardLow = Infinity;
  m.traverse(o => { if (o.isMesh && o.position.z > -0.06 && o.position.z < 0 && o.parent === m && o !== part.trigger.o && o.geometry.type === 'BoxGeometry' && o.position.y < -0.01) { const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); guardLow = Math.min(guardLow, b.min.y); } });
  const out = {
    padAboveStock: +(pad.max.y - sh).toFixed(3), padBelowStock: +(-sh - pad.min.y).toFixed(3), padOffBack: +(pad.min.z - sd).toFixed(3),
    guardDepth: +(R.min.y - guardLow).toFixed(3),
    triggerBelow: +(R.min.y - T.min.y).toFixed(3),
    wristAhead: +(R.max.z - W.min.z).toFixed(3),   // how far the wrist reaches forward of the receiver's back
  };
  const Wd = 800, H = 400;
  const rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  rd.setSize(Wd, H); rd.setClearColor(0xe8e4da, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1); sc.add(dl);
  sc.add(m);
  const c = new THREE.Vector3(); all.getCenter(c);
  const half = 0.17;
  const cam = new THREE.OrthographicCamera(-half * Wd / H, half * Wd / H, half, -half, 0.01, 5);
  cam.position.set(c.x + 1, c.y, c.z); cam.lookAt(c);
  rd.render(sc, cam);
  out.png = rd.domElement.toDataURL('image/png');
  rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-shotgun-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'shotgun-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the butt pad is the stock\'s back face: within 3 mm of its top and bottom, touching its back', Math.abs(r.padAboveStock) <= 0.003
  && Math.abs(r.padBelowStock) <= 0.003 && Math.abs(r.padOffBack) <= 0.003, r);
check('the trigger guard hangs 2.2–3.0 cm under the receiver (an 870 at this scale, about 2.6)', r.guardDepth >= 0.022 && r.guardDepth <= 0.03, r.guardDepth);
check('at least 1.5 cm of trigger shows under the receiver', r.triggerBelow >= 0.015, r.triggerBelow);
check('the wrist starts behind the guard, no more than 2.5 cm forward of the receiver\'s back', r.wristAhead <= 0.025, r.wristAhead);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
