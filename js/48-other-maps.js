
// =====================================================================
// v1.186: BELLFIELD COURT (Northcliff) — the Bellfield kids' own street (decisions, "Builder queue empty after
// v1.185", Michael: C on the control room, 10 Oct: a small cul-de-sac map with a 1v1 and a 3v3). Until now it was only
// a name in REGIONS and the kids who walk over in Bellfield After Dark. A short, flat cul-de-sac: the road comes in
// from the EAST (x = 37) and ends in a bulb at the WEST (x = -14) with a planted island and a tree in the middle.
// Three houses a side (north row faces south, south row faces north) and one at the head of the bulb facing east,
// with a kid fort on its lawn. Short front yards, deep backyards behind a board fence on three sides, so the way
// round is through the backyards and the fight is across the street and the bulb. Smaller than Northcliff Trace
// (about 70 x 54 m to its 74 x 66, and flat where it climbs 4 m). The layout is fixed, as the school's, so the AI's
// cover and the tests see the same street every round; only car colours vary.
// Playable box: x∈[-35,36], z∈[-27,27].
// =====================================================================
function buildBellfieldCourtScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x94b4d0, dayFog: [40, 105],
    sunColor: 0xfff0d4, sunInt: 1.25, sunPos: [16, 34, 18],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.48, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.38,
    nightFog: [18, 60], moonPos: [-16, 34, -18],
    shadow: { size: 2048, extent: 42, far: 90 },
  });
  // Flat, with a ground fn all the same (height-aware collision, as the treehouse yard)
  const groundY = () => 0;
  const groundNormal = () => ({ nx: 0, ny: 1, nz: 0 });
  const box = (minX, maxX, minZ, maxZ, h, extra = {}) => ({ minX, maxX, minZ, maxZ, h, baseY: 0, surface: 'hard', ...extra });
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ color: 0x5c8a42, roughness: 1.0 }));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; scene.add(lawn);
  }

  // --- the road: the east entry → the bulb ---
  const RA = { x: 37, z: 0 }, RB = { x: -14, z: 0 }, BULB_R = 6.3;
  const roadPoint = (t) => ({ x: RA.x + (RB.x - RA.x) * t, z: RA.z + (RB.z - RA.z) * t });
  const roadDeriv = () => ({ x: RB.x - RA.x, z: RB.z - RA.z });

  // --- houses: three a side along the street, one at the head of the bulb ---
  const HOUSES = [
    { x: 21, z: -14, side: 'north', w: 10, brick: 0xc0aa8c, roof: 0x4a3a2a },
    { x: 5, z: -14, side: 'north', w: 10, brick: 0x9e5c42, roof: 0x3a3028 },
    { x: -13, z: -16, side: 'north', w: 9, brick: 0xd4c8b4, roof: 0x4a4038 },
    { x: 21, z: 14, side: 'south', w: 9, brick: 0xa8684c, roof: 0x3a2a1a },
    { x: 5, z: 14, side: 'south', w: 10, brick: 0xc8b494, roof: 0x5a4030 },
    { x: -13, z: 16, side: 'south', w: 9, brick: 0x8e5640, roof: 0x4a3828 },
  ];
  const houseObs = HOUSES.map(h => buildSuburbanHouse(scene, {
    x: h.x, z: h.z, width: h.w, depth: 8, brickColor: h.brick, roofColor: h.roof,
    faceDir: h.side === 'north' ? 'south' : 'north', detail: true,
  }));
  // the head of the bulb: 8 m deep (x), 10 m across (z), facing east down the street
  houseObs.push(buildSuburbanHouse(scene, { x: -30, z: 0, width: 8, depth: 10, brickColor: 0xb8a088, roofColor: 0x3e342c, faceDir: 'east', detail: true }));
  const houseCenters = HOUSES.map(h => ({ x: h.x, z: h.z, side: h.side }));
  buildStreetRoad(scene, {
    point: roadPoint, deriv: roadDeriv, groundY, groundNormal, houseCenters,
    asphMat: new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    ASPH: 3.45, bulb: { x: RB.x, z: RB.z, r: BULB_R }, T0: -0.08, NS: 120,
    manholes: [[0.35, 0.8]], drains: [[0.2, -1], [0.62, 1]],
    cracks: [[0.12, 5.0, 0.35], [0.5, 5.6, -0.3]], patch: 0.4,
  });
  // driveways: the rows' from the front step to the road edge, the head house's from its front to the bulb
  {
    const dMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.95 });
    const slab = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), dMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; scene.add(m); };
    for (const h of HOUSES) {
      const front = h.side === 'north' ? h.z + 4 : h.z - 4, edge = h.side === 'north' ? -3.8 : 3.8;
      slab(h.x, (front + edge) / 2, 4, Math.abs(front - edge) + 0.4);
    }
    slab(-23, -3, 6.4, 4);
  }

  // --- the island in the bulb: a low brick planter ring round a tree and three shrubs ---
  const islandObs = [];
  {
    const brick = new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.95 });
    const mulch = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1.0 });
    const g = new THREE.Group();
    const S = 1.6, T = 0.22, H = 0.5;   // half-size, wall thickness, height
    for (const [w, d, x, z] of [[2 * S, T, 0, -S + T / 2], [2 * S, T, 0, S - T / 2], [T, 2 * S - 2 * T, -S + T / 2, 0], [T, 2 * S - 2 * T, S - T / 2, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), brick); m.position.set(RB.x + x, H / 2, RB.z + z); m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2 * S - 2 * T, 0.36, 2 * S - 2 * T), mulch); bed.position.set(RB.x, 0.18, RB.z); g.add(bed);
    scene.add(g);
    islandObs.push(box(RB.x - S, RB.x + S, RB.z - S, RB.z + S, H, { mesh: g, bulbIsland: true }));
    islandObs.push(addSuburbanTree(scene, RB.x - 0.3, RB.z + 0.2, { detail: true, trunkR: 0.3, trunkH: 4.4, leafR: 2.4 }));
    for (const [dx, dz] of [[0.8, -0.8], [0.8, 0.8], [-0.9, 0.9]]) addBush(scene, RB.x + dx, RB.z + dz, 0.7, 0.6, 0.7, null, 0.36, { detail: true });
  }

  const coverList = [islandObs[0]], propObs = [], driveCars = [];
  const coverAt = (o) => { coverList.push(o); return o; };
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x3a5a3a, 0xb09a6a, 0x2a3e6a];
  const pickColor = () => CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
  // cars: three in driveways (collision only), one at the head house; two at the bulb's mouth and two down the
  // street on the kerb (AI cover)
  for (const [x, z] of [[21, -7.2], [5, 7.2], [-13, 9.4]]) driveCars.push(addCar(scene, x, z, { orientation: Math.PI / 2, color: pickColor(), detail: true }));
  driveCars.push(addCar(scene, -23.6, -3, { orientation: 0, color: pickColor(), detail: true }));
  const kerbCar = (x, z, orient) => pushCarObs(coverList, addCar(scene, x, z, { orientation: orient, color: pickColor(), detail: true }));
  const bulbCarN = kerbCar(-6.5, -2.4, Math.PI + 0.12), bulbCarS = kerbCar(-4.5, 2.4, Math.PI - 0.1);
  kerbCar(13, 2.4, Math.PI); kerbCar(28, -2.4, 0);
  // the kid fort on the head house's lawn, its back wall to the street
  const bulbFort = buildKidFort(scene, -21.6, 2.2, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true });
  for (const w of bulbFort) coverList.push(w);
  // front-yard cover, fixed: boxes, bins, a ply stack
  const anchorCover = {};
  coverAt(addHomeDepotBox(scene, 16.5, -6.6, { w: 1.2, h: 1.0, d: 1.0, facing: 0.3, detail: true }));
  anchorCover.front_n = coverAt(addHomeDepotBox(scene, 1.5, -6.4, { w: 1.3, h: 1.05, d: 1.0, facing: 0, detail: true }));
  anchorCover.front_s = coverAt(addHomeDepotBox(scene, 9, 6.5, { w: 1.3, h: 1.05, d: 1.0, facing: 0, detail: true }));
  coverAt(addHomeDepotBox(scene, 25.5, 6.8, { w: 1.1, h: 0.95, d: 0.95, facing: -0.4, detail: true }));
  {
    const st = buildPlyStack(-6, 0, -8.2, 0.61); scene.add(st);
    coverAt({ minX: -6.8, maxX: -5.2, minZ: -8.65, maxZ: -7.75, h: 0.55, baseY: 0, mesh: st, surface: 'hard' });
  }
  for (const [bx, bz, v, f] of [[17.2, -4.9, 'garbage', Math.PI], [18, -4.9, 'recycle', Math.PI], [1.2, 4.9, 'garbage', 0], [2, 4.9, 'recycle', 0], [-17.4, -8.6, 'garbage', Math.PI]]) {
    propObs.push(addCurbsideBin(scene, bx, bz, { variant: v, facing: f, detail: true }));
  }
  // a portable basketball hoop on the south kerb, facing the street (its base stops you; the pole is a post)
  {
    const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.6, metalness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.7), dark); base.position.set(0, 0.225, 0); base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.0, 10), dark); pole.position.set(0, 1.75, 0.15); g.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.5 }));
    board.position.set(0, 3.15, -0.35); board.castShadow = true; g.add(board);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), new THREE.MeshStandardMaterial({ color: 0xd2501e, roughness: 0.5 }));
    rim.rotation.x = Math.PI / 2; rim.position.set(0, 2.92, -0.62); g.add(rim);
    g.position.set(-1.5, 0, 5.1); scene.add(g);
    propObs.push(box(-2.05, -0.95, 4.75, 5.45, 0.45, { mesh: g }));
    propObs.push({ minX: -1.57, maxX: -1.43, minZ: 5.18, maxZ: 5.32, shape: 'cylinder', cx: -1.5, cz: 5.25, radius: 0.07, h: 3.2, baseY: 0, surface: 'hard', mesh: g });
  }
  // backyard cover: two pieces a yard and a box beside each yard anchor (between it and the house)
  const ANCH = {
    yard_n1: [21, -23.5], yard_n2: [5, -23.5], yard_n3: [-13, -24.5],
    yard_s1: [21, 23.5], yard_s2: [5, 23.5], yard_s3: [-13, 24.5],
  };
  for (const [key, side] of [['yard_n1', -1], ['yard_n2', -1], ['yard_n3', -1], ['yard_s1', 1], ['yard_s2', 1], ['yard_s3', 1]]) {
    const [ax, az] = ANCH[key];
    anchorCover[key] = coverAt(addHomeDepotBox(scene, ax, az - side * 1.3, { w: 1.3, h: 1.05, d: 1.0, facing: 0, detail: true }));
  }
  for (const [x, z, k] of [[14, -22, 'bin'], [-3, -21.5, 'ply'], [-22, -20, 'box'], [13, 21.5, 'ply'], [-3, 22, 'bin'], [-22, 20, 'box']]) {
    if (k === 'bin') coverAt(addCurbsideBin(scene, x, z, { variant: 'garbage', facing: 0.4, detail: true }));
    else if (k === 'box') coverAt(addHomeDepotBox(scene, x, z, { w: 1.2, h: 1.0, d: 1.0, facing: 0.6, detail: true }));
    else { const st = buildPlyStack(x, 0, z, 0.27); scene.add(st); coverAt({ minX: x - 0.8, maxX: x + 0.8, minZ: z - 0.45, maxZ: z + 0.45, h: 0.55, baseY: 0, mesh: st, surface: 'hard' }); }
  }

  // --- a 1.8 m board fence round the back of the yards (north, south, west); the east is the way in ---
  const fenceObs = [];
  {
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.95 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.95 });
    const run = (x1, z1, x2, z2) => {
      const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1), len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, g = new THREE.Group();
      const boards = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 1.8, alongX ? 0.05 : len), boardMat);
      boards.position.set(cx, 0.9, cz); boards.castShadow = boards.receiveShadow = true; g.add(boards);
      for (let s = 0; s <= len; s += 2.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), postMat);
        post.position.set(alongX ? Math.min(x1, x2) + s : cx, 0.95, alongX ? cz : Math.min(z1, z2) + s); g.add(post);
      }
      scene.add(g);
      fenceObs.push(box(Math.min(x1, x2) - 0.06, Math.max(x1, x2) + 0.06, Math.min(z1, z2) - 0.06, Math.max(z1, z2) + 0.06, 1.8, { mesh: g }));
    };
    run(-35.6, -27.6, 31, -27.6); run(-35.6, 27.6, 31, 27.6); run(-35.6, -27.6, -35.6, 27.6);
  }

  // --- trees: a few in the yards, woods beyond the fence, a gap in the east woods where the road comes in ---
  const treeObs = [];
  const tree = (x, z, o = {}) => treeObs.push(addSuburbanTree(scene, x, z, { detail: true, ...o }));
  for (const [x, z] of [[13, -24.5], [-4, -25], [-26, -16], [28, -21], [13, 25], [-4, 24.5], [-26, 16], [29, 21.5], [-27, -9.5], [-26.5, 10]]) tree(x, z, { trunkH: 4.4, leafR: 2.6, trunkR: 0.38 });
  for (let x = -40; x <= 38; x += 4.6) for (const sz of [-1, 1]) addSuburbanTree(scene, x + ((x * 7) % 3) * 0.4, sz * (31 + ((x * 3) % 2)), { detail: true, trunkH: 4.8, leafR: 2.7 });
  for (let z = -27; z <= 27; z += 4.6) addSuburbanTree(scene, -39.5, z, { detail: true, trunkH: 4.8, leafR: 2.7 });
  for (let z = -27; z <= 27; z += 3.4) if (Math.abs(z) > 5.5) tree(38.5 + (z % 2 ? 0.6 : 0), z, { trunkH: 4.6, leafR: 2.5 });
  const bushObs = [];
  for (const h of HOUSES) for (const s of [-1, 1]) {   // a shrub either side of each front step
    bushObs.push(addBush(scene, h.x + s * 2.6, h.z + (h.side === 'north' ? 4.6 : -4.6), 1.2, 0.8, 1.0, null, 0, { detail: true }));
  }
  for (const h of HOUSES) {   // mailboxes at the foot of each driveway
    const mx = h.x + 2.4, mz = h.side === 'north' ? -4.6 : 4.6;
    bushObs.push(addMailbox(scene, mx, mz, { facing: h.side === 'north' ? 0 : Math.PI }));
  }

  // --- streetlamps on the grass ---
  const lampObs = [];
  for (const [x, z] of [[12, -5.1], [-9, 7.4], [28, 5.1], [-14, -7.4]]) {
    const lamp = addStreetlamp(scene, x, z, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
  }

  const bounds = { minX: -35, maxX: 36, minZ: -27, maxZ: 27 };
  const edge = [box(37.2, 70, -60, 60, 6)];   // past the east entry

  Object.assign(ANCH, {
    bulb_fort: [-24.1, 2.2], bulb_island: [-17.3, 0], bulb_car_n: [-6.5, -4.6], bulb_car_s: [-4.5, 4.6],
    front_n: [1.5, -8.2], front_s: [9, 8.3],
    entry_n: [30.5, -3.2], entry_s: [31, 3.4],
    cluster_bulb: [-24.5, -0.6], cluster_east: [33, 0],
  });
  const A = (key, cover) => ({ pos: P(ANCH[key][0], ANCH[key][1]), cover: cover || null });
  const placements = {
    bulb_fort: A('bulb_fort', bulbFort[0]), bulb_island: A('bulb_island', islandObs[0]),
    bulb_car_n: A('bulb_car_n', bulbCarN), bulb_car_s: A('bulb_car_s', bulbCarS),
    front_n: A('front_n', anchorCover.front_n), front_s: A('front_s', anchorCover.front_s),
    yard_n1: A('yard_n1', anchorCover.yard_n1), yard_n2: A('yard_n2', anchorCover.yard_n2), yard_n3: A('yard_n3', anchorCover.yard_n3),
    yard_s1: A('yard_s1', anchorCover.yard_s1), yard_s2: A('yard_s2', anchorCover.yard_s2), yard_s3: A('yard_s3', anchorCover.yard_s3),
    entry_n: A('entry_n'), entry_s: A('entry_s'),
    cluster_bulb: A('cluster_bulb'), cluster_east: A('cluster_east'),
  };
  const playerSpawns = {
    entry: { pos: P(34.5, 0), yaw: Math.PI / 2 },   // the east entry, facing west down the street to the bulb
    fort: { pos: P(-21.8, 2.2), yaw: -Math.PI / 2 },   // v1.187: inside the bulb fort, facing east over its wall down the street
  };
  return {
    scene,
    spawn: playerSpawns.entry.pos.clone(), spawnYaw: playerSpawns.entry.yaw, bounds,
    cover: coverList,
    obstacles: [...houseObs, islandObs[1], ...treeObs, ...bushObs, ...coverList, ...propObs, ...driveCars, ...fenceObs, ...lampObs, ...edge],
    enemies: [],
    name: 'Bellfield Court', scenarioName: '', desc: '',
    placements, playerSpawns, groundY,
    teamBases: { player: { x: 33, z: 0 }, enemy: { x: -24, z: 0 } },
  };
}

// =====================================================================
// v1.155: HOLLINS RIDGE HIGH (East Roswell) — the sixth zone (backlog D.1, Michael: A, control room 4 Oct: a high
// school's grounds, made-up name, with fields, bleachers and portables). A made-up school, per his C on place names.
// Flat. The school's brick front closes the NORTH (z = -30) with a staff row of cars along it; six portable
// classrooms stand in two columns in the WEST; the practice field fills the EAST with goalposts and tackling sleds;
// the home bleachers face it from the SOUTH, beside the concession stand and a blacktop court. Team A (enemies) start
// at the school doors, team B (player) behind the bleachers. Layout is fixed, so the AI's cover and the tests see the
// same grounds every round; only car colours vary.
// Playable box: x∈[-40,40], z∈[-28,29].
// =====================================================================
function buildHighSchoolScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9ec6e6, dayFog: [55, 150],
    sunColor: 0xfff1d8, sunInt: 1.9, sunPos: [24, 40, 16],
    dayAmbColor: 0xa8b4c8, dayAmbInt: 0.36, dayHemiColor: 0xc4d8f0, dayHemiInt: 0.30,
    nightBg: 0x0a0e16, nightFog: [16, 64], moonPos: [-20, 36, -16],
    shadow: { size: 4096, extent: 52, far: 120 },
  });

  const groundY = () => 0;     // graded school grounds: flat
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const bounds = { minX: -40, maxX: 40, minZ: -28, maxZ: 29 };
  let _seed = 11;
  const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const flat = (w, d, color, x, z, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const mesh = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow) m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  };
  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', baseY = 0) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY }; obstacles.push(o); return o;
  };

  // Ground: mown lawn, the practice field's brighter turf, the walks and the blacktop.
  flat(200, 200, 0x5a6e48, 0, 0, 0);
  flat(38, 36, 0x41703a, 20, -1, 0.006);                   // practice field x∈[1,39], z∈[-19,17]
  flat(86, 3.2, 0x9a968c, -3, -28.6, 0.012);              // front walk along the school
  flat(4, 46, 0x9a968c, -7.5, -4, 0.012);                  // the walk from the doors to the court
  flat(30, 12, _night ? 0x26272a : 0x37383c, -24, 22.5, 0.008);   // blacktop court x∈[-39,-9], z∈[16.5,28.5]
  flat(46, 6, _night ? 0x2c2d30 : 0x3d3e42, 17, -25, 0.008);       // staff lot x∈[-6,40], z∈[-28,-22]
  // Field lines: sidelines, end lines and a line every 4.5 m across.
  {
    const lineMat = std(0xf2f0e8);
    const line = (w, d, x, z) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.014, z); scene.add(l); };
    line(36, 0.15, 20, -18); line(36, 0.15, 20, 16);
    for (let x = 2; x <= 38.01; x += 4.5) line(x === 2 || x > 37.9 ? 0.25 : 0.12, 34, x, -1);
  }

  // === THE SCHOOL — two storeys of brick along the north, the main doors facing the grounds ===
  {
    const W = 86, D = 14, H = 8, cx = -3, frontZ = -30;
    mesh(new THREE.BoxGeometry(W, H, D), std(0x9a5a46, { roughness: 0.95 }), cx, H / 2, frontZ - D / 2);
    mesh(new THREE.BoxGeometry(W + 0.4, 0.5, 0.6), std(0xd8d0c0, { roughness: 0.8 }), cx, H + 0.25, frontZ - 0.1, false);
    mesh(new THREE.BoxGeometry(W, 0.25, 0.2), std(0xd8d0c0), cx, 4.05, frontZ + 0.08, false);   // the storey band
    const glassMat = std(0x2a3a4c, { roughness: 0.25, metalness: 0.3, emissive: _night ? 0xfff0c8 : 0x0a0f15, emissiveIntensity: _night ? 0.4 : 0.2 });
    const frameMat = std(0xe8e4d8);
    for (let x = cx - W / 2 + 4; x <= cx + W / 2 - 3; x += 5) {
      if (Math.abs(x - -7.5) < 4) continue;   // the doors
      for (const y of [2.0, 6.0]) {
        mesh(new THREE.BoxGeometry(2.6, 1.7, 0.12), frameMat, x, y, frontZ + 0.04, false);
        mesh(new THREE.BoxGeometry(2.3, 1.45, 0.14), glassMat, x, y, frontZ + 0.06, false);
      }
    }
    // Main doors under a flat canopy on two columns, at the end of the walk.
    mesh(new THREE.BoxGeometry(4.4, 2.6, 0.14), glassMat, -7.5, 1.3, frontZ + 0.06, false);
    mesh(new THREE.BoxGeometry(0.1, 2.6, 0.16), frameMat, -7.5, 1.3, frontZ + 0.08, false);
    mesh(new THREE.BoxGeometry(7, 0.3, 3.2), std(0xd8d0c0), -7.5, 3.3, frontZ + 1.6);
    for (const px of [-10.6, -4.4]) { mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 10), frameMat, px, 1.6, frontZ + 2.9); box(px - 0.18, px + 0.18, frontZ + 2.72, frontZ + 3.08, 3.2); }
    // The name over the doors (a made-up school).
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#e8e2d2'; c2.fillRect(0, 0, 512, 64);
    c2.fillStyle = '#5a2a22'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'HOLLINS RIDGE HIGH', 256, 34, 40, 'Georgia', 512 - 40);   // v1.300
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
    sign.position.set(-7.5, 4.9, frontZ + 0.1); scene.add(sign);
    box(cx - W / 2, cx + W / 2, frontZ - D, frontZ, H);
  }

  // === THE PORTABLES — six trailer classrooms in two columns, raised on a skirt, a step and landing at each door ===
  // Each is 11 m (x) by 7 m (z); the columns stand 3.5 m apart, the rows 6 m apart.
  const PORTABLE_X = [-31, -16.5], PORTABLE_Z = [-18, -5, 8];
  {
    const sideMat = std(0xd8ccb0), trimMat = std(0x7a5a3a), skirtMat = std(0x6e6a62), roofMat = std(0x9a9890, { roughness: 0.6, metalness: 0.3 });
    const winMat = std(0x2a3a4c, { roughness: 0.3, metalness: 0.2, emissive: _night ? 0xffe8b8 : 0x000000, emissiveIntensity: _night ? 0.35 : 0 });
    const doorMat = std(0x8a3a2a), deckMat = std(0x8a7a5a);
    let n = 0;
    for (const px of PORTABLE_X) for (const pz of PORTABLE_Z) {
      n++;
      mesh(new THREE.BoxGeometry(11, 0.6, 7), skirtMat, px, 0.3, pz);
      mesh(new THREE.BoxGeometry(11, 2.9, 7), sideMat, px, 0.6 + 1.45, pz);
      mesh(new THREE.BoxGeometry(11.3, 0.18, 7.3), roofMat, px, 3.59, pz);
      mesh(new THREE.BoxGeometry(11.06, 0.12, 7.06), trimMat, px, 3.45, pz, false);
      // the AC unit on the east end
      mesh(new THREE.BoxGeometry(0.6, 0.9, 1.0), std(0xb8b4aa), px + 5.8, 2.0, pz - 1.6);
      // two windows a side, the door on the south side, a number by it
      for (const wx of [-3.6, 0.2]) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(1.6, 1.0, 0.08), winMat, px + wx, 2.3, pz + s * 3.52, false);
      mesh(new THREE.BoxGeometry(1.0, 2.1, 0.08), doorMat, px + 3.2, 0.6 + 1.05, pz + 3.53, false);
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      const c2 = cv.getContext('2d'); c2.fillStyle = '#f4efe2'; c2.fillRect(0, 0, 64, 64);
      c2.fillStyle = '#2a2520'; c2.font = 'bold 34px Georgia'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('P' + n, 32, 34);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      tag.position.set(px + 4.2, 2.4, pz + 3.56); scene.add(tag);
      // wooden landing and two steps down to the grass (you can step and stand on it; kids walk round)
      mesh(new THREE.BoxGeometry(1.8, 0.6, 1.3), deckMat, px + 3.2, 0.3, pz + 3.5 + 0.65);
      mesh(new THREE.BoxGeometry(1.8, 0.3, 0.5), deckMat, px + 3.2, 0.15, pz + 3.5 + 1.55);
      const o = box(px - 5.5, px + 5.5, pz - 3.5, pz + 3.5, 3.6);
      coverList.push(o);
      box(px + 2.3, px + 4.1, pz + 3.5, pz + 4.8, 0.6, 'wood');
    }
  }

  // === THE STAFF ROW — teachers' cars nosed in along the school front, gaps between for walking through ===
  const carObsList = [];
  {
    const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x6e7478, 0x3a5a3a, 0xb09a6a, 0x9a2a2a, 0x2a3e6a];
    for (const x of [2, 5, 11, 14, 20, 26, 29]) {
      const orient = Math.PI / 2 + (rnd() - 0.5) * 0.08;   // nose north, toward the school
      const color = CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
      const carObs = addCar(scene, x + (rnd() - 0.5) * 0.3, -25.4 + (rnd() - 0.5) * 0.2, { orientation: orient, color, detail: true });
      carObs.mesh.position.y += carSeatY(carObs, groundY);
      resolveObox(carObs); resolveObox(carObs._stacked);
      pushCarObs(obstacles, carObs);
      coverList.push(carObs); carObsList.push(carObs);
    }
    const lineMat = std(0xe8e4d8);
    for (let x = 0.5; x <= 37; x += 3) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4.6), lineMat); ln.rotation.x = -Math.PI / 2; ln.position.set(x, 0.014, -25.4); scene.add(ln); }
  }

  // === THE PRACTICE FIELD — goalposts at both ends, tackling sleds, a ball cart, the team bench ===
  {
    const postMat = std(0xe8d040, { roughness: 0.5, metalness: 0.2 });
    for (const gx of [2, 38]) {
      mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.0, 10), postMat, gx, 1.5, -1);
      mesh(new THREE.BoxGeometry(0.16, 0.16, 5.6), postMat, gx, 3.0, -1);
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 6, 8), postMat, gx, 6.0, -1 + s * 2.8);
      box(gx - 0.16, gx + 0.16, -1.16, -0.84, 3.0, 'metal');
    }
    const padMat = std(0x7a1e1e), frameMat = std(0x3a3a3a, { roughness: 0.5, metalness: 0.6 });
    for (const [sx, sz] of [[13, -8], [24, 5], [30, -11]]) {
      mesh(new THREE.BoxGeometry(2.8, 0.12, 1.4), frameMat, sx, 0.06, sz);
      for (const dx of [-0.8, 0.8]) mesh(new THREE.BoxGeometry(0.9, 1.0, 0.5), padMat, sx + dx, 0.55, sz - 0.35);
      coverList.push(box(sx - 1.4, sx + 1.4, sz - 0.7, sz + 0.7, 1.05, 'soft'));
    }
    // ball cart and the water table by the bench
    mesh(new THREE.BoxGeometry(1.3, 1.0, 0.9), std(0x2a3a5a), 18, 0.5, 10);
    coverList.push(box(17.35, 18.65, 9.55, 10.45, 1.0, 'metal'));
    mesh(new THREE.BoxGeometry(2.4, 0.8, 0.8), std(0xc8c4bc), 8, 0.4, -20.5);
    for (const wx of [7.3, 8.0, 8.7]) mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10), std(0xd06a20), wx, 1.05, -20.5);
    coverList.push(box(6.8, 9.2, -20.9, -20.1, 1.3, 'hard'));
    mesh(new THREE.BoxGeometry(8, 0.45, 0.5), std(0x5a6a7a, { metalness: 0.4 }), 16, 0.45, -20.4);
    box(12, 20, -20.65, -20.15, 0.5, 'metal');
  }

  // === THE HOME BLEACHERS — five aluminium tiers facing the field, open frame behind ===
  // Tier k (0..4) is a 1 m deep strip, 0.45 m higher than the one in front; collision follows the steps.
  {
    const x0 = 8, x1 = 32, z0 = 18.5;
    const plankMat = std(0xc8ccd0, { roughness: 0.45, metalness: 0.15 }), frameMat = std(0x9aa0a6, { roughness: 0.5, metalness: 0.2 });
    for (let k = 0; k < 5; k++) {
      const h = 0.45 * (k + 1), zc = z0 + k + 0.5;
      mesh(new THREE.BoxGeometry(x1 - x0, 0.06, 0.9), plankMat, (x0 + x1) / 2, h, zc - 0.05);          // seat
      mesh(new THREE.BoxGeometry(x1 - x0, 0.42, 0.04), frameMat, (x0 + x1) / 2, h - 0.22, zc - 0.5, false);   // riser
      box(x0, x1, z0 + k, z0 + k + 1, h, 'metal');
    }
    for (let x = x0; x <= x1 + 0.01; x += 4) {
      mesh(new THREE.BoxGeometry(0.1, 2.3, 0.1), frameMat, x, 1.15, z0 + 4.95);
      const brace = mesh(new THREE.BoxGeometry(0.08, 0.08, 5.4), frameMat, x, 1.15, z0 + 2.5, false);
      brace.rotation.x = -Math.atan2(2.25, 5);
    }
    // the back rail
    mesh(new THREE.BoxGeometry(x1 - x0, 0.06, 0.06), frameMat, (x0 + x1) / 2, 3.15, z0 + 4.95, false);
    for (let x = x0; x <= x1 + 0.01; x += 2) mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), frameMat, x, 2.7, z0 + 4.95, false);
  }

  // === THE CONCESSION STAND, the storage container and the court ===
  {
    mesh(new THREE.BoxGeometry(6, 3, 5), std(0xc8b89a), -3, 1.5, 21);
    mesh(new THREE.BoxGeometry(6.6, 0.2, 5.6), std(0x7a1e1e), -3, 3.1, 21);
    mesh(new THREE.BoxGeometry(3.4, 1.0, 0.1), std(0x2a2a2a), -3, 1.6, 18.46, false);   // the shutter
    coverList.push(box(-6, 0, 18.5, 23.5, 3.0));
    // a steel storage container on the lawn between the portables and the field
    mesh(new THREE.BoxGeometry(6, 2.6, 2.4), std(0x2f5a7a, { roughness: 0.6, metalness: 0.4 }), -2.5, 1.3, -3);
    for (let x = -5.3; x <= 0.31; x += 0.4) mesh(new THREE.BoxGeometry(0.06, 2.5, 2.46), std(0x2a5070, { metalness: 0.4 }), x, 1.3, -3, false);
    coverList.push(box(-5.5, 0.5, -4.2, -1.8, 2.6, 'metal'));
    // basketball hoops at each end of the court, a picnic table between the portables and the doors
    for (const hx of [-37.5, -10.5]) {
      mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), std(0x3a3a3a, { metalness: 0.6 }), hx, 1.7, 22.5);
      mesh(new THREE.BoxGeometry(0.06, 1.0, 1.6), std(0xf2f0e8), hx + (hx < -20 ? 0.5 : -0.5), 3.3, 22.5);
      box(hx - 0.12, hx + 0.12, 22.38, 22.62, 3.4, 'metal');
    }
    for (const [tx, tz] of [[-4, -22], [-14, -24.5], [-28, 15]]) {
      mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), std(0x8a6a3a), tx, 0.75, tz);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(1.8, 0.06, 0.3), std(0x8a6a3a), tx, 0.45, tz + s * 0.6);
      coverList.push(box(tx - 0.9, tx + 0.9, tz - 0.75, tz + 0.75, 0.78, 'wood'));
    }
    // dumpsters by the east end of the school
    for (const dx of [37, 39.4]) {
      mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), std(0x2c5a3a, { metalness: 0.3 }), dx - 1.2, 0.75, -27.6);
    }
    coverList.push(box(34.7, 39.3, -28.4, -26.8, 1.5, 'metal'));
  }

  // Trees: a line along the court's north edge and a few on the lawn.
  const treeObs = [];
  for (const [tx, tz] of [[-36, 13.5], [-20, 13.5], [-4, 9], [-4, 13.5], [-38.5, 0], [-8, 28], [38.5, 24]]) {
    treeObs.push(addSuburbanTree(scene, tx, tz, { trunkH: 2.8, leafR: 2.0, detail: true }));
  }
  const lampObs = [];
  for (const [lx, lz] of [[-7.5, 14], [6, -21], [30, 17.2], [-24, -24.5]]) {   // v1.156: + the field's south-east corner and the school front, for the night match
    const lamp = addStreetlamp(scene, lx, lz, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
  }

  // A chain-link fence along the south and east edges (cosmetic posts and a fabric plane; the edge blocks).
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const postMat = std(0x8a9096, { metalness: 0.6 });
    const fz = 29.6, fx = 40.6;
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(82, 1.8), fenceMat); s1.position.set(0, 0.9, fz); scene.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(58, 1.8), fenceMat); s2.rotation.y = Math.PI / 2; s2.position.set(fx, 0.9, 0.6); scene.add(s2);
    for (let x = -40; x <= 40; x += 4) mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), postMat, x, 0.95, fz, false);
    for (let z = -28; z <= 29; z += 4) mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), postMat, fx, 0.95, z, false);
  }
  const edge = [
    { minX: -60, maxX: -40.6, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: 40.6, maxX: 60, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: -60, maxX: 60, minZ: 29.6, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
  ];

  // === ANCHORS & SPAWNS ===
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of coverList) {
      const d = Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  const placements = {
    // Team A — the school side
    a_doors:     A(-2, -24),
    a_cars_w:    A(10.5, -21.5),
    a_cars_e:    A(26, -20.5),
    a_port_w:    A(-31, -11.5),
    a_port_e:    A(-16.5, -11.5),
    a_port_gap:  A(-23.7, -5),
    a_container: A(-2.5, -6),
    a_sled:      A(30, -13),
    // Team B — the bleachers side
    b_bleach_w:  A(4, 23),
    b_bleach_e:  A(34.5, 26),
    b_stand:     A(-3, 26),
    b_court:     A(-24, 25),
    b_port_s:    A(-23.7, 14.5),
    b_sled:      A(24, 7.5),
    cluster_north: { pos: P(-6, -25.5), cover: null },
    cluster_south: { pos: P(5, 27),     cover: null },
    cluster_field: { pos: P(28, -2),    cover: null },   // v1.156: the defend's attackers stage on the field
  };
  const playerSpawns = {
    team_b: { pos: P(5, 26.5), yaw: -0.35 },       // at the west end of the home bleachers, looking up the field's west sideline (yaw 0 faces -z, the school)
    team_a: { pos: P(-7.5, -25), yaw: Math.PI },
    portables: { pos: P(-19, 1.5), yaw: -Math.PI / 2 },   // v1.156: the defend, in the lane between the middle and south rows, facing the field (east)
    // v1.177 (Found in play, critic v1.176): Friday Night Lights starts behind the concession stand, out of Owen's line
    // from the staff cars (team_b gave him a 48 m shot at a standing player, 8 of 8 rounds tagged, most at 3-12 s),
    // looking past the stand's east end toward the bleachers and the field
    stand: { pos: P(-4, 25.5), yaw: -1.2 },
  };

  const allObs = [...obstacles, ...treeObs, ...lampObs, ...edge];
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: coverList,
    obstacles: allObs,
    enemies: [],
    name: 'Hollins Ridge High', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    teamBases: { player: { x: 5, z: 26.5 }, enemy: { x: -6, z: -25 } },
  };
}
function buildHighSchoolSceneDefault(_v, tod) { return buildHighSchoolScene('default', tod); }

// =====================================================================
// v1.157: WILLOW BEND COUNTRY CLUB (Horseshoe Bend) — the seventh zone (backlog D.1, Michael: A, control room 4 Oct:
// the country-club pool and golf course from his list, with a made-up club name, per his C on place names).
// Flat. The white clubhouse closes the NORTH (z = -30) behind a covered veranda; the pool and its deck fill the
// NORTH-WEST, with the pool house against the west fence; the 18th green and its fairway fill the EAST, with bunkers,
// a pond and the cart barn; the putting green, a gazebo and the halfway hut sit in the SOUTH. The pool and the pond
// stop bodies but not BBs (bbPass), so you can shoot across the water but not walk it. Team A (enemies) start on the
// veranda, team B (player) by the halfway hut. Layout is fixed, as the school's is; only cart colours vary.
// Playable box: x∈[-40,40], z∈[-28,29].
// =====================================================================
function buildCountryClubScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0xa4cbe8, dayFog: [60, 160],
    sunColor: 0xfff3dc, sunInt: 1.95, sunPos: [-22, 42, 18],
    dayAmbColor: 0xa8b8c4, dayAmbInt: 0.36, dayHemiColor: 0xc8dcf0, dayHemiInt: 0.30,
    nightBg: 0x090d16, nightFog: [16, 66], moonPos: [24, 36, -16],
    shadow: { size: 4096, extent: 52, far: 120 },
  });

  const groundY = () => 0;     // a graded club: flat
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const bounds = { minX: -40, maxX: 40, minZ: -28, maxZ: 29 };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const flat = (w, d, color, x, z, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const disc = (rx, rz, color, x, z, y) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const mesh = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow) m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  };
  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', extra = {}) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY: 0, ...extra }; obstacles.push(o); return o;
  };

  // Ground: the club lawn, the fairway's mown stripes, the green, the walks and the pool deck.
  flat(200, 200, 0x55703f, 0, 0, 0);
  for (let k = 0; k < 8; k++) flat(3.5, 34, k % 2 ? 0x5f8a42 : 0x689548, 11.75 + k * 3.5, 12, 0.005);   // fairway x∈[10,38], z∈[-5,29]
  disc(8.5, 6.5, 0x6a9c48, 24, -11, 0.007);                 // the fringe
  disc(7.5, 5.5, 0x78ad52, 24, -11, 0.009);                 // the 18th green
  disc(4.2, 2.6, 0xdccb98, 13.5, -15, 0.011);               // greenside bunkers
  disc(3.4, 2.2, 0xdccb98, 33, -4.5, 0.011);
  disc(3.0, 2.0, 0xdccb98, 27, 6, 0.011);                   // the fairway bunker
  flat(30, 21, 0xd8d2c4, -24, -11.5, 0.012);                // pool deck x∈[-39,-9], z∈[-22,-1]
  flat(56, 3.4, 0xb8b0a0, -12, -28.3, 0.013);               // the walk along the clubhouse
  flat(2.4, 50, 0x9c988e, 5, 3, 0.012);                     // the cart path from the barn to the south fence
  disc(7, 5, 0x78ad52, -24, 15, 0.009);                      // the putting green

  // === THE CLUBHOUSE — a long white clubhouse with a covered veranda facing the course ===
  {
    const W = 52, D = 14, H = 5.5, cx = -12, frontZ = -30;
    mesh(new THREE.BoxGeometry(W, H, D), std(0xece6d8, { roughness: 0.85 }), cx, H / 2, frontZ - D / 2);
    // a low hipped roof: a slab and a ridge block
    mesh(new THREE.BoxGeometry(W + 1.2, 0.35, D + 1.2), std(0x2f4a3a), cx, H + 0.17, frontZ - D / 2);
    mesh(new THREE.BoxGeometry(W - 6, 1.6, D - 6), std(0x2f4a3a), cx, H + 1.1, frontZ - D / 2);
    const glassMat = std(0x2a3a4c, { roughness: 0.25, metalness: 0.3, emissive: _night ? 0xffeac0 : 0x0a0f15, emissiveIntensity: _night ? 0.45 : 0.2 });
    const frameMat = std(0xffffff);
    for (let x = cx - W / 2 + 3; x <= cx + W / 2 - 2; x += 4) {
      if (Math.abs(x - -12) < 3) continue;   // the doors
      mesh(new THREE.BoxGeometry(2.3, 2.3, 0.12), frameMat, x, 2.0, frontZ + 0.04, false);
      mesh(new THREE.BoxGeometry(2.0, 2.0, 0.14), glassMat, x, 2.0, frontZ + 0.06, false);
    }
    mesh(new THREE.BoxGeometry(3.6, 2.6, 0.14), glassMat, -12, 1.3, frontZ + 0.06, false);
    mesh(new THREE.BoxGeometry(0.1, 2.6, 0.16), frameMat, -12, 1.3, frontZ + 0.08, false);
    // the veranda: a roof on white posts along the front, 3 m deep
    mesh(new THREE.BoxGeometry(W - 4, 0.25, 3.4), std(0x2f4a3a), cx, 3.3, frontZ + 1.7);
    for (let x = cx - W / 2 + 2.5; x <= cx + W / 2 - 2.4; x += 6) {
      mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.2, 10), frameMat, x, 1.6, frontZ + 3.1);
      box(x - 0.16, x + 0.16, frontZ + 2.94, frontZ + 3.26, 3.2);
    }
    // the name over the doors (a made-up club)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#2f4a3a'; c2.fillRect(0, 0, 512, 64);
    c2.fillStyle = '#e8d8a0'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'WILLOW BEND COUNTRY CLUB', 256, 34, 34, 'Georgia', 512 - 40);   // v1.300
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
    sign.position.set(-12, 4.4, frontZ + 0.1); scene.add(sign);
    box(cx - W / 2, cx + W / 2, frontZ - D, frontZ, H);
    // planters either side of the doors (low cover on the veranda)
    for (const px of [-16, -8]) {
      mesh(new THREE.BoxGeometry(1.6, 0.8, 0.8), std(0x9a8a70), px, 0.4, frontZ + 1.4);
      mesh(new THREE.SphereGeometry(0.6, 8, 6), std(0x3a6a2a), px, 1.0, frontZ + 1.4);
      coverList.push(box(px - 0.8, px + 0.8, frontZ + 1.0, frontZ + 1.8, 0.8));
    }
  }

  // === THE POOL — 16 x 7 m, with the deck, loungers, umbrellas, the lifeguard chair and the pool house ===
  {
    const px0 = -32, px1 = -16, pz0 = -15, pz1 = -8;
    const pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pw = px1 - px0, pd = pz1 - pz0;
    // coping, then the water a shade darker at the deep (west) end
    mesh(new THREE.BoxGeometry(pw + 0.8, 0.1, pd + 0.8), std(0xf0ece2), pcx, 0.05, pcz, false);
    const waterMat = std(0x3aa0c8, { roughness: 0.15, metalness: 0.1, emissive: _night ? 0x0a4a6a : 0x000000, emissiveIntensity: _night ? 0.6 : 0 });
    mesh(new THREE.BoxGeometry(pw, 0.04, pd), waterMat, pcx, 0.1, pcz, false);
    mesh(new THREE.BoxGeometry(pw * 0.4, 0.045, pd), std(0x2a86b0, { roughness: 0.15 }), px0 + pw * 0.2, 0.101, pcz, false);
    // lane ropes
    for (const lz of [pz0 + 2.33, pz0 + 4.66]) mesh(new THREE.BoxGeometry(pw, 0.06, 0.06), std(0xd03030), pcx, 0.13, lz, false);
    // the water stops bodies, not BBs; nobody stands on it
    box(px0 - 1.2, px1, pz0, pz1, 1.0, 'water', { bbPass: true, noStand: true });   // with the diving board's stand at the west end
    // the diving board at the deep end, and the ladders
    mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), std(0xe8e4d8), px0 + 0.3, 0.75, pcz);
    mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), std(0x8a8a8a, { metalness: 0.5 }), px0 - 0.8, 0.35, pcz);
    for (const lx of [px1 - 1.2, px0 + 3]) for (const s of [-0.25, 0.25]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), std(0xc8c8c8, { metalness: 0.7 }), lx + s, 0.5, pz1 + 0.15, false);
    // the lifeguard chair on the north side
    mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), std(0xe8e4d8), -24, 1.9, pz0 - 1.2);
    for (const [dx, dz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), std(0xe8e4d8), -24 + dx, 0.95, pz0 - 1.2 + dz);
    mesh(new THREE.BoxGeometry(0.9, 0.7, 0.08), std(0xd03030), -24, 2.3, pz0 - 1.55);
    box(-24.5, -23.5, pz0 - 1.6, pz0 - 0.8, 2.4, 'wood');
    // loungers: a row along each long side (crouch cover, 0.45 m)
    const loungeMat = std(0xf2f0ea), padMat = std(0x2a6a8a);
    for (const [lz, rows] of [[-18.5, [-34, -30, -26, -20, -16]], [-4.5, [-34, -30, -26, -20, -16]]]) {
      for (const lx of rows) {
        mesh(new THREE.BoxGeometry(0.75, 0.3, 2.0), loungeMat, lx, 0.3, lz);
        mesh(new THREE.BoxGeometry(0.7, 0.08, 1.9), padMat, lx, 0.48, lz);
        coverList.push(box(lx - 0.4, lx + 0.4, lz - 1.0, lz + 1.0, 0.5, 'soft'));
      }
    }
    // umbrellas between the loungers (a pole you can't pass, a canopy above head height)
    for (const [ux, uz] of [[-28, -18.5], [-18, -18.5], [-28, -4.5], [-18, -4.5]]) {
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), std(0xd8d8d8, { metalness: 0.5 }), ux, 1.2, uz, false);
      const can = mesh(new THREE.ConeGeometry(1.4, 0.5, 8), std(uz < -10 ? 0x2a6a8a : 0xe8e0c8), ux, 2.45, uz);
      can.castShadow = true;
      box(ux - 0.06, ux + 0.06, uz - 0.06, uz + 0.06, 2.4, 'metal');
    }
    // the pool house against the west fence: changing rooms and a snack window
    mesh(new THREE.BoxGeometry(5, 3, 9), std(0xece6d8), -38.1, 1.5, -11);
    mesh(new THREE.BoxGeometry(5.6, 0.25, 9.6), std(0x2f4a3a), -38.1, 3.12, -11);
    mesh(new THREE.BoxGeometry(0.1, 1.0, 2.4), std(0x2a2a2a), -35.56, 1.6, -11, false);
    mesh(new THREE.BoxGeometry(0.1, 2.1, 1.0), std(0x2f4a3a), -35.56, 1.05, -14, false);
    coverList.push(box(-40.6, -35.6, -15.5, -6.5, 3.0));
    // a hedge along the deck's south and east edges, with gaps to walk through
    const hedgeMat = std(0x2f5a2a);
    const hedge = (x0, x1, z0, z1) => {
      mesh(new THREE.BoxGeometry(x1 - x0, 1.1, z1 - z0), hedgeMat, (x0 + x1) / 2, 0.55, (z0 + z1) / 2);
      coverList.push(box(x0, x1, z0, z1, 1.1, 'soft'));
    };
    hedge(-35, -27, -1.2, -0.2); hedge(-21, -12, -1.2, -0.2);         // south, the gate at x -27 … -21
    hedge(-9.2, -8.2, -21, -15); hedge(-9.2, -8.2, -8, -2.5);         // east, the gate at z -15 … -8
  }

  // === THE COURSE — the 18th green with its flag, the pond, the cart barn and the carts ===
  {
    // the flagstick (a thin pole you can't pass) and the cup
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), std(0xf2f0ea), 25, 1.15, -12, false);
    const flag = mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0xd8302a, side: THREE.DoubleSide }), 25.35, 2.05, -12, false);
    flag.rotation.y = 0.3;
    disc(0.11, 0.11, 0x1a1a1a, 25, -12, 0.012);
    box(24.95, 25.05, -12.05, -11.95, 2.3, 'metal');
    // the pond off the fairway, with its fountain: stops bodies, not BBs
    const pondMat = std(0x3a6a7a, { roughness: 0.12, metalness: 0.15, emissive: _night ? 0x0a1a24 : 0x000000, emissiveIntensity: _night ? 0.5 : 0 });
    disc(5.6, 5.6, 0x4a5a3a, 17, 13, 0.011);
    disc(5.0, 5.0, 0x3a6a7a, 17, 13, 0.016).material = pondMat;
    mesh(new THREE.CylinderGeometry(0.05, 0.25, 1.3, 8), new THREE.MeshStandardMaterial({ color: 0xdff0f8, transparent: true, opacity: 0.6 }), 17, 0.65, 13, false);
    obstacles.push({ minX: 12, maxX: 22, minZ: 8, maxZ: 18, shape: 'cylinder', cx: 17, cz: 13, radius: 5, h: 1.0, baseY: 0,
      surface: 'water', bbPass: true, noStand: true });
    // a wooden footbridge would cross nothing; the pond is a thing to go round. Stones on its rim instead:
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) mesh(new THREE.SphereGeometry(0.28, 6, 5), std(0x8a8478), 17 + Math.cos(a) * 5.3, 0.12, 13 + Math.sin(a) * 5.3, false);
    // the cart barn at the north-east, open-fronted, with a row of carts before it
    mesh(new THREE.BoxGeometry(16, 3.6, 7), std(0x7a5a3a), 30, 1.8, -25.5);
    mesh(new THREE.BoxGeometry(16.8, 0.3, 7.8), std(0x2f4a3a), 30, 3.75, -25.5);
    for (let x = 23.5; x <= 36.6; x += 3.25) mesh(new THREE.BoxGeometry(2.8, 2.6, 0.08), std(0x2a2620), x, 1.3, -21.96, false);
    box(22, 38, -29, -22, 3.6);
    // golf carts: a tub and seat under a roof on four posts (1.2 m cover, too tall to step onto)
    const CART_COLORS = [0xf2f0ea, 0xf2f0ea, 0x2f4a3a, 0xe8d8a0];
    const cart = (x, z, yaw) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
      const body = std(CART_COLORS[Math.floor(gameRandom() * CART_COLORS.length)], { roughness: 0.5 });
      const add = (geo, mat, gx, gy, gz) => { const m = new THREE.Mesh(geo, mat); m.position.set(gx, gy, gz); m.castShadow = m.receiveShadow = true; g.add(m); };
      add(new THREE.BoxGeometry(1.2, 0.55, 2.4), body, 0, 0.5, 0);
      add(new THREE.BoxGeometry(1.1, 0.5, 0.5), std(0x2a2a2a), 0, 0.95, 0.2);
      add(new THREE.BoxGeometry(1.25, 0.08, 1.9), body, 0, 1.95, -0.1);
      for (const [dx, dz] of [[-0.55, -0.9], [0.55, -0.9], [-0.55, 0.6], [0.55, 0.6]]) add(new THREE.BoxGeometry(0.05, 1.4, 0.05), std(0x2a2a2a), dx, 1.25, dz);
      for (const [dx, dz] of [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), std(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.22, dz); g.add(w);
      }
      // the bag on the back
      add(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), std(0x7a2a2a), 0, 1.0, 1.1);
      scene.add(g);
      const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), hx = 0.62 * c + 1.25 * s, hz = 0.62 * s + 1.25 * c;
      const o = box(x - hx, x + hx, z - hz, z + hz, 1.2, 'metal');
      coverList.push(o); return o;
    };
    for (const x of [25, 29, 33]) cart(x, -19.2, 0);
    if (variant !== 'ride') { cart(5.2, -6, 0); cart(5.2, 14, Math.PI); }   // v1.364 (D.72): the ride's cart has the path
    // the ball washer and bench by the green, and the 18th's yardage stone
    mesh(new THREE.BoxGeometry(2.0, 0.45, 0.6), std(0x8a6a3a), 14, 0.45, -4);
    coverList.push(box(13, 15, -4.3, -3.7, 0.5, 'wood'));
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), std(0x2a2a2a), 34, 0.5, -16);
    mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), std(0x2a6a8a), 34, 1.1, -16);
    box(33.85, 34.15, -16.15, -15.85, 1.3, 'metal');
  }

  // === THE SOUTH LAWN — the halfway hut, the putting green's flags, the gazebo and a stone wall ===
  {
    mesh(new THREE.BoxGeometry(5, 3, 4), std(0xece6d8), 0, 1.5, 22);
    mesh(new THREE.BoxGeometry(5.8, 0.25, 4.8), std(0x2f4a3a), 0, 3.12, 22);
    mesh(new THREE.BoxGeometry(2.6, 1.0, 0.1), std(0x2a2a2a), 0, 1.6, 19.96, false);
    coverList.push(box(-2.5, 2.5, 20, 24, 3.0));
    for (const [fx, fz] of [[-27, 13], [-21, 17], [-23, 12]]) {
      mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5), std(0xf2f0ea), fx, 0.6, fz, false);
      const f = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0xe8d040, side: THREE.DoubleSide }), fx + 0.15, 1.1, fz, false);
      f.rotation.y = 0.4;
    }
    // the gazebo: an octagon roof on eight posts; you can stand inside it
    {
      const gx = -31, gz = 22, r = 2.6;
      mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.2, 0.2, 8), std(0xd8d0c0), gx, 0.1, gz);
      const roof = mesh(new THREE.ConeGeometry(r + 0.6, 1.4, 8), std(0x2f4a3a), gx, 3.6, gz); roof.rotation.y = Math.PI / 8;
      for (let k = 0; k < 8; k++) {
        if (k === 0) continue;   // the way in, on the east
        const a = k * Math.PI / 4, x = gx + Math.cos(a) * r, z = gz + Math.sin(a) * r;
        mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.9, 8), std(0xffffff), x, 1.45, z);
        box(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 2.9);
      }
      // v1.158: the rails are real, 0.9 m, between the posts on every side but the east (cover for the defend)
      for (let k = 1; k < 7; k++) {
        const a0 = k * Math.PI / 4, a1 = (k + 1) * Math.PI / 4;
        const x0 = gx + Math.cos(a0) * r, z0 = gz + Math.sin(a0) * r, x1 = gx + Math.cos(a1) * r, z1 = gz + Math.sin(a1) * r;
        const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const rail = mesh(new THREE.BoxGeometry(len, 0.9, 0.08), std(0xffffff), mx, 0.45, mz);
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        const ex = Math.abs(x1 - x0) / 2 + 0.06, ez = Math.abs(z1 - z0) / 2 + 0.06;   // the AABB round the slanted rail
        obstacles.push({ minX: mx - ex, maxX: mx + ex, minZ: mz - ez, maxZ: mz + ez, shape: 'obox', cx: mx, cz: mz,
          hx: len / 2, hz: 0.06, angle: rail.rotation.y, h: 0.9, baseY: 0, surface: 'wood', gazeboRail: true });
      }
    }
    // a low stone wall in the lawn between the pool and the putting green, in two runs
    const stone = std(0x9a9284);
    for (const [x0, x1] of [[-36, -28], [-22, -12]]) {
      mesh(new THREE.BoxGeometry(x1 - x0, 0.9, 0.6), stone, (x0 + x1) / 2, 0.45, 6.5);
      coverList.push(box(x0, x1, 6.2, 6.8, 0.9));
    }
  }

  // Trees: the willows the club is named for by the pond, hardwoods along the course and the lawn.
  const treeObs = [];
  for (const [tx, tz, r] of [[9, 9, 2.6], [23.5, 18.5, 2.4], [38.5, 8, 2.0], [38.5, 22, 2.2], [8.5, -12, 2.0], [-6, 12, 2.2],
    [-5, 27, 2.0], [-38.5, 27, 2.0], [-14, 22, 2.0], [37.5, -9, 1.8]]) {
    treeObs.push(addSuburbanTree(scene, tx, tz, { trunkH: 3.0, leafR: r, detail: true, leafColor: tz > 5 && tx > 5 && tx < 25 ? 0x5a7a35 : undefined }));
  }
  const lampObs = [];
  for (const [lx, lz] of [[-9, -24], [6, -20], [-30, -23.5], [22, 3], [-18, 27]]) {   // v1.158: + the pool deck, the fairway and the south lawn, for the night match
    const lamp = addStreetlamp(scene, lx, lz, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
  }

  // A green chain-link fence along the south, east and west edges (cosmetic; the edge blocks).
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const postMat = std(0x2f4a3a, { metalness: 0.4 });
    const fz = 29.6, fx = 40.6;
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(82, 1.8), fenceMat); s1.position.set(0, 0.9, fz); scene.add(s1);
    for (const sx of [-fx, fx]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(58, 1.8), fenceMat); s.rotation.y = Math.PI / 2; s.position.set(sx, 0.9, 0.6); scene.add(s); }
    for (let x = -40; x <= 40; x += 4) mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), postMat, x, 0.95, fz, false);
    for (let z = -28; z <= 29; z += 4) for (const sx of [-fx, fx]) mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), postMat, sx, 0.95, z, false);
  }
  const edge = [
    { minX: -60, maxX: -40.6, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: 40.6, maxX: 60, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: -60, maxX: 60, minZ: 29.6, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
  ];

  // === ANCHORS & SPAWNS ===
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of coverList) {
      const d = Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  const placements = {
    // Team A — the clubhouse side
    a_porch:     A(-12, -25),
    a_porch_e:   A(6, -25),
    a_pool_n:    A(-22, -20.5),
    a_pool_hse:  A(-37, -18.5),
    a_barn:      A(29, -17),
    a_green:     A(16, -9),
    a_pond:      A(10, 6),
    // Team B — the south lawn
    b_hut:       A(-4, 26),
    b_gazebo:    A(-27, 24),
    b_putt:      A(-17, 9),
    b_wall:      A(-32, 9),
    b_fairway:   A(26, 24),
    b_cart:      A(7.5, 14),
    cluster_north: { pos: P(-12, -25.5), cover: null },
    cluster_south: { pos: P(4, 26), cover: null },
    cluster_course: { pos: P(-1, -10), cover: null },   // v1.158: the defend's attackers stage on the lawn below the veranda
    // v1.364 (D.72): the ride-along's kids, in the bunkers and the trees round the loop, 10-16 m off it (closer, a kid
    // with no lead on a passing cart tagged you three times in the first 8 s)
    ride_green_bunker: A(13.5, -15),    // the greenside bunker, 14 m off the north run
    ride_green:        A(22, -12.5),    // on the green's far side, 11.5 m off it
    ride_fairway:      A(25, 13),       // by the willow past the pond, inside the loop, 10 m off the east run
    ride_willow:       A(-7, 12.5),     // behind the tree on the lawn, 12 m off the west run
    ride_barn:         A(29, -17),      // among the carts by the barn, 16 m off the north run
  };
  const playerSpawns = {
    gazebo: { pos: P(-31, 22), yaw: -Math.PI / 2 },   // v1.158: the defend, inside the gazebo, facing out of the way in (east), toward the course
    team_b: { pos: P(5.5, 27), yaw: 0.12 },        // beside the halfway hut, looking up the cart path toward the clubhouse (yaw 0 faces -z)
    team_a: { pos: P(-12, -25.5), yaw: Math.PI },
  };

  const allObs = [...obstacles, ...treeObs, ...lampObs, ...edge];
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: coverList,
    obstacles: allObs,
    enemies: [],
    name: 'Willow Bend Country Club', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    teamBases: { player: { x: 5.5, z: 27 }, enemy: { x: -12, z: -25.5 } },
    // v1.364 (D.72): the ride-along's loop: up the cart path, east along the fairway's head, down by the east trees and
    // back along the south lawn, the corners rounded as Eric drives them; he starts by the halfway hut
    rideLoop: [[5, -1], [35, -1], [35, 25.5], [5, 25.5]],
    rideStart: { x: 5, z: 19 },
  };
}
function buildCountryClubSceneDefault(_v, tod) { return buildCountryClubScene('default', tod); }

// =====================================================================
// v1.159: INSIDE RIVERSIDE MARKET (East Roswell) — the eighth zone (backlog D.1, Michael: A, control room 5 Oct: the
// grocery store battle from his list, inside the made-up store whose lot is the fourth zone). One room under a roof.
// The front wall and its doors close the SOUTH (z = 18); the checkout lanes and the service desk stand inside them.
// The sales floor fills the middle: produce tables (waist high) on the WEST, five grocery aisles of 2.1 m shelving,
// cut by a cross aisle, then the chest freezers and the deli case on the EAST. The dairy coolers line the back aisle;
// three doorways through the back wall lead to the STOCKROOM in the NORTH, with pallets, racking, the baler and a
// forklift. Shelves stop a body and a BB and you can't see over them; counters, tables and freezers are crouch cover.
// Team A (enemies) start in the stockroom, team B (player) at the checkouts. Fixed layout; only product colours vary.
// Playable box: x∈[-25.6,25.6], z∈[-29.6,17.6].
// =====================================================================
function buildGroceryStoreScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  // Indoors: a high, soft "sun" stands in for the ceiling lights, so the shelves throw short shadows; the sun disc
  // and the sky are behind the walls and the roof.
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0xd6d2c6, dayFog: [40, 130],
    sunColor: 0xfffaf0, sunInt: 0.9, sunPos: [4, 60, 9],
    dayAmbColor: 0xe8ecf0, dayAmbInt: 0.5, dayHemiColor: 0xf4f6ff, dayHemiInt: 0.34,
    nightBg: 0x07090e, nightFog: [12, 52], moonPos: [10, 40, -6],
    shadow: { size: 4096, extent: 36, far: 110 },
  });

  const groundY = () => 0;
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const bounds = { minX: -25.6, maxX: 25.6, minZ: -29.6, maxZ: 17.6 };
  let _seed = 11;
  const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const mesh = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow) m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  };
  const canvasTex = (w, h, draw) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
  };
  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', extra = {}) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY: 0, ...extra }; obstacles.push(o); return o;
  };
  const H = 5.6;   // the ceiling

  // === FLOOR, WALLS AND ROOF ===
  {
    const tiles = canvasTex(256, 256, (c, w) => {
      c.fillStyle = '#e8e4da'; c.fillRect(0, 0, w, w);
      c.fillStyle = '#d6d0c2'; c.fillRect(0, 0, w / 2, w / 2); c.fillRect(w / 2, w / 2, w / 2, w / 2);
      c.strokeStyle = '#bfb8a8'; c.lineWidth = 2; c.strokeRect(0, 0, w, w); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, w); c.moveTo(0, w / 2); c.lineTo(w, w / 2); c.stroke();
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(26, 18);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(52, 36.6), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.55, color: _night ? 0x8a8a90 : 0xb4b0a6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.002, -0.3); floor.receiveShadow = true; scene.add(floor);
    const conc = new THREE.Mesh(new THREE.PlaneGeometry(52, 12), std(0x8a8884, { roughness: 1 }));
    conc.rotation.x = -Math.PI / 2; conc.position.set(0, 0.002, -24.6); conc.receiveShadow = true; scene.add(conc);
    for (const [y, dz] of [[0.004, -18.62]]) {   // the yellow line at the stockroom doors
      const l = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.12), std(0xd8b020)); l.rotation.x = -Math.PI / 2; l.position.set(0, y, dz); scene.add(l);
    }
    // the roof: a ceiling of tiles with rows of light panels (no shadow, so the room stays lit)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(54, 50), std(0xe6e4dc, { roughness: 1, emissive: _night ? 0x000000 : 0x55534c, emissiveIntensity: 0.6 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -6); scene.add(ceil);
    const panelMat = new THREE.MeshBasicMaterial({ color: _night ? 0x3a4038 : 0xfdfcf4 });
    for (let x = -21; x <= 21; x += 7) {
      mesh(new THREE.BoxGeometry(0.5, 0.06, 32), panelMat, x, H - 0.04, 0.5, false);
      mesh(new THREE.BoxGeometry(0.5, 0.06, 8), panelMat, x, H - 0.04, -24, false);
    }
    // walls: block-painted, a band of the store green at the top
    const wallMat = std(0xe2dccb, { roughness: 0.95 }), bandMat = std(0x2f6a3a);
    const wall = (x0, x1, z0, z1) => {
      mesh(new THREE.BoxGeometry(x1 - x0, H, z1 - z0), wallMat, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, false).receiveShadow = true;
      box(x0, x1, z0, z1, 6);
    };
    wall(-26.4, -25.8, -30.4, 18.4); wall(25.8, 26.4, -30.4, 18.4);    // west, east
    wall(-26.4, 26.4, -30.4, -29.8);                                   // north (the stockroom's back)
    // south, the front. v1.252 (D.24): the wall is open behind the glass, so the lot shows through it (addEdgeBackdrop);
    // its collision box is the whole wall as before, so BBs and kids stop at the glass
    box(-26.4, 26.4, 17.8, 18.4, 6);
    // v1.391 (D.51 step 4, the guide's item 9): the real front's clerestory, a band of glass from 3.2 to 5.4 m over the
    // storefront glass between brick-coloured piers, so the daylight and the canopy outside show high on the front wall
    for (const [x0, x1, y0, y1] of [[-26.4, -24, 0, H], [-2, 2, 0, H], [22, 26.4, 0, H], [-24, -2, 2.8, 3.2], [2, 22, 2.8, 3.2],
      [-24, -2, 5.4, H], [2, 22, 5.4, H], [-24, -2, 0, 0.2], [2, 22, 0, 0.2]])
      mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.6), wallMat, (x0 + x1) / 2, (y0 + y1) / 2, 18.1, false).receiveShadow = true;
    for (const x of [-24, -18.5, -13, -7.5, -2, 2, 7, 12, 17, 22]) mesh(new THREE.BoxGeometry(0.7, 2.2, 0.6), wallMat, x, 4.3, 18.1, false);
    // the back wall of the sales floor, with three doorways into the stockroom (x -16.5…-13.5, -1.5…1.5, 13.5…16.5)
    for (const [x0, x1] of [[-25.8, -16.5], [-13.5, -1.5], [1.5, 13.5], [16.5, 25.8]]) wall(x0, x1, -18.6, -18.0);
    for (const dx of [-15, 0, 15]) {
      mesh(new THREE.BoxGeometry(3.4, H - 2.6, 0.6), wallMat, dx, 2.6 + (H - 2.6) / 2, -18.3, false);   // the lintel
      for (const s of [-1, 1]) {                                                                       // swing doors, propped open
        const d = mesh(new THREE.BoxGeometry(1.4, 2.1, 0.06), std(0x6a6e72, { metalness: 0.4 }), dx + s * 1.45, 1.05, -18.0 + 0.7, false);
        d.rotation.y = Math.PI / 2;
      }
      const sign = canvasTex(128, 32, (c) => { c.fillStyle = '#c0302a'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#fff'; c.font = 'bold 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EMPLOYEES ONLY', 64, 17); });
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: sign })); sm.position.set(dx, 2.95, -17.98); scene.add(sm);
    }
    for (const [z0, z1, x] of [[-29.8, 17.8, -25.79], [-29.8, 17.8, 25.79]]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.5), bandMat); b.position.set(x, H - 0.45, (z0 + z1) / 2); b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(b);
    }
    // the front: the glass and the automatic doors at x 8…14, daylight (or the dark lot) outside
    const glassMat = new THREE.MeshBasicMaterial({ color: _night ? 0x10141c : 0xd8e8f4, transparent: true, opacity: _night ? 0.4 : 0.22, depthWrite: false });   // v1.252: see-through
    for (const [x0, x1] of [[-24, -2], [2, 22]]) mesh(new THREE.BoxGeometry(x1 - x0, 2.6, 0.04), glassMat, (x0 + x1) / 2, 1.5, 17.76, false);
    for (const [x0, x1] of [[-24, -2], [2, 22]]) mesh(new THREE.BoxGeometry(x1 - x0, 2.2, 0.04), glassMat, (x0 + x1) / 2, 4.3, 17.9, false);   // v1.391
    for (let x = -24; x <= 22; x += 2) mesh(new THREE.BoxGeometry(0.08, 2.7, 0.08), std(0x8a8c8e, { metalness: 0.5 }), x, 1.45, 17.74, false);
    mesh(new THREE.BoxGeometry(6, 0.3, 0.3), std(0x2f6a3a), 11, 2.95, 17.6, false);
    const enter = canvasTex(256, 32, (c) => { c.fillStyle = '#2f6a3a'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#fff'; c.font = 'bold 20px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ENTER  ·  EXIT', 128, 17); });
    const em = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.28), new THREE.MeshBasicMaterial({ map: enter })); em.position.set(11, 2.95, 17.44); em.rotation.y = Math.PI; scene.add(em);
    // v1.391 (D.51 step 4): outside the glass, the real front as the lot has it: the walk, the red curb and the hatched
    // fire lane, the charcoal canopy 2.5 m deep at 3.6 m on its tie-rods, and (the guide's item 8) the west entrance's
    // glass vestibule built out from the front at x -20...-14 with its own ENTER · EXIT sign. All of it is past the
    // bounds and none of it is solid; the floor inside is as it was.
    {
      const flatOut = (w, d, color, x, z, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color, { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m; };
      flatOut(56, 4.5, 0xa69e8f, 0, 18.4 + 2.25, 0.03);
      flatOut(56, 0.22, 0xb03a36, 0, 22.9 + 0.11, 0.04);
      const hatch = canvasTex(64, 64, (c) => { c.strokeStyle = '#d8b830'; c.lineWidth = 7; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 64, 64); c.lineTo(i * 64 + 64, 0); c.stroke(); } });
      hatch.wrapS = hatch.wrapT = THREE.RepeatWrapping; hatch.repeat.set(56 / 3, 1);
      const hm = new THREE.Mesh(new THREE.PlaneGeometry(56, 2.6), new THREE.MeshStandardMaterial({ map: hatch, transparent: true, roughness: 0.9, depthWrite: false }));
      hm.rotation.x = -Math.PI / 2; hm.position.set(0, 0.035, 24.4); scene.add(hm);
      const steel = std(0x26282e, { roughness: 0.6, metalness: 0.4 });
      mesh(new THREE.BoxGeometry(56, 0.25, 2.5), steel, 0, 3.72, 18.4 + 1.25, false);
      for (let x = -24; x <= 24; x += 6) { const r = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 5), steel, x, 4.75, 19.5, false); r.rotation.x = -Math.atan2(2.3, 1.9); }
      const vg = new THREE.MeshBasicMaterial({ color: _night ? 0x10141c : 0xd8e8f4, transparent: true, opacity: _night ? 0.4 : 0.25, depthWrite: false });
      const vf = std(0x8a8c8e, { metalness: 0.5 });
      mesh(new THREE.BoxGeometry(6, 2.8, 0.04), vg, -17, 1.4, 21.8, false);
      for (const x of [-20, -14]) mesh(new THREE.BoxGeometry(0.04, 2.8, 3.4), vg, x, 1.4, 20.1, false);
      for (const [x, z] of [[-20, 21.8], [-14, 21.8], [-17, 21.8]]) mesh(new THREE.BoxGeometry(0.1, 2.9, 0.1), vf, x, 1.45, z, false);
      mesh(new THREE.BoxGeometry(6.4, 0.25, 3.8), steel, -17, 2.95, 20.1, false);
      // the doorway through the front glass into the vestibule, and its sign over it inside
      mesh(new THREE.BoxGeometry(6, 0.3, 0.3), std(0x2f6a3a), -17, 2.95, 17.6, false);
      const em2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.28), new THREE.MeshBasicMaterial({ map: enter })); em2.position.set(-17, 2.95, 17.44); em2.rotation.y = Math.PI; scene.add(em2);
    }
    // the store's name on the back wall over the centre doorway, seen from the checkouts
    const name = canvasTex(512, 80, (c) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 512, 80); c.fillStyle = '#2f6a3a'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitSignText(c, 'RIVERSIDE MARKET', 256, 42, 46, 'Georgia', 512 - 40); });   // v1.300
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: name })); nm.position.set(0, 4.3, -17.98); scene.add(nm);
  }

  // === THE SALES FLOOR — five aisles of shelving between the produce and the freezers ===
  // Each run of shelving is one box: its long faces carry a drawn wall of products, its ends the store green.
  const productTex = (k) => canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#9aa0a4'; c.fillRect(0, 0, w, h);
    const PAL = ['#c0302a', '#e8b030', '#2a6ab0', '#f2f0e8', '#3a8a3a', '#e07a20', '#7a3a8a', '#d8d040', '#2a2a2a', '#b06a3a'];
    for (let lv = 0; lv < 4; lv++) {
      const y0 = 8 + lv * 62, sh = 50;
      c.fillStyle = '#6a7074'; c.fillRect(0, y0 + sh, w, 8);
      for (let x = 2; x < w;) {
        const pw = 10 + Math.floor(rnd() * 26), ph = sh * (0.6 + rnd() * 0.4), col = PAL[Math.floor(rnd() * PAL.length)];
        const n = 1 + Math.floor(rnd() * 4);
        for (let i = 0; i < n && x < w; i++, x += pw + 1) {
          c.fillStyle = col; c.fillRect(x, y0 + sh - ph, pw, ph);
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 2, y0 + sh - ph * 0.7, pw - 4, ph * 0.18);
        }
        x += 2;
      }
    }
    c.fillStyle = '#d8d0c0'; c.fillRect(0, 0, w, 6);
    void k;
  });
  const PROD = [productTex(0), productTex(1), productTex(2)];
  const endMat = std(0x2f6a3a), topMat = std(0xb8bcc0, { metalness: 0.3 });
  const shelf = (x, z0, z1, h = 2.1) => {
    const len = z1 - z0, t = PROD[Math.floor(rnd() * PROD.length)].clone(); t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 4, 1);
    const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
    mesh(new THREE.BoxGeometry(1.2, h, len), [side, side, topMat, topMat, endMat, endMat], x, h / 2, (z0 + z1) / 2);
    return box(x - 0.6, x + 0.6, z0, z1, h, 'wood', { shelf: true });
  };
  const AISLE_X = [-13, -8.5, -4, 0.5, 5, 9.5];
  for (const x of AISLE_X) { shelf(x, -11, -2.5); shelf(x, -0.5, 7); }
  // the aisle signs, hung over each aisle's mouth at the front
  const AISLE_NAMES = ['Bread · Cereal', 'Snacks · Soda', 'Canned · Pasta', 'Baking · Spices', 'Paper · Cleaning'];
  for (let i = 0; i < 5; i++) {
    const ax = (AISLE_X[i] + AISLE_X[i + 1]) / 2;
    const t = canvasTex(256, 96, (c) => {
      c.fillStyle = '#2f6a3a'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 40px Arial'; c.fillText(String(i + 1), 128, 30); c.font = 'bold 22px Arial'; c.fillText(AISLE_NAMES[i], 128, 72);
    });
    for (const [z, ry] of [[7.5, 0], [7.5, Math.PI]]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.75), new THREE.MeshBasicMaterial({ map: t })); s.position.set(ax, 3.7, z); s.rotation.y = ry; scene.add(s);
    }
    mesh(new THREE.BoxGeometry(0.02, 1.3, 0.02), std(0x6a6e72), ax, 4.75, 7.5, false);
  }
  // an end-cap display at the front of aisle 3: a pyramid of soda cases (crouch cover)
  mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), std(0xc0302a), -1.75, 0.45, 9.6);
  mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), std(0x2a6ab0), -1.75, 1.07, 9.6);
  coverList.push(box(-2.45, -1.05, 9.1, 10.1, 0.9, 'soft'));

  // the produce on the west: wooden tables of fruit and veg, waist high, in two rows
  {
    const tableMat = std(0x8a6a3a), FRUIT = [0x3a8a2a, 0xc0302a, 0xe8902a, 0xe8d040, 0x6a9a2a, 0x8a2a5a, 0xd06a2a];
    for (const tx of [-22.5, -18.5]) for (const tz of [-9.5, -4.5, 0.5, 5.5]) {
      mesh(new THREE.BoxGeometry(2.2, 0.75, 2.6), tableMat, tx, 0.375, tz);
      mesh(new THREE.BoxGeometry(2.0, 0.16, 1.2), std(FRUIT[Math.floor(rnd() * FRUIT.length)], { roughness: 0.6 }), tx, 0.83, tz - 0.62);
      mesh(new THREE.BoxGeometry(2.0, 0.16, 1.2), std(FRUIT[Math.floor(rnd() * FRUIT.length)], { roughness: 0.6 }), tx, 0.83, tz + 0.62);
      coverList.push(box(tx - 1.1, tx + 1.1, tz - 1.3, tz + 1.3, 0.9, 'wood'));
    }
    // the misted wall case along the west wall
    mesh(new THREE.BoxGeometry(1.0, 1.6, 20), std(0x3a5a3a), -25.3, 0.8, -2);
    box(-25.8, -24.8, -12, 8, 1.6, 'hard');
  }

  // the east: chest freezers in two rows and the deli case against the east wall
  {
    const frzMat = std(0xf2f2ee, { roughness: 0.4 }), lidMat = std(0x6a9ac0, { roughness: 0.1, metalness: 0.2, emissive: 0x1a3048, emissiveIntensity: _night ? 0.4 : 0.2 });
    for (const fx of [15.25, 19.25]) for (const [z0, z1] of [[-11, -3], [-1, 6]]) {
      mesh(new THREE.BoxGeometry(1.5, 0.85, z1 - z0), frzMat, fx, 0.425, (z0 + z1) / 2);
      mesh(new THREE.BoxGeometry(1.3, 0.06, z1 - z0 - 0.2), lidMat, fx, 0.88, (z0 + z1) / 2, false);
      coverList.push(box(fx - 0.75, fx + 0.75, z0, z1, 0.9, 'metal'));
    }
    // the deli: a lit glass case (1.25 m) with the counter space behind it, and the menu board on the wall
    mesh(new THREE.BoxGeometry(1.0, 0.8, 12), std(0xe8e4da), 23, 0.4, -6);
    mesh(new THREE.BoxGeometry(0.9, 0.45, 11.8), new THREE.MeshStandardMaterial({ color: 0xcfe4f0, transparent: true, opacity: 0.45, roughness: 0.1 }), 23, 1.03, -6, false);
    for (let z = -11.5; z < -0.5; z += 1.1) mesh(new THREE.BoxGeometry(0.6, 0.12, 0.8), std(rnd() < 0.5 ? 0xd88a7a : 0xe8c8a0), 23, 0.86, z, false);
    coverList.push(box(22.5, 23.5, -12, 0, 1.25, 'hard'));
    const deli = canvasTex(256, 64, (c) => { c.fillStyle = '#2a2420'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#f4d070'; c.font = 'bold 34px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DELI', 128, 34); });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: deli })); dm.position.set(25.78, 3.2, -6); dm.rotation.y = -Math.PI / 2; scene.add(dm);
  }

  // the dairy coolers along the back aisle: glass doors lit from inside, against the back wall
  {
    const cool = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#dfe8ee'; c.fillRect(0, 0, w, h);
      for (let lv = 0; lv < 4; lv++) for (let x = 4; x < w; x += 12) { c.fillStyle = ['#f4f4f0', '#e8d040', '#2a6ab0', '#c0302a'][Math.floor(rnd() * 4)]; c.fillRect(x, 8 + lv * 30, 9, 20); }
      c.strokeStyle = '#7a8084'; c.lineWidth = 4; for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    });
    cool.wrapS = THREE.RepeatWrapping;
    for (const [x0, x1] of [[-25.8, -17], [-13, -2], [2, 13], [17, 21.5]]) {
      const t = cool.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 4, 1);
      const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.2, emissive: 0x606a70, emissiveIntensity: _night ? 0.5 : 0.25 });
      const body = std(0xe8e8e4);
      mesh(new THREE.BoxGeometry(x1 - x0, 2.3, 0.8), [body, body, body, body, front, body], (x0 + x1) / 2, 1.15, -17.6, false).receiveShadow = true;
      box(x0, x1, -18.0, -17.2, 2.3, 'metal');
    }
  }

  // === THE FRONT — six checkout lanes and the service desk inside the doors ===
  {
    const beltMat = std(0x1e1e20, { roughness: 0.6 }), bodyMat = std(0x4a5a52), lightMat = new THREE.MeshBasicMaterial({ color: _night ? 0x2a2a2a : 0xf8f0a0 });
    for (let i = 0; i < 6; i++) {
      const cx = -21 + i * 4.5;
      mesh(new THREE.BoxGeometry(0.9, 0.95, 4.2), bodyMat, cx, 0.475, 13.3);
      mesh(new THREE.BoxGeometry(0.8, 0.04, 2.6), beltMat, cx, 0.97, 12.6, false);
      mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), std(0x2a2a2a), cx, 1.1, 14.5);          // the register
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), std(0x8a8c8e, { metalness: 0.6 }), cx, 1.6, 15.3, false);
      const lane = canvasTex(64, 64, (c) => { c.fillStyle = '#2f6a3a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), 32, 35); });
      const lm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), [lightMat, lightMat, lightMat, lightMat, new THREE.MeshBasicMaterial({ map: lane }), new THREE.MeshBasicMaterial({ map: lane })]);
      lm.position.set(cx, 2.35, 15.3); scene.add(lm);
      // the impulse rack at the lane's mouth (gum and magazines)
      mesh(new THREE.BoxGeometry(0.5, 1.2, 0.6), std(0x8a3a3a), cx - 1.0, 0.6, 15.1);
      coverList.push(box(cx - 0.45, cx + 0.45, 11.2, 15.4, 1.0, 'hard'));
      box(cx - 1.25, cx - 0.75, 14.8, 15.4, 1.2, 'hard');
    }
    // the service desk on the east, with the store's name over it
    mesh(new THREE.BoxGeometry(6, 1.1, 1.0), std(0x2f6a3a), 19.5, 0.55, 11.5);
    mesh(new THREE.BoxGeometry(6.2, 0.06, 1.2), std(0xd8d0c0), 19.5, 1.13, 11.5, false);
    mesh(new THREE.BoxGeometry(1.0, 1.1, 3.0), std(0x2f6a3a), 22.0, 0.55, 13.5);
    coverList.push(box(16.5, 22.5, 11.0, 12.0, 1.1, 'wood'));
    box(21.5, 22.5, 12.0, 15.0, 1.1, 'wood');
    // shopping carts by the doors, nested in a row (waist-high cover), and two loose ones
    const cartMat = std(0xa8acb0, { metalness: 0.6, roughness: 0.4 }), handle = std(0xc0302a);
    const cart = (x, z, yaw, n = 1) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.9), new THREE.MeshStandardMaterial({ color: 0xa8acb0, metalness: 0.6, roughness: 0.4, wireframe: true }));
        b.position.set(0, 0.75, k * 0.3); g.add(b);
        const bt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.85), cartMat); bt.position.set(0, 0.55, k * 0.3); g.add(bt);
      }
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), handle); hd.position.set(0, 1.0, (n - 1) * 0.3 + 0.48); g.add(hd);
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.35, (n - 1) * 0.3 + 0.35]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), std(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.06, dz); g.add(w); }
      scene.add(g);
      const len = 0.9 + (n - 1) * 0.3, c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
      const cz = z + Math.cos(yaw) * (n - 1) * 0.15, cxx = x + Math.sin(yaw) * (n - 1) * 0.15;
      const hx = 0.3 * c + len / 2 * s, hz = 0.3 * s + len / 2 * c;
      return box(cxx - hx, cxx + hx, cz - hz, cz + hz, 1.0, 'metal');
    };
    coverList.push(cart(4.5, 15.2, Math.PI / 2, 8));
    cart(12.6, 9.5, 0.6); cart(-17.5, 9.0, -0.3);
  }

  // === THE STOCKROOM — pallets of stock, steel racking, the baler and a forklift ===
  {
    const rackMat = std(0xd86a20, { metalness: 0.4 }), beamMat = std(0x2a5a9a, { metalness: 0.4 }), boxMat = std(0xb08a5a), tapeMat = std(0xd8c8a0), palletMat = std(0x9a7a4a);
    // racking: 3.2 m, solid with stock, along the north wall and one free-standing run
    const rack = (x0, x1, z0, z1) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      for (const ux of [x0 + 0.05, x1 - 0.05]) for (const uz of [z0 + 0.05, z1 - 0.05]) mesh(new THREE.BoxGeometry(0.1, 3.2, 0.1), rackMat, ux, 1.6, uz, false);
      for (const y of [0.1, 1.15, 2.2]) {
        mesh(new THREE.BoxGeometry(w, 0.1, d), beamMat, cx, y, cz, false);
        mesh(new THREE.BoxGeometry(w - 0.3, 0.85, d - 0.2), boxMat, cx, y + 0.5, cz);
      }
      box(x0, x1, z0, z1, 3.2, 'metal');
    };
    rack(-24.5, -12.5, -29.6, -28.4); rack(4, 16, -29.6, -28.4); rack(-9, 3, -24.4, -23.2);
    // pallets of boxed stock, chest high (crouch cover; you can't see over them crouched)
    const pallet = (x, z, h = 1.3) => {
      mesh(new THREE.BoxGeometry(1.2, 0.15, 1.2), palletMat, x, 0.075, z);
      mesh(new THREE.BoxGeometry(1.1, h - 0.15, 1.1), boxMat, x, 0.15 + (h - 0.15) / 2, z);
      mesh(new THREE.BoxGeometry(1.12, 0.06, 0.12), tapeMat, x, h - 0.02, z, false);
      return box(x - 0.6, x + 0.6, z - 0.6, z + 0.6, h, 'wood');
    };
    for (const [x, z, h] of [[-21, -22, 1.3], [-19.6, -22, 1.0], [-7, -21, 1.3], [7.5, -21.5, 1.3], [8.9, -21.5, 1.0], [-18, -26, 1.3], [20, -25.5, 1.3], [12, -25, 1.0]]) coverList.push(pallet(x, z, h));
    // the baler in the north-east corner
    mesh(new THREE.BoxGeometry(2.4, 2.6, 2.0), std(0x3a6a9a, { metalness: 0.3 }), 22.6, 1.3, -27.8);
    mesh(new THREE.BoxGeometry(1.6, 0.8, 0.1), std(0xd8c8a0), 22.6, 1.0, -26.76, false);
    box(21.4, 23.8, -28.8, -26.8, 2.6, 'metal');
    // a forklift, parked with its forks down (1.2 m body, the overhead guard above)
    {
      const fx = 17.5, fz = -21.5;
      mesh(new THREE.BoxGeometry(1.2, 1.2, 2.2), std(0xe8c020, { roughness: 0.5 }), fx, 0.75, fz);
      mesh(new THREE.BoxGeometry(1.1, 0.06, 1.3), std(0x2a2a2a), fx, 2.2, fz + 0.2, false);
      for (const [dx, dz] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.8], [0.5, 0.8]]) mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), std(0x2a2a2a), fx + dx, 1.75, fz + dz, false);
      mesh(new THREE.BoxGeometry(1.0, 2.4, 0.12), std(0x3a3a3a), fx, 1.2, fz - 1.15, false);
      for (const dx of [-0.3, 0.3]) mesh(new THREE.BoxGeometry(0.12, 0.05, 1.1), std(0x3a3a3a), fx + dx, 0.05, fz - 1.75, false);
      coverList.push(box(fx - 0.62, fx + 0.62, fz - 1.25, fz + 1.12, 1.2, 'metal'));
    }
    // the loading-dock door in the north wall
    const dock = canvasTex(128, 128, (c) => { c.fillStyle = '#9a9c9e'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#7a7c7e'; for (let y = 0; y < 128; y += 8) c.fillRect(0, y, 128, 3); });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.6), new THREE.MeshStandardMaterial({ map: dock, roughness: 0.6, metalness: 0.3 })); dm.position.set(-4, 1.8, -29.78); scene.add(dm);
  }

  // At night: the store is shut, the ceiling dark; the coolers, the exit signs and a few night lights glow.
  if (_night) {
    for (const [x, z, c, i] of [[0, -16, 0xc8d8f0, 0.9], [-15, -16, 0xc8d8f0, 0.7], [15, -16, 0xc8d8f0, 0.7], [-8, 12, 0xffe8c0, 0.8], [11, 14, 0xffe8c0, 0.8], [0, -25, 0xffd8a0, 0.6], [-22, 0, 0xc8f0c8, 0.5], [21, -4, 0xf0e0c0, 0.6]]) {
      const L = new THREE.PointLight(c, i, 18, 1.6); L.position.set(x, 4.4, z); scene.add(L);
    }
    const exitMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });
    for (const [x, z] of [[11, 17.5], [-15, -18.7], [15, -18.7], [0, -18.7]]) mesh(new THREE.BoxGeometry(0.6, 0.22, 0.05), exitMat, x, 3.3, z, false);
  }

  // === ANCHORS & SPAWNS ===
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of coverList) {
      const d = Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  const placements = {
    // Team A — the stockroom and the back of the store
    a_stock_w:  A(-16, -24),
    a_stock_c:  A(0, -26.5),
    a_stock_e:  A(14, -23),
    a_dairy:    A(-6, -15),
    a_deli:     A(24.6, -6),
    a_frozen:   A(17.25, -7),
    a_door_c:   A(-1, -20),         // v1.160: the stockroom side of the centre doorway, looking straight down aisle 3
    // Team B — the checkouts and the front of the store
    b_lane_w:   A(-18.75, 13.5),
    b_lane_c:   A(-5.25, 13.5),
    b_service:  A(19.5, 14),
    b_produce:  A(-20.5, 8.5),
    b_doors:    A(8, 16.4),
    b_endcap:   A(-1.75, 11.2),
    b_deli_s:   A(24.4, 4),         // v1.160: the defend's attack spots near the desk: the deli wall's south end,
    b_frozen_s: A(17.25, 8.5),      //   the freezers' south end
    cluster_north: { pos: P(0, -26), cover: null },
    cluster_south: { pos: P(8, 16), cover: null },
  };
  const playerSpawns = {
    team_b: { pos: P(11, 14.8), yaw: 0.06 },          // inside the doors, looking up the floor past the freezers (yaw 0 faces -z); allies start 2 m either side in z
    team_a: { pos: P(0, -26), yaw: Math.PI },
    desk:   { pos: P(19.5, 13.8), yaw: Math.PI * 0.08 }, // v1.160: the defend, behind the service desk, facing up the east wall; v1.161: inside the counter's L (was (24, 13.5), in the open gap east of it)
  };

  const allObs = [...obstacles];
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: coverList,
    obstacles: allObs,
    enemies: [],
    name: 'Inside Riverside Market', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    indoor: true,
    teamBases: { player: { x: 8, z: 16 }, enemy: { x: 0, z: -26 } },
  };
}
function buildGroceryStoreSceneDefault(_v, tod) { return buildGroceryStoreScene('default', tod); }
