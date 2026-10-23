// v1.325 (backlog D.63, Michael: A, batch 1 begins with it): the FAMAS, "functionally identical to the current spring
// rifle, but it was a spring rifle I used growing up". Checked: the shop (RIFLES, after the Spring Assault Rifle, $85,
// its 40-round mag and spare), the spec (the AR's, every number), the model (a bullpup: the mag behind the grip, a
// carry handle over most of the gun, an orange tip), and a match with it (its own first-person gun, 25 in the mag, the
// charging handle after every shot, aimed the front post on the reticle, both hands on it). A side picture goes to
// tests/out/gun-famas-side.png.
import { boot, check, ROOT } from './lib/game.mjs';
import fs from 'fs';
import path from 'path';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click(); });
const rifles = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim()));
console.log('   RIFLES:', rifles.join(' · '));
// (v1.326-v1.327 put the Electric Rifle and the Burst Rifle after it, so the check is the FAMAS's place, not the whole list)
check('RIFLES lists the FAMAS straight after the Spring Assault Rifle', rifles.indexOf('FAMAS') === rifles.indexOf('Spring Assault Rifle') + 1 && rifles.indexOf('FAMAS') > 0, rifles);
const buy = await page.evaluate(() => {
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'FAMAS');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const page = document.querySelector('#shopScreen').textContent;
  const out = { pic, paid: cash0 - Game.persist.cash, owned: !!Game.persist.owned.famas, equipped: Game.persist.equipped.gun,
    magRow: /40/.test(page), spareRow: /Spare FAMAS Mag/.test(page) };
  document.querySelector('#shopScreen .shop-back-btn').click();
  closeShop();
  return out;
});
check('the FAMAS has its picture, costs $85 from its page, and is owned and in your hands', buy.pic && buy.paid === 85 && buy.owned && buy.equipped === 'famas', buy);
check('its page sells a 40-round mag and a spare FAMAS mag', buy.magRow && buy.spareRow, buy);

// --- the spec: the AR's, every number
const spec = await page.evaluate(() => {
  const a = GUN_SPECS.ar, f = GUN_SPECS.famas, diff = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(f)])) {
    if (k === 'displayName') continue;
    const av = typeof a[k] === 'function' ? a[k]() : a[k], fv = typeof f[k] === 'function' ? f[k]() : f[k];
    if (av !== fv) diff.push(k);
  }
  return { diff, name: f.displayName, weight: [GUN_WEIGHT.ar, GUN_WEIGHT.famas], caps: [getGunAccessoryCap('ar'), getGunAccessoryCap('famas')] };
});
check('it shoots as the Spring Assault Rifle: every number of its spec the same', spec.diff.length === 0 && spec.name === 'FAMAS', spec);
check('the same weight and the same slots (a sight, two rails, an under-barrel)', spec.weight[0] === spec.weight[1] && JSON.stringify(spec.caps[0]) === JSON.stringify(spec.caps[1]), spec);

// --- the model: a bullpup
const m = await page.evaluate(() => {
  const m = buildBareGunMesh('famas');
  if (m.parent) m.parent.remove(m);
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateWorldMatrix(true, true);
  const all = new THREE.Box3(), part = {};
  let orange = false;
  m.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    all.union(b);
    if (o.name) part[o.name] = b;
    if (o.material && o.material.color && o.material.color.getHex() === 0xff7a1a && b.min.z <= all.min.z + 0.02) orange = true;
  });
  const len = all.max.z - all.min.z;
  const out = {
    len: +len.toFixed(3),
    magBehindGrip: +(part.mag.min.z - part.grip.max.z).toFixed(3),   // + is the mag behind the grip
    handleShare: +((part.carryHandle.max.z - part.carryHandle.min.z) / len).toFixed(2),
    handleOnTop: part.carryHandle.min.y >= part.body.max.y,
    orange,
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
fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'gun-famas-side.png'), Buffer.from(m.png.split(',')[1], 'base64')); delete m.png;
console.log('   model ' + JSON.stringify(m));
check('a bullpup: the mag sits behind the pistol grip', m.magBehindGrip > 0.01, m.magBehindGrip);
check('a carry handle on top, over more than half the gun\'s length (the real one about 60%)', m.handleOnTop && m.handleShare >= 0.55, m);
check('an orange tip at the muzzle', m.orange, m);

// --- in a match
await page.evaluate(() => { Game.persist.bag = 500; });
await g.scenario('bunratty_sean');
const r = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, ammo: Game.gun.ammo, max: Game.gun.maxAmmo, cockType: Game.gun.cockType, mode: Game.gun.fireMode };
  for (let i = 0; i < 30; i++) step();
  const a0 = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.fired = a0 - Game.gun.ammo;
  out.cockedAfter = Game.gun.cocked;
  const a1 = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.firedUncocked = a1 - Game.gun.ammo;
  // aimed: the front post's tip against screen centre
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  const H = fpGun.userData.fpHands;
  out.hands = !!(H && H.r && H.l);
  return out;
});
await g.shot('gun-famas-aimed');
console.log('   match ' + JSON.stringify(r));
check('in a match: its own first-person gun, 25 in the mag', r.mesh === 'famas' && r.ammo === 25 && r.max === 25, r);
check('semi, one BB a pull, and the charging handle before the next', r.mode === 'semi' && r.cockType === 'charge' && r.fired === 1 && r.cockedAfter === false && r.firedUncocked === 0, r);
check('aimed, the front post sits on the reticle (under 0.6°)', r.sightErrDeg < 0.6, r.sightErrDeg);
check('both hands on it', r.hands, r);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
