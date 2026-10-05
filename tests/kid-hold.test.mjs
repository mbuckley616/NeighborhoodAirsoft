// Backlog B.6 (v1.167): kids holding guns awkwardly. In real rounds, every sixth frame, each kid's firing hand is
// measured to his gun's grip and (two-handed holds) his off hand to the foregrip point setKidGunHold aims it at.
// Before v1.167 a fully crouched kid (hiding behind cover, a third of all samples) skipped the hold: the gun
// floated by his right knee, 21-39 cm from the hand. A tagged kid's raised gun sat 16-33 cm from the raised hand.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const MATCHES = ['hollow_skirmish_3v3', 'bunratty_hold_the_fort', 'winnmark_night_prowl'];
const res = {};
for (const id of MATCHES) {
  await g.scenario(id);
  res[id] = await page.evaluate(() => {
    const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    const V = THREE.Vector3, a = new V(), b = new V();
    const r = { n: 0, crouched: 0, small: 0, worstR: 0, worstL: 0, worstAt: null, hitN: 0, worstHit: 0 };
    for (let f = 0; f < 40 * 60 && Game.mode === 'scenario'; f++) {
      // one kid a round is tagged the real way at 10 s and 25 s, so the hit pose is sampled in play
      // v1.167 fix-up: before the step, as a BB's hit lands in updateBBs ahead of updateEnemies. Tagged after it, a
      // crouched kid with a life to spare was sampled between eliminateEnemy's stand-up (which resets the arms) and
      // the next hold: Eric, retreating, 21-30 cm from his grip in about one run in six (CI, 5 Oct).
      if (f === 600 || f === 1500) { const v = Game.scenario.enemies.find(e => e.health > 0 && e.mesh && e.mesh.group.visible); if (v) applyBBHit({}, v); }
      stepGame(1 / 60);
      if (f % 6) continue;
      for (const e of Game.scenario.enemies) {
        const k = e.mesh; if (!k || !k.pose || !k.group.visible) continue;
        k.group.updateMatrixWorld(true);
        const grip = gunGripLocal(e.weapon);
        k.pose.gunGroup.localToWorld(a.set(grip.x, grip.y, grip.z));
        const R = a.distanceTo(k.pose.rigR.hand.getWorldPosition(b)) * 100;
        if (e.health <= 0) {                       // the hit pose: arm and gun up
          if ((e._hitRaise || 0) > 0 && e.mesh.group.rotation.z === 0) { r.hitN++; r.worstHit = Math.max(r.worstHit, +R.toFixed(1)); }
          continue;
        }
        r.n++;
        if ((k.pose.crouch || 0) > 0.98) r.crouched++;
        let L = 0;
        if (isSmallGun(e.weapon)) r.small++;
        else {
          k.pose.gunGroup.localToWorld(a.set(0, -0.05, Math.min(gunForegripZ(e.weapon), 0.13)));
          L = a.distanceTo(k.pose.rigL.hand.getWorldPosition(b)) * 100;
        }
        if (R > r.worstR || L > r.worstL) r.worstAt = { kid: e.charId, state: e.state, crouch: k.pose.crouch, R: +R.toFixed(1), L: +L.toFixed(1) };
        r.worstR = Math.max(r.worstR, +R.toFixed(1)); r.worstL = Math.max(r.worstL, +L.toFixed(1));
      }
    }
    return r;
  });
  console.log('  ', id, JSON.stringify(res[id]));
}
const all = Object.values(res);
const sum = k => all.reduce((s, r) => s + r[k], 0), max = k => Math.max(...all.map(r => r[k]));
check('the rounds sampled crouched kids, small guns and large ones', sum('crouched') > 100 && sum('small') > 50 && sum('n') - sum('small') > 50,
  { n: sum('n'), crouched: sum('crouched'), small: sum('small') });
check('every living kid, every sample: firing hand within 2 cm of the grip', max('worstR') <= 2, all.map(r => r.worstAt));
check('every two-handed hold: off hand within 8 cm of the foregrip point', max('worstL') <= 8, all.map(r => r.worstAt));

// The hit pose, staged from a full shouldered aim (where the off arm crosses to the foregrip) and from a crouch.
const hit = await page.evaluate(() => {
  const k = Game.scenario.enemies[0].mesh, po = k.pose, V = THREE.Vector3, out = [];
  for (const w of ['pistol', 'ak47', 'sniper']) for (const c of [0, 1]) for (const amt of [0.3, 1]) {
    setKidCrouch(k, c); setKidGunHold(k, w, 1, 0); setKidHitPose(k, amt); k.group.updateMatrixWorld(true);
    const gr = gunGripLocal(w);
    const G = po.gunGroup.localToWorld(new V(gr.x, gr.y, gr.z)), H = po.rigR.hand.getWorldPosition(new V());
    const L = k.group.worldToLocal(po.rigL.hand.getWorldPosition(new V()));
    const muzzleUp = po.gunGroup.localToWorld(new V(0, 0, 0.3)).y - po.gunGroup.localToWorld(new V(0, 0, 0)).y;
    out.push({ w, c, amt, R: +(G.distanceTo(H) * 100).toFixed(1), offX: +L.x.toFixed(2), offY: +L.y.toFixed(2), up: +muzzleUp.toFixed(2) });
  }
  return out;
});
console.log('   hit pose (w, crouch, raise → cm, off hand x/y, muzzle rise):', hit.map(h => `${h.w}/${h.c}/${h.amt}:${h.R},${h.offX}/${h.offY},${h.up}`).join('  '));
check('hit pose: the raised hand holds the gun (grip within 1 cm), standing or crouched', hit.every(h => h.R <= 1), hit);
check('hit pose: the off hand lets go and hangs at its side', hit.every(h => h.offX > 0.2 && h.offY < 0.7), hit);
check('hit pose: at full raise the muzzle points at the sky', hit.filter(h => h.amt === 1).every(h => h.up > 0.25), hit);
check('in play, every tagged kid sampled had the gun in his raised hand (within 1 cm)', sum('hitN') > 0 && max('worstHit') <= 1,
  all.map(r => ({ n: r.hitN, worst: r.worstHit })));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
