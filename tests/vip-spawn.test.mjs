// v1.178 (D.18, Michael: C): Protect Ryan's Owen starts and comes back behind the east car, out of Sean's line.
// He used to start (and respawn) in the bulb fort, whose walls are too low to stop a BB, and Sean, on our side, held
// down the road to the west and tagged him each time he stood up. Checked: where Owen starts and where he comes back
// after a tag; Sean's fire from the six spots he was seen shooting Owen from (v1.176 probes), 60 shots each, at the old
// spawn and the new one; and played rounds with the player untaggable at his start (no page error, Owen leaves).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const OLD = [30.3, 1.7], NEW = [37.5, -1.9];
const SPOTS = [[10.3, 5.8], [14.7, 0.8], [6.9, 5.5], [6, 4.8], [1.5, -0.5], [12.1, 6.3]];

// --- where he starts
await g.scenario('bunratty_vip');
const start = await page.evaluate(() => {
  const owen = Game.scenario.enemies.find(e => e.name === 'Owen');
  return { pos: [owen.pos.x, owen.pos.z].map(v => +v.toFixed(2)), spawn: [owen._spawnPos.x, owen._spawnPos.z], state: owen.state,
    anchor: [owen.anchorPos.x, owen.anchorPos.z] };
});
console.log('   start:', JSON.stringify(start));
check('Owen starts behind the east car and walks to his anchor',
  Math.hypot(start.pos[0] - NEW[0], start.pos[1] - NEW[1]) < 0.6 && start.state === 'deploying', start);

// --- Sean's fire at each spawn
await g.spin(200);   // past the opening hold
const fire = await page.evaluate(({ OLD, NEW, SPOTS }) => {
  const ks = Game.scenario.enemies, sean = ks.find(e => e.name === 'Sean'), owen = ks.find(e => e.name === 'Owen');
  for (const k of ks) if (k !== sean && k !== owen) { k.pos.x = -60; k.pos.z = -60; }
  let hit = 0; const real = window.applyBBHit; window.applyBBHit = (bb, c) => { if (c === owen) hit++; };
  const out = {};
  for (const [key, at] of [['old', OLD], ['new', NEW]]) {
    const per = []; let los = 0;
    for (const s of SPOTS) {
      hit = 0; Game.scenario.bbs.length = 0;
      for (let n = 0; n < 60; n++) {
        sean.pos.set(s[0], 0, s[1]); sean.pos.y = kidGroundY(sean);
        owen.pos.set(at[0], 0, at[1]); owen.pos.y = kidGroundY(owen); owen.health = 100;
        sean.yaw = Math.atan2(-(owen.pos.x - sean.pos.x), -(owen.pos.z - sean.pos.z));
        const tp = owen.pos.clone(); tp.y += 1.0;
        spawnEnemyBB(sean, tp);
        for (let i = 0; i < 40; i++) updateBBs(1 / 60);
      }
      for (let i = 0; i < 200; i++) updateBBs(1 / 60);
      per.push(hit);
      if (_hasLOSTo(sean, owen)) los++;
    }
    out[key] = { hits: per.reduce((a, b) => a + b, 0), per, los };
  }
  window.applyBBHit = real;
  return out;
}, { OLD, NEW, SPOTS });
console.log('   Sean, 360 shots from his six spots:', JSON.stringify(fire));
check('control: Sean tags Owen at the old spawn in the fort (over 10 of 360)', fire.old.hits > 10, fire.old);
// (los is the kids' sight check, chest-high over the car's roof; the car's body stops every BB, which is what counts)
check('the new spawn is out of his line: the car stops his fire, at most 3 of 360', fire.new.hits <= 3, fire.new);

// --- a tagged Owen comes back to the new spawn, from his anchor
await g.scenario('bunratty_vip');
const back = await page.evaluate(() => {
  window._vsHit = window._vsHit || applyBBHit;
  window.applyBBHit = (bb, c) => c === Game.player ? undefined : window._vsHit(bb, c);
  const owen = Game.scenario.enemies.find(e => e.name === 'Owen');
  for (let i = 0; i < 180; i++) stepGame(1 / 60);
  owen.pos.x = owen.anchorPos.x; owen.pos.z = owen.anchorPos.z;
  eliminateEnemy(owen);
  let t = null, f = 0;
  while (f < 60 * 30 && Game.mode === 'scenario') {
    stepGame(1 / 60); f++;
    if (owen.state === 'deploying' && t == null) { t = +(f / 60).toFixed(1); break; }
  }
  return { t, pos: [owen.pos.x, owen.pos.z].map(v => +v.toFixed(1)), state: owen.state };
});
console.log('   tagged at his anchor:', JSON.stringify(back));
check('tagged at his anchor, Owen comes back at the new spawn and redeploys inside 30 s',
  back.t != null && Math.hypot(back.pos[0] - NEW[0], back.pos[1] - NEW[1]) < 1.5, back);

// --- played rounds, the player untaggable at his start
const rounds = [];
for (let r = 0; r < 3; r++) {
  await g.scenario('bunratty_vip');
  await page.evaluate(() => {
    window._vsHit = window._vsHit || applyBBHit;
    const owen = Game.scenario.enemies.find(e => e.name === 'Owen');
    window._vsR = { nearHits: 0, left: null, f: 0 };
    window.applyBBHit = (bb, c) => {
      if (c === Game.player) return;
      if (c === owen && Math.hypot(owen.pos.x - owen._spawnPos.x, owen.pos.z - owen._spawnPos.z) < 2) window._vsR.nearHits++;
      return window._vsHit(bb, c);
    };
  });
  for (let s = 0; s < 40; s++) {
    const m = await page.evaluate(() => {
      const owen = Game.scenario.enemies.find(e => e.name === 'Owen'), R = window._vsR;
      for (let i = 0; i < 60 && Game.mode === 'scenario'; i++) {
        stepGame(1 / 60); R.f++;
        if (R.left == null && Math.hypot(owen.pos.x - owen._spawnPos.x, owen.pos.z - owen._spawnPos.z) > 5) R.left = +(R.f / 60).toFixed(1);
      }
      return Game.mode;
    });
    if (m !== 'scenario') break;
  }
  rounds.push(await page.evaluate(() => window._vsR));
}
console.log('   rounds:', JSON.stringify(rounds));
check('played: Owen leaves his spawn inside 15 s every round', rounds.every(r => r.left != null && r.left < 15), rounds);
check('played: Owen is tagged at his spawn at most once a round', rounds.every(r => r.nearHits <= 1), rounds);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
