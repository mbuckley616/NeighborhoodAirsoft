// Found in play (builder, v1.112): an advancing kid can be pinned in a pocket. Night Prowl's Seth stood 8.8 s between
// a parked sedan and a post (CI failed on it at 4117ad3). With a wall ahead and both sides blocked, the committed
// sidestep turned round at each side wall, or slid along it and back, and he shuttled for good. v1.121: no 0.5 m of
// progress in 2.5 s while wall-following (or two blocked turn-rounds) backs him out until a sidestep clears the pocket.
// A U of 6 m walls (3 m wide, 2.7 m deep, open at the back) round an advancing kid, the target 15 m ahead past its
// closed end; head-on and flanking either side. Then a control in the open: no back-off when nothing is in the way.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_seth_house');
// v1.123: the player can't be tagged for the whole suite. The stub used to come off after each run, and the page's own
// tick() keeps stepping between evaluate calls, so a BB in flight could end the round there and leave the next runs
// with nothing to step (seen 3 runs in 8: escapedAt null, 0 frames).
await page.evaluate(() => { const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); }; });
const run = (flank, pocket) => page.evaluate(([flank, pocket]) => {
  const P = Game.player.pos, k = Game.scenario.enemies[0], cx = 125, cz = 8;   // v1.341: on the east lot's front in Seth's area (the match's bounds)
  const box = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ, h: 6, baseY: scenarioGroundY(minX, minZ) - 1 });
  Game.player.obstacles = pocket ? [box(cx - 1.5, cx + 1.5, cz - 1.2, cz - 1.0), box(cx - 1.5, cx - 1.3, cz - 1.2, cz + 1.5), box(cx + 1.3, cx + 1.5, cz - 1.2, cz + 1.5)] : [];
  if (Game.scenario.cover) Game.scenario.cover = [];
  k.pos.x = cx; k.pos.z = cz; k.state = 'advancing'; k.flankSide = flank;
  for (const key of Object.keys(k)) if (/^_adv/.test(key)) delete k[key];
  let escapedAt = null, backFrames = 0, advFrames = 0;
  for (let f = 1; f <= 20 * 60 && Game.mode === 'scenario'; f++) {
    P.x = cx; P.z = cz - 15; Game.player.health = 99;
    stepGame(1 / 60);
    if (k.state === 'advancing') advFrames++;
    if (k._advBackT > 0) backFrames++;
    if (escapedAt == null && k.pos.z < cz - 1.6) escapedAt = +(f / 60).toFixed(2);
  }
  if (Game.mode !== 'scenario') return { flank, mode: Game.mode };
  return { flank, escapedAt, backFrames, advFrames, end: [+k.pos.x.toFixed(2), +k.pos.z.toFixed(2)], state: k.state };
}, [flank, pocket]);
for (const flank of [0, 1, -1]) {
  const r = await run(flank, true);
  console.log('  pocket, flank', flank, JSON.stringify(r));
  check(`flank ${flank}: the kid gets out of the pocket and past its wall within 12 s`, r.escapedAt != null && r.escapedAt < 12, r);
}
const c = await run(0, false);
console.log('  open ground', JSON.stringify(c));
check('open ground: he walks straight in, no back-off', c.escapedAt != null && c.escapedAt < 1 && c.backFrames === 0, c);
// v1.492 (critic, 24 Nov): the route field is filled nearest-first off a heap, each cell settled once. On Hollins Ridge's
// field the old first-in-first-out fill pushed each free cell about 104 times, 108-147 ms a call, and the night match
// hitched. The field must come out exactly as the old fill's (copied here as the reference), and in a few milliseconds.
await g.scenario('school_night_4v4');
const hs = await page.evaluate(() => {
  function refFill(gx, gz) {
    const { b, nx, nz, free } = kidFreeCells(), c = LADDER_CELL;
    const dist = new Float32Array(nx * nz).fill(Infinity);
    const fi = Math.max(0, Math.min(nx - 1, Math.round((gx - b.minX) / c))), fk = Math.max(0, Math.min(nz - 1, Math.round((gz - b.minZ) / c)));
    const q = [fi * nz + fk]; dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const cur = q[h], i = (cur / nz) | 0, k = cur % nz;
      for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
        if (!di && !dk) continue;
        const ii = i + di, kk = k + dk;
        if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
        const n = ii * nz + kk;
        if (!free[n] || (di && dk && (!free[ii * nz + k] || !free[i * nz + kk]))) continue;
        const nd = dist[cur] + (di && dk ? 1.414 : 1);
        if (nd < dist[n]) { dist[n] = nd; q.push(n); }
      }
    }
    return dist;
  }
  const goals = [Game.player.pos, ...(Game.scenario.enemies || []).slice(0, 4).map(e => e.pos)];
  let diff = 0, reached = 0, ms = 0;
  for (const p of goals) {
    const R = refFill(p.x, p.z), t = performance.now(), F = kidFieldTo(p.x, p.z); ms += performance.now() - t;
    for (let j = 0; j < R.length; j++) {
      if (R[j] === Infinity || F.dist[j] === Infinity) { if (R[j] !== F.dist[j]) diff = Infinity; continue; }
      reached++; diff = Math.max(diff, Math.abs(R[j] - F.dist[j]));
    }
  }
  return { goals: goals.length, reached, diff, perCallMs: +(ms / goals.length).toFixed(1) };
});
console.log('  Hollins Ridge field', JSON.stringify(hs));
check('the route field on Hollins Ridge equals the old fill, cell for cell', hs.reached > 50000 && hs.diff === 0, hs);
check('a route field on Hollins Ridge takes under 40 ms (the old fill took 108-147)', hs.perCallMs < 40, hs);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
