// v1.145 (backlog B.4): CI splits the suites across parallel jobs with `run.mjs --shard k/n`. Every suite must land in
// exactly one shard, for any n, and the split must not depend on anything but the file list. No browser.
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const all = fs.readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort();
const list = a => { const r = spawnSync('node', [path.join(here, 'run.mjs'), ...a, '--list'], { encoding: 'utf8' });
  return { status: r.status, files: r.stdout.split('\n').filter(Boolean) }; };
let fails = 0; const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };

check(list([]).files.join() === all.join(), `no shard lists all ${all.length} suites`);
// 19 Oct 2026: CI takes its shard count from tests/lib/select.mjs (FULL_SHARDS for every suite, fewer for a PR's selection)
const { FULL_SHARDS: ci } = await import('./lib/select.mjs');
const yml = fs.readFileSync(path.join(here, '..', '.github', 'workflows', 'check.yml'), 'utf8');
check(ci >= 2 && yml.includes('--shard ${{ matrix.shard }}/${{ needs.plan.outputs.n }}'), `check.yml runs every suite in ${ci} shards, a PR's selection in as many as it needs`);
for (const n of [1, 2, 3, ci || 4, 7]) {
  const parts = Array.from({ length: n }, (_, i) => list(['--shard', `${i + 1}/${n}`]).files);
  const flat = parts.flat().sort();
  const dupes = flat.filter((f, i) => flat[i - 1] === f);
  check(flat.join() === all.join() && !dupes.length, `${n} shards cover every suite once (${parts.map(p => p.length).join('+')})`);
  check(parts.every(p => p.length >= 1) || all.length < n, `${n} shards: none empty`);
}
const W = Object.fromEntries([...fs.readFileSync(path.join(here, 'run.mjs'), 'utf8').matchAll(/'(\S+\.test\.mjs)': (\d+)/g)].map(m => [m[1], +m[2]]));
const unlisted = all.filter(f => !(f in W));
check(true, `suites without a measured time (counted as 60 s): ${unlisted.join(', ') || 'none'}`);
const loads = Array.from({ length: ci || 4 }, (_, i) => list(['--shard', `${i + 1}/${ci || 4}`]).files.reduce((t, f) => t + (W[f] ?? 60), 0));
check(Math.max(...loads) <= 1.25 * Math.min(...loads), `the ${ci || 4} CI shards are even: ${loads.join(', ')} s`);
check(list(['--shard', '2/4']).files.join() === list(['--shard', '2/4']).files.join(), 'the same shard twice lists the same suites');
check(list(['--shard', '5/4']).status === 2 && list(['--shard', 'x']).status === 2, 'a bad --shard is refused');
const sm = list(['smoke', '--shard', '1/1']).files;
check(sm.length === 1 && sm[0] === 'smoke.test.mjs', 'a prefix still picks one suite');
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
