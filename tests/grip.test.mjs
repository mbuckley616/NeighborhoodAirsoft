// Backlog C.4 (v1.80): at full aim with a small gun, were the kid's hands ~4 cm off the grip? Poses one kid
// with every weapon at rest and full aim, standing and crouched, and measures, in the kid's own frame, the
// firing hand to the gun grip and (two-handed holds) the off hand to where setKidGunHold aims it.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.scenario('bunratty_sean');
const rows = await page.evaluate(() => {
  const k = Game.scenario.enemies[0].mesh, po = k.pose, out = [];
  const V = THREE.Vector3, hw = new V(), gw = new V();
  const inKid = (obj, local) => { obj.updateWorldMatrix(true, false); const p = local ? obj.localToWorld(local.clone()) : obj.getWorldPosition(new V()); return k.group.worldToLocal(p); };
  for (const w of ['pistol', 'mac10', 'ak47', 'mp5', 'ump', 'shotgun', 'sniper', 'ar']) for (const c of [0, 1]) for (const t of [0, 1]) {
    setKidCrouch(k, c); setKidGunHold(k, w, t, 0); k.group.updateMatrixWorld(true);
    const grip = gunGripLocal(w);
    const gR = inKid(po.gunGroup, new V(grip.x, grip.y, grip.z));
    const hR = inKid(po.rigR.hand);
    const small = isSmallGun(w);
    // off-hand target, as setKidGunHold computes it
    const gz = po.gunGroup.position.z;
    const offLocal = small ? new V(grip.x, grip.y, grip.z - 0.02) : new V(0, -0.05, Math.min(gunForegripZ(w), 0.13));
    const gL = inKid(po.gunGroup, offLocal), hL = inKid(po.rigL.hand);
    const offOn = !small || t > 0;       // small-gun off-hand hangs at its side at rest
    out.push({ w, c, t, R: +(hR.distanceTo(gR) * 100).toFixed(1), L: offOn ? +(hL.distanceTo(gL) * 100).toFixed(1) : null });
  }
  setKidCrouch(k, 0);
  return out;
});
let worst = { R: 0, L: 0 };
for (const r of rows) { worst.R = Math.max(worst.R, r.R); if (r.L != null) worst.L = Math.max(worst.L, r.L); }
console.log('  cm from grip (w, crouch, aim → R, L):', rows.map(r => `${r.w}/${r.c}/${r.t}:${r.R},${r.L ?? '-'}`).join('  '));
const smallAim = rows.filter(r => (r.w === 'pistol' || r.w === 'mac10') && r.t === 1);
check('small gun at full aim: both hands within 1 cm of the grip', smallAim.every(r => r.R <= 1 && r.L <= 1), smallAim);
check('every hold: firing hand within 2 cm of the grip', worst.R <= 2, worst);
// Large guns' off hand sits 2.7–3.5 cm short of its foregrip point (v1.95 measurement); held here as a
// regression gate, not a spec.
check('every two-handed hold: off hand within 4 cm of its target', worst.L <= 4, worst);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
