// v1.199 (D.21 step 3, Michael: C on "A better game" 2): shorts. The Clothes tab's third section sells cargo shorts,
// basketball shorts and jean shorts and lists one you win (Swim Trunks, for winning Night Swim at Willow Bend). In
// shorts the legs are bare below them, in white socks; the shorts are children of the legs, so they swing and crouch
// with them. Worn from the shop or the mirror's Shorts row (a Pants colour puts the jeans back). Saved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const d0 = await page.evaluate(() => {
  openMirror();
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  closeMirror();
  return { shorts: Game.persist.look.shorts, rows, owned: Object.keys(Game.persist.ownedShorts) };
});
check('a new game wears jeans and owns no shorts; no Shorts row at the mirror', d0.shorts === 'none' && d0.owned.length === 0 && !d0.rows.includes('shorts'), d0);

const readShop = () => page.evaluate(() => ({
  headers: [...document.querySelectorAll('#shopScreen .shop-section-header span:first-child')].map(e => e.textContent),
  rows: [...document.querySelectorAll('#shopScreen .shop-shorts')].map(r => ({ id: r.dataset.shorts,
    name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), price: r.querySelector('.shop-item-price').textContent,
    btn: r.querySelector('.shop-item-buy').textContent, off: r.querySelector('.shop-item-buy').disabled })),
  cash: Game.persist.cash, shorts: Game.persist.look.shorts, top: Game.persist.look.top, flash: shopState.flash,
}));
await page.evaluate(() => { Game.persist.cash = 14; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click(); });
const s0 = await readShop();
const row = (s, id) => s.rows.find(r => r.id === id);
check('the Clothes tab: Hats, Tops, Shorts', s0.headers.join() === 'Hats,Tops,Shorts', s0.headers);
check('four shorts: cargo, basketball, jean shorts, Swim Trunks', s0.rows.map(r => r.name).join() === 'Cargo Shorts,Basketball Shorts,Jean Shorts,Swim Trunks', s0.rows);
check('with $14 the $12 jean shorts say BUY, the $15 and $20 ones NEED; the trunks EARN IT',
  row(s0, 'jorts').btn === 'BUY' && row(s0, 'mesh').btn === 'NEED $15' && row(s0, 'cargo').btn === 'NEED $20' && row(s0, 'trunks').btn === 'EARN IT' && row(s0, 'trunks').off && row(s0, 'trunks').price === 'WON', s0.rows);

const click = id => page.evaluate(id => document.querySelector(`#shopScreen .shop-shorts[data-shorts="${id}"] .shop-item-buy`).click(), id);
await page.evaluate(() => { Game.persist.cash = 100; Game.persist.ownedTops.tee_skate = true; Game.persist.look.top = 'tee_skate'; renderShop(); });
await click('cargo');
const s1 = await readShop();
check('BUY the cargo shorts: $20 paid, worn; the top stays on; TAKE OFF', s1.cash === 80 && s1.shorts === 'cargo' && s1.top === 'tee_skate' && row(s1, 'cargo').btn === 'TAKE OFF' && /Purchased: Cargo Shorts/.test(s1.flash), s1);
await g.shot('shorts-shop');
await click('mesh'); await click('cargo');
const s2 = await readShop();
check('buy the basketball shorts, then WEAR the cargo shorts again: one pair at a time', s2.cash === 65 && s2.shorts === 'cargo' && row(s2, 'mesh').btn === 'WEAR', s2);
await click('cargo');
check('TAKE OFF puts the jeans back', (await readShop()).shorts === 'none');
await page.evaluate(() => closeShop());

// The meshes
const fit = await page.evaluate(() => {
  const r3 = b => ({ min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3)) });
  const box = o => r3(new THREE.Box3().setFromObject(o));
  const own = m => { m.geometry.computeBoundingBox(); return r3(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); };
  // the shorts' own cloth, and the sock, from the leg's merged group (one mesh per material)
  const body = (g, id) => own(g.children.find(m => m.isMesh && m.material.color.getHex() === KID_SHORTS[id].color));
  const sock = g => own(g.children.find(m => m.isMesh && m.material.color.getHex() === 0xeeece4));
  const out = {};
  for (const id of [null, ...KID_SHORTS_ORDER]) {
    const kid = createKid({ pantsColor: 0x2a3a5a, skinColor: 0xc89870, ...(id ? { shorts: id } : {}) });
    kid.group.updateMatrixWorld(true);
    const po = kid.pose;
    out[id || 'jeans'] = { legMat: po.legL.material.color.getHex(), skin: kid.head.material.color.getHex(),
      shorts: kid.shorts ? kid.shorts.map(s => s.userData.kidShorts) : null, parents: kid.shorts ? kid.shorts.map(s => s.parent === po.legR ? 'R' : s.parent === po.legL ? 'L' : '?') : null,
      sB: kid.shorts ? body(kid.shorts[1], id) : null, sock: kid.shorts ? sock(kid.shorts[1]) : null, leg: own(po.legL), shoe: box(po.shoeL), torso: own(kid.torso) };
    if (id === 'cargo') {
      po.legL.rotation.x = 0.5; kid.group.updateMatrixWorld(true);
      out.swing = +(body(kid.shorts[1], 'cargo').max[2] - out.cargo.sB.max[2]).toFixed(3);
      po.legL.rotation.x = 0; setKidCrouch(kid, 1); kid.group.updateMatrixWorld(true);
      out.crouchTop = { shorts: body(kid.shorts[1], 'cargo').max[1], leg: own(po.legL).max[1] };
    }
  }
  return out;
});
check('in jeans the legs are the pants colour', fit.jeans.legMat === 0x2a3a5a && fit.jeans.shorts === null, fit.jeans);
const ids = ['cargo', 'mesh', 'jorts', 'trunks'];
check('in shorts the legs are bare (the skin), one pair on both legs', ids.every(id => fit[id].legMat === 0xc89870 && fit[id].shorts.join() === `${id},${id}` && fit[id].parents.join() === 'R,L'),
  ids.map(id => [id, fit[id].legMat.toString(16), fit[id].parents]));
check('the shorts run from the hip (under the shirt\'s hem) to the knee, wider than the bare leg', ids.every(id => {
  const s = fit[id].sB, l = fit[id].leg; return Math.abs(s.max[1] - 0.55) < 0.01 && s.min[1] > 0.17 && s.min[1] < 0.3 && s.max[0] - s.min[0] > l.max[0] - l.min[0]; }),
  ids.map(id => [id, fit[id].sB, fit[id].leg]));
check('the basketball shorts and trunks reach past the knee; the cargo and jean shorts stop above it',
  fit.mesh.sB.min[1] < 0.24 && fit.trunks.sB.min[1] < 0.24 && fit.cargo.sB.min[1] > 0.26 && fit.jorts.sB.min[1] > 0.26, ids.map(id => [id, fit[id].sB.min[1]]));
check('a white sock shows above the sneaker, below the shorts', ids.every(id => fit[id].sock.min[1] < fit[id].shoe.max[1] && fit[id].sock.max[1] > fit[id].shoe.max[1] + 0.05 && fit[id].sock.max[1] < fit[id].sB.min[1]),
  ids.map(id => [id, fit[id].sock, fit[id].shoe.max[1]]));
check('the shorts swing with the leg and lower with it on a crouch', fit.swing > 0.05 && Math.abs(fit.crouchTop.shorts - fit.crouchTop.leg) < 0.01 && fit.crouchTop.leg < 0.5, { swing: fit.swing, crouch: fit.crouchTop });

// The mirror: a Shorts row under the Pants; a Pants colour puts the jeans back
const mir = await page.evaluate(() => {
  openMirror();
  const q = key => [...document.querySelectorAll(`#mirrorOptions .mirror-row[data-key="${key}"] .mirror-opt`)];
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  const opts = q('shorts').map(b => b.textContent);
  q('shorts').find(b => b.textContent === 'Basketball Shorts').click();
  const on = { shorts: Game.persist.look.shorts, preview: MIRROR.kid.shorts && MIRROR.kid.shorts[0].userData.kidShorts };
  return { rows, opts, on };
});
check('the mirror\'s Shorts row comes after the Pants: None, Cargo Shorts, Basketball Shorts', mir.opts.join() === 'None,Cargo Shorts,Basketball Shorts' && mir.rows.indexOf('shorts') === mir.rows.indexOf('pantsColor') + 1, mir);
check('clicking Basketball Shorts wears them on the preview', mir.on.shorts === 'mesh' && mir.on.preview === 'mesh', mir.on);
await page.evaluate(() => { MIRROR.kid.group.rotation.y = 0.3; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); });
await g.shot('shorts-mirror');
const off = await page.evaluate(() => {
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="pantsColor"] .mirror-opt')][3].click();
  return { shorts: Game.persist.look.shorts, pants: Game.persist.look.pantsColor, preview: MIRROR.kid.shorts };
});
check('a Pants colour puts the jeans back, in that colour', off.shorts === 'none' && off.pants === 0x4a5a3a && off.preview === null, off);
await page.evaluate(() => { [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="shorts"] .mirror-opt')].find(b => b.textContent === 'Cargo Shorts').click(); closeMirror(); });

// The Loadout kid wears them, knee pads and all
const lo = await page.evaluate(() => {
  Game.persist.owned = Game.persist.owned || {};
  openLoadout(); const s = LOADOUT_KID.kid.shorts && LOADOUT_KID.kid.shorts[0].userData.kidShorts; closeLoadout(); return s;
});
check('the Loadout screen\'s kid wears the cargo shorts', lo === 'cargo', lo);

const won = await page.evaluate(() => {
  Game.persist.completed.club_night_4v4 = true;
  openShop(); [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click();
  const b = document.querySelector('#shopScreen .shop-shorts[data-shorts="trunks"] .shop-item-buy');
  const r = { btn: b.textContent, off: b.disabled, cash: Game.persist.cash };
  b.click(); closeShop();
  return { ...r, shorts: Game.persist.look.shorts, cashAfter: Game.persist.cash };
});
check('winning Night Swim gives the Swim Trunks: WEAR, free', won.btn === 'WEAR' && !won.off && won.shorts === 'trunks' && won.cashAfter === won.cash, won);

const save = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = { ok: r.ok, shorts: Game.persist.look.shorts, owned: Object.keys(Game.persist.ownedShorts).sort() };
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.look.shorts; delete raw.persist.ownedShorts;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame();
  return { kept, old: { shorts: Game.persist.look.shorts, owned: Object.keys(Game.persist.ownedShorts || {}).length } };
});
check('a save and load keeps the shorts you wear and the ones you bought', save.kept.ok && save.kept.shorts === 'trunks' && save.kept.owned.join() === 'cargo,mesh', save.kept);
check('an old save with no shorts wears jeans', save.old.shorts === 'none' && save.old.owned === 0, save.old);

// Kids in matches still walk: an enemy's legs and the walk are unchanged (no kid but yours wears shorts)
await g.scenario('bunratty_sean');
// v1.220 fix-up: the player stands still and is not to be tagged here (CI, 14 Oct: Sean ended the 1v1 inside the 3 s)
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
await g.spin(180);
check('a match runs', await page.evaluate(() => Game.mode === 'scenario'));

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
