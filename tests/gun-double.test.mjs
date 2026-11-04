// v1.432 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Double-Barrel, a break-action shotgun. Two barrels of
// three BBs, a pull each with nothing worked between them, then break it open (1.5 s) for the next two. Checked: the
// shop, the spec against the other shotguns, and a match with it (the pair, the break, the barrels tipping down with the
// hand and the parts on them, the bead on the reticle).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="SHOTGUNS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Double-Barrel');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, line: text.includes('Break-action, 2 barrels'), paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Shell Pouch (36)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, walk: s.playerSpeedMult, type: s.cockType, mode: s.fireMode, electric: !!s.electric, barrels: s.barrels || 0, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.d = sp('double'); out.others = ['shotgun', 'thunder', 'spas', 'ksg', 'semishotgun'].map(sp);
  out.pellets = [...new Set(Array.from({ length: 200 }, () => getGunSpec('double').pelletsPerShot()))];
  return out;
});
console.log('   SHOTGUNS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ d: sh.d, others: sh.others }));
check('Double-Barrel: under SHOTGUNS after the Spring Shotgun, with its picture and "Break-action, 2 barrels" in its line, $90 from its page, in your hands; the page sells its spare shell pouch',
  JSON.stringify(sh.names) === '["Spring Shotgun","Double-Barrel","Thunder Pump","SPAS-12","KSG","Semi-Auto Shotgun"]' && sh.pic && sh.line && sh.paid === 90 && sh.equipped === 'double' && sh.spare, sh);
const [spring, thunder, spas] = sh.others;
check('Double-Barrel: two barrels of three BBs at 33 m/s, a cloud between the SPAS-12\'s and the Spring Shotgun\'s, the longest re-cock of the shotguns (1.5 s, "break"), 36 in the pouch',
  sh.d.barrels === 2 && sh.d.type === 'break' && sh.d.mode === 'semi' && !sh.d.electric && JSON.stringify(sh.pellets) === '[3]'
  && sh.d.v === 33 && sh.d.base > spas.base && sh.d.base < spring.base && sh.d.cock === 1.5 && sh.others.every(o => sh.d.cock > o.cock)
  && sh.d.cap === 36 && sh.d.walk === spring.walk && sh.d.w === 6.5, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'double' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { const a = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); return a - Game.gun.ammo; };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, hint: '' };
  for (let i = 0; i < 90; i++) step();
  const pairs = [], ready = [], swing = [];
  const pivot = fpGun.userData.breakPivot;
  const lh = fpGun.userData.fpHands.l[0];
  out.handOnBarrels = lh.parent === pivot;
  for (let k = 0; k < 4; k++) {
    const first = pull(); const cockedAfterFirst = Game.gun.cocked;
    for (let i = 0; i < 20; i++) step();   // out of the shot's 0.25 s lockout
    const second = pull(); const cockedAfterSecond = Game.gun.cocked;
    for (let i = 0; i < 20; i++) step();
    const third = pull();   // nothing: it must be broken open
    pairs.push({ first, second, third, cockedAfterFirst, cockedAfterSecond });
    if (k === 0) { Game.mouseLMB = true; onLmbDown(); step(); step(); const el = document.querySelector('.cock-label'); out.cockLabel = el ? el.textContent : ''; up(); for (let i = 0; i < 30; i++) step(); }
    let f = 0, maxSwing = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; maxSwing = Math.min(maxSwing, pivot.rotation.x); }
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    for (let i = 0; i < 20; i++) step();
    ready.push(+(f / 60).toFixed(2)); swing.push({ open: +(maxSwing * 180 / Math.PI).toFixed(1), shut: +(pivot.rotation.x * 180 / Math.PI).toFixed(2) });
  }
  out.pairs = pairs; out.ready = ready; out.swing = swing;
  for (let i = 0; i < 60; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  const tip = fpGun.userData.breakPivot.getObjectByName('bead');
  tip.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).applyMatrix4(tip.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  let barrels = 0; pivot.traverse(o => { if (o.name === 'barrel') barrels++; });
  out.barrels = barrels;
  out.parts = ['receiver', 'forend', 'rib', 'wrist', 'stock', 'topLever'].every(n => !!fpGun.getObjectByName(n));
  // the rails ride on the barrels, the sight stays on the action
  const acc = fpGun.userData.accessories;
  out.railsOnBarrels = !!acc && acc.railAnchors.length === 2 && acc.railAnchors.every(r => r.parent === pivot);
  out.sightOnAction = !!acc && acc.sightAnchor.parent === fpGun;
  return out;
});
await g.shot('gun-double-aimed');
console.log('   double ' + JSON.stringify(D));
check('Double-Barrel: its own first-person gun, 36 in the pouch, two barrels, the action, forend, rib, top lever and walnut stock; the off hand and the rails on the barrels, the sight on the action; aimed, the bead on the reticle (under 0.6°)',
  D.mesh === 'double' && D.max === 36 && D.barrels === 2 && D.parts && D.handOnBarrels && D.railsOnBarrels && D.sightOnAction && D.sightErrDeg < 0.6, D);
check('Double-Barrel: each time, two pulls fire three BBs each with nothing worked between, and a third pull fires nothing until it is broken open',
  D.pairs.every(p => p.first === 3 && p.cockedAfterFirst && p.second === 3 && !p.cockedAfterSecond && p.third === 0), D.pairs);
check('Double-Barrel: the cock bar reads BREAK OPEN', /BREAK OPEN/.test(D.cockLabel || ''), D.cockLabel);
// break and load = the pull (0.95 of 1.5 s) and the 0.18 s close: about 1.6 s
check('Double-Barrel: breaking it open and shutting it takes 1.5 to 1.8 s; the barrels tip down 25° or more and are home after', D.ready.every(t => t >= 1.5 && t < 1.8) && D.swing.every(s => s.open <= -25 && Math.abs(s.shut) < 0.5), { ready: D.ready, swing: D.swing });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
