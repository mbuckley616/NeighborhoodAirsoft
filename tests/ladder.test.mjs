// v1.402 (D.57 step 4, Michael: all of docs/crew_ladder.md, 22 Oct): the crew-first ladder's order. Walked from a new
// save, each zone's main line opens one match at a time and ends in its captain's finale; a zone's side matches open
// with the main match before them and never gate the next one; and a save from before the reorder loads with every
// match it had won still won and every match it had open still open.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const walk = await page.evaluate(() => {
  Game.persist.completed = {}; Game.persist.ladderKept = {}; Game.persist.crew = [];
  const out = { zones: [], bad: [] };
  for (const z of ZONE_LADDER) {
    const ids = PIN_SCENARIO_GROUPS[z.key], main = ids.filter(id => !isSideMatch(id)), side = ids.filter(isSideMatch);
    if (!isZoneUnlocked(z.key)) out.bad.push(`${z.key} locked on arrival`);
    for (const [i, id] of main.entries()) {
      const open = main.filter(m => isScenarioUnlocked(m) && !Game.persist.completed[m]);
      if (open.length !== 1 || open[0] !== id) out.bad.push(`${z.key} #${i + 1}: open ${open.join(',')}, wanted ${id}`);
      // the side matches right after this main match are open now, and none further on
      const at = ids.indexOf(id), next = ids.indexOf(main[i + 1] ?? '__');
      for (const s of side) {
        const si = ids.indexOf(s), should = si < at;
        if (isScenarioUnlocked(s) !== should && !Game.persist.completed[s]) out.bad.push(`${s} ${should ? 'shut' : 'open'} before ${id}`);
      }
      Game.persist.completed[id] = true;
      for (const s of side) { const si = ids.indexOf(s); if (si > at && (next < 0 || si < next) && !isScenarioUnlocked(s)) out.bad.push(`${s} shut after ${id}`); }
    }
    const fin = zoneCapstoneId(z.key);
    Game.persist.crew = crewFirstTime(fin);
    const foes = (crewSetup(fin) || []).filter(es => es.team !== 'player').map(es => es.charId);
    out.zones.push({ zone: z.key, main: main.length, side: side.length, finale: SCENARIOS[fin].scenarioName, last: ids[ids.length - 1] === fin,
      captain: ZONE_CAPTAIN_KID[z.key], captainIn: foes.includes(ZONE_CAPTAIN_KID[z.key]) || z.key === 'grocery_store' && foes.includes('seth') });
    Game.persist.crew = [];
    if (side.some(s => Game.persist.completed[s])) out.bad.push(`${z.key}: a side match counted won`);
  }
  out.allMainDone = ZONE_LADDER.every(z => PIN_SCENARIO_GROUPS[z.key].filter(id => !isSideMatch(id)).every(id => Game.persist.completed[id]));
  out.sides = [...SIDE_MATCHES];
  return out;
});
check('walked from a new save, each zone opens its main matches one at a time, its side matches with the main match before them, and is cleared with no side match won',
  walk.bad.length === 0 && walk.allMainDone, walk.bad.slice(0, 12));
const z = k => walk.zones.find(r => r.zone === k);
check('the side matches: Winnmark 4, Bunratty 1, the Hollow 3, Northcliff 1; the main lines Winnmark 13, Bunratty 15, the Hollow 9',
  z('winnmark_court').side === 4 && z('bunratty_court').side === 1 && z('hollow').side === 3 && z('northcliff').side === 1 && walk.sides.length === 9 &&
  z('winnmark_court').main === 13 && z('bunratty_court').main === 15 && z('hollow').main === 9, walk.zones.map(r => `${r.zone} ${r.main}+${r.side}`));
check("every zone ends in its finale with its captain on the other side (the Hollow's is the Big Game, last now)",
  walk.zones.every(r => r.last && r.captainIn) && z('hollow').finale === 'The Big Game', walk.zones.map(r => `${r.zone}: ${r.finale} (${r.captain}${r.captainIn ? '' : ' MISSING'})`));

// The map card of a side match says so, and a locked main match names the main match that opens it
const cards = await page.evaluate(() => {
  Game.persist.completed = {}; for (const id of ['winnmark_tutorial', 'winnmark_seth_house', 'winnmark_squad_basics', 'winnmark_seth_shotgun_duel']) Game.persist.completed[id] = true;
  const html = PIN_SCENARIO_GROUPS.winnmark_court.map((id, i) => renderScenarioCard(id, i + 1, false)).join('');
  const d = document.createElement('div'); d.innerHTML = html;
  const card = id => d.querySelector(`.sc-card[data-id="${id}"]`);
  const r = { ffaSide: /SIDE/.test(card('winnmark_ffa').textContent), ffaOpen: !card('winnmark_ffa').classList.contains('locked'),
    sniperOpen: !card('winnmark_sniper_overwatch').classList.contains('locked'), culLock: card('winnmark_cul_de_sac').querySelector('.sc-card-lock')?.textContent,
    mainSide: /SIDE/.test(card('winnmark_sniper_overwatch').textContent), next: nextLadderMatchId() };
  Game.persist.completed = {};
  return r;
});
check("Winnmark after the shotgun duel: the free-for-all is open and marked SIDE, Trey on Overwatch is open and NEXT, the cul-de-sac reads 'Win #6 to unlock'",
  cards.ffaSide && cards.ffaOpen && cards.sniperOpen && !cards.mainSide && cards.culLock === 'Win #6 to unlock' && cards.next === 'winnmark_sniper_overwatch', cards);

// A save from before the reorder: the Hollow cleared to its night hold (old #5, so the Big Game, old #6, was open), and
// Winnmark through its free-for-all (old #5, so the cul-de-sac, old #6, was open) in a second save
const old = await page.evaluate(() => {
  const res = {};
  const W = ['winnmark_tutorial', 'winnmark_seth_house', 'winnmark_squad_basics', 'winnmark_seth_shotgun_duel', 'winnmark_ffa', 'winnmark_cul_de_sac',
    'winnmark_sniper_overwatch', 'winnmark_team_2v2', 'winnmark_defend_treehouse', 'winnmark_defend_culdesac', 'winnmark_two_in_the_yards',
    'winnmark_team_2v3', 'winnmark_whole_block', 'winnmark_team_3v3', 'winnmark_last_stand', 'winnmark_night_prowl', 'winnmark_night_team_2v2'];
  const B = PIN_SCENARIO_GROUPS.bunratty_court;
  const H = ['hollow_skirmish_3v3', 'hollow_attack_north_fort', 'hollow_defend_south_fort', 'hollow_attack_north_fort_night', 'hollow_defend_south_fort_night'];
  const load = (done, extra, fromBefore = true) => {
    const persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST));
    if (fromBefore) { delete persist.ladderV; delete persist.ladderKept; }   // as a save from before v1.402 has them
    persist.completed = Object.fromEntries(done.map(id => [id, true])); Object.assign(persist, extra || {});
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), accSeq: 1, persist }));
    const r = loadGame();
    return { ok: r.ok, won: done.every(id => Game.persist.completed[id]), v: Game.persist.ladderV };
  };
  let r = load(W.concat(B).concat(H), { crew: ['eric', 'sean', 'nick'] });
  Object.assign(res, { a: r, bigGame: isScenarioUnlocked('hollow_big_battle'), jugg: isScenarioUnlocked('hollow_juggernaut'),
    twoVfour: isScenarioUnlocked('hollow_2v4_night'), lot: isZoneUnlocked('market_lot') });
  Game.persist.completed.hollow_big_battle = true;   // winning the kept finale clears the zone
  res.lotAfter = isZoneUnlocked('market_lot');
  r = load(W.slice(0, 5));
  Object.assign(res, { b: r, cul: isScenarioUnlocked('winnmark_cul_de_sac'), sniper: isScenarioUnlocked('winnmark_sniper_overwatch'),
    team: isScenarioUnlocked('winnmark_team_2v2') });
  // a new game saved and loaded again is on the new order and keeps nothing extra
  r = load(['winnmark_tutorial'], null, false); res.fresh = { v: Game.persist.ladderV, kept: Object.keys(Game.persist.ladderKept).length };
  localStorage.removeItem(SAVE_KEY);
  return res;
});
check('an old save cleared to the Hollow\'s night hold loads with every win kept, the Big Game still open (and the new next match, Juggernauts), 2 v 4 still shut',
  old.a.ok && old.a.won && old.a.v === 1402 && old.bigGame && old.jugg && !old.twoVfour && !old.lot && old.lotAfter, old);
check('an old save through Winnmark\'s free-for-all keeps the cul-de-sac open and opens Trey on Overwatch; Two on Two stays shut',
  old.b.ok && old.b.won && old.cul && old.sniper && !old.team, old);
check('a save made on the new order keeps nothing extra on load', old.fresh.v === 1402 && old.fresh.kept === 0, old.fresh);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
