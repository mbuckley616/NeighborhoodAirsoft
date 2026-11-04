// v1.439 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Drum Shotgun, a battery shotgun on full auto, fed from a
// drum: the only automatic shotgun, five clouds of two or three BBs a second, so its 100-BB drum lasts about eight
// seconds held. Checked: the shop (its line, the big drum and the spare), the spec against the shotguns, and a match with
// it (the held rate, BBs a cloud, the drum emptied, the charge on a new drum, the post in the ring, the drum under the
// receiver, a kid's gun mesh).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="SHOTGUNS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Drum Shotgun');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, line: text.includes('Full-auto (~5/s)'), paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun,
    spare: text.includes('Spare Shotgun Drum (100)'), longMag: (GUN_MAGS.drumshotgun.mags || []).map(m => m.cap) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, rpm: s.cyclicRPM, walk: s.playerSpeedMult, mode: s.fireMode, type: s.cockType, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt), cap2: getGunAccessoryCap(gt) }; };
  out.a = sp('drumshotgun');
  out.shotguns = ['shotgun', 'double', 'thunder', 'spas', 'ksg', 'semishotgun'].map(sp);
  Game.persist.owned.drumshotgun_mag_160 = true; out.capLong = getMaxAmmoForGun('drumshotgun'); delete Game.persist.owned.drumshotgun_mag_160;
  out.pellets = [...new Set(Array.from({ length: 200 }, () => getGunSpec('drumshotgun').pelletsPerShot()))].sort();
  return out;
});
console.log('   SHOTGUNS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.a));
check('Drum Shotgun: last under SHOTGUNS, with its picture and "Full-auto (~5/s)" in its line, $210 from its page, in your hands; the page sells its spare drum (100) and a big drum of 160',
  JSON.stringify(sh.names) === '["Spring Shotgun","Double-Barrel","Thunder Pump","SPAS-12","KSG","Semi-Auto Shotgun","Drum Shotgun"]'
  && sh.pic && sh.line && sh.paid === 210 && sh.equipped === 'drumshotgun' && sh.spare && JSON.stringify(sh.longMag) === '[160]' && sh.capLong === 160, sh);
check('Drum Shotgun: the only automatic shotgun, 5 clouds a second of 2 or 3 BBs, the slowest shotgun BB but the Thunder Pump\'s, a charging handle; 100 in the drum; heavy (9 lb, a 0.9 walk, slower than every other shotgun); a sight, two rails, a muzzle and a stock, no under-barrel slot',
  sh.a.mode === 'auto' && sh.shotguns.every(p => p.mode !== 'auto') && sh.a.rpm === 300 && JSON.stringify(sh.pellets) === '[2,3]' && sh.a.type === 'charge'
  && sh.shotguns.every(p => sh.a.v < p.v || p.gt === 'thunder') && sh.a.cap === 100 && sh.a.w === 9 && sh.a.walk === 0.9 && sh.shotguns.every(p => p.walk > sh.a.walk)
  && sh.a.cap2.sight === 1 && sh.a.cap2.rails === 2 && !sh.a.cap2.under && sh.a.cap2.muzzle === 1 && sh.a.cap2.stock === 1, sh);

await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'drumshotgun' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, cocked0: Game.gun.cocked };
  for (let i = 0; i < 90; i++) step();
  // the trigger held from a full mag: count the shots in the first second, and how long the mag lasts
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  const pre = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  let f = 0, firstSec = 0, emptyAt = -1, clouds = Game.gun.ammo < pre ? 1 : 0, last = Game.gun.ammo; const per = new Set();
  const a0 = pre;
  while (f < 720) { step(); f++; if (Game.gun.ammo < last) { if (f <= 60) clouds++; per.add(last - Game.gun.ammo); last = Game.gun.ammo; } if (f === 60) firstSec = a0 - Game.gun.ammo; if (Game.gun.ammo === 0 && emptyAt < 0) emptyAt = f; }
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.clouds = clouds; out.per = [...per].sort();
  out.firstSec = firstSec; out.emptyS = +(emptyAt / 60).toFixed(2); out.jammed = !!Game.gun.jammed;
  out.cockedEmpty = Game.gun.cocked; out.status = document.getElementById('ammoStatus').textContent;
  for (let i = 0; i < 60; i++) step();
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  let tip = null; fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).applyMatrix4(tip.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.parts = ['grip', 'stock', 'drum', 'drumNeck', 'drumKey', 'drumWindow'].every(n => !!fpGun.getObjectByName(n));
  // the drum hangs under the receiver, ahead of the grip
  fpGun.updateMatrixWorld(true);
  const gl = new THREE.Matrix4().copy(fpGun.matrixWorld).invert();
  const loc = n => new THREE.Box3().setFromObject(fpGun.getObjectByName(n)).applyMatrix4(gl);
  const d = loc('drum'), gr = loc('grip');
  out.drumAhead = d.max.z <= gr.min.z + 0.005; out.drumDrop = +(-d.min.y).toFixed(3);
  out.saddle = 0; const bare = buildFPDrumShotgun(); for (const o of bare.children) if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.position.x < -0.03) out.saddle++;   // the model as built, before the hands and rail parts go on
  const acc = fpGun.userData.accessories;
  out.rail = !!acc && acc.railAnchors.length === 2;
  const kg = buildEnemyGunMesh('drumshotgun');
  out.kidGun = !!kg && kg.children.length >= 3;
  return out;
});
await g.shot('gun-drumshotgun-aimed');
console.log('   drumshotgun ' + JSON.stringify(D));
check('Drum Shotgun: held down it throws 5 clouds a second (4 to 6 in the first second), 2 or 3 BBs each, and empties its 100 in about eight seconds (6.5 to 10 s), no jam',
  D.clouds >= 4 && D.clouds <= 6 && D.per.every(n => n === 2 || n === 3 || n === 1) && D.emptyS >= 6.5 && D.emptyS <= 10 && !D.jammed, D);
check('Drum Shotgun: run dry, a new drum is charged (the gun is no longer cocked)', D.cockedEmpty === false, { cocked: D.cockedEmpty, status: D.status });
check('Drum Shotgun: its own first-person gun (black grip and stock, the drum with its neck, key and window; the side saddle gone), the drum ahead of the grip and hanging under the receiver, two rails; aimed, the post on the reticle (under 0.6°)',
  D.mesh === 'drumshotgun' && D.max === 100 && D.parts && D.drumAhead && D.drumDrop >= 0.08 && D.saddle === 0 && D.rail && D.sightErrDeg < 0.6, D);
check('Drum Shotgun: a kid holding one has a gun mesh', D.kidGun, D.kidGun);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
