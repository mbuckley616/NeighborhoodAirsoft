// v1.401 (D.57 step 3, the plan's Crew Captains; Michael: all of docs/crew_ladder.md, 22 Oct): each captain's crew
// wears its own colour, has a heading and a score line on the briefing, its captain's callout says whose, its finale is
// the captain's whole crew with him in it at plus one, the captain is a notch better than his crew, and beating the
// finale pins the crew's bandana over the Pickup board.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

// The finales: the captain in, his crew around him (Seth may be his plus one), their side one more than yours
const fin = await page.evaluate(() => {
  const out = {};
  for (const [cap, ids] of Object.entries(CAPTAIN_FINALES)) for (const id of ids) {
    Game.persist.crew = crewFirstTime(id);
    const s = crewSetup(id), theirs = s.filter(e => e.team !== 'player'), ours = s.filter(e => e.team === 'player').length + 1;
    const crew = CAPTAIN_CREWS[captainCrewOf(cap)];
    out[id] = { cap, theirs: theirs.map(e => e.charId), ours,
      capIn: cap === 'seth' || theirs.some(e => e.charId === cap),
      // (a place past his whole crew is Seth's crew's, Seth with him: Northcliff's seven)
      others: theirs.filter(e => e.charId !== 'seth' && !crew.includes(e.charId) && !(cap === 'marcus' || cap === 'seth' || cap === 'tyler') &&
        !(captainOf(e.charId) === 'seth' && crew.every(k => theirs.some(t => t.charId === k)))).map(e => e.charId) };
  }
  Game.persist.crew = [];
  return out;
});
const badFin = Object.entries(fin).filter(([id, f]) => !f.capIn || f.others.length);
check('every captain plays his finale with his whole crew before anyone else (Seth\'s crew past it)', badFin.length === 0, fin);
check('Bunratty\'s finale: Mitchell and his crew, Seth his plus one, four against your three',
  fin.bunratty_night_team_2v2.theirs.includes('mitchell') && fin.bunratty_night_team_2v2.theirs.includes('seth') &&
  fin.bunratty_night_team_2v2.theirs.length === fin.bunratty_night_team_2v2.ours + 1, fin.bunratty_night_team_2v2);
check("the store's finale keeps Marcus, Jamie and Devon beside Tyler (the cousins' crews together, Michael's B)",
  ['tyler', 'marcus', 'jamie', 'devon'].every(k => fin.store_night_4v4.theirs.includes(k)) && !fin.store_night_4v4.theirs.some(k => ['garrett', 'colin'].includes(k)), fin.store_night_4v4);
const gym = ['bunratty_night_team_2v2', 'northcliff_night_4v4', 'school_night_4v4', 'lot_night_4v4'];
check('the four finales at the end of their zones are at plus one', gym.every(id => fin[id].theirs.length === fin[id].ours + 1), gym.map(id => fin[id]));

// The captain a notch better, never past Seth's best
const aims = await page.evaluate(() => ['bunratty_brothers', 'lot_1v1_marcus', 'bellfield_1v1_mason', 'school_1v1_tyler', 'store_1v1_tyler'].map(id => {
  const ctx = findScenarioListContext(id), cap = ZONE_CAPTAIN_KID[ctx.group];
  const es = crewSetup(id).find(e => e.charId === cap);
  return { id, cap, base: CHARACTERS[cap].accuracy, aim: es && es.statsOverride && es.statsOverride.accuracy };
}));
check('each captain a notch (0.05) over his own aim in his zone, at most 0.8', aims.every(a => Math.abs(a.aim - Math.min(0.8, a.base + 0.05)) < 1e-9), aims);

// The briefing: the callout names the captain; the heading and the score line are his crew's
const brief = await page.evaluate(() => {
  Game.persist.crew = ['eric', 'sean', 'nick'];
  const b = getScenarioBriefing('lot_team_3v3'), call = getScenarioBriefing('lot_1v1_marcus'), html = renderBriefingRosterHTML(b, {});
  const lineup = renderBriefingRosterHTML(b, { lineup: true });
  const plain = getScenarioBriefing('hollow_attack_north_fort');
  Game.persist.crew = [];
  return { line: call.matchTypeLine, brothers: getScenarioBriefing('bunratty_brothers').matchTypeLine, brooke: getScenarioBriefing('club_1v1_brooke').matchTypeLine,
    heading: /MARCUS'S CREW/.test(html), score: /CAPTAIN<\/span> Marcus's crew: beaten in 0 of their \d+ matches/.test(html),
    bands: (lineup.match(/data-band="/g) || []).length, foes: b.enemies.length, hollowCap: plain.captain };
});
check("Marcus's callout: \"Marcus calls you out.\"; the brothers' is Mitchell's; Brooke's stays a callout",
  brief.line === 'Marcus calls you out. Your crew watches from the curb.' && brief.brothers === 'Mitchell calls you out. Just you and them.' &&
  brief.brooke === 'A callout. Just you and them.', brief);
check("the lot's briefing: MARCUS'S CREW over their side, its score line, a bandana on every kid of theirs in the lineup",
  brief.heading && brief.score && brief.bands === brief.foes && brief.hollowCap === null, brief);

// In play: their kids wear their crews' colours, your crew yours
await page.evaluate(() => { Game.persist.crew = ['eric', 'sean', 'nick']; Game.persist.look.crewColor = CREW_COLORS[1].hex; });
await g.scenario('lot_team_3v3');
await g.spin(60);
const worn = await page.evaluate(() => Game.scenario.enemies.map(e => {
  let hex = null; e.mesh.group.traverse(o => { if (o.userData && o.userData.crewBandana) o.traverse(m => { if (m.material && m.material.color && hex == null) hex = m.material.color.getHex(); }); });
  return { kid: e.charId, team: e.team, hex, want: e.team === 'player' ? crewColor() : captainColorOf(e.charId) };
}));
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.spin(60);
const wrongBand = worn.filter(w => w.hex !== w.want);
check('in the lot, Marcus\'s kids wear teal, Seth\'s red, your crew your blue', wrongBand.length === 0 && worn.some(w => w.hex === 0x1f8a8a) && worn.some(w => w.hex === 0xc0282a) && worn.some(w => w.hex === 0x2a5ad0), worn);

// The finale won: its result card says so, and the bandana is on your wall
const won = await page.evaluate(() => {
  Game.persist.crew = ['eric', 'sean', 'nick'];
  return true;
});
await g.scenario('lot_night_4v4');
await g.spin(30);
const res = await page.evaluate(() => {
  for (const e of Game.scenario.enemies) if (e.team !== 'player') e.health = 0;
  endScenario('win');
  return document.getElementById('resultStats').textContent;
});
check('After Close won: "Marcus\'s crew\'s bandana goes on your wall."', /Marcus's crew's bandana goes on your wall/.test(res) && /CAPTAIN/.test(res), res.slice(0, 300));
await g.spin(30);
const wall = await page.evaluate(() => {
  Game.persist.completed.bunratty_night_team_2v2 = true;
  enterBedroom();
  const b = []; Game.scene.traverse(o => { if (o.name === 'captainBandana') b.push({ cap: o.userData.captain, hex: o.material.color.getHex(), y: +o.position.y.toFixed(2) }); });
  return b;
});
check("the wall: Mitchell's white and Marcus's teal, in the ladder's order, over the board", wall.length === 2 && wall[0].cap === 'mitchell' && wall[1].cap === 'marcus' &&
  wall[1].hex === 0x1f8a8a, wall);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
