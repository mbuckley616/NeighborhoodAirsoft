// v1.234 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Six-Shooter, a made-up backyard cap gun, held up to what it copies: a Colt single-action with a bird's-head grip.
// On a Colt the cylinder sits just ahead of the recoil shield, with the hammer and the grip straight behind it, and a
// bird's-head grip curves: raked back at the top, turning down toward the butt, which is rounded. Before v1.234 the
// frame ran 3.8 cm past the cylinder's back, with the hammer and grip at its far end, and the grip was one straight
// slab with a flat cap. A side picture goes to tests/out/gun-sixshooter-side.png (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('sixshooter');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), meshes = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b); meshes.push({ o, b });
  });
  const par = x => x.o.geometry.parameters || {};
  const frame = meshes.find(x => x.o.geometry.type === 'BoxGeometry' && par(x).width === 0.03 && par(x).height === 0.05);
  const cyl = meshes.find(x => x.o.geometry.type === 'CylinderGeometry' && par(x).radiusTop === 0.021);
  const wood = meshes.filter(x => x.o.geometry.type === 'BoxGeometry' && x.o.material && x.o.material.color && x.o.material.color.getHex() === 0x7a4a24);
  const rakes = wood.map(x => x.o.rotation.x);
  const butt = meshes.filter(x => x.o.geometry.type === 'CylinderGeometry' && Math.abs(x.o.rotation.z) > 1.5 && x.b.max.y < -0.06);
  const hammer = m.userData.cockingParts.find(p => p.isMesh);
  hammer.geometry.computeBoundingBox();
  const hb = hammer.geometry.boundingBox.clone().applyMatrix4(hammer.matrixWorld);
  const out = {
    frameBehindCyl: +(frame.b.max.z - cyl.b.max.z).toFixed(4),
    hammerBehindCyl: +(hb.min.z - cyl.b.max.z).toFixed(4),
    gripPieces: wood.length, gripTurn: wood.length >= 2 ? +(Math.max(...rakes) - Math.min(...rakes)).toFixed(3) : 0,
    gripTopBehindCyl: wood.length ? +(Math.min(...wood.map(x => x.b.min.z)) - cyl.b.max.z).toFixed(4) : null,
    roundButt: butt.length,
    lowest: +all.min.y.toFixed(4),
  };
  const Wd = 800, H = 400;
  const rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  rd.setSize(Wd, H); rd.setClearColor(0xe8e4da, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1); sc.add(dl);
  sc.add(m);
  const c = new THREE.Vector3(); all.getCenter(c);
  const half = 0.12;
  const cam = new THREE.OrthographicCamera(-half * Wd / H, half * Wd / H, half, -half, 0.01, 5);
  cam.position.set(c.x + 1, c.y, c.z); cam.lookAt(c);
  rd.render(sc, cam);
  out.png = rd.domElement.toDataURL('image/png'); rd.dispose();
  return out;
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-sixshooter-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'sixshooter-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the frame ends 1.5 cm or less behind the cylinder (the recoil shield)', r.frameBehindCyl <= 0.015, r.frameBehindCyl);
check('the hammer stands within 1.5 cm of the cylinder\'s back', r.hammerBehindCyl <= 0.015, r.hammerBehindCyl);
check('the grip starts within 1 cm of the cylinder\'s back', r.gripTopBehindCyl !== null && r.gripTopBehindCyl <= 0.01, r.gripTopBehindCyl);
check('the bird\'s-head grip curves: two pieces, their rakes 0.2 rad or more apart', r.gripPieces >= 2 && r.gripTurn >= 0.2, { pieces: r.gripPieces, turn: r.gripTurn });
check('the butt is rounded', r.roundButt >= 1, r.roundButt);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
