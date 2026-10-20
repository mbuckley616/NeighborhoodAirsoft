// Which suites a pull request runs (ported from The Old Gates' pipeline, Michael in chat, 19 Oct 2026). Main runs every suite
// after each merge; a pull request runs the suites its change can reach, plus a short smoke set, so a small PR is one or two
// shards, not ten.
//   node tests/lib/select.mjs --base=SHA [--head=SHA] [--github-output]   prints {mode, n, shards, suites, reason}
//   node tests/lib/select.mjs --full [--github-output]                     every suite (pushes to main, a manual run)
// mode 'none': only docs changed (docs/, or a .md file such as devlog.md or CLAUDE.md), no suite runs. 'some': the suites
// below. 'full': everything, in run.mjs's ten shards.
// How a change reaches a suite: the game is index.html's one inline script. Each changed line of it sits inside one top-level
// statement (a function, a const, or a statement like `window.x = …`), named by tests/lib/toplevel.cjs; a line inside a big
// object-literal const counts as that const's key (a change to one SCENARIOS entry names its scenario id, a GUN_SPECS entry
// its gun). Those names, and every top-level statement that names one of them (one step of callers, skipped for a hub with
// more than twelve, and leaving out a caller that over a quarter of the suites name, such as stepGame), are the change's names. Blank and comment-only lines reach nothing. A suite runs when its file names one
// of them, when the suite itself changed, or when it is in SMOKE. A change to the page outside the script (its markup and
// style), to the harness (tests/lib/, run.mjs, the vendored three.js), CI, packages or parsecheck runs everything, and so does
// a selection that would cost over half of the full suite's time. The version label's line, and new lines in run.mjs's table
// of suite times, count for nothing.
// A break this misses is caught by main's full run after the merge.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..', '..');
export const SMOKE = ['smoke', 'autosave', 'map-screen', 'pause-menu'];
const FULL = [/^tests\/lib\//, /^tests\/run\.mjs$/, /^tests\/vendor\//, /^\.github\//, /^package(-lock)?\.json$/, /^scripts\/parsecheck\.mjs$/];
const DOCS = f => f.startsWith('docs/') || (f.endsWith('.md') && !f.startsWith('.github/') && !f.startsWith('tests/'));
// run.mjs's ten shards take about 24 minutes of suites each (40-minute job limit, installs of 3-11 minutes)
export const FULL_SHARDS = 10; const SHARD_SECS = 24 * 60, CALLER_CAP = 12, DRIVER_SHARE = 4;
const IDENT = /[A-Za-z_$][\w$]*/g;
// run.mjs's table of suite times: every new suite adds its line there, which is not a change to the harness
const WEIGHTS_ONLY = l => /^[-+]\s*('[\w-]+\.test\.mjs': \d+,?\s*)+$/.test(l);
const TRIVIAL = l => { const t = l.slice(1).trim(); return !t || t.startsWith('//') || /^<div class="version">v\d+\.\d+<\/div>$/.test(t); };

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
// files are read at `head` (HEAD on CI), so the selector can be measured against any past branch without checking it out
const show = (head, f) => git('show', `${head}:${f}`);
// many files at `head` in one git call
function readAll(head, files) {
  const out = execFileSync('git', ['cat-file', '--batch'], { cwd: root, input: files.map(f => `${head}:${f}\n`).join(''), maxBuffer: 1 << 29 });
  const texts = []; let i = 0;
  for (const f of files) {
    const eol = out.indexOf(10, i), hdr = out.toString('utf8', i, eol).split(' ');
    if (hdr[1] === 'missing') { texts.push(''); i = eol + 1; continue; }
    const size = +hdr[2]; texts.push(out.toString('utf8', eol + 1, eol + 1 + size)); i = eol + 1 + size + 1;
  }
  return texts;
}
const suiteNames = head => git('ls-tree', '--name-only', `${head}:tests`).split('\n').filter(f => f.endsWith('.test.mjs')).map(f => f.slice(0, -9)).sort();

// index.html's script statements, from tests/lib/toplevel.cjs (Node's own acorn)
function topLevel(html) {
  const out = execFileSync(process.execPath, ['--expose-internals', '--no-warnings', path.join(here, 'toplevel.cjs')],
    { cwd: root, input: html, encoding: 'utf8', maxBuffer: 1 << 29 });
  return JSON.parse(out);
}

// the new-side line numbers of index.html a change touched, leaving out blank and comment-only lines (a deletion counts at
// the line it sat before)
function touched(base, head) {
  const diff = git('diff', '-U0', '--no-color', `${base}...${head}`, '--', 'index.html'), at = [];
  let n = 0, start = 0;
  for (const l of diff.split('\n')) {
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h) { n = start = Math.max(1, +h[1]); continue; }
    if (l.startsWith('+++') || l.startsWith('---') || !start) continue;
    if (l.startsWith('+')) { if (!TRIVIAL(l)) at.push(n); n++; }
    else if (l.startsWith('-') && !TRIVIAL(l)) at.push(start);
  }
  return [...new Set(at)];
}

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
    const n = mode === 'none' ? 0 : mode === 'full' ? FULL_SHARDS : Math.max(1, Math.min(FULL_SHARDS, Math.ceil(cost(suites) / SHARD_SECS)));
    return { mode, n, shards: Array.from({ length: n }, (_, i) => i + 1), suites, minutes: Math.round(cost(suites) / 60), reason };
  };
  if (full || !base) return pack('full', all, full ? 'asked for every suite' : 'no base to compare with');
  const changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean);
  if (!changed.length) return pack('some', SMOKE.filter(s => all.includes(s)), 'nothing changed: the smoke set');
  if (changed.every(DOCS)) return pack('none', [], 'only docs changed');
  const edits = f => git('diff', '-U0', '--no-color', `${base}...${head}`, '--', f).split('\n').filter(l => /^[-+](?![-+])/.test(l));
  const big = changed.find(f => FULL.some(r => r.test(f)) && !(f === 'tests/run.mjs' && edits(f).every(l => TRIVIAL(l) || WEIGHTS_ONLY(l))));
  if (big) return pack('full', all, `${big} changed`);

  // the names the change touches in the script, and one step of their callers (a name with more than CALLER_CAP callers is a
  // hub: its callers would reach most suites, so only the name itself counts)
  const words = readAll(head, all.map(s => `tests/${s}.test.mjs`)).map(t => new Set(t.match(IDENT) || []));
  const named = n => words.filter(w => w.has(n)).length;
  const names = new Set(), direct = [], keys = new Set();
  if (changed.includes('index.html')) {
    const { scripts, rows } = topLevel(show(head, 'index.html'));
    for (const n of touched(base, head)) {
      if (!scripts.some(s => n >= s.line && n <= s.endLine)) return pack('full', all, `index.html's page outside the script changed (line ${n})`);
      const r = rows.find(r => n >= r.line && n <= r.endLine); if (!r || !r.name) continue;
      const p = r.props && r.props.find(p => n >= p.line && n <= p.endLine);
      names.add(p ? p.name : r.name); if (p) keys.add(p.name);
    }
    direct.push(...names);
    // callers are looked for among the statements, and among the keys of a split const (not the const as a whole)
    const units = rows.flatMap(r => r.props || [r]);
    for (const d of direct) {
      const callers = [...new Set(units.filter(u => u.name && u.name !== d && u.ids.includes(d)).map(u => u.name))];
      // a caller most suites name is how they drive the game (stepGame: 99 of 170 call it to move the clock), not what they
      // test, so it does not count as a caller; a change to it directly still does
      if (callers.length <= CALLER_CAP) callers.filter(c => named(c) <= all.length / DRIVER_SHARE).forEach(c => names.add(c));
    }
  }
  // two-letter names count only as an object's key (the 'ak' and 'ar' guns); otherwise three letters or more
  const usable = new Set([...names].filter(n => n.length >= 3 || (n.length === 2 && keys.has(n))));

  const picked = new Set(SMOKE.filter(s => all.includes(s)));
  for (const f of changed) { const m = /^tests\/([^/]+)\.test\.mjs$/.exec(f); if (m && all.includes(m[1])) picked.add(m[1]); }
  if (usable.size) for (const s of all) {
    for (const id of words[all.indexOf(s)]) if (usable.has(id)) { picked.add(s); break; }
  }
  const suites = all.filter(s => picked.has(s));
  if (cost(suites) > cost(all) / 2) return pack('full', all, `the change reaches ${suites.length} of ${all.length} suites`);
  return pack('some', suites, `${direct.length} names changed (${direct.slice(0, 8).join(', ')}${direct.length > 8 ? ', …' : ''}), ${usable.size} with their callers; ${suites.length} suites`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
  const r = selectSuites({ base: arg('base'), head: arg('head') || 'HEAD', full: process.argv.includes('--full') });
  console.log(JSON.stringify({ ...r, suites: r.mode === 'full' ? `(all ${r.suites.length})` : r.suites }, null, 1));
  if (process.argv.includes('--github-output') && process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${r.mode}\nn=${r.n}\nshards=${JSON.stringify(r.shards)}\n`);
}
