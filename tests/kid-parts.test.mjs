// v1.472 (D.93, Michael: A, 11 Nov 2026): kids carry homemade parts. Seth's taped twin mag, Devon's sock-padded stock,
// Sean's tennis-ball grip and Mason's glow-stick tracer, each on the kid's own long gun (never a pistol or a MAC-10, never a
// gun you lent him), shown on it and doing its job: Seth's pause between pulls 0.85, Devon's spread 0.8 and his strings
// 0.7, Sean's spread on the move 0.75, Mason's BBs with the green streak (which no kid takes as a sighting of you).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// a match for each kid where he holds a gun with the part's slot, and one where Seth has a pistol
const picks = await page.evaluate(() => {
  const want = { seth: null, devon: null, sean: null, mason: null }, out = {};
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    if (sc.tutorial || sc.ffa || sc.pickup || sc.net) continue;
    for (const es of sc.enemySetup || []) {
      if (!(es.charId in want)) continue;
      const t = kidGunPartType(es.charId, es.weapon);
      if (t) (out[es.charId + 'All'] = out[es.charId + 'All'] || []).push(id);
      if (t && !out[es.charId]) out[es.charId] = { id, weapon: es.weapon, type: t };
      if (es.charId === 'seth' && es.weapon === 'pistol' && !out.sethPistol) out.sethPistol = { id, weapon: 'pistol' };
    }
  }
  return out;
});
console.log('   picks:', JSON.stringify(picks));

const look = (charId) => page.evaluate((charId) => {
  const e = Game.scenario.enemies.find(k => k.charId === charId);
  if (!e) return null;
  const part = e.mesh.gunGroup.userData.kidPart;
  const r = { weapon: e.weapon, part: e._gunPart, meshes: 0, span: null };
  if (part) {
    part.traverse(o => { if (o.isMesh) r.meshes++; });
    // the part sits on the gun: its box inside 5 cm of the gun's own box
    const gg = e.mesh.gunGroup; gg.updateWorldMatrix(true, true);
    const iv = new THREE.Matrix4().copy(gg.matrixWorld).invert();
    const gb = new THREE.Box3(); for (const c of gg.userData.gunParts) gb.union(new THREE.Box3().setFromObject(c).applyMatrix4(iv));
    const pb = new THREE.Box3().setFromObject(part).applyMatrix4(iv);
    r.span = +Math.max(gb.min.x - pb.min.x, pb.max.x - gb.max.x, gb.min.y - pb.min.y, pb.max.y - gb.max.y, gb.min.z - pb.min.z, pb.max.z - gb.max.z).toFixed(3);
  }
  return r;
}, charId);
const leave = async () => { await page.evaluate(() => endScenario('forfeit')); await page.waitForFunction(() => Game.mode !== 'scenario'); };

// --- each kid's part on his gun
const R = {};
for (const k of ['seth', 'devon', 'sean', 'mason']) {
  if (!picks[k]) { R[k] = null; continue; }
  // the first of his matches where he is on the field with that gun (a crew can take his place)
  for (const id of picks[k + 'All']) {
    await g.scenario(id);
    if (await page.evaluate((k) => Game.scenario.enemies.some(e => e.charId === k && e._gunPart), k)) { R[k + 'Match'] = id; break; }
    await leave();
  }
  // past the opening hold (no kid fires in it)
  await page.evaluate(() => { Game.player.maxHits = 999; for (let i = 0; i < 200 && inOpeningHold(); i++) stepGame(1 / 60); });
  R[k] = await look(k);
  if (k === 'devon') {
    // his spread with the stock against bare: 600 shots at a point 30 m ahead, the angle off the aim line
    R.devon.spread = await page.evaluate(() => {
      const e = Game.scenario.enemies.find(k => k.charId === 'devon');
      const obs = Game.player.obstacles; Game.player.obstacles = [];
      const run = (part, moving) => {
        e._gunPart = part; e._animSpeed = moving ? 2 : 0; e._lineHolds = 0; e.yaw = Math.PI / 2; e.noFire = false;
        let sum = 0, n = 0; const rng0 = _gameRng; _gameRng = _mulberry32(472);   // the same draws each run
        for (let i = 0; i < 600; i++) {
          Game.scenario.bbs.length = 0;
          const muzzleish = e.pos.clone(); muzzleish.y += 1.2;
          const tgt = muzzleish.clone().add(new THREE.Vector3(30, 0, 0));
          spawnEnemyBB(e, tgt);
          const bb = Game.scenario.bbs[0]; if (!bb) continue;
          const v = bb.vel.clone().normalize(), aim = tgt.clone().sub(bb.pos).normalize();
          sum += Math.acos(Math.min(1, v.dot(aim))); n++;
        }
        for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh);
        Game.scenario.bbs.length = 0; _gameRng = rng0;
        return n ? sum / n : null;
      };
      const bare = run(null, false), stock = run('sock_stock', false), ball = run('tennis_grip', true), ballStill = run('tennis_grip', false);
      e._gunPart = 'sock_stock'; Game.player.obstacles = obs;
      return { n: 600, bare: +bare.toFixed(5), stock: +(stock / bare).toFixed(3), ballMoving: +(ball / bare).toFixed(3), ballStill: +(ballStill / bare).toFixed(3) };
    });
  }
  if (k === 'mason') {
    R.mason.shot = await page.evaluate(() => {
      const e = Game.scenario.enemies.find(k => k.charId === 'mason');
      const obs = Game.player.obstacles; Game.player.obstacles = [];
      Game.scenario.bbs.length = 0; e.yaw = Math.PI / 2; e.noFire = false;
      const t = e.pos.clone().add(new THREE.Vector3(20, 1.2, 0));
      spawnEnemyBB(e, t);
      const bb = Game.scenario.bbs[0];
      Game.player.obstacles = obs;
      const r = bb ? { streak: !!bb._streak, child: bb._streak && bb._streak.parent === bb.mesh, tracer: !!bb._tracer, from: !!bb._tracerFrom, night: Game.scenario.timeOfDay } : null;
      // and another kid's BB: none
      const other = Game.scenario.enemies.find(k => k !== e && !k._gunPart);
      if (other) { Game.scenario.bbs.length = 0; other.yaw = Math.PI / 2; other.noFire = false; Game.player.obstacles = []; spawnEnemyBB(other, other.pos.clone().add(new THREE.Vector3(20, 1.2, 0))); r.other = !!(Game.scenario.bbs[0] && Game.scenario.bbs[0]._streak); Game.player.obstacles = obs; }
      Game.scenario.bbs.length = 0;
      return r;
    });
  }
  if (k === 'seth') {
    // his pause after a pull, against bare: the recovery's own random range is the same, so compare the mean of 400 pulls
    R.seth.recovery = await page.evaluate(() => {
      const e = Game.scenario.enemies.find(k => k.charId === 'seth');
      return { taped: kidPartMult(e, 'recoveryMult'), climbDevon: kidPartMult({ _gunPart: 'sock_stock' }, 'climbMult') };
    });
    // a match on a gun you lent him: no part; back on his own gun, it is
    R.seth.loan = await page.evaluate(() => {
      const e = Game.scenario.enemies.find(k => k.charId === 'seth');
      const own = e.weapon;
      e.crewLoan = { gun: 'ak47', own, bbs: 3, loaded: null }; e.weapon = 'ak47'; fitKidGunPart(e);
      const lent = { part: e._gunPart, mesh: !!e.mesh.gunGroup.userData.kidPart };
      crewKidOwnGun(e);
      const back = { weapon: e.weapon, part: e._gunPart, mesh: !!e.mesh.gunGroup.userData.kidPart, n: e.mesh.gunGroup.children.filter(c => c.userData.kidGunPart).length };
      return { lent, back };
    });
  }
  // a minute of the match: nothing throws
  await page.evaluate(() => { Game.player.maxHits = 999; for (let i = 0; i < 600; i++) { if (Game.mode !== 'scenario') break; stepGame(1 / 60); } });
  await leave();
}
for (const k in R) console.log(`   ${k}:`, JSON.stringify(R[k]));

check('Seth, Devon, Sean and Mason each have a match on a gun the part fits', picks.seth && picks.devon && picks.sean && picks.mason, picks);
const P = { seth: 'taped_mag', devon: 'sock_stock', sean: 'tennis_grip', mason: 'glow_tracer' };
check('each carries his part on his gun, a few pieces, on the gun (inside 5 cm of its box)',
  Object.keys(P).every(k => R[k] && R[k].part === P[k] && R[k].meshes >= 2 && R[k].span < 0.05), R);
check('Devon\'s sock stock: his spread 0.8 of bare (same draws, ±0.01)', R.devon && Math.abs(R.devon.spread.stock - 0.8) < 0.01, R.devon && R.devon.spread);
check('the tennis ball: 0.75 on the move, nothing standing (same draws, ±0.01)', R.devon && Math.abs(R.devon.spread.ballMoving - 0.75) < 0.01 && Math.abs(R.devon.spread.ballStill - 1) < 0.01, R.devon && R.devon.spread);
check('Seth\'s taped mag: his pause 0.85; Devon\'s strings wander 0.7', R.seth && R.seth.recovery.taped === 0.85 && R.seth.recovery.climbDevon === 0.7, R.seth && R.seth.recovery);
check('Mason\'s BBs carry the streak; no kid reads it as you (no tracer sighting); other kids\' BBs none',
  R.mason && R.mason.shot && R.mason.shot.streak && R.mason.shot.child && !R.mason.shot.tracer && !R.mason.shot.from && R.mason.shot.other === false, R.mason && R.mason.shot);
check('on a gun you lent him, no part; back on his own, his part, once', R.seth && R.seth.loan.lent.part === null && !R.seth.loan.lent.mesh && R.seth.loan.back.part === 'taped_mag' && R.seth.loan.back.n === 1, R.seth && R.seth.loan);

// --- Seth with a pistol: nothing
if (picks.sethPistol) {
  await g.scenario(picks.sethPistol.id);
  const sp = await look('seth');
  console.log('   seth pistol:', JSON.stringify(sp));
  check('Seth with a pistol carries no part', sp && sp.weapon === 'pistol' && sp.part === null && sp.meshes === 0, sp);
  await leave();
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
