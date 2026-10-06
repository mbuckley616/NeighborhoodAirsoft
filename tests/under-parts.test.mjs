// v1.169 (backlog D.14 B, Michael: D): the under-barrel slot and its four homemade parts, each a trade.
//   Taped Twin Mag   — a second mag loaded from the bag, R flips the pair (0.6 s); 1.2 lb more to carry
//   Shoelace Sling   — a sprint lasts longer; aiming in is slower
//   PVC Foregrip     — a tighter cone while walking; 0.8 lb more to carry
//   Cardboard Barrel — a tighter cone; slower BBs
// Bought in the shop's Mods tab and mounted at the workbench with real clicks; each part's mesh is checked under the
// handguard (the barrel's in front of the muzzle) on every long gun; then each trade is measured in a match against
// the bare gun.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const PARTS = { taped_mag: 'Taped Twin Mag', sling: 'Shoelace Sling', foregrip: 'PVC Foregrip', cardboard_barrel: 'Cardboard Barrel' };

// --- the shop: Mods tab, one of each bought with a click
await page.evaluate(() => { Game.persist.cash = 1000; Game.persist.owned.ar = true; Game.persist.owned.mp5 = true; openShop(); });
const shop = await page.evaluate((PARTS) => {
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const out = {};
  for (const [id, name] of Object.entries(PARTS)) {
    const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith(name));
    if (!row) { out[id] = null; continue; }
    const tag = row.querySelector('.shop-slot-tag').textContent;
    const cash0 = Game.persist.cash;
    row.querySelector('.shop-item-buy').click();
    out[id] = { tag, paid: cash0 - Game.persist.cash, price: ATTACHMENTS[id].price, owned: Game.persist.ownedEquipment.attachments[id] };
  }
  return out;
}, PARTS);
console.log('   shop:', JSON.stringify(shop));
for (const [id, name] of Object.entries(PARTS)) {
  const r = shop[id];
  check(`${name}: in the Mods tab as UNDER, bought for its price`, r && r.tag === 'UNDER' && r.paid === r.price && r.owned === 1, r);
}
await g.shot('under-parts-shop');
await page.evaluate(() => closeShop());

// --- the workbench: the AR has an Under-barrel row, a part goes on it with two clicks, the pistol has none
const wb = await page.evaluate(() => {
  openWorkbench();
  workbenchSelectGun('pistol');
  const pistolRows = [...document.querySelectorAll('#wbSlotList .wb-slot-label')].map(e => e.textContent);
  workbenchSelectGun('ar');
  const arRows = [...document.querySelectorAll('#wbSlotList .wb-slot-label')].map(e => e.textContent);
  const underRow = [...document.querySelectorAll('#wbSlotList .wb-slot')].find(r => r.querySelector('.wb-slot-label').textContent === 'Under-barrel');
  underRow.click();
  const items = [...document.querySelectorAll('#wbLockerList .wb-locker-item')].map(e => ({ t: e.textContent, compat: e.classList.contains('compat') }));
  const fg = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].find(e => e.textContent.includes('PVC Foregrip'));
  fg.click();
  const mountedName = [...document.querySelectorAll('#wbSlotList .wb-slot')].find(r => r.querySelector('.wb-slot-label').textContent === 'Under-barrel').querySelector('.wb-slot-val').textContent;
  const fgMesh = WB.gunGroup.userData.accessories.underParts.meshes.foregrip.visible;
  // a part can't go on a rail, a laser can't go under, a pistol can't take one
  const inst = getUnmountedInstances('sling')[0];
  const onRail = mountAccessory('ar', inst.id, 'rail', 0).ok;
  const onPistol = mountAccessory('pistol', inst.id, 'under', -1).ok;
  const laser = makeAccessoryInstance('laser');
  const laserUnder = mountAccessory('ar', laser.id, 'under', -1).ok;
  closeWorkbench();
  return { pistolRows, arRows, items, mountedName, fgMesh, onRail, onPistol, laserUnder, under: getUnderPart('ar')?.id };
});
console.log('   workbench:', JSON.stringify(wb));
check('the workbench: the AR has an Under-barrel row, the pistol none', wb.arRows.includes('Under-barrel') && !wb.pistolRows.includes('Under-barrel'), [wb.arRows, wb.pistolRows]);
check('the workbench: the Under-barrel row offers the four parts and only them', wb.items.filter(i => i.compat).length === 4 && wb.items.filter(i => i.compat).every(i => /UNDER/.test(i.t)), wb.items);
check('the workbench: a click mounts the foregrip, shown on the gun', wb.mountedName === 'PVC Foregrip' && wb.under === 'foregrip' && wb.fgMesh, wb);
check('no part on a rail, no laser under, nothing under a pistol', !wb.onRail && !wb.onPistol && !wb.laserUnder, wb);

// --- the save keeps it
const saved = await page.evaluate(() => { Game._saveEnabled = true; saveGame(); Game.persist.equipped.attachments.ar.under = null; loadGame(); return getUnderPart('ar')?.id; });
check('a save and load keeps the foregrip on the AR', saved === 'foregrip', saved);

// --- each part's mesh, on each long gun: under the handguard, inside the gun's width; the cardboard ahead of the muzzle
const geo = await page.evaluate(() => {
  const out = [];
  for (const gt of ALL_GUN_TYPES) {
    const cap = getGunAccessoryCap(gt);
    const m = buildWorkbenchGun(gt);
    const up = m.userData.accessories.underParts;
    if (!cap.under) { out.push({ gt, none: !up }); continue; }
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const r = { gt, bottom: +up.bottom.toFixed(3), frontZ: +up.frontZ.toFixed(3) };
    for (const k in up.meshes) {
      up.meshes[k].visible = true;
      const b = new THREE.Box3().setFromObject(up.meshes[k]).applyMatrix4(inv);
      r[k] = { minY: +b.min.y.toFixed(3), maxY: +b.max.y.toFixed(3), minZ: +b.min.z.toFixed(3), maxZ: +b.max.z.toFixed(3), w: +(b.max.x - b.min.x).toFixed(3) };
    }
    out.push(r);
  }
  return out;
});
for (const r of geo) console.log('  ', JSON.stringify(r));
const longs = geo.filter(r => !('none' in r));
check('every long gun (8) has the slot, every pistol (4) none', longs.length === 8 && geo.filter(r => r.none).length === 4, geo.map(r => r.gt));
check('the mag, sling and foregrip hang below the handguard (top within 1 cm of it, bottom 5-12 cm under)',
  longs.every(r => ['taped_mag', 'sling', 'foregrip'].every(k => r[k].maxY <= r.bottom + 0.01 && r[k].minY < r.bottom - 0.05 && r[k].minY > r.bottom - 0.12)), longs);
check('the cardboard barrel runs ahead of the muzzle (10 cm or more past it)', longs.every(r => r.cardboard_barrel.minZ < r.frontZ - 0.1 && r.cardboard_barrel.maxZ > r.frontZ - 0.01), longs);

// --- in a match: each trade against the bare gun
const setUnder = (gt, type) => page.evaluate(([gt, type]) => {
  Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'under', -1); }
  else clearGunSlot(gt, 'under', -1);
  Game.persist.loadoutSlots = [{ kind: 'gun' }, null, null, null];
  Game.persist.equipped.armor = {};
}, [gt, type]);

const measure = () => page.evaluate(() => {
  const out = { mesh: fpGun && fpGun.userData.accessories && fpGun.userData.accessories.underParts &&
    Object.keys(fpGun.userData.accessories.underParts.meshes).filter(k => fpGun.userData.accessories.underParts.meshes[k].visible) };
  Game.player.maxHits = 999;
  Game.mouse.locked = true;   // updatePlayer moves no one without it; headless Chromium may refuse the real pointer lock
  const step = () => stepGame(1 / 60);
  const keys = (o) => { for (const k of ['KeyW', 'ShiftLeft']) Game.keys[k] = !!o[k]; };
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  out.ammo0 = Game.gun.ammo; out.taped0 = Game.gun.tapedAmmo; out.max = Game.gun.maxAmmo;
  out.weightMult = Game.scenario.weightSpeedMult;
  // the cone, standing still and with a walking sway, hip-fire
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const cone = (sway) => {
    const a = []; let sp = 0;
    for (let i = 0; i < 300; i++) {
      clear(); Game.gun.ammo = Game.gun.maxAmmo; Game.player.ads = 0; Game.player.sway = sway; fireBB();
      for (const b of mine()) { a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(fwd))) * 180 / Math.PI); sp += b.vel.length(); }
    }
    clear(); a.sort((x, y) => x - y);
    return { med: a[a.length >> 1], speed: sp / a.length };
  };
  const still = cone(0), walk = cone(0.8);
  out.coneStill = still.med; out.coneWalk = walk.med; out.speed = still.speed;
  // aiming in: steps from hip to 90% aimed
  Game.player.ads = 0; Game.player.adsTarget = 1;
  let f = 0; while (Game.player.ads < 0.9 && f < 300) { Game.player.adsTarget = 1; step(); f++; }
  out.adsIn = f / 60;
  Game.player.adsTarget = 0; for (let i = 0; i < 60; i++) { Game.player.adsTarget = 0; step(); }
  // walking: metres in 2 s; sprinting: seconds until the stamina runs out
  Game.player.pitch = 0;
  const p0 = Game.player.pos.clone(); keys({ KeyW: true });
  for (let i = 0; i < 120; i++) step();
  out.walk2s = Math.hypot(Game.player.pos.x - p0.x, Game.player.pos.z - p0.z);
  keys({});
  Game.player.stamina = Game.player.staminaMax; Game.player.exhausted = false;
  // sprint on the spot: the drain only needs W and Shift held, so park the player against nothing by zeroing his bounds' effect
  f = 0; keys({ KeyW: true, ShiftLeft: true });
  while (!Game.player.exhausted && f < 3600) { Game.player.pos.copy(p0); step(); f++; }
  keys({});
  out.sprintSecs = f / 60;
  return out;
});

const R = {};
for (const type of [null, 'taped_mag', 'sling', 'foregrip', 'cardboard_barrel']) {
  await setUnder('ar', type);
  await g.scenario('bunratty_sean');
  R[type || 'bare'] = await measure();
  const r = R[type || 'bare'];
  console.log(`   AR + ${(type || 'nothing').padEnd(16)} mesh ${JSON.stringify(r.mesh)} mag ${r.ammo0}+${r.taped0 ?? 0}, weight x${r.weightMult.toFixed(3)}, cone ${r.coneStill.toFixed(3)}° still / ${r.coneWalk.toFixed(3)}° walking, ${r.speed.toFixed(1)} m/s, aim in ${r.adsIn.toFixed(2)} s, walk ${r.walk2s.toFixed(2)} m in 2 s, sprint ${r.sprintSecs.toFixed(2)} s`);
  if (type) await g.shot('under-parts-' + type);
}
const B = R.bare, T = R.taped_mag, S = R.sling, F = R.foregrip, C = R.cardboard_barrel;
check('in a match the mounted part shows on the gun in hand, and nothing on the bare gun',
  B.mesh.length === 0 && ['taped_mag', 'sling', 'foregrip', 'cardboard_barrel'].every(k => R[k].mesh.length === 1 && R[k].mesh[0] === k), Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.mesh])));
check('Taped Twin Mag: a second full mag from the bag', T.ammo0 === T.max && T.taped0 === T.max && !B.taped0, [T.ammo0, T.taped0]);
check('Taped Twin Mag: 1.2 lb slows the walk (and nothing else)', T.weightMult < B.weightMult - 0.01 && T.walk2s < B.walk2s * 0.99, [T.weightMult, B.weightMult, T.walk2s, B.walk2s]);
check('Shoelace Sling: a sprint lasts 20% longer or more', S.sprintSecs > B.sprintSecs * 1.2, [S.sprintSecs, B.sprintSecs]);
check('Shoelace Sling: aiming in takes 30% longer or more', S.adsIn > B.adsIn * 1.3, [S.adsIn, B.adsIn]);
check('PVC Foregrip: the walking cone is a fifth tighter or more', F.coneWalk < B.coneWalk * 0.8, [F.coneWalk, B.coneWalk]);
check('PVC Foregrip: standing still, no change; 0.8 lb slows the walk', Math.abs(F.coneStill / B.coneStill - 1) < 0.12 && F.walk2s < B.walk2s * 0.995, [F.coneStill, B.coneStill, F.walk2s, B.walk2s]);
check('Cardboard Barrel: the standing cone (in degrees) is a sixth tighter or more', C.coneStill < B.coneStill * 0.85, [C.coneStill, B.coneStill]);
check('Cardboard Barrel: the BBs leave 15% slower', Math.abs(C.speed / B.speed - 0.85) < 0.02, [C.speed, B.speed]);
check('Sling, foregrip and cardboard: no weight on the sling or cardboard', S.weightMult === B.weightMult && C.weightMult === B.weightMult, [S.weightMult, C.weightMult, B.weightMult]);

// --- the taped mag's flip, the real way: R pressed, 0.6 s, the mags trade places; held R doesn't flip twice; the round's end puts it all back
await setUnder('ar', 'taped_mag');
await page.evaluate(() => { Game.persist.bag = getMaxAmmoForGun('ar') + 20; });   // a full AR mag, then 20 left for the taped mag
await g.scenario('bunratty_sean');
const flip = await page.evaluate(() => {
  const step = () => stepGame(1 / 60);
  Game.player.maxHits = 999;
  const out = { start: [Game.gun.ammo, Game.gun.tapedAmmo], bag0: Game.persist.bag, max: Game.gun.maxAmmo };
  Game.gun.ammo = 7;                       // shoot down to 7, then flip: the 7 ride along in the taped mag
  Game.keys.KeyR = true;
  let f = 0; step(); f++;
  out.flipping = document.getElementById('ammoStatus').textContent;
  Game.mouseLMB = true; onLmbDown(); out.shotDuringFlip = Game.scenario.bbs.filter(b => b.owner === 'player').length; Game.mouseLMB = false; onLmbUp();
  while (Game.gun.flipT > 0 && f < 120) { step(); f++; }
  out.flipSecs = f / 60;
  out.after = [Game.gun.ammo, Game.gun.tapedAmmo];
  for (let i = 0; i < 90; i++) step();    // R still held: no second flip
  out.heldR = [Game.gun.ammo, Game.gun.tapedAmmo];
  Game.keys.KeyR = false; step();
  Game.gun.ammo = 0; Game.gun.cocked = false; updateAmmoHud();   // shoot it dry
  out.hudEmpty = document.getElementById('ammoStatus').textContent;
  Game.keys.KeyR = true; for (let i = 0; i < 50; i++) step(); Game.keys.KeyR = false; step();
  out.back = [Game.gun.ammo, Game.gun.tapedAmmo];
  Game.keys.KeyR = true; for (let i = 0; i < 50; i++) step(); Game.keys.KeyR = false; step();
  out.ontoEmpty = [Game.gun.ammo, Game.gun.tapedAmmo];
  out.hud = document.getElementById('ammoMax').textContent;
  endScenario('lose');
  out.bagAfter = Game.persist.bag;
  return out;
});
console.log('   flip:', JSON.stringify(flip));
check('Taped Twin Mag: the AR loads a full mag, the taped mag the bag\'s last 20', flip.start[0] === flip.max && flip.start[1] === 20 && flip.bag0 === 0, flip);
check('Taped Twin Mag: FLIPPING while it turns; an empty mag says R TO FLIP', /R TO FLIP \(7\)/.test(flip.hudEmpty) && /FLIPPING/.test(flip.flipping), [flip.hudEmpty, flip.flipping]);
check('Taped Twin Mag: R flips in 0.6 s (no shot meanwhile) and the mags trade places, the 7 left riding along', Math.abs(flip.flipSecs - 0.6) < 0.05 && flip.after[0] === 20 && flip.after[1] === 7 && flip.shotDuringFlip === 0, flip);
check('Taped Twin Mag: holding R does not flip again; a new press flips back to the 7; an empty taped mag is not flipped to', flip.heldR[0] === 20 && flip.back[0] === 7 && flip.back[1] === 0 && flip.ontoEmpty[0] === 7, flip);
check('Taped Twin Mag: the HUD counts the taped mag; the round\'s end puts both mags back in the bag', flip.bagAfter === 7 && / · taped 0$/.test(flip.hud), [flip.bagAfter, flip.hud]);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
