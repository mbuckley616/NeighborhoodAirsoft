// v1.165 (Found in play, critic v1.144; Michael: C): in Hold the Treehouse, Evan by the shed holds fire until the first
// twin reaches the foot of the ladder (about 8 s), then shoots at anything above the rail as before. He had tagged a
// player standing at the start, 11 m behind the player's shoulder, at 2.7-9.6 s in 8 of 8 rounds, before the twins
// climbed. `SRC=<file>` runs it against another build.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const rounds = [];
for (let r = 0; r < 6; r++) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario('stoneglen_hold_treehouse');
  rounds.push(await page.evaluate(() => {
      // the player stands at the start, one life, real hits; log the first tag and the first twin onto the ladder
    const E = Game.scenario.enemies, evan = E.find(e => e.charId === 'evan');
    let t = 0, ladder = null, tagged = null, by = null;
    const hit = applyBBHit;
    window.applyBBHit = (bb, c) => { if (c === Game.player && tagged === null) { tagged = +t.toFixed(1); by = bb.enemyRef ? bb.enemyRef.charId : '?'; } return hit(bb, c); };
    try {
      for (let f = 0; f < 40 * 60 && Game.mode === 'scenario'; f++) {
        stepGame(1 / 60); t += 1 / 60;
        if (ladder === null && E.some(e => e !== evan && e._lad && e._lad.phase !== 'toFoot')) ladder = +t.toFixed(1);
      }
    } finally { window.applyBBHit = hit; }
    return { ladder, tagged, by, mode: Game.mode };
  }));
  console.log(`  round ${r + 1}: first twin on the ladder ${rounds[r].ladder} s, tagged ${rounds[r].tagged} s by ${rounds[r].by}`);
}
check('in every round a twin reaches the ladder inside 12 s', rounds.every(r => r.ladder !== null && r.ladder <= 12), rounds.map(r => r.ladder));
check('Evan never tags the standing player before the first twin is on the ladder', rounds.every(r => r.tagged === null || r.by !== 'evan' || (r.ladder !== null && r.tagged >= r.ladder)), rounds);
check('nobody tags the standing player before the first twin is on the ladder', rounds.every(r => r.tagged === null || (r.ladder !== null && r.tagged >= r.ladder)), rounds.map(r => [r.ladder, r.tagged]));

// Evan's BBs, counted at the chokepoint: none before the ladder; after it he fires again (hits on the player dropped)
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.scenario('stoneglen_hold_treehouse');
const shots = await page.evaluate(() => {
  const E = Game.scenario.enemies, evan = E.find(e => e.charId === 'evan');
  const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
  let t = 0, before = 0, after = 0, ladderAt = null; const seen = new Set();
  const all = () => Game.scenario.bbs;
  for (let f = 0; f < 30 * 60 && Game.mode === 'scenario'; f++) {
    stepGame(1 / 60); t += 1 / 60;
    if (ladderAt === null && Game.scenario.ladderReached) ladderAt = +t.toFixed(1);
    for (const b of all()) if (b.enemyRef === evan && !seen.has(b)) { seen.add(b); if (ladderAt === null) before++; else after++; }
  }
  window.applyBBHit = hit;
  return { ladderAt, before, after };
});
check('Evan fires no BB before the ladder is reached', shots.before === 0 && shots.ladderAt !== null, shots);
check('and once a twin is on the ladder he shoots at the player above the rail', shots.after > 0, shots);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
