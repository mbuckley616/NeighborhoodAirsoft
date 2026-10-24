// v1.149: the walkie-talkie your kid carries (backlog D.10, Michael: A — "a walkie clipped to your kid's belt, seen
// in first person and on the Loadout kid"). On the Loadout kid it hangs on the left hip at the belt, with its own label;
// in a match it hangs at your hip under the eye: out of view looking ahead, in view looking down, on your left whichever
// way you face, lower when you crouch, and it walks with you. The callouts over it wait on the voices build (PR #22).
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();

// the Loadout kid: the walkie's meshes in the average kid's frame, as tests/loadout-gear does
const lo = await page.evaluate(() => {
  const state = () => {
    const L = LOADOUT_KID, grp = L.kid.group;
    grp.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(grp.matrixWorld).invert(), bb = new THREE.Box3();
    for (const m of L.gear.walkie) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); }
    const f = v => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
    return { n: L.gear.walkie.length, min: f(bb.min), max: f(bb.max), group: L.gear.walkie.every(m => m.parent.parent === grp) };
  };
  openLoadout();
  const out = { bare: state() };
  out.label = document.querySelector('#loKidLabels text[data-key="walkie"]')?.textContent;
  out.lines = document.querySelectorAll('#loKidLabels line').length;
  const hip = LOADOUT_KID.labels.find(l => l.key === 'walkie');
  out.hipOnCanvas = !!hip && hip.x > 0 && hip.x < 280 && hip.y > 0 && hip.y < 380 && hip.ly + 7 < 380;
  // with the Utility Belt and the holster it is still there, and clear of the belt's side pouch (x 0.2–0.25, z ±0.04)
  Game.persist.owned.slot_3 = true; Game.persist.owned.slot_4 = true; renderLoadoutManager();
  out.belted = state();
  closeLoadout();
  return out;
});
const w = lo.bare;
check('the Loadout kid wears a walkie on a new save', w.n > 0 && w.group, w);
check('it is on the left hip (+x), at the belt (y 0.57), on the front of the hips',
  w.min[0] > 0.1 && w.max[0] < 0.2 && w.min[1] > 0.44 && w.min[1] < 0.57 && w.max[1] > 0.6 && w.max[1] < 0.66 && w.min[2] > 0.12 && w.max[2] < 0.18, w);
check('its label reads HIP: Walkie-Talkie, and eight parts are labelled', lo.label === 'Walkie-Talkie' && lo.lines === 8, lo);
check('the HIP point and label land on the canvas', lo.hipOnCanvas, lo);
check('with the belt and holster on it is still worn, in front of the side pouch',
  lo.belted.n === w.n && lo.belted.min[2] > 0.12, lo.belted);

// in a match
await g.scenario('bunratty_sean');
// Sean mustn't end the round under us: on CI's slow runner the page's own frames between these steps can give him
// time to tag the player, and in the result screen the walk below moved 0 m (v1.149 CI).
await page.evaluate(() => { const hit = applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
const at = (pitch, yaw, crouch) => page.evaluate(([pitch, yaw, crouch]) => {
  const P = Game.player; P.pitch = pitch; P.yaw = yaw; P.crouching = !!crouch;
  for (let i = 0; i < 60; i++) stepGame(1 / 60);
  P.pitch = pitch; P.yaw = yaw;
  stepGame(1 / 60);
  Game.camera.updateMatrixWorld(true); fpWalkie.updateMatrixWorld(true);
  // the walkie's eight corners, projected; in view if any lands on the screen in front of the camera
  const wk = fpWalkie.userData.walkie, bb = new THREE.Box3().setFromObject(wk);
  let inView = 0;
  for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
    const v = new THREE.Vector3(x, y, z), c = v.clone().applyMatrix4(Game.camera.matrixWorldInverse);
    const n = v.clone().project(Game.camera);
    if (c.z < 0 && Math.abs(n.x) < 1 && Math.abs(n.y) < 1) inView++;
  }
  const ctr = bb.getCenter(new THREE.Vector3());
  // the walkie's place in the player's own frame: right = (cos yaw, −sin yaw), forward = (−sin yaw, −cos yaw)
  const dx = ctr.x - P.pos.x, dz = ctr.z - P.pos.z;
  return { inView, scene: fpWalkie.parent === Game.scene, camScene: Game.camera.parent === Game.scene,
    right: +(dx * Math.cos(yaw) - dz * Math.sin(yaw)).toFixed(3), fwd: +(-dx * Math.sin(yaw) - dz * Math.cos(yaw)).toFixed(3),
    up: +(ctr.y - P.pos.y).toFixed(3), eye: +P.eyeOffset.toFixed(3), pos: [+P.pos.x.toFixed(2), +P.pos.z.toFixed(2)] };
}, [pitch, yaw, crouch]);

const ahead = await at(0, 0);
check('the walkie lives in the match scene with the camera', ahead.scene && ahead.camScene, ahead);
check('looking ahead it is out of view', ahead.inView === 0, ahead);
check('it hangs on your left, a hand forward, at the hip (0.5–0.7 m up)',
  ahead.right < -0.1 && ahead.right > -0.3 && ahead.fwd > 0 && ahead.fwd < 0.25 && ahead.up > 0.5 && ahead.up < 0.7, ahead);
const down = await at(-1.45, 0);
check('looking down you see it', down.inView >= 4, down);
await g.shot('walkie-look-down');
const turned = await at(-1.45, 2.2);
// v1.333: looking down, the body (and the walkie on its belt) slides back to show the feet, so it is not forward then
check('turned round, it is still on your left and still in view looking down',
  turned.right < -0.1 && turned.fwd > -0.25 && turned.inView >= 4, turned);
const crouched = await at(-1.45, 0, true);
check('crouched, it rides lower with your hip and stays in view', crouched.up < ahead.up - 0.15 && crouched.inView >= 4, crouched);
await at(0, 0, false);

// it walks with you
const walked = await page.evaluate(() => {
  const P = Game.player, x0 = P.pos.x, z0 = P.pos.z;
  Game.mouse.locked = true; Game.keys['KeyW'] = true;
  for (let i = 0; i < 90; i++) stepGame(1 / 60);
  Game.keys['KeyW'] = false;
  fpWalkie.updateMatrixWorld(true);
  const c = new THREE.Box3().setFromObject(fpWalkie.userData.walkie).getCenter(new THREE.Vector3());
  return { mode: Game.mode, moved: +Math.hypot(P.pos.x - x0, P.pos.z - z0).toFixed(2), off: +Math.hypot(c.x - P.pos.x, c.z - P.pos.z).toFixed(3) };
});
check('walking 1.5 s, the walkie stays at your hip', walked.mode === 'scenario' && walked.moved > 1 && walked.off < 0.3, walked);

// v1.333 (backlog B.16, Michael: "Can we just add the whole body mesh to the first person view?"): the walkie is on
// your own kid's belt now, a body under the camera: legs, shoes and torso shown, head and arms (and the kid's gun)
// hidden, the shoes on the ground standing and crouched, the legs walking when you walk, and your look on it
const body = (pitch, crouch, walk) => page.evaluate(([pitch, crouch, walk]) => {
  const P = Game.player, U = fpWalkie.userData, po = U.kid.pose;
  P.crouching = !!crouch; Game.mouse.locked = true; Game.keys['KeyW'] = !!walk;
  const legX = [];
  for (let i = 0; i < 60; i++) { P.pitch = pitch; stepGame(1 / 60); legX.push(po.legL.rotation.x); }
  Game.keys['KeyW'] = false; P.crouching = false;
  Game.camera.updateMatrixWorld(true); fpWalkie.updateMatrixWorld(true);
  const shown = m => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; };
  const box = m => new THREE.Box3().setFromObject(m);
  const inView = (bb) => {   // corners of a box in front of the camera and on the screen
    let n = 0;
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      const v = new THREE.Vector3(x, y, z), c = v.clone().applyMatrix4(Game.camera.matrixWorldInverse), q = v.clone().project(Game.camera);
      if (c.z < 0 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1) n++;
    }
    return n;
  };
  const soles = Math.min(box(po.shoeL).min.y, box(po.shoeR).min.y) - P.pos.y;
  const torso = box(po.torso);
  return {
    walkieOnBody: U.walkie && U.walkie.parent === U.kid.group,
    hidden: [U.kid.head, po.neck, po.hair, po.gunGroup, po.rigR.shoulder, po.rigL.shoulder].every(m => !m || !shown(m)) && po.headExtras.every(e => !shown(e.mesh)),
    shown: [po.legL, po.legR, po.shoeL, po.shoeR, po.torso].every(shown),
    noShadow: (() => { let n = 0; U.kid.group.traverse(m => { if (m.isMesh && m.castShadow) n++; }); return n === 0; })(),
    soles: +soles.toFixed(3), torsoTop: +(torso.max.y - P.pos.y).toFixed(3), eye: +P.eyeOffset.toFixed(3),
    shoesInView: inView(box(po.shoeL)) + inView(box(po.shoeR)), torsoInView: inView(torso),
    legSwing: +(Math.max(...legX.slice(20)) - Math.min(...legX.slice(20))).toFixed(3),
  };
}, [pitch, crouch, walk]);
const lookAhead = await body(0, 0, 0);
check('the walkie is on your kid\'s belt; legs, shoes and torso shown, head, arms and his gun hidden, no shadow',
  lookAhead.walkieOnBody && lookAhead.hidden && lookAhead.shown && lookAhead.noShadow, lookAhead);
check('looking ahead the body is out of view, and the torso stays under the eye',
  lookAhead.shoesInView === 0 && lookAhead.torsoInView === 0 && lookAhead.torsoTop < lookAhead.eye - 0.15, lookAhead);
const lookDown = await body(-1.3, 0, 0);
check('looking down you see your torso and your shoes, which stand on the ground',
  lookDown.torsoInView > 0 && lookDown.shoesInView > 0 && Math.abs(lookDown.soles) < 0.03 && lookDown.legSwing < 0.01, lookDown);
await g.shot('fp-body-down');
const crouchDown = await body(-1.3, 1, 0);
check('crouched, the shoes stay on the ground and the torso drops under the lower eye',
  Math.abs(crouchDown.soles) < 0.05 && crouchDown.torsoTop < crouchDown.eye - 0.1 && crouchDown.torsoTop < lookDown.torsoTop - 0.3, crouchDown);
const walkDown = await body(-1.2, 0, 1);
check('walking, the legs stride (the left leg swings) and the shoes stay near the ground',
  walkDown.legSwing > 0.2 && walkDown.soles > -0.05 && walkDown.soles < 0.15, walkDown);
// your look: a new shirt colour is worn on the body at the next match
const relook = await page.evaluate(() => {
  const old = fpWalkie.userData.kid;
  Game.persist.look = Object.assign({}, Game.persist.look, { shirtColor: 0xcc2222, top: null });
  setFPBody(fpWalkie);
  const k = fpWalkie.userData.kid;
  return { rebuilt: k !== old, shirt: k.torso.material.color.getHex(), parts: fpWalkie.children.length };
});
check('a new look is worn on the body when it is set up again (one body, the new shirt)',
  relook.rebuilt && relook.shirt === 0xcc2222 && relook.parts === 1, relook);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
