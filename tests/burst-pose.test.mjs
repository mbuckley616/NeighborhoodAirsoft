// Backlog C.3 (v1.77/v1.78): through an auto burst a kid's shouldered hold (_aimAmt) should stay up, and
// when the burst fires over cover the over-cover lift (_firingOverCover) should hold for the whole string
// rather than dipping between rounds. Full-Auto Mayhem (Night), 90 s, player unkillable. A burst is a
// run of trigger pulls from one kid no more than 0.35 s apart.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('hollow_full_auto_mayhem');
const r = await page.evaluate(() => {
  const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
  const sp = spawnEnemyBB; let frame = 0;
  const last = new Map(), bursts = [];
  window.spawnEnemyBB = function (e) {
    const b = last.get(e);
    if (b && frame - b.lastFrame <= 21) { b.lastFrame = frame; b.shots++; }
    else { const nb = { e, start: frame, lastFrame: frame, shots: 1, frames: 0, aimLow: 0, liftFrames: 0, liftDrop: 0, minAim: 1 }; last.set(e, nb); bursts.push(nb); }
    return sp.apply(this, arguments);
  };
  for (; frame < 5400 && Game.mode === 'scenario'; frame++) {
    stepGame(1 / 60);
    for (const b of last.values()) {
      if (frame <= b.start || frame > b.lastFrame) continue;          // inside the string, after the first round
      const e = b.e; if (!(e.health > 0)) continue;
      b.frames++;
      const a = e._aimAmt ?? 0; b.minAim = Math.min(b.minAim, a); if (a < 0.8) b.aimLow++;
      if (b.prevAim != null && a < b.prevAim - 0.005) b.aimFall = (b.aimFall || 0) + 1; b.prevAim = a;
      if ((e._firingOverCover || 0) > 0) b.liftFrames++; else if (b.liftFrames > 0) b.liftDrop++;
    }
  }
  window.spawnEnemyBB = sp; window.applyBBHit = hit;
  const strings = bursts.filter(b => b.shots >= 3);
  const lifted = strings.filter(b => b.liftFrames > 0);
  return {
    mode: Game.mode, bursts: strings.length, frames: strings.reduce((n, b) => n + b.frames, 0),
    aimLowFrames: strings.reduce((n, b) => n + b.aimLow, 0), aimFallFrames: strings.reduce((n, b) => n + (b.aimFall || 0), 0),
    fallBursts: strings.filter(b => b.aimFall).length, minAim: +Math.min(1, ...strings.map(b => b.minAim)).toFixed(2),
    lifted: lifted.length, liftHeld: lifted.filter(b => b.liftDrop === 0).length, liftDropFrames: lifted.reduce((n, b) => n + b.liftDrop, 0),
  };
});
check('auto bursts sampled (3+ rounds)', r.bursts >= 30, r);
// The hold ramps up from rest over the first ~11 frames of a string (by design: it eases in), so the check
// is that it never EASES BACK OUT while the string is still firing.
check('the shouldered hold never eases out mid-burst (under 1% of frames falling)', r.aimFallFrames / Math.max(1, r.frames) < 0.01, r);
// reported: how often an over-cover string loses its lift partway
console.log(`  over-cover strings: ${r.lifted}, lift held throughout: ${r.liftHeld}, dropped frames: ${r.liftDropFrames} of ${r.frames}`);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
