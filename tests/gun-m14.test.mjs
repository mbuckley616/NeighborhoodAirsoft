// v1.404 (backlog D.63, Michael: A; batch 5 by his C of 31 Oct, "a DMR"): the M14, a battery marksman rifle in walnut
// between the rifles and the snipers: every pull fires, three a second at most; a BB faster and straighter than any
// rifle short of a sniper; the AR's walk. Checked: the shop, the spec against the Electric Rifle and the SVD, and a
// match with it (pulls a second apart, pulled as fast as a finger goes, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'M14');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /Electric semi/.test(text), spare: text.includes('Spare M14 Mag (30)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const S = gt => { const s = getGunSpec(gt); return { vel: s.muzzleVelocity, straight: s.curveOnsetDistance, hip: s.baseSpread, rpm: s.semiRPM, walk: s.playerSpeedMult, mode: s.fireMode, electric: !!s.electric }; };
  out.m14 = S('m14'); out.ar = S('ar'); out.erifle = S('erifle'); out.svd = S('svd');
  out.rifles = ['ar', 'famas', 'erifle', 'burst'].map(gt => getGunSpec(gt).muzzleVelocity);
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
check('M14: under RIFLES between the Burst Rifle and the Spring Sniper Rifle, with its picture, $200 from its page, in your hands; the page says electric semi and sells its spare',
  JSON.stringify(sh.names) === '["Spring Assault Rifle","FAMAS","Lever Gun","Electric Rifle","Burst Rifle","M14","Spring Sniper Rifle","Pump Sniper","L96","SVD"]'
  && sh.pic && sh.paid === 200 && sh.equipped === 'm14' && sh.says && sh.spare, sh);
check('M14: between the rifles and the SVD: a BB faster than every rifle (60 m/s) and slower than the SVD\'s, straight between (18 m), tighter than the AR, wider than the SVD; 3 pulls a second (the Electric Rifle 6, the SVD 2); the AR\'s walk',
  sh.m14.vel === 60 && sh.rifles.every(v => v < 60) && sh.m14.vel < sh.svd.vel && sh.m14.straight > sh.ar.straight && sh.m14.straight < sh.svd.straight
  && sh.m14.hip < sh.ar.hip && sh.m14.hip > sh.svd.hip && sh.m14.rpm === 180 && sh.erifle.rpm > 180 && sh.svd.rpm < 180
  && sh.m14.walk === sh.ar.walk && sh.m14.walk > sh.svd.walk && sh.m14.mode === 'semi' && sh.m14.electric, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'm14' }; });
await g.scenario('bunratty_sean');
const M = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const per = [], vels = [];
  for (let k = 0; k < 5; k++) {
    const a = Game.gun.ammo, n0 = Game.scenario.bbs.length;
    pull(); per.push(a - Game.gun.ammo);
    if (Game.scenario.bbs.length > n0) vels.push(+Game.scenario.bbs[n0].vel.length().toFixed(1));
    for (let i = 0; i < 57; i++) step();
  }
  out.per = per; out.vels = vels; out.cockedAfter = Game.gun.cocked;
  Game.gun.ammo = Game.gun.maxAmmo;
  let fired = 0;
  for (let k = 0; k < 40; k++) { const a = Game.gun.ammo; pull(); if (Game.gun.ammo < a) fired++; }
  out.pullsPerSec = fired / 2;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.noBolt = fpGun.userData.cockingParts.length === 1 && fpGun.userData.cockingParts[0].parent === fpGun;
  out.parts = ['mag', 'cover', 'forend', 'stock'].every(n => !!fpGun.getObjectByName(n));
  out.walnut = fpGun.getObjectByName('stock').material.color.getHex() === 0x8a5a32;
  return out;
});
await g.shot('gun-m14-aimed');
console.log('   m14 ' + JSON.stringify(M));
check('M14: its own first-person gun, walnut, a box mag and the cover, an op-rod handle and no bolt; 30 in the mag; both hands on it; aimed the front post on the reticle (under 0.6°)',
  M.mesh === 'm14' && M.max === 30 && M.parts && M.walnut && M.noBolt && M.hands && M.sightErrDeg < 0.6, M);
check('M14: five pulls a second apart fire one BB each at about 60 m/s, and it stays cocked', M.per.length === 5 && M.per.every(n => n === 1) && M.cockedAfter && M.vels.every(v => Math.abs(v - 60) < 3), M);
check('M14: pulled as fast as a finger goes, 2.5-3.5 pulls fire a second (its cycle, 3)', M.pullsPerSec >= 2.5 && M.pullsPerSec <= 3.5, M.pullsPerSec);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
