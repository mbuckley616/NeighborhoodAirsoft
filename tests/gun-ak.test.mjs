// v1.226 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// AK-47 against the rifle it copies (drawn at about ×0.67, its receiver 16 cm): one curved magazine seated in the
// receiver, sweeping forward as it drops; a trigger inside a guard between the mag and the grip; the gas tube running
// from the receiver to a gas block; a rear sight on the top cover; a stock that drops to a tall butt; the aimed sight
// picture where it was. Before v1.226 the mag was three tilted blocks with gaps between them, 1.5 cm from the grip,
// with no trigger; the gas tube floated over the handguard and stopped with it; there was no rear sight; the stock was
// a straight box on the bore line. A side picture goes to tests/out/gun-ak-side.png (and, with SAVE_DOCS, docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('ak47');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), meshes = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b); meshes.push({ o, b });
  });
  // the back of a part at height y (a ray forward from behind), and the top of a part at z (a ray down)
  const rearAt = (xs, y) => { const h = new THREE.Raycaster(new THREE.Vector3(0, y, 0.5), new THREE.Vector3(0, 0, -1)).intersectObjects(xs.map(x => x.o), false); return h.length ? h[0].point.z : NaN; };
  const topAt = (xs, z) => { const h = new THREE.Raycaster(new THREE.Vector3(0, 0.5, z), new THREE.Vector3(0, -1, 0)).intersectObjects(xs.map(x => x.o), false); return h.length ? h[0].point.y : NaN; };
  const hex = x => x.o.material && x.o.material.color ? x.o.material.color.getHex() : -1;
  const R = meshes.find(x => x.o.geometry.type === 'BoxGeometry' && Math.abs(x.b.max.z - x.b.min.z - 0.16) < 1e-3 && Math.abs(x.b.max.y - x.b.min.y - 0.05) < 1e-3).b;
  const mags = meshes.filter(x => hex(x) === 0x9a5a28);
  const magBox = new THREE.Box3(); mags.forEach(x => magBox.union(x.b));
  const magTop = mags.reduce((a, x) => x.b.max.y > a.b.max.y ? x : a).b, magLow = mags.reduce((a, x) => x.b.min.y < a.b.min.y ? x : a).b;
  const grip = meshes.find(x => hex(x) === 0x6a3e1c).b;
  const darks = meshes.filter(x => hex(x) === 0x141414 && x.b.max.y < R.min.y + 0.003 && x.b.max.z < grip.min.z + 0.01);
  const trig = darks.filter(x => (x.b.max.x - x.b.min.x) <= 0.0081);
  const guardLow = darks.length ? Math.min(...darks.map(x => x.b.min.y)) : null;
  const tube = meshes.find(x => x.o.geometry.type === 'CylinderGeometry' && x.b.min.y > R.min.y + 0.02 && (x.b.max.z - x.b.min.z) > 0.09 && x.b.max.y > 0.04 && x.b.max.x < 0.012);
  const steelAhead = meshes.filter(x => hex(x) === 0x20211f && x.b.max.z < tube.b.min.z + 0.004 && x.b.min.z > -0.33 && x.b.max.z < -0.27 && x.b.min.y < tube.b.min.y);
  const stock = meshes.filter(x => hex(x) === 0x7a4a22 && x.b.min.z > R.max.z - 0.005);
  const stockBox = new THREE.Box3(); stock.forEach(x => stockBox.union(x.b));
  const rearSight = meshes.filter(x => hex(x) === 0x20211f && x.b.min.y > 0.054 && x.b.max.z > -0.13 && x.b.min.z < -0.10);
  const out = {
    magPieces: mags.length,
    magSeatGap: +(magTop.max.y < R.min.y ? R.min.y - magTop.max.y : 0).toFixed(4),
    magDrop: +(R.min.y - magBox.min.y).toFixed(3),
    magSweepFwd: +(rearAt(mags, R.min.y - 0.006) - rearAt(mags, magBox.min.y + 0.006)).toFixed(3),
    magToGrip: +(grip.min.z - (mags.length === 1 ? (() => { const t = mags[0].o; const ray = new THREE.Raycaster(new THREE.Vector3(0, R.min.y - 0.012, 0.3), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObject(t); return h.length ? h[0].point.z : magBox.max.z; })() : Math.max(...mags.map(x => x.b.max.z)))).toFixed(3),
    triggerShows: trig.length ? +(R.min.y - Math.min(...trig.map(x => x.b.min.y))).toFixed(4) : 0,
    guardBelowTrigger: trig.length && guardLow !== null ? +(Math.min(...trig.map(x => x.b.min.y)) - guardLow).toFixed(4) : 0,
    tubeRearToReceiver: tube ? +(tube.b.max.z - R.min.z).toFixed(4) : null,
    tubeHasBlock: steelAhead.length > 0,
    tubeOverGuard: tube ? +(tube.b.min.y - Math.max(...meshes.filter(x => hex(x) === 0x7a4a22 && x.b.max.z < R.min.z + 0.002).map(x => x.b.max.y))).toFixed(4) : null,
    rearSight: rearSight.length,
    stockDrop: +(R.min.y - stockBox.min.y).toFixed(3), heelDrop: +(topAt(stock, R.max.z + 0.006) - topAt(stock, stockBox.max.z - 0.012)).toFixed(3),
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
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-ak-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'ak-side.png' : process.env.SAVE_DOCS), png);

// aimed in a match: the front sight's tip from your eye
await page.evaluate(() => { Game.persist.owned.ak47 = true; Game.persist.equipped.gun = 'ak47'; Game.persist.bag = 5000; });
await g.scenario('bunratty_sean');
r.aimed = await page.evaluate(() => {
  Game.player.adsTarget = 1; Game.player.ads = 1;
  for (let i = 0; i < 40; i++) { Game.player.ads = 1; Game.player.adsTarget = 1; stepGame(1 / 60); }
  const fp = Game.camera.children.find(c => c.userData && c.userData.gunType === 'ak47' && c.visible);
  fp.updateMatrix();
  let post = null;
  fp.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.004 && o.geometry.parameters.height === 0.014) post = o; });
  post.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrix).applyMatrix4(fp.matrix);
  return { tipCam: [p.x, p.y, p.z].map(v => +v.toFixed(4)), offDeg: +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(3) };
});
console.log('   ' + JSON.stringify(r));
check('the magazine is one piece, seated in the receiver (within 3 mm)', r.magPieces === 1 && r.magSeatGap <= 0.003, { pieces: r.magPieces, gap: r.magSeatGap });
check('it drops 11–14 cm below the receiver and sweeps 2.5 cm or more forward', r.magDrop >= 0.11 && r.magDrop <= 0.14 && r.magSweepFwd >= 0.025, { drop: r.magDrop, fwd: r.magSweepFwd });
check('3 cm or more between the mag\'s back and the grip, for the guard', r.magToGrip >= 0.03, r.magToGrip);
check('a trigger shows 1 cm or more under the receiver, the guard below it', r.triggerShows >= 0.01 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('the gas tube runs from the receiver to a gas block, on the handguard', r.tubeRearToReceiver !== null && r.tubeRearToReceiver >= -0.003 && r.tubeHasBlock && r.tubeOverGuard <= 0.003, r);
check('a rear sight stands on the top cover', r.rearSight >= 1, r.rearSight);
check('the stock drops: its butt 4 cm or more below the receiver, its top 1.5 cm lower at the heel than at the receiver', r.stockDrop >= 0.04 && r.heelDrop >= 0.015, { drop: r.stockDrop, heel: r.heelDrop });
check('aimed, the front sight\'s tip sits on the eye line (under 0.6°)', r.aimed.offDeg < 0.6, r.aimed);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
