// v1.185 (decisions, Michael: A): King of the Treehouse's start moves out of Connor's sight. At the side gate he had a
// line from the platform on the first frame and tagged the player 2.6–3.4 s after BEGIN in 17 of 17 critic rounds
// (v1.181), whatever the player did. The start is now behind the shed. Time through stepGame; hits are recorded, not
// applied, so a round runs on after the first one.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

// one round: optionally move the player at BEGIN, hold keys, record the first hit on him and who fired it
const round = (o) => page.evaluate((o) => {
  const p = Game.player, c = Game.scenario.enemies.find(e => e.charId === 'connor');
  const hits = [];
  const orig = applyBBHit;
  applyBBHit = (bb, t) => { if (t === p) { hits.push({ at: +Game.scenario.roundTime.toFixed(2),   // v1.189 fix-up: the round's clock (the loop's frames miss the page's own since BEGIN; CI read 6.0)
     by: bb.enemyRef ? (bb.enemyRef.charId || bb.enemyRef.id) : '?' }); return true; } return orig(bb, t); };
  if (o.at) { p.pos.x = o.at[0]; p.pos.z = o.at[1]; }
  if (o.yaw != null) { p.yaw = o.yaw; p.pitch = 0; }
  Game.mouse.locked = true; Game.keys = Game.keys || {};
  let i = 0, cLine = 0, cLineFirst = -1;
  for (; i < o.n; i++) {
    Game.keys['KeyW'] = !!o.w && i < (o.wFor || o.n); Game.keys['ShiftLeft'] = !!o.sprint && i < (o.wFor || o.n);
    stepGame(1 / 60);
    if (c.health > 0 && c._hasLOSNow) { cLine++; if (cLineFirst < 0) cLineFirst = +(i / 60).toFixed(2); }
    if (Game.mode !== 'scenario') break;
  }
  Game.keys['KeyW'] = false; Game.keys['ShiftLeft'] = false;
  applyBBHit = orig;
  const first = hits[0] || null, firstC = hits.find(h => h.by === (c.charId || c.id)) || null;
  return { first, firstConnor: firstC, hits: hits.length, cLine, cLineFirst, end: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)] };
}, o);

// --- the course: open to the trees, no ladder, the bank and the road 3.5 m up, the bunker where the oak was ---
await g.scenario('stoneglen_treehouse');
const course = await page.evaluate(() => {
  const sc = SCENARIOS.stoneglen_treehouse, obs = Game.player.obstacles, B = Game.scenario.bounds;
  const longWalls = obs.filter(o => o.shape !== 'cylinder' && o.h >= 1.6 && ((o.maxX - o.minX) > 20 || (o.maxZ - o.minZ) > 20)).length;
  const bags = obs.filter(o => o.surface === 'soft' && o.h > 0.85 && o.h < 0.95 && o.maxX > -2.3 && o.minX < 2.3 && o.maxZ > -8 && o.minZ < -4);
  return { name: sc.scenarioName, builder: sc.builderFn, ladders: (Game.scenario.ladders || []).length, perch: Game.scenario.enemies.some(e => e.perch),
    longWalls, bags: bags.length, toe: +scenarioGroundY(0, -20).toFixed(2), bound: +scenarioGroundY(0, B.minZ).toFixed(2), road: +scenarioGroundY(0, -31.5).toFixed(2), minZ: B.minZ };
});
console.log('  course', JSON.stringify(course));
check('King of the Course is on the twins\' course: no ladder, nobody perched', course.name === 'King of the Course' && course.builder === 'buildTwinsCourseScene' && course.ladders === 0 && !course.perch, course);
check('no fence: no wall over 20 m long and 1.6 m high round the yard', course.longWalls === 0, course);
check('the bunker: five walls of bags 0.9 m high round the middle', course.bags === 5, course);
check('the yard is flat to the bank, which is in play to 1.2 m up; the road is 3.5 m up, out of play', course.toe === 0 && course.bound > 0.5 && course.bound < 1.5 && course.road === 3.5 && course.minZ <= -23, course);

// --- the start: where it is, and no line to it from anywhere in the bunker ---
const start = await page.evaluate(() => {
  const p = Game.player, c = Game.scenario.enemies.find(e => e.charId === 'connor'), obs = p.obstacles;
  const P = { minX: -1.4, maxX: 1.4, minZ: -7.0, maxZ: -4.4 };
  let seen = 0, n = 0;
  for (let k = 0; k <= 4; k++) for (let j = 0; j <= 4; j++) for (const my of [0.9, 1.45]) for (const y of [0.5, 0.9, 1.2, 1.5]) {
    n++; if (hasLineOfSight(P.minX + (P.maxX - P.minX) * k / 4, my, P.minZ + (P.maxZ - P.minZ) * j / 4, p.pos.x, y, p.pos.z, obs)) seen++;
  }
  // and from the old side gate, for the record
  let seenGate = 0;
  for (let k = 0; k <= 4; k++) for (let j = 0; j <= 4; j++) if (hasLineOfSight(P.minX + (P.maxX - P.minX) * k / 4, 1.45, P.minZ + (P.maxZ - P.minZ) * j / 4, -13, 1.2, 14.4, obs)) seenGate++;
  return { pos: [p.pos.x, p.pos.z], yaw: +p.yaw.toFixed(2), seen, n, seenGate, dist: +Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z).toFixed(1), connor: [+c.pos.x.toFixed(1), +c.pos.z.toFixed(1)] };
});
console.log('  start', JSON.stringify(start));
check('the player starts behind the shed, at (14.5, −12)', start.pos[0] === 14.5 && start.pos[1] === -12, start);
check('Connor starts in the bunker', Math.abs(start.connor[0]) < 1.6 && start.connor[1] > -7.2 && start.connor[1] < -4.2, start);
check('no line to him from any of 25 spots in the bunker, crouched or standing, at any of four heights (0 of 200)', start.seen === 0, start);
check('the old side gate is in sight from most of the bunker (control)', start.seenGate >= 15, start);

// --- standing at the start: Connor never has a line, and nobody tags him before Haden walks over ---
const stand = [];
for (let r = 0; r < 6; r++) { await g.scenario('stoneglen_treehouse'); stand.push(await round({ n: 60 * 12 })); }
for (const [i, r] of stand.entries()) console.log('  stand', i, JSON.stringify(r));
check('standing at the start 12 s, Connor never has a line to him (6 rounds)', stand.every(r => r.cLine === 0), stand.map(r => r.cLine));
check('nor tags him (6 rounds)', stand.every(r => !r.firstConnor), stand.map(r => r.firstConnor));
// v1.189 fix-up: Haden, who walks over, tags at 6.0-8.3 s (CI caught 6.0 against "> 6"); the guard is against Connor's
// 2.6-3.4 s from the platform, so Connor is held to 6 s and anyone to 5 s
check('no hit by Connor before 6 s, and none at all before 5 s, in any round (was 2.6–3.4 s at the gate, v1.181)',
  stand.every(r => (!r.firstConnor || r.firstConnor.at >= 6) && (!r.first || r.first.at >= 5)), stand.map(r => r.first));

// --- control: the same round with the player put back at the side gate ---
const gate = [];
for (let r = 0; r < 3; r++) { await g.scenario('stoneglen_treehouse'); gate.push(await round({ n: 60 * 8, at: [-13, 14.4], yaw: -0.55 })); }
for (const [i, r] of gate.entries()) console.log('  gate', i, JSON.stringify(r));
// 27 Oct: Connor's first tag at the gate lands anywhere from 3.0 to 6.0 s (a miss or two first), so a time bar there
// failed one round in a few; the control is that the gate is open to him: a line from the first frame, and a tag in the 8 s
check('control: at the side gate Connor has a line from the start and tags him, every round',
  gate.every(r => r.cLineFirst === 0 && r.firstConnor), gate.map(r => [r.cLineFirst, r.firstConnor]));

// --- the start is not a hole: step out past the shed's corner toward the ladder and Connor sees him ---
const out = [];
for (let r = 0; r < 3; r++) { await g.scenario('stoneglen_treehouse'); out.push(await round({ n: 60 * 8, yaw: 2.0, w: true, wFor: 60 * 1.5 })); }
for (const [i, r] of out.entries()) console.log('  out', i, JSON.stringify(r));
check('walking out 1.5 s toward the bunker, Connor has a line to him (3 rounds)', out.every(r => r.cLine > 0), out.map(r => [r.cLineFirst, r.end]));

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
