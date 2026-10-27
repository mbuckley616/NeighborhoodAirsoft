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

// v1.356 (D.69, Michael: A — by mode): four match loops and the result card's stings
const table = await page.evaluate(() => {
  const by = {}, ids = {};
  for (const id of Object.keys(SCENARIOS)) { const t = String(matchMusicTheme(id)); by[t] = (by[t] || 0) + 1; ids[id] = t; }
  SCENARIOS.__range = { range: true }; const range = matchMusicTheme('__range'); delete SCENARIOS.__range;
  return { by, range, last: ids.last_saturday, night: ids.bunratty_night_lane || null,
    tense: Object.keys(SCENARIOS).filter(id => SCENARIOS[id].winCondition === 'survive_timer').every(id => ids[id] === 'match_tense' || ids[id] === 'match_finale'),
    nightOk: Object.keys(SCENARIOS).filter(id => ids[id] === 'match_night').every(id => SCENARIOS[id].timeOfDay === 'night') };
});
console.log('   loops by match:', JSON.stringify(table.by));
check('every match plays one of the four loops, each loop used', ['match_day', 'match_night', 'match_tense', 'match_finale'].every(t => table.by[t] > 0) && !table.by.null, table.by);
check('the range stays quiet, the Last Saturday plays the finale', table.range === null && table.last === 'match_finale', table);
check('defends on a clock play the tense loop, the night loop only at night', table.tense && table.nightOk, table);

const play = async id => { await g.scenario(id); return page.evaluate(() => ({ theme: Music.theme, playing: Music.playing, bpm: Music.bpm,
  vol: musicThemeVolume(Music.theme), bedroomVol: Music.volume, expect: matchMusicTheme(Game.scenario.active) })); };
const day = await play('bunratty_team_2v4');
const sched = await page.evaluate(() => { let threw = null, n = 0; const f = scheduleMatchBeat;
  scheduleMatchBeat = (...a) => { n++; return f(...a); };
  try { Music.currentBeat = -1; Music.startTime = Game.audio.ctx.currentTime; musicScheduler(); } catch (e) { threw = e.message; } finally { scheduleMatchBeat = f; }
  return { threw, n }; });
check('at BEGIN the bedroom tune gives way to the match loop, at half its level or less', day.playing && day.theme === day.expect && day.theme === 'match_day' && day.vol <= day.bedroomVol / 2, day);
check('the match loop schedules its beats without a throw', sched.threw === null && sched.n >= 1, sched);
const won = await page.evaluate(() => { Music.lastSting = null; endScenario('win'); return { playing: Music.playing, sting: Music.lastSting && Music.lastSting.kind, mode: Game.mode }; });
check('a win stops the loop and plays the win sting', !won.playing && won.sting === 'win' && won.mode === 'result', won);
await page.evaluate(() => enterBedroom());
const home = await page.evaluate(() => Music.theme);
check('home again, the bedroom tune is back', home === 'bedroom', home);
const night = await play('bunratty_night_lane');
const muted = await page.evaluate(() => {
  const k = code => document.dispatchEvent(new KeyboardEvent('keydown', { code }));
  k('KeyM'); const off = Music.playing; k('KeyM'); const on = { playing: Music.playing, theme: Music.theme };
  Music.lastSting = null; endScenario('lose'); const lose = Music.lastSting && Music.lastSting.kind;
  return { off, on, lose };
});
check('a night match plays the night loop, slower', night.theme === 'match_night' && night.bpm < 100, night);
check('M mutes the match loop and brings the same loop back', muted.off === false && muted.on.playing && muted.on.theme === 'match_night', muted);
check('a loss plays the lose sting', muted.lose === 'lose', muted);
await page.evaluate(() => enterBedroom());
await g.scenario('bunratty_team_2v4');
const ff = await page.evaluate(() => { Music.lastSting = null; endScenario('forfeit'); return { playing: Music.playing, sting: Music.lastSting }; });
check('a forfeit stops the loop with no sting', !ff.playing && ff.sting === null, ff);

await g.spin(30);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
