// v1.129 (Found in play, the harness stall since v1.110): when NEW GAME hangs the page (about 2–4% of boots under
// load), g.bedroom() gives up after its watchdog, closes that browser, boots a fresh one and goes again, and the suite's
// `page` follows the new page. Simulated here by hanging the first page's main thread in a loop, with a 10 s watchdog
// in place of the real 75 s. The suite exiting at all shows the hung browser does not keep Node alive.
import { boot, check } from './lib/game.mjs';
const t0 = Date.now();
const g = await boot({ stallOnce: true, bedroomTimeout: 10000 }); const { page } = g;
await g.bedroom();
const secs = (Date.now() - t0) / 1000;
console.log(`   recovered in ${secs.toFixed(1)} s, restarts ${g.bedroom.retries}`);
check('a hung NEW GAME is restarted once', g.bedroom.retries === 1, g.bedroom.retries);
check('and reaches the bedroom', await g.mode() === 'bedroom');
check('the page the suite holds is the new one', await page.evaluate(() => Game.mode) === 'bedroom');
await g.scenario('winnmark_seth_house');
check('a scenario runs on it', await g.spin(60) === 'scenario');
// v1.137: the healthy boot gets the real 75 s watchdog. Under 10 s it failed once in a full run (v1.134): NEW GAME took
// over 10 s on a loaded runner, so the check timed a slow boot, not a stall.
const t1 = Date.now();
const g2 = await boot();
await g2.bedroom();
const secs2 = (Date.now() - t1) / 1000;
console.log(`   healthy boot to the bedroom in ${secs2.toFixed(1)} s, restarts ${g2.bedroom.retries}`);
// A real stall (2–4% of boots under load, v1.123) restarts after the full 75 s; that is the harness doing its job, so
// the check is that the watchdog never fires early on a boot that is only slow.
check('a healthy boot never restarts early', g2.bedroom.retries === 0 || secs2 >= 75, { retries: g2.bedroom.retries, secs: +secs2.toFixed(1) });
await g2.close();
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
