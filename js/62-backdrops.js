
// ----------------------------------------------------------------------
// v1.252 (backlog D.24, Michael: B — generic backdrops for every map now, then map by map from his pictures):
// the view past the edge. Some maps ended in a hard line under an empty sky (the ground plane stopped inside the fog,
// or a flat field ran to nothing). addEdgeBackdrop() lays a ground skirt from each map's ground out past the fog and
// stands simple neighborhood scenery outside the playable bounds: rows of houses with roofs and windows, tree belts,
// shop strips, parking lots, playing fields, the street running on out of the court. It is scenery only: nothing goes
// in `obstacles`, so nobody walks into it, and nothing stands within 6 m of the bounds, past where BBs are dropped
// (bounds + 2 m across x, + 5 m along z, updateBBs). Everything is merged into one vertex-coloured mesh (plus one for
// lit windows at night), so a map pays one or two draw calls for it. It draws its own seeded random numbers, so the
// map's cover layout (built under withSeededRandom) is untouched. Each map's sides are listed in EDGE_BACKDROPS:
// `from` is where the scenery starts (metres past the bounds edge, past what the map already has there), `bands` what
// stands from there outward, `street` a road running on out of the map at that lateral offset.
const EDGE_BACKDROPS = {
  // v1.338 (D.51 step 1): Winnmark's course, pond, shared wood, the street to Winnmark Dr and the houses round them are
  // the map's own now (winnmarkRealScale and its scenery), on every side, so it takes no backdrop
  buildBunrattyCourtScene: {   // v1.303 (D.51 step 1): the woods, the street to the fork and the river are the map's own now
    N: { from: 9, bands: [['trees', 20], ['houses', 22], ['trees', 30]] },          // the backs of the Sentinae Chase houses
  },
  // v1.307 (D.51 step 3): the woods, the river and the far bank are the map's own now (no houses on the floodplain);
  // what stays is the backs of the Bunratty houses along the top of the bluff behind the field, and the woods past them
  buildHollowScene: {
    E: { from: 66, bands: [['houses', 22], ['trees', 40]] },
  },
  buildMarketLotScene: {
    N: { from: 20, bands: [['trees', 8], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 40]] },   // behind the store
    S: { from: 13, bands: [['shops', 22], ['trees', 8], ['houses', 22], ['trees', 40]] },                  // across the road
    W: { from: 7, bands: [['lot', 20], ['shops', 22], ['trees', 8], ['houses', 22], ['trees', 40]] },
    E: { from: 7, bands: [['road', 10], ['shops', 22], ['trees', 8], ['houses', 22], ['trees', 40]] },
  },
  buildNorthcliffScene: {
    N: { from: 9, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    S: { from: 10, bands: [['trees', 10], ['houses', 22], ['trees', 30]] },          // past the creek
    W: { from: 9, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    E: { from: 8, street: { at: 0 }, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
  },
  // v1.316: the twins' course. N has its own bank, road and woods; the sides a tree band before the neighbours
  // (docs/refs/northcliff.md gap 9)
  buildTwinsCourseScene: {
    W: { from: 9, bands: [['trees', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    E: { from: 9, bands: [['trees', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    S: { from: 18, bands: [['road', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },   // the street out front
  },
  buildTreehouseYardScene: {
    N: { from: 6, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    W: { from: 6, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    E: { from: 6, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    S: { from: 18, bands: [['road', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },   // the street out front
  },
  // v1.317: the Northcliff pool: the spur road north, then houses; trees everywhere else (the club is in the woods)
  buildNorthcliffPoolScene: {
    N: { from: 12, bands: [['trees', 8], ['houses', 22], ['trees', 30]] },
    S: { from: 6, bands: [['trees', 14], ['houses', 22], ['trees', 30]] },
    W: { from: 6, bands: [['trees', 10], ['houses', 22], ['trees', 30]] },
    E: { from: 6, bands: [['trees', 40]] },   // the side creek's ravine
  },
  buildBellfieldCourtScene: {
    N: { from: 9, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    S: { from: 9, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    W: { from: 9, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
    E: { from: 8, street: { at: 0 }, bands: [['houses', 22], ['trees', 10], ['houses', 22], ['trees', 30]] },
  },
  buildHighSchoolScene: {
    N: { from: 17, bands: [['trees', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 40]] },  // behind the school
    S: { from: 7, bands: [['field', 34], ['trees', 8], ['houses', 22], ['trees', 40]] },                   // the playing fields
    W: { from: 7, bands: [['field', 26], ['trees', 8], ['houses', 22], ['trees', 40]] },
    E: { from: 7, bands: [['lot', 20], ['road', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 40]] },
  },
  buildCountryClubScene: {
    N: { from: 17, bands: [['trees', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 40]] },  // behind the clubhouse
    S: { from: 7, bands: [['fairway', 40], ['trees', 12], ['houses', 22], ['trees', 40]] },
    W: { from: 7, bands: [['fairway', 30], ['trees', 12], ['houses', 22], ['trees', 40]] },
    E: { from: 7, bands: [['lot', 20], ['trees', 10], ['houses', 22], ['trees', 10], ['houses', 22], ['trees', 40]] },
  },
  buildGroceryStoreScene: {
    skirt: 0x45464a,   // asphalt: only the front windows look out, onto the store's own lot
    sky: { side: 'S', d: 110, color: 0x9cc8ea },   // indoors the background is the store's beige, so the windows get a sky of their own
    S: { from: 6, bands: [['lot', 26], ['road', 10], ['shops', 22], ['trees', 8], ['houses', 22], ['trees', 40]] },
  },
};
const _BD_WALLS = [0xd8d0bc, 0xc8b89a, 0xb8c4c8, 0xe0d8c8, 0x9aa894, 0xc4a888, 0xa8b0b8, 0xd4c4a0, 0xb89880, 0xe8e0d0];
const _BD_ROOFS = [0x4a4440, 0x5a4a3e, 0x3e4248, 0x6a5040, 0x524a46, 0x384030];
const _BD_SHOPS = [0xc8bca8, 0xa89880, 0xd0c8b8, 0x9a8a78, 0xb8b0a4, 0x8a7a6a];
const _BD_SIGNS = [0x8a2a24, 0x24486a, 0x2a5a34, 0xc89a2a, 0x5a2a5a, 0x2a2a2a];
const _BD_LEAF = [0x3e6a2e, 0x4a7834, 0x365e2a, 0x567c38, 0x2e5226, 0x46703a];
const _BD_PINE = [0x2a4a2a, 0x2e5030, 0x264426];
const _BD_CARS = [0x8a2020, 0x20304a, 0xc8c8c8, 0x2a2a2a, 0x5a6a7a, 0xd8d0b0, 0x2a4a2a];
let _bdIcosa = null;   // unit icosahedron, as a flat triangle list

// v1.350 (backlog D.70, Michael: B, 23 Oct: "holiday looks first, Halloween now ... shown around the real dates or
// switched on from the Pickup Game board; play unchanged"), step 1: the houses. From 17 October to 1 November by the
// computer's clock, every street house built by buildSuburbanHouse gets two jack-o'-lanterns on its step and one out on
// the walk, fake cobwebs across its two front corners under the eaves, and by night a lit orange porch light beside the
// door and the lanterns' faces glowing. Nothing is solid and nothing is added to the obstacles, so play is unchanged; it
// is built as four merged meshes for the whole map (lanterns, faces and lights, webs, the night glow), so a map's draw
// calls go up by four at most. Kids in costumes and the Pickup Game board's switch are the next steps.
// v1.361 (B.18, Michael 27 Oct: "I don't want it to overlap with the summer theme - maybe we park that & a Christmas theme
// for later expansions"): parked. No holiday look by the date or from the Pickup Game board while `parked` is set; the code
// stays for a later expansion, and the tests still reach it with `force` (or by clearing `parked`).
const Holiday = { force: null, match: null, parked: true };   // 'halloween' or 'none' sets it whatever the date (force: tests; match: v1.352, the board); null: by date
function holidayNow(date) {
  if (Holiday.force) return Holiday.force === 'none' ? null : Holiday.force;
  if (Holiday.parked) return null;   // v1.361: parked (B.18)
  if (Holiday.match) return Holiday.match === 'none' ? null : Holiday.match;   // v1.352: a Pickup Game's Holiday row
  return holidayByDate(date);
}
function holidayByDate(date) {
  const d = date || new Date(), m = d.getMonth(), day = d.getDate();
  return (m === 9 && day >= 17) || (m === 10 && day <= 1) ? 'halloween' : null;
}
let _webTex = null, _haloTex = null;
function holidayWebTexture() {
  if (_webTex) return _webTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.strokeStyle = 'rgba(245,245,240,0.9)'; c.lineWidth = 1.6;
  const spokes = 6, R = 124;   // a quarter web hung from the top-left corner
  for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * Math.PI / 2; c.beginPath(); c.moveTo(2, 2); c.lineTo(2 + Math.cos(a) * R, 2 + Math.sin(a) * R); c.stroke(); }
  c.lineWidth = 1.1;
  for (let r = 18; r < R; r += 17) {
    c.beginPath();
    for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * Math.PI / 2, rr = r * (i % 2 ? 0.93 : 1); const px = 2 + Math.cos(a) * rr, py = 2 + Math.sin(a) * rr; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
  }
  return (_webTex = new THREE.CanvasTexture(cv));
}
function holidayHaloTexture() {
  if (_haloTex) return _haloTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,170,70,0.85)'); gr.addColorStop(0.35, 'rgba(255,140,40,0.35)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  return (_haloTex = new THREE.CanvasTexture(cv));
}
// One merged geometry from many: each piece's non-indexed triangles moved by its matrix, coloured, uv kept
function holidayMerge(pieces) {
  let n = 0;
  const parts = pieces.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; g.applyMatrix4(p.m); n += g.attributes.position.count; return { g, c: p.c }; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const { g, c } of parts) {
    const k = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += k;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
// v1.353 (D.70 step 4): a house its own builder bakes into one mesh (Bunratty's) has no group of its own to carry
// holidayFront, so it leaves an empty marker at its door's threshold, facing (fx, fz), with the spots the builder picks:
// lanterns [along, out, y, r] (along: to the door's own right, -fz, fx; out: toward the street; y from the
// threshold), webs [along, out, top, side] from a front corner, light [along, out, y] or null
function holidayDoorMarker(x, y, z, fx, fz, spec) {
  const o = new THREE.Object3D();
  o.name = 'holidayDoor';
  o.position.set(x, y, z);
  o.userData.holidayFront = Object.assign({ fx, fz, d: 0, half: 0, h: 0, porch: false }, spec);
  return o;
}
function addHolidayDecor(built, timeOfDay) {
  if (!built || !built.scene || holidayNow() !== 'halloween') return null;
  const night = timeOfDay === 'night';
  const houses = [];
  built.scene.updateMatrixWorld(true);
  built.scene.traverse(o => { if (o.userData && o.userData.holidayFront) houses.push(o); });
  if (!houses.length) return null;
  const body = [], glow = [], webs = [], halos = [];
  const C = hex => new THREE.Color(hex);
  const ORANGE = C(0xe8741c), ORANGE2 = C(0xd8661a), STEM = C(0x4e5a22), LAMP = C(0x2a2a2a);
  const FACE = night ? C(0xffc040) : C(0x3a1c08), BULB = night ? C(0xffb050) : C(0xc8c0a8);
  const sphere = new THREE.SphereGeometry(1, 10, 7), stem = new THREE.CylinderGeometry(0.025, 0.035, 0.09, 6);
  const box = new THREE.BoxGeometry(1, 1, 1), web = new THREE.PlaneGeometry(1, 1), halo = new THREE.PlaneGeometry(1, 1);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const at = (hm, x, y, z, yaw, sx, sy, sz) => { Q.setFromAxisAngle(Y, yaw); return new THREE.Matrix4().multiplyMatrices(hm, M.compose(V.set(x, y, z), Q, Sc.set(sx, sy, sz))); };
  let lanterns = 0, nWebs = 0, lights = 0;
  houses.forEach((h, hi) => {
    const f = h.userData.holidayFront, hm = h.matrixWorld;
    const rx = -f.fz, rz = f.fx;                    // along the front, to the door's right
    const yaw = Math.atan2(f.fx, f.fz);            // a piece's +z faces the street
    const lantern = (along, out, y, r) => {
      const x = f.fx * (f.d + out) + rx * along, z = f.fz * (f.d + out) + rz * along;
      body.push({ geo: sphere.clone(), m: at(hm, x, y + r * 0.72, z, yaw, r, r * 0.75, r), c: (hi + lanterns) % 2 ? ORANGE : ORANGE2 });
      body.push({ geo: stem.clone(), m: at(hm, x, y + r * 1.44 + 0.03, z, yaw, r / 0.2, 1, r / 0.2), c: STEM });
      // the carved face on the street side: two eyes and a mouth
      const fe = r * 0.86, fm = r * 0.9, fy = y + r * 0.72;   // the sphere's face is nearer the middle off its axis
      for (const ex of [-0.38, 0.38]) glow.push({ geo: box.clone(), m: at(hm, x + f.fx * fe + rx * ex * r, fy + r * 0.22, z + f.fz * fe + rz * ex * r, yaw, r * 0.24, r * 0.2, r * 0.12), c: FACE });
      glow.push({ geo: box.clone(), m: at(hm, x + f.fx * fm, fy - r * 0.22, z + f.fz * fm, yaw, r * 0.7, r * 0.14, r * 0.12), c: FACE });
      lanterns++;
    };
    const step = f.porch ? 0.12 : 0;
    // v1.353: a door marker (holidayDoorMarker) brings its own spots: [along, out, y, r] each
    const spots = f.lanterns || [[-0.78, 0.45, step, 0.2],   // either side of the door on the step
      [0.82, 0.5, step, 0.16], [1.5, 2.4, 0, 0.24]];           // and a big one out by the walk
    for (const sp of spots) lantern(...sp);
    // the porch light, beside the door at 2.2 m: a dark box with the bulb's face lit at night (v1.353: none where
    // the house has its own lanterns by the door, f.light null)
    if (f.light !== null) {
      const [la, lo, ly] = f.light || [-0.85, 0.07, 2.2];
      const lx = f.fx * (f.d + lo) + rx * la, lz = f.fz * (f.d + lo) + rz * la;
      body.push({ geo: box.clone(), m: at(hm, lx, ly, lz, yaw, 0.16, 0.24, 0.12), c: LAMP });
      glow.push({ geo: box.clone(), m: at(hm, lx + f.fx * 0.065, ly, lz + f.fz * 0.065, yaw, 0.11, 0.17, 0.01), c: BULB });
      lights++;
      if (night) halos.push({ geo: halo.clone(), m: at(hm, lx + f.fx * 0.09, ly, lz + f.fz * 0.09, yaw, 1.1, 1.1, 1), c: C(0xffffff) });
    }
    // cobwebs across the two front corners under the eaves: a quarter web from each corner, 1.3 m across (v1.353: a
    // marker's own corners, [along, out, top, side] each)
    const corners = f.webs || [-1, 1].map(side => [side * f.half, 0.06, f.h - 0.1, side]);
    for (const [ca, co, ct, side] of corners) {
      const s = 1.3, cx = f.fx * (f.d + co) + rx * (ca - side * s / 2), cz = f.fz * (f.d + co) + rz * (ca - side * s / 2);
      // the plane's uv (0,1) is the web's corner, on its local -x, which faces the door's right: the left one is mirrored
      webs.push({ geo: web.clone(), m: at(hm, cx, ct - s / 2, cz, yaw, side > 0 ? s : -s, s, 1), c: C(0xffffff) });
      nWebs++;
    }
  });
  const group = new THREE.Group();
  group.name = 'holidayDecor';
  const add = (pieces, mat, name) => { if (!pieces.length) return; const m = new THREE.Mesh(holidayMerge(pieces), mat); m.name = name; m.matrixAutoUpdate = false; group.add(m); };
  add(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), 'lanterns');
  add(glow, new THREE.MeshBasicMaterial({ vertexColors: true }), 'faces');
  add(webs, new THREE.MeshBasicMaterial({ map: holidayWebTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }), 'webs');
  add(halos, new THREE.MeshBasicMaterial({ map: holidayHaloTexture(), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), 'porchGlow');
  group.userData = { holiday: 'halloween', houses: houses.length, lanterns, webs: nWebs, lights, night };
  built.scene.add(group);
  return group;
}

// v1.351 (backlog D.70 step 2, Michael: B, "kids in costumes"): in Halloween season every kid in a match, both sides,
// wears a homemade costume picked by his name, so the same kid wears the same one every match: a witch's hat and cape,
// a vampire's cape and stand-up collar, a skeleton's bones on a black front, a devil's horns and tail, or cat ears and a
// tail; one kid in six is too old for it and comes as himself. A kid in a hat of his own keeps it and wears only the
// costume's body part; the crew bandana stays on under the ears, horns or brim, so you can still tell your side. It is
// all looks: the head pieces lower with his head (headExtras), the rest rides the torso, nothing changes a hitbox.
const KID_COSTUMES = {
  witch:    { head: 'witchHat', body: 'cape', cape: 0x2a1f3a, lining: 0x4a2f6a },
  vampire:  { body: 'cape', cape: 0x161416, lining: 0x9a1a22, collar: true },
  skeleton: { body: 'bones' },
  devil:    { head: 'horns', body: 'tail', tail: 0xb8241e },
  cat:      { head: 'ears', body: 'tail', tail: 0x1c1c1e },
};
const KID_COSTUME_ORDER = ['witch', 'vampire', 'skeleton', 'devil', 'cat', null];
function kidCostumeFor(charId) {
  if (holidayNow() !== 'halloween') return null;
  return KID_COSTUME_ORDER[_hashStringToSeed('costume|' + charId) % KID_COSTUME_ORDER.length];
}
function addKidCostume(kid, id, p) {
  const c = KID_COSTUMES[id];
  if (!c) return null;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const pieces = { head: null, body: null };
  const ownHat = kid.hat && !kid.hat.userData.crewBandana;
  if (c.head && !ownHat) {
    const b = {}; const add = _propAdder(b);
    const mats = { dark: _kidFaceMat('costume', 0x1a1a1c, 0.9), red: _kidFaceMat('costumeRed', 0xc42a20, 0.6),
      band: _kidFaceMat('costumeBand', 0x6a3a8a, 0.9), pink: _kidFaceMat('costumePink', 0xe8a0a8, 0.9) };
    const top = p.hairStyle === 'curly' ? 1.535 : p.hairStyle === 'wavy' ? 1.49 : 1.47;   // the top of his hair
    if (c.head === 'witchHat') {
      add('dark', new THREE.CylinderGeometry(0.27, 0.27, 0.016, 16), 0, top + 0.008, 0);   // the brim
      add('band', new THREE.CylinderGeometry(0.162, 0.168, 0.05, 12), 0, top + 0.04, 0);
      add('dark', new THREE.ConeGeometry(0.16, 0.4, 12), 0.02, top + 0.21, -0.02, -0.12, 0, -0.1);   // the crown, bent back a little
    } else if (c.head === 'horns') {
      for (const sx of [-1, 1]) add('red', new THREE.ConeGeometry(0.045, 0.15, 8), sx * 0.09, top + 0.06, 0.05, 0, 0, -sx * 0.35);
    } else if (c.head === 'ears') {
      for (const sx of [-1, 1]) {
        add('dark', new THREE.ConeGeometry(0.075, 0.14, 4), sx * 0.1, top + 0.055, 0.02, 0, Math.PI / 4, -sx * 0.15);
        add('pink', box(0.06, 0.06, 0.01), sx * 0.1, top + 0.035, 0.058, 0, 0, -sx * 0.15);
      }
    }
    const g = new THREE.Group(); g.userData.costume = id;
    _propMerge(g, b, mats);
    kid.group.add(g);
    kid.pose.headExtras.push({ mesh: g, baseY: g.position.y });
    pieces.head = g;
  }
  // the body part, on the torso (its frame: centre 0, 0.42 x 0.5 x 0.24, front face z 0.113)
  const b = {}; const add = _propAdder(b);
  const mats = { cape: _kidFaceMat('costumeCape', c.cape || 0x1a1a1c, 0.9), lining: _kidFaceMat('costumeLining', c.lining || 0x1a1a1c, 0.8),
    bone: _kidFaceMat('costumeBone', 0xece8dc, 0.7), black: _kidFaceMat('costume', 0x1a1a1c, 0.9), tail: _kidFaceMat('costumeTail', c.tail || 0x1a1a1c, 0.7) };
  if (c.body === 'cape') {
    add('cape', box(0.46, 0.6, 0.02), 0, -0.04, -0.142);        // from the shoulders to the backs of his knees' tops
    add('lining', box(0.44, 0.58, 0.006), 0, -0.04, -0.13);
    add('cape', box(0.05, 0.03, 0.26), 0.2, 0.245, 0);          // over each shoulder to the front, tied at the neck
    add('cape', box(0.05, 0.03, 0.26), -0.2, 0.245, 0);
    if (c.collar) add('lining', box(0.4, 0.16, 0.016), 0, 0.33, -0.135, -0.3, 0, 0);   // the stand-up collar behind his head
  } else if (c.body === 'bones') {
    add('black', box(0.36, 0.42, 0.008), 0, 0.0, 0.12);         // a black front, painted
    add('bone', box(0.045, 0.32, 0.004), 0, 0.03, 0.126);        // the breastbone
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1])
      add('bone', box(0.13, 0.03, 0.004), sx * 0.085, 0.15 - i * 0.065, 0.126, 0, 0, sx * (0.12 + i * 0.04));   // the ribs
    add('bone', box(0.18, 0.04, 0.004), 0, -0.17, 0.126);       // the hips
  } else if (c.body === 'tail') {
    // out from the back of his belt: a cat's curls up behind him, a devil's hangs down to an arrow tip
    add('tail', box(0.03, 0.03, 0.3), 0, -0.2, -0.24, id === 'devil' ? -0.55 : 0.55, 0, 0);
    if (id === 'devil') add('tail', new THREE.ConeGeometry(0.045, 0.07, 4), 0, -0.294, -0.394, -2.12, 0, 0);
  }
  const g = new THREE.Group(); g.userData.costume = id;
  _propMerge(g, b, mats);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  kid.torso.add(g);
  pieces.body = g;
  kid.costume = Object.assign({ id }, pieces);
  return kid.costume;
}

function addEdgeBackdrop(built, builderFn, timeOfDay) {
  const cfg = EDGE_BACKDROPS[builderFn];
  if (!cfg || !built || !built.scene || !built.bounds) return null;
  const scene = built.scene, B = built.bounds, night = (timeOfDay === 'night');
  const rnd = _mulberry32(_hashStringToSeed('backdrop|' + builderFn));
  const R = (a, b) => a + (b - a) * rnd();
  const pick = arr => arr[Math.floor(rnd() * arr.length) % arr.length];
  const gyFn = (typeof built.groundY === 'function') ? built.groundY : null;
  const fogFar = (scene.fog && scene.fog.far) || 100;

  // --- what is already there: the main ground (the widest low mesh), big flat planes past it, and every other mesh's
  // footprint, so the scenery stands clear of the map's own lake, golf course, store or tree wall.
  scene.updateMatrixWorld(true);
  const _bb = new THREE.Box3();
  const boxes = [];
  scene.traverse(m => {
    if (!m.isMesh || !m.geometry || (m.material && m.material.fog === false)) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    _bb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
    if (_bb.isEmpty()) return;
    boxes.push({ minX: _bb.min.x, maxX: _bb.max.x, minZ: _bb.min.z, maxZ: _bb.max.z, minY: _bb.min.y, maxY: _bb.max.y, mesh: m });
  });
  let ground = null;
  for (const b of boxes) {
    if (b.minY > 1) continue;
    const a = (b.maxX - b.minX) * (b.maxZ - b.minZ);
    if (!ground || a > ground.area) ground = Object.assign({ area: a }, b);
  }
  if (!ground) return null;
  const G = { minX: ground.minX, maxX: ground.maxX, minZ: ground.minZ, maxZ: ground.maxZ };
  const groundColor = (ground.mesh.material && ground.mesh.material.color) ? ground.mesh.material.color.getHex() : 0x5a8040;
  const flats = boxes.filter(b => b !== ground && b.mesh !== ground.mesh && (b.maxY - b.minY) < 0.5 && b.minY < 0.5 &&
    (b.maxX - b.minX > 30 || b.maxZ - b.minZ > 30) && (b.minX < G.minX || b.maxX > G.maxX || b.minZ < G.minZ || b.maxZ > G.maxZ));
  const CELL = 4, occ = new Set();
  const ck = (i, j) => i * 100003 + j;
  for (const b of boxes) {
    if (b.mesh === ground.mesh) continue;
    if (b.minX > B.minX && b.maxX < B.maxX && b.minZ > B.minZ && b.maxZ < B.maxZ) continue;   // inside the field of play
    if ((b.maxX - b.minX) > 400 || (b.maxZ - b.minZ) > 400) continue;
    for (let i = Math.floor((b.minX - 1) / CELL); i <= Math.floor((b.maxX + 1) / CELL); i++)
      for (let j = Math.floor((b.minZ - 1) / CELL); j <= Math.floor((b.maxZ + 1) / CELL); j++) occ.add(ck(i, j));
  }
  const clear = (x, z, r) => {
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) if (occ.has(ck(i, j))) return false;
    return true;
  };
  const clampG = (v, lo, hi) => Math.max(lo + 0.5, Math.min(hi - 0.5, v));
  const baseY = (x, z) => gyFn ? gyFn(clampG(x, G.minX, G.maxX), clampG(z, G.minZ, G.maxZ)) : ground.maxY;

  // --- the geometry: flat-shaded triangles with a colour per vertex
  const P = [], N = [], C = [], LP = [], LN = [], LC = [];
  const _c = new THREE.Color();
  function tri(a, b, c, col, lit) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    _c.setHex(col);
    const p = lit ? LP : P, n = lit ? LN : N, cc = lit ? LC : C;
    for (const v of [a, b, c]) { p.push(v[0], v[1], v[2]); n.push(nx, ny, nz); cc.push(_c.r, _c.g, _c.b); }
  }
  // a polygon (convex, 3-4 points) wound to face away from `inside`
  function face(pts, col, inside, lit) {
    const a = pts[0], b = pts[1], c = pts[2];
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const flip = (nx * (a[0] - inside[0]) + ny * (a[1] - inside[1]) + nz * (a[2] - inside[2])) < 0;
    const q = flip ? pts.slice().reverse() : pts;
    tri(q[0], q[1], q[2], col, lit);
    if (q.length === 4) tri(q[0], q[2], q[3], col, lit);
  }
  // local frame -> world: x across, y up, z toward the map (the front)
  const frame = (x, z, yaw) => { const s = Math.sin(yaw), c = Math.cos(yaw); return (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
  function box(T, y0, w, h, d, col, topCol, ox = 0, oz = 0) {
    const x0 = ox - w / 2, x1 = ox + w / 2, z0 = oz - d / 2, z1 = oz + d / 2, y1 = y0 + h;
    const v = (x, y, z) => T(x, y, z), inside = T(ox, y0 + h / 2, oz);
    face([v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], col, inside);
    face([v(x0, y0, z0), v(x1, y0, z0), v(x1, y1, z0), v(x0, y1, z0)], col, inside);
    face([v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)], col, inside);
    face([v(x1, y0, z0), v(x1, y0, z1), v(x1, y1, z1), v(x1, y1, z0)], col, inside);
    face([v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1)], topCol != null ? topCol : col, inside);
  }
  function pad(x0, z0, x1, z1, col, lift) {   // a flat world-aligned rectangle laid on the ground
    const nx = Math.max(1, Math.ceil((x1 - x0) / 8)), nz = Math.max(1, Math.ceil((z1 - z0) / 8));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const ax = x0 + (x1 - x0) * i / nx, bx = x0 + (x1 - x0) * (i + 1) / nx, az = z0 + (z1 - z0) * j / nz, bz = z0 + (z1 - z0) * (j + 1) / nz;
      const p = (x, z) => [x, baseY(x, z) + lift, z];
      face([p(ax, az), p(ax, bz), p(bx, bz), p(bx, az)], col, [(ax + bx) / 2, -1000, (az + bz) / 2]);
    }
  }

  // --- the ground skirt: from the map's own ground out past the fog, at its rim height, dipping under any water or
  // other flat plane the map runs past its ground
  const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
  const RR = Math.max(B.maxX - B.minX, B.maxZ - B.minZ) / 2 + fogFar + 20;
  const skirtCol = cfg.skirt != null ? cfg.skirt : groundColor;
  const lines = (lo, hi, c0, c1) => {
    const out = [c0, c1];
    for (let v = c0 - 12; v > lo; v -= 12) out.push(v);
    for (let v = c1 + 12; v < hi; v += 12) out.push(v);
    out.push(lo, hi); return out.sort((a, b) => a - b);
  };
  const xs = lines(cx - RR, cx + RR, G.minX, G.maxX), zs = lines(cz - RR, cz + RR, G.minZ, G.maxZ);
  const skirtY = (x, z) => {
    let y = baseY(x, z) - 0.08;
    for (const f of flats) if (x > f.minX - 13 && x < f.maxX + 13 && z > f.minZ - 13 && z < f.maxZ + 13) y = Math.min(y, f.minY - 0.12);
    return y;
  };
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
    const ax = xs[i], bx = xs[i + 1], az = zs[j], bz = zs[j + 1];
    if (bx - ax < 0.01 || bz - az < 0.01) continue;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (mx > G.minX && mx < G.maxX && mz > G.minZ && mz < G.maxZ) continue;
    if (mx > B.minX && mx < B.maxX && mz > B.minZ && mz < B.maxZ) continue;
    const p = (x, z) => [x, skirtY(x, z), z];
    face([p(ax, az), p(ax, bz), p(bx, bz), p(bx, az)], skirtCol, [mx, -1000, mz]);
  }
  const skirtVerts = P.length / 3;

  // --- the sides
  const SIDES = {
    N: { o: [0, -1], l: [1, 0], m: [cx, B.minZ], half: (B.maxX - B.minX) / 2 },
    S: { o: [0, 1], l: [1, 0], m: [cx, B.maxZ], half: (B.maxX - B.minX) / 2 },
    W: { o: [-1, 0], l: [0, 1], m: [B.minX, cz], half: (B.maxZ - B.minZ) / 2 },
    E: { o: [1, 0], l: [0, 1], m: [B.maxX, cz], half: (B.maxZ - B.minZ) / 2 },
  };
  const from = {};
  for (const k in SIDES) from[k] = cfg[k] ? Math.max(6, cfg[k].from || 6) : Infinity;
  const sideOf = (x, z) => {
    const e = { N: B.minZ - z, S: z - B.maxZ, W: B.minX - x, E: x - B.maxX };
    let best = null, bv = -Infinity;
    for (const k in e) { const v = e[k] - (isFinite(from[k]) ? from[k] : 1e6); if (v > bv) { bv = v; best = k; } }
    return best;
  };
  const stats = { houses: 0, trees: 0, shops: 0, cars: 0, pads: 0 };
  for (const k of ['N', 'S', 'W', 'E']) {
    const sc = cfg[k]; if (!sc) continue;
    const S = SIDES[k];
    const at = (lat, d) => [S.m[0] + S.o[0] * d + S.l[0] * lat, S.m[1] + S.o[1] * d + S.l[1] * lat];
    const faceYaw = Math.atan2(-S.o[0], -S.o[1]);   // local +z (the front) toward the map
    const mine = (x, z) => sideOf(x, z) === k;
    const ok = (x, z, r, d) => mine(x, z) && d - r >= from[k] && d <= fogFar + 10 && clear(x, z, r);
    const street = sc.street ? Object.assign({ w: 7 }, sc.street) : null;
    const inStreet = (lat, r) => street && Math.abs(lat - street.at) < street.w / 2 + 2.5 + r;
    const latPad = (d0, d1, lat0, lat1, col, lift) => {   // a pad given in the side frame, cut into 8 m cells
      for (let a = lat0; a < lat1 - 0.01; a += 8) for (let d = d0; d < d1 - 0.01; d += 8) {
        const a1 = Math.min(lat1, a + 8), dd1 = Math.min(d1, d + 8);
        const [mx, mz] = at((a + a1) / 2, (d + dd1) / 2);
        if (!mine(mx, mz) || !clear(mx, mz, 0.5) || (d + dd1) / 2 > fogFar + 20) continue;
        const p0 = at(a, d), p1 = at(a1, dd1);
        pad(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), col, lift);
        stats.pads++;
      }
    };
    function house(x, z, yaw) {
      const y = baseY(x, z) - 0.15, T = frame(x, z, yaw);
      const two = rnd() < 0.4, w = R(9, 12.5), d = R(7.5, 9.5), h = two ? R(5.2, 5.8) : R(2.8, 3.2);
      const wall = pick(_BD_WALLS), roof = pick(_BD_ROOFS);
      box((lx, ly, lz) => T(lx, ly, lz), y, w, h + 0.15, d, wall);
      // roof: a gable or a hip, with a short eave all round
      const o = 0.45, top = y + h + 0.15, rh = R(1.8, 2.8), hip = rnd() < 0.5;
      const rIn = hip ? Math.min(w / 2 - 0.5, d / 2) : 0;
      const A = T(-w / 2 - o, top, -d / 2 - o), Bq = T(w / 2 + o, top, -d / 2 - o), Cq = T(w / 2 + o, top, d / 2 + o), D = T(-w / 2 - o, top, d / 2 + o);
      const R1 = T(-w / 2 - o + rIn, top + rh, 0), R2 = T(w / 2 + o - rIn, top + rh, 0), mid = T(0, top + rh * 0.3, 0);
      face([A, Bq, R2, R1], roof, mid); face([D, Cq, R2, R1], roof, mid);
      face([A, D, R1], hip ? roof : wall, mid); face([Bq, Cq, R2], hip ? roof : wall, mid);
      // windows and a door on the face toward the map; at night some are lit
      const zf = d / 2 + 0.04, rows = two ? [y + 1.2, y + 3.9] : [y + 1.1];
      const n = Math.max(2, Math.round(w / 3.2));
      for (const wy of rows) for (let i = 0; i < n; i++) {
        const wx = -w / 2 + (i + 0.5) * w / n;
        if (wy === rows[0] && i === Math.floor(n / 2)) {   // the door
          face([T(wx - 0.5, y + 0.15, zf), T(wx + 0.5, y + 0.15, zf), T(wx + 0.5, y + 2.25, zf), T(wx - 0.5, y + 2.25, zf)], 0x3a2a1e, T(wx, y + 1, 0));
          continue;
        }
        const lit = night && rnd() < 0.35;
        face([T(wx - 0.6, wy, zf), T(wx + 0.6, wy, zf), T(wx + 0.6, wy + 1.3, zf), T(wx - 0.6, wy + 1.3, zf)], lit ? 0xffd890 : 0x2a3440, T(wx, wy, 0), lit);
      }
      stats.houses++;
    }
    function tree(x, z) {
      const y = baseY(x, z) - 0.2, T = frame(x, z, rnd() * 6.283);
      if (rnd() < 0.22) {   // a conifer
        const h = R(7, 12), r = R(1.8, 2.8), col = pick(_BD_PINE);
        box(T, y, 0.35, 1.6, 0.35, 0x4a3424);
        const apex = T(0, y + h, 0), seg = 6;
        for (let i = 0; i < seg; i++) {
          const a0 = i / seg * 6.283, a1 = (i + 1) / seg * 6.283;
          face([T(Math.cos(a0) * r, y + 1.2, Math.sin(a0) * r), T(Math.cos(a1) * r, y + 1.2, Math.sin(a1) * r), apex], col, T(0, y + h * 0.4, 0));
        }
      } else {
        const th = R(2.2, 3.6), r = R(2.2, 3.8), col = pick(_BD_LEAF);
        box(T, y, 0.4, th + 0.6, 0.4, 0x4a3828);
        if (!_bdIcosa) { const gi = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); _bdIcosa = Array.from(gi.attributes.position.array); gi.dispose(); }
        const cy = y + th + r * 0.75, sy = R(0.8, 1.05);
        for (let i = 0; i < _bdIcosa.length; i += 9) {
          const v = j => T(_bdIcosa[i + j] * r, cy + _bdIcosa[i + j + 1] * r * sy, _bdIcosa[i + j + 2] * r);
          face([v(0), v(3), v(6)], col, T(0, cy, 0));
        }
      }
      stats.trees++;
    }
    function shop(lat, d, w, dep) {
      const [x, z] = at(lat, d), y = baseY(x, z) - 0.15, T = frame(x, z, faceYaw);
      const h = R(4.8, 6.8), wall = pick(_BD_SHOPS);
      box(T, y, w, h, dep, wall, 0x6a6a6a);
      const zf = dep / 2 + 0.04, lit = night && rnd() < 0.6;   // a closed shop or two at night
      face([T(-w / 2 + 0.6, y + 0.2, zf), T(w / 2 - 0.6, y + 0.2, zf), T(w / 2 - 0.6, y + 2.8, zf), T(-w / 2 + 0.6, y + 2.8, zf)], lit ? 0xa89060 : 0x2a3640, T(0, y + 1, 0), lit);
      face([T(-w / 2 + 1.5, y + h - 1.5, zf + 0.02), T(w / 2 - 1.5, y + h - 1.5, zf + 0.02), T(w / 2 - 1.5, y + h - 0.4, zf + 0.02), T(-w / 2 + 1.5, y + h - 0.4, zf + 0.02)], pick(_BD_SIGNS), T(0, y + 1, 0));
      stats.shops++;
    }
    function car(x, z, yaw) {
      const y = baseY(x, z), T = frame(x, z, yaw), col = pick(_BD_CARS);
      box(T, y + 0.25, 1.8, 0.75, 4.3, col);
      box(T, y + 1.0, 1.6, 0.6, 2.2, 0x2a3038, col, 0, -0.2);
      stats.cars++;
    }

    let d0 = from[k];
    const latSpan = d => S.half + d + 4;
    // the street running out of the map, with its houses kept off it
    if (street) {
      const dEnd = Math.min(fogFar + 10, d0 + sc.bands.reduce((s, b) => s + b[1], 0));
      latPad(d0 - Math.max(0, d0 - 6), dEnd, street.at - street.w / 2, street.at + street.w / 2, 0x3a3a3c, 0.03);
      for (let d = 6 + 2; d < dEnd; d += 6) {
        const [x, z] = at(street.at, d);
        if (mine(x, z) && clear(x, z, 0.3)) { const T = frame(x, z, faceYaw); face([T(-0.08, baseY(x, z) + 0.05, -1.4), T(0.08, baseY(x, z) + 0.05, -1.4), T(0.08, baseY(x, z) + 0.05, 1.4), T(-0.08, baseY(x, z) + 0.05, 1.4)], 0xd8c050, T(0, -10, 0)); }
      }
    }
    for (const [kind, depth] of sc.bands) {
      const d1 = d0 + depth;
      if (d0 > fogFar + 10) break;
      if (kind === 'houses') {
        const dc = d0 + depth * 0.42;
        for (let lat = -latSpan(dc); lat < latSpan(dc); lat += R(14.5, 18)) {
          if (inStreet(lat, 6.5)) continue;
          const dd = dc + R(-1.2, 1.2);
          const [x, z] = at(lat, dd);
          let yaw = faceYaw;
          if (street && Math.abs(lat - street.at) < 22) yaw = faceYaw + (lat > street.at ? -1 : 1) * Math.PI / 2;   // houses on the street face it
          if (!ok(x, z, 7, dd)) continue;
          house(x, z, yaw);
          if (rnd() < 0.45) { const [tx, tz] = at(lat + R(7.5, 9), d0 + depth * R(0.65, 0.95)); if (ok(tx, tz, 3, d0 + depth * 0.8)) tree(tx, tz); }
        }
      } else if (kind === 'trees') {
        const step = 5.2;
        for (let d = d0 + 2.5; d < d1; d += step) for (let lat = -latSpan(d); lat < latSpan(d); lat += step) {
          if (rnd() < 0.28) continue;
          const la = lat + R(-1.8, 1.8), dd = d + R(-1.8, 1.8);
          if (inStreet(la, 2)) continue;
          const [x, z] = at(la, dd);
          if (ok(x, z, 2.5, dd)) tree(x, z);
        }
      } else if (kind === 'shops') {
        latPad(d0, d0 + 7, -latSpan(d0), latSpan(d0), 0x46474a, 0.03);
        for (let lat = -latSpan(d0 + 14); lat < latSpan(d0 + 14);) {
          const w = R(16, 30), dep = R(12, 15);
          const dc = d0 + 7.5 + dep / 2, [x, z] = at(lat + w / 2, dc);
          if (!inStreet(lat + w / 2, w / 2) && ok(x, z, Math.max(w, dep) / 2, dc)) shop(lat + w / 2, dc, w, dep);
          lat += w + R(2, 6);
        }
      } else if (kind === 'lot') {
        latPad(d0, d1, -latSpan(d0), latSpan(d0), 0x45464a, 0.03);
        for (let row = d0 + 4; row < d1 - 3; row += 11) for (let lat = -latSpan(row); lat < latSpan(row); lat += 2.8) {
          const [x, z] = at(lat, row);
          if (!mine(x, z) || !clear(x, z, 1)) continue;
          const T = frame(x, z, faceYaw), y = baseY(x, z) + 0.05;
          face([T(-1.4, y, -2.6), T(-1.3, y, -2.6), T(-1.3, y, 2.6), T(-1.4, y, 2.6)], 0xd8d8d0, T(0, -10, 0));
          if (rnd() < 0.45 && ok(x, z, 2.4, row)) car(x, z, faceYaw + (rnd() < 0.5 ? 0 : Math.PI));
        }
      } else if (kind === 'road') {
        latPad(d0 + 1.5, d0 + 2.5, -latSpan(d0), latSpan(d0), 0xa8a49a, 0.04);
        latPad(d0 + 2.5, d0 + 9.5, -latSpan(d0), latSpan(d0), 0x3a3a3c, 0.03);
        latPad(d0 + 9.5, d0 + 10.5, -latSpan(d0), latSpan(d0), 0xa8a49a, 0.04);
        for (let lat = -latSpan(d0); lat < latSpan(d0); lat += 6) {
          const [x, z] = at(lat, d0 + 6);
          if (!mine(x, z) || !clear(x, z, 0.5)) continue;
          const T = frame(x, z, faceYaw + Math.PI / 2), y = baseY(x, z) + 0.06;
          face([T(-0.08, y, -1.4), T(0.08, y, -1.4), T(0.08, y, 1.4), T(-0.08, y, 1.4)], 0xd8c050, T(0, -10, 0));
        }
      } else if (kind === 'field' || kind === 'fairway') {
        latPad(d0, d1, -latSpan(d0), latSpan(d0), kind === 'field' ? 0x6e9a48 : 0x7aa850, 0.02);
        if (kind === 'field') {   // a backstop and a pair of goals, so it reads as a playing field
          for (const [lat, dd] of [[-S.half * 0.45, d0 + depth * 0.5], [S.half * 0.45, d0 + depth * 0.5]]) {
            const [x, z] = at(lat, dd);
            if (!ok(x, z, 4, dd)) continue;
            const T = frame(x, z, faceYaw), y = baseY(x, z);
            box(T, y, 0.12, 2.4, 0.12, 0xe8e8e8, null, -3.6, 0); box(T, y, 0.12, 2.4, 0.12, 0xe8e8e8, null, 3.6, 0);
            box(T, y + 2.3, 7.3, 0.12, 0.12, 0xe8e8e8);
          }
        }
      }
      d0 = d1;
    }
  }
  if (!P.length) return null;
  const mk = (p, n, c, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = false;
    mesh.userData.backdrop = true;
    return mesh;
  };
  const group = new THREE.Group();
  group.name = 'edgeBackdrop';
  group.userData.backdrop = true;
  const main = mk(P, N, C, new THREE.MeshLambertMaterial({ vertexColors: true }));
  main.userData.skirtVerts = skirtVerts;
  group.add(main);
  if (LP.length) group.add(mk(LP, LN, LC, new THREE.MeshBasicMaterial({ vertexColors: true })));
  if (cfg.sky && !night) {   // a sky card behind the scenery (fog off, so it keeps its blue)
    const S = SIDES[cfg.sky.side], d = cfg.sky.d, W = 800;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, 260), new THREE.MeshBasicMaterial({ color: cfg.sky.color, fog: false }));
    sky.position.set(S.m[0] + S.o[0] * d, 110, S.m[1] + S.o[1] * d);
    sky.rotation.y = Math.atan2(-S.o[0], -S.o[1]);
    sky.userData.backdrop = true;
    group.add(sky);
  }
  scene.add(group);
  stats.tris = (P.length + LP.length) / 9;
  group.userData.stats = stats;
  built.backdrop = group;
  return group;
}
