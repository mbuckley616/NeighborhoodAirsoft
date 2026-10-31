
// ---------------------------------------------------------------------
// INVENTORY HELPERS
// ---------------------------------------------------------------------
// v1.60: which gun each spare-mag refId fits. Promoted to a shared top-level
// constant so the loadout pool (filtering) and the in-match feed (compatibility)
// read the same source of truth.
const MAG_GUN_FIT = {
  spare_mag_10: 'pistol',
  spare_mag_12: 'pistol',
  spare_mag_shotgun: 'shotgun',
  spare_mag_ar: 'ar',
  spare_mag_sniper: 'sniper',
  spare_mag_ak47: 'ak47',
  spare_mag_ak47_500: 'ak47',
  spare_mag_mp5: 'mp5',
  spare_mag_mp5_200: 'mp5',
  spare_mag_ump: 'ump',
  spare_mag_ump_200: 'ump',
  spare_mag_mac10: 'mac10',
  spare_mag_mac10_100: 'mac10',
  spare_mag_thunder: 'thunder',
  spare_mag_sixshooter: 'sixshooter',
  spare_mag_bucket: 'bucket',
  spare_mag_boltpistol: 'boltpistol',
  spare_mag_famas: 'famas',   // v1.325 (D.63)
  spare_mag_epistol: 'epistol', spare_mag_erifle: 'erifle',   // v1.326
  spare_mag_burst: 'burst',   // v1.327
  spare_mag_semishotgun: 'semishotgun',   // v1.328
  spare_mag_m249: 'm249',   // v1.335
  spare_mag_l96: 'l96',   // v1.336
  spare_mag_p90: 'p90',   // v1.346
  spare_mag_vector: 'vector',   // v1.348
  spare_mag_g36: 'g36',   // v1.371
  spare_mag_aug: 'aug',   // v1.372
  spare_mag_m4: 'm4',   // v1.373
  spare_mag_svd: 'svd',   // v1.395
  spare_mag_rpk: 'rpk',   // v1.396
  spare_mag_spas: 'spas',   // v1.398
  spare_mag_gas: 'gaspistol',   // v1.399
  spare_mag_thompson: 'thompson',   // v1.403
  spare_mag_m14: 'm14',   // v1.404
};

// The canonical ordered list of gun types, and the subset the player owns.
// v1.168 (backlog D.14 A, Michael: D): the four backyard guns join the end.
const ALL_GUN_TYPES = ['pistol', 'shotgun', 'ar', 'sniper', 'ak47', 'mp5', 'ump', 'mac10', 'thunder', 'sixshooter', 'bucket', 'boltpistol',
  'sprayer', 'ghost', 'ticktock', 'rattle',   // v1.250 (D.37): the cheap clear automatics
  'famas',   // v1.325 (D.63, Michael: A): the first of the new guns
  'epistol', 'erifle',   // v1.326: the electric semi-autos
  'burst',   // v1.327: the burst rifle
  'semishotgun',   // v1.328: the semi-auto shotgun
  'm249',   // v1.335 (D.63 batch 2): the light machine gun
  'l96',   // v1.336: the second sniper
  'p90',   // v1.346 (D.63 batch 2): the bullpup SMG
  'vector',   // v1.348 (D.63 batch 2): the last SMG of the batch
  'g36',   // v1.371 (D.63 batch 3): the first of the automatic rifles
  'aug',   // v1.372 (D.63 batch 3): the bullpup rifle
  'm4',   // v1.373 (D.63 batch 3): the all-round rifle
  'svd',   // v1.395 (D.63 batch 4): the battery sniper
  'rpk',   // v1.396 (D.63 batch 4): the second light machine gun
  'spas',   // v1.398 (D.63 batch 5): the second pump shotgun
  'gaspistol',   // v1.399 (D.63 batch 5): the gas blowback pistol
  'thompson',   // v1.403 (D.63 batch 5): the drum-fed SMG
  'm14'];   // v1.404 (D.63 batch 5): the marksman rifle
function getOwnedGunTypes() {
  return ALL_GUN_TYPES.filter(g => g === 'pistol' || Game.persist.owned[g]);
}

function getMaxAmmoForGun(gunType) {
  if (gunType === 'pistol') {
    if (Game.persist.owned.pistol_mag_12) return 20;
    if (Game.persist.owned.pistol_mag_10) return 10;
    return 1;
  }
  if (gunType === 'shotgun') {
    // Shotgun default is a generous 40 — buys you ~13-20 shots depending on pellet rolls
    if (Game.persist.owned.shotgun_mag_60) return 60;
    return 40;
  }
  if (gunType === 'ar') {
    if (Game.persist.owned.ar_mag_40) return 40;
    return 25;
  }
  if (gunType === 'famas') return Game.persist.owned.famas_mag_40 ? 40 : 25;   // v1.325: the AR's mags
  if (gunType === 'epistol') return Game.persist.owned.epistol_mag_30 ? 30 : 18;   // v1.326
  if (gunType === 'erifle') return Game.persist.owned.erifle_mag_60 ? 60 : 30;
  if (gunType === 'burst') return Game.persist.owned.burst_mag_150 ? 150 : 90;   // v1.327
  if (gunType === 'semishotgun') return Game.persist.owned.semishotgun_mag_90 ? 90 : 60;   // v1.328
  if (gunType === 'm249') return Game.persist.owned.m249_mag_1500 ? 1500 : 800;   // v1.335: its box
  if (gunType === 'l96') return Game.persist.owned.l96_mag_20 ? 20 : 10;   // v1.336
  if (gunType === 'p90') return Game.persist.owned.p90_mag_300 ? 300 : 200;   // v1.346: the top mag
  if (gunType === 'vector') return Game.persist.owned.vector_mag_200 ? 200 : 100;   // v1.348
  if (gunType === 'g36') return Game.persist.owned.g36_mag_470 ? 470 : 300;   // v1.371: its clear mag
  if (gunType === 'aug') return Game.persist.owned.aug_mag_500 ? 500 : 330;   // v1.372: its clear mag
  if (gunType === 'm4') return Game.persist.owned.m4_mag_450 ? 450 : 300;   // v1.373: its black curved mag
  if (gunType === 'svd') return Game.persist.owned.svd_mag_30 ? 30 : 20;   // v1.395: its curved mag
  if (gunType === 'rpk') return Game.persist.owned.rpk_mag_1000 ? 1000 : 600;   // v1.396: its drum
  if (gunType === 'm14') return Game.persist.owned.m14_mag_50 ? 50 : 30;   // v1.404: its box mag, or the long one
  if (gunType === 'thompson') return Game.persist.owned.thompson_mag_200 ? 200 : 100;   // v1.403: its drum, or the big drum
  if (gunType === 'gaspistol') return Game.persist.owned.gas_mag_25 ? 25 : 15;   // v1.399: a gas mag holds 15, the long one 25
  if (gunType === 'spas') return Game.persist.owned.spas_mag_72 ? 72 : 45;   // v1.398: 15 shells of three, or 24
  if (gunType === 'sniper') {
    if (Game.persist.owned.sniper_mag_25) return 25;
    return 15;
  }
  // v1.20: AUTO GUNS — massive magazines (per category spec).
  // AK-47 (Automatic Rifle): 350 BBs default, 500 upgraded drum.
  if (gunType === 'ak47') {
    if (Game.persist.owned.ak47_mag_500) return 500;
    return 350;
  }
  // MP5 (SMG): 150 default, 200 extended.
  if (gunType === 'mp5') {
    if (Game.persist.owned.mp5_mag_200) return 200;
    return 150;
  }
  // UMP (SMG): 100 default, 200 extended.
  if (gunType === 'ump') {
    if (Game.persist.owned.ump_mag_200) return 200;
    return 100;
  }
  // MAC-10 (Machine Pistol): 50 default, 100 extended.
  if (gunType === 'mac10') {
    if (Game.persist.owned.mac10_mag_100) return 100;
    return 50;
  }
  // v1.168: the backyard guns. The six-shooter is six, always: its cylinder is the mag.
  if (gunType === 'thunder')    return Game.persist.owned.thunder_mag_50 ? 50 : 30;
  if (gunType === 'sixshooter') return 6;
  if (gunType === 'bucket')     return Game.persist.owned.bucket_mag_1000 ? 1000 : 600;
  if (gunType === 'boltpistol') return Game.persist.owned.boltpistol_mag_12 ? 12 : 8;
  if (GUN_MAGS[gunType] && GUN_MAGS[gunType].cheap) return GUN_MAGS[gunType].baseCap;   // v1.250: one mag, no upgrade
  return 1;
}

function getGunDisplayName(gunType) {
  return getGunSpec(gunType).displayName;
}

// =====================================================================
// EQUIPMENT (v1.26) — Eyewear, Armor, Shoes, Gun Attachments
// =====================================================================
// EYEWEAR: each piece changes the in-game VIEW and may carry head armor "life".
//   view.frameStyle: which physical frame is drawn over the view (v1.28). The
//   frame renders as an SVG with lens APERTURES — the optical tint shows only
//   INSIDE the lenses, and the frame body occludes the screen edges. Styles:
//   'glasses' (thin twin lens), 'goggle' (chunky twin oval), 'mask' (full-face).
const EYEWEAR = {
  none:        { id:'none', name:'No Eye Pro', price:0, hp:0, view:null, owned:()=>true },
  // v1.63: bumped to a premium item — real protection with almost no view cost,
  // so it earns a defense rating and a higher price.
  glasses_clear:{ id:'glasses_clear', name:'Clear Safety Glasses', price:28, hp:1,
                  view:{ tint:'rgba(225,235,255,0.05)', lensTint:'rgba(220,232,255,0.10)', vignette:0.10, filter:'contrast(1.04) brightness(1.02)', frameStyle:'glasses', frameColor:'#2a2d33', label:'Clear' } },
  goggles_smoke:{ id:'goggles_smoke', name:'Smoke Goggles', price:22, hp:1,
                  view:{ tint:'rgba(30,32,46,0.20)', lensTint:'rgba(26,28,40,0.40)', vignette:0.22, filter:'brightness(0.82) saturate(0.8) contrast(1.05)', frameStyle:'goggle', frameColor:'#1c1d22', label:'Smoke' } },
  // v1.63: NEW — pool goggles pressed into airsoft duty. Rough, intrusive
  // peripheral frame (the 'swim' style draws smaller, more separated lenses so
  // the band crowds in) and a heavy dark-blue tint.
  goggles_swim:{ id:'goggles_swim', name:'Swimming Goggles', price:14, hp:1,
                  view:{ tint:'rgba(18,40,96,0.22)', lensTint:'rgba(20,46,110,0.48)', vignette:0.30, filter:'brightness(0.9) saturate(1.1) contrast(1.04) hue-rotate(8deg)', frameStyle:'swim', frameColor:'#101826', label:'Blue Tint' } },
  // v1.63: renamed Amber → Ski Goggles, bumped defense to +2 and price to $50.
  goggles_amber:{ id:'goggles_amber', name:'Ski Goggles', price:50, hp:2,
                  view:{ tint:'rgba(200,140,40,0.16)', lensTint:'rgba(208,138,36,0.34)', vignette:0.18, filter:'brightness(1.18) saturate(1.25) sepia(0.25) hue-rotate(-12deg)', frameStyle:'goggle', frameColor:'#3a2a14', label:'Amber' } },
  mesh_mask:   { id:'mesh_mask', name:'Full Mesh Mask', price:40, hp:2,
                  view:{ tint:'rgba(15,15,18,0.16)', vignette:0.42, filter:'brightness(0.9) contrast(1.06)', mesh:true, frameStyle:'mask', frameColor:'#15151a', label:'Mesh' } },
};
// ARMOR: body pieces that add to your hit pool (extra HP). Multiple slots, one
// piece per body-zone. Each piece's hp stacks into maxHits.
const ARMOR = {
  chest_light: { id:'chest_light', name:'Foam Chest Rig', price:30, zone:'chest', hp:1 },
  chest_heavy: { id:'chest_heavy', name:'Plate-Carrier Vest', price:65, zone:'chest', hp:2, requires:'chest_light' },
  knee_pads:   { id:'knee_pads',  name:'Knee Pads', price:18, zone:'legs', hp:1 },
  elbow_pads:  { id:'elbow_pads', name:'Elbow Pads', price:16, zone:'arms', hp:1 },
};
// SHOES: modify the stamina/sprint system. One pair equipped.
const SHOES = {
  none:        { id:'none', name:'Sneakers (default)', price:0, staminaMult:1.0, drainMult:1.0, rechargeMult:1.0, sprintMult:1.0, owned:()=>true },
  trail_shoes: { id:'trail_shoes', name:'Trail Runners', price:28, staminaMult:1.35, drainMult:1.0, rechargeMult:1.15, sprintMult:1.0,
                 desc:'+35% stamina pool, faster recovery. Sprint longer.' },
  track_spikes:{ id:'track_spikes', name:'Track Spikes', price:34, staminaMult:1.0, drainMult:1.15, rechargeMult:1.0, sprintMult:1.12,
                 desc:'+12% sprint speed, but burns stamina ~15% faster.' },
  cushioned:   { id:'cushioned', name:'Cushioned Cross-Trainers', price:48, staminaMult:1.25, drainMult:0.85, rechargeMult:1.25, sprintMult:1.05,
                 desc:'Balanced: bigger pool, slower drain, quicker recovery, slight speed.' },
};
// GUN ATTACHMENTS (universal): cosmetic/sight aids attachable to any gun.
// v1.28 model: each attachment declares a `slot` — 'sight' (top rail, one per
// gun: red-dot, scope) or 'rail' (side rails: laser, flashlight). Guns have a
// fixed capacity (1 sight always + N rails by size, see GUN_ACCESSORY_CAP).
// Accessories are now OWNED AS INSTANCES (persist.accessories) so a single
// physical copy can only sit on one gun at a time — buy a second copy to mount
// the same kind on two guns.
const ATTACHMENTS = {
  red_dot:    { id:'red_dot', name:'Red-Dot Sight', slot:'sight', price:35, hipSpreadMult:0.85, desc:'Tightens hipfire spread ~15% and shows a glowing red reticle when you aim. Sits in the sight slot of any gun.' },
  scope:      { id:'scope',  name:'4× Scope', slot:'sight', price:55, hipSpreadMult:0.8, adsZoomBonus:0.8, desc:'A magnified optic for the sight slot. Tightens hipfire ~20% and zooms further when you aim. One per gun.' },
  laser:      { id:'laser',  name:'Red Laser Sight', slot:'rail', price:28, hipSpreadMult:0.9, laserColor:'red', desc:'Rail-mounted red beam. Tightens hipfire spread ~10%. Goes on a left or right rail.' },
  laser_green:{ id:'laser_green', name:'Green Laser Sight', slot:'rail', price:34, hipSpreadMult:0.9, laserColor:'green', desc:'Rail-mounted green beam — brighter and easier to see than red, especially at night. Tightens hipfire spread ~10%. Goes on a left or right rail.' },
  flashlight: { id:'flashlight', name:'Tactical Flashlight', slot:'rail', price:18, hipSpreadMult:1.0, desc:'Rail-mounted working light that casts a real beam. Goes on a left or right rail.' },
  // v1.169 (backlog D.14 B, Michael: D): four homemade parts for a new UNDER-barrel slot, one per long gun.
  // Each one is a trade: it buys one thing and costs another. (The cardboard's 0.68 is a fifth off the cone in degrees:
  // the jitter is in m/s, so a BB 15% slower would otherwise spread 1/0.85 wider.)
  taped_mag:  { id:'taped_mag', name:'Taped Twin Mag', slot:'under', price:22, weight:1.2, tapedMag:true, desc:'A second mag duct-taped upside down to the first. It comes loaded from your bag; press R to flip the pair over (0.6 s) and shoot the other one. It’s 1.2 lb more to carry. Long guns only.' },
  sling:      { id:'sling', name:'Shoelace Sling', slot:'under', price:12, sprintDrainMult:0.8, adsSpeedMult:0.7, desc:'Two shoelaces knotted into a strap. The gun rides on your shoulder, so a sprint lasts a quarter longer, but the strap tugs when you aim: aiming in is slower. Long guns only.' },
  foregrip:   { id:'foregrip', name:'PVC Foregrip', slot:'under', price:16, weight:0.8, moveSpreadMult:0.65, desc:'A stub of plumbing pipe, hose-clamped under the barrel. Your shots stay a third tighter while you walk, but it’s 0.8 lb more to carry. Long guns only.' },
  cardboard_barrel: { id:'cardboard_barrel', name:'Cardboard Barrel', slot:'under', price:6, hipSpreadMult:0.68, velocityMult:0.85, desc:'A paper-towel tube taped over the muzzle. It straightens the BBs out (a fifth tighter), but they rub the cardboard and leave slower, so they drop and wobble sooner. Long guns only.' },
};

// How many SIGHT (top) and RAIL (side) slots each gun has. Sight is always 1;
// rail count is size-honest: pistol & MAC-10 (machine pistol) get 1, everything
// larger (SMG/shotgun/sniper/AR/AK) gets 2.
const GUN_ACCESSORY_CAP = {
  pistol:  { sight: 1, rails: 1 },
  mac10:   { sight: 1, rails: 1 },
  shotgun: { sight: 1, rails: 2, under: 1 },   // v1.169: every long gun has one under-barrel slot
  ar:      { sight: 1, rails: 2, under: 1 },
  sniper:  { sight: 1, rails: 2, under: 1 },
  mp5:     { sight: 1, rails: 2, under: 1 },
  ump:     { sight: 1, rails: 2, under: 1 },
  ak47:    { sight: 1, rails: 2, under: 1 },
  thunder: { sight: 1, rails: 2, under: 1 },     // v1.168
  sixshooter: { sight: 1, rails: 1 },
  bucket:  { sight: 1, rails: 2, under: 1 },
  boltpistol: { sight: 1, rails: 1 },
  sprayer: { sight: 1, rails: 1 }, ghost: { sight: 1, rails: 1 }, ticktock: { sight: 1, rails: 2 }, rattle: { sight: 1, rails: 1 },   // v1.250
  famas:   { sight: 1, rails: 2, under: 1 },   // v1.325
  epistol: { sight: 1, rails: 1 },              // v1.326
  erifle:  { sight: 1, rails: 2, under: 1 },
  burst:   { sight: 1, rails: 2, under: 1 },   // v1.327
  semishotgun: { sight: 1, rails: 2, under: 1 },   // v1.328
  m249:    { sight: 1, rails: 2, under: 1 },   // v1.335
  l96:     { sight: 1, rails: 2, under: 1 },   // v1.336: the sniper's
  p90:     { sight: 1, rails: 2 },   // v1.346: no under-barrel slot, the off hand's stop is there
  vector:  { sight: 1, rails: 2 },   // v1.348: no under-barrel slot, its own front grip is there
  g36:     { sight: 1, rails: 2, under: 1 },   // v1.371
  aug:     { sight: 1, rails: 2 },   // v1.372: no under-barrel slot, its own folding foregrip is there
  m4:      { sight: 1, rails: 2, under: 1 },   // v1.373: a rail on every side of its handguard
  svd:     { sight: 1, rails: 2, under: 1 },   // v1.395: the sniper's
  rpk:     { sight: 1, rails: 2, under: 1 },   // v1.396: the AK's
  spas:    { sight: 1, rails: 2, under: 1 },   // v1.398: the shotgun's
  gaspistol: { sight: 1, rails: 1 },            // v1.399: the pistol's
  m14:      { sight: 1, rails: 2, under: 1 },  // v1.404: the sniper's
  thompson: { sight: 1, rails: 1 },             // v1.403: wood and steel, one side rail; its own front grip under the barrel
};
function getGunAccessoryCap(gunType) {
  const c = GUN_ACCESSORY_CAP[gunType] || { sight: 1, rails: 1 };
  return c.under ? c : Object.assign({ under: 0 }, c);   // v1.169: pistols have no under-barrel slot
}

// =====================================================================
// v1.28 ACCESSORY INSTANCE SYSTEM
// Accessories are owned as discrete instances; each instance lives in at most
// one gun slot at a time (no sharing). Per-gun slots are { sight, rails[] }.
// =====================================================================
let _accInstanceSeq = 1;
function makeAccessoryInstance(type) {
  const def = ATTACHMENTS[type];
  const inst = { id: 'acc_' + (_accInstanceSeq++) + '_' + type, type, placement: null };
  Game.persist.accessories.push(inst);
  Game.persist.ownedEquipment.attachments[type] = (Game.persist.ownedEquipment.attachments[type] || 0) + 1;
  return inst;
}
function getAccessoryInstance(instId) {
  return Game.persist.accessories.find(a => a.id === instId) || null;
}
// Ensure a gun's slot object exists and matches its capacity (rails array sized
// correctly). Safe to call repeatedly; preserves existing mounts.
function ensureGunSlots(gunType) {
  const cap = getGunAccessoryCap(gunType);
  const slots = Game.persist.equipped.attachments;
  if (!slots[gunType]) slots[gunType] = { sight: null, rails: [] };
  const g = slots[gunType];
  if (typeof g.sight === 'undefined') g.sight = null;
  if (!Array.isArray(g.rails)) g.rails = [];
  while (g.rails.length < cap.rails) g.rails.push(null);
  while (g.rails.length > cap.rails) {            // capacity shrank — free the overflow
    const overflow = g.rails.pop();
    const inst = getAccessoryInstance(overflow);
    if (inst) inst.placement = null;
  }
  // v1.169: the under-barrel slot (null on a gun without one)
  if (typeof g.under === 'undefined' || !cap.under) {
    const inst = g.under && getAccessoryInstance(g.under);
    if (inst) inst.placement = null;
    g.under = null;
  }
  return g;
}
// Which gun (if any) currently holds this instance.
function findInstanceMount(instId) {
  const slots = Game.persist.equipped.attachments;
  for (const gt in slots) {
    const g = slots[gt];
    if (!g) continue;
    if (g.sight === instId) return { gunType: gt, slot: 'sight', railIndex: -1 };
    if (g.under && g.under === instId) return { gunType: gt, slot: 'under', railIndex: -1 };   // v1.169
    if (Array.isArray(g.rails)) {
      const ri = g.rails.indexOf(instId);
      if (ri >= 0) return { gunType: gt, slot: 'rail', railIndex: ri };
    }
  }
  return null;
}
// Instances of a given type that are not mounted on any gun.
function getUnmountedInstances(type) {
  return Game.persist.accessories.filter(a => a.type === type && !findInstanceMount(a.id));
}
// Remove whatever instance currently occupies a slot (frees it for re-use).
function clearGunSlot(gunType, slot, railIndex) {
  const g = ensureGunSlots(gunType);
  let prevId = null;
  if (slot === 'sight') { prevId = g.sight; g.sight = null; }
  else if (slot === 'under') { prevId = g.under; g.under = null; }   // v1.169
  else { prevId = g.rails[railIndex]; g.rails[railIndex] = null; }
  const prev = prevId && getAccessoryInstance(prevId);
  if (prev) prev.placement = null;
}
// Mount an accessory INSTANCE into a specific slot of a gun. Enforces:
//  - sight items only into sight slot, rail items only into rail slots
//  - no sharing: pulls the instance out of any other slot/gun first
// railIndex 0 = left, 1 = right (placement string set accordingly).
function mountAccessory(gunType, instId, slot, railIndex) {
  const inst = getAccessoryInstance(instId);
  if (!inst) return { ok:false, reason:'no-instance' };
  const def = ATTACHMENTS[inst.type];
  if (!def) return { ok:false, reason:'unknown-type' };
  if (slot === 'sight' && def.slot !== 'sight') return { ok:false, reason:'not-a-sight' };
  if (slot === 'rail'  && def.slot !== 'rail')  return { ok:false, reason:'not-a-rail' };
  if (slot === 'under' && def.slot !== 'under') return { ok:false, reason:'not-an-under' };   // v1.169
  if (def.slot === 'under' && slot !== 'under') return { ok:false, reason:'under-only' };
  if (slot === 'under' && !getGunAccessoryCap(gunType).under) return { ok:false, reason:'no-under-slot' };
  ensureGunSlots(gunType);
  // Pull this instance out of wherever it currently sits (no sharing).
  const prevMount = findInstanceMount(instId);
  if (prevMount) clearGunSlot(prevMount.gunType, prevMount.slot, prevMount.railIndex);
  // Free the destination slot (its previous occupant goes back to the locker).
  clearGunSlot(gunType, slot, railIndex);
  const g = Game.persist.equipped.attachments[gunType];
  if (slot === 'sight') { g.sight = instId; inst.placement = 'sight'; }
  else if (slot === 'under') { g.under = instId; inst.placement = 'under'; }   // v1.169
  else { g.rails[railIndex] = instId; inst.placement = (railIndex === 0 ? 'left' : 'right'); }
  return { ok:true };
}
// Flat list of accessory TYPES currently mounted on a gun (for FP rendering /
// spread math). Returns [{ type, slot, placement }].
function getMountedAccessories(gunType) {
  const g = Game.persist?.equipped?.attachments?.[gunType];
  if (!g) return [];
  const out = [];
  if (g.sight) { const i = getAccessoryInstance(g.sight); if (i) out.push({ type:i.type, slot:'sight', placement:'sight' }); }
  if (Array.isArray(g.rails)) {
    g.rails.forEach((id, idx) => {
      if (!id) return;
      const i = getAccessoryInstance(id);
      if (i) out.push({ type:i.type, slot:'rail', placement: idx===0?'left':'right' });
    });
  }
  if (g.under) { const i = getAccessoryInstance(g.under); if (i) out.push({ type:i.type, slot:'under', placement:'under' }); }   // v1.169
  return out;
}
// v1.169: the homemade part on a gun's under-barrel slot (its ATTACHMENTS def), or null
function getUnderPart(gunType) {
  const g = Game.persist?.equipped?.attachments?.[gunType];
  if (!g || !g.under || !getGunAccessoryCap(gunType).under) return null;
  const i = getAccessoryInstance(g.under);
  return (i && ATTACHMENTS[i.type]) || null;
}
// v1.169: one number from the equipped gun's under-barrel part (1 when there is none)
function underPartMult(key) {
  const gun = Game.persist?.equipped?.gun;
  const d = gun ? getUnderPart(gun) : null;
  return (d && typeof d[key] === 'number') ? d[key] : 1;
}
function gunHasAccessoryType(gunType, type) {
  return getMountedAccessories(gunType).some(a => a.type === type);
}

// --- Equipment stat readers (safe defaults so gameplay works pre-purchase) ---
function getEquippedShoeStats() {
  const id = Game.persist?.equipped?.shoes || 'none';
  return SHOES[id] || SHOES.none;
}
function getEquippedEyewear() {
  const id = Game.persist?.equipped?.eyewear || 'none';
  return EYEWEAR[id] || EYEWEAR.none;
}
// Total bonus hit-points from equipped armor pieces + eyewear head armor.
function getArmorBonusHits() {
  let bonus = 0;
  const eq = Game.persist?.equipped?.armor || {};
  for (const zone in eq) {
    const piece = ARMOR[eq[zone]];
    if (piece) bonus += piece.hp || 0;
  }
  bonus += getEquippedEyewear().hp || 0;
  return bonus;
}
// Hipfire spread multiplier from ALL accessories mounted on the current gun
// (sight + rails stack multiplicatively).
function getEquippedAttachmentSpreadMult() {
  const gun = Game.persist?.equipped?.gun;
  if (!gun) return 1;
  let mult = 1;
  for (const a of getMountedAccessories(gun)) {
    const def = ATTACHMENTS[a.type];
    if (def && def.hipSpreadMult) mult *= def.hipSpreadMult;
  }
  return mult;
}
// Extra ADS zoom bonus from an equipped magnified sight (e.g. scope).
function getEquippedSightZoomBonus() {
  const gun = Game.persist?.equipped?.gun;
  if (!gun) return 0;
  for (const a of getMountedAccessories(gun)) {
    const def = ATTACHMENTS[a.type];
    if (def && def.adsZoomBonus) return def.adsZoomBonus;
  }
  return 0;
}

// =====================================================================
// SHOP CONFIG (v1.26) — per-gun magazines & spare mags, BB colors/quantities
// =====================================================================
// Each gun's purchasable magazines (capacity upgrades) and spare mags
// (consumables) live here so the gun drill-in page can render them. Each mag:
//   { owledFlag (in Game.persist.owned), cap, price, requires? }
// Each spare: { key (in persist.consumables), label, price, needsFlag? }
const GUN_MAGS = {
  pistol: {
    displayName: 'Spring Pistol', baseCap: 1, price: 0, ownFlag: 'pistol',
    mags: [
      { flag: 'pistol_mag_10', cap: 10, price: 8 },
      { flag: 'pistol_mag_12', cap: 20, price: 15, requires: 'pistol_mag_10' },
    ],
    spares: [
      { key: 'spare_mag_10', label: 'Spare 10-rd Mag', price: 5, needsFlag: 'pistol_mag_10' },
      { key: 'spare_mag_12', label: 'Spare 20-rd Mag', price: 8, needsFlag: 'pistol_mag_12' },
    ],
  },
  shotgun: {
    displayName: 'Spring Shotgun', baseCap: 40, price: 60, ownFlag: 'shotgun',
    mags: [ { flag: 'shotgun_mag_60', cap: 60, price: 18 } ],
    spares: [ { key: 'spare_mag_shotgun', label: 'Spare Shotgun Mag (40)', price: 12 } ],
  },
  ar: {
    displayName: 'Spring Assault Rifle', baseCap: 25, price: 85, ownFlag: 'ar',
    mags: [ { flag: 'ar_mag_40', cap: 40, price: 20 } ],
    spares: [ { key: 'spare_mag_ar', label: 'Spare AR Mag (25)', price: 10 } ],
  },
  sniper: {
    displayName: 'Spring Sniper Rifle', baseCap: 15, price: 120, ownFlag: 'sniper',
    mags: [ { flag: 'sniper_mag_25', cap: 25, price: 22 } ],
    spares: [ { key: 'spare_mag_sniper', label: 'Spare Sniper Mag (15)', price: 8 } ],
  },
  ak47: {
    displayName: 'AK-47', baseCap: 350, price: 240, ownFlag: 'ak47',
    mags: [ { flag: 'ak47_mag_500', cap: 500, price: 45 } ],
    spares: [
      { key: 'spare_mag_ak47', label: 'Spare AK Drum (350)', price: 22 },
      { key: 'spare_mag_ak47_500', label: 'Spare AK Drum (500)', price: 32 },
    ],
  },
  mp5: {
    displayName: 'MP5', baseCap: 150, price: 180, ownFlag: 'mp5',
    mags: [ { flag: 'mp5_mag_200', cap: 200, price: 28 } ],
    spares: [
      { key: 'spare_mag_mp5', label: 'Spare MP5 Mag (150)', price: 14 },
      { key: 'spare_mag_mp5_200', label: 'Spare MP5 Mag (200)', price: 18 },
    ],
  },
  ump: {
    displayName: 'UMP', baseCap: 100, price: 170, ownFlag: 'ump',
    mags: [ { flag: 'ump_mag_200', cap: 200, price: 25 } ],
    spares: [
      { key: 'spare_mag_ump', label: 'Spare UMP Mag (100)', price: 12 },
      { key: 'spare_mag_ump_200', label: 'Spare UMP Mag (200)', price: 18 },
    ],
  },
  mac10: {
    displayName: 'MAC-10', baseCap: 50, price: 130, ownFlag: 'mac10',
    mags: [ { flag: 'mac10_mag_100', cap: 100, price: 18 } ],
    spares: [ { key: 'spare_mag_mac10', label: 'Spare MAC-10 Mag (50)', price: 8 } ],
  },
  // v1.168 (backlog D.14 A, Michael: D): four backyard guns, the kind kids actually own. `blurb` is the shop's line.
  thunder: {
    displayName: 'Thunder Pump', baseCap: 30, price: 75, ownFlag: 'thunder',
    blurb: 'A pump-up air shotgun. Pump it between every shot; it throws four or five BBs in a wide cloud. Hard to miss up close, useless far off.',
    mags: [ { flag: 'thunder_mag_50', cap: 50, price: 15 } ],
    spares: [ { key: 'spare_mag_thunder', label: 'Spare Thunder Shell Box (30)', price: 10 } ],
  },
  sixshooter: {
    displayName: 'Six-Shooter', baseCap: 6, price: 70, ownFlag: 'sixshooter',
    blurb: 'A cap-gun style revolver. Thumb the hammer and it is ready again fast, but the cylinder holds six. Bring spare cylinders.',
    mags: [],
    spares: [ { key: 'spare_mag_sixshooter', label: 'Spare Cylinder (6)', price: 3 } ],
  },
  bucket: {
    displayName: 'Bucket Gun', baseCap: 600, price: 65, ownFlag: 'bucket',   // v1.295 (D.50, Michael: A): $110 → $65, the worst value in the shop
    blurb: 'Battery-powered, with a bucket of BBs on top. It never stops, but the BBs come out slow and soft and drift off past ten metres.',
    mags: [ { flag: 'bucket_mag_1000', cap: 1000, price: 25 } ],
    spares: [ { key: 'spare_mag_bucket', label: 'Spare BB Bottle (600)', price: 15 } ],
  },
  boltpistol: {
    displayName: 'Bolt Pistol', baseCap: 8, price: 95, ownFlag: 'boltpistol',
    blurb: 'A long-barrel pistol you work with a little bolt. Slow to reload each shot, but it puts the BB where you aim.',
    mags: [ { flag: 'boltpistol_mag_12', cap: 12, price: 14 } ],
    spares: [ { key: 'spare_mag_boltpistol', label: 'Spare Bolt Pistol Mag (8)', price: 6 } ],
  },
  // v1.250 (backlog D.37, Michael: B): the cheap clear-plastic automatics, cheaper than the Bucket Gun, each bad in its
  // own way. One mag each, no bigger mag and no spares sold (a speed loader fills any gun); no kid carries one.
  rattle: {
    displayName: 'Rattle Can', baseCap: 50, price: 25, ownFlag: 'rattle', cheap: true,
    blurb: 'A clear plastic joke gun with a battery taped under its nose. Slow, wild and it jams. Every kid had one the first week of summer.',
    mags: [], spares: [],
  },
  sprayer: {
    displayName: 'Clear Sprayer', baseCap: 120, price: 35, ownFlag: 'sprayer', cheap: true,
    blurb: 'A little see-through battery SMG. Six BBs a second, every one of them curves off somewhere new, and about one burst in five it jams.',
    mags: [], spares: [],
  },
  ghost: {
    displayName: 'Ghost Mini', baseCap: 80, price: 45, ownFlag: 'ghost', cheap: true,
    blurb: 'A clear micro-uzi. It holds steady, but about one burst in five it jams: hold R to clear it.',
    mags: [], spares: [],
  },
  ticktock: {
    displayName: 'Tick-Tock', baseCap: 60, price: 55, ownFlag: 'ticktock', cheap: true,
    blurb: 'A clear wind-up rifle. Dead on up close, but it ticks out two BBs a second, they drop off past about 25 metres, and about one burst in five it jams.',
    mags: [], spares: [],
  },
  // v1.325 (backlog D.63, Michael: A, batch 1): the FAMAS, the spring rifle Michael grew up with. It shoots exactly as
  // the Spring Assault Rifle (Michael: "functionally identical"); only the gun in your hands is different.
  famas: {
    displayName: 'FAMAS', baseCap: 25, price: 85, ownFlag: 'famas',
    blurb: 'A French bullpup spring rifle with a carry handle the length of the gun. Shoots like the Spring Assault Rifle: pull the charging handle for every shot.',
    mags: [ { flag: 'famas_mag_40', cap: 40, price: 20 } ],
    spares: [ { key: 'spare_mag_famas', label: 'Spare FAMAS Mag (25)', price: 10 } ],
  },
  // v1.326 (backlog D.63, batch 1): the electric semi-autos. A battery cycles the spring, so there is nothing to cock:
  // every pull of the trigger fires, as fast as you can pull it, up to the gun's own cycle. A new mag still needs the
  // first round racked in (the slide, or the charging handle).
  epistol: {
    displayName: 'Electric Pistol', baseCap: 18, price: 110, ownFlag: 'epistol',
    blurb: 'A battery pistol in a tan frame. No slide to rack between shots: every pull of the trigger fires, about five a second if your finger keeps up.',
    mags: [ { flag: 'epistol_mag_30', cap: 30, price: 15 } ],
    spares: [ { key: 'spare_mag_epistol', label: 'Spare Electric Pistol Mag (18)', price: 6 } ],
  },
  erifle: {
    displayName: 'Electric Rifle', baseCap: 30, price: 150, ownFlag: 'erifle',
    blurb: 'A battery rifle that shoots like the spring rifle, without the charging handle: a BB every pull, about six a second, and it reaches as far.',
    mags: [ { flag: 'erifle_mag_60', cap: 60, price: 20 } ],
    spares: [ { key: 'spare_mag_erifle', label: 'Spare Electric Rifle Mag (30)', price: 10 } ],
  },
  // v1.327 (backlog D.63, batch 1): the burst rifle, an electric M16 that fires three BBs a pull
  burst: {
    displayName: 'Burst Rifle', baseCap: 90, price: 210, ownFlag: 'burst',
    blurb: 'A battery M16 with the fixed stock and the round handguard. Every pull of the trigger throws three BBs in a quick burst; let it go and pull again.',
    mags: [ { flag: 'burst_mag_150', cap: 150, price: 22 } ],
    spares: [ { key: 'spare_mag_burst', label: 'Spare Burst Rifle Mag (90)', price: 12 } ],
  },
  // v1.328 (backlog D.63, batch 1): the semi-auto shotgun, the spring shotgun's cloud of BBs on every pull
  semishotgun: {
    displayName: 'Semi-Auto Shotgun', baseCap: 60, price: 160, ownFlag: 'semishotgun',
    blurb: 'A tactical shotgun in olive and black with red shells on its side. No pump: every pull throws a cloud of two or three BBs, as fast as you can pull, up to about two and a half a second.',
    mags: [ { flag: 'semishotgun_mag_90', cap: 90, price: 20 } ],
    spares: [ { key: 'spare_mag_semishotgun', label: 'Spare Semi-Auto Shotgun Mag (60)', price: 14 } ],
  },
  // v1.335 (backlog D.63, Michael: A, batch 2): the light machine gun, a battery M249 fed from a box under it
  m249: {
    displayName: 'M249', baseCap: 800, price: 320, ownFlag: 'm249',
    blurb: 'A battery light machine gun with a box of BBs hung under it and a bipod folded under the barrel. Twelve BBs a second and a box that lasts, but it is the heaviest gun in the shop and you walk slowest with it.',
    mags: [ { flag: 'm249_mag_1500', cap: 1500, price: 55 } ],
    spares: [ { key: 'spare_mag_m249', label: 'Spare M249 Box (800)', price: 35 } ],
  },
  // v1.336 (backlog D.63, batch 2): the second sniper, an L96 that out-reaches the Spring Sniper Rifle for a slower bolt
  l96: {
    displayName: 'L96', baseCap: 10, price: 190, ownFlag: 'l96',
    blurb: 'An olive bolt-action sniper with a cheek riser and a heavy spring. Its BB flies faster and straighter than the Spring Sniper Rifle\'s and reaches further, but the bolt is stiffer to work and the mag holds ten.',
    mags: [ { flag: 'l96_mag_20', cap: 20, price: 22 } ],
    spares: [ { key: 'spare_mag_l96', label: 'Spare L96 Mag (10)', price: 8 } ],
  },
  // v1.346 (backlog D.63, batch 2): the first of the new SMGs, a P90 bullpup with its clear mag along the top
  p90: {
    displayName: 'P90', baseCap: 200, price: 210, ownFlag: 'p90',
    blurb: 'A stubby black bullpup with a smoky see-through mag lying along its top and a ring sight over the front. It fires faster than the MP5, holds 200 and is lighter to carry, but its short barrel gives up a little speed and range.',
    mags: [ { flag: 'p90_mag_300', cap: 300, price: 30 } ],
    spares: [ { key: 'spare_mag_p90', label: 'Spare P90 Mag (200)', price: 16 } ],
  },
  // v1.348 (backlog D.63, batch 2): the last of the new SMGs, a Vector: the fastest of them, but a short mag
  vector: {
    displayName: 'Vector', baseCap: 100, price: 230, ownFlag: 'vector',
    blurb: 'A blocky black SMG with a slanted front that drops to the mag, its own front grip and a folding stock. It fires faster than any SMG and stays tighter aimed than the MP5, but its 100-BB mag runs dry in six seconds.',
    mags: [ { flag: 'vector_mag_200', cap: 200, price: 28 } ],
    spares: [ { key: 'spare_mag_vector', label: 'Spare Vector Mag (100)', price: 12 } ],
  },
  // v1.371 (backlog D.63, batch 3, "a few more Automatic rifles"): the G36C, a battery rifle after the AK-47
  g36: {
    displayName: 'G36C', baseCap: 300, price: 260, ownFlag: 'g36',
    blurb: 'A short black battery rifle with a smoky see-through mag, a vented handguard and a skeleton stock that folds. It fires a little faster than the AK and stays tighter aimed, and you walk quicker with it, but its BB is a touch slower and its mag smaller.',
    mags: [ { flag: 'g36_mag_470', cap: 470, price: 40 } ],
    spares: [ { key: 'spare_mag_g36', label: 'Spare G36 Mag (300)', price: 20 } ],
  },
  // v1.372 (backlog D.63, batch 3): the AUG, a bullpup battery rifle: the mag behind the grip, so a long barrel in a short gun
  aug: {
    displayName: 'AUG', baseCap: 330, price: 290, ownFlag: 'aug',
    blurb: 'An olive-green bullpup battery rifle: the clear mag sits behind the grip, so a long barrel fits in a short gun, with a folding foregrip under the front. Its BB is the fastest and straightest of the rifles short of a sniper, but it fires a little slower than the G36C.',
    mags: [ { flag: 'aug_mag_500', cap: 500, price: 40 } ],
    spares: [ { key: 'spare_mag_aug', label: 'Spare AUG Mag (330)', price: 20 } ],
  },
  // v1.373 (backlog D.63, batch 3): the M4, the all-round battery rifle: the AK's BB, a quicker trigger and the quickest walk of the rifles
  m4: {
    displayName: 'M4', baseCap: 300, price: 275, ownFlag: 'm4',
    blurb: 'A black battery carbine with a flat-top rail, a railed handguard, a sliding stock and a curved black mag. It is the all-rounder: the AK\'s BB at 12 a second, and you walk quicker with it than with any other rifle, though it aims a little wider than the G36C and the AUG.',
    mags: [ { flag: 'm4_mag_450', cap: 450, price: 40 } ],
    spares: [ { key: 'spare_mag_m4', label: 'Spare M4 Mag (300)', price: 20 } ],
  },
  // v1.395 (backlog D.63, batch 4): the SVD, a battery sniper: no bolt between shots, for a slower, wider BB than the bolt guns'
  svd: {
    displayName: 'SVD', baseCap: 20, price: 230, ownFlag: 'svd',
    blurb: 'A long battery sniper in wood and black with a curved mag under it. There is no bolt to work: every pull fires, two a second at most. Its BB is a little slower and wider than the Spring Sniper Rifle\'s, and it is lighter to carry than either bolt gun.',
    mags: [ { flag: 'svd_mag_30', cap: 30, price: 24 } ],
    spares: [ { key: 'spare_mag_svd', label: 'Spare SVD Mag (20)', price: 10 } ],
  },
  // v1.396 (backlog D.63, batch 4): the RPK, the second light machine gun: the AK grown a long barrel, a drum and a bipod
  rpk: {
    displayName: 'RPK', baseCap: 600, price: 280, ownFlag: 'rpk',
    blurb: 'The AK-47\'s big brother: a long barrel, a round drum of BBs under it and a bipod folded under the front. It fires a little slower than the AK, nine a second, but its BB flies faster and straighter, and the drum lasts. Lighter than the M249, so you walk quicker with it.',
    mags: [ { flag: 'rpk_mag_1000', cap: 1000, price: 45 } ],
    spares: [ { key: 'spare_mag_rpk', label: 'Spare RPK Drum (600)', price: 28 } ],
  },
  // v1.398 (backlog D.63, batch 5): the SPAS-12, a second pump shotgun: three BBs every pump, tighter and faster than the
  // Spring Shotgun's two or three, for a slower pump and a heavier gun
  spas: {
    displayName: 'SPAS-12', baseCap: 45, price: 140, ownFlag: 'spas',
    blurb: 'A heavy black pump shotgun with a vented shield over its barrel and a folding metal stock. Every pump throws three BBs, never two, in a tighter, faster cloud than the Spring Shotgun\'s. The pump is slower and the gun is heavier. Its shells hold 45 BBs, fifteen shots.',
    mags: [ { flag: 'spas_mag_72', cap: 72, price: 22 } ],
    spares: [ { key: 'spare_mag_spas', label: 'Spare SPAS Shells (45)', price: 14 } ],
  },
  // v1.399 (backlog D.63, batch 5): the Gas Pistol, a green-gas blowback pistol: no slide to rack between shots, the gas
  // kicks it back; a faster, tighter BB than the Electric Pistol's, from a smaller mag whose gas cools as it empties
  gaspistol: {
    displayName: 'Gas Pistol', baseCap: 15, price: 130, ownFlag: 'gaspistol',
    blurb: 'A green-gas blowback pistol, a steel slide on a black frame with wooden grips. Every pull fires and the gas throws the slide back: about four a second, the fastest, tightest BB of the pistols. The gas cools as the mag empties, so the last BBs fly slower. Its mags hold 15.',
    mags: [ { flag: 'gas_mag_25', cap: 25, price: 16 } ],
    spares: [ { key: 'spare_mag_gas', label: 'Spare Gas Pistol Mag (15)', price: 9 } ],
  },
  // v1.404 (backlog D.63, batch 5): the M14, a marksman rifle between the rifles and the snipers: a battery semi in walnut
  m14: {
    displayName: 'M14', baseCap: 30, price: 200, ownFlag: 'm14',
    blurb: 'A long battery marksman rifle in walnut and steel with a straight box mag. Every pull fires, three a second at most: slower than the Electric Rifle but quicker than the SVD. Its BB flies faster and straighter than any rifle short of a sniper, and it carries like the Spring Assault Rifle.',
    mags: [ { flag: 'm14_mag_50', cap: 50, price: 22 } ],
    spares: [ { key: 'spare_mag_m14', label: 'Spare M14 Mag (30)', price: 10 } ],
  },
  // v1.403 (backlog D.63, batch 5): the Thompson, a drum-fed SMG in wood and blued steel: the fastest, straightest BB of
  // the SMGs and the slowest to fire, and the heaviest to carry
  thompson: {
    displayName: 'Thompson', baseCap: 100, price: 240, ownFlag: 'thompson',
    blurb: 'A gangster-movie SMG in blued steel and walnut: a round drum under the gun, a finned barrel, a wooden front grip and stock. Its BB is the fastest and straightest of the SMGs, but it fires slower than any of them and it is heavy, so you walk slower.',
    mags: [ { flag: 'thompson_mag_200', cap: 200, price: 30 } ],
    spares: [ { key: 'spare_mag_thompson', label: 'Spare Thompson Drum (100)', price: 16 } ],
  },
};
const GUN_ORDER = ['pistol','sixshooter','boltpistol','epistol','gaspistol','shotgun','thunder','spas','semishotgun','ar','famas','erifle','burst','m14','sniper','l96','svd','rattle','sprayer','ghost','ticktock','bucket','mp5','ump','p90','vector','thompson','mac10','ak47','g36','m4','aug','rpk','m249'];   // v1.250: the cheap automatics lead their kind; v1.335: the M249 last; v1.346: the P90 by the SMGs; v1.348: the Vector after it; v1.371: the G36C after the AK; v1.372: the AUG after it; v1.373: the M4 between them; v1.398: the SPAS-12 before the Semi-Auto Shotgun; v1.399: the Gas Pistol after the Electric Pistol; v1.403: the Thompson after the Vector; v1.404: the M14 between the Burst Rifle and the sniper

// BB color cosmetics (purchasable; white owned by default).
// v1.28g: BB color prices inflated 10x (cosmetic, but should feel like a real
// splurge against the leaner reward economy). White stays free.
const BB_COLOR_SHOP = [
  { id:'white',  name:'White (classic)', price:0,   hex:'#ffffff' },
  { id:'green',  name:'Zombie Green',    price:60,  hex:'#6cff8a' },
  { id:'pink',   name:'Hot Pink',        price:60,  hex:'#ff77c8' },
  { id:'orange', name:'Blaze Orange',    price:60,  hex:'#ff9a3c' },
  { id:'blue',   name:'Ice Blue',        price:60,  hex:'#6cc8ff' },
  { id:'yellow', name:'Hi-Vis Yellow',   price:80,  hex:'#fff04a' },
  // v1.41: glow-in-the-dark — a pale-green tracer that emits its own light, so
  // rounds streak and littered BBs glow on the ground in night modes.
  { id:'glow',   name:'Glow-in-the-Dark', price:150, hex:'#caffb0', glow:true },
];

// --- Equipment purchase / equip (separate from SHOP_CATALOG/purchaseItem) ---
function buyEquipment(kind, id) {
  const tables = { eyewear: EYEWEAR, shoes: SHOES, armor: ARMOR, attachments: ATTACHMENTS };
  const table = tables[kind];
  const item = table && table[id];
  if (!item) return { ok:false, reason:'unknown' };
  // v1.28: attachments can be bought repeatedly — each purchase mints a new
  // physical instance you can mount on a different gun (no-sharing model).
  if (kind === 'attachments') {
    if (Game.persist.cash < item.price) return { ok:false, reason:'cash' };
    Game.persist.cash -= item.price;
    const inst = makeAccessoryInstance(id);
    return { ok:true, instanceId: inst.id };
  }
  if (Game.persist.ownedEquipment[kind][id]) return { ok:false, reason:'owned' };
  if (item.requires && !Game.persist.ownedEquipment[kind][item.requires]) return { ok:false, reason:'locked' };
  if (Game.persist.cash < item.price) return { ok:false, reason:'cash' };
  Game.persist.cash -= item.price;
  Game.persist.ownedEquipment[kind][id] = true;
  return { ok:true };
}
// v1.337 (D.28 step 4): wearing what a crew kid has takes it back from him (free)
function equipEyewear(id) { if (id==='none'||Game.persist.ownedEquipment.eyewear[id]) { if (id !== 'none') crewTakeBack('eyewear', id); Game.persist.equipped.eyewear = id; } }
function equipShoes(id)   { if (id==='none'||Game.persist.ownedEquipment.shoes[id]) { if (id !== 'none') crewTakeBack('shoes', id); Game.persist.equipped.shoes = id; } }
function toggleArmor(id) {
  const piece = ARMOR[id]; if (!piece) return;
  if (!Game.persist.ownedEquipment.armor[id]) return;
  const zone = piece.zone;
  // One piece per zone; clicking the equipped one removes it.
  if (Game.persist.equipped.armor[zone] === id) delete Game.persist.equipped.armor[zone];
  else Game.persist.equipped.armor[zone] = id;
}
// (v1.28: equipAttachment removed — accessory slotting now goes through
// mountAccessory / clearGunSlot in the instance system above.)
function buyBBColor(id) {
  const c = BB_COLOR_SHOP.find(x => x.id === id);
  if (!c) return { ok:false };
  if (Game.persist.ownedBBColors[id]) { Game.persist.bbColor = id; return { ok:true, equipped:true }; }
  if (Game.persist.cash < c.price) return { ok:false, reason:'cash' };
  Game.persist.cash -= c.price;
  Game.persist.ownedBBColors[id] = true;
  Game.persist.bbColor = id;
  return { ok:true };
}
// Buy a per-gun magazine (capacity) or spare mag (consumable).
function buyGunMag(gunType, magFlag) {
  const cfg = GUN_MAGS[gunType]; if (!cfg) return { ok:false };
  const mag = cfg.mags.find(m => m.flag === magFlag); if (!mag) return { ok:false };
  if (Game.persist.owned[magFlag]) return { ok:false, reason:'owned' };
  if (mag.requires && !Game.persist.owned[mag.requires]) return { ok:false, reason:'locked' };
  if (Game.persist.cash < mag.price) return { ok:false, reason:'cash' };
  Game.persist.cash -= mag.price;
  Game.persist.owned[magFlag] = true;
  return { ok:true };
}
function buyGunSpare(gunType, spareKey) {
  const cfg = GUN_MAGS[gunType]; if (!cfg) return { ok:false };
  const sp = cfg.spares.find(s => s.key === spareKey); if (!sp) return { ok:false };
  if (sp.needsFlag && !Game.persist.owned[sp.needsFlag]) return { ok:false, reason:'locked' };
  if (Game.persist.cash < sp.price) return { ok:false, reason:'cash' };
  Game.persist.cash -= sp.price;
  Game.persist.consumables[spareKey] = (Game.persist.consumables[spareKey]||0) + 1;
  return { ok:true };
}
function buyGun(gunType) {
  const cfg = GUN_MAGS[gunType]; if (!cfg) return { ok:false };
  if (Game.persist.owned[cfg.ownFlag]) { const from = crewTakeBack('gun', gunType); Game.persist.equipped.gun = gunType; return { ok:true, equipped:true, from }; }   // v1.337: back from a crew kid
  if (Game.persist.cash < cfg.price) return { ok:false, reason:'cash' };
  Game.persist.cash -= cfg.price;
  Game.persist.owned[cfg.ownFlag] = true;
  Game.persist.equipped.gun = gunType;
  if (!Game.persist.gunMatches) Game.persist.gunMatches = {};
  Game.persist.gunMatches[gunType] = 0;   // v1.262 (D.44): matches it has been into, counted from the day it is bought
  return { ok:true };
}

// v1.262 (backlog D.44, Michael: B): sell a gun back. The full price back if it has been into 3 matches or fewer, half
// after; a gun bought before this build has no count and is taken as used. Its mags (the capacity upgrades and the spare
// mags that fit only it) and the parts mounted on it go with it at the same rate. The Spring Pistol can't be sold.
const SELL_FREE_MATCHES = 3;
function gunSellQuote(gunType) {
  const cfg = GUN_MAGS[gunType];
  if (!cfg || gunType === 'pistol' || !Game.persist.owned[cfg.ownFlag]) return null;
  const n = (Game.persist.gunMatches || {})[gunType];
  const used = typeof n !== 'number' ? null : n;
  const full = used !== null && used <= SELL_FREE_MATCHES;
  let paid = cfg.price;
  const mags = cfg.mags.filter(m => Game.persist.owned[m.flag]);
  for (const m of mags) paid += m.price;
  const spares = cfg.spares.filter(s => MAG_GUN_FIT[s.key] === gunType && (Game.persist.consumables[s.key] || 0) > 0);
  for (const s of spares) paid += s.price * Game.persist.consumables[s.key];
  const g = (Game.persist.equipped.attachments || {})[gunType] || {};
  const parts = [g.sight, ...(Array.isArray(g.rails) ? g.rails : []), g.under].map(id => id && getAccessoryInstance(id)).filter(Boolean);
  for (const a of parts) paid += (ATTACHMENTS[a.type] || {}).price || 0;
  return { paid, value: full ? paid : Math.floor(paid / 2), full, used, mags, spares, parts };
}
function sellGun(gunType) {
  const q = gunSellQuote(gunType); if (!q) return { ok:false };
  if (crewLoanHolder('gun', gunType)) return { ok:false, reason:'lent' };   // v1.337: take it back from him first
  const p = Game.persist, cfg = GUN_MAGS[gunType];
  for (const part of q.parts) {
    p.accessories = p.accessories.filter(a => a.id !== part.id);
    p.ownedEquipment.attachments[part.type] = Math.max(0, (p.ownedEquipment.attachments[part.type] || 0) - 1);
  }
  delete p.equipped.attachments[gunType];
  for (const m of q.mags) p.owned[m.flag] = false;
  for (const s of q.spares) {
    p.consumables[s.key] = 0;
    p.loadoutSlots = p.loadoutSlots.map(sl => (sl && sl.kind === 'spare_mag' && sl.refId === s.key) ? null : sl);
  }
  p.owned[cfg.ownFlag] = false;
  if (p.gunMatches) delete p.gunMatches[gunType];
  if (p.equipped.gun === gunType) p.equipped.gun = 'pistol';
  p.cash += q.value;
  autoSave();
  return { ok:true, value: q.value, full: q.full };
}

// === SLOT HELPERS ===
function getUnlockedSlotCount() {
  // Slot 0 (gun) + slot 1 (equipment) always unlocked
  let n = 2;
  if (Game.persist.owned.slot_3) n++;
  if (Game.persist.owned.slot_4) n++;
  return n;
}

// What's in a slot, decorated with display info. Returns null for empty.
function describeSlot(idx) {
  const slot = Game.persist.loadoutSlots[idx];
  if (!slot) return null;
  if (slot.kind === 'gun') {
    return {
      kind: 'gun',
      icon: '⌐',
      name: getGunDisplayName(Game.persist.equipped.gun),
      desc: `Mag: ${getMaxAmmoForGun(Game.persist.equipped.gun)} rounds`,
    };
  }
  if (slot.kind === 'noodle') return { kind: 'noodle', icon: '〰', name: 'Pool Noodle', desc: 'V swings it · a hit tags' };   // v1.249
  if (slot.kind === 'speed_loader') {
    const sl = Game.persist.speedLoaders.find(s => s.id === slot.refId);
    if (!sl) return null;
    return {
      kind: 'speed_loader',
      icon: '⌂',
      name: `Speed Loader (${SPEED_LOADER_TIERS[sl.tier].capacity})`,
      desc: `BBs in loader: ${sl.currentBBs} / ${SPEED_LOADER_TIERS[sl.tier].capacity}`,
      ref: sl,
    };
  }
  if (slot.kind === 'spare_mag') {
    // Capacity is determined by the refId. Spare mags are specific to a gun type.
    const SPARE_MAG_CAP = {
      spare_mag_10: 10,
      spare_mag_12: 20,
      spare_mag_shotgun: 40,
      spare_mag_ar: 25,
      spare_mag_sniper: 15,
      // v1.20: auto-gun spare mags
      spare_mag_ak47: 350,
      spare_mag_ak47_500: 500,
      spare_mag_mp5: 150,
      spare_mag_mp5_200: 200,
      spare_mag_ump: 100,
      spare_mag_ump_200: 200,
      spare_mag_mac10: 50,
      spare_mag_mac10_100: 100,
      spare_mag_thunder: 30, spare_mag_sixshooter: 6, spare_mag_bucket: 600, spare_mag_boltpistol: 8,   // v1.168
      spare_mag_famas: 25,   // v1.325
      spare_mag_epistol: 18, spare_mag_erifle: 30,   // v1.326
      spare_mag_burst: 90,   // v1.327
      spare_mag_semishotgun: 60,   // v1.328
      spare_mag_m249: 800,   // v1.335
      spare_mag_l96: 10,   // v1.336
      spare_mag_p90: 200,   // v1.346
      spare_mag_vector: 100,   // v1.348
      spare_mag_g36: 300,   // v1.371
      spare_mag_aug: 330,   // v1.372
      spare_mag_m4: 300,   // v1.373
      spare_mag_svd: 20,   // v1.395
      spare_mag_rpk: 600,   // v1.396
      spare_mag_spas: 45,   // v1.398
      spare_mag_gas: 15,   // v1.399
      spare_mag_thompson: 100,   // v1.403
      spare_mag_m14: 30,   // v1.404
    };
    const SPARE_MAG_LABEL = {
      spare_mag_10: 'Spare 10-rd Pistol Mag',
      spare_mag_12: 'Spare 20-rd Pistol Mag',
      spare_mag_shotgun: 'Spare 40-rd Shotgun Mag',
      spare_mag_ar: 'Spare 25-rd AR Mag',
      spare_mag_sniper: 'Spare 15-rd Sniper Mag',
      spare_mag_ak47: 'Spare 350-rd AK Drum',
      spare_mag_ak47_500: 'Spare 500-rd AK Drum',
      spare_mag_mp5: 'Spare 150-rd MP5 Mag',
      spare_mag_mp5_200: 'Spare 200-rd MP5 Mag',
      spare_mag_ump: 'Spare 100-rd UMP Mag',
      spare_mag_ump_200: 'Spare 200-rd UMP Mag',
      spare_mag_mac10: 'Spare 50-rd MAC-10 Mag',
      spare_mag_mac10_100: 'Spare 100-rd MAC-10 Mag',
      spare_mag_thunder: 'Spare Thunder Shell Box (30)', spare_mag_sixshooter: 'Spare Cylinder (6)',   // v1.168
      spare_mag_bucket: 'Spare BB Bottle (600)', spare_mag_boltpistol: 'Spare 8-rd Bolt Pistol Mag',
      spare_mag_famas: 'Spare 25-rd FAMAS Mag',   // v1.325
      spare_mag_epistol: 'Spare 18-rd Electric Pistol Mag', spare_mag_erifle: 'Spare 30-rd Electric Rifle Mag',   // v1.326
      spare_mag_burst: 'Spare 90-rd Burst Rifle Mag',   // v1.327
      spare_mag_semishotgun: 'Spare 60-rd Semi-Auto Shotgun Mag',   // v1.328
      spare_mag_m249: 'Spare 800-rd M249 Box',   // v1.335
      spare_mag_l96: 'Spare 10-rd L96 Mag',   // v1.336
      spare_mag_p90: 'Spare 200-rd P90 Mag',   // v1.346
      spare_mag_vector: 'Spare 100-rd Vector Mag',   // v1.348
      spare_mag_g36: 'Spare 300-rd G36 Mag',   // v1.371
      spare_mag_aug: 'Spare 330-rd AUG Mag',   // v1.372
      spare_mag_m4: 'Spare 300-rd M4 Mag',   // v1.373
      spare_mag_svd: 'Spare 20-rd SVD Mag',   // v1.395
      spare_mag_rpk: 'Spare 600-rd RPK Drum',   // v1.396
      spare_mag_spas: 'Spare 45-rd SPAS Shells',   // v1.398
      spare_mag_gas: 'Spare 15-rd Gas Pistol Mag',   // v1.399
      spare_mag_thompson: 'Spare 100-rd Thompson Drum',   // v1.403
      spare_mag_m14: 'Spare 30-rd M14 Mag',   // v1.404
    };
    const cap = SPARE_MAG_CAP[slot.refId] || 10;
    return {
      kind: 'spare_mag',
      icon: '▮',
      name: SPARE_MAG_LABEL[slot.refId] || `Spare ${cap}-rd Mag`,
      desc: 'Fills from your bag every match. Swap-in reload.',   // v1.323 (B.14): kept, not used up
      magCap: cap,
      refId: slot.refId,
      bbs: (Game.gun.spareAmmo || {})[idx] || 0,   // v1.323: what it holds in this match
    };
  }
  return null;
}

// v1.249 (backlog D.36, Michael: A): THE POOL NOODLE. Sold at airsoft.com for $15 (Gear tab), carried in a loadout slot
// like a speed loader. V swings it from anything you hold (a quick swing, then back to what you had); with its slot
// held, a click swings it too. It reaches NOODLE_REACH (from your middle to the kid's), across a cone in front of you,
// not through a wall; the nearest kid of the other side in it is tagged as a BB tags him, and says something about it.
// A kid already out gets his "I'm out already" (v1.237). Kids never carry one.
const NOODLE_REACH = 1.6, NOODLE_CONE = 0.7071;      // m from your middle to his; cos 45° either side of your look
const NOODLE_SWING = 0.42, NOODLE_HIT_AT = 0.16, NOODLE_COOLDOWN = 0.65;   // s: the swing, when it lands, swing to swing
const NOODLE_LINES = ['A POOL NOODLE?! Are you serious?!', 'Dude, you got me with a NOODLE.', 'That does not count! ...It counts, doesn\'t it.',
  'I just got noodled. Great.', 'Ow! Okay, that one actually stung.', 'Who brings a pool noodle to airsoft?!'];
function noodleCarried() { return Game.persist.loadoutSlots.some(s => s && s.kind === 'noodle'); }
let fpNoodle = null;
function buildNoodleMesh() {
  // a foam pool noodle, 1.2 m, along +Y from the hand: a fluted tube with the hollow showing at the far end
  const g = new THREE.Group();
  const foam = new THREE.MeshStandardMaterial({ color: 0x3fd16a, roughness: 0.92 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.2, 9, 1, true), foam);
  tube.position.y = 0.52;
  g.add(tube);
  const cap = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.036, 9), new THREE.MeshStandardMaterial({ color: 0x35b85c, roughness: 0.95, side: THREE.DoubleSide }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 1.12;
  const cap2 = cap.clone(); cap2.position.y = -0.08;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.19, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f6e36, roughness: 1, side: THREE.BackSide }));
  hole.position.y = 0.52;
  g.add(cap, cap2, hole);
  g.userData.tube = tube;
  return g;
}
function buildFPNoodle() {
  // the hand and forearm hold still in the root; the noodle swings about the hand in its own group
  const group = new THREE.Group(), n = buildNoodleMesh();
  group.add(n);
  group.userData.swing = n;
  group.userData.baseRot = { x: -0.95, y: 0, z: 0.12 };
  group.userData.basePos = { x: 0.2, y: -0.17, z: -0.32 };
  group.position.set(0.2, -0.17, -0.32);
  group.rotation.set(-0.95, 0, 0.12);
  const h = buildFpGripHand(0.036, 0.036, 1);   // the hand round its near end
  group.add(h);
  const f = addFpForearm(group, group, h, FP_ELBOW_R);
  group.userData.fpHands = { r: [h, f.arm, f.cuff], l: [], under: null };
  group.visible = false;
  Game.camera.add(group);
  syncFpHandLook();
  return group;
}
function shopNoodlePic(w, h) {
  return shopPic('gear:noodle', w, h, () => {
    const holder = new THREE.Group(), n = buildNoodleMesh();
    n.rotation.z = -0.8;   // laid corner to corner, the hollow end up
    n.scale.set(1.8, 1, 1.8);   // drawn a little fat, so the thin tube reads in a 56 px box
    holder.add(n);
    return { obj: holder, fit: [n], pad: 1.1 };
  });
}
function renderPoolNoodle(c) {
  const item = SHOP_CATALOG.find(x => x.id === 'pool_noodle');
  if (!item) return;
  c.appendChild(shopSectionHeader('Backup', 'For when the BBs run out'));
  const row = shopCatalogRow(item);
  shopIconImg(row.firstElementChild, shopNoodlePic(56, 56), item.name, { item: 'gear:noodle' });
  c.appendChild(row);
}
function startNoodleSwing() {
  if (Game.mode !== 'scenario' || Game.paused || Game.forfeitAsk || !noodleCarried()) return false;
  if (Game.player._holdT > 0 || Game.player._goingHome) return false;   // v1.280 (D.47; v1.290: walking home)
  const N = Game.noodle;
  if (N.t >= 0 || N.cd > 0) return false;
  if (Game.held.using) { Game.held.using = false; Game.held.useProgress = 0; Game.held.useKind = null; Game.held._feedingActive = false; }
  N.t = 0; N.cd = NOODLE_COOLDOWN; N.hitDone = false;
  N.swings = (N.swings || 0) + 1;
  playNoodleWhoosh();
  return true;
}
function updateNoodle(dt) {
  const N = Game.noodle;
  if (N.cd > 0) N.cd = Math.max(0, N.cd - dt);
  if (N.t < 0) return;
  N.t += dt;
  if (!N.hitDone && N.t >= NOODLE_HIT_AT) { N.hitDone = true; noodleStrike(); }
  if (N.t >= NOODLE_SWING) N.t = -1;
}
// who the swing lands on: the nearest kid of the other side within reach, in the cone, with nothing in the way
function noodleTarget() {
  const P = Game.player, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), mine = combatantTeam(P);
  let best = null, bd = Infinity;
  for (const c of Game.scenario.enemies || []) {
    if (combatantTeam(c) === mine || c.behavior === 'tagger') continue;
    const dx = c.pos.x - P.pos.x, dz = c.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > NOODLE_REACH || d >= bd) continue;
    if (d > 0.3 && (dx * fx + dz * fz) / d < NOODLE_CONE) continue;
    const eyeY = P.pos.y + (P.eyeOffset || 1.4) * 0.8;
    if (d > 0.3 && !hasLineOfSight(P.pos.x, eyeY, P.pos.z, c.pos.x, _combatantChestY(c), c.pos.z, P.obstacles)) continue;
    best = c; bd = d;
  }
  return best;
}
function noodleStrike() {
  if (Game.mode !== 'scenario') return;
  const c = noodleTarget(), N = Game.noodle;
  if (!c) return;
  const wasOut = c.health <= 0 || c.state === 'retreating';
  const at = new THREE.Vector3(c.pos.x, _combatantChestY(c), c.pos.z);
  applyBBHit({ owner: 'player', pos: at, spawnPos: Game.player.pos.clone(), noodle: true }, c);
  N.hits = N.hits || [];
  N.hits.push({ name: c.name, out: wasOut, t: +(Game.scenario.roundTime || 0).toFixed(2) });
  if (!wasOut) kidSayLine(c, NOODLE_LINES[Math.floor(gameRandom() * NOODLE_LINES.length)]);
}
// a kid says a given line where he stands (as tryNpcSpeak, but this line, now)
function kidSayLine(e, line) {
  e._lastLine = line;
  if (typeof speechSynthesis === 'undefined') return;
  try {
    const { vol } = positionalAudio(e.pos.x, e.pos.z, 24);
    if (vol < 0.12) return;
    playVoiceMarker(e.pos.x, e.pos.z);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line), v = voiceForCharId(e.charId || '');
    if (v) u.voice = v;
    u.rate = 1.15; u.pitch = 1.15;
    u.volume = 0.5 * vol * Settings.effects;
    speechSynthesis.speak(u);
    const now = Game.scenario?.roundTime || 0;   // v1.268: on the round clock, as tryNpcSpeak's (v1.150)
    VOICE.globalCooldownUntil = now + 1.5;
    e._voiceCooldownUntil = now + 4.0;
  } catch (err) {}
}
function playNoodleWhoosh() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.22);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * Settings.effects, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(sfxOut()); o.start(t); o.stop(t + 0.25);
}
// the swing in first person: wound back to the right, across to the left, back to rest
function poseFPNoodle() {
  const br = fpNoodle.userData.baseRot, bp = fpNoodle.userData.basePos, t = Game.noodle.t;
  let z = br.z, x = br.x, px = bp.x;
  if (t >= 0) {
    const p = t / NOODLE_SWING, ease = s => s * s * (3 - 2 * s);
    if (p < 0.3) { const s = ease(p / 0.3); z = br.z + (-0.75 - br.z) * s; px = bp.x + 0.06 * s; }
    else if (p < 0.6) { const s = ease((p - 0.3) / 0.3); z = -0.75 + 1.85 * s; x = br.x - 0.35 * Math.sin(s * Math.PI); px = bp.x + 0.06 - 0.16 * s; }
    else { const s = ease((p - 0.6) / 0.4); z = 1.1 + (br.z - 1.1) * s; px = bp.x - 0.1 + 0.1 * s; }
  }
  fpNoodle.position.set(px, bp.y, bp.z);
  fpNoodle.userData.swing.rotation.set(x - br.x, 0, z - br.z);
}
Game.noodle = { t: -1, cd: 0 };

// === SPEED LOADER TIERS ===
const SPEED_LOADER_TIERS = {
  sl_25:  { capacity: 25,  name: 'Speed Loader (25)',  price: 0 },    // v1.324 (D.61): Seth's, given in Squad Basics; not sold
  sl_50:  { capacity: 50,  name: 'Speed Loader (50)',  price: 15 },
  sl_100: { capacity: 100, name: 'Speed Loader (100)', price: 25 },
  sl_200: { capacity: 200, name: 'Speed Loader (200)', price: 50 },
};

// =====================================================================
// v1.60 — LOADOUT WEIGHT. Every carried thing has a weight (flavor "lbs"). The
// total is shown in the closet so the player can see the tradeoff; the CARRIED
// GEAR portion (mags + loaders + armor, i.e. everything EXCEPT the gun itself)
// adds a movement-speed penalty ON TOP of the gun's existing playerSpeedMult.
// The gun isn't taxed twice — its handling already scales speed — but its weight
// still counts toward the displayed total so the number reflects the whole kit.
// =====================================================================
const GUN_WEIGHT = {
  pistol: 2, mac10: 3, mp5: 5, ump: 5, shotgun: 6, ar: 8, ak47: 8, sniper: 10,
  sixshooter: 2, boltpistol: 3, thunder: 5, bucket: 6,   // v1.168
  rattle: 2, sprayer: 2.5, ghost: 2.5, ticktock: 4,       // v1.250: hollow plastic
  famas: 8,                                               // v1.325: the AR's weight
  epistol: 2.5, erifle: 8.5,                              // v1.326: a battery adds a little
  burst: 8.5,                                             // v1.327
  semishotgun: 7,                                         // v1.328
  m249: 15,                                               // v1.335: the heaviest gun
  l96: 11,                                                // v1.336: the heavy spring and barrel
  p90: 4.5,                                               // v1.346: a short bullpup, lighter than the MP5
  vector: 5.5,                                            // v1.348: a little heavier than the MP5
  g36: 7,                                                 // v1.371: a short rifle, lighter than the AK
  aug: 7.5,                                               // v1.372: a long barrel in a short body
  m4: 6.5,                                                // v1.373: the lightest of the rifles
  svd: 9,                                                 // v1.395: lighter than the bolt guns (10, 11)
  rpk: 11,                                                // v1.396: the AK's 8 with a long barrel and a drum; the M249 15
  spas: 8.5,                                              // v1.398: steel, heavier than the Spring Shotgun (6)
  gaspistol: 3,                                           // v1.399: a steel slide and a gas mag
  m14: 9.5,                                               // v1.404: walnut and steel, between the AR and the bolt guns
  thompson: 10,                                           // v1.403: steel and walnut, the heaviest SMG (the Vector 5.5)
};
// Spare-mag weights by refId (bigger drums weigh more).
const MAG_WEIGHT = {
  spare_mag_10: 0.6, spare_mag_12: 0.8,
  spare_mag_shotgun: 1.4, spare_mag_ar: 1.2, spare_mag_sniper: 1.0,
  spare_mag_ak47: 2.4, spare_mag_ak47_500: 3.2,
  spare_mag_mp5: 1.6, spare_mag_mp5_200: 2.0,
  spare_mag_ump: 1.4, spare_mag_ump_200: 1.8,
  spare_mag_mac10: 0.8, spare_mag_mac10_100: 1.2,
  spare_mag_thunder: 1.0, spare_mag_sixshooter: 0.3, spare_mag_bucket: 1.6, spare_mag_boltpistol: 0.5,   // v1.168
  spare_mag_famas: 1.2,   // v1.325
  spare_mag_epistol: 0.6, spare_mag_erifle: 1.3,   // v1.326
  spare_mag_burst: 1.6,   // v1.327
  spare_mag_semishotgun: 1.4,   // v1.328
  spare_mag_m249: 4.5,   // v1.335
  spare_mag_l96: 0.8,   // v1.336
  spare_mag_p90: 1.2,   // v1.346
  spare_mag_vector: 0.8,   // v1.348
  spare_mag_g36: 1.4,   // v1.371
  spare_mag_aug: 1.5,   // v1.372
  spare_mag_m4: 1.3,   // v1.373
  spare_mag_svd: 0.9,   // v1.395
  spare_mag_rpk: 3,   // v1.396
  spare_mag_spas: 1.5,   // v1.398
  spare_mag_gas: 0.7,   // v1.399: a gas mag is heavy for its size
  spare_mag_thompson: 1.4,   // v1.403: a drum
  spare_mag_m14: 0.8,   // v1.404
};
// Speed-loader weight scales gently with capacity.
function speedLoaderWeight(tierId) {
  const cap = SPEED_LOADER_TIERS[tierId]?.capacity || 50;
  return 0.8 + cap / 100;   // 50→1.3, 100→1.8, 200→2.8
}
// Armor weights by piece id.
const ARMOR_WEIGHT = { chest_light: 2.5, chest_heavy: 6, knee_pads: 1, elbow_pads: 0.8 };

// Total loadout weight + a breakdown, computed from the persisted loadout.
// gunW = the equipped gun; gearW = everything carried in slots + worn armor.
function computeLoadoutWeight() {
  const gunW = GUN_WEIGHT[Game.persist.equipped.gun] ?? 3;
  let gearW = 0;
  const parts = [];
  for (const slot of Game.persist.loadoutSlots) {
    if (!slot) continue;
    if (slot.kind === 'spare_mag') {
      const w = MAG_WEIGHT[slot.refId] ?? 1;
      gearW += w; parts.push({ label: 'Spare mag', w });
    } else if (slot.kind === 'speed_loader') {
      const sl = Game.persist.speedLoaders.find(s => s.id === slot.refId);
      const w = sl ? speedLoaderWeight(sl.tier) : 1.3;
      gearW += w; parts.push({ label: 'Speed loader', w });
    } else if (slot.kind === 'noodle') {
      gearW += 0.3; parts.push({ label: 'Pool noodle', w: 0.3 });   // v1.249
    }
  }
  const armorMap = Game.persist.equipped.armor || {};
  for (const zone in armorMap) {
    const id = armorMap[zone];
    if (!id) continue;
    const w = ARMOR_WEIGHT[id] ?? 1;
    gearW += w; parts.push({ label: ARMOR[id]?.name || 'Armor', w });
  }
  // v1.169: a homemade part on the gun's under-barrel slot (the taped mag, the foregrip) is carried gear too
  const under = getUnderPart(Game.persist.equipped.gun);
  if (under && under.weight) { gearW += under.weight; parts.push({ label: under.name, w: under.weight }); }
  return { gunW, gearW, total: gunW + gearW, parts };
}

// Map CARRIED-GEAR weight to a movement-speed multiplier. The first few pounds
// are nearly free; it ramps up after that. Capped so even a maxed kit doesn't
// fall below a floor (you can always move). ~0 lb → 1.0, ~6 lb → ~0.93,
// ~12 lb → ~0.86, hard floor 0.80.
function loadoutWeightSpeedMult() {
  const { gearW } = computeLoadoutWeight();
  const penalty = Math.min(0.20, gearW * 0.012);   // 0.012 per lb, capped at 0.20
  return 1 - penalty;
}

// A light/medium/heavy descriptor + accent color for the HUD/closet readout.
function weightTier(total) {
  // v1.287 (D.46): ink is the same tier in pen, readable on the paper loadout (4.5 : 1 or more)
  if (total <= 6)  return { label: 'Light',  color: '#6abf69', ink: '#2e6a2a' };
  if (total <= 12) return { label: 'Medium', color: '#d6b24d', ink: '#7a5a00' };
  if (total <= 18) return { label: 'Heavy',  color: '#e08a3c', ink: '#9a4a10' };
  return { label: 'Very Heavy', color: '#e74c3c', ink: '#b3261e' };
}


// Generate unique speed-loader instance ID
let _speedLoaderIdCounter = 0;
function newSpeedLoaderId() {
  _speedLoaderIdCounter++;
  return 'sl_' + Date.now().toString(36) + '_' + _speedLoaderIdCounter;
}

function buySpeedLoader(tierId) {
  const tier = SPEED_LOADER_TIERS[tierId];
  if (!tier) return false;
  const sl = {
    id: newSpeedLoaderId(),
    tier: tierId,
    // v1.50: ships EMPTY — loaders are reusable and fill from your bag at the
    // start of each round (and return leftovers to the bag at the end), so a
    // fresh loader granting a free capacity of BBs would be off-economy.
    currentBBs: 0,
  };
  Game.persist.speedLoaders.push(sl);
  return true;
}

// Find any speed loader not currently equipped
function getUnequippedSpeedLoaders() {
  const equippedIds = new Set();
  for (const s of Game.persist.loadoutSlots) {
    if (s && s.kind === 'speed_loader') equippedIds.add(s.refId);
  }
  return Game.persist.speedLoaders.filter(s => !equippedIds.has(s.id));
}

// v1.50: speed loaders are reusable gear, not consumables. They refill from the
// home bag between rounds (like a mag is filled), and any BBs left inside are
// returned to the bag when the loader is unequipped or the round ends.

// Return one loader's remaining BBs to the bag and empty it. Returns BBs moved.
function returnSpeedLoaderToBag(sl) {
  if (!sl || sl.currentBBs <= 0) return 0;
  const moved = sl.currentBBs;
  Game.persist.bag += moved;
  sl.currentBBs = 0;
  return moved;
}

// Top up every EQUIPPED speed loader from the bag, up to each one's capacity,
// taking only what the bag can spare (so it never goes negative). Called at
// scenario start, AFTER the gun mag is filled, so the mag has first claim on
// the bag — matching the "you load your mag, then top off your loaders" feel.
function refillEquippedSpeedLoadersFromBag() {
  for (const slot of Game.persist.loadoutSlots) {
    if (!slot || slot.kind !== 'speed_loader') continue;
    const sl = Game.persist.speedLoaders.find(s => s.id === slot.refId);
    if (!sl) continue;
    const cap = SPEED_LOADER_TIERS[sl.tier]?.capacity || 0;
    const room = cap - sl.currentBBs;
    if (room <= 0) continue;
    const take = Math.min(room, Game.persist.bag);
    if (take <= 0) continue;
    sl.currentBBs += take;
    Game.persist.bag -= take;
  }
}

// v1.323 (backlog B.14, Michael 22 Oct: a spare mag "should persist between rounds and refill with available BBs"):
// a spare mag is gear you keep, not used up. At BEGIN each one in a slot that fits your gun loads from the bag, after
// the gun's mag and the taped twin (up to its size, or the gun's mag if that is smaller), into Game.gun.spareAmmo by
// slot. The swap trades mags: the fresh one goes in and the one you pulled goes in the pouch with what it had left, so
// the slot stays and no BB is lost. Whatever is left in them goes back in the bag when the match ends.
function fillSpareMagsFromBag() {
  Game.gun.spareAmmo = {};
  Game.persist.loadoutSlots.forEach((slot, i) => {
    if (!slot || slot.kind !== 'spare_mag') return;
    if (MAG_GUN_FIT[slot.refId] && MAG_GUN_FIT[slot.refId] !== Game.gun.type) return;
    const take = Math.min((describeSlot(i) || {}).magCap || 0, Game.gun.maxAmmo, Game.persist.bag);
    Game.gun.spareAmmo[i] = take;
    Game.persist.bag -= take;
  });
}
function returnSpareMagsToBag() {
  for (const i in Game.gun.spareAmmo || {}) Game.persist.bag += Game.gun.spareAmmo[i];
  Game.gun.spareAmmo = {};
}

// Return every EQUIPPED speed loader's remaining BBs to the bag (round end).
function returnEquippedSpeedLoadersToBag() {
  for (const slot of Game.persist.loadoutSlots) {
    if (!slot || slot.kind !== 'speed_loader') continue;
    const sl = Game.persist.speedLoaders.find(s => s.id === slot.refId);
    if (sl) returnSpeedLoaderToBag(sl);
  }
}

// === GUN SPECS — single source of truth for per-gun mechanics ===
// Each gun has:
//   - muzzleVelocity: BB speed in m/s
//   - baseSpread: random velocity jitter at fire time (lower = more accurate)
//   - adsSpreadMult: spread multiplier when aiming down sights (lower = better ADS bonus)
//   - curveOnsetDistance: meters of flat flight before curve acceleration kicks in
//   - curveStrengthMax: ceiling of the per-BB curve strength (lower = less wobble overall)
//   - pelletsPerShot: function returning N projectiles per LMB click (1 for most, 2-3 for shotgun)
//   - cockTime: seconds to fully cock between shots
//   - cockType: animation type for the FP mesh ('slide'|'pump'|'charge'|'bolt')
//   - displayName: shown in HUD/shop/loadout
// v1.20: gun specs now have a `fireMode` ('semi' | 'auto'). Semi guns (the
// existing pistol/shotgun/ar/sniper) require a re-cock between every shot.
// Auto guns (new: ak47, mp5, ump, mac10) cock ONCE to chamber the first round,
// then fire continuously while LMB is held at `cyclicRPM` rounds-per-minute
// (no slide animation between shots — the bolt cycles internally). They also
// have MASSIVE magazines compared to the spring guns.
//
// Tuning categories (per design):
//   - Automatic Rifle (AR family — AK-47): 300-500 BB mags, high velocity,
//     minimal sway, high RoF.
//   - SMG (MP5, UMP): 100-200 BB mags, high RoF, high velocity, moderate
//     distance before wobble.
//   - Machine Pistol (MAC-10): 50-100 BB mags, high RoF, moderate velocity,
//     low distance before wobble.
const GUN_SPECS = {
  pistol: {
    fireMode: 'semi',
    // v1.21: weight class governs player movement speed. Light/medium/heavy/very_heavy.
    weightClass: 'light',
    playerSpeedMult: 1.15,   // pistol = fastest
    muzzleVelocity: 30,
    baseSpread: 0.4,
    adsSpreadMult: 0.4,
    curveOnsetDistance: 4,
    curveStrengthMax: 18,
    pelletsPerShot: () => 1,
    cockTime: 0.7,
    cockType: 'slide',
    displayName: 'Spring Pistol',
  },
  shotgun: {
    fireMode: 'semi',
    weightClass: 'medium',
    playerSpeedMult: 1.0,    // shotgun = baseline
    muzzleVelocity: 30,
    baseSpread: 0.55,         // a bit more hipfire spread than pistol
    adsSpreadMult: 0.5,
    curveOnsetDistance: 8,
    curveStrengthMax: 18,
    pelletsPerShot: () => 2 + Math.floor(gameRandom() * 2),  // 2 or 3
    cockTime: 0.85,           // pump action takes slightly longer than slide
    cockType: 'pump',
    displayName: 'Spring Shotgun',
  },
  ar: {
    fireMode: 'semi',
    weightClass: 'heavy',
    playerSpeedMult: 0.85,   // AR = slow; you don't charge with a rifle
    muzzleVelocity: 45,
    baseSpread: 0.28,         // tighter than pistol
    adsSpreadMult: 0.35,
    curveOnsetDistance: 10,
    curveStrengthMax: 15,
    pelletsPerShot: () => 1,
    cockTime: 0.55,           // charging handle is quick
    cockType: 'charge',
    displayName: 'Spring Assault Rifle',
  },
  sniper: {
    fireMode: 'semi',
    weightClass: 'very_heavy',
    playerSpeedMult: 0.75,   // sniper = slowest; positioning matters
    muzzleVelocity: 75,
    baseSpread: 0.12,         // very accurate
    adsSpreadMult: 0.25,
    curveOnsetDistance: 25,
    curveStrengthMax: 6,      // much reduced wobble — best hop-up
    pelletsPerShot: () => 1,
    cockTime: 1.1,            // bolt action is deliberate
    cockType: 'bolt',
    displayName: 'Spring Sniper Rifle',
  },

  // --- Automatic Rifle: AK-47 ---
  // High velocity, minimal sway, FLAT trajectory for a long distance.
  // 600 RPM cyclic (10/sec) — classic AK rate. Massive 350-BB drum.
  ak47: {
    fireMode: 'auto',
    weightClass: 'heavy',
    playerSpeedMult: 0.85,   // same weight class as the spring AR
    cyclicRPM: 600,           // 10 shots/sec
    muzzleVelocity: 55,       // higher than the spring AR (45)
    baseSpread: 0.32,         // moderate hipfire — recoil grows under sustained fire
    adsSpreadMult: 0.35,
    curveOnsetDistance: 20,   // BBs travel STRAIGHT a long way before wobble
    curveStrengthMax: 8,      // minimal sway when wobble starts
    pelletsPerShot: () => 1,
    cockTime: 0.6,            // initial chamber-rack only; no re-cock between shots
    cockType: 'charge',
    displayName: 'AK-47',
  },

  // --- SMG: MP5 ---
  // 800 RPM cyclic (very fast), high velocity, moderate range before wobble.
  // 150-BB stick mag.
  mp5: {
    fireMode: 'auto',
    weightClass: 'medium',
    playerSpeedMult: 1.05,   // SMGs are noticeably nimble — between pistol and shotgun
    cyclicRPM: 800,           // 13.3 shots/sec
    muzzleVelocity: 50,       // high — comparable to AR family
    baseSpread: 0.34,
    adsSpreadMult: 0.4,
    curveOnsetDistance: 14,   // moderate flat-flight distance
    curveStrengthMax: 11,
    pelletsPerShot: () => 1,
    cockTime: 0.55,
    cockType: 'charge',
    displayName: 'MP5',
  },

  // --- SMG: UMP ---
  // Slightly slower cyclic than the MP5 (more controllable), heavier feel.
  // 600 RPM, slightly lower velocity, 150-BB mag.
  ump: {
    fireMode: 'auto',
    weightClass: 'medium',
    playerSpeedMult: 1.05,
    cyclicRPM: 600,
    muzzleVelocity: 48,
    baseSpread: 0.32,         // a touch tighter than MP5 thanks to slower cyclic
    adsSpreadMult: 0.4,
    curveOnsetDistance: 14,
    curveStrengthMax: 11,
    pelletsPerShot: () => 1,
    cockTime: 0.55,
    cockType: 'charge',
    displayName: 'UMP',
  },

  // --- Machine Pistol: MAC-10 ---
  // Brutal cyclic (1100 RPM ~ historical) — spray-and-pray. Moderate velocity,
  // BBs wobble early — close-range bullet hose. 75-BB stick mag.
  mac10: {
    fireMode: 'auto',
    weightClass: 'light',
    playerSpeedMult: 1.15,   // machine pistol = light, encourages run-and-gun
    cyclicRPM: 1100,          // 18.3 shots/sec
    muzzleVelocity: 38,       // moderate (less than the SMGs)
    baseSpread: 0.5,          // hosing — wide hipfire
    adsSpreadMult: 0.55,
    curveOnsetDistance: 7,    // wobble onset comes EARLY — short effective range
    curveStrengthMax: 16,
    pelletsPerShot: () => 1,
    cockTime: 0.6,
    cockType: 'charge',
    displayName: 'MAC-10',
  },

  // v1.168 (backlog D.14 A, Michael: D): the backyard guns. Each one is a trade, not an upgrade.
  // Thunder Pump: a pump-up air shotgun. A long pump between shots, then 4-5 BBs in a wide, slow cloud.
  thunder: {
    fireMode: 'semi',
    weightClass: 'medium',
    playerSpeedMult: 1.0,
    muzzleVelocity: 27,
    baseSpread: 1.9,          // the spring shotgun's 0.55: about four times its cloud, a metre wide at 15 m
    adsSpreadMult: 0.65,      // aiming barely tightens it
    curveOnsetDistance: 6,
    curveStrengthMax: 20,
    pelletsPerShot: () => 4 + Math.floor(gameRandom() * 2),  // 4 or 5
    cockTime: 1.05,           // pumping up the air takes a while
    cockType: 'pump',
    displayName: 'Thunder Pump',
  },
  // Six-Shooter: a cap-gun revolver. Thumbing the hammer is the fastest re-cock of any gun, but six to a cylinder.
  sixshooter: {
    fireMode: 'semi',
    weightClass: 'light',
    playerSpeedMult: 1.15,
    muzzleVelocity: 32,
    baseSpread: 0.36,
    adsSpreadMult: 0.4,
    curveOnsetDistance: 5,
    curveStrengthMax: 16,
    pelletsPerShot: () => 1,
    cockTime: 0.3,
    cockType: 'hammer',
    displayName: 'Six-Shooter',
  },
  // Bucket Gun: an electric hopper gun. Hundreds of BBs, but slow and soft: they wobble off early.
  bucket: {
    fireMode: 'auto',
    weightClass: 'medium',
    playerSpeedMult: 0.95,
    cyclicRPM: 420,           // 7 a second, a toy motor
    muzzleVelocity: 23,       // the slowest gun
    baseSpread: 0.45,
    adsSpreadMult: 0.6,
    curveOnsetDistance: 5,
    curveStrengthMax: 22,
    pelletsPerShot: () => 1,
    cockTime: 0.4,            // flick the power switch
    cockType: 'switch',
    displayName: 'Bucket Gun',
  },
  // Bolt Pistol: a long-barrel bolt pistol. Sniper-like accuracy at pistol weight, at a sniper's re-cock.
  boltpistol: {
    fireMode: 'semi',
    weightClass: 'light',
    playerSpeedMult: 1.1,
    muzzleVelocity: 52,
    baseSpread: 0.14,
    adsSpreadMult: 0.3,
    curveOnsetDistance: 16,
    curveStrengthMax: 8,
    pelletsPerShot: () => 1,
    cockTime: 1.0,
    cockType: 'bolt',
    displayName: 'Bolt Pistol',
  },
  // v1.250 (backlog D.37, Michael: B): the cheap clear-plastic automatics. `burstJam` is the chance a burst jams (it
  // goes a few BBs in first); R held clears it, as any jam. v1.302 (backlog D.56, Michael 21 Oct: "All of the 'cheap'
  // automatics should have a fairly high jamming rate"): all four jam, the Sprayer and the Tick-Tock one burst in five
  // as the Ghost Mini does, the Rattle Can one in four.
  sprayer: {   // Clear Sprayer: 6 BBs a second, every one curves hard (about a 3 m circle at 15 m)
    fireMode: 'auto', weightClass: 'light', playerSpeedMult: 1.1,
    cyclicRPM: 360, muzzleVelocity: 32, baseSpread: 0.55, adsSpreadMult: 0.8,
    curveOnsetDistance: 2, curveStrengthMax: 30, curveStrengthMin: 12, burstJam: 0.2,   // v1.302 (D.56): it jams too
    pelletsPerShot: () => 1, cockTime: 0.4, cockType: 'switch', displayName: 'Clear Sprayer',
  },
  ghost: {     // Ghost Mini: steady, but about one burst in five jams
    fireMode: 'auto', weightClass: 'light', playerSpeedMult: 1.1,
    cyclicRPM: 360, muzzleVelocity: 38, baseSpread: 0.30, adsSpreadMult: 0.45,   // v1.295 (D.50, Michael: A): 10 → 6 a second
    curveOnsetDistance: 10, curveStrengthMax: 12, burstJam: 0.2,
    pelletsPerShot: () => 1, cockTime: 0.5, cockType: 'charge', displayName: 'Ghost Mini',
  },
  ticktock: {  // Tick-Tock: accurate up close, 2 BBs a second
    // v1.295 (backlog D.50, Michael: A, 21 Oct): it beat the $85 rifle and the $95 Bolt Pistol at everything, so its BB
    // is slower (50 → 38 m/s) and wider (0.14 → 0.30): about 28 m of reach, and the long shots are theirs again
    fireMode: 'auto', weightClass: 'medium', playerSpeedMult: 1.0,
    cyclicRPM: 120, muzzleVelocity: 38, baseSpread: 0.30, adsSpreadMult: 0.3,
    curveOnsetDistance: 20, curveStrengthMax: 6, burstJam: 0.2,   // v1.302 (D.56): it jams too
    pelletsPerShot: () => 1, cockTime: 0.6, cockType: 'charge', displayName: 'Tick-Tock',
  },
  rattle: {    // Rattle Can: all three faults at once
    fireMode: 'auto', weightClass: 'light', playerSpeedMult: 1.1,
    cyclicRPM: 120, muzzleVelocity: 28, baseSpread: 0.55, adsSpreadMult: 0.8,
    curveOnsetDistance: 2, curveStrengthMax: 30, curveStrengthMin: 12, burstJam: 0.25,
    pelletsPerShot: () => 1, cockTime: 0.4, cockType: 'switch', displayName: 'Rattle Can',
  },
};
// v1.325 (backlog D.63, Michael: A): the FAMAS shoots exactly as the Spring Assault Rifle, so it takes the AR's spec
GUN_SPECS.famas = Object.assign({}, GUN_SPECS.ar, { displayName: 'FAMAS' });
// v1.326 (D.63, batch 1): the electric semi-autos. `electric`: the gun stays cocked after a shot and a fresh pull
// fires again once `semiRPM`'s cycle is done (the spring guns wait FIRE_LOCKOUT and a cock). They shoot as their
// spring kin otherwise; the pistol's BB is a little faster (a battery spring, 30 → 34 m/s).
GUN_SPECS.epistol = Object.assign({}, GUN_SPECS.pistol, { electric: true, semiRPM: 300, muzzleVelocity: 34, playerSpeedMult: 1.12, displayName: 'Electric Pistol' });
GUN_SPECS.erifle = Object.assign({}, GUN_SPECS.ar, { electric: true, semiRPM: 360, displayName: 'Electric Rifle' });
// v1.327 (D.63, batch 1): the Burst Rifle. `burst`: a pull fires that many BBs at `cyclicRPM` (held or let go), then
// the trigger wants letting go and pulling again; the next burst may start FIRE_LOCKOUT after the last BB. The AR's BB.
GUN_SPECS.burst = Object.assign({}, GUN_SPECS.ar, { electric: true, burst: 3, cyclicRPM: 720, playerSpeedMult: 0.83, displayName: 'Burst Rifle' });
// v1.328 (D.63, batch 1): the Semi-Auto Shotgun, the spring shotgun's 2-3 BBs a pull with nothing to pump (electric,
// 2.5 pulls a second at most); a new mag is racked with its charging handle
GUN_SPECS.semishotgun = Object.assign({}, GUN_SPECS.shotgun, { electric: true, semiRPM: 150, cockType: 'charge', cockTime: 0.6, displayName: 'Semi-Auto Shotgun' });
// v1.335 (D.63, batch 2): the M249, the AK's straight-flying BB at 12.5 a second from an 800-BB box, a little wider
// from the hip; the slowest walk of any gun (the sniper's), and a new box takes a long rack of its charging handle
GUN_SPECS.m249 = Object.assign({}, GUN_SPECS.ak47, { weightClass: 'very_heavy', playerSpeedMult: 0.75, cyclicRPM: 750, muzzleVelocity: 52, baseSpread: 0.40, adsSpreadMult: 0.35, curveOnsetDistance: 18, curveStrengthMax: 9, cockTime: 1.0, displayName: 'M249' });
// v1.336 (D.63, batch 2): the L96, the sniper's bolt gun with a heavier spring: its BB 85 m/s (75), tighter (0.10,
// 0.12) and straight for 30 m (25) before it wobbles, less when it does; the bolt takes 1.3 s (1.1)
GUN_SPECS.l96 = Object.assign({}, GUN_SPECS.sniper, { muzzleVelocity: 85, baseSpread: 0.10, adsSpreadMult: 0.2, curveOnsetDistance: 30, curveStrengthMax: 5, cockTime: 1.3, displayName: 'L96' });
// v1.346 (D.63, batch 2): the P90, the MP5's full auto at 15 a second (13.3) from a 200 mag (150), a quicker walk (1.1,
// 1.05) and a little tighter from the hip; its short barrel gives a slower BB (46 m/s, 50) that wobbles sooner (12 m, 14)
GUN_SPECS.p90 = Object.assign({}, GUN_SPECS.mp5, { playerSpeedMult: 1.1, cyclicRPM: 900, muzzleVelocity: 46, baseSpread: 0.30, curveOnsetDistance: 12, displayName: 'P90' });
// v1.348 (D.63, batch 2): the Vector, the MP5's full auto at 16.7 a second (13.3) from a 100 mag (150); its recoil
// system keeps it tighter aimed (0.28 of the hip spread, 0.4) though as wide from the hip (0.34); the MP5's BB and walk
GUN_SPECS.vector = Object.assign({}, GUN_SPECS.mp5, { cyclicRPM: 1000, adsSpreadMult: 0.28, displayName: 'Vector' });
// v1.371 (D.63, batch 3): the G36C, the AK's full auto at 11.7 a second (10) from a 300 mag (350), tighter aimed (0.30
// of the hip spread, 0.35) and a quicker walk (0.9, 0.85); its short barrel gives a slower BB (52 m/s, 55) straight for 18 m (20)
GUN_SPECS.g36 = Object.assign({}, GUN_SPECS.ak47, { playerSpeedMult: 0.9, cyclicRPM: 700, muzzleVelocity: 52, adsSpreadMult: 0.30, curveOnsetDistance: 18, displayName: 'G36C' });
// v1.372 (D.63, batch 3): the AUG, the AK's full auto at 10.8 a second (10) from a 330 mag (350); its long barrel in a
// bullpup body gives the fastest BB of the rifles (58 m/s, 55) straight for 22 m (20), tighter aimed (0.28, 0.35), a quicker walk (0.88)
GUN_SPECS.aug = Object.assign({}, GUN_SPECS.ak47, { playerSpeedMult: 0.88, cyclicRPM: 650, muzzleVelocity: 58, adsSpreadMult: 0.28, curveOnsetDistance: 22, displayName: 'AUG' });
// v1.373 (D.63, batch 3): the M4, the AK's BB (55 m/s, straight for 20 m) at 12 a second (10) from a 300 mag (350), tighter
// aimed (0.32, 0.35) but wider than the G36C (0.30) and the AUG (0.28), and the quickest walk of the rifles (0.92)
GUN_SPECS.m4 = Object.assign({}, GUN_SPECS.ak47, { playerSpeedMult: 0.92, cyclicRPM: 720, adsSpreadMult: 0.32, displayName: 'M4' });
// v1.395 (D.63, batch 4): the SVD, the sniper on a battery: nothing to cock between shots, at most two pulls a second
// (120); a new mag is racked with the charging handle (0.7 s). For it, a slower BB (70 m/s, 75), wider (0.15, 0.12;
// aimed 0.28, 0.25) and straight for 22 m (25); lighter, so a quicker walk (0.8, 0.75)
GUN_SPECS.svd = Object.assign({}, GUN_SPECS.sniper, { electric: true, semiRPM: 120, cockType: 'charge', cockTime: 0.7, muzzleVelocity: 70, baseSpread: 0.15, adsSpreadMult: 0.28, curveOnsetDistance: 22, playerSpeedMult: 0.8, displayName: 'SVD' });
// v1.396 (D.63, batch 4): the RPK, the AK with a long barrel: a slower trigger (550 a minute, 9.2 a second; the AK 600),
// a faster BB (57 m/s, 55) straight for 23 m (20), aimed 0.33 (0.35); heavier, so a slower walk (0.8, 0.85; the M249
// 0.75), and the drum takes 0.9 s to rack (0.6)
GUN_SPECS.rpk = Object.assign({}, GUN_SPECS.ak47, { cyclicRPM: 550, muzzleVelocity: 57, curveOnsetDistance: 23, adsSpreadMult: 0.33, playerSpeedMult: 0.8, cockTime: 0.9, displayName: 'RPK' });
// v1.398 (D.63, batch 5): the SPAS-12, the Spring Shotgun's pump with three BBs every time (2-3), a faster BB (34 m/s, 30),
// a tighter cloud (0.42, 0.55) that stays straight for longer (10 m, 8); for it a slower pump (1.0 s, 0.85) and a
// slower walk (0.92, 1.0)
GUN_SPECS.spas = Object.assign({}, GUN_SPECS.shotgun, { pelletsPerShot: () => 3, muzzleVelocity: 34, baseSpread: 0.42, curveOnsetDistance: 10, cockTime: 1.0, playerSpeedMult: 0.92, displayName: 'SPAS-12' });
// v1.399 (D.63, batch 5): the Gas Pistol, the Electric Pistol's pull-a-shot (no slide to rack) at 4.5 a second (5), a
// faster BB (40 m/s, 34) straight for 6 m (4), aimed 0.32 (0.4); the gas cools as the mag empties, the last BB at 80%
// of the first's speed (gasFade); a heavier gun, a slower walk (1.1, 1.12)
// v1.404 (D.63, batch 5): the M14, a marksman rifle on the sniper's spec: a battery semi like the SVD, every pull
// fires, at 3 a second (the SVD 2, the Electric Rifle 6); a new mag racked with the charging handle (0.6 s). Between the
// rifles and the snipers: a 60 m/s BB (the AR 45, the SVD 70), straight for 18 m (10, 22), spread 0.18 (0.28, 0.15),
// aimed 0.3; the AR's weight class and walk (0.85; the SVD 0.8)
GUN_SPECS.m14 = Object.assign({}, GUN_SPECS.sniper, { electric: true, semiRPM: 180, cockType: 'charge', cockTime: 0.6, muzzleVelocity: 60, baseSpread: 0.18, adsSpreadMult: 0.3, curveOnsetDistance: 18, curveStrengthMax: 9, playerSpeedMult: 0.85, weightClass: 'heavy', displayName: 'M14' });
// v1.403 (D.63, batch 5): the Thompson, the MP5's full-auto at 560 a minute (800; the slowest SMG, the UMP 600), a
// faster BB (54 m/s, 50) straight for 18 m (14), tighter (0.30, 0.34; aimed 0.36, 0.4), and a heavy gun, so a slower
// walk (0.96, 1.05)
GUN_SPECS.thompson = Object.assign({}, GUN_SPECS.mp5, { cyclicRPM: 560, muzzleVelocity: 54, curveOnsetDistance: 18, baseSpread: 0.30, adsSpreadMult: 0.36, playerSpeedMult: 0.96, displayName: 'Thompson' });
GUN_SPECS.gaspistol = Object.assign({}, GUN_SPECS.pistol, { electric: true, gas: true, gasFade: 0.2, semiRPM: 270, muzzleVelocity: 40, curveOnsetDistance: 6, adsSpreadMult: 0.32, playerSpeedMult: 1.1, displayName: 'Gas Pistol' });

function getGunSpec(gunType) {
  return GUN_SPECS[gunType] || GUN_SPECS.pistol;
}

// === SHOP CATALOG ===
const SHOP_CATALOG = [
  // === BBs (home stash quantities) ===
  // v1.330 (backlog D.66, Michael: B, 23 Oct): five times cheaper (5¢ → 1¢ to 3¢ → 0.6¢ a BB), and sold as they are
  // really sold: a tube, a tube with a spigot, a tall bottle and a big bag
  { id:'bbs_100', category:'BBs', name:'100 BBs (tube)', price:1,
    desc:'A short clear tube of 0.20g BBs. Adds 100 to your home stash.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>{Game.persist.bag+=100;}, buttonLabel:()=>'BUY' },
  { id:'bbs_500', category:'BBs', name:'500 BBs (dispenser)', price:4,
    desc:'A clear tube with a spigot on the cap to pour from. Adds 500 to your home stash.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>{Game.persist.bag+=500;}, buttonLabel:()=>'BUY' },
  { id:'bbs_2000', category:'BBs', name:'2,000 BBs (bottle)', price:14,
    desc:'A tall bottle, about the size of a soda. The serious restock. Adds 2,000 to your home stash.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>{Game.persist.bag+=2000;}, buttonLabel:()=>'BUY' },
  { id:'bbs_5000', category:'BBs', name:'5,000 BBs (bag)', price:30,
    desc:'A big flat bag the size of a book. Best per-BB value, for drum-fed autos that eat ammo. Adds 5,000.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>{Game.persist.bag+=5000;}, buttonLabel:()=>'BUY' },

  // === Loadout: slot unlocks ===
  // v1.106 (backlog D.5, Michael: A): the slot unlocks are gear you'd actually buy, a belt and a holster, and
  // the text says what each one unlocks. Ids and save flags are unchanged (slot_3, slot_4).
  { id:'slot_3', category:'Loadout', name:'Utility Belt', price:30,
    desc:'A web belt with a pouch on each hip. Unlocks loadout slot 3 (key "3"): carry a third item into a match, like a speed loader or a spare mag.',
    isOwned:()=>Game.persist.owned.slot_3, isLocked:()=>false,
    apply:()=>{Game.persist.owned.slot_3=true;}, buttonLabel:()=>Game.persist.owned.slot_3?'OWNED':'BUY' },
  { id:'slot_4', category:'Loadout', name:'Drop-Leg Holster', price:80,
    desc:'Straps to your thigh, below the belt. Unlocks loadout slot 4 (key "4"): a fourth item in a match. Needs the Utility Belt first.',
    isOwned:()=>Game.persist.owned.slot_4, isLocked:()=>!Game.persist.owned.slot_3,
    apply:()=>{Game.persist.owned.slot_4=true;},
    buttonLabel:()=>{ if(Game.persist.owned.slot_4)return 'OWNED'; if(!Game.persist.owned.slot_3)return 'LOCKED'; return 'BUY'; } },

  // === Loadout: speed loaders (held device, refills mag mid-match) ===
  { id:'sl_50', category:'Loadout', name:'Speed Loader (50 BBs)', price:15,
    desc:'Plunger-style loader, holds 50 BBs. Equip in a slot, hold LMB to feed BBs into your mag. ~0.6s per BB.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>buySpeedLoader('sl_50'), buttonLabel:()=>'BUY' },
  { id:'sl_100', category:'Loadout', name:'Speed Loader (100 BBs)', price:25,
    desc:'Larger loader holding 100 BBs. Same reload speed; more juice between home refills.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>buySpeedLoader('sl_100'), buttonLabel:()=>'BUY' },
  { id:'sl_200', category:'Loadout', name:'Speed Loader (200 BBs)', price:50,
    desc:'High-capacity loader for long matches.',
    isOwned:()=>false, isLocked:()=>false, apply:()=>buySpeedLoader('sl_200'), buttonLabel:()=>'BUY' },
  // v1.249 (backlog D.36, Michael: A): the pool noodle, on the Gear tab
  { id:'pool_noodle', category:'Loadout', name:'Pool Noodle', price:15,
    desc:'A foam pool noodle, for when the BBs run out. Put it in a loadout slot: V swings it from anything you hold, or hold its slot and click. Reaches about a metre and a half; a hit tags.',
    isOwned:()=>!!Game.persist.owned.pool_noodle, isLocked:()=>false,
    apply:()=>{Game.persist.owned.pool_noodle=true;}, buttonLabel:()=>Game.persist.owned.pool_noodle?'OWNED':'BUY' },
];

function getShopCategories() {
  const seen = new Set();
  const out = [];
  for (const item of SHOP_CATALOG) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      out.push(item.category);
    }
  }
  return out;
}

function purchaseItem(itemId) {
  const item = SHOP_CATALOG.find(x => x.id === itemId);
  if (!item) return { ok: false, reason: 'unknown item' };
  if (item.isLocked()) return { ok: false, reason: 'locked' };
  if (item.isOwned()) return { ok: false, reason: 'already owned' };
  if (Game.persist.cash < item.price) return { ok: false, reason: 'not enough cash' };
  Game.persist.cash -= item.price;
  item.apply();
  autoSave();   // v1.218 (D.29)
  return { ok: true };
}
