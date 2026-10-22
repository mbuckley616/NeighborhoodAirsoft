// Step 2 of the store screenshots: copies the picked candidates to out/final (clean, numbered in page order), makes a
// captioned copy of each (out/final/captioned) in the trailer's type, and an itch.io cover (630x500 and 2x).
//
//   node scripts/shots/caption.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CAND = path.join(here, 'out', 'candidates');
const FINAL = path.join(here, 'out', 'final');
const CAPT = path.join(FINAL, 'captioned');

// page order: the first three are what the itch page shows without scrolling
const PICKS = [
  ['club-04', 'Willow Bend Country Club', "Pool's closed."],
  ['treehouse-10', 'King of the Treehouse', 'Climb up. Take it back.'],
  ['store-07', 'Inside Riverside Market', 'Cleanup on aisle five.'],
  ['zombies-08', 'Infection', "Zombie tag. Don't get tagged."],
  ['night-08', 'Night games', 'Out after the streetlights come on.'],
  ['ctf-01', 'Flags on Bellfield', 'First to two flags.'],
  ['portables-06', 'Hollins Ridge High', 'Out behind the portables.'],
  ['duel-06', 'Spring guns', 'Rack it. Aim. <i>Pop.</i>'],
  ['mirror-00', 'The bathroom mirror', 'Be any kid on the block.', 'framed'],
  ['map-00', '11 places · 70+ matches', 'The whole neighborhood, one summer.', 'framed'],
  ['bedroom-00', 'Summer, 2003', "School's out."],
];
// the cover's crop of its shot, in source pixels (x, y, width): keep it clear of the HUD's corner panels
const COVER = { name: 'club-04', x: 660, y: 120, w: 950 };

const url = (f) => 'file:///' + f.split(path.sep).join('/');
const FONT = `font-family:Georgia,serif;`;
const page1080 = (img, kicker, text) => `<!doctype html><html><body style="margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;background:#000">
  <img src="${url(img)}" style="position:absolute;inset:0;width:1920px;height:1080px">
  <div style="position:absolute;left:0;top:100px;width:1300px;height:330px;background:radial-gradient(ellipse at 0 0, rgba(8,10,14,.72) 0%, rgba(8,10,14,.4) 45%, rgba(8,10,14,0) 72%)"></div>
  <div style="position:absolute;left:44px;top:140px;max-width:1150px">
    <div style="font-family:'Courier New',monospace;font-weight:bold;font-size:26px;letter-spacing:7px;color:#ff8c42;text-transform:uppercase;text-shadow:2px 2px 0 #000">${kicker}</div>
    <div style="${FONT}font-weight:bold;font-size:76px;line-height:1.05;color:#f4e9d8;margin-top:10px;text-shadow:4px 4px 0 #000, 0 0 30px rgba(0,0,0,.6)">${text}</div>
  </div></body></html>`;
// menu screens have their own title top-left: shrink the shot onto a dark card and put the caption above it
const framed = (img, kicker, text) => `<!doctype html><html><body style="margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;
  background:linear-gradient(180deg,#1a2332 0%,#22301f 70%,#34442a 100%)">
  <div style="position:absolute;left:0;right:0;top:44px;text-align:center">
    <div style="font-family:'Courier New',monospace;font-weight:bold;font-size:24px;letter-spacing:7px;color:#ff8c42;text-transform:uppercase;text-shadow:2px 2px 0 #000">${kicker}</div>
    <div style="${FONT}font-weight:bold;font-size:64px;line-height:1.05;color:#f4e9d8;margin-top:8px;text-shadow:4px 4px 0 #000">${text}</div>
  </div>
  <img src="${url(img)}" style="position:absolute;left:304px;top:218px;width:1312px;height:738px;border:3px solid #f4e9d8;box-shadow:0 18px 50px rgba(0,0,0,.6)">
  </body></html>`;
// the cover: the fort and the fight, the title up in the sky
const cover = (img, c) => `<!doctype html><html><body style="margin:0;width:630px;height:500px;overflow:hidden;position:relative;background:#000">
  <img src="${url(img)}" style="position:absolute;left:${-c.x * 630 / c.w}px;top:${-c.y * 630 / c.w}px;width:${1920 * 630 / c.w}px;height:${1080 * 630 / c.w}px">
  <div style="position:absolute;left:0;right:0;top:0;height:200px;background:linear-gradient(180deg,rgba(10,12,16,.75) 0%,rgba(10,12,16,.45) 60%,rgba(10,12,16,0) 100%)"></div>
  <div style="position:absolute;left:0;right:0;top:26px;text-align:center">
    <div style="${FONT}font-weight:bold;font-size:50px;line-height:1;color:#f4e9d8;letter-spacing:1px;text-shadow:3px 3px 0 #000">NEIGHBORHOOD<br>AIRSOFT</div>
    <div style="font-family:'Courier New',monospace;font-weight:bold;font-size:16px;letter-spacing:6px;color:#ff8c42;margin-top:12px;text-shadow:2px 2px 0 #000">SUMMER · 2003</div>
  </div></body></html>`;

fs.rmSync(FINAL, { recursive: true, force: true });
fs.mkdirSync(CAPT, { recursive: true });
const b = await chromium.launch();
const shoot = async (html, w, h, scale, out) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const tmp = path.join(FINAL, '_page.html'); fs.writeFileSync(tmp, html);
  await p.goto(url(tmp)); await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
  await p.screenshot({ path: out }); await p.close();
};
for (const [i, [name, kicker, text, layout]] of PICKS.entries()) {
  const src = path.join(CAND, name + '.png'), n = String(i + 1).padStart(2, '0'), slug = name.replace(/-\d+$/, '');
  fs.copyFileSync(src, path.join(FINAL, `${n}-${slug}.png`));
  await shoot((layout === 'framed' ? framed : page1080)(src, kicker, text), 1920, 1080, 1, path.join(CAPT, `${n}-${slug}.png`));
}
await shoot(cover(path.join(CAND, COVER.name + '.png'), COVER), 630, 500, 1, path.join(FINAL, 'cover-630x500.png'));
await shoot(cover(path.join(CAND, COVER.name + '.png'), COVER), 630, 500, 2, path.join(FINAL, 'cover-1260x1000.png'));
fs.unlinkSync(path.join(FINAL, '_page.html'));
await b.close();
console.log(fs.readdirSync(FINAL).concat(fs.readdirSync(CAPT).map(f => 'captioned/' + f)).join('\n'));
