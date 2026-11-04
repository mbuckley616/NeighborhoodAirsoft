// v1.438 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Auto Pistol, a battery pistol set to AUTO: the only pistol
// that sprays, 12 a second, so its 24-round mag is gone in two seconds. Checked: the shop (its line, the long mag and the
// spare), the spec against the pistols and the MAC-10, and a match with it (the held rate, the mag emptied, the rack on
// a new mag, the blade on the reticle, the long mag under the grip, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Auto Pistol');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, line: text.includes('Full-auto (~12/s)'), paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun,
    spare: text.includes('Spare Auto Pistol Mag (24)'), longMag: (GUN_MAGS.autopistol.mags || []).map(m => m.cap) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, rpm: s.cyclicRPM, walk: s.playerSpeedMult, mode: s.fireMode, type: s.cockType, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), cap2: getGunAccessoryCap(gt) }; };
  out.a = sp('autopistol'); out.mac10 = sp('mac10');
  out.pistols = ['pistol', 'derringer', 'sixshooter', 'boltpistol', 'epistol', 'gaspistol', 'magnum'].map(sp);
  Game.persist.owned.autopistol_mag_50 = true; out.capLong = getMaxAmmoForGun('autopistol'); delete Game.persist.owned.autopistol_mag_50;
  out.pellets = [...new Set(Array.from({ length: 100 }, () => getGunSpec('autopistol').pelletsPerShot()))];
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.a));
check('Auto Pistol: under PISTOLS after the Electric Pistol, with its picture and "Full-auto (~12/s)" in its line, $95 from its page, in your hands; the page sells its spare mag (24) and a long mag of 50',
  JSON.stringify(sh.names) === '["Spring Pistol","Derringer","Six-Shooter","Bolt Pistol","Electric Pistol","Auto Pistol","Gas Pistol","Magnum","Snub-Nose"]'
  && sh.pic && sh.line && sh.paid === 95 && sh.equipped === 'autopistol' && sh.spare && JSON.stringify(sh.longMag) === '[50]' && sh.capLong === 50, sh);
check('Auto Pistol: the only automatic pistol, 12 a second (the MAC-10 18), a BB a shot, slower than the MAC-10\'s and wider than any other pistol\'s; 24 in the mag (two seconds held); a pistol\'s weight and walk; a sight and a rail, nothing else',
  sh.a.mode === 'auto' && sh.pistols.every(p => p.mode !== 'auto') && sh.a.rpm === 720 && sh.mac10.rpm > sh.a.rpm && JSON.stringify(sh.pellets) === '[1]'
  && sh.a.v < sh.mac10.v && sh.pistols.every(p => sh.a.base > p.base || p.gt === 'derringer') && sh.a.cap === 24 && sh.a.cap / (sh.a.rpm / 60) === 2
  && sh.a.w === 2.5 && sh.a.walk >= 1.1 && sh.a.walk < 1.15 && sh.a.cap2.sight === 1 && sh.a.cap2.rails === 1 && !sh.a.cap2.under && !sh.a.cap2.muzzle && !sh.a.cap2.stock, sh);

await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'autopistol' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, cocked0: Game.gun.cocked };
  for (let i = 0; i < 90; i++) step();
  // the trigger held from a full mag: count the shots in the first second, and how long the mag lasts
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  Game.mouseLMB = true; onLmbDown();
  let f = 0, firstSec = 0, emptyAt = -1;
  const a0 = Game.gun.ammo;
  while (f < 240) { step(); f++; if (f === 60) firstSec = a0 - Game.gun.ammo; if (Game.gun.ammo === 0 && emptyAt < 0) emptyAt = f; }
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.firstSec = firstSec; out.emptyS = +(emptyAt / 60).toFixed(2); out.jammed = !!Game.gun.jammed;
  out.cockedEmpty = Game.gun.cocked; out.status = document.getElementById('ammoStatus').textContent;
  for (let i = 0; i < 60; i++) step();
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  let tip = null; fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).applyMatrix4(tip.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.parts = ['slide', 'frame', 'grip', 'longMag', 'magBase', 'selector', 'comp', 'barrel', 'tip'].every(n => !!fpGun.getObjectByName(n));
  // the long mag hangs below the grip's foot, and the orange tip is in front of the compensator
  fpGun.updateMatrixWorld(true);
  const box = n => new THREE.Box3().setFromObject(fpGun.getObjectByName(n));
  const gl = new THREE.Matrix4().copy(fpGun.matrixWorld).invert();
  const loc = n => box(n).applyMatrix4(gl);
  const gripM = fpGun.getObjectByName('grip'); gripM.geometry.computeBoundingBox();   // the grip's own block, not its children
  const gripOwn = gripM.geometry.boundingBox.clone().applyMatrix4(gripM.matrixWorld).applyMatrix4(gl);
  out.magBelow = +(gripOwn.min.y - loc('longMag').min.y).toFixed(3);
  out.tipFront = loc('tip').min.z < loc('comp').min.z;
  const acc = fpGun.userData.accessories;
  out.rail = !!acc && acc.railAnchors.length === 1;
  const kg = buildEnemyGunMesh('autopistol');
  out.kidGun = !!kg && kg.children.length >= 3;
  return out;
});
await g.shot('gun-autopistol-aimed');
console.log('   autopistol ' + JSON.stringify(D));
check('Auto Pistol: held down it fires 12 a second (11 to 13 in the first second) and empties its 24 in about two seconds (1.8 to 2.3 s), no jam',
  D.firstSec >= 11 && D.firstSec <= 13 && D.emptyS >= 1.8 && D.emptyS <= 2.3 && !D.jammed, D);
check('Auto Pistol: run dry, a new mag is racked (the gun is no longer cocked)', D.cockedEmpty === false, { cocked: D.cockedEmpty, status: D.status });
check('Auto Pistol: its own first-person gun (the slide, the long mag and its base, the selector, the compensator, the orange tip in front of it), the mag 4 cm or more below the grip, one rail; aimed, the blade on the reticle (under 0.6°)',
  D.mesh === 'autopistol' && D.max === 24 && D.parts && D.magBelow >= 0.04 && D.tipFront && D.rail && D.sightErrDeg < 0.6, D);
check('Auto Pistol: a kid holding one has a gun mesh', D.kidGun, D.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
