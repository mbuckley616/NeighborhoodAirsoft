// v1.245 (Found in play, critic 15 Oct): "The first loss of a session freezes the game: endScenario('lose') took 2,227
// and 3,338 ms on a fresh boot (then 3–6 ms), all in the damage report (v1.238) creating its own WebGL renderer on its
// first draw." The report's renderer is now made, and its kid's shaders compiled, at the title just after the page
// loads; the first loss makes no WebGL context and compiles no shader, and takes what later losses take.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await page.waitForFunction(() => !!DAMAGE_REPORT.renderer, null, { timeout: 30000 }).catch(() => {});
const atTitle = await page.evaluate(() => ({ mode: Game.mode, made: !!DAMAGE_REPORT.renderer,
  progs: DAMAGE_REPORT.renderer ? DAMAGE_REPORT.renderer.info.programs.length : 0 }));
check('at the title the report\'s renderer is made and its shader compiled', atTitle.made && atTitle.progs >= 1, atTitle);

await g.bedroom();
await g.scenario('winnmark_seth_house');
await g.spin(160);
// a real loss: one BB from Seth into your chest, stepped until the round ends; counts WebGL contexts made meanwhile
const loss = () => page.evaluate(() => {
  const P = Game.player; P._graceT = 0;
  let contexts = 0;
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (/webgl/.test(kind) && !this._dmgSeen) { contexts++; this._dmgSeen = 1; } return gc.call(this, kind, ...a); };
  const shooter = Game.scenario.enemies.find(e => e.team !== 'player');
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const target = new THREE.Vector3(P.pos.x, P.pos.y + 0.62 * (P.eyeOffset + 0.1), P.pos.z);
  const dir = new THREE.Vector3(-fx, 0, -fz);
  const bb = makeBB(target.clone().addScaledVector(dir, -0.45), dir.clone().multiplyScalar(40), 'enemy', shooter, null, combatantTeam(shooter));
  bb.curveStrength = 0; bb.spawnPos = target.clone().addScaledVector(dir, -12);
  Game.scenario.bbs.push(bb);
  const progs = DAMAGE_REPORT.renderer.info.programs.length;
  const t0 = performance.now();
  for (let i = 0; i < 120 && Game.mode === 'scenario'; i++) stepGame(1 / 60);
  const ms = performance.now() - t0;
  HTMLCanvasElement.prototype.getContext = gc;
  const cv = document.getElementById('rsDamageCanvas');
  let drawn = false;
  if (cv) {
    const ctx = cv.getContext('2d'), at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    const bg = at(4, 4), kid = at(44, 60);
    drawn = Math.abs(bg[0] - kid[0]) + Math.abs(bg[1] - kid[1]) + Math.abs(bg[2] - kid[2]) > 30;
  }
  return { mode: Game.mode, ms: Math.round(ms), contexts, newProgs: DAMAGE_REPORT.renderer.info.programs.length - progs,
    rows: (Game.scenario.lastResult.damage || []).length, drawn };
});
const first = await loss();
console.log('   first loss: ' + JSON.stringify(first));
check('the first loss ends the round with a damage report, your kid drawn', first.mode === 'result' && first.rows === 1 && first.drawn, first);
check('no WebGL context made at the loss', first.contexts === 0, first.contexts);
check('no shader compiled for the report at the loss', first.newProgs === 0, first.newProgs);

await page.evaluate(() => document.getElementById('returnBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 30000 });
await g.scenario('winnmark_seth_house');
await g.spin(160);
const second = await loss();
console.log('   second loss: ' + JSON.stringify(second));
check('a second loss the same', second.mode === 'result' && second.drawn && second.contexts === 0, second);
// the critic's numbers were 2,227 and 3,338 ms first, 3–6 ms after; v1.244 here took 4,100–5,700 ms first
check(`the first loss takes about what the second does (${first.ms} ms against ${second.ms} ms; under 500 ms)`, first.ms < 500, [first.ms, second.ms]);
await g.close();
