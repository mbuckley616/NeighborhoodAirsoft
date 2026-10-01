// v1.109 (Found in play, critic v1.102): the player starts each match looking at the fight, not at a wall.
// For every scenario: enter, spin 2 frames, and measure the angle between the player's facing (yaw 0 faces
// -z) and the direction to the enemy kids' centroid. The Hollow's fort spawns had their yaws swapped, so
// every Hollow match that spawns on team_b opened looking at the south fort's back wall.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ids = await page.evaluate(() => Object.keys(SCENARIOS));
const rows = [];
for (const id of ids) {
  await g.scenario(id);
  await g.spin(2);
  rows.push(await page.evaluate(id => {
    const sc = SCENARIOS[id], p = Game.player;
    const pTeam = combatantTeam(p);
    const foes = (Game.scenario.enemies || []).filter(e => e.team !== 'player' && (e.team || 'enemy') !== pTeam);
    let cx = 0, cz = 0; for (const e of foes) { cx += e.pos.x; cz += e.pos.z; }
    cx /= Math.max(1, foes.length); cz /= Math.max(1, foes.length);
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const dx = cx - p.pos.x, dz = cz - p.pos.z, d = Math.hypot(dx, dz) || 1;
    const ang = Math.acos(Math.max(-1, Math.min(1, (fx * dx + fz * dz) / d))) * 180 / Math.PI;
    return { id, fn: sc.builderFn, spawn: sc.playerSpawn || '-', type: sc.scenarioType, foes: foes.length, ang: Math.round(ang) };
  }, id));
  await page.evaluate(() => { Game.mode = 'scenario'; endScenario('forfeit'); enterBedroom(); });
  await g.spin(5);
}
for (const r of rows) console.log(`   ${r.ang.toString().padStart(3)}°  ${r.id}  (${r.fn}, ${r.spawn}, ${r.type}, ${r.foes} foes)`);
const hollow = rows.filter(r => /Hollow/.test(r.fn));
check('there are Hollow scenarios', hollow.length > 0, hollow.length);
for (const r of hollow) check(`${r.id}: the player starts facing within 60° of the enemy kids`, r.ang <= 60, r);
const back = rows.filter(r => r.ang > 120 && r.foes > 0);
check('no scenario starts the player with the enemy kids behind them (>120°)', back.length === 0, back.map(r => r.id + ' ' + r.ang));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
