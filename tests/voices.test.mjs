// v1.150 (D.9, Michael: A): every kid has his own lines in every situation, the pools are deep enough that a kid
// rarely repeats himself in a match, and the speech queue's cooldowns still hold. Three parts:
//   1. the tables: every kid in CHARACTERS has >= 4 own lines in each of the four situations, every band default has
//      >= 6, no pool holds a duplicate, no line is over VOICE_LINE_WORD_CAP words, nothing rude;
//   2. the picker: 300 draws per (kid, situation) never repeat the last line, nor any of the last three when the
//      pool allows, and the kid's own lines carry most of the draws;
//   3. headless rounds (a team 3v3, a 1v1, the whole block, a free-for-all, Infection) with the player untaggable:
//      VOICE.log shows no kid saying the same line twice running, 4 s between a kid's lines, 1.5 s between anyone's,
//      every line from the right pool, allies talking to you (teammate lines) and never taunting you.
//   4. v1.151: the nearest hostile kid calls the start when the 2.5 s opening hold lifts (once, never a teammate, never
//      a far kid, and a kid who has just called you out inside the hold is on his 4 s cooldown, so the call passes to the
//      next free kid in earshot), and a kid calls a tag on another kid as he does on you.
// speechSynthesis is silent or voiceless in headless Chromium, so this tests selection and pacing, not audio.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

// ---- 1. the tables ----
const tables = await page.evaluate(() => {
  const cats = ['playerHit', 'npcHit', 'playerSpotted', 'taunt'];
  const words = s => s.trim().split(/\s+/).length;
  const rude = /\b(damn|hell|crap|shit|fuck|ass|bitch|stupid|idiot|loser|retard|gay|fat)\b/i;
  const out = { kids: Object.keys(CHARACTERS).length, cap: VOICE_LINE_WORD_CAP, thin: [], dupes: [], long: [], rude: [], bands: {}, shared: {} };
  for (const id of Object.keys(CHARACTERS)) {
    for (const c of cats) {
      const { own, band } = voiceLinePools(id, c);
      if (own.length < 4) out.thin.push(`${id}.${c}=${own.length}`);
      const seen = new Set();
      for (const l of [...own, ...band]) { if (seen.has(l)) out.dupes.push(`${id}.${c}: ${l}`); seen.add(l); }
    }
  }
  const all = [];
  for (const [b, t] of Object.entries(VOICE_LINES_DEFAULT)) { out.bands[b] = {}; for (const c of [...cats, 'roundStart']) { out.bands[b][c] = t[c].length; all.push(...t[c]); if (new Set(t[c]).size !== t[c].length) out.dupes.push(b + '.' + c); } }
  for (const t of Object.values(VOICE_LINES)) for (const c of cats) all.push(...(t[c] || []));
  out.shared = { teammate: VOICE_LINES_TEAMMATE.length, infection: INFECTION_BARKS.length };
  all.push(...VOICE_LINES_TEAMMATE, ...INFECTION_BARKS);
  for (const l of all) { if (words(l) > VOICE_LINE_WORD_CAP) out.long.push(l); if (rude.test(l)) out.rude.push(l); }
  out.total = all.length;
  return out;
});
console.log(`  ${tables.kids} kids, ${tables.total} lines in the tables, cap ${tables.cap} words; bands:`, JSON.stringify(tables.bands), 'shared:', JSON.stringify(tables.shared));
check('every kid has at least 4 own lines in every situation', tables.thin.length === 0, tables.thin);
check('every band default has at least 6 lines a situation, the start call too', Object.values(tables.bands).every(b => Object.values(b).every(n => n >= 6) && b.roundStart >= 6), tables.bands);
check('the teammate pool has at least 8 lines and the Infection pool at least 10', tables.shared.teammate >= 8 && tables.shared.infection >= 10, tables.shared);
check('no (kid, situation) pool holds a line twice', tables.dupes.length === 0, tables.dupes);
check(`no line is over ${tables.cap} words`, tables.long.length === 0, tables.long);
check('nothing rude', tables.rude.length === 0, tables.rude);

// ---- 2. the picker ----
const picker = await page.evaluate(() => {
  const cats = ['playerHit', 'npcHit', 'playerSpotted', 'taunt'];
  const out = { pairs: 0, immediate: [], within3: [], fewDistinct: [], ownShare: [] };
  for (const id of Object.keys(CHARACTERS)) {
    for (const c of cats) {
      const { own, band } = voiceLinePools(id, c);
      const sp = {}; const got = []; VOICE.recentLines = [];
      for (let i = 0; i < 300; i++) got.push(pickVoiceLine(id, c, sp));
      out.pairs++;
      for (let i = 1; i < got.length; i++) if (got[i] === got[i - 1]) { out.immediate.push(`${id}.${c}: ${got[i]}`); break; }
      if (own.length + band.length >= 5) {
        for (let i = 3; i < got.length; i++) if (got[i] === got[i - 1] || got[i] === got[i - 2] || got[i] === got[i - 3]) { out.within3.push(`${id}.${c}: ${got[i]} at ${i}`); break; }
      }
      const distinct = new Set(got).size;
      if (distinct < Math.min(4, own.length + band.length)) out.fewDistinct.push(`${id}.${c}=${distinct}`);
      const ownN = got.filter(l => own.includes(l)).length / got.length;
      if (own.length && band.length && (ownN < 0.5 || ownN > 0.9)) out.ownShare.push(`${id}.${c}=${ownN.toFixed(2)}`);
    }
  }
  return out;
});
console.log(`  picker: ${picker.pairs} (kid, situation) pairs x 300 draws`);
check('a kid never says the same line twice running', picker.immediate.length === 0, picker.immediate);
check('nor any of his last three lines (pools of 5 or more)', picker.within3.length === 0, picker.within3);
check('at least 4 distinct lines come out of every pool', picker.fewDistinct.length === 0, picker.fewDistinct);
check("a kid's own lines carry 50-90% of his draws", picker.ownShare.length === 0, picker.ownShare);

// ---- 3. headless rounds ----
const ROUND = async (id, secs) => {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario(id);
  await page.evaluate(() => { Game.player.maxHits = 999; VOICE.log.length = 0; Game.mouse.locked = true; });
  for (let s = 0; s < secs; s += 5) await g.spin(300);
  return page.evaluate(() => ({
    ffa: !!Game.scenario.ffa,
    teams: Object.fromEntries(Game.scenario.enemies.map(e => [e.charId, e.team || 'enemy'])),
    log: VOICE.log.slice(),
    pools: Object.fromEntries(VOICE.log.map(e => [e.charId + '.' + e.category, (() => { const p = voiceLinePools(e.charId, e.category); return [...p.own, ...p.band]; })()])),
  }));
};
const rounds = {};
for (const [id, secs] of [['winnmark_team_3v3', 90], ['bunratty_sean', 60], ['winnmark_whole_block', 90], ['lot_ffa', 60], ['bunratty_infection', 45]]) {
  const r = await ROUND(id, secs);
  rounds[id] = r;
  const bySpeaker = {};
  for (const e of r.log) (bySpeaker[e.charId] = bySpeaker[e.charId] || []).push(e);
  console.log(`  ${id}, ${secs} s, player untaggable at spawn: ${r.log.length} lines from ${Object.keys(bySpeaker).length} kids;`,
    Object.entries(bySpeaker).map(([k, v]) => `${k} ${v.length}`).join(', '));
  const repeats = [], gaps = [], wrongPool = [];
  for (const [k, v] of Object.entries(bySpeaker)) {
    for (let i = 1; i < v.length; i++) {
      if (v[i].line === v[i - 1].line) repeats.push(`${k}: ${v[i].line}`);
      if (v[i].t - v[i - 1].t < 4.0 - 0.02) gaps.push(`${k}: ${v[i - 1].t} -> ${v[i].t}`);
    }
  }
  for (let i = 1; i < r.log.length; i++) if (r.log[i].t - r.log[i - 1].t < 1.5 - 0.02) gaps.push(`anyone: ${r.log[i - 1].t} -> ${r.log[i].t}`);
  for (const e of r.log) if (!r.pools[e.charId + '.' + e.category].includes(e.line)) wrongPool.push(`${e.charId}.${e.category}: ${e.line}`);
  // The 1v1's Sean fights from his backyard, past the 24 m audible range of a player standing at spawn, and the
  // free-for-all's kids fight each other out of earshot of your hidden start (v1.134), so a line or so a minute
  // is what those rounds give; the others fill the log.
  if (id !== 'lot_ffa') check(`${id}: kids spoke`, r.log.length >= (id === 'bunratty_sean' ? 1 : 3), r.log.length);
  check(`${id}: no kid says the same line twice running`, repeats.length === 0, repeats);
  check(`${id}: 4 s between a kid's lines and 1.5 s between anyone's`, gaps.length === 0, gaps);
  check(`${id}: every line is from the speaker's pool for that situation`, wrongPool.length === 0, wrongPool);
  const allies = Object.entries(r.teams).filter(([, t]) => t === 'player').map(([k]) => k);
  const allyTaunts = r.log.filter(e => allies.includes(e.charId) && e.category === 'taunt');
  const hostileTeammate = r.log.filter(e => !allies.includes(e.charId) && e.category === 'teammate');
  if (allies.length && !r.ffa) {
    check(`${id}: allies (${allies.join(', ')}) never taunt you`, allyTaunts.length === 0, allyTaunts);
    console.log(`  allies' lines: ` + (r.log.filter(e => allies.includes(e.charId)).map(e => e.category + ': ' + e.line).join('; ') || 'none'));
  }
  check(`${id}: no hostile kid says a teammate line`, hostileTeammate.length === 0, hostileTeammate);
  if (id === 'bunratty_infection') check(`${id}: taggers bark from the Infection pool`, r.log.some(e => e.category === 'infection'), r.log.map(e => e.category));
  if (id === 'lot_ffa') check(`${id}: free-for-all kids taunt, nobody is a teammate`, r.log.every(e => e.category !== 'teammate'), r.log.map(e => e.category));
}
// An ally's taunt timer, fired by hand (allies tend to be out early when you stand still and let three kids
// come): his line is a teammate line, and a hostile kid's at the same moment is a taunt.
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.scenario('winnmark_team_3v3');
const direct = await page.evaluate(() => {
  Game.player.maxHits = 999; VOICE.log.length = 0;
  const ally = Game.scenario.enemies.find(e => e.team === 'player');
  const foe = Game.scenario.enemies.find(e => (e.team || 'enemy') !== 'player');
  const out = [];
  for (let i = 0; i < 4; i++) {
    ally.pos.x = Game.player.pos.x + 2; ally.pos.z = Game.player.pos.z; foe.pos.x = Game.player.pos.x - 2; foe.pos.z = Game.player.pos.z;
    tryNpcSpeak(ally, 'taunt'); Game.scenario.roundTime += 2; tryNpcSpeak(foe, 'taunt'); Game.scenario.roundTime += 4;
  }
  return VOICE.log.map(e => [e.charId, e.category, e.line, VOICE_LINES_TEAMMATE.includes(e.line)]);
});
console.log('  by hand, 3v3:', JSON.stringify(direct));
check('an ally\'s taunt comes out as a teammate line, from the teammate pool', direct.filter(d => d[1] === 'teammate' && d[3]).length === 4, direct);
check('a hostile kid\'s taunt is still a taunt', direct.filter(d => d[1] === 'taunt' && !d[3]).length === 4, direct);
// ---- 4. v1.151: the start call and a tag on another kid ----
const starts = [];
for (const [id, near] of [['winnmark_team_3v3', true], ['winnmark_team_3v3', false], ['bunratty_infection', true], ['lot_ffa', true]]) {
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.scenario(id);
  const r = await page.evaluate((near) => {
    Game.player.maxHits = 999; VOICE.log.length = 0; Game.mouse.locked = true;
    const myTeam = (Game.player && Game.player.team) || 'player';
    const hostile = Game.scenario.enemies.filter(e => Game.scenario.ffa || (e.team || 'enemy') !== myTeam);
    const allies = Game.scenario.enemies.filter(e => !Game.scenario.ffa && (e.team || 'enemy') === myTeam);
    // put every kid 40 m off, then (near) one hostile kid 6 m away, and allies beside you as they start
    for (const e of Game.scenario.enemies) { e.pos.x = Game.player.pos.x + 40; e.pos.z = Game.player.pos.z; }
    for (const e of allies) { e.pos.x = Game.player.pos.x + 2; e.pos.z = Game.player.pos.z + 1; }
    if (near && hostile[0]) { hostile[0].pos.x = Game.player.pos.x + 6; hostile[0].pos.z = Game.player.pos.z; }
    const before = Game.scenario.roundTime;
    // a kid 6 m from spawn calls you out inside the hold and his 4 s cooldown would hold the start call (the
    // next free kid would be 40 m off): clear the cooldowns just before the hold lifts so the call itself is seen
    for (let f = 0; f < 60 * 2.4 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
    VOICE.globalCooldownUntil = 0; for (const e of Game.scenario.enemies) e._voiceCooldownUntil = 0;
    for (let f = 0; f < 60 * 1.6 && Game.mode === 'scenario'; f++) stepGame(1 / 60);
    const starts = VOICE.log.filter(e => e.category === 'roundStart');
    return { before, nearest: hostile[0]?.charId, starts: starts.map(e => [e.t, e.charId, e.line]), first: VOICE.log[0] ? [VOICE.log[0].t, VOICE.log[0].charId, VOICE.log[0].category] : null, called: Game.scenario._startCalled };
  }, near);
  starts.push([id, near, r]);
  console.log(`  start call, ${id}, ${near ? 'a hostile kid at 6 m' : 'every kid 40 m off'}: ${JSON.stringify(r)}`);
  if (id === 'bunratty_infection') check(`${id}: taggers never call the start`, r.starts.length === 0 && r.called, r);
  else if (near) {
    check(`${id}: the kid at 6 m calls the start once, between 2.5 and 2.6 s`, r.starts.length === 1 && r.starts[0][1] === r.nearest && r.starts[0][0] >= 2.5 && r.starts[0][0] <= 2.6, r);
  } else check(`${id}: nobody within earshot, no start call (and it is spent)`, r.starts.length === 0 && r.called, r);
}
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.scenario('winnmark_team_3v3');
const tagCall = await page.evaluate(() => {
  Game.player.maxHits = 999;
  for (let f = 0; f < 60 * 3; f++) stepGame(1 / 60);   // past the hold and its call
  VOICE.log.length = 0;
  const ally = Game.scenario.enemies.find(e => e.team === 'player');
  const foe = Game.scenario.enemies.find(e => (e.team || 'enemy') !== 'player');
  ally.pos.x = Game.player.pos.x + 2; ally.pos.z = Game.player.pos.z; foe.pos.x = Game.player.pos.x - 2; foe.pos.z = Game.player.pos.z;
  VOICE.globalCooldownUntil = 0; ally._voiceCooldownUntil = 0; foe._voiceCooldownUntil = 0;
  // 1: the tagged kid can speak: he reacts, and the shooter's call is held by the global cooldown
  Game.scenario.roundTime += 10; applyBBHit({ enemyRef: foe, canDamage: true }, ally);
  const a = VOICE.log.map(e => [e.charId, e.category]);
  // 2: the tagged kid is on his own cooldown: the shooter's call fills in
  VOICE.log.length = 0; Game.scenario.roundTime += 10; ally.health = 1; ally._voiceCooldownUntil = Game.scenario.roundTime + 30;
  applyBBHit({ enemyRef: foe, canDamage: true }, ally);
  const b = VOICE.log.map(e => [e.charId, e.category, e.line]);
  return { ally: ally.charId, foe: foe.charId, a, b, foePool: voiceLinePools(foe.charId, 'playerHit') };
});
console.log('  a tag on another kid, by hand:', JSON.stringify({ a: tagCall.a, b: tagCall.b }));
check('the tagged kid reacts and the shooter waits (global cooldown)', tagCall.a.length === 1 && tagCall.a[0][0] === tagCall.ally && tagCall.a[0][1] === 'npcHit', tagCall.a);
check('with the tagged kid on cooldown, the shooter calls the tag from his own pool', tagCall.b.length === 1 && tagCall.b[0][0] === tagCall.foe && tagCall.b[0][1] === 'playerHit' && [...tagCall.foePool.own, ...tagCall.foePool.band].includes(tagCall.b[0][2]), tagCall.b);
const sample = rounds['winnmark_team_3v3'].log.slice(0, 12).map(e => `${e.t}s ${e.name} (${e.category}): ${e.line}`);
console.log('  the first lines of the 3v3:\n    ' + sample.join('\n    '));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
