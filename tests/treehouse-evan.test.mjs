// v1.165 (Found in play, critic v1.144; Michael: C): in Hold the Treehouse, Evan by the shed holds fire until the first
// twin reaches the foot of the ladder (about 8 s), then shoots at anything above the rail as before. He had tagged a
// player standing at the start, 11 m behind the player's shoulder, at 2.7-9.6 s in 8 of 8 rounds, before the twins
// climbed. `SRC=<file>` runs it against another build.
// v1.316 (D.55 step 6, Michael: A): the match is Hold the Bunker and there is no ladder. Evan is in the nest under the
// road bank, 16 m behind a player who starts facing the house, and the same rule holds in its new form: he holds fire
// until the first twin is within 7 m of the player (holdUntilNear, Game.scenario.attackNear).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const rounds = [];
for (let r = 0; r < 6; r++) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario('stoneglen_hold_treehouse');
  rounds.push(await page.evaluate(() => {
    // the player stands at the start, one life, real hits; log the first tag and when the first twin came within 7 m
    const E = Game.scenario.enemies, evan = E.find(e => e.charId === 'evan'), P = Game.player.pos;
    let t = 0, near = null, tagged = null, by = null, evanFirst = null;
    const hit = applyBBHit, seen = new Set();
    window.applyBBHit = (bb, c) => { if (c === Game.player && tagged === null) { tagged = +t.toFixed(1); by = bb.enemyRef ? bb.enemyRef.charId : '?'; } return hit(bb, c); };
    try {
      for (let f = 0; f < 40 * 60 && Game.mode === 'scenario'; f++) {
        stepGame(1 / 60); t += 1 / 60;
        if (near === null && E.some(e => e !== evan && e.health > 0 && Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < 7)) near = +t.toFixed(1);
        for (const b of Game.scenario.bbs) if (b.enemyRef === evan && !seen.has(b)) { seen.add(b); if (evanFirst === null) evanFirst = +t.toFixed(1); }
      }
    } finally { window.applyBBHit = hit; }
    return { near, flag: Game.scenario.attackNear, tagged, by, evanFirst, mode: Game.mode };
  }));
  console.log(`  round ${r + 1}: first twin within 7 m ${rounds[r].near} s, Evan's first BB ${rounds[r].evanFirst} s, tagged ${rounds[r].tagged} s by ${rounds[r].by}`);
}
check('in every round a twin comes within 7 m of the bunker inside 20 s, or the round ended first', rounds.every(r => (r.near !== null && r.near <= 20) || (r.tagged !== null && r.tagged <= 20)), rounds.map(r => [r.near, r.tagged]));
check('Evan never tags the standing player before a twin is close', rounds.every(r => r.tagged === null || r.by !== 'evan' || (r.near !== null && r.tagged >= r.near)), rounds);
// v1.316: with no ladder to climb Haden's UMP tagged a standing player at 2.8 s from the patio in 6 of 6 rounds; the
// match holds everyone's fire 5 s (openingHoldSec)
check('nobody tags the standing player in the first 5 s', rounds.every(r => r.tagged === null || r.tagged >= 5), rounds.map(r => r.tagged));
check('Evan fires no BB before a twin is close', rounds.every(r => r.evanFirst === null || (r.near !== null && r.evanFirst >= r.near - 0.05)), rounds.map(r => [r.near, r.evanFirst]));

// Evan's BBs with the player untaggable: none before a twin is close; after it he fires
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.scenario('stoneglen_hold_treehouse');
const shots = await page.evaluate(() => {
  const E = Game.scenario.enemies, evan = E.find(e => e.charId === 'evan');
  const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
  let t = 0, before = 0, after = 0, nearAt = null; const seen = new Set();
  for (let f = 0; f < 30 * 60 && Game.mode === 'scenario'; f++) {
    stepGame(1 / 60); t += 1 / 60;
    if (nearAt === null && Game.scenario.attackNear) nearAt = +t.toFixed(1);
    for (const b of Game.scenario.bbs) if (b.enemyRef === evan && !seen.has(b)) { seen.add(b); if (nearAt === null) before++; else after++; }
  }
  window.applyBBHit = hit;
  return { nearAt, before, after };
});
check('Evan fires no BB before a twin is close (untaggable round)', shots.before === 0 && shots.nearAt !== null, shots);
check('and once one is, he shoots at the player', shots.after > 0, shots);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
