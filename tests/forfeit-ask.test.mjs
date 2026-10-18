// v1.208 (backlog B.8, Michael 13 Oct): F no longer forfeits at once. It pauses the match and asks; Enter, Y or
// FORFEIT ends it as before, Esc, N, F again or KEEP PLAYING go back to it. Paused means nothing moves: the round's
// clock, the player and every kid stand still, and keys held or pressed meanwhile do nothing.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_sean');
// nothing tags you in this test, so the round lasts through every way of closing the question
// v1.220 fix-up: set before the spin, not after; Sean tagged the standing player at 3.28 s, inside the 3.33 s spin
await page.evaluate(() => { Game.player._graceT = 1e9; });
await g.spin(200);   // past the opening hold, so the kids are moving

const snap = () => page.evaluate(() => ({
  mode: Game.mode, asking: !!Game.forfeitAsk,
  shown: document.getElementById('forfeitAsk').classList.contains('active'),
  t: Game.scenario?.roundTime,
  p: [Game.player.pos.x, Game.player.pos.z],
  kids: (Game.scenario?.enemies || []).map(e => [e.pos.x, e.pos.z]),
  ai: (Game.scenario?.enemies || []).map(e => [e.state, +(e.stateTime || 0).toFixed(3)]),
  outcome: document.getElementById('outcomeText').textContent.trim(),
}));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// F asks and pauses
await page.keyboard.press('f');
const a0 = await snap();
check('F asks: the question is up and the match is still on', a0.asking && a0.shown && a0.mode === 'scenario', a0);
await g.shot('forfeit-ask');
await page.keyboard.down('w');
await page.keyboard.press('Space');
await g.spin(180);
await page.keyboard.up('w');
const a1 = await snap();
check('3 s of steps while it asks: the round clock stands still', a1.t === a0.t, [a0.t, a1.t]);
check('the player stays put with W held and Space pressed', same(a0.p, a1.p), [a0.p, a1.p]);
check('every kid stays put, his state clock too', same(a0.kids, a1.kids) && same(a0.ai, a1.ai), [a0.ai, a1.ai]);
check('still asking, still in the match', a1.asking && a1.mode === 'scenario');

// Each way back to the match
for (const [how, act] of [
  ['Esc', () => page.keyboard.press('Escape')],
  ['N', () => page.keyboard.press('n')],
  ['F again', () => page.keyboard.press('f')],
  ['KEEP PLAYING', () => page.evaluate(() => document.getElementById('forfeitKeepBtn').click())],
]) {
  if (!(await snap()).asking) await page.keyboard.press('f');
  const before = await snap();
  await act();
  const mid = await snap();
  await g.spin(60);
  const after = await snap();
  check(`${how} closes it and the match goes on`, before.asking && !mid.asking && !mid.shown && after.mode === 'scenario'
    && after.t > mid.t + 0.9, { before: before.asking, mid: mid.asking, t: [mid.t, after.t], mode: after.mode });
}
// Fix-up (PR #75, CI on 698e66a): one snapshot can catch Sean holding a spot in cover the whole time since the
// question closed, so he gets up to 10 s more to move (the clock check above already shows the match runs).
// 18 Oct fix-up: or their AI runs again. Sean can hold one spot in cover over 10 s (CI 86d93e2; 2 runs in 6 locally,
// before v1.271 as after), but his state clock only stands still while the match is paused.
let moved = await snap();
const still = m => same(a1.kids, m.kids) && same(a1.ai, m.ai);
for (let i = 0; i < 10 && still(moved); i++) { await g.spin(60); moved = await snap(); }
check('the kids move again after it closes (or their state clock runs)', !still(moved), { kids: same(a1.kids, moved.kids), ai: [a1.ai, moved.ai] });

// A second F a moment later asks again (no forfeit by double-tapping)
await page.keyboard.press('f'); await page.keyboard.press('f'); await page.keyboard.press('f');
const tri = await snap();
check('F, F, F asks, closes, asks: still in the match', tri.mode === 'scenario' && tri.asking, tri.mode);

// A round that ends some other way while it asks takes the question down
await page.evaluate(() => endScenario('win'));
const won = await snap();
check('a round ending while it asks closes the question', won.mode === 'result' && !won.asking && !won.shown, won);
check('F on the result screen asks nothing', await page.keyboard.press('f').then(snap).then(s => !s.asking && !s.shown));

// Enter forfeits
await page.evaluate(() => enterBedroom()); await g.spin(5);
await g.scenario('bunratty_sean'); await g.spin(30);
await page.keyboard.press('f');
await page.keyboard.press('Enter');
const e1 = await snap();
check('F then Enter forfeits', e1.mode === 'result' && e1.outcome === 'FORFEITED' && !e1.shown, e1.outcome);

// Y forfeits, and so does the FORFEIT button
for (const [how, act] of [
  ['Y', () => page.keyboard.press('y')],
  ['FORFEIT', () => page.evaluate(() => document.getElementById('forfeitYesBtn').click())],
]) {
  await page.evaluate(() => enterBedroom()); await g.spin(5);
  await g.scenario('bunratty_sean'); await g.spin(30);
  await page.keyboard.press('f');
  await act();
  const s = await snap();
  check(`F then ${how} forfeits`, s.mode === 'result' && s.outcome === 'FORFEITED' && !s.asking, s.outcome);
}
await page.evaluate(() => enterBedroom()); await g.spin(5);
check('F in the bedroom asks nothing', await page.keyboard.press('f').then(snap).then(s => !s.asking && !s.shown));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
