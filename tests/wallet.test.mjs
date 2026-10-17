// v1.260 (backlog D.43, Michael 15 Oct: show your $ in a match, and on the screens when you've been tagged out, won or
// are about to start one; the same for BBs). Checked: the briefing says your cash, the BBs in your bag and what your gun
// will load at BEGIN (red when the bag can't fill it); in the match the ammo box says your cash under the bag; the result
// screen, won or lost, says your cash after the pay and the bag after the gun is unloaded.
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
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
