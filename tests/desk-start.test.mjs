// v1.161 (Found in play, critic v1.160): Customer Service started the player at (24, 13.5), in the 3.3 m gap between the
// service desk's arm and the east wall, open to the whole east aisle; a standing player was tagged in 17 of 17 rounds at
// 7.6–14.3 s, mostly by Marcus from 13 m. The start is now inside the counter's L. Checks the start is behind the desk
// (the front covers it from the north, the arm from the east) and that a player who stands there is rarely tagged early.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
// v1.385 (B.20) fix-up: kids now see a head over cover, and the counter is chest high, so a player standing at the start
// is shot over it by Marcus from about 14 m at 14.4-14.9 s (was 19.3-23.7 s, when only the chest counted). Crouched behind
// the desk you are hidden as before, and they must come round it (19.5-24.5 s, 4 rounds). So the desk is checked crouched,
// and standing only has to beat the old open start (7.6-14.3 s).
const R = 6, rows = [], standRows = [];
for (const crouch of [true, false]) for (let r = 0; r < (crouch ? R : 3); r++) {
  await g.scenario('store_defend_desk');
  (crouch ? rows : standRows).push(await page.evaluate((crouch) => {
    const p = Game.player, start = { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) };
    let f = 0;
    for (; f < 20 * 60 && Game.mode === 'scenario' && !p.hitsTaken; f++) { p.crouching = crouch; stepGame(1 / 60); }
    return { start, tag: p.hitsTaken ? +(f / 60).toFixed(1) : null };
  }, crouch));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); enterBedroom(); });
  await g.spin(3);
}
console.log(`  crouched, tagged at ${JSON.stringify(rows.map(r => r.tag))}; standing, at ${JSON.stringify(standRows.map(r => r.tag))}`);
const s = rows[0].start;
check('the start is inside the desk\'s L (x 16.5–21.5, z 12–15.5)', s.x > 16.5 && s.x < 21.5 && s.z > 12 && s.z < 15.5, s);
const tags = rows.filter(r => r.tag != null);
// v1.161 fix-up: a standing player is tagged in every round at 19.3-23.7 s (40 rounds), 14 of them just under 20 s,
// so "at most 2 of 6 inside 20 s" failed about a third of the time (CI: 19.3, 19.4, 19.5). The line now sits under
// that spread, well above the old 7.6-14.3 s.
check(`crouched at the start, no round is tagged inside 18 s (standing was 17 of 17 by 14.3 s before v1.161)`, tags.every(r => r.tag >= 18), tags.map(r => r.tag));
check('no tag before 10 s, crouched or standing', tags.concat(standRows.filter(r => r.tag != null)).every(r => r.tag >= 10), standRows.map(r => r.tag));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
