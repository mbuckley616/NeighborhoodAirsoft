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
// A new suite counts as 60 s until it is listed; a stale number only makes the split a little uneven.
const WEIGHTS = {
  'ai-clock.test.mjs': 59, 'autosave.test.mjs': 31, 'backyard-guns.test.mjs': 105, 'backyard-range.test.mjs': 40, 'bb-sweep.test.mjs': 36,
  'bed-summer.test.mjs': 9, 'bedroom-bed.test.mjs': 12, 'bedroom-desk.test.mjs': 9, 'bedroom-shelves.test.mjs': 9,
  'bedroom-settings.test.mjs': 15, 'bellfield.test.mjs': 233, 'bound-forward.test.mjs': 53, 'briefing-lives.test.mjs': 57, 'bulb-sight.test.mjs': 74,
  'bunratty-polish.test.mjs': 81, 'bunratty-road.test.mjs': 78, 'burst-pose.test.mjs': 40, 'calendar.test.mjs': 30,
  'car-side-fire.test.mjs': 22, 'cars.test.mjs': 11, 'clear-guns.test.mjs': 276, 'country-club.test.mjs': 151,
  'cover-fire.test.mjs': 112, 'crew.test.mjs': 44, 'ctf.test.mjs': 118, 'ctf-clock.test.mjs': 231,
  'damage-report.test.mjs': 34, 'damage-report-first.test.mjs': 27, 'desk-start.test.mjs': 22,
  'fence-bound.test.mjs': 31, 'forfeit-ask.test.mjs': 66, 'fort-spawn.test.mjs': 69, 'fp-hands.test.mjs': 361,
  'front-door.test.mjs': 10, 'gait.test.mjs': 51, 'gamepad.test.mjs': 31, 'gamepad-screens.test.mjs': 44,
  'grip.test.mjs': 18, 'grocery-store.test.mjs': 189, 'gun-ak.test.mjs': 25, 'gun-ar.test.mjs': 7,
  'gun-boltpistol.test.mjs': 4, 'gun-bucket.test.mjs': 5, 'gun-mac10.test.mjs': 24, 'gun-mp5.test.mjs': 9,
  'gun-parts.test.mjs': 8, 'gun-pistol.test.mjs': 9, 'gun-shotgun.test.mjs': 8, 'gun-sixshooter.test.mjs': 8,
  'gun-sniper.test.mjs': 16, 'gun-thunder.test.mjs': 5, 'gun-ump.test.mjs': 9, 'harness.test.mjs': 37,
  'hats.test.mjs': 40, 'high-school.test.mjs': 152, 'hollow-held.test.mjs': 108, 'house-backs.test.mjs': 41,
  'houses.test.mjs': 34, 'idle-ally.test.mjs': 239, 'jump.test.mjs': 41, 'kid-climb.test.mjs': 51,
  'kid-clothes.test.mjs': 48, 'kid-face.test.mjs': 13, 'kid-hands.test.mjs': 10, 'kid-hold.test.mjs': 56,
  'ladder-prompt.test.mjs': 13, 'laser.test.mjs': 51, 'last-kid.test.mjs': 161, 'last-saturday.test.mjs': 52,
  'last-saturday-lives.test.mjs': 168, 'loadout-gear.test.mjs': 51, 'loadout-kid.test.mjs': 22,
  'lot-ffa-opening.test.mjs': 73, 'lot-hollow-polish.test.mjs': 95, 'map-screen.test.mjs': 19,
  'market-lot.test.mjs': 89, 'mirror.test.mjs': 36, 'music.test.mjs': 4, 'night-lights-allies.test.mjs': 79,
  'night-lights-spawn.test.mjs': 43, 'night-prowl.test.mjs': 22, 'northcliff.test.mjs': 149,
  'online.test.mjs': 210, 'one-ending.test.mjs': 48, 'opening-hold.test.mjs': 101, 'out-shot.test.mjs': 39, 'pad-orders.test.mjs': 40, 'pause-menu.test.mjs': 32,
  'pickup.test.mjs': 158, 'pickup-clock.test.mjs': 117, 'pickup-fernando.test.mjs': 128, 'pickup-ffa.test.mjs': 105,
  'pickup-kids.test.mjs': 44, 'pickup-lives.test.mjs': 75, 'pincer.test.mjs': 40, 'pocket.test.mjs': 22,
  'pointer-lock.test.mjs': 16, 'pool-noodle.test.mjs': 48, 'result-stats.test.mjs': 36, 'result-text.test.mjs': 64,
  'retreat-progress.test.mjs': 164, 'rival.test.mjs': 52, 'road-slide.test.mjs': 81, 'school-kids.test.mjs': 32,
  'seth-shotgun.test.mjs': 114, 'settings.test.mjs': 33, 'shard.test.mjs': 1, 'shop-gun-kinds.test.mjs': 46,
  'shop-pics.test.mjs': 106, 'shop-tabs.test.mjs': 55, 'shorts.test.mjs': 49, 'smoke.test.mjs': 38,
  'sneakers.test.mjs': 25, 'spawn-facing.test.mjs': 252, 'squad-hud.test.mjs': 240, 'squad-orders.test.mjs': 122, 'stuck-sweep-1.test.mjs': 429,
  'stuck-sweep-10.test.mjs': 202, 'stuck-sweep-11.test.mjs': 193, 'stuck-sweep-12.test.mjs': 263,
  'stuck-sweep-13.test.mjs': 158, 'stuck-sweep-14.test.mjs': 319, 'stuck-sweep-15.test.mjs': 270,
  'stuck-sweep-16.test.mjs': 430, 'stuck-sweep-2.test.mjs': 235, 'stuck-sweep-3.test.mjs': 376,
  'stuck-sweep-4.test.mjs': 291, 'stuck-sweep-5.test.mjs': 486, 'stuck-sweep-6.test.mjs': 349,
  'stuck-sweep-7.test.mjs': 232, 'stuck-sweep-8.test.mjs': 410, 'stuck-sweep-9.test.mjs': 425,
  'taggers.test.mjs': 40, 'texts.test.mjs': 15, 'tops.test.mjs': 29, 'treehouse.test.mjs': 40,
  'treehouse-evan.test.mjs': 23, 'treehouse-hold.test.mjs': 22, 'treehouse-start.test.mjs': 38,
  'under-parts.test.mjs': 267, 'utility-belt.test.mjs': 16, 'vip.test.mjs': 128, 'vip-spawn.test.mjs': 102,
  'voice-situations.test.mjs': 30, 'walk-anim.test.mjs': 24, 'walkie.test.mjs': 39, 'weight.test.mjs': 67, 'whole-block.test.mjs': 17,
  'winnmark-cars.test.mjs': 47, 'winnmark-fort.test.mjs': 23, 'winnmark-props.test.mjs': 35,
  'winnmark-road.test.mjs': 53, 'winnmark-trees.test.mjs': 52, 'workbench-labels.test.mjs': 22,
  'yard-props.test.mjs': 38
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
