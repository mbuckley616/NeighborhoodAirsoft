// v1.130: Northcliff Trace, the fifth zone (backlog D.1, Michael: A). Checks the zone sits on the ladder after the
// market lot, its map pin is live (was the locked teaser) and opens its scenarios once the lot is cleared, the hill
// falls from the north tree wall to the creek, both scenarios build with every kid and the player clear of
// obstacles and on the ground, and a round plays: kids move or fire, nobody wedges, a team round trades lives.
// The player is untaggable and stands at the spawn, as in market-lot.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const ladder = await page.evaluate(() => {
  const keys = ZONE_LADDER.map(z => z.key);
  const done = Game.persist.completed;
  const ids = PIN_SCENARIO_GROUPS.northcliff || [];
  const before = { zone: isZoneUnlocked('northcliff'), first: isScenarioUnlocked(ids[0]) };
  done[zoneCapstoneId('market_lot')] = true;
  const after = { zone: isZoneUnlocked('northcliff'), first: isScenarioUnlocked(ids[0]), second: isScenarioUnlocked(ids[1]) };
  done[ids[0]] = true;
  const afterFirst = { second: isScenarioUnlocked(ids[1]) };
  delete done[zoneCapstoneId('market_lot')]; delete done[ids[0]];
  return { keys, ids, before, after, afterFirst, coming: ZONE_LADDER.some(z => z.comingSoon) };
});
check('Northcliff comes after the market lot (v1.155: then Hollins Ridge High; v1.157: then Willow Bend)',
  ladder.keys.join() === 'winnmark_court,bunratty_court,hollow,market_lot,northcliff,high_school,country_club,grocery_store', ladder.keys);
check('Northcliff runs the 1v1 opener, the twins 3v3, the Stoneglen course\'s two (v1.138, v1.144; the course v1.316), Bellfield Court\'s four (v1.186-v1.188) and its capture the flag (v1.189), the pool\'s 1v1 (v1.317), the creek-fort defend, then the night 4v4 (v1.131)',
  ladder.ids.join() === 'northcliff_1v1_evan,northcliff_twins_3v3,stoneglen_treehouse,stoneglen_hold_treehouse,bellfield_1v1_mason,bellfield_3v3,bellfield_defend_fort,bellfield_night_4v4,bellfield_ctf,pool_1v1_christian,northcliff_defend_creek,northcliff_night_4v4', ladder.ids);
check('no zone is "coming soon" any more', !ladder.coming);
check('Northcliff is locked on a new save', !ladder.before.zone && !ladder.before.first, ladder.before);
check('clearing the lot opens the first Northcliff scenario only', ladder.after.zone && ladder.after.first && !ladder.after.second, ladder.after);
check('the opener opens the twins', ladder.afterFirst.second, ladder.afterFirst);

// The map pin: a zone pin now, locked on a new save, and its scenario list once the lot is done.
const pin = await page.evaluate(() => {
  openMap();
  const p = document.querySelector('#worldMap .pin[data-scenario="northcliff"]');
  const lockedNew = p && p.classList.contains('locked'), label = p && p.querySelector('.label').textContent;
  p.click();
  const lockedInfo = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  Game.persist.completed[zoneCapstoneId('market_lot')] = true;
  refreshMapPinStates();
  const lockedAfter = p.classList.contains('locked');
  p.click();
  const info = document.getElementById('scenarioInfo');
  // v1.147: the rows are cards; a locked card has no START
  const rows = [...info.querySelectorAll('.sc-card')].map(b => ({ id: b.dataset.id, locked: b.classList.contains('locked') && !b.querySelector('.sc-go') }));
  delete Game.persist.completed[zoneCapstoneId('market_lot')];
  closeMap();
  return { lockedNew, label, lockedInfo, lockedAfter, rows, oldPin: !!document.querySelector('#worldMap .pin[data-scenario="locked"]') };
});
check('the old locked teaser pin is gone', !pin.oldPin);
check('the Northcliff pin is locked on a new save and says what opens it', pin.lockedNew && /Riverside Market/.test(pin.lockedInfo), pin);
check('after the lot, the pin is live and lists every scenario, only the opener playable',
  !pin.lockedAfter && pin.rows.length === ladder.ids.length && pin.rows[0].id === 'northcliff_1v1_evan' && !pin.rows[0].locked
  && pin.rows.slice(1).every(r => r.locked), pin);

// v1.138: the Stoneglen treehouse is its own flat backyard map (tests/treehouse.test.mjs), as Bellfield Court is (v1.186,
// tests/bellfield.test.mjs); these are Northcliff Trace's
for (const id of ladder.ids.filter(i => i.startsWith('northcliff_'))) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const gy = Game.scenario.groundY || (() => 0);
    const kids = Game.scenario.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    // the hill: north tree wall high, road in between, creek bank low
    const hill = { top: +gy(0, -32).toFixed(2), road: +gy(0, -2).toFixed(2), bank: +gy(0, 32).toFixed(2), creek: +gy(0, 38).toFixed(2) };
    const p = Game.player;
    // v1.131: the defend starts between the creek fort's wings, behind its back wall (fort at (-6, 29.4), faces N)
    const inFort = Math.abs(p.pos.x + 6) < 1.9 && p.pos.z > 28.3 && p.pos.z < 31.6;
    return { inFort, player: inside(p.pos.x, p.pos.z), feet: +(p.pos.y - gy(p.pos.x, p.pos.z)).toFixed(2), kids, hill, obstacles: p.obstacles.length };
  });
  check(`${id}: the player spawns clear of every obstacle`, !start.player, start);
  if (id === 'northcliff_defend_creek') check(`${id}: the player starts inside the creek fort's walls`, start.inFort, start);
  check(`${id}: every kid spawns clear of every obstacle`, start.kids.every(k => !k.stuck), start.kids.filter(k => k.stuck));
  check(`${id}: the hill falls north to south (top > road > bank > creek)`,
    start.hill.top > start.hill.road + 1.5 && start.hill.road > start.hill.bank + 1 && start.hill.bank > start.hill.creek, start.hill);
  const r = await page.evaluate(() => {
    // fix-up (PR #75, as market-lot's v1.141): the player is untaggable, but a hit on him is a life lost on his side
    let playerHits = 0;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) { playerHits++; return; } return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z] }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0)
      + (t === 'player' ? playerHits : 0);
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing';
    let f = 1, floatMax = 0;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => {
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { team, secs: Math.round((f - 1) / 60), shots, mode: Game.mode, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'), playerHits,
      enemyLives: kids.filter(k => k.team === 'enemy').reduce((a, k) => a + k.maxLives, 0),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, lives: k.lives, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  // fix-up (PR #75, as market-lot's v1.141 and v1.171): or the round is decided, every enemy life gone with none of
  // ours, or an ally kid out of lives. CI on 5e2e2a3: the twins 3v3 at 0-6, Andrew and Alex both out of lives.
  if (r.team) check(`${id}: both sides lose lives (within 120 s), or one side is down to its last lives`,
    (r.lostEnemy > 0 && (r.lostAlly > 0 || r.lostEnemy >= r.enemyLives)) || r.kids.some(k => k.t === 'player' && k.lives === 0), r);
  if (id === 'northcliff_defend_creek') check(`${id}: an attacker comes down past the road into the low yards (z > 8)`,
    r.kids.filter(k => k.t !== 'player').some(k => k.at[1] > 8), r.kids);
  // v1.131: Fernando's rifle holds the high yard by the bulb, (-15, -28), as the briefings say
  const fern = r.kids.find(k => k.n === 'Fernando');
  if (fern) check(`${id}: Fernando holds the high yard and shoots from it`, Math.hypot(fern.at[0] + 15, fern.at[1] + 28) < 6 && fern.fired > 0, fern);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
// v1.317 (D.55 step 7, Michael: A): the Northcliff pool, its own small map, and Round the Courts, a 1v1 with Christian
await g.scenario('pool_1v1_christian');
const pool = await page.evaluate(() => {
  const p = Game.player, c = Game.scenario.enemies[0], obs = p.obstacles, sc = SCENARIOS.pool_1v1_christian;
  const water = obs.find(o => o.surface === 'water'), fence = obs.filter(o => o.courtFence);
  // from where Christian starts, at his eye and crouched, to the player at four heights: no line
  let seen = 0;
  for (const my of [0.9, 1.3]) for (const y of [0.5, 0.9, 1.2, 1.5]) if (hasLineOfSight(c.pos.x, my, c.pos.z, p.pos.x, y, p.pos.z, obs)) seen++;
  // the fence: bodies stop at it, BBs and eyes go through; the water: bodies stop, BBs go through
  const fenceBody = collidesObstacles(6, 5, 0.3), gateBody = collidesObstacles(6, 11, 0.3);
  const fenceEyes = hasLineOfSight(0, 1.3, 5, 14, 1.3, 5, obs.filter(o => o.courtFence));
  return { name: sc.scenarioName, street: REGIONS.northcliff.streets[sc.street], who: c.charId, gun: c.weapon,
    dist: +Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z).toFixed(1), seen,
    water: water && { w: +(water.maxX - water.minX).toFixed(1), d: +(water.maxZ - water.minZ).toFixed(1), bbPass: !!water.bbPass, body: collidesObstacles((water.minX + water.maxX) / 2, (water.minZ + water.maxZ) / 2, 0.3) },
    fence: { n: fence.length, h: fence.length ? Math.min(...fence.map(o => o.h)) : 0, bbPass: fence.every(o => o.bbPass), body: fenceBody, gate: !gateBody, eyes: fenceEyes } };
});
console.log('  pool', JSON.stringify(pool));
check('Round the Courts is a 1v1 with Christian (pistol) at the Northcliff Pool', pool.name === 'Round the Courts' && pool.street === 'Northcliff Pool' && pool.who === 'christian' && pool.gun === 'pistol', pool);
check('the pool is 25 x 12 m of water that stops a body, not a BB', pool.water && pool.water.w === 25 && pool.water.d === 12 && pool.water.bbPass && pool.water.body, pool.water);
check('the courts\' 3 m fence stops a body but not a BB or an eye, and its west gate lets you through', pool.fence.n >= 8 && pool.fence.h === 3 && pool.fence.bbPass && pool.fence.body && pool.fence.gate && pool.fence.eyes, pool.fence);
check('you start 30-45 m from Christian, out of his sight (0 of 8 lines)', pool.dist > 30 && pool.dist < 45 && pool.seen === 0, pool);
const poolRound = await page.evaluate(() => {
  const hits = []; const o = applyBBHit; applyBBHit = (bb, t) => { if (t === Game.player) { hits.push(+Game.scenario.roundTime.toFixed(1)); return true; } return o(bb, t); };
  const c = Game.scenario.enemies[0], x0 = c.pos.x, z0 = c.pos.z; let far = 0;
  for (let i = 0; i < 60 * 60 && Game.mode === 'scenario'; i++) { stepGame(1 / 60); far = Math.max(far, Math.hypot(c.pos.x - x0, c.pos.z - z0)); }
  applyBBHit = o; return { first: hits[0] ?? null, far: +far.toFixed(1) };
});
console.log('  pool round', JSON.stringify(poolRound));
check('standing at the start, nobody tags you in the first 12 s, and in 60 s Christian comes looking (walks over 15 m)', (poolRound.first === null || poolRound.first >= 12) && poolRound.far > 15, poolRound);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.spin(60);

// screenshots by eye: down the street from the east entry, and across the low yards to the creek
await g.scenario('northcliff_1v1_evan');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
await g.shot('northcliff-street');
await page.evaluate(() => { const p = Game.player; p.pos.set(12, (Game.scenario.groundY || (() => 0))(12, 23) + 0.1, 23); p.yaw = Math.PI; stepGame(1 / 60); });
await g.shot('northcliff-creek');
await page.evaluate(() => { const p = Game.player; p.pos.set(9, (Game.scenario.groundY || (() => 0))(9, -29) + 0.1, -29); p.yaw = Math.PI * 0.9; stepGame(1 / 60); });
await g.shot('northcliff-uphill');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
