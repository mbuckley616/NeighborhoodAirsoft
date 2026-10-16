// v1.233 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Thunder Pump, a made-up backyard gun, held up to what it copies: a toy pump-action air shotgun, built like the
// shotgun (an 870) with a tank under the barrel. The v1.224 faults of the shotgun were here too: the wrist hung as a
// lump under the receiver's back with the guard and trigger hidden behind it, and the butt pad stood 3.9 cm above the
// stock's top line. Now the trigger shows inside a deep guard, the wrist runs from the receiver's back into the stock,
// and the pad is the stock's back face. A side picture goes to tests/out/gun-thunder-side.png (and, with SAVE_DOCS,
// to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('thunder');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), meshes = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b); meshes.push({ o, b });
  });
  const par = x => x.o.geometry.type === 'BoxGeometry' ? x.o.geometry.parameters : {};
  const R = meshes.find(x => par(x).width === 0.05 && par(x).height === 0.065).b;
  const stock = meshes.find(x => par(x).width === 0.04 && par(x).height === 0.085 && par(x).depth === 0.14);
  const wrist = meshes.find(x => par(x).width === 0.036 && par(x).height === 0.06);
  const pad = meshes.find(x => par(x).height === 0.085 && par(x).depth === 0.012);
  // the trigger: narrow, under the receiver; the guard: what else hangs under it ahead of the wrist
  const under = meshes.filter(x => x !== wrist && x !== stock && x.b.max.y <= R.min.y + 0.003 && x.b.min.y < R.min.y - 0.004 && x.b.max.z <= R.max.z && x.b.min.z > R.min.z + 0.03 && x.b.min.z > -0.1);
  const trig = under.filter(x => (x.b.max.x - x.b.min.x) <= 0.0121 && (x.b.max.z - x.b.min.z) <= 0.01);
  const guard = under.filter(x => !trig.includes(x));
  const trigLow = trig.length ? Math.min(...trig.map(x => x.b.min.y)) : null;
  const guardLow = guard.length ? Math.min(...guard.map(x => x.b.min.y)) : null;
  const guardRear = guard.length ? Math.max(...guard.map(x => x.b.max.z)) : null;
  // the pad in the stock's own frame
  const st = stock.o; st.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(st.matrixWorld).invert();
  const pb = pad.o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, pad.o.matrixWorld));
  const sh = st.geometry.parameters.height / 2, sd = st.geometry.parameters.depth / 2;
  // the wrist's top front corner, in the gun's frame: behind the receiver's back, not under it
  const wTopFront = new THREE.Vector3(0, wrist.o.geometry.parameters.height / 2, -wrist.o.geometry.parameters.depth / 2).applyMatrix4(wrist.o.matrixWorld);
  const out = {
    triggerShows: trigLow === null ? 0 : +(R.min.y - trigLow).toFixed(4), guardBelowTrigger: trigLow === null || guardLow === null ? 0 : +(trigLow - guardLow).toFixed(4),
    guardClearOfWrist: guardRear === null ? null : +(wrist.b.min.z - guardRear).toFixed(4),
    wristUnder: +(R.max.z - wTopFront.z).toFixed(4),
    combBelowRecvTop: +(R.max.y - new THREE.Vector3(0, sh, -sd).applyMatrix4(st.matrixWorld).y).toFixed(4),
    padAboveStock: +(pb.max.y - sh).toFixed(4), padBelowStock: +(-sh - pb.min.y).toFixed(4), padGap: +(pb.min.z - sd).toFixed(4),
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
  out.png = rd.domElement.toDataURL('image/png'); rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-thunder-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'thunder-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('a trigger shows 1 cm or more under the receiver, the guard below it', r.triggerShows >= 0.01 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('the guard stands clear ahead of the wrist', r.guardClearOfWrist !== null && r.guardClearOfWrist >= 0, r.guardClearOfWrist);
check('the wrist runs back from the receiver, not under it (its top front corner within 1.5 cm of the receiver\'s back)', r.wristUnder <= 0.015, r.wristUnder);
check('the stock\'s top meets the receiver\'s back within 1 cm of its top', Math.abs(r.combBelowRecvTop) <= 0.01, r.combBelowRecvTop);
check('the butt pad is the stock\'s back face: within 3 mm of its top and bottom, touching its back', Math.abs(r.padAboveStock) <= 0.003 && Math.abs(r.padBelowStock) <= 0.003 && r.padGap <= 0.001, r);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
