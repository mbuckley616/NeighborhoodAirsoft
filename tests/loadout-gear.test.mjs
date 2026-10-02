// v1.133: the Loadout kid wears what is equipped (backlog D.5 C step 2). Equips each piece of gear in turn and checks
// its meshes are on the kid, on the right body part (eye pro on the head at the eyes, the chest piece on the torso, pads
// at the elbows and knees, the shoes on the feet, the belt at the waist and the holster on the right thigh), and that
// taking it off takes them away again.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

// Helpers in the page: own and equip, then report each gear group's meshes in the kid's own frame
await page.evaluate(() => {
  window._gearState = () => {
    const L = LOADOUT_KID, grp = L.kid.group;
    grp.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(grp.matrixWorld).invert();
    const res = {};
    for (const [k, meshes] of Object.entries(L.gear)) {
      if (!meshes.length) { res[k] = { n: 0 }; continue; }
      const bb = new THREE.Box3();
      for (const m of meshes) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); }
      // inv undoes the group's turn and its scale (height, build), so this is the average kid's frame
      const f = (v) => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
      res[k] = { n: meshes.length, min: f(bb.min), max: f(bb.max), parents: [...new Set(meshes.map(m => m.parent.parent === L.kid.pose.head ? 'head'
        : m.parent.parent === L.kid.pose.torso ? 'torso' : m.parent.parent === L.kid.group ? 'group'
        : (m.parent.parent === L.kid.pose.rigR.elbow || m.parent.parent === L.kid.pose.rigL.elbow) ? 'elbow'
        : (m.parent.parent === L.kid.pose.legL || m.parent.parent === L.kid.pose.legR) ? 'leg'
        : (m.parent.parent === L.kid.pose.shoeL || m.parent.parent === L.kid.pose.shoeR) ? 'shoe' : 'other'))] };
    }
    res.shoeColor = L.kid.pose.shoeL.material.color.getHex();
    return res;
  };
  const P = Game.persist;
  for (const id of Object.keys(EYEWEAR)) if (id !== 'none') P.ownedEquipment.eyewear[id] = true;
  for (const id of Object.keys(SHOES)) if (id !== 'none') P.ownedEquipment.shoes[id] = true;
  for (const id of Object.keys(ARMOR)) P.ownedEquipment.armor[id] = true;
  openLoadout();
});

const bare = await page.evaluate(() => _gearState());
check('a new save wears no gear meshes', ['eyewear', 'chest', 'arms', 'legs', 'shoes', 'belt'].every(k => bare[k].n === 0), bare);
const sneakerColor = bare.shoeColor;

// eye pro: every kind sits on the head, across the eyes (y 1.27), in front of the face (z > 0.14)
const eyes = await page.evaluate(() => {
  const out = {};
  for (const id of Object.keys(EYEWEAR)) {
    if (id === 'none') continue;
    equipEyewear(id); renderLoadoutManager();
    out[id] = _gearState().eyewear;
  }
  equipEyewear('none'); renderLoadoutManager();
  out.none = _gearState().eyewear;
  return out;
});
for (const [id, e] of Object.entries(eyes)) {
  if (id === 'none') continue;
  check(`eye pro ${id}: on the head, across the eyes, in front of the face`,
    e.n > 0 && e.parents.join() === 'head' && e.min[1] < 1.27 && e.max[1] > 1.27 && e.max[2] > 0.15 && e.max[2] < 0.2, e);
}
check('taking the eye pro off takes it away', eyes.none.n === 0, eyes.none);

// chest: the rig and the plate carrier on the torso, standing proud of the shirt front (z 0.12) and back for the vest
const chest = await page.evaluate(() => {
  const P = Game.persist, out = {};
  for (const id of ['chest_light', 'chest_heavy']) { P.equipped.armor.chest = id; renderLoadoutManager(); out[id] = _gearState().chest; }
  return out;
});
check('Foam Chest Rig: on the torso, over the chest front',
  chest.chest_light.parents.join() === 'torso' && chest.chest_light.max[2] > 0.15 && chest.chest_light.min[1] < 0.8 && chest.chest_light.max[1] > 0.95, chest.chest_light);
check('Plate-Carrier Vest: on the torso, front and back plates',
  chest.chest_heavy.parents.join() === 'torso' && chest.chest_heavy.max[2] > 0.18 && chest.chest_heavy.min[2] < -0.15, chest.chest_heavy);

// pads: elbows at the arms' bend (y about 0.8), knees at the knee (y 0.2–0.45), two of each
const pads = await page.evaluate(() => {
  const P = Game.persist;
  P.equipped.armor.arms = 'elbow_pads'; P.equipped.armor.legs = 'knee_pads'; renderLoadoutManager();
  const s = _gearState(); return { arms: s.arms, legs: s.legs };
});
check('Elbow Pads: one on each elbow, at elbow height',
  pads.arms.parents.join() === 'elbow' && pads.arms.n >= 2 && pads.arms.min[1] > 0.65 && pads.arms.max[1] < 0.95 && pads.arms.min[0] < -0.2 && pads.arms.max[0] > 0.2, pads.arms);
check('Knee Pads: one on each leg, at the knee, in front',
  pads.legs.parents.join() === 'leg' && pads.legs.n >= 2 && pads.legs.min[1] > 0.2 && pads.legs.max[1] < 0.45 && pads.legs.max[2] > 0.1, pads.legs);

// shoes: each pair recolours the uppers and adds its sole; sneakers go back to the kid's own
const shoes = await page.evaluate(() => {
  const out = {};
  for (const id of Object.keys(SHOES)) { equipShoes(id); renderLoadoutManager(); const s = _gearState(); out[id] = { ...s.shoes, color: s.shoeColor }; }
  return out;
});
for (const id of ['trail_shoes', 'track_spikes', 'cushioned']) {
  const s = shoes[id];
  check(`shoes ${id}: their own colour and sole, on the feet`, s.n > 0 && s.parents.join() === 'shoe' && s.color !== sneakerColor && s.max[1] < 0.1, s);
}
check('Sneakers (default): no extra mesh, the kid\'s own colour', shoes.none.n === 0 && shoes.none.color === sneakerColor, shoes.none);

// the belt: nothing with two slots; the Utility Belt at the waist (y 0.57); the holster down the right thigh (−x)
const belt = await page.evaluate(() => {
  const P = Game.persist, out = {};
  out.two = _gearState().belt;
  P.owned.slot_3 = true; renderLoadoutManager(); out.three = _gearState().belt;
  P.owned.slot_4 = true; renderLoadoutManager(); out.four = _gearState().belt;
  return out;
});
check('no belt unlock, no belt', belt.two.n === 0, belt.two);
check('Utility Belt: round the waist', belt.three.n > 0 && belt.three.min[1] > 0.45 && belt.three.max[1] < 0.65 && belt.three.max[2] > 0.13, belt.three);
check('Drop-Leg Holster: down the right thigh (the gun side, −x)', belt.four.min[1] < 0.35 && belt.four.min[0] < -0.2 && belt.four.n >= belt.three.n, belt.four);

// a full kit, a turn, and the labels still in place; the kid is not re-built when nothing changed
const full = await page.evaluate(() => {
  equipEyewear('goggles_amber'); equipShoes('trail_shoes'); Game.persist.equipped.armor.chest = 'chest_heavy'; renderLoadoutManager();
  const kid = LOADOUT_KID.kid;
  renderLoadoutManager();
  const same = LOADOUT_KID.kid === kid;
  for (let i = 0; i < 90; i++) stepGame(1 / 60);
  const texts = Object.fromEntries([...document.querySelectorAll('#loKidLabels text[data-key]')].map(t => [t.dataset.key, t.textContent]));
  return { same, texts, inside: LOADOUT_KID.labels.every(l => l.x > 0 && l.x < 280 && l.y > 0 && l.y < 380) };
});
check('nothing changed: the kid is not re-built', full.same, full);
check('full kit: labels name it all, every point on the canvas', full.inside && full.texts.eyes === 'Ski Goggles' && full.texts.chest === 'Plate-Carrier Vest'
  && full.texts.arms === 'Elbow Pads' && full.texts.legs === 'Knee Pads' && full.texts.feet === 'Trail Runners' && full.texts.belt === 'Belt & Holster', full.texts);
await g.shot('loadout-gear');
await page.locator('#loKidCanvas').screenshot({ path: 'tests/out/loadout-gear-kid.png' }).catch(() => {});
// a second look: mesh mask, foam rig, spikes, straight on
await page.evaluate(() => {
  equipEyewear('mesh_mask'); equipShoes('track_spikes'); Game.persist.equipped.armor.chest = 'chest_light'; renderLoadoutManager();
  LOADOUT_KID.yaw = Math.PI; drawLoadoutKid();
});
await page.locator('#loKidCanvas').screenshot({ path: 'tests/out/loadout-gear-kid2.png' }).catch(() => {});
await page.evaluate(() => closeLoadout());
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
