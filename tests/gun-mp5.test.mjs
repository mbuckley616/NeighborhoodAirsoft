// v1.227 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// MP5 against the gun it copies (an MP5A3, drawn at about ×0.64): one magazine curving forward as it drops, clear of
// the grip; a trigger inside the guard; the grip up against the receiver; the rear sight drum on the receiver; the
// stock's two rails down the receiver's sides. Before v1.227 the mag was two blocks kinked back toward the grip, with no
// trigger; the grip hung 5 mm under the receiver; the drum hung past its back; the stock was one
// strut down the middle. A side picture goes to tests/out/gun-mp5-side.png (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('mp5');
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
  const R = meshes.find(x => x.o.geometry.type === 'BoxGeometry' && Math.abs(x.b.max.z - x.b.min.z - 0.13) < 1e-3 && Math.abs(x.b.max.y - x.b.min.y - 0.042) < 1e-3).b;
  const box = x => x.o.geometry.type === 'BoxGeometry' ? x.o.geometry.parameters : null;
  const grip = meshes.find(x => { const p = box(x); return p && p.width === 0.03 && p.height === 0.062; });
  // the magazine: whatever is under the receiver ahead of the grip, more than 4 cm down
  const mags = meshes.filter(x => x !== grip && x.b.max.y <= R.min.y + 0.01 && x.b.min.y < R.min.y - 0.04 && x.b.max.z < grip.b.min.z);
  const magBox = new THREE.Box3(); mags.forEach(x => magBox.union(x.b));
  const rearAt = y => { const p = ray([0, y, 0.5], [0, 0, -1], mags); return p ? p.z : NaN; };
  const frontAt = y => { const p = ray([0, y, -0.5], [0, 0, 1], mags); return p ? p.z : NaN; };
  const magTopY = Math.max(...mags.map(x => x.b.max.y));
  const smalls = meshes.filter(x => x !== grip && !mags.includes(x) && x.b.max.y <= R.min.y + 0.002 && x.b.min.z > magBox.max.z - 0.01 && x.b.max.z < grip.b.max.z);
  const trig = smalls.filter(x => (x.b.max.x - x.b.min.x) <= 0.0081);
  const trigLow = trig.length ? Math.min(...trig.map(x => x.b.min.y)) : null;
  const guardLow = smalls.length ? Math.min(...smalls.map(x => x.b.min.y)) : null;
  const gripTop = ray([0, R.min.y - 0.0001, grip.b.min.z + (grip.b.max.z - grip.b.min.z) / 2], [0, -1, 0], [grip]);
  const drum = meshes.find(x => x.o.geometry.type === 'CylinderGeometry' && x.o.geometry.parameters.radiusTop === 0.014);
  const rails = meshes.filter(x => x.b.max.z - x.b.min.z > 0.1 && x.b.max.z > R.max.z + 0.1 && (x.b.max.y - x.b.min.y) < 0.02);
  const out = {
    magPieces: mags.length, magSeatGap: +(R.min.y - magTopY).toFixed(4), magDrop: +(R.min.y - magBox.min.y).toFixed(3),
    magSweepFwd: +(rearAt(R.min.y - 0.006) - rearAt(magBox.min.y + 0.006)).toFixed(3),
    magToGrip: +(ray([0, R.min.y - 0.012, -0.5], [0, 0, 1], [grip]).z - rearAt(R.min.y - 0.012)).toFixed(3),
    triggerShows: trigLow === null ? 0 : +(R.min.y - trigLow).toFixed(4), guardBelowTrigger: trigLow === null ? 0 : +(trigLow - guardLow).toFixed(4),
    gripGap: gripTop ? +(R.min.y - gripTop.y).toFixed(4) : null,
    drumPastBack: +(drum.b.max.z - R.max.z).toFixed(4),
    rails: rails.map(x => +(((x.b.min.x + x.b.max.x) / 2)).toFixed(4)),
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
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-mp5-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'mp5-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the magazine is one piece, seated in the receiver (within 3 mm)', r.magPieces === 1 && r.magSeatGap <= 0.003, { pieces: r.magPieces, gap: r.magSeatGap });
check('it drops 8–12 cm and curves forward (its bottom 1.5 cm or more ahead of its top)', r.magDrop >= 0.08 && r.magDrop <= 0.12 && r.magSweepFwd >= 0.015, { drop: r.magDrop, fwd: r.magSweepFwd });
check('2.5 cm or more between the mag\'s back and the grip, for the guard', r.magToGrip >= 0.025, r.magToGrip);
check('a trigger shows 0.8 cm or more under the receiver, the guard below it', r.triggerShows >= 0.008 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('the grip meets the receiver (within 1 mm)', r.gripGap !== null && r.gripGap <= 0.001, r.gripGap);
check('the rear sight drum sits on the receiver, not past its back', r.drumPastBack <= 0.002, r.drumPastBack);
check('the stock runs back on two rails down the receiver\'s sides', r.rails.length === 2 && r.rails.every(x => Math.abs(x) > 0.01), r.rails);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
