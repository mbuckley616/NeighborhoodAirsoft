// v1.111 (Found in play, critic v1.101): in Priya's Pincer, Priya parked in 'advancing' at about (−5, 2), 39 m from
// the bulb_center spawn, for 37–60 s and never came on (3 of 6 runs on v1.101). Plays the defend twice with the
// player standing at spawn, untaggable, and follows her: no stall of 8 s or more in 'advancing' while over 20 m out,
// and she closes to 15 m inside 40 s. Not reproduced on v1.109–v1.110 (0 of 9 runs); the v1.103 fix to the bounding
// flips is the likely cure. This keeps it that way.
// v1.368 (D.58, Michael: retire Priya): Joe is the flanker now, and the match is The Pincer; the checks follow him.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
for (let r = 0; r < 2; r++) {
  await g.scenario('bunratty_pincer');
  const res = await page.evaluate(() => {
    Game.player.maxHits = 999;
    const e = Game.scenario.enemies.find(e => e.name === 'Joe');
    let park = 0, longest = 0, mark = [e.pos.x, e.pos.z], closeAt = null, trace = [];
    for (let f = 1; f <= 60 * 60 && Game.mode === 'scenario'; f++) {
      Game.player.hitsTaken = 0; stepGame(1 / 60);
      const d = Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z);
      if (closeAt === null && d < 15) closeAt = +(f / 60).toFixed(1);
      if (f % 60 === 0) {
        const net = Math.hypot(e.pos.x - mark[0], e.pos.z - mark[1]); mark = [e.pos.x, e.pos.z];
        if (f % 600 === 0) trace.push([f / 60, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), e.state, Math.round(d)]);
        if (net < 0.5 && e.state === 'advancing' && d > 20 && e.health > 0) { park++; longest = Math.max(longest, park); } else park = 0;
      }
    }
    return { longest, closeAt, trace };
  });
  console.log(`  run ${r + 1}:`, JSON.stringify(res));
  check(`run ${r + 1}: Joe never stalls 8 s in 'advancing' more than 20 m out`, res.longest < 8, res.longest);
  check(`run ${r + 1}: Joe closes to 15 m inside 40 s`, res.closeAt !== null && res.closeAt <= 40, res.closeAt);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); enterBedroom(); });
  await g.spin(5);
}
// v1.368 (D.58): Priya leaves every match and every list; Joe and Chris, two Bunratty kids, take her places, each
// with his own looks, numbers and lines; Mitchell is Protect Ryan's red VIP. Each match they are in builds and plays.
const d58 = await page.evaluate(() => {
  const where = id => Object.entries(SCENARIOS).filter(([, sc]) => (sc.enemySetup || []).some(e => e.charId === id)).map(([k]) => k);
  const kid = id => { const c = CHARACTERS[id], k = createKid(c, 'pistol');
    return { street: c.street, h: c.height, b: c.build, hair: c.hairStyle, agg: c.aggression, acc: c.accuracy, spd: c.moveSpeed, scale: +k.group.scale.y.toFixed(2),
      lines: ['playerHit', 'npcHit', 'playerSpotted', 'taunt'].map(cat => voiceLinePools(id, cat).own.length) }; };
  const vip = SCENARIOS.bunratty_vip.enemySetup.find(e => e.vip && e.team !== 'player');
  return { priya: !!CHARACTERS.priya || !!VOICE_LINES.priya || where('priya').length > 0 || PICKUP_MAPS.some(m => (m.ffaOrder || []).includes('priya'))
      || Object.values(SCENARIOS).some(sc => /Priya/.test((sc.scenarioName || '') + (sc.desc || ''))),
    joe: kid('joe'), chris: kid('chris'), joeAt: where('joe'), chrisAt: where('chris'), vip: vip.charId + ' ' + vip.anchor,
    pincer: SCENARIOS.bunratty_pincer.scenarioName };
});
console.log('  D.58:', JSON.stringify(d58));
check('Priya is gone: no character, lines, match, board order or briefing names her', !d58.priya, d58);
check('Joe: Bunratty, medium height, lean, curly hair, a good shot (0.7), moderately aggressive (0.55), fast',
  d58.joe.street === 'bunratty_ct' && d58.joe.h === 'average' && d58.joe.b === 'skinny' && d58.joe.hair === 'curly' && d58.joe.acc === 0.7 && d58.joe.agg === 0.55 && d58.joe.spd > 1, d58.joe);
check("Chris: Bunratty, tall (Garrett's 1.12), medium build, aggressive (0.85) and the fastest (1.15), his aim middling",
  d58.chris.street === 'bunratty_ct' && d58.chris.scale === 1.12 && d58.chris.b === 'average' && d58.chris.agg === 0.85 && d58.chris.spd === 1.15 && d58.chris.acc === 0.5, d58.chris);
check('each has his own lines in every situation (4 or more)', [...d58.joe.lines, ...d58.chris.lines].every(n => n >= 4), [d58.joe.lines, d58.chris.lines]);
// v1.403 (D.57 step 4): + Joe in Mitchell's Whole Crew (was Four on Four), so eleven; Protect Ryan is Cover Nick
check("between them they take Priya's nine places, one in Cover Nick, where Mitchell is their red VIP on the plank, and Joe's in Mitchell's Whole Crew; the Pincer is The Pincer",
  d58.joeAt.length + d58.chrisAt.length === 11 && d58.vip === 'mitchell bulb_plank' && d58.pincer === 'The Pincer', d58);
const played58 = [];
for (const id of [...d58.joeAt, ...d58.chrisAt]) {
  await g.scenario(id);
  played58.push(await page.evaluate(id => {
    for (let i = 0; i < 120 && Game.mode === 'scenario'; i++) stepGame(1 / 60);
    const names = Game.scenario.enemies.map(e => e.name);
    const r = { id, mode: Game.mode, in: names.includes('Joe') || names.includes('Chris'), priya: names.includes('Priya') };
    if (Game.mode === 'scenario') endScenario('lose');
    enterBedroom();
    return r;
  }, id));
}
check('every match with Joe or Chris builds and plays 2 s with him in it, and nobody is Priya', played58.every(r => r.mode === 'scenario' && r.in && !r.priya), played58);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
