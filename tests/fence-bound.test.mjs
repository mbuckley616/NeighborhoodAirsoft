// Found in play (builder, v1.153's stuck-kid sweep): in Bunratty's free-for-all Nick stood in `advancing` within 1 m of
// (5.5, -28.2), by house 2's backyard, for 15-23 s without a shot. He pushed the fence for 1.5 s, bounded 0.5 m back to
// a cover behind him, and pushed again; each bound restarted v1.121's progress window, so its 2.5 s pocket rule never
// fired. v1.154: a bound that keeps him within 1.5 m of the window's start no longer ends the window.
// Staged: the other kids out, Nick put on the spot advancing on a flank toward the player held at (-24.8, -12.1).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
for (let r = 0; r < 3; r++) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario('bunratty_ffa');
  const res = await page.evaluate(() => {
    const P = Game.player, kids = Game.scenario.enemies, k = kids.find(e => e.charId === 'nick');
    for (const o of kids) if (o !== k) { o.pos.x = 60; o.pos.z = 60; o.health = 0; o.state = 'retreating'; }
    P.pos.x = -24.8; P.pos.z = -12.1;
    for (let f = 0; f < 180; f++) stepGame(1 / 60);   // past the 2.5 s opening hold
    k.pos.x = 5.47; k.pos.z = -28.3; k.state = 'advancing'; k.flankSide = 1; k._targetRef = P;
    for (const key of Object.keys(k)) if (/^_adv|^_bound/.test(key)) delete k[key];
    let run = 0, worst = 0, mark = [k.pos.x, k.pos.z], left = null, bounds = 0, wasBound = false;
    for (let f = 1; f <= 30 * 60 && Game.mode === 'scenario'; f++) {
      P.pos.x = -24.8; P.pos.z = -12.1; stepGame(1 / 60);
      if (k._boundCover && !wasBound) bounds++;
      wasBound = !!k._boundCover;
      if (left == null && Math.hypot(k.pos.x - 5.47, k.pos.z + 28.3) > 3) left = +(f / 60).toFixed(2);
      if (f % 30) continue;
      if (k.state === 'advancing' && Math.hypot(k.pos.x - mark[0], k.pos.z - mark[1]) < 1) { run += 0.5; worst = Math.max(worst, run); }
      else { run = 0; mark = [k.pos.x, k.pos.z]; }
    }
    return { mode: Game.mode, left, worst, bounds, end: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state };
  });
  console.log(`  round ${r + 1}: ${JSON.stringify(res)}`);
  check(`round ${r + 1}: the round runs the whole 30 s`, res.mode === 'scenario', res);
  check(`round ${r + 1}: Nick gets 3 m clear of the fence spot within 12 s (v1.153: never in 30 s)`, res.left != null && res.left < 12, res);
  check(`round ${r + 1}: he never holds advancing within 1 m for over 10 s (v1.153: 23-30 s)`, res.worst <= 10, res);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
