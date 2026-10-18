// v1.257 (backlog D.40, Michael: A): the backyard range, out the back door in the bedroom's hall. Checked: the door and
// its prompt (the front door still has the spawn), E takes you out with no briefing and no kids, roster or lives, the
// gun loads from your bag; each target does its own thing (a can is knocked off the plank and comes to rest on the
// grass, a bottle breaks, paper keeps a hole and lets the BB through, a bullseye keeps a mark and scores its ring);
// E at the bench stands everything back up; E at the back door takes you home with the gun's BBs back in the bag.
// Shots are BBs aimed straight at a target (makeBB, no curve) from the eye; the trigger path is checked once for cost.
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

// a real trigger pull costs a real BB
const pull = await page.evaluate(() => {
  const a = Game.gun.ammo; Game.gun.cocked = true; Game.gun.fireCooldown = 0;
  Game.mouseLMB = true; onLmbDown(); Game.mouseLMB = false; onLmbUp(); Game.lmbConsumed = false;
  return { before: a, after: Game.gun.ammo };
});
check('a trigger pull uses a BB from the gun', pull.after < pull.before, pull);

// aimed shots from the bench line
await page.evaluate(() => {
  Game.player.pos.set(Game.scenario.range.bench.x, 0, Game.scenario.range.bench.z - 0.8); Game.player.yaw = 0;
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
  res.canRest = can.state; res.canY = +can.pos.y.toFixed(3); res.othersUp = R.cans.filter(c => c !== can && c.state === 'up').length;
  _shoot(bot.x, bot.y0 + 0.08, bot.z); for (let i = 0; i < 60; i++) stepGame(1 / 60);
  res.bottle = bot.state; res.bottleShown = bot.g.visible; res.shards = R.shards.length; res.shardsDown = R.shards.every(s => s.still);
  const pb = _shoot(pap.x + 0.03, pap.y - 0.05, pap.z);
  for (let i = 0; i < 14; i++) stepGame(1 / 60);
  res.holes = R.stats.holes; res.pastPaper = pb.pos.z < pap.z - 0.5;
  for (let i = 0; i < 120; i++) stepGame(1 / 60);
  _shoot(far.x, far.y, far.z); for (let i = 0; i < 40; i++) stepGame(1 / 60);
  res.farLast = R.stats.last; res.farRing = R.stats.lastRing;
  // the rings themselves: BBs from half a metre in front of the near board, straight on (no drop to speak of)
  const close = (dx) => { const bb = makeBB(new THREE.Vector3(near.x + dx, near.y, near.z + 0.5), new THREE.Vector3(0, 0, -90), 'player', null, null, 'player');
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

// the bench: E stands everything back up
const reset = await page.evaluate(() => {
  const R = Game.scenario.range;
  Game.player.pos.set(R.bench.x, 0, R.bench.z - 0.6); for (let i = 0; i < 2; i++) stepGame(1 / 60);
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
  Game.player.pos.set(R.door.x, 0, R.door.z); for (let i = 0; i < 2; i++) stepGame(1 / 60);
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
