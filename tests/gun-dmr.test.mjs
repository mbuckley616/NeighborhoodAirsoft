// v1.448 (backlog D.87, Michael: B, gun batch 8, 5 Nov): the DMR, a battery marksman rifle on the AR's frame. A pull a
// shot at up to 4 a second (the M14 3), a 63 m/s BB straight for 20 m (the M14 60 and 18), a short 20 mag, heavy.
// Checked: the shop, the spec against the M14, the SVD and the AR, and a match with it (a mag fired dry, the cycle,
// its model and the longer barrel, the AR's hands and slots, the post on the reticle, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'DMR');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('dmr');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare DMR Mag (20)'), longMag: (GUN_MAGS.dmr.mags || []).map(m => m.cap) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, ads: s.adsSpreadMult, straight: s.curveOnsetDistance, rpm: s.semiRPM, walk: s.playerSpeedMult, mode: s.fireMode, el: !!s.electric, cock: s.cockType || null, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), price: GUN_MAGS[gt].price, slots: getGunAccessoryCap(gt) }; };
  out.d = sp('dmr'); out.m14 = sp('m14'); out.svd = sp('svd'); out.ar = sp('ar'); out.er = sp('erifle');
  Game.persist.owned.dmr_mag_40 = true; out.capLong = getMaxAmmoForGun('dmr'); delete Game.persist.owned.dmr_mag_40;
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.d));
check('DMR: under RIFLES after the M14, before the sniper, with its picture and a semi line, $240 from its page, in your hands; the page sells its spare mag (20) and a long mag of 40',
  sh.names.indexOf('DMR') === sh.names.indexOf('M14') + 1 && sh.names.indexOf('Spring Sniper Rifle') === sh.names.indexOf('DMR') + 1
  && sh.pic && sh.paid === 240 && sh.equipped === 'dmr' && sh.spare && JSON.stringify(sh.longMag) === '[40]' && sh.capLong === 40, sh);
check('DMR: a pull a shot, 4 a second (the M14 3, the Electric Rifle 6), a BB faster and straighter than the M14\'s and slower than the SVD\'s, tighter than the M14; the M14\'s weight and walk; 20 in the mag; the AR\'s slots',
  sh.d.mode === 'semi' && sh.d.el && sh.d.rpm === 240 && sh.d.rpm > sh.m14.rpm && sh.d.rpm < sh.er.rpm
  && sh.d.v === 63 && sh.d.v > sh.m14.v && sh.d.v < sh.svd.v && sh.d.straight > sh.m14.straight && sh.d.straight < sh.svd.straight && sh.d.base < sh.m14.base
  && sh.d.w === sh.m14.w && sh.d.walk === sh.m14.walk && sh.d.cap === 20 && sh.d.price > sh.m14.price
  && JSON.stringify(sh.d.slots) === JSON.stringify(sh.ar.slots), sh);

await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'dmr' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  // a whole mag, a pull every 16 frames (3.75 a second, under its 4): each pull a BB
  const speeds = [];
  let pulls = 0;
  while (Game.gun.ammo > 0 && pulls < 40) {
    const n0 = Game.scenario.bbs.length, a = Game.gun.ammo;
    Game.mouseLMB = true; onLmbDown(); pulls++;
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    if (Game.scenario.bbs.length > n0 && a - Game.gun.ammo === 1) speeds.push(+bb.vel.length().toFixed(2));
    step(); up();
    for (let i = 0; i < 15; i++) step();
  }
  out.pulls = pulls; out.speeds = speeds;
  // pulled as fast as you can (every frame): the cycle holds it to 4 a second
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  for (let i = 0; i < 30; i++) step();
  const a1 = Game.gun.ammo;
  for (let f = 0; f < 60; f++) { Game.mouseLMB = true; onLmbDown(); step(); up(); }
  out.perSecond = a1 - Game.gun.ammo;
  // aimed, the AR's post on the reticle
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  let post = null; fpGun.traverse(o => { if (o.userData && o.userData.frontSight) post = o; });
  post.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.parts = ['lower', 'mag', 'floatTube', 'longBarrel', 'battery'].every(n => !!fpGun.getObjectByName(n));
  // the barrel reaches 8 cm past the AR's: the gun's front (the muzzle-part measure) against the AR's
  const m = FP_GUN_MOUNT.dmr;
  out.frontZ = +measureGunForUnder(buildBareGunMesh('dmr'), m).frontZ.toFixed(3);
  out.arFrontZ = +measureGunForUnder(buildBareGunMesh('ar'), FP_GUN_MOUNT.ar).frontZ.toFixed(3);
  // the short mag's top still sits in the magwell, as the AR's
  const gl = new THREE.Matrix4().copy(fpGun.matrixWorld).invert();
  const magBox = new THREE.Box3().setFromObject(fpGun.getObjectByName('mag')).applyMatrix4(gl);
  out.magTop = +magBox.max.y.toFixed(4); out.magLen = +(magBox.max.y - magBox.min.y).toFixed(4);
  const acc = fpGun.userData.accessories;
  out.rails = !!acc && acc.railAnchors.length === 2;
  out.hands = JSON.stringify(FP_HANDS.dmr) === JSON.stringify(FP_HANDS.ar);
  const kg = buildEnemyGunMesh('dmr');
  out.kidGun = !!kg && kg.children.length >= 4;
  return out;
});
await g.shot('gun-dmr-aimed');
console.log('   dmr ' + JSON.stringify(D));
check('DMR: its own first-person gun with a 20 mag; twenty pulls fire the twenty BBs, one each, at about 63 m/s',
  D.mesh === 'dmr' && D.max === 20 && D.pulls === 20 && D.speeds.length === 20 && D.speeds.every(v => Math.abs(v - 63) < 3), D);
check('DMR: pulled every frame for a second it fires 4 (3 to 5), no faster', D.perSecond >= 3 && D.perSecond <= 5, D.perSecond);
check('DMR: its model (the tan lower, the short mag, the float tube, the long barrel, the battery), its front 7-9 cm past the AR\'s, the mag no longer than 9 cm (the AR\'s about 11); the AR\'s hands and two rails; aimed, the post on the reticle (under 0.6°)',
  D.parts && D.arFrontZ - D.frontZ >= 0.07 && D.arFrontZ - D.frontZ <= 0.09 && D.magLen < 0.09 && D.rails && D.hands && D.sightErrDeg < 0.6, D);
check('DMR: a kid holding one has a gun mesh', D.kidGun, D.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
