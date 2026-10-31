// =====================================================================
// NEIGHBORHOOD AIRSOFT
// VERSION: 1.85 — Fix the v1.84 "no laser at all" regression (wrong scene).
//          v1.84 moved the beam into a scene-level group to escape the kid's
//          non-uniform-scale shear — correct fix, but it added the group to the
//          global Game.scene. During enterScenario, attachKidLaser runs BEFORE
//          Game.scene is repointed at the scenario scene, so the beam group landed
//          in the stale bedroom scene and never rendered (no beam at all).
//          FIX: add the beam group to the SAME scene the kid lives in (walk the
//          kid's group ancestry to its scene root), and additionally SELF-HEAL each
//          frame in updateKidLaser — if the beam group's parent scene ever differs
//          from the kid's, re-parent it. So the beam always renders in the right
//          scene regardless of attach-time ordering, and still carries no scale
//          (no shear). Net: laser both shows AND points correctly.
//
// VERSION: 1.84 — Enemy laser vertical beam: THE ACTUAL root cause (scale shear).
//          v1.83's diag exposed the real contradiction: the aim DIRECTION logged
//          correct (mostly horizontal, pointing at the player) yet the BEAM
//          rendered vertical. That can only happen if the rendered beam doesn't
//          follow the computed direction — and it didn't, because the beam was a
//          child of the kid mesh, which carries a NON-UNIFORM scale (height scaleY
//          ∈ {0.88,1.0,1.12} vs build scaleXZ ∈ {0.88,1.0,1.18}, set
//          independently — a tall-skinny kid is 1.12y / 0.88xz). A non-uniform
//          parent scale SHEARS directions: a horizontal aim, expressed through the
//          sheared parent frame, tilts UP in world space. lookAt and explicit
//          quaternion aims BOTH failed because the shear is in the parent chain,
//          ABOVE the beam — nothing done to the beam's own local transform can
//          undo a parent shear. (Verified headlessly: a horizontal aim rendered at
//          dir.y 0.16 → 0.20 under 0.88/1.12 scale.)
//          FIX: the beam + dot now live in a SCENE-LEVEL group (kid._laserBeamGroup
//          on Game.scene), NOT under the kid. The emitter housing stays bolted to
//          the gun (for the muzzle origin), but the beam is placed + oriented in
//          pure WORLD space each frame — position = emitter origin, quaternion =
//          local +Z → world ray. No inherited scale, no shear: rendered direction
//          now matches the aim exactly (err 0.0000 even at 0.88/1.12 scale) and the
//          dot lands on the target. The diag HUD also now prints renderDir so any
//          future divergence from dir is visible at a glance.
//
// VERSION: 1.83 — Enemy laser "to the sky": beam overshoot clamp.
//          The v1.82 diagnostics nailed it. The diag showed aim tgt: PLAYER, a
//          correct mostly-horizontal dir (-0.99, 0.17, 0), and the beam CLIPPED at
//          56.83m. The aim math was right all along — the beam was simply 60m long
//          and only clipped on COVER meshes, never on the target. When a kid aimed
//          across open ground at the player (no cover between them), the beam sailed
//          the full ~57m, overshooting the player by ~28m and continuing up the
//          slope into the air. Because that bearing ran roughly toward the camera
//          (player up/down-hill of the shooter), the ~28m of overshoot projected to
//          a near-vertical streak climbing into the night sky — exactly the
//          "gradually higher above my head with the height gap" report (a bigger
//          height gap = a steeper bearing = more of the overshoot pointing up).
//          FIX: updateKidLaser now also clamps the beam length to the distance to
//          the AIM POINT (+0.15m so the dot sits on the target), so the laser
//          terminates ON whatever it's aiming at instead of overshooting. A laser
//          aimed at the player now lands a dot on the player rather than a 60m
//          beam into the sky behind them.
//
// VERSION: 1.82 — Enemy laser "to the sky" hardening + diagnostics.
//          The beam math (origin → aim → lookAt) was verified correct for slope
//          geometry (a chest-aimed beam tilts only ~5-12° even on Bunratty's 9m
//          grade), so a near-vertical beam can only come from (a) the no-aim-point
//          fallback shooting the gun's world-forward when the pose tilts the gun
//          up, or (b) the laser correctly tracking a target that is genuinely
//          uphill (e.g. another kid in a night fight). Fixes:
//          - NO STRAY FALLBACK BEAM. updateKidLaser no longer falls back to the
//            gun's world +Z when it has no aim point — it HIDES the beam that frame
//            instead. A target-less kid can no longer paint a vertical beam.
//          - AIM AT LIVE CHEST. The aim now uses the target's chestY getter (live
//            terrain-planted pos.y) instead of a hand-rolled pos.y + 1.0, so the
//            dot stays locked to the actual chest on slopes.
//          - DIAGNOSTICS. The ` (backtick) laser-diag HUD now reports whether the
//            aim target is the PLAYER or another kid, plus shooterFeetY / tgtFeetY
//            / aimY and the dir vector — so if an up-beam recurs we can tell at a
//            glance whether it's a real uphill target or a bug.
//
// VERSION: 1.81 — Hands snap to real grip points + correct elbow bend direction.
//          Playtest of v1.80 showed the hands floating near the gun (not ON it),
//          the gun looking held "from the top," the off-arm cutting through the
//          torso, and the resting elbow bending the wrong way. Fixes:
//          - GRIP-SNAP. Added gunGripLocal() — the firing-hand grip point on the
//            gun mesh (the pistol grip, at gun-local (0,-0.08,-0.01)). The hands
//            now target the gun's ACTUAL grip / near-handguard world points
//            (gunGroup position + local offset) instead of arbitrary offsets, so
//            they land on the weapon. The gun is positioned by its mount with the
//            grip below, so the hand-on-grip reads as held at the grip (body above)
//            rather than "from the top."
//          - BEND DIRECTION. solveArm now takes an explicit bend-hint vector. The
//            firing (right) arm's elbow kicks OUT to the right (-X) and down, so
//            the forearm angles back IN to the grip (the requested aiming
//            geometry); the off (left) arm's elbow kicks out-left (+X) and down.
//            (v1.80 forced every elbow forward, which inverted the rest pose.)
//          - REACH-AWARE TARGETS. The arm is 0.45m and a hanging hand only reaches
//            down to ~0.60, so targets are tuned to stay reachable: small guns ride
//            higher (gun ~0.74 rest → ~0.88 aim) so the hand meets the grip; large
//            guns are carried CENTERED across the chest at rest (a patrol carry —
//            the off-hand can't cross-reach a foregrip tucked at the far shoulder)
//            and tuck only to center-RIGHT (x~-0.10) on aim. All grips validated to
//            land within arm reach (err≈0; large off-hand ~3cm at full extension).
//          - The gun being forward of the torso (rest) keeps the off-arm from
//            cutting through the body.
//
// VERSION: 1.80 — Elbow joints + exaggerated firing raise (2-bone IK).
//          Replaced the single-box arms with a TWO-SEGMENT ELBOW RIG: each arm is
//          a shoulder pivot Group → upper-arm box → elbow pivot Group → forearm
//          box → hand (upper 0.24m + fore 0.21m). setKidGunHold now runs a proper
//          2-bone IK: it computes the ELBOW point geometrically (segment-sphere
//          intersection, pushed toward a forward/down bend hint so elbows kick
//          forward into a natural shooting stance), then aims the shoulder
//          S→elbow and the elbow elbow→H. The forearm tip lands on the hand
//          target for any reachable pose — no more stiff straight-plank arms.
//          Raised the firing pose per request:
//            - SMALL guns (pistol/mac10): on aim the gun pushes well FORWARD
//              (z+0.30, was +0.18) and rises to CHEST height (y+0.24, was +0.10),
//              both hands gripping out in front of the body.
//            - LARGE guns: on aim the gun rises to the RIGHT ARMPIT (tucked just
//              below the shoulder) with the off-hand reaching across to the
//              handguard IN FRONT OF CENTER (not all the way to the firing
//              shoulder, which is past comfortable reach), slight forward lean.
//          Supporting: createKid builds the rigs + exposes pose.rigR/rigL and new
//          base anchors (shoulder_y, U_LEN, F_LEN, shoulderR/L_x); setKidCrouch
//          resets both rigs to a clean hanging base and drops the shoulder pivots
//          by hipDrop; setKidHitPose raises the gun arm via the shoulder pivot +
//          slight elbow bend; the zombie reach rotates the shoulders forward with
//          a grasp bend; IK scratch math hoisted to module scope (_IK_*) to avoid
//          per-frame allocation. Arm HITBOXES are unchanged (checkEnemyHit uses
//          fixed local AABBs, independent of the visual rig).
//
// VERSION: 1.79 — Shoulder-anchored NPC arms (fixes the off-hand slide).
//          The v1.78 two-handed holds reached across by TRANSLATING the arm
//          box's X — but the arm is a center-pivot box, so moving its X dragged
//          the SHOULDER end inward toward mid-body (the visible "left shoulder
//          slides to center" report). Rewrote anchorArm to model the arm as a
//          box that SPANS shoulder→hand: center at the midpoint, quaternion
//          orienting local -Y along the shoulder→hand direction, scale.y stretched
//          to cover the reach. Both ends now land EXACTLY on their targets, so the
//          shoulder is truly pinned (verified 0.0000m drift for every reach case)
//          for any combination of cross-body and forward reach.
//          - setKidCrouch now resets each arm to a clean euler base (identity
//            quaternion, scale.y=1, X/Z to base) at the top, so anchorArm is the
//            sole quaternion authority each frame and the hit/zombie euler poses
//            (which run without anchorArm) never fight a stale quaternion/stretch.
//          - Walk anim no longer touches the arms (they're quaternion-driven and
//            committed to the weapon); it swings the legs + adds the torso bob only.
//
// VERSION: 1.78 — NPC rig overhaul: handedness + two-handed holds + walk anim.
//          (1) HANDEDNESS. The gun + gun-arm/hand sat on local +X, which reads
//              as LEFT-handed from the player's view. Moved the gun mesh and the
//              gun-side limbs (armR/handR) to local -X (the kid's RIGHT); the
//              off-hand (armL/handL) now lives on +X and reaches across. Pose
//              code still calls the gun side "R" — only the X sign changed. Base
//              X/Z anchors (gun_x, gun_z, arm/hand _x/_z) were added to the pose
//              base record so every pose restores cleanly regardless of side.
//          (2) TWO-HANDED HOLDS. New setKidGunHold(kid, weapon, t, lift) is the
//              single authority for gun + both hands, layered on the crouch base:
//                - SMALL guns (pistol, mac10): one-handed at rest, off-hand at the
//                  side; on firing/aiming BOTH hands push the gun straight out in
//                  front of the chest (gun slides to center, arms forward).
//                - LARGE guns (everything else): two-handed ALWAYS — off-hand rests
//                  across on the weapon's foregrip even at idle (per-weapon grip Z
//                  via gunForegripZ); on firing the gun tucks into the right
//                  shoulder with the off-hand still across and a slight forward
//                  lean down the sights.
//              The over-cover lift (v1.77) folded into this as a `lift` param,
//              replacing the standalone setKidAdsTall.
//          (3) WALK ANIM. New setKidWalk(kid, phase, intensity) adds a SUBTLE
//              opposed leg swing + small off-arm counter-swing + faint torso bob
//              while a kid actually moves. The gun arm/hand stay planted on the
//              weapon so the hold never breaks. Intensity is eased from the kid's
//              real per-frame displacement; the gait phase only advances while
//              moving, so a stopped kid freezes in a clean stance.
//          (4) UNIFIED POSE PASS. updateEnemies now runs one self-contained pass
//              after the terrain plant: idempotent crouch re-assert (no drift) →
//              aim-ramp + over-cover lift → setKidGunHold → setKidWalk. An _aimHold
//              timer (armed on every shot) keeps the shouldered/forward hold across
//              a burst and eases back to the rest hold after the last round.
//
// VERSION: 1.77 — Car slope-tilt fix + enemy laser/cover-fire polish.
//          (1) CAR SLOPE TILT. addCar's world→local normal transform used a
//              FLIPPED inverse-yaw (both sign terms wrong), which cross-fed the
//              pitch component into roll and vice versa — parked cars on a grade
//              leaned sideways far too much. Corrected to the proper THREE
//              Y-rotation inverse: localX = nx·cosθ + nz·sinθ, localZ =
//              -nx·sinθ + nz·cosθ. Flat ground → 0 tilt; slope → the car now
//              pitches along its length and rolls across its width correctly.
//          (2) DOWNED-KID LASER. A tagged kid runs the "I'm hit" pose (gun ~90°
//              skyward) then `continue`s, skipping updateKidLaser — so its stale
//              laser unit rode the raised gun and fired a vertical red beam
//              straight up out of an out-of-play kid (the "lasers point way too
//              high" report; it self-corrected only because a live kid getting
//              close was a DIFFERENT, still-aimed kid). Now the beam+dot are
//              hidden while a kid is down, and re-shown on any live re-aim, so a
//              respawn/revive restores them automatically.
//          (3) FIRING OVER COVER. A kid tucked right behind a bin/wall/car shot
//              its BB straight into the back of that cover (spawn at ~1.05m
//              shoulder height, cover top taller → BB buried in the mesh). New
//              coverInFrontTop() probe (one cheap pass, AABB+cylinder, honors
//              slope baseY) finds cover just ahead along the firing bearing; if
//              its top is above the muzzle, spawnEnemyBB lifts the BB spawn to
//              just over the lip (capped +0.7m → believable lean, not levitation)
//              and flags _firingOverCover.
//          (4) ADS-TALL POSE. To sell the lifted spawn, setKidAdsTall raises the
//              gun toward an eye-line shouldered hold and tips the upper body
//              forward for ~0.45s around the shot (decaying timer driven each
//              frame), easing back to the normal hold. Skipped while crouched so
//              it never fights the crouch pose; self-restores head/gun rotation
//              on its final amount-0 frame.
//
// VERSION: 1.76 — Deterministic scenario layouts + map-prop polish pass.
//          (1) DETERMINISTIC LAYOUTS. The builders used unseeded Math.random for
//              all cover placement, so every load of a scenario rerolled the board
//              — frustrating on replay. enterScenario now builds under a seeded
//              mulberry32 RNG (seed = scenarioId + builderArg) via withSeededRandom,
//              which temporarily swaps Math.random for the builder call then
//              restores it (finally-guarded). Same scenario = same board every
//              load; different scenarios on a map still differ. Runtime randomness
//              (AI, BB curve) runs later, outside the wrapper, so it stays random.
//          (2) FORT CORNER BINS + TALLER WALLS. buildKidFort now drops a wheelie
//              bin at all 4 corners (taller than the wall → real vertical cover the
//              kids "dragged over") and raised walls 0.95 → 1.12m (still below the
//              1.35 standing eye, so peek-over-while-standing / duck-when-crouched
//              still hold). Both Winnmark forts + the Bunratty fort; the slope-seat
//              paths lift the bins (own mesh groups) alongside the shared wall group.
//              Addresses defenders getting picked apart after the v1.73/74 range work.
//          (3) MAILBOX FACING (Winnmark). addMailbox gained a `facing` param; the
//              Winnmark loop now yaws each box toward the road (atan2 of the road-
//              ward vector), fixing south-side boxes that faced the house. (Bunratty
//              brick boxes already faced the road.)
//          (4) WINNMARK DRIVEWAYS reach the street. The pad stopped at the straight
//              z=±3.5 while the road is a curved bezier, leaving a grass gap. Pads
//              now extend to the ACTUAL road edge sampled from the centerline at
//              each house's X (overshooting 0.5m for a clean join).
//          (5) PARKED CARS. (a) Winnmark driveway cars were centered 1m past the
//              house front but are 3.6m long, so the rear clipped ~0.8m INTO the
//              house — now placed front(3.5)+halfLen(1.8)+margin(0.3)=5.6m out so
//              the rear clears. (b) addCar gained an optional groundNormalFn; cars
//              now tilt onto the grade (pitch+roll via 'YXZ' euler so rotation.y
//              stays the pure yaw the obox collision reads) → all 4 tires touch on
//              slopes instead of floating/burying. Applied to all Winnmark + Bunratty
//              cars (driveway, bulb, road-cover).
//          (6) STREETLAMPS off the pavement. Poles were at a fixed z=±6; on the
//              curved roads that could drift onto asphalt. Now placed relative to
//              the actual road edge (centerline sample at the lamp's X) + a grass
//              margin, X's kept in the house-gaps so they miss driveway pads. Arm
//              still overhangs the street. Both maps.
// VERSION: 1.75 — ACTUAL whistle-persistence fix + AK closing un-root.
//          (1) WHISTLE PERSISTENCE (the real cause this time). BB physics runs in
//              a sub-step `while` loop in tick(); Game.mode is checked once at the
//              top, not per sub-step. When the player's final life is taken, the
//              hitting BB calls endScenario() mid-substep — which flips mode to
//              'result' and stops all whistles + resets the count. But the loop
//              kept sub-stepping, so updateBBs re-entered and RESTARTED the whistle
//              on a BB still buzzing past; with no further updateBBs next frame
//              (mode is 'result'), that loop droned forever — surviving the return
//              to the bedroom. v1.68/71/72 hardened bbWhistleStop but never stopped
//              the RESTART. Fix: (a) break the sub-step loop the instant mode !=
//              'scenario'; (b) guard bbWhistleStart behind `Game.mode==='scenario'`
//              so the in-progress updateBBs for-loop pass can't spin one up either.
//          (2) AK ROOTED AT 50m. v1.74 let the AK plant+burst from its NEAR band
//              and biased reposition DIRECTION toward the player, but the reposition
//              CHANCE (~0.55 for Sean) and small hop size left it lingering at the
//              back of its range. Now a ranged auto beyond its PUSH reposition-
//              chances to ≥0.8 and takes bigger forward hops (scaling with how far
//              out it still is, up to 22m) — so it bursts, moves up, bursts, closes
//              in ~3 cycles, then reverts to the normal brawl shuffle inside PUSH.
// VERSION: 1.74 — AK (auto-rifle) "pepper from range, then close" fix.
//          Player report: Sean (AK, Bunratty) only goes full-auto inside ~20m,
//          and throws lone pistol-like shots beyond that. Two root causes, both
//          fixed without raising the AK's deliberately-low PUSH (it should still
//          close and brawl):
//          (1) HOLD-AND-FIRE GATE keyed on insidePushDist, so beyond ~PUSH (20m)
//              the kid never entered the peek→shoot→BURST cycle — only single
//              suppressing rounds while marching. New `insideFireHold`: for ranged
//              autos (ak47/ar) the stop-and-fire band is NEAR (AK 50m), not PUSH,
//              so they plant and string full-auto from 40m+ while still advancing
//              when they lack a clean line. Other guns unchanged (still PUSH).
//          (2) ON-THE-MOVE SUPPRESSION was a single BB (the "pistol" look). New
//              queueSuppressionBurst(): auto guns fire a 3-4 round burst at the
//              last-known spot while marching/bounding (semis still single). BB
//              burst entries can now carry a fixed `aim` + loose `spread`.
//          (3) RANGED-AUTO CLOSING: between bursts, an AK/AR still beyond its PUSH
//              repositions toward the player (closest cover) regardless of its mid
//              aggression — the "get in the mix" half of the behavior. Inside PUSH
//              it reverts to its normal aggression-driven shuffle.
// VERSION: 1.73 — Fences see/shoot-through + route-around-ends pathing;
//          per-weapon engagement-range pass; AR ironsight ADS drop.
//          (1) FENCE LOS: hasLineOfSight now skips `bbPass` obstacles (the
//              wrought-iron picket fences). BBs already pass through the gaps,
//              but LOS treated the fence as a solid 1.4m wall — so a kid with a
//              clear target across a fence never fired even though the BB would
//              sail through. Now they see AND shoot through pickets; bodies still
//              blocked (collidesObstacles ignores the flag).
//          (2) FENCE PATHING: new fenceDetourWaypoint() — when a mover wedges on
//              a long thin fence, it steers to the NEARER END of that fence and
//              rounds it, instead of the blind alternating sidestep that just
//              jittered mid-span. Wired into the advancing direct-push, tagger,
//              and deploy movers (the bound mover falls through to direct-push).
//          (3) ENGAGEMENT RANGE PASS: NEAR/FAR/PUSH are now table-driven per
//              weapon (PUSH no longer derived from NEAR). New bands —
//              shotgun 6/8/25, pistol 8/12/30, mac10 7/14/24, ump 15/35/50,
//              mp5 12/35/50, ar 15/40/60, ak47 20/50/100, sniper 40/100/200
//              (PUSH/NEAR/FAR). AK is the aggressive ranged gun: fires from way
//              out (NEAR 50) but low PUSH (20) keeps it closing and brawling. A
//              future LMG is the high-PUSH hold-the-line gun.
//          (4) AR IRONSIGHT ADS: iron adsPos.y -0.075 → -0.087 so the front-post
//              tip lands on the centered reticle instead of riding above it.
//              Optic path (adsYCorr) overrides this when a red-dot/scope is up.
//          (5) AR IRON DECLUTTER: the tall front-sight post/tower now hides while
//              an optic is mounted (was crowding the red-dot lens), reappears when
//              the optic is removed.
// VERSION: 1.72 — Whistle tune + fix: stuck/looping whistle on final-life death.
//          (1) Whistle range 1m → 2m and peak volume 0.05 → 0.075 (1m/0.05 was
//          barely noticeable in playtest).
//          (2) STUCK-WHISTLE FIX. If the player's last life was taken while a BB
//          was buzzing past, that BB's whistle could lock on and loop forever
//          until the tab was closed/refreshed. Cause: bbWhistleStop ramped the
//          gain and stopped the oscillator/noise source in ONE try-block, gain
//          first — and at scenario-end the audio-param scheduling can throw, the
//          catch swallowed it, and src.stop()/tone.stop() never ran, so the
//          looping nodes droned on. FIX: stop the sound sources in their OWN
//          guarded calls BEFORE the gain fade (so a gain throw can't prevent the
//          stop), hard-silence the gain, and re-issue stop+disconnect in the
//          deferred cleanup. endScenario also resets the voice count. Verified by
//          executing bbWhistleStop with a gain mock that throws: both sources
//          still stop, count returns to 0.
// VERSION: 1.71 — Whistle retune + fix: tagged NPCs not returning to respawn.
//          (1) BB WHISTLE retuned per playtest: detection range 7m → 1m (only a
//          round passing within ~1m of the player whistles now), peak volume
//          0.09 → 0.05 (BB_WHISTLE_VOL), and higher pitch (tone 2400→3400 Hz,
//          bandpass 3200→4200 Hz). It's now a brief, quiet, high "tss" only when
//          a BB genuinely buzzes your head.
//          (2) RESPAWN-CANCEL FIX. In multi-life modes, a kid tagged WHILE moving
//          (repositioning/in the open) burned a life but kept fighting instead of
//          running back to respawn. Cause: eliminateEnemy correctly set the kid to
//          'retreating', but the v1.67 incoming-fire reaction ran before the state
//          switch and its interrupt guard didn't exclude 'retreating' — a retreat-
//          ing kid runs in the open right where the player is still shooting, so a
//          near-miss flipped it to repositioning/hiding and CANCELLED the respawn
//          run (life already spent). FIX: retreat and deploy are now uninterrupt-
//          ible — the reaction skips kids in those committed states. Verified the
//          guard truth-table: retreating/deploying = never interruptible (both
//          timid and brave); all other states unchanged.
// VERSION: 1.70 — Fix: NPCs phasing into cover / standing in car centers.
//          Two bugs behind the reported "kids take cover in the dead center of
//          cars, ignoring collision" + "phase through cover while moving to it":
//          (1) coverStandPos used only the loose axis-aligned envelope
//          (cover.minX..maxZ) for ALL shapes. Cars are ORIENTED boxes (obox); for
//          an angled car the envelope is a bigger non-aligned rectangle, so the
//          "outside the face" point landed INSIDE the real car body. Rewrote it
//          shape-aware: obox works in the box's local frame and pushes outside the
//          true face; cylinders (trees) place on the ring on the far side; AABBs
//          keep the old face logic. A final overlap nudge (findClearSpawn)
//          guarantees the spot is walkable. (2) The 'repositioning' mover did a
//          RAW straight-line step with NO collision check — so a kid relocating to
//          cover walked straight THROUGH any obstacle, including the cover itself.
//          Now it uses the same collision-slide (diagonal → X-only → Z-only) as
//          the deploying/advancing movers, plus a 0.6s anti-wedge bail.
//          NB: this is the AUTOMATIC, geometry-derived version of the anchored
//          "cover slot" idea — slots are computed from each mesh's collision shape
//          so they always match what's drawn, with no per-mesh hand placement.
//          Verified by EXECUTING coverStandPos against obox/cylinder/AABB mocks:
//          every stand point lands outside the cover with the cover between kid
//          and player.
// VERSION: 1.69 — ACTUAL FREEZE FIX: ReferenceError in pickBoundCover.
//          The real cause of the firing-triggered freeze (console caught it):
//          "Uncaught ReferenceError: ex is not defined" at pickBoundCover, thrown
//          from updateEnemies → tick. During the v1.67 edits that added the
//          teammateCrowding helper just above pickBoundCover, an earlier
//          str_replace dropped the function's `const ex = e.pos.x, ez = e.pos.z;`
//          line — but the four refs to ex/ez remained. That's a RUNTIME error, not
//          a syntax one, so every `node --check` parse pass stayed green and missed
//          it. It only throws when an NPC actually runs pickBoundCover (i.e. a
//          flanker bounding while fighting), which is why it presented as "freezes
//          when guns fire": the throw escaped tick() and killed the rAF loop.
//          FIX: restored the ex/ez declaration. Verified by EXECUTING the function
//          (not just parsing): pickBoundCover + the v1.67 reaction helpers now run
//          without error against mock data. (The v1.68 audio hardening — shared
//          noise buffer, 6-voice cap, try/catch — is kept: not the freeze cause,
//          but a real robustness win.)
// VERSION: 1.68 — FREEZE FIX attempt: BB whistle Web Audio hardening (kept, but
//          Symptom: game randomly froze when a gun fired (player or NPC). Cause:
//          the v1.67 BB whistle created a fresh ~22,000-sample noise buffer AND a
//          new looping bufferSource + oscillator for EVERY BB that came within 7m
//          of the player. Every player shot spawns its BB at the muzzle (well
//          inside 7m), so each shot ran the 22k-iteration fill and spun up looping
//          nodes; auto guns, NPC bursts, and v1.67's new suppressing fire piled
//          voices up fast. Web Audio under that churn could stall or throw on node
//          creation mid-frame — and because updateBBs runs inside the tick's
//          sub-step while-loop, a throw there killed the requestAnimationFrame
//          loop = hard freeze. FIX: (1) ONE shared noise buffer reused by all
//          whistles (no per-shot fill); (2) hard cap of 6 concurrent whistle
//          voices (_bbWhistleCount); (3) try/catch around every node operation so
//          audio can never crash the game loop; (4) authoritative voice-count
//          reset on scenario start. Verified the cap + counter hold at 0 leak
//          under a 20k-frame chaotic-firefight simulation.
// VERSION: 1.67 — Combat-feel wrinkles: 4 features.
//          (1) SUPPRESSING FIRE ON THE MOVE. Marching kids (direct-push) now
//          throw sporadic rounds toward the target's last-known spot even while
//          out of effective range and walking — cooldown-gated, looser spread,
//          aggression scales the rate. Mirrors the bounding kids' suppression so
//          a push reads as "laying down fire," not a silent sprint. Works vs the
//          player OR an NPC target.
//          (2) DEFEND ANTI-CROWDING. In defend scenarios, cover selection (both
//          bound-pick scoring and the reposition candidate pool) now avoids cover
//          already occupied by a living teammate, via teammateCrowding(), so the
//          attacking squad fans across different cover instead of stacking. Only
//          narrows to the un-crowded subset when one exists (won't freeze on a
//          tight map).
//          (3) REACT TO INCOMING FIRE. updateBBs stamps a kid with the incoming
//          bearing when a live BB whizzes within 2.5m (near-miss). The AI reacts,
//          scaled by aggression as "bravery": shielded by current cover → crouch
//          & hold (brave kids favor this, snap back fast); in cover but exposed
//          to that bearing → relocate to cover that blocks it; fully in the open
//          → fire a suppressing round back down the bearing WHILE breaking for
//          the nearest shielding cover. Timid kids let it interrupt an active
//          advance ("running scared"); brave kids only react from holding states.
//          All gun NPCs, every scenario. (~2.5m ≈ 1.5 car-widths.)
//          (4) BB WHISTLE. A faint air-rush hiss + high whistle tone for any BB
//          passing within 7m of the player, panned + attenuated by distance,
//          pitch rising as it nears. Force-stopped the instant the BB makes first
//          impact (object bounce/stick, ground, body) or leaves earshot/despawns.
//          Cleaned up on scenario start AND end so no node is orphaned.
// VERSION: 1.66 — Fix: pistol flankers stall far from the fort after a respawn.
//          Follow-up to v1.65. With the spawn-wedge gone, Seth (a LEFT-flanker
//          pistol in Hold the Fort) redeployed to his anchor ~40m from the bulb
//          and then PARKED there — not advancing, not shooting — while Trey (AR)
//          kept pushing. Root cause: bounding-overwatch (v1.25) ran for any
//          flanker at rawD > 10 regardless of weapon range. A pistol's
//          ENGAGE_FAR is 30m, so at 40m the kid could neither SUPPRESS (needs
//          <ENGAGE_FAR+8 = 38m) nor COMMIT to a static engage (bound-commit needs
//          <ENGAGE_NEAR = 14m) — a silent dead zone — and the bound re-pick could
//          drift laterally (flank-side score) instead of closing. Trey's AR
//          (FAR 48) covers the whole approach, so he suppressed + bounded the
//          whole way and looked fine — which is why ONLY the pistol kid looked
//          dead. FIX: bounding now only runs inside the kid's suppressing band
//          (rawD < ENGAGE_FAR); beyond it the kid falls to DIRECT PUSH to close
//          the gap first, then bounds for the final stretch where it's meaningful.
//          No change to AR/sniper behavior. (Not a cover-density problem — the
//          road has staggered cover the whole way; the issue was the range gate.)
// VERSION: 1.65 — Fix: Seth wedged in a phantom fort + defend objective text.
//          (1) SETH NEVER PUSHED (Hold the Fort & other cul-de-sac defends). The
//          east "treehouse" kid-fort (x≈33, built v1.56) was created
//          UNCONDITIONALLY in buildWinnmarkCourtScene, but it sits right on the
//          `cluster_road_east` (x=31) attacker spawn that every cul-de-sac defend
//          uses. The huddle-ring angle for the FIRST kid in the setup (Seth) lands
//          at +x/+z = (32.3, 0.55) — inside that U-shaped fort. He spawned boxed
//          by the back wall + wings and couldn't path out west, so he jittered in
//          place ("sits in the enemy fort"). Trey/Devon got ring angles that put
//          them west of the wall, in the open, so they pushed fine — which is why
//          only Seth looked broken despite Trey's longer gun. findClearSpawn
//          didn't save him: from inside the U it pushes along the smallest axis,
//          deeper in, not out the west mouth. FIX: gate the east fort to a new
//          'treehouse' variant (the ONLY scenario that uses it — player spawns
//          behind it via playerSpawn 'east_fort', attackers come from the far west
//          cluster_treehouse). All other Winnmark scenarios no longer build it, so
//          the road-east spawn is clear. Root-cause fix, no AI tuning touched.
//          (2) DEFEND OBJECTIVE TEXT. survive_timer read "Survive 90s (or tag
//          everyone)" — but defend attackers respawn forever (unlimited lives), so
//          you can't tag them all out. Now reads "Hold out for 90s — they respawn,
//          so just survive" to match the actual outlast win condition.
// VERSION: 1.64 — Swim goggles: opaque surround + no bridge (playtest tweak).
//          The swim frame was still see-through (raw periphery bled around the
//          lenses) and had a dark nose bridge. Now: (1) new opaqueSurround flag —
//          swim fills everything OUTSIDE the two lens holes solid (like a mask),
//          so all peripheral vision is cut; (2) the two lenses now OVERLAP across
//          center (cx 38/62, rx 34) so the opening is continuous with no dark
//          column; (3) removed the bridge + side-strap rects. Canvas-filter
//          decision still keys off the (unchanged) mask-only path, so swim's look
//          continues to come from its in-lens blue tint, not a full-screen filter.
// VERSION: 1.63 — Eyewear rebalance + player footsteps.
//          (1) EYEWEAR: Clear Safety Glasses are now a premium pick — $28, +1
//          defense (real protection, near-zero view cost). Renamed "Amber
//          Lo-Light Goggles" → "Ski Goggles", now +2 defense at $50. NEW
//          Swimming Goggles ($14, +1): heavy dark-blue tint + a new 'swim' frame
//          style with smaller, more separated lenses so the band crowds the
//          periphery (deliberately rough side vision). New goggles_swim key added
//          to the owned-equipment defaults (old saves deep-merge it as unowned).
//          (2) FOOTSTEPS: new playPlayerFootstep() Web Audio synth (low-passed noise
//          scuff + a low tonal thump, per-step pitch/level jitter). Triggered from
//          updatePlayer on a movement-only step accumulator that fires once per
//          stride half-cycle, synced to the visual bob; sprint steps are faster +
//          heavier. Routed direct to destination so the music mute (M) leaves
//          footsteps audible.
// VERSION: 1.62 — Bedroom wayfinding labels. Playtesters got "stuck" in the
//          bedroom because nothing told them where to go. Added a billboarded
//          floating-label layer (#bedroomLabels): each interactable now shows a
//          chip with a glyph + short name (COMPUTER / MAP / LOADOUT / WORKBENCH /
//          BATHROOM / SAVE), projected to screen space every frame, distance-faded,
//          hidden when off-screen or behind the camera, and accent-highlighted when
//          it's the one currently in E-range. Built in buildBedroomScene(), updated
//          in updateBedroomLabels(), shown/hidden alongside #bedroomHud.
// VERSION: 1.61g — TTS voice fix (macOS "droideka/whisper" bug). macOS ships
//          novelty voices tagged en-US (Zarvox=robot, Whisper=unintelligible,
//          Bells, Bad News, Trinoids, Albert, Fred, ...) that passed the en-US
//          filter and got hashed onto NPCs, so half of them sounded insane.
//          Added (a) a novelty-voice blacklist applied at every selection tier,
//          (b) a preference for known natural US voices (Samantha/Alex/Tom/...),
//          and (c) a cache fix so the SHORT partial voice list Safari returns on
//          first call gets replaced by the fuller async list (voiceschanged).
// VERSION: 1.61f — Sean now carries his AK-47 in ALL Bunratty (Sentinel) gunner
//          scenarios, matching the lore note ("he carries his AK-47 everywhere on
//          this street"). Four Bunratty entries that had him on a pistol
//          (bunratty_nick, _storm_the_court, _ffa, _night_lane) → ak47. His
//          infection-mode TAGGER entry stays gun-less (taggers carry no weapon by
//          design). Non-Bunratty Sean spawns (the Hollow, etc.) left as-is.
// VERSION: 1.61e — Per-gun SIDE-RAIL placement pass. The rails (laser/flashlight
//          mounts) hung in empty space or sat on moving parts. Retuned sideX
//          (pull inward to touch the handguard/barrel), railZ (slide back onto a
//          fixed surface), and railLen (trim front overhang) per gun: sniper +
//          MP5 pulled in to the barrel/handguard; shotgun moved OFF the pump onto
//          the receiver/barrel junction; AR/AK/UMP/MAC-10 slid back + shortened
//          out of empty space; pistol slid back. All in FP_GUN_MOUNT.
// VERSION: 1.61d — Optic ADS alignment. The centered HUD red dot was correct,
//          but the gun mesh (and the lens around it) rode HIGH — the per-gun
//          adsPos.y had been tuned for IRON sights, which sit lower than an
//          optic's dot. Added a sight-line correction that drops the ADS gun
//          position so the optic's dot lands at camera-center (0): baseY at full
//          ADS = -(anchor.y + sightLineY*scale). Now the lens sits AROUND the
//          centered dot on every gun, for both red-dot and scope (scope only
//          during the blend, since it hides at full aim).
// VERSION: 1.61c — Red-dot fixes from playtest. (1) Killed the black column
//          through the lens: the front upright ARM (which rose behind the glass,
//          bisecting the sight line) is replaced by a HOOD support that sits BELOW
//          the lens, connecting the bezel bottom to the baseplate — nothing
//          crosses the glass now. (2) The rim no longer vanishes when looking
//          straight through: the lens ring was an open-ended cylinder (a thin
//          wall, invisible edge-on); now it's a TORUS bezel with a visible ring
//          profile from any angle, including dead-behind during ADS.
// VERSION: 1.61b — Optic revision from playtest feedback. (1) Red-dot is now an
//          OPEN REFLEX sight (front lens on an L-arm, no rear tube — like a
//          C-More), not a mini-scope. (2) Both optics rebuilt with their FOOT at
//          the local origin so they PERCH on the rail instead of sinking into the
//          receiver; sightY retuned to each gun's receiver top + a visible top
//          rail drawn under the optic. (3) Red-dot ADS: the in-world lens dot
//          fades out as the screen-CENTERED HUD dot fades in, so the dot becomes
//          the reticle (dead center) when aimed. (4) Scope ADS: stronger zoom
//          (adsZoomBonus 0.5→0.8, FOV floor 28°→16°) and the gun model hides once
//          the scope picture is up so the lens is the whole view.
// VERSION: 1.61 — Top-rail OPTICS are now visible + scoped sight picture. The
//          red-dot and 4× scope finally have real meshes on the gun's top rail
//          (per-gun sightY/sightZ/sightScale in FP_GUN_MOUNT), built once in
//          ensureFPGunAccessory and toggled by the mounted sight. ADS look:
//          red-dot keeps the glowing center dot + light vignette; the scope gets
//          a dedicated #scopeOverlay (black mask, circular eyepiece cutout, fine
//          crosshair + center dot) that replaces the generic vignette as you aim.
// VERSION: 1.60 — Loadout screen rework + a loadout-weight → movement system.
//          (A) GUN SWAP fixed/clarified: the slot-0 picker now lists ALL owned
//              guns via getOwnedGunTypes() — the auto guns (ak47/mp5/ump/mac10)
//              were missing, so if you owned an MP5 you couldn't select it here.
//          (B) MAG POOL filtered to the EQUIPPED gun. Showing every mag you own
//              across all guns was messy and misleading (a mismatched mag just
//              dry-clicks in-match). The pool now tracks your equipped gun, and
//              swapping guns auto-drops any now-incompatible spare-mag slots.
//              MAG_GUN_FIT promoted to a shared top-level constant.
//          (C) NEW: LOADOUT WEIGHT. Every carried thing has a weight (flavor lb):
//              GUN_WEIGHT, MAG_WEIGHT, speed-loader (scales w/ capacity), and
//              ARMOR_WEIGHT. computeLoadoutWeight() sums it; the closet shows a
//              total + Light/Medium/Heavy tier + fill bar + the speed effect.
//              Carried GEAR (mags+loaders+armor, NOT the gun — it already scales
//              speed via playerSpeedMult) applies an extra move-speed penalty
//              (0.012/lb, capped 20%), snapshotted at scenario start as
//              Game.scenario.weightSpeedMult and multiplied into movement.
// VERSION: 1.59 — Field-map facing arrow (+ two backwards-spawn bugs it exposed).
//          (1) The intro field-map now draws a small arrow on the player dot
//              showing which way you'll spawn looking, so your orientation
//              relative to enemies/allies is clear. Direction uses the player's
//              forward (-sin(yaw), -cos(yaw)); canvas-x tracks world-x and
//              canvas-y tracks world-z, so the same components give the heading.
//          (2) Drawing the arrow revealed two spawns whose yaw faced AWAY from the
//              action: east_fort (Treehouse defender) faced east out the back of
//              the fort instead of west toward the attackers → now +PI/2; and
//              bulb_center faced west instead of east toward the attack lane →
//              now -PI/2. (road_east was already correct and is the reference.)
//              The Bunratty bulb_center is a different builder/layout and was left
//              alone pending its own check.
// VERSION: 1.58 — Tutorial polish from first playtest.
//          (1) DUMMIES NO LONGER SHOOT. fireRate:0.01 still let one early BB slip
//              out when the player first approached. Added a hard `noFire` flag,
//              checked at the TOP of spawnEnemyBB (the single enemy-shot
//              chokepoint) — a flagged enemy emits exactly zero BBs. Threaded
//              scenario→factory→enemy like statsOverride; set on the coach + all
//              3 targets.
//          (2) FIRE-BEAT INSTRUCTION FIXED. The gun starts cocked, so the first
//              shot is a single CLICK — the old "hold to cock, release to fire"
//              text was wrong for shot #1. Beat 3 now: "starts cocked — click to
//              fire your first shot." Beat 4 ("Re-cock & Tag") teaches the
//              hold-to-cock / release-at-top mechanic that applies AFTER a shot.
//          (3) Fixed the "&amp;" leaking into the step header — labels render via
//              textContent, so they use a literal "&".
// VERSION: 1.57 — FFA spawn spread + a guided TUTORIAL first level.
//          (A) WINNMARK FFA: the four kids spawned clustered in the middle of the
//              street with clear backyard sightlines and opened fire on each other
//              instantly. Spread them to the four corners (seth/trey/house4/house7
//              backyards) — each tucked behind its own house, no initial LOS.
//          (B) TUTORIAL ("Backyard Basics") is now the first Winnmark level. A
//              self-contained Tutorial module (armed by scenario `tutorial:true`,
//              a no-op otherwise) walks five beats via a top-center coaching
//              banner: MOVE to a glowing ground marker → AIM (hold RMB) → COCK &
//              FIRE → TAG all 3 practice targets → RELOAD. Beats 1/2/5 poll
//              player/gun state; FIRE is signalled by doFire(), TAG by
//              eliminateEnemy(); the kill_all win resolves once the 3 targets are
//              down. Seth is a friendly near-passive coach (ally); trey/brooke/
//              jamie are static targets via a new per-enemy `statsOverride`
//              (aggression/fireRate/accuracy/moveSpeed → ~0), role 'defender' so
//              they spawn at their anchors and never huddle.
//          (C) Supporting fixes: kill_all now excludes allies (a coach/teammate
//              no longer has to be shot to win — latent bug); statsOverride clones
//              the CHARACTERS profile so the shared entry is never mutated; row +
//              objective labels show "TUTORIAL" / "Learn the ropes" for it.
// VERSION: 1.56 — Treehouse defend, take two: SWAP the fort and the enemies.
//          v1.55 moved the attacker staging but they still jammed on Seth's house
//          + the random driveway car parked in the only push lane. Per the player's
//          call, the level is now reversed: two forts' worth of street instead of a
//          backyard hold.
//          (1) Fort MOVED from Seth's backyard (21,-25, faces E) to the east road
//              mouth (33,0, faces W), just inside the tree-gap entry. New player
//              spawn `east_fort` (35.5,0, facing W) sits behind its back wall,
//              mirroring bulb_center.
//          (2) Attackers now stage deep in Seth's empty backyard (cluster_treehouse
//              → (20,-23)) and push OUT toward the road. Deploy anchors moved to
//              the open WEST side of the house (18,-4)/(16,-8) so they round the
//              house on its clear side and flow onto the road spine heading east.
//          (3) Random driveway car at Seth's house (index 0) is now SUPPRESSED —
//              it sat at the throat of the push lane and was half the jam. No other
//              house's driveway is on an active lane, so this is free elsewhere.
//          (4) Description rewritten: you hold the plank fort at the mouth of the
//              street; they cut through Seth's backyard to flush you out.
// VERSION: 1.55 — Treehouse-defend spawn fix. The two attackers (Marcus + Jamie)
//          in "Defend the Treehouse" kept snagging behind Seth's house. Root
//          cause: with 2 enemies, the scenario huddles them at enemySpawnCluster
//          before deploying, and that cluster (cluster_road_east, x=31) sat EAST
//          of Seth's house (center 24,-15, footprint x∈[19.5,28.5]). Any path to
//          the fort at (21,-25) had to wrap the house's SW corner — where they
//          got stuck. Fix is purely spawn geometry, no AI changes:
//          (1) New cluster_treehouse (17,0,-6): staging just WEST of the house's
//              east face, up the driveway, with a clear straight lane north into
//              the backyard. Huddle ring (r=1.4) stays clear of the footprint.
//          (2) New deploy anchors treehouse_push_e (18,-8) + treehouse_push_w
//              (15,-4), replacing road_east_north/south. Both west of the house,
//              south of the x=16 backyard fence (z∈[-19,-31]), so the lane up to
//              the fort never crosses it.
//          (3) winnmark_defend_treehouse repointed to the new cluster + anchors.
// VERSION: 1.28 — Accessory slot system + The Workbench + framed eyewear.
//          (1) ACCESSORIES ARE NOW INSTANCES. persist.accessories holds physical
//          copies {id,type,placement}; a copy mounts on ONE gun at a time (no
//          sharing) — buy multiples to run the same kind on two guns. Each gun
//          has 1 SIGHT slot + N RAILS by size (pistol/MAC-10 = 1 rail, everything
//          larger = 2). Sights (red-dot, new 4× scope) go top; laser/flashlight
//          go on a LEFT or RIGHT rail. Laser + flashlight can be on at once now,
//          each rendered at its assigned rail offset (FP_GUN_MOUNT.railX). Spread
//          mults from all mounted accessories stack; scope adds ADS zoom.
//          (2) THE WORKBENCH (hall closet) — a live mini Three.js turntable shows
//          the selected gun with its accessories mounted; a slot list + locker on
//          the right do the assigning (click slot → click compatible copy). The
//          shop now only SELLS; customization moved here. Floating Sight/Left/
//          Right labels project onto the model.
//          (3) EYEWEAR FRAMES — goggles/glasses/mask now render an SVG frame with
//          real lens APERTURES; the optical tint/vignette (and mesh) show only
//          INSIDE the lenses, frame body occludes the edges.
//          Verified: 94 logic tests (accessory instances/no-share/placement,
//          eyewear SVG, workbench slotting/locker compat) + parse clean.
// ---- prior ----
// VERSION: 1.27c — Gun convergence + laser surface clipping. (1) The held gun is
//          now angled slightly toward screen-center at hipfire (HIPFIRE BARREL
//          CONVERGENCE, factor 0.7) so the barrel, laser, and reticle agree —
//          fixes the laser looking like it splayed off at an odd angle from the
//          muzzle. Off-center barrel angle drops from ~7–9° to ~1.5°; blends out
//          as you ADS (which already centers). (2) The laser beam now CLIPS to
//          the first solid object it hits (raycastObstacles, AABB slab method)
//          instead of passing through cars/bins/fences/houses — beam length &
//          end-dot reposition to the hit distance each frame. Verified w/ real
//          three.js: barrel ~1.5° off-center, dot still projects to NDC ~(0,0),
//          head-on obstacle clips at exact distance.
// ---- prior ----
// VERSION: 1.27b — Laser zeroing, properly. v1.27a fixed the vertical but the
//          beam still landed left of the reticle: the gun's pose is overridden
//          every frame by updateHeldMesh (hip/ADS blend, sway, cocking dip), so
//          a zero baked from the static build-time pose was wrong. Now the laser
//          unit is re-aimed EVERY FRAME via Object3D.lookAt() at a target pinned
//          to the camera at screen-center — using three's own world matrices, so
//          it's correct under any live pose and tracks the reticle through sway/
//          ADS/cocking. Verified with real three.js: dot projects to NDC (0,0)
//          (dead-center) for every gun, horizontally and vertically.
// ---- prior ----
// VERSION: 1.27a — Laser zeroing fix. The hipfire laser fired straight down the
//          gun's local axis, so its beam ran parallel to (not through) the
//          screen-center reticle the BBs converge on — the dot drifted off-aim
//          with distance. Now the laser is ZEROED like a real one: the whole
//          emitter unit is angled inward to cross the point of aim, computed by
//          transforming the camera-forward convergence point into the gun
//          group's local frame and aiming the unit at it. Beam lengthened to the
//          zero distance so the dot sits on the reticle. Verified per-gun: dot
//          lands within ~0.006 of screen center for all 8 guns.
// ---- prior ----
// VERSION: 1.27 — Accessories & eyewear are now VISIBLE. (1) Laser sight: a real
//          red emitter + a long semi-transparent red beam projecting from under
//          the barrel along the aim line. (2) Flashlight: an under-barrel light
//          body + bright lens + a soft additive beam cone + an actual SpotLight
//          that casts a subtle pool. (3) Red-dot sight: a glowing red reticle
//          that appears centered as you aim (ADS). All mount per-gun via a
//          FP_GUN_MOUNT table and toggle with the gun's equipped attachment.
//          (4) EYEWEAR now genuinely changes your view: each lens applies a CSS
//          filter to the rendered 3D scene (smoke = darker/desaturated, amber =
//          brighter warm low-light cast, mesh/clear = subtle) plus a framed
//          aperture (goggle = oval twin-lens letterbox, mask = heavier border +
//          mesh grid). Updated shop copy to match (no more "cosmetic/for show").
// ---- prior ----
// VERSION: 1.26 — Shop overhaul + stamina + fixes. (1) STAMINA: sprint drains a
//          bar that recharges after a short delay; emptying it triggers a brief
//          "exhausted" lockout (forced jog until ~40% recovered). New stamina
//          HUD bar. (2) SPRINT-JUMP FIX: jumping mid-sprint kept jog speed —
//          now an airSprint flag preserves sprint speed through the leap. (3)
//          EQUIPMENT: Eyewear (changes in-match view tint/vignette/mesh + head
//          armor), Body Armor (adds hit-points to your pool, zone-based), Shoes
//          (scale stamina pool/drain/recovery/sprint speed), universal Gun
//          Attachments (red-dot/laser tighten hipfire spread, flashlight
//          cosmetic). (4) SHOP REWORK: killed the Magazines tab — mags now live
//          on each gun's drill-in detail page (capacity mags + spare mags +
//          per-gun attachment slot); new Accessories tab for universal
//          attachments; Eye Pro → Equipment (eyewear/armor/shoes with buy+equip);
//          BBs tab gained more quantities + a BB color picker; Loadout tab got
//          section headers. (5) PRIYA SPAWN FIX: moved the west staging cluster
//          off the curb props and gave findClearSpawn a roomier clear margin.
// ---- prior ----
// VERSION: 1.25 — Tactics + content: (1) COVER-AWARE BOUNDING FLANK — flanking
//          attackers bound cover-to-cover with suppressing fire before each
//          bound instead of running the flank in the open (pickBoundCover picks
//          the next forward cover on their flank side; they fire a burst at the
//          player's last-known spot, then sprint to it; inside ~10m they revert
//          to the direct push). (2) Two new Bunratty regulars: Priya (fast,
//          clever flanker) + Owen (slow, deadly anchor). (3) ZOMBIE / INFECTION-
//          TAG mode: 6 gun-less "taggers" chase the player; one touch infects →
//          loss. You can still shoot — a hit downs a tagger for 10s then it
//          revives in place. Most jog (~player speed), two sprint (faster than
//          your sprint). Survive 90s untagged ('survive_untagged'). New
//          scenarios: "Priya's Pincer" + "Infection at the Cul-de-Sac".
// ---- prior ----
// VERSION: 1.24a — Terrain polish + flanking v1. Roads/driveways tilt onto the
//          slope normal (layOnSlope) instead of staying horizontal; houses get
//          foundation skirts so they don't float; sinkObs buries props to the
//          lowest footprint corner; enemies get L/C/R flank lanes (geometric
//          perpendicular waypoint that decays to 0 by ~9m).
// ---- prior ----
// VERSION: 1.24 — TERRAIN. The deferred v1.7 feature, done properly: a real
//          z-varying ground via a single reusable groundY(x,z) system. Bunratty
//          Court now has a dramatic lore-matched grade — high north bluff
//          falling ~7m toward the Chattahoochee on the south, plus a west→east
//          drop so the cul-de-sac bulb sits in a basin (attackers on the lane
//          look DOWN into it). groundY is the one source of truth: the displaced
//          ground mesh, player physics (walks/lands on the slope), BB ground
//          bounce, enemy feet/muzzle/hitboxes, and every placed object all read
//          from it. Obstacles gained a baseY so the vertical-overlap test lets
//          you walk under high decks / over low cover on the slope. Flat maps
//          (Winnmark, Seth's yard, bedroom) return no groundY → behave exactly
//          as before.
// ---- prior ----
// VERSION: 1.23 — Combat & polish pass: (1) AI engagement widened + spotted
//          memory (covering fire, faster reactions, mid-range commit, per-weapon
//          ranges out to whole-map for snipers); (2) DEFEND scenarios now respawn
//          shot attackers (run back to spawn → redeploy; kill-all defend converted
//          to a 90s timer); (3) real U-shaped plywood forts that face the attack
//          direction (replaced the single thin plank on both maps); (4) spawn
//          pushout so kids never start stuck inside cover; (5) American (en-US)
//          TTS voices + pitch scaled by NPC height (tall=deeper, short=higher).
// ---- prior ----
// VERSION: 1.22 — TTS spatial treatment (A+B+3). speechSynthesis has no pan
//          API, so true positional TTS isn't possible in-browser. Best honest
//          fix: (A) volume attenuated by distance via positionalAudio(), capped
//          at 0.5 * posVol so TTS no longer dominates shots/footsteps; (B) skip
//          entirely past ~25m so distant kids stay silent; (3) NEW positional
//          "voice marker" chirp plays through the Web Audio panner pipeline
//          right before each TTS line, giving a spatial cue for direction. The
//          brain merges the marker's pan with the (centered) words. Not true
//          stereo TTS, but the closest approximation the platform allows.
// =====================================================================
const VERSION = '1.72';

// ---------------------------------------------------------------------
// GLOBAL GAME STATE
// ---------------------------------------------------------------------
const Game = {
  mode: 'title',          // 'title' | 'bedroom' | 'map' | 'scenario_intro' | 'scenario' | 'result' | 'modal'
  prevMode: null,
  scene: null,            // active Three.js scene
  camera: null,
  renderer: null,
  clock: null,

  // Player
  player: {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),     // .y used for jump physics; .xz unused (we move via keys)
    yaw: 0,
    pitch: 0,
    height: 1.5,            // kid standing height (hitbox top)
    eyeOffset: 1.35,        // current eye height (animated for crouch)
    eyeOffsetStand: 1.35,
    eyeOffsetCrouch: 0.8,
    eyeOffsetSlide: 0.7,    // slightly lower than crouch
    radius: 0.3,
    onGround: true,
    velY: 0,                // jump velocity
    hitsTaken: 0,
    maxHits: 3,
    // Stance
    crouching: false,
    sprinting: false,
    ads: 0,                 // 0..1 ADS blend
    adsTarget: 0,
    bobPhase: 0,            // for sprint head bob
    // Slide
    sliding: false,
    slideTime: 0,
    slideDuration: 0.65,
    slideDir: new THREE.Vector3(),
    slideSpeed: 0,
    canSlide: false,        // set true when sprinting; consumed by slide
    // v1.26: STAMINA. Sprinting drains it; empty → brief exhausted lockout +
    // forced jog until it recharges past a threshold. Shoes (equipment) modify
    // max/drain/recharge. stamina is 0..staminaMax (seconds of sprint).
    stamina: 6.0,
    staminaMax: 6.0,
    exhausted: false,       // true while locked out after fully draining
    airSprint: false,       // launched a jump while sprinting → keep sprint speed mid-air
    // v1.40: AIM SWAY + VIEWMODEL BOB. `sway` (0..~1.35) is the smoothed
    // instability driving reticle bloom + fire spread. The bob* fields are the
    // per-frame gun-mesh offset (camera-space metres / radians) applied to the
    // FP gun so the weapon and everything bolted to it (laser, flashlight) move
    // together with player movement.
    sway: 0,
    swayPhase: 0,
    _stepPhase: 0,          // v1.63: accumulator for footstep cadence (decoupled from swayPhase)
    bobPosX: 0, bobPosY: 0, bobPosZ: 0,
    bobRotX: 0, bobRotY: 0, bobRotZ: 0,
  },

  // Scenario state
  scenario: {
    active: null,           // current scenario id
    enemies: [],
    bbs: [],                // active projectiles
    cover: [],              // cover bounding boxes
    bounds: null,           // play area bounds
    groundY: null,          // v1.8: terrain height fn (x,z)=>y; null = flat ground
  },

  // Gun — runtime state for the equipped gun. Stat fields (muzzleVelocity, baseSpread, etc.)
  // are loaded from GUN_SPECS at scenario start and during loadout changes.
  gun: {
    type: 'pistol',
    ammo: 1,
    maxAmmo: 1,
    cocked: true,              // slide is forward, ready to fire
    cockProgress: 0,           // 0..1 while pulling back the cocking part (slide/pump/handle/bolt)
    cockReleasing: false,      // cocking part snapping forward
    cockReleaseProgress: 0,    // 0..1 during release
    jammed: false,
    jamProgress: 0,            // 0..1 unjam progress (hold R)
    fireCooldown: 0,           // brief lockout after firing
    // Spec fields — populated from GUN_SPECS at scenario start
    fireMode: 'semi',          // 'semi' | 'auto' (v1.20)
    cyclicRPM: 0,              // rounds-per-minute for auto guns (v1.20; 0 = N/A)
    autoFireTimer: 0,          // accumulator for cyclic auto fire (v1.20)
    muzzleVelocity: 30,
    baseSpread: 0.4,
    adsSpreadMult: 0.4,
    curveOnsetDistance: 4,
    curveStrengthMax: 18,
    pelletsPerShot: () => 1,
    cockType: 'slide',
    cockTime: 0.7,
  },

  // Held-equipment state (which loadout slot is currently in hand, and item-specific use state)
  held: {
    slotIdx: 0,                 // 0 = gun by default
    swapBlock: 0,               // brief lockout after swapping
    // While using a speed loader or spare mag:
    using: false,               // LMB held while wielding equipment
    useProgress: 0,             // 0..1
    useDuration: 1,             // computed per-use
    useKind: null,              // 'speed_loader' | 'spare_mag'
  },

  mouseLMB: false,              // physical LMB state (for hold-mechanics)
  lmbConsumed: false,           // true if current LMB-hold was used to fire — blocks cocking until LMB is released and re-pressed

  // Input
  keys: {},
  mouse: { dx: 0, dy: 0, locked: false },

  // Bedroom interactables
  interactables: [],
  focusedInteractable: null,

  // Audio (lazy init on first user gesture)
  audio: null,

  // Persistent state — survives across scenarios (resets on page refresh)
  persist: {
    // v1.107 (backlog D.6, Michael: C): how Mike looks, set at the bathroom mirror. createKid's profile fields;
    // old saves get these defaults through loadGame's merge.
    look: { height: 'average', build: 'average', hairStyle: 'short', hairColor: 0x3a2818, skinColor: 0xe0b090,
            shirtColor: 0x3a5a8a, pantsColor: 0x2a2a2a, glasses: false,
            eyeColor: 'brown', shirtFront: 'plain',   // v1.123: eye colour and shirt front (mirror rows)
            hat: 'none',                              // v1.197 (D.21 step 1): a KID_HATS id, or none
            top: 'none',                              // v1.198 (D.21 step 2): a KID_TOPS id, or none (the shirt shows)
            shorts: 'none',                           // v1.199 (D.21 step 3): a KID_SHORTS id, or none (the jeans)
            crewName: '', crewColor: null },          // v1.200 (D.21, your crew): its name and bandana colour, or none
    ownedHats: {},              // v1.197: the hats you have bought (won ones are owned by their win)
    ownedTops: {},              // v1.198: the tops you have bought
    ownedShorts: {},            // v1.199: the shorts you have bought
    cash: 35,
    bag: 25,                    // BBs at home; only accessible from bedroom
    owned: {
      pistol: true,             // always
      pistol_mag_10: true,      // v1.28i: start with the default 10-rd mag (a 1-shot pistol was rough for new players)
      pistol_mag_12: false,
      shotgun: false,
      shotgun_mag_60: false,
      ar: false,
      ar_mag_40: false,
      sniper: false,
      sniper_mag_25: false,
      glasses_clear: false,
      slot_3: false,            // 1=gun and 2=equipment are unlocked by default
      slot_4: false,
      pool_noodle: false,       // v1.249 (D.36)
    },
    // Speed loader instances player owns. Each has a tier and current ammo.
    // List of objects: { id, tier, currentBBs }
    speedLoaders: [],
    // Consumable inventory — counts of each consumable item (spare mags)
    consumables: {
      spare_mag_10: 0,
      spare_mag_12: 0,
      spare_mag_shotgun: 0,
      spare_mag_ar: 0,
      spare_mag_sniper: 0,
      // v1.20: auto-gun spare mags (8 entries, 2 tiers per gun)
      spare_mag_ak47: 0,
      spare_mag_ak47_500: 0,
      spare_mag_mp5: 0,
      spare_mag_mp5_200: 0,
      spare_mag_ump: 0,
      spare_mag_ump_200: 0,
      spare_mag_mac10: 0,
      spare_mag_mac10_100: 0,
      // v1.168: the backyard guns' spares
      spare_mag_thunder: 0,
      spare_mag_sixshooter: 0,
      spare_mag_bucket: 0,
      spare_mag_boltpistol: 0,
      spare_mag_famas: 0,         // v1.325 (D.63)
      spare_mag_epistol: 0, spare_mag_erifle: 0,   // v1.326
      spare_mag_burst: 0,         // v1.327
      spare_mag_semishotgun: 0,   // v1.328
      spare_mag_m249: 0,          // v1.335 (D.63 batch 2)
      spare_mag_l96: 0,           // v1.336
      spare_mag_p90: 0,           // v1.346 (D.63 batch 2)
      spare_mag_vector: 0,        // v1.348 (D.63 batch 2)
      spare_mag_g36: 0,           // v1.371 (D.63 batch 3)
      spare_mag_aug: 0,           // v1.372 (D.63 batch 3)
      spare_mag_m4: 0,            // v1.373 (D.63 batch 3)
      spare_mag_svd: 0,           // v1.395 (D.63 batch 4)
      spare_mag_rpk: 0,           // v1.396 (D.63 batch 4)
      spare_mag_spas: 0,          // v1.398 (D.63 batch 5)
      spare_mag_gas: 0,           // v1.399 (D.63 batch 5)
      spare_mag_thompson: 0,      // v1.403 (D.63 batch 5)
      spare_mag_m14: 0,           // v1.404 (D.63 batch 5)
    },
    equipped: {
      gun: 'pistol',
      eyeProtection: null,
      // v1.26 equipment
      eyewear: 'none',          // EYEWEAR id — changes view + head armor
      shoes: 'none',            // SHOES id — stamina/sprint mods
      armor: {},                // { zone: ARMOR_id } — adds hit-points
      // v1.28: per-gun accessory slots referencing accessory INSTANCE ids.
      //   { gunType: { sight: instId|null, rails: [instId|null, ...] } }
      // rails array length matches the gun's GUN_ACCESSORY_CAP.rails.
      attachments: {},
    },
    // v1.26: owned equipment sets (separate from `owned` gun/mag flags)
    ownedEquipment: {
      eyewear: { glasses_clear: false, goggles_smoke: false, goggles_swim: false, goggles_amber: false, mesh_mask: false },
      shoes: { trail_shoes: false, track_spikes: false, cushioned: false },
      armor: { chest_light: false, chest_heavy: false, knee_pads: false, elbow_pads: false },
      // v1.28: attachments are now COUNTS of how many copies you own (you can
      // buy multiples so the same kind mounts on more than one gun at once).
      attachments: { red_dot: 0, scope: 0, laser: 0, laser_green: 0, flashlight: 0 },
    },
    // v1.28: accessory INSTANCES the player owns. Each physical copy is one
    // entry: { id (unique), type (ATTACHMENTS key), placement }. placement is
    // 'sight' for sights, or 'left'/'right' for rail items (set when mounted,
    // null when unmounted). An instance is mounted on at most one gun (tracked
    // by reference from equipped.attachments), enforcing the no-sharing rule.
    accessories: [],
    bbColor: 'white',           // v1.26: cosmetic BB color
    ownedBBColors: { white: true },
    // Loadout slots — Number-key indexed (0-based: slot 0 → key "1", slot 1 → key "2", etc.)
    // Slot 0 is always the primary gun. Slots 1-3 are equipment.
    // Each: null OR { kind: 'gun'|'speed_loader'|'spare_mag', refId? }
    loadoutSlots: [
      { kind: 'gun' },          // slot 0 → primary gun (always)
      null,                     // slot 1 → equipment
      null,                     // slot 2 → equipment (locked by default)
      null,                     // slot 3 → equipment (locked by default)
    ],
    completed: {},
    ladderV: 1402,              // v1.402 (D.57 step 4): a new save is on the new ladder order (12-saves' ladderKeepOpened)
    ladderKept: {},             // v1.402: matches a save from before the reorder had open, kept open
    textsRead: {},              // v1.195 (D.20 step 2): ids of the summer texts you have read
    crew: [],                   // v1.273 (D.28 step 1): the kids of CREW_ROSTER who have joined, in order
    crewGear: {},               // v1.337 (D.28 step 4): what you have lent each crew kid, { kid: { gun, eyewear, shoes } }
    gunMatches: {},             // v1.262 (D.44): per gun bought, how many matches it has been into (for selling it back)
  },
};
