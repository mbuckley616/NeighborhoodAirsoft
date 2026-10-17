// v1.266 (decisions, "Lamplight on Bellfield: Fernando's AK can reach your start", Michael: A). The four Bellfield kids
// huddled at the bulb's mouth, and its west slots looked straight down the street to the entry: CI on PR #75 had a
// player standing at the entry tagged at 4.6 s (Fernando's AK from 55.5 m; 1 of 45 rounds locally). Now each starts in
// a bulb house's west yard, hidden from the entry by the house, and walks out to his spot. Checked: where they start
// (in the first build after a page load and a later one), that nobody there has a line to the entry at any height a
// kid shoots or looks from, that they come back there when tagged, that each still reaches his spot, and played rounds
// with a player standing at the entry, taggable, first tagged after 5 s.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const ID = 'bellfield_night_4v4';
const STARTS = { Mason: [-21, -17], Christian: [-21, 17], Diego: [-24, -20], Fernando: [-24, 20] };
for (let build = 0; build < 2; build++) {
  await g.scenario(ID);
  const st = await page.evaluate(() => {
    const obs = Game.player.obstacles, p = Game.player.pos;
    // the player at the entry and a step either side, and the two allies' posts by it
    const targets = [[p.x, p.z], [p.x - 2, p.z - 2], [p.x - 2, p.z + 2], [30.5, -3.2], [31, 3.4]];
    return Game.scenario.enemies.filter(e => e.team === 'enemy').map(e => {
      const s = e._spawnPos, lines = [];
      for (const [tx, tz] of targets) for (const h of [1.05, 1.18, 1.35, 1.6]) for (const th of [0.95, 1.35])
        if (hasLineOfSight(s.x, h, s.z, tx, th, tz, obs)) lines.push([tx, tz, h, th]);
      return { n: e.character.name, at: [+s.x.toFixed(1), +s.z.toFixed(1)], stuck: collidesObstacles(s.x, s.z, 0.3), lines: lines.length,
        d: +Math.hypot(s.x - p.x, s.z - p.z).toFixed(1), state: e.state };
    });
  });
  console.log(`  build ${build + 1}:`, JSON.stringify(st));
  check(`build ${build + 1}: each Bellfield kid starts at his own yard start, clear of obstacles`,
    st.length === 4 && st.every(k => STARTS[k.n] && Math.hypot(k.at[0] - STARTS[k.n][0], k.at[1] - STARTS[k.n][1]) < 0.6 && !k.stuck), st);
  check(`build ${build + 1}: no start has a line to the entry (muzzle and eye 1.05-1.6 m, chest and head)`, st.every(k => k.lines === 0), st);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(30);
}

// they reach their spots, and a tagged kid comes back at his start
await g.scenario(ID);
const walk = await page.evaluate(() => {
  const p = Game.player; let playerHits = 0;
  const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) { playerHits++; return; } return orig(bb, who); };
  const kids = Game.scenario.enemies.filter(e => e.team === 'enemy');
  // out of the yard: at his spot (within 3 m), or fighting (out of 'deploying') 8 m or more from his start
  const reached = kids.map(() => null), anchor = kids.map(k => k._deployAnchor.clone()), how = kids.map(() => null);
  for (let f = 1; f <= 25 * 60 && Game.mode === 'scenario'; f++) {
    stepGame(1 / 60);
    kids.forEach((k, i) => {
      if (reached[i] !== null) return;
      const atSpot = Math.hypot(k.pos.x - anchor[i].x, k.pos.z - anchor[i].z) < 3;
      const out = k.state !== 'deploying' && Math.hypot(k.pos.x - k._spawnPos.x, k.pos.z - k._spawnPos.z) >= 8;
      if (atSpot || out) { reached[i] = +(f / 60).toFixed(1); how[i] = atSpot ? 'spot' : k.state; }
    });
  }
  // tag Mason and follow him back: where he turns round to deploy again
  const m = kids[0]; let back = null;
  if (Game.mode === 'scenario') {
    m.lives = Math.max(2, m.lives); eliminateEnemy(m);
    for (let f = 1; f <= 30 * 60 && Game.mode === 'scenario' && back === null; f++) {
      stepGame(1 / 60);
      if (m.state === 'deploying') back = [+m.pos.x.toFixed(1), +m.pos.z.toFixed(1)];
    }
  }
  applyBBHit = orig;
  return { reached: kids.map((k, i) => [k.character.name, reached[i], how[i]]), back, playerHits };
});
console.log('  reached their spots (s):', JSON.stringify(walk));
check('each Bellfield kid is out of his yard inside 25 s: at his spot, or fighting 8 m or more from his start', walk.reached.every(r => r[1] !== null), walk.reached);
check('a tagged kid comes back at his yard start', walk.back && Math.hypot(walk.back[0] - STARTS.Mason[0], walk.back[1] - STARTS.Mason[1]) < 3, walk.back);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.spin(30);

// a player standing at the entry, taggable: first tagged after 5 s (was 4.6 s on CI, 1 of 45 locally)
const ROUNDS = +(process.env.ROUNDS || 8), tagged = [];
for (let i = 0; i < ROUNDS; i++) {
  await g.scenario(ID);
  tagged.push(await page.evaluate(() => {
    let f = 1, by = null;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player && by === null) by = bb.enemyRef?.character?.name || '?'; return orig(bb, who); };
    for (; f <= 30 * 60 && Game.mode === 'scenario' && !(Game.player.hitsTaken > 0); f++) stepGame(1 / 60);
    applyBBHit = orig;
    return [+((f - 1) / 60).toFixed(1), by];
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(30);
}
console.log('  a player standing at the entry first tagged at (s, 30 = not in 30 s):', JSON.stringify(tagged));
check(`standing at the entry, not tagged in the first 5 s (${ROUNDS} rounds)`, tagged.every(t => t[0] > 5), tagged);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
