// v1.403 (backlog D.63, Michael: A; batch 5 by his C of 31 Oct, "an SMG"): the Thompson, a drum-fed SMG in blued steel
// and walnut. Against the MP5: the fastest, straightest BB of the SMGs and the slowest to fire, heavy, so a slower walk.
// Checked: the shop, the spec against the other SMGs, and a match with it (held down 2 s, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Thompson');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Thompson Drum (100)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const SMGS = ['mp5', 'ump', 'p90', 'vector', 'mac10'];
  const T = getGunSpec('thompson');
  out.t = { rpm: T.cyclicRPM, vel: T.muzzleVelocity, straight: T.curveOnsetDistance, walk: T.playerSpeedMult, mode: T.fireMode, hip: T.baseSpread, ads: T.adsSpreadMult };
  out.others = Object.fromEntries(SMGS.map(gt => { const s = getGunSpec(gt); return [gt, { rpm: s.cyclicRPM, vel: s.muzzleVelocity, straight: s.curveOnsetDistance, walk: s.playerSpeedMult }]; }));
  out.weights = { thompson: GUN_WEIGHT.thompson, max: Math.max(...SMGS.map(gt => GUN_WEIGHT[gt] || 0)) };
  out.cap = GUN_MAGS.thompson.baseCap;
  return out;
});
console.log('   AUTOMATICS: ' + sh.names.join(' · '));
check('Thompson: under AUTOMATICS after the Vector, with its picture, $240 from its page, in your hands; the page sells its spare drum',
  sh.names[sh.names.indexOf('Vector') + 1] === 'Thompson' && sh.pic && sh.paid === 240 && sh.equipped === 'thompson' && sh.spare, sh);
const o = Object.values(sh.others);
check('Thompson: against every SMG the fastest BB (54 m/s), straight the longest (18 m), the slowest to fire (560 a minute), the slowest walk (0.96) and the heaviest; full-auto, a 100 drum',
  sh.t.vel === 54 && o.every(s => s.vel < 54 && s.straight < 18 && s.rpm > 560 && s.walk > 0.96) && sh.t.mode === 'auto'
  && sh.t.rpm === 560 && sh.t.straight === 18 && sh.t.walk === 0.96 && sh.weights.thompson > sh.weights.max && sh.cap === 100, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'thompson' }; });
await g.scenario('bunratty_sean');
const TS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo, n0 = Game.scenario.bbs.length;
  Game.mouseLMB = true; onLmbDown();
  const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
  out.vel = bb && Game.scenario.bbs.length > n0 ? +bb.vel.length().toFixed(1) : null;
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
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
  out.parts = ['mag', 'barrel', 'compensator', 'foregrip', 'stock', 'grip'].every(n => !!fpGun.getObjectByName(n));
  return out;
});
await g.shot('gun-thompson-aimed');
console.log('   thompson ' + JSON.stringify(TS));
check('Thompson: its own first-person gun with the drum, finned barrel, wooden grips and stock; 100 in the drum; both hands on it; aimed the front blade on the reticle (under 0.6°)',
  TS.mesh === 'thompson' && TS.max === 100 && TS.parts && TS.hands && TS.sightErrDeg < 0.6, TS);
check('Thompson: held down 2 s it fires 18-20 BBs (9.3 a second), the first at about 54 m/s', TS.held2s >= 18 && TS.held2s <= 20 && Math.abs(TS.vel - 54) < 3, TS);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
