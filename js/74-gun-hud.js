
// ---------------------------------------------------------------------
// GUN — FIRING, RELOADING
// ---------------------------------------------------------------------
// === FIRING / COCKING / EQUIPMENT ===
const COCK_FULL_TIME = 0.7;      // fallback default — actual per-gun cock time from GUN_SPECS
const COCK_RELEASE_TIME = 0.18;  // seconds for spring-forward animation
const SPRINT_COCK_MULT = 1.6;    // sprinting slows cocking
const UNJAM_TIME = 2.0;          // seconds to unjam (hold R)
const FIRE_LOCKOUT = 0.25;       // post-fire window — cocking is locked during this time

function doFire() {
  if (Game.player._holdT > 0 || Game.player._goingHome || Game.player._netOut) return;   // v1.280 (D.47): no shot while held at your base (v1.290: or walking home; v1.366: or out, online)
  Game.player._graceT = 0;   // v1.291 (D.49): your own shot ends the respawn's grace
  Game.gun._sinceShot = 0;   // v1.292 (D.50): an automatic's next click waits out its cycle from here (counted in updateGun)
  const pelletsFired = fireBB();   // returns BBs consumed (shotgun fires 2-3)
  playShot();
  Game.gun.ammo = Math.max(0, Game.gun.ammo - pelletsFired);
  Game.gun.fireCooldown = FIRE_LOCKOUT;
  if (fpGun) fpGun.userData.kick = 1.0;
  updateAmmoHud();
  if (pelletsFired > 0 && Tutorial.active) Tutorial.notify('fired');
  if (Game.gun._jamIn > 0 && --Game.gun._jamIn === 0 && Game.gun.ammo > 0) { jamGun(); Game.gun._jams = (Game.gun._jams || 0) + 1; }   // v1.250: the cheap gun's burst jams
}

function updateGun(dt) {
  // Fire lockout decays
  if (Game.gun.fireCooldown > 0) Game.gun.fireCooldown = Math.max(0, Game.gun.fireCooldown - dt);
  // Held swap lockout
  if (Game.held.swapBlock > 0) Game.held.swapBlock = Math.max(0, Game.held.swapBlock - dt);

  const held = describeSlot(Game.held.slotIdx);

  // === JAM unjamming (hold R while jammed) ===
  if (Game.gun.jammed) {
    if (Game.keys['KeyR']) {
      Game.gun.jamProgress += dt;
      if (Game.gun.jamProgress >= UNJAM_TIME) {
        Game.gun.jammed = false;
        Game.gun.jamProgress = 0;
        Game.gun.cocked = false;     // still need to rack
        Game.gun.cockProgress = 0;
        playUnjam();
        updateAmmoHud();
      }
    } else {
      Game.gun.jamProgress = Math.max(0, Game.gun.jamProgress - dt * 0.5);
    }
  }

  // === v1.169: TAPED TWIN MAG. A press of R (not one held over) flips the pair, and the two mags trade places
  // after TAPED_FLIP_TIME; what was left in the one you were shooting rides along, so nothing is lost.
  if (Game.gun.tapedMag) {
    const rDown = !!Game.keys['KeyR'];
    if (rDown && !Game.gun._rHeld && !Game.gun.jammed && !(Game.gun.flipT > 0) && held && held.kind === 'gun' &&
        Game.gun.tapedAmmo > 0 && !Game.held.using) {
      Game.gun.flipT = TAPED_FLIP_TIME;
      Game.gun.autoFireTimer = 0;
      updateAmmoHud();
    }
    Game.gun._rHeld = rDown;
    if (Game.gun.flipT > 0) {
      Game.gun.flipT -= dt;
      if (Game.gun.flipT <= 0) {
        Game.gun.flipT = 0;
        const t = Game.gun.tapedAmmo; Game.gun.tapedAmmo = Game.gun.ammo; Game.gun.ammo = t;
        playReloadClick();
        updateAmmoHud();
      }
    }
  }

  // v1.292 (D.50): time since the gun's last shot, counted as the held stream counts its cycle (see onLmbDown)
  Game.gun._sinceShot = (Game.gun._sinceShot ?? 1e9) + dt;
  // === v1.20: AUTO-FIRE cycle ===
  // For auto-mode guns: while LMB is held, gun is cocked, ammo > 0, and not
  // jammed, fire at cyclicRPM. The bolt cycles internally — no slide animation
  // between shots. When the mag empties, cocked drops to false → falls through
  // to the normal cock/reload path.
  if (held && held.kind === 'gun' && Game.gun.fireMode === 'auto' && !Game.gun.jammed && !(Game.noodle.t >= 0)) {   // v1.249: not mid-swing
    if (Game.mouseLMB && Game.gun.cocked && Game.gun.ammo > 0 && !(Game.gun.flipT > 0)) {
      const cycle = 60 / Math.max(1, Game.gun.cyclicRPM); // seconds per shot
      Game.gun.autoFireTimer += dt;
      // Allow multiple shots per frame at very high RPMs (MAC-10 at 1100 RPM
      // is one shot every 54ms — at 60fps that's already < frame time at low
      // frame rates). Loop so we don't drop shots.
      while (Game.gun.autoFireTimer >= cycle && Game.gun.ammo > 0 && !Game.gun.jammed) {
        Game.gun.autoFireTimer -= cycle;
        doFire();
      }
      // If we ran out of ammo this frame, the standard "ammo === 0 → uncocked"
      // policy applies so the player has to reload + re-rack on the next mag.
      if (Game.gun.ammo === 0) {
        Game.gun.cocked = false;
        Game.gun.cockProgress = 0;
        Game.gun.autoFireTimer = 0;
        // Mark LMB-consumed so the cocking animation doesn't immediately start
        // — player must release and re-press to start the cock-rack action.
        Game.lmbConsumed = true;
      }
    } else {
      // LMB up, or gun went uncocked another way — reset the cycle accumulator.
      Game.gun.autoFireTimer = 0;
    }
  }

  // === v1.327 (D.63): a BURST gun's pull fires the rest of its burst at its cycle, the trigger held or not ===
  if (Game.gun._burstLeft > 0) {
    if (!(held && held.kind === 'gun') || Game.gun.jammed || Game.gun.ammo <= 0 || Game.gun.flipT > 0 || Game.noodle.t >= 0) {
      Game.gun._burstLeft = 0;
      Game.gun.fireCooldown = Math.min(Game.gun.fireCooldown, FIRE_LOCKOUT);
    } else {
      const cycle = 60 / Math.max(1, Game.gun.cyclicRPM);
      Game.gun.autoFireTimer += dt;
      while (Game.gun.autoFireTimer >= cycle && Game.gun._burstLeft > 0 && Game.gun.ammo > 0 && !Game.gun.jammed) {
        Game.gun.autoFireTimer -= cycle;
        Game.gun._burstLeft--;
        doFire();   // sets the FIRE_LOCKOUT the next burst waits for
      }
      if (Game.gun.ammo === 0) {
        Game.gun._burstLeft = 0;
        Game.gun.cocked = false;
        Game.gun.cockProgress = 0;
        Game.gun.fireCooldown = Math.min(Game.gun.fireCooldown, FIRE_LOCKOUT);
      }
      if (Game.gun._burstLeft === 0) Game.gun.autoFireTimer = 0;
    }
  }

  // === COCKING animation ===
  // Pull-back: LMB held while gun in hand, slide not cocked, not currently releasing,
  // post-fire cooldown elapsed, AND the current LMB-hold wasn't the one that fired
  // (player must release LMB and re-press to start cocking).
  if (held && held.kind === 'gun' && !Game.gun.jammed) {
    if (Game.mouseLMB && !Game.lmbConsumed && !Game.gun.cocked && !Game.gun.cockReleasing && Game.gun.fireCooldown <= 0) {
      // Cock time comes from the gun spec (pistol=0.7, shotgun=0.85, AR=0.55, sniper=1.1)
      let cockSpeed = 1 / (Game.gun.cockTime || COCK_FULL_TIME);
      if (Game.player.sprinting) cockSpeed /= SPRINT_COCK_MULT;
      Game.gun.cockProgress = Math.min(1, Game.gun.cockProgress + dt * cockSpeed);
      if (Game.gun.cockProgress >= 0.95 && !Game.gun._reachedFullPull) {
        Game.gun._reachedFullPull = true;
        playCockBack();
      }
    } else {
      Game.gun._reachedFullPull = false;
    }
    // Release animation (spring snapping forward)
    if (Game.gun.cockReleasing) {
      Game.gun.cockReleaseProgress += dt / COCK_RELEASE_TIME;
      // Animate: cockProgress goes from current → 0 quickly
      Game.gun.cockProgress = Math.max(0, Game.gun.cockProgress - dt / COCK_RELEASE_TIME);
      if (Game.gun.cockReleaseProgress >= 1) {
        Game.gun.cockReleasing = false;
        Game.gun.cockReleaseProgress = 0;
        Game.gun.cockProgress = 0;
        if (Game.gun._releaseWillCock) {
          Game.gun.cocked = true;
          Game.gun._successFlashTime = 0.5;   // half-second green confirmation
          playCockForward();
        } else {
          playReloadClick();
        }
        Game.gun._releaseWillCock = false;
        updateAmmoHud();
      }
    }
  }

  // === EQUIPMENT USE (speed loader / spare mag) — LMB hold ===
  if (Game.held.using) {
    // Released LMB? Stop (keeping whatever was already transferred).
    if (!Game.mouseLMB) {
      Game.held.using = false;
      Game.held.useProgress = 0;
      Game.held.useKind = null;
      Game.held._feedingActive = false;
    } else if (Game.held.useKind === 'speed_loader') {
      // v1.49: CONTINUOUS feed. Move BBs from the loader into the mag at a
      // steady rate while held. Mag count goes up, loader count goes down, in
      // lockstep. Stops the instant the mag is full or the loader is empty.
      const slot = Game.persist.loadoutSlots[Game.held.slotIdx];
      const sl = slot ? Game.persist.speedLoaders.find(s => s.id === slot.refId) : null;
      const room = Game.gun.maxAmmo - Game.gun.ammo;
      if (!sl || sl.currentBBs <= 0 || room <= 0) {
        // Nothing left to do — feeding idles (the mag-full indicator shows in
        // the HUD). We keep `using` true so the HUD reads correctly while the
        // button stays held; no BBs move.
        Game.held._feedingActive = false;
      } else {
        const FEED_RATE = 40;                 // BBs per second
        Game.held._feedAccum += dt * FEED_RATE;
        let n = Math.floor(Game.held._feedAccum);
        if (n > 0) {
          n = Math.min(n, sl.currentBBs, room);
          if (n > 0) {
            Game.gun.ammo += n;
            sl.currentBBs -= n;
            Game.held._feedAccum -= n;
            Game.held._feedingActive = true;
            if (Tutorial.active) Tutorial.notify('fed');   // v1.324 (D.61)
            // periodic soft tick as BBs rattle in
            if (!Game.held._feedTickT || performance.now() - Game.held._feedTickT > 90) {
              playReloadClick();
              Game.held._feedTickT = performance.now();
            }
            updateAmmoHud();
            updateLoadoutHud();
          } else {
            Game.held._feedingActive = false;
          }
        }
        // If we just topped off the mag or drained the loader, drop the pumping
        // animation but stay in `using` so the player sees the MAG FULL / empty
        // state until they release.
        if (Game.gun.ammo >= Game.gun.maxAmmo || sl.currentBBs <= 0) {
          Game.held._feedingActive = false;
        }
      }
    } else if (Game.held.useKind === 'spare_mag') {
      // Spare mag is still a timed swap (slap a fresh mag in), unchanged.
      Game.held.useProgress += dt;
      if (Game.held.useProgress >= Game.held.useDuration) {
        // v1.323 (B.14): swap mags; the one pulled goes in the pouch with what it had left, and the slot stays
        if (!Game.gun.spareAmmo) Game.gun.spareAmmo = {};
        const fresh = Game.gun.spareAmmo[Game.held.slotIdx] || 0;
        Game.gun.spareAmmo[Game.held.slotIdx] = Game.gun.ammo;
        Game.gun.ammo = fresh;
        Game.held.slotIdx = 0;
        playReloadClick();
        Game.held.using = false;
        Game.held.useProgress = 0;
        Game.held.useKind = null;
        updateAmmoHud();
        updateLoadoutHud();
      }
    }
  }

  // === FP MESH UPDATE ===
  updateHeldMesh(dt);
}

// FP mesh per-frame: position, ADS pose, cock animation, slide position, etc.
function updateHeldMesh(dt) {
  if (!fpGun) return;
  fpGun.userData.kick = (fpGun.userData.kick || 0) * Math.max(0, 1 - dt * 8);

  const held = describeSlot(Game.held.slotIdx);
  const isGunHeld = held && held.kind === 'gun';
  const isLoader = held && held.kind === 'speed_loader';
  const isMag = held && held.kind === 'spare_mag';
  // v1.249 (D.36): the noodle shows while its slot is held, and over anything else for a V swing
  const swinging = Game.noodle && Game.noodle.t >= 0;
  const showNoodle = !!fpNoodle && ((held && held.kind === 'noodle') || swinging);

  // Show the right mesh. v1.61b: while aiming with a SCOPE, hide the whole gun
  // model — the full-screen scope overlay becomes the entire sight picture, so a
  // floating viewmodel would just clutter the lens. Threshold matches the overlay
  // fade-in (ads > 0.55 ≈ overlay near full) so the gun vanishes as the scope
  // takes over rather than popping.
  const scopedFully = isGunHeld && gunHasAccessoryType(Game.gun.type, 'scope') && Game.player.ads > 0.55;
  fpGun.visible = isGunHeld && !scopedFully && !swinging;
  if (fpLoader) fpLoader.visible = isLoader && !swinging;
  if (fpMag) fpMag.visible = isMag && !swinging;
  if (fpNoodle) { fpNoodle.visible = showNoodle; if (showNoodle) poseFPNoodle(); }
  updateFpHands(showNoodle ? fpNoodle : isGunHeld ? fpGun : isLoader ? fpLoader : isMag ? fpMag : null, Game.gun.type);   // v1.219 (D.30): the off hand, skin and sleeves

  if (isGunHeld) {
    // Cocking animation: cockProgress 0→1 maps to cocking parts moving backward
    // on the gun's local +Z axis (toward camera), with a slight whole-gun dip + tilt.
    const cockAmt = Game.gun.cockProgress;

    // Per-gun pose data — built guns store their default hipfire position via
    // group.position.set(...), but we override here for ADS blending.
    // ADS pose is gun-type-specific so sights line up with the crosshair area.
    const gunType = Game.gun.type;
    let hipPos, adsPos, hipRotY, hipRotX;
    if (gunType === 'shotgun') {
      hipPos  = { x: 0.13, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.085, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'spas') {   // v1.398: the shotgun at the hip; aimed, the bead's top (y 0.060) on the reticle
      hipPos  = { x: 0.13, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.060, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'semishotgun') {   // v1.328: the shotgun at the hip; aimed, the front post's tip (y 0.068) in the ghost ring
      hipPos  = { x: 0.13, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.069, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'ar') {
      hipPos  = { x: 0.13, y: -0.20, z: -0.32 };
      // v1.73: drop iron ADS Y -0.075 → -0.087 so the front-sight post TIP
      // (gun-local Y ≈ 0.085) lands on the centered reticle instead of riding
      // above it (playtest: "ironsight too high"). The optic path overrides this
      // via adsYCorr when a red-dot/scope is mounted, so this only affects irons.
      adsPos  = { x: 0.0,  y: -0.087, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'famas' || gunType === 'erifle' || gunType === 'burst') {   // v1.325: the AR's poses (its post's tip is at the same height); v1.326: and the Electric Rifle's
      hipPos  = { x: 0.13, y: -0.20, z: -0.32 };
      adsPos  = { x: 0.0,  y: -0.087, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'sniper') {   // v1.347: aimed, the front post's tip (y 0.058) on the reticle (−0.085 since v1.225 put it 2.5° low)
      hipPos  = { x: 0.12, y: -0.22, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.058, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'l96' || gunType === 'svd') {   // v1.336: the sniper's hold; aimed, the front post's tip (y 0.058) on the reticle (v1.395: and the SVD's)
      hipPos  = { x: 0.12, y: -0.22, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.058, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'm249') {   // v1.335: the AK's hold; aimed, the front post's tip (y 0.071) in the rear notch
      hipPos  = { x: 0.13, y: -0.20, z: -0.31 };
      adsPos  = { x: 0.0,  y: -0.071, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'ak47' || gunType === 'rpk') {   // v1.396: and the RPK, on the AK's sights
      hipPos  = { x: 0.13, y: -0.20, z: -0.32 };
      adsPos  = { x: 0.0,  y: -0.07, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'mp5') {
      hipPos  = { x: 0.14, y: -0.19, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.072, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'ump') {
      hipPos  = { x: 0.135, y: -0.20, z: -0.31 };
      adsPos  = { x: 0.0,  y: -0.072, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'p90') {   // v1.346: the MP5's hold; aimed, the ring's post tip (y 0.049) on the reticle
      hipPos  = { x: 0.14, y: -0.19, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.049, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'vector') {   // v1.348: the MP5's hold; aimed, the front post's tip (y 0.051) on the reticle
      hipPos  = { x: 0.14, y: -0.19, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.051, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'g36') {   // v1.371: the AK's hold; aimed, the front post's tip (y 0.055) on the reticle
      hipPos  = { x: 0.13, y: -0.20, z: -0.31 };
      adsPos  = { x: 0.0,  y: -0.055, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'm4') {   // v1.373: the G36C's hold; aimed, the front post's tip (y 0.057) on the reticle
      hipPos  = { x: 0.13, y: -0.20, z: -0.31 };
      adsPos  = { x: 0.0,  y: -0.057, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'aug') {   // v1.372: the G36C's hold; aimed, the front post's tip (y 0.053) on the reticle
      hipPos  = { x: 0.13, y: -0.20, z: -0.31 };
      adsPos  = { x: 0.0,  y: -0.053, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'mac10') {        // v1.232: ADS Y is minus the new front post's tip (was −0.078, no sights)
      hipPos  = { x: 0.16, y: -0.18, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.056, z: -0.27 };
      hipRotY = 0.12; hipRotX = -0.05;
    } else if (gunType === 'thunder') {        // v1.168: each ADS Y is minus its sight tip's height
      hipPos  = { x: 0.13, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.069, z: -0.28 };
      hipRotY = 0.10; hipRotX = -0.05;
    } else if (gunType === 'sixshooter') {
      hipPos  = { x: 0.16, y: -0.18, z: -0.32 };
      adsPos  = { x: 0.0,  y: -0.056, z: -0.27 };
      hipRotY = 0.12; hipRotX = -0.05;
    } else if (gunType === 'bucket') {
      hipPos  = { x: 0.14, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.149, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'sprayer' || gunType === 'ticktock') {   // v1.250: the clear automatics, held as the Bucket Gun
      hipPos  = { x: 0.14, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: gunType === 'ticktock' ? -0.0755 : -0.0735, z: -0.27 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'ghost' || gunType === 'rattle') {
      hipPos  = { x: 0.14, y: -0.21, z: -0.30 };
      adsPos  = { x: 0.0,  y: -0.0595, z: -0.25 };
      hipRotY = 0.10; hipRotX = -0.04;
    } else if (gunType === 'boltpistol') {
      hipPos  = { x: 0.16, y: -0.18, z: -0.32 };
      adsPos  = { x: 0.0,  y: -0.066, z: -0.29 };
      hipRotY = 0.12; hipRotX = -0.05;
    } else {
      // pistol (default)
      hipPos  = { x: 0.16, y: -0.18, z: -0.32 };
      adsPos  = { x: 0.0,  y: -0.075, z: -0.28 };
      hipRotY = 0.12; hipRotX = -0.05;
    }
    const adsRotY = 0, adsRotX = 0;
    const a = Game.player.ads;
    // v1.61d: OPTIC SIGHT-LINE CORRECTION. adsPos.y was tuned to bring the IRON
    // sights to screen center. A mounted optic's dot/reticle sits HIGHER (on top
    // of the rail), so without correction the gun rides high and the lens ends up
    // below the centered HUD dot (the optic's whole point is the dot = center).
    // Drop the ADS Y by the optic's sight-line height above the gun origin so the
    // LENS lands on center instead of the bore. Blended in with ADS so the hip
    // pose is untouched. The acc lookup is cheap (cached on the gun group).
    let adsYCorr = 0;
    {
      const accR = fpGun.userData && fpGun.userData.accessories;
      const sightPlR = getMountedAccessories(gunType).find(s => s.type === 'red_dot' || s.type === 'scope');
      if (accR && sightPlR) {
        const optic = sightPlR.type === 'scope' ? accR.scopeOptic : accR.redDotOptic;
        const anchor = accR.sightAnchor;
        if (optic && anchor) {
          // Dot height above the gun origin, in gun-local space (anchor Y + the
          // optic's sight-line height, scaled by the anchor). At full ADS we want
          // the dot at camera-Y 0 (screen center) → gun origin Y = -dotLocalY.
          // adsPos.y already places the origin for irons, so the correction is the
          // delta from that to -dotLocalY. Replaces (not stacks on) the iron tune.
          const dotLocalY = anchor.position.y + (optic.userData.sightLineY || 0) * (anchor.scale.y || 1);
          adsYCorr = (-dotLocalY) - adsPos.y;
        }
      }
    }
    const baseX = hipPos.x + (adsPos.x - hipPos.x) * a;
    const baseY = hipPos.y + (adsPos.y + adsYCorr - hipPos.y) * a;
    const baseZ = hipPos.z + (adsPos.z - hipPos.z) * a;
    // Slight dip + back tilt when cocking
    const cockDip = cockAmt * 0.025;
    const cockTilt = cockAmt * 0.12;
    // v1.40: viewmodel bob — the gun mesh physically sways with player movement.
    // Everything parented to fpGun (laser unit, flashlight) inherits this, so the
    // beam/dot move WITH the gun instead of drifting independently.
    const p = Game.player;
    fpGun.position.set(
      baseX + (p.bobPosX || 0),
      baseY - cockDip - (fpGun.userData.kick || 0) * 0.04 + (p.bobPosY || 0),
      baseZ + cockAmt * 0.03 + (fpGun.userData.kick || 0) * 0.05 + (p.bobPosZ || 0)
    );
    // v1.27c: HIPFIRE BARREL CONVERGENCE. The gun is held right-of-center and
    // yawed outward, so its barrel points away from the screen-center reticle —
    // which made the (correctly-zeroed) laser splay off at an awkward angle. We
    // now angle the whole gun slightly toward the aim point at hipfire so the
    // barrel, laser, and reticle roughly agree. Computed from the gun's held
    // position toward the convergence point (0,0,-ZERO) in camera space, then
    // blended OUT as you ADS (ADS already centers the gun via adsRot* = 0).
    // A partial factor (not full) keeps a little natural off-axis cant so it
    // still reads as "held at the hip," not "welded to the camera."
    const CONV = 0.7; // 0 = no convergence (old look), 1 = barrel dead-on center
    const gx = fpGun.position.x, gy = fpGun.position.y, gz = fpGun.position.z;
    const fwdZ = LASER_ZERO_DIST + gz;                        // forward distance to aim plane
    const convYaw = Math.atan2(-gx, fwdZ);   // turn barrel toward x=0
    const convPitch = Math.atan2(-gy, fwdZ); // tilt barrel toward y=0 (gy<0 → pitch up)
    const hipYaw = hipRotY + (convYaw - hipRotY) * CONV;
    const hipPitch = hipRotX + (convPitch - hipRotX) * CONV;
    fpGun.rotation.y = hipYaw + (adsRotY - hipYaw) * a + (p.bobRotY || 0);
    fpGun.rotation.x = hipPitch + (adsRotX - hipPitch) * a + cockTilt + (fpGun.userData.kick || 0) * 0.25 + (p.bobRotX || 0);
    // v1.290 (D.48): walking home after a tag, the gun points at the sky
    const up = p._gunUp || 0;
    if (up > 0) { fpGun.rotation.x += up * 1.15; fpGun.position.y += up * 0.07; fpGun.position.z += up * 0.05; }
    fpGun.rotation.z = (p.bobRotZ || 0);

    // v1.27b: aim the laser at screen-center now that the gun pose is final this
    // frame (so the dot tracks the reticle through sway, cocking dip & ADS).
    aimLaserForGun(fpGun);

    // === Cocking parts animation ===
    // Each FP gun mesh exposes userData.cockingParts (array of meshes that move backward
    // when cocking) and userData.cockingOffset (how far in local +Z at full cock).
    // For sniper: also add a slight vertical bob to suggest bolt rotation+pull.
    const cockingParts = fpGun.userData.cockingParts || [];
    const maxOffset = fpGun.userData.cockingOffset || 0.06;
    // v1.399 (D.63): a blowback gun's slide snaps back with each shot's kick and is home again in about 0.12 s
    const blow = fpGun.userData.blowback ? Math.max(0, Math.min(1, ((fpGun.userData.kick || 0) - 0.35) / 0.45)) : 0;
    const offset = Math.max(cockAmt, blow) * maxOffset;
    for (const part of cockingParts) {
      if (part.userData && typeof part.userData.baseZ === 'number') {
        part.position.z = part.userData.baseZ + offset;
        // Sniper bolt: slight upward bob mid-pull (suggests rotation-then-pull motion)
        if ((gunType === 'sniper' || gunType === 'l96') && typeof part.userData.baseY === 'number') {   // v1.336: and the L96's
          const bob = Math.sin(cockAmt * Math.PI) * 0.012;
          part.position.y = part.userData.baseY + bob;
        }
      }
      // v1.168: the six-shooter's cylinder turns a chamber as the hammer comes back
      if (part.userData && part.userData.cockSpin) part.rotation.y = cockAmt * part.userData.cockSpin;
    }
  } else if (isLoader) {
    // v1.49: Speed loader pose — nozzle points DOWN into the (implied) mag.
    // The "plunge" is driven by whether BBs are actively feeding this frame,
    // not by a fixed-duration progress ramp. A small bob + depressed plunger
    // sells the pumping motion while held; it settles when feeding stops.
    const br = fpLoader.userData.baseRot, bp = fpLoader.userData.basePos;
    const feeding = !!Game.held._feedingActive;   // set in the feed step below
    // gentle pumping bob while actively feeding
    const t = (Game._loaderBobT = (Game._loaderBobT || 0) + (feeding ? dt * 14 : 0));
    const bob = feeding ? Math.sin(t) * 0.5 + 0.5 : 0;   // 0..1 pumping
    fpLoader.position.set(
      bp.x,
      bp.y - bob * 0.015,           // dips down as it pumps
      bp.z + bob * 0.01
    );
    fpLoader.rotation.set(br.x, br.y, br.z);
    // Plunger button depresses (travels toward the nozzle, local -Z) while feeding.
    if (fpLoader.userData.plunger) {
      const base = fpLoader.userData.plunger.userData.baseZ;
      fpLoader.userData.plunger.position.z = base - (feeding ? bob * 0.03 : 0);
    }
    // v1.49: drain the visible BB column to match the loader's remaining fill.
    const bbCol = fpLoader.userData.bbCol;
    if (bbCol) {
      const slot = Game.persist.loadoutSlots[Game.held.slotIdx];
      const sl = slot ? Game.persist.speedLoaders.find(s => s.id === slot.refId) : null;
      const cap = sl ? (SPEED_LOADER_TIERS[sl.tier]?.capacity || 1) : 1;
      const frac = sl ? Math.max(0, Math.min(1, sl.currentBBs / cap)) : 0;
      bbCol.scale.y = Math.max(0.02, frac);   // shrink along the column's length
      bbCol.visible = frac > 0.01;
    }
  } else if (isMag) {
    // Spare mag slamming in
    const usingT = Game.held.using ? Math.min(1, Game.held.useProgress / Game.held.useDuration) : 0;
    fpMag.position.set(
      0.08,
      -0.22 + usingT * 0.1,
      -0.26 - usingT * 0.04
    );
    fpMag.rotation.set(0, 0.2, 0);
  }
}

// v1.260 (backlog D.43, Michael 15 Oct: show the player's $ in a match, and when they've been tagged out, won or are
// about to start one; the same for BBs on those screens): your cash and the BBs in your bag, as a line. On the briefing
// `magSize` is what your gun will load from the bag at BEGIN, and a bag that can't fill it shows red.
function walletHTML(magSize) {
  const bag = Game.persist.bag, low = magSize != null && bag < magSize;
  return `<span><span class="wallet-k">CASH</span><span class="wallet-cash">$${Game.persist.cash}</span></span>` +
    `<span class="${low ? 'wallet-low' : ''}"><span class="wallet-k">BBs IN YOUR BAG</span>${bag}` +
    (magSize != null ? ` <span class="wallet-k">· YOUR GUN LOADS ${magSize}</span>` : '') + `</span>`;
}
function updateAmmoHud() {
  document.getElementById('gunName').textContent = getGunDisplayName(Game.gun.type);
  document.getElementById('ammoCurrent').textContent = Game.gun.ammo;
  document.getElementById('ammoMax').textContent = Game.gun.maxAmmo + (Game.gun.tapedMag ? ` · taped ${Game.gun.tapedAmmo || 0}` : '');   // v1.169
  const bagEl = document.getElementById('bagCount');
  bagEl.textContent = Game.persist.bag;
  bagEl.parentElement.classList.toggle('empty', Game.persist.bag === 0);
  const cashEl = document.getElementById('hudCash'), cashT = `Cash: $${Game.persist.cash}`;   // v1.260 (D.43)
  if (cashEl && cashEl.textContent !== cashT) cashEl.textContent = cashT;
  const s = document.getElementById('ammoStatus');

  if (Game.gun.jammed) {
    s.textContent = 'JAMMED';
    s.className = 'status reloading';
  } else if (Game.gun.flipT > 0) {
    s.textContent = 'FLIPPING MAGS…';   // v1.169
    s.className = 'status reloading';
  } else if (Game.gun.ammo === 0 && Game.gun.tapedMag && Game.gun.tapedAmmo > 0) {
    s.textContent = `MAG EMPTY · R TO FLIP (${Game.gun.tapedAmmo})`;   // v1.169
    s.className = 'status reloading';
  } else if (Game.gun.ammo === 0) {
    // Show what they can do — F to forfeit always available
    // v1.281 (critic, 19 Oct): at the backyard range there is nothing to forfeit (F walks you in); going in and out
    // by the back door fills the gun from your bag
    s.textContent = Game.scenario && Game.scenario.range ? 'MAG EMPTY · BACK DOOR TO RELOAD' : 'MAG EMPTY · F TO FORFEIT';
    s.className = 'status reloading';
  } else if (!Game.gun.cocked) {
    s.textContent = 'HOLD LMB TO RACK';
    s.className = 'status reloading';
  } else {
    s.textContent = 'READY · CLICK TO FIRE';
    s.className = 'status ready';
  }
  if (Pad.active) s.textContent = padWords(s.textContent);   // v1.279 (D.38): RT, X and BACK on a pad
}

function updateLoadoutHud() {
  const container = document.getElementById('loadoutSlotsHud');
  // v1.379: the four boxes are built as text and the DOM is touched only when it changes. They were torn down and
  // rebuilt every step (four divs and their spans, 240 a second), and a long stepGame loop with no frame between
  // piled them up: a 90 s round in one call grew Chromium by 1.3 GB, and three suites at once ran out of memory.
  let html = '';
  const unlocked = getUnlockedSlotCount();
  const hintEl = document.getElementById('loadoutHint');
  let hint = '';

  for (let i = 0; i < 4; i++) {
    const isLocked = i >= unlocked;
    const slot = Game.persist.loadoutSlots[i];
    const desc = describeSlot(i);
    const isHeld = i === Game.held.slotIdx && slot;

    const div = { className: 'slot', innerHTML: '' };   // v1.379: a plain record, written out below
    if (isHeld) div.className += ' held';
    if (!slot || isLocked) div.className += ' empty';

    const keyEl = `<span class="slot-key">${i+1}</span>`;
    if (isLocked) {
      div.innerHTML = `${keyEl}<span class="slot-icon">·</span><span>locked</span>`;
    } else if (!slot) {
      div.innerHTML = `${keyEl}<span class="slot-icon">+</span><span>empty</span>`;
    } else {
      div.innerHTML = `${keyEl}<span class="slot-icon">${desc.icon}</span><span>${desc.name}${desc.kind === 'spare_mag' && Game.mode === 'scenario' ? ` · ${desc.bbs}` : ''}</span>`;   // v1.323: its BBs
      if (isHeld && desc.kind === 'gun') {
        // Cock-action hint varies per gun type
        const cockVerb = Game.gun.cockType === 'pump' ? 'pump the forestock'
                       : Game.gun.cockType === 'charge' ? 'pull the charging handle'
                       : Game.gun.cockType === 'bolt' ? 'cycle the bolt'
                       : 'rack the slide';
        hint = Game.gun.jammed ? 'Hold R to clear the jam.'
             : !Game.gun.cocked ? `Click & hold LMB to ${cockVerb}.`
             : Game.gun.ammo === 0 ? 'Mag empty. Switch to a reload item.'
             : 'Click LMB to fire.';
      } else if (isHeld && desc.kind === 'speed_loader') {
        hint = desc.ref.currentBBs === 0 ? 'Loader is empty. Switch back.'
             : Game.gun.ammo >= Game.gun.maxAmmo ? 'Mag is full.'
             : 'Hold LMB to feed BBs.';
      } else if (isHeld && desc.kind === 'noodle') {
        hint = 'Click or V to swing. Get close.';   // v1.249
      } else if (isHeld && desc.kind === 'spare_mag') {
        hint = desc.bbs <= 0 ? 'Spare mag is empty. Switch back.' : 'Hold LMB to slam in the fresh mag.';   // v1.323
      }
    }
    html += `<div class="${div.className}">${div.innerHTML}</div>`;
  }
  if (container._html !== html) { container.innerHTML = html; container._html = html; }   // v1.379
  const hintText = padWords(hint);   // v1.279
  if (hintEl.textContent !== hintText) hintEl.textContent = hintText;   // v1.379
}

function updateProgressBars() {
  // Cock bar
  const cockBar = document.getElementById('cockBar');
  const cockFill = document.getElementById('cockFill');
  const cockLabel = cockBar.querySelector('.cock-label');
  // Stay visible briefly after a successful cock to show the green confirmation
  const showSuccessFlash = Game.gun._successFlashTime > 0;
  const showBar = !Game.gun.jammed && Game.held.slotIdx === 0 && (
    Game.gun.cockProgress > 0.01 || Game.gun.cockReleasing || showSuccessFlash
  );

  if (showBar) {
    cockBar.style.display = 'block';

    // What width does the player see?
    // - Pulling back: live cockProgress
    // - Releasing after a successful (will-cock) pull: HOLD at 100% (don't drain)
    // - Releasing after a failed pull: drain naturally (so user sees "didn't take")
    // - Success flash window: 100%
    let displayPct;
    if (showSuccessFlash) {
      displayPct = 100;
    } else if (Game.gun.cockReleasing && Game.gun._releaseWillCock) {
      displayPct = 100;
    } else {
      displayPct = Game.gun.cockProgress * 100;
    }
    cockFill.style.width = displayPct + '%';

    // Visual states
    cockFill.classList.toggle('full', Game.gun.cockProgress >= 0.95 || showSuccessFlash || (Game.gun.cockReleasing && Game.gun._releaseWillCock));
    cockFill.classList.toggle('success', showSuccessFlash);

    // Label
    if (showSuccessFlash || (Game.gun.cockReleasing && Game.gun._releaseWillCock)) {
      cockLabel.innerHTML = '✓ COCKED · READY';
    } else {
      const cockText = Game.gun.cockType === 'pump'   ? 'PUMP FORESTOCK'
                     : Game.gun.cockType === 'charge' ? 'PULL CHARGING HANDLE'
                     : Game.gun.cockType === 'bolt'   ? 'CYCLE BOLT'
                     : 'RACK SLIDE';
      cockLabel.textContent = cockText;
    }
  } else {
    cockBar.style.display = 'none';
  }

  // Decay success flash timer
  if (Game.gun._successFlashTime > 0) {
    Game.gun._successFlashTime -= 1/60;
    if (Game.gun._successFlashTime < 0) Game.gun._successFlashTime = 0;
  }

  // Jam bar
  const jamBar = document.getElementById('jamBar');
  const jamFill = document.getElementById('jamFill');
  if (Game.gun.jammed) {
    jamBar.style.display = 'block';
    jamFill.style.width = (Game.gun.jamProgress / UNJAM_TIME * 100) + '%';
  } else {
    jamBar.style.display = 'none';
  }
  // Use bar (speed loader / spare mag)
  const useBar = document.getElementById('useBar');
  const useFill = document.getElementById('useFill');
  const useLabel = document.getElementById('useLabel');
  if (Game.held.using && Game.held.useKind === 'speed_loader') {
    // v1.49: the bar shows BBs REMAINING in the loader (drains as you feed),
    // not a load-progress fill. Label reports live loader/mag counts, and flips
    // to a MAG FULL / EMPTY indicator when feeding can't continue.
    useBar.style.display = 'block';
    const slot = Game.persist.loadoutSlots[Game.held.slotIdx];
    const sl = slot ? Game.persist.speedLoaders.find(s => s.id === slot.refId) : null;
    const cap = sl ? (SPEED_LOADER_TIERS[sl.tier]?.capacity || 1) : 1;
    const left = sl ? sl.currentBBs : 0;
    const pct = Math.max(0, Math.min(100, (left / cap) * 100));
    useFill.style.width = pct + '%';
    const magFull = Game.gun.ammo >= Game.gun.maxAmmo;
    useFill.classList.toggle('mag-full', magFull);
    useFill.classList.toggle('loader-empty', left <= 0);
    if (magFull) {
      useLabel.textContent = `MAG FULL · ${left} BBs LEFT IN LOADER`;
    } else if (left <= 0) {
      useLabel.textContent = 'LOADER EMPTY';
    } else {
      useLabel.textContent = `FEEDING · MAG ${Game.gun.ammo}/${Game.gun.maxAmmo} · LOADER ${left}`;
    }
  } else if (Game.held.using && Game.held.useKind === 'spare_mag') {
    useBar.style.display = 'block';
    useFill.classList.remove('mag-full', 'loader-empty');
    useFill.style.width = (Game.held.useProgress / Game.held.useDuration * 100) + '%';
    useLabel.textContent = 'SWAPPING MAG…';
  } else {
    useBar.style.display = 'none';
    useFill.classList.remove('mag-full', 'loader-empty');
  }
}

function updateHealthHud() {
  const slots = document.getElementById('hitSlots');
  slots.innerHTML = '';
  for (let i = 0; i < Game.player.maxHits; i++) {
    const s = document.createElement('div');
    s.className = 'hit-slot' + (i < Game.player.hitsTaken ? ' taken' : '');
    slots.appendChild(s);
  }
}

// Roster HUD — list of opposing kids with name, lives (red pips), distance.
// Called from the per-frame scenario loop. Cheap enough to re-render every frame.
function updateRosterHud() {
  const list = document.getElementById('rosterList');
  if (!list || !Game.scenario || !Game.scenario.enemies) {
    if (list && list._html !== '') { list.innerHTML = ''; list._html = ''; }   // v1.379
    return;
  }
  const rows = [];
  // v1.34: in TEAM BATTLES (not FFA), kids carry a `lives` pool — show that as
  // pips and treat "out" as lives-exhausted (a kid mid-respawn still has lives,
  // so it isn't dead). Elsewhere the roster shows health pips as before.
  const teamBattle = (Game.scenario.winCondition === 'last_team_standing') && !Game.scenario.ffa;
  const playerTeam = (Game.player && Game.player.team) || 'player';
  for (const e of Game.scenario.enemies) {
    // v1.42: allies (same team as the player — e.g. Eric/Rebecca on blue) are
    // listed too, so the panel isn't purely "opposing". Flag them so their pips
    // render green and the row reads as friendly. FFA has no allies.
    const ally = !Game.scenario.ffa && ((e.team || 'enemy') === playerTeam);
    // v1.36g: lives pips also when an FFA kid carries a lives pool (multi-life FFA).
    const usesLives = (teamBattle || Game.scenario.ffa) && typeof e.lives === 'number';
    const dead = usesLives ? (e.lives <= 0) : (e.health <= 0);
    const dx = Game.player.pos.x - e.pos.x;
    const dz = Game.player.pos.z - e.pos.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const distStr = dead ? '—' : (dist < 10 ? dist.toFixed(1) + 'm' : Math.round(dist) + 'm');
    // Lives pips — filled = remaining, empty = spent.
    const maxPips = usesLives ? (e.maxLives || 1) : (e.maxHealth || 1);
    const remaining = usesLives ? Math.max(0, e.lives) : Math.max(0, e.health);
    let pipsHtml = '';
    if (usesLives && maxPips >= 99) pipsHtml = '<span class="r-inf">∞</span>';   // v1.170: a VIP match's respawners
    else for (let i = 0; i < maxPips; i++) {
      const filled = i < remaining;
      pipsHtml += `<div class="r-pip${ally ? ' ally' : ''}${filled ? '' : ' empty'}"></div>`;
    }
    rows.push(`
      <div class="roster-row${dead ? ' dead' : ''}${ally ? ' ally' : ''}">
        <div class="r-name">${e.name}${e.vip ? ' ★' : ''}</div>
        <div class="r-lives">${pipsHtml}</div>
        <div class="r-dist">${distStr}</div>
      </div>
    `);
  }
  const html = rows.join('');
  if (list._html !== html) { list.innerHTML = html; list._html = html; }   // v1.379: only when a row changes
}

// v1.322 (backlog D.62, Michael 22 Oct: "a red 'flash' around the peripherals of the player's view when they are hit
// ... The audio alone is not enough of a cue, as many bullets hitting near the player can sound similar"). The old
// flash was a 50 ms pulse of a soft inset shadow, gone before it showed. Now a hit turns the edges of the view red at
// full strength and it fades over HURT_FLASH_SEC of game time, the middle of the view left clear to aim through.
const HURT_FLASH_SEC = 0.5;
function flashDamage() {
  Game.hurtFlashT = HURT_FLASH_SEC;
  Game.hurtFlashes = (Game.hurtFlashes || 0) + 1;
  hurtFlashStep(0);
}
function hurtFlashStep(dt) {
  const v = document.getElementById('damageVignette');
  if (!v) return;
  if (Game.hurtFlashT > 0) Game.hurtFlashT = Math.max(0, Game.hurtFlashT - dt);
  const k = (Game.hurtFlashT || 0) / HURT_FLASH_SEC;
  v.style.opacity = k > 0 ? Math.sqrt(k).toFixed(3) : '0';   // holds strong, then goes
}

function updateStanceHud() {
  const p = Game.player;
  const airborne = !p.onGround;
  const isStanding = !p.crouching && !p.sprinting && !p.sliding && !airborne;
  document.getElementById('stanceStand').className = isStanding ? 'active' : '';
  document.getElementById('stanceSprint').className = p.sprinting ? 'active' : '';
  document.getElementById('stanceCrouch').className = (p.crouching && !p.sliding) ? 'active' : '';
  document.getElementById('stanceSlide').className = p.sliding ? 'active' : '';
  document.getElementById('stanceAir').className = airborne ? 'active' : '';
  document.getElementById('stanceAds').className = p.ads > 0.5 ? 'active' : '';
  // v1.61: SIGHT PICTURE per equipped optic.
  //  - red-dot: glowing center dot, generic ADS vignette stays (light tunnel).
  //  - scope: full scoped mask (circle + crosshair) that REPLACES the generic
  //    vignette, fading in with ADS; iron crosshair hidden behind it.
  const hasRedDot = gunHasAccessoryType(Game.gun.type, 'red_dot');
  const hasScope  = gunHasAccessoryType(Game.gun.type, 'scope');
  const scopeOv = document.getElementById('scopeOverlay');
  const scopeActive = hasScope && p.ads > 0.15;
  if (scopeOv) scopeOv.style.opacity = scopeActive ? Math.min(1, (p.ads - 0.15) / 0.5).toFixed(2) : '0';
  // The generic dark vignette: suppressed under a scope (the scope mask owns the
  // frame), normal otherwise.
  document.getElementById('adsVignette').style.opacity = scopeActive ? '0' : (p.ads * 0.85).toFixed(3);
  // v1.27/1.61b: RED-DOT. The dot IS the reticle. At the hip, the in-world mesh
  // dot on the lens sells the optic; as you ADS, that mesh dot fades out and the
  // screen-CENTERED HUD dot fades in, so when aimed the dot sits exactly where the
  // crosshair was (dead center). The iron crosshair hides whenever the red-dot
  // HUD dot is showing.
  const reticle = document.getElementById('redDotReticle');
  const ch = document.getElementById('crosshair');
  // Cross-fade the in-world lens dot: full at hip, gone by mid-ADS.
  const acc = (typeof getActiveFpGun === 'function') ? getActiveFpGun()?.userData?.accessories : null;
  if (acc && acc.redDotOptic && acc.redDotOptic.userData.dot) {
    const md = acc.redDotOptic.userData.dot;
    if (hasRedDot) {
      md.material.opacity = Math.max(0, 0.95 * (1 - p.ads / 0.5));
      md.visible = md.material.opacity > 0.02;
    }
  }
  if (reticle) {
    if (hasRedDot && p.ads > 0.15) {
      reticle.style.display = 'block';
      reticle.style.opacity = Math.min(1, (p.ads - 0.15) / 0.35).toFixed(2);  // fade IN as the mesh dot fades out
      if (ch) ch.style.display = 'none';   // hide the iron crosshair behind the dot
    } else {
      reticle.style.display = 'none';
      if (ch && Game.mode === 'scenario' && !scopeActive) ch.style.display = 'block';
    }
  }
  // Hide the iron crosshair while the scope picture is up (its own reticle shows).
  if (ch && scopeActive) ch.style.display = 'none';
}

// =====================================================================
// v1.40 — PER-GUN RETICLE + AIM BLOOM
// ---------------------------------------------------------------------
// The reticle is an SVG drawn in a -50..50 viewBox centered at (0,0). Each
// gun type gets a distinct shape. The reticle has two parts:
//   - a CENTER group (dot / inner cross) that stays put, and
//   - an OUTER group of marks/ring whose distance from center = baseGap +
//     bloom, so the reticle visibly "opens up" as aim sway grows and tightens
//     when you crouch / ADS / stand still.
// We rebuild the SVG only when the gun (or accessory-driven tightness) changes;
// per frame we just set transforms, which is cheap.
// =====================================================================
const RETICLE_NS = 'http://www.w3.org/2000/svg';
function _svg(tag, attrs) {
  const el = document.createElementNS(RETICLE_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
// Per-gun reticle spec. baseGap = resting distance (px in viewBox) of the outer
// marks from center; the live bloom adds to it. `style` picks the geometry.
const RETICLE_SPECS = {
  pistol:  { style: 'ring_ticks', baseGap: 9,  ringR: 9,  centerDot: 1.4 },
  shotgun: { style: 'big_circle', baseGap: 20, ringR: 22, centerDot: 1.6 },
  spas:    { style: 'big_circle', baseGap: 16, ringR: 18, centerDot: 1.6 },   // v1.398: the shotgun's, a little tighter
  ar:      { style: 'dot_cross',  baseGap: 10, ringR: 6,  centerDot: 1.6 },
  sniper:  { style: 'fine_cross', baseGap: 6,  ringR: 0,  centerDot: 1.0 },
  ak47:    { style: 'circle_cross', baseGap: 12, ringR: 11, centerDot: 1.4 },
  rpk:     { style: 'circle_cross', baseGap: 12, ringR: 11, centerDot: 1.4 },   // v1.396: the AK's
  mp5:     { style: 'circle_cross', baseGap: 10, ringR: 9,  centerDot: 1.3 },
  ump:     { style: 'circle_cross', baseGap: 10, ringR: 9,  centerDot: 1.3 },
  p90:     { style: 'circle_cross', baseGap: 10, ringR: 10, centerDot: 1.3 },   // v1.346: the UMP's, its ring a little wider
  vector:  { style: 'circle_cross', baseGap: 10, ringR: 9,  centerDot: 1.3 },   // v1.348: the MP5's
  g36:     { style: 'circle_cross', baseGap: 11, ringR: 10, centerDot: 1.4 },   // v1.371: a little under the AK's
  aug:     { style: 'circle_cross', baseGap: 10, ringR: 10, centerDot: 1.3 },   // v1.372: tighter than the G36C's
  m4:      { style: 'circle_cross', baseGap: 11, ringR: 10, centerDot: 1.3 },   // v1.373: between the G36C's and the AUG's
  mac10:   { style: 'wide_ticks', baseGap: 13, ringR: 0,  centerDot: 1.5 },
  thunder: { style: 'big_circle', baseGap: 28, ringR: 30, centerDot: 1.6 },   // v1.168: wider than the spring shotgun
  sixshooter: { style: 'ring_ticks', baseGap: 9, ringR: 9, centerDot: 1.4 },
  bucket:  { style: 'wide_ticks', baseGap: 14, ringR: 0,  centerDot: 1.5 },
  boltpistol: { style: 'fine_cross', baseGap: 7, ringR: 0, centerDot: 1.1 },
  sprayer: { style: 'wide_ticks', baseGap: 16, ringR: 0, centerDot: 1.5 },   // v1.250
  ghost:   { style: 'circle_cross', baseGap: 10, ringR: 9, centerDot: 1.3 },
  ticktock: { style: 'dot_cross', baseGap: 8, ringR: 6, centerDot: 1.4 },
  famas:   { style: 'dot_cross',  baseGap: 10, ringR: 6,  centerDot: 1.6 },   // v1.325: the AR's
  epistol: { style: 'ring_ticks', baseGap: 9,  ringR: 9,  centerDot: 1.4 },   // v1.326: the pistol's
  gaspistol: { style: 'ring_ticks', baseGap: 8,  ringR: 8,  centerDot: 1.4 },   // v1.399: the pistol's, a little tighter
  erifle:  { style: 'dot_cross',  baseGap: 10, ringR: 6,  centerDot: 1.6 },   // v1.326: the AR's
  burst:   { style: 'circle_cross', baseGap: 11, ringR: 9, centerDot: 1.5 },   // v1.327
  semishotgun: { style: 'big_circle', baseGap: 20, ringR: 22, centerDot: 1.6 },   // v1.328: the shotgun's
  m249:    { style: 'circle_cross', baseGap: 14, ringR: 13, centerDot: 1.4 },   // v1.335: the AK's, a little wider
  l96:     { style: 'fine_cross', baseGap: 5,  ringR: 0,  centerDot: 1.0 },   // v1.336: the sniper's, a little tighter
  svd:     { style: 'fine_cross', baseGap: 7,  ringR: 0,  centerDot: 1.1 },   // v1.395: the sniper's, a little wider
  rattle:  { style: 'wide_ticks', baseGap: 18, ringR: 0, centerDot: 1.5 },
};
function getReticleSpec(gunType) { return RETICLE_SPECS[gunType] || RETICLE_SPECS.pistol; }

let _reticleBuiltFor = null;   // gun type the current SVG was built for
// Build the static SVG geometry for a gun. Outer marks go in a #ret-outer group
// (whose children are positioned at ±baseGap); per-frame we translate/scale that
// group to apply bloom, leaving the center fixed.
function buildReticle(gunType) {
  const svg = document.getElementById('reticleSvg');
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const spec = getReticleSpec(gunType);
  const center = _svg('g', { id: 'ret-center' });
  const outer = _svg('g', { id: 'ret-outer' });
  svg.appendChild(outer);
  svg.appendChild(center);

  // Center dot (most guns).
  if (spec.centerDot > 0 && spec.style !== 'big_circle') {
    center.appendChild(_svg('circle', { cx: 0, cy: 0, r: spec.centerDot, class: 'ret-fill' }));
  }

  const g = spec.baseGap;
  // Helper: a tick line from (inner) to (outer) along an axis direction.
  const tick = (x1, y1, x2, y2, cls) => outer.appendChild(_svg('line', { x1, y1, x2, y2, class: cls || 'ret-stroke' }));

  if (spec.style === 'ring_ticks') {
    // Pistol: a ring + 4 short outer ticks (clean, compact).
    center.appendChild(_svg('circle', { cx: 0, cy: 0, r: spec.ringR, class: 'ret-stroke ret-dim' }));
    const t = 5;
    tick(0, -g, 0, -g - t); tick(0, g, 0, g + t);
    tick(-g, 0, -g - t, 0); tick(g, 0, g + t, 0);
  } else if (spec.style === 'big_circle') {
    // Shotgun: a big circle (the pellet cone) + a small center dot + 4 inner ticks.
    center.appendChild(_svg('circle', { cx: 0, cy: 0, r: spec.centerDot, class: 'ret-fill' }));
    outer.appendChild(_svg('circle', { cx: 0, cy: 0, r: spec.ringR, class: 'ret-stroke' }));
    const t = 4;
    tick(0, -spec.ringR, 0, -spec.ringR + t); tick(0, spec.ringR, 0, spec.ringR - t);
    tick(-spec.ringR, 0, -spec.ringR + t, 0); tick(spec.ringR, 0, spec.ringR - t, 0);
  } else if (spec.style === 'dot_cross') {
    // Spring AR: small center dot with a + crosshair of 4 marks around it.
    const t = 7;
    tick(0, -g, 0, -g - t); tick(0, g, 0, g + t);
    tick(-g, 0, -g - t, 0); tick(g, 0, g + t, 0);
  } else if (spec.style === 'fine_cross') {
    // Sniper: very fine long cross + tiny center dot (precision).
    const t = 16, gap = g;
    tick(0, -gap, 0, -gap - t); tick(0, gap, 0, gap + t);
    tick(-gap, 0, -gap - t, 0); tick(gap, 0, gap + t, 0);
  } else if (spec.style === 'circle_cross') {
    // Autos (AK/MP5/UMP): a ring with a + of marks just outside it.
    center.appendChild(_svg('circle', { cx: 0, cy: 0, r: spec.ringR, class: 'ret-stroke ret-dim' }));
    const t = 6;
    tick(0, -g, 0, -g - t); tick(0, g, 0, g + t);
    tick(-g, 0, -g - t, 0); tick(g, 0, g + t, 0);
  } else if (spec.style === 'wide_ticks') {
    // MAC-10: wide horizontal ticks (spray hose) — emphasizes the wide cone.
    const t = 9;
    tick(-g, 0, -g - t, 0); tick(g, 0, g + t, 0);
    tick(0, -g * 0.7, 0, -g * 0.7 - t * 0.6); tick(0, g * 0.7, 0, g * 0.7 + t * 0.6);
  }
  _reticleBuiltFor = gunType;
}

// Per-frame: scale the outer group outward by the current aim bloom. bloom is a
// multiplier ≥1 (1 = resting). We translate each outer child radially by moving
// the whole group's scale about center — a uniform scale keeps the cross/ring
// proportional and reads as "opening up."
function updateReticleBloom() {
  const svg = document.getElementById('reticleSvg');
  if (!svg) return;
  if (_reticleBuiltFor !== Game.gun.type) buildReticle(Game.gun.type);
  const outer = document.getElementById('ret-outer');
  if (!outer) return;
  // Bloom: 1.0 at rest, grows with sway. sway ≈0.18 standing → ~1.07; ≈0.8 jog
  // → ~1.32; ≈1.35 sprint → ~1.54. ADS/crouch already shrank `sway` upstream,
  // so they tighten the reticle for free.
  const bloom = 1 + (Game.player.sway || 0) * 0.42;
  outer.setAttribute('transform', `scale(${bloom.toFixed(3)})`);
  // Subtle opacity lift when very tight (ADS) so the precise reticle reads crisp.
  svg.style.opacity = (0.82 + Math.max(0, 0.25 - (Game.player.sway || 0)) * 0.5).toFixed(2);
}

function updateBedroomHud() {
  document.getElementById('cashAmount').textContent = '$' + Game.persist.cash;
  document.getElementById('bedroomBag').textContent = Game.persist.bag;
}

// v1.26: stamina bar — fill % of pool, color-coded, with an exhausted state.
function updateStaminaHud() {
  const hud = document.getElementById('staminaHud');
  if (!hud) return;
  if (Game.mode !== 'scenario') { hud.style.display = 'none'; return; }
  hud.style.display = 'block';
  const p = Game.player;
  const frac = p.staminaMax > 0 ? Math.max(0, Math.min(1, p.stamina / p.staminaMax)) : 0;
  document.getElementById('staminaFill').style.width = (frac * 100).toFixed(1) + '%';
  hud.classList.toggle('exhausted', !!p.exhausted);
  hud.classList.toggle('low', !p.exhausted && frac < 0.3);
}

// v1.26: render the equipped eyewear's view tint + edge vignette (+ mesh grid).
function updateEyewearOverlay() {
  const ov = document.getElementById('eyewearOverlay');
  if (!ov) return;
  const canvas = Game.renderer && Game.renderer.domElement;
  // v1.379: clearing is skipped when there is nothing to clear (it ran every step with no eyewear on)
  const clear = () => { if (ov.dataset.cleared === '1') return; ov.style.display = 'none'; ov.className = ''; ov.innerHTML = ''; if (canvas) canvas.style.filter = ''; ov.dataset.frame = ''; ov.dataset.cleared = '1'; };
  if (Game.mode !== 'scenario') { clear(); return; }
  const eq = getEquippedEyewear();
  const view = eq.view;
  if (!view) { clear(); return; }

  ov.dataset.cleared = '';   // v1.379
  ov.style.display = 'block';
  ov.className = '';
  const style = view.frameStyle || 'glasses';
  const seeThrough = (style !== 'mask');
  // See-through frames (goggles/glasses) keep the PERIPHERY raw — so we DON'T
  // cast the canvas filter over the whole view; the lens look comes from the
  // in-lens tint instead. Masks wrap the face, so they keep the full filter.
  if (canvas) canvas.style.filter = seeThrough ? '' : (view.filter || '');

  // Rebuild the SVG only when the equipped eyewear changes (id covers both the
  // frame style and which tint to use). Otherwise leave it as-is.
  if (ov.dataset.frame !== eq.id) {
    ov.dataset.frame = eq.id;
    ov.innerHTML = buildEyewearFrameSVG(view);
  }
}

// Returns SVG markup for the frame. viewBox is 100×100, stretched to fill the
// screen. Goggles/glasses are SEE-THROUGH: only a frame band hugs each lens and
// the periphery beyond it is fully transparent (raw, untinted view). Masks fill
// the whole surround opaquely. Lens tint + vignette + (optional mesh) draw only
// inside the lens interiors via a clip path.
function buildEyewearFrameSVG(view) {
  const col = view.frameColor || '#1c1d22';
  const vig = view.vignette || 0;
  const style = view.frameStyle || 'glasses';
  // See-through frames (goggles/glasses) leave the periphery as raw, untinted
  // 3D view. Masks wrap the whole face, so everything outside stays opaque.
  const seeThrough = (style !== 'mask');
  // v1.64: whether the surround OUTSIDE the lens holes is filled opaquely. Masks
  // always are; swim goggles now are too (no peripheral vision). Glasses/goggles
  // keep their raw, open periphery (only a band hugs the lenses).
  const opaqueSurround = (style === 'mask' || style === 'swim');
  // For see-through frames we drop the canvas filter (handled in updateEyewearOverlay)
  // so the lens look comes from a richer in-lens tint; masks keep the flat tint.
  // (swim is see-through for the FILTER decision but opaque for the SURROUND.)
  const tint = seeThrough ? (view.lensTint || view.tint || 'transparent') : (view.tint || 'transparent');

  // Lens shapes WITHOUT fill (reused as the aperture mask, clip, and rim).
  // viewBox is 100x100 stretched to the screen (preserveAspectRatio=none).
  // Goggles/glasses are TWO BIG OVERLAPPING ovals: each eye looks through its own
  // lens, the brain fuses them, so the overlapping CENTER is unobstructed — no
  // bridge, and the frame band is only visible on the OUTER perimeter of the union.
  let shapes, rimW, bandW, bridge = '', temples = '';
  if (style === 'mask') {
    shapes = [`<rect x="9" y="16" width="82" height="68" rx="30" ry="28"/>`];
    rimW = 6;
  } else if (style === 'goggle') {
    // Large overlapping ovals. cx 36/64, rx 40 → they overlap across the center.
    shapes = [
      `<ellipse cx="36" cy="50" rx="40" ry="44"/>`,
      `<ellipse cx="64" cy="50" rx="40" ry="44"/>`,
    ];
    // Stroke is centered on the path and masked to outside the lenses, so only
    // its outer half shows — double the values for the intended visible band.
    rimW = 5; bandW = 10;
  } else if (style === 'swim') {
    // v1.63 — Swimming goggles. v1.64: the surround is now FULLY OPAQUE (like a
    // mask) so ALL peripheral vision is cut off — only the two lens holes show
    // the world. The two ovals OVERLAP across the center (cx 38/62, rx 34) so the
    // union is one continuous opening with NO dark bridge between the eyes.
    shapes = [
      `<ellipse cx="38" cy="50" rx="34" ry="36"/>`,
      `<ellipse cx="62" cy="50" rx="34" ry="36"/>`,
    ];
    rimW = 6; bandW = 16;
  } else { // glasses — slightly smaller overlapping ovals, thinner rim + temples
    shapes = [
      `<ellipse cx="37" cy="50" rx="36" ry="38"/>`,
      `<ellipse cx="63" cy="50" rx="36" ry="38"/>`,
    ];
    rimW = 3.5; bandW = 7;
    temples = `<rect x="0" y="48" width="6" height="3" rx="1.5" fill="${col}"/>` +
              `<rect x="94" y="48" width="6" height="3" rx="1.5" fill="${col}"/>`;
  }
  const holesWhite = shapes.map(s => s.replace(/\/>$/, ' fill="white"/>')).join('');
  const holesBlack = shapes.map(s => s.replace(/\/>$/, ' fill="black"/>')).join('');
  const rim = shapes.join('');
  const mesh = view.mesh
    ? `<g clip-path="url(#ew-clip)"><rect x="0" y="0" width="100" height="100" fill="url(#ew-mesh)" opacity="0.6"/></g>`
    : '';

  // Frame body. Mask: opaque everywhere except the aperture. See-through: a thin
  // frame BAND drawn as a wide stroke around the lenses, but MASKED by the
  // aperture (white screen minus the lens union) so the stroke only survives
  // OUTSIDE the lens interiors. Where the two ovals overlap, each lens's inner
  // rim falls inside the other lens and is clipped away — leaving just the outer
  // perimeter of the union, with the center fully open and no bridge.
  const frameBody = !opaqueSurround
    ? `<g mask="url(#ew-aperture)"><g fill="none" stroke="${col}" stroke-width="${bandW}" stroke-linejoin="round">${rim}</g></g>`
    : `<rect x="-2" y="-2" width="104" height="104" fill="${col}" mask="url(#ew-aperture)"/>`;
  // Rim seat/highlight strokes. Open (see-through) frames mask the rim to the
  // outer perimeter. Swim (opaque surround) also masks it so the stroke doesn't
  // cut across the open center where its two lenses overlap (v1.64). The full
  // mask keeps its original unmasked oval seat.
  const rimSeat = (opaqueSurround && style !== 'swim')
    ? `<g fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="${rimW}">${rim}</g>`
    : `<g mask="url(#ew-aperture)"><g fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="${rimW}">${rim}</g></g>`;

  return `
  <svg class="ew-svg" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="ew-aperture">
        <rect x="0" y="0" width="100" height="100" fill="white"/>
        ${holesBlack}
      </mask>
      <clipPath id="ew-clip">${holesWhite}</clipPath>
      <pattern id="ew-mesh" width="1.4" height="1.4" patternUnits="userSpaceOnUse">
        <rect width="1.4" height="0.35" fill="rgba(0,0,0,0.5)"/>
        <rect width="0.35" height="1.4" fill="rgba(0,0,0,0.5)"/>
      </pattern>
      <radialGradient id="ew-vig" cx="50%" cy="50%" r="72%">
        <stop offset="65%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,${vig.toFixed(2)})"/>
      </radialGradient>
    </defs>
    <!-- Lens tint + vignette: clipped to the lens interiors (the union) only -->
    <g clip-path="url(#ew-clip)">
      <rect class="ew-tint" x="0" y="0" width="100" height="100" fill="${tint}"/>
      <rect x="0" y="0" width="100" height="100" fill="url(#ew-vig)"/>
    </g>
    ${mesh}
    ${temples}
    ${frameBody}
    ${bridge}
    ${rimSeat}
  </svg>`;
}
