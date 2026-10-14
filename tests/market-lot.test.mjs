// v1.102: the Riverside Market lot, the parking-lot zone (backlog D.1, Michael: B). Checks the zone sits on the
// ladder after The Hollow and before Northcliff, its map pin doesn't overlap another, both scenarios build with
// every kid and the player clear of obstacles, and a round plays: kids move, nobody wedges, both sides trade hits.
// The player is untaggable and stands at the spawn, so the round runs at least 60 s (up to 120 s, see below).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const ladder = await page.evaluate(() => {
  const keys = ZONE_LADDER.map(z => z.key);
  const done = Game.persist.completed;
  const ids = PIN_SCENARIO_GROUPS.market_lot;
  const before = { lot: isZoneUnlocked('market_lot'), first: isScenarioUnlocked(ids[0]) };
  done[zoneCapstoneId('hollow')] = true;
  const afterHollow = { lot: isZoneUnlocked('market_lot'), first: isScenarioUnlocked(ids[0]),
    second: isScenarioUnlocked(ids[1]), north: isZoneUnlocked('northcliff') };
  done[ids[ids.length - 1]] = true;
  const afterLot = { north: isZoneUnlocked('northcliff') };
  delete done[zoneCapstoneId('hollow')]; delete done[ids[ids.length - 1]];
  return { keys, ids, before, afterHollow, afterLot };
});
check('ladder: Winnmark, Bunratty, The Hollow, the market lot, Northcliff, Hollins Ridge High (v1.155), Willow Bend (v1.157)',
  ladder.keys.join() === 'winnmark_court,bunratty_court,hollow,market_lot,northcliff,high_school,country_club,grocery_store', ladder.keys);
check('the lot runs 1v1, 3v3, defend, free-for-all, VIP (v1.170), night 4v4 (v1.103)',
  ladder.ids.join() === 'lot_1v1_marcus,lot_team_3v3,lot_defend_store,lot_ffa,lot_vip_night,lot_night_4v4', ladder.ids);
const SCENARIOS_VIP = ['lot_vip_night'];
check('the lot is locked on a new save', !ladder.before.lot && !ladder.before.first, ladder.before);
check('clearing The Hollow opens the lot’s first scenario only', ladder.afterHollow.lot && ladder.afterHollow.first
  && !ladder.afterHollow.second && !ladder.afterHollow.north, ladder.afterHollow);
check('clearing the lot is what Northcliff now waits on', ladder.afterLot.north, ladder.afterLot);

// The map: every pin's marker and label clear of every other pin's.
const pins = await page.evaluate(() => {
  document.getElementById('worldMap').classList.add('active');
  refreshMapPinStates();
  const out = [...document.querySelectorAll('#worldMap .pin')].map(p => {
    const rs = [p.querySelector('.marker'), p.querySelector('.label')].map(e => e.getBoundingClientRect());
    return { key: p.dataset.scenario, locked: p.classList.contains('locked'), label: p.querySelector('.label').textContent,
      rects: rs.map(r => [r.left, r.top, r.right, r.bottom].map(v => Math.round(v))) };
  });
  document.getElementById('worldMap').classList.remove('active');
  return out;
});
const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const lotPin = pins.find(p => p.key === 'market_lot');
const overlaps = pins.filter(p => p !== lotPin && p.rects.some(a => lotPin.rects.some(b => hit(a, b)))).map(p => p.key);
check('the map has a Riverside Market pin, locked on a new save', lotPin && lotPin.locked, lotPin);
check('the lot pin overlaps no other pin', overlaps.length === 0, overlaps);

// v1.170: the VIP match is played in tests/vip.test.mjs (its VIPs hold a spot by design and the rest come back)
for (const id of ladder.ids.filter(i => !SCENARIOS_VIP.includes(i))) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const kids = Game.scenario.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    return { player: inside(Game.player.pos.x, Game.player.pos.z), kids, obstacles: Game.player.obstacles.length };
  });
  check(`${id}: the player spawns clear of every obstacle`, !start.player, start);
  check(`${id}: every kid spawns clear of every obstacle`, start.kids.every(k => !k.stuck), start.kids.filter(k => k.stuck));
  const r = await page.evaluate(() => {
    // v1.141: the player is untaggable, but a hit on him is a life lost on his side in a real round (one life: the
    // round). The enemy kids aim at him a great deal, so his side's losses count his hits too (backlog Found in play).
    let playerHits = 0;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) { playerHits++; return; } return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    // Wedged: seconds in a row in 'advancing' with under 0.25 m of net movement per second. Net, not per frame: a
    // kid jittering between two bumpers moves a few mm every frame and still goes nowhere (v1.103).
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z] }));
    // 60 s, then on (to 120 s) until both sides have lost a life: with three or four shooters a side, a clean
    // first minute for one side happens by chance (CI, v1.102: 0 enemy lives lost in 60 s; locally 1 run in 5).
    // v1.103: team battles only; the other lot scenarios stop at 60 s.
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0)
      + (t === 'player' ? playerHits : 0);
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing' && !scd.ffa;
    let f = 1;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => {
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;   // a respawn jump isn't walking
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    const hurt = kids.filter(k => k.lives < k.maxLives || k.health <= 0).length;
    return { team, hurt, secs: Math.round((f - 1) / 60), shots, mode: Game.mode, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'), playerHits,
      enemyLives: kids.filter(k => k.team === 'enemy').reduce((a, k) => a + k.maxLives, 0),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state, lives: k.lives })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > 10, r.shots);
  // A kid holding one spot (a sniper, a pistol peeking over a bonnet) still has to shoot from it.
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  // v1.141: or the round is decided: every enemy kid is down to his last life with none of the player's side lost.
  // That is an ally camping the enemy respawn (CI on v1.140: Eric at (0.8, −18.1), 9–0); a design question, not a wedge.
  // v1.171 fix-up: or the other way round, an ally kid is out of lives. CI, 6 Oct (twice): Eric spent his three by
  // ~34 s, Brooke's rifle held at the road end, and with the player standing idle the enemy lost none in 120 s (locally
  // every one of 24 rounds took at least one enemy life, two only one).
  if (r.team) check(`${id}: both sides lose lives (within 120 s), or one side is down to its last lives`,
    (r.lostEnemy > 0 && (r.lostAlly > 0 || r.lostEnemy >= r.enemyLives)) || r.kids.some(k => k.t === 'player' && k.lives === 0), r);
  if (id === 'lot_ffa') check(`${id}: the kids tag each other`, r.hurt >= 2 || r.mode === 'result', r);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await g.shot(id);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
