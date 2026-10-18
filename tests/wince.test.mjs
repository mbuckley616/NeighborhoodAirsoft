// v1.261 (backlog D.45, Michael 16 Oct: enemies wince/react based on where they are hit, for a second or two). Checked:
// where a BB lands picks the flinch (head, chest, either arm, leg, from its height up his body and how far off his
// middle); a real tag through applyBBHit starts it; it leans him (back for the head, forward for the chest, toward the
// leg) and brings his free hand to the spot, peaks within 0.2 s, and is gone by 1.5 s with his pose back as it was;
// a BB on a kid who is already out starts one too.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_seth_house');
const place = () => page.evaluate(() => {
  const P = Game.player, k = Game.scenario.enemies[0];
  P._graceT = 1e9; P.maxHits = 999; k.noFire = true; k.state = 'hiding';
  k.pos.set(P.pos.x - Math.sin(P.yaw) * 3, k.pos.y, P.pos.z - Math.cos(P.yaw) * 3);
  k.yaw = P.yaw + Math.PI; k.mesh.group.rotation.y = k.yaw;
});
await place();
const parts = await page.evaluate(() => {
  const k = Game.scenario.enemies[0], yaw = k.mesh.group.rotation.y, v = combatantView(k), foot = v.chestY - v.height * 0.65;
  const at = (up, lx) => kidHitPart(k, new THREE.Vector3(k.pos.x + lx * Math.cos(yaw), foot + up * v.height, k.pos.z - lx * Math.sin(yaw)));
  return { head: at(0.9, 0), chest: at(0.62, 0.05), armR: at(0.65, -0.24), armL: at(0.65, 0.24), leg: at(0.2, -0.08) };
});
console.log('   parts:', JSON.stringify(parts));
check('where it lands picks the flinch: head, chest, the gun arm, the other arm, a leg',
  parts.head.part === 'head' && parts.chest.part === 'chest' && parts.armR.part === 'arm' && parts.armR.side === -1 &&
  parts.armL.part === 'arm' && parts.armL.side === 1 && parts.leg.part === 'leg', parts);

// a real tag, in the chest
const tag = await page.evaluate(() => {
  const k = Game.scenario.enemies[0], P = Game.player, v = combatantView(k);
  const at = new THREE.Vector3(k.pos.x, v.chestY, k.pos.z);
  applyBBHit({ owner: 'player', team: 'player', pos: at, spawnPos: P.pos.clone(), vel: new THREE.Vector3(0, 0, -50), canDamage: true }, k);
  const w0 = k._wince && k._wince.part, track = [];
  for (let i = 1; i <= 100; i++) {
    stepGame(1 / 60);
    if (i % 6 === 0) track.push({ t: +(i / 60).toFixed(2), rx: +k.mesh.group.rotation.x.toFixed(3), sh: +k.mesh.pose.rigL.shoulder.rotation.x.toFixed(2), on: !!k._wince });
  }
  return { part: w0, out: k.health <= 0, track };
});
console.log('   chest tag:', JSON.stringify(tag.track.filter((_, i) => i % 2 === 0)));
const peak = tag.track.filter(s => s.t >= 0.2 && s.t <= 0.7);
check('a tag in the chest starts a chest flinch', tag.part === 'chest', tag.part);
check('he hunches forward and his free hand goes to his chest while it peaks (0.2-0.7 s)', peak.length && peak.every(s => s.rx > 0.15 && s.sh < -0.9), peak);
const end = tag.track[tag.track.length - 1];
check('by 1.6 s it is over and he stands as the out pose has him (no lean left)', !end.on && Math.abs(end.rx) < 0.01, end);

// a BB on him now that he is out
const again = await page.evaluate(() => {
  const k = Game.scenario.enemies[0], P = Game.player, v = combatantView(k), foot = v.chestY - v.height * 0.65;
  const yaw = k.mesh.group.rotation.y, at = new THREE.Vector3(k.pos.x - 0.06 * Math.cos(yaw), foot + 0.15 * v.height, k.pos.z + 0.06 * Math.sin(yaw));
  k._outLineAt = null;
  applyBBHit({ owner: 'player', team: 'player', pos: at, spawnPos: P.pos.clone(), vel: new THREE.Vector3(0, 0, -50), canDamage: true }, k);
  const part = k._wince && k._wince.part;
  for (let i = 0; i < 20; i++) stepGame(1 / 60);
  return { part, rz: +k.mesh.group.rotation.z.toFixed(3), out: k.health <= 0 };
});
check('a BB on him while he is out: a leg flinch, leaning toward it', again.out && again.part === 'leg' && Math.abs(again.rz) > 0.08, again);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
