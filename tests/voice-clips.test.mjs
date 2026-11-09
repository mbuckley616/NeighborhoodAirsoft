// v1.461 (backlog D.9, recorded voices; Michael: A, 21 Oct): every line the game can speak has a stable id, and
// docs/voice_script.md (the script Michael records with VoiceStudio) holds every one of them with its words.
//   1. the catalog: ids unique; docs/voice_script.md and the game agree line for line, both ways;
//   2. the picks: every line pickVoiceLine can give any kid in any situation has an id in the script, with the same
//      words, and the kid is one who may say it; the noodle, the squad's walkie answers and the crew's lines in the
//      room have theirs;
//   3. headless rounds: every line in VOICE.log carries its id.
import fs from 'fs';
import path from 'path';
import { boot, check, ROOT } from './lib/game.mjs';
import { parseScript } from '../scripts/voicescript.mjs';

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

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
