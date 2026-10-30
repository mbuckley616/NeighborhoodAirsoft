// v1.387 (backlog D.81, Michael: A, by temperament): a kid under heavy fire camps, falls back or pushes by his own
// aggression, and a pistol shakes him less than an M249. Cart Return (Marcus 1v1), you unhittable: from 4 s in, a
// stream of your BBs flies past him 1.1 m off his side, chest high, for 4 s, then 5 s of quiet. Three rounds a case.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

async function round(gun, rate, agg) {
  await g.scenario('lot_1v1_marcus');
  const r = await page.evaluate(([gun, rate, agg]) => {
    const hit = window.__origHit = window.__origHit || applyBBHit;
    window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    const mk = window.__origMake = window.__origMake || makeBB;
    let back = 0;
    window.makeBB = function (pos, vel, owner) {
      if (owner === 'enemy' && Game.scenario.enemies.some(k => k._underFire && k._underFire.kind === 'fall' && k.state === 'repositioning')) back++;
      return mk.apply(this, arguments);
    };
    for (let i = 0; i < 240; i++) stepGame(1 / 60);
    const e = Game.scenario.enemies.find(k => k.team !== 'player' && k.health > 0);
    e.character = Object.assign({}, e.character, { aggression: agg });
    // v1.392 (D.51, the lot at real scale): every round from one spot, the open aisle east of the car column nearest
    // his start, the cars 1.9 m to his west. On the turned rows his own start put him at a car's face some rounds and
    // in the aisle others, and a stream begun inside that car never passed him (no fire, no episode)
    e.pos.x = 32.5; e.pos.z = -9; e.mesh.group.position.x = 32.5; e.mesh.group.position.z = -9;
    e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1; e.targetPos = null; e.homeCover = null;
    Game.gun.type = gun;
    const P = Game.player.pos, dist = () => Math.hypot(e.pos.x - P.x, e.pos.z - P.z);
    const d0 = dist(), states = {};
    let acc = 0, calmAt = null, dEnd = d0;
    for (let i = 0; i < 540 && Game.mode === 'scenario'; i++) {
      if (i < 240) {
        acc += rate / 60;
        while (acc >= 1) {
          acc--;
          const ux = P.x - e.pos.x, uz = P.z - e.pos.z, ul = Math.hypot(ux, uz) || 1;
          const pos = new THREE.Vector3(e.pos.x + ux / ul * 2.5 - uz / ul * 1.1, (e.pos.y || 0) + 1.0, e.pos.z + uz / ul * 2.5 + ux / ul * 1.1);
          Game.scenario.bbs.push(mk(pos, new THREE.Vector3(-ux / ul * 40, 0, -uz / ul * 40), 'player', null, null, 'player'));
        }
      }
      stepGame(1 / 60);
      if (i < 240) states[e.state] = (states[e.state] || 0) + 1;
      if (i === 239) dEnd = dist();
      if (i >= 240 && calmAt === null && !e._underFire) calmAt = (i - 240) / 60;
    }
    window.makeBB = mk;
    return { out: e.health <= 0 || Game.mode !== 'scenario', kinds: e._underFireKinds || {}, d0: +d0.toFixed(1), dEnd: +dEnd.toFixed(1), back, calmAt, states };
  }, [gun, rate, agg]);
  if (await g.mode() === 'scenario') await page.evaluate(() => endScenario('forfeit'));
  await page.evaluate(() => enterBedroom()); await g.spin(5);
  return r;
}
async function cases(gun, rate, agg) { const out = []; for (let k = 0; k < 3; k++) out.push(await round(gun, rate, agg)); return out; }
const n = (rs, f) => rs.filter(f).length;

const pistol = await cases('pistol', 2, 0.55);
check('a spring pistol at 2 a second does not rout him (0 of 3 rounds)', n(pistol, r => Object.keys(r.kinds).length) === 0, pistol.map(r => r.kinds));

const camp = await cases('m249', 12, 0.2);
check('timid (0.2) under an M249: he camps, in all 3 rounds', n(camp, r => r.kinds.camp && !r.kinds.fall && !r.kinds.push) === 3, camp.map(r => r.kinds));
check('camping, he takes cover and holds: no closer or farther by 3 m, and no march at you (under 0.25 s advancing), 2 of 3', n(camp, r => Math.abs(r.dEnd - r.d0) < 3 && (r.states.advancing || 0) < 15) >= 2, camp.map(r => [r.d0, r.dEnd, r.states]));

const fall = await cases('m249', 12, 0.55);
check('middling (0.55) under an M249: he falls back, in all 3 rounds', n(fall, r => r.kinds.fall && !r.kinds.push) === 3, fall.map(r => r.kinds));
// v1.391 (D.51, the lot at real scale): 2 m, the gain fallBackCover asks of the cover he falls back to. Cart Return's rows
// run north-south now, so he comes down an aisle with a parked car every 2.7 m beside him and the next one back is the
// nearest cover behind him (on the old lot, rows across his way, the next cover back was a row away: 4 m or more)
check('falling back, he ends 2 m or more farther from you, 2 of 3', n(fall, r => r.dEnd - r.d0 >= 2) >= 2, fall.map(r => [r.d0, r.dEnd]));
check('and fires back as he goes (a BB or more), 2 of 3', n(fall, r => r.back >= 1) >= 2, fall.map(r => r.back));

const push = await cases('ak47', 10, 0.85);
check('brave (0.85) under an AK: he pushes, in all 3 rounds', n(push, r => r.kinds.push && !r.kinds.fall && !r.kinds.camp) === 3, push.map(r => r.kinds));
check('pushing, he closes 6 m or more on you, 2 of 3', n(push, r => r.d0 - r.dEnd >= 6) >= 2, push.map(r => [r.d0, r.dEnd]));

const all = [...camp, ...fall, ...push];
check('3 quiet seconds and he settles (episode over within 3.5 s of the last BB), every round', all.every(r => r.calmAt !== null && r.calmAt <= 3.5), all.map(r => r.calmAt));

// in a real match: the Hollow 3v3, 60 s, kids routed by each other's fire, and nothing breaks
await g.scenario('hollow_skirmish_3v3');
const live = await page.evaluate(() => {
  const hit = window.__origHit;
  window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
  for (let i = 0; i < 3600 && Game.mode === 'scenario'; i++) stepGame(1 / 60);
  const kinds = {};
  for (const e of Game.scenario.enemies) for (const [k, v] of Object.entries(e._underFireKinds || {})) kinds[k] = (kinds[k] || 0) + v;
  return { kinds, mode: Game.mode };
});
check('in the Hollow 3v3, kids are routed by real fire (an episode or more in 60 s)', Object.values(live.kinds).reduce((a, b) => a + b, 0) >= 1, live);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
