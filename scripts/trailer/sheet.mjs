// Contact sheet of out/stills (for checking a preview): node scripts/trailer/sheet.mjs <name-filter> [cols]
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'stills');
const f = process.argv[2] || '', cols = +(process.argv[3] || 4);
const files = fs.readdirSync(dir).filter(x => /[.](jpg|png)$/.test(x) && x.includes(f)).sort();
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px">` +
  files.map(x => `<div style="position:relative"><img style="width:100%;display:block" src="file:///${path.join(dir, x).split(path.sep).join('/')}"><span style="position:absolute;left:3px;top:2px;color:#ff0;font:12px monospace;background:#000a">${x}</span></div>`).join('') + '</body>';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 400 } });
const tmp = path.join(dir, '..', 'sheet.html'); fs.writeFileSync(tmp, html);
await p.goto('file:///' + tmp.split(path.sep).join('/')); await p.waitForLoadState('load');
const out = path.join(dir, '..', `sheet-${f || 'all'}.jpg`);
await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 80 }); await b.close(); console.log(out);
