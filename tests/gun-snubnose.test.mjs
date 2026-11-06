// v1.440 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Snub-Nose, the batch's version: the Magnum with its barrel
// cut to a stub. The same CO2 double-action cylinder of six (every pull fires, at most 2.5 a second), but a slower BB
// that wanders sooner in a wider cone, and a light gun with a quick walk. Checked: the shop, the spec against the
// Magnum and the other pistols, and a match with it (the cylinder fired dry, its speeds, the hammer and the cylinder
// turning with each shot, its short barrel, hands and sight, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Snub-Nose');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('snubnose');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Snub-Nose Shells (6)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, ads: s.adsSpreadMult, base: s.baseSpread, straight: s.curveOnsetDistance, rpm: s.semiRPM || 0, walk: s.playerSpeedMult, fade: s.gasFade || 0, electric: !!s.electric, mode: s.fireMode, w: GUN_WEIGHT[gt] }; };
  out.m = sp('snubnose'); out.mag = sp('magnum'); out.der = sp('derringer');
  out.pistols = ['pistol', 'sixshooter', 'boltpistol', 'epistol', 'gaspistol'].map(sp);
  out.cap2 = getGunAccessoryCap('snubnose');
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ m: sh.m, mag: sh.mag, der: sh.der }));
check('Snub-Nose: last under PISTOLS, after the Magnum, with its picture and "Double-action CO2" in its line, $110 from its page, in your hands; the page sells spare shells',
  JSON.stringify(sh.names) === '["Spring Pistol","Derringer","Six-Shooter","Bolt Pistol","Electric Pistol","Auto Pistol","Gas Pistol","Magnum","Snub-Nose","Long Revolver"]' && sh.pic && /Double-action CO2/.test(sh.rowText)
  && sh.paid === 110 && sh.equipped === 'snubnose' && sh.spare, sh);
const { m, mag, der } = sh;
check('Snub-Nose: the Magnum\'s action (double-action CO2, 2.5 a pull a second, no fade, six in the cylinder), but a slower BB (38 m/s against 44), wandering sooner (5 m against 9) in a wider cone; 2 lb against 3.5, a walk between the Magnum\'s and the Derringer\'s, quicker than the Electric and Gas Pistols\'; a sight and a rail, nothing else',
  m.electric && m.mode === 'semi' && m.rpm === mag.rpm && m.rpm === 150 && m.fade === 0
  && m.v === 38 && m.v < mag.v && m.straight === 5 && m.straight < mag.straight && m.base > mag.base && m.ads > mag.ads
  && m.w === 2 && m.w < mag.w && m.walk > mag.walk && m.walk < der.walk && sh.pistols.filter(p => p.electric).every(p => m.walk > p.walk)
  && sh.cap2.sight === 1 && sh.cap2.rails === 1 && !sh.cap2.under && !sh.cap2.muzzle && !sh.cap2.stock, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'snubnose' }; });
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
  // count new BBs, not the list's length: an earlier BB landing in these two steps leaves the list and read as -1
  for (const b of Game.scenario.bbs) b.__beforeDry = true;
  Game.mouseLMB = true; onLmbDown(); step(); up(); step();
  out.dryFired = Game.scenario.bbs.filter(b => !b.__beforeDry).length;
  // pulled as fast as a finger goes (every 4 frames) for 2 s from a full cylinder: at most 2.5 a second
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true; Game.gun.cockProgress = 0; Game.gun.fireCooldown = 0;
  for (let i = 0; i < 30; i++) step();
  const a0 = Game.gun.ammo;
  for (let f = 0; f < 120; f++) { if (f % 4 === 0) { Game.mouseLMB = true; onLmbDown(); } else if (f % 4 === 1) up(); step(); }
  out.fastFired = a0 - Game.gun.ammo;
  return out;
});
console.log('   snubnose ' + JSON.stringify(MG));
check('Snub-Nose: its own first-person gun with a six-shell cylinder; six pulls fire the six BBs, one each, nothing to thumb back; a seventh pull fires nothing',
  MG.mesh === 'snubnose' && MG.max === 6 && MG.pulls === 6 && MG.speeds.length === 6 && MG.dryFired === 0, MG);
check('Snub-Nose: the CO2 holds: every BB about 38 m/s, the sixth as fast as the first',
  MG.speeds.every(v => Math.abs(v - 38) < 2) && Math.abs(MG.speeds[5] - MG.speeds[0]) < 1.5, MG.speeds);
check('Snub-Nose: pulled as fast as a finger goes for 2 s, it fires 5 at most (2.5 a second), and at least 4',
  MG.fastFired >= 4 && MG.fastFired <= 5, MG.fastFired);
check('Snub-Nose: the hammer comes back with each shot (0.8 cm or more) and is home again; the cylinder stands a chamber on each shot (1, 2, 3, 4, 5, then 0 at the sixth)',
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
    parts: ['barrel', 'shroud', 'rib', 'ramp', 'tip', 'co2Cap'].every(n => !!fpGun.getObjectByName(n)) && !fpGun.getObjectByName('underlug') && !fpGun.getObjectByName('ventRib'),
    // the muzzle: the front of the orange tip in the gun's own frame, against the Magnum's
    tipZ: +(fpGun.getObjectByName('tip').position.z - 0.006).toFixed(3),
    magTipZ: (() => { const mg = buildBareGunMesh('magnum'); let z = 0; mg.traverse(o => { if (o.isMesh && o.position.z < z) z = o.position.z; }); return +(z - 0.009).toFixed(3); })(),
    kidGun: (() => { const kg = buildEnemyGunMesh('snubnose'); return !!kg && kg.children.length >= 3; })(),
  };
});
await g.shot('gun-snubnose-aimed');
console.log('   aimed ' + JSON.stringify(AIM));
check('Snub-Nose: the stub barrel, its shroud, rib, front ramp and orange tip, no long underlug or vent rib; the muzzle 8 cm or more short of the Magnum\'s; your hand on the grip; aimed, the ramp on the reticle (under 0.6°)',
  AIM.parts && AIM.hands && AIM.tipZ - AIM.magTipZ >= 0.08 && AIM.sightErrDeg < 0.6, AIM);
check('Snub-Nose: a kid holding one has a gun mesh', AIM.kidGun, AIM.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
