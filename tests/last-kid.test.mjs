// v1.152 (Michael: A on "what next after the walkie", control room 4 Oct): the critic's "last kid comes looking".
// Found in play (critic, v1.123): in Squad Up, with our allies out, Brooke and Jamie (aggression 0.35 and 0.4, under
// the 0.45 march line) sat 32-50 m off in cover for the rest of the round; Four on Four's Mitchell and Owen the same
// for 150-195 s. Now the last one or two kids of a side who neither move 2 m nor fire with a line for 25-30 s get
// bored and come looking. Here: the player stands untaggable at spawn and never fires; we knock his allies out and
// the enemy's keenest kids, so only the campers are left, and watch who comes within 25 m.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });

// keep: the enemy kids left in; secs: how long to watch. Returns per-run timings.
// hideAt: an ally whose anchor (his backyard) the player stands in, out of the street.
const RUN = (keep, secs, hideAt) => page.evaluate(({ keep, secs, hideAt }) => {
  const out = (e) => { e.lives = 1; eliminateEnemy(e); };
  const host = hideAt && Game.scenario.enemies.find(e => e.charId === hideAt);
  if (host) { Game.player.pos.x = host.anchorPos.x; Game.player.pos.z = host.anchorPos.z; }
  for (const e of Game.scenario.enemies) {
    if (e.team === 'player' || !keep.includes(e.charId)) out(e);
  }
  const P = Game.player.pos;
  const r = { kidMin: {}, firstBored: null, firstNear: null, minDist: 1e9, boredCount: 0, losShots: 0, boredKids: [], mode: null, startDist: {} };
  for (const e of Game.scenario.enemies) if (e.health > 0) r.startDist[e.charId] = +Math.hypot(e.pos.x - P.x, e.pos.z - P.z).toFixed(1);
  const sp = spawnEnemyBB;
  r.kidLos = {};
  window.spawnEnemyBB = (e, t) => { if (e._hasLOSNow && !inOpeningHold()) { r.losShots++; r.kidLos[e.charId] = (r.kidLos[e.charId] || 0) + 1; } return sp(e, t); };
  let t = 0;
  for (let f = 0; f < secs * 60 && Game.mode === 'scenario'; f++) {
    stepGame(1 / 60); t += 1 / 60;
    for (const e of Game.scenario.enemies) {
      if (e.health <= 0 || e.team === 'player') continue;
      const d = Math.hypot(e.pos.x - P.x, e.pos.z - P.z);
      r.minDist = Math.min(r.minDist, d);
      r.kidMin[e.charId] = Math.min(r.kidMin[e.charId] ?? 1e9, +d.toFixed(1));
      if (r.firstNear == null && d < 25) r.firstNear = +t.toFixed(1);
      if (e._bored && r.firstBored == null) r.firstBored = +t.toFixed(1);
      if (e._bored && !r.boredKids.includes(e.charId)) r.boredKids.push(e.charId);
    }
  }
  window.spawnEnemyBB = sp;
  r.boredCount = Game.scenario.enemies.reduce((n, e) => n + (e._boredCount || 0), 0);
  r.minDist = +r.minDist.toFixed(1);
  r.mode = Game.mode;
  return r;
}, { keep, secs, hideAt });
const next = async (id) => { await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.scenario(id); };

// The critic's case: the player plays it safe in a backyard. Before v1.152 Jamie stood 45 m off in `advancing` against
// a fence post by a house corner all round, and in Four on Four Owen in the bulb fort (its closed wall faces the
// player) and Mitchell at his car never came nearer than 64 m and 68 m.
const squad = [];
for (let i = 0; i < 2; i++) { await next('winnmark_team_3v3'); squad.push(await RUN(['brooke', 'jamie'], 150, 'trey')); }
console.log('  Squad Up, player in Trey\'s backyard, Brooke and Jamie left, 150 s x2:', JSON.stringify(squad));
check('Squad Up: both last kids come within 25 m in every run', squad.every(r => r.kidMin.brooke < 25 && r.kidMin.jamie < 25), squad.map(r => r.kidMin));
check('Squad Up: they fire on the player with a line', squad.every(r => r.losShots > 0), squad.map(r => r.losShots));

const four = [];
for (let i = 0; i < 2; i++) { await next('bunratty_team_4v4'); four.push(await RUN(['mitchell', 'owen'], 150, 'sean')); }
console.log('  Four on Four, player in Sean\'s backyard, Mitchell and Owen left, 150 s x2:', JSON.stringify(four));
check('Four on Four: a last kid gets bored, 25-40 s in', four.every(r => r.firstBored != null && r.firstBored >= 25 && r.firstBored <= 40), four.map(r => r.firstBored));
// v1.169 fix-up: or, with a rifle's reach, within 50 m and firing on the player with a line. Depending on where the
// round stands when the two are left, Mitchell (AR) gets a line at 40-54 m, fires (which resets his boredom) and holds
// there: 40.2-46.8 m in about one run in six (CI, 6 Oct). Before v1.152 they never came nearer than 64 and 68 m.
const came = (r, k) => r.kidMin[k] < 30 || (r.kidMin[k] < 50 && (r.kidLos[k] || 0) > 0);
check('Four on Four: both last kids come within 30 m, or within 50 m firing with a line, in every run', four.every(r => came(r, 'mitchell') && came(r, 'owen')),
  four.map(r => ({ min: r.kidMin, los: r.kidLos })));
check('Four on Four: they fire on the player with a line', four.every(r => r.losShots > 0), four.map(r => r.losShots));

// Three of a side still in: nobody is a last kid, so nobody gets bored.
await next('winnmark_team_3v3');
const three = await RUN(['brooke', 'jamie', 'marcus'], 45);
console.log('  Squad Up, all three enemies in, 45 s:', JSON.stringify(three));
check('three of a side in: nobody gets bored', three.boredCount === 0, three.boredCount);

// A defend round has its timer: its kids never get bored.
await next('winnmark_last_stand');
const defend = await page.evaluate(() => {
  let bored = 0;
  for (let f = 0; f < 40 * 60 && Game.mode === 'scenario'; f++) { stepGame(1 / 60); for (const e of Game.scenario.enemies) if (e._bored) bored++; }
  return { bored, mode: Game.mode };
});
console.log('  Last Stand at the Fort, 40 s:', JSON.stringify(defend));
check('a defend round: nobody gets bored', defend.bored === 0, defend);

// The clock itself: still for 25-30 s on a side of one → bored, with an advance; a shot with a line settles him.
await next('winnmark_team_3v3');
const unit = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) if (e.charId !== 'jamie') { e.lives = 1; eliminateEnemy(e); }
  const j = Game.scenario.enemies.find(e => e.charId === 'jamie');
  Game.scenario.roundTime = 10;   // past the opening hold
  j.state = 'hiding'; j._boredAt = null; j._boredAfter = 25;
  const before = j._bored;
  for (let i = 0; i < 24 * 4; i++) { j.pos.x += 0; updateKidBoredom(j, 0.25); }
  const at24 = j._bored;
  for (let i = 0; i < 8; i++) updateKidBoredom(j, 0.25);
  const at26 = j._bored, state = j.state;
  j._hasLOSNow = true; spawnEnemyBB(j, Game.player.pos.clone());
  return { before, at24, at26, state, afterShot: j._bored, t: j._boredT };
});
console.log('  the clock, Jamie alone:', JSON.stringify(unit));
check('the clock: not bored at 24 s, bored at 26 s and advancing', !unit.at24 && unit.at26 && unit.state === 'advancing', unit);
check('the clock: a shot with a line settles him and restarts it', unit.afterShot === false && unit.t === 0, unit);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
