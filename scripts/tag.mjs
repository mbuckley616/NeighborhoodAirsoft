// Show or bump the version shown on the title screen (<div class="version">v1.85</div>).
//   node scripts/tag.mjs            -> prints v1.85
//   node scripts/tag.mjs bump       -> v1.85 -> v1.86 (in place)
//   node scripts/tag.mjs set v2.00  -> sets it explicitly
// 26 Oct 2026: the builder now works while a Fable branch is open, so a bump takes one above the highest version anywhere:
// this file, and the title tag and devlog.md headings on origin/main and every origin/auto/* branch (run `git fetch` first).
// Two branches never pick the same number; when a merge conflicts on the tag line, keep the higher one.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const re = /<div class="version">v(\d+)\.(\d+)<\/div>/g;
const all = [...src.matchAll(re)];
if (all.length !== 1) { console.error(`expected one version tag, found ${all.length}`); process.exit(1); }
const [, maj, min] = all[0]; const cur = `v${maj}.${min}`;
const arg = process.argv[2];
if (!arg) { console.log(cur); process.exit(0); }
// the highest minor version on main and the auto/* branches, from their title tags and devlog headings
function highestElsewhere() {
  let hi = 0;
  const git = (...a) => execFileSync('git', a, { cwd: path.dirname(file), encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  let refs = [];
  try { refs = git('for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main', 'refs/remotes/origin/auto/').split('\n').filter(Boolean); } catch (e) { return 0; }
  for (const ref of refs) for (const [f, r] of [['index.html', /<div class="version">v(\d+)\.(\d+)<\/div>/g], ['devlog.md', /^## v(\d+)\.(\d+)\b/gm]]) {
    let txt = ''; try { txt = git('show', `${ref}:${f}`); } catch (e) { continue; }
    for (const m of txt.matchAll(r)) if (m[1] === maj && +m[2] > hi) hi = +m[2];
  }
  return hi;
}
const next = arg === 'bump' ? `v${maj}.${String(Math.max(+min, highestElsewhere()) + 1).padStart(min.length, '0')}` : process.argv[3];
if (!/^v\d+\.\d+$/.test(next || '')) { console.error('usage: tag.mjs [bump | set vX.YY]'); process.exit(1); }
fs.writeFileSync(file, src.replace(all[0][0], `<div class="version">${next}</div>`));
console.log(`${cur} -> ${next}`);
