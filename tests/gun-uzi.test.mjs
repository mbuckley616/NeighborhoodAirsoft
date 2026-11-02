// v1.414 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the Uzi, a burst SMG. Electric, three BBs a pull 1/20 s
// apart, tighter than the MAC-10 and the MP5, a quick walk, sixty in the stick mag. Checked: the shop, the spec against
// the MAC-10, the MP5 and the Burst Rifle, and a match with it (the burst frame by frame, held, doubled, pulled fast,
// run dry and racked, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Uzi');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /3-round burst/.test(text), spare: text.includes('Spare Uzi Mag (60)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { rpm: s.cyclicRPM, v: s.muzzleVelocity, base: s.baseSpread, ads: s.adsSpreadMult, straight: s.curveOnsetDistance, walk: s.playerSpeedMult, mode: s.fireMode, burst: s.burst || 0, electric: !!s.electric, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.uzi = sp('uzi'); out.mac10 = sp('mac10'); out.mp5 = sp('mp5'); out.burst = sp('burst');
  return out;
});
console.log('   AUTOMATICS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ uzi: sh.uzi, mac10: sh.mac10, mp5: sh.mp5, burst: sh.burst }));
check('Uzi: under AUTOMATICS after the MAC-10, before the AK-47, with its picture, $180 from its page, in your hands; the page says 3-round burst and sells its spare mag',
  sh.names[sh.names.indexOf('MAC-10') + 1] === 'Uzi' && sh.names[sh.names.indexOf('Uzi') + 1] === 'AK-47' && sh.pic && sh.paid === 180 && sh.equipped === 'uzi' && sh.says && sh.spare, sh);
const { uzi, mac10, mp5, burst } = sh;
check('Uzi: an electric burst of three, quicker than the Burst Rifle\'s (1200 a minute, the rifle 720); a BB between the MAC-10\'s and the MP5\'s (44 m/s, straight 12 m); tighter than both from the hip and aimed; a quicker walk than the MP5, slower than the MAC-10; between them in weight; sixty in the mag',
  uzi.electric && uzi.mode === 'semi' && uzi.burst === 3 && uzi.rpm === 1200 && uzi.rpm > burst.rpm
  && uzi.v === 44 && uzi.v > mac10.v && uzi.v < mp5.v && uzi.straight === 12 && uzi.straight > mac10.straight && uzi.straight < mp5.straight
  && uzi.base < mp5.base && uzi.base < mac10.base && uzi.base * uzi.ads < mp5.base * mp5.ads
  && uzi.walk === 1.1 && uzi.walk > mp5.walk && uzi.walk < mac10.walk && uzi.w > mac10.w && uzi.w < mp5.w && uzi.cap === 60, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'uzi' }; });
await g.scenario('bunratty_sean');
const U = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, press: bbPressWeight({ owner: 'player' }) };
  for (let i = 0; i < 30; i++) step();
  // one quick pull (two frames), watched frame by frame
  let a = Game.gun.ammo; const at = [];
  Game.mouseLMB = true; onLmbDown(); at.push(a - Game.gun.ammo);
  for (let f = 1; f <= 30; f++) { if (f === 2) up(); step(); at.push(a - Game.gun.ammo); }
  out.quick = a - Game.gun.ammo; out.burstFrames = at.indexOf(3);
  out.speed = +Game.scenario.bbs[Game.scenario.bbs.length - 1].vel.length().toFixed(1);
  // a pull held down 2 s: still three
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 120; i++) step(); up(); step();
  out.held = a - Game.gun.ammo;
  // a second pull inside the burst adds nothing
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); step(); up(); step(); Game.mouseLMB = true; onLmbDown(); step(); up();
  for (let i = 0; i < 30; i++) step();
  out.doubled = a - Game.gun.ammo;
  // pulled as fast as a finger goes (every 3 frames) for 2 s
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  for (let k = 0; k < 40; k++) { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); }
  for (let i = 0; i < 30; i++) step();
  out.fastPerSec = (a - Game.gun.ammo) / 2;
  out.stillCocked = Game.gun.cocked;
  // two left: the burst fires the two and the gun wants a new mag racked; the rack takes
  Game.gun.ammo = 2;
  Game.mouseLMB = true; onLmbDown(); step(); up(); for (let i = 0; i < 30; i++) step();
  out.lastTwo = 2 - Game.gun.ammo; out.dryCocked = Game.gun.cocked;
  Game.gun.ammo = Game.gun.maxAmmo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 90; i++) step(); up();
  for (let i = 0; i < 30; i++) step();
  out.rackedCocked = Game.gun.cocked;
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.parts = ['upper', 'handguard', 'barrelnut', 'gripsafety', 'stock'].every(n => !!fpGun.getObjectByName(n));
  let tipZ = 0; fpGun.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xff7a1a) tipZ = o.position.z; });
  out.tipZ = +tipZ.toFixed(3);
  return out;
});
await g.shot('gun-uzi-aimed');
console.log('   uzi ' + JSON.stringify(U));
check('Uzi: its own first-person gun, sixty in the mag, the long upper, handguard, barrel nut, grip safety and folded stock, the tip ahead of the MAC-10\'s, both hands on it, aimed the front post on the reticle (under 0.6°)',
  U.mesh === 'uzi' && U.max === 60 && U.parts && U.tipZ < -0.2 && U.hands && U.sightErrDeg < 0.6, U);
check('Uzi: a quick pull fires three BBs at about 44 m/s, the third 6 frames after the first (1/20 s apart)', U.quick === 3 && U.burstFrames === 6 && Math.abs(U.speed - 44) < 2, U);
check('Uzi: held down 2 s, still three; a second pull inside the burst adds none', U.held === 3 && U.doubled === 3, U);
check('Uzi: pulled as fast as a finger goes, 7-11 BBs a second, and it stays cocked', U.fastPerSec >= 7 && U.fastPerSec <= 11 && U.stillCocked, U);
check('Uzi: with two left it fires the two, then wants a new mag racked; the rack takes', U.lastTwo === 2 && U.dryCocked === false && U.rackedCocked === true, U);
check('Uzi: its BBs press a kid as an SMG\'s (2), not a pistol\'s', U.press === 2, U.press);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
