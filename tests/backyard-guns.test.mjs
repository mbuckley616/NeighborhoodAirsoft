// v1.168 (backlog D.14 A, Michael: D): four backyard guns, each its own trade. Thunder Pump (pump-up air shotgun:
// a long pump, 4-5 BBs in a wide cloud), Six-Shooter (the fastest re-cock, six to a cylinder), Bucket Gun (an
// electric hopper: hundreds of BBs, slow and soft), Bolt Pistol (accurate, slow to re-cock). Checked in the shop
// with real clicks, then in a match for each, against the gun it is nearest: rounds per shot, time from one shot to
// the next ready (the real hold-and-release cock), the cone, the BB's speed, how far off line it is at 15 m, and
// that the iron sight sits on the reticle when aimed.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); });
const rows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim()));
console.log('   Guns tab:', rows.join(' · '));
const NEW = { thunder: 'Thunder Pump', sixshooter: 'Six-Shooter', bucket: 'Bucket Gun', boltpistol: 'Bolt Pistol' };
check('the Guns tab lists twelve guns, the four new ones among them', rows.length === 12 && Object.values(NEW).every(n => rows.includes(n)), rows);
for (const [gt, name] of Object.entries(NEW)) {
  const r = await page.evaluate(([gt, name]) => {
    const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === name);
    row.querySelector('.shop-item-buy').click();                         // DETAILS
    const desc = document.querySelector('#shopScreen .shop-item .shop-item-desc').textContent;
    const cash0 = Game.persist.cash;
    const buy = [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent));
    buy.click();
    const out = { desc, paid: cash0 - Game.persist.cash, price: GUN_MAGS[gt].price, owned: !!Game.persist.owned[gt], equipped: Game.persist.equipped.gun };
    document.querySelector('#shopScreen .shop-back-btn').click();
    return out;
  }, [gt, name]);
  console.log(`   ${name}: paid $${r.paid}; "${r.desc.slice(0, 90)}…"`);
  check(`${name}: bought from its page for $${r.price} and equipped`, r.owned && r.paid === r.price && r.equipped === gt, r);
}
await g.shot('backyard-guns-shop');
await page.evaluate(() => closeShop());

// --- in a match, one gun at a time
const probe = (gt) => page.evaluate((gt) => {
  const out = { gt, maxAmmo: Game.gun.maxAmmo, ammo0: Game.gun.ammo, mesh: fpGun && fpGun.userData.gunType };
  Game.player.maxHits = 999;   // nothing ends the round while we measure
  Game.player.pitch = 0;
  const step = () => stepGame(1 / 60);
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  // time from a shot to the next one ready, cocking the real way (hold LMB to the full pull, let go)
  const readyTimes = [];
  for (let k = 0; k < 3; k++) {
    clear();
    Game.gun.ammo = Game.gun.maxAmmo;
    Game.mouseLMB = true; onLmbDown();
    let f = 0;
    if (Game.gun.fireMode === 'semi') {
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step(); f++;
      Game.mouseLMB = true;
      while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; }
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
      while (!Game.gun.cocked && f < 900) { step(); f++; }
      readyTimes.push(f / 60);
    } else {
      // auto: count the BBs out in one held second
      for (; f < 60; f++) step();
      out.autoPerSec = mine().length;
      Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step();
    }
  }
  out.readyTimes = readyTimes;
  // per shot: how many BBs, their speed and their cone, hip-fire, standing still, no optic
  Game.player.ads = 0; Game.player.adsTarget = 0; Game.player.sway = 0;
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  let shots = 0, pellets = 0, speed = 0, ang = [];
  const flights = [];
  for (let i = 0; i < 60; i++) {
    clear();
    Game.gun.ammo = Game.gun.maxAmmo;
    const used = fireBB(); shots++; pellets += used;
    for (const b of mine()) {
      speed += b.vel.length();
      ang.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(fwd))) * 180 / Math.PI);
      flights.push({ p: b.pos.clone(), v: b.vel.clone(), b });
    }
  }
  out.perShot = pellets / shots;
  out.speed = speed / pellets;
  ang.sort((a, b) => a - b);
  out.coneMedian = ang[ang.length >> 1];
  out.cone90 = ang[Math.floor(ang.length * 0.9)];
  // off line at 15 m: fly each BB in free air (no world) with the game's own drag-free model, curve included
  const off = [];
  for (const fl of flights.slice(0, 120)) {
    const b = fl.b, pos = fl.p.clone(), vel = fl.v.clone();
    const start = pos.clone();
    let age = 0;
    for (let s = 0; s < 4 * 200; s++) {
      const dt = 1 / 200; age += dt;
      vel.y += (8.5 * Math.max(0, 1 - age * 1.5) - 9.8) * dt;
      const d = pos.distanceTo(start);
      const ramp = Math.max(0, Math.min(1, (d - (b.curveOnsetDistance ?? 4)) / 0.5));
      vel.addScaledVector(b.curveDir, b.curveStrength * ramp * dt);
      pos.addScaledVector(vel, dt);
      const along = pos.clone().sub(start).dot(fwd);
      if (along >= 15) { const lat = pos.clone().sub(start).sub(fwd.clone().multiplyScalar(along)); lat.y = 0; off.push(lat.length()); break; }
    }
  }
  off.sort((a, b) => a - b);
  out.reached15 = off.length / Math.min(120, flights.length);
  out.off15Median = off.length ? off[off.length >> 1] : null;
  out.within50cm = off.filter(x => x < 0.5).length / Math.min(120, flights.length);
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
    out.sightCam = [p.x, p.y, p.z].map(v => +v.toFixed(4));
  }
  out.visibleAimed = fpGun.visible;
  return out;
}, gt);

const R = {};
for (const gt of ['thunder', 'shotgun', 'sixshooter', 'pistol', 'bucket', 'mp5', 'boltpistol', 'sniper']) {
  await page.evaluate((gt) => { Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000; }, gt);
  await g.scenario('bunratty_sean');
  R[gt] = await probe(gt);
  const r = R[gt];
  console.log(`   ${gt.padEnd(10)} mag ${r.maxAmmo}, ${r.perShot.toFixed(2)} BB/shot, ready ${r.readyTimes.map(t => t.toFixed(2)).join('/') || '-'} s${r.autoPerSec != null ? `, ${r.autoPerSec}/s held` : ''}, ${r.speed.toFixed(1)} m/s, cone ${r.coneMedian.toFixed(2)}°/${r.cone90.toFixed(2)}° (median/90%), 15 m: ${(r.reached15 * 100).toFixed(0)}% reach, ${r.off15Median == null ? '-' : r.off15Median.toFixed(2)} m off, ${(r.within50cm * 100).toFixed(0)}% within 0.5 m; sight ${r.sightErrDeg?.toFixed(2) ?? '-'}°`);
  if (gt in NEW) await g.shot('backyard-' + gt + '-aimed');
}
const T = R.thunder, S6 = R.sixshooter, B = R.bucket, BP = R.boltpistol;
for (const gt of Object.keys(NEW)) {
  check(`${NEW[gt]}: its own first-person gun in hand`, R[gt].mesh === gt, R[gt].mesh);
  check(`${NEW[gt]}: aimed, the front sight sits on the reticle (under 0.6°)`, R[gt].sightErrDeg < 0.6 && R[gt].visibleAimed, R[gt].sightCam);
}
check('Thunder Pump: 4-5 BBs a shot, more than the spring shotgun', T.perShot >= 4 && T.perShot <= 5 && T.perShot > R.shotgun.perShot + 1, [T.perShot, R.shotgun.perShot]);
check('Thunder Pump: a wider cloud than the spring shotgun', T.cone90 > R.shotgun.cone90 * 1.4, [T.cone90, R.shotgun.cone90]);
check('Thunder Pump: the pump takes longer than the spring shotgun', Math.min(...T.readyTimes) > Math.max(...R.shotgun.readyTimes), [T.readyTimes, R.shotgun.readyTimes]);
check('Thunder Pump: fewer of its BBs within 0.5 m at 15 m than the spring shotgun', T.within50cm < R.shotgun.within50cm, [T.within50cm, R.shotgun.within50cm]);
check('Six-Shooter: six in the cylinder', S6.maxAmmo === 6, S6.maxAmmo);
check('Six-Shooter: ready again faster than any gun here, the spring pistol included', Math.max(...S6.readyTimes) < Math.min(...R.pistol.readyTimes) - 0.25, [S6.readyTimes, R.pistol.readyTimes]);
check('Bucket Gun: a 600-BB hopper, full-auto', B.maxAmmo === 600 && B.autoPerSec >= 6, [B.maxAmmo, B.autoPerSec]);
check('Bucket Gun: slow BBs, under half the MP5\'s speed', B.speed < R.mp5.speed * 0.5, [B.speed, R.mp5.speed]);
check('Bucket Gun: well off line at 15 m, more than the MP5', B.off15Median > R.mp5.off15Median * 1.5, [B.off15Median, R.mp5.off15Median]);
check('Bolt Pistol: a cone under a third of the spring pistol\'s, within twice the sniper\'s', BP.coneMedian < R.pistol.coneMedian / 3 && BP.coneMedian < R.sniper.coneMedian * 2, [BP.coneMedian, R.pistol.coneMedian, R.sniper.coneMedian]);
check('Bolt Pistol: at 15 m every BB within 0.5 m, a quarter of the spring pistol\'s miss or less', BP.within50cm === 1 && BP.off15Median < R.pistol.off15Median / 4, [BP.within50cm, BP.off15Median, R.pistol.off15Median]);
check('Thunder Pump: at 15 m under two-thirds of its BBs within 0.5 m (the spring shotgun: all)', T.within50cm < 0.67 && R.shotgun.within50cm > 0.9, [T.within50cm, R.shotgun.within50cm]);
check('Bolt Pistol: slow to re-cock, slower than the spring pistol', Math.min(...BP.readyTimes) > Math.max(...R.pistol.readyTimes), [BP.readyTimes, R.pistol.readyTimes]);

// the workbench and the loadout kid build each one without a page error
const wb = await page.evaluate(() => ['thunder', 'sixshooter', 'bucket', 'boltpistol'].map(gt => {
  const m = buildWorkbenchGun(gt); const n = []; m.traverse(o => { if (o.isMesh) n.push(o); }); m.parent && m.parent.remove(m);
  const k = buildEnemyGunMesh(gt); return { gt, meshes: n.length, kid: k.children.length, small: isSmallGun(gt), rails: getGunAccessoryCap(gt).rails };
}));
console.log('   workbench:', JSON.stringify(wb));
check('the workbench and a kid\'s hands build each new gun', wb.every(w => w.meshes >= 15 && w.kid >= 3), wb);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
