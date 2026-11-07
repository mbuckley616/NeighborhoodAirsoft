
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
// school's grounds, made-up name). A made-up school, per his C on place names.
// v1.453 (D.51, card fable/d51-hollins-ridge; docs/refs/high-school.md; Michael: real scale, 1 C; rebuilt around the
// stadium, the west lot and the gym dome, 6 B; 6 Nov: three areas, A; four portables kept at the lot's north end, A; a
// ram on the mural, A): the whole campus at real size, -z north, the origin in the west lot. A graded plateau, level,
// falling 5 m at the west and south edges to Scott Rd behind a grass bank (and the retaining wall with the mural).
// West to east: the stadium (the track, the turf, the home grandstand with its press box on the east side, the
// aluminium visitor stands, the scoreboard, eight light poles), the west lot (four double rows of cars, tree islands,
// lot lights; the four portables and the blue-roofed building at its north end), the school (brick wings with a tan
// band, flat grey roofs, the white gym dome at its north-west corner), the front entrance on its south-east face (the
// glass hall under its curved metal roof between tan stone piers, the circle drive, the flagpole, guest parking, the
// east lot), the back drive climbing from Scott Rd past the mural wall; the practice field, ball fields and tennis
// courts to the north, woods and houses past them. Each match plays a fenced area about the old map's size (the
// variant): 'front' (After the Bell), 'lot' (The Portables, Hold the Portables), 'stadium' (Friday Night Lights, the
// track and the concourse behind the home stands). Only what stands in the area is solid; everything is baked into one
// mesh per look (bakeMeshesByLook), as Willow Bend.
// =====================================================================
const SCHOOL_AREAS = {   // v1.453
  front:   { minX: 165, maxX: 245, minZ: 68, maxZ: 124 },
  lot:     { minX: -52, maxX: 32, minZ: -78, maxZ: -16 },
  stadium: { minX: -126, maxX: -50, minZ: -40, maxZ: 40 },
};
function schoolGroundY(x, z) {   // v1.453: the plateau is level; the bank falls 5 m to Scott Rd at the west and south
  const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const w = sm((-170 - x) / 12);
  let s;
  if (x >= 7.5 && x <= 112.5 && z > 126) s = 0.9 + 0.1 * sm((z - 127) / 8);   // below the retaining wall (the mural's)
  else s = sm((z - 128) / 12);
  const d = Math.abs(x + 40);                                              // the back drive climbs from the road to the lot
  if (d < 12 && z > 108) { const k = Math.max(0, Math.min(1, (z - 108) / 38)), t = d < 6 ? 1 : 1 - (d - 6) / 6; s = s * (1 - t) + k * t; }
  return -5 * Math.max(w, s);
}
function buildHighSchoolScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  const area = (variant === 'front' || variant === 'stadium') ? variant : 'lot';   // v1.453: 'default' is the lot's
  const bounds = Object.assign({}, SCHOOL_AREAS[area]);
  const { sun } = applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9ec6e6, dayFog: [70, 200],
    sunColor: 0xfff1d8, sunInt: 1.2, sunPos: [24, 40, 16],   // v1.453: 1.2 as the other rebuilt maps (level asphalt read near white at 1.9)
    dayAmbColor: 0xa8b4c8, dayAmbInt: 0.36, dayHemiColor: 0xc4d8f0, dayHemiInt: 0.30,
    nightBg: 0x0a0e16, nightFog: [18, 80], moonPos: [-20, 36, -16],
    shadow: { size: 4096, extent: 52, far: 130 },
  });
  {   // the sun's shadow box over the area, not the origin
    const C = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    sun.position.add(C); sun.target.position.copy(C); scene.add(sun.target);
  }
  const groundY = schoolGroundY;
  const P = (x, z) => new THREE.Vector3(x, groundY(x, z), z);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const flat = (w, d, color, x, z, y = 0.01, mat = null) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat || std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const disc = (r, color, x, z, y, mat = null, r0 = 0) => {
    const m = new THREE.Mesh(r0 > 0 ? new THREE.RingGeometry(r0, r, 48) : new THREE.CircleGeometry(r, 48), mat || std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const mesh = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow) m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  };
  const bx = (mat, x0, x1, y0, y1, z0, z1, shadow = true) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, shadow);
  const obstacles = [], coverList = [], treeObs = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', extra = {}) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY: 0, ...extra }; obstacles.push(o); return o;
  };
  const cover = o => { coverList.push(o); return o; };
  const near = (x, z, m = 12) => x > bounds.minX - m && x < bounds.maxX + m && z > bounds.minZ - m && z < bounds.maxZ + m;
  let _seed = 11;
  const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
  const rng = (a, b) => a + (b - a) * rnd();

  // --- colours (the guide's samples; the flat ones darkened, as on the other rebuilt maps) ---
  const C = { grass: 0x5a6e48, turf: 0x4a7a50, practice: 0x667058, track: 0x9a4c45, apron: 0x1e3f86, asphalt: 0x47484c,
    asphaltN: 0x2a2b2e, conc: 0x9a968c, brick: 0x775042, brickS: 0x6f4334, tan: 0xc8bc9c, roof: 0x8e908d, stone: 0xd6bd98,
    metalRoof: 0x8d95a7, white: 0xe8e8e2, dome: 0xe4e6e2, wallConc: 0xb8ab92, fascia: 0x132f61, rail: 0x5a80aa, seat: 0x3072a8,
    stand: 0x8e8c86, blueRoof: 0x2f5f9a, red: 0xa83a32, clay: 0x9a6a4e, tennis: 0x295694 };
  const white = std(C.white, { roughness: 0.7 }), black = std(0x18181a, { roughness: 0.5, metalness: 0.5 });
  const metal = std(0x9aa0a6, { roughness: 0.45, metalness: 0.5 });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const windMat = new THREE.MeshStandardMaterial({ color: 0x1c3a78, roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const glassMat = std(0x2a3a4c, { roughness: 0.25, metalness: 0.3, emissive: _night ? 0xfff0c8 : 0x0a0f15, emissiveIntensity: _night ? 0.4 : 0.2 });
  const lineMat = std(0xf2f0e8, { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lights = [];   // [x, y, z, intensity, distance], the near ones become real lights at night

  // === THE GROUND: the level plateau, the bank falling to Scott Rd, the road, the houses across it ===
  flat(530, 428, C.grass, 100, -106, 0);                  // the plateau, x -165..365, z -320..108 (the bank's meshes take the rest)
  {
    const strip = (xs, zs) => {   // a height-mapped grid on the given columns and rows
      const pos = [], col = [], idx = [], c = new THREE.Color();
      for (const z of zs) for (const x of xs) {
        const y = groundY(x, z); pos.push(x, y + 0.002, z);
        c.setHex(y > -0.05 ? C.grass : y > -4.6 ? 0x5e7046 : 0x4e5e3c); col.push(c.r, c.g, c.b);
      }
      const nx = xs.length;
      for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < nx - 1; i++) { const a0 = j * nx + i; idx.push(a0, a0 + nx, a0 + 1, a0 + 1, a0 + nx, a0 + nx + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
    };
    const span = (a, b, st) => { const o = []; for (let v = a; v < b - 1e-6; v += st) o.push(v); o.push(b); return o; };
    strip(span(-260, -165, 2.5), span(-330, 210, 5));                        // the west bank and the land past the road
    strip(span(-165, 370, 2.5), [...span(108, 126, 2), ...span(126.5, 130, 0.5), ...span(132, 210, 2)]);   // the south bank, the drive's cut, the wall
    // Scott Rd: round the west and the south, 5 m below the grounds
    const road = std(0x3e3f42, { roughness: 0.95 });
    flat(10, 530, 0, -190, -70, -4.97, road); flat(560, 10, 0, 90, 150, -4.97, road);
    for (const [w, d, x, z] of [[0.15, 530, -190, -70], [560, 0.15, 90, 150]]) flat(w, d, 0, x, z, -4.95, std(0xe8d040));
    // the back drive: two lanes climbing from the road to the lot's south end, between young oaks and pines
    {
      const dm = std(C.asphalt, { roughness: 0.95 });
      for (let z = 104; z < 148; z += 4) {
        const y0 = groundY(-40, z), y1 = groundY(-40, z + 4), L = Math.hypot(4, y1 - y0);
        const s = mesh(new THREE.PlaneGeometry(9, L + 0.05), dm, -40, (y0 + y1) / 2 + 0.03, z + 2, false);
        s.rotation.x = -Math.PI / 2 + Math.atan2(y0 - y1, 4); s.receiveShadow = true;
      }
      for (let z = 112; z < 144; z += 8) for (const x of [-47.5, -32.5]) {
        const pine = rnd() < 0.4;
        addSuburbanTree(scene, x + rng(-0.6, 0.6), z + rng(-1, 1), { shape: pine ? 'pine' : 'round', trunkH: pine ? rng(6, 8) : rng(2.4, 3.2), leafR: pine ? rng(1.6, 2.2) : rng(1.3, 1.8), baseY: groundY(x, z) });
      }
      // the sign at the foot: faculty and buses only
      const sy = groundY(-30, 144);
      bx(black, -30.05, -29.95, sy, sy + 1.6, 143.95, 144.05, false);
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c2 = cv.getContext('2d');
      c2.fillStyle = '#f2f0ea'; c2.fillRect(0, 0, 256, 128); c2.fillStyle = '#1a2a5a'; c2.textAlign = 'center'; c2.font = 'bold 30px Arial';
      c2.fillText('FACULTY', 128, 44); c2.fillText('AND BUSES', 128, 78); c2.font = 'bold 24px Arial'; c2.fillText('ONLY', 128, 110);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      sg.position.set(-30, sy + 1.5, 144.07); scene.add(sg);
    }
    // two-storey houses across the road, woods round the north and east
    const house = (x, z, rot) => {
      const w = rng(11, 15), d = rng(9, 12), h = rng(6, 7.5), y = groundY(x, z);
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std([0xe8e4d8, 0xd8ccb4, 0xc8c0b0, 0xb8c4c8, 0xa89a88][Math.floor(rnd() * 5)])); body.position.y = h / 2; g.add(body);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.6, 3, 4), std(0x3e3c38)); rf.position.y = h + 1.5; rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4); g.add(rf);
    };
    for (let z = -200; z <= 160; z += 24) house(-212 + rng(-3, 3), z, Math.PI / 2);
    for (let x = -180; x <= 300; x += 24) house(x + rng(-3, 3), 172 + rng(-2, 2), 0);
    for (let x = -230; x <= 340; x += 24) house(x + rng(-3, 3), -305 + rng(-3, 3), Math.PI);
    for (let z = -260; z <= 140; z += 24) house(352 + rng(-3, 3), z, -Math.PI / 2);
    const woods = (x0, x1, z0, z1, step) => {
      for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
        const tx = x + rng(-step / 2, step / 2), tz = z + rng(-step / 2, step / 2), pine = rnd() < 0.45;
        addSuburbanTree(scene, tx, tz, { shape: pine ? 'pine' : 'round', trunkH: rng(5, 8), leafR: rng(2.6, 4), baseY: groundY(tx, tz) });
      }
    };
    woods(-250, 330, -285, -245, 9);                      // north, behind the fields
    woods(300, 335, -240, 130, 9);                        // east, past the east lot
    woods(-250, -228, -240, 140, 10);                     // west, past the road, between the houses
    woods(-160, -40, -240, -215, 10);                     // behind the ball fields
  }

  // === THE STADIUM — the track oval x -160..-82, z -86..86; the home stands east, the visitor stands west ===
  {
    const cx = -121, R = 39, r = 29, L = 47;            // the straights run z -47..47; the oval's ends are half circles
    flat(86, 184, C.apron, cx, 0, 0.006);                // the blue apron, x -164..-78, z -92..92
    const oval = rad => {
      const s = new THREE.Shape();
      s.moveTo(cx - rad, -L); s.lineTo(cx - rad, L); s.absarc(cx, L, rad, Math.PI, 0, true); s.lineTo(cx + rad, -L); s.absarc(cx, -L, rad, 0, Math.PI, true);
      return s;
    };
    const ovalPath = rad => {   // a hole is a Path in the opposite winding
      const p = new THREE.Path();
      p.moveTo(cx - rad, -L); p.absarc(cx, -L, rad, Math.PI, 0, false); p.lineTo(cx + rad, L); p.absarc(cx, L, rad, 0, Math.PI, false); p.lineTo(cx - rad, -L);
      return p;
    };
    const ring = oval(R); ring.holes.push(ovalPath(r));
    const trackGeo = new THREE.ShapeGeometry(ring, 24); trackGeo.rotateX(-Math.PI / 2);
    const tr = mesh(trackGeo, std(C.track, { roughness: 1 }), 0, 0.009, 0, false); tr.receiveShadow = true;
    const turfGeo = new THREE.ShapeGeometry(oval(r), 24); turfGeo.rotateX(-Math.PI / 2);
    const tf = mesh(turfGeo, std(C.turf, { roughness: 1 }), 0, 0.01, 0, false); tf.receiveShadow = true;
    // the lane lines on the straights, the field's yard lines, sidelines, black end zones
    for (let k = 1; k < 8; k++) for (const sx of [-1, 1]) flat(0.06, 2 * L, 0, cx + sx * (r + k * 1.25), 0, 0.012, lineMat);
    flat(49, 9.1, 0x1a1a1c, cx, -50.45, 0.012); flat(49, 9.1, 0x1a1a1c, cx, 50.45, 0.012);
    for (const sx of [-1, 1]) flat(0.2, 110, 0, cx + sx * 24.5, 0, 0.014, lineMat);
    for (let k = -10; k <= 10; k++) flat(49, k % 2 ? 0.1 : 0.2, 0, cx, k * 4.572, 0.014, lineMat);
    for (const sz of [-1, 1]) flat(49, 0.2, 0, cx, sz * 55, 0.014, lineMat);
    // our own mark at midfield: a blue ram's-horn ring (no school's letters)
    disc(4.2, 0, cx, 0, 0.015, std(0x1e3f86, { roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 3.0);
    // yellow goalposts at both ends
    const postMat = std(0xe8d040, { roughness: 0.5, metalness: 0.2 });
    for (const gz of [-55, 55]) {
      mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 10), postMat, cx, 1.5, gz);
      bx(postMat, cx - 2.8, cx + 2.8, 2.92, 3.08, gz - 0.08, gz + 0.08);
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 6, 8), postMat, cx + s * 2.8, 6.0, gz);
    }
    // the home grandstand: x -78..-62, z -32..32; a 1.2 m front wall with the dark blue fascia, twenty concrete rows
    // up to 8 m, three sections with blue rails, a block of blue seats high in the middle, the press box on top
    const conc = std(C.stand, { roughness: 0.95 }), rowTop = k => 1.2 + 0.36 * k;
    for (let k = 0; k < 20; k++) {
      const x0 = -78 + 0.8 * k, top = rowTop(k);
      bx(conc, x0, -62, 0, top, -32, 32);
      box(x0, x0 + 0.8, -32, 32, top);
      if (k >= 11 && k <= 17) bx(std(C.seat, { roughness: 0.6 }), x0 + 0.1, x0 + 0.5, top, top + 0.42, -9, 9, false);   // the blue seats
    }
    bx(std(C.fascia), -78.06, -77.98, 0.1, 1.2, -32, 32, false);
    for (const z of [-32, -10.7, 10.7, 32]) {             // the stairs' rails between the sections and at the ends
      for (let k = 0; k < 20; k += 2) bx(std(C.rail, { metalness: 0.4 }), -78 + 0.8 * k, -77.6 + 0.8 * k, rowTop(k), rowTop(k) + 1.0, z - 0.05, z + 0.05, false);
    }
    // the press box: two levels of glass, white trim, on the top rows
    bx(white, -70, -62, 8.04, 12.4, -12.5, 12.5); bx(std(0x6e7378), -70.4, -61.6, 12.4, 12.7, -12.9, 12.9);
    for (const y of [9.6, 11.4]) bx(glassMat, -70.06, -70, y - 0.7, y + 0.7, -12, 12, false);
    box(-70, -62, -12.5, 12.5, 4.4, 'hard', { baseY: 8.04 });
    // the back of the stands: a plain concrete wall, the concession window, the restroom doors, the concourse
    bx(std(0xa8a49a), -62, -61.9, 0, 8.04, -32, 32, false);
    bx(std(0x2a2a2a), -61.9, -61.82, 1.0, 2.2, -3, 3, false);                 // the window's shutter
    bx(std(0xa83a32), -61.9, -60.6, 2.3, 2.5, -3.4, 3.4);                     // its red awning
    { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c2 = cv.getContext('2d');
      c2.fillStyle = '#f2f0ea'; c2.fillRect(0, 0, 256, 64); c2.fillStyle = '#7a1e1e'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.font = 'bold 34px Arial'; c2.fillText('CONCESSIONS', 128, 34);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })); sg.rotation.y = Math.PI / 2; sg.position.set(-61.8, 3.1, 0); scene.add(sg); }
    for (const z of [-20, -16, 16, 20]) bx(std(0x3a5a7a), -61.9, -61.82, 0, 2.2, z - 0.6, z + 0.6, false);
    flat(14, 72, C.conc, -55, 0, 0.012);                   // the concourse, x -62..-48
    // the concourse's cover: trash cans, picnic tables, the ticket booth, the equipment trailer
    for (const [x, z] of [[-58.5, -26], [-58.5, 26], [-53, -8], [-53, 8]]) { mesh(new THREE.CylinderGeometry(0.45, 0.42, 1.0, 12), std(0x2a4a7a), x, 0.5, z); cover(box(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.0, 'metal')); }
    for (const [x, z] of [[-56, -16], [-56, 14]]) {
      bx(std(0x8a6a3a), x - 0.4, x + 0.4, 0.72, 0.78, z - 1.0, z + 1.0); for (const s of [-1, 1]) bx(std(0x8a6a3a), x + s * 0.6 - 0.15, x + s * 0.6 + 0.15, 0.42, 0.47, z - 1.0, z + 1.0);
      cover(box(x - 0.75, x + 0.75, z - 1.0, z + 1.0, 0.78, 'wood'));
    }
    bx(std(0xe8e4d8), -55, -52, 0, 2.6, -31, -28); bx(std(0x1e3f86), -55.2, -51.8, 2.6, 2.8, -31.2, -27.8); cover(box(-55, -52, -31, -28, 2.6));   // the ticket booth
    bx(std(0xd8d8d0, { metalness: 0.3, roughness: 0.5 }), -54, -51.6, 0, 2.4, 25, 31); cover(box(-54, -51.6, 25, 31, 2.4, 'metal'));            // the equipment trailer
    // the team benches on the track in front of the home stands, the water table, the equipment trunks
    for (const z0 of [-16, 5]) {
      bx(metal, -88.4, -87.6, 0.42, 0.5, z0, z0 + 11); for (let z = z0; z <= z0 + 11; z += 2.75) bx(metal, -88.3, -87.7, 0, 0.42, z - 0.05, z + 0.05, false);
      cover(box(-88.4, -87.6, z0, z0 + 11, 0.5, 'metal'));
    }
    for (const [x, z] of [[-90, -2.5], [-90, 2.5], [-97, -24], [-97, 24], [-110, -20], [-108, 14]]) {
      bx(std(0x2a3a5a), x - 0.6, x + 0.6, 0, 1.0, z - 0.9, z + 0.9); cover(box(x - 0.6, x + 0.6, z - 0.9, z + 0.9, 1.0, 'metal'));
    }
    // the tackling sleds on the field's east half
    for (const [sx, sz] of [[-104, -6], [-114, 4]]) {
      bx(std(0x3a3a3a, { metalness: 0.6 }), sx - 0.7, sx + 0.7, 0, 0.12, sz - 1.4, sz + 1.4);
      for (const dz of [-0.8, 0.8]) bx(std(0x7a1e1e), sx - 0.6, sx - 0.1, 0.1, 1.05, sz + dz - 0.45, sz + dz + 0.45);
      cover(box(sx - 0.7, sx + 0.7, sz - 1.4, sz + 1.4, 1.05, 'soft'));
    }
    // the visitor stands: low aluminium, x -172..-162, backing onto the road
    const alu = std(0xc8ccd0, { roughness: 0.45, metalness: 0.15 });
    for (let k = 0; k < 10; k++) bx(alu, -172, -162 - k, 0.45 * k, 0.45 * (k + 1), -33, 33);
    // the scoreboard behind the north goalpost: two black legs, the board, an arched topper (no panels)
    for (const s of [-1, 1]) bx(black, cx + s * 4 - 0.3, cx + s * 4 + 0.3, 0, 6, -99.3, -98.7);
    bx(std(0x14161a), cx - 5, cx + 5, 6, 10.5, -99.4, -98.6);
    { const g = new THREE.TorusGeometry(5, 0.18, 6, 24, Math.PI); const m = mesh(g, metal, cx, 10.5, -99); m.scale.set(1, 0.3, 1); }
    // the chain-link with the blue windscreen round the track, open by the stands' ends (the gates)
    const fenceRun = (axis, at, a0, a1) => {
      const Lr = a1 - a0, mid = (a0 + a1) / 2;
      for (const [mat, y0, y1] of [[chainMat, 0, 2.4], [windMat, 0.05, 1.8]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(Lr, y1 - y0), mat);
        if (axis === 'x') m.position.set(mid, (y0 + y1) / 2, at); else { m.rotation.y = Math.PI / 2; m.position.set(at, (y0 + y1) / 2, mid); }
        scene.add(m);
      }
      for (let p = a0; p <= a1 + 0.01; p += 3) { if (axis === 'x') bx(black, p - 0.04, p + 0.04, 0, 2.45, at - 0.04, at + 0.04, false); else bx(black, at - 0.04, at + 0.04, 0, 2.45, p - 0.04, p + 0.04, false); }
      if (axis === 'x') box(a0, a1, at - 0.25, at + 0.25, 2.4, 'metal', { bbPass: true }); else box(at - 0.25, at + 0.25, a0, a1, 2.4, 'metal', { bbPass: true });
    };
    fenceRun('z', -78, -92, -40); fenceRun('z', -78, 40, 92); fenceRun('z', -164, -92, 92);
    fenceRun('x', -92, -164, -78); fenceRun('x', 92, -164, -78);
    // eight light poles, 28 m, with banks of floodlights: lit for the night match
    const lampMat = std(0xfff6e0, { emissive: _night ? 0xfff2d0 : 0x000000, emissiveIntensity: _night ? 1.0 : 0 });
    for (const [px, pz] of [[-57, -37], [-57, 37], [-80, -80], [-80, 80], [-166, -70], [-166, -24], [-166, 24], [-166, 70]]) {
      mesh(new THREE.CylinderGeometry(0.28, 0.42, 28, 10), std(0x8a9096, { metalness: 0.5 }), px, 14, pz);
      const face = px > cx ? -1 : 1;                     // the lamps face the field
      bx(std(0x5a6066, { metalness: 0.5 }), px - 0.3, px + 0.3, 26, 29.6, pz - 2.8, pz + 2.8);
      bx(lampMat, px + face * 0.32 - 0.04, px + face * 0.32 + 0.04, 26.2, 29.4, pz - 2.6, pz + 2.6, false);
      box(px - 0.42, px + 0.42, pz - 0.42, pz + 0.42, 28, 'metal');
    }
    if (_night) for (const [x, z] of [[-100, -26], [-100, 26], [-118, 0], [-80, 0]]) lights.push([x, 22, z, 0.5, 85]);
  }

  // === THE WEST LOT — x -50..26.5, z -49..60: four double rows of stalls running north-south, tree islands ===
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x6e7478, 0x3a5a3a, 0xb09a6a, 0x9a2a2a, 0x2a3e6a, 0xc8c8c4];
  const carObsList = [];
  const parkCar = (x, z, orient, inArea) => {
    const color = CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
    if (!inArea) {   // scenery: a plain body and cabin
      const cs = std(color, { roughness: 0.45, metalness: 0.35 }), along = Math.abs(Math.cos(orient)) > 0.5, hx = along ? 2.2 : 0.85, hz = along ? 0.85 : 2.2;
      bx(cs, x - hx, x + hx, 0.3, 1.0, z - hz, z + hz); bx(cs, x - hx * (along ? 0.55 : 0.92), x + hx * (along ? 0.45 : 0.92), 1.0, 1.45, z - hz * (along ? 0.92 : 0.55), z + hz * (along ? 0.92 : 0.45));
      return;
    }
    const carObs = addCar(scene, x, z, { orientation: orient + (rnd() - 0.5) * 0.06, color, detail: true });
    carObs.mesh.position.y += carSeatY(carObs, groundY);
    resolveObox(carObs); resolveObox(carObs._stacked);
    pushCarObs(obstacles, carObs); cover(carObs); carObsList.push(carObs);
  };
  const lotLight = (x, z) => {
    bx(std(0x8a9096, { metalness: 0.5 }), x - 0.12, x + 0.12, 0.15, 10, z - 0.12, z + 0.12);
    bx(std(0xfff4d8, { emissive: _night ? 0xffe8b0 : 0, emissiveIntensity: _night ? 1 : 0 }), x - 0.5, x + 0.5, 9.7, 10, z - 0.3, z + 0.3, false);
    box(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 10, 'metal');
    if (_night && near(x, z, 4)) lights.push([x, 9.6, z, 1.2, 26]);
  };
  const island = (x0, x1, z0, z1, tree) => {   // a curbed grass island, a small tree
    bx(std(0xb8b4aa), x0, x1, 0, 0.15, z0, z1); flat(x1 - x0 - 0.3, z1 - z0 - 0.3, 0x5a7a3e, (x0 + x1) / 2, (z0 + z1) / 2, 0.16);
    if (tree) treeObs.push(addSuburbanTree(scene, (x0 + x1) / 2 + rng(-1, 1), (z0 + z1) / 2, { trunkH: 2.4, leafR: rng(1.4, 1.9), detail: near((x0 + x1) / 2, (z0 + z1) / 2, 30) }));
  };
  {
    const asph = std(_night ? C.asphaltN : C.asphalt, { roughness: 1.0 });
    flat(77, 120, 0, -12, 3, 0.008, asph);                 // the lot, x -50.5..26.5, z -57..63
    flat(110, 9, 0, 0, -84, 0.008, asph);                  // the service road along the north
    flat(9, 70, 0, -46, 27, 0.009, asph);                  // the fire lane behind the home stands
    const ROWS = [-38, -20.5, -3, 14.5];                   // each double row's centre line (11 m: two stalls nose to nose)
    for (const rx of ROWS) {
      for (let z = -45.6; z <= 56.5; z += 2.7) {
        for (const [x, o] of [[rx - 2.75, 0], [rx + 2.75, Math.PI]]) {
          flat(5.2, 0.12, 0, x, z, 0.014, lineMat);
          if (z > 56) continue;
          if (rnd() < (near(x, z + 1.35, 0) ? 0.45 : 0.3)) continue;
          parkCar(x, z + 1.35, o, near(x, z + 1.35, 1));
        }
      }
      island(rx - 5.5, rx + 5.5, -49, -46.2, true); island(rx - 5.5, rx + 5.5, 57.2, 60, true);
      island(rx - 0.8, rx + 0.8, 4.5, 9.9, false);
      lotLight(rx, -47.6); lotLight(rx, 58.6); lotLight(rx, 7.2);
    }
    // the walk along the lot's east side, the dome's lawn
    flat(3, 120, C.conc, 28.5, 3, 0.012);
    for (const z of [-40, -20, 10, 40]) treeObs.push(addSuburbanTree(scene, 30.5, z, { trunkH: 3, leafR: 2.0, detail: near(30.5, z, 20) }));
  }

  // === THE PORTABLES — four trailer classrooms in a row at the lot's north end (a made-up annex: Michael's A) ===
  const PORTABLE_X = [-26, -11.5, 3, 17.5], PORTABLE_Z = -62;
  {
    const sideMat = std(0xd8ccb0), trimMat = std(0x7a5a3a), skirtMat = std(0x6e6a62), roofMat = std(0x9a9890, { roughness: 0.6, metalness: 0.3 });
    const winMat = std(0x2a3a4c, { roughness: 0.3, metalness: 0.2, emissive: _night ? 0xffe8b8 : 0x000000, emissiveIntensity: _night ? 0.35 : 0 });
    const doorMat = std(0x8a3a2a), deckMat = std(0x8a7a5a);
    flat(60, 16, 0x7a7a70, -4.25, PORTABLE_Z, 0.007);      // the gravel pad they stand on
    let n = 0;
    for (const px of PORTABLE_X) {
      const pz = PORTABLE_Z; n++;
      bx(skirtMat, px - 5.5, px + 5.5, 0, 0.6, pz - 3.5, pz + 3.5);
      bx(sideMat, px - 5.5, px + 5.5, 0.6, 3.5, pz - 3.5, pz + 3.5);
      bx(roofMat, px - 5.65, px + 5.65, 3.5, 3.68, pz - 3.65, pz + 3.65);
      bx(trimMat, px - 5.53, px + 5.53, 3.39, 3.51, pz - 3.53, pz + 3.53, false);
      bx(std(0xb8b4aa), px + 5.5, px + 6.1, 1.55, 2.45, pz - 2.1, pz - 1.1);             // the AC unit on the east end
      for (const wx of [-3.6, 0.2]) for (const s of [-1, 1]) bx(winMat, px + wx - 0.8, px + wx + 0.8, 1.8, 2.8, pz + s * 3.52 - 0.04, pz + s * 3.52 + 0.04, false);
      bx(doorMat, px + 2.7, px + 3.7, 0.6, 2.7, pz + 3.49, pz + 3.57, false);
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      const c2 = cv.getContext('2d'); c2.fillStyle = '#f4efe2'; c2.fillRect(0, 0, 64, 64);
      c2.fillStyle = '#2a2520'; c2.font = 'bold 34px Georgia'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('P' + n, 32, 34);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      tag.position.set(px + 4.2, 2.4, pz + 3.56); scene.add(tag);
      // the wooden landing and steps on the lot side (you can step up on it; kids walk round)
      bx(deckMat, px + 2.3, px + 4.1, 0, 0.6, pz + 3.5, pz + 4.8);
      bx(deckMat, px + 2.3, px + 4.1, 0, 0.3, pz + 4.8, pz + 5.3);
      cover(box(px - 5.5, px + 5.5, pz - 3.5, pz + 3.5, 3.6));
      box(px + 2.3, px + 4.1, pz + 3.5, pz + 4.8, 0.6, 'wood');
    }
    // the blue-roofed building at the lot's north-west corner (17 x 29 m), its doors facing the portables
    bx(std(0xd0c8b4), -54, -37, 0, 6, -92, -63); bx(std(C.blueRoof, { roughness: 0.6, metalness: 0.3 }), -54.6, -36.4, 6, 6.4, -92.6, -62.4);
    for (const z of [-86, -78, -70]) bx(std(0x3a4a5a), -36.98, -36.92, 0, 2.6, z - 1.2, z + 1.2, false);
    bx(std(0x6a6a66), -50, -41, 0.2, 3.6, -62.98, -62.92, false);              // the roll-up door
    cover(box(-54, -37, -92, -63, 6));
    // a dumpster and a picnic table by the portables
    bx(std(0x2c5a3a, { metalness: 0.3 }), -42, -39.8, 0, 1.5, -61, -59.4); cover(box(-42, -39.8, -61, -59.4, 1.5, 'metal'));
    for (const [tx, tz] of [[25.5, -66], [-4.2, -70]]) {
      bx(std(0x8a6a3a), tx - 0.9, tx + 0.9, 0.72, 0.8, tz - 0.4, tz + 0.4); for (const s of [-1, 1]) bx(std(0x8a6a3a), tx - 0.9, tx + 0.9, 0.42, 0.48, tz + s * 0.6 - 0.15, tz + s * 0.6 + 0.15);
      cover(box(tx - 0.9, tx + 0.9, tz - 0.75, tz + 0.75, 0.8, 'wood'));
    }
  }

  // === THE SCHOOL — brick wings with a tan band, flat grey roofs, the white gym dome at its north-west corner ===
  {
    const brick = std(C.brick, { roughness: 0.95 }), tan = std(C.tan, { roughness: 0.9 }), roof = std(C.roof, { roughness: 0.95 });
    const wing = (x0, x1, z0, z1, h, band = false) => {
      bx(brick, x0, x1, 0, h, z0, z1);
      if (band) { bx(tan, x0 - 0.05, x1 + 0.05, h - 2.6, h - 0.4, z0 - 0.05, z1 + 0.05, false); }
      bx(std(0xd8d0c0), x0 - 0.2, x1 + 0.2, h - 0.4, h, z0 - 0.2, z1 + 0.2, false);    // the cream coping
      bx(roof, x0, x1, h, h + 0.08, z0, z1, false);
      for (let k = 0; k < Math.max(1, Math.floor((x1 - x0) * (z1 - z0) / 1400)); k++) {   // rooftop units
        const ux = rng(x0 + 4, x1 - 4), uz = rng(z0 + 4, z1 - 4); bx(std(0xb8bab6), ux - 1.4, ux + 1.4, h, h + 1.6, uz - 1, uz + 1);
      }
      box(x0, x1, z0, z1, h);
      // narrow windows on the faces the areas see (west and south), lit at night
      for (const [axis, at, a0, a1, s] of [['z', x0, z0, z1, -1], ['x', z1, x0, x1, 1]]) {
        for (let p = a0 + 4; p <= a1 - 4; p += 6) for (const y of h > 7 ? [2.2, 5.6] : [2.2]) {
          if (axis === 'z') bx(glassMat, at + s * 0.06 - 0.03, at + s * 0.06 + 0.03, y - 0.8, y + 0.8, p - 0.6, p + 0.6, false);
          else bx(glassMat, p - 0.6, p + 0.6, y - 0.8, y + 0.8, at + s * 0.06 - 0.03, at + s * 0.06 + 0.03, false);
        }
      }
    };
    wing(76, 130, -100, -10, 9, true);                     // the gym wing behind the dome
    wing(40, 130, 0, 95, 7);                               // the classroom wings over the bank (the mural's wall below)
    wing(130, 262, -110, 70, 8, true);                     // the main block, its south-east face the front
    wing(210, 236, 40, 70, 11);                            // the taller white block right of the entrance
    bx(std(0xc6cac4), 209.9, 236.1, 0, 11.02, 39.9, 70.1); bx(std(0xe8dcc0), 209.8, 236.2, 8.2, 8.8, 39.8, 70.2, false);
    bx(brick, 40, 76, 0, 4.5, -10, 0); box(40, 76, -10, 0, 4.5);   // the link between the dome and the wings
    // the gym dome: white with grey seams, 42 m across, 13 m high, centre (55, -50)
    const dg = new THREE.SphereGeometry(21, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dm = mesh(dg, std(C.dome, { roughness: 0.6 }), 55, 0, -50); dm.scale.set(1, 13 / 21, 1);
    for (let k = 0; k < 12; k++) {   // the seams
      const a = k * Math.PI / 6, sg = new THREE.TorusGeometry(21.02, 0.06, 4, 24, Math.PI);
      const sm = mesh(sg, std(0x9a9ca0), 55, 0, -50, false); sm.rotation.y = a; sm.scale.set(1, 13 / 21, 1);
    }
    bx(std(0xc8ccd0), 33.6, 34.4, 0, 3, -53, -47, false);  // the dome's doors
    obstacles.push({ shape: 'cylinder', cx: 55, cz: -50, radius: 21, minX: 34, maxX: 76, minZ: -71, maxZ: -29, h: 13, surface: 'hard', baseY: 0 });
  }

  // === THE FRONT ENTRANCE — the glass hall under its curved roof, the stone piers, the circle drive, the lots ===
  {
    const fz = 70, ex = 200;                               // the main block's south-east face, the entrance's centre
    // the glass hall, 14 m wide and 9.5 m tall, standing 6 m proud of the face
    bx(std(0x2a3440, { roughness: 0.2, metalness: 0.35, emissive: _night ? 0xfff0c8 : 0x0a0f15, emissiveIntensity: _night ? 0.5 : 0.25 }), ex - 7, ex + 7, 0, 9.5, fz, fz + 6);
    for (let x = ex - 7; x <= ex + 7.01; x += 2) bx(std(0xd8dcd8), x - 0.06, x + 0.06, 0, 9.5, fz + 6, fz + 6.1, false);
    for (const y of [3.2, 6.4]) bx(std(0xd8dcd8), ex - 7, ex + 7, y - 0.06, y + 0.06, fz + 6, fz + 6.1, false);
    bx(std(0x1a2028), ex - 2, ex + 2, 0, 2.6, fz + 6.05, fz + 6.15, false);   // the double doors
    box(ex - 7, ex + 7, fz, fz + 6, 9.5);
    // the curved, standing-seam roof: a shallow barrel overhanging the front
    const rg = new THREE.CylinderGeometry(13, 13, 9, 24, 1, true, -0.62, 1.24); rg.rotateX(-Math.PI / 2);   // the arc on top, the barrel's axis front to back
    mesh(rg, std(C.metalRoof, { roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }), ex, 9.6 - 13 * Math.cos(0.62), fz + 3.5);
    // the two tan stone piers
    for (const s of [-1, 1]) { bx(std(C.stone, { roughness: 0.95 }), ex + s * 8.6 - 1.6, ex + s * 8.6 + 1.6, 0, 11, fz, fz + 6.5); box(ex + s * 8.6 - 1.6, ex + s * 8.6 + 1.6, fz, fz + 6.5, 11); }
    // the name over the doors (a made-up school)
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const c2 = cv.getContext('2d');
      c2.fillStyle = '#e8e2d2'; c2.fillRect(0, 0, 512, 64); c2.fillStyle = '#1e2c52'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      fitSignText(c2, 'HOLLINS RIDGE HIGH', 256, 34, 40, 'Georgia', 512 - 40);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
      sg.position.set(ex, 7.8, fz + 6.2); scene.add(sg); }
    // the walk along the face, the lamps and the blue sign posts, red maples
    flat(130, 5, C.conc, 196, fz + 2.5, 0.012);
    flat(14, 8, C.conc, ex, fz + 9, 0.012);
    // the circle drive: 31 m across, the lane 7 m, red-painted fire-lane kerbs round the 15 m grass island and its flagpole
    const cz = 96;
    disc(15.5, 0, ex, cz, 0.009, std(_night ? C.asphaltN : C.asphalt, { roughness: 1 }));
    disc(8.0, 0, ex, cz, 0.15, std(0xb8423a, { roughness: 0.9 })); disc(7.6, 0x5a7a3e, ex, cz, 0.16);
    mesh(new THREE.CylinderGeometry(8, 8, 0.15, 32), std(0xb8423a), ex, 0.075, cz);
    mesh(new THREE.CylinderGeometry(0.08, 0.11, 12, 8), metal, ex, 6, cz);
    obstacles.push({ shape: 'cylinder', cx: ex, cz, radius: 0.15, minX: ex - 0.15, maxX: ex + 0.15, minZ: cz - 0.15, maxZ: cz + 0.15, h: 12, surface: 'metal', baseY: 0 });
    bx(std(0x2a4a9a), ex + 0.1, ex + 2.1, 10.6, 11.8, cz - 0.02, cz + 0.02, false); bx(std(0xa83a32), ex + 0.1, ex + 1.9, 9.2, 10.3, cz - 0.02, cz + 0.02, false);
    for (const [x, z] of [[ex - 4, cz - 3], [ex + 3, cz + 4]]) treeObs.push(addSuburbanTree(scene, x, z, { trunkH: 2.6, leafR: 1.8, leafColor: 0x8a3a2a, detail: true }));
    // the drives: out to the road, and west to guest parking
    const asph = std(_night ? C.asphaltN : C.asphalt, { roughness: 1.0 });
    flat(8, 30, 0, ex, 123, 0.008, asph);
    flat(30, 7, 0, ex - 25, cz, 0.008, asph);
    // guest parking, x 140..186, z 82..124: east-west rows, cars nose to nose
    flat(46, 42, 0, 163, 103, 0.008, asph);
    for (const rz of [92, 112]) for (let x = 142.5; x <= 184; x += 2.7) for (const [z, o] of [[rz - 2.75, Math.PI / 2], [rz + 2.75, -Math.PI / 2]]) {
      flat(0.12, 5.2, 0, x - 1.35, z, 0.014, lineMat);
      if (rnd() < 0.5) continue;
      parkCar(x, z, o, near(x, z, 1));
    }
    for (const rz of [92, 112]) island(184.5, 187.5, rz - 5.5, rz + 5.5, true);
    // the east lot: north-south double rows east of the circle, buses along its far side
    flat(120, 58, 0, 275, 102, 0.008, asph);
    for (const rx of [227, 245, 263, 281, 299, 317]) {
      for (let z = 76.5; z <= 126; z += 2.7) for (const [x, o] of [[rx - 2.75, 0], [rx + 2.75, Math.PI]]) {
        flat(5.2, 0.12, 0, x, z, 0.014, lineMat);
        if (z > 123) continue;
        if (rnd() < (near(x, z, 0) ? 0.35 : 0.3)) continue;
        parkCar(x, z + 1.35, o, near(x, z + 1.35, 1));
      }
      island(rx - 5.5, rx + 5.5, 73.2, 76, true);
    }
    for (let k = 0; k < 6; k++) {   // the yellow buses along the east side
      const bz = 80 + k * 7.5; bx(std(0xe8b020, { roughness: 0.6 }), 326, 338, 0.4, 3.2, bz - 1.25, bz + 1.25); bx(std(0x1a1a1a), 326.2, 337.8, 1.9, 2.6, bz - 1.28, bz + 1.28, false);
    }
    for (const [x, z] of [[184, 76], [216, 76], [227, 74.6], [186, 128]]) lotLight(x, z);
    for (const x of [176, 222]) { bx(std(0x1e3f86), x - 0.05, x + 0.05, 0, 2.2, 74.6, 74.7, false); bx(std(0x1e3f86), x - 0.4, x + 0.4, 1.7, 2.3, 74.66, 74.7, false); }
    for (const [x, z] of [[184, 77.5], [216, 77.5]]) treeObs.push(addSuburbanTree(scene, x + 3, z, { trunkH: 2.8, leafR: 2.0, leafColor: 0x8a3a2a, detail: near(x, z, 10) }));
    // a bench on the walk either side of the hall
    for (const x of [188, 212]) { bx(std(0x5a4a3a), x - 1.0, x + 1.0, 0.42, 0.5, 72.6, 73.2); cover(box(x - 1.0, x + 1.0, 72.6, 73.2, 0.5, 'wood')); }
  }

  // === THE MURAL WALL — the retaining wall along Scott Rd below the classroom wings, our own mural facing the road ===
  {
    const wz = 126.5, y0 = groundY(30, 130);
    bx(std(C.wallConc, { roughness: 0.97 }), 8, 112, y0, 0.3, wz - 0.4, wz + 0.4);
    for (let x = 8; x <= 112; x += 3) bx(black, x - 0.03, x + 0.03, 0.3, 1.8, wz - 0.03, wz + 0.03, false);
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(104, 1.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })); m.position.set(60, 1.05, wz); scene.add(m); }
    // the mural: chrome block letters on a white and blue splash, HOLLINS RIDGE above, a ram's head beside them
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const c = cv.getContext('2d');
    c.fillStyle = '#b8ab92'; c.fillRect(0, 0, 1024, 256);
    const splash = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.16) { const rr = r * (0.7 + 0.45 * Math.abs(Math.sin(a * 5.3 + x))); c.lineTo(x + Math.cos(a) * rr * 1.8, y + Math.sin(a) * rr); } c.fill(); };
    for (let k = 0; k < 9; k++) splash(170 + k * 90, 150 + (k % 2 ? -10 : 12), 70, k % 2 ? '#b8c8dc' : '#e8ecf0');
    // the ram's head (our mascot): a white and steel-blue head, curled horns
    c.lineWidth = 6; c.strokeStyle = '#141a20';
    c.fillStyle = '#c8d4e2'; c.beginPath(); c.ellipse(110, 150, 46, 62, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#4f6a92'; c.beginPath(); c.ellipse(110, 196, 26, 22, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    for (const s of [-1, 1]) {
      c.fillStyle = '#8a7a5a'; c.beginPath(); c.arc(110 + s * 58, 110, 34, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#b8a47a'; c.beginPath(); c.arc(110 + s * 58, 110, 18, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#141a20'; c.beginPath(); c.arc(110 + s * 18, 140, 6, 0, Math.PI * 2); c.fill();
    }
    // RIDGE: chunky staggered letters, a chrome gradient over a hard horizon, dark extruded sides, near-black outline
    c.font = 'bold 150px Impact, Arial Black, sans-serif'; c.textBaseline = 'alphabetic';
    const word = 'RIDGE'; let x = 220;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i], w = c.measureText(ch).width, y = 228 + (i % 2 ? -12 : 6);
      c.fillStyle = '#1c2836'; c.fillText(ch, x + 10, y + 8);
      const gr = c.createLinearGradient(0, y - 120, 0, y);
      gr.addColorStop(0, '#c8d4e2'); gr.addColorStop(0.3, '#8aa4c4'); gr.addColorStop(0.52, '#4f6a92'); gr.addColorStop(0.53, '#1c2836'); gr.addColorStop(1, '#2c3c56');
      c.fillStyle = gr; c.fillText(ch, x, y); c.lineWidth = 5; c.strokeStyle = '#141a20'; c.strokeText(ch, x, y);
      c.fillStyle = '#ffffff'; c.fillRect(x + w * 0.25, y - 92, 8, 4);
      x += w + 18;
    }
    c.font = 'bold 44px Georgia, serif'; c.fillStyle = '#141a20'; c.textAlign = 'left'; c.fillText('HOLLINS RIDGE', 470, 62);
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.95 }));
    mural.rotation.y = 0; mural.position.set(22, y0 + 2.4, wz + 0.42); scene.add(mural);
    mural.userData.noBake = true;
  }

  // === PAST THE AREAS, NORTH: the practice field, the ball fields, the tennis courts ===
  {
    flat(49, 107, C.practice, 84.5, -176.5, 0.006);
    for (let k = 0; k <= 10; k++) flat(49, 0.15, 0, 84.5, -176.5 - 45.7 + k * 9.14, 0.012, lineMat);
    for (const s of [-1, 1]) flat(0.2, 107, 0, 84.5 + s * 24.5, -176.5, 0.012, lineMat);
    for (const gz of [-228, -125]) { bx(white, 82, 87, 0, 1.8, gz - 0.05, gz + 0.05, false); }
    // the baseball field: the red-brown infield, the grass, the dark outfield fence, a press box and a batting cage
    { const hx = -30, hz = -122;
      const fan = new THREE.CircleGeometry(100, 32, Math.PI * 0.25, Math.PI / 2); fan.rotateX(-Math.PI / 2);
      mesh(fan, std(0x5e7a48, { roughness: 1 }), hx, 0.006, hz, false);
      const inf = new THREE.CircleGeometry(40, 24, Math.PI * 0.25, Math.PI / 2); inf.rotateX(-Math.PI / 2);
      mesh(inf, std(C.clay, { roughness: 1 }), hx, 0.008, hz, false);
      disc(14, 0x5e7a48, hx, hz - 19, 0.02);
      for (let a = Math.PI * 0.25; a <= Math.PI * 0.75 + 0.01; a += Math.PI / 24) {
        const x = hx + Math.cos(a) * 100, z = hz - Math.sin(a) * 100;
        bx(std(0x1e2a24), x - 2.2, x + 2.2, 0, 3, z - 0.1, z + 0.1);
      }
      bx(std(0x6a6a66), hx + 20, hx + 50, 0, 3.5, hz - 4, hz + 4);
      const net = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 20), new THREE.MeshStandardMaterial({ color: 0x2a5a2a, transparent: true, opacity: 0.45, depthWrite: false }));
      net.position.set(hx + 60, 1.75, hz - 20); scene.add(net);
    }
    // four tennis courts in a 2 x 2 block, blue inside a green surround
    flat(29, 66, 0x3c6a48, 134.5, -170, 0.007);
    for (const [x, z] of [[128, -186], [141, -186], [128, -154], [141, -154]]) flat(10.97, 23.77, C.tennis, x, z, 0.009);
    // light poles round the practice field, a walk from the school
    for (const [x, z] of [[58, -150], [58, -200], [111, -150], [111, -200]]) bx(std(0x8a9096), x - 0.2, x + 0.2, 0, 18, z - 0.2, z + 0.2);
    flat(4, 20, C.conc, 90, -115, 0.012);
  }

  // === THE AREA'S EDGE: nothing past it is solid; a low post line marks the open sides ===
  const edgeH = 6, B = bounds;
  const edge = [
    { minX: B.minX - 20, maxX: B.minX - 0.01, minZ: B.minZ - 20, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.maxX + 0.01, maxX: B.maxX + 20, minZ: B.minZ - 20, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.minX - 20, maxX: B.maxX + 20, minZ: B.minZ - 20, maxZ: B.minZ - 0.01, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.minX - 20, maxX: B.maxX + 20, minZ: B.maxZ + 0.01, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
  ];
  {
    const postMat = std(0xf2f0ea), chainY = 0.55;
    const solidAt = (x, z) => obstacles.some(o => o.h > 2 && x > o.minX - 0.3 && x < o.maxX + 0.3 && z > o.minZ - 0.3 && z < o.maxZ + 0.3);
    for (let z = B.minZ; z <= B.maxZ; z += 3) for (const x of [B.minX - 0.35, B.maxX + 0.35]) if (!solidAt(x, z)) bx(postMat, x - 0.05, x + 0.05, 0, chainY, z - 0.05, z + 0.05, false);
    for (let x = B.minX; x <= B.maxX; x += 3) for (const z of [B.minZ - 0.35, B.maxZ + 0.35]) if (!solidAt(x, z)) bx(postMat, x - 0.05, x + 0.05, 0, chainY, z - 0.05, z + 0.05, false);
  }
  for (const [x, y, z, inten, dist] of lights.filter(l => near(l[0], l[2], 30)).slice(0, 7)) { const L = new THREE.PointLight(0xffe8c0, inten, dist, 1.1); L.position.set(x, y, z); scene.add(L); }

  // only what stands in the area (or straddles its edge) is solid or cover
  const inArea = o => o.maxX > B.minX - 1 && o.minX < B.maxX + 1 && o.maxZ > B.minZ - 1 && o.minZ < B.maxZ + 1;
  const solid = [...obstacles, ...treeObs].filter(inArea);
  const covers = coverList.filter(o => (o.minX + o.maxX) / 2 > B.minX && (o.minX + o.maxX) / 2 < B.maxX && (o.minZ + o.maxZ) / 2 > B.minZ && (o.minZ + o.maxZ) / 2 < B.maxZ);

  // everything static baked into one mesh per look
  {
    scene.updateMatrixWorld(true);
    const meshes = [];
    scene.traverse(m => {
      if (!m.isMesh || m.userData.noBake || !m.geometry || !m.geometry.attributes.position) return;
      const M = m.material; if (!M || Array.isArray(M) || M.blending === THREE.AdditiveBlending || M.fog === false) return;
      for (let p = m.parent; p; p = p.parent) if (p.userData && p.userData.noBake) return;
      meshes.push(m);
    });
    scene.add(bakeMeshesByLook(meshes, 'schoolBaked'));
  }

  // === ANCHORS & SPAWNS ===
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of covers) { const d = Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z); if (d < bd) { bd = d; best = c; } }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  let placements, playerSpawns, teamBases;
  if (area === 'front') {
    // After the Bell: you come out of the doors; Jordan waits among the east lot's cars
    placements = {
      a_lot:     A(232, 106),
      a_lot_n:   A(236, 84),
      a_guest:   A(178, 104),
      b_doors:   A(192, 79),
      b_walk:    A(208, 79),
      cluster_north: { pos: P(232, 100), cover: null },
      cluster_south: { pos: P(200, 80), cover: null },
    };
    playerSpawns = {
      team_b: { pos: P(200, 79.5), yaw: -Math.PI * 0.72 },   // on the walk at the doors, looking south-east over the circle at the east lot (yaw 0 faces -z)
      team_a: { pos: P(232, 100), yaw: -Math.PI / 2 },
    };
    teamBases = { player: { x: 200, z: 79.5 }, enemy: { x: 232, z: 100 } };
  } else if (area === 'stadium') {
    // Friday Night Lights: your side in the concourse behind the home stands, theirs on the lit field
    placements = {
      st_north:  A(-95, -30),
      st_mid:    A(-97, 0),
      st_south:  A(-95, 30),
      st_rifle:  A(-112, -20),
      b_gate_n:  A(-64, -35),
      b_gate_s:  A(-64, 35),
      b_booth:   A(-50.8, -29.5),
      b_trailer: A(-50.6, 28),
      cluster_north: { pos: P(-114, 0), cover: null },
      cluster_south: { pos: P(-55, 0), cover: null },
    };
    playerSpawns = {
      team_b: { pos: P(-53, 0), yaw: Math.PI / 2 },
      stand: { pos: P(-53, 0), yaw: Math.PI / 2 },     // the concourse at the concession window, facing the stands (their side past them, west)
      team_a: { pos: P(-114, 0), yaw: -Math.PI / 2 },
    };
    teamBases = { player: { x: -53, z: 0 }, enemy: { x: -114, z: 0 } };
  } else {
    // The Portables and Hold the Portables: their side at the portables, yours from the lot's south
    placements = {
      a_port_e:  A(17.5, -55.5),
      a_port_w:  A(-26, -55.5),
      a_shed:    A(-35.5, -70),
      a_cars_e:  A(23.25, -44),
      a_cars_w:  A(-29.25, -44),
      b_cars_w:  A(-29.25, -19),
      b_cars_e:  A(23.25, -19),
      b_aisle:   A(5.75, -18),
      // Hold the Portables: you in the gap between the middle two, your crew's posts round the row
      hp_gap_w:  A(-18.75, -61),
      hp_gap_e:  A(10.25, -61),
      hp_end_w:  A(-34.25, -61),
      hp_end_e:  A(26.5, -60),
      hp_back:   A(-4.25, -67.8),
      // and where the attackers make for: round the west end, straight up the middle aisle, round the east end
      hp_att_w:  A(-31, -50),
      hp_att_c:  A(-6, -50),
      hp_att_e:  A(24, -51),
      cluster_north: { pos: P(-11.5, -71), cover: null },   // behind P2's body: no line down the middle aisle through a gap
      cluster_south: { pos: P(-11.75, -20), cover: null },
      cluster_field: { pos: P(-11.75, -20), cover: null },
    };
    playerSpawns = {
      team_b: { pos: P(-11.75, -20), yaw: 0 },       // the aisle at the lot's south, looking up it at the portables
      portables: { pos: P(-4.25, -61), yaw: Math.PI }, // the gap between the middle two portables, facing the lot (south)
      team_a: { pos: P(-11.5, -71), yaw: Math.PI },
    };
    teamBases = { player: { x: -11.75, z: -20 }, enemy: { x: -11.5, z: -71 } };
  }
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: covers,
    obstacles: [...solid, ...edge],
    enemies: [],
    name: 'Hollins Ridge High', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    teamBases,
    fieldAdvance: true,   // v1.453: kids walk round the portables, the stands and the cars by the field (js/80-ai.js)
    viewFar: 320,
    schoolArea: area,
  };
}
function buildHighSchoolSceneDefault(_v, tod) { return buildHighSchoolScene('default', tod); }

// =====================================================================
// v1.157: WILLOW BEND COUNTRY CLUB (Horseshoe Bend) — the seventh zone (backlog D.1, Michael: A, control room 4 Oct).
// v1.445 (D.51, card fable/d51-willow-bend; docs/refs/country-club.md; Michael: real scale, 1 C; the swim and tennis
// centre on the river's bend, 3 B; the beach and the rope swing seen past the edge, 4 A; golfers in carts as scenery,
// 5 A; 5 Nov: two areas, A; the gazebo becomes a roofed bench shelter between the clay courts, C; one lap of the real
// loop, A): the whole centre at real size, -z north, the river past the west edge. The fenced pool compound
// (x 0..45, z -45..45: brown privacy fence on tan stone piers, the pool clubhouse with its white two-storey porch, the
// L-shaped lap pool and its diving well, the free-form pool, the splash pool and its play tower, loungers, red
// umbrellas, cabanas); the pickleball courts west of it; the lot and the roundabout east; two blocks of clay courts
// further west, the blue hard courts north-west, the cart yard and barn north of the courts; the cart path, the fairway
// falling to the wooded bank, the river beach of fine brownish-black sand, the rope swing, the river and the far bank.
// Each match plays a fenced area about the old club's size (the variant): 'pool' (Pool's Closed, Night Swim: the
// compound's north half, the pickleball courts and the lawn) or 'course' / 'ride' (The Eighteenth, Hold the Shelter,
// Cart Path Only: the west clay block, the cart path, the fairway, the cart yard). Only what stands in the area is solid;
// everything is baked into one mesh per look (bakeMeshesByLook), so the whole place costs a few dozen draw calls.
// =====================================================================
const CLUB_AREAS = {   // v1.445
  pool:   { minX: -23.3, maxX: 45.3, minZ: -45.3, maxZ: 10 },
  course: { minX: -104, maxX: -23, minZ: -84, maxZ: 2 },
};
function clubGroundY(x, z) {   // v1.445: the centre is graded level; the fairway falls to the wooded bank, the river, the far bank
  if (x >= -100) return 0;
  const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  if (x >= -112) return -0.8 * sm((-100 - x) / 12);
  if (x >= -136) return -0.8 - 2.6 * sm((-112 - x) / 24);
  if (x >= -142) return -3.4 - 0.4 * ((-136 - x) / 6);
  if (x >= -200) return -3.8 - 1.6 * Math.sin(Math.PI * (-142 - x) / 58);
  return -3.8 + 36 * sm((-200 - x) / 70) + 2.5 * Math.sin(z * 0.045) * sm((-200 - x) / 20);
}
function buildCountryClubScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  const area = (variant === 'course' || variant === 'ride') ? 'course' : 'pool';   // v1.445: 'default' is the pool's
  const bounds = Object.assign({}, CLUB_AREAS[area]);
  const { sun } = applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0xa4cbe8, dayFog: [70, 190],
    sunColor: 0xfff3dc, sunInt: 1.2, sunPos: [-22, 42, 18],   // v1.445: as the other rebuilt maps (was 1.95: the flat centre read near white)
    dayAmbColor: 0xa8b8c4, dayAmbInt: 0.36, dayHemiColor: 0xc8dcf0, dayHemiInt: 0.30,
    nightBg: 0x090d16, nightFog: [16, 66], moonPos: [24, 36, -16],
    shadow: { size: 4096, extent: 52, far: 130 },
  });
  {   // the sun's shadow box over the area, not the origin
    const C = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    sun.position.add(C); sun.target.position.copy(C); scene.add(sun.target);
  }
  const groundY = clubGroundY;
  const P = (x, z) => new THREE.Vector3(x, groundY(x, z), z);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const flat = (w, d, color, x, z, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const disc = (rx, rz, color, x, z, y, mat) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat || std(color, { roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const mesh = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow) m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  };
  const bx = (mat, x0, x1, y0, y1, z0, z1, shadow = true) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, shadow);
  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', extra = {}) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY: 0, ...extra }; obstacles.push(o); return o;
  };
  const cover = o => { coverList.push(o); return o; };
  const near = (x, z, m = 12) => x > bounds.minX - m && x < bounds.maxX + m && z > bounds.minZ - m && z < bounds.maxZ + m;

  // --- colours (the guide's table) ---
  // (the guide's photo samples, the flat ones darkened: with no tone mapping a light colour on sunlit level ground
  // reads near white, so the grass, deck, paths and courts sit in the old club's darker range)
  const C = { rough: 0x55703f, lawn: 0x5a7a34, fair: 0x6a9448, fair2: 0x628a42, green: 0x78ad52, sand: 0xd8d4c8,
    deck: 0xb49c78, fence: 0x816252, pier: 0xa5987d, chimney: 0xbab198, shingle: 0x3b3c36, metal: 0x6e7378, trim: 0xe0e5e5,
    water: 0x4cbadc, river: 0x4e6258, blue: 0x4a7eaa, clay: 0x6a8470, wind: 0x433c34, asphalt: 0x48484a, conc: 0x96928a,
    beach: 0x2e2820 };
  const waterMat = std(C.water, { roughness: 0.12, metalness: 0.1, emissive: _night ? 0x1a8ab0 : 0x000000, emissiveIntensity: _night ? 0.75 : 0 });
  const copingMat = std(0xe8e2d4), deckMat = std(C.deck, { roughness: 1.0 });
  const fenceMat = std(C.fence, { roughness: 0.85 }), pierMat = std(C.pier, { roughness: 0.95 }), capMat = std(0xc4b89c);
  const white = std(C.trim, { roughness: 0.7 }), black = std(0x18181a, { roughness: 0.5, metalness: 0.5 });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const windMat = new THREE.MeshStandardMaterial({ color: C.wind, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const lights = [];

  // === THE GROUND: the level centre, then the fairway falling to the bank, the river and the far bank ===
  flat(500, 600, C.rough, 150, 0, 0);                        // x -100..400
  {
    const W = 200, D = 600, nx = 100, nz = 60;
    const geo = new THREE.PlaneGeometry(W, D, nx, nz); geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position, col = [], c = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i) - 200, z = pa.getZ(i);           // x -300..-100
      pa.setX(i, x); pa.setY(i, groundY(x, z));
      const hex = x > -112 ? C.fair2 : x > -134 ? 0x4c4a2e : x > -142.5 ? C.beach : x > -200 ? 0x2e2e24 : (x > -212 ? 0x5a4a34 : 0x46562c);
      c.setHex(hex); col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
    // the river: murky olive grey-green, 58 m wide, sliding past the beach
    const river = flat(58, 600, C.river, -171, 0, -3.78);
    river.material = std(C.river, { roughness: 0.2, metalness: 0.15, emissive: _night ? 0x05080a : 0, emissiveIntensity: _night ? 0.4 : 0 });
  }
  // the fairway's mown stripes (x -100..-70), the green at its north end, white bunkers with grass lips, the tee
  for (let k = 0; k < 10; k++) flat(3, 120, k % 2 ? C.fair : C.fair2, -98.5 + k * 3, -40, 0.005);
  disc(9, 7, 0x5e8a3e, -86, -60, 0.007); disc(7.5, 5.8, C.green, -86, -60, 0.009);
  for (const [x, z, rx, rz] of [[-77, -53, 3.6, 2.2], [-95, -64, 3.0, 2.4], [-90, -30, 3.4, 2.0], [-118, -8, 3, 2]]) {
    disc(rx + 0.5, rz + 0.5, 0x587a34, x, z, 0.008 + groundY(x, z)); disc(rx, rz, C.sand, x, z, 0.011 + groundY(x, z));
  }
  flat(6, 5, 0x6e9a48, -86, -1, 0.008);                     // the tee
  // the cart paths: concrete, 2.8 m, the one along the courts' outside and the loop Eric drives
  const pathMat = std(C.conc, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const path = (x0, z0, x1, z1, w = 2.8) => {
    const L = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), pathMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(x1 - x0, -(z1 - z0)); m.position.set((x0 + x1) / 2, 0.014, (z0 + z1) / 2);
    m.receiveShadow = true; scene.add(m);
  };
  const RIDE = [[-94, -70], [-94, -4], [-26, -4], [-26, -70]];
  for (let i = 0; i < 4; i++) { const a = RIDE[i], b = RIDE[(i + 1) % 4]; path(a[0], a[1], b[0], b[1]); }
  path(-66, -110, -66, 60);
  path(-26, -4, -26, 50); path(-94, -70, -94, -96);

  // === THE POOL COMPOUND — x 0..45, z -45..45 ===
  flat(45, 90, C.deck, 22.5, 0, 0.012).material = deckMat;
  flat(10, 3, C.conc, -1.5, -35, 0.013); flat(10, 7, C.conc, -1.5, -10, 0.013);   // the walks to the west gates
  // the brown privacy fence on tan stone piers: an axis-aligned run with gates (from, to along it)
  const fenceRun = (axis, at, a0, a1, gates = []) => {
    const segs = []; let s = a0;
    for (const [g0, g1] of gates.slice().sort((p, q) => p[0] - q[0])) { if (g0 > s) segs.push([s, g0]); s = g1; }
    if (a1 > s) segs.push([s, a1]);
    for (const [s0, s1] of segs) {
      const L = s1 - s0, n = Math.max(1, Math.ceil(L / 7));
      if (axis === 'x') bx(fenceMat, s0, s1, 0, 1.8, at - 0.05, at + 0.05); else bx(fenceMat, at - 0.05, at + 0.05, 0, 1.8, s0, s1);
      for (let k = 0; k <= n; k++) {
        const p = s0 + (L * k) / n, px = axis === 'x' ? p : at, pz = axis === 'x' ? at : p;
        bx(pierMat, px - 0.35, px + 0.35, 0, 2.1, pz - 0.35, pz + 0.35); bx(capMat, px - 0.42, px + 0.42, 2.1, 2.22, pz - 0.42, pz + 0.42);
        box(px - 0.35, px + 0.35, pz - 0.35, pz + 0.35, 2.2);
      }
      // a 0.5 m box round the 0.1 m panels: an advancing kid's look-ahead (from 1 m out, every 0.5 m) steps over a thinner one
      if (axis === 'x') box(s0, s1, at - 0.25, at + 0.25, 1.8, 'wood'); else box(at - 0.25, at + 0.25, s0, s1, 1.8, 'wood');
    }
  };
  fenceRun('z', 0, -45, 45, [[-37, -33], [-14, -6]]);        // west, the gates to the courts (the lower one a double gate)
  fenceRun('x', -45, 0, 45, [[20, 24]]);                     // north
  fenceRun('z', 45, -45, 45, [[16, 20]]);                    // east, the gate to the lot
  fenceRun('x', 45, 0, 45, []);                              // south

  // the pool clubhouse: cream siding, two storeys, a charcoal hipped roof, the stone chimney, the white porch facing north
  {
    const x0 = 10, x1 = 34, z0 = 6, z1 = 42, H = 7;
    bx(std(0xe6e2d6, { roughness: 0.85 }), x0, x1, 0, H, z0, z1);
    box(x0, x1, z0, z1, H);
    const hip = (ax0, ax1, az0, az1, y, h, mat) => {   // a hipped roof, its ridge along the long side
      const cx = (ax0 + ax1) / 2, cz = (az0 + az1) / 2, w = ax1 - ax0, d = az1 - az0, alongZ = d >= w, r = (alongZ ? w : d) / 2;
      const A = [ax0, y, az0], B = [ax1, y, az0], Cc = [ax1, y, az1], D = [ax0, y, az1];
      const R1 = alongZ ? [cx, y + h, az0 + r] : [ax0 + r, y + h, cz], R2 = alongZ ? [cx, y + h, az1 - r] : [ax1 - r, y + h, cz];
      const t = alongZ ? [A, R1, B, B, R1, R2, B, R2, Cc, Cc, R2, D, D, R2, R1, D, R1, A] : [A, R1, B, B, R1, R2, B, R2, Cc, Cc, R2, D, D, R2, R1, D, R1, A];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.flat(), 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
    };
    const roofMat = std(C.shingle, { roughness: 0.95, side: THREE.DoubleSide });
    hip(x0 - 0.8, x1 + 0.8, z0 - 0.8, z1 + 0.8, H, 4.2, roofMat);
    hip(16, 28, z0 - 1.2, z0 + 8, H, 3.6, roofMat);           // the cross gable over the porch, as a hip
    bx(std(C.chimney, { roughness: 0.97 }), 33, 35.4, 0, 12.8, 22, 25);   // the stone chimney on the east side
    bx(std(0x8a8270), 32.8, 35.6, 12.8, 13.1, 21.8, 25.2);
    // windows on both storeys, lit at night
    const glass = std(0x2a3440, { roughness: 0.25, metalness: 0.3, emissive: _night ? 0xffd890 : 0x0a0f15, emissiveIntensity: _night ? 0.55 : 0.2 });
    for (const y of [1.6, 5.0]) {
      for (let x = x0 + 2; x <= x1 - 2; x += 3.2) { bx(white, x - 0.75, x + 0.75, y - 0.95, y + 0.95, z0 - 0.08, z0); bx(glass, x - 0.6, x + 0.6, y - 0.8, y + 0.8, z0 - 0.1, z0 - 0.06, false); }
      for (let z = z0 + 3; z <= z1 - 3; z += 3.6) for (const [xf, s] of [[x0, -1], [x1, 1]]) {
        bx(white, xf + s * 0.08 - 0.04, xf + s * 0.08 + 0.04, y - 0.95, y + 0.95, z - 0.75, z + 0.75);
        bx(glass, xf + s * 0.1 - 0.03, xf + s * 0.1 + 0.03, y - 0.8, y + 0.8, z - 0.6, z + 0.6, false);
      }
    }
    // the porch: square white columns, the upper balcony and its railing, a grey standing-seam metal roof
    const pz0 = 2.5;
    bx(std(0xb8ae9c), 14, 30, 0, 0.12, pz0, z0, false);
    for (const x of [14.3, 18.2, 22, 25.8, 29.7]) { bx(white, x - 0.2, x + 0.2, 0, 6.6, pz0 + 0.1, pz0 + 0.5); box(x - 0.22, x + 0.22, pz0 + 0.08, pz0 + 0.52, 6.6, 'wood'); }
    bx(white, 14, 30, 3.3, 3.6, pz0, z0);                     // the balcony floor
    for (let x = 14.4; x <= 29.6; x += 0.5) bx(white, x - 0.03, x + 0.03, 3.6, 4.6, pz0 + 0.25, pz0 + 0.31, false);
    bx(white, 14, 30, 4.55, 4.7, pz0 + 0.2, pz0 + 0.36);
    const tin = std(C.metal, { roughness: 0.5, metalness: 0.5 });
    bx(tin, 13.6, 30.4, 6.6, 6.8, pz0 - 0.4, z0 + 0.2);
    bx(std(0x3a3020), 21, 23, 0, 2.4, z0 - 0.1, z0, false);   // the doors onto the deck
    // a planter of boxwood each side of the porch steps (low cover)
    for (const x of [12, 32]) { bx(std(0x9a8a70), x - 0.9, x + 0.9, 0, 0.8, 2.6, 4.4); mesh(new THREE.SphereGeometry(0.75, 8, 6), std(0x5b5a26), x, 1.1, 3.5); cover(box(x - 0.9, x + 0.9, 2.6, 4.4, 0.8)); }
  }
  // the lap pool, an L: 25 x 14 m with a 10 x 10 m diving well off its north-east corner
  const pool = (x0, x1, z0, z1, rec) => {
    bx(copingMat, x0 - 0.4, x1 + 0.4, 0, 0.08, z0 - 0.4, z1 + 0.4, false);
    bx(waterMat, x0, x1, 0.06, 0.1, z0, z1, false);
    box(x0, x1, z0, z1, 1.0, 'water', { bbPass: true, noStand: true, ...rec });
  };
  pool(5, 30, -21, -7, { lapPool: true });
  pool(30, 40, -27, -17, { divingWell: true });
  for (let k = 1; k < 8; k++) bx(std(0x1f5a8a), 5.6, 29.4, 0.1, 0.105, -21 + k * 1.75 - 0.08, -21 + k * 1.75 + 0.08, false);   // the lane lines
  bx(std(0xe8e4d8), 33.5, 36.5, 0, 0.95, -28.4, -27.8); bx(std(0xe8e4d8), 34.6, 35.4, 0.95, 1.05, -27.6, -25);   // the board
  cover(box(33.5, 36.5, -28.6, -27.8, 1.0, 'metal'));
  // the free-form pool to the north (two rounds run together) and the splash pool with its play tower
  for (const [x, z, r] of [[11, -36, 5.5], [19, -35, 5]]) {
    disc(r + 0.45, r + 0.45, 0, x, z, 0.03, copingMat); disc(r, r, 0, x, z, 0.06, waterMat);
    obstacles.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, shape: 'cylinder', cx: x, cz: z, radius: r, h: 1.0, baseY: 0, surface: 'water', bbPass: true, noStand: true, freeForm: true });
  }
  bx(copingMat, 28.6, 43.4, 0, 0.05, -43.4, -30.6, false); bx(std(0x6ccbe8, { roughness: 0.2, emissive: _night ? 0x1a8ab0 : 0, emissiveIntensity: _night ? 0.6 : 0 }), 29, 43, 0.04, 0.07, -43, -31, false);   // zero depth: you walk it
  {
    const tx = 37, tz = -38, blue = std(0x2a5aa8, { metalness: 0.3, roughness: 0.6 }), yel = std(0xf2c230), red = std(0xc8302a);
    for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { bx(blue, tx + dx - 0.1, tx + dx + 0.1, 0, 4.6, tz + dz - 0.1, tz + dz + 0.1); box(tx + dx - 0.12, tx + dx + 0.12, tz + dz - 0.12, tz + dz + 0.12, 4.6, 'metal'); }
    bx(blue, tx - 1.7, tx + 1.7, 2.2, 2.35, tz - 1.7, tz + 1.7);
    for (const s of [-1, 1]) { bx(yel, tx - 1.7, tx + 1.7, 3.15, 3.25, tz + s * 1.65 - 0.05, tz + s * 1.65 + 0.05); bx(yel, tx + s * 1.65 - 0.05, tx + s * 1.65 + 0.05, 3.15, 3.25, tz - 1.7, tz + 1.7); }
    bx(red, tx - 1.9, tx + 1.9, 4.6, 4.75, tz - 1.9, tz + 1.9);
    mesh(new THREE.CylinderGeometry(0.9, 0.6, 1.1, 10), red, tx, 5.6, tz);   // the tipping bucket
    bx(std(0x2a5aa8), tx - 1.6, tx + 1.6, 0, 1.2, tz - 1.6, tz - 1.4); bx(std(0x2a5aa8), tx - 1.6, tx - 1.4, 0, 1.2, tz - 1.6, tz + 1.6);   // the climbing walls under it
    cover(box(tx - 1.6, tx + 1.6, tz - 1.62, tz - 1.38, 1.2)); cover(box(tx - 1.62, tx - 1.38, tz - 1.6, tz + 1.6, 1.2));
    const slide = mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 10, 1, true), std(0xc8302a, { side: THREE.DoubleSide }), tx + 3.6, 1.2, tz); slide.rotation.z = 1.05;
    for (const [hx, hz] of [[31, -34], [33, -41], [41, -33]]) { const h = mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 16), red, hx, 0.95, hz); h.rotation.y = 0.6; }
  }
  // loungers along the lap pool (crouch cover), the lifeguard chair, red umbrellas down the east side
  const loungeMat = std(0xf2f0ea), padMat = std(0x1f4a6a);
  const lounger = (x, z) => { bx(loungeMat, x - 0.38, x + 0.38, 0, 0.42, z - 1.0, z + 1.0); bx(padMat, x - 0.35, x + 0.35, 0.42, 0.5, z - 0.95, z + 0.95); cover(box(x - 0.4, x + 0.4, z - 1.0, z + 1.0, 0.5, 'soft')); };
  for (const x of [7, 10, 13, 22, 25, 28]) lounger(x, -4.2);
  for (const x of [6.5, 9.5, 12.5, 15.5, 22.5, 25.5]) lounger(x, -24.2);
  bx(std(0xe8e4d8), 16.6, 17.4, 1.8, 1.9, -4.6, -3.8); for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) bx(std(0xe8e4d8), 17 + dx - 0.04, 17 + dx + 0.04, 0, 1.8, -4.2 + dz - 0.04, -4.2 + dz + 0.04);
  box(16.5, 17.5, -4.7, -3.7, 2.2, 'wood');
  const umbRed = std(0xb8282a, { roughness: 0.8 });
  for (let z = -29; z <= -5; z += 6) {
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), std(0xd8d8d8, { metalness: 0.5 }), 42.6, 1.25, z, false);
    mesh(new THREE.ConeGeometry(1.4, 0.55, 8), umbRed, 42.6, 2.5, z);
    bx(std(0xf2f0ea), 41.9, 43.3, 0.7, 0.76, z - 0.7, z + 0.7); for (const s of [-1, 1]) bx(std(0xf2f0ea), 42.55, 42.65, 0, 0.7, z + s * 0.6 - 0.05, z + s * 0.6 + 0.05, false);
    cover(box(41.9, 43.3, z - 0.7, z + 0.7, 0.76, 'metal'));
  }
  // cabanas and the pavilion: small square shelters with dark pyramid roofs, a solid back wall
  const cabana = (x, z, s, back) => {
    const h = s / 2;
    for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]]) { bx(white, x + dx - 0.12, x + dx + 0.12, 0, 2.6, z + dz - 0.12, z + dz + 0.12); box(x + dx - 0.14, x + dx + 0.14, z + dz - 0.14, z + dz + 0.14, 2.6, 'wood'); }
    const r = mesh(new THREE.ConeGeometry(s * 0.78, 1.5, 4), std(0x2e302c, { roughness: 0.9 }), x, 3.35, z); r.rotation.y = Math.PI / 4;
    if (back === 'N') { bx(std(0x8a8a86), x - h, x + h, 0, 2.2, z - h - 0.06, z - h + 0.06); cover(box(x - h, x + h, z - h - 0.08, z - h + 0.08, 2.2)); }
    if (back === 'W') { bx(std(0x8a8a86), x - h - 0.06, x - h + 0.06, 0, 2.2, z - h, z + h); cover(box(x - h - 0.08, x - h + 0.08, z - h, z + h, 2.2)); }
  };
  cabana(3.6, -41.5, 3, 'N'); cabana(3.6, -2.5, 4, 'W'); cabana(41.5, 2.5, 3, 'N');
  // lantern posts along the fence (black, 4 m); lit at night, with a real light where the match can see them
  const lantern = (x, z, light) => {
    bx(black, x - 0.08, x + 0.08, 0, 3.6, z - 0.08, z + 0.08);
    bx(std(0xfff0c0, { emissive: _night ? 0xffd890 : 0x000000, emissiveIntensity: _night ? 1.0 : 0 }), x - 0.22, x + 0.22, 3.6, 4.1, z - 0.22, z + 0.22, false);
    bx(black, x - 0.28, x + 0.28, 4.1, 4.22, z - 0.28, z + 0.28);
    box(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 3.6, 'metal');
    if (_night && light && near(x, z, 4)) lights.push([x, 3.6, z, 1.6, 15]);
  };
  for (const [x, z, l] of [[1, -44, true], [1, -20, false], [1, 4, true], [44, -44, false], [44, -20, true], [22, -44, false], [2.5, -27, true], [-1, -38, false], [-1, -16, false]]) lantern(x, z, l);

  // === THE COURTS ===
  // a chain-link run (3 m, black, a dark windscreen on its lower part): it stops a body, not a BB or an eye
  const chain = (axis, at, a0, a1, gates = []) => {
    const segs = []; let s = a0;
    for (const [g0, g1] of gates.slice().sort((p, q) => p[0] - q[0])) { if (g0 > s) segs.push([s, g0]); s = g1; }
    if (a1 > s) segs.push([s, a1]);
    for (const [s0, s1] of segs) {
      const L = s1 - s0, mid = (s0 + s1) / 2;
      for (const [mat, y0, y1] of [[chainMat, 0, 3], [windMat, 0.1, 2.2]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(L, y1 - y0), mat);
        if (axis === 'x') m.position.set(mid, (y0 + y1) / 2, at); else { m.rotation.y = Math.PI / 2; m.position.set(at, (y0 + y1) / 2, mid); }
        scene.add(m);
      }
      for (let k = 0, n = Math.max(1, Math.ceil(L / 3)); k <= n; k++) { const p = s0 + (L * k) / n; if (axis === 'x') bx(black, p - 0.04, p + 0.04, 0, 3.05, at - 0.04, at + 0.04, false); else bx(black, at - 0.04, at + 0.04, 0, 3.05, p - 0.04, p + 0.04, false); }
      if (axis === 'x') { bx(black, s0, s1, 2.98, 3.05, at - 0.03, at + 0.03, false); box(s0, s1, at - 0.2, at + 0.2, 3, 'metal', { bbPass: true }); }
      else { bx(black, at - 0.03, at + 0.03, 2.98, 3.05, s0, s1, false); box(at - 0.2, at + 0.2, s0, s1, 3, 'metal', { bbPass: true }); }
    }
  };
  const lineMat = std(0xf2f0ea, { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const courtLines = (cx, cz, w, l) => {   // the outline, the service lines and the centre line (long axis along z)
    const t = 0.06, Y = 0.03;
    for (const s of [-1, 1]) { bx(lineMat, cx - w / 2, cx + w / 2, 0.02, Y, cz + s * l / 2 - t, cz + s * l / 2 + t, false); bx(lineMat, cx + s * w / 2 - t, cx + s * w / 2 + t, 0.02, Y, cz - l / 2, cz + l / 2, false); }
    for (const s of [-1, 1]) bx(lineMat, cx - w / 2 + 1.37, cx + w / 2 - 1.37, 0.02, Y, cz + s * 6.4 - t, cz + s * 6.4 + t, false);
    bx(lineMat, cx - t, cx + t, 0.02, Y, cz - 6.4, cz + 6.4, false);
  };
  const net = (x0, x1, z, posts = true) => {
    bx(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), x0, x1, 0.1, 0.92, z - 0.01, z + 0.01, false);
    bx(white, x0, x1, 0.86, 0.94, z - 0.03, z + 0.03, false);
    if (posts) for (const x of [x0, x1]) bx(black, x - 0.05, x + 0.05, 0, 1.07, z - 0.05, z + 0.05);
    box(x0, x1, z - 0.05, z + 0.05, 0.92, 'metal', { bbPass: true });
  };
  const floodlight = (x, z, light) => {
    bx(std(0x2a2a2a, { metalness: 0.5 }), x - 0.12, x + 0.12, 0, 10, z - 0.12, z + 0.12);
    bx(std(0xf8f4e0, { emissive: _night ? 0xfff0d0 : 0, emissiveIntensity: _night ? 1.2 : 0 }), x - 0.6, x + 0.6, 9.6, 10.1, z - 0.3, z + 0.3, false);
    box(x - 0.14, x + 0.14, z - 0.14, z + 0.14, 10, 'metal');
    if (_night && light && near(x, z, 4)) lights.push([x, 9, z, 2.0, 30]);
  };
  // the pickleball courts beside the pools: three, blue with red kitchens
  {
    const x0 = -23, x1 = -3, z0 = -42, z1 = -16;
    flat(x1 - x0, z1 - z0, 0x3e6a50, (x0 + x1) / 2, (z0 + z1) / 2, 0.015);
    for (const cx of [-19, -13, -7]) {
      flat(6.1, 13.4, C.blue, cx, -29, 0.018);
      flat(6.1, 4.2, 0xb84a3a, cx, -29, 0.02);
      courtLines(cx, -29, 6.1, 13.4);
      net(cx - 2.6, cx + 2.6, -29);
    }
    chain('z', x0, z0, z1); chain('z', x1, z0, z1, [[-31, -27]]);
    chain('x', z0, x0, x1, [[-15, -11]]); chain('x', z1, x0, x1, [[-21, -18], [-8, -5]]);
    floodlight(-23.4, -36, true); floodlight(-2.6, -22, true);
    for (const z of [-38.5, -19.5]) { bx(std(0x2f4a3a), -10.9, -9.1, 0, 0.45, z - 0.25, z + 0.25); cover(box(-11, -9, z - 0.3, z + 0.3, 0.5, 'wood')); }   // benches at the ends
  }
  // the lawn south of the pickleball courts: crape myrtles, picnic tables, a boxwood hedge along the compound fence
  for (const [x, z] of [[-18, -6], [-9, -1]]) { bx(std(0x7a5a3a), x - 1.0, x + 1.0, 0.7, 0.78, z - 0.45, z + 0.45); for (const s of [-1, 1]) bx(std(0x7a5a3a), x - 1.0, x + 1.0, 0.42, 0.48, z + s * 0.7 - 0.15, z + s * 0.7 + 0.15); cover(box(x - 1.0, x + 1.0, z - 0.85, z + 0.85, 0.78, 'wood')); }
  for (const [z0, z1] of [[-6, -1], [2, 8]]) { bx(std(0x5b5a26), -2.1, -1.0, 0, 1.0, z0, z1); cover(box(-2.1, -1.0, z0, z1, 1.0, 'soft')); }
  bx(std(0x9a9284), -14, -6, 0, 0.8, 4.2, 4.8); cover(box(-14, -6, 4.2, 4.8, 0.8));   // a low stone planter wall

  // the clay courts: two blocks of two, green-grey, in chain-link; the roofed bench shelter between the west block's courts
  const clayBlock = (x0, x1, z0, z1, shelter) => {
    flat(x1 - x0, z1 - z0, 0x587060, (x0 + x1) / 2, (z0 + z1) / 2, 0.015);
    const cz = (z0 + z1) / 2, cxs = [x0 + (x1 - x0) * 0.25, x0 + (x1 - x0) * 0.75];
    for (const cx of cxs) { flat(10.97, 23.77, C.clay, cx, cz, 0.018); courtLines(cx, cz, 10.97, 23.77); net(cx - 6.4, cx + 6.4, cz); }
    const mx = (x0 + x1) / 2;
    // the sides: two gates each; the shelter's block is open wider on its sides (three 6 m openings), so the kids who come at
    // the shelter walk in rather than press on the chain-link beside a 3 m gate
    const side = shelter ? [[z0 + 3, z0 + 9], [cz - 3, cz + 3], [z1 - 9, z1 - 3]] : [[z0 + 4, z0 + 7], [z1 - 7, z1 - 4]];
    chain('z', x0, z0, z1, side); chain('z', x1, z0, z1, side);
    chain('x', z0, x0, x1, [[mx - 1.5, mx + 1.5]]); chain('x', z1, x0, x1, [[mx - 1.5, mx + 1.5]]);
    for (const [x, z] of [[x0 - 0.4, z0 - 0.4], [x1 + 0.4, z0 - 0.4], [x0 - 0.4, z1 + 0.4], [x1 + 0.4, z1 + 0.4], [x0 - 0.4, cz], [x1 + 0.4, cz]]) floodlight(x, z, shelter && (z === cz));
    if (shelter) {
      // v1.445 (Michael: C, 5 Nov): the shelter Hold the Shelter is about: 3 x 3 m, a dark roof on four posts, a bench, and
      // waist-high (0.9 m) walls on the north, west and south; open on the east, the way in
      const sx = mx, sz = cz, h = 1.5;
      for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]]) { bx(white, sx + dx - 0.1, sx + dx + 0.1, 0, 2.7, sz + dz - 0.1, sz + dz + 0.1); box(sx + dx - 0.12, sx + dx + 0.12, sz + dz - 0.12, sz + dz + 0.12, 2.7, 'wood'); }
      const r = mesh(new THREE.ConeGeometry(2.6, 1.1, 4), std(0x2e302c), sx, 3.25, sz); r.rotation.y = Math.PI / 4;
      const wallMat = std(0x3a5a48, { roughness: 0.85 });
      const wall = (x0w, x1w, z0w, z1w) => { bx(wallMat, x0w, x1w, 0, 0.9, z0w, z1w); obstacles.push({ minX: x0w, maxX: x1w, minZ: z0w, maxZ: z1w, h: 0.9, baseY: 0, surface: 'wood', shelterWall: true }); };
      wall(sx - h, sx + h, sz - h - 0.05, sz - h + 0.05); wall(sx - h, sx + h, sz + h - 0.05, sz + h + 0.05); wall(sx - h - 0.05, sx - h + 0.05, sz - h + 0.05, sz + h - 0.05);
      bx(std(0x7a5a3a), sx - h + 0.1, sx - h + 0.55, 0.42, 0.5, sz - 1.2, sz + 1.2);
      // a navy umbrella and a cooler on each court's side of it
      bx(std(0x1f2a4a), sx - 0.2, sx + 0.2, 0, 0.45, sz - h - 1.8, sz - h - 1.2); cover(box(sx - 0.3, sx + 0.3, sz - h - 1.9, sz - h - 1.1, 0.45, 'soft'));
    }
  };
  clayBlock(-64, -30, -44, -8, true);
  clayBlock(-64, -30, 8, 44, false);
  // the blue hard courts north-west: three in one block
  {
    const x0 = -20, x1 = 16, z0 = -88, z1 = -52;
    flat(x1 - x0, z1 - z0, 0x3e6a50, (x0 + x1) / 2, (z0 + z1) / 2, 0.015);
    for (const cx of [-12, -1, 10]) { flat(10.97, 23.77, C.blue, cx - 0.5, -70, 0.018); courtLines(cx - 0.5, -70, 10.97, 23.77); net(cx - 6.4, cx + 5.4, -70); }
    chain('z', x0, z0, z1); chain('z', x1, z0, z1); chain('x', z0, x0, x1); chain('x', z1, x0, x1, [[-3, 0]]);
  }
  // crape myrtles round the courts: pink, multi-stem, 5-6 m
  const treeObs = [];
  const myrtle = (x, z) => {
    for (const [dx, dz] of [[0, 0], [0.4, 0.3], [-0.3, 0.35]]) bx(std(0x8a7a6a), x + dx - 0.07, x + dx + 0.07, 0, 3.4, z + dz - 0.07, z + dz + 0.07);
    mesh(new THREE.SphereGeometry(2.0, 8, 6), std(0xd86a9a, { roughness: 0.95 }), x, 4.2, z).scale.set(1, 0.7, 1);
    obstacles.push({ minX: x - 0.4, maxX: x + 0.5, minZ: z - 0.1, maxZ: z + 0.45, shape: 'cylinder', cx: x, cz: z + 0.2, radius: 0.4, h: 3.4, baseY: 0, surface: 'hard' });
  };
  for (const [x, z] of [[-27.5, -44], [-28.6, -12], [-14, 9], [-22, -12], [-68.5, -40], [-68.5, -14], [-27.5, 4], [5, -48], [-36, -86]]) myrtle(x, z);
  // v1.445: a clipped boxwood hedge, 1.6 m, across the head of the courts and the fairway between the cart yard and the
  // rest (the course screens its yard), gaps where the paths and the court gate go through; cover, and it stops the
  // yard and the tee seeing each other 80 m down the open fairway (The Eighteenth opened there at 80 m)
  {
    const hz = -48.5, gaps = [[-97, -91], [-84, -79.5], [-68.5, -63.5], [-49, -45], [-29, -23]];
    let x = -110;
    for (const [g0, g1] of gaps.concat([[-23, -23]])) {
      for (let a = x; a < g0 - 0.5; a += 4) {
        const b2 = Math.min(a + 4, g0);
        bx(std(0x4f5a26, { roughness: 1 }), a, b2, groundY(a, hz), 1.6, hz - 0.6, hz + 0.6);
        cover(box(a, b2, hz - 0.6, hz + 0.6, 1.6, 'soft'));
      }
      x = g1;
    }
  }

  // === THE CART YARD AND THE BARN, north of the courts ===
  flat(36, 30, C.asphalt, -46, -89, 0.013);
  {
    const x0 = -58, x1 = -34, z0 = -110, z1 = -87;
    bx(std(0x8a6a4a, { roughness: 0.9 }), x0, x1, 0, 5, z0, z1);
    const barnRoof = mesh(new THREE.CylinderGeometry(0.01, 13.2, 3, 4, 1), std(0x6a4630), (x0 + x1) / 2, 6.5, (z0 + z1) / 2); barnRoof.rotation.y = Math.PI / 4; barnRoof.scale.set(1.3, 1, 1.25);
    for (let x = x0 + 2; x < x1 - 2; x += 5) bx(std(0x3a2a1e), x, x + 3.6, 0, 3.6, z1, z1 + 0.06, false);
    box(x0, x1, z0, z1, 5);
  }
  // golf carts: white or cream with a black roof (1.2 m cover, too tall to step onto)
  const CART_COLORS = [0xf2f0ea, 0xf2f0ea, 0xe8dcc0];
  const cart = (x, z, yaw, golfer) => {
    const g = new THREE.Group(); g.position.set(x, groundY(x, z), z); g.rotation.y = yaw;
    const body = std(CART_COLORS[Math.floor(gameRandom() * CART_COLORS.length)], { roughness: 0.5 });
    const add = (geo, mat, gx, gy, gz) => { const m = new THREE.Mesh(geo, mat); m.position.set(gx, gy, gz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(1.2, 0.55, 2.4), body, 0, 0.5, 0);
    add(new THREE.BoxGeometry(1.1, 0.5, 0.5), std(0x2a2a2a), 0, 0.95, 0.2);
    add(new THREE.BoxGeometry(1.25, 0.08, 1.9), std(0x1a1a1a), 0, 1.95, -0.1);
    for (const [dx, dz] of [[-0.55, -0.9], [0.55, -0.9], [-0.55, 0.6], [0.55, 0.6]]) add(new THREE.BoxGeometry(0.05, 1.4, 0.05), std(0x2a2a2a), dx, 1.25, dz);
    for (const [dx, dz] of [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]]) { const w = add(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), std(0x1a1a1a), dx, 0.22, dz); w.rotation.z = Math.PI / 2; }
    add(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), std(0x2a3a5a), 0, 1.0, 1.1);
    if (golfer) {   // a golfer at the wheel: a polo, khakis, a visor
      add(new THREE.BoxGeometry(0.45, 0.55, 0.3), std(golfer), -0.25, 1.38, -0.05);
      add(new THREE.BoxGeometry(0.42, 0.2, 0.55), std(0xc8b48a), -0.25, 1.08, -0.3);
      add(new THREE.SphereGeometry(0.15, 10, 8), std(0xd8a888), -0.25, 1.8, -0.05);
      add(new THREE.BoxGeometry(0.3, 0.05, 0.36), std(0xf2f0ea), -0.25, 1.9, -0.12);
    }
    scene.add(g);
    return g;
  };
  for (let x = -60; x <= -32; x += 3.5) {   // two rows in the yard, the near one cover
    cart(x, -94, 0);
    if (Math.abs(x - -46) > 3) { cart(x, -80, Math.PI); cover(box(x - 0.62, x + 0.62, -81.25, -78.75, 1.2, 'metal')); }
  }
  // mowers and a stack of sand bags in the yard (cover)
  for (const [x, z] of [[-40, -76.5], [-56, -76.5]]) { bx(std(0x2a6a2a), x - 0.9, x + 0.9, 0, 1.1, z - 1.2, z + 1.2); bx(std(0x1a1a1a), x - 1.1, x + 1.1, 0, 0.4, z - 1.4, z + 1.4); cover(box(x - 1.1, x + 1.1, z - 1.4, z + 1.4, 1.1, 'metal')); }
  bx(std(0xc8b890), -73, -69, 0, 0.9, -78, -76); cover(box(-73, -69, -78, -76, 0.9, 'soft'));
  if (variant !== 'ride') {   // the two carts parked by the paths (the ride's cart has the loop)
    for (const [x, z, yaw] of [[-66, -30, 0], [-91, -46, Math.PI]]) { cart(x, z, yaw); cover(box(x - 0.62, x + 0.62, z - 1.25, z + 1.25, 1.2, 'metal')); }
  }
  // the fairway: the flagstick, a ball washer and a bench by the tee, the yardage post
  bx(std(0xf2f0ea), -86.03, -85.97, 0, 2.3, -60.03, -59.97, false);
  mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0xd8302a, side: THREE.DoubleSide }), -85.65, 2.05, -60, false);
  box(-86.05, -85.95, -60.05, -59.95, 2.3, 'metal');
  bx(std(0x7a5a3a), -83, -81, 0, 0.45, -9.3, -8.7); cover(box(-83, -81, -9.3, -8.7, 0.5, 'wood'));
  bx(std(0x2a2a2a), -80.06, -79.94, 0, 1.0, -9.06, -8.94); bx(std(0x2a5a8a), -80.15, -79.85, 0.9, 1.2, -9.15, -8.85); box(-80.15, -79.85, -9.15, -8.85, 1.2, 'metal');
  // trees on the fairway: big single oaks in the open, loblolly pines in a grove at its north-west corner
  for (const [tx, tz, r] of [[-100, -40, 3.2], [-99, -14, 2.8], [-75, -46, 3.0], [-77, -22, 2.6], [-86, -36, 2.4], [-101, -76, 2.6], [-72, -64, 2.4]]) {
    treeObs.push(addSuburbanTree(scene, tx, tz, { trunkH: 3.4, trunkR: 0.45, leafR: r, detail: true, baseY: groundY(tx, tz) }));
  }
  for (const [tx, tz] of [[-102, -62], [-98, -66], [-103, -55], [-80, -76]]) treeObs.push(addSuburbanTree(scene, tx, tz, { shape: 'loblolly', trunkH: 11, trunkR: 0.3, leafR: 2.6, detail: true, baseY: groundY(tx, tz) }));
  // pines and oaks round the compound and the lawn
  for (const [tx, tz, r] of [[-20, 4, 2.4], [-6, -46.5, 2.0], [-28, -48, 2.2]]) treeObs.push(addSuburbanTree(scene, tx, tz, { trunkH: 3.2, leafR: r, detail: true }));

  // === PAST THE AREAS: the bank, the beach and the rope swing, the river, the far bank, the lot, the course ===
  {
    const rng = (a, b) => a + (b - a) * gameRandom();
    // the wooded bank: big hardwoods and pines, 24 m deep, falling 2.6 m to the beach
    for (let z = -200; z <= 160; z += 5.5) for (let k = 0; k < 4; k++) {
      const x = rng(-134, -110), zz = z + rng(-2.5, 2.5);
      if (Math.abs(zz - -30) < 5 && x < -126) continue;   // the swing tree's clearing
      addSuburbanTree(scene, x, zz, { shape: gameRandom() < 0.35 ? 'pine' : 'round', trunkH: rng(4, 7), leafR: rng(2.4, 3.6), baseY: groundY(x, zz) });
    }
    // the far bank: wooded, climbing steeply
    for (let z = -260; z <= 220; z += 7) for (let k = 0; k < 3; k++) {
      const x = rng(-262, -204), zz = z + rng(-3, 3);
      addSuburbanTree(scene, x, zz, { shape: gameRandom() < 0.5 ? 'pine' : 'round', trunkH: rng(5, 8), leafR: rng(3, 4.4), baseY: groundY(x, zz) });
    }
    // the rope swing: a big oak at the top of the beach, a limb out over the sand, the rope and its stick
    {
      const tx = -131, tz = -30, by = groundY(tx, tz), bark = std(0x5a4a3a, { roughness: 1 });
      mesh(new THREE.CylinderGeometry(0.55, 0.8, 9, 10), bark, tx, by + 4.5, tz);
      const limb = mesh(new THREE.CylinderGeometry(0.22, 0.35, 9, 8), bark, tx - 4, by + 7.4, tz); limb.rotation.z = Math.PI / 2 - 0.2;
      mesh(new THREE.SphereGeometry(5.2, 10, 8), std(0x3e6a2e), tx - 1, by + 10.5, tz).scale.set(1.2, 0.75, 1);
      const sx = -138.5, top = by + 8.2, bot = groundY(sx, tz) + 1.1;
      bx(std(0xd9cfa8), sx - 0.03, sx + 0.03, bot, top, tz - 0.03, tz + 0.03, false);
      bx(std(0x6a5038), sx - 0.04, sx + 0.04, bot - 0.06, bot, tz - 0.4, tz + 0.4, false);
    }
    // driftwood and a cooler on the beach (the kids' hangout)
    for (const [x, z] of [[-139, -22], [-140, -41]]) { const d = mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.4, 6), std(0x8a8070), x, groundY(x, z) + 0.2, z); d.rotation.z = Math.PI / 2; d.rotation.y = 0.5; }
    bx(std(0xc8302a), -137.4, -136.8, groundY(-137, -27), groundY(-137, -27) + 0.45, -27.4, -26.8);
    // the lot east of the compound, the roundabout, the gate piers, parked cars
    flat(28, 92, C.asphalt, 59, 0, 0.013);
    for (let z = -42; z <= 42; z += 2.8) for (const x of [50, 68]) {
      if (gameRandom() < 0.45) continue;
      const cc = [0x8a2020, 0x20304a, 0xc8c8c8, 0x2a2a2a, 0x5a6a7a, 0xd8d0b0][Math.floor(gameRandom() * 6)];
      bx(std(cc, { roughness: 0.4, metalness: 0.3 }), x - 2.2, x + 2.2, 0.25, 1.0, z - 0.9, z + 0.9); bx(std(cc, { roughness: 0.4, metalness: 0.3 }), x - 1.2, x + 1.0, 1.0, 1.45, z - 0.8, z + 0.8);
    }
    disc(14, 14, 0, 92, 0, 0.013, std(C.asphalt)); disc(5, 5, 0x5f8a42, 92, 0, 0.02);
    flat(9, 300, C.asphalt, 92, 160, 0.012);
    for (const z of [-8, 8]) { bx(pierMat, 78.4, 79.6, 0, 2.4, z - 0.6, z + 0.6); bx(capMat, 78.2, 79.8, 2.4, 2.6, z - 0.8, z + 0.8); }
    // houses on the rise past the road (white porches, big lots)
    for (let z = -120; z <= 120; z += 26) {
      const x = rng(118, 128), w = rng(12, 16), d = rng(10, 13), h = rng(5.5, 7.5);
      bx(std([0xe8e4d8, 0xd8ccb4, 0xc8c0b0, 0xb8c4c8][Math.floor(gameRandom() * 4)]), x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2);
      const rf = mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.6, 3.2, 4), std(0x3e3c38), x, h + 1.6, z); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4);
      bx(white, x - w / 2 - 2.4, x - w / 2, 0, 0.3, z - 3, z + 3);
    }
    // the course south and north: a golf hole up to the compound's south fence, groves of pines, single oaks
    for (let k = 0; k < 8; k++) flat(4, 70, k % 2 ? C.fair : C.fair2, 6 + k * 4, 90, 0.005);
    disc(8, 6, C.green, 22, 54, 0.009);
    for (const [x, z] of [[2, 60], [44, 70], [-12, 80], [52, 110], [-40, 70], [-80, 40], [-100, 20], [-90, 70], [-120, 50], [30, -120], [-20, -110], [60, -80], [-80, -110], [-100, -100], [60, 60]]) {
      for (let k = 0; k < 4; k++) addSuburbanTree(scene, x + rng(-5, 5), z + rng(-5, 5), { shape: gameRandom() < 0.6 ? 'pine' : 'round', trunkH: rng(5, 9), leafR: rng(2.2, 3.4), baseY: groundY(x, z) });
    }
  }

  // === GOLFERS IN CARTS, scenery: driving the paths past the edge, never in reach (Michael: A, 16 Oct) ===
  {
    const routes = [
      { ax: 'z', at: -110, a: -150, b: 70, v: 4.2, t0: 0 },      // the cart path along the fairway's far side, above the bank
      { ax: 'z', at: -66, a: 12, b: 80, v: 3.6, t0: 9 },         // the path past the south clay block
      { ax: 'x', at: -116, a: -110, b: 24, v: 4.0, t0: 20 },     // the path north of the barn
    ].filter(r => { const m = 8; const lo = Math.min(r.a, r.b), hi = Math.max(r.a, r.b);   // never within 8 m of the area
      return r.ax === 'z' ? (r.at < bounds.minX - m || r.at > bounds.maxX + m || hi < bounds.minZ - m || lo > bounds.maxZ + m)
        : (r.at < bounds.minZ - m || r.at > bounds.maxZ + m || hi < bounds.minX - m || lo > bounds.maxX + m); });
    const POLOS = [0x2a5aa8, 0xc8302a, 0xf2f0ea];
    routes.forEach((r, i) => {
      const g = cart(0, 0, 0, POLOS[i % POLOS.length]);
      g.userData.noBake = true;
      const L = Math.abs(r.b - r.a), period = 2 * L / r.v;
      const place = () => {
        const t = ((performance.now() / 1000 + r.t0) % period + period) % period, s = t < period / 2 ? t * r.v : (period - t) * r.v;
        const p = r.a + Math.sign(r.b - r.a) * s, fwd = (t < period / 2) === (r.b > r.a);
        const x = r.ax === 'z' ? r.at : p, z = r.ax === 'z' ? p : r.at;
        g.position.set(x, groundY(x, z), z);
        g.rotation.y = r.ax === 'z' ? (fwd ? 0 : Math.PI) : (fwd ? Math.PI / 2 : -Math.PI / 2);
        g.updateMatrixWorld(true);
      };
      place();
      g.traverse(m => { if (m.isMesh) { m.userData.noBake = true; m.frustumCulled = false; m.castShadow = false; } });
      g.children[0].onBeforeRender = place;   // moves the whole cart a frame behind: the tub is drawn first
    });
  }

  // === THE AREA'S FENCE: the edges; nothing past them is solid ===
  const edgeH = 6, B = bounds;
  const edge = [
    { minX: B.minX - 20, maxX: B.minX - 0.01, minZ: B.minZ - 20, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.maxX + 0.01, maxX: B.maxX + 20, minZ: B.minZ - 20, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.minX - 20, maxX: B.maxX + 20, minZ: B.minZ - 20, maxZ: B.minZ - 0.01, h: edgeH, baseY: -4, surface: 'hard' },
    { minX: B.minX - 20, maxX: B.maxX + 20, minZ: B.maxZ + 0.01, maxZ: B.maxZ + 20, h: edgeH, baseY: -4, surface: 'hard' },
  ];
  // a low post-and-chain line marks the course area's open edges (the pool's are the fences and the clubhouse)
  if (area === 'course') {
    const postMat = std(0xf2f0ea);
    for (let z = B.minZ; z <= B.maxZ; z += 4) bx(postMat, B.minX - 0.4, B.minX - 0.3, groundY(B.minX, z), groundY(B.minX, z) + 0.6, z - 0.05, z + 0.05, false);
    for (let x = B.minX; x <= B.maxX; x += 4) for (const z of [B.minZ - 0.35, B.maxZ + 0.35]) bx(postMat, x - 0.05, x + 0.05, 0, 0.6, z - 0.05, z + 0.05, false);
  }
  for (const [x, y, z, inten, dist] of lights.slice(0, 7)) { const L = new THREE.PointLight(0xffdca0, inten, dist, 1.1); L.position.set(x, y, z); scene.add(L); }

  // only what stands in the area (or straddles its edge) is solid or cover
  const inArea = o => o.maxX > B.minX - 1 && o.minX < B.maxX + 1 && o.maxZ > B.minZ - 1 && o.minZ < B.maxZ + 1;
  const solid = [...obstacles, ...treeObs].filter(inArea);
  const covers = coverList.filter(o => (o.minX + o.maxX) / 2 > B.minX && (o.minX + o.maxX) / 2 < B.maxX && (o.minZ + o.maxZ) / 2 > B.minZ && (o.minZ + o.maxZ) / 2 < B.maxZ);

  // everything static baked into one mesh per look
  {
    scene.updateMatrixWorld(true);
    const meshes = [];
    scene.traverse(m => {
      if (!m.isMesh || m.userData.noBake || !m.geometry || !m.geometry.attributes.position) return;
      const M = m.material; if (!M || Array.isArray(M) || M.blending === THREE.AdditiveBlending || M.fog === false) return;
      for (let p = m.parent; p; p = p.parent) if (p.userData && p.userData.noBake) return;
      meshes.push(m);
    });
    scene.add(bakeMeshesByLook(meshes, 'clubBaked'));
  }

  // === ANCHORS & SPAWNS ===
  const nearestCover = (x, z) => {
    let best = null, bd = Infinity;
    for (const c of covers) { const d = Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z); if (d < bd) { bd = d; best = c; } }
    return best;
  };
  const A = (x, z) => ({ pos: P(x, z), cover: nearestCover(x, z) });
  let placements, playerSpawns, teamBases, extra = {};
  if (area === 'pool') {
    placements = {
      // their side: the porch, the deck round the pools
      a_porch:    A(17, 4.2),
      a_porch_e:  A(28.5, 4.2),
      a_deck_e:   A(31.5, -2.6),    // behind the loungers below the lap pool, on the west gates (35 m)
      a_pool_n:   A(15, -42.5),     // the free-form pool's north deck
      a_lounge:   A(11, -26.5),     // Pool's Closed: Brooke among the loungers between the lap pool and the free-form pool
      a_well:     A(41, -22),       // by the umbrellas, off the diving well
      a_tower:    A(33, -36),       // behind the splash pool's play tower
      a_cabana:   A(5.5, -39.5),
      // your side: the lawn and the pickleball courts
      b_lawn:     A(-16, 6.5),
      b_lawn_e:   A(-6, 7),
      b_planter:  A(-10, 2.2),
      b_pickle:   A(-13, -20),
      b_pickle_n: A(-17, -40),
      cluster_north: { pos: P(22.5, 4), cover: null },
      cluster_south: { pos: P(-12, 6), cover: null },
      cluster_course: { pos: P(22.5, 4), cover: null },
    };
    playerSpawns = {
      team_b: { pos: P(-19, 7.5), yaw: -0.5 },   // the lawn's south-west corner, looking north-east at the compound (yaw 0 faces -z)
      lawn_n: { pos: P(-12, -9), yaw: -1.2 },    // Pool's Closed: the lawn's north end by the courts, looking east at the gates
      team_a: { pos: P(22.5, 4), yaw: Math.PI },
      gazebo: { pos: P(-19, 7.5), yaw: -0.5 },
    };
    teamBases = { player: { x: -19, z: 7.5 }, enemy: { x: 22.5, z: 4 } };
  } else {
    placements = {
      // their side: the cart yard and the head of the fairway
      a_yard:     A(-46, -77),
      a_yard_e:   A(-37, -77.5),
      a_yard_w:   A(-58, -77),
      a_green:    A(-82, -66),
      a_sand:     A(-71.5, -79),
      a_porch:    A(-46, -77), a_barn: A(-37, -77.5), a_pool_n: A(-58, -77), a_porch_e: A(-82, -66),   // the old names, for any older setup
      // your side: the tee and the south of the courts
      b_tee:      A(-84, -6),
      b_path:     A(-68, -2),
      b_clay_s:   A(-52, -4),
      b_hut:      A(-84, -6), b_putt: A(-68, -2), b_fairway: A(-52, -4),
      // Hold the Shelter: the attackers' starts (west across the fairway, north through the yard, round the south)
      sh_fair:    A(-88, -28),
      sh_yard:    A(-60, -66),
      sh_south:   A(-72, -1),
      // and your crew's posts round the shelter, inside the court block
      sh_post_n:  A(-47, -38.5),
      sh_post_s:  A(-47, -13.5),
      sh_post_w:  A(-58, -16),
      sh_post_e:  A(-36, -36),
      sh_post_gw: A(-60, -38),
      // the ride's kids, in cover 10-16 m off the loop (the bunkers, the trees, the yard's carts, the court block)
      ride_green:  A(-80, -54),       // by the green's bunker, 14 m off the west run
      ride_oak:    A(-79, -24),       // by the oak mid-fairway, 15 m off the west run
      ride_yard:   A(-48, -79.5),     // among the yard's carts, 10 m off the north run
      ride_court:  A(-38, -17),       // inside the court block's corner, 12 m off the east run
      ride_path:   A(-67.5, -17),     // the cart path, 13 m off the south run
      cluster_north: { pos: P(-46, -74), cover: null },
      cluster_south: { pos: P(-80, -2), cover: null },
      cluster_course: { pos: P(-86, -30), cover: null },
    };
    playerSpawns = {
      team_b: { pos: P(-80, -1.5), yaw: 0 },          // the tee, looking up the fairway
      team_a: { pos: P(-46, -74), yaw: Math.PI },
      // v1.450: inside the shelter, facing west over its waist-high wall at the fairway the attackers come from (it faced
      // out of the open east side, with all three attackers 175° behind: spawn-facing's >120° rule)
      gazebo: { pos: P(-46.6, -26), yaw: Math.PI / 2 },
    };
    teamBases = { player: { x: -80, z: -1.5 }, enemy: { x: -46, z: -74 } };
    if (variant === 'ride') {
      // v1.445 (Michael: A, 5 Nov): one lap of the real loop, ~265 m: down the fairway, east along the south of the
      // courts, up the path between the clay block and the pickleball courts, west through the cart yard
      extra = { rideLoop: RIDE, rideStart: { x: -26, z: -30 }, rideLaps: 1 };
    }
  }
  return {
    scene,
    spawn: playerSpawns.team_b.pos.clone(), spawnYaw: playerSpawns.team_b.yaw, bounds,
    cover: covers,
    obstacles: [...solid, ...edge],
    enemies: [],
    name: 'Willow Bend Country Club', scenarioName: '', desc: '',
    placements,
    playerSpawns,
    groundY,
    teamBases,
    fieldAdvance: true,   // v1.445: kids walk round the fences to the gates (js/80-ai.js)
    viewFar: 320,
    clubArea: area,
    ...extra,
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
    const cart = (x, z, yaw, n = 1) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
      // v1.423 (B.21): wire-basket carts on casters (the street kit's), nested 0.3 m apart, the gate up on all but the last
      for (let k = 0; k < n; k++) { const c = makeShoppingCart({ gate: k === n - 1 }); c.position.z = k * 0.3; g.add(c); }
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
