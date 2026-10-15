// v1.235 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Bucket Gun, a made-up backyard gun: a battery hopper gun with a bucket of BBs on top, held up to the toy electric
// guns it copies, whose trigger hangs in a guard ahead of the pistol grip with room for a finger. Before v1.235 the
// trigger and guard were pushed into the grip's front: the trigger reaching 0.6 cm into it, the guard's bar
// running 3.8 cm into it. A side picture goes to tests/out/gun-bucket-side.png (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('bucket');
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
  const R = meshes.find(x => par(x).width === 0.06 && par(x).depth === 0.26).b;
  const grip = meshes.find(x => par(x).width === 0.038 && par(x).height === 0.11);
  const trig = meshes.find(x => par(x).width === 0.012 && par(x).height === 0.02);
  const bar = meshes.find(x => par(x).width === 0.032 && par(x).height === 0.005);
  // the grip's front face, where the trigger's bottom is: a ray back from ahead of the gun
  const ray = (from, dir, xs) => { const h = new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...dir)).intersectObjects(xs.map(x => x.o), false); return h.length ? h[0].point : null; };
  const gripFrontAt = y => { const p = ray([0, y, -0.5], [0, 0, 1], [grip]); return p ? p.z : null; };
  const out = {
    triggerShows: +(R.min.y - trig.b.min.y).toFixed(4), guardBelowTrigger: +(trig.b.min.y - bar.b.min.y).toFixed(4),
    fingerRoom: +(gripFrontAt(trig.b.min.y) - trig.b.max.z).toFixed(4),
    barIntoGrip: +(bar.b.max.z - gripFrontAt((bar.b.min.y + bar.b.max.y) / 2)).toFixed(4),
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
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-bucket-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'bucket-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('a trigger shows 1 cm or more under the body, the guard below it', r.triggerShows >= 0.01 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('a finger\'s room (1.5 cm or more) between the trigger and the grip', r.fingerRoom >= 0.015, r.fingerRoom);
check('the guard meets the grip without running into it (0–1 cm)', r.barIntoGrip >= 0 && r.barIntoGrip <= 0.01, r.barIntoGrip);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
