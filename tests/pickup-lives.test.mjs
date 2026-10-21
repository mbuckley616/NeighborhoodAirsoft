// v1.221 (decisions "Pickup Game: what is a life for you?", Michael: A; critic 13 Oct on v1.201): the board promises
// "3 lives for everyone, you included", but a kid's life is a tag, a walk home and a return, while yours was one hit
// where you stood, with nothing between hits; in 6 of 20 critic rounds all three went in about a second, once to one
// shotgun blast. Now in a Pickup Game a tag costs you a life and puts you back at your start with 2 s in which nothing
// tags you (VIP and Flags' respawn, lives not refilled). The story matches are untouched.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 3, tod: 'day', lives: 3, clock: 0 }));
await g.scenario('pickup_game');
await g.spin(10);

const hit = (n = 1) => page.evaluate(n => {
  for (let i = 0; i < n; i++) applyBBHit({ canDamage: true, team: 'enemy', owner: 'enemy' }, Game.player);
  const st = Game.scenario.playerStart;
  // v1.290 (D.48): a tag sends you walking home; the walk itself is vip.test's, so here you are put at the start
  const home = !!Game.player._goingHome;
  if (home) { Game.player.pos.copy(st.pos); playerWalkHomeStep(0); }
  return { mode: Game.mode, home, hits: Game.player.hitsTaken, max: Game.player.maxHits, grace: +Game.player._graceT.toFixed(2),
    atStart: Game.player.pos.distanceTo(st.pos) < 0.01, ours: Game.mode === 'scenario' ? pickupLivesLeft().ours : null,
    respawns: Game.scenario.playerRespawns };
}, n);
const away = () => page.evaluate(() => { Game.player.pos.x += 4; Game.player.pos.z += 3; return Game.player.pos.distanceTo(Game.scenario.playerStart.pos); });

const ours0 = await page.evaluate(() => pickupLivesLeft().ours);
const d1 = await away();
const h1 = await hit();
console.log('   first tag', d1.toFixed(1), 'm from the start:', JSON.stringify(h1), 'side lives before', ours0);
check('a tag costs one life and puts you back at your start, with 3 s of cover (v1.291)', h1.mode === 'scenario' && h1.home && h1.max === 3 && h1.hits === 1
  && h1.atStart && h1.grace === 3 && h1.ours === ours0 - 1 && h1.respawns === 1, h1);
const h2 = await hit(5);
check('the rest of a shotgun blast lands in the cover: still one life gone', h2.hits === 1 && h2.mode === 'scenario', h2);
await g.spin(185);   // 3.08 s: the cover is gone (v1.291: 3 s)
await away();
const h3 = await hit();
check('after the cover a second tag costs a second life, back at the start again', h3.hits === 2 && h3.atStart && h3.mode === 'scenario' && h3.ours === ours0 - 2, h3);
await g.spin(185);
const h4 = await hit();
await g.spin(60);
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const end = await page.evaluate(() => ({ mode: Game.mode, cls: document.getElementById('outcomeText').className }));
check('the third tag is your last life: the round is lost', h4.hits === 3 && !h4.atStart && end.mode === 'result' && /lose|out/.test(end.cls), { h4, end });

// A story match with more than one hit is as it was: a hit leaves you where you stand
await g.scenario('winnmark_seth_house');
await g.spin(10);
const s = await page.evaluate(() => { Game.player.maxHits = 3; Game.player.pos.x += 4; const p = Game.player.pos.clone();
  applyBBHit({ canDamage: true, team: 'enemy', owner: 'enemy' }, Game.player);
  return { hits: Game.player.hitsTaken, moved: +Game.player.pos.distanceTo(p).toFixed(3), grace: Game.player._graceT, mode: Game.mode }; });
check('a story match: a hit leaves you where you stand, no cover', s.hits === 1 && s.moved === 0 && s.grace === 0 && s.mode === 'scenario', s);

// Real rounds: 4v4 on Winnmark, 3 lives, the player standing at the start. No two lives inside 2 s.
const rounds = [];
for (let k = 0; k < 3; k++) {
  await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 4, tod: 'day', lives: 3, clock: 0 }));
  await g.scenario('pickup_game');
  const r = await page.evaluate(() => {
    const losses = []; let last = 0;
    for (let f = 0; f < 60 * 90 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      if (Game.player.hitsTaken !== last) { losses.push(+(Game.scenario.roundTime || f / 60).toFixed(2)); last = Game.player.hitsTaken; }
    }
    return { losses, mode: Game.mode };
  });
  rounds.push(r);
}
const gaps = rounds.flatMap(r => r.losses.slice(1).map((t, i) => +(t - r.losses[i]).toFixed(2)));
console.log('   4v4 rounds, lives lost at', JSON.stringify(rounds.map(r => r.losses)), 'gaps', JSON.stringify(gaps));
check('real 4v4 rounds: no two of your lives go inside 2 s', gaps.every(x => x >= 2), gaps);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
