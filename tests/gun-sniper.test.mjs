// v1.225 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate"), the
// Spring Sniper Rifle against the rifle it copies, a Remington 700 / VSR-10 (drawn at about ×0.5 along its length):
// the barrel on the receiver's axis, bedded in the forend; a pistol grip behind the trigger guard, the stock's belly
// rising from the grip and dropping to the toe; the trigger showing inside its guard; the bipod folded forward along
// the barrel; the aimed sight picture unchanged. Before v1.225 the barrel's axis was 2.5 cm above the receiver's with
// its underside clear of the forend, the stock's bottom ran flat from under the trigger to the toe (no grip), the
// trigger sat inside the stock, the bipod's legs hung 8 cm straight down. A side picture goes to
// tests/out/gun-sniper-side.png (and, with SAVE_DOCS, to docs/guns/).
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const m = buildBareGunMesh('sniper');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), meshes = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b); meshes.push({ o, b });
  });
  const byName = n => meshes.find(x => x.o.name === n);
  // the receiver: the box 3.4 cm tall at the action; the barrel: the long cylinder
  const R = (byName('receiver') || meshes.find(x => x.o.geometry.type === 'BoxGeometry' && Math.abs(x.b.max.y - x.b.min.y - 0.034) < 1e-3 && Math.abs(x.b.max.z - x.b.min.z - 0.1) < 1e-3)).b;
  const B = (byName('barrel') || meshes.filter(x => x.o.geometry.type === 'CylinderGeometry').sort((a, b) => (b.b.max.z - b.b.min.z) - (a.b.max.z - a.b.min.z))[0]).b;
  // the stock's underside, sampled along z with a ray straight up through the centre line
  const stockMeshes = meshes.filter(x => x.o.material && x.o.material.color && x.o.material.color.getHex() === 0x18181a).map(x => x.o);
  const ray = new THREE.Raycaster();
  const bottomAt = z => { ray.set(new THREE.Vector3(0, -0.5, z), new THREE.Vector3(0, 1, 0)); const h = ray.intersectObjects(stockMeshes, false); return h.length ? h[0].point.y : null; };
  const topAt = z => { ray.set(new THREE.Vector3(0, 0.5, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObjects(stockMeshes, false); return h.length ? h[0].point.y : null; };
  const zs = []; for (let z = -0.02; z <= 0.16; z += 0.002) zs.push(+z.toFixed(3));
  const under = zs.map(z => [z, bottomAt(z)]).filter(p => p[1] !== null);
  const low = under.reduce((a, p) => p[1] < a[1] ? p : a);
  const behind = under.filter(p => p[0] > low[0] && p[0] < low[0] + 0.04);
  const notch = behind.reduce((a, p) => p[1] > a[1] ? p : a, [0, -1]);
  const T = (byName('trigger') || meshes.filter(x => x.o.geometry.type === 'BoxGeometry' && (x.b.max.x - x.b.min.x) < 0.013 && (x.b.max.y - x.b.min.y) > 0.012 && x.b.max.y < 0.01).sort((a, b) => a.b.min.y - b.b.min.y)[0]).b;
  const trigZ = (T.min.z + T.max.z) / 2;
  const legs = meshes.filter(x => x.o.geometry.type === 'CylinderGeometry' && x.o.geometry.parameters.radiusTop === 0.0025);
  return {
    barrelAxisOffReceiver: +(((B.min.y + B.max.y) / 2) - ((R.min.y + R.max.y) / 2)).toFixed(4),
    barrelBottomBelowForendTop: +((topAt(-0.17) ?? -1) - B.min.y).toFixed(4),
    gripCap: low.map(v => +v.toFixed(3)), notchBehindGrip: notch.map(v => +v.toFixed(3)), gripDrop: +(notch[1] - low[1]).toFixed(3),
    gripBehindTrigger: +(low[0] - trigZ).toFixed(3),
    triggerShows: +((bottomAt(trigZ) ?? 0) - T.min.y).toFixed(4),
    underBottom: +measureGunForUnder(m, FP_GUN_MOUNT.sniper).bottom.toFixed(4), forendBottomAtRail: +(bottomAt(FP_GUN_MOUNT.sniper.railZ) ?? 0).toFixed(4),
    legsTall: legs.map(x => +(x.b.max.y - x.b.min.y).toFixed(3)), legsLong: legs.map(x => +(x.b.max.z - x.b.min.z).toFixed(3)),
    png: (() => {
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
      const u = rd.domElement.toDataURL('image/png'); rd.dispose(); return u;
    })(),
  };
});
const png = Buffer.from(r.png.split(',')[1], 'base64'); delete r.png;
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-sniper-side.png'), png);
if (process.env.SAVE_DOCS) fs.writeFileSync(path.join(ROOT, 'docs', 'guns', process.env.SAVE_DOCS === '1' ? 'sniper-side.png' : process.env.SAVE_DOCS), png);

// aimed in a match: where the front sight's tip sits from your eye (the aimed picture), and that both hands hold
await page.evaluate(() => { Game.persist.owned.sniper = true; Game.persist.equipped.gun = 'sniper'; Game.persist.bag = 5000; });
await g.scenario('bunratty_sean');
const a = await page.evaluate(() => {
  for (const e of Game.scenario.enemies || []) e.health = 9999;
  Game.player.adsTarget = 1; Game.player.ads = 1;
  for (let i = 0; i < 40; i++) { Game.player.ads = 1; Game.player.adsTarget = 1; stepGame(1 / 60); }
  const fp = Game.camera.children.find(c => c.userData && c.userData.gunType === 'sniper' && c.visible);
  fp.updateMatrix();
  let post = null;
  fp.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.004 && o.geometry.parameters.height === 0.012) post = o; });
  post.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrix).applyMatrix4(fp.matrix);
  return { tipCam: [p.x, p.y, p.z].map(v => +v.toFixed(4)), belowDeg: +(Math.atan2(-p.y, -p.z) * 180 / Math.PI).toFixed(3), sideDeg: +(Math.atan2(p.x, -p.z) * 180 / Math.PI).toFixed(3) };
});
Object.assign(r, { aimed: a });
console.log('   ' + JSON.stringify(r));
check('the barrel is on the receiver\'s axis (within 2 mm)', Math.abs(r.barrelAxisOffReceiver) <= 0.002, r.barrelAxisOffReceiver);
check('the barrel is bedded in the forend (its underside below the forend\'s top)', r.barrelBottomBelowForendTop > 0.003, r.barrelBottomBelowForendTop);
check('a pistol grip: the stock\'s underside drops 1.5 cm or more below the belly just behind it', r.gripDrop >= 0.015, { cap: r.gripCap, notch: r.notchBehindGrip });
check('the grip is behind the trigger (its lowest point 2 cm or more back)', r.gripBehindTrigger >= 0.02, r.gripBehindTrigger);
check('at least 1 cm of trigger shows under the stock', r.triggerShows >= 0.01, r.triggerShows);
check('the bipod is folded: two legs lying along the barrel, each under 1 cm tall', r.legsTall.length === 2 && r.legsTall.every(h => h < 0.01) && r.legsLong.every(l => l > 0.06), { tall: r.legsTall, long: r.legsLong });
check('the under-barrel parts hang from the forend at the rail (within 5 mm of its underside)', Math.abs(r.underBottom - r.forendBottomAtRail) <= 0.005, { under: r.underBottom, forend: r.forendBottomAtRail });
// before v1.225 the post's tip sat 2.6° below the eye line, centred
// 27 Oct (stale since v1.347, found on the split's CI run): v1.347 put the aimed front post on the reticle (it sat 2.5°
// low, so the sights aimed low); this check still wanted the old 2.4–2.8°. Now it wants v1.347's: on the eye line.
check('aimed, the front sight\'s tip sits on the eye line (under 0.6° off it, under 0.2° to the side; v1.347)', Math.abs(r.aimed.belowDeg) < 0.6 && Math.abs(r.aimed.sideDeg) < 0.2, r.aimed);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
