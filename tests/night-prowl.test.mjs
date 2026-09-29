// Found in play (critic, v1.86): on Night Prowl, once the player closes to ~14 m, Seth freezes in 'advancing' at
// (−5.3, −10.6) for 45–110 s, neither moving nor firing. He is a pistol flanker bounding cover to cover; the bound
// wedges on a tree, is dropped after 0.6 s, and the next frame re-picks the same cover, so the direct push (with its
// wall-follow) never runs. v1.99: a wedged bound rests bounding for 1.5 s.
// The player (untaggable) walks from spawn toward (5, −2), stopping once within 14 m of Seth, as the critic did.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_night_prowl');
const r = await page.evaluate(() => {
  const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
  const P = Game.player.pos, s = Game.scenario.enemies.find(e => /seth/i.test(e.character?.name || ''));
  const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { if (e === s) shots++; return o(e, t); };
  let wedgeFrom = null, longest = 0, path = 0;
  for (let f = 1; f <= 60 * 60 && Game.mode === 'scenario'; f++) {
    const dS = Math.hypot(s.pos.x - P.x, s.pos.z - P.z), dx = 5 - P.x, dz = -2 - P.z, dl = Math.hypot(dx, dz);
    if (dS > 14 && dl > 0.1) { P.x += dx / dl * 0.05; P.z += dz / dl * 0.05; }
    const px = s.pos.x, pz = s.pos.z;
    stepGame(1 / 60);
    const m = Math.hypot(s.pos.x - px, s.pos.z - pz); path += m;
    if (m < 0.005 && s.state === 'advancing') { if (wedgeFrom == null) wedgeFrom = f; longest = Math.max(longest, f - wedgeFrom); } else wedgeFrom = null;
  }
  spawnEnemyBB = o;
  return { longest: +(longest / 60).toFixed(1), shots, path: +path.toFixed(1), end: [+s.pos.x.toFixed(1), +s.pos.z.toFixed(1)], state: s.state, mode: Game.mode };
});
console.log('  60 s of Night Prowl, player closing to 14 m:', JSON.stringify(r));
check('Seth never stands still in advancing for 3 s or more', r.longest < 3, r);
check('Seth fires at the player', r.shots > 0, r);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
