// v1.326 (backlog D.63, Michael: A, batch 1): the electric semi-autos, the Electric Pistol ($110) and the Electric
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
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
