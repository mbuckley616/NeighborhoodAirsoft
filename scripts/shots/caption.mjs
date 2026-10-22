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
// the cover: the fight, with the title on a scrap of the start screen's notebook paper (v1.3xx's title page): the
// same two fonts, lifted from index.html (Permanent Marker for the title, Patrick Hand for the red pen)
const NB_FONTS = [...fs.readFileSync(path.join(here, '..', '..', 'index.html'), 'utf8')
  .matchAll(/@font-face \{ font-family: 'NB (?:Hand|Marker)';[\s\S]*?\}/g)].map(m => m[0]).join('\n');
const TORN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='10'%3E%3Cpath d='M0 10V5L5 1L11 6L17 2L23 7L29 1L35 5L41 2L46 6V10Z'/%3E%3C/svg%3E") 0 0 / 46px 10px repeat-x, linear-gradient(#000, #000) 0 9px / 100% calc(100% - 9px) no-repeat`;
const cover = (img, c) => `<!doctype html><html><head><style>${NB_FONTS}
  .scrap { position:absolute; left:92px; top:16px; width:446px; height:178px; transform:rotate(-2deg);
    filter:drop-shadow(4px 6px 0 rgba(0,0,0,.35)) drop-shadow(0 10px 18px rgba(0,0,0,.35)); }
  .page { position:absolute; inset:0; -webkit-mask:${TORN}; mask:${TORN};
    background:
      radial-gradient(circle at 18px 50px, #1b1d22 0 6px, rgba(27,29,34,0) 7px) 0 0 / 36px 84px repeat-y,
      linear-gradient(90deg, transparent 38px, #e48c8c 38px, #e48c8c 40px, transparent 40px),
      repeating-linear-gradient(180deg, transparent 0 20px, #a9c4e4 20px 21px, transparent 21px 26px),
      #fbf8ef;
    display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 10px 6px 46px; box-sizing:border-box; }
  .t { font-family:'NB Marker'; font-size:43px; line-height:46px; color:#17171c; text-align:center; letter-spacing:1px; }
  .s { font-family:'NB Hand'; font-size:20px; color:#b3261e; letter-spacing:5px; margin-top:8px; }
  .tape { position:absolute; top:-12px; width:92px; height:28px; background:rgba(246,238,200,.72);
    box-shadow:0 1px 2px rgba(0,0,0,.2); }
</style></head><body style="margin:0;width:630px;height:500px;overflow:hidden;position:relative;background:#000">
  <img src="${url(img)}" style="position:absolute;left:${-c.x * 630 / c.w}px;top:${-c.y * 630 / c.w}px;width:${1920 * 630 / c.w}px;height:${1080 * 630 / c.w}px">
  <div class="scrap"><div class="page"><div class="t">NEIGHBORHOOD<br>AIRSOFT</div><div class="s">SUMMER · 2003</div></div>
    <div class="tape" style="left:34px;transform:rotate(-8deg)"></div><div class="tape" style="right:26px;transform:rotate(6deg)"></div></div>
</body></html>`;

fs.rmSync(FINAL, { recursive: true, force: true });
fs.mkdirSync(CAPT, { recursive: true });
const b = await chromium.launch();
const shoot = async (html, w, h, scale, out) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const tmp = path.join(FINAL, '_page.html'); fs.writeFileSync(tmp, html);
  await p.goto(url(tmp)); await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
  await p.evaluate(() => document.fonts.ready);
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
