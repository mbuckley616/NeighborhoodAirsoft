
function updateBBs(dt) {
  const GRAVITY = 9.8;
  const HOPUP_LIFT = 8.5;
  const MAX_AGE = 4.0;

  for (let i = Game.scenario.bbs.length - 1; i >= 0; i--) {
    const bb = Game.scenario.bbs[i];
    bb.age += dt;

    // Hop-up lift fades over time — counters gravity early, then drops
    const lift = HOPUP_LIFT * Math.max(0, 1 - bb.age * 1.5);
    bb.vel.y += (lift - GRAVITY) * dt;

    // Curve — each BB has a FIXED curve direction and strength.
    // Apply as constant acceleration in that perpendicular direction.
    // Per-gun: curve only kicks in after the BB has traveled `curveOnsetDistance` meters
    // from its spawn. Within onset radius, flight is essentially flat.
    // Past onset, strength ramps up over ~0.5m so the transition isn't a jolt.
    const distFromSpawn = bb.spawnPos ? bb.pos.distanceTo(bb.spawnPos) : 0;
    const onset = bb.curveOnsetDistance ?? 4;
    const onsetRamp = Math.max(0, Math.min(1, (distFromSpawn - onset) / 0.5));
    const curveAccel = bb.curveStrength * onsetRamp;
    bb.vel.x += bb.curveDir.x * curveAccel * dt;
    bb.vel.y += bb.curveDir.y * curveAccel * dt;
    bb.vel.z += bb.curveDir.z * curveAccel * dt;

    // Integrate (sub-step for stability at high speeds)
    const oldPos = bb.pos.clone();
    bb.pos.x += bb.vel.x * dt;
    bb.pos.y += bb.vel.y * dt;
    bb.pos.z += bb.vel.z * dt;
    bb.mesh.position.copy(bb.pos);

    // v1.67: BB whistle. While the BB is airborne and near the player, maintain a
    // faint air-rush hiss panned + attenuated by distance. Only live (canDamage)
    // BBs whistle — a bounced/spent BB skipping along the ground shouldn't. The
    // whistle is force-stopped on every removal/impact path below (and here when
    // it leaves earshot) so it terminates the instant the BB hits something.
    if (bb.canDamage) {
      const wdx = bb.pos.x - Game.player.pos.x;
      const wdy = bb.pos.y - (Game.player.pos.y + Game.player.eyeOffset);
      const wdz = bb.pos.z - Game.player.pos.z;
      const wdist = Math.sqrt(wdx*wdx + wdy*wdy + wdz*wdz);
      // v1.74: never (re)start a whistle once we've left scenario mode. A BB hit
      // can flip to 'result' mid-loop via endScenario; the rest of this same loop
      // pass must not spin up a fresh looping oscillator that nothing will stop.
      if (wdist < BB_WHISTLE_RANGE && Game.mode === 'scenario') {
        if (!bb._whistle) bbWhistleStart(bb);
        const { pan } = positionalAudio(bb.pos.x, bb.pos.z, BB_WHISTLE_RANGE);
        // Volume rises sharply as it closes (inverse), capped in the synth.
        const vol = BB_WHISTLE_VOL * Math.max(0, 1 - wdist / BB_WHISTLE_RANGE);
        bbWhistleUpdate(bb, pan, vol);
      } else if (bb._whistle) {
        bbWhistleStop(bb);
      }
    } else if (bb._whistle) {
      bbWhistleStop(bb);
    }

    let removed = false;
    // v1.257 (D.40): the range's cans, bottles, paper and bullseyes
    if (Game.scenario.range && bb.canDamage) { if (rangeBBHit(bb, oldPos) === 'stop') removed = true; }

    // Out of bounds / age
    if (bb.age > MAX_AGE) removed = true;
    const sb = Game.scenario.bounds;
    if (!removed && sb) {
      if (bb.pos.x < sb.minX - 2 || bb.pos.x > sb.maxX + 2 ||
          bb.pos.z < sb.minZ - 5 || bb.pos.z > sb.maxZ + 5 ||
          bb.pos.y > 20) removed = true;
    }

    // Ground bounce (or absorb if slow) — v1.8: ground level is terrain height.
    const gThresh = scenarioGroundY(bb.pos.x, bb.pos.z) + 0.02;
    if (!removed && bb.pos.y <= gThresh) {
      const speed = bb.vel.length();
      if (bb.bouncesLeft > 0 && speed > 4) {
        bb.pos.y = gThresh;
        // Grass absorbs most energy
        bb.vel.y = -bb.vel.y * 0.25;
        bb.vel.x *= 0.5;
        bb.vel.z *= 0.5;
        bb.bouncesLeft--;
        bb.canDamage = false;
        // Scuffed/dimmed once bounced (was dingy yellow; now a dull gray-white
        // so it stays consistent with the glossy-white BBs but reads as "spent").
        // v1.41: glow rounds keep their glow where they land — that's the point.
        if (!bb.mesh._glow) {
          bb.mesh.material.color.setHex(0xb8b8b8);
          bb.mesh.material.emissiveIntensity = 0.05;
        } else {
          demoteGlowLight(bb.mesh);
        }
      } else {
        removed = true;
      }
    }

    // v1.110: swept test. The loop below checks only where the BB ends the sub-step, so one moving more than a
    // wall's thickness per 1/200 s (36 m/s for an 18 cm planter wall) could skip it and tag whoever stood behind.
    // Find the nearest obstacle the path oldPos→pos enters and, if the end point sits past it, move the BB to
    // just inside its entry face, so the ordinary surface outcome below (bounce / stick / shatter) runs on it.
    if (!removed) {
      const sx = bb.pos.x - oldPos.x, sy = bb.pos.y - oldPos.y, sz = bb.pos.z - oldPos.z;
      const segLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (segLen > 0.05) {
        const ux = sx / segLen, uy = sy / segLen, uz = sz / segLen;
        const mx = oldPos.x + sx * 0.5, mz = oldPos.z + sz * 0.5, reach = segLen * 0.5 + 0.01;
        let tHit = Infinity, endInside = false;
        for (const o of Game.player.obstacles) {
          if (o.bbPass || !obsOverlapsXZ(o, mx, mz, reach)) continue;
          const oBase = o.baseY ?? 0, oTop = oBase + (o.h || 5);
          if (oldPos.y > oBase && oldPos.y < oTop && obsOverlapsXZ(o, oldPos.x, oldPos.z, 0)) continue;   // leaving it
          const t = obsRayDist(o, oldPos.x, oldPos.y, oldPos.z, ux, uy, uz, segLen);
          if (t < tHit) {
            tHit = t;
            endInside = bb.pos.y > oBase && bb.pos.y < oTop && obsOverlapsXZ(o, bb.pos.x, bb.pos.z, 0);
          }
        }
        if (tHit < Infinity && !endInside) {
          const tIn = Math.min(segLen, tHit + 0.01);
          bb.pos.set(oldPos.x + ux * tIn, oldPos.y + uy * tIn, oldPos.z + uz * tIn);
          bb.mesh.position.copy(bb.pos);
        }
      }
    }

    // Cover/obstacle collision with surface-aware outcome
    if (!removed) {
      for (const o of Game.player.obstacles) {
        // v1.33: fences are visually mostly open (vertical pickets with wide
        // gaps), but their collision AABB is solid — which ate BBs fired between
        // yards (very noticeable in FFA). Obstacles flagged `bbPass` let BBs fly
        // straight through while STILL blocking kid/player movement (collidesObstacles
        // ignores the flag). So fences stop bodies, not BBs.
        if (o.bbPass) continue;
        // v1.8: obstacle vertical span is [baseY, baseY+h] (baseY defaults 0 on
        // flat maps), so BBs pass over a low ledge below them / under a high deck.
        // v1.53: horizontal test is shape-aware — round props use their true
        // circle (no phantom corner hits), boxy props use the AABB.
        const oBase = o.baseY ?? 0;
        if (bb.pos.y > oBase && bb.pos.y < oBase + (o.h || 5) &&
            obsOverlapsXZ(o, bb.pos.x, bb.pos.z, 0)) {

          // Outcome probabilities per surface (must sum to 1).
          // v1.16: BBs only STICK to soft surfaces (cardboard). Hard plastic bins
          // (metal), fences, trees, and houses never lodge a BB — they bounce or
          // shatter. (A real airsoft BB doesn't embed in a hard plastic trash can.)
          const surface = o.surface || 'hard';
          let pBounce, pStick, pShatter, bounceEnergy;
          let allowStick = false;
          if (surface === 'soft') {
            // Cardboard mostly absorbs; the BB lodges in it. Rare glancing ricochet.
            pBounce = 0.15; pStick = 0.85; pShatter = 0;
            bounceEnergy = 0.18;
            allowStick = true;
          } else if (surface === 'metal') {
            // Hard plastic bins / metal cans: heavy bounce bias, occasional
            // shatter, NEVER stick. (v1.33: the bins were mistagged 'soft' and
            // BBs embedded all over them — see addCurbsideBin. Now they read as
            // metal: mostly ping off, sometimes shatter, never lodge.)
            pBounce = 0.88; pStick = 0; pShatter = 0.12;
            bounceEnergy = 0.55;
          } else {
            // Hard surfaces (fence, tree, house): mostly bounce, occasional shatter
            pBounce = 0.85; pStick = 0; pShatter = 0.15;
            bounceEnergy = 0.45;
          }

          // Compute which face was hit (swept-AABB) — needed for all outcomes
          const hitAxis = computeHitAxis(oldPos, bb.pos, o);

          // Decide outcome in two stages so the bounce-gate (speed / bounce-count)
          // can't silently turn an intended bounce into a shatter (the v1.33 bin
          // bug: bins read 78% shatter because half the rolls failed the gate and
          // fell through to shatter). Stage 1: the surface probability split picks
          // the INTENDED outcome. Stage 2: if that's 'bounce' but the BB is out of
          // bounces / too slow, downgrade — soft sticks, metal does a final
          // low-energy ping-and-despawn (never embeds), hard shatters.
          const roll = gameRandom();
          let intended;
          if (roll < pBounce) intended = 'bounce';
          else if (roll < pBounce + pStick) intended = 'stick';
          else intended = 'shatter';

          const canBounce = bb.bouncesLeft > 0 && bb.vel.length() > 3;
          let outcome;
          if (intended === 'bounce') {
            if (canBounce) outcome = 'bounce';
            else if (surface === 'metal') outcome = 'bounce';  // bin: ping off even on last/slow hit (applyBounce ejects + despawns soon via age)
            else if (allowStick) outcome = 'stick';            // soft: catch it
            else outcome = 'shatter';                          // hard: terminal shatter
          } else {
            outcome = intended;  // 'stick' (soft only) or 'shatter'
          }

          if (outcome === 'bounce') {
            applyBounce(bb, oldPos, hitAxis, bounceEnergy, o);
            bbWhistleStop(bb);   // v1.67: first impact on an object ends the whistle
            // Bounce sound depends on what was hit
            if (surface === 'metal') playImpactMetal(bb.pos);
            else if (surface === 'soft') playImpactCardboard(bb.pos);
            else playImpactWood(bb.pos);
          } else if (outcome === 'stick') {
            applyStick(bb, oldPos, hitAxis, o);
            bbWhistleStop(bb);   // v1.67: first impact — kill the whistle now
            // Stick is almost always cardboard — soft thump
            if (surface === 'soft') playImpactCardboard(bb.pos);
            else if (surface === 'metal') playImpactMetal(bb.pos);  // rare metal dud
            else playImpactWood(bb.pos);
            removed = false; // BB stays alive but moves to stuck list (handled inside applyStick)
            // applyStick removes the BB from the active list; tell outer loop to skip removal
            Game.scenario.bbs.splice(i, 1);
            break;
          } else { // shatter
            applyShatter(bb);
            playImpactShatter(bb.pos);
            removed = true;
          }
          break;
        }
      }
    }

    // Team-aware hit check (Ship B): the BB can strike any alive combatant on a
    // different team. Iterate all combatants; the first valid geometric hit wins
    // and removes the BB. Routing (player cylinder vs kid AABB, and the distinct
    // on-hit consequences) lives in the helpers above. With today's single
    // 'player' vs 'enemy' split this is identical to the old two-block version.
    if (!removed && bb.canDamage) {
      for (const c of listCombatants()) {
        if (!bbCanTarget(bb, c)) continue;
        if (bbHitsCombatant(bb, c)) {
          removed = applyBBHit(bb, c);
          break;
        }
      }
    }

    // v1.67: ENEMY NEAR-MISS DETECTION. A live BB whizzing within ~2.5m of a
    // kid (that it could legally hit — different team, alive, fighting) registers
    // as "being fired upon." We stamp the kid with the time and the DIRECTION the
    // fire came FROM (reverse of the BB's travel), so the AI can decide whether
    // its cover is between it and that threat. Cheap: only runs on live BBs that
    // didn't just hit someone, and skips kids already stamped in the last 0.25s.
    if (!removed && bb.canDamage) {
      const NEAR_MISS_R2 = 2.5 * 2.5;
      const now = aiNow();   // v1.176: simulated time, not the wall clock
      for (const e of Game.scenario.enemies) {
        if (e.health <= 0 || e.state === 'retreating') continue;
        if ((e.team || 'enemy') === bb.team) continue;       // own team's round
        const dxm = bb.pos.x - e.pos.x, dzm = bb.pos.z - e.pos.z;
        const dym = bb.pos.y - ((e.pos.y || 0) + 1.0);       // ~chest height
        const d2m = dxm*dxm + dzm*dzm + dym*dym;
        if (d2m < FIRE_PRESS_R * FIRE_PRESS_R) noteFirePressure(e, bb, now);   // v1.387 (D.81): the fire on him, by gun
        if (e._lastNearMiss && (now - e._lastNearMiss) < 0.25) continue;
        if (d2m > NEAR_MISS_R2) continue;
        // Direction the shot came FROM = opposite the BB's horizontal travel.
        const vlen = Math.hypot(bb.vel.x, bb.vel.z) || 1;
        e._incomingDir = { x: -bb.vel.x / vlen, z: -bb.vel.z / vlen };
        e._lastNearMiss = now;
        notePressed(e, now);   // v1.256 (D.32): under fire, he may say so
      }
    }

    if (removed) {
      bbWhistleStop(bb);   // v1.67: kill the whistle the instant the BB is gone
      Game.scene.remove(bb.mesh);
      bb.mesh.material.dispose();
      Game.scenario.bbs.splice(i, 1);
    }
  }

  // v1.41a: reposition the fixed glow-light pool onto active tracers (no light
  // count change → no shader recompile stutter). Cheap: one pass over the BBs.
  GlowLightPool.update();
}

// ---------------------------------------------------------------------
// BB COLLISION OUTCOMES — helpers
// ---------------------------------------------------------------------

// Swept-AABB face detection: which axis did the BB cross last to enter the box?
function computeHitAxis(oldPos, newPos, o) {
  // v1.54c: oriented boxes resolve their hit face in the box's LOCAL frame and
  // report 'lx'/'lz'/'y' (local X / local Z / world Y). applyBounce/applyStick
  // handle those. Using the AABB faces here for an obox picked the wrong face
  // and reflected the BB INTO the rotated box — the "BBs ping around inside the
  // car" bug.
  if (o.shape === 'obox') return computeHitAxisObox(oldPos, newPos, o);
  const dx = newPos.x - oldPos.x;
  const dy = newPos.y - oldPos.y;
  const dz = newPos.z - oldPos.z;
  let tX = -Infinity, tY = -Infinity, tZ = -Infinity;
  if (dx > 0) tX = (o.minX - oldPos.x) / dx;
  else if (dx < 0) tX = (o.maxX - oldPos.x) / dx;
  if (dy > 0) tY = (0 - oldPos.y) / dy;
  else if (dy < 0) tY = ((o.h || 5) - oldPos.y) / dy;
  if (dz > 0) tZ = (o.minZ - oldPos.z) / dz;
  else if (dz < 0) tZ = (o.maxZ - oldPos.z) / dz;
  const valid = [];
  if (tX >= 0 && tX <= 1) valid.push({ axis: 'x', t: tX });
  if (tY >= 0 && tY <= 1) valid.push({ axis: 'y', t: tY });
  if (tZ >= 0 && tZ <= 1) valid.push({ axis: 'z', t: tZ });
  if (valid.length > 0) {
    valid.sort((a, b) => b.t - a.t);
    return valid[0].axis;
  }
  // Fallback for BBs that started inside (shouldn't happen with sub-stepping)
  const distX = Math.min(newPos.x - o.minX, o.maxX - newPos.x);
  const distY = Math.min(newPos.y, (o.h || 5) - newPos.y);
  const distZ = Math.min(newPos.z - o.minZ, o.maxZ - newPos.z);
  const minD = Math.min(distX, distY, distZ);
  return (minD === distX) ? 'x' : (minD === distY) ? 'y' : 'z';
}

// World point → box local (THREE Y-rotation inverse). Returns {x,z}.
function _oboxToLocal(o, wx, wz) {
  const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
  const px = wx - o.cx, pz = wz - o.cz;
  return { x: px * cos - pz * sin, z: px * sin + pz * cos };
}
// Box local → world (THREE Y-rotation forward). Returns {x,z}.
function _oboxToWorld(o, lx, lz) {
  const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
  return { x: o.cx + (lx * cos + lz * sin), z: o.cz + (-lx * sin + lz * cos) };
}

// Which face of an oriented box did the BB cross? Work entirely in the box's
// local frame: transform old/new positions to local, find the latest axis
// crossing (local X, local Z, or world Y). Returns 'lx' | 'lz' | 'y'.
function computeHitAxisObox(oldPos, newPos, o) {
  const a = _oboxToLocal(o, oldPos.x, oldPos.z);
  const b = _oboxToLocal(o, newPos.x, newPos.z);
  const dlx = b.x - a.x, dlz = b.z - a.z;
  const dy = newPos.y - oldPos.y;
  const oBase = o.baseY ?? 0, oTop = oBase + (o.h || 5);
  let tX = -Infinity, tY = -Infinity, tZ = -Infinity;
  if (dlx > 0) tX = (-o.hx - a.x) / dlx;
  else if (dlx < 0) tX = (o.hx - a.x) / dlx;
  if (dy > 0) tY = (oBase - oldPos.y) / dy;
  else if (dy < 0) tY = (oTop - oldPos.y) / dy;
  if (dlz > 0) tZ = (-o.hz - a.z) / dlz;
  else if (dlz < 0) tZ = (o.hz - a.z) / dlz;
  const valid = [];
  if (tX >= 0 && tX <= 1) valid.push({ axis: 'lx', t: tX });
  if (tY >= 0 && tY <= 1) valid.push({ axis: 'y', t: tY });
  if (tZ >= 0 && tZ <= 1) valid.push({ axis: 'lz', t: tZ });
  if (valid.length > 0) { valid.sort((p, q) => q.t - p.t); return valid[0].axis; }
  // Fallback (BB started inside): nearest local face.
  const distX = Math.min(b.x + o.hx, o.hx - b.x);
  const distZ = Math.min(b.z + o.hz, o.hz - b.z);
  const distY = Math.min(newPos.y - oBase, oTop - newPos.y);
  const minD = Math.min(distX, distY, distZ);
  return (minD === distY) ? 'y' : (minD === distX) ? 'lx' : 'lz';
}

// Mutate bb to reflect off the given face axis with given energy retention.
// v1.54c: 'lx'/'lz' are oriented-box LOCAL axes — reflect the velocity component
// along the box's local axis (not world X/Z), and eject the BB just OUTSIDE the
// local face so it can't end up trapped inside a rotated box (the "pings inside
// the car" bug).
function applyBounce(bb, oldPos, hitAxis, bounceEnergy, o) {
  if (hitAxis === 'lx' || hitAxis === 'lz') {
    // Work in the box's local frame.
    const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
    // World velocity → local.
    let vlx = bb.vel.x * cos - bb.vel.z * sin;
    let vlz = bb.vel.x * sin + bb.vel.z * cos;
    // Local position of the BB (current).
    const lp = _oboxToLocal(o, bb.pos.x, bb.pos.z);
    if (hitAxis === 'lx') {
      vlx *= -bounceEnergy; vlz *= bounceEnergy;
      // eject just outside the local ±hx face the BB is nearest to
      const face = (lp.x >= 0) ? o.hx : -o.hx;
      lp.x = face + (lp.x >= 0 ? 1 : -1) * 0.02;
    } else {
      vlz *= -bounceEnergy; vlx *= bounceEnergy;
      const face = (lp.z >= 0) ? o.hz : -o.hz;
      lp.z = face + (lp.z >= 0 ? 1 : -1) * 0.02;
    }
    bb.vel.y *= bounceEnergy;
    // Local velocity → world.
    bb.vel.x = vlx * cos + vlz * sin;
    bb.vel.z = -vlx * sin + vlz * cos;
    // Local position → world.
    const w = _oboxToWorld(o, lp.x, lp.z);
    bb.pos.x = w.x; bb.pos.z = w.z;
  } else if (hitAxis === 'x') {
    bb.vel.x *= -bounceEnergy;
    bb.pos.x = oldPos.x;
    bb.vel.y *= bounceEnergy;
    bb.vel.z *= bounceEnergy;
  } else if (hitAxis === 'y') {
    bb.vel.y *= -bounceEnergy;
    bb.pos.y = oldPos.y;
    bb.vel.x *= bounceEnergy;
    bb.vel.z *= bounceEnergy;
  } else {
    bb.vel.z *= -bounceEnergy;
    bb.pos.z = oldPos.z;
    bb.vel.x *= bounceEnergy;
    bb.vel.y *= bounceEnergy;
  }
  bb.mesh.position.copy(bb.pos);
  // Slight scatter from impact
  bb.vel.x += (gameRandom() - 0.5) * 1.2;
  bb.vel.z += (gameRandom() - 0.5) * 1.2;
  bb.bouncesLeft--;
  bb.canDamage = false;
  if (!bb.mesh._glow) {
    bb.mesh.material.color.setHex(0xb8b8b8);
    if (bb.mesh.material.emissiveIntensity !== undefined) bb.mesh.material.emissiveIntensity = 0.05;
  } else {
    demoteGlowLight(bb.mesh);
  }
}

// Stick the BB to the surface — pin to entry face and add to persistent list
const STUCK_LIFETIME = 30.0;   // seconds
const MAX_STUCK_BBS = 60;

function applyStick(bb, oldPos, hitAxis, o) {
  const EMBED = 0.025;
  if (hitAxis === 'lx' || hitAxis === 'lz') {
    // v1.54c: oriented-box local faces — pin just inside the local ±hx/±hz face.
    const lp = _oboxToLocal(o, oldPos.x, oldPos.z);
    if (hitAxis === 'lx') lp.x = (lp.x >= 0 ? o.hx - EMBED : -o.hx + EMBED);
    else                  lp.z = (lp.z >= 0 ? o.hz - EMBED : -o.hz + EMBED);
    const w = _oboxToWorld(o, lp.x, lp.z);
    bb.pos.x = w.x; bb.pos.z = w.z;
  } else {
    // AABB faces (world axes).
    if (hitAxis === 'x') bb.pos.x = oldPos.x;
    else if (hitAxis === 'y') bb.pos.y = oldPos.y;
    else bb.pos.z = oldPos.z;
    if (hitAxis === 'x') {
      bb.pos.x += (bb.pos.x < o.minX) ? EMBED : -EMBED;
    } else if (hitAxis === 'y') {
      bb.pos.y += (bb.pos.y < 0) ? EMBED : -EMBED;
    } else {
      bb.pos.z += (bb.pos.z < o.minZ) ? EMBED : -EMBED;
    }
  }
  bb.mesh.position.copy(bb.pos);
  if (!bb.mesh._glow) bb.mesh.material.color.setHex(0xc8b878);
  bb.vel.set(0, 0, 0);
  bb.canDamage = false;

  // v1.41: a landed glow BB keeps its bright emissive material but sheds its
  // child PointLight — only in-FLIGHT glow rounds light the scene.
  if (bb.mesh._glow) demoteGlowLight(bb.mesh);

  // Move to stuck list
  const stuckEntry = { mesh: bb.mesh, lifetime: STUCK_LIFETIME, age: 0 };
  Game.scenario.stuckBBs = Game.scenario.stuckBBs || [];
  Game.scenario.stuckBBs.push(stuckEntry);
  // Cap stuck BBs to prevent runaway
  while (Game.scenario.stuckBBs.length > MAX_STUCK_BBS) {
    const oldest = Game.scenario.stuckBBs.shift();
    Game.scene.remove(oldest.mesh);
    oldest.mesh.material.dispose();
  }
}

// Shatter into a few small fragments that scatter and fade
function applyShatter(bb) {
  const FRAGS = 4 + Math.floor(gameRandom() * 3);
  Game.scenario.fragments = Game.scenario.fragments || [];
  for (let f = 0; f < FRAGS; f++) {
    const geom = new THREE.SphereGeometry(0.015 + gameRandom() * 0.01, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff0a8,
      transparent: true,
      opacity: 1.0,
    });
    const m = new THREE.Mesh(geom, mat);
    m.position.copy(bb.pos);
    Game.scene.add(m);
    // Random scatter velocity, somewhat away from impact
    const vx = (gameRandom() - 0.5) * 4;
    const vy = gameRandom() * 3 + 1;  // upward bias
    const vz = (gameRandom() - 0.5) * 4;
    Game.scenario.fragments.push({
      mesh: m,
      vel: new THREE.Vector3(vx, vy, vz),
      age: 0,
      lifetime: 0.4,
    });
  }
  // Small "mist" — a single larger, faded BB-sized puff
  const mistGeom = new THREE.SphereGeometry(0.08, 5, 4);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xeeeeee,
    transparent: true,
    opacity: 0.5,
  });
  const mist = new THREE.Mesh(mistGeom, mistMat);
  mist.position.copy(bb.pos);
  Game.scene.add(mist);
  Game.scenario.fragments.push({
    mesh: mist,
    vel: new THREE.Vector3(0, 0.6, 0),  // drifts up slowly
    age: 0,
    lifetime: 0.5,
    isMist: true,
  });
}

// Update stuck BBs — countdown then despawn
function updateStuckBBs(dt) {
  if (!Game.scenario.stuckBBs) return;
  for (let i = Game.scenario.stuckBBs.length - 1; i >= 0; i--) {
    const s = Game.scenario.stuckBBs[i];
    s.age += dt;
    // Fade out in the last 2 seconds
    const remaining = s.lifetime - s.age;
    if (remaining < 2.0 && remaining > 0) {
      const fade = remaining / 2.0;
      // Darken the color to suggest decay
      const c = 0xc8b878;
      const r = Math.floor(((c >> 16) & 0xff) * fade);
      const g = Math.floor(((c >> 8) & 0xff) * fade);
      const b = Math.floor((c & 0xff) * fade);
      s.mesh.material.color.setRGB(r / 255, g / 255, b / 255);
    }
    if (s.age >= s.lifetime) {
      Game.scene.remove(s.mesh);
      s.mesh.material.dispose();
      Game.scenario.stuckBBs.splice(i, 1);
    }
  }
}

// Update fragment particles — physics + fade
function updateFragments(dt) {
  if (!Game.scenario.fragments) return;
  const GRAV = 9.8;
  for (let i = Game.scenario.fragments.length - 1; i >= 0; i--) {
    const f = Game.scenario.fragments[i];
    f.age += dt;
    if (f.isMist) {
      // Mist drifts and expands slightly
      f.mesh.position.x += f.vel.x * dt;
      f.mesh.position.y += f.vel.y * dt;
      f.mesh.position.z += f.vel.z * dt;
      const t = f.age / f.lifetime;
      f.mesh.scale.setScalar(1 + t * 0.8);
      f.mesh.material.opacity = 0.5 * (1 - t);
    } else {
      f.vel.y -= GRAV * dt;
      f.mesh.position.x += f.vel.x * dt;
      f.mesh.position.y += f.vel.y * dt;
      f.mesh.position.z += f.vel.z * dt;
      // Stop at ground
      if (f.mesh.position.y <= 0.01) {
        f.mesh.position.y = 0.01;
        f.vel.set(0, 0, 0);
      }
      const t = f.age / f.lifetime;
      f.mesh.material.opacity = 1 - t;
    }
    if (f.age >= f.lifetime) {
      Game.scene.remove(f.mesh);
      f.mesh.material.dispose();
      f.mesh.geometry.dispose();
      Game.scenario.fragments.splice(i, 1);
    }
  }
}

// Per-part hit detection: build hitboxes from the actual kid body parts
// and check the BB position against each. Tighter than the old cylinder check.
function checkEnemyHit(enemy, bbPos) {
  // Enemy local frame: feet at enemy.pos, mesh offset by group position.
  // v1.14b: crouch is now a body POSE (feet planted) rather than a group sink, so
  // the group Y only carries the death-slump offset. We read the crouch amount
  // and drop the upper-body hitboxes + shrink the leg boxes to match the mesh.
  const baseY = enemy.mesh.group.position.y; // ~0 normally; negative only on death slump

  // Per-kid scale (height & build) — group.scale was set by createKid().
  const sY  = enemy.mesh.scaleY  ?? 1.0;
  const sXZ = enemy.mesh.scaleXZ ?? 1.0;

  // Crouch pose: upper body drops by hipDrop, legs squash to legShrink of height.
  const crouch = enemy.mesh.pose?.crouch ?? 0;
  const legShrink = 1 - 0.45 * crouch;       // matches setKidCrouch
  const hipDrop   = 0.55 * (1 - legShrink);  // matches setKidCrouch

  // Hitbox parts (in enemy-local "average kid" space, relative to feet).
  // Upper-body cy values get -hipDrop; leg boxes shrink (half-height × legShrink)
  // and re-center so their bottom stays at the foot.
  const legHy = 0.275 * legShrink;
  const PARTS = [
    // head
    { cx: 0,    cy: 1.26 - hipDrop, cz: 0, hx: 0.14, hy: 0.14,  hz: 0.14 },
    // torso
    { cx: 0,    cy: 0.80 - hipDrop, cz: 0, hx: 0.21, hy: 0.25,  hz: 0.12 },
    // left arm
    { cx: -0.27,cy: 0.82 - hipDrop, cz: 0, hx: 0.06, hy: 0.225, hz: 0.07 },
    // right arm
    { cx: 0.27, cy: 0.82 - hipDrop, cz: 0, hx: 0.06, hy: 0.225, hz: 0.07 },
    // left leg (shrinks + re-centers)
    { cx: -0.10,cy: legHy,          cz: 0, hx: 0.08, hy: legHy,  hz: 0.09 },
    // right leg
    { cx: 0.10, cy: legHy,          cz: 0, hx: 0.08, hy: legHy,  hz: 0.09 },
  ];

  // Transform bbPos into enemy-local space (account for yaw + position + group Y offset)
  const dx = bbPos.x - enemy.pos.x;
  const dz = bbPos.z - enemy.pos.z;
  const dy = bbPos.y - baseY;
  // Rotate by -enemy.yaw to undo the enemy facing rotation
  const cosY = Math.cos(-enemy.yaw);
  const sinY = Math.sin(-enemy.yaw);
  const lx = dx * cosY + dz * sinY;
  const lz = -dx * sinY + dz * cosY;

  // BB radius — slight forgiveness
  const r = 0.04;
  for (const p of PARTS) {
    // Scale this part's center + half-size by the kid's character scales.
    const cx = p.cx * sXZ, cy = p.cy * sY, cz = p.cz * sXZ;
    const hx = p.hx * sXZ, hy = p.hy * sY, hz = p.hz * sXZ;
    if (Math.abs(lx - cx) < hx + r &&
        Math.abs(dy - cy) < hy + r &&
        Math.abs(lz - cz) < hz + r) {
      return true;
    }
  }
  return false;
}

// v1.23: an enemy was tagged by a player BB. In a DEFEND scenario, attackers
// don't die — they run back to their spawn and redeploy (shooting them is a
// temporary disable, like real airsoft re-spawn rules). Everyone else (skirmish
// / attack scenarios, or non-attacker roles) is eliminated permanently.
//
// v1.34: TEAM BATTLES (last_team_standing, NOT FFA) give every NPC a LIVES pool
// (default 3). A tagged team-battle kid burns one life and — if any remain —
// runs back to its base to respawn (same retreat→redeploy machinery as defends),
// rejoining the fight afterward. Only when its last life is spent is it a
// permanent kill. FFA kids have no lives pool (one tag = out), matching the
// "last kid standing" fantasy. The player is unaffected here (their lives are
// hits-based, handled in applyBBHit / Game.player.maxHits).
function eliminateEnemy(e) {
  if (Game.scenario.ctf) { ctfDrop(e); e._flagKind = null; }   // v1.189: a flag he carried falls where he was tagged; a new way next life
  const isDefend = Game.scenario.scenarioType === 'defend';
  // A team battle is last_team_standing with real teams (someone is allied to
  // the player). FFA also uses last_team_standing but every kid is a lone team.
  // v1.36g: a lives pool now also applies in FFA when the scenario set npcLives
  // (a multi-life FFA) — a downed kid burns a life and redeploys at its own
  // scattered anchor instead of dropping out, until the pool is spent.
  const isTeamBattle = (Game.scenario.winCondition === 'last_team_standing') && !Game.scenario.ffa;
  const livesRespawn = (isTeamBattle || Game.scenario.ffa) && typeof e.lives === 'number' && e.lives > 1;
  if (livesRespawn) {
    // Burn a life and respawn (retreat → redeploy). Still in the fight.
    e.lives--;
    updateRosterHud();
    // Reuse the defend respawn path below.
    e.hitFlash = 0.6;
    e.state = 'retreating';
    e.stateTime = 0;
    e.pendingBurst = [];
    e.targetPos = null;
    e.homeCover = null;
    e._recentlySpotted = false;
    e._lastSawPlayer = 0;
    e._retreatStuck = 0;
    e._retreatBest = null;   // v1.164: fresh retreat, fresh progress mark
    if ((e.mesh.pose?.crouch ?? 0) > 0) setKidCrouch(e.mesh, 0);
    e.mesh.group.position.y = 0;
    e.mesh.group.rotation.z = 0; e.mesh.group.rotation.x = 0; e._leanX = e._leanZ = 0;   // v1.183: no lean when out
    tryNpcSpeak(e, 'npcHit');
    return;
  }
  const respawns = isDefend && e.role === 'attacker';
  if (respawns) {
    // Temporary disable → retreat to spawn, then redeploy.
    e.hitFlash = 0.6;
    e.state = 'retreating';
    e.stateTime = 0;
    e.pendingBurst = [];           // cancel any queued auto-burst
    e.targetPos = null;
    e.homeCover = null;
    e._recentlySpotted = false;
    e._lastSawPlayer = 0;
    e._retreatStuck = 0;           // fresh retreat — clear any stale wedge counter
    e._retreatBest = null;         // v1.164: and its progress mark
    // Un-crouch so they read as standing/turning to run.
    if ((e.mesh.pose?.crouch ?? 0) > 0) setKidCrouch(e.mesh, 0);
    e.mesh.group.position.y = 0;
    e.mesh.group.rotation.z = 0; e.mesh.group.rotation.x = 0; e._leanX = e._leanZ = 0;   // v1.183: no lean when out
    tryNpcSpeak(e, 'npcHit');
  } else {
    // Permanent kill.
    e.health = 0;
    e._outT = 0; e._walkingOff = false; e._offField = false; e._offBest = null; e._offStuck = 0; e._offSide = 0;   // v1.264: his walk off starts now
    if (typeof e.lives === 'number') e.lives = 0;   // v1.34: last life spent
    e.hitFlash = 0.6;
    updateRosterHud();
    if (Tutorial.active && e.team !== 'player') Tutorial.notify('tagged');   // v1.57: count practice-dummy tags (v1.324: theirs only)
    checkWinCondition();
  }
}

// v1.90: every delayed round end goes through here. The delay lets the last hit land
// on screen, but the round can end another way inside it (a BB already in flight tags
// the player out; the tagger and the timer both fire in Infection). The first ending
// stands: a late one for a round that is over, or for a different round, is dropped.
// Before this the result could flip YOU'RE OUT → YOU GOT THEM and pay out twice.
// Game.scenario is one object reused every round, so the round is told apart by
// Game.roundSeq (bumped in startScenario), not by the object.
function endScenarioLater(outcome, ms) {
  const round = Game.roundSeq;
  if (outcome === 'win') Game.scenario.wonRound = round;   // v1.263 (decisions "A trade on the last tag", Michael: A): see applyBBHit
  setTimeout(() => { if (Game.mode === 'scenario' && Game.roundSeq === round) endScenario(outcome); }, ms);
}

function checkWinCondition() {
  // Skip if scenario isn't active (e.g., already ended)
  if (Game.mode !== 'scenario') return;
  // v1.57: kill_all counts only HOSTILE combatants — allies (team 'player', e.g.
  // a tutorial coach or a teammate in a skirmish) must not need shooting to win.
  const alive = Game.scenario.enemies.filter(e => e.health > 0 && e.team !== 'player').length;
  const winCondition = Game.scenario.winCondition || 'kill_all';
  // v1.189: capture the flag ends on the second flag home (updateFlags), never on tags
  if (Game.scenario.ctf) return;
  if (Game.scenario.race) return;   // v1.354 (D.71): a race ends at the bottom of the hill (updateCart), never on tags
  // v1.170 (D.15): a VIP match ends on a VIP, and only on one: theirs out wins, ours out loses
  if (Game.scenario.vip) {
    const theirs = Game.scenario.enemies.find(e => e.vip && (e.team || 'enemy') !== 'player');
    const ours = Game.scenario.enemies.find(e => e.vip && e.team === 'player');
    if (theirs && !npcInFight(theirs)) endScenarioLater('win', 600);
    else if (ours && !npcInFight(ours)) endScenarioLater('lose', 600);
    return;
  }

  if (winCondition === 'kill_all') {
    // Standard: kill everyone wins
    if (alive === 0) {
      endScenarioLater('win', 600);
    }
  } else if (winCondition === 'survive_timer') {
    // Survive: timer counts down, win at 0. Also: if you happen to kill all
    // attackers anyway, that's a win too (early finish).
    if (alive === 0) {
      endScenarioLater('win', 600);
    }
    // Timer-hit-zero is handled by updateScenarioTimer below.
  } else if (winCondition === 'last_team_standing') {
    // Ship C: teams / FFA. The round ends when only ONE team still has a living
    // combatant. The player counts as their own team. If that surviving team is
    // the player's → win; if it's some AI team and the player is out → handled by
    // the player-elimination path (endScenario('lose')); a draw (nobody left)
    // shouldn't happen but resolves as a win for safety.
    const teamsAlive = new Set();
    if (Game.player.hitsTaken < Game.player.maxHits) {
      teamsAlive.add(combatantTeam(Game.player));
    }
    for (const e of Game.scenario.enemies) {
      // v1.34: a team-battle kid with lives left is still in the fight even when
      // health is momentarily 0 mid-respawn (state 'retreating'). npcInFight()
      // is lives-aware where a lives pool exists, health-based otherwise.
      if (npcInFight(e)) teamsAlive.add(e.team || 'enemy');
    }
    if (teamsAlive.size <= 1) {
      const playerTeam = combatantTeam(Game.player);
      const playerAlive = Game.player.hitsTaken < Game.player.maxHits;
      // Player's team is the lone survivor (player alive, or an ally of theirs is).
      const playerTeamSurvives = teamsAlive.has(playerTeam) && (playerAlive || hasLivingAlly(playerTeam));
      endScenarioLater(playerTeamSurvives ? 'win' : 'lose', 600);
    }
  }
  // v1.25 survive_untagged (zombie mode): you can't "kill" taggers (they revive),
  // so there's no early win — only the timer (updateScenarioTimer) wins it, and
  // a tag (handled in the tagger AI) loses it. Nothing to check here.
}

// v1.34: is an NPC still a combatant in the round? Where a lives pool exists
// (team battles), "in the fight" means lives remain — a kid mid-respawn
// (health 0, state 'retreating') still counts. Otherwise it's the classic
// health-based test. Single source of truth for win-condition + ally checks.
function npcInFight(e) {
  if (!e) return false;
  if (typeof e.lives === 'number') return e.lives > 0;
  return e.health > 0;
}

// v1.152: the "last kid comes looking" clock (called once a frame per live kid from updateEnemies). `_boredT` counts
// seconds he has stayed within 2 m of `_boredAt` without firing with a line (spawnEnemyBB zeroes it); past his
// `_boredAfter` (25-30 s) he is `_bored` and the hiding case marches him. Only the last one or two of a side get bored.
// v1.184 (decisions D.19, Michael: C): any ally of yours gets bored the same way, in every match and however many are
// left: a cautious ally beside your start (Night Swim's Brooke, Night Game in the Woods' Rebecca) hid all round. Snipers,
// defenders and VIPs still hold.
const BORED_MOVE_M = 2;
function updateKidBoredom(e, dt) {
  const sc = Game.scenario;
  const wc = sc.winCondition || 'kill_all';
  const ally = combatantTeam(e) === combatantTeam(Game.player);
  const eligible = (ally ? !sc.ffa && !e.vip
      : (wc === 'kill_all' || wc === 'last_team_standing') && !sc.ffa && sc.scenarioType !== 'defend') &&
    e.weapon !== 'sniper' && e.role !== 'defender' && e.behavior !== 'tagger' && !e.noFire &&
    e.state !== 'retreating' && e.state !== 'deploying' && !inOpeningHold();
  if (!e._boredAt || !eligible) {
    e._boredAt = { x: e.pos.x, z: e.pos.z };
    e._boredT = 0;
    if (!eligible) e._bored = false;
    return;
  }
  if (e._boredAfter == null) e._boredAfter = 25 + gameRandom() * 5;
  if (Math.hypot(e.pos.x - e._boredAt.x, e.pos.z - e._boredAt.z) > BORED_MOVE_M) {
    e._boredAt.x = e.pos.x; e._boredAt.z = e.pos.z;
    e._boredT = 0;
  } else {
    e._boredT += dt;
  }
  if (e._bored || e._boredT < e._boredAfter) return;
  const side = combatantTeam(e);
  const sideLeft = sc.enemies.filter(k => npcInFight(k) && combatantTeam(k) === side).length;
  // v1.278: nor need a kid the crew's numbers added to their side. Fitted to a crew of five, the Eighteenth's 3 became 6;
  // Brooke (aggression 0.35) took Jamie's pool spot 55 m off and hid all round in 3 runs of 8, two of them with Jamie.
  if (sideLeft > 2 && !ally && !e.crewFill) return;   // v1.184: an ally needn't be the last
  e._bored = true;
  e._boredCount = (e._boredCount || 0) + 1;
  tryNpcSpeak(e, 'taunt');
  if (e.state === 'hiding' || e.state === 'peeking') {
    e.state = 'advancing';
    e.stateTime = 0;
    e.advanceCheckTimer = 0;
  }
}

// True if any living enemy-list combatant is on the given team (an ally of it).
function hasLivingAlly(team) {
  if (!Game.scenario || !Game.scenario.enemies) return false;
  return Game.scenario.enemies.some(e => npcInFight(e) && (e.team || 'enemy') === team);
}

// v1.9: per-frame scenario timer tick (called from main loop during scenarios)
function updateScenarioTimer(dt) {
  if (Game.mode !== 'scenario') return;
  const wc = Game.scenario.winCondition;
  if (wc !== 'survive_timer' && wc !== 'survive_untagged') return;
  if (Game.scenario.timerRemaining == null) return;
  Game.scenario.timerRemaining -= dt;
  // Win when timer hits zero (and there are still attackers — if everyone's
  // already dead, checkWinCondition already triggered the win above)
  if (Game.scenario.timerRemaining <= 0) {
    Game.scenario.timerRemaining = 0;
    // Mark as a timer-win so endScenario can show the right flavor
    Game.scenario.winByTimer = true;
    endScenarioLater('win', 400);
    // Prevent re-firing
    Game.scenario.winCondition = '__finished__';
  }
}

// v1.9: render the timer HUD value
function updateTimerHud() {
  const hud = document.getElementById('timerHud');
  if (!hud) return;
  if (Game.scenario.ctf) { updateCtfHud(hud); return; }   // v1.189: the flags' score and what is happening to them
  hud.classList.remove('urgent');
  if (Game.scenario.pickupClock) {   // v1.204: the pickup clock, and the lives left that it is decided on
    const left = Math.max(0, Math.ceil(Game.scenario.pickupClock - (Game.scenario.roundTime || 0)));
    const L = Game.scenario.pickupTimeUp || pickupLivesLeft();
    hud.style.display = 'block';
    document.getElementById('timerValue').textContent = pickupClockText(left);
    const lbl = document.getElementById('timerLabel');
    if (lbl) lbl.textContent = Game.scenario.ffa ? `YOUR LIVES ${L.ours} · MOST ${L.theirs}` : `LIVES ${L.ours}–${L.theirs}`;
    hud.classList.toggle('urgent', left <= 30);
    return;
  }
  const winCondition = Game.scenario.winCondition;
  if (winCondition !== 'survive_timer' && winCondition !== 'survive_untagged') {
    hud.style.display = 'none';
    return;
  }
  hud.style.display = 'block';
  const t = Math.max(0, Game.scenario.timerRemaining || 0);
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  document.getElementById('timerValue').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  // v1.25: relabel for zombie mode.
  const lbl = document.getElementById('timerLabel');
  if (lbl) lbl.textContent = (winCondition === 'survive_untagged') ? 'DON\u2019T GET TAGGED' : 'HOLD OUT';
  hud.classList.toggle('urgent', t <= 10);
}
