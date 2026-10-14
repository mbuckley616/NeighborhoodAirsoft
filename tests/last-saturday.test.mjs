// v1.205 (D.20 step 4, Michael: B on "The last Saturday: where is your street?", his note "Bunratty court should be
// 'my street'"): the summer ends with one big match on your own street, Bunratty Court, on Saturday 30 August. A day
// 6v6, last team standing, three lives each, Seth's crew in the bulb; the fifth card after the store's night match and
// the end of the ladder. Winning it turns the calendar to the big day and brings a last text.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(5);

// Where it sits: after the store's night match, the ladder's last card, locked until that match is won
const lad = await page.evaluate(() => {
  const ids = PIN_SCENARIO_GROUPS.grocery_store, done = Game.persist.completed;
  const lockedNew = isScenarioUnlocked('last_saturday');
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) if (id !== 'last_saturday' && id !== 'store_night_4v4') done[id] = true;
  const beforeNight = { open: isScenarioUnlocked('last_saturday'), reason: scenarioLockReason('last_saturday'), day: summerDayIndex() };
  done.store_night_4v4 = true;
  const after = { open: isScenarioUnlocked('last_saturday'), day: summerDate(summerDayIndex()).label };
  const sc = SCENARIOS.last_saturday;
  return { ids, lockedNew, beforeNight, after, cap: zoneCapstoneId(ZONE_LADDER[ZONE_LADDER.length - 1].key),
    rival: isRivalMatch('last_saturday'), matchup: scenarioMatchup(sc), name: sc.name, scName: sc.scenarioName,
    builder: sc.builderFn, tod: sc.timeOfDay || 'day', lives: getScenarioBriefing('last_saturday').player.lives,
    kids: sc.enemySetup.map(e => ({ id: e.charId, team: e.team || 'enemy', lives: setupEntryLives(sc, e) })) };
});
check('the store\'s list ends with the last Saturday, after the night match; it is the ladder\'s last card',
  lad.ids.slice(-2).join() === 'store_night_4v4,last_saturday' && lad.cap === 'last_saturday', lad.ids);
check('it is locked on a new game and until the store\'s night match is won', !lad.lockedNew && !lad.beforeNight.open
  && /Lights Out/.test(lad.beforeNight.reason), lad.beforeNight);
check('with the night match won it opens, on Friday 29 August', lad.after.open && lad.after.day === 'Friday 29 August', lad.after);
check('"The Last Saturday" is on Bunratty Court, by day, 6V6', lad.scName === 'The Last Saturday' && lad.name === 'Bunratty Court'
  && lad.builder === 'buildBunrattyCourtScene' && lad.tod === 'day' && lad.matchup === '6V6', lad);
const ours = lad.kids.filter(k => k.team === 'player').map(k => k.id), theirs = lad.kids.filter(k => k.team !== 'player').map(k => k.id);
check('Eric, Rebecca, Brooke, Sean and Trey with you; Seth, Devon, Mitchell, Mason, Marcus and Ryan against',
  ours.join() === 'eric,rebecca,brooke,sean,trey' && theirs.join() === 'seth,devon,mitchell,mason,marcus,ryan', { ours, theirs });
check('three lives each, you included, and it is a match against Seth\'s crew', lad.lives === 3 && lad.kids.every(k => k.lives === 3) && lad.rival, lad);

// The map screen: the store's zone shows it as card 5, NEXT
const card = await page.evaluate(() => {
  openMap(); selectMapZone('grocery_store');
  const c = document.querySelector('#worldMap .sc-card[data-id="last_saturday"]');
  const out = c ? { num: c.querySelector('.sc-card-num').textContent, title: c.querySelector('.sc-card-title').textContent,
    meta: c.querySelector('.sc-card-meta').textContent, next: c.classList.contains('next'), locked: c.classList.contains('locked') } : null;
  closeMap();
  return out;
});
check('the map shows it as the store\'s card 5, NEXT: "The Last Saturday", Bunratty Court, 3 lives', card && card.num === '5'
  && card.title === 'The Last Saturday' && /Bunratty Court · ♥ 3 lives/.test(card.meta) && card.next && !card.locked, card);

// The briefing heads the other side SETH'S CREW
const brief = await page.evaluate(() => { const d = document.createElement('div');
  d.innerHTML = renderBriefingRosterHTML(getScenarioBriefing('last_saturday'));
  return [...d.querySelectorAll('.brief-heading')].map(h => h.textContent); });
check('the briefing heads the other side SETH\'S CREW', brief[1] === "SETH'S CREW", brief);

// Play it: eleven kids on Bunratty, six a side with you, everyone on three; both sides fight
await g.scenario('last_saturday');
const s0 = await page.evaluate(() => ({ n: Game.scenario.enemies.length, ours: Game.scenario.enemies.filter(e => e.team === 'player').length,
  lives: [...new Set(Game.scenario.enemies.map(e => e.lives))], hits: Game.player.maxHits,
  x: +Game.player.pos.x.toFixed(1) }));
check('in the match: 11 kids, 5 of them with you, all on 3 lives, and you take 3 hits; you start at the west end',
  s0.n === 11 && s0.ours === 5 && s0.lives.join() === '3' && s0.hits === 3 && s0.x < -15, s0);
await page.evaluate(() => { Game.player._graceT = 999; });   // stand at the start untaggable and let them fight
let t = 0, fired = null;
for (; t < 60; t += 10) {
  await g.spin(600);
  fired = await page.evaluate(() => ({ mode: Game.mode, time: +Game.scenario.roundTime.toFixed(1),
    livesOurs: Game.scenario.enemies.filter(e => e.team === 'player').reduce((a, e) => a + Math.max(0, e.lives), 0),
    livesTheirs: Game.scenario.enemies.filter(e => e.team !== 'player').reduce((a, e) => a + Math.max(0, e.lives), 0) }));
  if (fired.mode !== 'scenario' || (fired.livesOurs < 15 && fired.livesTheirs < 18)) break;
}
check('both sides trade tags: each has lost lives within a minute', fired.livesOurs < 15 && fired.livesTheirs < 18, fired);
await g.shot('last-saturday');

// Win it: the calendar turns to Saturday 30 August, and Eric texts the last text of the summer
const w = await page.evaluate(() => {
  const cash = Game.persist.cash;
  Game.mode = 'scenario';
  endScenario('win');
  return { done: !!Game.persist.completed.last_saturday, paid: Game.persist.cash - cash, want: scaledReward(SCENARIOS.last_saturday.rewards.win),
    flavor: document.getElementById('flavorText').textContent, day: summerDate(summerDayIndex()).label,
    text: summerTexts()[0], note: summerCalendarHTML(summerDayIndex()) };
});
console.log('  ', w.flavor);
check('a win marks it done and pays its $' + w.want, w.done && w.paid === w.want, w);
check('the calendar turns to Saturday 30 August, "won on your street"', w.day === 'Saturday 30 August' && /won on your street/.test(w.note), w.day);
check('Eric\'s last text of the summer, dated Saturday 30 August', w.text && w.text.id === 'summerEnd' && w.text.from === 'Eric'
  && w.text.day === 90, w.text);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
