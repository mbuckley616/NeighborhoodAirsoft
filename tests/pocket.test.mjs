// Found in play (builder, v1.112): an advancing kid can be pinned in a pocket. Night Prowl's Seth stood 8.8 s between
// a parked sedan and a post (CI failed on it at 4117ad3). With a wall ahead and both sides blocked, the committed
// sidestep turned round at each side wall, or slid along it and back, and he shuttled for good. v1.121: no 0.5 m of
// progress in 2.5 s while wall-following (or two blocked turn-rounds) backs him out until a sidestep clears the pocket.
// A U of 6 m walls (3 m wide, 2.7 m deep, open at the back) round an advancing kid, the target 15 m ahead past its
// closed end; head-on and flanking either side. Then a control in the open: no back-off when nothing is in the way.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_seth_house');
const run = (flank, pocket) => page.evaluate(([flank, pocket]) => {
  const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
  const P = Game.player.pos, k = Game.scenario.enemies[0], cx = 0, cz = 10;
  const box = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ, h: 6, baseY: scenarioGroundY(minX, minZ) - 1 });
  Game.player.obstacles = pocket ? [box(cx - 1.5, cx + 1.5, cz - 1.2, cz - 1.0), box(cx - 1.5, cx - 1.3, cz - 1.2, cz + 1.5), box(cx + 1.3, cx + 1.5, cz - 1.2, cz + 1.5)] : [];
  if (Game.scenario.cover) Game.scenario.cover = [];
  k.pos.x = cx; k.pos.z = cz; k.state = 'advancing'; k.flankSide = flank;
  for (const key of Object.keys(k)) if (/^_adv/.test(key)) delete k[key];
  let escapedAt = null, backFrames = 0, advFrames = 0;
  for (let f = 1; f <= 20 * 60 && Game.mode === 'scenario'; f++) {
    P.x = cx; P.z = cz - 15; Game.player.health = 99;
    stepGame(1 / 60);
    if (k.state === 'advancing') advFrames++;
    if (k._advBackT > 0) backFrames++;
    if (escapedAt == null && k.pos.z < cz - 1.6) escapedAt = +(f / 60).toFixed(2);
  }
  applyBBHit = orig;
  return { flank, escapedAt, backFrames, advFrames, end: [+k.pos.x.toFixed(2), +k.pos.z.toFixed(2)], state: k.state };
}, [flank, pocket]);
for (const flank of [0, 1, -1]) {
  const r = await run(flank, true);
  console.log('  pocket, flank', flank, JSON.stringify(r));
  check(`flank ${flank}: the kid gets out of the pocket and past its wall within 12 s`, r.escapedAt != null && r.escapedAt < 12, r);
}
const c = await run(0, false);
console.log('  open ground', JSON.stringify(c));
check('open ground: he walks straight in, no back-off', c.escapedAt != null && c.escapedAt < 1 && c.backFrames === 0, c);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
