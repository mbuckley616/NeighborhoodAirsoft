// v1.269 (critic, 16 Oct, Found in play): the cells a kid fits in (kidFreeCells, v1.152) were worked out on the first
// pocket route or squad order of a round, one 50-550 ms step mid-fight (The Last Saturday: 329-516 ms at 3.8-4.2 s, as
// the fight opens). Now they are built at BEGIN, behind the opening hold. Checked: in each match below the cells are
// there as the round starts, for this match's obstacles and bounds, and the round's first routes use them without a
// rebuild; the slowest step of the first 6 s, and the step after a squad order, are logged with the build's own cost.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const rows = [];
for (const id of ['last_saturday', 'hollow_big_battle', 'bunratty_team_4v4']) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const S = Game.scenario, C = S._kidCells;
    const out = { built: !!C, mine: !!C && C.obs === Game.player.obstacles && C.b === S.bounds && C.n === Game.player.obstacles.length };
    // what the build costs, timed on a copy (the real grid stays in place)
    S._kidCells = null; let t = performance.now(); kidFreeCells(); out.buildMs = Math.round(performance.now() - t); S._kidCells = C;
    let worst = 0, at = 0;
    for (let f = 0; f < 360 && Game.mode === 'scenario'; f++) {
      t = performance.now(); stepGame(1 / 60); const ms = performance.now() - t;
      if (ms > worst) { worst = ms; at = +((f + 1) / 60).toFixed(2); }
    }
    out.worstMs = Math.round(worst); out.worstAt = at;
    out.same = S._kidCells === C;
    return out;
  });
  r.id = id; rows.push(r);
  console.log(`   ${id}: cells at BEGIN ${r.built} (this match's ${r.mine}); a build costs ${r.buildMs} ms; slowest of the first 6 s ${r.worstMs} ms at ${r.worstAt} s; still the same grid ${r.same}`);
}
for (const r of rows) {
  check(`${r.id}: the kids' cells are built at BEGIN, for this match's obstacles and bounds`, r.built && r.mine, r);
  check(`${r.id}: the first 6 s of play use them, no rebuild`, r.same, r);
}

// a squad order in a fresh round: its routes fill from the cells built at BEGIN
await g.scenario('bunratty_team_4v4');
const o = await page.evaluate(() => {
  const S = Game.scenario, C = S._kidCells;
  for (let f = 0; f < 60; f++) stepGame(1 / 60);
  giveSquadOrder('push');
  const t = performance.now(); stepGame(1 / 60); const ms = performance.now() - t;
  return { ms: Math.round(ms), same: S._kidCells === C, built: !!C };
});
console.log(`   bunratty_team_4v4, PUSH UP at 1 s: the next step ${o.ms} ms; same grid ${o.same}`);
check('a squad order uses the cells built at BEGIN', o.built && o.same, o);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
