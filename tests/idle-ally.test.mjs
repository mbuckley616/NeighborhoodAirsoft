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
// v1.275 (D.28 step 3): with your first-time crew in Night Swim, Brooke crosses to Seth's side (v1.274), so Sean, the
// match's own ally, is the one read there
for (const [id, who, secs] of [['hollow_night_battle', 'rebecca', 120], ['club_night_4v4', 'sean', 120], ['hollow_night_battle', 'rebecca', 120]]) {
  await g.scenario(id);
  const r = await RUN(who, secs);
  console.log(`   ${id}:`, JSON.stringify(r));
  out.push({ id, ...r });
}
// fix-up (PR #75, CI on e67f110): a round where she walked 38.3 m on her own and was never idle long enough to get
// bored (23.3 s at most; the threshold is 25-30 s) failed for want of boredAt. The fault (v1.184) is an ally who walks
// 0 m all round; so she must get over 10 m out, and boredom must have come whenever she idled past 25 s.
// v1.308 fix-up: each kid's threshold is drawn from 25-30 s, so a round where she idled 25.9 s and then walked 34 m on her
// own, before her own threshold came, failed the old "under 25 s" bound; idling to 30 s unbored is the fault
check('Night Game in the Woods: idle Rebecca comes looking, over 10 m from her start', out.filter(r => r.who === 'rebecca').every(r => r.far > 10 && (r.boredAt || r.idleMax < 30)), out);
check('Night Swim: Sean walks over 10 m or keeps firing with a line', out.filter(r => r.who === 'sean').every(r => r.far > 10 || r.losShots >= 10), out);
check('no ally of ours stays idle (no 2 m, no shot with a line) past 30 s', out.every(r => r.idleMax <= 30.05), out);
check('nobody gets bored inside the first 25 s', out.every(r => r.boredAt == null || r.boredAt >= 25), out);

// v1.465 (decisions, Michael: B on Owen's wait at The Portables): an ally who has had nobody in sight for his first 8 s
// goes looking then, in every team match. Owen (aggression 0.2) started beside you and hid and peeked there 20-33 s.
const EARLY = [];
for (let i = 0; i < 2; i++) {
  await g.scenario('school_portables_3v3');
  EARLY.push(await page.evaluate(() => {
    const kid = Game.scenario.enemies.find(e => e.charId === 'owen' && e.team === 'player');
    if (!kid) return { missing: true };
    const start = { x: kid.pos.x, z: kid.pos.z };
    let lookAt = null, sawFirst = null, t = 0, at15 = 0;
    for (let f = 0; f < 60 * 15 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60); t += 1 / 60;
      if (sawFirst == null && kid._inReachNow) sawFirst = t;
      if (lookAt == null && kid._earlyLook) lookAt = t;
    }
    if (kid.health > 0) at15 = Math.hypot(kid.pos.x - start.x, kid.pos.z - start.z);
    return { lookAt: lookAt && +lookAt.toFixed(1), sawFirst: sawFirst && +sawFirst.toFixed(1), at15: +at15.toFixed(1), state: kid.state, mode: Game.mode };
  }));
}
console.log('   portables owen:', JSON.stringify(EARLY));
check('The Portables: Owen, nobody in sight, goes looking at 8 s (unless a foe came within his range first) and is over 4 m from his start by 15 s',
  EARLY.every(r => !r.missing && (r.sawFirst != null && r.sawFirst < 8 ? r.lookAt == null : (r.lookAt >= 7.5 && r.lookAt < 8.5 && (r.at15 > 4 || r.mode !== 'scenario')))), EARLY);

// A sniper ally and the VIP still hold: the lot's Brooke (sniper) is never marched by boredom, nor Protect Ryan's Ryan.
// v1.275: Night Game's Brooke, the sniper this read, crosses to Seth's side now
await g.scenario('lot_team_3v3');
const H = await page.evaluate(() => {
  for (let f = 0; f < 60 * 45 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
  return Game.scenario.enemies.filter(e => e.team === 'player' && (e.weapon === 'sniper' || e.vip || e.role === 'defender')).map(e => ({ n: e.charId, bored: !!(e._boredCount || e._earlyLook) }));
});
await g.scenario('bunratty_vip');
const V = await page.evaluate(() => {
  for (let f = 0; f < 60 * 45 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
  return Game.scenario.enemies.filter(e => e.vip).map(e => ({ n: e.charId, bored: !!(e._boredCount || e._earlyLook) }));
}).catch(e => ({ err: String(e).slice(0, 120) }));
console.log('   holders:', JSON.stringify(H), JSON.stringify(V));
check('snipers and VIPs hold', H.length > 0 && H.every(k => !k.bored) && Array.isArray(V) && V.length > 0 && V.every(k => !k.bored), { H, V });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
