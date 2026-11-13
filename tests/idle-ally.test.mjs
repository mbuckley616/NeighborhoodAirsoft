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
    VOICE.log = [];   // v1.467: this round's lines only (the log runs on across rounds)
    let lookAt = null, sawFirst = null, t = 0, at15 = 0, from = null;
    for (let f = 0; f < 60 * 15 && Game.mode === 'scenario'; f++) {
      const before = kid.state;
      stepGame(1 / 60); t += 1 / 60;
      if (sawFirst == null && kid._inReachNow) sawFirst = t;
      if (lookAt == null && kid._earlyLook) { lookAt = t; from = before; }
    }
    if (kid.health > 0) at15 = Math.hypot(kid.pos.x - start.x, kid.pos.z - start.z);
    // v1.467: the line he says as he goes (id from the `looking` tables)
    const said = VOICE.log.filter(l => l.charId === 'owen' && l.category === 'looking').map(l => ({ t: l.t, id: l.id, line: l.said, walkie: !!l.walkie }));
    return { lookAt: lookAt && +lookAt.toFixed(1), from, sawFirst: sawFirst && +sawFirst.toFixed(1), at15: +at15.toFixed(1), state: kid.state, mode: Game.mode, said };
  }));
}
console.log('   portables owen:', JSON.stringify(EARLY));
check('The Portables: Owen, nobody in sight, goes looking at 8 s (unless a foe came within his range first) and is over 4 m from his start by 15 s',
  EARLY.every(r => !r.missing && (r.sawFirst != null && r.sawFirst < 8 ? r.lookAt == null : (r.lookAt >= 7.5 && r.lookAt < 8.5 && (r.at15 > 4 || r.mode !== 'scenario')))), EARLY);

// v1.476 (Found in play, critic 13 Nov): the early look read `_inReachNow` off ENGAGE_FAR, not what the gun carries. At
// First Time in the Woods your crew's Mitchell (AK, FAR 100 m, carry ~35 m) had a clear line to Seth's team 36-65 m off,
// read them as "in reach", never took the early look and sat in his spot all minute firing into the creek dip. Here one
// foe is pinned 42 m out with a clear line (beyond the AK's carry), the rest sent far off: Mitchell should see him but
// judge him out of reach and take the early look at ~8 s, setting out to close in. On v1.475's code `_inReachNow` was
// true, so the look never fired (`look` stays null) and he sat. We read the look firing and his handoff to advancing,
// not how far he gets: his advance crosses the creek dip, whose ground slows it by an amount that is not deterministic
// (0-24 m over 20 s in sampling here), so a distance bound would be flaky.
await g.scenario('hollow_skirmish_3v3');
const MID = await page.evaluate(() => {
  const kid = Game.scenario.enemies.find(e => e.charId === 'mitchell' && e.team === 'player');
  if (!kid || kid.weapon !== 'ak47') return { missing: true };
  const foes = Game.scenario.enemies.filter(e => e.team !== kid.team);
  const pin = foes[0], spot = { x: 1.0, z: -11.1 };            // ~42 m from Mitchell's start, with a line (beyond AK carry)
  foes.forEach((f, i) => { f.noFire = true; if (f !== pin) { f.pos.x = kid.pos.x + 80; f.pos.z = kid.pos.z - 80; } });
  const startDist = Math.hypot(spot.x - kid.pos.x, spot.z - kid.pos.z);   // the pinned foe's distance from his start (~42 m)
  let look = null, sawReach = false, sawLOS = false, sawAdvancing = false, t = 0;
  for (let f = 0; f < 60 * 16 && Game.mode === 'scenario'; f++) {
    pin.pos.x = spot.x; pin.pos.z = spot.z; pin.pos.y = scenarioGroundY(spot.x, spot.z); pin.health = Math.max(pin.health, 1);
    stepGame(1 / 60); t += 1 / 60;
    if (kid._hasLOSNow) sawLOS = true;
    if (kid._inReachNow) sawReach = true;
    if (look == null && kid._earlyLook) look = t;
    if (look != null && kid.state === 'advancing') sawAdvancing = true;
  }
  return { dist: +startDist.toFixed(1), reach: +kidGunReach('ak47').toFixed(1), sawLOS, sawReach, sawAdvancing, look: look && +look.toFixed(1), mode: Game.mode };
});
console.log('   woods mitchell:', JSON.stringify(MID));
check('First Time in the Woods: Mitchell sees a foe past his AK carry (42 m > ~35 m) but reads him out of reach',
  !MID.missing && MID.sawLOS && !MID.sawReach && MID.dist > MID.reach, MID);
check('First Time in the Woods: so he takes the early look at ~8 s and sets out to close in (advancing), not sit and fire into the dip',
  !MID.missing && MID.look != null && MID.look >= 7.5 && MID.look < 9 && MID.sawAdvancing, MID);

// v1.467 (decisions, Michael: B, ally callouts for the early look): Owen says he is going, once, within 6 s of leaving
// (beside you, so in earshot: no walkie), with a line from his own or his band's `looking` table. v1.471 fix-up: only when
// he leaves a spot (hiding or peeking); one already on the move at 8 s says nothing, by design (a round failed on that)
check('The Portables: Owen says one `looking` line within 6 s of going looking from his spot, in earshot',
  EARLY.every(r => r.lookAt == null || (r.from !== 'hiding' && r.from !== 'peeking') ? r.said.length === 0 : (r.said.length === 1 && r.said[0].t >= r.lookAt - 0.1 && r.said[0].t <= r.lookAt + 6.05 &&
    /^(owen\.looking\.|band\.low_agg\.looking\.)\d$/.test(r.said[0].id) && !r.said[0].walkie)), EARLY);
// out of earshot it comes over the walkie and onto the squad box; two allies sent on one frame both speak, in turn
const W = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  const mates = S.enemies.filter(e => e.team === 'player' && e.health > 0 && !e.vip && e.weapon !== 'sniper').slice(0, 2);
  mates.forEach((e, i) => {
    e.pos.x = P.x + 60 + i * 5; e.pos.z = P.z + 40; e.state = 'hiding'; e._earlyLookDone = false; e._bored = false; e._earlyLook = false;
    e._inReachNow = false; e._voiceCooldownUntil = 0; e._boredAt = { x: e.pos.x, z: e.pos.z };
  });
  S.roundTime = Math.max(S.roundTime || 0, 20); VOICE.globalCooldownUntil = 0; VOICE.walkieUntil = 0; VOICE.pending = [];
  VOICE.log = [];
  for (const e of mates) updateKidBoredom(e, 1 / 60);
  for (let f = 0; f < 60 * 8; f++) { S.roundTime += 1 / 60; voiceStep(); }
  const said = VOICE.log.filter(l => l.category === 'looking');
  return { mates: mates.map(e => e.charId), states: mates.map(e => e.state), said: said.map(l => ({ c: l.charId, t: l.t, walkie: !!l.walkie, line: l.said })), reply: S.squadReply && S.squadReply.line };
});
console.log('   walkie:', JSON.stringify(W));
check('out of earshot, both allies sent looking say so over the walkie, 4 s apart, and it shows on the squad box',
  W.mates.length === 2 && W.said.length === 2 && W.said.every(l => l.walkie) && new Set(W.said.map(l => l.c)).size === 2 &&
  W.said[1].t - W.said[0].t >= 3.9 && W.states.every(s => s === 'advancing') && W.said.some(l => l.line === W.reply), W);

// v1.471 (decisions, Michael: A, callouts for the late look too): an ally the 25-30 s clock sends says a `looking` line as
// he leaves his spot, as the 8 s look does, and no taunt; a kid of the other side the clock sends still taunts
const L = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  const prep = (e, x, z) => {
    e.pos.x = x; e.pos.z = z; e.state = 'hiding'; e._earlyLookDone = true; e._bored = false; e._inReachNow = false;
    e._voiceCooldownUntil = 0; e._boredAt = { x, z }; e._boredAfter = 25; e._boredT = 25.5;
  };
  const out = {};
  for (const [key, x, z] of [['near', P.x + 3, P.z + 2], ['far', P.x + 60, P.z + 40]]) {
    const mate = S.enemies.find(e => e.team === 'player' && e.health > 0 && !e.vip && e.weapon !== 'sniper' && e.role !== 'defender');
    prep(mate, x, z);
    S.roundTime = Math.max(S.roundTime || 0, 40) + 10; VOICE.globalCooldownUntil = 0; VOICE.walkieUntil = 0; VOICE.pending = []; VOICE.log = [];
    updateKidBoredom(mate, 1 / 60);
    const t0 = S.roundTime;
    for (let f = 0; f < 60 * 8; f++) { S.roundTime += 1 / 60; voiceStep(); }
    out[key] = { c: mate.charId, state: mate.state, bored: !!mate._bored, said: VOICE.log.filter(l => l.charId === mate.charId).map(l => ({ cat: l.category, id: l.id, dt: +(l.t - t0).toFixed(2), walkie: !!l.walkie })) };
  }
  // one already on the move says nothing
  const mover = S.enemies.find(e => e.team === 'player' && e.health > 0 && !e.vip && e.weapon !== 'sniper' && e.role !== 'defender');
  prep(mover, P.x + 3, P.z + 2); mover.state = 'flanking';
  S.roundTime += 10; VOICE.globalCooldownUntil = 0; VOICE.pending = []; VOICE.log = [];
  updateKidBoredom(mover, 1 / 60);
  for (let f = 0; f < 60 * 8; f++) { S.roundTime += 1 / 60; voiceStep(); }
  out.moving = { bored: !!mover._bored, said: VOICE.log.filter(l => l.charId === mover.charId).map(l => l.category) };
  return out;
});
console.log('   late look:', JSON.stringify(L));
check('the 25-30 s clock: an ally leaving his spot says one `looking` line (no taunt) within 6 s, in earshot beside you and over the walkie far off',
  L.near.bored && L.near.state === 'advancing' && L.near.said.length === 1 && L.near.said[0].cat === 'looking' && !L.near.said[0].walkie && L.near.said[0].dt <= 6.05 &&
  L.far.bored && L.far.said.length === 1 && L.far.said[0].cat === 'looking' && L.far.said[0].walkie && L.far.said[0].dt <= 6.05, L);
check('the 25-30 s clock: an ally already on the move says nothing', L.moving.bored && L.moving.said.length === 0, L);

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
