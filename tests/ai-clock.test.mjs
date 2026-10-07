// v1.176 (Found in play, v1.175): Lights Out's Devon, the sniper in the stockroom's centre doorway, fired 0 shots in a
// loaded full run while an opponent came within 16.9 m. The kids' spotted memory (keep firing at the last-seen spot for
// 3.2 s), their near-miss stamps and their reaction cooldown read performance.now(), the wall clock, so in a test that
// steps faster or slower than real time they lasted more or fewer game seconds than in play. They now run on simulated
// time. Here a kid sees the player for one frame and loses him, and the memory must last 3.2 game seconds whether the
// wall clock stands still, keeps real time or races twenty times ahead; then Devon must fire in Lights Out with the wall
// clock racing five times ahead. (That last check is a guard: the old build passes it too, 3-5 shots a round; the memory
// check is the one it fails, 10 s and more with the clock frozen or real, 0.17 s with it racing.)
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const memory = [];
for (const clock of ['frozen', 'real', 'racing']) {
  await g.scenario('store_1v1_tyler');
  memory.push(await page.evaluate((clock) => {
    const pn = performance.now.bind(performance), t0 = pn(), base = Game.scenario.roundTime || 0;
    if (clock !== 'real') performance.now = () => clock === 'frozen' ? t0 : t0 + ((Game.scenario.roundTime || 0) - base) * 1000 * 20;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const los = hasLineOfSight, kid = Game.scenario.enemies[0];
    for (let f = 0; f < 180; f++) stepGame(1 / 60);              // past the opening hold
    hasLineOfSight = () => true; stepGame(1 / 60);              // he sees the player for one frame
    const saw = !!kid._recentlySpotted;
    hasLineOfSight = () => false;                               // and loses him
    let t = 0;
    for (; t < 10 && kid._recentlySpotted; t += 1 / 60) stepGame(1 / 60);
    hasLineOfSight = los; applyBBHit = orig; performance.now = pn;
    return { clock, saw, lasted: +t.toFixed(2), state: kid.state };
  }, clock));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
console.log('  memory:', JSON.stringify(memory));
for (const m of memory)
  check(`with the wall clock ${m.clock}, a kid who saw the player keeps him in mind 3.2 game seconds`, m.saw && Math.abs(m.lasted - 3.2) < 0.1, m);

const rounds = [];
for (let r = 0; r < 3; r++) {
  await g.scenario('store_night_4v4');
  rounds.push(await page.evaluate(() => {
    const pn = performance.now.bind(performance), t0 = pn(), base = Game.scenario.roundTime || 0;
    performance.now = () => t0 + ((Game.scenario.roundTime || 0) - base) * 1000 * 5;
    const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
    const d = Game.scenario.enemies.find(k => k.character?.name === 'Devon');
    let fired = 0; const o = spawnEnemyBB; spawnEnemyBB = (e, t) => { if (e === d) fired++; return o(e, t); };
    for (let f = 0; f < 60 * 60 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
    spawnEnemyBB = o; applyBBHit = orig; performance.now = pn;
    return { fired, at: [+d.pos.x.toFixed(1), +d.pos.z.toFixed(1)] };
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
console.log('  Devon, wall clock 5x:', JSON.stringify(rounds));
check('Lights Out: with the wall clock racing, Devon holds the doorway and fires every round', rounds.every(r => r.fired > 0 && Math.hypot(r.at[0] + 1, r.at[1] + 20) < 4), rounds);
await g.close();
