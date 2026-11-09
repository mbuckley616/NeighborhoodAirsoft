// v1.461 (backlog D.9, recorded voices; Michael: A, 21 Oct): writes docs/voice_script.md, the script Michael feeds
// VoiceStudio: every line the game can speak, by kid, with its id, the tone and a one-line voice brief per kid.
// The lines come from the game itself (voiceLineCatalog in js/20-characters.js, read in headless Chromium), so the
// script is never out of step with the tables; tests/voice-clips.test.mjs fails when it is.
//
//   node scripts/voicescript.mjs            write docs/voice_script.md
//   node scripts/voicescript.mjs --check    exit 1 when the file on disk differs from what it would write
import fs from 'fs';
import path from 'path';
import { boot, ROOT } from '../tests/lib/game.mjs';

const OUT = path.join(ROOT, 'docs', 'voice_script.md');

// how each kid talks: from the comments over his lines in js/20-characters.js and his CHARACTERS entry (height, build,
// aggression). The ages are the game's: the neighbourhood kids are about 12, Hollins Ridge High's about 15.
export const VOICE_BRIEFS = {
  seth:      'About 12. The ringleader who hosts the games: friendly trash talk, easy laugh, owns his yard.',
  trey:      'About 12. Cocky, laughs when you walk into it; short clipped lines, a smirk in the voice.',
  brooke:    'About 12, small. The best shot on the court: dry, a smirk, sorry not sorry.',
  jamie:     'About 12. The new kid on the block: steady, polite, a bit unsure, never talks trash.',
  marcus:    'About 13, big and loud. Seth’s cousin visiting for the summer: pushy, doesn’t know the yards.',
  devon:     'About 12. The careful one who plays sniper: patient, quiet, precise words.',
  tyler:     'About 13, tall. Laid back, slow drawl, “aight”.',
  garrett:   'About 12. Seth’s crew: calm, sure of himself, a little bored by how easy it is.',
  sean:      'About 12. The AK, spray and pray: loud, excitable, shouts a lot.',
  nick:      'About 13, big. Calm and low, “keep moving”.',
  ryan:      'About 11. The quick flanker, Mitchell’s brother: hyped, fast talker.',
  mitchell:  'About 13. The steady marksman, Ryan’s brother: calm, few words.',
  joe:       'About 12. The good shot with the nice gun: quick, a little smug about his gear.',
  chris:     'About 12. The athlete: fast, loud, always charging, out of breath.',
  owen:      'About 13, heavy. The immovable anchor: slow, flat, unbothered; he just waits.',
  eric:      'About 11, short. Fast, fires a lot, eager: “again?”.',
  rebecca:   'About 12. Unbothered and accurate: cool, a little superior, “predictable”.',
  andrew:    'About 13, big. Friendly and warm, a thumbs up for a good play.',
  alex:      'About 12. Andrew’s buddy, the smart aleck: quick, “told you he’d try that”.',
  evan:      'About 12. The good sport: cheerful, fair, “best of three?”.',
  haden:     'About 11. A twin with Connor: loud, yelling for his brother.',
  connor:    'About 11. A twin with Haden: loud, yelling for his brother (a touch different from Haden).',
  mason:     'About 13. The sportsman: fair, upbeat, like a team captain.',
  christian: 'About 11. The excitable one: high energy, everything is a big deal.',
  fernando:  'About 12. One of a pair with Diego: careful, gives the signals.',
  diego:     'About 12. One of a pair with Fernando: cool and short, “tch”.',
  colin:     'About 11. Seth’s crew: loud, fast, always running straight at you.',
  jordan:    'About 15, a high schooler. Easygoing, knows the portables.',
  caleb:     'About 15, a high schooler. Fast and pushy, always nearly made it.',
  nathan:    'About 15, a high schooler with glasses. Patient, has worked out where you’ll go.',
  sophie:    'About 15, a high schooler. The best shot at the school: cool, confident.',
  grant:     'About 15, a high schooler, big. Quiet, never leaves the cars.',
  malik:     'About 15, a high schooler. The shotgun: wants you close, bold.',
};

const SITUATION_ORDER = ['playerHit', 'playerOut', 'npcHit', 'excuse', 'playerSpotted', 'taunt', 'roundStart', 'pressed',
  'shotWhileOut', 'allyDown', 'teammate', 'squad', 'infection', 'noodle', 'home'];
const sitRank = s => { const i = SITUATION_ORDER.indexOf(s); return i < 0 ? 99 : i; };
const cell = s => String(s).replace(/\|/g, '\\|');

export async function readCatalog() {
  const g = await boot();
  try {
    return await g.page.evaluate(() => ({
      lines: voiceLineCatalog(),
      tone: VOICE_SITUATION_TONE,
      kids: Object.fromEntries(Object.keys(CHARACTERS).map(k => [k, { name: CHARACTERS[k].name, height: CHARACTERS[k].height, build: CHARACTERS[k].build, band: voiceBand(k) }])),
    }));
  } finally { await g.close(); }
}

export function render({ lines, tone, kids }) {
  const own = {}, shared = [];
  for (const l of lines) {
    if (l.speakers && l.speakers.length === 1 && l.id.startsWith(l.speakers[0] + '.')) (own[l.speakers[0]] = own[l.speakers[0]] || []).push(l);
    else shared.push(l);
  }
  const bands = { high_agg: 'pushy', mid_agg: 'middling', low_agg: 'quiet' };
  const total = lines.length, ownN = Object.values(own).reduce((n, a) => n + a.length, 0);
  const o = [];
  o.push('# Voice script', '');
  o.push('Every line the game can speak, by kid, for recording with VoiceStudio (backlog D.9, Michael: A, 21 Oct 2026).');
  o.push('**Generated** by `node scripts/voicescript.mjs` from the game’s own line tables: do not edit it by hand; change the');
  o.push('lines in `js/` and run the script again. `tests/voice-clips.test.mjs` fails when this file and the game disagree.', '');
  o.push(`${total} lines: ${ownN} are one kid’s own (his section below), ${shared.length} are shared lines that any kid of a kind may say (the`);
  o.push('last section).', '');
  o.push('## How a clip is named', '');
  o.push('A clip is one kid’s reading of one line, saved as `<clip name>.ogg` (or `.mp3`, `.wav`):');
  o.push('- **His own line:** the clip name is the line’s id, as listed: `seth.taunt.3.ogg`.');
  o.push('- **A shared line:** his id, a dot, then the line’s id: Seth saying `teammate.4` is `seth.teammate.4.ogg`. Each');
  o.push('  kid’s section says which shared tables he draws from.');
  o.push('- **A line with {name}** (a friend’s name goes in when it is said): add `@` and the friend’s name in lower case,');
  o.push('  `seth.band.mid_agg.allyDown.1@sean.ogg`. These are many recordings for one line; leave them to the browser voice.', '');
  o.push('A line with no clip is spoken by the browser voice, as now, so a pack can be recorded a kid at a time.');
  o.push('`node scripts/voicepack.mjs <folder>` checks a folder of clips against this file and puts them in the game.', '');
  o.push('**Recording order:** each kid’s own lines first. A kid says one of his own lines 7 times in 10 (an excuse 1 in 2),');
  o.push('so his own lines are most of what you hear from him.', '');
  o.push('## The kids', '');
  for (const k of Object.keys(kids)) {
    const K = kids[k], mine = (own[k] || []).slice().sort((a, b) => sitRank(a.situation) - sitRank(b.situation));
    o.push(`### ${K.name} (\`${k}\`)`, '');
    o.push(`**Voice:** ${VOICE_BRIEFS[k] || 'A neighbourhood kid.'} ${K.height === 'short' ? 'Short' : K.height === 'tall' ? 'Tall' : 'Average height'}, ${K.build} build; a ${bands[K.band]} talker.`);
    o.push(`**Shared tables:** \`band.${K.band}.*\`, \`excuse.*\`, \`teammate.*\`, \`squad.*\`, \`infection.*\`, \`noodle.*\`${kids[k] && !mine.some(l => l.situation === 'home') ? ', `home.1`' : ''}.`, '');
    if (!mine.length) { o.push('No lines of his own: he says only the shared tables.', ''); continue; }
    o.push('| Id | Line | Tone |', '|---|---|---|');
    for (const l of mine) o.push(`| \`${l.id}\` | ${cell(l.text)} | ${tone[l.situation] || l.situation} |`);
    o.push('');
  }
  o.push('## Shared lines', '');
  o.push('Said by any kid named in **Who**: record each under that kid’s id (`<kid>.<id>`).', '');
  const groups = {};
  for (const l of shared) { const g = l.id.split('.').slice(0, l.id.startsWith('band.') ? 2 : 1).join('.'); (groups[g] = groups[g] || []).push(l); }
  for (const [gName, ls] of Object.entries(groups)) {
    const who = ls[0].speakers ? ls[0].speakers.join(', ') : 'every kid';
    o.push(`### \`${gName}\``, '', `**Who:** ${who}.`, '');
    o.push('| Id | Line | Tone |', '|---|---|---|');
    for (const l of ls) o.push(`| \`${l.id}\` | ${cell(l.text)} | ${tone[l.situation] || l.situation}${l.name ? ' ({name}: a friend’s name)' : ''} |`);
    o.push('');
  }
  return o.join('\n');
}

// the script's rows, for voicepack.mjs and the suite: { id: text }
export function parseScript(md) {
  const rows = {};
  for (const ln of md.split('\n')) {
    const m = /^\| `([^`]+)` \| (.*?) \| [^|]*\|$/.exec(ln);
    if (m) rows[m[1]] = m[2].replace(/\\\|/g, '|');
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const md = render(await readCatalog());
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== md) { console.error('docs/voice_script.md is out of date: run node scripts/voicescript.mjs'); process.exit(1); }
    console.log('docs/voice_script.md is up to date');
  } else {
    fs.writeFileSync(OUT, md);
    console.log(`wrote ${path.relative(ROOT, OUT)}: ${md.split('\n').length} lines`);
  }
}
