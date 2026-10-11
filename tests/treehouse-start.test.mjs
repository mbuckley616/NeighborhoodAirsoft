// v1.185 (decisions, Michael: A): King of the Treehouse's start moves out of Connor's sight. At the side gate he had a
// line from the platform on the first frame and tagged the player 2.6–3.4 s after BEGIN in 17 of 17 critic rounds
// (v1.181), whatever the player did. The start is now behind the shed. Time through stepGame; hits are recorded, not
// applied, so a round runs on after the first one.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

// one round: optionally move the player at BEGIN, hold keys, record the first hit on him and who fired it
const round = (o) => page.evaluate((o) => {
  const p = Game.player, c = Game.scenario.enemies.find(e => e.perch);
  const hits = [];
  const orig = applyBBHit;
  applyBBHit = (bb, t) => { if (t === p) { hits.push({ at: +(i / 60).toFixed(2), by: bb.enemyRef ? (bb.enemyRef.charId || bb.enemyRef.id) : '?' }); return true; } return orig(bb, t); };
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

// --- the start: where it is, and no line to it from anywhere on the platform ---
await g.scenario('stoneglen_treehouse');
const start = await page.evaluate(() => {
  const p = Game.player, c = Game.scenario.enemies.find(e => e.perch), P = c.perch, obs = p.obstacles;
  const my = P.y + 1.05 * (c.mesh.scaleY ?? 1);
  let seen = 0, n = 0;
  for (let k = 0; k <= 4; k++) for (let j = 0; j <= 4; j++) for (const y of [0.5, 0.9, 1.2, 1.5]) {
    n++; if (hasLineOfSight(P.minX + (P.maxX - P.minX) * k / 4, my, P.minZ + (P.maxZ - P.minZ) * j / 4, p.pos.x, y, p.pos.z, obs)) seen++;
  }
  // and from the old side gate, for the record
  let seenGate = 0;
  for (let k = 0; k <= 4; k++) for (let j = 0; j <= 4; j++) if (hasLineOfSight(P.minX + (P.maxX - P.minX) * k / 4, my, P.minZ + (P.maxZ - P.minZ) * j / 4, -13, 1.2, 14.4, obs)) seenGate++;
  return { pos: [p.pos.x, p.pos.z], yaw: +p.yaw.toFixed(2), seen, n, seenGate, dist: +Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z).toFixed(1) };
});
console.log('  start', JSON.stringify(start));
check('the player starts behind the shed, at (14.5, −12)', start.pos[0] === 14.5 && start.pos[1] === -12, start);
check('no line to him from any of 25 spots on the platform, at any of four heights (0 of 100)', start.seen === 0, start);
check('the old side gate was in sight from most of the platform (control)', start.seenGate >= 20, start);

// --- standing at the start: Connor never has a line, and nobody tags him before Haden walks over ---
const stand = [];
for (let r = 0; r < 6; r++) { await g.scenario('stoneglen_treehouse'); stand.push(await round({ n: 60 * 12 })); }
for (const [i, r] of stand.entries()) console.log('  stand', i, JSON.stringify(r));
check('standing at the start 12 s, Connor never has a line to him (6 rounds)', stand.every(r => r.cLine === 0), stand.map(r => r.cLine));
check('nor tags him (6 rounds)', stand.every(r => !r.firstConnor), stand.map(r => r.firstConnor));
check('no hit at all before 6 s in any round (was 2.6–3.4 s at the gate)', stand.every(r => !r.first || r.first.at > 6), stand.map(r => r.first));

// --- control: the same round with the player put back at the side gate ---
const gate = [];
for (let r = 0; r < 3; r++) { await g.scenario('stoneglen_treehouse'); gate.push(await round({ n: 60 * 8, at: [-13, 14.4], yaw: -0.55 })); }
for (const [i, r] of gate.entries()) console.log('  gate', i, JSON.stringify(r));
check('control: at the side gate Connor tags him inside 5 s, every round', gate.every(r => r.firstConnor && r.firstConnor.at < 5), gate.map(r => r.firstConnor));

// --- the start is not a hole: step out past the shed's corner toward the ladder and Connor sees him ---
const out = [];
for (let r = 0; r < 3; r++) { await g.scenario('stoneglen_treehouse'); out.push(await round({ n: 60 * 8, yaw: 2.0, w: true, wFor: 60 * 1.5 })); }
for (const [i, r] of out.entries()) console.log('  out', i, JSON.stringify(r));
check('walking out 1.5 s toward the oak, Connor has a line to him (3 rounds)', out.every(r => r.cLine > 0), out.map(r => [r.cLineFirst, r.end]));

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
