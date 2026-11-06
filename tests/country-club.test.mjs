// v1.157: Willow Bend Country Club, the seventh zone (backlog D.1, Michael: A, control room 4 Oct: the country-club
// pool and golf course from his list, made-up name). Checks the zone sits on the ladder after Hollins Ridge High, its
// pin is locked on a new save and opens its scenarios once the school is cleared, the grounds hold what the answer
// named, the pool and the pond stop a body but not a BB, every anchor, kid and the player start clear of obstacles,
// and a round plays: kids move or fire, nobody wedges, the team round trades lives. As tests/high-school.test.mjs.
// v1.445 (D.51, card fable/d51-willow-bend): the swim and tennis centre at real scale, in two areas. The grounds checks,
// the water walks, the BB across the pool, the rail walk and the screenshots are rewritten for it (they pinned the old
// club's coordinates); added: nothing past an area's edge is solid, Night Swim's starts see none of yours, and the draw
// calls stay within the plan's 900.
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
check('Willow Bend comes after Hollins Ridge High (v1.159: and before the store)', ladder.keys.slice(-3).join() === 'high_school,country_club,grocery_store', ladder.keys);
check('the club runs the 1v1 opener, the 3v3, the cart ride (v1.364), then the gazebo defend and the night 4v4 (v1.158)',
  ladder.ids.join() === 'club_1v1_brooke,club_eighteenth_3v3,club_cart_ride,club_defend_gazebo,club_night_4v4', ladder.ids);
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

const AREA = { club_1v1_brooke: 'pool', club_night_4v4: 'pool', club_eighteenth_3v3: 'course', club_defend_gazebo: 'course' };
for (const id of ladder.ids.filter(id => id !== 'club_cart_ride')) {   // v1.364: the cart ride is tests/golf-cart's
  await g.scenario(id);
  const start = await page.evaluate((area) => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const sc = Game.scenario, p = Game.player;
    const kids = sc.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    const built = buildCountryClubScene(area, 'day');
    const badAnchors = Object.entries(built.placements).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const badSpawns = Object.entries(built.playerSpawns).filter(([k]) => k !== 'gazebo' || area === 'course').filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const obs = p.obstacles, B = sc.bounds;
    const water = obs.filter(o => o.surface === 'water' && o.bbPass && o.noStand);
    // v1.445: the pool area: the L-shaped lap pool (25 x 14 with its 10 x 10 well), the free-form pool (two rounds), the
    // brown fence (1.8 m, solid) with its piers; the course area: the shelter's three walls, the yard's carts, the barn
    const lap = water.some(o => o.lapPool && o.maxX - o.minX === 25 && o.maxZ - o.minZ === 14);
    const well = water.some(o => o.divingWell && o.maxX - o.minX === 10);
    const freeForm = water.filter(o => o.freeForm && o.shape === 'cylinder').length;
    const fence = obs.filter(o => o.surface === 'wood' && o.h === 1.8 && !o.bbPass).length;
    const walls = obs.filter(o => o.shelterWall && o.h === 0.9).length;
    const carts = obs.filter(o => o.h === 1.2 && o.surface === 'metal').length;
    const barn = obs.some(o => o.minX === -58 && o.maxX === -34 && o.h === 5);
    const inShelter = Math.hypot(p.pos.x + 46.6, p.pos.z + 26) < 0.6;
    // nothing past the edge is solid: every obstacle but the edge walls reaches into the area
    const past = obs.filter(o => !(o.baseY === -4 && o.h === 6) && !(o.maxX > B.minX - 1 && o.minX < B.maxX + 1 && o.maxZ > B.minZ - 1 && o.minZ < B.maxZ + 1)).length;
    // draw calls in five views: your start, the area's four corners looking in
    const calls = [];
    const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
    for (const [x, z] of [[p.pos.x, p.pos.z], [B.minX + 3, B.minZ + 3], [B.maxX - 3, B.minZ + 3], [B.minX + 3, B.maxZ - 3], [B.maxX - 3, B.maxZ - 3]]) {
      const yaw = Math.atan2(-(cx - x), -(cz - z));
      Game.camera.position.set(x, 1.6, z); Game.camera.rotation.set(0, yaw, 0, 'YXZ'); Game.camera.updateMatrixWorld(true);
      Game.renderer.render(Game.scene, Game.camera); calls.push(Game.renderer.info.render.calls);
    }
    // the night rule: no start of theirs has a line to yours or your crew's
    let lines = 0;
    if (sc.timeOfDay === 'night' || SCENARIOS[sc.active].timeOfDay === 'night') {
      const foes = sc.enemies.filter(k => k.team !== 'player'), mine = [p, ...sc.enemies.filter(k => k.team === 'player')];
      for (const f of foes) for (const m of mine) if ([0.95, 1.32].some(ty => hasLineOfSight(f.pos.x, 1.05, f.pos.z, m.pos.x, ty, m.pos.z, obs))) lines++;
    }
    return { kids, badAnchors, badSpawns, lap, well, freeForm, fence, walls, carts, barn, inShelter, past, calls, lines, player: inside(p.pos.x, p.pos.z), scene: built.name };
  }, AREA[id]);
  check(`${id}: every anchor and player spawn in its area is clear of obstacles`, !start.badAnchors.length && !start.badSpawns.length, start);
  check(`${id}: the player and every kid spawn clear of obstacles`, !start.player && start.kids.every(k => !k.stuck), start);
  if (AREA[id] === 'pool') check(`${id}: the pool area has the L-shaped lap pool and its well, the free-form pool and the brown fence`,
    start.lap && start.well && start.freeForm === 2 && start.fence >= 6, start);
  else check(`${id}: the course area has the shelter's three walls and the yard's carts`, start.walls === 3 && start.carts >= 8, start);
  check(`${id}: nothing past the area's edge is solid (v1.445)`, start.past === 0, start.past);
  check(`${id}: at most 900 draw calls in any of five views (v1.445)`, Math.max(...start.calls) <= 900, start.calls);
  if (id === 'club_night_4v4') check(`${id}: at night no start of theirs has a line to yours or your crew's (v1.445)`, start.lines === 0, start.lines);
  if (id === 'club_defend_gazebo') check(`${id}: the player starts inside the shelter`, start.inShelter, start);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z], minD: 1e9, wet: 0 }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const wiped = () => ['enemy', 'player'].find(t => kids.filter(k => k.team === t).every(k => !npcInFight(k))) || null;
    const inWater = (x, z) => (x > 5 && x < 30 && z > -21 && z < -7) || (x > 30 && x < 40 && z > -27 && z < -17) || Math.hypot(x - 11, z + 36) < 5.5 || Math.hypot(x - 19, z + 35) < 5;
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
  check(`${id}: no kid ever stands in a pool`, r.kids.every(k => k.wet === 0), r.kids);
  if (r.team) check(`${id}: both sides lose lives, or one side is wiped out under fire (within 120 s)`,
    (r.lostEnemy > 0 && r.lostAlly > 0) || (r.wiped && r.kids.some(k => k.t === r.wiped && k.fired > 0)), r);
  else if (id === 'club_defend_gazebo') check(`${id}: an attacker comes across the fairway to within 15 m of the shelter`,
    Math.min(...r.kids.filter(k => k.t !== 'player').map(k => k.nearest)) < 15, r.kids);
  else check(`${id}: Brooke comes off the pool deck to find the player (within 20 m)`, r.kids[0].nearest < 20, r.kids);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// The water: the player walks at the lap pool and stops at its edge; a jump doesn't land him on it; a BB fired across
// it at waist height flies over it. The compound's fence stops a body and a BB.
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
  out.pool = walk(19, -2.5, 0, 3, false);           // north from the deck below the lap pool, at its south edge (z -7)
  out.poolJump = walk(19, -2.5, 0, 3, true);
  out.fence = walk(-1.5, 0, -Math.PI / 2, 3, false); // east from the lawn at the compound's fence (x 0)
  const shoot = (x, z, vx) => {
    Game.scenario.bbs.length = 0;
    const bb = makeBB(new THREE.Vector3(x, 1.0, z), new THREE.Vector3(vx, 0, 0), 'player');
    bb.curveStrength = 0; Game.scenario.bbs.push(bb);
    let flew = x;
    for (let i = 0; i < 160 && Game.scenario.bbs.includes(bb); i++) { updateBBs(1 / 200); if (bb.canDamage) flew = Math.max(flew, bb.pos.x); }
    Game.scenario.bbs.length = 0;
    return +flew.toFixed(1);
  };
  out.bbPool = shoot(3, -14, 60);     // west to east across the lap pool's 25 m
  out.bbFence = shoot(-6, 0, 60);     // at the fence from the lawn
  return out;
});
console.log('  water:', JSON.stringify(water));
check('walking at the lap pool stops at its edge (z -7, plus the body radius)', water.pool.z > -7 && water.pool.z < -6.2, water.pool);
check('jumping at the pool does not land you on the water', water.poolJump.z > -7 && water.poolJump.y < 0.2, water.poolJump);
check('the compound fence stops a body', water.fence.x < 0, water.fence);
check('a BB crosses the lap pool (x past 30)', water.bbPool > 30, water);
check('a BB stops at the compound fence (v1.445)', water.bbFence < 0.5, water);

// screenshots by eye: the deck from the west gate, the porch, the pickleball courts, your start; the course
const view = (x, z, yaw, y = 0) => page.evaluate(([x, z, yaw, y]) => { const p = Game.player; p.pos.set(x, y, z); p.yaw = yaw; stepGame(1 / 60); }, [x, z, yaw, y]);
await view(2, -11, -Math.PI * 0.55); await g.shot('country-club-pool');
await view(20, -12, Math.PI); await g.shot('country-club-front');
await view(-12, 6, 0.1); await g.shot('country-club-start');
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
await g.scenario('club_defend_gazebo');
// the shelter's walls stop a body (the player walks west across it and stops at its west wall)
const rail = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) e.health = 0;
  const P = Game.player; P.pos.set(-46.6, 0, -26); P.yaw = Math.PI / 2; P.pitch = 0;   // yaw π/2 faces -x, the west wall
  for (let f = 0; f < 120; f++) { Game.keys.KeyW = true; stepGame(1 / 60); }
  Game.keys.KeyW = false;
  return { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2) };
});
check('walking west inside the shelter stops at its wall (x -48.5)', rail.x > -48.5 && rail.x < -46.6, rail);
await view(-46.6, -26, -Math.PI / 2); await g.shot('country-club-defend');
await view(-80, -1.5, 0); await g.shot('country-club-green');
await view(-100, -30, Math.PI / 2); await g.shot('country-club-river');
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
await g.scenario('club_night_4v4');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
await view(-12, 6, 0.1); await g.shot('country-club-night');
await view(2, -11, -Math.PI * 0.55); await g.shot('country-club-night-pool');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
