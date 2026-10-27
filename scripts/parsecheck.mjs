// Syntax-check the game's code with node. Run after every edit batch; CI runs it on every pull request and before each upload.
// v1.355 (D.75, the split): the code lives in js/, one classic <script src="js/NN-name.js"> tag per file in index.html. It
// checks any inline <script> block, then every js/ file in tag order, then their concatenation in tag order (the files share
// one global scope, so a top-level let/const/class declared in two files is a SyntaxError only the whole can show). It fails
// on a js/*.js that no tag names, a tag whose file is missing, and a tag list that differs from scripts/split.mjs's CUTS (a new
// file takes an anchor there too, so a branch from before the split can still be ported: scripts/join.mjs).
//   node scripts/parsecheck.mjs [path/to/index.html]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
import { CUTS } from './split.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(process.argv[2] || path.join(here, '..', 'index.html')), dir = path.dirname(file);
const src = fs.readFileSync(file, 'utf8');
let ok = true;
const bad = msg => { ok = false; console.log(msg); };
const check = (label, code) => {
  const tmp = path.join(os.tmpdir(), `na-check-${process.pid}.js`);
  fs.writeFileSync(tmp, code);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (r.status !== 0) bad(`${label}: FAIL\n${r.stderr.slice(0, 1200)}`);
  else console.log(`${label}: OK (${code.length.toLocaleString('en')} chars)`);
};

const blocks = [...src.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
blocks.forEach((b, i) => check(`block ${i}`, b));

const tags = [...src.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
const jsDir = path.join(dir, 'js');
const onDisk = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => f.endsWith('.js')) : [];
for (const f of onDisk) if (!tags.includes(`js/${f}`)) bad(`js/${f}: no <script src> tag in index.html names it`);
const parts = [];
for (const t of tags) {
  const p = path.join(dir, t);
  if (!fs.existsSync(p)) { bad(`${t}: index.html names it but the file is missing`); continue; }
  const code = fs.readFileSync(p, 'utf8');
  check(t, code); parts.push(code);
}
if (tags.length) {
  if (tags.length === parts.length) check(`all ${tags.length} js/ files in tag order`, parts.join(''));
  const cuts = CUTS.map(c => `js/${c[0]}`);
  if (cuts.join() !== tags.join()) bad(`the tags are not scripts/split.mjs's CUTS (add a new file's anchor there):\n  tags  ${tags.join(' ')}\n  CUTS  ${cuts.join(' ')}`);
}
if (!blocks.length && !tags.length) bad('no inline <script> block and no js/ tags');
process.exit(ok ? 0 : 1);
