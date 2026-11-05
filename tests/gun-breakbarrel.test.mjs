// v1.447 (backlog D.87, Michael: B, gun batch 8, 5 Nov): the Break-Barrel, a cheap single-shot spring air rifle: one
// shot, then break the barrel down to cock it and load a BB (1.3 s). A stiff spring: a 58 m/s BB straight for 16 m,
// tight. Checked: the shop, the spec against the rifles, and a match with it (a shot, the break, the barrel's swing,
// the off hand behind the hinge, the rail on the barrel and the optic on the tube, the post on the reticle, a kid's gun).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Break-Barrel');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('breakbarrel');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Break-Barrel Tin (30)'), longMag: (GUN_MAGS.breakbarrel.mags || []).map(m => m.cap) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, type: s.cockType, walk: s.playerSpeedMult, el: !!s.electric, barrels: s.barrels || 0, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), price: (GUN_MAGS[gt] || {}).price, slots: getGunAccessoryCap(gt) }; };
  out.b = sp('breakbarrel'); out.rifles = ['ar', 'famas', 'lever', 'erifle', 'gascarbine', 'burst', 'm14', 'sniper', 'pumpsniper', 'l96', 'svd'].map(sp);
  Game.persist.owned.breakbarrel_mag_50 = true; out.capLong = getMaxAmmoForGun('breakbarrel'); delete Game.persist.owned.breakbarrel_mag_50;
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.b));
const R = Object.fromEntries(sh.rifles.map(r => [r.gt, r]));
check('Break-Barrel: under RIFLES after the Lever Gun, with its picture and "Break-barrel" in its line, $60 from its page, in your hands; the page sells its spare tin (30) and a big tin of 50',
  sh.names.indexOf('Break-Barrel') === sh.names.indexOf('Lever Gun') + 1 && sh.names.indexOf('Electric Rifle') === sh.names.indexOf('Break-Barrel') + 1
  && sh.pic && /Break-barrel/.test(sh.rowText) && sh.paid === 60 && sh.equipped === 'breakbarrel' && sh.spare && JSON.stringify(sh.longMag) === '[50]' && sh.capLong === 50, sh);
check('Break-Barrel: the cheapest rifle but the Clear Bullpup; one shot a break, with the L96 the slowest cycle of the rifles (1.3 s); a BB faster and straighter than the AR\'s and the Lever Gun\'s, slower than the snipers\'; tighter than the AR; the Lever Gun\'s walk, lighter; a sight and a rail, a muzzle and a stock, no under slot',
  sh.b.price === 60 && sh.rifles.every(r => r.price > 60) && sh.b.type === 'break' && sh.b.barrels === 0 && !sh.b.el && sh.b.cock === 1.3 && sh.rifles.every(r => r.cock <= 1.3)
  && sh.b.v === 58 && sh.b.v > R.ar.v && sh.b.v > R.lever.v && sh.b.v < R.sniper.v && sh.b.v < R.pumpsniper.v && sh.b.straight > R.ar.straight && sh.b.straight > R.lever.straight
  && sh.b.base < R.ar.base && sh.b.walk === R.lever.walk && sh.b.w < R.lever.w && sh.b.cap === 30
  && sh.b.slots.sight === 1 && sh.b.slots.rails === 1 && sh.b.slots.under === 0 && sh.b.slots.muzzle === 1 && sh.b.slots.stock === 1, sh);

await page.evaluate(() => {
  Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'breakbarrel' };
  // a rail part and an optic on it, so the test sees which rides the barrel
  Game.persist.owned.breakbarrel = true;
  const laser = makeAccessoryInstance('laser'), dot = makeAccessoryInstance('red_dot');
  window._mounts = [mountAccessory('breakbarrel', dot.id, 'sight').ok, mountAccessory('breakbarrel', laser.id, 'rail', 0).ok];
});
await g.scenario('bunratty_sean');
const B = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { const a = Game.gun.ammo, n0 = Game.scenario.bbs.length; Game.mouseLMB = true; onLmbDown(); const bb = Game.scenario.bbs.length > n0 ? Game.scenario.bbs[Game.scenario.bbs.length - 1] : null; const v = bb ? +bb.vel.length().toFixed(1) : 0; step(); step(); up(); step(); return { fired: a - Game.gun.ammo, v }; };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  const pivot = fpGun.userData.breakPivot;
  const shots = [], ready = [], swing = [];
  for (let k = 0; k < 3; k++) {
    const first = pull(); const cockedAfter = Game.gun.cocked;
    for (let i = 0; i < 20; i++) step();
    const second = pull();   // nothing: it must be broken first
    shots.push({ first: first.fired, v: first.v, cockedAfter, second: second.fired });
    if (k === 0) { Game.mouseLMB = true; onLmbDown(); step(); step(); const el = document.querySelector('.cock-label'); out.cockLabel = el ? el.textContent : ''; up(); for (let i = 0; i < 30; i++) step(); }
    let f = 0, maxSwing = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; maxSwing = Math.min(maxSwing, pivot.rotation.x); }
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    for (let i = 0; i < 20; i++) step();
    ready.push(+(f / 60).toFixed(2)); swing.push({ open: +(maxSwing * 180 / Math.PI).toFixed(1), shut: +(pivot.rotation.x * 180 / Math.PI).toFixed(2) });
  }
  out.shots = shots; out.ready = ready; out.swing = swing;
  const lh = fpGun.userData.fpHands.l[0];
  out.handOffBarrel = lh.parent !== pivot;
  const acc = fpGun.userData.accessories;
  out.railOnBarrel = !!acc && acc.railAnchors.length === 1 && acc.railAnchors[0].parent === pivot;
  out.sightOnTube = !!acc && acc.sightAnchor.parent === fpGun;
  out.parts = ['receiver', 'endCap', 'forend', 'wrist', 'stock', 'breech', 'barrel', 'tip', 'frontPost', 'hood'].every(n => !!fpGun.getObjectByName(n));
  // aimed with the irons: take the dot off for this
  for (let i = 0; i < 60; i++) step();
  out.mounts = window._mounts;
  clearGunSlot('breakbarrel', 'sight'); step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  const post = pivot.getObjectByName('frontPost');
  post.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, post.geometry.boundingBox.max.y, 0).applyMatrix4(post.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  const kg = buildEnemyGunMesh('breakbarrel');
  out.kidGun = !!kg && kg.children.length >= 4;
  return out;
});
await g.shot('gun-breakbarrel-aimed');
console.log('   breakbarrel ' + JSON.stringify(B));
check('Break-Barrel: its own first-person gun with a 30 tin: the spring tube, its cap, the forend, the wrist and stock, the breech, the barrel, its orange tip, the hooded post',
  B.mesh === 'breakbarrel' && B.max === 30 && B.parts, B);
check('Break-Barrel: each time, a pull fires one BB at about 58 m/s, and a second pull fires nothing until it is broken',
  B.shots.every(s => s.first === 1 && Math.abs(s.v - 58) < 2.5 && !s.cockedAfter && s.second === 0), B.shots);
check('Break-Barrel: the cock bar reads BREAK OPEN', /BREAK OPEN/.test(B.cockLabel || ''), B.cockLabel);
check('Break-Barrel: breaking it and shutting it takes 1.3 to 1.6 s; the barrel tips down 30° or more and is home after',
  B.ready.every(t => t >= 1.3 && t < 1.6) && B.swing.every(s => s.open <= -30 && Math.abs(s.shut) < 0.5), { ready: B.ready, swing: B.swing });
check('Break-Barrel: the off hand stays on the forend behind the hinge; the rail rides the barrel, the optic stays on the tube',
  B.mounts.every(Boolean) && B.handOffBarrel && B.railOnBarrel && B.sightOnTube, B);
check('Break-Barrel: aimed with the irons, the post on the reticle (under 0.6°)', B.sightErrDeg < 0.6, B.sightErrDeg);
check('Break-Barrel: a kid holding one has a gun mesh', B.kidGun, B.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
