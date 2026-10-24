// v1.326 (backlog D.63, Michael: A, batch 1): the electric semi-autos (and since v1.327-v1.328 the Burst Rifle and the Semi-Auto Shotgun, and since v1.335 batch 2's M249, at the end), the Electric Pistol ($110) and the Electric
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
check('Burst Rifle: under RIFLES after the Electric Rifle with its picture, $210 from its page, in your hands; the page says 3-round burst',
  JSON.stringify(burstShop.names) === '["Spring Assault Rifle","FAMAS","Electric Rifle","Burst Rifle","Spring Sniper Rifle"]' && burstShop.pic && burstShop.paid === 210 && burstShop.equipped === 'burst' && burstShop.says, burstShop);
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
check('Semi-Auto Shotgun: under SHOTGUNS after the Thunder Pump with its picture, $160 from its page, in your hands; the page says electric semi',
  JSON.stringify(ssShop.names) === '["Spring Shotgun","Thunder Pump","Semi-Auto Shotgun"]' && ssShop.pic && ssShop.paid === 160 && ssShop.equipped === 'semishotgun' && ssShop.says, ssShop);
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
check('M249: last under AUTOMATICS with its picture, $320 from its page, in your hands; the page says full-auto and very heavy',
  lmgShop.names[lmgShop.names.length - 1] === 'M249' && lmgShop.names.length === 10 && lmgShop.pic && lmgShop.paid === 320 && lmgShop.equipped === 'm249' && lmgShop.says && lmgShop.slowest, lmgShop);
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
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
