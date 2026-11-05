// v1.446 (backlog D.87, Michael: B, gun batch 8, 5 Nov): the Gas Carbine, a pistol-calibre carbine: the Gas Pistol's
// green-gas blowback in a short rifle with a stock. A pull a shot at up to 5 a second, a fast BB (50 m/s) straight for
// 13 m, the gas cooling as the mag empties (the last BB at 85%), and the charging handle blown back on every shot.
// Checked: the shop, the spec against the Gas Pistol, the AR and the Electric Rifle, and a match with it (a mag fired
// dry, the fade, the blowback, its model, the AR's hands and slots, the post on the reticle, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Gas Carbine');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('gascarbine');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Gas Carbine Mag (30)'), longMag: (GUN_MAGS.gascarbine.mags || []).map(m => m.cap) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, ads: s.adsSpreadMult, straight: s.curveOnsetDistance, rpm: s.semiRPM, walk: s.playerSpeedMult, mode: s.fireMode, el: !!s.electric, gas: !!s.gas, fade: s.gasFade || 0, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), slots: getGunAccessoryCap(gt) }; };
  out.c = sp('gascarbine'); out.gp = sp('gaspistol'); out.ar = sp('ar'); out.er = sp('erifle'); out.m14 = sp('m14');
  Game.persist.owned.gascarbine_mag_45 = true; out.capLong = getMaxAmmoForGun('gascarbine'); delete Game.persist.owned.gascarbine_mag_45;
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.c));
check('Gas Carbine: under RIFLES after the Electric Rifle, with its picture and "Gas blowback" in its line, $175 from its page, in your hands; the page sells its spare mag (30) and a long mag of 45',
  sh.names.indexOf('Gas Carbine') === sh.names.indexOf('Electric Rifle') + 1 && sh.names.indexOf('Burst Rifle') === sh.names.indexOf('Gas Carbine') + 1
  && sh.pic && /Gas blowback/.test(sh.rowText) && sh.paid === 175 && sh.equipped === 'gascarbine' && sh.spare && JSON.stringify(sh.longMag) === '[45]' && sh.capLong === 45, sh);
check('Gas Carbine: a pull a shot (5 a second, the Gas Pistol 4.5, the Electric Rifle 6), a BB faster than the AR\'s and the Gas Pistol\'s but slower than the M14\'s, straight for longer than the AR\'s, tighter; a 15% fade (the pistol 20%); lighter than the AR, a quicker walk; 30 in the mag; the AR\'s slots',
  sh.c.mode === 'semi' && sh.c.el && sh.c.gas && sh.c.rpm === 300 && sh.c.rpm > sh.gp.rpm && sh.c.rpm < sh.er.rpm
  && sh.c.v === 50 && sh.c.v > sh.ar.v && sh.c.v > sh.gp.v && sh.c.v < sh.m14.v && sh.c.straight > sh.ar.straight && sh.c.base < sh.ar.base
  && sh.c.fade === 0.15 && sh.c.fade < sh.gp.fade && sh.c.w < sh.ar.w && sh.c.w > sh.gp.w && sh.c.walk > sh.ar.walk && sh.c.walk < 1 && sh.c.cap === 30
  && JSON.stringify(sh.c.slots) === JSON.stringify(sh.ar.slots), sh);

await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'gascarbine' }; });
await g.scenario('bunratty_sean');
const GC = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  // a whole mag, a pull every 13 frames (4.6 a second, under its 5): each pull a BB; read each BB's speed as it leaves
  const speeds = [], handles = [];
  const handle = fpGun.userData.cockingParts[0];
  let pulls = 0;
  while (Game.gun.ammo > 0 && pulls < 60) {
    const n0 = Game.scenario.bbs.length, a = Game.gun.ammo;
    Game.mouseLMB = true; onLmbDown(); pulls++;
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    if (Game.scenario.bbs.length > n0 && a - Game.gun.ammo === 1) speeds.push(+bb.vel.length().toFixed(2));
    step(); step();
    handles.push(+(handle.position.z - handle.userData.baseZ).toFixed(4));
    up();
    for (let i = 0; i < 11; i++) step();
  }
  out.pulls = pulls; out.speeds = speeds; out.handleBack = handles; out.handleHome = +(handle.position.z - handle.userData.baseZ).toFixed(4);
  // pulled as fast as you can (every frame): the cycle holds it to 5 a second
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  for (let i = 0; i < 30; i++) step();
  const a1 = Game.gun.ammo;
  for (let f = 0; f < 60; f++) { Game.mouseLMB = true; onLmbDown(); step(); up(); }
  out.perSecond = a1 - Game.gun.ammo;
  // aimed, the AR's post on the reticle
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  let post = null; fpGun.traverse(o => { if (o.userData && o.userData.frontSight) post = o; });
  post.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.parts = ['lower', 'grip', 'mag', 'gasValve', 'shroud'].every(n => !!fpGun.getObjectByName(n));
  const gl = new THREE.Matrix4().copy(fpGun.matrixWorld).invert();
  const loc = n => new THREE.Box3().setFromObject(fpGun.getObjectByName(n)).applyMatrix4(gl);
  const mag = loc('mag'), valve = loc('gasValve');
  out.valveLowest = Math.abs(valve.min.y - mag.min.y) < 1e-4;   // the mag's lowest point is the valve on its base
  const acc = fpGun.userData.accessories;
  out.rails = !!acc && acc.railAnchors.length === 2;
  out.hands = JSON.stringify(FP_HANDS.gascarbine) === JSON.stringify(FP_HANDS.ar);
  const kg = buildEnemyGunMesh('gascarbine');
  out.kidGun = !!kg && kg.children.length >= 4;
  return out;
});
await g.shot('gun-gascarbine-aimed');
console.log('   gascarbine ' + JSON.stringify(GC));
check('Gas Carbine: its own first-person gun with a 30 mag; thirty pulls fire the thirty BBs, one each, no racking between',
  GC.mesh === 'gascarbine' && GC.max === 30 && GC.pulls === 30 && GC.speeds.length === 30, GC);
const first = GC.speeds[0], last = GC.speeds[GC.speeds.length - 1];
check('Gas Carbine: the gas cools: the first BB about 50 m/s, the last about 85% of it, each no faster than the one before',
  Math.abs(first - 50) < 2.5 && Math.abs(last / first - 0.85) < 0.05 && GC.speeds.every((v, i) => i === 0 || v <= GC.speeds[i - 1] + 1.5), GC.speeds);
check('Gas Carbine: the charging handle blows back after each shot (2 cm or more) and is home again before the next pull',
  GC.handleBack.every(z => z >= 0.02) && GC.handleHome < 0.004, { back: GC.handleBack, home: GC.handleHome });
check('Gas Carbine: pulled every frame for a second it fires 5 (4 to 6), no faster', GC.perSecond >= 4 && GC.perSecond <= 6, GC.perSecond);
check('Gas Carbine: its model (the olive lower and grip, the gas mag and the brass valve under it, the barrel shroud), the AR\'s hands and two rails; aimed, the post on the reticle (under 0.6°)',
  GC.parts && GC.valveLowest && GC.rails && GC.hands && GC.sightErrDeg < 0.6, GC);
check('Gas Carbine: a kid holding one has a gun mesh', GC.kidGun, GC.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
