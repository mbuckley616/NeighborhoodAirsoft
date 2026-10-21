// v1.282 (critic, 20 Oct, Found in play): in Protect Ryan (`bunratty_vip`) Mitchell (anchor bulb_car1) took Priya's
// plank, their VIP's own cover, as his and stood inside her: centres 0.17 m apart, within 0.5 m for 10-36 s of a 60 s
// round in about half the rounds. Now no kid takes cover a living VIP holds. Played with you untouchable, 60 s a round
// through stepGame, six rounds: no kid of either side within 0.5 m of Priya for over 1 s, and none has her cover.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const rounds = [];
for (let r = 0; r < 6; r++) {
  await g.scenario('bunratty_vip');
  rounds.push(await page.evaluate(() => {
    const P = Game.player; P.invuln = true;
    const real = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? true : real(bb, c);
    const pr = Game.scenario.enemies.find(e => e.name === 'Priya');
    const close = {}, took = {};
    let minD = 99, t = 0;
    for (let i = 0; i < 60 * 60 && Game.mode === 'scenario'; i++) {
      stepGame(1 / 60); t += 1 / 60;
      if (pr.health <= 0) break;
      for (const k of Game.scenario.enemies) {
        if (k === pr || k.health <= 0 || k.state === 'retreating') continue;
        const d = Math.hypot(k.pos.x - pr.pos.x, k.pos.z - pr.pos.z);
        if (d < 0.5) close[k.name] = (close[k.name] || 0) + 1 / 60;
        if (k.homeCover && k.homeCover === pr.homeCover) took[k.name] = (took[k.name] || 0) + 1 / 60;
        minD = Math.min(minD, d);
      }
    }
    applyBBHit = real;
    const r = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(1)]));
    return { t: +t.toFixed(0), close: r(close), took: r(took), minD: +minD.toFixed(2), prCover: !!pr.homeCover };
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
}
for (const [i, x] of rounds.entries()) console.log(`   round ${i + 1}: ${JSON.stringify(x)}`);
check('Priya holds her plank as her cover', rounds.every(x => x.prCover), rounds.map(x => x.prCover));
check('no kid takes Priya\'s cover in six rounds', rounds.every(x => Object.keys(x.took).length === 0), rounds.map(x => x.took));
check('no kid stands within 0.5 m of Priya for over 1 s', rounds.every(x => Object.values(x.close).every(v => v <= 1)), rounds.map(x => x.close));

// v1.293 (critic, 21 Oct): one kid over, Owen repositioned to the cover Mitchell held and stood inside him (centres
// 0.01-0.17 m apart for 27-56 s of 90 s, 4 of 8 rounds). Four rounds of 90 s: Owen and Mitchell are within 0.35 m for
// 6 s at most. (They can still hold one long cover by another pick, a dash or a bound, standing apart: logged.)
const pairs = [];
for (let r = 0; r < 4; r++) {
  await g.scenario('bunratty_vip');
  pairs.push(await page.evaluate(() => {
    const real = applyBBHit; applyBBHit = (bb, c) => c === Game.player ? true : real(bb, c);
    const o = Game.scenario.enemies.find(e => e.name === 'Owen'), m = Game.scenario.enemies.find(e => e.name === 'Mitchell');
    const up = k => k.health > 0 && k.state !== 'retreating';
    let close = 0, shared = 0;
    for (let i = 0; i < 60 * 90 && Game.mode === 'scenario'; i++) {
      stepGame(1 / 60);
      if (up(o) && up(m) && Math.hypot(o.pos.x - m.pos.x, o.pos.z - m.pos.z) < 0.35) close += 1 / 60;
      if (up(o) && up(m) && o.homeCover && o.homeCover === m.homeCover) shared += 1 / 60;
    }
    applyBBHit = real;
    return { close: +close.toFixed(1), shared: +shared.toFixed(1) };
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
}
console.log('   Owen and Mitchell:', JSON.stringify(pairs));
check('Owen and Mitchell stand inside 0.35 m of each other for 6 s at most a round (27-56 s before v1.293)', pairs.every(x => x.close <= 6), pairs);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
