// v1.202 (D.22 step 2, the mode): the Pickup Game board can set up a free-for-all on the four maps that have one
// (Winnmark, Bunratty, the Hollow, the lot), 3-way up to that map's free-for-all, at most 8-way; the kids are its
// first ones, at their own starts. The team maps offer Teams only.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const readBoard = () => page.evaluate(() => {
  const grp = k => [...document.querySelectorAll(`#modalBody .pk-opt[data-grp="${k}"]`)];
  const on = k => (grp(k).find(b => b.classList.contains('on')) || {}).textContent;
  return { mode: grp('mode').map(b => b.textContent), modeOn: on('mode'), sizes: grp('size').map(b => b.textContent),
    ways: grp('ways').map(b => b.textContent), waysOn: on('ways') };
});
const click = (grp, val) => page.evaluate(([grp, val]) =>
  document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click(), [grp, val]);

// A new game: Winnmark has Teams and Free-for-all, Teams lit, the team sizes shown
await page.evaluate(() => openPickupBoard());
const b0 = await readBoard();
check('a new game: Mode is Teams or Free-for-all, Teams lit, 1v1-3v3', b0.mode.join() === 'Teams,Free-for-all' && b0.modeOn === 'Teams'
  && b0.sizes.join() === '1v1,2v2,3v3' && b0.ways.length === 0, b0);
await click('mode', 'ffa');
const b1 = await readBoard();
check('Free-for-all on Winnmark: How many is 3-way to 5-way, 4-way lit, no team sizes', b1.modeOn === 'Free-for-all'
  && b1.ways.join() === '3-way,4-way,5-way' && b1.waysOn === '4-way' && b1.sizes.length === 0, b1);
await g.shot('pickup-ffa-board');
await page.evaluate(() => closeModal());

// Every zone open: the four free-for-all maps and their most; a team-only map drops back to Teams
const b2 = await page.evaluate(() => {
  for (const z of ZONE_LADDER) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  const ways = PICKUP_MAPS.map(m => m.key + ':' + pickupMaxWays(m)).join();
  pickupState.mode = 'ffa'; pickupState.map = 'northcliff';
  openPickupBoard();
  const mode = [...document.querySelectorAll('#modalBody .pk-opt[data-grp="mode"]')].map(b => b.textContent);
  const sizes = [...document.querySelectorAll('#modalBody .pk-opt[data-grp="size"]')].map(b => b.textContent);
  closeModal();
  return { ways, mode, sizes, state: pickupState.mode };
});
check('Winnmark goes to 5-way, Bunratty and the lot 7-way, the Hollow 8-way; the other five have none',
  b2.ways === 'winnmark:5,bunratty:7,hollow:8,market_lot:7,northcliff:0,bellfield:0,high_school:0,country_club:0,store:0', b2.ways);
check('Northcliff offers Teams only, and a free-for-all picked before falls back to Teams', b2.mode.join() === 'Teams'
  && b2.state === 'teams' && b2.sizes.join() === '1v1,2v2,3v3,4v4', b2);

// Click through: Bunratty, Free-for-all, 6-way, Night, 1 life, PLAY
const played = await page.evaluate(() => {
  openPickupBoard();
  const click = (grp, val) => document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click();
  click('map', 'bunratty'); click('mode', 'ffa'); click('ways', 6); click('tod', 'night'); click('lives', 1);
  const lit = [...document.querySelectorAll('#modalBody .pk-opt.on:not(.pk-kid):not([data-grp="clock"])')].map(b => b.textContent);   // v1.203: the kids aside; v1.204: and the clock
  document.getElementById('pickupPlayBtn').click();
  const sc = SCENARIOS.pickup_game;
  return { lit, mode: Game.mode, name: sc.scenarioName, ffa: sc.ffa, tod: sc.timeOfDay, kids: sc.enemySetup.map(e => e.charId),
    teams: sc.enemySetup.filter(e => e.team).length, npcLives: sc.npcLives, playerLives: sc.playerLives, desc: sc.desc };
});
console.log('  ', played.desc);
check('the picks are lit: Bunratty Court, Free-for-all, 6-way, Night, 1', played.lit.join() === 'Bunratty Court,Free-for-all,6-way,Night,1', played.lit);
check('PLAY builds a night 6-way free-for-all: Bunratty\'s first five, nobody on a side, one life each', played.mode === 'scenario_intro'
  && played.name === 'Pickup Game: 6-way free-for-all' && played.ffa === true && played.tod === 'night'
  && played.kids.join() === 'sean,nick,ryan,mitchell,priya' && played.teams === 0 && played.npcLives === 1 && played.playerLives === 1, played);
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
const brief = await page.evaluate(() => document.getElementById('introRoster').textContent.replace(/\s+/g, ' '));
check('the briefing\'s roster says EVERYONE ELSE (FREE-FOR-ALL)', /EVERYONE ELSE \(FREE-FOR-ALL\)/.test(brief), brief.slice(0, 300));
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; });
const live = await page.evaluate(() => ({ ffa: Game.scenario.ffa, teams: Game.scenario.enemies.map(e => e.team || '-'),
  allies: Game.scenario.enemies.filter(e => e.team === 'player').length }));
check('in the match: five kids, each on a side of his own, none with you', live.ffa === true && live.teams.length === 5
  && new Set(live.teams).size === 5 && live.allies === 0, live);
// Kids tag each other in a free-for-all: with you untaggable at your start, count the lives they take off each other
const fight = await page.evaluate(() => {
  if (Game.mode !== 'scenario') return { mode: Game.mode };
  const orig = applyBBHit; applyBBHit = (bb, who) => { if (who === Game.player) return; return orig(bb, who); };
  const kids = Game.scenario.enemies.slice();
  const lost = () => kids.reduce((a, k) => a + ((k.maxLives || 1) - (typeof k.lives === 'number' ? k.lives : (k.health > 0 ? 1 : 0))), 0);
  let f = 0;
  for (; f < 150 * 60 && Game.mode === 'scenario' && lost() < 2; f++) stepGame(1 / 60);
  applyBBHit = orig;
  return { lost: lost(), secs: +(f / 60).toFixed(1), mode: Game.mode, out: kids.filter(k => k.lives <= 0).map(k => k.charId) };
});
console.log('  ', JSON.stringify(fight));
check('the kids fight each other: two are out within 150 s, with you never tagged', fight.lost >= 2, fight);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });

// A win pays $3, no ladder win
const win = await page.evaluate(() => {
  buildPickupScenario({ map: 'winnmark', mode: 'ffa', ways: 3, tod: 'day', lives: 3 });
  return { kids: SCENARIOS.pickup_game.enemySetup.map(e => e.charId).join() };
});
await g.scenario('pickup_game');
const w0 = await page.evaluate(() => { const cash = Game.persist.cash, done = Object.keys(Game.persist.completed).length;
  for (const e of Game.scenario.enemies) { e.lives = 0; e.health = 0; }
  checkWinCondition(); return { cash, done }; });
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const w1 = await page.evaluate(() => ({ mode: Game.mode, cash: Game.persist.cash, done: Object.keys(Game.persist.completed).length,
  pickupDone: !!Game.persist.completed.pickup_game }));
check('a 3-way on Winnmark is you, Seth and Trey; winning pays $3 and marks nothing done', win.kids === 'seth,trey'
  && w1.mode === 'result' && w1.cash - w0.cash === 3 && w1.done === w0.done && !w1.pickupDone, { win, w0, w1 });

// Every free-for-all map builds and runs at 3-way by night and its most by day; the Hollow's start spread
const bad = [];
for (const key of ['winnmark', 'bunratty', 'hollow', 'market_lot']) for (const [ways, tod] of [[3, 'night'], [8, 'day']]) {
  const sc = await page.evaluate(([key, ways, tod]) => { const s = buildPickupScenario({ map: key, mode: 'ffa', ways, tod, lives: 3 });
    return { ways: s.pickup.ways, kids: s.enemySetup.map(e => e.charId + '@' + e.anchor) }; }, [key, ways, tod]);
  await g.scenario('pickup_game');
  const r = await page.evaluate(() => ({ kids: Game.scenario.enemies.length, teams: new Set(Game.scenario.enemies.map(e => e.team)).size }));
  const m = await g.spin(180);
  console.log(`   ${key} ${sc.ways}-way ${tod}: ${r.kids} kids, ${r.teams} sides, ${m}; ${sc.kids.join(' ')}`);
  if (!(r.kids === sc.ways - 1 && r.teams === sc.ways - 1 && (m === 'scenario' || m === 'result'))) bad.push({ key, ways, tod, sc, r, m });
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
}
check('the four maps build a free-for-all at 3-way by night and their most by day, and run 3 s', bad.length === 0, bad);
const hollow3 = await page.evaluate(() => buildPickupScenario({ map: 'hollow', mode: 'ffa', ways: 3, tod: 'day', lives: 1 }).enemySetup.map(e => e.anchor).join());
check('the Hollow\'s 3-way puts its two kids in different forts', hollow3 === 'a_fort,b_fort', hollow3);

// The team game is as before
const team = await page.evaluate(() => { const s = buildPickupScenario({ map: 'bunratty', size: 2, tod: 'day', lives: 3 });
  return { ffa: !!s.ffa, ours: s.enemySetup.filter(e => e.team === 'player').length, n: s.enemySetup.length }; });
check('with no mode it is the team game, as in v1.201', !team.ffa && team.ours === 1 && team.n === 3, team);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
