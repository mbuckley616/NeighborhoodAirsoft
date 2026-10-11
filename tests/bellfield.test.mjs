// v1.186: Bellfield Court, the Bellfield kids' own cul-de-sac (decisions, Michael: C on the control room, 10 Oct: a
// small map with a 1v1 and a 3v3). Checks the two matches sit in Northcliff's chain after the treehouse and before the
// creek-fort defend, the map card says Bellfield Court, both build with every kid and the player clear of obstacles,
// the street is what the briefings say (flat, the road east to the bulb, a fence round the back), every enemy
// starts well down the street (and the opening hold keeps his fire), and a round plays: kids move or fire, nobody wedges, the team round trades lives.
// The player is untaggable and stands at the spawn, as in northcliff.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const IDS = ['bellfield_1v1_mason', 'bellfield_3v3'];
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
  const afterBulb = { creek: isScenarioUnlocked('northcliff_defend_creek'), reason: scenarioLockReason('northcliff_defend_creek') };
  // the map card for the 1v1 names the street
  openMap(); refreshMapPinStates();
  document.querySelector('#worldMap .pin[data-scenario="northcliff"]').click();
  const card = [...document.querySelectorAll('#scenarioInfo .sc-card')].find(c => c.dataset.id === IDS[0]);
  const cardText = card ? card.textContent.replace(/\s+/g, ' ') : '';
  closeMap();
  for (const k of Object.keys(done)) delete done[k];
  const street = REGIONS.northcliff.streets[SCENARIOS[IDS[0]].street];
  return { at, hold: ids.indexOf('stoneglen_hold_treehouse'), creek: ids.indexOf('northcliff_defend_creek'), beforeHold, afterHold, afterMason, afterBulb, cardText, street };
}, IDS);
check('the two Bellfield matches follow Hold the Treehouse and come before the creek-fort defend',
  chain.at[0] === chain.hold + 1 && chain.at[1] === chain.hold + 2 && chain.creek === chain.hold + 3, chain);
check("Mason's Court opens once Hold the Treehouse is won, not before", !chain.beforeHold.mason && chain.afterHold.mason && !chain.afterHold.bulb, chain);
check("the 3v3 opens after Mason's Court, the creek-fort defend after the 3v3",
  chain.afterMason.bulb && !chain.afterMason.creek && chain.afterBulb.creek, chain);
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
    return { name: Game.scenario.built?.name || document.title, player: inside(p.pos.x, p.pos.z), at: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)],
      feet: +(p.pos.y - gy(p.pos.x, p.pos.z)).toFixed(2), kids, flat, blockedAt, fence, seen };
  });
  console.log(`  ${id} start:`, JSON.stringify(start));
  check(`${id}: the player spawns clear of every obstacle, at the east entry`, !start.player && start.at[0] > 30, start);
  check(`${id}: every kid spawns clear of every obstacle`, start.kids.every(k => !k.stuck), start.kids.filter(k => k.stuck));
  check(`${id}: the street is flat`, start.flat, start);
  check(`${id}: down the middle of the road the first thing you meet is the bulb's island (x -12.4)`, start.blockedAt !== null && Math.abs(start.blockedAt + 12.4) < 0.6, start.blockedAt);
  check(`${id}: the back fence closes both rows of yards`, start.fence, start);
  check(`${id}: every enemy starts at least 35 m off, down the street`, start.seen.every(s => s.d > 35), start.seen);
  const r = await page.evaluate(() => {
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const kids = Game.scenario.enemies.slice(), fired = kids.map(() => 0);
    const o = spawnEnemyBB; let shots = 0; spawnEnemyBB = (e, t) => { shots++; const i = kids.indexOf(e); if (i >= 0) fired[i]++; return o(e, t); };
    const st = kids.map(k => ({ run: 0, longest: 0, path: 0, mark: [k.pos.x, k.pos.z] }));
    const livesLost = t => kids.filter(k => k.team === t).reduce((a, k) => a + (k.maxLives - k.lives), 0);
    const scd = SCENARIOS[Game.scenario.active] || {}, team = scd.winCondition === 'last_team_standing';
    let f = 1, firstShot = null, nearest = 1e9;
    for (; f <= 120 * 60 && Game.mode === 'scenario'; f++) {
      if (f > 60 * 60 && (!team || (livesLost('enemy') > 0 && livesLost('player') > 0))) break;
      const prev = kids.map(k => [k.pos.x, k.pos.z]);
      stepGame(1 / 60);
      if (firstShot === null && shots > 0) firstShot = +(f / 60).toFixed(2);
      kids.forEach((k, i) => {
        if (k.team !== 'player' && k.health > 0) nearest = Math.min(nearest, Math.hypot(k.pos.x - Game.player.pos.x, k.pos.z - Game.player.pos.z));
        const m = Math.hypot(k.pos.x - prev[i][0], k.pos.z - prev[i][1]), s = st[i];
        if (m < 1.5) s.path += m;
        if (f % 60 === 0) {
          const net = Math.hypot(k.pos.x - s.mark[0], k.pos.z - s.mark[1]); s.mark = [k.pos.x, k.pos.z];
          if (net < 0.25 && k.state === 'advancing' && k.health > 0) { s.run++; s.longest = Math.max(s.longest, s.run); } else s.run = 0;
        }
      });
    }
    spawnEnemyBB = o; applyBBHit = orig;
    return { team, secs: Math.round((f - 1) / 60), shots, firstShot, nearest: +nearest.toFixed(1), lostEnemy: livesLost('enemy'), lostAlly: livesLost('player'),
      kids: kids.map((k, i) => ({ n: k.character?.name, t: k.team, walked: +st[i].path.toFixed(0), fired: fired[i], wedged: st[i].longest, at: [+k.pos.x.toFixed(1), +k.pos.z.toFixed(1)], state: k.state })) };
  });
  console.log(`  ${id}, ${r.secs} s:`, JSON.stringify(r));
  check(`${id}: kids fire`, r.shots > (r.team ? 10 : 2), r.shots);
  check(`${id}: nobody fires in the opening hold (2.5 s)`, r.firstShot === null || r.firstShot >= 2.5, r.firstShot);
  check(`${id}: every kid moves or fires`, r.kids.every(k => k.walked > 5 || k.fired > 0), r.kids);
  if (r.team) check(`${id}: both sides lose lives (within 120 s)`, r.lostEnemy > 0 && r.lostAlly > 0, r);
  else check(`${id}: Mason comes looking (within 15 m of the player in 60 s)`, r.nearest < 15, r.nearest);
  check(`${id}: no kid is wedged in advancing for 4 s or more`, r.kids.every(k => k.wedged < 4), r.kids);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
// screenshots by eye: down the street from the entry, the bulb from its mouth, and a backyard
await g.scenario('bellfield_1v1_mason');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; });
await g.shot('bellfield-street');
await page.evaluate(() => { const p = Game.player; p.pos.set(-2, 0.1, 0.5); p.yaw = Math.PI / 2; stepGame(1 / 60); });
await g.shot('bellfield-bulb');
await page.evaluate(() => { const p = Game.player; p.pos.set(26, 0.1, 24); p.yaw = Math.PI / 2; stepGame(1 / 60); });
await g.shot('bellfield-backyards');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
