// v1.159: Inside Riverside Market, the eighth zone (backlog D.1, Michael: A, control room 5 Oct: the grocery store
// battle from his list, inside the made-up store whose lot is the fourth zone). Checks the zone sits on the ladder after
// Willow Bend, its pin is locked on a new save and opens its scenarios once the club is cleared, the store holds what
// the answer named (aisles, checkouts, the stockroom), the shelves stop a body and a BB and can't be stood on, every
// anchor, kid and the player start clear of obstacles, the room is closed (walls and a roof, so no sky), and a round
// plays: kids come through the stockroom doors, move or fire, nobody wedges, the team round trades lives.
// As tests/country-club.test.mjs.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const ladder = await page.evaluate(() => {
  const keys = ZONE_LADDER.map(z => z.key);
  const done = Game.persist.completed;
  const ids = PIN_SCENARIO_GROUPS.grocery_store || [];
  const before = { zone: isZoneUnlocked('grocery_store'), first: isScenarioUnlocked(ids[0]) };
  done[zoneCapstoneId('country_club')] = true;
  const after = { zone: isZoneUnlocked('grocery_store'), first: isScenarioUnlocked(ids[0]), second: isScenarioUnlocked(ids[1]) };
  done[ids[0]] = true;
  const afterFirst = { second: isScenarioUnlocked(ids[1]) };
  delete done[zoneCapstoneId('country_club')]; delete done[ids[0]];
  return { keys, ids, before, after, afterFirst, region: REGIONS.east_roswell.streets.riverside_market_inside };
});
check('the ladder ends with the store, after Willow Bend', ladder.keys.slice(-2).join() === 'country_club,grocery_store', ladder.keys);
check('the store runs the 1v1 opener, then the 3v3', ladder.ids.join() === 'store_1v1_tyler,store_price_check_3v3', ladder.ids);
check('its street is in East Roswell', ladder.region === 'Inside Riverside Market', ladder.region);
check('the store is locked on a new save', !ladder.before.zone && !ladder.before.first, ladder.before);
check('clearing the club opens the opener only', ladder.after.zone && ladder.after.first && !ladder.after.second, ladder.after);
check('the opener opens the 3v3', ladder.afterFirst.second, ladder.afterFirst);

const pin = await page.evaluate(() => {
  openMap();
  const p = document.querySelector('#worldMap .pin[data-scenario="grocery_store"]');
  const lockedNew = !!p && p.classList.contains('locked'), label = p && p.querySelector('.label').textContent;
  p.querySelector('.marker').click();
  const lockedInfo = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  Game.persist.completed[zoneCapstoneId('country_club')] = true;
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
check('the store pin is locked on a new save and says to clear Willow Bend', pin.lockedNew && /Willow Bend/.test(pin.lockedInfo), pin);
check('the pin sits inside the map and covers no other pin', pin.inside && pin.overlaps === 0, pin);
check('after the club the pin is live and lists every scenario, only the opener playable',
  !pin.lockedAfter && pin.rows.length === ladder.ids.length && pin.rows[0].id === 'store_1v1_tyler' && !pin.rows[0].locked
  && pin.rows.slice(1).every(r => r.locked), pin);
await g.shot('grocery-store-map');
await page.evaluate(() => { delete Game.persist.completed[zoneCapstoneId('country_club')]; closeMap(); });

for (const id of ladder.ids) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const sc = Game.scenario, p = Game.player;
    const kids = sc.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    const built = buildGroceryStoreScene('default', 'day');
    const badAnchors = Object.entries(built.placements).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    const badSpawns = Object.entries(built.playerSpawns).filter(([, a]) => inside(a.pos.x, a.pos.z)).map(([k]) => k);
    // what the store holds: 12 runs of shelving (5 aisles, cut by the cross aisle), 6 checkout counters, 8 produce
    // tables, 4 freezers, the back wall's 3 doorways, a stockroom with pallets and racking
    const obs = p.obstacles;
    const shelves = obs.filter(o => o.shelf && o.h === 2.1).length;
    const counters = obs.filter(o => o.h === 1.0 && Math.abs(o.maxX - o.minX - 0.9) < 0.01 && o.maxZ - o.minZ > 4).length;
    const tables = obs.filter(o => o.h === 0.9 && o.surface === 'wood' && o.maxX - o.minX > 2.1 && o.maxX - o.minX < 2.3).length;
    const freezers = obs.filter(o => o.h === 0.9 && o.surface === 'metal').length;
    const backWall = obs.filter(o => o.minZ === -18.6 && o.maxZ === -18.0).length;   // four pieces = three doorways
    const pallets = obs.filter(o => o.minZ < -18.6 && o.surface === 'wood').length;
    const racks = obs.filter(o => o.h === 3.2 && o.surface === 'metal').length;
    return { kids, badAnchors, badSpawns, shelves, counters, tables, freezers, backWall, pallets, racks,
      player: inside(p.pos.x, p.pos.z), scene: built.name, indoor: !!built.indoor };
  });
  check(`${id}: every anchor and player spawn in the store is clear of obstacles`, !start.badAnchors.length && !start.badSpawns.length, start);
  check(`${id}: the player and every kid spawn clear of obstacles`, !start.player && start.kids.every(k => !k.stuck), start);
  check(`${id}: the store has 12 shelf runs, 6 checkouts, 8 produce tables, 4 freezers, 3 stockroom doorways, pallets and racking`,
    start.shelves === 12 && start.counters === 6 && start.tables === 8 && start.freezers === 4 && start.backWall === 4 && start.pallets >= 6 && start.racks === 3, start);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z], minD: 1e9, front: false, onTop: 0 }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const wiped = () => ['enemy', 'player'].find(t => kids.filter(k => k.team === t).every(k => !npcInFight(k))) || null;
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
        if (k.team !== 'player' && k.pos.z > -17) s.front = true;   // through the back wall onto the sales floor
        if ((k.pos.y || 0) > 1.5) s.onTop++;                        // up on a shelf (2.1 m): never
        s.minD = Math.min(s.minD, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { team, secs: Math.round((f - 1) / 60), shots, wiped: team ? wiped() : null, lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, front: st[i].front, onTop: st[i].onTop, nearest: +st[i].minD.toFixed(1), at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  check(`${id}: no kid ever stands on a shelf`, r.kids.every(k => k.onTop === 0), r.kids);
  if (r.team) {
    check(`${id}: the stockroom kids come through the back wall onto the floor`, r.kids.filter(k => k.t !== 'player').some(k => k.front), r.kids);
    check(`${id}: both sides lose lives, or one side is wiped out under fire (within 120 s)`,
      (r.lostEnemy > 0 && r.lostAlly > 0) || (r.wiped && r.kids.some(k => k.t === r.wiped && k.fired > 0)), r);
  } else check(`${id}: Tyler comes out of the back to find the player (within 20 m)`, r.kids[0].nearest < 20, r.kids);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// The shelves: the player walks into one and stops at its face; jumping at it doesn't put him on top; a BB fired at
// one stops in it (or glances off) and never comes out the far side; and a jump doesn't clear a 1.0 m counter.
await g.scenario('store_1v1_tyler');
const walls = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) e.health = 0;
  const P = Game.player, out = {};
  const walk = (x, z, yaw, secs, jump) => {
    P.pos.set(x, 0, z); P.yaw = yaw; P.pitch = 0; if (P.vel) P.vel.set(0, 0, 0);
    let top = 0;
    for (let f = 0; f < secs * 60; f++) {
      Game.keys.KeyW = true;
      if (jump && f % 40 === 0) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));   // the game's jump
      stepGame(1 / 60); top = Math.max(top, P.pos.y);
    }
    Game.keys.KeyW = false;
    for (let f = 0; f < 60; f++) stepGame(1 / 60);
    return { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2), y: +P.pos.y.toFixed(2), top: +top.toFixed(2) };
  };
  // aisle 2's west shelf face is x -8.5 + 0.6 = -7.9; walk west into it from x -6 (yaw π/2 faces -x)
  out.shelf = walk(-6, -6, Math.PI / 2, 2, false);
  out.shelfJump = walk(-6, -6, Math.PI / 2, 2, true);
  // the back wall between doorways: walk north from the dairy aisle (coolers at z -17.2)
  out.back = walk(-7, -14, 0, 2, false);
  // a checkout counter (1.0 m): jump at lane 3's counter from its east side (x -12 + 0.45), facing west
  out.counter = walk(-10.6, 12.5, Math.PI / 2, 1.2, true);
  // a BB fired west down the cross aisle's line into aisle 3's shelf at 1.2 m stops in it
  Game.scenario.bbs.length = 0;
  const bb = makeBB(new THREE.Vector3(3, 1.2, -6), new THREE.Vector3(-60, 0, 0), 'player');
  bb.curveStrength = 0; Game.scenario.bbs.push(bb);
  let minX = 99;
  for (let i = 0; i < 120 && Game.scenario.bbs.includes(bb); i++) { updateBBs(1 / 200); if (bb.canDamage) minX = Math.min(minX, bb.pos.x); }
  Game.scenario.bbs.length = 0;
  out.bbMinX = +minX.toFixed(2);
  // and the closed room: from the middle of the floor, rays up and out all hit a wall or the roof before 60 m
  return out;
});
console.log('  walls:', JSON.stringify(walls));
check('walking into a shelf stops at its face (x -7.9, plus the body radius)', walls.shelf.x > -7.9 && walls.shelf.x < -7.3, walls.shelf);
check('jumping at a shelf does not put you on it', walls.shelfJump.x > -7.9 && walls.shelfJump.top < 1.5, walls.shelfJump);
check('walking north stops at the dairy coolers (z -17.2)', walls.back.z > -17.2 && walls.back.z < -16.4, walls.back);
check('a jump at a checkout counter (1.0 m) does not clear it: it is cover, not a step', walls.counter.x > -11.55 && walls.counter.top < 1.0, walls.counter);
check('a BB fired into a shelf (aisle 4, x -0.1…1.1) never comes out the far side', walls.bbMinX > -0.1, walls);

// The room is closed: from the player's eye at six points round the store, a ray toward the sky or across the room
// meets the roof or a wall within 60 m (no open edge where the sky or the void would show).
const closed = await page.evaluate(() => {
  const ray = new THREE.Raycaster(), sc = Game.scene, misses = [];
  const solids = []; sc.traverse(o => { if (o.isMesh && o.geometry && (o.geometry.type === 'PlaneGeometry' || o.geometry.type === 'BoxGeometry') && !o.material.transparent) solids.push(o); });
  for (const [x, z] of [[11, 14.8], [-20, 8], [0, -6], [20, -6], [-15, -24], [15, -24]]) {
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      for (const up of [0.15, 0.6, 2.5]) {
        const d = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
        ray.set(new THREE.Vector3(x, 1.6, z), d); ray.far = 60;
        if (!ray.intersectObjects(solids, false).length) misses.push([x, z, k, up]);
      }
    }
  }
  return { rays: 6 * 16 * 3, misses };
});
check('the room is closed: every ray from inside meets a wall or the roof', closed.misses.length === 0, closed);

// screenshots by eye: the start, down an aisle, the checkouts, the stockroom through a doorway, the produce
const view = (x, z, yaw, y = 0) => page.evaluate(([x, z, yaw, y]) => { const p = Game.player; p.pos.set(x, y, z); p.yaw = yaw; p.pitch = 0; stepGame(1 / 60); }, [x, z, yaw, y]);
await view(11, 14.8, 0.06); await g.shot('grocery-store-start');
await view(-6.25, 8.5, 0); await g.shot('grocery-store-aisle');
await view(10, 6, Math.PI * 0.72); await g.shot('grocery-store-checkouts');
await view(0, -10, 0); await g.shot('grocery-store-stockroom');
await view(-14, 9, Math.PI * 0.3); await g.shot('grocery-store-produce');
await view(10, -6, -Math.PI * 0.5); await g.shot('grocery-store-freezers');
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(60);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
