// v1.239 (backlog D.39, Michael 14 Oct: "Can we make the pause menu more obvious / auto-open when hitting escape?").
// Before v1.239 Escape in a match only let go of the mouse: the match ran on behind a small "Click to capture mouse"
// note and there was no menu. Now letting go of the mouse in a match (Escape, alt-tab) or Escape with it already free
// opens PAUSED and the match stops; RESUME or Escape goes back, SETTINGS opens over it, FORFEIT asks the forfeit question.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_sean');
await page.evaluate(() => { Game.player._graceT = 1e9; });
await g.spin(200);   // past the opening hold, so the kids are moving

const snap = () => page.evaluate(() => ({
  mode: Game.mode, paused: !!Game.paused, asking: !!Game.forfeitAsk,
  shown: document.getElementById('pauseMenu').classList.contains('active'),
  visible: (() => { const el = document.getElementById('pauseMenu'); return el.classList.contains('active') && getComputedStyle(el).display !== 'none'; })(),
  settings: document.getElementById('settingsScreen').classList.contains('active'),
  hint: document.getElementById('pauseHint').style.display,
  t: Game.scenario?.roundTime,
  kids: (Game.scenario?.enemies || []).map(e => [+e.pos.x.toFixed(3), +e.pos.z.toFixed(3)]),
}));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = () => page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })));
const wait = ms => page.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);

// 1) the mouse let go (what Escape does to a held mouse): the menu opens and the match stops
const a0 = await page.evaluate(async () => {
  const real = document.pointerLockElement === Game.renderer.domElement;
  Game.mouse.locked = true;   // as g.scenario marks it
  if (real) {   // the page took the lock at BEGIN: let go of it, as Escape does
    await new Promise(r => { document.addEventListener('pointerlockchange', r, { once: true }); document.exitPointerLock(); });
  } else document.dispatchEvent(new Event('pointerlockchange'));   // no real lock: the change reads as let go
  return { real, locked: Game.mouse.locked };
});
console.log('   lock', JSON.stringify(a0));
const p1 = await snap();
check('letting go of the mouse in a match opens PAUSED', !a0.locked && p1.paused && p1.visible && p1.mode === 'scenario', p1);
check('no "click to capture" note over it', p1.hint === 'none', p1.hint);
// the same Escape arriving as a key straight after does not close it (stamped now: the test's round trips are slow)
await page.evaluate(() => { Game._pausedAt = performance.now(); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); });
check('the Escape that let go of the mouse, arriving as a key at once, leaves it open', (await snap()).paused);
await g.shot('pause-menu');
await g.spin(180);
const p2 = await snap();
check('3 s of steps while paused: the clock and every kid stand still', p2.t === p1.t && same(p2.kids, p1.kids), { t: [p1.t, p2.t] });

// 2) RESUME goes back
await page.evaluate(() => document.getElementById('pauseResumeBtn').click());
const r1 = await snap();
await g.spin(60);
const r2 = await snap();
check('RESUME closes it and the match goes on', !r1.paused && !r1.shown && r2.t > r1.t + 0.9, { r1, t: r2.t });

// 3) Escape with the mouse already free opens it; Escape again (a moment later) closes it
await esc();
const e1 = await snap();
check('Escape in a match opens it', e1.paused && e1.visible, e1);
await wait(350);
await esc();
const e2 = await snap();
check('Escape again goes back to the match', !e2.paused && !e2.shown && e2.mode === 'scenario', e2);

// 4) SETTINGS opens over it; their Escape closes them and leaves the match paused
await esc(); await wait(350);
await page.evaluate(() => document.getElementById('pauseSettingsBtn').click());
const s1 = await snap();
check('SETTINGS opens the settings over the pause menu', s1.settings && s1.paused, s1);
await esc();
const s2 = await snap();
await g.spin(60);
const s3 = await snap();
check('Escape closes the settings: back on PAUSED, still in the match, still stopped', !s2.settings && s2.paused && s2.visible
  && s2.mode === 'scenario' && s3.t === s2.t, { s2, t: s3.t });

// 5) FORFEIT asks the question; keep playing goes back to the match
await page.evaluate(() => document.getElementById('pauseForfeitBtn').click());
const f1 = await snap();
check('FORFEIT asks the forfeit question instead', !f1.paused && f1.asking && f1.mode === 'scenario', f1);
await page.evaluate(() => document.getElementById('forfeitKeepBtn').click());
await g.spin(30);
const f2 = await snap();
check('KEEP PLAYING: the match goes on', !f2.asking && !f2.paused && f2.t > f1.t, f2);

// 6) F from the pause menu asks too, and a round that ends closes the menu
await esc(); await wait(350);
await page.keyboard.press('f');
const k1 = await snap();
check('F on the pause menu asks the forfeit question', k1.asking && !k1.paused, k1);
await page.keyboard.press('Enter');
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const end = await snap();
check('the forfeit ends the match, nothing left open', end.mode === 'result' && !end.paused && !end.shown, end);

// 7) The bedroom: Escape there opens nothing (nothing runs to stop)
await page.evaluate(() => document.getElementById('returnBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; document.dispatchEvent(new Event('pointerlockchange')); });
await esc();
const b1 = await snap();
check('in the bedroom it does not open', !b1.paused && !b1.shown && b1.mode === 'bedroom', b1);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
