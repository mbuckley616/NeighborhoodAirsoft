// 19 Oct 2026 (Michael in chat, the Old Gates' pipeline ported): tests/lib/select.mjs picks the suites a pull request runs.
// Every suite for main, the smoke set when nothing changed, and index.html's script read the way the selector needs it:
// one row per top-level name, SCENARIOS split by its scenario ids. No browser, no history beyond HEAD.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
import { selectSuites, SMOKE, FULL_SHARDS } from './lib/select.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
let fails = 0; const check = (ok, msg, extra) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}${ok || extra === undefined ? '' : ' ' + JSON.stringify(extra)}`); if (!ok) fails++; };
// the selector reads the suites committed at HEAD (so it can be measured on any past commit), not the working folder
const all = execFileSync('git', ['ls-tree', '--name-only', 'HEAD:tests'], { cwd: path.join(here, '..'), encoding: 'utf8' }).split('\n').filter(f => f.endsWith('.test.mjs')).length;

const full = selectSuites({ full: true });
check(full.mode === 'full' && full.n === FULL_SHARDS && full.suites.length === all, `--full: every suite (${full.suites.length}) in ${full.n} shards`);
const none = selectSuites({ base: 'HEAD', head: 'HEAD' });
check(none.mode === 'some' && none.n === 1 && none.suites.join() === SMOKE.join(), 'nothing changed: the smoke set in one shard', none);
check(SMOKE.every(s => fs.existsSync(path.join(here, s + '.test.mjs'))), `the smoke suites exist (${SMOKE.join(', ')})`);

const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const { scripts, rows } = JSON.parse(execFileSync(process.execPath, ['--expose-internals', '--no-warnings', path.join(here, 'lib', 'toplevel.cjs')],
  { input: html, encoding: 'utf8', maxBuffer: 1 << 29 }));
const lines = html.split('\n'), at = name => rows.find(r => r.name === name);
check(scripts.length >= 1 && scripts.every(s => s.endLine > s.line), `the inline script found (${scripts.map(s => `lines ${s.line}-${s.endLine}`).join(', ')})`);
const sg = at('stepGame');
check(sg && /function stepGame\b/.test(lines[sg.line - 1]), 'stepGame\'s row starts on its own line of index.html', sg && lines[sg.line - 1]);
const sc = at('SCENARIOS'), tut = sc && sc.props && sc.props.find(p => p.name === 'winnmark_tutorial');
check(sc && sc.props && sc.props.length > 20, `SCENARIOS is split by its keys (${sc && sc.props && sc.props.length})`);
check(tut && /winnmark_tutorial/.test(lines[tut.line - 1]) && tut.endLine > tut.line, 'the tutorial\'s entry spans its own lines', tut && { line: tut.line, endLine: tut.endLine });
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
