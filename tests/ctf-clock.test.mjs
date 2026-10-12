// v1.191 (decisions "Flags on Bellfield never ends", critic 12 Oct; Michael: C): Flags on Bellfield gets a 5:00 clock
// (most flags wins; a tie is a draw, paid as a loss) and a thinner defence (Christian pushes, so only Fernando keeps
// their flag). Checked: the briefing and the HUD clock; the three ways time can end it, scripted, with their result
// lines and pay; then played rounds with the player out of the fight, counting how often two of their kids stand
// within 15 m of their flag (against the same rounds with Christian's push turned off, as v1.190 played), and one
// round run out to the clock.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'bellfield_ctf';

// --- the briefing says so
const brief = await page.evaluate((ID) => {
  const b = getScenarioBriefing(ID);
  return { win: b.winConditionText, desc: SCENARIOS[ID].desc, roles: SCENARIOS[ID].enemySetup.map(e => e.charId + ':' + (e.ctf || '')) };
}, ID);
console.log('   briefing:', JSON.stringify(brief));
check('the objective gives the clock: first to 2, or most flags in 5:00', /first to 2/.test(brief.win) && /most flags in 5:00/.test(brief.win), brief.win);
check('Mason runs and Christian pushes; Fernando keeps the flag', brief.roles.includes('mason:run') && brief.roles.includes('christian:push') && brief.roles.includes('fernando:'), brief.roles);
check('the briefing names the five minutes and the tie', /five minutes/.test(brief.desc) && /tie/.test(brief.desc), brief.desc);

// --- the HUD clock
await g.scenario(ID);
const hud = await page.evaluate(() => {
  const C = Game.scenario.ctf, val = () => document.getElementById('timerValue').textContent, hud = document.getElementById('timerHud');
  updateTimerHud();
  const start = val();
  C.t = 280.2; updateTimerHud();
  const late = { v: val(), urgent: hud.classList.contains('urgent') };
  C.t = 200; updateTimerHud();
  const mid = { v: val(), urgent: hud.classList.contains('urgent') };
  return { clock: C.clock, start, late, mid, push: C.push };
});
console.log('   hud:', JSON.stringify(hud));
check('the clock is 300 s and the HUD starts at 0 – 0 5:00', hud.clock === 300 && /0 – 0 5:00/.test(hud.start), hud.start);
check('it counts down, red under 30 s and not before', /1:40/.test(hud.mid.v) && !hud.mid.urgent && /0:20/.test(hud.late.v) && hud.late.urgent, hud);
check('their push point is mid-street, 24 m up from their flag, on clear ground', hud.push && Math.abs(hud.push.theirs.x - 0.9) < 2 && Math.abs(hud.push.theirs.z) < 4, hud.push);

// --- time up, three ways: ahead wins, behind loses, level is a draw paid as a loss
const timeUp = async (ours, theirs) => {
  await g.scenario(ID);
  await page.evaluate(([o, t]) => {
    const C = Game.scenario.ctf;
    for (const k of Game.scenario.enemies) { k.pos.x = -30; k.pos.z = 24; }
    C.score.ours = o; C.score.theirs = t;
    window._cash0 = Game.persist.cash; delete Game.persist.completed.bellfield_ctf;
    C.t = 299.9; updateFlags(1 / 60);
    window._before = Game.mode;
    updateFlags(0.2);
  }, [ours, theirs]);
  await page.waitForFunction(() => Game.mode !== 'scenario', null, { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => ({ before: window._before, mode: Game.mode, paid: Game.persist.cash - window._cash0,
    done: !!Game.persist.completed.bellfield_ctf, log: Game.scenario.ctf.log.filter(x => x.ev === 'time').length,
    outcome: document.getElementById('outcomeText').textContent, flavor: document.getElementById('flavorText').textContent }));
};
const pay = await page.evaluate(() => ({ win: scaledReward(SCENARIOS.bellfield_ctf.rewards.win), lose: scaledReward(SCENARIOS.bellfield_ctf.rewards.lose) }));
const ahead = await timeUp(1, 0), behind = await timeUp(0, 1), level = await timeUp(1, 1);
console.log('   ahead:', JSON.stringify(ahead)); console.log('   behind:', JSON.stringify(behind)); console.log('   level:', JSON.stringify(level));
check('nothing ends before 5:00', ahead.before === 'scenario' && behind.before === 'scenario', [ahead.before, behind.before]);
check('ahead at 5:00 wins: FLAGS 1–0, paid and counted as a win', ahead.mode === 'result' && /FLAGS 1–0/.test(ahead.outcome) && /^Time\./.test(ahead.flavor) && ahead.paid === pay.win && ahead.done && ahead.log === 1, ahead);
check('behind at 5:00 loses: THEY WIN 1–0, paid as a loss', behind.mode === 'result' && /THEY WIN 1–0/.test(behind.outcome) && behind.paid === pay.lose && !behind.done, behind);
check('level at 5:00 is a draw: DRAW 1–1, paid as a loss and not counted', level.mode === 'result' && /DRAW 1–1/.test(level.outcome) && /tie/.test(level.flavor) && level.paid === pay.lose && !level.done, level);

// --- played rounds, kids only (the player tagged out and parked behind the south-east fence), 120 s each, three with
// Christian pushing and three with the push off (v1.190's game): each second, how many of Mason's side other than
// Mason stand within 15 m of their flag, not walking back from a tag
const play = async (pushOn, secs) => {
  await g.scenario(ID);
  await page.evaluate((pushOn) => {
    Game.player.pos.set(36, 0, 25); Game.player.hitsTaken = Game.player.maxHits;
    if (!pushOn) for (const k of Game.scenario.enemies) if (k.ctfRole === 'push') k.ctfRole = null;
    window._cw = { n: 0, two: 0, near: {}, still: {}, wedge: 0, pushes: 0 };
  }, pushOn);
  for (let s = 0; s < secs; s++) {
    const mode = await page.evaluate(() => {
      const W = window._cw, C = Game.scenario.ctf, f = C.flags.theirs.base;
      for (let i = 0; i < 60 && Game.mode === 'scenario'; i++) {
        stepGame(1 / 60);
        // a pusher on his way out held within 1 m for over 4 s is wedged
        for (const k of Game.scenario.enemies) {
          if (!(k._flagRun && k._pushing)) { W.still[k.name] = null; continue; }
          const st = W.still[k.name];
          if (!st || Math.hypot(k.pos.x - st.x, k.pos.z - st.z) > 1) W.still[k.name] = { x: k.pos.x, z: k.pos.z, t: 0 };
          else { st.t += 1 / 60; W.wedge = Math.max(W.wedge, st.t); }
        }
      }
      if (Game.mode !== 'scenario') return Game.mode;
      const near = Game.scenario.enemies.filter(k => k.team !== 'player' && k.ctfRole !== 'run' && k.state !== 'retreating' &&
        Math.hypot(k.pos.x - f.x, k.pos.z - f.z) < 15);
      // a pusher on his way out from his respawn by the flag is leaving it, not keeping it
      const keepers = near.filter(k => !(k._flagRun && k._pushing));
      W.n++; if (keepers.length >= 2) W.two++; if (near.length >= 2) W.twoAny = (W.twoAny || 0) + 1;
      for (const k of keepers) W.near[k.name] = (W.near[k.name] || 0) + 1;
      return Game.mode;
    });
    if (mode !== 'scenario') break;
  }
  return page.evaluate(() => {
    const W = window._cw, C = Game.scenario.ctf, chr = Game.scenario.enemies.find(e => e.name === 'Christian');
    const end = C.log.find(x => x.ev === 'time') || C.caps[C.caps.length - 1];
    return { mode: Game.mode, t: +(C.t).toFixed(1), endT: end ? end.t : null, n: W.n, two: W.two, twoAny: W.twoAny || 0, near: W.near, wedge: +W.wedge.toFixed(1), pushes: chr._pushes || 0,
      score: C.score, timeUp: C.timeUp, takes: C.log.filter(x => x.ev === 'take').map(x => x.by + '@' + x.t).join(' '),
      outcome: document.getElementById('outcomeText').textContent };
  });
};
const on = [], off = [];
for (let r = 0; r < 3; r++) { on.push(await play(true, 120)); off.push(await play(false, 120)); }
const share = rs => rs.reduce((a, r) => a + r.two, 0) / rs.reduce((a, r) => a + r.n, 0);
for (const [name, rs] of [['push on', on], ['push off', off]])
  for (const r of rs) console.log(`   ${name}: ${r.t} s, two keeping the flag ${r.two}/${r.n} s (${r.twoAny} counting a pusher on his way out), near ${JSON.stringify(r.near)}, Christian's pushes ${r.pushes}, wedge ${r.wedge} s, score ${r.score.ours}-${r.score.theirs}, takes ${r.takes || '-'}`);
console.log(`   two of theirs within 15 m of their flag: ${(share(on) * 100).toFixed(0)}% of seconds with the push, ${(share(off) * 100).toFixed(0)}% without`);
check('with the push, two of theirs keep their flag under a tenth of the time, and under half as often as without',
  share(on) < 0.1 && share(on) < share(off) / 2, [share(on), share(off)]);
check('Christian pushes out every round, and is never wedged on the way', on.every(r => r.pushes >= 1 && r.wedge <= 4.1), on.map(r => [r.pushes, r.wedge]));

// --- one round run out to the clock (kids only): it ends at 5:00 at the latest, with a result
const full = await play(true, 330);
console.log('   to the clock:', JSON.stringify({ endT: full.endT, mode: full.mode, score: full.score, timeUp: full.timeUp, outcome: full.outcome, takes: full.takes }));
check('a round played out ends by 5:00 with a result', full.mode === 'result' && full.endT != null && full.endT <= 301 && (full.timeUp || Math.max(full.score.ours, full.score.theirs) >= 2) && /FLAGS|THEY|DRAW/.test(full.outcome), full);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
