// v1.242 (backlog D.38, step 2): the screens between matches by pad. v1.241 made a pad play a match; every screen
// around it (title, mirror, settings, briefing, pause, result, shop) still wanted the mouse. Now, while the pad is in
// use and a screen is up, a cursor shows: the d-pad jumps it to the next clickable thing that way, the left stick moves
// it, A clicks, B goes back, the right stick scrolls, the d-pad's left and right step a slider. The pad is a stand-in
// for navigator.getGamepads().
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

await page.evaluate(() => {
  window.__pad = { buttons: Array(17).fill(0), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [{ id: 'test pad', connected: true, mapping: 'standard', index: 0,
    axes: window.__pad.axes.slice(), buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })) }];
});
const B = { A: 0, B: 1, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const btn = (i, v) => page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [i, v]);
const axes = (a) => page.evaluate(a => { window.__pad.axes = a; }, a);
// the title has no match running, so step the pad by hand there; elsewhere g.spin does (both call stepGame)
const spin = (n) => page.evaluate(n => { for (let i = 0; i < n; i++) stepGame(1 / 60); }, n);
const tap = async (i) => { await btn(i, 1); await spin(2); await btn(i, 0); await spin(2); };
const S = () => page.evaluate(() => ({
  mode: Game.mode, shown: PadCursor.shown, x: PadCursor.x, y: PadCursor.y,
  hover: PadCursor.hover ? (PadCursor.hover.id || PadCursor.hover.tagName + '.' + PadCursor.hover.className) : null,
  hoverType: PadCursor.hover?.type || null, outlined: !!PadCursor.hover?.classList.contains('pad-hover'),
  settings: document.getElementById('settingsScreen').classList.contains('active'),
  paused: !!Game.paused, asking: !!Game.forfeitAsk,
}));
async function seek(pred, label) {   // d-pad round the screen until the cursor is on what we want
  const dirs = [B.DOWN, B.DOWN, B.DOWN, B.DOWN, B.RIGHT, B.RIGHT, B.UP, B.UP, B.UP, B.UP, B.UP, B.UP, B.LEFT, B.LEFT,
                B.DOWN, B.DOWN, B.DOWN, B.DOWN, B.DOWN, B.DOWN, B.DOWN, B.DOWN];
  let s = await S();
  for (const d of dirs) { if (pred(s)) return s; await tap(d); s = await S(); }
  console.log('   seek', label, 'ended on', JSON.stringify(s));
  return s;
}

// 1) the title: no cursor until the pad is touched; then one, on something clickable
const t0 = await S();
check('on the title no cursor shows before the pad is used', t0.mode === 'title' && !t0.shown, t0);
await tap(B.DOWN);
const t1 = await S();
check('the pad touched on the title: the cursor shows, on something clickable, outlined', t1.shown && t1.hover && t1.outlined, t1);
const t2 = await seek(s => s.hover === 'startBtn', 'NEW GAME');
check('the d-pad reaches NEW GAME', t2.hover === 'startBtn', t2.hover);
await tap(B.A);
await page.waitForFunction(() => Game.mode === 'mirror' || Game.mode === 'bedroom', null, { timeout: 60000 });
const m1 = await S();
check('A on NEW GAME starts it (the mirror opens)', m1.mode === 'mirror', m1.mode);
await spin(2);
check('the cursor stays up on the mirror', (await S()).shown);
// v1.358 (D.77): a new save's story cards lie over the mirror; the first B skips them, the second is the mirror's DONE
await tap(B.B);
await spin(2);
const sk = await page.evaluate(() => ({ story: Story.open, mode: Game.mode }));
check('B skips the story cards over the mirror, and the mirror stays', !sk.story && sk.mode === 'mirror', sk);
await tap(B.B);
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
await spin(2);
const r1 = await S();
check('B on the mirror is DONE: the bedroom, and no cursor there', r1.mode === 'bedroom' && !r1.shown, r1);

// 2) Start in the bedroom opens the settings; the d-pad steps a slider; B closes them
await tap(B.START);
const st1 = await S();
check('Start in the bedroom opens the settings, with the cursor', st1.settings && st1.shown, st1);
const st2 = await seek(s => s.hoverType === 'range', 'a slider');
const v0 = await page.evaluate(() => ({ v: +PadCursor.hover.value, key: PadCursor.hover.dataset.key, set: Settings[PadCursor.hover.dataset.key] }));
await tap(B.LEFT);   // (left first: a slider can start at its top)
const v1 = await page.evaluate(k => Settings[k], v0.key);
check('the d-pad left steps the slider the cursor is on, and the setting takes it', st2.hoverType === 'range' && v1 < v0.set, { key: v0.key, before: v0.set, after: v1 });
await tap(B.RIGHT);
const v2 = await page.evaluate(k => Settings[k], v0.key);
check('and right steps it back', Math.abs(v2 - v0.set) < 1e-9, v2);
await tap(B.B);
const st3 = await S();
check('B closes the settings', !st3.settings && st3.mode === 'bedroom' && !st3.shown, st3);

// 3) the shop: the right stick scrolls, B closes it
await page.evaluate(() => openShop());
await spin(2);
const sh0 = await S();
check('the shop: the cursor shows', sh0.shown && sh0.mode !== 'bedroom', sh0);
const sc0 = await page.evaluate(() => { const els = [...document.querySelectorAll('*')].filter(e => e.scrollTop > 0); return els.length; });
await axes([0, 0, 0, 1]);
await spin(30);
await axes([0, 0, 0, 0]);
const sc1 = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.scrollTop > 0).map(e => [e.id || e.className, e.scrollTop]));
check('the right stick scrolls the shop', sc0 === 0 && sc1.length > 0, sc1);
await tap(B.B);
await spin(2);
check('B closes the shop', (await S()).mode === 'bedroom');

// 4) a briefing: A on BEGIN starts the match, and the cursor goes
await page.evaluate(() => { isScenarioUnlocked = () => true; enterScenario('bunratty_sean'); });
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
await spin(2);
const br = await seek(s => s.hover === 'introBeginBtn', 'BEGIN');
await tap(B.A);
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = false; Game.player._graceT = 1e9; });
await spin(4);
const sc = await S();
check('A on BEGIN starts the match; no cursor in play', br.hover === 'introBeginBtn' && sc.mode === 'scenario' && !sc.shown, { br: br.hover, sc });

// 5) the pause menu: Start, the cursor, FORFEIT by d-pad and A, then A forfeits
await tap(B.START);
const p1 = await S();
check('Start pauses, and the cursor shows on the menu', p1.paused && p1.shown && p1.hover, p1);
const p2 = await seek(s => s.hover === 'pauseForfeitBtn', 'FORFEIT');
await tap(B.A);
const p3 = await S();
check('A on FORFEIT asks the forfeit question', p2.hover === 'pauseForfeitBtn' && p3.asking, { hover: p2.hover, asking: p3.asking });
await tap(B.A);
await spin(4);
const res = await S();
check('A there forfeits: the result, with the cursor', res.mode === 'result' && res.shown, res);

// 6) the left stick moves the cursor; A on BACK TO YOUR ROOM goes home
await g.shot('gamepad-cursor');
const c0 = await S();
await axes([1, 0, 0, 0]);
await spin(15);
await axes([0, 0, 0, 0]);
const c1 = await S();
console.log('   0.25 s of full left stick moved the cursor', Math.round(c1.x - c0.x), 'px');
check('the left stick moves the cursor (about 275 px in 0.25 s)', c1.x - c0.x > 150 || c1.x >= 1279 - 1, { from: c0.x, to: c1.x });
const home = await seek(s => s.hover === 'returnBtn', 'BACK TO YOUR ROOM');
await tap(B.A);
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 }).catch(() => {});
check('A on BACK TO YOUR ROOM goes home', home.hover === 'returnBtn' && (await S()).mode === 'bedroom', home.hover);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
