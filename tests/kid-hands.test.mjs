// v1.119 (backlog D.3 step 3, Michael: A — the kids: faces, hands, clothes; this is the hands). Each hand is a loose
// fist (palm, knuckle ridge, four curled fingers, a thumb on the body side) in the old hand block's box, merged into one
// geometry: still one mesh per hand, at the same node, so the grips and poses are unchanged (tests/grip.test.mjs).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const k = createKid(CHARACTERS[Object.keys(CHARACTERS)[0]], 'ar');
  const sides = {};
  for (const [nm, rig] of [['R', k.pose.rigR], ['L', k.pose.rigL]]) {
    const h = rig.hand; const geo = h.geometry;
    geo.computeBoundingBox(); const bb = geo.boundingBox;
    const pa = geo.attributes.position;
    // thumb side: the mean x of the front-most vertices (z > 0.03), against the hand's mean x
    let tx = 0, tn = 0, mx = 0;
    for (let i = 0; i < pa.count; i++) { mx += pa.getX(i); if (pa.getZ(i) > 0.03) { tx += pa.getX(i); tn++; } }
    // which way is the body's midline from this shoulder (kid-local x)
    const toMid = -Math.sign(rig.shoulder.position.x);
    sides[nm] = { tris: pa.count / 3, kids: h.children.length, isMesh: h.isMesh,
      min: [bb.min.x, bb.min.y, bb.min.z].map(n => +n.toFixed(4)), max: [bb.max.x, bb.max.y, bb.max.z].map(n => +n.toFixed(4)),
      thumbSide: Math.sign(tx / tn - mx / pa.count), toMid, pos: h.position.toArray().map(n => +n.toFixed(4)) };
  }
  out.sides = sides;
  // every kid's hands share the two cached geometries
  const geos = new Set();
  for (const id of Object.keys(CHARACTERS)) { const kk = createKid(CHARACTERS[id], 'pistol'); geos.add(kk.pose.rigR.hand.geometry); geos.add(kk.pose.rigL.hand.geometry); }
  out.geos = geos.size;
  return out;
});
console.log('  ', JSON.stringify(res));
for (const [nm, s] of Object.entries(res.sides)) {
  const fitsOld = s.min[0] >= -0.061 && s.max[0] <= 0.061 && s.min[1] >= -0.056 && s.max[1] <= 0.056 && s.min[2] >= -0.066 && s.max[2] <= 0.066;
  check(`${nm} hand: one mesh, no children, more than a block (${s.tris} triangles)`, s.isMesh && s.kids === 0 && s.tris > 12, s);
  check(`${nm} hand: inside the old 0.11 × 0.10 × 0.12 block, 6 mm either way`, fitsOld, s);
  check(`${nm} hand: the thumb is on the body side`, s.thumbSide === s.toMid, s);
  check(`${nm} hand: the node sits at the forearm's end as before`, Math.abs(s.pos[1] + 0.21) < 1e-6 && s.pos[0] === 0 && s.pos[2] === 0, s.pos);
}
check('every kid\'s hands share two geometries', res.geos === 2, res.geos);

// a close-up of a kid aiming a rifle and one holding a pistol out, rendered on top of the page
await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  c.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;z-index:99999';
  document.body.appendChild(c);
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x8aa6c0);
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1.5, 3, 2.5); sc.add(d);
  const ids = Object.keys(CHARACTERS);
  [['ar', ids[1], -0.45, 0.6], ['pistol', ids[2], 0.45, -0.5]].forEach(([w, id, x, yaw]) => {
    const k = createKid(CHARACTERS[id], w); k.group.position.set(x, 0, 0); k.group.rotation.y = yaw;
    setKidCrouch(k, 0); setKidGunHold(k, w, 1, 0); sc.add(k.group);
  });
  const cam = new THREE.PerspectiveCamera(30, 1280 / 720, 0.05, 20); cam.position.set(0, 1.15, 2.4); cam.lookAt(0, 0.95, 0);
  r.render(sc, cam);
});
await g.shot('kid-hands');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
