// v1.338 (backlog D.51, card fable/d51-winnmark; Michael 16 Oct: real scale; 26 Oct: each match fenced to a today-sized
// part of the street, A). Winnmark Court past its tree walls is the real place: the street runs on to Winnmark Dr, 265 m
// from the bulb, rising 3-5 m from the bulb as the real one falls; the north lots fall to the golf course, the south lots
// into one shared wood with a creek in it that runs to the course; the pond lies north-west of the bulb, under water, not
// grass. None of it is solid, none of it stands within 6 m of the bounds, the ground in the box is the old ground, and the
// map stays inside its draw-call budget (2,060: a quarter over v1.337's worst view, 1,651, decisions D.51).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const res = await page.evaluate(() => {
  const out = {};
  const built = withSeededRandom('winnmark_team_3v3|default', () => buildWinnmarkCourtScene('cul_de_sac', 'day'));
  const gY = built.groundY, B = built.bounds, R = WM_REAL;
  // the old ground in the box and its tree walls (v1.337's formula)
  const old = (x, z) => {
    let u = Math.max(0, Math.min(1, (x - 38) / (-32 - 38))); u = u * u * (3 - 2 * u);
    const h = 3.0 * (1 - u) + 0.25 * Math.sin(z * 0.12 + 0.5) * Math.cos(x * 0.1);
    const fz = Math.max(0, Math.min(1, (z + 42) / 7)), fx = Math.max(0, Math.min(1, (x + 42) / 5));
    return h * fz * fz * (3 - 2 * fz) * fx * fx * (3 - 2 * fx);
  };
  let boxDiff = 0;
  for (let x = R.box.minX; x <= R.box.maxX; x += 0.7) for (let z = R.box.minZ; z <= R.box.maxZ; z += 0.7) boxDiff = Math.max(boxDiff, Math.abs(gY(x, z) - old(x, z)));
  out.boxDiff = boxDiff;
  // the street: its length from the bulb's middle to Winnmark Dr, and its rise
  out.length = R.drX - (-30);
  out.rise = +(gY(R.drX - 6, 0) - gY(-30, 0)).toFixed(2);
  let steep = 0;
  for (let x = 40; x < R.drX - 8; x += 2) steep = Math.max(steep, Math.abs(gY(x + 2, 0) - gY(x, 0)) / 2);
  out.streetGrade = +(steep * 100).toFixed(2);
  // the lots fall away from the street: the north to the course at 0, the south into the wood to the creek
  out.north = [80, 144].map(x => [+gY(x, -12).toFixed(2), +gY(x, -60).toFixed(2)]);
  out.south = [100, 156].map(x => [+gY(x, 12).toFixed(2), +gY(x, 40).toFixed(2), +gY(x, winnmarkCreekZ(x) - 6).toFixed(2)]);
  // the creeks run downhill to the course, in a channel below their banks all the way
  const down = pts => pts.every((p, i) => !i || p[2] < pts[i - 1][2]);
  let inChannel = 0, n = 0;
  for (const pts of [R.creek, R.course]) for (let i = 0; i + 1 < pts.length; i++) for (let t = 0; t < 1; t += 0.1) {
    const a = pts[i], b = pts[i + 1], x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t + 0.25;
    if (x < -205 || x > 305 || z < -195 || z > 225) continue;
    if (Math.hypot(x - R.course[0][0], z - R.course[0][1]) < 3 || Math.hypot(x + 100, z - 30) < 3) continue;   // the pond's outlet, where the creeks meet
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    n++; if (gY(x, z) < y && gY(x + nx * 4, z + nz * 4) > y + 0.3 && gY(x - nx * 4, z - nz * 4) > y + 0.3) inChannel++;
  }
  out.creek = { down: down(R.creek) && down(R.course), n, inChannel };
  // the pond lies over its water, and no lake strip is left west of the bulb
  const P = R.pond, pond = built.scene.getObjectByName('winnmarkPond');
  let wet = 0, pn = 0;
  for (let a = 0; a < 6.283; a += 0.2) for (const f of [0, 0.3, 0.6, 0.9, 0.97]) { pn++; if (gY(P.x + Math.cos(a) * P.rx * f, P.z + Math.sin(a) * P.rz * f) < P.water) wet++; }
  out.pond = { y: pond && pond.position.y, wet, pn };
  let lake = 0; built.scene.traverse(m => { const p = m.geometry && m.geometry.parameters; if (p && p.width === 20 && p.height === 80) lake++; });
  out.lakeStrip = lake;
  // nothing past the walls is solid, nor within 6 m of the bounds
  const sc = built.scene.getObjectByName('realScenery');
  out.stats = sc && sc.userData.stats;
  out.solid = built.obstacles.filter(o => o.mesh && sc && (o.mesh === sc || sc.children.includes(o.mesh))).length;
  let near = Infinity;
  if (sc) sc.traverse(m => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) near = Math.min(near, Math.max(B.minX - p[i], p[i] - B.maxX, B.minZ - p[i + 2], p[i + 2] - B.maxZ));
  });
  out.near = +near.toFixed(2);
  out.viewFar = built.viewFar;
  out.bounds = B;
  return out;
});
console.log('  ', JSON.stringify(res));
check('Winnmark: the ground in the box and its tree walls is the old ground', res.boxDiff < 1e-9, res.boxDiff);
check('Winnmark: the street runs 265 m from the bulb to Winnmark Dr (the real court)', res.length === 265, res.length);
check('Winnmark: the street rises 3-5 m from the bulb to Winnmark Dr, and never steeper than 2 %', res.rise >= 3 && res.rise <= 5 && res.streetGrade <= 2, res);
check('Winnmark: the north lots fall to the course at 0', res.north.every(([f, b]) => f > 3 && Math.abs(b) < 0.01), res.north);
check('Winnmark: the south lots fall into the wood, lower again by the creek', res.south.every(([f, w, c]) => f > w + 2 && w > c), res.south);
check('Winnmark: the creeks run downhill, in a channel under their banks along their whole length', res.creek.down && res.creek.n > 60 && res.creek.inChannel === res.creek.n, res.creek);
check('Winnmark: the pond lies on the course over its whole water, and the old lake strip is gone', res.pond.y === -0.3 && res.pond.wet === res.pond.pn && res.lakeStrip === 0, res);
check('Winnmark: the woods, Winnmark Dr\'s houses and the houses across the course are built', res.stats && res.stats.trees >= 1000 && res.stats.houses >= 15, res.stats);
check('Winnmark: none of it is solid, and none of it stands within 6 m of the bounds (BBs drop at 5)', res.solid === 0 && res.near >= 6, res);

// in play: you see down the street to Winnmark Dr; the camera sees that far; draw calls in budget
await g.scenario('winnmark_team_3v3');
const view = await page.evaluate(() => {
  applyBBHit = () => true;
  for (const e of Game.scenario.enemies || []) e.update = () => {};
  const out = { far: Game.camera.far, calls: {} };
  for (const [name, x, z, yaw] of [['bulb', -31, 0, -Math.PI / 2], ['entryOut', 36, 0, -Math.PI / 2], ['entryIn', 36, 0, Math.PI / 2],
    ['north', 8, -30, Math.PI], ['south', 7, 34, 0], ['west', -33, 0, Math.PI / 2], ['mid', 4, 4, -Math.PI / 2]]) {
    Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw; Game.player.pitch = -0.05; stepGame(1 / 60);
    Game.player.yaw = yaw; Game.player.pitch = -0.05; Game.camera.updateMatrixWorld(true);
    Game.renderer.render(Game.scene, Game.camera); out.calls[name] = Game.renderer.info.render.calls;
  }
  // from the entry, the street to Winnmark Dr: rays down it reach past x 150
  const all = []; Game.scene.traverse(m => { if (m.isMesh && m.visible) all.push(m); });
  const ray = new THREE.Raycaster(); ray.far = 400; let past = 0;
  const gY = Game.scenario.groundY, o = new THREE.Vector3(38, gY(38, 0) + 1.6, 0);
  for (let a = -4; a <= 4; a += 1) for (let p = -3; p <= 0; p += 0.5) {
    const yaw = a * Math.PI / 180, pt = p * Math.PI / 180;
    ray.set(o, new THREE.Vector3(Math.cos(yaw) * Math.cos(pt), Math.sin(pt), Math.sin(yaw) * Math.cos(pt)));
    const h = ray.intersectObjects(all, false);
    if (h.length && h[0].point.x > 150) past++;
  }
  out.past = past;
  return out;
});
console.log('  ', JSON.stringify(view));
check('Winnmark: from the entry you see down the street past 150 m', view.past >= 3, view.past);
check('Winnmark: the camera sees down the street (380 m)', view.far === 380, view.far);
check('Winnmark: at most 2,060 draw calls in any of seven views', Math.max(...Object.values(view.calls)) <= 2060, view.calls);
await g.shot('winnmark-real-entry');
const far2 = await page.evaluate(() => { Game.mode = 'result'; enterBedroom(); return Game.camera.far; });
check('Winnmark: the camera goes back to 200 m in the bedroom', far2 === 200, far2);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
