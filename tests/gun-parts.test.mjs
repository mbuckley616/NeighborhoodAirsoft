// v1.220 (backlog D.31, Michael 13 Oct: "revisit the gun designs and make sure they all look good / accurate, and
// don't have any bugs or flaws"), first part: no part of any gun floats. Each gun is built as the workbench and the
// first person draw it, its parts' boxes are joined wherever they come within 3 mm, and everything must join the
// body. Before v1.220 eleven of the twelve had a loose part: the shotgun's orange tip 8 mm off its barrel, the AR's
// handguard 2 cm off its receiver, the sniper's forend and barrel 1-1.5 cm off it, the AK's tip and stock, the MP5's
// mag, cocking tube and stock, the UMP's and MAC-10's stocks, the Bucket Gun's carry handle over its body, the
// trigger guards of the three backyard guns, a line of the pistol's grip stippling.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  const out = {};
  for (const gt of ALL_GUN_TYPES) {
    const m = buildWorkbenchGun(gt);
    m.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const parts = [];
    m.traverse(o => {
      if (!o.isMesh) return;
      for (let p = o; p && p !== m; p = p.parent) if (!p.visible) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      const s = new THREE.Vector3(); b.getSize(s);
      parts.push({ b, name: o.geometry.type.replace('Geometry', '') + ' ' + [s.x, s.y, s.z].map(v => v.toFixed(3)).join('x') + ' @' + ['x','y','z'].map(k => ((b.min[k] + b.max[k]) / 2).toFixed(3)).join(',') });
    });
    const tol = 0.003, n = parts.length;
    const near = (a, b) => a.min.x - tol <= b.max.x && b.min.x - tol <= a.max.x && a.min.y - tol <= b.max.y && b.min.y - tol <= a.max.y && a.min.z - tol <= b.max.z && b.min.z - tol <= a.max.z;
    const comp = new Array(n).fill(-1);
    let c = 0;
    for (let i = 0; i < n; i++) { if (comp[i] >= 0) continue; const st = [i]; comp[i] = c; while (st.length) { const k = st.pop(); for (let j = 0; j < n; j++) if (comp[j] < 0 && near(parts[k].b, parts[j].b)) { comp[j] = c; st.push(j); } } c++; }
    const sizes = {}; comp.forEach(k => sizes[k] = (sizes[k] || 0) + 1);
    const main = +Object.keys(sizes).sort((a, b) => sizes[b] - sizes[a])[0];
    const gapTo = (a) => Math.min(...parts.filter((p, j) => comp[j] === main).map(p => Math.hypot(Math.max(0, a.min.x - p.b.max.x, p.b.min.x - a.max.x), Math.max(0, a.min.y - p.b.max.y, p.b.min.y - a.max.y), Math.max(0, a.min.z - p.b.max.z, p.b.min.z - a.max.z))));
    const groups = {};
    parts.forEach((p, i) => { if (comp[i] !== main) (groups[comp[i]] = groups[comp[i]] || []).push(p); });
    out[gt] = { n, floating: Object.values(groups).map(ps => ({ k: ps.length, first: ps[0].name, gapmm: +(Math.min(...ps.map(p => gapTo(p.b))) * 1000).toFixed(1) })) };
  }
  return out;
});
for (const [gt, v] of Object.entries(r)) {
  console.log(`   ${gt.padEnd(10)} ${v.n} parts, loose: ${JSON.stringify(v.floating)}`);
  check(`${gt}: every part joins the gun (no gap over 3 mm)`, v.n > 10 && v.floating.length === 0, v.floating);
}
check('all 33 guns checked (v1.403: the Thompson; v1.399: the Gas Pistol; v1.398: the SPAS-12; v1.250: the clear automatics; v1.325: the FAMAS; v1.326: the electrics; v1.327: the Burst Rifle; v1.328: the Semi-Auto Shotgun; v1.335: the M249; v1.336: the L96; v1.346: the P90; v1.348: the Vector; v1.371: the G36C; v1.372: the AUG; v1.373: the M4; v1.395: the SVD; v1.396: the RPK)', Object.keys(r).length === 33, Object.keys(r));
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
