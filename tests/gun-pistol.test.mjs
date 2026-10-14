// v1.221 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// pistol against the gun it copies, a Glock 17 (slide 186 mm, height 138 mm with the magazine, slide 25.5 mm wide and
// about 30 mm tall, frame 32 mm, grip about 18° off upright, the barrel flush with the slide; an airsoft copy adds an
// orange tip of a centimetre or so). The game's pistol is drawn about ×1.13 so it fills the same part of the screen.
// Before v1.221 the slide was wider than tall (42 × 40 mm), the gun stood 1.04 slide-lengths tall (Glock 0.74), the
// barrel and tip ran 7 cm past the slide and the grip raked 10°. Ratios are to the slide's length, so the scale drops out.
// A side picture goes to tests/out/gun-pistol-side.png (and, with SAVE_DOCS=1, docs/guns/pistol-side.png).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(process.env.PISTOL_SRC ? { src: process.env.PISTOL_SRC } : {}); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('pistol');
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
  // Before v1.221 the parts had no names: take the biggest box above the bore line as the slide, the tallest below as the grip
  if (!part.slide) {
    const boxes = []; m.children.forEach(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); const s = new THREE.Vector3(); b.getSize(s); boxes.push({ o, b, s }); } });
    part.slide = boxes.filter(x => x.o.geometry.type === 'BoxGeometry').sort((a, b) => b.s.z - a.s.z)[0];
    part.grip = boxes.filter(x => x.o.geometry.type === 'BoxGeometry').sort((a, b) => b.s.y - a.s.y)[0];
    part.grip.rx = part.grip.o.rotation.x;
  }
  const sb = part.slide.b, ss = new THREE.Vector3(); sb.getSize(ss);
  const L = ss.z;
  const out = {
    slideLen: +L.toFixed(3), slideW: +ss.x.toFixed(3), slideH: +ss.y.toFixed(3),
    height: +((sb.max.y - all.min.y) / L).toFixed(2),            // slide top to the lowest point, in slide lengths
    pastSlide: +((sb.min.z - all.min.z) / L).toFixed(3),          // how far anything runs in front of the slide
    widthRatio: +(ss.x / L).toFixed(3),
    rakeDeg: +(Math.abs(part.grip.rx) * 180 / Math.PI).toFixed(1),
  };
  // the side picture: the gun alone, from its right side, on the pale backdrop the shop uses
  const W = 640, H = 360;
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
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-pistol-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'pistol-side.png' : process.env.SAVE_DOCS), png);
console.log('   ' + JSON.stringify(r));
check('the slide is narrower than it is tall (Glock 25.5 × ~30 mm)', r.slideW < r.slideH, r);
check('the slide is 12–16% of its length wide (Glock 13.7%)', r.widthRatio >= 0.12 && r.widthRatio <= 0.16, r.widthRatio);
check('slide top to the baseplate is 0.70–0.85 slide lengths (Glock 0.74)', r.height >= 0.70 && r.height <= 0.85, r.height);
check('nothing runs more than a tenth of the slide past its front (the orange tip; Glock barrel flush)', r.pastSlide <= 0.10, r.pastSlide);
check('the grip rakes 15–22° (Glock about 18°)', r.rakeDeg >= 15 && r.rakeDeg <= 22, r.rakeDeg);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
