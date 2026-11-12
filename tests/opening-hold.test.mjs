// v1.101 (Michael, decision on Devon's opening shot: A): no kid fires in the first 2.5 s after BEGIN, on any map.
// Found in play (critic, v1.86): in Two in the Yards Devon (sniper) fired 0.75–0.97 s after BEGIN from 37 m and
// tagged a standing player at ~1.5 s in 3 of 9 runs. The player stands still at spawn; we read the round clock
// (`Game.scenario.roundTime`) at the first kid BB, and when the player was first hit.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const RUN = () => page.evaluate(() => {
  const clock = () => Game.scenario.roundTime ?? 0;   // pre-v1.101 builds have no round clock
  let t = 0, firstBB = null, firstHit = null, shooters = new Set();
  const seen = new Set(Game.scenario.bbs);
  for (let f = 0; f < 6 * 60 && Game.mode === 'scenario'; f++) {
    const hits = Game.player.hitsTaken;
    stepGame(1 / 60); t += 1 / 60;
    const now = Game.scenario.roundTime != null ? clock() : t;
    for (const b of Game.scenario.bbs) {
      if (seen.has(b)) continue; seen.add(b);
      if (b.owner !== 'player') { if (firstBB == null) firstBB = now; if (b.enemyRef?.character?.name) shooters.add(b.enemyRef.character.name); }
    }
    if (firstHit == null && (Game.player.hitsTaken > hits || Game.mode !== 'scenario')) firstHit = now;
  }
  return { firstBB: firstBB == null ? null : +firstBB.toFixed(2), firstHit: firstHit == null ? null : +firstHit.toFixed(2), shooters: [...shooters], mode: Game.mode };
});

const yards = [];
for (let i = 0; i < 5; i++) {
  if (i) { await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); }
  await g.scenario('winnmark_two_in_the_yards');
  yards.push(await RUN());
}
console.log('  Two in the Yards, standing at spawn, 6 s x5:', JSON.stringify(yards));
check('no kid BB before 2.5 s in any run', yards.every(r => r.firstBB == null || r.firstBB >= 2.5), yards.map(r => r.firstBB));
check('the player is never hit before 2.5 s', yards.every(r => r.firstHit == null || r.firstHit >= 2.5), yards.map(r => r.firstHit));

const others = {};
for (const id of ['bunratty_sean', 'winnmark_night_prowl', 'hollow_full_auto_mayhem', 'bunratty_ffa']) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario(id);
  others[id] = await RUN();
}
console.log('  other maps, standing at spawn, 6 s:', JSON.stringify(others));
check('no kid BB before 2.5 s on the other maps', Object.values(others).every(r => r.firstBB == null || r.firstBB >= 2.5), others);
// v1.473: the hold lifts. This was read off Devon at the yards' start, but every BB he fired there by 6 s went into the
// lawn's crest, which hides your start from him (sight lines test the ground since v1.473): he holds now. The free-for-all
// and Full-Auto Mayhem fire once the hold is over.
check('kids fire once the hold lifts (by 6 s) on the free-for-all and Full-Auto Mayhem', others.bunratty_ffa.firstBB != null && others.hollow_full_auto_mayhem.firstBB != null, others);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
