// v1.172 (Found in play, v1.169): the workbench's floating Sight / Left / Right labels sat in the viewport's top-left
// corner. computeWorkbenchLabelAnchors read m.y and m.z, which FP_GUN_MOUNT has never had, so their positions were NaN.
// Checked on every gun with the turntable held still: each label is placed at a real number, on the gun (inside its
// box on screen, with 40 px to spare), clear of the corner, apart from the others; the sight label is above the rail
// labels, and the left rail's label is left of the right's.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  for (const gt of GUN_ORDER) Game.persist.owned[GUN_MAGS[gt].ownFlag] = true;
  openWorkbench();
  const out = [];
  for (const gt of GUN_ORDER) {
    workbenchSelectGun(gt);
    WB.autoRotate = false; WB.yaw = 0; WB.pitch = 0.2;
    for (let i = 0; i < 3; i++) updateWorkbench(1 / 60);
    const canvas = WB.renderer.domElement, w = canvas.clientWidth, h = canvas.clientHeight;
    // the gun's box on screen
    // (visible meshes only: the hidden laser beam and flashlight cone would stretch it metres past the gun)
    const box = new THREE.Box3(), v = new THREE.Vector3();
    WB.gunGroup.updateMatrixWorld(true);
    WB.gunGroup.traverse(o => {
      if (!o.isMesh) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      box.expandByObject(o);
    });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) {
      v.set(cx, cy, cz).project(WB.camera);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const rects = (yaw) => { WB.yaw = yaw; updateWorkbench(1 / 60); return [...document.getElementById('wbVpLabels').children].map(el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }); };
    const names = () => [...document.getElementById('wbVpLabels').children].map(el => el.textContent.split(':')[0]);
    const meet = (rs) => { const n = names(), hit = []; rs.forEach((a, i) => rs.forEach((b, j) => { if (i < j && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) hit.push(n[i] + '/' + n[j]); })); return hit.join(' '); };
    // do the labels' boxes cross, in the bench's opening view (yaw 0.5) or square on?
    const overlap = [0.5, 0].map(yw => { const m = meet(rects(yw)); return m ? yw + ' ' + m : ''; }).filter(Boolean);
    WB.yaw = 0; updateWorkbench(1 / 60);
    const labels = [...document.getElementById('wbVpLabels').children].map(el => ({
      t: el.textContent, x: parseFloat(el.style.left), y: parseFloat(el.style.top), shown: el.style.display !== 'none' }));
    out.push({ gt, w, h, overlap, gunBox: [x0, y0, x1, y1].map(n => Math.round(n)), labels: labels.map(l => ({ ...l, x: Math.round(l.x), y: Math.round(l.y) })) });
  }
  closeWorkbench();
  return out;
});
for (const r of res) console.log(`   ${r.gt} (${r.w}x${r.h}): gun box ${r.gunBox.join(',')} | ${r.labels.map(l => `${l.t.split(':')[0]} (${l.x}, ${l.y})`).join(' ')}`);

const bad = (pred) => res.filter(r => !pred(r)).map(r => ({ gt: r.gt, box: r.gunBox, labels: r.labels }));
check('every label on every gun is placed at a real position and shown', bad(r => r.labels.length >= 2 && r.labels.every(l => Number.isFinite(l.x) && Number.isFinite(l.y) && l.shown)).length === 0, bad(r => r.labels.every(l => Number.isFinite(l.x) && Number.isFinite(l.y))));
check('no label sits in the viewport\'s top-left corner (within 30 px)', bad(r => r.labels.every(l => l.x > 30 || l.y > 30)).length === 0, bad(r => r.labels.every(l => l.x > 30 || l.y > 30)));
const PAD = 40;
check(`every label sits on the gun (inside its box on screen, ${PAD} px to spare)`,
  bad(r => r.labels.every(l => l.x >= r.gunBox[0] - PAD && l.x <= r.gunBox[2] + PAD && l.y >= r.gunBox[1] - PAD && l.y <= r.gunBox[3] + PAD)).length === 0,
  bad(r => r.labels.every(l => l.x >= r.gunBox[0] - PAD && l.x <= r.gunBox[2] + PAD && l.y >= r.gunBox[1] - PAD && l.y <= r.gunBox[3] + PAD)));
check('no two labels on a gun overlap, in the opening view or square on', res.every(r => r.overlap.length === 0), res.filter(r => r.overlap.length).map(r => r.gt + ' at yaw ' + r.overlap.join('; ')));
const order = (r) => {
  const L = (n) => r.labels.find(l => l.t.startsWith(n));
  const s = L('Sight'), rails = r.labels.filter(l => /^(Left|Right|Rail)/.test(l.t));
  const left = L('Left'), right = L('Right');
  return s && rails.every(x => s.y < x.y) && (!left || !right || left.x < right.x);
};
check('the sight label is above the rail labels, and Left is left of Right', bad(order).length === 0, bad(order));
check('the one-rail guns call their rail "Rail"; the two-rail guns "Left" and "Right"',
  res.every(r => { const n = r.labels.filter(l => /^(Left|Right|Rail)/.test(l.t)).map(l => l.t.split(':')[0]).join(','); return n === 'Rail' || n === 'Left,Right'; }),
  res.map(r => r.gt + ':' + r.labels.map(l => l.t.split(':')[0]).join(',')));
await page.evaluate(() => { openWorkbench(); workbenchSelectGun('ar'); WB.autoRotate = false; WB.yaw = 0.5; WB.pitch = 0.2; for (let i = 0; i < 3; i++) updateWorkbench(1 / 60); });
await g.shot('workbench-labels-ar');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
