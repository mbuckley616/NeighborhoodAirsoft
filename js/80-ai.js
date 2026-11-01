
// ---------------------------------------------------------------------
// ENEMY AI — Seth's behavior
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// LINE OF SIGHT (v1.11)
// ---------------------------------------------------------------------
// Returns true if a straight line from (fromX,fromY,fromZ) to (toX,toY,toZ)
// has no obstacle (AABB) blocking it.
//
// Used by enemy AI to decide whether to advance (no LOS = walk straight toward
// player ignoring cover) or engage (LOS = peek/shoot from current cover).
//
// We do segment-vs-AABB intersection using the slab method. Excludes obstacles
// flagged with `_isCover: true` if `ignoreCover` is true — useful so a kid
// doesn't think a low cardboard box "blocks" their LOS to the player.
// (Currently cover items don't have this flag, but tall obstacles like houses,
// fences, trees do block.)
function hasLineOfSight(fromX, fromY, fromZ, toX, toY, toZ, obstacles) {
  if (!obstacles) return true;
  const dx = toX - fromX, dy = toY - fromY, dz = toZ - fromZ;
  const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (segLen < 1e-6) return true;
  const ux = dx / segLen, uy = dy / segLen, uz = dz / segLen;  // unit dir
  for (const o of obstacles) {
    // Skip low cover (≤1.0m) — kids can see over short stuff like cardboard
    // boxes, trash cans, plywood stacks. They CAN'T see over fences (1.4m),
    // houses (5m), trees (2.8+m), cars (1.55m).
    if ((o.h || 0) <= 1.0) continue;
    // v1.73: skip `bbPass` obstacles (wrought-iron picket fences). Their pickets
    // have wide gaps, so a kid can both SEE and SHOOT through them — a BB sails
    // through (handled in updateBBs) and so does the sight line. Previously these
    // blocked LOS as solid 1.4m walls, so a kid with a clear target across a fence
    // would never take the shot even though the BB would pass cleanly. Bodies are
    // still stopped by the fence (collidesObstacles ignores this flag).
    if (o.bbPass) continue;
    // v1.53: shape-aware blocker test (cylinder → ray-circle, box → slabs).
    // A hit strictly between the endpoints (0 < t < segLen) blocks sight.
    const t = obsRayDist(o, fromX, fromY, fromZ, ux, uy, uz, segLen);
    if (t > 1e-4 && t < segLen - 1e-4) return false;
  }
  return true;
}

// v1.73: FENCE-DETOUR WAYPOINT. NPCs path with a slide + perpendicular
// wall-follow mover (good for houses/cars), but a long thin fence line is a
// pathological case: a kid marching straight at a target on the far side wedges
// mid-span and the alternating sidestep just jitters it back and forth instead
// of committing to walk to the END of the fence and around. This helper detects
// that case and returns a temporary waypoint just past the nearer fence end on
// the kid's side, so the mover has a concrete "go around here" goal.
//
// Returns {x, z} to steer toward, or null if no fence is actually between the
// kid and its goal. Only considers `bbPass` obstacles (the picket fences); other
// cover is handled fine by the existing wall-follow.
function fenceDetourWaypoint(fromX, fromZ, toX, toZ, obstacles, kidRadius = 0.35) {
  if (!obstacles) return null;
  const dx = toX - fromX, dz = toZ - fromZ;
  const segLen = Math.hypot(dx, dz);
  if (segLen < 1e-3) return null;
  const ux = dx / segLen, uz = dz / segLen;
  for (const o of obstacles) {
    if (!o.bbPass) continue;                      // fences only
    // Does the straight path actually cross this fence? Ray vs the fence AABB in
    // XZ (ignore Y — fences are full-height for bodies). Use a 2D slab test.
    // v1.100: widened by the kid's radius. A centre line that just clears the
    // fence's end still clips it with the body; that returned no detour, the
    // wall-follow sent the kid the other way, and he looped at the fence end.
    const minX = o.minX - kidRadius, maxX = o.maxX + kidRadius, minZ = o.minZ - kidRadius, maxZ = o.maxZ + kidRadius;
    let t0 = 0, t1 = segLen;
    // X slab
    if (Math.abs(ux) < 1e-6) {
      if (fromX < minX || fromX > maxX) continue; // parallel & outside → no cross
    } else {
      let ta = (minX - fromX) / ux, tb = (maxX - fromX) / ux;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    // Z slab
    if (Math.abs(uz) < 1e-6) {
      if (fromZ < minZ || fromZ > maxZ) continue;
    } else {
      let ta = (minZ - fromZ) / uz, tb = (maxZ - fromZ) / uz;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    if (t0 > t1 || t1 < 0 || t0 > segLen) continue; // no crossing within the segment

    // This fence is in the way. Find its long axis and the two ends, then steer
    // toward whichever end is nearer the kid, pushed out past it by a margin so
    // the kid clears the post rather than re-wedging on the corner.
    const spanX = maxX - minX, spanZ = maxZ - minZ;
    const margin = kidRadius + 0.6;
    let endA, endB;
    if (spanX >= spanZ) {
      // Fence runs along X — ends are at minX and maxX, at the fence's Z center.
      const cz = (minZ + maxZ) / 2;
      endA = { x: minX - margin, z: cz };
      endB = { x: maxX + margin, z: cz };
    } else {
      // Fence runs along Z — ends are at minZ and maxZ, at the fence's X center.
      const cx = (minX + maxX) / 2;
      endA = { x: cx, z: minZ - margin };
      endB = { x: cx, z: maxZ + margin };
    }
    // Nearer end to the kid wins.
    const dA = Math.hypot(endA.x - fromX, endA.z - fromZ);
    const dB = Math.hypot(endB.x - fromX, endB.z - fromZ);
    return dA <= dB ? endA : endB;
  }
  return null;
}


function raycastObstacles(ox, oy, oz, dx, dy, dz, maxDist, obstacles, minH = 0.25) {
  if (!obstacles) return maxDist;
  let nearest = maxDist;
  for (const o of obstacles) {
    if ((o.h || 0) < minH) continue;
    // v1.53: shape-aware entry distance (cylinder → ray-circle, box → slabs).
    const t = obsRayDist(o, ox, oy, oz, dx, dy, dz, maxDist);
    if (t >= 0 && t < nearest) nearest = t;
  }
  return nearest;
}
// COVER STANDING POSITION (v1.12)
// ---------------------------------------------------------------------
// Given a cover AABB and the player's position, return a position OUTSIDE
// the cover on the away-from-player side, far enough out that the kid's
// collision radius doesn't intersect the AABB. This fixes the "kid stands
// on/inside the car" bug — previously the target offset was a fixed 0.5m
// from the cover center, which is way inside any cover bigger than 1m.
//
// We pick the side of the AABB that's furthest from the player (so the kid
// uses the cover as a shield), then place the stand position just outside
// that face with a kid-radius + small-margin buffer.
// v1.70: SHAPE-AWARE cover stand position. Returns a point just OUTSIDE the
// cover's real collision geometry, on the side away from `playerPos`, so the
// cover sits between the kid and the player. Previously this used only the loose
// axis-aligned envelope (cover.minX..maxZ) for ALL shapes — fine for a square
// box, but for an oriented car box (obox) the envelope is a larger non-aligned
// rectangle, so "outside the envelope face" often landed INSIDE the angled car
// body (the "kids phase into car centers" bug). Now each shape is handled in its
// own frame. A final overlap nudge guarantees the spot is actually walkable.
// v1.122: can a kid walk a straight line from where he stands to (x, z)? Rays at shin and chest height, down his
// centre and both shoulders, against every obstacle (low ones too: a kid can't step over them).
function kidWalkClear(e, x, z) {
  const dx = x - e.pos.x, dz = z - e.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.05) return true;
  const ux = dx / d, uz = dz / d, obs = Game.player.obstacles || [];
  for (const side of [0, -0.3, 0.3]) for (const h of [0.25, 1.0]) {
    const ox = e.pos.x - uz * side, oz = e.pos.z + ux * side;
    if (raycastObstacles(ox, (e.pos.y || 0) + h, oz, ux, 0, uz, d, obs, 0) < d) return false;
  }
  return true;
}

function coverStandPos(cover, playerPos, kidRadius = 0.35) {
  const buffer = kidRadius + 0.2;
  let standX, standZ;

  if (cover.shape === 'obox') {
    // Work in the box's LOCAL frame. Player direction → which of the 4 real faces
    // is most "away" → push out past that face's half-extent + buffer.
    const c = obsCenter(cover);
    const cos = Math.cos(cover.angle), sin = Math.sin(cover.angle);
    // world→local (THREE inverse, matching obsOverlapsXZ)
    const px = playerPos.x - c.x, pz = playerPos.z - c.z;
    const lpx = px * cos - pz * sin;       // player, in box-local
    const lpz = px * sin + pz * cos;
    // Choose the dominant local axis pointing AWAY from the player.
    let lsx = 0, lsz = 0;
    if (Math.abs(lpx) * cover.hz >= Math.abs(lpz) * cover.hx) {
      // X face dominates: stand on the -sign(player) X side.
      lsx = (lpx >= 0 ? -1 : 1) * (cover.hx + buffer);
      lsz = Math.max(-cover.hz, Math.min(lpz, cover.hz)) * 0.0; // centered on face
    } else {
      lsz = (lpz >= 0 ? -1 : 1) * (cover.hz + buffer);
      lsx = 0;
    }
    // local → world (THREE forward)
    standX = c.x + (lsx * cos + lsz * sin);
    standZ = c.z + (-lsx * sin + lsz * cos);
  } else if (cover.shape === 'cylinder') {
    // Round prop (tree, etc.): stand on the ring, on the far side from the player.
    const c = obsCenter(cover);
    let dx = c.x - playerPos.x, dz = c.z - playerPos.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;                       // unit, player→cover (the "away" dir)
    const r = (cover.radius || 0.4) + buffer;
    standX = c.x + dx * r;
    standZ = c.z + dz * r;
  } else {
    // Axis-aligned box (boxes, fort walls, houses): original face logic.
    const cx = (cover.minX + cover.maxX) / 2;
    const cz = (cover.minZ + cover.maxZ) / 2;
    const dxAway = cx - playerPos.x, dzAway = cz - playerPos.z;
    if (Math.abs(dxAway) > Math.abs(dzAway)) {
      standX = dxAway > 0 ? cover.maxX + buffer : cover.minX - buffer;
      standZ = cz;
    } else {
      standZ = dzAway > 0 ? cover.maxZ + buffer : cover.minZ - buffer;
      standX = cx;
    }
  }

  // v1.70: safety — if the computed spot still overlaps anything (a neighbouring
  // obstacle, or the cover itself on a tight angle), nudge it to clear space so
  // the kid never targets a point inside geometry. findClearSpawn is the same
  // unstick used at spawn time.
  if (typeof collidesObstacles === 'function' && Game.player && Game.player.obstacles) {
    if (collidesObstacles(standX, standZ, kidRadius)) {
      const clear = findClearSpawn(standX, standZ, Game.player.obstacles, kidRadius);
      standX = clear.x; standZ = clear.z;
    }
  }
  return new THREE.Vector3(standX, 0, standZ);
}

// ---------------------------------------------------------------------
// BOUNDING-OVERWATCH COVER PICK (v1.25)
// ---------------------------------------------------------------------
// For a flanking attacker doing bounding overwatch: from the kid's current
// spot, find the best NEXT cover piece to bound to. "Best" = meaningfully
// closer to the player than the kid is now (real forward progress), biased
// toward the kid's flank side (so left-lane kids hop cover on the player's
// left), reachable, and not the cover they're already at. Returns the chosen
// cover obstacle or null if nothing good is ahead (caller then pushes direct).
// v1.67: is kid `e` currently sheltered behind its homeCover? True when it has a
// homeCover and sits within ~2m of that cover's center. Used by the
// incoming-fire reaction.
function kidInCover(e) {
  if (!e.homeCover) return false;
  const cx = (e.homeCover.minX + e.homeCover.maxX) / 2;
  const cz = (e.homeCover.minZ + e.homeCover.maxZ) / 2;
  return Math.hypot(cx - e.pos.x, cz - e.pos.z) < 2.0;
}

// v1.67: does cover `c` sit between kid at `ePos` and a threat coming FROM unit
// direction `dir` (pointing toward the shooter)? True when the cover center is
// roughly along that bearing from the kid — so tucking behind it shields the kid.
function coverShieldsFrom(c, ePos, dir) {
  if (!c || !dir) return false;
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  const tx = cx - ePos.x, tz = cz - ePos.z;
  const tl = Math.hypot(tx, tz) || 1;
  const dot = (tx / tl) * dir.x + (tz / tl) * dir.z;   // >0: cover toward threat
  return dot > 0.35;   // within ~70° of the threat bearing
}

// v1.67: nearest suitable cover (height ≥ 0.5) within `maxDist` that would
// shield the kid from threat direction `dir`; falls back to nearest cover at all
// if none specifically shields (moving beats standing exposed).
// v1.282 (critic, 20 Oct, Found in play): in Protect Ryan, Mitchell took Priya's plank (their VIP's own cover) as his and
// stood inside her, centres 0.17 m apart, for 10-36 s of a round. Nobody takes cover a living VIP is holding: not by the
// incoming-fire dash, the reposition pick or a bound.
function vipHoldsCover(e, c) {
  for (const o of (Game.scenario && Game.scenario.enemies) || []) {
    if (o !== e && o.vip && o.homeCover === c && o.health > 0 && o.state !== 'retreating') return true;
  }
  return false;
}
// v1.293: a living teammate of e (not out, not walking back) holds c as his cover
function teammateHoldsCover(e, c) {
  const myTeam = e.team || 'enemy';
  for (const o of (Game.scenario && Game.scenario.enemies) || []) {
    if (o !== e && o.homeCover === c && (o.team || 'enemy') === myTeam && o.health > 0 && o.state !== 'retreating') return true;
  }
  return false;
}
function nearestShieldingCover(e, dir, maxDist = 14) {
  const cover = Game.scenario && Game.scenario.cover;
  if (!cover) return null;
  // v1.122: only cover he can walk straight to (the caller's stand spot); with none, he stays put. Rebecca in the
  // Hollow 3v3 ran from inside her fort for the one cover in reach, past its back wall, wedged in the corner, and
  // held fire into the wall from there for the rest of the round.
  let bestW = null, bestWD = Infinity, bestAnyW = null, bestAnyWD = Infinity;
  const threat = { x: e.pos.x + dir.x * 20, z: e.pos.z + dir.z * 20 };   // v1.387: the shooter's side (was e.pos - dir)
  for (const c of cover) {
    if ((c.h || 0) < 0.5 || c === e.homeCover || vipHoldsCover(e, c)) continue;   // v1.282: not a VIP's
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    const d = Math.hypot(cx - e.pos.x, cz - e.pos.z);
    if (d > maxDist) continue;
    const shields = coverShieldsFrom(c, e.pos, dir);
    if (d < bestAnyWD || (shields && d < bestWD)) {
      const sp = coverStandPos(c, threat, 0.35);
      if (kidWalkClear(e, sp.x, sp.z)) {
        if (d < bestAnyWD) { bestAnyWD = d; bestAnyW = c; }
        if (shields && d < bestWD) { bestWD = d; bestW = c; }
      }
    }
  }
  return bestW || bestAnyW;
}

// v1.387 (D.81, Michael: A, by temperament): FIRE PRESSURE. Each BB that passes within 1.5 m of a kid it could hit adds
// the weight of the gun that fired it, a pistol 1, a rifle, shotgun or SMG 2, a heavy automatic (the AK, the M249, the
// G36C, the AUG, the M4) 3, and the sum fades by e every 1.5 s. Past FIRE_PRESS_LIMIT he reacts by his aggression (the
// one he already has): under 0.4 he camps (down in his cover, peeking less, firing over the top), 0.4-0.7 he falls back
// to cover farther from the fire, firing back as he goes, over 0.7 he shrugs it off and pushes. Snipers and defenders
// camp: they hold their spot by design. FIRE_PRESS_CALM quiet seconds and he is himself again.
const FIRE_PRESS_R = 1.5, FIRE_PRESS_TAU = 1.5, FIRE_PRESS_LIMIT = 8, FIRE_PRESS_CALM = 3;
function bbPressWeight(bb) {
  const spec = bb.owner === 'player' ? GUN_SPECS[Game.gun.type] : GUN_SPECS[bb.enemyRef && bb.enemyRef.weapon];
  if (!spec) return 2;
  if (spec.fireMode === 'auto' && (spec.weightClass === 'heavy' || spec.weightClass === 'very_heavy')) return 3;
  if (spec.fireMode !== 'auto' && spec.weightClass === 'light') return 1;
  return 2;
}
function firePressure(e, now) {
  return (e._fireP || 0) * Math.exp(-Math.max(0, now - (e._firePT || now)) / FIRE_PRESS_TAU);
}
// called by updateBBs for a live BB within FIRE_PRESS_R of e; each BB counts once a kid
function noteFirePressure(e, bb, now) {
  if (!bb._pressed) bb._pressed = [];
  if (bb._pressed.includes(e)) return;
  bb._pressed.push(e);
  e._fireP = firePressure(e, now) + bbPressWeight(bb);
  e._firePT = now;
  e._fireFrom = { x: bb.spawnPos.x, z: bb.spawnPos.z };
}
// the nearest cover minD-maxD m off that stands at least `gain` m farther from the fire than he does (falling back: 3-16 m
// off, 2 m farther; camping: within 8 m, no more than 1 m nearer), and that he can walk to
function fallBackCover(e, from, gain = 2, minD = 3, maxD = 16) {
  const cover = Game.scenario && Game.scenario.cover;
  if (!cover) return null;
  const myD = Math.hypot(e.pos.x - from.x, e.pos.z - from.z);
  let best = null, bestD = Infinity;
  for (const c of cover) {
    if ((c.h || 0) < 0.5 || c === e.homeCover || vipHoldsCover(e, c) || teammateHoldsCover(e, c)) continue;
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    const d = Math.hypot(cx - e.pos.x, cz - e.pos.z);
    if (d < minD || d > maxD || d >= bestD) continue;
    if (Math.hypot(cx - from.x, cz - from.z) < myD + gain) continue;
    const sp = coverStandPos(c, from, 0.35);
    if (!kidWalkClear(e, sp.x, sp.z)) continue;
    best = c; bestD = d;
  }
  return best;
}
function kidFallBack(e, uf) {
  const from = uf.from;
  uf.moves = (uf.moves || 0) + 1;
  uf.movedAt = aiNow();
  const c = fallBackCover(e, from);
  if (c) {
    e.state = 'repositioning';
    e.stateTime = 0;
    e.targetPos = coverStandPos(c, from, 0.35);
    e.homeCover = c;
    if (!e.coverMemory) e.coverMemory = [];
    e.coverMemory.push(c);
    if (e.coverMemory.length > 2) e.coverMemory.shift();
    return;
  }
  // no cover behind him: scramble straight away from the fire, 5 m if the way is clear, else get down where he is
  const ax = e.pos.x - from.x, az = e.pos.z - from.z, al = Math.hypot(ax, az) || 1;
  const tx = e.pos.x + ax / al * 5, tz = e.pos.z + az / al * 5;
  if (kidWalkClear(e, tx, tz) && !collidesObstacles(tx, tz, 0.35)) {
    e.state = 'repositioning';
    e.stateTime = 0;
    e.targetPos = new THREE.Vector3(tx, 0, tz);
  } else {
    e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1.2 + gameRandom() * 0.8;
    setKidCrouch(e.mesh, 1);
  }
}
// once a step, before the state machine: start, keep up or end his reaction to the fire on him
function kidUnderFire(e, aggression, dt) {
  const now = aiNow();
  const uf = e._underFire;
  if (uf) {
    if (now - (e._firePT || 0) > FIRE_PRESS_CALM || e.state === 'retreating' || e.state === 'deploying' || e._flagRun || e._orderRun) {
      e._underFire = null;
      return;
    }
    if (e._fireFrom) uf.from = e._fireFrom;
    if (uf.kind === 'fall') {
      if (e.state === 'repositioning') {
        // firing back as he goes: a loose round toward where the fire comes from, chest high, wide
        e._ufShotCd = (e._ufShotCd || 0) - dt;
        if (e._ufShotCd <= 0) {
          e._ufShotCd = 0.45 + gameRandom() * 0.5;
          spawnEnemyBB(e, new THREE.Vector3(uf.from.x + (gameRandom() - 0.5) * 3, (e.pos.y || 0) + 1.0, uf.from.z + (gameRandom() - 0.5) * 3));
        }
      } else if (e.state === 'hiding' && uf.moves < 3 && now - uf.movedAt > 2.5 && firePressure(e, now) > FIRE_PRESS_LIMIT * 1.5) {
        kidFallBack(e, uf);   // still pinned where he fell back to: back again (three times an episode at most)
      }
    }
    return;
  }
  if (e.noFire || e.vip || e._flagRun || e._orderRun || (Game.scenario && Game.scenario.race)) return;
  if (e.state !== 'hiding' && e.state !== 'peeking' && e.state !== 'shooting' && e.state !== 'advancing' && e.state !== 'repositioning') return;
  if (!e._fireFrom || firePressure(e, now) < FIRE_PRESS_LIMIT) return;
  const kind = (aggression < 0.4 || e.weapon === 'sniper' || e.role === 'defender') ? 'camp' : (aggression <= 0.7 ? 'fall' : 'push');
  const nu = e._underFire = { kind, since: now, from: e._fireFrom, moves: 0, movedAt: now };
  e._underFireCount = (e._underFireCount || 0) + 1;   // tests
  e._underFireKinds = e._underFireKinds || {};
  e._underFireKinds[kind] = (e._underFireKinds[kind] || 0) + 1;
  if (kind === 'camp') {
    const dir = { x: nu.from.x - e.pos.x, z: nu.from.z - e.pos.z }, dl = Math.hypot(dir.x, dir.z) || 1;
    dir.x /= dl; dir.z /= dl;
    if (kidInCover(e) && coverShieldsFrom(e.homeCover, e.pos, dir)) {
      e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1.2 + gameRandom() * 0.8;
      setKidCrouch(e.mesh, 1);
    } else if (e.role !== 'defender') {
      const c = fallBackCover(e, nu.from, -1, 0, 8);   // the nearest cover, not toward the fire
      if (c) {
        e.state = 'repositioning'; e.stateTime = 0;
        e.targetPos = coverStandPos(c, nu.from, 0.35);
        e.homeCover = c;
        if (!e.coverMemory) e.coverMemory = [];
        e.coverMemory.push(c);
        if (e.coverMemory.length > 2) e.coverMemory.shift();
      } else {
        e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1.2 + gameRandom() * 0.8;
        setKidCrouch(e.mesh, 1);
      }
    } else {
      e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1.2 + gameRandom() * 0.8;
      setKidCrouch(e.mesh, 1);
    }
  } else if (kind === 'fall') {
    kidFallBack(e, nu);
  } else if (e.state !== 'advancing' && e.state !== 'shooting') {
    e.state = 'advancing'; e.stateTime = 0; e.advanceCheckTimer = 0;
  }
}

// v1.67: TEAMMATE CROWDING PENALTY. Returns a positive penalty that grows the
// closer a candidate cover (cx,cz) sits to a LIVING teammate of `e` — used to
// spread a defending/attacking squad across DIFFERENT cover instead of three
// kids stacking on the same car. Only counts same-team combatants that are
// actually fighting (not retreating/dead) and skips `e` itself. Scoped by the
// caller (we apply it in defend scenarios). A teammate "occupies" its homeCover
// center if it has one, else its current position.
function teammateCrowding(e, cx, cz, radius = 6) {
  let penalty = 0;
  const enemies = Game.scenario && Game.scenario.enemies;
  if (!enemies) return 0;
  const myTeam = e.team || 'enemy';
  for (const o of enemies) {
    if (o === e || o.health <= 0) continue;
    if ((o.team || 'enemy') !== myTeam) continue;
    if (o.state === 'retreating') continue;
    let ox, oz;
    if (o.homeCover) {
      ox = (o.homeCover.minX + o.homeCover.maxX) / 2;
      oz = (o.homeCover.minZ + o.homeCover.maxZ) / 2;
    } else { ox = o.pos.x; oz = o.pos.z; }
    const d = Math.hypot(cx - ox, cz - oz);
    if (d < radius) penalty += (radius - d) / radius;   // 0 at edge → 1 right on top
  }
  return penalty;
}

function pickBoundCover(e, coverList, playerPos) {
  if (!coverList || !coverList.length) return null;
  const ex = e.pos.x, ez = e.pos.z;
  const distNowToPlayer = Math.hypot(playerPos.x - ex, playerPos.z - ez);
  // Flank side unit-perp (kid→player rotated 90°).
  const rdx = playerPos.x - ex, rdz = playerPos.z - ez, rd = Math.hypot(rdx, rdz) || 1;
  const perpX = -rdz / rd, perpZ = rdx / rd;
  const side = e.flankSide || 0;

  let best = null, bestScore = -Infinity;
  for (const c of coverList) {
    if (c === e._boundCover) continue;                  // not the one we're at
    if (vipHoldsCover(e, c)) continue;                  // v1.282: nor a VIP's
    // v1.139 fix-up: nor, for 6 s, one dropped as failed (wedged, or no gain) on the way to it. After the 1.5 s rest
    // he picked it again, slid back into the same wedge, and with the direct push between the two (each undoing the
    // other) stood 3–4 s along one wall in 'advancing' (the lot at night: Mason at (−17.3, −14.2)).
    if (c === e._boundBanCover && (Game.scenario.aiClock || 0) < (e._boundBanUntil || 0)) continue;
    // v1.103: nor any cover we're already at (its stand spot inside the 1.6 m
    // "reached" radius). Reaching a cover re-picks without it; with nothing else
    // worth a bound the pick came back null, and the next frame (no bound) picked
    // the cover he stood at again (or a car's other box), so he stepped 6 cm
    // toward it, then 6 cm back on the direct push, every frame for 50–80 s: the
    // lot's Priya on a bumper, Whole Block's Seth and Marcus by the van. Each
    // frame moved, so no wedge check ever fired.
    const sp = coverStandPos(c, playerPos);
    if (Math.hypot(sp.x - ex, sp.z - ez) < 1.6) continue;
    // v1.163 (Found in play, critic v1.159): and the spot he would stand at must itself be nearer the target. "Forward"
    // below is the cover's centre, but he walks to its stand spot; for a long cover end-on to the target the centre is
    // metres nearer and the spot is level with him. Price Check's Eric reached the south end of one 8 m freezer, picked
    // its neighbour's south end 2 m across the gap, and went back and forth in 'advancing' for up to 15 s.
    if (distNowToPlayer - Math.hypot(playerPos.x - sp.x, playerPos.z - sp.z) < 1.0) continue;
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    const ch2 = c.h || 0;
    if (ch2 < 0.5) continue;                            // too low to hide behind
    const distCoverToPlayer = Math.hypot(playerPos.x - cx, playerPos.z - cz);
    const forward = distNowToPlayer - distCoverToPlayer; // >0 = closer to player
    if (forward < 2.0) continue;                        // must gain real ground
    const hop = Math.hypot(cx - ex, cz - ez);
    if (hop < 1.5 || hop > 16) continue;                // sane bound length
    // Lateral position relative to the kid→player line, on the flank side.
    const relX = cx - ex, relZ = cz - ez;
    const lateral = (relX * perpX + relZ * perpZ) * side; // >0 = on my flank side
    // Score: reward forward progress + flank-side lateral, penalize long hops
    // and cover that sits TOO close to the player (don't bound into their lap).
    let score = forward * 1.4 + Math.max(0, lateral) * 1.0 - hop * 0.25;
    if (distCoverToPlayer < 7) score -= 6;              // avoid bounding into knife range
    if (side === 0) score += Math.max(0, -Math.abs(lateral)) ; // center kids: straightish
    // v1.67: in DEFEND scenarios, spread the squad — penalize cover near a
    // living teammate so attackers don't all bound onto the same piece.
    if (Game.scenario.scenarioType === 'defend') score -= teammateCrowding(e, cx, cz) * 3.0;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function _coverStandPosOnSlope(cover, playerPos) {
  // coverStandPos returns a flat (y=0) point; terrain Y is applied by the caller
  // via scenarioGroundY when the kid arrives. Kept separate for clarity.
  return coverStandPos(cover, playerPos);
}

// ---------------------------------------------------------------------
// COMBATANT TARGETING ABSTRACTION (Ship A — plumbing only, player-locked)
// ---------------------------------------------------------------------
// The enemy AI was hardcoded to read Game.player.* everywhere it needed a
// target (position, chest height for aim, obstacle list for LOS). To support
// friendly-AI teams and free-for-all later, the AI must instead ask "who is my
// target?" and read a uniform view of whatever that is — player OR another kid.
//
// combatantView(c) normalizes either the player object or an enemy kid into the
// same shape the AI cares about:
//   pos       — THREE.Vector3-ish {x,y,z} feet position (terrain-planted)
//   chestY    — world Y of chest (the AI's aim point: pos.y + height*0.65)
//   height    — standing height in metres (player 1.5; kid 1.5*scaleY)
//   obstacles — the LOS obstacle list (player & all kids share the scenario's)
//   team      — faction tag (Ship B+ uses this; player is 'player' for now)
//   ref       — the underlying object, for callers that need it
//   alive     — false once eliminated
//
// getTarget(e) returns the combatantView the enemy `e` should aim at. In Ship A
// it ALWAYS returns the player, so behavior is byte-for-byte identical to the
// hardcoded version. Ships B/C make it pick the nearest visible opposing-team
// combatant; until then this is pure indirection.
function combatantView(c) {
  if (!c) return null;
  if (c === Game.player) {
    return {
      pos: c.pos,
      get chestY() { return c.pos.y + (c.height ?? 1.5) * 0.65; },
      get headY() { return c.pos.y + (c.eyeOffset ?? 1.35) - 0.03; },   // v1.385 (B.20): the eyes, crouched or standing
      height: c.height ?? 1.5,
      obstacles: c.obstacles,
      team: c.team || 'player',
      ref: c,
      isPlayer: true,
      get alive() { return c.hitsTaken < c.maxHits; },
    };
  }
  // Enemy kid: height derives from the mesh Y-scale (local kid is 1.5m tall).
  const sY = (c.mesh && c.mesh.scaleY) ?? 1.0;
  return {
    pos: c.pos,
    get chestY() { return c.pos.y + (1.5 * sY) * 0.65; },
    get headY() { return c.pos.y + (1.26 - 0.2475 * ((c.mesh && c.mesh.pose && c.mesh.pose.crouch) || 0)) * sY; },   // v1.385 (B.20): the head box's centre (checkEnemyHit)
    height: 1.5 * sY,
    // Kids share the player's scenario obstacle list for LOS (same world).
    obstacles: (Game.player && Game.player.obstacles),
    team: c.team || 'enemy',
    ref: c,
    isPlayer: false,
    get alive() { return c.health > 0; },
  };
}

// ---------------------------------------------------------------------
// DYNAMIC TARGET SELECTION (Ship C)
// ---------------------------------------------------------------------
// Ships A/B made targeting and hit-routing team-aware but kept getTarget
// player-locked. Now the AI actually CHOOSES among opposing-team combatants.
//
// Two behaviors share one scorer:
//   - Allied teams FOCUS-FIRE: bias toward the team's shared "called" target
//     (lowest-health enemy the most allies can see) so a squad collapses on one
//     kid and finishes them, instead of everyone shooting someone different.
//   - FFA kids are PARANOID SURVIVORS: they switch to whoever is closer or
//     actively shooting at them — minimizing tunnel vision. A light hysteresis
//     margin stops them thrashing between two equidistant idlers (which would
//     mean never finishing anyone), but being shot at always clears the margin.
//
// Selection runs on a cadence (TARGET_REEVAL_SEC), not every frame, so the
// choice is stable enough for the existing _lastSeenPos/LOS memory to track it.

const TARGET_REEVAL_SEC = 0.35;   // how often a kid re-picks its target
const THREAT_SWITCH_MARGIN = 4.0; // FFA: new target must be this much better (m-equiv) to switch
const SHOT_AT_BONUS = 12.0;       // m-equiv attractiveness for "this combatant is shooting at me"
const LOS_BONUS = 5.0;            // m-equiv attractiveness for "I can see this combatant"
const FOCUS_BONUS = 8.0;          // m-equiv attractiveness for the team's shared focus target

function _combatantPos(c) { return c.pos; }
function _combatantChestY(c) {
  if (c === Game.player) return c.pos.y + (c.height ?? 1.5) * 0.65;
  const sY = (c.mesh && c.mesh.scaleY) ?? 1.0;
  return c.pos.y + (1.5 * sY) * 0.65;
}

// All alive combatants on a different team than e.
function opposingCombatants(e) {
  const myTeam = e.team || 'enemy';
  const out = [];
  for (const c of listCombatants()) {
    if (c === e) continue;
    // alive?
    if (c === Game.player) { if (Game.player.hitsTaken >= Game.player.maxHits || Game.player._goingHome) continue; }   // v1.290: not while walking home
    else { if (c.health <= 0 || c.state === 'retreating') continue; }
    if (combatantTeam(c) === myTeam) continue;
    // v1.413 (D.57): a kid holding fire behind you until a foe is close (Hold the Bunker's nest, holdUntilNear) is
    // down behind his bags, and your crew doesn't pick him until he opens up. Since the crew took the match (v1.393)
    // they tagged him by 6 s in 4 of 4 rounds, before any twin came close, and the nest never played.
    if (myTeam === 'player' && c.holdUntilNear && !Game.scenario.attackNear) continue;
    out.push(c);
  }
  return out;
}

// Does e have a clear line to combatant c? (muzzle → chest, scenario obstacles.)
// v1.385 (B.20): or to his head, when only his head shows over a wall
function _hasLOSTo(e, c) {
  const v = combatantView(c);
  return !!v && aiSightY(e, v) != null;
}

// v1.385 (B.20, Michael 28 Oct: "I can simply stand and stare at enemies as they approach a wall I am behind, and wait
// for them to almost touch the wall before I shoot them"): every sight test ran from the muzzle to the target's CHEST,
// so a player standing behind a fort wall or a log pile chest-high, head and gun over it, was invisible: the kid kept
// walking at the wall and fired only once he could see the chest, or at a last-known spot he never had. The world Y
// e can see on target view v: the chest if clear, else the head if it shows, else null.
function aiSightY(e, v) {
  const sY = (e.mesh && e.mesh.scaleY) ?? 1.0;
  const muzzleY = (e.pos.y || 0) + 1.05 * sY;
  const obs = v.obstacles || (Game.player && Game.player.obstacles);
  const chestY = v.chestY;
  if (hasLineOfSight(e.pos.x, muzzleY, e.pos.z, v.pos.x, chestY, v.pos.z, obs)) return chestY;
  const headY = v.headY;
  if (headY != null && headY > chestY + 0.05 &&
      hasLineOfSight(e.pos.x, muzzleY, e.pos.z, v.pos.x, headY, v.pos.z, obs)) return headY;
  return null;
}

// Threat/attractiveness score for e considering targeting c. LOWER = more
// attractive (it's distance-based, with bonuses subtracting "effective metres").
function threatScore(e, c) {
  const cp = _combatantPos(c);
  const dist = Math.hypot(cp.x - e.pos.x, cp.z - e.pos.z);
  let score = dist;
  // Being shot at by c is the strongest pull (survival-first).
  if (e._shotAtBy && e._shotAtBy.has && e._shotAtBy.has(c)) score -= SHOT_AT_BONUS;
  // Prefer targets we can actually see (can't fight through a wall).
  if (_hasLOSTo(e, c)) score -= LOS_BONUS;
  // Allied focus-fire: the team's called target is more attractive.
  if (e._teamFocus && e._teamFocus === c) score -= FOCUS_BONUS;
  // v1.189: whoever carries a flag draws every gun on the other side
  if (Game.scenario.ctf && ctfCarrying(c)) score -= CTF_CARRIER_BONUS;
  // v1.248 (D.35): on follow me, the kid you aim at draws your teammates' guns
  if (e.team === 'player' && Game.scenario.squadOrder === 'follow' && Game.scenario._playerAimKid === c) score -= SQUAD_AIM_BONUS;
  return score;
}

function getTarget(e) {
  // The player has no e.team / AI fields; only enemy kids select. Defensive: if
  // called for a non-AI combatant, fall back to the player (old behavior).
  if (!e || e === Game.player) return combatantView(Game.player);

  const candidates = opposingCombatants(e);
  if (candidates.length === 0) {
    // No valid opposing target — keep last known if still around, else player.
    if (e._targetRef && combatantView(e._targetRef)) return combatantView(e._targetRef);
    return combatantView(Game.player);
  }

  // Re-evaluate on a cadence; between evals, keep the current target if it's
  // still valid (alive + opposing). This is the stability the memory relies on.
  e._targetReeval = (e._targetReeval ?? 0) - (e._lastDt || 0);
  const currentValid = e._targetRef && candidates.includes(e._targetRef);

  if (currentValid && e._targetReeval > 0) {
    return combatantView(e._targetRef);
  }
  e._targetReeval = TARGET_REEVAL_SEC;

  // Score all candidates (lower = better).
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    const s = threatScore(e, c);
    if (s < bestScore) { bestScore = s; best = c; }
  }

  // Hysteresis: if we already have a valid target, only switch when the new best
  // beats the current by THREAT_SWITCH_MARGIN. Prevents target-thrashing while
  // still snapping to real threats (a "shooting at me" bonus dwarfs the margin).
  if (currentValid) {
    const curScore = threatScore(e, e._targetRef);
    if (bestScore < curScore - THREAT_SWITCH_MARGIN) {
      e._targetRef = best;
    }
    // else keep current
  } else {
    e._targetRef = best;
  }
  return combatantView(e._targetRef);
}

// Per-team focus-fire coordination. For each team that has >1 living member
// (i.e. an actual squad), pick a shared "called" target: the lowest-health
// visible opposing combatant (finish the weak one together). Stamp it on each
// member as e._teamFocus so the scorer biases toward it. Run once per frame in
// updateEnemies before the per-enemy work.
function updateTeamFocus() {
  if (!Game.scenario || !Game.scenario.enemies) return;

  // --- Ship C: "who is shooting at me" detection ---
  // Scan active BBs; for each, the intendedTarget combatant gets the shooter
  // added to its _shotAtBy set. Rebuilt each frame from BBs still in flight, so
  // the signal naturally decays as those BBs land/despawn. Cheap: one pass over
  // live BBs. (The player can also be an intendedTarget, but only kids consult
  // _shotAtBy in scoring, so we only need to stamp kids — still, stamp all.)
  for (const e of Game.scenario.enemies) { if (e._shotAtBy) e._shotAtBy.clear(); }
  if (Game.player._shotAtBy) Game.player._shotAtBy.clear();
  for (const bb of (Game.scenario.bbs || [])) {
    const tgt = bb.intendedTarget;
    const shooter = bb.enemyRef;
    if (!tgt || !shooter) continue;
    if (shooter.health !== undefined && shooter.health <= 0) continue;
    if (!tgt._shotAtBy) tgt._shotAtBy = new Set();
    tgt._shotAtBy.add(shooter);
  }

  // --- Per-team focus-fire coordination ---
  // Group living gunner kids by team.
  const byTeam = new Map();
  for (const e of Game.scenario.enemies) {
    if (e.health <= 0 || e.behavior === 'tagger') continue;
    const t = e.team || 'enemy';
    if (!byTeam.has(t)) byTeam.set(t, []);
    byTeam.get(t).push(e);
  }
  for (const [team, members] of byTeam) {
    if (members.length < 2) { for (const m of members) m._teamFocus = null; continue; }
    // Candidate pool = opposing combatants visible to ANY member.
    let focus = null, bestKey = Infinity;
    const opp = opposingCombatants(members[0]); // same team → same opposing set
    for (const c of opp) {
      const seen = members.some(m => _hasLOSTo(m, c));
      if (!seen) continue;
      // Prefer lowest health (player uses hits-remaining as a proxy).
      const hp = (c === Game.player) ? (Game.player.maxHits - Game.player.hitsTaken) : c.health;
      if (hp < bestKey) { bestKey = hp; focus = c; }
    }
    for (const m of members) m._teamFocus = focus;
  }
}

// v1.74: queue a short SUPPRESSION BURST for an auto-gun kid firing on the move.
// Marching/bounding auto-gunners previously threw a single BB per suppression
// tick, which read as "holding a pistol" for the AK et al. This fires one BB now
// (at `aimPt`) and queues a few cyclic follow-ups so the on-the-move pressure
// looks like the auto weapon it is. Semi guns just fire the single round (no
// queue). `aimPt` is a THREE.Vector3 at the spot to suppress. Returns nothing.
function queueSuppressionBurst(e, aimPt, looseSpread = 1.4) {
  if (inOpeningHold()) return;                     // v1.101: no queued follow-ups either
  spawnEnemyBB(e, aimPt);                          // the immediate round
  const spec = GUN_SPECS[e.weapon] || GUN_SPECS.pistol;
  if (spec.fireMode !== 'auto') return;            // semis: single round only
  const cycle = 60 / Math.max(1, spec.cyclicRPM);
  // Shorter than a committed peek burst (2..3 follow-ups) — it's pressure while
  // moving, not a full string. Wider spread (passed through the burst entry).
  const followUps = 2 + Math.floor(gameRandom() * 2);
  for (let k = 1; k <= followUps; k++) {
    e.pendingBurst.push({ dueIn: k * cycle, aim: aimPt.clone(), spread: looseSpread });
  }
}

// v1.143 (backlog D.7, Michael: A): KIDS CLIMB LADDERS. A kid whose target is up on a ladder's perch (the
// treehouse platform), or on the ladder, walks to its foot and climbs; at the top he steps onto the floor and
// holds it as a perched kid (e.perch, v1.138), fighting with the usual states. When his target has been down
// for KID_LADDER_DOWN_SEC he walks back to the gap and climbs down. One kid on a ladder at a time; the next waits
// at the foot. A kid placed on a perch by the scenario (Connor) never leaves it; `climb: false` keeps a kid down.
// Tagged on the ladder, or (in a defend) on the platform he climbed, he drops to the grass and runs back.
const KID_CLIMB_SPEED = 1.5;       // m/s (the player climbs at 1.7)
const KID_LADDER_DOWN_SEC = 2.0;
function ladderPerch(L) { return (L.perch && Game.scenario.perches) ? Game.scenario.perches[L.perch] || null : null; }
// is t (a target view or a combatant) up there: on the perch's floor, or on its ladder?
function onLadderPerch(t, L) {
  if (!t || !t.pos) return false;
  const P = ladderPerch(L);
  if (!P) return false;
  if (t === Game.player || t.ref === Game.player || t.isPlayer) { if (Game.player.climbing === L) return true; }
  return t.pos.y >= P.y - 0.4 && t.pos.x >= P.minX - 1 && t.pos.x <= P.maxX + 1 && t.pos.z >= P.minZ - 1 && t.pos.z <= P.maxZ + 1;
}
// The walk to a ladder's foot: a distance field over the scenario's bounds in 0.5 m cells, built once per ladder by
// a breadth-first fill from the foot through cells a kid fits in. A kid steps toward the lowest neighbouring cell,
// so he finds the way out of a fort or round the oak that a straight push would wedge on.
const LADDER_CELL = 0.5;
function ladderField(L) {
  if (L._field) return L._field;
  const b = Game.scenario.bounds || { minX: -40, maxX: 40, minZ: -40, maxZ: 40 }, c = LADDER_CELL;
  const nx = Math.ceil((b.maxX - b.minX) / c) + 1, nz = Math.ceil((b.maxZ - b.minZ) / c) + 1;
  const dist = new Float32Array(nx * nz).fill(Infinity), free = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) free[i * nz + k] = collidesObstacles(b.minX + i * c, b.minZ + k * c, 0.33) ? 0 : 1;
  const fi = Math.round((L.x - b.minX) / c), fk = Math.round((L.z - b.minZ) / c);
  const q = [fi * nz + fk]; dist[q[0]] = 0; free[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], i = (cur / nz) | 0, k = cur % nz;
    for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
      if (!di && !dk) continue;
      const ii = i + di, kk = k + dk;
      if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
      const n = ii * nz + kk;
      if (!free[n] || (di && dk && (!free[ii * nz + k] || !free[i * nz + kk]))) continue;   // no cutting a corner
      const nd = dist[cur] + (di && dk ? 1.414 : 1);
      if (nd < dist[n]) { dist[n] = nd; q.push(n); }
    }
  }
  return (L._field = { b, nx, nz, dist });
}
// the point to walk toward from (x, z): the centre of the nearest-to-the-foot cell around his own
function ladderFieldNext(L, x, z) {
  const F = ladderField(L), c = LADDER_CELL;
  const i0 = Math.round((x - F.b.minX) / c), k0 = Math.round((z - F.b.minZ) / c);
  let best = null, bd = Infinity;
  for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
    const i = i0 + di, k = k0 + dk;
    if (i < 0 || k < 0 || i >= F.nx || k >= F.nz) continue;
    const d = F.dist[i * F.nz + k];
    if (d < bd) { bd = d; best = { x: F.b.minX + i * c, z: F.b.minZ + k * c }; }
  }
  return best;
}
// v1.152: the same fill toward any point, for an advancing kid stuck in a pocket whose way out is not straight
// back (a fort whose closed wall faces his target, a house corner behind a fence). The cells a kid fits in are
// worked out once a round (the obstacles don't move); a fill from his target's cell then costs about a millisecond.
function kidFreeCells() {
  const obs = Game.player.obstacles, b = Game.scenario.bounds || { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
  const C = Game.scenario._kidCells;
  if (C && C.obs === obs && C.b === b && C.n === obs.length) return C;
  const c = LADDER_CELL, nx = Math.ceil((b.maxX - b.minX) / c) + 1, nz = Math.ceil((b.maxZ - b.minZ) / c) + 1;
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) free[i * nz + k] = collidesObstacles(b.minX + i * c, b.minZ + k * c, 0.33) ? 0 : 1;
  return (Game.scenario._kidCells = { obs, b, n: obs.length, nx, nz, free });
}
function kidFieldTo(gx, gz) {
  const { b, nx, nz, free } = kidFreeCells(), c = LADDER_CELL;
  const dist = new Float32Array(nx * nz).fill(Infinity);
  const fi = Math.max(0, Math.min(nx - 1, Math.round((gx - b.minX) / c))), fk = Math.max(0, Math.min(nz - 1, Math.round((gz - b.minZ) / c)));
  const q = [fi * nz + fk]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], i = (cur / nz) | 0, k = cur % nz;
    for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
      if (!di && !dk) continue;
      const ii = i + di, kk = k + dk;
      if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
      const n = ii * nz + kk;
      if (!free[n] || (di && dk && (!free[ii * nz + k] || !free[i * nz + kk]))) continue;
      const nd = dist[cur] + (di && dk ? 1.414 : 1);
      if (nd < dist[n]) { dist[n] = nd; q.push(n); }
    }
  }
  return { b, nx, nz, dist };
}
// An advancing kid's pocket rule (v1.121) fired: the second time within 10 s and 3 m, the back-out has not got him
// out, so route him by the field to his target for 5 s instead. Returns true when he is routed.
// v1.271: his last two pulls held at a wall within 3 m of the muzzle, from within 1.5 m of here. Suppressing on the
// move (v1.67, v1.25) needs only an eye line to the last-seen spot, so a kid deployed into the Hollow fort's corner kept
// "suppressing" into the wall beside him while he walked up and down it (Eric, our side: 16-20 held a round from one
// spot, tests/hollow-held); the shooting state's move-on after three (v1.122) never saw those pulls.
function kidLineHeldHere(e) {
  return (e._lineHolds || 0) >= 2 && !!e._lineHoldAt && Math.hypot(e.pos.x - e._lineHoldAt.x, e.pos.z - e._lineHoldAt.z) < 1.5;
}
function kidPocketRoute(e, tgt) {
  const clk = Game.scenario.aiClock || 0, p = e._advPocket;
  if (p && clk - p.t < 10 && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < 3) p.n++;
  else e._advPocket = { t: clk, x: e.pos.x, z: e.pos.z, n: 1 };
  if (e._advPocket.n < 2) return false;
  e._advPocket = null;
  const F = kidFieldTo(tgt.pos.x, tgt.pos.z);
  if (!kidFieldNext(F, e.pos.x, e.pos.z)) return false;
  e._advRoute = { F, until: clk + 5 };
  e._advRoutes = (e._advRoutes || 0) + 1;
  return true;
}
// where to walk from (x, z): of the cells up to two away, the one nearest the goal that he can walk to in a straight
// line (a 0.5 m grid's next cell can be free while the line to it clips a post's corner); null where the fill never
// reached him or no cell is open
function kidFieldNext(F, x, z) {
  const c = LADDER_CELL, i0 = Math.round((x - F.b.minX) / c), k0 = Math.round((z - F.b.minZ) / c);
  const cand = [];
  for (let di = -2; di <= 2; di++) for (let dk = -2; dk <= 2; dk++) {
    const i = i0 + di, k = k0 + dk;
    if (i < 0 || k < 0 || i >= F.nx || k >= F.nz) continue;
    const d = F.dist[i * F.nz + k];
    if (d < Infinity) cand.push({ d, x: F.b.minX + i * c, z: F.b.minZ + k * c });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const w of cand) {
    const L = Math.hypot(w.x - x, w.z - z);
    if (L < 0.05) continue;
    let clear = true;
    for (let t = 0.1; clear && t <= L; t += 0.1) if (collidesObstacles(x + (w.x - x) * t / L, z + (w.z - z) * t / L, 0.33)) clear = false;
    if (clear) return w;
  }
  return null;
}
function kidLadderFall(e, dt) {
  // a kid tagged on the ladder, or tagged in a defend up on the platform he climbed, lets go and drops
  if ((e.health <= 0 || e.state === 'retreating') && (e._lad || e._climbed)) {
    const L = e._lad ? e._lad.L : e._climbed;
    const y0 = e._lad ? e._lad.y : (e.perch ? e.perch.y : 0);
    // off the ladder he drops straight down; off the platform, over its edge by the ladder
    if (!e._lad && e.state === 'retreating') { e.pos.x = L.x; e.pos.z = L.z; }
    if (e._lad || e.state === 'retreating') {
      e._lad = null; e._climbed = null; e.perch = null;
      e._dropY = y0; e._dropV = 0;
    }
  }
  if (e._dropY != null) {
    e._dropV += 9.8 * dt; e._dropY -= e._dropV * dt;
    if (e._dropY <= scenarioGroundY(e.pos.x, e.pos.z)) { e._dropY = null; e._dropV = 0; }
  }
}
function kidLadderStep(e, tgt, dt) {
  if (e.noClimb || e.noFire || (e.perch && !e._climbed) || e.state === 'retreating' || e._dropY != null) return false;
  const lad = e._lad;
  if (!lad) {
    if (e._ladBan > 0) { e._ladBan -= dt; return false; }
    if (e._climbed) {
      // up there: climb down once his target has been off the platform a while
      if (onLadderPerch(tgt, e._climbed)) { e._ladDownT = 0; return false; }
      e._ladDownT = (e._ladDownT || 0) + dt;
      if (e._ladDownT < KID_LADDER_DOWN_SEC) return false;
      e._lad = { L: e._climbed, phase: 'toGap', y: e.perch.y, t: 0 };
    } else {
      const L = (Game.scenario.ladders || []).find(L => onLadderPerch(tgt, L));
      if (!L) return false;
      e._lad = { L, phase: 'toFoot', y: 0, t: 0, stuck: 0, side: 0, sideT: 0, away: 0 };
    }
  }
  const s = e._lad, L = s.L, ch = e.character || {};
  s.t += dt;
  let walking = false, faceYaw = null;
  const otherOnLadder = () => Game.scenario.enemies.some(o => o !== e && o.health > 0 && o._lad && o._lad.L === L && (o._lad.phase === 'up' || o._lad.phase === 'down'));
  if (s.phase === 'toFoot') {
    // give up when his target has come down (the states take him back), or after 12 s without reaching the foot
    if (!onLadderPerch(tgt, L)) { s.away += dt; if (s.away > 1.0) { e._lad = null; return false; } } else s.away = 0;
    if (s.t > 12) { e._lad = null; e._ladBan = 4; return false; }
    const dx = L.x - e.pos.x, dz = L.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.2) {
      if (otherOnLadder()) { faceYaw = Math.PI * (L.dirZ < 0 ? 1 : 0); }
      else { e.pos.x = L.x; e.pos.z = L.z; s.phase = 'up'; s.y = scenarioGroundY(L.x, L.z); Game.scenario.ladderReached = true; }   // v1.165
    } else {
      const sp = Math.min(d, 2.6 * (ch.moveSpeed ?? 1.0) * dt), r = 0.33;
      const bx = e.pos.x, bz = e.pos.z;
      let ux = dx / d, uz = dz / d;
      if (d > 1.2) {   // far from the foot: follow the field (near it, straight in)
        const w = ladderFieldNext(L, e.pos.x, e.pos.z);
        if (w) { const wx = w.x - e.pos.x, wz = w.z - e.pos.z, wl = Math.hypot(wx, wz); if (wl > 0.05) { ux = wx / wl; uz = wz / wl; } }
      }
      if (s.sideT > 0) { s.sideT -= dt; const t = ux; ux = -uz * s.side; uz = t * s.side; }
      const nx = e.pos.x + ux * sp, nz = e.pos.z + uz * sp;
      if (!collidesObstacles(nx, nz, r)) { e.pos.x = nx; e.pos.z = nz; }
      else {
        if (!collidesObstacles(nx, e.pos.z, r)) e.pos.x = nx;
        if (!collidesObstacles(e.pos.x, nz, r)) e.pos.z = nz;
      }
      const m = Math.hypot(e.pos.x - bx, e.pos.z - bz);
      s.stuck = (m < sp * 0.3) ? s.stuck + dt : 0;
      if (s.stuck > 0.4) { s.side = s.side ? -s.side : (gameRandom() < 0.5 ? -1 : 1); s.sideT = 0.7; s.stuck = 0; }
      walking = m > 1e-4;
      faceYaw = Math.atan2(ux, uz);
    }
    s.y = scenarioGroundY(e.pos.x, e.pos.z);
  } else if (s.phase === 'up') {
    s.y += KID_CLIMB_SPEED * dt; walking = true;
    faceYaw = Math.PI * (L.dirZ < 0 ? 1 : 0);
    const P = ladderPerch(L);
    if (s.y >= L.top) {
      // over the top: onto the floor, clear of the gap; from here the states fight from the perch
      e._lad = null; e._climbed = L; e.perch = P; e._ladDownT = 0;
      e.pos.x = Math.max(P.minX, Math.min(P.maxX, L.x)); e.pos.z = Math.max(P.minZ, Math.min(P.maxZ, L.edgeZ + L.dirZ * 0.6));
      e.pos.y = P.y;
      e.state = 'shooting'; e.stateTime = 0; e.targetPos = null; e.homeCover = null;
      return false;
    }
  } else if (s.phase === 'toGap') {
    // on the floor, to the gap over the ladder, then down
    if (onLadderPerch(tgt, L)) { e._lad = null; e._ladDownT = 0; return false; }
    const gx = L.x, gz = L.edgeZ + L.dirZ * 0.5, dx = gx - e.pos.x, dz = gz - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.15) {
      if (otherOnLadder()) faceYaw = Math.PI * (L.dirZ < 0 ? 1 : 0);
      else { e.perch = null; e._climbed = null; e.pos.x = L.x; e.pos.z = L.z; s.phase = 'down'; s.y = L.top; }
    } else {
      const sp = Math.min(d, 2.0 * dt);
      e.pos.x += dx / d * sp; e.pos.z += dz / d * sp; walking = true; faceYaw = Math.atan2(dx, dz);
    }
  } else if (s.phase === 'down') {
    s.y -= KID_CLIMB_SPEED * dt; walking = true;
    faceYaw = Math.PI * (L.dirZ < 0 ? 1 : 0);
    const gY = scenarioGroundY(e.pos.x, e.pos.z);
    if (s.y <= gY) {
      e._lad = null; e.pos.y = gY;
      e.state = 'advancing'; e.stateTime = 0; e.targetPos = null; e.homeCover = null;
      return false;
    }
  }
  // he is moved here, not by the states: place and pose him as the loop's end would
  e.pos.y = kidGroundY(e);
  if (faceYaw != null) { kidTurnToward(e, faceYaw, dt); e.mesh.group.rotation.y = e.yaw; }   // v1.183: eased
  e.mesh.group.rotation.x = 0;
  e.mesh.group.position.set(e.pos.x, e.pos.y, e.pos.z);
  e.mesh.group.rotation.z = 0;
  setKidCrouch(e.mesh, 0);
  setKidGunHold(e.mesh, e.weapon, 0, 0);
  e._walkPhase = (e._walkPhase || 0) + (walking ? 2 * Math.PI * kidGaitCadence(1.6) * dt : 0);   // v1.171: the gait's beat
  setKidWalk(e.mesh, e._walkPhase, walking ? 0.8 : 0);
  if (e.mesh._laserUnit && e.mesh._laserUnit.userData) {
    const lu = e.mesh._laserUnit.userData;
    if (lu.beam) lu.beam.visible = false;
    if (lu.dot) lu.dot.visible = false;
  }
  return true;
}

function updateEnemies(dt) {
  // v1.121: a clock for the kids' progress windows (scenario time, counted here)
  Game.scenario.aiClock = (Game.scenario.aiClock || 0) + dt;
  // Ship C: refresh per-team focus-fire targets once before per-enemy work.
  updateTeamFocus();
  // v1.151: when the opening hold lifts, the nearest hostile gunner within earshot who is free to speak calls
  // the start (once a round; tryNpcSpeak's 24 m cutoff keeps a far kid quiet, and a kid who has just called you
  // out inside the hold is still on his 4 s cooldown, so he is passed over). Taggers bark on their own; tutorial
  // dummies never speak.
  if (!Game.scenario._startCalled && (Game.scenario.roundTime || 0) >= OPENING_HOLD_SEC) {
    Game.scenario._startCalled = true;
    const myTeam = (Game.player && Game.player.team) || 'player';
    const now = Game.scenario.roundTime || 0;
    let best = null, bestD = Infinity;
    for (const e of Game.scenario.enemies) {
      if (!e || e.health <= 0 || e.noFire || e.behavior === 'tagger') continue;
      if (e._voiceCooldownUntil && now < e._voiceCooldownUntil) continue;
      if (!Game.scenario.ffa && (e.team || 'enemy') === myTeam) continue;
      const d = Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) tryNpcSpeak(best, 'roundStart');
  }
  // Diagnostic: count lasered enemies this frame, and how many reach the clip.
  LASER_DIAG.lasered = 0;
  LASER_DIAG.ran = 0;
  for (const e of Game.scenario.enemies) {
    if (e && e.mesh && e.mesh._hasLaser) LASER_DIAG.lasered++;
  }
  for (const e of Game.scenario.enemies) {
    e._lastDt = dt;   // so getTarget's re-eval cadence timer can tick
    if (e.remote) { netDriveRemote(e, dt); continue; }   // v1.230 (D.2): another player online, moved by his own game (v1.366: out or in, and every kid in a guest's game)
    if (e.health <= 0) {
      // v1.25 ZOMBIE MODE: taggers aren't permanently out — they go down where
      // they were hit and REVIVE in place after a fixed delay, then resume the
      // chase. (Gun enemies keep the normal permanent-death / defend-respawn.)
      if (e.behavior === 'tagger') {
        e._reviveTimer = (e._reviveTimer == null) ? ZOMBIE_REVIVE_SEC : e._reviveTimer - dt;
        // Slump while down.
        if ((e.mesh.pose?.crouch ?? 0) > 0) setKidCrouch(e.mesh, 0);
        e.mesh.group.rotation.z = Math.min(Math.PI/2, (e.mesh.group.rotation.z || 0) + dt * 3);
        e.mesh.group.rotation.x = 0;   // v1.183: the slump is sideways only
        const gYz = scenarioGroundY(e.pos.x, e.pos.z);
        const curZ = e.mesh.group.position.y;
        e.mesh.group.position.y = Math.max(gYz - 0.3, (curZ != null ? curZ : gYz) - dt * 0.5);
        if (e._reviveTimer <= 0) {
          // Back up: restore health, stand, resume chase from this spot.
          e.health = e.maxHealth;
          e._reviveTimer = null;
          e.mesh.group.rotation.z = 0;
          e.state = 'chasing';
          e.hitFlash = 0;
          tryNpcSpeak(e, 'taunt');
        }
        continue;
      }
      // Hit pose — v1.28e: stand still and raise the gun-arm into the air (the
      // airsoft "I'm hit!" signal). No more slumping/sinking into the ground
      // (which made kids vanish on slopes). Feet stay planted at terrain height.
      e._hitRaise = Math.min(1, (e._hitRaise || 0) + dt * 4);
      setKidHitPose(e.mesh, e._hitRaise);
      e.mesh.group.rotation.z = 0; e.mesh.group.rotation.x = 0;   // v1.183: and no lean
      kidLadderFall(e, dt);   // v1.143: tagged on the ladder or the platform he climbed: he drops to the grass
      outKidWalkOff(e, dt);   // v1.264: after a few seconds he walks off the field
      e.mesh.group.position.y = kidGroundY(e);
      // v1.77: a downed kid's laser is no longer re-aimed (we `continue` below,
      // skipping updateKidLaser). The hit pose pitches the gun ~90° skyward, and
      // the stale laser unit rides that raised gun — leaving a vertical red beam
      // shooting straight up out of an out-of-play kid. Hide the beam + dot while
      // the kid is down; attachKidLaser keeps the refs, so a respawn just shows
      // them again and the next live-frame re-aims normally.
      if (e.mesh._laserUnit && e.mesh._laserUnit.userData) {
        const lu = e.mesh._laserUnit.userData;
        if (lu.beam) lu.beam.visible = false;
        if (lu.dot)  lu.dot.visible  = false;
      }
      continue;
    }

    // Pull stats from the character profile (with safe defaults if missing).
    // Higher fireRate = faster cycles. Higher aggression = more reposition + shorter hides.
    const ch         = e.character || {};
    const fireRate   = ch.fireRate   ?? 1.0;
    const aggression = ch.aggression ?? 0.5;

    e.stateTime += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    e._stepFromX = e.pos.x; e._stepFromZ = e.pos.z;   // v1.183: where this frame's step starts (the start ease)

    // v1.21: random TAUNT timer — every 12-30s, kid might interject. Gated by
    // the speech cooldowns in tryNpcSpeak so this doesn't dominate the soundscape.
    if (e._tauntTimer === undefined) e._tauntTimer = 12 + gameRandom() * 18;
    e._tauntTimer -= dt;
    if (e._tauntTimer <= 0) {
      e._tauntTimer = 12 + gameRandom() * 18;
      // Only kids in some kind of active state (not deploying) feel right taunting.
      if (e.state !== 'deploying') tryNpcSpeak(e, 'taunt');
    }

    // v1.21: FOOTSTEPS — detect movement from frame-to-frame position delta,
    // accumulate distance, fire a positional step sound every ~0.6m walked.
    // No coupling to AI state machine — works for any moving state.
    if (!e._prevPosForFootstep) e._prevPosForFootstep = { x: e.pos.x, z: e.pos.z };
    const fdx = e.pos.x - e._prevPosForFootstep.x;
    const fdz = e.pos.z - e._prevPosForFootstep.z;
    // v1.89: a jump no kid can run in one frame (the anti-wedge teleport home, a
    // respawn) is a teleport, not a stride: count it as standing still, so it
    // neither pops a one-frame sprint swing in the walk anim nor plays a footstep.
    const rawMoved = Math.sqrt(fdx * fdx + fdz * fdz);
    const moved = (rawMoved > Math.max(0.3, dt * 15)) ? 0 : rawMoved;
    e._animSpeed = moved / Math.max(dt, 1e-3);   // m/s the walk anim reads (tests)
    // v1.171: and its direction, for the planted-foot gait (none on a teleport)
    e._animVX = moved ? fdx / Math.max(dt, 1e-3) : 0; e._animVZ = moved ? fdz / Math.max(dt, 1e-3) : 0;
    e._footstepDist = (e._footstepDist || 0) + moved;
    if (e._footstepDist >= 0.6) {
      e._footstepDist = 0;
      playFootstep(e.pos.x, e.pos.z);
    }
    e._prevPosForFootstep.x = e.pos.x;
    e._prevPosForFootstep.z = e.pos.z;

    // v1.20-fix: compute distToPlayer ONCE here at the top of per-enemy work
    // (was below, after the burst tick — which referenced it and crashed when
    // any auto-weapon enemy first fired). Used by the burst-drain dispersion
    // math AND the engagement-range gates further down.
    // Ship A: resolve this enemy's target once (player-locked for now), then
    // read everything through `tgt` so the AI no longer hardcodes Game.player.
    // `distToPlayer` keeps its name — it's still the distance to the target, and
    // the ~half-dozen range-gate read-sites below don't need touching.
    const tgt = getTarget(e);
    const dxP = tgt.pos.x - e.pos.x;
    const dzP = tgt.pos.z - e.pos.z;
    const distToPlayer = Math.sqrt(dxP*dxP + dzP*dzP);
    // v1.183: turns over ~0.2 s, not a snap (a retreating kid turns toward home in his state instead)
    if (e.state !== 'retreating' && !e._flagRun && !e._orderRun) kidTurnToward(e, Math.atan2(dxP, dzP), dt);   // v1.189: a flag runner turns in kidFlagRun (v1.248: and one on an order in kidOrderRun)
    e.mesh.group.rotation.y = e.yaw;

    // v1.28m: plant pos.y on the terrain HERE, at the top of per-enemy work,
    // before any state logic or firing. spawnEnemyBB derives the muzzle from
    // e.pos.y, and several states only set group.position.y (not pos.y) and the
    // end-of-loop terrain plant runs AFTER firing — so on a slope the muzzle was
    // computed at ~1.05m above y=0 (underground on the high end), and enemy BBs
    // spawned in the dirt and dribbled forward. Planting pos.y early fixes the
    // shot origin for every state's spawnEnemyBB call this frame.
    e.pos.y = kidGroundY(e);

    // v1.143 (backlog D.7, Michael: A): LADDERS. With his target up on a perch (the treehouse), a kid walks to the
    // ladder and climbs it; this moves him instead of the states below, which never see the ladder.
    kidLadderFall(e, dt);
    if (Game.scenario.ladders && e.behavior !== 'tagger' && kidLadderStep(e, tgt, dt)) continue;

    // === v1.25 ZOMBIE MODE — tagger chase (no guns, tag-on-contact) ===
    // Taggers ignore the entire gun state machine: they just chase the player at
    // their move speed and INFECT on contact. They still respect obstacle
    // collision (slide + wall-follow) so they path around houses/cover. Mesh Y
    // is planted on terrain at the end like everyone else (shared exit below),
    // so we set x/z here and fall through to that block via a guarded continue.
    if (e.behavior === 'tagger') {
      setKidCrouch(e.mesh, 0);
      // v1.36h / v1.80: ZOMBIE POSE — both arms reaching forward, "I'm gonna get
      // you." With the elbow rig (v1.80) we just rotate each SHOULDER group forward
      // ~90° (so the whole arm swings from hanging-down to reaching-out along +Z)
      // and add a slight elbow bend so the reach reads as grasping, not a stiff
      // plank. setKidCrouch(.,0) above already reset both rigs to a clean hanging
      // base, so this re-poses cleanly every frame. The hands ride along (parented
      // to the elbow), so no separate hand placement is needed.
      const _po = e.mesh.pose;
      if (_po && _po.rigL && _po.rigR) {
        const reach = -Math.PI / 2 + 0.15;       // shoulders swing forward to horizontal-ish
        _po.rigL.shoulder.rotation.set(reach, 0, 0);
        _po.rigR.shoulder.rotation.set(reach, 0, 0);
        _po.rigL.elbow.rotation.set(-0.4, 0, 0);  // slight grasp bend
        _po.rigR.elbow.rotation.set(-0.4, 0, 0);
      }
      e.mesh.group.position.y = 0;  // overwritten by terrain plant at loop exit
      // v1.36h: INFECTION barks — periodically yell a goofy zombie taunt while
      // chasing. tryNpcSpeak handles global/per-kid cooldowns + positional
      // attenuation, so distant taggers stay quiet and the soundscape doesn't
      // turn into a babble festival. Per-tagger jittered interval on top.
      if (e._infBark === undefined) e._infBark = 2 + gameRandom() * 5;
      e._infBark -= dt;
      if (e._infBark <= 0) {
        e._infBark = 5 + gameRandom() * 7;
        tryNpcSpeak(e, 'infection');
      }
      if (distToPlayer <= ZOMBIE_TAG_RANGE && Game.mode === 'scenario' && !Game.player._infected) {
        Game.player._infected = true;
        tryNpcSpeak(e, 'playerHit');
        // Plant feet on terrain for this frame too, then end the round.
        e.pos.y = scenarioGroundY(e.pos.x, e.pos.z);
        e.mesh.group.position.x = e.pos.x;
        e.mesh.group.position.z = e.pos.z;
        e.mesh.group.position.y = e.pos.y;
        endScenarioLater('infected', 200);
        continue;
      }
      // Chase speed: sprinters run down the player; joggers match a jog.
      // v1.101: moved in sub-steps of at most 1/60 s. The wedge handling below
      // steers on per-step distances and timers, and with a slow frame's 0.05 s
      // steps it found new places to stick (Mitchell at a fence end or a house
      // corner) that it never does at 60 fps. Sub-steps make every frame rate
      // steer the way 60 fps does.
      const zSteps = Math.max(1, Math.ceil(dt * 60 - 1e-6)), zdt = dt / zSteps;
      for (let zi = 0; zi < zSteps; zi++) {
        const speed = (e.zombieSprinter ? ZOMBIE_SPRINT_SPEED : ZOMBIE_JOG_SPEED) * (ch.moveSpeed ?? 1.0);
        const zdxP = tgt.pos.x - e.pos.x, zdzP = tgt.pos.z - e.pos.z;
        const d = Math.hypot(zdxP, zdzP) || 1;
        const stepX = (zdxP / d) * speed * zdt;
        const stepZ = (zdzP / d) * speed * zdt;
        const kidRadius = 0.35;
        const nX = e.pos.x + stepX, nZ = e.pos.z + stepZ;
        const bX = e.pos.x, bZ = e.pos.z;
        const zStuckD = 0.02;   // "no progress" per sub-step (tuned at 1/60 s)
        // v1.100: while committed to a wall-follow sidestep (below), skip the
        // straight step: its slide pulled the kid straight back to the spot he
        // wedged on, so a tagger round a tree or along a low wall went nowhere.
        if (e._zTurnT > 0) e._zTurnT -= zdt;
        if (e._zBackT > 0) {
          // v1.154 fix-up: backing out of a pocket (the turn-round count below)
          // straight away from the target, or 45° / 90° off it when that is shut (Devon backed into the tree that
          // closed the pocket); the side that last worked is tried first, so he doesn't zigzag
          e._zBackT -= zdt;
          const sg = e._zBackSg || 1;
          for (const a of [0, sg * 0.7854, -sg * 0.7854, sg * 1.5708, -sg * 1.5708]) {
            const c = Math.cos(a), sn = Math.sin(a);
            const ox = e.pos.x - stepX * c + stepZ * sn, oz = e.pos.z - stepX * sn - stepZ * c;
            if (!collidesObstacles(ox, oz, kidRadius)) { e.pos.x = ox; e.pos.z = oz; if (a) e._zBackSg = Math.sign(a); break; }
          }
          if (e._zBackT <= 0) { e._zSideT = 0; e._zWedges = 0; }
          continue;
        }
        const sideCommitted = e._zSideT > 0;
        if (sideCommitted) e._zSideT -= zdt;
        else if (!collidesObstacles(nX, nZ, kidRadius)) { e.pos.x = nX; e.pos.z = nZ; e._zDetourOn = false; }
        // v1.125 fix-up: while a fence detour is moving him, no slide: on Mitchell's
        // backyard bin the straight step's slide (south) cancelled the detour's (north)
        // to the millimetre, and he stood at the bin's west face for seconds at a time.
        else if (!e._zDetourOn) {
          if (!collidesObstacles(nX, e.pos.z, kidRadius)) e.pos.x = nX;
          if (!collidesObstacles(e.pos.x, nZ, kidRadius)) e.pos.z = nZ;
        }
        if (e._zWedgeT > 0) e._zWedgeT -= zdt; else e._zWedges = 0;
        // Wall-follow when wedged (same idea as the advancing state).
        if (e._zDetourBan > 0) e._zDetourBan -= zdt;
        // v1.125 fix-up: also wedged when he makes no NET progress. Boxed in by
        // v1.125's backyard props, Mitchell slid ~0.02 m a step and was pushed
        // back, every step just over zStuckD, so the wall-follow never ran.
        // Over each 0.5 s window, under 0.3 m net (a free tagger covers ~1.7 m)
        // counts as stuck for the next window.
        e._zWin = (e._zWin || 0) + zdt;
        if (!e._zAnchor) e._zAnchor = { x: bX, z: bZ };
        if (e._zWin >= 0.5) {
          e._zNetStuck = Math.hypot(e.pos.x - e._zAnchor.x, e.pos.z - e._zAnchor.z) < 0.3;
          e._zAnchor.x = e.pos.x; e._zAnchor.z = e.pos.z; e._zWin = 0;
        }
        if (Math.hypot(e.pos.x - bX, e.pos.z - bZ) < zStuckD || e._zNetStuck) {
          // v1.100: committed sidestep frames skip the straight step, so they
          // don't count toward the 0.5 s side flip (a blocked sidestep flips below).
          if (!sideCommitted) e._zStuck = (e._zStuck || 0) + zdt;
          // v1.73: walk around a wedging fence's nearer end instead of jittering.
          // v1.98: only while that gets somewhere. A fence further along the line
          // still yields a waypoint when the kid is actually wedged on something
          // else (Infection's Mitchell, on a backyard box that also blocks the step
          // to the waypoint), and he jittered in place all round. After 0.4 s of
          // detour without progress, wall-follow instead for 1.5 s.
          const zdet = (e._zDetourBan > 0) ? null : fenceDetourWaypoint(e.pos.x, e.pos.z, tgt.pos.x, tgt.pos.z, Game.player.obstacles, kidRadius);
          if (zdet) {
            const zdx = zdet.x - e.pos.x, zdz = zdet.z - e.pos.z;
            const zl = Math.hypot(zdx, zdz) || 1;
            const zs = speed * zdt;
            const fx = e.pos.x + (zdx / zl) * zs, fz = e.pos.z + (zdz / zl) * zs;
            if (!collidesObstacles(fx, fz, kidRadius)) { e.pos.x = fx; e.pos.z = fz; }
            else if (!collidesObstacles(fx, e.pos.z, kidRadius)) e.pos.x = fx;
            else if (!collidesObstacles(e.pos.x, fz, kidRadius)) e.pos.z = fz;
            // v1.125 fix-up: any real movement counts here. Sliding along a prop toward the
            // waypoint moves only one component of the step (0.0197 m a sub-step for Mitchell),
            // under zStuckD, and a detour that was getting him out was banned as failed.
            e._zDetourOn = Math.hypot(e.pos.x - bX, e.pos.z - bZ) >= 0.005;
            if (!e._zDetourOn) {
              e._zDetourFail = (e._zDetourFail || 0) + zdt;
              if (e._zDetourFail > 0.4) { e._zDetourBan = 1.5; e._zDetourFail = 0; e._zStuck = 0; }
            } else e._zDetourFail = 0;
          } else {
          e._zDetourOn = false;
          let px = -zdzP / d, pz = zdxP / d;
          if (!e._zSide) e._zSide = gameRandom() < 0.5 ? 1 : -1;
          if (e._zStuck > 0.5) { e._zSide *= -1; e._zStuck = 0; }
          // v1.311: a fresh wedge that came from a slide along a wall sidesteps the way the slide was going. Down
          // v1.305's longer house walls, with the player well off to one side, the slide's step fell under zStuckD
          // (Mitchell, 0.0197 m along house 5's west wall in Bunratty Infection), and the sidestep sent him back up
          // the wall a metre short of its corner, over and over.
          else if (!sideCommitted) {
            const mvx = e.pos.x - bX, mvz = e.pos.z - bZ;
            const along = mvx * (-zdzP / d) + mvz * (zdxP / d);
            if (Math.hypot(mvx, mvz) >= 0.005 && Math.abs(along) > 0.003) e._zSide = Math.sign(along);
          }
          px *= e._zSide; pz *= e._zSide;
          const ss = speed * zdt;
          const sx = e.pos.x + px * ss, sz = e.pos.z + pz * ss;
          if (!collidesObstacles(sx, sz, kidRadius)) { e.pos.x = sx; e.pos.z = sz; }
          else if (!collidesObstacles(sx, e.pos.z, kidRadius)) e.pos.x = sx;
          else if (!collidesObstacles(e.pos.x, sz, kidRadius)) e.pos.z = sz;
          if (sideCommitted && Math.hypot(e.pos.x - bX, e.pos.z - bZ) < zStuckD * 0.5) {
            e._zSide *= -1; e._zSideT = 0;
            // v1.154 fix-up: v1.121's pocket rule, ported from the gunners. A second blocked turn-round within 3 s means
            // both sidesteps are shut (Hollow Infection Night: Devon between a fort's two walls and a tree, open only on
            // the far side, shuttled 21 s); back away from the target for 0.8 s, then sidestep from there.
            e._zTurns = (e._zTurnT > 0 ? (e._zTurns || 0) : 0) + 1; e._zTurnT = 3;
            if (e._zTurns >= 2) { e._zTurns = 0; e._zBackT = 0.8; }
          }
          // v1.100: a fresh sidestep commits for 0.35 s (~1.2 m), longer each time
          // he wedges again within 3 s (up to 1.4 s), so he clears the wall's end.
          if (!sideCommitted) {
            e._zWedges = Math.min(4, (e._zWedges || 0) + 1);
            e._zWedgeT = 3;
            e._zSideT = 0.35 * e._zWedges;
          }
          }
        } else e._zStuck = 0;
      }
      // Plant on terrain (mirror of the shared loop-exit logic) and finish.
      e.pos.y = scenarioGroundY(e.pos.x, e.pos.z);
      e.mesh.group.position.x = e.pos.x;
      e.mesh.group.position.z = e.pos.z;
      e.mesh.group.position.y = e.pos.y;
      if (e.hitFlash > 0) {
        e.mesh.parts.torso.material.emissive = new THREE.Color(1, 0, 0);
        e.mesh.parts.torso.material.emissiveIntensity = e.hitFlash / 0.6;
      } else {
        e.mesh.parts.torso.material.emissiveIntensity = 0;
      }
      continue;
    }

    // v1.20: AUTO-WEAPON BURST tick. Drain pending burst BBs as their timers
    // elapse. Aim is re-acquired at each shot, but accuracy degrades slightly
    // across the burst (recoil dispersion). Burst BBs DO NOT depend on the
    // AI state machine — once queued, they fire even if the kid is mid-reposition.
    if (e.pendingBurst.length > 0) {
      for (let k = e.pendingBurst.length - 1; k >= 0; k--) {
        e.pendingBurst[k].dueIn -= dt;
        if (e.pendingBurst[k].dueIn <= 0) {
          const entry = e.pendingBurst[k];
          // v1.74: a burst entry may carry a fixed `aim` point (suppression bursts
          // fired on the move target the last-known spot, not the live position).
          // Without one, re-aim at the live target as before.
          const target = entry.aim ? entry.aim.clone() : tgt.pos.clone();
          if (!entry.aim) {
            const headshotBias = ch.headshotBias ?? 0.1;
            const aimFrac = 0.65 + headshotBias * 0.30;
            target.y += tgt.height * aimFrac;
            if (e._sightHead) target.y = tgt.headY;   // v1.385 (B.20): a head over a wall
          }
          // Add a touch of dispersion that scales with how far into the burst we are.
          // Suppression bursts use a wider, looser spread (set in `spread`).
          const burstSpread = (entry.spread != null ? entry.spread : 0.04) * (1 + k * 0.15);
          target.x += (gameRandom() - 0.5) * burstSpread * Math.max(2, distToPlayer * 0.4);
          target.y += (gameRandom() - 0.5) * burstSpread * 0.6;
          target.z += (gameRandom() - 0.5) * burstSpread * Math.max(2, distToPlayer * 0.4);
          spawnEnemyBB(e, target);
          // v1.122: a held pull empties the queue (v1.112); the next pass of this loop then read a missing entry
          // and threw ("reading 'dueIn'"), which skipped the rest of the frame's enemy update.
          if (e.pendingBurst.length === 0) break;
          e.pendingBurst.splice(k, 1);
        }
      }
    }

    // Engagement range — per-weapon. v1.73: full per-weapon pass. Three dials:
    //   NEAR = inner edge of the kid's COMFORTABLE zone (snappy peeks, confident
    //          fire). FAR = absolute firing ceiling (won't fire past it). PUSH =
    //          how close it WANTS to be before it stops advancing and digs in.
    //   Invariant kept per row: PUSH <= NEAR <= FAR.
    //   shotgun:  near  8 / far  25 / push  6   (wants to be right on top of you)
    //   pistol:   near 12 / far  30 / push  8   (close/mid)
    //   mac10:    near 14 / far  24 / push  7   (short hoser — BBs wobble at 7m)
    //   ump:      near 35 / far  50 / push 15   (controllable SMG, holds further)
    //   mp5:      near 35 / far  50 / push 12   (faster spray, crowds a touch more)
    //   ar:       near 40 / far  60 / push 15   (reaches far, still wants the mix)
    //   ak47:     near 50 / far 100 / push 20   (AGGRESSIVE ranged: fires from way
    //             out, but low push = still closes and brawls. A future LMG is the
    //             hold-the-back-line gun with a high push.)
    //   sniper:   near 100 / far 200 / push 40  (open LOS anywhere = a shot)
    let ENGAGE_NEAR = 12, ENGAGE_FAR = 30, ENGAGE_PUSH_BASE = 8;  // default ≈ pistol
    if (e.weapon === 'shotgun')        { ENGAGE_NEAR =   8; ENGAGE_FAR =  25; ENGAGE_PUSH_BASE =  6; }
    else if (e.weapon === 'mac10')     { ENGAGE_NEAR =  14; ENGAGE_FAR =  24; ENGAGE_PUSH_BASE =  7; }
    else if (e.weapon === 'ump')       { ENGAGE_NEAR =  35; ENGAGE_FAR =  50; ENGAGE_PUSH_BASE = 15; }
    else if (e.weapon === 'mp5')       { ENGAGE_NEAR =  35; ENGAGE_FAR =  50; ENGAGE_PUSH_BASE = 12; }
    else if (e.weapon === 'ar')        { ENGAGE_NEAR =  40; ENGAGE_FAR =  60; ENGAGE_PUSH_BASE = 15; }
    else if (e.weapon === 'ak47')      { ENGAGE_NEAR =  50; ENGAGE_FAR = 100; ENGAGE_PUSH_BASE = 20; }
    else if (e.weapon === 'sniper')    { ENGAGE_NEAR = 100; ENGAGE_FAR = 200; ENGAGE_PUSH_BASE = 40; }
    // (pistol + any unset weapon fall through to the 12/30/8 default.)
    const inFullRange    = distToPlayer < ENGAGE_NEAR;
    const inMarginalRange = distToPlayer >= ENGAGE_NEAR && distToPlayer < ENGAGE_FAR;
    const inLongRange    = distToPlayer >= ENGAGE_FAR;

    // v1.28h: PUSH DISTANCE — how close a kid actively WANTS to be before it
    // settles in to fight. While a kid is beyond ENGAGE_PUSH it keeps advancing
    // even with LOS; only inside it does it hold and peek/harass. v1.73: PUSH is
    // now table-driven per weapon (above) rather than derived from NEAR, so each
    // gun's "fire from range vs. close and brawl" character is tuned directly.
    // Defenders are exempt entirely (they hold their fort by design).
    // Aggressive kids push a little closer still (~0.85x at max aggression).
    let ENGAGE_PUSH = ENGAGE_PUSH_BASE * (1.15 - aggression * 0.3);
    if (e._underFire && e._underFire.kind === 'push') ENGAGE_PUSH *= 0.6;   // v1.387 (D.81): pushing, he closes right in
    const insidePushDist = distToPlayer <= ENGAGE_PUSH;

    // v1.74: RANGED AUTO-RIFLE "fire while you close." The AK (and spring AR) are
    // meant to PEPPER from well out — full-auto strings, not the lone pistol-like
    // suppressing round you get while marching. But their PUSH is deliberately low
    // (AK 20) so they still close and brawl. Those two goals conflicted: the
    // hold-and-fire gate below keyed on insidePushDist, so beyond ~PUSH the kid
    // never entered the peek→shoot→burst cycle and only threw single suppressing
    // BBs. Fix: for these guns, the kid is allowed to STOP-AND-FIRE a real burst
    // anywhere inside its NEAR band with LOS, while STILL preferring to advance
    // when it lacks a clean line. Net effect: bursts from 40m+, but it keeps
    // pushing in between strings. `fireHoldDist` is the distance inside which a
    // clean shot is worth planting for; for ranged autos that's NEAR, otherwise
    // it stays the old PUSH behaviour.
    const isRangedAuto = (e.weapon === 'ak47' || e.weapon === 'ar');
    const fireHoldDist = isRangedAuto ? ENGAGE_NEAR : ENGAGE_PUSH;
    const insideFireHold = distToPlayer <= fireHoldDist;

    // v1.23: SPOTTED MEMORY. Track when this kid last had a clear line to the
    // player. Once recently spotted, they keep shooting at the last-known spot
    // for a short window even if LOS drops (player ducked behind cover) — this
    // is the "covering fire / don't let up" behavior. Computed once here so the
    // peek/shoot/advance cases can all read it.
    {
      // v1.180: from his real height (kidGroundY: the perch, or the ground under him, 0.35 m on the bulb); was the perch or 0
      // v1.385 (B.20): to the chest, or the head over a wall (aiSightY); `_sightHead` aims the shot there
      const sightY = aiSightY(e, tgt);
      const losMem = sightY != null;
      e._sightHead = losMem && sightY !== tgt.chestY;
      if (losMem) {
        e._lastSawPlayer = e.stateTime !== undefined ? aiNow() : 0;   // v1.176: simulated time
        e._lastSeenPos = { x: tgt.pos.x, y: tgt.pos.y, z: tgt.pos.z };
        e._lastSeenHeadUp = e._sightHead ? sightY - tgt.pos.y : null;   // v1.385: suppress the wall's top where his head was
      }
      // recentlySpotted = saw the player within the last RECENT_SPOT_WINDOW sec.
      // v1.36e: extended 1.8 → 3.2s so a kid who's seen you keeps pressuring the
      // cover you ducked behind (covering fire) for a meaningful beat instead of
      // relaxing the moment you break their line.
      const RECENT_SPOT_WINDOW = 3.2;
      e._recentlySpotted = e._lastSawPlayer && (aiNow() - e._lastSawPlayer) < RECENT_SPOT_WINDOW;
      e._hasLOSNow = losMem;
      // v1.134: seconds without a line to anyone, for the free-for-all roam below
      e._unseenTime = losMem ? 0 : (e._unseenTime || 0) + dt;
    }

    // v1.152 (Michael: A, the critic's "last kid comes looking"): in team and kill-all rounds a cautious kid (aggression
    // under 0.45) who held cover out of sight hid and peeked at nobody for the rest of the round, so a round with no
    // timer had no end. Once his side is down to its last one or two, a kid who has neither moved 2 m nor fired with a
    // line on his target for 25-30 s gets bored: a taunt, and he marches like a skirmisher (the `hiding` case below)
    // until he next fires with a line. Snipers, defenders, taggers and defend or timer rounds are left as they were.
    updateKidBoredom(e, dt);

    // v1.9: shotgun kids want to *push closer* if the player is past their near range.
    // We achieve this through repositioning bias below (target cover that's closer to
    // player). Sniper kids want to *hold* and won't push.

    // v1.387 (D.81): under heavy fire he camps, falls back or pushes, by his aggression (kidUnderFire, above)
    kidUnderFire(e, aggression, dt);

    // ── v1.67: REACT TO INCOMING FIRE ────────────────────────────────────────
    // A fresh near-miss (stamped by updateBBs within the last ~0.4s) makes the
    // kid respond, scaled by aggression as a "bravery" factor:
    //   • In cover AND that cover shields the threat bearing → CROUCH and hold
    //     (use the cover better). Brave kids strongly favor this.
    //   • In cover but EXPOSED to the threat bearing → relocate to cover that
    //     actually blocks that direction.
    //   • Fully in the open → fire a suppressing burst back down the threat
    //     bearing WHILE moving to the nearest (ideally shielding) cover.
    // Bravery gate: timid kids (low aggression) let this interrupt even an active
    // advance ("running scared"); brave kids only react from holding states so a
    // committed push/shot isn't broken (the "Moderate" end the player described).
    {
      const now67 = aiNow();   // v1.176: simulated time
      const fresh = e._incomingDir && e._lastNearMiss && (now67 - e._lastNearMiss) < 0.4;
      const reactCdOk = !e._reactCd || (now67 - e._reactCd) > (1.4 - aggression * 0.6); // brave kids re-react sooner
      // v1.71: NEVER interrupt a committed retreat/redeploy. A tagged kid running
      // back to respawn (state 'retreating') or jogging back out to its anchor
      // ('deploying') is in the open and very likely to catch a near-miss BB — and
      // before this guard, the reaction below would flip it to repositioning/hiding,
      // CANCELLING the respawn run. Symptom: kid burns a life on the hit but never
      // leaves, just keeps engaging. Retreat/deploy are uninterruptible.
      const committed = (e.state === 'retreating' || e.state === 'deploying');
      // Brave kids won't let it interrupt an active advance/peek/shoot; timid kids will.
      const interruptible = !committed && ((aggression < 0.5) ||
        (e.state !== 'advancing' && e.state !== 'peeking' && e.state !== 'shooting'));
      // v1.387 (D.81): not while he falls back or pushes under heavy fire (it would turn him round)
      const ufBusy = e._underFire && e._underFire.kind !== 'camp';
      if (fresh && reactCdOk && interruptible && e.weapon !== 'sniper' && !ufBusy) {
        e._reactCd = now67;
        const dir = e._incomingDir;
        const inCover = kidInCover(e);
        const shielded = inCover && coverShieldsFrom(e.homeCover, e.pos, dir);
        if (shielded) {
          // Already protected → hunker down and keep using this cover.
          e.state = 'hiding';
          e.stateTime = 0;
          setKidCrouch(e.mesh, 1);
          // Brave kids snap back to fighting fast; timid kids stay tucked longer.
          e.nextStateChange = (1.1 - aggression * 0.5) + gameRandom() * 0.4;
        } else {
          // Exposed (in the open, or cover doesn't block this bearing) → relocate
          // to cover that shields the threat. If fully in the open, also throw a
          // suppressing round back down the bearing as we break for cover.
          if (!inCover) {
            e._suppressCd = (e._suppressCd || 0) - dt;
            if (e._suppressCd <= 0) {
              // Aim a round back along the incoming bearing (toward the shooter),
              // chest height, with spread — pressure, not precision.
              const aimPt = new THREE.Vector3(
                e.pos.x + dir.x * 14 + (gameRandom()-0.5)*2.5,
                (e.pos.y || 0) + 1.0,
                e.pos.z + dir.z * 14 + (gameRandom()-0.5)*2.5
              );
              spawnEnemyBB(e, aimPt);
              e._suppressCd = (1.6 - aggression * 0.6) + gameRandom()*0.5;
            }
          }
          let newCover = nearestShieldingCover(e, dir, 14);
          // v1.392 (D.51): camping, he keeps the camp's own rule (no cover more than 1 m nearer the fire) here too: on the
          // lot's north-south rows the nearest car that shields him was the next one up the aisle, a timid kid walking
          // 4-5 m toward an M249; he gets down where he is instead
          const ufc = e._underFire && e._underFire.kind === 'camp' && e._underFire.from;
          if (newCover && ufc) {
            const sp = coverStandPos(newCover, { x: e.pos.x + dir.x * 20, z: e.pos.z + dir.z * 20 }, 0.35);
            if (Math.hypot(sp.x - ufc.x, sp.z - ufc.z) < Math.hypot(e.pos.x - ufc.x, e.pos.z - ufc.z) - 1) {
              newCover = null;
              e.state = 'hiding'; e.stateTime = 0; e.nextStateChange = 1.2 + gameRandom() * 0.8;
              setKidCrouch(e.mesh, 1);
            }
          }
          if (newCover) {
            e.state = 'repositioning';
            e.stateTime = 0;
            // v1.387: stand on the cover's far side from the shooter (dir points at him); it was e.pos - dir, the near side
            e.targetPos = coverStandPos(newCover, { x: e.pos.x + dir.x * 20, z: e.pos.z + dir.z * 20 }, 0.35);
            e.homeCover = newCover;
            if (!e.coverMemory) e.coverMemory = [];
            e.coverMemory.push(newCover);
            if (e.coverMemory.length > 2) e.coverMemory.shift();
          }
        }
        e._incomingDir = null;   // consume the signal
      }
    }

    // v1.189: capture the flag. A kid with a flag to fetch, carry home or send home walks there by the distance field
    // (kidFlagRun) instead of the states below, firing on the move at whoever he can see.
    e._flagRun = Game.scenario.ctf ? kidFlagRun(e, tgt, distToPlayer, dt) : false;
    // v1.248 (D.35): a teammate on a standing order (squad commands) moves on it instead of the states
    e._orderRun = !e._flagRun && Game.scenario.squadOrder && e.team === 'player' ? kidOrderRun(e, tgt, distToPlayer, dt) : false;
    // State logic
    if (!e._flagRun && !e._orderRun) switch (e.state) {
      case 'deploying': {
        // v1.14: Match-start dispersal. The kid spawned in a tight huddle at one
        // end of the map and now jogs to its assigned fighting position
        // (e.deployTarget = its anchor). Once it arrives — OR the player comes
        // into engagement range with LOS (don't keep jogging past a live threat) —
        // it hands off to the normal FSM. Uses the same collision-slide mover as
        // 'advancing' but targets the anchor, not the player.
        // v1.14b: standing & moving — full stand pose, feet on the ground.
        e.mesh.group.position.y = 0;
        setKidCrouch(e.mesh, 0);
        const dest = e.deployTarget || e.anchorPos;
        if (e.stateTime < 0.1) { e._deployBest = null; e._deployNoGain = 0; }   // v1.265 fix-up: a fresh deploy, a fresh progress mark
        const dxd = dest.x - e.pos.x, dzd = dest.z - e.pos.z;
        const dd = Math.sqrt(dxd*dxd + dzd*dzd);
        // Reactive bail: if a real shot presents itself mid-deploy, take it.
        {
          // v1.180: from his real height, as the shot itself (was the perch or 0); v1.385 (B.20): a head over a wall counts
          const losNow = aiSightY(e, tgt) != null;
          if (losNow && inFullRange) {
            e.state = 'hiding';
            e.stateTime = 0;
            e.nextStateChange = 0.3 + gameRandom() * 0.3;
            break;
          }
        }
        // v1.14a: hold the huddle briefly before peeling off, staggered per
        // enemy (deployDelay), so the grouped start is actually visible and the
        // kids leave one at a time like a real team breaking from a staging spot.
        if (e.stateTime < (e.deployDelay || 0)) {
          break; // stand in the huddle, facing the player, not yet moving
        }
        if (dd < 1.6) {
          // Arrived at fighting position → settle into normal behavior.
          e.state = 'hiding';
          e.stateTime = 0;
          e.nextStateChange = 0.4 + gameRandom() * 0.6;
          break;
        }
        // Jog straight toward the anchor, sliding along obstacles (try X-only then
        // Z-only when the diagonal collides). v1.15a: the spawn cluster is now on
        // the open road spine (never inside a house — fixed the overwatch
        // spawn-in-house bug), and this slide works the kid around house walls to
        // reach backyard anchors. If the player comes into range mid-deploy the
        // reactive-bail above kicks them straight into the fight, so a kid still
        // working around a house never reads as "stuck" for long.
        const deploySpeed = 2.6 * (ch.moveSpeed ?? 1.0);
        const stepX = (dxd / dd) * deploySpeed * dt;
        const stepZ = (dzd / dd) * deploySpeed * dt;
        const kidRadius = 0.35;
        const nX = e.pos.x + stepX, nZ = e.pos.z + stepZ;
        const beforeDX = e.pos.x, beforeDZ = e.pos.z;
        if (!collidesObstacles(nX, nZ, kidRadius)) {
          e.pos.x = nX; e.pos.z = nZ;
        } else {
          if (!collidesObstacles(nX, e.pos.z, kidRadius)) e.pos.x = nX;
          if (!collidesObstacles(e.pos.x, nZ, kidRadius)) e.pos.z = nZ;
        }
        // v1.23a: anti-wedge watchdog. If a deploying kid can't make real
        // progress toward its anchor for ~1.0s (boxed in by cover, anchor blocked
        // by the new forts, etc.), stop trying to reach the anchor and just push
        // toward the player via 'advancing' (which has its own LOS/engage
        // handoff). Prevents the "frozen after respawn" stall when the redeploy
        // path is blocked. Measures ACTUAL displacement, not slide-assignment.
        const deployMovedDist = Math.hypot(e.pos.x - beforeDX, e.pos.z - beforeDZ);
        // v1.73: if a fence is the thing wedging the redeploy, walk around its
        // nearer end toward the anchor instead of burning the full watchdog second.
        if (deployMovedDist <= 0.02) {
          const ddet = fenceDetourWaypoint(e.pos.x, e.pos.z, dest.x, dest.z, Game.player.obstacles, kidRadius);
          if (ddet) {
            const ex = ddet.x - e.pos.x, ez = ddet.z - e.pos.z;
            const el = Math.hypot(ex, ez) || 1;
            const es = deploySpeed * dt;
            const fx = e.pos.x + (ex / el) * es, fz = e.pos.z + (ez / el) * es;
            if (!collidesObstacles(fx, fz, kidRadius)) { e.pos.x = fx; e.pos.z = fz; }
            else if (!collidesObstacles(fx, e.pos.z, kidRadius)) e.pos.x = fx;
            else if (!collidesObstacles(e.pos.x, fz, kidRadius)) e.pos.z = fz;
          }
        }
        const deployMovedFinal = Math.hypot(e.pos.x - beforeDX, e.pos.z - beforeDZ);
        e._deployStuck = (deployMovedFinal > 0.02) ? 0 : (e._deployStuck || 0) + dt;
        // v1.265 fix-up (CI, stuck-sweep 5/15/16): also measured as ground gained toward the anchor, as v1.164 did for
        // retreating. Behind the Hollow's south fort (v1.259) ally Sean, deploying south through its back wall, crept
        // ~1 cm/s along it and was nudged back 8 cm every few seconds; each nudge reset the "moved over 2 cm" test and he
        // held 'deploying' at (4.9, 33.6) for 26-71 s. Now 1.5 s without getting 0.3 m nearer the anchor hands him off too.
        if (e._deployBest == null || dd < e._deployBest - 0.3) { e._deployBest = dd; e._deployNoGain = 0; }
        else e._deployNoGain = (e._deployNoGain || 0) + dt;
        if (e._deployNoGain > 1.5) { e._deployStuck = 1.01; e._deployBest = null; e._deployNoGain = 0; }
        if (e._deployStuck > 1.0) {
          e._deployStuck = 0;
          e._deployBest = null;
          e.state = 'advancing';
          e.stateTime = 0;
          e.advanceCheckTimer = 0;
        }
        break;
      }

      case 'hiding': {
        // v1.14b: Crouch behind cover as a real POSE — feet stay on the ground,
        // the kid bends low. (Was: sink the whole group 0.45m into the floor,
        // which buried the legs and looked legless in the open.)
        e.mesh.group.position.y = 0;
        setKidCrouch(e.mesh, 1);

        // v1.21: AGGRESSION TUNING — make enemies actually engage instead of
        // staring. Three knobs lowered together:
        //   (1) march-eligibility threshold dropped 0.65 → 0.45 (most skirmishers
        //       now advance when they can't see / can't reach you).
        //   (2) wind-up base dropped 0.7-1.2s → 0.4-0.8s (peeks happen sooner).
        //   (3) shooting-recovery cycle in `shooting` case below: 1.2-2.7s → 0.7-1.6s.
        //   (4) repositionChance baseline 0.20 → 0.30 (kids move more between shots).
        // Snipers + defenders still hold position by their existing modifiers.
        // v1.134 (Michael: B on the lot free-for-all): with every start hidden, a cautious kid (aggression under 0.45)
        // hid and peeked at nobody all round. In a free-for-all, 5 s without seeing anyone sends any skirmisher looking.
        const ffaRoam = Game.scenario.ffa && (e._unseenTime || 0) > 5;
        const marchEligible = (
          e.role === 'attacker' ||
          (e.role === 'skirmisher' && (aggression >= 0.45 || ffaRoam)) ||
          e._bored   // v1.152: a bored last kid comes looking
        ) && e.weapon !== 'sniper' && e.role !== 'defender';

        if (marchEligible) {
          // v1.23: a kid can engage from here if they have a shot — meaning LOS
          // AND inside their (now much wider) FAR range.
          // v1.28h: ...BUT short-range weapons must also be inside their PUSH
          // distance to count this as "good enough to hold." A shotgun/SMG kid
          // with LOS at 16m used to park and dribble covering fire; now, because
          // 16m > its push distance, it keeps ADVANCING to close the gap and only
          // settles in once it's actually close. Rifles/snipers have a large push
          // distance so they still hold and harass from range as before.
          const hasShotFromHere = e._hasLOSNow && (inFullRange || inMarginalRange) && insideFireHold;
          // Recently-spotted kids also stay put to keep firing at the last-known
          // spot (covering fire) — but again only if they're already close enough;
          // otherwise they push toward the last-known position. v1.74: ranged autos
          // use the wider fire-hold band here too (insideFireHold) so an AK gunner
          // keeps stringing bursts at the cover you ducked behind from range.
          const canEngageNow = hasShotFromHere || (e._recentlySpotted && insideFireHold && !inLongRange);
          // v1.387 (D.81): camping or fallen back under heavy fire, he stays in his cover rather than marching out
          if (!canEngageNow && !(e._underFire && e._underFire.kind !== 'push')) {
            // Either can't see the player, or they're farther than this weapon
            // wants to fight from → march in to close the distance.
            e.state = 'advancing';
            e.stateTime = 0;
            e.advanceCheckTimer = 0;
            break;
          }
          // canEngageNow is true → fall through to the normal peek cycle below.
        }

        // v1.387 (D.81): camping (or fallen back) under heavy fire, he stays down twice as long between peeks
        if (e.stateTime > e.nextStateChange * (e._underFire && e._underFire.kind !== 'push' ? 2 : 1)) {
          e.state = 'peeking';
          e.stateTime = 0;
          // v1.21: playerSpotted — kid calls out as they peek. Only if in
          // engagement range (otherwise they're just being cautious, not engaging).
          if (inFullRange || inMarginalRange) tryNpcSpeak(e, 'playerSpotted');
          // v1.23: wind-up shortened further, and CUT HARD when recently spotted —
          // a kid who just saw you reacts almost instantly (covering fire / fast
          // re-engage) instead of doing a full lazy peek wind-up.
          let baseWindup = (0.35 + gameRandom() * 0.35) * (1.3 - aggression * 0.6);
          if (e._recentlySpotted) baseWindup *= 0.35;  // snap reaction when freshly spotted
          if (inLongRange) baseWindup *= 1.8;
          e.nextStateChange = baseWindup;
        }
        break;
      }

      case 'advancing':
        // v1.12: March toward the player at boosted speed, ignoring cover.
        // v1.25: FLANKERS now BOUND cover-to-cover with suppressing fire instead
        // of running the flank in the open. A flanking kid (flankSide≠0) that's
        // still beyond ~10m picks the best forward cover on its flank side, fires
        // a short suppressing burst toward the player's last-known spot from its
        // current position, then sprints to that cover, repeating. Inside ~10m
        // (or when no good bound cover exists) it falls through to the direct
        // push below. Center-lane kids keep the straight march.
        e.mesh.group.position.y = 0;
        setKidCrouch(e.mesh, 0); // v1.14b: stand tall while marching
        {
          const baseSpeed = 3.5;
          const sprintMult = aggression >= 0.75 ? 2.0 : 1.0;
          const speed = baseSpeed * (ch.moveSpeed ?? 1.0) * sprintMult;
          const rawDx = tgt.pos.x - e.pos.x;
          const rawDz = tgt.pos.z - e.pos.z;
          const rawD = Math.hypot(rawDx, rawDz) || 1;

          // --- v1.25 bounding overwatch (flankers, still at range) ---
          // v1.66: ONLY bound when the kid is close enough to actually suppress
          // during the bounds (within ENGAGE_FAR). Beyond that, bounding cover-to-
          // cover is silent AND can drift laterally without closing — a pistol
          // flanker (ENGAGE_FAR 30) redeploying to a ~40m anchor would park out
          // there, never suppressing (needs <38m) and never committing (bound
          // commit needs <ENGAGE_NEAR), looking dead. Trey's AR (FAR 48) covers
          // the whole approach so he bounds the whole way as before. Beyond the
          // band, fall through to direct push to close the gap first.
          let usingBound = false;
          // v1.99: after a wedged bound, rest from bounding for a beat (below).
          if (e._boundRest > 0) e._boundRest -= dt;
          // v1.103: hysteresis on the 10 m close-in line. A flanker standing at
          // 10.0 m bounded one step in (under 10 m), the direct push's sidestep took
          // him back out, and he flipped between the two every frame for 80 s
          // (Whole Block's Marcus by the van). Inside 10 m he now stays on the
          // direct push until he is past 12 m again.
          if (rawD < 10) e._boundClose = true; else if (rawD > 12) e._boundClose = false;
          if (e.flankSide && !e._boundClose && rawD < ENGAGE_FAR && e.weapon !== 'sniper' && !(e._boundRest > 0)) {
            // Arrived at current bound cover? (within ~1.5m of its stand pos)
            let needNew = !e._boundCover;
            if (e._boundCover) {
              const sp = coverStandPos(e._boundCover, tgt.pos);
              const da = Math.hypot(sp.x - e.pos.x, sp.z - e.pos.z);
              if (da < 1.6) needNew = true;   // reached it → suppress, then re-pick
            }
            if (needNew) {
              // SUPPRESSING FIRE: from this spot, if we have a rough line to the
              // player's last-known position and ammo-pacing allows, throw a
              // short burst before the next bound. Gated by a cooldown so it's a
              // burst, not a stream.
              e._suppressCd = (e._suppressCd || 0) - dt;
              const lastSeen = e._lastSeenPos || tgt.pos;
              const sY2 = e.mesh.scaleY ?? 1.0;
              const supUp = (e._lastSeenPos && e._lastSeenHeadUp != null) ? e._lastSeenHeadUp : 1.0;   // v1.385 (B.20): his head over the wall
              const losSup = hasLineOfSight(
                e.pos.x, (e.pos.y||0)+1.05*sY2, e.pos.z,
                lastSeen.x, (lastSeen.y||0)+supUp, lastSeen.z,
                tgt.obstacles
              );
              if (losSup && e._suppressCd <= 0 && rawD < (ENGAGE_FAR + 8) && !kidLineHeldHere(e)) {   // v1.271
                const aimPt = new THREE.Vector3(lastSeen.x, (lastSeen.y||0)+supUp, lastSeen.z);
                aimPt.x += (gameRandom()-0.5)*1.2; aimPt.z += (gameRandom()-0.5)*1.2;
                // v1.74: bounding auto-gunners suppress with a short burst too.
                queueSuppressionBurst(e, aimPt, 1.2);
                tryNpcSpeak(e, 'taunt');
                e._suppressCd = 1.4 + gameRandom()*0.8;   // burst pacing
              }
              // Pick the next cover to bound to.
              const next = pickBoundCover(e, Game.scenario.cover, tgt.pos);
              if (next) { e._boundCover = next; }
              else { e._boundCover = null; }              // nothing good → direct push
            }
            if (e._boundCover) {
              usingBound = true;
              const sp = coverStandPos(e._boundCover, tgt.pos);
              const bdx = sp.x - e.pos.x, bdz = sp.z - e.pos.z;
              const bd = Math.hypot(bdx, bdz) || 1;
              const stepX = (bdx / bd) * speed * dt;
              const stepZ = (bdz / bd) * speed * dt;
              const kidRadius = 0.35;
              const nX = e.pos.x + stepX, nZ = e.pos.z + stepZ;
              const bAX = e.pos.x, bAZ = e.pos.z;
              if (!collidesObstacles(nX, nZ, kidRadius)) { e.pos.x = nX; e.pos.z = nZ; }
              else {
                if (!collidesObstacles(nX, e.pos.z, kidRadius)) e.pos.x = nX;
                if (!collidesObstacles(e.pos.x, nZ, kidRadius)) e.pos.z = nZ;
              }
              // If wedged en route to cover, drop the bound and let direct-push
              // wall-follow handle it next frame.
              // v1.99: and keep it dropped for 1.5 s. Next frame used to re-pick
              // the same cover and wedge again, so the direct push never ran:
              // Night Prowl's Seth stood on a tree in 'advancing' for 80+ s.
              if (Math.hypot(e.pos.x - bAX, e.pos.z - bAZ) < 0.02) {
                e._boundStuck = (e._boundStuck || 0) + dt;
                if (e._boundStuck > 0.6) { e._boundBanCover = e._boundCover; e._boundBanUntil = (Game.scenario.aiClock || 0) + 6; e._boundCover = null; e._boundStuck = 0; e._boundRest = 1.5; }
              } else e._boundStuck = 0;
              // v1.110: a slide along a bumper still moves a few cm a frame, so the check above never fired and the
              // lot's Priya crept 0.2 m/s along a car for 3–4 s in 'advancing'. Also drop the bound when a second
              // goes by without getting 0.3 m closer to the cover's stand spot.
              if (e._boundCover) {
                const bdNow = Math.hypot(sp.x - e.pos.x, sp.z - e.pos.z);
                if (e._boundFor !== e._boundCover || bdNow < e._boundBest - 0.3) { e._boundFor = e._boundCover; e._boundBest = bdNow; e._boundNoGain = 0; }
                else if ((e._boundNoGain = (e._boundNoGain || 0) + dt) > 1.0) { e._boundBanCover = e._boundCover; e._boundBanUntil = (Game.scenario.aiClock || 0) + 6; e._boundCover = null; e._boundFor = null; e._boundNoGain = 0; e._boundRest = 1.5; }
              }
            }
          } else {
            // Within knife range / center lane / sniper → clear bound state.
            e._boundCover = null;
          }

          // v1.154: a bound that keeps him within 1.5 m of where his progress window began does not end the window.
          // Bunratty free-for-all's Nick pushed a fence for 1.5 s, bounded 0.5 m back to a cover behind him, pushed
          // again, for 15-23 s by house 2's backyard; each bound restarted the window, so v1.121's 2.5 s pocket rule
          // never fired. A real bound moves him further than that and lets the window lapse as before.
          if (usingBound && e._advP0x != null && Math.hypot(e.pos.x - e._advP0x, e.pos.z - e._advP0z) < 1.5) e._advProgAt = Game.scenario.aiClock || 0;
          // --- direct push (center lanes, close range, or no bound cover) ---
          if (!usingBound) {
          // v1.67: SUPPRESSING FIRE ON THE MOVE. A marching kid throws the
          // occasional round toward the target's last-known spot even while out
          // of effective range and walking — it reads as "laying down fire as I
          // advance" instead of a silent sprint, and matches the bounding kids'
          // suppression. Gated by the same cooldown so it's sporadic, not a
          // stream, and requires a rough LOS to where the target was. Aggressive
          // kids suppress a touch more often. Works for player OR NPC targets
          // (uses the generic tgt/_lastSeenPos), so advancing kids harass an
          // enemy NPC they're closing on too, not just the player.
          {
            e._suppressCd = (e._suppressCd || 0) - dt;
            const lastSeen = e._lastSeenPos || (tgt && tgt.pos);
            if (lastSeen && e.weapon !== 'sniper') {
              const sYs = e.mesh.scaleY ?? 1.0;
              // v1.385 (B.20): a head seen over a wall is what he suppresses: the line and the aim go there, not to 1 m
              const supUp = (e._lastSeenPos && e._lastSeenHeadUp != null) ? e._lastSeenHeadUp : 1.0;
              const losSupM = hasLineOfSight(
                e.pos.x, (e.pos.y||0)+1.05*sYs, e.pos.z,
                lastSeen.x, (lastSeen.y||0)+supUp, lastSeen.z,
                tgt.obstacles
              );
              // March-suppression reaches a bit past the weapon's far band — the
              // point is morale/pressure, not accuracy. Wider miss spread than a
              // committed shot since they're moving and the target may have moved.
              if (losSupM && e._suppressCd <= 0 && rawD < (ENGAGE_FAR + 10) && !kidLineHeldHere(e)) {   // v1.271
                const aimPt = new THREE.Vector3(lastSeen.x, (lastSeen.y||0)+supUp, lastSeen.z);
                const spread = 1.6 + rawD * 0.02;   // looser the farther/faster they are
                aimPt.x += (gameRandom()-0.5)*spread;
                aimPt.z += (gameRandom()-0.5)*spread;
                // v1.74: auto guns spit a short burst here (not a lone round) so a
                // marching AK/AR peppers from range instead of reading as a pistol.
                queueSuppressionBurst(e, aimPt, 1.4);
                // Cooldown shrinks with aggression: brave kids suppress more.
                e._suppressCd = (1.8 - aggression * 0.7) + gameRandom()*0.7;
              }
            }
          }
          // v1.24a FLANK WAYPOINT (geometric fallback): offset perpendicular,
          // decaying to 0 by 9m so flankers still arc in when no cover is around.
          let tgtX = tgt.pos.x, tgtZ = tgt.pos.z;
          if (e.flankSide) {
            const perpX = -rawDz / rawD, perpZ = rawDx / rawD;
            const flankMag = Math.max(0, Math.min(10, (rawD - 9) * 0.9));
            tgtX = tgt.pos.x + perpX * e.flankSide * flankMag;
            tgtZ = tgt.pos.z + perpZ * e.flankSide * flankMag;
          }
          const dx = tgtX - e.pos.x;
          const dz = tgtZ - e.pos.z;
          const d = Math.sqrt(dx*dx + dz*dz);
          // v1.152: on a route out of a pocket (kidPocketRoute), walk the field toward the target instead of the
          // straight push below, for up to 5 s; the engagement check further down still stops him once he has a shot.
          let routed = false;
          if (e._advRoute) {
            const w = (Game.scenario.aiClock || 0) < e._advRoute.until ? kidFieldNext(e._advRoute.F, e.pos.x, e.pos.z) : null;
            if (!w) e._advRoute = null;
            else {
              routed = true;
              const wx = w.x - e.pos.x, wz = w.z - e.pos.z, wl = Math.hypot(wx, wz);
              const rx = e.pos.x, rz = e.pos.z;
              if (wl > 0.02) {
                const st = Math.min(wl, speed * dt), nx = e.pos.x + wx / wl * st, nz = e.pos.z + wz / wl * st;
                if (!collidesObstacles(nx, nz, 0.33)) { e.pos.x = nx; e.pos.z = nz; }
                else if (!collidesObstacles(nx, e.pos.z, 0.33)) e.pos.x = nx;
                else if (!collidesObstacles(e.pos.x, nz, 0.33)) e.pos.z = nz;
              }
              e._advP0x = null; e._advBackT = 0; e._advSideT = 0; e._advStuck = 0;
              if (Math.hypot(e.pos.x - rx, e.pos.z - rz) < 0.005) e._advRoute = null;   // a blocked step ends the route
            }
          }
          if (d > 0.1 && !routed) {
            // Slide along obstacles (try X and Z components separately).
            const stepX = (dx / d) * speed * dt;
            const stepZ = (dz / d) * speed * dt;
            const kidRadius = 0.35;
            const newX = e.pos.x + stepX;
            const newZ = e.pos.z + stepZ;
            const beforeAX = e.pos.x, beforeAZ = e.pos.z;
            // v1.103: the tagger's v1.100 sidestep commitment, ported. While
            // committed, skip the straight push: its slide pulled the kid back to
            // the spot he wedged on, and with the 0.5 s side flip he jittered
            // between two parked cars for 35 s (the market lot's row passages).
            const advCommitted = e._advSideT > 0;
            if (advCommitted) e._advSideT -= dt;
            if (e._advWedgeT > 0) e._advWedgeT -= dt; else e._advWedges = 0;
            if (e._advTurnT > 0) e._advTurnT -= dt; else e._advTurns = 0;
            // v1.121: a progress window. Each time he gets 0.5 m closer to where he is going it starts again;
            // it keeps the side axis it started with and how far either way along it he has been. Over 2.5 s
            // with no such gain while wall-following, he is in a pocket (also after 2 blocked turn-rounds).
            const clk = Game.scenario.aiClock || 0;
            // v1.134 fix-up: "closer" is his own walk toward the target, not the distance closing. Chasing a kid who
            // walked toward him, the window restarted every 0.5 m the other kid came, so the 2.5 s pocket rule never
            // fired and a back-out found its side clear at once (Northcliff Night: Diego shuttled 5–7 s inside the
            // west fort, whose closed wall faces the player).
            const advGain = e._advP0x == null ? Infinity : ((e.pos.x - e._advP0x) * dx + (e.pos.z - e._advP0z) * dz) / d;
            if (!(advGain > 0.5) && clk - (e._advProgAt ?? -1) < 0.1 && clk - e._advProg0 < 6) {
              const lat = e.pos.x * e._advPerpX + e.pos.z * e._advPerpZ;
              e._advLatLo = Math.min(e._advLatLo, lat); e._advLatHi = Math.max(e._advLatHi, lat);
            } else {
              e._advP0x = e.pos.x; e._advP0z = e.pos.z; e._advProg0 = clk; e._advWF = 0;
              e._advPerpX = -dz / d; e._advPerpZ = dx / d;
              e._advLatLo = e._advLatHi = e.pos.x * e._advPerpX + e.pos.z * e._advPerpZ;
            }
            e._advProgAt = clk;
            if (!(e._advBackT > 0) && clk - e._advProg0 > 2.5 && e._advWF > 0.3 && !kidPocketRoute(e, tgt)) e._advBackT = 1.5;
            if (e._advBackT > 0) {
              // v1.121: backing out of a pocket (see the turn-round count below). Walk away from the target
              // until a sidestep has room past both places he turned round (0.6 m beyond them, the whole way
              // there clear), then commit to that side long enough to get there. Ends after 1.5 s, or at once
              // if the way back is blocked too.
              e._advBackT -= dt;
              const bx = e.pos.x - stepX, bz = e.pos.z - stepZ;
              if (!collidesObstacles(bx, bz, kidRadius)) { e.pos.x = bx; e.pos.z = bz; }
              else if (!collidesObstacles(bx, e.pos.z, kidRadius)) e.pos.x = bx;
              else if (!collidesObstacles(e.pos.x, bz, kidRadius)) e.pos.z = bz;
              const bpx = e._advPerpX, bpz = e._advPerpZ, s0 = e._advSide || 1;
              const lat = e.pos.x * bpx + e.pos.z * bpz;
              let freeSide = 0, freeL = 0;
              for (const sd of [s0, -s0]) {
                const L = Math.max(0.6, sd > 0 ? (e._advLatHi ?? lat) + 0.6 - lat : lat - ((e._advLatLo ?? lat) - 0.6));
                let clear = true;
                for (let t = 0.25; clear && t < L + 0.25; t += 0.25) {
                  const tt = Math.min(t, L);
                  if (collidesObstacles(e.pos.x + bpx * sd * tt, e.pos.z + bpz * sd * tt, kidRadius + 0.1)) clear = false;
                }
                if (clear) { freeSide = sd; freeL = L; break; }
              }
              const backMoved = Math.hypot(e.pos.x - beforeAX, e.pos.z - beforeAZ);
              if (freeSide || backMoved < 0.005 || e._advBackT <= 0) {
                e._advBackT = 0;
                if (freeSide) e._advSide = freeSide;
                e._advSideT = freeSide ? freeL / Math.max(0.5, speed) + 0.1 : 0.35;
                e._advStuck = 0; e._advTurns = 0;
                e._advP0x = null;   // a fresh window after the way out
              }
            } else if (advCommitted) {
              // no straight step this frame
            } else if (!collidesObstacles(newX, newZ, kidRadius)) {
              e.pos.x = newX;
              e.pos.z = newZ;
            } else {
              if (!collidesObstacles(newX, e.pos.z, kidRadius)) {
                e.pos.x = newX;
              }
              if (!collidesObstacles(e.pos.x, newZ, kidRadius)) {
                e.pos.z = newZ;
              }
            }
            // v1.23a: wall-follow when wedged. If the straight push made no real
            // progress (corner / wall directly between kid and player), try a
            // perpendicular sidestep to slip around it — alternating sides if one
            // is blocked. This fixes the long-standing "wedged advancing kids"
            // stall (now hit constantly by respawn round-trips). Measures actual
            // displacement, not slide-assignment.
            const advMoved = Math.hypot(e.pos.x - beforeAX, e.pos.z - beforeAZ);
            if (advMoved < 0.02) {
              e._advWF += dt;   // v1.121: wall-following time in this progress window
              if (!advCommitted) e._advStuck = (e._advStuck || 0) + dt;
              // v1.73: if a FENCE is what's wedging us, commit to walking around
              // its nearer END rather than blindly alternating sides mid-span.
              // v1.161 fix-up: a detour that slides him without getting him nearer its waypoint is dropped for 1.5 s,
              // as the taggers' is (v1.125). On the club's 18th Marcus slid 3 cm a frame along a bench toward the
              // waypoint, into its corner, then the sidestep threw him back out: 4 s and more in 'advancing', and
              // he moved every frame, so neither v1.159's fall-through nor the pocket rule caught it.
              if (e._advDetBan > 0) e._advDetBan -= dt;
              const detour = (e._advDetBan > 0) ? null : fenceDetourWaypoint(e.pos.x, e.pos.z, tgtX, tgtZ, Game.player.obstacles, kidRadius);
              if (detour) {
                const dd = Math.hypot(detour.x - e.pos.x, detour.z - e.pos.z);
                if (e._advDetFor !== detour.x + ',' + detour.z || dd < e._advDetBest - 0.3) { e._advDetFor = detour.x + ',' + detour.z; e._advDetBest = dd; e._advDetT = 0; }
                else if ((e._advDetT = (e._advDetT || 0) + dt) > 0.8) { e._advDetBan = 1.5; e._advDetT = 0; e._advDetFor = null; }
              }
              // v1.159 fix-up: a detour step that goes nowhere falls through to the sidestep below. The waypoint is
              // the end of a fence further along his line, so a cart or a hedge beside him can block every step
              // toward it; the side flip lives in the sidestep, and he stood still in 'advancing' for 4-5 s (the
              // club's 18th: Trey against a golf cart, Sean at the end of a hedge).
              let detoured = false;
              if (detour) {
                const ddx = detour.x - e.pos.x, ddz = detour.z - e.pos.z;
                const dlen = Math.hypot(ddx, ddz) || 1;
                const fstep = speed * dt;
                const fx = e.pos.x + (ddx / dlen) * fstep;
                const fz = e.pos.z + (ddz / dlen) * fstep;
                if (!collidesObstacles(fx, fz, kidRadius)) { e.pos.x = fx; e.pos.z = fz; detoured = true; }
                else if (!collidesObstacles(fx, e.pos.z, kidRadius)) { e.pos.x = fx; detoured = true; }
                else if (!collidesObstacles(e.pos.x, fz, kidRadius)) { e.pos.z = fz; detoured = true; }
              }
              if (!detoured) {
              // perpendicular to the player direction
              let px = -dz / d, pz = dx / d;
              if (!e._advSide) e._advSide = (gameRandom() < 0.5 ? 1 : -1);
              // every ~0.5s of being stuck, flip the side we try
              if (e._advStuck > 0.5) { e._advSide *= -1; e._advStuck = 0; }
              px *= e._advSide; pz *= e._advSide;
              const sideStep = speed * dt;
              const sx = e.pos.x + px * sideStep, sz = e.pos.z + pz * sideStep;
              if (!collidesObstacles(sx, sz, kidRadius)) {
                e.pos.x = sx; e.pos.z = sz;
              } else if (!collidesObstacles(sx, e.pos.z, kidRadius)) {
                e.pos.x = sx;
              } else if (!collidesObstacles(e.pos.x, sz, kidRadius)) {
                e.pos.z = sz;
              }
              // v1.103: a committed sidestep that is itself blocked turns round now;
              // a fresh one commits 0.35 s, longer each time he wedges again within
              // 3 s (up to 1.4 s), as the taggers do since v1.100.
              if (advCommitted && Math.hypot(e.pos.x - beforeAX, e.pos.z - beforeAZ) < 0.01) {
                e._advSide *= -1; e._advSideT = 0;
                // v1.121: in a pocket (a wall ahead, both sides blocked) the committed sidestep turns round at
                // each side wall and the kid shuttles across it for good (Night Prowl's Seth between a sedan and
                // a post, v1.112). The second turn-round within 3 s backs him out instead.
                e._advTurns = (e._advTurns || 0) + 1; e._advTurnT = 3;
                if (e._advTurns >= 2) { e._advTurns = 0; if (!kidPocketRoute(e, tgt)) e._advBackT = 1.5; }
              }
              if (!advCommitted) {
                e._advWedges = Math.min(4, (e._advWedges || 0) + 1);
                e._advWedgeT = 3;
                e._advSideT = 0.35 * e._advWedges;
              }
              }
            } else {
              e._advStuck = 0;
            }
          }
          } // end direct-push

          // Periodic engagement check (6Hz)
          e.advanceCheckTimer = (e.advanceCheckTimer || 0) + dt;
          if (e.advanceCheckTimer >= 1/6) {
            e.advanceCheckTimer = 0;
            // v1.24a: terrain-relative; v1.385 (B.20): a head over a wall counts, so he stops and fires at it
            const losNow = aiSightY(e, tgt) != null;
            const newDist = Math.sqrt(
              (tgt.pos.x - e.pos.x) ** 2 +
              (tgt.pos.z - e.pos.z) ** 2
            );
            // v1.23: engage as soon as LOS + inside FAR range (was: full NEAR
            // range only, which made advancing kids sprint all the way into your
            // face before firing). Now they stop and open up from mid-range.
            // v1.25: a bounding flanker only commits to a static engage once it's
            // INSIDE near range OR it's reached good cover.
            // v1.28h: a SHORT-RANGE pusher (shotgun/SMG/pistol, non-defender)
            // won't commit until it's inside its PUSH distance — so it keeps
            // closing instead of stopping the moment it gets LOS at mid-range.
            // Rifles/snipers/defenders keep the LOS+FAR commit (hold & reach).
            const wantsToPush = (e.role !== 'defender') &&
              (e.weapon === 'shotgun' || e.weapon === 'mp5' || e.weapon === 'ump' ||
               e.weapon === 'mac10' || e.weapon === 'pistol' || !e.weapon);
            const pushSatisfied = !wantsToPush || newDist <= ENGAGE_PUSH;
            // v1.129 fix-up: moved on by held pulls (v1.122), he doesn't commit again until 1.5 m from the spot
            // (or 4 s on). His eye line to the player is clear there but the muzzle's first 3 m are not, so
            // he stopped at once and held again (Rebecca at her fort wall: 25 held a round, tests/hollow-held).
            if (e._holdSpot) {
              if ((Game.scenario.roundTime || 0) > e._holdSpot.until || Math.hypot(e.pos.x - e._holdSpot.x, e.pos.z - e._holdSpot.z) > 1.5) e._holdSpot = null;
            }
            const commitEngage = losNow && newDist < ENGAGE_FAR && pushSatisfied && !e._holdSpot &&
              (!usingBound || newDist < ENGAGE_NEAR);
            if (commitEngage) {
              e.homeCover = e._boundCover || null;   // hold at the cover we bounded to
              e._boundCover = null;
              e.state = 'hiding';
              e.stateTime = 0;
              // Short wind-up — they just arrived, brief moment before peek.
              e.nextStateChange = 0.2 + gameRandom() * 0.2;
            }
          }
        }
        break;

      case 'peeking':
        // v1.14b: Pop up from the crouch to fire. We STAND the kid (crouch 0) so
        // their muzzle (~1.05m) clears waist/chest-high cover naturally — no more
        // levitating the whole body to clear tall cover (that caused the
        // "floating kid" bug). For very tall cover (cars) they're conceptually
        // leaning out the side; standing reads far better than floating.
        setKidCrouch(e.mesh, 0);
        e.mesh.group.position.y = 0;
        if (e.stateTime > e.nextStateChange) {
          // Decide whether to escalate to shooting based on range.
          // v1.23: covering fire — marginal-range commit raised 0.4 → 0.8 so kids
          // actually contest mid-range ground instead of peeking idly. A recently
          // spotted kid commits even without a current clean line (suppressing the
          // spot the player ducked into). Long range still peek-only EXCEPT snipers,
          // whose FAR is effectively the whole map.
          // v1.23: don't fire into a wall. Require either a current line OR a
          // recent sighting (covering fire at the last-known spot). Without
          // either, fall back to a peek-and-duck even at close range.
          let willShoot;
          if (!e._hasLOSNow && !e._recentlySpotted) {
            willShoot = false;
          } else if (inFullRange) {
            willShoot = true;
          } else if (inMarginalRange) {
            willShoot = (e._recentlySpotted ? true : gameRandom() < 0.8);
          } else {
            willShoot = false; // beyond FAR range — peek/duck only
          }
          if (willShoot) {
            e.state = 'shooting';
            e.stateTime = 0;
            e.nextStateChange = 0.2;
          } else {
            // Go back to hiding without firing. Treat this as a "peek-and-hide" beat.
            e.state = 'hiding';
            e.stateTime = 0;
            e.nextStateChange = 0.6 + gameRandom() * 0.6;
          }
        }
        break;

      case 'shooting':
        {
          // v1.14b: stand to shoot (same as peeking) — no float lift.
          setKidCrouch(e.mesh, 0);
          e.mesh.group.position.y = 0;
        }
        // v1.101: during the opening hold a kid stays up and aimed rather than
        // spending the shot (and its recovery) on a round that never leaves.
        if (e.stateTime > e.nextStateChange && !inOpeningHold()) {
          // Aim point: lerp from upper chest (0.65) to head (0.95) by headshotBias.
          // Previously chest-low (0.55) which combined with low muzzle made BBs land at
          // ankles; with the muzzle raised to shoulder height (in spawnEnemyBB), aiming
          // at upper chest also gives a flatter line of sight.
          // Add drop compensation: BBs lose ~0.1m per 10m past the first 5m, so add
          // a tiny upward bias at longer ranges.
          // v1.23: if the kid has NO current line but was recently spotted, fire at
          // the LAST-KNOWN position (suppressing the cover the player ducked behind)
          // instead of magically tracking through walls. With a clean line, aim live.
          let aimBase;
          if (e._hasLOSNow || !e._lastSeenPos) {
            aimBase = tgt.pos.clone();
          } else {
            aimBase = new THREE.Vector3(e._lastSeenPos.x, e._lastSeenPos.y, e._lastSeenPos.z);
          }
          const targetPos = aimBase;
          const headshotBias = ch.headshotBias ?? 0.1;
          const aimFrac = 0.65 + headshotBias * 0.30;
          const dropComp = Math.max(0, (distToPlayer - 5) * 0.012); // m of extra aim-up
          targetPos.y += tgt.height * aimFrac + dropComp;
          // v1.385 (B.20): only his head shows over the wall: aim at it (the live head, or where it last was)
          if (e._hasLOSNow && e._sightHead) targetPos.y = tgt.headY + dropComp;
          else if (!e._hasLOSNow && e._lastSeenPos && e._lastSeenHeadUp != null) targetPos.y = e._lastSeenPos.y + e._lastSeenHeadUp + dropComp;
          const holdsBefore = e._lineHolds || 0;   // v1.367: did this pull fire, or hold at a blocked line?
          spawnEnemyBB(e, targetPos);
          const pullHeld = (e._lineHolds || 0) > holdsBefore;
          // v1.20: AUTO-WEAPON BURST. If the kid is carrying an auto gun, queue
          // 4-7 follow-up BBs at the gun's cyclic rate. The AI proceeds to the
          // normal 'hiding' state immediately — the burst fires from
          // pendingBurst[] in the per-frame tick (below the AI state machine).
          // This keeps the AI cycle (1.2-2.7s recovery) intact so autos don't
          // dominate fights — they just shoot a STRING per trigger pull.
          {
            const eSpec = GUN_SPECS[e.weapon] || GUN_SPECS.pistol;
            if (eSpec.fireMode === 'auto') {
              const cycle = 60 / Math.max(1, eSpec.cyclicRPM);
              const burstLen = 4 + Math.floor(gameRandom() * 4); // 4..7 follow-ups
              // v1.129 fix-up: firing at the last-known spot (no line), the follow-ups go there too. They
              // re-aimed at the live target behind the wall, so every burst after the first BB was held
              // (Sean in the Hollow 3v3: 20–27 held a round from one spot, tests/hollow-held).
              const burstAim = (e._hasLOSNow || !e._lastSeenPos) ? null : targetPos.clone();
              for (let k = 1; k <= burstLen; k++) {
                e.pendingBurst.push(burstAim ? { dueIn: k * cycle, aim: burstAim, spread: 0.04 } : { dueIn: k * cycle });
              }
            }
          }
          e.state = 'hiding';
          e.stateTime = 0;
          // v1.21: shooting recovery shortened so engagements aren't gappy.
          // Baseline 0.7..1.6s → at fireRate=1.5 becomes 0.47..1.07s; at 0.8 → 0.88..2.0s.
          // v1.36e: when the kid has RECENTLY SEEN the player (actively engaged),
          // cut the recovery hard (×0.45) so a kid who's locked onto you keeps
          // shooting at a real rhythm instead of long lulls — even firing at the
          // cover you ducked behind. Disengaged kids keep the relaxed cadence.
          let recovery = (0.7 + gameRandom() * 0.9) / fireRate;
          if (e._recentlySpotted) recovery *= 0.45;
          // v1.46: BOLT-ACTION SNIPER cadence. The shared recovery (even before
          // the recently-spotted ×0.45) lets a sniper fire ~0.7-1.6s apart, which
          // reads as a semi-auto and is brutally punishing from a kid who never
          // misses. A bolt gun has to be re-cocked between every shot — so for
          // snipers we IGNORE the cuts above and impose a flat 2-3s cycle. This
          // is the only weapon with a hard floor; everything else keeps the
          // aggression/fireRate-driven cadence.
          // v1.367 (Found in play, critic v1.353): but only after a shot. A held pull fires nothing, so there is no bolt to
          // work: Devon in Hold the South Fort stood 6.5-7.5 s at the blast wall's end and in its gap, three held pulls
          // 2-3 s apart before the move-on after three (v1.122) took him on.
          if (e.weapon === 'sniper' && !pullHeld) {
            recovery = 2.0 + gameRandom() * 1.0;   // 2.0–3.0s between shots
          }
          e.nextStateChange = recovery;

          // Reposition chance — aggression scales it directly. Base 0.30 at agg=0, up to 0.75 at agg=1.
          // v1.21: baseline raised 0.20 → 0.30 (kids move more between shots — less staring).
          // v1.9: snipers heavily prefer to hold position (they have the range to not need to push).
          // Defenders also reposition less (they have an assigned zone to hold).
          let repositionChance = 0.30 + aggression * 0.45;
          if (e.weapon === 'sniper') repositionChance *= 0.3;
          if (e.role === 'defender') repositionChance *= 0.5;
          // v1.74: a ranged auto (AK/AR) firing from beyond its PUSH should keep
          // MOVING UP between bursts rather than rooting at the back of its range.
          // Lift the chance hard so most recovery beats end in a forward hop. (The
          // direction is already biased to closest cover via rangedAutoClosing.)
          // Once inside PUSH this flag is false and it reverts to normal cadence.
          const rangedAutoClosingNow = (e.weapon === 'ak47' || e.weapon === 'ar')
            && e.role !== 'defender' && distToPlayer > ENGAGE_PUSH;
          if (rangedAutoClosingNow) repositionChance = Math.max(repositionChance, 0.8);
          // v1.122: three pulls in a row held at a blocked line (tests/cover-fire's Hollow 3v3: one kid in a
          // fort corner, the muzzle line into the wall each time, 43–62 held pulls a minute) and he moves.
          let movedByHolds = false;
          if (e._underFire && e._underFire.kind !== 'push') repositionChance = 0;   // v1.387 (D.81): he keeps his cover
          // v1.392 (D.51): not while he camps: behind a lot car every cover in reach was nearer you, and the escape walked a
          // timid kid up the aisle into an M249; the holds keep, and he moves once the episode is over (3 quiet seconds)
          if ((e._lineHolds || 0) >= 3 && !(e._underFire && e._underFire.kind === 'camp')) { repositionChance = 1; e._lineHolds = 0; movedByHolds = true; }
          if (gameRandom() < repositionChance) {
            // Only consider cover within reposition range of current position.
            // v1.9: defenders are zone-locked — candidate cover must be within
            // ~5m of their anchorPos, not their current position. This stops them
            // from wandering off-objective.
            // Snipers, if they do reposition, take smaller steps.
            let maxRepositionDist = 6 + aggression * 6; // 6m..12m
            if (e.weapon === 'shotgun') maxRepositionDist = 4 + aggression * 6;  // 4..10m, more aggressive close
            // v1.74: ranged autos closing from a long standoff take bigger forward
            // hops so they actually close the 50m gap instead of inching. Scales
            // with how far out they still are.
            if (rangedAutoClosingNow) maxRepositionDist = Math.max(maxRepositionDist, Math.min(22, 10 + (distToPlayer - ENGAGE_PUSH) * 0.4));
            if (e.weapon === 'sniper')  maxRepositionDist = 3 + aggression * 3;  // 3..6m, small lateral moves
            if (e.role === 'defender')  maxRepositionDist = Math.min(maxRepositionDist, 5); // never abandon zone
            let candidates = Game.scenario.cover.filter(c => {
              if (e.coverMemory.includes(c) || c === e.homeCover || vipHoldsCover(e, c)) return false;   // v1.282: not a VIP's
              const cx = (c.minX + c.maxX) / 2;
              const cz = (c.minZ + c.maxZ) / 2;
              // For defenders, distance is measured from anchor, not current pos
              const distRef = e.role === 'defender' ? e.anchorPos : e.pos;
              const distFromRef = Math.sqrt((cx - distRef.x)**2 + (cz - distRef.z)**2);
              return distFromRef <= maxRepositionDist;
            });
            // v1.122: only cover he can walk straight to. A kid inside a Hollow fort picked cover beyond its back
            // wall, wedged in the corner on the way, and held fire there at the wall for the rest of the round
            // (tests/cover-fire: up to 62 held pulls a minute).
            candidates = candidates.filter(c => { const sp = coverStandPos(c, tgt.pos, 0.35); return kidWalkClear(e, sp.x, sp.z); });
            // v1.293 (critic, 21 Oct, Found in play): in Protect Ryan, Owen repositioned to the cover Mitchell held and stood
            // inside him (both work out the same spot from the same cover), centres 0.01-0.17 m apart for 27-56 s of a 90 s
            // round in 4 of 8 rounds. Cover a living teammate already holds is left out while any other is in reach.
            { const free = candidates.filter(c => !teammateHoldsCover(e, c)); if (free.length) candidates = free; }
            // v1.67: DEFEND anti-crowding. Prefer candidates that aren't already
            // occupied by a teammate, so the squad fans out across different cover
            // instead of stacking. Only narrow to the un-crowded subset if it's
            // non-empty — on a tight map we'd rather double up than freeze.
            if (Game.scenario.scenarioType === 'defend' && candidates.length > 1) {
              const uncrowded = candidates.filter(c => {
                const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
                return teammateCrowding(e, cx, cz, 5) < 0.25;   // ~<4m of a mate
              });
              if (uncrowded.length > 0) candidates = uncrowded;
            }
            if (candidates.length > 0) {
              // v1.10: aggression drives reposition direction
              //   • agg ≥ 0.7: pick the candidate closest to player (push)
              //   • agg ≤ 0.3: pick the candidate furthest from player (kite)
              //   • else: weighted random — aggressive kids more likely to pick close
              //           cover, timid ones more likely to pick far cover
              // Defenders skip directional bias (they're shuffling laterally in their
              // zone — closest-to-player would push them out of their zone).
              // v1.74: a RANGED AUTO (AK/AR) that's still beyond its PUSH closes
              // between bursts — it reads as "pepper from range, then move up." We
              // treat it as push-direction (closest cover) regardless of its mid
              // aggression, but only while it's farther than it ultimately wants to
              // be (distToPlayer > ENGAGE_PUSH). Inside PUSH it falls back to its
              // normal aggression-driven shuffle so it doesn't over-crowd.
              const rangedAutoClosing = isRangedAuto && e.role !== 'defender' && distToPlayer > ENGAGE_PUSH;
              let newCover;
              if (e.role === 'defender') {
                newCover = candidates[Math.floor(gameRandom() * candidates.length)];
              } else if (aggression >= 0.7 || rangedAutoClosing) {
                // Aggressive: closest to player wins
                let bestDist = Infinity;
                for (const c of candidates) {
                  const cx = (c.minX + c.maxX) / 2;
                  const cz = (c.minZ + c.maxZ) / 2;
                  const d = Math.sqrt((cx - tgt.pos.x)**2 + (cz - tgt.pos.z)**2);
                  if (d < bestDist) { bestDist = d; newCover = c; }
                }
              } else if (aggression <= 0.3) {
                // Timid: furthest from player wins (kiting behavior)
                let bestDist = -Infinity;
                for (const c of candidates) {
                  const cx = (c.minX + c.maxX) / 2;
                  const cz = (c.minZ + c.maxZ) / 2;
                  const d = Math.sqrt((cx - tgt.pos.x)**2 + (cz - tgt.pos.z)**2);
                  if (d > bestDist) { bestDist = d; newCover = c; }
                }
              } else {
                // Middle range: weighted random. Score each by aggression-weighted
                // distance preference, then sample. (Simple inverse weighting.)
                const scored = candidates.map(c => {
                  const cx = (c.minX + c.maxX) / 2;
                  const cz = (c.minZ + c.maxZ) / 2;
                  const d = Math.sqrt((cx - tgt.pos.x)**2 + (cz - tgt.pos.z)**2);
                  // Higher aggression → prefer closer (lower d → higher weight)
                  // Below 0.5 → prefer farther
                  const pref = aggression >= 0.5 ? (1 / (d + 1)) : d;
                  return { c, pref };
                });
                const total = scored.reduce((s, x) => s + x.pref, 0);
                let r = gameRandom() * total;
                for (const { c, pref } of scored) {
                  r -= pref;
                  if (r <= 0) { newCover = c; break; }
                }
                if (!newCover) newCover = scored[scored.length - 1].c;
              }
              e.state = 'repositioning';
              e.stateTime = 0;
              // v1.12: use the cover-stand-pos helper to compute a target
              // OUTSIDE the cover's AABB (on the away-from-player side).
              // The old +0.5m offset from cover center put the kid inside
              // big covers like cars and made them phase / stand on top.
              e.targetPos = coverStandPos(newCover, tgt.pos, 0.35);
              e.homeCover = newCover;
              e.coverMemory.push(newCover);
              if (e.coverMemory.length > 2) e.coverMemory.shift();
            } else if (movedByHolds) {
              // v1.122 fix-up: no cover he can walk straight to (a kid inside a Hollow fort: every
              // cover lies past a wall) and his line keeps hitting a wall. Push toward the target
              // instead; the advancing wall-follow walks him out, and he engages once he has a line.
              // Without this he stayed and pulled into the wall 28–39 times a round (tests/hollow-held).
              e.state = 'advancing';
              e.stateTime = 0;
              // v1.129 fix-up: and he engages again only once he's off that spot (below).
              e._holdSpot = { x: e.pos.x, z: e.pos.z, until: (Game.scenario.roundTime || 0) + 4 };
            }
          }
        }
        break;

      case 'repositioning':
        // Move toward targetPos — per-character moveSpeed multiplier
        e.mesh.group.position.y = 0;
        setKidCrouch(e.mesh, 0); // v1.14b: stand while relocating
        if (e.targetPos) {
          const dx = e.targetPos.x - e.pos.x;
          const dz = e.targetPos.z - e.pos.z;
          const d = Math.sqrt(dx*dx + dz*dz);
          if (d < 0.2) {
            e.state = 'hiding';
            e.stateTime = 0;
            e.nextStateChange = 0.5 + gameRandom() * 0.8;
            e.targetPos = null;
          } else {
            // v1.70: COLLISION-SLIDE (was a raw straight-line move that phased the
            // kid through obstacles — including the cover it was relocating to).
            // Mirror the deploying/advancing movers: try the diagonal step, else
            // slide on X-only then Z-only, with a short anti-wedge bail.
            const baseSpeed = 2.5;
            const speed = baseSpeed * (ch.moveSpeed ?? 1.0);
            const kidRadius = 0.35;
            const stepX = (dx / d) * speed * dt;
            const stepZ = (dz / d) * speed * dt;
            const nX = e.pos.x + stepX, nZ = e.pos.z + stepZ;
            const bX = e.pos.x, bZ = e.pos.z;
            if (!collidesObstacles(nX, nZ, kidRadius)) {
              e.pos.x = nX; e.pos.z = nZ;
            } else {
              if (!collidesObstacles(nX, e.pos.z, kidRadius)) e.pos.x = nX;
              if (!collidesObstacles(e.pos.x, nZ, kidRadius)) e.pos.z = nZ;
            }
            // Anti-wedge: if the slide made no real progress for ~0.6s (e.g. the
            // target spot is tucked against geometry it can't quite reach), accept
            // the current spot and settle — better than vibrating against a wall.
            const moved = Math.hypot(e.pos.x - bX, e.pos.z - bZ);
            e._repoStuck = (moved > 0.02) ? 0 : (e._repoStuck || 0) + dt;
            if (e._repoStuck > 0.6) {
              e._repoStuck = 0;
              e.state = 'hiding';
              e.stateTime = 0;
              e.nextStateChange = 0.4 + gameRandom() * 0.6;
              e.targetPos = null;
            }
            e.mesh.group.position.x = e.pos.x;
            e.mesh.group.position.z = e.pos.z;
          }
        } else {
          e.state = 'hiding';
        }
        break;

      case 'retreating': {
        // v1.23: defend-scenario respawn. The kid was tagged and is jogging back
        // to its spawn point; on arrival it re-enters 'deploying' (jogs back out
        // to its fighting anchor) — so shooting an attacker is a temporary
        // disable, not a kill. They face away from the player while running back.
        e.mesh.group.position.y = 0;
        setKidCrouch(e.mesh, 0);
        const back = e._respawnPos || e._spawnPos || e._deployAnchor || e.pos;   // v1.319: _respawnPos, see enemyRespawnCluster
        const dxb = back.x - e.pos.x, dzb = back.z - e.pos.z;
        const db = Math.sqrt(dxb*dxb + dzb*dzb);
        // Face the direction of travel (toward spawn) instead of the player.
        kidTurnToward(e, Math.atan2(dxb, dzb), dt);   // v1.183: eased
        e.mesh.group.rotation.y = e.yaw;
        if (db < 1.2) {
          // v1.176 fix-up: out for a second at least. Tagged at his own spawn, a kid "arrived" the next frame, was a
          // target again, and the rest of the same burst tagged him again: Bunratty VIP's Owen, in the bulb fort,
          // lost 4 lives in 0.4 s to one of Sean's bursts over its low wall, and looped there 10-30 s.
          if (e.stateTime < 1.0) break;
          // v1.280 (D.47): in capture the flag he waits at his base, still out, before he plays again
          if (Game.scenario.ctf) {
            e._ctfHoldT = (e._ctfHoldT || 0) + dt;
            if (e._ctfHoldT < CTF_HOLD_SEC) { e._retreatStuck = 0; break; }
            e._ctfHoldT = 0;
          }
          // Reached spawn → redeploy. Reset health and jog back out to the anchor.
          e.health = e.maxHealth;
          e.coverMemory = [];
          e.homeCover = null;
          e.deployTarget = (e._deployAnchor || e.anchorPos).clone();
          e.deployDelay = (e._baseDeployDelay ?? 0.4) * 0.5 + gameRandom() * 0.3; // quicker than first deploy
          e.state = 'deploying';
          e.stateTime = 0;
          e._deployStuck = 0; // fresh deploy — clear any stale wedge counter
          e._graceT = comesBackMatch() ? VIP_GRACE : 0;   // v1.291 (D.49)
          break;
        }
        // Retreat jog — a touch quicker than a normal advance (they're bailing).
        const retreatSpeed = 3.2 * (ch.moveSpeed ?? 1.0);
        const stepX = (dxb / db) * retreatSpeed * dt;
        const stepZ = (dzb / db) * retreatSpeed * dt;
        const kidRadius = 0.35;
        const nX = e.pos.x + stepX, nZ = e.pos.z + stepZ;
        if (!collidesObstacles(nX, nZ, kidRadius)) {
          e.pos.x = nX; e.pos.z = nZ;
        } else {
          if (!collidesObstacles(nX, e.pos.z, kidRadius)) e.pos.x = nX;
          if (!collidesObstacles(e.pos.x, nZ, kidRadius)) e.pos.z = nZ;
        }
        // v1.23a: anti-wedge watchdog. A retreating kid is conceptually OUT
        // (off the field, invisible to the player who's at the bulb), so if it
        // can't make real progress back to spawn for ~1.2s, just teleport it home
        // and redeploy. This kills the "frozen after respawn" freeze — a wedged
        // retreat used to stall forever with no bail. We measure ACTUAL
        // displacement (not whether a slide-assignment ran), since sliding
        // straight into a wall produces a near-zero step that still "succeeds".
        // v1.164 (backlog B.5): measured as ground gained toward spawn, not movement. Northcliff's ally Andrew crept
        // 3-5 cm along a wall about once a second; each creep reset the old "moved over 2 cm this frame" test, and he
        // held 'retreating' in one spot for 11-17 s. Now 1.2 s without getting 0.3 m nearer home sends him home.
        const dNow = Math.hypot(back.x - e.pos.x, back.z - e.pos.z);
        if (e._retreatBest == null || dNow < e._retreatBest - 0.3) { e._retreatBest = dNow; e._retreatStuck = 0; }
        else e._retreatStuck = (e._retreatStuck || 0) + dt;
        if (e._retreatStuck > 1.2) {
          e.pos.x = back.x; e.pos.z = back.z;
          e._retreatStuck = 0; e._retreatBest = null;
          // fall through to the db<1.2 arrival next frame → redeploy
        }
        e.mesh.group.position.x = e.pos.x;
        e.mesh.group.position.z = e.pos.z;
        break;
      }
    }

    // v1.183 (D.16 B): ease into a start. This frame's step (what the state just moved him) is scaled back along its
    // own line by the start ramp; a teleport (anti-wedge, respawn) or a perch is left alone. Brief stalls against a wall
    // (under 0.12 s) don't reset it, so a kid sliding along cover keeps his pace.
    if (e._stepFromX != null && !e.perch) {
      const sx = e.pos.x - e._stepFromX, sz = e.pos.z - e._stepFromZ, sd = Math.hypot(sx, sz);
      if (e._moveRamp == null) e._moveRamp = 1;
      if (sd > 1e-4 && sd <= Math.max(0.3, dt * 15)) {
        const r = e._moveRamp;
        if (r < 1) { e.pos.x = e._stepFromX + sx * r; e.pos.z = e._stepFromZ + sz * r; }
        e._moveRamp = Math.min(1, r + dt * (1 - KID_START_MIN) / KID_START_SEC);
        e._stillT = 0;
      } else if (sd <= 1e-4) {
        e._stillT = (e._stillT || 0) + dt;
        if (e._stillT > 0.12) e._moveRamp = KID_START_MIN;
      }
    }

    // Apply mesh position (in case not in repositioning/advancing — those states
    // write their own positions per-frame)
    if (e.state !== 'repositioning' && e.state !== 'advancing') {
      e.mesh.group.position.x = e.pos.x;
      e.mesh.group.position.z = e.pos.z;
    } else if (e.state === 'advancing') {
      // Advancing kids still need their mesh updated (they're walking)
      e.mesh.group.position.x = e.pos.x;
      e.mesh.group.position.z = e.pos.z;
    }

    // v1.8: plant the kid's feet on the terrain. All living-state logic above
    // sets group.position.y to 0 (standing); we override that single value with
    // the terrain height here so feet, muzzle origin (spawnEnemyBB reads
    // e.pos.y), and hit detection (checkEnemyHit reads group.position.y as the
    // hitbox base) all sit at the correct ground level on the slope.
    {
      // v1.138: a kid holding a perch stays on it: whatever the states above asked, his feet are kept on the floor
      if (e.perch) {
        e.pos.x = Math.max(e.perch.minX, Math.min(e.perch.maxX, e.pos.x));
        e.pos.z = Math.max(e.perch.minZ, Math.min(e.perch.maxZ, e.pos.z));
      }
      const gY = kidGroundY(e);
      e.pos.y = gY;
      e.mesh.group.position.y = gY;
    }

    // v1.78: UNIFIED POSE PASS — handedness-correct gun hold + subtle walk anim
    // + over-cover lift, composed after the terrain plant (so the gunGroup world
    // matrix is current for the laser block that follows). Order matters:
    //   1) the state machine above already set crouch (0/1) which reset limbs to
    //      base ∓ hipDrop;
    //   2) setKidGunHold layers the one/two-handed hold (gun on the right, off-
    //      hand across for large guns / on aim for small guns), reading the post-
    //      crouch Y so a crouched kid still holds correctly;
    //   3) setKidWalk adds a gentle leg + off-arm swing scaled by how much the kid
    //      actually moved this frame.
    // Skipped entirely for down/zombie kids (handled in their own branches above).
    {
      // Idempotent base reset: re-apply the current crouch so every limb is at a
      // clean base ∓ hipDrop before we layer the hold + walk. This makes the pose
      // pass self-contained — even if a state branch forgot to call setKidCrouch
      // this frame, the hold/walk can't accumulate drift.
      if (e.mesh.pose) setKidCrouch(e.mesh, e.mesh.pose.crouch || 0);

      // Aim ramp: hold toward 'aim' while the kid is actively engaging. A short
      // _aimHold timer (re-armed each time it fires, see spawnEnemyBB) keeps the
      // shouldered hold across a burst and eases out after the last round.
      const engaging = (e.state === 'shooting' || e.state === 'peeking');
      if (engaging) e._aimHold = Math.max(e._aimHold || 0, 0.25);
      if (e._aimHold > 0) e._aimHold = Math.max(0, e._aimHold - dt);
      // Smooth the aim amount so rest↔aim eases rather than snaps.
      const aimTarget = (engaging || e._aimHold > 0) ? 1 : 0;
      e._aimAmt = (e._aimAmt == null) ? aimTarget
        : e._aimAmt + (aimTarget - e._aimAmt) * Math.min(1, dt * 8);

      // Over-cover lift: decays like before; folds into the hold as extra muzzle
      // height instead of a separate competing pose.
      let lift = 0;
      if (e._firingOverCover > 0) {
        e._firingOverCover = Math.max(0, e._firingOverCover - dt);
        lift = 0.34 * Math.min(1, e._firingOverCover / 0.45);
      }

      // Movement intensity from this frame's actual displacement (footstep code
      // above computed `moved` = metres this frame). Normalize to a typical step
      // and ease so stops settle. Stationary firing kids get ~0 → still stance.
      const moveThisFrame = (typeof moved === 'number') ? moved : 0;
      const speedNorm = Math.min(1, (moveThisFrame / Math.max(dt, 1e-3)) / 3.0); // ~3 m/s = full
      e._walkInt = (e._walkInt == null) ? speedNorm
        : e._walkInt + (speedNorm - e._walkInt) * Math.min(1, dt * 6);
      // v1.171 (D.16 A): the gait reads his velocity in his own frame (eased, so a collision's one-frame jolt doesn't
      // kick a leg), and the phase runs at the cadence for that speed. It stops when he does (a stopped kid freezes
      // mid-stance and the stride shrinks to nothing as the eased speed falls).
      {
        const yaw = e.mesh.group.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
        const vx = e._animVX || 0, vz = e._animVZ || 0;
        const vfNow = vx * sy + vz * cy, vsNow = vx * cy - vz * sy;   // forward (+z local), to his left (+x local)
        const ease = Math.min(1, dt * 8);
        const vf0 = e._gaitVF || 0, vs0 = e._gaitVS || 0;
        e._gaitVF = vf0 + (vfNow - vf0) * ease;
        e._gaitVS = vs0 + (vsNow - vs0) * ease;
        // v1.183 (D.16 B): he leans into a start (forward), back against a stop, and into a turn (toward its inside:
        // his sideways change of speed plus his forward speed times his turn rate). Eased; about 6 degrees at most.
        const yawRate = (e._leanYaw == null) ? 0 : Math.atan2(Math.sin(yaw - e._leanYaw), Math.cos(yaw - e._leanYaw)) / Math.max(dt, 1e-3);
        e._leanYaw = yaw;
        const aF = (e._gaitVF - vf0) / Math.max(dt, 1e-3);
        const aS = (e._gaitVS - vs0) / Math.max(dt, 1e-3) + e._gaitVF * yawRate;
        const pitchT = Math.max(-0.1, Math.min(0.1, aF * 0.012));
        const rollT = Math.max(-0.08, Math.min(0.08, -aS * 0.01));
        const le = Math.min(1, dt * 10);
        e._leanX = (e._leanX || 0) + (pitchT - (e._leanX || 0)) * le;
        e._leanZ = (e._leanZ || 0) + (rollT - (e._leanZ || 0)) * le;
        e.mesh.group.rotation.x = e._leanX;
        e.mesh.group.rotation.z = e._leanZ;
      }
      const gaitV = Math.hypot(e._gaitVF, e._gaitVS);
      const gaitReach = (e.mesh.scaleXZ || 1) * (e.mesh.pose ? e.mesh.pose.legL.scale.y / (e.mesh.pose.base.legScaleY || 1) : 1);
      if (gaitV > 0.05) e._walkPhase = (e._walkPhase || 0) + 2 * Math.PI * kidGaitCadence(gaitV, gaitReach) * dt;

      // v1.167: the hold runs at every crouch. It used to skip a full crouch (> 0.98), so every kid hiding
      // behind cover let go of his gun: it floated by his right knee, 21-39 cm from the hand (backlog B.6).
      setKidGunHold(e.mesh, e.weapon, e._aimAmt, lift);
      setKidWalk(e.mesh, e._walkPhase || 0, e._walkInt, e._gaitVF, e._gaitVS);
    }

    // v1.36i: clip this kid's laser beam (if any) to the first obstacle it hits,
    // so the dot lands on real geometry instead of a phantom fixed-distance wall.
    // v1.36j: also AIM it at the kid's target (chest height) first, so it
    // converges on what the kid is shooting at and reliably strikes cover the
    // kid is fighting around — instead of running parallel down the gun's own
    // offset axis and slipping past trunks (the "penetrates everything" bug).
    // Done here after the terrain plant so the gunGroup world matrix is current.
    if (e.mesh && e.mesh._hasLaser) {
      LASER_DIAG.ran++;
      let aimPt = null;
      const _lt = (typeof tgt !== 'undefined' && tgt) ? tgt : null;
      if (_lt && _lt.pos) {
        // v1.84: aim at the target's ACTUAL CHEST in world space. For an enemy kid,
        // read its torso mesh world position directly (no pos.y / terrain math to go
        // stale). For the player (no body mesh), use the live eye/camera world
        // position dropped to chest. This is the "just point at the chest mesh" fix.
        aimPt = new THREE.Vector3();
        if (!_lt.isPlayer && _lt.ref && _lt.ref.mesh && _lt.ref.mesh.parts && _lt.ref.mesh.parts.torso) {
          _lt.ref.mesh.parts.torso.getWorldPosition(aimPt);
        } else if (_lt.isPlayer && Game.camera) {
          Game.camera.getWorldPosition(aimPt);
          aimPt.y -= 0.35;   // eye → chest
        } else {
          const _ty = (typeof _lt.chestY === 'number') ? _lt.chestY
                    : ((_lt.pos.y != null ? _lt.pos.y : 0) + 0.98);
          aimPt.set(_lt.pos.x, _ty, _lt.pos.z);
        }
        LASER_DIAG.aimTargetIsPlayer = !!_lt.isPlayer;
        LASER_DIAG.aimY = +aimPt.y.toFixed(2);
        LASER_DIAG.tgtFeetY = +(_lt.pos.y != null ? _lt.pos.y : 0).toFixed(2);
        LASER_DIAG.shooterFeetY = +(e.pos.y || 0).toFixed(2);
      }
      LASER_DIAG.hadAim = !!aimPt;
      updateKidLaser(e, (Game.player && Game.player.obstacles) || null, aimPt);
    }

    // Hit flash tint
    if (e.hitFlash > 0) {
      const flashAmt = e.hitFlash / 0.6;
      e.mesh.parts.torso.material.emissive = new THREE.Color(1, 0, 0);
      e.mesh.parts.torso.material.emissiveIntensity = flashAmt;
    } else {
      e.mesh.parts.torso.material.emissiveIntensity = 0;
    }
  }
}
