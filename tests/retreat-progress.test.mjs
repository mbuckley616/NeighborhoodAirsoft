// v1.164 (backlog B.5): a kid jogging back to respawn ('retreating') who isn't getting nearer home is sent home. The
// stuck-kid sweep caught Northcliff twins 3v3's ally Andrew at (-6.3, -1) for 17 s: he crept 3-5 cm along a wall about
// once a second, and each creep reset the old "moved over 2 cm this frame" watchdog. The watchdog now counts ground
// gained toward spawn: 1.2 s without 0.3 m nearer and he is home. `SRC=<file>` runs it against another build.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });

// 1. Staged: Andrew retreats from (-6.4, -0.95) with every step blocked but one in 50, which slides him 5 cm (the creep).
await g.scenario('northcliff_twins_3v3');
const staged = await page.evaluate(() => {
  Game.player._infected = true;
  const a = Game.scenario.enemies.find(e => e.charId === 'andrew');
  a.pos.x = -6.4; a.pos.z = -0.95; a.state = 'retreating'; a.stateTime = 0; a._retreatStuck = 0; a._retreatBest = null;
  const real = collidesObstacles; let calls = 0;
  window.collidesObstacles = (x, z, r, ...rest) => {
    if (Math.abs(x - a.pos.x) < 0.2 && Math.abs(z - a.pos.z) < 0.2 && a.state === 'retreating' && (x !== a.pos.x || z !== a.pos.z))
      return (calls++ % 50) !== 0 || Math.hypot(x - a.pos.x, z - a.pos.z) > 0.06 ? true : false;
    return real(x, z, r, ...rest);
  };
  // the creep: once in 50 frames the step is let through, shortened to 5 cm
  let t = 0, home = null;
  try {
    for (let f = 0; f < 10 * 60 && Game.mode === 'scenario'; f++) {
      if (f % 50 === 0 && a.state === 'retreating') { const b = a._spawnPos, d = Math.hypot(b.x - a.pos.x, b.z - a.pos.z); a.pos.x += (b.x - a.pos.x) / d * 0.05; a.pos.z += (b.z - a.pos.z) / d * 0.05; }
      stepGame(1 / 60); t += 1 / 60;
      if (a.state !== 'retreating') { home = +t.toFixed(2); break; }
    }
  } finally { window.collidesObstacles = real; }
  return { home, state: a.state, at: [+a.pos.x.toFixed(1), +a.pos.z.toFixed(1)], spawn: [+a._spawnPos.x.toFixed(1), +a._spawnPos.z.toFixed(1)] };
});
check('a retreating kid who creeps 5 cm a second but gains no real ground is home and redeploying within 2 s', staged.home !== null && staged.home <= 2, staged);

// 2. Natural: six rounds, the player walked 10 m toward the nearest enemy (the sweep's case), 90 s each.
const worst = [];
for (let r = 0; r < 6; r++) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario('northcliff_twins_3v3');
  worst.push(await page.evaluate(() => {
    Game.player._infected = true;
    const P = Game.player, kids = Game.scenario.enemies;
    const near = kids.filter(e => e.team !== 'player').sort((a, b) => Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z) - Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z))[0];
    const x0 = P.pos.x, z0 = P.pos.z;
    for (let f = 0; f < 480 && Game.mode === 'scenario'; f++) {
      P.yaw = Math.atan2(-(near.pos.x - P.pos.x), -(near.pos.z - P.pos.z)); P.pitch = 0;
      Game.keys['KeyW'] = true; stepGame(1 / 60);
      if (Math.hypot(P.pos.x - x0, P.pos.z - z0) >= 10) break;
    }
    Game.keys['KeyW'] = false;
    const st = kids.map(k => ({ mark: [k.pos.x, k.pos.z], run: 0, worst: 0 }));
    for (let f = 1; f <= 90 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      if (f % 30) continue;
      kids.forEach((k, i) => {
        const s = st[i];
        if (k.state === 'retreating' && Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]) < 1) { s.run += 0.5; s.worst = Math.max(s.worst, s.run); }
        else { s.run = 0; s.mark = [k.pos.x, k.pos.z]; }
      });
    }
    const w = kids.map((k, i) => [k.charId, st[i].worst]).sort((a, b) => b[1] - a[1])[0];
    return w;
  }));
  console.log(`  round ${r + 1}: longest retreat in one spot ${worst[r][0]} ${worst[r][1]} s`);
}
// v1.174 fix-up: 4 s, not 3. The watchdog asks 0.3 m nearer home every 1.2 s, so a kid creeping home along a wall
// at that rate stays inside 1 m for up to about 4 s and is not stuck. CI, 6 Oct: Andrew 3 s once; locally 1-2 s over
// 48 rounds. The bug this guards against held him 17 s.
check('Northcliff twins 3v3, six rounds: no kid holds retreating within 1 m of one spot for 4 s or more', worst.every(w => w[1] < 4), worst);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
