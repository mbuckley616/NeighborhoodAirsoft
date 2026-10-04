// v1.155: Hollins Ridge High, the sixth zone (backlog D.1, Michael: A, control room 4 Oct: a high school's grounds,
// made-up name: fields, bleachers, portables). Checks the zone sits on the ladder after Northcliff, its map pin is
// locked on a new save and opens its scenarios once Northcliff is cleared, the grounds hold what the answer named,
// every anchor, kid and the player start clear of obstacles, and a round plays: kids move or fire, nobody wedges, the
// team round trades lives. The player is untaggable and stands at the spawn, as in northcliff.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const ladder = await page.evaluate(() => {
  const keys = ZONE_LADDER.map(z => z.key);
  const done = Game.persist.completed;
  const ids = PIN_SCENARIO_GROUPS.high_school || [];
  const before = { zone: isZoneUnlocked('high_school'), first: isScenarioUnlocked(ids[0]) };
  done[zoneCapstoneId('northcliff')] = true;
  const after = { zone: isZoneUnlocked('high_school'), first: isScenarioUnlocked(ids[0]), second: isScenarioUnlocked(ids[1]) };
  done[ids[0]] = true;
  const afterFirst = { second: isScenarioUnlocked(ids[1]) };
  delete done[zoneCapstoneId('northcliff')]; delete done[ids[0]];
  return { keys, ids, before, after, afterFirst, region: REGIONS.east_roswell.streets.hollins_ridge_high };
});
check('the ladder ends with Hollins Ridge High, after Northcliff', ladder.keys.slice(-2).join() === 'northcliff,high_school', ladder.keys);
check('the school runs the 1v1 opener, the portables 3v3, then the portables defend and the night 4v4 (v1.156)',
  ladder.ids.join() === 'school_1v1_tyler,school_portables_3v3,school_defend_portables,school_night_4v4', ladder.ids);
check('its street is in East Roswell', ladder.region === 'Hollins Ridge High', ladder.region);
check('the school is locked on a new save', !ladder.before.zone && !ladder.before.first, ladder.before);
check('clearing Northcliff opens the opener only', ladder.after.zone && ladder.after.first && !ladder.after.second, ladder.after);
check('the opener opens the 3v3', ladder.afterFirst.second, ladder.afterFirst);

const pin = await page.evaluate(() => {
  openMap();
  const p = document.querySelector('#worldMap .pin[data-scenario="high_school"]');
  const lockedNew = !!p && p.classList.contains('locked'), label = p && p.querySelector('.label').textContent;
  p.querySelector('.marker').click();
  const lockedInfo = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  Game.persist.completed[zoneCapstoneId('northcliff')] = true;
  refreshMapPinStates();
  const lockedAfter = p.classList.contains('locked');
  p.querySelector('.marker').click();
  const info = document.getElementById('scenarioInfo');
  const rows = [...info.querySelectorAll('.sc-card')].map(b => ({ id: b.dataset.id, locked: b.classList.contains('locked') && !b.querySelector('.sc-go') }));
  // the pin's marker and label sit inside the map and overlap no other pin's label
  const r = el => el.getBoundingClientRect();
  const area = r(document.querySelector('#worldMap .map-area'));
  const mine = [r(p.querySelector('.marker')), r(p.querySelector('.label'))];
  const inside = mine.every(b => b.left >= area.left - 1 && b.right <= area.right + 1 && b.top >= area.top - 1 && b.bottom <= area.bottom + 1);
  const others = [...document.querySelectorAll('#worldMap .pin')].filter(o => o !== p).flatMap(o => [r(o.querySelector('.marker')), r(o.querySelector('.label'))]);
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const overlaps = mine.filter(m => others.some(o => hit(m, o))).length;
  return { lockedNew, label, lockedInfo, lockedAfter, rows, inside, overlaps };
});
check('the school pin is locked on a new save and says to clear Northcliff', pin.lockedNew && /Northcliff/.test(pin.lockedInfo), pin);
check('the pin sits inside the map and covers no other pin', pin.inside && pin.overlaps === 0, pin);
check('after Northcliff the pin is live and lists every scenario, only the opener playable',
  !pin.lockedAfter && pin.rows.length === ladder.ids.length && pin.rows[0].id === 'school_1v1_tyler' && !pin.rows[0].locked
  && pin.rows.slice(1).every(r => r.locked), pin);
await g.shot('high-school-map');
await page.evaluate(() => { delete Game.persist.completed[zoneCapstoneId('northcliff')]; closeMap(); });

for (const id of ladder.ids) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const sc = Game.scenario, p = Game.player;
    const kids = sc.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    const built = buildHighSchoolScene('default', 'day');
    const badAnchors = Object.entries(built.placements).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const badSpawns = Object.entries(built.playerSpawns).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    // what the grounds hold: the six portables (11 x 7 m, 3.6 m), the five bleacher tiers, goalposts, the school front
    const obs = p.obstacles;
    const portables = obs.filter(o => Math.abs(o.maxX - o.minX - 11) < 0.01 && Math.abs(o.maxZ - o.minZ - 7) < 0.01 && o.h === 3.6).length;
    const tiers = obs.filter(o => o.minX === 8 && o.maxX === 32 && o.minZ >= 18.5 && o.maxZ <= 23.5).map(o => o.h);
    const posts = obs.filter(o => o.h === 3.0 && o.maxX - o.minX < 0.4 && Math.abs(o.minZ + 1.16) < 0.01).length;
    const inPortables = Math.abs(p.pos.x + 19) < 0.6 && Math.abs(p.pos.z - 1.5) < 0.6;
    return { inPortables, night: SCENARIOS[sc.active].timeOfDay === 'night', kids, badAnchors, badSpawns, portables, tiers, posts, player: inside(p.pos.x, p.pos.z), feet: +p.pos.y.toFixed(2),
      scene: built.name, school: obs.some(o => o.maxZ === -30 && o.maxX - o.minX > 80) };
  });
  check(`${id}: every anchor and player spawn on the grounds is clear of obstacles`, !start.badAnchors.length && !start.badSpawns.length, start);
  check(`${id}: the player and every kid spawn clear of obstacles`, !start.player && start.kids.every(k => !k.stuck), start);
  if (id === 'school_defend_portables') check(`${id}: the player starts in the lane between the portables`, start.inPortables, start);
  check(`${id}: the grounds have six portables, five stepped bleacher tiers, two goalposts and the school front`,
    start.portables === 6 && start.tiers.join() === '0.45,0.9,1.35,1.8,2.25' && start.posts === 2 && start.school, start);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z], minD: 1e9 }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const wiped = () => ['enemy', 'player'].find(t => kids.filter(k => k.team === t).every(k => !npcInFight(k))) || null;
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing';
    let f = 1;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      // v1.156 fix-up: a team that is all out has lost the round; the game ends it on a 600 ms timer that cannot fire
      // inside this loop, so stop here (CI once saw the allies take all nine enemy lives without losing one)
      if (team && wiped()) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      kids.forEach((k, i) => {
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;
        s.minD = Math.min(s.minD, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { team, secs: Math.round((f - 1) / 60), shots, wiped: team ? wiped() : null, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, nearest: +st[i].minD.toFixed(1), at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  // v1.156 fix-up: or the round is decided, one side all out while the other side fired back at it
  if (r.team) check(`${id}: both sides lose lives, or one side is wiped out under fire (within 120 s)`,
    (r.lostEnemy > 0 && r.lostAlly > 0) || (r.wiped && r.kids.some(k => k.t === r.wiped && k.fired > 0)), r);
  // v1.156: the defend's attackers cross the field to the portables (x < -8) and come within 6 m of the player
  else if (id === 'school_defend_portables') check(`${id}: an attacker reaches the portables and closes on the player`,
    r.kids.some(k => k.at[0] < -8 || k.nearest < 6) && Math.min(...r.kids.map(k => k.nearest)) < 6, r.kids);
  else check(`${id}: Tyler comes out of the portables to find the player (within 20 m)`, r.kids[0].nearest < 20, r.kids);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// screenshots by eye: the field from the bleachers' east end, down the portables' gap, the school front
await g.scenario('school_1v1_tyler');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
const view = (x, z, yaw, y = 0) => page.evaluate(([x, z, yaw, y]) => { const p = Game.player; p.pos.set(x, y, z); p.yaw = yaw; stepGame(1 / 60); }, [x, z, yaw, y]);
await view(36, 25, Math.PI * 0.2); await g.shot('high-school-field');
await view(-23.7, 15, 0); await g.shot('high-school-portables');
await view(14, -10, Math.PI * 0.25); await g.shot('high-school-front');
await view(-6, 8, -Math.PI * 0.62); await g.shot('high-school-bleachers');
// v1.156: the night match from the bleachers' west end, and the defend's start looking out at the field
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
await g.scenario('school_night_4v4');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
await view(5, 26.5, -0.35); await g.shot('high-school-night');
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
await g.scenario('school_defend_portables');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; stepGame(1 / 60); });
await g.shot('high-school-defend');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
