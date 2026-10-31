
// =====================================================================
// FP GUN ACCESSORIES (v1.27) — visible laser & flashlight on the viewmodel
// =====================================================================
// Per-gun mount point: barrel Y height + a forward Z near the muzzle, so the
// accessory hangs just under the barrel and the laser/light projects forward
// along local -Z (the gun's aim direction).
// y/z = under-barrel mount; railX = how far left/right a side-rail accessory
// sits from the barrel centerline (v1.28 placement). Bigger guns → wider rails.
// v1.40e: per-gun accessory rail geometry. Guns mount accessories on SIDE rails
// running along the handguard (matching the data model's left/right rail slots).
//   barrelY : vertical center of the rails (at the handguard side)
//   sideX   : half-width — left rail at -sideX, right rail at +sideX
//   railZ   : center of the rails along the barrel (-Z forward)
//   railLen : rail length, sized to the gun's handguard so it doesn't overhang
//   underY  : underside Y (kept for any under-mount; unused for side rails)
// v1.61/1.61b: `sight` = the TOP-rail mount for an optic (red-dot / scope). The
//   optic FOOT rests at sightY (= the gun's receiver/rail TOP), and the optic
//   stands UP from there, so it perches instead of sinking. sightZ centers it
//   over the receiver; sightScale keeps the optic proportional to the gun.
const FP_GUN_MOUNT = {
  pistol:  { barrelY: 0.030, sideX: 0.019, railZ: -0.115, railLen: 0.075, underY: 0.012, sightY: 0.052, sightZ: -0.075, sightScale: 0.85 },
  shotgun: { barrelY: 0.034, sideX: 0.016, railZ: -0.12,  railLen: 0.07,  underY: 0.018, sightY: 0.060, sightZ: -0.055, sightScale: 1.0 },
  spas:    { barrelY: 0.034, sideX: 0.016, railZ: -0.12,  railLen: 0.07,  underY: 0.018, sightY: 0.060, sightZ: -0.055, sightScale: 1.0 },   // v1.398: the shotgun's
  ar:      { barrelY: 0.035, sideX: 0.016, railZ: -0.185, railLen: 0.10,  underY: 0.018, sightY: 0.054, sightZ: -0.04,  sightScale: 1.0 },
  sniper:  { barrelY: 0.032, sideX: 0.016, railZ: -0.19,  railLen: 0.11,  underY: 0.028, sightY: 0.040, sightZ: -0.04,  sightScale: 1.0 },
  l96:     { barrelY: 0.032, sideX: 0.016, railZ: -0.19,  railLen: 0.11,  underY: 0.028, sightY: 0.040, sightZ: -0.04,  sightScale: 1.0 },   // v1.336: the sniper's
  m14:     { barrelY: 0.032, sideX: 0.016, railZ: -0.19,  railLen: 0.11,  underY: 0.028, sightY: 0.040, sightZ: -0.04,  sightScale: 1.0 },   // v1.404: the sniper's
  svd:     { barrelY: 0.032, sideX: 0.016, railZ: -0.19,  railLen: 0.11,  underY: 0.028, sightY: 0.040, sightZ: -0.04,  sightScale: 1.0 },   // v1.395: the sniper's
  ak47:    { barrelY: 0.018, sideX: 0.017, railZ: -0.185, railLen: 0.085, underY: 0.000, sightY: 0.055, sightZ: -0.05,  sightScale: 1.0 },
  rpk:     { barrelY: 0.018, sideX: 0.017, railZ: -0.185, railLen: 0.085, underY: 0.000, sightY: 0.055, sightZ: -0.05,  sightScale: 1.0 },   // v1.396: the AK's
  mp5:     { barrelY: 0.010, sideX: 0.016, railZ: -0.16,  railLen: 0.07,  underY: -0.010, sightY: 0.030, sightZ: -0.05,  sightScale: 0.95 },
  ump:     { barrelY: 0.012, sideX: 0.015, railZ: -0.155, railLen: 0.06,  underY: -0.006, sightY: 0.052, sightZ: -0.05,  sightScale: 0.95 },
  p90:     { barrelY: -0.006, sideX: 0.018, railZ: -0.12, railLen: 0.06,  underY: -0.037, sightY: 0.065, sightZ: -0.14,  sightScale: 0.9 },   // v1.346: an optic on the ring
  vector:  { barrelY: 0.000, sideX: 0.018, railZ: -0.10, railLen: 0.07,  underY: -0.020, sightY: 0.0325, sightZ: -0.03,  sightScale: 0.9 },   // v1.348: an optic on the top rail between the irons
  g36:     { barrelY: -0.005, sideX: 0.020, railZ: -0.22, railLen: 0.08,  underY: -0.034, sightY: 0.0365, sightZ: -0.04,  sightScale: 0.95 },   // v1.371: an optic on the top rail between the irons
  aug:     { barrelY: -0.012, sideX: 0.015, railZ: -0.20, railLen: 0.06,  underY: -0.026, sightY: 0.0355, sightZ: -0.03,  sightScale: 0.95 },   // v1.372: an optic on the top rail between the irons
  m4:      { barrelY: -0.005, sideX: 0.024, railZ: -0.21, railLen: 0.08,  underY: -0.032, sightY: 0.0375, sightZ: -0.04,  sightScale: 0.95 },   // v1.373: an optic on the top rail between the irons
  mac10:   { barrelY: 0.020, sideX: 0.016, railZ: -0.065, railLen: 0.05,  underY: 0.004, sightY: 0.032, sightZ: -0.04,  sightScale: 0.85 },
  // v1.168: the backyard guns (the bucket's sight sits on its carry-handle rail, above the hopper)
  thunder: { barrelY: 0.040, sideX: 0.025, railZ: -0.06,  railLen: 0.07,  underY: 0.008, sightY: 0.0525, sightZ: -0.06, sightScale: 1.0 },
  sixshooter: { barrelY: 0.030, sideX: 0.015, railZ: -0.03, railLen: 0.05, underY: 0.018, sightY: 0.053, sightZ: -0.05, sightScale: 0.8 },
  bucket:  { barrelY: 0.010, sideX: 0.030, railZ: -0.18,  railLen: 0.08,  underY: -0.028, sightY: 0.135, sightZ: -0.10, sightScale: 1.0 },
  boltpistol: { barrelY: 0.030, sideX: 0.016, railZ: -0.04, railLen: 0.06, underY: 0.03, sightY: 0.059, sightZ: -0.05, sightScale: 0.85 },
  // v1.250: the clear automatics (sights on the top rail or the receiver, a rail low on the side)
  sprayer: { barrelY: 0.010, sideX: 0.030, railZ: -0.10, railLen: 0.07, underY: -0.028, sightY: 0.0595, sightZ: -0.06, sightScale: 0.9 },
  ghost:   { barrelY: 0.010, sideX: 0.0275, railZ: -0.07, railLen: 0.06, underY: -0.028, sightY: 0.0475, sightZ: -0.06, sightScale: 0.85 },
  ticktock: { barrelY: 0.010, sideX: 0.0275, railZ: -0.18, railLen: 0.09, underY: -0.028, sightY: 0.0595, sightZ: -0.08, sightScale: 1.0 },
  rattle:  { barrelY: 0.010, sideX: 0.030, railZ: -0.08, railLen: 0.06, underY: -0.028, sightY: 0.0475, sightZ: -0.05, sightScale: 0.85 },
  famas:   { barrelY: 0.012, sideX: 0.022, railZ: -0.130, railLen: 0.08, underY: -0.020, sightY: 0.079, sightZ: -0.06, sightScale: 1.0 },   // v1.325: the optic on the carry handle
  epistol: { barrelY: 0.030, sideX: 0.019, railZ: -0.115, railLen: 0.075, underY: 0.012, sightY: 0.052, sightZ: -0.075, sightScale: 0.85 },   // v1.326: the pistol's
  thompson: { barrelY: 0.000, sideX: 0.018, railZ: -0.06, railLen: 0.06, underY: -0.020, sightY: 0.026, sightZ: -0.02, sightScale: 0.9 },   // v1.403: an optic on the receiver's top
  gaspistol: { barrelY: 0.030, sideX: 0.019, railZ: -0.115, railLen: 0.075, underY: 0.012, sightY: 0.052, sightZ: -0.075, sightScale: 0.85 },   // v1.399: the pistol's
  erifle:  { barrelY: 0.035, sideX: 0.016, railZ: -0.185, railLen: 0.10,  underY: 0.018, sightY: 0.054, sightZ: -0.04,  sightScale: 1.0 },   // v1.326: the AR's
  burst:   { barrelY: 0.035, sideX: 0.028, railZ: -0.185, railLen: 0.10,  underY: 0.010, sightY: 0.054, sightZ: -0.04,  sightScale: 1.0 },   // v1.327: rails outside the round handguard
  semishotgun: { barrelY: 0.034, sideX: 0.016, railZ: -0.12, railLen: 0.07, underY: 0.018, sightY: 0.060, sightZ: -0.055, sightScale: 1.0 },   // v1.328: the shotgun's
  m249:    { barrelY: 0.022, sideX: 0.025, railZ: -0.21, railLen: 0.08, underY: -0.018, sightY: 0.054, sightZ: -0.08, sightScale: 1.0 },   // v1.335: the optic on the feed cover
};

// v1.40e: build one Picatinny side-rail bar (vertical slots facing outward),
// returned as a group already positioned. side = -1 (left) or +1 (right).
function buildSideRail(mount, side, railMat, ridgeMat) {
  const anchor = new THREE.Group();
  anchor.position.set(side * mount.sideX, mount.barrelY, mount.railZ);
  // Rail bar: thin in X (hugs the gun side), tall-ish in Y, long in Z.
  const barW = 0.008, barH = 0.020, barL = mount.railLen;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, barL), railMat);
  // Bar sits with its inner face against the gun; center it just outside sideX.
  bar.position.set(side * (barW / 2), 0, 0);
  anchor.add(bar);
  // Cross-slots along the outward face.
  const nSlots = Math.max(3, Math.floor(barL / 0.014));
  for (let i = 0; i < nSlots; i++) {
    const z = -barL / 2 + 0.008 + i * (barL - 0.016) / Math.max(1, nSlots - 1);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.003, barH + 0.003, 0.006), ridgeMat);
    ridge.position.set(side * (barW + 0.0015), 0, z);
    anchor.add(ridge);
  }
  anchor.userData.side = side;        // -1 left, +1 right
  anchor.userData.outX = side * (barW + 0.004);  // local X of the rail's outer face
  return anchor;
}

// v1.61: TOP-RAIL OPTICS (red-dot + scope). Built as their own groups, parented
// to a `sightAnchor` that sits on the gun's top rail. Both are designed around a
// LOCAL ORIGIN at the center of the glass, facing -Z (the gun's forward), so the
// shooter looks THROUGH the tube along -Z when ADS brings the gun to the face.
// The emissive reticle dot lives INSIDE the tube on the glass plane so it visually
// floats on the lens; the HUD #redDotReticle still marks dead-center for aim, but
// the in-world dot sells the optic when you're not perfectly behind it.

// Shared materials (one set; cheap, and keeps the optics visually consistent).
function _opticMats() {
  return {
    housing: new THREE.MeshStandardMaterial({ color: 0x131316, roughness: 0.5, metalness: 0.65 }),
    housingHi: new THREE.MeshStandardMaterial({ color: 0x202026, roughness: 0.45, metalness: 0.6 }),
    // Glass: subtle blue-tinted, see-through, no depth write so the world reads through it.
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6fa6c8, roughness: 0.08, metalness: 0.0,
      transparent: true, opacity: 0.22, transmission: 0.6, depthWrite: false, side: THREE.DoubleSide }),
  };
}

// v1.61b: optic LOCAL ORIGIN is the FOOT that rests on the rail (y=0 = bottom of
// the mount). Everything stands UP from there, so the anchor just drops the foot
// onto the rail and the optic perches above it (fixing the "sunk into the gun"
// look). userData.sightLineY = the height of the dot/reticle above the foot, so
// the ADS code knows where the bore line sits.

// RED-DOT: an OPEN REFLEX sight (like a C-More): a flat baseplate on the rail and
// a single round lens held in a TORUS bezel. The bezel is supported from BELOW by
// a short hood that connects the lens to the baseplate at the FRONT — so nothing
// crosses the sight line behind the glass. The red dot floats on the lens.
function buildRedDotOptic() {
  const o = new THREE.Group();
  const m = _opticMats();
  const footH = 0.010;                 // baseplate thickness
  const lensR = 0.015;                 // lens (glass) radius
  const lineY = 0.040;                 // dot/lens-center height above the foot
  const lensZ = -0.014;                // lens sits toward the FRONT of the base
  // Baseplate sitting flat on the rail (centered on the foot origin).
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.018, footH, 0.044), m.housing);
  base.position.set(0, footH / 2, 0.004);
  o.add(base);
  // Lens BEZEL: a torus facing -Z so its ring profile is visible from ANY angle —
  // including looking straight through it (the old open-cylinder wall vanished
  // edge-on). The tube radius gives it physical thickness like a real sight hood.
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(lensR + 0.002, 0.0035, 12, 28), m.housingHi);
  bezel.position.set(0, lineY, lensZ);   // torus lies in the XY plane → faces ±Z natively
  o.add(bezel);
  // The round lens glass inside the bezel, tilted slightly back (reflex lenses are
  // canted so they bounce the emitter dot back to the eye).
  const glass = new THREE.Mesh(new THREE.CircleGeometry(lensR, 24), m.glass);
  glass.position.set(0, lineY, lensZ + 0.001);
  glass.rotation.x = -0.18;            // slight backward cant
  o.add(glass);
  // HOOD/support: a thin curved-ish strut connecting the BOTTOM of the bezel down
  // to the front of the baseplate. Sits BELOW the sight line (top at the lens
  // bottom, never crossing the glass center), at the FRONT so the rear is open.
  const hoodTop = lineY - lensR;       // bottom of the lens
  const hoodH = hoodTop - footH;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.020, hoodH, 0.010), m.housing);
  hood.position.set(0, footH + hoodH / 2, lensZ - 0.002);
  o.add(hood);
  // Emitter housing tucked at the base in FRONT of the lens (where a real reflex
  // hides it), below the sight line.
  const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.007, 0.010), m.housing);
  emitter.position.set(0, footH + 0.005, lensZ - 0.010);
  o.add(emitter);
  // The red dot — additive sphere on the lens plane, drawn on top (depthTest off).
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 10, 10), dotMat);
  dot.position.set(0, lineY, lensZ + 0.003);
  dot.renderOrder = 6;
  o.add(dot);
  o.userData.dot = dot;
  o.userData.kind = 'red_dot';
  o.userData.sightLineY = lineY;       // dot height above the rail foot
  return o;
}

// SCOPE: a fully enclosed tube on two ring mounts, objective bell at the front,
// eyepiece + reticle glass at the rear, turret bumps on top. Origin = the foot on
// the rail; the tube stands up on the ring mounts so it perches, not sinks.
function buildScopeOptic() {
  const o = new THREE.Group();
  const m = _opticMats();
  const tubeR = 0.015, tubeLen = 0.090;
  const lineY = 0.046;                 // tube centerline height above the foot
  // Two ring mounts bridging the rail foot up to the tube.
  for (const z of [-0.026, 0.026]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.010, 16), m.housingHi);
    ring.position.set(0, lineY - 0.012, z);
    o.add(ring);
    // little post connecting ring to the rail so it doesn't float
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, lineY - 0.016, 0.012), m.housing);
    post.position.set(0, (lineY - 0.016) / 2, z);
    o.add(post);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, tubeLen, 22), m.housing);
  tube.rotation.x = Math.PI / 2; tube.position.set(0, lineY, 0); o.add(tube);
  // Objective bell at the FRONT (-Z).
  const bellR = 0.020;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(bellR, tubeR, 0.022, 22), m.housing);
  bell.rotation.x = Math.PI / 2; bell.position.set(0, lineY, -tubeLen / 2 - 0.009); o.add(bell);
  const objGlass = new THREE.Mesh(new THREE.CircleGeometry(bellR - 0.002, 24), m.glass);
  objGlass.position.set(0, lineY, -tubeLen / 2 - 0.020); objGlass.rotation.y = Math.PI; o.add(objGlass);
  // Eyepiece flare at the REAR (+Z).
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, 0.018, 0.018, 22), m.housing);
  eye.rotation.x = Math.PI / 2; eye.position.set(0, lineY, tubeLen / 2 + 0.008); o.add(eye);
  // Rear glass — the plane the reticle draws on.
  const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.017, 24), m.glass);
  rearGlass.position.set(0, lineY, tubeLen / 2 + 0.004);
  o.add(rearGlass);
  // Elevation + windage turret bumps.
  const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.010, 14), m.housingHi);
  turretTop.position.set(0, lineY + tubeR + 0.004, 0); o.add(turretTop);
  const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.009, 14), m.housingHi);
  turretSide.rotation.z = Math.PI / 2; turretSide.position.set(tubeR + 0.004, lineY, 0); o.add(turretSide);
  // Reticle group on the rear glass: thin crosshair + center dot, additive.
  const retMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85,
    depthWrite: false, depthTest: false });
  const ret = new THREE.Group();
  const hLine = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0008, 0.0008), retMat);
  const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.0008, 0.026, 0.0008), retMat);
  ret.add(hLine); ret.add(vLine);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 10, 10), dotMat);
  ret.add(dot);
  ret.position.set(0, lineY, tubeLen / 2 + 0.003);
  ret.renderOrder = 6;
  o.add(ret);
  o.userData.dot = dot;
  o.userData.kind = 'scope';
  o.userData.sightLineY = lineY;       // bore/reticle height above the rail foot
  return o;
}

// Build (once) and return the accessory rig for a gun group. Stores refs on
// group.userData.accessories. Visibility/placement set by updateFPGunAccessory().
function ensureFPGunAccessory(group, gunType) {
  if (group.userData.accessories) return group.userData.accessories;
  const mount = FP_GUN_MOUNT[gunType] || FP_GUN_MOUNT.pistol;
  const cap = GUN_ACCESSORY_CAP[gunType] || { sight: 1, rails: 1 };
  const railMat = new THREE.MeshStandardMaterial({ color: 0x202024, roughness: 0.5, metalness: 0.6 });
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x303036, roughness: 0.45, metalness: 0.6 });
  // v1.169: the under-barrel parts, measured off the bare gun before anything is bolted on
  const underParts = cap.under ? buildUnderParts(group, mount) : null;

  // ---- v1.40e: SIDE RAILS matching the data model. Guns have 1 or 2 rail slots
  // (GUN_ACCESSORY_CAP.rails). Slot 0 = LEFT rail, slot 1 = RIGHT rail. Each is a
  // Picatinny bar running along the handguard, flush to that side of the gun.
  // Accessories are parented onto the rail anchor matching their placement.
  const railAnchors = [];
  if (cap.rails >= 1) {
    const left = buildSideRail(mount, -1, railMat, ridgeMat);   // slot 0 = left
    group.add(left); railAnchors.push(left);
  }
  if (cap.rails >= 2) {
    const right = buildSideRail(mount, +1, railMat, ridgeMat);  // slot 1 = right
    group.add(right); railAnchors.push(right);
  }

  // ---- LASER unit. Built ONCE, parented to whichever rail anchor matches its
  // placement (done in updateFPGunAccessory). Local origin = the rail mount
  // point; the body sits just outboard of the rail, emitter at the FRONT.
  const laserUnit = new THREE.Group();
  const laserMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.5, metalness: 0.6 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x161619, roughness: 0.55, metalness: 0.55 });
  // v1.40f: TWO-LEVEL build. The outer `laserUnit` is bolted to the rail and is
  // NEVER rotated — it holds the CLAMP that grips the rail (so the mount always
  // sits flush against the rail, no spin). A child `beamPivot` holds the optic
  // head (body + emitter + beam + dot) and is the ONLY thing the one-time zero
  // rotates, so the beam aims forward while the clamp stays put. The pivot's
  // ORIGIN is the emitter lens, so the beam emanates exactly from the dot.
  // Clamp: a small saddle bracket that grips the rail and bridges out to the
  // optic body. Its X is set per-side at mount (toward the body) so it visually
  // connects the rail face to the outboard optic.
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.024), clampMat);
  clamp.position.set(0, 0, 0);
  laserUnit.add(clamp);
  laserUnit.userData.clamp = clamp;
  // v1.40j: build the laser the SAME WAY as the flashlight — pointing down LOCAL
  // -Z (the gun's forward) natively, so the optic needs NO ~180° flip and uses
  // the identical mount/offset logic. The beamPivot only takes a SMALL
  // convergence rotation (the zero) so the dot lands on the reticle; the body
  // stays oriented exactly like the flashlight body, so left/right mirror cleanly.
  // v1.40l: the laser HARDWARE (body + lens) sits in a FIXED group, positioned
  // and oriented exactly like the flashlight's body group — no rotation — so it
  // mounts identically (the flashlight is the known-good reference). Only the
  // thin BEAM + dot live in a separate beamPivot that takes the convergence zero,
  // so the visible beam lands on the reticle while the hardware stays put on the
  // rail. (Previously the body shared the rotating pivot and got swung inboard.)
  const laserBodyGroup = new THREE.Group();
  laserBodyGroup.position.set(0, -0.014, 0);   // default; overridden per-side on mount
  laserUnit.add(laserBodyGroup);
  const laserBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.044, 12), laserMat);
  laserBody.rotation.x = Math.PI / 2;
  laserBody.position.set(0, 0, 0.014);       // body extends BACK (+Z) from the lens
  laserBodyGroup.add(laserBody);
  const emitterMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff0000, emissiveIntensity: 0.9, roughness: 0.3 });
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.006, 12), emitterMat);
  emitter.rotation.x = Math.PI / 2;
  emitter.position.set(0, 0, -0.012);        // lens at the FRONT (-Z), like the flash
  laserBodyGroup.add(emitter);

  // Beam pivot — holds ONLY the thin beam + dot. Positioned at the lens (so the
  // beam starts there) and rotated by the convergence zero to hit the reticle.
  const beamPivot = new THREE.Group();
  beamPivot.position.set(0, -0.014, 0);   // default; overridden per-side on mount (matches body)
  beamPivot.userData.needsZero = true;
  beamPivot.userData.zeroQuat = null;
  laserUnit.add(beamPivot);
  const beamLen = 18.0;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, beamLen, 6), beamMat);
  laserBeam.rotation.x = Math.PI / 2;
  laserBeam.position.set(0, 0, -0.012 - beamLen / 2);   // runs -Z (forward)
  beamPivot.add(laserBeam);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), dotMat);
  laserDot.position.set(0, 0, -0.012 - beamLen);
  beamPivot.add(laserDot);
  laserUnit.visible = false;
  laserUnit.userData.beamLen = beamLen;
  laserUnit.userData.beamPivot = beamPivot;       // beam+dot (convergence-rotated)
  laserUnit.userData.laserBodyGroup = laserBodyGroup;  // hardware (fixed, like flashlight)
  group.add(laserUnit);   // temporary parent; reparented to a rail in update

  // ---- FLASHLIGHT unit. Clamp grips the rail (at unit origin); a body group
  // (positioned outboard+down per-side at mount) holds the barrel + lens + cone +
  // light, all pointing -Z (the gun's forward — flashlight isn't zeroed/rotated).
  const flashUnit = new THREE.Group();
  const flashMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4, metalness: 0.7 });
  const fClampMat = new THREE.MeshStandardMaterial({ color: 0x161619, roughness: 0.55, metalness: 0.55 });
  const fClamp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.024), fClampMat);
  fClamp.position.set(0, 0, 0);
  flashUnit.add(fClamp);
  flashUnit.userData.clamp = fClamp;
  const flashBodyGroup = new THREE.Group();
  flashBodyGroup.position.set(0, -0.014, 0);   // default; overridden per-side on mount
  flashUnit.add(flashBodyGroup);
  const flashBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 12), flashMat);
  flashBody.rotation.x = Math.PI / 2;
  flashBody.position.set(0, 0, 0.014);    // body extends back from the lens
  flashBodyGroup.add(flashBody);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff7d8 });
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 12), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, -0.012);        // lens at the FRONT (-Z)
  flashBodyGroup.add(lens);
  const coneLen = 4.0;
  const _spotAngle = Math.PI / 7.5;
  const _coneR = Math.tan(_spotAngle) * coneLen;
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flashBeam = new THREE.Mesh(new THREE.ConeGeometry(_coneR, coneLen, 24, 1, true), coneMat);
  flashBeam.rotation.x = Math.PI / 2;
  flashBeam.position.set(0, 0, -0.012 - coneLen / 2);
  flashBodyGroup.add(flashBeam);
  const flashLight = new THREE.SpotLight(0xfff3d0, 0.0, 14, _spotAngle, 0.9, 1.0);
  flashLight.position.set(0, 0, -0.016);
  const flashTarget = new THREE.Object3D();
  flashTarget.position.set(0, 0, -4);
  flashBodyGroup.add(flashLight);
  flashBodyGroup.add(flashTarget);
  flashLight.target = flashTarget;
  flashUnit.visible = false;
  flashUnit.userData.flashBodyGroup = flashBodyGroup;
  group.add(flashUnit);

  // ---- v1.61b: TOP-RAIL SIGHT ANCHOR + optics. The anchor origin sits on the
  // gun's TOP RAIL surface (sightY = rail top, sightZ = center). A short visible
  // Picatinny rail is drawn at the anchor so the optic has something to perch on
  // and the height reads as intentional. Optics are built with their FOOT at
  // y=0, so they stand UP from the rail (no more sinking into the receiver).
  const sightAnchor = new THREE.Group();
  sightAnchor.position.set(0, mount.sightY || 0.05, mount.sightZ || -0.05);
  const sc = mount.sightScale || 1.0;
  sightAnchor.scale.set(sc, sc, sc);
  group.add(sightAnchor);
  // Visible top rail beneath the optic (skipped for guns that already model one,
  // but harmless to draw — it's thin and sits right at the receiver top).
  const topRailMat = new THREE.MeshStandardMaterial({ color: 0x202024, roughness: 0.5, metalness: 0.6 });
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.006, 0.075), topRailMat);
  topRail.position.set(0, -0.003, 0);   // top face flush with the anchor origin
  sightAnchor.add(topRail);
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.003, 0.004), topRailMat);
    slot.position.set(0, -0.001, -0.028 + i * 0.014);
    sightAnchor.add(slot);
  }
  const redDotOptic = buildRedDotOptic(); redDotOptic.visible = false; sightAnchor.add(redDotOptic);
  const scopeOptic  = buildScopeOptic();  scopeOptic.visible  = false; sightAnchor.add(scopeOptic);

  group.userData.accessories = { laserUnit, laserBeam, laserDot, laserEmitter: emitter, flashUnit, flashLight, flashTarget,
    railAnchors, sightAnchor, redDotOptic, scopeOptic, underParts, gunGroup: group };
  return group.userData.accessories;
}

// Show/hide + POSITION the laser & flashlight on a gun group based on the
// accessories mounted on THAT gun (v1.28: both can be on at once, each on a
// left or right rail). Called when the held mesh is shown/swapped.
function updateFPGunAccessory(group, gunType, mountedOverride) {
  if (!group) return;
  const acc = ensureFPGunAccessory(group, gunType);
  const mounted = mountedOverride || getMountedAccessories(gunType);   // v1.211: the shop's pictures pass their own
  // v1.36i: either laser variant (red or green) shows the FP laser rig; the
  // mounted attachment's `laserColor` recolors the beam/dot/emitter.
  const laserPl = mounted.find(a => a.type === 'laser' || a.type === 'laser_green');
  const flashPl = mounted.find(a => a.type === 'flashlight');

  // v1.40e: parent each accessory onto the RAIL ANCHOR matching its placement.
  // placement 'left' → anchor[0], 'right' → anchor[1]. Position it at the rail's
  // OUTER face so the body sits flush against that side of the gun. Reparenting
  // also re-triggers the laser zero (its parent frame changed).
  const anchors = acc.railAnchors || [];
  const anchorFor = (placement) => {
    if (placement === 'right' && anchors[1]) return anchors[1];
    return anchors[0] || acc.gunGroup;   // 'left' or single-rail guns
  };
  const mountUnitOnRail = (unit, placement, isLaser) => {
    const anchor = anchorFor(placement);
    if (unit.parent !== anchor) {
      anchor.add(unit);                  // three reparents (keeps it in the tree)
      if (isLaser && unit.userData.beamPivot) {
        unit.userData.beamPivot.userData.needsZero = true;
        unit.userData.beamPivot.userData.zeroQuat = null;
      }
    }
    // v1.40k: clean rail→mount→attachment chain, all stepping OUTBOARD (+side
    // from the rail's outer face) and CENTERED on the rail height (no down push),
    // matching the verified render. The unit origin already sits at the rail's
    // outer face (outX = +side). The clamp grips just outboard of that; the
    // attachment body sits further outboard, its center-mass over the mount,
    // pointing down the barrel (-Z). +side here is "away from the gun" for both
    // rails, so left/right mirror cleanly.
    const side = (anchor.userData && anchor.userData.side) || -1;   // -1 left, +1 right
    const outX = (anchor.userData && anchor.userData.outX) || 0;
    unit.position.set(outX, 0, 0);
    const mountOut = side * 0.006;   // clamp/mount just outboard of the rail face
    const bodyOut  = side * 0.016;   // attachment body sits on top of the mount
    const bodyDown = 0;              // centered on rail height
    if (unit.userData.clamp) unit.userData.clamp.position.set(mountOut, 0, 0);
    if (isLaser) {
      // Laser HARDWARE sits exactly like the flashlight body (same offset); the
      // BEAM pivot shares the same origin so the beam starts at the lens.
      if (unit.userData.laserBodyGroup) unit.userData.laserBodyGroup.position.set(bodyOut, bodyDown, 0);
      if (unit.userData.beamPivot) unit.userData.beamPivot.position.set(bodyOut, bodyDown, 0);
    } else if (unit.userData.flashBodyGroup) {
      unit.userData.flashBodyGroup.position.set(bodyOut, bodyDown, 0);
    }
  };

  acc.laserUnit.visible = !!laserPl;
  if (laserPl) {
    mountUnitOnRail(acc.laserUnit, laserPl.placement, true);
    // v1.36i: recolor the FP beam/dot/emitter to the equipped laser's color.
    const lc = (ATTACHMENTS[laserPl.type] && ATTACHMENTS[laserPl.type].laserColor) || 'red';
    const FP_LASER_PAL = {
      red:   { beam: 0xff1a1a, dot: 0xff5555, emitter: 0xff2a2a, emissive: 0xff0000 },
      green: { beam: 0x33ff44, dot: 0x99ff99, emitter: 0x2aff3a, emissive: 0x00ff10 },
    };
    const pal = FP_LASER_PAL[lc] || FP_LASER_PAL.red;
    if (acc.laserBeam) acc.laserBeam.material.color.setHex(pal.beam);
    if (acc.laserDot)  acc.laserDot.material.color.setHex(pal.dot);
    if (acc.laserEmitter) {
      acc.laserEmitter.material.color.setHex(pal.emitter);
      acc.laserEmitter.material.emissive.setHex(pal.emissive);
    }
  }
  acc.flashUnit.visible = !!flashPl;
  if (flashPl) mountUnitOnRail(acc.flashUnit, flashPl.placement, false);
  acc.flashLight.intensity = flashPl ? 3.4 : 0.0;   // v1.38: 2.6 → 3.4 to matter in the darker night
  // v1.61: TOP-RAIL SIGHT — show the matching optic mesh (red-dot or scope). One
  // sight per gun; the glass + reticle render in-world, the HUD dot/scope overlay
  // handle the centered aim cue. No sight → both hidden.
  const sightPl = mounted.find(a => a.type === 'red_dot' || a.type === 'scope');
  if (acc.redDotOptic) acc.redDotOptic.visible = !!sightPl && sightPl.type === 'red_dot';
  if (acc.scopeOptic)  acc.scopeOptic.visible  = !!sightPl && sightPl.type === 'scope';
  // v1.73: fold down the iron FRONT sight when an optic is mounted. On the AR the
  // tall front post sits right in the red-dot's lens view (playtest: "ironsight
  // gets in the way"). Tagged meshes (userData.ironSight) hide while an optic is
  // up and reappear when it's removed. Other guns have no tagged irons, so this
  // is a no-op for them.
  const opticUp = !!sightPl;
  group.traverse(m => { if (m.userData && m.userData.ironSight) m.visible = !opticUp; });
  // v1.169: the homemade part on the under-barrel slot
  if (acc.underParts) {
    const underPl = mounted.find(a => a.slot === 'under');
    for (const k in acc.underParts.meshes) acc.underParts.meshes[k].visible = !!underPl && underPl.type === k;
  }
}

// v1.169 (backlog D.14 B): the four homemade under-barrel parts, built once per gun group and hidden. Where they go is
// read off the bare gun: the underside of whatever is at the rail's middle on the bore line (the handguard), and the
// front of the barrel. Each part is its own group, named by its ATTACHMENTS key.
function measureGunForUnder(group, mount) {
  group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  let bottom = null, frontZ = 0, frontY = mount.barrelY;
  group.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.visible || o.userData.fpHand) return;   // v1.219: not the hands
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    if (b.min.x > 0.004 || b.max.x < -0.004) return;                       // off the centre line
    if (b.min.z <= mount.railZ + 0.012 && b.max.z >= mount.railZ - 0.012 &&
        b.min.y <= mount.barrelY + 0.012 && b.max.y >= mount.barrelY - 0.012) {
      if (bottom === null || b.min.y < bottom) bottom = b.min.y;
    }
    if (b.min.y <= mount.barrelY + 0.03 && b.max.y >= mount.barrelY - 0.03 && b.min.z < frontZ) {
      frontZ = b.min.z; frontY = (b.min.y + b.max.y) / 2;
    }
  });
  return { bottom: bottom === null ? mount.barrelY - 0.022 : bottom, frontZ, frontY };
}
function buildUnderParts(group, mount) {
  const m = measureGunForUnder(group, mount);
  const meshes = {};
  const z0 = mount.railZ, y0 = m.bottom;
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x9ea3a8, roughness: 0.55, metalness: 0.35 });   // duct tape
  // Taped twin mag: a spare mag hanging under the handguard, two bands of duct tape round it and the gun
  {
    const g = new THREE.Group();
    const magMat = new THREE.MeshStandardMaterial({ color: 0x2848a0, roughness: 0.4, metalness: 0.2 });
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.075, 0.034), magMat);
    mag.position.set(0, y0 - 0.0375, z0); mag.rotation.x = -0.12; g.add(mag);
    for (const dz of [-0.011, 0.011]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.03, 0.007), tapeMat);
      band.position.set(0, y0 - 0.008, z0 + dz); g.add(band);
    }
    meshes.taped_mag = g;
  }
  // Shoelace sling: a red strap looping down from a knot under the handguard back toward the stock
  {
    const g = new THREE.Group();
    const laceMat = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.85 });
    const r = 0.09;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0035, 6, 28, Math.PI), laceMat);
    strap.rotation.set(0, Math.PI / 2, Math.PI);          // a half loop in the y-z plane, hanging down
    strap.position.set(0, y0, z0 + r); g.add(strap);
    for (const zz of [z0, z0 + 2 * r]) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), laceMat);
      knot.position.set(0, y0 - 0.002, zz); g.add(knot);
    }
    meshes.sling = g;
  }
  // PVC foregrip: a white pipe stub, a steel hose clamp at the top and a cap on the end
  {
    const g = new THREE.Group();
    const pvcMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.062, 14), pvcMat);
    pipe.position.set(0, y0 - 0.031, z0); g.add(pipe);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.012, 14), pvcMat);
    cap.position.set(0, y0 - 0.062, z0); g.add(cap);
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 16), tapeMat);
    clamp.rotation.x = Math.PI / 2; clamp.position.set(0, y0 - 0.006, z0); g.add(clamp);
    meshes.foregrip = g;
  }
  // Cardboard barrel: a paper-towel tube over the muzzle, with a band of tape where it meets the gun
  {
    const g = new THREE.Group();
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.95 });
    const len = 0.13;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 16, 1, true), cardMat);
    tube.material.side = THREE.DoubleSide;
    tube.rotation.x = Math.PI / 2; tube.position.set(0, m.frontY, m.frontZ + 0.02 - len / 2); g.add(tube);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.018, 16), tapeMat);
    band.rotation.x = Math.PI / 2; band.position.set(0, m.frontY, m.frontZ + 0.012); g.add(band);
    meshes.cardboard_barrel = g;
  }
  for (const k in meshes) { meshes[k].visible = false; meshes[k].userData.underPart = k; group.add(meshes[k]); }
  return { meshes, bottom: y0, frontZ: m.frontZ, frontY: m.frontY };
}

// v1.27b/v1.40c: laser zero target, pinned to the camera at screen-center,
// ZERO_DIST ahead. Used ONCE per gun to compute the laser's fixed mount angle.
let _laserAimTarget = null;
const LASER_ZERO_DIST = 18.0;
function aimLaserForGun(group) {
  if (!group || !group.userData.accessories) return;
  const laserUnit = group.userData.accessories.laserUnit;
  if (!laserUnit || !laserUnit.visible) return;
  const beamPivot = laserUnit.userData.beamPivot;
  if (!beamPivot) return;

  // v1.40f: ZERO the BEAM PIVOT only — the clamp (laserUnit's direct children)
  // stays bolted flush to the rail, while just the optic head swivels so the beam
  // points at the aim point. Computed once with the gun steady, then locked: the
  // pivot's fixed local quaternion makes the beam inherit 100% of the gun's
  // transform and move ONLY with the gun.
  if (beamPivot.userData.needsZero || !beamPivot.userData.zeroQuat) {
    const steady = (Game.player.sway || 0) <= 0.25;
    if (steady) {
      if (!_laserAimTarget) {
        _laserAimTarget = new THREE.Object3D();
        _laserAimTarget.position.set(0, 0, -LASER_ZERO_DIST);
        Game.camera.add(_laserAimTarget);
      }
      Game.camera.updateWorldMatrix(true, true);
      group.updateWorldMatrix(true, true);
      beamPivot.updateWorldMatrix(true, true);
      // Desired beam direction = emitter → screen-center target (world space).
      const tgt = new THREE.Vector3();
      _laserAimTarget.getWorldPosition(tgt);
      const originW = new THREE.Vector3();
      beamPivot.getWorldPosition(originW);
      const wantDirW = tgt.clone().sub(originW).normalize();
      // Express that direction in the PARENT's local frame (the pivot's frame
      // before its own rotation), then build a quaternion rotating the beam's
      // native forward (local -Z) onto it. This is a small convergence tweak —
      // no 180° flip, no lookAt up-vector roll — so it matches the flashlight's
      // orientation logic and mirrors cleanly L/R.
      const parentWorldQuat = new THREE.Quaternion();
      beamPivot.parent.getWorldQuaternion(parentWorldQuat);
      const wantDirLocal = wantDirW.clone().applyQuaternion(parentWorldQuat.clone().invert()).normalize();
      const forward = new THREE.Vector3(0, 0, -1);   // beam's native forward
      const q = new THREE.Quaternion().setFromUnitVectors(forward, wantDirLocal);
      beamPivot.userData.zeroQuat = q;
      beamPivot.userData.needsZero = false;
    } else if (!beamPivot.userData.zeroQuat) {
      beamPivot.userData.zeroQuat = new THREE.Quaternion();
    }
  }
  // Apply the fixed head orientation (rigid; moves only with the gun).
  beamPivot.quaternion.copy(beamPivot.userData.zeroQuat);

  // CLIP the beam to the first solid object it hits. Raycast from the emitter
  // (beamPivot origin) along its world -Z (the beam's forward).
  const acc = group.userData.accessories;
  const beamLen = laserUnit.userData.beamLen || 18.0;
  beamPivot.updateWorldMatrix(true, false);
  const originW = new THREE.Vector3();
  beamPivot.getWorldPosition(originW);
  const fwdW = new THREE.Vector3(0, 0, -1).transformDirection(beamPivot.matrixWorld).normalize();
  const obstacles = Game.player && Game.player.obstacles;
  let dist = beamLen;
  if (obstacles) {
    dist = raycastObstacles(originW.x, originW.y, originW.z, fwdW.x, fwdW.y, fwdW.z, beamLen, obstacles);
  }
  dist = Math.max(0.4, Math.min(beamLen, dist));
  // Beam runs forward (-Z) from the lens at z=-0.012 out to `dist`.
  const L = Math.max(0.01, dist);
  if (acc.laserBeam) {
    acc.laserBeam.scale.y = L / beamLen;
    acc.laserBeam.position.set(0, 0, -0.012 - L / 2);
  }
  if (acc.laserDot) acc.laserDot.position.set(0, 0, -0.012 - L);
  // The flashlight (flashUnit) is parented to the same rail, so its cone inherits
  // the gun transform identically — every bolted-on accessory moves only with
  // the gun, nothing aims independently.
}

// =====================================================================
// THE WORKBENCH (v1.28) — visual gun customization
// A dedicated mini Three.js scene shows the selected gun on a turntable with
// its accessories mounted live. Slot assignment is done via the list on the
// right; the 3D view reflects every change immediately. Position labels (Sight
// / Left / Right) float over the model so the player sees where things sit.
// =====================================================================
const WB = {
  active: false,
  scene: null, camera: null, renderer: null,
  gunGroup: null, turntable: null,
  gunType: null,
  selSlot: null,          // { slot:'sight'|'rail', railIndex }
  kindOpen: {},           // v1.329 (D.64): a gun kind's section opened or closed by hand (else open if you own one of its guns)
  yaw: 0.5, pitch: 0.2, dist: 0.9,
  dragging: false, lastX: 0, lastY: 0,
  autoRotate: true,
  // Anchors (local-space points on the gun) for the floating position labels.
  labelAnchors: [],
};

function initWorkbenchScene() {
  if (WB.renderer) return;
  const canvas = document.getElementById('wbCanvas');
  WB.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  WB.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  WB.scene = new THREE.Scene();
  WB.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  // Lighting — soft key + fill so the gun reads well on the dark vignette.
  const key = new THREE.DirectionalLight(0xfff2e0, 1.1); key.position.set(2, 3, 2); WB.scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.4); fill.position.set(-2, 1, -1); WB.scene.add(fill);
  WB.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  WB.turntable = new THREE.Group();
  WB.scene.add(WB.turntable);
  bindWorkbenchPointer(canvas);
}

function bindWorkbenchPointer(canvas) {
  canvas.addEventListener('mousedown', (e) => { WB.dragging = true; WB.autoRotate = false; WB.lastX = e.clientX; WB.lastY = e.clientY; });
  window.addEventListener('mousemove', (e) => {
    if (!WB.dragging) return;
    WB.yaw   += (e.clientX - WB.lastX) * 0.01;
    WB.pitch += (e.clientY - WB.lastY) * 0.01;
    WB.pitch = Math.max(-1.2, Math.min(1.2, WB.pitch));
    WB.lastX = e.clientX; WB.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { WB.dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    WB.dist = Math.max(0.4, Math.min(2.0, WB.dist + e.deltaY * 0.001));
  }, { passive: false });
}

// Build a FRESH gun mesh for display (not the cached viewmodel instance, which
// is parented to the FP camera). Reset its pose flat for turntable viewing.
function buildWorkbenchGun(gunType) {
  const mesh = buildBareGunMesh(gunType);
  // Build the accessory rig on this fresh group so laser/flashlight render here.
  ensureFPGunAccessory(mesh, gunType);
  return mesh;
}
// v1.209: split out of buildWorkbenchGun so the shop's pictures get the gun with nothing mounted
function buildBareGunMesh(gunType) {
  let mesh;
  if (gunType === 'pistol')       mesh = buildFPGun();
  else if (gunType === 'shotgun') mesh = buildFPShotgun();
  else if (gunType === 'ar')      mesh = buildFPAR();
  else if (gunType === 'sniper')  mesh = buildFPSniper();
  else if (gunType === 'ak47')    mesh = buildFPAK();
  else if (gunType === 'mp5')     mesh = buildFPMP5();
  else if (gunType === 'ump')     mesh = buildFPUMP();
  else if (gunType === 'mac10')   mesh = buildFPMAC10();
  else if (gunType === 'thunder') mesh = buildFPThunder();       // v1.168
  else if (gunType === 'sixshooter') mesh = buildFPSixShooter();
  else if (gunType === 'bucket')  mesh = buildFPBucket();
  else if (gunType === 'boltpistol') mesh = buildFPBoltPistol();
  else if (gunType === 'sprayer') mesh = buildFPSprayer();      // v1.250 (D.37)
  else if (gunType === 'ghost')   mesh = buildFPGhost();
  else if (gunType === 'ticktock') mesh = buildFPTickTock();
  else if (gunType === 'rattle')  mesh = buildFPRattle();
  else if (gunType === 'famas')   mesh = buildFPFamas();      // v1.325 (D.63)
  else if (gunType === 'epistol') mesh = buildFPElectricPistol();   // v1.326
  else if (gunType === 'erifle')  mesh = buildFPElectricRifle();
  else if (gunType === 'burst')   mesh = buildFPBurstRifle();     // v1.327
  else if (gunType === 'semishotgun') mesh = buildFPSemiShotgun();   // v1.328
  else if (gunType === 'm249')    mesh = buildFPM249();          // v1.335
  else if (gunType === 'l96')     mesh = buildFPL96();           // v1.336
  else if (gunType === 'p90')     mesh = buildFPP90();           // v1.346
  else if (gunType === 'vector')  mesh = buildFPVector();        // v1.348
  else if (gunType === 'g36')     mesh = buildFPG36();           // v1.371
  else if (gunType === 'aug')     mesh = buildFPAUG();           // v1.372
  else if (gunType === 'm4')      mesh = buildFPM4();            // v1.373
  else if (gunType === 'svd')     mesh = buildFPSVD();           // v1.395
  else if (gunType === 'rpk')     mesh = buildFPRPK();           // v1.396
  else if (gunType === 'spas')    mesh = buildFPSpas();          // v1.398
  else if (gunType === 'gaspistol') mesh = buildFPGasPistol();   // v1.399
  else if (gunType === 'thompson') mesh = buildFPThompson();     // v1.403
  else if (gunType === 'm14')     mesh = buildFPM14();           // v1.404
  else mesh = buildFPGun();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.visible = true;
  return mesh;
}

// v1.209 (backlog D.23, Michael 13 Oct: "a mesh sample of weapons / whatever you're buying as the icon, and ... a
// larger image" on the details page): the shop photographs each gun's own model, side-on and a little from the front,
// on one small offscreen renderer made the first time it is needed. Each picture is a data URL, cached by gun and size.
const SHOP_PIC = { renderer: null, scene: null, cache: {} };
function shopGunPic(gunType, w, h) {
  return shopPic('gun:' + gunType, w, h, () => {
    const holder = new THREE.Group();
    holder.add(buildBareGunMesh(gunType));
    holder.rotation.set(0.18, Math.PI / 2 - 0.42, 0);   // the muzzle to the left, turned a little toward you
    return { obj: holder, fit: [holder] };
  });
}
// v1.210 (D.23, clothes): a hat, top or pair of shorts is photographed on a plain kid wearing it, the camera fitted to
// the part of him it covers (fit: the meshes whose box the picture frames).
function shopClothesPic(kind, id, w, h) {
  return shopPic(kind + ':' + id, w, h, () => {
    const look = { hairStyle: 'short', skinColor: 0xd9a77e, hairColor: 0x4a3020, shirtColor: 0xe9e6dc, pantsColor: 0x3d4f6e };
    look[kind] = id;
    const kid = createKid(look, 'pistol');
    kid.gunGroup.visible = false;
    kid.group.rotation.y = 0.45;   // turned a little, as at the mirror
    let fit;
    if (kind === 'hat') fit = [kid.hat, kid.head];
    else if (kind === 'top') fit = [kid.torso, kid.top].filter(Boolean);
    else fit = (Array.isArray(kid.shorts) ? kid.shorts : [kid.shorts]).filter(Boolean);
    return { obj: kid.group, fit, pad: kind === 'hat' ? 1.3 : kind === 'top' ? 1.2 : 1.25 };
  });
}
// v1.210 (D.23, gear): eye pro, armour, shoes and the belt and holster, on the same plain kid with the Loadout
// screen's gear meshes (buildKidGear), framed on the piece. kind: eyewear | armor | shoes | belt (id = slots, 3 or 4).
function shopGearPic(kind, id, w, h) {
  return shopPic('gear:' + kind + ':' + id, w, h, () => {
    const kid = createKid({ hairStyle: 'short', skinColor: 0xd9a77e, hairColor: 0x4a3020, shirtColor: 0xe9e6dc, pantsColor: 0x3d4f6e }, 'pistol');
    kid.gunGroup.visible = false;
    const gear = { eyewear: 'none', chest: null, arms: null, legs: null, shoes: 'none', belt: 2 };
    let rotY = 0.45;
    if (kind === 'eyewear') gear.eyewear = id;
    else if (kind === 'armor') gear[ARMOR[id].zone] = id;
    else if (kind === 'shoes') gear.shoes = id;
    else if (kind === 'belt') { gear.belt = id; rotY = id >= 4 ? 1.0 : 0.6; }   // turned to show the hip
    kid.group.rotation.y = rotY;
    if (kind === 'shoes') { kid.group.rotation.y = 0.75; kid.group.rotation.x = 0.55; }   // tipped toward you, to see the pair from above
    const out = buildKidGear(kid, gear);
    kid.group.updateMatrixWorld(true);
    let fit;
    if (kind === 'eyewear') fit = [kid.head];
    else if (kind === 'armor') fit = out[ARMOR[id].zone];
    else if (kind === 'shoes') fit = out.shoes.length ? out.shoes : [kid.pose.shoeL, kid.pose.shoeR];
    else fit = out.belt;
    if (!fit || !fit.length) fit = [kid.torso];
    if (kind === 'shoes') {   // just the pair, as a catalogue shows shoes: the rest of the kid is hidden
      const keep = new Set();
      for (const f of fit) { f.traverse(o => keep.add(o)); for (let p = f.parent; p; p = p.parent) keep.add(p); }
      kid.group.traverse(o => { if (o.isMesh && !keep.has(o)) o.visible = false; });
      // a gear pair hangs under the plain shoe it covers: that shoe stays on, hidden only by the gear over it
    }
    const pad = kind === 'shoes' ? 1.2 : kind === 'eyewear' ? 1.25 : 1.3;
    return { obj: kid.group, fit, pad };
  });
}
// v1.211 (D.23, the last part): the Mods tab's parts, each mounted alone on the AR (the one gun with every slot) and
// framed on the part with a little of the gun round it, so you see where it goes. Rail parts go on the left rail, the
// side the camera sees; under-barrel parts are seen from a little below.
function shopModPic(aid, w, h) {
  return shopPic('mod:' + aid, w, h, () => {
    const a = ATTACHMENTS[aid];
    const gun = buildBareGunMesh('ar');
    const holder = new THREE.Group();
    holder.add(gun);
    const acc = ensureFPGunAccessory(gun, 'ar');
    updateFPGunAccessory(gun, 'ar', [{ type: aid, slot: a.slot, placement: a.slot === 'rail' ? 'left' : a.slot }]);
    if (acc.laserBeam) acc.laserBeam.visible = false;   // the beam and its dot would run out of the frame
    if (acc.laserDot) acc.laserDot.visible = false;
    if (acc.flashLight) acc.flashLight.intensity = 0;
    holder.rotation.set(a.slot === 'under' ? -0.32 : 0.22, Math.PI / 2 - 0.42, 0);
    holder.updateMatrixWorld(true);
    let part, fit;
    if (a.slot === 'sight') part = aid === 'scope' ? acc.scopeOptic : acc.redDotOptic;
    else if (a.slot === 'under') part = acc.underParts && acc.underParts.meshes[aid];
    else if (aid === 'flashlight') {   // framed on the body and lens, not the 4 m cone of its beam
      part = acc.flashUnit;
      const fb = part.userData.flashBodyGroup;
      fb.children.forEach(o => { if (o.isMesh && o.geometry.type === 'ConeGeometry') o.visible = false; });
      fit = fb.children.filter(o => o.isMesh && o.visible);
    } else { part = acc.laserUnit; fit = [part.userData.laserBodyGroup || part]; }
    part = part || gun;
    // the gun is drawn pale, as a catalogue shows a part on a grey gun, so the part keeps its own colours
    const mine = new Set(); part.traverse(o => mine.add(o));
    const pale = new THREE.MeshStandardMaterial({ color: 0xc9cbcf, roughness: 0.7, metalness: 0.05 });
    gun.traverse(o => { if (o.isMesh && !mine.has(o) && !(o.material && o.material.transparent)) o.material = pale; });
    return { obj: holder, fit: fit || [part], pad: aid === 'scope' ? 1.45 : a.slot === 'sight' ? 1.9 : 1.7 };
  });
}
// v1.211 (D.23): the Ammo tab. A speed loader is its own model (the one you hold in a match), longer for the bigger
// ones; a BB pack is a clear bag of BBs with a card header, and the two cases are cardboard boxes, the bulk case wider
// (v1.330: a tube, a spigot tube, a bottle and a bag now).
function shopAmmoPic(id, w, h) {
  return shopPic('ammo:' + id, w, h, () => {
    const holder = new THREE.Group();
    if (id.startsWith('sl_')) {
      const ld = buildFPLoader();
      ld.position.set(0, 0, 0); ld.rotation.set(0, 0, 0); ld.visible = true;
      ld.scale.set(1, 1, { sl_50: 1, sl_100: 1.3, sl_200: 1.7 }[id] || 1);
      const tip = new THREE.Group(); tip.add(ld);
      tip.rotation.set(0.35, Math.PI / 2 - 0.5, 0);   // the nozzle to the left, tipped to see the plunger
      holder.add(tip);
      holder.rotation.z = 0.6;   // laid corner to corner, so the long tube fills the square
      return { obj: holder, fit: [ld], pad: 1.1 };
    }
    // v1.330 (backlog D.66, Michael 22 Oct: "500 BBs should be a little plastic cylinder with a little spigot/dispenser,
    // 1000-2000 could be just tall cylinders (look almost like a coke bottle), and anything above 2,000 could be in
    // bags"): 100 in a short clear tube with a screw cap, 500 in a clear tube with a flip-up spigot on its cap, 2,000 in a
    // tall clear bottle with a shoulder, a neck and a label round it, 5,000 in a big flat foil bag the size of a book.
    const n = +id.slice(4);
    const bbMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: 0.35 });
    const clear = new THREE.MeshStandardMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.3, roughness: 0.1 });
    const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); holder.add(m); return m; };
    if (n <= 2000) {
      // a clear plastic container full of BBs: [radius, body height, cap colour]
      const [r, bh, capCol] = n <= 100 ? [0.065, 0.09, 0xe0b020] : n <= 500 ? [0.065, 0.16, 0x2a6fd1] : [0.09, 0.30, 0xc93030];
      mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, bh * 0.94, 18), bbMat, 0, -bh * 0.03);   // the BBs inside
      mesh(new THREE.CylinderGeometry(r, r, bh, 18), clear);
      const bbGeo = new THREE.SphereGeometry(r * 0.13, 6, 5);   // BBs pressing at the plastic
      for (let i = 0; i < 28; i++) {
        const a = -0.9 + (((i * 37) % 19) / 19) * 1.8, yy = (((i * 53) % 23) / 23 - 0.5) * bh * 0.85;
        mesh(bbGeo, bbMat, Math.sin(a) * r * 0.92, yy, Math.cos(a) * r * 0.92);
      }
      let top = bh / 2;
      if (n >= 2000) {   // the bottle's shoulder and neck
        mesh(new THREE.CylinderGeometry(r * 0.38, r, 0.06, 18), clear, 0, top + 0.03);
        mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.86, 0.05, 18), bbMat, 0, top + 0.022);
        mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.38, 0.03, 18), clear, 0, top + 0.075);
        top += 0.09;
        const label = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, bh * 0.36, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), 0, -bh * 0.05);
        label.rotation.y = 0.5;
        mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, bh * 0.07, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xc93030, side: THREE.DoubleSide }), 0, bh * 0.07);
      } else {
        mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, bh * 0.3, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), 0, -bh * 0.08);
      }
      const capR = n >= 2000 ? r * 0.42 : r * 1.04, capH = n >= 2000 ? 0.035 : 0.03;
      mesh(new THREE.CylinderGeometry(capR, capR, capH, 18), new THREE.MeshStandardMaterial({ color: capCol, roughness: 0.5 }), 0, top + capH / 2);
      if (n === 500) {   // the spigot: a little spout tipped up off the cap, with its flip lid
        const spout = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 10), new THREE.MeshStandardMaterial({ color: capCol, roughness: 0.5 }), r * 0.45, top + capH + 0.018);
        spout.rotation.z = -0.5;
        const lid = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.026), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), r * 0.05, top + capH + 0.035);
        lid.rotation.z = 0.7;
      }
      holder.rotation.set(0.25, 0.4, 0);
      return { obj: holder, fit: [holder], pad: 1.0 };
    }
    // the bag: a big flat foil pouch, tall as a book, a heat-sealed strip and a hang hole at the top, a label and a
    // window showing the BBs
    const bw = 0.30, bh = 0.40, bd = 0.06;
    mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 0.35, metalness: 0.5 }));
    mesh(new THREE.BoxGeometry(bw * 1.01, bh * 0.08, bd * 0.4), new THREE.MeshStandardMaterial({ color: 0x9aa4b4, roughness: 0.3, metalness: 0.6 }), 0, bh * 0.46);
    const hole = mesh(new THREE.CylinderGeometry(0.014, 0.014, bd * 0.42, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, bh * 0.465);
    hole.rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(bw * 0.8, bh * 0.2, 0.003), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), 0, bh * 0.2, bd / 2 + 0.002);
    mesh(new THREE.BoxGeometry(bw * 0.8, bh * 0.05, 0.004), new THREE.MeshStandardMaterial({ color: 0xc93030 }), 0, bh * 0.27, bd / 2 + 0.003);
    mesh(new THREE.BoxGeometry(bw * 0.6, bh * 0.32, 0.003), bbMat, 0, -bh * 0.17, bd / 2 + 0.002);   // the window, full of BBs
    const bbGeo = new THREE.SphereGeometry(0.011, 6, 5);
    for (let i = 0; i < 30; i++) mesh(bbGeo, bbMat, (((i * 37) % 19) / 19 - 0.5) * bw * 0.55, -bh * 0.17 + (((i * 53) % 23) / 23 - 0.5) * bh * 0.28, bd / 2 + 0.006);
    holder.rotation.set(0.15, 0.45, 0);
    return { obj: holder, fit: [holder], pad: 1.08 };
  });
}
// v1.212 (D.23): the gun page's magazines. The mag is the one you hold to reload in a match (buildFPMag), taller for
// more BBs, drawn in one fixed frame so a bigger mag looks bigger; a spare-mag row shows a pair of them, since you buy
// spares to carry several.
function shopMagPic(cap, pair, w, h) {
  return shopPic('mag:' + cap + (pair ? ':pair' : ''), w, h, () => {
    const holder = new THREE.Group();
    const tall = Math.max(0.7, Math.min(1.35, 0.7 + 0.5 * Math.log10(Math.max(1, cap) / 10)));
    const one = (x, rz) => {
      const m = buildFPMag();
      m.position.set(x, 0, 0); m.rotation.set(0, 0.5, rz); m.visible = true;
      m.scale.set(1, tall, 1);
      m.position.y = (tall - 1.35) * 0.084;   // every mag stands on the same floor
      holder.add(m);
    };
    if (pair) { one(-0.034, 0.12); one(0.034, -0.08); } else one(0, 0.06);
    // the frame: the same box for every mag, the size of the tallest pair
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
    frame.position.y = -0.0134;
    holder.add(frame);
    holder.rotation.x = 0.12;
    return { obj: holder, fit: [frame], pad: 1.05 };
  });
}
function shopPic(key0, w, h, make) {
  const key = key0 + '@' + w + 'x' + h;
  if (SHOP_PIC.cache[key]) return SHOP_PIC.cache[key];
  if (!SHOP_PIC.renderer) {
    try {
      SHOP_PIC.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return null; }   // no WebGL to spare: the row keeps its old glyph
    SHOP_PIC.renderer.setClearColor(0x000000, 0);
    SHOP_PIC.scene = new THREE.Scene();
    const key1 = new THREE.DirectionalLight(0xfff2e0, 1.1); key1.position.set(2, 3, 2); SHOP_PIC.scene.add(key1);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.45); fill.position.set(-2, 1, -1); SHOP_PIC.scene.add(fill);
    SHOP_PIC.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  }
  const r = SHOP_PIC.renderer;
  r.setSize(w * 2, h * 2, false);   // drawn at twice the size it shows, for a crisp picture
  const shot = make();
  const holder = shot.obj;
  SHOP_PIC.scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const o of shot.fit) box.expandByObject(o);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const aspect = w / h, pad = shot.pad || 1.12;
  const halfW = Math.max(sz.x / 2, (sz.y / 2) * aspect) * pad, halfH = halfW / aspect;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 10);
  cam.position.set(c.x, c.y, c.z + 3);
  cam.lookAt(c);
  r.render(SHOP_PIC.scene, cam);
  const url = r.domElement.toDataURL('image/png');
  SHOP_PIC.scene.remove(holder);
  SHOP_PIC.cache[key] = url;
  return url;
}
function shopGunIcon(iconEl, gunType, w, h) {
  shopIconImg(iconEl, shopGunPic(gunType, w, h), (GUN_MAGS[gunType] && GUN_MAGS[gunType].displayName) || gunType, { gun: gunType });
}
function shopIconImg(iconEl, url, alt, data) {
  if (!url) return;
  iconEl.textContent = '';
  iconEl.style.color = '';
  const img = document.createElement('img');
  img.src = url; img.alt = alt;
  Object.assign(img.dataset, data);
  iconEl.appendChild(img);
  iconEl.classList.add('pic');
}

function workbenchSelectGun(gunType) {
  WB.gunType = gunType;
  crewTakeBack('gun', gunType);   // v1.337: a gun a crew kid has comes back to you
  Game.persist.equipped.gun = gunType;  // keep equipped gun in sync with what you're customizing
  ensureGunSlots(gunType);
  if (WB.gunGroup) { WB.turntable.remove(WB.gunGroup); WB.gunGroup = null; }
  WB.gunGroup = buildWorkbenchGun(gunType);
  WB.turntable.add(WB.gunGroup);
  WB.selSlot = null;
  WB.autoRotate = true; WB.yaw = 0.5; WB.pitch = 0.2;
  refreshWorkbenchAccessoryVisuals();
  computeWorkbenchLabelAnchors(gunType);
  renderWorkbench();
}

// Update the on-model accessory rig + (display-only) laser aim for the bench.
function refreshWorkbenchAccessoryVisuals() {
  if (!WB.gunGroup) return;
  updateFPGunAccessory(WB.gunGroup, WB.gunType);
  // v1.40m: the laser now builds facing -Z natively with its hardware fixed on
  // the rail (like the flashlight) and only the thin beam pivot converging. The
  // bench has no live FP camera to zero against, so just point the beam pivot
  // straight down the gun's -Z for display (no convergence) and size the beam to
  // a short visible length. We do NOT rotate laserUnit/laserBodyGroup here — that
  // old override swung the whole optic 180° and threw it inboard.
  const acc = WB.gunGroup.userData.accessories;
  if (acc && acc.laserUnit && acc.laserUnit.visible) {
    const bp = acc.laserUnit.userData.beamPivot;
    if (bp) { bp.quaternion.identity(); }   // beam straight down -Z for display
    const shown = 18 * 0.18;
    if (acc.laserBeam) { acc.laserBeam.scale.y = 0.18; acc.laserBeam.position.set(0, 0, -0.012 - shown / 2); }
    if (acc.laserDot)  acc.laserDot.position.set(0, 0, -0.012 - shown);
  }
}

// Local-space anchor points for the floating Sight/Left/Right labels, derived
// from the gun's FP mount table. Sight sits above the barrel; rails to the sides.
function computeWorkbenchLabelAnchors(gunType) {
  const m = FP_GUN_MOUNT[gunType] || FP_GUN_MOUNT.pistol;
  const cap = getGunAccessoryCap(gunType);
  // v1.172: read the mount's real fields. This read m.y and m.z, which FP_GUN_MOUNT has never had (since v1.40e), so
  // every label but Under was NaN and sat in the viewport's top-left corner. The sight label floats over the sight,
  // clear of the rails' labels; each rail's sits beside its bar (slot 0 is the left rail, the only one on a one-rail
  // gun; buildSideRail).
  const anchors = [];
  anchors.push({ slot: 'sight', railIndex: -1, pos: new THREE.Vector3(0, Math.max(m.sightY, m.barrelY + 0.02) + 0.075, m.sightZ) });
  for (let i = 0; i < cap.rails; i++) {
    const side = i === 0 ? -1 : 1;   // the left label a little high, the right a little low, so the two never stack
    anchors.push({ slot: 'rail', railIndex: i, pos: new THREE.Vector3(side * (m.sideX + 0.06), m.barrelY + (side < 0 ? 0.02 : -0.05), m.railZ) });
  }
  if (cap.under) {   // v1.169: below the handguard
    const up = WB.gunGroup && WB.gunGroup.userData.accessories && WB.gunGroup.userData.accessories.underParts;
    anchors.push({ slot: 'under', railIndex: -1, pos: new THREE.Vector3(0, (up ? up.bottom : m.barrelY - 0.02) - 0.13, m.railZ) });
  }
  WB.labelAnchors = anchors;
}

// Per-frame: spin, position camera, render, and project label anchors to 2D.
function updateWorkbench(dt) {
  if (!WB.active || !WB.renderer) return;
  // Keep the canvas backing store sized to its displayed box.
  const canvas = WB.renderer.domElement;
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 360;
  if (canvas.width !== Math.floor(w * Math.min(window.devicePixelRatio,2)) ||
      canvas.height !== Math.floor(h * Math.min(window.devicePixelRatio,2))) {
    WB.renderer.setSize(w, h, false);
    WB.camera.aspect = w / h;
    WB.camera.updateProjectionMatrix();
  }
  if (WB.autoRotate && !WB.dragging) WB.yaw += dt * 0.5;
  WB.turntable.rotation.y = WB.yaw;
  WB.turntable.rotation.x = WB.pitch;
  // Orbit camera at WB.dist looking at origin.
  WB.camera.position.set(0, 0.04, WB.dist);
  WB.camera.lookAt(0, 0, 0);
  WB.renderer.render(WB.scene, WB.camera);
  projectWorkbenchLabels(w, h);
}

// Project the 3D anchor points to screen px and place the floating labels.
function projectWorkbenchLabels(w, h) {
  const cont = document.getElementById('wbVpLabels');
  if (!cont || !WB.gunGroup) return;
  const slots = Game.persist.equipped.attachments[WB.gunType] || { sight:null, rails:[] };
  // (Re)build label DOM if count changed.
  if (cont.childElementCount !== WB.labelAnchors.length) {
    cont.innerHTML = WB.labelAnchors.map((a, i) => `<div class="wb-vp-label" data-i="${i}"></div>`).join('');
  }
  const tmp = new THREE.Vector3();
  WB.labelAnchors.forEach((a, i) => {
    const el = cont.children[i];
    if (!el) return;
    tmp.copy(a.pos);
    WB.turntable.localToWorld(tmp);
    tmp.project(WB.camera);
    const x = (tmp.x * 0.5 + 0.5) * w;
    const y = (-tmp.y * 0.5 + 0.5) * h;
    const behind = tmp.z > 1;  // clip if behind camera
    el.style.display = behind ? 'none' : 'block';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    let mountedId = a.slot === 'sight' ? slots.sight : a.slot === 'under' ? slots.under : (slots.rails && slots.rails[a.railIndex]);
    const inst = mountedId ? getAccessoryInstance(mountedId) : null;
    const labelName = a.slot === 'sight' ? 'Sight' : a.slot === 'under' ? 'Under' : (WB.labelAnchors.filter(x=>x.slot==='rail').length===1 ? 'Rail' : (a.railIndex===0?'Left':'Right'));
    el.textContent = inst ? `${labelName}: ${ATTACHMENTS[inst.type].name}` : `${labelName}: empty`;
    el.className = 'wb-vp-label' + (inst ? '' : ' empty');
  });
}

// Render the left gun list, right slot list, and locker.
function renderWorkbench() {
  // --- Gun list ---
  const gl = document.getElementById('wbGunList');
  gl.innerHTML = '';
  // v1.329 (backlog D.64, Michael 22 Oct: "reconsider the workbench menu, and have collapsible sections by Gun Type"):
  // the guns sit under a header for each kind, as the shop's (GUN_KINDS), each header folding its section away. A
  // section starts open when you own one of its guns, or when the gun on the bench is in it; a click on its header
  // opens or closes it until the game is closed.
  const isOwned = gt => !!Game.persist.owned[GUN_MAGS[gt].ownFlag] || gt === 'pistol';
  for (const kind of GUN_KINDS) {
    const guns = GUN_ORDER.filter(gt => gunKind(gt) === kind.id);
    if (!guns.length) continue;
    const nOwned = guns.filter(isOwned).length;
    const open = WB.kindOpen[kind.id] ?? (nOwned > 0 || guns.includes(WB.gunType));
    const head = document.createElement('div');
    head.className = 'wb-kind' + (open ? ' open' : '');
    head.dataset.kind = kind.id;
    head.innerHTML = `<span class="wb-kind-arrow">${open ? '▾' : '▸'}</span><span class="wb-kind-nm">${kind.name}</span>` +
      `<span class="wb-kind-n">${nOwned} of ${guns.length}</span>`;
    head.addEventListener('click', () => { WB.kindOpen[kind.id] = !open; renderWorkbench(); });
    gl.appendChild(head);
    if (!open) continue;
    for (const gt of guns) {
      const cfg = GUN_MAGS[gt];
      const owned = isOwned(gt);
      const div = document.createElement('div');
      div.className = 'wb-gun' + (gt === WB.gunType ? ' active' : '') + (owned ? '' : ' locked');
      div.dataset.gun = gt;
      const cap = getGunAccessoryCap(gt);
      div.innerHTML = `<span class="wb-gun-icon">⌐</span><div><div class="wb-gun-nm">${cfg.displayName}</div>` +
        `<div class="wb-gun-sub">${owned ? (crewLoanHolder('gun', gt) ? `With ${CHARACTERS[crewLoanHolder('gun', gt)].name} · click to take it back` : `${cap.sight} sight · ${cap.rails} rail${cap.rails!==1?'s':''}${cap.under ? ' · under' : ''}`) : 'Not owned'}</div></div>`;   // v1.337
      if (owned) div.addEventListener('click', () => workbenchSelectGun(gt));
      gl.appendChild(div);
    }
  }

  // --- Slot list (right) ---
  const sl = document.getElementById('wbSlotList');
  sl.innerHTML = '';
  if (WB.gunType) {
    const cap = getGunAccessoryCap(WB.gunType);
    const slots = Game.persist.equipped.attachments[WB.gunType];
    const addSlotRow = (label, slotKind, railIndex, instId) => {
      const inst = instId ? getAccessoryInstance(instId) : null;
      const sel = WB.selSlot && WB.selSlot.slot === slotKind && WB.selSlot.railIndex === railIndex;
      const div = document.createElement('div');
      div.className = 'wb-slot' + (sel ? ' sel' : '');
      div.innerHTML = `<div class="wb-slot-head"><span class="wb-slot-label">${label}</span>` +
        `<span class="wb-slot-val${inst?'':' empty'}">${inst ? ATTACHMENTS[inst.type].name : 'empty'}</span></div>`;
      div.addEventListener('click', () => {
        // Toggle selection; if a slot with an item is clicked while selected, unmount.
        if (sel && inst) { clearGunSlot(WB.gunType, slotKind, railIndex); WB.selSlot = null; refreshWorkbenchAccessoryVisuals(); renderWorkbench(); return; }
        WB.selSlot = sel ? null : { slot: slotKind, railIndex };
        renderWorkbench();
      });
      sl.appendChild(div);
    };
    addSlotRow('Sight (top)', 'sight', -1, slots.sight);
    for (let i = 0; i < cap.rails; i++) {
      addSlotRow(cap.rails === 1 ? 'Rail' : (i === 0 ? 'Left rail' : 'Right rail'), 'rail', i, slots.rails[i]);
    }
    if (cap.under) addSlotRow('Under-barrel', 'under', -1, slots.under);   // v1.169
  } else {
    sl.innerHTML = '<div class="wb-locker-empty">Select a gun to customize.</div>';
  }

  // --- Locker (compatible unmounted accessories for the selected slot) ---
  const lk = document.getElementById('wbLockerList');
  lk.innerHTML = '';
  if (!WB.gunType) { lk.innerHTML = '<div class="wb-locker-empty">—</div>'; return; }
  if (!Game.persist.accessories.length) {
    lk.innerHTML = '<div class="wb-locker-empty">No accessories yet. Buy some at airsoft.com.</div>';
    return;
  }
  // Group unmounted instances by type; mark compatibility with the selected slot.
  const selKind = WB.selSlot ? WB.selSlot.slot : null;     // 'sight' | 'rail' | 'under' | null
  const counts = {};
  for (const inst of Game.persist.accessories) {
    if (findInstanceMount(inst.id)) continue;  // mounted somewhere — not in locker
    counts[inst.type] = (counts[inst.type] || 0) + 1;
  }
  const typesShown = Object.keys(ATTACHMENTS).filter(t => counts[t]);
  if (!typesShown.length) {
    lk.innerHTML = '<div class="wb-locker-empty">All your accessories are mounted.</div>';
  }
  for (const type of typesShown) {
    const def = ATTACHMENTS[type];
    const compatSlotType = def.slot;                       // 'sight' | 'rail'
    const compat = selKind && compatSlotType === selKind;
    const div = document.createElement('div');
    div.className = 'wb-locker-item ' + (selKind ? (compat ? 'compat' : 'incompat') : '');
    div.innerHTML = `<span class="wb-locker-tag">${compatSlotType === 'sight' ? 'SIGHT' : compatSlotType === 'under' ? 'UNDER' : 'RAIL'}</span>` +
      `<span>${def.name}</span><span style="margin-left:auto;color:#888">×${counts[type]}</span>`;
    if (compat) {
      div.addEventListener('click', () => {
        const free = getUnmountedInstances(type)[0];
        if (!free) return;
        const r = mountAccessory(WB.gunType, free.id, WB.selSlot.slot, WB.selSlot.railIndex);
        if (r.ok) { WB.selSlot = null; refreshWorkbenchAccessoryVisuals(); renderWorkbench(); }
      });
    }
    lk.appendChild(div);
  }
}

function openWorkbench() {
  document.getElementById('workbenchScreen').classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'workbench';
  exitPointerLock();
  initWorkbenchScene();
  WB.active = true;
  // Default to the currently-equipped gun (or pistol).
  workbenchSelectGun(Game.persist.equipped.gun || 'pistol');
}

function closeWorkbench() {
  autoSave();   // v1.218 (D.29): what was mounted or packed
  document.getElementById('workbenchScreen').classList.remove('active');
  WB.active = false;
  Game.mode = 'bedroom';
  updateBedroomHud();
  showPauseHint();
}

// === FIRST-PERSON SPEED LOADER ===
let fpLoader = null;
function buildFPLoader() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xc93030, roughness: 0.5 });
  const clearMat = new THREE.MeshStandardMaterial({ color: 0xddddee, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.05 });
  const plungerMat = new THREE.MeshStandardMaterial({ color: 0xc93030, roughness: 0.6 });

  // Main body — translucent tube showing BBs inside
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 12), clearMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0, 0);
  group.add(body);

  // BB column inside (yellow)
  const bbCol = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0xfff0a8, roughness: 0.4 }));
  bbCol.rotation.x = Math.PI / 2;
  bbCol.position.set(0, 0, 0);
  group.add(bbCol);
  bbCol.userData.fullLen = 0.13;   // for v1.49 drain scaling

  // Black caps
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12), bodyMat);
  cap1.rotation.x = Math.PI / 2;
  cap1.position.set(0, 0, -0.08);
  group.add(cap1);
  const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12), bodyMat);
  cap2.rotation.x = Math.PI / 2;
  cap2.position.set(0, 0, 0.08);
  group.add(cap2);

  // Loading nozzle at the front
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.04, 10), accentMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0, -0.105);
  group.add(nozzle);

  // Plunger (the part you push to feed BBs) at the back
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12), plungerMat);
  plunger.rotation.x = Math.PI / 2;
  plunger.position.set(0, 0, 0.095);
  plunger.userData.baseZ = plunger.position.z;
  group.add(plunger);
  // Plunger stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), bodyMat);
  stem.rotation.x = Math.PI / 2;
  stem.position.set(0, 0, 0.12);
  group.add(stem);

  // Brand label (decorative red stripe)
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.04), accentMat);
  label.position.set(0, -0.024, 0);
  group.add(label);

  group.userData.plunger = plunger;
  group.userData.bbCol = bbCol;
  // v1.49 / v1.49a: Held so the loading nozzle points DOWN toward the gun's
  // magazine — using gravity to feed BBs, not aiming the tube forward. The body
  // is built along local Z. In-engine the +X pitch is what drops the nozzle end
  // (the earlier -X pitch put the nozzle UP — corrected here against a live
  // screenshot rather than the isolated transform sim, which disagreed).
  group.userData.baseRot = { x: 1.4, y: 0.35, z: -0.15 };
  group.userData.basePos = { x: 0.07, y: -0.13, z: -0.26 };
  group.position.set(group.userData.basePos.x, group.userData.basePos.y, group.userData.basePos.z);
  group.rotation.set(group.userData.baseRot.x, group.userData.baseRot.y, group.userData.baseRot.z);
  group.visible = false;
  Game.camera.add(group);
  return group;
}

// === FIRST-PERSON SPARE MAG ===
let fpMag = null;
function buildFPMag() {
  const group = new THREE.Group();
  const magMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.5, metalness: 0.2 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.7 });
  // Mag body (rectangular tube)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), magMat);
  group.add(body);
  // Baseplate
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.014, 0.058), accentMat);
  base.position.y = -0.077;
  group.add(base);
  // Witness holes (small dimples on the side suggesting BB count)
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.005, 0.04), accentMat);
    hole.position.set(0.021, 0.04 - i * 0.025, 0);
    group.add(hole);
  }
  // Top lip (where BBs feed out)
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.008, 0.048), accentMat);
  lip.position.y = 0.074;
  group.add(lip);
  group.position.set(0.08, -0.22, -0.26);
  group.rotation.set(0, 0.2, 0);
  group.visible = false;
  Game.camera.add(group);
  return group;
}

// === v1.149: THE WALKIE-TALKIE (backlog D.10, Michael: A) ===
// A kid's yellow walkie, clipped to the belt on the left hip: a body with a screen and a speaker grille, a talk button
// on the side, a knob and a stubby antenna. Built in its own frame (the clip's origin, the face toward +z, up +y), at
// (ox, oy, oz). The Loadout kid wears it; in a match it hangs at your hip, where you see it when you look down. The
// callouts over it wait on the voices build (D.9, PR #22) reaching main.
function walkieMats() {
  return { body: _kidFaceMat('wbody', 0xf0c020, 0.55), dark: _kidFaceMat('wdark', 0x1c1c20, 0.7),
    screen: _kidFaceMat('wscreen', 0x9cc48a, 0.3), led: _kidFaceMat('wled', 0xe02a1a, 0.4) };
}
function addWalkieParts(add, ox, oy, oz) {
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add('dark', box(0.03, 0.05, 0.006), ox, oy, oz);                              // the belt clip
  add('body', box(0.055, 0.105, 0.03), ox, oy - 0.035, oz + 0.018);             // the body
  add('screen', box(0.036, 0.016, 0.003), ox, oy - 0.008, oz + 0.0345);         // a little screen
  add('dark', box(0.042, 0.04, 0.003), ox, oy - 0.05, oz + 0.0345);             // the speaker grille
  for (let i = 0; i < 3; i++) add('body', box(0.036, 0.004, 0.002), ox, oy - 0.038 - i * 0.012, oz + 0.0365);   // its slots
  add('dark', box(0.006, 0.03, 0.014), ox - 0.0305, oy - 0.02, oz + 0.018);     // the talk button on the side
  add('dark', box(0.01, 0.07, 0.01), ox + 0.017, oy + 0.052, oz + 0.018);       // the antenna
  add('dark', box(0.013, 0.014, 0.013), ox - 0.012, oy + 0.024, oz + 0.018);    // the channel knob
  add('led', box(0.006, 0.004, 0.006), ox, oy + 0.019, oz + 0.026);             // the transmit light
}
let fpWalkie = null;
// v1.333 (backlog B.16, Michael: "Looking down in game shows nothing, but the walkie talkie is visible and shows as
// floating. Can we just add the whole body mesh to the first person view?"): your own kid under the camera, your look,
// your gear and the walkie on its belt: legs, shoes, torso and what is worn on them. The head (with the face, hair,
// hat and eye pro) and the arms are hidden (the hands holding the gun are the view's own), and so is the kid's gun.
// It casts no shadow (a headless one would follow you round). `fpWalkie` is the root, which follows your feet and
// yaw, not the camera's pitch; userData.walkie is the walkie on the body's belt, userData.kid the body.
function buildFPWalkie() {
  const hip = new THREE.Group();
  hip.userData.sig = '';
  setFPBody(hip);
  return hip;
}
// (Re)builds the body when your look or gear has changed since the last match.
function setFPBody(root) {
  const look = Object.assign({}, Game.persist.look), gk = loadoutKidGearKeys();
  const sig = JSON.stringify([look, gk]);
  if (root.userData.sig === sig && root.userData.kid) return;
  if (root.userData.kid) root.remove(root.userData.kid.group);
  const kid = createKid(look, 'pistol'), gear = buildKidGear(kid, gk), po = kid.pose;
  for (const m of [kid.head, po.neck, po.hair, po.gunGroup, po.rigR.shoulder, po.rigL.shoulder]) if (m) m.visible = false;
  for (const ex of po.headExtras) ex.mesh.visible = false;
  kid.group.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
  root.add(kid.group);
  root.userData.kid = kid;
  root.userData.walkie = kid.group.children.find(c => c.userData.kidGear === 'walkie');
  root.userData.sig = sig;
  root.userData.phase = 0; root.userData.vf = 0; root.userData.vs = 0; root.userData.last = null;
}
// Each step after the camera is placed: the body stands under the eye, 12 cm back (32 cm looking straight down),
// and turns with the yaw. Its
// eyes (1.27 m up the average kid) are held at the camera: the kid's height is stretched to your eye height
// (1.35 m standing), and on a crouch or a slide it crouches as the kids do and squashes the rest of the way, so the
// shoes stay on the ground. Its legs walk with your real speed, in the kids' planted-foot gait (setKidWalk).
const FP_BODY_BACK = 0.12, FP_BODY_BACK_DOWN = 0.2, FP_BODY_EYE = 1.27;
function updateFPWalkie(bobY, dt) {
  if (!fpWalkie || !fpWalkie.userData.kid) return;
  const P = Game.player, U = fpWalkie.userData, kid = U.kid, g = kid.group;
  const eye = P.eyeOffset, stand = P.eyeOffsetStand || 1.35, low = P.eyeOffsetCrouch || 0.8;
  const crouch = Math.max(0, Math.min(1, (stand - eye) / Math.max(0.1, stand - low)));
  const drop = setKidCrouch(kid, crouch);
  // the walk, from this step's move in your own frame (forward along your view, sideways to your left)
  let vf = 0, vs = 0;
  if (U.last && dt > 0) {
    const dx = P.pos.x - U.last.x, dz = P.pos.z - U.last.z;
    if (Math.hypot(dx, dz) < 1) {   // not a teleport (a respawn, the walk home's start)
      const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
      vf = (-dx * sy - dz * cy) / dt; vs = -(dx * cy - dz * sy) / dt;
    }
  }
  U.last = { x: P.pos.x, z: P.pos.z };
  const ease = dt > 0 ? Math.min(1, dt * 8) : 1;
  U.vf += (vf - U.vf) * ease; U.vs += (vs - U.vs) * ease;
  const v = Math.hypot(U.vf, U.vs);
  if (P.onGround !== false && v > 0.05) {
    const reach = (kid.scaleXZ || 1) * (kid.pose.legL.scale.y / (kid.pose.base.legScaleY || 1));
    U.phase += 2 * Math.PI * kidGaitCadence(v, reach) * (dt || 0);
    setKidWalk(kid, U.phase, Math.min(1, v / 3), U.vf, U.vs);
  }
  g.scale.y = eye / (FP_BODY_EYE - drop);
  fpWalkie.position.set(P.pos.x, P.pos.y + (bobY || 0), P.pos.z);
  fpWalkie.rotation.set(0, P.yaw, 0);
  // the root's +z is behind you; looking down, the body slides back to show the feet past the belly
  g.position.set(0, 0, FP_BODY_BACK + FP_BODY_BACK_DOWN * Math.max(0, -Math.sin(P.pitch || 0)));
  g.rotation.set(0, Math.PI, 0);        // the kid faces +z; the view looks down -z
}

function forfeitScenario() {
  if (Game.mode !== 'scenario') return;
  endScenario('forfeit');
}
// v1.208 (backlog B.8, Michael 13 Oct: "Hitting F should pause the game and ask if you're sure"): F opens a question
// and the match stops (stepGame skips the scenario while Game.forfeitAsk is set). Enter or Y forfeits; Esc, N or F
// again keeps playing. A round that ends some other way while it asks (a delayed win) closes it.
function askForfeit() {
  if (Game.mode !== 'scenario' || Game.forfeitAsk) return;
  if (Game.scenario.range) { endScenario('range'); return; }   // v1.257: nothing to forfeit in the range; F goes inside
  Game.forfeitAsk = true;
  Game.mouseLMB = false;
  for (const k in Game.keys) Game.keys[k] = false;
  document.getElementById('forfeitAsk').classList.add('active');
  exitPointerLock();
}
function closeForfeitAsk() {
  Game.forfeitAsk = false;
  document.getElementById('forfeitAsk').classList.remove('active');
}
function answerForfeit(yes) {
  if (!Game.forfeitAsk) return;
  closeForfeitAsk();
  if (yes) forfeitScenario();
  else if (Game.mode === 'scenario') { Game.clock.getDelta(); requestPointerLock(); }
}
// v1.239 (backlog D.39, Michael 14 Oct: "Can we make the pause menu more obvious / auto-open when hitting escape?"):
// before this Escape only let go of the mouse, the match ran on behind a small "Click to capture mouse" note, and
// there was no menu. Now Escape in a match (or the mouse let go any other way, as alt-tab does) opens PAUSED and the
// match stops (stepGame skips it, as for the forfeit question): RESUME (Esc or a click) goes back, SETTINGS opens the
// settings over it, FORFEIT asks the forfeit question.
function openPauseMenu() {
  if (Game.squadWheel || Game.squadFlashT > 0) closeSquadWheel(false);   // v1.248: the Q wheel shuts without an order
  if (Game.mode !== 'scenario' || Game.forfeitAsk || Game.paused) return;
  Game.paused = true;
  Game._pausedAt = performance.now();
  Game.mouseLMB = false;
  for (const k in Game.keys) Game.keys[k] = false;
  document.getElementById('pauseMenu').classList.add('active');
  document.getElementById('pauseHint').style.display = 'none';
  exitPointerLock();
}
function closePauseMenu() {
  Game.paused = false;
  document.getElementById('pauseMenu').classList.remove('active');
}
function resumeFromPause() {
  if (!Game.paused) return;
  closePauseMenu();
  if (Game.mode === 'scenario') { Game.clock.getDelta(); requestPointerLock(); }
}
