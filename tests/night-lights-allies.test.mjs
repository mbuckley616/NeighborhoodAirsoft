// v1.179 (Found in play, builder v1.178): since v1.177 Friday Night Lights starts you behind the concession stand,
// and your allies start beside you there (v1.33). Brooke, a cautious skirmisher whose post is the court at (-24, 25),
// has no line to the field from the stand and never marches, so she stood the round out: in 8 sampled 60 s rounds she
// walked 0.1 m or less in 6 and fired 0 times in one. The night match's allies now walk from the stand to their posts,
// and Rebecca's post, which was the stand itself, is the south portable (b_port_s).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const R = 6, rounds = [];
for (let r = 0; r < R; r++) {
  await g.scenario('school_night_4v4');
  rounds.push(await page.evaluate(() => {
    const p = Game.player;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === p) return; return orig(bb, who); };
    const allies = Game.scenario.enemies.filter(e => e.team === 'player');
    const st = allies.map(k => ({ n: k.name, start: Math.hypot(k.pos.x - p.pos.x, k.pos.z - p.pos.z), state0: k.state, walked: 0, fired: 0, nearPost: 1e9, prev: [k.pos.x, k.pos.z] }));
    const o = spawnEnemyBB; spawnEnemyBB = (e, t) => { const i = allies.indexOf(e); if (i >= 0) st[i].fired++; return o(e, t); };
    for (let f = 1; f <= 60 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      allies.forEach((k, i) => {
        const s = st[i], m = Math.hypot(k.pos.x - s.prev[0], k.pos.z - s.prev[1]);
        if (m < 1.5) s.walked += m; s.prev = [k.pos.x, k.pos.z];
        s.nearPost = Math.min(s.nearPost, Math.hypot(k.pos.x - k._deployAnchor.x, k.pos.z - k._deployAnchor.z));
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return st.map(s => ({ n: s.n, start: +s.start.toFixed(1), state0: s.state0, walked: +s.walked.toFixed(1), fired: s.fired, nearPost: +s.nearPost.toFixed(1) }));
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); enterBedroom(); });
  await g.spin(3);
}
for (const r of rounds) console.log('  ' + r.map(k => `${k.n} ${k.walked} m ${k.fired} shots post ${k.nearPost} m`).join(' | '));
const all = rounds.flat(), brooke = all.filter(k => k.n === 'Brooke');
check('the allies start beside you behind the stand and set off for their posts', all.every(k => k.start < 4.5 && k.state0 === 'deploying'), rounds[0]);
check('every ally reaches within 2 m of his post (or is drawn into the fight on the way) and moves or fires',
  all.every(k => (k.nearPost < 2 || k.fired > 0) && (k.walked > 5 || k.fired > 0)), all);
check('Brooke walks out from the stand (over 10 m) and fires in every round', brooke.every(k => k.walked > 10 && k.fired > 0), brooke);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
