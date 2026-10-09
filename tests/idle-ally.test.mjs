// v1.184 (decisions D.19, Michael: C): an idle ally goes looking. In team matches your allies start beside you, and a
// cautious one (aggression under 0.45) never marched: with no enemy in sight she hid and peeked all round. Night Swim's
// Brooke walked 0 m in 300 s in 2 of 3 critic rounds, Night Game in the Woods' Rebecca 0 m in 8 of 8. Now any ally who
// neither moves 2 m nor fires with a line for 25-30 s gets bored and comes looking, as the last kid of a side does
// (v1.152), in every match; snipers, defenders and VIPs still hold. Here the player holds his start, untaggable and
// never firing, and we read how far each named ally gets from where she stood at BEGIN, how often she fires with a
// line (a kid who is fighting never gets bored), and the longest any of our allies goes idle.
// `SRC=<file>` runs it against another build (the numbers for the old one are in the devlog).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });

const RUN = (who, secs) => page.evaluate(({ who, secs }) => {
  const kid = Game.scenario.enemies.find(e => e.charId === who && e.team === 'player');
  if (!kid) return { missing: true };
  let start = null, far = 0, boredAt = null, t = 0, losShots = 0, idleMax = 0;
  const sp = spawnEnemyBB;
  window.spawnEnemyBB = (e, tp) => { const n = Game.scenario.bbs.length; const r = sp(e, tp); if (e === kid && e._hasLOSNow && Game.scenario.bbs.length > n) losShots++; return r; };
  for (let f = 0; f < secs * 60 && Game.mode === 'scenario'; f++) {
    stepGame(1 / 60); t += 1 / 60;
    // the longest any ally of ours goes without moving 2 m or firing with a line, before boredom takes him
    for (const e of Game.scenario.enemies) if (e.team === 'player' && e.health > 0 && !e._bored) idleMax = Math.max(idleMax, e._boredT || 0);
    if (!start && !inOpeningHold()) start = { x: kid.pos.x, z: kid.pos.z };
    if (start && kid.health > 0) far = Math.max(far, Math.hypot(kid.pos.x - start.x, kid.pos.z - start.z));
    if (boredAt == null && kid._boredCount) boredAt = t;
  }
  const allyBored = Game.scenario.enemies.filter(e => e.team === 'player' && e._boredCount).map(e => e.charId);
  window.spawnEnemyBB = sp;
  return { who, far: +far.toFixed(1), losShots, idleMax: +idleMax.toFixed(1), boredAt: boredAt && +boredAt.toFixed(1), allyBored, t: +t.toFixed(1), mode: Game.mode };
}, { who, secs });

const out = [];
for (const [id, who, secs] of [['hollow_night_battle', 'rebecca', 120], ['club_night_4v4', 'brooke', 120], ['hollow_night_battle', 'rebecca', 120]]) {
  await g.scenario(id);
  const r = await RUN(who, secs);
  console.log(`   ${id}:`, JSON.stringify(r));
  out.push({ id, ...r });
}
check('Night Game in the Woods: idle Rebecca comes looking, over 10 m from her start', out.filter(r => r.who === 'rebecca').every(r => r.far > 10 && r.boredAt), out);
check('Night Swim: Brooke walks over 10 m or keeps firing with a line', out.filter(r => r.who === 'brooke').every(r => r.far > 10 || r.losShots >= 10), out);
check('no ally of ours stays idle (no 2 m, no shot with a line) past 30 s', out.every(r => r.idleMax <= 30.05), out);
check('nobody gets bored inside the first 25 s', out.every(r => r.boredAt == null || r.boredAt >= 25), out);

// A sniper ally and the VIP still hold: Night Game's Brooke (sniper) is never marched by boredom, nor Protect Ryan's Ryan.
await g.scenario('hollow_night_battle');
const H = await page.evaluate(() => {
  for (let f = 0; f < 60 * 45 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
  return Game.scenario.enemies.filter(e => e.team === 'player' && (e.weapon === 'sniper' || e.vip || e.role === 'defender')).map(e => ({ n: e.charId, bored: !!e._boredCount }));
});
await g.scenario('bunratty_vip');
const V = await page.evaluate(() => {
  for (let f = 0; f < 60 * 45 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
  return Game.scenario.enemies.filter(e => e.vip).map(e => ({ n: e.charId, bored: !!e._boredCount }));
}).catch(e => ({ err: String(e).slice(0, 120) }));
console.log('   holders:', JSON.stringify(H), JSON.stringify(V));
check('snipers and VIPs hold', H.length > 0 && H.every(k => !k.bored) && Array.isArray(V) && V.length > 0 && V.every(k => !k.bored), { H, V });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
