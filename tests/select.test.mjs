// tests/lib/select.mjs picks the suites a CI run takes (19 Oct 2026; basic tests since 20 Oct, Michael in chat): every suite
// for the weekly run, the smoke set and the suites a pull request edits for a pull request, nothing for a docs-only one.
// No browser; the history it reads is this repository's own.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
import { selectSuites, SMOKE, FULL_SHARDS } from './lib/select.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
let fails = 0; const check = (ok, msg, extra) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}${ok || extra === undefined ? '' : ' ' + JSON.stringify(extra)}`); if (!ok) fails++; };
const git = (...a) => execFileSync('git', a, { cwd: path.join(here, '..'), encoding: 'utf8' }).trim();
// the selector reads the suites committed at HEAD (so it can be measured on any past commit), not the working folder
const all = git('ls-tree', '--name-only', 'HEAD:tests').split('\n').filter(f => f.endsWith('.test.mjs')).length;

const full = selectSuites({ full: true });
check(full.mode === 'full' && full.n === FULL_SHARDS && full.suites.length === all, `--full: every suite (${full.suites.length}) in ${full.n} shards`);
const none = selectSuites({ base: 'HEAD', head: 'HEAD' });
check(none.mode === 'some' && none.n === 1 && none.suites.join() === [...SMOKE].sort().join(), 'nothing changed: the smoke set in one shard', none);
check(SMOKE.every(s => fs.existsSync(path.join(here, s + '.test.mjs'))), `the smoke suites exist (${SMOKE.join(', ')})`);

// past commits: the latest one that touched only docs, and the latest one that edited a suite
const docs = git('log', '--no-merges', '--format=%H', '-200', 'HEAD').split('\n').find(c => { const f = git('diff-tree', '--no-commit-id', '--name-only', '-r', c).split('\n').filter(Boolean); return f.length && f.every(x => x.startsWith('docs/') || (x.endsWith('.md') && !x.startsWith('tests/'))); });
if (docs) { const d = selectSuites({ base: docs + '~1', head: docs }); check(d.mode === 'none' && d.n === 0, `a docs-only commit (${docs.slice(0, 7)}) runs nothing`, d); }
const suite = git('log', '--no-merges', '--format=%H', '-200', 'HEAD', '--', 'tests/*.test.mjs').split('\n').find(Boolean);
if (suite) {
  const edited = git('diff-tree', '--no-commit-id', '--name-only', '-r', suite).split('\n').map(f => /^tests\/([^/]+)\.test\.mjs$/.exec(f)).filter(Boolean).map(m => m[1])
    .filter(s => fs.existsSync(path.join(here, s + '.test.mjs')));
  const s = selectSuites({ base: suite + '~1', head: suite });
  check(s.mode === 'some' && SMOKE.every(x => s.suites.includes(x)) && edited.every(x => s.suites.includes(x)) && s.suites.length === new Set([...SMOKE, ...edited]).size,
    `a commit that edits suites (${suite.slice(0, 7)}) runs the smoke set and those (${edited.join(', ')})`, s.suites);
}
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
