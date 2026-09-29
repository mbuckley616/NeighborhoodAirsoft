// v1.89 (backlog B.2): the kids' walk anim reads this frame's displacement. A teleport (the retreat
// anti-wedge sends a kid home in one frame) used to read as a sprint stride and play a footstep.
// Teleport each kid mid-match and check the anim speed and the footstep counter don't jump; walk
// normally and check the anim still sees real movement.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_ffa');
await g.spin(10);
// unkillable: BB hits on the player are dropped (raising maxHits instead would build that many HUD pips)
await page.evaluate(() => { const hit = window.__origHit = window.__origHit || applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
// normal play: the anim sees movement
const walk = await page.evaluate(() => {
  let maxSpeed = 0, frames = 0;
  for (let i = 0; i < 600 && Game.mode === 'scenario'; i++) {
    stepGame(1 / 60);
    for (const e of Game.scenario.enemies) if (e._animSpeed != null) { maxSpeed = Math.max(maxSpeed, e._animSpeed); frames++; }
  }
  return { maxSpeed: +maxSpeed.toFixed(2), frames, mode: Game.mode };
});
check('walking kids still animate (anim speed > 1 m/s seen)', walk.maxSpeed > 1 && walk.maxSpeed < 18, walk);

// a teleport: 25 m in one frame, as the anti-wedge bail does
const tp = await page.evaluate(() => {
  const out = [];
  for (const e of Game.scenario.enemies) {
    if (e.state === 'out' || e.state === 'down') continue;
    stepGame(1 / 60);
    const w0 = e._walkInt, f0 = e._footstepDist || 0;
    e.pos.x += 25;
    stepGame(1 / 60);
    out.push({ name: e.name || e.id, state: e.state, speed: +(e._animSpeed ?? -1).toFixed(2), dWalk: +(e._walkInt - w0).toFixed(3),
               footstep: +((e._footstepDist || 0) - f0).toFixed(3) });
  }
  return out;
});
check('teleported kids found', tp.length >= 2, tp.length);
check('the match is still on', await g.mode() === 'scenario');
for (const t of tp) {
  check(`${t.name}: a 25 m teleport reads as no stride (anim speed ≤ 8 m/s)`, t.speed <= 8, t);
  check(`${t.name}: walk intensity doesn't jump (Δ ≤ 0.05)`, t.dWalk <= 0.05, t);
  check(`${t.name}: no footstep from the teleport`, t.footstep >= 0 && t.footstep < 0.2, t);   // a step resets the counter to 0
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
