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
    // v1.267: kids on every side of you (Infection in the Dark's nine round midfield, 25-40 m out) put their centroid
    // a couple of metres off and its direction is noise (60.2° on v1.266, 65° once two kids spawned a metre off a
    // pallet): such a start has no way to face, so it is marked `ring` and the facing checks leave it out
    const md = foes.reduce((s, e) => s + Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z), 0) / Math.max(1, foes.length);
    const ring = foes.length > 2 && d < md * 0.25;
    // v1.140: how far you can see straight ahead (±10°) at eye height before an obstacle
    let ahead = 80;
    for (const a of [-10, 0, 10]) {
      const yw = p.yaw + a * Math.PI / 180, ddx = -Math.sin(yw), ddz = -Math.cos(yw);
      for (const o of p.obstacles) { const t = obsRayDist(o, p.pos.x, p.pos.y + p.eyeOffset, p.pos.z, ddx, 0, ddz, 80); if (t != null && t < ahead) ahead = t; }
    }
    // v1.365 (Found in play, critic v1.353): your own base's flag pole, nearest and within 60° of straight ahead
    let pole = null;
    Game.scene.traverse(o => { const m = o.userData && o.userData.baseMarker; if (!m || m.color !== 0x3d7bd6) return;
      const w = new THREE.Vector3(); m.pole.getWorldPosition(w);
      const qx = w.x - p.pos.x, qz = w.z - p.pos.z, qd = Math.hypot(qx, qz) || 1e-6;
      const qa = Math.acos(Math.max(-1, Math.min(1, (fx * qx + fz * qz) / qd))) * 180 / Math.PI;
      if (qa <= 60 && (!pole || qd < pole)) pole = +qd.toFixed(2); });
    return { id, fn: sc.builderFn, spawn: sc.playerSpawn || '-', type: sc.scenarioType, foes: foes.length, ang: Math.round(ang), ring, ahead: +ahead.toFixed(1), pole };
  }, id));
  await page.evaluate(() => { Game.mode = 'scenario'; endScenario('forfeit'); enterBedroom(); });
  await g.spin(5);
}
for (const r of rows) console.log(`   ${r.ang.toString().padStart(3)}°  ${String(r.ahead).padStart(4)} m  ${r.id}  (${r.fn}, ${r.spawn}, ${r.type}, ${r.foes} foes)`);
const hollow = rows.filter(r => /Hollow/.test(r.fn) && !r.ring);
console.log('   surrounded at the start (left out of the facing checks):', rows.filter(r => r.ring).map(r => r.id));
check('there are Hollow scenarios', hollow.length > 0, hollow.length);
for (const r of hollow) check(`${r.id}: the player starts facing within 60° of the enemy kids`, r.ang <= 60, r);
const back = rows.filter(r => r.ang > 120 && r.foes > 0 && !r.ring);
check('no scenario starts the player with the enemy kids behind them (>120°)', back.length === 0, back.map(r => r.id + ' ' + r.ang));
// v1.140 (Found in play, critic v1.134): the lot free-for-all started you 0.9 m from a windshield
const blind = rows.filter(r => r.ahead < 2);
check('no scenario starts the player with an obstacle under 2 m ahead (±10°, eye height)', blind.length === 0, blind.map(r => r.id + ' ' + r.ahead));
// v1.365: the blue base's 2.4 m pole stood 0.12-1.5 m dead ahead of your eye in 7 team matches (Night Swim, Northcliff,
// Bellfield); a pole near your start now stands behind you
const poled = rows.filter(r => r.pole != null && r.pole < 4);
check('no team match starts with your base flag pole under 4 m ahead (within 60°)', poled.length === 0, poled.map(r => r.id + ' ' + r.pole));
const ffa = rows.find(r => r.id === 'lot_ffa');
check('lot_ffa: the start looks down the aisle, over 15 m clear', ffa && ffa.ahead > 15, ffa);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
