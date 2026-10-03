// v1.144 (backlog D.7, Michael: A): Hold the Treehouse. The player starts up on the Stoneglen platform and holds it
// for 90 s; Haden and Connor come out of the house, climb the ladder after him and, tagged, drop off and come again;
// Evan stays on the ground by the shed and shoots at anything above the rail. Time through stepGame.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

await g.scenario('stoneglen_hold_treehouse');
const info = await page.evaluate(() => {
  const p = Game.player, sc = SCENARIOS.stoneglen_hold_treehouse;
  return { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), onGround: p.onGround, type: sc.scenarioType, timer: sc.timerSec,
    kids: Game.scenario.enemies.map(e => ({ id: e.charId, y: e.pos.y, role: e.role, noClimb: !!e.noClimb, perch: !!e.perch })),
    group: PIN_SCENARIO_GROUPS.northcliff.indexOf('stoneglen_hold_treehouse') - PIN_SCENARIO_GROUPS.northcliff.indexOf('stoneglen_treehouse') };
});
check('the player starts on the platform, feet on the floor at 2.6 m', info.y === 2.6 && info.onGround && Math.abs(info.x) < 1.3 && info.z < -4.8 && info.z > -7.6, info);
check('a 90 s defend, right after King of the Treehouse in Northcliff', info.type === 'defend' && info.timer === 90 && info.group === 1, info);
check('three kids, all on the ground: the twins attack, Evan holds and never climbs', info.kids.length === 3 && info.kids.every(k => k.y === 0 && !k.perch)
  && info.kids.filter(k => k.role === 'attacker').length === 2 && info.kids.find(k => k.id === 'evan').noClimb, info.kids);

// 60 s with the player untaggable on the platform; a twin who has been up there 1.5 s is tagged (as the player would)
const round = (crouch) => page.evaluate((crouch) => {
  const hitsBy = {}; applyBBHit = (bb, t) => { if (t === Game.player) { const k = bb.enemyRef ? bb.enemyRef.charId : '?'; hitsBy[k] = (hitsBy[k] || 0) + 1; } };
  const p = Game.player; Game.mouse.locked = true; p.crouching = crouch;
  const E = Game.scenario.enemies, evan = E.find(e => e.charId === 'evan'), P = Game.scenario.perches.treehouse;
  const ups = { haden: [], connor: [] }, drops = []; let evanMaxY = 0, wasUp = {};
  for (let i = 0; i < 60 * 60 && Game.mode === 'scenario'; i++) {
    stepGame(1 / 60);
    evanMaxY = Math.max(evanMaxY, evan.pos.y);
    for (const e of E) {
      if (e === evan) continue;
      if (e._climbed && !wasUp[e.charId]) ups[e.charId].push(+(i / 60).toFixed(1));
      wasUp[e.charId] = !!e._climbed;
      if (e._climbed && e.state !== 'retreating') { e._upT = (e._upT || 0) + 1 / 60; if (e._upT > 1.5) { e._upT = 0; eliminateEnemy(e); drops.push({ id: e.charId, t: i, y0: e.pos.y }); } }
    }
    for (const d of drops) if (d.t1 == null && i - d.t > 0) { const e = E.find(k => k.charId === d.id); if (e.pos.y < 0.01) d.t1 = +((i - d.t) / 60).toFixed(2); }
  }
  return { ups, drops: drops.map(d => ({ id: d.id, y0: d.y0, fell: d.t1 })), evanMaxY, hitsBy, mode: Game.mode, hitsTaken: p.hitsTaken };
}, crouch);

const standing = await round(false);
console.log('  standing', JSON.stringify(standing));
check('both twins reach the platform inside 15 s', standing.ups.haden[0] < 15 && standing.ups.connor[0] < 15, standing.ups);
check('tagged up there, a twin drops to the grass inside 1 s', standing.drops.length >= 2 && standing.drops.every(d => d.y0 === 2.6 && d.fell != null && d.fell < 1), standing.drops);
check('and comes again: each twin reaches the platform at least twice in 60 s', standing.ups.haden.length >= 2 && standing.ups.connor.length >= 2, standing.ups);
check('Evan never leaves the ground', standing.evanMaxY === 0, standing.evanMaxY);
check('Evan hits a player standing above the rail', (standing.hitsBy.evan || 0) > 0, standing.hitsBy);

await g.scenario('stoneglen_hold_treehouse');
const low = await round(true);
console.log('  crouched', JSON.stringify(low));
check('crouched behind the plywood, Evan does not hit him (60 s)', !low.hitsBy.evan, low.hitsBy);

// the round is won by holding 90 s (the timer), and lost the usual way
await g.scenario('stoneglen_hold_treehouse');
const win = await page.evaluate(() => { applyBBHit = () => {}; Game.scenario.timerRemaining = 0.05; for (let i = 0; i < 6; i++) stepGame(1 / 60); return Game.mode; });
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 5000 }).catch(() => {});
const res = await page.evaluate(() => ({ mode: Game.mode, text: (document.getElementById('resultScreen') || document.body).innerText.slice(0, 400) }));
check('when the timer runs out the player wins', res.mode === 'result' && /YOU|HELD|WIN|GOT/i.test(res.text), { win, res });

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
