// v1.118 (backlog D.3 step 3, Michael: A — the kids: faces, hands, clothes; this is the faces). Every kid's head is a
// rounded 0.28 m cube carrying a face as its children: eye whites, irises and pupils, brows, nose, ears, mouth, and open
// glasses frames. The face stays within 3 cm of the head box, follows the head through a crouch and the aim tilt, the eyes
// show through the glasses, and the hitboxes are untouched.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = { kids: [] };
  for (const id of Object.keys(CHARACTERS)) {
    const k = createKid(CHARACTERS[id], 'pistol');
    k.group.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(k.head);       // head + face, world (group scale applied)
    const geoBox = (k.head.geometry.computeBoundingBox(), k.head.geometry.boundingBox);
    let face = null; k.head.traverse(o => { if (o.userData.kidFace) face = o; });
    let faceMeshes = 0; k.head.traverse(o => { if (o.isMesh && o !== k.head) faceMeshes++; });
    // reach of the face past the head cube, in the head's own frame
    const inv = new THREE.Matrix4().copy(k.head.matrixWorld).invert();
    const lb = new THREE.Box3(); const v = new THREE.Vector3();
    k.head.traverse(o => { if (!o.isMesh || o === k.head) return; const pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); lb.expandByPoint(v); } });
    const reach = Math.max(-0.14 - lb.min.x, lb.max.x - 0.14, -0.14 - lb.min.y, lb.max.y - 0.14, -0.14 - lb.min.z, lb.max.z - 0.14);
    // eye through the glasses: a ray from 1 m in front at the left eye's centre hits the eye, not the frame
    const ep = new THREE.Vector3(); k.eyeL.getWorldPosition(ep);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(k.group.quaternion);
    const rc = new THREE.Raycaster(ep.clone().addScaledVector(fwd, 1), fwd.clone().negate());
    const hits = rc.intersectObject(k.group, true);
    const first = hits[0] && hits[0].object.material.color.getHex();
    // crouch: the eye drops with the head
    const e0 = ep.y, h0 = new THREE.Vector3(); k.head.getWorldPosition(h0);
    setKidCrouch(k, 1); k.group.updateMatrixWorld(true);
    const e1 = new THREE.Vector3(), h1 = new THREE.Vector3(); k.eyeL.getWorldPosition(e1); k.head.getWorldPosition(h1);
    out.kids.push({ id, glasses: !!CHARACTERS[id].glasses, hasFace: !!face, onHead: k.eyeL.parent && k.eyeL.parent === k.head,
      geo: [geoBox.min.x, geoBox.max.x, geoBox.min.y, geoBox.max.y].map(n => +n.toFixed(4)),
      reach: +reach.toFixed(4), faceMeshes, eyeHit: first, irisOrWhite: first !== 0x0a0a0a,
      dropEye: +(e0 - e1.y).toFixed(4), dropHead: +(h0.y - h1.y).toFixed(4) });
  }
  // the hitboxes don't move: a BB at head centre and one 2 cm past the old head box still hit, 6 cm past misses
  const e = { pos: new THREE.Vector3(0, 0, 0), yaw: 0, mesh: createKid(CHARACTERS[Object.keys(CHARACTERS)[1]], 'pistol') };
  out.hit = [checkEnemyHit(e, new THREE.Vector3(0, 1.26, 0)), checkEnemyHit(e, new THREE.Vector3(0, 1.26, 0.16)), checkEnemyHit(e, new THREE.Vector3(0, 1.26, 0.2))];
  return out;
});
console.log('  ', JSON.stringify(res));
for (const k of res.kids) {
  check(`${k.id}: the head is the same 0.28 m cube, rounded`, k.geo.every(n => Math.abs(Math.abs(n) - 0.14) < 1e-3), k.geo);
  check(`${k.id}: the face is on the head (eyes are head children), at most 7 meshes, nothing 3 cm past it`, k.hasFace && k.onHead && k.faceMeshes <= 7 && k.reach <= 0.03 && k.reach > 0.01, k);
  check(`${k.id}: a ray at the eye hits the eye${k.glasses ? ', through the glasses' : ''}`, k.irisOrWhite && k.eyeHit != null, k.eyeHit);
  check(`${k.id}: crouched, the eyes drop with the head`, Math.abs(k.dropEye - k.dropHead) < 0.002 && k.dropHead > 0.1, k);
}
check('the hitboxes are unchanged (head centre and 2 cm out hit, 6 cm out misses)', res.hit.join() === 'true,true,false', res.hit);

// a close-up of three faces, rendered on top of the page
await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  c.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;z-index:99999';
  document.body.appendChild(c);
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x8aa6c0);
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1.5, 3, 2.5); sc.add(d);
  const ids = Object.keys(CHARACTERS).slice(0, 3);
  ids.forEach((id, i) => { const k = createKid(CHARACTERS[id], 'pistol'); k.group.position.set((i - 1) * 0.55, 0, 0); k.group.rotation.y = (i - 1) * -0.35; sc.add(k.group); });
  const cam = new THREE.PerspectiveCamera(30, 1280 / 720, 0.05, 20); cam.position.set(0, 1.3, 2.2); cam.lookAt(0, 1.22, 0);
  r.render(sc, cam);
});
await g.shot('kid-faces');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
