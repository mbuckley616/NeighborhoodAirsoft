// Found in play (critic, v1.86): in Bunratty Infection, Mitchell (spawn −29, 25) never left his backyard: 3 m in
// 90 s. He spawns against a 1 m backyard box that is also between him and the player; the v1.73 fence detour
// pointed him at a fence further along the line, the step toward it hit the same box, and the wall-follow never
// ran. v1.98: a detour that makes no progress for 0.4 s gives way to the wall-follow for 1.5 s.
// v1.100: the tagger wall-follow now commits to a sidestep (0.35 s, longer on repeat wedges) instead of being
// slid straight back to the wedge by the next frame's step: Marcus hung on a tree in 3 of 6 runs, and taggers from
// the west stopped at the spawn's planter wall. Every tagger must now reach the standing player.
// v1.100 fix-up: CI failed this on a slow runner, where the page's own frame loop adds steps of up to 0.05 s: at
// the end of the house3 side fence the fence detour (centre line only) and the wall-follow pulled Mitchell opposite
// ways. The detour now widens the fence by the kid's radius. The round is played twice: fixed 1/60 steps, and a
// low-frame-rate pattern (every third step 0.05 s, the cap tick() uses).
// The player is made untaggable and stands at spawn; every tagger must cover ground and close in.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
for (const pass of ['1/60 steps', 'mixed 1/60 + 0.05 s steps']) {
await g.scenario('bunratty_infection');
const start = await page.evaluate(() => { Game.player._infected = true; return Game.scenario.enemies.map(e => ({ n: e.character?.name || e.name, x: e.pos.x, z: e.pos.z })); });
const track = start.map(s => ({ ...s, path: 0, lx: s.x, lz: s.z, reached: null }));
for (let i = 0; i < 45; i++) {          // 45 s in 1 s chunks
  if (pass === '1/60 steps') await g.spin(60);
  else await page.evaluate(() => { for (let f = 0; f < 36 && Game.mode === 'scenario'; f++) stepGame(f % 3 ? 1 / 60 : 0.05); });   // 1 s
  const now = await page.evaluate(() => Game.scenario.enemies.map(e => [e.pos.x, e.pos.z, Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z)]));
  now.forEach(([x, z, dp], k) => { const t = track[k]; t.path += Math.hypot(x - t.lx, z - t.lz); t.lx = x; t.lz = z; if (dp < 2 && t.reached == null) t.reached = i + 1; });
}
const P = await page.evaluate(() => [Game.player.pos.x, Game.player.pos.z]);
const rows = track.map(t => ({ n: t.n, walked: +t.path.toFixed(1), from: +Math.hypot(t.lx - t.x, t.lz - t.z).toFixed(1), toPlayer: +Math.hypot(t.lx - P[0], t.lz - P[1]).toFixed(1), reached: t.reached }));
console.log(`  45 s of Infection (${pass}), player standing at spawn:`, rows.map(r => `${r.n}: walked ${r.walked} m, ${r.reached ? 'reached the player at ' + r.reached + ' s' : r.toPlayer + ' m from the player'}`).join('; '));
const mitch = rows.find(r => /mitchell/i.test(r.n));
check(`${pass}: Mitchell leaves his backyard (over 30 m from spawn in 45 s)`, mitch && mitch.from > 30, mitch);
check(`${pass}: Mitchell ends within 12 m of the player`, mitch && mitch.toPlayer < 12, mitch);
check(`${pass}: every tagger reaches the player (within 2 m) in 45 s`, rows.every(r => r.reached != null), rows);
check(`${pass}: still in the round (untaggable player)`, (await g.mode()) === 'scenario');
await page.evaluate(() => { endScenario('forfeit'); });
await page.waitForFunction(() => Game.mode !== 'scenario');
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
