


// ---------------------------------------------------------------------
// ENEMY FACTORY — turn a CHARACTERS entry + scenario context into a live enemy
// ---------------------------------------------------------------------
// `armorMult` (from the scenario) multiplies the character's HP — supports
// "Nick wearing a hoodie" / "armor scenario" use cases without touching CHARACTERS.
// v1.170 (D.15): a VIP's ball cap, blue for your side and red for theirs, parented to the head so it follows the crouch
// and the aim tilt like the face does. The crown sits over the hair; the brim points forward (+z is the face).
function addVipCap(kid, ours) {
  if (!kid || !kid.head) return null;
  const mat = new THREE.MeshStandardMaterial({ color: ours ? 0x3d7bd6 : 0xd6453d, roughness: 0.7 });
  const cap = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  crown.scale.set(1, 0.62, 1.04); crown.position.set(0, 0.115, -0.005); cap.add(crown);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.13), mat);
  brim.position.set(0, 0.12, 0.2); brim.rotation.x = 0.12; cap.add(brim);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat);
  button.position.set(0, 0.22, -0.005); cap.add(button);
  cap.userData.vipCap = ours ? 'blue' : 'red';
  kid.head.add(cap);
  kid.vipCap = cap;
  return cap;
}

function makeEnemyFromCharacter(charId, { pos, homeCover, scene, armorMult = 1, weapon = 'pistol', role = 'skirmisher', anchorPos = null, behavior = 'gunner', zombieSprinter = false, team = 'enemy', statsOverride = null, noFire = false, crewColor = null }) {
  const baseCh = CHARACTERS[charId];
  if (!baseCh) {
    console.warn(`makeEnemyFromCharacter: unknown character "${charId}"`);
    return null;
  }
  // v1.57: a scenario can override per-enemy stats (e.g. tutorial practice dummies
  // with near-zero aggression/fireRate). Clone the profile first so we never mutate
  // the shared CHARACTERS entry used by every other scenario.
  const ch = statsOverride ? Object.assign({}, baseCh, statsOverride) : baseCh;
  // v1.200: an ally of yours wears your crew's bandana (a copy of the profile, so CHARACTERS is never changed)
  const kid = createKid(crewColor != null ? Object.assign({}, ch, { crewColor }) : ch, weapon);
  const costume = kidCostumeFor(charId);   // v1.351 (D.70 step 2): Halloween costumes, every match kid
  if (costume) addKidCostume(kid, costume, ch);
  kid.group.position.copy(pos);
  scene.add(kid.group);

  return {
    charId,
    character: ch,
    name: ch.name,
    // v1.41: each NPC fires an assigned BB color (stable per charId). Stored on
    // the enemy so makeBB reads it directly. "Same kid → same color" holds across
    // scenarios, which makes littered rounds legible ("that pile was Trey").
    bbColorHex: npcBBColorHex(charId),
    mesh: kid,
    pos: pos.clone(),
    homeCover,
    state: behavior === 'tagger' ? 'chasing' : 'hiding',
    stateTime: 0,
    nextStateChange: 1.5 + gameRandom(),
    yaw: 0,
    health: ch.hp * armorMult,
    maxHealth: ch.hp * armorMult,
    hitFlash: 0,
    targetPos: null,
    coverMemory: [],
    // v1.9: enemy now carries a weapon + scenario role
    weapon,                                  // 'pistol' | 'shotgun' | 'ar' | 'sniper'
    role,                                    // 'defender' | 'attacker' | 'skirmisher'
    // v1.25: behavior selects the AI brain. 'gunner' = the full shooter state
    // machine; 'tagger' = the zombie-mode chaser (no guns, infects on contact).
    behavior,                                // 'gunner' | 'tagger'
    team,                                    // v1.31 (Ship C): faction tag. 'enemy'
                                             // by default; allies spawn 'player',
                                             // FFA gives each kid a unique team.
    zombieSprinter,                          // tagger only: faster than player sprint
    anchorPos: anchorPos ? anchorPos.clone() : pos.clone(),  // zone-lock center for defenders
    nextShotPellets: 1,                      // for shotgun: number of pellets the next shot fires
    pendingBurst: [],                        // v1.20: queued BBs for auto-weapon bursts (entries: {dueIn, dispersal})
    noFire,                                  // v1.58: hard never-fire flag (tutorial dummies)
  };
}

// ---------------------------------------------------------------------
// ENEMY GUN MESH (v1.28e) — simplified third-person silhouettes per weapon
// class so opponents visibly carry the weapon their loadout says. Built in a
// group oriented to point along +Z (the kid's facing). Kept low-poly; the
// player sees these at range, not up close. Origin ~ the grip/hand.
// ---------------------------------------------------------------------
// v1.78: weapon-handling classification for the two-handed NPC holds.
//   - SMALL guns (pistol, mac10): one-handed at rest; the off-hand only comes to
//     the gun while firing/aiming, where both hands push the weapon straight out
//     in front of the chest.
//   - everything else (shotgun/ar/sniper/ak47/mp5/ump): two-handed always — the
//     off-hand rests on the foregrip even at idle, and on firing the gun tucks
//     into the right shoulder with the off-hand still across on the foregrip.
// gunForegripZ returns the local +Z (forward) distance from the gun mount to a
// sensible support-hand grip point for that weapon, so the off-hand lands on the
// handguard rather than in mid-air. Tuned to each silhouette in buildEnemyGunMesh.
function isSmallGun(weapon) {
  return weapon === 'pistol' || weapon === 'mac10' || weapon === 'sixshooter' || weapon === 'boltpistol' || weapon === 'epistol' || weapon === 'gaspistol' || !weapon;   // v1.168; v1.326; v1.399
}
function gunForegripZ(weapon) {
  switch (weapon) {
    case 'sniper':
    case 'l96':     // long barrel — hand well forward (v1.336: and the L96's)
    case 'svd':     return 0.26;   // v1.395: and the SVD's
    case 'm14':     return 0.22;   // v1.404: its long walnut forend
    case 'shotgun': return 0.18;   // pump fore-grip
    case 'semishotgun': return 0.18;   // v1.328: its forend
    case 'spas':    return 0.18;   // v1.398: its pump
    case 'm249':    return 0.20;   // v1.335: the handguard ahead of the box
    case 'ar':
    case 'erifle':  // v1.326
    case 'burst':   // v1.327
    case 'ak47':    // handguard ahead of the mag
    case 'rpk':     return 0.16;   // v1.396: and the RPK's
    case 'famas':   return 0.15;   // v1.325: the bullpup's handguard, ahead of the grip
    case 'mp5':
    case 'ump':     return 0.12;   // compact body
    case 'p90':     return 0.14;   // v1.346: the front hand stop
    case 'vector':  return 0.17;   // v1.348: its front grip
    case 'thompson': return 0.19;  // v1.403: its wooden front grip
    case 'g36':     return 0.17;   // v1.371: its handguard
    case 'aug':     return 0.22;   // v1.372: its folding foregrip
    case 'm4':      return 0.18;   // v1.373: its handguard
    case 'mac10':   return 0.06;
    case 'thunder': return 0.18;   // v1.168: the pump, as the spring shotgun
    case 'bucket':  return 0.12;
    case 'pistol':
    default:        return 0.10;
  }
}
// v1.81: exact grip points ON the gun mesh, in the gunGroup's LOCAL frame (origin
// at the gun mount, barrel along +Z). The buildEnemyGunMesh grip() sits at
// (0,-0.08,0) — that's the trigger/pistol grip the FIRING hand wraps. The support
// hand goes on the foregrip: forward by gunForegripZ, and at the gun's body line
// (slightly below the barrel for the underhand grip). Returned offsets are added
// to the gunGroup's world position to get the hand targets, so the hands SNAP to
// the actual weapon instead of floating near it.
function gunGripLocal(weapon) {
  // Firing-hand grip: at the pistol grip, a hair below + behind the mount.
  return { x: 0, y: -0.08, z: -0.01 };
}

function buildEnemyGunMesh(weapon) {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x232326, roughness: 0.5, metalness: 0.3 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.6 });
  const wood  = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 });
  const tan   = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.6 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); g.add(m); return m;
  };
  const grip = (mat = dark) => box(0.05, 0.12, 0.06, mat, 0, -0.08, 0);  // common pistol grip

  switch (weapon) {
    case 'shotgun':
    case 'semishotgun':     // v1.328: the Semi-Auto Shotgun in the kids' blocky style is the shotgun
    case 'spas': {          // v1.398: and the SPAS-12
      box(0.05, 0.08, 0.42, black, 0, 0, 0.20);          // long receiver+barrel
      box(0.045, 0.05, 0.16, dark, 0, -0.05, 0.16);      // pump fore-grip slung under
      box(0.05, 0.10, 0.09, wood, 0, -0.02, -0.05);      // wood stock wrist
      grip(wood);
      break;
    }
    case 'ar':
    case 'erifle':     // v1.326: the Electric Rifle in the kids' blocky style is the AR
    case 'burst': {    // v1.327: and the Burst Rifle
      box(0.045, 0.07, 0.40, black, 0, 0, 0.18);         // long barrel/receiver
      box(0.05, 0.13, 0.07, black, 0, -0.10, 0.06);      // tall magazine
      box(0.035, 0.04, 0.10, black, 0, 0.06, 0.04);      // carry-handle/optic riser
      box(0.05, 0.09, 0.10, dark, 0, -0.01, -0.08);      // stock
      grip();
      break;
    }
    case 'famas': {   // v1.325 (D.63): a bullpup, the mag behind the grip, the carry handle along the top
      box(0.05, 0.08, 0.34, black, 0, 0, 0.05);          // body, from the butt to the handguard
      box(0.025, 0.025, 0.12, dark, 0, 0.01, 0.27);      // barrel
      box(0.025, 0.02, 0.30, dark, 0, 0.075, 0.08);      // carry handle
      box(0.04, 0.10, 0.06, dark, 0, -0.08, -0.07);      // mag, behind the grip
      grip();
      break;
    }
    case 'sniper':
    case 'l96':     // v1.336: the L96 in the kids' blocky style is the sniper
    case 'svd': {   // v1.395: and the SVD
      box(0.04, 0.05, 0.56, black, 0, 0, 0.26);          // very long thin barrel
      box(0.045, 0.045, 0.14, dark, 0, 0.07, 0.10);      // scope tube up top
      box(0.05, 0.10, 0.14, wood, 0, -0.02, -0.06);      // bolt-gun wood stock
      grip(wood);
      break;
    }
    case 'm14': {   // v1.404 (D.63): a long barrel over a full walnut stock, a straight box mag, no scope
      box(0.035, 0.04, 0.50, black, 0, 0.02, 0.24);      // the long barrel and receiver
      box(0.05, 0.06, 0.34, wood, 0, -0.02, 0.18);       // the walnut forend under it
      box(0.05, 0.10, 0.16, wood, 0, -0.03, -0.08);      // the stock
      box(0.035, 0.09, 0.05, dark, 0, -0.08, 0.06);      // the box mag
      grip(wood);
      break;
    }
    case 'ak47':
    case 'rpk': {   // v1.396: the RPK in the kids' blocky style is the AK
      box(0.045, 0.07, 0.40, black, 0, 0, 0.18);         // receiver+barrel
      const mag = box(0.05, 0.15, 0.07, dark, 0, -0.11, 0.05); // banana mag...
      mag.rotation.x = 0.5;                              // ...curved forward
      box(0.05, 0.09, 0.12, wood, 0, -0.01, -0.08);      // wood stock
      grip(wood);
      break;
    }
    case 'm249': {   // v1.335 (D.63): the box under it, the bipod folded under the barrel
      box(0.05, 0.075, 0.46, black, 0, 0, 0.20);         // receiver, handguard and barrel
      box(0.06, 0.10, 0.09, new THREE.MeshStandardMaterial({ color: 0x4b5226, roughness: 0.75 }), -0.01, -0.08, 0.07);   // the box
      box(0.03, 0.02, 0.14, dark, 0, -0.045, 0.33);      // the bipod's legs
      box(0.045, 0.08, 0.12, black, 0, -0.01, -0.09);    // stock
      grip();
      break;
    }
    case 'mp5':
    case 'ump': {
      box(0.05, 0.08, 0.26, black, 0, 0, 0.12);          // compact SMG body
      box(0.045, 0.12, 0.06, dark, 0, -0.10, 0.05);      // straight stick mag
      box(0.04, 0.07, 0.10, dark, 0, 0, -0.10);          // collapsed stock
      grip();
      break;
    }
    case 'p90': {   // v1.346 (D.63): a long low bullpup, the clear mag on top, the ring sight ahead of it
      box(0.05, 0.08, 0.36, black, 0, 0, 0.10);          // body, stock to muzzle
      box(0.035, 0.025, 0.18, new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.3, transparent: true, opacity: 0.6 }), 0, 0.052, 0.04);   // the clear mag
      box(0.035, 0.04, 0.06, dark, 0, 0.06, 0.20);       // the sight
      grip();
      break;
    }
    case 'vector': {   // v1.348 (D.63): a short boxy body, the slanted front with the mag under it, a front grip
      box(0.05, 0.09, 0.30, black, 0, 0, 0.08);          // body and shroud
      box(0.04, 0.12, 0.05, dark, 0, -0.10, 0.10);       // the mag, under the slanted front
      box(0.035, 0.07, 0.035, dark, 0, -0.07, 0.17);     // the front grip
      box(0.03, 0.05, 0.12, dark, 0, 0, -0.11);          // the folding stock
      grip();
      break;
    }
    case 'thompson': {   // v1.403 (D.63): a blued body and finned barrel, the round drum under it, wooden front grip and stock
      box(0.045, 0.07, 0.24, black, 0, 0, 0.06);         // the receiver
      box(0.03, 0.03, 0.16, dark, 0, 0, 0.25);           // the finned barrel
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 14), dark);
      drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.09, 0.10); g.add(drum);   // the drum
      box(0.035, 0.08, 0.035, wood, 0, -0.07, 0.19);     // the front grip
      box(0.035, 0.06, 0.16, wood, 0, -0.02, -0.14);     // the stock
      grip(wood);
      break;
    }
    case 'aug': {   // v1.372 (D.63): an olive bullpup, the clear mag behind the grip, a long barrel, the foregrip
      const olive = new THREE.MeshStandardMaterial({ color: 0x4f5a3c, roughness: 0.6 });
      box(0.05, 0.08, 0.36, olive, 0, 0, 0.10);          // body, butt to front
      box(0.04, 0.12, 0.05, new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.3, transparent: true, opacity: 0.6 }), 0, -0.09, -0.06);   // the clear mag behind the grip
      box(0.025, 0.025, 0.12, dark, 0, 0, 0.33);          // the barrel
      box(0.03, 0.03, 0.18, dark, 0, 0.05, 0.10);        // the top rail
      box(0.025, 0.07, 0.025, dark, 0, -0.07, 0.22);     // the foregrip
      grip();
      break;
    }
    case 'm4': {   // v1.373 (D.63): a black carbine, the curved black mag, a flat-top rail, the sliding stock
      box(0.045, 0.07, 0.38, black, 0, 0, 0.16);         // receiver, handguard and barrel
      box(0.035, 0.13, 0.05, dark, 0, -0.10, 0.07);       // the curved mag
      box(0.03, 0.03, 0.30, dark, 0, 0.05, 0.12);        // the flat-top rail
      box(0.04, 0.07, 0.10, black, 0, 0, -0.10);         // the sliding stock
      grip();
      break;
    }
    case 'g36': {   // v1.371 (D.63): a short rifle, the smoky clear mag, a carry rail, the skeleton stock
      box(0.045, 0.07, 0.38, black, 0, 0, 0.16);         // receiver, handguard and barrel
      box(0.04, 0.13, 0.06, new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.3, transparent: true, opacity: 0.6 }), 0, -0.10, 0.06);   // the clear mag
      box(0.03, 0.03, 0.14, dark, 0, 0.05, 0.06);        // the top rail
      box(0.03, 0.06, 0.12, dark, 0, 0, -0.09);          // the folding stock
      grip();
      break;
    }
    case 'mac10': {
      box(0.06, 0.10, 0.16, black, 0, 0, 0.06);          // tiny boxy machine pistol
      box(0.04, 0.11, 0.05, dark, 0, -0.10, 0.03);       // short mag
      grip();
      break;
    }
    // v1.168: the backyard guns, in their toy colours
    case 'thunder': {
      const green = new THREE.MeshStandardMaterial({ color: 0x2f7a46, roughness: 0.6 });
      box(0.05, 0.08, 0.42, green, 0, 0, 0.20);          // receiver + barrel
      box(0.03, 0.03, 0.16, tan, 0, -0.045, 0.18);       // air tank
      box(0.045, 0.05, 0.10, dark, 0, -0.05, 0.18);      // pump
      box(0.05, 0.10, 0.09, green, 0, -0.02, -0.05);     // stock wrist
      grip(green);
      break;
    }
    case 'sixshooter': {
      const silver = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, roughness: 0.3, metalness: 0.7 });
      box(0.045, 0.05, 0.06, silver, 0, 0.01, 0.0);      // cylinder
      box(0.025, 0.03, 0.17, silver, 0, 0.02, 0.10);     // barrel
      grip(wood);
      break;
    }
    case 'bucket': {
      const blue = new THREE.MeshStandardMaterial({ color: 0x2a5fb0, roughness: 0.55 });
      const pail = new THREE.MeshStandardMaterial({ color: 0xdbe8f0, roughness: 0.2 });
      box(0.06, 0.08, 0.32, blue, 0, 0, 0.12);           // body + barrel
      box(0.09, 0.07, 0.09, pail, 0, 0.075, 0.08);       // the bucket on top
      grip();
      break;
    }
    case 'sprayer': case 'ghost': case 'ticktock': case 'rattle': {   // v1.250: the clear automatics
      const clear = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.2, transparent: true, opacity: 0.6 });
      const L = { sprayer: 0.26, ghost: 0.2, ticktock: 0.46, rattle: 0.2 }[weapon];
      box(0.05, 0.07, L, clear, 0, 0, L / 2 - 0.05);     // body + barrel
      box(0.025, 0.035, L * 0.6, dark, 0, 0, L / 2 - 0.05);   // the guts, seen through it
      box(0.03, 0.03, 0.02, _fpOrangeMat(), 0, 0.01, L - 0.04);   // orange tip
      grip();
      break;
    }
    case 'boltpistol': {
      box(0.04, 0.05, 0.12, black, 0, 0, 0.04);          // frame
      box(0.02, 0.02, 0.26, black, 0, 0.02, 0.20);       // long barrel
      box(0.03, 0.01, 0.01, dark, 0.03, 0.02, -0.01);    // bolt knob
      grip(wood);
      break;
    }
    case 'pistol':
    default: {
      box(0.05, 0.10, 0.25, black, 0, 0, 0.10);          // stubby slide/barrel
      grip();
      break;
    }
  }
  return g;
}

// ---------------------------------------------------------------------
// KID CHARACTER (low-poly, blocky)
// ---------------------------------------------------------------------
// Accepts either a CHARACTERS entry (preferred) or a legacy color-only profile.
// Returns { group, head, torso, gunGroup, parts:{...}, scaleY, scaleXZ } so the
// hitbox math in checkEnemyHit can multiply local-space part offsets by the same scales.
// ---------------------------------------------------------------------
const KID_HEIGHT_SCALE = { short: 0.88, average: 1.0, tall: 1.12 };
const KID_BUILD_SCALE  = { skinny: 0.88, average: 1.0, heavy: 1.18 };

// v1.118 (backlog D.3 step 3, Michael: A — the kids: faces, hands, clothes; this is the faces). The head is the same
// 0.28 m cube with its edges rounded (r 4 cm); the face is built in the head's own frame (front at +z, centre 0) and
// merged into one mesh per material, so it rides the head through the crouch drop and the aim tilt. Nothing reaches
// more than 3 cm past the head box (nose, ears), well inside the BB hit forgiveness; the hitboxes are untouched.
const KID_EYE_COLORS = { brown: 0x5a3a1e, hazel: 0x7a6a34, green: 0x3e6e44, blue: 0x3a6a9a, gray: 0x6a7480 };
let _kidHeadGeo = null;
function kidHeadGeometry() {
  if (_kidHeadGeo) return _kidHeadGeo;
  const h = 0.14, r = 0.04, seg = 6;
  const g = new THREE.BoxGeometry(2 * h, 2 * h, 2 * h, seg, seg, seg);
  const pa = g.attributes.position, na = g.attributes.normal;
  const v = new THREE.Vector3(), inner = new THREE.Vector3(), n = new THREE.Vector3();
  const spread = u => Math.sign(u) * Math.pow(Math.abs(u), 0.55);   // crowd the rows toward the edges, where the rounding is
  for (let i = 0; i < pa.count; i++) {
    v.set(spread(pa.getX(i) / h) * h, spread(pa.getY(i) / h) * h, spread(pa.getZ(i) / h) * h);
    inner.set(Math.max(-(h - r), Math.min(h - r, v.x)), Math.max(-(h - r), Math.min(h - r, v.y)), Math.max(-(h - r), Math.min(h - r, v.z)));
    n.subVectors(v, inner);
    if (n.lengthSq() < 1e-12) n.set(na.getX(i), na.getY(i), na.getZ(i)); else n.normalize();
    v.copy(inner).addScaledVector(n, r);
    pa.setXYZ(i, v.x, v.y, v.z); na.setXYZ(i, n.x, n.y, n.z);
  }
  _kidHeadGeo = g;
  return g;
}
// v1.119 (backlog D.3 step 3, the kids: hands). The hand was a 0.11 × 0.10 × 0.12 skin block, wider than the forearm. It
// is now a loose fist, narrower than the forearm so the wrist reads, inside the old box, merged into one geometry (still one mesh, one draw call): the back of the hand and palm, four
// fingers curled under with a knuckle ridge across them and a hair's gap between each, and a thumb on the side toward
// the body, laid along the fingers. The hand's local frame is the forearm's: -y runs to the fingertips, +z is the front.
// `inSide` is +1 when the body's midline is at +x (the right arm) and -1 for the left. The node, its position and the
// IK are untouched, so the grips and the poses are where they were.
const _kidHandGeo = {};
function kidHandGeometry(inSide) {
  if (_kidHandGeo[inSide]) return _kidHandGeo[inSide];
  const parts = []; const _s = new THREE.Vector3(1, 1, 1);
  const add = (geo, px, py, pz, rx = 0, ry = 0, rz = 0) => parts.push({ geo,
    m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _s) });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add(box(0.066, 0.064, 0.098), 0, 0.016, 0);                    // back of the hand and the palm
  add(box(0.058, 0.014, 0.086), 0, 0.042, 0);                    // the wrist, a touch narrower
  add(box(0.072, 0.018, 0.102), 0, -0.018, 0);                   // knuckle ridge
  // four fingers, curled under: each a short bar from the knuckles toward the palm side, with a 3 mm gap between
  for (let i = 0; i < 4; i++) {
    const z = -0.0375 + i * 0.025, len = i === 0 || i === 3 ? 0.02 : 0.022;
    add(box(0.06, 0.03, len), -inSide * 0.004, -0.036, z);
    add(box(0.026, 0.022, len), inSide * 0.02, -0.027, z, 0, 0, inSide * 0.35);   // fingertips tucked toward the palm
  }
  // thumb: on the body side, from the heel of the hand down along the fingers' front
  add(box(0.024, 0.05, 0.026), inSide * 0.032, -0.006, 0.04, 0.25, 0, inSide * 0.18);
  add(box(0.02, 0.024, 0.022), inSide * 0.034, -0.036, 0.046, 0.25, 0, 0);
  _kidHandGeo[inSide] = _houseMergeParts(parts);
  return _kidHandGeo[inSide];
}
// v1.120 (backlog D.3 step 3, the kids: clothes). The body was five plain boxes. Each keeps its box (the hitboxes are
// fixed numbers in checkEnemyHit, and the poses scale and move these same nodes) and gets a shape inside it, merged into
// one geometry shared by every kid, so the shirt, legs and shoes are still one mesh each:
//   shirt: a body a little in from the box, tucked in, with a shoulder yoke at full width and a crew collar;
//   sleeve: the upper arm with a hem band at the elbow end; jeans: a leg with front pocket seams, a side seam and a cuff;
//   sneaker: an upper that rounds down at the toe and heel, on a sole (the sole, toe cap and laces are a child mesh).
// buildKidClothes adds per-kid trim on the torso: a darker collar rib, a chest stripe or pocket or nothing
// (from the kid's colours, so the same kid always wears the same shirt), and a belt with a buckle.
let _kidClothesGeo = null;
function kidClothesGeometry() {
  if (_kidClothesGeo) return _kidClothesGeo;
  const _s = new THREE.Vector3(1, 1, 1);
  const mk = () => { const parts = []; parts.add = (geo, px, py, pz, rx = 0, ry = 0, rz = 0) => parts.push({ geo,
    m: new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _s) }); return parts; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // shirt (torso box 0.42 × 0.5 × 0.24, centre 0)
  const t = mk();
  t.add(box(0.404, 0.44, 0.226), 0, 0.01, 0);           // body, in from the box so the yoke and belt stand proud (tucked in)
  t.add(box(0.42, 0.04, 0.24), 0, 0.23, 0);             // shoulder yoke
  for (const [w, d, x, z] of [[0.16, 0.022, 0, 0.06], [0.16, 0.022, 0, -0.06], [0.022, 0.1, 0.07, 0], [0.022, 0.1, -0.07, 0]])
    t.add(box(w, 0.02, d), x, 0.258, z);                // crew collar, a ring round the neck
  // sleeve (upper arm 0.11 × 0.24 × 0.13, centre 0; the mesh hangs half its length below the shoulder)
  const u = mk();
  u.add(box(0.104, 0.205, 0.124), 0, 0.0175, 0);
  u.add(box(0.11, 0.035, 0.13), 0, -0.1025, 0);         // hem at the elbow end
  // jeans (leg 0.16 × 0.55 × 0.18, centre 0)
  const l = mk();
  l.add(box(0.154, 0.5, 0.174), 0, 0.025, 0);
  l.add(box(0.16, 0.05, 0.18), 0, -0.25, 0);            // turned-up cuff
  l.add(box(0.16, 0.012, 0.18), 0, 0.269, 0);           // waist seam at the top
  for (const sx of [-1, 1]) l.add(box(0.05, 0.006, 0.006), sx * 0.04, 0.2, 0.0855, 0, 0, sx * 0.6);   // front pocket seams
  l.add(box(0.006, 0.44, 0.006), 0.0765, 0.0, 0); l.add(box(0.006, 0.44, 0.006), -0.0765, 0.0, 0);   // side seams
  // sneaker upper (shoe 0.18 × 0.08 × 0.26, centre 0): the top edges pulled in at the toe and heel
  const sh = box(0.16, 0.06, 0.24, 1, 1, 8);
  const pa = sh.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const z = pa.getZ(i), y = pa.getY(i);
    if (y > 0) { const k = Math.min(1, Math.abs(z) / 0.12); const pull = z > 0 ? 0.55 : 0.25; pa.setY(i, y - 0.04 * Math.pow(k, 3) * (z > 0 ? 1 : 0.5)); pa.setZ(i, z * (1 - pull * Math.pow(k, 4) * 0.2)); }
  }
  sh.computeVertexNormals();
  const s = mk(); s.add(sh, 0, 0.01, -0.005);
  // sole, toe cap and laces (white), as one child
  const so = mk();
  so.add(box(0.18, 0.025, 0.26), 0, -0.0275, 0);
  so.add(box(0.15, 0.02, 0.05), 0, -0.005, 0.105);       // rubber toe cap
  for (const [y, z] of [[0.037, 0.055], [0.041, 0.025], [0.042, -0.005], [0.042, -0.035]]) so.add(box(0.07, 0.006, 0.012), 0, y, z);   // laces
  _kidClothesGeo = { torso: _houseMergeParts(t), upper: _houseMergeParts(u), leg: _houseMergeParts(l), shoe: _houseMergeParts(s), sole: _houseMergeParts(so) };
  return _kidClothesGeo;
}
const KID_SHIRT_FRONTS = ['stripe', 'pocket', 'plain'];   // v1.123: buildKidClothes' styles 0, 1, 2
function _kidHash(p) {
  const n = ((p.shirtColor | 0) * 31 + (p.pantsColor | 0) * 17 + (p.hairColor | 0)) >>> 0;
  return (Math.abs(Math.sin(n * 12.9898) * 43758.5453)) % 1;
}
// v1.206 (D.21 shoes, Michael: A on "Shoes as looks": a free Sneakers row at the mirror): six colours for the plain
// pair, the five the game picks from plus royal blue. A look with one of them wears it; any other kid (and an old save
// that never picked) keeps the colour the game picks. A gear pair (Trail Runners, Track Spikes, Cross-Trainers) keeps
// its own look over them on the Loadout kid.
const KID_SNEAKER_COLORS = [0x1a1a1a, 0xd8d8d0, 0x26324a, 0x5a5a60, 0x7a2222, 0x2a6ad8];
function kidShoeColor(p) {
  if (KID_SNEAKER_COLORS.includes(p.shoeColor)) return p.shoeColor;   // v1.206
  return [0x1a1a1a, 0x1a1a1a, 0x26324a, 0x5a5a60, 0x7a2222, 0xd8d8d0][Math.floor(_kidHash(p) * 6)];
}
// v1.206: the sneakers your kid wears now: the picked colour, else the one the game picks (as createKid sees the look,
// with a top's colour in place of the shirt's)
function lookShoeColor(look) {
  const p = Object.assign({}, look);
  if (KID_TOPS[p.top]) p.shirtColor = KID_TOPS[p.top].color;
  return kidShoeColor(p);
}
function buildKidClothes(p, { torso, shoeL, shoeR, shirt }) {
  const cg = kidClothesGeometry();
  const h = _kidHash(p);
  const trimColor = new THREE.Color(p.shirtColor ?? 0x5a7a4a).multiplyScalar(0.7).getHex();
  const mats = {
    trim: _kidFaceMat('trim', trimColor, 0.85),
    belt: _kidFaceMat('belt', [0x2a1c12, 0x3a2614, 0x141414][Math.floor(h * 13) % 3], 0.6),
    buckle: _kidFaceMat('buckle', 0x9a9a92, 0.35),
  };
  const b = {}; const add = _propAdder(b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // the collar rib in the darker trim colour, just proud of the shirt
  for (const [w, d, x, z] of [[0.17, 0.024, 0, 0.061], [0.17, 0.024, 0, -0.061], [0.024, 0.1, 0.073, 0], [0.024, 0.1, -0.073, 0]])
    add('trim', box(w, 0.012, d), x, 0.266, z);
  // a chest stripe, a pocket, or plain, by kid
  // v1.123: a profile's shirtFront (Mike's, from the mirror) picks it; other kids keep the one their colours give
  let style = KID_SHIRT_FRONTS.indexOf(p.shirtFront) >= 0 ? KID_SHIRT_FRONTS.indexOf(p.shirtFront) : Math.floor(h * 3);
  const topKind = KID_TOPS[p.top] ? KID_TOPS[p.top].kind : null;   // v1.198: a top has its own front (buildKidTop)
  if (topKind) style = 2;
  if (style === 0) add('trim', box(0.424, 0.05, 0.244), 0, 0.06, 0);
  else if (style === 1) { add('trim', box(0.08, 0.085, 0.006), 0.1, 0.1, 0.116); add('trim', box(0.084, 0.01, 0.008), 0.1, 0.14, 0.117); }
  // belt round the waist with a buckle at the front
  if (topKind !== 'hoodie') {   // v1.198: a hoodie hangs over the belt
    add('belt', box(0.426, 0.036, 0.246), 0, -0.232, 0);
    add('buckle', box(0.05, 0.03, 0.006), 0, -0.232, 0.1245);
  }
  const trim = new THREE.Group(); trim.userData.kidClothes = true;
  _propMerge(trim, b, mats);
  trim.traverse(m => { if (m.isMesh) m.castShadow = false; });
  torso.add(trim);
  for (const sh of [shoeL, shoeR]) { const so = new THREE.Mesh(cg.sole, _kidFaceMat('sole', 0xe8e6de, 0.8)); so.castShadow = true; sh.add(so); }
  return trim;
}
const _kidFaceMats = {};
function _kidFaceMat(key, color, rough = 0.6) {
  const k = key + ':' + color;
  return _kidFaceMats[k] || (_kidFaceMats[k] = new THREE.MeshStandardMaterial({ color, roughness: rough }));
}
function buildKidFace(head, p, skin, hair) {
  const b = {}; const add = _propAdder(b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const F = 0.14;                         // the face plane (head front)
  const EY = 0.012, EX = 0.058;           // eye centre height and half-spacing, head frame
  const mats = {
    skin, brow: hair,
    white: _kidFaceMat('white', 0xf2eee6, 0.5),
    iris: _kidFaceMat('iris', KID_EYE_COLORS[p.eyeColor] ?? KID_EYE_COLORS.brown, 0.4),
    dark: _kidFaceMat('dark', 0x141414, 0.4),
    lip: _kidFaceMat('lip', new THREE.Color(p.skinColor ?? 0xe0b090).multiplyScalar(0.62).getHex(), 0.7),
    frame: _kidFaceMat('frame', 0x0a0a0a, 0.4),
  };
  // eyes: white, iris and pupil stacked 1–5 mm proud, merged with the rest; eyeL/eyeR stay as empty anchors at each eye
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Object3D(); eg.position.set(sx * EX, EY, F); head.add(eg); eyes.push(eg);
    add('white', box(0.058, 0.04, 0.008), sx * EX, EY, F + 0.001);
    add('iris', box(0.028, 0.034, 0.008), sx * (EX - 0.004), EY - 0.001, F + 0.003);
    add('dark', box(0.013, 0.016, 0.008), sx * (EX - 0.004), EY - 0.001, F + 0.005);
  }
  // brows in the hair colour, tipped a touch toward the nose
  for (const sx of [-1, 1]) add('brow', box(0.062, 0.014, 0.012), sx * EX, EY + 0.04, F + 0.003, 0, 0, sx * -0.12);
  // nose: a short wedge (a box narrowed at the bridge) and the tip
  const nose = box(0.034, 0.06, 0.03);
  const pa = nose.attributes.position;
  for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0) { pa.setX(i, pa.getX(i) * 0.55); pa.setZ(i, pa.getZ(i) * 0.4 - 0.009); }
  nose.computeVertexNormals();
  add('skin', nose, 0, -0.022, F + 0.012);
  add('skin', box(0.042, 0.02, 0.026), 0, -0.048, F + 0.012);
  // ears: a shell and a darker inner fold read as one block with a lip
  for (const sx of [-1, 1]) {
    add('skin', box(0.026, 0.07, 0.05), sx * (F + 0.006), 0.0, -0.01);
    add('lip', box(0.006, 0.04, 0.026), sx * (F + 0.019), 0.0, -0.006);
  }
  // mouth: a dark line with corners turned up, the lip colour under it
  add('dark', box(0.05, 0.01, 0.006), 0, -0.078, F + 0.001);
  for (const sx of [-1, 1]) add('dark', box(0.016, 0.009, 0.006), sx * 0.03, -0.074, F + 0.001, 0, 0, sx * 0.45);
  add('lip', box(0.044, 0.01, 0.004), 0, -0.088, F + 0.0005);
  // glasses: open rims round each eye (the eye shows through), a bridge, temple arms to the ears
  if (p.glasses) {
    for (const sx of [-1, 1]) {
      const cx = sx * EX, z = F + 0.014, W = 0.074, H = 0.058, t = 0.008;
      add('frame', box(W, t, t), cx, EY + H / 2, z); add('frame', box(W, t, t), cx, EY - H / 2, z);
      add('frame', box(t, H, t), cx - W / 2, EY, z); add('frame', box(t, H, t), cx + W / 2, EY, z);
      add('frame', box(0.008, 0.008, 0.15), sx * (F + 0.006), EY + 0.02, F - 0.06);
    }
    add('frame', box(0.034, 0.008, 0.008), 0, EY + 0.016, F + 0.014);
  }
  const face = new THREE.Group(); face.userData.kidFace = true;
  _propMerge(face, b, mats);
  face.traverse(m => { if (m.isMesh) m.castShadow = false; });
  head.add(face);
  return { eyeL: eyes[0], eyeR: eyes[1], face };
}

// v1.197 (D.21 step 1, Michael: C on "A better game" 2 — looks you earn or buy): hats. Each is its own mesh worn over
// the hair, in the average kid's frame (head centre y 1.26, its top 1.40, its face z +0.14). Bought in the shop's
// Clothes tab, or won (`won`: the match whose win gives it); worn from the shop or the mirror (`look.hat`).
const KID_HATS = {
  cap_red:      { name: 'Red Ball Cap',  kind: 'cap',     color: 0xb8322a, price: 15,
    desc: 'Six panels, a curved bill, a button on top. Keeps the sun out of your eyes.' },
  cap_back:     { name: 'Backwards Cap', kind: 'capBack', color: 0x23345a, price: 15,
    desc: 'Navy, bill to the back, the way the high school kids wear it.' },
  bucket:       { name: 'Bucket Hat',    kind: 'bucket',  color: 0xb9a77a, price: 20,
    desc: 'Floppy khaki, a brim all the way round. Very 2003.' },
  bandana_red:  { name: 'Red Bandana',   kind: 'bandana', color: 0xa82a2a, price: 10,
    desc: 'Folded into a headband and knotted at the back.' },
  bandana_blue: { name: 'Blue Bandana',  kind: 'bandana', color: 0x2a4a8a, price: 10,
    desc: 'The same, in blue.' },
  winnmark_cap: { name: 'Winnmark Cap',  kind: 'cap',     color: 0x2f6a3a, won: 'winnmark_night_team_2v2', logo: 0xf2efe6,
    desc: 'Green, a white patch on the front. Not for sale: clear Winnmark Court.' },
};
const KID_HAT_ORDER = ['cap_red', 'cap_back', 'bucket', 'bandana_red', 'bandana_blue', 'winnmark_cap'];
function hatOwned(id) {
  const h = KID_HATS[id];
  if (!h) return false;
  return h.won ? !!Game.persist.completed[h.won] : !!(Game.persist.ownedHats || {})[id];
}
function buildKidHat(id, color = null) {
  let h = KID_HATS[id];
  if (!h) return null;
  if (color != null) h = Object.assign({}, h, { color });   // v1.200: the crew bandana, in the crew's colour
  const mats = { cloth: _kidFaceMat('hat', h.color, 0.9),   // shared, as the face's and the clothes' are
    trim: _kidFaceMat('hatTrim', new THREE.Color(h.color).multiplyScalar(0.7).getHex(), 0.9),
    logo: _kidFaceMat('hatLogo', h.logo || 0xffffff, 0.8) };
  const b = {}; const add = _propAdder(b);
  const box = (w, ht, d) => new THREE.BoxGeometry(w, ht, d);
  if (h.kind === 'cap' || h.kind === 'capBack') {
    const zs = h.kind === 'cap' ? 1 : -1;
    add('cloth', box(0.36, 0.1, 0.36), 0, 1.46, 0);               // the crown, over every hair style's cap
    add('cloth', box(0.3, 0.035, 0.3), 0, 1.525, 0);              // its rounded top
    add('trim', box(0.035, 0.02, 0.035), 0, 1.55, 0);             // the button
    add('trim', box(0.37, 0.02, 0.37), 0, 1.415, 0);              // the sweatband edge
    add('trim', box(0.3, 0.014, 0.14), 0, 1.418, zs * 0.245, zs * 0.12, 0, 0);   // the bill, dipping a little
    if (h.logo) add('logo', box(0.1, 0.06, 0.006), 0, 1.465, 0.183);              // the front patch
  } else if (h.kind === 'bucket') {
    add('cloth', box(0.36, 0.11, 0.36), 0, 1.465, 0);
    add('cloth', box(0.31, 0.03, 0.31), 0, 1.53, 0);
    add('trim', box(0.37, 0.025, 0.37), 0, 1.42, 0);              // the band
    add('cloth', new THREE.CylinderGeometry(0.25, 0.27, 0.016, 16), 0, 1.405, 0);   // the brim all round
  } else if (h.kind === 'bandana') {
    add('cloth', box(0.355, 0.06, 0.355), 0, 1.385, 0);           // folded band across the brow, wider than any hair
    add('trim', box(0.07, 0.05, 0.04), 0, 1.385, -0.195);         // the knot at the back
    for (const sx of [-1, 1]) add('cloth', box(0.04, 0.11, 0.015), sx * 0.025, 1.32, -0.205, 0.15, 0, sx * 0.25);   // its tails
  }
  const g = new THREE.Group(); g.userData.kidHat = id;
  _propMerge(g, b, mats);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// v1.198 (D.21 step 2, Michael: C on "A better game" 2): tops. A top is worn over the mirror's shirt: its colour is the
// shirt's, and its front is its own (a tee's graphic, the hoodie's pocket and strings), all in the torso's frame (centre
// 0, front face z 0.113). Tees are cut like the shirt; the hoodie hangs loose over the belt, has a hood down at the back
// of the neck and long sleeves to the wrist. Bought in the Clothes tab or won; worn from the shop or the mirror (`look.top`).
const KID_TOPS = {
  tee_skate: { name: 'Skate Tee',   kind: 'tee', color: 0xe6e3da, price: 15, art: 'skate',
    desc: 'White, a black deck with red wheels across the chest. You don’t skate. Nobody needs to know.' },
  tee_shark: { name: 'Shark Tee',   kind: 'tee', color: 0x5f9cc8, price: 15, art: 'shark',
    desc: 'Sky blue, a grey fin over a white wave. From the aquarium gift shop.' },
  tee_flame: { name: 'Flame Tee',   kind: 'tee', color: 0x1e1e20, price: 18, art: 'flame',
    desc: 'Black, orange and yellow flames up from the hem. The fastest shirt in the neighborhood.' },
  hoodie:    { name: 'Grey Hoodie', kind: 'hoodie', color: 0x7c7d84, price: 30,
    desc: 'Heather grey, a kangaroo pocket, the hood down. Too hot for August. Worn anyway.' },
  tee_hollow: { name: 'Big Game Tee', kind: 'tee', color: 0x2f5a3a, won: 'hollow_big_battle', art: 'pine',
    desc: 'Forest green, a white pine on the front. Not for sale: win the Big Game at the Hollow.' },
};
const KID_TOP_ORDER = ['tee_skate', 'tee_shark', 'tee_flame', 'hoodie', 'tee_hollow'];
function topOwned(id) {
  const t = KID_TOPS[id];
  if (!t) return false;
  return t.won ? !!Game.persist.completed[t.won] : !!(Game.persist.ownedTops || {})[id];
}
// The top's front and trim, merged into one group on the torso (buildKidClothes leaves the belt off under a hoodie).
function buildKidTop(id) {
  const t = KID_TOPS[id];
  if (!t) return null;
  const mats = { body: _kidFaceMat('top', t.color, 0.88),
    rib: _kidFaceMat('topRib', new THREE.Color(t.color).multiplyScalar(0.78).getHex(), 0.9),
    white: _kidFaceMat('topWhite', 0xf2efe6, 0.8), black: _kidFaceMat('topBlack', 0x161616, 0.8),
    red: _kidFaceMat('topRed', 0xc0342a, 0.8), grey: _kidFaceMat('topGrey', 0x8a9098, 0.8),
    orange: _kidFaceMat('topOrange', 0xe8701e, 0.75), yellow: _kidFaceMat('topYellow', 0xf2c230, 0.75),
    brown: _kidFaceMat('topBrown', 0x6a4426, 0.85) };
  const b = {}; const add = _propAdder(b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const tri = (r) => { const g = new THREE.CylinderGeometry(r, r, 0.006, 3); g.rotateX(Math.PI / 2); return g; };   // a flat triangle, point up
  const Z = 0.116;                                   // just proud of the shirt's front
  if (t.art === 'skate') {
    add('black', box(0.24, 0.035, 0.006), 0, 0.07, Z, 0, 0, 0.18);                         // the deck, tilted
    for (const sx of [-1, 1]) add('black', box(0.03, 0.03, 0.006), sx * 0.12, 0.07 + sx * 0.022, Z, 0, 0, 0.18);   // kicked-up ends
    for (const sx of [-1, 1]) add('red', box(0.034, 0.034, 0.008), sx * 0.075, 0.032 + sx * 0.013, Z + 0.001);    // wheels
  } else if (t.art === 'shark') {
    add('grey', tri(0.07), -0.02, 0.1, Z, 0, 0, 0.2);                                        // the fin
    add('white', box(0.28, 0.022, 0.006), 0, 0.045, Z);                                     // the wave
    for (const x of [-0.1, 0, 0.1]) add('white', box(0.05, 0.02, 0.006), x + 0.02, 0.064, Z, 0, 0, 0.5);   // its curls
  } else if (t.art === 'flame') {
    // tongues up from the hem, tall orange behind short yellow, all round the front
    const hs = [0.16, 0.1, 0.2, 0.12, 0.18, 0.09, 0.15];
    hs.forEach((h, i) => {
      const x = -0.17 + i * 0.0567;
      add('orange', box(0.045, h, 0.006), x, -0.205 + h / 2, Z, 0, 0, (i % 2 ? -0.12 : 0.12));
      add('yellow', box(0.026, h * 0.55, 0.006), x, -0.205 + h * 0.275, Z + 0.001, 0, 0, (i % 2 ? -0.12 : 0.12));
    });
  } else if (t.art === 'pine') {
    add('white', tri(0.075), 0, 0.12, Z); add('white', tri(0.06), 0, 0.165, Z + 0.001);     // two tiers
    add('white', box(0.022, 0.035, 0.006), 0, 0.068, Z);                                    // the trunk
  }
  if (t.kind === 'hoodie') {
    add('body', box(0.43, 0.06, 0.25), 0, -0.235, 0);                                       // loose over the belt
    add('rib', box(0.432, 0.03, 0.252), 0, -0.265, 0);                                      // the waistband rib
    add('body', box(0.26, 0.1, 0.012), 0, -0.13, 0.118);                                    // the kangaroo pocket
    add('rib', box(0.262, 0.012, 0.014), 0, -0.08, 0.119);                                  // its top edge
    add('body', box(0.3, 0.11, 0.1), 0, 0.25, -0.1, -0.35, 0, 0);                           // the hood, down at the back of the neck
    add('rib', box(0.24, 0.035, 0.07), 0, 0.285, -0.07, -0.35, 0, 0);                        // its opening's rim
    for (const sx of [-1, 1]) add('white', box(0.012, 0.13, 0.008), sx * 0.04, 0.17, 0.118);   // drawstrings
  }
  const g = new THREE.Group(); g.userData.kidTop = id;
  _propMerge(g, b, mats);
  g.traverse(m => { if (m.isMesh) m.castShadow = false; });
  return g;
}

// v1.199 (D.21 step 3, Michael: C on "A better game" 2): shorts. With shorts on, each leg is bare from the knee, in a
// white sock above the sneaker; the shorts are a child of the leg (its frame: centre 0, 0.16 × 0.55 × 0.18, the knee near
// y 0.03), so they swing and crouch with it. Bought in the Clothes tab or won; worn from the shop or the mirror
// (`look.shorts`); a Pants colour at the mirror puts your jeans back on.
const KID_SHORTS = {
  cargo:    { name: 'Cargo Shorts',      kind: 'cargo',  color: 0xa89a74, price: 20,
    desc: 'Khaki, a pocket on each side big enough for a speed loader and a Capri Sun.' },
  mesh:     { name: 'Basketball Shorts', kind: 'mesh',   color: 0x223a6e, price: 15, stripe: 0xf2efe6,
    desc: 'Navy mesh, white stripes down the sides, past the knee the way they wear them now.' },
  jorts:    { name: 'Jean Shorts',       kind: 'jorts',  color: 0x4a6a9a, price: 12,
    desc: 'Last year’s jeans with the legs cut off. Your mom hemmed them.' },
  trunks:   { name: 'Swim Trunks',       kind: 'mesh',   color: 0x1f8a8a, won: 'club_night_4v4', stripe: 0xf2c230,
    desc: 'Teal with yellow stripes, from the club’s lost and found. Not for sale: win Night Swim at Willow Bend.' },
};
const KID_SHORTS_ORDER = ['cargo', 'mesh', 'jorts', 'trunks'];
function shortsOwned(id) {
  const t = KID_SHORTS[id];
  if (!t) return false;
  return t.won ? !!Game.persist.completed[t.won] : !!(Game.persist.ownedShorts || {})[id];
}
let _kidBareLegGeo = null;
function buildKidShorts(id, leg, skin, sx) {
  const t = KID_SHORTS[id];
  const mats = { body: _kidFaceMat('shorts', t.color, 0.88),
    hem: _kidFaceMat('shortsHem', new THREE.Color(t.color).multiplyScalar(t.kind === 'jorts' ? 1.35 : 0.75).getHex(), 0.9),
    stripe: _kidFaceMat('shortsStripe', t.stripe || 0xffffff, 0.8), sock: _kidFaceMat('sock', 0xeeece4, 0.9) };
  const b = {}; const add = _propAdder(b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const long = t.kind === 'mesh';                       // basketball shorts and trunks reach past the knee
  const y0 = long ? -0.06 : 0.0, y1 = 0.275, h = y1 - y0;
  add('body', box(0.168, h, 0.188), 0, (y0 + y1) / 2, 0);
  add('hem', box(0.172, t.kind === 'jorts' ? 0.04 : 0.022, 0.192), 0, y0 + 0.012, 0);   // a hem, or the jorts' rolled cuff
  if (t.kind === 'cargo') add('hem', box(0.02, 0.1, 0.11), sx * 0.093, 0.06, 0);        // the cargo pocket on the outside
  if (t.stripe) add('stripe', box(0.006, h, 0.03), sx * 0.085, (y0 + y1) / 2, 0);       // a stripe down the outside
  add('sock', box(0.126, 0.07, 0.14), 0, -0.16, 0.0);                                     // a white sock above the sneaker
  const g = new THREE.Group(); g.userData.kidShorts = id;
  _propMerge(g, b, mats);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  leg.add(g);
  return g;
}

function createKid(profile, weapon = 'pistol') {
  // Default profile (back-compat with previous call signature)
  const p = {
    shirtColor: 0x5a7a4a, pantsColor: 0x4a4438, skinColor: 0xe0b090, hairColor: 0x3a2818,
    height: 'average', build: 'average', hairStyle: 'short', glasses: false,
    ...profile,
  };
  const top = KID_TOPS[p.top] ? p.top : null;   // v1.198 (D.21 step 2): a top's colour is the shirt's
  if (top) p.shirtColor = KID_TOPS[top].color;

  const scaleY  = KID_HEIGHT_SCALE[p.height]  ?? 1.0;
  const scaleXZ = KID_BUILD_SCALE[p.build]    ?? 1.0;

  const group = new THREE.Group();
  // Apply per-character scale on the group so all subsequent positions/dims stay
  // in the SAME local "average kid" reference frame — much easier to reason about,
  // and lets checkEnemyHit just multiply each part offset by the same scales.
  group.scale.set(scaleXZ, scaleY, scaleXZ);
  group.rotation.order = 'YXZ';   // v1.183: the lean (x, z) is about his own axes after his facing (y)

  const skin  = new THREE.MeshStandardMaterial({ color: p.skinColor,  roughness: 0.9  });
  const shirt = new THREE.MeshStandardMaterial({ color: p.shirtColor, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: p.pantsColor, roughness: 0.85 });
  const hair  = new THREE.MeshStandardMaterial({ color: p.hairColor,  roughness: 0.95 });
  const shoes = new THREE.MeshStandardMaterial({ color: kidShoeColor(p), roughness: 0.7  });   // v1.120: not every kid in black

  // === BODY (all dimensions in "average kid" local space; group.scale handles variants) ===
  // Kid baseline is 1.5m tall in local space (Y=0 at feet → Y=1.5 at top of hair).

  // Legs
  const cl = kidClothesGeometry();   // v1.120: shaped shirt, jeans, sleeves and sneakers (same boxes; buildKidClothes adds trim)
  // v1.199 (D.21 step 3): in shorts the leg is bare (a slimmer leg in the skin) and the shorts are its child
  const shortsId = KID_SHORTS[p.shorts] ? p.shorts : null;
  if (shortsId && !_kidBareLegGeo) _kidBareLegGeo = new THREE.BoxGeometry(0.12, 0.55, 0.135);
  const legGeo = shortsId ? _kidBareLegGeo : cl.leg, legMat = shortsId ? skin : pants;
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.1, 0.275, 0); legL.castShadow = true; group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.1, 0.275, 0); legR.castShadow = true; group.add(legR);
  const shorts = shortsId ? [buildKidShorts(shortsId, legR, skin, -1), buildKidShorts(shortsId, legL, skin, 1)] : null;

  // Shoes
  const shoeL = new THREE.Mesh(cl.shoe, shoes);
  shoeL.position.set(-0.1, 0.04, 0.04); shoeL.castShadow = true; group.add(shoeL);
  const shoeR = new THREE.Mesh(cl.shoe, shoes);
  shoeR.position.set(0.1, 0.04, 0.04); shoeR.castShadow = true; group.add(shoeR);

  // Torso
  const torso = new THREE.Mesh(cl.torso, shirt);
  torso.position.set(0, 0.8, 0); torso.castShadow = true; group.add(torso);

  // Arms — v1.80: TWO-SEGMENT ELBOW RIG. Each arm is now a shoulder pivot Group
  // (positioned at the shoulder anchor) containing an upper-arm box that hangs
  // down to an elbow pivot Group, which contains a forearm box ending in the
  // hand. setKidGunHold runs 2-bone IK on the shoulder+elbow rotations so the
  // hand reaches its target with a natural bend (no more stiff straight plank).
  // The gun arm (R) is on the kid's RIGHT (-X); the off arm (L) on +X reaches
  // across. Builder helper returns { shoulder, upper, elbow, fore, hand }.
  // Lengths: upper 0.24m + fore 0.21m = 0.45m total (matches the old arm).
  const U_LEN = 0.24, F_LEN = 0.21;
  const SHOULDER_Y = 1.045;   // old arm top (arm center 0.82 + half 0.225)
  function buildArm(sx) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, SHOULDER_Y, 0);
    const upper = new THREE.Mesh(cl.upper, shirt);   // v1.120: a t-shirt sleeve with a hem
    upper.position.set(0, -U_LEN / 2, 0);   // hangs DOWN from the shoulder pivot
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.set(0, -U_LEN, 0);        // at the bottom of the upper arm
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.10, F_LEN, 0.115), skin);
    fore.position.set(0, -F_LEN / 2, 0);     // hangs DOWN from the elbow pivot
    fore.castShadow = true;
    elbow.add(fore);
    const hand = new THREE.Mesh(kidHandGeometry(sx < 0 ? 1 : -1), skin);   // v1.119: a hand, not a block (thumb toward the body)
    hand.position.set(0, -F_LEN, 0);         // at the end of the forearm
    hand.castShadow = true;
    elbow.add(hand);
    group.add(shoulder);
    return { shoulder, upper, elbow, fore, hand };
  }
  const armRig_R = buildArm(-0.27);   // gun arm (kid's right)
  const armRig_L = buildArm(0.27);    // off arm (kid's left)
  // Back-compat aliases: pose code historically referenced armR/handR etc. We now
  // point those at the SHOULDER pivot (armR/armL) and the HAND mesh (handR/handL),
  // so any leftover reads resolve to a sensible node. The IK in setKidGunHold uses
  // the full rigs (kid.pose.rigR/rigL).
  const armR = armRig_R.shoulder, armL = armRig_L.shoulder;
  const handR = armRig_R.hand,    handL = armRig_L.hand;

  // Neck
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), skin);
  neck.position.set(0, 1.08, 0); group.add(neck);

  // Head
  // v1.118: a rounded head (same 0.28 m cube, edges rounded 4 cm) carrying the face as its children (buildKidFace).
  const head = new THREE.Mesh(kidHeadGeometry(), skin);
  head.position.set(0, 1.26, 0); head.castShadow = true; group.add(head);

  // === HAIR — varies by style ===
  // Each style is positioned relative to head center (y=1.26) and front (z=+0.14).
  // hairMesh references the *primary* hair piece for hit-flash convenience.
  // v1.14c: every head-attached decoration mesh (extra hair strands, fringe,
  // puffs, eyes, glasses) is also pushed to `headExtras` so the crouch pose can
  // lower ALL of them together — previously only the primary cap moved, leaving
  // wavy/curly/long strands (and glasses) floating at standing height.
  const headExtras = [];
  let hairMesh;
  switch (p.hairStyle) {
    case 'long': {
      // Long: cap on top + falls down behind the head and slightly past the shoulders
      hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), hair);
      hairMesh.position.set(0, 1.42, 0); hairMesh.castShadow = true; group.add(hairMesh);
      // Back curtain — long hair behind the head and onto the shoulders
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.06), hair);
      back.position.set(0, 1.15, -0.13); back.castShadow = true; group.add(back);
      // Side strands
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.18), hair);
      sideL.position.set(-0.15, 1.20, -0.02); group.add(sideL);
      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.18), hair);
      sideR.position.set(0.15, 1.20, -0.02); group.add(sideR);
      headExtras.push(back, sideL, sideR);
      break;
    }
    case 'wavy': {
      // Wavy: chunkier cap with slight forward overhang, layered
      hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), hair);
      hairMesh.position.set(0, 1.43, 0); hairMesh.castShadow = true; group.add(hairMesh);
      // Forward fringe — small piece overhanging the brow
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), hair);
      fringe.position.set(0, 1.38, 0.14); group.add(fringe);
      // Side wave hints
      const waveL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.22), hair);
      waveL.position.set(-0.16, 1.35, 0.02); group.add(waveL);
      const waveR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.22), hair);
      waveR.position.set(0.16, 1.35, 0.02); group.add(waveR);
      headExtras.push(fringe, waveL, waveR);
      break;
    }
    case 'curly': {
      // Curly: bumpy cap made of 3 stacked blocks for "puffy" silhouette
      hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), hair);
      hairMesh.position.set(0, 1.42, 0); hairMesh.castShadow = true; group.add(hairMesh);
      const puff1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), hair);
      puff1.position.set(-0.08, 1.48, -0.04); group.add(puff1);
      const puff2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), hair);
      puff2.position.set(0.09, 1.49, 0.03); group.add(puff2);
      const puff3 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.16), hair);
      puff3.position.set(0, 1.51, 0.08); group.add(puff3);
      headExtras.push(puff1, puff2, puff3);
      break;
    }
    case 'short':
    default: {
      // Short: simple cap (the original)
      hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), hair);
      hairMesh.position.set(0, 1.42, 0); hairMesh.castShadow = true; group.add(hairMesh);
      break;
    }
  }

  // v1.197 (D.21 step 1): a hat over the hair; it lowers with the head on a crouch. A cap or bucket hat hides the
  // curly puffs that would poke through its crown (curly's headExtras are the three puffs).
  let hat = null;
  if (p.hat && KID_HATS[p.hat]) {
    hat = buildKidHat(p.hat);
    group.add(hat);
    if (p.hairStyle === 'curly' && KID_HATS[p.hat].kind !== 'bandana') for (const m of headExtras) m.visible = false;
    headExtras.push(hat);
  } else if (p.crewColor != null && CREW_COLORS.some(c => c.hex === p.crewColor)) {
    // v1.200 (D.21, your crew): no hat on, so the crew's bandana in its colour; you and your allies wear it
    hat = buildKidHat('bandana_red', p.crewColor);
    hat.userData.crewBandana = true;
    group.add(hat);
    headExtras.push(hat);
  }

  // v1.118 (backlog D.3 step 3, the kids: faces): the two black squares became a face on the head: eye whites, irises
  // and pupils, brows in the hair colour, a nose, ears and a mouth, and open glasses frames the eyes show through. It
  // is parented to the head, so it follows the crouch drop and the aim tilt; eyeL/eyeR are anchors at the eyes.
  const { eyeL, eyeR } = buildKidFace(head, p, skin, hair);
  // Gun in right hand (oriented to point along +Z when group faces +Z).
  // v1.28e: silhouette now matches the enemy's actual weapon class.
  const gunGroup = buildEnemyGunMesh(weapon);
  gunGroup.userData.gunParts = gunGroup.children.slice();   // v1.337: the gun's own pieces (crewKidOwnGun swaps them)
  gunGroup.position.set(-0.27, 0.62, 0.1);   // v1.78: kid's RIGHT side (was +0.27, read left-handed)
  group.add(gunGroup);

  buildKidClothes(p, { torso, shoeL, shoeR, shirt });   // v1.120: collar, hem and chest trim, belt, sneaker soles
  // v1.198 (D.21 step 2): the top's front on the torso; a hoodie's sleeves run down the forearms to a cuff at the wrist
  let topMesh = null;
  if (top) {
    topMesh = buildKidTop(top); torso.add(topMesh);
    if (KID_TOPS[top].kind === 'hoodie') for (const rig of [armRig_R, armRig_L]) {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.17, 0.123), shirt);
      sl.position.set(0, 0.02, 0); sl.castShadow = true; sl.userData.kidSleeve = true; rig.fore.add(sl);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.125), _kidFaceMat('topRib', new THREE.Color(KID_TOPS[top].color).multiplyScalar(0.78).getHex(), 0.9));
      cuff.position.set(0, -0.072, 0); rig.fore.add(cuff);
    }
  }

  return {
    group, head, torso, eyeL, eyeR, gunGroup, hat, top: topMesh, shorts,   // v1.197: hat; v1.198: top; v1.199: shorts [R, L]
    parts: { head, torso, hairMesh, neck },
    // v1.14b: parts + their base transforms for a real crouch POSE (instead of
    // sinking the whole group into the ground). Feet stay planted; the body
    // compresses and the legs bend.
    pose: {
      legL, legR, shoeL, shoeR, torso, armL, armR, handL, handR, neck, head, gunGroup,
      hair: hairMesh, eyeL, eyeR,
      // v1.80: full two-segment rigs for the IK in setKidGunHold.
      rigR: armRig_R, rigL: armRig_L,
      // v1.14c: all extra head-attached meshes (hair strands/puffs/fringe,
      // glasses) + their base Y, so the crouch pose lowers them with the head.
      headExtras: headExtras.map(m => ({ mesh: m, baseY: m.position.y })),
      base: {
        legL_y: legL.position.y, legR_y: legR.position.y,
        shoeL_z: shoeL.position.z, shoeR_z: shoeR.position.z,
        legL_x: legL.position.x, legR_x: legR.position.x, shoe_y: shoeL.position.y,   // v1.171: the walk moves them
        torso_y: torso.position.y,
        neck_y: neck.position.y, head_y: head.position.y, gun_y: gunGroup.position.y,
        // v1.78: base X/Z so poses can move limbs and restore them exactly,
        // independent of the handedness sign (gun + gun arm now on -X).
        gun_x: gunGroup.position.x, gun_z: gunGroup.position.z,
        // v1.80: elbow-rig anchors. The shoulder pivots live at the shoulder
        // anchor (SHOULDER_Y); the IK resolves shoulder/elbow rotations from these.
        shoulderR_x: armRig_R.shoulder.position.x, shoulderL_x: armRig_L.shoulder.position.x,
        shoulder_y: SHOULDER_Y, U_LEN, F_LEN,
        hair_y: hairMesh ? hairMesh.position.y : 0,
        eyeL_y: eyeL.position.y, eyeR_y: eyeR.position.y,
        legScaleY: legL.scale.y,
      },
      crouch: 0, // current crouch amount 0..1 (set by setKidCrouch)
    },
    scaleY, scaleXZ,
  };
}

// ---------------------------------------------------------------------
// CROUCH POSE (v1.14b)
// ---------------------------------------------------------------------
// Replaces the old "sink group.position.y by 0.45" hack (which buried the legs
// in the ground / made kids look legless). Here we keep feet planted at Y=0 and
// compress the body: legs scale down + bend, everything above the knees lowers
// to match. `amount` is 0 (standing) .. 1 (full crouch). Returns the world-space
// vertical drop of the head/torso so hit detection / muzzle math can follow.
function setKidCrouch(kid, amount) {
  const po = kid.pose;
  if (!po) return 0;
  amount = Math.max(0, Math.min(1, amount));
  po.crouch = amount;
  const b = po.base;

  // v1.80: reset both ELBOW RIGS to a clean hanging base each frame so (a) the
  // pose pass's IK starts fresh, and (b) euler poses that run WITHOUT the IK (hit
  // pose, zombie reach) drive known nodes. A rest arm hangs straight down: shoulder
  // pivot at its anchor (X + SHOULDER_Y, dropped by hipDrop below), identity
  // rotations on shoulder + elbow, segment scales 1, elbow back at -U_LEN.
  for (const rig of [po.rigR, po.rigL]) {
    if (!rig) continue;
    rig.shoulder.rotation.set(0, 0, 0);
    rig.shoulder.quaternion.set(0, 0, 0, 1);
    rig.elbow.rotation.set(0, 0, 0);
    rig.elbow.quaternion.set(0, 0, 0, 1);
    rig.elbow.position.set(0, -b.U_LEN, 0);
    rig.upper.scale.set(1, 1, 1);
    rig.fore.scale.set(1, 1, 1);
    rig.hand.position.set(0, -b.F_LEN, 0);
  }

  // Legs: squash vertically (knees bend) so their TOP drops while feet stay put.
  // A leg centered at y=0.275 with height 0.55 has its base at 0; scaling Y about
  // the mesh center would lift the foot, so we also re-lower the center to keep
  // the foot planted. legShrink: full crouch keeps ~55% of leg height.
  const legShrink = 1 - 0.45 * amount;       // 1.0 → 0.55
  const legHalf0 = 0.275;                      // original center height (= half the 0.55 leg)
  po.legL.scale.y = b.legScaleY * legShrink;
  po.legR.scale.y = b.legScaleY * legShrink;
  // New center so the bottom of the (shrunk) leg stays at y=0: center = half*shrink
  po.legL.position.y = legHalf0 * legShrink;
  po.legR.position.y = legHalf0 * legShrink;
  // Knees forward a touch (rotate the legs slightly so it reads as a crouch, not
  // just a squash). Subtle — these are blocky kids.
  po.legL.rotation.x = 0.25 * amount;
  po.legR.rotation.x = 0.25 * amount;
  // v1.171: the walk swings the legs from the hip and carries the shoes with the feet; start each frame from rest
  if (b.legL_x != null) {
    po.legL.rotation.z = 0; po.legR.rotation.z = 0;
    po.legL.position.x = b.legL_x; po.legR.position.x = b.legR_x;
    po.legL.position.z = 0; po.legR.position.z = 0;
    po.shoeL.position.set(b.legL_x, b.shoe_y, b.shoeL_z); po.shoeR.position.set(b.legR_x, b.shoe_y, b.shoeR_z);
    po.shoeL.rotation.x = 0; po.shoeR.rotation.x = 0;
    po.torso.rotation.z = 0;
  }

  // How far the hips dropped = the lost leg height above the knee line.
  const hipDrop = (0.55 * (1 - legShrink)); // total leg-height lost

  // Everything from the torso up lowers by hipDrop (feet planted, body sinks down).
  po.torso.position.y = b.torso_y - hipDrop;
  // v1.80: drop the SHOULDER PIVOTS by hipDrop (the whole arm rig follows).
  po.rigR.shoulder.position.set(b.shoulderR_x, b.shoulder_y - hipDrop, 0);
  po.rigL.shoulder.position.set(b.shoulderL_x, b.shoulder_y - hipDrop, 0);
  po.neck.position.y  = b.neck_y  - hipDrop;
  po.head.position.y  = b.head_y  - hipDrop;
  po.gunGroup.position.y = b.gun_y - hipDrop;
  if (po.hair) po.hair.position.y = b.hair_y - hipDrop;
  // v1.14c: lower every extra head-attached mesh (hair strands/puffs/fringe,
  // glasses) by the same hipDrop so nothing stays floating at standing height.
  if (po.headExtras) {
    for (const ex of po.headExtras) ex.mesh.position.y = ex.baseY - hipDrop;
  }
  // Lean the torso forward slightly when crouched (hunkering down).
  po.torso.rotation.x = 0.12 * amount;

  // Return the head's vertical drop in LOCAL space (caller multiplies by scaleY).
  return hipDrop;
}

// ---------------------------------------------------------------------
// HIT POSE (v1.28e) — the airsoft "I'm hit!" signal
// ---------------------------------------------------------------------
// Instead of slumping/sinking into the ground (players vanished on slopes),
// a tagged kid stands still and raises their gun-arm straight up. `amount` is
// 0 (normal) .. 1 (fully raised); the death branch ramps it toward 1 so the
// raise animates over a beat. Feet stay planted at terrain height.
// v1.261 (backlog D.45, Michael 16 Oct: "Enemies should wince/react based on where they are hit for a second or two
// after they are shot"): where the BB landed on him (kidHitPart, from its height up his body and how far off his
// middle) picks a flinch that plays for WINCE_S over whatever else he is doing (the hand up when he is out, the walk
// back, the fight): a head shot snaps his head back and his free hand to his face; the chest, a hunch forward with the
// hand on it; an arm, his free hand grabs the gun arm (or the hit left arm is shaken out); a leg, he buckles toward it
// with the hand on the thigh. In a fifth of a second, held half a second, eased off over the next second.
const WINCE_S = 1.5;
const _WINCE_Q = new THREE.Quaternion(), _WINCE_E = new THREE.Euler();
function kidHitPart(c, p) {
  const v = combatantView(c), foot = v.chestY - v.height * 0.65, h = (p.y - foot) / v.height;
  const yaw = c.mesh.group.rotation.y, lx = (p.x - c.pos.x) * Math.cos(yaw) - (p.z - c.pos.z) * Math.sin(yaw);
  const side = lx < 0 ? -1 : 1;   // −1: his right, the gun side (local −x)
  const part = h > 0.8 ? 'head' : h < 0.45 ? 'leg' : Math.abs(lx) > 0.17 * (c.mesh.scaleXZ || 1) ? 'arm' : 'chest';
  return { part, side, h: +h.toFixed(2) };
}
function startKidWince(c, bb) {
  if (!c || !c.mesh || !c.mesh.pose || !bb || !bb.pos) return;
  c._wince = Object.assign(kidHitPart(c, bb.pos), { t: 0 });
}
function kidWinceStep(dt) {
  for (const e of Game.scenario.enemies) {
    const W = e._wince;
    if (!W || !e.mesh || !e.mesh.pose) continue;
    const g = e.mesh.group, L = e.mesh.pose.rigL, A = e._winceSet;
    // last step's lean comes off first, unless the kid's own update has set the group since (it sets it most steps)
    if (A && g.rotation.x === A.x) g.rotation.x -= A.dx;
    if (A && g.rotation.z === A.z) g.rotation.z -= A.dz;
    W.t += dt;
    const w = W.t < 0.2 ? W.t / 0.2 : W.t < 0.7 ? 1 : Math.max(0, 1 - (W.t - 0.7) / (WINCE_S - 0.7));
    // the free arm: from where his own pose has it this step (or had it, if nothing has posed it since) toward the spot
    let dx = 0, dz = 0, aS, aE;
    if (W.part === 'head') { dx = -0.16 * w; aS = [-2.3, -0.35]; aE = -1.3; }
    else if (W.part === 'chest') { dx = 0.18 * w; aS = [-1.0, -0.55]; aE = -1.5; }
    else if (W.part === 'arm' && W.side < 0) { dz = -0.06 * w; aS = [-0.8, -0.85]; aE = -1.2; }
    else if (W.part === 'arm') { dz = 0.08 * w; aS = [-0.3, 0.7]; aE = -0.4; }
    else { dz = -0.13 * W.side * w; dx = 0.08 * w; aS = [-0.35, -0.15]; aE = -0.3; }
    const sq = L.shoulder.quaternion, eq = L.elbow.quaternion, M = e._winceArm;
    const kept = M && sq.equals(M.setS) && eq.equals(M.setE);
    const bS = kept ? M.baseS : sq.clone(), bE = kept ? M.baseE : eq.clone();
    sq.copy(bS).slerp(_WINCE_Q.setFromEuler(_WINCE_E.set(aS[0], 0, aS[1])), w);
    eq.copy(bE).slerp(_WINCE_Q.setFromEuler(_WINCE_E.set(aE, 0, 0)), w);
    e._winceArm = { baseS: bS, baseE: bE, setS: sq.clone(), setE: eq.clone() };
    g.rotation.x += dx; g.rotation.z += dz;
    e._winceSet = { x: g.rotation.x, z: g.rotation.z, dx, dz };
    if (W.t >= WINCE_S) { e._wince = null; e._winceSet = null; e._winceArm = null; }
  }
}
function setKidHitPose(kid, amount) {
  const po = kid.pose;
  if (!po) return;
  amount = Math.max(0, Math.min(1, amount));
  const b = po.base;
  // Make sure any crouch is released first so the body stands tall (this also
  // resets both rigs to a clean hanging base via setKidCrouch).
  // v1.167: always, not only when crouched: a standing kid tagged mid-hold kept the hold's IK quaternions, so the
  // raise below only overwrote the shoulder's x angle and the off arm went on reaching for the foregrip (backlog B.6).
  setKidCrouch(kid, 0);
  // v1.80: the gun arm now pivots at the SHOULDER group. Rotate the right shoulder
  // about X so the whole (straight) arm swings up & back to point skyward — a
  // clear "I'm hit!" signal — with a slight elbow bend so it doesn't read stiff.
  const raise = amount;
  po.rigR.shoulder.rotation.x = -2.6 * raise;   // swing arm overhead
  po.rigR.elbow.rotation.x = 0.4 * raise;        // slight elbow bend
  // Gun lifts overhead and points UP (its barrel runs +Z locally; rotate so +Z
  // faces +Y → muzzle to the sky). The gun is still parented to the body group
  // (not the hand), so drive it directly to ride above the raised arm.
  // v1.167: it rides IN the raised hand: the grip is put on the hand's point in the kid's frame (it sat 16-33 cm
  // from the hand, beside the arm, before).
  const th = -Math.PI / 2 * raise;
  po.gunGroup.rotation.x = th;                       // tip the muzzle up
  kid.group.updateMatrixWorld(true);
  const hp = kid.group.worldToLocal(po.rigR.hand.getWorldPosition(new THREE.Vector3()));
  const gr = gunGripLocal(null), c = Math.cos(th), s = Math.sin(th);
  po.gunGroup.position.set(hp.x - gr.x, hp.y - (gr.y * c - gr.z * s), hp.z - (gr.y * s + gr.z * c));
  po._hitRaise = amount;
}

// ---------------------------------------------------------------------
// GUN HOLD (v1.78) — handedness-correct one/two-handed holds
// ---------------------------------------------------------------------
// Single authority for where the gun + both hands sit, layered on top of the
// crouch base each frame. The gun lives on the kid's RIGHT (armR/handR/gunGroup,
// local -X); the off-hand (armL/handL, +X) reaches across for two-handed holds.
//
//   mode 'rest' : not firing.
//       - small gun (pistol/mac10): gun at the right hip-ish, off-hand at side.
//       - large gun: off-hand rests across on the foregrip (always two-handed).
//   mode 'aim'  : firing / aiming.
//       - small gun: BOTH hands push the gun straight out in front of the chest
//         (centered, arms forward).
//       - large gun: gun tucks into the right shoulder, off-hand across on the
//         foregrip, slight forward lean down the sights.
//   `t` 0..1 eases rest→aim (the caller ramps it). `lift` adds extra muzzle
//   height for the over-cover case (replaces the old setKidAdsTall lift).
//
// Composes after setKidCrouch (which resets limbs to base ∓ hipDrop): we read
// the CURRENT arm/hand/gun Y (post-crouch) as the anchor so a crouched kid still
// holds the gun correctly. Rotations and X/Z are set absolutely from base.
// v1.80: module-level scratch math for the 2-bone IK in setKidGunHold (avoids
// allocating a dozen Vector3/Quaternion per kid per frame).
const _IK_Sv = new THREE.Vector3(), _IK_Hv = new THREE.Vector3(), _IK_axis = new THREE.Vector3();
const _IK_up = new THREE.Vector3(0, -1, 0);
const _IK_elbow = new THREE.Vector3(), _IK_perp = new THREE.Vector3(), _IK_hint = new THREE.Vector3();
const _IK_qS = new THREE.Quaternion(), _IK_qSinv = new THREE.Quaternion();
const _IK_segUp = new THREE.Vector3(), _IK_segFore = new THREE.Vector3();
function setKidGunHold(kid, weapon, t = 0, lift = 0) {
  const po = kid.pose;
  if (!po) return;
  t = Math.max(0, Math.min(1, t));
  const b = po.base;
  const small = isSmallGun(weapon);
  // Crouch drop: the shoulder pivots were lowered by hipDrop in setKidCrouch; the
  // IK targets must use the same drop so the hands meet the (also-dropped) gun.
  const c = po.crouch || 0;
  const hipDrop = 0.55 * (0.45 * c);
  const SY = b.shoulder_y - hipDrop;            // shoulder pivot height this frame
  const U = b.U_LEN, F = b.F_LEN;

  // v1.81: 2-BONE IK with an explicit BEND HINT. Given a shoulder pivot at S and a
  // hand target H, compute the ELBOW point (two-bone solution: the point at dist U
  // from S and F from H), pushed off the S→H axis toward `hint` so the joint kicks
  // the way a real elbow would. Then orient the shoulder S→elbow and the elbow
  // elbow→H so the forearm tip lands exactly on H. The hint is the fix for the
  // "elbow bends the wrong way" report: the gun (right) arm bends OUT to the right
  // (-X) and down; the off (left) arm bends OUT to the left (+X) and down; resting
  // arms bend gently backward (-Z) so they hang naturally.
  function solveArm(rig, hx, hy, hz, hintX, hintY, hintZ) {
    const _Sv = _IK_Sv, _Hv = _IK_Hv, _axis = _IK_axis, _up = _IK_up,
          _elbow = _IK_elbow, _perp = _IK_perp, _hint = _IK_hint,
          _qS = _IK_qS, _qSinv = _IK_qSinv, _segUp = _IK_segUp, _segFore = _IK_segFore;
    _Sv.set(rig.shoulder.position.x, rig.shoulder.position.y, rig.shoulder.position.z);
    _Hv.set(hx, hy, hz);
    _axis.subVectors(_Hv, _Sv);
    let d = _axis.length();
    const maxR = (U + F) * 0.999, minR = Math.abs(U - F) + 0.02;
    d = Math.max(minR, Math.min(maxR, d));
    if (_axis.lengthSq() < 1e-9) _axis.set(0, -1, 0);
    _axis.normalize();
    _Hv.copy(_Sv).addScaledVector(_axis, d);    // clamped hand point
    const along = (U * U - F * F + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, U * U - along * along));   // elbow off-axis dist
    _hint.set(hintX, hintY, hintZ).normalize();
    _perp.copy(_hint).addScaledVector(_axis, -_hint.dot(_axis));   // perpendicularize
    if (_perp.lengthSq() < 1e-6) { _perp.set(0, -1, 0).addScaledVector(_axis, -_axis.y * -1); }
    _perp.normalize();
    _elbow.copy(_Sv).addScaledVector(_axis, along).addScaledVector(_perp, h);
    _segUp.subVectors(_elbow, _Sv).normalize();
    _qS.setFromUnitVectors(_up, _segUp);
    rig.shoulder.quaternion.copy(_qS);
    _segFore.subVectors(_Hv, _elbow).normalize();
    _qSinv.copy(_qS).invert();
    _segFore.applyQuaternion(_qSinv);
    rig.elbow.quaternion.setFromUnitVectors(_up, _segFore);
  }

  // Helper: world hand target from a gun-local grip offset (gun barrel is +Z).
  // The gun has no Y-rotation in local space (it inherits the kid's yaw via the
  // group), so gun-local maps directly to kid-local: add the offset to the gun
  // group position. Returns [x,y,z].
  function gripPoint(gx, gy, gz, off) {
    return [gx + off.x, gy + off.y, gz + off.z];
  }

  if (small) {
    // ---- SMALL GUN (pistol, mac10) ----
    // The grip sits 0.08 below the gun origin, and a hanging hand only reaches down
    // to ~0.60 (shoulder 1.045 − arm 0.45), so the gun must ride fairly HIGH for the
    // hand to actually meet the grip. Rest: gun at the right side, ~waist/chest, the
    // firing hand on the grip, off-hand at its side. Aim: gun centers, rises, pushes
    // forward; BOTH hands grip it. All targets kept within arm reach (~0.42m).
    const restX = b.gun_x, aimX = 0.0;
    const gunX = restX * (1 - t) + aimX * t;        // -0.27 → 0 (centers)
    const gunY = 0.74 * (1 - t) + 0.88 * t;         // ride high enough to reach the grip
    const gunZ = 0.13 * (1 - t) + 0.18 * t;         // forward, off the body
    po.gunGroup.position.set(gunX, gunY, gunZ);
    po.gunGroup.rotation.x = 0;
    const grip = gunGripLocal(weapon);
    const gp = gripPoint(gunX, gunY, gunZ, grip);   // firing-hand grip world point
    // Firing (right) hand: always on the grip. Elbow bends out-right (-X) + down.
    solveArm(po.rigR, gp[0], gp[1], gp[2], -1, -0.5, -0.2);
    // Off (left) hand: hangs at its side at rest, comes to the grip on aim.
    const restLX = 0.27, restLY = SY - (U + F) * 0.94, restLZ = 0.06;
    const oLX = restLX * (1 - t) + gp[0] * t;
    const oLY = restLY * (1 - t) + gp[1] * t;
    const oLZ = restLZ * (1 - t) + (gp[2] - 0.02) * t;
    solveArm(po.rigL, oLX, oLY, oLZ, 1, -0.5, -0.2);
  } else {
    // ---- LARGE GUN: two-handed ALWAYS ----
    // The off-hand (left shoulder) reaching a foregrip is the binding constraint:
    // it can only reach a grip near body-CENTER, never one tucked off at the right
    // shoulder AND forward. So:
    //   REST: rifle carried CENTERED across the front of the body at chest height
    //     (a patrol/low-ready carry) — both hands on it, gun forward of the torso
    //     so the off-arm doesn't cut through the body.
    //   AIM: gun rises and tucks toward center-RIGHT (x~-0.10, the furthest right
    //     the off-hand can still cross-reach), with a slight forward lean.
    const aimX = -0.10, aimY = SY - 0.06, aimZ = b.gun_z + 0.06;   // tucked right, armpit-ish
    const restX = 0.0,  restY = SY - 0.18, restZ = b.gun_z + 0.10; // centered chest carry
    const gunX = restX * (1 - t) + aimX * t;
    const gunY = (restY * (1 - t) + aimY * t) + lift * t + lift * (1 - t) * 0.5;
    const gunZ = restZ * (1 - t) + aimZ * t;
    po.gunGroup.position.set(gunX, gunY, gunZ);
    po.gunGroup.rotation.x = 0;
    const grip = gunGripLocal(weapon);
    const gp = gripPoint(gunX, gunY, gunZ, grip);          // firing-hand grip
    // Off-hand grabs the NEAR handguard (reduced forward Z so the cross-reach stays
    // within arm length).
    const foreZ = gunZ + Math.min(gunForegripZ(weapon), 0.13);
    const fp = [gunX, gunY - 0.05, foreZ];
    // Firing (right) hand on the grip; elbow OUT right (-X) + down → forearm angles
    // back IN to the grip.
    solveArm(po.rigR, gp[0], gp[1], gp[2], -1, -0.45, -0.25);
    // Off (left) hand on the foregrip; elbow out-left (+X) + down.
    solveArm(po.rigL, fp[0], fp[1], fp[2], 1, -0.4, 0.05);
    // Slight forward lean down the sights when aiming.
    po.torso.rotation.x = (po.torso.rotation.x || 0) + 0.10 * t;
    po.head.rotation.x = 0.08 * t;
  }
}

// ---------------------------------------------------------------------
// WALK ANIMATION (v1.78, revised v1.79) — subtle locomotion swing
// ---------------------------------------------------------------------
// Adds a gentle opposed LEG swing + faint torso bob while a kid actually moves.
// v1.79: the arms are now governed entirely by setKidGunHold via quaternions
// (shoulder-anchored), so walk no longer touches the arms — swinging the off-arm
// would either break the two-handed hold or fight the quaternion. Legs are
// independent center-pivot boxes, so a small rotation.x swing reads fine. `phase`
// advances only while moving; `intensity` is eased from real displacement so a
// stopped kid settles. At intensity ~0 we early-out (legs keep their crouch base).
// v1.171 (backlog D.16 A, Michael: C, A first): planted feet. The legs used to swing ±14° about their middles at a
// fixed beat while the shoes stayed put under the hips, so at 2.5-3.5 m/s the feet slid along at the kid's full
// speed. Now each leg hangs from its hip and the gait is laid out from the kid's real velocity in his own frame
// (vf forward, vs to his left, m/s): a foot in stance goes back under him at exactly his speed, so it stays where it
// was put on the ground, and sideways or backward steps are planted too. The swing foot lifts on the way forward
// (the leg is one piece, so it shortens for the knee) and the shoe tips toe-down off the ground and heel-down into
// it. The hips ride as high as the stance leg allows, which gives the bob, and roll a little over the stance foot.
// Cadence rises with speed (f = 0.75 + 0.35 v cycles a second, quicker still when the stride would outgrow the leg).
// A foot is down 52% of the cycle, so one is always on the ground: a run with both feet up skated the low foot along
// at his whole speed. The swing is a Hermite curve that leaves and lands moving back under him at his speed, so the
// foot is still in the world as it lifts and as it touches down (a cosine swing starts and stops dead under the hip,
// which skids the foot forward at his speed while it is still at the ground). `phase` runs 2π a cycle; the right leg
// is half a cycle behind the left.
function setKidWalk(kid, phase, intensity, vf, vs, duty) {
  const po = kid.pose;
  if (!po) return;
  intensity = Math.max(0, Math.min(1, intensity));
  if (intensity <= 0.02) return;   // settled — base/hold stance stands
  const b = po.base;
  if (vf == null) { vf = 2.0 * intensity; vs = 0; }   // a caller with no velocity (the ladder's foot): a plain walk
  vs = vs || 0;
  const v = Math.hypot(vf, vs);
  if (duty == null) duty = kidGaitDuty(v);
  const sxz = kid.scaleXZ || 1;
  const shrink = po.legL.scale.y / (b.legScaleY || 1);   // the crouch's leg shrink, set this frame
  const f = kidGaitCadence(v, sxz * shrink);
  const h = 0.55 * shrink;                                 // leg length, hip to sole (local)
  // half the ground a stance foot covers under the hip, in local units, each way; capped at 0.6 of the leg
  const cap = 0.6 * h;
  const Df = Math.max(-cap, Math.min(cap, (vf / sxz) * duty / (2 * f)));
  const Ds = Math.max(-cap, Math.min(cap, (vs / sxz) * duty / (2 * f)));
  const liftAmt = Math.min(0.1, 0.03 + 0.02 * v) * shrink;
  const u0 = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  const legs = [
    { leg: po.legL, shoe: po.shoeL, x: b.legL_x, z0: b.shoeL_z, u: u0 },
    { leg: po.legR, shoe: po.shoeR, x: b.legR_x, z0: b.shoeR_z, u: (u0 + 0.5) % 1 },
  ];
  let H = null, stanceRoll = 0;
  for (const L of legs) {
    let k, w;
    if (L.u < duty) { k = L.u / duty; w = 1 - 2 * k; L.lift = 0; L.stance = true; L.tip = 0; }
    else {
      k = (L.u - duty) / (1 - duty);
      const m = -2 * (1 - duty) / duty;   // the stance's own rate of travel, at both ends of the swing
      w = (-4 * k * k * k + 6 * k * k - 1) + m * (2 * k * k * k - 3 * k * k + k);
      L.lift = Math.sin(Math.PI * k) * liftAmt; L.stance = false;
      L.tip = 0.35 * Math.sin(Math.PI * k) * Math.cos(Math.PI * k) * Math.min(1, v / 2);   // toe down, then heel down
    }
    L.oz = Df * w; L.ox = Ds * w;   // the foot's place relative to the hip (+z forward, +x to his left)
    if (L.stance) {
      const hh = Math.sqrt(Math.max(0, h * h - L.oz * L.oz - L.ox * L.ox));
      H = H == null ? hh : Math.min(H, hh);
      stanceRoll += (L.x < 0 ? 1 : -1);   // +z roll tips the top toward -x
    }
  }
  if (H == null) H = Math.sqrt(Math.max(0, h * h - Df * Df - Ds * Ds));   // between stances: no flight, the low point
  for (const L of legs) {
    const y = Math.max(0.05, H - L.lift);
    const len = Math.min(h, Math.hypot(y, L.ox, L.oz));
    // the leg's -y runs from the hip to the foot: rotation.z leans it sideways, rotation.x fore and aft
    L.leg.rotation.z = Math.asin(Math.max(-1, Math.min(1, L.ox / len)));
    L.leg.rotation.x = Math.atan2(-L.oz, y);
    L.leg.scale.y = (b.legScaleY || 1) * (len / 0.55);
    L.leg.position.set(L.x + L.ox / 2, H - y / 2 + (h - H), L.oz / 2);
    // the shoe sits on the foot; its rest offset from the sole point is (0, shoe_y, shoe_z)
    L.shoe.position.set(L.x + L.ox, (h - H) + L.lift + b.shoe_y, L.oz + L.z0);
    L.shoe.rotation.x = L.tip;
  }
  // The hips sit at H, not h: everything above them comes down by h - H. The leg tops sit at h above the soles,
  // so lower the legs and shoes by the same and the whole kid keeps his soles on the ground.
  const drop = h - H;
  for (const L of legs) { L.leg.position.y -= drop; L.shoe.position.y -= drop; }
  kidLowerUpper(po, drop);
  // a little roll over the stance foot (none when both or neither are down)
  po.torso.rotation.z = 0.035 * Math.max(-1, Math.min(1, stanceRoll)) * Math.min(1, v / 2) * intensity;
}

// v1.171: the gait's beat and the share of it a foot spends on the ground, from speed (m/s). `reach` is the kid's
// leg against the standard 0.55 m (his width scale times the crouch's leg shrink): a fast or short-legged kid steps
// quicker, so a stance foot never has to cover more than 90% of the stride cap (above it the foot would slide).
function kidGaitCadence(v, reach) {
  const f0 = 0.75 + 0.35 * Math.min(4, v);
  const fFit = v * kidGaitDuty(v) / (2 * 0.9 * 0.6 * 0.55 * (reach || 1));
  return Math.min(3.5, Math.max(f0, fFit));
}
function kidGaitDuty(v) { return 0.52; }

// v1.183 (backlog D.16 B, Michael: A on D.20): weight. A kid's body (e.yaw, which his mesh and his hitboxes follow)
// turns toward where he wants to face over about 0.2 s, capped at 14 rad/s, instead of snapping there every frame;
// spawnEnemyBB holds the shot while his body is more than KID_FIRE_TURN off the line to his target.
const KID_TURN_RATE = 14, KID_TURN_EASE = 15, KID_FIRE_TURN = 0.6;
function kidTurnToward(e, want, dt) {
  if (typeof e.yaw !== 'number' || !isFinite(e.yaw) || !(dt > 0)) { e.yaw = want; return; }
  const d = Math.atan2(Math.sin(want - e.yaw), Math.cos(want - e.yaw));
  if (Math.abs(d) < 0.002) { e.yaw = want; return; }
  const cap = KID_TURN_RATE * dt;
  const y = e.yaw + Math.max(-cap, Math.min(cap, d * Math.min(1, dt * KID_TURN_EASE)));
  e.yaw = Math.atan2(Math.sin(y), Math.cos(y));
}
// v1.183: a kid who has stood still a moment sets off at KID_START_MIN of the speed his state asks and reaches it
// over KID_START_SEC (scaling this frame's step back along its own line, which the state already cleared).
const KID_START_MIN = 0.4, KID_START_SEC = 0.18;

// v1.171: lower everything the crouch lowers (from the torso up) by dy more, local units
function kidLowerUpper(po, dy) {
  if (!(dy > 0)) return;
  po.torso.position.y -= dy;
  po.rigR.shoulder.position.y -= dy; po.rigL.shoulder.position.y -= dy;
  po.neck.position.y -= dy; po.head.position.y -= dy; po.gunGroup.position.y -= dy;
  if (po.hair) po.hair.position.y -= dy;
  if (po.headExtras) for (const ex of po.headExtras) ex.mesh.position.y -= dy;
}
