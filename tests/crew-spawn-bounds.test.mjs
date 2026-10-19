// v1.276 (CI red on PR #95): with the crew's four and five allies, the fourth stepped out 3.4 m from you at the start,
// and where you start by a wall that put him outside the field: in the grocery store's team matches Alex started past
// the front wall and ran round the lot all match, firing at nobody, while their kids pressed against the walls toward
// him (Marcus "wedged" 4 s in the stockroom). Checked: in every team match on the ladder, with all five in the crew,
// every kid starts inside the field; and in the store's Price Check Alex gets in and fires.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const ALL = ['eric', 'sean', 'nick', 'alex', 'diego'];
const ids = await page.evaluate(() => Object.keys(SCENARIOS).filter(crewTeamMatch).sort((a, b) => crewLadderPos(a) - crewLadderPos(b)));
const out = [];
for (const id of ids) {
  await page.evaluate(all => { Game.persist.crew = all.slice(); Game.persist.completed = {}; crewBench.clear(); }, ALL);
  await g.scenario(id);
  out.push(await page.evaluate(id => {
    const B = Game.scenario.bounds, inside = p => !B || (p.x > B.minX && p.x < B.maxX && p.z > B.minZ && p.z < B.maxZ);
    const kids = Game.scenario.enemies;
    return { id, kids: kids.length, allies: kids.filter(e => e.team === 'player').length,
      out: kids.filter(e => !inside(e.pos)).map(e => [e.character?.name, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1)]) };
  }, id));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(30);
}
const bad = out.filter(r => r.out.length);
console.log('   allies with all five:', JSON.stringify(Object.fromEntries(out.map(r => [r.id, r.allies]))));
check(`${ids.length} team matches entered with all five in the crew`, ids.length === 31 && out.every(r => r.kids > 0), ids.length);
check('every kid starts inside the field in every one', bad.length === 0, bad);

// the store: Alex, the crew's fourth, starts inside and plays (he fired 0 shots in 60 s in every run before)
await page.evaluate(() => { Game.persist.crew = crewFirstTime('store_price_check_3v3'); Game.persist.completed = {}; crewBench.clear(); });
await g.scenario('store_price_check_3v3');
const alex = await page.evaluate(() => {
  const B = Game.scenario.bounds, a = Game.scenario.enemies.find(e => e.character?.name === 'Alex');
  if (!a) return null;
  Game.player.maxHits = 999;
  let fired = 0, outside = 0; const sp = spawnEnemyBB; spawnEnemyBB = (e, t) => { if (e === a) fired++; return sp(e, t); };
  try {
    for (let f = 0; f < 60 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      if (a.pos.x < B.minX || a.pos.x > B.maxX || a.pos.z < B.minZ || a.pos.z > B.maxZ) outside++;
    }
  } finally { spawnEnemyBB = sp; }
  return { fired, outside, at: [+a.pos.x.toFixed(1), +a.pos.z.toFixed(1)], state: a.state };
});
console.log('   Alex in Price Check, 60 s:', JSON.stringify(alex));
check('Price Check: Alex is on our side, never outside the store, and fires', alex && alex.outside === 0 && alex.fired > 0, alex);
check('no page errors', g.errs.length === 0, g.errs);
