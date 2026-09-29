// Found in play (critic, v1.86): in Bunratty Infection, Mitchell (spawn −29, 25) never left his backyard: 3 m in
// 90 s. He spawns against a 1 m backyard box that is also between him and the player; the v1.73 fence detour
// pointed him at a fence further along the line, the step toward it hit the same box, and the wall-follow never
// ran. v1.98: a detour that makes no progress for 0.4 s gives way to the wall-follow for 1.5 s.
// The player is made untaggable and stands at spawn; every tagger must cover ground and close in.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_infection');
const start = await page.evaluate(() => { Game.player._infected = true; return Game.scenario.enemies.map(e => ({ n: e.character?.name || e.name, x: e.pos.x, z: e.pos.z })); });
const track = start.map(s => ({ ...s, path: 0, lx: s.x, lz: s.z }));
for (let i = 0; i < 30; i++) {          // 30 s in 1 s chunks
  await g.spin(60);
  const now = await page.evaluate(() => Game.scenario.enemies.map(e => [e.pos.x, e.pos.z]));
  now.forEach(([x, z], k) => { const t = track[k]; t.path += Math.hypot(x - t.lx, z - t.lz); t.lx = x; t.lz = z; });
}
const P = await page.evaluate(() => [Game.player.pos.x, Game.player.pos.z]);
const rows = track.map(t => ({ n: t.n, walked: +t.path.toFixed(1), from: +Math.hypot(t.lx - t.x, t.lz - t.z).toFixed(1), toPlayer: +Math.hypot(t.lx - P[0], t.lz - P[1]).toFixed(1) }));
console.log('  30 s of Infection, player standing at spawn:', rows.map(r => `${r.n}: walked ${r.walked} m, ${r.toPlayer} m from player`).join('; '));
const mitch = rows.find(r => /mitchell/i.test(r.n));
check('Mitchell leaves his backyard (over 30 m from spawn in 30 s)', mitch && mitch.from > 30, mitch);
check('Mitchell ends within 12 m of the player', mitch && mitch.toPlayer < 12, mitch);
check('still in the round (untaggable player)', (await g.mode()) === 'scenario');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
