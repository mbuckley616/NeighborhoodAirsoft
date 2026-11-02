// v1.418 (backlog D.83, Michael: A, more homemade parts, 2 Nov 2026): the second wave of homemade workbench parts, in
// D.14's tone, each fitting the newer guns too.
//   Taped-On Toy Scope (v1.418) — a sight: zooms under half the 4× Scope through a small lens with a marker cross;
//                                 nothing for hip shots; $14.
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
check(`on all ${geo.length} guns it sits on the top rail, centred`, geo.length === 40 && bad.length === 0, bad.length ? bad : geo.slice(0, 4));

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

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
