// v1.228 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// UMP against the gun it copies (a UMP45, drawn at about ×0.62): the barrel shroud joined to the receiver's front; the
// stick mag seated in a magwell, raking a little forward; the grip against the receiver; a trigger inside the guard.
// Before v1.228 the shroud stood 5 mm off the receiver, the mag tilted back with its top 4.5 mm short of the receiver,
// the grip hung under it, and there was no trigger. A side picture goes to tests/out/gun-ump-side.png (and, with
// SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('ump');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), meshes = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b); meshes.push({ o, b });
  });
  const ray = (from, dir, xs) => { const h = new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...dir)).intersectObjects(xs.map(x => x.o), false); return h.length ? h[0].point : null; };
  const par = x => x.o.geometry.type === 'BoxGeometry' ? x.o.geometry.parameters : {};
  const R = meshes.find(x => par(x).width === 0.044 && par(x).depth === 0.15).b;
  const shroud = meshes.find(x => par(x).width === 0.034 && par(x).height === 0.034);
  const grip = meshes.find(x => par(x).width === 0.032 && par(x).height === 0.065);
  const mag = meshes.find(x => par(x).width === 0.026 && par(x).height >= 0.085);
  const under = meshes.filter(x => x !== grip && x !== mag && x.b.max.y <= R.min.y + 0.002 && x.b.min.y < R.min.y - 0.004 && x.b.max.z < grip.b.max.z && x.b.min.z > mag.b.min.z - 0.01);
  const trig = under.filter(x => (x.b.max.x - x.b.min.x) <= 0.0081);
  const trigLow = trig.length ? Math.min(...trig.map(x => x.b.min.y)) : null;
  const guardLow = Math.min(...under.filter(x => !trig.includes(x) && x.b.max.z > (trig[0] ? trig[0].b.min.z : 0) - 0.03 && (x.b.max.y - x.b.min.y) < 0.012).map(x => x.b.min.y));
  // what stands between the mag's top and the receiver: the mag itself or a magwell round it
  const recv = meshes.find(x => par(x).width === 0.044 && par(x).depth === 0.15);
  const magTopLink = ray([0, R.min.y + 0.02, (mag.b.min.z + mag.b.max.z) / 2], [0, -1, 0], meshes.filter(x => x !== grip && x !== recv));
  const magRear = y => ray([0, y, 0.5], [0, 0, -1], [mag]).z;
  const gripTop = ray([0, R.min.y + 0.02, (grip.b.min.z + grip.b.max.z) / 2], [0, -1, 0], [grip]);
  const out = {
    shroudGap: +(R.min.z - shroud.b.max.z).toFixed(4),
    magLinkGap: magTopLink ? +(R.min.y - magTopLink.y).toFixed(4) : null,
    magRakeFwd: +(magRear(R.min.y - 0.03) - magRear(mag.b.min.y + 0.01)).toFixed(4),
    gripGap: gripTop ? +(R.min.y - gripTop.y).toFixed(4) : null,
    triggerShows: trigLow === null ? 0 : +(R.min.y - trigLow).toFixed(4), guardBelowTrigger: trigLow === null ? 0 : +(trigLow - guardLow).toFixed(4),
  };
  const Wd = 800, H = 400;
  const rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  rd.setSize(Wd, H); rd.setClearColor(0xe8e4da, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1); sc.add(dl);
  sc.add(m);
  const c = new THREE.Vector3(); all.getCenter(c);
  const half = 0.16;
  const cam = new THREE.OrthographicCamera(-half * Wd / H, half * Wd / H, half, -half, 0.01, 5);
  cam.position.set(c.x + 1, c.y, c.z); cam.lookAt(c);
  rd.render(sc, cam);
  out.png = rd.domElement.toDataURL('image/png'); rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-ump-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'ump-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the barrel shroud meets the receiver\'s front (within 1 mm)', r.shroudGap <= 0.001, r.shroudGap);
check('the mag is seated: the mag or its magwell meets the receiver (within 1 mm)', r.magLinkGap !== null && r.magLinkGap <= 0.001, r.magLinkGap);
check('the mag rakes forward (its bottom 3 mm or more ahead of its top)', r.magRakeFwd >= 0.003, r.magRakeFwd);
check('the grip meets the receiver (within 1 mm)', r.gripGap !== null && r.gripGap <= 0.001, r.gripGap);
check('a trigger shows 0.8 cm or more under the receiver, the guard below it', r.triggerShows >= 0.008 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
