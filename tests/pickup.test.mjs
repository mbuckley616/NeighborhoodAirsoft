// v1.201 (D.22 step 1, Michael: A on "A better game" 3): the Pickup Game board. A corkboard on the bedroom's north
// wall sets up a team match on any map whose zone is open: how many a side, day or night, lives. Each map's match is
// its biggest team battle cut to size. It pays $3 a win and $1 a loss and is no ladder win.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// Walk up to the board: the prompt, then E opens it
await page.evaluate(() => { Game.player.pos.set(1.65, 0, -1.4); Game.player.yaw = 0; Game.player.pitch = 0; });
await g.spin(3);
const near = await page.evaluate(() => ({ focus: Game.focusedInteractable && Game.focusedInteractable.type,
  prompt: document.getElementById('interactPrompt').textContent }));
check('in front of the corkboard, the prompt is "Set up a pickup game"', near.focus === 'pickup_board' && /Set up a pickup game/.test(near.prompt), near);
await g.shot('pickup-wall');
await page.keyboard.press('KeyE');
const readBoard = () => page.evaluate(() => {
  const grp = k => [...document.querySelectorAll(`#modalBody .pk-opt[data-grp="${k}"]`)];
  const on = k => (grp(k).find(b => b.classList.contains('on')) || {}).textContent;
  return { mode: Game.mode, title: document.getElementById('modalTitle').textContent,
    maps: grp('map').map(b => b.textContent), sizes: grp('size').map(b => b.textContent), tod: grp('tod').map(b => b.textContent),
    lives: grp('lives').map(b => b.textContent), on: { map: on('map'), size: on('size'), tod: on('tod'), lives: on('lives') },
    play: !!document.getElementById('pickupPlayBtn') };
});
const b0 = await readBoard();
check('E opens "Pickup Game" over the bedroom', b0.mode === 'modal' && b0.title === 'Pickup Game' && b0.play, b0);
check('a new game: only Winnmark Court is open, 1v1 to 3v3', b0.maps.join() === 'Winnmark Court' && b0.sizes.join() === '1v1,2v2,3v3', b0);
check('day or night, and 1, 3 or 5 lives; 2v2, day, 3 lives to start', b0.tod.join() === 'Day,Night' && b0.lives.join() === '1,3,5'
  && b0.on.size === '2v2' && b0.on.tod === 'Day' && b0.on.lives === '3', b0);
await g.shot('pickup-board');
await page.evaluate(() => closeModal());

// Every zone open (each capstone won): nine maps; Winnmark stops at 3v3, the rest at 4v4
const b1 = await page.evaluate(() => {
  for (const z of ZONE_LADDER) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  openPickupBoard();
  const maps = [...document.querySelectorAll('#modalBody .pk-opt[data-grp="map"]')].map(b => b.textContent);
  const max = PICKUP_MAPS.map(m => m.key + ':' + pickupMaxSize(m));
  closeModal();
  for (const k of Object.keys(Game.persist.completed)) delete Game.persist.completed[k];
  return { maps, max };
});
check('with every zone open the board lists all nine maps', b1.maps.length === 9 && b1.maps[0] === 'Winnmark Court' && b1.maps[8] === 'Inside Riverside Market', b1.maps);
check('Winnmark goes to 3v3, the other eight to 4v4', b1.max.join() === 'winnmark:3,bunratty:4,hollow:4,market_lot:4,northcliff:4,bellfield:4,high_school:4,country_club:4,store:4', b1.max);

// Click through a game: Bunratty, 4v4, night, 5 lives, PLAY
const played = await page.evaluate(() => {
  for (const z of ZONE_LADDER.slice(0, 2)) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  openPickupBoard();
  const click = (grp, val) => document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click();
  click('map', 'bunratty'); click('size', 4); click('tod', 'night'); click('lives', 5);
  const lit = [...document.querySelectorAll('#modalBody .pk-opt.on')].map(b => b.textContent);
  document.getElementById('pickupPlayBtn').click();
  const sc = SCENARIOS.pickup_game;
  return { lit, mode: Game.mode, modal: document.getElementById('modalScreen').classList.contains('active'),
    name: sc.scenarioName, tod: sc.timeOfDay, ours: sc.enemySetup.filter(e => e.team === 'player').length,
    theirs: sc.enemySetup.filter(e => !e.team).length, npcLives: sc.npcLives, playerLives: sc.playerLives, desc: sc.desc };
});
console.log('  ', played.desc);
check('the four picks are lit: Bunratty Court, 4v4, Night, 5', played.lit.join() === 'Bunratty Court,4v4,Night,5', played.lit);
check('PLAY builds a night 4v4, five lives each, and opens its briefing', played.mode === 'scenario_intro' && !played.modal && played.name === 'Pickup Game: 4v4'
  && played.tod === 'night' && played.ours === 3 && played.theirs === 4 && played.npcLives === 5 && played.playerLives === 5, played);
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; });
const live = await page.evaluate(() => ({ active: Game.scenario.active, night: Game.scenario.timeOfDay || (SCENARIOS.pickup_game.timeOfDay),
  kids: Game.scenario.enemies.map(e => `${e.charId}/${e.team}/${e.lives}`), maxHits: Game.player.maxHits }));
console.log('  ', JSON.stringify(live));
check('in the match: 3 allies and 4 of theirs, each with 5 lives; you take 5 hits', live.kids.length === 7
  && live.kids.filter(k => k.includes('/player/')).length === 3 && live.kids.every(k => k.endsWith('/5')) && live.maxHits >= 5, live);
await g.spin(600);
const mid = await page.evaluate(() => ({ mode: Game.mode }));
check('10 s of it run', mid.mode === 'scenario' || mid.mode === 'result', mid);

// A win pays $3 and is no ladder win; the calendar does not move
const win = await page.evaluate(() => {
  const cash = Game.persist.cash, day = summerDayIndex(), done = Object.keys(Game.persist.completed).length;
  for (const e of Game.scenario.enemies) if (e.team !== 'player') { e.lives = 0; e.health = 0; }
  checkWinCondition();
  return { cash, day, done };
});
// endScenarioLater's 600 ms is a wall-clock timeout (v1.90), so wait for it rather than stepping
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const won = await page.evaluate(() => ({ mode: Game.mode, cash: Game.persist.cash, day: summerDayIndex(),
  done: Object.keys(Game.persist.completed).length, pickupDone: !!Game.persist.completed.pickup_game }));
check('a win: the result, $3', won.mode === 'result' && won.cash - win.cash === 3, { win, won });
check('…and no ladder win: nothing completed, the calendar where it was', !won.pickupDone && won.done === win.done && won.day === win.day, { win, won });

// A loss pays $1
const lose0 = await page.evaluate(() => Game.persist.cash);
await page.evaluate(() => { buildPickupScenario({ map: 'winnmark', size: 1, tod: 'day', lives: 1 }); });
await g.scenario('pickup_game');
const one = await page.evaluate(() => Game.scenario.enemies.map(e => `${e.charId}/${e.team}`));
await page.evaluate(() => endScenario('lose'));
const lost = await page.evaluate(() => Game.persist.cash);
check('a 1v1 on Winnmark is you against one kid, and a loss pays $1', one.length === 1 && !one[0].includes('/player') && lost - lose0 === 1, { one, lose0, lost });

// Every map builds and runs at 2v2 by night and 4v4 (3v3) by day
const maps = await page.evaluate(() => PICKUP_MAPS.map(m => m.key));
const bad = [];
for (const key of maps) for (const [size, tod] of [[2, 'night'], [4, 'day']]) {
  const sc = await page.evaluate(([key, size, tod]) => { const s = buildPickupScenario({ map: key, size, tod, lives: 3 });
    return { size: s.pickup.size, n: s.enemySetup.length }; }, [key, size, tod]);
  await g.scenario('pickup_game');
  const r = await page.evaluate(() => ({ kids: Game.scenario.enemies.length, allies: Game.scenario.enemies.filter(e => e.team === 'player').length }));
  const m = await g.spin(180);
  const ok = r.kids === sc.size * 2 - 1 && r.allies === sc.size - 1 && (m === 'scenario' || m === 'result');
  console.log(`   ${key} ${sc.size}v${sc.size} ${tod}: ${r.kids} kids (${r.allies} ours), ${m}`);
  if (!ok) bad.push({ key, size, tod, sc, r, m });
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
}
check('every map builds its pickup game at 2v2 by night and its biggest by day, and runs 3 s', bad.length === 0, bad);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
