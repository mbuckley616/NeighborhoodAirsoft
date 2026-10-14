// v1.223 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Spring Assault Rifle against the gun it copies, an M4: a 30-round mag about 15 cm below the receiver, curving forward,
// in a flared magwell at the front of the lower receiver; the trigger guard hanging below the lower between the magwell
// and the pistol grip; the grip about 20° off upright. The game draws the AR at about ×0.72 (its upper receiver 13 cm),
// so the mag should show about 11 cm. Before v1.223 the mag showed 7.4 cm, straight, set against the grip, and the
// trigger and guard sat inside the lower receiver; the grip raked 13°. A side picture goes to tests/out/gun-ar-side.png
// (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(process.env.GUN_SRC ? { src: process.env.GUN_SRC } : {}); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('ar');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), part = {};
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b);
    if (o.name) part[o.name] = { b, rx: o.rotation.x };
  });
  const L = part.lower.b, M = part.mag.b, G = part.grip.b, T = part.trigger.b;
  const out = {
    magBelow: +(L.min.y - M.min.y).toFixed(3),                    // how far the mag shows below the lower receiver
    magTiltDeg: +(part.mag.rx * 180 / Math.PI).toFixed(1),        // + is the bottom forward
    triggerBelow: +(L.min.y - T.min.y).toFixed(3),                // how much of the trigger shows under the lower
    magToGrip: +(G.min.z - M.max.z).toFixed(3),                   // room for the guard between the mag's back and the grip
    rakeDeg: +(Math.abs(part.grip.rx) * 180 / Math.PI).toFixed(1),
  };
  const W = 800, H = 400;
  const rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  rd.setSize(W, H); rd.setClearColor(0xe8e4da, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1); sc.add(dl);
  sc.add(m);
  const c = new THREE.Vector3(); all.getCenter(c);
  const half = 0.17;
  const cam = new THREE.OrthographicCamera(-half * W / H, half * W / H, half, -half, 0.01, 5);
  cam.position.set(c.x + 1, c.y, c.z); cam.lookAt(c);
  rd.render(sc, cam);
  out.png = rd.domElement.toDataURL('image/png');
  rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-ar-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'ar-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the mag shows 9.5–12.5 cm below the receiver (an M4 30-rounder at this scale, about 11)', r.magBelow >= 0.095 && r.magBelow <= 0.125, r.magBelow);
check('the mag tips forward 4–10°, for the M4 mag\'s curve', r.magTiltDeg >= 4 && r.magTiltDeg <= 10, r.magTiltDeg);
check('the trigger shows below the lower receiver (at least 1 cm)', r.triggerBelow >= 0.01, r.triggerBelow);
check('there is room for the guard between the mag and the grip (at least 2.5 cm)', r.magToGrip >= 0.025, r.magToGrip);
check('the grip rakes 17–25° (an AR grip about 20°)', r.rakeDeg >= 17 && r.rakeDeg <= 25, r.rakeDeg);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
