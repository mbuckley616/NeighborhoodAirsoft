// v1.410 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the Magnum, a CO2 double-action revolver. The
// Six-Shooter's six-shell cylinder with nothing to thumb back: every pull fires, at most 2.5 a second (the long
// double-action pull), a faster, straighter BB, and the CO2 does not fade as the Gas Pistol's gas does. Checked: the
// shop, the spec against the other pistols, and a match with it (the cylinder fired dry, its speeds, the hammer and the
// cylinder turning with each shot, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Magnum');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('magnum');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Magnum Shells (6)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, ads: s.adsSpreadMult, base: s.baseSpread, straight: s.curveOnsetDistance, rpm: s.semiRPM || 0, walk: s.playerSpeedMult, fade: s.gasFade || 0, electric: !!s.electric, mode: s.fireMode, w: GUN_WEIGHT[gt] }; };
  out.m = sp('magnum'); out.six = sp('sixshooter'); out.gas = sp('gaspistol'); out.ep = sp('epistol'); out.pistol = sp('pistol');
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ m: sh.m, six: sh.six, gas: sh.gas }));
check('Magnum: last under PISTOLS, after the Gas Pistol, with its picture and "Double-action CO2" in its line, $150 from its page, in your hands; the page sells spare shells',
  JSON.stringify(sh.names) === '["Spring Pistol","Six-Shooter","Bolt Pistol","Electric Pistol","Gas Pistol","Magnum"]' && sh.pic && /Double-action CO2/.test(sh.rowText)
  && sh.paid === 150 && sh.equipped === 'magnum' && sh.spare, sh);
const { m, six, gas } = sh;
check('Magnum: against the Six-Shooter and the Gas Pistol a faster BB (44 m/s), straight for longer (9 m), tighter; no cocking between pulls but the slowest cycle (2.5/s); no gas fade; the heaviest pistol and the slowest walk of them',
  m.v === 44 && m.v > six.v && m.v > gas.v && m.straight > six.straight && m.straight > gas.straight && m.base < six.base && m.ads <= gas.ads
  && m.electric && m.mode === 'semi' && m.rpm === 150 && m.rpm < gas.rpm && m.fade === 0
  && m.w > gas.w && m.w > six.w && m.walk < gas.walk && m.walk < six.walk && m.walk < sh.ep.walk && m.walk < sh.pistol.walk, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'magnum' }; });
await g.scenario('bunratty_sean');
const MG = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  // the cylinder, a pull every 30 frames (2 a second, under its 2.5): each pull a BB
  const speeds = [], hammer = [], cyl = [];
  const ham = fpGun.userData.cockingParts.find(p => typeof p.userData.baseZ === 'number');
  const cy = fpGun.userData.cockingParts.find(p => p.userData.cockSpin);
  let pulls = 0;
  while (Game.gun.ammo > 0 && pulls < 12) {
    const n0 = Game.scenario.bbs.length, a = Game.gun.ammo;
    Game.mouseLMB = true; onLmbDown(); pulls++;
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    if (Game.scenario.bbs.length > n0 && a - Game.gun.ammo === 1) speeds.push(+bb.vel.length().toFixed(2));
    step(); step();
    hammer.push(+(ham.position.z - ham.userData.baseZ).toFixed(4));
    cyl.push(+(cy.rotation.y / (Math.PI / 3)).toFixed(2));
    up();
    for (let i = 0; i < 28; i++) step();
  }
  out.pulls = pulls; out.speeds = speeds; out.hammerBack = hammer; out.cylChambers = cyl;
  out.hammerHome = +(ham.position.z - ham.userData.baseZ).toFixed(4);
  // dry: one more pull fires nothing
  const n1 = Game.scenario.bbs.length;
  Game.mouseLMB = true; onLmbDown(); step(); up(); step();
  out.dryFired = Game.scenario.bbs.length - n1;
  // pulled as fast as a finger goes (every 4 frames) for 2 s from a full cylinder: at most 2.5 a second
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true; Game.gun.cockProgress = 0; Game.gun.fireCooldown = 0;
  for (let i = 0; i < 30; i++) step();
  const a0 = Game.gun.ammo;
  for (let f = 0; f < 120; f++) { if (f % 4 === 0) { Game.mouseLMB = true; onLmbDown(); } else if (f % 4 === 1) up(); step(); }
  out.fastFired = a0 - Game.gun.ammo;
  return out;
});
console.log('   magnum ' + JSON.stringify(MG));
check('Magnum: its own first-person gun with a six-shell cylinder; six pulls fire the six BBs, one each, nothing to thumb back; a seventh pull fires nothing',
  MG.mesh === 'magnum' && MG.max === 6 && MG.pulls === 6 && MG.speeds.length === 6 && MG.dryFired === 0, MG);
check('Magnum: the CO2 holds: every BB about 44 m/s, the sixth as fast as the first',
  MG.speeds.every(v => Math.abs(v - 44) < 2) && Math.abs(MG.speeds[5] - MG.speeds[0]) < 1.5, MG.speeds);
check('Magnum: pulled as fast as a finger goes for 2 s, it fires 5 at most (2.5 a second), and at least 4',
  MG.fastFired >= 4 && MG.fastFired <= 5, MG.fastFired);
check('Magnum: the hammer comes back with each shot (0.8 cm or more) and is home again; the cylinder stands a chamber on each shot (1, 2, 3, 4, 5, then 0 at the sixth)',
  MG.hammerBack.every(z => z >= 0.008) && MG.hammerHome < 0.002 && JSON.stringify(MG.cylChambers) === '[1,2,3,4,5,0]', MG);
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
    parts: ['underlug', 'ventRib', 'co2Cap'].every(n => !!fpGun.getObjectByName(n)),
  };
});
await g.shot('gun-magnum-aimed');
console.log('   aimed ' + JSON.stringify(AIM));
check('Magnum: the underlug, vent rib and CO2 cap on it, your hand on the grip, aimed its front blade on the reticle (under 0.6°)',
  AIM.parts && AIM.hands && AIM.sightErrDeg < 0.6, AIM);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
