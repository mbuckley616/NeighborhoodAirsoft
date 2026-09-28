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
await g.close();
