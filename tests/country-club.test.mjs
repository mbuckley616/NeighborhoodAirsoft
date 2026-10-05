// v1.157: Willow Bend Country Club, the seventh zone (backlog D.1, Michael: A, control room 4 Oct: the country-club
// pool and golf course from his list, made-up name). Checks the zone sits on the ladder after Hollins Ridge High, its
// pin is locked on a new save and opens its scenarios once the school is cleared, the grounds hold what the answer
// named, the pool and the pond stop a body but not a BB, every anchor, kid and the player start clear of obstacles,
// and a round plays: kids move or fire, nobody wedges, the team round trades lives. As tests/high-school.test.mjs.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const ladder = await page.evaluate(() => {
  const keys = ZONE_LADDER.map(z => z.key);
  const done = Game.persist.completed;
  const ids = PIN_SCENARIO_GROUPS.country_club || [];
  const before = { zone: isZoneUnlocked('country_club'), first: isScenarioUnlocked(ids[0]) };
  done[zoneCapstoneId('high_school')] = true;
  const after = { zone: isZoneUnlocked('country_club'), first: isScenarioUnlocked(ids[0]), second: isScenarioUnlocked(ids[1]) };
  done[ids[0]] = true;
  const afterFirst = { second: isScenarioUnlocked(ids[1]) };
  delete done[zoneCapstoneId('high_school')]; delete done[ids[0]];
  return { keys, ids, before, after, afterFirst, region: REGIONS.horseshoe_bend.streets.willow_bend_cc };
});
check('the ladder ends with Willow Bend, after Hollins Ridge High', ladder.keys.slice(-2).join() === 'high_school,country_club', ladder.keys);
check('the club runs the 1v1 opener, then the 3v3', ladder.ids.join() === 'club_1v1_brooke,club_eighteenth_3v3', ladder.ids);
check('its street is in Horseshoe Bend', ladder.region === 'Willow Bend Country Club', ladder.region);
check('the club is locked on a new save', !ladder.before.zone && !ladder.before.first, ladder.before);
check('clearing the school opens the opener only', ladder.after.zone && ladder.after.first && !ladder.after.second, ladder.after);
check('the opener opens the 3v3', ladder.afterFirst.second, ladder.afterFirst);

const pin = await page.evaluate(() => {
  openMap();
  const p = document.querySelector('#worldMap .pin[data-scenario="country_club"]');
  const lockedNew = !!p && p.classList.contains('locked'), label = p && p.querySelector('.label').textContent;
  p.querySelector('.marker').click();
  const lockedInfo = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  Game.persist.completed[zoneCapstoneId('high_school')] = true;
  refreshMapPinStates();
  const lockedAfter = p.classList.contains('locked');
  p.querySelector('.marker').click();
  const info = document.getElementById('scenarioInfo');
  const rows = [...info.querySelectorAll('.sc-card')].map(b => ({ id: b.dataset.id, locked: b.classList.contains('locked') && !b.querySelector('.sc-go') }));
  const r = el => el.getBoundingClientRect();
  const area = r(document.querySelector('#worldMap .map-area'));
  const mine = [r(p.querySelector('.marker')), r(p.querySelector('.label'))];
  const inside = mine.every(b => b.left >= area.left - 1 && b.right <= area.right + 1 && b.top >= area.top - 1 && b.bottom <= area.bottom + 1);
  const others = [...document.querySelectorAll('#worldMap .pin')].filter(o => o !== p).flatMap(o => [r(o.querySelector('.marker')), r(o.querySelector('.label'))]);
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const overlaps = mine.filter(m => others.some(o => hit(m, o))).length;
  return { lockedNew, label, lockedInfo, lockedAfter, rows, inside, overlaps };
});
check('the club pin is locked on a new save and says to clear Hollins Ridge High', pin.lockedNew && /Hollins Ridge High/.test(pin.lockedInfo), pin);
check('the pin sits inside the map and covers no other pin', pin.inside && pin.overlaps === 0, pin);
check('after the school the pin is live and lists every scenario, only the opener playable',
  !pin.lockedAfter && pin.rows.length === ladder.ids.length && pin.rows[0].id === 'club_1v1_brooke' && !pin.rows[0].locked
  && pin.rows.slice(1).every(r => r.locked), pin);
await g.shot('country-club-map');
await page.evaluate(() => { delete Game.persist.completed[zoneCapstoneId('high_school')]; closeMap(); });

for (const id of ladder.ids) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const sc = Game.scenario, p = Game.player;
    const kids = sc.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    const built = buildCountryClubScene('default', 'day');
    const badAnchors = Object.entries(built.placements).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const badSpawns = Object.entries(built.playerSpawns).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    // what the grounds hold: the clubhouse front, the pool (16 x 7) and the pond as water, five carts, the cart barn
    const obs = p.obstacles;
    const water = obs.filter(o => o.surface === 'water' && o.bbPass && o.noStand);
    const pool = water.some(o => Math.abs(o.maxX - o.minX - 17.2) < 0.01 && o.maxZ - o.minZ === 7);
    const pond = water.some(o => o.shape === 'cylinder' && o.radius === 5);
    const carts = obs.filter(o => o.h === 1.2 && o.surface === 'metal').length;
    const barn = obs.some(o => o.minX === 22 && o.maxX === 38 && o.h === 3.6);
    return { kids, badAnchors, badSpawns, pool, pond, carts, barn, player: inside(p.pos.x, p.pos.z),
      scene: built.name, clubhouse: obs.some(o => o.maxZ === -30 && o.maxX - o.minX > 50) };
  });
  check(`${id}: every anchor and player spawn on the grounds is clear of obstacles`, !start.badAnchors.length && !start.badSpawns.length, start);
  check(`${id}: the player and every kid spawn clear of obstacles`, !start.player && start.kids.every(k => !k.stuck), start);
  check(`${id}: the grounds have the clubhouse, the pool and the pond as water, five carts and the cart barn`,
    start.clubhouse && start.pool && start.pond && start.carts === 5 && start.barn, start);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z], minD: 1e9, wet: 0 }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const wiped = () => ['enemy', 'player'].find(t => kids.filter(k => k.team === t).every(k => !npcInFight(k))) || null;
    const inWater = (x, z) => (x > -32 && x < -16 && z > -15 && z < -8) || Math.hypot(x - 17, z - 13) < 5;
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing';
    let f = 1;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      if (team && wiped()) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => {
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;
        if (inWater(k.pos.x, k.pos.z)) s.wet++;
        s.minD = Math.min(s.minD, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { team, secs: Math.round((f - 1) / 60), shots, wiped: team ? wiped() : null, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, wet: st[i].wet, nearest: +st[i].minD.toFixed(1), at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  check(`${id}: no kid ever stands in the pool or the pond`, r.kids.every(k => k.wet === 0), r.kids);
  if (r.team) check(`${id}: both sides lose lives, or one side is wiped out under fire (within 120 s)`,
    (r.lostEnemy > 0 && r.lostAlly > 0) || (r.wiped && r.kids.some(k => k.t === r.wiped && k.fired > 0)), r);
  else check(`${id}: Brooke comes off the pool deck to find the player (within 20 m)`, r.kids[0].nearest < 20, r.kids);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// The water: the player walks at the pool and the pond and stops at the edge; a jump doesn't land him on it; a BB
// fired across the pool at waist height flies over it.
await g.scenario('club_1v1_brooke');
const water = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) e.health = 0;
  const P = Game.player, out = {};
  const walk = (x, z, yaw, secs, jump) => {
    P.pos.set(x, 0, z); P.yaw = yaw; P.pitch = 0;
    for (let f = 0; f < secs * 60; f++) { Game.keys.KeyW = true; if (jump && f % 40 === 0) Game.keys.Space = true; stepGame(1 / 60); Game.keys.Space = false; }
    Game.keys.KeyW = false;
    return { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2), y: +P.pos.y.toFixed(2) };
  };
  out.pool = walk(-24, -2.5, 0, 3, false);          // north from the deck's south side, at the pool's south edge (z -8)
  out.poolJump = walk(-24, -2.5, 0, 3, true);
  out.pond = walk(17, 24, 0, 3, false);             // north up the fairway at the pond (its south rim at z 18)
  // a BB across the pool, west to east at 1 m, over the water's 16 m
  Game.scenario.bbs.length = 0;
  const bb = makeBB(new THREE.Vector3(-34, 1.0, -11.5), new THREE.Vector3(60, 0, 0), 'player');
  bb.curveStrength = 0; Game.scenario.bbs.push(bb);
  let flew = 0;
  for (let i = 0; i < 120 && Game.scenario.bbs.includes(bb); i++) { updateBBs(1 / 200); if (bb.canDamage) flew = Math.max(flew, bb.pos.x); }
  Game.scenario.bbs.length = 0;
  out.bbX = +flew.toFixed(1);
  return out;
});
console.log('  water:', JSON.stringify(water));
check('walking at the pool stops at its edge (z -8, plus the body radius)', water.pool.z > -8 && water.pool.z < -7.2, water.pool);
check('jumping at the pool does not land you on the water', water.poolJump.z > -8 && water.poolJump.y < 0.2, water.poolJump);
check('walking at the pond stops at its rim', Math.hypot(water.pond.x - 17, water.pond.z - 13) > 5, water.pond);
check('a BB crosses the pool (x past -16)', water.bbX > -15, water);

// screenshots by eye: the pool from the deck's corner, the 18th green, the clubhouse front, the course from the south
const view = (x, z, yaw, y = 0) => page.evaluate(([x, z, yaw, y]) => { const p = Game.player; p.pos.set(x, y, z); p.yaw = yaw; stepGame(1 / 60); }, [x, z, yaw, y]);
await view(-12, -3, Math.PI * 0.32); await g.shot('country-club-pool');
await view(30, 4, Math.PI * 0.1); await g.shot('country-club-green');
await view(2, -12, Math.PI * 0.1); await g.shot('country-club-front');
await view(5.5, 27, 0.12); await g.shot('country-club-start');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
