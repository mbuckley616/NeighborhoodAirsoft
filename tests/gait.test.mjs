// v1.171 (backlog D.16 A, Michael: C, A first): planted feet. Kids play a real round; every frame, for each kid on
// the move, the foot nearest the ground is followed in the world. A planted foot stays put while the body goes on, so
// its slip (how far it moved over how far the body moved, while it was the low foot two frames running) should be
// small; before v1.171 the shoes rode under the hips and slipped the kid's whole speed. Also: the low shoe sits on
// the ground (no float, no sinking), the shoe stays on the end of its leg, and the stride, the beat and the bob grow
// with speed. `SRC=<file>` runs it against another build (the numbers for the old one are in the devlog).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

const MATCHES = ['bunratty_ffa', 'lot_team_3v3', 'hollow_skirmish_3v3'];
const all = [];
for (const id of MATCHES) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    const V = new THREE.Vector3(), W = new THREE.Vector3();
    const prev = new Map(), out = [];
    for (let f = 0; f < 60 * 30 && Game.mode === 'scenario'; f++) {
      stepGame(1 / 60);
      for (const e of Game.scenario.enemies) {
        if (!(e.health > 0) || !e.mesh || !e.mesh.pose || e._lad) continue;
        const po = e.mesh.pose;
        e.mesh.group.updateWorldMatrix(true, true);
        const feet = [po.shoeL, po.shoeR].map(s => { s.getWorldPosition(V); return { x: V.x, y: V.y, z: V.z }; });
        const ground = e.mesh.group.position.y;
        const low = feet[0].y <= feet[1].y ? 0 : 1;
        // the sole point at the leg's lower end, against the shoe on it
        const ends = [po.legL, po.legR].map(l => { W.set(0, -0.275, 0); l.localToWorld(W); return { x: W.x, y: W.y, z: W.z }; });
        const gap = Math.max(...[0, 1].map(i => Math.hypot(ends[i].x - (feet[i].x), ends[i].z - (feet[i].z))));
        const p = prev.get(e);
        const body = { x: e.pos.x, z: e.pos.z };
        if (p && p.low === low && e._animSpeed > 1.2 && e._walkInt > 0.5) {
          const db = Math.hypot(body.x - p.body.x, body.z - p.body.z);
          const df = Math.hypot(feet[low].x - p.feet[low].x, feet[low].z - p.feet[low].z);
          if (db > 0.005 && db < 0.2) out.push({ n: e.name, v: e._animSpeed, slip: df / db, sole: feet[low].y - ground, gap,
            head: po.head.position.y, legRot: Math.abs(po.legL.rotation.x), side: Math.abs(e._gaitVS || 0) / Math.max(0.01, Math.hypot(e._gaitVF || 0, e._gaitVS || 0)) });
        }
        prev.set(e, { low, feet, body });
      }
    }
    return { out, mode: Game.mode };
  });
  for (const s of r.out) s.id = id;
  all.push(...r.out);
  console.log(`   ${id}: ${r.out.length} moving-kid frames (${r.mode})`);
}
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const pct = (a, q) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : NaN; };
const walk = all.filter(s => s.v < 2.2), run = all.filter(s => s.v >= 2.2);
const sum = (set) => ({ n: set.length, slipMed: +med(set.map(s => s.slip)).toFixed(3), slip90: +pct(set.map(s => s.slip), 0.9).toFixed(3),
  soleMed: +med(set.map(s => s.sole)).toFixed(3), soleMin: +pct(set.map(s => s.sole), 0.02).toFixed(3), legSwingMax: +pct(set.map(s => s.legRot), 0.98).toFixed(2),
  gapMax: +pct(set.map(s => s.gap), 0.99).toFixed(3) });
const W = sum(walk), R = sum(run), A0 = sum(all);
// a foot is down when its sole is within 1 cm of its rest height (the shoe's centre sits 4.5 cm up)
const down = all.filter(s => s.sole < 0.055), A = sum(down);
const airShare = +(1 - down.length / Math.max(1, all.length)).toFixed(3);
console.log('   low foot on the ground:', JSON.stringify(A), 'share of frames with both feet up:', airShare);
const sideways = all.filter(s => s.side > 0.6);
const S = sum(sideways);
console.log('   walking (< 2.2 m/s):', JSON.stringify(W));
console.log('   running (≥ 2.2 m/s):', JSON.stringify(R));
console.log('   sideways (over 60% of the speed to the side):', JSON.stringify(S));
check('kids moved enough to judge (200+ frames on the move)', all.length >= 200, all.length);
check('the low foot stays planted: its median slip is under a fifth of the body\'s travel', A.slipMed < 0.2, A);
check('nine frames in ten the low foot slips under half the body\'s travel', A.slip90 < 0.5, A);
check('stepping sideways is planted too (median slip under a quarter)', S.n < 30 || S.slipMed < 0.25, S);
check('the low shoe stands on the ground: median sole 2-6 cm up, never more than 1 cm under', A0.soleMed > 0.02 && A.soleMed < 0.06 && A0.soleMin > -0.01, A0);
check('each shoe stays on the end of its leg (within 6 cm)', A0.gapMax < 0.06, A0);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
