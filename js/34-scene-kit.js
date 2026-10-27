
// ======================================================================
// v1.35 — DAY / NIGHT shared helpers
// ----------------------------------------------------------------------
// applyTimeOfDay: sets the scene's sky color, fog, and the directional +
// ambient + hemisphere light rig for either 'day' (warm afternoon) or
// 'night' (cool moonlit dark), and adds a visible SUN disc (day) or MOON
// disc + starfield (night). Builders call this instead of hand-rolling the
// lighting block, passing their per-map palette so each map keeps its own
// daytime identity while sharing the night treatment.
//
// palette = {
//   dayBg, dayFog:[near,far], sunColor, sunInt, sunPos:[x,y,z],
//     dayAmbColor, dayAmbInt, dayHemiColor, dayHemiInt, shadow:{size,extent,far}
// }
// Returns { sun (the shadow-casting DirectionalLight), isNight }.
// ----------------------------------------------------------------------
// v1.76: DETERMINISTIC MAP LAYOUTS (seeded RNG).
// The map builders use Math.random() heavily for cover placement (bins, boxes,
// parked cars, jitter, facing, NPC homeCover). That made every load of a scenario
// reroll the layout — frustrating when you replay a scenario to beat it and the
// cover keeps moving. We now make each SCENARIO's layout deterministic: the same
// scenario id always produces the same board, but different scenarios on the same
// map still differ.
//
// Rather than thread a seed through hundreds of call sites, we temporarily swap
// the global Math.random for a seeded mulberry32 PRNG for the duration of a
// builder call, then restore it. Everything inside the builder (including helpers
// like addCurbsideBin) transparently becomes deterministic.
function _hashStringToSeed(str) {
  // FNV-1a 32-bit — stable across loads, good spread for short scenario ids.
  let h = 0x811c9dc5;
  const s = String(str == null ? 'default' : str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function _mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// v1.267: the game's own code draws from gameRandom(), never Math.random(). Swapping the global meant three.js drew
// from the seed too (four Math.random() calls for every new object's uuid), and the first build after a page load
// makes materials and geometries that later builds take from caches, so the first match's props, cars and trees
// fell differently from every later build's. Now the seed is ours alone: three.js keeps the real Math.random and a
// match's layout is the same on every load. Outside a seeded build gameRandom() is Math.random() (looked up per
// call, so a test that swaps Math.random still steers the game).
var _gameRng = null;
function gameRandom() { return _gameRng ? _gameRng() : Math.random(); }
// Run `fn` with gameRandom seeded by `seedKey`, then restore the real RNG.
// Restoration is in a finally so a throw inside the builder can't leave the
// RNG seeded. Returns whatever fn returns.
function withSeededRandom(seedKey, fn) {
  const outer = _gameRng;
  _gameRng = _mulberry32(_hashStringToSeed(seedKey));
  try {
    return fn();
  } finally {
    _gameRng = outer;
  }
}

// ----------------------------------------------------------------------
function applyTimeOfDay(scene, timeOfDay, palette) {
  const isNight = (timeOfDay === 'night');
  const P = palette || {};
  const shadow = P.shadow || { size: 2048, extent: 40, far: 80 };

  if (!isNight) {
    // ---- DAY ----
    scene.background = new THREE.Color(P.dayBg ?? 0x88a8c8);
    const fog = P.dayFog || [35, 80];
    scene.fog = new THREE.Fog(P.dayBg ?? 0x88a8c8, fog[0], fog[1]);

    const sun = new THREE.DirectionalLight(P.sunColor ?? 0xfff0c8, P.sunInt ?? 1.1);
    const sp = P.sunPos || [20, 30, 12];
    sun.position.set(sp[0], sp[1], sp[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadow.size, shadow.size);
    sun.shadow.camera.left = -shadow.extent;
    sun.shadow.camera.right = shadow.extent;
    sun.shadow.camera.top = shadow.extent * 0.75;
    sun.shadow.camera.bottom = -shadow.extent * 0.75;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = shadow.far;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(P.dayAmbColor ?? 0xb8c8d8, P.dayAmbInt ?? 0.5));
    scene.add(new THREE.HemisphereLight(P.dayHemiColor ?? 0xc8d8ff, 0x6b6253, P.dayHemiInt ?? 0.4));

    // Visible sun disc — a soft emissive sphere far out along the light dir,
    // with a faint additive glow halo. Cosmetic; sits inside the fog far plane
    // is fine (MeshBasic ignores fog only if we say so — keep fog so it tints).
    const sunDir = new THREE.Vector3(sp[0], sp[1], sp[2]).normalize();
    const sunDist = 160;
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false })
    );
    sunDisc.position.copy(sunDir.multiplyScalar(sunDist));
    scene.add(sunDisc);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(16, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    sunGlow.position.copy(sunDisc.position);
    scene.add(sunGlow);

    return { sun, isNight: false };
  }

  // ---- NIGHT ----
  const nightBg = P.nightBg ?? 0x0b1326;
  scene.background = new THREE.Color(nightBg);
  // Night fog: pull the far plane in a touch and darken, so lamps/flashlights
  // read against gloom. Keep it loose enough to still see across the street.
  const nfog = P.nightFog || [22, 70];
  scene.fog = new THREE.Fog(nightBg, nfog[0], nfog[1]);

  // Cool, dim "moonlight" key from high up — still casts shadows so geometry
  // reads, but low intensity so streetlamps/flashlights matter. v1.38: dropped
  // 0.30 → 0.16 so the unlit night is genuinely dark and lamp/flashlight pools
  // pop. Still enough rim to read silhouettes and shadow direction.
  const moon = new THREE.DirectionalLight(0x9fb6e0, 0.16);
  const mp = P.moonPos || [-18, 40, -20];
  moon.position.set(mp[0], mp[1], mp[2]);
  moon.castShadow = true;
  moon.shadow.mapSize.set(shadow.size, shadow.size);
  moon.shadow.camera.left = -shadow.extent;
  moon.shadow.camera.right = shadow.extent;
  moon.shadow.camera.top = shadow.extent * 0.75;
  moon.shadow.camera.bottom = -shadow.extent * 0.75;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = shadow.far;
  moon.shadow.bias = -0.0005;
  scene.add(moon);
  // Very low cool ambient + hemisphere so the unlit areas aren't pure black
  // (you can still just navigate, but it's clearly deep night). v1.38: ambient
  // 0.38 → 0.18 and hemi 0.32 → 0.16 — roughly halved so artificial lights
  // (streetlamps, flashlights, laser dots) carry the scene instead of a flat
  // blue wash. Tuned to stay above pitch-black so you're not fully blind.
  scene.add(new THREE.AmbientLight(0x2a3550, 0.18));
  scene.add(new THREE.HemisphereLight(0x35415f, 0x0a0e16, 0.16));

  // Moon disc + soft halo.
  const moonDir = new THREE.Vector3(mp[0], mp[1], mp[2]).normalize();
  const moonDist = 170;
  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xdfe6f5, fog: false })
  );
  moonDisc.position.copy(moonDir.clone().multiplyScalar(moonDist));
  scene.add(moonDisc);
  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(12, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xb9c8ea, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  moonGlow.position.copy(moonDisc.position);
  scene.add(moonGlow);

  // Starfield — a big inward-facing sphere of points, fog-immune so stars
  // don't wash out. Skews brighter away from the moon for a little variety.
  const starCount = 900;
  const starGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(starCount * 3);
  const R = 300;
  // v1.267: the stars draw from their own stream, not the match's seed, so a map lays out the same by night as by day
  const starRnd = _mulberry32(0x57a25);
  for (let i = 0; i < starCount; i++) {
    // Upper hemisphere bias (most stars overhead, none below horizon).
    const u = starRnd();
    const theta = starRnd() * Math.PI * 2;
    const phi = Math.acos(0.05 + 0.95 * u);   // mostly upper sky
    const x = R * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.cos(phi);
    const z = R * Math.sin(phi) * Math.sin(theta);
    sPos[i*3] = x; sPos[i*3+1] = Math.abs(y) + 12; sPos[i*3+2] = z;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xeaf0ff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.9, fog: false, depthWrite: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  return { sun: moon, isNight: true };
}

// ----------------------------------------------------------------------
// addStreetlamp: a tall black streetlamp — pole + curved arm + downward lamp
// head — placed at (x,z), seated on terrain via groundYFn. When `lit` (night),
// it emits a warm PointLight and the lamp lens/head glow; by day the lamp is a
// dark unlit prop. v1.51: the POLE is now a collision obstacle (blocks BBs and
// movement); the overhanging arm/head (~5.8m up) stay cosmetic. The collision
// AABB is attached at `group.userData.obstacle` for callers to collect.
// Returns the THREE.Group.
// ----------------------------------------------------------------------
function addStreetlamp(scene, x, z, groundYFn, lit) {
  const gy = (typeof groundYFn === 'function') ? groundYFn(x, z) : 0;
  const g = new THREE.Group();
  g.position.set(x, gy, z);

  const black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55, metalness: 0.6 });
  const poleH = 6.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, poleH, 12), black);
  pole.position.y = poleH / 2;
  pole.castShadow = true;
  g.add(pole);
  // Base collar.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.5, 12), black);
  base.position.y = 0.25; base.castShadow = true; g.add(base);

  // Curved arm reaching out toward the street (+arm along local +X; callers
  // orient the whole lamp by mirroring x/z anchor choice, but the arm direction
  // is set via the `armDir` rotation below so it always overhangs the road).
  const armLen = 1.7;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, armLen, 10), black);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(armLen / 2, poleH - 0.15, 0);
  arm.castShadow = true; g.add(arm);

  // Lamp head (cobra-style housing) at the arm's end.
  const headX = armLen - 0.05;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.34), black);
  housing.position.set(headX, poleH - 0.2, 0);
  housing.castShadow = true; g.add(housing);

  // Lens on the underside — glows when lit.
  const lensMat = new THREE.MeshBasicMaterial({ color: lit ? 0xffe6b0 : 0x3a3a32, fog: false });
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.24), lensMat);
  lens.position.set(headX, poleH - 0.32, 0);
  g.add(lens);

  if (lit) {
    // Warm pool of light beneath the head (head sits ~5.8m up). v1.35d: tuned to
    // a LOCAL pool — a lamp should light its own patch of street, then fall off
    // before it reaches the next lamp. The earlier pass (intensity 5.0, reach
    // 28m) made all four lamps' pools overlap and stack additively into a white
    // flood. Lower intensity + shorter reach keeps each pool distinct and the
    // street between lamps appropriately dim. Gentle decay (1.0) still feathers
    // the edge; positioned a bit below the head so the pool reads on the ground.
    // v1.38: bumped 1.8 → 2.2 to pair with the darker night ambient — the pools
    // now read as bright, inviting islands against real gloom rather than a
    // marginal lift over a flat blue wash. Reach kept at 15m so pools stay distinct.
    const lampLight = new THREE.PointLight(0xffdca0, 2.2, 15, 1.1);
    lampLight.position.set(headX, poleH - 1.6, 0);
    g.add(lampLight);
    // Soft additive glow ball at the lens so the source reads as bright.
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    glow.position.set(headX, poleH - 0.36, 0);
    g.add(glow);
  }

  // Orient the arm to overhang the road: rotate the whole lamp so +X (arm dir)
  // points toward the road spine (z=0). If the lamp is north of the road (z<0)
  // the arm should point +z (south); if south, -z (north). We rotate about Y.
  g.rotation.y = (z < 0) ? -Math.PI / 2 : Math.PI / 2;

  // v1.51 / v1.52: collision obstacles. The lamp is METAL (matches the metallic
  // pole material + the car-like high-pitched ping on ricochet). We block three
  // pieces, all axis-aligned world AABBs:
  //   1) the POLE (slim, full height, on the rotation axis so it's unaffected),
  //   2) the overhanging ARM, and
  //   3) the LAMP HEAD at the arm's end.
  // The arm/head sit ~5.8-6.0m up and reach horizontally over the road. After
  // the Y-rotation, local +X (arm direction) maps to world ∓Z: armDirZ = +1 when
  // the lamp is north of the road (rot -90°, arm points +z), −1 when south.
  const poleH2 = 6.2;
  const armDirZ = (z < 0) ? 1 : -1;
  const armLen2 = 1.7, headX2 = armLen2 - 0.05;  // mirror the build constants
  // Arm: a horizontal bar from the pole (z) out to ~headX along armDirZ, at the
  // arm's height band (poleH-0.15 ± the 0.07 tube radius). Give it a little
  // thickness in X (±0.12) and a height band tall enough to register shots.
  const armZ0 = z, armZ1 = z + armDirZ * headX2;
  const armObs = {
    minX: x - 0.12, maxX: x + 0.12,
    minZ: Math.min(armZ0, armZ1) - 0.08, maxZ: Math.max(armZ0, armZ1) + 0.08,
    h: 0.5, baseY: gy + (poleH2 - 0.45), surface: 'metal', mesh: g,
  };
  // Head: the cobra housing (0.7 long along the arm = world Z, 0.34 wide = world
  // X, 0.22 tall) centered at the arm's end, plus the lens just under it.
  const headCZ = z + armDirZ * headX2;
  const headObs = {
    minX: x - 0.20, maxX: x + 0.20,
    minZ: headCZ - 0.38, maxZ: headCZ + 0.38,
    h: 0.42, baseY: gy + (poleH2 - 0.52), surface: 'metal', mesh: g,
  };
  // Pole: v1.53 a true CYLINDER hugging the post (base collar r≈0.32 → use 0.18
  // to hug the pole shaft you actually see at body height, not the wide collar).
  const poleR = 0.18;
  const poleObs = {
    minX: x - poleR, maxX: x + poleR,
    minZ: z - poleR, maxZ: z + poleR,
    shape: 'cylinder', cx: x, cz: z, radius: poleR,
    h: poleH2, baseY: gy, surface: 'metal', mesh: g,
  };
  g.userData.obstacle = poleObs;                 // back-compat single ref
  g.userData.obstacles = [poleObs, armObs, headObs];

  scene.add(g);
  return g;
}

// ----------------------------------------------------------------------
// attachKidFlashlight: gives an enemy kid a working third-person flashlight,
// mounted on the gun so it points where they aim (the gunGroup faces local +Z,
// the kid's forward). Adds a small lamp body + bright lens + soft additive beam
// cone + a real SpotLight (with its target as a child so it tracks the kid's
// facing automatically — no per-frame update needed). Intensity is tuned for
// night; harmless if ever used by day. Sets kid._hasFlashlight.
// ----------------------------------------------------------------------
function attachKidFlashlight(kid) {
  if (!kid || !kid.gunGroup || kid._hasFlashlight) return;
  const gg = kid.gunGroup;
  const unit = new THREE.Group();
  // Sit it just forward and slightly under the gun's muzzle line. The gun mesh
  // points +Z, so "forward" is +Z.
  unit.position.set(0, -0.02, 0.18);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.7 })
  );
  body.rotation.x = Math.PI / 2;   // lie along Z
  unit.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff7d8, fog: false })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.075);
  unit.add(lens);

  // Visible beam cone (additive) — faint "light in the air" haze, widened to
  // roughly match the SpotLight's cone angle so it reads as soft volume, not a
  // hard-edged geometric cone (the SpotLight does the real lighting). Cone geom
  // defaults to apex at +Y, base at -Y. The kid's gun faces +Z, so -90° about X
  // maps the +Y apex to -Z; positioning the CENTER at +coneLen/2 puts the apex
  // back at the lens (z≈0.075) and the wide base out at +Z.
  const coneLen = 7.0;
  const _spotAngle = Math.PI / 6.5;                  // matches the SpotLight below
  const _coneR = Math.tan(_spotAngle) * coneLen;     // base radius agrees with the lit pool
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(_coneR, coneLen, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.03,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  cone.rotation.x = -Math.PI / 2;
  cone.position.set(0, 0, 0.075 + coneLen / 2);
  unit.add(cone);

  // Real SpotLight casting forward (+Z) — the actual illumination, brighter and
  // softer-edged (high penumbra) so there's no hard rim. Target is a child so it
  // rotates with the kid; no per-frame aiming needed. v1.38: 4.5 → 5.5 so a
  // sweeping enemy flashlight clearly lights surfaces against the darker night
  // and reads as a real tell of where they're pushing.
  const spot = new THREE.SpotLight(0xfff3d0, 5.5, 22, _spotAngle, 0.9, 1.0);
  spot.position.set(0, 0, 0.08);
  const tgt = new THREE.Object3D();
  tgt.position.set(0, 0, 8);
  unit.add(spot);
  unit.add(tgt);
  spot.target = tgt;
  spot.castShadow = false;   // keep it cheap

  gg.add(unit);
  kid._hasFlashlight = true;
  kid._flashlightUnit = unit;
}

// ----------------------------------------------------------------------
// attachKidLaser: gives an enemy kid a visible third-person laser sight,
// mounted on the gun so it projects where they aim (the gunGroup faces local
// +Z, the kid's forward). Adds a tiny emitter body + a thin additive beam + a
// bright dot at the far end. Purely cosmetic — no SpotLight, no lighting, no
// gameplay effect — it's there to make the night maps read as a tangle of
// crisscrossing beams. v1.36i: `color` selects RED (default) or GREEN, and the
// beam now runs LONG (60m) and is CLIPPED to obstacles each frame by
// updateKidLaser() — so the dot lands on real geometry instead of a phantom
// 16m wall. Stores beam/dot refs + length on kid._laserUnit for that update.
// Sets kid._hasLaser.
// ----------------------------------------------------------------------
const KID_LASER_COLORS = {
  red:   { beam: 0xff1a1a, dot: 0xff5555, emitter: 0xff2a2a, emissive: 0xff0000 },
  green: { beam: 0x33ff44, dot: 0x99ff99, emitter: 0x2aff3a, emissive: 0x00ff10 },
};
function attachKidLaser(kid, color = 'red') {
  if (!kid || !kid.gunGroup || kid._hasLaser) return;
  const pal = KID_LASER_COLORS[color] || KID_LASER_COLORS.red;
  const gg = kid.gunGroup;
  const unit = new THREE.Group();
  // Sit it just above and forward of the muzzle line; the gun mesh faces +Z.
  unit.position.set(0, 0.03, 0.16);

  // Small emitter housing.
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.026, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.5, metalness: 0.6 })
  );
  unit.add(body);
  const emitter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.01, 8),
    new THREE.MeshStandardMaterial({ color: pal.emitter, emissive: pal.emissive, emissiveIntensity: 0.9, roughness: 0.3, fog: false })
  );
  emitter.rotation.x = Math.PI / 2;
  emitter.position.set(0, 0, 0.035);
  unit.add(emitter);

  // The beam: a thin additive cylinder running out along +Z. Built LONG (60m so
  // it can reach across the map); updateKidLaser() rescales it each frame to the
  // first surface hit so it doesn't punch through trees/forts or stop at a
  // phantom wall. Cylinder height runs along local Y; rotated so that maps to +Z.
  const beamLen = 60.0;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, beamLen, 6),
    new THREE.MeshBasicMaterial({ color: pal.beam, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0, 0.04 + beamLen / 2);   // +Z forward (full length until clipped)
  unit.add(beam);

  // Bright dot at the far end.
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: pal.dot, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );

  gg.add(unit);   // emitter housing stays bolted to the gun (for the muzzle origin)
  kid._hasLaser = true;
  kid._laserColor = color;
  kid._laserUnit = unit;
  // v1.84: the beam + dot live in a SCENE-LEVEL group, NOT under the kid. Kids
  // carry a non-uniform scale (height scaleY vs build scaleXZ), which a child beam
  // inherits — and non-uniform scale SHEARS the beam direction off-axis (the
  // persistent "laser tilts to the sky" bug; lookAt and quaternion aims both
  // failed because the shear is in the parent chain, above the unit). Parenting
  // the beam to the scene root gives it a clean, unscaled world frame so we can
  // place + orient it in pure world space. updateKidLaser positions this group at
  // the emitter origin each frame and aims it down the world ray.
  const beamGroup = new THREE.Group();
  beam.rotation.set(0, 0, 0);
  beam.position.set(0, 0, 0);          // re-zeroed; world placement done per-frame
  dot.position.set(0, 0, 0);
  beamGroup.add(beam);
  beamGroup.add(dot);
  // v1.85: add the beam group to the SAME scene the kid lives in — NOT the global
  // Game.scene, which during enterScenario is still the previous (bedroom) scene
  // and isn't rendered in the scenario (that was the "no laser at all" regression).
  // Walk up the kid's group ancestry to its root (the scene); fall back to the gun.
  let sceneRoot = kid.group || gg;
  while (sceneRoot.parent) sceneRoot = sceneRoot.parent;
  if (sceneRoot && sceneRoot.isScene) sceneRoot.add(beamGroup);
  else if (Game.scene) Game.scene.add(beamGroup);
  else gg.add(beamGroup);
  kid._laserBeamGroup = beamGroup;
  // Refs + length for the per-frame clip (mirrors the FP laser's beam/dot model).
  unit.userData.beam = beam;
  unit.userData.dot = dot;
  unit.userData.beamGroup = beamGroup;
  unit.userData.beamLen = beamLen;
}

// updateKidLaser: aim a kid's laser at what it's shooting toward, then clip the
// beam to the first obstacle along that world-space line so the dot lands on
// real geometry — mirroring the player's surface-clipping FP laser.
//
// v1.37x: rewritten to work entirely in WORLD space and remove the earlier
// lookAt/parent-matrix fragility. We force a full world-matrix flush of the
// kid's whole group (so the emitter's world position reflects this frame's
// position/rotation), take the emitter world origin, build the ray direction
// straight from origin → aim point, raycast with those explicit values, then
// orient + size the beam from the SAME ray. Because the direction is
// origin→target (not the gun's offset axis), it reliably strikes the cover the
// kid is actually fighting around instead of slipping past it. The beam is then
// pointed exactly down the ray we raycast, so the rendered length matches the
// clip with no orientation mismatch.
const _kidLaserOrigin = new THREE.Vector3();
const _kidLaserDir = new THREE.Vector3();
// Diagnostic state (always populated; read window.__laserDiag or press backtick).
//   runs       — total updateKidLaser executions since load
//   lasered    — # of lasered enemies seen in the most recent enemy-loop frame
//   ran        — # of those that actually reached updateKidLaser this frame
//   last       — the most recent clip result object
const LASER_DIAG = { runs: 0, lasered: 0, ran: 0, lastRun: 0, last: null };
function updateKidLaser(enemy, obstacles, aimPoint) {
  // attachKidLaser() was called with the enemy's MESH, so the laser unit + flags
  // live on enemy.mesh — NOT on the enemy object. (This mismatch was the bug:
  // the per-frame clip checked enemy._laserUnit, which was always undefined, so
  // the beam never got clipped and ran full-length through everything.)
  const mesh = (enemy && enemy.mesh) ? enemy.mesh : enemy;
  const unit = mesh && mesh._laserUnit;
  if (!unit || !unit.userData || !unit.userData.beam) return;
  const beamLen = unit.userData.beamLen || 60.0;

  // v1.85: self-heal the beam group's parent scene. attachKidLaser may have run
  // before Game.scene was pointed at the scenario scene, so make sure the beam
  // group lives in the SAME scene as the kid (walk the kid's ancestry to its
  // scene root). Cheap pointer compares; re-parents only if they diverge.
  const bgrp = unit.userData.beamGroup;
  if (bgrp && mesh.group) {
    let root = mesh.group;
    while (root.parent) root = root.parent;
    if (root && root.isScene && bgrp.parent !== root) root.add(bgrp);
  }

  // Force the whole kid chain's world matrices current (position/rotation were
  // set this frame). updateMatrixWorld(true) on the root rebuilds the subtree.
  if (mesh && mesh.group) mesh.group.updateMatrixWorld(true);
  else unit.updateWorldMatrix(true, false);

  // Emitter world origin.
  unit.getWorldPosition(_kidLaserOrigin);

  // Ray direction: straight at the aim point in world space if we have one.
  // v1.82: if there is NO aim point, do NOT fall back to the gun's world-forward —
  // a non-aiming kid whose gun pose happens to tilt up would shoot a stray vertical
  // beam (the "laser to the sky" report). Instead hide the beam this frame; a real
  // aim next frame re-shows it. (updateEnemies always passes an aim point for a
  // live target, so this only suppresses genuinely target-less frames.)
  if (aimPoint) {
    _kidLaserDir.copy(aimPoint).sub(_kidLaserOrigin);
    if (_kidLaserDir.lengthSq() < 1e-6) _kidLaserDir.set(0, 0, 1);
    _kidLaserDir.normalize();
  } else {
    unit.userData.beam.visible = false;
    unit.userData.dot.visible = false;
    return;
  }

  // Clip to the first obstacle along that world ray.
  let dist = beamLen;
  if (obstacles) {
    dist = raycastObstacles(
      _kidLaserOrigin.x, _kidLaserOrigin.y, _kidLaserOrigin.z,
      _kidLaserDir.x, _kidLaserDir.y, _kidLaserDir.z,
      beamLen, obstacles
    );
  }
  // v1.83: also terminate the beam AT the aim target. Previously the beam only
  // clipped on cover meshes, so when a kid aimed across open ground at the player
  // the beam sailed the full 60m PAST the player and kept going — and when the
  // shot bearing ran toward the camera (player downhill of an uphill aim, or vice
  // versa) that 60m overshoot projected to a near-vertical streak climbing off
  // into the sky (the "laser to the sky" report). A real laser dot lands ON the
  // target, so clamp the length to the distance to the aim point (a hair past, so
  // the dot sits on the target, not floating in front of it).
  const aimDist = _kidLaserOrigin.distanceTo(aimPoint) + 0.15;
  dist = Math.min(dist, aimDist);
  dist = Math.max(0.4, Math.min(beamLen, dist));

  // v1.84: the beam + dot live in a SCENE-LEVEL group (no kid scale to shear the
  // direction). Place that group at the emitter origin and orient it down the world
  // ray with a clean world quaternion, then lay the beam/dot out along the group's
  // local +Z at the clipped length. Pure world space — no parent shear, no lookAt
  // up-vector ambiguity.
  const bg = unit.userData.beamGroup;
  const beam = unit.userData.beam;
  const dot = unit.userData.dot;
  if (bg) {
    bg.position.copy(_kidLaserOrigin);
    bg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _kidLaserDir);
    const L = Math.max(0.01, dist - 0.04);
    // beam cylinder length runs local Y → map to +Z via rotation.x, scale to L.
    beam.rotation.set(Math.PI / 2, 0, 0);
    beam.scale.set(1, L / beamLen, 1);
    beam.position.set(0, 0, 0.04 + L / 2);
    dot.position.set(0, 0, 0.04 + L);
    beam.visible = true;
    dot.visible = true;
  }

  // v1.84 diag: record the ACTUAL rendered beam direction (origin → dot world pos)
  // so any divergence from the intended dir is visible at a glance.
  if (bg) {
    bg.updateWorldMatrix(true, false);
    const _dotW = new THREE.Vector3();
    dot.getWorldPosition(_dotW);
    const _renderDir = _dotW.sub(_kidLaserOrigin).normalize();
    LASER_DIAG.renderDir = [+_renderDir.x.toFixed(2), +_renderDir.y.toFixed(2), +_renderDir.z.toFixed(2)];
  }

  // Diagnostic: always record the last clip result so it's inspectable even
  // without flipping a flag first. Read `window.__laserDiag` in the console, or
  // press the backtick (`) key in a scenario for an on-screen readout. Shows
  // whether the raycast found an obstacle (clipped), the obstacle count it
  // tested, and the world origin/direction.
  LASER_DIAG.lastRun = (typeof performance !== 'undefined') ? performance.now() : 0;
  LASER_DIAG.runs++;
  LASER_DIAG.last = {
    char: (enemy && enemy.charId) || '?',
    obstacleCount: obstacles ? obstacles.length : -1,
    origin: [+_kidLaserOrigin.x.toFixed(2), +_kidLaserOrigin.y.toFixed(2), +_kidLaserOrigin.z.toFixed(2)],
    dir: [+_kidLaserDir.x.toFixed(2), +_kidLaserDir.y.toFixed(2), +_kidLaserDir.z.toFixed(2)],
    dist: +dist.toFixed(2),
    beamLen: beamLen,
    clipped: dist < beamLen,
  };
  if (typeof window !== 'undefined') window.__laserDiag = LASER_DIAG.last;
}

// Diagnostic HUD refresh — shows whether the enemy-laser clip is running and
// finding geometry. Toggled with the backtick (`) key. Hidden by default.
function updateLaserDiagHud() {
  const hud = document.getElementById('laserDiagHud');
  if (!hud || hud.style.display === 'none') return;
  const d = LASER_DIAG.last;
  let txt = 'LASER DIAG  (` to hide)\n';
  txt += 'lasered enemies: ' + LASER_DIAG.lasered + '\n';
  txt += 'reached clip:    ' + LASER_DIAG.ran + '\n';
  txt += 'total clip runs: ' + LASER_DIAG.runs + '\n';
  txt += 'had aim point:   ' + (LASER_DIAG.hadAim ? 'yes' : 'NO') + '\n';
  if (d) {
    txt += '-- last clip --\n';
    txt += 'char:     ' + d.char + '\n';
    txt += 'aim tgt:  ' + (LASER_DIAG.aimTargetIsPlayer ? 'PLAYER' : 'other kid') + '\n';
    txt += 'shooterY: ' + LASER_DIAG.shooterFeetY + '  tgtFeetY: ' + LASER_DIAG.tgtFeetY + '\n';
    txt += 'aimY:     ' + LASER_DIAG.aimY + '\n';
    txt += 'obstacles:' + d.obstacleCount + '\n';
    txt += 'origin:   ' + d.origin.join(', ') + '\n';
    txt += 'dir:      ' + d.dir.join(', ') + '  (dir.y high = beam up)\n';
    if (LASER_DIAG.renderDir) txt += 'renderDir:' + LASER_DIAG.renderDir.join(', ') + '  (should match dir)\n';
    txt += 'dist:     ' + d.dist + ' / ' + d.beamLen + '\n';
    txt += 'CLIPPED:  ' + (d.clipped ? 'YES (hit)' : 'no (full length)');
  } else {
    txt += '(no clip has run yet)';
  }
  hud.textContent = txt;
}

// v1.127 (backlog D.3 step 4, Bunratty's road): Winnmark's v1.116 road builder, lifted out of buildWinnmarkCourtScene
// so Bunratty's S-curve lane gets the same pieces: one asphalt ribbon that follows the centreline and the ground, a
// polar bulb, a gutter pan and 9 cm rolled kerb along both edges and round the bulb (dropped flat across each
// driveway, open where the road meets the bulb), and manholes, drains, crack sealing and a patch. o.point(t)/o.deriv(t)
// give the centreline and its tangent; houseCenters ({x, side}) place the driveway drops, on the edges and, since
// v1.127, round the bulb too (Bunratty's hero house drives off its bulb). Visual only: no collision, no Math.random,
// so the seeded boards are untouched.
function buildStreetRoad(scene, opt) {
  const { point, deriv, groundY, groundNormal, houseCenters } = opt;
  const ASPH = opt.ASPH, BULB_C = { x: opt.bulb.x, z: opt.bulb.z }, BULB_R = opt.bulb.r;
  const LIFT = 0.06;
  const asphMat = opt.asphMat;
  const concMat = new THREE.MeshStandardMaterial({ color: 0x96928a, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const markMat = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const frameAt = (t) => { const p = point(t), d = deriv(t), l = Math.hypot(d.x, d.z); return { p, tx: d.x / l, tz: d.z / l, nx: -d.z / l, nz: d.x / l }; };
  const dBulb = (x, z) => Math.hypot(x - BULB_C.x, z - BULB_C.z);
  // the road ends inside the bulb; find the t where its centre is 5 m from the bulb's centre
  let tEnd = 1; for (let t = 0.8; t <= 1; t += 0.002) if (dBulb(point(t).x, point(t).z) < 5) { tEnd = t; break; }
  const T0 = opt.T0, NS = opt.NS;   // t < 0 runs the road out through the tree-wall gap at the entry
  const meshes = [];
  // --- asphalt ribbon (indexed, smooth)
  {
    const cols = 9, pos = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const f = frameAt(T0 + (tEnd - T0) * i / NS);
      for (let j = 0; j < cols; j++) {
        const o = -ASPH + 2 * ASPH * j / (cols - 1);   // edge vertices shared with the gutter's (an overlap stair-stepped over it)
        const x = f.p.x + f.nx * o, z = f.p.z + f.nz * o;
        pos.push(x, groundY(x, z) + LIFT, z);
      }
      if (i) for (let j = 0; j < cols - 1; j++) { const a = (i - 1) * cols + j, b = a + cols; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, asphMat); m.receiveShadow = true; m.userData.wmRoad = 'asphalt'; meshes.push(m);
  }
  // --- bulb (polar, indexed); a hair lower than the ribbon where they overlap
  {
    const rings = [0, 1.6, 3.2, 4.8, BULB_R], segs = 56, pos = [], idx = [];
    for (let r = 0; r < rings.length; r++) for (let k = 0; k < segs; k++) {
      const a = k / segs * Math.PI * 2, x = BULB_C.x + Math.cos(a) * rings[r], z = BULB_C.z + Math.sin(a) * rings[r];
      pos.push(x, groundY(x, z) + LIFT - 0.008, z);
    }
    for (let r = 1; r < rings.length; r++) for (let k = 0; k < segs; k++) {
      const a = (r - 1) * segs + k, b = (r - 1) * segs + (k + 1) % segs, c = r * segs + k, d = r * segs + (k + 1) % segs;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, asphMat); m.receiveShadow = true; m.userData.wmRoad = 'bulb'; meshes.push(m);
  }
  // --- gutter pan and rolled kerb: a profile (offset from the asphalt edge, height) swept along each edge
  const PROF = [[0, 0], [0.35, 0], [0.55, 0.09], [0.67, 0.09], [0.71, 0.01]];
  const conc = [];   // non-indexed triangles
  const kerbH = (x, z, zRoad) => {   // 1 = full kerb, 0 = dropped (driveway apron), eased over 0.5 m
    let k = 1;
    for (const hc of houseCenters) {
      const onSide = hc.side === 'north' ? z < zRoad : z > zRoad;
      if (onSide) k = Math.min(k, Math.max(0, Math.min(1, (Math.abs(x - (hc.dx ?? hc.x)) - 2.1) / 0.5)));   // v1.305: dx, a drive off the house's middle
    }
    return k;
  };
  const quad = (a, b, c, d) => conc.push(...a, ...b, ...d, ...a, ...d, ...c);   // a b / c d as two rows
  const nearRoad = (x, z) => {   // lateral distance from the road's centreline (t 0.6..tEnd), for the bulb's mouth
    let best = 1e9; for (let t = 0.6; t <= tEnd + 1e-6; t += 0.01) { const p = point(t); best = Math.min(best, Math.hypot(x - p.x, z - p.z)); }
    return best;
  };
  for (const side of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= NS; i++) {
      const f = frameAt(T0 + (tEnd - T0) * i / NS);
      const row = PROF.map(([o, h]) => {
        const off = side * (ASPH + o), x = f.p.x + f.nx * off, z = f.p.z + f.nz * off;
        return [x, z, h];
      });
      const k = kerbH(row[2][0], row[2][1], f.p.z);
      const pts = row.map(([x, z, h]) => [x, groundY(x, z) + LIFT + h * k, z]);
      const inBulb = dBulb(row[0][0], row[0][1]) < BULB_R + 0.3;
      if (prev && !inBulb && !prev.inBulb) for (let j = 0; j < pts.length - 1; j++) {
        if (side > 0) quad(prev.pts[j], prev.pts[j + 1], pts[j], pts[j + 1]); else quad(prev.pts[j + 1], prev.pts[j], pts[j + 1], pts[j]);
      }
      prev = { pts, inBulb };
    }
  }
  {
    const segs = 72; let prev = null;
    for (let k = 0; k <= segs; k++) {
      const a = k / segs * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const kb = kerbH(BULB_C.x + ca * (BULB_R + 0.61), BULB_C.z + sa * (BULB_R + 0.61), BULB_C.z);   // v1.127: a driveway off the bulb drops it too
      const pts = PROF.map(([o, h]) => { const r = BULB_R + o, x = BULB_C.x + ca * r, z = BULB_C.z + sa * r; return [x, groundY(x, z) + LIFT + h * kb, z]; });
      const mouth = nearRoad(BULB_C.x + ca * (BULB_R + 0.3), BULB_C.z + sa * (BULB_R + 0.3)) < ASPH + 0.75;
      if (prev && !mouth && !prev.mouth) for (let j = 0; j < pts.length - 1; j++) quad(pts[j], pts[j + 1], prev.pts[j], prev.pts[j + 1]);
      prev = { pts, mouth };
    }
  }
  {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(conc, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, concMat); m.receiveShadow = true; m.userData.wmRoad = 'kerb'; meshes.push(m);
  }
  // --- the furniture: manholes, storm drains in the gutter, crack sealing, a patch (merged per material, laid on the slope)
  const parts = { dark: [], iron: [], patch: [] };
  const _up = new THREE.Vector3(0, 0, 1);
  const place = (key, geo, x, z, ang, lift) => {
    const n = groundNormal(x, z);
    const q = new THREE.Quaternion().setFromUnitVectors(_up, new THREE.Vector3(n.nx, n.ny, n.nz));
    const rz = new THREE.Quaternion().setFromAxisAngle(_up, ang);
    parts[key].push({ geo, m: new THREE.Matrix4().compose(new THREE.Vector3(x, groundY(x, z) + LIFT + lift, z), q.multiply(rz), new THREE.Vector3(1, 1, 1)) });
  };
  const along = (f) => Math.atan2(-f.tz, f.tx);
  for (const [t, o] of opt.manholes) {   // manholes
    const f = frameAt(t), x = f.p.x + f.nx * o, z = f.p.z + f.nz * o;
    place('iron', new THREE.CircleGeometry(0.42, 18), x, z, 0, 0.004);
    place('dark', new THREE.RingGeometry(0.42, 0.48, 18), x, z, 0, 0.004);
    for (const d of [-0.18, 0, 0.18]) {   // a cast grid on the lid
      place('dark', new THREE.PlaneGeometry(0.025, 0.6), x + f.tx * d, z + f.tz * d, along(f), 0.006);
      place('dark', new THREE.PlaneGeometry(0.6, 0.025), x + f.nx * d, z + f.nz * d, along(f), 0.006);
    }
  }
  for (const [t, side] of opt.drains) {   // storm drain grates in the gutter pan
    const f = frameAt(t), o = side * (ASPH + 0.18), x = f.p.x + f.nx * o, z = f.p.z + f.nz * o;
    place('dark', new THREE.PlaneGeometry(0.95, 0.32), x, z, along(f), 0.004);
    for (let k = -4; k <= 4; k++) place('iron', new THREE.PlaneGeometry(0.035, 0.28), x + f.tx * k * 0.1, z + f.tz * k * 0.1, along(f), 0.006);
  }
  for (const [t, len, skew] of opt.cracks) {   // crack sealing across the road
    const f = frameAt(t);
    for (let k = 0; k < 4; k++) {
      const s0 = -len / 2 + len * k / 4, s1 = s0 + len / 4, w = (k % 2 ? 1 : -1) * 0.25;
      const xa = f.p.x + f.nx * s0 + f.tx * (skew * s0 / len), za = f.p.z + f.nz * s0 + f.tz * (skew * s0 / len);
      const xb = f.p.x + f.nx * s1 + f.tx * (skew * s1 / len + w * 0.3), zb = f.p.z + f.nz * s1 + f.tz * (skew * s1 / len + w * 0.3);
      const l = Math.hypot(xb - xa, zb - za);
      place('dark', new THREE.PlaneGeometry(l, 0.05), (xa + xb) / 2, (za + zb) / 2, Math.atan2(-(zb - za), xb - xa), 0.003);
    }
  }
  { const f = frameAt(opt.patch); place('patch', new THREE.PlaneGeometry(2.6, 1.7), f.p.x + f.nx * 1.4, f.p.z + f.nz * 1.4, along(f) + 0.04, 0.002); }
  const pm = { dark: markMat(0x1c1c1e, 0.8), iron: markMat(0x4a4a48, 0.6), patch: markMat(0x323234, 0.95) };
  for (const k in parts) if (parts[k].length) { const m = new THREE.Mesh(_houseMergeParts(parts[k]), pm[k]); m.receiveShadow = true; m.userData.wmRoad = 'marks'; meshes.push(m); }
  for (const m of meshes) scene.add(m);
  return meshes;
}
