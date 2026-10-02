// v1.124 (Found in play, critic v1.123): Storm the North Fort and Night Assault spawned the player at (2, 28), in the
// south fort's front doorway (port x 0.6–3.4 in the wall at z 27), in Devon's and Mitchell's line from the north fort;
// a player standing still was tagged inside 18 s in 18 of 20 rounds (night: 10 of 10, median 6 s). The team_b spawn
// is now at the back of the fort, under the roof. For each attack: the spawn is inside the fort's walls, and a player
// who stands still for 18 s is rarely tagged.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const R = 4, rows = {};
for (const id of ['hollow_attack_north_fort', 'hollow_attack_north_fort_night']) {
  rows[id] = [];
  for (let r = 0; r < R; r++) {
    await g.scenario(id);
    const res = await page.evaluate(() => {
      const p = Game.player, start = { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) };
      let f = 0;
      for (; f < 18 * 60 && Game.mode === 'scenario' && !p.hitsTaken; f++) stepGame(1 / 60);
      return { start, tag: p.hitsTaken ? +(f / 60).toFixed(1) : null };
    });
    rows[id].push(res);
    await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); enterBedroom(); });
    await g.spin(3);
  }
  console.log(`  ${id}: tagged at ${JSON.stringify(rows[id].map(r => r.tag))}`);
}
const all = Object.values(rows).flat();
const s = all[0].start;
// south fort: centre (2, 30), 7 m wide, front wall at z 27 (the port), back wall at z 33
check('the team_b spawn is inside the south fort, behind its front wall', s.x > -1.2 && s.x < 5.2 && s.z > 28.5 && s.z < 32.8, s);
const tags = all.filter(r => r.tag != null);
check(`standing still at spawn, at most 3 of ${all.length} rounds are tagged inside 18 s (was 18 of 20)`, tags.length <= 3, tags.map(r => r.tag));
check('no tag before 6 s (the doorway gave 3.3 s, the sniper\'s first shot after the hold)', tags.every(r => r.tag >= 6), tags.map(r => r.tag));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
