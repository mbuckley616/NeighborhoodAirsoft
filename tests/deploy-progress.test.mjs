// v1.265 fix-up (CI on PR #87: stuck-sweep 5, 15 and 16 on three Hollow matches): ally Sean held 'deploying' within 1 m
// of (4.9, 33.6) for 26-71 s. Deploying south to his anchor through the back wall of the Hollow's south fort (v1.259),
// he crept ~1 cm/s along it and was nudged back 8 cm every few seconds, and each nudge reset the deploying watchdog's
// "moved over 2 cm" test. Now the watchdog also counts ground gained toward the anchor, as retreating does (v1.164).
// Checked by putting Sean on that spot, deploying, in the three Hollow battles, for 20 s.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
for (const id of ['hollow_big_battle', 'hollow_full_auto_mayhem', 'hollow_night_battle']) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    Game.player.maxHits = 999;
    const s = Game.scenario.enemies.find(e => e.charId === 'sean');
    s.pos.x = 4.9; s.pos.z = 33.6; s.state = 'deploying'; s.stateTime = 0; s.deployDelay = 0;
    // as the stuck-kid sweep counts it: a moving state within 1 m of the spot, away from the player
    const MOVING = ['advancing', 'repositioning', 'chasing', 'deploying', 'retreating'];   // tests/lib/stuck-sweep.mjs's list
    let left = null, held = 0;
    for (let i = 0; i < 1200; i++) {
      stepGame(1 / 60);
      const near = Math.hypot(s.pos.x - 4.9, s.pos.z - 33.6) < 1;
      const byYou = Math.hypot(s.pos.x - Game.player.pos.x, s.pos.z - Game.player.pos.z) < 2.5;
      if (MOVING.includes(s.state) && near && !byYou) held += 1 / 60;
      if (left === null && s.state !== 'deploying') left = +(i / 60).toFixed(2);
    }
    return { left, held: +held.toFixed(2), end: [s.pos.x, s.pos.z].map(v => +v.toFixed(1)), state: s.state,
      walked: +Math.hypot(s.pos.x - 4.9, s.pos.z - 33.6).toFixed(1) };
  });
  console.log('  ', id, JSON.stringify(r));
  check(`${id}: Sean, deploying behind the south fort, gives up the wall within 3 s, and in 20 s is held moving by it (away from you) 6 s at most (was the whole 20 s; the sweep allows 15)`,
    r.left !== null && r.left <= 3 && r.held <= 6, r);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
