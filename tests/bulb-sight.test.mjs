// v1.180 (critic, 8 Oct): kids on the cul-de-sac's raised bulb never fired. The sight check behind `_hasLOSNow` (and the
// deploying kid's bail-out) put the muzzle at the perch's height or 0, leaving out the ground under him (0.35 m on the
// bulb), so the plank fort's wall hid the player from Storm the Court's sniper Mitchell and Protect Ryan's VIP Priya.
// It now reads the kid's real height, `pos.y`, as the shot itself already did. Checked: the sight check from the
// played rounds with the player untaggable in the open at (18.7, 1.4), 12 m from the bulb. On v1.179 the same rounds gave
// Mitchell a line in 3 of 40 half-second samples and 1 shot in 20 s, and Priya a line in 1 of 40 and 2-3 shots.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- played: the player untaggable in the open at (18.7, 1.4); count each bulb kid's shots
async function played(id, name, secs) {
  await g.scenario(id);
  return page.evaluate(({ name, secs }) => {
    window._bsHit = window._bsHit || applyBBHit; window._bsBB = window._bsBB || spawnEnemyBB;
    window.applyBBHit = (bb, c) => c === Game.player ? undefined : window._bsHit(bb, c);
    const k = Game.scenario.enemies.find(e => e.name === name);
    let shots = 0, los = 0, f = 0;
    window.spawnEnemyBB = (e, ...a) => { if (e === k) shots++; return window._bsBB(e, ...a); };
    for (; f < secs * 60 && Game.mode === 'scenario'; f++) {
      Game.player.pos.x = 18.7; Game.player.pos.z = 1.4;
      stepGame(1 / 60);
      if (f % 30 === 0 && k._hasLOSNow) los++;
    }
    window.spawnEnemyBB = window._bsBB; window.applyBBHit = window._bsHit;
    return { shots, los, y: +k.pos.y.toFixed(2), t: +(f / 60).toFixed(1), out: k.health <= 0 };
  }, { name, secs });
}
const mitch = [], priya = [];
for (let r = 0; r < 3; r++) mitch.push(await played('bunratty_storm_the_court', 'Mitchell', 20));
for (let r = 0; r < 3; r++) priya.push(await played('bunratty_vip', 'Priya', 20));
console.log('   Storm the Court, Mitchell:', JSON.stringify(mitch));
console.log('   Protect Ryan, Priya:', JSON.stringify(priya));
check('Mitchell holds the raised bulb (y over 0.2)', mitch.every(r => r.y > 0.2), mitch);
check('Mitchell sees the player in over half the samples every round (was 3 of 40)', mitch.every(r => r.los > 20), mitch);
check('Mitchell fires 3 or more shots every round (was 1)', mitch.every(r => r.shots >= 3), mitch);
check('Priya sees the player in over half the samples every round (was 1 of 40)', priya.every(r => r.los > 20), priya);
check('Priya fires 6 or more shots in at least 2 of 3 rounds (was 2-3)', priya.filter(r => r.shots >= 6).length >= 2, priya);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
