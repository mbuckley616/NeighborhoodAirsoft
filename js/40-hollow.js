
// ===================================================================
// v1.36 — THE HOLLOW (East Roswell woods battleground)
// ===================================================================
// A large, flat-ish wooded clearing south of and between Winnmark and
// Bunratty. Closed dark canopy (barely any sun), a NON-crossable river on
// the WEST with visible far-bank land + treeline, a CROSSABLE fork creek
// through the center, ~30 trees densified into a canopy, ~14 pallet-wall
// cover clusters (L/T shapes per the design sketch), two asymmetric pallet
// BUNKER forts at the north (Team A) and south (Team B) spawns, and a couple
// of open redoubts mid-field. Built for big 5v5 last_team_standing battles.
//
// Follows the Bunratty builder contract exactly: groundY single-source-of-
// truth, sinkObs/groundNormal/layOnSlope, displaced ground, obstacle AABBs,
// placements + playerSpawns tables, and the standard scene return object.
// v1.307 (D.51 step 3): the Hollow's river at real scale: the near bank's clay cut starts at cutX (past the tree ranks'
// west end), the bed, the water, and the far (Dunwoody) bank's cut at farX, 62 m across.
const HW = { cutX: -43.8, bedY: -3.4, waterY: -2.5, farX: -106 };
function buildHollowScene(variant, timeOfDay) {
  const scene = new THREE.Scene();

  // === Lighting / sky — CLOSED DARK CANOPY ===
  // Unlike the two street maps (clear blue day skies), the Hollow is a deep-
  // woods clearing, lit for a BRIGHT SUNNY HIGH-NOON look (v1.36d). Sun nearly
  // overhead → short shadows pooled under the trees; bright blue sky; fog kept
  // (reads as river haze). Ambient nudged up a touch vs the raking-sun version
  // since noon light is flatter and we don't want the short shadows pitch-black.
  const _night = (timeOfDay === 'night');
  const { sun } = applyTimeOfDay(scene, timeOfDay, {
    // Bright clear blue sky; fog gives gentle river haze in the distance.
    dayBg: 0x8fc4ec, dayFog: [45, 320],   // v1.307 (D.51 step 3): out from [40, 120], so the far bank and the bluff show
    // HIGH NOON: sun almost straight overhead, bright and near-white-warm.
    sunColor: 0xfff6e0, sunInt: 2.0, sunPos: [6, 48, 10],
    // Slightly higher fill than the raking version (noon shadows are short).
    dayAmbColor: 0x9fb0c8, dayAmbInt: 0.34, dayHemiColor: 0xbcd4f0, dayHemiInt: 0.30,
    // Night unchanged.
    nightBg: 0x080d14, nightFog: [14, 58], moonPos: [-18, 36, -14],
    // High-res shadow map for crisp dapple; extent covers the clearing.
    shadow: { size: 4096, extent: 56, far: 120 },
  });

  const rng = (min, max) => min + gameRandom() * (max - min);

  // ===================================================================
  // TERRAIN — a gently rolling hollow. Mostly flat so the big team fight
  // reads cleanly, with a shallow bowl toward the center creek (the land
  // dips to the water) and a low rise along the EAST treeline. Total relief
  // is small (~3m) — this is a flat clearing, not a graded street.
  // Playable box: x∈[-46,46], z∈[-40,40]. River runs N–S off the WEST edge.
  // ===================================================================
  // Distance from (x,z) to the creek CENTERLINE — a fork that now RUNS TO THE
  // RIVER on the west (x≈-42) so the creek visibly drains into it, plus two
  // offshoots. Used to carve the ground channel AND to drive the water surface,
  // so the two always agree. Point-to-segment distance, min over the segments.
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((px - ax) * dx + (pz - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cz = az + t * dz;
    return Math.hypot(px - cx, pz - cz);
  }
  // Main run mouth-to-east: (-42,0) → (21,0). NW offshoot, SE offshoot.
  const CREEK_MAIN = [-42, 0, 21, 0];
  const CREEK_NW = [-6, -15, -6, -1];
  const CREEK_SE = [16, 2, 16, 18];
  function creekDist(x, z) {
    return Math.min(
      segDist(x, z, CREEK_MAIN[0], CREEK_MAIN[1], CREEK_MAIN[2], CREEK_MAIN[3]),
      segDist(x, z, CREEK_NW[0], CREEK_NW[1], CREEK_NW[2], CREEK_NW[3]),
      segDist(x, z, CREEK_SE[0], CREEK_SE[1], CREEK_SE[2], CREEK_SE[3])
    );
  }

  function hollowGroundY(x, z) {
    let h = 0;
    // West→east: the far WEST (x≈-46, the riverbank) sits a touch LOW (the
    // land falls to the water); a gentle rise toward the EAST treeline.
    const xW = -46, xE = 46;
    let u = (x - xW) / (xE - xW);             // 0 west bank, 1 east treeline
    u = Math.max(0, Math.min(1, u));
    h += 1.6 * (u * u * (3 - 2 * u));         // +0 west, +1.6 east (smoothstep)
    // CARVED CREEK CHANNEL — v1.36c: a deeper, cleaner U-channel. Distance to
    // the fork centerline drives a smooth scoop (~1.8m at the centerline, easing
    // to grade by ~4m out). The micro-relief below is SUPPRESSED inside the
    // channel so the floor is smooth and the water sits flat in it (no wobble
    // poking through the surface). Ground mesh, physics, BBs, AI all read this.
    const dToCreek = creekDist(x, z);
    const creekW = 4.0;
    let inChannel = 0;                            // 0 outside, →1 at centerline
    if (dToCreek < creekW) {
      const k = 1 - dToCreek / creekW;
      inChannel = k * k * (3 - 2 * k);            // smoothstep
      h -= 1.8 * inChannel;
    }
    // Riverbank lip: the last few meters before the WEST river drop dip down.
    if (x < -38) {
      const k = (-38 - x) / 8;                    // 0 at -38, 1 at -46
      h -= 1.4 * Math.max(0, Math.min(1, k));
    }
    // Gentle natural micro-relief — FADED OUT inside the creek channel so the
    // streambed stays smooth (water clipping came from this wobble).
    h += 0.28 * (1 - inChannel) * Math.sin(x * 0.12 + 0.6) * Math.cos(z * 0.10 - 1.1);
    return hollowRealScale(x, z, h);   // v1.307
  }
  // v1.307 (D.51 step 3, Michael: real scale, each match on a today-sized part (1A), the maps sharing an edge view (2A);
  // docs/refs/chattahoochee.md gaps 5-6): past the play box the ground is the real place's. Every term is zero inside
  // the box and on the perimeter tree ranks (x -43.6 to 52, z to ±44), so the matches play on the ground they had. Past
  // the ranks' west end the bank's clay cut drops 2.4 m to the river's bed (HW), the river runs 62 m wide, the far (Dunwoody)
  // bank rises from its own clay cut 46 m up a ~30° wooded slope. East of the field the floodplain runs on 14 m, then
  // the bluff climbs 24 m, up to the backs of the Bunratty houses.
  function hollowRealScale(x, z, h) {
    const ss = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
    if (x < HW.cutX) {
      h += (HW.bedY - h) * ss((HW.cutX - x) / 1.8);
      if (x < HW.farX) h = HW.bedY + 2.6 * ss((HW.farX - x) / 2) + 46 * ss((HW.farX - 3 - x) / 110);
    }
    if (x > 58) h += 24 * ss((x - 60) / 56);
    return h;
  }
  const groundY = hollowGroundY;

  // --- Terrain placement helpers (mirrors Bunratty exactly) ---
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

  function groundNormal(x, z) {
    const e = 0.75;
    const dx = (groundY(x + e, z) - groundY(x - e, z)) / (2 * e);
    const dz = (groundY(x, z + e) - groundY(x, z - e)) / (2 * e);
    const len = Math.hypot(-dx, 1, -dz) || 1;
    return { nx: -dx / len, ny: 1 / len, nz: -dz / len };
  }
  const _UP_Z = new THREE.Vector3(0, 0, 1);
  function layOnSlope(mesh, x, z, lift = 0.02) {
    const n = groundNormal(x, z);
    mesh.position.set(x, groundY(x, z) + lift, z);
    mesh.quaternion.setFromUnitVectors(_UP_Z, new THREE.Vector3(n.nx, n.ny, n.nz));
    return mesh;
  }

  // === Ground — forest floor, DISPLACED plane ===
  // v1.307 (D.51 step 3): the ground runs on past the box to the far bank and up the bluff (x -300..260, z -260..260).
  // Inside 150 x 150 m the grid is the old one vertex for vertex (1.5625 m); past it the cells grow to 6 m. A colour
  // per vertex (times the old floor) browns the woods' floor past the tree ranks and reddens the river's clay cuts, so
  // the field in play keeps its colour exactly.
  const groundGeo = new THREE.BufferGeometry();
  {
    const axis = (lo, hi) => {
      const v = [];
      for (let c = lo; c < -75 - 1e-6; c += 6) v.push(c);
      for (let i = 0; i <= 96; i++) v.push(-75 + 150 * i / 96);
      for (let c = 75 + 6; c < hi - 1e-6; c += 6) v.push(c);
      v.push(hi); return v;
    };
    const xs = axis(-300, 260), zs = axis(-260, 260);
    const pos = [], col = [], idx = [], mix = (a, b, t) => a + (b - a) * t;
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) {
      const x = xs[i], z = zs[j];
      pos.push(x, groundY(x, z), z);
      // multipliers on 0x3a4a2a: leaf litter past the ranks, red clay at the two cuts
      const out = Math.max(-38 - x, x - 52, Math.abs(z) - 44);
      const w = Math.max(0, Math.min(1, (out - 2) / 8));
      let r = mix(1, 1.15, w), g = mix(1, 0.8, w), b = mix(1, 0.95, w);
      const clay = Math.max(0, Math.min(1, Math.max(1.2 - Math.abs(x - (HW.cutX - 1)), 1.8 - Math.abs(x - (HW.farX - 1.4)))));
      r = mix(r, 1.6, clay); g = mix(g, 0.74, clay); b = mix(b, 0.97, clay);
      col.push(r, g, b);
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
  // Dark earthy forest-floor green (dirt-and-leaf-litter, not lawn).
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 1.0, vertexColors: true })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // Scatter a few darker dirt patches (flat decals laid on the slope) for the
  // worn-clearing look — cosmetic only.
  {
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x2e3a22, roughness: 1.0 });
    for (let i = 0; i < 10; i++) {
      const px = rng(-38, 40), pz = rng(-34, 34);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(rng(1.6, 3.2), 16), patchMat);
      layOnSlope(patch, px, pz, 0.015);
      patch.receiveShadow = true;
      scene.add(patch);
    }
  }

  // === Map bounds ===
  // Player can walk right up to the river's edge on the WEST (x≈-39) where a
  // blocker stops them at the bank; the river + far bank are visual beyond it.
  const bounds = { minX: -38, maxX: 44, minZ: -36, maxZ: 36 };
  const P = (x, z) => new THREE.Vector3(x, groundY(x, z), z);

  // ===================================================================
  // WEST RIVER — non-crossable, visible, FED BY THE CREEK. v1.36c: pulled the
  // near edge right up to the playable bank (x≈-39) and raised the surface so
  // it's clearly visible from shore (the old river sat ~18m past the wall and
  // ~1.7m down → invisible). The creek main run drains into it at the mouth.
  // ===================================================================
  const RIVER_Y = -1.0;                 // the creek's level at its mouth inside the box (v1.307: the river is HW.waterY)
  const treeObs = [];   // collidable trunks (river treeline is scenic, not pushed)
  {
    // v1.307 (D.51 step 3, docs/refs/chattahoochee.md gaps 4-6): the river at real scale, in the channel the ground
    // cuts past the bank's clay cut: 62 m of murky olive water (Michael: "more green/dark/murky"), opaque and matt, so
    // the cyan sheet, its shallows strip, the mud strip and the flat far-side strip are gone. The far bank and its
    // houses are the scenery's, below.
    const water = new THREE.Mesh(new THREE.PlaneGeometry(HW.cutX + 1 - (HW.farX - 2), 560),
      new THREE.MeshStandardMaterial({ color: 0x3e4430, roughness: 0.55, metalness: 0 }));   // reads #928f5c-ish under the noon sun
    water.rotation.x = -Math.PI / 2;
    water.position.set((HW.cutX + 1 + HW.farX - 2) / 2, HW.waterY, 0);
    water.receiveShadow = true; water.name = 'hollowRiver';
    scene.add(water);
    // v1.307: the 26 far-side trees are gone with the flat strip they stood on, but they are still built (into a
    // scene nobody sees) so their random numbers are drawn and every match's woods and cover land where they did
    const nowhere = new THREE.Scene();
    for (let i = 0; i < 26; i++) {
      const fx = rng(-92, -68);
      const fz = -80 + i * 6.3 + rng(-1.5, 1.5);
      const fsh = gameRandom() < 0.5 ? 'pine' : 'round';
      addSuburbanTree(nowhere, fx, fz, {
        shape: fsh, leafR: rng(2.2, 3.4), trunkH: rng(3.8, 6.5),
        leafColor: fsh === 'pine' ? (gameRandom() < 0.5 ? 0x254526 : 0x2c5230)
                                  : (gameRandom() < 0.5 ? 0x34521f : 0x3e5e26),
        baseY: RIVER_Y + 1.0, detail: true,
      });
    }
    // Hard blocker so the player can't enter the water/cross.
    // (Pushed into obstacles list at the end.)
    scene._riverBlocker = { minX: -120, maxX: -38.5, minZ: -90, maxZ: 90, h: 10, baseY: -4, surface: 'hard' };
  }

  // ===================================================================
  // PERIMETER TREELINES — N, S, E hard walls of trees (collidable trunks).
  // v1.36d: mixed deciduous (round) + pine (conifer) with WIDE height variation
  // — North-Georgia riverside forest is heavy loblolly/white pine over hardwood.
  // ===================================================================
  // North-Atlanta riverside mix: ~50% pine. Varied heights (understory → canopy).
  function treeShape() { return gameRandom() < 0.5 ? 'pine' : 'round'; }
  function pineColor() { return gameRandom() < 0.5 ? 0x274a2a : 0x305c33; }   // bluer green
  function leafColorDecid() { return gameRandom() < 0.5 ? 0x3a5e28 : 0x4a6a30; }
  function makeTree(x, z, sizeBias) {
    const sh = treeShape();
    // sizeBias 0..1 nudges toward taller; add big natural spread.
    const tall = gameRandom() < (0.30 + 0.4 * (sizeBias ?? 0.4));
    // v1.36e: PINES run taller (5–11m) — even "short" pines clear eye level so
    // the high skirt sits well overhead. Round/deciduous keep the wider spread.
    let trunkH;
    if (sh === 'pine') trunkH = tall ? rng(8.0, 11.5) : rng(5.0, 7.5);
    else               trunkH = tall ? rng(5.0, 8.5)  : rng(2.6, 4.6);
    const leafR = sh === 'pine'
      ? (tall ? rng(2.4, 3.4) : rng(1.8, 2.6))
      : (tall ? rng(2.8, 4.0) : rng(1.8, 2.8));
    return addSuburbanTree(scene, x, z, {
      shape: sh, trunkH, leafR,
      trunkR: tall ? rng(0.36, 0.5) : rng(0.26, 0.36),
      leafColor: sh === 'pine' ? pineColor() : leafColorDecid(),
      baseY: groundY(x, z), detail: true,   // v1.126: round trees are Winnmark's low-poly tree; pines stay
    });
  }
  function treeRow(x1, z1, x2, z2, count, jitter, sizeBias) {
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0 : i / (count - 1);
      const x = x1 + (x2 - x1) * t + rng(-jitter, jitter);
      const z = z1 + (z2 - z1) * t + rng(-jitter, jitter);
      treeObs.push(makeTree(x, z, sizeBias));
    }
  }
  // Three staggered ranks each side; outer ranks taller (canopy backdrop).
  treeRow(-42, -38, 44, -38, 30, 1.2, 0.4);
  treeRow(-42, -41, 44, -41, 26, 1.4, 0.6);
  treeRow(-42, -44, 44, -44, 22, 1.6, 0.85);
  treeRow(-42, 38, 44, 38, 30, 1.2, 0.4);
  treeRow(-42, 41, 44, 41, 26, 1.4, 0.6);
  treeRow(-42, 44, 44, 44, 22, 1.6, 0.85);
  treeRow(46, -42, 46, 42, 26, 1.2, 0.5);
  treeRow(49, -42, 49, 42, 22, 1.4, 0.7);
  treeRow(52, -42, 52, 42, 18, 1.6, 0.9);

  // ===================================================================
  // INTERIOR TREES — v1.36d: DOUBLED again (~110 interior trunks) with the same
  // pine/round mix + wide height variation. Procedural min-spacing scatter with
  // keep-out around forts and the creek channel. Each casts a shadow under the
  // high-noon sun (the trees ARE the shadow layer now).
  // ===================================================================
  {
    const anchorSpots = [
      [-30, -24], [-18, -28], [-8, -20], [-34, -10], [-24, -2], [-14, -12],
      [-32, 12], [-22, 20], [-10, 16], [-30, 26], [-16, 30],
      [12, -26], [24, -18], [34, -24], [18, -8], [30, -6], [40, -14],
      [14, 22], [26, 16], [36, 24], [20, 30], [38, 6], [10, 8],
    ];
    const placed = [];
    function blockedSpot(x, z) {
      if (Math.hypot(x - (-2), z - (-30)) < 7) return true;  // north fort
      if (Math.hypot(x - 2, z - 30) < 7) return true;        // south fort
      if (creekDist(x, z) < 4.5) return true;                // creek channel
      return false;
    }
    function tryPlace(x, z, minSep, sizeBias) {
      if (x < -40 || x > 44 || z < -35 || z > 35) return false;
      if (blockedSpot(x, z)) return false;
      for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < minSep) return false;
      placed.push([x, z]);
      treeObs.push(makeTree(x, z, sizeBias));
      return true;
    }
    // 1) Anchor cover trees (the ones you fight around) — moderate size.
    for (const [tx, tz] of anchorSpots) {
      tryPlace(tx + rng(-1.2, 1.2), tz + rng(-1.2, 1.2), 2.8, 0.45);
    }
    // 2) Dense fill — ~110 more, min 3.2m apart (tighter than before = doubled
    //    density) so it reads as real forest while still passable between trunks.
    let attempts = 0, added = 0;
    while (added < 110 && attempts < 1400) {
      attempts++;
      const x = rng(-39, 43), z = rng(-34, 34);
      if (tryPlace(x, z, 3.2, gameRandom())) added++;
    }
  }

  // (v1.36d: removed the floating high "canopy shadow layer" — those detached
  // crowns read as green blobs hovering with no trunk. With doubled tree density
  // and the high-noon sun, the actual trees cast all the shadow now.)

  // ===================================================================
  // CROSSABLE FORK CREEK — water that FOLLOWS the carved channel floor (v1.36c).
  // The old version laid ONE flat plane per segment at the segment's center
  // height, so on the sloping streambed it floated at the low end and sank at
  // the high end (the "blue rectangle hovering" bug). Now each segment is built
  // as a RIBBON of small quads stepped along the centerline; each quad sits at
  // the local water level = channel-floor + shallow fill, blended toward the
  // RIVER surface near the western mouth so the creek visibly drains into the
  // river. Width is kept just inside the 4m carve so blue never spills onto grass.
  // ===================================================================
  const creekObs = [];
  {
    const creekMat = new THREE.MeshStandardMaterial({   // v1.307: murky, a shade darker than the river (was 0x2f6f9e)
      color: 0x353a26, roughness: 0.5, metalness: 0,
      transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    });
    // Water-surface level at a creek point: floor + fill, but eased to the
    // river level over the last ~10m before the mouth (x≈-42) for a seamless join.
    function creekWaterY(x, z) {
      const floor = groundY(x, z);
      let lvl = floor + 0.4;
      if (x < -30) {
        const t = Math.max(0, Math.min(1, (-30 - x) / 12));  // 0 at -30 → 1 at -42
        lvl = lvl * (1 - t) + (RIVER_Y) * t;
      }
      if (x < -36) {   // v1.307: the river lies lower now (HW.waterY): the creek runs down to it at the mouth
        const t = Math.min(1, (-36 - x) / 7), k = t * t * (3 - 2 * t);
        lvl = creekWaterY(-36, z) * (1 - k) + HW.waterY * k;
      }
      return lvl;
    }
    // Build a ribbon along a straight centerline (ax,az)->(bx,bz), width w.
    function creekRibbon(ax, az, bx, bz, w) {
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(2, Math.ceil(len / 1.5));
      // unit perpendicular in XZ
      const dx = (bx - ax) / len, dz = (bz - az) / len;
      const px = -dz, pz = dx;                       // perpendicular
      const positions = [];
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i + 1) / steps;
        const cx0 = ax + (bx - ax) * t0, cz0 = az + (bz - az) * t0;
        const cx1 = ax + (bx - ax) * t1, cz1 = az + (bz - az) * t1;
        const hw = w / 2;
        // four corners of this quad (left/right of centerline at t0 and t1)
        const L0 = [cx0 + px * hw, creekWaterY(cx0, cz0), cz0 + pz * hw];
        const R0 = [cx0 - px * hw, creekWaterY(cx0, cz0), cz0 - pz * hw];
        const L1 = [cx1 + px * hw, creekWaterY(cx1, cz1), cz1 + pz * hw];
        const R1 = [cx1 - px * hw, creekWaterY(cx1, cz1), cz1 - pz * hw];
        // two triangles (L0,R0,L1) (R0,R1,L1)
        positions.push(...L0, ...R0, ...L1, ...R0, ...R1, ...L1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, creekMat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      // crossable zone AABB (for the future wade hook; NOT in physics obstacles)
      creekObs.push({
        minX: Math.min(ax, bx) - w / 2, maxX: Math.max(ax, bx) + w / 2,
        minZ: Math.min(az, bz) - w / 2, maxZ: Math.max(az, bz) + w / 2,
        h: 0.0, baseY: groundY((ax + bx) / 2, (az + bz) / 2), surface: 'water', crossable: true,
      });
    }
    // The fork — coords MATCH the carve centerlines exactly. Main run reaches
    // the river mouth at x=-42; widths just under the 4m carve.
    creekRibbon(CREEK_MAIN[0], CREEK_MAIN[1], CREEK_MAIN[2], CREEK_MAIN[3], 3.4);
    creekRibbon(CREEK_NW[0], CREEK_NW[1], CREEK_NW[2], CREEK_NW[3], 3.0);
    creekRibbon(CREEK_SE[0], CREEK_SE[1], CREEK_SE[2], CREEK_SE[3], 3.0);
    // Wet creek-bed rocks at the crossings (seated on the carved floor).
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 1.0 });
    for (const [sx, sz] of [[2, 0], [12, 0], [-6, -4], [16, 6], [-18, 0], [18, 0]]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8), stoneMat);
      st.position.set(sx, groundY(sx, sz) + 0.18, sz);
      st.castShadow = st.receiveShadow = true;
      scene.add(st);
    }
  }

  // ===================================================================
  // PALLET WALLS — the authored cover (orange in the sketch). Thin wood
  // panels, ~1.2m tall (stand-cover), in straight / L / T clusters. BBs
  // ricochet (surface:'hard'). Each returns an AABB obstacle.
  // ===================================================================
  const coverList = [];
  const palletMat = new THREE.MeshStandardMaterial({ color: 0x9a6f3a, roughness: 0.95 });
  const palletMatDark = new THREE.MeshStandardMaterial({ color: 0x7d5a2e, roughness: 0.95 });
  // One pallet panel centered at (x,z), length `len` along `axis` ('x'|'z'),
  // height h, thickness th. Slats drawn for the pallet look.
  function palletPanel(x, z, len, axis, h = 1.2, th = 0.22) {
    const w = axis === 'x' ? len : th;
    const d = axis === 'x' ? th : len;
    const grp = new THREE.Group();
    // Back board
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), palletMat);
    board.position.y = h / 2;
    board.castShadow = board.receiveShadow = true;
    grp.add(board);
    // Horizontal slat lines (3 darker slats) for the pallet read.
    for (let i = 0; i < 3; i++) {
      const sy = h * (0.22 + i * 0.28);
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'x' ? len * 0.98 : th + 0.04, h * 0.16, axis === 'x' ? th + 0.04 : len * 0.98),
        palletMatDark
      );
      slat.position.y = sy;
      grp.add(slat);
    }
    grp.position.set(x, 0, z);
    grp.castShadow = grp.receiveShadow = true;
    scene.add(grp);
    const obs = {
      minX: x - w / 2 - 0.04, maxX: x + w / 2 + 0.04,
      minZ: z - d / 2 - 0.04, maxZ: z + d / 2 + 0.04,
      h, surface: 'hard', mesh: grp, baseY: 0,
    };
    sinkObs(obs, x, z);
    return obs;
  }
  // Cluster helpers: straight, L, T. Push panels into coverList.
  function palletStraight(x, z, len, axis) { coverList.push(palletPanel(x, z, len, axis)); }
  function palletL(x, z, lenA, lenB) {
    // Corner at (x,z): one X-run east, one Z-run north, meeting at the corner.
    coverList.push(palletPanel(x + lenA / 2, z, lenA, 'x'));
    coverList.push(palletPanel(x, z + lenB / 2, lenB, 'z'));
  }
  function palletT(x, z, span, stem) {
    // Crossbar along X centered at (x,z); stem along Z going +z.
    coverList.push(palletPanel(x, z, span, 'x'));
    coverList.push(palletPanel(x, z + stem / 2, stem, 'z'));
  }
  // Placements mirror the sketch's distribution (north field, mid, south field).
  // -- North half (Team A approach) --
  palletStraight(-26, -16, 4.0, 'x');
  palletL(-12, -22, 3.6, 3.0);
  palletStraight(8, -14, 3.8, 'x');
  palletT(28, -12, 4.2, 3.0);
  palletStraight(-32, -4, 3.4, 'z');
  palletL(34, -4, 3.0, 3.4);
  // -- Mid (around the creek; the meat grinder) --
  palletStraight(-2, -6, 3.6, 'x');
  palletStraight(20, 4, 3.8, 'x');
  palletL(-16, 4, 3.4, 3.0);
  // -- South half (Team B approach) --
  palletT(-18, 16, 4.2, 3.2);
  palletStraight(6, 14, 3.8, 'x');
  palletL(24, 14, 3.4, 3.2);
  palletStraight(-26, 26, 3.6, 'x');
  palletStraight(30, 24, 3.4, 'x');
  // v1.45: extra cover to break up the open lanes (playtest: too much open
  // ground mid-field and on the approaches). Spread across both halves + mid,
  // offset from the existing clusters so they create new sightline breaks
  // rather than doubling up. Heights default to 1.2m (chest cover).
  // -- North approach fills --
  palletStraight(14, -24, 3.6, 'z');   // east-north lane
  palletL(-20, -10, 3.2, 2.8);         // west-north pocket
  // -- Mid-field (the open meat-grinder the player crosses) --
  palletT(2, 0, 4.0, 3.0);             // dead-center break on the road spine
  palletStraight(-28, 2, 3.4, 'x');    // far-west mid
  palletStraight(32, -2, 3.4, 'x');    // far-east mid
  palletL(10, 6, 3.0, 3.2);            // east-of-center, south of creek
  // -- South approach fills --
  palletStraight(-8, 22, 3.6, 'x');    // south-center lane
  palletT(18, 24, 4.0, 2.8);           // east-south lane

  // ===================================================================
  // OPEN REDOUBTS (Concept B) — a couple of mid-field advanced positions:
  // a chest-high pallet ring (crouch cover) with tires + a sandbag stack.
  // ===================================================================
  const redoubtObs = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 1.0 });
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8a7d54, roughness: 1.0 });
  function addRedoubt(cx, cz) {
    const h = 0.85;  // chest-high (crouch-safe, head exposed standing)
    // 3 short pallet panels in a loose horseshoe opening toward nearest spawn.
    redoubtObs.push(palletPanelLow(cx - 1.8, cz, 3.0, 'z', h));
    redoubtObs.push(palletPanelLow(cx + 1.8, cz, 3.0, 'z', h));
    redoubtObs.push(palletPanelLow(cx, cz - 1.8, 3.4, 'x', h));
    // Tire on its side as low cover.
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 8, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(cx + 1.0, groundY(cx + 1.0, cz + 1.4) + 0.24, cz + 1.4);
    tire.castShadow = true; scene.add(tire);
    // Sandbag stack (two stacked boxes).
    for (let i = 0; i < 2; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.6), sandbagMat);
      bag.position.set(cx - 1.0, groundY(cx - 1.0, cz + 1.2) + 0.2 + i * 0.42, cz + 1.2);
      bag.castShadow = bag.receiveShadow = true; scene.add(bag);
    }
    redoubtObs.push(sinkObs({
      minX: cx - 1.7, maxX: cx - 0.3, minZ: cz + 0.9, maxZ: cz + 1.5,
      h: 0.84, surface: 'soft', baseY: 0,
    }, cx - 1.0, cz + 1.2));
  }
  // A simplified low pallet panel (no slats) for redoubts.
  function palletPanelLow(x, z, len, axis, h) {
    const th = 0.2;
    const w = axis === 'x' ? len : th;
    const d = axis === 'x' ? th : len;
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), palletMat);
    board.position.set(x, h / 2, z);
    board.castShadow = board.receiveShadow = true;
    scene.add(board);
    const obs = {
      minX: x - w / 2 - 0.04, maxX: x + w / 2 + 0.04,
      minZ: z - d / 2 - 0.04, maxZ: z + d / 2 + 0.04,
      h, surface: 'hard', mesh: board, baseY: 0,
    };
    sinkObs(obs, x, z);
    return obs;
  }
  addRedoubt(-14, 8);    // NW of the creek, clear of the channel
  addRedoubt(26, -8);    // NE, clear of the SE offshoot and main run

  // ===================================================================
  // FORTS (Concept A) — a pallet-walled bunker at each spawn: walls on three
  // sides with a firing PORT in the front wall, a back LOOKOUT platform, a
  // partial plywood ROOF, and a team FLAG. Asymmetric: Team A (north) = RED
  // flag, lookout LEFT, tire stack out front; Team B (south) = BLUE flag,
  // lookout RIGHT, plywood lean-to. Returns a list of obstacle AABBs.
  // ===================================================================
  const fortObs = [];
  const plywoodMat = new THREE.MeshStandardMaterial({ color: 0x8a6f43, roughness: 0.95 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4528, roughness: 1.0 });
  // Build a fort centered at (cx,cz). `facing` = +1 if the OPEN front faces
  // +z (south, Team A looking toward midfield), -1 if it faces -z (Team B).
  function addFort(cx, cz, opts) {
    const o = opts || {};
    const facing = o.facing || 1;            // +1: front (port) toward +z
    const flagColor = o.flagColor || 0xc0392b;
    const lookoutSide = o.lookoutSide || -1;  // -1 left (−x), +1 right (+x)
    const W = 7.0, D = 6.0, wallH = 2.6, th = 0.3;  // footprint + wall height
    // v1.47: wallH 1.8→2.6. The v1.45 drop to 1.8 (to let standing muzzles clear
    // the window sill) also dragged the whole fort top + the doorway header down
    // to head height — you felt like you were ducking through the port. Decouple
    // the two: keep the LOW window sill (winB 0.75, the actual cross-wall-trade
    // fix) but raise the wall tall again so the doorway lintel (wallH-0.14 =
    // 2.46m) clears the player's 1.35m eye / 1.5m head with real headroom, and
    // make the window itself taller (winT 1.55→1.85) for a bigger firing slot.
    const list = [];
    const grp = new THREE.Group();
    const backZ = cz - facing * (D / 2);   // back wall opposite the open front
    // Add a wall box in WORLD coords; record its AABB obstacle.
    function worldWall(wx, wz, w, h, d, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || palletMat);
      m.position.set(wx, h / 2, wz);
      m.castShadow = m.receiveShadow = true;
      grp.add(m);
      list.push({
        minX: wx - w / 2 - 0.04, maxX: wx + w / 2 + 0.04,
        minZ: wz - d / 2 - 0.04, maxZ: wz + d / 2 + 0.04,
        h, surface: 'hard', baseY: 0,
      });
    }
    const frontZ = cz + facing * (D / 2);
    const leftX = cx - W / 2, rightX = cx + W / 2;
    // A WALL WITH FIRING WINDOWS (v1.36b). Built as a solid LOWER band (0..winB,
    // blocks movement + gives crouch cover) plus an UPPER band (winT..wallH)
    // split into segments that leave `nWin` window GAPS. The gaps have no
    // geometry between winB and winT, so BBs and your line of sight pass
    // straight through at standing/shoulder height — you stand at the wall and
    // shoot out the window. Movement is still fully blocked by the lower band.
    // axis 'x' = wall runs along X (front/back walls); 'z' = along Z (sides).
    function windowedWall(cxw, czw, span, axis, nWin) {
      // v1.345 (B.17, Michael: A, "a taller wall"): the walled fort's solid wall is 1.15 m, so crouched (eye 0.8 m) you
      // are under the sill, and standing (eye 1.35 m, where your BBs leave from) you fire out of a 0.7 m slot.
      const winB = o.walls ? 1.15 : 0.75, winT = 1.85;        // window opening 0.75m–1.85m (v1.47)
      // Sill at 0.75m (a standing ~1.05m muzzle is mid-opening, not clipping the
      // lower band). Top raised to 1.85m (v1.47, was 1.55) for a taller 1.1m
      // firing slot now that the wall is 2.6m. Lower band 0–0.75m still blocks
      // movement + crouched bodies, so the fort is still real cover — you just
      // can't both stand and be immune across a single wall.
      const lowMat = palletMat;
      // Lower solid band (full span).
      const lowW = axis === 'x' ? span : th, lowD = axis === 'x' ? th : span;
      const low = new THREE.Mesh(new THREE.BoxGeometry(lowW, winB, lowD), lowMat);
      low.position.set(cxw, winB / 2, czw);
      low.castShadow = low.receiveShadow = true; grp.add(low);
      list.push({ minX: cxw - lowW / 2 - 0.04, maxX: cxw + lowW / 2 + 0.04,
                  minZ: czw - lowD / 2 - 0.04, maxZ: czw + lowD / 2 + 0.04,
                  h: winB, surface: 'hard', baseY: 0 });
      // Top band above the windows (full span, winT..wallH).
      const topH = wallH - winT;
      const top = new THREE.Mesh(new THREE.BoxGeometry(lowW, topH, lowD), lowMat);
      top.position.set(cxw, winT + topH / 2, czw);
      top.castShadow = true; grp.add(top);
      list.push({ minX: cxw - lowW / 2 - 0.04, maxX: cxw + lowW / 2 + 0.04,
                  minZ: czw - lowD / 2 - 0.04, maxZ: czw + lowD / 2 + 0.04,
                  h: topH, surface: 'hard', baseY: winT });
      // Mid band (winB..winT) split into POSTS leaving nWin window gaps. With
      // nWin windows there are nWin+1 posts. Window width ~0.9m, posts fill rest.
      const winW = 0.9;
      const totalWin = nWin * winW;
      const postSpan = (span - totalWin) / (nWin + 1);
      const along = axis === 'x' ? cxw - span / 2 : czw - span / 2;
      let cursor = along;
      for (let i = 0; i <= nWin; i++) {
        // post
        const pCenter = cursor + postSpan / 2;
        const pW = axis === 'x' ? postSpan : th, pD = axis === 'x' ? th : postSpan;
        const px = axis === 'x' ? pCenter : cxw, pz = axis === 'x' ? czw : pCenter;
        if (postSpan > 0.05) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(pW, winT - winB, pD), palletMatDark);
          post.position.set(px, (winB + winT) / 2, pz);
          post.castShadow = true; grp.add(post);
          list.push({ minX: px - pW / 2 - 0.04, maxX: px + pW / 2 + 0.04,
                      minZ: pz - pD / 2 - 0.04, maxZ: pz + pD / 2 + 0.04,
                      h: winT - winB, surface: 'hard', baseY: winB });
        }
        cursor += postSpan + winW;   // skip the window gap
      }
    }
    // Back wall — 2 windows. Side walls — 2 windows each. (Three shooting walls.)
    windowedWall(cx, backZ, W, 'x', 2);
    windowedWall(leftX, cz, D, 'z', 2);
    windowedWall(rightX, cz, D, 'z', 2);
    // Front wall with a PORT: two short segments leaving a wide doorway gap.
    // (v1.36a: widened 2.2→2.8 so there's comfortable clearance past the AABB
    // padding — you can walk through without hugging the exact center.)
    // v1.42: the two flanking segments now have firing windows too (1 each), so
    // the FRONT wall is a shooting wall like the other three — you can hold the
    // port and fire out the front without standing fully in the doorway. Each
    // segment is ~2.1m wide, comfortable for a single 0.9m window.
    const portGap = 2.8, segW = (W - portGap) / 2;
    const leftSegCx = cx - (portGap / 2 + segW / 2);
    const rightSegCx = cx + (portGap / 2 + segW / 2);
    windowedWall(leftSegCx, frontZ, segW, 'x', 1);
    windowedWall(rightSegCx, frontZ, segW, 'x', 1);
    // A header beam across the TOP of the port (a doorframe lintel) so the
    // opening reads as a built doorway — but NO collision, so it's a true
    // walk-through. (v1.36a: the old waist-high sill had a 0.5m collision AABB
    // that walled off the only exit — feet-level obstacles block movement.)
    const header = new THREE.Mesh(new THREE.BoxGeometry(portGap, 0.28, th), palletMatDark);
    header.position.set(cx, wallH - 0.14, frontZ);   // tucked under the wall top
    header.castShadow = true; grp.add(header);
    // v1.259 (backlog D.42, Michael 15 Oct: "The fort(s) in the Chattahoochee River zone are kind of ugly ... a bunch of
    // random intersecting meshes, and it almost feels like you're at more of a disadvantage being inside them. There
    // should be a staircase/ramp of some sort inside, to allow you to get to the top of the fort, so you can have high
    // ground & some cover up top (like wooden crenellations)"). The cosmetic lookout deck (its posts through the window
    // band), the pitched part-roof sunk into the walls and Team B's lean-to through its side wall are gone. In their
    // place: a plank DECK over the front half at the walls' top (2.6 m), stood on; a RAMP along the `lookoutSide` wall
    // from the back corner up to a landing beside the deck; wooden CRENELLATIONS on the front and side walls round the
    // deck (0.9 m merlons, 0.45 m gaps to shoot through) and a rail along the deck's open back edge. The ramp is a
    // player-only slope (obstacle `ramp`, rampTopAt): its foot is a 0.2 m step, so a kid's terrain-footed body is stopped
    // by it and never walks up; BBs pass it (bbPass), as they would the gaps of a plank ramp.
    const deckTop = wallH, deckT = 0.15, RW = 1.0, s = lookoutSide;
    const inL = leftX + th / 2, inR = rightX - th / 2;                       // the walls' inner faces
    const inFront = frontZ - facing * th / 2, inBack = backZ + facing * th / 2;
    const stripIn = cx + s * (W / 2 - th / 2), stripOut = stripIn - s * RW;   // the ramp's strip against the side wall
    const deckMinX = s < 0 ? stripOut : inL, deckMaxX = s < 0 ? inR : stripOut;
    const deckMinZ = Math.min(cz, inFront), deckMaxZ = Math.max(cz, inFront);
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.92 });
    {   // the deck: planks across a pair of joists
      const n = 9, dz = (deckMaxZ - deckMinZ) / n;
      for (let i = 0; i < n; i++) {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(deckMaxX - deckMinX, deckT, dz - 0.02), i % 3 ? plankMat : plywoodMat);
        pl.position.set((deckMinX + deckMaxX) / 2, deckTop - deckT / 2, deckMinZ + dz * (i + 0.5));
        pl.castShadow = pl.receiveShadow = true; grp.add(pl);
      }
      for (const jx of [deckMinX + 0.6, deckMaxX - 0.6]) {
        const j = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, deckMaxZ - deckMinZ), postMat);
        j.position.set(jx, deckTop - deckT - 0.08, (deckMinZ + deckMaxZ) / 2); grp.add(j);
      }
      list.push({ minX: deckMinX, maxX: deckMaxX, minZ: deckMinZ, maxZ: deckMaxZ, h: deckT, surface: 'hard', baseY: deckTop - deckT });
    }
    // crenellations: merlons along a wall's top over the deck's run
    // v1.345 (B.17, Michael: A): the walled fort's merlons are 1.25 m (crouched on the deck, eye 0.8 m, you are under
    // them; standing, your eye is just over) and its crenels 0.35 m, where the others' are 0.9 m and 0.45 m.
    const merH = o.walls ? 1.25 : 0.9;
    function merlons(axis, at, from, to) {
      const mw = o.walls ? 0.6 : 0.5, gap = o.walls ? 0.35 : 0.45, len = to - from, n = Math.max(1, Math.floor((len + gap) / (mw + gap)));
      const used = n * mw + (n - 1) * gap, start = from + (len - used) / 2;
      for (let i = 0; i < n; i++) {
        const c = start + mw / 2 + i * (mw + gap);
        const w = axis === 'x' ? mw : th + 0.02, d = axis === 'x' ? th + 0.02 : mw;
        const mx = axis === 'x' ? c : at, mz = axis === 'x' ? at : c;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, merH, d), i % 2 ? palletMat : palletMatDark);
        m.position.set(mx, deckTop + merH / 2, mz); m.castShadow = true; grp.add(m);
        list.push({ minX: mx - w / 2 - 0.04, maxX: mx + w / 2 + 0.04, minZ: mz - d / 2 - 0.04, maxZ: mz + d / 2 + 0.04,
                    h: merH, surface: 'hard', baseY: deckTop, noStand: true });
      }
    }
    merlons('x', frontZ, leftX, rightX);
    merlons('z', leftX, deckMinZ, deckMaxZ);
    merlons('z', rightX, deckMinZ, deckMaxZ);
    {   // the rail along the deck's back edge, over the inside of the fort
      const rz = facing > 0 ? deckMinZ : deckMaxZ, rl = deckMaxX - deckMinX;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rl, 0.1, 0.08), palletMatDark);
      rail.position.set((deckMinX + deckMaxX) / 2, deckTop + 0.85, rz); grp.add(rail);
      for (const px of [deckMinX + 0.06, (deckMinX + deckMaxX) / 2, deckMaxX - 0.06]) {
        const rp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), postMat);
        rp.position.set(px, deckTop + 0.45, rz); grp.add(rp);
      }
      list.push({ minX: deckMinX, maxX: deckMaxX, minZ: rz - 0.08, maxZ: rz + 0.08, h: 0.9, surface: 'hard', baseY: deckTop, noStand: true });
    }
    {   // the ramp: a 0.2 m step at the back corner (0.6 m deep, stepped onto from the side), up to 2.6 m, then a landing
      const z0 = inBack + facing * 0.15, z1 = inFront - facing * 0.15, LAND = 0.85, y0 = 0.2;
      const FOOT = 0.6 / Math.abs(z1 - z0), zF = z0 + (z1 - z0) * FOOT;
      const zL = z0 + (z1 - z0) * LAND, run = Math.abs(zL - zF), rise = deckTop - y0;
      const rx = (stripIn + stripOut) / 2, slope = Math.atan2(rise, run), len = Math.hypot(run, rise);
      const board = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.04, 0.06, len), plankMat);
      board.position.set(rx, (y0 + deckTop) / 2 - 0.03, (zF + zL) / 2);
      board.rotation.x = -facing * slope; board.castShadow = board.receiveShadow = true; grp.add(board);
      for (let d = 0.3; d < len - 0.1; d += 0.35) {   // cleats to step on
        const f = d / len, cl = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.1, 0.04, 0.05), postMat);
        cl.position.set(rx, y0 + rise * f + 0.01, zF + (zL - zF) * f); cl.rotation.x = -facing * slope; grp.add(cl);
      }
      const land = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.04, deckT, Math.abs(z1 - zL) + 0.1), plankMat);
      land.position.set(rx, deckTop - deckT / 2, (zL + z1) / 2); land.castShadow = true; grp.add(land);
      const stepM = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.04, y0, Math.abs(zF - z0) + 0.15), plankMat);
      stepM.position.set(rx, y0 / 2, (z0 + zF) / 2 - facing * 0.075); stepM.receiveShadow = true; grp.add(stepM);
      for (const f of [0.45, 1]) {   // posts under the board and the landing, on the open side
        const ph = y0 + rise * f, pz = zF + (zL - zF) * f;
        const pp = new THREE.Mesh(new THREE.BoxGeometry(0.1, ph, 0.1), postMat);
        pp.position.set(stripOut + s * 0.06, ph / 2, pz); grp.add(pp);
      }
      list.push({ minX: Math.min(stripIn, stripOut), maxX: Math.max(stripIn, stripOut), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1),
                  h: deckTop, surface: 'hard', baseY: 0, bbPass: true, ramp: { z0, z1, y0, y1: deckTop, foot: FOOT, land: LAND } });
    }
    // v1.345 (B.17, Michael: A on "Hold the South Fort is still lost before the first tag", 26 Oct: "a taller wall and
    // better crenellations", his B.13 note's "retaining wall"): every BB that tagged you on the fort floor came in by the
    // port, 2.8 m wide and open to the north (Devon from 37 m, Seth and Sean from 20 m). The walled fort has a blast
    // wall 1.6 m out from the port, as tall as the fort's walls and 1.6 m wider than the port: three stacked logs (the
    // map guide's log-cabin course, docs/refs/chattahoochee.md) under grey scrap boards. You walk round either end
    // into the port; the floor is out of a straight line from the field.
    if (o.walls) {
      const bwW = portGap + 1.6, bwT = 0.4, bwZ = frontZ + facing * 1.6, logR = 0.19, sink = 0.3;
      const logMat = new THREE.MeshStandardMaterial({ color: 0x706855, roughness: 1.0 });
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x979b91, roughness: 0.95 });
      for (let i = 0; i < 3; i++) {
        const lg = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR * 1.06, bwW + 0.2 - i * 0.12, 9), logMat);
        lg.rotation.z = Math.PI / 2; lg.position.set(cx + (i - 1) * 0.04, logR + i * logR * 1.9, bwZ);
        lg.castShadow = lg.receiveShadow = true; grp.add(lg);
      }
      const logTop = logR * 2 * 2.9, nb = 7, bw = bwW / nb;
      for (let i = 0; i < nb; i++) {   // boards nailed upright above the logs, a little uneven
        const bh = wallH - logTop + 0.12 - (i % 3) * 0.07;
        const bd = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, bh, 0.06), i % 2 ? boardMat : plywoodMat);
        bd.position.set(cx - bwW / 2 + bw * (i + 0.5), logTop - 0.12 + bh / 2, bwZ + facing * 0.12);
        bd.castShadow = bd.receiveShadow = true; grp.add(bd);
      }
      for (const ex of [-1, 1]) {   // a post at each end the boards are nailed to, down into the ground
        const pp = new THREE.Mesh(new THREE.BoxGeometry(0.14, wallH + sink, 0.14), postMat);
        pp.position.set(cx + ex * (bwW / 2 - 0.07), (wallH - sink) / 2, bwZ + facing * 0.12); grp.add(pp);
      }
      const under = new THREE.Mesh(new THREE.BoxGeometry(bwW, sink, bwT), logMat);   // the bottom log bedded in, on a slope
      under.position.set(cx, -sink / 2, bwZ); grp.add(under);
      list.push({ minX: cx - bwW / 2 - 0.04, maxX: cx + bwW / 2 + 0.04, minZ: bwZ - bwT / 2 - 0.04, maxZ: bwZ + bwT / 2 + 0.04,
                  h: wallH, surface: 'hard', baseY: 0, blastWall: true });
    }
    // Asymmetric extra: Team A gets a tire stack out front; Team B a lean-to.
    if (o.frontTires) {
      for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 8, 14), tireMat);
        tire.position.set(cx - 1.6, 0.2 + i * 0.42, frontZ + facing * 1.2);
        tire.rotation.x = Math.PI / 2; grp.add(tire);
      }
      list.push({ minX: cx - 2.1, maxX: cx - 1.1, minZ: frontZ + facing * 1.2 - 0.5,
                  maxZ: frontZ + facing * 1.2 + 0.5, h: 1.1, surface: 'hard', baseY: 0 });
    }
    // FLAG — pole + triangular pennant in the team color, at the back corner.
    const flagX = cx - lookoutSide * (W / 2 - 0.6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), postMat);
    pole.position.set(flagX, 1.8, backZ - facing * 0.3);   // v1.259: behind the back wall, not in it
    grp.add(pole);
    const pennant = new THREE.Mesh(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.4, -0.25, 0), new THREE.Vector3(0, -0.9, 0),
      ]),
      new THREE.MeshStandardMaterial({ color: flagColor, roughness: 0.9, side: THREE.DoubleSide })
    );
    pennant.geometry.setIndex([0, 1, 2]);
    pennant.geometry.computeVertexNormals();
    pennant.position.set(flagX + 0.06, 3.3, backZ - facing * 0.3);
    grp.add(pennant);
    // Seat the whole fort group on terrain (use the back-center ground height).
    // v1.36b: ADD fortGy to each AABB's LOCAL baseY (was overwriting it, which
    // flattened the layered window bands to a single height and erased the
    // shoot-through gaps). Now local [0, winB, winT] bands lift together.
    const fortGy = groundY(cx, backZ);
    grp.position.y += fortGy;
    for (const ob of list) {
      ob.baseY = (ob.baseY || 0) + fortGy;
      if (ob.ramp) { ob.ramp.y0 += fortGy; ob.ramp.y1 += fortGy; }   // v1.259
    }
    scene.add(grp);
    return list;
  }
  // Team A fort — NORTH end (z≈-30), front/port faces SOUTH (+z toward midfield),
  // RED flag, ramp on the LEFT (v1.259), tires out front.
  fortObs.push(...addFort(-2, -30, { facing: 1, flagColor: 0xc0392b, lookoutSide: -1, frontTires: true }));
  // Team B fort — SOUTH end (z≈30), front/port faces NORTH (-z toward midfield),
  // BLUE flag, ramp on the RIGHT (v1.259: the lean-to is gone).
  // v1.345 (B.17): in Hold the South Fort (variant 'south_fort_walls') it has the blast wall and the taller merlons.
  fortObs.push(...addFort(2, 30, { facing: -1, flagColor: 0x2e6da4, lookoutSide: 1, walls: variant === 'south_fort_walls' }));

  // ===================================================================
  // ANCHORS & SPAWNS
  // ===================================================================
  // Fighting anchors spread across the field for a 5v5: each team gets a
  // base anchor (at its fort) plus forward positions at pallet clusters.
  const placements = {
    // Team A (north) anchors
    a_fort:       { pos: P(-2, -27),  cover: fortObs[0] },
    a_left:       { pos: P(-26, -16), cover: coverList[0] },
    a_right:      { pos: P(28, -12),  cover: coverList[3] },
    a_center:     { pos: P(-2, -6),   cover: coverList[6] },
    a_creek:      { pos: P(20, 4),    cover: coverList[7] },
    // Team B (south) anchors
    b_fort:       { pos: P(2, 27),    cover: fortObs[0] },
    b_left:       { pos: P(-18, 16),  cover: coverList[9] },
    b_right:      { pos: P(24, 14),   cover: coverList[11] },
    b_center:     { pos: P(6, 14),    cover: coverList[10] },
    b_creek:      { pos: P(-16, 4),   cover: coverList[8] },
    // Redoubts (neutral mid cover) — positions match the v1.36d relocation.
    redoubt_w:    { pos: P(-14, 8),   cover: redoubtObs[0] },
    redoubt_e:    { pos: P(26, -8),   cover: redoubtObs[0] },
    // Extra scatter anchors for big 10-player modes (FFA / Infection).
    scatter_nw:   { pos: P(-34, -22), cover: null },
    scatter_ne:   { pos: P(36, -20),  cover: null },
    scatter_sw:   { pos: P(-32, 24),  cover: null },
    scatter_se:   { pos: P(34, 22),   cover: null },
    scatter_w:    { pos: P(-30, 0),   cover: null },
    scatter_e:    { pos: P(38, 0),    cover: null },
    // Staging clusters (one per team end)
    cluster_north: { pos: P(0, -33),  cover: null },
    cluster_south: { pos: P(0, 33),   cover: null },
    // v1.309 (D.51 step 4; the night rule of no line from a start, Michael A on Lamplight, 15 Oct): the night team
    // matches' huddle. From cluster_north, 64 m straight up the field, Mason's sniper (and in Full-Auto Mayhem Mitchell
    // and Ryan) had a line to your start at the south fort. This is the thicket north-east of the north fort, 61.5 m
    // out, and no point of the huddle's ring sees your start or a step round it, at any height, in the woods of the
    // three night matches that use it.
    cluster_north_night: { pos: P(19, -27), cover: null },
    // v1.265 (decisions, Michael: A, the lot's rule on every free-for-all): the Ten-Way Free-for-All's starts. Four
    // pairs were 9.5–14.7 m apart, Brooke 14.7 m from your midfield start among them. Each start is 19.5 m or more
    // from every other, and every kid has another kid's start nearer than yours, in the Pickup Game's order
    // (PICKUP_MAPS ffaOrder) at every size, and no kid can see your start from his.
    // v1.267 (decisions, "The Hollow's free-for-all", Michael: A): the woods are the same every build now
    // (gameRandom), so the starts were searched again in them: nobody can see anybody from his start, from the start
    // or 0.3 m off it, every start stands 20 m or more from every other, and every kid's is 30 m or more from yours
    // (Eric, 25 m off, tagged a player standing at the start at 3.9 s in 2 of 14 rounds).
    ffa_1: { pos: P(12, -22),     cover: null },   // east of the north fort
    ffa_2: { pos: P(15, 8),       cover: null },   // was midfield, in sight of half the field
    ffa_3: { pos: P(-6.5, -30.5), cover: null },   // behind the north fort
    ffa_4: { pos: P(39, 22),      cover: null },
    ffa_5: { pos: P(40.5, -25.5), cover: null },
    ffa_6: { pos: P(-8.5, 23.5),  cover: null },   // west of the south fort
    ffa_7: { pos: P(18.5, 28),    cover: null },
    ffa_8: { pos: P(-31.5, 18.5), cover: null },
    ffa_9: { pos: P(32, -6.5),    cover: null },
  };

  const playerSpawns = {
    // v1.109: yaw 0 faces -z; these two were swapped, so a team_b start looked at the south fort's back wall
    team_a:  { pos: P(-2, -28), yaw: Math.PI },     // in the north fort, facing south (+z)
    // v1.124: (2, 28) stood in the south fort's front doorway (port x 0.6–3.4, wall z 27), in the sniper's line from
    // the north fort (a_fort, -2, -27). The back-left of the fort, under the roof, puts the front wall's inner post
    // (x 0–0.6) on that line and still looks out through the port.
    team_b:  { pos: P(0.5, 32.3), yaw: 0 },         // in the south fort, facing north (-z)
    midfield:{ pos: P(0, 0),    yaw: 0 },
    ffa_west:{ pos: P(-34, -18.5), yaw: -Math.PI / 2 },   // v1.265: the free-for-all's, in the west woods facing east (v1.267: 11 m south-west, 30 m from every kid)
  };

  // === v1.308 (D.51 step 3, docs/refs/chattahoochee.md gap 1; Michael: "relatively clear in this space, but around the
  // 'battlefield' and off of the main trails, it was pretty thick"): fallen logs and deadfall piles round the field's
  // edge, inside the box, as cover; the middle stays as it was. Fixed spots, each taken only where it is clear of every
  // trunk and piece of cover by 0.6 m, 3.5 m from every start and anchor, 7 m from the forts and 4.5 m from the creek
  // (the trees are seeded per match, so a match can have fewer). Logs lie along x or z (0.48 m: crouch cover, BBs
  // stop); a deadfall pile is 1.2 m of grey branches. Pushed onto the end of coverList, so no placement's index moves.
  {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x706855, roughness: 1 }), endMat = new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1 });
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x595d59, roughness: 1 });
    const solid = [...treeObs, ...coverList, ...redoubtObs, ...fortObs];
    const pts = [...Object.values(placements).map(p => p.pos), ...Object.values(playerSpawns).map(p => p.pos)];
    const fits = (x0, x1, z0, z1, keep) => {
      if (solid.some(o => o.maxX > x0 - 0.6 && o.minX < x1 + 0.6 && o.maxZ > z0 - 0.6 && o.minZ < z1 + 0.6)) return false;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = Math.hypot(x1 - x0, z1 - z0) / 2;
      if (pts.some(p => Math.hypot(p.x - cx, p.z - cz) < r + keep)) return false;
      if (Math.hypot(cx + 2, cz + 30) < 7 + r || Math.hypot(cx - 2, cz - 30) < 7 + r) return false;
      if (creekDist(cx, cz) < 4.5 + r) return false;
      return true;
    };
    const LOGS = [[-35, -28, 5, 'x'], [-34.5, 9, 5.5, 'z'], [-33, 30.5, 5, 'x'], [40, -31, 5, 'x'], [41, 12, 4.5, 'z'], [39, 31.5, 5, 'x'],
      [-20, -33.5, 5, 'x'], [22, -33.5, 4.5, 'x'], [-18, 33.5, 5, 'x'], [25, 33.5, 4.5, 'x']];
    for (const [x, z, len, ax] of LOGS) {
      const R = 0.24, hw = ax === 'x' ? len / 2 : R, hd = ax === 'x' ? R : len / 2;
      if (!fits(x - hw, x + hw, z - hd, z + hd, 3.5)) continue;
      const g = new THREE.Group();
      const log = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.1, len, 9), barkMat);
      log.rotation.z = Math.PI / 2; if (ax === 'z') log.rotation.y = Math.PI / 2;
      log.position.y = R; log.castShadow = log.receiveShadow = true; g.add(log);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(R * 0.95, 9), endMat); e.position.set(ax === 'x' ? s * (len / 2 + 0.005) : 0, R, ax === 'z' ? s * (len / 2 + 0.005) : 0); e.rotation.y = ax === 'x' ? s * Math.PI / 2 : (s > 0 ? 0 : Math.PI); g.add(e); }
      g.position.set(x, 0, z); scene.add(g);
      const obs = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, h: 2 * R, surface: 'wood', mesh: g, baseY: 0, hollowLog: true };
      sinkObs(obs, x, z); coverList.push(obs); solid.push(obs);
    }
    for (const [x, z] of [[-36, -12], [42, -19], [-36, 21]]) {
      const w = 3.2, d = 2.4;
      if (!fits(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 3.5)) continue;
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) {   // grey branches heaped criss-cross
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.6 + (i % 3) * 0.5, 5), deadMat);
        b.rotation.z = Math.PI / 2 - 0.25 + (i % 2) * 0.5; b.rotation.y = i * 0.7;
        b.position.set(((i * 37) % 7 - 3) * 0.3, 0.2 + (i % 4) * 0.25, ((i * 53) % 5 - 2) * 0.35); b.castShadow = true; g.add(b);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), deadMat); core.scale.set(w * 0.45, 0.75, d * 0.45); core.position.y = 0.3; g.add(core);
      g.position.set(x, 0, z); scene.add(g);
      const obs = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h: 1.2, surface: 'soft', mesh: g, baseY: 0, hollowDeadfall: true };
      sinkObs(obs, x, z); coverList.push(obs); solid.push(obs);
    }
  }

  // === v1.307 (D.51 step 3): past the box, at real scale ===
  // The floodplain woods up and down the river and the bluff behind the field (tall hardwoods, a minority of pines),
  // thicket and deadfall between the bounds and the tree ranks (Michael: "pretty thick" off the trails), the near bank's
  // driftwood and a fallen tree lying into the water, across the river the far bank's wooded slope with big houses up
  // top and a few houses down against the water with their docks, and the dirt trail down the bluff into the field,
  // with the WIZARD HOLLOW sign on a big oak at its head. Its own seeded numbers, so no match's cover moves; one mesh
  // by day, two at night, and nothing solid. The thicket stands from 2 m past the bounds; BBs are dropped there.
  {
    const rs = _mulberry32(_hashStringToSeed('hollow-real|' + (_night ? 'n' : 'd'))), rr = (a, b) => a + (b - a) * rs();
    const items = [], gY = groundY;
    const LEAF = [0x4f5839, 0x5d6b3a, 0x4a5a32, 0x566634, 0x45522e], PINE = [0x2a4a2a, 0x2e5030, 0x264426];
    const SHRUB = [0x4f5d31, 0x46542c, 0x56643a], LOG = 0x706855, DEAD = 0x595d59, DRIFT = 0x6a5b48, BLEACH = 0xc9b79b;
    const TRAIL_Z = 10;   // the trail comes down the bluff into the field from the east
    const outBox = (x, z) => Math.max(-38 - x, x - 44, Math.abs(z) - 36);
    // the woods: nothing within the tree ranks (x to 52, z to ±44) or 12 m of the bounds, nothing in the river
    for (let gx = -300; gx <= 260; gx += 10) for (let gz = -260; gz <= 260; gz += 10) {
      const x = gx + rr(-4, 4), z = gz + rr(-4, 4), pick = rs(), kind = rs(), hh = rs(), cc = rs();
      if (Math.max(-50 - x, x - 56, Math.abs(z) - 48) < 0) continue;
      if (x < HW.cutX + 2 && x > HW.farX - 3) continue;                              // the river
      if (Math.hypot(x, z) > 330 || (Math.hypot(x, z) > 190 && pick < 0.35) || pick < 0.12) continue;
      if (x > 50 && Math.abs(z - TRAIL_Z) < 3.5) continue;                           // the trail
      if (x < HW.farX && x > -160 && pick < 0.45) continue;                          // the far slope, open enough to see up
      const y = gY(x, z);
      if (kind < 0.22) items.push({ k: 'pine', x, y, z, h: 16 + hh * 8, r: 2.6 + cc * 1.2, col: PINE[Math.floor(cc * PINE.length) % PINE.length] });
      else items.push({ k: 'tree', x, y, z, h: 16 + hh * 9, r: 3.6 + cc * 1.8, col: LEAF[Math.floor(cc * LEAF.length) % LEAF.length] });
    }
    // the thicket round the field: shrubs and deadfall between the bounds and the ranks, and on east past them
    for (let i = 0; i < 260; i++) {
      const side = rs(), t = rs(), d = rr(2.2, 13);
      let x, z;
      if (side < 0.36) { x = -40 + t * 92; z = -36 - d; }
      else if (side < 0.72) { x = -40 + t * 92; z = 36 + d; }
      else { x = 44 + d; z = -44 + t * 88; }
      if (x > 44 && Math.abs(z - TRAIL_Z) < 3) continue;
      if (x < HW.cutX + 1.5) continue;
      const y = gY(x, z), c = rs();
      if (c < 0.7) items.push({ k: 'tree', x, y: y + 0.25, z, h: rr(1.3, 2.6), r: rr(0.8, 1.5), col: SHRUB[Math.floor(c * 10) % SHRUB.length] });
      else if (c < 0.88) items.push({ k: 'box', x, y: y - 0.1, z, yaw: rr(0, 3.14), w: rr(4, 8), h: rr(0.35, 0.5), d: rr(0.35, 0.5), col: LOG });
      else items.push({ k: 'box', x, y: y - 0.1, z, yaw: rr(0, 3.14), w: rr(2.5, 4.5), h: rr(0.9, 1.4), d: rr(1.6, 2.6), col: DEAD });
    }
    // the near bank: shrubs along the top of the cut, driftwood piles and a fallen tree lying out into the water
    for (let z = -150; z <= 150; z += rr(4, 9)) items.push({ k: 'tree', x: HW.cutX + rr(-0.2, 1.2), y: gY(HW.cutX + 0.5, z) + 0.2, z, h: rr(2, 3.6), r: rr(1, 1.7), col: SHRUB[Math.floor(rs() * 3) % 3] });
    for (const [z, n] of [[-58, 6], [22, 5], [96, 7]]) for (let i = 0; i < n; i++)
      items.push({ k: 'box', x: HW.cutX - 2.5 + rr(-1.5, 1.5), y: HW.waterY - 0.2 + rr(0, 0.9), z: z + rr(-2.5, 2.5), yaw: rr(0, 3.14), w: rr(3, 6), h: 0.35, d: 0.35, col: i % 2 ? DRIFT : BLEACH });
    {
      const z0 = -18, len = 13;   // a whole tree down from the bank, its crown in the water
      items.push({ k: 'box', x: HW.cutX - len / 2 + 0.5, y: HW.waterY - 0.1, z: z0 + 1.5, yaw: -0.22, w: len, h: 0.55, d: 0.55, col: BLEACH });
      for (let i = 0; i < 6; i++) items.push({ k: 'box', x: HW.cutX - len + rr(0, 3), y: HW.waterY - 0.2, z: z0 + rr(-2, 4), yaw: rr(0, 3.14), w: rr(2, 4), h: 0.18, d: 0.18, col: BLEACH });
    }
    // across the river: big houses up the far bank, facing the water, and a few down against it with their docks
    const WALLS = [0xd8d0bc, 0xd6c9ae, 0x9a958c, 0x8a8278, 0xe0d8c8], ROOFS = [0x5e4a40, 0x4a4440, 0x3e4248];
    for (let z = -210; z <= 210; z += rr(48, 66)) {
      const x = -196 + rr(-6, 8);
      items.push({ k: 'house', x, y: gY(x, z), z, yaw: Math.PI / 2, w: rr(20, 27), d: rr(14, 18), h: 6.6,
        wall: WALLS[Math.floor(rs() * WALLS.length) % WALLS.length], roof: ROOFS[Math.floor(rs() * ROOFS.length) % ROOFS.length] });
    }
    for (const z of [-64, 14, 78]) {
      const x = HW.farX - 9, y = gY(x, z);
      items.push({ k: 'house', x, y, z, yaw: Math.PI / 2, w: rr(14, 18), d: rr(11, 13), h: 6.6, wall: WALLS[Math.floor(rs() * 5) % 5], roof: ROOFS[Math.floor(rs() * 3) % 3] });
      const dy = HW.waterY + 0.7, dx0 = HW.farX + 0.5;   // the dock: a deck on posts out from the clay cut
      items.push({ k: 'box', x: dx0 + 2.5, y: dy, z: z + 9, w: 6, h: 0.15, d: 2.6, col: 0x8a7a64 });
      for (const [px, pz] of [[0.3, 7.9], [0.3, 10.1], [5.2, 7.9], [5.2, 10.1]]) items.push({ k: 'box', x: dx0 + px, y: HW.bedY, z: z + pz, w: 0.2, h: dy - HW.bedY, d: 0.2, col: 0x5a4a38 });
    }
    // the trail: leaf-covered dirt down the bluff and into the field, on a mown verge where it leaves the woods
    const tPts = (x0, x1, lift) => { const p = []; for (let x = x1; x >= x0; x -= 3) p.push([x, gY(x, TRAIL_Z + 0.4 * Math.sin(x * 0.07)) + lift, TRAIL_Z + 0.4 * Math.sin(x * 0.07)]); return p; };
    items.push({ k: 'strip', pts: tPts(44, 64, 0.05), w: 5, col: 0x4a5c38 });   // (the guide's colours, darkened for the noon sun)
    items.push({ k: 'strip', pts: tPts(33, 150, 0.08), w: 1.8, col: 0x5e564c });
    for (let x = 47; x < 130; x += rr(3, 7)) for (const s of [-1, 1])   // deadfall heaped along its sides, cut rounds
      if (rs() < 0.6) items.push({ k: 'box', x, y: gY(x, TRAIL_Z + s * 2.2) - 0.1, z: TRAIL_Z + s * rr(1.8, 2.8), yaw: rr(-0.5, 0.5), w: rr(1.5, 3.5), h: rr(0.4, 0.9), d: rr(0.6, 1.2), col: rs() < 0.7 ? DEAD : 0x2e2e29 });
    // the big oak at the trail's head (the sign's)
    const OAK = { x: 45.6, z: TRAIL_Z - 2.6 };
    items.push({ k: 'tree', x: OAK.x, y: gY(OAK.x, OAK.z), z: OAK.z, h: 22, r: 5.5, col: LEAF[1] });
    items.push({ k: 'box', x: OAK.x, y: gY(OAK.x, OAK.z) - 0.2, z: OAK.z, w: 0.8, h: 10, d: 0.8, col: 0x564e46 });
    scene.add(buildMergedScenery(items, _night, 'hollow-real'));
    // the sign: a hand-lettered weathered board nailed to the oak at 1.5 m, facing the field
    {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const c = cv.getContext('2d');
      c.fillStyle = '#979b91'; c.fillRect(0, 0, 512, 128);
      c.strokeStyle = 'rgba(70,72,66,0.35)'; c.lineWidth = 2;
      for (let y = 10; y < 128; y += 14) { c.beginPath(); c.moveTo(0, y + rr(-3, 3)); c.lineTo(512, y + rr(-3, 3)); c.stroke(); }   // the grain
      c.fillStyle = '#2c2a26'; c.font = 'bold 54px "Comic Sans MS", "Marker Felt", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.translate(256, 66); c.rotate(-0.02); c.fillText('WIZARD HOLLOW', 0, 0); c.restore();
      const sx = OAK.x - 0.42, sy = gY(OAK.x, OAK.z) + 1.5, g = new THREE.Group(); g.name = 'wizardHollowSign';
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.95), new THREE.MeshStandardMaterial({ color: 0x6e665c, roughness: 1 }));
      back.position.set(sx + 0.02, sy, OAK.z); g.add(back);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 1 }));
      board.rotation.y = -Math.PI / 2; board.position.set(sx - 0.005, sy, OAK.z); g.add(board);
      scene.add(g);
    }
  }

  // === Legacy return scaffolding ===
  let enemies = [];
  let spawn = playerSpawns.team_b.pos.clone();   // default: player on Team B (south)
  let spawnYaw = playerSpawns.team_b.yaw;
  let name = 'Chattahoochee River', scenarioName = '', desc = '';

  // === Base markers (drawn by the generic team-battle path after spawns
  // resolve, same as the street maps — nothing to do here). ===

  // === Collect obstacles ===
  // (Creek segments are intentionally excluded — cosmetic + freely crossable.)
  const obstacles = [
    ...treeObs, ...coverList, ...redoubtObs, ...fortObs,
    scene._riverBlocker,
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
    groundY,
    creekZones: creekObs,   // future wade-slow hook (not yet in physics)
    viewFar: 350,   // v1.307 (D.51 step 3): the camera sees the far bank and the bluff (the other maps keep 200)
    // v1.36f: explicit team-base positions at the two FORTS, so the colored
    // ground markers line up with the fort the team actually spawns/fights in
    // (the generic enemy marker uses the anchor centroid, which on this map
    // lands out in the field in front of the north fort). Player default-spawns
    // Team B (south fort); enemies hold Team A (north fort).
    teamBases: { player: { x: 2, z: 30 }, enemy: { x: -2, z: -30 } },
  };
}

// Thin wrapper for the SCENARIOS table (mirrors the street-map wrappers).
function buildHollowSceneDefault(_v, tod) { return buildHollowScene('default', tod); }
