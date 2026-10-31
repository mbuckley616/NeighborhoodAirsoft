// v1.274 (D.28 step 2, Michael's design; C on "which two-against-more matches stay": none): your crew takes the field.
// Every team match takes your whole crew on their own guns, plus a VIP, Seth while he is yours, and a match's named kid
// until he is in the crew; places left go to the match's own allies, then to kids from the street; a benched kid's
// place stays empty. A crew kid on the other side is swapped for a street kid; with Seth there, his crew crosses to him.
// Solo matches never change, and with nobody in the crew no match changes at all.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

// Nobody in the crew: every match is exactly its own; solo matches never change, even with all five in
const same = await page.evaluate(() => {
  const ids = Object.keys(SCENARIOS);
  // v1.275 (D.28 step 3): a match is tuned for the crew you'd have when you first reach it, so only matches before
  // Eric's ask (Winnmark's) and the solo ones keep their own sides on a new game
  const empty = ids.filter(id => crewSetup(id) !== SCENARIOS[id].enemySetup && !crewFirstTime(id).length);
  Game.persist.crew = CREW_ROSTER.slice();
  const solo = ids.filter(id => !crewTeamMatch(id));
  const soloChanged = solo.filter(id => crewSetup(id) !== SCENARIOS[id].enemySetup);
  const team = ids.filter(crewTeamMatch);
  Game.persist.crew = [];
  return { empty, n: ids.length, solo: solo.length, soloChanged, team: team.length,
    tut: crewTeamMatch('winnmark_tutorial'), jugg: crewTeamMatch('hollow_juggernaut'), out: crewTeamMatch('bunratty_team_2v4') };
});
check(`a new game: every match tuned for nobody in your crew (of ${same.n}) plays its own sides`, same.empty.length === 0, same.empty);
check(`with all five in, the ${same.solo} solo matches (the tutorial among them) still play alone`, same.soloChanged.length === 0 && !same.tut, same.soloChanged);
// 32 since v1.318's Night Swim (the twins on your side at the pool); 46 since v1.393 (D.57 step 1): + the 12 solo matches
// your crew now plays and the 2 CLUTCH ones (`crewPosts`), so 32 solo matches are left, none changed by the crew
check(`${same.team} team matches take the crew, Juggernauts and Two Against the World among them`, same.team === 46 && same.solo === 32 && same.jugg && same.out, same);

const sides = (id, crew, bench) => page.evaluate(([id, crew, bench]) => {
  Game.persist.crew = crew; crewBench.clear(); (bench || []).forEach(k => crewBench.add(k));
  const s = crewSetup(id), b = getScenarioBriefing(id);
  return { ours: s.filter(e => e.team === 'player').map(e => e.charId), theirs: s.filter(e => e.team !== 'player').map(e => e.charId),
    guns: Object.fromEntries(s.filter(e => e.team === 'player').map(e => [e.charId, e.weapon])),
    match: scenarioMatchup(crewScenario(id)), benched: b.benched, own: scenarioMatchup(SCENARIOS[id]) };
}, [id, crew, bench]);

// Two Against the World with Eric: you and Eric v 4 (Sean was its one friend); with all five, 6 v 4
let s = await sides('bunratty_team_2v4', ['eric']);
check('Two Against the World, Eric in: you and Eric v Ryan, Mitchell, Nick, Joe', s.ours.join() === 'eric' && s.theirs.join() === 'ryan,mitchell,nick,joe' && s.match === '2V4', s);
s = await sides('bunratty_team_2v4', ['eric', 'sean', 'nick', 'alex', 'diego']);
check('Two Against the World, all five: 6 v 4, Nick swapped out of their side for a street kid',
  s.ours.length === 5 && !s.theirs.includes('nick') && s.theirs.length === 4 && s.match === '6V4', s);
check('each crew kid carries his own gun (Eric MP5, Sean AK, Nick AR, Alex AK, Diego MP5)',
  s.guns.eric === 'mp5' && s.guns.sean === 'ak47' && s.guns.nick === 'ar' && s.guns.alex === 'ak47' && s.guns.diego === 'mp5', s.guns);
// The named kid comes along until he is in the crew
s = await sides('bunratty_team_2v1', ['eric']);
// v1.275: tuned for Eric, so their side keeps its margin of one: Sean and Ryan
check('You and Nick, Eric in: Nick (the named kid) and Eric with you, v Sean and Ryan', s.ours.join() === 'nick,eric' && s.theirs.join() === 'sean,ryan', s);
s = await sides('bunratty_team_2v1', ['eric', 'sean', 'nick']);
check('You and Nick, Sean and Nick in: your three in the order they joined, and a street kid for Sean on the other side',
  s.ours.join() === 'eric,sean,nick' && s.theirs.length === 2 && !s.theirs.some(k => ['sean', 'nick', 'eric'].includes(k)), s);
// Seth stays yours on Winnmark; a VIP stays
s = await sides('winnmark_team_3v3', ['eric', 'sean', 'nick', 'alex', 'diego']);
check('Squad Up, all five: Seth and your five (Trey\'s place goes to the crew)', s.ours.join() === 'seth,eric,sean,nick,alex,diego' && s.theirs.join() === 'brooke,jamie,marcus', s);
s = await sides('bunratty_vip', ['eric', 'sean', 'nick', 'alex', 'diego']);
check('Protect Ryan: Ryan (the VIP) and your five', s.ours[0] === 'ryan' && s.ours.length === 6, s);
// Seth on the other side: his crew crosses to him. The Last Saturday is 6 v 8, as the spec's finale
s = await sides('last_saturday', ['eric', 'sean', 'nick', 'alex', 'diego']);
check('The Last Saturday, all five: you and your five v Seth and seven, Brooke and Trey on his side, 6 v 8',
  s.ours.join() === 'eric,sean,nick,alex,diego' && s.theirs.length === 8 && s.theirs.includes('brooke') && s.theirs.includes('trey') && s.match === '6V8', s);
// A small crew: places left go to the match's own allies; a benched kid's place stays empty
s = await sides('hollow_big_battle', ['eric', 'sean', 'nick']);
// v1.275: Brooke crossing keeps the side at the match's five (Ryan sits out), the 5 v 5 it was built as
check('The Big Game, three in: Eric, Sean, Nick and Rebecca; Brooke crosses to Seth, 5 v 5', s.ours.join() === 'eric,sean,nick,rebecca' &&
  s.theirs.length === 5 && s.theirs.includes('brooke'), s);
s = await sides('hollow_big_battle', ['eric', 'sean', 'nick'], ['nick']);
check('The Big Game, Nick benched: his place stays empty, the briefing names him', s.ours.join() === 'eric,sean,rebecca' && s.benched.join() === 'Nick', s);
s = await sides('hollow_skirmish_3v3', ['eric', 'sean']);
// v1.275: tuned for Eric, Sean and Nick (4 v 4); with Nick not in, Rebecca (the match's own) fills his place
check('First Time in the Woods, Sean in: Sean is yours, Rebecca fills the third place, Seth and three v you', s.ours.join() === 'eric,sean,rebecca' &&
  s.theirs.length === 4 && !s.theirs.includes('sean') && s.theirs[0] === 'seth', s);

// Every team match with all five: the whole crew, no kid twice, none of yours facing you, Seth's crew never beside you
// against him, the kept kids kept, and your side at least the match's own count
const all = await page.evaluate(() => {
  Game.persist.crew = CREW_ROSTER.slice(); crewBench.clear();
  const bad = [];
  for (const id of Object.keys(SCENARIOS).filter(crewTeamMatch)) {
    const own = SCENARIOS[id].enemySetup, s = crewSetup(id);
    const ours = s.filter(e => e.team === 'player'), theirs = s.filter(e => e.team !== 'player');
    const sethFoe = theirs.some(e => e.charId === 'seth');
    const ids = s.map(e => e.charId);
    const why = [];
    if (new Set(ids).size !== ids.length) why.push('twice');
    if (!CREW_ROSTER.every(k => ours.some(e => e.charId === k))) why.push('crew missing');
    if (theirs.some(e => CREW_ROSTER.includes(e.charId))) why.push('crew facing you');
    if (sethFoe && ours.some(e => SETH_CREW_ROSTER.includes(e.charId))) why.push("Seth's crew beside you");
    if (own.some(e => e.vip && e.team === 'player' && !ours.some(o => o.charId === e.charId && o.vip))) why.push('VIP lost');
    if (ours.length < own.filter(e => e.team === 'player').length) why.push('short');
    if (theirs.length < own.filter(e => e.team !== 'player').length) why.push('fewer foes');
    if (s.some(e => !e.anchor || !e.weapon || !CHARACTERS[e.charId])) why.push('bad entry');
    if (why.length) bad.push(id + ': ' + why.join(', '));
  }
  return bad;
});
check('all 31 team matches with all five: whole crew, nobody twice, no crew kid against you, VIPs kept, no side short', all.length === 0, all);

// The briefing: Bench and Bring
await page.evaluate(() => { Game.persist.crew = ['eric', 'sean', 'nick']; crewBench.clear(); isScenarioUnlocked = () => true; openScenarioBrief('hollow_big_battle'); });
const br = () => page.evaluate(() => ({ bench: [...document.querySelectorAll('#briefRoster [data-bench]')].map(b => b.dataset.bench),
  bring: [...document.querySelectorAll('#briefRoster [data-unbench]')].map(b => b.dataset.unbench),
  allies: [...document.querySelectorAll('#briefRoster .brief-combatant.ally:not(.benched) .brief-name')].map(n => n.textContent) }));
let b1 = await br();
check('the briefing: a Bench button on each crew kid, none on Rebecca', b1.bench.join() === 'eric,sean,nick' && b1.allies.includes('Rebecca') && b1.bring.length === 0, b1);
await g.shot('crew-briefing');
await page.evaluate(() => document.querySelector('#briefRoster [data-bench="nick"]').click());
let b2 = await br();
check('Bench takes Nick off your side and shows him on the bench with Bring', !b2.allies.includes('Nick') && b2.bring.join() === 'nick' && b2.allies.length === 3, b2);
await page.evaluate(() => document.querySelector('#briefRoster [data-unbench="nick"]').click());
let b3 = await br();
check('Bring puts him back', b3.allies.includes('Nick') && b3.bring.length === 0, b3);
await page.evaluate(() => { document.querySelector('#briefRoster [data-bench="sean"]').click(); document.getElementById('scenarioBriefModal').classList.remove('active'); Game.mode = 'bedroom'; });

// In the match: the kids on the field are the crew's sides, each on his own gun
let bigGame = null;
const MATCHES = ['hollow_big_battle', 'bunratty_team_2v4', 'last_saturday', 'winnmark_team_3v3', 'bunratty_vip', 'bellfield_night_4v4'];
for (const id of MATCHES) {
  if (id !== 'hollow_big_battle') await page.evaluate(() => { Game.persist.crew = CREW_ROSTER.slice(); crewBench.clear(); });
  await g.scenario(id);
  await g.spin(240);
  const m = await page.evaluate(id => {
    const want = crewSetup(id), kids = Game.scenario.enemies;
    return { mode: Game.mode, ours: kids.filter(e => e.team === 'player').map(e => e.charId).sort().join(),
      wantOurs: want.filter(e => e.team === 'player').map(e => e.charId).sort().join(),
      theirs: kids.filter(e => e.team !== 'player').length, wantTheirs: want.filter(e => e.team !== 'player').length,
      eric: (kids.find(e => e.charId === 'eric') || {}).weapon };
  }, id);
  if (id === 'hollow_big_battle') bigGame = m.ours;
  check(`${id}: on the field, your side is the crew's (${m.wantOurs}) and theirs ${m.wantTheirs}; Eric on his MP5`, m.ours === m.wantOurs && m.theirs === m.wantTheirs && m.eric === 'mp5', m);
}
check('Sean, benched from the briefing, sat out The Big Game: Eric, Nick and Rebecca with you', bigGame === 'eric,nick,rebecca', bigGame);

// The bench is the briefing's, not the save's; the crew is the save's
const sv = await page.evaluate(() => { crewBench.add('nick'); saveGame(); Game.persist.crew = []; loadGame(); return crewMembers().join(); });
check('a save and load keeps the crew', sv === 'eric,sean,nick,alex,diego', sv);
// v1.314 (critic, 22 Oct): once Lights Out is won Seth crosses over, and the place he leaves is filled. Before, a kid put
// there had no anchor and the scene dropped him: Lights Out and Two on Two played 1 v 2, Outnumbered 1 v 3
await page.evaluate(() => { crewBench.clear && crewBench.clear(); });
for (const [crew, id] of [[[], 'winnmark_night_team_2v2'], [[], 'winnmark_team_2v2'], [['eric'], 'winnmark_night_team_2v2'], [['eric', 'sean'], 'winnmark_team_2v3']]) {
  await page.evaluate(c => { Game.persist.completed[WINNMARK_FINALE] = true; Game.persist.crew = c; }, crew);
  await g.scenario(id);
  await g.spin(30);
  const m = await page.evaluate(id => {
    const want = crewSetup(id), kids = Game.scenario.enemies;
    return { ours: kids.filter(e => e.team === 'player').map(e => e.charId).sort().join(),
      wantOurs: want.filter(e => e.team === 'player').map(e => e.charId).sort().join(),
      theirs: kids.filter(e => e.team !== 'player').map(e => e.charId).sort().join(), wantTheirs: want.filter(e => e.team !== 'player').length };
  }, id);
  check(`Seth turned, crew [${crew}], ${id}: your side on the field is the briefing's (${m.wantOurs}), not short; theirs ${m.theirs}`,
    m.ours === m.wantOurs && m.ours.split(',').filter(Boolean).length >= Math.max(1, crew.length) && m.theirs.split(',').length === m.wantTheirs && /seth/.test(m.theirs), m);
  await page.evaluate(() => endScenario('lose'));
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
