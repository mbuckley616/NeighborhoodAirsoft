// v1.441 (backlog D.86, Michael: A, a third wave of homemade parts, 4 Nov 2026): the Taped-On Flashlight, a yellow
// kitchen-drawer torch duct-taped under the barrel of a long gun. $7, 0.5 lb, the UNDER slot. It lights where you point
// for the night matches without a side rail, dimmer and shorter than the Tactical Flashlight (2.2 and 9 m against 3.4
// and 14 m), and a shot knocks it out for 0.2 s about one time in four (the batteries rattle).
// Checked: the Mods tab, where it sits on four long guns (ahead of the off hand, under the bore), and a night match.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
const shop = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.ar = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Taped-On Flashlight'));
  if (!row) return null;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  const out = { tag: row.querySelector('.shop-slot-tag').textContent, pic: !!row.querySelector('img, canvas'), paid: cash0 - Game.persist.cash,
    owned: Game.persist.ownedEquipment.attachments.taped_light };
  closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('Taped-On Flashlight: in the Mods tab as UNDER with its picture, bought for $7', shop && shop.tag === 'UNDER' && shop.pic && shop.paid === 7 && shop.owned === 1, shop);

// --- where it sits: on the AR, the UMP, the Thunder Pump and the M60, with your hands on: clear of the off hand and ahead
// of it, under the bore, centred, the tape reaching the gun; the Uzi has no slot
const geo = await page.evaluate(() => {
  const out = {};
  for (const gt of ['ar', 'ump', 'thunder', 'm60', 'uzi']) {
    const m = buildWorkbenchGun(gt);
    const up = m.userData.accessories.underParts;
    if (!up) { out[gt] = 'no slot'; continue; }
    attachFpHands(m, gt);
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const tl = up.meshes.taped_light; tl.visible = true;
    const meshes = tl.children.filter(o => o.isMesh && o !== tl.userData.beam);
    const box = (objs) => { const b = new THREE.Box3(); objs.forEach(o => b.expandByObject(o)); return b.applyMatrix4(inv); };
    const lb = box(meshes), hb = box([m.userData.fpHands.l[0]]);
    const bands = box(meshes.filter(o => o.material.color && o.material.color.getHex() === 0x9ea3a8));
    const body = box(meshes.filter(o => !(o.material.color && o.material.color.getHex() === 0x9ea3a8)));
    // the gun itself on the centre line (not your hands, not a homemade part): does the tape reach it, does the torch cut it
    const handSet = new Set(); for (const k of ['r', 'l', 'under']) for (const o of (m.userData.fpHands[k] || [])) o.traverse(x => handSet.add(x));
    let touch = false, cut = 0;
    m.traverse(o => {
      if (!o.isMesh || handSet.has(o) || !o.visible) return;
      let inPart = false; for (let p = o; p && p !== m; p = p.parent) if (!p.visible || (p.userData && (p.userData.underPart || p.userData.muzzlePart))) inPart = true;   // a part, or hidden
      if (inPart) return;
      const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv);
      if (b.isEmpty() || b.min.x > 0.004 || b.max.x < -0.004) return;
      if (!b.clone().intersect(bands).isEmpty()) touch = true;
      const i = b.clone().intersect(body);
      if (!i.isEmpty()) cut = Math.max(cut, Math.min(i.max.y - i.min.y, i.max.z - i.min.z));
    });
    out[gt] = { hit: !hb.clone().intersect(lb).isEmpty(), ahead: +(hb.min.z - lb.max.z).toFixed(3), cx: +((lb.min.x + lb.max.x) / 2).toFixed(4),
      touch, cut: +cut.toFixed(4), len: +(lb.max.z - lb.min.z).toFixed(3) };
  }
  return out;
});
console.log('   geo:', JSON.stringify(geo));
check('Taped-On Flashlight: on the AR, UMP, Thunder Pump and M60 it clears the off hand and sits ahead of it, centred, 11-13 cm long; the Uzi has no slot',
  ['ar', 'ump', 'thunder', 'm60'].every(gt => !geo[gt].hit && geo[gt].ahead >= 0 && geo[gt].ahead < 0.02 && Math.abs(geo[gt].cx) < 0.003 && geo[gt].len > 0.11 && geo[gt].len < 0.13) && geo.uzi === 'no slot', geo);
check('Taped-On Flashlight: its tape reaches the gun on each, and the torch itself cuts into no part of the gun (under 2 mm)',
  ['ar', 'ump', 'thunder', 'm60'].every(gt => geo[gt].touch && geo[gt].cut < 0.002), geo);

// --- a night match on the AR, the light on its under-barrel slot; then the Tactical Flashlight on a rail to compare
const mount = (type) => page.evaluate((type) => {
  const gt = 'ar'; Game.persist.equipped.gun = gt; ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  for (const ri of [0, 1]) clearGunSlot(gt, 'rail', ri);
  if (type) {
    const rail = ATTACHMENTS[type].slot === 'rail';
    const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, rail ? 'rail' : 'under', rail ? 0 : -1);
  }
  Game.persist.bag = 2000;
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  return getMountedAccessories(gt).map(a => a.type);
}, type);
const N = {};
for (const type of ['taped_light', 'flashlight']) {
  const on = await mount(type);
  await g.scenario('winnmark_night_prowl');
  N[type] = await page.evaluate(() => {
    Game.player.maxHits = 999;
    for (const e of Game.scenario.enemies) e.noFire = true;
    for (let i = 0; i < 160; i++) stepGame(1 / 60);   // past the opening hold
    const acc = fpGun.userData.accessories;
    const tl = acc.underParts.meshes.taped_light;
    let shown = true; for (let o = tl; o; o = o.parent) if (!o.visible) shown = false;
    const inScene = (() => { let o = tl; while (o.parent) o = o.parent; return o === Game.scene; })();
    const out = { night: Game.scenario.timeOfDay || null, tlShown: shown, inScene, tl: { i: tl.userData.light.intensity, d: tl.userData.light.distance },
      tac: { shown: acc.flashUnit.visible, i: acc.flashLight.intensity, d: acc.flashLight.distance },
      weight: computeLoadoutWeight().parts.filter(p => p.label === 'Taped-On Flashlight').map(p => p.w) };
    // the blink: shots with the dice fixed, the light's intensity frame by frame after each
    const rnd = Math.random;
    const shoot = (r) => {
      Math.random = () => r;
      try { Game.gun.ammo = Game.gun.maxAmmo; Game.gun.fireCooldown = 0; doFire(); } finally { Math.random = rnd; }
      const seen = [];
      for (let f = 0; f < 20; f++) { stepGame(1 / 60); seen.push(+tl.userData.light.intensity.toFixed(2)); }
      for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0;
      return seen;
    };
    out.lucky = shoot(0.9); out.knocked = shoot(0.1);
    // a seeded run of 400 shots: about one in four blinks
    let seed = 0x11fe; const b0 = Game.gun._blinks || 0;
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { for (let i = 0; i < 400; i++) { Game.gun.ammo = Game.gun.maxAmmo; Game.gun.fireCooldown = 0; doFire(); } } finally { Math.random = rnd; }
    for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0;
    out.blinks400 = (Game.gun._blinks || 0) - b0;
    return Object.assign(out, { mounted: getMountedAccessories('ar').map(a => a.type) });
  });
  N[type].on = on;
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
console.log('   night:', JSON.stringify(N));
const T = N.taped_light, F = N.flashlight;
check('in a night match: the taped light shows on the gun in hand, lit at 2.2 out to 9 m; no Tactical Flashlight', T.tlShown && T.inScene && T.tl.i === 2.2 && T.tl.d === 9 && !T.tac.shown && T.tac.i === 0, T);
check('the Tactical Flashlight on a rail is brighter and reaches further (3.4, 14 m), with no taped light shown', !F.tlShown && F.tac.shown && F.tac.i > T.tl.i && F.tac.d > T.tl.d, F);
check('Taped-On Flashlight: 0.5 lb in the loadout weight', T.weight[0] === 0.5 && F.weight.length === 0, N);
check('a lucky shot leaves it on; a knocked one puts it out for about 0.2 s (11-13 frames) and it comes back at 2.2',
  T.lucky.every(v => v === 2.2) && T.knocked.slice(0, 10).every(v => v === 0) && T.knocked.filter(v => v === 0).length >= 11 && T.knocked.filter(v => v === 0).length <= 13 && T.knocked[19] === 2.2, T);
check('over 400 shots it blinks about one in four (80-120 times)', T.blinks400 >= 80 && T.blinks400 <= 120, T.blinks400);
check('with the Tactical Flashlight, shots never blink anything', F.blinks400 === 0, F.blinks400);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
