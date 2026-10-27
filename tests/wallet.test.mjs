// v1.260 (backlog D.43, Michael 15 Oct: show your $ in a match, and on the screens when you've been tagged out, won or
// are about to start one; the same for BBs). Checked: the briefing says your cash, the BBs in your bag and what your gun
// will load at BEGIN (red when the bag can't fill it); in the match the ammo box says your cash under the bag; the result
// screen, won or lost, says your cash after the pay and the bag after the gun is unloaded.
// v1.323 (backlog B.14): a spare mag in a slot is kept. It loads from the bag at BEGIN, the swap trades mags (the pulled
// one keeps its BBs in the slot), whatever is left goes back in the bag at the end, and the next match fills it again.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'winnmark_seth_house';
const brief = async (bag) => {
  await page.evaluate(([bag, id]) => { Game.persist.cash = 37; Game.persist.bag = bag; isScenarioUnlocked = () => true; enterScenario(id); }, [bag, ID]);
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  return page.evaluate(() => { const w = document.getElementById('introWallet'); return { text: w.textContent, low: !!w.querySelector('.wallet-low'), shown: w.offsetParent !== null, mag: getMaxAmmoForGun(Game.persist.equipped.gun) }; });
};
const b1 = await brief(23);
check('the briefing shows your cash, your bag and what your gun loads', b1.shown && /CASH\$37/.test(b1.text) && /BAG23/.test(b1.text) && new RegExp('LOADS ' + b1.mag).test(b1.text) && !b1.low, b1);
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await g.spin(5);
const hud = await page.evaluate(() => ({ cash: document.getElementById('hudCash').textContent, box: document.getElementById('ammoHud').style.display, bag: Game.persist.bag, ammo: Game.gun.ammo }));
check('in the match the ammo box shows your cash', hud.box === 'block' && hud.cash === 'Cash: $37', hud);
const won = await page.evaluate(() => { endScenario('win'); const w = document.getElementById('resultWallet'); return { text: w.textContent, shown: w.offsetParent !== null, cash: Game.persist.cash, bag: Game.persist.bag }; });
check('won: the result screen shows your cash after the pay and your bag after unloading', won.shown && won.cash > 37 && won.text.includes('$' + won.cash) && won.text.includes('BAG' + won.bag) && won.bag === 23, won);
await page.evaluate(() => enterBedroom());
const b2 = await brief(4);
check('a bag that can\'t fill the gun shows red on the briefing', b2.low && /BAG4/.test(b2.text), b2);
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
const lost = await page.evaluate(() => { endScenario('lose'); const w = document.getElementById('resultWallet'); return { text: w.textContent, shown: w.offsetParent !== null, cash: Game.persist.cash, bag: Game.persist.bag }; });
check('tagged out: the result screen shows them too', lost.shown && lost.text.includes('$' + lost.cash) && lost.text.includes('BAG' + lost.bag), lost);
// v1.323 (B.14): the spare mag
const spareRound = async (bag) => {
  await page.evaluate(([bag, id]) => {
    enterBedroom(); Game.persist.equipped.gun = 'pistol'; Game.persist.consumables.spare_mag_10 = 1;
    Game.persist.loadoutSlots[1] = { kind: 'spare_mag', refId: 'spare_mag_10' }; Game.persist.bag = bag; enterScenario(id);
  }, [bag, ID]);
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  await page.evaluate(() => document.getElementById('introBeginBtn').click());
  await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
  return page.evaluate(() => ({ ammo: Game.gun.ammo, max: Game.gun.maxAmmo, spare: Game.gun.spareAmmo[1], bag: Game.persist.bag }));
};
const swap = async () => {
  await page.evaluate(() => { Game.held.slotIdx = 1; Game.mouseLMB = true; onLmbDown(); });
  await g.spin(30);
  return page.evaluate(() => { Game.mouseLMB = false; onLmbUp(); return { ammo: Game.gun.ammo, spare: Game.gun.spareAmmo[1], slot: Game.persist.loadoutSlots[1], owned: Game.persist.consumables.spare_mag_10, held: Game.held.slotIdx }; });
};
const s1 = await spareRound(100);
check('BEGIN loads the gun, then the spare mag, from the bag', s1.ammo === s1.max && s1.spare === Math.min(10, s1.max) && s1.bag === 100 - s1.ammo - s1.spare, s1);
await page.evaluate(() => { Game.gun.ammo = 3; });
const w1 = await swap();
check('the swap loads the spare\'s BBs; the pulled mag keeps its 3 in the slot, and the spare mag is still yours', w1.ammo === s1.spare && w1.spare === 3 && w1.slot && w1.slot.kind === 'spare_mag' && w1.owned === 1 && w1.held === 0, w1);
const end1 = await page.evaluate(() => { endScenario('win'); return { bag: Game.persist.bag, slot: Game.persist.loadoutSlots[1], owned: Game.persist.consumables.spare_mag_10 }; });
check('at the end every BB left goes back in the bag, and the mag stays in its slot', end1.bag === 100 - s1.ammo - s1.spare + w1.ammo + 3 && end1.slot && end1.owned === 1, { end1, s1, w1 });
const s2 = await spareRound(end1.bag);
check('the next match fills the spare mag again', s2.spare === s1.spare && s2.bag === end1.bag - s2.ammo - s2.spare, s2);
await page.evaluate(() => { Game.gun.spareAmmo[1] = 0; Game.gun.ammo = 2; });
const w2 = await swap();
check('an empty spare mag dry-clicks and swaps nothing', w2.ammo === 2 && w2.spare === 0 && w2.slot, w2);
await page.evaluate(() => endScenario('lose'));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
