// Shared harness for Neighborhood Airsoft. Boots the single-file build in headless Chromium with
// three.js served locally (the CDN can be unreachable in CI and cloud sessions), and gets into the
// bedroom or a scenario. Every test and every playtest script imports this.
//
//   const g = await boot();                  // { page, browser, errs, close }
//   await g.bedroom();                       // title -> NEW GAME -> Mike's room
//   await g.scenario('winnmark_seth_house'); // straight into a match (locks bypassed), past BEGIN
//   await g.spin(600);                       // 600 fixed 1/60 steps of stepGame()
//   await g.shot('seth-house');              // tests/out/seth-house.png
//
// Software GL runs the scene at a few fps, so anything timing-sensitive is driven with spin(),
// never waitForTimeout.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
const TMP = path.join(here, '..', 'tmp');
const OUT = path.join(here, '..', 'out');

export function localBuild(src = path.join(ROOT, 'index.html')) {
  fs.mkdirSync(TMP, { recursive: true });
  const out = path.join(TMP, 'index.local.html');
  const html = fs.readFileSync(src, 'utf8').replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/,
    '../vendor/three.min.js');
  fs.writeFileSync(out, html);
  return out;
}

const PREINSTALLED = '/opt/pw-browsers/chromium';

export async function boot(opts = {}) {
  const file = localBuild(opts.src);
  const launch = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  else if (!fs.existsSync(chromium.executablePath()) && fs.existsSync(PREINSTALLED)) launch.executablePath = PREINSTALLED;
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof stepGame === 'function', null, { timeout: 60000 });

  const g = { page, browser, errs };
  g.mode = () => page.evaluate(() => Game.mode);
  g.bedroom = async () => {
    await page.click('#startBtn');
    await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
  };
  g.scenario = async (id) => {
    await page.evaluate(() => { isScenarioUnlocked = () => true; });
    await page.evaluate(id => enterScenario(id), id);
    await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
    await page.evaluate(() => document.getElementById('introBeginBtn').click());
    await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
  };
  g.spin = (frames, dt = 1 / 60) => page.evaluate(([n, dt]) => { for (let i = 0; i < n && Game.mode !== 'title'; i++) stepGame(dt); return Game.mode; }, [frames, dt]);
  g.shot = async (name) => { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); return f; };
  g.close = () => browser.close();
  return g;
}

// tiny assertion helpers so tests read as sentences
export function check(name, cond, detail) {
  const ok = !!cond;
  console.log(`${ok ? '  ok ' : ' FAIL'} ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
  if (!ok) process.exitCode = 1;
  return ok;
}
