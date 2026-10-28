// v1.276 (CI red on PR #95): with the crew's four and five allies, the fourth stepped out 3.4 m from you at the start,
// and where you start by a wall that put him outside the field: in the grocery store's team matches Alex started past
// the front wall and ran round the lot all match, firing at nobody, while their kids pressed against the walls toward
// him (Marcus "wedged" 4 s in the stockroom). Checked: in every team match on the ladder, with all five in the crew,
// every kid starts inside the field; and in the store's Price Check Alex gets in and fires.
// v1.277 (STUCK #101): the clamp put two allies on one spot where you start by an edge (Sean and Alex at the club's
// 3v3, 0.00 m apart; one walked 0 m all match) and extra kids at one anchor stacked there. Checked now as well: in every
// team match, with all five and with the first-time crew, no two kids (you among them) start under 1.4 m apart, the
// attack huddle's ring aside (1.0 m beside it); and the club's 3v3 with all five has every kid on our side moving or firing.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const ALL = ['eric', 'sean', 'nick', 'alex', 'diego'];
const ids = await page.evaluate(() => Object.keys(SCENARIOS).filter(crewTeamMatch).sort((a, b) => crewLadderPos(a) - crewLadderPos(b)));
const out = [], near = [];
for (const crew of ['all', 'first']) for (const id of ids) {
  await page.evaluate(([all, crew, id]) => { Game.persist.crew = crew === 'all' ? all.slice() : crewFirstTime(id); Game.persist.completed = {}; crewBench.clear(); }, [ALL, crew, id]);
  await g.scenario(id);
  near.push(...await page.evaluate(([id, crew]) => {
    const pts = Game.scenario.enemies.map(e => ({ n: e.character?.name, x: e.startAt.x, z: e.startAt.z, h: e.startAt.huddle }));
    const P = Game.player.pos; pts.push({ n: 'you', x: P.x, z: P.z, h: false });
    const bad = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.z - b.z);
      // the huddle's ring is its own (v1.14); a kid beside one only has to be off his spot
      // v1.315 (critic, 22 Oct): but no two of its kids on one spot (the Last Saturday's four within 0.42 m)
      if (a.h && b.h) { if (d < 0.74) bad.push(`${crew} ${id}: huddle ${a.n}-${b.n} ${d.toFixed(2)} m`); continue; }
      if (d < (a.h || b.h ? 1.0 : 1.39)) bad.push(`${crew} ${id}: ${a.n}${a.h ? '(h)' : ''}-${b.n}${b.h ? '(h)' : ''} ${d.toFixed(2)} m`);
    }
    // v1.369 (Found in play, v1.282): and no two kids of one side hold one post (Friday Night Lights' Nathan and Malik
    // walked to one point and stood in each other for 6-8 s)
    const ks = Game.scenario.enemies.filter(e => !e.perch);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      if (a.team !== b.team) continue;
      const d = Math.hypot(a.anchorPos.x - b.anchorPos.x, a.anchorPos.z - b.anchorPos.z);
      if (d < 0.5) bad.push(`${crew} ${id}: post ${a.character?.name}-${b.character?.name} ${d.toFixed(2)} m`);
    }
    return bad;
  }, [id, crew]));
  if (crew === 'first') { await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30); continue; }
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
check(`${ids.length} team matches entered with all five in the crew`, ids.length === 32 && /* v1.318: + Night Swim */ out.every(r => r.kids > 0), ids.length);
check('every kid starts inside the field in every one', bad.length === 0, bad);
check('no two kids start under 1.4 m apart (all five, and the first-time crew; 1.0 m beside the huddle, 0.75 m inside it), nor two of one side hold one post', near.length === 0, near);

// the club's 3v3 with all five: every kid on our side moves or fires in 40 s (Devon walked 0 m on CI, e6f626b)
await page.evaluate(all => { Game.persist.crew = all.slice(); Game.persist.completed = {}; crewBench.clear(); }, ALL);
await g.scenario('club_eighteenth_3v3');
const club = await page.evaluate(() => {
  Game.player.maxHits = 999;
  const ours = Game.scenario.enemies.filter(e => e.team === 'player');
  const st = new Map(ours.map(e => [e, { n: e.character?.name, x: e.pos.x, z: e.pos.z, walked: 0, fired: 0 }]));
  const sp = spawnEnemyBB; spawnEnemyBB = (e, t) => { if (st.has(e)) st.get(e).fired++; return sp(e, t); };
  try {
    for (let f = 0; f < 40 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      for (const e of ours) { const s = st.get(e); s.walked += Math.hypot(e.pos.x - s.x, e.pos.z - s.z); s.x = e.pos.x; s.z = e.pos.z; }
    }
  } finally { spawnEnemyBB = sp; }
  return [...st.values()].map(s => ({ n: s.n, walked: +s.walked.toFixed(1), fired: s.fired }));
});
console.log('   club 3v3, our side, 40 s:', JSON.stringify(club));
check('club 3v3 with all five: every kid on our side moves or fires', club.length >= 5 && club.every(s => s.walked > 1 || s.fired > 0), club);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.spin(30);

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
