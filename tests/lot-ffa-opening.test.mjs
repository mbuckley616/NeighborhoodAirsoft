// v1.134: Riverside Market's free-for-all opening (Found in play, v1.123; Michael: B). The six kids stood on the lot's
// side lines in sight of each other and 3–4 were out by 3.8 s, a second after the 2.5 s opening hold. Now all seven
// starts, yours among them at the lot's east edge, are hidden from each other. Checks the starts by the kids' own
// sight rule, then plays three openings and the first minute.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const rounds = [];
for (let r = 0; r < 3; r++) {
  await g.scenario('lot_ffa');
  if (r === 0) {
    const st = await page.evaluate(() => {
      const pts = [[Game.player.pos.x, Game.player.pos.z, 'you'], ...Game.scenario.enemies.map(e => [e.pos.x, e.pos.z, e.character.name])];
      const seen = [], obs = Game.player.obstacles;
      let mind = Infinity;
      for (let i = 0; i < pts.length; i++) for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        if (hasLineOfSight(pts[i][0], 1.05, pts[i][1], pts[j][0], 0.95, pts[j][1], obs)) seen.push(pts[i][2] + '→' + pts[j][2]);
        mind = Math.min(mind, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
      }
      return { n: pts.length, seen, mind: +mind.toFixed(1), you: [+Game.player.pos.x.toFixed(1), +Game.player.pos.z.toFixed(1)],
        clear: pts.every(p => !collidesObstacles(p[0], p[1], 0.3)) };
    });
    check('seven starts, everyone clear of obstacles', st.n === 7 && st.clear, st);
    check('nobody can see anybody from the start', st.seen.length === 0, st.seen);
    check('every start at least 18 m from every other', st.mind >= 18, st.mind);
    check('your start is at the lot\'s east edge', st.you[0] > 30, st.you);
  }
  const o = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), out = kids.map(() => null);
    let f = 1;
    for (; f <= 60 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      kids.forEach((k, i) => { if (out[i] == null && (k.health <= 0 || k.lives < k.maxLives)) out[i] = +(f / 60).toFixed(1); });
    }
    applyBBHit = orig;
    return { out: kids.map((k, i) => [k.character.name, out[i]]), mode: Game.mode, secs: Math.round(f / 60) };
  });
  const times = o.out.map(x => x[1]).filter(t => t != null);
  rounds.push({ by4: times.filter(t => t <= 4).length, by5: times.filter(t => t <= 5).length, first: times.length ? Math.min(...times) : null, outIn60: times.length, ...o });
  console.log(`  round ${r + 1}:`, JSON.stringify(o.out));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
console.log('  ', JSON.stringify(rounds.map(r => ({ by4: r.by4, by5: r.by5, first: r.first, outIn60: r.outIn60 }))));
check('the opening is not decided at once: at most one kid out by 4 s, every round (was 3–4 of 6)', rounds.every(r => r.by4 <= 1), rounds.map(r => r.by4));
check('the kids still find each other: 2+ tagged within 60 s, every round', rounds.every(r => r.outIn60 >= 2 || r.mode === 'result'), rounds.map(r => r.outIn60));

// you, standing at your start: not tagged in the opening seconds
await g.scenario('lot_ffa');
const tagged = await page.evaluate(() => {
  let f = 1;
  for (; f <= 30 * 60 && Game.mode === 'scenario' && !(Game.player.hitsTaken > 0); f++) stepGame(1 / 60);
  return Game.player.hitsTaken > 0 || Game.mode !== 'scenario' ? +(f / 60).toFixed(1) : null;
});
console.log('  standing at the start, first tagged at', tagged, 's');
check('standing at your start, nobody tags you in the first 6 s', tagged === null || tagged > 6, tagged);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });

// the roam is for every free-for-all: the other three still play (30 s each, every kid moves or fires)
for (const id of ['winnmark_ffa', 'bunratty_ffa', 'hollow_ffa']) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0), walked = kids.map(() => 0);
    const o = spawnEnemyBB; spawnEnemyBB = (e, t) => { const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    for (let f = 1; f <= 30 * 60 && Game.mode === 'scenario'; f++) {
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => { const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]); if (m < 1.5) walked[i] += m; });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { ffa: Game.scenario.ffa, mode: Game.mode, kids: kids.map((k, i) => [k.character.name, +walked[i].toFixed(0), fired[i]]) };
  });
  console.log(`  ${id}:`, JSON.stringify(r));
  check(`${id}: a free-for-all, and every kid moves or fires in 30 s`, r.ffa === true && r.kids.every(k => k[1] > 5 || k[2] > 0), r);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
