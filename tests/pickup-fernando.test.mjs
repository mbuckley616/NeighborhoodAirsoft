// v1.207 (Found in play, critic 13 Oct; Michael: A on "Fernando's rifle in a Northcliff pickup game by day"): by day
// Fernando keeps the high yard's nest (its defender role) but carries the AK he uses in Bellfield's matches; by night
// he keeps the night match's rifle. The critic's report: by day his rifle made 15 of 15 hits on a player walking at
// the nearest kid, out at 15-17 s every round.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const build = await page.evaluate(() => {
  const f = sc => { const e = sc.enemySetup.find(e => e.charId === 'fernando'); return e && { weapon: e.weapon, anchor: e.anchor, role: e.role || null }; };
  const day = f(buildPickupScenario({ map: 'northcliff', size: 4, tod: 'day', lives: 3 }));
  const night = f(buildPickupScenario({ map: 'northcliff', size: 4, tod: 'night', lives: 3 }));
  // picked onto another spot: a 1v1 with Fernando against you takes Mason's spot
  const moved = f(buildPickupScenario({ map: 'northcliff', size: 1, tod: 'day', lives: 3, ours: [], theirs: ['fernando'] }));
  const movedNight = f(buildPickupScenario({ map: 'northcliff', size: 1, tod: 'night', lives: 3, ours: [], theirs: ['fernando'] }));
  const ladder = SCENARIOS.northcliff_night_4v4.enemySetup.find(e => e.charId === 'fernando').weapon;
  const others = buildPickupScenario({ map: 'northcliff', size: 4, tod: 'day', lives: 3 }).enemySetup.filter(e => e.charId !== 'fernando')
    .every(e => e.weapon === SCENARIOS.northcliff_night_4v4.enemySetup.find(x => x.charId === e.charId).weapon);
  return { day, night, moved, movedNight, ladder, others };
});
check('a Northcliff pickup 4v4 by day: Fernando in the high yard\'s nest, a defender, with his AK', build.day.anchor === 'yard_n3'
  && build.day.role === 'defender' && build.day.weapon === 'ak47', build.day);
check('by night he keeps the rifle', build.night.anchor === 'yard_n3' && build.night.role === 'defender' && build.night.weapon === 'sniper', build.night);
check('picked onto another spot, he carries the AK by day and the rifle by night, with no role', build.moved.weapon === 'ak47'
  && !build.moved.role && build.movedNight.weapon === 'sniper', [build.moved, build.movedNight]);
check('the ladder\'s night match and every other kid\'s gun are unchanged', build.ladder === 'sniper' && build.others, build);

// Play it the critic's way: day 4v4, 3 lives, walk at the nearest kid; log who lands each hit on you
// v1.207 fix-up: the share swings from round to round (3 of 15, then 9 of 15 on a loaded full run), so the same five
// rounds are played with the rifle too, and the AK is measured against it
const play = async (rifle) => {
const rounds = [];
// v1.207 fix-up 2: eight rounds a gun, not five. Over five rounds the rifle's share ran 9-12 of 15 and the AK's 3-9
// of 15 (local, 13 Oct), and CI had the rifle at 11 of 15 against the old 4-in-5 line
for (let r = 0; r < 8; r++) {
  await page.evaluate(rifle => {   // with the rifle: v1.206's game, the day table empty while it is built
    if (Game.mode === 'scenario') endScenario('lose');
    const keep = PICKUP_DAY_GUNS.fernando; if (rifle) delete PICKUP_DAY_GUNS.fernando;
    buildPickupScenario({ map: 'northcliff', size: 4, tod: 'day', lives: 3 });
    PICKUP_DAY_GUNS.fernando = keep;
  }, rifle);
  await g.scenario('pickup_game');
  rounds.push(await page.evaluate(() => {
    const P = Game.player, hits = [];
    const orig = applyBBHit;
    window.applyBBHit = (bb, c) => { if (c === P && !(P._graceT > 0)) hits.push({ by: bb.enemyRef ? bb.enemyRef.charId : '?', t: +Game.scenario.roundTime.toFixed(1) }); return orig(bb, c); };
    try {
      for (let f = 0; f < 60 * 60 && Game.mode === 'scenario'; f++) {
        const foes = Game.scenario.enemies.filter(e => e.team !== 'player' && e.health > 0);
        const near = foes.sort((a, b) => Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z) - Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z))[0];
        if (near) { P.yaw = Math.atan2(-(near.pos.x - P.pos.x), -(near.pos.z - P.pos.z)); P.pitch = 0; }
        Game.keys.KeyW = !!near && Math.hypot(near.pos.x - P.pos.x, near.pos.z - P.pos.z) > 4;
        stepGame(1 / 60);
      }
    } finally { window.applyBBHit = orig; Game.keys.KeyW = false; }
    return { hits, out: Game.mode !== 'scenario', t: +Game.scenario.roundTime.toFixed(1) };
  }));
}
  const all = rounds.flatMap(r => r.hits), byF = all.filter(h => h.by === 'fernando').length;
  for (const r of rounds) console.log(`   ${rifle ? 'rifle' : 'AK'}: ${r.out ? 'out' : 'still in'} at ${r.t} s: ${r.hits.map(h => h.by + '@' + h.t).join(', ') || 'no hits'}`);
  return { byF, n: all.length, meanOut: +(rounds.reduce((a, r) => a + r.t, 0) / rounds.length).toFixed(1) };
};
// v1.221: a tag now sends you back to your start with 2 s of cover (decisions "Pickup Game: what is a life for you?",
// Michael: A), so one kid's lane can no longer take all three lives at once. Before, with the AK, Fernando took all
// three in 0.2-0.4 s at about 14 s in 8 of 8 rounds (24 of 24 hits; the rifle 19 of 24), and the rifle-against-AK
// comparison here measured that. Now the rounds are measured with the AK alone, as a player gets them.
const ak = await play(false);
console.log(`   Fernando landed ${ak.byF} of ${ak.n} hits with the AK (the critic: 15 of 15 with the rifle; v1.220: 24 of 24)`);
check('with the AK he lands under half of the hits on you', ak.n > 0 && ak.byF / ak.n < 0.5, ak);
check('and you last over 20 s on average (all three lives went by 14 s before v1.221)', ak.meanOut > 20, ak.meanOut);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
