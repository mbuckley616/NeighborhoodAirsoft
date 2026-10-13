// v1.198 (D.21 step 2, Michael: C on "A better game" 2): tops. The Clothes tab's second section sells three graphic
// tees and a grey hoodie and lists one you win (the Big Game Tee, for winning the Hollow's Big Game). A top is worn over
// the mirror's shirt: its colour is the shirt's and its front its own; the hoodie hangs over the belt, has a hood and
// sleeves to the wrist. Worn from the shop or the mirror's Top row (a Shirt colour or front takes it off). Saved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const d0 = await page.evaluate(() => {
  openMirror();
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  closeMirror();
  return { top: Game.persist.look.top, rows, owned: Object.keys(Game.persist.ownedTops) };
});
check('a new game wears no top and owns none', d0.top === 'none' && d0.owned.length === 0, d0);
check('the mirror has no Top row yet (ten rows and the crew\'s two, v1.200)', !d0.rows.includes('top') && d0.rows.length === 12, d0.rows);

// The shop: a Tops section under Hats
const readShop = () => page.evaluate(() => ({
  headers: [...document.querySelectorAll('#shopScreen .shop-section-header span:first-child')].map(e => e.textContent),
  rows: [...document.querySelectorAll('#shopScreen .shop-top')].map(r => ({ id: r.dataset.top,
    name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), price: r.querySelector('.shop-item-price').textContent,
    btn: r.querySelector('.shop-item-buy').textContent, off: r.querySelector('.shop-item-buy').disabled })),
  hats: document.querySelectorAll('#shopScreen .shop-hat').length,
  cash: Game.persist.cash, top: Game.persist.look.top, hat: Game.persist.look.hat, flash: shopState.flash,
}));
await page.evaluate(() => { Game.persist.cash = 16; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click(); });
const s0 = await readShop();
const row = (s, id) => s.rows.find(r => r.id === id);
check('the Clothes tab: Hats (six) then Tops (then, v1.199, Shorts)', s0.headers.join() === 'Hats,Tops,Shorts' && s0.hats === 6, s0);
check('five tops: three tees, a hoodie, the Big Game Tee',
  s0.rows.map(r => r.name).join() === 'Skate Tee,Shark Tee,Flame Tee,Grey Hoodie,Big Game Tee', s0.rows.map(r => r.name));
check('with $16 a $15 tee says BUY, the $18 tee NEED $18, the hoodie NEED $30',
  row(s0, 'tee_skate').btn === 'BUY' && !row(s0, 'tee_skate').off && row(s0, 'tee_flame').btn === 'NEED $18' && row(s0, 'hoodie').btn === 'NEED $30' && row(s0, 'hoodie').off, s0.rows);
check('the Big Game Tee is WON: EARN IT, greyed', row(s0, 'tee_hollow').price === 'WON' && row(s0, 'tee_hollow').btn === 'EARN IT' && row(s0, 'tee_hollow').off, row(s0, 'tee_hollow'));

const clickTop = id => page.evaluate(id => document.querySelector(`#shopScreen .shop-top[data-top="${id}"] .shop-item-buy`).click(), id);
await page.evaluate(() => { Game.persist.cash = 100; Game.persist.ownedHats.cap_red = true; Game.persist.look.hat = 'cap_red'; renderShop(); });
await clickTop('hoodie');
const s1 = await readShop();
check('BUY the hoodie: $30 paid, worn; the hat stays on', s1.cash === 70 && s1.top === 'hoodie' && s1.hat === 'cap_red' && /Purchased: Grey Hoodie/.test(s1.flash), s1);
check('its row: TAKE OFF', row(s1, 'hoodie').btn === 'TAKE OFF', row(s1, 'hoodie'));
await g.shot('tops-shop');
await clickTop('tee_shark');
await clickTop('hoodie');
const s2 = await readShop();
check('buy the Shark Tee (it goes on), then WEAR the hoodie again: one top at a time', s2.cash === 55 && s2.top === 'hoodie' && row(s2, 'tee_shark').btn === 'WEAR', s2);
await clickTop('hoodie');
check('TAKE OFF shows your own shirt again', (await readShop()).top === 'none');
await page.evaluate(() => closeShop());

// The meshes
const fit = await page.evaluate(() => {
  const look = { shirtColor: 0xc44a3a, shirtFront: 'stripe' };
  const sz = o => { const b = new THREE.Box3().setFromObject(o); return { min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3)) }; };
  const out = {};
  for (const id of [null, ...KID_TOP_ORDER]) {
    const kid = createKid({ ...look, ...(id ? { top: id } : {}) });
    kid.group.updateMatrixWorld(true);
    const trim = kid.torso.children.find(c => c.userData.kidClothes);
    let trimMeshes = 0, trimVerts = 0; trim.traverse(m => { if (m.isMesh) { trimMeshes++; trimVerts += m.geometry.attributes.position.count; } });
    const sleeves = []; kid.group.traverse(m => { if (m.userData.kidSleeve) sleeves.push(m); });
    out[id || 'shirt'] = { shirt: kid.torso.material.color.getHex(), upper: kid.pose.rigR.upper.material.color.getHex(),
      top: kid.top ? kid.top.userData.kidTop : null, art: kid.top ? sz(kid.top) : null, trimMeshes, trimVerts,
      sleeves: sleeves.length, sleeveBox: sleeves[0] ? sz(sleeves[0]) : null, hand: sz(kid.pose.rigR.hand),
      head: sz(kid.head), torso: (() => { kid.torso.geometry.computeBoundingBox(); const b = kid.torso.geometry.boundingBox.clone().applyMatrix4(kid.torso.matrixWorld);
        return { min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3)) }; })() };
    if (id === 'hoodie') { const y0 = kid.top.getWorldPosition(new THREE.Vector3()).y; setKidCrouch(kid, 1); kid.group.updateMatrixWorld(true);
      out.hoodieCrouchDrop = +(y0 - kid.top.getWorldPosition(new THREE.Vector3()).y).toFixed(3);
      out.torsoCrouchDrop = +(0.8 - kid.torso.position.y).toFixed(3); }
  }
  return out;
});
check('bare, the kid wears the mirror\'s red shirt with its stripe and belt (3 trim parts)', fit.shirt.shirt === 0xc44a3a && fit.shirt.top === null && fit.shirt.trimMeshes === 3, fit.shirt);
const tops = ['tee_skate', 'tee_shark', 'tee_flame', 'hoodie', 'tee_hollow'];
check('every top colours the shirt and its sleeves its own colour', tops.every(id => fit[id].shirt === [0xe6e3da, 0x5f9cc8, 0x1e1e20, 0x7c7d84, 0x2f5a3a][tops.indexOf(id)] && fit[id].upper === fit[id].shirt),
  tops.map(id => [id, fit[id].shirt.toString(16)]));
check('a top hides the shirt\'s stripe; a tee keeps the belt (3 parts), the hoodie hangs over it (1)',
  tops.every(id => fit[id].trimVerts < fit.shirt.trimVerts && fit[id].trimMeshes === (id === 'hoodie' ? 1 : 3)),
  [['shirt', fit.shirt.trimMeshes, fit.shirt.trimVerts], ...tops.map(id => [id, fit[id].trimMeshes, fit[id].trimVerts])]);
check('each tee\'s graphic sits on the chest front, inside the torso\'s width', ['tee_skate', 'tee_shark', 'tee_flame', 'tee_hollow'].every(id => {
  const a = fit[id].art, t = fit[id].torso; return a.max[2] > t.max[2] - 0.01 && a.max[2] < t.max[2] + 0.02 && a.min[0] > t.min[0] && a.max[0] < t.max[0] && a.min[1] > t.min[1] && a.max[1] < t.max[1]; }),
  ['tee_skate', 'tee_shark', 'tee_flame', 'tee_hollow'].map(id => [id, fit[id].art, fit[id].torso]));
const hd = fit.hoodie;
check('the hoodie: a hood behind the neck under the head, a hem below the belt line, a pocket in front',
  hd.art.min[2] < hd.torso.min[2] && hd.art.max[1] < hd.head.min[1] + 0.01 && hd.art.min[1] < hd.torso.min[1] + 0.02 && hd.art.max[2] > hd.torso.max[2], { art: hd.art, torso: hd.torso, head: hd.head });
check('the hoodie\'s sleeves run down both forearms and stop above the hand', hd.sleeves === 2 && fit.tee_skate.sleeves === 0 && hd.sleeveBox.min[1] > hd.hand.max[1] - 0.03,
  { sleeves: hd.sleeves, sleeve: hd.sleeveBox, hand: hd.hand });
check('a crouch lowers the hoodie with the torso', Math.abs(fit.hoodieCrouchDrop - fit.torsoCrouchDrop) < 3e-3 && fit.hoodieCrouchDrop > 0.05, [fit.hoodieCrouchDrop, fit.torsoCrouchDrop]);

// The mirror: a Top row under the Shirt; picking a top puts it on; picking a Shirt colour takes it off
const mir = await page.evaluate(() => {
  openMirror();
  const q = key => [...document.querySelectorAll(`#mirrorOptions .mirror-row[data-key="${key}"] .mirror-opt`)];
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  const opts = q('top').map(b => b.textContent);
  q('top').find(b => b.textContent === 'Shark Tee').click();
  const on = { top: Game.persist.look.top, preview: MIRROR.kid.top && MIRROR.kid.top.userData.kidTop, lit: document.querySelectorAll('#mirrorOptions .mirror-opt.on').length };
  return { rows, opts, on };
});
check('the mirror\'s Top row comes after the Shirt: None, Shark Tee, Grey Hoodie', mir.opts.join() === 'None,Shark Tee,Grey Hoodie' && mir.rows.indexOf('top') === mir.rows.indexOf('shirtColor') + 1, mir);
check('clicking Shark Tee wears it on the preview; one choice lit per row (14 rows, the crew name a text box, v1.200)', mir.on.top === 'tee_shark' && mir.on.preview === 'tee_shark' && mir.on.lit === 13 && mir.rows.length === 14, mir.on);
await page.evaluate(() => { MIRROR.kid.group.rotation.y = 0.2; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); });
await g.shot('tops-mirror');
const off = await page.evaluate(() => {
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="shirtColor"] .mirror-opt')][2].click();
  return { top: Game.persist.look.top, shirt: Game.persist.look.shirtColor, preview: MIRROR.kid.top };
});
check('a Shirt colour takes the top off and shows that shirt', off.top === 'none' && off.shirt === 0x3a7a4a && off.preview === null, off);
await page.evaluate(() => { [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="top"] .mirror-opt')].find(b => b.textContent === 'Grey Hoodie').click(); closeMirror(); });

const lo = await page.evaluate(() => { openLoadout(); const t = LOADOUT_KID.kid.top && LOADOUT_KID.kid.top.userData.kidTop; closeLoadout(); return t; });
check('the Loadout screen\'s kid wears the hoodie', lo === 'hoodie', lo);

// Winning the Big Game gives the Big Game Tee
const won = await page.evaluate(() => {
  Game.persist.completed.hollow_big_battle = true;
  openShop(); [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click();
  const b = document.querySelector('#shopScreen .shop-top[data-top="tee_hollow"] .shop-item-buy');
  const r = { btn: b.textContent, off: b.disabled, cash: Game.persist.cash };
  b.click(); closeShop();
  return { ...r, top: Game.persist.look.top, cashAfter: Game.persist.cash };
});
check('winning the Big Game gives the Big Game Tee: WEAR, free', won.btn === 'WEAR' && !won.off && won.top === 'tee_hollow' && won.cashAfter === won.cash, won);

const save = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = { ok: r.ok, top: Game.persist.look.top, owned: Object.keys(Game.persist.ownedTops).sort() };
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.look.top; delete raw.persist.ownedTops;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame();
  return { kept, old: { top: Game.persist.look.top, owned: Object.keys(Game.persist.ownedTops || {}).length } };
});
check('a save and load keeps the top you wear and the ones you bought', save.kept.ok && save.kept.top === 'tee_hollow' && save.kept.owned.join() === 'hoodie,tee_shark', save.kept);
check('an old save with no tops wears none', save.old.top === 'none' && save.old.owned === 0, save.old);

// A match still starts and runs with a top on (the player's kid isn't drawn in first person; the allies wear none)
await page.evaluate(() => { Game.persist.look.top = 'hoodie'; });
await g.scenario('bunratty_sean');
await g.spin(120);
check('a match runs with a top worn', await page.evaluate(() => Game.mode === 'scenario'));

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
