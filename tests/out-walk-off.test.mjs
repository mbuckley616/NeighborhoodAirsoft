// v1.264 (decisions "Out kids and your BBs: one-way cover?", critic 15 Oct; Michael: B): a kid out in a one-life match
// stands with his hand up for OUT_WALK_AFTER (4 s), stopping your BBs and complaining as v1.237 made him, then walks back
// to his start with his hand still up, and from his first step every BB passes him: he is no longer a shield for his
// side. Checked on Storm the Cul-de-Sac (three kids, one life each), with the kids' guns held so the round runs on.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('winnmark_cul_de_sac');
await page.evaluate(() => {
  Game.player._graceT = 1e9;
  for (const e of Game.scenario.enemies) e.noFire = true;
  // fire one BB straight at a kid's chest from 0.6 m off, as `owner` on `team`; step until it lands or 0.1 s pass
  window._shootAt = (e, owner, team) => {
    const target = e.pos.clone(); target.y = (e.pos.y || 0) + 0.9;
    // v1.344: from the first side whose 0.6 m run-up is clear of anything solid (by the bulb's car since v1.343, +x wasn't)
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const dir = dirs.find(v => [0.2, 0.4, 0.6].every(s => !collidesObstacles(target.x - v.x * s, target.z - v.z * s, 0.05))) || dirs[0];
    const bb = makeBB(target.clone().addScaledVector(dir, -0.6), dir.clone().multiplyScalar(40), owner, null, null, team);
    bb.curveStrength = 0;
    bb.spawnPos = target.clone().addScaledVector(dir, -10);
    Game.scenario.bbs.push(bb);
    for (let i = 0; i < 6 && Game.mode === 'scenario' && Game.scenario.bbs.includes(bb); i++) stepGame(1 / 60);
    return { gone: !Game.scenario.bbs.includes(bb), x: +((bb.pos.x - e.pos.x) * dir.x + (bb.pos.z - e.pos.z) * dir.z).toFixed(2) };
  };
});
await g.spin(200);

// tag the kid furthest from his start who is on the ground (not on a perch or a ladder)
const t = await page.evaluate(() => {
  const foes = Game.scenario.enemies.filter(e => e.team !== 'player' && e.health > 0 && !e.perch && !e._lad && !e._climbed && e._spawnPos);
  foes.sort((a, b) => b.pos.distanceTo(b._spawnPos) - a.pos.distanceTo(a._spawnPos));
  window._kid = foes[0];
  const k = window._kid, team = combatantView(Game.player).team;
  if (k.pos.distanceTo(k._spawnPos) < 4) { k.pos.x += 6; k.mesh.group.position.x = k.pos.x; }   // far enough from home to see him walk
  const tag = _shootAt(k, 'player', team);
  return { name: k.name, tag, health: k.health, d0: +Math.hypot(k.pos.x - k._spawnPos.x, k.pos.z - k._spawnPos.z).toFixed(1), x0: k.pos.x, z0: k.pos.z };
});
check('a kid is tagged out', t.tag.gone && t.health <= 0, t);

const at = s => page.evaluate(([s, team]) => {
  const k = window._kid;
  for (let i = 0; i < Math.round(s * 60) && Game.mode === 'scenario'; i++) stepGame(1 / 60);
  return { moved: +Math.hypot(k.pos.x - window._x0, k.pos.z - window._z0).toFixed(2), home: +Math.hypot(k.pos.x - k._spawnPos.x, k.pos.z - k._spawnPos.z).toFixed(2),
    walking: !!k._walkingOff, off: !!k._offField, raise: +(k._hitRaise || 0).toFixed(2), phase: +(k._walkPhase || 0).toFixed(2),
    mesh: +Math.hypot(k.mesh.group.position.x - k.pos.x, k.mesh.group.position.z - k.pos.z).toFixed(3), mode: Game.mode };
}, [s]);
await page.evaluate(([x, z]) => { window._x0 = x; window._z0 = z; }, [t.x0, t.z0]);

const s3 = await at(3.5);
const stop3 = await page.evaluate(() => _shootAt(window._kid, 'player', combatantView(Game.player).team));
check('for the first seconds he stands where he was tagged, hand up', s3.moved < 0.05 && !s3.walking && s3.raise > 0.9, s3);
check('...and still stops your BB (v1.237)', stop3.gone && stop3.x < 0.4, stop3);

const s5 = await at(1.5);
check('after 4 s he walks toward his start, hand still up, legs going', s5.walking && s5.moved > 0.5 && s5.home < t.d0 - 0.5 && s5.raise > 0.9 && s5.phase > 0 && s5.mesh < 0.01, s5);
const mine = await page.evaluate(() => _shootAt(window._kid, 'player', combatantView(Game.player).team));
const theirs = await page.evaluate(() => _shootAt(window._kid, 'enemy', 'player'));
check('walking off, your BB passes him', !mine.gone || mine.x > 0.4, mine);
check('...and so does his teammates\'', !theirs.gone || theirs.x > 0.4, theirs);

const end = await at(40);
check('he reaches his start (or stops where he is held up) and the round goes on', end.off && end.mode === 'scenario', end);
console.log(`   ${t.name}: tagged ${t.d0} m from his start, ${end.home} m from it at the end`);
check('he gets home: within 1 m of his start', end.home < 1.0, end);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
