// Gameplay trailer, step 2 of 2: the sound. Loads the game in a browser and renders the soundtrack offline: the bedroom
// theme from the first frame, and every sound capture.mjs logged, at its logged time, through the game's own synth
// functions, into an OfflineAudioContext (the game is handed a stand-in context whose clock reads the event's time).
// So nothing depends on timers or real-time playback, which a headless browser throttles.
// The finished buffer is saved as out/sound.wav, played once through a MediaRecorder to get opus (Playwright's ffmpeg
// has no audio encoders), and ffmpeg puts that beside the picture without re-encoding either -> out/trailer.webm.
//
//   node scripts/trailer/mix.mjs        # out/picture.webm + out/events.json -> out/trailer.webm, out/sound.wav
import { chromium } from 'playwright';
import { localBuild, ROOT } from '../../tests/lib/game.mjs';
import { ffmpegPath } from './ffmpeg.mjs';
import { spawnSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const log = JSON.parse(fs.readFileSync(path.join(OUT, 'events.json'), 'utf8'));
const duration = log.frames / log.fps;

// an http origin, so the page can hand its files back with fetch POSTs
const html = localBuild();
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const w = fs.createWriteStream(path.join(OUT, path.basename(req.url)));
    req.pipe(w); w.on('finish', () => { res.writeHead(200); res.end(); }); return;
  }
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${path.relative(ROOT, html).split(path.sep).join('/')}`;

// Playwright's bundled headless shell crashes when a MediaRecorder records audio (Windows, Oct 2026), so this step
// uses an installed Edge or Chrome (TRAILER_BROWSER=chrome to pick).
let browser = null;
for (const channel of [process.env.TRAILER_BROWSER, 'msedge', 'chrome'].filter(Boolean)) {
  try { browser = await chromium.launch({ channel, args: ['--autoplay-policy=no-user-gesture-required'] }); console.log('mixing in', channel); break; } catch (e) { /* not installed */ }
}
if (!browser) throw new Error('mix.mjs needs Microsoft Edge or Google Chrome installed');
const page = await (await browser.newContext()).newPage();
page.on('pageerror', e => console.log('page error:', e.message));
page.on('console', m => { if (m.text().startsWith('[mix]')) console.log(m.text()); });
await page.goto(url);
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof initAudio === 'function', null, { timeout: 60000 });

const lead = await page.evaluate(async ({ events, duration }) => {
  initAudio();
  const live = Game.audio.ctx; await live.resume();

  // ---- render offline ----
  const SR = 48000;
  const off = new OfflineAudioContext(2, Math.ceil(SR * (duration + 0.5)), SR);
  let T = 0;
  Game.audio.ctx = new Proxy(off, { get(t, k) { if (k === 'currentTime') return T; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });

  Music.volume = 0.22;
  startMusic('bedroom');
  clearInterval(Music.schedulerHandle); Music.schedulerHandle = null;   // we call the scheduler ourselves, on our clock
  const fadeAt = duration - 1.6, p = Game.player;
  let k = 0, played = 0, faded = false;
  const failed = {};
  for (T = 0; T < duration + 0.3; T += 0.02) {
    if (T < duration - 0.2) musicScheduler();
    while (k < events.length && events[k].t <= T) {
      const e = events[k++], t = T; T = e.t;
      if ('px' in e) { p.pos.x = e.px; p.pos.y = e.py; p.pos.z = e.pz; p.yaw = e.yaw; }   // where the player stood, for panning
      try { window[e.fn](...e.args); played++; } catch (err) { failed[e.fn] = (failed[e.fn] || 0) + 1; }
      T = t;
    }
    if (!faded && Music.masterGain && T >= fadeAt) {   // fade the theme out under the end card
      faded = true; const g = Music.masterGain.gain; g.setValueAtTime(Music.volume, T); g.linearRampToValueAtTime(0, T + 1.4);
    }
  }
  Music.playing = false;
  console.log(`[mix] ${played} sounds scheduled, failed: ${JSON.stringify(failed)}`);
  const buf = await off.startRendering();
  Game.audio.ctx = live;

  // ---- the WAV (for anyone editing the trailer elsewhere) ----
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = Math.ceil(SR * duration);
  const wav = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true);
  wav.setUint16(22, 2, true); wav.setUint32(24, SR, true); wav.setUint32(28, SR * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true);
  str(36, 'data'); wav.setUint32(40, n * 4, true);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); peak = Math.max(peak, Math.abs(l), Math.abs(r));
    wav.setInt16(44 + i * 4, l * 32767, true); wav.setInt16(46 + i * 4, r * 32767, true);
  }
  await fetch('/sound.wav', { method: 'POST', body: wav.buffer });
  console.log(`[mix] rendered ${buf.duration.toFixed(1)} s, peak ${peak.toFixed(2)}`);

  // ---- one real-time pass to encode it as opus ----
  const dest = live.createMediaStreamDestination();
  // a silent source keeps the stream live from the start (a recorder with nothing flowing never reports its start)
  const hush = live.createGain(); hush.gain.value = 0; const hum = live.createOscillator(); hum.connect(hush); hush.connect(dest); hum.start();
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
  const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  rec.start();
  await new Promise(r => { rec.onstart = r; });
  const recT0 = live.currentTime, startAt = recT0 + 0.5;
  const src = live.createBufferSource(); src.buffer = buf; src.connect(dest); src.start(startAt);
  await new Promise(r => { src.onended = r; });
  await new Promise(r => setTimeout(r, 300));
  rec.stop(); await stopped;
  await fetch('/sound.webm', { method: 'POST', body: new Blob(chunks, { type: 'audio/webm' }) });
  return startAt - recT0;   // seconds of silence before the soundtrack starts in sound.webm
}, { events: log.events, duration });

await browser.close(); server.close(); try { fs.unlinkSync(html); } catch {}

const r = spawnSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'picture.webm'), '-ss', lead.toFixed(3), '-i', path.join(OUT, 'sound.webm'),
  '-map', '0:v', '-map', '1:a', '-c', 'copy', '-t', String(duration), path.join(OUT, 'trailer.webm')], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
console.log(`wrote out/trailer.webm and out/sound.wav (${duration.toFixed(1)} s, ${log.events.length} sounds, ${lead.toFixed(3)} s trimmed)`);
process.exit(0);
