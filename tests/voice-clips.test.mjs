// v1.461 (backlog D.9, recorded voices; Michael: A, 21 Oct): every line the game can speak has a stable id, and
// docs/voice_script.md (the script Michael records with VoiceStudio) holds every one of them with its words.
//   1. the catalog: ids unique; docs/voice_script.md and the game agree line for line, both ways;
//   2. the picks: every line pickVoiceLine can give any kid in any situation has an id in the script, with the same
//      words, and the kid is one who may say it; the noodle, the squad's walkie answers and the crew's lines in the
//      room have theirs;
//   3. headless rounds: every line in VOICE.log carries its id.
// v1.462: the clip player, with a tiny generated clip (a WAV made here) under a kid's lines:
//   4. the shipped VOICE_CLIPS is empty; with no clip the browser voice speaks; with one the clip plays and
//      speechSynthesis is never asked; a clip whose words no longer match, or that won't decode, falls back to the
//      browser voice; the cooldowns and the no-repeat memory hold with clips; the walkie, the noodle and an order's
//      answer play theirs; the end of the round stops a clip.
// v1.463: scripts/voicepack.mjs:
//   5. a folder of WAVs (some well named, some not) packed with --raw into tests/tmp: the bad names are reported, the
//      missing own lines counted, and the file it writes loads in the game and plays.
// speechSynthesis is silent in headless Chromium, so this tests the choice and the queue, not the sound.
import fs from 'fs';
import path from 'path';
import { boot, check, ROOT } from './lib/game.mjs';
import { parseScript } from '../scripts/voicescript.mjs';
import { spawnSync } from 'child_process';

const script = parseScript(fs.readFileSync(path.join(ROOT, 'docs', 'voice_script.md'), 'utf8'));
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

// ---- 1. the catalog against the script ----
const cat = await page.evaluate(() => voiceLineCatalog());
const ids = cat.map(l => l.id), dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log(`  ${cat.length} lines in the game, ${Object.keys(script).length} in docs/voice_script.md`);
check('every line id is unique', dupes.length === 0, dupes);
const missing = cat.filter(l => script[l.id] !== l.text).map(l => `${l.id}: ${l.text} / script: ${script[l.id]}`);
check('every line the game has is in the script with the same words', missing.length === 0, missing.slice(0, 10));
const extra = Object.keys(script).filter(id => !ids.includes(id));
check('the script holds no line the game does not have', extra.length === 0, extra.slice(0, 10));

// ---- 2. every pick has its id ----
const picks = await page.evaluate(() => {
  const byId = Object.fromEntries(voiceLineCatalog().map(l => [l.id, l]));
  const out = { pairs: 0, draws: 0, bad: [] };
  for (const kid of Object.keys(CHARACTERS)) {
    const cats = new Set([...Object.keys(VOICE_LINES[kid] || {}), ...Object.keys(VOICE_LINES_DEFAULT[voiceBand(kid)]),
      ...Object.keys(VOICE_EXCUSES).map(w => 'excuse_' + w), 'teammate', 'infection']);
    for (const c of cats) {
      const { own, band } = voiceLinePools(kid, c);
      out.pairs++;
      for (const line of [...own, ...band]) {
        out.draws++;
        const id = voiceLineIdFor(kid, c, line), l = byId[id];
        if (!l || l.text !== line || (l.speakers && !l.speakers.includes(kid))) out.bad.push(`${kid}.${c}: ${line} -> ${id}`);
      }
      const sp = {}; VOICE.recentLines = [];
      for (let i = 0; i < 20; i++) { const line = pickVoiceLine(kid, c, sp); if (!byId[voiceLineIdFor(kid, c, line)]) out.bad.push(`pick ${kid}.${c}: ${line}`); }
    }
  }
  const has = (id, text) => byId[id] && byId[id].text === text;
  out.noodle = NOODLE_LINES.every((l, i) => has(`noodle.${i + 1}`, l));
  out.squad = Object.entries(SQUAD_ORDERS).every(([k, o]) => o.replies.every((l, i) => has(`squad.${k}.${i + 1}`, l)));
  out.home = Object.entries(CREW_HOME_LINES).every(([k, ls]) => ls.every((l, i) => has(`${k}.home.${i + 1}`, l.replace(/[“”]/g, '')))) && has('home.1', 'Hey.');
  return out;
});
console.log(`  ${picks.pairs} (kid, situation) pools, ${picks.draws} lines walked`);
check('every line any kid can draw maps to its id, its words and a kid who may say it', picks.bad.length === 0, picks.bad.slice(0, 10));
check('the noodle lines, the squad answers and the crew’s room lines have their ids', picks.noodle && picks.squad && picks.home, picks);

// ---- 3. a round: every line said carries its id ----
await g.scenario('winnmark_team_3v3');
await page.evaluate(() => { Game.player.maxHits = 999; VOICE.log.length = 0; Game.mouse.locked = true; });
await g.spin(60 * 40);
const log = await page.evaluate(() => {
  const ids = new Set(voiceLineCatalog().map(l => l.id));
  return VOICE.log.map(e => ({ id: e.id, line: e.line, ok: ids.has(e.id) }));
});
console.log(`  ${log.length} lines said in 40 s of a team 3v3`);
check('a round says something, and every line said has its id', log.length > 0 && log.every(e => e.ok), log.filter(e => !e.ok));

// ---- 4. the clip player ----
const wav = (() => {   // 0.3 s of a quiet 220 Hz tone, 8 kHz mono 16-bit
  const n = 2400, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 8000) * 3000), 44 + i * 2);
  return b.toString('base64');
})();
const setup = await page.evaluate(() => {
  window._spoke = [];
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.speak = u => window._spoke.push(u.text);
  const S = Game.scenario, P = Game.player.pos;
  const k = S.enemies.find(e => (e.team || 'enemy') !== 'player' && e.health > 0 && e.state !== 'retreating');
  k.pos.x = P.x + 2; k.pos.z = P.z - 4;
  window._k = k;
  return { shipped: Object.keys(VOICE_CLIPS).length, ctx: !!Game.audio?.ctx, speech: typeof speechSynthesis !== 'undefined', kid: k.charId };
});
console.log('  ', JSON.stringify(setup));
check('the game ships with VOICE_CLIPS empty', setup.shipped === 0, setup);
check('headless Chromium has an audio context and speechSynthesis to spy on', setup.ctx && setup.speech, setup);
// say a taunt now: the cooldowns cleared, the clock moved on
const say = (cat = 'taunt') => page.evaluate(cat => {
  const S = Game.scenario, k = window._k;
  S.roundTime = (S.roundTime || 0) + 5; VOICE.globalCooldownUntil = 0; k._voiceCooldownUntil = 0;
  const before = window._spoke.length, clips = VOICE_CLIP.log.length;
  const ok = tryNpcSpeak(k, cat);
  const last = VOICE.log.at(-1);
  return { ok, tts: window._spoke.length - before, clip: VOICE_CLIP.log.length - clips, id: last.id, key: voiceClipKey(k.charId, last.id), line: last.line };
}, cat);
const none = await say();
check('with no clip the browser voice speaks the line', none.ok && none.tts === 1 && none.clip === 0, none);
// a clip under every taunt he can say
const filled = await page.evaluate(b64 => {
  const k = window._k, { own, band } = voiceLinePools(k.charId, 'taunt');
  for (const l of [...own, ...band]) VOICE_CLIPS[voiceClipKey(k.charId, voiceLineIdFor(k.charId, 'taunt', l))] = { text: l, sec: 0.3, mime: 'audio/wav', b64 };
  return Object.keys(VOICE_CLIPS).length;
}, wav);
const one = await say();
await page.waitForFunction(() => ['playing', 'done'].includes(VOICE_CLIP.log.at(-1)?.state), null, { timeout: 20000 }).catch(() => {});
const played = await page.evaluate(() => VOICE_CLIP.log.at(-1));
console.log(`  ${filled} clips; said "${one.line}" as ${one.key}:`, JSON.stringify(played));
check('with his clip the clip plays and speechSynthesis is never asked', one.ok && one.tts === 0 && one.clip === 1 && played.key === one.key, { one, played });
check('the clip decodes and plays (0.3 s)', ['playing', 'done'].includes(played.state) && Math.abs(played.sec - 0.3) < 0.02, played);
// the cooldowns and the no-repeat memory with clips
const pace = await page.evaluate(() => {
  const S = Game.scenario, k = window._k;
  S.roundTime += 5; VOICE.globalCooldownUntil = 0; k._voiceCooldownUntil = 0;
  const a = tryNpcSpeak(k, 'taunt'), b = tryNpcSpeak(k, 'taunt');
  S.roundTime += 2; const c = tryNpcSpeak(k, 'taunt');
  const lines = [];
  for (let i = 0; i < 40; i++) { S.roundTime += 4.1; VOICE.globalCooldownUntil = 0; if (tryNpcSpeak(k, 'taunt')) lines.push(VOICE.log.at(-1).line); }
  let rep = 0; for (let i = 1; i < lines.length; i++) if (lines[i] === lines[i - 1] || lines[i] === lines[i - 2]) rep++;
  return { a, b, c, said: lines.length, rep, tts: window._spoke.length };
});
check('with clips a kid still waits 1.5 s after anyone and 4 s after himself', pace.a && !pace.b && !pace.c, pace);
check('with clips 40 taunts 4.1 s apart are all said, none repeating the last two', pace.said === 40 && pace.rep === 0, pace);
// stale words and a clip that won't decode fall back
const stale = await page.evaluate(() => { for (const c of Object.values(VOICE_CLIPS)) c.text = c.text + ' (old take)'; return true; });
const st = await say();
check('a clip whose words no longer match the line is not played: the browser voice says it', st.tts === 1 && st.clip === 0, st);
await page.evaluate(() => { for (const c of Object.values(VOICE_CLIPS)) { c.text = c.text.replace(' (old take)', ''); c.b64 = btoa('not a sound at all, just words'); } VOICE_CLIP.buffers.clear(); });
const br = await say();
await page.waitForFunction(() => VOICE_CLIP.log.at(-1)?.state === 'failed', null, { timeout: 20000 }).catch(() => {});
const brOut = await page.evaluate(k => ({ state: VOICE_CLIP.log.at(-1).state, spoke: window._spoke.at(-1), failed: VOICE_CLIP.failed.has(k) }), br.key);
check('a clip that will not decode falls back to the browser voice once, and is not tried again', br.clip === 1 && brOut.state === 'failed' && brOut.failed && brOut.spoke === br.line, { br, brOut });
// the walkie, an order's answer and the noodle
const others = await page.evaluate(b64 => {
  const k = window._k, S = Game.scenario, out = {};
  VOICE_CLIPS[voiceClipKey(k.charId, 'squad.push.1')] = { text: SQUAD_ORDERS.push.replies[0], sec: 0.3, mime: 'audio/wav', b64 };
  VOICE_CLIPS[voiceClipKey(k.charId, 'noodle.2')] = { text: NOODLE_LINES[1], sec: 0.3, mime: 'audio/wav', b64 };
  let n = VOICE_CLIP.log.length, t = window._spoke.length;
  S.roundTime += 5; squadWalkieSay(k, SQUAD_ORDERS.push.replies[0], 'squad.push.1');
  out.squad = { clip: VOICE_CLIP.log.length - n, walkie: VOICE_CLIP.log.at(-1).walkie, tts: window._spoke.length - t };
  n = VOICE_CLIP.log.length; t = window._spoke.length;
  S.roundTime += 5; kidSayLine(k, NOODLE_LINES[1], 'noodle.2');
  out.noodle = { clip: VOICE_CLIP.log.length - n, tts: window._spoke.length - t, cool: k._voiceCooldownUntil > S.roundTime };
  n = VOICE_CLIP.log.length; t = window._spoke.length;
  S.roundTime += 5; kidSayLine(k, NOODLE_LINES[2], 'noodle.3');
  out.noClip = { clip: VOICE_CLIP.log.length - n, tts: window._spoke.length - t };
  return out;
}, wav);
check('an order’s answer plays his clip over the walkie; the noodle line plays his, and sets his cooldown', others.squad.clip === 1 && others.squad.walkie && others.squad.tts === 0 && others.noodle.clip === 1 && others.noodle.tts === 0 && others.noodle.cool, others);
check('a noodle line he has no clip for is the browser voice', others.noClip.clip === 0 && others.noClip.tts === 1, others);
await page.waitForFunction(() => ['playing', 'done'].includes(VOICE_CLIP.log.at(-1)?.state) || VOICE_CLIP.log.at(-1)?.state === 'failed', null, { timeout: 20000 }).catch(() => {});
const end = await page.evaluate(() => {
  const k = window._k;
  VOICE_CLIPS[voiceClipKey(k.charId, 'noodle.4')] = { ...VOICE_CLIPS[voiceClipKey(k.charId, 'noodle.2')], text: NOODLE_LINES[3], sec: 3 };
  Game.scenario.roundTime += 5; kidSayLine(k, NOODLE_LINES[3], 'noodle.4');
  return VOICE_CLIP.log.at(-1).key;
});
await page.evaluate(() => endScenario('lose'));
const ended = await page.evaluate(() => ({ live: VOICE_CLIP.live, state: VOICE_CLIP.log.at(-1).state }));
check('the end of the round stops a clip', ended.live === null && ['cut', 'dropped'].includes(ended.state), { end, ended });

// ---- 5. the packing script ----
const dir = path.join(ROOT, 'tests', 'tmp', `voicepack.${process.pid}`), out = path.join(dir, 'clips.js');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'pack'), { recursive: true });
const wavBuf = Buffer.from(wav, 'base64');
const names = ['seth.taunt.1', 'seth.teammate.4', 'seth.band.mid_agg.taunt.2', 'seth.band.high_agg.taunt.2', 'seth.trey.taunt.1', 'nobody.taunt.1', 'seth.taunt.99'];
for (const n of names) fs.writeFileSync(path.join(dir, 'pack', n + '.wav'), wavBuf);
const run = spawnSync('node', [path.join(ROOT, 'scripts', 'voicepack.mjs'), path.join(dir, 'pack'), '--raw', '--out', out], { encoding: 'utf8' });
const said = run.stdout + run.stderr;
console.log(said.split('\n').filter(l => /clips read|MB|own lines|not taken|  [a-z]+\..*: /.test(l)).map(l => '    ' + l.slice(0, 150)).join('\n'));
check('voicepack takes the three good names and reports the four bad ones', /3 clips read/.test(said) && /4 files were not taken/.test(said) &&
  /seth does not say the high_agg lines/.test(said) && /that is trey’s line/.test(said) && /no kid "nobody"/.test(said) && /seth\.taunt\.99/.test(said) && run.status === 1, { status: run.status });
check('it counts the kids’ own lines still missing', /1 of \d+ recorded/.test(said), { status: run.status });
const packed = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
const loaded = await page.evaluate(src => {
  const clips = new Function(src + '\nreturn VOICE_CLIPS;')();
  for (const k of Object.keys(VOICE_CLIPS)) delete VOICE_CLIPS[k];
  Object.assign(VOICE_CLIPS, clips); VOICE_CLIP.failed.clear(); VOICE_CLIP.buffers.clear();
  return { keys: Object.keys(clips).sort(), text: clips['seth.taunt.1']?.text, sec: clips['seth.taunt.1']?.sec };
}, packed);
check('the file it writes loads, with the line’s words and length', loaded.keys.join() === 'seth.band.mid_agg.taunt.2,seth.taunt.1,seth.teammate.4' && loaded.sec === 0.3, loaded);
const seth = await page.evaluate(() => {
  const k = { charId: 'seth', pos: Game.player.pos.clone().add(new THREE.Vector3(2, 0, -3)) };
  const t = window._spoke.length; kidSayLine(k, VOICE_LINES.seth.taunt[0], 'seth.taunt.1');
  return { key: VOICE_CLIP.log.at(-1).key, tts: window._spoke.length - t };
});
await page.waitForFunction(() => ['playing', 'done', 'failed'].includes(VOICE_CLIP.log.at(-1)?.state), null, { timeout: 20000 }).catch(() => {});
const sethState = await page.evaluate(() => VOICE_CLIP.log.at(-1).state);
check('and Seth’s packed clip plays in the game', seth.key === 'seth.taunt.1' && seth.tts === 0 && ['playing', 'done'].includes(sethState), { seth, sethState });
fs.rmSync(dir, { recursive: true, force: true });

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
