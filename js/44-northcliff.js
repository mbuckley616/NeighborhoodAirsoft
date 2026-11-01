
// =====================================================================
// v1.130: NORTHCLIFF TRACE (Northcliff / Martin's Landing) — the fifth zone (backlog D.1, Michael: A, control room
// 1 Oct). Houses on a hill above a creek, built from the polished street pieces (detailed houses, cars, trees, bins,
// boxes, plywood stacks, kid forts, buildStreetRoad). The hill falls NORTH to SOUTH: the uphill row's backyards climb
// to a tree wall at z = -34 (about 4 m above the road), the downhill row's backyards drop to a wooded creek bank at
// z = 33. The road runs along the slope from the east entry (x = 36) to a cul-de-sac bulb at the west (x = -28).
// Six houses, 20 m apart, and no backyard fences: bigger yards and longer sightlines than Winnmark (the teaser's
// promise), so the uphill yards are the sniper's ground. Layout draws from the scenario's seeded Math.random.
// Playable box: x∈[-35,39], z∈[-33,33].
// =====================================================================
function buildNorthcliffScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x8eb0cc, dayFog: [40, 110],
    sunColor: 0xfff0d0, sunInt: 1.2, sunPos: [-18, 34, 20],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.48, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.38,
    nightFog: [20, 66], moonPos: [18, 36, -20],
    shadow: { size: 2048, extent: 46, far: 90 },
  });

  // --- the hill: high at the north tree wall, smooth down to the road and on down to the creek bank ---
  function groundY(x, z) {
    let u = (z + 36) / (32 + 36);
    u = Math.max(0, Math.min(1, u));
    let h = 4.2 * (1 - u * u * (3 - 2 * u));
    if (z > 32) h -= Math.min(2.2, (z - 32) * 0.4);     // the creek bank
    h += 0.2 * Math.sin(x * 0.11 + 0.7) * Math.cos(z * 0.09);
    return h;
  }
  function groundNormal(x, z) {
    const e = 0.6;
    const nx = groundY(x - e, z) - groundY(x + e, z), nz = groundY(x, z - e) - groundY(x, z + e), ny = 2 * e;
    const l = Math.hypot(nx, ny, nz) || 1;
    return { nx: nx / l, ny: ny / l, nz: nz / l };
  }
  const _UP_Z = new THREE.Vector3(0, 0, 1);
  function layOnSlope(mesh, x, z, lift = 0.04) {
    const n = groundNormal(x, z);
    mesh.position.set(x, groundY(x, z) + lift, z);
    mesh.quaternion.setFromUnitVectors(_UP_Z, new THREE.Vector3(n.nx, n.ny, n.nz));
    return mesh;
  }
  // Seat a flat-built obstacle on the slope (the lowest ground under its footprint), as Winnmark's sinkObs.
  function sinkObs(obs, gx, gz) {
    if (!obs) return obs;
    const cx = gx ?? (obs.minX + obs.maxX) / 2, cz = gz ?? (obs.minZ + obs.maxZ) / 2;
    let gy = groundY(cx, cz);
    const hw = (obs.maxX - obs.minX) / 2, hd = (obs.maxZ - obs.minZ) / 2;
    if (hw > 0.4 || hd > 0.4) for (const sx of [-hw, 0, hw]) for (const sz of [-hd, 0, hd]) gy = Math.min(gy, groundY(cx + sx, cz + sz));
    if (obs._wheelContacts && obs.mesh) gy = carSeatY(obs, groundY);
    if (obs.mesh && obs.mesh.position) obs.mesh.position.y += gy;
    if (obs.shape === 'obox') { resolveObox(obs); if (obs._stacked && obs._stacked.shape === 'obox') resolveObox(obs._stacked); }
    else { obs.baseY = gy; if (obs._stacked) obs._stacked.baseY = (obs._stacked.baseY || 0) + gy; }
    return obs;
  }
  function seatFort(walls, gx, gz) {   // the fort's walls share one group: lift it once (corner bins have their own)
    let gy = groundY(gx, gz);
    for (const sx of [-2.2, 0, 2.2]) for (const sz of [-1.5, 0, 1.5]) gy = Math.min(gy, groundY(gx + sx, gz + sz));
    const seen = new Set();
    for (const w of walls) {
      if (w.mesh && w.mesh.position && !seen.has(w.mesh)) { w.mesh.position.y += gy; seen.add(w.mesh); }
      w.baseY = gy;
    }
    return walls;
  }
  const rng = (a, b) => a + gameRandom() * (b - a);

  // --- ground (displaced), the creek and its far bank ---
  {
    const g = new THREE.PlaneGeometry(150, 150, 100, 100), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, groundY(pos.getX(i), -pos.getY(i)));
    pos.needsUpdate = true; g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5e6a3c, roughness: 1.0 }));   // v1.313: was 0x58803e
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 5), new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.25, metalness: 0.2 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, groundY(0, 39) - 0.15 + 0.12, 39.5); scene.add(water);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: 0.95 });
    for (let i = 0; i < 26; i++) {   // creek stones along the near bank
      const x = -60 + i * 4.8 + rng(-1, 1), z = 37 + rng(-0.6, 0.6), r = rng(0.3, 0.7);
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
      s.position.set(x, groundY(x, z) + r * 0.3, z); s.rotation.set(rng(0, 3), rng(0, 3), 0); s.scale.y = 0.6; scene.add(s);
    }
  }

  // --- the road: east entry → west bulb, along the slope ---
  const RA = { x: 37, z: 1 }, RC = { x: 4, z: -5 }, RB = { x: -28, z: 0 };
  const roadPoint = (t) => ({ x: (1 - t) * (1 - t) * RA.x + 2 * (1 - t) * t * RC.x + t * t * RB.x,
                              z: (1 - t) * (1 - t) * RA.z + 2 * (1 - t) * t * RC.z + t * t * RB.z });
  const roadDeriv = (t) => ({ x: 2 * (1 - t) * (RC.x - RA.x) + 2 * t * (RB.x - RC.x), z: 2 * (1 - t) * (RC.z - RA.z) + 2 * t * (RB.z - RC.z) });
  const roadCenterline = [];
  for (let i = 0; i <= 56; i++) roadCenterline.push(roadPoint(i / 56));
  const roadZAt = (x) => { let bz = 0, bd = Infinity; for (const p of roadCenterline) { const d = Math.abs(p.x - x); if (d < bd) { bd = d; bz = p.z; } } return bz; };
  const tAtX = (x) => { let bt = 0, bd = Infinity; for (let t = 0; t <= 1; t += 0.002) { const d = Math.abs(roadPoint(t).x - x); if (d < bd) { bd = d; bt = t; } } return bt; };

  // --- houses: three up the hill (north row, facing south), three down it (south row, facing north) ---
  const HOUSES = [
    // v1.312 (backlog D.55 step 4; docs/refs/northcliff.md gap 2, part one): the street's palette and its stucco and
    // fieldstone fronts. Two off-white stucco and two tan stucco, fieldstone at the corners and round the arched
    // entry, two or three front gables and arched upstairs windows; two red brick with slate-blue shutters. Brown and
    // grey roofs. Today's sizes and places (part two, the real 15-18 m houses, is a design call).
    { x: 24, z: -17, side: 'north', w: 10, brick: 0xb8a888, roof: 0x6a666c, look: 'tan' },
    { x: 4, z: -18, side: 'north', w: 10, brick: 0xa86a52, roof: 0x74605f, look: 'brick' },
    { x: -16, z: -17, side: 'north', w: 9, brick: 0xdcdad2, roof: 0x74605f, look: 'white' },
    { x: 22, z: 18, side: 'south', w: 9, brick: 0xdcdad2, roof: 0x66626a, look: 'white' },
    { x: 2, z: 19, side: 'south', w: 10, brick: 0xb0a080, roof: 0x7a6662, look: 'tan' },
    { x: -17, z: 18, side: 'south', w: 9, brick: 0x9e604a, roof: 0x6a666c, look: 'brick' },
  ];
  const NC_LOOK = {
    white: { rise: 3.2, gables: 3, arch: true, archWin: true, stone: [0xafa895, 0x9c8b7b], shutters: [0x4a4038, 0x3a3a36] },
    tan:   { rise: 3.2, gables: 2, arch: true, archWin: true, bay: -1, stone: [0xafa895, 0x9c8b7b], shutters: [0x3a3026, 0x4a4038] },
    brick: { rise: 3.0, gables: 1, shutters: [0x4c5a63] },
  };
  const houseObs = HOUSES.map(h => sinkObs(buildSuburbanHouse(scene, {
    x: h.x, z: h.z, width: h.w, depth: 8, brickColor: h.brick, roofColor: h.roof,
    trimColor: h.look === 'brick' ? 0xf0ece4 : 0xe6e0d4,
    faceDir: h.side === 'north' ? 'south' : 'north', detail: true, look: NC_LOOK[h.look],
  })));
  const houseCenters = HOUSES.map(h => ({ x: h.x, z: h.z, side: h.side }));
  buildStreetRoad(scene, {
    point: roadPoint, deriv: roadDeriv, groundY, groundNormal, houseCenters,
    asphMat: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    ASPH: 3.45, bulb: { x: RB.x, z: RB.z, r: 6.3 }, T0: -0.12, NS: 170,
    manholes: [[0.3, 0.8], [0.66, -0.7]], drains: [[0.18, -1], [0.52, 1], [0.84, -1]],
    cracks: [[0.1, 5.2, 0.4], [0.44, 6.0, -0.3], [0.76, 5.0, 0.25]], patch: 0.56,
  });
  // driveways, from the house front to the road edge, laid on the slope in 2 m pieces
  {
    const dMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.95 });
    for (const hc of houseCenters) {
      const rz = roadZAt(hc.x), front = hc.side === 'north' ? hc.z + 4 : hc.z - 4;
      const edge = hc.side === 'north' ? rz - 4 : rz + 4;
      const z0 = Math.min(front, edge), z1 = Math.max(front, edge), n = Math.max(1, Math.ceil((z1 - z0) / 2)), st = (z1 - z0) / n;
      for (let s = 0; s < n; s++) {
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(4, st + 0.4), dMat);
        layOnSlope(seg, hc.x, z0 + st * (s + 0.5), 0.018); seg.receiveShadow = true; scene.add(seg);
      }
    }
  }

  // --- anchors first, so the random yard cover keeps clear of them ---
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const ANCH = {
    bulb_fort: [-30.5, 0], bulb_car_n: [-27.5, -5.8], bulb_car_s: [-24.5, 6.6],
    yard_n1: [22, -28], yard_n2: [5, -29], yard_n3: [-15, -28],
    yard_s1: [21, 28.5], yard_s2: [3, 29], yard_s3: [-16, 28.5],
    creek_fort: [-6, 31.2],
    road_e_n: [28, -3.2], road_e_s: [29, 4.8], road_mid_n: [-6, -6.5], road_mid_s: [12, 3.5],
    road_w: [-18, 3.6],   // v1.131: the creek-fort defend's west attacker
    cluster_bulb: [-31, 0], cluster_east: [34, 1], cluster_road: [-4, -2.5],   // v1.131: cluster_road, the defend's attackers
  };
  const keepClear = (x, z, r = 2.2) => Object.values(ANCH).some(([ax, az]) => Math.hypot(ax - x, az - z) < r)
    || Math.hypot(x - 35, z - 1) < 3;   // the player's road_east spawn

  const coverList = [], coverByHouse = [], bushObs = [], curbBins = [], driveCars = [];
  // mailboxes at the foot of each driveway
  for (const hc of houseCenters) {
    const rz = roadZAt(hc.x), dir = hc.side === 'north' ? -1 : 1;
    const mx = hc.x + (gameRandom() < 0.5 ? -2.3 : 2.3), mz = rz + dir * 4.6;
    bushObs.push(sinkObs(addMailbox(scene, mx, mz, { facing: hc.side === 'north' ? 0 : Math.PI }), mx, mz));
  }
  // bins out on trash day at half the houses (player cover, not AI cover, as Winnmark)
  for (const hc of houseCenters) {
    if (gameRandom() < 0.5) continue;
    const dir = hc.side === 'north' ? -1 : 1, bz = roadZAt(hc.x) + dir * 4.9, bx = hc.x + (gameRandom() < 0.5 ? 3.4 : -3.4);
    const facing = hc.side === 'north' ? Math.PI : 0;
    curbBins.push(sinkObs(addCurbsideBin(scene, bx - 0.4, bz, { variant: 'garbage', facing, detail: true }), bx - 0.4, bz));
    curbBins.push(sinkObs(addCurbsideBin(scene, bx + 0.4, bz, { variant: 'recycle', facing, detail: true }), bx + 0.4, bz));
  }
  // backyard cover: 3–4 pieces a yard, spread wide (the yards are deep)
  houseCenters.forEach((hc, i) => {
    const back = hc.side === 'north' ? -1 : 1, yz = hc.z + back * 10.5;
    coverByHouse[i] = [];
    const n = 3 + Math.floor(gameRandom() * 2);
    for (let j = 0; j < n; j++) {
      const cx = hc.x + rng(-6.5, 6.5), cz = yz + rng(-4, 3.5) * back;
      if (keepClear(cx, cz) || Math.abs(cz) > 31.5) continue;
      const k = gameRandom(), gy = groundY(cx, cz);
      let o;
      if (k < 0.4) o = sinkObs(addHomeDepotBox(scene, cx, cz, { w: rng(0.9, 1.3), h: rng(0.85, 1.1), d: rng(0.85, 1.1), facing: rng(-Math.PI, Math.PI), detail: true }), cx, cz);
      else if (k < 0.72) o = sinkObs(addCurbsideBin(scene, cx, cz, { variant: gameRandom() < 0.55 ? 'garbage' : 'recycle', tipped: gameRandom() < 0.15, facing: rng(-Math.PI, Math.PI), detail: true }), cx, cz);
      else {
        const st = buildPlyStack(cx, gy, cz, Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1);
        scene.add(st);
        o = { minX: cx - 0.8, maxX: cx + 0.8, minZ: cz - 0.45, maxZ: cz + 0.45, h: 0.55, baseY: gy, mesh: st, surface: 'hard' };
      }
      coverList.push(o); coverByHouse[i].push(o);
    }
  });
  // anchor cover for the yard anchors: one box beside each (so every yard anchor has something to hide behind)
  const anchorCover = {};
  for (const [key, side] of [['yard_n1', -1], ['yard_n2', -1], ['yard_n3', -1], ['yard_s1', 1], ['yard_s2', 1], ['yard_s3', 1]]) {
    const [ax, az] = ANCH[key], cz = az - side * 1.3;   // between the anchor and the road
    const o = sinkObs(addHomeDepotBox(scene, ax, cz, { w: 1.3, h: 1.05, d: 1.0, facing: 0, detail: true }), ax, cz);
    coverList.push(o); anchorCover[key] = o;
  }
  // cars: about half the driveways (collision, not AI cover); two in the bulb and four along the kerb (AI cover)
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x3a5a3a, 0xb09a6a, 0x2a3e6a];
  const pickColor = () => CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
  for (const hc of houseCenters) {
    if (gameRandom() < 0.45) continue;
    const dir = hc.side === 'north' ? -1 : 1, cz = roadZAt(hc.x) + dir * 7.6;
    driveCars.push(sinkObs(addCar(scene, hc.x, cz, { orientation: dir < 0 ? Math.PI / 2 : -Math.PI / 2, color: pickColor(), groundNormalFn: groundNormal, detail: true }), hc.x, cz));
  }
  const kerbCar = (x, z, orient) => { const o = sinkObs(addCar(scene, x, z, { orientation: orient, color: pickColor(), groundNormalFn: groundNormal, detail: true }), x, z); pushCarObs(coverList, o); return o; };
  const bulbCarN = kerbCar(-27.5, -3.6, 0.15), bulbCarS = kerbCar(-24.5, 4.6, -0.2);
  for (const [tx, side] of [[14, 1], [31, -1], [-8, -1]]) {   // side 1 is the north kerb (the road runs west)
    const t = tAtX(tx), p = roadPoint(t), d = roadDeriv(t), l = Math.hypot(d.x, d.z), nx = -d.z / l, nz = d.x / l;
    kerbCar(p.x + nx * side * 2.3, p.z + nz * side * 2.3, Math.atan2(-d.z, d.x));
  }
  // kid forts: one in the bulb facing the street, the twins' one on the creek bank facing up the hill
  const bulbFort = seatFort(buildKidFort(scene, -28, 0, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true }), -28, 0);
  const creekFort = seatFort(buildKidFort(scene, -6, 29.4, { faceDir: 'N', width: 3.8, depth: 2.2, detail: true }), -6, 29.4);
  for (const w of [...bulbFort, ...creekFort]) coverList.push(w);

  // --- trees: a wall round three sides, a line along the creek bank, big oaks in the yards ---
  const treeObs = [];
  // v1.313 (backlog D.55 step 5; docs/refs/northcliff.md gap 1): the street stands under tall loblollies. About 40 % of
  // the wall and creek-bank trees and half the yard oaks are pines (12-18 m trunks, the crown on top), picked by their
  // spot so the round's random numbers and every other placement are as before; each keeps its trunk's place and radius.
  // Pine straw lies under the yard pines and in a bed either side of each front walk, and the lawn is the canopy's
  // darker green.
  const ncStraw = [];
  const tree = (x, z, o = {}, share = 0.4) => {
    if ((Math.abs(Math.sin(x * 4.898 + z * 7.233) * 24634.6345) % 1) < share) {
      const h2 = Math.abs(Math.sin(x * 1.37 + z * 2.71) * 9182.3) % 1;
      if (z > -34 && z < 33) ncStraw.push({ x, z, r: 2.6 + h2 });
      o = { ...o, shape: 'loblolly', trunkH: 13 + 5 * h2, leafR: 3.0 + 0.8 * h2 };
    }
    treeObs.push(addSuburbanTree(scene, x, z, { detail: true, baseY: groundY(x, z), ...o }));
  };
  const wall = (x1, z1, x2, z2, skip) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.floor(len / 3.2)), px = -(z2 - z1) / len, pz = (x2 - x1) / len;
    for (let i = 0; i <= n; i++) {
      const bx = x1 + (x2 - x1) * i / n, bz = z1 + (z2 - z1) * i / n;
      if (skip && skip(bx, bz)) continue;
      tree(bx + rng(-0.5, 0.5), bz + rng(-0.5, 0.5));
      if (i < n) tree(bx + (x2 - x1) / n / 2 + px * 2.4, bz + (z2 - z1) / n / 2 + pz * 2.4);
    }
  };
  wall(-37, -35, 41, -35);                                 // the hilltop
  wall(-37, 34, -37, -35);                                 // the west woods behind the bulb
  wall(41, -35, 41, 34, (x, z) => Math.abs(z - 1) < 5.5);  // the east side, open where the road comes in
  for (let x = -34; x <= 38; x += 5.5) tree(x + rng(-1, 1), 34.8 + rng(-0.4, 0.4), { trunkH: rng(4, 5.5), leafR: rng(2.2, 2.8) });   // the creek bank
  for (const [x, z] of [[14, -27], [-5, -26], [-26, -24], [31, -26], [12, 26], [-7, 24], [-26, 22], [32, 25]]) {   // yard oaks
    const xx = x + rng(-1.5, 1.5), zz = z + rng(-1.5, 1.5);
    if (!keepClear(xx, zz, 2.6)) tree(xx, zz, { trunkH: rng(3.8, 5), leafR: rng(2.4, 3.0), trunkR: 0.42 }, 0.5);
  }
  for (const hc of houseCenters) for (const s of [-1, 1])     // v1.313: the beds either side of the front walk
    ncStraw.push({ x: hc.x + s * 4.2, z: hc.z + (hc.side === 'north' ? 5.6 : -5.6), r: 1.9 });
  addPineStraw(scene, ncStraw, groundY, 0x8a7258);   // the guide's #9a8066, a shade down for the sun
  for (const hc of houseCenters) for (const s of [-1, 1]) {   // a shrub either side of each front step
    const bx = hc.x + s * 2.6, bz = hc.z + (hc.side === 'north' ? 4.6 : -4.6);
    bushObs.push(addBush(scene, bx, bz, 1.2, 0.8, 1.0, null, groundY(bx, bz), { detail: true }));
  }

  // --- streetlamps on the grass between the houses ---
  const lampObs = [];
  for (const [x, side] of [[14, 1], [-6, -1], [-24, 1], [33, -1]]) {
    const lz = roadZAt(x) + side * 5.1;
    const lamp = addStreetlamp(scene, x, lz, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
  }

  const bounds = { minX: -35, maxX: 39, minZ: -33, maxZ: 33 };
  const edge = [
    { minX: -60, maxX: 60, minZ: 33.6, maxZ: 70, h: 6, baseY: -3, surface: 'hard' },   // the creek bank
    { minX: 39.6, maxX: 70, minZ: -60, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },    // past the east entry
  ];

  const A = (key, cover) => ({ pos: P(ANCH[key][0], ANCH[key][1]), cover: cover || null });
  const placements = {
    bulb_fort: A('bulb_fort', bulbFort[0]), bulb_car_n: A('bulb_car_n', bulbCarN), bulb_car_s: A('bulb_car_s', bulbCarS),
    yard_n1: A('yard_n1', anchorCover.yard_n1), yard_n2: A('yard_n2', anchorCover.yard_n2), yard_n3: A('yard_n3', anchorCover.yard_n3),
    yard_s1: A('yard_s1', anchorCover.yard_s1), yard_s2: A('yard_s2', anchorCover.yard_s2), yard_s3: A('yard_s3', anchorCover.yard_s3),
    creek_fort: A('creek_fort', creekFort[0]),
    road_e_n: A('road_e_n'), road_e_s: A('road_e_s'), road_mid_n: A('road_mid_n'), road_mid_s: A('road_mid_s'),
    road_w: A('road_w'), cluster_road: A('cluster_road'),   // v1.131
    cluster_bulb: A('cluster_bulb'), cluster_east: A('cluster_east'),
  };
  const playerSpawns = {
    road_east:   { pos: P(35, 1), yaw: Math.PI / 2 },     // the east entry, facing west down the street (yaw 0 faces -z)
    bulb_center: { pos: P(-31.5, 0), yaw: -Math.PI / 2 }, // behind the bulb fort, facing east
    creek_fort:  { pos: P(-6, 30.4), yaw: 0 },            // v1.131: inside the twins' creek fort, facing up the hill
  };
  return {
    scene,
    spawn: playerSpawns.road_east.pos.clone(), spawnYaw: playerSpawns.road_east.yaw, bounds,
    cover: coverList,
    obstacles: [...houseObs, ...treeObs, ...bushObs, ...coverList, ...curbBins, ...driveCars, ...lampObs, ...edge],
    enemies: [],
    name: 'Northcliff Trace', scenarioName: '', desc: '',
    placements, playerSpawns, groundY,
    teamBases: { player: { x: 34, z: 1 }, enemy: { x: -31, z: 0 } },
  };
}
function buildNorthcliffSceneDefault(_v, tod) { return buildNorthcliffScene('default', tod); }

// =====================================================================
// v1.138: STONEGLEN CLOSE — the twins' backyard and its treehouse (backlog D.7, Michael: A, control room 2 Oct).
// A small fenced yard behind a house with a big oak in the middle. The treehouse is a 3.4 x 3.2 m platform 2.6 m
// up on the oak, with a plywood rail and a gap over the ladder on its south side. Climbing: `built.ladders` (see
// updateLadder); a kid can hold the platform: `built.perches` (enemySetup `perch`, see kidGroundY).
// v1.316 (D.55 step 6, Michael: A): no match is played here any more: the twins' yard is their course
// (buildTwinsCourseScene). The yard is kept as the game's only ladder and perch, which the climbing suites drive
// (tests/lib/treehouse-yard.mjs) and D.7's towers can reuse.
// =====================================================================
const TREEHOUSE_TOP = 2.6;   // the platform's floor top: where feet stand up there
function buildTreehouseYardScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9ab8d0, dayFog: [36, 90],
    sunColor: 0xfff0d0, sunInt: 1.2, sunPos: [-14, 30, 16],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.38,
    nightFog: [16, 50], moonPos: [14, 32, -16],
    shadow: { size: 2048, extent: 30, far: 70 },
  });
  // Flat, but a ground fn all the same: with one, kids' and the player's collision is height-aware (v1.8), so the
  // platform 2.45 m up is walked under, not into.
  const groundY = () => 0;
  const rng = (a, b) => a + gameRandom() * (b - a);
  const obstacles = [], cover = [];
  const box = (minX, maxX, minZ, maxZ, h, baseY = 0, extra = {}) => ({ minX, maxX, minZ, maxZ, h, baseY, surface: 'hard', ...extra });

  // --- the lawn, a patio slab behind the house ---
  {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x5a8a40, roughness: 1.0 }));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; scene.add(lawn);
    const patio = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 4), new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 0.95 }));
    patio.position.set(0, 0.03, 15); patio.receiveShadow = true; scene.add(patio);
  }
  // --- the house at the south end, back to the yard ---
  obstacles.push(buildSuburbanHouse(scene, { x: 0, z: 21, width: 13, depth: 8, brickColor: 0xc8b090, roofColor: 0x4a3a2a, faceDir: 'south', detail: true }));

  // --- a 1.8 m board fence round the other three sides (and the house's flanks) ---
  {
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.95 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.95 });
    const run = (x1, z1, x2, z2) => {
      const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1), len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, g = new THREE.Group();
      const boards = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 1.8, alongX ? 0.05 : len), boardMat);
      boards.position.set(cx, 0.9, cz); boards.castShadow = boards.receiveShadow = true; g.add(boards);
      for (const y of [0.35, 1.45]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.09, 0.09, alongX ? 0.09 : len), railMat);
        rail.position.set(cx + (alongX ? 0 : (cx > 0 ? -0.07 : 0.07)), y, cz + (alongX ? (cz > 0 ? -0.07 : 0.07) : 0)); g.add(rail);
      }
      for (let s = 0; s <= len; s += 2.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), railMat);
        post.position.set(alongX ? Math.min(x1, x2) + s : cx, 0.95, alongX ? cz : Math.min(z1, z2) + s); g.add(post);
      }
      scene.add(g);
      obstacles.push(box(Math.min(x1, x2) - 0.06, Math.max(x1, x2) + 0.06, Math.min(z1, z2) - 0.06, Math.max(z1, z2) + 0.06, 1.8, 0, { mesh: g }));
    };
    run(-17.5, -15.5, 17.5, -15.5);   // the back
    run(-17.5, -15.5, -17.5, 17);     // west
    run(17.5, -15.5, 17.5, 17);       // east
    run(-17.5, 17, -6.5, 17);         // the house's flanks
    run(6.5, 17, 17.5, 17);
  }

  // --- the oak and the treehouse ---
  const TH = { x: 0, z: -6 };                                   // the platform's centre
  const P0 = { minX: TH.x - 1.7, maxX: TH.x + 1.7, minZ: TH.z - 1.6, maxZ: TH.z + 1.6 };
  const top = TREEHOUSE_TOP, floorT = 0.15, railH = 0.9;
  const oak = addSuburbanTree(scene, TH.x, P0.minZ - 0.5, { detail: true, trunkR: 0.45, trunkH: 6.6, leafR: 3.6, leafColor: 0x3e6030 });
  obstacles.push(oak);
  const thObs = [];
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 });
    const ply = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.92 });
    const g = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const W = P0.maxX - P0.minX, D = P0.maxZ - P0.minZ;
    // floor boards across a pair of joists
    for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(W, 0.05, D / 9 - 0.015), i % 3 ? wood : dark, TH.x, top - 0.025, P0.minZ + D * (i + 0.5) / 9);
    for (const dx of [-1.2, 0, 1.2]) add(new THREE.BoxGeometry(0.1, 0.1, D), dark, TH.x + dx, top - 0.1, TH.z);
    // four posts, each with a knee brace
    for (const [px, pz] of [[P0.minX + 0.15, P0.minZ + 0.15], [P0.maxX - 0.15, P0.minZ + 0.15], [P0.minX + 0.15, P0.maxZ - 0.15], [P0.maxX - 0.15, P0.maxZ - 0.15]]) {
      add(new THREE.BoxGeometry(0.16, top - floorT, 0.16), dark, px, (top - floorT) / 2, pz);
      const br = add(new THREE.BoxGeometry(0.08, 0.9, 0.08), dark, px + (px < TH.x ? 0.3 : -0.3), top - 0.55, pz);
      br.rotation.z = px < TH.x ? -0.7 : 0.7;
      thObs.push(box(px - 0.08, px + 0.08, pz - 0.08, pz + 0.08, top - floorT));
    }
    // the rail: plywood sheets on three sides, two short ones either side of the ladder gap on the south
    const GAP = 0.6;
    const rails = [
      [P0.minX, P0.minX + 0.08, P0.minZ, P0.maxZ], [P0.maxX - 0.08, P0.maxX, P0.minZ, P0.maxZ], [P0.minX, P0.maxX, P0.minZ, P0.minZ + 0.08],
      [P0.minX, TH.x - GAP, P0.maxZ - 0.08, P0.maxZ], [TH.x + GAP, P0.maxX, P0.maxZ - 0.08, P0.maxZ],
    ];
    for (const [a, b, c, d] of rails) {
      add(new THREE.BoxGeometry(b - a, railH, d - c), ply, (a + b) / 2, top + railH / 2, (c + d) / 2);
      add(new THREE.BoxGeometry(Math.max(0.1, b - a + 0.04), 0.06, Math.max(0.1, d - c + 0.04)), dark, (a + b) / 2, top + railH + 0.03, (c + d) / 2);   // cap
      thObs.push(box(a, b, c, d, railH, top, { noStand: true, treehouseRail: true }));
    }
    // the floor itself: stood on from above, walked under from below, stops BBs both ways
    thObs.push(box(P0.minX, P0.maxX, P0.minZ, P0.maxZ, floorT, top - floorT, { treehouseFloor: true }));
    // the ladder: two rails leaning from the grass up to the gap, rungs every 30 cm (no collision: the ladder zone
    // below is what you climb)
    const footZ = P0.maxZ + 0.35, len = Math.hypot(top + 0.9, footZ - P0.maxZ), lean = Math.atan2(footZ - P0.maxZ, top + 0.9);
    const lad = new THREE.Group();
    lad.position.set(TH.x, 0, footZ); lad.rotation.x = -lean;
    for (const sx of [-0.24, 0.24]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, len, 0.08), dark); r.position.set(sx, len / 2, 0); r.castShadow = true; lad.add(r); }
    for (let y = 0.3; y < len - 0.1; y += 0.3) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.05), wood); r.position.set(0, y, 0); lad.add(r); }
    g.add(lad);
    // a sign on the north rail
    const sign = add(new THREE.BoxGeometry(1.1, 0.32, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.9 }), TH.x + 0.4, top + 0.55, P0.minZ - 0.03);
    sign.rotation.z = 0.06;
    scene.add(g);
    for (const o of thObs) { o.mesh = g; obstacles.push(o); }
  }
  // the climb zone: stand at the ladder's foot (or in the rail's gap up top). W climbs, S climbs down.
  const ladders = [{
    minX: TH.x - 0.45, maxX: TH.x + 0.45, minZ: P0.maxZ - 0.2, maxZ: P0.maxZ + 1.0,
    x: TH.x, z: P0.maxZ + 0.6,             // where the climber hangs: on the yard side of the ladder
    top, edgeZ: P0.maxZ, dirZ: -1,          // stepping off at the top moves toward −z, onto the floor
    perch: 'treehouse',                     // v1.143: the perch a kid who climbs it holds (kidLadderStep)
  }];
  // where a kid holding the platform may stand (the floor inside the rail, less a kid's radius)
  const perches = { treehouse: { y: top, minX: P0.minX + 0.45, maxX: P0.maxX - 0.45, minZ: P0.minZ + 0.45, maxZ: P0.maxZ - 0.45 } };

  // --- yard cover: a shed, the twins' fort, boxes, bins, a ply stack, a picnic table ---
  {
    const shedMat = new THREE.MeshStandardMaterial({ color: 0x7a8a6a, roughness: 0.9 }), roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.9 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.4), shedMat); body.position.set(11, 1.1, -11); body.castShadow = body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 2.8), roofMat); roof.position.set(11, 2.3, -11); roof.rotation.x = 0.12; roof.castShadow = true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x5a6a4a, roughness: 0.9 })); door.position.set(11, 0.9, -9.78); g.add(door);
    scene.add(g);
    const shed = box(9.4, 12.6, -12.2, -9.8, 2.3, 0, { mesh: g });
    obstacles.push(shed); cover.push(shed);
  }
  const fort = buildKidFort(scene, -10, -2, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true });
  for (const w of fort) { obstacles.push(w); cover.push(w); }
  const coverAt = (o) => { obstacles.push(o); cover.push(o); return o; };
  const boxE = coverAt(addHomeDepotBox(scene, 9, 2, { w: 1.3, h: 1.05, d: 1.0, facing: 0.2, detail: true }));
  coverAt(addHomeDepotBox(scene, 9.8, 3.3, { w: 1.0, h: 0.9, d: 0.9, facing: -0.3, detail: true }));
  const boxW = coverAt(addHomeDepotBox(scene, -5, 7, { w: 1.2, h: 1.0, d: 1.0, facing: 0.5, detail: true }));
  coverAt(addHomeDepotBox(scene, 4.5, -11, { w: 1.2, h: 1.0, d: 1.0, facing: -0.4, detail: true }));
  for (const [bx, bz, v] of [[-13.6, 12.5, 'garbage'], [-12.8, 12.5, 'recycle'], [13.2, 9, 'garbage']]) coverAt(addCurbsideBin(scene, bx, bz, { variant: v, facing: Math.PI, detail: true }));
  {
    const st = buildPlyStack(4, 0, 6, 0.37); scene.add(st);
    coverAt({ minX: 3.2, maxX: 4.8, minZ: 5.55, maxZ: 6.45, h: 0.55, baseY: 0, mesh: st, surface: 'hard' });
  }
  {   // a picnic table on the patio: standable (0.75 m)
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.92 }), g = new THREE.Group();
    const top_ = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.8), wood); top_.position.set(4, 0.75, 13.5); top_.castShadow = true; g.add(top_);
    for (const sz of [-0.6, 0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.28), wood); b.position.set(4, 0.45, 13.5 + sz); g.add(b); }
    for (const sx of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 1.4), wood); l.position.set(4 + sx, 0.37, 13.5); g.add(l); }
    scene.add(g);
    obstacles.push({ minX: 3.05, maxX: 4.95, minZ: 13.1, maxZ: 13.9, h: 0.78, baseY: 0, mesh: g, surface: 'hard', bbPass: false });
  }
  // shrubs along the fences and two smaller trees in the corners
  for (const [x, z] of [[-16, -8], [-16, 6], [16, -3], [16, 4], [-6, -14.5], [7, -14.5]]) obstacles.push(addBush(scene, x, z, 1.3, 0.9, 1.1, null, 0, { detail: true }));
  for (const [x, z] of [[-14.5, -13], [14.5, 13]]) obstacles.push(addSuburbanTree(scene, x + rng(-0.3, 0.3), z + rng(-0.3, 0.3), { detail: true, trunkH: rng(3.6, 4.4), leafR: rng(2.2, 2.6) }));
  // trees beyond the fence, so the yard is in the woods
  for (let x = -24; x <= 24; x += 4.5) addSuburbanTree(scene, x + rng(-1, 1), -19.5 + rng(-1, 1), { detail: true, trunkH: rng(4, 5.5), leafR: rng(2.4, 3) });
  for (let z = -15; z <= 12; z += 4.5) for (const sx of [-1, 1]) addSuburbanTree(scene, sx * (21 + rng(-1, 1)), z + rng(-1, 1), { detail: true, trunkH: rng(4, 5.5), leafR: rng(2.4, 3) });
  if (_night) addStreetlamp(scene, -3, 16.2, groundY, true);   // a porch light's worth

  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const placements = {
    treehouse: { pos: V(TH.x, TH.z - 0.4), cover: thObs.find(o => o.treehouseRail && o.minZ > TH.z) },
    shed: { pos: V(11, -8.4), cover: obstacles.find(o => o.h === 2.3) },
    fort: { pos: V(-11, -2), cover: fort[0] },
    boxes_e: { pos: V(10, 0.6), cover: boxE },
    boxes_w: { pos: V(-5.2, 5.6), cover: boxW },
    back_fence: { pos: V(-4, -13), cover: null },
    cluster_back: { pos: V(2, -13), cover: null },
    cluster_patio: { pos: V(2, 12.5), cover: null },   // v1.144: the twins come out of the house
  };
  const playerSpawns = {
    side_gate: { pos: V(-13, 14.4), yaw: -0.55 },                 // by the bins at the west side of the patio, facing up the yard toward the oak
    treehouse: { pos: V(TH.x + 0.6, TH.z - 0.6), yaw: Math.PI, y: top },   // on the platform, facing the house
    // v1.185 (decisions, Michael: A): King of the Treehouse starts here, in the lee of the shed from the platform; at
    // the side gate Connor had a line from the first frame and tagged you about 3 s after BEGIN. Faces past the shed's
    // south-east corner down the yard.
    behind_shed: { pos: V(14.5, -12), yaw: 2.5 },
  };
  return {
    scene,
    spawn: playerSpawns.side_gate.pos.clone(), spawnYaw: playerSpawns.side_gate.yaw,
    bounds: { minX: -17, maxX: 17, minZ: -15, maxZ: 16.4 },
    cover, obstacles, enemies: [],
    name: 'Stoneglen Close', scenarioName: '', desc: '',
    placements, playerSpawns, groundY, ladders, perches,
    teamBases: { player: { x: -13, z: 14 }, enemy: { x: 0, z: -6 } },
  };
}

// =====================================================================
// v1.316 (backlog D.55 step 6; docs/refs/northcliff.md gap 7; decisions 16 Oct, 10 A, and 22 Oct, A): STONEGLEN CLOSE —
// THE TWINS' COURSE. The yard behind their house as Michael remembers it: open, flat and lined by trees, no fence;
// along the far end a private gravel road 3.5 m up on a grassy bank ("we would rarely play up there"), and the
// bunkers they built: a big sandbag bunker in the middle (where the treehouse's oak stood), plywood walls with firing
// slots, a pallet wall, tyre stacks, a low plywood tower and a smaller sandbag nest under the bank. The shed, their
// kid fort, the boxes, bins, ply stack and picnic table stand where they stood. The bank's foot is in play (the
// ground rises 1.2 m by the north bound); the road is not. Same house, same street out front.
// =====================================================================
const TWINS_BANK = { toe: -22, top: -28, h: 3.5 };   // the bank: flat south of z = toe, the road's level north of z = top
function twinsCourseGroundY(x, z) {
  if (z >= TWINS_BANK.toe) return 0;
  if (z <= TWINS_BANK.top) return TWINS_BANK.h;
  const t = (TWINS_BANK.toe - z) / (TWINS_BANK.toe - TWINS_BANK.top);
  return TWINS_BANK.h * t * t * (3 - 2 * t);
}
function buildTwinsCourseScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9ab8d0, dayFog: [40, 100],
    sunColor: 0xfff0d0, sunInt: 1.2, sunPos: [-14, 30, 16],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.38,
    nightFog: [16, 50], moonPos: [14, 32, -16],
    shadow: { size: 2048, extent: 34, far: 80 },
  });
  const groundY = twinsCourseGroundY;
  const rng = (a, b) => a + gameRandom() * (b - a);
  const obstacles = [], cover = [];
  const box = (minX, maxX, minZ, maxZ, h, baseY = 0, extra = {}) => ({ minX, maxX, minZ, maxZ, h, baseY, surface: 'hard', ...extra });
  const coverAt = (o) => { obstacles.push(o); cover.push(o); return o; };
  const std = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });

  // --- the lawn, the patio, the bank and the gravel road on top ---
  {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), std(0x5a8a40));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; scene.add(lawn);
    const patio = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 4), std(0xb8b0a4));
    patio.position.set(0, 0.03, 15); patio.receiveShadow = true; scene.add(patio);
    // the bank: a strip across the whole view, its rows on the ground fn; the woods' floor past it at the road's level
    const segZ = 12, bank = new THREE.PlaneGeometry(120, TWINS_BANK.toe - TWINS_BANK.top, 1, segZ);
    bank.rotateX(-Math.PI / 2);
    const bp = bank.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const z = bp.getZ(i) + (TWINS_BANK.toe + TWINS_BANK.top) / 2;
      bp.setZ(i, z); bp.setY(i, groundY(0, z) + 0.01);
    }
    bank.computeVertexNormals();
    const bankM = new THREE.Mesh(bank, std(0x58823c)); bankM.receiveShadow = true; scene.add(bankM);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), std(0x4e6a34));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, TWINS_BANK.h, TWINS_BANK.top - 25); floor.receiveShadow = true; scene.add(floor);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 4), std(0x9a948a));
    road.rotation.x = -Math.PI / 2; road.position.set(0, TWINS_BANK.h + 0.02, TWINS_BANK.top - 3.5); road.receiveShadow = true; scene.add(road);
    for (const dz of [-1.6, 1.6]) {   // the wheel ruts' darker gravel
      const rut = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.5), std(0x87817a));
      rut.rotation.x = -Math.PI / 2; rut.position.set(0, TWINS_BANK.h + 0.03, TWINS_BANK.top - 3.5 + dz * 0.55); scene.add(rut);
    }
  }
  // --- the house at the south end, back to the yard ---
  obstacles.push(buildSuburbanHouse(scene, { x: 0, z: 21, width: 13, depth: 8, brickColor: 0xc8b090, roofColor: 0x4a3a2a, faceDir: 'south', detail: true }));

  // --- sandbag walls: bags laid in courses, merged into one mesh a wall; each wall one collision box ---
  const bagMats = { a: std(0x9a8a5e), b: std(0x8a7a52), c: std(0xa89a6c) };
  const sandbags = (minX, maxX, minZ, maxZ, h) => {
    const g = new THREE.Group(), bk = {}, add = _propAdder(bk);
    const alongX = (maxX - minX) >= (maxZ - minZ), len = alongX ? maxX - minX : maxZ - minZ, th = alongX ? maxZ - minZ : maxX - minX;
    const rows = Math.max(1, Math.round(h / 0.19)), rh = h / rows, bl = 0.62;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bl / 2, inset = r * 0.025;   // courses offset half a bag; the wall leans in a little
      for (let s = -off; s < len - 0.05; s += bl) {
        const a = Math.max(0, s), b = Math.min(len, s + bl), w = b - a - 0.03;
        if (w < 0.12) continue;
        const c = (a + b) / 2, k = 'abc'[(r * 7 + Math.round(s * 3)) % 3];
        const geo = new THREE.BoxGeometry(alongX ? w : th - 2 * inset, rh * 0.96, alongX ? th - 2 * inset : w);
        const y = rh * (r + 0.5);
        if (alongX) add(k, geo, minX + c, y, (minZ + maxZ) / 2, 0, 0, 0);
        else add(k, geo, (minX + maxX) / 2, y, minZ + c, 0, 0, 0);
      }
    }
    _propMerge(g, bk, bagMats); scene.add(g);
    return coverAt(box(minX, maxX, minZ, maxZ, h, 0, { mesh: g, surface: 'soft' }));
  };
  // the big bunker: a ring of bags 0.9 m high round a 3.2 x 2.4 m floor, its way in on the house side. Chest-high, as
  // the club's redoubts: crouched you are under it, standing your head and gun are over it (a kid's muzzle is 0.92-1.18
  // m up, so 1.15 m bags kept Connor from ever seeing out)
  const BK = { x: 0, z: -6 }, bkH = 0.9;
  // (the way in is on the west side: a gap facing the house let the twins shoot straight in from the patio)
  const bunker = {
    n: sandbags(BK.x - 2.2, BK.x + 2.2, BK.z - 1.8, BK.z - 1.2, bkH),
    s: sandbags(BK.x - 2.2, BK.x + 2.2, BK.z + 1.2, BK.z + 1.8, bkH),
    e: sandbags(BK.x + 1.6, BK.x + 2.2, BK.z - 1.2, BK.z + 1.2, bkH),
    wn: sandbags(BK.x - 2.2, BK.x - 1.6, BK.z - 1.2, BK.z - 0.5, bkH),
    ws: sandbags(BK.x - 2.2, BK.x - 1.6, BK.z + 0.5, BK.z + 1.2, bkH),
  };
  // the nest under the bank: an L of bags, Evan's
  const nest = sandbags(-7.4, -4.6, -21.4, -20.8, 0.9);
  sandbags(-7.4, -6.8, -20.8, -19.4, 0.9);

  // --- plywood walls with a firing slot (a 20 cm gap at 1.0-1.2 m that BBs pass through), on 2x4 legs ---
  const plyMat = std(0xc4a06a), plyDark = std(0x6a4a30);
  const slotWall = (cx, cz, len, alongX) => {
    const g = new THREE.Group(), th = 0.08, w = alongX ? len : th, d = alongX ? th : len;
    const mesh = (geo, mat, y, dx = 0, dz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(cx + dx, y, cz + dz); m.castShadow = m.receiveShadow = true; g.add(m); };
    mesh(new THREE.BoxGeometry(w, 1.0, d), plyMat, 0.5);
    mesh(new THREE.BoxGeometry(w, 0.3, d), plyMat, 1.35);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(alongX ? 0.09 : 0.2, 1.55, alongX ? 0.2 : 0.09), plyDark, 0.775, alongX ? s * (len / 2 - 0.05) : 0, alongX ? 0 : s * (len / 2 - 0.05));
    scene.add(g);
    const hw = w / 2 + 0.03, hd = d / 2 + 0.03;
    const low = coverAt(box(cx - hw, cx + hw, cz - hd, cz + hd, 1.0, 0, { mesh: g }));
    obstacles.push(box(cx - hw, cx + hw, cz - hd, cz + hd, 0.3, 1.2, { mesh: g, noStand: true }));
    return low;
  };
  const plyW = slotWall(-8, -12, 2.4, true);
  const plyE = slotWall(6.5, -1.5, 2.4, true);
  slotWall(-5.5, 2.5, 2.2, false);
  // a pallet wall: three pallets on edge, slats and blocks
  {
    const g = new THREE.Group(), bk = {}, add = _propAdder(bk), mats = { slat: std(0xa8885a), blk: std(0x7a5a3a) };
    const x0 = 3.6, z0 = 8.5;
    for (let p = 0; p < 3; p++) {
      const px = x0 + p * 1.22;
      for (let s = 0; s < 6; s++) add('slat', new THREE.BoxGeometry(1.18, 0.09, 0.02), px, 0.12 + s * 0.2, z0 - 0.06);
      for (let s = 0; s < 6; s++) add('slat', new THREE.BoxGeometry(1.18, 0.09, 0.02), px, 0.12 + s * 0.2, z0 + 0.06);
      for (const dx of [-0.54, 0, 0.54]) add('blk', new THREE.BoxGeometry(0.1, 1.2, 0.1), px + dx, 0.6, z0);
    }
    _propMerge(g, bk, mats); scene.add(g);
    coverAt(box(x0 - 0.62, x0 + 2 * 1.22 + 0.62, z0 - 0.1, z0 + 0.1, 1.2, 0, { mesh: g }));
  }
  // tyre stacks
  const tyreMat = std(0x1e1e1e);
  const tyres = (cx, cz, n) => {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.17, 8, 16), tyreMat);
      t.rotation.x = Math.PI / 2; t.position.set(cx + (i % 2) * 0.04, 0.17 + i * 0.3, cz); t.castShadow = true; g.add(t);
    }
    scene.add(g);
    return coverAt(box(cx - 0.6, cx + 0.6, cz - 0.6, cz + 0.6, 0.17 + n * 0.3, 0, { mesh: g, surface: 'soft' }));
  };
  tyres(-13, -8, 3); tyres(12.5, 6, 3); tyres(13.4, 6.9, 2);
  // the low plywood tower: a sheathed box on four posts, the top open, nobody climbs it
  {
    const g = new THREE.Group(), tx = -12.5, tz = -17, s = 1.7, h = 1.9;
    for (const [dx, dz, w, d] of [[0, -s / 2, s, 0.06], [0, s / 2, s, 0.06], [-s / 2, 0, 0.06, s], [s / 2, 0, 0.06, s]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.3, d), plyMat); m.position.set(tx + dx, 0.3 + (h - 0.3) / 2, tz + dz); m.castShadow = m.receiveShadow = true; g.add(m);
    }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h + 0.15, 0.12), plyDark); m.position.set(tx + dx * (s / 2 - 0.02), (h + 0.15) / 2, tz + dz * (s / 2 - 0.02)); m.castShadow = true; g.add(m);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.03), std(0xe8e0c8)); sign.position.set(tx + 0.1, 1.5, tz + s / 2 + 0.05); sign.rotation.z = -0.05; g.add(sign);
    scene.add(g);
    coverAt(box(tx - s / 2 - 0.06, tx + s / 2 + 0.06, tz - s / 2 - 0.06, tz + s / 2 + 0.06, h, 0, { mesh: g }));
  }

  // --- what stayed: the shed, the twins' kid fort, boxes, bins, a ply stack, the picnic table ---
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.4), std(0x7a8a6a)); body.position.set(11, 1.1, -11); body.castShadow = body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 2.8), std(0x4a4038)); roof.position.set(11, 2.3, -11); roof.rotation.x = 0.12; roof.castShadow = true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.04), std(0x5a6a4a)); door.position.set(11, 0.9, -9.78); g.add(door);
    scene.add(g);
    coverAt(box(9.4, 12.6, -12.2, -9.8, 2.3, 0, { mesh: g, courseShed: true }));
  }
  const fort = buildKidFort(scene, -10, -2, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true });
  for (const w of fort) { obstacles.push(w); cover.push(w); }
  const boxE = coverAt(addHomeDepotBox(scene, 9, 2, { w: 1.3, h: 1.05, d: 1.0, facing: 0.2, detail: true }));
  coverAt(addHomeDepotBox(scene, 9.8, 3.3, { w: 1.0, h: 0.9, d: 0.9, facing: -0.3, detail: true }));
  const boxW = coverAt(addHomeDepotBox(scene, -5, 7, { w: 1.2, h: 1.0, d: 1.0, facing: 0.5, detail: true }));
  coverAt(addHomeDepotBox(scene, 4.5, -11, { w: 1.2, h: 1.0, d: 1.0, facing: -0.4, detail: true }));
  for (const [bx, bz, v] of [[-13.6, 12.5, 'garbage'], [-12.8, 12.5, 'recycle'], [13.2, 9, 'garbage']]) coverAt(addCurbsideBin(scene, bx, bz, { variant: v, facing: Math.PI, detail: true }));
  {
    const st = buildPlyStack(4, 0, 6, 0.37); scene.add(st);
    coverAt({ minX: 3.2, maxX: 4.8, minZ: 5.55, maxZ: 6.45, h: 0.55, baseY: 0, mesh: st, surface: 'hard' });
  }
  {   // the picnic table on the patio: standable (0.75 m)
    const wood = std(0x8a6a48), g = new THREE.Group();
    const top_ = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.8), wood); top_.position.set(4, 0.75, 13.5); top_.castShadow = true; g.add(top_);
    for (const sz of [-0.6, 0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.28), wood); b.position.set(4, 0.45, 13.5 + sz); g.add(b); }
    for (const sx of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 1.4), wood); l.position.set(4 + sx, 0.37, 13.5); g.add(l); }
    scene.add(g);
    obstacles.push({ minX: 3.05, maxX: 4.95, minZ: 13.1, maxZ: 13.9, h: 0.78, baseY: 0, mesh: g, surface: 'hard', bbPass: false });
  }

  // --- the trees: no fence; the sides are tree lines with undergrowth, the bank has trees on it and the woods run on
  //     past the road. Round hardwoods and tall loblollies mixed, as on Northcliff Trace (v1.313).
  const tree = (x, z, big) => {
    const pine = ((Math.abs(Math.round(x * 7 + z * 13)) % 5) < 2);
    return addSuburbanTree(scene, x, z, pine
      ? { detail: true, shape: 'loblolly', trunkR: 0.34, trunkH: rng(12, 16), leafR: rng(2.4, 3), baseY: groundY(x, z) }
      : { detail: true, trunkH: big ? rng(5, 6.5) : rng(4, 5.5), leafR: rng(2.6, 3.2), baseY: groundY(x, z) });
  };
  for (const sx of [-1, 1]) {
    for (let z = -20; z <= 13; z += 4.2) obstacles.push(tree(sx * (19.2 + rng(-0.6, 0.6)), z + rng(-0.8, 0.8), true));
    for (let z = -18; z <= 12; z += 5.5) obstacles.push(tree(sx * (23 + rng(-1, 1)), z + rng(-1, 1), false));
    for (let z = -19; z <= 12; z += 3.4) obstacles.push(addBush(scene, sx * (17.9 + rng(-0.3, 0.3)), z + rng(-0.6, 0.6), rng(1.1, 1.6), rng(0.7, 1.0), rng(0.9, 1.3), null, 0, { detail: true }));
  }
  for (let x = -22; x <= 22; x += 5.2) obstacles.push(tree(x + rng(-1, 1), -25.6 + rng(-0.6, 0.6), true));   // on the bank
  for (const z of [-36, -41.5, -47]) for (let x = -34; x <= 34; x += 5.5) tree(x + rng(-1.4, 1.4), z + rng(-1.5, 1.5), z !== -36);   // past the road
  for (const [x, z] of [[-14.5, -13], [14.5, 13]]) obstacles.push(addSuburbanTree(scene, x + rng(-0.3, 0.3), z + rng(-0.3, 0.3), { detail: true, trunkH: rng(3.6, 4.4), leafR: rng(2.2, 2.6) }));
  if (_night) addStreetlamp(scene, -3, 16.2, groundY, true);   // a porch light's worth

  const V = (x, z) => new THREE.Vector3(x, groundY(x, z), z);
  const placements = {
    bunker: { pos: V(BK.x + 0.6, BK.z), cover: bunker.s },            // Connor's: inside (findClearSpawn keeps 0.75 m off the bags), the house-side bags his
    shed: { pos: V(11, -8.4), cover: obstacles.find(o => o.courseShed) },
    fort: { pos: V(-11, -2), cover: fort[0] },
    boxes_e: { pos: V(10, 0.6), cover: boxE },
    boxes_w: { pos: V(-5.2, 5.6), cover: boxW },
    ply_w: { pos: V(-8, -13), cover: plyW },
    ply_e: { pos: V(6.5, -0.6), cover: plyE },
    road_bank: { pos: V(-6, -22.2), cover: nest },                  // Evan's: in the nest under the bank, 16 m behind the bunker
    cluster_back: { pos: V(2, -17), cover: null },
    cluster_patio: { pos: V(2, 12.5), cover: null },
  };
  const playerSpawns = {
    side_gate: { pos: V(-13, 14.4), yaw: -0.55 },                   // by the bins at the west side of the patio, facing up the yard
    // King of the Course (v1.185's rule, kept): behind the shed, out of Connor's sight from the bunker; faces past
    // the shed's south-east corner down the yard
    behind_shed: { pos: V(14.5, -12), yaw: 2.5 },
    bunker: { pos: V(BK.x + 0.6, BK.z), yaw: Math.PI },              // Hold the Bunker: inside it, facing the house (v1.331: it faced Evan's nest behind)
  };
  return {
    scene,
    spawn: playerSpawns.side_gate.pos.clone(), spawnYaw: playerSpawns.side_gate.yaw,
    bounds: { minX: -17.5, maxX: 17.5, minZ: -24, maxZ: 16.4 },
    cover, obstacles, enemies: [],
    name: 'Stoneglen Close', scenarioName: '', desc: '',
    placements, playerSpawns, groundY,
    teamBases: { player: { x: -13, z: 14 }, enemy: { x: BK.x, z: BK.z } },
  };
}

// =====================================================================
// v1.317 (backlog D.55 step 7; docs/refs/northcliff.md gap 6; decisions 16 Oct, 9 A, and 22 Oct, A): THE NORTHCLIFF
// POOL, the swim and tennis club where the neighbourhood met, as a small map of its own (as Bellfield Court is). From
// the guide: a 25 x 12 m pool in a pale concrete deck about 4 m wide, the clubhouse (11 x 11 m, grey roof) on the
// deck's north end, two blue tennis courts side by side east of the pool (32 x 34 m together, in a green surround and
// a dark 3 m chain-link fence), the spur road along the north side with its parking, and trees all round. The pool
// stops bodies, not BBs (as the country club's); the courts' fence stops bodies, and BBs and eyes go through it, so a
// fight round the courts is about the gates. Flat. North is −z; the courts' long axis runs north-south.
// =====================================================================
function buildNorthcliffPoolScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9ab8d0, dayFog: [45, 120],
    sunColor: 0xfff0d0, sunInt: 1.2, sunPos: [-16, 30, 14],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.4,
    nightFog: [18, 55], moonPos: [16, 32, -14],
    shadow: { size: 2048, extent: 44, far: 90 },
  });
  const groundY = () => 0;
  const rng = (a, b) => a + gameRandom() * (b - a);
  const obstacles = [], cover = [];
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const mesh = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const flat = (w, d, color, x, z, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color, { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', extra = {}) => { const o = { minX, maxX, minZ, maxZ, h, surface, baseY: 0, ...extra }; obstacles.push(o); return o; };
  const coverBox = (...a) => { const o = box(...a); cover.push(o); return o; };

  // --- the ground: grass, the road and its parking along the north, the deck, the courts' surround and courts ---
  flat(200, 200, 0x5e7a3e, 0, 0, 0);
  flat(200, 7, 0x3e4044, 0, -24.5, 0.006);              // the spur road
  flat(44, 6, 0x4a4c50, -8, -17.5, 0.008);              // the parking along it
  for (let x = -29; x <= 13; x += 3) flat(0.1, 5, 0xd8d4c8, x, -17.5, 0.010);   // the bays' lines
  flat(33, 21, 0xe8dccf, -13, 9.5, 0.012);              // the deck x∈[-29.5,3.5], z∈[-1,20]
  flat(3, 6, 0xd8d0c4, -15.5, -15.5 + 4.5, 0.011);      // the walk from the parking to the clubhouse door
  flat(32, 34, 0x3e6a4a, 22, 3, 0.012);                 // the courts' green surround x∈[6,38], z∈[-14,20]
  const lineMat = std(0xf2f2ee, { roughness: 1 });
  for (const cx of [14, 30]) {
    flat(10.97, 23.77, 0x3a5e9a, cx, 3, 0.014);          // the court, blue
    for (const [w, d, x, z] of [[10.97, 0.08, cx, 3 - 11.88], [10.97, 0.08, cx, 3 + 11.88], [0.08, 23.77, cx - 5.48, 3], [0.08, 23.77, cx + 5.48, 3],
      [0.08, 23.77, cx - 4.11, 3], [0.08, 23.77, cx + 4.11, 3], [8.23, 0.08, cx, 3 - 6.4], [8.23, 0.08, cx, 3 + 6.4], [0.08, 12.8, cx, 3]]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.016, z); scene.add(l);
    }
  }

  // --- the pool: 25 x 12 m, coping, the water darker at the deep end, lane ropes; stops bodies, not BBs ---
  const PX0 = -25.5, PX1 = -0.5, PZ0 = 4, PZ1 = 16, PCX = (PX0 + PX1) / 2, PCZ = (PZ0 + PZ1) / 2;
  {
    mesh(new THREE.BoxGeometry(PX1 - PX0 + 0.8, 0.1, PZ1 - PZ0 + 0.8), std(0xf4f0e8), PCX, 0.05, PCZ, false);
    const waterMat = std(0x7ad8ec, { roughness: 0.15, metalness: 0.1, emissive: _night ? 0x0a4a6a : 0x000000, emissiveIntensity: _night ? 0.7 : 0 });
    mesh(new THREE.BoxGeometry(PX1 - PX0, 0.04, PZ1 - PZ0), waterMat, PCX, 0.1, PCZ, false);
    mesh(new THREE.BoxGeometry(8, 0.045, PZ1 - PZ0), std(0x4ab0d0, { roughness: 0.15 }), PX0 + 4, 0.101, PCZ, false);
    for (const lz of [PZ0 + 3, PZ0 + 6, PZ0 + 9]) mesh(new THREE.BoxGeometry(PX1 - PX0, 0.06, 0.06), std(lz === PZ0 + 6 ? 0xd03030 : 0xf0f0f0), PCX, 0.13, lz, false);
    box(PX0, PX1, PZ0, PZ1, 1.0, 'water', { bbPass: true, noStand: true });
    for (const lx of [PX0 + 2, PX1 - 2]) for (const s of [-0.25, 0.25]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), std(0xc8c8c8, { metalness: 0.7 }), lx + s, 0.5, PZ0 - 0.15, false);
    // the lifeguard chair on the south side, mid-pool (2.4 m, a post you can't pass)
    const lgx = PCX, lgz = PZ1 + 1.4;
    mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), std(0xf2f0ea), lgx, 1.9, lgz);
    for (const [dx, dz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), std(0xf2f0ea), lgx + dx, 0.95, lgz + dz);
    mesh(new THREE.BoxGeometry(0.9, 0.7, 0.08), std(0xd03030), lgx, 2.3, lgz + 0.35);
    box(lgx - 0.5, lgx + 0.5, lgz - 0.4, lgz + 0.4, 2.4, 'wood');
    // loungers on the deck's long sides (crouch cover, 0.5 m), umbrellas between them
    const loungeMat = std(0xf2f0ea), padMat = std(0x2a6a8a);
    for (const [lz, xs] of [[1.6, [-24, -20, -6, -2]], [18.4, [-23, -19, -8, -4]]]) for (const lx of xs) {
      mesh(new THREE.BoxGeometry(0.75, 0.3, 2.0), loungeMat, lx, 0.3, lz);
      mesh(new THREE.BoxGeometry(0.7, 0.08, 1.9), padMat, lx, 0.48, lz);
      coverBox(lx - 0.4, lx + 0.4, lz - 1.0, lz + 1.0, 0.5, 'soft');
    }
    for (const [ux, uz] of [[-22, 1.6], [-4, 1.6], [-21, 18.4], [-6, 18.4]]) {
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), std(0xd8d8d8, { metalness: 0.5 }), ux, 1.2, uz, false);
      mesh(new THREE.ConeGeometry(1.4, 0.5, 8), std(uz < 10 ? 0x2a6a8a : 0xe8e0c8), ux, 2.45, uz);
      box(ux - 0.06, ux + 0.06, uz - 0.06, uz + 0.06, 2.4, 'metal');
    }
  }

  // --- the clubhouse on the deck's north end: 11 x 11 m, stucco, a grey roof, a snack window onto the deck ---
  {
    const x0 = -21, x1 = -10, z0 = -12, z1 = -1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = 3.6;
    mesh(new THREE.BoxGeometry(x1 - x0, H, z1 - z0), std(0xd8d0bc), cx, H / 2, cz);
    mesh(new THREE.BoxGeometry(x1 - x0 + 1.2, 0.3, z1 - z0 + 1.2), std(0x6a6a70), cx, H + 0.15, cz);
    const roof = mesh(new THREE.ConeGeometry((x1 - x0) * 0.78, 2.0, 4), std(0x6a6a70), cx, H + 1.3, cz); roof.rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(3.2, 1.1, 0.1), std(0x2a2a2a), cx + 2, 1.6, z1 + 0.04, false);                 // the snack window
    mesh(new THREE.BoxGeometry(3.6, 0.12, 0.6), std(0x6a6a70), cx + 2, 1.05, z1 + 0.3);                     // its counter
    mesh(new THREE.BoxGeometry(1.0, 2.1, 0.1), std(0x3a5a6a), cx - 3, 1.05, z1 + 0.04, false);               // the door to the deck
    mesh(new THREE.BoxGeometry(1.0, 2.1, 0.1), std(0x3a5a6a), cx - 2.5, 1.05, z0 - 0.04, false);             // and to the parking
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#2a4a5a'; c2.fillRect(0, 0, 512, 64);
    c2.fillStyle = '#f2ead8'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'SWIM & TENNIS', 256, 34, 36, 'Georgia', 512 - 40);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
    sign.position.set(cx, 2.9, z0 - 0.08); sign.rotation.y = Math.PI; scene.add(sign);
    coverBox(x0, x1, z0, z1, H);
  }
  // the pump house between the deck and the courts, and a hedge either side of it
  mesh(new THREE.BoxGeometry(3, 2.4, 4), std(0xc8c0ac), 4.6, 1.2, -5);
  mesh(new THREE.BoxGeometry(3.4, 0.2, 4.4), std(0x6a6a70), 4.6, 2.5, -5);
  coverBox(3.1, 6.1, -7, -3, 2.4);
  for (const [z0, z1] of [[-12, -8.5], [1, 6], [12, 19]]) {
    mesh(new THREE.BoxGeometry(1.0, 1.1, z1 - z0), std(0x2f5a2a), 4.4, 0.55, (z0 + z1) / 2);
    coverBox(3.9, 4.9, z0, z1, 1.1, 'soft');
  }

  // --- the courts' fence: dark chain-link 3 m high on posts, two gates on the west, one each north and south ---
  {
    const meshMat = new THREE.MeshStandardMaterial({ color: 0x1e2a22, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    const postMat = std(0x1e2a22, { metalness: 0.4 });
    const FX0 = 6, FX1 = 38, FZ0 = -14, FZ1 = 20, H = 3;
    const run = (x0, z0, x1, z1) => {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, H), meshMat); p.position.set(cx, H / 2, cz); if (!alongX) p.rotation.y = Math.PI / 2; scene.add(p);
      mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 0.05, alongX ? 0.05 : len), postMat, cx, H, cz, false);   // the top rail
      for (let s = 0; s <= len + 0.01; s += 3) mesh(new THREE.CylinderGeometry(0.04, 0.04, H, 6), postMat, alongX ? Math.min(x0, x1) + s : cx, H / 2, alongX ? cz : Math.min(z0, z1) + s, false);
      box(Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, Math.min(z0, z1) - 0.05, Math.max(z0, z1) + 0.05, H, 'metal', { bbPass: true, courtFence: true });
    };
    run(FX0, FZ0, FX0, -3); run(FX0, -1, FX0, 10); run(FX0, 12, FX0, FZ1);            // west, gates at z −3…−1 and 10…12
    run(FX0, FZ0, 21, FZ0); run(23, FZ0, FX1, FZ0);                                   // north, the gate at x 21…23
    run(FX0, FZ1, 13, FZ1); run(15, FZ1, FX1, FZ1);                                   // south, the gate at x 13…15
    run(FX1, FZ0, FX1, FZ1);                                                          // east
    // the nets: a cord over a dark mesh, 0.9 m; they stop bodies, not BBs
    for (const cx of [14, 30]) {
      mesh(new THREE.BoxGeometry(12.8, 0.85, 0.03), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), cx, 0.5, 3, false);
      mesh(new THREE.BoxGeometry(12.8, 0.07, 0.05), std(0xf2f2ee), cx, 0.93, 3, false);
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.07, 8), postMat, cx + s * 6.4, 0.53, 3, false);
      box(cx - 6.45, cx + 6.45, 2.95, 3.05, 0.95, 'soft', { bbPass: true, noStand: true });
    }
    // on the courts: a bench by each net post outside the lines, a ball hopper, a rolled tarp, a ball machine
    for (const [bx, bz] of [[7.4, 1.4], [20.6, 4.6], [23.4, 1.4], [36.6, 4.6]]) {
      mesh(new THREE.BoxGeometry(0.5, 0.06, 2.0), std(0x2a4a3a), bx, 0.45, bz);
      for (const s of [-0.8, 0.8]) mesh(new THREE.BoxGeometry(0.45, 0.45, 0.06), std(0x2a2a2a), bx, 0.22, bz + s, false);
      coverBox(bx - 0.28, bx + 0.28, bz - 1.0, bz + 1.0, 0.5, 'wood');
    }
    mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), std(0x8a8a8a, { metalness: 0.5 }), 18, 0.35, -9);
    coverBox(17.7, 18.3, -9.3, -8.7, 0.7, 'metal');
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 5.5, 12), std(0x2a4a3a), 30, 0.4, 17.5).rotation.z = Math.PI / 2;
    coverBox(27.2, 32.8, 17.1, 17.9, 0.8, 'soft');
    mesh(new THREE.BoxGeometry(0.9, 0.9, 1.2), std(0x3a3a3e), 34, 0.45, -11);
    coverBox(33.5, 34.5, -11.6, -10.4, 0.9, 'metal');
  }

  // --- the parking: cars in the bays, a few gaps; a streetlamp or two ---
  const carObs = [];
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d8, 0x2a2a2a, 0x4a5a3a, 0xc8b890];
  for (const [i, cx] of [-27.5, -21.5, -18.5, -9.5, -0.5, 8.5].entries()) {
    const o = addCar(scene, cx, -17.4, { orientation: Math.PI / 2 + (i % 2 ? 0.05 : -0.04), color: CAR_COLORS[i % CAR_COLORS.length], detail: true });
    obstacles.push(o); cover.push(o); carObs.push(o);
  }
  const lampObs = [];
  for (const [lx, lz] of [[-24, -20.6], [2, -20.6], [3, 19.5]]) {
    const lamp = addStreetlamp(scene, lx, lz, groundY, _night);
    if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
  }
  obstacles.push(...lampObs);

  // --- trees all round, the club in the woods; the side creek's ravine past the courts on the east ---
  for (let x = -40; x <= 44; x += 4.8) obstacles.push(addSuburbanTree(scene, x + rng(-1, 1), 24.5 + rng(-1, 1), { detail: true, trunkH: rng(5, 6.5), leafR: rng(2.6, 3.2) }));
  for (let z = -16; z <= 22; z += 4.6) {
    obstacles.push(addSuburbanTree(scene, -35.5 + rng(-1, 1), z + rng(-1, 1), { detail: true, shape: (z | 0) % 2 ? 'loblolly' : 'round', trunkH: (z | 0) % 2 ? rng(12, 15) : rng(5, 6.5), leafR: rng(2.4, 3) }));
    obstacles.push(addSuburbanTree(scene, 42 + rng(-1, 1), z + rng(-1, 1), { detail: true, trunkH: rng(5, 6.5), leafR: rng(2.6, 3.2) }));
  }
  for (const [x, z] of [[-31, 0], [-31, 12], [-2, -9], [0, 21.5]]) obstacles.push(addBush(scene, x, z, 1.4, 1.0, 1.2, null, 0, { detail: true }));
  for (let x = -40; x <= 44; x += 6) addSuburbanTree(scene, x + rng(-1.5, 1.5), -31 + rng(-1, 1), { detail: true, shape: (x / 6 | 0) % 2 ? 'loblolly' : 'round', trunkH: rng(6, 14), leafR: rng(2.6, 3.2) });   // across the road

  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const placements = {
    court_b_far: { pos: V(33, 15.5), cover: cover.find(o => o.minX === 27.2) },
    court_a_far: { pos: V(10, 16), cover: null },
    court_b_near: { pos: V(34, -9), cover: cover.find(o => o.minX === 33.5) },
    pump_house: { pos: V(2.2, -5), cover: cover.find(o => o.minX === 3.1) },
    snack_bar: { pos: V(-12, 1.2), cover: null },
    deck_west: { pos: V(-27.5, 10), cover: null },
    parking_w: { pos: V(-24, -14.5), cover: carObs[0] },
    parking_e: { pos: V(8.5, -14.5), cover: carObs[5] },
    deck_south: { pos: V(-8, 20.5), cover: null },                 // v1.318: past the deck's south loungers
    cluster_courts: { pos: V(36, 18), cover: null },               // v1.318: After Hours at the Pool's huddle, the courts' far corner
  };
  const playerSpawns = {
    parking_west: { pos: V(-29, -15), yaw: -Math.PI / 2 },   // the west end of the parking, facing east along it
    // Round the Courts: in the lee of the pump house from the far court (no line from Christian's start), 38 m off,
    // facing past its south-west corner toward the courts' west gates
    pump_house_w: { pos: V(0.9, -5), yaw: -2.2 },   // v1.331: 0.5 m further west, the pump house's corner 2.5 m ahead (1.9 before)
  };
  return {
    scene,
    spawn: playerSpawns.parking_west.pos.clone(), spawnYaw: playerSpawns.parking_west.yaw,
    bounds: { minX: -33, maxX: 40, minZ: -21, maxZ: 22 },
    cover, obstacles, enemies: [],
    name: 'Northcliff Pool', scenarioName: '', desc: '',
    placements, playerSpawns, groundY,
    teamBases: { player: { x: -29, z: -15 }, enemy: { x: 33, z: 15.5 } },
  };
}
