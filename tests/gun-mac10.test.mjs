// v1.232 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// MAC-10 against the gun it copies (an M10, drawn at about ×0.6): a long flat-sided box receiver, about three times as
// long as it is tall, the grip and its mag a little behind the middle; a trigger in front of the grip inside the M10's
// long guard, a strip running forward from the grip and up to the receiver near its front; a front post and a rear
// sight with ears on top, the cocking knob low between them; the collapsed wire stock's two rods along the lower
// receiver and its butt plate behind it. Before v1.232 the box was 1.7 times as long as tall, the grip at its back
// (70% of the way), no trigger, the guard a bar inside the receiver, no sights, and the stock a block on the back.
// A side picture goes to tests/out/gun-mac10-side.png (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('mac10');
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
  const recv = meshes.find(x => par(x).width === 0.05 && par(x).height >= 0.05 && par(x).depth >= 0.1);
  const R = recv.b;
  const mag = meshes.find(x => par(x).width === 0.024 && par(x).height >= 0.1);
  const grip = meshes.filter(x => par(x).width === 0.03 && par(x).height === 0.05);
  const gripFront = Math.min(...grip.map(x => x.b.min.z));
  const len = R.max.z - R.min.z, ht = R.max.y - R.min.y;
  const magMid = (mag.b.min.z + mag.b.max.z) / 2;
  // under the receiver, ahead of the grip: the trigger (narrow) and the guard
  const under = meshes.filter(x => x !== mag && !grip.includes(x) && x.b.max.y <= R.min.y + 0.002 && x.b.min.y < R.min.y - 0.004 && x.b.max.z <= gripFront + 0.006);
  const trig = under.filter(x => (x.b.max.x - x.b.min.x) <= 0.0081 && (x.b.max.z - x.b.min.z) <= 0.01);
  const guard = under.filter(x => !trig.includes(x));
  const trigLow = trig.length ? Math.min(...trig.map(x => x.b.min.y)) : null;
  const guardLow = guard.length ? Math.min(...guard.map(x => x.b.min.y)) : null;
  const guardFront = guard.length ? Math.min(...guard.map(x => x.b.min.z)) : null;
  const guardUp = guard.some(x => x.b.min.z <= guardFront + 0.006 && x.b.max.y >= R.min.y - 0.001 && (x.b.max.y - x.b.min.y) >= 0.015);
  // on top: the sights (front tagged frontSight), and the tallest thing between them
  let front = null; m.traverse(o => { if (o.isMesh && o.userData.frontSight) front = meshes.find(x => x.o === o); });
  const tops = meshes.filter(x => x !== recv && x.b.min.y >= R.max.y - 0.003 && x.b.max.y > R.max.y + 0.004);
  const rear = tops.filter(x => x !== front && x.b.min.z > R.max.z - len * 0.3);
  const sightTop = front ? front.b.max.y : null;
  const between = tops.filter(x => x !== front && !rear.includes(x) && front && x.b.min.z > front.b.max.z);
  const betweenTop = between.length ? Math.max(...between.map(x => x.b.max.y)) : R.max.y;
  // behind and beside: the stock
  const behind = meshes.filter(x => x.b.min.z >= R.max.z - 0.001);
  const plate = behind.filter(x => (x.b.max.y - x.b.min.y) >= 0.03);
  const rods = meshes.filter(x => x.o.geometry.type === 'BoxGeometry' && Math.abs((x.b.min.x + x.b.max.x) / 2) >= 0.025 && (x.b.max.z - x.b.min.z) >= 0.06 && (x.b.max.x - x.b.min.x) <= 0.008);
  const out = {
    lenToHt: +(len / ht).toFixed(2), magAt: +((magMid - R.min.z) / len).toFixed(2),
    triggerShows: trigLow === null ? 0 : +(R.min.y - trigLow).toFixed(4), guardBelowTrigger: trigLow === null || guardLow === null ? 0 : +(trigLow - guardLow).toFixed(4),
    guardAheadOfMag: guardFront === null ? 0 : +(mag.b.min.z - guardFront).toFixed(4), guardUp,
    frontAt: front ? +(((front.b.min.z + front.b.max.z) / 2 - R.min.z) / len).toFixed(2) : null,
    frontAbove: front ? +(front.b.max.y - R.max.y).toFixed(4) : 0, rearSights: rear.length,
    rearTop: rear.length ? +Math.max(...rear.map(x => x.b.max.y)).toFixed(4) : null, sightTop: sightTop === null ? null : +sightTop.toFixed(4),
    betweenTop: +betweenTop.toFixed(4),
    plate: plate.length, plateTall: plate.length ? +Math.max(...plate.map(x => x.b.max.y - x.b.min.y)).toFixed(4) : 0, rods: rods.length,
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
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-mac10-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'mac10-side.png' : process.env.SAVE_DOCS), png);

// aimed in a match: the front sight's tip from your eye
await page.evaluate(() => { Game.persist.owned.mac10 = true; Game.persist.equipped.gun = 'mac10'; Game.persist.bag = 5000; });
await g.scenario('bunratty_sean');
r.aimed = await page.evaluate(() => {
  Game.player.adsTarget = 1; Game.player.ads = 1;
  for (let i = 0; i < 40; i++) { Game.player.ads = 1; Game.player.adsTarget = 1; stepGame(1 / 60); }
  const fp = Game.camera.children.find(c => c.userData && c.userData.gunType === 'mac10' && c.visible);
  if (!fp) return null;
  fp.updateMatrix();
  let post = null;
  fp.traverse(o => { if (o.isMesh && o.userData.frontSight) post = o; });
  if (!post) return { noPost: true };
  post.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrix).applyMatrix4(fp.matrix);
  return { tipCam: [p.x, p.y, p.z].map(v => +v.toFixed(4)), offDeg: +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(3) };
});
console.log('   ' + JSON.stringify(r));
check('the receiver is a long box: 2.5 times as long as it is tall or more', r.lenToHt >= 2.5, r.lenToHt);
check('the grip and its mag sit a little behind the middle (50–65% back)', r.magAt >= 0.5 && r.magAt <= 0.65, r.magAt);
check('a trigger shows 1 cm or more under the receiver, the guard below it', r.triggerShows >= 0.01 && r.guardBelowTrigger > 0.002, { shows: r.triggerShows, guard: r.guardBelowTrigger });
check('the guard runs 3 cm or more ahead of the mag and up to the receiver', r.guardAheadOfMag >= 0.03 && r.guardUp, { ahead: r.guardAheadOfMag, up: r.guardUp });
check('a front post in the front quarter, 1 cm or more over the top', r.frontAt !== null && r.frontAt <= 0.25 && r.frontAbove >= 0.01, { at: r.frontAt, above: r.frontAbove });
check('a rear sight in the back, level with the front post (within 2 mm)', r.rearSights >= 1 && Math.abs(r.rearTop - r.sightTop) <= 0.002, { n: r.rearSights, rear: r.rearTop, front: r.sightTop });
check('the cocking knob between them sits below the sight line', r.betweenTop < r.sightTop - 0.002, { between: r.betweenTop, line: r.sightTop });
check('the stock: a butt plate 3 cm or taller behind the receiver, two rods along its sides', r.plate >= 1 && r.plateTall >= 0.03 && r.rods >= 2, { plate: r.plate, tall: r.plateTall, rods: r.rods });
check('aimed, the front sight\'s tip sits on the eye line (under 0.6°)', r.aimed && r.aimed.offDeg < 0.6, r.aimed);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
