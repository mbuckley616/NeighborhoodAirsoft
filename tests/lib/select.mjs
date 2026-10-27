// Which suites a CI run takes. 20 Oct 2026 (Michael in chat, for every game: "We don't need bulletproof testing in this manner.
// Why can't we just have basic tests?"): a pull request runs the smoke set and any suite it adds or changes, nothing more; every
// suite runs once a week (check.yml's schedule) or when check is run by hand. It replaces 19 Oct's selection by the names a
// change reaches with a full run on main after each merge (175 suites, about 300 minutes, in ten shards).
//   node tests/lib/select.mjs --base=SHA [--head=SHA] [--github-output]   prints {mode, n, shards, suites, reason}
//   node tests/lib/select.mjs --full [--github-output]                     every suite (the weekly run, a manual run)
// Game code is everything that is not docs: index.html and, since the split (v1.354, D.75), the js/ files it loads.
// mode 'none': only docs changed (docs/, or a .md file such as devlog.md or CLAUDE.md), no suite runs. 'some': the suites
// below. 'full': everything, in run.mjs's ten shards.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..', '..');
export const SMOKE = ['smoke', 'autosave', 'map-screen', 'pause-menu'];
const DOCS = f => f.startsWith('docs/') || (f.endsWith('.md') && !f.startsWith('.github/') && !f.startsWith('tests/'));
// the weekly run's ten shards take about 24 minutes of suites each (40-minute job limit, installs of 3-11 minutes); a pull
// request's few suites go in short shards so it reports in minutes
export const FULL_SHARDS = 10; const SOME_SHARD_SECS = 6 * 60;

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
// files are read at `head` (HEAD on CI), so the selector can be measured against any past branch without checking it out
const show = (head, f) => git('show', `${head}:${f}`);
const suiteNames = head => git('ls-tree', '--name-only', `${head}:tests`).split('\n').filter(f => f.endsWith('.test.mjs')).map(f => f.slice(0, -9)).sort();

// run.mjs's table of seconds, read from its text so the two never drift apart
function loadSecs(head) {
  const t = show(head, 'tests/run.mjs'), i = t.indexOf('const WEIGHTS = {'), j = t.indexOf('};', i), out = {};
  for (const m of t.slice(i, j).matchAll(/'([\w-]+)\.test\.mjs': (\d+)/g)) out[m[1]] = +m[2];
  return out;
}

export function selectSuites({ base, head = 'HEAD', full = false } = {}) {
  const all = suiteNames(head), secs = loadSecs(head);
  const cost = list => list.reduce((t, s) => t + (secs[s] || 60), 0);
  const pack = (mode, suites, reason) => {
    const n = mode === 'none' ? 0 : mode === 'full' ? FULL_SHARDS : Math.max(1, Math.min(FULL_SHARDS, Math.ceil(cost(suites) / SOME_SHARD_SECS)));
    return { mode, n, shards: Array.from({ length: n }, (_, i) => i + 1), suites, minutes: Math.round(cost(suites) / 60), reason };
  };
  if (full || !base) return pack('full', all, full ? 'asked for every suite' : 'no base to compare with');
  const changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean);
  if (changed.length && changed.every(DOCS)) return pack('none', [], 'only docs changed');
  const picked = new Set(SMOKE.filter(s => all.includes(s)));
  for (const f of changed) { const m = /^tests\/([^/]+)\.test\.mjs$/.exec(f); if (m && all.includes(m[1])) picked.add(m[1]); }
  const suites = all.filter(s => picked.has(s)), extra = suites.length - SMOKE.filter(s => all.includes(s)).length;
  return pack('some', suites, `the smoke set${extra ? ` and ${extra} suite${extra > 1 ? 's' : ''} the change adds or edits` : ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
  const r = selectSuites({ base: arg('base'), head: arg('head') || 'HEAD', full: process.argv.includes('--full') });
  console.log(JSON.stringify({ ...r, suites: r.mode === 'full' ? `(all ${r.suites.length})` : r.suites }, null, 1));
  if (process.argv.includes('--github-output') && process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${r.mode}\nn=${r.n}\nshards=${JSON.stringify(r.shards)}\n`);
}
