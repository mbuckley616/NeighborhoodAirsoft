// v1.437 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Clear Bullpup, a cheap see-through battery bullpup. An
// electric semi (a BB a pull, up to 4 a second) on the clear guns' faults: a soft BB that curves early, one mag and
// nothing more sold, and about one pull in twelve it jams after its BB. Checked: the shop, the spec against the Electric
// Rifle and the clear guns, and a match with it (the pull rate, the jam rate, the panel, the blade on the reticle).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Clear Bullpup');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, line: /Electric semi \(a BB a pull, up to 4\/s, jams 1 pull in 12\)/.test(text), paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun,
    spares: (GUN_MAGS.clearpup.spares || []).length + (GUN_MAGS.clearpup.mags || []).length };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, rpm: s.semiRPM, walk: s.playerSpeedMult, electric: !!s.electric, mode: s.fireMode, jam: s.semiJam || 0, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), cap2: getGunAccessoryCap(gt) }; };
  out.c = sp('clearpup'); out.erifle = sp('erifle'); out.ar = sp('ar');
  out.clearW = ['sprayer', 'ghost', 'ticktock', 'rattle'].map(t => GUN_WEIGHT[t]);
  return out;
});
console.log('   RIFLES: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.c));
check('Clear Bullpup: first under RIFLES, with its picture and "Electric semi (a BB a pull, up to 4/s, jams 1 pull in 12)" in its line, $40 from its page, in your hands; no bigger mag or spare sold',
  sh.names[0] === 'Clear Bullpup' && sh.names[1] === 'Spring Assault Rifle' && sh.pic && sh.line && sh.paid === 40 && sh.equipped === 'clearpup' && sh.spares === 0, sh);
check('Clear Bullpup: an electric semi, 4 a pull a second (the Electric Rifle 6), a slower, wider BB that curves sooner than the Electric Rifle\'s, a jam a 12th of pulls, 100 in the mag; light (3 lb, as the clear guns) and their walk (1.1); a sight, a rail, a muzzle and a stock',
  sh.c.electric && sh.c.mode === 'semi' && sh.c.rpm === 240 && sh.erifle.rpm === 360 && sh.c.v < sh.erifle.v && sh.c.base > sh.erifle.base && sh.c.straight < sh.erifle.straight
  && Math.abs(sh.c.jam - 1 / 12) < 1e-9 && sh.c.cap === 100 && sh.c.w === 3 && sh.c.w >= Math.min(...sh.clearW) && sh.c.w <= Math.max(...sh.clearW) && sh.c.walk === 1.1
  && sh.c.cap2.sight === 1 && sh.c.cap2.rails === 1 && !sh.c.cap2.under && sh.c.cap2.muzzle === 1 && sh.c.cap2.stock === 1, sh);

await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'clearpup' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, cocked0: Game.gun.cocked };
  for (let i = 0; i < 90; i++) step();
  // a fresh pull every frame for 3 s: the gun fires at its own cycle (4 a second), not every click
  let fired = 0, jams = 0, statusJam = '', pulls = 0;
  const pull = () => { const a = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); pulls++; step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); return a - Game.gun.ammo; };
  let t = 0, inRate = 0;
  while (t < 180) {
    const a = Game.gun.ammo, n = pull(); t++;
    if (Game.gun.jammed) { if (!statusJam) statusJam = document.getElementById('ammoStatus').textContent; Game.gun.jammed = false; Game.gun.cocked = true; Game.gun.ammo = Game.gun.maxAmmo; continue; }
    if (n > 0) inRate++;
  }
  out.rate = +(inRate / 3).toFixed(2);
  // the jam rate over many shots, refilled as it goes (a jam costs 2-3 BBs; each is cleared by hand here)
  Game.gun._jams = 0; let shots = 0;
  for (let k = 0; k < 1200; k++) {
    for (let i = 0; i < 16; i++) step();
    Game.gun.ammo = Game.gun.maxAmmo;
    if (pull() > 0) shots++;
    if (Game.gun.jammed) { jams++; if (!statusJam) statusJam = document.getElementById('ammoStatus').textContent; Game.gun.jammed = false; Game.gun.cocked = true; Game.gun.cockProgress = 0; }
  }
  out.shots = shots; out.jams = jams; out.jamRate = +(jams / shots).toFixed(3); out.statusJam = statusJam;
  for (let i = 0; i < 60; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  let tip = null; fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).applyMatrix4(tip.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.parts = ['body', 'gearbox', 'battery', 'buttpad', 'barrel', 'tip', 'mag', 'rail'].every(n => !!fpGun.getObjectByName(n));
  // the mag sits behind the grip: a bullpup
  out.magBehind = fpGun.getObjectByName('mag').position.z > 0.03;
  const acc = fpGun.userData.accessories;
  out.rail = !!acc && acc.railAnchors.length === 1;
  // a kid holding one (a loan to the crew): a clear body with an orange tip
  const kg = buildEnemyGunMesh ? buildEnemyGunMesh('clearpup') : null;
  out.kidGun = !!kg && kg.children.length >= 3;
  return out;
});
await g.shot('gun-clearpup-aimed');
console.log('   clearpup ' + JSON.stringify(D));
check('Clear Bullpup: its own first-person gun (the body, gearbox, battery, butt plate, barrel, orange tip, rail, the mag behind the grip), 100 in the mag, one rail; aimed, the blade on the reticle (under 0.6°)',
  D.mesh === 'clearpup' && D.max === 100 && D.parts && D.magBehind && D.rail && D.sightErrDeg < 0.6, D);
check('Clear Bullpup: clicked as fast as the frames come, it fires 4 a second (3.5 to 4.5)', D.rate >= 3.5 && D.rate <= 4.5, D.rate);
check('Clear Bullpup: it jams after about one shot in twelve (5 to 12 % over 1200 shots), and the panel then reads JAMMED', D.jamRate >= 0.05 && D.jamRate <= 0.12 && D.statusJam === 'JAMMED', { rate: D.jamRate, jams: D.jams, shots: D.shots, status: D.statusJam });
check('Clear Bullpup: a kid holding one has a gun mesh', D.kidGun, D.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
