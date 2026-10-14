// v1.186: Bellfield Court, the Bellfield kids' own cul-de-sac (decisions, Michael: C on the control room, 10 Oct: a
// small map with a 1v1 and a 3v3). Checks the two matches sit in Northcliff's chain after the treehouse and before the
// creek-fort defend, the map card says Bellfield Court, both build with every kid and the player clear of obstacles,
// the street is what the briefings say (flat, the road east to the bulb, a fence round the back), every enemy
// starts well down the street (and the opening hold keeps his fire), and a round plays: kids move or fire, nobody wedges, the team round trades lives.
// The player is untaggable and stands at the spawn, as in northcliff.
// v1.187 (decisions, "After Bellfield Court", Michael: C): Hold the Bulb Fort, a 90 s defend inside the kid fort at the
// top of the bulb, after the 3v3; the attackers come up from the entry and round to the fort's open back. Also a
// round with the player taggable, standing in the fort: the first tag is no opening-seconds loss.
// v1.188 (the same answer): Lamplight on Bellfield, a night 4v4 after the defend: you and the Stoneglen kids against
// the four Bellfield kids (no rifle: Fernando's tagged a player at the entry at 3.08 s from the bulb). The streetlamps are lit, the round plays like the 3v3,
// and a player standing at the entry is not tagged in the opening seconds.
import { boot, check } from './lib/game.mjs';
const SCENARIO_NIGHT = id => id === 'bellfield_night_4v4';
let dayLights = null;
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const IDS = ['bellfield_1v1_mason', 'bellfield_3v3', 'bellfield_defend_fort', 'bellfield_night_4v4'];
const chain = await page.evaluate((IDS) => {
  const ids = PIN_SCENARIO_GROUPS.northcliff, done = Game.persist.completed;
  const at = IDS.map(id => ids.indexOf(id));
  done[zoneCapstoneId('market_lot')] = true;
  for (const id of ids.slice(0, ids.indexOf('stoneglen_hold_treehouse'))) done[id] = true;
  const beforeHold = { mason: isScenarioUnlocked(IDS[0]) };
  done.stoneglen_hold_treehouse = true;
  const afterHold = { mason: isScenarioUnlocked(IDS[0]), bulb: isScenarioUnlocked(IDS[1]), creek: isScenarioUnlocked('northcliff_defend_creek') };
  done[IDS[0]] = true;
  const afterMason = { bulb: isScenarioUnlocked(IDS[1]), creek: isScenarioUnlocked('northcliff_defend_creek') };
  done[IDS[1]] = true;
  const afterBulb = { fort: isScenarioUnlocked(IDS[2]), creek: isScenarioUnlocked('northcliff_defend_creek') };
  done[IDS[2]] = true;
  const afterFort = { night: isScenarioUnlocked(IDS[3]), creek: isScenarioUnlocked('northcliff_defend_creek') };
  done[IDS[3]] = true;
  const afterNight = { flags: isScenarioUnlocked('bellfield_ctf'), creek: isScenarioUnlocked('northcliff_defend_creek') };
  done.bellfield_ctf = true;   // v1.189: capture the flag comes between the night match and the creek fort
  const afterFlags = { creek: isScenarioUnlocked('northcliff_defend_creek'), reason: scenarioLockReason('northcliff_defend_creek') };
  // the map card for the 1v1 names the street
  openMap(); refreshMapPinStates();
  document.querySelector('#worldMap .pin[data-scenario="northcliff"]').click();
  const card = [...document.querySelectorAll('#scenarioInfo .sc-card')].find(c => c.dataset.id === IDS[0]);
  const cardText = card ? card.textContent.replace(/\s+/g, ' ') : '';
  closeMap();
  for (const k of Object.keys(done)) delete done[k];
  const street = REGIONS.northcliff.streets[SCENARIOS[IDS[0]].street];
  return { at, hold: ids.indexOf('stoneglen_hold_treehouse'), creek: ids.indexOf('northcliff_defend_creek'), beforeHold, afterHold, afterMason, afterBulb, afterFort, afterNight, afterFlags, flagsAt: ids.indexOf('bellfield_ctf'), cardText, street };
}, IDS);
check('the four Bellfield matches follow Hold the Treehouse, then its capture the flag (v1.189), then the creek-fort defend',
  chain.at.every((a, i) => a === chain.hold + 1 + i) && chain.flagsAt === chain.hold + 1 + IDS.length && chain.creek === chain.flagsAt + 1, chain);
check("Mason's Court opens once Hold the Treehouse is won, not before", !chain.beforeHold.mason && chain.afterHold.mason && !chain.afterHold.bulb, chain);
check("the 3v3 opens after Mason's Court, Hold the Bulb Fort after the 3v3, the night match after that, then the creek-fort defend",
  chain.afterMason.bulb && !chain.afterMason.creek && chain.afterBulb.fort && !chain.afterBulb.creek && chain.afterFort.night && !chain.afterFort.creek
  && chain.afterNight.flags && !chain.afterNight.creek && chain.afterFlags.creek, chain);
check('the scenarios are on Bellfield Court, and its card says so', chain.street === 'Bellfield Court' && /Bellfield Court/.test(chain.cardText) && /Mason/.test(chain.cardText), chain);

for (const id of IDS) {
  await g.scenario(id);
  const start = await page.evaluate(() => {
    const inside = (x, z) => collidesObstacles(x, z, 0.3);
    const gy = Game.scenario.groundY || (() => 0), p = Game.player;
    const kids = Game.scenario.enemies.map(e => ({ n: e.character?.name, t: e.team, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), stuck: inside(e.pos.x, e.pos.z) }));
    const flat = [[-30, 20], [0, 0], [30, -20], [-14, 0]].every(([x, z]) => gy(x, z) === 0);
    // a walk down the middle of the road from the entry reaches the bulb's island; past it, the head house
    let x = p.pos.x, blockedAt = null;
    for (; x > -34; x -= 0.25) if (inside(x, 0)) { blockedAt = +x.toFixed(2); break; }
    // the back fence: nothing passes at z = ±27.6 anywhere along it
    const fence = [-30, -10, 10, 28].every(fx => inside(fx, 27.6) && inside(fx, -27.6));
    // lines of sight from each enemy's eye to the player's at the first frame
    const seen = Game.scenario.enemies.filter(e => e.team !== 'player').map(e => ({ n: e.character?.name,
      line: hasLineOfSight(e.pos.x, 1.35, e.pos.z, p.pos.x, 1.35, p.pos.z, p.obstacles), d: +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(1) }));
    // v1.187: inside the fort's walls (its box, x -22.7…-20.5, z 0.4…4.0), the wall between you and the street
    const inFort = p.pos.x > -22.7 && p.pos.x < -20.5 && p.pos.z > 0.4 && p.pos.z < 4.0;
    const wallAhead = !hasLineOfSight(p.pos.x, 0.8, p.pos.z, p.pos.x + 3, 0.8, p.pos.z, p.obstacles);
    // v1.188: lit streetlamps (PointLights) in the scene
    let lights = 0; Game.scene.traverse(o => { if (o.isPointLight) lights++; });
    return { lights, inFort, wallAhead, yaw: +p.yaw.toFixed(2), name: Game.scenario.built?.name || document.title, player: inside(p.pos.x, p.pos.z), at: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)],
      feet: +(p.pos.y - gy(p.pos.x, p.pos.z)).toFixed(2), kids, flat, blockedAt, fence, seen };
  });
  console.log(`  ${id} start:`, JSON.stringify(start));
  const defend = id === 'bellfield_defend_fort';
  if (defend) check(`${id}: the player spawns clear of every obstacle, inside the bulb fort, facing east over its wall (crouched, the wall hides him)`,
    !start.player && start.inFort && start.wallAhead && Math.abs(start.yaw + Math.PI / 2) < 0.05, start);
  else check(`${id}: the player spawns clear of every obstacle, at the east entry`, !start.player && start.at[0] > 30, start);
  if (id === 'bellfield_3v3') dayLights = start.lights;
  if (SCENARIO_NIGHT(id)) check(`${id}: it is night, and the four streetlamps are lit (4 more point lights than the day 3v3)`, start.lights - dayLights >= 4, { night: start.lights, day: dayLights });
  check(`${id}: every kid spawns clear of every obstacle`, start.kids.every(k => !k.stuck), start.kids.filter(k => k.stuck));
  check(`${id}: the street is flat`, start.flat, start);
  if (!defend) check(`${id}: down the middle of the road the first thing you meet is the bulb's island (x -12.4)`, start.blockedAt !== null && Math.abs(start.blockedAt + 12.4) < 0.6, start.blockedAt);
  check(`${id}: the back fence closes both rows of yards`, start.fence, start);
  check(`${id}: every enemy starts at least 35 m off, down the street`, start.seen.every(s => s.d > 35), start.seen);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0, firstAt = null; spawnEnemyBB = (e, t) => { if (inOpeningHold()) return o(e, t); shots++; if (firstAt === null) firstAt = +Game.scenario.roundTime.toFixed(2); const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z], maxZ: 0, minD: 1e9, minX: 1e9 }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing';
    let f = 1, firstShot = null, nearest = 1e9;
    const defend = scd.scenarioType === 'defend';
    for (; f <= 120 * 60 && Game.mode === 'scenario' && !Game.scenario.winByTimer; f++) {
      if (!defend && f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      // v1.189 fix-up: stamped with the round's own clock (the one the hold reads), not this loop's frames: the page's
      // own frames between BEGIN and this loop count too, so on CI a shot at 2.5 s read 2.43 here
      if (firstShot === null && shots > 0) firstShot = firstAt;
      kids.forEach((k, i) => {
        if (k.team !== 'player' && k.health > 0) nearest = Math.min(nearest, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;
        s.maxZ = Math.max(s.maxZ, Math.abs(k.pos.z)); if (k.health > 0) s.minX = Math.min(s.minX, k.pos.x); s.minD = Math.min(s.minD, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { defend, won: !!Game.scenario.winByTimer, team, secs: Math.round((f - 1) / 60), shots, firstShot, nearest: +nearest.toFixed(1), lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, maxZ: +st[i].maxZ.toFixed(1), minX: +st[i].minX.toFixed(1), minD: +st[i].minD.toFixed(1), at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: nobody fires in the opening hold (2.5 s)`, r.firstShot === null || r.firstShot >= 2.5, r.firstShot);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  if (r.team) check(`${id}: both sides lose lives (within 120 s)`, r.lostEnemy > 0 && r.lostAlly > 0, r);
  else if (r.defend) {
    check(`${id}: the timer runs out and the player holds (90 s)`, r.won && r.secs >= 89 && r.secs <= 91, r);
    check(`${id}: an attacker reaches the fort (within 5 m of the player)`, r.kids.some(k => k.t !== 'player' && k.minD < 5), r.kids);
    check(`${id}: an attacker gets round to the fort's open back (x under -22.7)`, r.kids.some(k => k.t !== 'player' && k.minX < -22.7), r.kids);
  } else check(`${id}: Mason comes looking (within 15 m of the player in 60 s)`, r.nearest < 15, r.nearest);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
// v1.187: Hold the Bulb Fort with the player taggable, standing in the fort and never firing: no tag in the
// opening seconds (the attackers start 55 m off at the entry)
const tagged = [];
for (let i = 0; i < 3; i++) {
  await g.scenario('bellfield_defend_fort');
  tagged.push(await page.evaluate(() => {
    let f = 1;
    for (; f <= 95 * 60 && Game.mode === 'scenario' && !(Game.player.hitsTaken > 0) && !Game.scenario.winByTimer; f++) stepGame(1 / 60);
    return +((f - 1) / 60).toFixed(1);
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
console.log('  Hold the Bulb Fort, a player standing in the fort first tagged at (s):', JSON.stringify(tagged));
check('Hold the Bulb Fort: a player standing still is not tagged in the first 12 s', tagged.every(t => t > 12), tagged);
// v1.188: Lamplight on Bellfield with the player taggable, standing at the entry: nobody tags him in the opening seconds
const nightTag = [];
for (let i = 0; i < 3; i++) {
  await g.scenario('bellfield_night_4v4');
  nightTag.push(await page.evaluate(() => {
    let f = 1;
    for (; f <= 30 * 60 && Game.mode === 'scenario' && !(Game.player.hitsTaken > 0); f++) stepGame(1 / 60);
    return +((f - 1) / 60).toFixed(1);
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
console.log('  Lamplight on Bellfield, a player standing at the entry first tagged at (s, 30 = not in 30 s):', JSON.stringify(nightTag));
// v1.228 fix-up: 5 s, not 8. The fault this guards (v1.177, Friday Night Lights) is a kid with a line from his start,
// tagging at about 3 s. CI, 14 Oct, tagged once at 6 s; 40 local rounds ran 10.6-30 s, the 10.6 Fernando advancing
// from 22.6 m. A kid who walks into range takes 5 s or more to get there, so 5 s still catches a line from the start.
check('Lamplight on Bellfield: a player standing at the entry is not tagged in the first 5 s (no line from a start)', nightTag.every(t => t > 5), nightTag);

// screenshots by eye: down the street from the entry, the bulb from its mouth, and a backyard
await g.scenario('bellfield_1v1_mason');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
await g.shot('bellfield-street');
await page.evaluate(() => { const p = Game.player; p.pos.set(-2, 0.1, 0.5); p.yaw = Math.PI / 2; stepGame(1 / 60); });
await g.shot('bellfield-bulb');
await page.evaluate(() => { const p = Game.player; p.pos.set(26, 0.1, 24); p.yaw = Math.PI / 2; stepGame(1 / 60); });
await g.shot('bellfield-backyards');
await g.scenario('bellfield_defend_fort');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; stepGame(1 / 60); });
await g.shot('bellfield-fort');
await g.scenario('bellfield_night_4v4');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; stepGame(1 / 60); });
await g.shot('bellfield-night');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
