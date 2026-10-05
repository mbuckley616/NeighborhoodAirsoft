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
// A new suite counts as 60 s until it is listed; a stale number only makes the split a little uneven.
const WEIGHTS = {
  'bb-sweep.test.mjs': 30, 'bunratty-polish.test.mjs': 89, 'bunratty-road.test.mjs': 69, 'burst-pose.test.mjs': 47,
  'car-side-fire.test.mjs': 26, 'cars.test.mjs': 5, 'country-club.test.mjs': 139, 'cover-fire.test.mjs': 111,
  'fence-bound.test.mjs': 39, 'fort-spawn.test.mjs': 77, 'front-door.test.mjs': 26, 'grip.test.mjs': 20,
  'grocery-store.test.mjs': 139, 'harness.test.mjs': 37, 'high-school.test.mjs': 120, 'hollow-held.test.mjs': 85,
  'houses.test.mjs': 54, 'jump.test.mjs': 27, 'kid-climb.test.mjs': 44, 'kid-clothes.test.mjs': 43,
  'kid-face.test.mjs': 14, 'kid-hands.test.mjs': 8, 'ladder-prompt.test.mjs': 12, 'laser.test.mjs': 72,
  'last-kid.test.mjs': 160, 'loadout-gear.test.mjs': 34, 'loadout-kid.test.mjs': 9, 'lot-ffa-opening.test.mjs': 89,
  'lot-hollow-polish.test.mjs': 87, 'map-screen.test.mjs': 33, 'market-lot.test.mjs': 159, 'mirror.test.mjs': 48,
  'music.test.mjs': 3, 'night-prowl.test.mjs': 30, 'northcliff.test.mjs': 168, 'one-ending.test.mjs': 53,
  'opening-hold.test.mjs': 109, 'pincer.test.mjs': 36, 'pocket.test.mjs': 28, 'result-text.test.mjs': 95,
  'road-slide.test.mjs': 104, 'shard.test.mjs': 1, 'shop-tabs.test.mjs': 39, 'smoke.test.mjs': 43,
  'spawn-facing.test.mjs': 304, 'stuck-sweep-1.test.mjs': 411, 'stuck-sweep-2.test.mjs': 302,
  'stuck-sweep-3.test.mjs': 256, 'stuck-sweep-4.test.mjs': 252, 'stuck-sweep-5.test.mjs': 316,
  'stuck-sweep-6.test.mjs': 305, 'stuck-sweep-7.test.mjs': 275, 'stuck-sweep-8.test.mjs': 455,
  'taggers.test.mjs': 72, 'treehouse-hold.test.mjs': 22, 'treehouse.test.mjs': 47, 'utility-belt.test.mjs': 6,
  'walk-anim.test.mjs': 30, 'walkie.test.mjs': 35, 'whole-block.test.mjs': 26, 'winnmark-cars.test.mjs': 58,
  'winnmark-fort.test.mjs': 55, 'winnmark-props.test.mjs': 46, 'winnmark-road.test.mjs': 53,
  'winnmark-trees.test.mjs': 60
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
