// v1.442 (backlog D.86, Michael: A, a third wave of homemade parts, 4 Nov 2026): the Rubber-Band Bipod, two paint
// stirrers rubber-banded to a clothespin taped under the barrel of a long gun. $9, 0.4 lb, the UNDER slot. The legs lie
// folded along the barrel and swing down in 0.25 s while you crouch: crouched, the cone is 0.6 as wide; aiming in is
// 0.85 as quick, standing or crouched.
// Checked: the Mods tab, where it sits on six long guns (ahead of the off hand, clear of the gun), and a match.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
const shop = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.ar = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Rubber-Band Bipod'));
  if (!row) return null;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  const out = { tag: row.querySelector('.shop-slot-tag').textContent, pic: !!row.querySelector('img, canvas'), paid: cash0 - Game.persist.cash,
    owned: Game.persist.ownedEquipment.attachments.bipod };
  closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('Rubber-Band Bipod: in the Mods tab as UNDER with its picture, bought for $9', shop && shop.tag === 'UNDER' && shop.pic && shop.paid === 9 && shop.owned === 1, shop);

// --- where it sits, with your hands on: folded, clear of the off hand and ahead of it, cutting into no part of the gun;
// down, the feet 9 cm or more under the gun, splayed either side of the centre line. The Uzi has no slot.
const GUNS = ['ar', 'm249', 'sniper', 'l96', 'thunder', 'm60', 'ump'];
const geo = await page.evaluate((GUNS) => {
  const out = {};
  for (const gt of [...GUNS, 'uzi']) {
    const m = buildWorkbenchGun(gt);
    const up = m.userData.accessories.underParts;
    if (!up) { out[gt] = 'no slot'; continue; }
    attachFpHands(m, gt);
    const bp = up.meshes.bipod; bp.visible = true;
    const inv = () => { m.updateWorldMatrix(true, true); return new THREE.Matrix4().copy(m.matrixWorld).invert(); };
    const box = (objs, iv) => { const b = new THREE.Box3(); objs.forEach(o => b.expandByObject(o)); return b.applyMatrix4(iv); };
    const handSet = new Set(); for (const k of ['r', 'l', 'under']) for (const o of (m.userData.fpHands[k] || [])) o.traverse(x => handSet.add(x));
    // the gun's own meshes on the centre line (not your hands, not a homemade part)
    const gunBoxes = (iv) => { const a = []; m.traverse(o => {
      if (!o.isMesh || handSet.has(o) || !o.visible) return;
      for (let p = o; p && p !== m; p = p.parent) if (!p.visible || (p.userData && (p.userData.underPart || p.userData.muzzlePart || p.userData.stockPart))) return;
      const b = new THREE.Box3().setFromObject(o).applyMatrix4(iv);
      if (!b.isEmpty() && b.min.x < 0.012 && b.max.x > -0.012) a.push(b);
    }); return a; };
    setBipodLegs(bp, 0);
    let iv = inv();
    const legs = bp.userData.legs;
    const lb = box(legs, iv), hb = box([m.userData.fpHands.l[0]], iv);
    let cut = 0;
    for (const b of gunBoxes(iv)) for (const pv of legs) { const i = b.clone().intersect(box([pv], iv)); if (!i.isEmpty()) cut = Math.max(cut, Math.min(i.max.y - i.min.y, i.max.z - i.min.z, i.max.x - i.min.x)); }
    const gunLow = Math.min(...gunBoxes(iv).filter(b => b.max.z > lb.min.z && b.min.z < lb.max.z && b.max.y > -0.2).map(b => b.min.y));
    const folded = { hit: !hb.clone().intersect(lb).isEmpty(), ahead: +(hb.min.z - lb.max.z).toFixed(3), cut: +cut.toFixed(4), drop: +(gunLow - lb.min.y).toFixed(3) };
    setBipodLegs(bp, 1);
    iv = inv();
    const d = box(legs, iv), dh = box([m.userData.fpHands.l[0]], iv);
    const feet = legs.map(pv => box([pv], iv));
    const down = { hit: !dh.clone().intersect(d).isEmpty(), drop: +(gunLow - d.min.y).toFixed(3), cx: +((d.min.x + d.max.x) / 2).toFixed(4),
      spread: +(feet[1].max.x - feet[0].min.x).toFixed(3) };
    out[gt] = { folded, down };
  }
  return out;
}, GUNS);
for (const gt in geo) console.log('  ', gt, JSON.stringify(geo[gt]));
check('Rubber-Band Bipod: folded on seven long guns, the legs clear the off hand and sit ahead of it, cutting into no part of the gun (under 2 mm) and no more than 3.5 cm under it; the Uzi has no slot',
  GUNS.every(gt => !geo[gt].folded.hit && geo[gt].folded.ahead >= 0 && geo[gt].folded.ahead < 0.04 && geo[gt].folded.cut < 0.002 && geo[gt].folded.drop < 0.035) && geo.uzi === 'no slot', geo);
check('Rubber-Band Bipod: down, the feet stand 9-16 cm under the gun, splayed 5 cm or more apart round the centre line, clear of the off hand',
  GUNS.every(gt => !geo[gt].down.hit && geo[gt].down.drop >= 0.09 && geo[gt].down.drop <= 0.16 && geo[gt].down.spread >= 0.05 && Math.abs(geo[gt].down.cx) < 0.003), geo);

// --- in a match on the AR: the cone standing and crouched, the legs, aiming in, against the bare gun
const setUnder = (type) => page.evaluate((type) => {
  const gt = 'ar'; Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  for (const ri of [0, 1]) clearGunSlot(gt, 'rail', ri);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'under', -1); }
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
  const acc = fpGun.userData.accessories;
  const bp = acc.underParts.meshes.bipod;
  const out = { shown: bp.visible, weight: computeLoadoutWeight().parts.filter(p => p.label === 'Rubber-Band Bipod').map(p => p.w) };
  const fwd = () => new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const cone = () => {   // 300 hip shots, standing still, on the same seeded draws for each gun
    const f = fwd(), a = [];
    const rnd = Math.random, grng = _gameRng; let seed = 0x5eed1; _gameRng = null;   // fireBB draws gameRandom: Math.random, seeded here
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try {
      for (let i = 0; i < 300; i++) {
        clear(); Game.gun.ammo = Game.gun.maxAmmo; Game.player.ads = 0; Game.player.sway = 0; fireBB();
        for (const b of mine()) a.push(Math.acos(Math.min(1, b.vel.clone().normalize().dot(f))) * 180 / Math.PI);
      }
    } finally { Math.random = rnd; _gameRng = grng; }
    clear(); a.sort((x, y) => x - y);
    return a[a.length >> 1];
  };
  out.kStand = Game.gun._bipodK || 0; out.rotStand = +bp.userData.legs[0].rotation.x.toFixed(3);
  cone();   // a first batch: the page's first shots draw a random of their own once, so the seeds line up from the second
  out.coneStand = cone();
  // crouch: the legs a frame at a time
  Game.player.crouching = true;
  out.kSeen = [];
  for (let i = 0; i < 20; i++) { step(); out.kSeen.push(+(Game.gun._bipodK || 0).toFixed(3)); }
  out.rotDown = +bp.userData.legs[0].rotation.x.toFixed(3);
  out.coneCrouch = cone();
  // aiming in, crouched: steps from hip to 90% aimed
  Game.player.ads = 0; Game.player.adsTarget = 1;
  let f = 0; while (Game.player.ads < 0.9 && f < 300) { Game.player.adsTarget = 1; step(); f++; }
  out.adsIn = f / 60;
  Game.player.adsTarget = 0; for (let i = 0; i < 60; i++) { Game.player.adsTarget = 0; step(); }
  // stand up: the legs fold back
  Game.player.crouching = false;
  out.kUp = [];
  for (let i = 0; i < 20; i++) { step(); out.kUp.push(+(Game.gun._bipodK || 0).toFixed(3)); }
  out.rotUp = +bp.userData.legs[0].rotation.x.toFixed(3);
  return out;
});
const R = {};
for (const type of [null, 'bipod']) {
  await setUnder(type);
  await g.scenario('bunratty_sean');
  R[type || 'bare'] = await measure();
  console.log(`   AR + ${type || 'nothing'}:`, JSON.stringify(R[type || 'bare']));
  if (type) await g.shot('homemade-bipod-crouched');
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
const B = R.bare, P = R.bipod;
check('in a match the bipod shows on the AR, folded while you stand; 0.4 lb in the loadout weight', P.shown && P.kStand === 0 && P.rotStand > 1.4 && P.weight[0] === 0.4 && B.weight.length === 0, P);
check('standing, the cone is the bare gun\'s (within 2%)', Math.abs(P.coneStand / B.coneStand - 1) < 0.02, [P.coneStand, B.coneStand]);
check('crouched, the legs come down in 0.25 s (halfway at 8 frames, all the way by 15) and stay down; the bare gun has none',
  P.kSeen[7] > 0.4 && P.kSeen[7] < 0.6 && P.kSeen[14] === 1 && P.kSeen[19] === 1 && P.rotDown === 0 && B.kSeen.every(k => k === 0), [P.kSeen, P.rotDown]);
check('crouched on the legs, the cone is 0.55-0.65 of the bare gun crouched', P.coneCrouch / B.coneCrouch > 0.55 && P.coneCrouch / B.coneCrouch < 0.65, [P.coneCrouch, B.coneCrouch]);
check('aiming in takes 12-25% longer with it', P.adsIn / B.adsIn > 1.12 && P.adsIn / B.adsIn < 1.25, [P.adsIn, B.adsIn]);
check('standing up, the legs fold back in 0.25 s', P.kUp[14] === 0 && P.rotUp > 1.4, [P.kUp, P.rotUp]);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
