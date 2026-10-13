// v1.197 (D.21 step 1, Michael: C on "A better game" 2): hats. The shop's Clothes tab sells five (two caps, a bucket
// hat, two bandanas) and lists one you win (the Winnmark Cap, for clearing Winnmark Court). Buying one puts it on; a
// row wears or takes off a hat you own, and so does the mirror's Hat row, which shows once you have one. Each is its
// own mesh over the hair, lowered with the head on a crouch, on the mirror's kid and the Loadout kid. Saved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// A new game: no hat, no Hat row at the mirror
const d0 = await page.evaluate(() => {
  openMirror();
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  closeMirror();
  return { hat: Game.persist.look.hat, rows, owned: Object.keys(Game.persist.ownedHats) };
});
check('a new game wears no hat and owns none', d0.hat === 'none' && d0.owned.length === 0, d0);
check('the mirror has no Hat row yet', !d0.rows.includes('hat') && d0.rows.length === 13, d0.rows);   // v1.200: the two crew rows; v1.206: Sneakers

// The shop's Clothes tab
const readShop = () => page.evaluate(() => ({
  tabs: [...document.querySelectorAll('#shopScreen .cat-tab')].map(e => e.textContent),
  headers: [...document.querySelectorAll('#shopScreen .shop-section-header span:first-child')].map(e => e.textContent),
  rows: [...document.querySelectorAll('#shopScreen .shop-hat')].map(r => ({ id: r.dataset.hat,
    name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), price: r.querySelector('.shop-item-price').textContent,
    btn: r.querySelector('.shop-item-buy').textContent, off: r.querySelector('.shop-item-buy').disabled })),
  cash: Game.persist.cash, hat: Game.persist.look.hat, flash: shopState.flash,
}));
await page.evaluate(() => { Game.persist.cash = 14; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click(); });
const s0 = await readShop();
const row = (s, id) => s.rows.find(r => r.id === id);
check('the shop has a fifth tab, Clothes, with Hats', s0.tabs.join() === 'Guns,Ammo,Gear,Mods,Clothes' && s0.headers.join() === 'Hats,Tops,Shorts', s0);   // v1.198: Tops under the hats; v1.199: Shorts
check('six hats: two caps, a bucket hat, two bandanas, the Winnmark Cap',
  s0.rows.map(r => r.name).join() === 'Red Ball Cap,Backwards Cap,Bucket Hat,Red Bandana,Blue Bandana,Winnmark Cap', s0.rows.map(r => r.name));
check('with $14 the bandanas ($10) can be bought and the $15 cap says NEED $15',
  row(s0, 'bandana_red').btn === 'BUY' && !row(s0, 'bandana_red').off && row(s0, 'cap_red').btn === 'NEED $15' && row(s0, 'cap_red').off, s0.rows);
check('the Winnmark Cap is WON, not for sale: EARN IT, greyed', row(s0, 'winnmark_cap').price === 'WON' && row(s0, 'winnmark_cap').btn === 'EARN IT' && row(s0, 'winnmark_cap').off, row(s0, 'winnmark_cap'));

// Buy the red cap with a click: paid, owned, worn; its row says WEARING and TAKE OFF
const clickHat = id => page.evaluate(id => document.querySelector(`#shopScreen .shop-hat[data-hat="${id}"] .shop-item-buy`).click(), id);
await page.evaluate(() => { Game.persist.cash = 100; renderShop(); });
await clickHat('cap_red');
const s1 = await readShop();
check('BUY: $15 paid, the cap is yours and on your head', s1.cash === 85 && s1.hat === 'cap_red' && /Purchased: Red Ball Cap/.test(s1.flash), s1);
check('its row: WEARING, TAKE OFF', row(s1, 'cap_red').btn === 'TAKE OFF', row(s1, 'cap_red'));
await g.shot('hats-shop');
await clickHat('bucket');
await clickHat('cap_red');   // WEAR the cap again over the bucket hat
const s2 = await readShop();
check('buy the bucket hat (it goes on), then WEAR the cap again: one hat on at a time', s2.cash === 65 && s2.hat === 'cap_red' && row(s2, 'bucket').btn === 'WEAR', s2);
await clickHat('cap_red');
check('TAKE OFF leaves you bare-headed', (await readShop()).hat === 'none');
await page.evaluate(() => closeShop());

// The meshes: every hat on every hair style sits over the hair; a crown hides curly puffs; a crouch lowers it
const fit = await page.evaluate(() => {
  const out = [];
  for (const hairStyle of ['short', 'wavy', 'curly', 'long']) for (const id of KID_HAT_ORDER) {
    const bare = createKid({ hairStyle }), kid = createKid({ hairStyle, hat: id });
    bare.group.updateMatrixWorld(true); kid.group.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(kid.hat), hair = new THREE.Box3().setFromObject(bare.parts.hairMesh);
    const head = new THREE.Box3().setFromObject(kid.head);
    const puffsShown = hairStyle === 'curly' ? kid.pose.headExtras.filter(e => e.mesh !== kid.hat && e.mesh.visible).length : null;
    const y0 = kid.hat.position.y; setKidCrouch(kid, 1); const drop = y0 - kid.hat.position.y; const headDrop = 1.26 - kid.head.position.y;
    out.push({ hairStyle, id, kind: KID_HATS[id].kind, wider: hb.max.x - hb.min.x >= hair.max.x - hair.min.x - 1e-6,
      top: +hb.max.y.toFixed(3), hairTop: +hair.max.y.toFixed(3), bottom: +hb.min.y.toFixed(3), headTop: +head.max.y.toFixed(3),
      front: +hb.max.z.toFixed(3), back: +hb.min.z.toFixed(3), puffsShown, drop: +drop.toFixed(3), headDrop: +headDrop.toFixed(3) });
  }
  return out;
});
const bad = (f) => fit.filter(r => !f(r));
check('every hat is at least as wide as the hair under it, on all four hair styles', bad(r => r.wider).length === 0, bad(r => r.wider));
check('caps and bucket hats sit over the hair\'s top and on the head', bad(r => r.kind === 'bandana' || (r.top > r.hairTop && r.bottom < r.headTop + 0.02)).length === 0,
  bad(r => r.kind === 'bandana' || (r.top > r.hairTop && r.bottom < r.headTop + 0.02)));
check('a bandana is a band round the brow, below the hair\'s top', bad(r => r.kind !== 'bandana' || (r.top < r.hairTop && r.bottom < r.headTop)).length === 0, bad(r => r.kind !== 'bandana' || (r.top < r.hairTop && r.bottom < r.headTop)));
const cap = fit.find(r => r.id === 'cap_red' && r.hairStyle === 'short'), back = fit.find(r => r.id === 'cap_back' && r.hairStyle === 'short');
check('the cap\'s bill points forward, the backwards cap\'s back', cap.front > 0.29 && back.back < -0.29 && back.front < 0.2, { cap, back });
check('on curly hair a crown hides the puffs, a bandana leaves them', bad(r => r.hairStyle !== 'curly' || r.puffsShown === (r.kind === 'bandana' ? 3 : 0)).length === 0,
  fit.filter(r => r.hairStyle === 'curly').map(r => [r.id, r.puffsShown]));
check('a full crouch lowers the hat with the head', bad(r => Math.abs(r.drop - r.headDrop) < 3e-3 && r.drop > 0.1).length === 0, bad(r => Math.abs(r.drop - r.headDrop) < 3e-3 && r.drop > 0.1));

// The mirror: a Hat row with None and the two hats you own; it changes the hat on the preview
const mir = await page.evaluate(() => {
  openMirror();
  const opts = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="hat"] .mirror-opt')].map(b => b.textContent);
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="hat"] .mirror-opt')].find(b => b.textContent === 'Bucket Hat').click();
  const r = { opts, hat: Game.persist.look.hat, preview: MIRROR.kid.hat && MIRROR.kid.hat.userData.kidHat,
    on: document.querySelectorAll('#mirrorOptions .mirror-opt.on').length };
  return r;
});
check('the mirror\'s Hat row: None, Red Ball Cap, Bucket Hat', mir.opts.join() === 'None,Red Ball Cap,Bucket Hat', mir.opts);
check('clicking Bucket Hat wears it, on the preview too; one choice lit per row', mir.hat === 'bucket' && mir.preview === 'bucket' && mir.on === 13, mir);   // v1.200: and the crew colour; v1.206: the sneakers
await page.evaluate(() => { MIRROR.kid.group.rotation.y = 0.9; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); });
await g.shot('hats-mirror');
await page.evaluate(() => closeMirror());

// The Loadout kid wears it
const lo = await page.evaluate(() => { openLoadout(); const h = LOADOUT_KID.kid.hat && LOADOUT_KID.kid.hat.userData.kidHat; closeLoadout(); return h; });
check('the Loadout screen\'s kid wears the bucket hat', lo === 'bucket', lo);

// Winning Winnmark Court gives the Winnmark Cap
const won = await page.evaluate(() => {
  Game.persist.completed.winnmark_night_team_2v2 = true;
  openShop(); [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click();
  const b = document.querySelector('#shopScreen .shop-hat[data-hat="winnmark_cap"] .shop-item-buy');
  const r = { btn: b.textContent, off: b.disabled, cash: Game.persist.cash };
  b.click(); closeShop();
  return { ...r, hat: Game.persist.look.hat, cashAfter: Game.persist.cash };
});
check('clearing Winnmark Court gives the Winnmark Cap: WEAR, free', won.btn === 'WEAR' && !won.off && won.hat === 'winnmark_cap' && won.cashAfter === won.cash, won);

// Saved: a save and load keeps them; an old save with no hat fields gets none
const save = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = { ok: r.ok, hat: Game.persist.look.hat, owned: Object.keys(Game.persist.ownedHats).sort() };
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.look.hat; delete raw.persist.ownedHats;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame();
  return { kept, old: { hat: Game.persist.look.hat, owned: Object.keys(Game.persist.ownedHats || {}).length } };
});
check('a save and load keeps the hat you wear and the ones you bought', save.kept.ok && save.kept.hat === 'winnmark_cap' && save.kept.owned.join() === 'bucket,cap_red', save.kept);
check('an old save with no hats wears none', save.old.hat === 'none' && save.old.owned === 0, save.old);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
