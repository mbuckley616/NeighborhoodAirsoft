// v1.251 (decisions "The Last Saturday: what is a life for you?", Michael: A; critic 14 Oct on v1.224): the finale's
// briefing promises "three lives for everybody", but your three lives were three hits where you stood, two of them
// inside 0.75 s in 8 of 10 critic rounds. Now a tag there costs a life and sends you back to the west end with 2 s in
// which nothing tags you, as in the Pickup Game. Checked: the briefing, the rule scripted, and real rounds standing
// at the start and sprinting at the bulb.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'last_saturday';

const brief = await page.evaluate((ID) => getScenarioBriefing(ID).desc || SCENARIOS[ID].desc, ID);
check('the briefing says a tag sends you back to the west end', /walk back to the west end/.test(brief), brief);

await g.scenario(ID);
await g.spin(10);
const hit = (n = 1) => page.evaluate(n => {
  for (let i = 0; i < n; i++) applyBBHit({ canDamage: true, team: 'enemy', owner: 'enemy' }, Game.player);
  const st = Game.scenario.playerStart;
  return { mode: Game.mode, hits: Game.player.hitsTaken, max: Game.player.maxHits, grace: +Game.player._graceT.toFixed(2),
    atStart: Game.player.pos.distanceTo(st.pos) < 0.01, respawns: Game.scenario.playerRespawns || 0 };
}, n);
const away = () => page.evaluate(() => { Game.player.pos.x += 6; Game.player.pos.z += 2; return Game.player.pos.distanceTo(Game.scenario.playerStart.pos); });
await away();
const h1 = await hit();
check('a tag costs one of your three lives and puts you back at the west end, with 2 s of cover', h1.mode === 'scenario' && h1.max === 3 && h1.hits === 1 && h1.atStart && h1.grace === 2 && h1.respawns === 1, h1);
const h2 = await hit(4);
check('the rest of a burst lands in the cover: still one life gone', h2.hits === 1 && h2.mode === 'scenario', h2);
await g.spin(125);
await away();
const h3 = await hit();
check('after the cover a second tag costs a second life, back at the start again', h3.hits === 2 && h3.atStart && h3.mode === 'scenario', h3);
await g.spin(125);
const h4 = await hit();
await g.spin(60);
const end = await page.evaluate(() => ({ mode: Game.mode }));
check('the third tag is your last: the round is lost', h4.hits === 3 && end.mode === 'result', { h4, end });

// real rounds: you hold the start (3 rounds) or sprint at the bulb without firing (3 rounds); log when each life goes
const rounds = [];
for (const sprint of [false, false, false, true, true, true]) {
  await g.scenario(ID);
  rounds.push(await page.evaluate((sprint) => {
    const losses = []; let last = 0;
    if (sprint) { Game.keys.KeyW = true; Game.keys.ShiftLeft = true; Game.player.yaw = -Math.PI / 2; }   // east, toward the bulb
    for (let f = 0; f < 60 * 60 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      if (Game.player.hitsTaken !== last) { losses.push(+(Game.scenario.roundTime || 0).toFixed(2)); last = Game.player.hitsTaken; }
    }
    Game.keys.KeyW = false; Game.keys.ShiftLeft = false;
    return { sprint, losses, mode: Game.mode, respawns: Game.scenario.playerRespawns || 0 };
  }, sprint));
}
const gaps = rounds.flatMap(r => r.losses.slice(1).map((t, i) => +(t - r.losses[i]).toFixed(2)));
console.log('   rounds:', JSON.stringify(rounds.map(r => [r.sprint ? 'sprint' : 'hold', r.losses, r.mode])), 'gaps', JSON.stringify(gaps));
check('real rounds: no two of your lives go inside 2 s (v1.224: 0.08-0.75 s)', gaps.every(x => x >= 1.99), gaps);   // the cover is 120 steps; a hundredth for rounding
check('and you are back at the start after each tag but the last', rounds.every(r => r.respawns === Math.min(r.losses.length, 2)), rounds.map(r => [r.losses.length, r.respawns]));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
