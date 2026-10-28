// v1.364 (backlog D.72, Michael: B, 27 Oct: "a ride-along match, Eric drives a golf cart round a set loop of the course,
// you ride on the back and shoot, kids in the trees and bunkers, three lives as the race"): Cart Path Only. Checked: you
// start on the cart's back seat by the halfway hut with three lives and five kids posted; the loop is clear of everything
// solid and inside the club; Eric drives two laps on his own (your keys change nothing) and that is a win; your view
// turns with the cart; a tag costs a life and he drives on, the third loses; it sits after The Eighteenth.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page, errs } = g;
await g.bedroom();

const ride = async (secs, keys) => {
  for (let c = 0; c < Math.ceil(secs / 2); c++) {
    const m = await page.evaluate((keys) => {
      for (let t = 0; t < 120 && Game.mode === 'scenario'; t++) {
        Game.player._graceT = 1e9;
        if (keys) { Game.keys.KeyW = Game.keys.KeyS = Game.keys.KeyA = Game.keys.KeyD = (t % 40) < 20; }
        stepGame(1 / 60);
      }
      return Game.mode;
    }, keys);
    if (m !== 'scenario') break;
  }
  // v1.375: the win lands 0.8 s of wall clock after the finish (endScenarioLater's timer), which a finish in the last
  // chunk did not always get before the read (58.6 s in, 28 Oct); wait for it when he has finished
  await page.waitForFunction(() => Game.mode !== 'scenario' || !Game.scenario.race.done, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => { const R = Game.scenario.race; return { mode: Game.mode, s: +(R.s - R.startS).toFixed(1), lap: R.lap,
    len: +R.len.toFixed(1), finish: R.finishT, top: +R.topV.toFixed(2), won: !!Game.persist.completed.club_cart_ride }; });
};

await g.scenario('club_cart_ride');
const start = await page.evaluate(() => {
  const R = Game.scenario.race, p = Game.player;
  let inScene = false; Game.scene.traverse(o => { if (o === R.mesh) inScene = true; });
  return { ride: !!(R && R.ride), inScene, eric: !!R.mesh.userData.eric, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2),
    yaw: +p.yaw.toFixed(2), lives: p.maxHits - p.hitsTaken, bounds: p.bounds,
    kids: Game.scenario.enemies.filter(e => e.health > 0 && e.team !== 'player').map(e => e.charId) };
});
check('you start on the back seat of Eric\'s cart by the halfway hut, looking up the cart path, three lives',
  start.ride && start.inScene && start.eric && Math.abs(start.x - 5) < 0.1 && start.z > 18 && start.z < 21.5 && start.y > 0.3 &&
  Math.abs(start.yaw) < 0.05 && start.lives === 3 && start.bounds === null, start);
check('five kids are posted round the course', start.kids.length === 5, start.kids);

const loop = await page.evaluate(() => {
  const R = Game.scenario.race, b = { minX: -40, maxX: 40, minZ: -28, maxZ: 29 };
  let blocked = 0, out = 0;
  for (let i = 0; i < R.xs.length; i++) {
    if (collidesObstacles(R.xs[i], R.zs[i], 0.7, 0.3)) blocked++;
    if (R.xs[i] < b.minX + 1 || R.xs[i] > b.maxX - 1 || R.zs[i] < b.minZ + 1 || R.zs[i] > b.maxZ - 1) out++;
  }
  return { n: R.xs.length, len: +R.len.toFixed(1), blocked, out };
});
check('the loop (about 100 m) runs clear of everything solid and inside the club', loop.blocked === 0 && loop.out === 0 && loop.len > 95 && loop.len < 115, loop);

// your keys do nothing: the first 10 s with W/A/S/D held on and off goes as far as the same 10 s without (to the page's
// own frames between the steps, under 1.5 m; S held half the time in the go-cart would cost far more)
const withKeys = await ride(10, true);
await page.evaluate(() => { for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) Game.keys[k] = false; });
const turned = await page.evaluate(() => ({ yaw: +Game.player.yaw.toFixed(2), x: +Game.player.pos.x.toFixed(1), z: +Game.player.pos.z.toFixed(1) }));
await g.scenario('club_cart_ride');
const noKeys = await ride(10, false);
check('you can\'t steer or brake: your keys change nothing', Math.abs(withKeys.s - noKeys.s) < 1.5 && noKeys.s > 35, { withKeys, noKeys });
check('your view turns with the cart round the corner (no mouse)', turned.yaw < -1.3 && turned.yaw > -1.8 && turned.x > 6, turned);

const done = await ride(60, false);
check('Eric drives two laps on his own and that is a win', done.mode !== 'scenario' && done.won && done.finish > 30 && done.finish < 60 && done.top <= 5.6, done);
const card = () => page.evaluate(() => ({ outcome: document.getElementById('outcomeText').textContent, flavor: document.getElementById('flavorText').textContent }));
// v1.375 (Found in play, critic v1.372): the win read "The last one's out" with all five still in
const winCard = await card();
check('the win card says the laps are done and that you tagged none of the five, who are still in (v1.375)',
  /TWO LAPS/.test(winCard.outcome) && /never tagged one/.test(winCard.flavor) && /Marcus/.test(winCard.flavor) && !/last one/i.test(winCard.flavor), winCard);

await page.evaluate(() => { delete Game.persist.completed.club_cart_ride; });
await g.scenario('club_cart_ride');
const tags = await page.evaluate(() => {
  const p = Game.player, R = Game.scenario.race, hit = () => applyBBHit({ pos: p.pos.clone(), spawnPos: p.pos.clone() }, p);
  const quiet = (n) => { for (let t = 0; t < n; t++) { p._graceT = 1e9; stepGame(1 / 60); } p._graceT = 0; };   // the kids' BBs land in a grace
  quiet(60);
  const s0 = R.s; hit(); const one = { hits: p.hitsTaken, mode: Game.mode, grace: p._graceT };
  hit(); const inGrace = p.hitsTaken;
  quiet(120);
  const moved = +(R.s - s0).toFixed(1);
  hit(); const two = { hits: p.hitsTaken, mode: Game.mode };
  quiet(120);
  hit(); return { one, inGrace, moved, two, three: { hits: p.hitsTaken, mode: Game.mode, won: !!Game.persist.completed.club_cart_ride } };
});
check('a tag costs a life and he drives on, with 1.5 s in which nothing tags you', tags.one.hits === 1 && tags.one.mode === 'scenario' && tags.one.grace === 1.5 && tags.inGrace === 1 && tags.moved > 5, tags);
check('the third tag loses', tags.two.hits === 2 && tags.two.mode === 'scenario' && tags.three.hits === 3 && tags.three.mode !== 'scenario' && !tags.three.won, tags);
const loseCard = await card();
check('the loss card says where Eric stopped the cart, not "too many angles" (v1.375)', /YOU'RE OUT/.test(loseCard.outcome) && /Eric stops the cart/.test(loseCard.flavor) && !/angles/.test(loseCard.flavor), loseCard);

// the kids shoot at you as you pass: in the first lap with nothing tagging you, some of them fire
await g.scenario('club_cart_ride');
const fire = await page.evaluate(() => {
  const shots = {};
  const kids = Game.scenario.enemies.filter(e => e.team !== 'player');
  for (let t = 0; t < 60 * 22 && Game.mode === 'scenario'; t++) {
    Game.player._graceT = 1e9;
    stepGame(1 / 60);
    for (const bb of (Game.scenario.bbs || [])) if (bb.enemyRef && !bb._counted) { bb._counted = true; shots[bb.enemyRef.charId] = (shots[bb.enemyRef.charId] || 0) + 1; }
  }
  return { shots, kids: kids.length };
});
check('the kids shoot at you as you go round', Object.keys(fire.shots).length >= 2, fire);

check('it sits on the club\'s ladder after The Eighteenth, before Hold the Gazebo', await page.evaluate(() => {
  const ids = PIN_SCENARIO_GROUPS.country_club, i = ids.indexOf('club_cart_ride');
  return ids[i - 1] === 'club_eighteenth_3v3' && ids[i + 1] === 'club_defend_gazebo'; }));
check('no page errors', errs.length === 0, errs);
await g.close();
