// v1.181 (critic, 8 Oct): Seth's Got a Shotgun's briefing promised "past 14m and he can't touch you", but he engages
// out to 25 m and tagged a player holding the start from 14.7-17.7 m. The line now says what is true: his pellets
// spread, and the farther out you are the fewer find you. Checked: the briefing, and Seth held at fixed distances
// from the player in the open, 20 s each, counting his shots and the pellets that reach the player.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const desc = await page.evaluate(() => SCENARIOS.winnmark_seth_shotgun_duel.desc);
console.log('   briefing:', desc);
check('the briefing no longer promises a range he cannot reach', !/14 ?m|can.t touch you/.test(desc), desc);

const rows = [];
for (const d of [12, 16, 20, 24, 28]) {
  await g.scenario('winnmark_seth_shotgun_duel');
  rows.push(await page.evaluate((d) => {
    const real = applyBBHit, bb0 = spawnEnemyBB; let hits = 0, shots = 0;
    window.applyBBHit = (bb, c) => { if (c === Game.player) hits++; else return real(bb, c); };
    window.spawnEnemyBB = (e, ...a) => { shots++; return bb0(e, ...a); };
    const s = Game.scenario.enemies[0], P = Game.player;
    for (let f = 0; f < 60 * 23 && Game.mode === 'scenario'; f++) {   // 3 s of opening hold, then 20 s
      P.pos.x = 10; P.pos.z = 0; s.pos.x = 10 - d; s.pos.z = 0; stepGame(1 / 60);
    }
    window.applyBBHit = real; window.spawnEnemyBB = bb0;
    return { d, shots, hits };
  }, d));
}
console.log('   Seth held west of the player:', JSON.stringify(rows));
const near = rows.filter(r => r.d <= 16), far = rows.filter(r => r.d >= 24);
const rate = rs => rs.reduce((a, r) => a + r.hits, 0) / Math.max(1, rs.reduce((a, r) => a + r.shots, 0));
check('past 14 m he still fires and reaches the player (the old line was wrong)', rows.filter(r => r.d >= 16 && r.d <= 20).some(r => r.hits > 0), rows);
check('fewer of his pellets find you at 24-28 m than at 12-16 m', rate(far) < rate(near) / 2, { near: rate(near), far: rate(far) });

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
