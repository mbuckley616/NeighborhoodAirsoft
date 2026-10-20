// v1.253 (backlog B.9, Michael 16 Oct): the squad order's box sat under the roster at a fixed 210 px, and the roster
// grows a row per player, so in the big battles (9-11 players, the roster 245-285 px tall) the order was drawn over the
// names, and in every 4v4 it sat 5 px under it. It now sits top-left. Checked: in the fullest matches and every map's
// biggest team match, with the walkie's answer showing (the box at its widest), the order's box touches no other panel
// on screen, at 1280×720 and at a small 1024×576 window, and in a Pickup Game 4v4.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const PANELS = ['rosterHud', 'timerHud', 'loadoutHud', 'stanceHud', 'healthHud', 'ammoHud', 'staminaHud', 'tutorialHud', 'interactPrompt', 'crosshair'];
const measure = () => page.evaluate((PANELS) => {
  for (let i = 0; i < 30; i++) stepGame(1 / 60);
  if (!squadMates().length) return null;
  const S = Game.scenario, mate = squadMates()[0];
  // the longest line a teammate says, so the box is at its widest
  S.squadReply = { name: mate.name, line: 'Copy, keeping our distance, I’ll hang back with you', until: (S.roundTime || 0) + 5 };
  updateSquadHud();
  const box = id => { const el = document.getElementById(id); if (!el || getComputedStyle(el).display === 'none') return null;
    const b = el.getBoundingClientRect(); return b.width && b.height ? [b.left, b.top, b.right, b.bottom].map(Math.round) : null; };
  const sq = box('squadHud'), hits = [];
  for (const id of PANELS) { const b = box(id); if (sq && b && b[0] < sq[2] && b[2] > sq[0] && b[1] < sq[3] && b[3] > sq[1]) hits.push(id); }
  return { sq, hits, roster: box('rosterHud'), players: S.enemies.length + 1 };
}, PANELS);

// The box's place is fixed, so what varies is the roster's height and which panels a match shows: at 1280×720 the
// five fullest matches (9-12 players), every map's biggest team match, a timer (the CTF) and both VIP matches; at
// 1024×576 the fullest and the timer. (Every match with teammates, 31, passed alike on v1.253, but took 8.5 min on CI.)
const BIG = ['last_saturday', 'hollow_big_battle', 'hollow_night_battle', 'hollow_full_auto_mayhem', 'winnmark_team_3v3',
  'bunratty_team_4v4', 'lot_night_4v4', 'northcliff_night_4v4', 'bellfield_ctf', 'school_night_4v4', 'club_night_4v4',
  'store_night_4v4', 'bunratty_vip', 'lot_vip_night'];
const SMALL = ['last_saturday', 'hollow_big_battle', 'bellfield_ctf', 'bunratty_vip'];
for (const [w, h, list] of [[1280, 720, BIG], [1024, 576, SMALL]]) {
  await page.setViewportSize({ width: w, height: h });
  const bad = [], seen = [];
  let tallest = null;
  for (const id of list) {
    await g.scenario(id);
    const r = await measure();
    if (!r) continue;
    seen.push(id);
    if (!r.sq || r.hits.length) bad.push([id, r.sq, r.hits]);
    if (r.roster && (!tallest || r.roster[3] > tallest[1][3])) tallest = [id, r.roster, r.players];
  }
  console.log(`   ${w}×${h}: ${seen.length} matches with teammates; tallest roster ${JSON.stringify(tallest)}`);
  check(`${w}×${h}: in each of ${list.length} matches the order's box shows and touches no other panel`, seen.length === list.length && !bad.length, bad.slice(0, 6));
}
await page.setViewportSize({ width: 1280, height: 720 });

// a Pickup Game 4v4 on Bunratty: eight on the field
const pk = await page.evaluate(() => {
  for (const z of ZONE_LADDER.slice(0, 2)) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  enterBedroom(); openPickupBoard();
  const click = (grp, val) => document.querySelector(`#modalBody .pk-opt[data-grp="${grp}"][data-val="${val}"]`).click();
  click('map', 'bunratty'); click('size', 4);
  document.getElementById('pickupPlayBtn').click();
  return Game.mode;
});
await page.waitForFunction(() => { const x = document.getElementById('introBeginBtn'); return x && x.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
await page.evaluate(() => { Game.mouse.locked = true; });
const pr = await measure();
console.log('   pickup 4v4:', JSON.stringify(pr));
check('a Pickup Game 4v4: the order clears the roster', pk === 'scenario_intro' && pr && pr.sq && !pr.hits.length, [pk, pr]);
await g.shot('squad-hud-pickup-4v4');
await g.close();
