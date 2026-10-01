// v1.111 (Found in play, critic v1.101): in Priya's Pincer, Priya parked in 'advancing' at about (−5, 2), 39 m from
// the bulb_center spawn, for 37–60 s and never came on (3 of 6 runs on v1.101). Plays the defend twice with the
// player standing at spawn, untaggable, and follows her: no stall of 8 s or more in 'advancing' while over 20 m out,
// and she closes to 15 m inside 40 s. Not reproduced on v1.109–v1.110 (0 of 9 runs); the v1.103 fix to the bounding
// flips is the likely cure. This keeps it that way.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
for (let r = 0; r < 2; r++) {
  await g.scenario('bunratty_pincer');
  const res = await page.evaluate(() => {
    Game.player.maxHits = 999;
    const e = Game.scenario.enemies.find(e => e.name === 'Priya');
    let park = 0, longest = 0, mark = [e.pos.x, e.pos.z], closeAt = null, trace = [];
    for (let f = 1; f <= 60 * 60 && Game.mode === 'scenario'; f++) {
      Game.player.hitsTaken = 0; stepGame(1 / 60);
      const d = Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z);
      if (closeAt === null && d < 15) closeAt = +(f / 60).toFixed(1);
      if (f % 60 === 0) {
        const net = Math.hypot(e.pos.x - mark[0], e.pos.z - mark[1]); mark = [e.pos.x, e.pos.z];
        if (f % 600 === 0) trace.push([f / 60, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), e.state, Math.round(d)]);
        if (net < 0.5 && e.state === 'advancing' && d > 20 && e.health > 0) { park++; longest = Math.max(longest, park); } else park = 0;
      }
    }
    return { longest, closeAt, trace };
  });
  console.log(`  run ${r + 1}:`, JSON.stringify(res));
  check(`run ${r + 1}: Priya never stalls 8 s in 'advancing' more than 20 m out`, res.longest < 8, res.longest);
  check(`run ${r + 1}: Priya closes to 15 m inside 40 s`, res.closeAt !== null && res.closeAt <= 40, res.closeAt);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); enterBedroom(); });
  await g.spin(5);
}
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
