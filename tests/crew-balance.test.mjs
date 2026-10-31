// v1.275 (D.28 step 3, Michael: A on "other side fixed or growing with your crew"): each team match is tuned for the
// crew you'd have the first time you reach it. Your side never smaller than that, theirs fixed: an ordinary match keeps
// its own margin, a zone's finale has one more on their side, the Last Saturday two more (Seth and his seven), and
// Winnmark's finale stays 2 v 2. A replay with all five is easy; on a Winnmark replay after Lights Out, Seth is theirs.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const ALL = ['eric', 'sean', 'nick', 'alex', 'diego'];
const count = (id, crew, done, bench) => page.evaluate(([id, crew, done, bench]) => {
  Game.persist.crew = crew; Game.persist.completed = Object.fromEntries(done.map(k => [k, true]));
  crewBench.clear(); (bench || []).forEach(k => crewBench.add(k));
  const s = crewSetup(id), ours = s.filter(e => e.team === 'player'), theirs = s.filter(e => e.team !== 'player');
  return { ours: ours.length + 1, theirs: theirs.length, oursIds: ours.map(e => e.charId), theirIds: theirs.map(e => e.charId),
    guns: Object.fromEntries(theirs.map(e => [e.charId, e.weapon])), match: scenarioMatchup(crewScenario(id)) };
}, [id, crew, done, bench || []]);

// The rule over every team match, the first time through (with the crew you'd have then)
const rule = await page.evaluate(() => {
  const out = [];
  for (const id of Object.keys(SCENARIOS).filter(crewTeamMatch).sort((a, b) => crewLadderPos(a) - crewLadderPos(b))) {
    const own = SCENARIOS[id].enemySetup, oursOwn = own.filter(e => e.team === 'player').length + 1, theirsOwn = own.length - oursOwn + 1;
    Game.persist.crew = crewFirstTime(id); Game.persist.completed = {}; crewBench.clear();
    const s = crewSetup(id), ours = s.filter(e => e.team === 'player').length + 1, theirs = s.length - ours + 1;
    out.push({ id, finale: crewFinale(id), oursOwn, theirsOwn, ours, theirs, first: crewFirstTime(id).length, posts: !!SCENARIOS[id].crewPosts });
  }
  Game.persist.crew = []; Game.persist.completed = {};
  return out;
});
const finales = rule.filter(r => r.finale);
const fin = Object.fromEntries(finales.map(r => [r.id, `${r.ours}v${r.theirs}`]));
console.log('   finales, first time:', JSON.stringify(fin));
// v1.393 (D.57 step 1): + the 12 solo matches your crew now plays and the 2 CLUTCH, which have their own rules
// (tests/match-type.test.mjs): their side at least yours, and a CLUTCH's sides as its own
check('46 team matches on the ladder (v1.318: + Night Swim; v1.393: + 14 with crewPosts), 8 of them a zone\'s finale', rule.length === 46 && finales.length === 8 && rule.filter(r => r.posts).length === 14, rule.length);
const ordinary = rule.filter(r => !r.finale && !r.posts && r.theirs - r.ours !== r.theirsOwn - r.oursOwn);
check('every ordinary team match keeps its own margin the first time through (their side grows as yours does)', ordinary.length === 0, ordinary);
const finBad = finales.filter(r => r.id === 'winnmark_night_team_2v2' ? r.ours !== 2 || r.theirs !== 2
  : r.id === 'last_saturday' ? r.theirs !== r.ours + 2 : r.theirs !== r.ours + 1);
check('every finale: their side one more than yours, the Last Saturday two more, Lights Out still 2 v 2', finBad.length === 0, finBad);
check('the finales come out Bunratty 3v4, the Hollow 5v6, the lot 4v5, Northcliff 6v7, the school 6v7, Willow Bend 6v7, the Last Saturday 6v8',
  fin.bunratty_night_team_2v2 === '3v4' && fin.hollow_full_auto_mayhem === '5v6' && fin.lot_night_4v4 === '4v5' &&
  fin.northcliff_night_4v4 === '6v7' && fin.school_night_4v4 === '6v7' && fin.club_night_4v4 === '6v7' && fin.last_saturday === '6v8', fin);

// Their side is fixed: the same number with nobody, the first-time crew or all five
const fixed = await page.evaluate(() => {
  const bad = [];
  for (const id of Object.keys(SCENARIOS).filter(crewTeamMatch)) {
    const n = crew => { Game.persist.crew = crew; return crewSetup(id).filter(e => e.team !== 'player').length; };
    Game.persist.completed = {};
    const a = n([]), b = n(crewFirstTime(id)), c = n(CREW_ROSTER.slice());
    if (a !== b || b !== c) bad.push(`${id}: ${a}/${b}/${c}`);
  }
  Game.persist.crew = [];
  return bad;
});
check('their side is fixed in every team match: the same with nobody, the first-time crew or all five', fixed.length === 0, fixed);

// A replay with all five is easy, as the spec says; your side is never smaller than the first time
let s = await count('bunratty_team_2v4', ALL, []);
check('Two Against the World with all five: 6 v 4', s.match === '6V4', s);
s = await count('northcliff_night_4v4', [], []);
check('Northcliff\'s finale with nobody in your crew: the street fills your side to six, v seven', s.ours === 6 && s.theirs === 7, s);
s = await count('northcliff_night_4v4', ALL, [], ['nick', 'alex']);
check('…with Nick and Alex benched: their places stay empty, 4 v 7', s.ours === 4 && s.theirs === 7, s);

// The Last Saturday: Seth and his seven, each on his own gun
s = await count('last_saturday', ALL, []);
check('the Last Saturday: your five v Seth, Trey, Brooke, Tyler, Evan, Andrew, Garrett and Colin, 6 v 8',
  s.match === '6V8' && s.theirIds.slice().sort().join() === ['seth', 'trey', 'brooke', 'tyler', 'evan', 'andrew', 'garrett', 'colin'].sort().join(), s);
check('Garrett carries an AR, Colin a MAC-10', s.guns.garrett === 'ar' && s.guns.colin === 'mac10', s.guns);
const desc = await page.evaluate(() => getScenarioBriefing('last_saturday').desc);
check('the Last Saturday\'s briefing names Seth\'s crew as it plays', /Seth, Trey, Brooke, Tyler, Evan, Andrew, Garrett and Colin/.test(desc) && /Six of you against eight/.test(desc), desc);

// Garrett and Colin only ever play with Seth, and only after Bellfield's flags
const gc = await page.evaluate(() => {
  Game.persist.crew = CREW_ROSTER.slice(); Game.persist.completed = {};
  const where = [];
  for (const id of Object.keys(SCENARIOS).filter(crewTeamMatch)) {
    const s = crewSetup(id);
    if (s.some(e => e.charId === 'garrett' || e.charId === 'colin')) where.push({ id, seth: s.some(e => e.charId === 'seth' && e.team !== 'player'),
      after: crewLadderPos(id) > crewLadderPos('bellfield_ctf'), ours: s.some(e => e.team === 'player' && ['garrett', 'colin'].includes(e.charId)) });
  }
  Game.persist.crew = [];
  return where;
});
check('Garrett and Colin take the field only on Seth\'s side, after Bellfield\'s flags', gc.length >= 2 && gc.every(w => w.seth && w.after && !w.ours), gc);

// Winnmark: Seth beside you the first time; on a replay after Lights Out he plays for the other side
s = await count('winnmark_team_3v3', [], []);
check('Squad Up the first time: you, Seth and Trey v 3, as it always was', s.oursIds.join() === 'seth,trey' && s.theirs === 3, s);
s = await count('winnmark_team_3v3', ALL, ['winnmark_night_team_2v2']);
check('Squad Up replayed after Lights Out with all five: your five v Seth and two, Trey with him', s.ours === 6 && s.theirs === 3 &&
  s.theirIds.includes('seth') && s.theirIds.includes('trey') && !s.oursIds.includes('seth'), s);
s = await count('winnmark_night_team_2v2', ['eric'], ['winnmark_night_team_2v2']);
check('Lights Out replayed with Eric: you and Eric v Seth and one', s.oursIds.join() === 'eric' && s.theirs === 2 && s.theirIds[0] === 'seth', s);

// In the match: the field is the sides, the new kids play, nothing errors
for (const [id, crew, done] of [['last_saturday', ALL, []], ['northcliff_night_4v4', [], []], ['bunratty_night_team_2v2', ['eric'], []],
  ['winnmark_team_3v3', ALL, ['winnmark_night_team_2v2']], ['club_night_4v4', ALL, []]]) {
  await page.evaluate(([crew, done]) => { Game.persist.crew = crew; Game.persist.completed = Object.fromEntries(done.map(k => [k, true])); crewBench.clear(); }, [crew, done]);
  await g.scenario(id);
  const p0 = await page.evaluate(() => Object.fromEntries(Game.scenario.enemies.map(e => [e.charId, [e.pos.x, e.pos.z]])));
  await g.spin(600);
  const m = await page.evaluate(([id, p0]) => {
    const want = crewSetup(id), kids = Game.scenario.enemies;
    const moved = kids.filter(e => p0[e.charId] && Math.hypot(e.pos.x - p0[e.charId][0], e.pos.z - p0[e.charId][1]) > 1).map(e => e.charId);
    return { mode: Game.mode, ours: kids.filter(e => e.team === 'player').length, theirs: kids.filter(e => e.team !== 'player').length,
      wantOurs: want.filter(e => e.team === 'player').length, wantTheirs: want.filter(e => e.team !== 'player').length,
      newKids: kids.filter(e => ['garrett', 'colin'].includes(e.charId)).map(e => e.charId + ':' + e.weapon), moved: moved.length, n: kids.length };
  }, [id, p0]);
  check(`${id}: ${m.wantOurs + 1} v ${m.wantTheirs} on the field, and the kids move off their spots (${m.moved} of ${m.n} in 10 s)${m.newKids.length ? ', ' + m.newKids.join(' ') : ''}`,
    m.ours === m.wantOurs && m.theirs === m.wantTheirs && m.moved >= Math.ceil(m.n / 2), m);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(2);
}
// v1.278: a kid the crew's numbers add to their side comes looking when he has hidden too long, as an ally does (v1.184);
// the match's own kids still hold until two of their side are left (v1.152). Brooke, added at Jamie's pool spot in the
// Eighteenth, hid 55 m off all round in 3 runs of 8 (country-club failed on CI).
await page.evaluate(() => { Game.persist.crew = ['eric', 'sean', 'nick', 'alex', 'diego']; Game.persist.completed = {}; crewBench.clear(); });
await g.scenario('club_eighteenth_3v3');
await g.spin(600);
const fill = await page.evaluate(() => {
  const foes = Game.scenario.enemies.filter(e => e.team !== 'player'), added = foes.filter(e => e.crewFill), own = foes.filter(e => !e.crewFill && e.charId !== 'seth');
  const sit = e => { e.state = 'hiding'; e._bored = false; e._boredAt = null; e._boredAfter = 25;
    for (let i = 0; i < 31 * 60 && !e._bored; i++) { e.state = 'hiding'; updateKidBoredom(e, 1 / 60); } return { n: e.charId, bored: !!e._bored }; };
  return { hold: inOpeningHold(), foes: foes.length, added: added.map(sit), own: own.map(sit), spec: crewSetup('club_eighteenth_3v3').filter(e => e.crewFill).length };
});
console.log('   the Eighteenth with all five:', JSON.stringify(fill));
check('the Eighteenth with all five: 6 on their side (Trey crossed over), Brooke and Garrett added by the crew\'s numbers', fill.foes === 6 && fill.added.length === 2 && fill.spec === 2, fill);
check('an added kid who hides 25 s comes looking with 6 on his side; the match\'s own kids still hold', !fill.hold &&
  fill.added.every(k => k.bored) && fill.own.length > 0 && fill.own.every(k => !k.bored), fill);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); Game.persist.crew = []; });
await g.spin(2);
// v1.349 (Found in play, critic v1.337): a briefing's "N a side" says the sides as built, the first time through and on a
// replay with all five (Night Swim said "Three a side" over a 6 v 6 roster)
const W = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const says = await page.evaluate((ALL) => {
  const out = [];
  for (const id of Object.keys(SCENARIOS).filter(id => crewTeamMatch(id) && / a side\b/.test(SCENARIOS[id].desc || ''))) {
    for (const [first, crew] of [[true, crewFirstTime(id)], [false, ALL]]) {
      Game.persist.crew = crew; Game.persist.completed = {}; crewBench.clear();
      const b = getScenarioBriefing(id);
      const m = b.desc.match(/\b([A-Z][a-z]+) (a side|of you against ([a-z]+))\b/);
      out.push({ id, first, crew: crew.length, ours: b.allies.length + 1, theirs: b.enemies.length, said: m ? m[0] : null, a: m && m[1].toLowerCase(), b: m && (m[3] || m[1].toLowerCase()) });
    }
  }
  Game.persist.crew = []; Game.persist.completed = {};
  return out;
}, ALL);
const wrong = says.filter(s => !s.said || W.indexOf(s.a) !== s.ours || W.indexOf(s.b) !== s.theirs);
console.log('   ' + says.filter(s => s.first).map(s => `${s.id} "${s.said}" ${s.ours}v${s.theirs}`).join('; '));
check(`every team briefing with "a side" in it (${says.length / 2}) says the sides as built, first time through and with all five`, says.length >= 16 && wrong.length === 0, wrong);
check('Night Swim the first time through: "Six a side"', says.some(s => s.id === 'pool_night_3v3' && s.first && s.said === 'Six a side'), says.filter(s => s.id === 'pool_night_3v3'));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
