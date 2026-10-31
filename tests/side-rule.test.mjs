// v1.397 (D.57 step 2, docs/crew_ladder.md's side consistency; Michael: B on "Who is in Marcus's crew", 31 Oct): a kid
// in your crew is never against you outside a free-for-all or a callout, Rebecca never is, nobody in a captain's crew
// stands with you after Winnmark, and a captain's crew plays only for its own captain (Seth's and Marcus's, the
// cousins', together; Seth's crew is the rival's and turns up anywhere). A kid on the wrong side is swapped at his spot,
// so every count stays the same.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const rows = await page.evaluate(() => {
  const out = [];
  const ids = ZONE_LADDER.flatMap(z => PIN_SCENARIO_GROUPS[z.key]).filter(id => !SCENARIOS[id].tutorial);
  for (const id of ids) for (const crew of [crewFirstTime(id), CREW_ROSTER.slice(), CREW_ROSTER.slice(0, 2), []]) {
    Game.persist.crew = crew;
    const ctx = findScenarioListContext(id), type = matchType(id), zoneCap = ZONE_CAPTAINS[ctx.group];
    const raw = crewSetupSides(id) || [], s = crewSetup(id) || [];
    const exempt = type === 'ffa' || type === 'callout' || ctx.group === 'winnmark_court';
    const wrong = exempt ? [] : s.filter(es => !es.vip && (es.team === 'player' ? !sideAllyOk(es.charId, zoneCap) : !sideFoeOk(es.charId, zoneCap, crew)))
      .map(es => `${es.charId}${es.team === 'player' ? ' with you' : ' against'}`);
    const theirs = a => a.filter(es => es.team !== 'player').length;
    const names = s.map(es => es.charId);
    out.push({ id, crew: crew.length, wrong, swaps: s.filter(es => es.sideSwap).map(es => `${es.sideSwap}->${es.charId}`),
      same: theirs(raw) === theirs(s) && raw.length === s.length, dup: names.length !== new Set(names).size, seth: names.filter(n => n === 'seth').length === raw.filter(es => es.charId === 'seth').length });
  }
  Game.persist.crew = [];
  return out;
});
const wrong = rows.filter(r => r.wrong.length);
check(`no kid on the wrong side in any of the ${rows.length / 4} ladder matches, with the first-time crew, all five, two or none`, wrong.length === 0, wrong);
const counts = rows.filter(r => !r.same || r.dup || !r.seth);
check('a swap keeps both sides\' counts, puts no kid in twice and never adds Seth', counts.length === 0, counts);
const sw = id => (rows.find(r => r.id === id && r.crew === 3) || rows.find(r => r.id === id)).swaps.join(' ');
const want = {
  hollow_attack_north_fort: 'mitchell->trey ryan->tyler mason->marcus',   // the plan: Mitchell and Mason off Seth's side
  lot_team_3v3: 'owen->devon',                                             // Owen is Mitchell's (B); Devon is Marcus's
  club_defend_gazebo: 'ryan->tyler',
  store_price_check_3v3: 'rebecca->trey',                                  // Rebecca off their side
};
const got = Object.fromEntries(Object.keys(want).map(id => [id, sw(id)]));
check("the plan's cases: the Hollow's Mitchell and Mason, Owen at the lot, Ryan at the club, Rebecca in the store",
  Object.keys(want).every(id => got[id] === want[id]), got);
const kept = rows.filter(r => /^bunratty_|^northcliff_|^bellfield_|^school_/.test(r.id) && r.crew === 3 && r.swaps.length);
check("Bunratty, Northcliff and Hollins Ridge keep their sides (their crews at home, Seth's with Seth)", kept.length === 0, kept);

// In play: a swapped match builds and runs with the swapped kids on the field
for (const id of ['hollow_attack_north_fort', 'store_price_check_3v3']) {
  await page.evaluate(() => { Game.persist.crew = ['eric', 'sean', 'nick']; });
  await g.scenario(id);
  await g.spin(240);
  const r = await page.evaluate(() => ({ foes: Game.scenario.enemies.filter(e => e.team !== 'player').map(e => e.charId), mode: Game.mode }));
  check(`${id} plays with the swapped kids`, r.mode === 'scenario' && !r.foes.some(k => ['mitchell', 'mason', 'ryan', 'rebecca'].includes(k)), r);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
