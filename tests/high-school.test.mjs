// v1.155: Hollins Ridge High, the sixth zone (backlog D.1, Michael: A, control room 4 Oct: a high school's grounds,
// made-up name: fields, bleachers, portables). Checks the zone sits on the ladder after Northcliff, its map pin is
// locked on a new save and opens its scenarios once Northcliff is cleared, the grounds hold what the answer named,
// every anchor, kid and the player start clear of obstacles, and a round plays: kids move or fire, nobody wedges, the
// team round trades lives. The player is untaggable and stands at the spawn, as in northcliff.
// v1.453 (D.51, card fable/d51-hollins-ridge): the campus at real scale, the matches in three areas (the front, the
// west lot, the stadium). The grounds checks are per area now (they pinned the old six portables, the five bleacher
// tiers, the field's goalposts and the school front at z -30); added: nothing past an area's edge is solid, and at most
// 1100 draw calls in the area's views.
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
check('Hollins Ridge High comes after Northcliff (v1.157: and before Willow Bend)', ladder.keys.slice(-4, -1).join() === 'northcliff,high_school,country_club', ladder.keys);
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
    const arg = SCENARIOS[sc.active].builderArg, built = buildHighSchoolScene(arg, 'day');
    const badAnchors = Object.entries(built.placements).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const badSpawns = Object.entries(built.playerSpawns).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    // v1.453: what each area holds: the lot its four portables (11 x 7 m, 3.6 m) in a row; the stadium the home stands'
    // twenty rows (1.2 m to 8 m, x -78..-62); the front the glass hall (14 x 6 m) and the flagpole on the circle's island
    const obs = p.obstacles, B = sc.bounds;
    const portables = obs.filter(o => Math.abs(o.maxX - o.minX - 11) < 0.01 && Math.abs(o.maxZ - o.minZ - 7) < 0.01 && o.h === 3.6).length;
    const rows = obs.filter(o => o.minZ === -32 && o.maxZ === 32 && o.minX >= -78 && o.maxX <= -62 && o.maxX - o.minX < 0.81).map(o => +o.h.toFixed(2));
    const hall = obs.some(o => o.minX === 193 && o.maxX === 207 && o.h === 9.5), pole = obs.some(o => o.shape === 'cylinder' && o.cx === 200 && o.h === 12);
    const inPortables = Math.abs(p.pos.x + 4.25) < 0.6 && Math.abs(p.pos.z + 61) < 0.6;
    // nothing past the edge is solid: every obstacle but the edge walls reaches into the area
    const past = obs.filter(o => !(o.baseY === -4 && o.h === 6) && !(o.maxX > B.minX - 1 && o.minX < B.maxX + 1 && o.maxZ > B.minZ - 1 && o.minZ < B.maxZ + 1)).length;
    const calls = [], cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
    for (const [x, z] of [[p.pos.x, p.pos.z], [B.minX + 3, B.minZ + 3], [B.maxX - 3, B.minZ + 3], [B.minX + 3, B.maxZ - 3], [B.maxX - 3, B.maxZ - 3]]) {
      const yaw = Math.atan2(-(cx - x), -(cz - z));
      Game.camera.position.set(x, 1.6, z); Game.camera.rotation.set(0, yaw, 0, 'YXZ'); Game.camera.updateMatrixWorld(true);
      Game.renderer.render(Game.scene, Game.camera); calls.push(Game.renderer.info.render.calls);
    }
    return { arg, inPortables, night: SCENARIOS[sc.active].timeOfDay === 'night', kids, badAnchors, badSpawns, portables, rows, hall, pole, past, calls, player: inside(p.pos.x, p.pos.z), feet: +p.pos.y.toFixed(2),
      scene: built.name };
  });
  check(`${id}: every anchor and player spawn on the grounds is clear of obstacles`, !start.badAnchors.length && !start.badSpawns.length, start);
  check(`${id}: the player and every kid spawn clear of obstacles`, !start.player && start.kids.every(k => !k.stuck), start);
  if (id === 'school_defend_portables') check(`${id}: the player starts in the gap between the middle two portables`, start.inPortables, start);
  if (start.arg === 'lot') check(`${id}: the west lot has its four portables`, start.portables === 4, start);
  if (start.arg === 'stadium') check(`${id}: the home stands rise in twenty rows from 1.2 m to 8 m`, start.rows.length === 20 && start.rows[0] === 1.2 && start.rows[19] === 8.04, start.rows);
  if (start.arg === 'front') check(`${id}: the front has the glass hall and the flagpole`, start.hall && start.pole, start);
  check(`${id}: nothing past the area's edge is solid`, start.past === 0, start.past);
  check(`${id}: at most 1100 draw calls in five views (the plan's budget)`, Math.max(...start.calls) <= 1100, start.calls);
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
      // v1.224 fix-up: and every kid still in the fight has moved or fired. CI, 14 Oct: Nathan (Mitchell's numbers, sits
      // at the back) had walked 2 m and fired nothing at 60 s; locally he walks 12-15 m and fires 5-16 times by then
      const quiet = kids.some((k, i) => npcInFight(k) && st[i].path <= 5 && !fired[i]);
      if (f > 60 * 60 && !quiet && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
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
  // v1.170 fix-up: unless a side was wiped out first. CI, 6 Oct: the allies were all out at 32 s (Ryan and Priya), and
  // Mitchell, who sits back and picks at the doors 51 m off, had not moved or fired yet. Locally he walks 31-119 m and
  // fires 17-268 times when the round runs on.
  check(`${id}: every kid moves or fires within 120 s (unless a side is wiped out first)`, r.kids.every(k => k.walked > 5 || k.fired > 0) || (r.wiped && r.secs < 120), r.kids);
  // v1.156 fix-up: or the round is decided, one side all out while the other side fired back at it
  if (r.team) check(`${id}: both sides lose lives, or one side is wiped out under fire (within 120 s)`,
    (r.lostEnemy > 0 && r.lostAlly > 0) || (r.wiped && r.kids.some(k => k.t === r.wiped && k.fired > 0)), r);
  // v1.156: the defend's attackers come up to the portables and within 6 m of the player (v1.453: up the west lot)
  else if (id === 'school_defend_portables') check(`${id}: an attacker reaches the portables and closes on the player`,
    Math.min(...r.kids.map(k => k.nearest)) < 6, r.kids);
  else check(`${id}: Jordan comes out of the east lot to find the player (within 20 m)`, r.kids[0].nearest < 20, r.kids);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// screenshots by eye (v1.453): the front from the circle, the portables up the lot, the stands from the field at night
const view = (x, z, yaw, y = 0) => page.evaluate(([x, z, yaw, y]) => { const p = Game.player; p.pos.set(x, y, z); p.yaw = yaw; stepGame(1 / 60); }, [x, z, yaw, y]);
for (const [id, x, z, yaw, name] of [['school_1v1_tyler', 200, 112, 0, 'high-school-front'], ['school_portables_3v3', -4, -38, 0, 'high-school-portables'],
  ['school_night_4v4', -112, 6, -Math.PI / 2, 'high-school-night']]) {
  await g.scenario(id);
  await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
  await view(x, z, yaw); await g.shot(name);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
