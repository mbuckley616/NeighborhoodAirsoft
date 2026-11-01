// v1.399 (backlog D.63, Michael: A; batch 5 by his C of 31 Oct): the Gas Pistol, a green-gas blowback pistol. A pull a
// shot like the Electric Pistol, with a faster, tighter BB from a smaller mag whose gas cools as it empties, the last BB
// at 80% of the first's speed; the slide blows back with each shot. Checked: the shop, the spec against the Electric
// Pistol, and a match with it (a mag fired dry, the fade, the slide's blowback, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Gas Pistol');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('gaspistol');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Gas Pistol Mag (15)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const G = getGunSpec('gaspistol'), E = getGunSpec('epistol');
  out.gas = [G.muzzleVelocity, G.adsSpreadMult, G.curveOnsetDistance, G.semiRPM, G.playerSpeedMult, G.fireMode, !!G.electric, G.gasFade];
  out.ep = [E.muzzleVelocity, E.adsSpreadMult, E.curveOnsetDistance, E.semiRPM, E.playerSpeedMult];
  out.weights = [GUN_WEIGHT.gaspistol, GUN_WEIGHT.epistol];
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
check('Gas Pistol: under PISTOLS after the Electric Pistol (the Magnum after it since v1.410), with its picture and "Gas blowback" in its line, $130 from its page, in your hands; the page sells its spare mag',
  JSON.stringify(sh.names) === '["Spring Pistol","Six-Shooter","Bolt Pistol","Electric Pistol","Gas Pistol","Magnum"]' && sh.pic && /Gas blowback/.test(sh.rowText)
  && sh.paid === 130 && sh.equipped === 'gaspistol' && sh.spare, sh);
check('Gas Pistol: against the Electric Pistol a faster BB (40 m/s), tighter aimed, straight for longer; a slower cycle (4.5/s), a slower walk, heavier; no cocking between pulls; a 20% gas fade',
  sh.gas[0] === 40 && sh.gas[0] > sh.ep[0] && sh.gas[1] < sh.ep[1] && sh.gas[2] > sh.ep[2] && sh.gas[3] < sh.ep[3] && sh.gas[4] < sh.ep[4]
  && sh.weights[0] > sh.weights[1] && sh.gas[5] === 'semi' && sh.gas[6] && sh.gas[7] === 0.2, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'gaspistol' }; });
await g.scenario('bunratty_sean');
const GP = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  // a whole mag, a pull every 15 frames (4 a second, under its 4.5): each pull a BB; read each BB's speed as it leaves
  const speeds = [], slides = [];
  const slide = fpGun.getObjectByName('slide');
  let pulls = 0;
  while (Game.gun.ammo > 0 && pulls < 40) {
    const n0 = Game.scenario.bbs.length, a = Game.gun.ammo;
    Game.mouseLMB = true; onLmbDown(); pulls++;
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    if (Game.scenario.bbs.length > n0 && a - Game.gun.ammo === 1) speeds.push(+bb.vel.length().toFixed(2));
    step(); step();
    if (slide) slides.push(+(slide.position.z - slide.userData.baseZ).toFixed(4));
    up();
    for (let i = 0; i < 13; i++) step();
  }
  out.pulls = pulls; out.speeds = speeds; out.slideBack = slides; out.slideHome = slide ? +(slide.position.z - slide.userData.baseZ).toFixed(4) : null;
  return out;
});
console.log('   gas ' + JSON.stringify(GP));
check('Gas Pistol: its own first-person gun with a 15 mag; fifteen pulls fire the fifteen BBs, one each, no racking between',
  GP.mesh === 'gaspistol' && GP.max === 15 && GP.pulls === 15 && GP.speeds.length === 15, GP);
const first = GP.speeds[0], last = GP.speeds[GP.speeds.length - 1];
check('Gas Pistol: the gas cools: the first BB about 40 m/s, the last about 80% of it (32), each no faster than the one before',
  Math.abs(first - 40) < 2 && Math.abs(last / first - 0.8) < 0.06 && GP.speeds.every((v, i) => i === 0 || v <= GP.speeds[i - 1] + 1.2), GP.speeds);
check('Gas Pistol: the slide blows back after each shot (2 cm or more) and is home again before the next pull',
  GP.slideBack.every(z => z >= 0.02) && GP.slideHome !== null && GP.slideHome < 0.004, { back: GP.slideBack, home: GP.slideHome });
// a new mag: reload from the bag as any gun, then aimed, its post on the reticle
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
  return {
    sightErrDeg: +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2),
    hands: !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r),
    parts: ['gripPanel', 'hammer', 'gasValve', 'slide'].every(n => !!fpGun.getObjectByName(n)),
  };
});
await g.shot('gun-gas-aimed');
console.log('   aimed ' + JSON.stringify(AIM));
check('Gas Pistol: wooden grip panels, a hammer and the gas valve on it, your hand on the grip, aimed its front post on the reticle (under 0.6°)',
  AIM.parts && AIM.hands && AIM.sightErrDeg < 0.6, AIM);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
