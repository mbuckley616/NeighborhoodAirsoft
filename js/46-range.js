
// =====================================================================
// v1.257 (backlog D.40, Michael: A on "The backyard range: where is it, and what's on it?"): THE RANGE, in your own
// backyard, out the back door in the bedroom's hall. Try a gun or a setup outside a match: no kids, no clock, no money,
// but every BB comes out of your bag as in a match (it is the match code with nobody else in it, `winCondition:
// 'range'`, which never ends on its own). Downrange from the bench: six cans on a plank (knocked off, and they can be
// shot along the grass), three bottles on a crate (they break), two sheets of paper on stakes (a BB punches through and
// leaves its hole), two cardboard bullseyes at about 15 and 20 m (each BB leaves a mark, and its ring is scored). E at
// the bench stands everything back up; E at the back door (or F) goes back inside.
// v1.306 (D.51 step 2, D.40's leftover; docs/refs/bunratty.md, its D.40 section): the yard is now Michael's own, on
// Bunratty's ground with his house and terraces (bunrattyGroundY, buildBunrattyHeroHouse), where v1.257 had a flat yard
// from memory. You come out of the French doors onto the terrace under the deck, go round the pool's fence to the
// stone steps and down to the lawn. The bench stands past the fire pit and the lane runs west along the lawn, the
// stone wall on one side and the drop to the woods on the other, with the woods for a backstop: the cans 8 m out, the
// bottles 11, the paper 12-13, the near bullseye on its easel at 15 and the far one on a tree at the hammock end, 20 m.
// The trampoline stands by the wall (Michael: a trampoline, no playset). In Bunratty's coordinates; playable box:
// x∈[17.6,43.6], z∈[27,46.6]. Downrange is −x, so the targets face +x.
// =====================================================================
const RANGE_RINGS = [[0.035, 10], [0.08, 8], [0.13, 6], [0.18, 4], [0.23, 2]];   // bullseye: radius (m) → score
const RANGE_CAN_R = 0.033, RANGE_CAN_H = 0.122, RANGE_REACH = 1.6;
function buildBackyardRangeScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const { sun } = applyTimeOfDay(scene, 'day', {
    dayBg: 0x88a8c8, dayFog: [45, 320],   // v1.306: Bunratty's sky and sun; far enough to see down to the river
    sunColor: 0xfff0c8, sunInt: 1.0, sunPos: [-18, 30, 14],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.42,
    nightFog: [16, 50], moonPos: [-20, 38, -16],
    shadow: { size: 2048, extent: 26, far: 80 },
  });
  {   // v1.306: the yard is 48 m from the origin, so the sun's shadow box is moved over it
    const C = new THREE.Vector3(31, 0, 37);
    sun.position.add(C); sun.target.position.copy(C); scene.add(sun.target);
  }
  const groundY = bunrattyGroundY, gY = groundY;
  const obstacles = [];
  const box = (minX, maxX, minZ, maxZ, h, baseY = 0, extra = {}) => ({ minX, maxX, minZ, maxZ, h, baseY, surface: 'hard', ...extra });
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const lowY = (x, z, hw, hd) => { let y = Infinity; for (const sx of [-hw, 0, hw]) for (const sz of [-hd, 0, hd]) y = Math.min(y, gY(x + sx, z + sz)); return y; };

  // --- the ground: Bunratty's, round the lot (x 0..75, z 0..75 on the map's own 1.5625 m grid, so the terrace's steps
  //     fall on grid lines as they do there), then 6 m cells out past the river; coloured as the map colours it
  const B0 = { minX: -40, maxX: 44, minZ: -32, maxZ: 30 };
  {
    const axis = (lo, i0, i1, hi) => {
      const v = [], a = -75 + 150 * i0 / 96, b = -75 + 150 * i1 / 96;
      for (let c = lo; c < a - 1e-6; c += 6) v.push(c);
      for (let i = i0; i <= i1; i++) v.push(-75 + 150 * i / 96);
      for (let c = b + 6; c < hi - 1e-6; c += 6) v.push(c);
      v.push(hi); return v;
    };
    const xs = axis(-110, 48, 96, 230), zs = axis(-40, 48, 96, 290);
    const pos = [], col = [], idx = [], mix = (a, b, t) => a + (b - a) * t;
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) {
      const x = xs[i], z = zs[j];
      pos.push(x, gY(x, z), z);
      const out = Math.min(Math.max(B0.minX - x, x - B0.maxX, B0.minZ - z, z - B0.maxZ), brHeroOut(x, z));
      const w = Math.max(0, Math.min(1, (out - 6) / 10));
      let r = mix(1, 1.05, w), g = mix(1, 0.67, w), bl = mix(1, 0.83, w);
      const ds = Math.abs((BR_REAL.nx * (x - BR_REAL.bx) + BR_REAL.nz * (z - BR_REAL.bz)) - BR_REAL.s);
      const clay = Math.max(0, Math.min(1, (40 - ds) / 4));
      r = mix(r, 1.6, clay); g = mix(g, 0.74, clay); bl = mix(bl, 0.97, clay);
      const fl = bunrattyFieldK(x, z);
      r = mix(r, 1.28, fl); g = mix(g, 1.13, fl); bl = mix(bl, 1.13, fl);
      col.push(r, g, bl);
    }
    const W = xs.length;
    for (let j = 0; j + 1 < zs.length; j++) for (let i = 0; i + 1 < W; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x567a3c, roughness: 1.0, vertexColors: true }));
    ground.receiveShadow = true; scene.add(ground);
    // the river below, murky, in the channel the ground cuts (as the map's)
    const R0 = BR_REAL, cx = R0.bx + R0.nx * R0.s, cz = R0.bz + R0.nz * R0.s;
    const qW = (-110 - cx) / R0.nz, qE = (230 - cx) / R0.nz, len = qE - qW, qm = (qW + qE) / 2;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(len, R0.half * 2 + 6), std(0x5f6a4c, { roughness: 0.32, metalness: 0.18 }));
    water.rotation.order = 'YXZ'; water.rotation.y = Math.atan2(R0.nx, R0.nz); water.rotation.x = -Math.PI / 2;
    water.position.set(cx + R0.nz * qm, R0.waterY, cz - R0.nx * qm); water.receiveShadow = true; water.name = 'rangeRiver';
    scene.add(water);
  }
  // --- Michael's house and its terraces, as on the map: the deck, the pool in its fence, the stone wall and steps,
  //     the fire pit; and the trampoline by the wall
  const hero = buildBunrattyHeroHouse(scene, { groundY, F: BRH.F, T: BRH.T, G: BRH.G, night: false });
  obstacles.push(...hero.obstacles);
  {
    const tx = 24, tz = 39.6, { group, obs } = buildBackyardTrampoline(tx, tz, 0.2), y = lowY(tx, tz, 1.8, 1.8);
    group.position.y = y; obs.baseY = y; scene.add(group); obstacles.push(obs);
  }
  // the French doors you came out of, on the terrace under the deck
  const DOOR = { x: 30.4, z: 27.3 };
  // --- the bench: a folding table past the fire pit, across the lane; you stand on its east side and shoot west ---
  const BENCH = { x: 40.6, z: 44.4 }, LINE = { x: 41.4, z: 44.4 };
  {
    const g = new THREE.Group(), top = std(0xd8d0c0), leg = std(0x606060, { metalness: 0.5 }), by = lowY(BENCH.x, BENCH.z, 0.35, 0.9);
    mesh(new THREE.BoxGeometry(0.7, 0.05, 1.8), top, BENCH.x, by + 0.74, BENCH.z, g);
    for (const [dx, dz] of [[-0.28, -0.8], [0.28, -0.8], [-0.28, 0.8], [0.28, 0.8]]) mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), leg, BENCH.x + dx, by + 0.34, BENCH.z + dz, g);
    mesh(new THREE.BoxGeometry(0.2, 0.14, 0.3), std(0x3a6a3a), BENCH.x, by + 0.84, BENCH.z + 0.5, g);    // a BB bottle box
    mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), std(0xf4f0e0), BENCH.x + 0.05, by + 0.775, BENCH.z - 0.4, g);   // the score pad
    scene.add(g);
    obstacles.push(box(BENCH.x - 0.35, BENCH.x + 0.35, BENCH.z - 0.9, BENCH.z + 0.9, 0.77, by, { mesh: g }));
  }
  const R = { door: DOOR, bench: BENCH, line: LINE, cans: [], bottles: [], papers: [], eyes: [], shards: [], marks: [],
    stats: { cans: 0, bottles: 0, holes: 0, eyeHits: 0, last: null }, restY: (x, z) => gY(x, z) };
  // --- six cans on a plank across two cinder blocks, 8 m out ---
  {
    const block = std(0x9a9a96), plank = std(0x9a7650), cx = LINE.x - 8, cz = LINE.z;
    const py = Math.max(gY(cx, cz - 1.6), gY(cx, cz + 1.6)) + 0.4;
    for (const bz of [cz - 1.6, cz + 1.6]) { const b0 = gY(cx, bz) - 0.05; mesh(new THREE.BoxGeometry(0.4, py - b0, 0.2), block, cx, (py + b0) / 2, bz); obstacles.push(box(cx - 0.2, cx + 0.2, bz - 0.1, bz + 0.1, py - b0, b0)); }
    mesh(new THREE.BoxGeometry(0.25, 0.04, 3.6), plank, cx, py + 0.02, cz);
    const colors = [0xc0302a, 0x2a5aa8, 0xc0302a, 0x3a8a3a, 0xd8d8d0, 0xc0302a];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      mesh(new THREE.CylinderGeometry(RANGE_CAN_R, RANGE_CAN_R, RANGE_CAN_H, 12), std(colors[i], { roughness: 0.4, metalness: 0.5 }), 0, 0, 0, g);
      mesh(new THREE.CylinderGeometry(RANGE_CAN_R * 0.92, RANGE_CAN_R, 0.008, 12), std(0xd0d0d0, { metalness: 0.8, roughness: 0.3 }), 0, RANGE_CAN_H / 2, 0, g);
      const home = new THREE.Vector3(cx, py + 0.04 + RANGE_CAN_H / 2, cz - 1.5 + i * 0.6);
      g.position.copy(home); scene.add(g);
      R.cans.push({ g, home, pos: g.position, vel: new THREE.Vector3(), spin: new THREE.Vector3(), state: 'up' });
    }
  }
  // --- three bottles on an upturned crate, 11 m out ---
  {
    const cx = LINE.x - 10.8, cz = LINE.z + 0.8, cy = lowY(cx, cz, 0.18, 0.25);
    mesh(new THREE.BoxGeometry(0.36, 0.36, 0.5), std(0x8a6a48), cx, cy + 0.18, cz);
    obstacles.push(box(cx - 0.18, cx + 0.18, cz - 0.25, cz + 0.25, 0.36, cy));
    const glass = [0x2a6a2a, 0x6a3a1a, 0xc8d8d0];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(), mat = std(glass[i], { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8 });
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 10), mat, 0, 0.085, 0, g);
      mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.09, 8), mat, 0, 0.215, 0, g);
      g.position.set(cx, cy + 0.36, cz - 0.18 + i * 0.18); scene.add(g);
      R.bottles.push({ g, x: cx, z: g.position.z, y0: cy + 0.36, h: 0.26, color: glass[i], state: 'up' });
    }
  }
  // --- two sheets of paper on stakes, about 12-13 m out, facing the bench; a BB goes straight through ---
  for (const [x, z] of [[29, 43.2], [28, 45.6]]) {
    const y0 = gY(x, z);
    mesh(new THREE.BoxGeometry(0.03, 1.25, 0.03), std(0x8a6a48), x - 0.02, y0 + 0.62, z);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.216, 0.279), new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 1, side: THREE.DoubleSide }));
    paper.rotation.y = Math.PI / 2; paper.position.set(x, y0 + 1.1, z); scene.add(paper);
    R.papers.push({ x, y: y0 + 1.1, z, w: 0.216, h: 0.279, mesh: paper });
  }
  // --- the hammock end: two trees with a hammock slung between them; the far bullseye is nailed to the nearer ---
  const H1 = { x: 21, z: 44.6 }, H2 = { x: 19.6, z: 40.4 };
  for (const t of [H1, H2]) obstacles.push(addSuburbanTree(scene, t.x, t.z, { detail: true, trunkH: 5, leafR: 2.8, trunkR: 0.3, leafColor: 0x3a5a2a, baseY: lowY(t.x, t.z, 0.3, 0.3) }));
  {   // the hammock: a flattened tube sagging 0.55 m between the trunks, 1.25 m up at its ends
    const n = 10, pts = [], y0 = gY(H1.x, H1.z) + 1.25;
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3(H1.x + (H2.x - H1.x) * u, -0.55 * Math.sin(Math.PI * u) * 4, H1.z + (H2.z - H1.z) * u)); }
    const sling = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.32, 6, false), std(0xc8b48a, { side: THREE.DoubleSide }));
    sling.scale.set(1, 0.25, 1); sling.position.y = y0; sling.castShadow = true; scene.add(sling);
  }
  // --- two homemade bullseyes: the near one on an easel about 15 m out, the far one on the tree at 20 ---
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#b08a5a'; c.fillRect(0, 0, 256, 256);                                     // cardboard
    const px = r => r / 0.5 * 256;
    for (let i = RANGE_RINGS.length - 1; i >= 0; i--) {                                       // marker rings, outside in
      c.beginPath(); c.arc(128, 128, px(RANGE_RINGS[i][0]), 0, Math.PI * 2);
      c.fillStyle = i === 0 ? '#c82020' : i % 2 ? '#f4f0e4' : '#d03a2a'; c.fill();
      c.lineWidth = 2; c.strokeStyle = '#2a2a2a'; c.stroke();
    }
    c.fillStyle = '#2a2a2a'; c.font = 'bold 16px sans-serif'; c.fillText('10', 120, 134);
    const tex = new THREE.CanvasTexture(cv);
    for (const [x, z, label] of [[26.5, 43.6, 'near'], [H1.x + 0.36, H1.z, 'far']]) {
      const y0 = gY(x, z), easel = std(0x7a5e42);
      if (label === 'near') {
        for (const dz of [-0.22, 0.22]) mesh(new THREE.BoxGeometry(0.04, 1.3, 0.04), easel, x - 0.06, y0 + 0.62, z + dz).rotation.z = 0.08;
        mesh(new THREE.BoxGeometry(0.06, 0.04, 0.6), easel, x - 0.03, y0 + 0.72, z);
      }
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }));
      board.rotation.y = Math.PI / 2; board.position.set(x, y0 + 1.0, z); scene.add(board);
      R.eyes.push({ x, y: y0 + 1.0, z, w: 0.5, h: 0.5, label, mesh: board });
    }
  }
  // --- the woods round the lot and down the bluff to the river, the neighbour's house over the lot-line wall: one
  //     merged mesh, nothing solid, nothing within 6 m of the box
  {
    const rs = _mulberry32(_hashStringToSeed('range-woods')), rr = (a, b) => a + (b - a) * rs();
    const RB = { minX: 17.6, maxX: 43.6, minZ: 27, maxZ: 46.6 }, items = [];
    const LEAF = [0x3e6a2e, 0x4a7834, 0x365e2a, 0x567c38, 0x2e5226, 0x46703a], PINE = [0x2a4a2a, 0x2e5030, 0x264426];
    for (let gx = -100; gx <= 220; gx += 9) for (let gz = 0; gz <= 280; gz += 9) {   // the map's spacing and thinning
      const x = gx + rr(-3.5, 3.5), z = gz + rr(-3.5, 3.5), pick = rs(), kind = rs(), hh = rs(), cc = rs();
      if (Math.hypot(x - BR_REAL.bx, z - BR_REAL.bz) > 170 && pick < 0.35) continue;
      if (Math.max(RB.minX - x, x - RB.maxX, RB.minZ - z, z - RB.maxZ) < 12) continue;
      if (z < 30 && x > -12 && x < 60) continue;                                   // the houses and the street
      const dx = x - BR_REAL.bx, dz = z - BR_REAL.bz, s = BR_REAL.nx * dx + BR_REAL.nz * dz;
      if (Math.abs(s - BR_REAL.s) < BR_REAL.half + 5 || bunrattyFieldK(x, z) > 0.05 || pick < 0.2) continue;
      if (s > 128 && s < BR_REAL.s - BR_REAL.half - 5 && pick < 0.85) continue;   // the bank is open to the water
      const y = gY(x, z);
      if (kind < 0.35) items.push({ k: 'pine', x, y, z, h: 14 + hh * 7, r: 2.6 + cc * 1.2, col: PINE[Math.floor(cc * PINE.length) % PINE.length] });
      else items.push({ k: 'tree', x, y, z, h: 12 + hh * 6, r: 3.2 + cc * 1.6, col: LEAF[Math.floor(cc * LEAF.length) % LEAF.length] });
    }
    const nb = BR_NEIGHBOURS[5];   // the neighbour's back, across the lot-line wall
    items.push({ k: 'house', x: (nb.x0 + nb.x1) / 2, y: gY(nb.x1, nb.zf + nb.d), z: nb.zf + nb.d / 2, yaw: 0, w: nb.x1 - nb.x0, d: nb.d, h: 6.6, wall: nb.wall, roof: nb.roof });
    scene.add(buildMergedScenery(items, false, 'range-woods'));
  }

  return {
    scene,
    spawn: new THREE.Vector3(DOOR.x, gY(DOOR.x, DOOR.z), DOOR.z), spawnYaw: Math.PI,   // out of the doors, facing the pool
    bounds: { minX: 17.6, maxX: 43.6, minZ: 27, maxZ: 46.6 },
    cover: [], obstacles, enemies: [], placements: {}, playerSpawns: {},
    name: 'Your Backyard', scenarioName: 'The Range', desc: '',
    groundY, range: R, viewFar: 330, spawnFootY: true,   // the spawn's y is its feet: the deck over the doors is not in the way
  };
}
// the bedroom's back door: the range is written as SCENARIOS.backyard_range when you go out (as the Pickup Game is),
// so nothing that walks the scenario table at load (the map, the ladder, the tests' sweeps) meets it
function enterRange() {
  SCENARIOS.backyard_range = {
    name: 'Your Backyard', scenarioName: 'The Range',
    desc: 'Your own backyard: cans, bottles, paper and two bullseyes. No kids, no money, but the BBs are your own.',
    builderFn: 'buildBackyardRangeScene', scenarioType: 'skirmish', winCondition: 'range', range: true,
    playerLives: 1, armorMult: 1, rewards: { win: 0, lose: 0 },
  };
  hideBedroomLabels();
  enterScenario('backyard_range');
}
function rangeNear(p) { return Math.hypot(Game.player.pos.x - p.x, Game.player.pos.z - p.z) < RANGE_REACH; }
function rangeFocus() {
  const R = Game.scenario && Game.scenario.range;
  if (!R || Game.mode !== 'scenario') return null;
  return rangeNear(R.bench) ? 'bench' : rangeNear(R.door) ? 'door' : null;
}
function rangePromptText() {
  const f = rangeFocus(), k = Pad.active ? '<kbd>A</kbd>' : '<kbd>E</kbd>';
  return f === 'bench' ? `${k} &nbsp; Stand everything back up` : f === 'door' ? `${k} &nbsp; Go back inside` : null;
}
function rangeUse() {
  const f = rangeFocus();
  if (f === 'bench') rangeReset();
  else if (f === 'door') endScenario('range');
  return !!f;
}
// E at the bench: the cans back on the plank, new bottles, fresh paper, clean bullseyes
function rangeReset() {
  const R = Game.scenario.range;
  for (const c of R.cans) { c.state = 'up'; c.g.position.copy(c.home); c.g.rotation.set(0, 0, 0); c.vel.set(0, 0, 0); }
  for (const b of R.bottles) { b.state = 'up'; b.g.visible = true; }
  for (const s of R.shards) Game.scene.remove(s.m);
  for (const m of R.marks) Game.scene.remove(m);
  R.shards = []; R.marks = [];
  R.stats = { cans: 0, bottles: 0, holes: 0, eyeHits: 0, last: null };
  updateRangeHud();
}
// where the segment a→b first enters the box (slab test), as a 0..1 fraction, or null
function rangeSegBox(a, b, minX, maxX, minY, maxY, minZ, maxZ) {
  let t0 = 0, t1 = 1;
  for (const [p, q, lo, hi] of [[a.x, b.x, minX, maxX], [a.y, b.y, minY, maxY], [a.z, b.z, minZ, maxZ]]) {
    const d = q - p;
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let u = (lo - p) / d, v = (hi - p) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v);
    if (t0 > t1) return null;
  }
  return t0;
}
// where a→b crosses a target facing +x (the plane x = T.x) inside its w×h, or null (v1.306: +x, was +z; the lane
// runs west along Michael's lawn)
function rangeSegPlate(a, b, T) {
  if ((a.x - T.x) * (b.x - T.x) > 0 || a.x === b.x) return null;
  const t = (T.x - a.x) / (b.x - a.x), z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t;
  if (Math.abs(z - T.z) > T.w / 2 || Math.abs(y - T.y) > T.h / 2) return null;
  return { t, z, y };
}
function rangeMark(x, y, z, r, color) {
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 8), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x + s * 0.002, y, z); m.rotation.y = s * Math.PI / 2;
    Game.scene.add(m); Game.scenario.range.marks.push(m);
  }
}
// called from updateBBs for each live BB's sub-step: 'stop' (it is spent on the target), 'pass' (through paper), or null
function rangeBBHit(bb, a) {
  const R = Game.scenario.range, b = bb.pos;
  let best = null;
  const take = (t, kind, ref, extra) => { if (t != null && (!best || t < best.t)) best = { t, kind, ref, ...extra }; };
  for (const c of R.cans) take(rangeSegBox(a, b, c.pos.x - 0.045, c.pos.x + 0.045, c.pos.y - 0.065, c.pos.y + 0.065, c.pos.z - 0.045, c.pos.z + 0.045), 'can', c);
  for (const o of R.bottles) if (o.state === 'up') take(rangeSegBox(a, b, o.x - 0.04, o.x + 0.04, o.y0, o.y0 + o.h, o.z - 0.04, o.z + 0.04), 'bottle', o);
  for (const T of R.eyes) { const h = rangeSegPlate(a, b, T); if (h) take(h.t, 'eye', T, h); }
  for (const T of R.papers) { const h = rangeSegPlate(a, b, T); if (h) take(h.t, 'paper', T, h); }
  if (!best) return null;
  const at = new THREE.Vector3(a.x + (b.x - a.x) * best.t, a.y + (b.y - a.y) * best.t, a.z + (b.z - a.z) * best.t);
  const S = R.stats, dir = bb.vel.clone().normalize();
  if (best.kind === 'can') {
    const c = best.ref;
    if (c.state === 'up') S.cans++;
    c.state = 'flying';
    c.vel.set(dir.x * 3 + (gameRandom() - 0.5), 1.2 + gameRandom() * 1.2, dir.z * 3 + (gameRandom() - 0.5));
    c.spin.set((gameRandom() - 0.5) * 20, (gameRandom() - 0.5) * 8, (gameRandom() - 0.5) * 20);
    playImpactMetal(at);
    S.last = 'a can';
  } else if (best.kind === 'bottle') {
    const o = best.ref;
    o.state = 'broken'; o.g.visible = false; S.bottles++;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.1, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.025 + gameRandom() * 0.02, 0.006, 0.02 + gameRandom() * 0.02), mat);
      m.position.set(o.x, o.y0 + gameRandom() * o.h, o.z); Game.scene.add(m);
      R.shards.push({ m, vel: new THREE.Vector3(dir.x * 1.5 + (gameRandom() - 0.5) * 2, 0.8 + gameRandom() * 1.5, dir.z * 1.5 + (gameRandom() - 0.5) * 2), spin: gameRandom() * 12, still: false });
    }
    playImpactShatter(at);
    S.last = 'a bottle';
  } else if (best.kind === 'paper') {
    rangeMark(best.ref.x, best.y, best.z, 0.0045, 0x1a1a1a);
    S.holes++;
    S.last = 'the paper';
    return 'pass';
  } else {
    const T = best.ref, r = Math.hypot(best.z - T.z, best.y - T.y), ring = RANGE_RINGS.find(([rr]) => r <= rr);
    rangeMark(T.x, best.y, best.z, 0.006, 0x101010);
    S.eyeHits++;
    S.last = `the ${T.label} bullseye: ${ring ? ring[1] : 'on the board'}`;
    S.lastRing = ring ? ring[1] : 0;
    playImpactCardboard(at);
  }
  bb.pos.copy(at);
  updateRangeHud();
  return 'stop';
}
// once a step in the range: knocked cans and broken glass fall and settle on the grass
function rangeStep(dt) {
  const R = Game.scenario.range;
  for (const c of R.cans) {
    if (c.state !== 'flying') continue;
    c.vel.y -= 9.8 * dt;
    c.pos.addScaledVector(c.vel, dt);
    c.g.rotation.x += c.spin.x * dt; c.g.rotation.y += c.spin.y * dt; c.g.rotation.z += c.spin.z * dt;
    const B = Game.scenario.bounds;
    c.pos.x = Math.max(B.minX, Math.min(B.maxX, c.pos.x)); c.pos.z = Math.max(B.minZ, Math.min(B.maxZ, c.pos.z));
    const gy = R.restY(c.pos.x, c.pos.z);   // v1.306: the lawn falls toward the woods
    if (c.pos.y <= gy + RANGE_CAN_R && c.vel.y < 0) {
      c.pos.y = gy + RANGE_CAN_R;
      c.vel.y *= -0.3; c.vel.x *= 0.6; c.vel.z *= 0.6; c.spin.multiplyScalar(0.5);
      if (c.vel.length() < 0.4) { c.state = 'down'; c.vel.set(0, 0, 0); c.g.rotation.set(Math.PI / 2, c.g.rotation.y, 0); }
    }
  }
  for (const s of R.shards) {
    if (s.still) continue;
    s.vel.y -= 9.8 * dt;
    s.m.position.addScaledVector(s.vel, dt);
    s.m.rotation.y += s.spin * dt;
    const gy = R.restY(s.m.position.x, s.m.position.z) + 0.004;
    if (s.m.position.y <= gy) { s.m.position.y = gy; s.still = true; }
  }
}
function updateRangeHud() {
  const el = document.getElementById('rangeHud');
  if (!el) return;
  const R = Game.mode === 'scenario' && Game.scenario.range;
  if (!R) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
  const S = R.stats;
  const html = `<span class="rg-k">THE RANGE</span> cans ${S.cans}/${R.cans.length} · bottles ${S.bottles}/${R.bottles.length} · ` +
    `holes ${S.holes} · bullseye hits ${S.eyeHits}` + (S.last ? `<div class="rg-last">Last: ${S.last}</div>` : '') +
    `<div class="rg-hint">bench: stand them back up · back door: inside</div>`;
  if (el.innerHTML !== html) el.innerHTML = html;
  el.style.display = 'block';
}
