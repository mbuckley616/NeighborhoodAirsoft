// The version shown on the title screen (<div class="version">v1.85</div> in index.html) and the number each session takes.
//   node scripts/tag.mjs            -> prints the title's version, e.g. v1.354
//   node scripts/tag.mjs bump       -> chooses this session's version and starts its devlog file, docs/devlog/v1.355.md
//   node scripts/tag.mjs stamp      -> sets the title to the highest version in docs/devlog/ (main does this after each landing)
//   node scripts/tag.mjs set v2.00  -> sets the title explicitly
// 26 Oct 2026: the builder works while a Fable branch is open, so a bump takes one above the highest version anywhere: here,
// and on origin/main and every origin/auto/* branch (run `git fetch` first), so two branches never pick the same number.
// v1.354 (D.75, two builder lanes): no branch edits the title's version line any more, because two branches editing the same
// line conflict on every merge. bump only chooses the number (for the devlog file and the `// v1.NN:` markers) and claims it
// by writing the file's heading; automerge.yml stamps the title on main after each merge, from docs/devlog/.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'index.html'), DEVLOG = path.join(root, 'docs', 'devlog');
const src = fs.readFileSync(file, 'utf8');
const re = /<div class="version">v(\d+)\.(\d+)<\/div>/g;
const all = [...src.matchAll(re)];
if (all.length !== 1) { console.error(`expected one version tag, found ${all.length}`); process.exit(1); }
const [, maj, min] = all[0]; const cur = `v${maj}.${min}`;
const arg = process.argv[2];
if (!arg) { console.log(cur); process.exit(0); }

const FILE_RE = /^v(\d+)\.(\d+)\.md$/;
// the highest minor version in docs/devlog/ here
function highestHere() {
  let hi = 0;
  if (fs.existsSync(DEVLOG)) for (const f of fs.readdirSync(DEVLOG)) { const m = FILE_RE.exec(f); if (m && m[1] === maj) hi = Math.max(hi, +m[2]); }
  return hi;
}
// the highest minor version on main and the auto/* branches: their title tags, devlog.md headings and docs/devlog/ files
function highestElsewhere() {
  let hi = 0;
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  let refs = [];
  try { refs = git('for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main', 'refs/remotes/origin/auto/').split('\n').filter(Boolean); } catch (e) { return 0; }
  for (const ref of refs) {
    for (const [f, r] of [['index.html', /<div class="version">v(\d+)\.(\d+)<\/div>/g], ['devlog.md', /^## v(\d+)\.(\d+)\b/gm]]) {
      let txt = ''; try { txt = git('show', `${ref}:${f}`); } catch (e) { continue; }
      for (const m of txt.matchAll(r)) if (m[1] === maj && +m[2] > hi) hi = +m[2];
    }
    let names = []; try { names = git('ls-tree', '--name-only', `${ref}:docs/devlog`).split('\n'); } catch (e) { continue; }
    for (const f of names) { const m = FILE_RE.exec(f); if (m && m[1] === maj) hi = Math.max(hi, +m[2]); }
  }
  return hi;
}
const pad = n => String(n).padStart(min.length, '0');
const setTitle = v => fs.writeFileSync(file, src.replace(all[0][0], `<div class="version">${v}</div>`));

if (arg === 'bump') {
  const next = `v${maj}.${pad(Math.max(+min, highestHere(), highestElsewhere()) + 1)}`;
  fs.mkdirSync(DEVLOG, { recursive: true });
  fs.writeFileSync(path.join(DEVLOG, `${next}.md`), `## ${next} — \n`, { flag: 'wx' });
  console.log(`${next}: docs/devlog/${next}.md started; write the entry there and mark new code // ${next}:`);
} else if (arg === 'stamp') {
  const hi = highestHere();
  if (!hi || hi <= +min) { console.log(`${cur} (docs/devlog/ holds nothing higher)`); process.exit(0); }
  setTitle(`v${maj}.${pad(hi)}`); console.log(`${cur} -> v${maj}.${pad(hi)}`);
} else if (arg === 'set' && /^v\d+\.\d+$/.test(process.argv[3] || '')) {
  setTitle(process.argv[3]); console.log(`${cur} -> ${process.argv[3]}`);
} else { console.error('usage: tag.mjs [bump | stamp | set vX.YY]'); process.exit(1); }
