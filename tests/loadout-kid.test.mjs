// v1.132: the Loadout screen's kid (backlog D.5 C step 1, Michael: A). Opens the screen and checks the panel shows your
// kid with the slot-1 gun in its hands, turning as the game steps, with a line from each body part to what it wears;
// equipping gear changes the labels and swapping the gun re-builds the kid with the new gun, for every gun.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const open = await page.evaluate(() => {
  openLoadout();
  const L = LOADOUT_KID, c = document.getElementById('loKidCanvas'), r = c.getBoundingClientRect();
  const texts = [...document.querySelectorAll('#loKidLabels text[data-key]')].map(t => [t.dataset.key, t.textContent]);
  return { mode: Game.mode, kid: !!L.kid, gun: L.gun, equipped: Game.persist.equipped.gun, w: Math.round(r.width), h: Math.round(r.height),
    texts: Object.fromEntries(texts), lines: document.querySelectorAll('#loKidLabels line').length,
    inside: L.labels.every(l => l.x > 0 && l.x < 280 && l.y > 0 && l.y < 380) };
});
check('the Loadout screen opens with a kid panel (280 × 380)', open.mode === 'loadoutMgr' && open.kid && open.w === 280 && open.h === 380, open);
check('the kid holds the slot-1 gun', open.gun === open.equipped, open);
check('seven body parts each have a line and a label', open.lines === 7 && Object.keys(open.texts).length === 7, open);
check('a new save: no eye pro, no armour, default sneakers, no belt, the pistol',
  open.texts.eyes === 'No Eye Pro' && open.texts.chest === 'nothing' && open.texts.feet === 'Sneakers (default)'
  && open.texts.belt === 'nothing' && /Pistol/i.test(open.texts.gun), open.texts);
check('every body-part point lands on the canvas', open.inside, open);

// turning: stepping the game turns the kid and moves the leader lines with it
const turn = await page.evaluate(() => {
  const L = LOADOUT_KID, y0 = L.kid.group.rotation.y, x0 = L.labels.find(l => l.key === 'chest').x;
  for (let i = 0; i < 120; i++) stepGame(1 / 60);
  return { y0, y1: L.kid.group.rotation.y, x0, x1: L.labels.find(l => l.key === 'chest').x };
});
check('the kid turns as the game steps (2 s)', Math.abs(turn.y1 - turn.y0) > 0.2, turn);
check('the chest line follows the kid', Math.abs(turn.x1 - turn.x0) > 1, turn);

// gear: own and equip goggles, the heavy vest, knee pads, trail runners and the belt; the labels follow
const gear = await page.evaluate(() => {
  const P = Game.persist;
  P.ownedEquipment.eyewear.goggles_amber = true; P.ownedEquipment.armor.chest_light = true; P.ownedEquipment.armor.knee_pads = true;
  P.ownedEquipment.shoes.trail_shoes = true;
  equipEyewear('goggles_amber'); equipShoes('trail_shoes'); P.equipped.armor.chest = 'chest_light'; P.equipped.armor.legs = 'knee_pads';
  renderLoadoutManager();
  return Object.fromEntries([...document.querySelectorAll('#loKidLabels text[data-key]')].map(t => [t.dataset.key, t.textContent]));
});
check('equipped gear shows on its body part', gear.eyes === 'Ski Goggles' && gear.chest === 'Foam Chest Rig' && gear.legs === 'Knee Pads'
  && gear.feet === 'Trail Runners' && gear.arms === 'nothing', gear);
await g.shot('loadout-kid');

// every gun: swapping it re-builds the kid with that gun in its hands, without errors
const guns = await page.evaluate(() => {
  const out = [];
  for (const type of ['pistol', 'mp5', 'ump', 'ak47', 'shotgun', 'sniper', 'mac10', 'ar']) {
    let spec = null; try { spec = getGunSpec(type); } catch (e) {}
    if (!spec) continue;
    Game.persist.equipped.gun = type;
    renderLoadoutManager();
    const t = document.querySelector('#loKidLabels text[data-key="gun"]').textContent;
    out.push({ type, kidGun: LOADOUT_KID.gun, label: t, name: spec.displayName });
  }
  Game.persist.equipped.gun = 'pistol'; renderLoadoutManager();
  closeLoadout();
  return out;
});
check('every gun: the kid is re-built holding it, and HANDS names it', guns.length >= 6 && guns.every(x => x.kidGun === x.type && x.label === x.name), guns);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
