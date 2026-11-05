// v1.418 (backlog D.83, Michael: A, more homemade parts, 2 Nov 2026): the second wave of homemade workbench parts, in
// D.14's tone, each fitting the newer guns too.
//   Taped-On Toy Scope (v1.418) — a sight: zooms under half the 4× Scope through a small lens with a marker cross;
//                                 nothing for hip shots; $14.
//   Bungee Sling (v1.419)       — under-barrel: aiming in a third quicker; a wider cone on the move; $10.
//   MUZZLE slot (v1.420, Michael: A, two new slots) on every long gun; the Cardboard Barrel moves there, and an old save's
//   moves with it. Soda-Bottle Silencer (v1.420) — muzzle: your shots 0.4 as loud to you, BBs 6 % slower; $9.
//   STOCK slot (v1.425) on the same 29 long guns. Sock-Padded Stock (v1.425) — aimed, the cone a fifth tighter and a walk
//   1.2 times as quick (Michael: A, and faster movement aimed); 0.4 lb; $8.
//   Taped-Up Long Mag (v1.426) — under-barrel: the gun loads 1.5 times its mag; a spare-mag swap and a speed loader's
//                                 feed take 1.5 times as long; 1 lb; $18.
// Checked: the shop's Mods tab, the workbench on old and new guns, the mesh on the rail, and a match aimed through it.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
await page.evaluate(() => { Game.persist.cash = 1000; Game.persist.owned.ar = true; Game.persist.owned.uzi = true; Game.persist.owned.pumpsniper = true; openShop(); });
const shop = await page.evaluate(() => {
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Taped-On Toy Scope'));
  if (!row) return null;
  const tag = row.querySelector('.shop-slot-tag').textContent;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  return { tag, pic: !!row.querySelector('img'), paid: cash0 - Game.persist.cash, owned: Game.persist.ownedEquipment.attachments.toy_scope };
});
console.log('   shop:', JSON.stringify(shop));
check('Taped-On Toy Scope: in the Mods tab as SIGHT with its picture, bought for $14', shop && shop.tag === 'SIGHT' && shop.pic && shop.paid === 14 && shop.owned === 1, shop);
await page.evaluate(() => closeShop());

// --- the workbench: it goes on the AR's sight slot with two clicks; on the Uzi and the Pump Sniper too
const wb = await page.evaluate(() => {
  openWorkbench();
  workbenchSelectGun('ar');
  const sightRow = () => [...document.querySelectorAll('#wbSlotList .wb-slot')].find(r => /sight/i.test(r.querySelector('.wb-slot-label').textContent));
  sightRow().click();
  const it = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].find(e => e.textContent.includes('Taped-On Toy Scope'));
  if (it) it.click();
  const mountedName = sightRow().querySelector('.wb-slot-val').textContent;
  const acc = WB.gunGroup.userData.accessories;
  const shown = { toy: acc.toyScopeOptic.visible, scope: acc.scopeOptic.visible, dot: acc.redDotOptic.visible };
  closeWorkbench();
  const out = { mountedName, shown, ar: gunScopeView('ar') };
  // the newer guns: one copy each
  for (const gt of ['uzi', 'pumpsniper']) {
    ensureGunSlots(gt);
    const i = makeAccessoryInstance('toy_scope');
    out[gt] = mountAccessory(gt, i.id, 'sight', -1).ok && gunScopeView(gt);
  }
  const i = makeAccessoryInstance('toy_scope');
  out.onRail = mountAccessory('ar', i.id, 'rail', 0).ok;
  return out;
});
console.log('   workbench:', JSON.stringify(wb));
check('the workbench: a click puts it on the AR\'s sight slot, shown on the gun (and no other optic)', /Toy Scope/.test(wb.mountedName) && wb.shown.toy && !wb.shown.scope && !wb.shown.dot && wb.ar === 'toy', wb);
check('it goes on the newer guns\' sight slots too (the Uzi, the Pump Sniper), and not on a rail', wb.uzi === 'toy' && wb.pumpsniper === 'toy' && !wb.onRail, wb);

// --- the mesh on every gun: it sits on the top rail (its foot within 1.5 cm of the rail top), centred, under 15 cm long
const geo = await page.evaluate(() => {
  const out = [];
  for (const gt of ALL_GUN_TYPES) {
    const m = buildWorkbenchGun(gt);
    const acc = m.userData.accessories;
    acc.toyScopeOptic.visible = true;
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const b = new THREE.Box3().setFromObject(acc.toyScopeOptic).applyMatrix4(inv);
    const railTop = new THREE.Vector3().setFromMatrixPosition(acc.sightAnchor.matrixWorld).applyMatrix4(inv).y;
    out.push({ gt, foot: +(b.min.y - railTop).toFixed(3), cx: +((b.min.x + b.max.x) / 2).toFixed(3), len: +((b.max.z - b.min.z) / (acc.sightAnchor.scale.z || 1)).toFixed(3) });
  }
  return out;
});
const bad = geo.filter(r => Math.abs(r.foot) > 0.015 || Math.abs(r.cx) > 0.01 || r.len > 0.15);
check(`on all ${geo.length} guns it sits on the top rail, centred`, geo.length === 48 && bad.length === 0, bad.length ? bad : geo.slice(0, 4));

// --- in a match: aimed through it on the AR, against the 4× Scope and no sight
const aim = (type) => page.evaluate(async (type) => {
  const gt = 'ar';
  Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  clearGunSlot(gt, 'sight', -1);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'sight', -1); }
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  return true;
}, type);
const measure = () => page.evaluate(() => {
  Game.player.maxHits = 999;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  Game.player.adsTarget = 0; for (let i = 0; i < 60; i++) step();
  const hipFov = Game.camera.fov, hip = +getEquippedAttachmentSpreadMult().toFixed(3);
  Game.player.adsTarget = 1; Game.mouseRMB = true;
  for (let i = 0; i < 90; i++) { Game.player.adsTarget = 1; step(); }
  const ov = document.getElementById('scopeOverlay');
  const out = { hipFov: +hipFov.toFixed(1), adsFov: +Game.camera.fov.toFixed(1), ads: +Game.player.ads.toFixed(2), hip,
    overlay: +ov.style.opacity, toy: ov.classList.contains('toy'), gunShown: fpGun.visible,
    dotShown: getComputedStyle(ov.querySelector('.scope-dot')).display !== 'none',
    lens: ov.querySelector('.scope-ring').getBoundingClientRect().width / Math.min(innerWidth, innerHeight) };
  Game.player.adsTarget = 0; Game.mouseRMB = false;
  return out;
});
const R = {};
for (const type of [null, 'scope', 'toy_scope']) {
  await aim(type);
  await g.scenario('bunratty_sean');
  R[type || 'none'] = await measure();
}
// the picture through it, for looking at
await page.evaluate(() => { Game.player.adsTarget = 1; Game.mouseRMB = true; for (let i = 0; i < 60; i++) stepGame(1 / 60); });
await g.shot('homemade-parts-toy-scope');
console.log('   aimed:', JSON.stringify(R));
const { none, toy_scope: toy, scope } = R;
check('aimed through the toy scope: it zooms past the irons, but well short of the 4× Scope (under half its extra zoom)',
  toy.adsFov < none.adsFov - 3 && toy.adsFov > scope.adsFov + 5 && (none.adsFov - toy.adsFov) < 0.5 * (none.adsFov - scope.adsFov), R);
check('aimed through it: the scope picture is up, the toy one (small lens, no red dot), and the gun model hides as with the 4× Scope',
  toy.overlay > 0.95 && toy.toy && !toy.dotShown && !toy.gunShown && !scope.toy && scope.dotShown && toy.lens < scope.lens * 0.8, R);
check('from the hip it does nothing for your shots (the 4× Scope tightens them)', toy.hip === none.hip && scope.hip < none.hip, R);

// --- v1.419: the Bungee Sling. Bought, on the under-barrel slot of the AR and the Pump Sniper, its cord under the handguard
const bs = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Bungee Sling'));
  const tag = row && row.querySelector('.shop-slot-tag').textContent;
  const cash0 = Game.persist.cash; row && row.querySelector('.shop-item-buy').click();
  const out = { tag, paid: cash0 - Game.persist.cash };
  // v1.426: the Taped-Up Long Mag's row, bought in the same visit (a third page building guns ran CI's runner out of memory)
  const lrow = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Taped-Up Long Mag'));
  const lcash = Game.persist.cash; lrow && lrow.querySelector('.shop-item-buy').click();
  out.long = { tag: lrow && lrow.querySelector('.shop-slot-tag').textContent, pic: !!(lrow && lrow.querySelector('img, canvas')), paid: lcash - Game.persist.cash };
  closeShop();
  const geo = {}, lgeo = {};
  for (const gt of ['ar', 'pumpsniper', 'm60', 'uzi']) {
    const m = buildWorkbenchGun(gt);
    const up = m.userData.accessories.underParts;
    if (!up) { geo[gt] = lgeo[gt] = 'no slot'; continue; }
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    up.meshes.bungee_sling.visible = true;
    const b = new THREE.Box3().setFromObject(up.meshes.bungee_sling).applyMatrix4(inv);
    geo[gt] = { top: +(b.max.y - up.bottom).toFixed(3), sag: +(up.bottom - b.min.y).toFixed(3), len: +(b.max.z - b.min.z).toFixed(3) };
    up.meshes.bungee_sling.visible = false; up.meshes.long_mag.visible = true;   // v1.426: the long mag on the same build
    const lb = new THREE.Box3().setFromObject(up.meshes.long_mag).applyMatrix4(inv);
    lgeo[gt] = { top: +(lb.max.y - up.bottom).toFixed(3), drop: +(up.bottom - lb.min.y).toFixed(3), cx: +((lb.max.x + lb.min.x) / 2).toFixed(4) };
  }
  out.geo = geo; out.long.geo = lgeo;
  return out;
});
console.log('   bungee:', JSON.stringify(bs));
check('Bungee Sling: in the Mods tab as UNDER, bought for $10', bs.tag === 'UNDER' && bs.paid === 10, bs);
check('Bungee Sling: under the handguard on the AR, the Pump Sniper and the M60 (top within 1 cm, a 3-6 cm sag, 15-18 cm long); the Uzi has no slot',
  ['ar', 'pumpsniper', 'm60'].every(gt => bs.geo[gt].top <= 0.01 && bs.geo[gt].sag > 0.03 && bs.geo[gt].sag < 0.06 && bs.geo[gt].len > 0.15 && bs.geo[gt].len < 0.18) && bs.geo.uzi === 'no slot', bs.geo);
const lm = bs.long;   // v1.426: checked below with the long mag's matches
const underMeasure = (type) => page.evaluate(async (type) => {
  const gt = 'ar';
  Game.persist.equipped.gun = gt; ensureGunSlots(gt);
  clearGunSlot(gt, 'sight', -1); clearGunSlot(gt, 'under', -1);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'under', -1); }
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  return true;
}, type);
const B2 = {};
for (const type of [null, 'bungee_sling']) {
  await underMeasure(type);
  await g.scenario('bunratty_sean');
  B2[type || 'bare'] = await page.evaluate(() => {
    Game.player.maxHits = 999;
    for (const e of Game.scenario.enemies) e.noFire = true;
    const step = () => stepGame(1 / 60);
    const mesh = Object.keys(fpGun.userData.accessories.underParts.meshes).filter(k => fpGun.userData.accessories.underParts.meshes[k].visible);
    Game.player.ads = 0; Game.player.adsTarget = 1;
    let f = 0; while (Game.player.ads < 0.9 && f < 300) { Game.player.adsTarget = 1; step(); f++; }
    const adsIn = f / 60;
    Game.player.adsTarget = 0; for (let i = 0; i < 60; i++) { Game.player.adsTarget = 0; step(); }
    // the cone at the hip with a walking sway, 300 shots on a seeded random (as under-parts)
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
    const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
    const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
    const cone = (sway) => {
      const a = []; const rnd = Math.random; let seed = 0x5eed1 + Math.round(sway * 10);
      Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      try {
        for (let i = 0; i < 300; i++) {
          clear(); Game.gun.ammo = Game.gun.maxAmmo; Game.player.ads = 0; Game.player.sway = sway; fireBB();
          for (const b of mine()) a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(fwd))) * 180 / Math.PI);
        }
      } finally { Math.random = rnd; }
      clear(); a.sort((x, y) => x - y); return a[a.length >> 1];
    };
    return { mesh, adsIn, still: cone(0), walk: cone(0.8) };
  });
}
console.log('   bungee in a match:', JSON.stringify(B2));
const { bare: BB, bungee_sling: BS } = B2;
check('Bungee Sling: on the gun in hand; aiming in takes a fifth less time or better', BS.mesh.length === 1 && BS.mesh[0] === 'bungee_sling' && BB.mesh.length === 0 && BS.adsIn <= BB.adsIn * 0.8, B2);
check('Bungee Sling: the walking cone is a fifth wider or more; standing still, no change', BS.walk > BB.walk * 1.2 && Math.abs(BS.still / BB.still - 1) < 0.12, B2);

// --- v1.420: the MUZZLE slot and the Soda-Bottle Silencer
const mz = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.p90 = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const rowOf = (name) => [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith(name));
  const out = {};
  for (const [id, name] of [['soda_silencer', 'Soda-Bottle Silencer'], ['cardboard_barrel', 'Cardboard Barrel']]) {
    const row = rowOf(name);
    const cash0 = Game.persist.cash; row && row.querySelector('.shop-item-buy').click();
    out[id] = { tag: row && row.querySelector('.shop-slot-tag').textContent, pic: !!(row && row.querySelector('img')), paid: cash0 - Game.persist.cash };
  }
  closeShop();
  // the workbench: a Muzzle row on the AR and the P90, none on the pistol or the Uzi; it offers the two muzzle parts only
  openWorkbench();
  const rows = (gt) => { workbenchSelectGun(gt); return [...document.querySelectorAll('#wbSlotList .wb-slot-label')].map(e => e.textContent); };
  out.rows = { pistol: rows('pistol'), uzi: rows('uzi'), p90: rows('p90'), ar: rows('ar') };
  const muzzleRow = () => [...document.querySelectorAll('#wbSlotList .wb-slot')].find(r => r.querySelector('.wb-slot-label').textContent === 'Muzzle');
  muzzleRow().click();
  out.offered = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].map(e => e.textContent);
  const it = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].find(e => e.textContent.includes('Soda-Bottle Silencer'));
  if (it) it.click();
  out.mounted = muzzleRow().querySelector('.wb-slot-val').textContent;
  updateWorkbench(0);   // the floating labels are placed each frame
  out.label = [...document.querySelectorAll('#wbVpLabels .wb-vp-label')].map(e => e.textContent);
  out.meshShown = WB.gunGroup.userData.accessories.muzzleParts.meshes.soda_silencer.visible;
  closeWorkbench();
  const sil = getUnmountedInstances('cardboard_barrel')[0];
  out.cardboardUnder = mountAccessory('ar', sil.id, 'under', -1).ok;
  out.onPistol = mountAccessory('pistol', sil.id, 'muzzle', -1).ok;
  const fg = makeAccessoryInstance('foregrip');
  out.fgMuzzle = mountAccessory('ar', fg.id, 'muzzle', -1).ok;
  out.fgUnder = mountAccessory('ar', fg.id, 'under', -1).ok;   // an under part and a muzzle part at once
  out.both = getMountedAccessories('ar').filter(a => a.slot === 'under' || a.slot === 'muzzle').map(a => a.type);
  // on every long gun: the bottle starts at the muzzle and runs on ahead of it, on the bore line
  // v1.425: and the sock-padded stock, measured on the same builds (a third pass of 40 guns ran the page out of memory):
  // pulled over the butt, it wraps the last 5 cm of the centre line on every side and covers its end
  out.geo = []; out.stockGeo = [];
  for (const gt of ALL_GUN_TYPES) {
    const cap = getGunAccessoryCap(gt);
    const m = buildWorkbenchGun(gt);
    const mp = m.userData.accessories.muzzleParts;
    const sp = m.userData.accessories.stockParts;
    if (!cap.stock) out.stockGeo.push({ gt, none: !sp });
    else {
      m.updateWorldMatrix(true, true);
      const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
      sp.meshes.sock_stock.visible = true;
      const b = new THREE.Box3().setFromObject(sp.meshes.sock_stock).applyMatrix4(inv), u = sp.box;
      const r3 = x => +x.toFixed(3);
      out.stockGeo.push({ gt, side: r3(Math.min(u.min.x - b.min.x, b.max.x - u.max.x)), top: r3(b.max.y - u.max.y), bot: r3(u.min.y - b.min.y),
        end: r3(b.max.z - sp.rearZ), len: r3(b.max.z - b.min.z), w: r3(b.max.x - b.min.x), h: r3(b.max.y - b.min.y) });
    }
    if (!cap.muzzle) { out.geo.push({ gt, none: !mp }); continue; }
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    mp.meshes.soda_silencer.visible = true;
    const b = new THREE.Box3().setFromObject(mp.meshes.soda_silencer).applyMatrix4(inv);
    out.geo.push({ gt, back: +(b.max.z - mp.frontZ).toFixed(3), ahead: +(mp.frontZ - b.min.z).toFixed(3), x: +((b.max.x + b.min.x) / 2).toFixed(4), dy: +((b.max.y + b.min.y) / 2 - mp.frontY).toFixed(4) });
  }
  return out;
});
for (const r of mz.geo) console.log('  ', JSON.stringify(r));
delete mz.geoLog; console.log('   muzzle:', JSON.stringify(Object.assign({}, mz, { geo: undefined, stockGeo: undefined })));
check('Soda-Bottle Silencer: in the Mods tab as MUZZLE with its picture, $9; the Cardboard Barrel is a MUZZLE part now',
  mz.soda_silencer.tag === 'MUZZLE' && mz.soda_silencer.pic && mz.soda_silencer.paid === 9 && mz.cardboard_barrel.tag === 'MUZZLE', mz);
check('the workbench: a Muzzle row on the AR and the P90, none on the pistol or the Uzi; it offers the two muzzle parts only',
  mz.rows.ar.includes('Muzzle') && mz.rows.p90.includes('Muzzle') && !mz.rows.pistol.includes('Muzzle') && !mz.rows.uzi.includes('Muzzle') &&
  mz.offered.length === 2 && mz.offered.every(t => /MUZZLE/.test(t)), mz);
check('the workbench: a click puts the silencer on the AR\'s muzzle, shown on the gun, with its label', mz.mounted === 'Soda-Bottle Silencer' && mz.meshShown && mz.label.includes('Muzzle: Soda-Bottle Silencer'), mz);
check('no muzzle part under the barrel or on a pistol, no under part on the muzzle; a foregrip and the silencer on the AR at once',
  !mz.cardboardUnder && !mz.onPistol && !mz.fgMuzzle && mz.fgUnder && mz.both.includes('foregrip') && mz.both.includes('soda_silencer'), mz);
const mzLong = mz.geo.filter(r => !r.none);
check('every long gun has the muzzle slot (the 26 with an under-barrel slot (v1.446: the Gas Carbine), the Double-Barrel since v1.432, the P90, the Vector, the AUG, the Thompson, the Tick-Tock, the Clear Bullpup (v1.437) and the Drum Shotgun (v1.439) and the Break-Barrel (v1.447): 34), the 14 others none (the Derringer since v1.433, the Snub-Nose since v1.440)',
  mzLong.length === 34 && mz.geo.filter(r => r.none).length === 14, mz.geo.map(r => r.gt + (r.none ? '-' : '+')));
check('on every one the bottle\'s neck is taped over the muzzle (back 1-3 cm over it) and it runs 15-20 cm ahead, on the bore line',
  mzLong.every(r => r.back >= 0.01 && r.back <= 0.03 && r.ahead >= 0.15 && r.ahead <= 0.2 && Math.abs(r.x) < 0.002 && Math.abs(r.dy) < 0.002), mzLong);

// an old save with the cardboard on the under-barrel slot: it loads onto the muzzle
const mig = await page.evaluate(() => {
  const gt = 'mp5';
  Game.persist.owned.mp5 = true; ensureGunSlots(gt);
  clearGunSlot(gt, 'under', -1); clearGunSlot(gt, 'muzzle', -1);
  const cb = makeAccessoryInstance('cardboard_barrel');
  Game.persist.equipped.attachments[gt].under = cb.id; cb.placement = 'under';   // as a v1.419 save had it
  delete Game.persist.equipped.attachments[gt].muzzle;
  Game._saveEnabled = true; saveGame(); loadGame();
  const s = Game.persist.equipped.attachments[gt];
  return { under: s.under, muzzle: s.muzzle === cb.id, placement: getAccessoryInstance(cb.id).placement, mounted: getMountedAccessories(gt).map(a => a.slot + ':' + a.type) };
});
console.log('   old save:', JSON.stringify(mig));
check('an old save\'s cardboard barrel on the under-barrel slot loads onto the muzzle', mig.under === null && mig.muzzle && mig.placement === 'muzzle' && mig.mounted.includes('muzzle:cardboard_barrel'), mig);

// in a match on the AR: on the gun in hand, the BB 6 % slower, your shot 0.4 as loud
const S2 = {};
for (const type of [null, 'soda_silencer']) {
  await page.evaluate((type) => {
    const gt = 'ar'; Game.persist.equipped.gun = gt; ensureGunSlots(gt);
    clearGunSlot(gt, 'sight', -1); clearGunSlot(gt, 'under', -1); clearGunSlot(gt, 'muzzle', -1);
    if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'muzzle', -1); }
    Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  }, type);
  await g.scenario('bunratty_sean');
  S2[type || 'bare'] = await page.evaluate(() => {
    Game.player.maxHits = 999;
    for (const e of Game.scenario.enemies) e.noFire = true;
    const mp = fpGun.userData.accessories.muzzleParts;
    const mesh = Object.keys(mp.meshes).filter(k => mp.meshes[k].visible);
    Game.gun.ammo = Game.gun.maxAmmo; Game.gun.cocked = true; Game.gun.fireCooldown = 0;
    playShot.lastOwnVol = null;
    doFire();
    const bb = Game.scenario.bbs.filter(b => b.owner === 'player')[0];
    return { mesh, speed: bb ? bb.vel.length() : null, vol: playShot.lastOwnVol, mv: Game.gun.muzzleVelocity };
  });
}
await g.shot('homemade-parts-silencer');
console.log('   silencer in a match:', JSON.stringify(S2));
const { bare: SB, soda_silencer: SS } = S2;
check('Soda-Bottle Silencer: on the gun in hand; the BB leaves 6 % slower', SS.mesh.length === 1 && SS.mesh[0] === 'soda_silencer' && SB.mesh.length === 0 && Math.abs(SS.mv / SB.mv - 0.94) < 0.005, S2);
check('Soda-Bottle Silencer: your shot plays at 0.4 the bare gun\'s loudness', SB.vol === 1 && Math.abs(SS.vol - 0.4) < 1e-9, S2);

// --- v1.425: the STOCK slot and the Sock-Padded Stock (Michael: A, steadier when aimed, and quicker on the move aimed)
const st = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Sock-Padded Stock'));
  const cash0 = Game.persist.cash; row && row.querySelector('.shop-item-buy').click();
  const out = { tag: row && row.querySelector('.shop-slot-tag').textContent, pic: !!(row && row.querySelector('img')), paid: cash0 - Game.persist.cash };
  closeShop();
  openWorkbench();
  const rows = (gt) => { workbenchSelectGun(gt); return [...document.querySelectorAll('#wbSlotList .wb-slot-label')].map(e => e.textContent); };
  out.rows = { pistol: rows('pistol'), uzi: rows('uzi'), p90: rows('p90'), ar: rows('ar') };
  const stockRow = () => [...document.querySelectorAll('#wbSlotList .wb-slot')].find(r => r.querySelector('.wb-slot-label').textContent === 'Stock');
  stockRow().click();
  out.offered = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].map(e => e.textContent);
  const it = [...document.querySelectorAll('#wbLockerList .wb-locker-item.compat')].find(e => e.textContent.includes('Sock-Padded Stock'));
  if (it) it.click();
  out.mounted = stockRow().querySelector('.wb-slot-val').textContent;
  updateWorkbench(0);
  out.label = [...document.querySelectorAll('#wbVpLabels .wb-vp-label')].map(e => e.textContent);
  out.meshShown = WB.gunGroup.userData.accessories.stockParts.meshes.sock_stock.visible;
  closeWorkbench();
  const id = Game.persist.equipped.attachments.ar.stock;
  out.onMuzzle = mountAccessory('ar', id, 'muzzle', -1).ok;
  out.onPistol = mountAccessory('pistol', id, 'stock', -1).ok;
  return out;
});
for (const r of mz.stockGeo) console.log('  ', JSON.stringify(r));
console.log('   stock:', JSON.stringify(Object.assign({}, st, { geo: undefined })));
check('Sock-Padded Stock: in the Mods tab as STOCK with its picture, bought for $8', st.tag === 'STOCK' && st.pic && st.paid === 8, st);
check('the workbench: a Stock row on the AR and the P90, none on the pistol or the Uzi; it offers the sock; a click puts it on, shown, labelled',
  st.rows.ar.includes('Stock') && st.rows.p90.includes('Stock') && !st.rows.pistol.includes('Stock') && !st.rows.uzi.includes('Stock') &&
  st.offered.length === 1 && /STOCK/.test(st.offered[0]) && st.mounted === 'Sock-Padded Stock' && st.meshShown && st.label.includes('Stock: Sock-Padded Stock'), st);
check('the sock goes on no muzzle and no pistol', !st.onMuzzle && !st.onPistol, st);
const stLong = mz.stockGeo.filter(r => !r.none);
check('every long gun has the stock slot (34, v1.446: the Gas Carbine, v1.447: the Break-Barrel, v1.432: the Double-Barrel, v1.437: the Clear Bullpup, v1.439: the Drum Shotgun), the 14 others none (v1.433: the Derringer, v1.438: the Auto Pistol, v1.440: the Snub-Nose)', stLong.length === 34 && mz.stockGeo.filter(r => r.none).length === 14, mz.stockGeo.map(r => r.gt + (r.none ? '-' : '+')));
check('on every one the sock wraps the butt (4-8 mm proud on every side with its tape, its toe 0.4-2.5 cm past the end), 6-8 cm long, at most 8 cm wide and 17 cm tall',
  stLong.every(r => [r.side, r.top, r.bot].every(d => d >= 0.004 && d <= 0.008) && r.end >= 0.004 && r.end <= 0.025 && r.len >= 0.06 && r.len <= 0.08 && r.w <= 0.08 && r.h <= 0.17), stLong);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();

// v1.425: the stock's match runs in a fresh browser. A fourth match in the page that built every gun three times over
// closed it (twice here, once on CI, at the match's entry or the shot after; three matches in it never did).
const g2 = await boot(); const page2 = g2.page;
await g2.bedroom();
// in a match on the AR, the sock taken off and put back between measures (the gun's numbers are read at each shot and
// step), each cone on the same seeded draws: on the gun in hand; aimed, the cone a fifth tighter; aimed, a walk 1.2
// times as quick; 0.4 lb in the loadout weight
await page2.evaluate(() => {
  Game.persist.owned.ar = true;
  const gt = 'ar'; Game.persist.equipped.gun = gt; ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  const i = getUnmountedInstances('sock_stock')[0] || makeAccessoryInstance('sock_stock');
  mountAccessory(gt, i.id, 'stock', -1);
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
});
await g2.scenario('bunratty_sean');
const S3 = await page2.evaluate(() => {
  Game.player.maxHits = 999;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const sp = fpGun.userData.accessories.stockParts;
  const sockId = Game.persist.equipped.attachments.ar.stock;
  const mesh = Object.keys(sp.meshes).filter(k => sp.meshes[k].visible);
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  const cone = (ads, sway) => {
    const a = []; const outer = _gameRng; _gameRng = _mulberry32(0x5eed1 + Math.round(sway * 10));
    try {
      for (let i = 0; i < 300; i++) {
        clear(); Game.gun.ammo = Game.gun.maxAmmo; Game.player.ads = ads; Game.player.sway = sway; fireBB();
        for (const b of mine()) a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(fwd))) * 180 / Math.PI);
      }
    } finally { _gameRng = outer; }
    clear(); a.sort((x, y) => x - y); return a[a.length >> 1];
  };
  Game.mouse.locked = true;
  const p0 = Game.player.pos.clone(), yaw0 = Game.player.yaw;
  const walk = () => {   // 2 s holding W with the gun up, from where the round starts
    Game.player.pos.copy(p0); Game.player.yaw = yaw0; Game.player.vel && Game.player.vel.set(0, 0, 0);
    Game.keys.KeyW = true;
    for (let i = 0; i < 120; i++) { Game.player.adsTarget = 1; Game.player.ads = 1; stepGame(1 / 60); }
    Game.keys.KeyW = false;
    for (let i = 0; i < 30; i++) stepGame(1 / 60);
    return +Game.player.pos.clone().sub(p0).setY(0).length().toFixed(3);
  };
  const measure = () => ({ hip: cone(0, 0), aimed: cone(1, 0), aimedWalk: cone(1, 0.8), walk: walk(),
    weight: computeLoadoutWeight().parts.filter(p => p.label === 'Sock-Padded Stock').map(p => p.w) });
  const sock = measure();
  clearGunSlot('ar', 'stock', -1);
  const bare = measure();
  mountAccessory('ar', sockId, 'stock', -1);
  return { bare, sock_stock: Object.assign(sock, { mesh }) };
});
console.log('   stock in a match:', JSON.stringify(S3));
const { bare: KB, sock_stock: KS } = S3;
check('Sock-Padded Stock: on the gun in hand, 0.4 lb in the loadout weight', KS.mesh.length === 1 && KS.mesh[0] === 'sock_stock' && KS.weight[0] === 0.4 && KB.weight.length === 0, S3);
check('Sock-Padded Stock: aimed, the cone a fifth tighter, standing and walking; from the hip, no change',
  Math.abs(KS.aimed / KB.aimed - 0.8) < 0.02 && Math.abs(KS.aimedWalk / KB.aimedWalk - 0.8) < 0.02 && Math.abs(KS.hip / KB.hip - 1) < 0.005, S3);
check('Sock-Padded Stock: aimed, you walk 1.1-1.25 times as far in 2 s', KS.walk / KB.walk > 1.1 && KS.walk / KB.walk < 1.25, S3);

check('no page errors (the stock\'s match)', g2.errs.length === 0, g2.errs);

// --- v1.426: the Taped-Up Long Mag: bought from the Mods tab as UNDER and measured under the handguard on the long guns
// in the first page (with the bungee sling, above); its matches in the stock's browser, after the stock's match. On the AR,
// half as many BBs again in the mag (the HUD says so), a spare mag's swap and a speed loader's feed half as long again,
// 1 lb in the weight. The same numbers bare, in a second match, to compare. (The off hand on it, on the MP5: fp-hands.)
// 4 Nov (CI red on auto/build, headless 3/4 and 5/5): a third fresh browser closed under its first match on CI's runner
// twice running (as in b81fc4a, its shop visit before); here it passes. The long mag's two matches now run in the
// stock's browser, which has already played one, so the suite opens two browsers, not three.
const g3 = g2; const page3 = page2;
console.log('   long mag:', JSON.stringify(lm));
check('Taped-Up Long Mag: in the Mods tab as UNDER with its picture, bought for $18', lm.tag === 'UNDER' && lm.pic && lm.paid === 18, lm);
check('Taped-Up Long Mag: under the handguard on the AR, the Pump Sniper and the M60 (top within 1 cm, hanging 14-17 cm, centred); the Uzi has no slot',
  ['ar', 'pumpsniper', 'm60'].every(gt => lm.geo[gt].top <= 0.01 && lm.geo[gt].drop > 0.14 && lm.geo[gt].drop < 0.17 && Math.abs(lm.geo[gt].cx) < 0.005) && lm.geo.uzi === 'no slot', lm.geo);
const LM = {};
for (const type of ['long_mag', null]) {
  await page3.evaluate((type) => {
    Game.persist.owned.ar = true;
    const gt = 'ar'; Game.persist.equipped.gun = gt; ensureGunSlots(gt);
    for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
    if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'under', -1); }
    Game.persist.bag = 2000;
    Game.persist.speedLoaders = []; buySpeedLoader('sl_50');
    const sl = Game.persist.speedLoaders[Game.persist.speedLoaders.length - 1];
    Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, { kind: 'spare_mag', refId: 'spare_mag_ar' }, { kind: 'speed_loader', refId: sl.id }, null];
    return true;
  }, type);
  await g3.scenario('bunratty_sean');
  LM[type || 'bare'] = await page3.evaluate(() => {
    Game.player.maxHits = 999;
    for (const e of Game.scenario.enemies) e.noFire = true;
    for (let i = 0; i < 10; i++) stepGame(1 / 60);
    const out = { mag: Game.gun.ammo, max: Game.gun.maxAmmo, hud: document.getElementById('ammoMax').textContent,
      spare: (Game.gun.spareAmmo || {})[1] || 0,
      weight: computeLoadoutWeight().parts.filter(p => p.label === 'Taped-Up Long Mag').map(p => p.w) };
    // the speed loader's feed: BBs in the first half second held, from an empty mag (the AR's 25 would cap a second)
    const feed = (frames) => {
      Game.persist.speedLoaders.find(l => l.id === Game.persist.loadoutSlots[2].refId).currentBBs = 50;   // a full loader each time
      Game.gun.ammo = 0; Game.held.slotIdx = 2; Game.held.swapBlock = 0; Game.mouseLMB = true; onLmbDown();
      for (let i = 0; i < frames; i++) { Game.mouseLMB = true; stepGame(1 / 60); }
      const n = Game.gun.ammo; Game.mouseLMB = false; stepGame(1 / 60); return n;
    };
    out.fed = feed(30);
    // the spare mag's swap: from a click to the mag in the gun
    const swap = (from) => {
      Game.gun.ammo = from; Game.held.slotIdx = 1; Game.held.swapBlock = 0; Game.mouseLMB = true; onLmbDown();
      let f = 0; while (Game.held.slotIdx === 1 && f < 300) { Game.mouseLMB = true; stepGame(1 / 60); f++; }
      const r = +(f / 60).toFixed(3); Game.mouseLMB = false; stepGame(1 / 60); return r;
    };
    out.swap = swap(3); out.afterSwap = Game.gun.ammo;
    // v1.428 (critic, 3 Nov): the mag's size goes with the mag. With the spare in, the HUD and the loader's top-up
    // are the spare's 25, and the pouch holds the long mag at 3 of its 38; swapping back puts the 38 back in the gun.
    const pouch = describeSlot(1);
    out.in = { max: Game.gun.maxAmmo, hud: document.getElementById('ammoMax').textContent, pouch: pouch.name, pouchBBs: pouch.bbs, pouchCap: pouch.magCap };
    out.in.fed = feed(30); out.in.fedFull = feed(120);
    Game.gun.ammo = 7;
    out.back = { swap: swap(7) };
    out.back.mag = Game.gun.ammo; out.back.max = Game.gun.maxAmmo; out.back.hud = document.getElementById('ammoMax').textContent;
    out.back.pouch = describeSlot(1).name; out.back.pouchBBs = describeSlot(1).bbs;
    return out;
  });
  await page3.evaluate(() => endScenario('forfeit'));
  await page3.waitForFunction(() => Game.mode !== 'scenario');
}
console.log('   long mag in a match:', JSON.stringify(LM));
const { bare: LB, long_mag: LL } = LM;
check('Taped-Up Long Mag: the AR loads 38 (25 bare), and the HUD says so; the spare AR mag still loads its own 25',
  LL.max === 38 && LL.mag === 38 && LB.max === 25 && LB.mag === 25 && LL.hud.startsWith('38') && LL.spare === 25 && LB.spare === 25, LM);
check('Taped-Up Long Mag: 1 lb in the loadout weight', LL.weight[0] === 1 && LB.weight.length === 0, LM);
check('Taped-Up Long Mag: a spare mag swaps in 1.4-1.6 times as long (0.4 s bare)', Math.abs(LB.swap - 0.4) < 0.04 && LL.swap / LB.swap > 1.4 && LL.swap / LB.swap < 1.6 && LL.afterSwap === 25, LM);
check('Taped-Up Long Mag: a speed loader feeds 1/1.5 as many BBs in half a second (about 13 against 20)', LB.fed >= 18 && LB.fed <= 20 && Math.abs(LL.fed / LB.fed - 1 / 1.5) < 0.06, LM);
check('Taped-Up Long Mag: with the spare swapped in, the gun holds 25 (HUD 25), a speed loader tops it to 25 at the bare rate, and the pouch holds the long mag with its 3 of 38',
  LL.in.max === 25 && LL.in.hud.startsWith('25') && LL.in.fedFull === 25 && LL.in.fed >= 18 && LL.in.fed <= 20 && LL.in.pouch === 'Taped-Up Long Mag' && LL.in.pouchBBs === 3 && LL.in.pouchCap === 38, LM);
check('Taped-Up Long Mag: swapping it back in takes the long time and the gun holds 38 again with its 3; the spare is back in the pouch',
  LL.back.mag === 3 && LL.back.max === 38 && LL.back.hud.startsWith('38') && LL.back.pouch === 'Spare 25-rd AR Mag' && LL.back.pouchBBs === 7 && LL.back.swap / LB.swap > 1.4, LM);
check('bare AR: two plain mags trade without changing size (25 / 25)', LB.in.max === 25 && LB.back.max === 25 && LB.in.pouch === 'Spare 25-rd AR Mag' && LB.in.fedFull === 25, LM);
check('no page errors (the long mag\'s matches)', g3.errs.length === 0, g3.errs);
await g3.close();
