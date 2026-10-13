// v1.206 (D.21 shoes, Michael: A on "Shoes as looks, when shoes are already gear?"): a free Sneakers row at the mirror,
// six colours for the plain pair you wear when no gear pair is on; the gear pairs keep their own look. Saved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(5);

// A new game: the row sits under Shorts/Pants, six swatches, the pair you have on lit
const d0 = await page.evaluate(() => {
  openMirror();
  const q = key => [...document.querySelectorAll(`#mirrorOptions .mirror-row[data-key="${key}"] .mirror-opt`)];
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  const sw = q('shoeColor');
  return { rows, n: sw.length, label: document.querySelector('#mirrorOptions .mirror-row[data-key="shoeColor"] div').textContent,
    lit: sw.filter(b => b.classList.contains('on')).map(b => +b.dataset.value), saved: Game.persist.look.shoeColor,
    wearing: MIRROR.kid.pose.shoeL.material.color.getHex(), colors: KID_SNEAKER_COLORS.slice() };
});
check('the mirror has a Sneakers row, after the Pants and before the Glasses, with six colours', d0.label === 'Sneakers' && d0.n === 6
  && d0.rows.indexOf('shoeColor') > d0.rows.indexOf('pantsColor') && d0.rows.indexOf('shoeColor') === d0.rows.indexOf('glasses') - 1, d0);
check('a new game has picked none, and the pair it has on is the one lit', d0.saved === undefined && d0.lit.length === 1 && d0.lit[0] === d0.wearing, d0);

// Pick each colour: the preview wears it, it is lit alone, nothing else on the kid changes
const picks = await page.evaluate(() => {
  const out = [];
  const before = JSON.stringify(Object.assign({}, Game.persist.look, { shoeColor: undefined }));
  for (let i = 0; i < 6; i++) {
    [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="shoeColor"] .mirror-opt')][i].click();
    const lit = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="shoeColor"] .mirror-opt.on')].map(b => +b.dataset.value);
    out.push({ want: KID_SNEAKER_COLORS[i], saved: Game.persist.look.shoeColor, l: MIRROR.kid.pose.shoeL.material.color.getHex(),
      r: MIRROR.kid.pose.shoeR.material.color.getHex(), lit });
  }
  const after = JSON.stringify(Object.assign({}, Game.persist.look, { shoeColor: undefined }));
  return { out, same: before === after };
});
check('each of the six swatches puts that colour on both sneakers, and only it is lit',
  picks.out.every(p => p.saved === p.want && p.l === p.want && p.r === p.want && p.lit.length === 1 && p.lit[0] === p.want), picks.out);
check('nothing else in the look changes', picks.same);
await page.evaluate(() => { MIRROR.kid.group.rotation.y = 0.5; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); });
await g.shot('sneakers-mirror');

// Red, then the Loadout kid: red sneakers with no gear pair; Track Spikes keep their own orange
const lo = await page.evaluate(() => {
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="shoeColor"] .mirror-opt')][4].click();
  closeMirror();
  openLoadout(); const plain = LOADOUT_KID.kid.pose.shoeL.material.color.getHex(); closeLoadout();
  Game.persist.ownedEquipment.shoes.track_spikes = true; equipShoes('track_spikes');
  openLoadout(); const spikes = LOADOUT_KID.kid.pose.shoeL.material.color.getHex(); closeLoadout();
  equipShoes('none');
  return { plain, spikes, red: KID_SNEAKER_COLORS[4], orange: LOADOUT_GEAR_SHOES.track_spikes.upper };
});
check('the Loadout kid wears the red sneakers; with Track Spikes on he wears the spikes\' own orange',
  lo.plain === lo.red && lo.spikes === lo.orange, lo);

// Kids in a match keep the colour the game picks for them
const kids = await page.evaluate(() => Object.values(CHARACTERS).slice(0, 8).map(ch => {
  const k = createKid(Object.assign({}, ch), 'pistol'); return k.pose.shoeL.material.color.getHex() === kidShoeColor(ch);
}));
check('other kids keep the sneakers the game picks', kids.every(Boolean), kids);

// Saved: a save and load keeps the colour; an old save has none and wears the picked pair
const save = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = { ok: r.ok, shoe: Game.persist.look.shoeColor };
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.look.shoeColor;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame();
  return { kept, red: KID_SNEAKER_COLORS[4], old: Game.persist.look.shoeColor, oldWears: lookShoeColor(Game.persist.look),
    oldPicked: kidShoeColor(Object.assign({}, Game.persist.look)) };
});
check('a save and load keeps the red sneakers', save.kept.ok && save.kept.shoe === save.red, save.kept);
check('an old save has no colour picked and wears the pair the game picks', save.old === undefined && save.oldWears === save.oldPicked, save);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
