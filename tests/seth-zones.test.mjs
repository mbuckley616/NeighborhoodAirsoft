// v1.356 (D.28 step 5, Michael: C on "Seth in every zone", 27 Oct): Seth turns up once in each zone as the rival, on a
// better gun with better aim each time, at his best in the Last Saturday; his crew is with him, every count stays as it
// was, the Pickup Game and his other matches play as before. Booted into each match to read the kid the game built.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const WANT = {
  bunratty_night_team_2v2: ['ar', 0.60], hollow_big_battle: ['ump', 0.63], lot_night_4v4: ['mp5', 0.66],
  northcliff_night_4v4: ['burst', 0.69], school_night_4v4: ['p90', 0.72], club_night_4v4: ['ak47', 0.75], last_saturday: ['m249', 0.80],
};
const SETH_CREW = ['seth', 'trey', 'brooke', 'tyler', 'evan', 'andrew', 'garrett', 'colin'];
// The sides on paper, with nobody, the first-time crew and all five
const paper = await page.evaluate((ids) => {
  const out = {};
  for (const id of ids) {
    out[id] = {};
    for (const [k, crew] of [['none', []], ['first', crewFirstTime(id)], ['all', CREW_ROSTER.slice()]]) {
      Game.persist.crew = crew; Game.persist.completed = {}; crewBench.clear();
      const s = crewSetup(id), seth = s.filter(e => e.charId === 'seth');
      out[id][k] = { seth: seth.map(e => ({ team: e.team || 'enemy', weapon: e.weapon, aim: (e.statsOverride || {}).accuracy })),
        ours: s.filter(e => e.team === 'player').map(e => e.charId), theirs: s.filter(e => e.team !== 'player').map(e => e.charId) };
    }
    out[id].rival = isRivalMatch(id);
  }
  Game.persist.crew = [];
  return out;
}, Object.keys(WANT));
for (const [id, [gun, aim]] of Object.entries(WANT)) {
  const bad = ['none', 'first', 'all'].filter(k => {
    const p = paper[id][k];
    return p.seth.length !== 1 || p.seth[0].team !== 'enemy' || p.seth[0].weapon !== gun || Math.abs(p.seth[0].aim - aim) > 1e-9;
  });
  check(`${id}: Seth once, on the other side, ${gun} at ${aim}, with any crew`, bad.length === 0, JSON.stringify(paper[id]));
  const crossed = paper[id].all.ours.filter(k => SETH_CREW.includes(k));
  check(`${id}: none of Seth's crew on your side, and the match counts as a rival match`, crossed.length === 0 && paper[id].rival, crossed);
}
check('Bunratty: Seth in Mitchell\'s place; Northcliff: in Fernando\'s; the school: in Nathan\'s (nobody in your crew)',
  !paper.bunratty_night_team_2v2.none.theirs.includes('mitchell') && !paper.northcliff_night_4v4.none.theirs.includes('fernando') &&
  !paper.school_night_4v4.none.theirs.includes('nathan'),
  [paper.bunratty_night_team_2v2.none.theirs, paper.northcliff_night_4v4.none.theirs, paper.school_night_4v4.none.theirs]);

// In the match itself: the kid built carries the gun and the aim
for (const id of ['bunratty_night_team_2v2', 'northcliff_night_4v4', 'last_saturday']) {
  await page.evaluate(() => { Game.persist.crew = []; Game.persist.completed = {}; });
  await g.scenario(id);
  const seth = await page.evaluate(() => (Game.scenario.enemies || []).filter(e => e.charId === 'seth')
    .map(e => ({ team: e.team, weapon: e.weapon, aim: e.character && e.character.accuracy })));
  check(`${id} as played: Seth on their side with the ${WANT[id][0]}, aim ${WANT[id][1]}`,
    seth.length === 1 && seth[0].team !== 'player' && seth[0].weapon === WANT[id][0] && Math.abs(seth[0].aim - WANT[id][1]) < 1e-9, seth);
  const mode = await g.spin(120);
  check(`${id}: two seconds in, still playing`, mode === 'scenario', mode);
}

// Matches without him play as before: the scenario's own sides, Seth's own aim; the Pickup Game is untouched
const other = await page.evaluate(() => {
  Game.persist.crew = []; Game.persist.completed = {};
  const same = ['winnmark_seth_shotgun_duel', 'hollow_night_battle', 'lot_team_3v3', 'bellfield_night_4v4', 'store_night_4v4']
    .filter(id => sethSetup(id) !== SCENARIOS[id].enemySetup);
  const duel = crewSetup('winnmark_seth_shotgun_duel').find(e => e.charId === 'seth');
  const pk = buildPickupScenario({ map: 'northcliff', mode: 'teams', size: 4, tod: 'night', lives: 3 });
  return { same, duel: { weapon: duel.weapon, aim: (duel.statsOverride || {}).accuracy, base: CHARACTERS.seth.accuracy },
    pickup: pk.enemySetup.filter(e => !e.team).map(e => e.charId + ':' + e.weapon) };
});
check('the duel is as it was: Seth on the Spring Shotgun at his own 0.55', other.duel.weapon === 'shotgun' && other.duel.aim == null && other.duel.base === 0.55, other.duel);
check('a Northcliff pickup game keeps Fernando and his rifle, no Seth', other.pickup.includes('fernando:sniper') && !other.pickup.some(s => s.startsWith('seth')), other.pickup);
check('his other matches keep the scenario\'s own sides (the duel, the Hollow at night, the lot\'s 3v3, Lamplight, the store)', other.same.length === 0, other.same);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
