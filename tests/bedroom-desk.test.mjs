// v1.213 (backlog D.26, Michael 13 Oct: "the computer for example hovers off of the desk a bit"): everything on the
// bedroom desk stands on it, inside its edges. The keyboard and mouse used to hang half over the front edge in the air.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const r = await page.evaluate(() => {
  Game.scene.updateMatrixWorld(true);
  const box = o => new THREE.Box3().setFromObject(o);
  // the desk top: the 1.8 × 0.6 board
  let desk = null;
  Game.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 1.8 && o.geometry.parameters.depth === 0.6) desk = o; });
  const d = box(desk);
  const parts = {};
  Game.scene.traverse(o => { if (o.isMesh && o.name.startsWith('pc_')) (parts[o.name] = parts[o.name] || []).push(box(o)); });
  const f = b => ({ y0: +b.min.y.toFixed(4), y1: +b.max.y.toFixed(4), x0: +b.min.x.toFixed(3), x1: +b.max.x.toFixed(3), z0: +b.min.z.toFixed(3), z1: +b.max.z.toFixed(3) });
  const out = {};
  for (const k in parts) out[k] = parts[k].map(f);
  return { desk: f(d), parts: out, n: Object.values(parts).reduce((a, b) => a + b.length, 0) };
});
const D = r.desk, P = r.parts;
console.log('    desk top', JSON.stringify(D), '·', r.n, 'computer pieces');
const onDesk = ['pc_crt_foot', 'pc_keyboard', 'pc_mousepad', 'pc_speaker', 'pc_cable'];
const sits = onDesk.flatMap(k => (P[k] || []).map(b => [k, +(b.y0 - D.y1).toFixed(4)]));
check('the monitor\'s foot, the keyboard, the mouse pad, both speakers and both cables stand on the desk top (within 3 mm)',
  sits.length === 7 && sits.every(s => Math.abs(s[1]) <= 0.003), sits);
const inside = Object.entries(P).filter(([k]) => !k.startsWith('pc_tower')).flatMap(([k, bs]) => bs.map(b => [k, b]))
  .filter(([k, b]) => b.x0 < D.x0 - 0.001 || b.x1 > D.x1 + 0.001 || b.z0 < D.z0 - 0.001 || b.z1 > D.z1 + 0.001).map(([k, b]) => [k, b]);
check('nothing on the desk hangs past its edges (the keyboard and mouse were half over the front)', inside.length === 0, inside);
const mouse = P.pc_mouse[0], pad = P.pc_mousepad[0];
check('the mouse sits on its pad', Math.abs(mouse.y0 - pad.y1) <= 0.002 && mouse.x0 >= pad.x0 && mouse.x1 <= pad.x1 && mouse.z0 >= pad.z0 && mouse.z1 <= pad.z1, { mouse, pad });
const foot = P.pc_crt_foot[0], neck = P.pc_crt_neck[0], crt = P.pc_crt[0];
check('the monitor stands on its foot and neck, with no gap (was 1 cm over its stand)',
  Math.abs(neck.y0 - foot.y1) <= 0.002 && Math.abs(crt.y0 - neck.y1) <= 0.002, { foot, neck, crt });
const tower = P.pc_tower[0];
check('the tower stands on the floor under the desk', Math.abs(tower.y0) <= 0.002 && tower.y1 < D.y0, tower);
const kb = P.pc_keyboard[0];
check('the keyboard is in front of the monitor and clear of it', kb.z0 >= crt.z1 - 0.001, { kb, crt });
// the screen shows the shop's page, and the computer still opens the shop
const scr = await page.evaluate(() => { let s = null; Game.scene.traverse(o => { if (o.name === 'pc_screen') s = o; }); return !!(s && s.material.map && s.material.map.image.width === 256); });
check('the screen shows airsoft.com (a 256 px page drawn on it)', scr);
const shop = await page.evaluate(() => { const it = Game.interactables.find(i => i.type === 'computer'); it.action(); return !document.getElementById('shopScreen').classList.contains('hidden') || getComputedStyle(document.getElementById('shopScreen')).display !== 'none'; });
check('using the computer still opens the shop', shop);
await page.evaluate(() => closeShop && closeShop());
await page.evaluate(() => { Game.player.pos.set(0.5, 0, -2.1); Game.player.yaw = 0.75; Game.player.pitch = -0.3; });
await g.spin(2);
await g.shot('bedroom-desk');
// v1.378 (D.74 step 2, docs/refs/landing.md): the room's shape. A vaulted ceiling from the east and west walls to a
// north-south ridge, and the dormer's window arched: a half-round fanlight over the two sashes, under the dormer's own
// flat ceiling. Rays straight up from the floor find the ceiling; rays at the window find glass in the arch, wall beside it.
const vault = await page.evaluate(() => {
  Game.scene.updateMatrixWorld(true);
  const V = Scenes.bedroom.vault, rc = new THREE.Raycaster();
  const first = (o, d, y0 = -1) => { rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); const h = rc.intersectObjects(Game.scene.children, true).filter(h => h.object.visible && !h.object.isSprite && h.point.y > y0)[0]; return h ? { name: h.object.name, y: +h.point.y.toFixed(2), d: +h.distance.toFixed(2) } : null; };
  const up = (x, z = 0.4) => first([x, 0.05, z], [0, 1, 0], 2.3);   // above the furniture
  let win = null; Game.scene.traverse(o => { if (o.name === 'br_fanlight') win = o; });
  const w = win.getWorldPosition(new THREE.Vector3());
  return { V, east: up(2.9), mid: up(0, 1.6), west: up(-2.9), q: up(1.5),
    arch: first([w.x + 0.15, w.y + 0.4, w.z + 1.5], [0, 0, -1]), corner: first([w.x + 0.64, w.y + 0.6, w.z + 1.5], [0, 0, -1]),
    dormer: up(w.x, w.z + 0.4), rod: (() => { let r = null; Game.scene.traverse(o => { if (o.name === 'br_fan_rod') r = new THREE.Box3().setFromObject(o).max.y; }); return +r.toFixed(2); })() };
});
console.log('    vault', JSON.stringify(vault));
const V = vault.V;
check('the ceiling vaults: at the east and west walls it is the walls\' height, over the middle the ridge (1.3 m higher)',
  V.ridgeH - V.wallH >= 1.0 && Math.abs(vault.east.y - V.wallH) < 0.15 && Math.abs(vault.west.y - V.wallH) < 0.15 && Math.abs(vault.mid.y - V.ridgeH) < 0.05
  && vault.mid.name === 'br_vault' && Math.abs(vault.q.y - (V.wallH + V.ridgeH) / 2) < 0.05, vault);
check('the window is arched: high in the arch you see out through the fanlight, beside its top the wall',
  vault.arch && vault.arch.name === 'br_fanlight' && vault.corner && vault.corner.name === 'br_arch_wall', { arch: vault.arch, corner: vault.corner });
check('the dormer keeps its own flat ceiling, lower than the vault and over the arch\'s top',
  vault.dormer && Math.abs(vault.dormer.y - V.dormerH) < 0.02 && V.dormerH > V.winTop && V.dormerH < V.ridgeH, vault.dormer);
check('the fan hangs where it did (2.5 m), on a rod up to the ridge', Math.abs(vault.rod - V.ridgeH) < 0.02, vault.rod);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
