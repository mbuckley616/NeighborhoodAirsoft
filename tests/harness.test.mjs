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
const g2 = await boot({ bedroomTimeout: 10000 });
await g2.bedroom();
check('a healthy boot never restarts', g2.bedroom.retries === 0, g2.bedroom.retries);
await g2.close();
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
