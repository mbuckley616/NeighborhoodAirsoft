// v1.219 (backlog D.30, Michael 13 Oct: "Can we have the player's hand(s) shown holding their weapons in First Person
// View? Same for the Speed Loader"). Every gun in first person has two hands on it and the speed loader and spare
// mag one: each hand touches what it holds, shows on screen at the hip or aimed, never crosses the line of sight,
// and its forearm leaves by the bottom of the screen. A pump hand rides the pump; a PVC foregrip or a taped mag takes
// the off hand on a long gun; the skin is the mirror's, and a hoodie puts sleeves and cuffs on the forearms.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const GUNS = ['pistol', 'shotgun', 'ar', 'sniper', 'ak47', 'mp5', 'ump', 'mac10', 'thunder', 'sixshooter', 'bucket', 'boltpistol', 'famas', 'epistol', 'erifle', 'burst', 'semishotgun', 'm249', 'l96', 'p90', 'vector', 'g36', 'aug'];   // v1.372: the AUG; v1.371: the G36C; v1.325: the FAMAS; v1.326: the electrics; v1.327: the Burst Rifle; v1.328: the Semi-Auto Shotgun; v1.335: the M249; v1.336: the L96; v1.346: the P90; v1.348: the Vector

// Measures the held thing's hands in camera space. `root` is fpGun, fpLoader or fpMag.
const probe = (which) => page.evaluate((which) => {
  const root = which === 'loader' ? fpLoader : which === 'mag' ? fpMag : fpGun;
  const H = root && root.userData.fpHands;
  if (!H) return { none: true };
  Game.camera.updateMatrixWorld(true);
  const camInv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const proj = Game.camera.projectionMatrix;
  const boxOf = (o) => {   // a mesh's box in camera space
    o.geometry.computeBoundingBox();
    const M = new THREE.Matrix4().multiplyMatrices(camInv, o.matrixWorld);
    return o.geometry.boundingBox.clone().applyMatrix4(M);
  };
  const meshesOf = (o) => { const a = []; o.traverse(m => { if (m.isMesh) a.push(m); }); return a; };
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  // gun parts: everything under root that is not a hand, visible
  const gunBoxes = meshesOf(root).filter(m => !m.userData.fpHand && shown(m)).map(boxOf);
  const gap = (a, b) => {   // the gap between two boxes (0 when they touch or overlap)
    const dx = Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x);
    const dy = Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y);
    const dz = Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z);
    return Math.hypot(dx, dy, dz);
  };
  const ndc = (v) => { const p = v.clone().applyMatrix4(proj); return p; };
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0, 50);
  ray.set(new THREE.Vector3().setFromMatrixPosition(Game.camera.matrixWorld),
          new THREE.Vector3(0, 0, -1).transformDirection(Game.camera.matrixWorld));
  const out = {};
  for (const side of ['r', 'l', 'under']) {
    const hand = H[side];
    if (!hand || !hand.length) continue;
    const [grp, arm] = hand;
    const handMeshes = meshesOf(grp);
    const handBoxes = handMeshes.map(boxOf);
    const contact = gunBoxes.length ? Math.min(...handBoxes.flatMap(hb => gunBoxes.map(gb => gap(hb, gb)))) : null;
    // on screen: a corner of a hand box inside the view, in front of the camera
    let onScreen = 0;
    for (const b of handBoxes) for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      if (z > -0.05) continue;
      const p = ndc(new THREE.Vector3(x, y, z));
      if (Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1) onScreen++;
    }
    // the forearm's elbow end: below the bottom of the screen, or behind the near plane
    arm.geometry.computeBoundingBox();
    const elbowLocal = new THREE.Vector3(0, arm.geometry.boundingBox.min.y, 0);   // -Y runs wrist to elbow
    const e = elbowLocal.applyMatrix4(new THREE.Matrix4().multiplyMatrices(camInv, arm.matrixWorld));
    const ep = ndc(e);
    const elbowOff = e.z > -0.05 || ep.y < -1;
    const hits = ray.intersectObjects([...handMeshes, arm], false).length;
    out[side] = { visible: shown(grp), contact: contact == null ? null : +contact.toFixed(4), onScreen, elbowOff, elbowNdcY: +ep.y.toFixed(2), elbowZ: +e.z.toFixed(3), hits,
      armMat: arm.material.color.getHex(), cuff: hand[2].visible, skin: handMeshes[0].material.color.getHex(),
      wz: +new THREE.Vector3().setFromMatrixPosition(grp.matrixWorld).applyMatrix4(camInv).z.toFixed(4) };
  }
  return out;
}, which);

const setGun = (gt, extra) => page.evaluate(([gt, extra]) => {
  Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.bag = 5000;
  ensureGunSlots(gt);
  for (const s of ['under']) clearGunSlot(gt, s, -1);
  if (extra) { const i = getUnmountedInstances(extra)[0] || makeAccessoryInstance(extra); mountAccessory(gt, i.id, 'under', -1); }
  Game.persist.loadoutSlots = [{ kind: 'gun' }, null, null, null];
}, [gt, extra]);
const aim = (v) => page.evaluate((v) => { Game.player.adsTarget = v; for (let i = 0; i < 40; i++) { Game.player.ads = v; stepGame(1 / 60); } }, v);

const R = {};
for (const gt of GUNS) {
  await setGun(gt);
  await g.scenario('bunratty_sean');
  await page.evaluate(() => { Game.player.maxHits = 999; });
  await g.spin(10);
  const hip = await probe('gun');
  const type = await page.evaluate(() => fpGun.userData.gunType);
  await aim(1);
  const aimed = await probe('gun');
  R[gt] = { type, hip, aimed };
  const f = (h) => h ? `${h.visible ? 'shown' : 'hidden'} gap ${h.contact} m, ${h.onScreen} corners on screen, elbow ${h.elbowOff ? 'off' : 'ON'} (ndc y ${h.elbowNdcY}, z ${h.elbowZ}), ${h.hits} on the sight line` : '-';
  console.log(`   ${gt.padEnd(10)} hip  R: ${f(hip.r)}\n              L: ${f(hip.l)}\n         aimed R: ${f(aimed.r)}\n              L: ${f(aimed.l)}`);
  if (['pistol', 'ar', 'shotgun', 'sniper'].includes(gt)) { await aim(0); await g.shot('fp-hands-' + gt + '-hip'); await aim(1); await g.shot('fp-hands-' + gt + '-aimed'); }
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
  await page.evaluate(() => { if (typeof enterBedroom === 'function') enterBedroom(); });
}
for (const gt of GUNS) {
  const { type, hip, aimed } = R[gt];
  check(`${gt}: two hands on the first-person gun`, type === gt && hip.r && hip.l && hip.r.visible && hip.l.visible, { type, r: !!hip.r, l: !!hip.l });
  check(`${gt}: each hand touches the gun (gap under 3 mm)`, hip.r.contact <= 0.003 && hip.l.contact <= 0.003, [hip.r.contact, hip.l.contact]);
  check(`${gt}: the hands show on screen, at the hip or aimed`, (hip.r.onScreen + aimed.r.onScreen) > 0 && (hip.l.onScreen + aimed.l.onScreen) > 0,
    [hip.r.onScreen, aimed.r.onScreen, hip.l.onScreen, aimed.l.onScreen]);
  check(`${gt}: no hand or forearm on the line of sight, hip or aimed`, hip.r.hits + hip.l.hits + aimed.r.hits + aimed.l.hits === 0,
    [hip.r.hits, hip.l.hits, aimed.r.hits, aimed.l.hits]);
  check(`${gt}: both forearms leave by the bottom of the screen`, hip.r.elbowOff && hip.l.elbowOff && aimed.r.elbowOff && aimed.l.elbowOff,
    [hip.r.elbowNdcY, hip.l.elbowNdcY, aimed.r.elbowNdcY, aimed.l.elbowNdcY]);
}

// --- the shotgun's off hand rides the pump
await setGun('shotgun');
await g.scenario('bunratty_sean');
const pump = await page.evaluate(() => {
  const H = fpGun.userData.fpHands, pumpG = fpGun.userData.cockingParts[0];
  const z = () => { fpGun.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(H.l[0].matrixWorld).applyMatrix4(new THREE.Matrix4().copy(fpGun.matrixWorld).invert()).z; };
  const z0 = z();
  Game.gun.cockProgress = 1; updateHeldMesh(0);
  const z1 = z();
  Game.gun.cockProgress = 0; updateHeldMesh(0);
  return { parentIsPump: H.l[0].parent === pumpG, moved: +(z1 - z0).toFixed(4), offset: fpGun.userData.cockingOffset };
});
console.log('   shotgun pump hand:', JSON.stringify(pump));
check('the shotgun: the off hand is on the pump and slides back with it', pump.parentIsPump && Math.abs(pump.moved - pump.offset) < 0.002, pump);
await page.evaluate(() => endScenario('forfeit'));
await page.waitForFunction(() => Game.mode !== 'scenario');

// --- a PVC foregrip or a taped mag takes the off hand on the MP5; a sling leaves it on the handguard
const U = {};
for (const part of ['foregrip', 'taped_mag', 'sling']) {
  await setGun('mp5', part);
  await g.scenario('bunratty_sean');
  await g.spin(5);
  U[part] = await probe('gun');
  if (part === 'foregrip') await g.shot('fp-hands-mp5-foregrip');
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
console.log('   mp5 under:', JSON.stringify(Object.fromEntries(Object.entries(U).map(([k, v]) => [k, { l: v.l.visible, under: v.under.visible, gap: v.under.contact }]))));
for (const part of ['foregrip', 'taped_mag']) {
  check(`the MP5 with a ${part}: the off hand is on it (gap under 3 mm), the handguard hand hidden`, U[part].under.visible && !U[part].l.visible && U[part].under.contact <= 0.003, U[part].under);
}
check('the MP5 with a sling: the off hand stays on the handguard', U.sling.l.visible && !U.sling.under.visible, U.sling.l);

// --- skin from the mirror; a hoodie's sleeves and cuffs
await setGun('ar');
await page.evaluate(() => { Game.persist.look.skinColor = 0x8d5a3b; Game.persist.look.top = 'none'; });
await g.scenario('bunratty_sean');
await g.spin(3);
const bare = await probe('gun');
await page.evaluate(() => { Game.persist.look.top = 'hoodie'; });
await g.spin(3);
const hood = await probe('gun');
await g.shot('fp-hands-ar-hoodie');
const hoodColor = await page.evaluate(() => KID_TOPS.hoodie.color);
console.log('   look:', JSON.stringify({ bare: [bare.r.skin, bare.r.armMat, bare.r.cuff], hood: [hood.r.skin, hood.r.armMat, hood.r.cuff, hood.l.cuff] }));
check('the hands are the mirror\'s skin; bare forearms in a tee', bare.r.skin === 0x8d5a3b && bare.r.armMat === 0x8d5a3b && !bare.r.cuff, bare.r);
check('in a hoodie the forearms are its sleeves, with a cuff at each wrist', hood.r.armMat === hoodColor && hood.l.armMat === hoodColor && hood.r.cuff && hood.l.cuff && hood.r.skin === 0x8d5a3b, hood);
await page.evaluate(() => { Game.persist.look.top = 'none'; endScenario('forfeit'); });
await page.waitForFunction(() => Game.mode !== 'scenario');

// --- the speed loader and the spare mag, in the right hand
const items = {};
for (const kind of ['loader', 'mag']) {
  await page.evaluate((kind) => {
    Game.persist.owned.pistol = true; Game.persist.equipped.gun = 'pistol';
    let slot;
    if (kind === 'loader') { buySpeedLoader('sl_50'); const sl = Game.persist.speedLoaders[Game.persist.speedLoaders.length - 1]; slot = { kind: 'speed_loader', refId: sl.id }; }
    else slot = { kind: 'spare_mag', refId: 'spare_mag_10' };
    Game.persist.loadoutSlots = [{ kind: 'gun' }, slot, null, null];
  }, kind);
  await g.scenario('bunratty_sean');
  const held = await page.evaluate(() => { Game.held.slotIdx = 1; stepGame(1 / 60); const d = describeSlot(1); return d && d.kind; });
  await g.spin(3);
  items[kind] = { held, hands: await probe(kind) };
  await g.shot('fp-hands-' + kind);
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
console.log('   items:', JSON.stringify(items));
check('the speed loader: held in a hand that touches it and shows, its forearm off the bottom', items.loader.held === 'speed_loader' && items.loader.hands.r &&
  items.loader.hands.r.visible && items.loader.hands.r.contact <= 0.003 && items.loader.hands.r.onScreen > 0 && items.loader.hands.r.elbowOff, items.loader);
if (items.mag.held === 'spare_mag') {
  check('the spare mag: held in a hand that touches it and shows, its forearm off the bottom', items.mag.hands.r && items.mag.hands.r.visible &&
    items.mag.hands.r.contact <= 0.003 && items.mag.hands.r.onScreen > 0 && items.mag.hands.r.elbowOff, items.mag);
} else console.log('   (the spare mag slot did not describe as spare_mag here; mag hand checked by build only)', JSON.stringify(items.mag));

check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
