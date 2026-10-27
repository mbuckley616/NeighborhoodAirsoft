
// ----------------------------------------------------------------------
// Winnmark Court main scene builder.
//   variant: 'seth_house'   → 1v1 vs Seth in his backyard (compact spawn)
//          : 'cul_de_sac'   → 3v1 vs Seth/Trey/Brooke spread across the street
//   timeOfDay: 'day' (default) | 'night'
// ----------------------------------------------------------------------
// v1.338 (D.51, card fable/d51-winnmark, step 1; Michael: real scale, 16 Oct; each match fenced to a today-sized part
// of the street, A, 26 Oct): Winnmark Court past today's box and its tree walls is the real place, in the map's own
// frame (the bulb at (-30, 0), the street running east). docs/refs/winnmark.md: the court runs about 265 m from Winnmark
// Dr to its bulb, nearly flat, falling 3-5 m west; the north lots back onto the golf course, the south lots onto one
// shared wood with a small creek that runs to the course, Winnmark Dr's houses on its far side; the pond lies north-west
// of the bulb, its creek running south along the course. Every term is exactly zero inside the box (WM_REAL.box), so the
// matches play on the ground they always had; steps 2-4 build the houses, Seth's lot and the play areas on it.
const WM_REAL = {
  box: { minX: -40, maxX: 42, minZ: -38, maxZ: 42 },
  drX: 235,                                             // Winnmark Dr at the court's mouth, 265 m from the bulb's centre
  // Winnmark Dr: north to Steeplechase, south past the junction, then round the shared wood to the south-west
  dr: [[235, -190], [235, 0], [233, 80], [210, 140], [160, 170], [100, 182], [20, 190], [-60, 196]],
  pond: { x: -105, z: -68, rx: 46, rz: 30, bed: -1.4, water: -0.3 },
  // Seth's creek [x, z, bed y], from the east through the shared wood to the course's creek west of the bulb
  // v1.340 (step 3): 2-3 m deeper than v1.338's, so Seth's back yard falls 3-4 m from his patio to it, as Michael's notes
  creek: [[262, 86, -2.4], [200, 72, -3.6], [130, 60, -4.6], [70, 58, -5.3], [10, 63, -5.9], [-50, 60, -6.4], [-100, 30, -6.9]],
  // the course's creek, out of the pond's south end and south along the course, in its ravine
  course: [[-104, -39, -1.2], [-101, 0, -4.0], [-100, 30, -6.9], [-110, 100, -7.6], [-118, 190, -8.2]],
  // house sites for step 2, kept clear of the trees here: [x, z, half-width, half-depth]
  westX: -168,   // v1.344 (D.51 step 5): the course's west edge; past it a tree line, a row of houses facing it, the woods
  sites: [[48, -22], [80, -22], [112, -22], [144, -22], [176, -22], [208, -22], [100, 22], [156, 22], [206, 22]].map(([x, z]) => [x, z, 14, 12]),
};
const _wmSS = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
// the street's own level: today's grade in the box (3 m at the entry), then 1.5 m more over the 197 m to Winnmark Dr
// v1.342 (D.51 step 4, second part): with the bulb's lots at real size (bulb true) the street falls only 1.5 m from the
// box's entry to the bulb, so the bulb is 3 m under Winnmark Dr (the guide's 3-5 m) and its lots have room for walk-outs
// over the course at 0
function winnmarkStreetY(x, bulb) {
  if (x >= 38) return 3.0 + 1.5 * _wmSS((x - 38) / 197);
  if (bulb) return 1.5 + 1.5 * (1 - _wmSS((x - 38) / (-32 - 38)));
  return 3.0 * (1 - _wmSS((x - 38) / (-32 - 38)));
}
// nearest point on a polyline of [x, z, (y)] points: { d, y (interpolated third value), s (distance along it) }
function _wmPolyNear(pts, x, z) {
  let best = { d: Infinity, y: 0, s: 0 }, acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < best.d) best = { d, y: (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t, s: acc + L * t };
    acc += L;
  }
  return best;
}
// Winnmark Dr's level along it: 4.5 m at the court's mouth (the court's own top), rising a little north to Steeplechase
// and falling 2 m round the wood to the south-west, as the ground falls south and west
function winnmarkDrY(near) {
  const s0 = 190;   // the junction's distance along WM_REAL.dr
  return near.s < s0 ? 4.5 + 0.004 * (s0 - near.s) : 4.5 - 2.0 * _wmSS((near.s - s0) / 330);
}
// the creek's z at x along the shared wood (WM_REAL.creek runs east to west)
function winnmarkCreekZ(x) {
  const C = WM_REAL.creek;
  if (x >= C[0][0]) return C[0][1];
  for (let i = 0; i + 1 < C.length; i++) if (x >= C[i + 1][0]) return C[i][1] + (C[i + 1][1] - C[i][1]) * (x - C[i][0]) / (C[i + 1][0] - C[i][0]);
  return C[C.length - 1][1];
}
// v1.339 (D.51 step 2; docs/refs/winnmark.md, "The houses" and "The ground"): the street's lots past the box, at real
// size. Each house is 20-24 m across and 15 m deep, its front 14 m off the street's middle; the main floor stands 0.35 m
// over the front lawn and the back is a walk-out, the terrace 3 m under the main floor with the deck over it; the terrace
// runs back to a stone wall at the lot's back line of the ground grid, the yard 0.9 m or more below it, a black picket
// fence along the wall and down each side. North lots face south and back onto the course; south lots face north and
// back onto the shared wood. Seth's (x 100, south) is step 3's own lot, and the north lot at x 48, which reaches into
// today's box, is step 4's with the bulb's. look: WM_LOOK's A, B or C.
const WM_LOTS = [
  { x: 80, side: 'n', look: 'A', w: 24 }, { x: 112, side: 'n', look: 'B', w: 21 },
  { x: 144, side: 'n', look: 'C', w: 23 }, { x: 176, side: 'n', look: 'A', w: 20 }, { x: 208, side: 'n', look: 'B', w: 22 },
  { x: 156, side: 's', look: 'B', w: 23 }, { x: 206, side: 's', look: 'C', w: 21 },
];
const WM_LOT = { half: 16, front: 14, depth: 15, walk: 3.0, wallD: 39.375, cell: 140 / 96 };   // wallD: a line of the ground grid
for (const L of WM_LOTS) { const S = winnmarkStreetY(L.x); L.F = S + 0.35; L.T = L.F - WM_LOT.walk; L.sgn = L.side === 'n' ? -1 : 1; }
// v1.342 (D.51 step 4, second part; Michael: real scale, 16 Oct): the bulb's end of the street at real size, in place of
// today's box and its eight half-size houses: three lots each side about 34 m apart, the last two each side of the bulb
// set back 17 m (front) round its 11 m circle, and the north lot at x 48 that reaches into the box. They are built where
// the scene's ground is the real one (bulb true: every match since v1.343, when the bulb's own matches moved onto them). The north lots by the bulb keep their terrace 0.6 m under the course at most, so
// their walk-out is 2.5 m there; the south lots fall into the wood as the street's others do.
const WM_BULB_LOTS = [
  { x: -22, side: 'n', look: 'A', w: 22, front: 17 }, { x: 14, side: 'n', look: 'B', w: 23 }, { x: 48, side: 'n', look: 'C', w: 24 },
  { x: -24, side: 's', look: 'B', w: 22, front: 17 }, { x: 10, side: 's', look: 'C', w: 23 }, { x: 44, side: 's', look: 'A', w: 21 },
];
for (const L of WM_BULB_LOTS) {
  const S = winnmarkStreetY(L.x, true); L.bulb = true; L.sgn = L.side === 'n' ? -1 : 1; L.F = S + 0.35;
  L.T = Math.max(L.F - WM_LOT.walk, L.sgn < 0 ? -0.6 : -Infinity);
}
const WM_BULB = { x: -30, z: 0, r: 11 };   // v1.342: the bulb at real size (the guide: 12-15 m; today's 6.3)
function winnmarkLotAt(x, z, bulb) {
  for (const L of WM_LOTS) if (Math.abs(x - L.x) < WM_LOT.half && z * L.sgn > 0) return L;
  if (bulb) for (const L of WM_BULB_LOTS) if (Math.abs(x - L.x) < WM_LOT.half && z * L.sgn > 0) return L;
  return null;
}
// the lot's ground: the front lawn, the side yards falling to the terrace, the terrace, and the yard below its wall
function winnmarkLotY(L, z, r) {
  const d = z * L.sgn, S = L.F - 0.35, f = L.front || WM_LOT.front;   // v1.342: f, the house's front off the street's middle
  if (d < f + 2) return r;
  if (d < f + 15) return S + (L.T - S) * _wmSS((d - f - 2) / 12);
  if (d <= WM_LOT.wallD) return L.T;
  return Math.min(r, L.T - 0.9 + 0.15 * Math.max(0, d - 44));   // the yard below the wall, meeting the falling ground by 54 m
}
// v1.340 (D.51 step 3; Michael's notes and answer 2A; docs/refs/winnmark.md gap 1): Seth's lot, mid-street on the south
// side, 130 m from the bulb. The driveway drops 2.4 m off the road over 16 m (15 %, "very steep") to the pad, and the
// house is sunk with it; its back is a walk-out over a flagstone patio, the "really big deck" off the main floor over it
// with the hot tub "almost the size of his pool" sunk into the patio under the deck, the pool beyond on the patio, and the
// back yard falling on through the woods to the creek, 3-4 m under the patio. Levels: P the pad, F the main floor,
// T the patio; the house's front at z 22, its back at 37; the patio to z 52.
const WM_SETH = (() => {
  const x = 100, S = winnmarkStreetY(x), P = S - 2.4, F = P + 0.35, T = F - 3.0;
  return { x, S, P, F, T, w: 24, front: 22, back: 37, patio: 52, half: 18, deck: { x0: 88.5, x1: 104.5, z1: 42.5 },
    tub: { x: 96.5, z: 40.2, r: 1.8 }, pool: { x0: 100.5, x1: 110, z0: 45.4, z1: 50 }, drive: 108.6 };
})();
function winnmarkSethY(x, z, r) {
  const H = WM_SETH, ax = Math.abs(x - H.x);
  if (z < 4 || ax > H.half + 6) return r;
  const cz = winnmarkCreekZ(x);
  if (z > cz) return r;
  let y;
  if (z < 5) y = H.S + (r - H.S) * (5 - z);                                              // the road's edge
  else if (z < 21) y = H.S + (H.P - H.S) * (z - 5) / 16;                                   // the driveway and the sunk front lawn
  else if (z < 29) y = H.P;                                                                // the pad, and under the house's front
  else if (z < H.back) y = H.P + (H.T - H.P) * _wmSS((z - 29) / 7.5);                      // under the house
  else if (z <= H.patio) y = H.T;                                                          // the patio
  else y = H.T + (r - H.T) * _wmSS((z - H.patio) / (cz - H.patio));                     // down through the woods to the creek
  const k = 1 - _wmSS((ax - H.half) / 6);
  return r + (y - r) * k;
}
function winnmarkRealScale(x, z, h, bulb) {   // v1.342: bulb, the box is the real place too (WM_BULB_LOTS)
  const B = WM_REAL.box;
  const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ);
  if (out <= 0 && !bulb) return h;
  const S = winnmarkStreetY(x, bulb);
  let r;
  if (z <= 0) {
    // the north lots: flat front lawns, then the back yards fall to the course (at 0) 42 m out by the box, 55 m east
    const dC = 42 + 13 * _wmSS((x - 50) / 20);
    r = S * (1 - _wmSS((-z - 16) / (dC - 16)));
    if (z < -130) r += 3 * _wmSS((-z - 130) / 30);                       // past the course, up to the houses across it
  } else {
    // the south lots: a walk-out's 3 m fall behind the houses, then the shared wood down to the creek's banks
    const cz = winnmarkCreekZ(x), c = _wmPolyNear(WM_REAL.creek, x, z), bank = c.y + 1.2;
    const walk = S - 3 * _wmSS((z - 16) / 16);
    r = z <= cz ? walk + (bank - walk) * _wmSS((z - 30) / Math.max(1, cz - 30)) : bank + 0.05 * (z - cz);
  }
  // Winnmark Dr's lots stand on its own level, falling away from it into the wood and the course
  const dr = _wmPolyNear(WM_REAL.dr, x, z);
  r = Math.max(r, winnmarkDrY(dr) - 0.07 * Math.max(0, dr.d - 9));
  const lot = winnmarkLotAt(x, z, bulb);   // v1.339: the street's lots past the box, terraced behind their walk-outs
  if (lot) r = winnmarkLotY(lot, z, r);
  r = winnmarkSethY(x, z, r);        // v1.340: Seth's sunken lot
  // west of the box the course: flat, but for the pond and the creeks' ravines
  if (x < -40) r *= 1 - _wmSS((-40 - x) / 30);
  const P = WM_REAL.pond, e = Math.hypot((x - P.x) / P.rx, (z - P.z) / P.rz);
  r = Math.min(r, P.bed + 0.35 * Math.max(0, (e - 1) * 30 + 3.1));
  const c1 = _wmPolyNear(WM_REAL.creek, x, z), c2 = _wmPolyNear(WM_REAL.course, x, z);
  r = Math.min(r, c1.y + 0.45 * Math.min(1, c1.d / 0.9) + 0.3 * Math.max(0, c1.d - 0.9));
  r = Math.min(r, c2.y + 0.45 * Math.min(1, c2.d / 1.2) + 0.3 * Math.max(0, c2.d - 1.2));
  return bulb ? r : h + (r - h) * _wmSS(out / 8);
}
// v1.341 (D.51 step 4; Michael 26 Oct: A, each match in one fenced area about today's size): Seth's play area on the
// real-scale street, 72 x 76 m round his lot: the north lawns across from his house, the street, his driveway and side
// yards, the patio under the deck, the back yard down over the creek, and the wood on the lots either side. Nine matches
// play here (builderArg 'seth_house', 'treehouse' or 'seth_yards'); the rest stay in the bulb's box. Its starts and
// anchors keep the box's names (seth_backyard, trey_backyard, road_east...), so a match moved here keeps its enemySetup.
const WM_SA = {
  bounds: { minX: 64.8, maxX: 135.2, minZ: -12, maxZ: 64 },
  fort: { x: 126, z: 32 },   // Defend the Treehouse: the plank fort in the wood on the lot east of Seth's
};
// v1.343 (D.51 step 4, second part): the bulb's play area on its real lots, 84 x 54 m: the bulb, the street to the box's
// old mouth, the north front lawns, and the south lawns, side yards and terraces to their walls. The tutorials and the
// six matches that played in the box play here; the box is retired.
const WM_BA = { bounds: { minX: -44, maxX: 40, minZ: -14, maxZ: 40 } };
function winnmarkArea(variant) { return (variant === 'seth_house' || variant === 'treehouse' || variant === 'seth_yards') ? 'seth' : 'bulb'; }

// v1.339 (D.51 step 2): build WM_LOTS' houses and yards. The house is the detailed one with its street look (v1.312) at
// real size, lifted to its main floor; under it the walk-out storey in its own wall, French doors and windows on the back;
// the deck over the terrace (stained boards, posts, a rail, a stair down its end); the terrace's stone wall with its cap;
// black picket fences along the wall and down the lot lines; a driveway from the street to the garage end. Everything
// but the houses is baked into one mesh per material. Returns the obstacles and the driveways (for the kerb drops).
function buildWinnmarkLots(scene, o) {
  const gY = o.groundY, looks = o.looks, obstacles = [], drives = [];
  const parts = {}, mats = {};
  const mat = (key, c, x = {}) => { if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, x)); return key; };
  const add = (key, x0, x1, y0, y1, z0, z1) => {
    (parts[key] = parts[key] || []).push({ geo: new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m: new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) });
  };
  const ob = (x0, x1, z0, z1, y0, y1, extra) => obstacles.push(Object.assign({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), baseY: y0, h: y1 - y0, surface: 'hard' }, extra || {}));
  const WOOD = mat('wood', 0x6a4e3a), BAL = mat('bal', 0x6a4e3a, { side: THREE.DoubleSide }), POST = mat('post', 0x47382d), STONE = mat('stone', 0x8a8070, { roughness: 0.97 }), CAP = mat('cap', 0xb8b0a0);
  const IRON = mat('iron', 0x18181a, { roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide }), TRIM = mat('trim', 0xe6dfd0, { roughness: 0.6 });
  const GLASS = mat('glass', 0x2e3a44, { roughness: 0.25, metalness: 0.2, emissive: 0x101820, emissiveIntensity: 0.4 });
  const LIT = o.night ? mat('lit', 0xffe0a0, { roughness: 0.4, emissive: 0xffc070, emissiveIntensity: 0.85 }) : GLASS;
  const CONC = mat('conc', 0x8e8a82, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // a black picket fence 1.2 m high from (x0, z0) to (x1, z1), each picket on the ground under it (or on `y` if given)
  const fence = (x0, z0, x1, z1, y) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.16)), posts = Math.max(1, Math.round(len / 2.4));
    // each picket one quad across the fence's line (double-sided), the rails a box per run of level ground, so they
    // step with the ground where it steps (the fence was 1.5k boxes a lot and doubled the map's vertices)
    const yaw = Math.atan2(-(z1 - z0), x1 - x0);
    let run = null;
    const endRun = (x, z) => { if (run) for (const ry of [0.12, 1.08]) add(IRON, Math.min(run.x, x) - 0.02, Math.max(run.x, x) + 0.02, run.b + ry, run.b + ry + 0.04, Math.min(run.z, z) - 0.02, Math.max(run.z, z) + 0.02); };
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n, b = y != null ? y : gY(x, z);
      (parts[IRON] = parts[IRON] || []).push({ geo: new THREE.PlaneGeometry(0.03, 1.3), m: new THREE.Matrix4().makeTranslation(x, b + 0.55, z).multiply(new THREE.Matrix4().makeRotationY(yaw)) });
      if (!run) run = { x, z, b };
      else if (Math.abs(b - run.b) > 0.04 || i === n) { endRun(x, z); run = { x, z, b }; }
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= posts; i++) {
      const x = x0 + (x1 - x0) * i / posts, z = z0 + (z1 - z0) * i / posts, b = y != null ? y : gY(x, z);
      add(IRON, x - 0.04, x + 0.04, b - 0.1, b + 1.28, z - 0.04, z + 0.04); lo = Math.min(lo, b); hi = Math.max(hi, b);
    }
    ob(x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1, lo, hi + 1.2, { surface: 'metal', bbPass: true });
  };
  const patch = (key, x0, x1, z0, z1, lift, skip) => {   // a patch laid on the ground, facing up
    const st = 0.75, nx = Math.max(1, Math.ceil((x1 - x0) / st)), nz = Math.max(1, Math.ceil((z1 - z0) / st)), p = [];
    const at = (x, z) => [x, gY(x, z) + lift, z];
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const xA = x0 + (x1 - x0) * i / nx, xB = x0 + (x1 - x0) * (i + 1) / nx, zA = z0 + (z1 - z0) * k / nz, zB = z0 + (z1 - z0) * (k + 1) / nz;
      if (skip && skip((xA + xB) / 2, (zA + zB) / 2)) continue;
      const a = at(xA, zA), b = at(xB, zA), c = at(xA, zB), d = at(xB, zB); p.push(a, c, b, b, c, d);
    }
    if (!p.length) return;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3)); geo.computeVertexNormals();
    (parts[key] = parts[key] || []).push({ geo, m: new THREE.Matrix4() });
  };
  // v1.342 (step 4, second part): o.bulb builds the bulb's lots too (WM_BULB_LOTS), each house front `front` off the
  // street, its driveway from o.roadEdge (the curved street's or the bulb's edge on its side)
  for (const L of o.bulb ? WM_LOTS.concat(WM_BULB_LOTS) : WM_LOTS) {
    const s = L.sgn, LK = looks[L.look], w = L.w, D = WM_LOT.depth, hw = w / 2, fr = L.front || WM_LOT.front;
    const zc = s * (fr + D / 2), zFront = s * fr, zBack = s * (fr + D), F = L.F, T = L.T;
    const z0 = Math.min(zFront, zBack), z1 = Math.max(zFront, zBack);
    // the house, at real size, lifted to its main floor
    const hob = buildSuburbanHouse(scene, { x: L.x, z: zc, width: w, depth: D, trimColor: 0xe6dfd0, brickColor: LK.brick,
      roofColor: [0x6e6a62, 0x686660, 0x726c62][(Math.round(L.x / 32) % 3 + 3) % 3], faceDir: s < 0 ? 'south' : 'north', detail: true,
      look: { ...LK.look, bay: (Math.round(L.x / 32) % 2) ? 1 : -1 } });
    hob.mesh.position.y = F; hob.mesh.userData.wmLot = true;   // v1.342: a lot's house, not the box's
    hob.baseY = T - 0.1; hob.h = F - T + 0.1 + 5.5;
    obstacles.push(hob);
    // the walk-out storey under it, in its own wall; French doors and two windows each side on the back
    const WALL = mat('wall' + L.look, LK.brick, { roughness: 0.92 });
    add(WALL, L.x - hw + 0.02, L.x + hw - 0.02, T - 0.1, F, z0 + 0.02, z1 - 0.02);
    const zb = zBack + s * 0.04;
    for (const dx of [-7.5, -4.5, 0, 4.5, 7.5]) {
      if (Math.abs(dx) > hw - 1.5) continue;
      const ww = dx === 0 ? 1.8 : 1.1, top = dx === 0 ? T + 2.3 : T + 2.1, bot = dx === 0 ? T + 0.02 : T + 0.9;
      add(TRIM, L.x + dx - ww / 2 - 0.12, L.x + dx + ww / 2 + 0.12, bot - 0.08, top + 0.12, Math.min(zb, zb + s * 0.06), Math.max(zb, zb + s * 0.06));
      add((L.x + dx) % 3 < 1 ? LIT : GLASS, L.x + dx - ww / 2, L.x + dx + ww / 2, bot, top, Math.min(zb, zb + s * 0.1), Math.max(zb, zb + s * 0.1));
    }
    // the deck over the terrace: 12 x 3.8 m at the main floor, on posts, a rail round it, a stair down its east end
    const dx0 = L.x - 6, dx1 = L.x + 6, dz0 = zBack, dz1 = zBack + s * 3.8, dzA = Math.min(dz0, dz1), dzB = Math.max(dz0, dz1);
    add(WOOD, dx0, dx1, F - 0.25, F, dzA, dzB);
    ob(dx0, dx1, dzA, dzB, F - 0.25, F + 1.05, { surface: 'wood' });
    for (const px of [dx0 + 0.12, L.x - 2, L.x + 2, dx1 - 0.12]) {
      const pz = dz1 - s * 0.12;
      add(POST, px - 0.08, px + 0.08, T, F - 0.25, pz - 0.08, pz + 0.08); ob(px - 0.08, px + 0.08, pz - 0.08, pz + 0.08, T, F - 0.25);
    }
    const rail = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.14);
      const ry = new THREE.Matrix4().makeRotationY(Math.atan2(-(bz - az), bx - ax));   // v1.340: each baluster a quad across the rail's line
      for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; (parts[BAL] = parts[BAL] || []).push({ geo: new THREE.PlaneGeometry(0.05, 0.95), m: new THREE.Matrix4().makeTranslation(x, F + 0.475, z).multiply(ry) }); }
      add(POST, Math.min(ax, bx) - 0.05, Math.max(ax, bx) + 0.05, F + 0.95, F + 1.03, Math.min(az, bz) - 0.05, Math.max(az, bz) + 0.05);
    };
    rail(dx0 + 0.05, dz1 - s * 0.05, dx1 - 0.05, dz1 - s * 0.05); rail(dx0 + 0.05, dz0, dx0 + 0.05, dz1 - s * 0.05); rail(dx1 - 0.05, dz0, dx1 - 0.05, dz0 + s * 1.2);
    {
      const sx0 = dx1, sx1 = dx1 + 4.2, n = 15, sz0 = dz0 + s * 1.3, sz1 = dz0 + s * 2.4;
      for (let i = 0; i < n; i++) { const y = F - (F - T) * (i + 1) / n, x = sx0 + (sx1 - sx0) * i / n; add(WOOD, x, x + (sx1 - sx0) / n + 0.02, y - 0.05, y, Math.min(sz0, sz1), Math.max(sz0, sz1)); }
      for (const px of [sx0 + 0.1, (sx0 + sx1) / 2]) add(POST, px - 0.07, px + 0.07, T, F - (F - T) * (px - sx0) / (sx1 - sx0) - 0.25, Math.min(sz0, sz1), Math.min(sz0, sz1) + 0.14);
      ob(sx0, sx1, Math.min(sz0, sz1), Math.max(sz0, sz1), T, F);
    }
    // the terrace's stone wall along the back line (one grid cell thick, so the ground's step is under it), capped,
    // the fence on it; the fences down both lot lines from the house's back corners to past the wall
    const wd0 = s * WM_LOT.wallD, wd1 = s * (WM_LOT.wallD + WM_LOT.cell), wz0 = Math.min(wd0, wd1), wz1 = Math.max(wd0, wd1);
    const lx0 = L.x - WM_LOT.half + 0.2, lx1 = L.x + WM_LOT.half - 0.2;
    let low = Infinity; for (let x = lx0; x <= lx1; x += 2) low = Math.min(low, gY(x, wd1 + s * 0.05));
    add(STONE, lx0, lx1, low - 0.3, T + 0.05, wz0, wz1); add(CAP, lx0 - 0.03, lx1 + 0.03, T + 0.05, T + 0.12, wz0 - 0.03, wz1 + 0.03);
    ob(lx0, lx1, wz0, wz1, low - 0.3, T + 0.12, { surface: 'hard' });
    const fz = s * (WM_LOT.wallD + WM_LOT.cell / 2);
    fence(lx0, fz, lx1, fz, T + 0.12);
    for (const fx of [lx0, lx1]) fence(fx, s * (fr + D), fx, s * (WM_LOT.wallD + WM_LOT.cell + 9));
    // the driveway to the garage end: the street's edge to the front, on the ground
    const gx = L.x + (Math.round(L.x / 32) % 2 ? 1 : -1) * (hw - 3.2), ez = L.bulb && o.roadEdge ? o.roadEdge(gx, s) : s * 3.6;
    drives.push({ x: gx, z: zc, side: s < 0 ? 'north' : 'south', dx: gx });
    patch(CONC, gx - 2.4, gx + 2.4, Math.min(ez, zFront), Math.max(ez, zFront), 0.035);
  }
  // v1.340 (step 3): Seth's lot (WM_SETH): the house sunk with its pad, the walk-out over the flagstone patio, the big deck
  // over it, the hot tub sunk into the patio under the deck, the pool on the patio past it, the steep driveway, and
  // stepping stones over the creek at the foot of the yard
  const seth = {};
  {
    const H = WM_SETH, LK = looks.B, hw = H.w / 2, D = H.back - H.front, zc = (H.front + H.back) / 2, F = H.F, T = H.T;
    const hob = buildSuburbanHouse(scene, { x: H.x, z: zc, width: H.w, depth: D, trimColor: 0xe6dfd0, brickColor: LK.brick, roofColor: 0x6a6660,
      faceDir: 'north', detail: true, look: { ...LK.look, bay: 1 } });
    hob.mesh.position.y = F; hob.baseY = T - 0.1; hob.h = F - T + 0.1 + 5.5; hob.mesh.name = 'sethHouse';
    obstacles.push(hob); seth.house = hob;
    const WALL = mat('wallB', LK.brick, { roughness: 0.92 });
    add(WALL, H.x - hw + 0.02, H.x + hw - 0.02, T - 0.1, F, H.front + 0.02, H.back - 0.02);
    const zb = H.back + 0.04;
    for (const dx of [-9, -5.5, -2, 2, 5.5, 9]) {
      const door = dx === -2 || dx === 2, ww = door ? 1.7 : 1.1, top = door ? T + 2.3 : T + 2.1, bot = door ? T + 0.02 : T + 0.9;
      add(TRIM, H.x + dx - ww / 2 - 0.12, H.x + dx + ww / 2 + 0.12, bot - 0.08, top + 0.12, zb, zb + 0.06);
      add(dx === 2 ? LIT : GLASS, H.x + dx - ww / 2, H.x + dx + ww / 2, bot, top, zb, zb + 0.1);
    }
    // the flagstone patio, slate blue, rust and tan stones in it (the guide's listing A terrace)
    const FLAG = mat('flag', 0x77736d, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const STN1 = mat('stn1', 0x9a7a62, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const STN2 = mat('stn2', 0x6e7a88, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const P = H.pool, inPool = (x, z) => x > P.x0 - 0.1 && x < P.x1 + 0.1 && z > P.z0 - 0.1 && z < P.z1 + 0.1;
    const inTub = (x, z) => Math.hypot(x - H.tub.x, z - H.tub.z) < H.tub.r + 0.1;
    patch(FLAG, H.x - 15, H.x + 15, H.back, H.patio, 0.03);
    for (let i = 0; i < 26; i++) {
      const x = H.x - 14 + ((i * 7.31) % 28), z = H.back + 0.6 + ((i * 3.77) % (H.patio - H.back - 1.2)), w = 0.5 + (i % 3) * 0.2;
      if (inPool(x, z) || inTub(x, z) || inPool(x + w, z + w) || inTub(x + w, z + w)) continue;
      add(i % 2 ? STN1 : STN2, x, x + w, T + 0.03, T + 0.045, z, z + w * 0.8);
    }
    // the big deck off the main floor: 16 x 5.5 m, posts along its edge, the rail, a stair down its west end
    const dx0 = H.deck.x0, dx1 = H.deck.x1, dz0 = H.back, dz1 = H.deck.z1;
    add(WOOD, dx0, dx1, F - 0.3, F, dz0, dz1);
    ob(dx0, dx1, dz0, dz1, F - 0.3, F + 1.05, { surface: 'wood', sethDeck: true });
    for (const px of [dx0 + 0.12, dx0 + 4, dx0 + 8, dx0 + 12, dx1 - 0.12]) {
      add(POST, px - 0.09, px + 0.09, T, F - 0.3, dz1 - 0.3, dz1 - 0.12); ob(px - 0.09, px + 0.09, dz1 - 0.3, dz1 - 0.12, T, F - 0.3);
    }
    const rail = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.14);
      const ry = new THREE.Matrix4().makeRotationY(Math.atan2(-(bz - az), bx - ax));   // v1.340: each baluster a quad across the rail's line
      for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; (parts[BAL] = parts[BAL] || []).push({ geo: new THREE.PlaneGeometry(0.05, 0.95), m: new THREE.Matrix4().makeTranslation(x, F + 0.475, z).multiply(ry) }); }
      add(POST, Math.min(ax, bx) - 0.05, Math.max(ax, bx) + 0.05, F + 0.95, F + 1.03, Math.min(az, bz) - 0.05, Math.max(az, bz) + 0.05);
    };
    rail(dx0 + 0.05, dz1 - 0.05, dx1 - 0.05, dz1 - 0.05); rail(dx1 - 0.05, dz0, dx1 - 0.05, dz1 - 0.05); rail(dx0 + 0.05, dz0 + 1.3, dx0 + 0.05, dz1 - 0.05);
    {
      const sx0 = dx0, sx1 = dx0 - 4.2, n = 15, sz0 = dz0 + 0.05, sz1 = dz0 + 1.25;
      for (let i = 0; i < n; i++) { const y = F - (F - T) * (i + 1) / n, x = sx0 + (sx1 - sx0) * i / n, xn = sx0 + (sx1 - sx0) * (i + 1) / n; add(WOOD, Math.min(x, xn) - 0.01, Math.max(x, xn) + 0.01, y - 0.05, y, sz0, sz1); }
      for (const px of [sx0 - 0.1, (sx0 + sx1) / 2]) add(POST, px - 0.07, px + 0.07, T, F - (F - T) * (sx0 - px) / (sx0 - sx1) - 0.25, sz1 - 0.14, sz1);
      ob(sx1, sx0, sz0, sz1, T, F);
    }
    // the hot tub, sunk into the patio under the deck: 3.6 m across, its rim 0.45 m up, a step on its open side
    const COPE = mat('cope', 0xd8d0c0, { roughness: 0.8 }), WATER = mat('water', 0x3a8a9c, { roughness: 0.15, metalness: 0.1, emissive: 0x0a2a32, emissiveIntensity: o.night ? 0.8 : 0.1 });
    {
      const t = H.tub, ring = new THREE.CylinderGeometry(t.r, t.r, 0.45, 28, 1, true), cap = new THREE.RingGeometry(t.r - 0.22, t.r + 0.02, 28);
      (parts[COPE] = parts[COPE] || []).push({ geo: ring, m: new THREE.Matrix4().makeTranslation(t.x, T + 0.225, t.z) });
      (parts[COPE] = parts[COPE] || []).push({ geo: cap, m: new THREE.Matrix4().makeTranslation(t.x, T + 0.45, t.z).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)) });
      (parts[WATER] = parts[WATER] || []).push({ geo: new THREE.CircleGeometry(t.r - 0.2, 28), m: new THREE.Matrix4().makeTranslation(t.x, T + 0.36, t.z).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)) });
      add(COPE, t.x - 0.5, t.x + 0.5, T, T + 0.22, t.z + t.r - 0.05, t.z + t.r + 0.4);
      ob(t.x - t.r, t.x + t.r, t.z - t.r, t.z + t.r, T, T + 0.9, { surface: 'hard', sethTub: true });
      seth.tub = t;
    }
    // the pool on the patio past the deck: 9.5 x 4.6 m, a coping round it; you can't walk into it, BBs fly over it
    {
      add(COPE, P.x0 - 0.35, P.x1 + 0.35, T + 0.03, T + 0.1, P.z0 - 0.35, P.z0);
      add(COPE, P.x0 - 0.35, P.x1 + 0.35, T + 0.03, T + 0.1, P.z1, P.z1 + 0.35);
      add(COPE, P.x0 - 0.35, P.x0, T + 0.03, T + 0.1, P.z0, P.z1);
      add(COPE, P.x1, P.x1 + 0.35, T + 0.03, T + 0.1, P.z0, P.z1);
      (parts[WATER] = parts[WATER] || []).push({ geo: new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), m: new THREE.Matrix4().makeTranslation((P.x0 + P.x1) / 2, T + 0.06, (P.z0 + P.z1) / 2).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)) });
      ob(P.x0, P.x1, P.z0, P.z1, T, T + 0.6, { surface: 'hard', bbPass: true, sethPool: true });
      seth.pool = P;
    }
    // the steep driveway, from the street down to the pad in front of the garage end, and the pad
    patch(CONC, H.drive - 2.6, H.drive + 2.6, 3.6, H.front, 0.035);
    patch(CONC, H.drive - 4.6, H.x + hw - 0.2, H.front - 4, H.front, 0.04);
    drives.push({ x: H.drive, z: zc, side: 'south', dx: H.drive });
    // stepping stones over the creek at the foot of the yard
    const ROCK = mat('rock', 0x7a746a, { roughness: 0.97 });
    for (let i = -3; i <= 3; i++) {
      const sx = H.x - 3 + i * 0.25, sz = winnmarkCreekZ(sx) + i * 0.55, y = _wmPolyNear(WM_REAL.creek, sx, sz).y;
      add(ROCK, sx - 0.32, sx + 0.32, y - 0.2, y + 0.42, sz - 0.25, sz + 0.25);
    }
  }
  const root = new THREE.Group(); root.name = 'winnmarkLots';
  for (const k in parts) {
    const m = new THREE.Mesh(_houseMergeParts(parts[k]), mats[k]);
    m.castShadow = k !== CONC && k !== GLASS && k !== 'lit'; m.receiveShadow = true; m.userData.part = k;
    root.add(m);
  }
  scene.add(root);
  return { obstacles, drives, root, seth };
}

function buildWinnmarkCourtScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _area = winnmarkArea(variant);   // v1.341 (D.51 step 4): 'seth' (WM_SA) or 'bulb' (today's box)
  // v1.342 (step 4, second part): the bulb's end at real size (WM_BULB_LOTS) in place of the box, where the match doesn't
  // play in the box: Seth's area's matches see the real bulb down the street, not today's half-size houses
  const _realBulb = true;   // v1.343: every match now (the bulb's area plays on its real lots, and the box is retired)

  // === Lighting / sky (v1.35: day or night) ===
  const _night = (timeOfDay === 'night');
  const { sun } = applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x88a8c8, dayFog: [45, 320],   // v1.338 (D.51 step 1): out from [35, 80], so the street to Winnmark Dr and the course show
    sunColor: 0xfff0c8, sunInt: 1.1, sunPos: [20, 30, 12],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.4,
    nightFog: [22, 70], moonPos: [22, 38, -18],
    shadow: { size: 2048, extent: 40, far: 80 },
  });

  // === Terrain (v1.28l) — the street slopes DOWN to the cul-de-sac fort ===
  // The bulb + plank fort sit at the WEST end (x≈-30); the road entry is at the
  // EAST (x≈+34). The east entry is the HIGH ground (~6.5m), falling smoothly
  // down to the fort/bulb at ~0 — so attackers crest the high east entry and
  // push DOWNHILL toward the defended fort, and the defender holds the low bulb.
  // The lake/shore on the far west stays at ~0 (water reads flat). Modeled on
  // Bunratty's terrain: a groundY fn, a displaced ground mesh, sinkObs to seat
  // props on the slope, and groundNormal to tilt flat pads (road/driveways).
  function winnmarkGroundY(x, z) {
    const xE = 38, xW = -32;
    let u = (x - xE) / (xW - xE);            // 0 at east entry (high), 1 at west bulb (low)
    u = Math.max(0, Math.min(1, u));
    const s = u * u * (3 - 2 * u);           // smoothstep: flat-ish high bench, then drop
    let h = 3.0 * (1 - s);                    // v1.28n: +3.0 at east entry, ~0 by the bulb (was 4.5 — still too steep)
    h += 0.25 * Math.sin(z * 0.12 + 0.5) * Math.cos(x * 0.1);  // gentle cross-roll
    // v1.301 (D.55 step 3, docs/refs/winnmark.md gaps 8-9): past the back tree wall (z -35) the ground falls to the
    // golf course, and past the shore (x -37) to the lake, both flat at 0, so the fairway and the water lie on it
    // instead of under it. Nobody plays past either line (the tree wall, lakeBlocker).
    const fz = Math.max(0, Math.min(1, (z + 42) / 7)), fx = Math.max(0, Math.min(1, (x + 42) / 5));
    return h * fz * fz * (3 - 2 * fz) * fx * fx * (3 - 2 * fx);
  }
  const groundY = (x, z) => winnmarkRealScale(x, z, winnmarkGroundY(x, z), _realBulb);   // v1.338: the real place past the box
  // Terrain normal (finite differences) — used to tilt flat decal pads onto the slope.
  function groundNormal(x, z) {
    const e = 0.6;
    const hL = groundY(x - e, z), hR = groundY(x + e, z);
    const hD = groundY(x, z - e), hU = groundY(x, z + e);
    const nx = (hL - hR), nz = (hD - hU), ny = 2 * e;
    const len = Math.hypot(nx, ny, nz) || 1;
    return { nx: nx / len, ny: ny / len, nz: nz / len };
  }
  // v1.35c: lay a flat decal mesh (road/driveway pad) ON the slope by rotating
  // its local +Z onto the terrain normal via a QUATERNION — exact for any slope,
  // no euler-order pitfalls. (Winnmark's road previously used two stacked euler
  // rotations to approximate this, which left discs not-quite-flush on the steep
  // east entry and read as a spotty/gappy strip. This matches Bunratty's clean
  // layOnSlope.) The mesh must NOT have a pre-applied rotation.x.
  const _UP_Z_WM = new THREE.Vector3(0, 0, 1);
  function layOnSlope(mesh, x, z, lift = 0.04) {
    const n = groundNormal(x, z);
    mesh.position.set(x, groundY(x, z) + lift, z);
    mesh.quaternion.setFromUnitVectors(_UP_Z_WM, new THREE.Vector3(n.nx, n.ny, n.nz));
    return mesh;
  }
  // Lift a flat-built obstacle (and its mesh group) onto the slope, tagging baseY
  // so collision/BB spans start at the buried base. Sinks to the LOWEST corner of
  // the footprint so wide props bury uphill rather than float downhill.
  function sinkObs(obs, gx, gz) {
    if (!obs) return obs;
    const cx = (gx != null) ? gx : (obs.minX + obs.maxX) / 2;
    const cz = (gz != null) ? gz : (obs.minZ + obs.maxZ) / 2;
    let gy = groundY(cx, cz);
    const hw = (obs.maxX - obs.minX) / 2, hd = (obs.maxZ - obs.minZ) / 2;
    if (hw > 0.4 || hd > 0.4) {
      for (const sx of [-hw, 0, hw]) for (const sz of [-hd, 0, hd]) {
        gy = Math.min(gy, groundY(cx + sx, cz + sz));
      }
    }
    if (obs._wheelContacts && obs.mesh) gy = carSeatY(obs, groundY);   // v1.87: cars sit on their tyres
    // v1.54b: raise the mesh first, THEN re-resolve any mesh-anchored obox so its
    // world baseY/center reflect the new mesh position (collision stays glued to
    // the mesh). Plain AABBs keep the simple baseY = gy + stacked-offset path.
    if (obs.mesh && obs.mesh.position) obs.mesh.position.y += gy;
    if (obs.shape === 'obox') {
      resolveObox(obs);
      if (obs._stacked && obs._stacked.shape === 'obox') resolveObox(obs._stacked);
    } else {
      obs.baseY = gy;
      if (obs._stacked) obs._stacked.baseY = (obs._stacked.baseY || 0) + gy;
    }
    return obs;
  }
  function sinkObsList(list, gx, gz) { for (const o of list) sinkObs(o, gx, gz); return list; }
  // buildKidFort returns 3 wall-obstacles that all SHARE one mesh group, so we
  // can't sinkObs each (it'd lift the group 3×). Lift the group ONCE to the
  // lowest ground under the fort and tag baseY on every wall obstacle.
  function seatFortOnSlope(walls, gx, gz) {
    if (!walls || !walls.length) return walls;
    let gy = groundY(gx, gz);
    for (const sx of [-2.2, 0, 2.2]) for (const sz of [-1.5, 0, 1.5]) gy = Math.min(gy, groundY(gx + sx, gz + sz));
    // The wall obstacles share ONE mesh group (the fort), so lift it once. v1.76:
    // the corner bins (_fortBin) each have their OWN mesh group, so lift those
    // individually instead of relying on the shared-group lift. All get baseY=gy.
    const grp = walls[0].mesh;
    if (grp && grp.position) grp.position.y += gy;
    const seenMeshes = new Set([grp]);
    for (const w of walls) {
      if (w._fortBin && w.mesh && w.mesh.position && !seenMeshes.has(w.mesh)) {
        w.mesh.position.y += gy;
        seenMeshes.add(w.mesh);
      }
      w.baseY = gy;
    }
    return walls;
  }

  // === Ground — grass, DISPLACED plane (vertices raised to groundY) ===
  // Subdivided so the slope is smooth; same displacement trick as Bunratty.
  // v1.338 (D.51 step 1): the ground runs on past the box to Winnmark Dr and its houses, over the course and the pond,
  // and through the shared wood (x -210..310, z -200..230). Inside 140 x 140 m the grid is the old one vertex for vertex
  // (1.458 m); past it the cells are 6 m. A colour per vertex (times the old grass) browns the woods' floor, mows the
  // course in stripes and reddens the creeks' clay banks; it is exactly 1 in the box and 6 m round it, so the lawns in
  // play keep their colour. The old lake strip west of the bulb is gone: the real pond lies north-west on the course.
  const groundGeo = new THREE.BufferGeometry();
  {
    const axis = (lo, hi, nFine = 96) => {   // v1.339: nFine past 96 runs the fine grid on east over the lots, at the same step
      const v = [];
      for (let c = lo; c < -70 - 1e-6; c += 6) v.push(c);
      for (let i = 0; i <= nFine; i++) v.push(-70 + 140 * i / 96);
      const end = v[v.length - 1];
      for (let c = end + 6; c < hi - 1e-6; c += 6) v.push(c);
      v.push(hi); return v;
    };
    const xs = axis(-258, 310, 157), zs = axis(-200, 230);   // v1.344: 48 m more west, for the houses past the course
    const pos = [], col = [], idx = [], B0 = WM_REAL.box, mix = (a, b, t) => a + (b - a) * t, P = WM_REAL.pond;
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) {
      const x = xs[i], z = zs[j];
      pos.push(x, groundY(x, z), z);
      const out = Math.max(B0.minX - x, x - B0.maxX, B0.minZ - z, z - B0.maxZ);
      const w = _realBulb ? 1 : _wmSS((out - 6) / 10);   // v1.342: the box's lawns are the real place's too
      // what lies here: the course (north past the lots, and all round the pond west of the box), the woods, or lawn
      const dC = 42 + 13 * _wmSS((x - 50) / 20), dr = _wmPolyNear(WM_REAL.dr, x, z).d;
      const course = x > WM_REAL.westX && ((x < -48 && z < 150) || (z < -dC - 3 && z > -128 && x < WM_REAL.drX - 14));
      const lawn = dr < 34 || (z > -dC && z < 34 && x < WM_REAL.drX) || (x < WM_REAL.westX - 8 && x > WM_REAL.westX - 36 && z > -178 && z < 160);   // v1.344: the west houses' lots
      let r = 1, g = 1, bl = 1;
      if (course) { const st = Math.floor((x + 1000) / 9) % 2; r = st ? 1.36 : 1.22; g = st ? 1.31 : 1.2; bl = st ? 1.25 : 1.12; }
      else if (!lawn) { r = 1.05; g = 0.67; bl = 0.83; }                              // leaf litter 0x5e5635
      const cd = Math.min(_wmPolyNear(WM_REAL.creek, x, z).d, _wmPolyNear(WM_REAL.course, x, z).d);
      const clay = _wmSS((4 - cd) / 2.5), sand = _wmSS((1.12 - Math.hypot((x - P.x) / P.rx, (z - P.z) / P.rz)) / 0.08);
      r = mix(r, 1.53, clay); g = mix(g, 0.83, clay); bl = mix(bl, 1.16, clay);
      r = mix(r, 1.45, sand); g = mix(g, 1.05, sand); bl = mix(bl, 1.2, sand);
      col.push(mix(1, r, w), mix(1, g, w), mix(1, bl, w));
    }
    const W = xs.length;
    for (let j = 0; j + 1 < zs.length; j++) for (let i = 0; i + 1 < W; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    groundGeo.setIndex(idx);
    groundGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x5a8040, roughness: 1.0, vertexColors: true })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // === The pond (v1.338, D.51 step 1; docs/refs/winnmark.md gap 9) ===
  // North-west of the bulb on the course, in the hollow winnmarkRealScale cuts for it; its creek leaves the south end.
  {
    const P = WM_REAL.pond;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.35, metalness: 0.15 }));
    pond.rotation.x = -Math.PI / 2;
    pond.scale.set(P.rx, P.rz, 1);
    pond.position.set(P.x, P.water, P.z);
    pond.name = 'winnmarkPond';
    pond.receiveShadow = true;
    scene.add(pond);
  }

  // === Golf course backdrop ===
  // Past the north tree row (z < -30) sits a manicured fairway — Horseshoe Bend
  // sits adjacent to a golf course in real life. The fairway is a brighter green
  // than the suburban lawn (different mowing height = different color); it has a
  // sand bunker, a cart path, and a single distant cart for scale.
  //
  // The whole thing is non-playable: gameplay is bounded by the dense tree wall
  // at z ≈ -34 (north backyard tree perimeter), so the player never gets close
  // enough to interact. (v1.15: pushed north to clear the deeper backyards.)
  //
  // Fairway — a wide brighter-green plane north of the tree wall (v1.344: gone, below).
  // v1.301: 22 m deep from z -42, where the ground has come down to the course (was 26 m from z -39, buried)
  // v1.344 (D.51 step 5): gone. Since v1.342 the bulb's north lots run their yards down to z -50, up to 1.5 m under it,
  // so it hung over them; the ground's own mowing stripes are the fairway. The green, its flag, the bunkers, the cart
  // path and the cart move 12 m north onto the course past the lots' fences, each laid on the ground under it.
  const _golfY = (x, z, lift) => groundY(x, z) + lift, GZ = -12;
  // Putting green — a small darker patch (richer fairway color, closer-cut grass)
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x6a9840, roughness: 1.0 });
  const green = new THREE.Mesh(new THREE.CircleGeometry(5, 24), greenMat);
  green.rotation.x = -Math.PI / 2;
  green.position.set(8, _golfY(8, -48 + GZ, 0.03), -48 + GZ);
  green.receiveShadow = true;
  scene.add(green);
  // Flagstick on the green
  const stickMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  const flagstick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), stickMat);
  flagstick.position.set(8, _golfY(8, -48 + GZ, 1.1), -48 + GZ);
  flagstick.castShadow = true;
  scene.add(flagstick);
  // Red flag
  const golfFlagMat = new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.6 });
  const golfFlag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), golfFlagMat);
  golfFlag.position.set(8, _golfY(8, -48 + GZ, 2.0), -47.7 + GZ);
  scene.add(golfFlag);

  // Sand bunker — kidney-shaped patch of sand (approximate with one ellipse +
  // a smaller offset circle to break up the silhouette).
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe6d098, roughness: 1.0 });
  const bunker1 = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), sandMat);
  bunker1.rotation.x = -Math.PI / 2;
  bunker1.position.set(-2, _golfY(-2, -46 + GZ, 0.035), -46 + GZ);
  bunker1.scale.set(1.4, 1, 0.7);
  bunker1.receiveShadow = true;
  scene.add(bunker1);
  const bunker2 = new THREE.Mesh(new THREE.CircleGeometry(2.0, 18), sandMat);
  bunker2.rotation.x = -Math.PI / 2;
  bunker2.position.set(1, _golfY(1, -45 + GZ, 0.04), -45 + GZ);
  bunker2.scale.set(1.2, 1, 0.8);
  scene.add(bunker2);

  // Cart path — light beige curved strip running along the fairway. Approximate
  // with overlapping circle decals, like the road centerline.
  const cartPathMat = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.95 });
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    // Curved from west to east across the fairway, dipping slightly south
    const cpX = -28 + t * 56;
    const cpZ = -55 + Math.sin(t * Math.PI) * 3 + GZ;
    const seg = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10), cartPathMat);
    seg.rotation.x = -Math.PI / 2;
    seg.position.set(cpX, _golfY(cpX, cpZ, 0.025), cpZ);
    scene.add(seg);
  }

  // Distant golf cart — small white-ish box with a green roof, sitting on the
  // cart path. Won't be reachable; purely scenery.
  const cartGroup = new THREE.Group();
  cartGroup.position.set(15, _golfY(15, -53 + GZ, 0), -53 + GZ);
  const cartBodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  const cartRoofMat = new THREE.MeshStandardMaterial({ color: 0x4a7038, roughness: 0.7 });
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.2), cartBodyMat);
  cartBody.position.y = 0.55;
  cartBody.castShadow = true;
  cartGroup.add(cartBody);
  const cartRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.4), cartRoofMat);
  cartRoof.position.y = 1.85;
  cartRoof.castShadow = true;
  cartGroup.add(cartRoof);
  // Roof posts
  for (const [px, pz] of [[-0.9, -0.55], [-0.9, 0.55], [0.9, -0.55], [0.9, 0.55]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), cartBodyMat);
    post.position.set(px, 1.25, pz);
    cartGroup.add(post);
  }
  // Tiny wheels
  const cartWheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const cartWheelGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 10);
  for (const [px, pz] of [[-0.7, -0.55], [-0.7, 0.55], [0.7, -0.55], [0.7, 0.55]]) {
    const wheel = new THREE.Mesh(cartWheelGeom, cartWheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(px, 0.2, pz);
    cartGroup.add(wheel);
  }
  cartGroup.rotation.y = -0.2; // slight angle for realism
  scene.add(cartGroup);

  // A few distant trees on the far side of the fairway, framing it visually
  for (let i = 0; i < 10; i++) {
    const x = -40 + i * 9 + (gameRandom() - 0.5) * 2;
    const z = -52 + (gameRandom() - 0.5) * 3;
    const trunkH = 3.5 + gameRandom() * 1.5;
    const leafR = 2.2 + gameRandom() * 0.6;
    addSuburbanTree(scene, x, z, { trunkH, leafR, detail: true, baseY: groundY(x, z) });   // v1.344: on the lots' fallen yards
  }

  // === Road — a curving asphalt strip approximated by many segment quads ===
  // The road comes in from the east entry at (30, 0) and curves westward.
  // I'll approximate the centerline as a quadratic curve and then build
  // segments perpendicular to its tangent at each step. The curve dips slightly
  // south in the middle (the cul-de-sac bulge), then ends near the lake at
  // a circular bulb (~x = -22, z = 0).
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a, roughness: 0.95,
    side: THREE.DoubleSide,           // visible from any angle (no back-face dropout)
    polygonOffset: true,              // bias toward camera so it always wins over grass
    polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const roadCenterline = [];
  // Bezier helper so we can sample at any density.
  const _wmRoadPoint = (t) => {
    const ax = 34,  az = 0;     // east entry
    const bx = -30, bz = 0;     // west bulb
    const cx = 4,   cz = 7;     // pulls curve south a bit
    return {
      x: (1-t)*(1-t)*ax + 2*(1-t)*t*cx + t*t*bx,
      z: (1-t)*(1-t)*az + 2*(1-t)*t*cz + t*t*bz,
    };
  };
  for (let i = 0; i <= 56; i++) roadCenterline.push(_wmRoadPoint(i / 56));
  // v1.35c: build the visible pavement from a DENSER fine sampling, each disc
  // TILTED onto the terrain normal via layOnSlope (quaternion). The old version
  // used 56 horizontal discs with an approximate two-euler tilt, which on the
  // steep east entry left them not-flush and under-overlapped → spotty/gappy.
  // 96 samples guarantee heavy overlap even where the grade stretches spacing,
  // and the quaternion tilt lays every disc flat against the hill. (Matches the
  // clean Bunratty road.) roadCenterline above stays at 56 for the placement/AI
  // systems that sample it.
  // v1.116 (backlog D.3 step 2, the road and kerbs): the pavement was 96 overlapping asphalt discs down the bezier and
  // 19 more tiling the bulb (scalloped edges, ~115 draw calls). It is now one ribbon mesh that follows the curve and
  // the ground (every vertex on groundY, so the cross-roll shows), one polar mesh for the bulb, and a concrete gutter
  // pan and rolled kerb along both edges and round the bulb that drop flat across each driveway and open where the
  // road meets the bulb; plus two manholes, two storm-drain grates, crack sealing and a patch. Visual only: the kerb
  // is 9 cm and rolled, and has no collision, as before (the discs had none). roadCenterline is unchanged, so every
  // placement and the AI that sample it are untouched. Built once houseCenters exists (the driveway drops need it).
  function buildWinnmarkRoad(houseCenters) {
    // v1.127: the builder is shared with Bunratty's lane (buildStreetRoad); Winnmark passes its bezier and furniture.
    // v1.338 (D.51 step 1): past the entry the road runs on about 195 m, up 1.5 m, to Winnmark Dr (265 m from the bulb,
    // as the real court). The box's own samples stay where they were: the extension is laid on t < -0.13 at the same
    // step in t, so buildStreetRoad's points from the entry to the bulb are the old ones.
    const deriv0 = (t) => ({ x: 2 * (1 - t) * (4 - 34) + 2 * t * (-30 - 4), z: 2 * (1 - t) * (7 - 0) + 2 * t * (0 - 7) });
    const RX_K = 200, TA = -0.13;
    let tEnd = 1; for (let t = 0.8; t <= 1; t += 0.002) if (Math.hypot(_wmRoadPoint(t).x + 30, _wmRoadPoint(t).z) < 5) { tEnd = t; break; }
    const dt = (tEnd - TA) / 170, T0 = TA - RX_K * dt;
    const E0 = _wmRoadPoint(TA), d0 = deriv0(TA), l0 = Math.hypot(d0.x, d0.z);
    const E1 = { x: E0.x - d0.x / l0 * 14, z: E0.z - d0.z / l0 * 14 }, E2 = { x: 120, z: 0 }, E3 = { x: WM_REAL.drX + 1, z: 0 };
    const ext = u => { const m = 1 - u; return {
      x: m*m*m*E0.x + 3*m*m*u*E1.x + 3*m*u*u*E2.x + u*u*u*E3.x, z: m*m*m*E0.z + 3*m*m*u*E1.z + 3*m*u*u*E2.z + u*u*u*E3.z }; };
    const uOf = t => (TA - t) / (TA - T0);
    const point = t => t >= TA ? _wmRoadPoint(t) : ext(uOf(t));
    const deriv = t => { if (t >= TA) return deriv0(t); const a = ext(Math.max(0, uOf(t) - 0.002)), b2 = ext(Math.min(1, uOf(t) + 0.002)); return { x: a.x - b2.x, z: a.z - b2.z }; };
    return buildStreetRoad(scene, {
      point, deriv,
      groundY, groundNormal, asphMat: roadMat, houseCenters,
      ASPH: 3.45, bulb: { x: -30, z: 0, r: _realBulb ? WM_BULB.r : 6.3 }, T0, NS: 170 + RX_K,   // v1.342: the real bulb's 11 m
      manholes: [[0.22, -0.6], [0.58, 0.9]], drains: [[0.34, 1], [0.7, -1]],
      cracks: [[0.12, 5.5, 0.5], [0.47, 6.2, -0.35], [0.82, 4.8, 0.2]], patch: 0.4,
    });
  }

  // === Houses — 8 of them, placed on either side of the road ===
  // I’m placing them based on rough satellite analogues. Each house has:
  //   - id (for character mapping)
  //   - x, z, width, depth
  //   - brick palette + roof palette
  //   - face direction (toward road)
  // Backyards extend away from the road, into the woods.
  //
  // North side (positive Z down toward road means north of road = negative Z):
  //   Seth's house is the easternmost north-side house.
  //
  // I gave each house a unique brick/trim palette to break monotony. Lots of
  // these are inspired by the warmer red-brick and tan-stucco palette from the
  // reference photos.
  const houseObs = [];
  // v1.342: what is built from here to Seth's area is the box's (its houses, driveways, fences, trees, cover, cars, fort),
  // but for the street's lots and road: with the bulb at real size it is taken out again (below), after the box has made
  // its random draws, so every match's draws stay as they were
  const _boxFrom = scene.children.length;
  // v1.15: houses pushed further from the road (bigger driveways) and spread
  // wider in X (~16m apart, was ~12). North row z=-15, south row z=19.
  // v1.312 (backlog D.55 step 4; docs/refs/winnmark.md gap 5): the street's three real finishes, in turn along each row:
  // A rose-tan brick, B deep red brick with cream quoins and a cream belt course, C beige stucco with cream quoins.
  // Each has the steep grey-brown roof (4 m rise, about 45 degrees), a two-storey arched entry with columns and a
  // three-sided bay; A one front gable, B two, C three. Today's footprints and places; the garage wings would not fit.
  const WM_LOOK = {
    A: { brick: 0xa88e80, look: { rise: 4.0, gables: 1, arch: true, shutters: [0x1e1e20, 0x2a2420, 0x1e2634] } },
    B: { brick: 0x8a4a40, look: { rise: 4.0, gables: 2, arch: true, quoin: 0xe6dfd0, belt: 0xe6dfd0, shutters: [0x1a1a1c, 0x1e2634] } },
    C: { brick: 0xb8a888, look: { rise: 4.0, gables: 3, arch: true, quoin: 0xe6dfd0, archWin: true, shutters: [0x2a2420, 0x1e2634, 0x1e1e20] } },
  };
  // North side (north of road; faces SOUTH toward road)
  houseObs.push(buildSuburbanHouse(scene, {
    x: 24, z: -15, width: 9, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.B.brick, roofColor: 0x6e6a62, faceDir: 'south', detail: true,
    look: { ...WM_LOOK.B.look, bay: -1 },
  })); // Seth's
  houseObs.push(buildSuburbanHouse(scene, {
    x: 8, z: -16, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.A.brick, roofColor: 0x726c62, faceDir: 'south', detail: true,
    look: { ...WM_LOOK.A.look, bay: 1 },
  }));
  houseObs.push(buildSuburbanHouse(scene, {
    x: -8, z: -16, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.C.brick, roofColor: 0x686660, faceDir: 'south', detail: true,
    look: { ...WM_LOOK.C.look, bay: -1 },
  }));
  houseObs.push(buildSuburbanHouse(scene, {
    x: -18, z: -15, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.B.brick, roofColor: 0x6a6660, faceDir: 'south', detail: true,
    look: { ...WM_LOOK.B.look, bay: 1 },
  })); // lakeside corner-ish (pulled east to clear the cul-de-sac bulb)
  // South side (south of road; faces NORTH toward road)
  houseObs.push(buildSuburbanHouse(scene, {
    x: 22, z: 19, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.C.brick, roofColor: 0x746e66, faceDir: 'north', detail: true,
    look: { ...WM_LOOK.C.look, bay: 1 },
  }));
  houseObs.push(buildSuburbanHouse(scene, {
    x: 7, z: 20, width: 9, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.A.brick, roofColor: 0x6c6862, faceDir: 'north', detail: true,
    look: { ...WM_LOOK.A.look, bay: -1 },
  }));
  houseObs.push(buildSuburbanHouse(scene, {
    x: -9, z: 20, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.B.brick, roofColor: 0x666258, faceDir: 'north', detail: true,
    look: { ...WM_LOOK.B.look, bay: 1 },
  }));
  houseObs.push(buildSuburbanHouse(scene, {
    x: -17, z: 19, width: 8, depth: 7, trimColor: 0xe6dfd0,
    brickColor: WM_LOOK.C.brick, roofColor: 0x706c66, faceDir: 'north', detail: true,
    look: { ...WM_LOOK.C.look, bay: -1 },
  })); // lakeside south corner (pulled east to clear the cul-de-sac bulb)
  // v1.28l: seat every house on the slope (sinks to the lowest footprint corner
  // so the uphill side buries into the grade like a real foundation, no float).
  sinkObsList(houseObs);

  // === Driveways — pale concrete pad in front of each house ===
  // We approximate each driveway as a wide rectangle from the road centerline
  // up to the house's front face. Doesn't need precision.
  const drivewayMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.95 });
  // For each house obstacle, draw a driveway from the road edge to the house.
  // Use the house position and the road centerline to estimate driveway endpoints.
  const houseCenters = [
    { x: 24, z: -15, side: 'north' },
    { x:  8, z: -16, side: 'north' },
    { x: -8, z: -16, side: 'north' },
    { x: -18, z: -15, side: 'north' },
    { x: 22, z: 19, side: 'south' },
    { x:  7, z: 20, side: 'south' },
    { x: -9, z: 20, side: 'south' },
    { x: -17, z: 19, side: 'south' },
  ];
  // v1.339 (D.51 step 2): the street's houses past the box at real size, their walk-outs, decks, terraces and fences
  // v1.342: with the bulb at real size, its lots' driveways start at the curved street's edge or the bulb's on their side
  const roadZAt = x => { let z = 0, b = Infinity; for (const p of roadCenterline) if (Math.abs(p.x - x) < b) { b = Math.abs(p.x - x); z = p.z; } return x > 34 ? 0 : z; };
  const roadEdge = (x, s) => {
    const dx = Math.abs(x - WM_BULB.x), bz = dx < WM_BULB.r + 0.6 ? Math.sqrt((WM_BULB.r + 0.6) ** 2 - dx * dx) : 0;
    return s > 0 ? Math.max(roadZAt(x) + 3.6, bz) : Math.min(roadZAt(x) - 3.6, -bz);
  };
  const wmLots = buildWinnmarkLots(scene, { groundY, looks: WM_LOOK, night: _night, bulb: _realBulb, roadEdge });
  buildWinnmarkRoad(_realBulb ? wmLots.drives : houseCenters.concat(wmLots.drives));   // v1.116: the road, the bulb and the kerbs (the driveway drops need houseCenters)
  for (const hc of houseCenters) {
    // Driveway runs from the house front all the way to the ACTUAL road edge.
    // v1.76: the road is a curving bezier (bulges south), so the near edge isn't
    // at a fixed z=0±3.5 — it's at (roadCenterlineZ at this house's X) ± half-
    // width. The old code stopped the pad at the straight-line z=±3.5, leaving a
    // green gap between the driveway end and the curved pavement. Sample the
    // centerline nearest this house's X to find the true edge, and overshoot it
    // slightly so the pad tucks UNDER the road edge with no seam.
    let roadCZ = 0, bestDX = Infinity;
    for (const p of roadCenterline) {
      const dxp = Math.abs(p.x - hc.x);
      if (dxp < bestDX) { bestDX = dxp; roadCZ = p.z; }
    }
    const ROAD_HALF_W = 3.5;
    const houseFront = hc.side === 'north' ? hc.z + 3.5 : hc.z - 3.5;
    // Road edge nearest this house, overshot 0.5m into the asphalt for a clean join.
    const roadEdge = hc.side === 'north' ? (roadCZ - ROAD_HALF_W - 0.5)
                                         : (roadCZ + ROAD_HALF_W + 0.5);
    const minZ = hc.side === 'north' ? houseFront : roadEdge;
    const maxZ = hc.side === 'north' ? roadEdge : houseFront;
    const z0 = Math.min(minZ, maxZ), z1 = Math.max(minZ, maxZ);
    const span = z1 - z0;
    const segLen = 2.0;
    const nSeg = Math.max(1, Math.ceil(span / segLen));
    const step = span / nSeg;
    for (let s = 0; s < nSeg; s++) {
      const dz = z0 + step * (s + 0.5);
      // Slight overlap (step + 0.4) so seams don't open on the grade.
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(4.0, step + 0.4), drivewayMat);
      layOnSlope(seg, hc.x, dz, 0.018);
      seg.receiveShadow = true;
      scene.add(seg);
    }
  }

  // === Backyard fences — partial fences between adjacent backyards to
  // create natural sightlines and choke points. NOT a full grid of fences;
  // we want backyards to feel like they connect through the woods.
  //
  // Style: black wrought-iron — vertical pickets with horizontal top/bottom rails
  // and a top spike on each picket. Pickets have visible gaps so the fence reads
  // as see-through, which also gives an excuse for BBs to occasionally slip through
  // a gap (collision is still the full AABB — a future polish item is per-picket
  // hit testing).
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x18181a, roughness: 0.5, metalness: 0.55,
  });
  function fence(x1, z1, x2, z2, h = 1.4) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dz, dx);
    const group = new THREE.Group();
    group.position.set((x1+x2)/2, 0, (z1+z2)/2);
    group.rotation.y = -angle;

    // Top + bottom rails (horizontal bars running along fence length)
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.04), fenceMat);
    railTop.position.set(0, h - 0.12, 0);
    railTop.castShadow = true;
    group.add(railTop);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.04), fenceMat);
    railBot.position.set(0, 0.12, 0);
    railBot.castShadow = true;
    group.add(railBot);

    // Vertical pickets — spaced ~0.18m apart along the length.
    // Each picket has a thin spike on top.
    const pSpacing = 0.18;
    const nPickets = Math.max(2, Math.floor(len / pSpacing));
    const actualSpacing = len / nPickets;
    for (let i = 0; i <= nPickets; i++) {
      const px = -len/2 + i * actualSpacing;
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, 0.025), fenceMat);
      picket.position.set(px, h/2, 0);
      picket.castShadow = true;
      group.add(picket);
      // Spike on top (small pyramid via cone with 4 segments)
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), fenceMat);
      spike.position.set(px, h + 0.04, 0);
      spike.rotation.y = Math.PI / 4;
      group.add(spike);
    }

    // Posts at each end — thicker square columns with their own caps
    function endPost(localX) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, h + 0.1, 0.09), fenceMat);
      post.position.set(localX, (h + 0.1) / 2, 0);
      post.castShadow = true;
      group.add(post);
      // Pyramid cap
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 4), fenceMat);
      cap.position.set(localX, h + 0.15, 0);
      cap.rotation.y = Math.PI / 4;
      group.add(cap);
    }
    endPost(-len/2); endPost(len/2);

    // v1.28l: seat the fence on the slope — lift the whole group to the lowest
    // ground along its run so it doesn't float/clip on the grade.
    let fgy = groundY(x1, z1);
    fgy = Math.min(fgy, groundY(x2, z2), groundY((x1+x2)/2, (z1+z2)/2));
    group.position.y = fgy;
    scene.add(group);

    // AABB collision: the full fence line. Slightly inflated for player collision
    // forgiveness near the corners.
    return {
      minX: Math.min(x1, x2) - 0.1, maxX: Math.max(x1, x2) + 0.1,
      minZ: Math.min(z1, z2) - 0.1, maxZ: Math.max(z1, z2) + 0.1,
      h, baseY: fgy, surface: 'metal', bbPass: true,  // v1.33: BBs fly through the picket gaps; still blocks bodies
    };
  }
  const fences = [];
  // v1.15: side fences between adjacent backyards, extending from just behind
  // each house out into the deeper yards (toward the tree wall). North houses
  // at z=-15/-16 (yards run to z≈-33); south at z=19/20 (yards to z≈37).
  // North side — fences sit between houses at the x-midpoints.
  fences.push(fence(16, -19, 16, -31));   // east of Seth's (x=24) toward house2 (x=8)
  fences.push(fence(0,  -19, 0,  -31));   // between house2 (8) and house3 (-8)
  fences.push(fence(-13, -19, -13, -31)); // between house3 (-8) and house4 (-18)
  // South side
  fences.push(fence(15, 23, 15, 35));
  fences.push(fence(-1, 23, -1, 35));
  fences.push(fence(-13, 23, -13, 35));

  // === Trees — v1.15: a CONTINUOUS tree wall enclosing the whole street ===
  // The perimeter traces just outside the backyards on all four sides, with the
  // only opening at the east road entry. A second line along the golf-course edge
  // keeps the fairway visible-but-walled-off to the north. Dense double-staggered
  // rows so it reads as a solid wall (no see-through gaps).
  const treeObs = [];
  const bushObs = [];
  const rng = (min, max) => min + gameRandom() * (max - min);

  // Helper: lay a dense double row of trees along a straight segment, staggered
  // so the back row fills the front row's gaps → reads as a solid wall.
  // v1.313 (backlog D.55 step 5; docs/refs/winnmark.md gap 4): about 40 % of the tree walls and the back-yard trees
  // are tall loblollies (bare trunks to 12-15 m, the crown on top) over pine straw; the front-yard ornamentals stay.
  // Which tree is a pine comes from its spot, not the round's random numbers, so every other placement is as before;
  // each keeps its trunk's place and radius.
  const wmStraw = [];
  const wmTree = (x, z, o) => {
    if ((Math.abs(Math.sin(x * 4.898 + z * 7.233) * 24634.6345) % 1) >= 0.4) return addSuburbanTree(scene, x, z, o);
    const h2 = Math.abs(Math.sin(x * 1.37 + z * 2.71) * 9182.3) % 1;
    if (x > -40 && x < 42 && z > -38 && z < 42) wmStraw.push({ x, z, r: 2.4 + h2 });
    return addSuburbanTree(scene, x, z, { ...o, shape: 'loblolly', trunkH: 12 + 3 * h2, leafR: 2.8 + 0.8 * h2 });
  };
  function treeWall(x1, z1, x2, z2, opts = {}) {
    const spacing = opts.spacing ?? 3.0;     // along-line spacing per row
    const rowGap  = opts.rowGap  ?? 2.4;      // perpendicular offset of the 2nd row
    const skipFn  = opts.skip;                 // optional (x,z)=>bool to leave a gap
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;        // unit along line
    const px = -uz, pz = ux;                   // unit perpendicular (outward)
    const n = Math.max(1, Math.floor(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bx = x1 + dx * t, bz = z1 + dz * t;
      // Front row
      if (!skipFn || !skipFn(bx, bz)) {
        const fx = bx + rng(-0.5, 0.5), fz = bz + rng(-0.5, 0.5);
        treeObs.push(wmTree(fx, fz,
          { leafR: rng(1.8, 2.6), trunkH: rng(3.0, 4.6), baseY: groundY(fx, fz), detail: true }));
      }
      // Back row, offset perpendicular + half a step along the line (stagger)
      const sx = bx + ux * (spacing / 2) + px * (opts.outwardSign ?? 1) * rowGap;
      const sz = bz + uz * (spacing / 2) + pz * (opts.outwardSign ?? 1) * rowGap;
      if (!skipFn || !skipFn(sx, sz)) {
        const jx = sx + rng(-0.5, 0.5), jz = sz + rng(-0.5, 0.5);
        treeObs.push(wmTree(jx, jz,
          { leafR: rng(1.8, 2.6), trunkH: rng(3.0, 4.6), baseY: groundY(jx, jz), detail: true }));
      }
    }
  }

  // North wall — behind the north backyards (z ≈ -34), spanning the full width.
  // Outward = further north (toward golf), so the back row sits at z≈-36.
  treeWall(-36, -34, 38, -34, { outwardSign: -1, spacing: 3.0 });
  // South wall — behind the south backyards (z ≈ 38).
  treeWall(-36, 38, 38, 38, { outwardSign: 1, spacing: 3.0 });
  // East wall — closes the east end (x ≈ 38), from north wall to south wall,
  // EXCEPT a gap at the road entry (z ∈ [-5, 5]) so the player can drive in.
  treeWall(38, -34, 38, 38, {
    outwardSign: 1, spacing: 3.0,
    skip: (x, z) => Math.abs(z) < 5,   // road entry gap
  });
  // West wall — between the houses and the lake shore (x ≈ -36), from north to
  // south wall. The cul-de-sac bulb (x=-30) sits just inside this.
  treeWall(-36, -34, -36, 38, { outwardSign: -1, spacing: 3.0 });

  // Golf-course edge line — a thinner row along the FAR (north) side of the
  // fairway so the golf reads as a contained green space, not endless. Sits at
  // z ≈ -60, well past the fairway center (-52). Visible over the north wall.
  for (let i = 0; i < 22; i++) {
    const x = -44 + i * 4.2 + rng(-0.6, 0.6);
    const z = -60 + rng(-1, 1);
    treeObs.push(wmTree(x, z,
      { leafR: rng(1.8, 2.6), trunkH: rng(3.2, 4.8), baseY: groundY(x, z), detail: true }));
  }

  // West-of-lake backdrop trees (beyond the water, frames the view west).
  for (let i = 0; i < 12; i++) {
    const z = -34 + i * 6.2 + rng(-0.8, 0.8);
    const x = rng(-58, -54);
    treeObs.push(wmTree(x, z,
      { leafR: rng(1.8, 2.6), trunkH: rng(3.0, 4.5), baseY: groundY(x, z), detail: true }));
  }

  // Scattered front-yard ornamental trees (smaller) — unchanged flavor.
  for (const hc of houseCenters) {
    const off = hc.side === 'north' ? +6 : -6;
    if (gameRandom() < 0.6) {
      const tx = hc.x + rng(-4, 4), tz = hc.z + off + rng(-1, 1);
      treeObs.push(addSuburbanTree(scene, tx, tz,
        { leafR: rng(1.0, 1.5), trunkH: rng(2.2, 2.8), baseY: groundY(tx, tz), detail: true }));
    }
  }
  // A few scattered trees within the deeper backyards for cover/texture (not a
  // wall — just breaks up the big new yards).
  for (const hc of houseCenters) {
    const backSign = hc.side === 'north' ? -1 : 1;
    const n = 1 + Math.floor(gameRandom() * 2);
    for (let i = 0; i < n; i++) {
      const tz = hc.z + backSign * rng(8, 15);
      const tx = hc.x + rng(-5, 5);
      treeObs.push(wmTree(tx, tz,
        { leafR: rng(1.4, 2.0), trunkH: rng(2.6, 3.6), baseY: groundY(tx, tz), detail: true }));
    }
  }

  addPineStraw(scene, wmStraw, groundY, 0x8a6a4a);   // v1.313

  // === Bushes — front foundation plantings (lots of these in the reference photos) ===
  // 2-3 bushes flanking each house's front door
  for (const hc of houseCenters) {
    const towardRoad = hc.side === 'north' ? +1 : -1;
    const frontZ = hc.z + towardRoad * 4.0;
    bushObs.push(addBush(scene, hc.x - 1.6, frontZ, rng(1.0, 1.4), rng(0.6, 0.9), rng(0.9, 1.2), null, groundY(hc.x - 1.6, frontZ), { detail: true }));
    bushObs.push(addBush(scene, hc.x + 1.6, frontZ, rng(1.0, 1.4), rng(0.6, 0.9), rng(0.9, 1.2), null, groundY(hc.x + 1.6, frontZ), { detail: true }));
    if (gameRandom() < 0.6) {
      const ex = hc.x + rng(-3, 3), ez = frontZ + towardRoad * rng(0.2, 0.8);
      bushObs.push(addBush(scene, ex, ez,
        rng(0.8, 1.2), rng(0.5, 0.8), rng(0.8, 1.1), null, groundY(ex, ez), { detail: true }));
    }
  }

  // === Mailboxes — one per house, at the road-side edge of its driveway ===
  // Real curbside mailboxes sit where the driveway meets the road, on the GRASS
  // just off the pavement — never in the road. The road is a CURVING bezier (it
  // bulges south through the middle), so a fixed Z offset would put some boxes on
  // the asphalt. Instead, for each house we find the nearest road-centerline
  // point and place the mailbox just OUTSIDE the pavement edge along the
  // house→road direction, offset sideways to the driveway edge.
  const ROAD_HALF = 3.5;        // road half-width
  const SHOULDER_GRASS = 1.0;   // sit this far onto the grass beyond the pavement
  for (const hc of houseCenters) {
    // nearest centerline sample to this house
    let best = roadCenterline[0], bestD = Infinity;
    for (const p of roadCenterline) {
      const d = (p.x - hc.x) ** 2 + (p.z - hc.z) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    // unit direction from the road point toward the house (this is "toward grass")
    let dirX = hc.x - best.x, dirZ = hc.z - best.z;
    const dl = Math.hypot(dirX, dirZ) || 1; dirX /= dl; dirZ /= dl;
    // base point: just off the pavement edge on the grass side
    const baseX = best.x + dirX * (ROAD_HALF + SHOULDER_GRASS);
    const baseZ = best.z + dirZ * (ROAD_HALF + SHOULDER_GRASS);
    // shift sideways (perpendicular) to the driveway's side edge (±2.2m)
    const perpX = -dirZ, perpZ = dirX;
    const sideSign = (gameRandom() < 0.5 ? -1 : 1);
    const mbX = baseX + perpX * 2.2 * sideSign;
    const mbZ = baseZ + perpZ * 2.2 * sideSign;
    // v1.76: face the door toward the ROAD. The door is local +Z; the road lies in
    // the −(dirX,dirZ) direction (dir points road→house), so yaw = atan2 of the
    // road-ward vector. Fixes south-side Winnmark boxes that faced the house.
    const mbFacing = Math.atan2(-dirX, -dirZ);
    bushObs.push(sinkObs(addMailbox(scene, mbX, mbZ, { facing: mbFacing }), mbX, mbZ));
  }

  // === Cover collections ===
  // coverList is the global pool of cover items the AI can pick from for repositioning.
  // coverByHouse[i] is per-yard cover (so scenarios can pick "Seth's backyard cover").
  const coverList = [];
  const coverByHouse = []; // parallel to houseCenters

  // === Curbside trash bins (trash-day flavor) ===
  // Half the houses have their bins out — garbage + recycle pair near the curb,
  // on the OPPOSITE side of the driveway from the mailbox. They're decorative
  // collision (player + BBs hit them) but NOT added to the AI's coverList — we
  // don't want an aggressive enemy repositioning across their own house to a
  // curbside bin. They still feel like usable cover for the *player*.
  // Bins face the house (handle-side toward house, label-side toward road).
  const curbsideBins = [];
  for (const hc of houseCenters) {
    if (gameRandom() < 0.5) continue; // skip half — they're not all out
    const towardRoad = hc.side === 'north' ? +1 : -1;
    const binZ = hc.z + towardRoad * 6.5;
    // Place pair offset from the mailbox side. Spacing ~0.8m between bins.
    const binBaseX = hc.x + (gameRandom() < 0.5 ? 1.5 : -1.5);
    const facing = hc.side === 'north' ? Math.PI : 0; // label toward road
    // Garbage on one side, recycle on the other, in random order
    const order = gameRandom() < 0.5 ? ['garbage', 'recycle'] : ['recycle', 'garbage'];
    const bin1 = sinkObs(addCurbsideBin(scene, binBaseX - 0.4, binZ, { variant: order[0], facing, detail: true }), binBaseX - 0.4, binZ);
    const bin2 = sinkObs(addCurbsideBin(scene, binBaseX + 0.4, binZ, { variant: order[1], facing, detail: true }), binBaseX + 0.4, binZ);
    curbsideBins.push(bin1);
    curbsideBins.push(bin2);
  }

  // === Backyard cover — placed in the playable yard zones for AI to use ===
  // Mix of:
  //  - Home Depot moving boxes (orange-stripe branded cardboard)
  //  - Wheeled curbside bins (garbage gray, or recycle blue) — sometimes tipped on side
  //  - Plywood stack with folded lawn chair (kid-fort building material)
  // Heights are tuned so kids can shoot over by lifting (cover h around 0.55–1.1m).

  for (let i = 0; i < houseCenters.length; i++) {
    const hc = houseCenters[i];
    const backwardZ = hc.side === 'north' ? -1 : +1; // direction away from road
    const yardCenterZ = hc.z + backwardZ * 11;        // deeper yards (was 8)
    coverByHouse[i] = [];

    // 3-4 pieces of cover per yard (was 2-3) to fill the larger backyards.
    const numCover = 3 + Math.floor(gameRandom() * 2);
    for (let j = 0; j < numCover; j++) {
      const cx = hc.x + rng(-5, 5);                   // wider spread (was ±3)
      const cz = yardCenterZ + rng(-6, 6);            // deeper spread (was ±3)
      // v1.28k: keep Seth's-yard fort footprint clear (the treehouse-defend
      // spawn sits in it). Don't drop random cover inside its keep-clear radius.
      if (Math.hypot(cx - 21, cz - (-25)) < 4.0) continue;
      const kind = gameRandom();
      let cobj;
      const gy = groundY(cx, cz);
      if (kind < 0.4) {
        // Home Depot moving box — varied dimensions, random facing.
        const w = rng(0.9, 1.3), h = rng(0.85, 1.1), d = rng(0.85, 1.1);
        cobj = sinkObs(addHomeDepotBox(scene, cx, cz, {
          w, h, d, facing: rng(-Math.PI, Math.PI), detail: true,   // v1.115
        }), cx, cz);
      } else if (kind < 0.75) {
        // Wheeled curbside bin — randomly garbage or recycle, ~15% chance tipped.
        const variant = gameRandom() < 0.55 ? 'garbage' : 'recycle';
        const tipped = gameRandom() < 0.15;
        cobj = sinkObs(addCurbsideBin(scene, cx, cz, {
          variant, tipped, facing: rng(-Math.PI, Math.PI), detail: true,   // v1.115
        }), cx, cz);
      } else {
        // Stacked plywood sheets — proper kid-fort building material.
        // A solid grounded block; folded chair leaned on top for visual interest.
        // Hitbox is the plywood stack (BBs hit it, players walk around it).
        // v1.115: sheets on sleepers with a folding lawn chair on top (buildPlyStack), was one slab and a flat box
        const stack = buildPlyStack(cx, gy, cz, Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1);
        scene.add(stack);
        cobj = { minX: cx - 0.8, maxX: cx + 0.8, minZ: cz - 0.45, maxZ: cz + 0.45, h: 0.55, baseY: gy, mesh: stack, surface: 'hard' };
      }
      coverList.push(cobj);
      coverByHouse[i].push(cobj);
    }
  }

  // === Parked cars in driveways ===
  // About 60% of houses have a car parked in the driveway. Pick a varied palette
  // so the street has color. Orientation faces toward the road (so the trunk
  // sits closer to the house). For north-side houses, the car points south (+Z);
  // for south-side, it points north (-Z).
  //
  // Like the curbside bins, driveway cars are decoration + collision but NOT AI
  // cover — we don't want an enemy walking through their own house to use a car.
  // The cul-de-sac cars below ARE added to coverList because they sit on the road
  // itself, where the bulb fight is meant to play.
  const driveCars = [];
  const carColors = [0x6a8aa8, 0x8a4030, 0x2a3a4a, 0x4a4a4a, 0xc8b878, 0x3a5a3a, 0xa8a8a8];
  for (const hc of houseCenters) {
    if (gameRandom() > 0.6) continue;
    // v1.56: never park a random car in Seth's driveway (house 0). It sits right
    // at the throat of the only lane between the backyard and the road, and the
    // Treehouse-defend attackers staged in the backyard kept jamming on it (plus
    // the house corner). Skipping it keeps that lane clear; no other house's
    // driveway sits on an active push lane, so this costs nothing elsewhere.
    if (hc.x === 24 && hc.z === -15) continue;
    const towardRoad = hc.side === 'north' ? +1 : -1;
    // Position along the driveway. v1.76: the car is 3.6m long (half = 1.8m) and
    // points along Z. The old offset (4.5m) put the car's REAR ~0.8m inside the
    // house front (at hc.z±3.5) — the "car parked partly inside the house" bug.
    // Place the center so the rear clears the front by ~0.3m: front(3.5) + half
    // length(1.8) + margin(0.3) = 5.6m out toward the road. Keep a little lateral
    // jitter only (no Z jitter, so the clearance is guaranteed).
    const carX = hc.x + rng(-1.2, 1.2);
    const carZ = hc.z + towardRoad * 5.6;
    // Orientation: car length along Z (facing road)
    const orientation = hc.side === 'north' ? Math.PI / 2 : -Math.PI / 2;
    const color = carColors[Math.floor(gameRandom() * carColors.length)];
    // v1.76: pass groundNormal so the car tilts onto the grade (all 4 tires touch).
    const carObs = sinkObs(addCar(scene, carX, carZ, { orientation, color, groundNormalFn: groundNormal, detail: true }), carX, carZ);
    pushCarObs(driveCars, carObs);
  }

  // === Cul-de-sac center cover (always built — these are general-purpose battlefield cover) ===
  // Two parked cars + a kid-built plank fort make the bulb the natural focal point
  // of attack/defend scenarios. Even single-yard 1v1s benefit from these existing,
  // since the player might push west and use them. They're added to coverList so
  // the AI can use them when scenarios place a kid near the bulb.
  {
    // Car at the curb just inside the bulb (bulb now at x=-30)
    const carObs = sinkObs(addCar(scene, -30, -3.5, { orientation: 0, color: 0x6a8aa8, groundNormalFn: groundNormal, detail: true }), -30, -3.5);
    pushCarObs(coverList, carObs);
    // A second car at the south curb of the bulb
    const carObs2 = sinkObs(addCar(scene, -27, 5, { orientation: 0.2, color: 0x8a4030, groundNormalFn: groundNormal, detail: true }), -27, 5);
    pushCarObs(coverList, carObs2);
    // v1.28k: a proper U-shaped plywood kid-fort in the cul-de-sac bulb.
    // Attackers come from the EAST (road entry x=34), so the fort's solid back
    // wall faces EAST — the defender crouches behind it and peeks out at the
    // incoming push. Moved forward from x=-33 (which buried it in the west tree
    // line, "too far back/inside the trees") to x=-29, so it sits IN the bulb
    // as the focal point rather than behind it.
    const fortWalls = buildKidFort(scene, -29, 0, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true });  // v1.76: taller default walls + corner bins; v1.114: the built-up fort
    seatFortOnSlope(fortWalls, -29, 0);   // v1.28l: lift the shared group once, tag baseY on each wall (+ corner bins, v1.76)
    for (const w of fortWalls) coverList.push(w);
    // Stash references for placements table below
    var culDeSacCar1Obs = carObs;
    var culDeSacCar2Obs = carObs2;
    var culDeSacPlankObs = fortWalls[0]; // back wall is the primary cover ref
  }

  // === Treehouse defend fort (v1.56) — MOVED from Seth's backyard to the east
  // road mouth. The backyard placement forced the 2 attackers to push up a single
  // pinched lane past Seth's house + driveway car, where they jammed. Now the
  // player holds a fort at the east end (just inside the tree-gap entry, x≈33)
  // facing WEST, and the attackers stage back in the (now empty) backyard and push
  // OUT toward the road — a long open approach down the yard and onto the road
  // spine, no house corner to wrap. The road's staggered bounding cover (built
  // below) gives both sides things to use along the way.
  // Old position was (21,-25, faceDir E); flavor is now "you grabbed the spot by
  // the woods at the mouth of the street first."
  // v1.65: GATED to the treehouse variant. This fort sits at x≈33, right on top
  // of the `cluster_road_east` (x=31) attacker spawn used by every OTHER defend
  // scenario (Hold the Fort, etc.). It was built unconditionally, so in those
  // scenarios the first kid in the spawn huddle (Seth, whose ring angle lands at
  // +x/+z) materialized INSIDE this U-shaped fort and wedged against its back
  // wall — "Seth never pushes." It belongs only to the treehouse defend, where
  // the player actually spawns behind it (playerSpawn 'east_fort') and attackers
  // come from the far west cluster, nowhere near x=33.
  // v1.341 (D.51 step 4, Michael: A): the fort is in the wood on the lot east of Seth's now, the attackers coming up
  // through his back yard; the box's mouth (33, 0) has no fort in any match.
  if (variant === 'treehouse') {
    const FT = WM_SA.fort;
    const fw = buildKidFort(scene, FT.x, FT.z, { faceDir: 'W', width: 3.8, depth: 2.4, detail: true });  // v1.76: taller walls + corner bins; v1.114: the built-up fort
    seatFortOnSlope(fw, FT.x, FT.z);
    for (const w of fw) coverList.push(w);
  }

  // === Street cover (v1.14) — staggered bounding cover down the road ===
  // Playtest: attackers (and the player) had nothing to use on the open road
  // and just walked straight up the middle to get picked off. We lay cover
  // pieces along the bezier centerline at regular intervals, alternating which
  // side of the road they sit on, so there's always something to bound to a
  // few meters ahead — for pushes in *either* direction. The center lane stays
  // walkable; pieces sit ~2.2m off the centerline (road half-width is 3.5m).
  // These ARE added to coverList so the AI uses them as real cover too.
  const roadCover = [];
  {
    // Sample the centerline densely so we can place by arc-position, skipping
    // the cul-de-sac bulb (x < -16, where the cars+fort already are) and the
    // east entry mouth (x > 27, the tree gap / player spawn area).
    let lastX = 999, side = 1; // start placing on the north side, then alternate
    const stepEvery = 6.0; // meters of centerline between pieces (moderate density)
    // Build a finer centerline for placement
    const fine = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const ax = 34, az = 0, bx = -30, bz = 0, cx = 4, cz = 7;
      fine.push({
        x: (1-t)*(1-t)*ax + 2*(1-t)*t*cx + t*t*bx,
        z: (1-t)*(1-t)*az + 2*(1-t)*t*cz + t*t*bz,
      });
    }
    // Walk the fine centerline accumulating arc length; drop a piece each step.
    let acc = stepEvery; // so the first eligible point places immediately
    for (let i = 1; i < fine.length; i++) {
      const dx = fine[i].x - fine[i-1].x, dz = fine[i].z - fine[i-1].z;
      acc += Math.hypot(dx, dz);
      if (acc < stepEvery) continue;
      const p = fine[i];
      // Skip the bulb (cars+fort already there, x<-23) and the east mouth (x>27,
      // where the road-east cluster at 31 and player road_east spawn at 32 sit).
      if (p.x < -23 || p.x > 27) continue;
      acc = 0;
      // Perpendicular to the local tangent, offset to the current side
      const tx = dx, tz = dz, tl = Math.hypot(tx, tz) || 1;
      // perpendicular (normalized): (-tz, tx)
      const px = -tz / tl, pz = tx / tl;
      const offset = 2.2 * side;
      const cxp = p.x + px * offset;
      const czp = p.z + pz * offset;
      // Pick a cover type — mix of moving boxes, bins, plywood, and the
      // occasional car parked at an angle. Weighted toward solid waist/chest
      // pieces a kid can crouch behind.
      const kind = gameRandom();
      let cobj;
      const gyp = groundY(cxp, czp);
      if (kind < 0.30) {
        const carColor = carColors[Math.floor(gameRandom() * carColors.length)];
        cobj = sinkObs(addCar(scene, cxp, czp, { orientation: Math.atan2(tz, tx) + rng(-0.3, 0.3), color: carColor, groundNormalFn: groundNormal, detail: true }), cxp, czp);
      } else if (kind < 0.62) {
        const w = rng(1.0, 1.4), h = rng(0.95, 1.2), d = rng(0.95, 1.2);
        cobj = sinkObs(addHomeDepotBox(scene, cxp, czp, { w, h, d, facing: rng(-Math.PI, Math.PI), detail: true }), cxp, czp);   // v1.115
      } else if (kind < 0.85) {
        const variant = gameRandom() < 0.5 ? 'garbage' : 'recycle';
        cobj = sinkObs(addCurbsideBin(scene, cxp, czp, { variant, tipped: gameRandom() < 0.2, facing: rng(-Math.PI, Math.PI), detail: true }), cxp, czp);   // v1.115
      } else {
        // plywood stack + chair (grounded waist-high)
        const plyMat = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.95 });
        const stack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.9), plyMat);
        stack.position.set(cxp, gyp + 0.3, czp);
        stack.rotation.y = rng(-Math.PI, Math.PI);
        stack.castShadow = stack.receiveShadow = true;
        scene.add(stack);
        cobj = { minX: cxp - 0.8, maxX: cxp + 0.8, minZ: czp - 0.45, maxZ: czp + 0.45, h: 0.6, baseY: gyp, mesh: stack, surface: 'hard' };
      }
      coverList.push(cobj);
      roadCover.push(cobj);
      // v1.54: cars carry a stacked upper-cabin box — collect it too.
      if (cobj && cobj._stacked) { coverList.push(cobj._stacked); roadCover.push(cobj._stacked); }
      side *= -1; // alternate sides for a staggered, zig-zag bounding path
    }
  }

  // === Map bounds ===
  const boxBounds = { minX: -36, maxX: 40, minZ: -33, maxZ: 37 };
  const bounds = Object.assign({}, _area === 'seth' ? WM_SA.bounds : WM_BA.bounds);   // v1.341: Seth's area; v1.343: or the bulb's

  // === Placements table — named anchor positions + nearby cover refs ===
  // Scenarios reference these by string name in `enemySetup[i].anchor`.
  // Each placement: { pos: Vector3, cover: coverObj } — cover is what the enemy's
  // homeCover gets set to (defines the height-clear logic).
  const placements = {
    // === Cul-de-sac bulb defenders (for attack scenarios) — bulb now at x=-30 ===
    cul_de_sac_car1:  { pos: new THREE.Vector3(-30, 0, -3.5), cover: culDeSacCar1Obs },
    cul_de_sac_car2:  { pos: new THREE.Vector3(-27, 0, 5),    cover: culDeSacCar2Obs },
    cul_de_sac_plank: { pos: new THREE.Vector3(-32.4, 0, 0),  cover: culDeSacPlankObs },
    // === Backyard defenders (for skirmish / defend scenarios) ===
    // Positioned ~11m into the (now deeper) backyards from the house center.
    seth_backyard:    { pos: new THREE.Vector3(houseCenters[0].x - 2, 0, houseCenters[0].z - 11), cover: coverByHouse[0]?.[0] },
    house1_backyard:  { pos: new THREE.Vector3(houseCenters[1].x + 1, 0, houseCenters[1].z - 10), cover: coverByHouse[1]?.[0] },
    house2_backyard:  { pos: new THREE.Vector3(houseCenters[2].x - 1, 0, houseCenters[2].z - 11), cover: coverByHouse[2]?.[0] },
    trey_backyard:    { pos: new THREE.Vector3(houseCenters[3].x + 1, 0, houseCenters[3].z - 10), cover: coverByHouse[3]?.[0] },
    house4_backyard:  { pos: new THREE.Vector3(houseCenters[4].x - 1, 0, houseCenters[4].z + 11), cover: coverByHouse[4]?.[0] },
    brooke_backyard:  { pos: new THREE.Vector3(houseCenters[5].x,     0, houseCenters[5].z + 11), cover: coverByHouse[5]?.[0] },
    house6_backyard:  { pos: new THREE.Vector3(houseCenters[6].x + 1, 0, houseCenters[6].z + 10), cover: coverByHouse[6]?.[0] },
    house7_backyard:  { pos: new THREE.Vector3(houseCenters[7].x - 2, 0, houseCenters[7].z + 11), cover: coverByHouse[7]?.[0] },
    // === Road attackers (for defend scenarios where enemies push from the east end) ===
    road_east_north:  { pos: new THREE.Vector3(28, 0, -3), cover: null },
    road_east_south:  { pos: new THREE.Vector3(28, 0,  3), cover: null },
    road_mid_north:   { pos: new THREE.Vector3(8, 0, -3), cover: null },
    road_mid_south:   { pos: new THREE.Vector3(8, 0,  3), cover: null },
    // v1.57: tutorial placements. Player spawns at road_east (32,0) facing west;
    // the three practice dummies stand in a shallow arc down the road to the west
    // so they're straight ahead once you walk up to the move marker. Seth the coach
    // stands off to the side (north shoulder) as a friendly, near-passive ally.
    tut_dummy_1:      { pos: new THREE.Vector3(16, 0, -2), cover: null },
    tut_dummy_2:      { pos: new THREE.Vector3(13, 0,  2), cover: null },
    tut_dummy_3:      { pos: new THREE.Vector3(10, 0, -1), cover: null },
    tut_coach:        { pos: new THREE.Vector3(26, 0, -4), cover: null },
    // v1.56: Treehouse-defend push anchors, REVERSED direction. The fort moved to
    // the east mouth (x=33) and the attackers now stage in Seth's empty backyard
    // (~21,-25) and push OUT toward the road. Deploy targets sit just WEST of the
    // house footprint (x∈[19.5,28.5]) in the open yard/driveway mouth, so the kids
    // clear the house on its open west side and flow onto the road spine heading
    // east toward the player — no corner to wrap, and the driveway car at Seth's
    // is now suppressed (see car loop above).
    treehouse_push_e: { pos: new THREE.Vector3(18, 0, -4), cover: null },
    treehouse_push_w: { pos: new THREE.Vector3(16, 0, -8), cover: null },
    // === Enemy spawn clusters (v1.14) — one staging area per map end ===
    cluster_road_east: { pos: new THREE.Vector3(31, 0, 0),  cover: null }, // east entry — attackers in defend scenarios
    // v1.56: staging deep in Seth's backyard (where the fort used to sit). The
    // 2-kid huddle starts here and deploys forward/west out of the yard, around the
    // house's open west side, onto the road, then east toward the player's fort.
    cluster_treehouse: { pos: new THREE.Vector3(20, 0, -23), cover: null },
    cluster_bulb:      { pos: new THREE.Vector3(-31, 0, 0), cover: null }, // cul-de-sac — defenders in attack scenarios
    // v1.265 (decisions, Michael: A, the lot's rule on every free-for-all): Every Kid for Themselves' starts. Seth's
    // own backyard was 27.9 m from road_east with nobody nearer him than you (Trey 39 m), so he walked straight to you.
    // Each start is out of the others' sight (muzzle 1.05 m to chest 0.95 m, from points 0.6 m round each) in both of
    // the street's layouts (the first match built after a page load draws its yard trees and props differently from
    // the rest), 19.5 m or more from every other, and every kid has another kid's start nearer than yours (found by a
    // search over the street).
    ffa_1: { pos: new THREE.Vector3(22.5, 0, -26.5), cover: null },
    ffa_2: { pos: new THREE.Vector3(0.5, 0, -16.5), cover: null },
    ffa_3: { pos: new THREE.Vector3(-15.5, 0, 23.5), cover: null },
    ffa_4: { pos: new THREE.Vector3(12.5, 0, 23.5), cover: null },
  };

  // === Player spawn anchors ===
  const playerSpawns = {
    road_east:        { pos: new THREE.Vector3(32, 0, 0),  yaw: Math.PI / 2 },     // east entry, facing west down the road
    bulb_center:      { pos: new THREE.Vector3(-31.5, 0, 0), yaw: -Math.PI / 2 },  // behind the bulb fort's back wall (fort at x=-29), facing east (+x, the attack direction). v1.59: was +PI/2 which faced west, away from the incoming attackers.
    // Deep in Seth's backyard, clear of the side fences (now at x=16 and x=0).
    // Seth's house is at x=24, z=-15; spawn in the yard behind/west of it.
    seth_yard_west:   { pos: new THREE.Vector3(21, 0, -25), yaw: Math.PI },
    // v1.56: behind the east-mouth Treehouse fort (fort at x=33, faces W), 2.5m
    // behind its back wall, facing west — the attack direction.
    // v1.59: yaw corrected to +PI/2 (faces -x = west). The old -PI/2 faced east,
    // i.e. out the back of the fort, away from the attackers pushing up from the
    // west — the new map facing-arrow made the backwards spawn obvious.
    east_fort:        { pos: new THREE.Vector3(35.5, 0, 0), yaw: Math.PI / 2 },
  };

  // === v1.341 (D.51 step 4; Michael 26 Oct: A): Seth's play area (WM_SA) ===
  // A match in Seth's area plays on his lot and the lots round it on the real-scale street, with the box's start and
  // anchor names moved here. Its cover is its own, under its own seed, so every match here has the same woods and props
  // and the box's matches draw what they drew. The wood on the south lots is solid trunks (the scenery's are left out
  // round it), with shrubs and fallen logs; the street and the north lawns get parked cars, bins and boxes; Seth's
  // patio a firewood stack and a grill, his east side yard a shed. A hedge closes the gaps between the north houses, the
  // lot-line fences mark its east and west sides, and three lamps light the street at night.
  const saObs = [];
  const _boxTo = scene.children.length, _coverFrom = coverList.length;   // v1.342: the box's own scene objects and cover end here
  if (_area === 'seth') {
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    const SAP = {
      seth_backyard:   { pos: V(93, 46) },    // on the patio past the hot tub, by the firewood
      house1_backyard: { pos: V(100.5, -8) }, // the north lawn across from his house
      house2_backyard: { pos: V(84, -8.5) },  // the north lawn, by the west house's driveway car
      trey_backyard:   { pos: V(71.5, -8) },  // the north lawn's west end
      house4_backyard: { pos: V(127, 44) },   // the east lot's wood
      brooke_backyard: { pos: V(114, 45.5) }, // his east side yard, below the patio's corner, by the shed
      house6_backyard: { pos: V(73.5, 30) },  // the west lot's wood
      house7_backyard: { pos: V(83, 19) },    // the west lot's front, by its shrub over Seth's sunk lawn
      road_east_north: { pos: V(126, -3) }, road_east_south: { pos: V(126, 3) },
      road_mid_north:  { pos: V(100, -3) }, road_mid_south:  { pos: V(100, 3) },
      treehouse_push_e: { pos: V(116.5, 39) }, treehouse_push_w: { pos: V(113, 52) },
      cluster_road_east: { pos: V(130, 0) },
      cluster_treehouse: { pos: V(100, 56.5) },   // the foot of his back yard, above the creek
      cluster_west:    { pos: V(70, 20) },    // the west lot's front, out of sight of the street's east end
      trey_overwatch:  { pos: V(73.5, -8.8) },   // Trey on Overwatch: the front step of the house across the street, behind its planter
      // Every Kid for Themselves (Michael: A, 15 Oct, the lot's rule): found by a search over the area, each out of sight
      // of every other and of yours, 27 m or more apart, every kid nearer another kid's start than yours, in every
      // Pickup Game size, none where the spawn clearer would move it, and none within 46 m of yours (Seth on his own sunk
      // front lawn, 32 m off, walked in and tagged a player standing at his start at 6.5 s): Seth in the shared wood by the
      // creek behind the east lot, Trey in the west lot's wood, Brooke over the creek in its far west corner, Jamie on the
      // north lawn by the west house's driveway
      ffa_1: { pos: V(126.8, 62) }, ffa_2: { pos: V(75.8, 32) }, ffa_3: { pos: V(66.8, 62) }, ffa_4: { pos: V(84.8, -10) },
    };
    const SAS = {
      road_east:      { pos: V(130, 0), yaw: Math.PI / 2 },       // the street's east end, facing west down it
      east_fort:      { pos: V(WM_SA.fort.x + 3.5, WM_SA.fort.z), yaw: Math.PI / 2 },   // behind the fort, facing west
      seth_yard_west: { pos: V(90, 50), yaw: Math.PI },
    };
    // the trees keep off the starts and anchors (the free-for-all's starts were found among the trees, so not those)
    const keep = [...Object.entries(SAP).filter(([k]) => !/^ffa_/.test(k)).map(([, p]) => p), ...Object.values(SAS)].map(p => p.pos);
    const clearOf = (x, z, d) => keep.every(p => Math.hypot(p.x - x, p.z - z) >= d);
    withSeededRandom('winnmark-seth-area', () => {
      const SA = WM_SA.bounds, H = WM_SETH, r = (a, b) => a + (b - a) * gameRandom();
      const cover = (o, name) => { if (!o) return o; coverList.push(o); if (o._stacked) coverList.push(o._stacked); if (name) SAP[name].cover = o; return o; };
      const onSethLot = (x, z, m) => Math.abs(x - H.x) < H.half + m && z > 3 && z < H.patio + 1 + m;
      const creekD = (x, z) => _wmPolyNear(WM_REAL.creek, x, z).d;
      const FT = WM_SA.fort, nearFort = (x, z, d) => variant === 'treehouse' && Math.hypot(x - FT.x, z - FT.z) < d;
      const box = (x, z, w, h, d, color, surface, extra) => {   // a plain prop, built at the ground and sunk onto it
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
        m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
        return sinkObs(Object.assign({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, mesh: m, surface }, extra || {}), x, z);
      };
      const BARK = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.97 });
      const log = (x, z, len, alongZ) => {   // a fallen trunk lying on the ground, waist-low cover
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, len, 10), BARK);
        if (alongZ) m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
        m.position.set(x, 0.3, z); m.castShadow = m.receiveShadow = true; scene.add(m);
        const hx = alongZ ? 0.36 : len / 2, hz = alongZ ? len / 2 : 0.36;
        return sinkObs({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, h: 0.62, mesh: m, surface: 'wood' }, x, z);
      };
      // the street and the north lawns: parked cars, the bins out, boxes; the cars first, they're the big cover
      const car = (x, z, yaw, c) => addCar(scene, x, z, { orientation: yaw, color: carColors[c], groundNormalFn: groundNormal, detail: true });
      cover(sinkObs(car(84, -2.2, 0, 0), 84, -2.2));
      cover(sinkObs(car(121, 2.2, Math.PI, 1), 121, 2.2));
      cover(sinkObs(car(88.8, -9.2, Math.PI / 2, 2), 88.8, -9.2), 'house2_backyard');   // the west house's driveway
      cover(sinkObs(car(104.7, -9, Math.PI / 2, 4), 104.7, -9), 'house1_backyard');      // the east house's driveway
      cover(sinkObs(car(H.drive, 13, -Math.PI / 2, 5), H.drive, 13));                     // halfway down Seth's driveway
      for (const [x, z, v] of [[92.4, -4.7, 'garbage'], [93.7, -4.7, 'recycle'], [112.2, 4.9, 'garbage'], [113.5, 4.9, 'recycle'], [70.5, 4.9, 'garbage']])
        cover(sinkObs(addCurbsideBin(scene, x, z, { variant: v, facing: z < 0 ? Math.PI : 0, detail: true }), x, z));
      cover(sinkObs(addHomeDepotBox(scene, 71.5, -10.3, { w: 1.3, h: 1.1, d: 1.1, facing: 0, detail: true }), 71.5, -10.3), 'trey_backyard');
      cover(sinkObs(addHomeDepotBox(scene, 125, -9.5, { w: 1.2, h: 1.0, d: 1.0, facing: 0.2, detail: true }), 125, -9.5));
      cover(sinkObs(addHomeDepotBox(scene, 73, 12, { w: 1.3, h: 1.15, d: 1.1, facing: 0, detail: true }), 73, 12));
      cover(box(127, 12.5, 1.6, 0.6, 0.9, 0xc8a878, 'hard'));   // a plywood stack
      // Trey's planter on the front step across the street: a low brick wall with shrubs in it
      cover(box(73.5, -10.5, 2.4, 0.85, 0.7, 0x8a4a40, 'hard'), 'trey_overwatch');
      // Seth's lot: a firewood stack and a grill on the patio, the AC units in the side yards, a shed in the east one
      cover(box(90.4, 48.6, 2.2, 0.9, 0.8, 0x6a4e3a, 'wood'), 'seth_backyard');
      cover(box(106.4, 40, 0.8, 1.1, 0.6, 0x1e1e20, 'metal'));
      cover(box(86.8, 30, 1.0, 0.95, 1.0, 0x9a9a96, 'metal')); cover(box(113.2, 31, 1.0, 0.95, 1.0, 0x9a9a96, 'metal'));
      cover(box(116.6, 48.8, 2.6, 2.3, 2.4, 0x7a6a52, 'wood'), 'brooke_backyard');
      // the wood: fallen logs, then trunks on a jittered 6 m grid and shrubs, kept off the anchors, his lot and the creek
      const wood = new THREE.Group();
      cover(log(72, 32.4, 4.5, false), 'house6_backyard'); cover(log(127, 46.6, 4, false), 'house4_backyard');
      cover(log(84, 54.6, 4, false)); cover(log(118.5, 56, 3.5, false)); cover(log(73, 50, 3.8, true)); cover(log(124, 52.4, 3.6, false));
      cover(addBush(scene, 81.4, 17.6, 1.8, 1.1, 1.5, 0x3e5a30, groundY(81.4, 17.6), { detail: true }), 'house7_backyard');
      for (let gx = SA.minX + 2; gx < SA.maxX; gx += 6) for (let gz = 9; gz < SA.maxZ + 2; gz += 6) {
        const x = gx + r(-2, 2), z = gz + r(-2, 2), pick = gameRandom(), pine = gameRandom() < 0.45, hr = gameRandom();
        if (x < SA.minX + 0.6 || x > SA.maxX - 0.6 || z > SA.maxZ - 0.4) continue;
        if (onSethLot(x, z, 1.5) || creekD(x, z) < 1.6 || nearFort(x, z, 4.5) || !clearOf(x, z, 2.5)) continue;
        if (saObs.some(o => o.cx != null && Math.hypot(o.cx - x, o.cz - z) < 3.5)) continue;
        if (pick >= (z < 20 ? 0.3 : 0.7)) continue;
        const by = groundY(x, z);
        saObs.push(pine
          ? addSuburbanTree(wood, x, z, { shape: 'loblolly', detail: true, trunkR: 0.34 + 0.1 * hr, trunkH: 12 + 3 * hr, leafR: 2.8 + 0.8 * hr, baseY: by, leafColor: hr < 0.5 ? 0x34482a : 0x3c5232 })
          : addSuburbanTree(wood, x, z, { detail: true, trunkR: 0.3 + 0.14 * hr, trunkH: 4.5 + 2.5 * hr, leafR: 2.6 + 1.0 * hr, baseY: by, leafColor: hr < 0.5 ? 0x3a5a2a : 0x4a6a35 }));
      }
      for (let i = 0; i < 30; i++) {
        const x = r(SA.minX + 1, SA.maxX - 1), z = r(14, SA.maxZ - 1), w = r(1.3, 2.2), h = r(0.9, 1.3);
        if (onSethLot(x, z, 0.5) || creekD(x, z) < 1.8 || nearFort(x, z, 4.5) || !clearOf(x, z, 2.5)) continue;
        if (saObs.some(o => Math.hypot((o.minX + o.maxX) / 2 - x, (o.minZ + o.maxZ) / 2 - z) < 1.6 + w / 2)) continue;
        saObs.push(addBush(wood, x, z, w, h, w * r(0.8, 1.1), gameRandom() < 0.5 ? 0x3e5a30 : 0x4a6a3a, groundY(x, z), { detail: true }));
      }
      // the hedge across the gaps between the north houses, at the area's north edge
      for (const [a, b] of [[64.6, 68], [92.4, 101.2], [122.8, 135.4]]) {
        const n = Math.max(1, Math.round((b - a) / 1.5));
        for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; saObs.push(addBush(wood, x, -12.7, 1.6, 1.25, 1.2, 0x2e4a26, groundY(x, -12.7), { detail: true })); }
      }
      // the trunks, crowns, shrubs and hedge baked into one mesh per material: the street looks west into the box's
      // ~1,800 draw calls, and 160 more meshes here put the view from the east end at 2,350 (budget 2,060)
      scene.add(bakeByMaterial(wood, 'sethAreaWood'));
      // the lot-line fences down the east and west sides, black pickets (the street's, v1.339), outside the bounds
      {
        const parts = [], IRON = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide });
        for (const fx of [SA.minX - 0.3, SA.maxX + 0.3]) {
          const z0 = 5.5, z1 = SA.maxZ + 4, n = Math.round((z1 - z0) / 0.16), posts = Math.round((z1 - z0) / 2.4);
          for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; parts.push({ geo: new THREE.PlaneGeometry(0.03, 1.3), m: new THREE.Matrix4().makeTranslation(fx, groundY(fx, z) + 0.55, z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)) }); }
          for (let i = 0; i < posts; i++) {
            const za = z0 + (z1 - z0) * i / posts, zb = z0 + (z1 - z0) * (i + 1) / posts, ya = groundY(fx, za), yb = groundY(fx, zb), L = Math.hypot(zb - za, yb - ya);
            parts.push({ geo: new THREE.BoxGeometry(0.08, 1.38, 0.08), m: new THREE.Matrix4().makeTranslation(fx, ya + 0.59, za) });
            for (const ry of [0.14, 1.1]) parts.push({ geo: new THREE.BoxGeometry(0.04, 0.04, L), m: new THREE.Matrix4().makeTranslation(fx, (ya + yb) / 2 + ry, (za + zb) / 2).multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(yb - ya, zb - za))) });
          }
        }
        const m = new THREE.Mesh(_houseMergeParts(parts), IRON); m.castShadow = true; m.name = 'sethAreaFences'; scene.add(m);
      }
      // the street's lamps over Seth's end, lit at night (After Dark's "pools of light")
      for (const [x, z] of [[73, 5.1], [97, -5.1], [124, 5.1]]) { const lamp = addStreetlamp(scene, x, z, groundY, _night); if (lamp.userData.obstacles) saObs.push(...lamp.userData.obstacles); }
    });
    Object.assign(placements, SAP);
    Object.assign(playerSpawns, SAS);
  }

  // === v1.343 (D.51 step 4, second part; Michael 26 Oct: A): the bulb's play area (WM_BA) ===
  // The tutorials and the bulb's six matches play at the street's west end on its real lots (WM_BULB_LOTS): the bulb
  // with the plank fort and two cars in it, the street from the bulb to the mouth of today's box, the north front lawns
  // and their driveways, and on the south side the front lawns, the side yards falling past the walk-outs and the
  // terraces under the decks, to their stone walls. The box's start and anchor names are moved here, as Seth's area
  // did, so a match keeps its kids, guns and roles. Its cover is its own, under its own seed: cars in the driveways and
  // the bulb, bins out, boxes, a plywood stack, AC units in the side yards, grills and firewood on the terraces, the
  // street cover the box had, and trunks, shrubs and a hedge baked into one mesh per material.
  if (_area === 'bulb') {
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    const BAP = {
      cul_de_sac_car1:  { pos: V(-33.8, -6.5) },   // west of the north car in the bulb
      cul_de_sac_car2:  { pos: V(-29.8, 7.2) },    // west of the south car
      cul_de_sac_plank: { pos: V(-32.4, 0) },      // behind the fort
      house1_backyard:  { pos: V(23, 9.5) },       // your side: the south lawn by the street's east end
      house2_backyard:  { pos: V(19.5, -10) },     // your side: the north lawn, by the east house's shrubs
      trey_backyard:    { pos: V(-18, -10.5) },    // the north lawn by the bulb, beside its driveway car
      house7_backyard:  { pos: V(-36.5, 13) },     // the south lawn by the bulb, its west side
      house6_backyard:  { pos: V(-10, 24.5) },     // the side yard between the south houses
      house4_backyard:  { pos: V(-5.8, 18.5) },    // the same side yard, nearer the street
      seth_backyard:    { pos: V(4, 37.2) },       // the terrace behind the middle south house, by its firewood
      brooke_backyard:  { pos: V(-37.8, 26) },     // the bulb house's west side yard
      road_east_north:  { pos: V(28, -3) }, road_east_south: { pos: V(28, 4.5) },
      road_mid_north:   { pos: V(8, -1.5) }, road_mid_south:  { pos: V(8, 6.5) },
      tut_dummy_1: { pos: V(16, -2) }, tut_dummy_2: { pos: V(13, 2) }, tut_dummy_3: { pos: V(10, -1) }, tut_coach: { pos: V(26, -4) },
      treehouse_push_e: { pos: V(-6, 22) }, treehouse_push_w: { pos: V(-10, 30) },
      cluster_road_east: { pos: V(31, 0) },
      cluster_treehouse: { pos: V(-18, 37.2) },   // the bulb house's terrace
      cluster_bulb:      { pos: V(-31, 0) },
      cluster_west:      { pos: V(-36, -8) },
      trey_overwatch:    { pos: V(-22, -12) },
      ffa_1: { pos: V(22, -11) }, ffa_2: { pos: V(-38, -9) }, ffa_3: { pos: V(-26, 37.2) }, ffa_4: { pos: V(14, 37.2) },
    };
    const BAS = {
      road_east:      { pos: V(32, 0), yaw: Math.PI / 2 },          // the box's mouth, facing west down the street
      bulb_center:    { pos: V(-32.5, 0), yaw: -Math.PI / 2 },      // behind the fort, facing east up the street
      seth_yard_west: { pos: V(-2, 37.2), yaw: Math.PI },
      east_fort:      { pos: V(35.5, 0), yaw: Math.PI / 2 },
    };
    const keep = [...Object.entries(BAP).filter(([k]) => !/^ffa_/.test(k)).map(([, p]) => p), ...Object.values(BAS)].map(p => p.pos);
    const clearOf = (x, z, d) => keep.every(p => Math.hypot(p.x - x, p.z - z) >= d);
    withSeededRandom('winnmark-bulb-area', () => {
      const BA = WM_BA.bounds, r = (a, b) => a + (b - a) * gameRandom();
      const cover = (o, name) => { if (!o) return o; coverList.push(o); if (o._stacked) coverList.push(o._stacked); if (name) BAP[name].cover = o; return o; };
      const box = (x, z, w, h, d, color, surface, extra) => {   // a plain prop, built at the ground and sunk onto it
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
        m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
        return sinkObs(Object.assign({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, mesh: m, surface }, extra || {}), x, z);
      };
      const car = (x, z, yaw, c) => sinkObs(addCar(scene, x, z, { orientation: yaw, color: carColors[c], groundNormalFn: groundNormal, detail: true }), x, z);
      const ply = (x, z) => {   // a plywood stack on sleepers with a lawn chair on it (v1.115's)
        const gy = groundY(x, z), st = buildPlyStack(x, gy, z, Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1); scene.add(st);
        return { minX: x - 0.8, maxX: x + 0.8, minZ: z - 0.45, maxZ: z + 0.45, h: 0.55, baseY: gy, mesh: st, surface: 'hard' };
      };
      // the bulb: the plank fort in its middle, its solid back wall to the street, and a car parked at each side
      const fortWalls = buildKidFort(scene, -29, 0, { faceDir: 'E', width: 3.6, depth: 2.2, detail: true });
      seatFortOnSlope(fortWalls, -29, 0);
      for (const w of fortWalls) coverList.push(w);
      BAP.cul_de_sac_plank.cover = fortWalls[0];
      cover(car(-31, -6.5, 0.15, 0), 'cul_de_sac_car1');
      cover(car(-27, 7.2, -0.2, 1), 'cul_de_sac_car2');
      // the driveways' cars, nose to the house
      cover(car(5.7, -9.5, Math.PI / 2, 2));                          // the middle north house
      cover(car(-14.2, -10.5, Math.PI / 2, 4), 'trey_backyard');      // the bulb's north house
      cover(car(1.7, 10.5, -Math.PI / 2, 5));                         // the middle south house
      cover(car(-16.2, 12, -Math.PI / 2, 6));                         // the bulb's south house
      // the bins out at the kerbs, boxes, a plywood stack
      for (const [x, z, v] of [[8.6, -4.3, 'garbage'], [9.9, -4.3, 'recycle'], [-11.4, -3.3, 'garbage'], [4.6, 8, 'recycle'], [-19.5, 7, 'garbage'], [24.4, -2.4, 'recycle'],
        [8.8, -12.4, 'garbage'], [8.8, -11.2, 'recycle'], [-11.3, -12.4, 'garbage'], [-11.3, -11.2, 'recycle'],   // and by the garages
        [-1.2, 12.4, 'garbage'], [-1.2, 11.2, 'recycle'], [-19.1, 15.4, 'garbage'], [-19.1, 14.2, 'recycle']])
        cover(sinkObs(addCurbsideBin(scene, x, z, { variant: v, facing: z < 2 ? Math.PI : 0, detail: true }), x, z));
      cover(sinkObs(addHomeDepotBox(scene, 21.5, 8.2, { w: 1.3, h: 1.1, d: 1.1, facing: 0.1, detail: true }), 21.5, 8.2), 'house1_backyard');
      cover(sinkObs(addHomeDepotBox(scene, -36.5, -7, { w: 1.2, h: 1.0, d: 1.0, facing: 0.3, detail: true }), -36.5, -7));
      cover(sinkObs(addHomeDepotBox(scene, -4, 9.5, { w: 1.3, h: 1.15, d: 1.1, facing: 0, detail: true }), -4, 9.5));
      cover(ply(-24, -11.5), 'trey_overwatch');   // a plywood stack on the bulb's north lawn
      // the side yards' AC units, the terraces' grills and firewood
      cover(box(-11.8, 23.5, 1.0, 0.95, 1.0, 0x9a9a96, 'metal'), 'house6_backyard');
      cover(box(-3.3, 19, 1.0, 0.95, 1.0, 0x9a9a96, 'metal'), 'house4_backyard');
      cover(box(23.3, 20, 1.0, 0.95, 1.0, 0x9a9a96, 'metal'));
      cover(box(-36.2, 25, 1.0, 0.95, 1.0, 0x9a9a96, 'metal'), 'brooke_backyard');
      cover(box(4, 38.4, 2.2, 0.9, 0.8, 0x6a4e3a, 'wood'), 'seth_backyard');
      cover(box(15, 37.5, 0.8, 1.1, 0.6, 0x1e1e20, 'metal'));
      cover(box(-18, 38.4, 2.2, 0.9, 0.8, 0x6a4e3a, 'wood'));
      cover(box(-30, 37.5, 0.8, 1.1, 0.6, 0x1e1e20, 'metal'));
      // the street cover the box had, staggered down the street (the box's own draws were its, these are the area's)
      {
        let acc = 6, side = 1, prev = roadCenterline[0];
        for (let i = 1; i < roadCenterline.length; i++) {
          const p = roadCenterline[i], dx = p.x - prev.x, dz = p.z - prev.z; acc += Math.hypot(dx, dz); prev = p;
          if (acc < 6 || p.x < -18 || p.x > 19) continue;   // not between your start and the tutorial's marker (a box at x 26 stood in its path)
          acc = 0;
          const tl = Math.hypot(dx, dz) || 1, x = p.x - dz / tl * 2.2 * side, z = p.z + dx / tl * 2.2 * side;
          side *= -1;
          const kind = gameRandom(), yaw = r(-Math.PI, Math.PI);
          if (!clearOf(x, z, 2.5)) continue;
          if (kind < 0.3) cover(car(x, z, Math.atan2(dz, dx) + r(-0.3, 0.3), Math.floor(gameRandom() * carColors.length)));
          else if (kind < 0.62) cover(sinkObs(addHomeDepotBox(scene, x, z, { w: r(1.0, 1.4), h: r(0.95, 1.2), d: r(0.95, 1.2), facing: yaw, detail: true }), x, z));
          else if (kind < 0.85) cover(sinkObs(addCurbsideBin(scene, x, z, { variant: gameRandom() < 0.5 ? 'garbage' : 'recycle', facing: yaw, detail: true }), x, z));
          else cover(ply(x, z));
        }
      }
      // trunks on the lawns and in the side yards, shrubs along the house fronts, kept off the anchors
      const wood = new THREE.Group(), straw = [];
      const tree = (x, z, pine, hr) => (pine && straw.push({ x, z, r: 2.4 + 0.6 * hr }), saObs.push(pine
        ? addSuburbanTree(wood, x, z, { shape: 'loblolly', detail: true, trunkR: 0.34 + 0.1 * hr, trunkH: 12 + 3 * hr, leafR: 2.8 + 0.8 * hr, baseY: groundY(x, z), leafColor: hr < 0.5 ? 0x34482a : 0x3c5232 })
        : addSuburbanTree(wood, x, z, { detail: true, trunkR: 0.3 + 0.14 * hr, trunkH: 4.5 + 2.5 * hr, leafR: 2.6 + 1.0 * hr, baseY: groundY(x, z), leafColor: hr < 0.5 ? 0x3a5a2a : 0x4a6a35 })));
      for (const [x, z, pine] of [[-40, -10, 1], [-27, -8.5, 0], [-3, -9, 1], [12, -11.5, 0], [31, -9, 1], [-41, 4, 0], [-40.5, 18, 0],
        [-8, 12, 1], [12, 10.5, 0], [28.5, 12, 1], [-9.5, 31.5, 0], [24.5, 26.5, 0], [-40.5, 34, 1], [-6.5, 36, 0]]) {
        if (!clearOf(x, z, 2.5)) continue;
        tree(x + r(-0.6, 0.6), z + r(-0.6, 0.6), pine, gameRandom());
      }
      addPineStraw(scene, straw, groundY, 0x8a6a4a);   // the pine straw under the pines (v1.313)
      for (const L of WM_BULB_LOTS) {   // the foundation shrubs along each house's front, in the lot's own beds
        if (L.x > 40) continue;
        const f = (L.front || WM_LOT.front) * L.sgn, hw = L.w / 2, gx = L.x + (Math.round(L.x / 32) % 2 ? 1 : -1) * (hw - 3.2);
        for (let x = L.x - hw + 1.2; x < L.x + hw - 1; x += 2.6) {
          if (Math.abs(x - gx) < 3.4 || !clearOf(x, f - L.sgn * 1.2, 2)) continue;
          const z = f - L.sgn * 1.1, w = r(1.1, 1.6);
          saObs.push(addBush(wood, x, z, w, r(0.8, 1.15), w * 0.8, gameRandom() < 0.5 ? 0x3e5a30 : 0x4a6a3a, groundY(x, z), { detail: true }));
        }
      }
      cover(addBush(scene, 18, -11.8, 1.8, 1.1, 1.4, 0x3e5a30, groundY(18, -11.8), { detail: true }), 'house2_backyard');
      // the hedge: across the gaps between the north houses at the area's north edge, and down its west edge past the bulb
      const hedge = (ax, az, bx, bz) => {
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.5));
        for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; saObs.push(addBush(wood, x, z, 1.6, 1.25, 1.2, 0x2e4a26, groundY(x, z), { detail: true })); }
      };
      hedge(-44.6, -14.7, -33.6, -14.7); hedge(-10.6, -14.7, 2, -14.7); hedge(26, -14.7, 35.6, -14.7);
      hedge(-44.6, -13.2, -44.6, BA.maxZ);
      scene.add(bakeByMaterial(wood, 'bulbAreaWood'));
      // the street's lamps, lit at night
      for (const [x, s] of [[-14, -1], [3, 1], [20, -1], [-40, 1]]) {
        const z = x < -25 ? 9.5 : roadZAt(x) + s * 5.05;
        const lamp = addStreetlamp(scene, x, z, groundY, _night); if (lamp.userData.obstacles) saObs.push(...lamp.userData.obstacles);
      }
    });
    Object.assign(placements, BAP);
    Object.assign(playerSpawns, BAS);
  }

  // === Map bounds (legacy return shape) ===
  let enemies = [];
  let spawn = playerSpawns.road_east.pos.clone();
  let spawnYaw = playerSpawns.road_east.yaw;
  let name = 'Winnmark Court', scenarioName = '', desc = '';

  if (variant === 'seth_house') {
    // Player spawns at the eastern end of the road (just inside the entry),
    // looking west — Seth's backyard is to the northwest behind house index 0.
    spawn = playerSpawns.road_east.pos.clone();   // v1.341: Seth's area's east end
    spawnYaw = Math.PI / 2; // facing west
    name = "Seth's House";
    scenarioName = 'Just You and Seth';
    desc = "Seth's hiding somewhere in his backyard. The trees behind the house go on for a while — be careful, he could circle around.";

    // Pick the cover pieces in Seth's backyard (house index 0)
    const sethCover = coverByHouse[0];
    enemies.push(makeEnemyFromCharacter('seth', {
      pos: new THREE.Vector3(houseCenters[0].x - 2, 0, houseCenters[0].z - 12),
      homeCover: sethCover[Math.floor(gameRandom() * sethCover.length)],
      scene,
    }));
  } else if (variant === 'cul_de_sac' || variant === 'treehouse') {
    // Player spawns at the eastern entry looking west — has to push through
    // the whole street with 3 hostiles waiting.
    spawn = playerSpawns.road_east.pos.clone();   // v1.341: Seth's area's east end
    spawnYaw = Math.PI / 2;
    name = 'Winnmark Court';
    scenarioName = '3-on-1 at the Cul-de-Sac';
    desc = "Seth, Trey, and Brooke are spread out along the street. You're outnumbered. Move smart — use the yards, don't get caught in the road.";

    // Place each kid in a different backyard.
    // Seth in his own backyard (house 0, east-north).
    enemies.push(makeEnemyFromCharacter('seth', {
      pos: new THREE.Vector3(houseCenters[0].x - 2, 0, houseCenters[0].z - 11),
      homeCover: coverByHouse[0][0],
      scene,
    }));
    // Trey near the cul-de-sac bulb (house 3, north-west)
    enemies.push(makeEnemyFromCharacter('trey', {
      pos: new THREE.Vector3(houseCenters[3].x + 1, 0, houseCenters[3].z - 10),
      homeCover: coverByHouse[3][0],
      scene,
    }));
    // Brooke south side around the middle (house 5)
    enemies.push(makeEnemyFromCharacter('brooke', {
      pos: new THREE.Vector3(houseCenters[5].x, 0, houseCenters[5].z + 11),
      homeCover: coverByHouse[5][0],
      scene,
    }));
  }

  // === v1.35: Streetlamps — 4 tall black lamps between the houses, overhanging
  // the road. Lit at night, dark props by day. v1.76: the pole is placed relative
  // to the ACTUAL curved road edge (sampled from the centerline) so it sits on the
  // GRASS shoulder, never on the asphalt or on a driveway. The X positions sit in
  // the gaps BETWEEN house pairs, which keeps them clear of the driveway pads (at
  // the house X's). `side` says which shoulder; the arm overhangs toward the road.
  // v1.51: poles are now collision obstacles (collected into lampObs below).
  const lampObs = [];
  if (!_realBulb) {   // v1.342: the box's lamps; the real bulb's end has none yet
    const ROAD_HALF_LAMP = 3.5;
    const LAMP_GRASS = 1.6;   // pole sits this far onto the grass beyond the pavement
    const lampSpotsXSide = [
      { x: 16, side: 'north' },  // between Seth(24) & house1(8)
      { x:  0, side: 'south' },  // between house1(8) & house2(-8)
      { x: -13, side: 'north' }, // between house2(-8) & house3(-18)
      { x: 30, side: 'south' },  // near the east entry
    ];
    for (const s of lampSpotsXSide) {
      // Road centerline Z nearest this lamp's X (road bulges south, so this varies).
      let roadCZ = 0, bestDX = Infinity;
      for (const p of roadCenterline) {
        const dxp = Math.abs(p.x - s.x);
        if (dxp < bestDX) { bestDX = dxp; roadCZ = p.z; }
      }
      // North shoulder is at smaller Z (road edge − half − grass); south is larger.
      const lampZ = (s.side === 'north')
        ? roadCZ - ROAD_HALF_LAMP - LAMP_GRASS
        : roadCZ + ROAD_HALF_LAMP + LAMP_GRASS;
      const lamp = addStreetlamp(scene, s.x, lampZ, groundY, _night);
      if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
    }
  }

  // === v1.338 (D.51 step 1): past the tree walls, at real scale ===
  // The near-closed canopy of the real place (docs/refs/winnmark.md, "Trees and planting": loblolly pines bare to
  // 12-15 m and hardwoods, 20-25 m tall) over the street's lots to Winnmark Dr, thick in the shared wood behind the
  // south lots, thinned to trunks along the north lots' backs where the course shows through, in clumps on the course;
  // Winnmark Dr round the wood with its houses, and the houses across the course and past the Dr; the creeks' water.
  // The house sites of step 2 are kept clear. Its own seeded numbers, so no match's cover moves; one mesh by day, two
  // at night (lit windows); nothing solid, nothing within 6 m of the bounds.
  {
    const rs = _mulberry32(_hashStringToSeed('winnmark-real|' + (_night ? 'n' : 'd'))), rr = (a, b) => a + (b - a) * rs();
    const B0 = boxBounds, R = WM_REAL, items = [], houses = [];   // v1.341: the box's, in either area
    const LEAF = [0x3e6a2e, 0x4a7834, 0x365e2a, 0x567c38, 0x2e5226, 0x46703a], PINE = [0x2a4a2a, 0x2e5030, 0x264426];
    const WALL = [0xa88e80, 0x8a4a40, 0xb8a888, 0x9a7a68, 0xc8b89a], ROOF = [0x6e6a62, 0x625e58, 0x5a5650, 0x726c62];
    const outB = (x, z) => Math.max(B0.minX - x, x - B0.maxX, B0.minZ - z, z - B0.maxZ);
    const house = (x, z, yaw) => houses.push({ k: 'house', x, z, yaw, w: rr(18, 24), d: rr(13, 16), h: 6.4,
      wall: WALL[Math.floor(rs() * WALL.length)], roof: ROOF[Math.floor(rs() * ROOF.length)] });
    // Winnmark Dr's houses: along its inner side (their backs to the shared wood) and its outer side, 24 m off its middle
    const drPts = R.dr;
    for (let i = 1; i + 1 < drPts.length; i++) {
      const a = drPts[i], b = drPts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s = 20; s < L - 10; s += 42) {
        const px = a[0] + ux * s, pz = a[1] + uz * s;
        for (const side of [1, -1]) {   // side 1: to the right going along it (west, then into the wood); -1: the other side
          const nx = -uz * side, nz = ux * side, hx = px + nx * 24, hz = pz + nz * 24;
          if ((hz < 14 && hx < R.drX) || R.sites.some(([sx, sz]) => Math.hypot(hx - sx, hz - sz) < 34)) continue;   // the court's own lots are step 2's
          house(hx, hz, Math.atan2(-nx, -nz));
        }
      }
    }
    // north along the Dr past the court's mouth, its east side; and across the course, facing it
    for (let z = -170; z < -20; z += 40) house(R.drX + 24, z + rr(-4, 4), -Math.PI / 2);
    for (let x = -150; x < 220; x += 44) house(x + rr(-6, 6), -158 + rr(-3, 3), 0);
    // v1.344 (D.51 step 5; docs/refs/winnmark.md "Past the edge", W: the course, trees, houses, trees): past the
    // course's west edge a row of houses faces it across its tree line, the woods behind them. Their own seeded numbers,
    // so nothing drawn before or after them moves
    {
      const rw = _mulberry32(_hashStringToSeed('winnmark-west|' + (_night ? 'n' : 'd'))), wr = (a, b) => a + (b - a) * rw();
      for (let z = -170; z < 156; z += 44) houses.push({ k: 'house', x: R.westX - 22 + wr(-2, 2), z: z + wr(-5, 5), yaw: Math.PI / 2,
        w: wr(18, 24), d: wr(13, 16), h: 6.4, wall: WALL[Math.floor(rw() * WALL.length)], roof: ROOF[Math.floor(rw() * ROOF.length)] });
    }
    for (const hs of houses) hs.y = groundY(hs.x, hs.z);
    const onHouse = (x, z) => houses.some(hs => Math.abs(x - hs.x) < 15 && Math.abs(z - hs.z) < 13) ||
      R.sites.some(([sx, sz, hw, hd]) => Math.abs(x - sx) < hw && Math.abs(z - sz) < hd) ||
      WM_LOTS.some(L => Math.abs(x - L.x) < 18 && z * L.sgn > 6 && z * L.sgn < 44) ||   // v1.339: the houses, decks and terraces
      (_realBulb && WM_BULB_LOTS.some(L => Math.abs(x - L.x) < 18 && z * L.sgn > 6 && z * L.sgn < 44)) ||   // v1.342: the bulb's
      (Math.abs(x - WM_SETH.x) < WM_SETH.half + 2 && z > 3 && z < WM_SETH.patio + 1.5);       // v1.340: Seth's lot to the patio's edge
    // trees on a jittered 7 m grid, by what lies there
    const P = R.pond;
    // v1.344: what each draw plants, a function so the west strip past the old ground's edge plants by the same rules
    const plant = (x, z, pick, pine, hr, cr) => {
      if (!_realBulb && outB(x, z) < (pine ? 3 + cr : 4.5 + 1.8 * cr) + 6.5) return;   // the box's own trees, and 6 m clear of it
      const dr = _wmPolyNear(R.dr, x, z).d;
      if (dr < 11 || (Math.abs(z) < 12 && x > 38 && x < R.drX)) return;             // the roads and their verges
      // v1.342: the real bulb's end: the street through the box and the bulb's verges (the draws above are made either way)
      if (_realBulb && ((x > WM_BULB.x && x <= 38 && Math.abs(z - roadZAt(x)) < 12) || Math.hypot(x - WM_BULB.x, z - WM_BULB.z) < WM_BULB.r + 7)) return;
      if (Math.hypot((x - P.x) / P.rx, (z - P.z) / P.rz) < 1.18) return;            // the pond and its edge
      if (Math.min(_wmPolyNear(R.creek, x, z).d, _wmPolyNear(R.course, x, z).d) < 2.5) return;
      if (onHouse(x, z)) return;
      {   // v1.341: Seth's area has its own solid wood; these crowns keep 3 m clear of it (v1.343: and of the bulb's)
        const SB = _area === 'seth' ? WM_SA.bounds : WM_BA.bounds, m = (pine ? 3 + cr : 4.5 + 1.8 * cr) + (_area === 'seth' ? 3 : 6);   // v1.343: 6 m off the bulb's (the box's rule)
        if (x > SB.minX - m && x < SB.maxX + m && z > SB.minZ - m && z < SB.maxZ + m) return;
      }
      const dC = 42 + 13 * _wmSS((x - 50) / 20);
      let p;
      if (x < R.westX) p = x > R.westX - 12 ? 0.7 : x > R.westX - 36 ? 0.3 : 0.85;    // v1.344: past the course, west
      else if (x < -48 && z < 150) p = 0.05;                                          // the course west of the bulb
      else if (z < -dC - 6 && z > -128) p = 0.03;                                     // the fairway north of the lots
      else if (z <= -dC - 1 && z >= -dC - 6) p = 0.75;                                // the lots' back line, trunks over the course
      else if (z < 0 && x < R.drX) p = 0.22;                                          // the north lots
      else if (z > 0 && z < 34 && x < R.drX) p = 0.25;                                // the south lots' front and walk-out
      else if (dr < 36) p = 0.3;                                                      // Winnmark Dr's lots
      else p = 0.85;                                                                  // the woods
      if (pick >= p) return;
      const y = groundY(x, z);
      if (pine) items.push({ k: 'pine', x, z, y, h: 18 + 6 * hr, r: 3 + cr, col: PINE[Math.floor(cr * PINE.length) % PINE.length] });
      else items.push({ k: 'tree', x, z, y, h: 16 + 7 * hr, r: 4.5 + 1.8 * cr, col: LEAF[Math.floor(cr * LEAF.length) % LEAF.length] });
    };
    for (let gx = -206; gx <= 306; gx += 7) for (let gz = -196; gz <= 226; gz += 7) {
      const x = gx + rr(-2.6, 2.6), z = gz + rr(-2.6, 2.6), pick = rs(), pine = rs() < 0.42, hr = rs(), cr = rs();
      plant(x, z, pick, pine, hr, cr);
    }
    {   // v1.344: the woods behind the west houses, on the ground's new 48 m, under their own numbers
      const rw = _mulberry32(_hashStringToSeed('winnmark-west-trees|' + (_night ? 'n' : 'd'))), wr = (a, b) => a + (b - a) * rw();
      for (let gx = -255; gx < -206; gx += 7) for (let gz = -196; gz <= 226; gz += 7) {
        const x = gx + wr(-2.6, 2.6), z = gz + wr(-2.6, 2.6), pick = rw(), pine = rw() < 0.42, hr = rw(), cr = rw();
        plant(x, z, pick, pine, hr, cr);
      }
    }
    // Winnmark Dr itself, and the creeks' water, laid on the ground point by point
    const strip = (pts, w, col, lift, yOf) => {
      const out = [];
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
        for (let k = (i ? 1 : 0); k <= n; k++) {
          const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
          out.push([x, (yOf ? yOf(a, b, t) : groundY(x, z)) + lift, z]);
        }
      }
      items.push({ k: 'strip', pts: out, w, col });
    };
    strip(R.dr, 7.2, 0x4a4a48, 0.05);
    const water = (a, b, t) => (a[2] + (b[2] - a[2]) * t) + 0.25;
    strip(R.creek, 1.4, 0x4a5a48, 0, water);
    strip(R.course, 1.8, 0x4a5a48, 0, water);
    const real = buildMergedScenery([...items, ...houses], _night, 'winnmark-real');
    scene.add(real);
  }

  // === Collect obstacles ===
  // Player collision: houses, fences, tree trunks, bushes, cover items. The
  // lake is *not* an obstacle visually but we want to prevent walking onto it.
  const lakeBlocker = { minX: -52, maxX: -37, minZ: -40, maxZ: 40, h: 0.5, surface: 'hard' };
  // v1.342: with the bulb at real size the box is gone: its scene objects west of Seth's area (x < 60) are taken out, and
  // none of its obstacles or cover is kept (Defend the Treehouse's fort, built among them, stands at x 126 and stays)
  if (_realBulb) {
    scene.updateMatrixWorld(true);
    const bb = new THREE.Box3(), c = new THREE.Vector3();
    for (const o of scene.children.slice(_boxFrom, _boxTo)) {
      if (o.userData.wmRoad || o.userData.wmLot || o.name === 'winnmarkLots') continue;
      bb.setFromObject(o); if (bb.isEmpty()) continue;
      if (bb.getCenter(c).x < 60) scene.remove(o);
    }
    const cx = o => o.minX != null ? (o.minX + o.maxX) / 2 : o.cx != null ? o.cx : o.center ? o.center.x : 0;
    for (let i = _coverFrom - 1; i >= 0; i--) if (cx(coverList[i]) < 60) coverList.splice(i, 1);
  }
  const obstacles = _realBulb ? [...coverList, ...wmLots.obstacles, ...saObs] : [
    ...houseObs, ...fences, ...treeObs, ...bushObs, ...coverList,
    ...curbsideBins, ...driveCars, lakeBlocker, ...lampObs,
    ...wmLots.obstacles,   // v1.339: last, so every other obstacle keeps its place in the list
    ...saObs,              // v1.341: Seth's area's trunks, shrubs, hedge and lamps (none in the box's matches)
  ];

  return {
    scene,
    spawn, spawnYaw, bounds,
    cover: coverList,
    obstacles,
    enemies,
    name, scenarioName, desc,
    // v1.9: expose placements + playerSpawns so generic enterScenario can
    // spawn enemies per the scenario's enemySetup table.
    placements,
    playerSpawns,
    groundY,   // v1.28l: terrain height fn for the generic physics/spawn systems
    viewFar: 380,   // v1.338 (D.51 step 1): the camera sees down the street to Winnmark Dr (the other maps keep 200)
    wmSeth: wmLots.seth,   // v1.340 (D.51 step 3): Seth's house, hot tub and pool (WM_SETH has the levels)
  };
}

// v1.341 (D.51 step 4): in a match in Seth's area the box down the street (its eight houses, cover, cars, trees and fort,
// ~2,000 meshes) is only a view, 25-170 m off: every mesh of it baked into one mesh per look (colour, finish, sides,
// texture), as bakeByMaterial does for one material. The obstacles keep their numbers, and nothing in the box is in reach.
function bakeMeshesByLook(meshes, name) {
  const key = m => { const M = m.material; return [M.type, M.color && M.color.getHex(), M.emissive && M.emissive.getHex(), M.emissiveIntensity,
    M.roughness, M.metalness, M.side, M.transparent, M.opacity, M.polygonOffset && M.polygonOffsetFactor, M.flatShading, M.map && M.map.uuid,
    M.vertexColors, M.alphaTest, M.depthWrite].join('|'); };
  const buckets = new Map(), v = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const m of meshes) {
    const k = key(m); let b = buckets.get(k);
    if (!b) buckets.set(k, b = { mat: m.material, p: [], n: [], uv: m.material.map ? [] : null, c: m.material.vertexColors ? [] : null, cast: false, recv: false });
    b.cast = b.cast || m.castShadow; b.recv = b.recv || m.receiveShadow;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
    nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); b.p.push(v.x, v.y, v.z);
      nv.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); b.n.push(nv.x, nv.y, nv.z);
      if (b.uv) b.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
      if (b.c) b.c.push(ca ? ca.getX(i) : 1, ca ? ca.getY(i) : 1, ca ? ca.getZ(i) : 1);
    }
    g.dispose();
    if (m.parent) m.parent.remove(m);
  }
  const out = new THREE.Group(); out.name = name;
  for (const b of buckets.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    if (b.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    if (b.c) geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
    out.add(mesh);
  }
  return out;
}

// Thin wrappers so the SCENARIOS table can name a builder per-variant.
function buildWinnmarkSethHouseScene(_v, tod) { return buildWinnmarkCourtScene('seth_house', tod); }
function buildWinnmarkCulDeSacScene(_v, tod)  { return buildWinnmarkCourtScene('cul_de_sac', tod); }
