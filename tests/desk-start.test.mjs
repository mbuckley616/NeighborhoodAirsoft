// v1.161 (Found in play, critic v1.160): Customer Service started the player at (24, 13.5), in the 3.3 m gap between the
// service desk's arm and the east wall, open to the whole east aisle; a standing player was tagged in 17 of 17 rounds at
// 7.6–14.3 s, mostly by Marcus from 13 m. The start is now inside the counter's L. Checks the start is behind the desk
// (the front covers it from the north, the arm from the east) and that a player who stands there is rarely tagged early.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
const R = 6, rows = [];
for (let r = 0; r < R; r++) {
  await g.scenario('store_defend_desk');
  rows.push(await page.evaluate(() => {
    const p = Game.player, start = { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) };
    let f = 0;
    for (; f < 20 * 60 && Game.mode === 'scenario' && !p.hitsTaken; f++) stepGame(1 / 60);
    return { start, tag: p.hitsTaken ? +(f / 60).toFixed(1) : null };
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); enterBedroom(); });
  await g.spin(3);
}
console.log(`  tagged at ${JSON.stringify(rows.map(r => r.tag))}`);
const s = rows[0].start;
check('the start is inside the desk\'s L (x 16.5–21.5, z 12–15.5)', s.x > 16.5 && s.x < 21.5 && s.z > 12 && s.z < 15.5, s);
const tags = rows.filter(r => r.tag != null);
check(`standing at the start, at most 2 of ${R} rounds are tagged inside 20 s (was 17 of 17 by 14.3 s)`, tags.length <= 2, tags.map(r => r.tag));
check('no tag before 10 s', tags.every(r => r.tag >= 10), tags.map(r => r.tag));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
