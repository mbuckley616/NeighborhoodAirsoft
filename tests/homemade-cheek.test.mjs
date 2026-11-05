// v1.443 (backlog D.86, Michael: A, a third wave of homemade parts, 4 Nov 2026): the Foam-Noodle Cheek Pad, a length of
// pool noodle slit and pushed over the top of a long gun's stock, taped at each end. $5, 0.2 lb, the STOCK slot (a trade
// against the Sock-Padded Stock). Aiming in is 1.25 times as quick; nothing else changes. In first person it hides from
// a quarter aimed, since it sits under your cheek and filled the sight picture.
// Checked: the Mods tab, where it sits on every gun with a stock slot, and a match.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
const shop = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.ar = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Foam-Noodle Cheek Pad'));
  if (!row) return null;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  const out = { tag: row.querySelector('.shop-slot-tag').textContent, pic: !!row.querySelector('img, canvas'), paid: cash0 - Game.persist.cash,
    owned: Game.persist.ownedEquipment.attachments.noodle_pad };
  closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('Foam-Noodle Cheek Pad: in the Mods tab as STOCK with its picture, bought for $5', shop && shop.tag === 'STOCK' && shop.pic && shop.paid === 5 && shop.owned === 1, shop);

// --- where it sits on every gun with a stock slot: on the centre line, along the top of the stock from 1.5 cm short of
// the butt, sunk a third of its depth over the comb; the tape bands reach down the stock. The Uzi has none.
const geo = await page.evaluate(() => {
  const out = { rows: [], none: [] };
  for (const gt of ALL_GUN_TYPES) {
    const m = buildWorkbenchGun(gt);
    const sp = m.userData.accessories.stockParts;
    if (!getGunAccessoryCap(gt).stock) { out.none.push(gt + (sp ? '+' : '-')); continue; }
    const np = sp.meshes.noodle_pad; np.visible = true;
    m.updateWorldMatrix(true, true);
    const iv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const nb = new THREE.Box3().setFromObject(np.children[0]).applyMatrix4(iv);
    const bands = np.children.filter(o => o.geometry.type === 'BoxGeometry').map(o => new THREE.Box3().setFromObject(o).applyMatrix4(iv));
    const r3 = x => +x.toFixed(3);
    out.rows.push({ gt, sink: r3(np.userData.comb - nb.min.y), cx: +((nb.min.x + nb.max.x) / 2).toFixed(4), back: r3(sp.rearZ - nb.max.z), len: r3(nb.max.z - nb.min.z),
      bands: bands.length, bandBelow: r3(Math.min(...bands.map(b => np.userData.comb - b.min.y))), bandOver: r3(Math.min(...bands.map(b => b.max.y - nb.max.y))) });
  }
  return out;
});
for (const r of geo.rows) console.log('  ', JSON.stringify(r));
console.log('   no slot:', geo.none.join(' '));
check('on every gun with a stock slot (35, v1.446: the Gas Carbine, v1.447: the Break-Barrel, v1.448: the DMR) it lies on the centre line, 1.5 cm short of the butt, 11 cm long, sunk 1-1.2 cm over the comb',
  geo.rows.length === 35 && geo.rows.every(r => Math.abs(r.cx) < 0.002 && Math.abs(r.back - 0.015) < 0.001 && Math.abs(r.len - 0.11) < 0.002 && r.sink >= 0.01 && r.sink <= 0.012), geo.rows);
check('two tape bands wrap it, over its top and 3 cm or more down the stock', geo.rows.every(r => r.bands === 2 && r.bandOver > 0 && r.bandBelow >= 0.03), geo.rows);
check('the 14 guns with no stock slot have no stock parts', geo.none.length === 14 && geo.none.every(s => s.endsWith('-')), geo.none);

// --- the workbench: it takes the stock slot, so it and the sock can't both be on
const wb = await page.evaluate(() => {
  const gt = 'ar'; ensureGunSlots(gt); clearGunSlot(gt, 'stock', -1);
  const sock = makeAccessoryInstance('sock_stock'), pad = getUnmountedInstances('noodle_pad')[0];
  const a = mountAccessory(gt, sock.id, 'stock', -1).ok, b = mountAccessory(gt, pad.id, 'stock', -1).ok;
  const onRail = mountAccessory(gt, makeAccessoryInstance('noodle_pad').id, 'under', -1).ok;
  const r = { a, b, onRail, mounted: getMountedAccessories(gt).filter(x => x.slot === 'stock').map(x => x.type) };
  clearGunSlot(gt, 'stock', -1);
  return r;
});
console.log('   workbench:', JSON.stringify(wb));
check('on the workbench it takes the AR\'s stock slot in place of the sock, and goes nowhere else', wb.a && wb.b && !wb.onRail && wb.mounted.length === 1 && wb.mounted[0] === 'noodle_pad', wb);

// --- in a match on the AR: aiming in, the aimed cone and the pad's pieces, against the bare gun
const setStock = (type) => page.evaluate((type) => {
  const gt = 'ar'; Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  for (const ri of [0, 1]) clearGunSlot(gt, 'rail', ri);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'stock', -1); }
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  Game.persist.equipped.armor = {};
}, type);
const measure = () => page.evaluate(() => {
  Game.player.maxHits = 999;
  Game.mouse.locked = true;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  for (let i = 0; i < 30; i++) step();
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  const np = fpGun.userData.accessories.stockParts.meshes.noodle_pad;
  const pieces = () => np.visible && np.children.every(o => o.visible);
  const out = { hip: pieces(), weight: computeLoadoutWeight().parts.filter(p => p.label === 'Foam-Noodle Cheek Pad').map(p => p.w) };
  const fwd = () => new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const cone = () => {   // 300 aimed shots, standing still, on the same seeded draws for each gun
    const f = fwd(), a = [];
    const rnd = Math.random, grng = _gameRng; let seed = 0x5eed1; _gameRng = null;
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try {
      for (let i = 0; i < 300; i++) {
        clear(); Game.gun.ammo = Game.gun.maxAmmo; Game.player.ads = 1; Game.player.sway = 0; fireBB();
        for (const b of mine()) a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(f))) * 180 / Math.PI);
      }
    } finally { Math.random = rnd; _gameRng = grng; }
    clear(); a.sort((x, y) => x - y);
    return a[a.length >> 1];
  };
  // aiming in: steps from the hip to 90% aimed, the pad's pieces watched as it comes up
  Game.player.ads = 0; Game.player.adsTarget = 1;
  let f = 0, goneAt = -1;
  while (Game.player.ads < 0.9 && f < 300) { Game.player.adsTarget = 1; step(); f++; if (goneAt < 0 && !np.children.some(o => o.visible)) goneAt = +Game.player.ads.toFixed(2); }
  out.adsIn = f / 60; out.goneAt = goneAt; out.aimedGroup = np.visible;
  cone();
  out.cone = cone();
  Game.player.ads = 0; Game.player.adsTarget = 0; for (let i = 0; i < 30; i++) { Game.player.adsTarget = 0; step(); }
  out.back = pieces();
  return out;
});
const R = {};
for (const type of [null, 'noodle_pad']) {
  await setStock(type);
  await g.scenario('bunratty_sean');
  R[type || 'bare'] = await measure();
  console.log(`   AR + ${type || 'nothing'}:`, JSON.stringify(R[type || 'bare']));
  if (type) await g.shot('homemade-cheek-hip');
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
const B = R.bare, P = R.noodle_pad;
check('in a match it shows on the AR at the hip; 0.2 lb in the loadout weight; none on the bare gun', P.hip && P.back && P.weight[0] === 0.2 && B.weight.length === 0 && !B.hip, [P, B]);
check('aiming in takes 0.75-0.85 of the bare gun\'s time', P.adsIn / B.adsIn >= 0.75 && P.adsIn / B.adsIn <= 0.85, [P.adsIn, B.adsIn]);
check('as the gun comes up its pieces hide at a quarter aimed (the group stays mounted)', P.goneAt >= 0.25 && P.goneAt < 0.4 && P.aimedGroup, P);
check('aimed, the cone is the bare gun\'s (within 2%)', Math.abs(P.cone / B.cone - 1) < 0.02, [P.cone, B.cone]);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
