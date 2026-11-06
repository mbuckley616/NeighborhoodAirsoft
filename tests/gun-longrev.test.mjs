// v1.449 (backlog D.87, Michael: B, gun batch 8, 5 Nov): the Long Revolver, batch 8's second revolver kind: a stainless
// single-action CO2 revolver with an eight-inch barrel. Thumb the hammer for every shot, as the Six-Shooter, for the
// straightest BB of any pistol but the Bolt Pistol. Checked: the shop, the spec against the other pistols, and a match with it (the
// cylinder fired dry, a hammer to thumb between shots and the cylinder turning as it comes back, its speeds, its long
// barrel, hands and sight, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Long Revolver');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('longrev');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Long Revolver Shells (6)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, ads: s.adsSpreadMult, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockType || null, cockTime: s.cockTime || 0, walk: s.playerSpeedMult, electric: !!s.electric, mode: s.fireMode, w: GUN_WEIGHT[gt] }; };
  out.l = sp('longrev'); out.six = sp('sixshooter'); out.mag = sp('magnum');
  out.pistols = ['pistol', 'derringer', 'sixshooter', 'boltpistol', 'epistol', 'autopistol', 'gaspistol', 'magnum', 'snubnose'].map(sp);
  out.cap = getGunAccessoryCap('longrev');
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.l));
console.log('   pistols ' + JSON.stringify(sh.pistols));
check('Long Revolver: last under PISTOLS, after the Snub-Nose, with its picture, $170 from its page, in your hands; the page sells spare shells',
  JSON.stringify(sh.names) === '["Spring Pistol","Derringer","Six-Shooter","Bolt Pistol","Electric Pistol","Auto Pistol","Gas Pistol","Magnum","Snub-Nose","Long Revolver"]' && sh.pic
  && sh.paid === 170 && sh.equipped === 'longrev' && sh.spare, sh);
const { l } = sh;
const bolt = sh.pistols.find(p => p.gt === 'boltpistol');
check('Long Revolver: the Six-Shooter\'s single action (thumb the hammer, 0.35 s), a faster and straighter BB and a tighter cone, aimed too, than every pistol but the Bolt Pistol (which works a 1 s bolt); the Magnum\'s weight; a sight and a rail, nothing else',
  l.mode === 'semi' && !l.electric && l.cock === 'hammer' && l.cockTime === 0.35
  && sh.pistols.filter(p => p.gt !== 'boltpistol').every(p => l.v > p.v && l.straight > p.straight && l.base < p.base && l.ads <= p.ads)
  && bolt.v > l.v && bolt.straight > l.straight && bolt.cockTime > 2 * l.cockTime
  && l.w === sh.mag.w && l.walk < sh.mag.walk && l.walk > 1
  && sh.cap.sight === 1 && sh.cap.rails === 1 && !sh.cap.under && !sh.cap.muzzle && !sh.cap.stock, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'longrev' }; });
await g.scenario('bunratty_sean');
const R = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  const ham = fpGun.userData.cockingParts.find(p => typeof p.userData.baseZ === 'number');
  const cy = fpGun.userData.cockingParts.find(p => p.userData.cockSpin);
  const speeds = [], second = [], cockFrames = [], spinHalf = [];
  let pulls = 0;
  while (Game.gun.ammo > 0 && pulls < 12) {
    const n0 = Game.scenario.bbs.length, a = Game.gun.ammo;
    Game.mouseLMB = true; onLmbDown(); pulls++;
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    if (Game.scenario.bbs.length > n0 && a - Game.gun.ammo === 1) speeds.push(+bb.vel.length().toFixed(2));
    step(); up(); step();
    // a second click without thumbing the hammer fires nothing
    const a2 = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); step(); up(); step(); second.push(a2 - Game.gun.ammo);
    if (Game.gun.ammo === 0) break;
    // thumb the hammer: hold until it is cocked
    Game.mouseLMB = true; onLmbDown();
    let f = 0, half = null;
    while (Game.gun.cockProgress < 0.95 && f < 300) { step(); if (Game.gun.cockProgress > 0) f++; if (half === null && Game.gun.cockProgress >= 0.5) half = +(cy.rotation.y / (Math.PI / 3)).toFixed(2); }
    up();
    let g2 = 0; while (!Game.gun.cocked && g2 < 120) { step(); g2++; }
    cockFrames.push(f); spinHalf.push(half);
    for (let i = 0; i < 10; i++) step();
  }
  out.pulls = pulls; out.speeds = speeds; out.second = second; out.cockFrames = cockFrames; out.spinHalf = spinHalf;
  out.hammerHome = +(ham.position.z - ham.userData.baseZ).toFixed(4);
  return out;
});
console.log('   longrev ' + JSON.stringify(R));
check('Long Revolver: its own first-person gun with six in the cylinder; six shots, one a pull, each needing the hammer thumbed (a second click fires nothing)',
  R.mesh === 'longrev' && R.max === 6 && R.speeds.length === 6 && R.second.every(n => n === 0), R);
check('Long Revolver: every BB about 48 m/s', R.speeds.every(v => Math.abs(v - 48) < 2), R.speeds);
check('Long Revolver: thumbing the hammer back takes about 0.35 s (17-23 frames from the hammer moving to a full pull) and turns the cylinder as it comes back',
  R.cockFrames.length === 5 && R.cockFrames.every(f => f >= 17 && f <= 23) && R.spinHalf.every(h => h !== null && h > 0.3 && h < 0.7), R);
const AIM = await page.evaluate(() => {
  const step = () => stepGame(1 / 60);
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  for (let i = 0; i < 60; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  const front = gt => { const mg = buildBareGunMesh(gt); mg.updateWorldMatrix(true, true); const inv = new THREE.Matrix4().copy(mg.matrixWorld).invert(); let z = 0; mg.traverse(o => { if (o.isMesh && !o.userData.fpHand) { const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv); if (b.min.z < z) z = b.min.z; } }); if (mg.parent) mg.parent.remove(mg); return +z.toFixed(3); };
  return {
    sightErrDeg: +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2),
    hands: !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r),
    parts: ['barrel', 'underlug', 'ejector', 'rib', 'blade', 'tip', 'co2Cap'].every(n => !!fpGun.getObjectByName(n)),
    front: front('longrev'), magFront: front('magnum'),
    kidGun: (() => { const kg = buildEnemyGunMesh('longrev'); return !!kg && kg.children.length >= 3; })(),
  };
});
await g.shot('gun-longrev-aimed');
console.log('   aimed ' + JSON.stringify(AIM));
check('Long Revolver: the long barrel, its underlug, ejector rod, rib, front blade, orange tip and CO2 cap; the muzzle 5-8 cm past the Magnum\'s; your hand on the grip; aimed, the blade on the reticle (under 0.6°)',
  AIM.parts && AIM.hands && AIM.magFront - AIM.front >= 0.05 && AIM.magFront - AIM.front <= 0.08 && AIM.sightErrDeg < 0.6, AIM);
check('Long Revolver: a kid holding one has a gun mesh', AIM.kidGun, AIM.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
