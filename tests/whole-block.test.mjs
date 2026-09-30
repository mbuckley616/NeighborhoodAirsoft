// Found in play (critic, v1.101): on The Whole Block, with the player at (28, 0.1), Seth freezes in 'advancing' behind
// the van for 83 s of 90 without a shot (4 of 5 runs), and Marcus the same in 2 of 5. v1.103: both were two-frame
// flips, each frame moving ~6 cm, so no wedge check fired: Seth re-picked the bound cover he stood at, and Marcus
// crossed the 10 m bounding line in and out. Wedged here = seconds in a row in 'advancing' with under 0.25 m of net
// movement per second. The player is untaggable and held at (28, 0.1), as the critic did.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_whole_block');
const r = await page.evaluate(() => {
  const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
  const P = Game.player.pos;
  const kids = Game.scenario.enemies, st = kids.map(k => ({ run: 0, longest: 0, mark: [k.pos.x, k.pos.z] })), fired = kids.map(() => 0);
  const o = spawnEnemyBB; spawnEnemyBB = (e, t) => { const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
  for (let f = 1; f <= 90 * 60 && Game.mode === 'scenario'; f++) {
    P.x = 28; P.z = 0.1;
    stepGame(1 / 60);
    if (f % 60 === 0) kids.forEach((k, i) => {
      const s = st[i], net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
      if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
    });
  }
  spawnEnemyBB = o; applyBBHit = orig;
  return kids.map((k, i) => ({ n: k.character?.name, wedged: st[i].longest, fired: fired[i], at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state }));
});
console.log('  90 s of The Whole Block, player at (28, 0.1):', JSON.stringify(r));
const seth = r.find(k => k.n === 'Seth'), marcus = r.find(k => k.n === 'Marcus');
check('no kid is wedged in advancing for 4 s or more', r.every(k => k.wedged < 4), r);
check('Seth fires at the player', seth && seth.fired > 0, seth);
check('Marcus fires at the player', marcus && marcus.fired > 0, marcus);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
