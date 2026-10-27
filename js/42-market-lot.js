
// =====================================================================
// v1.102: RIVERSIDE MARKET LOT (East Roswell) — the parking-lot zone (backlog
// D.1, Michael: B — a grocery-store lot, the fourth zone, after The Hollow).
// A made-up store name: no real business on screen until Michael says so.
// Flat asphalt. The store front runs along the NORTH (z = -30); three double
// rows of parked cars cross the lot east–west with drive aisles between; the
// road and a grass verge close the SOUTH. Cars are the cover, and the aisles
// are long open sightlines, so the fight is car to car.
// Playable box: x∈[-38,38], z∈[-29,27]. Team A (enemies) start at the store,
// Team B (player) at the road side.
// =====================================================================
// v1.300 (D.55 step 2, the reference pictures' finding): a sign's name is drawn as large as asked but never wider than
// its canvas less a margin each side: "RIVERSIDE MARKET" at 54 px Georgia was wider than its 512 px and read
// "IVERSIDE MARKE". Every name sign on a building goes through here.
function fitSignText(c, text, x, y, px, family, maxW) {
  do { c.font = `bold ${px}px ${family}`; } while (c.measureText(text).width > maxW && (px -= 2) > 8);
  c.fillText(text, x, y);
  return px;
}
function buildMarketLotScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9cc8ea, dayFog: [50, 140],
    sunColor: 0xfff1d8, sunInt: 1.9, sunPos: [-20, 40, 18],
    dayAmbColor: 0xa8b4c8, dayAmbInt: 0.36, dayHemiColor: 0xc4d8f0, dayHemiInt: 0.30,
    nightBg: 0x0a0e16, nightFog: [16, 64], moonPos: [20, 36, -16],
    shadow: { size: 4096, extent: 52, far: 120 },
  });

  const groundY = () => 0;     // a graded lot: flat
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const bounds = { minX: -38, maxX: 38, minZ: -29, maxZ: 27 };
  // Deterministic layout, so the AI's cover and the tests see the same lot every
  // round; only car colours vary.
  let _seed = 7;
  const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };

  const flat = (w, d, color, x, z, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  // Asphalt, the grass verges beyond it, and the road past the south curb.
  flat(200, 200, 0x55664a, 0, 0, 0);                     // grass everywhere else
  flat(80, 60, _night ? 0x2c2d30 : 0x3d3e42, 0, -1.5, 0.005);   // lot asphalt x∈[-40,40], z∈[-31.5,28.5]
  flat(120, 9, 0x35363a, 0, 34, 0.005);                 // Riverside Parkway, beyond the south verge
  {
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8c050, roughness: 0.9 });
    for (let x = -56; x <= 56; x += 6) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.16), dashMat);
      d.rotation.x = -Math.PI / 2; d.position.set(x, 0.012, 34); scene.add(d);
    }
  }
  // Store sidewalk (cosmetic; collision stays flat).
  flat(76, 3, 0x9a968c, -6, -28.5, 0.015);

  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', baseY = 0) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY }; obstacles.push(o); return o;
  };

  // === THE STORE — a long brick box along the north with a glass front ===
  {
    const W = 56, D = 16, H = 7, cx = -6, frontZ = -30;
    const brick = new THREE.MeshStandardMaterial({ color: 0x9a6a52, roughness: 0.95 });
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), brick);
    bodyM.position.set(cx, H / 2, frontZ - D / 2); bodyM.castShadow = bodyM.receiveShadow = true; scene.add(bodyM);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.8 }));
    parapet.position.set(cx, H + 0.3, frontZ - 0.1); scene.add(parapet);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x28384a, roughness: 0.25, metalness: 0.3,
      emissive: _night ? 0xfff0c8 : 0x0a0f15, emissiveIntensity: _night ? 0.55 : 0.2 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(30, 2.8, 0.1), glassMat);
    glass.position.set(cx, 1.55, frontZ + 0.03); scene.add(glass);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(34, 0.25, 2.4), new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.8 }));
    awning.position.set(cx, 3.4, frontZ + 1.2); awning.castShadow = true; scene.add(awning);
    // Sign: a canvas texture on the facade.
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#f4efe2'; c2.fillRect(0, 0, 512, 96);
    c2.fillStyle = '#2f6a3a'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'RIVERSIDE MARKET', 256, 50, 54, 'Georgia', 512 - 40);   // v1.300
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
    sign.position.set(cx, 5.3, frontZ + 0.05); scene.add(sign);
    box(cx - W / 2, cx + W / 2, frontZ - D, frontZ, H);
    // A second, smaller unit east of the store (the pharmacy end), set back.
    const unit = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 12), new THREE.MeshStandardMaterial({ color: 0xb8ab94, roughness: 0.95 }));
    unit.position.set(32, 2.75, -38); unit.castShadow = unit.receiveShadow = true; scene.add(unit);
    box(24, 40, -44, -32, 5.5);
  }

  // === PARKING ROWS — three double rows; spots are 2.7 m wide, cars nose to nose ===
  // Row centres z = -14, 0, 14; the two halves of a row sit 1.9 m either side.
  // Occupancy is a fixed pattern per half-row ('C' car, '.' empty; 24 spots,
  // x = ±2.7..±32.4, the x = 0 spot is the lamp island).
  const SPOT = 2.7;
  const ROWS = [
    { z: -15.9, pat: 'CC.C.CCC.C.CC.CC.CC.C..C' },
    { z: -12.1, pat: '.C.CC.C.CC..C.CCC.C.CC.C' },
    { z: -1.9,  pat: 'C..C.C.CC.C...C.C.CC..C.' },
    { z: 1.9,   pat: '.C.C..CC.C.C.C..C..C.CC.' },
    { z: 12.1,  pat: 'C.CC.C..CC.C.CC.C.C..CC.' },
    { z: 15.9,  pat: '.CC..C.C.C.CC..CC.C.CC.C' },
  ];
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x6e7478, 0x3a5a3a, 0xb09a6a, 0x9a2a2a, 0x2a3e6a];
  const spotXs = [];
  for (let k = 12; k >= 1; k--) spotXs.push(-k * SPOT);
  for (let k = 1; k <= 12; k++) spotXs.push(k * SPOT);
  const carObsList = [];
  const CORRAL_SPOTS = [[-10.8, -1.9], [16.2, 12.1], [-24.3, -12.1]];   // stalls the cart corrals take
  for (const row of ROWS) {
    spotXs.forEach((x, i) => {
      if (row.pat[i] !== 'C') return;
      // v1.103: every third stall (i = 1, 4, 7, …) stays empty in BOTH halves of a
      // double row, so the row has a 3.85 m walk-through every 8.1 m. Without them
      // a double row was a solid 65 m wall (the halves park nose to nose), and a
      // kid pushing across it slid along the bumpers and wedged for 40 s+.
      if (i % 3 === 1) return;
      if (Math.abs(x) > 18.5 && Math.abs(x) < 19.5) return;   // tree islands at x = ±18.9
      if (CORRAL_SPOTS.some(([sx, sz]) => Math.abs(sx - x) < 0.1 && Math.abs(sz - row.z) < 0.1)) return;
      // Nose into the row's centre line (car-local +X is the nose; yaw -π/2 points it +z),
      // with a little parking slop in position and angle.
      const zc = Math.round(row.z / 14) * 14;
      const orient = (row.z < zc ? -1 : 1) * (Math.PI / 2) + (rnd() - 0.5) * 0.08;
      const cx = x + (rnd() - 0.5) * 0.3, cz = row.z + (rnd() - 0.5) * 0.2;
      const color = CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
      const carObs = addCar(scene, cx, cz, { orientation: orient, color, detail: true });   // v1.126: Winnmark's car (D.3 step 4)
      const seated = carSeatY(carObs, groundY);
      carObs.mesh.position.y += seated;
      resolveObox(carObs); resolveObox(carObs._stacked);
      pushCarObs(obstacles, carObs);
      coverList.push(carObs);
      carObsList.push(carObs);
    });
  }
  // Painted stall lines along every half-row.
  {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.9 });
    for (const row of ROWS) {
      for (let k = -12.5; k <= 12.5; k += 1) {
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3.8), lineMat);
        ln.rotation.x = -Math.PI / 2; ln.position.set(k * SPOT, 0.014, row.z); scene.add(ln);
      }
    }
  }

  // === ISLANDS — a lamp in the middle of each row, trees at x = ±18.9 and the row ends ===
  const treeObs = [], lampObs = [];
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xb4b0a6, roughness: 0.9 });
  const island = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), curbMat);
    m.position.set(x, 0.075, z); m.receiveShadow = true; scene.add(m);
  };
  for (const rz of [-14, 0, 14]) {
    island(0, rz, 2.4, 7.4);
    const lamp = addStreetlamp(scene, 0, rz === 0 ? 0.01 : rz, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
    for (const tx of [-18.9, 18.9, -35.2, 35.2]) {
      island(tx, rz, 2.4, 7.4);
      treeObs.push(addSuburbanTree(scene, tx, rz, { trunkH: 2.6, leafR: 1.7, baseY: 0.15, detail: true }));   // v1.126
    }
  }
  // South verge trees, past the last aisle.
  for (const tx of [-30, -16, 16, 30]) treeObs.push(addSuburbanTree(scene, tx, 27.5, { baseY: 0, detail: true }));   // v1.126

  // === CART CORRALS and strays — metal rails you can crouch behind ===
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.4, metalness: 0.7 });
  const addCorral = (x, z) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    for (const sx of [-0.65, 0.65]) for (const y of [0.45, 1.0]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.4), railMat);
      r.position.set(sx, y, 0); g.add(r);
    }
    for (const sx of [-0.65, 0.65]) for (const sz of [-1.7, 0, 1.7]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 6), railMat);
      p.position.set(sx, 0.52, sz); g.add(p);
    }
    for (let i = 0; i < 4; i++) g.add(makeCartMesh(0, -1.1 + i * 0.55));
    scene.add(g);
    const o = box(x - 0.7, x + 0.7, z - 1.75, z + 1.75, 1.05, 'metal');
    coverList.push(o); return o;
  };
  function makeCartMesh(x, z, yaw = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.9), new THREE.MeshStandardMaterial({ color: 0xa0a6aa, roughness: 0.4, metalness: 0.6, wireframe: true }));
    basket.position.y = 0.7; g.add(basket);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.85), railMat);
    frame.position.y = 0.2; g.add(frame);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xc03028, roughness: 0.6 }));
    handle.position.set(0, 1.0, -0.5); g.add(handle);
    return g;
  }
  for (const [x, z] of CORRAL_SPOTS) addCorral(x, z);
  // Three stray carts in the aisles.
  for (const [x, z, yaw] of [[-6, -7.5, 0.6], [9, 7, -1.1], [-20, 21, 2.2]]) {
    scene.add(makeCartMesh(x, z, yaw));
    box(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.0, 'metal');
  }
  // v1.175 (D.17, Michael: B): Night Shift only. Rebecca holds the road side at (-14, 21), and the stalls north of her
  // (x -17.5 to -9.5 in the z 15.9 half-row) are all empty, so Mason had a clear line down to her from the store end.
  // A dumpster on the aisle just north of her spot gives her something to hide behind; the briefing's spot stays true.
  if (variant === 'vip_night') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x2c5a3a, roughness: 0.8, metalness: 0.3 }));
    m.position.set(-14, 0.75, 19.6); m.castShadow = m.receiveShadow = true; scene.add(m);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.7), new THREE.MeshStandardMaterial({ color: 0x1e2a22, roughness: 0.7 }));
    lid.position.set(-14, 1.54, 19.6); scene.add(lid);
    coverList.push(box(-15.1, -12.9, 18.8, 20.4, 1.5, 'metal'));
  }

  // === BY THE STORE — a box truck at the loading end, dumpsters at the west end ===
  {
    const tx = 24, tz = -23;
    const g = new THREE.Group(); g.position.set(tx, 0, tz);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.7 }));
    cargo.position.set(-0.9, 0.55 + 1.3, 0); cargo.castShadow = cargo.receiveShadow = true; g.add(cargo);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 2.3), new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.6, metalness: 0.3 }));
    cab.position.set(2.7, 0.55 + 0.95, 0); cab.castShadow = true; g.add(cab);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    for (const wx of [-2.4, 2.8]) for (const wz of [-1.1, 1.1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14), wheelMat);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.45, wz); g.add(w);
    }
    scene.add(g);
    // The gap under the cargo box is left open (you can see feet under it);
    // collision covers from the ground up, as the cars do.
    const cargoObs = box(tx - 3.5, tx + 1.7, tz - 1.2, tz + 1.2, 3.15, 'metal');
    box(tx + 1.75, tx + 3.65, tz - 1.15, tz + 1.15, 2.45, 'metal');
    coverList.push(cargoObs);
  }
  {
    const dMat = new THREE.MeshStandardMaterial({ color: 0x2c5a3a, roughness: 0.8, metalness: 0.3 });
    for (const dx of [-32, -29.4]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), dMat);
      m.position.set(dx, 0.75, -27.4); m.castShadow = m.receiveShadow = true; scene.add(m);
      coverList.push(box(dx - 1.1, dx + 1.1, -28.2, -26.6, 1.5, 'metal'));
    }
  }

  // === Edge blockers: keep the player on the lot (the verges are open grass) ===
  const edge = [
    { minX: -60, maxX: -38.6, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: 38.6, maxX: 60, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: -60, maxX: 60, minZ: 28.6, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
  ];

  // === ANCHORS & SPAWNS ===
  // Every anchor stands in an aisle (never inside a row), next to the car or
  // rail it hides behind.
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of coverList) {
      const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
      const d = Math.hypot(cx - x, cz - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  const placements = {
    // Team A — the store side
    a_store:    A(0, -24),
    a_store_w:  A(-18, -21),
    a_store_e:  A(18, -21),
    a_truck:    A(22, -20.5),
    a_dumpster: A(-30, -24.5),
    a_aisle_w:  A(-14, -7.5),
    a_aisle_e:  A(12, -7.5),
    // Team B — the road side
    b_road:     A(0, 22),
    b_road_w:   A(-14, 21),
    b_road_e:   A(14, 21),
    b_aisle_w:  A(-12, 7.5),
    b_aisle_e:  A(14, 7.5),
    b_corner_w: A(-32, 21),
    b_corner_e: A(32, 21),
    // Scatter for free-for-alls
    scatter_nw: { pos: P(-34, -20), cover: null },
    scatter_ne: { pos: P(34, -20),  cover: null },
    scatter_sw: { pos: P(-34, 22),  cover: null },
    scatter_se: { pos: P(34, 22),   cover: null },
    scatter_w:  { pos: P(-34, 7),   cover: null },
    scatter_e:  { pos: P(34, -7),   cover: null },
    cluster_north: { pos: P(0, -26), cover: null },
    cluster_south: { pos: P(0, 24),  cover: null },
    // v1.134 (Found in play, Michael: B): the free-for-all's hidden starts. Each stands beside a parked car or the
    // dumpsters, out of sight of the other six and of the player's start (muzzle 1.05 m to chest 0.95 m, the kids' own
    // sight rule), and at least 19 m from every one of them. Found by a search over the lot's fixed parking pattern that also kept
    // the ground 3–6 m round each start out of sight of the others, since kids move during the 2.5 s opening hold.
    ffa_1: { pos: P(6.5, -14.5), cover: null },
    ffa_2: { pos: P(22.5, 16.5), cover: null },
    ffa_3: { pos: P(-34, -17),   cover: null },
    ffa_4: { pos: P(-12.5, -12), cover: null },
    ffa_5: { pos: P(-25.5, 15.5), cover: null },
    ffa_6: { pos: P(-6.5, 15),   cover: null },
  };
  const playerSpawns = {
    team_b:  { pos: P(2, 23),  yaw: 0 },         // at the road side, facing the store (yaw 0 faces -z)
    team_a:  { pos: P(-2, -25), yaw: Math.PI },
    midfield:{ pos: P(0, 7.5), yaw: 0 },
    // v1.134: behind the last car at the north row's east end. v1.140: facing down the east aisle (+z, 40 m clear) along
    // the row, not west into that car's windshield 0.9 m off (Found in play, critic v1.134)
    ffa_edge:{ pos: P(34, -12), yaw: Math.PI },
  };

  const allObs = [...obstacles, ...treeObs, ...lampObs, ...edge];
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: coverList,
    obstacles: allObs,
    enemies: [],
    name: 'Riverside Market', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    teamBases: { player: { x: 0, z: 24 }, enemy: { x: 0, z: -25 } },
  };
}
function buildMarketLotSceneDefault(_v, tod) { return buildMarketLotScene('default', tod); }
