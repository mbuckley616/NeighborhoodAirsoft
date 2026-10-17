// v1.263 (decisions "A trade on the last tag counts as a loss", critic 16 Oct; Michael: A, a trade goes to you): once
// your tag on the last kid lands, the round is won, and a BB of his already in the air no longer tags you in the 600 ms
// the win waits to show. Checked with a real enemy BB in flight in Seth's House: without the tag it puts you out; with
// the tag landing first it lands on you and changes nothing, and the round ends YOU GOT THEM.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'winnmark_seth_house';
// A BB of Seth's 1.2 m in front of you, flying at your chest at 40 m/s (it lands on the second step). Seth's own gun is
// held (noFire) so that BB is the only one in the air.
// the two steps live in the page, so the race below can run them in one evaluate
const install = () => page.evaluate(() => {
  window.__fire = () => {
    const P = Game.player, seth = Game.scenario.enemies.find(e => e.team !== 'player');
    seth.noFire = true; Game.scenario.bbs.length = 0; P._graceT = 0;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const target = new THREE.Vector3(P.pos.x, P.pos.y + 0.6 * (P.eyeOffset + 0.1), P.pos.z);
    const dir = new THREE.Vector3(-fx, 0, -fz);
    const bb = makeBB(target.clone().addScaledVector(dir, -1.2), dir.clone().multiplyScalar(40), 'enemy', seth, null, combatantTeam(seth));
    bb.curveStrength = 0;
    bb.spawnPos = target.clone().addScaledVector(dir, -8);
    Game.scenario.bbs.push(bb);
    return Game.scenario.bbs.length;
  };
  window.__tagSeth = () => {
    const seth = Game.scenario.enemies.find(e => e.team !== 'player');
    applyBBHit({ owner: 'player', pos: seth.pos.clone().setY(seth.pos.y + 1.2), spawnPos: Game.player.pos.clone() }, seth);
    return { health: seth.health, won: Game.scenario.wonRound === Game.roundSeq };
  };
});
const fire = () => page.evaluate(() => window.__fire());
const tagSeth = () => page.evaluate(() => window.__tagSeth());
await install();
const state = () => page.evaluate(() => ({ mode: Game.mode, hits: Game.player.hitsTaken, max: Game.player.maxHits, bbs: Game.scenario.bbs.length }));

// Without the tag: the BB in the air puts you out.
await g.scenario(ID);
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.noFire = true; });
await g.spin(300);
await fire();
await g.spin(4);
const ctl = await state();
check('the BB in flight tags you when nothing else happens (the setup is a real hit)', ctl.hits >= 1 && ctl.mode !== 'scenario', ctl);
await page.evaluate(() => enterBedroom()); await g.spin(5);

// With your tag on Seth landing first: the same BB lands and you stay in; the round is a win.
await g.scenario(ID);
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.noFire = true; });
await g.spin(300);
// fired and tagged in one evaluate: between two, the page's own frame loop can step the game, and on a slow runner one
// frame (30 ms+) carries the BB the 1.2 m to you before the tag lands (CI, 17 Oct, every run on shard 1/8 or 3/8)
const tag = await page.evaluate(() => { window.__fire(); return window.__tagSeth(); });
await g.spin(4);
const after = await state();
check('your last tag lands first: the round is won at once', tag.health <= 0 && tag.won, tag);
check('his BB, already in the air, lands and does not tag you', after.hits === 0 && after.mode === 'scenario' && after.bbs === 0, after);
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 });
const res = await page.evaluate(() => document.getElementById('outcomeText').textContent.trim());
check('the round ends YOU GOT THEM', /GOT THEM/.test(res), res);
await page.evaluate(() => enterBedroom()); await g.spin(5);

// A tag on you before the win still counts (the rule starts at your last tag, not before).
await g.scenario(ID);
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.noFire = true; });
await g.spin(300);
await fire();
await g.spin(4);
const tag2 = await tagSeth();
const before = await state();
check('tagged before your last tag lands: still YOU\'RE OUT', before.hits >= 1 && before.mode !== 'scenario' && !tag2.won, { before, tag2 });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
