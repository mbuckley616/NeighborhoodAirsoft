// v1.413 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the M60, the belt-fed machine gun from the old war
// movies. A slower beat than the M249 (10 a second) for a faster, straighter BB, wide from the hip, tight aimed, the
// heaviest gun and the slowest walk, a 500 can. Checked: the shop, the spec against the M249 and the RPK, and a match
// with it (held down, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'M60');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, auto: /Full-auto \(~10\/s\)/.test(text), slowest: /Very heavy, slowest/.test(text), spare: text.includes('Spare M60 Can (500)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { rpm: s.cyclicRPM, v: s.muzzleVelocity, base: s.baseSpread, ads: s.adsSpreadMult, straight: s.curveOnsetDistance, walk: s.playerSpeedMult, mode: s.fireMode, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.m60 = sp('m60'); out.m249 = sp('m249'); out.rpk = sp('rpk');
  out.minOtherWalk = Math.min(...ALL_GUN_TYPES.filter(t => t !== 'm60').map(t => getGunSpec(t).playerSpeedMult));
  out.maxOtherWeight = Math.max(...Object.entries(GUN_WEIGHT).filter(([t]) => t !== 'm60').map(([, w]) => w));
  return out;
});
console.log('   AUTOMATICS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ m60: sh.m60, m249: sh.m249, rpk: sh.rpk }));
check('M60: last under AUTOMATICS after the M249, with its picture, $340 from its page, in your hands; the page says full-auto ~10/s and very heavy, and sells its spare can',
  sh.names[sh.names.length - 1] === 'M60' && sh.names[sh.names.length - 2] === 'M249' && sh.pic && sh.paid === 340 && sh.equipped === 'm60' && sh.auto && sh.slowest && sh.spare, sh);
const { m60, m249, rpk } = sh;
check('M60: full auto at 10 a second (the M249 12.5, the RPK 9.2); a BB faster and straighter than the M249\'s (58 m/s straight 22 m); wider from the hip, tighter aimed; 500 in the can',
  m60.mode === 'auto' && m60.rpm === 600 && m60.rpm < m249.rpm && m60.rpm > rpk.rpm && m60.v === 58 && m60.v > m249.v && m60.straight === 22 && m60.straight > m249.straight
  && m60.base > m249.base && m60.base * m60.ads < m249.base * m249.ads && m60.cap === 500, sh);
check('M60: the slowest walk of any gun (0.72) and the heaviest (17 lb)', m60.walk === 0.72 && m60.walk < sh.minOtherWalk && m60.w === 17 && m60.w > sh.maxOtherWeight, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'm60' }; });
await g.scenario('bunratty_sean');
const M = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, press: bbPressWeight({ owner: 'player' }) };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo, n0 = Game.scenario.bbs.length;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  out.speed = Game.scenario.bbs.length > n0 ? +Game.scenario.bbs[Game.scenario.bbs.length - 1].vel.length().toFixed(1) : null;
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
  out.parts = ['flashhider', 'carryhandle', 'mag', 'stock'].every(n => !!fpGun.getObjectByName(n));
  out.can = fpGun.getObjectByName('mag').material.color.getHex() === 0x4f5a2a;
  out.tipZ = +fpGun.getObjectByName('tip').position.z.toFixed(3);
  return out;
});
await g.shot('gun-m60-aimed');
console.log('   m60 ' + JSON.stringify(M));
check('M60: its own first-person gun, 500 in the can, the flash hider, carry handle, green can and long stock, the tip past the M249\'s muzzle, both hands on it, aimed the front post on the reticle (under 0.6°)',
  M.mesh === 'm60' && M.max === 500 && M.parts && M.can && M.tipZ < -0.55 && M.hands && M.sightErrDeg < 0.6, M);
check('M60: held down 2 s it fires 18-21 BBs (10 a second) at about 58 m/s; each BB past a kid presses him as a heavy automatic\'s (3)', M.held2s >= 18 && M.held2s <= 21 && Math.abs(M.speed - 58) < 2 && M.press === 3, M);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
