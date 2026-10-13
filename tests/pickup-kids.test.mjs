// v1.203 (D.22 step 3, which kids): the Pickup Game board lists every kid who plays on the chosen street and you
// pick who is with you, who is against you, or who is in the free-for-all. Each side keeps the map's spots: a kid
// you pick takes his own spot, with his gun there, when it is one of them, else the next free one with his own gun.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const read = () => page.evaluate(() => {
  const grp = k => [...document.querySelectorAll(`#modalBody .pk-opt[data-grp="${k}"]`)];
  const on = k => grp(k).filter(b => b.classList.contains('on')).map(b => b.textContent);
  const off = k => grp(k).filter(b => b.disabled).map(b => b.textContent);
  const play = document.getElementById('pickupPlayBtn');
  const st = k => (pickupState[k] || []).map(id => CHARACTERS[id].name);   // in the order picked
  return { pool: grp('theirs').map(b => b.textContent), ours: st('ours'), theirs: st('theirs'), ffa: st('ffaKids'), lit: on('theirs'),
    oursOff: off('ours'), theirsOff: off('theirs'), ffaPool: grp('ffaKids').map(b => b.textContent),
    play: play.textContent, disabled: play.disabled };
});
const click = (grp, val) => page.evaluate(([grp, val]) =>
  document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click(), [grp, val]);

// A new game, Winnmark 2v2: every Winnmark kid listed; the picks start as v1.201's (Seth with you, Brooke and Jamie against)
await page.evaluate(() => openPickupBoard());
const b0 = await read();
console.log('   Winnmark pool:', b0.pool.join(', '));
check('Winnmark 2v2: every kid who plays on Winnmark is listed, at least the five of its 3v3', b0.pool.length >= 5
  && ['Seth', 'Trey', 'Brooke', 'Jamie', 'Marcus'].every(n => b0.pool.includes(n)), b0.pool);
check('the picks start as v1.201\'s: Seth with you, Brooke and Jamie against; PLAY ready', b0.ours.join() === 'Seth'
  && b0.theirs.join() === 'Brooke,Jamie' && b0.play === 'PLAY' && !b0.disabled, b0);
check('the picked kids are the lit buttons', b0.lit.slice().sort().join() === b0.theirs.slice().sort().join(), b0);
check('a kid on one side is greyed on the other', b0.theirsOff.join() === 'Seth' && b0.oursOff.join() === 'Brooke,Jamie', b0);
await g.shot('pickup-kids-board');

// Put Seth against you: take him off your side (PLAY waits), pick Marcus with you, then Seth against in place of Jamie
await click('ours', 'seth');
const b1 = await read();
check('taking Seth off leaves your side 0/1 and PLAY waits: PICK THE KIDS', b1.ours.length === 0 && b1.disabled && b1.play === 'PICK THE KIDS', b1);
await click('ours', 'marcus');
await click('theirs', 'seth');
const b2 = await read();
check('Marcus with you; Seth against you in place of the last pick (Jamie)', b2.ours.join() === 'Marcus' && b2.theirs.join() === 'Brooke,Seth' && !b2.disabled, b2);
const built = await page.evaluate(() => {
  document.getElementById('pickupPlayBtn').click();
  return SCENARIOS.pickup_game.enemySetup.map(e => `${e.charId}/${e.team || '-'}/${e.weapon}/${e.anchor}`);
});
console.log('  ', built.join(' '));
check('PLAY builds it: Marcus with you at your side\'s first spot with his shotgun; Brooke at her own spot, Seth at the next',
  built.join() === 'marcus/player/shotgun/house2_backyard,brooke/-/shotgun/house7_backyard,seth/-/pistol/house6_backyard', built);
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
const roster = await page.evaluate(() => document.getElementById('introRoster').textContent.replace(/\s+/g, ' '));
check('the briefing lists Marcus with you and Seth against you', /Marcus/.test(roster) && /Seth/.test(roster), roster.slice(0, 300));
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; });
const live = await page.evaluate(() => Game.scenario.enemies.map(e => `${e.charId}/${e.team}`).join());
check('in the match Marcus is on your side and Seth on theirs', live === 'marcus/player,brooke/enemy,seth/enemy', live);
const m = await g.spin(300);
check('5 s of it run', m === 'scenario' || m === 'result', m);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });

// Picks stay on the board; a bigger size pads from the defaults; another map starts afresh
const b3 = await page.evaluate(() => {
  for (const z of ZONE_LADDER) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  openPickupBoard();
  const on = k => pickupState[k].map(id => CHARACTERS[id].name);
  const before = { ours: on('ours'), theirs: on('theirs') };
  document.querySelector('#modalBody .pk-opt[data-grp="size"][data-val="3"]').click();
  const bigger = { ours: on('ours'), theirs: on('theirs') };
  document.querySelector('#modalBody .pk-opt[data-grp="map"][data-val="northcliff"]').click();
  document.querySelector('#modalBody .pk-opt[data-grp="size"][data-val="4"]').click();
  const nc = { ours: on('ours'), theirs: on('theirs'), pool: [...document.querySelectorAll('#modalBody .pk-opt[data-grp="theirs"]')].map(b => b.textContent) };
  return { before, bigger, nc };
});
console.log('   Northcliff pool:', b3.nc.pool.join(', '));
check('the picks are kept on the board', b3.before.ours.join() === 'Marcus' && b3.before.theirs.join() === 'Brooke,Seth', b3.before);
check('3v3 keeps them and pads each side', b3.bigger.ours.length === 2 && b3.bigger.ours[0] === 'Marcus'
  && b3.bigger.theirs.length === 3 && b3.bigger.theirs.slice(0, 2).join() === 'Brooke,Seth', b3.bigger);
check('Northcliff 4v4 starts on its own kids: Andrew, Alex, Evan with you; Mason, Christian, Diego, Fernando against',
  b3.nc.ours.join() === 'Andrew,Alex,Evan' && b3.nc.theirs.join() === 'Mason,Christian,Diego,Fernando', b3.nc);

// Leave Fernando out of Northcliff by day (the critic's 13 Oct sniper): another kid takes his nest, without the role
const nf = await page.evaluate(() => {
  const click = (grp, val) => document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click();
  const pool = [...document.querySelectorAll('#modalBody .pk-opt[data-grp="theirs"]')].map(b => b.dataset.val);
  const spare = pool.find(id => !pickupState.ours.includes(id) && !pickupState.theirs.includes(id));
  click('theirs', 'fernando'); click('theirs', spare);
  document.getElementById('pickupPlayBtn').click();
  return { spare, es: SCENARIOS.pickup_game.enemySetup.map(e => `${e.charId}/${e.team || '-'}/${e.weapon}/${e.anchor}/${e.role || ''}`) };
});
console.log('  ', nf.spare, nf.es.join(' '));
const nest = nf.es.find(s => s.includes('/yard_n3/'));
check('without Fernando, the spare kid takes the yard_n3 spot with his own gun and no defender role', !!nf.spare
  && !nf.es.some(s => s.startsWith('fernando')) && nest && nest.startsWith(nf.spare + '/-/') && nest.endsWith('/'), nf);
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
check('it runs 3 s', ['scenario', 'result'].includes(await g.spin(180)));
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });

// Free-for-all: Who lists the street's kids, starts on v1.202's, and a pick swaps in at the spots
const ff = await page.evaluate(() => {
  pickupState.map = 'hollow'; pickupState.mode = 'ffa'; pickupState.ways = 4;
  openPickupBoard();
  const on = () => pickupState.ffaKids.slice();
  const start = on();
  document.querySelector('#modalBody .pk-opt[data-grp="ffaKids"][data-val="eric"]').click();
  const after = on();
  document.getElementById('pickupPlayBtn').click();
  return { start, after, es: SCENARIOS.pickup_game.enemySetup.map(e => `${e.charId}/${e.weapon}/${e.anchor}`), ffa: SCENARIOS.pickup_game.ffa };
});
console.log('  ', JSON.stringify(ff));
check('Hollow 4-way starts on Seth, Sean, Devon; picking Eric swaps out Devon, and Eric takes the third start with his gun',
  ff.start.join() === 'seth,sean,devon' && ff.after.join() === 'seth,sean,eric' && ff.ffa
  && ff.es.join() === 'seth/pistol/a_fort,sean/ak47/b_fort,eric/mp5/scatter_nw', ff);

// With no picks, v1.201 and v1.202's games are as they were
const plain = await page.evaluate(() => [buildPickupScenario({ map: 'winnmark', size: 3, tod: 'day', lives: 3 }).enemySetup.map(e => e.charId).join(),
  buildPickupScenario({ map: 'bunratty', mode: 'ffa', ways: 4, tod: 'day', lives: 3 }).enemySetup.map(e => e.charId).join()]);
check('with no picks the games are v1.201\'s and v1.202\'s', plain[0] === 'seth,trey,brooke,jamie,marcus' && plain[1] === 'sean,nick,ryan', plain);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
