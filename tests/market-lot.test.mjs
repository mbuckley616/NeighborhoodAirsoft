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
  const before = { lot: isZoneUnlocked('market_lot'), first: isScenarioUnlocked('lot_team_3v3') };
  done[zoneCapstoneId('hollow')] = true;
  const afterHollow = { lot: isZoneUnlocked('market_lot'), first: isScenarioUnlocked('lot_team_3v3'),
    second: isScenarioUnlocked('lot_night_4v4'), north: isZoneUnlocked('northcliff') };
  done.lot_team_3v3 = true; done.lot_night_4v4 = true;
  const afterLot = { north: isZoneUnlocked('northcliff') };
  delete done[zoneCapstoneId('hollow')]; delete done.lot_team_3v3; delete done.lot_night_4v4;
  return { keys, before, afterHollow, afterLot };
});
check('ladder: Winnmark, Bunratty, The Hollow, the market lot, Northcliff',
  ladder.keys.join() === 'winnmark_court,bunratty_court,hollow,market_lot,northcliff', ladder.keys);
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

for (const id of ['lot_team_3v3', 'lot_night_4v4']) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const kids = Game.scenario.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    return { player: inside(Game.player.pos.x, Game.player.pos.z), kids, obstacles: Game.player.obstacles.length };
  });
  check(`${id}: the player spawns clear of every obstacle`, !start.player, start);
  check(`${id}: every kid spawns clear of every obstacle`, start.kids.every(k => !k.stuck), start.kids.filter(k => k.stuck));
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(() => ({ from: null, longest: 0, path: 0, hitsTaken: 0 }));
    const hp0 = kids.map(k => k.health);
    // 60 s, then on (to 120 s) until both sides have lost a life: with three or four shooters a side, a clean
    // first minute for one side happens by chance (CI, v1.102: 0 enemy lives lost in 60 s; locally 1 run in 5).
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    let f = 1;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && livesLost('enemy') > 0 && livesLost('player') > 0) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => {
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;   // a respawn jump isn't walking
        if (m < 0.005 && k.state === 'advancing' && k.health > 0) { if (s.from == null) s.from = f; s.longest = Math.max(s.longest, f - s.from); } else s.from = null;
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { secs: Math.round((f - 1) / 60), shots, mode: Game.mode, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: +(st[i].longest / 60).toFixed(1) })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > 20, r.shots);
  // A kid holding one spot (a sniper, a pistol peeking over a bonnet) still has to shoot from it.
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  check(`${id}: both sides lose lives (within 120 s)`, r.lostEnemy > 0 && r.lostAlly > 0, r);
  check(`${id}: no kid stands still in advancing for 3 s or more`, r.kids.every(k => k.wedged < 3), r.kids);
  await g.shot(id);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
