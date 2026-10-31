// v1.393 (D.57 step 1, Michael: all of docs/crew_ladder.md, 22 Oct): your crew plays every match unless the match says
// why not. Every ladder match but the two tutorials has one of the types (CREW, 1V1 CALLOUT, FREE-FOR-ALL, CLUTCH, NO
// CREW YET, and SNUCK OUT for Bunratty's night lane), shown as a chip on its map card and a line on its briefing. The
// solo matches with no reason take the crew from their `crewPosts`, with the street making their side at least as many
// as yours; in a CLUTCH match your crew stands out on the sideline from the first frame and you hold alone.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

const all = await page.evaluate(() => {
  const ids = ZONE_LADDER.flatMap(z => PIN_SCENARIO_GROUPS[z.key]);
  Game.persist.crew = ['eric', 'sean', 'nick'];
  const rows = ids.map(id => { const b = getScenarioBriefing(id); return { id, type: b.matchType, line: b.matchTypeLine, tut: !!SCENARIOS[id].tutorial }; });
  Game.persist.crew = [];
  return rows;
});
const untyped = all.filter(r => !r.tut && (!r.type || !r.line));
check(`every one of the ${all.length} ladder matches but the tutorials has a type and a line`, untyped.length === 0 && all.filter(r => r.tut).every(r => !r.type), untyped);
const n = t => all.filter(r => r.type === t).length;
const counts = { crew: n('crew'), callout: n('callout'), ffa: n('ffa'), clutch: n('clutch'), nocrew: n('nocrew'), solo: n('solo') };
// (Winnmark's four team matches with Seth are CREW on a replay with your crew in, NO CREW YET before)
check('the types, with Eric, Sean and Nick in: 45 crew, 11 callouts, 7 free-for-alls (the hill race among them), 2 clutch, Winnmark\'s 10 solos with no crew yet, 1 snuck out',
  counts.crew === 45 && counts.callout === 11 && counts.ffa === 7 && counts.clutch === 2 && counts.nocrew === 10 && counts.solo === 1, counts);
const line = id => all.find(r => r.id === id).line;
check('the lines: crew names who is in; a callout, a free-for-all, a clutch, Winnmark',
  line('hollow_attack_north_fort') === "Your crew's in: Eric, Sean and Nick." && line('bunratty_sean') === 'A callout. Your crew watches from the curb.' &&
  line('hollow_ffa') === "Everybody for themselves. Crews don't count today." && line('store_defend_desk') === "Your crew's already out. It's on you." &&
  line('winnmark_cul_de_sac') === "You're the new kid on Seth's street.", all.filter(r => /attack_north_fort$|bunratty_sean|hollow_ffa|defend_desk|cul_de_sac/.test(r.id)));

// The solo matches your crew now plays: the crew on your side, at the match's posts; their side at least yours
const turned = await page.evaluate(() => {
  const out = [];
  for (const id of Object.keys(SCENARIOS).filter(id => SCENARIOS[id].crewPosts && MATCH_TYPES[id] !== 'clutch')) {
    // the crew you'd have the first time through (the match is tuned for it, v1.275), then all five (a replay, easier)
    for (const crew of [crewFirstTime(id), CREW_ROSTER.slice()]) {
      Game.persist.crew = crew;
      const s = crewSetup(id), ours = s.filter(e => e.team === 'player'), theirs = s.filter(e => e.team !== 'player');
      out.push({ id, crew: crew.length, first: crew.length < 5 || crewFirstTime(id).length === 5, ours: ours.map(e => e.charId).join(), theirs: theirs.length,
        own: SCENARIOS[id].enemySetup.length, posts: ours.every(e => SCENARIOS[id].crewPosts.includes(e.anchor)),
        noCrewThere: !theirs.some(e => crew.includes(e.charId)) });
    }
  }
  Game.persist.crew = [];
  return out;
});
const badTurned = turned.filter(t => !t.posts || !t.noCrewThere || t.ours.split(',').length < t.crew || t.theirs < t.own || (t.first && t.theirs < t.ours.split(',').length + 1));
check(`the ${turned.length / 2} solo matches turned crew: your crew at the match's posts, none of them on the other side, their side at least yours the first time through`,
  turned.length === 24 && badTurned.length === 0, badTurned.length ? badTurned : turned.filter(t => t.crew === 5).map(t => `${t.id} ${t.ours.split(',').length + 1}v${t.theirs}`));

// Each map card shows its chip; the briefing shows its line
const cards = await page.evaluate(() => {
  const res = [];
  Game.persist.crew = ['eric', 'sean', 'nick'];
  for (const z of ZONE_LADDER) {
    const html = PIN_SCENARIO_GROUPS[z.key].map((id, i) => renderScenarioCard(id, i + 1, false)).join('');
    const d = document.createElement('div'); d.innerHTML = html;
    for (const c of d.querySelectorAll('.sc-card')) {
      const chip = c.querySelector('.sc-card-type');
      res.push({ id: c.dataset.id, chip: chip ? chip.textContent : null, match: c.querySelector('.sc-card-match').textContent });
    }
  }
  openScenarioBrief('store_defend_desk');
  const el = document.querySelector('#briefRoster .brief-type');
  const benches = document.querySelectorAll('#briefRoster [data-bench]').length;
  const outs = [...document.querySelectorAll('#briefRoster .brief-combatant.ally .brief-lives')].map(e => e.textContent);
  document.getElementById('scenarioBriefModal').classList.remove('active'); Game.mode = 'bedroom';
  Game.persist.crew = [];
  return { res, brief: el ? el.textContent.trim() : null, benches, outs };
});
const tuts = all.filter(r => r.tut).map(r => r.id);
const noChip = cards.res.filter(c => !tuts.includes(c.id) && !c.chip);
check('every map card but the tutorials shows its chip', noChip.length === 0 && cards.res.find(c => c.id === 'store_defend_desk').chip === 'CLUTCH' &&
  cards.res.find(c => c.id === 'hollow_attack_north_fort').chip === 'CREW', noChip);
check("CLUTCH's card counts only you on your side (1V3), its briefing says why, with your crew already out and nobody to bench",
  cards.res.find(c => c.id === 'store_defend_desk').match === '1V3' && cards.brief === "CLUTCH Your crew's already out. It's on you." &&
  cards.benches === 0 && cards.outs.length === 3 && cards.outs.every(t => t === 'already out'), cards);

// In play: a turned match fields the crew; a CLUTCH match has them out from the first frame, BBs passing them
await page.evaluate(() => { Game.persist.crew = CREW_ROSTER.slice(); });
await g.scenario('hollow_attack_north_fort');
const att = await page.evaluate(() => {
  const p = Game.player.pos, ours = Game.scenario.enemies.filter(e => e.team === 'player');
  return { n: ours.length, live: ours.filter(e => e.health > 0).length, near: Math.max(...ours.map(e => Math.hypot(e.pos.x - p.x, e.pos.z - p.z))),
    theirs: Game.scenario.enemies.filter(e => e.team !== 'player').length };
});
await g.spin(600);
const att2 = await page.evaluate(() => ({ mode: Game.mode, moved: Game.scenario.enemies.filter(e => e.team === 'player' && e.health > 0 && e.state !== 'idle').length }));
check('Storm the North Fort with all five: your five start round you and fight (5 v 5 their side)', att.n === 5 && att.live === 5 && att.near < 8 && att.theirs === 5, { att, att2 });
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.spin(3);
await g.scenario('store_defend_desk');
const cl = await page.evaluate(() => {
  const ours = Game.scenario.enemies.filter(e => e.team === 'player');
  return { n: ours.length, out: ours.filter(e => e.health <= 0 && e.clutchOut && e._walkingOff).length,
    theirs: Game.scenario.enemies.filter(e => e.team !== 'player').length, hasAlly: hasLivingAlly('player') };
});
const before = await page.evaluate(() => Game.scenario.enemies.filter(e => e.team === 'player').map(e => [e.pos.x, e.pos.z]));
await g.spin(300);
const after = await page.evaluate(() => ({ pos: Game.scenario.enemies.filter(e => e.team === 'player').map(e => [e.pos.x, e.pos.z]), mode: Game.mode }));
const still = before.every((p, i) => Math.hypot(p[0] - after.pos[i][0], p[1] - after.pos[i][1]) < 0.05);
check('Customer Service with all five: they stand out on the sideline from the first frame, out of every lane, and stay; you hold v 3 alone',
  cl.n === 5 && cl.out === 5 && cl.theirs === 3 && !cl.hasAlly && still, { cl, still, mode: after.mode });
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); Game.persist.crew = []; });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
