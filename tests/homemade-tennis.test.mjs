// v1.469 (Michael: A, two more homemade parts, 9 Nov 2026): the Tennis-Ball Grip, an old tennis ball slit and pushed
// onto a fold of duct tape under a long gun's handguard. $8, 0.3 lb, the UNDER slot (a trade against the PVC foregrip,
// steadier on the walk, and the rest). Walking, the cone is a quarter tighter (the foregrip's a third); a held automatic
// climbs 0.85 as far; standing still nothing changes. The off hand closes on it, as on the foregrip (fp-hands checks it).
// Checked: the Mods tab, where it sits on the guns, the workbench, and a match on the AK.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
const shop = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.ak47 = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Tennis-Ball Grip'));
  if (!row) return null;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  const out = { tag: row.querySelector('.shop-slot-tag').textContent, pic: !!row.querySelector('img, canvas'), paid: cash0 - Game.persist.cash,
    owned: Game.persist.ownedEquipment.attachments.tennis_grip };
  closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('Tennis-Ball Grip: in the Mods tab as UNDER with its picture, bought for $8', shop && shop.tag === 'UNDER' && shop.pic && shop.paid === 8 && shop.owned === 1, shop);

// --- on every gun with an under-barrel slot: the ball on the centre line, its top 6 mm under the handguard, at the rail's middle
const geo = await page.evaluate(() => {
  const out = { rows: [], none: [] };
  for (const gt of ALL_GUN_TYPES) {
    const m = buildWorkbenchGun(gt);
    const up = m.userData.accessories.underParts;
    if (!getGunAccessoryCap(gt).under) { out.none.push(gt + (up && up.meshes.tennis_grip ? '+' : '-')); continue; }
    const p = up.meshes.tennis_grip; p.visible = true;
    m.updateWorldMatrix(true, true);
    const iv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const ball = p.children.find(o => o.userData.tennisBall);
    const b = new THREE.Box3().setFromObject(ball).applyMatrix4(iv);
    const r4 = x => +x.toFixed(4);
    out.rows.push({ gt, cx: r4((b.min.x + b.max.x) / 2), gap: r4(up.bottom - b.max.y), dz: r4((b.min.z + b.max.z) / 2 - FP_GUN_MOUNT[gt].railZ), d: r4(b.max.y - b.min.y) });
  }
  return out;
});
console.log('   guns:', geo.rows.length, JSON.stringify(geo.rows.slice(0, 3)), 'no slot:', geo.none.length);
check('on every gun with an under-barrel slot: a 3 cm ball on the centre line, 6 mm under the handguard, at the rail\'s middle',
  geo.rows.length >= 25 && geo.rows.every(r => Math.abs(r.cx) < 0.001 && Math.abs(r.gap - 0.006) < 0.001 && Math.abs(r.dz) < 0.001 && Math.abs(r.d - 0.03) < 0.001), geo.rows);
check('the guns with no under-barrel slot have none', geo.none.length > 0 && geo.none.every(s => s.endsWith('-')), geo.none);

// --- the workbench: it takes the under slot, so it and the foregrip can't both be on; it goes nowhere else
const wb = await page.evaluate(() => {
  const gt = 'ak47'; ensureGunSlots(gt); clearGunSlot(gt, 'under', -1);
  const fg = makeAccessoryInstance('foregrip'), ball = getUnmountedInstances('tennis_grip')[0];
  const a = mountAccessory(gt, fg.id, 'under', -1).ok, b = mountAccessory(gt, ball.id, 'under', -1).ok;
  const onMuzzle = mountAccessory(gt, makeAccessoryInstance('tennis_grip').id, 'muzzle', -1).ok;
  const onPistol = mountAccessory('pistol', makeAccessoryInstance('tennis_grip').id, 'under', -1).ok;
  const r = { a, b, onMuzzle, onPistol, mounted: getMountedAccessories(gt).filter(x => x.slot === 'under').map(x => x.type) };
  clearGunSlot(gt, 'under', -1);
  return r;
});
console.log('   workbench:', JSON.stringify(wb));
check('on the workbench it takes the AK\'s under slot in place of the foregrip, and goes on no muzzle and no pistol', wb.a && wb.b && !wb.onMuzzle && !wb.onPistol && wb.mounted.length === 1 && wb.mounted[0] === 'tennis_grip', wb);

// --- in a match on the AK: the cone standing and walking, a held burst's climb, the weight; bare, ball, foregrip
const setUnder = (type) => page.evaluate((type) => {
  const gt = 'ak47'; Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  for (const ri of [0, 1]) clearGunSlot(gt, 'rail', ri);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'under', -1); }
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  Game.persist.equipped.armor = {};
}, type);
const measure = () => page.evaluate(() => {
  const P = Game.player, G = Game.gun, step = () => stepGame(1 / 60);
  P.maxHits = 999; P.pitch = 0;
  Game.mouse.locked = true;
  for (const e of Game.scenario.enemies) { e.noFire = true; e.pos.x += 400; }
  for (let i = 0; i < 90; i++) step();
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const mine = () => Game.scenario.bbs.filter(b => b.owner === 'player');
  const clear = () => { for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0; };
  const cone = (sway) => {   // the median angle off the aim over 300 hip shots on a seeded random
    const a = []; const outer = _gameRng; _gameRng = _mulberry32(0x5eed1 + Math.round(sway * 10));
    try {
      for (let i = 0; i < 300; i++) {
        clear(); G.ammo = G.maxAmmo; P.ads = 0; P.sway = sway; fireBB();
        for (const b of mine()) a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(fwd))) * 180 / Math.PI);
      }
    } finally { _gameRng = outer; }
    clear(); a.sort((x, y) => x - y); return a[a.length >> 1];
  };
  const out = { still: cone(0), walk: cone(0.8) };
  // one held burst of 1.5 s from the hip: how far the aim has climbed
  G.ammo = G.maxAmmo = 999; G.cocked = true; G.jammed = false; G._jamIn = 0; G._climb = 0;
  const outer = _gameRng;   // (the climb's kick is not on the seeded random: the burst is logged and only compared loosely)
  try {
    Game.mouseLMB = true; onLmbDown();
    for (let f = 0; f < 90; f++) { step(); G.ammo = Math.max(G.ammo, 500); G.jammed = false; }
    out.climb = G._climb || 0;
    Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
  } finally { _gameRng = outer; }
  for (let i = 0; i < 30; i++) step();
  clear();
  out.climbMult = underPartMult('climbMult');
  out.weight = computeLoadoutWeight().parts.filter(p => p.label === 'Tennis-Ball Grip').map(p => p.w);
  const up = fpGun.userData.accessories.underParts;
  out.mesh = Object.keys(up.meshes).filter(k => up.meshes[k].visible);
  return out;
});
const M = {};
for (const type of [null, 'tennis_grip', 'foregrip']) {
  await setUnder(type);
  await g.scenario('bunratty_sean');
  M[type || 'bare'] = await measure();
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
console.log('   match:', JSON.stringify(M));
const B = M.bare, T = M.tennis_grip, F = M.foregrip;
check('Tennis-Ball Grip: on the gun in hand, 0.3 lb in the loadout weight', T.mesh.length === 1 && T.mesh[0] === 'tennis_grip' && T.weight[0] === 0.3 && B.weight.length === 0, M);
check('walking, the cone is about a quarter tighter (0.7-0.85 of bare); the foregrip tighter still', T.walk / B.walk > 0.7 && T.walk / B.walk < 0.85 && F.walk < T.walk, M);
check('standing still, the cone does not change', Math.abs(T.still / B.still - 1) < 0.005, M);
check('a held burst climbs less: the climb is scaled 0.85 (as the sock and sling scale it, gun-climb), the foregrip leaves it alone',
  T.climbMult === 0.85 && F.climbMult === 1 && B.climbMult === 1 && B.climb > 0 && T.climb < B.climb, M);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
