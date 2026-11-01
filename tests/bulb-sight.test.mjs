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
async function played(id, name, secs, at = [18.7, 1.4]) {
  await g.scenario(id);
  return page.evaluate(({ name, secs, at }) => {
    window._bsHit = window._bsHit || applyBBHit; window._bsBB = window._bsBB || spawnEnemyBB;
    const k = Game.scenario.enemies.find(e => e.name === name);
    // v1.409: the bulb kid is untaggable too: since v1.408 Sean and Nick are on your side in Storm the Court and tagged
    // Mitchell inside 20 s in 2 of 3 rounds, which measured the crew, not his sight line
    window.applyBBHit = (bb, c) => c === Game.player || c === k ? undefined : window._bsHit(bb, c);
    let shots = 0, los = 0, f = 0;
    window.spawnEnemyBB = (e, ...a) => { if (e === k) shots++; return window._bsBB(e, ...a); };
    for (; f < secs * 60 && Game.mode === 'scenario'; f++) {
      Game.player.pos.x = at[0]; Game.player.pos.z = at[1];
      stepGame(1 / 60);
      if (f % 30 === 0 && k._hasLOSNow) los++;
    }
    window.spawnEnemyBB = window._bsBB; window.applyBBHit = window._bsHit;
    return { shots, los, y: +k.pos.y.toFixed(2), t: +(f / 60).toFixed(1), out: k.health <= 0 };
  }, { name, secs, at });
}
const mitch = [], priya = [];   // v1.368 (D.58): Protect Ryan's VIP on the plank is Mitchell now (Priya retired); `priya` is that spot
for (let r = 0; r < 3; r++) mitch.push(await played('bunratty_storm_the_court', 'Mitchell', 20));
// v1.272 (Michael: A): Protect Ryan's 1.5 m barricade now stands in front of Priya, so she no longer sees down the lane
// to (18.7, 1.4); the raised-bulb sight check is kept on a bulb spot she still covers, the north side at (34, 7), 5 m off
for (let r = 0; r < 3; r++) priya.push(await played('bunratty_vip', 'Mitchell', 20, [34, 7]));
console.log('   Storm the Court, Mitchell:', JSON.stringify(mitch));
console.log('   Protect Ryan, their VIP (Mitchell):', JSON.stringify(priya));
check('Mitchell holds the raised bulb (y over 0.2)', mitch.every(r => r.y > 0.2), mitch);
check('Mitchell sees the player in over half the samples every round (was 3 of 40)', mitch.every(r => r.los > 20), mitch);
check('Mitchell fires 3 or more shots every round (was 1)', mitch.every(r => r.shots >= 3), mitch);
check('Protect Ryan\'s VIP sees the player on the bulb in over half the samples every round (was 1 of 40 in the lane on v1.179)', priya.every(r => r.los > 20), priya);
check('Protect Ryan\'s VIP fires 6 or more shots in at least 2 of 3 rounds (was 2-3)', priya.filter(r => r.shots >= 6).length >= 2, priya);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
