
// ---------------------------------------------------------------------
// FIRST-PERSON GUN MODEL — spring pistol, with orange airsoft tip
// ---------------------------------------------------------------------
let fpGun = null;
function buildFPGun() {
  const group = new THREE.Group();

  // Materials
  const polymerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.55, metalness: 0.15 });
  const slideMat   = new THREE.MeshStandardMaterial({ color: 0x252528, roughness: 0.4,  metalness: 0.5 });
  const accentMat  = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.7,  metalness: 0.1 });
  const orangeMat  = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6,  emissive: 0x331000, emissiveIntensity: 0.4 });
  const sightMat   = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4 });

  // Reference frame: gun points along -Z (away from camera). Length ≈ 0.22.
  // Origin is roughly behind the trigger guard so the grip hangs below it.

  // === Frame (lower polymer body) ===
  // v1.221 (D.31, the pistol against a Glock 17, scaled ×1.13 to keep its length on screen): the slide was wider
  // (42 mm) than it was tall, the frame and grip stood 40% too tall, the barrel ran 7 cm past the slide and the grip
  // raked 10°. Now a 30 mm slide over a 38 mm frame, a 9 cm grip at 18°, and an orange tip 1.7 cm past the slide.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.036, 0.18), polymerMat);
  frame.position.set(0, 0.006, -0.07);
  frame.name = 'frame';
  group.add(frame);

  // Front rail dust cover (slight notch under the slide forward of trigger)
  const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.07), polymerMat);
  dustCover.position.set(0, 0.012, -0.13);
  group.add(dustCover);

  // === Slide (top metal section) ===
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.036, 0.21), slideMat);
  slide.position.set(0, 0.042, -0.08);
  slide.name = 'slide';
  slide.userData.baseZ = slide.position.z;
  group.add(slide);

  // Slide serrations — 4 small notches near the rear of the slide
  const serrationMeshes = [];
  for (let i = 0; i < 4; i++) {
    const serr = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.034, 0.004), accentMat);
    serr.position.set(0, 0.042, -0.005 - i * 0.012);
    serr.userData.baseZ = serr.position.z;
    serrationMeshes.push(serr);
    group.add(serr);
  }

  // Ejection port (dark notch on right side of slide)
  const ejPort = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.010, 0.04), accentMat);
  ejPort.position.set(0.008, 0.054, -0.07);
  ejPort.userData.baseZ = ejPort.position.z;
  group.add(ejPort);

  // === Barrel + orange tip ===
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.010, 10), slideMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.187);   // v1.221: 5 mm past the slide, was 4.5 cm
  barrel.name = 'barrel';
  group.add(barrel);

  // Orange muzzle tip — the iconic airsoft signifier
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.010, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.035, -0.197);
  orangeTip.name = 'tip';
  group.add(orangeTip);

  // Tiny muzzle hole (black dot at very tip)
  const muzzleHole = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.005, 8), accentMat);
  muzzleHole.rotation.x = Math.PI / 2;
  muzzleHole.position.set(0, 0.035, -0.2025);
  group.add(muzzleHole);

  // === Sights ===
  // Rear sight (notched block at back of slide)
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.008), sightMat);
  rearSight.position.set(0, 0.066, 0.018);
  rearSight.userData.baseZ = rearSight.position.z;
  group.add(rearSight);
  // Rear sight notch (small gap for ADS alignment)
  const rearNotch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.01), polymerMat);
  rearNotch.position.set(0, 0.07, 0.018);
  rearNotch.userData.baseZ = rearNotch.position.z;
  group.add(rearNotch);

  // Front sight (small post at end of slide)
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.006), sightMat);
  frontSight.position.set(0, 0.067, -0.17);
  group.add(frontSight);

  // === Trigger guard ===
  // Approximated with a thin rectangular ring built from 4 boxes
  // v1.221: the Glock's squared guard, an upright at the front from the frame down to the bar, the bar back to the grip
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.030, 0.006), polymerMat);
  tgFront.position.set(0, -0.027, -0.049);
  group.add(tgFront);
  const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.005, 0.05), polymerMat);
  tgBottom.position.set(0, -0.0395, -0.025);
  group.add(tgBottom);

  // Trigger itself
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), accentMat);
  trigger.position.set(0, -0.025, -0.025);
  group.add(trigger);

  // === Grip (angled down/back, textured by stacked thin layers) ===
  // v1.221: 9 cm (was 13) at 18° (was 10°), its top under the frame; the stippling and baseplate ride on it
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.09, 0.052), polymerMat);
  grip.position.set(0, -0.0507, 0.0122);
  grip.rotation.x = -0.32;
  grip.name = 'grip';
  group.add(grip);

  // Grip stippling — a few thin horizontal lines on the back strap
  for (let i = 0; i < 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.003, 0.001), accentMat);
    line.position.set(0, 0.02 - i * 0.014, 0.0265);
    grip.add(line);
  }

  // Magazine baseplate (slight protrusion at bottom of grip)
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.010, 0.056), accentMat);
  magBase.position.set(0, -0.047, 0);
  grip.add(magBase);

  // === Default (hipfire) pose ===
  group.position.set(0.16, -0.18, -0.32);
  group.rotation.y = 0.12;
  group.rotation.x = -0.05;

  // Expose animatable parts under a uniform `cockingParts` array so updateHeldMesh
  // can animate the right pieces for any gun (pistol: slide; shotgun: pump; AR: charging
  // handle; sniper: bolt).
  // `cockingOffset` is how far in local +Z the parts move at full cock (positive = backward
  // toward the camera, since the gun points along local -Z).
  group.userData.cockingParts = [slide, ...serrationMeshes, rearSight, ejPort];
  group.userData.cockingOffset = 0.06;
  group.userData.gunType = 'pistol';

  Game.camera.add(group);
  return group;
}

// =====================================================================
// FP MESHES — SHOTGUN, AR, SNIPER (added v1.8)
// =====================================================================
// All FP gun meshes follow the same convention:
//   - Group's local -Z points down the barrel (gun forward)
//   - group.userData.cockingParts = [meshes] that move backward during cocking
//   - group.userData.cockingOffset = max +Z translation distance for those parts
//   - Each part must have userData.baseZ stored so animation is reversible
// updateHeldMesh handles per-type pose/animation specifics.

// === FP SHOTGUN (M870-style pump action) ===
function buildFPShotgun() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.55, metalness: 0.3 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.45, metalness: 0.55 });
  const pumpMat   = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.8,  metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.7 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const stockMat  = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7, metalness: 0.1 });

  // === Receiver (main body) ===
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.06, 0.14), bodyMat);
  receiver.position.set(0, 0.02, -0.05);
  receiver.name = 'receiver';
  group.add(receiver);

  // Top rail on receiver (small Picatinny-style)
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.12), accentMat);
  topRail.position.set(0, 0.055, -0.05);
  group.add(topRail);
  // Tiny rail slots
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.005), bodyMat);
    slot.position.set(0, 0.058, -0.01 - i * 0.022);
    group.add(slot);
  }

  // === Barrel ===
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.216, 12), barrelMat);   // v1.220: reaches the tip (was 8 mm short)
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -0.228);
  group.add(barrel);

  // Magazine tube (under barrel)
  const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 10), barrelMat);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, 0.015, -0.21);
  group.add(magTube);

  // Front sight (small bead)
  const frontSight = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), accentMat);
  frontSight.position.set(0, 0.055, -0.31);
  group.add(frontSight);

  // === Orange muzzle tip ===
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.024, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.04, -0.34);
  group.add(orangeTip);

  // === Pump forestock (the cocking part — slides backward to cycle) ===
  const pumpGroup = new THREE.Group();
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.044, 0.08), pumpMat);
  pump.position.set(0, 0.025, 0);
  pumpGroup.add(pump);
  // Ribbed grip lines on the pump (~10 thin grooves)
  for (let i = 0; i < 10; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.046, 0.002), accentMat);
    rib.position.set(0, 0.025, 0.035 - i * 0.0075);
    pumpGroup.add(rib);
  }
  // Lower clamp wrapping around the mag tube
  const pumpClamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.084), pumpMat);
  pumpClamp.position.set(0, 0.005, 0);
  pumpGroup.add(pumpClamp);

  pumpGroup.position.set(0, 0, -0.22);
  pumpGroup.userData.baseZ = pumpGroup.position.z;
  group.add(pumpGroup);

  // === Trigger guard + trigger ===
  // v1.224 (D.31, the shotgun against a Remington 870): the guard was 1.6 cm deep (an 870's is about 2.6 at this scale)
  // with the trigger mostly inside the receiver; the wrist hung as a lump under the receiver's rear instead of behind
  // it; and the butt pad stood 3.9 cm above the stock's top line. Now a deep guard, the wrist behind the receiver running
  // into the stock, and the pad on the stock's back face.
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.027, 0.005), accentMat);
  tgFront.position.set(0, -0.0225, -0.0525);
  group.add(tgFront);
  const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.005, 0.05), accentMat);
  tgBottom.position.set(0, -0.0335, -0.03);
  group.add(tgBottom);
  const tgRear = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.027, 0.005), accentMat);
  tgRear.position.set(0, -0.0225, -0.0075);
  group.add(tgRear);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.006), accentMat);
  trigger.position.set(0, -0.019, -0.035);
  trigger.name = 'trigger';
  group.add(trigger);

  // === Stock (single-piece, kid-airsoft style) ===
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.055, 0.08), stockMat);
  wrist.position.set(0, -0.025, 0.04);
  wrist.rotation.x = 0.18;
  wrist.name = 'wrist';
  group.add(wrist);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.085, 0.14), stockMat);
  stock.position.set(0, -0.005, 0.105);
  stock.rotation.x = 0.18;
  stock.name = 'stock';
  group.add(stock);
  const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.087, 0.012), accentMat);
  buttpad.position.set(0, 0, 0.074);   // v1.224: on the stock's back face (was 3.9 cm above its top line)
  buttpad.name = 'buttpad';
  stock.add(buttpad);

  // === Default hipfire pose ===
  group.position.set(0.13, -0.21, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.05;

  group.userData.cockingParts = [pumpGroup];
  group.userData.cockingOffset = 0.07;
  group.userData.gunType = 'shotgun';

  Game.camera.add(group);
  return group;
}

// v1.398 (backlog D.63, Michael: A, batch 5): the SPAS-12, a second pump shotgun on the spring shotgun's receiver,
// barrel, tube, pump and bead: all of it black, a vented shield along the top and sides of the barrel (its top under
// the bead's line), a pistol grip behind the trigger guard, and a folding metal stock opened out behind: two rods back
// from the receiver to a butt plate with its hook under. The pump is the shotgun's and still racks every shot.
function buildFPSpas() {
  const group = buildFPShotgun();
  const black = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.55, metalness: 0.35 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.45, metalness: 0.6 });
  const hole = new THREE.MeshStandardMaterial({ color: 0x030304, roughness: 0.9 });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; group.add(m); return m; };
  group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() !== 0xff7a1a) o.material = black; });
  // the wrist and the sporting stock come off: a pistol grip and the folding stock go on
  for (const n of ['wrist', 'stock']) { const o = group.getObjectByName(n); if (o) group.remove(o); }
  add(new THREE.BoxGeometry(0.034, 0.075, 0.034), black, 0, -0.040, 0.012, -0.35).name = 'grip';
  add(new THREE.BoxGeometry(0.030, 0.030, 0.030), black, 0, 0.005, 0.030).name = 'stockBlock';   // the hinge block behind the receiver
  for (const x of [-0.012, 0.012]) add(new THREE.BoxGeometry(0.006, 0.008, 0.130), steel, x, 0.012, 0.105).name = 'stockRod';
  add(new THREE.BoxGeometry(0.036, 0.060, 0.010), steel, 0, 0.000, 0.172).name = 'buttPlate';
  add(new THREE.BoxGeometry(0.010, 0.030, 0.012), steel, 0, -0.038, 0.164, 0.5).name = 'hook';   // the hook under the plate
  // the vented shield: a top plate and two side plates along the barrel, slots punched through each
  add(new THREE.BoxGeometry(0.032, 0.004, 0.150), steel, 0, 0.0530, -0.215).name = 'shield';
  for (const x of [-0.0145, 0.0145]) add(new THREE.BoxGeometry(0.003, 0.020, 0.150), steel, x, 0.043, -0.215);
  for (let i = 0; i < 6; i++) {
    const z = -0.155 - i * 0.024;
    add(new THREE.BoxGeometry(0.016, 0.0012, 0.010), hole, 0, 0.0552, z);
    for (const x of [-0.0160, 0.0160]) add(new THREE.BoxGeometry(0.0012, 0.008, 0.010), hole, x, 0.043, z);
  }
  // the bead is the front sight
  group.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && Math.abs(o.position.z + 0.31) < 1e-6) o.userData.frontSight = true; });
  group.userData.gunType = 'spas';
  return group;
}

// === FP ASSAULT RIFLE (M4-style with charging handle) ===
// v1.328 (backlog D.63, batch 1): the Semi-Auto Shotgun, a Benelli-style tactical shotgun on the spring shotgun's
// receiver, barrel, tube and bead: a smooth fixed forend in place of the ribbed pump, a pistol grip behind the trigger
// guard and a straight stock in place of the wrist and the sporting stock, a side saddle of four red shells on the
// left, a ghost-ring rear sight round the bead's line, and a charging handle on the right (what racks a new mag).
function buildFPSemiShotgun() {
  const group = buildFPShotgun();
  const black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6, metalness: 0.15 });
  const olive = new THREE.MeshStandardMaterial({ color: 0x4b5226, roughness: 0.75 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb0261c, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.7 });
  const add = (geo, mat, x, y, z, rx = 0, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; parent.add(m); return m; };
  // the forend: the pump's ribs come off and it is olive and smooth
  const fore = group.userData.cockingParts[0];
  for (const c of [...fore.children]) if (c.geometry && c.geometry.parameters && c.geometry.parameters.depth === 0.002) fore.remove(c);
  fore.traverse(o => { if (o.isMesh) o.material = olive; });
  // the wrist and the sporting stock come off; a pistol grip and a straight stock go on
  for (const n of ['wrist', 'stock']) { const o = group.getObjectByName(n); if (o) group.remove(o); }
  add(new THREE.BoxGeometry(0.034, 0.075, 0.034), olive, 0, -0.040, 0.012, -0.35).name = 'grip';
  add(new THREE.BoxGeometry(0.036, 0.048, 0.120), olive, 0, 0.022, 0.078).name = 'stock';
  add(new THREE.BoxGeometry(0.038, 0.075, 0.010), black, 0, 0.012, 0.142);
  add(new THREE.BoxGeometry(0.034, 0.030, 0.050), olive, 0, -0.012, 0.115);   // the stock's toe, down to the pad
  // the side saddle: a plate on the left of the receiver with four shells standing in it
  add(new THREE.BoxGeometry(0.006, 0.036, 0.070), black, -0.026, 0.020, -0.060);
  for (let i = 0; i < 4; i++) {
    add(new THREE.CylinderGeometry(0.0065, 0.0065, 0.040, 8), red, -0.0325, 0.018, -0.084 + i * 0.016);
    add(new THREE.CylinderGeometry(0.0068, 0.0068, 0.008, 8), brass, -0.0325, -0.005, -0.084 + i * 0.016);
  }
  // the sights: the bead gives way to a front post on the barrel (its tip at y 0.068), and a ghost ring at the back of
  // the rail stands round the same line, so aimed the post sits in the ring
  const bead = []; group.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && Math.abs(o.position.z + 0.31) < 1e-6) bead.push(o); });
  for (const o of bead) group.remove(o);
  const post = add(new THREE.BoxGeometry(0.004, 0.016, 0.004), black, 0, 0.060, -0.31);
  post.userData.frontSight = true; post.userData.ironSight = true;
  add(new THREE.BoxGeometry(0.010, 0.006, 0.012), black, 0, 0.0545, -0.31).userData.ironSight = true;   // its base on the barrel
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0022, 6, 16), black);
  ring.position.set(0, 0.068, -0.004); ring.userData.ironSight = true; group.add(ring);
  add(new THREE.BoxGeometry(0.004, 0.012, 0.004), black, 0.0095, 0.063, -0.004).userData.ironSight = true;
  add(new THREE.BoxGeometry(0.004, 0.012, 0.004), black, -0.0095, 0.063, -0.004).userData.ironSight = true;
  // the charging handle on the right of the receiver racks a new mag
  const charge = new THREE.Group();
  add(new THREE.BoxGeometry(0.008, 0.010, 0.020), black, 0, 0, 0, 0, charge);
  add(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8), black, 0.008, 0, 0, 0, charge).rotation.z = Math.PI / 2;
  charge.position.set(0.027, 0.028, -0.080);
  charge.userData.baseZ = charge.position.z;
  group.add(charge);
  group.userData.cockingParts = [charge];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'semishotgun';
  return group;
}

function buildFPAR() {
  const group = new THREE.Group();
  const bodyMat    = new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.55, metalness: 0.25 });
  const handlerMat = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.45, metalness: 0.45 });
  const barrelMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4,  metalness: 0.6 });
  const accentMat  = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.7 });
  const orangeMat  = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const magMat     = new THREE.MeshStandardMaterial({ color: 0x2848a0, roughness: 0.4, metalness: 0.2 });  // blue mag like the reference photo

  // === Lower receiver ===
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.045, 0.13), bodyMat);
  lower.position.set(0, -0.005, -0.04);
  lower.name = 'lower';
  group.add(lower);

  // === Upper receiver ===
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.13), handlerMat);
  upper.position.set(0, 0.038, -0.04);
  group.add(upper);

  // === Carry handle (M16-style hump on top of upper) ===
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.045), handlerMat);
  handle.position.set(0, 0.065, -0.025);
  group.add(handle);
  const handleGap = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.04), accentMat);
  handleGap.position.set(0, 0.062, -0.025);
  group.add(handleGap);

  // === Charging handle (the cocking part) ===
  const chargeGroup = new THREE.Group();
  const chargeBody = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.025), handlerMat);
  chargeBody.position.set(0, 0.038, 0);
  chargeGroup.add(chargeBody);
  // The latch (the little tab you pull on)
  const chargeLatch = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.012), accentMat);
  chargeLatch.position.set(0, 0.04, 0.012);
  chargeGroup.add(chargeLatch);
  chargeGroup.position.set(0, 0, 0.035);
  chargeGroup.userData.baseZ = chargeGroup.position.z;
  group.add(chargeGroup);

  // === Handguard / RIS rail ===
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.038, 0.15), handlerMat);   // v1.220: meets the receiver (a 2 cm gap before)
  handguard.position.set(0, 0.038, -0.18);
  group.add(handguard);
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.005), accentMat);
    slot.position.set(0, 0.058, -0.135 - i * 0.02);
    group.add(slot);
  }

  // === Vertical foregrip ===
  const vFGrip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.07, 0.026), handlerMat);
  vFGrip.position.set(0, -0.005, -0.21);
  group.add(vFGrip);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.028), accentMat);
    r.position.set(0, -0.005 + i * 0.015 - 0.015, -0.21);
    group.add(r);
  }

  // === Barrel + front sight + orange tip ===
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 10), barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -0.29);
  group.add(barrel);

  const fsTower = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.04, 0.022), handlerMat);
  fsTower.position.set(0, 0.06, -0.245);
  fsTower.userData.ironSight = true;   // v1.73: hidden when an optic is mounted
  group.add(fsTower);
  const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), accentMat);
  fsPost.position.set(0, 0.085, -0.245);
  fsPost.userData.ironSight = true;    // v1.73: hidden when an optic is mounted
  group.add(fsPost);

  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.024, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.045, -0.39);
  group.add(orangeTip);

  // === Magazine (blue, M4-style) ===
  // v1.223 (D.31, the AR against an M4): the mag was 7 cm below the receiver (an M4's 30-rounder would be 11 cm at
  // this scale), straight, and set against the grip, leaving the trigger and guard inside the lower receiver. Now it is
  // 10.5 cm, tipped 7° forward for the M4 mag's curve, in a flared magwell at the front of the lower, and the guard and
  // trigger hang below the receiver between the magwell and the grip, which rakes 20° (was 13°).
  const magwell = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.042), bodyMat);
  magwell.position.set(0, -0.035, -0.066);
  group.add(magwell);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.105, 0.034), magMat);
  mag.position.set(0, -0.0721, -0.0713);
  mag.rotation.x = 0.12;
  mag.name = 'mag';
  group.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.038), accentMat);
  magBase.position.set(0, -0.0545, 0);
  mag.add(magBase);

  // === Pistol grip ===
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.07, 0.034), bodyMat);
  grip.position.set(0, -0.055, 0.01);
  grip.rotation.x = -0.35;
  grip.name = 'grip';
  group.add(grip);

  // === Trigger guard ===
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.005), accentMat);
  tgFront.position.set(0, -0.037, -0.04);
  group.add(tgFront);
  const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.045), accentMat);
  tgBottom.position.set(0, -0.0445, -0.018);
  group.add(tgBottom);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.006), accentMat);
  trigger.position.set(0, -0.034, -0.022);
  trigger.name = 'trigger';
  group.add(trigger);

  // === Buffer tube + stock ===
  const buffer = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 8), bodyMat);
  buffer.rotation.x = Math.PI / 2;
  buffer.position.set(0, 0.02, 0.075);
  group.add(buffer);
  const stockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.07, 0.018), bodyMat);
  stockPlate.position.set(0, 0.012, 0.115);
  group.add(stockPlate);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.068, 0.006), accentMat);
  stockPad.position.set(0, 0.012, 0.128);
  group.add(stockPad);

  // === Default hipfire pose ===
  group.position.set(0.13, -0.20, -0.32);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;

  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'ar';

  Game.camera.add(group);
  return group;
}

// v1.325 (backlog D.63, Michael: A, batch 1): the FAMAS, a bullpup spring rifle. Everything behind the grip is the
// gun: the mag sits behind the pistol grip and the butt runs back from it, and a carry handle the length of the gun
// carries both sights, the front post over the handguard and a rear aperture over the mag. The grip and the irons are
// where the Spring Assault Rifle has them (grip at z 0.01, the post's tip at y 0.085), so it aims and is held the same;
// the off hand holds the ribbed handguard, as on the AK, instead of a foregrip. The charging handle is under the
// carry handle, as on the real one.
function buildFPFamas() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.6,  metalness: 0.15 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.5,  metalness: 0.3 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4,  metalness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.75 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (name) m.name = name;
    group.add(m);
    return m;
  };

  // === Body: the receiver runs from the handguard back to the butt ===
  box(0.042, 0.050, 0.200, bodyMat, 0, 0.020, 0.025, 'body');        // z -0.075 .. 0.125
  box(0.044, 0.050, 0.075, bodyMat, 0, -0.012, 0.0875);              // the butt's lower half, behind the magwell
  box(0.040, 0.030, 0.100, bodyMat, 0, -0.015, -0.010);              // the lower, over the grip and the trigger
  box(0.046, 0.072, 0.008, accentMat, 0, 0.007, 0.129);              // rubber butt pad
  box(0.010, 0.026, 0.060, accentMat, 0.022, 0.030, 0.085);          // cheek rest, left (the side your face is on)
  box(0.010, 0.026, 0.060, accentMat, -0.022, 0.030, 0.085);         // ...and right (it swaps for lefties)
  // === Handguard: ribbed, under the front of the carry handle ===
  box(0.044, 0.048, 0.110, bodyMat, 0, 0.004, -0.130, 'handguard'); // z -0.185 .. -0.075
  for (let i = 0; i < 5; i++) box(0.046, 0.034, 0.004, accentMat, 0, 0.004, -0.170 + i * 0.020);           // vertical ribs
  // the bipod, folded along both sides of the handguard
  box(0.004, 0.006, 0.100, barrelMat, 0.025, -0.008, -0.135);
  box(0.004, 0.006, 0.100, barrelMat, -0.025, -0.008, -0.135);

  // === Barrel + flash hider + orange tip ===
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.090, 10), barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.230);
  group.add(barrel);
  const hider = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.030, 10), accentMat);
  hider.rotation.x = Math.PI / 2;
  hider.position.set(0, 0.012, -0.285);
  group.add(hider);
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.012, -0.308);
  group.add(orangeTip);

  // === Carry handle, the length of the gun ===
  box(0.020, 0.012, 0.270, handleMat, 0, 0.073, -0.055, 'carryHandle');   // z -0.19 .. 0.08
  box(0.018, 0.024, 0.016, handleMat, 0, 0.055, -0.170);                  // front leg
  box(0.018, 0.024, 0.016, handleMat, 0, 0.055, 0.062);                   // rear leg
  // front sight: two ears and the post between them (the post's tip at y 0.085, as the AR's)
  const fsL = box(0.004, 0.012, 0.010, handleMat, 0.008, 0.085, -0.178); fsL.userData.ironSight = true;
  const fsR = box(0.004, 0.012, 0.010, handleMat, -0.008, 0.085, -0.178); fsR.userData.ironSight = true;
  const fsPost = box(0.004, 0.006, 0.004, accentMat, 0, 0.082, -0.178); fsPost.userData.ironSight = true; fsPost.userData.frontSight = true;
  // rear sight: an aperture block with a hole you look through (two cheeks and a bridge below the hole)
  const rsL = box(0.006, 0.014, 0.010, handleMat, 0.007, 0.086, 0.045); rsL.userData.ironSight = true;
  const rsR = box(0.006, 0.014, 0.010, handleMat, -0.007, 0.086, 0.045); rsR.userData.ironSight = true;

  // === Charging handle, under the carry handle (the cocking part) ===
  const chargeGroup = new THREE.Group();
  const chargeLever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.010, 0.030), accentMat);
  chargeLever.position.set(0, 0.0, 0.0);
  chargeGroup.add(chargeLever);
  const chargeTab = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.008), handleMat);
  chargeTab.position.set(0, 0.0, 0.016);
  chargeGroup.add(chargeTab);
  chargeGroup.position.set(0, 0.062, -0.120);   // hangs from the carry handle
  chargeGroup.userData.baseZ = chargeGroup.position.z;
  group.add(chargeGroup);

  // === Pistol grip, where the AR's is, with the FAMAS's big trigger guard round the whole hand ===
  const grip = box(0.034, 0.070, 0.034, bodyMat, 0, -0.055, 0.010, 'grip');
  grip.rotation.x = -0.35;
  box(0.030, 0.005, 0.080, accentMat, 0, -0.095, -0.012);            // guard bottom, under the grip's foot
  box(0.030, 0.065, 0.005, accentMat, 0, -0.0625, -0.050);           // guard front, from the lower to the bottom
  const trigger = box(0.012, 0.016, 0.006, accentMat, 0, -0.037, -0.030, 'trigger');
  trigger.rotation.x = 0.2;

  // === Magazine: behind the grip, in the butt ===
  box(0.034, 0.016, 0.040, bodyMat, 0, -0.030, 0.074);               // magwell lip
  const mag = box(0.026, 0.080, 0.032, accentMat, 0, -0.062, 0.076, 'mag');
  mag.rotation.x = 0.08;
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.008, 0.036), handleMat);
  magBase.position.set(0, -0.042, 0);
  mag.add(magBase);

  // === Default hipfire pose (the AR's) ===
  group.position.set(0.13, -0.20, -0.32);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;

  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'famas';

  Game.camera.add(group);
  return group;
}

// v1.326 (backlog D.63, batch 1): the electric semi-autos are their spring kin's guns with a battery in them, so
// each is built on its kin's model (the grip, the sights and the poses are the kin's) and dressed apart: the pistol in
// a tan frame with a fire selector and a battery cap under the grip, the rifle in tan furniture with a battery box
// on its stock, a fire selector and a longer, fluted barrel. `_recolor` swaps one colour for another on every part.
function _recolor(group, fromHex, mat) {
  group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === fromHex) o.material = mat; });
}
function buildFPElectricPistol() {
  const group = buildFPGun();
  const tan = new THREE.MeshStandardMaterial({ color: 0xb59a6e, roughness: 0.65, metalness: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd8342a, roughness: 0.5 });
  const green = new THREE.MeshStandardMaterial({ color: 0x48e070, roughness: 0.4, emissive: 0x1c8a34, emissiveIntensity: 0.8 });
  _recolor(group, 0x1a1a1c, tan);   // the frame, the grip and the guard
  const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  // fire selector on the left of the frame, over the grip: a black lever with a red dot
  add(new THREE.BoxGeometry(0.004, 0.010, 0.020), black, -0.021, 0.010, -0.005);
  add(new THREE.BoxGeometry(0.002, 0.004, 0.004), red, -0.0235, 0.012, -0.012);
  // battery cap: a black plate under the grip, taller than the spring pistol's baseplate, with a charge light
  const grip = group.getObjectByName('grip');
  add(new THREE.BoxGeometry(0.042, 0.016, 0.056), black, 0, -0.052, 0, grip).name = 'battery';
  add(new THREE.BoxGeometry(0.006, 0.004, 0.004), green, 0, -0.050, 0.0285, grip);
  // the front sight is the post at the slide's end
  group.traverse(o => { if (o.isMesh && Math.abs(o.position.z + 0.17) < 1e-6 && Math.abs(o.position.y - 0.067) < 1e-6) o.userData.frontSight = true; });
  group.userData.gunType = 'epistol';
  return group;
}
// v1.399 (backlog D.63, Michael: A, batch 5): the Gas Pistol, a green-gas blowback pistol on the spring pistol's
// frame, slide, sights and grip: a bare steel slide on a black frame, wooden panels either side of the grip, a hammer
// behind the slide, and the gas mag's brass fill valve under the grip. Every shot the gas throws the slide back
// (`blowback`: updateHeldMesh moves the cocking parts with the shot's kick).
function buildFPGasPistol() {
  const group = buildFPGun();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.3, metalness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.55, metalness: 0.2 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b3f22, roughness: 0.7, metalness: 0.0 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.35, metalness: 0.8 });
  _recolor(group, 0x252528, steel);   // the slide and the barrel
  _recolor(group, 0x1a1a1c, black);   // the frame, the grip and the guard
  const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const grip = group.getObjectByName('grip');
  // wooden grip panels on both sides, each with two screws
  for (const x of [-0.0205, 0.0205]) {
    add(new THREE.BoxGeometry(0.003, 0.070, 0.044), wood, x, 0.002, 0, grip).name = 'gripPanel';
    for (const y of [0.025, -0.022]) add(new THREE.BoxGeometry(0.002, 0.005, 0.005), steel, x + Math.sign(x) * 0.002, y, 0, grip);
  }
  // the hammer behind the slide, on the frame
  add(new THREE.BoxGeometry(0.010, 0.016, 0.008), black, 0, 0.040, 0.031).name = 'hammer';
  // the gas mag's baseplate with its brass fill valve
  add(new THREE.BoxGeometry(0.042, 0.012, 0.056), black, 0, -0.050, 0, grip).name = 'gasMag';
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), brass, 0, -0.0575, 0.008, grip).name = 'gasValve';
  // the front sight is the post at the slide's end
  group.traverse(o => { if (o.isMesh && Math.abs(o.position.z + 0.17) < 1e-6 && Math.abs(o.position.y - 0.067) < 1e-6) o.userData.frontSight = true; });
  group.userData.blowback = true;
  group.userData.gunType = 'gaspistol';
  return group;
}
function buildFPElectricRifle() {
  const group = buildFPAR();
  const tan = new THREE.MeshStandardMaterial({ color: 0xb59a6e, roughness: 0.65, metalness: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2c30, roughness: 0.35, metalness: 0.65 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd8342a, roughness: 0.5 });
  const green = new THREE.MeshStandardMaterial({ color: 0x48e070, roughness: 0.4, emissive: 0x1c8a34, emissiveIntensity: 0.8 });
  _recolor(group, 0x1d1d22, tan);   // the lower, the magwell, the grip, the buffer and the stock
  _recolor(group, 0x2848a0, black); // a black mag, not the spring rifle's blue
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
  // battery box along the stock's top
  add(new THREE.BoxGeometry(0.030, 0.020, 0.060), black, 0, 0.0565, 0.095).name = 'battery';
  add(new THREE.BoxGeometry(0.006, 0.004, 0.004), green, 0, 0.068, 0.072);
  // fire selector on the left of the lower, above the grip
  add(new THREE.BoxGeometry(0.004, 0.008, 0.020), black, -0.021, 0.003, -0.012);
  add(new THREE.BoxGeometry(0.002, 0.004, 0.004), red, -0.0235, 0.005, -0.018);
  // the longer, fluted barrel: a sleeve over the spring rifle's and the orange tip carried out to its end
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.10, 10), metal);
  sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0.045, -0.43); group.add(sleeve);
  for (const [dx, dy] of [[0.0108, 0], [-0.0108, 0], [0, 0.0108], [0, -0.0108]]) add(new THREE.BoxGeometry(0.002, 0.002, 0.08), black, dx, 0.045 + dy, -0.43);
  group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xff7a1a) o.position.z = -0.49; });
  // the front post is the AR's
  group.traverse(o => { if (o.isMesh && Math.abs(o.position.z + 0.245) < 1e-6 && Math.abs(o.position.y - 0.085) < 1e-6) o.userData.frontSight = true; });
  group.userData.gunType = 'erifle';
  return group;
}

// v1.327 (backlog D.63, batch 1): the Burst Rifle, an electric M16A2 on the spring rifle's receiver: the A2's fixed
// stock where the AR's buffer tube and collapsing stock were, its round ribbed handguard round the AR's square one, no
// vertical foregrip (the off hand holds the handguard), a grey mag, and a battery light by the selector.
function buildFPBurstRifle() {
  const group = buildFPAR();
  const black = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const body = new THREE.MeshStandardMaterial({ color: 0x24252a, roughness: 0.55, metalness: 0.2 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x4a4d54, roughness: 0.45, metalness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd8342a, roughness: 0.5 });
  const green = new THREE.MeshStandardMaterial({ color: 0x48e070, roughness: 0.4, emissive: 0x1c8a34, emissiveIntensity: 0.8 });
  _recolor(group, 0x2848a0, grey);
  // off: the foregrip and its ribs (z -0.21, below the handguard), the buffer tube and the collapsing stock (z > 0.06)
  const drop = [];
  group.traverse(o => { if (o.isMesh && o.parent === group && ((Math.abs(o.position.z + 0.21) < 1e-6 && o.position.y < 0.02) || o.position.z > 0.06)) drop.push(o); });
  for (const o of drop) group.remove(o);
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; group.add(m); return m; };
  // the A2 stock: a long box off the back of the receiver, its underside sloping down to a tall butt
  add(new THREE.BoxGeometry(0.036, 0.040, 0.120), body, 0, 0.032, 0.085).name = 'stock';   // ends where the AR's does, out of the aimed view
  add(new THREE.BoxGeometry(0.034, 0.034, 0.090), body, 0, 0.006, 0.100, -0.22);
  add(new THREE.BoxGeometry(0.038, 0.074, 0.010), black, 0, 0.018, 0.148);
  // the round handguard, ribbed, round the square one
  const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.0275, 0.150, 12), body);
  hg.rotation.x = Math.PI / 2; hg.position.set(0, 0.038, -0.18); hg.name = 'roundHandguard'; group.add(hg);
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0285, 0.0285, 0.004, 12), black);
    r.rotation.x = Math.PI / 2; r.position.set(0, 0.038, -0.117 - i * 0.021); group.add(r);
  }
  // the selector with its red dot, and the battery light behind it
  add(new THREE.BoxGeometry(0.004, 0.008, 0.020), black, -0.021, 0.003, -0.012);
  add(new THREE.BoxGeometry(0.002, 0.004, 0.004), red, -0.0235, 0.005, -0.018);
  add(new THREE.BoxGeometry(0.003, 0.004, 0.006), green, -0.0215, 0.012, 0.010);
  group.traverse(o => { if (o.isMesh && Math.abs(o.position.z + 0.245) < 1e-6 && Math.abs(o.position.y - 0.085) < 1e-6) o.userData.frontSight = true; });
  group.userData.gunType = 'burst';
  return group;
}

// === FP SNIPER (bolt-action, no scope by default) ===
function buildFPSniper() {
  const group = new THREE.Group();
  const stockMat  = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.7, metalness: 0.1 });
  const receiverMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.45, metalness: 0.5 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.35, metalness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.7 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

  // v1.225 (D.31): held up to the rifle it copies, a Remington 700 / VSR-10 (drawn at about ×0.5 along its length). The
  // stock is one piece in the 700's side profile: a forend the barrel beds into, slimming to its tip, a wrist rising to a straight comb,
  // a pistol grip raked 25° behind the trigger guard, and the belly dropping to the toe. Before v1.225 it was three
  // boxes and a cheek block, flat along the bottom from the grip to the toe with the grip under the trigger.
  // x: the gun's z (toward the butt), y: the gun's y. v1.225 fix-up: the forend is its own piece, so the under-barrel
  // parts, which hang from the box of whatever is at the rail, hang from the forend and not from the grip cap; its
  // underside runs level back past the rail and the support hand, slimming only over its last 4 cm.
  const sideProfile = (pts, name) => {
    const prof = new THREE.Shape();
    pts.forEach(([z, y], i) => i ? prof.lineTo(z, y) : prof.moveTo(z, y));
    const geo = new THREE.ExtrudeGeometry(prof, { depth: 0.038, bevelEnabled: false });
    geo.translate(0, 0, -0.019);
    geo.rotateY(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, stockMat);
    mesh.name = name;
    group.add(mesh);
  };
  sideProfile([[-0.255, 0.025], [-0.005, 0.025], [-0.005, -0.015], [-0.215, -0.015], [-0.250, -0.006], [-0.258, 0.006]], 'forend');
  sideProfile([[-0.005, 0.025], [0.012, 0.030], [0.045, 0.042], [0.080, 0.057], [0.158, 0.054], [0.158, -0.052],
    [0.046, -0.034], [0.058, -0.057], [0.036, -0.063], [0.017, -0.016], [-0.005, -0.015]], 'stock');
  const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.106, 0.008), accentMat);
  buttPad.position.set(0, 0.001, 0.162);
  buttPad.name = 'buttpad';
  group.add(buttPad);

  // === Receiver ===
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.034, 0.10), receiverMat);
  receiver.position.set(0, 0.02, -0.04);
  receiver.name = 'receiver';
  group.add(receiver);

  // === Barrel === v1.225: on the receiver's axis, bedded in the forend, tapering to the muzzle (was 2.5 cm above
  // the receiver's axis, its underside clear of the forend)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0085, 0.27, 12), barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.225);
  barrel.name = 'barrel';
  group.add(barrel);

  // === Orange muzzle tip ===
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.026, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.02, -0.37);
  group.add(orangeTip);

  // === Bipod, folded: v1.225 the legs lie forward under the barrel (they hung straight down, deployed) ===
  const bipodHinge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.018), accentMat);
  bipodHinge.position.set(0, -0.0123, -0.24);
  group.add(bipodHinge);
  for (const sx of [-0.011, 0.011]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.08, 6), accentMat);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(sx, -0.0123, -0.288);
    group.add(leg);
  }

  // === Bolt assembly (the cocking part — slides backward, with a slight vertical bob) ===
  const boltGroup = new THREE.Group();
  const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10), barrelMat);
  boltBody.rotation.x = Math.PI / 2;
  boltBody.position.set(0.022, 0.03, 0);
  boltGroup.add(boltBody);
  // Bolt handle (sticks out to the right at right angle)
  const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.038, 8), barrelMat);
  boltHandle.rotation.z = Math.PI / 2;
  boltHandle.position.set(0.041, 0.03, 0.015);
  boltGroup.add(boltHandle);
  // Bolt knob
  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 6), barrelMat);
  boltKnob.position.set(0.055, 0.03, 0.015);
  boltGroup.add(boltKnob);

  boltGroup.position.set(0, 0, 0);
  boltGroup.userData.baseZ = 0;
  boltGroup.userData.baseY = 0;
  group.add(boltGroup);

  // === Trigger guard + trigger === v1.225: the trigger under the receiver's rear, the guard's bar below the stock
  // running back to the grip (the trigger sat inside the old guard, the grip block round both)
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.004), accentMat);
  tgFront.position.set(0, -0.025, -0.018);
  group.add(tgFront);
  const tgBottom = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.043), accentMat);
  tgBottom.position.set(0, -0.034, 0.0015);
  group.add(tgBottom);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.005), accentMat);
  trigger.position.set(0, -0.022, 0.003);
  trigger.rotation.x = 0.2;
  trigger.name = 'trigger';
  group.add(trigger);

  // Iron sights. v1.225: the front post moved out to the muzzle on a ramp, along the line from your eye aimed, so
  // the aimed picture is unchanged (it stood at the receiver's front on nothing); both hide when an optic is mounted.
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.006), accentMat);
  rearSight.position.set(0, 0.042, 0.005);
  rearSight.userData.ironSight = true;
  group.add(rearSight);
  const fsRamp = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0195, 0.016), accentMat);
  fsRamp.position.set(0, 0.03575, -0.335);
  fsRamp.userData.ironSight = true;
  group.add(fsRamp);
  const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), accentMat);
  fsPost.position.set(0, 0.0518, -0.335);
  fsPost.userData.ironSight = true;
  fsPost.userData.frontSight = true;
  fsPost.name = 'frontsight';
  group.add(fsPost);

  // === Default hipfire pose — sniper held a touch lower (heavier feel) ===
  group.position.set(0.12, -0.22, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.05;

  group.userData.cockingParts = [boltGroup];
  group.userData.cockingOffset = 0.06;
  group.userData.gunType = 'sniper';

  Game.camera.add(group);
  return group;
}

// v1.336 (backlog D.63, Michael: A, batch 2): the L96, an Accuracy International-style bolt sniper on the spring
// sniper's action, barrel, bolt and sights (so its hands and aimed picture are the sniper's): the stock and forend
// olive, a black cheek riser on the comb, a spacer behind the butt pad, a short box mag under the receiver ahead of
// the trigger guard, and a muzzle brake on the barrel behind the orange tip.
function buildFPL96() {
  const group = buildFPSniper();
  const olive = new THREE.MeshStandardMaterial({ color: 0x56603a, roughness: 0.75 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6, metalness: 0.2 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
  for (const n of ['forend', 'stock']) { const o = group.getObjectByName(n); if (o) o.material = olive; }
  add(new THREE.BoxGeometry(0.030, 0.012, 0.064), black, 0, 0.0615, 0.118).name = 'cheekriser';
  add(new THREE.BoxGeometry(0.036, 0.096, 0.006), black, 0, 0.001, 0.169);
  add(new THREE.BoxGeometry(0.022, 0.030, 0.040), black, 0, -0.028, -0.048).name = 'mag';
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.022, 10), black);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.02, -0.352); group.add(brake);
  group.userData.gunType = 'l96';
  return group;
}

// v1.395 (backlog D.63, Michael: A, batch 4): the SVD, a Dragunov-style battery sniper on the spring sniper's barrel,
// sights and stock line (so its hands and aimed picture are the sniper's): the forend and stock in red-brown wood, a
// black receiver cover, a curved black 20-round mag under the receiver ahead of the trigger guard, a slotted flash
// hider behind the orange tip, and no bolt: a charging handle on the right racks a new mag.
function buildFPSVD() {
  const group = buildFPSniper();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a3b22, roughness: 0.65 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6, metalness: 0.2 });
  const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  for (const n of ['forend', 'stock']) { const o = group.getObjectByName(n); if (o) o.material = wood; }
  // the bolt comes off: a battery cycles it
  for (const p of group.userData.cockingParts) group.remove(p);
  add(new THREE.BoxGeometry(0.034, 0.010, 0.11), black, 0, 0.039, -0.04).name = 'cover';   // the receiver cover
  const mag = add(new THREE.BoxGeometry(0.022, 0.050, 0.034), black, 0, -0.036, -0.050);
  mag.rotation.x = 0.35; mag.name = 'mag';                                                   // curved forward
  for (let i = 0; i < 3; i++) {                                                               // the flash hider's slots
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.006, 10), black);
    r.rotation.x = Math.PI / 2; r.position.set(0, 0.02, -0.348 + i * 0.008); group.add(r);
  }
  const charge = new THREE.Group();
  add(new THREE.BoxGeometry(0.010, 0.008, 0.016), black, 0, 0, 0, charge);
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8), black, 0.008, 0, 0, charge).rotation.z = Math.PI / 2;
  charge.position.set(0.020, 0.026, -0.065);
  charge.userData.baseZ = charge.position.z;
  group.add(charge);
  group.userData.cockingParts = [charge];
  group.userData.cockingOffset = 0.035;
  group.userData.gunType = 'svd';
  return group;
}

// v1.346 (backlog D.63, Michael: A, batch 2): the P90, a bullpup SMG. A long low black body from the butt to a short
// barrel, its 200-BB mag lying smoke-clear along the top behind a ring sight with a post in it (the post's tip is the
// aimed point), a pistol grip under the middle with the trigger ahead of it, and the off hand's stop at the front,
// joined to the grip by the thumbhole's bar. The charging knobs sit either side of the front.
function buildFPP90() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.55, metalness: 0.25 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.7,  metalness: 0.15 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.4,  metalness: 0.55 });
  const smokeMat  = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.036, 0.05, 0.36), bodyMat, 0, -0.012, -0.01, 'receiver');
  add(new THREE.BoxGeometry(0.036, 0.07, 0.05), bodyMat, 0, -0.02, 0.15, 'stock');
  add(new THREE.BoxGeometry(0.030, 0.022, 0.20), smokeMat, 0, 0.024, 0.02, 'mag');
  add(new THREE.BoxGeometry(0.028, 0.026, 0.09), matteMat, 0, 0.026, -0.135);
  add(new THREE.TorusGeometry(0.012, 0.0025, 6, 14), matteMat, 0, 0.052, -0.15);
  add(new THREE.BoxGeometry(0.003, 0.010, 0.003), steelMat, 0, 0.044, -0.15).userData.frontSight = true;
  const barrel = add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), steelMat, 0, -0.006, -0.205);
  barrel.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.02, 10), orangeMat, 0, -0.006, -0.23);
  tip.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.03, 0.06, 0.028), bodyMat, 0, -0.066, -0.02).rotation.x = -0.15;
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), matteMat, 0, -0.044, -0.05, 'trigger').rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.028, 0.06, 0.025), bodyMat, 0, -0.066, -0.15);
  add(new THREE.BoxGeometry(0.012, 0.006, 0.13), bodyMat, 0, -0.099, -0.085);
  const chargeGroup = new THREE.Group();
  for (const sx of [-0.022, 0.022]) {
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.014), steelMat);
    knob.position.set(sx, 0.0, -0.165);
    chargeGroup.add(knob);
  }
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.14, -0.19, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'p90';
  Game.camera.add(group);
  return group;
}

// v1.348 (backlog D.63, Michael: A, batch 2): the Vector, the batch's last SMG. A short boxy upper with a rail along
// the top carrying flip-up irons (the front post's tip is the aimed point), the slanted front that drops ahead of the
// trigger with the mag under it, the pistol grip behind the mag, a shroud and short barrel ahead, its own front grip
// under the shroud, and a folding stock behind. The charging knobs sit either side of the upper.
function buildFPVector() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.55, metalness: 0.25 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.7,  metalness: 0.15 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.4,  metalness: 0.55 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.034, 0.030, 0.34), bodyMat, 0, 0.012, -0.02, 'receiver');   // the upper and its rail
  add(new THREE.BoxGeometry(0.038, 0.060, 0.16), bodyMat, 0, -0.030, 0.03);               // the lower over the grip
  add(new THREE.BoxGeometry(0.038, 0.070, 0.06), bodyMat, 0, -0.040, -0.075);             // the slanted front
  add(new THREE.BoxGeometry(0.026, 0.110, 0.035), matteMat, 0, -0.120, -0.085, 'mag');
  add(new THREE.BoxGeometry(0.028, 0.070, 0.030), bodyMat, 0, -0.090, 0.06).rotation.x = -0.2;   // the pistol grip
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), matteMat, 0, -0.066, 0.025, 'trigger').rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.010, 0.006, 0.09), bodyMat, 0, -0.078, 0.0);                // the trigger guard
  add(new THREE.BoxGeometry(0.030, 0.030, 0.07), bodyMat, 0, -0.005, -0.225);             // the shroud
  add(new THREE.BoxGeometry(0.024, 0.050, 0.024), matteMat, 0, -0.045, -0.20);            // its front grip
  const barrel = add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), steelMat, 0, 0.0, -0.27);
  barrel.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.02, 10), orangeMat, 0, 0.0, -0.295);
  tip.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.020, 0.030, 0.12), matteMat, 0, 0.0, 0.21);                 // the folding stock
  add(new THREE.BoxGeometry(0.030, 0.070, 0.02), matteMat, 0, -0.02, 0.27);               // its butt pad
  add(new THREE.BoxGeometry(0.020, 0.016, 0.02), matteMat, 0, 0.035, 0.11);               // the rear sight
  add(new THREE.BoxGeometry(0.020, 0.014, 0.012), matteMat, 0, 0.034, -0.17);             // the front sight's base
  add(new THREE.BoxGeometry(0.003, 0.010, 0.003), steelMat, 0, 0.046, -0.17).userData.frontSight = true;
  const chargeGroup = new THREE.Group();
  for (const sx of [-0.0215, 0.0215]) {
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.014), steelMat);
    knob.position.set(sx, 0.012, -0.12);
    chargeGroup.add(knob);
  }
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.14, -0.19, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'vector';
  Game.camera.add(group);
  return group;
}

// v1.403 (backlog D.63, Michael: A, batch 5): the Thompson, a drum-fed SMG in blued steel and walnut. A square
// receiver with the cocking knob on top, a finned barrel with its compensator ahead, the round drum under the receiver
// ahead of the trigger, a wooden pistol grip and a wooden front grip under the barrel, and a wooden stock behind. The
// front blade on the barrel is the aimed point, over the rear sight's notch.
function buildFPThompson() {
  const group = new THREE.Group();
  const bluedMat  = new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: 0.35, metalness: 0.7 });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6,  metalness: 0.3 });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x6b3f22, roughness: 0.65, metalness: 0.0 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.034, 0.040, 0.20), bluedMat, 0, 0.0, -0.02, 'receiver');
  add(new THREE.BoxGeometry(0.030, 0.020, 0.12), bluedMat, 0, -0.026, 0.02);               // the frame over the grip
  const barrel = add(new THREE.CylinderGeometry(0.009, 0.009, 0.17, 12), bluedMat, 0, 0.0, -0.205, 'barrel');
  barrel.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {                                                             // the cooling fins
    const fin = add(new THREE.CylinderGeometry(0.0135, 0.0135, 0.006, 12), bluedMat, 0, 0.0, -0.135 - i * 0.014);
    fin.rotation.x = Math.PI / 2;
  }
  const comp = add(new THREE.CylinderGeometry(0.0115, 0.0115, 0.032, 12), darkMat, 0, 0.0, -0.300, 'compensator');
  comp.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0115, 0.0115, 0.012, 12), orangeMat, 0, 0.0, -0.322, 'tip');
  tip.rotation.x = Math.PI / 2;
  // the round drum under the receiver, its face to the sides
  const drum = add(new THREE.CylinderGeometry(0.050, 0.050, 0.032, 20), darkMat, 0, -0.062, -0.070, 'mag');
  drum.rotation.z = Math.PI / 2;
  for (const sx of [-0.0165, 0.0165]) {                                                     // the winding key's hub on each face
    const hub = add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), bluedMat, sx, -0.062, -0.070);
    hub.rotation.z = Math.PI / 2;
  }
  add(new THREE.BoxGeometry(0.026, 0.068, 0.032), woodMat, 0, -0.064, 0.055, 'grip').rotation.x = -0.25;   // the pistol grip
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), darkMat, 0, -0.042, 0.010, 'trigger').rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.010, 0.006, 0.060), bluedMat, 0, -0.052, 0.008);              // the trigger guard
  add(new THREE.BoxGeometry(0.020, 0.016, 0.030), bluedMat, 0, -0.014, -0.180);             // the front grip's mount
  add(new THREE.BoxGeometry(0.024, 0.060, 0.028), woodMat, 0, -0.050, -0.180, 'foregrip');   // the wooden front grip
  add(new THREE.BoxGeometry(0.026, 0.040, 0.16), woodMat, 0, -0.016, 0.160, 'stock');       // the wooden stock
  add(new THREE.BoxGeometry(0.030, 0.075, 0.030), woodMat, 0, -0.034, 0.250, 'buttpad');
  for (const sx of [-0.0055, 0.0055]) add(new THREE.BoxGeometry(0.005, 0.012, 0.014), bluedMat, sx, 0.026, 0.050);   // the rear sight's notch
  add(new THREE.BoxGeometry(0.006, 0.020, 0.008), bluedMat, 0, 0.016, -0.262);              // the front sight's base
  add(new THREE.BoxGeometry(0.003, 0.012, 0.003), bluedMat, 0, 0.032, -0.262).userData.frontSight = true;
  const chargeGroup = new THREE.Group();
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.010, 10), bluedMat);
  knob.position.set(0, 0.025, -0.060);
  chargeGroup.add(knob);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.14, -0.19, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'thompson';
  Game.camera.add(group);
  return group;
}

// v1.371 (backlog D.63, Michael: A, batch 3): the G36C, the first of "a few more Automatic rifles". A dark grey
// polymer receiver with a long top rail carrying flip-up irons (the front post's tip is the aimed point), a vented
// handguard and short barrel ahead, the smoky see-through mag in its well with the BBs showing inside, the pistol
// grip behind it, and the skeleton stock folded out behind. The charging handle sits under the rail's front, on top.
function buildFPG36() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.6,  metalness: 0.2 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7,  metalness: 0.15 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4,  metalness: 0.55 });
  const clearMat  = new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55 });
  const bbMat     = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.036, 0.050, 0.24), bodyMat, 0, -0.008, -0.04, 'receiver');
  add(new THREE.BoxGeometry(0.022, 0.012, 0.30), matteMat, 0, 0.022, -0.06);              // the top rail
  for (let i = 0; i < 10; i++) add(new THREE.BoxGeometry(0.024, 0.003, 0.008), matteMat, 0, 0.029, 0.07 - i * 0.028);   // its slots
  add(new THREE.BoxGeometry(0.040, 0.044, 0.13), bodyMat, 0, -0.012, -0.225, 'handguard');
  for (let i = 0; i < 4; i++) for (const sx of [-0.0205, 0.0205]) add(new THREE.BoxGeometry(0.002, 0.010, 0.016), matteMat, sx, -0.012, -0.19 - i * 0.026);   // its vents
  const barrel = add(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), steelMat, 0, -0.005, -0.32, 'barrel');
  barrel.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 10), orangeMat, 0, -0.005, -0.36, 'tip');
  tip.rotation.x = Math.PI / 2;
  // the clear mag, raked a little forward, with the BBs showing inside it
  const mag = add(new THREE.BoxGeometry(0.024, 0.115, 0.042), clearMat, 0, -0.088, -0.095, 'mag');
  mag.rotation.x = 0.18;
  for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.0055, 6, 5), bbMat, 0, -0.050 - i * 0.022, -0.090 - i * 0.004);
  add(new THREE.BoxGeometry(0.030, 0.064, 0.030), bodyMat, 0, -0.068, 0.035).rotation.x = -0.25;   // the pistol grip
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), steelMat, 0, -0.040, -0.010, 'trigger').rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.010, 0.006, 0.07), bodyMat, 0, -0.052, -0.012);             // the trigger guard
  // the skeleton stock: a top bar, a lower bar and the butt plate
  add(new THREE.BoxGeometry(0.020, 0.016, 0.16), matteMat, 0, 0.000, 0.16);
  add(new THREE.BoxGeometry(0.016, 0.012, 0.17), matteMat, 0, -0.040, 0.16);
  add(new THREE.BoxGeometry(0.030, 0.075, 0.014), matteMat, 0, -0.024, 0.245, 'buttpad');
  // the irons on the rail: a rear aperture and the front post on its base (the tip at y 0.055)
  add(new THREE.BoxGeometry(0.020, 0.018, 0.016), matteMat, 0, 0.037, 0.06);
  add(new THREE.BoxGeometry(0.018, 0.016, 0.012), matteMat, 0, 0.036, -0.18);
  add(new THREE.BoxGeometry(0.003, 0.011, 0.003), steelMat, 0, 0.0495, -0.18).userData.frontSight = true;
  const chargeGroup = new THREE.Group();
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.018), steelMat);
  knob.position.set(0, 0.012, -0.135);
  chargeGroup.add(knob);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.13, -0.20, -0.31);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'g36';
  Game.camera.add(group);
  return group;
}

// v1.372 (backlog D.63, Michael: A, batch 3): the AUG, a bullpup rifle. A long olive body from the butt plate forward,
// the smoky clear mag behind the pistol grip with its BBs showing, a top rail along it carrying flip-up irons (the
// front post's tip is the aimed point), a round shroud and a long barrel ahead of the body, the folding foregrip under
// the shroud, and the big trigger guard running from the grip to it. The charging handle sits on the left side.
function buildFPAUG() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x4f5a3c, roughness: 0.65, metalness: 0.1 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7,  metalness: 0.15 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4,  metalness: 0.55 });
  const clearMat  = new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55 });
  const bbMat     = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.040, 0.060, 0.36), bodyMat, 0, -0.015, 0.02, 'receiver');   // the body, butt to front
  add(new THREE.BoxGeometry(0.042, 0.075, 0.014), matteMat, 0, -0.022, 0.205, 'buttpad');
  add(new THREE.BoxGeometry(0.022, 0.012, 0.24), matteMat, 0, 0.021, -0.02);               // the top rail
  for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.024, 0.003, 0.008), matteMat, 0, 0.0275, 0.08 - i * 0.028);   // its slots
  const shroud = add(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 12), bodyMat, 0, -0.012, -0.20, 'handguard');
  shroud.rotation.x = Math.PI / 2;
  const barrel = add(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 10), steelMat, 0, -0.012, -0.28, 'barrel');
  barrel.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 10), orangeMat, 0, -0.012, -0.325, 'tip');
  tip.rotation.x = Math.PI / 2;
  // the pistol grip forward of the mag, the trigger ahead of it, and the clear mag behind it with the BBs inside
  add(new THREE.BoxGeometry(0.030, 0.064, 0.030), bodyMat, 0, -0.078, -0.03).rotation.x = -0.2;
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), steelMat, 0, -0.052, -0.065, 'trigger').rotation.x = 0.2;
  const mag = add(new THREE.BoxGeometry(0.024, 0.11, 0.040), clearMat, 0, -0.092, 0.07, 'mag');
  mag.rotation.x = 0.12;
  for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.0055, 6, 5), bbMat, 0, -0.056 - i * 0.022, 0.072 + i * 0.003);
  // the folding foregrip under the shroud, and the guard from it back to the grip
  add(new THREE.BoxGeometry(0.024, 0.055, 0.024), bodyMat, 0, -0.052, -0.19);
  add(new THREE.BoxGeometry(0.010, 0.006, 0.14), bodyMat, 0, -0.082, -0.11);
  // the irons on the rail: a rear aperture and the front post on its base (the tip at y 0.053)
  add(new THREE.BoxGeometry(0.020, 0.018, 0.016), matteMat, 0, 0.035, 0.07);
  add(new THREE.BoxGeometry(0.018, 0.016, 0.012), matteMat, 0, 0.034, -0.12);
  add(new THREE.BoxGeometry(0.003, 0.011, 0.003), steelMat, 0, 0.0475, -0.12).userData.frontSight = true;
  const chargeGroup = new THREE.Group();
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.018), steelMat);
  knob.position.set(-0.024, 0.0, -0.10);
  chargeGroup.add(knob);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.13, -0.20, -0.31);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'aug';
  Game.camera.add(group);
  return group;
}

// v1.373 (backlog D.63, Michael: A, batch 3): the M4, a black battery carbine. A flat-top upper on the lower, a top rail
// the length of the gun carrying a flip-up rear aperture and the front post on its tall base (the post's tip is the
// aimed point), a railed handguard with a rail on each side, a short barrel and its orange tip, the curved black mag in
// its well, the pistol grip and guard, the buffer tube and the sliding stock. The charging handle sits at the back of the upper.
function buildFPM4() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.6,  metalness: 0.25 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x131315, roughness: 0.75, metalness: 0.15 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4,  metalness: 0.55 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; group.add(m); return m; };
  add(new THREE.BoxGeometry(0.036, 0.056, 0.20), bodyMat, 0, -0.010, -0.03, 'receiver');   // the upper and lower
  add(new THREE.BoxGeometry(0.004, 0.016, 0.040), matteMat, 0.020, 0.000, -0.02);           // the ejection port cover
  add(new THREE.BoxGeometry(0.022, 0.012, 0.36), matteMat, 0, 0.024, -0.08);                // the top rail
  for (let i = 0; i < 12; i++) add(new THREE.BoxGeometry(0.024, 0.003, 0.008), matteMat, 0, 0.0315, 0.08 - i * 0.028);   // its slots
  add(new THREE.BoxGeometry(0.040, 0.050, 0.14), bodyMat, 0, -0.007, -0.20, 'handguard');
  for (const sx of [-0.022, 0.022]) add(new THREE.BoxGeometry(0.004, 0.008, 0.12), matteMat, sx, -0.007, -0.20);   // its side rails
  const barrel = add(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 10), steelMat, 0, -0.005, -0.31, 'barrel');
  barrel.rotation.x = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 10), orangeMat, 0, -0.005, -0.361, 'tip');
  tip.rotation.x = Math.PI / 2;
  // the mag well and the curved black mag, raked forward in two pieces
  add(new THREE.BoxGeometry(0.030, 0.030, 0.040), bodyMat, 0, -0.050, -0.085);
  const mag = add(new THREE.BoxGeometry(0.022, 0.110, 0.034), matteMat, 0, -0.090, -0.085, 'mag');
  mag.rotation.x = 0.22;
  add(new THREE.BoxGeometry(0.022, 0.050, 0.034), matteMat, 0, -0.1625, -0.106).rotation.x = 0.45;
  add(new THREE.BoxGeometry(0.030, 0.064, 0.030), bodyMat, 0, -0.066, 0.035).rotation.x = -0.25;   // the pistol grip
  add(new THREE.BoxGeometry(0.006, 0.014, 0.005), steelMat, 0, -0.044, -0.005, 'trigger').rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.010, 0.006, 0.06), bodyMat, 0, -0.056, -0.005);              // the trigger guard
  // the buffer tube and the sliding stock on it
  const tube = add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), matteMat, 0, 0.000, 0.13);
  tube.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.030, 0.050, 0.10), matteMat, 0, -0.012, 0.19);
  add(new THREE.BoxGeometry(0.032, 0.070, 0.012), matteMat, 0, -0.018, 0.246, 'buttpad');
  // the irons on the rail: the flip-up rear aperture and the front post on its tall base (the tip at y 0.057)
  add(new THREE.BoxGeometry(0.020, 0.018, 0.016), matteMat, 0, 0.039, 0.05);
  add(new THREE.BoxGeometry(0.016, 0.016, 0.012), matteMat, 0, 0.038, -0.24);
  add(new THREE.BoxGeometry(0.003, 0.011, 0.003), steelMat, 0, 0.0515, -0.24).userData.frontSight = true;
  const chargeGroup = new THREE.Group();
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.008, 0.016), steelMat);
  knob.position.set(0, 0.014, 0.078);
  chargeGroup.add(knob);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);
  group.position.set(0.13, -0.20, -0.31);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'm4';
  Game.camera.add(group);
  return group;
}

// ======================================================================
// FP AUTO-WEAPON MESHES (v1.23a) — AK-47, MP5, UMP, MAC-10
// ----------------------------------------------------------------------
// The four auto guns (specs added in v1.20) had no first-person model and
// fell back to the pistol mesh in getOrBuildFPGun — so they all looked like a
// Glock in-hand. These give each its own silhouette. Same conventions as the
// other FP guns: gun-local frame (+X right, +Y up, barrel toward −Z), ~4cm
// scale, an orange muzzle tip (airsoft signifier), and a charging-handle
// `cockingParts` group that pulls back during the initial chamber-rack.
// ======================================================================

// --- AK-47: curved banana mag, wood furniture, gas tube, side charging handle ---
function buildFPAK() {
  const group = new THREE.Group();
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x20211f, roughness: 0.45, metalness: 0.55 });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6,  metalness: 0.3 });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.8,  metalness: 0.05 }); // orange-brown AK furniture
  const woodMat2  = new THREE.MeshStandardMaterial({ color: 0x6a3e1c, roughness: 0.82, metalness: 0.05 });
  const magMat    = new THREE.MeshStandardMaterial({ color: 0x9a5a28, roughness: 0.7,  metalness: 0.1 });  // classic bakelite-ish
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

  // Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.16), steelMat);
  receiver.position.set(0, 0.012, -0.05);
  receiver.name = 'receiver';
  group.add(receiver);
  // Top cover (rounded-ish dust cover) — slightly narrower box on top
  const topCover = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.02, 0.15), steelMat);
  topCover.position.set(0, 0.045, -0.05);
  group.add(topCover);

  // v1.226 (D.31): held up to an AK-47 (drawn at about ×0.67, its receiver 16 cm). The gas tube runs from the
  // receiver to a gas block behind the front sight, under a wood upper handguard over its rear half (it floated
  // 9 mm over the lower handguard and stopped where the handguard did); a rear sight stands at the front of the top
  // cover; the magazine is one curved piece seated in the receiver, 2 cm further forward, so a trigger and guard fit
  // between it and the grip (it was three tilted blocks with gaps, touching the guard, and there was no trigger); the
  // stock drops from the receiver to a tall butt (it was a straight box on the bore line).
  // Lower wood handguard, round the barrel
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.10), woodMat);
  handguard.position.set(0, 0.01, -0.18);
  handguard.name = 'handguard';
  group.add(handguard);
  // Gas tube from the receiver to the gas block, the upper handguard round its rear half
  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.155, 8), steelMat);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.044, -0.2075);
  gasTube.name = 'gastube';
  group.add(gasTube);
  const upperGuard = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.026, 0.10), woodMat);
  upperGuard.position.set(0, 0.043, -0.18);
  upperGuard.name = 'upperguard';
  group.add(upperGuard);
  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.034, 0.02), steelMat);
  gasBlock.position.set(0, 0.035, -0.285);
  gasBlock.name = 'gasblock';
  group.add(gasBlock);

  // Barrel + front sight block + orange tip
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.174, 10), darkMat);   // v1.220: reaches the tip
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.025, -0.307);
  barrel.name = 'barrel';
  group.add(barrel);
  const fsBlock = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.022), steelMat);
  fsBlock.position.set(0, 0.045, -0.31);
  group.add(fsBlock);
  const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.004), darkMat);
  fsPost.position.set(0, 0.064, -0.31);
  fsPost.userData.frontSight = true;
  group.add(fsPost);
  // Rear sight at the front of the top cover: a base and two ears, the notch between them over the bore line
  const rsBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.011, 0.016), steelMat);
  rsBase.position.set(0, 0.0605, -0.117);
  rsBase.userData.ironSight = true;
  group.add(rsBase);
  for (const sx of [-0.0065, 0.0065]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.006, 0.006), steelMat);
    ear.position.set(sx, 0.069, -0.117);
    ear.userData.ironSight = true;
    group.add(ear);
  }
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.026, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.025, -0.40);
  group.add(orangeTip);

  // Curved banana magazine: one piece between two arcs about a centre ahead of it, sweeping 0.56 rad forward as it
  // drops 12.5 cm, its top 4.5 cm long seated 3 mm into the receiver
  const magProf = new THREE.Shape(), MR = 0.24, MW = 0.045, MA = 0.56, mcz = -0.038 - MR, mcy = -0.010;
  const magPts = [];
  for (let i = 0; i <= 6; i++) { const t = MA * i / 6; magPts.push([mcz + MR * Math.cos(t), mcy - MR * Math.sin(t)]); }
  for (let i = 6; i >= 0; i--) { const t = MA * i / 6; magPts.push([mcz + (MR - MW) * Math.cos(t), mcy - (MR - MW) * Math.sin(t)]); }
  magPts.forEach(([z, y], i) => i ? magProf.lineTo(z, y) : magProf.moveTo(z, y));
  const magGeo = new THREE.ExtrudeGeometry(magProf, { depth: 0.026, bevelEnabled: false });
  magGeo.translate(0, 0, -0.013);
  magGeo.rotateY(-Math.PI / 2);
  const mag = new THREE.Mesh(magGeo, magMat);
  mag.name = 'mag';
  group.add(mag);

  // Charging handle — AK's is on the RIGHT side, reciprocates with the bolt.
  const chargeGroup = new THREE.Group();
  const chargeKnob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.018), steelMat);
  chargeKnob.position.set(0.028, 0.03, 0);
  chargeGroup.add(chargeKnob);
  chargeGroup.position.set(0, 0, -0.02);
  chargeGroup.userData.baseZ = chargeGroup.position.z;
  group.add(chargeGroup);

  // Pistol grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.07, 0.03), woodMat2);
  grip.position.set(0, -0.05, 0.02);
  grip.rotation.x = -0.25;
  grip.name = 'grip';
  group.add(grip);
  // Trigger guard (an upright behind the mag, a bar back to the grip) and the trigger inside it
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.004), darkMat);
  tgFront.position.set(0, -0.023, -0.034);
  group.add(tgFront);
  const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.04), darkMat);
  tg.position.set(0, -0.033, -0.016);
  group.add(tg);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.005), darkMat);
  trigger.position.set(0, -0.020, -0.015);
  trigger.rotation.x = 0.2;
  trigger.name = 'trigger';
  group.add(trigger);

  // Fixed wood stock, dropping from the receiver's rear to a tall butt
  const stockProf = new THREE.Shape();
  [[0.028, 0.032], [0.150, 0.012], [0.150, -0.066], [0.028, -0.013]].forEach(([z, y], i) => i ? stockProf.lineTo(z, y) : stockProf.moveTo(z, y));
  const stockGeo = new THREE.ExtrudeGeometry(stockProf, { depth: 0.034, bevelEnabled: false });
  stockGeo.translate(0, 0, -0.017);
  stockGeo.rotateY(-Math.PI / 2);
  const stock = new THREE.Mesh(stockGeo, woodMat);
  stock.name = 'stock';
  group.add(stock);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.08, 0.012), darkMat);
  stockPad.position.set(0, -0.027, 0.155);
  stockPad.name = 'buttpad';
  group.add(stockPad);

  group.position.set(0.13, -0.20, -0.32);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.035;
  group.userData.gunType = 'ak47';
  Game.camera.add(group);
  return group;
}

// v1.335 (backlog D.63, Michael: A, batch 2): the M249, a battery light machine gun drawn at the AK's scale (about
// ×0.67): a long receiver under a feed cover with the rear sight at its back, a pistol grip and trigger guard, a
// solid stock, a ribbed handguard ahead of the box, a heat shield over the barrel, a front post on a tall block near
// the orange tip, a bipod folded under the barrel, the olive box of BBs hung under the left of the receiver with a
// short belt running up into its feed, and a charging handle on the right (what racks a new box).
function buildFPM249() {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1c1d, roughness: 0.55, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.4, metalness: 0.6 });
  const olive = new THREE.MeshStandardMaterial({ color: 0x4b5226, roughness: 0.8 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.7 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z, name, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; parent.add(m); return m; };
  const tube = (r, len, mat, x, y, z, name) => { const m = add(new THREE.CylinderGeometry(r, r, len, 10), mat, x, y, z, name); m.rotation.x = Math.PI / 2; return m; };
  // the receiver and the feed cover on it, the rear sight's two ears at the cover's back
  add(new THREE.BoxGeometry(0.046, 0.056, 0.20), black, 0, 0.010, -0.06, 'receiver');
  add(new THREE.BoxGeometry(0.044, 0.016, 0.12), black, 0, 0.046, -0.07, 'feedcover');
  add(new THREE.BoxGeometry(0.004, 0.006, 0.050), steel, 0.023, 0.046, -0.07);   // the cover's hinge line
  const rs = add(new THREE.BoxGeometry(0.020, 0.010, 0.014), black, 0, 0.059, -0.02); rs.userData.ironSight = true;
  for (const sx of [-0.0065, 0.0065]) add(new THREE.BoxGeometry(0.007, 0.010, 0.006), black, sx, 0.069, -0.02).userData.ironSight = true;
  // the handguard ahead of the box, its ribs, and the heat shield over the barrel
  add(new THREE.BoxGeometry(0.050, 0.036, 0.10), black, 0, 0.000, -0.21, 'handguard');
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.052, 0.004, 0.006), steel, 0, -0.019, -0.175 - i * 0.022);
  tube(0.010, 0.29, steel, 0, 0.022, -0.305, 'barrel');
  add(new THREE.BoxGeometry(0.030, 0.012, 0.11), black, 0, 0.036, -0.215, 'heatshield');
  tube(0.007, 0.10, steel, 0, 0.004, -0.31, 'gastube');
  // the front sight: a tall block on the barrel and its post (the tip at y 0.071)
  add(new THREE.BoxGeometry(0.014, 0.028, 0.016), black, 0, 0.044, -0.40);
  const post = add(new THREE.BoxGeometry(0.004, 0.014, 0.004), black, 0, 0.064, -0.40);
  post.userData.frontSight = true;
  tube(0.012, 0.024, orangeMat, 0, 0.022, -0.462, 'tip');
  // the bipod, folded along the gas tube: a yoke and two legs with their feet
  add(new THREE.BoxGeometry(0.032, 0.012, 0.012), steel, 0, 0.002, -0.37);
  for (const sx of [-0.011, 0.011]) {
    tube(0.004, 0.12, steel, sx, -0.006, -0.31);
    add(new THREE.BoxGeometry(0.008, 0.008, 0.010), black, sx, -0.008, -0.248);
  }
  // the box of BBs under the left of the receiver, its lid and the short belt up into the feed
  add(new THREE.BoxGeometry(0.052, 0.090, 0.082), olive, -0.012, -0.060, -0.085, 'mag');
  add(new THREE.BoxGeometry(0.054, 0.006, 0.084), black, -0.012, -0.016, -0.085);
  for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.003, 0.003, 0.010, 6), brass, -0.027, 0.000 + i * 0.008, -0.085).rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.004, 0.024, 0.014), black, -0.025, 0.006, -0.085);   // the feed port's lip
  // the pistol grip, the trigger guard and trigger
  const grip = add(new THREE.BoxGeometry(0.032, 0.07, 0.03), black, 0, -0.05, 0.03, 'grip'); grip.rotation.x = -0.25;
  add(new THREE.BoxGeometry(0.012, 0.016, 0.004), black, 0, -0.026, -0.030);
  add(new THREE.BoxGeometry(0.012, 0.004, 0.050), black, 0, -0.033, -0.005);
  const trig = add(new THREE.BoxGeometry(0.006, 0.016, 0.005), steel, 0, -0.022, -0.010, 'trigger'); trig.rotation.x = 0.2;
  // the solid stock, its toe and the butt pad
  add(new THREE.BoxGeometry(0.036, 0.050, 0.12), black, 0, 0.004, 0.10, 'stock');
  add(new THREE.BoxGeometry(0.032, 0.030, 0.08), black, 0, -0.030, 0.12);
  add(new THREE.BoxGeometry(0.038, 0.078, 0.012), black, 0, -0.006, 0.166, 'buttpad');
  // the charging handle on the right
  const charge = new THREE.Group();
  add(new THREE.BoxGeometry(0.030, 0.012, 0.018), steel, 0.030, 0.020, 0, null, charge);
  charge.position.set(0, 0, -0.10);
  charge.userData.baseZ = charge.position.z;
  group.add(charge);
  group.position.set(0.13, -0.20, -0.31);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [charge];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'm249';
  Game.camera.add(group);
  return group;
}

// v1.396 (backlog D.63, Michael: A, batch 4): the RPK, on the AK's receiver, wood, grip, stock and sights (so its hands
// and aimed picture are the AK's): the banana mag gives way to a round drum, the barrel runs on 7 cm past the AK's
// muzzle to the orange tip, and a bipod lies folded under it.
function buildFPRPK() {
  const group = buildFPAK();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.4, metalness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1c1d, roughness: 0.55, metalness: 0.3 });
  const tube = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); group.add(m); return m; };
  const old = group.getObjectByName('mag'); if (old) group.remove(old);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.036, 20), black);
  drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.078, -0.085); drum.name = 'mag'; group.add(drum);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.040, 12), steel);
  hub.rotation.z = Math.PI / 2; hub.position.copy(drum.position); group.add(hub);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.030, 0.040), black);
  neck.position.set(0, -0.025, -0.075); group.add(neck);                                     // the drum's feed into the receiver
  // the barrel on past the AK's muzzle, the tip moved to its end
  tube(0.009, 0.10, steel, 0, 0.025, -0.44);   // from inside the AK's muzzle to the tip
  group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xff7a1a) o.position.z = -0.50; });
  // the bipod folded under the barrel: a yoke and two legs
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.012, 0.012), steel);
  yoke.position.set(0, 0.012, -0.455); group.add(yoke);
  for (const sx of [-0.010, 0.010]) tube(0.0035, 0.11, steel, sx, 0.008, -0.395);
  group.userData.gunType = 'rpk';
  return group;
}

// --- MP5: slim, compact, curved mag, slim handguard, retractable stock ---
function buildFPMP5() {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.5,  metalness: 0.35 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.65, metalness: 0.2 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.4,  metalness: 0.55 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

  // Receiver (slim)
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.13), bodyMat);
  receiver.position.set(0, 0.012, -0.05);
  receiver.name = 'receiver';
  group.add(receiver);
  // Slim cylindrical handguard
  const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 12), matteMat);
  handguard.rotation.x = Math.PI / 2;
  handguard.position.set(0, 0.008, -0.16);
  group.add(handguard);
  // Ribs on the handguard
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 12), bodyMat);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(0, 0.008, -0.135 - i * 0.025);
    group.add(rib);
  }

  // Barrel + orange tip
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 10), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.225);
  group.add(barrel);
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.022, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.012, -0.27);
  group.add(orangeTip);

  // Front sight ring (MP5's hooded post) + rear drum
  const fsRing = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 12), bodyMat);
  fsRing.position.set(0, 0.04, -0.20);
  group.add(fsRing);
  const rearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 10), bodyMat);
  rearDrum.rotation.z = Math.PI / 2;
  rearDrum.position.set(0, 0.04, 0.003);   // v1.227: on the receiver's back end (it hung 5 mm past it)
  group.add(rearDrum);

  // v1.227 (D.31): held up to an MP5 (drawn at about ×0.64). The magazine is one piece curving forward as it drops,
  // with a trigger inside the guard between it and the grip (it was two blocks kinked back toward the grip, and there
  // was no trigger); the stock's two rails run back from the receiver's sides to the pad (it was one strut down the
  // middle).
  const magProf = new THREE.Shape(), MR = 0.2, MW = 0.028, MA = 0.5, mcz = -0.036 - MR, mcy = -0.006;
  const magPts = [];
  for (let i = 0; i <= 6; i++) { const t = MA * i / 6; magPts.push([mcz + MR * Math.cos(t), mcy - MR * Math.sin(t)]); }
  for (let i = 6; i >= 0; i--) { const t = MA * i / 6; magPts.push([mcz + (MR - MW) * Math.cos(t), mcy - (MR - MW) * Math.sin(t)]); }
  magPts.forEach(([z, y], i) => i ? magProf.lineTo(z, y) : magProf.moveTo(z, y));
  const magGeo = new THREE.ExtrudeGeometry(magProf, { depth: 0.022, bevelEnabled: false });
  magGeo.translate(0, 0, -0.011);
  magGeo.rotateY(-Math.PI / 2);
  const mag = new THREE.Mesh(magGeo, matteMat);
  mag.name = 'mag';
  group.add(mag);

  // Cocking handle (the "HK slap" tube up front-left, pulls back)
  const chargeGroup = new THREE.Group();
  const cockTube = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), steelMat);
  cockTube.rotation.x = Math.PI / 2;
  cockTube.position.set(-0.022, 0.036, -0.13);   // v1.220: on the receiver, not 6 mm over it
  chargeGroup.add(cockTube);
  const cockKnob = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.014), steelMat);
  cockKnob.position.set(-0.022, 0.036, -0.108);
  chargeGroup.add(cockKnob);
  chargeGroup.position.set(0, 0, 0);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);

  // Pistol grip + trigger guard
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.062, 0.028), bodyMat);
  grip.position.set(0, -0.041, 0.012);   // v1.227: up against the receiver (it hung 5 mm under it)
  grip.rotation.x = -0.22;
  group.add(grip);
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.004), matteMat);
  tgFront.position.set(0, -0.019, -0.031);
  group.add(tgFront);
  const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.033), matteMat);
  tg.position.set(0, -0.029, -0.0145);
  group.add(tg);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.005), matteMat);
  trigger.position.set(0, -0.015, -0.016);
  trigger.rotation.x = 0.2;
  trigger.name = 'trigger';
  group.add(trigger);

  // Retractable stock: a rail down each side of the receiver, back to the pad
  for (const sx of [-0.0155, 0.0155]) {
    const stockStrut = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.01, 0.16), steelMat);
    stockStrut.position.set(sx, 0.018, 0.064);
    stockStrut.name = 'stockrail';
    group.add(stockStrut);
  }
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.045, 0.012), matteMat);
  stockPad.position.set(0, 0.012, 0.15);
  group.add(stockPad);

  group.position.set(0.14, -0.19, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'mp5';
  Game.camera.add(group);
  return group;
}

// --- UMP: blockier polymer body, straight stick mag, .45 heft ---
function buildFPUMP() {
  const group = new THREE.Group();
  const polyMat   = new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.75, metalness: 0.1 });  // tan-ish dark polymer
  const polyMat2  = new THREE.MeshStandardMaterial({ color: 0x35332e, roughness: 0.78, metalness: 0.08 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.45, metalness: 0.5 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

  // v1.228 (D.31): held up to a UMP45 (drawn at about ×0.62). The barrel shroud is the receiver's front end (it stood
  // 5 mm off it); the stick mag rakes a little forward from a magwell, seated in the receiver (it tilted back, its top
  // 4.5 mm short); the grip meets the receiver; a trigger hangs inside a deeper guard (there was none).
  // Bulky polymer receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.05, 0.15), polyMat);
  receiver.position.set(0, 0.012, -0.05);
  receiver.name = 'receiver';
  group.add(receiver);
  // Top rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.13), steelMat);
  rail.position.set(0, 0.045, -0.05);
  group.add(rail);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.006, 0.004), polyMat2);
    tooth.position.set(0, 0.053, -0.10 + i * 0.025);
    group.add(tooth);
  }

  // Stubby barrel shroud + barrel + orange tip
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.066), polyMat2);
  shroud.position.set(0, 0.012, -0.157);
  shroud.name = 'shroud';
  group.add(shroud);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.205);
  group.add(barrel);
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.022, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.012, -0.245);
  group.add(orangeTip);

  // Straight stick magazine (.45 — fat, straight, slight forward angle)
  const magHolder = new THREE.Group();   // pivots at the receiver's underside
  magHolder.position.set(0, -0.011, -0.047);
  magHolder.rotation.x = 0.08;
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.034), polyMat2);
  mag.position.set(0, -0.045, 0);
  mag.name = 'mag';
  magHolder.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.038), steelMat);
  magBase.position.set(0, -0.094, 0);
  magHolder.add(magBase);
  group.add(magHolder);
  const magwell = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.016, 0.042), polyMat);
  magwell.position.set(0, -0.019, -0.048);
  magwell.name = 'magwell';
  group.add(magwell);

  // Charging handle (left side, pulls back)
  const chargeGroup = new THREE.Group();
  const cockKnob = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.016), steelMat);
  cockKnob.position.set(-0.026, 0.03, -0.02);
  chargeGroup.add(cockKnob);
  chargeGroup.position.set(0, 0, 0);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);

  // Grip + trigger guard
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.065, 0.03), polyMat);
  grip.position.set(0, -0.045, 0.018);
  grip.rotation.x = -0.2;
  grip.name = 'grip';
  group.add(grip);
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.004), polyMat);
  tgFront.position.set(0, -0.022, -0.025);
  group.add(tgFront);
  const tg = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.034), polyMat);
  tg.position.set(0, -0.0335, -0.009);
  group.add(tg);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.005), steelMat);
  trigger.position.set(0, -0.020, -0.010);
  trigger.rotation.x = 0.2;
  trigger.name = 'trigger';
  group.add(trigger);

  // Folding stock (UMP's side-folder, shown extended: two struts + pad)
  const strutTop = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.13), steelMat);   // v1.220: from the receiver
  strutTop.position.set(0, 0.03, 0.08);
  group.add(strutTop);
  const strutBot = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.13), steelMat);
  strutBot.position.set(0, -0.005, 0.08);
  group.add(strutBot);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.055, 0.012), polyMat2);
  stockPad.position.set(0, 0.012, 0.15);
  group.add(stockPad);

  group.position.set(0.135, -0.20, -0.31);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.03;
  group.userData.gunType = 'ump';
  Game.camera.add(group);
  return group;
}

// --- MAC-10: tiny boxy machine pistol, mag through the grip, very stubby ---
// v1.232 (D.31, held up to an M10 at about ×0.6): the receiver is a long flat-sided box, 0.16 long by 0.06 tall (was
// 0.10), so the grip and its mag sit a little behind the middle (was at the back); a trigger in front of the grip inside
// the M10's long guard, a strip forward from the grip and up to the receiver; a front post and rear ears on top with
// the cocking knob below the sight line; the collapsed wire stock's rods along the lower receiver and a butt plate.
function buildFPMAC10() {
  const group = new THREE.Group();
  const steelMat  = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5,  metalness: 0.5 });
  const matteMat  = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.7,  metalness: 0.25 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

  // Boxy upper (the whole gun is basically a steel box) — v1.232: z -0.115…0.045, y -0.02…0.04
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.16), steelMat);
  box.position.set(0, 0.01, -0.035);
  group.add(box);
  // Stamped panel lines on the side (the upper/lower seam and a pressing line)
  for (let i = 0; i < 2; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.004, 0.14), matteMat);
    line.position.set(0, 0.03 - i * 0.03, -0.035);
    group.add(line);
  }
  // v1.232: the ejection port on the right side, ahead of the knob's track
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.034), matteMat);
  port.position.set(0.0255, 0.018, -0.06);
  group.add(port);

  // Stubby barrel + orange tip (MAC-10 barrel is very short)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), matteMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.13);
  group.add(barrel);
  const orangeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 10), orangeMat);
  orangeTip.rotation.x = Math.PI / 2;
  orangeTip.position.set(0, 0.02, -0.165);
  group.add(orangeTip);

  // Magazine THROUGH the grip (the MAC-10's defining feature — long stick mag
  // protruding from the grip well in the middle).
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.03), matteMat);
  mag.position.set(0, -0.075, -0.02);
  group.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.034), steelMat);
  magBase.position.set(0, -0.135, -0.02);
  group.add(magBase);

  // The grip wraps the mag well
  const gripFront = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), steelMat);
  gripFront.position.set(0, -0.04, -0.038);
  group.add(gripFront);
  const gripBack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), steelMat);
  gripBack.position.set(0, -0.04, -0.002);
  group.add(gripBack);

  // Top cocking knob (MAC-10 charges from a knob on TOP of the box) — v1.232: low (top y 0.05), under the sight line
  const chargeGroup = new THREE.Group();
  const cockKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), steelMat);
  cockKnob.position.set(0, 0.045, -0.05);
  chargeGroup.add(cockKnob);
  chargeGroup.position.set(0, 0, 0);
  chargeGroup.userData.baseZ = 0;
  group.add(chargeGroup);

  // v1.232: the sights. A front post between two ears at the front of the top, a rear sight of two ears at the back;
  // every tip at y 0.056, the aimed eye height (adsPos.y −0.056). They hide when an optic is mounted.
  const fsPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.004), steelMat);
  fsPost.position.set(0, 0.048, -0.104);
  fsPost.userData.frontSight = true;
  fsPost.userData.ironSight = true;
  group.add(fsPost);
  for (const sx of [-1, 1]) {
    const fEar = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.008), steelMat);
    fEar.position.set(sx * 0.012, 0.046, -0.104);
    fEar.userData.ironSight = true;
    group.add(fEar);
    const rEar = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.01), steelMat);
    rEar.position.set(sx * 0.006, 0.048, 0.036);
    rEar.userData.ironSight = true;
    group.add(rEar);
  }

  // v1.232: a trigger in front of the grip, and the M10's long guard: a strip from the grip's front, forward under
  // the trigger, and up to the receiver 2 cm behind its front end
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.006), matteMat);
  trigger.position.set(0, -0.028, -0.054);
  trigger.rotation.x = 0.12;
  group.add(trigger);
  const tg = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.054), matteMat);
  tg.position.set(0, -0.046, -0.069);
  group.add(tg);
  const tgFront = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.031, 0.005), matteMat);
  tgFront.position.set(0, -0.034, -0.0935);   // top 1.5 mm into the receiver
  group.add(tgFront);

  // The collapsed wire stock: v1.232, two rods along the lower receiver's sides and the butt plate behind it (was one
  // block on the back)
  for (const sx of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.12), matteMat);
    rod.position.set(sx * 0.0275, -0.012, -0.01);
    group.add(rod);
  }
  const stockStub = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.006), matteMat);
  stockStub.position.set(0, -0.004, 0.053);
  group.add(stockStub);
  const plateLink = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.006), matteMat);   // joins the rods' ends to the plate
  plateLink.position.set(0, -0.012, 0.0475);
  group.add(plateLink);

  group.position.set(0.16, -0.18, -0.30);
  group.rotation.y = 0.12;
  group.rotation.x = -0.05;
  group.userData.cockingParts = [chargeGroup];
  group.userData.cockingOffset = 0.02;
  group.userData.gunType = 'mac10';
  Game.camera.add(group);
  return group;
}

// =====================================================================
// v1.168 (backlog D.14 A, Michael: D) — FP BACKYARD GUNS: Thunder Pump, Six-Shooter, Bucket Gun, Bolt Pistol.
// Toy-coloured plastic and cap-gun metal, each with the orange tip. Same frame as the others: barrel along -Z, the
// origin near the grip, cockingParts slide back along +Z. Each iron sight's tip height is its ADS Y (negated) in
// updateHeldMesh, so the tip sits on the reticle.
// =====================================================================
function _fpPart(group, geo, mat, x, y, z, rx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  group.add(m);
  return m;
}
function _fpTriggerGuard(group, mat, y, z) {
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.005, 0.05), mat, 0, y - 0.022, z + 0.01);
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.017, 0.005), mat, 0, y - 0.0135, z - 0.0125);   // v1.220: the front upright, down to the bar
  _fpPart(group, new THREE.BoxGeometry(0.012, 0.02, 0.006), mat, 0, y - 0.008, z);
}
const _fpOrangeMat = () => new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x331000, emissiveIntensity: 0.4 });

// Thunder Pump: a chunky green pump-up air shotgun, an air tank under the barrel, a pressure gauge, a flared muzzle.
function buildFPThunder() {
  const group = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x2f7a46, roughness: 0.6, metalness: 0.05 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.7 });
  const tank  = new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.4, metalness: 0.5 });
  const face  = new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.5 });
  const orange = _fpOrangeMat();
  _fpPart(group, new THREE.BoxGeometry(0.05, 0.065, 0.16), green, 0, 0.02, -0.05);                 // receiver
  const barrel = _fpPart(group, new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12), green, 0, 0.042, -0.23, Math.PI / 2);
  _fpPart(group, new THREE.CylinderGeometry(0.018, 0.025, 0.03, 12), green, 0, 0.042, -0.355, Math.PI / 2);   // flared muzzle (wide end forward)
  _fpPart(group, new THREE.CylinderGeometry(0.026, 0.026, 0.016, 12), orange, 0, 0.042, -0.376, Math.PI / 2); // orange tip
  _fpPart(group, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10), tank, 0, 0.008, -0.2, Math.PI / 2);       // air tank
  const gauge = _fpPart(group, new THREE.CylinderGeometry(0.012, 0.012, 0.006, 14), face, -0.028, 0.03, -0.06);
  gauge.rotation.z = Math.PI / 2;
  const needle = _fpPart(group, new THREE.BoxGeometry(0.002, 0.016, 0.002), dark, -0.032, 0.033, -0.06);
  needle.rotation.x = 0.7;
  _fpPart(group, new THREE.SphereGeometry(0.0055, 8, 6), orange, 0, 0.0635, -0.33).userData.frontSight = true;                  // front bead (tip y 0.069)
  _fpPart(group, new THREE.BoxGeometry(0.022, 0.01, 0.008), dark, 0, 0.0575, 0.02);                  // rear notch block (v1.233: seated on the receiver)
  // The pump handle slides back along the tank: the cocking part.
  const pump = new THREE.Group();
  _fpPart(pump, new THREE.BoxGeometry(0.046, 0.04, 0.09), dark, 0, 0.014, 0);
  for (let i = 0; i < 6; i++) _fpPart(pump, new THREE.BoxGeometry(0.048, 0.042, 0.003), green, 0, 0.014, 0.035 - i * 0.014);
  pump.position.set(0, 0, -0.22);
  pump.userData.baseZ = pump.position.z;
  group.add(pump);
  // v1.233 (D.31, held up to a toy pump-action air shotgun, built like the 870): the shotgun's v1.224 faults were here
  // too. The wrist hung under the receiver's back with the guard and trigger hidden behind it, and the butt pad stood
  // 3.9 cm above the stock's top line. Now a deep guard with the trigger showing, the wrist behind the receiver
  // running into the stock, and the pad on the stock's back face.
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.027, 0.005), dark, 0, -0.0245, -0.0625);             // guard: front upright
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.005, 0.05), dark, 0, -0.0355, -0.04);                // guard: bottom
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.027, 0.005), dark, 0, -0.0245, -0.0175);             // guard: rear upright
  _fpPart(group, new THREE.BoxGeometry(0.008, 0.02, 0.006), dark, 0, -0.021, -0.045, 0.15);          // trigger
  _fpPart(group, new THREE.BoxGeometry(0.036, 0.06, 0.08), green, 0, -0.022, 0.05, 0.18);             // wrist (was under the receiver at z 0.015)
  const stock = _fpPart(group, new THREE.BoxGeometry(0.04, 0.085, 0.14), green, 0, -0.005, 0.093, 0.18);   // stock (its comb meets the receiver's back)
  _fpPart(stock, new THREE.BoxGeometry(0.04, 0.085, 0.012), dark, 0, 0, 0.076);                       // butt pad, the stock's back face
  group.position.set(0.13, -0.21, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.05;
  group.userData.cockingParts = [pump];
  group.userData.cockingOffset = 0.08;
  group.userData.gunType = 'thunder';
  Game.camera.add(group);
  return group;
}

// Six-Shooter: a silver cap-gun revolver with a wooden bird's-head grip. Thumbing the hammer turns the cylinder.
function buildFPSixShooter() {
  const group = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, roughness: 0.3, metalness: 0.75 });
  const steel  = new THREE.MeshStandardMaterial({ color: 0x6d7178, roughness: 0.35, metalness: 0.7 });
  const dark   = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7 });
  const wood   = new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.75 });
  const orange = _fpOrangeMat();
  // v1.234 (D.31, held up to a Colt single-action with a bird's-head grip): the frame ran 3.8 cm past the cylinder's
  // back with the hammer and grip at its far end, and the grip was one straight slab with a flat cap. Now the frame
  // ends 1.2 cm behind the cylinder (the recoil shield), the hammer, notch, guard and grip come forward 1.5 cm with it,
  // and the grip curves: raked back at the top, turning down to a rounded butt.
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.05, 0.064), silver, 0, 0.02, -0.043);                 // frame (was 0.09 long)
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.01, 0.082), silver, 0, 0.048, -0.049);                // top strap
  // The cylinder, with six chambers on its face. It turns a sixth as the hammer comes back (userData.cockSpin).
  const cyl = new THREE.Group();
  _fpPart(cyl, new THREE.CylinderGeometry(0.021, 0.021, 0.044, 12), steel, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    _fpPart(cyl, new THREE.CylinderGeometry(0.0045, 0.0045, 0.002, 8), dark, Math.cos(a) * 0.012, 0.023, Math.sin(a) * 0.012);
  }
  cyl.rotation.x = Math.PI / 2;           // its axis along the barrel; rotation.y then turns it about that axis
  cyl.position.set(0, 0.024, -0.045);
  cyl.userData.cockSpin = Math.PI / 3;
  group.add(cyl);
  _fpPart(group, new THREE.CylinderGeometry(0.009, 0.009, 0.13, 10), silver, 0, 0.036, -0.135, Math.PI / 2);   // barrel
  _fpPart(group, new THREE.CylinderGeometry(0.0045, 0.0045, 0.1, 8), silver, 0, 0.022, -0.12, Math.PI / 2);   // ejector rod
  _fpPart(group, new THREE.CylinderGeometry(0.0105, 0.0105, 0.018, 10), orange, 0, 0.036, -0.207, Math.PI / 2); // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.012, 0.01), silver, 0, 0.05, -0.19).userData.frontSight = true;                 // front blade (tip y 0.056)
  _fpPart(group, new THREE.BoxGeometry(0.012, 0.004, 0.008), dark, 0, 0.054, -0.011);                // rear notch
  const hammer = _fpPart(group, new THREE.BoxGeometry(0.01, 0.022, 0.012), steel, 0, 0.04, -0.005, -0.45);   // spur under the sight line
  hammer.userData.baseZ = hammer.position.z;
  _fpTriggerGuard(group, silver, -0.002, -0.045);
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.06, 0.045), wood, 0, -0.0264, 0.0076, -0.38);    // bird's-head grip, upper (raked back)
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.036, 0.045), wood, 0, -0.0663, 0.0193, -0.05);         // bird's-head grip, lower (turning down)
  _fpPart(group, new THREE.CylinderGeometry(0.0225, 0.0225, 0.032, 14), wood, 0, -0.0843, 0.0197).rotation.z = Math.PI / 2;   // the rounded butt
  group.position.set(0.16, -0.18, -0.32);
  group.rotation.y = 0.12;
  group.rotation.x = -0.05;
  group.userData.cockingParts = [hammer, cyl];
  group.userData.cockingOffset = 0.016;
  group.userData.gunType = 'sixshooter';
  Game.camera.add(group);
  return group;
}

// Bucket Gun: a blue electric hopper gun. A see-through bucket of BBs rides on top under a carry-handle sight rail.
function buildFPBucket() {
  const group = new THREE.Group();
  const blue  = new THREE.MeshStandardMaterial({ color: 0x2a5fb0, roughness: 0.55, metalness: 0.05 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.7 });
  const clear = new THREE.MeshStandardMaterial({ color: 0xdbe8f0, roughness: 0.15, transparent: true, opacity: 0.45 });
  const bbs   = new THREE.MeshStandardMaterial({ color: 0xf2ecd2, roughness: 0.4 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c632, roughness: 0.5 });
  const orange = _fpOrangeMat();
  _fpPart(group, new THREE.BoxGeometry(0.06, 0.075, 0.26), blue, 0, 0.01, -0.1);                     // body
  _fpPart(group, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), dark, 0, 0.02, -0.29, Math.PI / 2);      // barrel
  _fpPart(group, new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), orange, 0, 0.02, -0.355, Math.PI / 2);   // orange tip
  _fpPart(group, new THREE.CylinderGeometry(0.046, 0.032, 0.06, 16), clear, 0, 0.075, -0.09);        // the bucket
  _fpPart(group, new THREE.CylinderGeometry(0.038, 0.031, 0.034, 16), bbs, 0, 0.062, -0.09);         // BBs in it
  _fpPart(group, new THREE.CylinderGeometry(0.048, 0.048, 0.006, 16), yellow, 0, 0.106, -0.09);      // lid
  _fpPart(group, new THREE.BoxGeometry(0.016, 0.08, 0.016), blue, 0, 0.0875, 0.02);                  // handle posts (v1.220: down on the body)
  _fpPart(group, new THREE.BoxGeometry(0.016, 0.08, 0.016), blue, 0, 0.0875, -0.21);
  _fpPart(group, new THREE.BoxGeometry(0.022, 0.016, 0.25), dark, 0, 0.127, -0.095);                 // carry-handle rail
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.014, 0.008), dark, 0, 0.142, -0.205).userData.frontSight = true;                // front blade (tip y 0.149)
  _fpPart(group, new THREE.BoxGeometry(0.014, 0.006, 0.008), dark, 0, 0.138, 0.012);                 // rear notch
  _fpPart(group, new THREE.BoxGeometry(0.04, 0.06, 0.09), yellow, 0, -0.005, 0.07);                  // battery pack stock
  // The power switch on the right flank slides back: the cocking part.
  const sw = _fpPart(group, new THREE.BoxGeometry(0.008, 0.014, 0.02), yellow, 0.033, 0.022, -0.04);
  sw.userData.baseZ = sw.position.z;
  // v1.235 (D.31): the trigger and guard were pushed into the grip's front (the trigger 0.6 cm into it, the guard's bar
  // 3.8 cm); now 3 cm forward, a finger's room ahead of the grip, the bar's back end meeting it.
  _fpTriggerGuard(group, dark, -0.028, -0.06);
  _fpPart(group, new THREE.BoxGeometry(0.038, 0.11, 0.05), dark, 0, -0.085, 0.0, -0.2);              // grip
  group.position.set(0.14, -0.21, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [sw];
  group.userData.cockingOffset = 0.02;
  group.userData.gunType = 'bucket';
  Game.camera.add(group);
  return group;
}

// v1.250 (backlog D.37, Michael: B): the cheap clear-plastic automatics, see-through white with the gearbox showing,
// each bad in its own way. They share the Bucket Gun's grip, guard and hand (so the hands sit as they do there).
function _clearGunMats() {
  return {
    clear: new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.18, transparent: true, opacity: 0.55, metalness: 0.0 }),
    milky: new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.35, transparent: true, opacity: 0.8 }),
    guts:  new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.3 }),
    dark:  new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.7 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c632, roughness: 0.5 }),
    orange: _fpOrangeMat(),
  };
}
function _clearGunFinish(group, M, gunType, cock) {
  _fpTriggerGuard(group, M.milky, -0.028, -0.06);
  _fpPart(group, new THREE.BoxGeometry(0.038, 0.11, 0.05), M.milky, 0, -0.085, 0.0, -0.2);   // grip (the Bucket Gun's)
  group.position.set(0.14, -0.21, -0.30);
  group.rotation.y = 0.10;
  group.rotation.x = -0.04;
  group.userData.cockingParts = [cock];
  cock.userData.baseZ = cock.position.z;
  group.userData.cockingOffset = 0.02;
  group.userData.gunType = gunType;
  Game.camera.add(group);
  return group;
}
// Clear Sprayer: a little battery SMG, a stick mag, a battery-pack stock. Every BB curves hard.
function buildFPSprayer() {
  const group = new THREE.Group(), M = _clearGunMats();
  _fpPart(group, new THREE.BoxGeometry(0.06, 0.075, 0.20), M.clear, 0, 0.01, -0.07);                  // body
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.04, 0.12), M.guts, 0, 0.01, -0.07);                     // the gearbox inside
  _fpPart(group, new THREE.CylinderGeometry(0.011, 0.011, 0.08, 10), M.clear, 0, 0.02, -0.21, Math.PI / 2);   // barrel
  _fpPart(group, new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), M.orange, 0, 0.02, -0.26, Math.PI / 2);  // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.10, 0.035), M.milky, 0, -0.075, -0.13);                // stick mag
  _fpPart(group, new THREE.BoxGeometry(0.04, 0.05, 0.07), M.clear, 0, 0.0, 0.065);                     // battery-pack stock
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.03, 0.05), M.yellow, 0, 0.0, 0.065);                    // the battery in it
  _fpPart(group, new THREE.BoxGeometry(0.02, 0.012, 0.16), M.milky, 0, 0.0535, -0.07);                 // top rail
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.014, 0.008), M.dark, 0, 0.0665, -0.14).userData.frontSight = true;   // front blade (tip y 0.0735)
  _fpPart(group, new THREE.BoxGeometry(0.014, 0.006, 0.008), M.dark, 0, 0.0625, 0.0);                  // rear notch
  const sw = _fpPart(group, new THREE.BoxGeometry(0.008, 0.014, 0.02), M.yellow, 0.033, 0.022, -0.04); // power switch
  return _clearGunFinish(group, M, 'sprayer', sw);
}
// Ghost Mini: a clear micro-uzi, the mag in the grip, a folded wire stock. Steady, but it jams.
function buildFPGhost() {
  const group = new THREE.Group(), M = _clearGunMats();
  _fpPart(group, new THREE.BoxGeometry(0.055, 0.075, 0.17), M.clear, 0, 0.01, -0.04);                 // receiver
  _fpPart(group, new THREE.BoxGeometry(0.028, 0.04, 0.11), M.guts, 0, 0.01, -0.04);                    // the gearbox inside
  _fpPart(group, new THREE.CylinderGeometry(0.010, 0.010, 0.05, 10), M.clear, 0, 0.02, -0.15, Math.PI / 2);   // barrel stub
  _fpPart(group, new THREE.CylinderGeometry(0.013, 0.013, 0.02, 10), M.orange, 0, 0.02, -0.185, Math.PI / 2); // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.025, 0.10, 0.03), M.guts, 0, -0.085, 0.0, -0.2);              // the mag, seen through the grip
  const knob = _fpPart(group, new THREE.BoxGeometry(0.012, 0.012, 0.02), M.dark, 0, 0.0535, -0.02);   // cocking knob on top
  _fpPart(group, new THREE.BoxGeometry(0.006, 0.012, 0.006), M.dark, 0, 0.0535, -0.11).userData.frontSight = true;   // front post (tip y 0.0595)
  _fpPart(group, new THREE.BoxGeometry(0.02, 0.008, 0.008), M.dark, 0, 0.0515, 0.03);                  // rear ears
  _fpPart(group, new THREE.BoxGeometry(0.012, 0.012, 0.08), M.milky, 0.022, -0.01, 0.085);             // folded wire stock
  _fpPart(group, new THREE.BoxGeometry(0.012, 0.012, 0.08), M.milky, -0.022, -0.01, 0.085);
  return _clearGunFinish(group, M, 'ghost', knob);
}
// Tick-Tock: a clear rifle wound like a clock, a long barrel, a stock. Accurate up close, two BBs a second.
function buildFPTickTock() {
  const group = new THREE.Group(), M = _clearGunMats();
  _fpPart(group, new THREE.BoxGeometry(0.055, 0.075, 0.30), M.clear, 0, 0.01, -0.10);                 // receiver
  _fpPart(group, new THREE.BoxGeometry(0.028, 0.04, 0.2), M.guts, 0, 0.01, -0.10);                     // the clockwork inside
  _fpPart(group, new THREE.CylinderGeometry(0.011, 0.011, 0.20, 10), M.clear, 0, 0.02, -0.35, Math.PI / 2);   // barrel
  _fpPart(group, new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), M.orange, 0, 0.02, -0.46, Math.PI / 2);  // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.05, 0.05, 0.14), M.milky, 0, 0.01, -0.32);                    // handguard
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.09, 0.04), M.milky, 0, -0.07, -0.12);                   // mag
  _fpPart(group, new THREE.BoxGeometry(0.04, 0.07, 0.18), M.clear, 0, -0.005, 0.14);                   // stock
  _fpPart(group, new THREE.BoxGeometry(0.045, 0.08, 0.012), M.dark, 0, -0.005, 0.236);                 // butt pad
  _fpPart(group, new THREE.BoxGeometry(0.02, 0.012, 0.24), M.milky, 0, 0.0535, -0.10);                 // top rail
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.016, 0.008), M.dark, 0, 0.0675, -0.21).userData.frontSight = true;  // front blade (tip y 0.0755)
  _fpPart(group, new THREE.BoxGeometry(0.014, 0.006, 0.008), M.dark, 0, 0.0625, 0.0);                  // rear notch
  const key = _fpPart(group, new THREE.BoxGeometry(0.008, 0.02, 0.02), M.yellow, 0.031, 0.02, -0.02);  // the winding key
  return _clearGunFinish(group, M, 'ticktock', key);
}
// Rattle Can: the first-week-of-summer joke gun, a clear box with a battery taped under its nose. All three faults.
function buildFPRattle() {
  const group = new THREE.Group(), M = _clearGunMats();
  _fpPart(group, new THREE.BoxGeometry(0.06, 0.075, 0.16), M.clear, 0, 0.01, -0.05);                  // body
  _fpPart(group, new THREE.BoxGeometry(0.03, 0.04, 0.1), M.guts, 0, 0.01, -0.05);                      // the motor inside
  _fpPart(group, new THREE.CylinderGeometry(0.010, 0.010, 0.06, 10), M.clear, 0, 0.02, -0.16, Math.PI / 2);   // barrel
  _fpPart(group, new THREE.CylinderGeometry(0.013, 0.013, 0.02, 10), M.orange, 0, 0.02, -0.20, Math.PI / 2);  // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.05, 0.04, 0.06), M.yellow, 0, -0.0475, -0.10);                // a battery under the nose
  _fpPart(group, new THREE.BoxGeometry(0.062, 0.046, 0.012), M.dark, 0, -0.045, -0.10);                // the tape round it
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.012, 0.006), M.dark, 0, 0.0535, -0.11).userData.frontSight = true;   // front post (tip y 0.0595)
  _fpPart(group, new THREE.BoxGeometry(0.014, 0.008, 0.008), M.dark, 0, 0.0515, 0.02);                 // rear notch
  _fpPart(group, new THREE.BoxGeometry(0.01, 0.03, 0.03), M.milky, 0, -0.01, 0.045);                   // lanyard loop
  const sw = _fpPart(group, new THREE.BoxGeometry(0.008, 0.014, 0.02), M.yellow, 0.033, 0.022, -0.04); // switch
  return _clearGunFinish(group, M, 'rattle', sw);
}

// Bolt Pistol: a long-barrel target pistol with a little bolt knob on the right and a wooden grip.
function buildFPBoltPistol() {
  const group = new THREE.Group();
  const gun  = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.45, metalness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.7 });
  const orange = _fpOrangeMat();
  _fpPart(group, new THREE.BoxGeometry(0.032, 0.045, 0.12), gun, 0, 0.01, -0.03);                    // frame
  _fpPart(group, new THREE.CylinderGeometry(0.014, 0.014, 0.12, 12), gun, 0, 0.045, -0.03, Math.PI / 2);      // receiver tube
  _fpPart(group, new THREE.CylinderGeometry(0.009, 0.009, 0.26, 10), gun, 0, 0.045, -0.22, Math.PI / 2);      // long barrel
  _fpPart(group, new THREE.CylinderGeometry(0.011, 0.011, 0.02, 10), orange, 0, 0.045, -0.36, Math.PI / 2);   // orange tip
  _fpPart(group, new THREE.BoxGeometry(0.004, 0.012, 0.01), dark, 0, 0.06, -0.33).userData.frontSight = true;                   // front blade (tip y 0.066)
  _fpPart(group, new THREE.BoxGeometry(0.014, 0.008, 0.008), dark, 0, 0.062, 0.02);                  // rear notch
  // The bolt: a rod and a ball knob out to the right, pulled back to re-cock.
  const rod  = _fpPart(group, new THREE.BoxGeometry(0.03, 0.006, 0.006), dark, 0.025, 0.048, 0.0);
  const knob = _fpPart(group, new THREE.SphereGeometry(0.007, 10, 8), dark, 0.042, 0.048, 0.0);
  rod.userData.baseZ = rod.position.z;
  knob.userData.baseZ = knob.position.z;
  // v1.236 (D.31): the trigger and guard 1.5 cm forward with a finger's room before the grip (the guard's bar ran 2.2 cm
  // into it), and 4.5 mm up so the guard's front upright meets the frame; the grip 4 mm up so its top front corner
  // meets the frame without a wedge of light.
  _fpTriggerGuard(group, gun, -0.0075, -0.055);
  _fpPart(group, new THREE.BoxGeometry(0.036, 0.11, 0.05), wood, 0, -0.061, 0.005, -0.2);            // grip
  group.position.set(0.16, -0.18, -0.32);
  group.rotation.y = 0.12;
  group.rotation.x = -0.05;
  group.userData.cockingParts = [rod, knob];
  group.userData.cockingOffset = 0.04;
  group.userData.gunType = 'boltpistol';
  Game.camera.add(group);
  return group;
}

// === FP GUN REGISTRY ===
// Map of gun type → built FP mesh. Lazily filled the first time each gun is equipped.
const fpGuns = {};
function getOrBuildFPGun(gunType) {
  if (fpGuns[gunType]) return fpGuns[gunType];
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
  else mesh = buildFPGun();   // fallback
  attachFpHands(mesh, gunType);   // v1.219 (D.30): your hands on it
  mesh.visible = false;
  fpGuns[gunType] = mesh;
  return mesh;
}
function getActiveFpGun() {
  return fpGuns[Game.gun.type] || fpGuns.pistol;
}

// =====================================================================
// v1.219 (backlog D.30, Michael 13 Oct: "Can we have the player's hand(s) shown holding their weapons in First Person
// View? Same for the Speed Loader"). Your hands on whatever you hold, in your own skin colour, the forearms running
// back out of the bottom of the screen; a hoodie's sleeves come down to a cuff at the wrist. Each hand is a child of
// the thing it holds (a pump hand rides the pump), so bob, kick, ADS and cocking carry it. Three shapes, in the frame
// of what they hold: a GRIP hand round an upright grip (local Y up the grip, -Z forward), a SUPPORT hand under a
// handguard running along Z, and a CUP hand, the off hand wrapped round the shooting hand on a pistol.
// FP_HANDS: per gun, `r` the shooting hand (centre of the grip, its rake rx, half width/depth, and `up`, how far up
// the grip from its centre the hand's middle sits) and `l` the off hand ('cup', or a support/grip spec; `on: 'pump'`
// rides the gun's cocking part). Long guns with an under-barrel slot move the off hand onto a PVC foregrip or a taped
// mag when one is mounted (`underHand`).
// =====================================================================
const FP_HANDS = {
  pistol:  { r: { c: [0, -0.0507, 0.0122], rx: -0.32, gw: 0.019, gd: 0.026, up: 0.012 },  l: 'cup' },   // v1.221: the grip's new place
  shotgun: { r: { c: [0, -0.025, 0.047], rx: -0.55, gw: 0.017, gd: 0.022, up: -0.01 }, l: { kind: 'support', on: 'pump', c: [0, 0.025, 0], hw: 0.020, hh: 0.022 } },
  ar:      { r: { c: [0, -0.055, 0.010], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.01 }, l: { kind: 'grip', c: [0, -0.005, -0.21], rx: 0, gw: 0.014, gd: 0.013, up: -0.005 } },
  sniper:  { r: { c: [0, -0.040, 0.037], rx: -0.44, gw: 0.019, gd: 0.013, up: -0.004 },   // v1.225: the 700's pistol grip, behind the guard
            l: { kind: 'support', c: [0, 0.005, -0.215], hw: 0.019, hh: 0.020 }, underHand: true },
  l96:     { r: { c: [0, -0.040, 0.037], rx: -0.44, gw: 0.019, gd: 0.013, up: -0.004 },   // v1.336: the sniper's stock, so its hands
            l: { kind: 'support', c: [0, 0.005, -0.215], hw: 0.019, hh: 0.020 }, underHand: true },
  svd:     { r: { c: [0, -0.040, 0.037], rx: -0.44, gw: 0.019, gd: 0.013, up: -0.004 },   // v1.395: the sniper's stock, so its hands
            l: { kind: 'support', c: [0, 0.005, -0.215], hw: 0.019, hh: 0.020 }, underHand: true },
  ak47:    { r: { c: [0, -0.050, 0.020], rx: -0.25, gw: 0.016, gd: 0.015, up: -0.01 }, l: { kind: 'support', c: [0, 0.010, -0.18], hw: 0.020, hh: 0.020 }, underHand: true },
  rpk:     { r: { c: [0, -0.050, 0.020], rx: -0.25, gw: 0.016, gd: 0.015, up: -0.01 }, l: { kind: 'support', c: [0, 0.010, -0.18], hw: 0.020, hh: 0.020 }, underHand: true },   // v1.396: the AK's
  mp5:     { r: { c: [0, -0.041, 0.012], rx: -0.22, gw: 0.015, gd: 0.014, up: -0.012 }, l: { kind: 'support', c: [0, 0.008, -0.165], hw: 0.018, hh: 0.018 }, underHand: true },
  ump:     { r: { c: [0, -0.045, 0.018], rx: -0.20, gw: 0.016, gd: 0.015, up: -0.012 }, l: { kind: 'support', c: [0, 0.012, -0.16], hw: 0.017, hh: 0.017 }, underHand: true },
  p90:     { r: { c: [0, -0.066, -0.02], rx: -0.15, gw: 0.015, gd: 0.014, up: -0.012 }, l: { kind: 'grip', c: [0, -0.066, -0.15], rx: 0, gw: 0.014, gd: 0.0125, up: -0.005 } },   // v1.346: the grip and the front stop
  vector:  { r: { c: [0, -0.09, 0.06], rx: -0.2, gw: 0.015, gd: 0.014, up: -0.012 }, l: { kind: 'grip', c: [0, -0.045, -0.20], rx: 0, gw: 0.013, gd: 0.013, up: -0.005 } },   // v1.348: the grip and its front grip
  g36:     { r: { c: [0, -0.068, 0.035], rx: -0.25, gw: 0.015, gd: 0.015, up: -0.01 }, l: { kind: 'support', c: [0, -0.012, -0.23], hw: 0.020, hh: 0.022 }, underHand: true },   // v1.371: the grip and the handguard
  aug:     { r: { c: [0, -0.078, -0.03], rx: -0.2, gw: 0.015, gd: 0.015, up: -0.012 }, l: { kind: 'grip', c: [0, -0.052, -0.19], rx: 0, gw: 0.013, gd: 0.013, up: -0.005 } },   // v1.372: the grip and the folding foregrip
  m4:      { r: { c: [0, -0.066, 0.035], rx: -0.25, gw: 0.015, gd: 0.015, up: -0.01 }, l: { kind: 'support', c: [0, -0.007, -0.21], hw: 0.020, hh: 0.025 }, underHand: true },   // v1.373: the grip and the handguard
  mac10:   { r: { c: [0, -0.040, -0.02], rx: 0,     gw: 0.015, gd: 0.022, up: -0.012 }, l: 'cup' },
  spas:    { r: { c: [0, -0.040, 0.012], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.005 }, l: { kind: 'support', on: 'pump', c: [0, 0.025, 0], hw: 0.020, hh: 0.022 } },   // v1.398: the Semi-Auto Shotgun's pistol grip, the shotgun's pump
  thunder: { r: { c: [0, -0.022, 0.057], rx: -0.55, gw: 0.018, gd: 0.024, up: -0.01 }, l: { kind: 'support', on: 'pump', c: [0, 0.014, 0], hw: 0.023, hh: 0.020 } },
  sixshooter: { r: { c: [0, -0.045, 0.015], rx: -0.38, gw: 0.016, gd: 0.0225, up: 0.005 }, l: 'cup' },
  bucket:  { r: { c: [0, -0.085, 0.000], rx: -0.20, gw: 0.019, gd: 0.025, up: 0.01 },  l: { kind: 'support', c: [0, 0.010, -0.19], hw: 0.030, hh: 0.0375 } },
  boltpistol: { r: { c: [0, -0.061, 0.005], rx: -0.20, gw: 0.018, gd: 0.025, up: 0.01 }, l: 'cup' },   // v1.236: the grip 4 mm up
  // v1.250: the clear automatics have the Bucket Gun's grip; the rifle's off hand under its handguard
  sprayer: { r: { c: [0, -0.085, 0.000], rx: -0.20, gw: 0.019, gd: 0.025, up: 0.01 }, l: 'cup' },
  ghost:   { r: { c: [0, -0.085, 0.000], rx: -0.20, gw: 0.019, gd: 0.025, up: 0.01 }, l: 'cup' },
  rattle:  { r: { c: [0, -0.085, 0.000], rx: -0.20, gw: 0.019, gd: 0.025, up: 0.01 }, l: 'cup' },
  ticktock: { r: { c: [0, -0.085, 0.000], rx: -0.20, gw: 0.019, gd: 0.025, up: 0.01 }, l: { kind: 'support', c: [0, 0.010, -0.31], hw: 0.025, hh: 0.025 } },
  famas:   { r: { c: [0, -0.055, 0.010], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.01 }, l: { kind: 'support', c: [0, 0.004, -0.150], hw: 0.022, hh: 0.024 }, underHand: true },   // v1.325: the AR's grip, the handguard
  epistol: { r: { c: [0, -0.0507, 0.0122], rx: -0.32, gw: 0.019, gd: 0.026, up: 0.012 },  l: 'cup' },   // v1.326: the pistol's
  thompson: { r: { c: [0, -0.064, 0.055], rx: -0.25, gw: 0.014, gd: 0.017, up: -0.012 }, l: { kind: 'grip', c: [0, -0.050, -0.180], rx: 0, gw: 0.013, gd: 0.015, up: -0.005 } },   // v1.403: the wooden grip and front grip
  gaspistol: { r: { c: [0, -0.0507, 0.0122], rx: -0.32, gw: 0.022, gd: 0.026, up: 0.012 },  l: 'cup' },   // v1.399: the pistol's, over the wooden panels
  erifle:  { r: { c: [0, -0.055, 0.010], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.01 }, l: { kind: 'grip', c: [0, -0.005, -0.21], rx: 0, gw: 0.014, gd: 0.013, up: -0.005 } },   // v1.326: the AR's
  burst:   { r: { c: [0, -0.055, 0.010], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.01 }, l: { kind: 'support', c: [0, 0.038, -0.19], hw: 0.0275, hh: 0.0275 }, underHand: true },   // v1.327: the round handguard
  semishotgun: { r: { c: [0, -0.040, 0.012], rx: -0.35, gw: 0.017, gd: 0.017, up: -0.005 }, l: { kind: 'support', c: [0, 0.025, -0.22], hw: 0.020, hh: 0.022 }, underHand: true },   // v1.328: the pistol grip, the fixed forend
  m249:    { r: { c: [0, -0.050, 0.030], rx: -0.25, gw: 0.016, gd: 0.015, up: -0.01 }, l: { kind: 'support', c: [0, 0.000, -0.21], hw: 0.025, hh: 0.018 }, underHand: true },   // v1.335: the AK's grip, the handguard ahead of the box
};
// Where the elbows are, in camera space (below and behind the view, so the forearms leave by the bottom of the screen).
const FP_ELBOW_R = [0.26, -0.56, -0.02], FP_ELBOW_L = [-0.36, -0.5, -0.06], FP_ELBOW_L_CUP = [-0.10, -0.56, -0.02];
const FP_HAND_MATS = { skin: null, sleeve: null, key: '' };
const _fpForearms = [];   // every forearm built: { arm, cuff }, re-dressed when the look changes
function fpHandMats() {
  if (!FP_HAND_MATS.skin) {
    FP_HAND_MATS.skin = new THREE.MeshStandardMaterial({ color: 0xe0b090, roughness: 0.75 });
    FP_HAND_MATS.sleeve = new THREE.MeshStandardMaterial({ color: 0x7c7d84, roughness: 0.9 });
  }
  return FP_HAND_MATS;
}
// Skin and sleeve follow the mirror (look.skinColor; a hoodie's colour when one is worn). Cheap enough each frame:
// it only does work when the look has changed.
function syncFpHandLook() {
  const look = (Game.persist && Game.persist.look) || {};
  const top = (typeof KID_TOPS !== 'undefined' && look.top && KID_TOPS[look.top]) || null;
  const hoodie = !!(top && top.kind === 'hoodie');
  const key = (look.skinColor || 0) + '|' + (hoodie ? top.color : 'bare');
  if (FP_HAND_MATS.key === key) return;
  const M = fpHandMats();
  FP_HAND_MATS.key = key;
  M.skin.color.setHex(look.skinColor != null ? look.skinColor : 0xe0b090);
  if (hoodie) M.sleeve.color.setHex(top.color);
  for (const f of _fpForearms) f.arm.material = hoodie ? M.sleeve : M.skin;
}
function _fpHandBox(g, w, h, d, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fpHandMats().skin);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.userData.fpHand = true;
  g.add(m);
  return m;
}
// A hand round an upright grip. s = +1 the right hand (back of the hand on the grip's right, fingertips and thumb on
// its left), -1 the left. Spans about 0.04 below to 0.045 above its origin.
function buildFpGripHand(gw, gd, s) {
  const g = new THREE.Group();
  _fpHandBox(g, 0.024, 0.078, 0.07, s * (gw + 0.012), -0.004, 0.006);              // back of the hand
  _fpHandBox(g, 2 * gw + 0.02, 0.07, 0.02, s * 0.006, -0.008, gd + 0.01);          // heel of the hand on the back strap
  for (let i = 0; i < 3; i++) {
    _fpHandBox(g, 2 * gw + 0.026, 0.0175, 0.019, -s * 0.002, 0.012 - i * 0.021, -gd - 0.0095);   // fingers round the front
    _fpHandBox(g, 0.012, 0.0175, 0.024, -s * (gw + 0.006), 0.012 - i * 0.021, -gd + 0.008);      // their tips
  }
  _fpHandBox(g, 0.015, 0.016, 0.034, s * gw * 0.3, 0.034, -gd - 0.022);           // the trigger finger
  _fpHandBox(g, 0.016, 0.018, 0.05, -s * (gw + 0.008), 0.04, -0.004, s * 0.12);    // the thumb
  g.userData.wrist = [s * 0.012, -0.012, gd + 0.024];
  return g;
}
// The off hand under a handguard (along Z, half width hw, half height hh): the palm under it, the heel and thumb up
// its left side, four fingers up its right.
function buildFpSupportHand(hw, hh) {
  const g = new THREE.Group();
  _fpHandBox(g, 2 * hw + 0.016, 0.02, 0.08, 0, -hh - 0.01, 0);                       // palm
  _fpHandBox(g, 0.016, hh * 1.4, 0.075, -(hw + 0.008), -hh * 0.35, 0.004);           // heel of the hand
  _fpHandBox(g, 0.015, 0.016, 0.05, -(hw + 0.006), hh * 0.55, -0.02);                // thumb
  for (let i = 0; i < 4; i++) _fpHandBox(g, 0.014, 2 * hh + 0.004, 0.0165, hw + 0.007, -0.002, -0.03 + i * 0.0195);   // fingers
  g.userData.wrist = [-0.006, -hh - 0.014, 0.03];
  return g;
}
// The off hand cupped round the shooting hand on a pistol grip (same frame as the grip hand).
function buildFpCupHand(gw, gd) {
  const g = new THREE.Group();
  _fpHandBox(g, 0.022, 0.075, 0.075, -(gw + 0.026), -0.01, -0.004);                 // palm on the grip's left
  for (let i = 0; i < 3; i++) _fpHandBox(g, 2 * gw + 0.05, 0.017, 0.019, -0.008, 0.008 - i * 0.02, -gd - 0.029);   // fingers over the other hand's
  _fpHandBox(g, 0.016, 0.017, 0.05, -(gw + 0.02), 0.024, -0.012, -0.1);             // thumb under the other thumb
  g.userData.wrist = [-(gw + 0.03), -0.025, 0.022];
  return g;
}
// The forearm from a hand's wrist to an elbow given in camera space, both as children of `parent` (whose pose at
// build time, and its parents' up to `root`, convert the elbow). Narrow at the wrist; a cuff there for a hoodie.
function addFpForearm(parent, root, hand, elbowCam) {
  const M = new THREE.Matrix4();
  for (let o = parent; o; o = o.parent) { o.updateMatrix(); M.premultiply(o.matrix); if (o === root) break; }
  const elbow = new THREE.Vector3().fromArray(elbowCam).applyMatrix4(M.clone().invert());
  hand.updateMatrix();
  const wrist = new THREE.Vector3().fromArray(hand.userData.wrist).applyMatrix4(hand.matrix);
  const dir = new THREE.Vector3().subVectors(elbow, wrist);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);   // -Y runs wrist to elbow
  const M2 = fpHandMats();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.034, len, 8), M2.skin);
  arm.quaternion.copy(q);
  arm.position.copy(wrist).addScaledVector(dir, len / 2);
  arm.userData.fpHand = true;
  parent.add(arm);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), M2.sleeve);
  cuff.quaternion.copy(q);
  cuff.position.copy(wrist).addScaledVector(dir, 0.03);
  cuff.userData.fpHand = true;
  cuff.visible = false;
  parent.add(cuff);
  const f = { arm, cuff };
  _fpForearms.push(f);
  return f;
}
function _fpPlaceGripHand(parent, root, spec, s, elbow) {
  const h = buildFpGripHand(spec.gw, spec.gd, s);
  const ax = new THREE.Vector3(0, Math.cos(spec.rx), Math.sin(spec.rx));      // up the grip
  h.position.set(spec.c[0], spec.c[1], spec.c[2]).addScaledVector(ax, spec.up || 0);
  h.rotation.x = spec.rx;
  parent.add(h);
  const f = addFpForearm(parent, root, h, elbow);
  return [h, f.arm, f.cuff];
}
// Put both hands on an FP gun group, built in its hip pose. Tags: userData.fpHands = { r, l, under } (arrays of the
// meshes/groups of each hand, its forearm and cuff) for updateHeldMesh and the tests.
function attachFpHands(group, gunType) {
  const spec = FP_HANDS[gunType];
  if (!spec || group.userData.fpHands) return;
  const out = { r: [], l: [], under: null };
  out.r = _fpPlaceGripHand(group, group, spec.r, 1, FP_ELBOW_R);
  if (spec.l === 'cup') {
    const h = buildFpCupHand(spec.r.gw, spec.r.gd);
    const ax = new THREE.Vector3(0, Math.cos(spec.r.rx), Math.sin(spec.r.rx));
    h.position.set(spec.r.c[0], spec.r.c[1], spec.r.c[2]).addScaledVector(ax, spec.r.up || 0);
    h.rotation.x = spec.r.rx;
    group.add(h);
    const f = addFpForearm(group, group, h, FP_ELBOW_L_CUP);
    out.l = [h, f.arm, f.cuff];
  } else if (spec.l.kind === 'grip') {
    out.l = _fpPlaceGripHand(group, group, spec.l, -1, FP_ELBOW_L);
  } else {
    const parent = spec.l.on === 'pump' ? (group.userData.cockingParts || [])[0] || group : group;
    const h = buildFpSupportHand(spec.l.hw, spec.l.hh);
    h.position.set(spec.l.c[0], spec.l.c[1], spec.l.c[2]);
    parent.add(h);
    const f = addFpForearm(parent, group, h, FP_ELBOW_L);
    out.l = [h, f.arm, f.cuff];
  }
  if (spec.underHand && FP_GUN_MOUNT[gunType]) {
    // The off hand on a PVC foregrip or a taped mag, which hang under the handguard at the rail's middle.
    const mount = FP_GUN_MOUNT[gunType];
    const bottom = measureGunForUnder(group, mount).bottom;
    out.under = _fpPlaceGripHand(group, group, { c: [0, bottom - 0.04, mount.railZ], rx: 0, gw: 0.012, gd: 0.016, up: 0.008 }, -1, FP_ELBOW_L);
    for (const o of out.under) o.visible = false;
  }
  group.userData.fpHands = out;
  syncFpHandLook();
}
// Which off hand shows: on a long gun with a PVC foregrip or a taped mag mounted, the one on that part.
function updateFpHands(group, gunType) {
  syncFpHandLook();
  const H = group && group.userData.fpHands;
  if (!H) return;
  if (H.under) {
    const under = getMountedAccessories(gunType).find(a => a.slot === 'under');
    const onPart = !!under && (under.type === 'foregrip' || under.type === 'taped_mag');
    for (const o of H.l) o.visible = !onPart;
    for (const o of H.under) o.visible = onPart;
  }
  const hoodie = FP_HAND_MATS.key.indexOf('bare') < 0;   // a cuff only with a hoodie, only on a hand that shows
  for (const hand of [H.r, H.l, H.under]) if (hand && hand.length) hand[2].visible = hoodie && hand[0].visible;
}
// The speed loader and the spare mag are held in the right hand: round the loader's tube (along its Z), or round
// the mag's body.
function attachFpItemHand(group, kind) {
  let h;
  if (kind === 'loader') {
    h = buildFpSupportHand(0.025, 0.025);
    h.position.set(0, 0, 0.025);
  } else {
    h = buildFpGripHand(0.02, 0.025, 1);
    h.position.set(0, -0.025, 0);
  }
  group.add(h);
  const f = addFpForearm(group, group, h, FP_ELBOW_R);
  group.userData.fpHands = { r: [h, f.arm, f.cuff], l: [], under: null };
  syncFpHandLook();
}
