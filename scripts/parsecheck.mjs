// Extract every inline <script> block from index.html and syntax-check it with node.
// Exit 1 on the first failure. Run after every edit batch; CI runs it on push.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(here, '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const blocks = [...src.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
blocks.forEach((b, i) => {
  const tmp = path.join(os.tmpdir(), `na-block${i}-${process.pid}.js`);
  fs.writeFileSync(tmp, b);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (r.status !== 0) { ok = false; console.log(`block ${i}: FAIL\n${r.stderr.slice(0, 1200)}`); }
  else console.log(`block ${i}: OK (${b.length.toLocaleString()} chars)`);
});
process.exit(ok ? 0 : 1);
