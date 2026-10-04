// v1.153 (Michael: A on "after the last kid comes looking", control room 4 Oct): the critic's stuck-kid sweep
// (proposals, 30 Sep). Every stuck kid so far was found by hand, one map at a time (v1.98-v1.100, v1.103, v1.152's
// bulb fort and house corner). This plays every match for 60 s with hits on the player dropped, twice: the player
// standing at his spawn, and the player walked up to 10 m toward the nearest enemy. It fails on any living kid of
// either side, more than 2.5 m from the player, who holds a moving state (advancing, repositioning, chasing, deploying,
// retreating) within 1 m of one spot for more than 15 s, and prints the kid, map, spot, state and seconds, a
// ready-made backlog line. Sniper nests, `hiding`, `peeking` and `shooting` are holding still on purpose.
// The sweep takes about 20 minutes of one browser, so it runs as four suites, stuck-sweep-1 … -4, each every fourth
// match, one per CI shard. `ONLY=<id>[,<id>]` sweeps just those; `SECS=` shortens the watch, `LIMIT=` moves the line.
import { boot, check } from './game.mjs';

// Found by the sweep and filed under docs/backlog.md's Found in play, not yet fixed: printed as KNOWN, not failed.
// Each names the match, the kid and the spot (within 2 m); delete the line with the fix, so the sweep guards it again.
const KNOWN = [
  { id: 'bunratty_ffa', kid: 'nick', at: [5.5, -28.2] },   // v1.153: 7-15.5 s in advancing, 2 of 5 walked runs
];

export async function sweep(part) {
  const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
  await g.bedroom();
  await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });

  const SECS = +(process.env.SECS || 60), LIMIT = +(process.env.LIMIT || 15);
  let ids = await page.evaluate(() => Object.keys(SCENARIOS).filter(id => id !== 'winnmark_tutorial'));
  if (process.env.ONLY) ids = process.env.ONLY.split(',');
  else ids = ids.filter((_, i) => i % 4 === part - 1);

  const SWEEP = (walk) => page.evaluate(({ walk, SECS, LIMIT }) => {
    Game.player._infected = true;   // a tagger's touch doesn't end the round either (as tests/taggers does)
    const MOVING = ['advancing', 'repositioning', 'chasing', 'deploying', 'retreating'];
    const P = Game.player, kids = Game.scenario.enemies;
    let walked = 0;
    if (walk) {
      // toward the nearest enemy, up to 10 m or 8 s, through the game's own movement (W held, facing him)
      const foes = kids.filter(e => e.team !== 'player' && e.health > 0);
      const near = foes.sort((a, b) => Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z) - Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z))[0];
      const x0 = P.pos.x, z0 = P.pos.z;
      for (let f = 0; f < 8 * 60 && near && Game.mode === 'scenario'; f++) {
        P.yaw = Math.atan2(-(near.pos.x - P.pos.x), -(near.pos.z - P.pos.z)); P.pitch = 0;
        Game.keys['KeyW'] = true; stepGame(1 / 60);
        walked = Math.hypot(P.pos.x - x0, P.pos.z - z0);
        if (walked >= 10) break;
      }
      Game.keys['KeyW'] = false;
    }
    const st = kids.map(k => ({ mark: [k.pos.x, k.pos.z], run: 0, worst: 0, at: null, state: null, shots: 0, runShots: 0 }));
    const sp = spawnEnemyBB;
    window.spawnEnemyBB = (e, t) => { const i = kids.indexOf(e); if (i >= 0) st[i].runShots++; return sp(e, t); };
    let t = 0;
    try {
      for (let f = 1; f <= SECS * 60 && Game.mode === 'scenario'; f++) {
        stepGame(1 / 60); t += 1 / 60;
        if (f % 30) continue;
        kids.forEach((k, i) => {
          const s = st[i];
          // a kid at the player has arrived, not stuck (Infection's taggers huddle on an untaggable player)
          const atPlayer = Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z) < 2.5;
          if (k.health > 0 && MOVING.includes(k.state) && !atPlayer && Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]) < 1) {
            s.run += 0.5;
            if (s.run > s.worst) { s.worst = s.run; s.at = [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)]; s.state = k.state; s.shots = s.runShots; }
          } else { s.run = 0; s.runShots = 0; s.mark = [k.pos.x, k.pos.z]; }
        });
      }
    } finally { window.spawnEnemyBB = sp; }
    return { t: +t.toFixed(1), mode: Game.mode, walked: +walked.toFixed(1),
      kids: kids.map((k, i) => ({ id: k.charId, team: k.team === 'player' ? 'ally' : 'enemy', role: k.role, worst: st[i].worst, at: st[i].at, state: st[i].state, shots: st[i].shots })) };
  }, { walk, SECS, LIMIT });

  const stuck = [];
  const t0 = Date.now();
  for (const id of ids) {
    for (const walk of [false, true]) {
      await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
      await g.scenario(id);
      const r = await SWEEP(walk);
      const worst = r.kids.reduce((a, k) => k.worst > a.worst ? k : a, { worst: 0 });
      console.log(`  ${id} ${walk ? `walked ${r.walked} m` : 'at spawn'}: ${r.t} s, worst ${worst.id || '-'} ${worst.worst} s${worst.state ? ` ${worst.state} at (${worst.at})` : ''}`);
      for (const k of r.kids) {
        if (k.worst <= LIMIT) continue;
        const known = KNOWN.some(n => n.id === id && n.kid === k.id && Math.hypot(n.at[0] - k.at[0], n.at[1] - k.at[1]) < 2);
        if (known) console.log(`  KNOWN ${id}: ${k.id} ${k.worst} s in ${k.state} at (${k.at}) (backlog, Found in play)`);
        else stuck.push(`${id} (${walk ? 'player walked toward him' : 'player at spawn'}): ${k.id} (${k.team}, ${k.role}) ${k.worst} s in ${k.state} within 1 m of (${k.at}), ${k.shots} shots`);
      }
    }
  }
  console.log(`  ${ids.length} matches x2 in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const s of stuck) console.log('  STUCK ' + s);
  check(`part ${part}: no kid away from the player holds a moving state within 1 m for over ${LIMIT} s (${ids.length} matches, two ways each)`, stuck.length === 0, stuck);
  check('no page errors', g.errs.length === 0, g.errs);
  await g.close();
}
