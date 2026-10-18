// v1.268 (backlog D.10, Michael: A, 3 Oct: teammates out of earshot come in over the walkie). Checked: a teammate's
// line from past earshot (24 m) is said over the walkie (logged walkie, shown on the squad box) where it used to go
// unsaid; an enemy's from as far still goes unsaid, and a teammate near you speaks where he stands; walkie lines are 4 s
// apart at least; your order's answer is not written over; a free-for-all has no walkie; and in a played round the
// walkie carries teammates' lines and only theirs. Also the order's cooldowns now run on the round clock.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

await g.scenario('winnmark_team_3v3');
const r = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  S.roundTime = 10; VOICE.log.length = 0; VOICE.globalCooldownUntil = 0; VOICE.walkieUntil = 0;
  const mates = S.enemies.filter(e => e.team === 'player'), foe = S.enemies.find(e => (e.team || 'enemy') !== 'player');
  const [a, b] = mates;
  const put = (e, d) => { e.pos.x = P.x; e.pos.z = P.z - d; e._voiceCooldownUntil = 0; };
  const clear = () => { VOICE.globalCooldownUntil = 0; for (const e of S.enemies) e._voiceCooldownUntil = 0; };
  for (const e of S.enemies) put(e, 200);
  const out = { mates: mates.length };
  out.farMate = tryNpcSpeak(a, 'playerSpotted');
  out.farMateLog = VOICE.log.at(-1);
  updateSquadHud();
  out.hud = document.getElementById('squadHud').textContent;
  clear(); S.roundTime = 12;
  out.secondInGap = tryNpcSpeak(b, 'playerSpotted');      // 2 s after the first walkie line
  clear(); S.roundTime = 14.1;
  out.secondAfterGap = tryNpcSpeak(b, 'npcHit');           // 4.1 s after
  out.secondLog = VOICE.log.at(-1);
  clear(); S.roundTime = 20;
  out.farFoe = tryNpcSpeak(foe, 'playerSpotted');
  put(a, 5); clear(); S.roundTime = 30;
  out.nearMate = tryNpcSpeak(a, 'teammate');
  out.nearLog = VOICE.log.at(-1);
  // the answer to your order stays on the box over a walkie line inside its 3.5 s
  put(a, 200); clear(); S.roundTime = 40; VOICE.walkieUntil = 0;
  giveSquadOrder('push');
  out.cool = { global: +(VOICE.globalCooldownUntil - S.roundTime).toFixed(2), walkie: +(VOICE.walkieUntil - S.roundTime).toFixed(2) };
  const answer = S.squadReply && S.squadReply.line;
  clear(); S.roundTime = 42.5;
  for (const e of mates) e.pos.z = P.z - 200;
  const said = tryNpcSpeak(b, 'teammate');
  out.orderKept = { answer, now: S.squadReply.line, said };
  return out;
});
console.log('   ', JSON.stringify(r));
check('the match has teammates', r.mates >= 2, r.mates);
check('a teammate 200 m off is heard over the walkie (it used to go unsaid)', r.farMate === true && r.farMateLog && r.farMateLog.walkie === true, r.farMateLog);
check('the walkie line shows on the squad box', r.hud.includes('📻') && r.hud.includes(r.farMateLog.name), r.hud);
check('a second walkie line 2 s later waits; 4.1 s later it goes out', r.secondInGap === false && r.secondAfterGap === true && r.secondLog.walkie === true, r);
check('an enemy as far off still goes unsaid', r.farFoe === false);
check('a teammate 5 m off speaks where he stands, not on the walkie', r.nearMate === true && !r.nearLog.walkie, r.nearLog);
check('an order sets its cooldowns on the round clock (1.5 s, walkie 4 s)', r.cool.global === 1.5 && r.cool.walkie === 4, r.cool);
check('a walkie line 2.5 s after your order waits: the answer stays on the box', r.orderKept.said === false && r.orderKept.now === r.orderKept.answer, r.orderKept);

// --- a free-for-all has no walkie
await g.scenario('winnmark_ffa');
const ffa = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  S.roundTime = 10; VOICE.globalCooldownUntil = 0; VOICE.walkieUntil = 0;
  const k = S.enemies[0]; k.pos.x = P.x; k.pos.z = P.z - 200; k._voiceCooldownUntil = 0;
  return { ffa: !!S.ffa, said: tryNpcSpeak(k, 'playerSpotted') };
});
check('in a free-for-all a kid 200 m off goes unsaid', ffa.ffa && ffa.said === false, ffa);

// --- a played round: you stand at the start, untaggable, 60 s
// 18 Oct fix-up: whether a teammate wanders past earshot (~29 m) in 60 s is up to the round, and on CI one run had 25
// and 21 lines with none on the walkie (both teams stayed close). So each line's distance is recorded (tryNpcSpeak is
// wrapped for the round), and the checks are the rule: a teammate who tries from 31 m+ (past earshot: 30 m is under
// 0.12 volume) with every cooldown clear is heard over the walkie, nobody within 20 m is, and only teammates are. The
// parts above set the walkie up by hand; this one only checks it holds in play. The round steps in one seeded evaluate.
const ROUNDS = +(process.env.ROUNDS || 2);
const played = [];
for (let i = 0; i < ROUNDS; i++) {
  await g.scenario('winnmark_team_3v3');
  played.push(await page.evaluate((i) => withSeededRandom('walkie-play-' + i, () => {
    Game.player.maxHits = 999; VOICE.log.length = 0;
    const orig = window.tryNpcSpeak, far = [];
    window.tryNpcSpeak = function (e, category, fill) {
      const P = Game.player.pos, d = e && e.pos ? Math.hypot(e.pos.x - P.x, e.pos.z - P.z) : 0;
      const now = Game.scenario?.roundTime || 0, n = VOICE.log.length;
      const clear = now >= VOICE.globalCooldownUntil && now >= VOICE.walkieUntil && !(e._voiceCooldownUntil > now);
      const said = orig.call(this, e, category, fill);
      if (VOICE.log.length > n) VOICE.log[VOICE.log.length - 1].d = +d.toFixed(1);
      if (d >= 31 && clear && overWalkieMate(e, category)) far.push(!!said);
      return said;
    };
    try { for (let s = 0; s < 3600 && Game.mode === 'scenario'; s++) stepGame(1 / 60); }
    finally { window.tryNpcSpeak = orig; }
    const mates = new Set(Game.scenario.enemies.filter(e => e.team === 'player').map(e => e.charId));
    return { far, log: VOICE.log.map(l => ({ t: l.t, d: l.d, mate: mates.has(l.charId), walkie: !!l.walkie, name: l.name, category: l.category })) };
  }), i));
}
const walk = played.map(r => r.log.filter(l => l.walkie));
for (const [i, w] of walk.entries())
  console.log(`   round ${i + 1}: ${played[i].log.length} lines, ${w.length} over the walkie:`, JSON.stringify(w.map(l => [l.t, l.name, l.category, l.d])),
    `; teammates trying from 31 m+ with the cooldowns clear: ${played[i].far.length}`);
const far = played.flatMap(r => r.far);
check('in play a teammate trying from 31 m+ with the cooldowns clear is heard over the walkie', far.every(x => x), far);
check('nobody within 20 m talks on the walkie', walk.flat().every(l => l.d > 20), walk.flat().map(l => l.d));
check('only teammates talk on the walkie', walk.flat().every(l => l.mate));
const gaps = walk.flatMap(w => w.slice(1).map((l, j) => l.t - w[j].t));
check('walkie lines 4 s apart or more', gaps.every(d => d >= 4 - 0.02), gaps);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
