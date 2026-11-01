// v1.412 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the Lever Gun, a spring cowboy carbine. Work the lever
// for every shot (0.5 s, quicker than a bolt), a BB faster and straighter than the AR's, a quicker walk than the AR,
// twelve in the tube. Checked: the shop, the spec against the AR and the sniper, and a match with it (worked the real
// way, the lever swinging, the cock bar's words, its model, hands and sight).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Lever Gun');
  const pic = !!row.querySelector('img');
  const rowText = gunBlurb('lever');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, rowText, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare Lever Gun BBs (12)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, walk: s.playerSpeedMult, type: s.cockType, mode: s.fireMode, electric: !!s.electric, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.l = sp('lever'); out.ar = sp('ar'); out.sniper = sp('sniper'); out.famas = sp('famas');
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ l: sh.l, ar: sh.ar, sniper: sh.sniper }));
check('Lever Gun: under RIFLES after the FAMAS, before the Electric Rifle, with its picture and "Lever-action" in its line, $120 from its page, in your hands; the page sells its spare BBs',
  sh.names[sh.names.indexOf('FAMAS') + 1] === 'Lever Gun' && sh.names[sh.names.indexOf('Lever Gun') + 1] === 'Electric Rifle' && sh.pic && /Lever-action/.test(sh.rowText)
  && sh.paid === 120 && sh.equipped === 'lever' && sh.spare, sh);
const { l, ar, sniper } = sh;
check('Lever Gun: a spring gun worked by its lever every shot (0.5 s, the AR 0.55, the bolt 1.1); a BB faster and straighter than the AR\'s, slower than the sniper\'s (55 m/s, straight 14 m); tighter than the AR; a quicker walk and lighter than the AR; twelve in the tube',
  l.type === 'lever' && l.mode === 'semi' && !l.electric && l.cock === 0.5 && l.cock < ar.cock && l.cock < sniper.cock
  && l.v === 55 && l.v > ar.v && l.v < sniper.v && l.straight === 14 && l.straight > ar.straight && l.straight < sniper.straight
  && l.base < ar.base && l.walk === 0.9 && l.walk > ar.walk && l.walk > sniper.walk && l.w < ar.w && l.cap === 12, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'lever' }; });
await g.scenario('bunratty_sean');
const L = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const lever = fpGun.getObjectByName('lever');
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  const per = [], ready = [], speeds = [], swing = [], words = [];
  for (let k = 0; k < 5; k++) {
    const a = Game.gun.ammo, n0 = Game.scenario.bbs.length; pull(); per.push(a - Game.gun.ammo);
    if (Game.scenario.bbs.length > n0) speeds.push(+Game.scenario.bbs[Game.scenario.bbs.length - 1].vel.length().toFixed(2));
    // a second pull without working the lever fires nothing
    if (k === 0) { const b = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); step(); out.unworkedFired = b - Game.gun.ammo; up(); step(); Game.gun.cockProgress = 0; }
    let f = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; }
    swing.push(+(lever.rotation.x * 180 / Math.PI).toFixed(1));
    words.push(document.querySelector('#cockBar .cock-label').textContent);
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    ready.push(+(f / 60).toFixed(2));
  }
  out.per = per; out.ready = ready; out.speeds = speeds; out.swingDeg = swing; out.words = [...new Set(words)];
  out.leverHome = +(lever.rotation.x * 180 / Math.PI).toFixed(2);
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
  let bands = 0; fpGun.traverse(o => { if (o.name === 'band') bands++; });
  out.parts = ['tube', 'hammer', 'lever'].every(n => !!fpGun.getObjectByName(n)) && bands === 2;
  out.receiverBrass = fpGun.getObjectByName('receiver').material.color.getHex() === 0xc9a14a;
  let bipod = 0; fpGun.traverse(o => { if (o.isMesh && Math.abs(o.position.y + 0.0123) < 1e-6) bipod++; });
  out.bipod = bipod;
  return out;
});
await g.shot('gun-lever-aimed');
console.log('   lever ' + JSON.stringify(L));
check('Lever Gun: its own first-person gun, twelve in the tube, the tube, two bands, the hammer, the brass receiver and the lever, no bipod, both hands on it, aimed the front post on the reticle (under 0.6°)',
  L.mesh === 'lever' && L.max === 12 && L.parts && L.receiverBrass && L.bipod === 0 && L.hands && L.sightErrDeg < 0.6, L);
check('Lever Gun: five shots, the lever worked between, one BB each at about 55 m/s; a pull without working it fires nothing',
  JSON.stringify(L.per) === '[1,1,1,1,1]' && L.speeds.length === 5 && L.speeds.every(v => Math.abs(v - 55) < 2) && L.unworkedFired === 0, L);
check('Lever Gun: the lever swings down about 50° at the full pull and is home (0°) after; the cock bar says WORK LEVER',
  L.swingDeg.every(d => d >= 45 && d <= 55) && Math.abs(L.leverHome) < 0.5 && JSON.stringify(L.words) === '["WORK LEVER"]', L);
check('Lever Gun: from a shot to the next one ready takes 0.75 to 1.0 s (the lever\'s 0.5; a bolt\'s 1.1 takes about 1.4)', L.ready.every(t => t >= 0.75 && t < 1.0), L.ready);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
