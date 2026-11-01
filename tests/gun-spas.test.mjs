// v1.398 (backlog D.63, Michael: A; batch 5 by his C of 31 Oct): the SPAS-12, a second pump shotgun. Three BBs every
// pump, a faster, tighter BB than the Spring Shotgun's, for a slower pump and walk. Checked: the shop, the spec against
// the Spring Shotgun, and a match with it (pumped the real way, its model, hands and bead). Its own suite rather than
// more of gun-electric, which already boots fourteen matches: CI's browser died at its end with these checks added.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const spShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="SHOTGUNS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'SPAS-12');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare SPAS Shells (45)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const P = getGunSpec('spas'), S = getGunSpec('shotgun');
  out.spas = [P.muzzleVelocity, P.baseSpread, P.curveOnsetDistance, P.cockTime, P.playerSpeedMult, P.fireMode, !!P.electric];
  out.shotgun = [S.muzzleVelocity, S.baseSpread, S.curveOnsetDistance, S.cockTime, S.playerSpeedMult];
  out.pellets = new Set(Array.from({ length: 200 }, () => P.pelletsPerShot())).size === 1 && P.pelletsPerShot() === 3;
  out.weights = [GUN_WEIGHT.spas, GUN_WEIGHT.shotgun];
  return out;
});
console.log('   SHOTGUNS: ' + spShop.names.join(' · '));
check('SPAS-12: under SHOTGUNS after the Thunder Pump, before the KSG (v1.411) and the Semi-Auto Shotgun, with its picture, $140 from its page, in your hands; the page sells its spare shells',
  JSON.stringify(spShop.names) === '["Spring Shotgun","Thunder Pump","SPAS-12","KSG","Semi-Auto Shotgun"]' && spShop.pic && spShop.paid === 140 && spShop.equipped === 'spas' && spShop.spare, spShop);
check('SPAS-12: against the Spring Shotgun always three BBs, a faster BB (34 m/s), tighter, straight for longer (10 m); a slower pump (1.0 s), a slower walk, heavier; a spring pump, not electric',
  spShop.pellets && spShop.spas[0] === 34 && spShop.spas[0] > spShop.shotgun[0] && spShop.spas[1] < spShop.shotgun[1] && spShop.spas[2] > spShop.shotgun[2] && spShop.spas[3] > spShop.shotgun[3]
  && spShop.spas[4] < spShop.shotgun[4] && spShop.weights[0] > spShop.weights[1] && spShop.spas[5] === 'semi' && !spShop.spas[6], spShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'spas' }; });
await g.scenario('bunratty_sean');
const SP = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  // five shots, each pumped the real way (hold to the full pull, let go): three BBs out of each, and the time from a
  // shot to the next one ready
  const per = [], ready = [];
  for (let k = 0; k < 5; k++) {
    const a = Game.gun.ammo; pull(); per.push(a - Game.gun.ammo);
    let f = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; }
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    ready.push(+(f / 60).toFixed(2));
  }
  out.per = per; out.ready = ready;
  for (let i = 0; i < 90; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.pump = fpGun.userData.cockingParts.length === 1 && fpGun.userData.cockingParts[0].children.length > 10;   // the ribbed pump still racks it
  out.parts = ['grip', 'stockRod', 'buttPlate', 'shield'].every(n => !!fpGun.getObjectByName(n)) && !fpGun.getObjectByName('wrist');
  return out;
});
await g.shot('gun-spas-aimed');
console.log('   spas ' + JSON.stringify(SP));
check('SPAS-12: its own first-person gun, 45 in the shells, a pistol grip, folding stock and vented shield, the ribbed pump, both hands on it, aimed the bead on the reticle (under 0.6°)',
  SP.mesh === 'spas' && SP.max === 45 && SP.parts && SP.pump && SP.hands && SP.sightErrDeg < 0.6, SP);
check('SPAS-12: five shots, pumped between, throw three BBs each', SP.per.length === 5 && SP.per.every(n => n === 3), SP.per);
check('SPAS-12: from a shot to the next one ready takes a second or more (the pump, 1.0 s)', SP.ready.every(t => t >= 1.0 && t < 1.6), SP.ready);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
