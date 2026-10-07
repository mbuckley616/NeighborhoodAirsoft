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
  // v1.126: one file per process, so two suites booting different builds at once can't overwrite each other's copy
  const out = path.join(TMP, `index.local.${process.pid}.html`);
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
  // v1.129: g.page is a stand-in that forwards to the live page, so a suite that took `const { page } = g` before
  // g.bedroom() follows it if bedroom() has to start a fresh browser (below).
  let browser, cur;
  const errs = [];
  const open = async () => {
    browser = await chromium.launch(launch);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    cur = await ctx.newPage();
    cur.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await cur.goto('file://' + file);
    await cur.waitForFunction(() => typeof Game !== 'undefined' && typeof stepGame === 'function', null, { timeout: 60000 });
  };
  await open();
  const page = new Proxy({}, { get: (_, k) => { const v = cur[k]; return typeof v === 'function' ? v.bind(cur) : v; } });

  const g = { page, errs };
  Object.defineProperty(g, 'browser', { get: () => browser });
  g.mode = () => page.evaluate(() => Game.mode);
  const toBedroom = async (attempt) => {
    // opts.stallOnce (tests/harness.test.mjs): the first NEW GAME hangs the page's main thread, as the real stall does
    if (opts.stallOnce && attempt === 0) { page.evaluate(() => { for (;;) {} }).catch(() => {}); await new Promise(() => {}); }
    // v1.93: click from inside the page. page.click() sometimes sat in "performing click action" for its
    // full 30 s here (about 1 boot in 8), which crashed the suite before it ran; the mode wait below is the real gate.
    await page.evaluate(() => document.getElementById('startBtn').click());
    // v1.108: NEW GAME opens the bathroom mirror first (D.6); DONE there goes on to the bedroom
    await page.waitForFunction(() => Game.mode === 'bedroom' || Game.mode === 'mirror', null, { timeout: 60000 });
    await page.evaluate(() => { if (Game.mode === 'mirror') document.getElementById('mirrorDoneBtn').click(); });
    await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
  };
  // v1.129 (Found in play, the harness stall since v1.110): about 2–4% of boots under load hang in enterBedroom()
  // with the renderer's main thread blocked in native code (v1.123), and Playwright's own timeouts never fire, so
  // the suite sat until run.mjs's 10 minutes; sometimes the browser dies there instead. A Node-side watchdog gives
  // NEW GAME 75 s (a healthy one takes 2–20 s); on a stall or a dead browser it closes it, boots a fresh one and goes
  // again, once. g.bedroom.retries counts the restarts.
  g.bedroom = async () => {
    for (let attempt = 0; ; attempt++) {
      let timer;
      try {
        const ms = opts.bedroomTimeout || 75000;
        await Promise.race([toBedroom(attempt), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`NEW GAME stalled for ${ms / 1000} s`)), ms); })]);
        return;
      } catch (e) {
        if (attempt >= 1) throw e;
        console.log(`  (harness: ${e.message.split('\n')[0].slice(0, 120)}; starting a fresh browser)`);
        g.bedroom.retries++;
        await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 15000))]);
        errs.length = 0;
        await open();
      } finally { clearTimeout(timer); }
    }
  };
  g.bedroom.retries = 0;
  g.scenario = async (id) => {
    await page.evaluate(() => { isScenarioUnlocked = () => true; });
    await page.evaluate(id => enterScenario(id), id);
    await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
    await page.evaluate(() => document.getElementById('introBeginBtn').click());
    await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
    // v1.174: updatePlayer moves no one while the mouse is unlocked, and CI's headless Chromium sometimes refuses the
    // pointer lock BEGIN asks for, so a test holding W would stand still (country-club's pool walk, 6 Oct). Tests drive
    // the keys themselves: mark the lock taken. A real pointerlockchange still overwrites it.
    await page.evaluate(() => { Game.mouse.locked = true; });
  };
  g.spin = (frames, dt = 1 / 60) => page.evaluate(([n, dt]) => { for (let i = 0; i < n && Game.mode !== 'title'; i++) stepGame(dt); return Game.mode; }, [frames, dt]);
  // Screenshots are for looking at, not assertions. Software GL on a slow CI runner can take longer than
  // Playwright's 30 s to capture a heavy scene (smoke, v1.109): wait up to 60 s, then log and carry on.
  g.shot = async (name) => {
    fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name + '.png');
    try { await page.screenshot({ path: f, timeout: 60000 }); return f; }
    catch (e) { if (e.name !== 'TimeoutError') throw e; console.log(`  (screenshot ${name} timed out; skipped)`); return null; }
  };
  g.close = async () => { await browser.close(); try { fs.unlinkSync(file); } catch {} };
  return g;
}

// tiny assertion helpers so tests read as sentences
export function check(name, cond, detail) {
  const ok = !!cond;
  console.log(`${ok ? '  ok ' : ' FAIL'} ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
  if (!ok) process.exitCode = 1;
  return ok;
}
