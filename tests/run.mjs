// Run every *.test.mjs in this folder, one browser each, and report. `node tests/run.mjs saves` runs one.
// v1.145: `node tests/run.mjs --shard 2/4` runs the second quarter (CI runs the four in parallel jobs, backlog B.4);
// `--list` prints the files it would run and stops.
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : (args.splice(i, 2)[1] ?? ''); };
const shardArg = flag('--shard');
const listOnly = args.includes('--list'); if (listOnly) args.splice(args.indexOf('--list'), 1);
const only = args[0];

// Each suite's run time in seconds (a cloud container, three at a time, v1.145), so the shards come out even.
// A new suite counts as 60 s until it is listed; a stale number only makes the split a little uneven.
const WEIGHTS = {
  'bb-sweep.test.mjs': 45, 'bunratty-polish.test.mjs': 56, 'bunratty-road.test.mjs': 79, 'burst-pose.test.mjs': 35,
  'car-side-fire.test.mjs': 26, 'cars.test.mjs': 11, 'country-club.test.mjs': 60, 'cover-fire.test.mjs': 58, 'fence-bound.test.mjs': 30, 'fort-spawn.test.mjs': 72,
  'front-door.test.mjs': 16, 'grip.test.mjs': 28, 'grocery-store.test.mjs': 70, 'harness.test.mjs': 57, 'high-school.test.mjs': 200, 'hollow-held.test.mjs': 55,
  'houses.test.mjs': 57, 'jump.test.mjs': 28, 'kid-climb.test.mjs': 41, 'last-kid.test.mjs': 70, 'kid-clothes.test.mjs': 41,
  'kid-face.test.mjs': 17, 'kid-hands.test.mjs': 16, 'ladder-prompt.test.mjs': 24, 'laser.test.mjs': 50,
  'loadout-gear.test.mjs': 56, 'loadout-kid.test.mjs': 23, 'lot-ffa-opening.test.mjs': 63,
  'lot-hollow-polish.test.mjs': 46, 'map-screen.test.mjs': 25, 'market-lot.test.mjs': 76, 'mirror.test.mjs': 46, 'music.test.mjs': 21,
  'night-prowl.test.mjs': 25, 'northcliff.test.mjs': 99, 'one-ending.test.mjs': 55, 'opening-hold.test.mjs': 93,
  'pincer.test.mjs': 37, 'pocket.test.mjs': 17, 'result-text.test.mjs': 204, 'road-slide.test.mjs': 78,
  'shard.test.mjs': 1, 'shop-tabs.test.mjs': 26, 'smoke.test.mjs': 20, 'spawn-facing.test.mjs': 273,
  'stuck-sweep-1.test.mjs': 165, 'stuck-sweep-2.test.mjs': 165, 'stuck-sweep-3.test.mjs': 165, 'stuck-sweep-4.test.mjs': 165,
  'stuck-sweep-5.test.mjs': 165, 'stuck-sweep-6.test.mjs': 165, 'stuck-sweep-7.test.mjs': 165, 'stuck-sweep-8.test.mjs': 165,
  'taggers.test.mjs': 24, 'treehouse-hold.test.mjs': 21, 'treehouse.test.mjs': 34, 'utility-belt.test.mjs': 21,
  'walk-anim.test.mjs': 30, 'walkie.test.mjs': 25, 'whole-block.test.mjs': 24, 'winnmark-cars.test.mjs': 38, 'winnmark-fort.test.mjs': 47,
  'winnmark-props.test.mjs': 38, 'winnmark-road.test.mjs': 35, 'winnmark-trees.test.mjs': 40
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
