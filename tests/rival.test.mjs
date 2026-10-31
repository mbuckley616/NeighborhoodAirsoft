// v1.196 (D.20 step 3, Michael: A on "A better game" 1): Seth's crew is the summer's rival. Every ladder match with
// Seth on the other side (not the tutorial, the free-for-alls or Infection) names them in the briefing, the result
// card says how it went and the summer's score against them, and the calendar marks the days you beat them.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// Which matches are theirs
const list = await page.evaluate(() => ({ ids: rivalMatchIds(),
  ally: SCENARIOS.winnmark_team_2v2.enemySetup.find(e => e.charId === 'seth').team }));
const has = id => list.ids.includes(id);
// v1.362 (D.28 step 5): 24, with Bunratty's, Northcliff's and the school's finales, where Seth now plays the other side
// v1.404 (D.57 step 4): 25, with Seth Picks Teams, where Seth turns in Winnmark's finale
check('Seth\'s crew has 25 matches on the ladder, from his backyard to the last Saturday (v1.205; v1.362: 24, was 21; v1.404: 25)',
  list.ids.length === 25 && has('winnmark_night_team_2v2') && has('bunratty_night_team_2v2') && has('northcliff_night_4v4') && has('school_night_4v4') && has('last_saturday') && ['winnmark_seth_house', 'winnmark_cul_de_sac', 'hollow_big_battle', 'hollow_defend_south_fort_night',
    'lot_night_4v4', 'lot_vip_night', 'club_night_4v4'].every(has), list.ids);
check('not the tutorial, the free-for-alls, Infection, or a match with Seth on your side',
  !['winnmark_tutorial', 'winnmark_ffa', 'hollow_ffa', 'hollow_infection_night', 'winnmark_team_2v2', 'bunratty_sean'].some(has) && list.ally === 'player', list.ids);

// The briefing: a team match heads the other side SETH'S CREW and gives the score; a duel keeps OPPONENTS; others say nothing
const brief = await page.evaluate(() => {
  Game.persist.completed = { winnmark_tutorial: true, winnmark_seth_house: true, winnmark_seth_shotgun_duel: true };
  const html = id => { const d = document.createElement('div'); d.innerHTML = renderBriefingRosterHTML(getScenarioBriefing(id)); return d; };
  const read = id => { const d = html(id); return { heads: [...d.querySelectorAll('.brief-heading')].map(h => h.textContent),
    rival: (d.querySelector('.brief-rival') || {}).textContent || '' }; };
  return { team: read('winnmark_cul_de_sac'), duel: read('winnmark_seth_house'), other: read('bunratty_sean') };
});
check('Winnmark Cul-de-Sac: the other side is headed SETH\'S CREW', brief.team.heads[1] === "SETH'S CREW", brief.team.heads);
check('and RIVALS says "beaten in 2 of their 25 matches this summer"', /RIVALS\s*Seth's crew: beaten in 2 of their 25 matches this summer/.test(brief.team.rival), brief.team.rival);
check('a duel with Seth keeps OPPONENTS but gives the score', brief.duel.heads[1] === 'OPPONENTS' && /beaten in 2 of their 25/.test(brief.duel.rival), brief.duel);
check('Sean\'s duel on Bunratty has no rival line', brief.other.heads[1] === 'OPPONENTS' && brief.other.rival === '', brief.other);

// The loading screen before BEGIN shows it too
await page.evaluate(() => { isScenarioUnlocked = () => true; enterScenario('winnmark_cul_de_sac'); });
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
const intro = await page.evaluate(() => document.getElementById('introRoster').innerText);
check('the loading screen names SETH\'S CREW and the score', /SETH'S CREW/.test(intro) && /beaten in 2 of their 25/.test(intro), intro);
await g.shot('rival-intro');
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await g.spin(30);

// A first win over them, then a loss on the replay, then a second win
const play = async (outcome) => page.evaluate(o => {
  endScenario(o);
  return { r: Game.scenario.lastResult, text: document.getElementById('resultStats').innerText };
}, outcome);
const again = async () => {
  await page.evaluate(() => document.getElementById('navAgainBtn').click());
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  await page.evaluate(() => document.getElementById('introBeginBtn').click());
  await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
  await g.spin(30);
};
const w1 = await play('win');
check('a first win: "Seth\'s crew goes home beaten. You\'ve beaten them in 3 of their 25 matches this summer."',
  w1.r.rival === "Seth's crew goes home beaten. You've beaten them in 3 of their 25 matches this summer.", w1.r.rival);
check('the card shows it under RIVALS', /RIVALS\s*Seth's crew goes home beaten/.test(w1.text), w1.text);
await g.shot('rival-result');
await again();
const l1 = await play('lose');
check('a loss: "Seth\'s crew takes this one.", the score still 3', /^Seth's crew takes this one\. You've beaten them in 3 of their 25/.test(l1.r.rival), l1.r.rival);
await again();
const w2 = await play('win');
check('a replayed win: "Seth\'s crew loses again.", the score still 3', /^Seth's crew loses again\. You've beaten them in 3 of their 25/.test(w2.r.rival), w2.r.rival);

// A duel with Seth alone names Seth; a non-rival match has no line
await page.evaluate(() => { cleanupScenarioScene && cleanupScenarioScene(); });
await g.scenario('winnmark_seth_shotgun_duel');
await g.spin(30);
const duel = await play('lose');
check('losing the shotgun duel: "Seth takes this one."', /^Seth takes this one\. You've beaten his crew in 3 of their 25/.test(duel.r.rival), duel.r.rival);
await page.evaluate(() => { cleanupScenarioScene(); });
await g.scenario('bunratty_sean');
await g.spin(30);
const sean = await play('win');
check('beating Sean has no RIVALS line', sean.r.rival === '' && !/RIVALS/.test(sean.text), sean.r.rival);
await page.evaluate(() => { cleanupScenarioScene(); });

// The calendar: a red dot on each day a win over them brought
const cal = await page.evaluate(() => {
  enterBedroom();
  const done = { winnmark_tutorial: true };
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) { done[id] = true; if (id === 'hollow_big_battle') break; }
  for (const id of PIN_SCENARIO_GROUPS.winnmark_court) done[id] = true;
  Game.persist.completed = done;
  const days = rivalWinDays();
  const want = [...new Set(rivalMatchIds().filter(id => done[id]).map(summerDayAfter))];
  openSummerCalendar();
  const dots = [...document.querySelectorAll('#modalBody .sm-day.rival')].map(e => +e.dataset.day);
  const note = document.querySelector('#modalBody .sm-rival').textContent;
  const tip = (document.querySelector('#modalBody .sm-day.rival') || {}).title || '';
  const dot = (() => { const e = document.querySelector('#modalBody .sm-day.rival'); return e ? getComputedStyle(e, '::after').backgroundColor : ''; })();
  return { days, want, dots, note, tip, dot, beaten: rivalScore().beaten };
});
check('each rival win\'s day carries a red dot', cal.dots.length === cal.days.length && cal.days.length === cal.want.length &&
  cal.days.every(d => cal.dots.includes(d)) && /rgb\(224, 80, 58\)/.test(cal.dot), cal);
check('the note counts them and gives the score', new RegExp(`A red dot is a day you beat Seth's crew: ${cal.days.length} so far; beaten in ${cal.beaten} of their 25`).test(cal.note) && cal.beaten >= 8, cal.note);
check('a dotted day says so on hover', /you beat Seth's crew/.test(cal.tip), cal.tip);
await g.shot('rival-calendar');
const none = await page.evaluate(() => {
  document.getElementById('modalCloseBtn').click();
  Game.persist.completed = {};
  openSummerCalendar();
  const r = { dots: document.querySelectorAll('#modalBody .sm-day.rival').length, note: document.querySelector('#modalBody .sm-rival').textContent };
  document.getElementById('modalCloseBtn').click();
  return r;
});
check('a new summer has no dots: "No wins over Seth\'s crew yet"', none.dots === 0 && /^No wins over Seth's crew yet; beaten in 0 of their 25/.test(none.note), none);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
