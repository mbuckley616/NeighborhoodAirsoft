// v1.120 (backlog D.3 step 3, Michael: A — the kids: faces, hands, clothes; this is the clothes). The shirt, sleeves, legs
// and shoes keep their boxes and nodes and get a shape inside them (tucked-in shirt with a yoke and crew collar, sleeve
// hems, jeans with pocket and side seams and a cuff, sneakers on a white sole), and the torso carries per-kid trim and a
// belt. Nothing reaches more than 6 mm past the old boxes; the same kid always dresses the same; hit flash still works.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = { kids: [] };
  const span = geo => { geo.computeBoundingBox(); const b = geo.boundingBox; return [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map(n => +n.toFixed(4)); };
  const past = (sp, hx, hy, hz) => +Math.max(-hx - sp[0], sp[1] - hx, -hy - sp[2], sp[3] - hy, -hz - sp[4], sp[5] - hz).toFixed(4);
  const styles = new Set(), shoes = new Set();
  for (const id of Object.keys(CHARACTERS)) {
    const k = createKid(CHARACTERS[id], 'pistol'), k2 = createKid(CHARACTERS[id], 'pistol');
    const po = k.pose;
    let trim = null; po.torso.traverse(o => { if (o.userData.kidClothes) trim = o; });
    // reach of the torso and its trim past the old 0.42 × 0.5 × 0.24 box (in the torso's frame)
    const tb = new THREE.Box3(); const v = new THREE.Vector3(); po.torso.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(po.torso.matrixWorld).invert();
    po.torso.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); tb.expandByPoint(v); } });
    const trimKey = o => { const a = []; o.traverse(m => { if (m.isMesh) a.push(m.material.color.getHex() + ':' + m.geometry.attributes.position.count); }); return a.join(); };
    let k2trim = null; k2.pose.torso.traverse(o => { if (o.userData.kidClothes) k2trim = o; });
    let tris = 0; trim.traverse(m => { if (m.isMesh) tris += m.geometry.attributes.position.count; });
    styles.add(trimKey(trim).split(',').length + ':' + tris); shoes.add(po.shoeL.material.color.getHex());
    const sole = po.shoeL.children[0];
    out.kids.push({ id, trim: !!trim, trimMeshes: trim ? trim.children.length : 0,
      torsoPast: +Math.max(-0.21 - tb.min.x, tb.max.x - 0.21, -0.25 - tb.min.y, -0.12 - tb.min.z, tb.max.z - 0.12).toFixed(4), collarTop: +(tb.max.y - 0.25).toFixed(4),
      legPast: past(span(po.legL.geometry), 0.08, 0.275, 0.09), upperPast: past(span(po.rigR.upper.geometry), 0.055, 0.12, 0.065),
      upperSpanY: span(po.rigR.upper.geometry).slice(2, 4),
      shoePast: past(span(po.shoeL.geometry), 0.09, 0.04, 0.13), solePast: sole ? past(span(sole.geometry), 0.09, 0.04, 0.13) : null,
      soleBottom: sole ? +(po.shoeL.position.y + span(sole.geometry)[2]).toFixed(4) : null,
      same: trimKey(trim) === trimKey(k2trim) && po.shoeL.material.color.getHex() === k2.pose.shoeL.material.color.getHex(),
      flash: po.torso.material === k.parts.torso.material });
  }
  out.styles = styles.size; out.shoes = shoes.size;
  // a kid takes the hit flash on the shirt as before (updateEnemies drives parts.torso.material.emissive)
  return out;
});
console.log('  ', JSON.stringify({ styles: res.styles, shoes: res.shoes, first: res.kids[0] }));
const worst = f => Math.max(...res.kids.map(k => k[f]));
check('every kid wears the trim (collar, chest, belt) on the torso', res.kids.every(k => k.trim && k.trimMeshes >= 2 && k.trimMeshes <= 3), res.kids.map(k => k.trimMeshes));
check('the shirt, trim and belt stay within 8 mm (the buckle) of the old torso box; only the collar rises above it, under 2.5 cm', worst('torsoPast') <= 0.008 && worst('collarTop') <= 0.025, { past: worst('torsoPast'), collar: worst('collarTop') });
check('jeans, sleeves and sneaker uppers stay inside their old boxes', worst('legPast') <= 0.0001 && worst('upperPast') <= 0.0001 && worst('shoePast') <= 0.0001, { leg: worst('legPast'), upper: worst('upperPast'), shoe: worst('shoePast') });
check('the sleeve spans the old upper arm exactly (±0.12 about its node, so shoulder to elbow)', res.kids.every(k => Math.abs(k.upperSpanY[0] + 0.12) < 1e-4 && Math.abs(k.upperSpanY[1] - 0.12) < 1e-4), res.kids[0].upperSpanY);
check('the sole is inside the old shoe box (the laces 5 mm over its top) and on the ground', worst('solePast') <= 0.0055 && res.kids.every(k => Math.abs(k.soleBottom) < 1e-4), { sole: worst('solePast'), bottom: res.kids[0].soleBottom });
check('the same kid dresses the same every time', res.kids.every(k => k.same));
check('the kids are not all dressed alike (3 shirt styles, several sneaker colours)', res.styles >= 3 && res.shoes >= 3, { styles: res.styles, shoes: res.shoes });
check('the hit flash still drives the shirt material', res.kids.every(k => k.flash));

// in play: a kid is tagged and flashes, nothing breaks
await g.scenario('winnmark_seth_house');
await g.spin(30);
const flash = await page.evaluate(() => { const e = Game.scenario.enemies[0]; e.hitFlash = 0.5; stepGame(1 / 60); return e.mesh.parts.torso.material.emissiveIntensity; });
check('a tagged kid\'s shirt flashes red', flash > 0.3, flash);

// three kids, full length, rendered on top of the page
await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  c.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;z-index:99999';
  document.body.appendChild(c);
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x8aa6c0);
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1.5, 3, 2.5); sc.add(d);
  const ids = Object.keys(CHARACTERS).slice(3, 7);
  ids.forEach((id, i) => { const k = createKid(CHARACTERS[id], 'pistol'); k.group.position.set((i - 1.5) * 0.7, 0, 0); k.group.rotation.y = (i - 1.5) * -0.3; sc.add(k.group); });
  const cam = new THREE.PerspectiveCamera(30, 1280 / 720, 0.05, 20); cam.position.set(0, 1.0, 4.4); cam.lookAt(0, 0.78, 0);
  r.render(sc, cam);
});
await g.shot('kid-clothes');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
