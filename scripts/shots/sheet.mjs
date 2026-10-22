// Contact sheet of out/candidates (or another folder under out/) for picking: node scripts/shots/sheet.mjs <name-regex> [cols] [folder]
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const f = process.argv[2] || '', cols = +(process.argv[3] || 4), dir = path.join(out, process.argv[4] || 'candidates');
const files = fs.readdirSync(dir).filter(x => /[.](jpg|png)$/.test(x) && new RegExp(f).test(x)).sort();
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px">` +
  files.map(x => `<div style="position:relative"><img style="width:100%;display:block" src="file:///${path.join(dir, x).split(path.sep).join('/')}"><span style="position:absolute;left:3px;top:2px;color:#ff0;font:12px monospace;background:#000a">${x}</span></div>`).join('') + '</body>';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 400 } });
const tmp = path.join(out, 'sheet.html'); fs.writeFileSync(tmp, html);
await p.goto('file:///' + tmp.split(path.sep).join('/')); await p.waitForLoadState('load');
const file = path.join(out, `sheet-${(f || 'all').replace(/[^a-z0-9]+/gi, '_')}.jpg`);
await p.waitForFunction(() => [...document.images].every(i => i.complete));
// full-page capture of a tall sheet sometimes fails once ("Unable to capture screenshot"); a second try goes through
try { await p.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 80 }); }
catch { await p.waitForTimeout(500); await p.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 80 }); }
await b.close(); console.log(file);
