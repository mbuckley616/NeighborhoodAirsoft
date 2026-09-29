// Smoke: the title boots, NEW GAME reaches the bedroom, and a scenario starts and runs 10 s of
// fixed steps without a page error. The first thing every session and every playtest runs.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
check('title screen up', await g.mode() === 'title');
await g.bedroom();
await g.spin(120);
check('NEW GAME reaches the bedroom', await g.mode() === 'bedroom');
await g.scenario('winnmark_tutorial');
const mode = await g.spin(600);
const st = await page.evaluate(() => ({ enemies: (Game.scenario && Game.scenario.enemies || []).length, hits: Game.player.hitsTaken }));
check('tutorial runs 600 steps', mode === 'scenario' || mode === 'result', { mode, ...st });
check('tutorial has its three targets and the coach', st.enemies >= 3, st);
await g.shot('smoke-tutorial');
check('no page errors', g.errs.length === 0, g.errs);
// v1.96 fix-up: a pointer-lock request without a fresh user gesture is rejected by newer Chromium (CI saw it
// after a script-driven BEGIN). The rejection must be handled, not surface as a page error.
const errs0 = g.errs.length;
await page.evaluate(() => { const el = Game.renderer.domElement, orig = el.requestPointerLock;
  el.requestPointerLock = () => Promise.reject(new DOMException('A user gesture is required to request Pointer Lock.', 'NotAllowedError'));
  try { requestPointerLock(); } finally { el.requestPointerLock = orig; } });
await g.spin(10); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
check('a refused pointer lock is not a page error', g.errs.length === errs0, g.errs.slice(errs0));
// ...nor one refused by a synchronous throw ("Too many pointer lock requests in a short window of time")
const threw = await page.evaluate(() => { const el = Game.renderer.domElement, orig = el.requestPointerLock;
  el.requestPointerLock = () => { throw new DOMException('Too many pointer lock requests in a short window of time.', 'InvalidStateError'); };
  try { requestPointerLock(); return null; } catch (e) { return e.message; } finally { el.requestPointerLock = orig; } });
await g.spin(10);
check('a pointer lock refused by a throw is caught too', threw === null && g.errs.length === errs0, { threw, errs: g.errs.slice(errs0) });
await g.close();
