// v1.218 (backlog D.29, Michael 13 Oct: "We need an autosave function - I don't remember to go back to the bed every
// time and I doubt most players will either"): a NEW GAME saves itself as it goes, without the bed: coming home,
// after a match, after a buy. The page reloaded, CONTINUE brings it back. NEW GAME over a save asks first.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const saved = () => page.evaluate(() => { try { const r = JSON.parse(localStorage.getItem(SAVE_KEY)); return r && r.persist ? { cash: r.persist.cash, bag: r.persist.bag, done: Object.keys(r.persist.completed || {}).filter(k => r.persist.completed[k]).length } : null; } catch (e) { return 'err'; } });
const home = await saved();
check('a new game is saved as soon as you are home, without sleeping', home && home.cash === await page.evaluate(() => Game.persist.cash), home);
// a match won: its pay is on disk while the result is up, before going home
await g.scenario('winnmark_tutorial');
const noteOn = await page.evaluate(() => { for (const e of Game.scenario.enemies || []) e.health = 0; document.getElementById('autosaveNote').classList.remove('show'); endScenario('win'); return document.getElementById('autosaveNote').classList.contains('show'); });
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 });
const after = await page.evaluate(() => ({ cash: Game.persist.cash, done: Object.keys(Game.persist.completed).filter(k => Game.persist.completed[k]).length }));
const won = await saved();
check('a won match is saved while its result shows (pay and the win on disk)', won && won.cash === after.cash && won.done === after.done && after.cash > home.cash, { after, won });
check('a "Saved" note shows in the corner when it saves', noteOn);
// home, then a buy at the shop: saved at once
await page.evaluate(() => enterBedroom());
await page.evaluate(() => { Game.persist.cash += 20; openShop(); purchaseItem('bbs_100'); closeShop(); });
const bought = await saved(), now = await page.evaluate(() => ({ cash: Game.persist.cash, bag: Game.persist.bag }));
check('a buy at the shop is saved at once', bought && bought.cash === now.cash && bought.bag === now.bag, { now, bought });
// the page reloaded: CONTINUE is offered and brings it all back
await page.reload();
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof stepGame === 'function', null, { timeout: 60000 });
const title = await page.evaluate(() => ({ cont: getComputedStyle(document.getElementById('continueBtn')).display !== 'none', start: document.getElementById('startBtn').textContent }));
check('after a reload the title offers CONTINUE and NEW GAME', title.cont && title.start === 'NEW GAME', title);
await page.evaluate(() => document.getElementById('continueBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
const back = await page.evaluate(() => ({ cash: Game.persist.cash, bag: Game.persist.bag, done: Object.keys(Game.persist.completed).filter(k => Game.persist.completed[k]).length }));
check('CONTINUE brings back the cash, the BBs and the win, though the bed was never used', back.cash === now.cash && back.bag === now.bag && back.done === after.done, back);
// NEW GAME over the save asks first; BACK keeps it, START OVER starts fresh and saves over it
await page.reload();
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof stepGame === 'function', null, { timeout: 60000 });
const ask = await page.evaluate(() => {
  document.getElementById('startBtn').click();
  const r = { asking: getComputedStyle(document.getElementById('newGameAsk')).display !== 'none', mode: Game.mode,
    text: document.querySelector('#newGameAsk .new-game-ask-text').textContent };
  document.getElementById('newGameNoBtn').click();
  r.back = getComputedStyle(document.getElementById('newGameAsk')).display === 'none' && getComputedStyle(document.getElementById('continueBtn')).display !== 'none';
  return r;
});
check('NEW GAME over a save asks first, and nothing has started', ask.asking && ask.mode !== 'bedroom' && ask.mode !== 'mirror', ask);
check('BACK closes the question and CONTINUE is there again', ask.back, ask);
const kept = await saved();
check('the save is untouched after BACK', kept && kept.cash === now.cash, kept);
await page.evaluate(() => { document.getElementById('startBtn').click(); document.getElementById('newGameYesBtn').click(); });
await page.waitForFunction(() => Game.mode === 'mirror' || Game.mode === 'bedroom', null, { timeout: 60000 });
await page.evaluate(() => { if (Game.mode === 'mirror') document.getElementById('mirrorDoneBtn').click(); });
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
const fresh = await saved(), def = await page.evaluate(() => DEFAULT_PERSIST.cash);
check('START OVER starts fresh, and the new game saves over the old one', fresh && fresh.cash === def && fresh.done === 0, { fresh, def });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
