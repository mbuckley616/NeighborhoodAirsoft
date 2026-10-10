// v1.183 (backlog D.16 B, Michael: A on D.20): weight. Kids used to snap to face their target every frame and set off
// and stop at full speed. Now the body (e.yaw, which the mesh and the hitboxes follow) turns over about 0.2 s at no
// more than 14 rad/s, no shot leaves while the body is more than 0.6 rad off the line, a kid who has stood still sets
// off at 40% of his pace and reaches it in 0.18 s, and he leans into starts, stops and turns. Kids play real rounds
// (the player untaggable at spawn) and every frame is read; then one kid is turned round on purpose.
// `SRC=<file>` runs it against another build (the numbers for the old one are in the devlog).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });

const MATCHES = ['bunratty_ffa', 'lot_team_3v3', 'hollow_skirmish_3v3'];
const all = { rates: [], shotErr: [], starts: [], leanMax: 0, leanFrames: 0, moveFrames: 0, shots: 0 };
for (const id of MATCHES) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const out = { rates: [], shotErr: [], starts: [], leanMax: 0, leanFrames: 0, moveFrames: 0, shots: 0 };
    const sp = spawnEnemyBB;
    window.spawnEnemyBB = (e, t) => {
      const n = Game.scenario.bbs.length;
      const err = (t && typeof e.yaw === 'number') ? Math.abs(wrap(Math.atan2(t.x - e.pos.x, t.z - e.pos.z) - e.yaw)) : 0;
      const res = sp(e, t);
      if (Game.scenario.bbs.length > n) { out.shots++; out.shotErr.push(err); }
      return res;
    };
    const hist = new Map();
    for (let f = 0; f < 60 * 30 && Game.mode === 'scenario'; f++) {
      const before = new Map(Game.scenario.enemies.map(e => [e, { yaw: e.yaw, x: e.pos.x, z: e.pos.z, alive: e.health > 0 }]));
      stepGame(1 / 60);
      for (const e of Game.scenario.enemies) {
        const b = before.get(e);
        if (!b || !b.alive || !(e.health > 0) || e._lad || e.state === 'retreating') { hist.delete(e); continue; }
        const step = Math.hypot(e.pos.x - b.x, e.pos.z - b.z);
        if (step > 0.3) { hist.delete(e); continue; }   // a teleport (respawn, anti-wedge)
        if (typeof b.yaw === 'number') out.rates.push(Math.abs(wrap(e.yaw - b.yaw)) * 60);
        const v = step * 60;
        let h = hist.get(e); if (!h) { h = []; hist.set(e, h); }
        h.push(v);
        if (v > 0.3) {
          out.moveFrames++;
          const lean = Math.max(Math.abs(e.mesh.group.rotation.x), Math.abs(e.mesh.group.rotation.z));
          out.leanMax = Math.max(out.leanMax, lean);
          if (lean > 0.01) out.leanFrames++;
        }
        // a start: 15 frames still, then 20 frames on the move; first step against the pace 0.25-0.33 s on
        const k = h.length - 21;
        if (k >= 15 && h.slice(k - 15, k).every(x => x < 0.01) && h.slice(k, k + 21).every(x => x > 0.3)) {
          const pace = Math.max(...h.slice(k + 15, k + 21));
          out.starts.push(h[k] / pace);
        }
      }
    }
    return out;
  });
  console.log(`   ${id}: ${r.rates.length} kid-frames, ${r.shots} shots, ${r.starts.length} starts, lean max ${r.leanMax.toFixed(3)} rad`);
  all.rates.push(...r.rates); all.shotErr.push(...r.shotErr); all.starts.push(...r.starts);
  all.leanMax = Math.max(all.leanMax, r.leanMax); all.leanFrames += r.leanFrames; all.moveFrames += r.moveFrames; all.shots += r.shots;
}
const pct = (a, q) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : NaN; };
const S = {
  turnRateMax: +Math.max(...all.rates).toFixed(2), turnRate99: +pct(all.rates, 0.99).toFixed(2),
  shots: all.shots, shotErrMax: +Math.max(0, ...all.shotErr).toFixed(3),
  starts: all.starts.length, startRatioMed: +pct(all.starts, 0.5).toFixed(2), startRatioMax: +pct(all.starts, 0.9).toFixed(2),
  leanMax: +all.leanMax.toFixed(3), leanShare: +(all.leanFrames / Math.max(1, all.moveFrames)).toFixed(2),
};
console.log('   ', JSON.stringify(S));
check('a kid turns at no more than 14 rad/s (no snap)', S.turnRateMax <= 14.2, S);
check('no BB leaves while the body is more than 0.6 rad off the line', S.shots > 20 && S.shotErrMax <= 0.6 + 1e-6, S);
check('a standing start sets off at under half pace', S.starts >= 5 && S.startRatioMed < 0.55, S);
check('kids lean on the move, 6 degrees at most', S.leanShare > 0.3 && S.leanMax <= 0.105, S);

// One kid turned round: Sean faces the player, then the player stands behind him.
await g.scenario('bunratty_sean');
const T = await page.evaluate(() => {
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (let f = 0; f < 60 * 4; f++) stepGame(1 / 60);
  const e = Game.scenario.enemies[0], P = Game.player.pos;
  const dx = P.x - e.pos.x, dz = P.z - e.pos.z;
  P.x = e.pos.x - dx; P.z = e.pos.z - dz;   // the same distance, straight behind him
  const want = () => Math.atan2(P.x - e.pos.x, P.z - e.pos.z);
  const err0 = Math.abs(wrap(want() - e.yaw));
  let within = null, half = null;
  for (let f = 1; f <= 60; f++) {
    stepGame(1 / 60);
    const err = Math.abs(wrap(want() - e.yaw));
    if (half == null && err < 0.6) half = f / 60;
    if (within == null && err < 0.05) within = f / 60;
  }
  return { err0: +err0.toFixed(2), fireable: half, faced: within, mode: Game.mode };
});
console.log('    turn round:', JSON.stringify(T));
check('turned round, he faces the player in 0.15-0.4 s', T.err0 > 2.5 && T.faced >= 0.15 && T.faced <= 0.4, T);
check('and may fire after about 0.2 s', T.fireable >= 0.12 && T.fireable <= 0.3, T);

check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
