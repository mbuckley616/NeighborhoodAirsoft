// v1.236 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Bolt Pistol, the last of the twelve: a made-up backyard spring pistol copying a bolt-action target pistol (an
// XP-100 type): a long barrel off a short receiver over a wooden grip, the trigger hanging in a guard ahead of the grip
// with room for a finger. A side picture goes to
// tests/out/gun-boltpistol-side.png (and, with SAVE_DOCS, to docs/guns/).
// Before v1.236 the guard's bar ran 2.2 cm into the grip's front, 9 mm from the trigger, its front upright stopped
// 4.5 mm under the frame, and the grip's top front corner hung 3.6 mm under it.
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('boltpistol');
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
  const frame = meshes.find(x => par(x).width === 0.032 && par(x).height === 0.045).b;
  const grip = meshes.find(x => par(x).width === 0.036 && par(x).height === 0.11);
  const trig = meshes.find(x => par(x).width === 0.012 && par(x).height === 0.02);
  const bar = meshes.find(x => par(x).width === 0.032 && par(x).height === 0.005);
  const front = meshes.find(x => par(x).width === 0.032 && par(x).height === 0.017);
  const ray = (from, dir, xs) => { const h = new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...dir)).intersectObjects(xs.map(x => x.o), false); return h.length ? h[0].point : null; };
  const gripFrontAt = y => { const p = ray([0, y, -0.5], [0, 0, 1], [grip]); return p ? p.z : null; };
  const out = {
    triggerShows: +(frame.min.y - trig.b.min.y).toFixed(4), guardBelowTrigger: +(trig.b.min.y - bar.b.min.y).toFixed(4),
    fingerRoom: +(gripFrontAt(trig.b.min.y) - trig.b.max.z).toFixed(4),
    barIntoGrip: +(bar.b.max.z - gripFrontAt((bar.b.min.y + bar.b.max.y) / 2)).toFixed(4),
    frontGap: +(frame.min.y - front.b.max.y).toFixed(4),               // the guard's front upright up to the frame
    gripTopGap: +(frame.min.y - grip.o.localToWorld(new THREE.Vector3(0, 0.055, -0.025)).y).toFixed(4),   // its top front corner
  };
  const Wd = 800, H = 400;
  const rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  rd.setSize(Wd, H); rd.setClearColor(0xe8e4da, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1); sc.add(dl);
  sc.add(m);
  const c = new THREE.Vector3(); all.getCenter(c);
  const half = 0.15;
  const cam = new THREE.OrthographicCamera(-half * Wd / H, half * Wd / H, half, -half, 0.01, 5);
  cam.position.set(c.x + 1, c.y, c.z); cam.lookAt(c);
  rd.render(sc, cam);
  out.png = rd.domElement.toDataURL('image/png'); rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-boltpistol-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'boltpistol-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('a trigger shows 1 cm or more under the frame, the guard below it', r.triggerShows >= 0.01 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('a finger\'s room (1.5 cm or more) between the trigger and the grip', r.fingerRoom >= 0.015, r.fingerRoom);
check('the guard meets the grip without running into it (0–1 cm)', r.barIntoGrip >= 0 && r.barIntoGrip <= 0.01, r.barIntoGrip);
check('the guard\'s front upright reaches the frame (under 1 mm)', r.frontGap <= 0.001, r.frontGap);
check('the grip\'s top front corner meets the frame (within 1 mm)', Math.abs(r.gripTopGap) <= 0.001, r.gripTopGap);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
