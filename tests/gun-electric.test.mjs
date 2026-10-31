// v1.326 (backlog D.63, Michael: A, batch 1): the electric semi-autos (and since v1.327-v1.328 the Burst Rifle and the Semi-Auto Shotgun, and since v1.335-v1.348 batch 2's M249, L96, P90 and Vector, and since v1.371 batch 3's G36C, AUG and M4, at the end), the Electric Pistol ($110) and the Electric
// Rifle ($150). A battery cycles the spring, so nothing is cocked between shots: every pull fires, up to 5 and 6 a
// second, where their spring kin (the Spring Pistol and the Spring Assault Rifle) fire, then want the slide or the
// charging handle. Run dry, a new mag is racked in as on any gun. Checked: the shop, the spec against the kin, a
// match with each (pulls a second apart and as fast as a finger goes, held down, run dry), the models and the sights.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const NEW = { epistol: ['Electric Pistol', 110, 'PISTOLS', 'pistol'], erifle: ['Electric Rifle', 150, 'RIFLES', 'ar'] };

// --- the shop
for (const [gt, [name, price, kind]] of Object.entries(NEW)) {
  const r = await page.evaluate(([gt, name, kind]) => {
    Game.persist.cash = 1000; openShop();
    document.querySelector(`#shopScreen .shop-gun-kind[data-kind="${kind}"]`).click();
    const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
    const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === name);
    const pic = !!(row && row.querySelector('img'));
    row.querySelector('.shop-item-buy').click();
    const cash0 = Game.persist.cash;
    [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
    const text = document.querySelector('#shopScreen').textContent;
    const out = { names, pic, paid: cash0 - Game.persist.cash, owned: !!Game.persist.owned[gt], equipped: Game.persist.equipped.gun, electric: /Electric semi/.test(text), spare: text.includes(GUN_MAGS[gt].spares[0].label) };
    document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
    return out;
  }, [gt, name, kind]);
  console.log(`   ${kind}: ${r.names.join(' · ')}`);
  check(`${name}: under ${kind} with its picture, $${price} from its page, owned and in your hands; the page says electric and sells its spare`,
    r.names.includes(name) && r.pic && r.paid === price && r.owned && r.equipped === gt && r.electric && r.spare, r);
}

// --- the spec: the kin's, but electric
const spec = await page.evaluate((NEW) => {
  const out = {};
  for (const [gt, v] of Object.entries(NEW)) {
    const a = GUN_SPECS[v[3]], e = GUN_SPECS[gt];
    out[gt] = { electric: e.electric, semiRPM: e.semiRPM, mode: e.fireMode, sameSpread: a.baseSpread === e.baseSpread && a.curveStrengthMax === e.curveStrengthMax, mv: [a.muzzleVelocity, e.muzzleVelocity] };
  }
  return out;
}, NEW);
check('both are semi and electric, with the kin\'s spread and curve', Object.values(spec).every(s => s.electric && s.mode === 'semi' && s.semiRPM > 0 && s.sameSpread), spec);

// --- in a match: pulls
const fire = (gt) => page.evaluate((gt) => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const pull = (frames = 2) => { Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < frames; i++) step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step(); };
  const out = { gt, mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  // a pull a second apart, five times
  let a = Game.gun.ammo;
  for (let k = 0; k < 5; k++) { pull(); for (let i = 0; i < 56; i++) step(); }
  out.spaced = a - Game.gun.ammo;
  out.cockedAfter = Game.gun.cocked;
  // as fast as a finger goes: a pull every 3 frames (20 a second) for 2 s
  Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true;
  a = Game.gun.ammo;
  for (let k = 0; k < 40; k++) pull(2);
  out.fastPerSec = (a - Game.gun.ammo) / 2;
  // held down 2 s: one BB
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 120; i++) step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step();
  out.held = a - Game.gun.ammo;
  // run dry: the last BB leaves it uncocked, a new mag wants racking
  for (let i = 0; i < 30; i++) step();
  Game.gun.ammo = 1; Game.gun.cocked = true;
  pull(); for (let i = 0; i < 30; i++) step();
  out.dryCocked = Game.gun.cocked;
  Game.gun.ammo = Game.gun.maxAmmo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 90; i++) step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  for (let i = 0; i < 30; i++) step();
  out.rackedCocked = Game.gun.cocked;
  // aimed: the front post against screen centre
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  if (tip) {
    tip.geometry.computeBoundingBox();
    const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
    out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  }
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  Game.player.adsTarget = 0;
  return out;
}, gt);
const R = {};
for (const gt of ['pistol', 'ar', 'epistol', 'erifle']) {
  await page.evaluate((gt) => { Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 2000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: gt }; }, gt);
  await g.scenario('bunratty_sean');
  R[gt] = await fire(gt);
  console.log('   ' + JSON.stringify(R[gt]));
  if (NEW[gt]) await g.shot('gun-' + gt + '-aimed');
}
for (const [gt, [name, , , kin]] of Object.entries(NEW)) {
  const r = R[gt], k = R[kin];
  check(`${name}: its own first-person gun, ${r.max} in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)`, r.mesh === gt && r.hands && r.sightErrDeg < 0.6, r);
  check(`${name}: five pulls a second apart fire five BBs and it stays cocked (the ${kin === 'ar' ? 'Spring Assault Rifle' : 'Spring Pistol'} fires one, then waits for a cock)`, r.spaced === 5 && r.cockedAfter && k.spaced === 1 && !k.cockedAfter, [r.spaced, k.spaced]);
  check(`${name}: pulled as fast as a finger goes, no faster than its cycle (${(spec[gt].semiRPM / 60).toFixed(0)} a second, at least 4)`, r.fastPerSec >= 4 && r.fastPerSec <= spec[gt].semiRPM / 60 + 0.5, r.fastPerSec);
  check(`${name}: held down, one BB (not an automatic)`, r.held === 1, r.held);
  check(`${name}: run dry it wants a new mag racked in, and the rack takes`, r.dryCocked === false && r.rackedCocked === true, r);
}

// v1.327 (D.63, batch 1): the Burst Rifle, electric too: a pull fires three BBs 1/12 s apart, held or let go
const burstShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Burst Rifle');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /3-round burst/.test(text) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  return out;
});
console.log('   RIFLES: ' + burstShop.names.join(' · '));
check('Burst Rifle: under RIFLES after the Electric Rifle with its picture, $210 from its page, in your hands; the page says 3-round burst (v1.395: the SVD last)',
  JSON.stringify(burstShop.names) === '["Spring Assault Rifle","FAMAS","Electric Rifle","Burst Rifle","Spring Sniper Rifle","L96","SVD"]' && burstShop.pic && burstShop.paid === 210 && burstShop.equipped === 'burst' && burstShop.says, burstShop);
await page.evaluate(() => { Game.persist.bag = 2000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'burst' }; });
await g.scenario('bunratty_sean');
const B = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const S = Game.scenario.stats;
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  // one quick pull (two frames), watched frame by frame
  let a = Game.gun.ammo; const at = [];
  Game.mouseLMB = true; onLmbDown(); at.push(a - Game.gun.ammo);
  for (let f = 1; f <= 30; f++) { if (f === 2) up(); step(); at.push(a - Game.gun.ammo); }
  out.quick = a - Game.gun.ammo;
  out.burstFrames = at.indexOf(3);
  // a pull held down 2 s
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 120; i++) step(); up(); step();
  out.held = a - Game.gun.ammo;
  // a second pull inside the burst adds nothing
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); step(); up(); step(); Game.mouseLMB = true; onLmbDown(); step(); up();
  for (let i = 0; i < 30; i++) step();
  out.doubled = a - Game.gun.ammo;
  // pulled as fast as a finger goes (every 3 frames) for 2 s
  for (let i = 0; i < 30; i++) step();
  a = Game.gun.ammo;
  for (let k = 0; k < 40; k++) { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); }
  for (let i = 0; i < 30; i++) step();
  out.fastPerSec = (a - Game.gun.ammo) / 2;
  out.stillCocked = Game.gun.cocked;
  // two left: the burst fires the two and the gun wants a new mag racked
  Game.gun.ammo = 2;
  Game.mouseLMB = true; onLmbDown(); step(); up(); for (let i = 0; i < 30; i++) step();
  out.lastTwo = 2 - Game.gun.ammo; out.dryCocked = Game.gun.cocked;
  Game.gun.ammo = Game.gun.maxAmmo;
  Game.mouseLMB = true; onLmbDown(); for (let i = 0; i < 90; i++) step(); up();
  for (let i = 0; i < 30; i++) step();
  out.rackedCocked = Game.gun.cocked;
  // let go of the gun mid-burst (a slot swap): the burst stops
  a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); up(); Game.held.slotIdx = 1; for (let i = 0; i < 30; i++) step(); Game.held.slotIdx = 0;
  out.swapped = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-burst-aimed');
console.log('   burst ' + JSON.stringify(B));
check('Burst Rifle: its own first-person gun, 90 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', B.mesh === 'burst' && B.max === 90 && B.hands && B.sightErrDeg < 0.6, B);
check('Burst Rifle: a quick pull fires three BBs, the third 10 frames after the first (1/12 s apart)', B.quick === 3 && B.burstFrames === 10, [B.quick, B.burstFrames]);
check('Burst Rifle: held down 2 s, still three; a second pull inside the burst adds none', B.held === 3 && B.doubled === 3, [B.held, B.doubled]);
check('Burst Rifle: pulled as fast as a finger goes, 6-9 BBs a second (about two bursts), and it stays cocked', B.fastPerSec >= 6 && B.fastPerSec <= 9 && B.stillCocked, [B.fastPerSec, B.stillCocked]);
check('Burst Rifle: with two left it fires the two, then wants a new mag racked; the rack takes', B.lastTwo === 2 && B.dryCocked === false && B.rackedCocked === true, B);
check('Burst Rifle: let go of the gun (a slot swap) and the burst stops after the first BB', B.swapped === 1, B.swapped);

// v1.328 (D.63, batch 1): the Semi-Auto Shotgun, electric too: the spring shotgun's 2-3 BBs a pull, no pump
const ssShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="SHOTGUNS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Semi-Auto Shotgun');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /Electric semi/.test(text) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  return out;
});
console.log('   SHOTGUNS: ' + ssShop.names.join(' · '));
check('Semi-Auto Shotgun: under SHOTGUNS last (v1.398: after the SPAS-12) with its picture, $160 from its page, in your hands; the page says electric semi',
  JSON.stringify(ssShop.names) === '["Spring Shotgun","Thunder Pump","SPAS-12","Semi-Auto Shotgun"]' && ssShop.pic && ssShop.paid === 160 && ssShop.equipped === 'semishotgun' && ssShop.says, ssShop);
await page.evaluate(() => { Game.persist.bag = 2000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'semishotgun' }; });
await g.scenario('bunratty_sean');
const SS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  // five pulls a second apart: BBs out of each
  const per = [];
  for (let k = 0; k < 5; k++) { const a = Game.gun.ammo; pull(); per.push(a - Game.gun.ammo); for (let i = 0; i < 57; i++) step(); }
  out.per = per; out.cockedAfter = Game.gun.cocked;
  // pulled every 3 frames for 2 s: pulls that fired
  Game.gun.ammo = Game.gun.maxAmmo;
  let fired = 0;
  for (let k = 0; k < 40; k++) { const a = Game.gun.ammo; pull(); if (Game.gun.ammo < a) fired++; }
  out.pullsPerSec = fired / 2;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-semishotgun-aimed');
console.log('   semishotgun ' + JSON.stringify(SS));
check('Semi-Auto Shotgun: its own first-person gun, 60 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', SS.mesh === 'semishotgun' && SS.max === 60 && SS.hands && SS.sightErrDeg < 0.6, SS);
check('Semi-Auto Shotgun: five pulls a second apart, each throws 2-3 BBs, and it stays cocked (no pump)', SS.per.length === 5 && SS.per.every(n => n >= 2 && n <= 3) && SS.cockedAfter, SS.per);
check('Semi-Auto Shotgun: pulled as fast as a finger goes, 2-2.5 pulls fire a second (its cycle)', SS.pullsPerSec >= 2 && SS.pullsPerSec <= 2.5, SS.pullsPerSec);
// v1.335 (D.63, batch 2): the M249, a battery light machine gun: full auto from an 800-BB box, the slowest walk
const lmgShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'M249');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /Full-auto/.test(text), slowest: /Very heavy, slowest/.test(text) };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const S = getGunSpec('m249');
  out.speed = S.playerSpeedMult; out.minOther = Math.min(...ALL_GUN_TYPES.filter(t => t !== 'm249').map(t => getGunSpec(t).playerSpeedMult));
  out.weight = GUN_WEIGHT.m249; out.maxOtherWeight = Math.max(...Object.entries(GUN_WEIGHT).filter(([t]) => t !== 'm249').map(([, w]) => w));
  out.vel = [S.muzzleVelocity, getGunSpec('ak47').muzzleVelocity];
  return out;
});
console.log('   AUTOMATICS: ' + lmgShop.names.join(' · '));
check('M249: last of the seventeen (v1.403) under AUTOMATICS with its picture, $320 from its page, in your hands; the page says full-auto and very heavy',
  lmgShop.names[lmgShop.names.length - 1] === 'M249' && lmgShop.names.length === 17 && lmgShop.pic && lmgShop.paid === 320 && lmgShop.equipped === 'm249' && lmgShop.says && lmgShop.slowest, lmgShop);
check('M249: you walk no slower with any gun (0.75), it is the heaviest (15 lb), and its BB is near the AK\'s', lmgShop.speed === 0.75 && lmgShop.speed <= lmgShop.minOther && lmgShop.weight > lmgShop.maxOtherWeight && Math.abs(lmgShop.vel[0] - lmgShop.vel[1]) <= 5, lmgShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'm249' }; });
await g.scenario('bunratty_sean');
const LM = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo, ammo0: Game.gun.ammo };
  for (let i = 0; i < 30; i++) step();
  // held down 2 s: BBs out
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-m249-aimed');
console.log('   m249 ' + JSON.stringify(LM));
check('M249: its own first-person gun, 800 in the box, both hands on it, aimed the front post on the reticle (under 0.6°)', LM.mesh === 'm249' && LM.max === 800 && LM.hands && LM.sightErrDeg < 0.6, LM);
check('M249: held down 2 s it fires 23-26 BBs (12.5 a second)', LM.held2s >= 23 && LM.held2s <= 26, LM.held2s);
// v1.336 (D.63, batch 2): the L96, a second bolt sniper that out-reaches the Spring Sniper Rifle for a slower bolt
const l96Shop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'L96');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const L = getGunSpec('l96'), S = getGunSpec('sniper');
  out.l96 = [L.muzzleVelocity, L.baseSpread, L.curveOnsetDistance, L.cockTime, L.fireMode, L.cockType];
  out.sniper = [S.muzzleVelocity, S.baseSpread, S.curveOnsetDistance, S.cockTime, S.fireMode, S.cockType];
  return out;
});
console.log('   RIFLES: ' + l96Shop.names.join(' · '));
check('L96: under RIFLES right after the Spring Sniper Rifle (v1.395: the SVD after it), with its picture, $190 from its page, in your hands',
  l96Shop.names[l96Shop.names.indexOf('Spring Sniper Rifle') + 1] === 'L96' && l96Shop.pic && l96Shop.paid === 190 && l96Shop.equipped === 'l96', l96Shop);
check('L96: against the Spring Sniper Rifle a faster BB (85 m/s), tighter, straight further (30 m), a slower bolt (1.3 s); both semi bolt guns',
  l96Shop.l96[0] === 85 && l96Shop.l96[0] > l96Shop.sniper[0] && l96Shop.l96[1] < l96Shop.sniper[1] && l96Shop.l96[2] > l96Shop.sniper[2] && l96Shop.l96[3] > l96Shop.sniper[3] && l96Shop.l96[4] === 'semi' && l96Shop.l96[5] === 'bolt', l96Shop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'l96' }; });
await g.scenario('bunratty_sean');
const LS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  // then a pull (aimed, the bolt closed): one BB, and the bolt wants working
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown(); step(); step(); Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step();
  out.shot = a - Game.gun.ammo; out.cockedAfter = Game.gun.cocked;
  return out;
});
await g.shot('gun-l96-aimed');
console.log('   l96 ' + JSON.stringify(LS));
check('L96: its own first-person gun, 10 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', LS.mesh === 'l96' && LS.max === 10 && LS.hands && LS.sightErrDeg < 0.6, LS);
check('L96: a pull fires one BB and then it wants its bolt worked', LS.shot === 1 && LS.cockedAfter === false, LS);
// v1.346 (D.63, batch 2): the P90, the first of the new SMGs, after the UMP under AUTOMATICS
const p90Shop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'P90');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const P = getGunSpec('p90'), M = getGunSpec('mp5');
  out.p90 = [P.cyclicRPM, P.muzzleVelocity, P.curveOnsetDistance, P.playerSpeedMult, P.fireMode];
  out.mp5 = [M.cyclicRPM, M.muzzleVelocity, M.curveOnsetDistance, M.playerSpeedMult, M.fireMode];
  out.weights = [GUN_WEIGHT.p90, GUN_WEIGHT.mp5];
  return out;
});
console.log('   AUTOMATICS: ' + p90Shop.names.join(' · '));
check('P90: under AUTOMATICS after the UMP, with its picture, $210 from its page, in your hands',
  p90Shop.names[p90Shop.names.indexOf('UMP') + 1] === 'P90' && p90Shop.pic && p90Shop.paid === 210 && p90Shop.equipped === 'p90', p90Shop);
check('P90: against the MP5 faster (900 a minute), a quicker walk and lighter, a slower BB (46 m/s) that wobbles sooner; both full auto',
  p90Shop.p90[0] === 900 && p90Shop.p90[0] > p90Shop.mp5[0] && p90Shop.p90[1] < p90Shop.mp5[1] && p90Shop.p90[2] < p90Shop.mp5[2] && p90Shop.p90[3] > p90Shop.mp5[3]
  && p90Shop.weights[0] < p90Shop.weights[1] && p90Shop.p90[4] === 'auto' && p90Shop.mp5[4] === 'auto', p90Shop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'p90' }; });
await g.scenario('bunratty_sean');
const PS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-p90-aimed');
console.log('   p90 ' + JSON.stringify(PS));
check('P90: its own first-person gun, 200 in the mag, both hands on it, aimed the ring\'s post on the reticle (under 0.6°)', PS.mesh === 'p90' && PS.max === 200 && PS.hands && PS.sightErrDeg < 0.6, PS);
check('P90: held down 2 s it fires 29-32 BBs (15 a second)', PS.held2s >= 29 && PS.held2s <= 32, PS.held2s);
// v1.348 (D.63, batch 2): the Vector, the batch's last SMG, after the P90 under AUTOMATICS
const vecShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Vector');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const V = getGunSpec('vector'), M = getGunSpec('mp5');
  out.vector = [V.cyclicRPM, V.muzzleVelocity, V.curveOnsetDistance, V.playerSpeedMult, V.fireMode, V.adsSpreadMult, V.baseSpread];
  out.mp5 = [M.cyclicRPM, M.muzzleVelocity, M.curveOnsetDistance, M.playerSpeedMult, M.fireMode, M.adsSpreadMult, M.baseSpread];
  out.rpms = ['p90', 'mp5', 'ump'].map(gt => getGunSpec(gt).cyclicRPM);
  out.caps = [GUN_MAGS.vector.baseCap, GUN_MAGS.mp5.baseCap];
  return out;
});
console.log('   AUTOMATICS: ' + vecShop.names.join(' · '));
check('Vector: under AUTOMATICS after the P90, with its picture, $230 from its page, in your hands',
  vecShop.names[vecShop.names.indexOf('P90') + 1] === 'Vector' && vecShop.pic && vecShop.paid === 230 && vecShop.equipped === 'vector', vecShop);
check('Vector: against the MP5 faster than any SMG (1000 a minute), tighter aimed (0.28 of the hip spread, 0.4), a 100 mag (150); the same BB, walk and hip spread',
  vecShop.vector[0] === 1000 && vecShop.rpms.every(r => r < 1000) && vecShop.vector[5] < vecShop.mp5[5] && vecShop.caps[0] === 100 && vecShop.caps[0] < vecShop.caps[1]
  && vecShop.vector[1] === vecShop.mp5[1] && vecShop.vector[2] === vecShop.mp5[2] && vecShop.vector[3] === vecShop.mp5[3] && vecShop.vector[6] === vecShop.mp5[6] && vecShop.vector[4] === 'auto', vecShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'vector' }; });
await g.scenario('bunratty_sean');
const VS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-vector-aimed');
console.log('   vector ' + JSON.stringify(VS));
check('Vector: its own first-person gun, 100 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', VS.mesh === 'vector' && VS.max === 100 && VS.hands && VS.sightErrDeg < 0.6, VS);
check('Vector: held down 2 s it fires 32-35 BBs (16.7 a second)', VS.held2s >= 32 && VS.held2s <= 35, VS.held2s);
// v1.371 (D.63, batch 3): the G36C, the first of the automatic rifles, after the AK-47 under AUTOMATICS
const g36Shop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'G36C');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const G = getGunSpec('g36'), A = getGunSpec('ak47');
  out.g36 = [G.cyclicRPM, G.muzzleVelocity, G.curveOnsetDistance, G.playerSpeedMult, G.fireMode, G.adsSpreadMult, G.baseSpread];
  out.ak = [A.cyclicRPM, A.muzzleVelocity, A.curveOnsetDistance, A.playerSpeedMult, A.fireMode, A.adsSpreadMult, A.baseSpread];
  out.caps = [GUN_MAGS.g36.baseCap, GUN_MAGS.ak47.baseCap];
  return out;
});
console.log('   AUTOMATICS: ' + g36Shop.names.join(' · '));
check('G36C: under AUTOMATICS after the AK-47, before the M4 (v1.373), with its picture, $260 from its page, in your hands',
  g36Shop.names[g36Shop.names.indexOf('AK-47') + 1] === 'G36C' && g36Shop.names[g36Shop.names.indexOf('G36C') + 1] === 'M4' && g36Shop.pic && g36Shop.paid === 260 && g36Shop.equipped === 'g36', g36Shop);
check('G36C: against the AK faster (700 a minute, 600), tighter aimed (0.30, 0.35), a quicker walk (0.9, 0.85), a slower BB (52, 55) straight for 18 m (20), a 300 mag (350); the same hip spread',
  g36Shop.g36[0] === 700 && g36Shop.ak[0] === 600 && g36Shop.g36[5] < g36Shop.ak[5] && g36Shop.g36[3] > g36Shop.ak[3] && g36Shop.g36[1] < g36Shop.ak[1]
  && g36Shop.g36[2] < g36Shop.ak[2] && g36Shop.caps[0] === 300 && g36Shop.caps[1] === 350 && g36Shop.g36[6] === g36Shop.ak[6] && g36Shop.g36[4] === 'auto', g36Shop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'g36' }; });
await g.scenario('bunratty_sean');
const GS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-g36-aimed');
console.log('   g36 ' + JSON.stringify(GS));
check('G36C: its own first-person gun, 300 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', GS.mesh === 'g36' && GS.max === 300 && GS.hands && GS.sightErrDeg < 0.6, GS);
check('G36C: held down 2 s it fires 22-25 BBs (11.7 a second)', GS.held2s >= 22 && GS.held2s <= 25, GS.held2s);
// v1.372 (D.63, batch 3): the AUG, a bullpup automatic rifle, after the G36C under AUTOMATICS
const augShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'AUG');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const U = getGunSpec('aug'), A = getGunSpec('ak47'), G = getGunSpec('g36');
  const rifles = ['ar', 'famas', 'erifle', 'burst', 'ak47', 'g36', 'm4', 'm249'].map(getGunSpec);   // v1.373: the M4
  out.aug = [U.cyclicRPM, U.muzzleVelocity, U.curveOnsetDistance, U.playerSpeedMult, U.fireMode, U.adsSpreadMult, U.baseSpread];
  out.ak = [A.cyclicRPM, A.muzzleVelocity, A.curveOnsetDistance, A.playerSpeedMult, A.fireMode, A.adsSpreadMult, A.baseSpread];
  out.g36rpm = G.cyclicRPM;
  out.fastest = rifles.every(s => s.muzzleVelocity < U.muzzleVelocity && s.curveOnsetDistance < U.curveOnsetDistance);
  out.caps = [GUN_MAGS.aug.baseCap, GUN_MAGS.ak47.baseCap, getGunAccessoryCap('aug').under || 0];
  return out;
});
console.log('   AUTOMATICS: ' + augShop.names.join(' · '));
check('AUG: under AUTOMATICS after the M4 (v1.373), before the M249, with its picture, $290 from its page, in your hands',
  augShop.names[augShop.names.indexOf('M4') + 1] === 'AUG' && augShop.names[augShop.names.indexOf('AUG') + 1] === 'RPK' && augShop.pic && augShop.paid === 290 && augShop.equipped === 'aug', augShop);
check('AUG: the fastest, straightest BB of the rifles (58 m/s, 22 m; the AK 55, 20), tighter aimed (0.28, 0.35), 650 a minute (the AK 600, the G36C 700), a 330 mag (350), the AK\'s hip spread, no under-barrel slot',
  augShop.aug[1] === 58 && augShop.aug[2] === 22 && augShop.fastest && augShop.aug[5] < augShop.ak[5] && augShop.aug[0] === 650 && augShop.ak[0] < 650 && augShop.g36rpm > 650
  && augShop.caps[0] === 330 && augShop.caps[1] === 350 && augShop.aug[6] === augShop.ak[6] && augShop.aug[4] === 'auto' && augShop.caps[2] === 0, augShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'aug' }; });
await g.scenario('bunratty_sean');
const US = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null, magZ = null, gripZ = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; if (o.name === 'mag') magZ = o.position.z; if (o.name === 'trigger') gripZ = o.position.z; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.bullpup = magZ > gripZ;
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-aug-aimed');
console.log('   aug ' + JSON.stringify(US));
check('AUG: its own first-person gun, the mag behind the trigger, 330 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', US.mesh === 'aug' && US.bullpup && US.max === 330 && US.hands && US.sightErrDeg < 0.6, US);
check('AUG: held down 2 s it fires 20-23 BBs (10.8 a second)', US.held2s >= 20 && US.held2s <= 23, US.held2s);
// v1.373 (D.63, batch 3): the M4, the all-round automatic rifle, between the G36C and the AUG under AUTOMATICS
const m4Shop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'M4');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const M = getGunSpec('m4'), A = getGunSpec('ak47'), G = getGunSpec('g36'), U = getGunSpec('aug');
  out.m4 = [M.cyclicRPM, M.muzzleVelocity, M.curveOnsetDistance, M.playerSpeedMult, M.fireMode, M.adsSpreadMult, M.baseSpread];
  out.ak = [A.cyclicRPM, A.muzzleVelocity, A.curveOnsetDistance, A.playerSpeedMult, A.fireMode, A.adsSpreadMult, A.baseSpread];
  out.others = [G.cyclicRPM, U.cyclicRPM, G.adsSpreadMult, U.adsSpreadMult];
  out.quickestRifle = ['ar', 'famas', 'erifle', 'burst', 'sniper', 'l96', 'svd', 'ak47', 'g36', 'aug', 'rpk', 'm249'].every(gt => getGunSpec(gt).playerSpeedMult < M.playerSpeedMult);
  out.caps = [GUN_MAGS.m4.baseCap, GUN_MAGS.ak47.baseCap, getGunAccessoryCap('m4').under || 0, GUN_WEIGHT.m4, GUN_WEIGHT.g36];
  return out;
});
console.log('   AUTOMATICS: ' + m4Shop.names.join(' · '));
check('M4: under AUTOMATICS after the G36C, before the AUG, with its picture, $275 from its page, in your hands',
  m4Shop.names[m4Shop.names.indexOf('G36C') + 1] === 'M4' && m4Shop.names[m4Shop.names.indexOf('M4') + 1] === 'AUG' && m4Shop.pic && m4Shop.paid === 275 && m4Shop.equipped === 'm4', m4Shop);
check('M4: the AK\'s BB (55 m/s, 20 m) at 720 a minute (the AK 600, more than the G36C and the AUG), aimed 0.32 (the AK 0.35, wider than the G36C and the AUG), the quickest walk of the rifles (0.92), a 300 mag, an under-barrel slot, the lightest rifle (6.5 lb)',
  m4Shop.m4[0] === 720 && m4Shop.m4[1] === m4Shop.ak[1] && m4Shop.m4[2] === m4Shop.ak[2] && m4Shop.others[0] < 720 && m4Shop.others[1] < 720
  && m4Shop.m4[5] === 0.32 && m4Shop.m4[5] < m4Shop.ak[5] && m4Shop.m4[5] > m4Shop.others[2] && m4Shop.m4[5] > m4Shop.others[3]
  && m4Shop.m4[3] === 0.92 && m4Shop.quickestRifle && m4Shop.caps[0] === 300 && m4Shop.caps[2] === 1 && m4Shop.caps[3] < m4Shop.caps[4]
  && m4Shop.m4[6] === m4Shop.ak[6] && m4Shop.m4[4] === 'auto', m4Shop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'm4' }; });
await g.scenario('bunratty_sean');
const MS = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  return out;
});
await g.shot('gun-m4-aimed');
console.log('   m4 ' + JSON.stringify(MS));
check('M4: its own first-person gun, 300 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°)', MS.mesh === 'm4' && MS.max === 300 && MS.hands && MS.sightErrDeg < 0.6, MS);
check('M4: held down 2 s it fires 23-26 BBs (12 a second)', MS.held2s >= 23 && MS.held2s <= 26, MS.held2s);
// v1.347 (Found in play, v1.336): the Spring Sniper Rifle's irons aimed 2.5° low (its aimed height stayed when v1.225
// moved the front post to the muzzle); aimed, the post's tip is on the reticle as on the L96
await page.evaluate(() => { Game.persist.owned.sniper = true; Game.persist.equipped.gun = 'sniper'; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'sniper' }; });
await g.scenario('bunratty_sean');
const SN = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  return { mesh: fpGun.userData.gunType, sightErrDeg: +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2) };
});
console.log('   sniper ' + JSON.stringify(SN));
check('Spring Sniper Rifle: aimed, the front post\'s tip is on the reticle (under 0.6°; it was 2.5° low)', SN.mesh === 'sniper' && SN.sightErrDeg < 0.6, SN);
// v1.395 (D.63, batch 4): the SVD, a battery sniper: no bolt between shots, two pulls a second at most, last under RIFLES
const svdShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'SVD');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, says: /Electric semi/.test(text), spare: text.includes('Spare SVD Mag (20)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const V = getGunSpec('svd'), S = getGunSpec('sniper');
  out.svd = [V.muzzleVelocity, V.baseSpread, V.curveOnsetDistance, V.playerSpeedMult, V.fireMode, V.electric, V.semiRPM];
  out.sniper = [S.muzzleVelocity, S.baseSpread, S.curveOnsetDistance, S.playerSpeedMult];
  return out;
});
console.log('   RIFLES: ' + svdShop.names.join(' · '));
check('SVD: last under RIFLES, after the L96, with its picture, $230 from its page, in your hands; the page says electric semi and sells its spare',
  svdShop.names[svdShop.names.length - 1] === 'SVD' && svdShop.names[svdShop.names.length - 2] === 'L96' && svdShop.pic && svdShop.paid === 230 && svdShop.equipped === 'svd' && svdShop.says && svdShop.spare, svdShop);
check('SVD: against the Spring Sniper Rifle a slower BB (70 m/s), wider, straight for less (22 m), a quicker walk; semi and electric at 120 a minute',
  svdShop.svd[0] === 70 && svdShop.svd[0] < svdShop.sniper[0] && svdShop.svd[1] > svdShop.sniper[1] && svdShop.svd[2] < svdShop.sniper[2] && svdShop.svd[3] > svdShop.sniper[3] && svdShop.svd[4] === 'semi' && svdShop.svd[5] === true && svdShop.svd[6] === 120, svdShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'svd' }; });
await g.scenario('bunratty_sean');
const SV = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  // five pulls a second apart: one BB each, and nothing to work between them
  const per = [];
  for (let k = 0; k < 5; k++) { const a = Game.gun.ammo; pull(); per.push(a - Game.gun.ammo); for (let i = 0; i < 57; i++) step(); }
  out.per = per; out.cockedAfter = Game.gun.cocked;
  // pulled every 3 frames for 2 s: pulls that fired
  Game.gun.ammo = Game.gun.maxAmmo;
  let fired = 0;
  for (let k = 0; k < 40; k++) { const a = Game.gun.ammo; pull(); if (Game.gun.ammo < a) fired++; }
  out.pullsPerSec = fired / 2;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.noBolt = fpGun.userData.cockingParts.length === 1 && !fpGun.userData.cockingParts[0].userData.baseY && fpGun.userData.cockingParts[0].parent === fpGun;
  return out;
});
await g.shot('gun-svd-aimed');
console.log('   svd ' + JSON.stringify(SV));
check('SVD: its own first-person gun, 20 in the mag, both hands on it, aimed the front post on the reticle (under 0.6°), a charging handle and no bolt', SV.mesh === 'svd' && SV.max === 20 && SV.hands && SV.sightErrDeg < 0.6 && SV.noBolt, SV);
check('SVD: five pulls a second apart fire one BB each and it stays cocked (no bolt)', SV.per.length === 5 && SV.per.every(n => n === 1) && SV.cockedAfter, SV.per);
check('SVD: pulled as fast as a finger goes, 1.5-2.5 pulls fire a second (its cycle, 2)', SV.pullsPerSec >= 1.5 && SV.pullsPerSec <= 2.5, SV.pullsPerSec);
// v1.396 (D.63, batch 4): the RPK, the second light machine gun, the AK with a long barrel and a drum, before the M249
const rpkShop = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'RPK');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare RPK Drum (600)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const R = getGunSpec('rpk'), A = getGunSpec('ak47'), M = getGunSpec('m249');
  out.rpk = [R.cyclicRPM, R.muzzleVelocity, R.curveOnsetDistance, R.playerSpeedMult, R.fireMode, R.adsSpreadMult];
  out.ak = [A.cyclicRPM, A.muzzleVelocity, A.curveOnsetDistance, A.playerSpeedMult, A.fireMode, A.adsSpreadMult];
  out.m249Walk = M.playerSpeedMult;
  out.weights = [GUN_WEIGHT.rpk, GUN_WEIGHT.ak47, GUN_WEIGHT.m249];
  return out;
});
console.log('   AUTOMATICS: ' + rpkShop.names.join(' · '));
check('RPK: under AUTOMATICS after the AUG, before the M249, with its picture, $280 from its page, in your hands; the page sells its spare drum',
  rpkShop.names[rpkShop.names.indexOf('AUG') + 1] === 'RPK' && rpkShop.names[rpkShop.names.indexOf('RPK') + 1] === 'M249' && rpkShop.pic && rpkShop.paid === 280 && rpkShop.equipped === 'rpk' && rpkShop.spare, rpkShop);
check('RPK: against the AK a slower trigger (550 a minute), a faster BB (57 m/s) straight further (23 m), aimed tighter, a slower walk (0.8) but quicker than the M249; heavier than the AK, lighter than the M249',
  rpkShop.rpk[0] === 550 && rpkShop.rpk[0] < rpkShop.ak[0] && rpkShop.rpk[1] === 57 && rpkShop.rpk[1] > rpkShop.ak[1] && rpkShop.rpk[2] > rpkShop.ak[2] && rpkShop.rpk[5] < rpkShop.ak[5]
  && rpkShop.rpk[3] < rpkShop.ak[3] && rpkShop.rpk[3] > rpkShop.m249Walk && rpkShop.rpk[4] === 'auto' && rpkShop.weights[0] > rpkShop.weights[1] && rpkShop.weights[0] < rpkShop.weights[2], rpkShop);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'rpk' }; });
await g.scenario('bunratty_sean');
const RK = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 30; i++) step();
  const a = Game.gun.ammo;
  Game.mouseLMB = true; onLmbDown();
  for (let i = 0; i < 120; i++) step();
  Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  out.held2s = a - Game.gun.ammo;
  for (let i = 0; i < 30; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null, orange = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; if (o.isMesh && o.material.color && o.material.color.getHex() === 0xff7a1a) orange = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  const mag = fpGun.getObjectByName('mag');
  out.drum = !!(mag && mag.geometry.type === 'CylinderGeometry');
  out.tipZ = orange && +orange.position.z.toFixed(3);
  return out;
});
await g.shot('gun-rpk-aimed');
console.log('   rpk ' + JSON.stringify(RK));
check('RPK: its own first-person gun, 600 in the drum, a round drum, the tip out past the AK\'s (z -0.50, the AK -0.40), both hands on it, aimed the front post on the reticle (under 0.6°)',
  RK.mesh === 'rpk' && RK.max === 600 && RK.drum && RK.tipZ === -0.5 && RK.hands && RK.sightErrDeg < 0.6, RK);
check('RPK: held down 2 s it fires 17-20 BBs (9.2 a second)', RK.held2s >= 17 && RK.held2s <= 20, RK.held2s);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
