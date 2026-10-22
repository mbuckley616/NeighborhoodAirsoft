// v1.257 (backlog D.40, Michael: A): the backyard range, out the back door in the bedroom's hall. Checked: the door and
// its prompt (the front door still has the spawn), E takes you out with no briefing and no kids, roster or lives, the
// gun loads from your bag; each target does its own thing (a can is knocked off the plank and comes to rest on the
// grass, a bottle breaks, paper keeps a hole and lets the BB through, a bullseye keeps a mark and scores its ring);
// E at the bench stands everything back up; E at the back door takes you home with the gun's BBs back in the bag.
// Shots are BBs aimed straight at a target (makeBB, no curve) from the eye; the trigger path is checked once for cost.
// v1.306 (D.51 step 2): the yard is Michael's on Bunratty, the lane running west (−x) along his lawn from the bench
// past the fire pit; the ground is the map's, so the player is put down at the ground's height and the rest checks
// measure from it.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(30);
const hall = await page.evaluate(() => {
  const d = Game.interactables.find(i => i.type === 'back_door');
  const atSpawn = Game.focusedInteractable && Game.focusedInteractable.type;
  Game.player.pos.set(d.pos.x + 0.2, 0, d.pos.z); Game.player.yaw = Math.PI / 2;
  for (let i = 0; i < 3; i++) stepGame(1 / 60);
  return { door: !!d, atSpawn, focused: Game.focusedInteractable && Game.focusedInteractable.type,
    prompt: document.getElementById('interactPrompt').textContent.trim(), label: d && d._labelEl && d._labelEl.textContent.trim() };
});
check('the hall has a back door, labelled BACKYARD', hall.door && /backyard/i.test(hall.label || ''), hall.label);
check('at spawn the front door still has the prompt', hall.atSpawn === 'front_door', hall.atSpawn);
check('beside the back door its prompt reads "Go out back (the range)"', hall.focused === 'back_door' && /Go out back/.test(hall.prompt), hall.prompt);

const bag0 = await page.evaluate(() => Game.persist.bag);
await page.evaluate(() => { Game.mouse.locked = true; });
await page.keyboard.press('KeyE');
await g.spin(10);
const out = await page.evaluate(() => ({
  mode: Game.mode, range: !!Game.scenario.range, kids: Game.scenario.enemies.length, intro: document.getElementById('scenarioIntro').style.display,
  roster: document.getElementById('rosterHud').style.display, health: document.getElementById('healthHud').style.display,
  hud: document.getElementById('rangeHud').style.display, hudText: document.getElementById('rangeHud').textContent,
  ammo: Game.gun.ammo, bag: Game.persist.bag, pos: [Game.player.pos.x, Game.player.pos.z].map(v => +v.toFixed(2)),
  prompt: document.getElementById('interactPrompt').textContent.trim(),
}));
console.log('   out back:', JSON.stringify(out));
check('E takes you out back: a match with the range, no kids, no briefing', out.mode === 'scenario' && out.range && out.kids === 0 && out.intro !== 'flex', out);
check('no roster and no lives on screen; the range tally is', out.roster === 'none' && out.health === 'none' && out.hud === 'block' && /THE RANGE/.test(out.hudText), out);
check('the gun is loaded from your bag', out.ammo > 0 && out.bag === bag0 - out.ammo, { bag0, bag: out.bag, ammo: out.ammo });
check('you start at the back door, its prompt showing', /Go back inside/.test(out.prompt), out.prompt);
// v1.306: Michael's yard. From the French doors you can walk round the pool's fence and down the stone steps to the bench
// and on down the lane to the hammock, and not into the pool; the river shows from the bench, past the drop
const yard = await page.evaluate(() => {
  const R = Game.scenario.range, C = kidFreeCells(), b = C.b, c = LADDER_CELL;
  const cell = (x, z) => Math.round((x - b.minX) / c) * C.nz + Math.round((z - b.minZ) / c);
  const seen = new Uint8Array(C.nx * C.nz), q = [cell(R.door.x, R.door.z)]; seen[q[0]] = 1;
  while (q.length) { const k = q.pop(), i = Math.floor(k / C.nz), j = k % C.nz;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= C.nx || jj >= C.nz) continue; const kk = ii * C.nz + jj; if (!seen[kk] && C.free[kk]) { seen[kk] = 1; q.push(kk); } } }
  const reach = Object.fromEntries([['door', R.door.x, R.door.z], ['line', R.line.x, R.line.z], ['steps', 40.5, 37], ['hammock', 22.5, 42.5], ['pool', 31.8, 33]].map(([n, x, z]) => [n, !!seen[cell(x, z)]]));
  const gY = Game.scenario.groundY, eye = new THREE.Vector3(R.line.x, gY(R.line.x, R.line.z) + 1.6, R.line.z), ray = new THREE.Raycaster();
  Game.scene.updateMatrixWorld(true);
  const all = []; Game.scene.traverse(o => { if (o.isMesh) all.push(o); });
  let wet = 0;
  for (let a = -90; a <= 90; a += 3) for (let p = 2; p >= -16; p -= 1) {
    const yaw = a * Math.PI / 180, pt = p * Math.PI / 180;
    ray.set(eye, new THREE.Vector3(Math.sin(yaw) * Math.cos(pt), Math.sin(pt), Math.cos(yaw) * Math.cos(pt)));
    const h = ray.intersectObjects(all, false); if (h.length && h[0].object.name === 'rangeRiver') wet++;
  }
  return { reach, wet, lawnDrop: +(gY(R.door.x, R.door.z) - gY(R.line.x, R.line.z)).toFixed(2) };
});
console.log('   yard:', JSON.stringify(yard));
check('from the back door you can walk to the steps, the bench and the hammock end, and not into the pool',
  yard.reach.line && yard.reach.steps && yard.reach.hammock && !yard.reach.pool, yard.reach);
check('the bench stands on the lawn, below the terrace you came out on', yard.lawnDrop > 1.5, yard.lawnDrop);
check('from the bench you see the river down past the drop', yard.wet >= 3, yard.wet);

// a real trigger pull costs a real BB
const pull = await page.evaluate(() => {
  const a = Game.gun.ammo; Game.gun.cocked = true; Game.gun.fireCooldown = 0;
  Game.mouseLMB = true; onLmbDown(); Game.mouseLMB = false; onLmbUp(); Game.lmbConsumed = false;
  return { before: a, after: Game.gun.ammo };
});
check('a trigger pull uses a BB from the gun', pull.after < pull.before, pull);

// aimed shots from the bench line
await page.evaluate(() => {
  // 18 Oct fix-up: the trigger pull's BB above is cleared first. The page's own frame loop lands it between evaluates
  // locally, but on CI f20d3df it was still in the air when these shots stepped, hit a board and counted (4 bullseye
  // hits, 10 marks, for 3 and 8).
  for (const ob of Game.scenario.bbs) if (ob._whistle) bbWhistleStop(ob);
  Game.scenario.bbs.length = 0;
  const L = Game.scenario.range.line;
  Game.player.pos.set(L.x, Game.scenario.groundY(L.x, L.z), L.z); Game.player.yaw = Math.PI / 2;
  window._shoot = (x, y, z) => {
    const eye = new THREE.Vector3(Game.player.pos.x, Game.player.pos.y + Game.player.eyeOffset, Game.player.pos.z);
    const dir = new THREE.Vector3(x, y, z).sub(eye).normalize();
    const bb = makeBB(eye.clone().addScaledVector(dir, 0.4), dir.multiplyScalar(90), 'player', null, null, 'player');
    bb.curveStrength = 0;
    Game.scenario.bbs.push(bb);
    return bb;
  };
});
const shots = await page.evaluate(() => {
  const R = Game.scenario.range, res = {};
  // the third can, the first bottle, the near paper, the far bullseye dead centre and the near one 10 cm out
  const can = R.cans[2], home = can.home.clone(), bot = R.bottles[0], pap = R.papers[0], far = R.eyes.find(e => e.label === 'far'), near = R.eyes.find(e => e.label === 'near');
  _shoot(can.pos.x, can.pos.y, can.pos.z);
  for (let i = 0; i < 30; i++) stepGame(1 / 60);
  res.canFlying = can.state; res.canMoved = +can.pos.distanceTo(home).toFixed(2);
  for (let i = 0; i < 240; i++) stepGame(1 / 60);
  res.canRest = can.state; res.canY = +(can.pos.y - R.restY(can.pos.x, can.pos.z)).toFixed(3); res.othersUp = R.cans.filter(c => c !== can && c.state === 'up').length;
  _shoot(bot.x, bot.y0 + 0.08, bot.z); for (let i = 0; i < 60; i++) stepGame(1 / 60);
  res.bottle = bot.state; res.bottleShown = bot.g.visible; res.shards = R.shards.length; res.shardsDown = R.shards.every(s => s.still);
  const pb = _shoot(pap.x + 0.03, pap.y - 0.05, pap.z);
  for (let i = 0; i < 14; i++) stepGame(1 / 60);
  res.holes = R.stats.holes; res.pastPaper = pb.pos.x < pap.x - 0.5;
  for (let i = 0; i < 120; i++) stepGame(1 / 60);
  _shoot(far.x, far.y, far.z); for (let i = 0; i < 40; i++) stepGame(1 / 60);
  res.farLast = R.stats.last; res.farRing = R.stats.lastRing;
  // the rings themselves: BBs from half a metre in front of the near board, straight on (no drop to speak of)
  const close = (dz) => { const bb = makeBB(new THREE.Vector3(near.x + 0.5, near.y, near.z + dz), new THREE.Vector3(-90, 0, 0), 'player', null, null, 'player');
    bb.curveStrength = 0; Game.scenario.bbs.push(bb); for (let i = 0; i < 10; i++) stepGame(1 / 60); return R.stats.lastRing; };
  res.nearCentre = close(0); res.nearRing = close(0.1); res.nearLast = R.stats.last;
  res.marks = R.marks.length; res.stats = Object.assign({}, R.stats);
  res.hud = document.getElementById('rangeHud').textContent;
  return res;
});
console.log('   shots:', JSON.stringify(shots));
check('a can is knocked off the plank and comes to rest on the grass; the rest stay up',
  shots.canFlying === 'flying' && shots.canMoved > 0.2 && shots.canRest === 'down' && shots.canY < 0.05 && shots.othersUp === 5, shots);
check('a bottle breaks into glass that lands on the grass', shots.bottle === 'broken' && !shots.bottleShown && shots.shards === 8 && shots.shardsDown, shots);
check('paper keeps a hole and the BB goes on through', shots.holes === 1 && shots.pastPaper, shots);
check('from the bench, aimed dead centre at the far bullseye (20 m), the BB drops into the 8 or better', shots.farRing >= 8 && /far bullseye: \d+/.test(shots.farLast), shots.farLast);
check('on the near board the middle scores 10 and 10 cm out scores 6', shots.nearCentre === 10 && shots.nearRing === 6 && /near bullseye: 6/.test(shots.nearLast), shots);
check('every hole and BB mark is drawn (front and back)', shots.marks === 8, shots.marks);
check('the tally counts them', shots.stats.cans === 1 && shots.stats.bottles === 1 && shots.stats.eyeHits === 3 && /cans 1\/6/.test(shots.hud), shots.hud);

// v1.281 (critic, 19 Oct): with the mag empty the ammo box says the back door reloads, not F TO FORFEIT
const empty = await page.evaluate(() => { const a = Game.gun.ammo; Game.gun.ammo = 0; updateAmmoHud();
  const t = document.getElementById('ammoStatus').textContent; Game.gun.ammo = a; updateAmmoHud(); return t; });
check('an empty mag at the range reads "MAG EMPTY · BACK DOOR TO RELOAD"', empty === 'MAG EMPTY · BACK DOOR TO RELOAD', empty);
// the bench: E stands everything back up
const reset = await page.evaluate(() => {
  const R = Game.scenario.range;
  Game.player.pos.set(R.line.x, Game.scenario.groundY(R.line.x, R.line.z), R.line.z); for (let i = 0; i < 2; i++) stepGame(1 / 60);
  return { prompt: document.getElementById('interactPrompt').textContent.trim() };
});
check('at the bench the prompt reads "Stand everything back up"', /Stand everything back up/.test(reset.prompt), reset.prompt);
await page.keyboard.press('KeyE');
await g.spin(2);
const after = await page.evaluate(() => {
  const R = Game.scenario.range;
  return { up: R.cans.filter(c => c.state === 'up' && c.pos.distanceTo(c.home) < 1e-6).length, bottles: R.bottles.filter(b => b.state === 'up' && b.g.visible).length,
    shards: R.shards.length, marks: R.marks.length, stats: R.stats };
});
check('E at the bench: six cans on the plank, three bottles, no glass, clean paper and bullseyes',
  after.up === 6 && after.bottles === 3 && after.shards === 0 && after.marks === 0 && after.stats.cans === 0, after);

// home by the back door
const home = await page.evaluate(() => {
  const R = Game.scenario.range;
  Game.player.pos.set(R.door.x, Game.scenario.groundY(R.door.x, R.door.z), R.door.z); for (let i = 0; i < 2; i++) stepGame(1 / 60);
  return { ammo: Game.gun.ammo, bag: Game.persist.bag };
});
await page.keyboard.press('KeyE');
await g.spin(5);
const back = await page.evaluate(() => ({ mode: Game.mode, bag: Game.persist.bag, ammo: Game.gun.ammo, hud: document.getElementById('rangeHud').style.display,
  result: document.getElementById('resultScreen')?.style.display, range: !!Game.scenario.range }));
check('E at the back door: home to the bedroom, no result screen', back.mode === 'bedroom' && back.hud === 'none' && !back.range, back);
check('the BBs left in the gun go back in the bag; the ones fired are spent', back.bag === home.bag + home.ammo && back.bag === bag0 - 1, { bag0, home, back });
// F out there goes home too
await page.evaluate(() => enterRange());
await g.spin(3);
await page.keyboard.press('KeyF');
await g.spin(3);
check('F in the range goes home, no forfeit question', await page.evaluate(() => Game.mode === 'bedroom' && !Game.forfeitAsk));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
