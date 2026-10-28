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
// v1.358 (D.77, Michael: C): a new save opens on the four story cards, over the mirror; Enter goes on, the last one leaves
// the mirror; the title's STORY plays them again and Esc skips them
const key = code => page.evaluate(c => document.dispatchEvent(new KeyboardEvent('keydown', { code: c, cancelable: true })), code);
const card = () => page.evaluate(() => ({ open: Story.open, up: document.getElementById('storyScreen').classList.contains('active'), mode: Game.mode,
  head: document.getElementById('storyHead').textContent, btn: document.getElementById('storyNextBtn').textContent, i: Story.i,
  onTop: document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#storyScreen') !== null }));
const c0 = await card();
check('a new game opens on the first story card, over the mirror', c0.open && c0.up && c0.mode === 'mirror' && c0.head === 'Friday, 30 May 2003' && c0.onTop, c0);
for (let k = 0; k < 3; k++) await key('Enter');
const c3 = await card();
check('Enter goes through them to the fourth, which starts the summer', c3.open && c3.i === 3 && /START THE SUMMER/.test(c3.btn) && c3.mode === 'mirror', c3);
await key('Enter');
const c4 = await card();
check('the last one closes the cards and leaves the mirror, still open', !c4.open && !c4.up && c4.mode === 'mirror', c4);
await page.evaluate(() => { if (Game.mode === 'mirror') document.getElementById('mirrorDoneBtn').click(); });
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
const fresh = await saved(), def = await page.evaluate(() => DEFAULT_PERSIST.cash);
check('START OVER starts fresh, and the new game saves over the old one', fresh && fresh.cash === def && fresh.done === 0, { fresh, def });

// v1.357 (D.76, Michael: A): a new save gets a look round the room, a sticky note naming the door, the computer, the
// phone and the bed; walking up to each ticks it; then it says so, goes and is saved as done. X skips it. An old save
// (no roomTour) never sees it.
const tour = () => page.evaluate(() => { const el = document.getElementById('roomTour'), t = Game.persist.roomTour;
  return { shown: el.style.display === 'block', text: el.textContent, ticked: t ? t.ticked.slice() : null, done: t ? !!t.done : null }; });
await g.spin(1);   // the note is drawn by the first step home (CI read it before any step ran)
const t0 = await tour();
check('a new game opens the room with the note naming the phone (Eric\'s text), 0 of 4 (standing at the door ticks nothing)', t0.shown && /0 OF 4/.test(t0.text) && /Eric/.test(t0.text) && !t0.done, t0);
const walkTo = test => page.evaluate(src => { const f = eval(src), it = Game.interactables.find(f);
  Game.player.pos.x = it.pos.x; Game.player.pos.z = it.pos.z; stepGame(1 / 60); return it.label; }, test);
await walkTo('it => it.icon === "bed"');
const t1 = await tour();
check('walking up to the bed ticks it, and the note still names the phone first', t1.ticked.join() === 'bed' && /1 OF 4/.test(t1.text) && /Eric/.test(t1.text), t1);
for (const f of ['it => it.icon === "computer"', 'it => it.icon === "phone"']) await walkTo(f);
const t2a = await tour();
check('the three looked at, the note names the front door', t2a.ticked.length === 3 && /front door/.test(t2a.text) && /3 OF 4/.test(t2a.text), t2a);
await walkTo('it => it.label === "Outside"');
const t2b = await tour();
check('walking up to the door is not enough', t2b.ticked.length === 3, t2b);
// v1.374 (Found in play, critic v1.372): the note stayed up over the map, the briefing, the match and the result card
const onMap = await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); stepGame(1 / 60);
  return { mode: Game.mode, shown: document.getElementById('roomTour').style.display === 'block' }; });
check('out of the door, the map is open and the note is gone from over it (v1.374)', onMap.mode === 'map' && !onMap.shown, onMap);
await page.evaluate(() => { closeMap(); stepGame(1 / 60); });
const t2 = await tour();
check('all four ticked, it says that is your room', t2.shown && t2.ticked.length === 4 && /That’s your room/.test(t2.text), t2);
await g.spin(310);
const t3 = await tour(), t3disk = await page.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)).persist.roomTour);
check('five seconds later the note is gone, done on the save', !t3.shown && t3.done && t3disk && t3disk.done === true, { t3, t3disk });
const t4 = await page.evaluate(() => { Game.persist.roomTour = { ticked: [] }; stepGame(1 / 60); const on = document.getElementById('roomTour').style.display;
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' })); stepGame(1 / 60);
  const t = Game.persist.roomTour; delete Game.persist.roomTour; stepGame(1 / 60);
  return { on, skipped: t.done, off: document.getElementById('roomTour').style.display, old: document.getElementById('roomTour').style.display }; });
check('X skips it; a save with no tour (one from before v1.357) shows no note', t4.on === 'block' && t4.skipped === true && t4.off === 'none', t4);

const replay = await page.evaluate(() => { document.getElementById('titleStoryBtn').click(); return Story.open; });
await key('Escape');
const skipped = await card();
check('the title\'s STORY plays them again, and Esc skips them', replay && !skipped.open && !skipped.up, { replay, skipped });

// v1.374: a tour not yet done stays off the briefing and the match, and comes back home
await page.evaluate(() => { Game.persist.roomTour = { ticked: [] }; });
await g.scenario('winnmark_seth_house');
await g.spin(2);
const inMatch = await page.evaluate(() => ({ mode: Game.mode, shown: document.getElementById('roomTour').style.display === 'block' }));
check('a new save\'s tour, not yet done: no note in a match (v1.374)', inMatch.mode === 'scenario' && !inMatch.shown, inMatch);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
