// v1.90 (Found in play, v1.86): a round ends once. Delayed endings (the win 600 ms after the last kill,
// the timer win, the tagger's infection) used to fire even after the round had already ended another
// way, so the result flipped YOU'RE OUT → YOU GOT THEM and paid both. Each case sets up the race the
// critic found and counts endScenario calls and payouts.
// The delays are the game's own setTimeouts (wall-clock), so this test waits real time for them.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

async function race(id, setup) {
  await g.scenario(id);
  await page.evaluate(() => {
    window.__ends = [];
    const orig = window.__origEnd = window.__origEnd || endScenario;
    window.endScenario = function (o) { window.__ends.push({ o, mode: Game.mode }); return orig.apply(this, arguments); };
    window.__cash0 = Game.persist.cash;
  });
  await page.evaluate(setup);
  await g.page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    ends: window.__ends.map(e => e.o), paid: Game.persist.cash - window.__cash0,
    outcome: document.getElementById('outcomeText').textContent.trim(), mode: Game.mode }));
  await page.evaluate(() => { window.endScenario = window.__origEnd; });
  return r;
}
async function home() { await page.evaluate(() => enterBedroom()); await g.spin(5); }

// 1. kill_all: the last kid goes down, and a BB already in flight tags the player out inside the 600 ms
let r = await race('bunratty_sean', () => {
  Game.player.hitsTaken = Game.player.maxHits - 1;
  for (const e of Game.scenario.enemies) if (e.team !== 'player') e.health = 0;
  checkWinCondition();
  applyBBHit({}, Game.player);
});
check('1v1: last kill then tagged out → one ending, YOU\'RE OUT stands', r.ends.length === 1 && r.ends[0] === 'lose' && !/GOT THEM/.test(r.outcome), r);
await home();

// 2. Infection: the timer runs out (win in 400 ms) and a tagger reaches the player inside it (infected in 200 ms)
r = await race('bunratty_infection', () => {
  Game.scenario.timerRemaining = 0.02;
  for (let i = 0; i < 2; i++) stepGame(1 / 60);
  const t = Game.scenario.enemies.find(e => e.health > 0 && e.team !== 'player');
  t.pos.x = Game.player.pos.x + 0.5; t.pos.z = Game.player.pos.z;
  stepGame(1 / 60);
});
check('Infection: timer win and a tag in the same moment → one ending, one payout', r.ends.length === 1 && r.ends[0] === 'infected', r);
await home();

// 3. last_team_standing: the other team is wiped (win in 600 ms), then the player is tagged out
r = await race('hollow_skirmish_3v3', () => {
  Game.player.hitsTaken = Game.player.maxHits - 1;
  for (const e of Game.scenario.enemies) if (e.team !== 'player' && e.team !== combatantTeam(Game.player)) { e.health = 0; if (typeof e.lives === 'number') e.lives = 0; }
  checkWinCondition();
  applyBBHit({}, Game.player);
});
check('Team battle: wipe then tagged out → one ending', r.ends.length === 1 && r.ends[0] === 'lose', r);
await home();

// 4. a normal win still arrives after its delay
r = await race('bunratty_sean', () => {
  for (const e of Game.scenario.enemies) if (e.team !== 'player') e.health = 0;
  checkWinCondition();
});
check('a plain last kill still wins after the delay', r.ends.length === 1 && r.ends[0] === 'win' && r.mode === 'result' && r.paid > 0, r);
await home();

// 5. a stale delayed win doesn't end the NEXT round: forfeit inside the delay, start again, then let the
// old round's timer fire. The timer is captured and fired by hand once the new round is on, so the test
// doesn't depend on whether the next scenario loads faster or slower than 600 ms (CI loads faster).
await g.scenario('bunratty_sean');
await page.evaluate(() => {
  const st = window.setTimeout; window.__late = [];
  window.setTimeout = (fn, ms, ...a) => { if (ms === 600) { window.__late.push(fn); return 0; } return st(fn, ms, ...a); };
  try { for (const e of Game.scenario.enemies) if (e.team !== 'player') e.health = 0; checkWinCondition(); forfeitScenario(); }
  finally { window.setTimeout = st; }
});
await home();
await g.scenario('bunratty_sean');
const stale = await page.evaluate(() => { const n = window.__late.length; window.__late.forEach(f => f()); return { timers: n, mode: Game.mode }; });
check('a delayed win from a forfeited round doesn\'t end the next one', stale.timers === 1 && stale.mode === 'scenario', stale);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
