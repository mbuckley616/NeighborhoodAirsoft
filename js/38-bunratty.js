

// ---------------------------------------------------------------------
// BUNRATTY COURT — Sentinel on the River (Mike's home neighborhood)
// ---------------------------------------------------------------------
// Modeled on buildWinnmarkCourtScene, but with its own identity:
//   - WEST entry, bulb on the EAST (reverse of Winnmark)
//   - A long, wiggling wooded LANE through dense forest (not a tidy 4+4
//     grid) terminating in a cul-de-sac bulb — matches the satellite of
//     the real Bunratty Ct off Sentinae Chase Dr.
//   - French-eclectic STUCCO + STONE house palette (cream/tan walls, warm
//     brown hip roofs) — the reference property, Michael's old house.
//   - The CHATTAHOOCHEE RIVER as the signature backdrop on the SOUTH side,
//     downhill past a stacked-stone retaining wall + forest. (Winnmark used
//     a golf course + lake; Bunratty uses river + woods.)
//   - The "aggressive uphill to the bulb" character is sold VISUALLY ONLY
//     (option A): play stays FLAT so all AI/physics/cover code is unchanged,
//     but the south river side reads as a drop (retaining wall, walk-out
//     lower levels on the downhill houses, river below the wall) and the
//     bulb reads as nestled low. A real z-varying terrain slope remains the
//     deferred v1.7 feature — NOT attempted here.
//
// Returns the same shape as buildWinnmarkCourtScene so the generic
// enterScenario placement system works without changes. Placements +
// playerSpawns tables are populated and ready for scenarios next session.
// v1.303 (D.51 step 1): the real place round Bunratty's bulb, in the map's own frame. n points from the bulb toward the
// river (the real SSE), the river's line runs along (nz, -nx); its middle is s = 190 m out, 64 m wide, the water at -26 m.
const BR_REAL = { bx: 34, bz: 2, nx: 0.3816, nz: 0.9243, s: 190, half: 32, waterY: -26, bedY: -28 };

// v1.305 (D.51 step 2, docs/refs/bunratty.md gap 5d): on the uphill (north) side the lawns bank up over the kerb, 1.4 m
// over 5.5 m from a metre past the asphalt's edge (21° at the steepest, under the 25° the kids walk), level from there to
// the houses and the woods behind; it fades out past the west entry and before the bulb. The lane's middle is the map's
// S-curve (RA, RC1, RC2, RB in buildBunrattyCourtScene), tabled by x.
const BR_LANE_Z = (() => {
  const t = [];
  for (let i = 0; i <= 400; i++) { const s = i / 400, m = 1 - s; t.push([-38 * m * m * m - 42 * m * m * s + 42 * m * s * s + 34 * s * s * s, -30 * m * m * s + 36 * m * s * s + 2 * s * s * s]); }
  return t;
})();
function bunrattyNorthBank(x, z) {
  if (x <= -46 || x >= 32) return 0;
  const xc = Math.max(-38, Math.min(34, x));
  let lo = 0, hi = BR_LANE_Z.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (BR_LANE_Z[m][0] < xc) lo = m; else hi = m; }
  const a = BR_LANE_Z[lo], b = BR_LANE_Z[hi], zc = a[1] + (b[1] - a[1]) * (xc - a[0]) / ((b[0] - a[0]) || 1);
  const d = zc - z - 4.45; if (d <= 0) return 0;
  const ss = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  return 1.4 * ss(d / 5.5) * ss((x + 46) / 8) * ss((32 - x) / 8);
}

// v1.304 (D.51 step 2, docs/refs/bunratty.md gaps 1-3, "Michael's house, front" and the D.40 section): Michael's house
// at about its real size, where the small colonial stood. Cream stucco, a hipped dark-brown roof, a front cross gable
// over a bay window, a two-storey stacked-stone entry tower with an arched window over double wood doors up six steps,
// and the garage wing on the east end with three stained-wood doors onto a concrete motor court off the bulb. The back
// is a walk-out: the main-floor deck over a terrace 3.2 m lower, the pool in its black fence on the terrace, a stacked-
// stone wall with stone steps down to the lawn (the trampoline's), a fire pit, and stone walls along the lot lines where
// the neighbour's yard stands higher. Everything here is baked into one mesh per material (BR_HERO has the plan).
const BR_HERO = { x0: 20.3125, x1: 36, z0: 14.5, z1: 26.5625, gz0: 16.4, gx1: 44, deckX0: 24.5, deckX1: 35.8, deckZ1: 30,
  poolX0: 25, poolX1: 39.2, poolZ0: 30.2, poolZ1: 35.9, wallZ0: 35.9375, wallZ1: 37.5, stepX0: 39.6, stepX1: 41.4,
  bankX1: 19.2, sideX0: 15.625, sideX1: 17.1875, cutX: 16.4, lawnZ1: 47 };

// v1.304: every mesh under root baked into one mesh per material, in world space (root has no parent). Shadow casting
// carries over per material.
function bakeByMaterial(root, name) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), v = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse(m => {
    if (!m.isMesh) return;
    let b = buckets.get(m.material); if (!b) buckets.set(m.material, b = { p: [], n: [], cast: false });
    b.cast = b.cast || m.castShadow;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal;
    nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); b.p.push(v.x, v.y, v.z);
      nv.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); b.n.push(nv.x, nv.y, nv.z);
    }
    if (g !== m.geometry) g.dispose();
    m.geometry.dispose();
  });
  const out = new THREE.Group(); out.name = name;
  for (const [mat, b] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    out.add(mesh);
  }
  return out;
}

// v1.304: the house and its lot. o: { groundY, F (main floor), T (terrace), G (garage floor), night }. Returns the baked
// group and the obstacles: one box per block (main, tower, front wing, bay, garage), the front steps, the deck and its
// posts, the deck stair, the pool fence (BBs pass), the terrace wall, the lot-line walls and the fire pit.
function buildBunrattyHeroHouse(scene, o) {
  const H = BR_HERO, gY = o.groundY, F = o.F, T = o.T, G = o.G, night = !!o.night;
  const root = new THREE.Group();
  const M = (c, x = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, x));
  const stucco = M(0xd6c9ae, { roughness: 0.95 }), stuccoDS = M(0xd6c9ae, { roughness: 0.95, side: THREE.DoubleSide });
  const trim = M(0xc7b9a0, { roughness: 0.7 }), roof = M(0x5e4a40, { roughness: 0.85, side: THREE.DoubleSide });
  const stone = M(0xa8865e, { roughness: 0.97 }), wallStone = M(0x5c4b37, { roughness: 0.97 }), capStone = M(0xcac0b0, { roughness: 0.9 });
  const door = M(0x5a3220, { roughness: 0.7 }), garageDoor = M(0x704723, { roughness: 0.75 }), groove = M(0x4a2e16, { roughness: 0.8 });
  const glass = M(0x2e3a44, { roughness: 0.25, metalness: 0.2, emissive: 0x101820, emissiveIntensity: 0.4 });
  const lit = night ? M(0xffe0a0, { roughness: 0.4, emissive: 0xffc070, emissiveIntensity: 0.85 }) : glass;
  const white = M(0xeeeae2, { roughness: 0.7 }), rail = M(0xd7d6d4, { roughness: 0.6 }), iron = M(0x18181a, { roughness: 0.5, metalness: 0.55 });
  const conc = M(0xd8d2c8, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const deckConc = M(0xded6cf, { roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const water = M(0x7ed1c7, { roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }), poolWall = M(0x6aa7b4, { roughness: 0.6, side: THREE.DoubleSide });
  const coping = M(0xb8a07a, { roughness: 0.9 }), lantern = M(0x1a1a1a, { roughness: 0.5, metalness: 0.4 });
  const obstacles = [];
  const ob = (x0, x1, z0, z1, baseY, top, extra = {}) => { const b = Object.assign({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, baseY, h: top - baseY, surface: 'hard' }, extra); obstacles.push(b); return b; };
  const box = (mat, x0, x1, y0, y1, z0, z1, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = cast; root.add(m); return m;
  };
  const tris = (mat, pts) => {   // a flat list of [x, y, z] triangles
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; root.add(m); return m;
  };
  // a hip roof over x0..x1, z0..z1 with its eaves at y, the ridge along the longer side
  const hip = (x0, x1, z0, z1, y, rise, ov = 0.5) => {
    x0 -= ov; x1 += ov; z0 -= ov; z1 += ov;
    const w = x1 - x0, d = z1 - z0, inset = Math.min(w, d) / 2, A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1];
    if (w >= d) { const R1 = [x0 + inset, y + rise, (z0 + z1) / 2], R2 = [x1 - inset, y + rise, (z0 + z1) / 2]; tris(roof, [A, R1, R2, A, R2, B, D, C, R2, D, R2, R1, A, D, R1, B, R2, C]); }
    else { const R1 = [(x0 + x1) / 2, y + rise, z0 + inset], R2 = [(x0 + x1) / 2, y + rise, z1 - inset]; tris(roof, [A, R1, B, B, R1, R2, B, R2, C, D, C, R2, D, R2, R1, A, D, R1]); }
  };
  // a window on a face: f 'n' | 's' | 'e' | 'w', centred at (x, z) on the wall, sill at y; arch: a half-round head
  const win = (f, x, z, y, w, h, opt = {}) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[f];
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    const gm = opt.lit ? lit : glass;
    add(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.06), trim, 0, h / 2, 0.03);
    add(new THREE.BoxGeometry(w, h, 0.08), gm, 0, h / 2, 0.06);
    add(new THREE.BoxGeometry(w + 0.36, 0.1, 0.16), trim, 0, -0.08, 0.08);
    add(new THREE.BoxGeometry(0.06, h, 0.1), trim, 0, h / 2, 0.08);
    if (h > 1.3) add(new THREE.BoxGeometry(w, 0.06, 0.1), trim, 0, h * 0.62, 0.08);
    if (opt.arch) {
      add(new THREE.CircleGeometry(w / 2 + 0.12, 14, 0, Math.PI), trim, 0, h, 0.035);
      add(new THREE.CircleGeometry(w / 2, 14, 0, Math.PI), gm, 0, h, 0.075);
    }
    root.add(g);
  };
  // a ground patch laid on the terrain (a grid at the ground's height + lift), cells whose middle skip() refuses left out
  const patch = (mat, x0, x1, z0, z1, lift, skip) => {
    const st = 0.78, nx = Math.max(1, Math.ceil((x1 - x0) / st)), nz = Math.max(1, Math.ceil((z1 - z0) / st)), p = [];
    const at = (i, k) => { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * k / nz; return [x, gY(x, z) + lift, z]; };
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const cx = x0 + (x1 - x0) * (i + 0.5) / nx, cz = z0 + (z1 - z0) * (k + 0.5) / nz;
      if (skip && skip(cx, cz)) continue;
      const a = at(i, k), b = at(i + 1, k), c = at(i, k + 1), d = at(i + 1, k + 1);
      p.push(a, c, b, b, c, d);
    }
    if (!p.length) return;
    const m = tris(mat, p); m.castShadow = false; m.receiveShadow = true;
  };

  // --- the main block: two storeys at the front, three at the back (the walk-out), x0..x1 by z0..z1
  const top = F + 6.2;
  box(stucco, H.x0, H.x1, T - 0.3, top, H.z0, H.z1);
  box(trim, H.x0 - 0.12, H.x1 + 0.12, top - 0.28, top, H.z0 - 0.12, H.z1 + 0.12);          // the frieze under the eaves
  box(trim, H.x0 - 0.05, H.x1 + 0.05, F + 3.0, F + 3.18, H.z0 - 0.05, H.z1 + 0.05);       // a belt course between the floors
  hip(H.x0, H.x1, H.z0, H.z1, top, 3.8, 0.55);
  ob(H.x0, H.x1, H.z0, H.z1, T - 0.3, top + 3.8);
  // the front cross gable at the west end, over the bay window
  const wx0 = H.x0, wx1 = 26, wz0 = 13.7, wm = (wx0 + wx1) / 2, gr = 1.8, wzb = H.z0 + 3.1;   // its ridge runs back into the hip
  box(stucco, wx0, wx1, T - 0.3, top, wz0, H.z0 + 0.2);
  box(trim, wx0 - 0.12, wx1 + 0.12, top - 0.28, top, wz0 - 0.12, H.z0);
  tris(stuccoDS, [[wx0, top, wz0], [wx1, top, wz0], [wm, top + gr, wz0]]);
  tris(roof, [[wx0 - 0.4, top - 0.25, wz0 - 0.45], [wm, top + gr + 0.05, wz0 - 0.45], [wm, top + gr + 0.05, wzb], [wx0 - 0.4, top - 0.25, wz0 - 0.45], [wm, top + gr + 0.05, wzb], [wx0 - 0.4, top - 0.25, wzb],
    [wx1 + 0.4, top - 0.25, wz0 - 0.45], [wm, top + gr + 0.05, wz0 - 0.45], [wm, top + gr + 0.05, wzb], [wx1 + 0.4, top - 0.25, wz0 - 0.45], [wm, top + gr + 0.05, wzb], [wx1 + 0.4, top - 0.25, wzb]]);
  win('n', wm, wz0 - 0.01, F + 3.6, 1.3, 1.7, { arch: true, lit: true });
  win('n', wm, wz0 - 0.01, top + 0.35, 0.6, 0.35, { arch: true });                     // the attic vent in the gable
  ob(wx0, wx1, wz0, H.z0, T - 0.3, top + gr);
  // the bay window, with its own little hip roof
  const bx0 = 21.9, bx1 = 24.4, bz0 = 13.1;
  box(stucco, bx0, bx1, F - 0.7, F + 2.4, bz0, wz0 + 0.1);
  for (const [bx, w] of [[bx0 + 0.45, 0.6], [(bx0 + bx1) / 2, 0.9], [bx1 - 0.45, 0.6]]) win('n', bx, bz0 - 0.01, F + 0.55, w, 1.5);
  hip(bx0, bx1, bz0, wz0, F + 2.4, 0.7, 0.2);
  ob(bx0, bx1, bz0, wz0, gY((bx0 + bx1) / 2, bz0) - 0.2, F + 3.1);
  // the stacked-stone entry tower: an arched window over double wood doors, up six steps
  const tx0 = 26.6, tx1 = 30.4, tz0 = 13.3, tm = (tx0 + tx1) / 2, ttop = F + 7.4;
  box(stone, tx0, tx1, T - 0.3, ttop, tz0, tz0 + 3.8);   // square above the eaves; below them it runs into the house
  for (let i = 0; i < 9; i++) box(i % 2 ? stone : M(0x9a7a56, { roughness: 0.97 }), tx0 - 0.03, tx1 + 0.03, F - 0.4 + i * 0.85, F - 0.3 + i * 0.85, tz0 - 0.03, tz0 + 0.2, false);
  hip(tx0, tx1, tz0, tz0 + 3.8, ttop, 2.4, 0.35);
  box(trim, tm - 1.0, tm + 1.0, F, F + 2.75, tz0 - 0.06, tz0);                              // the door surround
  box(door, tm - 0.78, tm - 0.02, F, F + 2.6, tz0 - 0.1, tz0 - 0.04);
  box(door, tm + 0.02, tm + 0.78, F, F + 2.6, tz0 - 0.1, tz0 - 0.04);
  { const fl = new THREE.Mesh(new THREE.CircleGeometry(0.72, 14, 0, Math.PI), lit); fl.position.set(tm, F + 2.62, tz0 - 0.08); fl.rotation.y = Math.PI; root.add(fl); }   // the fanlight
  win('n', tm, tz0 - 0.01, F + 3.7, 1.2, 2.0, { arch: true, lit: true });
  const lampY = F + 1.9; for (const lx of [tm - 1.25, tm + 1.25]) { box(lantern, lx - 0.12, lx + 0.12, lampY, lampY + 0.45, tz0 - 0.3, tz0 - 0.06); box(lit, lx - 0.08, lx + 0.08, lampY + 0.05, lampY + 0.38, tz0 - 0.32, tz0 - 0.29, false); }
  ob(tx0, tx1, tz0, H.z0, T - 0.3, ttop + 2.4);
  const sz0 = 11.9, gS = gY(tm, sz0);
  for (let i = 0; i < 6; i++) { const y = gS + (F - gS) * (i + 1) / 6, z = sz0 + (tz0 - sz0) * i / 6; box(capStone, tm - 1.1, tm + 1.1, gS - 0.3, y, z, tz0, false); }
  ob(tm - 1.1, tm + 1.1, sz0, tz0, gS - 0.3, F);
  patch(conc, tm - 0.8, tm + 0.8, 6.6, sz0, 0.035, (x, z) => Math.hypot(x - 34, z - 2) < 6.4);   // the front walk down to the bulb
  // the front's other windows: the ground floor east of the tower, and the upper floor across
  for (const x of [32.0, 34.4]) win('n', x, H.z0 - 0.01, F + 0.7, 1.2, 1.8, { lit: x < 33 });
  for (const x of [31.4, 34.4]) win('n', x, H.z0 - 0.01, F + 3.6, 1.1, 1.6);
  for (const z of [17, 21.5]) { win('w', H.x0 - 0.01, z, F + 0.7, 1.2, 1.8); win('w', H.x0 - 0.01, z, F + 3.6, 1.1, 1.6, { lit: z > 20 }); }
  // the back (the river side): French doors on the walk-out level, the main floor's windows, the curved bay upstairs
  for (const x of [23.2, 26.8, 30.4, 33.9]) { win('s', x, H.z1 + 0.01, T, 1.6, 2.3, { lit: x > 30 }); }
  for (const x of [22.6, 25.6, 34.0]) win('s', x, H.z1 + 0.01, F + 0.4, 1.3, 2.1);
  for (const x of [22.6, 34.0]) win('s', x, H.z1 + 0.01, F + 3.6, 1.1, 1.6, { lit: x > 30 });
  {
    const bayR = 2.0, cxB = 29.6, yb = F + 3.3, hb = top - 0.3 - yb;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(bayR, bayR, hb, 18, 1, false, -Math.PI / 2, Math.PI), stucco);
    cyl.position.set(cxB, yb + hb / 2, H.z1); cyl.castShadow = true; root.add(cyl);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(bayR + 0.03, bayR + 0.03, 1.5, 18, 1, true, -Math.PI / 2 + 0.15, Math.PI - 0.3), lit);
    band.position.set(cxB, yb + 0.5 + 0.75, H.z1); root.add(band);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(bayR + 0.15, bayR + 0.15, 0.2, 18, 1, false, -Math.PI / 2, Math.PI), trim);
    cap.position.set(cxB, yb - 0.1, H.z1); root.add(cap);
    box(trim, cxB - 1.0, cxB + 1.0, F + 0.4, F + 2.5, H.z1 + 0.01, H.z1 + 0.06, false);   // the main floor's door onto the deck
    box(glass, cxB - 0.85, cxB + 0.85, F + 0.4, F + 2.4, H.z1 + 0.04, H.z1 + 0.09, false);
  }
  // --- the garage wing on the east end: three stained-wood doors onto the motor court, a lantern between each pair
  const gtop = G + 4.4;
  box(stucco, H.x1 - 0.2, H.gx1, T - 0.3, gtop, H.gz0, H.z1);
  box(trim, H.x1, H.gx1 + 0.12, gtop - 0.25, gtop, H.gz0 - 0.12, H.z1 + 0.12);
  hip(H.x1, H.gx1, H.gz0, H.z1, gtop, 2.6, 0.5);
  ob(H.x1, H.gx1, H.gz0, H.z1, T - 0.3, gtop + 2.6);
  {
    const dw = 2.3, gap = (H.gx1 - H.x1 - 3 * dw) / 4;
    for (let i = 0; i < 3; i++) {
      const x0 = H.x1 + gap + i * (dw + gap), x1 = x0 + dw, zf = H.gz0;
      box(trim, x0 - 0.12, x1 + 0.12, G, G + 2.42, zf - 0.04, zf, false);
      box(garageDoor, x0, x1, G, G + 2.3, zf - 0.09, zf - 0.03, false);
      for (let r = 1; r < 4; r++) box(groove, x0 + 0.05, x1 - 0.05, G + r * 0.575 - 0.02, G + r * 0.575 + 0.02, zf - 0.1, zf - 0.08, false);
      for (let c = 1; c < 4; c++) box(groove, x0 + c * dw / 4 - 0.02, x0 + c * dw / 4 + 0.02, G + 0.05, G + 2.25, zf - 0.1, zf - 0.08, false);
      win('n', (x0 + x1) / 2, zf - 0.01, G + 3.0, 0.9, 0.8, { lit: i === 1 });
      if (i) { const lx = x0 - gap / 2; box(lantern, lx - 0.1, lx + 0.1, G + 1.9, G + 2.3, zf - 0.22, zf - 0.02, false); box(lit, lx - 0.07, lx + 0.07, G + 1.95, G + 2.25, zf - 0.24, zf - 0.21, false); }
    }
  }
  win('s', 40, H.z1 + 0.01, T + 0.5, 1.2, 1.4); win('s', 40, H.z1 + 0.01, G + 1.0, 1.2, 1.4);
  // the motor court, from the bulb's rim to the garage doors
  patch(conc, H.x1 - 0.4, H.gx1, 4.0, H.gz0, 0.04, (x, z) => Math.hypot(x - 34, z - 2) < 6.45);
  box(iron, 40.2, 40.8, gY(40.5, 11.5) + 0.03, gY(40.5, 11.5) + 0.06, 11.2, 11.8, false);   // the drain grate

  // --- the main-floor deck over the terrace: white boards, a balustrade, square posts down to the terrace, a stair
  const dX0 = H.deckX0, dX1 = H.deckX1, dZ0 = H.z1, dZ1 = H.deckZ1;
  box(white, dX0, dX1, F - 0.25, F, dZ0, dZ1);
  ob(dX0, dX1, dZ0, dZ1, F - 0.25, F + 1.05, { surface: 'wood' });
  for (const px of [dX0 + 0.15, 28.3, 32.0, dX1 - 0.15]) { box(white, px - 0.13, px + 0.13, T, F - 0.25, dZ1 - 0.28, dZ1 - 0.02); ob(px - 0.13, px + 0.13, dZ1 - 0.28, dZ1 - 0.02, T, F); }
  const balus = (x0, z0, x1, z1) => {   // a balustrade from (x0, z0) to (x1, z1) on the deck
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.16);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; box(rail, x - 0.025, x + 0.025, F, F + 0.95, z - 0.025, z + 0.025, false); }
    box(rail, Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, F + 0.95, F + 1.03, Math.min(z0, z1) - 0.05, Math.max(z0, z1) + 0.05);
  };
  balus(dX0 + 0.05, dZ1 - 0.05, dX1 - 0.05, dZ1 - 0.05); balus(dX0 + 0.05, dZ0, dX0 + 0.05, dZ1 - 0.05); balus(dX1 - 0.05, dZ0, dX1 - 0.05, dZ0 + 1.3);
  {   // the stair down from the deck's east end, along the garage's back wall
    const sx0 = dX1, sx1 = dX1 + 3.6, sz0 = H.z1 + 0.05, sz1 = H.z1 + 1.25, n = 14;
    for (let i = 0; i < n; i++) { const y = F - (F - T) * (i + 1) / n, x = sx0 + (sx1 - sx0) * i / n; box(white, x, x + (sx1 - sx0) / n + 0.02, y - 0.05, y, sz0, sz1); }
    box(white, sx0, sx1, T, F - 0.2, sz1 - 0.06, sz1);
    ob(sx0, sx1, sz0, sz1, T, F);
  }
  // --- the terrace: the pale pool deck, the freeform pool with its spa, the black fence and gate round them
  patch(deckConc, 25, H.gx1, H.z1, H.wallZ0, 0.03, (x, z) => ((x - 31.8) / 4.85) ** 2 + ((z - 33) / 2.35) ** 2 < 1);
  {
    const pcx = 31.8, pcz = 33.0, rx = 4.8, rz = 2.3;
    const disc = (r1, r2, mat, y, cx, cz, sx, sz) => { const m = new THREE.Mesh(r1 ? new THREE.RingGeometry(r1, r2, 40) : new THREE.CircleGeometry(r2, 40), mat); m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(cx, y, cz); m.receiveShadow = true; root.add(m); };
    disc(0, 1, water, T - 0.14, pcx, pcz, rx, rz); disc(1, 1.1, coping, T + 0.06, pcx, pcz, rx, rz);
    const wl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 40, 1, true), poolWall); wl.scale.set(rx, 1, rz); wl.position.set(pcx, T - 0.55, pcz); root.add(wl);
    disc(0, 0.9, water, T + 0.1, 37.4, 34.3, 1, 1); disc(0.9, 1.15, coping, T + 0.32, 37.4, 34.3, 1, 1);
    const spa = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.3, 24), coping); spa.position.set(37.4, T + 0.16, 34.3); root.add(spa);
    for (const [lx, lz] of [[27.0, 31.0], [28.6, 31.0]]) { box(white, lx - 0.32, lx + 0.32, T + 0.25, T + 0.35, lz - 0.9, lz + 0.9, false); box(white, lx - 0.32, lx + 0.32, T + 0.3, T + 0.75, lz - 0.95, lz - 0.85, false); }
    const umb = (ux, uz) => { box(iron, ux - 0.03, ux + 0.03, T, T + 2.3, uz - 0.03, uz + 0.03, false); const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.55, 8), M(0xe8e0cc, { side: THREE.DoubleSide })); c.position.set(ux, T + 2.3, uz); c.castShadow = true; root.add(c); };
    umb(26.4, 34.4); umb(36.6, 31.2);
    const fz0 = H.poolZ0, fz1 = H.poolZ1, fx0 = H.poolX0, fx1 = H.poolX1, fh = 1.2;
    const fenceRun = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.12), posts = Math.max(1, Math.round(len / 1.8));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; box(iron, x - 0.012, x + 0.012, T, T + fh, z - 0.012, z + 0.012, false); }
      for (let i = 0; i <= posts; i++) { const x = x0 + (x1 - x0) * i / posts, z = z0 + (z1 - z0) * i / posts; box(iron, x - 0.04, x + 0.04, T, T + fh + 0.06, z - 0.04, z + 0.04); }
      for (const y of [0.1, fh - 0.08]) box(iron, Math.min(x0, x1) - 0.02, Math.max(x0, x1) + 0.02, T + y, T + y + 0.04, Math.min(z0, z1) - 0.02, Math.max(z0, z1) + 0.02, false);
      obstacles.push({ minX: Math.min(x0, x1) - 0.1, maxX: Math.max(x0, x1) + 0.1, minZ: Math.min(z0, z1) - 0.1, maxZ: Math.max(z0, z1) + 0.1, baseY: T, h: fh, surface: 'metal', bbPass: true });
    };
    fenceRun(fx0, fz0, fx1, fz0); fenceRun(fx0, fz1, fx1, fz1); fenceRun(fx0, fz0, fx0, fz1); fenceRun(fx1, fz0, fx1, fz1);
  }
  // --- the stacked-stone wall from the terrace down to the lawn, with stone steps at the east end and square capped
  //     pillars; the lawn below falls toward the woods. A low parapet keeps you on the terrace but for the steps.
  const wZ0 = H.wallZ0, wZ1 = H.wallZ1, wTop = T + 0.45;
  for (const [x0, x1] of [[H.bankX1, H.stepX0], [H.stepX1, H.gx1]]) {
    let low = Infinity;
    for (let x = x0; x < x1 - 1e-6; x += 2.5) {
      const xe = Math.min(x1, x + 2.5), lo = Math.min(gY(x, wZ1 + 0.05), gY(xe, wZ1 + 0.05)) - 0.3; low = Math.min(low, lo);
      box(wallStone, x, xe, lo, wTop, wZ0, wZ1);
      box(capStone, x - 0.02, xe + 0.02, wTop, wTop + 0.08, wZ0 - 0.04, wZ1 + 0.04, false);
    }
    for (const px of [x0, x1]) { box(wallStone, px - 0.3, px + 0.3, low, wTop + 0.4, wZ0 - 0.05, wZ1 + 0.05); box(capStone, px - 0.36, px + 0.36, wTop + 0.4, wTop + 0.5, wZ0 - 0.11, wZ1 + 0.11, false); }
    ob(x0 - 0.3, x1 + 0.3, wZ0, wZ1, low, wTop);
  }
  for (let i = 0; i < 5; i++) {   // the stone steps: five treads laid down the slope from the terrace to the lawn
    const z = 35.6 + i * 0.56, y = gY((H.stepX0 + H.stepX1) / 2, z + 0.56);
    box(capStone, H.stepX0 + 0.05, H.stepX1 - 0.05, y - 0.25, y + 0.04, z, z + 0.6, false);
  }
  // --- the lot lines: where the neighbour's yard to the west stands higher, a stone wall holds it (a parapet on his side)
  for (let z = 21; z < 49 - 1e-6; z += 3) {
    const ze = Math.min(49, z + 3), hiY = Math.max(gY(H.sideX0 - 0.05, z), gY(H.sideX0 - 0.05, ze)) + 0.9;
    const loY = Math.min(gY(H.sideX1 + 0.05, z), gY(H.sideX1 + 0.05, ze)) - 0.3;
    if (hiY - loY < 1.0) continue;
    box(wallStone, H.sideX0, H.sideX1, loY, hiY, z, ze);
    box(capStone, H.sideX0 - 0.04, H.sideX1 + 0.04, hiY, hiY + 0.08, z, ze, false);
    ob(H.sideX0, H.sideX1, z, ze, loY, hiY);
  }
  // --- the fire pit on the lawn west of the steps' foot: a round stone ring, a curved flagstone seat wall on its far
  //     side ending in a square capped pillar (crouch cover, all of it)
  const fpx = 37.6, fpz = 41.2, fy = gY(fpx, fpz);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.5, 16), wallStone); ring.position.set(fpx, fy + 0.2, fpz); ring.castShadow = true; root.add(ring);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), M(0x2a2420)); ash.rotation.x = -Math.PI / 2; ash.position.set(fpx, fy + 0.46, fpz); root.add(ash);
  obstacles.push({ minX: fpx - 0.85, maxX: fpx + 0.85, minZ: fpz - 0.85, maxZ: fpz + 0.85, shape: 'cylinder', cx: fpx, cz: fpz, radius: 0.85, baseY: fy - 0.05, h: 0.5, surface: 'hard' });
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.25 + i * 0.13), sx = fpx + Math.cos(a) * 2.4, sz = fpz + Math.sin(a) * 2.4, sy = gY(sx, sz);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.45), capStone); s.position.set(sx, sy + 0.2, sz); s.rotation.y = -a + Math.PI / 2; s.castShadow = true; root.add(s);
    ob(sx - 0.38, sx + 0.38, sz - 0.38, sz + 0.38, sy - 0.1, sy + 0.44);
  }
  const pa0 = Math.PI * 0.12, pyx = fpx + 2.4 * Math.cos(pa0), pyz = fpz + 2.4 * Math.sin(pa0), pyy = gY(pyx, pyz);
  box(wallStone, pyx - 0.3, pyx + 0.3, pyy - 0.1, pyy + 0.95, pyz - 0.3, pyz + 0.3); box(capStone, pyx - 0.36, pyx + 0.36, pyy + 0.95, pyy + 1.05, pyz - 0.36, pyz + 0.36, false);
  ob(pyx - 0.3, pyx + 0.3, pyz - 0.3, pyz + 0.3, pyy - 0.1, pyy + 1.05);

  const group = bakeByMaterial(root, 'bunrattyHeroHouse');
  // v1.353 (D.70 step 4): Halloween's spots, from the door's threshold: a lantern either side of the steps' foot and
  // one by the walk on the ground; webs under the eaves at the gable's west corner and the main block's east one; the
  // tower's own lanterns light the door, so no porch light
  const rel = (along, out) => gY(tm + along, tz0 - out) - F;
  scene.add(holidayDoorMarker(tm, F, tz0, 0, -1, {
    lanterns: [[-1.45, 1.65, rel(-1.45, 1.65), 0.2], [1.45, 1.65, rel(1.45, 1.65), 0.17], [1.25, 4.3, rel(1.25, 4.3), 0.24]],
    webs: [[H.x0 - tm, tz0 - wz0 + 0.06, 5.85, -1], [H.x1 - tm, tz0 - H.z0 + 0.06, 5.85, 1]], light: null }));
  scene.add(group);
  obstacles[0].mesh = group;
  return { group, obstacles };
}

// v1.306: Michael's round backyard trampoline (v1.53's, out of buildBunrattyCourtScene so the range has it too): a low
// frame ring, a dark jump mat, a ring of net poles. Returns the group at (tx, 0, tz) and its cylinder obstacle.
function buildBackyardTrampoline(tx, tz, rotY) {
  const tramGroup = new THREE.Group();
  tramGroup.position.set(tx, 0, tz);
  const R = 1.8;          // trampoline radius
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.5 });
  const padMat   = new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.8 }); // blue spring pad
  const matMat   = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.9 });  // dark jump mat
  const netMat   = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, transparent: true, opacity: 0.35 });
  // Outer frame ring (torus) at jump height (~0.85m).
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 8, 24), frameMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.85; ring.castShadow = true; tramGroup.add(ring);
  // Blue spring-pad annulus just inside the ring.
  const pad = new THREE.Mesh(new THREE.RingGeometry(R * 0.78, R, 24), padMat);
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.86; tramGroup.add(pad);
  // Dark jump mat (the bouncy surface).
  const mat = new THREE.Mesh(new THREE.CircleGeometry(R * 0.78, 24), matMat);
  mat.rotation.x = -Math.PI / 2; mat.position.y = 0.84; mat.receiveShadow = true; tramGroup.add(mat);
  // Four legs (W-frame approximated as simple verticals + feet).
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    const lx = Math.cos(ang) * R * 0.85, lz = Math.sin(ang) * R * 0.85;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), frameMat);
    leg.position.set(lx, 0.425, lz); leg.castShadow = true; tramGroup.add(leg);
  }
  // Safety-net poles + a faint net cylinder around the top.
  const poleH = 2.0;
  for (let a = 0; a < 6; a++) {
    const ang = a * Math.PI / 3;
    const px = Math.cos(ang) * R, pz = Math.sin(ang) * R;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, poleH, 6), frameMat);
    pole.position.set(px, 0.85 + poleH / 2, pz); pole.castShadow = true; tramGroup.add(pole);
  }
  const net = new THREE.Mesh(new THREE.CylinderGeometry(R, R, poleH, 20, 1, true), netMat);
  net.position.y = 0.85 + poleH / 2; tramGroup.add(net);
  tramGroup.rotation.y = rotY;
  // Light collision on the frame footprint (counts as cover — h = frame height).
  // v1.53: round trampoline → true cylinder so you don't snag on phantom corners.
  const obs = { minX: tx - R, maxX: tx + R, minZ: tz - R, maxZ: tz + R,
    shape: 'cylinder', cx: tx, cz: tz, radius: R, h: 0.95, mesh: tramGroup, surface: 'metal' };
  return { group: tramGroup, obs };
}

// v1.305 (D.51 step 2, docs/refs/bunratty.md "The buildings", gaps 4, 5c-d and 12): the street's other six houses at about
// real size, where the 9 x 7 m colonials stood. Each keeps its front line and grows back and sideways, to 11-15 m by
// 9-10 m, three of them with a two-bay garage wing set 1.2 m back; the lots' anchors and starts stay where they were.
// The guide's three styles: 'stucco' (French-eclectic: heavy cream trim and quoins, arched windows below, a steep hip
// with a front cross gable), 'brick' (tan-grey, white trim, twin front gables and an arched portico) and 'portico' (cream,
// a two-storey portico on four columns under a balustrade). f: 's' faces the street to the south (the north row), 'n'
// the north; x0..x1 the main block, zf its front, d its depth; wing { x0, x1, d }.
const BR_NEIGHBOURS = [
  { f: 's', style: 'stucco',  x0: -35,   x1: -22,  zf: -12.5, d: 10,  wall: 0x9a958c, roof: 0x55575b, wing: { x0: -22, x1: -16.6, d: 5 } },
  { f: 's', style: 'portico', x0: -13.5, x1: 1.5,  zf: -14.5, d: 10,  wall: 0xd8ccb2, roof: 0x5d6064 },
  { f: 's', style: 'brick',   x0: 8,     x1: 21,   zf: -12.5, d: 10,  wall: 0x8a8278, roof: 0x55575b, wing: { x0: 21, x1: 27, d: 6.5 } },
  { f: 'n', style: 'stucco',  x0: -34,   x1: -22,  zf: 12.5,  d: 9.5, wall: 0xd3c5a8, roof: 0x5e4a40 },
  { f: 'n', style: 'brick',   x0: -10.5, x1: 0.5,  zf: 14.5,  d: 9,   wall: 0x8f8578, roof: 0x5a4c42, wing: { x0: -16, x1: -10.5, d: 5.5 } },
  { f: 'n', style: 'stucco',  x0: 4,     x1: 14.8, zf: 13.5,  d: 9.5, wall: 0x9f998e, roof: 0x55575b },
];
// v1.305: a house's footprint boxes (main block, then the wing), the door's x and the drive's (the wing's middle, or the door's)
function brNeighbourPlan(h) {
  const k = h.f === 's' ? -1 : 1, zr = (v0, v1) => [Math.min(h.zf + k * v0, h.zf + k * v1), Math.max(h.zf + k * v0, h.zf + k * v1)];
  const [mz0, mz1] = zr(0, h.d), rects = [{ minX: h.x0, maxX: h.x1, minZ: mz0, maxZ: mz1 }];
  if (h.wing) { const [wz0, wz1] = zr(1.2, 1.2 + h.wing.d); rects.push({ minX: h.wing.x0, maxX: h.wing.x1, minZ: wz0, maxZ: wz1 }); }
  const doorX = (h.x0 + h.x1) / 2;
  return { k, zr, rects, doorX, driveX: h.wing ? (h.wing.x0 + h.wing.x1) / 2 : doorX };
}

// v1.305: all six built into one root and baked by material (the walls one mesh per house, the rest shared), so the
// street's houses cost about 18 draw calls. Returns the group and, per house, its obstacles (main block first, with
// .mesh), its main floor F and its plan.
function buildBunrattyNeighbours(scene, o) {
  const gY = o.groundY, night = !!o.night, root = new THREE.Group();
  const M = (c, x = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, x));
  const DS = THREE.DoubleSide;
  const trimCream = M(0xc7b9a0, { roughness: 0.7 }), trimWhite = M(0xeae6dc, { roughness: 0.7 });
  const door = M(0x4a3020, { roughness: 0.7 }), found = M(0x8f877a, { roughness: 0.97 }), capStone = M(0xcac0b0, { roughness: 0.9 });
  const glass = M(0x2e3a44, { roughness: 0.25, metalness: 0.2, emissive: 0x101820, emissiveIntensity: 0.4 });
  const lit = night ? M(0xffe0a0, { roughness: 0.4, emissive: 0xffc070, emissiveIntensity: 0.85 }) : glass;
  const lantern = M(0x1a1a1a, { roughness: 0.5, metalness: 0.4 });
  const garWood = M(0x704723, { roughness: 0.75 }), garWhite = M(0xe2ddd2, { roughness: 0.7 }), groove = M(0x4a3a2a, { roughness: 0.8 });
  const conc = M(0xd8d2c8, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mulch = M(0x2a2420, { roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const roofs = new Map(), roofMat = c => { if (!roofs.has(c)) roofs.set(c, M(c, { roughness: 0.85, side: DS })); return roofs.get(c); };
  const box = (mat, x0, x1, y0, y1, z0, z1, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = cast; root.add(m); return m;
  };
  const tris = (mat, pts) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; root.add(m); return m;
  };
  const hip = (mat, x0, x1, z0, z1, y, rise, ov = 0.5) => {   // as the hero house's: the ridge along the longer side
    x0 -= ov; x1 += ov; z0 -= ov; z1 += ov;
    const w = x1 - x0, d = z1 - z0, inset = Math.min(w, d) / 2, A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1];
    if (w >= d) { const R1 = [x0 + inset, y + rise, (z0 + z1) / 2], R2 = [x1 - inset, y + rise, (z0 + z1) / 2]; tris(mat, [A, R1, R2, A, R2, B, D, C, R2, D, R2, R1, A, D, R1, B, R2, C]); }
    else { const R1 = [(x0 + x1) / 2, y + rise, z0 + inset], R2 = [(x0 + x1) / 2, y + rise, z1 - inset]; tris(mat, [A, R1, B, B, R1, R2, B, R2, C, D, C, R2, D, R2, R1, A, D, R1]); }
  };
  const win = (f, x, z, y, w, h, trim, opt = {}) => {   // as the hero house's
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = { n: Math.PI, s: 0 }[f];
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); };
    const gm = opt.lit ? lit : glass;
    add(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.06), trim, 0, h / 2, 0.03);
    add(new THREE.BoxGeometry(w, h, 0.08), gm, 0, h / 2, 0.06);
    add(new THREE.BoxGeometry(w + 0.36, 0.1, 0.16), trim, 0, -0.08, 0.08);
    add(new THREE.BoxGeometry(0.06, h, 0.1), trim, 0, h / 2, 0.08);
    if (h > 1.3) add(new THREE.BoxGeometry(w, 0.06, 0.1), trim, 0, h * 0.62, 0.08);
    if (opt.arch) {
      add(new THREE.CircleGeometry(w / 2 + 0.12, 12, 0, Math.PI), trim, 0, h, 0.035);
      add(new THREE.CircleGeometry(w / 2, 12, 0, Math.PI), gm, 0, h, 0.075);
    }
    root.add(g);
  };
  const patch = (mat, x0, x1, z0, z1, lift) => {   // a ground patch laid on the terrain
    const st = 0.78, nx = Math.max(1, Math.ceil((x1 - x0) / st)), nz = Math.max(1, Math.ceil((z1 - z0) / st)), p = [];
    const at = (i, k) => { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * k / nz; return [x, gY(x, z) + lift, z]; };
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const a = at(i, k), b = at(i + 1, k), c = at(i, k + 1), d = at(i + 1, k + 1); p.push(a, c, b, b, c, d); }
    const m = tris(mat, p); m.castShadow = false; m.receiveShadow = true;
  };

  const houses = [], doorMarks = [];
  BR_NEIGHBOURS.forEach((h, hi) => {
    const P = brNeighbourPlan(h), k = P.k, zr = P.zr, Z = v => h.zf + k * v, fr = h.f, bk = h.f === 's' ? 'n' : 's';
    const obstacles = [];
    const ob = (x0, x1, z0, z1, baseY, top) => { const b = { minX: x0, maxX: x1, minZ: z0, maxZ: z1, baseY, h: top - baseY, surface: 'hard' }; obstacles.push(b); return b; };
    const bxv = (mat, x0, x1, y0, y1, v0, v1, cast) => { const [a, b] = zr(v0, v1); return box(mat, x0, x1, y0, y1, a, b, cast); };
    const wall = M(h.wall, { roughness: 0.95 }), roof = roofMat(h.roof);
    const face3 = (a, b, c) => tris(wall, k < 0 ? [a, b, c] : [b, a, c]);   // a gable's face, wound to face the street
    const trim = h.style === 'stucco' ? trimCream : trimWhite;
    const isLit = (i, row) => (i * 7 + row * 3 + hi * 5) % 5 === 0;
    // the levels: the main floor 0.45 m over the highest ground along the front; the walls go 0.3 m under the lowest
    let fMax = -Infinity, low = Infinity;
    for (let x = h.x0; x <= h.x1 + 1e-6; x += 0.5) fMax = Math.max(fMax, gY(x, Z(-0.3)));
    for (const r of P.rects) for (let x = r.minX; x <= r.maxX + 1e-6; x += 1) for (let z = r.minZ; z <= r.maxZ + 1e-6; z += 1) low = Math.min(low, gY(x, z));
    const F = fMax + 0.45, B = low - 0.3, top = F + 5.9, W = h.x1 - h.x0, mid = P.doorX, half = Math.min(W, h.d) / 2 + 0.55;
    const rise = (h.style === 'stucco' ? 0.5 : 0.38) * Math.min(W, h.d);
    // --- the main block
    bxv(wall, h.x0, h.x1, B, top, 0, h.d);
    bxv(found, h.x0 - 0.06, h.x1 + 0.06, B, F, -0.06, h.d + 0.06, false);                    // the water table under the main floor
    bxv(trim, h.x0 - 0.12, h.x1 + 0.12, top - 0.28, top, -0.12, h.d + 0.12);                  // the frieze under the eaves
    bxv(trim, h.x0 - 0.05, h.x1 + 0.05, F + 3.0, F + 3.16, -0.05, h.d + 0.05, false);         // a belt course between the floors
    hip(roof, h.x0, h.x1, ...zr(0, h.d), top, rise, 0.55);
    ob(h.x0, h.x1, ...zr(0, h.d), B, top + rise);
    // a chimney through the roof at the end away from the wing
    const chX = h.wing && h.wing.x0 >= h.x1 - 0.01 ? h.x0 + 1.4 : h.x1 - 1.4;
    bxv(h.style === 'brick' ? wall : found, chX - 0.6, chX + 0.6, top - 1, top + rise * 0.8 + 0.7, h.d * 0.45, h.d * 0.45 + 1.2);
    bxv(capStone, chX - 0.7, chX + 0.7, top + rise * 0.8 + 0.7, top + rise * 0.8 + 0.82, h.d * 0.45 - 0.1, h.d * 0.45 + 1.3, false);
    // a front cross gable over x gx0..gx1, standing p out from the face, its roof's ridge running back into the hip
    const gables = [];
    const gable = (gx0, gx1, p) => {
      const gm = (gx0 + gx1) / 2, gr = (gx1 - gx0) * (h.style === 'stucco' ? 0.55 : 0.45), vb = gr * half / rise + 0.3;
      if (p > 0) {
        bxv(wall, gx0, gx1, B, top, -p, 0.2); bxv(found, gx0 - 0.06, gx1 + 0.06, B, F, -p - 0.06, 0, false);
        bxv(trim, gx0 - 0.12, gx1 + 0.12, top - 0.28, top, -p - 0.12, 0);
        ob(gx0, gx1, ...zr(-p, 0), B, top + gr);
      }
      const zF = Z(-p - 0.01), zO = Z(-p - 0.45), zB = Z(vb), e0 = gx0 - 0.4, e1 = gx1 + 0.4, ry = top + gr + 0.05;
      face3([gx0, top, zF], [gx1, top, zF], [gm, top + gr, zF]);
      tris(roof, [[e0, top - 0.25, zO], [gm, ry, zO], [gm, ry, zB], [e0, top - 0.25, zO], [gm, ry, zB], [e0, top - 0.25, zB],
        [e1, top - 0.25, zO], [gm, ry, zO], [gm, ry, zB], [e1, top - 0.25, zO], [gm, ry, zB], [e1, top - 0.25, zB]]);
      win(fr, gm, Z(-p - 0.01), F + 3.55, 1.2, 1.6, trim, { arch: true, lit: isLit(gables.length, 9) });
      win(fr, gm, Z(-p - 0.01), top + 0.3, 0.55, 0.35, trim, { arch: true });                  // the attic vent
      gables.push([gx0, gx1, p]);
    };
    if (h.style === 'stucco') gable(h.wing && h.wing.x1 <= h.x0 + 0.01 ? h.x1 - 4 : h.x0, h.wing && h.wing.x1 <= h.x0 + 0.01 ? h.x1 : h.x0 + 4, 0.6);
    if (h.style === 'brick') { gable(h.x0, h.x0 + 4, 0.5); gable(h.x1 - 4, h.x1, 0.5); }
    // stucco: quoins up the front corners
    if (h.style === 'stucco') for (const [cx, s] of [[h.x0, 1], [h.x1, -1]]) {
      const gp = gables.find(g => Math.abs(g[0] - cx) < 0.01 || Math.abs(g[1] - cx) < 0.01), v0 = gp ? -gp[2] : 0;
      for (let i = 0; i < 8; i++) { const y = F + 0.1 + i * 0.68, w = i % 2 ? 0.45 : 0.75; bxv(trim, s > 0 ? cx - 0.05 : cx - w, s > 0 ? cx + w : cx + 0.05, y, y + 0.36, v0 - 0.05, v0 + 0.3, false); }
    }
    // --- the entry at the middle of the front
    const gS = gY(mid, Z(-1.6));
    const stoop = (x0, x1, v0) => {   // three risers from the ground up to the main floor, out from v0
      for (let i = 0; i < 3; i++) bxv(capStone, x0, x1, gS - 0.3, gS + (F - gS) * (i + 1) / 3, v0 - 1.2 + i * 0.4, v0, false);
      ob(x0, x1, ...zr(v0 - 1.2, v0), gS - 0.3, F);
    };
    let entryV = 0;
    if (h.style === 'portico') {   // a two-storey portico on four columns under a balustrade, on a stone floor
      const px0 = mid - 2.8, px1 = mid + 2.8, pv = -2.4;
      bxv(capStone, px0, px1, B, F, pv, 0, false); ob(px0, px1, ...zr(pv, 0), B, F);
      stoop(mid - 1.6, mid + 1.6, pv);
      for (const cx of [px0 + 0.35, mid - 0.95, mid + 0.95, px1 - 0.35]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, top - 0.5 - F, 10), trimWhite);
        c.position.set(cx, (F + top - 0.5) / 2, Z(pv + 0.3)); c.castShadow = true; root.add(c);
        bxv(trimWhite, cx - 0.3, cx + 0.3, F, F + 0.25, pv + 0.0, pv + 0.6, false);
      }
      bxv(trimWhite, px0 - 0.1, px1 + 0.1, top - 0.5, top, pv - 0.1, 0);                     // the entablature
      for (let i = 0; i <= 14; i++) { const bx = px0 + (px1 - px0) * i / 14; bxv(trimWhite, bx - 0.05, bx + 0.05, top, top + 0.75, pv + 0.05, pv + 0.15, false); }
      bxv(trimWhite, px0 - 0.1, px1 + 0.1, top + 0.75, top + 0.85, pv - 0.02, pv + 0.22, false);   // the balustrade's rail
      for (const s of [-1, 1]) bxv(trimWhite, mid + s * 2.8 - 0.06, mid + s * 2.8 + 0.06, top, top + 0.85, pv + 0.1, 0, false);
      win(fr, mid, Z(-0.01), F + 3.55, 1.3, 1.8, trim, { arch: true, lit: true });          // the window over the door
    } else if (h.style === 'brick') {   // an arched portico: a projecting entry with its own gable
      const ex0 = mid - 1.5, ex1 = mid + 1.5, ev = -1.4, et = F + 3.2, egr = 1.3;
      bxv(wall, ex0, ex1, B, et, ev, 0.2); bxv(trim, ex0 - 0.1, ex1 + 0.1, et - 0.2, et, ev - 0.1, 0);
      face3([ex0, et, Z(ev - 0.01)], [ex1, et, Z(ev - 0.01)], [mid, et + egr, Z(ev - 0.01)]);
      const eo = Z(ev - 0.35), eb = Z(0.1);
      tris(roof, [[ex0 - 0.3, et - 0.2, eo], [mid, et + egr + 0.05, eo], [mid, et + egr + 0.05, eb], [ex0 - 0.3, et - 0.2, eo], [mid, et + egr + 0.05, eb], [ex0 - 0.3, et - 0.2, eb],
        [ex1 + 0.3, et - 0.2, eo], [mid, et + egr + 0.05, eo], [mid, et + egr + 0.05, eb], [ex1 + 0.3, et - 0.2, eo], [mid, et + egr + 0.05, eb], [ex1 + 0.3, et - 0.2, eb]]);
      ob(ex0, ex1, ...zr(ev, 0), B, et + egr);
      entryV = ev;
      stoop(mid - 1.3, mid + 1.3, ev);
    } else stoop(mid - 1.3, mid + 1.3, 0);
    // the door: double wood doors under a lit fanlight, a lantern either side
    {
      const zd = Z(entryV - 0.05), zt = Z(entryV - 0.02);
      const [da, db] = zr(entryV - 0.1, entryV - 0.04);
      box(trim, mid - 1.0, mid + 1.0, F, F + 2.7, ...zr(entryV - 0.06, entryV), false);
      box(door, mid - 0.76, mid - 0.02, F, F + 2.5, da, db, false); box(door, mid + 0.02, mid + 0.76, F, F + 2.5, da, db, false);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12, 0, Math.PI), lit); fl.position.set(mid, F + 2.52, zd); fl.rotation.y = fr === 'n' ? Math.PI : 0; root.add(fl);
      const ar = new THREE.Mesh(new THREE.CircleGeometry(0.86, 12, 0, Math.PI), trim); ar.position.set(mid, F + 2.5, zt); ar.rotation.y = fr === 'n' ? Math.PI : 0; root.add(ar);
      if (h.style !== 'portico') for (const lx of [mid - 1.3, mid + 1.3]) { bxv(lantern, lx - 0.12, lx + 0.12, F + 1.8, F + 2.25, entryV - 0.3, entryV - 0.05, false); bxv(lit, lx - 0.08, lx + 0.08, F + 1.85, F + 2.18, entryV - 0.32, entryV - 0.29, false); }
    }
    // the front's windows, in bays clear of the door, the gables and the portico
    const nb = Math.max(3, Math.round(W / 3.1)), bw = W / nb;
    for (let i = 0; i < nb; i++) {
      const x = h.x0 + bw * (i + 0.5);
      const inGable = gables.find(g => x > g[0] - 0.3 && x < g[1] + 0.3), clearDoor = Math.abs(x - mid) > (h.style === 'portico' ? 3.4 : 1.9);
      const vf = inGable ? -inGable[2] - 0.01 : -0.01;
      if (clearDoor) win(fr, x, Z(vf), F + 0.7, 1.15, 1.85, trim, { arch: h.style === 'stucco', lit: isLit(i, 0) });
      if (!inGable && Math.abs(x - mid) > (h.style === 'portico' ? 3.4 : 1.2)) win(fr, x, Z(-0.01), F + 3.6, 1.05, 1.5, trim, { lit: isLit(i, 1) });
    }
    // the back: a door at the middle with a step, and two rows of windows
    win(bk, mid - 1.4, Z(h.d + 0.01), F + 0.4, 1.5, 2.1, trim, { lit: isLit(hi, 2) });
    {
      const [da, db] = zr(h.d + 0.02, h.d + 0.08), gB = gY(mid + 1.1, Z(h.d + 0.8));
      box(trim, mid + 0.4, mid + 1.8, Math.min(F, gB + 0.2) , F + 2.3, ...zr(h.d, h.d + 0.05), false);
      box(door, mid + 0.5, mid + 1.7, Math.min(F, gB + 0.2), F + 2.2, da, db, false);
      if (F - gB > 0.25) { bxv(capStone, mid + 0.3, mid + 1.9, gB - 0.3, (F + gB) / 2, h.d, h.d + 0.28, false); }   // a step within a body's width of the wall
    }
    for (let i = 0; i < nb; i++) {
      const x = h.x0 + bw * (i + 0.5);
      if (Math.abs(x - mid) > 2.3) win(bk, x, Z(h.d + 0.01), F + 0.7, 1.15, 1.7, trim, { lit: isLit(i, 3) });
      win(bk, x, Z(h.d + 0.01), F + 3.6, 1.05, 1.5, trim, { lit: isLit(i, 4) });
    }
    // the ends' windows
    for (const [ex, f] of [[h.x0, 'w'], [h.x1, 'e']]) {
      if (h.wing && ((f === 'e' && h.wing.x0 >= h.x1 - 0.01) || (f === 'w' && h.wing.x1 <= h.x0 + 0.01))) continue;
      for (const v of [h.d * 0.3, h.d * 0.72]) {
        const g = new THREE.Group(); g.position.set(ex + (f === 'e' ? 0.01 : -0.01), F + 3.6, Z(v)); g.rotation.y = f === 'e' ? Math.PI / 2 : -Math.PI / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(1.29, 1.74, 0.06), trim); a.position.set(0, 0.75, 0.03); g.add(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.5, 0.08), isLit(Math.round(v), 5) ? lit : glass); b.position.set(0, 0.75, 0.06); g.add(b);
        root.add(g);
      }
    }
    // mulch beds along the front either side of the entry
    patch(mulch, h.x0 + 0.2, mid - 1.5, ...zr(-1.3, 0), 0.03);
    patch(mulch, mid + 1.5, h.x1 - 0.2, ...zr(-1.3, 0), 0.03);
    // --- the garage wing: two doors onto a concrete apron that meets the drive, a lantern between them
    if (h.wing) {
      const w = h.wing, v0 = 1.2, v1 = 1.2 + w.d, gw = w.x1 - w.x0;
      let G = -Infinity; for (let x = w.x0; x <= w.x1 + 1e-6; x += 0.5) G = Math.max(G, gY(x, Z(v0 - 0.3)));
      G += 0.04;
      const gtop = G + 3.5;
      bxv(wall, w.x0, w.x1, B, gtop, v0, v1);
      bxv(trim, w.x0 - 0.12, w.x1 + 0.12, gtop - 0.25, gtop, v0 - 0.12, v1 + 0.12);
      hip(roof, w.x0, w.x1, ...zr(v0, v1), gtop, Math.min(gw, w.d) * 0.4, 0.45);
      ob(w.x0, w.x1, ...zr(v0, v1), B, gtop + Math.min(gw, w.d) * 0.4);
      const dw = 2.3, gap = (gw - 2 * dw) / 3, gm = h.style === 'brick' ? garWhite : garWood;
      for (let i = 0; i < 2; i++) {
        const x0 = w.x0 + gap + i * (dw + gap), x1 = x0 + dw;
        bxv(trim, x0 - 0.12, x1 + 0.12, G, G + 2.32, v0 - 0.04, v0, false);
        bxv(gm, x0, x1, G, G + 2.2, v0 - 0.09, v0 - 0.03, false);
        for (let r = 1; r < 4; r++) bxv(groove, x0 + 0.05, x1 - 0.05, G + r * 0.55 - 0.02, G + r * 0.55 + 0.02, v0 - 0.1, v0 - 0.08, false);
      }
      const lx = (w.x0 + w.x1) / 2; bxv(lantern, lx - 0.1, lx + 0.1, G + 1.8, G + 2.2, v0 - 0.22, v0 - 0.02, false); bxv(lit, lx - 0.07, lx + 0.07, G + 1.85, G + 2.15, v0 - 0.24, v0 - 0.21, false);
      patch(conc, w.x0 - 0.3, w.x1 + 0.3, ...zr(-1.6, v0), 0.04);
    }
    // v1.353 (D.70 step 4): Halloween's spots from the door's threshold (along is +x times k): beside the stoop's foot,
    // clear of the foundation shrubs, and out by the walk (on the portico's floor for the portico); webs under the eaves
    // at the front corners, on a gable's face where one stands at the corner; a porch light only where the door has no
    // lanterns of its own
    {
      const rel = (along, out) => gY(mid + k * along, Z(entryV - out)) - F;
      const pf = h.style === 'portico';
      const sp = pf ? [[-1.5, 0.5, 0, 0.2], [1.5, 0.5, 0, 0.17], [2.2, 4.1, rel(2.2, 4.1), 0.24]]
        : [[-1.6, 1.45, rel(-1.6, 1.45), 0.2], [1.6, 1.45, rel(1.6, 1.45), 0.17], [2.4, 2.6, rel(2.4, 2.6), 0.24]];
      const webs = [h.x0, h.x1].map(cx => {
        const gp = gables.find(g => Math.abs(g[0] - cx) < 0.01 || Math.abs(g[1] - cx) < 0.01), along = (cx - mid) * k;
        return [along, entryV + (gp ? gp[2] : 0) + 0.06, top - 0.3 - F, Math.sign(along)];
      });
      doorMarks.push(holidayDoorMarker(mid, F, Z(entryV), 0, -k, { lanterns: sp, webs, light: pf ? [-1.3, 0.08, 2.0] : null }));
    }
    houses.push({ obstacles, F, plan: P });
  });
  const group = bakeByMaterial(root, 'bunrattyNeighbours');
  for (const m of doorMarks) scene.add(m);   // v1.353: beside the baked group, which stays meshes only
  scene.add(group);
  for (const hh of houses) hh.obstacles[0].mesh = group;
  return { group, houses };
}

// v1.303 (D.51 step 1): scenery past a map's fence at real scale, merged into one vertex-coloured mesh (plus one for lit
// windows at night) so a few thousand trees cost two draw calls. Items: { k: 'tree' | 'pine', x, y, z, h, r, col },
// { k: 'house', x, y, z, yaw, w, d, h, wall, roof }, { k: 'box', x, y, z, yaw, w, h, d, col } and { k: 'strip', pts, w, col }
// (a ribbon laid on the ground: pts are [x, y, z] down its middle). Nothing in it is solid: it is never an obstacle.
function buildMergedScenery(items, night, seedKey) {
  const rnd = _mulberry32(_hashStringToSeed(seedKey || 'scenery'));
  const P = [], N = [], C = [], LP = [], LN = [], LC = [], _c = new THREE.Color();
  function tri(a, b, c, col, lit) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    _c.setHex(col);
    const p = lit ? LP : P, n = lit ? LN : N, cc = lit ? LC : C;
    for (const v of [a, b, c]) { p.push(v[0], v[1], v[2]); n.push(nx, ny, nz); cc.push(_c.r, _c.g, _c.b); }
  }
  function face(pts, col, inside, lit) {   // a convex polygon (3-4 points) wound to face away from `inside`
    const a = pts[0], b = pts[1], c = pts[2];
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const q = (nx * (a[0] - inside[0]) + ny * (a[1] - inside[1]) + nz * (a[2] - inside[2])) < 0 ? pts.slice().reverse() : pts;
    tri(q[0], q[1], q[2], col, lit);
    if (q.length === 4) tri(q[0], q[2], q[3], col, lit);
  }
  const frame = (x, z, yaw) => { const s = Math.sin(yaw), c = Math.cos(yaw); return (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
  function box(T, y0, w, h, d, col, topCol) {
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, y1 = y0 + h, inside = T(0, y0 + h / 2, 0);
    face([T(x0, y0, z1), T(x1, y0, z1), T(x1, y1, z1), T(x0, y1, z1)], col, inside);
    face([T(x0, y0, z0), T(x1, y0, z0), T(x1, y1, z0), T(x0, y1, z0)], col, inside);
    face([T(x0, y0, z0), T(x0, y0, z1), T(x0, y1, z1), T(x0, y1, z0)], col, inside);
    face([T(x1, y0, z0), T(x1, y0, z1), T(x1, y1, z1), T(x1, y1, z0)], col, inside);
    face([T(x0, y1, z0), T(x1, y1, z0), T(x1, y1, z1), T(x0, y1, z1)], topCol != null ? topCol : col, inside);
  }
  if (!_bdIcosa) { const gi = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); _bdIcosa = Array.from(gi.attributes.position.array); gi.dispose(); }
  const stats = { trees: 0, houses: 0 };
  for (const it of items) {
    if (it.k === 'tree' || it.k === 'pine') {
      const T = frame(it.x, it.z, rnd() * 6.283), y = it.y - 0.3;
      if (it.k === 'pine') {   // a loblolly: a bare trunk to half its height, a narrow cone above
        box(T, y, 0.45, it.h * 0.62, 0.45, 0x4a3424);
        const apex = T(0, y + it.h, 0), base = y + it.h * 0.42;
        for (let i = 0; i < 7; i++) {
          const a0 = i / 7 * 6.283, a1 = (i + 1) / 7 * 6.283;
          face([T(Math.cos(a0) * it.r, base, Math.sin(a0) * it.r), T(Math.cos(a1) * it.r, base, Math.sin(a1) * it.r), apex], it.col, T(0, base + 1, 0));
        }
      } else {                 // a hardwood: trunk clear to well over your head, one big crown
        box(T, y, 0.55, it.h - it.r * 1.2, 0.55, 0x4a3828);
        const cy = y + it.h - it.r * 0.9, sy = 0.85;
        for (let i = 0; i < _bdIcosa.length; i += 9) {
          const v = j => T(_bdIcosa[i + j] * it.r, cy + _bdIcosa[i + j + 1] * it.r * sy, _bdIcosa[i + j + 2] * it.r);
          face([v(0), v(3), v(6)], it.col, T(0, cy, 0));
        }
      }
      stats.trees++;
    } else if (it.k === 'house') {   // a big house: two storeys over a walk-out, a hip roof, rows of windows on its face
      const T = frame(it.x, it.z, it.yaw), y = it.y - 0.4, w = it.w, d = it.d, h = it.h;
      box(T, y, w, h + 0.4, d, it.wall);
      const o = 0.6, top = y + h + 0.4, rh = Math.min(w, d) * 0.32, rIn = Math.min(w / 2 - 0.5, d / 2);
      const A = T(-w / 2 - o, top, -d / 2 - o), Bq = T(w / 2 + o, top, -d / 2 - o), Cq = T(w / 2 + o, top, d / 2 + o), D = T(-w / 2 - o, top, d / 2 + o);
      const R1 = T(-w / 2 - o + rIn, top + rh, 0), R2 = T(w / 2 + o - rIn, top + rh, 0), mid = T(0, top + rh * 0.3, 0);
      face([A, Bq, R2, R1], it.roof, mid); face([D, Cq, R2, R1], it.roof, mid); face([A, D, R1], it.roof, mid); face([Bq, Cq, R2], it.roof, mid);
      const zf = d / 2 + 0.05, n = Math.max(3, Math.round(w / 3.4));
      for (let row = 0; row < Math.floor(h / 3.1); row++) for (let i = 0; i < n; i++) {
        const wx = -w / 2 + (i + 0.5) * w / n, wy = y + 1.4 + row * 3.1, lit = night && rnd() < 0.3;
        face([T(wx - 0.65, wy, zf), T(wx + 0.65, wy, zf), T(wx + 0.65, wy + 1.5, zf), T(wx - 0.65, wy + 1.5, zf)], lit ? 0xffd890 : 0x2a3440, T(wx, wy, 0), lit);
      }
      stats.houses++;
    } else if (it.k === 'box') {
      box(frame(it.x, it.z, it.yaw || 0), it.y, it.w, it.h, it.d, it.col, it.top);
    } else if (it.k === 'strip') {
      for (let i = 0; i + 1 < it.pts.length; i++) {
        const a = it.pts[i], b = it.pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
        const ox = -dz / l * it.w / 2, oz = dx / l * it.w / 2;
        face([[a[0] + ox, a[1], a[2] + oz], [b[0] + ox, b[1], b[2] + oz], [b[0] - ox, b[1], b[2] - oz], [a[0] - ox, a[1], a[2] - oz]], it.col, [a[0], -1000, a[2]]);
      }
    }
  }
  const group = new THREE.Group();
  group.name = 'realScenery';
  const mk = (p, n, c, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.userData.backdrop = true;
    group.add(m); return m;
  };
  if (P.length) mk(P, N, C, new THREE.MeshLambertMaterial({ vertexColors: true }));
  if (LP.length) mk(LP, LN, LC, new THREE.MeshBasicMaterial({ vertexColors: true }));
  group.userData.stats = stats;
  group.userData.backdrop = true;
  return group;
}

// v1.306 (D.51 step 2, the range): Bunratty's ground, hoisted out of buildBunrattyCourtScene unchanged so the
// backyard range (buildBackyardRangeScene) stands on the same ground behind Michael's house.
// ===================================================================
// TERRAIN — v1.8: real z-varying ground (the deferred v1.7 feature).
// ===================================================================
// Lore-matched grade (see devlog): the lots are carved from woods on a bluff
// above the Chattahoochee. The NORTH tree-line is HIGH ground; the land falls
// away SOUTH toward the river. Layered on top is a gentler WEST→EAST grade so
// the cul-de-sac bulb (east) sits NESTLED LOW — "aggressive uphill to the
// bulb" from the player's westward attack, now physical instead of cosmetic.
//
// groundY(x,z) is THE single source of truth for ground height. The displaced
// ground mesh, player physics, BB bounces, enemy feet, and every placed object
// all read from it. Total relief ≈ 6m (dramatic) — real high/low advantage.
//
// Design constraints that keep it from breaking gameplay:
//   • C1-smooth everywhere (no vertical cliffs) so collision/movement never
//     traps the player or an AI on a wall of terrain.
//   • Max local slope is gentle enough (~25°) that the radius-based AABB
//     collision still reads correctly — objects sit ON the slope, not in it.
//   • The playable box is z∈[-32,30], x∈[-40,44]; we shape across that.
// v1.304 (D.51 step 2): the box grew south behind Michael's house (z to 47 for x 16.4..44), which bunrattyHeroCut cuts.
function bunrattyGroundY(x, z) {
  return bunrattyHeroCut(x, z, bunrattyRealScale(x, z, bunrattyBaseY(x, z) + bunrattyNorthBank(x, z)));   // v1.305: the north bank
}
function bunrattyBaseY(x, z) {
  // --- North→South fall: a secondary grade. North edge (z=-33) sits a little
  //     higher than the south lawn edge (z≈37). Kept modest so the dominant
  //     read is the WEST→EAST street grade below. ~2.5m. ---
  const zN = -33, zS = 37;
  let t = (z - zN) / (zS - zN);            // 0 at north, 1 at south edge
  t = Math.max(0, Math.min(1, t));
  const sFall = t * t * (3 - 2 * t);       // smoothstep
  let h = 2.5 * (1 - sFall);               // +2.5 at north, ~0 at south

  // --- WEST→EAST street grade: THE dominant grade (v1.28f). The map runs from
  //     the WEST lane entry (x≈-30..-35, where attackers push IN from) DOWN to
  //     the cul-de-sac bulb + plank fort at the EAST end (BULB.x≈34). So the
  //     WEST entry is the HIGH ground and the EAST fort sits LOW — anyone
  //     pushing the lane toward the fort comes downhill. Total street relief
  //     ≈ 9m: a flattish high bench at the west entry, then it falls away east
  //     into the basin. ---
  const xW = -36, xE = 40;
  let u = (x - xW) / (xE - xW);            // 0 at west entry (high), 1 at east bulb (low)
  u = Math.max(0, Math.min(1, u));
  const sLane = u * u * (3 - 2 * u);       // smoothstep: flat-ish high bench, then drop
  h += 9.0 * (1 - sLane);                  // +9 at west entry, ~0 by the east bulb

  // --- Bulb basin dimple: scoop the immediate cul-de-sac (BULB ≈ x=34, z=2) a
  //     touch lower so it genuinely sits in a hollow at the bottom of the hill —
  //     attackers cresting the lane look DOWN into the fort. ---
  const dBulb = Math.hypot(x - 34, z - 2);
  if (dBulb < 13) {
    const k = 1 - dBulb / 13;
    h -= 1.3 * (k * k * (3 - 2 * k));
  }

  // --- Gentle rolling micro-relief for natural, non-planar feel (small). ---
  h += 0.35 * Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11 - 0.6);

  return h;
}
// v1.304 (D.51 step 2, docs/refs/bunratty.md gaps 2-3 and the D.40 section): Michael's house is a walk-out. Behind it
// the ground is cut to the terrace, 3.2 m under the main floor (BRH.T), from the house's back wall (the step is under
// the house) to the stacked-stone wall; below the wall the lawn lies 1.1 m lower and falls 1.2 m more toward the woods,
// then the woods drop away. West of the house a side yard ramps down from the front lawn to the terrace (z 22-31), and
// west of that a stone wall holds the neighbour's yard (x 15.6-17.2), which keeps its old ground. The wall's step has
// two ways round it: a grass bank at the west end and stone steps at the east. Past the bounds the cut fades out (east)
// or meets the falling woods (south). Steps sit on the ground mesh's grid lines (1.5625 m) so walls hide them.
function bunrattyHeroCut(x, z, h) {
  if (z < 22 || x < 8 || x > 49) return h;
  const H = BR_HERO, T = BRH.T, cl = v => v < 0 ? 0 : v > 1 ? 1 : v, ss = v => { v = cl(v); return v * v * (3 - 2 * v); };
  const kR = cl((z - 22) / 9);                                                         // the side yard's ramp
  const k = x <= H.x0 ? kR : Math.max(kR, (z >= 25.6 ? 1 : 0) * ss((x - H.x0) / 4.7));  // the terrace, from under the house
  let cut = h + (T - h) * k;
  const kStep = z >= 36.7 ? 1 : 0, kBank = ss((z - 35) / 3.6), kSteps = cl((z - 35.6) / 2.8);
  let kl;
  if (x < H.bankX1) kl = kBank;
  else if (x < H.bankX1 + 1) kl = kBank + (kStep - kBank) * ss(x - H.bankX1);
  else if (x > H.stepX0 && x < H.stepX1) kl = kSteps;
  else kl = kStep;
  cut -= kl * 1.1 + 1.2 * cl((z - 37.5) / 9.5);                                       // the wall's drop, then the lawn's fall
  if (z > H.lawnZ1) cut -= 0.55 * (z - H.lawnZ1);                                     // past the lawn the woods drop away
  cut = Math.max(cut, -21.5);
  let m;
  if (x >= H.cutX && x <= 44) m = 1;
  else if (x > 44) m = 1 - ss((x - 44) / 5);
  else m = ss((x - 8) / (H.cutX - 8)) * ss((z - H.lawnZ1) / 4);
  return h + m * (Math.min(h, cut) - h);
}
// v1.303 (D.51 step 1, Michael: real scale; each match fenced to a today-sized part, 1A): past the fenced play box
// the ground is the real place's. Every term below is exactly zero inside the box (x -40..44, z -32..30) and its tree
// walls, so the matches play on the ground they always had. West of the entry the street climbs on to the fork with
// Sentinae Chase (4.2 m more, so the fork stands 14.5 m over the bulb); south and south-east the lots end at a bluff
// and the woods fall 22-24 m at up to ~31° to the floodplain, then a 3 m clay cut to the river, ~190 m from the bulb
// across its line (docs/refs/bunratty.md: 200-210 m SSE of the end); the far bank climbs 52 m. East of the bulb the
// creek's ravine runs down to the river ~90 m out. s is the distance from the bulb toward the river, q along it.
function bunrattyRealScale(x, z, h) {
  const dx = x - BR_REAL.bx, dz = z - BR_REAL.bz;
  const s = BR_REAL.nx * dx + BR_REAL.nz * dz, q = BR_REAL.nz * dx - BR_REAL.nx * dz;
  const ss = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  if (x < -42) h += 4.2 * ss((-42 - x) / 120);                               // the street climbs to the fork
  const sb = q > -80 ? 34 + 0.37 * Math.min(0, q) : 4.4 + 0.12 * (q + 80);    // the bluff line, kept 3-7 m off the box
  const f = ss((s - sb) / 55);
  if (f > 0) {
    const flood = -24 + 2 * ss((150 - s) / 120);                               // the floodplain, -22 up the slope's foot
    h += (flood - h) * f;
  }
  if (s > 222) h = Math.max(h, -24 + 52 * ss((s - 226) / 75));                 // the far bank
  const bed = -12 - 13 * ss((s + 40) / 200);                                   // the creek, falling to the river
  h = Math.min(h, bed + 0.38 * Math.abs(q - 92));
  h = Math.min(h, BR_REAL.bedY + 1.3 * Math.max(0, Math.abs(s - BR_REAL.s) - 31));   // the river's channel and clay cut
  return h;
}
// The mown field on the floodplain below (the Hollow's, seen from up here): 0 outside it, 1 in it, soft at the edges.
function bunrattyFieldK(x, z) {
  const dx = x - BR_REAL.bx, dz = z - BR_REAL.bz;
  const s = BR_REAL.nx * dx + BR_REAL.nz * dz, q = BR_REAL.nz * dx - BR_REAL.nx * dz;
  const e = Math.min(s - 112, 152 - s, q + 75, -10 - q);
  return Math.max(0, Math.min(1, e / 6));
}
// v1.304: how far (x, z) is outside the bounds' southern extension behind Michael's house (negative inside it)
const brHeroOut = (x, z) => Math.max(BR_HERO.cutX - x, x - 44, 22 - z, z - BR_HERO.lawnZ1);
// v1.304: the hero house's levels, from the old ground at the foot of its front steps: the main floor 0.9 m up (six
// steps), the terrace a storey (3.2 m) under it, the garage floor at the motor court's highest point by its doors.
const BRH = (() => {
  const F = bunrattyBaseY(28.5, 11.9) + 0.9;
  let G = -Infinity; for (let x = BR_HERO.x1; x <= BR_HERO.gx1; x += 0.5) G = Math.max(G, bunrattyBaseY(x, BR_HERO.gz0 - 0.3));
  return { F, T: F - 3.2, G: G + 0.04 };
})();

function buildBunrattyCourtScene(variant, timeOfDay) {
  const scene = new THREE.Scene();

  // === Lighting / sky (v1.35: day or night) ===
  // v1.35e: Bunratty's day sky/fog were a hazy greenish set (0x8aa898 etc.) that
  // read as "swampy". Switched to Winnmark's CLEAR BLUE daytime palette + looser
  // fog so the sky is crisp. (The map keeps its own warm sun angle, terrain, and
  // stucco/brick house palette, so it still feels distinct — just under a clean
  // sky instead of green haze.) Night still shares the common moonlit treatment.
  const _night = (timeOfDay === 'night');
  const { sun } = applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x88a8c8, dayFog: [45, 400],   // v1.303 (D.51 step 1): out from [35, 82], so the street, the river and the far bank show
    sunColor: 0xfff0c8, sunInt: 1.0, sunPos: [-18, 30, 14],
    dayAmbColor: 0xb8c8d8, dayAmbInt: 0.5, dayHemiColor: 0xc8d8ff, dayHemiInt: 0.42,
    nightFog: [20, 66], moonPos: [-20, 38, -16],
    shadow: { size: 2048, extent: 44, far: 84 },
  });

  const rng = (min, max) => min + gameRandom() * (max - min);

  // Expose to the generic systems via the returned scene object (below).
  const groundY = bunrattyGroundY;

  // --- Terrain placement helpers (v1.8) ---
  // Most asset builders return an AABB obstacle { minX,maxX,minZ,maxZ,h,mesh,... }
  // built assuming a flat y=0 base. To sit them on the slope we (a) lift the
  // backing mesh group to local ground height, and (b) tag the obstacle with
  // `baseY` so collision/BB code knows the obstacle's vertical span is
  // [baseY, baseY+h] rather than [0, h]. Returns the obstacle for chaining.
  function sinkObs(obs, gx, gz) {
    if (!obs) return obs;
    const cx = (gx != null) ? gx : (obs.minX + obs.maxX) / 2;
    const cz = (gz != null) ? gz : (obs.minZ + obs.maxZ) / 2;
    // v1.24a: sink to the LOWEST ground height across the footprint (not the
    // center) so on a slope the asset's base buries into the uphill side rather
    // than floating off the downhill side. Small footprints → negligible; wide
    // ones (cars) stop visibly hovering. Tag baseY at the same low value so the
    // collision/BB vertical span starts at the buried base.
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
  // For obstacle lists (e.g. multi-wall forts) sharing one footprint.
  function sinkObsList(list, gx, gz) {
    for (const o of list) sinkObs(o, gx, gz);
    return list;
  }

  // --- Slope orientation (v1.24a) ---
  // Terrain surface normal at (x,z) from finite differences of groundY. Used to
  // TILT flat decals (road/driveway pads) so they lie ON the slope instead of
  // staying horizontal — a horizontal pad only touches the hill at its center
  // and vanishes edge-on. Returns {nx,ny,nz} unit-ish normal.
  function groundNormal(x, z) {
    const e = 0.75;
    const dx = (groundY(x + e, z) - groundY(x - e, z)) / (2 * e);
    const dz = (groundY(x, z + e) - groundY(x, z - e)) / (2 * e);
    // Surface normal of height field y=f(x,z) is (-df/dx, 1, -df/dz), normalized.
    const len = Math.hypot(-dx, 1, -dz) || 1;
    return { nx: -dx / len, ny: 1 / len, nz: -dz / len };
  }
  // Lay a flat decal mesh ON the slope. PlaneGeometry/CircleGeometry faces +Z
  // in local space, so we rotate local +Z onto the terrain normal via a
  // quaternion (exact for any slope, no euler-order pitfalls). The mesh should
  // NOT have a pre-applied rotation.x — layOnSlope sets full orientation.
  const _UP_Z = new THREE.Vector3(0, 0, 1);
  function layOnSlope(mesh, x, z, lift = 0.02) {
    const n = groundNormal(x, z);
    mesh.position.set(x, groundY(x, z) + lift, z);
    mesh.quaternion.setFromUnitVectors(_UP_Z, new THREE.Vector3(n.nx, n.ny, n.nz));
    return mesh;
  }

  // === Ground — grass, DISPLACED plane (vertices raised to groundY) ===
  // Subdivided so the slope is smooth. PlaneGeometry is built in its own XY
  // plane (then rotated -90° about X to lie flat → its local Y maps to world
  // -Z). We displace each vertex's local-Z (becomes world +Y) by groundY at
  // that world (x,z). 96×96 segments over 150m ≈ 1.5m grid — plenty smooth.
  // v1.303 (D.51 step 1): the ground runs on past the box to the river and up the far bank (x -250..350, z -150..350).
  // Inside 150 x 150 m the grid is the old one vertex for vertex (1.5625 m); past it the cells grow to 6 m. A colour per
  // vertex (times the old grass) browns the woods' floor past the tree walls, reds the river's clay cut and lightens the
  // mown field on the floodplain, so the lawns in play keep their colour exactly.
  const groundGeo = new THREE.BufferGeometry();
  {
    const axis = (lo, hi) => {
      const v = [];
      for (let c = lo; c < -75 - 1e-6; c += 6) v.push(c);
      for (let i = 0; i <= 96; i++) v.push(-75 + 150 * i / 96);
      for (let c = 75 + 6; c < hi - 1e-6; c += 6) v.push(c);
      v.push(hi); return v;
    };
    const xs = axis(-250, 350), zs = axis(-150, 350);
    const pos = [], col = [], idx = [];
    const B0 = { minX: -40, maxX: 44, minZ: -32, maxZ: 30 };
    const mix = (a, b, t) => a + (b - a) * t;
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) {
      const x = xs[i], z = zs[j], y = bunrattyGroundY(x, z);
      pos.push(x, y, z);
      // multipliers on 0x567a3c: leaf litter 0x5a5232, red clay 0x8a5a3a, the mown field 0x6e8a44
      const out = Math.min(Math.max(B0.minX - x, x - B0.maxX, B0.minZ - z, z - B0.maxZ), brHeroOut(x, z));   // v1.304: and the hero's lawn
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
    new THREE.MeshStandardMaterial({ color: 0x567a3c, roughness: 1.0, vertexColors: true })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // === The river (v1.303, D.51 step 1) ===
  // It used to be a plane at y -1.6 under 5-9 m of grass (docs/refs/bunratty.md gap 7), with 16 far-bank trees buried
  // to their crowns. Now it lies at its real distance, in the channel bunrattyRealScale cuts: murky green-brown water
  // (docs/refs/chattahoochee.md), clipped to the ground so the edge skirt never flattens round it. The woods, the field
  // and the far bank are bunrattyScenery's, below. The 80 numbers the far-bank trees drew (four each, and one for the
  // leaf colour) are still drawn, so every match's cover lands where it always has.
  for (let i = 0; i < 80; i++) rng(0, 1);
  {
    const R0 = BR_REAL, cx = R0.bx + R0.nx * R0.s, cz = R0.bz + R0.nz * R0.s;
    // where the river's middle crosses the ground's west (x -250) and east (x 350) edges
    const qW = (-250 - cx) / R0.nz, qE = (350 - cx) / R0.nz, len = qE - qW, qm = (qW + qE) / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(len, R0.half * 2 + 6),
      new THREE.MeshStandardMaterial({ color: 0x5f6a4c, roughness: 0.32, metalness: 0.18 })
    );
    water.rotation.order = 'YXZ';
    water.rotation.y = Math.atan2(R0.nx, R0.nz);   // the plane's width (local x) along the river
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx + R0.nz * qm, R0.waterY, cz - R0.nx * qm);
    water.receiveShadow = true;
    water.name = 'bunrattyRiver';
    scene.add(water);
  }

  // === Stacked-stone retaining wall — behind MICHAEL'S ONLY (the hero house) ===
  // From the reference photos (image 7): a stacked-stone wall with square
  // pillars sits along the south edge of the hero house's backyard, holding the lawn
  // above the river drop. It is NOT a map-spanning wall — it's specific to
  // this one property. (The rest of the south edge is handled by the tree
  // wall + river blocker.) Gets an AABB so it reads as solid cover.
  // (Hero house index 6 is centered x≈33, width 11 → backyard span ≈ x[26,40].)
  // v1.304 (D.51 step 2): the wall now holds the terrace over the lawn, in buildBunrattyHeroHouse (with its steps), in
  // stacked stone of the pictures' colour (0x5c4b37) rather than today's light grey, 6.5 m further south.
  const retWall = [];

  // === Road — a long wiggling lane from the WEST entry to an EAST bulb ===
  // The satellite shows the lane branching off Sentinae Chase at the west and
  // S-curving east through the trees to the bulb. We approximate the centerline
  // as a CUBIC bezier (two control points) to get the double bend, then lay
  // overlapping circle pavement decals like Winnmark.
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x383838, roughness: 0.95,
    side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  // Cubic bezier control points (entry west → bulb east):
  const RA = { x: -38, z: 0 };   // west entry (off Sentinae Chase)
  const RC1 = { x: -14, z: -10 }; // pulls north
  const RC2 = { x: 14, z: 12 };   // pulls south (the wiggle)
  const RB = { x: 34, z: 2 };    // bulb center (east)
  function roadPoint(t) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*RA.x + 3*mt*mt*t*RC1.x + 3*mt*t*t*RC2.x + t*t*t*RB.x,
      z: mt*mt*mt*RA.z + 3*mt*mt*t*RC1.z + 3*mt*t*t*RC2.z + t*t*t*RB.z,
    };
  }
  const roadCenterline = [];
  for (let i = 0; i <= 36; i++) roadCenterline.push(roadPoint(i / 36));
  // v1.127 (backlog D.3 step 4): the 73 overlapping asphalt discs down the lane and the 19 tiling the bulb (v1.24a) are
  // gone; buildStreetRoad lays Winnmark's ribbon, bulb, gutter and rolled kerb along the S-curve instead (built below,
  // once houseCenters exists for the driveway drops). roadCenterline is unchanged, so placements and the AI are too.
  const roadDeriv = (t) => {
    const mt = 1 - t;
    return {
      x: 3*mt*mt*(RC1.x - RA.x) + 6*mt*t*(RC2.x - RC1.x) + 3*t*t*(RB.x - RC2.x),
      z: 3*mt*mt*(RC1.z - RA.z) + 6*mt*t*(RC2.z - RC1.z) + 3*t*t*(RB.z - RC2.z),
    };
  };
  const BULB = { x: 34, z: 2, r: 6.5 };

  // === Houses — 7, irregular placement (not tidy rows) ===
  // French-eclectic stucco+stone palette: cream/tan stucco bodies, warm brown
  // hip roofs, light trim. Faces toward the lane. House index 6 is the hero
  // (Michael's) ringing the bulb — the showpiece for a future marquee
  // scenario. Downhill (south, river-side) houses get walk-out lower-level
  // visual treatment below.
  const houseObs = [];
  // Each entry: x, z, w, d, faceDir, side ('north'|'south'), hero?
  const houseDefs = [
    // North of lane (faces south toward road). Staggered, angled-feeling.
    { x: -28, z: -16, w: 9, d: 7, faceDir: 'south', side: 'north' },
    { x: -6,  z: -18, w: 8, d: 7, faceDir: 'south', side: 'north' },
    { x: 16,  z: -16, w: 9, d: 7, faceDir: 'south', side: 'north' },
    // South of lane (faces north toward road) — river/downhill side.
    { x: -30, z: 16,  w: 8, d: 7, faceDir: 'north', side: 'south' },
    { x: -8,  z: 18,  w: 9, d: 7, faceDir: 'north', side: 'south' },
    { x: 12,  z: 17,  w: 8, d: 7, faceDir: 'north', side: 'south' },
    // Hero house (Michael's) ringing the bulb's south side, faces the bulb.
    { x: 33,  z: 17,  w: 11, d: 8, faceDir: 'north', side: 'south', hero: true },
  ];
  const houseCenters = [];
  // v1.304 (D.51 step 2): the hero's entry stands for Michael's house, built by buildBunrattyHeroHouse below; its centre
  // here is its drive's (the motor court's), so the bulb's kerb drops there. HERO_OLD is the old colonial's footprint,
  // which the scatter trees still steer round so every number they draw is drawn as before.
  const HERO_OLD = { minX: 27.5, maxX: 38.5, minZ: 13, maxZ: 21 };
  let heroHouse = null;
  // v1.305 (D.51 step 2): the other six are the street's real houses (BR_NEIGHBOURS), on the same lots with the same
  // front lines; OLD_FOOT keeps the colonials' footprints, which the scatter trees still steer round (the same numbers).
  const neighbours = buildBunrattyNeighbours(scene, { groundY, night: _night });
  const OLD_FOOT = houseDefs.filter(hd => !hd.hero).map(hd => ({ minX: hd.x - hd.w / 2, maxX: hd.x + hd.w / 2, minZ: hd.z - hd.d / 2, maxZ: hd.z + hd.d / 2 }));
  const NEIGH_RECTS = neighbours.houses.flatMap(hh => hh.plan.rects);
  for (let i = 0; i < houseDefs.length; i++) {
    const hd = houseDefs[i];
    if (!hd.hero) {
      const hh = neighbours.houses[i];
      houseObs.push(...hh.obstacles);
      houseCenters.push({ x: hd.x, z: hd.z, side: hd.side, hero: false, dx: hh.plan.driveX, plan: hh.plan });
      continue;
    }
    heroHouse = buildBunrattyHeroHouse(scene, { groundY, F: BRH.F, T: BRH.T, G: BRH.G, night: _night });
    houseObs.push(...heroHouse.obstacles);
    houseCenters.push({ x: 39, z: 19, side: 'south', hero: true });
  }

  // v1.127: the road, the bulb and the kerbs (Winnmark's builder; the hero house's drive drops the bulb's kerb)
  // v1.303 (D.51 step 1): past the entry the road runs on 120 m, up 4.2 m and bending west, to the fork with Sentinae
  // Chase (210 m in all, as the real court). The lane's own samples stay where they were: the extension is laid on
  // t < -0.06 at the same step in t, so buildStreetRoad's points from the entry to the bulb are the old ones.
  const RX_K = 120;
  const bunrattyRoad = (() => {
    let tEnd = 1; for (let t = 0.8; t <= 1; t += 0.002) if (Math.hypot(roadPoint(t).x - BULB.x, roadPoint(t).z - BULB.z) < 5) { tEnd = t; break; }
    const dt = (tEnd + 0.06) / 190, T0 = -0.06 - RX_K * dt;
    const E0 = roadPoint(-0.06), d0 = roadDeriv(-0.06), l0 = Math.hypot(d0.x, d0.z);
    const E1 = { x: E0.x - d0.x / l0 * 35, z: E0.z - d0.z / l0 * 35 }, E2 = { x: -125, z: 22 }, E3 = { x: -160, z: 18 };
    const ext = u => { const m = 1 - u; return {
      x: m*m*m*E0.x + 3*m*m*u*E1.x + 3*m*u*u*E2.x + u*u*u*E3.x, z: m*m*m*E0.z + 3*m*m*u*E1.z + 3*m*u*u*E2.z + u*u*u*E3.z }; };
    const u = t => (-0.06 - t) / (-0.06 - T0);
    const point = t => t >= -0.06 ? roadPoint(t) : ext(u(t));
    const deriv = t => { if (t >= -0.06) return roadDeriv(t); const a = ext(Math.max(0, u(t) - 0.002)), b = ext(Math.min(1, u(t) + 0.002)); return { x: a.x - b.x, z: a.z - b.z }; };
    return { point, deriv, T0, fork: E3, ext };
  })();
  buildStreetRoad(scene, {
    point: bunrattyRoad.point, deriv: bunrattyRoad.deriv, groundY, groundNormal, asphMat: roadMat, houseCenters,
    ASPH: 3.45, bulb: { x: BULB.x, z: BULB.z, r: BULB.r }, T0: bunrattyRoad.T0, NS: 190 + RX_K,
    manholes: [[0.18, 0.7], [0.62, -0.8]], drains: [[0.3, -1], [0.55, 1], [0.83, -1]],
    cracks: [[0.09, 5.2, 0.4], [0.42, 6.0, -0.3], [0.74, 5.0, 0.25]], patch: 0.5,
  });

  // === Driveways — pale concrete pad from lane to each house front ===
  const drivewayMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.95 });
  for (const hc of houseCenters) {
    if (hc.hero) continue;   // v1.304: Michael's drive is the motor court
    // Find the nearest road centerline z at this house's x (the lane wiggles).
    const dxv = hc.dx;   // v1.305: to the garage wing's apron, or the door
    let nearestZ = 0, best = Infinity;
    for (const p of roadCenterline) {
      const d = Math.abs(p.x - dxv);
      if (d < best) { best = d; nearestZ = p.z; }
    }
    const houseFront = hc.side === 'north' ? hc.z + 3.5 : hc.z - 3.5;
    const minZ = Math.min(houseFront, nearestZ);
    const maxZ = Math.max(houseFront, nearestZ);
    // v1.24a: overlapping slope-ALIGNED pads (tilted onto the terrain normal) so
    // the driveway lies flat against the grade rather than clipping / vanishing
    // edge-on. Square-ish pads with 50% overlap guarantee a continuous ribbon.
    const span = Math.max(0.5, Math.abs(maxZ - minZ));
    const step = 1.2;
    const nPad = Math.max(2, Math.ceil(span / step) + 1);
    for (let p = 0; p < nPad; p++) {
      const pz = minZ + span * (p / (nPad - 1));
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.0), drivewayMat);
      layOnSlope(pad, dxv, pz, 0.025);
      pad.receiveShadow = true;
      scene.add(pad);
    }
  }

  // === Backyard fences — black wrought-iron, between adjacent backyards ===
  // (Identical style to Winnmark's `fence` helper.)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.5, metalness: 0.55 });
  function fence(x1, z1, x2, z2, h = 1.4) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dz, dx);
    const group = new THREE.Group();
    group.position.set((x1+x2)/2, 0, (z1+z2)/2);
    group.rotation.y = -angle;
    // World position of a point at local-X `lx` along the fence line.
    const ux = dx / (len || 1), uz = dz / (len || 1);
    const cx = (x1+x2)/2, cz = (z1+z2)/2;
    const gAt = (lx) => groundY(cx + ux * lx, cz + uz * lx);
    const pSpacing = 0.18;
    const nPickets = Math.max(2, Math.floor(len / pSpacing));
    const actualSpacing = len / nPickets;
    // v1.8: rails + pickets follow the slope. Rails are built as short per-gap
    // segments connecting consecutive picket ground heights so the line steps
    // down the grade instead of floating.
    for (let i = 0; i <= nPickets; i++) {
      const px = -len/2 + i * actualSpacing;
      const gy = gAt(px);
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, 0.025), fenceMat);
      picket.position.set(px, gy + h/2, 0); picket.castShadow = true; group.add(picket);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), fenceMat);
      spike.position.set(px, gy + h + 0.04, 0); spike.rotation.y = Math.PI / 4; group.add(spike);
      // Rail segment from this picket to the next (top + bottom rails).
      if (i < nPickets) {
        const px2 = px + actualSpacing, gy2 = gAt(px2);
        const segLen = Math.hypot(actualSpacing, gy2 - gy);
        const midX = (px + px2) / 2, tilt = Math.atan2(gy2 - gy, actualSpacing);
        for (const ry of [h - 0.12, 0.12]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.06, 0.04), fenceMat);
          rail.position.set(midX, (gy + gy2) / 2 + ry, 0);
          rail.rotation.z = tilt; rail.castShadow = true; group.add(rail);
        }
      }
    }
    function endPost(localX) {
      const gy = gAt(localX);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, h + 0.1, 0.09), fenceMat);
      post.position.set(localX, gy + (h + 0.1) / 2, 0); post.castShadow = true; group.add(post);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 4), fenceMat);
      cap.position.set(localX, gy + h + 0.15, 0); cap.rotation.y = Math.PI / 4; group.add(cap);
    }
    endPost(-len/2); endPost(len/2);
    scene.add(group);
    // AABB base sits at the lower endpoint; height spans up to cover the grade.
    const baseY = Math.min(gAt(-len/2), gAt(len/2));
    const topY = Math.max(gAt(-len/2), gAt(len/2)) + h;
    return {
      minX: Math.min(x1, x2) - 0.1, maxX: Math.max(x1, x2) + 0.1,
      minZ: Math.min(z1, z2) - 0.1, maxZ: Math.max(z1, z2) + 0.1,
      h: topY - baseY, baseY, surface: 'metal', bbPass: true,  // v1.33: BBs fly through the picket gaps; still blocks bodies
    };
  }
  const fences = [];
  // North side — fences between adjacent north-house backyards (yards run to z≈-30).
  fences.push(fence(-17, -20, -17, -29)); // between house0 (-28) and house1 (-6)
  fences.push(fence(5,   -22, 5,   -29)); // between house1 (-6) and house2 (16)
  // South side — yards run toward the retaining wall (z≈28). Keep clear of the wall.
  fences.push(fence(-19, 20, -19, 27));   // between house3 (-30) and house4 (-8)
  fences.push(fence(2,   21, 2,   27));   // between house4 (-8) and house5 (12)

  // === Tree wall — DENSE forest enclosure (Bunratty is deep woods) ===
  const treeObs = [];
  const bushObs = [];
  function treeWall(x1, z1, x2, z2, opts = {}) {
    const spacing = opts.spacing ?? 2.7;
    const rowGap  = opts.rowGap  ?? 2.4;
    const skipFn  = opts.skip;
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const px = -uz, pz = ux;
    const n = Math.max(1, Math.floor(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bx = x1 + dx * t, bz = z1 + dz * t;
      if (!skipFn || !skipFn(bx, bz)) {
        const tx = bx + rng(-0.5, 0.5), tz = bz + rng(-0.5, 0.5);
        treeObs.push(addSuburbanTree(scene, tx, tz,
          { leafR: rng(2.0, 2.8), trunkH: rng(3.4, 5.0), baseY: groundY(tx, tz), detail: true }));   // v1.125
      }
      const sx = bx + ux * (spacing / 2) + px * (opts.outwardSign ?? 1) * rowGap;
      const sz = bz + uz * (spacing / 2) + pz * (opts.outwardSign ?? 1) * rowGap;
      if (!skipFn || !skipFn(sx, sz)) {
        const jx = sx + rng(-0.5, 0.5), jz = sz + rng(-0.5, 0.5);
        treeObs.push(addSuburbanTree(scene, jx, jz,
          { leafR: rng(2.0, 2.8), trunkH: rng(3.4, 5.0), baseY: groundY(jx, jz), detail: true }));   // v1.125
      }
    }
  }
  // North wall (behind north backyards, z≈-32).
  treeWall(-40, -32, 42, -32, { outwardSign: -1, spacing: 2.7 });
  // South wall (along/behind the retaining wall, z≈32) — but leave a RIVER-GLIMPSE
  // gap in the middle so the player can see the water dropping away beyond the
  // stone wall. The wall + a blocker keep the player in regardless.
  treeWall(-40, 33, 42, 33, {
    outwardSign: 1, spacing: 2.7,
    skip: (x, z) => (x > -10 && x < 14), // river-view gap in the middle-south
  });
  // West wall — closes the entry side EXCEPT the road gap at z∈[-5,5].
  treeWall(-40, -32, -40, 33, {
    outwardSign: -1, spacing: 2.7,
    skip: (x, z) => Math.abs(z) < 5, // west road entry gap
  });
  // East wall — closes behind the bulb (x≈44).
  treeWall(44, -32, 44, 33, { outwardSign: 1, spacing: 2.7 });

  const scatterAvoid = [...OLD_FOOT, HERO_OLD];   // v1.305: the old footprints, so the numbers drawn are the same
  // Extra inner forest scatter — Bunratty's lots are carved out of woods, so
  // sprinkle standalone trees between houses + in the deep yards for texture
  // and natural cover/sightline breaks.
  for (let k = 0; k < 26; k++) {
    const x = rng(-36, 40), z = rng(-30, 28);
    // Keep clear of the road spine, driveways, and house footprints.
    let nearRoad = false;
    for (const p of roadCenterline) { if (Math.hypot(p.x - x, p.z - z) < 5.5) { nearRoad = true; break; } }
    if (nearRoad) continue;
    if (Math.hypot(BULB.x - x, BULB.z - z) < BULB.r + 3) continue;
    let inHouse = false;
    for (const h of scatterAvoid) {   // v1.304: the old hero footprint, so the numbers drawn are the same
      if (x > h.minX - 2 && x < h.maxX + 2 && z > h.minZ - 2 && z < h.maxZ + 2) { inHouse = true; break; }
    }
    if (inHouse) continue;
    // v1.218 fix-up: a scatter tree on a backyard fence line made a fence-and-trunk corner a kid wedges in (v1.216's
    // meshes shifted the seed and put one at (5.0, -28.5), on the fence at x 5: Nick stood there for 30 s in
    // tests/fence-bound.test.mjs). A trunk within 1.2 m of a fence's line is moved to 1.2 m off it, on its own side.
    // Only the position moves: the same rng calls are made, so nothing placed after it changes.
    let x2 = x, z2 = z;
    for (const f of fences) {
      const thinX = (f.maxX - f.minX) < (f.maxZ - f.minZ);
      if (thinX && z2 > f.minZ - 1.2 && z2 < f.maxZ + 1.2) {
        const cx = (f.minX + f.maxX) / 2; if (Math.abs(x2 - cx) < 1.2) x2 = cx + (x2 < cx ? -1.2 : 1.2);
      } else if (!thinX && x2 > f.minX - 1.2 && x2 < f.maxX + 1.2) {
        const cz = (f.minZ + f.maxZ) / 2; if (Math.abs(z2 - cz) < 1.2) z2 = cz + (z2 < cz ? -1.2 : 1.2);
      }
    }
    treeObs.push(addSuburbanTree(scene, x2, z2, { leafR: rng(1.4, 2.2), trunkH: rng(2.8, 4.0), baseY: groundY(x2, z2), detail: true }));   // v1.125
  }

  // v1.304 (D.51 step 2): the trees of the old tree walls and the scatter that stood where Michael's house, its motor
  // court, terraces and lawn now are, are taken out again (after drawing their numbers, so nothing else moves). The
  // east wall's trees past the garage's back stay: they stand at the terrace's edge.
  for (let i = treeObs.length - 1; i >= 0; i--) {
    const t = treeObs[i], tx = (t.minX + t.maxX) / 2, tz = (t.minZ + t.maxZ) / 2;
    const inLot = tx > BR_HERO.sideX0 - 0.6 && tz > 8 && (tx < 43.2 || (tz < BR_HERO.z1 + 0.6 && tx < 45.2));
    // v1.305: and those on the street's new houses (their footprints and 0.8 m round them)
    const inHouse = NEIGH_RECTS.some(r => tx > r.minX - 0.8 && tx < r.maxX + 0.8 && tz > r.minZ - 0.8 && tz < r.maxZ + 0.8);
    if (!inLot && !inHouse) continue;
    if (t.mesh) { scene.remove(t.mesh); if (t.mesh.userData.crown) scene.remove(t.mesh.userData.crown); }
    treeObs.splice(i, 1);
  }

  // Front-yard ornamentals + foundation bushes (lots of plantings in the photos).
  for (const hc of houseCenters) {
    const towardRoad = hc.side === 'north' ? +1 : -1;
    const frontZ = hc.z + towardRoad * 4.0;
    // v1.304: Michael's two bushes flank his front steps, and his ornamental is the big oak on the front lawn's west end
    // v1.305: the street's houses' flank their doors, clear of the stoop (or the portico's floor)
    const bOff = hc.plan && (BR_NEIGHBOURS[houseCenters.indexOf(hc)].style === 'portico' ? 3.5 : 2.3);
    const [b1x, b1z, b2x, b2z] = hc.hero ? [25.7, 13.8, 31.4, 13.9]
      : [hc.plan.doorX - bOff, frontZ, hc.plan.doorX + bOff, frontZ];
    bushObs.push(addBush(scene, b1x, b1z, rng(1.0, 1.4), rng(0.6, 0.9), rng(0.9, 1.2), null, groundY(b1x, b1z), { detail: true }));   // v1.125
    bushObs.push(addBush(scene, b2x, b2z, rng(1.0, 1.4), rng(0.6, 0.9), rng(0.9, 1.2), null, groundY(b2x, b2z), { detail: true }));
    if (gameRandom() < 0.6) {
      const off = hc.side === 'north' ? +6 : -6;
      let ox = hc.x + rng(-4, 4), oz = hc.z + off + rng(-1, 1);
      if (hc.hero) { ox = 21.4; oz = 11.0; }
      treeObs.push(addSuburbanTree(scene, ox, oz,
        { leafR: rng(1.0, 1.5), trunkH: rng(2.2, 2.8), baseY: groundY(ox, oz), detail: true }));   // v1.125
    }
  }

  // === Mailboxes — one per house, at the road-side edge of its driveway ===
  // v1.35b: BRICK PILLAR mailboxes (the upscale Bunratty/Sentinel style), and a
  // robust placement that guarantees they sit on the GRASS just off the pavement
  // — never in the road. (The old version added a fixed ±1.0m to the centerline
  // Z, which ignored the ~3.6m road half-width and the lane's curve, dropping
  // boxes onto the asphalt.) Same method as Winnmark: find the nearest
  // centerline point, step outward toward the house (onto grass) by the road
  // half-width + a shoulder margin, then offset sideways to the driveway edge.
  const BR_ROAD_HALF = 3.6;       // Bunratty road ribbon radius
  const BR_SHOULDER = 1.1;        // sit this far onto the grass beyond the pavement
  for (const hc of houseCenters) {
    // nearest centerline sample to this house
    const hx = hc.dx ?? hc.x;   // v1.305: at the drive's end
    let best = roadCenterline[0], bestD = Infinity;
    for (const p of roadCenterline) {
      const d = (p.x - hx) ** 2 + (p.z - hc.z) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    // unit direction from the road point toward the house ("toward grass")
    let dirX = hx - best.x, dirZ = hc.z - best.z;
    const dl = Math.hypot(dirX, dirZ) || 1; dirX /= dl; dirZ /= dl;
    // base point: just off the pavement edge on the grass side
    const baseX = best.x + dirX * (BR_ROAD_HALF + BR_SHOULDER);
    const baseZ = best.z + dirZ * (BR_ROAD_HALF + BR_SHOULDER);
    // shift sideways (perpendicular) to the driveway's side edge (±2.2m)
    const perpX = -dirZ, perpZ = dirX;
    const sideSign = (gameRandom() < 0.5 ? -1 : 1);
    const mbX = baseX + perpX * 2.2 * sideSign;
    const mbZ = baseZ + perpZ * 2.2 * sideSign;
    // Face the box toward the road (front +Z points back along -dir, i.e. toward
    // the road point). atan2 of the road-ward direction.
    const facing = Math.atan2(-dirX, -dirZ);
    bushObs.push(sinkObs(addBrickMailbox(scene, mbX, mbZ, { facing }), mbX, mbZ));
  }

  // === Cover collections ===
  const coverList = [];
  const coverByHouse = [];
  const carColors = [0x6a8aa8, 0x8a4030, 0x2a3a4a, 0x4a4a4a, 0xc8b878, 0x3a5a3a, 0xa8a8a8];

  // Curbside trash bins (trash-day flavor; decoration+collision, NOT AI cover).
  const curbsideBins = [];
  for (const hc of houseCenters) {
    if (gameRandom() < 0.5) continue;
    let nearestZ = 0, best = Infinity;
    for (const p of roadCenterline) { const d = Math.abs(p.x - hc.x); if (d < best) { best = d; nearestZ = p.z; } }
    const towardRoad = hc.side === 'north' ? +1 : -1;
    const binZ = nearestZ + towardRoad * 1.5;
    const binBaseX = (hc.hero ? 33 : hc.dx) + (gameRandom() < 0.5 ? 1.6 : -1.6);   // v1.304: Michael's stand where they did
    const facing = hc.side === 'north' ? Math.PI : 0;
    const order = gameRandom() < 0.5 ? ['garbage', 'recycle'] : ['recycle', 'garbage'];
    curbsideBins.push(sinkObs(addCurbsideBin(scene, binBaseX - 0.4, binZ, { variant: order[0], facing, detail: true }), binBaseX - 0.4, binZ));
    curbsideBins.push(sinkObs(addCurbsideBin(scene, binBaseX + 0.4, binZ, { variant: order[1], facing, detail: true }), binBaseX + 0.4, binZ));
  }

  // Backyard cover — same mix as Winnmark (boxes / bins / plywood). AI uses these.
  for (let i = 0; i < houseCenters.length; i++) {
    const hc = houseCenters[i];
    const backwardZ = hc.side === 'north' ? -1 : +1;
    const yardCenterZ = hc.z + backwardZ * 9;   // shallower than Winnmark — woods crowd in
    coverByHouse[i] = [];
    const movedCover = [];   // v1.305
    const numCover = 3 + Math.floor(gameRandom() * 2);
    for (let j = 0; j < numCover; j++) {
      let cx = hc.x + rng(-5, 5);
      let cz = yardCenterZ + rng(-5, 5);
      // v1.304: Michael's yard junk goes where the fights were (docs/refs/bunratty.md): on the motor court in front of
      // the garage, on the terrace's east end by the steps, and on the lawn
      if (hc.hero) [cx, cz] = [[38.4, 12.6], [41.7, 29.2], [31.0, 41.6], [42.4, 10.4]][j];
      // v1.305: a piece that lands on the street's bigger house (or 0.9 m round it) goes out behind it
      else {
        // the yard's anchor (houseN_backyard, below) and the pieces this house has placed: a moved piece stands 2.2 m and
        // more off the anchor and 0.6 m off the others, stepping 2 m at a time along the wall; a later piece that lands
        // on a moved one steps aside the same way (two pressed together make one block a kid is pushed out of)
        const ax = hc.x + (i % 2 ? 1 : -1), az = hc.z + backwardZ * 9;
        const near = (x, z) => coverByHouse[i].some(o => x > o.minX - 1.4 && x < o.maxX + 1.4 && z > o.minZ - 1.1 && z < o.maxZ + 1.1);
        let moved = false;
        for (let pass = 0; pass < 2; pass++) for (const r of hc.plan.rects) if (cx > r.minX - 0.9 && cx < r.maxX + 0.9 && cz > r.minZ - 0.9 && cz < r.maxZ + 0.9) { cz = hc.plan.k < 0 ? r.minZ - 1.5 : r.maxZ + 1.5; moved = true; }
        if (moved) {
          const x0 = cx;
          for (const s of [0, 2, -2, 4, -4, 6, -6]) { cx = x0 + s; if (Math.hypot(cx - ax, cz - az) >= 2.2 && !near(cx, cz)) break; }
          movedCover.push([cx, cz]);
        } else for (let n = 0; n < 4 && movedCover.some(([mx, mz]) => Math.abs(cx - mx) < 2.2 && Math.abs(cz - mz) < 1.9); n++) cx += cx < ax ? -2 : 2;
      }
      const kind = gameRandom();
      let cobj;
      const cgy = groundY(cx, cz);
      if (kind < 0.4) {
        const w = rng(0.9, 1.3), h = rng(0.85, 1.1), d = rng(0.85, 1.1);
        cobj = addHomeDepotBox(scene, cx, cz, { w, h, d, facing: rng(-Math.PI, Math.PI), detail: true });   // v1.125
      } else if (kind < 0.75) {
        const variant = gameRandom() < 0.55 ? 'garbage' : 'recycle';
        const tipped = gameRandom() < 0.15;
        cobj = addCurbsideBin(scene, cx, cz, { variant, tipped, facing: rng(-Math.PI, Math.PI), detail: true });   // v1.125
      } else {
        // v1.125: Winnmark's plywood stack (sheets on sleepers, a lawn chair on top), was one slab and a flat box
        const stack = buildPlyStack(cx, cgy, cz, Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1);
        scene.add(stack);
        cobj = { minX: cx - 0.8, maxX: cx + 0.8, minZ: cz - 0.45, maxZ: cz + 0.45, h: 0.55, mesh: stack, surface: 'hard', baseY: cgy };
      }
      // Box/bin variants are group-based → sink via helper (plywood already placed).
      if (kind < 0.75) sinkObs(cobj, cx, cz);
      coverList.push(cobj);
      coverByHouse[i].push(cobj);
    }
  }

  // A round backyard TRAMPOLINE in the hero house's backyard (replaces the old play-fort).
  // Low cylindrical frame + dark jump mat + a ring of safety-net poles. Sits on
  // the upper lawn of the hero house's tiered backyard. Decorative + light collision on the
  // frame ring; counts as cover (you can crouch behind the frame/pads).
  {
    const tx = 26.5, tz = 42.4; // v1.304: on the lawn below the terrace wall (Michael: a trampoline, no playset)
    const { group: tramGroup, obs: tramObs } = buildBackyardTrampoline(tx, tz, rng(-0.3, 0.3));   // v1.306: shared with the range
    scene.add(tramGroup);
    sinkObs(tramObs, tx, tz);  // v1.8: sit on the hero house's sloped backyard
    coverList.push(tramObs);
    coverByHouse[6] = coverByHouse[6] || [];
    coverByHouse[6].push(tramObs);
    var trampolineObs = tramObs;
  }

  // === Cul-de-sac bulb cover (always built — general-purpose battlefield cover) ===
  // Two parked cars + a plank fort make the EAST bulb the natural focal point.
  {
    const carObs = sinkObs(addCar(scene, BULB.x + 1, BULB.z - 3.5, { orientation: 0, color: 0x6a8aa8, groundNormalFn: groundNormal, detail: true }), BULB.x + 1, BULB.z - 3.5);
    pushCarObs(coverList, carObs);
    const carObs2 = sinkObs(addCar(scene, BULB.x + 3.5, BULB.z + 3, { orientation: 0.2, color: 0x8a4030, groundNormalFn: groundNormal, detail: true }), BULB.x + 3.5, BULB.z + 3);
    pushCarObs(coverList, carObs2);
    // v1.23: U-shaped plywood kid-fort. Attackers push up the lane from the
    // WEST (entry x=-38), so the fort sits on the WEST side of the bulb with its
    // solid back wall facing WEST toward the incoming push. (Was a thin plank at
    // BULB.x+5 — EAST of the bulb, i.e. behind the defenders, facing away.)
    const fortX = BULB.x - 4, fortZ = BULB.z;
    const fortWalls = buildKidFort(scene, fortX, fortZ, { faceDir: 'W', width: 3.6, depth: 2.2, detail: true });  // v1.76: taller walls + corner bins; v1.125: the built-up fort
    // v1.8: the three walls share ONE group mesh — lift it once, tag baseY on each.
    // v1.76: the corner bins each have their OWN mesh group, so lift those
    // individually (the shared-group lift below only moves the walls).
    const fortGY = groundY(fortX, fortZ);
    if (fortWalls[0]?.mesh) fortWalls[0].mesh.position.y += fortGY;
    const _seenFortMesh = new Set([fortWalls[0]?.mesh]);
    for (const w of fortWalls) {
      if (w._fortBin && w.mesh && w.mesh.position && !_seenFortMesh.has(w.mesh)) {
        w.mesh.position.y += fortGY;
        _seenFortMesh.add(w.mesh);
      }
      w.baseY = fortGY; coverList.push(w);
    }
    var bulbCar1Obs = carObs;
    var bulbCar2Obs = carObs2;
    var bulbPlankObs = fortWalls[0]; // back wall is the primary cover ref
    // v1.272 (Found in play, Michael: A): Protect Ryan only. The street climbs about 7 m to the west end, so Sean fired
    // downhill from 30–41 m over the 1.12 m back wall and tagged Priya, sometimes inside 8 s. A stacked-plank barricade
    // 1.5 m tall stands just in front of her inside the fort, between the corner bins, and is the cover she holds (closer to
    // her than the back wall, so the line over it to her head, not only her chest, is shut too).
    if (variant === 'vip') {
      const bx0 = fortX - 0.4, bx1 = fortX + 0.05, bz0 = fortZ - 1.05, bz1 = fortZ + 1.05, bh = 1.6;   // v1.305: 1.6 m (was 1.5): the north lawns' bank (1.4 m) lifts a shooter on houses 1 and 2's lawns into a line over 1.5 m to her head
      const bg = new THREE.Group();
      const boardMats = [new THREE.MeshStandardMaterial({ color: 0xb8925a, roughness: 0.92 }), new THREE.MeshStandardMaterial({ color: 0xa47e4a, roughness: 0.92 })];
      for (let i = 0; i < 6; i++) {   // six boards, each a little off true, as kids stack them (v1.305: five, under 1.5 m)
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 2.1 - (i % 2) * 0.12), boardMats[i % 2]);
        b.position.set((bx0 + bx1) / 2 + (i % 2 ? 0.06 : -0.06), 0.14 + i * 0.265, (bz0 + bz1) / 2 + (i % 2 ? 0.05 : -0.04));
        b.rotation.y = (i % 2 ? 0.02 : -0.015); b.castShadow = b.receiveShadow = true; bg.add(b);
      }
      const postMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 });
      for (const pz of [bz0 + 0.12, bz1 - 0.12]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, bh, 0.09), postMat);
        post.position.set(bx1 - 0.05, bh / 2, pz); post.castShadow = true; bg.add(post);
      }
      bg.position.y = fortGY; scene.add(bg);
      const barObs = { minX: bx0, maxX: bx1, minZ: bz0, maxZ: bz1, h: bh, baseY: fortGY, mesh: bg, surface: 'hard' };
      coverList.push(barObs);
      bulbPlankObs = barObs;
    }
  }

  // === Street cover (staggered bounding cover down the lane) ===
  // Same approach as Winnmark v1.14: walk the centerline by arc length, drop a
  // piece every ~6m alternating N/S of the lane. Skip the bulb (x>27) and the
  // west entry mouth (x<-30).
  const roadCover = [];
  {
    let side = 1;
    const stepEvery = 6.0;
    const fine = [];
    for (let i = 0; i <= 90; i++) fine.push(roadPoint(i / 90));
    let acc = stepEvery;
    for (let i = 1; i < fine.length; i++) {
      const dx = fine[i].x - fine[i-1].x, dz = fine[i].z - fine[i-1].z;
      acc += Math.hypot(dx, dz);
      if (acc < stepEvery) continue;
      const p = fine[i];
      if (p.x < -30 || p.x > 27) continue; // skip west mouth + east bulb
      acc = 0;
      const tx = dx, tz = dz, tl = Math.hypot(tx, tz) || 1;
      const px = -tz / tl, pz = tx / tl;
      const offset = 2.2 * side;
      const cxp = p.x + px * offset, czp = p.z + pz * offset;
      const kind = gameRandom();
      let cobj;
      const sgy = groundY(cxp, czp);
      if (kind < 0.30) {
        const carColor = carColors[Math.floor(gameRandom() * carColors.length)];
        cobj = addCar(scene, cxp, czp, { orientation: Math.atan2(tz, tx) + rng(-0.3, 0.3), color: carColor, groundNormalFn: groundNormal, detail: true });   // v1.125
      } else if (kind < 0.62) {
        const w = rng(1.0, 1.4), h = rng(0.95, 1.2), d = rng(0.95, 1.2);
        cobj = addHomeDepotBox(scene, cxp, czp, { w, h, d, facing: rng(-Math.PI, Math.PI), detail: true });
      } else if (kind < 0.85) {
        const variant = gameRandom() < 0.5 ? 'garbage' : 'recycle';
        cobj = addCurbsideBin(scene, cxp, czp, { variant, tipped: gameRandom() < 0.2, facing: rng(-Math.PI, Math.PI), detail: true });
      } else {
        const plyMat = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.95 });
        const stack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.9), plyMat);
        stack.position.set(cxp, sgy + 0.3, czp); stack.rotation.y = rng(-Math.PI, Math.PI);
        stack.castShadow = stack.receiveShadow = true; scene.add(stack);
        cobj = { minX: cxp - 0.8, maxX: cxp + 0.8, minZ: czp - 0.45, maxZ: czp + 0.45, h: 0.6, mesh: stack, surface: 'hard', baseY: sgy };
      }
      if (kind < 0.85) sinkObs(cobj, cxp, czp);  // group-based assets; plywood already placed
      coverList.push(cobj);
      roadCover.push(cobj);
      // v1.54: cars carry a stacked upper-cabin box — collect it too.
      if (cobj && cobj._stacked) { coverList.push(cobj._stacked); roadCover.push(cobj._stacked); }
      side *= -1;
    }
  }

  // === Map bounds ===
  // v1.304 (D.51 step 2): south to 47 m for Michael's terraces and lawn (x 16.4-44); the rest of the south edge stays at
  // 30, held by the river blocker and the lot-line wall.
  const bounds = { minX: -40, maxX: 44, minZ: -32, maxZ: BR_HERO.lawnZ1 };

  // === Placements table — ready for future Sean/Nick scenarios ===
  // v1.8: every anchor's Y is the terrain height at its (x,z).
  const P = (x, z) => new THREE.Vector3(x, groundY(x, z), z);
  const placements = {
    // Bulb defenders (east end).
    bulb_car1:  { pos: P(BULB.x + 1, BULB.z - 3.5), cover: bulbCar1Obs },
    bulb_car2:  { pos: P(BULB.x + 3.5, BULB.z + 3), cover: bulbCar2Obs },
    bulb_plank: { pos: P(BULB.x - 3.4, BULB.z),    cover: bulbPlankObs },
    // Backyard anchors (one per house). South yards are ~9m deep toward the wall.
    house0_backyard: { pos: P(houseCenters[0].x - 1, houseCenters[0].z - 9), cover: coverByHouse[0]?.[0] },
    house1_backyard: { pos: P(houseCenters[1].x + 1, houseCenters[1].z - 9), cover: coverByHouse[1]?.[0] },
    house2_backyard: { pos: P(houseCenters[2].x - 1, houseCenters[2].z - 9), cover: coverByHouse[2]?.[0] },
    house3_backyard: { pos: P(houseCenters[3].x + 1, houseCenters[3].z + 9), cover: coverByHouse[3]?.[0] },
    house4_backyard: { pos: P(houseCenters[4].x - 1, houseCenters[4].z + 9), cover: coverByHouse[4]?.[0] },
    house5_backyard: { pos: P(houseCenters[5].x + 1, houseCenters[5].z + 9), cover: coverByHouse[5]?.[0] },
    hero_backyard:   { pos: P(41.6, 31.2), cover: coverByHouse[6]?.[1] || trampolineObs },   // v1.304: the terrace's east end, by the steps
    // Lane attackers (push from the west entry).
    lane_west_north: { pos: P(-30, -3), cover: null },
    lane_west_south: { pos: P(-30,  3), cover: null },
    lane_mid_north:  { pos: P(0, -3),   cover: null },
    lane_mid_south:  { pos: P(0,  4),   cover: null },
    // Enemy spawn clusters — one staging area per map end.
    cluster_bulb:      { pos: P(BULB.x, BULB.z), cover: null }, // east bulb (defenders)
    cluster_lane_west: { pos: P(-35, 0),         cover: null }, // west entry (attackers) — moved west off the curb props (v1.26)
    // v1.309 (D.51 step 4; the night rule of no line from a start, Michael A on Lamplight, 15 Oct): the night matches'
    // huddle. The bulb-end huddle on the lane, (18, 0), looked 38-40 m straight down it to lane_west, and Mitchell's AR
    // had a line to your start at BEGIN. This is the bulb's north yard, east of house 2: 57 m out, as cluster_bulb is,
    // and no line from any point of the huddle's ring to a step round your start at any height a kid shoots or looks from.
    cluster_bulb_night: { pos: P(33, -19), cover: null },
    // v1.265 (decisions, Michael: A, the lot's rule on every free-for-all): Last Kid Standing's starts. From lane_west
    // Sean's backyard was 23.7 m off and you were the nearest start he had (Nick 44.7 m). Each start is out of the
    // others' sight (muzzle 1.05 m to chest 0.95 m, from points 0.6 m round each) in both of the street's layouts (the
    // first match built after a page load draws its yard props and cars differently from the rest), 19.5 m or more
    // from every other, and every kid has another kid's start nearer than yours (found by a search over the street).
    ffa_1: { pos: P(-29.5, -25.5), cover: null },   // Sean's backyard
    ffa_2: { pos: P(-17.5, -9.5),  cover: null },   // house 0's front lawn, east of the drive
    ffa_3: { pos: P(-35.5, 16.5),  cover: null },   // west of house 3
    ffa_4: { pos: P(-11.5, 22.5),  cover: null },   // beside house 4
    ffa_5: { pos: P(16.5, 20),     cover: null },   // v1.305: between house 5 and Michael's front lawn (from 18.5, 18.5: the north lawns' bank lifts you into its sight)
    ffa_6: { pos: P(36.5, 44.5),   cover: null },   // v1.304: the lawn, past the fire pit (the garage stands where it was; the terrace sees house 4)
  };

  // === Player spawn anchors ===
  const playerSpawns = {
    lane_west:   { pos: P(-22, -2.5), yaw: -Math.PI / 2 }, // just past the west entry, on the centerline, facing EAST up the lane
    bulb_center: { pos: P(BULB.x, BULB.z), yaw: Math.PI / 2 }, // in the bulb, facing west (defend)
    hero_yard:   { pos: P(31, 28.6), yaw: 0 }, // v1.304: on the terrace under the deck
    ffa_side:    { pos: P(4.5, -17.5), yaw: Math.PI },      // v1.265: the free-for-all's, between houses 1 and 2, facing the lane
  };
  // v1.354 (D.71): the go-cart race's kids, on the front lawns along the lane, each with a line onto the road
  Object.assign(placements, {
    race_n1: { pos: P(-24, -9), cover: null }, race_s1: { pos: P(-14, 10), cover: null },
    race_n2: { pos: P(4, -10),  cover: null }, race_s2: { pos: P(5, 11),   cover: null },
    race_n3: { pos: P(25, -9),  cover: null },
  });

  // === Legacy return scaffolding ===
  let enemies = [];
  let spawn = playerSpawns.lane_west.pos.clone();
  let spawnYaw = playerSpawns.lane_west.yaw;
  let name = 'Bunratty Court', scenarioName = '', desc = '';

  // (No inline variant scenarios yet — content lands next session. The
  //  placement + spawn tables above are ready for the generic enterScenario
  //  enemySetup path.)

  // === v1.35: Streetlamps — 4 tall black lamps along the wooded lane, between
  // the houses and overhanging the road. Lit at night, dark props by day. v1.76:
  // pole placed relative to the ACTUAL S-curving road edge (sampled from the
  // centerline) so it sits on the grass shoulder, never on asphalt or a driveway.
  // X positions sit in the gaps between house pairs (clear of the driveway pads).
  const lampObs = [];
  {
    const ROAD_HALF_LAMP = 3.5;
    const LAMP_GRASS = 1.6;
    const lampSpotsXSide = [
      { x: -19, side: 'north' },  // between house0(-28) & house1(-6)
      { x:  -7, side: 'south' },  // mid-lane
      { x:  10, side: 'north' },  // between house1(-6) & house2(16)
      { x:  24, side: 'south' },  // approaching the east bulb
    ];
    for (const s of lampSpotsXSide) {
      let roadCZ = 0, bestDX = Infinity;
      for (const p of roadCenterline) {
        const dxp = Math.abs(p.x - s.x);
        if (dxp < bestDX) { bestDX = dxp; roadCZ = p.z; }
      }
      const lampZ = (s.side === 'north')
        ? roadCZ - ROAD_HALF_LAMP - LAMP_GRASS
        : roadCZ + ROAD_HALF_LAMP + LAMP_GRASS;
      const lamp = addStreetlamp(scene, s.x, lampZ, groundY, _night);
      if (lamp.userData.obstacles) lampObs.push(...lamp.userData.obstacles);
    }
  }

  // === v1.303 (D.51 step 1): past the fence, at real scale ===
  // The woods all round (tall hardwoods and loblolly pines, trunks clear well over your head), down the bluff, on the
  // floodplain round the mown field and up the far bank, with big houses along its top; the street's woods up to the
  // fork, and the fork itself: Sentinae Chase crossing, the grass island with its lantern lamp. Its own seeded numbers,
  // so no match's cover moves; one mesh by day, two at night; nothing within 6 m of the bounds and nothing solid.
  {
    const R0 = BR_REAL, rs = _mulberry32(_hashStringToSeed('bunratty-real|' + (_night ? 'n' : 'd')));
    const rr = (a, b) => a + (b - a) * rs();
    const B0 = { minX: -40, maxX: 44, minZ: -32, maxZ: 30 };
    const items = [];
    const LEAF = [0x3e6a2e, 0x4a7834, 0x365e2a, 0x567c38, 0x2e5226, 0x46703a], PINE = [0x2a4a2a, 0x2e5030, 0x264426];
    const ext = [];
    for (let i = 0; i <= 60; i++) ext.push(bunrattyRoad.ext(i / 60));
    const SC_X = bunrattyRoad.fork.x - 9;   // Sentinae Chase's middle, running north-south past the fork
    const nearRoad = (x, z, r) => {
      if (Math.abs(x - SC_X) < r) return true;
      for (const p of ext) if (Math.abs(p.x - x) < r && Math.abs(p.z - z) < r && Math.hypot(p.x - x, p.z - z) < r) return true;
      return false;
    };
    const sq = (x, z) => { const dx = x - R0.bx, dz = z - R0.bz; return [R0.nx * dx + R0.nz * dz, R0.nz * dx - R0.nx * dz]; };
    // v1.310 (D.51 step 5; docs/refs/bunratty.md gaps 8 and 10): east of the bulb. The neighbour past Michael's garage,
    // set lower on the falling ground, grey roof, its pool behind; across the creek's ravine a few houses high up on its
    // far side, facing it. Their own seeded numbers (so the trees, houses and every match's cover draw as before); the
    // trees keep off their footprints.
    const east = [], er = _mulberry32(_hashStringToSeed('bunratty-east|' + (_night ? 'n' : 'd'))), err = (a, b) => a + (b - a) * er();
    east.push({ k: 'house', x: 60, z: 15, yaw: Math.PI, w: 17, d: 12.5, h: 6.6, wall: 0xd8d0bc, roof: 0x4a4c50 });
    for (const sR of [-12, 22, 54]) {
      const qR = 132 + err(-4, 6), x = R0.bx + R0.nx * sR + R0.nz * qR, z = R0.bz + R0.nz * sR - R0.nx * qR;
      east.push({ k: 'house', x, z, yaw: Math.atan2(-R0.nz, R0.nx), w: err(19, 25), d: err(13, 16), h: 6.6,
        wall: [0xe0d8c8, 0x9a958c, 0xc8b89a][Math.floor(er() * 3) % 3], roof: [0x4a4440, 0x3e4248, 0x5e4a40][Math.floor(er() * 3) % 3] });
    }
    for (const hs of east) hs.y = groundY(hs.x, hs.z);
    const onEast = (x, z) => east.some(hs => Math.hypot(x - hs.x, z - hs.z) < Math.max(hs.w, hs.d) / 2 + 3) ||
      (x > 53 && x < 67 && z > 22 && z < 32);   // the neighbour's pool deck
    for (let gx = -250; gx <= 350; gx += 9) for (let gz = -150; gz <= 350; gz += 9) {
      const x = gx + rr(-3.5, 3.5), z = gz + rr(-3.5, 3.5);
      const pick = rs(), kind = rs(), hh = rs(), cc = rs();
      const out = Math.min(Math.max(B0.minX - x, x - B0.maxX, B0.minZ - z, z - B0.maxZ), brHeroOut(x, z));   // v1.304
      if (out < 12) continue;   // a crown is up to 4.8 m across its trunk: nothing within 6 m of the bounds
      const dB = Math.hypot(x - R0.bx, z - R0.bz);
      if (dB > 400 || (dB > 170 && pick < 0.35)) continue;
      if (z < -36 && Math.abs(x - 2) < 50 + (-32 - z)) continue;   // the backs of the Sentinae Chase houses (the edge backdrop's)
      const [s] = sq(x, z);
      if (Math.abs(s - R0.s) < R0.half + 5) continue;                // the river
      if (bunrattyFieldK(x, z) > 0.05) continue;                     // the field
      if (nearRoad(x, z, 8)) continue;                               // the street up to the fork, and Sentinae Chase
      if (pick < 0.2) continue;
      if (s > 128 && s < R0.s - R0.half - 5 && pick < 0.85) continue;   // the bank itself is open: brush, logs, the water through it
      if (onEast(x, z)) continue;                                    // v1.310: the houses east of the bulb
      const y = groundY(x, z);
      if (kind < 0.35) items.push({ k: 'pine', x, y, z, h: 14 + hh * 7, r: 2.6 + cc * 1.2, col: PINE[Math.floor(cc * PINE.length) % PINE.length] });
      else items.push({ k: 'tree', x, y, z, h: 12 + hh * 6, r: 3.2 + cc * 1.6, col: LEAF[Math.floor(cc * LEAF.length) % LEAF.length] });
    }
    // big houses along the far bank's top, facing the river
    const WALLS = [0xd6c9ae, 0x9a958c, 0x8a8278, 0xe0d8c8, 0xc8b89a], ROOFS = [0x5e4a40, 0x4a4440, 0x3e4248, 0x5a4a3e];
    for (let q = -320; q <= 340; q += rr(48, 70)) {
      const s = 318 + rr(-6, 10), x = R0.bx + R0.nx * s + R0.nz * q, z = R0.bz + R0.nz * s - R0.nx * q;
      if (x < -245 || x > 345 || z > 345 || Math.hypot(x - R0.bx, z - R0.bz) > 430) continue;
      items.push({ k: 'house', x, y: groundY(x, z), z, yaw: Math.atan2(-R0.nx, -R0.nz), w: rr(20, 27), d: rr(14, 18), h: 6.6,
        wall: WALLS[Math.floor(rs() * WALLS.length) % WALLS.length], roof: ROOFS[Math.floor(rs() * ROOFS.length) % ROOFS.length] });
    }
    // v1.310: the east houses, and the neighbour's pool (water in a pale deck, a step under his back door)
    items.push(...east);
    { const py = groundY(60, 27);
      items.push({ k: 'box', x: 60, y: py - 0.15, z: 27, w: 13, h: 0.4, d: 8, col: 0xd8d2c4 });
      items.push({ k: 'box', x: 60, y: py - 0.15, z: 27, w: 9, h: 0.43, d: 4.5, col: 0x7ed1c7 }); }
    // Sentinae Chase and the fork: asphalt laid on the ground, a mown island in the Y with the black lantern lamp
    const scPts = []; for (let z = -150; z <= 200; z += 5) scPts.push([SC_X, groundY(SC_X, z) + 0.07, z]);
    items.push({ k: 'strip', pts: scPts, w: 7.4, col: 0x6a6b6b });
    const isl = { x: bunrattyRoad.fork.x + 2, z: bunrattyRoad.fork.z + 9 }, iy = groundY(isl.x, isl.z);
    items.push({ k: 'box', x: isl.x, y: iy - 0.2, z: isl.z, w: 6, h: 0.3, d: 9, col: 0x6e8a44, yaw: 0.3 });
    items.push({ k: 'box', x: isl.x, y: iy, z: isl.z, w: 0.16, h: 3.4, d: 0.16, col: 0x1a1a1a });
    items.push({ k: 'box', x: isl.x, y: iy + 3.1, z: isl.z, w: 0.5, h: 0.65, d: 0.5, col: _night ? 0xffd890 : 0x2a2a28, top: 0x1a1a1a });
    items.push({ k: 'box', x: isl.x + 1.5, y: iy, z: isl.z - 2.5, w: 0.08, h: 2.6, d: 0.08, col: 0x8a8a8a });
    items.push({ k: 'box', x: isl.x + 1.5, y: iy + 2.35, z: isl.z - 2.5, w: 0.9, h: 0.2, d: 0.03, col: 0x2a6a3a });
    const grp = buildMergedScenery(items, _night, 'bunratty-real');
    scene.add(grp);
  }

  // === Collect obstacles ===
  // River sits well south (z≈42-66) and below grade; the south tree wall at
  // z≈33 + a blocker keep the player out of the drop. The retaining wall AABB
  // gives the player cover along the south lawn.
  // v1.304: it stops at the lot-line wall west of Michael's terraces; past his lawn the bounds hold you
  const riverBlocker = { minX: -40, maxX: BR_HERO.sideX0, minZ: 30.3, maxZ: 70, h: 8, baseY: -2, surface: 'hard' };
  const obstacles = [
    ...houseObs, ...fences, ...treeObs, ...bushObs, ...coverList,
    ...curbsideBins, ...retWall, riverBlocker, ...lampObs,
  ];

  return {
    scene,
    spawn, spawnYaw, bounds,
    cover: coverList,
    obstacles,
    enemies,
    name, scenarioName, desc,
    placements,
    playerSpawns,
    groundY,   // v1.8: terrain height function for the generic physics systems
    viewFar: 450,   // v1.303 (D.51 step 1): the camera sees out to the far bank (the other maps keep 200)
    raceRoad: { point: bunrattyRoad.point, T0: bunrattyRoad.T0, end: BULB },   // v1.354 (D.71): the go-cart's line down the street
  };
}

// Thin wrapper for the SCENARIOS table (mirrors the Winnmark wrappers).
function buildBunrattyCourtSceneDefault(_v, tod) { return buildBunrattyCourtScene('default', tod); }
