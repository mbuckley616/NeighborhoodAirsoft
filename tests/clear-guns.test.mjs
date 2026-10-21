// v1.250 (backlog D.37, Michael: B): four cheap clear-plastic automatics, each bad in its own way: the Rattle Can
// ($25, all three faults), the Clear Sprayer ($35, 6 BBs a second that curve hard), the Ghost Mini ($45, steady but
// jams about one burst in five) and the Tick-Tock ($55, accurate, the longest reach, 2 BBs a second). Checked: the
// shop (prices, under AUTOMATICS first, bought from their pages); then each in a match against the others and the
// Bucket Gun: BBs out in a held second, the share within 0.5 m at 15 m and how far off line, how far a level shot
// carries, bursts that jam, the first-person gun, the aimed sight on the reticle.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const NEW = { rattle: ['Rattle Can', 25], sprayer: ['Clear Sprayer', 35], ghost: ['Ghost Mini', 45], ticktock: ['Tick-Tock', 55] };

// --- the shop
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click(); });
const autos = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim()));
console.log('   AUTOMATICS:', autos.join(' · '));
check('AUTOMATICS lists the four clear guns first, cheapest first, then the Bucket Gun', JSON.stringify(autos.slice(0, 5)) === JSON.stringify([...Object.values(NEW).map(v => v[0]), 'Bucket Gun']), autos);
const pics = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-gun-row')].slice(0, 4).map(r => !!r.querySelector('img')));
check('each has its picture', pics.every(Boolean), pics);
for (const [gt, [name, price]] of Object.entries(NEW)) {
  const r = await page.evaluate(([gt, name]) => {
    const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === name);
    row.querySelector('.shop-item-buy').click();
    const cash0 = Game.persist.cash;
    const buy = [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent));
    buy.click();
    const out = { paid: cash0 - Game.persist.cash, owned: !!Game.persist.owned[gt], equipped: Game.persist.equipped.gun, mags: GUN_MAGS[gt].mags.length + GUN_MAGS[gt].spares.length };
    document.querySelector('#shopScreen .shop-back-btn').click();
    return out;
  }, [gt, name]);
  check(`${name}: $${price} from its page, owned and equipped; no bigger mag or spare sold`, r.paid === price && r.owned && r.equipped === gt && r.mags === 0, r);
}
await page.evaluate(() => closeShop());

// --- in a match, one gun at a time
const probe = (gt) => page.evaluate((gt) => {
  const out = { gt, maxAmmo: Game.gun.maxAmmo, mesh: fpGun && fpGun.userData.gunType };
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  const cock = () => { Game.gun.jammed = false; Game.gun.cocked = true; Game.gun.cockProgress = 0; Game.gun.ammo = Game.gun.maxAmmo; Game.gun._sinceShot = null; };   // v1.292: a fresh trigger each time
  // BBs out in one held second, five tries, jams cleared between (and counted)
  let fired = 0, n = 0;
  withSeededRandom('clear-guns-rate:' + gt, () => {
    for (let k = 0; k < 5; k++) {
      clear(); cock(); Game.gun._jamIn = 0;
      Game.mouseLMB = true; onLmbDown(); Game.gun._jamIn = 0;   // the rate without jams
      for (let f = 0; f < 60; f++) step();
      fired += mine().length; n++;
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step();
    }
  });
  out.perSec = fired / n;
  // bursts that jam: 200 bursts of a second
  let bursts = 0, jams = 0;
  withSeededRandom('clear-guns-jam:' + gt, () => {
    for (let k = 0; k < 200; k++) {
      clear(); cock();
      Game.mouseLMB = true; onLmbDown(); bursts++;
      for (let f = 0; f < 60; f++) step();
      if (Game.gun.jammed) jams++;
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step();
    }
  });
  out.jamShare = jams / bursts;
  cock();
  // hip spread at 15 m and a level shot's carry: 60 single BBs, seeded, flown in free air with the game's model
  Game.player.ads = 0; Game.player.adsTarget = 0; Game.player.sway = 0;
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const flights = [];
  withSeededRandom('clear-guns:' + gt, () => {
    for (let i = 0; i < 60; i++) { clear(); Game.gun.ammo = Game.gun.maxAmmo; fireBB(); for (const b of mine()) flights.push({ p: b.pos.clone(), v: b.vel.clone(), b }); }
  });
  const off = [], carry = [];
  for (const fl of flights) {
    const b = fl.b, pos = fl.p.clone(), vel = fl.v.clone(), start = pos.clone();
    let age = 0, got15 = false;
    for (let s = 0; s < 4 * 200; s++) {
      const dt = 1 / 200; age += dt;
      vel.y += (8.5 * Math.max(0, 1 - age * 1.5) - 9.8) * dt;
      const d = pos.distanceTo(start);
      const ramp = Math.max(0, Math.min(1, (d - (b.curveOnsetDistance ?? 4)) / 0.5));
      vel.addScaledVector(b.curveDir, b.curveStrength * ramp * dt);
      pos.addScaledVector(vel, dt);
      const along = pos.clone().sub(start).dot(fwd);
      if (!got15 && along >= 15) { got15 = true; const lat = pos.clone().sub(start).sub(fwd.clone().multiplyScalar(along)); lat.y = 0; off.push(lat.length()); }
      if (pos.y < start.y - 1.4) { carry.push(along); break; }   // down to the grass from chest height
    }
  }
  off.sort((a, b) => a - b); carry.sort((a, b) => a - b);
  out.within50 = off.filter(x => x < 0.5).length / flights.length;
  out.off15 = off.length ? off[off.length >> 1] : null;
  out.off15p90 = off.length ? off[Math.floor(off.length * 0.9)] : null;
  out.carry = carry.length ? carry[carry.length >> 1] : null;
  clear();
  // aimed: the front sight's tip against screen centre
  Game.player.adsTarget = 1; Game.player.ads = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  if (tip) {
    tip.geometry.computeBoundingBox();
    const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
    out.sightErrDeg = Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI;
  }
  Game.player.adsTarget = 0;
  return out;
}, gt);
const R = {};
for (const gt of [...Object.keys(NEW), 'bucket']) {
  await page.evaluate((gt) => { Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000; }, gt);
  await g.scenario('bunratty_sean');
  R[gt] = await probe(gt);
  const r = R[gt];
  console.log(`   ${gt.padEnd(9)} mag ${r.maxAmmo}, ${r.perSec.toFixed(1)}/s held, jams ${(r.jamShare * 100).toFixed(0)}% of bursts, 15 m: ${(r.within50 * 100).toFixed(0)}% within 0.5 m, ${r.off15?.toFixed(2)} m off (90% ${r.off15p90?.toFixed(2)}), carries ${r.carry?.toFixed(1)} m; sight ${r.sightErrDeg?.toFixed(2)}°`);
  if (gt !== 'bucket') await g.shot('clear-' + gt + '-aimed');
}
const { rattle: RC, sprayer: SP, ghost: GH, ticktock: TT, bucket: BK } = R;
for (const gt of Object.keys(NEW)) {
  check(`${NEW[gt][0]}: its own first-person gun, and aimed the front sight sits on the reticle (under 0.6°)`, R[gt].mesh === gt && R[gt].sightErrDeg < 0.6, [R[gt].mesh, R[gt].sightErrDeg]);
}
check('Clear Sprayer: about 6 BBs a second (5-7)', SP.perSec >= 5 && SP.perSec <= 7, SP.perSec);
check('Clear Sprayer: its BBs curve hard: the middle one 0.9-2 m off line at 15 m (about a 3 m circle), under 30% within 0.5 m', SP.off15 >= 0.9 && SP.off15 <= 2 && SP.within50 < 0.3, [SP.off15, SP.within50]);
check('Ghost Mini: steady (over twice the Sprayer\'s share within 0.5 m at 15 m)', GH.within50 > 2 * SP.within50, [GH.within50, SP.within50]);
check('Ghost Mini: about one burst in five jams (12-30%); the Sprayer and Tick-Tock never', GH.jamShare >= 0.12 && GH.jamShare <= 0.3 && SP.jamShare === 0 && TT.jamShare === 0, [GH.jamShare, SP.jamShare, TT.jamShare]);
check('Tick-Tock: 2 BBs a second (1.5-2.5)', TT.perSec >= 1.5 && TT.perSec <= 2.5, TT.perSec);
check('Tick-Tock: the most accurate (the best share within 0.5 m) and the longest carry of the four',
  ['rattle', 'sprayer', 'ghost'].every(k => TT.within50 >= R[k].within50 && TT.carry > R[k].carry), Object.fromEntries(Object.keys(NEW).map(k => [k, [R[k].within50, R[k].carry]])));
check('Rattle Can: all three faults: slow (under 3/s), curving (under 30% within 0.5 m) and jamming (15-35% of bursts)', RC.perSec < 3 && RC.within50 < 0.3 && RC.jamShare >= 0.15 && RC.jamShare <= 0.35, RC);
check('every clear gun costs less than the Bucket Gun', Object.values(NEW).every(v => v[1] < 110));

// v1.292 (backlog D.50, Michael: C): an automatic tapped fast fired a BB a click, whatever its rate: the Tick-Tock (2 a
// second held) fired 18 BBs in 3 s at six clicks a second. Every automatic now: 3 s held, and 3 s tapped at six and at
// twelve clicks a second (two frames down each), counted by trigger pulls that fired.
const taps = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player._graceT = 1e9;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const out = {};
  for (const [gt, spec] of Object.entries(GUN_SPECS)) {
    if (spec.fireMode !== 'auto') continue;
    Object.assign(Game.gun, { type: gt, fireMode: 'auto', cyclicRPM: spec.cyclicRPM, maxAmmo: 9999, ammo: 9999, jammed: false, cocked: true, _jamIn: 0, _sinceShot: null });
    const S = Game.scenario.stats, run = (every) => {
      Game.gun._sinceShot = null; Game.gun.ammo = 9999; Game.gun.jammed = false; Game.gun.cocked = true;
      const a = S.shots;
      for (let f = 0; f < 180; f++) {
        if (every ? f % every === 0 : f === 0) { Game.mouseLMB = true; onLmbDown(); }
        stepGame(1 / 60); Game.gun._jamIn = 0; Game.gun.jammed = false;
        if (every && f % every === 1) { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); }
      }
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
      for (let f = 0; f < 60; f++) stepGame(1 / 60);
      Game.scenario.bbs.length = 0;
      return S.shots - a;
    };
    out[gt] = { rpm: spec.cyclicRPM, held: run(0), six: run(10), twelve: run(5) };
  }
  Game.player._graceT = 0;
  return out;
});
console.log('   3 s held / tapped 6 a second / tapped 12 a second:', JSON.stringify(taps));
check('Tick-Tock: tapped six or twelve times a second it fires no more than held (6-7 in 3 s; 18 at six taps before v1.292)',
  taps.ticktock && taps.ticktock.six <= taps.ticktock.held && taps.ticktock.twelve <= taps.ticktock.held && taps.ticktock.held <= 7, taps.ticktock);
check('no automatic fires faster tapped than held', Object.values(taps).every(t => t.six <= t.held && t.twelve <= t.held), taps);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
