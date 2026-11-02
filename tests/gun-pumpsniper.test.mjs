// v1.416 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the Pump Sniper, a spring sniper racked by a pump under
// the barrel. A quicker next shot than the bolt's (0.75 s, the bolt 1.1), a BB a little slower and shorter-reaching than
// the sniper's, a lighter walk, twenty in the mag. Checked: the shop, the spec against the sniper, the L96 and the Lever
// Gun, and a match with it (racked the real way, the pump sliding with the hand on it, the cock bar's words, its model,
// hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Pump Sniper');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('pumpsniper');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Pump Sniper Mag (20)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, walk: s.playerSpeedMult, type: s.cockType, mode: s.fireMode, electric: !!s.electric, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.p = sp('pumpsniper'); out.sniper = sp('sniper'); out.l96 = sp('l96'); out.lever = sp('lever');
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ p: sh.p, sniper: sh.sniper, l96: sh.l96, lever: sh.lever }));
check('Pump Sniper: under RIFLES after the Spring Sniper Rifle, before the L96, with its picture and "Pump-action" in its line, $110 from its page, in your hands; the page sells its spare mag',
  sh.names[sh.names.indexOf('Spring Sniper Rifle') + 1] === 'Pump Sniper' && sh.names[sh.names.indexOf('Pump Sniper') + 1] === 'L96' && sh.pic && /Pump-action/.test(sh.rowText)
  && sh.paid === 110 && sh.equipped === 'pumpsniper' && sh.spare, sh);
const { p, sniper, l96, lever } = sh;
check('Pump Sniper: a spring gun racked by its pump every shot (0.75 s, the bolts 1.1 and 1.3); a BB slower and shorter-reaching than the sniper\'s but well past the Lever Gun\'s (68 m/s, straight 20 m); a touch wider than the sniper; a quicker walk and lighter than the bolt guns; twenty in the mag',
  p.type === 'pump' && p.mode === 'semi' && !p.electric && p.cock === 0.75 && p.cock < sniper.cock && p.cock < l96.cock
  && p.v === 68 && p.v < sniper.v && p.v > lever.v && p.straight === 20 && p.straight < sniper.straight && p.straight > lever.straight
  && p.base > sniper.base && p.walk === 0.8 && p.walk > sniper.walk && p.walk > l96.walk && p.w < sniper.w && p.cap === 20, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'pumpsniper' }; });
await g.scenario('bunratty_sean');
const P = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const pump = fpGun.getObjectByName('pump');
  const hand = fpGun.userData.fpHands && fpGun.userData.fpHands.l && fpGun.userData.fpHands.l[0];
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, handOnPump: !!(hand && hand.parent === pump) };
  for (let i = 0; i < 90; i++) step();
  const per = [], ready = [], speeds = [], slide = [], words = [];
  const z0 = pump.position.z;
  for (let k = 0; k < 5; k++) {
    const a = Game.gun.ammo, n0 = Game.scenario.bbs.length; pull(); per.push(a - Game.gun.ammo);
    if (Game.scenario.bbs.length > n0) speeds.push(+Game.scenario.bbs[Game.scenario.bbs.length - 1].vel.length().toFixed(2));
    // a second pull without racking the pump fires nothing
    if (k === 0) { const b = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); step(); out.unrackedFired = b - Game.gun.ammo; up(); step(); Game.gun.cockProgress = 0; }
    let f = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; }
    slide.push(+((pump.position.z - z0) * 100).toFixed(1));
    words.push(document.querySelector('#cockBar .cock-label').textContent);
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    ready.push(+(f / 60).toFixed(2));
  }
  out.per = per; out.ready = ready; out.speeds = speeds; out.slideCm = slide; out.words = [...new Set(words)];
  out.pumpHomeCm = +((pump.position.z - z0) * 100).toFixed(2);
  for (let i = 0; i < 90; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const q = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(q.x, q.y), -q.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.parts = ['tube', 'band', 'mag', 'pump', 'forend'].every(n => !!fpGun.getObjectByName(n));
  let bipod = 0, bolt = 0; fpGun.traverse(o => { if (o.isMesh && Math.abs(o.position.y + 0.0123) < 1e-6) bipod++; if (o.isMesh && o.geometry.type === 'SphereGeometry' && Math.abs(o.position.x - 0.055) < 1e-6) bolt++; });
  out.bipod = bipod; out.boltKnob = bolt;
  // the pump at full rack stays clear of the cut-back forend (its back edge at z -0.12)
  out.pumpBackAtRack = +(pump.userData.baseZ + 0.05 + 0.0425).toFixed(4);
  return out;
});
await g.shot('gun-pumpsniper-aimed');
console.log('   pump ' + JSON.stringify(P));
check('Pump Sniper: its own first-person gun, twenty in the mag, the tube, band, mag, short forend and the pump, no bolt or bipod, both hands on it (the off hand on the pump), aimed the front post on the reticle (under 0.6°)',
  P.mesh === 'pumpsniper' && P.max === 20 && P.parts && P.bipod === 0 && P.boltKnob === 0 && P.hands && P.handOnPump && P.sightErrDeg < 0.6, P);
check('Pump Sniper: five shots, the pump racked between, one BB each at about 68 m/s; a pull without racking fires nothing',
  JSON.stringify(P.per) === '[1,1,1,1,1]' && P.speeds.length === 5 && P.speeds.every(v => Math.abs(v - 68) < 2) && P.unrackedFired === 0, P);
check('Pump Sniper: the pump slides back about 5 cm at the full rack, stops short of the forend, and is home after; the cock bar says PUMP FORESTOCK',
  P.slideCm.every(d => d >= 4.5 && d <= 5.1) && Math.abs(P.pumpHomeCm) < 0.1 && P.pumpBackAtRack < -0.12 && JSON.stringify(P.words) === '["PUMP FORESTOCK"]', P);
check('Pump Sniper: from a shot to the next one ready takes 1.0 to 1.3 s (the pump\'s 0.75; a bolt\'s 1.1 takes about 1.4)', P.ready.every(t => t >= 1.0 && t < 1.3), P.ready);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
