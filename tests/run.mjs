// Run every *.test.mjs in this folder, one browser each, and report. `node tests/run.mjs saves` runs one.
// v1.145: `node tests/run.mjs --shard 2/4` runs the second quarter (CI runs six in parallel jobs since v1.160, backlog B.4);
// `--list` prints the files it would run and stops.
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : (args.splice(i, 2)[1] ?? ''); };
const shardArg = flag('--shard');
const listOnly = args.includes('--list'); if (listOnly) args.splice(args.indexOf('--list'), 1);
const only = args[0];

// Each suite's run time in seconds, so the shards come out even. v1.160 fix-up: re-measured on CI (the shard jobs of
// 875210d, 5 Oct), where the stuck sweeps take 250-455 s and not the 165 s guessed for them.
// v1.174 fix-up: re-measured again from the eight shard jobs of 389b051 (6 Oct). Shard 1/8 hit the 30-min limit while
// the rest took 13-22 min: under-parts (191 s, weighted 65), backyard-guns (174, weighted 80) and stuck-sweep-2 (478,
// weighted 203) had grown, and several sweeps had shrunk.
// v1.235 fix-up: re-measured from the eight shard jobs of af0af1b (15 Oct). Shard 8/8 was cancelled at the 40-min
// limit with all 20 of its suites passing: stuck-sweep-1 (428 s, weighted 243), stuck-sweep-3 (375, weighted 209),
// bellfield (233, weighted 100) and the unlisted fp-hands (361) had landed on it together.
// 20 Oct fix-up: re-measured from the ten shard jobs of d9fcd3f. Shard 6/10 passed all 17 suites but was cancelled
// at 40:01: crew-spawn-bounds (608 s, unlisted so counted as 60) and spawn-facing (428, weighted 252) had landed on it
// with stuck-sweep-3; the other nine took 24-32 min. Every suite is listed again.
// A new suite counts as 60 s until it is listed; a stale number only makes the split a little uneven.
const WEIGHTS = {
  'ai-clock.test.mjs': 71, 'autosave.test.mjs': 36, 'backdrop.test.mjs': 67, 'backyard-guns.test.mjs': 189,
  'backyard-range.test.mjs': 18, 'bb-sweep.test.mjs': 44, 'bed-summer.test.mjs': 8, 'bedroom-bed.test.mjs': 12,
  'bedroom-desk.test.mjs': 18, 'bedroom-settings.test.mjs': 30, 'bedroom-shelves.test.mjs': 14,
  'bellfield.test.mjs': 263, 'bound-forward.test.mjs': 115, 'briefing-lives.test.mjs': 77, 'bulb-sight.test.mjs': 78,
  'bunratty-polish.test.mjs': 94, 'bunratty-road.test.mjs': 70, 'burst-pose.test.mjs': 61, 'calendar.test.mjs': 30,
  'car-side-fire.test.mjs': 29, 'cars.test.mjs': 9, 'clear-guns.test.mjs': 260, 'country-club.test.mjs': 152,
  'cover-fire.test.mjs': 108, 'crew.test.mjs': 67, 'crew-balance.test.mjs': 88, 'crew-field.test.mjs': 89,
  'crew-roster.test.mjs': 27, 'crew-spawn-bounds.test.mjs': 608, 'ctf.test.mjs': 105, 'ctf-clock.test.mjs': 310,
  'damage-report.test.mjs': 41, 'damage-report-first.test.mjs': 42, 'deploy-progress.test.mjs': 72,
  'desk-start.test.mjs': 37, 'fence-bound.test.mjs': 39, 'ffa-starts.test.mjs': 200, 'forfeit-ask.test.mjs': 66,
  'fort-spawn.test.mjs': 71, 'fp-hands.test.mjs': 350, 'front-door.test.mjs': 17, 'gait.test.mjs': 53,
  'gamepad.test.mjs': 23, 'gamepad-screens.test.mjs': 51, 'grip.test.mjs': 21, 'grocery-store.test.mjs': 198,
  'gun-ak.test.mjs': 21, 'gun-ar.test.mjs': 10, 'gun-boltpistol.test.mjs': 16, 'gun-bucket.test.mjs': 8,
  'gun-mac10.test.mjs': 27, 'gun-mp5.test.mjs': 8, 'gun-parts.test.mjs': 9, 'gun-pistol.test.mjs': 8,
  'gun-shotgun.test.mjs': 7, 'gun-sixshooter.test.mjs': 8, 'gun-sniper.test.mjs': 19, 'gun-thunder.test.mjs': 9,
  'gun-ump.test.mjs': 9, 'harness.test.mjs': 55, 'hats.test.mjs': 41, 'high-school.test.mjs': 166,
  'hollow-fort.test.mjs': 28, 'hollow-held.test.mjs': 192, 'house-backs.test.mjs': 39, 'houses.test.mjs': 54,
  'idle-ally.test.mjs': 232, 'jump.test.mjs': 33, 'kid-cells.test.mjs': 68, 'kid-climb.test.mjs': 53,
  'kid-clothes.test.mjs': 43, 'kid-face.test.mjs': 17, 'kid-hands.test.mjs': 16, 'kid-hold.test.mjs': 86,
  'ladder-prompt.test.mjs': 14, 'lamplight-starts.test.mjs': 144, 'laser.test.mjs': 81, 'last-kid.test.mjs': 142,
  'last-saturday.test.mjs': 69, 'last-saturday-lives.test.mjs': 191, 'last-tag-trade.test.mjs': 39,
  'layout-same.test.mjs': 122, 'loadout-gear.test.mjs': 48, 'loadout-kid.test.mjs': 23, 'lot-ffa-opening.test.mjs': 82,
  'lot-hollow-polish.test.mjs': 97, 'map-screen.test.mjs': 35, 'map-table.test.mjs': 8, 'market-lot.test.mjs': 164,
  'mirror.test.mjs': 49, 'music.test.mjs': 7, 'night-lights-allies.test.mjs': 95, 'night-lights-spawn.test.mjs': 76,
  'night-prowl.test.mjs': 31, 'northcliff.test.mjs': 194, 'one-ending.test.mjs': 59, 'online.test.mjs': 117,
  'opening-hold.test.mjs': 87, 'out-shot.test.mjs': 54, 'out-walk-off.test.mjs': 25, 'pad-orders.test.mjs': 30,
  'pause-menu.test.mjs': 49, 'pickup.test.mjs': 117, 'pickup-clock.test.mjs': 88, 'pickup-fernando.test.mjs': 173,
  'pickup-ffa.test.mjs': 111, 'pickup-kids.test.mjs': 46, 'pickup-lives.test.mjs': 64, 'pincer.test.mjs': 38,
  'pocket.test.mjs': 115, 'pointer-lock.test.mjs': 16, 'pool-noodle.test.mjs': 94, 'result-stats.test.mjs': 32,
  'result-text.test.mjs': 28, 'retreat-progress.test.mjs': 219, 'rival.test.mjs': 82, 'road-slide.test.mjs': 106,
  'school-kids.test.mjs': 53, 'sell-back.test.mjs': 51, 'seth-shotgun.test.mjs': 134, 'settings.test.mjs': 31,
  'shard.test.mjs': 2, 'shop-gun-kinds.test.mjs': 45, 'shop-pics.test.mjs': 156, 'shop-tabs.test.mjs': 89,
  'shorts.test.mjs': 53, 'smoke.test.mjs': 48, 'sneakers.test.mjs': 24, 'spawn-facing.test.mjs': 428,
  'squad-hud.test.mjs': 189, 'squad-orders.test.mjs': 206, 'stuck-sweep-1.test.mjs': 485,
  'stuck-sweep-10.test.mjs': 182, 'stuck-sweep-11.test.mjs': 269, 'stuck-sweep-12.test.mjs': 271,
  'stuck-sweep-13.test.mjs': 286, 'stuck-sweep-14.test.mjs': 313, 'stuck-sweep-15.test.mjs': 248,
  'stuck-sweep-16.test.mjs': 469, 'stuck-sweep-2.test.mjs': 430, 'stuck-sweep-3.test.mjs': 365,
  'stuck-sweep-4.test.mjs': 262, 'stuck-sweep-5.test.mjs': 502, 'stuck-sweep-6.test.mjs': 485,
  'stuck-sweep-7.test.mjs': 334, 'stuck-sweep-8.test.mjs': 484, 'stuck-sweep-9.test.mjs': 433, 'taggers.test.mjs': 46,
  'texts.test.mjs': 15, 'tops.test.mjs': 45, 'treehouse.test.mjs': 36, 'treehouse-evan.test.mjs': 30,
  'treehouse-hold.test.mjs': 24, 'treehouse-start.test.mjs': 27, 'under-parts.test.mjs': 250,
  'utility-belt.test.mjs': 17, 'vip.test.mjs': 179, 'vip-spawn.test.mjs': 145, 'voice-situations.test.mjs': 23,
  'voices.test.mjs': 148, 'walk-anim.test.mjs': 26, 'walkie.test.mjs': 45, 'walkie-callouts.test.mjs': 61,
  'wallet.test.mjs': 25, 'weight.test.mjs': 76, 'whole-block.test.mjs': 26, 'wince.test.mjs': 25,
  'winnmark-cars.test.mjs': 49, 'winnmark-fort.test.mjs': 49, 'winnmark-props.test.mjs': 55,
  'winnmark-road.test.mjs': 55, 'winnmark-trees.test.mjs': 50, 'workbench-labels.test.mjs': 20,
  'yard-props.test.mjs': 36
};

function shardOf(files, k, n) {
  // Longest first, each onto the lightest shard so far; ties keep alphabetical order, so every job splits alike.
  const load = Array(n).fill(0), out = Array.from({ length: n }, () => []);
  const sorted = [...files].sort((a, b) => (WEIGHTS[b] ?? 60) - (WEIGHTS[a] ?? 60) || a.localeCompare(b));
  for (const f of sorted) { const i = load.indexOf(Math.min(...load)); out[i].push(f); load[i] += WEIGHTS[f] ?? 60; }
  return out[k - 1].sort();
}

let files = fs.readdirSync(here).filter(f => f.endsWith('.test.mjs') && (!only || f.startsWith(only))).sort();
if (shardArg !== null) {
  const m = /^(\d+)\/(\d+)$/.exec(shardArg);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error('usage: run.mjs [prefix] [--shard k/n] [--list]'); process.exit(2); }
  files = shardOf(files, +m[1], +m[2]);
}
if (listOnly) { console.log(files.join('\n')); process.exit(0); }
let failed = 0;
for (const f of files) {
  console.log(`\n== ${f} ==`);
  const r = spawnSync('node', [path.join(here, f)], { stdio: 'inherit', timeout: 600000 });
  if (r.status !== 0) failed++;
}
console.log(`\n${files.length - failed}/${files.length} suites passed`);
process.exit(failed ? 1 : 0);
