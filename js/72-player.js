
// ---------------------------------------------------------------------
// FPS CONTROLLER (movement + look + stance)
// ---------------------------------------------------------------------
const MOUSE_SENS = 0.0022;
const MOVE_SPEED = 3.2;            // kid walk speed (bedroom)
const MOVE_SPEED_SCENARIO = 3.6;   // base walk speed in scenarios
const SPRINT_MULT = 1.6;
const CROUCH_MULT = 0.5;
const ADS_MOVE_MULT = 0.7;
const ADS_SENS_MULT = 0.55;        // mouse sensitivity at full ADS
const ADS_FOV_TARGET = 55;
const BASE_FOV = 75;
const ADS_BLEND_SPEED = 8;
const TAPED_FLIP_TIME = 0.6;       // v1.169: seconds to flip a taped twin mag         // higher = snappier ADS transition
const CROUCH_BLEND_SPEED = 10;

const PLAYER_GRAVITY = 12.0;       // a bit stronger than world gravity for snappier feel
const SLIDE_INITIAL_SPEED = 7.5;   // m/s — fast launch
const SLIDE_END_SPEED = 2.5;       // m/s — what it decays to at end of slide
const JUMP_VEL = 4.2;
// v1.105 (backlog D.4, Michael: A): height-aware collision. The player's feet are at Game.player.pos.y, not the
// terrain: an obstacle whose top the feet clear is passed over, and one no taller than STAND_MAX_H can be landed
// on and stood on (boxes, bins, low walls). A jump rises about 0.74 m, so a 1 m wall needs a step up first.
// Kids stay on the ground (they call collidesObstacles without a foot height).
const STAND_MAX_H = 1.05;
function isStandable(o) { return !!o.ramp || (!o.bbPass && !o.noStand && (o.h ?? 5) <= STAND_MAX_H); }
// v1.259 (D.42): a ramp obstacle's top is level at ramp.y0 for its `foot` fraction from z0 (the step), rises to ramp.y1
// at its `land` fraction of the way to z1, then is level to z1 (the landing). The player walks up it, stepping up to RAMP_STEP at a time (a kid's terrain foot
// meets its 0.2 m first step and is stopped).
const RAMP_STEP = 0.3;
function obsTopAt(o, x, z) {
  if (!o.ramp) return (o.baseY ?? 0) + (o.h ?? 5);
  const R = o.ramp, t = Math.max(0, Math.min(1, (z - R.z0) / (R.z1 - R.z0)));
  return R.y0 + (R.y1 - R.y0) * Math.max(0, Math.min(1, (t - (R.foot || 0)) / (R.land - (R.foot || 0))));
}

// v1.26 STAMINA tuning (seconds). Base values; shoes scale these.
const STAMINA_MAX_BASE = 6.0;       // seconds of continuous sprint at base
const STAMINA_DRAIN_RATE = 1.0;     // stamina-seconds drained per real second sprinting
const STAMINA_RECHARGE_RATE = 0.7;  // recharge per second when not sprinting
const STAMINA_RECHARGE_DELAY = 0.6; // seconds after sprint stops before recharge begins
const STAMINA_EXHAUST_RECOVER = 0.4;// fraction of max you must recharge to before sprinting again after a full-empty lockout

// v1.25 ZOMBIE MODE tuning.
const ZOMBIE_REVIVE_SEC = 10.0;    // downed tagger revives in place after this
const ZOMBIE_TAG_RANGE   = 1.3;    // contact distance that infects the player
const ZOMBIE_JOG_SPEED   = 3.55;   // ~ player jog (3.6) — most taggers
const ZOMBIE_SPRINT_SPEED = 5.2;   // faster than player sprint — the 1-2 runners

// v1.354 (backlog D.71, Michael: A, 23 Oct: "the go-cart race first, on Bunratty's slope, gravity only, kids along the
// route shooting; reach the bottom with lives left"): a match with `race: true` puts you in a go-cart at the top of the
// street (the map's `raceRoad`, from the fork; RACE.startX can start it further down) and the hill rolls you down it to
// the bulb. The fork itself is flat, so you start just below it (RACE.startX) with Ryan's shove (RACE.shove m/s): 174 m
// and 13.5 m down, and the run-up carries you over the 0.4 m rise west of the entry. The cart keeps to the road: A and D steer
// it across the lane (RACE.half either side of the crown), S drags your feet (a brake), W kicks you along under
// RACE.kickTop (a kid's push, no engine). Gravity along the road's own fall less rolling resistance and air drag sets the
// speed. Anything solid on the lane stops the cart where it is. You sit (crouched eye and hitbox) and look and shoot as
// in any match. A tag costs a life and RACE.grace seconds in which nothing tags you; you roll on. Reaching the end of the
// road with a life left wins (RACE.finishShort m before it: the bulb's plank fort stands across its end); the
// last tag loses, as in any match. The lane's parked cars, bins and planter make it a slalom.
const RACE = { startX: -150, shove: 3, g: 9.8, roll: 0.015, drag: 0.004, brake: 4.5, kick: 1.3, kickTop: 2.6, steer: 2.6,
  half: 2.6, top: 13, grace: 1.5, step: 0.5, finishShort: 3 };
function raceSetup(built) {
  const road = built.raceRoad, gY = built.groundY;
  // the road's line from the fork to the bulb, resampled every RACE.step metres along it
  const raw = [];
  for (let i = 0; i <= 4000; i++) {
    const t = road.T0 + (1 - road.T0) * i / 4000, p = road.point(t);
    if (Math.hypot(p.x - road.end.x, p.z - road.end.z) < 5) { raw.push(p); break; }
    raw.push(p);
  }
  const xs = [], zs = [];
  let acc = 0;
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) acc += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z);
    if (i === 0 || acc >= RACE.step) { xs.push(raw[i].x); zs.push(raw[i].z); acc = 0; }
  }
  let s0 = 0;
  for (let i = 0; i < xs.length; i++) if (xs[i] >= RACE.startX) { s0 = i * RACE.step; break; }
  const R = { xs, zs, len: (xs.length - 1) * RACE.step, s: s0, d: -1.2, v: RACE.shove, gY, done: false, crashes: 0, topV: 0,
    startS: s0, finishS: (xs.length - 1) * RACE.step - RACE.finishShort, mesh: buildGoCartMesh() };
  built.scene.add(R.mesh);
  Game.player.bounds = null;   // the road holds you, not the play box (the race starts west of it)
  raceSync(R, 0);
  const a = raceAt(R, R.s);
  Game.player.yaw = Math.atan2(-a.dx, -a.dz);   // looking down the road
  Game.scenario.playerStart = { pos: Game.player.pos.clone(), yaw: Game.player.yaw };
  return R;
}
// the road's point and direction s metres along it
function raceAt(R, s) {
  const f = Math.max(0, Math.min(R.xs.length - 1.001, s / RACE.step)), i = Math.floor(f), k = f - i;
  const dx = R.xs[i + 1] - R.xs[i], dz = R.zs[i + 1] - R.zs[i], l = Math.hypot(dx, dz) || 1;
  return { x: R.xs[i] + dx * k, z: R.zs[i] + dz * k, dx: dx / l, dz: dz / l };
}
// where the cart stands at (s, d): d is metres to the right of the crown, looking down the road
function racePos(R, s, d) {
  const a = raceAt(R, s);
  return { x: a.x - a.dz * d, z: a.z + a.dx * d, a };
}
function raceSync(R, grade) {
  const c = racePos(R, R.s, R.d), y = R.gY(c.x, c.z), p = Game.player;
  p.pos.set(c.x, y, c.z);
  p.vel.set(c.a.dx * R.v, 0, c.a.dz * R.v);
  R.mesh.position.set(c.x, y, c.z);
  R.mesh.rotation.order = 'YXZ';
  R.mesh.rotation.y = Math.atan2(c.a.dx, c.a.dz);
  R.mesh.rotation.x = -Math.atan(grade);
}
// One step of the cart. Returns true in a race (updatePlayer then moves you no other way, as on a ladder).
function updateCart(dt) {
  const R = Game.scenario.race, p = Game.player, k = Game.keys || {};
  if (!R) return false;
  if (R.ride) return updateRide(dt);   // v1.364 (D.72): the golf cart, Eric driving
  p.crouching = true; p.sprinting = false; p.sliding = false; p.airSprint = false;
  p.onGround = true; p.velY = 0;
  const q1 = raceAt(R, R.s + 1), q0 = raceAt(R, R.s - 1), h1 = R.gY(q1.x, q1.z), h0 = R.gY(q0.x, q0.z);
  const grade = (h1 - h0) / 2;   // rise per metre down the road (negative downhill)
  let acc = -RACE.g * grade - RACE.g * RACE.roll - RACE.drag * R.v * R.v;
  const braking = !!k['KeyS'] || Pad.move.z > 0.5, kicking = !!k['KeyW'] || Pad.move.z < -0.5;
  if (braking || R.done) acc -= RACE.brake;
  if (kicking && !R.done && R.v < RACE.kickTop) acc += RACE.kick;
  R.v = Math.max(0, Math.min(RACE.top, R.v + acc * dt));
  let steer = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
  if (!steer && Math.abs(Pad.move.x) > 0.2) steer = Pad.move.x;
  const nd = Math.max(-RACE.half, Math.min(RACE.half, R.d + steer * RACE.steer * dt));
  const ns = Math.min(R.len, R.s + R.v * dt);
  // anything solid on the lane stops the cart (the sideways step is tried alone, so you can steer round it)
  const blocked = (s, d) => { const c = racePos(R, s, d); return collidesObstacles(c.x, c.z, 0.5, R.gY(c.x, c.z) + 0.3); };
  if (!blocked(ns, nd)) { R.s = ns; R.d = nd; }
  else {
    if (R.v > 1.5) { R.crashes++; R.v = 0; }
    else R.v = 0;
    if (!blocked(R.s, nd)) R.d = nd;
  }
  R.topV = Math.max(R.topV, R.v);
  raceSync(R, grade);
  if (!R.done && R.s >= R.finishS && Game.mode === 'scenario' && p.hitsTaken < p.maxHits) {
    R.done = true;
    R.finishT = Game.scenario.roundTime;
    endScenarioLater('win', 800);
  }
  return true;
}
// The cart: a plywood deck on two 2x4 axles, four lawnmower wheels, a milk crate for a seat and a rope on the front axle.
function buildGoCartMesh() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.95 });
  const hub = new THREE.MeshStandardMaterial({ color: 0xd8c23a, roughness: 0.6 });
  const crate = new THREE.MeshStandardMaterial({ color: 0x2f6fc0, roughness: 0.7 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  box(0.5, 0.04, 1.5, wood, 0, 0.2, 0);                        // the deck
  box(0.9, 0.07, 0.09, dark, 0, 0.15, 0.62);                   // front axle
  box(0.9, 0.07, 0.09, dark, 0, 0.15, -0.6);                   // back axle
  for (const [x, z] of [[-0.43, 0.62], [0.43, 0.62], [-0.43, -0.6], [0.43, -0.6]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 14), tyre);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.14, z); g.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), hub);
    h.rotation.z = Math.PI / 2; h.position.set(x, 0.14, z); g.add(h);
  }
  box(0.36, 0.28, 0.32, crate, 0, 0.36, -0.42);                // the milk crate seat
  box(0.03, 0.03, 0.5, new THREE.MeshStandardMaterial({ color: 0xd9cfa8, roughness: 1 }), 0, 0.25, 0.4);   // the rope
  g.userData.goCart = true;
  return g;
}

// v1.364 (backlog D.72, Michael: B, 27 Oct: "a ride-along match, Eric drives a golf cart round a set loop of the course,
// you ride on the back and shoot, kids in the trees and bunkers, three lives as the race"): a match with `race: true`
// whose map gives a `rideLoop` (the corners of a closed loop) puts you on the back seat of a golf cart that Eric drives
// round it RIDE.laps times. You only aim: W/A/S/D do nothing, and your view turns with the cart. He slows for the
// corners (RIDE.slow) and opens up on the straights (RIDE.fast). Tags, lives and the grace are the race's (Game.scenario.race
// is set, so applyBBHit and the tag count treat it as one); finishing the last lap with a life left wins.
const RIDE = { laps: 2, fast: 5.6, slow: 3.0, accel: 1.6, fillet: 5, seat: 0.4, back: 0.95, step: 0.5, range: 15 };
function rideSetup(built) {
  const C = built.rideLoop, n = C.length, pts = [];
  // the loop: straight runs between the corners, each corner rounded by an arc of radius RIDE.fillet
  for (let i = 0; i < n; i++) {
    const P = C[(i + n - 1) % n], c = C[i], N = C[(i + 1) % n];
    let ax = P[0] - c[0], az = P[1] - c[1], bx = N[0] - c[0], bz = N[1] - c[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz); ax /= la; az /= la; bx /= lb; bz /= lb;
    const th = Math.acos(Math.max(-1, Math.min(1, ax * bx + az * bz))) / 2, t = RIDE.fillet / Math.tan(th);
    let mx = ax + bx, mz = az + bz; const ml = Math.hypot(mx, mz); mx /= ml; mz /= ml;
    const ox = c[0] + mx * RIDE.fillet / Math.sin(th), oz = c[1] + mz * RIDE.fillet / Math.sin(th);
    const t1 = { x: c[0] + ax * t, z: c[1] + az * t }, t2 = { x: c[0] + bx * t, z: c[1] + bz * t };
    let a1 = Math.atan2(t1.z - oz, t1.x - ox), a2 = Math.atan2(t2.z - oz, t2.x - ox), da = a2 - a1;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    for (let k = 0; k <= 12; k++) { const a = a1 + da * k / 12; pts.push({ x: ox + Math.cos(a) * RIDE.fillet, z: oz + Math.sin(a) * RIDE.fillet }); }
  }
  pts.push(pts[0]);
  // resampled every RIDE.step metres along it (the straights are the runs between one corner's arc and the next)
  const xs = [pts[0].x], zs = [pts[0].z];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const x0 = pts[i - 1].x, z0 = pts[i - 1].z, l = Math.hypot(pts[i].x - x0, pts[i].z - z0);
    let at = RIDE.step - carry;
    while (at <= l) { xs.push(x0 + (pts[i].x - x0) * at / l); zs.push(z0 + (pts[i].z - z0) * at / l); at += RIDE.step; }
    carry = l - (at - RIDE.step);
  }
  const len = xs.length * RIDE.step;
  // where he starts: s0 metres in, the point nearest the map's `rideStart`
  let s0 = 0, bd = Infinity;
  const st = built.rideStart || { x: xs[0], z: zs[0] };
  for (let i = 0; i < xs.length; i++) { const d = Math.hypot(xs[i] - st.x, zs[i] - st.z); if (d < bd) { bd = d; s0 = i * RIDE.step; } }
  // how sharply the loop turns round each point (radians over 4 m), which sets his speed there
  const turn = xs.map((_, i) => {
    const a = rideAt({ xs, zs, len }, i * RIDE.step - 2), b = rideAt({ xs, zs, len }, i * RIDE.step + 2);
    return Math.abs(Math.atan2(a.dx * b.dz - a.dz * b.dx, a.dx * b.dx + a.dz * b.dz));
  });
  const R = { ride: true, xs, zs, len, turn, s: s0, startS: s0, finishS: s0 + RIDE.laps * len, v: RIDE.slow, d: 0,
    gY: built.groundY, done: false, crashes: 0, topV: 0, lap: 1, mesh: buildGolfCartMesh() };
  built.scene.add(R.mesh);
  Game.player.bounds = null;   // the loop holds you, not the play box
  const a = rideAt(R, R.s);
  R.heading = Math.atan2(-a.dx, -a.dz);
  rideSync(R);
  Game.player.yaw = R.heading;   // looking where he drives
  Game.scenario.playerStart = { pos: Game.player.pos.clone(), yaw: Game.player.yaw };
  return R;
}
// the loop's point and direction s metres round it (any s: it wraps)
function rideAt(R, s) {
  const N = R.xs.length, f = ((s / RIDE.step) % N + N) % N, i = Math.floor(f), j = (i + 1) % N, k = f - i;
  const dx = R.xs[j] - R.xs[i], dz = R.zs[j] - R.zs[i], l = Math.hypot(dx, dz) || 1;
  return { x: R.xs[i] + dx * k, z: R.zs[i] + dz * k, dx: dx / l, dz: dz / l };
}
// the cart on the loop, and you on its back seat, RIDE.back metres behind its middle
function rideSync(R) {
  const a = rideAt(R, R.s), y = R.gY(a.x, a.z), p = Game.player;
  R.mesh.position.set(a.x, y, a.z);
  R.mesh.rotation.y = Math.atan2(a.dx, a.dz);
  p.pos.set(a.x - a.dx * RIDE.back, y + RIDE.seat, a.z - a.dz * RIDE.back);
  p.vel.set(a.dx * R.v, 0, a.dz * R.v);
}
// One step of the ride (from updateCart). Eric drives; you sit and aim.
function updateRide(dt) {
  const R = Game.scenario.race, p = Game.player;
  p.crouching = true; p.sprinting = false; p.sliding = false; p.airSprint = false;
  p.onGround = true; p.velY = 0;
  // the corner ahead sets his speed: the sharpest turn in the next 8 m
  let sharp = 0;
  for (let ahead = 0; ahead <= 8; ahead += 1) sharp = Math.max(sharp, R.turn[Math.floor(((R.s + ahead) / RIDE.step) % R.xs.length)]);
  const want = R.done ? 0 : sharp > 0.3 ? RIDE.slow : RIDE.fast;
  R.v = R.v < want ? Math.min(want, R.v + RIDE.accel * dt) : Math.max(want, R.v - RIDE.accel * 2 * dt);
  R.s += R.v * dt;
  R.lap = Math.min(RIDE.laps, 1 + Math.floor((R.s - R.startS) / R.len));
  R.topV = Math.max(R.topV, R.v);
  // your view turns with the cart, as it would on its seat
  const a = rideAt(R, R.s), h = Math.atan2(-a.dx, -a.dz);
  let dh = h - R.heading;
  while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
  p.yaw += dh; R.heading = h;
  rideSync(R);
  if (!R.done && R.s >= R.finishS && Game.mode === 'scenario' && p.hitsTaken < p.maxHits) {
    R.done = true;
    R.finishT = Game.scenario.roundTime;
    endScenarioLater('win', 800);
  }
  return true;
}
// The golf cart: a white tub on four wheels under a roof on four posts, a front bench and a back seat facing the way it
// goes (you), the club's bag rack between them; Eric in the driver's seat.
function buildGolfCartMesh() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.7 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  box(1.2, 0.35, 2.5, body, 0, 0.42, 0);                       // the tub
  box(1.2, 0.5, 0.35, body, 0, 0.62, 1.12);                    // the cowl at the front
  box(1.1, 0.12, 0.5, seat, 0, 0.72, 0.2);                     // the front bench
  box(1.1, 0.45, 0.1, seat, 0, 0.98, -0.05);                   // its back
  box(1.1, 0.12, 0.45, seat, 0, 0.72, -0.85);                  // the back seat, where you ride
  box(1.25, 0.06, 1.9, body, 0, 1.95, 0.25);                   // the roof
  for (const [x, z] of [[-0.56, 1.0], [0.56, 1.0], [-0.56, -0.5], [0.56, -0.5]]) box(0.05, 1.3, 0.05, dark, x, 1.3, z);
  for (const [x, z] of [[-0.6, 0.85], [0.6, 0.85], [-0.6, -0.85], [0.6, -0.85]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12), dark);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, z); g.add(w);
  }
  box(0.3, 0.3, 0.04, dark, -0.3, 1.0, 0.85);                  // the wheel's column and wheel
  // Eric at the wheel, sat: a kid crouched most of the way puts his head at a seated height
  if (typeof CHARACTERS !== 'undefined' && CHARACTERS.eric) {
    const eric = createKid(CHARACTERS.eric, 'pistol');
    eric.group.position.set(-0.3, 0.45, 0.25);
    setKidCrouch(eric, 0.85);
    if (eric.gunGroup) eric.gunGroup.visible = false;
    g.add(eric.group);
    g.userData.eric = eric;
  }
  g.userData.golfCart = true;
  return g;
}

// v1.138 (backlog D.7, Michael: A): LADDERS and the drop penalty. A scenario's `ladders` are climb zones (the
// treehouse's). At a ladder's foot, looking at it, W climbs; S climbs down; at the top he steps off onto the floor.
// From the floor, backing into the rail's gap with S takes the ladder down; walking off the edge is a drop.
// Space lets go. Any drop of FALL_PENALTY_DROP or more (off the platform, off the ladder) empties his stamina and
// locks sprint out as an empty sprint does. A jump off a 1.05 m box drops about 1.05 m, so it costs nothing.
const LADDER_CLIMB_SPEED = 1.7;   // m/s: the 2.6 m treehouse in about 1.5 s
const FALL_PENALTY_DROP = 1.5;
function ladderAt(x, z) {
  for (const L of (Game.scenario.ladders || [])) if (x >= L.minX && x <= L.maxX && z >= L.minZ && z <= L.maxZ) return L;
  return null;
}
// Returns true while he is on a ladder (updatePlayer then moves him no other way).
function updateLadder(dt) {
  const p = Game.player, k = Game.keys || {};
  const up = !!k['KeyW'] || Pad.move.z < -0.5, down = !!k['KeyS'] || Pad.move.z > 0.5;   // v1.241: the stick climbs
  let L = p.climbing;
  if (!L) {
    const at = ladderAt(p.pos.x, p.pos.z);
    if (!at || !p.onGround || p.sliding) return false;
    // either way he faces the ladder (yaw 0 faces −z): W at the foot climbs, S at the top backs him into the gap
    const facing = -Math.cos(p.yaw) * at.dirZ;
    const atTop = p.pos.y >= at.top - 0.1;
    if (facing < 0.3 || !(atTop ? down : up)) return false;
    p.climbing = L = at;
    p.crouching = false; p.sprinting = false; p.airSprint = false;
    p.pos.x = L.x; p.pos.z = L.z; p.velY = 0; p.onGround = false;
  }
  const dy = (up ? 1 : 0) - (down ? 1 : 0);
  p.pos.y += dy * LADDER_CLIMB_SPEED * dt;
  p._lastGroundY = p.pos.y;
  const gY = scenarioGroundY(p.pos.x, p.pos.z);
  if (p.pos.y >= L.top) {
    // over the top: step onto the floor, clear of the rail's gap
    p.pos.y = L.top; p.pos.z = L.edgeZ + L.dirZ * 0.45;
    p.climbing = null; p.onGround = true; p.velY = 0;
  } else if (p.pos.y <= gY) {
    p.pos.y = gY; p.climbing = null; p.onGround = true; p.velY = 0;
  }
  return true;
}

// v1.142 (backlog D.7, Michael: A): the ladder prompt. At a ladder's foot, looking at it: "W — climb"; up top in
// the rail's gap: "S — climb down"; on the ladder: the three keys. Uses the bedroom's #interactPrompt box.
function ladderPromptText() {
  const p = Game.player;
  if (Game.scenario && Game.scenario.range) return rangePromptText();   // v1.257: the range's bench and back door
  if (!Game.scenario || !Game.scenario.ladders) return null;
  if (p.climbing) return '<kbd>W</kbd> &nbsp;up &nbsp;·&nbsp; <kbd>S</kbd> &nbsp;down &nbsp;·&nbsp; <kbd>Space</kbd> &nbsp;let go';
  const at = ladderAt(p.pos.x, p.pos.z);
  if (!at || !p.onGround || p.sliding) return null;
  if (-Math.cos(p.yaw) * at.dirZ < 0.3) return null;   // the same facing rule updateLadder climbs on
  return (p.pos.y >= at.top - 0.1) ? '<kbd>S</kbd> &nbsp; climb down' : '<kbd>W</kbd> &nbsp; climb';
}
function updateLadderPrompt() {
  const el = document.getElementById('interactPrompt');
  if (!el) return;
  const t = padWords(ladderPromptText());   // v1.279: the stick and A on a pad
  if (t) { if (el.innerHTML !== t) el.innerHTML = t; el.style.display = 'block'; }
  else if (el.style.display !== 'none') el.style.display = 'none';
}

function updatePlayer(dt) {
  if (!Game.mouse.locked && !Pad.active) {   // v1.241 (D.38): a pad plays without the pointer lock
    Game.mouse.dx = 0; Game.mouse.dy = 0;
    easeStanceAndAds(dt);
    // v1.28j: even with the mouse released (e.g. just entered the bedroom, or
    // paused), keep the camera parked at the player's current position &
    // orientation. Without this the camera sat wherever it last was until the
    // first click captured the mouse — the "odd spawn framing" glitch. No bob
    // or roll here since we're stationary.
    Game.camera.position.set(
      Game.player.pos.x,
      Game.player.pos.y + Game.player.eyeOffset,
      Game.player.pos.z
    );
    Game.camera.rotation.order = 'YXZ';
    Game.camera.rotation.y = Game.player.yaw;
    Game.camera.rotation.x = Game.player.pitch;
    Game.camera.rotation.z = 0;
    updateFPWalkie(0, dt);   // v1.149
    return;
  }

  const inScenario = Game.mode === 'scenario';

  // === Slide tick (locked motion, ignores WASD) ===
  if (Game.player.sliding) {
    Game.player.slideTime += dt;
    const p = Game.player.slideTime / Game.player.slideDuration;
    // Decay speed over the slide
    Game.player.slideSpeed = SLIDE_INITIAL_SPEED + (SLIDE_END_SPEED - SLIDE_INITIAL_SPEED) * p;
    if (p >= 1) {
      // Slide ends → drop into crouched state
      Game.player.sliding = false;
      Game.player.crouching = true;
      Game.player.canSlide = false;
    }
  }

  // Sprint detection (only when not sliding, on ground, stamina available)
  const wantsSprint = inScenario && !!Game.keys['ShiftLeft'];
  // v1.26: equipment (shoes) can scale stamina pool & rates.
  const shoeStats = getEquippedShoeStats();
  Game.player.staminaMax = STAMINA_MAX_BASE * (shoeStats.staminaMult || 1);
  if (Game.player.stamina > Game.player.staminaMax) Game.player.stamina = Game.player.staminaMax;
  // Exhausted lockout clears once recharged past the recovery threshold.
  if (Game.player.exhausted && Game.player.stamina >= Game.player.staminaMax * STAMINA_EXHAUST_RECOVER) {
    Game.player.exhausted = false;
  }
  const staminaOk = Game.player.stamina > 0 && !Game.player.exhausted;
  if (!Game.player.sliding) {
    Game.player.sprinting = wantsSprint && staminaOk && !Game.player.crouching && Game.player.adsTarget === 0 &&
                            !Game.gun.reloading && Game.player.onGround;
  } else {
    Game.player.sprinting = false;
  }
  if (Game.player.sprinting) Game.player.adsTarget = 0;
  // Mark canSlide while sprinting; clear when sprint ends so a new sprint is needed
  if (Game.player.sprinting && Game.player.onGround) Game.player.canSlide = true;
  if (!wantsSprint) Game.player.canSlide = false;
  if (!inScenario) Game.player.crouching = false;

  // v1.26: stamina drain/recharge. Drains while actually sprinting (on ground)
  // OR while preserving an air-sprint jump; recharges after a short delay
  // otherwise. Hitting zero forces an exhausted lockout.
  {
    const pressingMove = !!(Game.keys['KeyW'] || Game.keys['KeyA'] || Game.keys['KeyS'] || Game.keys['KeyD']) ||
                         Pad.move.x !== 0 || Pad.move.z !== 0;   // v1.241
    const draining = inScenario && (Game.player.sprinting || (Game.player.airSprint && !Game.player.onGround)) && pressingMove;
    if (draining) {
      Game.player.stamina -= STAMINA_DRAIN_RATE * (shoeStats.drainMult || 1) * underPartMult('sprintDrainMult') * dt;   // v1.169: sling
      Game.player._rechargeWait = STAMINA_RECHARGE_DELAY;
      if (Game.player.stamina <= 0) {
        Game.player.stamina = 0;
        Game.player.exhausted = true;
        Game.player.sprinting = false;
        Game.player.airSprint = false;
      }
    } else {
      Game.player._rechargeWait = (Game.player._rechargeWait || 0) - dt;
      if (Game.player._rechargeWait <= 0) {
        Game.player.stamina = Math.min(Game.player.staminaMax,
          Game.player.stamina + STAMINA_RECHARGE_RATE * (shoeStats.rechargeMult || 1) * dt);
      }
    }
  }

  // Ease ADS and eye height
  easeStanceAndAds(dt);

  // v1.138: on a ladder, the ladder moves him (updateLadder); nothing below moves him
  const onLadder = inScenario && (updateCart(dt) || updateLadder(dt));   // v1.354 (D.71): in a go-cart the cart moves him

  // Look — sensitivity reduces with ADS
  // v1.192: the settings' mouse and aim sensitivity scale it, and invert look flips the pitch
  // v1.248 (D.35): while the squad wheel is open the mouse moves its pointer, not your look
  if (Game.squadWheel && inScenario) { squadWheelMove(Game.mouse.dx, Game.mouse.dy); Game.mouse.dx = 0; Game.mouse.dy = 0; }
  const sensMult = Settings.mouseSens * (1 - Game.player.ads * (1 - ADS_SENS_MULT * Settings.aimSens));
  Game.player.yaw -= Game.mouse.dx * MOUSE_SENS * sensMult;
  Game.player.pitch -= Game.mouse.dy * MOUSE_SENS * sensMult * (Settings.invertY ? -1 : 1);
  Game.player.pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, Game.player.pitch));
  Game.mouse.dx = 0; Game.mouse.dy = 0;

  // === Horizontal movement ===
  let wx = 0, wz = 0;
  let movingForwardish = false;
  if (onLadder) {
    // v1.138: held by the ladder
  } else if (Game.player.sliding) {
    // Slide: locked direction, decaying speed
    wx = Game.player.slideDir.x * Game.player.slideSpeed;
    wz = Game.player.slideDir.z * Game.player.slideSpeed;
    movingForwardish = true;
  } else {
    let mx = 0, mz = 0;
    if (Game.keys['KeyW']) mz -= 1;
    if (Game.keys['KeyS']) mz += 1;
    if (Game.keys['KeyA']) mx -= 1;
    if (Game.keys['KeyD']) mx += 1;
    const mag = Math.hypot(mx, mz);
    if (mag > 0) { mx /= mag; mz /= mag; }
    else if (Pad.move.x !== 0 || Pad.move.z !== 0) { mx = Pad.move.x; mz = Pad.move.z; }   // v1.241: the stick, analog
    if (Game.player._holdT > 0) { mx = 0; mz = 0; Game.player.sprinting = false; }   // v1.280 (D.47): held at your base

    let speed = inScenario ? MOVE_SPEED_SCENARIO : MOVE_SPEED;
    if (inScenario) {
      // v1.21: equipped gun's weight class scales movement speed.
      // pistol/mac10 (light) +15%, mp5/ump/shotgun ~baseline, ar/ak47 (heavy) -15%,
      // sniper (very_heavy) -25%. Encourages playstyle differentiation: you can
      // sprint into a fight with a MAC-10 but not with a sniper.
      const eqSpec = getGunSpec(Game.gun.type);
      speed *= eqSpec.playerSpeedMult ?? 1.0;
      // v1.60: carried gear (mags, loaders, armor) adds a weight penalty on top of
      // the gun's own handling. Heavier kit → slower. Cached at scenario start so
      // this isn't recomputed every frame (loadout can't change mid-match).
      speed *= (Game.scenario.weightSpeedMult ?? 1.0);
      // v1.26: keep sprint speed through a jump that was launched while sprinting
      // (airSprint), so jumping no longer cuts you down to jog speed mid-leap.
      const sprintActive = Game.player.sprinting || (Game.player.airSprint && !Game.player.onGround);
      if (Game.player.crouching) speed *= CROUCH_MULT;
      else if (sprintActive) speed *= SPRINT_MULT * (getEquippedShoeStats().sprintMult || 1);
      speed *= 1 - Game.player.ads * (1 - ADS_MOVE_MULT);
    }
    // Air control: reduced steering while jumping
    if (!Game.player.onGround) speed *= 0.7;

    const cosY = Math.cos(Game.player.yaw);
    const sinY = Math.sin(Game.player.yaw);
    wx = (mx * cosY + mz * sinY) * speed;
    wz = (-mx * sinY + mz * cosY) * speed;
    movingForwardish = mx !== 0 || mz !== 0;   // v1.241: the stick too
  }

  // Apply horizontal motion with collision
  const r = Game.player.radius;
  let nx = Game.player.pos.x + wx * dt;
  let nz = Game.player.pos.z + wz * dt;
  const b = Game.player.bounds;
  if (b) {
    nx = Math.max(b.minX, Math.min(b.maxX, nx));
    nz = Math.max(b.minZ, Math.min(b.maxZ, nz));
  }
  const footNow = inScenario ? Game.player.pos.y : null;   // v1.105: collide from the feet, not the terrain
  const collidedX = collidesObstacles(nx, Game.player.pos.z, r, footNow);
  const collidedZ = collidesObstacles(Game.player.pos.x, nz, r, footNow);
  const ox0 = Game.player.pos.x, oz0 = Game.player.pos.z;
  if (!collidedX) Game.player.pos.x = nx;
  if (!collidedZ) Game.player.pos.z = nz;
  // v1.139: the x/z split can't slide along an angled box (a parked car at 2.99 rad held him dead on Northcliff's
  // road). When it gets under half the step, drop the part of the step that goes into what blocks him and take
  // the rest along its face, if that is clear and goes further.
  if ((collidedX || collidedZ) && inScenario) {
    const mvx = nx - ox0, mvz = nz - oz0;
    const want = Math.hypot(mvx, mvz);
    const got = Math.hypot(Game.player.pos.x - ox0, Game.player.pos.z - oz0);
    const o = want > 1e-6 && got < want * 0.5 ? blockingObstacle(nx, nz, r, footNow) : null;
    const n = o ? obsAwayNormal(o, ox0, oz0) : null;
    if (n) {
      const into = mvx * n.x + mvz * n.z;
      if (into < 0) {
        const out = n.d < r ? r + 0.0005 - n.d : 0;   // and back out to his radius, if he was touching closer
        let sx = ox0 + mvx + (out - into) * n.x, sz = oz0 + mvz + (out - into) * n.z;
        if (b) { sx = Math.max(b.minX, Math.min(b.maxX, sx)); sz = Math.max(b.minZ, Math.min(b.maxZ, sz)); }
        if (Math.hypot(sx - ox0, sz - oz0) > got && !collidesObstacles(sx, sz, r, footNow)) {
          Game.player.pos.x = sx; Game.player.pos.z = sz;
          Game.player._slides = (Game.player._slides || 0) + 1;
        }
      }
    }
  }
  // Cancel slide if it hits a wall hard
  if (Game.player.sliding && (collidedX || collidedZ)) {
    Game.player.sliding = false;
    Game.player.crouching = true;
    Game.player.canSlide = false;
  }

  // === Vertical motion (jump physics) ===
  // v1.8: ground height is terrain-driven. The player walks up/down slopes
  // (foot snaps to groundY when grounded) and lands on the slope when airborne.
  if (onLadder) {
    // v1.138: held by the ladder (updateLadder set his height)
  } else if (inScenario) {
    // v1.105: the ground is the terrain or the top of a low obstacle under the feet
    const gY = playerSupportY(Game.player.pos.x, Game.player.pos.z, Game.player.pos.y, r);
    if (!Game.player.onGround) {
      Game.player.velY -= PLAYER_GRAVITY * dt;
      Game.player.pos.y += Game.player.velY * dt;
      if (Game.player.pos.y <= gY) {
        // v1.138: a drop of FALL_PENALTY_DROP or more (off the treehouse) empties his stamina
        const p = Game.player;
        if ((p._lastGroundY ?? gY) - gY >= FALL_PENALTY_DROP) {
          p.stamina = 0; p.exhausted = true; p.sprinting = false;
          p._rechargeWait = STAMINA_RECHARGE_DELAY;
          p._dropPenalties = (p._dropPenalties || 0) + 1;
        }
        Game.player.pos.y = gY;
        Game.player.velY = 0;
        Game.player.onGround = true;
        Game.player.airSprint = false;   // v1.26: leap over, sprint state re-evaluates on ground
      }
    } else {
      // Grounded: follow the terrain. If the ground rose under us (walked into a
      // slope) snap up; if it fell away gently, stick to it (no launch on small
      // downhill steps — only fall if the drop is significant this frame).
      const drop = Game.player.pos.y - gY;
      if (drop > 0.35) {
        // Stepped off a ledge / steep downhill — start falling from current y.
        Game.player.onGround = false;
      } else {
        Game.player.pos.y = gY;
      }
    }
    if (Game.player.onGround) Game.player._lastGroundY = Game.player.pos.y;   // v1.138: where a drop is measured from
  } else {
    Game.player.pos.y = 0;
    Game.player.onGround = true;
    Game.player.velY = 0;
  }

  // Sprint head bob — only when sprinting on ground and moving
  let bobY = 0, bobX = 0;
  if (Game.player.sprinting && movingForwardish && Game.player.onGround) {
    Game.player.bobPhase += dt * 11;
    bobY = Math.sin(Game.player.bobPhase) * 0.04;
    bobX = Math.cos(Game.player.bobPhase * 0.5) * 0.02;
  } else {
    Game.player.bobPhase = 0;
  }

  // Camera position with eye height + bob + jump arc
  Game.camera.position.set(
    Game.player.pos.x,
    Game.player.pos.y + Game.player.eyeOffset + bobY,
    Game.player.pos.z
  );
  Game.camera.rotation.order = 'YXZ';
  Game.camera.rotation.y = Game.player.yaw;
  Game.camera.rotation.x = Game.player.pitch;
  // Slight roll while sliding for kinetic feel; sprint also rolls
  let roll = bobX * 0.08;
  if (Game.player.sliding) roll += 0.08;
  Game.camera.rotation.z = roll;
  updateFPWalkie(bobY, dt);   // v1.149 (v1.333: the body walks)

  // === v1.40: AIM SWAY + VIEWMODEL BOB ===
  // One smoothed "instability" value (Game.player.sway) feeds the reticle bloom
  // and fire spread. It ALSO drives a viewmodel bob/sway applied to the gun mesh
  // itself (see updateFPGun), so the gun — and everything bolted to it (laser,
  // flashlight) — physically moves together with player movement. Standing =
  // tiny idle drift; walking = a stepping bob; sprinting = big, fast sway.
  {
    const p = Game.player;
    const hspeed = Math.sqrt(wx * wx + wz * wz);
    const sprintActive = p.sprinting || (p.airSprint && !p.onGround);
    let target;
    if (sprintActive && hspeed > 0.1) {
      target = 1.35;                       // sprinting — worst instability
    } else if (hspeed > 0.1) {
      const walkFrac = Math.min(1, hspeed / 4.0);
      target = 0.45 + walkFrac * 0.35;     // ~0.45 (creep) up to ~0.80 (full jog)
    } else {
      target = 0.18;                       // standing still — a hair of life
    }
    if (!p.onGround) target += 0.25;
    if (p.sliding)   target += 0.20;
    if (p.crouching) target *= 0.55;
    target *= (1 - p.ads * 0.7);           // ADS settles the gun hard
    const rising = target > p.sway;
    const k = rising ? 10.0 : 6.0;
    p.sway += (target - p.sway) * Math.min(1, k * dt);

    // Step cadence — faster while sprinting, moderate while walking, near-still
    // when stopped. The bob is a figure-8 (x at half the vertical frequency) so
    // it reads like a natural weapon bob, not a metronome.
    const moving = hspeed > 0.1;
    const cadence = sprintActive ? 13.0 : (moving ? 8.0 : 1.6);
    p.swayPhase += dt * cadence;

    // v1.63: FOOTSTEPS. Advance a dedicated step accumulator only while actually
    // moving on the ground (so idle drift and airtime make no sound), and fire a
    // footstep each time it crosses PI — i.e. once per stride half-cycle, in sync
    // with the visual bob's heel-strike. Sprinting steps are faster + heavier.
    if (inScenario && moving && p.onGround && !p.sliding) {
      const stepCadence = sprintActive ? 13.0 : 8.0;
      const prevStep = p._stepPhase;
      p._stepPhase += dt * stepCadence;
      if (Math.floor(p._stepPhase / Math.PI) > Math.floor(prevStep / Math.PI)) {
        playPlayerFootstep(sprintActive);
      }
    } else {
      p._stepPhase = 0;   // reset between movements so the next step lands promptly
    }
    // Bob amplitude scales with sway. These are camera-space metres on the gun.
    const amp = p.sway;
    p.bobPosX = Math.cos(p.swayPhase * 0.5) * 0.018 * amp;
    p.bobPosY = Math.abs(Math.sin(p.swayPhase)) * 0.022 * amp - 0.008 * amp;
    p.bobPosZ = Math.sin(p.swayPhase * 0.5) * 0.010 * amp;
    // Rotational sway (radians) — small yaw/pitch wander + a touch of roll. This
    // is what swings the barrel (and the laser/flashlight children) off-aim.
    p.bobRotY = Math.sin(p.swayPhase * 0.5) * 0.020 * amp;
    p.bobRotX = Math.sin(p.swayPhase) * 0.014 * amp;
    p.bobRotZ = Math.cos(p.swayPhase * 0.5) * 0.012 * amp;
  }

  // FOV — ADS, sprint, slide
  // v1.192: the settings' field of view; aiming narrows it by the same share as from the old fixed 75
  const baseFov = Settings.fov;
  let targetFov = baseFov;
  // v1.28: a magnified sight (scope) zooms further when aiming. zoomBonus 0..1
  // deepens the ADS target FOV toward a tighter value.
  const zoomBonus = getEquippedSightZoomBonus();
  // v1.61b: stronger magnification for scopes — deeper minimum FOV so a 4× scope
  // genuinely pulls targets in (floor 16° vs the old 28°).
  const adsFov = ADS_FOV_TARGET * baseFov / BASE_FOV;
  const adsFovTarget = adsFov - zoomBonus * (adsFov - 16);
  targetFov += Game.player.ads * (adsFovTarget - baseFov);
  if (Game.player.sprinting && movingForwardish) targetFov += 5;
  if (Game.player.sliding) targetFov += 8;
  Game.camera.fov += (targetFov - Game.camera.fov) * Math.min(1, dt * 10);
  Game.camera.updateProjectionMatrix();
}

function startSlide() {
  // Snapshot the current forward direction; slide goes that way
  const forward = new THREE.Vector3(
    -Math.sin(Game.player.yaw),
    0,
    -Math.cos(Game.player.yaw)
  );
  // Bias toward the WASD direction if W is held + look direction;
  // for v1, slide always goes camera-forward.
  Game.player.slideDir.copy(forward);
  Game.player.sliding = true;
  Game.player.slideTime = 0;
  Game.player.slideSpeed = SLIDE_INITIAL_SPEED;
  Game.player.crouching = false;  // we use slide eye height instead
  Game.player.canSlide = false;
}

function easeStanceAndAds(dt) {
  // Eye height target: slide < crouch < stand
  let targetEye;
  if (Game.player.sliding) targetEye = Game.player.eyeOffsetSlide;
  else if (Game.player.crouching) targetEye = Game.player.eyeOffsetCrouch;
  else targetEye = Game.player.eyeOffsetStand;
  Game.player.eyeOffset += (targetEye - Game.player.eyeOffset) * Math.min(1, dt * CROUCH_BLEND_SPEED);
  // ADS blend
  // v1.169: the sling tugs as the gun comes up, so aiming IN is slower; letting go is not
  const adsK = ADS_BLEND_SPEED * (Game.player.adsTarget > Game.player.ads ? underPartMult('adsSpeedMult') : 1);
  Game.player.ads += (Game.player.adsTarget - Game.player.ads) * Math.min(1, dt * adsK);
  if (Game.player.ads < 0.001) Game.player.ads = 0;
  if (Game.player.ads > 0.999) Game.player.ads = 1;
}

// v1.8: terrain height at world (x,z). Returns 0 when the active scenario has
// no terrain function (every map except Bunratty so far) — so flat maps and the
// bedroom behave exactly as before.
function scenarioGroundY(x, z) {
  const fn = Game.scenario && Game.scenario.groundY;
  return fn ? fn(x, z) : 0;
}
// v1.138: where a kid's feet are: the terrain, or the floor of the perch he holds (the treehouse platform)
function kidGroundY(e) {
  if (e._lad && e._lad.phase !== 'toFoot') return e._lad.y;   // v1.143: on a ladder, or walking to its top
  const gY = scenarioGroundY(e.pos.x, e.pos.z);
  if (e._dropY != null) return Math.max(gY, e._dropY);           // v1.143: a tagged climber dropping to the grass
  return e.perch ? e.perch.y : gY;
}

// v1.53: shared obstacle-shape helpers. Round props (trees, poles, cans,
// mailboxes, trampolines) can carry `shape:'cylinder'` with a `radius` and a
// center (cx,cz). When present, collision uses the true circle instead of the
// bounding box, which removes the ~41% phantom collision at an AABB's corners.
// The AABB min/max are still maintained on the obstacle as a conservative
// broad-phase bound, so any code path that hasn't been taught about cylinders
// still behaves safely (just slightly loose, as before). All four consumers
// below (movement, BB hit, line-of-sight, raycast clip) ARE cylinder-aware.

// Obstacle center (falls back to AABB midpoint if cx/cz not stored).
function obsCenter(o) {
  return {
    x: (typeof o.cx === 'number') ? o.cx : (o.minX + o.maxX) / 2,
    z: (typeof o.cz === 'number') ? o.cz : (o.minZ + o.maxZ) / 2,
  };
}

// Does a disc of radius r at (x,z) overlap this obstacle's horizontal footprint?
// Cylinder → circle-vs-circle; otherwise → circle-vs-AABB (expanded-rect test).
function obsOverlapsXZ(o, x, z, r) {
  if (o.shape === 'cylinder') {
    const c = obsCenter(o);
    const dx = x - c.x, dz = z - c.z;
    const rr = (o.radius || 0) + r;
    return (dx * dx + dz * dz) < (rr * rr);
  }
  if (o.shape === 'obox') {
    // Transform the query point into the box's local (un-rotated) frame, then do
    // circle-vs-rect. The box center+angle come from resolveObox, which uses the
    // THREE.js Y-rotation convention world=(lx·c+lz·s, -lx·s+lz·c). The INVERSE
    // (world→local) is therefore lx = wx·c - wz·s, lz = wx·s + wz·c. (Getting this
    // sign wrong was the v1.54a "collision worse" bug.)
    const c = obsCenter(o);
    const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
    const px = x - c.x, pz = z - c.z;
    const lx = px * cos - pz * sin;     // world → local (THREE inverse)
    const lz = px * sin + pz * cos;
    const qx = Math.max(-o.hx, Math.min(lx, o.hx));
    const qz = Math.max(-o.hz, Math.min(lz, o.hz));
    const ddx = lx - qx, ddz = lz - qz;
    return (ddx * ddx + ddz * ddz) < (r * r) ||
           (lx > -o.hx && lx < o.hx && lz > -o.hz && lz < o.hz);
  }
  // circle-vs-AABB: clamp the point to the box, compare distance to r.
  const qx = Math.max(o.minX, Math.min(x, o.maxX));
  const qz = Math.max(o.minZ, Math.min(z, o.maxZ));
  const dx = x - qx, dz = z - qz;
  return (dx * dx + dz * dz) < (r * r) || (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
}

// Nearest entry distance along a unit ray (ox..)+t*(dx..) to this obstacle's
// horizontal footprint, within [0,maxDist], honoring the [baseY,baseY+h] band.
// Returns the entry distance or Infinity if no hit. Cylinder → ray-circle (then
// the Y band is checked at the entry point); AABB → slab method.
function obsRayDist(o, ox, oy, oz, dx, dy, dz, maxDist) {
  const oBase = o.baseY ?? 0, oTop = oBase + (o.h || 5);
  if (o.shape === 'cylinder') {
    const c = obsCenter(o);
    // Solve |(o + t d).xz - c| = radius  → quadratic in t (xz components only).
    const fx = ox - c.x, fz = oz - c.z;
    const a = dx * dx + dz * dz;
    if (a < 1e-9) {
      // Ray is vertical: hits iff the column is inside the circle.
      if (fx * fx + fz * fz > (o.radius || 0) * (o.radius || 0)) return Infinity;
      // entry governed purely by the Y slab
      if (Math.abs(dy) < 1e-9) return (oy >= oBase && oy <= oTop) ? 0 : Infinity;
      let t1 = (oBase - oy) / dy, t2 = (oTop - oy) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      const t = (t1 >= 0) ? t1 : (t2 >= 0 ? 0 : Infinity);
      return (t <= maxDist) ? Math.max(0, t1) : Infinity;
    }
    const b = 2 * (fx * dx + fz * dz);
    const cc = fx * fx + fz * fz - (o.radius || 0) * (o.radius || 0);
    const disc = b * b - 4 * a * cc;
    if (disc < 0) return Infinity;
    const sq = Math.sqrt(disc);
    let t = (-b - sq) / (2 * a);
    if (t < 0) t = (-b + sq) / (2 * a);   // ray starts inside the circle
    if (t < 0 || t > maxDist) return Infinity;
    // Y band check at the entry point.
    const yAt = oy + dy * t;
    if (yAt < oBase - 1e-4 || yAt > oTop + 1e-4) return Infinity;
    return t;
  }
  if (o.shape === 'obox') {
    // Oriented box: rotate the ray's origin + direction into the box's local
    // frame (THREE inverse: lx = wx·c - wz·s, lz = wx·s + wz·c), then the slab
    // method against ±hx/±hz. Y is unaffected by yaw, so the Y slab is unchanged.
    const c = obsCenter(o);
    const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
    const rx = (ox - c.x) * cos - (oz - c.z) * sin;   // local origin
    const rz = (ox - c.x) * sin + (oz - c.z) * cos;
    const ldx = dx * cos - dz * sin;                    // local dir
    const ldz = dx * sin + dz * cos;
    let tMin = 0, tMax = maxDist;
    if (Math.abs(ldx) < 1e-6) { if (rx < -o.hx || rx > o.hx) return Infinity; }
    else { let t1=(-o.hx-rx)/ldx, t2=(o.hx-rx)/ldx; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
    if (Math.abs(ldz) < 1e-6) { if (rz < -o.hz || rz > o.hz) return Infinity; }
    else { let t1=(-o.hz-rz)/ldz, t2=(o.hz-rz)/ldz; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
    if (Math.abs(dy) < 1e-6) { if (oy < oBase || oy > oTop) return Infinity; }
    else { let t1=(oBase-oy)/dy, t2=(oTop-oy)/dy; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
    return (tMin >= 0) ? tMin : Infinity;
  }
  // AABB slab method.
  let tMin = 0, tMax = maxDist;
  if (Math.abs(dx) < 1e-6) { if (ox < o.minX || ox > o.maxX) return Infinity; }
  else { let t1=(o.minX-ox)/dx, t2=(o.maxX-ox)/dx; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
  if (Math.abs(dz) < 1e-6) { if (oz < o.minZ || oz > o.maxZ) return Infinity; }
  else { let t1=(o.minZ-oz)/dz, t2=(o.maxZ-oz)/dz; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
  if (Math.abs(dy) < 1e-6) { if (oy < oBase || oy > oTop) return Infinity; }
  else { let t1=(oBase-oy)/dy, t2=(oTop-oy)/dy; if(t1>t2){const t=t1;t1=t2;t2=t;} tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2); if(tMin>tMax) return Infinity; }
  return (tMin >= 0) ? tMin : Infinity;
}

function collidesObstacles(x, z, r, footYOverride = null) {
  return blockingObstacle(x, z, r, footYOverride) !== null;
}

// v1.139: the unit vector on the ground from obstacle o's nearest point to (x, z), pointing away from it, and d,
// how far (x, z) is from o's surface (null when (x, z) is inside it). The player's face slide uses it to drop
// the part of a step that goes into o.
function obsAwayNormal(o, x, z) {
  let dx, dz;
  if (o.shape === 'cylinder') {
    const c = obsCenter(o);
    dx = x - c.x; dz = z - c.z;
  } else if (o.shape === 'obox') {
    const c = obsCenter(o);
    const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
    const px = x - c.x, pz = z - c.z;
    const lx = px * cos - pz * sin, lz = px * sin + pz * cos;
    const ldx = lx - Math.max(-o.hx, Math.min(lx, o.hx));
    const ldz = lz - Math.max(-o.hz, Math.min(lz, o.hz));
    dx = ldx * cos + ldz * sin;      // local → world (THREE convention, as obsOverlapsXZ)
    dz = -ldx * sin + ldz * cos;
  } else {
    dx = x - Math.max(o.minX, Math.min(x, o.maxX));
    dz = z - Math.max(o.minZ, Math.min(z, o.maxZ));
  }
  const len = Math.hypot(dx, dz);
  return len > 1e-6 ? { x: dx / len, z: dz / len, d: len - (o.shape === 'cylinder' ? (o.radius || 0) : 0) } : null;
}

// v1.139: the first obstacle that blocks a disc of radius r at (x, z), or null (collidesObstacles' test).
function blockingObstacle(x, z, r, footYOverride = null) {
  const obs = Game.player.obstacles || [];
  // v1.8: the player's feet are at terrain height; their body occupies
  // [footY, footY + standHeight]. An obstacle blocks only if its vertical span
  // [baseY, baseY+h] overlaps the player's body — so you can stand on a low
  // ledge below you, or walk under a high deck, without a horizontal-only AABB
  // falsely blocking. Obstacles without baseY (flat maps) default to baseY 0.
  // v1.105: the player passes his own foot height, so what he has jumped above (or stands on) doesn't block;
  // the test then runs on flat maps too. Kids pass none and keep the terrain foot.
  const footY = (footYOverride != null) ? Math.max(footYOverride, scenarioGroundY(x, z)) : scenarioGroundY(x, z);
  const headY = footY + (Game.player.height ?? 1.5);
  for (const o of obs) {
    if (obsOverlapsXZ(o, x, z, r)) {
      const oBase = o.baseY ?? 0;
      const oTop = o.ramp ? obsTopAt(o, x, z) : oBase + (o.h ?? 5);   // v1.259: a ramp's top where he stands
      // Vertical overlap test (skip when no terrain so behaviour is unchanged).
      if (Game.scenario.groundY || footYOverride != null) {
        const step = (o.ramp && footYOverride != null) ? RAMP_STEP : 0.05;   // v1.259: the player walks up a ramp
        if (oTop <= footY + step || oBase >= headY) continue; // below feet / above head
      }
      return o;
    }
  }
  return null;
}

// v1.105 (D.4): what the player's feet rest on at (x, z): the terrain, or the top of a standable obstacle his
// body overlaps whose top is at or just below his feet (within 0.1 m, so a landing from any fall speed catches it).
// The radius is the collision radius, so there is never a spot that neither holds him up nor lets him in.
function playerSupportY(x, z, footY, r) {
  let y = scenarioGroundY(x, z);
  for (const o of (Game.player.obstacles || [])) {
    if (!isStandable(o)) continue;
    const top = obsTopAt(o, x, z);   // v1.259: a ramp's top where he stands
    if (top <= y || top > footY + (o.ramp ? RAMP_STEP : 0.1)) continue;
    if (obsOverlapsXZ(o, x, z, r)) y = top;
  }
  return y;
}

// ---------------------------------------------------------------------
// INTERACTABLES (bedroom)
// ---------------------------------------------------------------------

// v1.62 — FLOATING BEDROOM LABELS
// Wayfinding aid: playtesters couldn't tell what was interactable or where to
// go. Each interactable's `icon` key maps to one of these inline SVG glyphs.
// Strokes use var(--ui-text) so the .focused CSS rule (which retargets [stroke])
// can recolor them to the accent on the in-range label.
const BR_LABEL_ICONS = {
  // CRT monitor — the shop computer
  computer: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="13" rx="1.5" stroke="#f4e9d8" stroke-width="1.8"/><path d="M9 21h6M12 17v4" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  // folded map — the neighborhood map table
  map: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z" stroke="#f4e9d8" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="#f4e9d8" stroke-width="1.8"/></svg>',
  // backpack — loadout
  loadout: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z" stroke="#f4e9d8" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9V7a3 3 0 0 1 6 0v2M9 14h6" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  // wrench — workbench / gun customization
  workbench: '<svg viewBox="0 0 24 24" fill="none"><path d="M15.5 4.5a4 4 0 0 0-5 5L4 16l4 4 6.5-6.5a4 4 0 0 0 5-5l-2.8 2.8-2.2-.5-.5-2.2 2.5-2.6z" stroke="#f4e9d8" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  // door — bathroom
  bathroom: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="1" stroke="#f4e9d8" stroke-width="1.8"/><circle cx="14.5" cy="12" r="1" fill="#f4e9d8"/></svg>',
  // v1.88: door with an arrow out — the front door (goes outside to the map)
  outside: '<svg viewBox="0 0 24 24" fill="none"><path d="M13 3H5v18h8" stroke="#f4e9d8" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 12h11M17 8l4 4-4 4" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // v1.194: a wall calendar — the summer so far
  pickup: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="1" stroke="#f4e9d8" stroke-width="1.8"/><path d="M7 9h5M7 12h7M7 15h4" stroke="#f4e9d8" stroke-width="1.6" stroke-linecap="round"/><circle cx="17" cy="9" r="1.6" fill="#f4e9d8"/></svg>',   // v1.201: the Pickup Game board
  calendar: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="1.5" stroke="#f4e9d8" stroke-width="1.8"/><path d="M4 10h16M9 3v4M15 3v4M8 14l3 3M11 14l-3 3" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  // v1.195: a flip phone — your texts
  phone: '<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke="#f4e9d8" stroke-width="1.8"/><path d="M7 11h10M10 6h4" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  // bed — save game
  bed: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M3 18v2M21 18v2" stroke="#f4e9d8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" stroke="#f4e9d8" stroke-width="1.8"/></svg>',
};

// Build one DOM marker per interactable and stash a back-reference on each
// interactable (it._labelEl). Called once per bedroom entry, after the
// interactables array is populated.
function buildBedroomLabels() {
  const layer = document.getElementById('bedroomLabels');
  if (!layer) return;
  layer.innerHTML = '';
  for (const it of Game.interactables) {
    if (!it.label) continue;   // skip any interactable without label metadata
    const el = document.createElement('div');
    el.className = 'br-label';
    const iconSvg = BR_LABEL_ICONS[it.icon] || '';
    el.innerHTML =
      `<div class="br-chip"><span class="br-icon">${iconSvg}</span>` +
      `<span class="br-name">${it.label}</span></div>` +
      `<div class="br-stem"></div>`;
    layer.appendChild(el);
    it._labelEl = el;
    // anchor point in world space: the interactable's footprint + labelY height
    it._labelWorld = new THREE.Vector3(it.pos.x, it.labelY != null ? it.labelY : 1.8, it.pos.z);
    it._labelSeenAt = null;   // v1.388: its wall test runs on the first frame
  }
  layer.style.display = 'block';
}

function hideBedroomLabels() {
  const layer = document.getElementById('bedroomLabels');
  if (layer) layer.style.display = 'none';
}

// Project every label's world anchor to screen space each frame and position
// the DOM chip. Off-screen / behind-camera labels are hidden; nearer ones fade
// in; the focused (in-range) one gets the accent class.
const _brLabelProj = new THREE.Vector3();
// v1.388 (Found in play, critic 29 Oct): the labels faded by distance only, so MAP and LOADOUT floated on the hall's
// closet doors at a new save's spawn and MIRROR and WORKBENCH over the landing's wall. A ray from the eye to each
// label's anchor now hides it when an opaque, visible mesh stands more than 0.5 m short of the anchor (so the thing it
// names, right under it, never hides it). Each label is tested every 6 frames, not every frame.
const _brLabelRay = new THREE.Raycaster();
const _brLabelDir = new THREE.Vector3(), _brLabelEye = new THREE.Vector3();
let _brLabelFrame = 0;
function bedroomLabelBlocked(it, cam) {
  const eye = cam.getWorldPosition(_brLabelEye);
  _brLabelDir.copy(it._labelWorld).sub(eye);
  const len = _brLabelDir.length();
  if (len < 0.6) return false;
  _brLabelDir.multiplyScalar(1 / len);
  // the room's walls are one-sided, seen from behind by a ray from the other room: so look both ways along the line
  _brLabelRay.set(eye, _brLabelDir);
  _brLabelRay.near = 0.05; _brLabelRay.far = len - 0.5;
  if (bedroomLabelRayHits()) return true;
  _brLabelRay.set(it._labelWorld, _brLabelDir.negate());
  _brLabelRay.near = 0.5; _brLabelRay.far = len - 0.05;
  return bedroomLabelRayHits();
}
function bedroomLabelRayHits() {
  for (const h of _brLabelRay.intersectObjects(Game.scene.children, true)) {
    const m = h.object.material;
    if (!h.object.isMesh || !m || (m.transparent && m.opacity < 0.6) || m.visible === false) continue;   // glass and the like
    let o = h.object, shown = true;
    while (o) { if (!o.visible) { shown = false; break; } o = o.parent; }
    if (shown) return true;
  }
  return false;
}
function updateBedroomLabels() {
  if (Game.mode !== 'bedroom') return;
  const cam = Game.camera;
  if (!cam) return;
  _brLabelFrame++;
  const w = window.innerWidth, h = window.innerHeight;
  for (const it of Game.interactables) {
    const el = it._labelEl;
    if (!el) continue;
    _brLabelProj.copy(it._labelWorld).project(cam);
    // z > 1 means the point is behind the camera's far plane / behind us
    const behind = _brLabelProj.z > 1;
    if (behind) { el.style.opacity = '0'; continue; }
    const sx = (_brLabelProj.x * 0.5 + 0.5) * w;
    const sy = (-_brLabelProj.y * 0.5 + 0.5) * h;
    // cull a little outside the viewport so labels don't cling to the edges
    if (sx < -120 || sx > w + 120 || sy < -80 || sy > h + 80) {
      el.style.opacity = '0';
      continue;
    }
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
    // distance fade: full strength out to ~6m, gone by ~11m, so the room
    // doesn't read as cluttered when you're standing in the middle of it.
    const dx = it.pos.x - Game.player.pos.x;
    const dz = it.pos.z - Game.player.pos.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    let op = 1;
    if (dist > 6) op = Math.max(0, 1 - (dist - 6) / 5);
    // v1.388: a wall (or anything solid) between your eye and the label hides it; since v1.376 there are two rooms
    if (op > 0 && (it._labelSeenAt == null || _brLabelFrame - it._labelSeenAt >= 6)) {
      it._labelBlocked = bedroomLabelBlocked(it, cam);
      it._labelSeenAt = _brLabelFrame;
    }
    if (it._labelBlocked) op = 0;
    el.style.opacity = op.toFixed(2);
    // focused highlight
    if (Game.focusedInteractable === it) {
      el.classList.add('focused');
      el.style.opacity = '1';   // always fully visible when in range
    } else {
      el.classList.remove('focused');
    }
  }
}

function updateInteractables(dt) {
  if (Game.mode !== 'bedroom') {
    document.getElementById('interactPrompt').style.display = 'none';
    Game.focusedInteractable = null;
    updateRoomTour(0);   // v1.357: the note hides off the bedroom
    return;
  }
  // Find closest interactable within 1.5m, in front of player
  let best = null;
  let bestDist = 1.5;
  for (const it of Game.interactables) {
    const dx = it.pos.x - Game.player.pos.x;
    const dz = it.pos.z - Game.player.pos.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestDist) {
      // Optional: prefer those vaguely in front
      best = it;
      bestDist = d;
    }
  }
  Game.focusedInteractable = best;
  const prompt = document.getElementById('interactPrompt');
  if (best) {
    prompt.innerHTML = padWords(`<kbd>E</kbd> &nbsp; ${best.prompt}`);   // v1.279: A on a pad
    prompt.style.display = 'block';
  } else {
    prompt.style.display = 'none';
  }
  updateRoomTour(dt || 0);   // v1.357 (D.76)
}

// === v1.357 (D.76, Michael: A): A FIRST LOOK ROUND THE ROOM ===
// A new save, once the mirror is closed, gets a sticky note naming one thing at a time: the phone's texts (v1.358:
// first, where Eric's text waits after the story cards), the computer to shop, the bed, and last the front door to
// play. The first three are ticked when you walk up to one (its
// "E to ..." prompt shows), in any order; the door when you go out by it or the map table (a new save starts at the
// door, so walking up to it says nothing). The note names the first one not yet ticked. X (BACK on a pad) skips it.
// Done or skipped, it never shows again. `Game.persist.roomTour` is set only by NEW GAME, so an older save never sees it.
const ROOM_TOUR = [
  { key: 'phone',    name: 'Phone',      is: it => it.icon === 'phone',   // v1.358 (D.77): first, Eric's text is waiting
    text: 'Your phone buzzed: Eric. The kids text you here, and that’s how your crew grows.' },
  { key: 'computer', name: 'Computer',   is: it => it.icon === 'computer',
    text: 'The computer is airsoft.com: guns, BBs and gear, paid for with what you win.' },
  { key: 'bed',      name: 'Bed',        is: it => it.icon === 'bed',
    text: 'Your bed shows how the summer’s going. The game saves itself as you play.' },
  // v1.376 (D.74, Michael: matches from the map table only): the step is the map table's; the key stays for old saves
  { key: 'door',     name: 'Map table',  is: it => it.label === 'Map', onUse: true,
    text: 'The map table is the way out: every match starts from its map. The stairs on the landing go down to the backyard range.' },
];
const ROOM_TOUR_DONE_HOLD = 5;   // seconds the "that's the room" line stays up
function roomTourActive() {
  const t = Game.persist && Game.persist.roomTour;
  return !!t && !t.done;
}
// E (A on a pad) on a thing in the room: the door's step ticks only this way
function roomTourUse(it) {
  if (!roomTourActive() || !it) return;
  const t = Game.persist.roomTour;
  if (!Array.isArray(t.ticked)) t.ticked = [];
  for (const s of ROOM_TOUR) if (!t.ticked.includes(s.key) && s.is(it)) t.ticked.push(s.key);
}
function skipRoomTour() {
  if (!roomTourActive()) return false;
  Game.persist.roomTour.done = true;
  autoSave();
  updateRoomTour(0);
  return true;
}
function updateRoomTour(dt) {
  const el = document.getElementById('roomTour');
  if (!el) return;
  const t = Game.persist && Game.persist.roomTour;
  if (Game.mode !== 'bedroom' || !t || t.done) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
  if (!Array.isArray(t.ticked)) t.ticked = [];
  const f = Game.focusedInteractable;
  if (f) for (const s of ROOM_TOUR) if (!s.onUse && !t.ticked.includes(s.key) && s.is(f)) t.ticked.push(s.key);
  const next = ROOM_TOUR.find(s => !t.ticked.includes(s.key));
  if (!next) {
    t.doneT = (t.doneT || 0) + dt;
    if (t.doneT >= ROOM_TOUR_DONE_HOLD) { t.done = true; delete t.doneT; autoSave(); el.style.display = 'none'; return; }
  }
  const skip = Pad.active ? '<kbd>BACK</kbd>' : '<kbd>X</kbd>';
  const sig = t.ticked.join() + '|' + (next ? next.key : 'end') + '|' + skip;
  if (el._sig !== sig) {
    el._sig = sig;
    el.innerHTML = `<div class="rt-head">A LOOK ROUND YOUR ROOM · ${t.ticked.length} OF ${ROOM_TOUR.length}</div>` +
      `<div class="rt-text">${next ? next.text : 'That’s your room. The rest have their labels: the mirror, the calendar, the workbench, the Pickup Game board.'}</div>` +
      `<div class="rt-list">${ROOM_TOUR.map(s => `<span class="${t.ticked.includes(s.key) ? 'done' : s === next ? 'now' : ''}">` +
        `${t.ticked.includes(s.key) ? '✓' : '○'} ${s.name}</span>`).join('')}</div>` +
      (next ? `<div class="rt-skip">${skip} skip the tour</div>` : '');
  }
  if (el.style.display !== 'block') el.style.display = 'block';
}
