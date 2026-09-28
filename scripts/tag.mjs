// Show or bump the version shown on the title screen (<div class="version">v1.85</div>).
//   node scripts/tag.mjs            -> prints v1.85
//   node scripts/tag.mjs bump       -> v1.85 -> v1.86 (in place)
//   node scripts/tag.mjs set v2.00  -> sets it explicitly
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const re = /<div class="version">v(\d+)\.(\d+)<\/div>/g;
const all = [...src.matchAll(re)];
if (all.length !== 1) { console.error(`expected one version tag, found ${all.length}`); process.exit(1); }
const [, maj, min] = all[0]; const cur = `v${maj}.${min}`;
const arg = process.argv[2];
if (!arg) { console.log(cur); process.exit(0); }
const next = arg === 'bump' ? `v${maj}.${String(+min + 1).padStart(min.length, '0')}` : process.argv[3];
if (!/^v\d+\.\d+$/.test(next || '')) { console.error('usage: tag.mjs [bump | set vX.YY]'); process.exit(1); }
fs.writeFileSync(file, src.replace(all[0][0], `<div class="version">${next}</div>`));
console.log(`${cur} -> ${next}`);
