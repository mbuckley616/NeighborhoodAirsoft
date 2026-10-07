// v1.174 (backlog B.7): CI's headless Chromium sometimes refuses the pointer lock that BEGIN asks for, and updatePlayer
// moves no one while the mouse is unlocked, so a test holding W stood still (country-club's pool walk on PR #41, 6 Oct:
// the player never left (-24, -2.5)). g.scenario() now marks the lock taken. Here the page refuses every lock, and the
// walk still reaches the pool's edge; with the flag cleared, the same walk goes nowhere, which is the CI failure.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
// refuse the lock the way CI's Chromium does: no lock, no pointerlockchange
await page.evaluate(() => {
  if (document.pointerLockElement) document.exitPointerLock();
  HTMLCanvasElement.prototype.requestPointerLock = function () { return Promise.reject(new Error('refused (test)')); };
});
await g.scenario('club_1v1_brooke');
const r = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) e.health = 0;
  const P = Game.player;
  const walk = (secs) => {
    P.pos.set(-24, 0, -2.5); P.yaw = 0; P.pitch = 0;
    for (let f = 0; f < secs * 60; f++) { Game.keys.KeyW = true; stepGame(1 / 60); }
    Game.keys.KeyW = false;
    return { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2) };
  };
  const real = document.pointerLockElement === Game.renderer.domElement;
  const flag = Game.mouse.locked;
  const pool = walk(3);
  const stillFlag = Game.mouse.locked;
  Game.mouse.locked = false;
  const unlocked = walk(3);
  Game.mouse.locked = true;
  return { real, flag, stillFlag, pool, unlocked };
});
console.log('  lock:', JSON.stringify(r));
check('the page holds no real pointer lock', !r.real, r.real);
check('g.scenario marks the lock taken anyway', r.flag && r.stillFlag, r);
check('so walking at the pool reaches its edge (z -8, plus the body radius)', r.pool.z > -8 && r.pool.z < -7.2, r.pool);
check('without the flag the same walk goes nowhere (the CI failure)', r.unlocked.z === -2.5, r.unlocked);
await g.close();
