// v1.463 (backlog D.9, recorded voices; Michael: A, 21 Oct): puts a folder of VoiceStudio clips into the game.
// Every file is named for a clip (docs/voice_script.md, "How a clip is named"): `seth.taunt.3.mp3`, `seth.teammate.4.ogg`.
// It checks every name against the script, reports the unknown ones and what is still missing, kid by kid, and writes
// the clips into js/28-voice-clips.js (VOICE_CLIPS), each with its line's words, its length and its audio as base64.
//
//   node scripts/voicepack.mjs <folder>              check, report, write js/28-voice-clips.js (the folder is the pack)
//   node scripts/voicepack.mjs <folder> --keep       also keep the clips already in the file that the folder lacks
//   node scripts/voicepack.mjs <folder> --dry-run    check and report only
//   node scripts/voicepack.mjs --clear               empty VOICE_CLIPS (the browser voice says everything again)
//   --max-mb <n>                                     refuse a pack over n MB (default 8, the cap in the v1.463 entry)
//   --missing                                        list every missing clip of the kids' own lines, not only the count
//   --out <file>                                     write there instead of js/28-voice-clips.js (the suite does)
//   --raw                                            put .wav files in as they are (it makes them MP3s when ffmpeg is installed)
//
// No dependencies (ffmpeg only if it is installed, for WAVs): it reads the length of a .wav, .ogg (Opus or Vorbis) or .mp3 itself. Nothing in the game is changed
// but js/28-voice-clips.js; run node scripts/parsecheck.mjs after, and play a match.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'docs', 'voice_script.md');
const CLIPS = path.join(ROOT, 'js', '28-voice-clips.js');
const MIME = { '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webm': 'audio/webm', '.m4a': 'audio/mp4' };

// ---- the script: its lines, its kids and the band each kid draws from ----
export function readScript(md) {
  const lines = {}, kids = {}, named = new Set();
  let kid = null;
  for (const ln of md.split('\n')) {
    let m = /^### .+ \(`([a-z0-9_]+)`\)$/.exec(ln);
    if (m) { kid = m[1]; kids[kid] = { band: null }; continue; }
    if (/^### `/.test(ln) || /^## Shared/.test(ln)) kid = null;
    m = /^\*\*Shared tables:\*\* `band\.([a-z_]+)\.\*`/.exec(ln);
    if (m && kid) kids[kid].band = m[1];
    m = /^\| `([^`]+)` \| (.*?) \| ([^|]*)\|$/.exec(ln);
    if (m) { lines[m[1]] = m[2].replace(/\\\|/g, '|'); if (m[2].includes('{name}')) named.add(m[1]); }
  }
  return { lines, kids, named };
}

// a clip's name -> { key, lineId, kid, name } or { error }
export function resolveClip(base, S) {
  const [key0, name] = base.split('@');
  const dot = key0.indexOf('.');
  const kid = key0.slice(0, dot);
  if (!S.kids[kid]) return { error: `no kid "${kid}" in the script` };
  let lineId = S.lines[key0] !== undefined && key0.startsWith(kid + '.') ? key0 : key0.slice(dot + 1);
  if (S.lines[lineId] === undefined) return { error: `no line "${key0}" (nor "${lineId}") in the script` };
  if (lineId.startsWith(kid + '.') && lineId !== key0) return { error: 'a kid’s own line is named once, not twice' };
  if (lineId.startsWith('band.') && lineId.split('.')[1] !== S.kids[kid].band) return { error: `${kid} does not say the ${lineId.split('.')[1]} lines` };
  if (/^[a-z0-9_]+\./.test(lineId) && !lineId.startsWith(kid + '.') && S.kids[lineId.split('.')[0]]) return { error: `that is ${lineId.split('.')[0]}’s line, not ${kid}’s` };
  if (name !== undefined && (!S.named.has(lineId) || !/^[a-z0-9]+$/.test(name))) return { error: '@name only goes on a {name} line, in lower-case letters' };
  if (name === undefined && S.named.has(lineId)) return { error: 'a {name} line needs @<name> (the friend it names)' };
  return { key: base, lineId, kid, name };
}

// ---- lengths, read from the files themselves ----
function wavSeconds(b) {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null;
  let p = 12, rate = 0, align = 0;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { rate = b.readUInt32LE(p + 12); align = b.readUInt16LE(p + 20); }
    if (id === 'data' && rate && align) return Math.min(n, b.length - p - 8) / align / rate;
    p += 8 + n + (n & 1);
  }
  return null;
}
function oggSeconds(b) {
  if (b.toString('ascii', 0, 4) !== 'OggS') return null;
  const head = b.indexOf('OpusHead'), vorb = b.indexOf('\x01vorbis');
  let rate = 0, pre = 0;
  if (head >= 0) { rate = 48000; pre = b.readUInt16LE(head + 10); }
  else if (vorb >= 0) rate = b.readUInt32LE(vorb + 12);
  if (!rate) return null;
  let last = -1;
  for (let p = b.lastIndexOf('OggS'); p >= 0; p = b.lastIndexOf('OggS', p - 1)) { last = p; break; }
  if (last < 0) return null;
  const gran = Number(b.readBigUInt64LE(last + 6));
  return Math.max(0, gran - pre) / rate;
}
function mp3Seconds(b) {
  let p = 0;
  if (b.toString('ascii', 0, 3) === 'ID3') p = 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127));
  const RATES = { 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
  const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  let frames = 0, secs = 0;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff || (b[p + 1] & 0xe0) !== 0xe0) { p++; continue; }
    const ver = (b[p + 1] >> 3) & 3, layer = (b[p + 1] >> 1) & 3, bi = b[p + 2] >> 4, si = (b[p + 2] >> 2) & 3, pad = (b[p + 2] >> 1) & 1;
    if (layer !== 1 || ver === 1 || bi === 0 || bi === 15 || si === 3) { p++; continue; }   // layer III only
    const kbps = RATES[ver === 3 ? 3 : 2][bi], rate = SR[ver][si], spf = ver === 3 ? 1152 : 576;
    const len = Math.floor((spf / 8) * kbps * 1000 / rate) + pad;
    if (len < 4) { p++; continue; }
    frames++; secs += spf / rate; p += len;
  }
  return frames ? secs : null;
}
export function clipSeconds(buf, ext) {
  if (ext === '.wav') return wavSeconds(buf);
  if (ext === '.ogg' || ext === '.opus') return oggSeconds(buf);
  if (ext === '.mp3') return mp3Seconds(buf);
  return null;
}

// ---- the clips file ----
const HEADER = `// v1.462 (backlog D.9, recorded voices; Michael: A, 21 Oct): the recorded voices, one kid reading one line each.
// WRITTEN BY scripts/voicepack.mjs from a folder of VoiceStudio clips: do not edit by hand. A key is a clip's name
// (docs/voice_script.md, "How a clip is named"); \`text\` is the line's words when it was recorded, and the clip plays
// only while the game's line still says them (the browser voice says it otherwise); \`sec\` its length; \`b64\` the audio.
// The audio is decoded the first time its line is said (voiceClipPlay in 20-characters), never at startup.
`;
export function readClips(src) {
  const out = {};
  for (const m of src.matchAll(/^ {2}("[^"]+"): (\{.*\}),$/gm)) out[JSON.parse(m[1])] = JSON.parse(m[2]);
  return out;
}
export function writeClips(clips) {
  const keys = Object.keys(clips).sort();
  const body = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(clips[k])},`).join('\n');
  return `${HEADER}const VOICE_CLIPS = {\n${body}${body ? '\n' : ''}};\n`;
}

// ---- the command ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = n => args.includes(n);
  const opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
  const maxMb = Number(opt('--max-mb') || 8);
  const OUTFILE = opt('--out') ? path.resolve(opt('--out')) : CLIPS;   // the suite writes a copy, never the game's
  if (flag('--clear')) { fs.writeFileSync(OUTFILE, writeClips({})); console.log('VOICE_CLIPS emptied: the browser voice says every line.'); process.exit(0); }
  const dir = args.find((a, i) => !a.startsWith('--') && !['--max-mb', '--out'].includes(args[i - 1]));
  if (!dir || !fs.existsSync(dir)) { console.error('usage: node scripts/voicepack.mjs <folder of clips> [--keep] [--dry-run] [--max-mb n] [--missing]'); process.exit(2); }
  const S = readScript(fs.readFileSync(SCRIPT, 'utf8'));
  const old = fs.existsSync(OUTFILE) ? readClips(fs.readFileSync(OUTFILE, 'utf8')) : {};
  const clips = flag('--keep') ? { ...old } : {};
  const bad = [], seen = new Set();
  let added = 0, encoded = 0;
  // a .wav (VoiceStudio's export) is made an MP3 when ffmpeg is installed: mono, 24 kHz, 40 kbps, the silence before and
  // after the words cut off. MP3 because every browser decodes it (an Ogg won't decode on older Safari). --raw keeps the WAV.
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse';
  const encodeMp3 = file => {
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-af', trim, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', '-f', 'mp3', '-'], { maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error(`ffmpeg could not encode ${file}: ${r.stderr}`);
    return r.stdout;
  };
  if (!ffmpeg) console.log('ffmpeg is not installed: .wav files go in as they are (large). Install ffmpeg, or export MP3 from VoiceStudio.');
  for (const f of fs.readdirSync(dir).sort()) {
    const ext = path.extname(f).toLowerCase(), base = f.slice(0, -ext.length);
    if (!MIME[ext]) { if (!f.startsWith('.')) bad.push(`${f}: not a sound file this takes (${Object.keys(MIME).join(' ')})`); continue; }
    const r = resolveClip(base, S);
    if (r.error) { bad.push(`${f}: ${r.error}`); continue; }
    if (seen.has(base)) { bad.push(`${f}: a second file for ${base}`); continue; }
    seen.add(base);
    let buf = fs.readFileSync(path.join(dir, f)), kind = ext;
    if (ext === '.wav' && ffmpeg && !flag('--raw')) { buf = encodeMp3(path.join(dir, f)); kind = '.mp3'; encoded++; }
    const sec = clipSeconds(buf, kind);
    if (sec !== null && (sec < 0.2 || sec > 8)) { bad.push(`${f}: ${sec.toFixed(2)} s long (a line is 0.2-8 s)`); continue; }
    clips[base] = { text: S.lines[r.lineId], sec: sec === null ? null : +sec.toFixed(2), mime: MIME[kind], b64: buf.toString('base64') };
    added++;
  }
  // what is still missing: each kid's own lines (the shared ones are optional, and many)
  const ownIds = Object.keys(S.lines).filter(id => S.kids[id.split('.')[0]]);
  const missing = ownIds.filter(id => !clips[id]);
  const byKid = {};
  for (const id of missing) byKid[id.split('.')[0]] = (byKid[id.split('.')[0]] || 0) + 1;
  const stale = Object.entries(clips).filter(([k, c]) => { const r = resolveClip(k, S); return r.error || S.lines[r.lineId] !== c.text; }).map(([k]) => k);
  const total = Object.keys(clips).length, secs = Object.values(clips).reduce((n, c) => n + (c.sec || 0), 0);
  const src = writeClips(clips), mb = Buffer.byteLength(src) / 1e6;
  console.log(`${added} clips read from ${dir}${encoded ? ` (${encoded} WAVs made MP3s)` : ''}; the pack holds ${total} (${secs.toFixed(1)} s of audio).`);
  console.log(`${path.relative(ROOT, OUTFILE)} would be ${mb.toFixed(2)} MB${secs > 0 ? `: ${(mb / (secs / 60)).toFixed(2)} MB a minute of audio` : ''} (cap ${maxMb} MB).`);
  console.log(`the kids' own lines: ${ownIds.length - missing.length} of ${ownIds.length} recorded.`);
  if (missing.length) console.log('  still missing, by kid: ' + Object.entries(byKid).map(([k, n]) => `${k} ${n}`).join(', '));
  if (flag('--missing')) for (const id of missing) console.log(`    ${id}  ${S.lines[id]}`);
  if (stale.length) console.log(`${stale.length} clips no longer match their line's words (they will not play; record them again): ${stale.slice(0, 20).join(', ')}`);
  if (bad.length) { console.error(`${bad.length} files were not taken:`); for (const b of bad) console.error('  ' + b); }
  if (mb > maxMb) { console.error(`over the cap: ${mb.toFixed(2)} MB > ${maxMb} MB. Export smaller (mono, 32-48 kbps) or pass --max-mb.`); process.exit(1); }
  if (flag('--dry-run')) { console.log('dry run: nothing written.'); process.exit(bad.length ? 1 : 0); }
  fs.writeFileSync(OUTFILE, src);
  console.log(`wrote ${path.relative(ROOT, OUTFILE)}. Next: node scripts/parsecheck.mjs, then play a match.`);
  process.exit(bad.length ? 1 : 0);
}
