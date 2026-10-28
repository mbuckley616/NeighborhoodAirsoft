
// ---------------------------------------------------------------------
// BB PROJECTILES — the core gimmick (unreliable trajectory past curve onset)
// ---------------------------------------------------------------------
function fireBB() {
  if (Game.scenario.stats) Game.scenario.stats.shots++;   // v1.193: one per trigger pull, pellets or not
  // Spawn at gun muzzle, direction = camera forward
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(Game.camera.rotation);
  const pos = Game.camera.position.clone().add(forward.clone().multiplyScalar(0.4));
  // Spread — reduced by ADS
  const spreadMult = 1 - Game.player.ads * (1 - Game.gun.adsSpreadMult);
  // v1.26: an equipped sight/laser on this gun tightens hipfire spread.
  const attachMult = getEquippedAttachmentSpreadMult();
  const baseSpread = Game.gun.baseSpread * spreadMult * attachMult;
  // v1.40b: MOVEMENT SPREAD. The earlier multiplier was too small to read on top
  // of the tiny base jitter, so movement now adds a SEPARATE cone term
  // proportional to muzzle velocity (so it's the same *angular* bloom regardless
  // of how fast the gun shoots) and to the current aim sway. Resulting cone at
  // 10m (pistol): ~16cm standing, ~12cm crouched, ~47cm walking, ~74cm in the
  // moments right after sprinting (sway lingers as you stop to shoot). ADS and
  // crouch shrink `sway` upstream AND ADS damps this term further, so aimed shots
  // stay tight. Tunable via MOVE_SPREAD_K.
  const MOVE_SPREAD_K = 0.10;
  const moveSpread = Game.player.sway * MOVE_SPREAD_K * (Game.gun.muzzleVelocity || 30) * underPartMult('moveSpreadMult');   // v1.169: foregrip
  // Multi-pellet support: per-shot pellet count (1 for most guns, 2-3 for shotgun).
  // v1.16: each pellet consumes a BB from the mag, so cap the count to what's
  // actually loaded — a shotgun with 2 BBs left fires 2 pellets, not 3.
  let pelletCount = Game.gun.pelletsPerShot ? Game.gun.pelletsPerShot() : 1;
  pelletCount = Math.max(1, Math.min(pelletCount, Game.gun.ammo));
  // For multi-pellet shots, widen spread a bit so pellets actually spread
  const pelletSpreadBoost = pelletCount > 1 ? 1.6 : 1.0;
  for (let i = 0; i < pelletCount; i++) {
    const vel = forward.clone().multiplyScalar(Game.gun.muzzleVelocity);
    // base velocity jitter (gun's intrinsic accuracy) + movement cone (sway).
    const s = baseSpread * pelletSpreadBoost;
    const m = moveSpread * (Game.player.ads > 0 ? (1 - Game.player.ads * 0.6) : 1);
    vel.x += (gameRandom() - 0.5) * s + (gameRandom() - 0.5) * m;
    vel.y += (gameRandom() - 0.5) * s + (gameRandom() - 0.5) * m;
    vel.z += (gameRandom() - 0.5) * s;
    // Ship B: tag with the player's team (combatantView resolves it; 'player'
    // today, but reads a future Game.player.team if Ship C sets one).
    const bb = makeBB(pos.clone(), vel, 'player', null, null, combatantView(Game.player).team);
    Game.scenario.bbs.push(bb);
    if (Net.active) netShot(bb);   // v1.230 (D.2): the same shot flies in your friend's game
  }
  return pelletCount;  // how many BBs this shot consumed
}

// v1.26: cosmetic BB colors (player). v1.41: enemies now fire an assigned color
// (deterministic per charId) instead of all-white, and a 'glow' option emits light.
const BB_COLORS = {
  white:  0xffffff,
  green:  0x6cff8a,
  pink:   0xff77c8,
  orange: 0xff9a3c,
  blue:   0x6cc8ff,
  yellow: 0xfff04a,
  glow:   0xcaffb0,   // v1.41 glow-in-the-dark
};
// Which player colors are "glowing" (emit a PointLight + strong self-glow).
const BB_GLOW_COLORS = new Set(['glow']);
function playerBBColorHex() {
  return BB_COLORS[Game.persist?.bbColor] ?? 0xffffff;
}

// v1.41: per-NPC BB colors. Each kid is assigned a stable color so you can tell
// whose rounds are whose in a firefight (and littered BBs read as "that was
// Tyler"). Derived by hashing charId into a palette — deterministic, no per-
// character data entry, and auto-covers any future roster addition. The palette
// deliberately AVOIDS plain white (that's the unowned/neutral look) and skips
// the player's glow so a glowing streak always means "that's mine".
const NPC_BB_PALETTE = [
  0xff5a4a, // red
  0x5ab0ff, // sky blue
  0x8a6cff, // violet
  0xffc24a, // amber
  0x4affd0, // teal
  0xff6cc8, // magenta
  0xaaff5a, // lime
  0xff9a3c, // orange
];
function npcBBColorHex(charId) {
  if (!charId) return 0xff5a4a;
  let h = 0;
  for (let i = 0; i < charId.length; i++) h = (h * 31 + charId.charCodeAt(i)) >>> 0;
  return NPC_BB_PALETTE[h % NPC_BB_PALETTE.length];
}

// v1.41: de-collide enemy BB colors within one scenario. Starting from each
// kid's stable hash color, walk the enemy-team combatants and, when two would
// share a color, bump the later one to the nearest unused palette slot. Beyond
// 8 hostiles the palette is exhausted and colors repeat (acceptable — that many
// shooters on screen is rare and the hash color is still a sane default).
function assignScenarioBBColors(enemies) {
  if (!enemies || !enemies.length) return;
  const used = new Set();
  for (const e of enemies) {
    // Only hostiles need unique colors; allies (team 'player') aren't shooting you.
    if (e.team && e.team !== 'enemy') continue;
    let c = (typeof e.bbColorHex === 'number') ? e.bbColorHex : npcBBColorHex(e.charId);
    if (used.has(c)) {
      const alt = NPC_BB_PALETTE.find(p => !used.has(p));
      if (alt !== undefined) c = alt;   // else palette exhausted → keep the clash
    }
    e.bbColorHex = c;
    used.add(c);
  }
}

// Build a BB with a fixed per-BB curve direction.
// Real airsoft BBs have backspin (or random axis spin due to hop-up imperfections)
// that causes a consistent curve in one direction throughout flight.
// `gunSpec` is optional — defaults to the player's current gun. Lets enemies fire
// with their own gun's profile in the future.
function makeBB(pos, vel, owner, enemyRef, gunSpec, team) {
  const spec = gunSpec || {
    curveOnsetDistance: Game.gun.curveOnsetDistance,
    curveStrengthMax: Game.gun.curveStrengthMax,
    curveStrengthMin: Game.gun.curveStrengthMin,   // v1.250
  };
  // Random curve axis perpendicular to flight direction
  const forward = vel.clone().normalize();
  // Pick a random angle around the forward axis (0 = up, π/2 = right, etc.)
  const curveAngle = gameRandom() * Math.PI * 2;
  // Build a perpendicular vector: take an arbitrary up, get perpendicular to forward, rotate by curveAngle
  const worldUp = Math.abs(forward.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const curveDir = up.clone().multiplyScalar(Math.sin(curveAngle))
                   .add(right.clone().multiplyScalar(Math.cos(curveAngle)));
  // Most BBs curve gently, a few curve hard (long-tail distribution)
  // Curve strength = (random^2) * max — biases toward small values
  const r = gameRandom();
  const curveMax = spec.curveStrengthMax ?? 18;
  const curveStrength = r * r * curveMax + (spec.curveStrengthMin ?? 1.5);   // v1.250: a floor of its own for the curving cheap guns

  return {
    pos,
    vel,
    age: 0,
    spawnPos: pos.clone(),                         // origin, for distance-traveled check
    curveOnsetDistance: spec.curveOnsetDistance ?? 4,
    curveDir,           // fixed unit vector — direction of curve
    curveStrength,      // magnitude of perpendicular acceleration
    bouncesLeft: 2,     // how many times it can bounce before despawning
    owner,
    // Ship B: team = the SHOOTER's faction. Drives hit routing (a BB hits any
    // combatant on a different team). Falls back to owner if a caller doesn't
    // pass it, so old two-sided behavior is preserved: 'player'→'player' team,
    // anything else→'enemy' team.
    team: team || (owner === 'player' ? 'player' : 'enemy'),
    enemyRef: enemyRef || null,
    canDamage: true,    // bounced BBs don't damage
    mesh: (function(){
      // v1.41: player rounds use the chosen cosmetic color (which may glow);
      // enemy rounds use that NPC's assigned palette color (never glowing, so a
      // glowing streak always reads as the player's).
      let color, glow = false;
      if (owner === 'player') {
        color = playerBBColorHex();
        glow = BB_GLOW_COLORS.has(Game.persist?.bbColor);
      } else {
        color = enemyRef?.bbColorHex ?? npcBBColorHex(enemyRef?.charId);
      }
      return spawnBBMesh(pos, color, glow);
    })(),
  };
}

// v1.77: COVER-CLEARANCE PROBE. A kid tucked right behind a bin/wall/car was
// firing its BB straight into the back of that cover (the round spawned at
// shoulder height ~1.05m but the cover top was taller, so it buried into the
// mesh — "Sean firing the AK into the top of the recycling bin"). This finds the
// nearest cover the kid is firing OVER: a cover obstacle whose footprint sits
// just in front of the kid (within `reach`) along the firing bearing, and whose
// world-top rises above the kid's normal muzzle. Returns { top } (world Y of the
// cover top) or null. Cheap: one pass over the scenario cover list, only the
// ones close + roughly ahead are measured. Works for AABB and cylinder cover;
// honors baseY (the slope-seated base) so it's correct on Winnmark/Bunratty.
function coverInFrontTop(enemy, dirX, dirZ, reach = 1.6) {
  const cover = Game.scenario && Game.scenario.cover;
  if (!cover) return null;
  const ex = enemy.pos.x, ez = enemy.pos.z;
  const dl = Math.hypot(dirX, dirZ) || 1;
  const ux = dirX / dl, uz = dirZ / dl;
  let bestTop = -Infinity;
  for (const c of cover) {
    const h = c.h || 0;
    if (h < 0.4) continue;                         // low stuff never blocks a shoulder shot
    // Cover center (AABB or cylinder both expose a center via min/max or cx/cz).
    const cx = (c.cx != null) ? c.cx : ((c.minX + c.maxX) / 2);
    const cz = (c.cz != null) ? c.cz : ((c.minZ + c.maxZ) / 2);
    const tx = cx - ex, tz = cz - ez;
    const along = tx * ux + tz * uz;               // distance along the firing bearing
    if (along <= 0 || along > reach) continue;      // must be just AHEAD of the kid
    const perp = Math.abs(tx * (-uz) + tz * ux);    // lateral offset from the bearing
    // Footprint half-width (broad): AABB diagonal-ish, or cylinder radius.
    const halfW = (c.radius != null)
      ? c.radius
      : Math.max((c.maxX - c.minX), (c.maxZ - c.minZ)) / 2;
    if (perp > halfW + 0.4) continue;               // bearing doesn't cross this cover
    const top = (c.baseY || 0) + h;
    if (top > bestTop) bestTop = top;
  }
  return (bestTop > -Infinity) ? { top: bestTop } : null;
}

// v1.101: OPENING HOLD (Michael, decision on Devon's opening shot: A). No kid fires
// in the first 2.5 s after BEGIN, on any map; they still move, peek and aim. A kid
// with a line to the spawn (Devon in Two in the Yards, 37 m) had been tagging a
// player who hadn't moved yet at ~1.5 s, in a one-life match.
const OPENING_HOLD_SEC = 2.5;
// v1.316: a match may hold longer (`openingHoldSec`): Hold the Bunker, where the twins had about 8 s of ladder to climb
// before anyone could tag you, and on the open course Haden's UMP tagged a player standing at the start at 2.8 s.
function inOpeningHold() {
  if (Game.mode !== 'scenario') return false;
  const sc = SCENARIOS[Game.scenario.active];
  return (Game.scenario.roundTime || 0) < ((sc && sc.openingHoldSec) || OPENING_HOLD_SEC);
}

// v1.176: the kids' clock, in simulated seconds (plus 1, so a stamp taken at BEGIN is truthy). Their spotted memory,
// near-miss stamps and reaction cooldown read performance.now(), the wall clock, so a headless test that steps faster
// or slower than real time saw them last more or fewer game seconds than a player does (Lights Out's Devon: 0 shots in
// a loaded full run). At a steady 60 fps the two agree, so play is unchanged.
function aiNow() {
  return (Game.scenario && Game.scenario.roundTime || 0) + 1;
}

function spawnEnemyBB(enemy, targetPos) {
  // v1.58: a hard "never fires" gate. Tutorial practice dummies set noFire so they
  // are truly inert targets — low fireRate alone still let one early shot slip out
  // when the player first approached. This is the single emission chokepoint, so
  // returning here guarantees zero BBs from a flagged enemy.
  if (enemy.noFire) return;
  if (inOpeningHold()) return;   // v1.101: catches suppression and reaction rounds too
  if (enemy._graceT > 0) enemy._graceT = 0;   // v1.291 (D.49): his own shot ends his grace
  // v1.183 (D.16 B): no shot while his body is still turning onto the line (it turns in about 0.2 s)
  if (targetPos && typeof enemy.yaw === 'number') {
    const want = Math.atan2(targetPos.x - enemy.pos.x, targetPos.z - enemy.pos.z);
    if (Math.abs(Math.atan2(Math.sin(want - enemy.yaw), Math.cos(want - enemy.yaw))) > KID_FIRE_TURN) {
      // v1.183 fix-up: keep the aim-hold armed while he swings onto the line (as v1.94 did for the clear-line hold),
      // or his shouldered hold eases out mid-burst (tests/burst-pose)
      enemy._aimHold = Math.max(enemy._aimHold || 0, 0.3);
      enemy._turnHeld = (enemy._turnHeld || 0) + 1; return;
    }
  }
  // v1.165 (Found in play, Michael: C on Hold the Treehouse): Evan by the shed, 11 m behind a player who starts facing
  // the ladder, tagged a standing player at 2.7-9.6 s in 8 of 8 rounds, before the twins climbed. He holds until the
  // first twin reaches the foot of the ladder, then shoots at anything above the rail as before.
  if (enemy.holdUntilLadder && !Game.scenario.ladderReached) return;
  // v1.316 (D.55 step 6): the same rule on the twins' course, with no ladder: Evan in the nest behind Hold the Bunker
  // holds until the first twin is within holdUntilNear metres of the player. Once set it stays set for the round.
  if (enemy.holdUntilNear && !Game.scenario.attackNear) {
    const P = Game.player.pos;
    if (!Game.scenario.enemies.some(k => k !== enemy && k.health > 0 && k.team !== 'player' && Math.hypot(k.pos.x - P.x, k.pos.z - P.z) < enemy.holdUntilNear)) return;
    Game.scenario.attackNear = true;
  }
  // v1.364 (D.72): on the course a kid lets the cart come to him: no shot at it past RIDE.range (as it passes, not as
  // it drives at him down a run from 25 m)
  if (Game.scenario.race && Game.scenario.race.ride && targetPos && Math.hypot(targetPos.x - Game.player.pos.x, targetPos.z - Game.player.pos.z) < 1.5 &&
      Math.hypot(targetPos.x - enemy.pos.x, targetPos.z - enemy.pos.z) > RIDE.range) return;
  // v1.152: a shot with a line on his target is not boredom: the clock restarts and a bored kid settles back in.
  if (enemy._hasLOSNow) { enemy._boredT = 0; enemy._bored = false; }
  // Muzzle height: when shooting, the enemy may be lifted above their cover by
  // updateEnemies (so they shoot OVER the cover, not into it). We mirror that
  // here by adding the current mesh.group.position.y to the base muzzle height.
  //
  // Account for the character's height scale so taller kids have a higher muzzle.
  // 1.05m × scaleY → ~0.92m for short kids (0.88), ~1.18m for tall kids (1.12).
  const muzzlePos = enemy.pos.clone();
  const baseMuzzleY = 1.05;
  const sY = enemy.mesh.scaleY ?? 1.0;
  // v1.28m: muzzle = terrain height (enemy.pos.y, planted at the top of the enemy
  // loop) + shoulder height. We DON'T fold in group.position.y here: the shooting
  // states set group.position.y = 0 (flat-ground assumption), so the old
  // `lift = group.y - pos.y` term evaluated to -terrainY and dragged the muzzle
  // underground on a slope — enemy BBs then spawned in the dirt and trickled.
  // Any genuine over-cover lift is small and not worth reintroducing that bug.
  muzzlePos.y += baseMuzzleY * sY;
  // Offset to gun-hand side
  const right = new THREE.Vector3(Math.cos(enemy.yaw), 0, -Math.sin(enemy.yaw));
  muzzlePos.add(right.multiplyScalar(0.25));

  // v1.77: CLEAR THE COVER. If the kid is tucked right behind a bin/wall/car (so
  // its shoulder-height muzzle would punch the BB straight into the cover mesh),
  // raise the spawn point to just over the cover's top. Capped at +0.7m above the
  // normal muzzle so a kid behind a car (~1.15m top) lifts to a believable "leaning
  // over the hood" line rather than levitating. We flag the kid so the per-frame
  // pose pass can show it ADS/peeking-tall, so the higher BB origin reads right.
  const _coverAhead = coverInFrontTop(enemy, targetPos.x - enemy.pos.x, targetPos.z - enemy.pos.z);
  if (_coverAhead) {
    const clearY = _coverAhead.top + 0.12;          // just over the lip
    const maxLift = muzzlePos.y + 0.7;              // believable lean-over ceiling
    const wantY = Math.min(clearY, maxLift);
    if (wantY > muzzlePos.y) {
      muzzlePos.y = wantY;
      enemy._firingOverCover = 0.45;                // seconds the over-cover lift holds
    }
  }
  // v1.78: arm the aim-hold so the two-handed shouldered/forward hold persists
  // across a burst and for a short beat after the last round (the pose pass eases
  // it back to the rest hold once this decays). v1.94: armed BEFORE the clear-line
  // check, so a kid holding fire keeps its hold instead of easing out mid-burst.
  enemy._aimHold = Math.max(enemy._aimHold || 0, 0.3);

  // v1.93: CLEAR LINE. The v1.77 lift only knows the cover list and measures each
  // piece from its centre, so kids still put ~a quarter of their BBs into a fence,
  // a wall or the near end of a car within 3 m (tests/cover-fire). Cast the shot's
  // first 3 m (or up to just short of the target) against every obstacle; if it's
  // blocked, raise the muzzle in 10 cm steps up to the same +0.7 m cap until the
  // line clears. If nothing clears it (a house wall, a tall fence), the kid holds
  // fire: no BB, no sound. It's the same outcome for the player, minus a BB in the wall.
  {
    const obs = Game.player && Game.player.obstacles;
    if (obs && obs.length) {
      const baseY = enemy.pos.y + baseMuzzleY * sY;
      const capY = baseY + 0.7;
      const tdx = targetPos.x - muzzlePos.x, tdz = targetPos.z - muzzlePos.z;
      const flat = Math.hypot(tdx, tdz);
      const reach = Math.min(3.0, flat - 0.3);
      if (reach > 0.2) {
        let y = muzzlePos.y, clear = false;
        for (; y <= capY + 1e-6; y += 0.1) {
          const dx = tdx, dy = targetPos.y - y, dz = tdz;
          const dl = Math.hypot(dx, dy, dz) || 1;
          // reach is a horizontal distance; convert to distance along the ray
          const rayReach = reach * dl / (flat || 1);
          // v1.101: and with a 10 cm margin under it. The BB leaves with its aim
          // spread (6–12 cm up or down at 3 m), so a line that just skimmed a bin's
          // lip still put a share of shots into it (Sean in the Bunratty 2v2).
          if (raycastObstacles(muzzlePos.x, y, muzzlePos.z, dx / dl, dy / dl, dz / dl, rayReach, obs) >= rayReach &&
              raycastObstacles(muzzlePos.x, y - 0.1, muzzlePos.z, dx / dl, dy / dl, dz / dl, rayReach, obs) >= rayReach) { clear = true; break; }
        }
        // can't see past it: hold fire. v1.112: and let go of the trigger, so an
        // auto's queued follow-ups don't each try the same blocked line again.
        // v1.122: count blocked pulls in a row; the 'shooting' state moves a kid on after three.
        if (!clear) { if (enemy.pendingBurst) enemy.pendingBurst.length = 0; enemy._lineHolds = (enemy._lineHolds || 0) + 1; enemy._lineHoldAt = { x: enemy.pos.x, z: enemy.pos.z }; return; }
        enemy._lineHolds = 0;
        if (y > muzzlePos.y + 1e-6) {
          muzzlePos.y = y;
          enemy._firingOverCover = 0.45;
        }
      }
    }
  }

  // v1.9: enemy fires their own weapon's spec, not the player's gun
  const weaponType = enemy.weapon || 'pistol';
  const enemySpec = GUN_SPECS[weaponType] || GUN_SPECS.pistol;

  const baseDir = targetPos.clone().sub(muzzlePos).normalize();
  // Aim noise scales inverse to character accuracy AND weapon's base spread.
  // accuracy 0.0 → spread ±0.12; 0.5 → ±0.08; 1.0 → ±0.04
  // Snipers in kid hands tighten this further (sniper baseSpread is much smaller);
  // shotguns widen it.
  const accuracy = enemy.character?.accuracy ?? 0.5;
  const weaponSpreadMod = enemySpec.baseSpread / 0.4;   // pistol = 1.0 baseline
  const baseSpread = (0.12 - accuracy * 0.08) * weaponSpreadMod;

  // Multi-pellet support — shotgun-carrying kids spray 2-3 pellets per trigger pull
  const pelletCount = enemySpec.pelletsPerShot ? enemySpec.pelletsPerShot() : 1;
  const pelletSpreadBoost = pelletCount > 1 ? 1.6 : 1.0;

  // v1.137 fix-up: the clear line (above) checks the aim line and 10 cm under it, but the spread drawn here can
  // still swing a BB sideways into the near corner of what the kid is beside (tests/car-side-fire: 1 BB in 5978
  // into the lane car's cabin). Each BB's own first metres are cast too: one that would hit something redraws its
  // spread, and after four tries goes down the aim line, which the clear line has already passed.
  const nearObs = Game.player && Game.player.obstacles;
  const nearReach = Math.min(3.0, Math.hypot(targetPos.x - muzzlePos.x, targetPos.z - muzzlePos.z) - 0.3);
  for (let i = 0; i < pelletCount; i++) {
    let dir;
    for (let tries = 0; ; tries++) {
      if (tries >= 4) { dir = baseDir.clone(); break; }
      dir = baseDir.clone();
      const s = baseSpread * pelletSpreadBoost;
      dir.x += (gameRandom() - 0.5) * s;
      dir.y += (gameRandom() - 0.5) * (s * 0.6);
      dir.z += (gameRandom() - 0.5) * s;
      dir.normalize();
      if (!nearObs || !nearObs.length || nearReach <= 0.2) break;
      const rr = nearReach / Math.max(0.05, Math.hypot(dir.x, dir.z));
      if (raycastObstacles(muzzlePos.x, muzzlePos.y, muzzlePos.z, dir.x, dir.y, dir.z, rr, nearObs) >= rr) break;
    }
    const vel = dir.multiplyScalar(enemySpec.muzzleVelocity * 0.9);
    const bb = makeBB(muzzlePos.clone(), vel, 'enemy', enemy, enemySpec, combatantView(enemy).team);
    // Ship C: record who this shot was aimed at, so that combatant can detect
    // "I'm being shot at by <enemy>" and prioritize them (anti-tunnel-vision).
    bb.intendedTarget = enemy._targetRef || null;
    Game.scenario.bbs.push(bb);
    if (Net.active && Net.role === 'host') netShot(bb, enemy);   // v1.366 (D.2 step 2): online, the host's kids' shots fly in every game
  }
  // v1.337 (D.28 step 4): a kid on a gun you lent him fires your BBs; out of them, he goes back to his own gun
  const loan = enemy.crewLoan;
  if (loan && enemy.weapon === loan.gun) { loan.bbs = Math.max(0, loan.bbs - pelletCount); if (loan.bbs <= 0) crewKidOwnGun(enemy); }
  playShot(enemy.pos.x, enemy.pos.z);  // v1.21: positional — heard louder + panned from enemy's location
}

let _bbGeom = null, _bbMatPlayer = null, _bbMatEnemy = null;
function spawnBBMesh(pos, color, glow) {
  if (!_bbGeom) _bbGeom = new THREE.SphereGeometry(0.04, 8, 6);
  // v1.16: glossy white BBs (real airsoft BBs are shiny white plastic). A lit
  // standard material with low roughness + slight emissive picks up scene light
  // and reads glossy/visible, vs the old flat MeshBasic pale-yellow.
  // v1.41: glow rounds crank emissive way up so they read as bright tracers.
  // v1.41a: the actual scene illumination comes from a FIXED pool of lights
  // (see GlowLightPool) reassigned each frame — NOT a per-BB child light. A
  // child light changed the scene's light count on every spawn/despawn, which
  // forced three.js to recompile all MeshStandardMaterial shaders (the stutter).
  // The pool keeps the light count constant, so shaders compile once.
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.18,
    metalness: 0.0,
    emissive: glow ? color : 0xffffff,
    emissiveIntensity: glow ? 1.6 : 0.18,
    fog: glow ? false : true,   // glow rounds stay vivid through night fog
  });
  const m = new THREE.Mesh(_bbGeom, mat);
  m.position.copy(pos);
  if (glow) m._glow = true;   // marker: tracer look + eligible for a pool light
  Game.scene.add(m);
  return m;
}

// v1.41: landed glow BBs keep a slightly dimmer emissive (still clearly lit).
// v1.41a: no child light to strip anymore — this just eases the emissive down
// so a spent round reads as "resting" vs an active tracer. The pool stops
// assigning lights to it naturally once it's no longer airborne.
function demoteGlowLight(mesh) {
  if (!mesh || !mesh._glow) return;
  mesh._glowLanded = true;   // pool skips landed rounds when picking lights
  if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
    mesh.material.emissiveIntensity = 1.1;
  }
}

// v1.41a: GLOW LIGHT POOL. A fixed number of PointLights live in the scene for
// the whole session. The scene's light count therefore never changes when glow
// BBs come and go, so three.js never recompiles its standard-material shaders
// mid-fight (that recompile was the stutter). Each frame we pick the most
// relevant airborne glow rounds (closest to the camera) and snap a pooled light
// onto each; leftover lights are parked far below the map at zero intensity.
const GlowLightPool = {
  size: 6,            // plenty for a tracer read; safely under the recompile cliff
  lights: null,
  _scene: null,       // which scene the current lights belong to
  _ensure() {
    // Game.scene is rebuilt per scenario, so re-create the pool whenever it
    // changes (the old lights belong to a discarded scene and are GC'd with it).
    if (!Game.scene) return;
    if (this.lights && this._scene === Game.scene) return;
    this.lights = [];
    this._scene = Game.scene;
    for (let i = 0; i < this.size; i++) {
      const L = new THREE.PointLight(0xffffff, 0, 3.5, 2);
      L.position.set(0, -1000, 0);   // parked out of the world
      Game.scene.add(L);
      this.lights.push(L);
    }
  },
  // Called once per frame from updateBBs. `bbs` is the live BB array.
  update() {
    this._ensure();
    if (!this.lights) return;
    const cam = Game.camera ? Game.camera.position : null;
    // Candidate = airborne (not landed) glow BBs.
    const cand = [];
    const bbs = Game.scenario && Game.scenario.bbs ? Game.scenario.bbs : [];
    for (const bb of bbs) {
      const m = bb.mesh;
      if (m && m._glow && !m._glowLanded) {
        const d = cam ? m.position.distanceToSquared(cam) : 0;
        cand.push({ m, d });
      }
    }
    // Nearest-to-camera first so the lights you actually see get lit.
    cand.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i];
      if (i < cand.length) {
        const m = cand[i].m;
        L.position.copy(m.position);
        L.color.copy(m.material.color);
        L.intensity = 0.9;
      } else {
        L.intensity = 0;
        L.position.set(0, -1000, 0);
      }
    }
  },
};

// ---------------------------------------------------------------------
// TEAM-AWARE BB HIT ROUTING (Ship B)
// ---------------------------------------------------------------------
// Previously hit detection was two hardcoded blocks: enemy BBs only ever
// checked Game.player, player BBs only ever checked Game.scenario.enemies. That
// made friendly-AI / FFA impossible. Now a BB carries the shooter's `team`, and
// it can hit ANY alive combatant on a different team. The player and each enemy
// kid have different hitbox tests and different on-hit consequences, so the
// unified path routes by combatant type rather than pretending they're the same.
//
// In the current build the player is team 'player' and every enemy is team
// 'enemy', so this produces byte-identical behavior to the old two-block version
// — it's a generalization, not a gameplay change. Ship C assigns other teams.
function combatantTeam(c) {
  if (c === Game.player) return c.team || 'player';
  return c.team || 'enemy';
}

// Every targetable combatant this frame: the player plus all scenario enemies.
function listCombatants() {
  const out = [Game.player];
  if (Game.scenario && Game.scenario.enemies) {
    for (const e of Game.scenario.enemies) out.push(e);
  }
  return out;
}

// Geometry test: does this BB's position fall inside combatant c's hitbox?
// Player uses the eye-offset cylinder; kids use the per-part AABB (checkEnemyHit).
function bbHitsCombatant(bb, c) {
  if (c === Game.player) {
    const hitboxTop = Game.player.pos.y + Game.player.eyeOffset + 0.1;
    const hitboxBot = Game.player.pos.y + 0.05;
    const hitboxCenterY = (hitboxTop + hitboxBot) / 2;
    const halfH = (hitboxTop - hitboxBot) / 2;
    const dx = bb.pos.x - Game.player.pos.x;
    const dz = bb.pos.z - Game.player.pos.z;
    const dy = bb.pos.y - hitboxCenterY;
    const distH = Math.sqrt(dx*dx + dz*dz);
    return distH < 0.32 && Math.abs(dy) < halfH;
  }
  return checkEnemyHit(c, bb.pos);
}

// Is combatant c a valid target for this BB right now? (alive, different team,
// not a kid mid-retreat — retreating kids are "out" and BBs pass through them.)
function bbCanTarget(bb, c) {
  if (!bb.canDamage) return false;
  if (Net.active && Net.role === 'guest') return false;   // v1.230 (D.2): online, only the host's game tags
  if (combatantTeam(c) === bb.team) return false;
  if (c === Game.player) {
    return Game.player.hitsTaken < Game.player.maxHits;
  }
  // v1.237 (D.33): a kid who is out (hand up where he was tagged, or walking back) still stops YOUR BBs, and says so
  // v1.264 (decisions "Out kids and your BBs", Michael: B): one walking off the field has left everyone's lane
  if (c.health <= 0 || c.state === 'retreating') return bb.owner === 'player' && kidIsOutStanding(c) && !c._walkingOff;
  return true;
}
// v1.237 (backlog D.33, Michael 14 Oct: "Players that raise their arms and are 'out' should still be able to be shot, and
// if you shoot them, they should be mad and call you out for it"): out is a tagged kid standing with his hand up, or
// one walking back to respawn. A downed Infection tagger is slumped, not out, and still lets BBs through.
function kidIsOutStanding(c) {
  return c !== Game.player && c.behavior !== 'tagger';
}
// v1.264 (decisions "Out kids and your BBs: one-way cover?", critic 15 Oct; Michael: B): in a one-life match a kid who is
// out stood where he was tagged for the rest of the round, a shield against your BBs only (his teammates' pass through
// him). Now, as real players walk to the safe zone, after OUT_WALK_AFTER seconds with his hand up he walks back to his
// start, hand still up, and from his first step he is in nobody's lane: every BB passes him. Held up (no 0.3 m nearer
// in OUT_WALK_STUCK s) he stops where he is. A kid on a ladder, a perch or a platform, and the tutorial's, stay put.
const OUT_WALK_AFTER = 4.0, OUT_WALK_SPEED = 1.5, OUT_WALK_STUCK = 2.0;
function outKidWalkOff(e, dt) {
  if ((Tutorial.active && Tutorial.kind !== 'squad') || e.perch || e._lad || e._climbed || e._dropY != null || !kidIsOutStanding(e)) return;
  e._outT = (e._outT || 0) + dt;
  if (e._outT < OUT_WALK_AFTER || e._offField) return;
  const goal = e._spawnPos || e.anchorPos;
  if (!goal) return;
  e._walkingOff = true;
  const dx = goal.x - e.pos.x, dz = goal.z - e.pos.z, d = Math.hypot(dx, dz);
  if (d < 1.0) { e._offField = true; return; }
  kidTurnToward(e, Math.atan2(dx, dz), dt);
  e.mesh.group.rotation.y = e.yaw;
  const step = Math.min(d, OUT_WALK_SPEED * dt), nX = e.pos.x + dx / d * step, nZ = e.pos.z + dz / d * step;
  if (!collidesObstacles(nX, nZ, 0.35)) { e.pos.x = nX; e.pos.z = nZ; e._offSide = 0; }
  else {
    // v1.344: square on to something (the bulb's car sits right on the line from a tag in front of it to Seth's start
    // behind it) the slide gains nothing: he steps sideways round it, and keeps stepping to that side until the way
    // on is clear (sliding back to the line in between would undo each step)
    const x0 = e.pos.x, z0 = e.pos.z, side = sd => { const sX = x0 - dz / d * step * sd, sZ = z0 + dx / d * step * sd;
      if (collidesObstacles(sX, sZ, 0.35)) return false; e.pos.x = sX; e.pos.z = sZ; e._offSide = sd; return true; };
    if (!(e._offSide && side(e._offSide))) {
      e._offSide = 0;
      if (!collidesObstacles(nX, e.pos.z, 0.35)) e.pos.x = nX;
      if (!collidesObstacles(e.pos.x, nZ, 0.35)) e.pos.z = nZ;
      if (Math.hypot(e.pos.x - x0, e.pos.z - z0) < step * 0.25) { e.pos.x = x0; e.pos.z = z0; side(1) || side(-1); }
    }
  }
  const dNow = Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z);
  if (e._offBest == null || dNow < e._offBest - 0.3) { e._offBest = dNow; e._offStuck = 0; }
  else if ((e._offStuck = (e._offStuck || 0) + dt) > OUT_WALK_STUCK) { e._offField = true; return; }
  e._walkPhase = (e._walkPhase || 0) + 2 * Math.PI * kidGaitCadence(OUT_WALK_SPEED) * dt;
  setKidWalk(e.mesh, e._walkPhase, 0.8);
  e.mesh.group.position.x = e.pos.x; e.mesh.group.position.z = e.pos.z;
}
const OUT_SHOT_LINE_GAP = 1.0;   // seconds (simulated) between a kid's out-shot complaints
function shotWhileOut(c, bb) {
  if (Game.scenario.stats) Game.scenario.stats.outShots = (Game.scenario.stats.outShots || 0) + 1;
  playHitOnEnemy();
  if (bb) startKidWince(c, bb);   // v1.261 (D.45): a BB on an out kid stings too
  const now = aiNow();
  if (c._outLineAt != null && now - c._outLineAt < OUT_SHOT_LINE_GAP) return;
  c._outLineAt = now;
  // he was just tagged, so his own 4 s voice cooldown (and the 1.5 s one for everybody) is likely still running:
  // being shot with his hand up is worth saying anyway
  c._voiceCooldownUntil = 0; VOICE.globalCooldownUntil = 0;
  tryNpcSpeak(c, 'shotWhileOut');
}

// Apply the hit's consequences for combatant c. Returns true if the BB should be
// removed (it always should on a confirmed hit). Routing by type preserves the
// distinct player-hit vs enemy-hit effects exactly as before.
function applyBBHit(bb, c) {
  if (c === Game.player) {
    if (Game.player._graceT > 0 || Game.player._goingHome) return true;   // v1.170: just back from a VIP-match respawn (v1.290: or walking home)
    // v1.263 (decisions "A trade on the last tag counts as a loss", Michael: A, 16 Oct): once the round is won (your
    // last tag landed and the win waits its 600 ms to show), a BB already in the air no longer tags you: a trade is yours.
    if (Game.scenario.wonRound === Game.roundSeq && Game.mode === 'scenario') return true;
    Game.player.hitsTaken++;
    if (Game.scenario.stats) Game.scenario.stats.hitOnYou++;   // v1.193
    if (Net.active) netTaggedBy(bb, Game.player);   // v1.230: your friend tagged you (v1.366: whichever friend, online)
    if (Game.scenario.stats && bb.pos) noteDamageOnYou(bb);   // v1.238 (D.34): where, by whom, with what
    playHitOnPlayer();
    // Shooter taunts the player after a hit (only enemy-fired BBs carry enemyRef).
    // v1.256 (D.32): the hit that puts you out is called louder (playerOut)
    const outNow = Game.player.hitsTaken >= Game.player.maxHits && Game.mode === 'scenario';
    if (bb.enemyRef && bb.enemyRef.health > 0) tryNpcSpeak(bb.enemyRef, outNow ? 'playerOut' : 'playerHit');
    flashDamage();
    updateHealthHud();
    // v1.90: only a live round can be lost (a BB landing after the result is up changes nothing)
    if (Game.player.hitsTaken >= Game.player.maxHits && Game.mode === 'scenario') {
      if (Game.scenario.ctf) ctfDrop(Game.player);   // v1.189: a flag you carried falls where you were tagged
      if (Game.scenario.vip || Game.scenario.ctf) startPlayerWalkHome();   // v1.170: in VIP you come back; only your VIP matters (v1.189: and in capture the flag; v1.290: on foot)
      else if (Net.active && Net.phase === 'play') netPlayerOut();   // v1.366 (D.2 step 2): online, out, you watch your side play on
      else endScenario('lose');
    } else if (Game.mode === 'scenario' && Game.scenario.race) {
      Game.player._graceT = RACE.grace;   // v1.354 (D.71): a tag in the go-cart costs a life; you roll on
    } else if (Game.mode === 'scenario' && SCENARIOS[Game.scenario.active] && (SCENARIOS[Game.scenario.active].pickup || SCENARIOS[Game.scenario.active].tagSendsHome)) {
      startPlayerWalkHome(true);   // v1.221: in a Pickup Game a tag costs a life and sends you back to your start, as a kid walks back to base
      // (v1.251: and in The Last Saturday, `tagSendsHome`)
    }
  } else {
    if (c.remote) return netTagRemote(bb, c);   // v1.230 (D.2): your friend, online
    if (c._graceT > 0 && c.health > 0 && c.state !== 'retreating') return true;   // v1.291 (D.49): just redeployed at his base
    if (c.health <= 0 || c.state === 'retreating') { shotWhileOut(c, bb); return true; }   // v1.237 (D.33): out already (v1.261: where)
    if (bb.owner === 'player' && Game.scenario.stats) noteMatchTag(bb, c);   // v1.193: your tag, for the result screen
    tryNpcSpeak(c, bb.owner === 'player' ? npcHitCategory(c) : 'npcHit');   // react before dying/retreating (v1.256: maybe an excuse)
    startKidWince(c, bb);   // v1.261 (D.45): he flinches where it landed
    callAllyDown(c);   // v1.256 (D.32): a teammate near him calls it
    // v1.151: the shooter calls a tag on another kid the way he calls one on you. The tagged kid speaks first;
    // the 1.5 s global cooldown then usually keeps the shooter quiet, so his call fills in when the tagged kid
    // was out of earshot or on his own cooldown.
    if (bb.enemyRef && bb.enemyRef !== c && bb.enemyRef.health > 0) tryNpcSpeak(bb.enemyRef, 'playerHit');
    playHitOnEnemy();
    eliminateEnemy(c);          // decides: permanent kill OR run-back-and-respawn
    if (bb.owner === 'player') showHitMarker(c);   // v1.321 (D.60)
    if (Net.active) netTaggedBy(bb, c);   // v1.366 (D.2 step 2): a friend's tag online, shown in his game
  }
  return true;
}
// v1.321 (backlog D.60, Michael 22 Oct: "hit markers would be cool as well, to confirm you were the one to hit
// someone"): your BB (or noodle) tagging a kid of the other side puts a white X round the middle of the screen for
// HIT_MARKER_SEC, red when the tag put him out for good. A kid already out, a teammate and a kid in his grace give none.
const HIT_MARKER_SEC = 0.3;
function showHitMarker(c) {
  if (combatantTeam(c) === combatantTeam(Game.player)) return;
  Game.hitMarkerT = HIT_MARKER_SEC;
  Game.hitMarkerOut = c.health <= 0 && c.state !== 'retreating' && !((c.lives | 0) > 0);
  Game.hitMarkers = (Game.hitMarkers || 0) + 1;
}
function hitMarkerStep(dt) {
  const el = document.getElementById('hitMarker');
  if (!el) return;
  if (Game.hitMarkerT > 0) Game.hitMarkerT = Math.max(0, Game.hitMarkerT - dt);
  const k = Game.mode === 'scenario' ? (Game.hitMarkerT || 0) / HIT_MARKER_SEC : 0;
  el.style.opacity = k > 0 ? Math.min(1, 0.35 + k).toFixed(2) : '0';
  el.style.transform = `translate(-50%, -50%) scale(${(1 + 0.25 * k).toFixed(3)})`;
  el.classList.toggle('out', !!Game.hitMarkerOut && k > 0);
}

// v1.170 (D.15): tagged out in a VIP match, you walk back in at your start with your lives refilled and VIP_GRACE
// seconds in which nothing tags you. The gun keeps what is in it; anything you were doing with it is let go.
// v1.291 (backlog D.49, Michael: A, 20 Oct: "3 s, ended early by your own shot; kids too"): was 2 s, kids had none. Your
// own shot ends it at once (doFire), and so does a kid's (spawnEnemyBB). A kid who walks back to his base in a match
// where you come back (comesBackMatch) gets the same 3 s as he redeploys, and nothing tags him in it. While yours runs,
// the panel at the top says how long is left.
const VIP_GRACE = 3.0;
function comesBackMatch() {
  const def = SCENARIOS[Game.scenario.active];
  return !!(Game.scenario.vip || Game.scenario.ctf || (def && (def.pickup || def.tagSendsHome)));
}
// v1.221 (decisions "Pickup Game: what is a life for you?", Michael: A): `keepHits` for the Pickup Game, where each tag is
// one of your lives gone (the HUD and the clock's count keep it) and the rest of a shotgun blast lands in the grace.
function respawnPlayerVip(keepHits) {
  const st = Game.scenario.playerStart;
  if (!st) return;
  Game.player.pos.copy(st.pos);
  Game.player.vel.set(0, 0, 0);
  Game.player.yaw = st.yaw;
  Game.player.pitch = 0;
  if (!keepHits) Game.player.hitsTaken = 0;
  Game.player.sliding = false;
  Game.player.adsTarget = 0;
  Game.player._goingHome = false;
  playerBackHome();
  Game.scenario.playerRespawns = (Game.scenario.playerRespawns || 0) + 1;
  updateHealthHud();
}
// The grace (and capture the flag's hold) as you are back at your start.
function playerBackHome() {
  Game.player._graceT = VIP_GRACE;
  if (Game.scenario.ctf) { Game.player._holdT = CTF_HOLD_SEC; Game.player._graceT = CTF_HOLD_SEC + VIP_GRACE; }   // v1.280 (D.47)
}
// v1.290 (backlog D.48, Michael: B, 20 Oct: "you walk yourself back, gun up, no firing, nothing tags you, an arrow points
// the way"): a tag that sends you back to your start no longer puts you there in one frame. You walk yourself home with
// the gun pointed at the sky: you can't aim, fire or swing, nothing tags you, kids don't pick you as a target and you
// can't take a flag, and an arrow at the top of the screen points to your start. Within HOME_REACH of it you are back:
// the respawn's grace (and capture the flag's hold) starts there. Online play keeps the jump home (its guest follows
// the host's word on where you are).
// v1.332 (backlog B.15, Michael 23 Oct: "getting shot should leverage the new 'return to your base' system"): online
// too. Each player walks himself home; his game says so in its ~30-a-second word (`g`), and the other game shows him
// gun up and lets nothing tag him till he is back and his grace is gone.
const HOME_REACH = 2.0;
function startPlayerWalkHome(keepHits) {
  const st = Game.scenario.playerStart;
  if (!st) { respawnPlayerVip(keepHits); return; }
  if (!keepHits) Game.player.hitsTaken = 0;
  Game.player.sliding = false;
  Game.player.adsTarget = 0;
  Game.player._graceT = 0;
  Game.player._holdT = 0;
  Game.player._goingHome = true;
  Game.scenario.playerRespawns = (Game.scenario.playerRespawns || 0) + 1;
  updateHealthHud();
  playerWalkHomeStep(0);
}
function playerWalkHomeStep(dt) {
  const P = Game.player, st = Game.scenario.playerStart;
  P._gunUp = P._goingHome ? Math.min(1, (P._gunUp || 0) + dt * 4) : Math.max(0, (P._gunUp || 0) - dt * 4);
  const hud = document.getElementById('homeHud');
  if (!P._goingHome || !st) {
    // v1.291 (D.49): back and let go, the grace counts down in the same panel
    const left = P._graceT > 0 && !(P._holdT > 0) && P._graceT <= VIP_GRACE + 0.01 && Game.scenario.winCondition !== '__finished__' && comesBackMatch() ? Math.ceil(P._graceT) : 0;
    if (hud) {
      if (!left) { if (hud.style.display !== 'none') hud.style.display = 'none'; }
      else {
        const line = `NOTHING TAGS YOU · ${left} · TILL YOU FIRE`;
        const txt = document.getElementById('homeText'), arrow = document.getElementById('homeArrow');
        if (txt && txt.textContent !== line) txt.textContent = line;
        if (arrow && arrow.style.display !== 'none') arrow.style.display = 'none';
        if (hud.style.display !== 'block') hud.style.display = 'block';
      }
    }
    return;
  }
  P.adsTarget = 0;
  const dx = st.pos.x - P.pos.x, dz = st.pos.z - P.pos.z, d = Math.hypot(dx, dz);
  if (d <= HOME_REACH) {
    P._goingHome = false;
    playerBackHome();
    playerWalkHomeStep(0);   // v1.291: the grace's panel from this frame
    return;
  }
  if (!hud) return;
  if (hud.style.display !== 'block') hud.style.display = 'block';
  { const arrow = document.getElementById('homeArrow'); if (arrow && arrow.style.display === 'none') arrow.style.display = ''; }
  // forward is (-sin yaw, -cos yaw); a start to your right turns the arrow clockwise
  let rel = Math.atan2(-dx, -dz) - P.yaw;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const arrow = document.getElementById('homeArrow');
  if (arrow) arrow.style.transform = `rotate(${(-rel).toFixed(2)}rad)`;
  const txt = document.getElementById('homeText');
  const line = `BACK TO YOUR START · ${Math.round(d)} m`;
  if (txt && txt.textContent !== line) txt.textContent = line;
}

// v1.189 (backlog D.15; decisions "After Bellfield's four", Michael: A): CAPTURE THE FLAG. One flag a side, each on its
// own base: 'ours' (blue, the player's side) and 'theirs' (red). Anyone on the other side who walks within CTF_TOUCH of a
// flag that nobody carries picks it up; carried to within CTF_HOME of his own side's base, it scores and goes back to
// its base (his own flag need not be home: "carry theirs home to score"). A carrier tagged drops it where he stood; a
// kid of its own side who touches it there sends it home, and so do CTF_RETURN_SEC on the ground. First to toWin.
// Everyone comes back when tagged (99 lives; the player respawns as in VIP), so the round ends only on flags.
const CTF_TOUCH = 1.3, CTF_HOME = 2.5, CTF_RETURN_SEC = 20, CTF_CARRIER_BONUS = 15, CTF_RUN_SPEED = 4.0, CTF_FIRE_RANGE = 18;
// v1.191 (decisions "Flags on Bellfield never ends", Michael: C): with no clock and two of their three kids by their flag,
// 8 of 8 critic rounds (150-240 s) never ended. Now `ctf.clock` seconds end the round on the score (more flags wins; a
// tie is a draw, paid as a loss), and a `ctf: 'push'` kid found within CTF_GUARD_R of his own flag runs to a point
// CTF_PUSH_D up the street (kidFlagRun, shooting on the move) and fights from there, so one kid a side keeps the flag.
const CTF_GUARD_R = 15, CTF_PUSH_D = 24;
// v1.280 (backlog D.47, Michael 18 Oct: "Capture the Flag needs a respawn timer, where enemies/teammates cannot start
// shooting again until they've been in their base for 10 seconds. The player should suffer the same penalty. You cannot
// move or shoot after you get back to your base for 10 seconds."): a kid tagged in capture the flag walks back to his
// base as before and then waits CTF_HOLD_SEC there, still out (no shot, no flag, nothing tags him), before he plays
// again. You come back at your start held for CTF_HOLD_SEC: you can look round but not move, jump, fire or swing, nothing
// tags you, and the flag box counts it down. The respawn's 2 s grace then starts as you are let go.
const CTF_HOLD_SEC = 10;
function ctfSide(c) { return combatantTeam(c) === combatantTeam(Game.player) ? 'ours' : 'theirs'; }
function ctfOther(side) { return side === 'ours' ? 'theirs' : 'ours'; }
function ctfAlive(c) {
  if (c === Game.player) return Game.player.hitsTaken < Game.player.maxHits && !(Game.player._holdT > 0) && !Game.player._goingHome;   // v1.280: not while held at base (v1.290: or walking home)
  return c.health > 0 && c.state !== 'retreating';
}
function ctfCarrying(c) {
  const C = Game.scenario.ctf;
  return !!C && (C.flags.ours.carrier === c || C.flags.theirs.carrier === c);
}
function ctfName(c) { return c === Game.player ? 'YOU' : (c.name || 'SOMEONE').toUpperCase(); }
function ctfSay(text) { const C = Game.scenario.ctf; if (C) C.msg = { text, t: 2.5 }; }
function buildCtfFlag(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.75, 8), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.4, roughness: 0.5 }));
  pole.position.y = 0.875; pole.castShadow = true; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), pole.material);
  knob.position.y = 1.77; g.add(knob);
  const clothPivot = new THREE.Group();
  clothPivot.position.y = 1.47; g.add(clothPivot);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.015), new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  cloth.position.x = 0.38; cloth.castShadow = true; clothPivot.add(cloth);
  g.userData.cloth = clothPivot;
  return g;
}
function buildCtfBase(color) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(CTF_HOME - 0.25, CTF_HOME, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.8 }));
  stand.position.y = 0.06; stand.receiveShadow = true; g.add(stand);
  return g;
}
function ctfSetup(def, built) {
  const flags = {};
  for (const [side, color] of [['ours', 0x2f6fe0], ['theirs', 0xd23a2a]]) {
    const p = findClearSpawn(def[side][0], def[side][1], built.obstacles, 0.5);
    const base = buildCtfBase(color); base.position.set(p.x, scenarioGroundY(p.x, p.z), p.z); built.scene.add(base);
    const mesh = buildCtfFlag(color); built.scene.add(mesh);
    flags[side] = { side, base: { x: p.x, z: p.z }, pos: { x: p.x, z: p.z }, carrier: null, dropped: false, dropT: 0, taken: 0, mesh, baseMesh: base };
  }
  const lanes = (def.lanes || []).map(([x, z]) => findClearSpawn(x, z, built.obstacles, 0.5));
  // v1.191: each side's push point, CTF_PUSH_D from its own base toward the other's
  const push = {};
  for (const side of ['ours', 'theirs']) {
    const a = flags[side].base, b = flags[side === 'ours' ? 'theirs' : 'ours'].base, L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    push[side] = findClearSpawn(a.x + (b.x - a.x) / L * CTF_PUSH_D, a.z + (b.z - a.z) / L * CTF_PUSH_D, built.obstacles, 0.5);
  }
  return { flags, lanes, push, score: { ours: 0, theirs: 0 }, toWin: def.toWin || 2, clock: def.clock || 0, timeUp: false,
    caps: [], log: [], msg: null, over: false, fields: new Map(), t: 0 };
}
function ctfHome(f) {
  f.carrier = null; f.dropped = false; f.dropT = 0;
  f.pos.x = f.base.x; f.pos.z = f.base.z;
}
function ctfDrop(c) {
  const C = Game.scenario.ctf;
  if (!C) return;
  for (const f of [C.flags.ours, C.flags.theirs]) {
    if (f.carrier !== c) continue;
    const p = findClearSpawn(c.pos.x, c.pos.z, Game.player.obstacles, 0.3);
    f.carrier = null; f.dropped = true; f.dropT = 0; f.pos.x = p.x; f.pos.z = p.z;
    C.log.push({ ev: 'drop', side: f.side, by: c === Game.player ? 'you' : c.name, t: +(Game.scenario.roundTime || 0).toFixed(1) });
    ctfSay(f.side === 'ours' ? 'OUR FLAG IS DOWN' : 'THEIR FLAG IS DOWN');
  }
}
function updateFlags(dt) {
  const C = Game.scenario.ctf;
  if (!C || Game.mode !== 'scenario') return;
  C.t += dt;
  if (C.msg && (C.msg.t -= dt) <= 0) C.msg = null;
  if (C.over) return;   // v1.191: decided (a second flag or the clock); nothing moves the score in the 0.8 s before the result
  const people = listCombatants();
  const stamp = () => +(Game.scenario.roundTime || 0).toFixed(1);
  for (const side of ['ours', 'theirs']) {
    const f = C.flags[side];
    if (f.carrier && !ctfAlive(f.carrier)) ctfDrop(f.carrier);
    if (f.carrier) continue;
    if (f.dropped && (f.dropT += dt) > CTF_RETURN_SEC) {
      ctfHome(f); C.log.push({ ev: 'timeout', side, t: stamp() });
      ctfSay(side === 'ours' ? 'OUR FLAG IS BACK' : 'THEIR FLAG WENT BACK');
      continue;
    }
    for (const c of people) {
      if (!ctfAlive(c) || Math.hypot(c.pos.x - f.pos.x, c.pos.z - f.pos.z) > CTF_TOUCH) continue;
      if (ctfSide(c) === side) {
        if (!f.dropped) continue;
        ctfHome(f); C.log.push({ ev: 'return', side, by: c === Game.player ? 'you' : c.name, t: stamp() });
        ctfSay(side === 'ours' ? `${ctfName(c)} SENT OUR FLAG HOME` : 'THEIR FLAG WENT BACK');
        break;
      }
      if (ctfCarrying(c)) continue;
      f.carrier = c; f.dropped = false; f.dropT = 0; f.taken++;
      C.log.push({ ev: 'take', side, by: c === Game.player ? 'you' : c.name, t: stamp() });
      if (c === Game.player) ctfSay('YOU HAVE THEIR FLAG — BRING IT HOME');
      else { ctfSay(side === 'ours' ? `${ctfName(c)} HAS OUR FLAG` : `${ctfName(c)} HAS THEIR FLAG`); tryNpcSpeak(c, 'taunt'); }
      break;
    }
  }
  // a carrier at his own base scores
  for (const side of ['ours', 'theirs']) {
    const f = C.flags[side], c = f.carrier;
    if (!c) continue;
    const cs = ctfSide(c), home = C.flags[cs].base;
    if (Math.hypot(c.pos.x - home.x, c.pos.z - home.z) > CTF_HOME) continue;
    C.score[cs]++;
    C.caps.push({ side: cs, by: c === Game.player ? 'you' : c.name, t: stamp() });
    ctfHome(f);
    ctfSay(cs === 'ours' ? `FLAG HOME! ${C.score.ours}–${C.score.theirs}` : `THEY SCORED ${C.score.ours}–${C.score.theirs}`);
    if (C.score[cs] >= C.toWin && !C.over) { C.over = true; endScenarioLater(cs === 'ours' ? 'win' : 'lose', 800); }
  }
  // v1.191: the clock. Time up, more flags wins; level is a draw, paid as a loss
  if (C.clock && C.t >= C.clock && !C.over) {
    C.over = true; C.timeUp = true;
    const o = C.score.ours, t = C.score.theirs;
    C.log.push({ ev: 'time', t: stamp() });
    ctfSay(o > t ? `TIME! ${o}–${t}` : o < t ? `TIME — THEY WIN ${o}–${t}` : `TIME — DRAW ${o}–${t}`);
    endScenarioLater(o > t ? 'win' : 'lose', 800);
  }
  // the meshes: on the base or the ground, or on a carrier's back
  for (const f of [C.flags.ours, C.flags.theirs]) {
    const m = f.mesh, c = f.carrier;
    if (c) {
      // a kid faces (sin yaw, cos yaw); the player looks down (-sin yaw, -cos yaw)
      const fx = c === Game.player ? -Math.sin(Game.player.yaw) : Math.sin(c.yaw || 0);
      const fz = c === Game.player ? -Math.cos(Game.player.yaw) : Math.cos(c.yaw || 0);
      const back = c === Game.player ? 0.45 : 0.22;
      const gy = c === Game.player ? Game.player.pos.y : (c.pos.y || 0);
      m.position.set(c.pos.x - fx * back, gy + 0.45, c.pos.z - fz * back);
      m.rotation.set(0, Math.atan2(fx, fz) + Math.PI / 2, -0.25);
    } else {
      m.position.set(f.pos.x, scenarioGroundY(f.pos.x, f.pos.z) + (f.dropped ? 0 : 0.12), f.pos.z);
      m.rotation.set(0, 0, f.dropped ? 1.2 : 0);
    }
    if (m.userData.cloth) m.userData.cloth.rotation.y = Math.sin(C.t * 3.1 + (f.side === 'ours' ? 0 : 1.7)) * 0.25;
  }
}
// The flag a kid should walk to now, or null: his carried flag home; his own flag, down within 18 m, back home; theirs
// (a runner always, anyone when it is down within 12 m) while nobody on his side has it.
function kidFlagGoal(e) {
  const C = Game.scenario.ctf, side = ctfSide(e), mine = C.flags[side], theirs = C.flags[ctfOther(side)];
  const d = f => Math.hypot(f.pos.x - e.pos.x, f.pos.z - e.pos.z);
  let goal = null, kind = null;
  if (theirs.carrier === e) { goal = mine.base; kind = 'carry'; }
  else if (mine.dropped && d(mine) < 18) { goal = mine.pos; kind = 'return'; }
  else if (!theirs.carrier && (e.ctfRole === 'run' || (theirs.dropped && d(theirs) < 12))) { goal = theirs.pos; kind = theirs.dropped ? 'loose' : 'fetch'; }
  else if (e.ctfRole === 'push' && C.push) {
    // v1.191: a pusher inside CTF_GUARD_R of his own flag (back from a tag, or drawn in by the fight) runs up the street
    // to his push point; within 3 m of it, or past CTF_GUARD_R + 5 from his flag, he is done and the states take over
    const pp = C.push[side], dHome = Math.hypot(mine.base.x - e.pos.x, mine.base.z - e.pos.z);
    if (!e._pushing && dHome < CTF_GUARD_R && !mine.carrier) { e._pushing = true; e._pushes = (e._pushes || 0) + 1; }
    if (e._pushing && (Math.hypot(pp.x - e.pos.x, pp.z - e.pos.z) < 3 || dHome > CTF_GUARD_R + 5)) e._pushing = false;
    if (e._pushing) { goal = pp; kind = 'push'; }
  }
  // a fetch or a carry home picks its way afresh: down the street (three in ten) or round one row's backyards, by a
  // waypoint in them, dropped once he is within 3 m of it or nearer the goal than it is. Straight down the street
  // both runners were tagged 10-12 times in 150 s and never reached a flag.
  if (kind !== e._flagKind) {
    e._flagKind = kind;
    e._flagWp = null;
    if ((kind === 'fetch' || kind === 'carry') && C.lanes.length && gameRandom() >= 0.3) e._flagWp = C.lanes[Math.floor(gameRandom() * C.lanes.length)];
    if (kind && kind !== 'push') C.log.push({ ev: 'lane', by: e.name, kind, wp: e._flagWp ? (e._flagWp.z < 0 ? 'north' : 'south') : 'street', t: +(Game.scenario.roundTime || 0).toFixed(1) });
  }
  const wp = e._flagWp;
  if (goal && wp) {
    const dw = Math.hypot(wp.x - e.pos.x, wp.z - e.pos.z);
    if (dw < 3 || Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z) < Math.hypot(goal.x - wp.x, goal.z - wp.z)) e._flagWp = null;
    else return wp;
  }
  return goal;
}
function ctfField(goal) {
  const C = Game.scenario.ctf, key = Math.round(goal.x * 2) + ',' + Math.round(goal.z * 2);
  let F = C.fields.get(key);
  if (!F) { if (C.fields.size > 16) C.fields.clear(); F = kidFieldTo(goal.x, goal.z); C.fields.set(key, F); }
  return F;
}
// Moves a kid with a flag to go for (kidFlagGoal) by the distance field, in place of the states, and returns true; he
// is 'advancing' to everything else. He sprints (CTF_RUN_SPEED) and shoots on the move at a target he can see within
// CTF_FIRE_RANGE (slowing to 80%), except with a flag on his back, when he just runs. At 3 m/s, firing out to 35 m, the
// two runners stopped to duel each other mid-street and neither reached a flag in 150 s. Stuck 4 s without getting 0.3 m nearer, he gives the states 2 s.
function kidFlagRun(e, tgt, dist, dt) {
  if (e.state === 'retreating' || e.noFire || e.perch || e._lad || e.behavior === 'tagger') return false;
  if (e._flagBan > 0) { e._flagBan -= dt; return false; }
  const goal = kidFlagGoal(e);
  if (!goal) {
    if (e._flagRun) { e.targetPos = null; e.homeCover = null; e.stateTime = 0; }
    return false;
  }
  const ch = e.character || {}, carrying = ctfCarrying(e);
  if (!e._flagRun) { e.targetPos = null; e.homeCover = null; e._flagBest = null; e._flagStuck = 0; }
  e.state = 'advancing';
  e.mesh.group.position.y = 0;
  setKidCrouch(e.mesh, 0);
  // can he see his target? (5 times a second)
  e._flagLosT = (e._flagLosT || 0) - dt;
  if (e._flagLosT <= 0) {
    e._flagLosT = 0.2;
    const range = Math.min(CTF_FIRE_RANGE, e.weapon === 'shotgun' ? 16 : 25);
    const my = (e.pos.y || 0) + 1.05 * (e.mesh.scaleY ?? 1.0);
    e._flagSee = !carrying && tgt && tgt.alive && dist < range &&
      hasLineOfSight(e.pos.x, my, e.pos.z, tgt.pos.x, tgt.chestY, tgt.pos.z, tgt.obstacles);
  }
  const see = !!e._flagSee && !carrying;
  // the way: the field's next cell, or straight in when close
  const gx = goal.x - e.pos.x, gz = goal.z - e.pos.z, gd = Math.hypot(gx, gz);
  let ux = gd > 1e-3 ? gx / gd : 0, uz = gd > 1e-3 ? gz / gd : 0;
  if (gd > 1.2) {
    const w = kidFieldNext(ctfField(goal), e.pos.x, e.pos.z);
    if (w) { const wx = w.x - e.pos.x, wz = w.z - e.pos.z, wl = Math.hypot(wx, wz); if (wl > 0.05) { ux = wx / wl; uz = wz / wl; } }
  }
  if (e._flagSideT > 0) { e._flagSideT -= dt; const t = ux; ux = -uz * e._flagSide; uz = t * e._flagSide; }
  if (gd > CTF_TOUCH * 0.5) {
    const sp = Math.min(gd, CTF_RUN_SPEED * (ch.moveSpeed ?? 1.0) * (see ? 0.8 : 1) * dt), r = 0.33;
    const bx = e.pos.x, bz = e.pos.z, nx = bx + ux * sp, nz = bz + uz * sp;
    if (!collidesObstacles(nx, nz, r)) { e.pos.x = nx; e.pos.z = nz; }
    else {
      if (!collidesObstacles(nx, e.pos.z, r)) e.pos.x = nx;
      if (!collidesObstacles(e.pos.x, nz, r)) e.pos.z = nz;
    }
    if (Math.hypot(e.pos.x - bx, e.pos.z - bz) < sp * 0.3) {
      e._flagWall = (e._flagWall || 0) + dt;
      if (e._flagWall > 0.4) { e._flagSide = e._flagSide ? -e._flagSide : (gameRandom() < 0.5 ? -1 : 1); e._flagSideT = 0.7; e._flagWall = 0; }
    } else e._flagWall = 0;
  }
  // progress toward the goal; a kid who has not got 0.3 m nearer in 4 s hands back to the states for 2 s
  const dNow = Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z);
  if (e._flagBest == null || dNow < e._flagBest - 0.3 || dNow < CTF_TOUCH) { e._flagBest = dNow; e._flagStuck = 0; }
  else if ((e._flagStuck = (e._flagStuck || 0) + dt) > 4) { e._flagStuck = 0; e._flagBest = null; e._flagBan = 2; e.stateTime = 0; }
  // face the target he shoots at, else where he runs; shoot on a cadence
  kidTurnToward(e, see ? Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z) : Math.atan2(ux, uz), dt);
  e.mesh.group.rotation.y = e.yaw;
  e._hasLOSNow = see;
  if (see) {
    e._flagShotT = (e._flagShotT ?? 0.3) - dt;
    if (e._flagShotT <= 0) {
      const aim = tgt.pos.clone(); aim.y = tgt.chestY;
      spawnEnemyBB(e, aim);
      e._flagShots = (e._flagShots || 0) + 1;
      const auto = ['mp5', 'ump', 'ak47', 'ar', 'mac10'].includes(e.weapon);
      e._flagShotT = auto ? 0.25 + gameRandom() * 0.15 : e.weapon === 'shotgun' ? 0.9 + gameRandom() * 0.4 : 0.6 + gameRandom() * 0.3;
    }
  }
  return true;
}
// v1.248 (backlog D.35, Michael: A): SQUAD COMMANDS. Hold Q in a match with teammates and the four orders show round
// the crosshair; move the mouse toward one and let go (the match keeps running, and the mouse doesn't look while the
// wheel is open). An order goes to every teammate (the walkie reaches the whole map), one of them answers it on the
// walkie, the HUD shows it standing, and it holds until you give another or the round ends. A kid carrying out an
// order moves by the distance field (as a flag runner does, kidOrderRun) and shoots on the move at whoever he can see;
// where the order leaves him free (pushed up within 14 m of the other side) the states take over. Kids skipped: a VIP
// (he holds his spot), a perched or ladder kid, one walking back after a tag, a flag runner with a flag to see to.
const SQUAD_ORDERS = {
  push:     { label: 'PUSH UP',       dir: [0, -1], replies: ['Copy, pushing!', 'Moving up!', 'Going, going!', 'Pushing up, cover me!'] },
  cover:    { label: 'FIND COVER',    dir: [1, 0],  replies: ['Copy, getting behind something!', 'Taking cover!', 'Finding cover!'] },
  distance: { label: 'KEEP DISTANCE', dir: [0, 1],  replies: ['Copy, hanging back.', 'Backing off!', 'Keeping my distance.'] },
  follow:   { label: 'FOLLOW ME',     dir: [-1, 0], replies: ['Right behind you!', 'Copy, on you!', 'Following!', 'Lead the way!'] },
};
const SQUAD_WHEEL_R = 110, SQUAD_WHEEL_PICK = 24;      // px the wheel's pointer can travel; px to choose
const SQUAD_PUSH_NEAR = 14;                            // push up: within this of the nearest enemy, the states fight
const SQUAD_KEEP_MIN = 15, SQUAD_KEEP_MAX = 25;        // keep distance: the band he holds from the nearest enemy
const SQUAD_FOLLOW_GO = 6, SQUAD_FOLLOW_STOP = 4;      // follow me: sets off past 6 m from you, stops inside 4 m
const SQUAD_AIM_BONUS = 20;                            // follow me: the kid you aim at draws his gun (m-equiv)
function squadMates() {
  return (Game.scenario && Game.scenario.enemies || []).filter(e => e.team === 'player' && e.behavior !== 'tagger');
}
function squadCanOrder() {
  return Game.mode === 'scenario' && !Game.paused && !Game.forfeitAsk && !(Tutorial.active && Tutorial.kind !== 'squad') && squadMates().some(e => e.health > 0 && !e.vip);
}
function openSquadWheel() {
  if (!squadCanOrder()) return false;
  Game.squadWheel = { x: 0, y: 0, pick: null };
  Game.mouse.dx = 0; Game.mouse.dy = 0;
  drawSquadWheel();
  return true;
}
function closeSquadWheel(choose) {
  const w = Game.squadWheel;
  Game.squadWheel = null; Game.squadFlashT = 0;   // v1.255: a d-pad order's flash goes too
  const el = document.getElementById('squadWheel');
  if (el) el.style.display = 'none';
  if (choose && w && w.pick && Game.mode === 'scenario') giveSquadOrder(w.pick);
}
function squadWheelMove(dx, dy) {
  const w = Game.squadWheel;
  w.x += dx; w.y += dy;
  const L = Math.hypot(w.x, w.y);
  if (L > SQUAD_WHEEL_R) { w.x *= SQUAD_WHEEL_R / L; w.y *= SQUAD_WHEEL_R / L; }
  w.pick = null;
  if (L >= SQUAD_WHEEL_PICK) {
    let best = -2;
    for (const k in SQUAD_ORDERS) {
      const d = SQUAD_ORDERS[k].dir, c = (w.x * d[0] + w.y * d[1]) / Math.hypot(w.x, w.y);
      if (c > best) { best = c; w.pick = k; }
    }
  }
  drawSquadWheel();
}
// v1.255 (B.11): a d-pad order is given at once; the wheel shows for SQUAD_FLASH_S with that order lit, the mouse free
const SQUAD_FLASH_S = 0.6;
function padSquadOrder(key) {
  if (Game.squadWheel || !squadCanOrder()) return false;
  giveSquadOrder(key);
  const d = SQUAD_ORDERS[key].dir;
  Game.squadFlash = { x: d[0] * SQUAD_WHEEL_R * 0.6, y: d[1] * SQUAD_WHEEL_R * 0.6, pick: key };
  Game.squadFlashT = SQUAD_FLASH_S;
  drawSquadWheel();
  return true;
}
function drawSquadWheel() {
  const el = document.getElementById('squadWheel'), w = Game.squadWheel || (Game.squadFlashT > 0 ? Game.squadFlash : null);
  if (!el || !w) return;
  el.style.display = 'block';
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = Object.keys(SQUAD_ORDERS).map(k => `<div class="sq-opt sq-${k}" data-k="${k}">${SQUAD_ORDERS[k].label}</div>`).join('') +
      '<div class="sq-ptr"></div><div class="sq-title">ORDERS · let go of Q</div>';
  }
  const title = el.querySelector('.sq-title'), tt = Game.squadWheel ? 'ORDERS · let go of Q' : 'ORDER GIVEN';   // v1.255
  if (title && title.textContent !== tt) title.textContent = tt;
  for (const o of el.querySelectorAll('.sq-opt')) o.classList.toggle('on', o.dataset.k === w.pick);
  const p = el.querySelector('.sq-ptr');
  if (p) p.style.transform = `translate(${w.x.toFixed(0)}px, ${w.y.toFixed(0)}px)`;
}
function giveSquadOrder(key) {
  const S = Game.scenario, O = SQUAD_ORDERS[key];
  if (!S || !O) return;
  S.squadOrder = key;
  S.squadLog = S.squadLog || [];
  S.squadLog.push({ key, t: +(S.roundTime || 0).toFixed(2) });
  for (const e of squadMates()) { e._ordGoal = null; e._ordBan = 0; e._ordBest = null; e._ordStuck = 0; e._ordCover = null; e._ordAt = false; }
  // one teammate answers on the walkie: the nearest one standing
  const live = squadMates().filter(e => e.health > 0 && e.state !== 'retreating' && !e.vip);
  live.sort((a, b) => Math.hypot(a.pos.x - Game.player.pos.x, a.pos.z - Game.player.pos.z) - Math.hypot(b.pos.x - Game.player.pos.x, b.pos.z - Game.player.pos.z));
  const who = live[0];
  const line = who ? O.replies[Math.floor(gameRandom() * O.replies.length)] : null;
  S.squadReply = who ? { name: who.name, line, until: (S.roundTime || 0) + 3.5 } : null;
  if (who) squadWalkieSay(who, line);
  updateSquadHud();
  if (Tutorial.active) Tutorial.notify('ordered');   // v1.324 (D.61)
}
// a walkie line: heard wherever he is (no distance cut-off), a click of the talk button first
function squadWalkieSay(e, line) {
  // v1.268: the cooldowns on the round clock, as every other line's (v1.150); on wall time they ran a page's age
  // ahead of the round, and every kid in earshot went quiet for the round's first minutes after an order
  const now = Game.scenario?.roundTime || 0;
  VOICE.globalCooldownUntil = now + 1.5;
  e._voiceCooldownUntil = now + 4.0;
  VOICE.walkieUntil = now + WALKIE_GAP;
  walkieVoice(e, line);
}
function walkieVoice(e, line) {   // v1.268: the sound of a walkie line, split out of squadWalkieSay
  try {
    if (Game.audio?.ctx) {
      const ctx = Game.audio.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(1400, t);
      g.gain.setValueAtTime(0.05 * Settings.effects, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g).connect(sfxOut()); o.start(t); o.stop(t + 0.07);
    }
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line), v = voiceForCharId(e.charId || '');
    if (v) u.voice = v;
    u.rate = 1.15; u.pitch = 1.1;
    u.volume = 0.45 * Settings.effects;
    speechSynthesis.speak(u);
  } catch (err) { /* no audio: the HUD still shows the line */ }
}
function updateSquadHud() {
  const hud = document.getElementById('squadHud');
  if (!hud) return;
  const S = Game.scenario;
  if (Game.mode !== 'scenario' || !S || !squadMates().length || (Tutorial.active && Tutorial.kind !== 'squad')) { hud.style.display = 'none'; return; }   // v1.324: Squad Basics shows it
  hud.style.display = 'block';
  const order = S.squadOrder ? SQUAD_ORDERS[S.squadOrder].label : 'NONE';
  const r = S.squadReply && (S.roundTime || 0) < S.squadReply.until ? S.squadReply : null;
  const hint = Pad.active ? '<kbd>D-PAD</kbd>' : 'hold <kbd>Q</kbd>';   // v1.255 (B.11): on a pad the d-pad gives them
  const html = `<span class="sq-k">ORDER</span> ${order} <span class="sq-hint">· ${hint}</span>` +
    (r ? `<div class="sq-reply">📻 ${r.name}: “${r.line}”</div>` : '');
  if (hud.innerHTML !== html) hud.innerHTML = html;
}
// once a step, before the kids: who you are aiming at (follow me's "shoot what I shoot at")
function updateSquad(dt) {
  const S = Game.scenario;
  if (Game.squadFlashT > 0 && (Game.squadFlashT -= dt) <= 0) {   // v1.255: the d-pad order's flash ends
    Game.squadFlashT = 0;
    if (!Game.squadWheel) { const el = document.getElementById('squadWheel'); if (el) el.style.display = 'none'; }
  }
  S._playerAimKid = null;
  if (S.squadOrder === 'follow') {
    const fx = -Math.sin(Game.player.yaw), fz = -Math.cos(Game.player.yaw);
    let best = 0.966;   // within 15° of where you look
    for (const c of S.enemies) {
      if (c.team === 'player' || c.health <= 0 || c.state === 'retreating') continue;
      const dx = c.pos.x - Game.player.pos.x, dz = c.pos.z - Game.player.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.5 || d > 70) continue;
      const cs = (dx * fx + dz * fz) / d;
      if (cs > best) { best = cs; S._playerAimKid = c; }
    }
  }
  updateSquadHud();
}
function squadField(goal) {
  const S = Game.scenario, key = Math.round(goal.x / 2) + ',' + Math.round(goal.z / 2);
  if (!S._ordFields) S._ordFields = new Map();
  let F = S._ordFields.get(key);
  if (!F) { if (S._ordFields.size > 24) S._ordFields.clear(); F = kidFieldTo(Math.round(goal.x / 2) * 2, Math.round(goal.z / 2) * 2); S._ordFields.set(key, F); }
  return F;
}
function squadNearestFoe(e) {
  let best = null, bd = Infinity;
  for (const c of opposingCombatants(e)) {
    const d = Math.hypot(c.pos.x - e.pos.x, c.pos.z - e.pos.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best ? { c: best, d: bd } : null;
}
function squadClampToField(p) {
  const b = Game.scenario.bounds || { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
  return { x: Math.max(b.minX + 1.5, Math.min(b.maxX - 1.5, p.x)), z: Math.max(b.minZ + 1.5, Math.min(b.maxZ - 1.5, p.z)) };
}
// where the standing order sends kid e now: { goal } to walk to, { hold } to stay and fight where he is (crouched
// for find cover), or null to leave him to the states
function squadOrderGoal(e) {
  const S = Game.scenario, key = S.squadOrder, foe = squadNearestFoe(e);
  if (key === 'follow') {
    const dp = Math.hypot(Game.player.pos.x - e.pos.x, Game.player.pos.z - e.pos.z);
    if (dp > SQUAD_FOLLOW_GO || (e._ordGoal && dp > SQUAD_FOLLOW_STOP)) {
      // a spot a couple of metres behind and beside you, not on top of you
      const fx = -Math.sin(Game.player.yaw), fz = -Math.cos(Game.player.yaw), side = (e._ordSide = e._ordSide || (gameRandom() < 0.5 ? -1 : 1));
      return { goal: squadClampToField({ x: Game.player.pos.x - fx * 2 - fz * 1.5 * side, z: Game.player.pos.z - fz * 2 + fx * 1.5 * side }) };
    }
    return { hold: true };
  }
  if (!foe) return null;
  if (key === 'push') return foe.d > SQUAD_PUSH_NEAR ? { goal: { x: foe.c.pos.x, z: foe.c.pos.z }, near: SQUAD_PUSH_NEAR } : null;
  if (key === 'distance') {
    const ux = (e.pos.x - foe.c.pos.x) / (foe.d || 1), uz = (e.pos.z - foe.c.pos.z) / (foe.d || 1);
    if (foe.d < SQUAD_KEEP_MIN || (e._ordGoal && e._ordAway && foe.d < (SQUAD_KEEP_MIN + SQUAD_KEEP_MAX) / 2)) {
      e._ordAway = true;
      // straight away from him, or, against the field's edge, back toward your own start
      let g = squadClampToField({ x: foe.c.pos.x + ux * 21, z: foe.c.pos.z + uz * 21 });
      if (Math.hypot(g.x - foe.c.pos.x, g.z - foe.c.pos.z) < SQUAD_KEEP_MIN + 1 && e._spawnPos) g = { x: e._spawnPos.x, z: e._spawnPos.z };
      return { goal: g };
    }
    if (foe.d > SQUAD_KEEP_MAX || (e._ordGoal && !e._ordAway && foe.d > (SQUAD_KEEP_MIN + SQUAD_KEEP_MAX) / 2)) {
      e._ordAway = false;
      return { goal: { x: foe.c.pos.x, z: foe.c.pos.z }, near: (SQUAD_KEEP_MIN + SQUAD_KEEP_MAX) / 2 };
    }
    return { hold: true };
  }
  if (key === 'cover') {
    // the nearest cover within 15 m, on its side away from the nearest enemy; picked once per order (and again after a tag)
    if (!e._ordCover) {
      let best = null, bd = 15;
      for (const c of (S.cover || [])) {
        const cc = obsCenter(c), d = Math.hypot(cc.x - e.pos.x, cc.z - e.pos.z);
        if (d < bd) { bd = d; best = c; }
      }
      e._ordCover = { at: best ? coverStandPos(best, foe.c.pos, 0.35) : { x: e.pos.x, z: e.pos.z } };
      e._ordAt = false;
    }
    const at = e._ordCover.at;
    // there within 1.2 m, or within 3 m and no nearer for a second (the stand spot can sit tight against a corner)
    const dc = Math.hypot(at.x - e.pos.x, at.z - e.pos.z);
    if (!e._ordAt && dc > 1.2 && !(dc < 3 && (e._ordStuck || 0) > 1)) return { goal: { x: at.x, z: at.z } };
    e._ordAt = true;
    return { hold: true, low: true };
  }
  return null;
}
// moves kid e on the standing order in place of the states and returns true; false leaves him to them
function kidOrderRun(e, tgt, dist, dt) {
  const S = Game.scenario;
  if (!S.squadOrder || e.team !== 'player' || e.vip) return false;
  if (e.state === 'retreating') e._ordCover = null;
  if (e.state === 'retreating' || e.state === 'deploying' || e.noFire || e.perch || e._lad || e.behavior === 'tagger') return false;
  if (e._ordBan > 0) { e._ordBan -= dt; return false; }
  const want = squadOrderGoal(e);
  if (!want) {
    if (e._orderRun) { e.targetPos = null; e.homeCover = null; e.stateTime = 0; e._ordGoal = null; }
    return false;
  }
  const ch = e.character || {};
  if (!e._orderRun) { e.targetPos = null; e.homeCover = null; e._ordBest = null; e._ordStuck = 0; }
  e.state = want.hold ? 'hiding' : 'advancing';
  e.mesh.group.position.y = 0;
  // can he see his target? (5 times a second)
  e._ordLosT = (e._ordLosT || 0) - dt;
  if (e._ordLosT <= 0) {
    e._ordLosT = 0.2;
    const range = e.weapon === 'shotgun' ? 16 : e.weapon === 'sniper' ? 45 : 30;
    const my = (e.pos.y || 0) + 1.05 * (e.mesh.scaleY ?? 1.0);
    e._ordSee = !!(tgt && tgt.alive && dist < range && hasLineOfSight(e.pos.x, my, e.pos.z, tgt.pos.x, tgt.chestY, tgt.pos.z, tgt.obstacles));
  }
  const see = !!e._ordSee;
  let ux = 0, uz = 0;
  if (want.goal) {
    e._ordGoal = want.goal;
    setKidCrouch(e.mesh, 0);
    const goal = want.goal, gx = goal.x - e.pos.x, gz = goal.z - e.pos.z, gd = Math.hypot(gx, gz);
    ux = gd > 1e-3 ? gx / gd : 0; uz = gd > 1e-3 ? gz / gd : 0;
    if (gd > 1.2) {
      const w = kidFieldNext(squadField(goal), e.pos.x, e.pos.z);
      if (w) { const wx = w.x - e.pos.x, wz = w.z - e.pos.z, wl = Math.hypot(wx, wz); if (wl > 0.05) { ux = wx / wl; uz = wz / wl; } }
    }
    if (e._ordSideT > 0) { e._ordSideT -= dt; const t = ux; ux = -uz * e._ordSideS; uz = t * e._ordSideS; }
    // a jog; a run (as a flag runner's) when he is over 12 m from where he is going
    const sp = Math.min(gd, (gd > 12 ? CTF_RUN_SPEED : 3.2) * (ch.moveSpeed ?? 1.0) * (see ? 0.75 : 1) * dt), r = 0.33;
    const bx = e.pos.x, bz = e.pos.z, nx = bx + ux * sp, nz = bz + uz * sp;
    if (!collidesObstacles(nx, nz, r)) { e.pos.x = nx; e.pos.z = nz; }
    else {
      if (!collidesObstacles(nx, e.pos.z, r)) e.pos.x = nx;
      if (!collidesObstacles(e.pos.x, nz, r)) e.pos.z = nz;
    }
    if (sp > 1e-4 && Math.hypot(e.pos.x - bx, e.pos.z - bz) < sp * 0.3) {
      e._ordWall = (e._ordWall || 0) + dt;
      if (e._ordWall > 0.4) { e._ordSideS = e._ordSideS ? -e._ordSideS : (gameRandom() < 0.5 ? -1 : 1); e._ordSideT = 0.7; e._ordWall = 0; }
    } else e._ordWall = 0;
    // no nearer by 0.3 m in 4 s: the states have him for 2 s
    const dNow = Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z);
    if (e._ordBest == null || dNow < e._ordBest - 0.3 || dNow < 1) { e._ordBest = dNow; e._ordStuck = 0; }
    else if ((e._ordStuck = (e._ordStuck || 0) + dt) > 4) { e._ordStuck = 0; e._ordBest = null; e._ordBan = 2; e.stateTime = 0; }
    if (want.near && Math.hypot(want.goal.x - e.pos.x, want.goal.z - e.pos.z) <= want.near) e._ordGoal = null;
  } else {
    e._ordGoal = null; e._ordBest = null; e._ordStuck = 0;
    // holding: find cover keeps him low, up to shoot for a moment every couple of seconds; otherwise he stands
    if (want.low) {
      e._ordPeekT = (e._ordPeekT ?? 2) - dt;
      if (e._ordPeekT <= -1.2) e._ordPeekT = 1.6 + gameRandom() * 0.8;
      setKidCrouch(e.mesh, e._ordPeekT > 0 ? 1 : 0);
    } else setKidCrouch(e.mesh, 0);
  }
  const up = !(want.low && e._ordPeekT > 0);
  kidTurnToward(e, see || want.hold ? Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z) : Math.atan2(ux, uz), dt);
  e.mesh.group.rotation.y = e.yaw;
  e._hasLOSNow = see && up;
  if (see && up) {
    e._ordShotT = (e._ordShotT ?? 0.3) - dt;
    if (e._ordShotT <= 0) {
      const aim = tgt.pos.clone(); aim.y = tgt.chestY;
      spawnEnemyBB(e, aim);
      e._ordShots = (e._ordShots || 0) + 1;
      const auto = ['mp5', 'ump', 'ak47', 'ar', 'mac10'].includes(e.weapon);
      e._ordShotT = auto ? 0.25 + gameRandom() * 0.15 : e.weapon === 'shotgun' ? 0.9 + gameRandom() * 0.4 : e.weapon === 'sniper' ? 1.6 + gameRandom() * 0.6 : 0.6 + gameRandom() * 0.3;
    }
  }
  return true;
}
function updateCtfHud(hud) {
  const C = Game.scenario.ctf;
  hud.style.display = 'block';
  const ours = C.flags.ours, theirs = C.flags.theirs;
  let status;
  if (C.msg) status = C.msg.text;
  else if (theirs.carrier === Game.player) status = 'YOU HAVE THEIR FLAG — BRING IT HOME';
  else if (ours.carrier) status = `${ctfName(ours.carrier)} HAS OUR FLAG`;
  else if (theirs.carrier) status = `${ctfName(theirs.carrier)} HAS THEIR FLAG`;
  else if (ours.dropped) status = 'OUR FLAG IS DOWN';
  else if (theirs.dropped) status = 'THEIR FLAG IS DOWN';
  else status = `FLAGS · FIRST TO ${C.toWin}`;
  // v1.280 (D.47): held at your base, the countdown; news of a flag keeps the line, with the countdown after it
  if (Game.player._holdT > 0) {
    const n = Math.ceil(Game.player._holdT);
    status = status === `FLAGS · FIRST TO ${C.toWin}` ? `BACK AT YOUR BASE · PLAY IN ${n}` : `${status} · YOU PLAY IN ${n}`;
  }
  const lbl = document.getElementById('timerLabel');
  if (lbl) lbl.textContent = status;
  const val = document.getElementById('timerValue');
  // v1.191: the clock beside the score
  const left = C.clock ? Math.max(0, Math.ceil(C.clock - C.t)) : null;
  const clock = left == null ? '' : ` <span style="font-size:0.7em;opacity:0.85">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`;
  const html = `<span style="color:#6fa0ff">${C.score.ours}</span> – <span style="color:#ff6a5a">${C.score.theirs}</span>${clock}`;
  if (val && val.innerHTML !== html) val.innerHTML = html;
  hud.classList.toggle('urgent', !!ours.carrier || (left != null && left <= 30));
}
