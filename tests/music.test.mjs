// v1.96 fix-up (CI page error "connect on AudioNode"): stopMusic fades out and, 400 ms later, disconnects and nulls the
// master gain. A startMusic inside those 400 ms (a theme switch, or bedroom -> scenario -> bedroom quickly) makes a
// new gain, and the stale timer used to kill THAT one: the new theme went silent and its notes threw on
// connect(null). The 400 ms timer is captured and fired by hand, so the test doesn't wait real time.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const before = { ctx: !!(Game.audio && Game.audio.ctx), playing: Music.playing, gain: !!Music.masterGain };
  const st = window.setTimeout, late = [];
  window.setTimeout = (fn, ms, ...a) => ms === 400 ? (late.push(fn), 0) : st(fn, ms, ...a);
  let restarted;
  try { stopMusic(); startMusic('bedroom'); restarted = Music.masterGain; } finally { window.setTimeout = st; }
  for (const f of late) f();
  let threw = null;
  try { musicScheduler(); } catch (e) { threw = e.message; }
  return { before, timers: late.length, playing: Music.playing, gainKept: !!Music.masterGain && Music.masterGain === restarted, threw };
});
check('music is playing in the bedroom', r.before.ctx && r.before.playing && r.before.gain, r.before);
check('a stop + restart inside 400 ms keeps the new theme\'s master gain', r.timers === 1 && r.playing && r.gainKept, r);
check('the scheduler still runs after the stale timer', r.threw === null, r.threw);
await g.spin(30);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
