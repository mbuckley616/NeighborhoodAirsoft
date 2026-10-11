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
// A new suite counts as 60 s until it is listed; a stale number only makes the split a little uneven.
const WEIGHTS = {
  'backyard-guns.test.mjs': 174, 'bb-sweep.test.mjs': 19, 'bound-forward.test.mjs': 57,
  'bunratty-polish.test.mjs': 60, 'bunratty-road.test.mjs': 47, 'burst-pose.test.mjs': 45,
  'car-side-fire.test.mjs': 24, 'cars.test.mjs': 3, 'country-club.test.mjs': 155, 'cover-fire.test.mjs': 62,
  'desk-start.test.mjs': 15, 'fence-bound.test.mjs': 44, 'fort-spawn.test.mjs': 42, 'front-door.test.mjs': 18,
  'gait.test.mjs': 37, 'grip.test.mjs': 23, 'grocery-store.test.mjs': 182, 'harness.test.mjs': 26, 'bellfield.test.mjs': 100,
  'high-school.test.mjs': 147, 'hollow-held.test.mjs': 101, 'houses.test.mjs': 30, 'jump.test.mjs': 17,
  'kid-climb.test.mjs': 54, 'kid-clothes.test.mjs': 53, 'kid-face.test.mjs': 6, 'kid-hands.test.mjs': 6,
  'kid-hold.test.mjs': 71, 'ladder-prompt.test.mjs': 6, 'laser.test.mjs': 44, 'last-kid.test.mjs': 144,
  'loadout-gear.test.mjs': 17, 'loadout-kid.test.mjs': 7, 'lot-ffa-opening.test.mjs': 52,
  'lot-hollow-polish.test.mjs': 105, 'map-screen.test.mjs': 15, 'market-lot.test.mjs': 83, 'mirror.test.mjs': 46,
  'music.test.mjs': 3, 'night-lights-allies.test.mjs': 50, 'night-lights-spawn.test.mjs': 40, 'night-prowl.test.mjs': 32, 'northcliff.test.mjs': 110, 'one-ending.test.mjs': 33,
  'opening-hold.test.mjs': 45, 'pincer.test.mjs': 34, 'pocket.test.mjs': 28, 'pointer-lock.test.mjs': 11,
  'result-text.test.mjs': 109, 'retreat-progress.test.mjs': 175, 'road-slide.test.mjs': 58, 'shard.test.mjs': 1,
  'shop-tabs.test.mjs': 44, 'smoke.test.mjs': 57, 'spawn-facing.test.mjs': 333, 'stuck-sweep-1.test.mjs': 243,
  'stuck-sweep-10.test.mjs': 195, 'stuck-sweep-11.test.mjs': 264, 'stuck-sweep-12.test.mjs': 161,
  'stuck-sweep-13.test.mjs': 138, 'stuck-sweep-14.test.mjs': 192, 'stuck-sweep-15.test.mjs': 333,
  'stuck-sweep-16.test.mjs': 522, 'stuck-sweep-2.test.mjs': 478, 'stuck-sweep-3.test.mjs': 209,
  'stuck-sweep-4.test.mjs': 129, 'stuck-sweep-5.test.mjs': 414, 'stuck-sweep-6.test.mjs': 172,
  'stuck-sweep-7.test.mjs': 161, 'stuck-sweep-8.test.mjs': 206, 'stuck-sweep-9.test.mjs': 394,
  'taggers.test.mjs': 46, 'treehouse-evan.test.mjs': 15, 'treehouse-hold.test.mjs': 21, 'treehouse.test.mjs': 45,
  'under-parts.test.mjs': 191, 'utility-belt.test.mjs': 4, 'vip.test.mjs': 139, 'walk-anim.test.mjs': 14,
  'walkie.test.mjs': 29, 'whole-block.test.mjs': 15, 'winnmark-cars.test.mjs': 51, 'winnmark-fort.test.mjs': 43,
  'winnmark-props.test.mjs': 47, 'winnmark-road.test.mjs': 26, 'winnmark-trees.test.mjs': 46
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
