
// ---------------------------------------------------------------------
// SCENARIO SCENE — Seth's Backyard
// ---------------------------------------------------------------------
function buildSethBackyardScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88a8c8);
  scene.fog = new THREE.Fog(0x88a8c8, 25, 60);

  // Warm afternoon sun
  const sun = new THREE.DirectionalLight(0xfff0c8, 1.1);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xb8c8d8, 0.5);
  scene.add(ambient);

  // Sky tint glow
  const hemi = new THREE.HemisphereLight(0xc8d8ff, 0.4);
  scene.add(hemi);

  // Ground — grass
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x5a8040, roughness: 1.0 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // Patio (concrete)
  const patio = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4),
    new THREE.MeshStandardMaterial({ color: 0xa8a8a0, roughness: 0.95 })
  );
  patio.rotation.x = -Math.PI / 2;
  patio.position.set(0, 0.005, -10);
  patio.receiveShadow = true;
  scene.add(patio);

  // House (Seth's house — backdrop on -Z side)
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xc4956c, roughness: 0.85 });
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(12, 5, 4),
    houseMat
  );
  house.position.set(0, 2.5, -14);
  house.castShadow = house.receiveShadow = true;
  scene.add(house);
  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(8, 2.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.9 })
  );
  roof.position.set(0, 6.25, -14);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.1, 1, 0.55);
  roof.castShadow = true;
  scene.add(roof);
  // Door on house
  const houseDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 2.0, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x3a2515 })
  );
  houseDoor.position.set(0, 1.0, -12.01);
  scene.add(houseDoor);
  // Windows
  const winMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, emissive: 0x1a2a3a, emissiveIntensity: 0.4 });
  [-3.5, 3.5].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.05), winMat);
    w.position.set(x, 2.5, -12.01);
    scene.add(w);
  });

  // Fences along the sides and back
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.95 });
  function fence(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dz, dx);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 0.08), fenceMat);
    f.position.set((x1+x2)/2, 0.8, (z1+z2)/2);
    f.rotation.y = -angle;
    f.castShadow = f.receiveShadow = true;
    scene.add(f);
    return { minX: Math.min(x1,x2) - 0.04, maxX: Math.max(x1,x2) + 0.04,
             minZ: Math.min(z1,z2) - 0.04, maxZ: Math.max(z1,z2) + 0.04, h: 1.6, surface: 'hard' };
  }
  const fences = [
    fence(-15, -12, -15, 12),
    fence(15, -12, 15, 12),
    fence(-15, 12, 15, 12),
  ];

  // House as obstacle
  const houseObstacle = { minX: -6, maxX: 6, minZ: -16, maxZ: -12, h: 5, surface: 'hard' };

  // Cover objects — cardboard boxes, trash cans
  const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xb8895a, roughness: 1.0 });
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x2a3a3a, roughness: 0.6, metalness: 0.2 });

  const coverList = [];

  function addCardboard(x, z, w, h, d) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cardboardMat);
    box.position.set(x, h/2, z);
    box.castShadow = box.receiveShadow = true;
    scene.add(box);
    coverList.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, h, mesh: box, surface: 'soft' });
  }
  function addTrash(x, z) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.32, 1.0, 12),
      trashMat
    );
    can.position.set(x, 0.5, z);
    can.castShadow = can.receiveShadow = true;
    scene.add(can);
    // Lid
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.06, 12),
      trashMat
    );
    lid.position.set(x, 1.03, z);
    lid.castShadow = true;
    scene.add(lid);
    coverList.push({ minX: x - 0.37, maxX: x + 0.37, minZ: z - 0.37, maxZ: z + 0.37,
      shape: 'cylinder', cx: x, cz: z, radius: 0.37, h: 1.0, mesh: can, surface: 'metal' });
  }

  // Cover layout — a mix in the middle of the yard
  addCardboard(-3, 2, 1.2, 1.0, 0.8);     // left cardboard
  addCardboard(2, -2, 0.9, 1.1, 0.9);     // mid-right
  addCardboard(-6, -4, 1.5, 1.3, 1.0);    // back-left, taller
  addCardboard(5, 3, 1.0, 0.9, 1.0);      // front-right, low
  addTrash(-1, -5);
  addTrash(7, -7);
  addTrash(-8, 4);

  // A tree
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.35, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.95 })
  );
  trunk.position.set(-10, 1.5, -2);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 1.0 })
  );
  leaves.position.set(-10, 4, -2);
  leaves.castShadow = true;
  scene.add(leaves);
  coverList.push({ minX: -10.3, maxX: -9.7, minZ: -2.3, maxZ: -1.7,
    shape: 'cylinder', cx: -10, cz: -2, radius: 0.3, h: 3, mesh: trunk, surface: 'hard' });

  // Spawn Seth using the CHARACTERS table
  const sethEnemy = makeEnemyFromCharacter('seth', {
    pos: new THREE.Vector3(-3, 0, -7),
    homeCover: coverList[2], // back-left cardboard
    scene,
  });

  return {
    scene,
    spawn: new THREE.Vector3(0, 0, 8),
    spawnYaw: 0,
    bounds: { minX: -14, maxX: 14, minZ: -11, maxZ: 11 },
    cover: coverList,
    obstacles: [...fences, houseObstacle, ...coverList],
    enemies: [sethEnemy],
    name: "Seth's Backyard",
    scenarioName: 'Just You and Seth',
    desc: "A 1-on-1. He's hiding somewhere behind the cardboard. You've got one shot in the pistol — make it count, or reload fast.",
  };
}

// ---------------------------------------------------------------------
// SCENARIO SCENE — Winnmark Court (the whole street)
// ---------------------------------------------------------------------
// Hybrid scale: faithful layout (curving road, lake on west, houses lining
// both sides, dense backyard trees) but the *playable* zones are backyards
// and the woods between yards. Front lawns + road are walkable but open and
// usually empty of cover.
//
// Coord system: +X east, -X west, +Z south, -Z north.
// World footprint: roughly X ∈ [-35, +35], Z ∈ [-25, +25].
// Road enters from east, curves westward toward the lake (x ≤ -28).
//
// Houses: 8 total, distributed along the curving road. Seth's is the
// easternmost on the north side — the player enters near it.
// Numbering (v1.299: the real house numbers are out; the repo and the game are public):
//   N1=Seth's, N2, N3, N4 (lakeside corner)
//   S1, S2, S3, S4 (lakeside corner)
// ---------------------------------------------------------------------

// --- Shared neighborhood-house builder ---
// Builds a 2-story brick/stucco kid-fantasy suburban house given footprint
// dimensions, accent color, and roof color. Returns the house's AABB
// obstacle entry so the player/BBs collide with it as a single big box.
// (Houses are exterior-only this build — see Q&A from session.)
// v1.104 (backlog D.3, Michael: D — Winnmark end to end, step 1: the houses). A detailed house front
// for buildSuburbanHouse({ detail: true }): a real hip roof with even eaves and a fascia board, a
// cross gable over the entry, framed windows with muntins, sills and shutters, a panelled door
// under a small hood, a water-table band, corner boards, gutters with downspouts and a chimney.
// Everything is built in a front-facing local frame (front at +z), bucketed by material and merged
// into one mesh per material, so a house costs about eight draw calls. Collision is unchanged.
function _houseMergeParts(parts) {
  // parts: [{ geo, m: Matrix4 }] -> one non-indexed BufferGeometry (position + normal)
  let n = 0;
  const flat = parts.map(p => { const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()); g.applyMatrix4(p.m); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
// v1.312 (backlog D.55 step 4; docs/refs/winnmark.md gap 5, northcliff.md gap 2): the real streets' house styles as a
// `look` on the detailed house, at today's size and where today's houses stand; no look builds the house as before.
//   rise     the roof's rise (2.3 m before; Winnmark's real roofs are 40-45 degrees, about 4 m on these boxes)
//   quoin    a colour: alternating long and short corner blocks up every corner (the corner boards go)
//   stone    a pair of fieldstone colours: rough stone at the corners, round the door and on the entry gable
//   belt     a colour: a band between the storeys all round (B's cream belt course)
//   gables   1-3 front gables: the entry's, then one over each front window column
//   arch     a two-storey arched entry: columns, an arch over the door, a fanlight and a tall arched window over it
//   bay      a three-sided two-storey bay on one front window column (+1 or -1), its windows on its faces
//   archWin  the upstairs front windows get arched heads
//   shutters a list of shutter colours to pick from
// Everything new is visual; below head height it stands within 0.3 m of the wall, so collision is unchanged.
function buildHouseDetail(group, { width, depth, wallH, faceDir, brickColor, trimColor, roofColor, x, z, look = null }) {
  const L = look || {};
  const ew = (faceDir === 'east' || faceDir === 'west');
  const fl = ew ? depth : width;          // length of the front face
  const fd = ew ? width / 2 : depth / 2;  // half-depth, front face at local z = +fd
  const sl = ew ? width : depth;          // side length
  const yaw = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[faceDir];
  // deterministic per-house accents (the same street every round)
  const hsh = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const shutterList = L.shutters || [0x2a3a2a, 0x1e2630, 0x3a2a24, 0x26344a, 0x2b2b2b];
  const shutterColor = shutterList[Math.floor(hsh * shutterList.length) % shutterList.length];
  const doorColor = [0x3a2515, 0x5a1e1e, 0x1e2e44, 0x2a3a2a][Math.floor(hsh * 17) % 4];
  const mats = {
    roof:  new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.88, side: THREE.DoubleSide }),
    trim:  new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.6 }),
    shut:  new THREE.MeshStandardMaterial({ color: shutterColor, roughness: 0.7 }),
    door:  new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.6 }),
    win:   new THREE.MeshStandardMaterial({ color: 0x5a82a4, roughness: 0.25, metalness: 0.2, emissive: 0x1a2a3a, emissiveIntensity: 0.35 }),
    band:  new THREE.MeshStandardMaterial({ color: new THREE.Color(brickColor).multiplyScalar(0.72), roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.5, metalness: 0.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.35, metalness: 0.6 }),
    brick: new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.92 }),
  };
  // v1.312: the look's own materials (only those it uses, so a house without them costs no more draw calls)
  if (L.quoin != null || L.belt != null) mats.quoin = new THREE.MeshStandardMaterial({ color: L.quoin != null ? L.quoin : L.belt, roughness: 0.7 });
  if (L.stone) { mats.stone = new THREE.MeshStandardMaterial({ color: L.stone[0], roughness: 0.97 }); mats.stone2 = new THREE.MeshStandardMaterial({ color: L.stone[1], roughness: 0.97 }); }
  const buckets = {}; for (const k in mats) buckets[k] = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
  function add(key, geo, px, py, pz, ry = 0, rx = 0, rz = 0) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    buckets[key].push({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), _q, _s) });
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // --- Hip roof: even 0.45 m eaves all round, ridge along the long side, same pitch on all four faces.
  const ov = 0.45, rH = L.rise || 2.3;
  const hx = width / 2 + ov, hz = depth / 2 + ov;              // world-aligned (roof is symmetric)
  const along = (width >= depth);
  const inset = Math.min(hx, hz);
  const rx = along ? hx - inset : 0, rz = along ? 0 : hz - inset;
  const v = [
    [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],   // eave corners
    [-rx, rH, -rz], [rx, rH, rz],                             // ridge ends
  ];
  const tris = along
    ? [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [2, 1, 5], [0, 3, 4], [0, 1, 2], [0, 2, 3]]
    : [[0, 3, 4], [3, 5, 4], [2, 1, 5], [1, 4, 5], [3, 2, 5], [1, 0, 4], [0, 1, 2], [0, 2, 3]];
  const rp = [];
  for (const t of tris) for (const i of t) rp.push(...v[i]);
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roofGeo.computeVertexNormals();
  // the roof is world-aligned, so it goes in unrotated: undo the front-frame yaw when merging
  const roofMesh = new THREE.Mesh(roofGeo, mats.roof);
  roofMesh.position.y = wallH + 0.12; roofMesh.castShadow = true; roofMesh.receiveShadow = true;
  group.add(roofMesh);
  // fascia board and gutter all round the eaves, soffit, downspouts and chimney: world-aligned, as the roof
  const wb = {}; for (const k in mats) wb[k] = [];
  const addW = (key, geo, px, py, pz) => wb[key].push({ geo, m: new THREE.Matrix4().makeTranslation(px, py, pz) });
  for (const [w, d, px, pz] of [[2 * hx, 0.05, 0, hz], [2 * hx, 0.05, 0, -hz], [0.05, 2 * hz, hx, 0], [0.05, 2 * hz, -hx, 0]]) {
    addW('trim', box(w + 0.05, 0.22, d + 0.05), px, wallH + 0.06, pz);
    addW('metal', box(w + (d > 1 ? 0.1 : 0.02), 0.1, d + (w > 1 ? 0.1 : 0.02)),
      px * (1 + 0.05 / (Math.abs(px) || 1)), wallH - 0.02, pz * (1 + 0.05 / (Math.abs(pz) || 1)));
  }
  addW('trim', box(2 * hx, 0.03, 2 * hz), 0, wallH - 0.03, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addW('metal', box(0.08, wallH, 0.08), sx * (width / 2 + 0.06), wallH / 2, sz * (depth / 2 + 0.06));
  // chimney on one side, rising through the roof's end slope
  {
    const cSide = hsh < 0.5 ? -1 : 1;
    const cx = along ? cSide * (width / 2 - 0.5) : cSide * 0.6, cz = along ? -0.6 : cSide * (depth / 2 - 0.5);
    addW('brick', box(0.9, rH + 1.4, 0.7), cx, wallH + (rH + 1.4) / 2, cz);
    addW('band', box(1.02, 0.1, 0.82), cx, wallH + rH + 1.45, cz);
  }
  for (const k in wb) {
    if (!wb[k].length) continue;
    const m = new THREE.Mesh(_houseMergeParts(wb[k]), mats[k]);
    m.castShadow = (k === 'brick' || k === 'trim'); m.receiveShadow = true;
    group.add(m);
  }

  // --- everything below is in the front frame (front face at local +z = fd)
  const front = new THREE.Group(); front.rotation.y = yaw; group.add(front);
  // water-table band and corner boards
  add('band', box(fl + 0.06, 0.45, 0.06), 0, 0.22, fd + 0.02);
  add('band', box(fl + 0.06, 0.45, 0.06), 0, 0.22, -fd - 0.02);
  add('band', box(0.06, 0.45, sl + 0.06), fl / 2 + 0.02, 0.22, 0);
  add('band', box(0.06, 0.45, sl + 0.06), -fl / 2 - 0.02, 0.22, 0);
  if (L.quoin == null && !L.stone) for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('trim', box(0.16, wallH - 0.45, 0.16), sx * fl / 2, 0.45 + (wallH - 0.45) / 2, sz * fd);
  // a belt course between the storeys
  add('trim', box(fl + 0.04, 0.1, 0.05), 0, 2.72, fd + 0.03);
  // v1.312: quoins or fieldstone up the four corners: blocks alternating long on one face and short on the other
  if (L.quoin != null || L.stone) {
    const stoneC = !!L.stone;
    let k = 0;
    for (let y = 0.45; y < wallH - 0.15; y += (stoneC ? 0.34 : 0.42), k++) {
      const h = stoneC ? 0.3 : 0.36;
      const jit = stoneC ? (Math.abs(Math.sin((x + y) * 91.7 + z * 13.1 + k)) % 1) : 0;   // fieldstone: uneven lengths
      const lng = (stoneC ? 0.5 + 0.35 * jit : 0.55), sht = (stoneC ? 0.28 + 0.2 * jit : 0.32);
      const key = stoneC ? ((k + Math.floor(jit * 3)) % 2 ? 'stone' : 'stone2') : 'quoin';
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const a = (k % 2) ? lng : sht, b = (k % 2) ? sht : lng;        // along the front/back face, along the side
        add(key, box(a, h, 0.05), sx * (fl / 2 - a / 2 + 0.03), y + h / 2, sz * (fd + 0.025));
        add(key, box(0.05, h, b), sx * (fl / 2 + 0.025), y + h / 2, sz * (fd - b / 2 + 0.03));
      }
    }
  }
  // v1.312: a belt course all round (B's cream band, deeper than the front's trim line)
  if (L.belt != null) {
    add('quoin', box(fl + 0.1, 0.2, 0.07), 0, 2.72, fd + 0.04);
    add('quoin', box(fl + 0.1, 0.2, 0.07), 0, 2.72, -fd - 0.04);
    add('quoin', box(0.07, 0.2, sl + 0.1), fl / 2 + 0.04, 2.72, 0);
    add('quoin', box(0.07, 0.2, sl + 0.1), -fl / 2 - 0.04, 2.72, 0);
  }

  // cross gable over the entry: a roofed prism with a trim-clad gable end and a round vent
  const gw = Math.min(3.6, fl * 0.42), gH = L.rise ? Math.min(rH * 0.78, 3.1) : 1.55, gL = Math.min(fd + ov, 3.2);
  // v1.312: more front gables, one over each front window column, a little lower than the entry's
  if ((L.gables || 1) >= 2) {
    const sides = L.gables >= 3 ? [-1, 1] : [L.bay ? L.bay : 1];
    const sgw = fl * 0.22, sgH = gH * 0.78, sgL = Math.min(fd + ov, 2.6);
    for (const sd of sides) {
      const cx = sd * fl * 0.33;
      const sh = new THREE.Shape(); sh.moveTo(-sgw / 2 - 0.22, 0); sh.lineTo(sgw / 2 + 0.22, 0); sh.lineTo(0, sgH + 0.1); sh.lineTo(-sgw / 2 - 0.22, 0);
      add('roof', new THREE.ExtrudeGeometry(sh, { depth: sgL, bevelEnabled: false }), cx, wallH + 0.1, fd + ov - sgL);
      const tri = new THREE.Shape(); tri.moveTo(-sgw / 2, 0); tri.lineTo(sgw / 2, 0); tri.lineTo(0, sgH - 0.08); tri.lineTo(-sgw / 2, 0);
      add(L.rise ? 'brick' : 'trim', new THREE.ShapeGeometry(tri), cx, wallH + 0.1, fd + ov + 0.01);
      add('win', new THREE.CircleGeometry(0.17, 12, 0, Math.PI), cx, wallH + 0.1 + sgH * 0.32, fd + ov + 0.02);
      add('band', new THREE.RingGeometry(0.17, 0.24, 12, 1, 0, Math.PI), cx, wallH + 0.1 + sgH * 0.32, fd + ov + 0.025);
    }
  }
  {
    const sh = new THREE.Shape(); sh.moveTo(-gw / 2 - 0.25, 0); sh.lineTo(gw / 2 + 0.25, 0); sh.lineTo(0, gH + 0.12); sh.lineTo(-gw / 2 - 0.25, 0);
    const pr = new THREE.ExtrudeGeometry(sh, { depth: gL, bevelEnabled: false });
    add('roof', pr, 0, wallH + 0.1, fd + ov - gL);
    const tri = new THREE.Shape(); tri.moveTo(-gw / 2, 0); tri.lineTo(gw / 2, 0); tri.lineTo(0, gH - 0.1); tri.lineTo(-gw / 2, 0);
    add(L.stone ? 'stone' : (L.rise ? 'brick' : 'trim'), new THREE.ShapeGeometry(tri), 0, wallH + 0.1, fd + ov + 0.01);   // v1.312: a look's gables in its wall
    const vy = wallH + (L.rise ? Math.max(0.62, gH * 0.4) : 0.62);
    add('win', new THREE.CircleGeometry(0.22, 12), 0, vy, fd + ov + 0.02);
    add('band', new THREE.RingGeometry(0.22, 0.3, 12), 0, vy, fd + ov + 0.025);
  }

  // door: panelled slab, casing, transom, hood on brackets, knob, stoop step, porch light
  const dW = 0.95, dH = 2.1;
  add('door', box(dW, dH, 0.07), 0, dH / 2 + 0.12, fd + 0.04);
  for (const py of [0.55, 1.35]) for (const px of [-0.2, 0.2]) add('door', box(0.3, 0.55, 0.03), px, py + 0.12, fd + 0.09);
  add('trim', box(0.12, dH + 0.55, 0.08), -dW / 2 - 0.06, (dH + 0.55) / 2 + 0.12, fd + 0.05);
  add('trim', box(0.12, dH + 0.55, 0.08), dW / 2 + 0.06, (dH + 0.55) / 2 + 0.12, fd + 0.05);
  add('trim', box(dW + 0.36, 0.14, 0.1), 0, dH + 0.12 + 0.55 + 0.07, fd + 0.06);
  add('win', box(dW, 0.4, 0.04), 0, dH + 0.12 + 0.28, fd + 0.03);
  add('trim', box(dW, 0.06, 0.06), 0, dH + 0.12 + 0.04, fd + 0.05);
  if (!L.arch) {
  add('roof', box(dW + 1.0, 0.1, 0.9), 0, dH + 0.95, fd + 0.45, 0, 0.12);
  add('trim', box(dW + 1.04, 0.14, 0.06), 0, dH + 0.87, fd + 0.9);
  for (const s of [-1, 1]) add('trim', box(0.1, 0.4, 0.5), s * (dW / 2 + 0.4), dH + 0.66, fd + 0.28);
  } else {
    // v1.312: the two-storey arched entry. A fanlight over the door's transom, two columns either side of it up to
    // an arch at 4.6 m, a tall arched window inside the arch over the door; stone round it all on a stone house.
    const cxc = dW / 2 + 0.42, ay = 4.25, ar = cxc;          // the columns' line and the arch's spring and radius
    if (L.stone) add('stone2', box(2 * cxc + 0.9, ay + ar + 0.35, 0.05), 0, (ay + ar + 0.35) / 2, fd + 0.012);
    add('win', new THREE.CircleGeometry(dW / 2, 14, 0, Math.PI), 0, dH + 0.12 + 0.62, fd + 0.03);
    add('trim', new THREE.RingGeometry(dW / 2, dW / 2 + 0.1, 14, 1, 0, Math.PI), 0, dH + 0.12 + 0.62, fd + 0.05);
    for (const s of [-1, 1]) {
      add('trim', new THREE.CylinderGeometry(0.11, 0.12, ay - 0.3, 12), s * cxc, 0.3 + (ay - 0.3) / 2, fd + 0.17);
      add('trim', box(0.3, 0.3, 0.26), s * cxc, 0.15 + 0.12, fd + 0.15);                   // the column's base
      add('trim', box(0.3, 0.14, 0.26), s * cxc, ay + 0.02, fd + 0.15);                    // and its capital
    }
    add('trim', new THREE.TorusGeometry(ar, 0.1, 6, 16, Math.PI), 0, ay + 0.09, fd + 0.15);
    // the tall window inside the arch, with its own round head
    add('win', box(0.9, 0.75, 0.04), 0, 3.72, fd + 0.03);
    add('win', new THREE.CircleGeometry(0.45, 12, 0, Math.PI), 0, 4.1, fd + 0.03);
    add('trim', new THREE.RingGeometry(0.45, 0.53, 12, 1, 0, Math.PI), 0, 4.1, fd + 0.05);
    add('trim', box(0.08, 0.75, 0.06), -0.49, 3.72, fd + 0.05); add('trim', box(0.08, 0.75, 0.06), 0.49, 3.72, fd + 0.05);
    add('trim', box(1.1, 0.08, 0.14), 0, 3.32, fd + 0.07);
  }
  add('brass', new THREE.SphereGeometry(0.045, 8, 6), dW / 2 - 0.13, 1.07, fd + 0.11);
  add('band', box(1.6, 0.14, 0.4), 0, 0.19, fd + 0.2);
  add('brass', box(0.14, 0.26, 0.1), dW / 2 + 0.36, 1.95, fd + 0.08);

  // windows: glass, casing, muntin cross, sill, head cap, and shutters on the front
  function win(px, py, pz, w, h, shutters, ry = 0) {
    // local helper frame: the window lies in the plane z = pz facing +z (after ry)
    const c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, ly, lz) => [px + lx * c + lz * s, py + ly, pz - lx * s + lz * c];
    const put = (key, geo, lx, ly, lz) => { const p = at(lx, ly, lz); add(key, geo, p[0], p[1], p[2], ry); };
    put('win', box(w, h, 0.05), 0, 0, 0.0);
    put('trim', box(w + 0.2, 0.1, 0.07), 0, h / 2 + 0.05, 0.02);
    put('trim', box(0.1, h, 0.07), -w / 2 - 0.05, 0, 0.02);
    put('trim', box(0.1, h, 0.07), w / 2 + 0.05, 0, 0.02);
    put('trim', box(w + 0.34, 0.08, 0.18), 0, -h / 2 - 0.04, 0.07);
    put('trim', box(w + 0.3, 0.1, 0.12), 0, h / 2 + 0.14, 0.04);
    put('trim', box(0.045, h, 0.05), 0, 0, 0.035);
    put('trim', box(w, 0.045, 0.05), 0, 0, 0.035);
    if (shutters) for (const sd of [-1, 1]) {
      put('shut', box(w * 0.42, h + 0.06, 0.04), sd * (w / 2 + 0.12 + w * 0.21), 0, 0.03);
      for (const ly of [-h / 4, h / 4]) put('shut', box(w * 0.34, 0.03, 0.03), sd * (w / 2 + 0.12 + w * 0.21), ly, 0.055);
    }
  }
  const wo = fl * 0.28;
  for (const sd of [-1, 1]) {
    // v1.312: the bay's column gets the bay's windows instead (below)
    if (L.bay !== sd) {
      win(sd * wo, 1.5, fd + 0.03, 1.0, 1.2, true);
      win(sd * wo, 3.95, fd + 0.03, 1.0, 1.1, true);
      if (L.archWin) {   // an arched head over the upstairs window
        add('win', new THREE.CircleGeometry(0.5, 12, 0, Math.PI), sd * wo, 3.95 + 0.55, fd + 0.03);
        add('trim', new THREE.RingGeometry(0.5, 0.6, 12, 1, 0, Math.PI), sd * wo, 3.95 + 0.6, fd + 0.05);
      }
    }
    win(sd * wo, 1.5, -fd - 0.03, 0.9, 1.0, false, Math.PI);
    win(sd * wo, 3.95, -fd - 0.03, 0.9, 1.0, false, Math.PI);
    win(sd * (fl / 2 + 0.03), 1.5, 0, 0.8, 1.0, false, sd * Math.PI / 2);
    win(sd * (fl / 2 + 0.03), 3.95, 0, 0.8, 1.0, false, sd * Math.PI / 2);
  }
  // a small window over the door, under the gable
  if (!L.arch) win(0, 3.95, fd + 0.03, 0.8, 0.9, false);
  // v1.312: the three-sided bay, two storeys, 0.29 m proud of the wall, a lead cap at its top and windows on each face
  if (L.bay) {
    const bx = L.bay * wo, br = Math.min(0.95, fl * 0.12), bh = wallH - 0.75, bd = 0.33;
    const bg = new THREE.CylinderGeometry(br, br, bh, 3, 1, false, -Math.PI / 2, Math.PI); bg.scale(1, 1, bd);
    add('brick', bg, bx, 0.45 + bh / 2, fd);
    const cg = new THREE.CylinderGeometry(br + 0.1, br + 0.1, 0.16, 3, 1, false, -Math.PI / 2, Math.PI); cg.scale(1, 1, (br * bd + 0.1) / (br + 0.1));
    add('roof', cg, bx, 0.45 + bh + 0.08, fd);
    add('band', new THREE.CylinderGeometry(br + 0.06, br + 0.06, 0.12, 3, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, (br * bd + 0.06) / (br + 0.06)), bx, 2.72, fd);
    const fz = fd + br * bd * Math.cos(Math.PI / 6) + 0.02;         // its front face
    const ang = Math.atan2(br * bd * Math.cos(Math.PI / 6), br * 0.5);  // the angled faces' turn off the wall
    for (const wy of [1.5, 3.95]) {
      win(bx, wy, fz, br * 0.8, wy < 2 ? 1.2 : 1.1, false);
      for (const s of [-1, 1]) {
        const ex = bx + s * br * 0.75, ez = fd + br * bd * Math.cos(Math.PI / 6) * 0.5 + 0.02;
        win(ex, wy, ez, br * 0.36, wy < 2 ? 1.1 : 1.0, false, s * ang);
      }
    }
  }

  // v1.216 (backlog D.27, Michael 13 Oct: "The houses are nice from the front, but the backyards look really
  // janky/unpolished"): the back was a bare brick face with four windows. It gets a back door (a half-glass door in its
  // casing under a small hood), a step, a light, the belt course the front has, a window over the door, and the things
  // a house has round the back: the electric meter, a hose reel on its bracket, the dryer vent. Below head height all of
  // it lies within 0.3 m of the wall (a body's radius), so nothing new can be walked through; collision is unchanged.
  {
    const bz = -fd - 0.04;   // the back face (the front frame's -z), a hair proud of the brick
    add('door', box(dW, dH, 0.07), 0, dH / 2 + 0.12, bz);
    add('win', box(dW * 0.62, 0.9, 0.04), 0, dH * 0.68 + 0.12, bz - 0.04);                       // its glass upper half
    for (const px of [-0.2, 0.2]) add('door', box(0.3, 0.55, 0.03), px, 0.55 + 0.12, bz - 0.05);   // two panels under it
    add('trim', box(0.12, dH + 0.1, 0.08), -dW / 2 - 0.06, (dH + 0.1) / 2 + 0.12, bz - 0.01);
    add('trim', box(0.12, dH + 0.1, 0.08), dW / 2 + 0.06, (dH + 0.1) / 2 + 0.12, bz - 0.01);
    add('trim', box(dW + 0.36, 0.12, 0.1), 0, dH + 0.12 + 0.11, bz - 0.02);
    add('roof', box(dW + 0.6, 0.08, 0.5), 0, dH + 0.42, bz - 0.25, 0, -0.14);                  // a small hood
    for (const sd of [-1, 1]) add('trim', box(0.06, 0.2, 0.3), sd * (dW / 2 + 0.22), dH + 0.27, bz - 0.15);   // on two brackets
    add('brass', new THREE.SphereGeometry(0.045, 8, 6), -dW / 2 + 0.13, 1.07, bz - 0.07);
    add('band', box(1.3, 0.14, 0.24), 0, 0.19, bz - 0.12);                                        // the step
    add('brass', box(0.12, 0.22, 0.09), -dW / 2 - 0.32, 1.9, bz - 0.05);                          // the light
    add('trim', box(fl + 0.04, 0.1, 0.05), 0, 2.72, bz - 0.01);                                   // the belt course
    win(0, 3.95, -fd - 0.03, 0.7, 0.8, false, Math.PI);                                           // a window over the door
    // the meter: a grey box with its round glass, near one back corner
    const mx = (hsh < 0.5 ? 1 : -1) * (fl / 2 - 0.7);
    add('metal', box(0.3, 0.42, 0.12), mx, 1.45, bz - 0.06);
    add('win', new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), mx, 1.5, bz - 0.13, 0, Math.PI / 2);
    add('metal', box(0.05, 1.05, 0.05), mx, 0.75, bz - 0.03);                                     // its conduit down
    // the hose reel on the other side of the door: a bracket, the drum and a coil of green hose, and the tap
    const hx2 = -mx * 0.55;
    add('metal', box(0.32, 0.1, 0.1), hx2, 0.95, bz - 0.05);
    add('shut', new THREE.CylinderGeometry(0.2, 0.2, 0.16, 14), hx2, 0.82, bz - 0.13, 0, Math.PI / 2);
    add('band', new THREE.TorusGeometry(0.21, 0.035, 6, 16), hx2, 0.82, bz - 0.13);
    add('brass', box(0.05, 0.08, 0.08), hx2 + 0.3, 0.55, bz - 0.04);
    // the dryer vent, low on the wall by the meter
    add('metal', box(0.18, 0.18, 0.08), mx - Math.sign(mx) * 0.75, 0.75, bz - 0.04);
    add('band', box(0.14, 0.03, 0.09), mx - Math.sign(mx) * 0.75, 0.7, bz - 0.06);
  }

  for (const k in buckets) {
    if (!buckets[k].length) continue;
    const m = new THREE.Mesh(_houseMergeParts(buckets[k]), mats[k]);
    m.castShadow = (k === 'roof' || k === 'trim'); m.receiveShadow = true;
    m.userData.part = k;   // v1.216: named for the tests (house-backs)
    front.add(m);
  }
}

function buildSuburbanHouse(scene, {
  x, z,                      // center of footprint
  width = 8, depth = 7,      // footprint
  brickColor = 0xa84a3a,     // dominant exterior color
  trimColor = 0xeae0d0,      // window/door trim
  roofColor = 0x5a4838,      // shingle color
  faceDir = 'south',         // which compass face the front door is on
                             //   'south' | 'north' | 'east' | 'west'
  porch = true,              // whether to add a small entry porch
  skirt = 0,                 // v1.24a: foundation depth below y=0 (sinks into a slope)
  detail = false,            // v1.104: the detailed Winnmark house (buildHouseDetail)
  look = null,               // v1.312: the real street's house style (buildHouseDetail's `look`)
}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const brickMat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.92 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: trimColor,  roughness: 0.6  });
  const roofMat  = new THREE.MeshStandardMaterial({ color: roofColor,  roughness: 0.85 });
  const doorMat  = new THREE.MeshStandardMaterial({ color: 0x3a2515,   roughness: 0.7  });
  const winMat   = new THREE.MeshStandardMaterial({
    color: 0x6a90b0, roughness: 0.4, metalness: 0.1,
    emissive: 0x1a2a3a, emissiveIntensity: 0.35,
  });

  // Faceward unit vector (which way the front door faces)
  const faceVec = {
    south: { x:  0, z:  1 }, north: { x: 0, z: -1 },
    east:  { x:  1, z:  0 }, west:  { x: -1, z:  0 },
  }[faceDir];

  // Main body — two stories, ~5.5m tall
  const wallH = 5.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, wallH, depth), brickMat);
  body.position.y = wallH / 2;
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // v1.24a: foundation skirt — a solid block extending BELOW y=0 so that on a
  // slope the downhill corners of the footprint are still backed by geometry
  // (no daylight gap under the house). The caller passes a skirt depth ≥ the
  // local corner drop. Slightly inset so it reads as a foundation, not the wall.
  if (skirt > 0) {
    const found = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.99, skirt + 0.2, depth * 0.99),
      new THREE.MeshStandardMaterial({ color: 0x9a9286, roughness: 0.95 })
    );
    found.position.y = -skirt / 2 + 0.1;   // top just above 0, bottom at -skirt
    found.receiveShadow = true;
    group.add(found);
  }

  const frontDepth = (faceDir === 'east' || faceDir === 'west') ? width/2 : depth/2;
  if (detail) buildHouseDetail(group, { width, depth, wallH, faceDir, brickColor, trimColor, roofColor, x, z, look });
  if (!detail) {   // v1.104: the original house front (no map builds it since v1.125)
  // Roof — pyramidal / hip roof. ConeGeometry with 4 segments rotated 45° = a hip.
  // Scale to match footprint (slightly larger so it overhangs).
  const roofH = 2.6;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, roofH, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  // Cone radius is 1; scale to roughly fit footprint + small overhang.
  // Use a sqrt(2)/2 factor so the *corner* of the rotated cone reaches the eaves.
  const roofXZ = Math.max(width, depth) * 0.62;
  roof.scale.set(roofXZ, 1, roofXZ);
  roof.position.y = wallH + roofH / 2;
  roof.castShadow = true;
  group.add(roof);

  // Front gable accent — a small triangular peak on the front face for that
  // arched-window suburban look. Doesn't have to be physically right; just reads.
  const gableW = width * 0.32;
  const gable = new THREE.Mesh(new THREE.ConeGeometry(1, 1.4, 4), roofMat);
  gable.rotation.y = Math.PI / 4;
  gable.scale.set(gableW * 0.62, 1, gableW * 0.62);
  gable.position.set(faceVec.x * (depth/2 - 0.2), wallH + 0.4, faceVec.z * (depth/2 - 0.2));
  // If facing east/west, flip the dimensions
  if (faceDir === 'east' || faceDir === 'west') {
    gable.position.set(faceVec.x * (width/2 - 0.2), wallH + 0.4, 0);
    // Actually for east/west facing the gable sits along the X edge — use X for depth
  }
  gable.castShadow = true;
  group.add(gable);

  // Door + porch — placed in the center of the front face
  const doorW = 0.95, doorH = 2.1;
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat);
  // Compute front-face center
  door.position.set(faceVec.x * (frontDepth + 0.04), doorH/2, faceVec.z * (frontDepth + 0.04));
  // Rotate door to lie flat against the face
  if (faceDir === 'east' || faceDir === 'west') door.rotation.y = Math.PI / 2;
  group.add(door);

  // Door trim — slightly larger box behind door
  const dTrim = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.16, doorH + 0.18, 0.04), trimMat);
  dTrim.position.copy(door.position);
  dTrim.position.x -= faceVec.x * 0.005;
  dTrim.position.z -= faceVec.z * 0.005;
  if (faceDir === 'east' || faceDir === 'west') dTrim.rotation.y = Math.PI / 2;
  group.add(dTrim);

  }

  // Front porch slab (concrete pad)
  if (porch) {
    const padW = 2.2, padD = 1.4;
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(
        (faceDir === 'east' || faceDir === 'west') ? padD : padW,
        0.12,
        (faceDir === 'east' || faceDir === 'west') ? padW : padD
      ),
      new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.95 })
    );
    pad.position.set(faceVec.x * (frontDepth + padD/2), 0.06, faceVec.z * (frontDepth + padD/2));
    pad.receiveShadow = true;
    group.add(pad);
  }

  if (!detail) {   // v1.104
  // Windows — 2 on front face (flanking door) at story 1, 2 at story 2
  // For front face, we want them spread along the face — perpendicular to faceVec.
  const rightVec = { x: -faceVec.z, z: faceVec.x }; // 90° clockwise of faceVec
  const winFaceLen = (faceDir === 'east' || faceDir === 'west') ? depth : width;
  const winOffset = winFaceLen * 0.28; // left/right spread
  const winW = 1.0, winH = 1.1;
  function addWin(side, story) {
    const sx = faceVec.x * (frontDepth + 0.04) + rightVec.x * winOffset * side;
    const sz = faceVec.z * (frontDepth + 0.04) + rightVec.z * winOffset * side;
    const wY = story === 1 ? 1.45 : 3.85;
    const w = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.05), winMat);
    w.position.set(sx, wY, sz);
    if (faceDir === 'east' || faceDir === 'west') w.rotation.y = Math.PI / 2;
    group.add(w);
    // Shutter trim flanking
    const sht = new THREE.Mesh(new THREE.BoxGeometry(0.18, winH, 0.04), trimMat);
    sht.position.set(sx + rightVec.x * (winW/2 + 0.1), wY, sz + rightVec.z * (winW/2 + 0.1));
    if (faceDir === 'east' || faceDir === 'west') sht.rotation.y = Math.PI / 2;
    group.add(sht);
    const sht2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, winH, 0.04), trimMat);
    sht2.position.set(sx - rightVec.x * (winW/2 + 0.1), wY, sz - rightVec.z * (winW/2 + 0.1));
    if (faceDir === 'east' || faceDir === 'west') sht2.rotation.y = Math.PI / 2;
    group.add(sht2);
  }
  addWin(-1, 1); addWin(1, 1);
  addWin(-1, 2); addWin(1, 2);

  // Back windows (smaller, plain) — opposite face from front
  function addBackWin(off, story) {
    const back = { x: -faceVec.x, z: -faceVec.z };
    const sx = back.x * (frontDepth + 0.04) + rightVec.x * off;
    const sz = back.z * (frontDepth + 0.04) + rightVec.z * off;
    const wY = story === 1 ? 1.45 : 3.85;
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.05), winMat);
    w.position.set(sx, wY, sz);
    if (faceDir === 'east' || faceDir === 'west') w.rotation.y = Math.PI / 2;
    group.add(w);
  }
  addBackWin(-winOffset, 1); addBackWin(winOffset, 1);
  addBackWin(-winOffset, 2); addBackWin(winOffset, 2);

  // Side windows — one per story per side
  function addSideWin(side, story) {
    // Side direction: rotate faceVec by 90 — same as rightVec, but using side sign
    const sideOff = (faceDir === 'east' || faceDir === 'west') ? depth/2 + 0.04 : width/2 + 0.04;
    const sx = rightVec.x * side * sideOff;
    const sz = rightVec.z * side * sideOff;
    const wY = story === 1 ? 1.45 : 3.85;
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.05), winMat);
    w.position.set(sx, wY, sz);
    // Side windows are perpendicular to front
    if (faceDir === 'north' || faceDir === 'south') w.rotation.y = Math.PI / 2;
    group.add(w);
  }
  addSideWin(-1, 1); addSideWin(1, 1);
  addSideWin(-1, 2); addSideWin(1, 2);
  }

  // v1.350 (D.70): where the front door is, for the holiday looks (addHolidayDecor), in the house's own frame
  group.userData.holidayFront = { fx: faceVec.x, fz: faceVec.z, d: frontDepth, half: (faceDir === 'east' || faceDir === 'west') ? depth / 2 : width / 2, h: wallH, porch };
  scene.add(group);

  // Return the AABB obstacle for collision/BB hits.
  // h is set to the eave height (wallH); roof is decorative for collision purposes.
  return {
    minX: x - width/2,  maxX: x + width/2,
    minZ: z - depth/2,  maxZ: z + depth/2,
    h: wallH,
    surface: 'hard',
    mesh: group,
  };
}

// --- Shared neighborhood-tree builder ---
// Big leafy tree — trunk + spherical canopy. Returns trunk obstacle (BBs hit
// the trunk but can pass over/under the canopy bulk).
// v1.113 (backlog D.3 step 2, Winnmark's trees and bushes). addSuburbanTree({ detail: true }) and
// addBush(..., { detail: true }) build a low-poly tree and shrub in place of the ball on a stick: a
// tapered trunk with a root flare and three limbs reaching into the crown, and a crown of five or six
// lumpy, flat-shaded clumps; a shrub is three or four clumps. The lumps come from a hash of each
// vertex's position, so clumps don't crack and the same tree looks the same every round. Each tree is
// still two meshes (bark, leaves) and each shrub one; materials are shared. Collision is unchanged.
const _plantMats = {};
function _plantMat(color, flat) {
  const k = color + (flat ? 'f' : '');
  return _plantMats[k] || (_plantMats[k] = new THREE.MeshStandardMaterial({ color, roughness: flat ? 1.0 : 0.95, flatShading: !!flat }));
}
function _lumpyClump(r, seed, amt = 0.12) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = Math.abs(Math.sin(Math.round(x * 97) * 12.9898 + Math.round(y * 97) * 78.233 + Math.round(z * 97) * 37.719 + seed) * 43758.5453) % 1;
    const s = 1 + (h - 0.5) * 2 * amt;
    p.setXYZ(i, x * s, y * s, z * s);
  }
  return geo;
}
function _buildTreeDetail(scene, x, z, { trunkR, trunkH, leafR, baseY, leafColor }) {
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const M = (geo, px, py, pz, q) => ({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), q || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)) });
  // bark: trunk, root flare, three limbs (local to the trunk's centre)
  const bark = [
    M(new THREE.CylinderGeometry(trunkR * 0.72, trunkR, trunkH, 8), 0, 0, 0),
    M(new THREE.CylinderGeometry(trunkR * 0.98, trunkR * 1.5, 0.4, 8), 0, -trunkH / 2 + 0.2, 0),
  ];
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 3; k++) {
    const az = (seed + k / 3) * Math.PI * 2, tilt = 0.75 + 0.2 * ((seed * (k + 3) * 7) % 1);
    const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
    const bl = leafR * 0.85, y0 = trunkH / 2 - 0.35 - k * 0.3;
    bark.push(M(new THREE.CylinderGeometry(trunkR * 0.18, trunkR * 0.36, bl, 6),
      dir.x * bl / 2, y0 + dir.y * bl / 2, dir.z * bl / 2, new THREE.Quaternion().setFromUnitVectors(up, dir)));
  }
  const trunk = new THREE.Mesh(_houseMergeParts(bark), _plantMat(0x4a3018));
  trunk.position.set(x, baseY + trunkH / 2, z);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
  // crown: a core clump, a ring of four or five, and a crown top (local to the old sphere's centre)
  const leaves = [M(_lumpyClump(leafR * 0.78, seed), 0, 0, 0)];
  const ring = 4 + (seed > 0.5 ? 1 : 0);
  for (let k = 0; k < ring; k++) {
    const az = (seed * 3 + k / ring) * Math.PI * 2, hk = ((seed * 11 + k * 0.37) % 1);
    leaves.push(M(_lumpyClump(leafR * (0.5 + 0.12 * hk), seed + k + 1),
      Math.cos(az) * leafR * 0.52, leafR * (-0.2 + 0.3 * hk), Math.sin(az) * leafR * 0.52));
  }
  leaves.push(M(_lumpyClump(leafR * 0.5, seed + 9), leafR * 0.08, leafR * 0.5, -leafR * 0.05));
  const crown = new THREE.Mesh(_houseMergeParts(leaves), _plantMat(leafColor, true));
  crown.position.set(x, baseY + trunkH + leafR * 0.5, z);
  crown.castShadow = true;
  scene.add(crown);
  trunk.userData.crown = crown;
  return trunk;
}
// v1.313 (backlog D.55 step 5; docs/refs/winnmark.md gap 4, northcliff.md gap 1): the tall loblolly pine of the
// real streets. A straight bare trunk to 12-18 m (bark 0x5a4a3a), the dead stubs it keeps below the crown, three live
// limbs into a crown of lumpy clumps stacked up the top few metres. Two meshes, as the low-poly tree; the collision
// cylinder is the trunk's, as tall as the trunk.
function _buildPineDetail(scene, x, z, { trunkR, trunkH, leafR, baseY, leafColor }) {
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const M = (geo, px, py, pz, q) => ({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), q || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)) });
  const up = new THREE.Vector3(0, 1, 0);
  const tH = trunkH + leafR * 0.9;                 // the trunk runs on up into the crown
  const bark = [
    M(new THREE.CylinderGeometry(trunkR * 0.45, trunkR, tH, 8), 0, 0, 0),
    M(new THREE.CylinderGeometry(trunkR * 0.98, trunkR * 1.35, 0.35, 8), 0, -tH / 2 + 0.17, 0),
  ];
  for (let k = 0; k < 6; k++) {                    // three dead stubs low, three live limbs at the crown's foot
    const live = k >= 3, az = (seed * 5 + k * 0.41) * Math.PI * 2, tilt = live ? 1.0 : 1.35;
    const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
    const bl = live ? leafR * 0.8 : 0.5 + 0.3 * ((seed * (k + 2) * 7) % 1);
    const y0 = live ? trunkH - tH / 2 - 0.4 - (k - 3) * 0.5 : trunkH * (0.45 + 0.12 * k) - tH / 2;
    bark.push(M(new THREE.CylinderGeometry(trunkR * 0.08, trunkR * (live ? 0.26 : 0.14), bl, 5),
      dir.x * bl / 2, y0 + dir.y * bl / 2, dir.z * bl / 2, new THREE.Quaternion().setFromUnitVectors(up, dir)));
  }
  const trunk = new THREE.Mesh(_houseMergeParts(bark), _plantMat(0x5a4a3a));
  trunk.position.set(x, baseY + tH / 2, z);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
  // crown: a column of clumps narrowing upward, with three or four clumps hung off its sides
  const leaves = [];
  for (let k = 0; k < 3; k++) leaves.push(M(_lumpyClump(leafR * (0.72 - k * 0.15), seed + k), 0, leafR * k * 0.7, 0));
  const side = 3 + (seed > 0.5 ? 1 : 0);
  for (let k = 0; k < side; k++) {
    const az = (seed * 3 + k / side) * Math.PI * 2, hk = ((seed * 11 + k * 0.37) % 1);
    leaves.push(M(_lumpyClump(leafR * (0.4 + 0.1 * hk), seed + k + 4), Math.cos(az) * leafR * 0.55, leafR * (-0.15 + 0.6 * hk), Math.sin(az) * leafR * 0.55));
  }
  const crown = new THREE.Mesh(_houseMergeParts(leaves), _plantMat(leafColor, true));
  crown.position.set(x, baseY + trunkH + leafR * 0.3, z);
  crown.castShadow = true;
  scene.add(crown);
  trunk.userData.crown = crown;
  trunk.userData.loblolly = true;
  return trunk;
}
// v1.313: pine straw under the pines and in the beds: flat discs following the ground, merged into one mesh
function addPineStraw(scene, spots, groundY, color) {
  if (!spots.length) return null;
  const parts = [];
  for (const sp of spots) {
    const geo = new THREE.CircleGeometry(sp.r, 14); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(sp.x + p.getX(i), sp.z + p.getZ(i)) + 0.035);
    parts.push({ geo, m: new THREE.Matrix4().makeTranslation(sp.x, 0, sp.z) });
  }
  // each disc's y already holds the ground's height, so it moves only across
  const mesh = new THREE.Mesh(_houseMergeParts(parts), new THREE.MeshStandardMaterial({ color, roughness: 1.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  mesh.receiveShadow = true; mesh.name = 'pineStraw';
  scene.add(mesh);
  return mesh;
}
function _buildBushDetail(x, z) {
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const parts = [{ geo: _lumpyClump(0.5, seed, 0.15), m: new THREE.Matrix4() }];
  const n = 2 + (seed > 0.4 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const az = (seed + k / n) * Math.PI * 2;
    parts.push({ geo: _lumpyClump(0.36, seed + k + 1, 0.15), m: new THREE.Matrix4().makeTranslation(Math.cos(az) * 0.26, -0.12 + 0.1 * k, Math.sin(az) * 0.22) });
  }
  return _houseMergeParts(parts);
}

function addSuburbanTree(scene, x, z, opts = {}) {
  const trunkR = opts.trunkR ?? 0.32;
  const trunkH = opts.trunkH ?? (3.0 + gameRandom() * 1.5);
  const leafR  = opts.leafR  ?? (1.8 + gameRandom() * 0.7);
  const baseY  = opts.baseY ?? 0;   // v1.8: terrain ground height at (x,z)
  const shape  = opts.shape ?? 'round';   // 'round' (deciduous sphere) | 'pine' (conifer) | 'loblolly' (v1.313, detail)
  if (opts.detail && shape === 'loblolly') {   // v1.313: the tall pine (Winnmark, Northcliff)
    const leafColor = opts.leafColor ?? (gameRandom() < 0.5 ? 0x34482a : 0x3c5232);
    const trunk = _buildPineDetail(scene, x, z, { trunkR, trunkH, leafR, baseY, leafColor });
    trunk.userData.plantDetail = true;
    return { minX: x - trunkR, maxX: x + trunkR, minZ: z - trunkR, maxZ: z + trunkR,
      shape: 'cylinder', cx: x, cz: z, radius: trunkR, h: trunkH, surface: 'hard', mesh: trunk, baseY };
  }
  if (opts.detail && shape === 'round') {   // v1.113: the low-poly tree (Winnmark)
    const leafColor = opts.leafColor ?? (gameRandom() < 0.5 ? 0x3a5a2a : 0x4a6a35);
    const trunk = _buildTreeDetail(scene, x, z, { trunkR, trunkH, leafR, baseY, leafColor });
    trunk.userData.plantDetail = true;
    return { minX: x - trunkR, maxX: x + trunkR, minZ: z - trunkR, maxZ: z + trunkR,
      shape: 'cylinder', cx: x, cz: z, radius: trunkR, h: trunkH, surface: 'hard', mesh: trunk, baseY };
  }
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.85, trunkR, trunkH, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.95 })
  );
  trunk.position.set(x, baseY + trunkH/2, z);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
  const leafColor = opts.leafColor ?? (gameRandom() < 0.5 ? 0x3a5a2a : 0x4a6a35);
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 1.0 });
  if (shape === 'pine') {
    // Conifer — 3 stacked cones tapering upward (loblolly/Eastern white pine,
    // the classic North-Georgia riverside evergreen). v1.36e: the SKIRT now
    // starts high up the trunk (≥2.6m, clear above a 1.5m player's eye) so the
    // cone base no longer hangs at eye level blocking sightlines. The canopy
    // also sits taller relative to the trunk.
    const tiers = 3;
    // Skirt begins at 72% of the trunk but never below 2.6m — keeps the lower
    // trunk a clean, see-through pole at player height.
    const startY = baseY + Math.max(trunkH * 0.72, 2.6);
    const foliageH = trunkH * 1.15;            // tall canopy above the skirt
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const r = leafR * (1.1 - t * 0.7);         // wider at the bottom
      const coneH = foliageH / tiers * 1.5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, coneH, 8), leafMat);
      cone.position.set(x, startY + t * (foliageH / tiers) + coneH * 0.25, z);
      cone.castShadow = true;
      scene.add(cone);
    }
  } else {
    // Deciduous — single round crown (unchanged default for the street maps).
    const leafY = trunkH + leafR * 0.5;
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(leafR, 10, 8), leafMat);
    leaves.position.set(x, baseY + leafY, z);
    leaves.castShadow = true;
    scene.add(leaves);
  }
  // Trunk hitbox — v1.53: a true CYLINDER (radius = trunkR) instead of a square
  // AABB. The square gave ~41% phantom collision at the corners; the circle hugs
  // the visible trunk. AABB min/max kept as the broad-phase bound.
  return {
    minX: x - trunkR, maxX: x + trunkR,
    minZ: z - trunkR, maxZ: z + trunkR,
    shape: 'cylinder', cx: x, cz: z, radius: trunkR,
    h: trunkH, surface: 'hard', mesh: trunk, baseY,
  };
}

// --- Shared neighborhood-bush builder ---
// Low bush — a small ovoid. Player can walk around it; BBs at low height
// hit it (great for crouch-cover or peeking).
function addBush(scene, x, z, w = 1.2, h = 0.8, d = 1.0, color = null, baseY = 0, opts = {}) {
  const c = color ?? (gameRandom() < 0.5 ? 0x3e5a30 : 0x4a6a3a);
  const bush = opts.detail   // v1.113: the clumped shrub (Winnmark)
    ? new THREE.Mesh(_buildBushDetail(x, z), _plantMat(c, true))
    : new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 10, 8),
    new THREE.MeshStandardMaterial({ color: c, roughness: 1.0 })
  );
  if (opts.detail) bush.userData.plantDetail = true;
  bush.scale.set(w, h, d);
  bush.position.set(x, baseY + h * 0.5, z);
  bush.castShadow = bush.receiveShadow = true;
  scene.add(bush);
  return {
    minX: x - w*0.5, maxX: x + w*0.5,
    minZ: z - d*0.5, maxZ: z + d*0.5,
    h: h, surface: 'soft', mesh: bush, baseY,
  };
}

// --- Shared mailbox builder (street decor + small cover) ---
// v1.28k: rebuilt clean. The old version had three rotated "scrollwork" struts
// jutting off the post (read as a bent/broken post), an off-center body hung on
// an arm, and a floating flag — all jumbled in playtest. This is a simple,
// readable American curbside mailbox: straight post, a tunnel box centered ON
// TOP of the post, a clean side flag, a small cap. No filigree.
function addMailbox(scene, x, z, opts = {}) {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.55, metalness: 0.45 });
  const doorMat  = new THREE.MeshStandardMaterial({ color: 0x303034, roughness: 0.5, metalness: 0.4 });
  const flagMat  = new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.6 });

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  // v1.76: `facing` (yaw radians) rotates the whole mailbox so its door (+Z in
  // local space) points toward the road. Without it the door always faced +Z, so
  // south-side Winnmark boxes (road to their -Z) faced the house, not the street.
  const facing = opts.facing ?? 0;
  group.rotation.y = facing;

  const postH = 1.0;       // post height (box base sits on top)
  const mbLen = 0.42;      // front-to-back depth (box length, along Z)
  const mbR   = 0.135;     // body radius

  // Straight square wooden post.
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, postH, 0.09), metalMat);
  post.position.y = postH / 2;
  post.castShadow = true;
  group.add(post);

  // Box base/platform on the post (the flat board the mailbox is bolted to).
  const baseY = postH + 0.02;
  const board = new THREE.Mesh(new THREE.BoxGeometry(mbR * 2 + 0.04, 0.03, mbLen + 0.04), metalMat);
  board.position.y = baseY;
  board.castShadow = true;
  group.add(board);

  // === Mailbox body ===
  // A rounded mailbox = a flat-bottomed half-tube. Build it UNAMBIGUOUSLY as a
  // full short cylinder (the rounded top + sides) sitting on the board, axis
  // along Z, with its lower portion hidden behind/under the board edge. Using a
  // FULL cylinder (not a half) avoids the half-disc cap rotation that kept
  // mis-rendering. Center the cylinder so most of it reads as the rounded body.
  const bodyCY = baseY + 0.02 + mbR * 0.55;   // lift so it sits ON the board
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(mbR, mbR, mbLen, 18),
    metalMat
  );
  body.rotation.x = Math.PI / 2;               // lay axis along Z
  body.position.set(0, bodyCY, 0);
  body.castShadow = true;
  group.add(body);
  // Flatten the underside visually with a box skirt so it doesn't look like a
  // floating tube (fills the gap between the round body and the board).
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(mbR * 2, mbR * 0.6, mbLen), metalMat);
  skirt.position.set(0, baseY + 0.02 + mbR * 0.28, 0);
  group.add(skirt);

  // Front door — a slightly-proud disc on the +Z end (the face the player sees).
  const door = new THREE.Mesh(new THREE.CylinderGeometry(mbR * 0.9, mbR * 0.9, 0.02, 18), doorMat);
  door.rotation.x = Math.PI / 2;
  door.position.set(0, bodyCY, mbLen / 2 + 0.012);
  group.add(door);
  // Little knob on the door.
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), flagMat);
  knob.position.set(0, bodyCY - mbR * 0.4, mbLen / 2 + 0.03);
  group.add(knob);

  // Red flag on the +X side: a short vertical arm + a paddle, raised (mail's out).
  const flagArm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), flagMat);
  flagArm.position.set(mbR + 0.01, bodyCY + 0.06, mbLen * 0.22);
  group.add(flagArm);
  const flagPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.10, 0.12), flagMat);
  flagPaddle.position.set(mbR + 0.01, bodyCY + 0.12, mbLen * 0.22 + 0.07);
  group.add(flagPaddle);

  scene.add(group);

  // Hitbox: post + box, symmetric in X. v1.53: trimmed the 5cm Z padding so the
  // AABB hugs the actual mailbox body (it's a rectangular box, not round, so it
  // stays an AABB — just tighter).
  return {
    minX: x - 0.18, maxX: x + 0.18,
    minZ: z - mbLen / 2, maxZ: z + mbLen / 2,
    h: bodyCY + mbR, surface: 'metal', mesh: group,
  };
}

// --- Brick mailbox builder (v1.35b — Bunratty only) ---
// A masonry mailbox PILLAR like the reference photos: a brick column with a
// capped/stepped top, a small recessed metal mailbox set into the road-facing
// (+Z) front, an address plate, and a red side flag. Reads as the upscale
// brick-eclectic style of the Bunratty/Sentinel neighborhood (vs. Winnmark's
// plain metal curbside boxes). Returns an obstacle AABB + mesh, same shape as
// addMailbox, so placement/sinkObs/collision all work unchanged. `facing` is
// the yaw (radians) the front (+Z) should point toward; default 0 (faces +Z).
function addBrickMailbox(scene, x, z, opts = {}) {
  const facing = opts.facing || 0;
  // Warm brick palette with slight per-pillar variation (matches house stucco/
  // brick warmth). Mortar-ish trim for the cap.
  const brickTones = [0x9c5a3c, 0xa86848, 0x8f5236, 0xb06e4a, 0x95543a];
  const brickColor = brickTones[Math.floor(gameRandom() * brickTones.length)];
  const brickMat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.95, metalness: 0.0 });
  const capMat   = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.9 });  // limestone-ish cap
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x202024, roughness: 0.5, metalness: 0.5 });
  const doorMat  = new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.5, metalness: 0.4 });
  const flagMat  = new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.6 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 });

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = facing;

  // Column dimensions (footprint a touch under 0.6m so it's a believable pillar
  // but still a tidy curbside object).
  const colW = 0.54, colD = 0.5, colH = 1.5;

  // Main brick column.
  const col = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colD), brickMat);
  col.position.y = colH / 2;
  col.castShadow = col.receiveShadow = true;
  group.add(col);

  // A subtle wider base course at the bottom (reads as the pillar footing).
  const foot = new THREE.Mesh(new THREE.BoxGeometry(colW + 0.08, 0.12, colD + 0.08), brickMat);
  foot.position.y = 0.06;
  foot.castShadow = true;
  group.add(foot);

  // Stepped limestone cap on top (two courses: a wider slab + a smaller crown),
  // echoing the arched/capped tops in the references without costly geometry.
  const cap1 = new THREE.Mesh(new THREE.BoxGeometry(colW + 0.12, 0.10, colD + 0.12), capMat);
  cap1.position.y = colH + 0.05;
  cap1.castShadow = true;
  group.add(cap1);
  const cap2 = new THREE.Mesh(new THREE.BoxGeometry(colW - 0.06, 0.10, colD - 0.06), capMat);
  cap2.position.y = colH + 0.15;
  cap2.castShadow = true;
  group.add(cap2);

  // Recessed metal mailbox set into the FRONT (+Z) face near the top third.
  const boxY = colH - 0.34;
  const boxW = 0.34, boxH = 0.26, boxInset = 0.04;
  // Dark recess pocket so the box reads as inset, not stuck on.
  const recess = new THREE.Mesh(new THREE.BoxGeometry(boxW + 0.06, boxH + 0.06, 0.06), metalMat);
  recess.position.set(0, boxY, colD / 2 - 0.02);
  group.add(recess);
  // The little mailbox door (slightly proud of the recess).
  const door = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, 0.04), doorMat);
  door.position.set(0, boxY, colD / 2 + boxInset);
  door.castShadow = true;
  group.add(door);
  // Small knob.
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), metalMat);
  knob.position.set(0, boxY - boxH * 0.3, colD / 2 + boxInset + 0.02);
  group.add(knob);

  // Address plate below the box.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.02), plateMat);
  plate.position.set(0, boxY - 0.26, colD / 2 + 0.012);
  group.add(plate);

  // Red flag on the +X side of the box (raised).
  const flagArm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), flagMat);
  flagArm.position.set(boxW / 2 + 0.02, boxY + 0.04, colD / 2 + boxInset);
  group.add(flagArm);
  const flagPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.10, 0.11), flagMat);
  flagPaddle.position.set(boxW / 2 + 0.02, boxY + 0.10, colD / 2 + boxInset + 0.06);
  group.add(flagPaddle);

  scene.add(group);

  // Hitbox: the column footprint (axis-aligned; rotation is small/visual). Use
  // the larger of W/D as a symmetric half-extent so collision is forgiving and
  // doesn't depend on yaw. Brick → 'hard' surface (BBs ricochet, like a wall).
  const half = Math.max(colW, colD) / 2 + 0.05;
  return {
    minX: x - half, maxX: x + half,
    minZ: z - half, maxZ: z + half,
    h: colH + 0.2, surface: 'hard', mesh: group,
  };
}

// --- Wheeled hard-plastic curbside bin (garbage or recycle) ---
// Modeled on modern WastePro-style 95-gallon carts seen in Roswell, GA — flat lid,
// integrated handle bar across the back, two wheels on the sides. Can be tipped
// on its side (rotated 90° around X) for variety.
//
//   variant: 'garbage' → dark gray body, green lid, "GARBAGE" plate
//          : 'recycle' → blue body, lighter blue lid, white recycle decal
//   tipped:  bool — render on its side (rolled over by kids for cover)
function addCurbsideBin(scene, x, z, opts = {}) {
  const variant = opts.variant ?? 'garbage';
  const tipped  = !!opts.tipped;
  const facing  = propFacing(opts.facing ?? 0); // yaw (radians) — orientation of door/handle; v1.217: squared up
  const isRecycle = variant === 'recycle';

  const bodyColor = isRecycle ? 0x2a4a8a : 0x2a2a2e;
  const lidColor  = isRecycle ? 0x3a6aa0 : 0x4a7038; // recycle has slightly lighter blue lid; garbage has green lid
  const decalColor = 0xeeeeee;

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85 });
  const lidMat  = new THREE.MeshStandardMaterial({ color: lidColor,  roughness: 0.8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const decalMat = new THREE.MeshStandardMaterial({ color: decalColor, roughness: 0.5 });

  const group = new THREE.Group();
  // Bin body — slightly trapezoidal in real life; we use a simple tapered box look
  // by stacking two boxes (wider top, narrower bottom). The hard-plastic feel comes
  // from the lower roughness and the lid color contrast.
  const W = 0.62, H = 1.05, D = 0.7;
  if (opts.detail) buildBinDetail(group, { W, H, D, isRecycle, bodyMat, lidMat, wheelMat, decalMat });   // v1.115 (Winnmark)
  else {

  // Lower body (narrower at bottom)
  const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, H * 0.4, D * 0.9), bodyMat);
  bodyLower.position.y = H * 0.2;
  bodyLower.castShadow = bodyLower.receiveShadow = true;
  group.add(bodyLower);
  // Upper body (wider)
  const bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.6, D), bodyMat);
  bodyUpper.position.y = H * 0.7;
  bodyUpper.castShadow = bodyUpper.receiveShadow = true;
  group.add(bodyUpper);

  // Lid — slightly larger than top, sits flat
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.06, D + 0.04), lidMat);
  lid.position.y = H + 0.03;
  lid.castShadow = true;
  group.add(lid);

  // Handle bar on the back side (where you'd grip when pulling)
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, W * 0.9, 8), bodyMat);
  handleBar.rotation.z = Math.PI / 2;
  handleBar.position.set(0, H + 0.13, -D/2 - 0.06);
  group.add(handleBar);
  // Handle uprights
  for (const ux of [-W*0.35, W*0.35]) {
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), bodyMat);
    up.position.set(ux, H + 0.07, -D/2 - 0.06);
    group.add(up);
  }

  // Wheels — two, on the lower back sides
  for (const wx of [-W*0.45, W*0.45]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.13, -D/2 + 0.03);
    wheel.castShadow = true;
    group.add(wheel);
  }

  // Decal plate on front (the white label panel)
  const decal = new THREE.Mesh(new THREE.BoxGeometry(W * 0.55, H * 0.22, 0.012), decalMat);
  decal.position.set(0, H * 0.65, D/2 + 0.01);
  group.add(decal);
  // Recycle symbol — three small triangles approximated by a single rotated box
  if (isRecycle) {
    const sym = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.08, 3),
      new THREE.MeshStandardMaterial({ color: 0x2a8a3a, roughness: 0.6, side: THREE.DoubleSide })
    );
    sym.position.set(0, H * 0.42, D/2 + 0.012);
    sym.rotation.z = Math.PI;
    group.add(sym);
  }
  }

  // Position & rotation
  group.position.set(x, 0, z);
  group.rotation.y = facing;
  // If tipped, rotate around X so the bin lies on its side. Lid faces +Z post-rotation.
  // v1.217: what the turned bin covers, standing (W × D turned about its upright) or lying (its cross-section
  // turned about its length, which lies along z)
  const cf = Math.abs(Math.cos(facing)), sf = Math.abs(Math.sin(facing));
  const ex = cf * W / 2 + sf * D / 2, ez = sf * W / 2 + cf * D / 2, lieH = sf * W + cf * D;
  if (tipped) {
    group.rotation.x = -Math.PI / 2;
    // After rotating around X, the body's "up" is now +Z, so we need to drop
    // the group down so the side rests on the ground (v1.217: by half the turned cross-section's height, was D/2).
    group.position.y = lieH / 2;
    group.position.z = z + H / 2;   // v1.217: tipping swings the bin's length to -z from its base; centre it on its spot
  }
  scene.add(group);

  // AABB collision — tighter when standing, wider/flatter when tipped.
  // v1.53: trimmed the 5cm padding so the box hugs the actual bin body (it's a
  // rectangular wheelie bin, stays AABB).
  if (tipped) {
    return {
      minX: x - ex, maxX: x + ex,   // v1.217: the turned cross-section's width (ex here: W and D across x)
      minZ: z - H/2, maxZ: z + H/2,
      h: lieH, mesh: group, surface: 'metal',  // v1.33: hard plastic wheelie bin — BBs bounce, never stick (was 'soft', which caused BBs to embed all over the bin)
    };
  } else {
    return {
      minX: x - ex, maxX: x + ex,   // v1.217: the turned bin's bounds
      minZ: z - ez, maxZ: z + ez,
      h: H + 0.06, mesh: group, surface: 'metal',  // v1.33: see above
    };
  }
}

// --- Home Depot moving box ---
// A standard tan corrugated cardboard box with the Home Depot orange-and-white
// branding stripe on one face. Used as kid-fort cover. Can be stacked or rotated.
// v1.217 (backlog D.27): a yard prop's facing is squared to the nearest quarter turn, keeping a seventh of its twist
// (at most 6.75°), and its collision box is the box round what is drawn. A box at any angle with a collision box of
// its unturned size showed corners up to 0.55 m outside what stops you, and stopped you on air at its sides.
function propFacing(f) {
  const q = Math.round(f / (Math.PI / 2));
  return q * (Math.PI / 2) + (f - q * (Math.PI / 2)) * 0.15;
}
// v1.217 (backlog D.27): the yards' boxes, bins and plywood stacks are dropped at random spots, and some landed
// through an iron fence or a house wall, round a tree trunk, or inside another prop. Once the match is built, each such
// prop is slid out along its shallower overlap (5 cm clear), a few passes so a slide can't leave it in something else.
// Props that were placed on purpose against something (a kid fort's own bins and boxes, a stacked box) are left: only
// fences (tall, thin, metal), houses, tree trunks and other loose props count.
function settleYardProps(obstacles) {
  const isProp = o => o && o.mesh && o.mesh.userData && ['box', 'bin', 'plystack'].includes(o.mesh.userData.propDetail) &&
    o.shape !== 'obox' && !o._stacked && !o._isStacked && isFinite(o.minX);
  const props = obstacles.filter(isProp);
  if (!props.length) return 0;
  const isFence = o => o.surface === 'metal' && (o.h || 0) >= 1.3 && Math.min(o.maxX - o.minX, o.maxZ - o.minZ) <= 0.3;
  const walls = obstacles.filter(o => o !== null && !isProp(o) && o.shape !== 'obox' && o.shape !== 'cylinder' && isFinite(o.minX) &&
    ((o.h || 0) >= 5 || isFence(o)));
  const trunks = obstacles.filter(o => o && o.shape === 'cylinder' && isFinite(o.cx) && (o.radius || 0) < 0.8);
  const move = (p, dx, dz) => {
    p.minX += dx; p.maxX += dx; p.minZ += dz; p.maxZ += dz;
    if (p.mesh) { p.mesh.position.x += dx; p.mesh.position.z += dz; }
  };
  // v1.267: a slide is the depth the prop is in on that side, not the overlap's span (a fence inside a box's footprint
  // moved it 0.2 m and left it on the fence), and it takes the shortest of the four ways out that lands clear of every
  // fence, house and trunk, so two props can't push each other back into a wall (Seth's House: a box against a bin).
  const inWall = p => walls.some(o => Math.min(p.maxX, o.maxX) - Math.max(p.minX, o.minX) > 0.02 && Math.min(p.maxZ, o.maxZ) - Math.max(p.minZ, o.minZ) > 0.02) ||
    trunks.some(t => Math.hypot(t.cx - Math.max(p.minX, Math.min(t.cx, p.maxX)), t.cz - Math.max(p.minZ, Math.min(t.cz, p.maxZ))) < t.radius);
  let moved = 0;
  for (let pass = 0; pass < 6; pass++) {
    let any = false;
    for (const p of props) {
      for (const o of walls.concat(props)) {
        if (o === p) continue;
        const ox = Math.min(p.maxX, o.maxX) - Math.max(p.minX, o.minX), oz = Math.min(p.maxZ, o.maxZ) - Math.max(p.minZ, o.minZ);
        if (ox <= 0.02 || oz <= 0.02) continue;
        const ways = [[o.maxX - p.minX + 0.05, 0], [-(p.maxX - o.minX + 0.05), 0], [0, o.maxZ - p.minZ + 0.05], [0, -(p.maxZ - o.minZ + 0.05)]]
          .sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        const clear = ways.find(([dx, dz]) => !inWall({ minX: p.minX + dx, maxX: p.maxX + dx, minZ: p.minZ + dz, maxZ: p.maxZ + dz }));
        const [dx, dz] = clear || ways[0];
        move(p, dx, dz);
        any = true; moved++;
      }
      for (const t of trunks) {
        const qx = Math.max(p.minX, Math.min(t.cx, p.maxX)), qz = Math.max(p.minZ, Math.min(t.cz, p.maxZ));
        const dd = Math.hypot(t.cx - qx, t.cz - qz);
        if (dd >= t.radius) continue;
        const pcx = (p.minX + p.maxX) / 2, pcz = (p.minZ + p.maxZ) / 2;
        const ox = Math.min(p.maxX, t.cx + t.radius) - Math.max(p.minX, t.cx - t.radius), oz = Math.min(p.maxZ, t.cz + t.radius) - Math.max(p.minZ, t.cz - t.radius);
        if (ox < oz) move(p, (pcx >= t.cx ? 1 : -1) * (ox + 0.05), 0);
        else move(p, 0, (pcz >= t.cz ? 1 : -1) * (oz + 0.05));
        any = true; moved++;
      }
    }
    if (!any) break;
  }
  return moved;
}
function addHomeDepotBox(scene, x, z, opts = {}) {
  const w = opts.w ?? 1.1;
  const h = opts.h ?? 0.95;
  const d = opts.d ?? 0.95;
  const facing = propFacing(opts.facing ?? 0);   // v1.217
  const hx = Math.abs(Math.cos(facing)) * w / 2 + Math.abs(Math.sin(facing)) * d / 2;
  const hz = Math.abs(Math.sin(facing)) * w / 2 + Math.abs(Math.cos(facing)) * d / 2;

  const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xb88f5a, roughness: 0.95 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf06a0a, roughness: 0.85 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85 });

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = facing;

  if (opts.detail) { buildBoxDetail(group, { w, h, d, cardboardMat, orangeMat, whiteMat }); scene.add(group); return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, h, mesh: group, surface: 'soft' }; }   // v1.115 (Winnmark); v1.217: the turned box's bounds
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cardboardMat);
  body.position.y = h/2;
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Orange brand stripe across the front (+Z face) and back (-Z face)
  function addStripe(zSign) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.22, 0.012), orangeMat);
    stripe.position.set(0, h * 0.62, zSign * (d/2 + 0.006));
    group.add(stripe);
    // White rectangle inside for the "HOMER" logo block (we don't render text)
    const logoBg = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, h * 0.14, 0.014), whiteMat);
    logoBg.position.set(-w * 0.2, h * 0.62, zSign * (d/2 + 0.008));
    group.add(logoBg);
    // Small white "DEPOT" text suggestion — another thin white strip to the right
    const subStrip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, h * 0.08, 0.014), whiteMat);
    subStrip.position.set(w * 0.15, h * 0.62, zSign * (d/2 + 0.008));
    group.add(subStrip);
  }
  addStripe(+1);
  addStripe(-1);

  // Subtle flap lines on top (two horizontal grooves to show the box is closed)
  const flapMat = new THREE.MeshStandardMaterial({ color: 0xa07a4a, roughness: 0.95 });
  const flapLine = new THREE.Mesh(new THREE.BoxGeometry(w, 0.005, d * 0.02), flapMat);
  flapLine.position.set(0, h + 0.001, 0);
  group.add(flapLine);

  scene.add(group);
  return {
    minX: x - hx, maxX: x + hx,   // v1.217: the turned box's bounds
    minZ: z - hz, maxZ: z + hz,
    h, mesh: group, surface: 'soft',
  };
}

// v1.115 (backlog D.3 step 2, the yard props on Winnmark). addCurbsideBin({ detail: true }) and
// addHomeDepotBox({ detail: true }), and Winnmark's plywood stacks (buildPlyStack). The bin is a moulded cart: a body
// that tapers to the base, a rim, a lid with a front grab lip and hinge knuckles, the pull handle across the back, two
// tyres with hubs on an axle, a kick bar, and the label (and the recycle mark) set on the sloped front. The box gets two
// top flaps, packing tape over the seam and down both faces, and hand holes in the ends. The stack is sheets of mixed
// plywood on two 2x4 sleepers with a folding lawn chair (tube frame, woven webbing) laid on top. Every prop keeps its
// collision box; each merges into one mesh per material.
function _propMerge(group, buckets, mats) {
  for (const k in buckets) {
    if (!buckets[k].length) continue;
    const m = new THREE.Mesh(_houseMergeParts(buckets[k]), mats[k]);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
}
function _propAdder(buckets) {
  const _s = new THREE.Vector3(1, 1, 1);
  return (key, geo, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    (buckets[key] || (buckets[key] = [])).push({ geo,
      m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _s) });
  };
}
function buildBinDetail(group, { W, H, D, isRecycle, bodyMat, lidMat, wheelMat, decalMat }) {
  const mats = { body: bodyMat, lid: lidMat, wheel: wheelMat, decal: decalMat,
    hub: new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.6 }),
    ink: new THREE.MeshStandardMaterial({ color: isRecycle ? 0x2a8a3a : 0x2a2a2e, roughness: 0.6 }) };
  const b = {}; const add = _propAdder(b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const y0 = 0.05, y1 = H - 0.05, kb = 0.86;          // body runs y0..y1, the base kb of the top's size
  // body: a box whose bottom face is pulled in (the cart tapers to the base)
  const bodyGeo = box(1, 1, 1);
  const pa = bodyGeo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const top = pa.getY(i) > 0, k = top ? 1 : kb;
    pa.setXYZ(i, pa.getX(i) * W * k, top ? y1 : y0, pa.getZ(i) * D * k);
  }
  bodyGeo.computeVertexNormals();
  add('body', bodyGeo, 0, 0, 0);
  add('body', box(W + 0.03, 0.05, D + 0.03), 0, y1 + 0.005, 0);                       // rim
  add('lid', box(W + 0.05, 0.035, D + 0.06), 0, H + 0.0175 - 0.01, 0.005);            // lid
  add('lid', box(W * 0.55, 0.055, 0.03), 0, H - 0.02, D / 2 + 0.045);                 // front grab lip
  for (const hx of [-W * 0.32, 0, W * 0.32]) add('lid', new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), hx, H - 0.005, -D / 2 - 0.03, 0, 0, Math.PI / 2);   // hinge knuckles
  // pull handle across the back, on two brackets
  add('body', new THREE.CylinderGeometry(0.022, 0.022, W * 0.9, 8), 0, H - 0.06, -D / 2 - 0.08, 0, 0, Math.PI / 2);
  for (const ux of [-W * 0.4, W * 0.4]) add('body', box(0.04, 0.05, 0.1), ux, H - 0.06, -D / 2 - 0.035);
  // wheels: tyres, hubs, axle; a kick bar between them
  const wx = W * kb / 2 + 0.045, wy = 0.13, wz = -D / 2 + 0.07;
  for (const sx of [-1, 1]) {
    add('wheel', new THREE.CylinderGeometry(0.13, 0.13, 0.07, 16), sx * wx, wy, wz, 0, 0, Math.PI / 2);
    add('hub', new THREE.CylinderGeometry(0.06, 0.06, 0.075, 10), sx * wx, wy, wz, 0, 0, Math.PI / 2);
  }
  add('hub', new THREE.CylinderGeometry(0.015, 0.015, 2 * wx, 6), 0, wy, wz, 0, 0, Math.PI / 2);
  add('body', box(W * kb * 0.8, 0.06, 0.06), 0, 0.08, -D * kb / 2 - 0.01);
  // the sloped front: label and mark lie on it
  const lean = Math.atan2(D * (1 - kb) / 2, y1 - y0);
  const fz = (yy) => D * (kb + (1 - kb) * (yy - y0) / (y1 - y0)) / 2;
  const ly = H * 0.66;
  add('decal', box(W * 0.55, H * 0.2, 0.01), 0, ly, fz(ly) + 0.006, -lean);
  if (isRecycle) add('ink', new THREE.RingGeometry(0.05, 0.08, 3), 0, H * 0.4, fz(H * 0.4) + 0.008, -lean, 0, Math.PI);
  else for (const [lw, lyy] of [[0.24, ly + 0.03], [0.16, ly - 0.03]]) add('ink', box(lw, 0.025, 0.004), 0, lyy, fz(lyy) + 0.012, -lean);
  // two moulded ribs down each side
  for (const sx of [-1, 1]) for (const rz of [-0.12, 0.12]) {
    const mid = (y0 + y1) / 2, xs = W * (kb + (1 - kb) * 0.5) / 2;
    add('body', box(0.012, (y1 - y0) * 0.8, 0.03), sx * (xs + 0.004), mid, rz, 0, 0, sx * Math.atan2(W * (1 - kb) / 2, y1 - y0));
  }
  if (b.ink && isRecycle) mats.ink.side = THREE.DoubleSide;
  _propMerge(group, b, mats);
  group.userData.propDetail = 'bin';
}
function buildBoxDetail(group, { w, h, d, cardboardMat, orangeMat, whiteMat }) {
  const mats = { card: cardboardMat, orange: orangeMat, white: whiteMat,
    tape: new THREE.MeshStandardMaterial({ color: 0xc8a46a, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1.0 }) };
  const b = {}; const add = _propAdder(b);
  const box = (bw, bh, bd) => new THREE.BoxGeometry(bw, bh, bd);
  const ft = 0.012;
  add('card', box(w, h - ft, d), 0, (h - ft) / 2, 0);
  for (const sx of [-1, 1]) add('card', box(w / 2 - 0.004, ft, d), sx * (w / 4 + 0.001), h - ft / 2, 0, 0, 0, sx * -0.012);   // top flaps, a little proud at the seam
  add('dark', box(0.006, 0.004, d - 0.01), 0, h - ft - 0.001, 0);
  // packing tape over the seam and down both faces
  add('tape', box(0.07, 0.003, d + 0.004), 0, h + 0.001, 0);
  for (const sz of [-1, 1]) add('tape', box(0.07, 0.16, 0.003), 0, h - 0.08, sz * (d / 2 + 0.002));
  // hand holes in the ends
  for (const sx of [-1, 1]) add('dark', box(0.004, 0.045, 0.13), sx * (w / 2 + 0.001), h * 0.8, 0);
  // the store stripe and logo blocks, front and back
  for (const sz of [-1, 1]) {
    add('orange', box(w * 0.96, h * 0.22, 0.008), 0, h * 0.58, sz * (d / 2 + 0.004));
    add('white', box(w * 0.32, h * 0.14, 0.01), -w * 0.2, h * 0.58, sz * (d / 2 + 0.006));
    add('white', box(w * 0.36, h * 0.08, 0.01), w * 0.15, h * 0.58, sz * (d / 2 + 0.006));
  }
  // corner edges a shade darker (worn corrugated corners)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('dark', box(0.012, h - ft - 0.01, 0.012), sx * (w / 2 - 0.004), (h - ft) / 2, sz * (d / 2 - 0.004));
  _propMerge(group, b, mats);
  group.userData.propDetail = 'box';
}
function buildPlyStack(cx, gy, cz, seed) {
  const group = new THREE.Group();
  group.position.set(cx, gy, cz);
  const tones = [0xc8a878, 0xbf9c68, 0xd2b488, 0xb8945e];
  const mats = { s0: null, s1: null, s2: null, s3: null,
    lumber: new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.95 }),
    tube: new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.4, metalness: 0.3 }),
    webA: new THREE.MeshStandardMaterial({ color: 0x2a4a78, roughness: 0.85 }),
    webB: new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.85 }) };
  tones.forEach((c, i) => { mats['s' + i] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }); });
  const b = {}; const add = _propAdder(b);
  const box = (bw, bh, bd) => new THREE.BoxGeometry(bw, bh, bd);
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280 / 233280);
  for (const sx of [-0.55, 0.55]) add('lumber', box(0.09, 0.09, 0.88), sx, 0.045, 0);           // sleepers
  const n = 9, th = (0.5 - 0.09) / n;
  for (let i = 0; i < n; i++) {
    const ox = (rnd() - 0.5) * 0.03, oz = (rnd() - 0.5) * 0.03;
    add('s' + Math.floor(rnd() * 4), box(1.565, th - 0.003, 0.865), ox, 0.09 + th * (i + 0.5), oz, 0, (rnd() - 0.5) * 0.012, 0);
  }
  // folding lawn chair laid on top: tube frame, woven webbing
  const cy = 0.53, tilt = 0.2;
  const chair = [];
  for (const sz of [-0.53, 0.53]) chair.push(['tube', new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), 0, 0, sz, 0, 0, Math.PI / 2]);
  for (const sx of [-0.24, 0.24]) chair.push(['tube', new THREE.CylinderGeometry(0.012, 0.012, 1.08, 6), sx, 0, 0, Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i++) chair.push([i % 2 ? 'webB' : 'webA', box(0.47, 0.008, 0.09), 0, 0.004, -0.46 + i * 0.115]);
  for (let i = 0; i < 3; i++) chair.push([i % 2 ? 'webA' : 'webB', box(0.07, 0.009, 1.02), -0.16 + i * 0.16, 0.006, 0]);
  const cm = new THREE.Matrix4().compose(new THREE.Vector3(0.1, cy, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)), new THREE.Vector3(1, 1, 1));
  for (const [k, geo, px, py, pz, rx = 0, ry = 0, rz = 0] of chair) {
    add(k, geo, px, py, pz, rx, ry, rz);
    const last = b[k][b[k].length - 1]; last.m.premultiply(cm);
  }
  _propMerge(group, b, mats);
  group.userData.propDetail = 'plystack';
  return group;
}

// --- Parked car ---
// A boxy stylized car. Smaller than the placeholder I had — modeled around
// real sedan-ish dimensions (~3.6m long × 1.5m wide × 1.4m tall total).
// Hatchback-ish silhouette: lower body box + slightly tapered cabin + 4 wheels.
//
//   orientation: 0 = car facing +X, π/2 = car facing +Z. Affects body footprint AABB.
//   color: hex (default neutral blue-gray)
// v1.112 (backlog D.3, Michael: A on step 1 — go on to step 2, Winnmark's cars first). A detailed car for
// addCar({ detail: true }): a side-profile body with a sloped hood and trunk, wheel arches and a soft
// bevel, a glass greenhouse with roof, A/B/C pillars, bumpers, grille, head and tail lights, plates,
// door seams and handles, mirrors and hubcaps. Same footprint as the box car (3.6 × 1.55 m, beltline
// 1.15 m, cabin 1.15–1.70 m over x −1.15…0.85), so the two collision boxes still match what's drawn.
// The tyres stay separate meshes (cars.test.mjs and carSeatY read them); the rest merges into one
// mesh per material, as the v1.104 houses do.
function buildCarDetail(group, { carMat, winMat, len, width, wheelR, color }) {
  const mats = {
    body: carMat,
    glass: winMat,
    dark: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.8 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.35, metalness: 0.3 }),   // no env map: high metalness renders black
    head: new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.2, emissive: 0x302a18, emissiveIntensity: 0.4 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.4, emissive: 0x3a0a0a, emissiveIntensity: 0.3 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6 }),
  };
  const buckets = {}; for (const k in mats) buckets[k] = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
  function add(key, geo, px, py, pz, rx = 0, ry = 0, rz = 0) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    buckets[key].push({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), _q, _s) });
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const L = len / 2, W = width / 2;          // 1.8, 0.775
  const bev = 0.04;

  // --- body: side profile (x forward, y up), extruded across the width with a small bevel
  const arc = 0.37, sill = 0.25, a0 = Math.asin((sill - wheelR) / arc);   // arch meets the sill
  const sh = new THREE.Shape();
  sh.moveTo(-L + bev, 0.42);
  sh.lineTo(-L + bev, 0.95);
  sh.quadraticCurveTo(-L + bev, 1.1, -L + 0.18, 1.11);     // rear deck edge
  sh.lineTo(-1.15, 1.15 - bev);                           // trunk lid up to the rear glass
  sh.lineTo(0.85, 1.15 - bev);                            // beltline under the cabin
  sh.quadraticCurveTo(1.45, 1.13 - bev, L - 0.14, 1.04);  // hood falls to the nose
  sh.quadraticCurveTo(L - bev, 1.02, L - bev, 0.9);
  sh.lineTo(L - bev, 0.42);
  sh.lineTo(L - 0.2, sill);
  sh.absarc(1.2, wheelR, arc, a0, Math.PI - a0, false);   // front wheel arch
  sh.lineTo(-1.2 + arc * Math.cos(a0), sill);
  sh.absarc(-1.2, wheelR, arc, a0, Math.PI - a0, false);  // rear wheel arch
  sh.lineTo(-L + 0.2, sill);
  sh.lineTo(-L + bev, 0.42);
  const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 8 });
  add('body', bodyGeo, 0, 0, -(W - bev));

  // --- greenhouse: glass trapezoid, roof panel, pillars
  const gb0 = -1.12, gb1 = 0.82, gt0 = -0.8, gt1 = 0.25, gy0 = 1.1, gy1 = 1.64, gw = 1.36;
  const gs = new THREE.Shape();
  gs.moveTo(gb0, gy0); gs.lineTo(gb1, gy0); gs.lineTo(gt1, gy1); gs.lineTo(gt0, gy1); gs.lineTo(gb0, gy0);
  add('glass', new THREE.ExtrudeGeometry(gs, { depth: gw, bevelEnabled: false }), 0, 0, -gw / 2);
  add('body', box(gt1 - gt0 + 0.08, 0.05, gw + 0.04), (gt0 + gt1) / 2, gy1 + 0.02, 0);
  const pillar = (x0, y0, x1, y1, t, z) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
    add('body', box(l, t, 0.05), (x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(dy, dx));
  };
  for (const s of [-1, 1]) {
    const z = s * (gw / 2 + 0.005);
    pillar(gb1, gy0 + 0.04, gt1, gy1, 0.07, z);          // A
    pillar(gb0, gy0 + 0.04, gt0, gy1, 0.2, z);           // C, wider
    add('body', box(0.09, gy1 - gy0, 0.05), -0.2, (gy0 + gy1) / 2, z);   // B
    add('chrome', box(gb1 - gb0 - 0.1, 0.025, 0.03), (gb0 + gb1) / 2 - 0.02, gy0 + 0.03, s * (gw / 2 + 0.02));   // window line
  }

  // --- bumpers, grille, lights, plates
  for (const s of [-1, 1]) add('dark', box(0.16, 0.2, width + 0.04), s * (L - 0.02), 0.47, 0);
  add('dark', box(0.03, 0.16, 0.66), L + 0.005, 0.84, 0);
  for (const zs of [-1, 1]) {
    add('chrome', box(0.02, 0.02, 0.62), L + 0.02, 0.84 + zs * 0.04, 0);
    add('head', box(0.05, 0.12, 0.3), L - 0.02, 0.86, zs * 0.53);
    add('tail', box(0.05, 0.14, 0.34), -L + 0.02, 0.9, zs * 0.55);
    add('head', box(0.03, 0.05, 0.1), -L + 0.01, 0.9, zs * 0.3);   // reversing lamp
  }
  add('plate', box(0.02, 0.12, 0.32), L + 0.07, 0.5, 0);
  add('plate', box(0.02, 0.14, 0.34), -L - 0.07, 0.72, 0);
  add('chrome', new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), -L + 0.01, 0.33, 0.45, 0, 0, Math.PI / 2);   // exhaust

  // --- sides: door seams, handles, mirrors, a rub strip
  for (const s of [-1, 1]) {
    const z = s * (W + 0.004);
    for (const x of [0.78, -0.2, -1.08]) add('dark', box(0.015, x === -1.08 ? 0.5 : 0.72, 0.012), x, x === -1.08 ? 0.86 : 0.75, z);
    for (const x of [0.4, -0.58]) add('chrome', box(0.14, 0.03, 0.03), x, 0.98, s * (W + 0.01));
    add('dark', box(2.2, 0.05, 0.02), -0.1, 0.62, s * (W + 0.008));
    add('body', box(0.1, 0.1, 0.16), 0.72, 1.2, s * (W + 0.07));
    add('dark', box(0.04, 0.02, 0.1), 0.74, 1.14, s * (W + 0.03));
  }

  // --- hubcaps on the wheel faces (wheels at ±1.2, z ±(W + 0.05))
  for (const wx of [-1.2, 1.2]) for (const s of [-1, 1]) {
    add('chrome', new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14), wx, wheelR, s * (W + 0.05 + 0.115), Math.PI / 2);
    add('dark', new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), wx, wheelR, s * (W + 0.05 + 0.12), Math.PI / 2);
  }

  for (const k in buckets) {
    if (!buckets[k].length) continue;
    const m = new THREE.Mesh(_houseMergeParts(buckets[k]), mats[k]);
    m.castShadow = (k === 'body' || k === 'glass'); m.receiveShadow = (k === 'body');
    group.add(m);
  }
  group.userData.carDetail = true;
}

function addCar(scene, x, z, opts = {}) {
  const orientation = opts.orientation ?? 0; // radians
  const color = opts.color ?? 0x6a8aa8;
  const carMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.55 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a, roughness: 0.3, metalness: 0.2,
    emissive: 0x0a0f15, emissiveIntensity: 0.2,
  });

  // Dimensions in car-local frame (length along +X, height +Y, width +Z)
  const len = 3.6, width = 1.55, bodyH = 0.85;
  const cabinLen = 2.0, cabinH = 0.55, cabinW = 1.4;
  const wheelR = 0.30;

  const group = new THREE.Group();
  if (opts.detail) buildCarDetail(group, { carMat, winMat, len, width, wheelR, color });   // v1.112
  else {   // v1.112: the original box car (no map builds it since v1.126)
  // Body — sits with bottom at wheel-axle height
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, bodyH, width), carMat);
  body.position.set(0, wheelR + bodyH/2, 0);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  // Cabin — tapered slightly toward the front (shift center back so cabin sits over rear axle)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinH, cabinW), carMat);
  cabin.position.set(-0.15, wheelR + bodyH + cabinH/2, 0);
  cabin.castShadow = true;
  group.add(cabin);
  // Windshield — slanted dark glass on the front of the cabin
  const wsh = new THREE.Mesh(new THREE.BoxGeometry(0.02, cabinH * 0.85, cabinW * 0.9), winMat);
  wsh.position.set(-0.15 + cabinLen/2 - 0.02, wheelR + bodyH + cabinH/2, 0);
  wsh.rotation.z = -0.3;
  group.add(wsh);
  // Rear window
  const rwsh = new THREE.Mesh(new THREE.BoxGeometry(0.02, cabinH * 0.85, cabinW * 0.9), winMat);
  rwsh.position.set(-0.15 - cabinLen/2 + 0.02, wheelR + bodyH + cabinH/2, 0);
  rwsh.rotation.z = 0.3;
  group.add(rwsh);
  // Side windows (left & right)
  for (const zSign of [-1, +1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(cabinLen * 0.85, cabinH * 0.8, 0.02), winMat);
    sw.position.set(-0.15, wheelR + bodyH + cabinH/2, zSign * (cabinW/2 + 0.005));
    group.add(sw);
  }
  // Headlights — two small white blocks on front face
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.3 });
  for (const zSign of [-1, +1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.25), hlMat);
    hl.position.set(len/2 - 0.025, wheelR + bodyH * 0.6, zSign * width * 0.3);
    group.add(hl);
  }
  // Taillights — red on the back
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.4, emissive: 0x3a0a0a, emissiveIntensity: 0.3 });
  for (const zSign of [-1, +1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.25), tlMat);
    tl.position.set(-len/2 + 0.025, wheelR + bodyH * 0.65, zSign * width * 0.3);
    group.add(tl);
  }
  }
  // Wheels — 4 of them
  const wheelGeom = new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 12);
  const wheelContacts = [];   // v1.87: car-local tread points, for seating on a slope (carSeatY)
  for (const [wx, wz] of [[-1.2, -0.7], [-1.2, 0.7], [1.2, -0.7], [1.2, 0.7]]) {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wheelR, wz * (width/2 + 0.05) / 0.7);
    wheel.castShadow = true;
    group.add(wheel);
    // v1.87: the lower arc of the tread (±60° about the bottom), on both edges.
    for (const t of [-0.11, 0.11]) for (let k = -4; k <= 4; k++) {
      const a = k * Math.PI / 12;
      wheelContacts.push({ x: wx + wheelR * Math.sin(a), y: wheelR - wheelR * Math.cos(a), z: wheel.position.z + t });
    }
  }

  group.position.set(x, 0, z);
  group.rotation.y = orientation;
  // v1.76: SLOPE FIT. On a sloped street a car built flat leaves the downhill
  // tires floating and the uphill tires buried. If the caller passes a ground-
  // normal fn, pitch+roll the car onto that normal so all four wheels sit on the
  // grade. We use 'YXZ' euler order so rotation.y stays the pure yaw — the obox
  // collision reads rotation.y and must not see the tilt (collision stays upright,
  // which is correct; only the visual tilts). Tilt is derived by expressing the
  // ground normal in the car's yawed local frame, then taking small-angle pitch
  // (along car length, local X) and roll (along width, local Z).
  if (typeof opts.groundNormalFn === 'function') {
    const n = opts.groundNormalFn(x, z);   // {nx, ny, nz} unit ground normal
    // Rotate the world normal into the car's local (post-yaw) frame.
    // v1.77: the inverse-yaw signs were flipped, which cross-fed the pitch
    // component into roll (and vice versa) — the "leaning sideways too much"
    // report. For a THREE Y-rotation by θ, the world→local map is:
    //   localX =  nx·cosθ + nz·sinθ      localZ = -nx·sinθ + nz·cosθ
    const cy = Math.cos(orientation), sy = Math.sin(orientation);
    const lnx =  n.nx * cy + n.nz * sy;    // component along car's local +X (length)
    const lnz = -n.nx * sy + n.nz * cy;    // component along car's local +Z (width)
    const ny  =  Math.max(0.2, n.ny);
    // Pitch (nose up/down) tilts about local Z; roll (lean side) about local X.
    const pitch = Math.atan2(lnx, ny);     // + when uphill is toward +X
    const roll  = Math.atan2(lnz, ny);
    group.rotation.order = 'YXZ';
    group.rotation.x = roll;               // v1.87: was -roll, which leaned INTO the hill (rotation.x > 0 lowers +Z)
    group.rotation.z = -pitch;             // nose follows the grade
  }
  scene.add(group);

  // v1.54/v1.54a: TWO collision boxes instead of one tall box over the whole
  // car, AND they're ORIENTED (obox) rather than axis-aligned — a car parked at
  // an angle (orientation 0.2, random atan2±0.3, etc.) had its rotated mesh
  // corners poke ~0.3m outside the old axis-aligned AABB, leaving the rear
  // corners with no collision (the "rear-left shoots through" report). Each box
  // now carries its center + local half-extents + angle; the min/max envelope is
  // kept only as a conservative broad-phase bound for any untaught code path.
  const bodyTop = wheelR + bodyH;                 // ~1.15
  // BODY oriented box, anchored to the car group: no local offset (centered on
  // the mesh origin), local half-extents len/2 × width/2, base at the mesh foot.
  const bodyObs = makeObox(group, 0, 0, len / 2, width / 2, 0, bodyTop, 'metal');
  // CABIN oriented box: local offset -0.15 along the car's local +X (the cabin
  // mesh's own offset), half-extents cabinLen/2 × cabinW/2, sitting on the body.
  const cabinObs = makeObox(group, -0.15, 0, cabinLen / 2, cabinW / 2, bodyTop, cabinH, 'metal');
  // Primary return is the body (so sinkObs chaining + mesh-sink is unchanged);
  // the cabin rides along on `_stacked` and is collected by car callers.
  bodyObs._stacked = cabinObs;
  bodyObs._wheelContacts = wheelContacts;   // v1.87: sinkObs seats a car by its tyres
  return bodyObs;
}

// v1.87: SEAT A CAR BY ITS TYRES. Two faults buried or floated cars on a slope:
//  1. sinkObs dropped every prop to the lowest ground under its footprint box; a
//     car already tilted onto the grade about its centre went down by the whole
//     drop across its length (tyres buried 10-60cm on Bunratty's lane).
//  2. addCar's tilt came from one finite-difference normal at the car's centre,
//     which misfits on curved ground (the bulb dimple), and its roll sign was
//     inverted: rotation.x > 0 LOWERS local +Z, so the car leaned into the hill.
// Here, called from sinkObs: re-fit pitch and roll to the ground under the four
// wheels (the least-squares plane through them), then return the group Y at which
// the most demanding tread point just touches the ground. No tyre goes below the
// ground; the others clear it only by the twist of the ground between them.
const _carSeatV = new THREE.Vector3();
function carSeatY(obs, groundY) {
  const grp = obs.mesh;
  const yaw = grp.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const px = grp.position.x, pz = grp.position.z;
  const gAt = (lx, lz) => groundY(px + lx * cy + lz * sy, pz - lx * sy + lz * cy);
  const WX = 1.2, WZ = 0.825;   // wheel centres, car-local (addCar: ±1.2, ±(width/2+0.05))
  const fL = gAt(WX, -WZ), fR = gAt(WX, WZ), rL = gAt(-WX, -WZ), rR = gAt(-WX, WZ);
  const slopeX = ((fL + fR) - (rL + rR)) / (4 * WX);   // rise per metre toward the nose
  const slopeZ = ((fR + rR) - (fL + rL)) / (4 * WZ);   // rise per metre toward local +Z
  grp.rotation.order = 'YXZ';
  grp.rotation.z = Math.atan(slopeX);    // + raises the nose
  grp.rotation.x = -Math.atan(slopeZ);   // - raises the +Z side
  let y = -Infinity;
  for (const p of obs._wheelContacts) {
    _carSeatV.set(p.x, p.y, p.z).applyEuler(grp.rotation);
    y = Math.max(y, groundY(px + _carSeatV.x, pz + _carSeatV.z) - _carSeatV.y);
  }
  return y;
}

// v1.54b: build an oriented-box obstacle ANCHORED to a mesh. Instead of baking
// a hand-computed world center + angle (which drifted out of sync with the
// THREE.js Y-rotation sign convention — the v1.54a bug), the box is defined by:
//   - the mesh it belongs to (its live world position + rotation.y ARE the box's
//     center + angle, so collision can never disagree with what's drawn),
//   - a LOCAL offset (offX,offZ) from the mesh origin, in the mesh's own frame,
//   - local half-extents (hx,hz) and a vertical span [baseYLocal, +h] relative
//     to the mesh base (sinkObs raises the mesh; we read mesh.position.y).
// resolveObox(o) computes the live world center/angle on demand. The min/max
// envelope is refreshed there too (broad-phase + AI cover-stand fallback).
function makeObox(mesh, offX, offZ, hx, hz, baseYLocal, h, surface) {
  const o = {
    shape: 'obox', mesh,
    offX, offZ, hx, hz, baseYLocal, h, surface,
    // placeholders; resolveObox fills these from the mesh transform.
    cx: 0, cz: 0, angle: 0, baseY: baseYLocal,
    minX: 0, maxX: 0, minZ: 0, maxZ: 0,
  };
  resolveObox(o);
  return o;
}

// Compute an obox's live world center, angle, vertical base, and AABB envelope
// from its anchor mesh's current transform. Call after the mesh has been placed/
// sunk. Cheap; also called lazily by the collision helpers so a moved mesh stays
// in sync automatically.
function resolveObox(o) {
  const m = o.mesh;
  const ax = m ? (m.rotation?.y || 0) : 0;      // mesh yaw IS the box angle
  const px = m ? (m.position?.x || 0) : 0;
  const pz = m ? (m.position?.z || 0) : 0;
  const py = m ? (m.position?.y || 0) : 0;
  // THREE.js Y-rotation: world = (lx*cos + lz*sin, -lx*sin + lz*cos). Apply it to
  // the local offset to get the box's world center — SAME convention as the mesh.
  const cos = Math.cos(ax), sin = Math.sin(ax);
  o.cx = px + (o.offX * cos + o.offZ * sin);
  o.cz = pz + (-o.offX * sin + o.offZ * cos);
  o.angle = ax;
  o.baseY = py + o.baseYLocal;
  // AABB envelope of the rotated box (broad-phase / AI fallback).
  const ca = Math.abs(cos), sa = Math.abs(sin);
  const envX = o.hx * ca + o.hz * sa;
  const envZ = o.hx * sa + o.hz * ca;
  o.minX = o.cx - envX; o.maxX = o.cx + envX;
  o.minZ = o.cz - envZ; o.maxZ = o.cz + envZ;
  return o;
}

// v1.54: push a car's BOTH collision boxes (lower body + upper cabin) into a
// list. Call after sinkObs so baseY is settled. Returns the body obstacle (for
// any caller that wants to keep a reference, e.g. cover bookkeeping).
function pushCarObs(list, carObs) {
  if (!carObs) return carObs;
  list.push(carObs);
  if (carObs._stacked) list.push(carObs._stacked);
  return carObs;
}

// ----------------------------------------------------------------------
// KID PLYWOOD FORT (v1.23) — replaces the old single-plank "forts".
// ----------------------------------------------------------------------
// A proper little kid-built fort: a U-shape of plywood walls that actually
// FACES the direction attackers come from. The tall back wall + two side
// "wings" give a defender real cover to crouch behind and peek over/around,
// instead of the old 0.2m-thin single plank that did nothing.
//
//   opts.faceDir : 'N'|'S'|'E'|'W' — the compass direction the ATTACKERS are
//                  coming FROM. The solid back wall is placed on that side so
//                  it shields the defender; the U opens toward the rear.
//   opts.width   : span of the back wall (default 3.6m)
//   opts.depth   : how far the side wings extend toward the rear (default 2.2m)
//   opts.h       : wall height (default 1.35m — peek-over height for a kid)
//
// Returns an ARRAY of AABB obstacle objects (back wall + 2 wings), all pushed
// to coverList by the caller. The first element (back wall) is the primary
// cover ref used for the placement anchor.
function buildKidFort(scene, x, z, opts = {}) {
  const faceDir = opts.faceDir || 'E';
  const W = opts.width ?? 3.6;
  const D = opts.depth ?? 2.2;
  // v1.76: walls raised 0.95 → 1.12. Playtest after the v1.73/74 firing-range
  // tuning: defenders were getting picked apart over the old chest-high wall. At
  // 1.12 the wall covers more torso while still sitting below the standing eye
  // (1.35), so the player can peek+shoot over it standing and duck fully when
  // crouched (eye 0.8). The corner bins (below) add the real vertical cover.
  const H = opts.h ?? 1.12;
  const t = 0.18; // plywood thickness
  // v1.76: add a wheelie bin at each of the 4 corners for believable, taller
  // vertical cover (kids dragging the neighborhood bins over to shore up their
  // fort). On by default; opts.cornerBins:false disables. Returned as extra
  // obstacles so they collide + count as cover like the walls.
  const cornerBins = opts.cornerBins !== false;

  const plyMat   = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.92 });
  const plyMat2  = new THREE.MeshStandardMaterial({ color: 0xb89058, roughness: 0.92 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 });

  // Build the fort in a local frame where the back wall faces -Z (i.e. attackers
  // are to the -Z side / "north"), wings run toward +Z, then rotate the whole
  // group so the back wall faces the requested attack direction.
  const group = new THREE.Group();
  const detail = !!opts.detail;   // v1.114: Winnmark's forts are the built-up fort (buildFortDetail)

  // Helper: a plywood panel of given full-size, centered at local (lx, lz),
  // with its long axis along X (spanX=true) or Z (spanX=false).
  function panel(lx, lz, length, spanX, mat) {
    if (detail) return { lx, lz, length, spanX };
    const geo = spanX
      ? new THREE.BoxGeometry(length, H, t)
      : new THREE.BoxGeometry(t, H, length);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(lx, H / 2, lz);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    // A couple of 2x4 frame studs on the inner face for kid-fort texture.
    const studGeo = new THREE.BoxGeometry(0.08, H * 0.96, 0.08);
    const studXs = spanX ? [-length * 0.32, 0, length * 0.32] : [0];
    const studZs = spanX ? [0] : [-length * 0.32, 0, length * 0.32];
    for (const sx of studXs) for (const sz of studZs) {
      const stud = new THREE.Mesh(studGeo, frameMat);
      stud.position.set(lx + sx, H * 0.48, lz + sz + (spanX ? t * 0.6 : 0) );
      if (!spanX) stud.position.set(lx + t * 0.6, H * 0.48, lz + sz);
      stud.castShadow = true;
      group.add(stud);
    }
    return { lx, lz, length, spanX };
  }

  // Back wall: spans X, sits at local z = -D/2 (the attacker-facing side).
  const back = panel(0, -D / 2, W, true, plyMat);
  // Two side wings: span Z, at local x = ±W/2, running from back to rear.
  const wingL = panel(-W / 2, 0, D, false, plyMat2);
  const wingR = panel( W / 2, 0, D, false, plyMat2);

  if (detail) buildFortDetail(group, { W, D, H, t, back, wingL, wingR, seed: Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 });

  // (v1.28k: removed the knee-high front "lip" pallet — it read as a stray brown
  // bar with no gameplay purpose and cluttered the fort's open side.)

  // Rotate so the back wall faces the attack direction. Local back faces -Z.
  // faceDir is where attackers come FROM, so the back wall normal should point
  // toward them. Map: N → -Z (no rotation), S → +Z (π), E → +X (−π/2), W → −X (π/2).
  let rotY = 0;
  if (faceDir === 'N')      rotY = 0;
  else if (faceDir === 'S') rotY = Math.PI;
  else if (faceDir === 'E') rotY = -Math.PI / 2;
  else if (faceDir === 'W') rotY = Math.PI / 2;
  group.rotation.y = rotY;
  group.position.set(x, 0, z);
  scene.add(group);

  // Compute world-space AABBs for the three walls. We rotate each panel's local
  // center + half-extents into world space. Since rotations are multiples of 90°,
  // a span along local X maps cleanly to world X or Z.
  const cos = Math.cos(rotY), sin = Math.sin(rotY);
  function worldAABB(p) {
    // local center
    const wx = x + p.lx * cos + p.lz * sin;
    const wz = z - p.lx * sin + p.lz * cos;
    // half extents: along-span = length/2, across = t/2 (in local frame).
    const halfAlong = p.length / 2, halfAcross = t / 2;
    // If spanX, along is local X, across is local Z. After a ±90°/180° rot these
    // stay axis-aligned, so just figure out which world axis "along" lands on.
    let hxLocal, hzLocal;
    if (p.spanX) { hxLocal = halfAlong; hzLocal = halfAcross; }
    else         { hxLocal = halfAcross; hzLocal = halfAlong; }
    // Rotating an axis-aligned half-extent box by a multiple of 90°:
    const hx = Math.abs(hxLocal * cos) + Math.abs(hzLocal * sin);
    const hz = Math.abs(hxLocal * sin) + Math.abs(hzLocal * cos);
    return {
      minX: wx - hx, maxX: wx + hx,
      minZ: wz - hz, maxZ: wz + hz,
      h: H, mesh: group, surface: 'hard',
    };
  }

  const backObs  = worldAABB(back);
  const wingLObs = worldAABB(wingL);
  const wingRObs = worldAABB(wingR);

  // v1.76: corner bins. Local corners are at (±W/2, ±D/2). Nudge each bin a little
  // INWARD from the exact corner so it tucks against the fort rather than floating
  // off the edge, then transform the local point into world space with the same
  // 90°-multiple rotation used for the walls. Alternate garbage/recycle around the
  // four corners, each facing outward-ish (toward the back/attacker side reads
  // best). These are added AFTER the walls in the return array.
  const binObs = [];
  if (cornerBins) {
    const inset = 0.34;                       // pull bins in from the corner
    const cornersLocal = [
      { lx: -W / 2 + inset, lz: -D / 2 + inset },  // back-left
      { lx:  W / 2 - inset, lz: -D / 2 + inset },  // back-right
      { lx: -W / 2 + inset, lz:  D / 2 - inset },  // front-left
      { lx:  W / 2 - inset, lz:  D / 2 - inset },  // front-right
    ];
    let bi = 0;
    for (const c of cornersLocal) {
      const wx = x + c.lx * cos + c.lz * sin;
      const wz = z - c.lx * sin + c.lz * cos;
      const variant = (bi % 2 === 0) ? 'garbage' : 'recycle';
      // Face the bin's door roughly outward from the fort center.
      const facing = Math.atan2(wx - x, wz - z);
      const bin = addCurbsideBin(scene, wx, wz, { variant, facing, detail });   // v1.115: the moulded cart with the built-up fort
      // Seat the bin's MESH at the fort's local floor (the caller lifts the fort
      // group via seatFortOnSlope / fortGY by tagging baseY on each returned obs;
      // the bin mesh is its own group, so we tag baseY and let the caller lift the
      // mesh the same way it lifts walls). Mark so callers can recognize fort bins.
      bin._fortBin = true;
      binObs.push(bin);
      bi++;
    }
  }

  // Return back wall first (primary cover ref for the anchor), then wings, then
  // the four corner bins (if any). Callers that lift the fort onto a slope iterate
  // the whole array tagging baseY / shifting mesh.position.y, so bins ride along.
  return [backObs, wingLObs, wingRObs, ...binObs];
}

// v1.114 (backlog D.3 step 2, the fort and yard props: Winnmark's kid fort). buildKidFort({ detail: true }) draws each
// wall as a real kid build instead of a solid slab: 4-ft plywood sheets of mismatched tones skinned on both faces of a
// 2x4 frame, a dark gap at each sheet joint, screw heads along the studs, a flat top plate, 2x4 rails and a diagonal
// brace on the inside, a post at every corner and wing end, and KEEP OUT sprayed on the attackers' face. Everything stays
// inside the three wall boxes (same footprint, top at H), so cover, collision and BBs don't change. One mesh per
// material, as the v1.104 houses.
let _fortPaintTex = null;
function _fortPaint() {
  if (_fortPaintTex) return _fortPaintTex;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
  const c = cv.getContext('2d');
  c.fillStyle = '#c3281e'; c.strokeStyle = '#c3281e';
  c.font = 'bold 92px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(256, 70); c.rotate(-0.04); c.fillText('KEEP OUT', 0, 0); c.restore();
  // drips under the letters, and an underline swipe
  const drips = [70, 118, 171, 236, 290, 352, 410, 452];
  drips.forEach((dx, i) => { c.fillRect(dx, 104, 5, 14 + ((i * 37) % 30)); c.beginPath(); c.arc(dx + 2.5, 118 + ((i * 37) % 30), 4, 0, Math.PI * 2); c.fill(); });
  c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, 140); c.quadraticCurveTo(256, 128, 455, 146); c.stroke();
  _fortPaintTex = new THREE.CanvasTexture(cv);
  return _fortPaintTex;
}
function buildFortDetail(group, { W, D, H, t, back, wingL, wingR, seed }) {
  const plyTones = [0xc4a06a, 0xb89058, 0xcfae7c];
  const mats = {
    ply0: new THREE.MeshStandardMaterial({ color: plyTones[0], roughness: 0.92 }),
    ply1: new THREE.MeshStandardMaterial({ color: plyTones[1], roughness: 0.92 }),
    ply2: new THREE.MeshStandardMaterial({ color: plyTones[2], roughness: 0.92 }),
    lumber: new THREE.MeshStandardMaterial({ color: 0xa8865a, roughness: 0.95 }),
    post: new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 }),
    gap: new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1.0 }),
    screw: new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.5, metalness: 0.3 }),
  };
  const buckets = {}; for (const k in mats) buckets[k] = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
  // A panel's frame: u along the wall, y up, n outward (toward the attackers for the back wall).
  function frame(p) {
    const yaw = p === back ? Math.PI : (p.lx < 0 ? -Math.PI / 2 : Math.PI / 2);
    return new THREE.Matrix4().compose(new THREE.Vector3(p.lx, 0, p.lz), _q.setFromEuler(_e.set(0, yaw, 0)), _s);
  }
  function add(key, geo, base, u, y, n, rz = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(u, y, n), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), _s);
    buckets[key].push({ geo, m: base ? new THREE.Matrix4().multiplyMatrices(base, m) : m });
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const skin = 0.025, plate = 0.04, sheetTop = H - plate;
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280 / 233280);

  for (const p of [back, wingL, wingR]) {
    const base = frame(p);
    // the back wall runs post to post; a wing runs from the back wall's inner face to its end post (u is +z on the
    // left wing, −z on the right)
    let u0 = -p.length / 2 + t / 2, u1 = p.length / 2 - t / 2;
    if (p === wingL) { u0 = -D / 2 + t / 2; u1 = D / 2 - t; }
    if (p === wingR) { u0 = -(D / 2 - t); u1 = D / 2 - t / 2; }
    const n = Math.max(1, Math.ceil((u1 - u0) / 1.22)), sw = (u1 - u0) / n;
    for (let i = 0; i < n; i++) {
      const uc = u0 + sw * (i + 0.5);
      for (const side of [1, -1]) {   // outer skin, inner skin
        const tone = 'ply' + Math.floor(rnd() * 3);
        add(tone, box(sw - 0.012, sheetTop, skin), base, uc, sheetTop / 2, side * (t / 2 - skin / 2));
      }
      if (i > 0) {   // the joint: a dark gap outside, a 2x4 stud over it inside
        add('gap', box(0.012, sheetTop - 0.02, t - 2 * skin + 0.004), base, u0 + sw * i, sheetTop / 2, 0);
        add('lumber', box(0.09, sheetTop - 0.04, 0.04), base, u0 + sw * i, sheetTop / 2, -(t / 2 + 0.02));
      }
      // screw heads in two stud lines per sheet
      for (const su of [-sw / 2 + 0.08, sw / 2 - 0.08]) for (let k = 0; k < 4; k++) {
        add('screw', box(0.018, 0.018, 0.006), base, uc + su, 0.14 + k * (sheetTop - 0.28) / 3, t / 2 + 0.002);
      }
    }
    // the top plate closes the hollow between the skins
    add('lumber', box(u1 - u0, plate, t), base, (u0 + u1) / 2, H - plate / 2, 0);
    // inside: a rail at hip height and a diagonal brace (the inside 2x4s stand 4 cm proud on the defender's side,
    // as the old studs did)
    add('lumber', box(u1 - u0 - 0.02, 0.09, 0.04), base, (u0 + u1) / 2, 0.55, -(t / 2 + 0.02));
    const bu = Math.min(1.1, (u1 - u0) * 0.5), bh = sheetTop - 0.25, bl = Math.hypot(bu, bh);
    add('lumber', box(bl, 0.08, 0.035), base, (u0 + u1) / 2, 0.12 + bh / 2, -(t / 2 + 0.0575), (p === wingR ? -1 : 1) * Math.atan2(bh, bu));
    if (p === back) {
      // KEEP OUT on the attackers' face (kept on its own mesh: it carries a texture)
      const paint = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.6, W * 0.72), Math.min(2.6, W * 0.72) * 0.3125),
        new THREE.MeshStandardMaterial({ map: _fortPaint(), transparent: true, alphaTest: 0.3, roughness: 0.9, depthWrite: false }));
      paint.applyMatrix4(new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(-0.1, H * 0.58, t / 2 + 0.004)));
      paint.userData.fortPaint = true;
      group.add(paint);
    }
  }
  // posts: the two back corners and the two wing ends, each a t-square post inside the wall boxes
  for (const sx of [-1, 1]) for (const pz of [-D / 2, D / 2 - t / 2]) {
    add('post', box(t, H, t), null, sx * W / 2, H / 2, pz);
    add('post', box(t, 0.02, t), null, sx * W / 2, H - 0.01, pz);
  }

  for (const k in buckets) {
    if (!buckets[k].length) continue;
    const m = new THREE.Mesh(_houseMergeParts(buckets[k]), mats[k]);
    m.castShadow = (k !== 'screw' && k !== 'gap'); m.receiveShadow = k.startsWith('ply') || k === 'lumber';
    group.add(m);
  }
  group.userData.fortDetail = true;
}
