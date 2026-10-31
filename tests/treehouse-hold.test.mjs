// v1.144 (backlog D.7, Michael: A): Hold the Treehouse. The player starts up on the Stoneglen platform and holds it
// for 90 s; Haden and Connor come out of the house, climb the ladder after him and, tagged, drop off and come again;
// Evan stays on the ground by the shed and shoots at anything above the rail. Time through stepGame.
// v1.316 (D.55 step 6, Michael: A): the treehouse is gone and the match is Hold the Bunker: 90 s in the big sandbag
// bunker while the twins come up the course from the house and Evan shoots from the nest under the road bank. The
// ladder's own checks moved to tests/treehouse.test.mjs and kid-climb on the kept treehouse yard.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

await g.scenario('stoneglen_hold_treehouse');
const info = await page.evaluate(() => {
  const p = Game.player, sc = SCENARIOS.stoneglen_hold_treehouse;
  return { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), onGround: p.onGround, type: sc.scenarioType, timer: sc.timerSec, name: sc.scenarioName,
    ladders: (Game.scenario.ladders || []).length,
    // v1.393 (D.57 step 1): your crew plays it now, and the street adds to their side; the match's own three are checked
    kids: Game.scenario.enemies.filter(e => e.team !== 'player' && ['haden', 'connor', 'evan'].includes(e.charId)).map(e => ({ id: e.charId, x: +e.pos.x.toFixed(1), y: +e.pos.y.toFixed(2), z: +e.pos.z.toFixed(1), role: e.role, perch: !!e.perch })),
    group: PIN_SCENARIO_GROUPS.northcliff.indexOf('stoneglen_hold_treehouse') - PIN_SCENARIO_GROUPS.northcliff.indexOf('stoneglen_treehouse') };
});
console.log('  start', JSON.stringify(info));
check('Hold the Bunker: the player starts on the ground inside the bunker (x within 1.6 m of its middle, z −7.2…−4.8)', info.name === 'Hold the Bunker' && info.y === 0 && info.onGround && Math.abs(info.x) < 1.6 && info.z > -7.2 && info.z < -4.8 && info.ladders === 0, info);
check('a 90 s defend, right after King of the Course in Northcliff', info.type === 'defend' && info.timer === 90 && info.group === 1, info);
const evan0 = info.kids.find(k => k.id === 'evan');
check('the match\'s three: the twins attack from the house end, Evan holds the nest under the bank, over 14 m behind you', info.kids.length === 3 && info.kids.every(k => !k.perch)
  && info.kids.filter(k => k.role === 'attacker' && k.z > 8).length === 2 && evan0 && evan0.z < -20 && Math.hypot(evan0.x - info.x, evan0.z - info.z) > 14, info.kids);

// 60 s with the player untaggable in the bunker; a twin who has been within 12 m of him for 3 s is tagged (as the
// player would tag him) and walks back to the patio to come again
const round = (crouch) => page.evaluate((crouch) => {
  const hitsBy = {}; applyBBHit = (bb, t) => { if (t === Game.player) { const k = bb.enemyRef ? bb.enemyRef.charId : '?'; hitsBy[k] = (hitsBy[k] || 0) + 1; } };
  const p = Game.player; Game.mouse.locked = true; p.crouching = crouch;
  // v1.393 (D.57 step 1): the twins and Evan as before; your crew holds its fire, so the twins' runs are theirs alone
  for (const e of Game.scenario.enemies) if (e.team === 'player') e.noFire = true;
  const E = Game.scenario.enemies.filter(e => ['haden', 'connor', 'evan'].includes(e.charId) && e.team !== 'player'), evan = E.find(e => e.charId === 'evan');
  const close = { haden: [], connor: [] }, nearest = { haden: 99, connor: 99 }, drops = []; let evanWalk = 0; const inT = {};
  const ex0 = evan.pos.x, ez0 = evan.pos.z;
  for (let i = 0; i < 60 * 60 && Game.mode === 'scenario'; i++) {
    stepGame(1 / 60);
    evanWalk = Math.max(evanWalk, Math.hypot(evan.pos.x - ex0, evan.pos.z - ez0));
    for (const e of E) {
      if (e === evan) continue;
      if (e.health <= 0 || e.state === 'retreating') { inT[e.charId] = 0; continue; }
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      nearest[e.charId] = Math.min(nearest[e.charId], +d.toFixed(1));
      if (d < 12) { if (!inT[e.charId]) close[e.charId].push(+(i / 60).toFixed(1)); inT[e.charId] = (inT[e.charId] || 0) + 1 / 60; } else inT[e.charId] = 0;
      if (inT[e.charId] > 3) { inT[e.charId] = 0; eliminateEnemy(e); drops.push({ id: e.charId, t: +(i / 60).toFixed(1) }); }
    }
  }
  return { close, nearest, drops, evanWalk: +evanWalk.toFixed(1), hitsBy, mode: Game.mode };
}, crouch);

const standing = await round(false);
console.log('  standing', JSON.stringify(standing));
check('both twins come up the course to within 12 m of the bunker inside 20 s', standing.close.haden[0] < 20 && standing.close.connor[0] < 20, standing.close);
check('and, tagged, come again: each twin comes within 12 m at least twice in 60 s', standing.close.haden.length >= 2 && standing.close.connor.length >= 2, standing.close);
check('one of them comes right up to the bags (within 4 m)', Math.min(standing.nearest.haden, standing.nearest.connor) < 4, standing.nearest);
check('Evan keeps to the bank: never over 6 m from his nest', standing.evanWalk <= 6, standing.evanWalk);
check('Evan hits a player standing in the bunker', (standing.hitsBy.evan || 0) > 0, standing.hitsBy);

await g.scenario('stoneglen_hold_treehouse');
const low = await round(true);
console.log('  crouched', JSON.stringify(low));
check('crouched behind the bags, Evan hits him far less than standing (60 s)', (low.hitsBy.evan || 0) * 3 <= (standing.hitsBy.evan || 0), { low: low.hitsBy, standing: standing.hitsBy });

// the round is won by holding 90 s (the timer), and lost the usual way
await g.scenario('stoneglen_hold_treehouse');
const win = await page.evaluate(() => { applyBBHit = () => {}; Game.scenario.timerRemaining = 0.05; for (let i = 0; i < 6; i++) stepGame(1 / 60); return Game.mode; });
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 5000 }).catch(() => {});
const res = await page.evaluate(() => ({ mode: Game.mode, text: (document.getElementById('resultScreen') || document.body).innerText.slice(0, 400) }));
check('when the timer runs out the player wins', res.mode === 'result' && /YOU|HELD|WIN|GOT/i.test(res.text), { win, res });

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
