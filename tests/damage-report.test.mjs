// v1.238 (backlog D.34, Michael 14 Oct): "a 'damage report' after you've been eliminated from a match that shows where
// you were shot on your player mesh, and by what weapon. If you have multiple lives, it should show each shot that
// landed on your character." The result screen of a match you were tagged out of now shows your kid (your look, gun
// and gear) front and back with a numbered dot where each hit landed, and a list: where, who, his gun, how far, when,
// and which life.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 3, tod: 'day', lives: 3, clock: 0 }));
await g.scenario('pickup_game');
await g.spin(10);

// one BB from `shooter` that lands on you `h` of the way up your hitbox, `lat` m to your right, coming from `from`
// ('front', 'back' or 'right'), fired from 12 m away
const hitYou = (h, lat, from) => page.evaluate(([h, lat, from]) => {
  const P = Game.player;
  P._graceT = 0;
  const shooter = Game.scenario.enemies.find(e => e.team !== 'player');
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const target = new THREE.Vector3(P.pos.x + rx * lat, P.pos.y + h * (P.eyeOffset + 0.1), P.pos.z + rz * lat);
  const d = from === 'front' ? [-fx, -fz] : from === 'back' ? [fx, fz] : [-rx, -rz];   // the way it travels
  const dir = new THREE.Vector3(d[0], 0, d[1]);
  const bb = makeBB(target.clone().addScaledVector(dir, -0.45), dir.clone().multiplyScalar(40), 'enemy', shooter, null, combatantTeam(shooter));
  bb.curveStrength = 0;
  bb.spawnPos = target.clone().addScaledVector(dir, -12);
  Game.scenario.bbs.push(bb);
  for (let i = 0; i < 4 && Game.mode === 'scenario' && Game.scenario.bbs.includes(bb); i++) stepGame(1 / 60);
  return { hits: P.hitsTaken, mode: Game.mode, name: shooter.name, gun: getGunDisplayName(shooter.weapon || 'pistol') };
}, [h, lat, from]);

const a = await hitYou(0.62, 0, 'front');
await g.spin(130);
const b = await hitYou(0.93, 0.03, 'back');
await g.spin(130);
const c = await hitYou(0.2, 0.15, 'right');
console.log('   ' + JSON.stringify([a, b, c]));
await g.spin(60);
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const r = await page.evaluate(() => {
  const el = document.getElementById('rsDamage');
  const cv = document.getElementById('rsDamageCanvas');
  let px = null;
  if (cv) {
    const ctx = cv.getContext('2d');
    const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    px = { bg: at(4, 4), front: at(44, 60), back: at(132, 60) };
  }
  return { mode: Game.mode, dmg: Game.scenario.lastResult.damage, dots: Game.scenario.lastDamageDots,
    text: el ? el.innerText : null, shown: !!(el && el.offsetParent !== null), px };
});
console.log('   ' + JSON.stringify({ dmg: r.dmg, dots: r.dots, text: r.text, px: r.px }));
check('three hits, the third your last life: the round is lost', a.hits === 1 && b.hits === 2 && c.hits === 3 && r.mode === 'result', [a.hits, b.hits, c.hits, r.mode]);
check('the damage report is on the result screen', r.shown && /DAMAGE REPORT/.test(r.text || ''), r.text);
const parts = (r.dmg || []).map(d => d.part), lives = (r.dmg || []).map(d => d.life);
check('where: chest (from in front), head (from behind), right leg (from the side)', JSON.stringify(parts) === '["chest","head","right leg"]', parts);
check('each shot\'s life: 1, 2, 3', JSON.stringify(lives) === '[1,2,3]', lives);
check(`who and with what: ${a.name}, ${a.gun}, 12 m`, (r.dmg || []).every(d => d.by === a.name && d.gun === a.gun && d.dist === 12), r.dmg);
check('the list says it', (r.text || '').includes(`Chest — ${a.name}, ${a.gun}`) && /Head/.test(r.text) && /Right leg/.test(r.text) && /life 3/.test(r.text), r.text);
const dot = n => (r.dots || []).find(d => d.n === n);
check('three dots: the chest and the leg on the front view, the head on the back', (r.dots || []).length === 3 && dot(1).x < 88 && dot(3).x < 88 && dot(2).x > 88, r.dots);
check('the head dot is high, the chest in the middle, the leg low', dot(2).y < 45 && dot(1).y > dot(2).y && dot(1).y < dot(3).y && dot(3).y > 95, r.dots);
check('the right leg is on the kid\'s right: the left of the front view', dot(3).x < 44, dot(3));
const diff = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
check('your kid is drawn in both views', r.px && diff(r.px.front, r.px.bg) > 30 && diff(r.px.back, r.px.bg) > 30, r.px);
await g.shot('damage-report');

// A story match won without losing a life has no report; one lost with one hit has one row and no life numbers
await page.evaluate(() => document.getElementById('returnBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 30000 });
await g.scenario('winnmark_seth_house');
await g.spin(160);
const one = await hitYou(0.62, 0, 'front');
await g.spin(60);
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 }).catch(() => {});
const r2 = await page.evaluate(() => ({ mode: Game.mode, dmg: Game.scenario.lastResult.damage,
  text: (document.getElementById('rsDamage') || {}).innerText || '' }));
check('a one-hit loss: one row, no life numbers', one.hits >= 1 && r2.mode === 'result' && r2.dmg.length === 1 && !/life/.test(r2.text), r2);
const won = await page.evaluate(() => {
  Game.scenario.stats.damage = [{ part: 'chest', front: true, h: 0.6, lat: 0, by: 'X', gun: 'MP5', dist: 5, t: 3, life: 1 }];
  Game.scenario.playerRespawns = 0;
  return damageReportHtml('win');
});
check('a win with no life lost: no report', won === '', won);

// v1.322 (backlog D.62, Michael 22 Oct: "a red 'flash' around the peripherals of the player's view when they are hit"):
// each hit on you turns the edges of the view red at full strength, fading over 0.5 s of game time, over the scope too.
await page.evaluate(() => buildPickupScenario({ map: 'winnmark', size: 3, tod: 'day', lives: 3, clock: 0 }));
await g.scenario('pickup_game');
await g.spin(10);
const op = () => page.evaluate(() => ({ op: +getComputedStyle(document.getElementById('damageVignette')).opacity, n: Game.hurtFlashes,
  z: +getComputedStyle(document.getElementById('damageVignette')).zIndex, scopeZ: +getComputedStyle(document.getElementById('scopeOverlay')).zIndex,
  bg: getComputedStyle(document.getElementById('damageVignette')).backgroundImage }));
const f0 = await op();
await hitYou(0.6, 0, 'front');
const f1 = await op();
await g.spin(12);
const f2 = await op();
await g.spin(30);
const f3 = await op();
console.log('  hit flash', JSON.stringify({ f0: f0.op, f1: f1.op, f2: f2.op, f3: f3.op, n: f3.n, z: f1.z, scopeZ: f1.scopeZ }));
check('no flash before a hit', f0.op === 0 && f0.n === 0, f0);
check('a hit on you: the edges go red at once, nearly full strength', f1.n === 1 && f1.op > 0.9 && /radial-gradient/.test(f1.bg) && /rgba\(170, 0, 0, 0\.9\)/.test(f1.bg), f1);
check('still showing 0.2 s later, gone by 0.7 s', f2.op > 0.4 && f2.op < f1.op && f3.op === 0, { f1: f1.op, f2: f2.op, f3: f3.op });
check('it sits over the scope (a scoped player sees it)', f1.z > f1.scopeZ, f1);
const graced = await page.evaluate(() => { Game.player._graceT = 3; applyBBHit({ enemyRef: null }, Game.player); stepGame(1 / 60);
  return { n: Game.hurtFlashes, op: +getComputedStyle(document.getElementById('damageVignette')).opacity }; });
check('no flash for a BB that does not count (your 3 s grace)', graced.n === 1 && graced.op === 0, graced);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
