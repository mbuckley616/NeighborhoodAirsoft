
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
// v1.390 (D.51, card fable/d51-market, step 1): Riverside Market at real scale (docs/refs/kroger.md; Michael: 1 C real
// scale, 7 A the rows north-south, 8 A the restaurant at the west end in play; the Bunratty card's A, each match in a
// fenced area about today's size). The frame: x east, z south, the store's front wall on z = -30 as before, the play
// area's middle on x = 0. The store is 92 m across (x -7..85) and 70 m deep, its west tower's doors at x = -1; the west
// strip (x -42..-7) stands 12 m further back, the restaurant at its west end. In front of the store: the walk under the
// canopy (z -30..-25.5), the fire lane (to -22.5), the front drive (to -15.5), the row-end islands, then the double rows
// running south 37.8 m to the islands at the south end, the verge and Fouts Rd (z 34, where the game's road always ran).
// The double rows stand on an 18 m pitch, so every aisle runs straight at the doors; the aisle at x = -1 runs at the west
// tower's. The area (ML.area) runs from the restaurant's corner on the west to the median hedge of the row at x = 44; the
// rest of the centre is scenery, baked, and nothing of it is solid.
const ML = {
  frontZ: -30, walkZ: -25.5, laneZ: -22.5, driveZ: -15.5, rowZ0: -13, stall: 2.7, stalls: 14, stallD: 5.5,
  storeX0: -7, storeX1: 85, storeD: 70, storeH: 9.5,
  stripX0: -42, stripX1: -7, stripZ: -42, stripD: 30, stripH: 6.5,
  rows: [-28, -10, 8, 26, 44, 62, 80, 98, 116],   // double-row centrelines; the aisles between them at -37, -19, -1, 17, 35 ...
  playRows: 4,                                     // the first four whole rows are in play; the fifth's west half is solid, the edge
  area: { minX: -42.5, maxX: 38.3, minZ: -41.5, maxZ: 27 },   // v1.391: east edge at the aisle's side, the fifth row's cars its fence
  foutsZ: 34,
};
ML.rowZ1 = ML.rowZ0 + ML.stalls * ML.stall;        // 24.8: the rows' south end
const mlStallZ = k => ML.rowZ0 + ML.stall * (k + 0.5);
// v1.390 (D.51 step 2): the store front and the west strip at real size, from the guide's pictures (184013, 184024,
// 184052, 184123, 184134): the brick front with its buff bands, the charcoal canopy on its tie-rods, the clerestory
// bays above it, the two entrance towers (the west one hipped, the east one a glass gable with a fan window), the walk's
// cart corral, patio swings and ice cage, the crosswalk from the west doors; the one-storey strip with its dark
// standing-seam mansard and railed walk; and Guadalajara at the strip's west end (Michael: 8 A, in play): three white
// arches on columns over its porch, the iron-fenced patio of turquoise tables in front, the cream corner tower with red
// trim. The parts in the area are solid (the towers, columns, fence, tables, swings, cage, corral, bollards); the rest is
// scenery. ob(minX, maxX, minZ, maxZ, h, surface, extra) adds an obstacle and returns it; cover(o) lists it as cover.
function buildMarketFront(scene, ob, cover, night) {
  const M = (c, x = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, x));
  const brick = M(0x7a5248, { roughness: 0.95 }), buff = M(0xb39b83), white = M(0xe6e4de, { roughness: 0.8 });
  const steel = M(0x26282e, { roughness: 0.6, metalness: 0.4 }), seam = M(0x4a4f58, { roughness: 0.6, metalness: 0.3 });
  const glass = M(0x475962, { roughness: 0.25, metalness: 0.3, emissive: night ? 0xfff0c8 : 0x000000, emissiveIntensity: night ? 0.35 : 0 });
  const frameM = M(0xd8d8d2, { roughness: 0.6 }), iron = M(0x18181a, { roughness: 0.6, metalness: 0.5 });
  const B = (w, h, d, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const F = ML.frontZ, x0 = ML.storeX0, x1 = ML.storeX1, W = x1 - x0, cx = (x0 + x1) / 2;
  const T1 = { c: x0 + 6, w: 12, h: 14.5 }, T2 = { c: x1 - 6, w: 12, h: 14.5 };   // the towers: west (hipped) and east (glass gable)
  // the front's buff bands: a sill band, one over the canopy, one under the parapet
  for (const y of [1.0, 4.3, 8.9]) B(W, 0.3, 0.12, buff, cx, y, F + 0.06);
  // the clerestory between the towers: grey-green glass from 4.5 to 8.5 m in seven bays between brick piers, light frames
  {
    const gx0 = T1.c + T1.w / 2, gx1 = T2.c - T2.w / 2, n = 7, bw = (gx1 - gx0) / n;
    B(gx1 - gx0, 4, 0.08, glass, (gx0 + gx1) / 2, 6.5, F + 0.04);
    for (let i = 0; i <= n; i++) B(1.2, 4.4, 0.3, brick, gx0 + i * bw, 6.5, F + 0.15);
    for (let i = 0; i < n; i++) for (const y of [4.55, 6.5, 8.45]) B(bw - 1.2, 0.1, 0.1, frameM, gx0 + (i + 0.5) * bw, y, F + 0.1);
  }
  // the storefront under the canopy: brick piers every 8 m in front of the glass
  for (let x = T1.c + T1.w / 2 + 4; x < T2.c - T2.w / 2 - 2; x += 8) B(0.8, 3.8, 0.3, brick, x, 1.9, F + 0.15);
  // the canopy's tie-rods, every 6 m from its outer edge up to the wall
  {
    const L = Math.hypot(2.4, 2.8), a = Math.atan2(2.4, 2.8);
    for (let x = x0 + 13; x < x1 - 12; x += 6) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 5), steel);
      r.position.set(x, 3.9 + 1.4, F + 1.2); r.rotation.x = a; scene.add(r);
    }
  }
  // the towers: brick corner piers with buff cast-stone panels and white caps, a glazed front over the vestibule, its own
  // small canopy; 2 m proud of the wall
  for (const [t, west] of [[T1, true], [T2, false]]) {
    const zf = F + 2, zc = F + 1 - 1;   // its face, and its middle (it runs 2 m back into the store's wall)
    B(t.w, t.h, 4, brick, t.c, t.h / 2, zc);
    for (const s of [-1, 1]) {
      const px = t.c + s * (t.w / 2 - 0.9);
      for (const y of [3, 6.5, 10]) B(1.4, 1.8, 0.08, buff, px, y, zf + 0.04);
      B(2.0, 0.4, 0.6, white, px, t.h + 0.2, zf - 0.2);
    }
    B(t.w - 3.6, 9.5, 0.08, glass, t.c, 5.1, zf + 0.05);
    for (const y of [3.4, 6.8, 9.85]) B(t.w - 3.6, 0.15, 0.12, frameM, t.c, y, zf + 0.08);
    for (let i = 1; i < 4; i++) B(0.12, 9.5, 0.12, frameM, t.c - (t.w - 3.6) / 2 + i * (t.w - 3.6) / 4, 5.1, zf + 0.08);
    B(t.w - 3, 0.25, 1.8, steel, t.c, 3.2, zf + 0.9);
    B(t.w + 0.4, 0.5, 4.4, white, t.c, t.h + 0.25, zc);
    if (west) {   // a dark standing-seam hipped roof with a small gable over its window
      // v1.391: a four-sided cone turned square to the walls inside a group that squashes it to the tower's 4.4 m depth (scaled
      // on the cone itself, the scale came before the turn and skewed it)
      const rg = new THREE.Group(); rg.position.set(t.c, t.h + 0.5 + 2.1, zc); rg.scale.set(1, 1, 4.8 / (t.w + 1)); scene.add(rg);
      const roof = new THREE.Mesh(new THREE.ConeGeometry((t.w + 1) / Math.SQRT2, 4.2, 4, 1), seam);
      roof.rotation.y = Math.PI / 4; roof.castShadow = true; rg.add(roof);
    } else {      // a full glass gable with a half-round fan window under a dark metal edge
      const sh = new THREE.Shape(); sh.moveTo(-t.w / 2, 0); sh.lineTo(t.w / 2, 0); sh.lineTo(0, 4.6); sh.lineTo(-t.w / 2, 0);
      const gab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false }), glass);
      gab.position.set(t.c, t.h + 0.5, zc - 2); scene.add(gab);
      const fan = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16, 0, Math.PI), frameM); fan.position.set(t.c, t.h + 0.55, zf + 0.06); scene.add(fan);
      const fanG = new THREE.Mesh(new THREE.CircleGeometry(2.1, 16, 0, Math.PI), glass); fanG.position.set(t.c, t.h + 0.6, zf + 0.08); scene.add(fanG);
      for (const s of [-1, 1]) { const e = B(Math.hypot(t.w / 2, 4.6) + 0.4, 0.3, 4.4, steel, t.c + s * t.w / 4, t.h + 0.5 + 2.3, zc); e.rotation.z = -s * Math.atan2(4.6, t.w / 2); }
    }
    if (t.c - t.w / 2 < ML.area.maxX) ob(t.c - t.w / 2, t.c + t.w / 2, F, zf, t.h);
  }
  // === On the walk (in the area): a cart corral by the west doors, three patio swings for sale, a bench, an ice cage ===
  {
    const rail = M(0x8a9096, { roughness: 0.4, metalness: 0.7 });
    const cz = F + 3.4;
    const g = new THREE.Group(); g.position.set(T1.c + T1.w / 2 + 3, 0, cz); scene.add(g);
    for (const y of [0.45, 1.0]) for (const s of [-1, 1]) B(3.4, 0.06, 0.06, rail, 0, y, s * 0.65, g);
    cover(ob(T1.c + T1.w / 2 + 1.3, T1.c + T1.w / 2 + 4.7, cz - 0.7, cz + 0.7, 1.05, 'metal'));
    const cushion = M(0x8a8c90, { roughness: 1 }), sframe = M(0x3a3c40, { roughness: 0.5, metalness: 0.5 });
    for (const x of [14, 18.5, 23]) {   // a swing: an A-frame over a cushioned bench seat (the seat and its back stop a BB)
      for (const s of [-1, 1]) { const leg = B(0.08, 2.2, 0.08, sframe, x + s * 1.0, 1.1, F + 2.2); leg.rotation.x = 0.3; const leg2 = B(0.08, 2.2, 0.08, sframe, x + s * 1.0, 1.1, F + 3.4); leg2.rotation.x = -0.3; }
      B(2.1, 0.08, 0.08, sframe, x, 2.15, F + 2.8);
      B(1.7, 0.2, 0.7, cushion, x, 0.6, F + 2.8); B(1.7, 0.6, 0.15, cushion, x, 0.95, F + 2.5);
      cover(ob(x - 1.05, x + 1.05, F + 2.0, F + 3.6, 1.2, 'soft'));
    }
    B(1.8, 0.45, 0.5, M(0x4a3a2a), 29, 0.45, F + 1.0);
    // the ice and propane cage: chest high, metal
    B(2.4, 1.9, 1.0, M(0xc8ccd0, { roughness: 0.4, metalness: 0.6 }), 36, 0.95, F + 1.0);
    cover(ob(34.8, 37.2, F + 0.5, F + 1.5, 1.9, 'metal'));
  }
  // the crosswalk from the west doors over the fire lane and the front drive to the aisle, yellow bollards at its ends,
  // and the accessible stalls in the first stalls either side of that aisle
  {
    const paint = [];
    for (let z = ML.walkZ + 0.6; z < ML.driveZ - 0.2; z += 1.0) paint.push({ k: 'strip', pts: [[T1.c - 2, 0.045, z], [T1.c + 2, 0.045, z]], w: 0.5, col: 0xece8dc });
    for (const [c, s] of [[-10, 1], [8, -1]]) for (const k of [0, 2]) {
      const z = mlStallZ(k), xa = c + s * 0.6, xb = c + s * (ML.stallD - 0.3);
      paint.push({ k: 'strip', pts: [[xa, 0.04, z], [xb, 0.04, z]], w: ML.stall - 0.3, col: 0x2c5a8c });
    }
    scene.add(buildMergedScenery(paint, false, 'marketCrosswalk'));
    const yel = M(0xe0b828, { roughness: 0.6 });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.95, 8), yel); p.position.set(T1.c + s * 2.4, 0.48, ML.walkZ + 0.4); scene.add(p);
      ob(T1.c + s * 2.4 - 0.13, T1.c + s * 2.4 + 0.13, ML.walkZ + 0.27, ML.walkZ + 0.53, 0.95, 'metal');
    }
  }

  // === THE WEST STRIP: one storey, a dark standing-seam mansard over the shop signs, a railed walk ===
  const SZ = ML.stripZ, sx0 = ML.stripX0, sx1 = ML.stripX1, GX1 = -28;   // Guadalajara: x -42..-28
  {
    B(sx1 - GX1, 1.6, 1.2, seam, (GX1 + sx1) / 2, 4.9, SZ + 0.6).rotation.x = -0.35;
    const shopSign = (txt, x, bg, fg) => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48; const c2 = cv.getContext('2d');
      c2.fillStyle = bg; c2.fillRect(0, 0, 256, 48); c2.fillStyle = fg; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      fitSignText(c2, txt, 128, 26, 30, 'Arial', 236);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.95), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      m.position.set(x, 3.55, SZ + 0.08); scene.add(m);
    };
    [['HAIR STUDIO', '#2a2a2a', '#e8e0d0'], ['SHIP & PRINT', '#24486a', '#f0f0f0'], ['NAIL SPA', '#e8d8e0', '#6a2a4a']].forEach(([t, b, f], i) => {
      const x = GX1 + 3.5 + i * 7;
      shopSign(t, x, b, f);
      B(5.6, 2.6, 0.08, glass, x, 1.5, SZ + 0.05);
      B(0.7, 3.1, 0.4, brick, x + 3.5, 1.55, SZ + 0.2);
    });
    // the walk's black steel tube railing, with a gap in front of each door
    for (let i = 0; i < 3; i++) {
      const xa = GX1 + 0.8 + i * 7, xb = xa + 2.4, xc = xa + 4.2, xd = xa + 6.4;
      for (const [a, b] of [[xa, xb], [xc, xd]]) {
        for (const y of [0.5, 1.0]) B(b - a, 0.05, 0.05, iron, (a + b) / 2, y, SZ + 2.9);
        for (const x of [a, b]) B(0.06, 1.0, 0.06, iron, x, 0.5, SZ + 2.9);
        ob(a, b, SZ + 2.8, SZ + 3.0, 1.0, 'metal', { bbPass: true });
      }
    }
  }
  // === GUADALAJARA: brick with a white cornice, three white arches on columns over the porch, the patio, the tower ===
  {
    const gx0 = sx0, gx1 = GX1, gc = (gx0 + gx1) / 2;
    B(gx1 - gx0 + 0.3, 0.45, 0.6, white, gc, ML.stripH + 0.1, SZ + 0.1);
    // the arcade: one white wall 3 m out from the front with three round-topped openings, its roof back to the wall
    const aw = gx1 - gx0 - 2, ah = 4.6, az = SZ + 3;
    const sh = new THREE.Shape(); sh.moveTo(-aw / 2, 0); sh.lineTo(aw / 2, 0); sh.lineTo(aw / 2, ah); sh.lineTo(-aw / 2, ah); sh.lineTo(-aw / 2, 0);
    const span = aw / 3, open = span - 0.8, r = open / 2, spring = 2.6;
    const cols = [];
    for (let i = 0; i < 3; i++) {
      const mx = -aw / 2 + span * (i + 0.5), hole = new THREE.Path();
      hole.moveTo(mx - r, 0); hole.lineTo(mx - r, spring); hole.absarc(mx, spring, r, Math.PI, 0, true); hole.lineTo(mx + r, 0); hole.lineTo(mx - r, 0);
      sh.holes.push(hole);
    }
    for (let i = 0; i <= 3; i++) cols.push(gc - aw / 2 + span * i);
    const arc = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false, curveSegments: 10 }), white);
    arc.position.set(gc, 0, az - 0.5); arc.castShadow = arc.receiveShadow = true; scene.add(arc);
    B(aw + 0.4, 0.3, 3.4, white, gc, ah + 0.15, SZ + 1.6);
    for (const x of cols) ob(x - 0.42, x + 0.42, az - 0.5, az, ah);   // the columns (the arch over each opening is out of reach)
    // the porch floor and two tables under it
    B(aw, 0.1, 3, M(0xb8a890), gc, 0.05, SZ + 1.5);
    // the patio: iron fence round it, its gate on the east; turquoise tables and chairs
    const p0 = gx0 + 0.6, p1 = gx1 - 0.8, pz0 = az, pz1 = az + 6;
    const fence = (a, b, z, alongX) => {
      const n = Math.round(Math.abs(b - a) / 0.14);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.1, 0.03), iron);
      const inst = new THREE.InstancedMesh(pick.geometry, iron, n + 1), mm = new THREE.Matrix4();
      for (let i = 0; i <= n; i++) { const t = a + (b - a) * i / n; mm.makeTranslation(alongX ? t : z, 0.55, alongX ? z : t); inst.setMatrixAt(i, mm); }
      scene.add(inst);
      for (const y of [0.12, 1.05]) {
        const rl = alongX ? B(Math.abs(b - a), 0.05, 0.05, iron, (a + b) / 2, y, z) : B(0.05, 0.05, Math.abs(b - a), iron, z, y, (a + b) / 2);
        rl.castShadow = false;
      }
      return alongX ? ob(Math.min(a, b), Math.max(a, b), z - 0.08, z + 0.08, 1.1, 'metal', { bbPass: true })
                    : ob(z - 0.08, z + 0.08, Math.min(a, b), Math.max(a, b), 1.1, 'metal', { bbPass: true });
    };
    fence(p0, p1, pz1, true);              // south side
    fence(pz0, pz1, p0, false);            // west side
    fence(pz0, pz1 - 2, p1, false);        // east side, the gate its last 2 m
    const teal = M(0x3f8ca6, { roughness: 0.5, metalness: 0.3 });
    for (const [tx, tz] of [[-39.2, pz0 + 1.8], [-35, pz0 + 1.8], [-30.8, pz0 + 1.8], [-37.1, pz0 + 4.3], [-32.9, pz0 + 4.3]]) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 14), teal); top.position.set(tx, 0.75, tz); scene.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 6), teal); leg.position.set(tx, 0.37, tz); scene.add(leg);
      for (const a of [0, Math.PI]) { B(0.45, 0.06, 0.45, teal, tx + Math.cos(a) * 0.85, 0.45, tz); B(0.06, 0.45, 0.45, teal, tx + Math.cos(a) * 1.08, 0.7, tz); }
      cover(ob(tx - 0.55, tx + 0.55, tz - 0.55, tz + 0.55, 0.78, 'metal'));
    }
    // potted cactus by the door
    for (const x of [gc - 1.6, gc + 1.6]) {
      B(0.6, 0.5, 0.6, M(0xa8583a), x, 0.25, SZ + 0.5);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.0, 7), M(0x4a7a3a)); c.position.set(x, 1.0, SZ + 0.5); scene.add(c);
    }
    // the sign, and the pale corner tower on the west side with red trim at its top
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 80; const c2 = cv.getContext('2d');
    c2.fillStyle = '#efe6d2'; c2.fillRect(0, 0, 512, 80); c2.fillStyle = '#a0302a'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'GUADALAJARA', 256, 42, 52, 'Georgia', 480);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    sign.position.set(gc, ah + 0.95, SZ + 0.08); scene.add(sign);
    B(4, 10, 4, M(0xd8d4c8), gx0 + 1.6, 5, SZ - 1.5);
    B(4.3, 0.5, 4.3, M(0xb03a30), gx0 + 1.6, 9.6, SZ - 1.5);
    B(4.5, 0.3, 4.5, white, gx0 + 1.6, 10.15, SZ - 1.5);
  }
}
function buildMarketLotScene(variant, timeOfDay) {
  const scene = new THREE.Scene();
  const _night = (timeOfDay === 'night');
  applyTimeOfDay(scene, timeOfDay, {
    dayBg: 0x9cc8ea, dayFog: [60, 190],
    sunColor: 0xfff1d8, sunInt: 1.9, sunPos: [-20, 40, 18],
    dayAmbColor: 0xa8b4c8, dayAmbInt: 0.36, dayHemiColor: 0xc4d8f0, dayHemiInt: 0.30,
    nightBg: 0x0a0e16, nightFog: [16, 64], moonPos: [20, 36, -16],
    shadow: { size: 4096, extent: 60, far: 130 },
  });

  const groundY = () => 0;     // a graded lot: flat
  const P = (x, z) => new THREE.Vector3(x, 0, z);
  const A_ = ML.area;
  const bounds = { minX: A_.minX, maxX: A_.maxX, minZ: A_.minZ, maxZ: A_.maxZ };
  // Deterministic layout, so the AI's cover and the tests see the same lot every
  // round; only car colours vary.
  let _seed = 7;
  const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };

  const flat = (w, d, color, x, z, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  // The grass round the centre, the asphalt of the whole lot (the store's and both strips'), and Fouts Rd past the verge.
  flat(320, 320, 0x55664a, 30, -20, -0.06);   // under the asphalt, low enough not to flicker through it at 200 m
  flat(200, 72, _night ? 0x2c2d30 : 0x4a4c51, 51, -6, 0);     // x -49..151, z -42..30
  flat(240, 9, 0x35363a, 40, ML.foutsZ, 0.02);                   // Fouts Rd
  // The far view (rows east of the area, the strips, poles, trees): built here, baked into one mesh per look at the end
  const far = new THREE.Group(); scene.add(far);
  // Painted lines, merged into one mesh: the yellow centre dashes on Fouts Rd, every stall line
  const paint = [];
  for (let x = -76; x <= 156; x += 6) paint.push({ k: 'strip', pts: [[x - 1.5, 0.035, ML.foutsZ], [x + 1.5, 0.035, ML.foutsZ]], w: 0.16, col: 0xd8c050 });
  // The walks: in front of the store under the canopy, and the west strip's
  flat(ML.storeX1 - ML.storeX0, ML.walkZ - ML.frontZ, 0xa69e8f, (ML.storeX0 + ML.storeX1) / 2, (ML.frontZ + ML.walkZ) / 2, 0.03);
  flat(ML.stripX1 - ML.stripX0, 3, 0xa69e8f, (ML.stripX0 + ML.stripX1) / 2, ML.stripZ + 1.5, 0.03);
  // The fire lane: a red-painted curb on the walk's edge, then 3 m of yellow diagonal hatching the store's whole front
  flat(ML.storeX1 - ML.storeX0, 0.22, 0xb03a36, (ML.storeX0 + ML.storeX1) / 2, ML.walkZ + 0.11, 0.04);
  {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    const c2 = cv.getContext('2d'); c2.strokeStyle = '#d8b830'; c2.lineWidth = 7;
    for (let i = -1; i <= 1; i++) { c2.beginPath(); c2.moveTo(i * 64, 64); c2.lineTo(i * 64 + 64, 0); c2.stroke(); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((ML.storeX1 - ML.storeX0) / 3, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ML.storeX1 - ML.storeX0, 2.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((ML.storeX0 + ML.storeX1) / 2, 0.03, (ML.walkZ + ML.laneZ) / 2); scene.add(m);
  }

  const obstacles = [], coverList = [];
  const box = (minX, maxX, minZ, maxZ, h, surface = 'hard', baseY = 0) => {
    const o = { minX, maxX, minZ, maxZ, h, surface, baseY }; obstacles.push(o); return o;
  };
  const brick = new THREE.MeshStandardMaterial({ color: 0x7a5248, roughness: 0.95 });

  // === THE STORE — 92 m of brick front along the north, 70 m deep ===
  {
    const W = ML.storeX1 - ML.storeX0, D = ML.storeD, H = ML.storeH, cx = (ML.storeX0 + ML.storeX1) / 2, frontZ = ML.frontZ;
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), brick);
    bodyM.position.set(cx, H / 2, frontZ - D / 2); bodyM.castShadow = bodyM.receiveShadow = true; scene.add(bodyM);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xb39b83, roughness: 0.8 }));
    parapet.position.set(cx, H + 0.25, frontZ - 0.1); scene.add(parapet);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x28384a, roughness: 0.25, metalness: 0.3,
      emissive: _night ? 0xfff0c8 : 0x0a0f15, emissiveIntensity: _night ? 0.55 : 0.2 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 6, 2.8, 0.1), glassMat);
    glass.position.set(cx, 1.55, frontZ + 0.03); scene.add(glass);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 2.5), new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.7, metalness: 0.4 }));
    canopy.position.set(cx, 3.8, frontZ + 1.25); canopy.castShadow = true; scene.add(canopy);
    // Sign: a canvas texture on the facade, just west of the east tower (never the real brand's script)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#f4efe2'; c2.fillRect(0, 0, 512, 96);
    c2.fillStyle = '#2f6a3a'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    fitSignText(c2, 'RIVERSIDE MARKET', 256, 50, 54, 'Georgia', 512 - 40);   // v1.300
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false }));
    sign.position.set(62, 6.5, frontZ + 0.32); scene.add(sign);   // v1.390: on the clerestory, in front of its piers
    // the flat roof, light grey membrane (the brick box's own top read pink from the lot)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, roughness: 0.95 });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(W, D), roofMat); roof.rotation.x = -Math.PI / 2; roof.position.set(cx, H + 0.02, frontZ - D / 2); scene.add(roof);
    box(ML.storeX0, ML.storeX1, frontZ - D, frontZ, H);
    // The west strip, set back 12 m, one storey; the east strip a few metres behind the store's front (scenery)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(ML.stripX1 - ML.stripX0, ML.stripH, ML.stripD), brick);
    strip.position.set((ML.stripX0 + ML.stripX1) / 2, ML.stripH / 2, ML.stripZ - ML.stripD / 2); strip.castShadow = strip.receiveShadow = true; scene.add(strip);
    const sroof = new THREE.Mesh(new THREE.PlaneGeometry(ML.stripX1 - ML.stripX0, ML.stripD), roofMat); sroof.rotation.x = -Math.PI / 2;
    sroof.position.set((ML.stripX0 + ML.stripX1) / 2, ML.stripH + 0.02, ML.stripZ - ML.stripD / 2); scene.add(sroof);
    box(ML.stripX0, ML.stripX1, ML.stripZ - ML.stripD, ML.stripZ, ML.stripH);
    buildMarketFront(scene, (a, b, c, d, h, surf = 'hard', extra = {}) => Object.assign(box(a, b, c, d, h, surf), extra), o => { coverList.push(o); return o; }, _night);   // v1.390
    const east = new THREE.Mesh(new THREE.BoxGeometry(55, ML.stripH, 30), brick);
    east.position.set(ML.storeX1 + 27.5, ML.stripH / 2, ML.frontZ - 3 - 15); far.add(east);
  }

  // === THE ROWS — double rows running north-south at the doors, cars nose to nose across each ===
  // Each half-row is 14 stalls of 2.7 m from the front drive's islands south. Stalls 6 and 7 are the mid island's (its
  // light pole); every third stall (1, 4, 10, 13) stays empty in both halves, so each double row has a walk-through
  // every 8.1 m (v1.103: without them a row was a solid wall that kids wedged against). A fixed seed decides the rest.
  const CAR_COLORS = [0x6a8aa8, 0x8a4030, 0xd8d8d4, 0x2a2a2e, 0x6e7478, 0x3a5a3a, 0xb09a6a, 0x9a2a2a, 0x2a3e6a];
  const carObsList = [];
  // the stalls the cart corrals take: [row centre, half (-1 west, +1 east), stall]
  const CORRAL_STALLS = [[-10, 1, 3], [26, -1, 9], [-28, 1, 11]];
  const inPlay = (c, s) => c < ML.rows[ML.playRows] || (c === ML.rows[ML.playRows] && s < 0);
  const lineAt = (c, s) => {
    for (let j = 0; j <= ML.stalls; j++) {
      const z = ML.rowZ0 + j * ML.stall, x0 = c + s * 0.1, x1 = c + s * ML.stallD;
      paint.push({ k: 'strip', pts: [[x0, 0.03, z], [x1, 0.03, z]], w: 0.12, col: 0xe8e4d8 });
    }
  };
  for (const c of ML.rows) for (const s of [-1, 1]) {
    lineAt(c, s);
    for (let k = 0; k < ML.stalls; k++) {
      if (k === 6 || k === 7 || k % 3 === 1) continue;
      if (CORRAL_STALLS.some(([cc, ss, kk]) => cc === c && ss === s && kk === k)) continue;
      const occupied = rnd() < 0.72;
      const ox = (rnd() - 0.5) * 0.3, oz = (rnd() - 0.5) * 0.2, oy = (rnd() - 0.5) * 0.08;
      if (!occupied) continue;
      // nose into the double row's centreline (car-local +X is the nose: yaw 0 points it +x, PI points it -x)
      const orient = (s < 0 ? 0 : Math.PI) + oy;
      const cx = c + s * 2.75 + ox, cz = mlStallZ(k) + oz;
      const color = CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)];
      if (!inPlay(c, s)) { addCar(far, cx, cz, { orientation: orient, color }); continue; }
      const carObs = addCar(scene, cx, cz, { orientation: orient, color, detail: true });   // v1.126: Winnmark's car (D.3 step 4)
      const seated = carSeatY(carObs, groundY);
      carObs.mesh.position.y += seated;
      resolveObox(carObs); resolveObox(carObs._stacked);
      pushCarObs(obstacles, carObs);
      coverList.push(carObs);
      carObsList.push(carObs);
    }
  }
  // The few stalls in front of the west strip, nosed in to its walk (the restaurant's patio takes the ones at its west end)
  for (let i = 0; i < 6; i++) {
    const x = -26.15 + i * ML.stall;
    paint.push({ k: 'strip', pts: [[x - 1.35, 0.03, ML.stripZ + 3], [x - 1.35, 0.03, ML.stripZ + 8.5]], w: 0.12, col: 0xe8e4d8 });
    if (i === 2 || rnd() > 0.7) continue;
    const carObs = addCar(scene, x + (rnd() - 0.5) * 0.3, ML.stripZ + 5.75, { orientation: Math.PI / 2 + (rnd() - 0.5) * 0.08, color: CAR_COLORS[Math.floor(gameRandom() * CAR_COLORS.length)], detail: true });
    carObs.mesh.position.y += carSeatY(carObs, groundY);
    resolveObox(carObs); resolveObox(carObs._stacked);
    pushCarObs(obstacles, carObs); coverList.push(carObs); carObsList.push(carObs);
  }

  // === ISLANDS — curbed, with red-painted noses at the drive, low shrubs, a tree; a tall light pole mid-row ===
  const treeObs = [], lampObs = [];
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xb4b0a6, roughness: 0.9 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xb03a36, roughness: 0.9 });
  const mulchMat = new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 1.0 });
  const island = (parent, x, z, w, d, nose) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), curbMat);
    m.position.set(x, 0.075, z); m.receiveShadow = true; parent.add(m);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.04, d - 0.4), mulchMat);
    top.position.set(x, 0.16, z); parent.add(top);
    if (nose) { const n = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.16), noseMat); n.position.set(x, 0.08, z + nose * (d / 2 - 0.08)); parent.add(n); }
  };
  // A tall lot light: a grey pole 10.5 m up with a flat shoebox head; lit at night (a wide, high pool)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.5, metalness: 0.6 });
  const lotLight = (parent, x, z, lit) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 10.5, 8), poleMat); pole.position.y = 5.25; pole.castShadow = true; g.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.7, 8), curbMat); base.position.y = 0.35; g.add(base);
    for (const s of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.55), poleMat); head.position.set(s * 0.7, 10.45, 0); g.add(head);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.4), new THREE.MeshBasicMaterial({ color: lit ? 0xfff2d0 : 0x4a4a44, fog: false }));
      lens.position.set(s * 0.7, 10.32, 0); g.add(lens);
    }
    if (lit) { const L = new THREE.PointLight(0xffe8c0, 2.6, 20, 1.1); L.position.set(0, 8.6, 0); g.add(L); }
    parent.add(g);
    return { minX: x - 0.34, maxX: x + 0.34, minZ: z - 0.34, maxZ: z + 0.34, h: 10.5, surface: 'metal', mesh: g, baseY: 0 };
  };
  ML.rows.forEach((c, i) => {
    const playW = i < ML.playRows, half = i === ML.playRows;   // the fifth row: its west half in play, the hedge its middle
    const P_ = playW ? scene : far;
    // the row-end islands: across the double row, north (at the drive, red nose) and south
    for (const [z, nose] of [[ML.rowZ0 - 1.25, -1], [ML.rowZ1 + 1.25, 0]]) {
      island(P_, c, z, 11, 2.5, nose);
      if (playW) {
        coverList.push(...[-3.4, 3.4].map(dx => { const o = addBush(scene, c + dx, z, 2.6, 0.95, 1.5, 0x52602a, 0.15, { detail: true }); obstacles.push(o); return o; }));
        if (c === -10 && z < 0) {   // v1.390: the flagpole, in the island west of centre by the store, in place of its tree
          const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 15, 8), poleMat); fp.position.set(c, 7.5, z); fp.castShadow = true; scene.add(fp);
          const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), new THREE.MeshStandardMaterial({ color: 0xb03a36, side: THREE.DoubleSide, roughness: 0.9 }));
          fl.position.set(c + 1.25, 14.2, z); scene.add(fl);
          const cn = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ color: 0x2a3e6a, side: THREE.DoubleSide, roughness: 0.9 }));
          cn.position.set(c + 0.55, 14.5, z + 0.01); scene.add(cn);
          lampObs.push({ shape: 'cylinder', cx: c, cz: z, radius: 0.12, minX: c - 0.12, maxX: c + 0.12, minZ: z - 0.12, maxZ: z + 0.12, h: 15, surface: 'metal', baseY: 0 });
          continue;
        }
        treeObs.push(addSuburbanTree(scene, c, z, { trunkH: (i + (z > 0)) % 2 ? 3.2 : 2.4, leafR: (i + (z > 0)) % 2 ? 2.6 : 1.9, baseY: 0.15, detail: true }));
      } else {
        // the fifth row's west shrub stands in the area: solid, as the others
        if (half) { const o = addBush(scene, c - 3.4, z, 2.6, 0.95, 1.5, 0x52602a, 0.15, { detail: true }); obstacles.push(o); coverList.push(o); }
        else addBush(far, c - 3.4, z, 2.6, 0.95, 1.5, 0x52602a, 0.15, { detail: true });
        addBush(far, c + 3.4, z, 2.6, 0.95, 1.5, 0x52602a, 0.15, { detail: true });
        if (half) { treeObs.push(addSuburbanTree(scene, c, z, { trunkH: 3.2, leafR: 2.6, baseY: 0.15, detail: true })); continue; }
        addSuburbanTree(far, c, z, { trunkH: 2.8, leafR: 2.2, baseY: 0.15, detail: true });
      }
    }
    // the mid island and its light pole
    island(P_, c, (mlStallZ(6) + mlStallZ(7)) / 2, 2.4, 5.4, 0);
    const L = lotLight(playW ? scene : far, c, (mlStallZ(6) + mlStallZ(7)) / 2, _night && playW);
    if (playW) lampObs.push(L);
    // the fifth row's median: a hedge down its middle, the area's east edge
    if (half) for (let z = ML.rowZ0 + 0.4; z < ML.rowZ1; z += 1.3) addBush(scene, c, z, 1.2, 1.15, 1.6, 0x4a5e26, 0, { detail: true });
  });
  // v1.390: the shade tree on the verge at the lot's west edge, by the restaurant, over the drive's end (184203)
  island(scene, A_.minX + 0.2, -27, 2.4, 6, 0);
  treeObs.push(addSuburbanTree(scene, A_.minX + 0.2, -27, { trunkH: 3.4, leafR: 3.0, baseY: 0.15, detail: true }));
  // Along the south verge, past the last islands: the trees in front of Fouts Rd
  for (let x = -40; x <= 150; x += 14) {
    const o = addSuburbanTree(x > A_.maxX ? far : scene, x + 9, 28.6, { baseY: 0, detail: true });
    if (x + 9 <= A_.maxX) treeObs.push(o);
  }

  // === CART CORRALS and strays — metal rails you can crouch behind ===
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.4, metalness: 0.7 });
  const addCorral = (x, z) => {   // its 3.4 m length along x, in a stall of the north-south rows
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2;
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
    const o = box(x - 1.75, x + 1.75, z - 0.7, z + 0.7, 1.05, 'metal');
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
  for (const [c, s, k] of CORRAL_STALLS) addCorral(c + s * 2.75, mlStallZ(k));
  // Three stray carts in the aisles.
  for (const [x, z, yaw] of [[-20.5, -6, 0.6], [16, 9, -1.1], [-2.5, 18, 2.2]]) {
    scene.add(makeCartMesh(x, z, yaw));
    box(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.0, 'metal');
  }
  // v1.175 (D.17, Michael: B): Night Shift only. Rebecca holds the road side, and the aisle north of her ran clear up to
  // the store end, so Mason had a line down to her. A dumpster on the aisle just north of her spot gives her something
  // to hide behind; the briefing's spot stays true. v1.390: her spot is the aisle at x -19's south end.
  const VIP_DUMP = { x: -19, z: 19.6 };
  if (variant === 'vip_night') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x2c5a3a, roughness: 0.8, metalness: 0.3 }));
    m.position.set(VIP_DUMP.x, 0.75, VIP_DUMP.z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.7), new THREE.MeshStandardMaterial({ color: 0x1e2a22, roughness: 0.7 }));
    lid.position.set(VIP_DUMP.x, 1.54, VIP_DUMP.z); scene.add(lid);
    coverList.push(box(VIP_DUMP.x - 1.1, VIP_DUMP.x + 1.1, VIP_DUMP.z - 0.8, VIP_DUMP.z + 0.8, 1.5, 'metal'));
  }

  // === BY THE STORE — a box truck on the front drive at the area's east end, dumpsters at the store's west corner ===
  {
    const tx = 35, tz = -19;
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
    for (const dz of [-38.6, -36]) {   // along the store's west wall, in the corner by the strip
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.2), dMat);
      m.position.set(-8.2, 0.75, dz); m.castShadow = m.receiveShadow = true; scene.add(m);
      coverList.push(box(-9, -7.4, dz - 1.1, dz + 1.1, 1.5, 'metal'));
    }
  }

  // v1.391 (step 5): past the centre (the woods behind the store and west of the restaurant, the warehouses, Fouts Rd's outparcels and
  // Holcomb Bridge Rd, the car wash and Eves Rd, the second big box east): EDGE_BACKDROPS.buildMarketLotScene (step 5)

  // === Edge blockers: keep the player in the area ===
  const edge = [
    { minX: -90, maxX: A_.minX - 0.1, minZ: -90, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: A_.maxX + 0.1, maxX: 160, minZ: -90, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
    { minX: -90, maxX: 160, minZ: 28.6, maxZ: 60, h: 6, baseY: 0, surface: 'hard' },
  ];
  // The painted lines, and the far view baked (none of it is solid)
  scene.add(buildMergedScenery(paint, false, 'marketPaint'));
  {
    scene.updateMatrixWorld(true);
    const meshes = []; far.traverse(m => { if (m.isMesh && !m.userData.backdrop) meshes.push(m); });
    const keep = []; far.traverse(m => { if (m.isMesh && m.userData.backdrop) keep.push(m); });
    scene.add(bakeMeshesByLook(meshes, 'marketFar'));
    for (const m of keep) { m.updateMatrixWorld(true); }
    scene.remove(far);
    for (const m of keep) scene.add(m);
  }

  // === ANCHORS & SPAWNS ===
  // Every anchor stands in an aisle or on the drive, next to the car, island or rail it hides behind.
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
  // v1.390 (step 3): the starts on the turned rows, found by a search of the built lot with the kids' own sight rule
  // (muzzle 1.05 m to chest 0.95 m): no store-side start, huddle or your start at the doors has a line to any road-side
  // start or huddle. The aisles run straight at the doors, so the road side's anchors are in the empty end stalls behind a
  // parked car, the store side's behind the swings on the walk, under Guadalajara's arches, by the truck and in the
  // dumpsters' corner. Kids see a head over a car (v1.385), so the store side huddles behind the 3 m truck.
  const placements = {
    // Team A — the store side
    a_store:    A(14, -28.5),     // on the walk behind the patio swings
    a_store_w:  A(-24.5, -38.5),  // under Guadalajara's arches
    a_store_e:  A(22.5, -28.5),
    a_truck:    A(37.3, -16.6),   // v1.391: at the truck's cab, where Devon's rifle sees down the east aisle (behind it he saw nobody)
    a_dumpster: A(-8.5, -40.5),   // behind the dumpsters at the store's west corner
    a_aisle_w:  A(-19, -9),
    a_aisle_e:  A(17, -9),
    // Team B — the road side
    b_road:     A(-11.5, 25.5),
    b_road_w:   A(-19, 21),       // Night Shift: Rebecca, the dumpster just north of her
    b_road_e:   A(10.5, 22.5),
    b_aisle_w:  A(-13.5, 19.5),
    b_aisle_e:  A(26.5, 16.5),
    b_corner_w: A(-25.5, 22.5),
    b_corner_e: A(37, 24.5),
    // Scatter for free-for-alls
    scatter_nw: { pos: P(-38, -24), cover: null },
    scatter_ne: { pos: P(37, -24),  cover: null },
    scatter_sw: { pos: P(-38, 22),  cover: null },
    scatter_se: { pos: P(37, 22),   cover: null },
    scatter_w:  { pos: P(-38, 5),   cover: null },
    scatter_e:  { pos: P(35, 0),    cover: null },
    cluster_north: { pos: P(35, -21.9), cover: null },   // behind the truck: 3 m tall, it hides a head where a car does not
    // v1.391: Aisle Wars (by day) gathers in front of the west doors, in sight of the lot as the old lot's huddle was: hidden
    // behind the truck, your side walked up the east aisle unseen and met them round it at 5.5 m
    cluster_doors: { pos: P(2.5, -27.2), cover: null },
    cluster_south: { pos: P(-11.5, 26.5), cover: null },
    // v1.134 (Found in play, Michael: B): the free-for-all's hidden starts, each beside cover, out of sight of the others
    // and of yours, 18 m or more apart (Michael A, 15 Oct), and in the Pickup Game's order (tyler, chris, brooke, owen,
    // marcus, jamie) every kid at every size has another kid's start nearer than yours. v1.390: found again by a search
    // over the turned rows: 25.5 m apart at the least, the nearest kid 29 m from you; v1.391 again, the east edge moved in. Jamie
    // starts on Guadalajara's porch.
    ffa_1: { pos: P(-30.5, 24.5), cover: null },
    ffa_2: { pos: P(-41, -40), cover: null },
    ffa_3: { pos: P(35.5, -28), cover: null },
    ffa_4: { pos: P(10, -28), cover: null },
    ffa_5: { pos: P(2.5, 9.5), cover: null },
    ffa_6: { pos: P(-20, -7), cover: null },
  };
  const playerSpawns = {
    // at the road end of the east aisle beside the east row's cars, facing the store (yaw 0 faces -z): the truck stands
    // between you (and your side, fanned out round you) and the store side's huddle, and you meet them inside the guns'
    // 40 m (from (8, 21), 50 m off, the night matches' first shots came at 41-46 m)
    team_b:  { pos: P(36.5, 14.5), yaw: 0 },
    team_a:  { pos: P(-2.5, -27.5), yaw: Math.PI },   // at the west doors
    midfield:{ pos: P(-1, 6), yaw: 0 },
    // v1.134: behind a car at the lot's east edge
    ffa_edge:{ pos: P(35.5, 1), yaw: Math.PI },   // v1.391: in the east aisle, the east row's cars beside you, facing down it
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
    viewFar: 240,
    teamBases: { player: { x: 36.5, z: 14.5 }, enemy: { x: 35, z: -21.9 } },
  };
}
function buildMarketLotSceneDefault(_v, tod) { return buildMarketLotScene('default', tod); }
