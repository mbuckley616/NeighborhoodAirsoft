
function enterScenario(scenarioId) {
  // v1.48: hard progression guard — a locked scenario can never be entered,
  // regardless of which path tried to launch it. This is the last line of
  // defense behind the greyed rows / disabled nav buttons.
  if (!isScenarioUnlocked(scenarioId) && !(coopIsGuest() && Coop.match && Coop.match.id === scenarioId)) {   // v1.381 (D.73): a friend plays the host's match, open or not on his own save
    showModal('Locked', scenarioLockReason(scenarioId) || 'This scenario is locked.');
    return;
  }
  Game.mode = 'scenario_intro';
  const sc = (Net.active && Net.coop && coopScenario(scenarioId)) || crewScenario(scenarioId);   // v1.274 (D.28 step 2): the match with your crew in it (v1.381, D.73: and your friend)
  // v1.352 (D.70 step 3): a Pickup Game's Holiday row holds for its match (houses and kids); every other match goes by the date
  Holiday.match = (sc && sc.pickup && PICKUP_HOLIDAYS.includes(sc.pickup.holiday) && sc.pickup.holiday !== 'date') ? sc.pickup.holiday : null;
  let built;
  // v1.35: time-of-day for this scenario ('day' default | 'night'), hoisted to
  // function scope so the night-flashlight pass below can read it.
  const _tod = (sc && sc.timeOfDay === 'night') ? 'night' : 'day';
  if (sc) {
    const builder = typeof window[sc.builderFn] === 'function' ? window[sc.builderFn] : null;
    if (!builder) {
      showModal('Not Implemented', `The builder for "${scenarioId}" isn't wired up yet.`);
      return;
    }
    // Builder may accept a string variant arg (legacy) — pass scenario's builderArg if present.
    // A second arg carries time-of-day.
    // v1.76: build under a seed derived from the scenario id, so a given scenario's
    // cover layout is the SAME every load (learnable/replayable) while different
    // scenarios on the same map still differ. The seed also folds in builderArg so
    // two scenarios sharing a builder+variant but different ids still diverge.
    // v1.267: a Pickup Game free-for-all is laid out as its map's own free-for-all (seedFrom), so the starts hidden there stay hidden
    const _seedKey = (sc.seedFrom || scenarioId) + '|' + (sc.seedArg || sc.builderArg || 'default');   // v1.272: seedArg keeps a variant on its base layout
    built = withSeededRandom(_seedKey, () => builder(sc.builderArg || undefined, _tod));
    addEdgeBackdrop(built, sc.builderFn, _tod);   // v1.252 (D.24): scenery past the edge, never solid
    addHolidayDecor(built, _tod);   // v1.350 (D.70): Halloween on the houses round its date, never solid
    Game.camera.far = built.viewFar || 200; Game.camera.updateProjectionMatrix();   // v1.303 (D.51): a real-scale map sees further
  } else {
    showModal('Coming Soon', 'This scenario is locked in v1. More coming in future builds.');
    return;
  }

  // v1.8: publish the terrain fn early so findClearSpawn / enemy setup can use it.
  Game.scenario.groundY = built.groundY || null;

  // v1.33: resolve the player's spawn position UP FRONT (the authoritative
  // override below still runs after, unchanged) so the enemy/ally loop can place
  // team-'player' allies near the player instead of at their own far anchor —
  // allies should start beside you and move as a unit.
  let playerSpawnPos = null;
  if (sc.playerSpawn && built.playerSpawns && built.playerSpawns[sc.playerSpawn]) {
    playerSpawnPos = built.playerSpawns[sc.playerSpawn].pos.clone();
  } else if (built.spawn) {
    playerSpawnPos = built.spawn.clone();
  }

  // === v1.9: scenario-level enemy setup (when scenario declares enemySetup) ===
  // If the scenario has an `enemySetup` array, we ignore any pre-spawned enemies
  // the builder produced and place fresh ones using the scenario's loadouts +
  // anchor placements. This is the *new* path; legacy scenarios with inline
  // enemy spawning still work because they leave enemySetup undefined.
  if (sc.enemySetup && built.placements) {
    // Hide/remove any builder-spawned enemies so we don't double up
    for (const e of (built.enemies || [])) {
      if (e.mesh && e.mesh.group) built.scene.remove(e.mesh.group);
    }
    built.enemies = [];

    // v1.14: spawn cluster. Enemies spawn HUDDLED at one staging area and jog to
    // their per-enemy fighting `anchor` via the AI 'deploying' state, instead of
    // teleporting to scattered positions at t=0.
    //
    // v1.14a: clustering is now the DEFAULT for any 2+ enemy scenario. The cluster
    // center is resolved in priority order:
    //   1) explicit `enemySpawnCluster` anchor (hand-tuned, e.g. defends push from
    //      the road-east end), else
    //   2) auto: the CENTROID of this scenario's fighting anchors, nudged ~3m toward
    //      the nearest map end so the huddle sits just "behind" their positions and
    //      they advance forward into them. This keeps the huddle sensible even when
    //      anchors are spread across the map (no cross-map jogs from a fixed end).
    // Single-enemy scenarios never cluster (a huddle of one is pointless).
    let clusterCenter = null;
    // v1.25: zombie taggers never cluster — they spawn at their own anchors,
    // spread around the map, and chase independently.
    const isZombieMode = sc.winCondition === 'survive_untagged';
    // Ship C: only ENEMY-team kids huddle/cluster (allies & FFA kids spawn at
    // their own anchors). Compute the enemy-team setup subset up front so the
    // cluster decision + centroid both ignore allies/FFA.
    // v1.44: DEFENDERS never cluster either — the huddle models an attacking
    // squad pushing in together, which is exactly wrong for kids who are
    // supposed to start dug in at a fort. Defenders spawn directly at their
    // fort anchor (the plain `else` branch below) and hold from there. Without
    // this, an attack scenario's defenders staged on the mid-map road spine and
    // "deployed" outward — they read as spawning in the middle, not holding.
    const enemyTeamSetup = (sc.enemySetup || []).filter(es =>
      (es.team || (sc.ffa ? ('ffa_' + es.charId) : 'enemy')) === 'enemy' &&
      es.role !== 'defender'
    );
    const multiEnemy = enemyTeamSetup.length > 1 && !isZombieMode;
    if (multiEnemy) {
      if (sc.enemySpawnCluster && built.placements[sc.enemySpawnCluster]) {
        clusterCenter = built.placements[sc.enemySpawnCluster].pos.clone();
      } else {
        if (sc.enemySpawnCluster && !built.placements[sc.enemySpawnCluster]) {
          console.warn(`Scenario ${scenarioId}: unknown enemySpawnCluster "${sc.enemySpawnCluster}" — falling back to centroid`);
        }
        // Centroid of all valid anchors → pick a staging point near the map end
        // the kids are closest to. v1.15a: stage ON THE ROAD SPINE (z≈0), not at
        // the anchors' Z — the road is always open, whereas the anchor-centroid
        // can land inside a house row (e.g. overwatch: Seth east + Trey west →
        // centroid in the middle = inside a house). The kids deploy from the road
        // out to their yard anchors.
        let sx = 0, cnt = 0;
        for (const es of enemyTeamSetup) {
          const pl = built.placements[es.anchor];
          if (pl) { sx += pl.pos.x; cnt++; }
        }
        if (cnt > 0) {
          const cxAnchor = sx / cnt;
          const endX = (cxAnchor >= 4) ? 34 : -30;     // map ends: east entry / west bulb
          const towardEnd = Math.sign(endX - cxAnchor) || 1;
          clusterCenter = new THREE.Vector3(
            cxAnchor + towardEnd * 3,   // 3m toward the map end from the centroid X
            0,
            0,                          // on the road spine (always clear)
          );
        }
      }

      // v1.15a: SAFETY NET — never let the cluster (or the huddle ring around it)
      // sit inside a house. If the center lands in a house AABB, push it toward
      // the road centerline (z=0) until it clears, then a touch further. Houses
      // are the only large obstacles near potential staging spots.
      if (clusterCenter) {
        const inAnyHouse = (x, z) => built.obstacles?.some(o =>
          o.mesh && o.h >= 4 &&  // houses are the tall obstacles (wallH 5.5)
          x >= o.minX - 2 && x <= o.maxX + 2 && z >= o.minZ - 2 && z <= o.maxZ + 2
        );
        let guard = 0;
        while (inAnyHouse(clusterCenter.x, clusterCenter.z) && guard++ < 40) {
          // Step toward the road spine (z→0); if already near z=0, step along it.
          if (Math.abs(clusterCenter.z) > 0.5) {
            clusterCenter.z -= Math.sign(clusterCenter.z) * 1.5;
          } else {
            // On the spine but still in a house (house straddles the road? rare)
            clusterCenter.x += (clusterCenter.x >= 4 ? 1.5 : -1.5);
          }
        }
      }
    }
    let clusterIdx = 0;
    let setupIdx = 0;
    let allyIdxCounter = 0;   // v1.33: loop-local (don't mutate the shared sc object across replays)
    // v1.277: with the crew in it (the match's sides differ from the scenario's own), no two kids start on one spot
    // (CREW_START_GAP apart).
    // The v1.276 clamp put the second and fourth allies on the same point where you start by an edge (Sean and Alex at
    // the club's 3v3, 0.00 m apart, and one stood all match: CI red on PR #95, STUCK #101), and extra kids at one anchor
    // stacked there (the Last Saturday's Garrett, Colin, Brooke and Trey within 0.4 m). Huddle kids keep their ring.
    const crewSpread = sc.enemySetup !== sethSetup(scenarioId);   // v1.362: Seth's zone match is the match's own sides
    const takenStarts = playerSpawnPos ? [{ x: playerSpawnPos.x, z: playerSpawnPos.z }] : [];
    // v1.315 (critic, 22 Oct): the huddle keeps its ring, but the ring's kids that start in cover are pushed out of it to
    // one edge: the Last Saturday's Garrett, Colin, Brooke and Trey came out of the car within 0.42 m of each other
    // (Colin and Brooke 0.05 m), one body with four heads. Huddle starts keep CREW_HUDDLE_GAP from each other.
    const huddleStarts = [];
    // v1.369 (Found in play, v1.282): a kid the crew's numbers put on a teammate's anchor holds his post CREW_START_GAP
    // off the first kid's, not on it: the two walked to one point and stood in each other (Friday Night Lights' Nathan
    // and Malik 0.01 m apart for 6-8 s in 8 of 8 rounds, later Caleb and Brooke for up to 4.5 s).
    const takenPosts = {};

    for (const es of sc.enemySetup) {
      const placement = built.placements[es.anchor];
      if (!placement) {
        console.warn(`Scenario ${scenarioId}: unknown anchor "${es.anchor}"`);
        continue;
      }
      let post = placement.pos;   // v1.369
      if (crewSpread && !es.perch) {
        const team = es.team || (sc.ffa ? ('ffa_' + es.charId) : 'enemy');
        const mine = takenPosts[team] || (takenPosts[team] = []);
        const p = crewSpreadStart(post.x, post.z, mine, built.bounds, built.obstacles);
        if (p.x !== post.x || p.z !== post.z) post = new THREE.Vector3(p.x, post.y, p.z);
        mine.push({ x: post.x, z: post.z });
      }

      // Decide spawn position + whether this enemy deploys from a huddle.
      // Ship C: allies (team 'player') and FFA kids never join the ENEMY huddle —
      // clustering models one attacking squad pushing together, which doesn't fit
      // a teammate or a free-for-all combatant. They spawn at their own anchor.
      const esTeam = es.team || (sc.ffa ? ('ffa_' + es.charId) : 'enemy');
      const isAlly = esTeam === 'player';
      // v1.44: defenders hold their anchor — they never join the attack huddle.
      const joinsEnemyHuddle = clusterCenter && esTeam === 'enemy' && es.role !== 'defender';
      let spawnPos, deployTarget = null, startState = null;
      if (es.spawnAt) {
        // v1.178 (D.18, Michael: C): a kid with his own start spawns (and respawns) there and walks to his anchor
        spawnPos = new THREE.Vector3(es.spawnAt[0], 0, es.spawnAt[1]);
        deployTarget = post.clone();
        startState = 'deploying';
      } else if (joinsEnemyHuddle) {
        // Tight ring around the cluster center (~2.8m diameter).
        const n = sc.enemySetup.length;
        const ang = (clusterIdx / Math.max(1, n)) * Math.PI * 2 + 0.4;
        const rad = n > 1 ? 1.4 : 0;
        spawnPos = new THREE.Vector3(
          clusterCenter.x + Math.cos(ang) * rad,
          0,
          clusterCenter.z + Math.sin(ang) * rad
        );
        deployTarget = post.clone();
        startState = 'deploying';
        clusterIdx++;
      } else if (isAlly && playerSpawnPos && es.role !== 'defender') {   // v1.172: an ally defender (a VIP) starts on the anchor he holds
        // v1.33: allies start NEXT TO the player so the team begins as a unit and
        // pushes together (instead of jogging in from a far backyard anchor).
        // Fan them out in a small arc ~2–3.5m to the player's side, biased along
        // +X (the attack direction is generally down the street). allyIdx spaces
        // multiple allies so they don't stack.
        const allyIdx = allyIdxCounter++;
        const side = (allyIdx % 2 === 0) ? -1 : 1;           // alternate sides
        const ring = 2.0 + Math.floor(allyIdx / 2) * 1.4;    // step out for 3rd+ ally
        spawnPos = new THREE.Vector3(
          playerSpawnPos.x + 1.2,                            // a touch ahead of the player
          0,
          playerSpawnPos.z + side * ring
        );
        // v1.276: the fan stays inside the field. With the crew's four and five allies the fourth steps out 3.4 m, and
        // where you start by a wall (the grocery store's front, z 16.8 against 17.6) he started outside it and spent
        // the match running round the lot unable to get in, firing at nobody (Alex in every store team match, CI red
        // on PR #95). One past the edge starts at the edge instead, a step behind the player.
        const B = built.bounds;
        if (B) {
          const m = 0.8, cz = Math.min(B.maxZ - m, Math.max(B.minZ + m, spawnPos.z));
          if (cz !== spawnPos.z) { spawnPos.z = cz; spawnPos.x -= 2.4; }
          spawnPos.x = Math.min(B.maxX - m, Math.max(B.minX + m, spawnPos.x));
        }
        // v1.179: in a match whose start has no line to the field (Friday Night Lights, behind the concession stand),
        // the allies break from you and walk to the posts they hold, as a respawned ally already does. Brooke stood
        // beside you all round with nobody to see (Found in play, v1.178).
        if (sc.allyDeploy) { deployTarget = post.clone(); startState = 'deploying'; }
      } else {
        spawnPos = post.clone();
      }

      // v1.138: a kid set to hold a perch (the treehouse) spawns up there, on his anchor
      const perch = (es.perch && built.perches) ? built.perches[es.perch] || null : null;
      if (perch) { spawnPos = placement.pos.clone(); deployTarget = null; startState = null; }
      // v1.23: never spawn a kid stuck inside cover (cars/boxes/bins/fences) —
      // that produced the "enemy that never moves or shoots" bug. Nudge out.
      {
        const clear = findClearSpawn(spawnPos.x, spawnPos.z, built.obstacles, 0.4, perch ? perch.y : null);
        spawnPos.x = clear.x; spawnPos.z = clear.z;
      }
      if (crewSpread && !perch && !(joinsEnemyHuddle && !es.spawnAt)) {   // v1.277: see crewSpread (a shared start too)
        const p = crewSpreadStart(spawnPos.x, spawnPos.z, takenStarts, built.bounds, built.obstacles);
        spawnPos.x = p.x; spawnPos.z = p.z;
      }
      if (crewSpread && !perch && joinsEnemyHuddle && !es.spawnAt) {   // v1.315: the huddle's own, closer spacing
        const p = crewSpreadStart(spawnPos.x, spawnPos.z, huddleStarts, built.bounds, built.obstacles, CREW_HUDDLE_GAP);
        spawnPos.x = p.x; spawnPos.z = p.z;
        huddleStarts.push({ x: spawnPos.x, z: spawnPos.z });
      }
      takenStarts.push({ x: spawnPos.x, z: spawnPos.z });

      const enemy = makeEnemyFromCharacter(es.charId, {
        pos: spawnPos,
        homeCover: placement.cover || null,
        scene: built.scene,
        weapon: es.weapon || 'pistol',
        role: es.role || 'skirmisher',
        anchorPos: post.clone(),
        armorMult: sc.armorMult || 1,
        behavior: es.behavior || 'gunner',          // v1.25: 'tagger' for zombie mode
        zombieSprinter: !!es.zombieSprinter,
        // Ship C: team assignment.
        //  - explicit es.team wins (e.g. 'player' for an ally, 'red'/'blue' for teams)
        //  - FFA mode (sc.ffa): each kid gets a unique team so everyone fights
        //    everyone (and the player is their own 'player' team)
        //  - default: 'enemy' (classic player-vs-all)
        team: esTeam,
        statsOverride: es.statsOverride || null,   // v1.57: tutorial dummies, etc.
        noFire: !!es.noFire,                        // v1.58: hard never-fire flag
        crewColor: crewWornBy(sc, es, esTeam),      // v1.200: your allies wear your crew's bandana
      });
      if (enemy) {
        if (perch) { enemy.perch = perch; enemy.pos.y = perch.y; }   // v1.138: see kidGroundY
        enemy.startAt = { x: spawnPos.x, z: spawnPos.z, huddle: !!(joinsEnemyHuddle && !es.spawnAt) };   // v1.277: where he started
        if (es.climb === false) enemy.noClimb = true;                   // v1.143: stays on the ground (kidLadderStep)
        if (es.holdUntilLadder) enemy.holdUntilLadder = true;           // v1.165: no shot until a kid is on the ladder
        if (es.holdUntilNear) enemy.holdUntilNear = es.holdUntilNear;   // v1.316: no shot until a teammate is this close to you
        if (es.vip) { enemy.vip = true; addVipCap(enemy.mesh, esTeam === 'player'); }   // v1.170
        if (es.ctf) enemy.ctfRole = es.ctf;                                             // v1.189: 'run' goes for the flag
        if (es.crewFill) enemy.crewFill = true;                                         // v1.278: see updateKidBoredom
        if (es.crewLoan) enemy.crewLoan = { gun: enemy.weapon, own: CREW_GUNS[es.charId], bbs: 0, loaded: null };   // v1.337: your gun, your BBs
        if (enemy.behavior === 'tagger') {
          // Taggers don't flank or deploy from a huddle — they just chase from
          // wherever they spawned. Spread them so they don't stack.
          enemy.flankSide = 0;
          enemy.state = 'chasing';
          enemy._spawnPos = spawnPos.clone();
          // v1.36h: taggers are playing INFECTION — no guns. Hide the gun mesh
          // entirely (one-time). The zombie arm pose is reapplied every frame in
          // the tagger AI block, because setKidCrouch(.,0) resets arm Y each tick.
          if (enemy.mesh && enemy.mesh.gunGroup) enemy.mesh.gunGroup.visible = false;
          built.enemies.push(enemy);
          setupIdx++;
          continue;
        }
        // v1.24a: FLANK LANES. Split the attacking squad into left / center /
        // right approach lanes so they pincer the player instead of all funneling
        // straight up the middle. Assignment alternates by setup order; an
        // explicit es.flank ('L'|'C'|'R') overrides. Defenders/snipers hold, so
        // they get center (no swing). The 'advancing' state reads flankSide to
        // bias its push toward an offset waypoint that decays as they close.
        let flank;
        if (es.flank) flank = es.flank;
        else if (es.role === 'defender' || es.weapon === 'sniper') flank = 'C';
        else flank = ['L', 'R', 'C'][setupIdx % 3];
        enemy.flankSide = flank === 'L' ? -1 : (flank === 'R' ? 1 : 0);
        // v1.23: remember the original spawn point + deploy target so a shot
        // attacker in a DEFEND scenario can run back here and redeploy (instead
        // of dying permanently). Stored on every enemy; only used when the
        // scenario type is 'defend'.
        enemy._spawnPos = spawnPos.clone();
        enemy._deployAnchor = post.clone();
        // v1.319 (backlog B.13, Michael 22 Oct: "move the enemy spawn point to the opposite base, so that shooting an
        // enemy has a greater effect / longer cooldown"): a match can send its tagged attackers back to another
        // staging point than the one they set out from. They still open from their own huddle; tagged, they walk to
        // a ring round enemyRespawnCluster and come again from there.
        if (sc.enemyRespawnCluster && esTeam === 'enemy' && built.placements[sc.enemyRespawnCluster]) {
          const rc = built.placements[sc.enemyRespawnCluster].pos, ang = setupIdx * 1.3;
          const clear = findClearSpawn(rc.x + Math.cos(ang) * 1.6, rc.z + Math.sin(ang) * 1.6, built.obstacles, 0.4);
          enemy._respawnPos = new THREE.Vector3(clear.x, 0, clear.z);
        }
        if (deployTarget) {
          enemy.deployTarget = deployTarget;
          enemy.state = startState;
          // Staggered hold so the huddle is visible and kids peel off one at a
          // time: ~0.5s base + 0.45s per spawn index + a little jitter.
          enemy.deployDelay = 0.5 + (clusterIdx - 1) * 0.45 + gameRandom() * 0.25;
          enemy._baseDeployDelay = enemy.deployDelay;
        } else {
          // No-cluster spawn (rare for defends, but be safe): respawn deploys
          // straight from the anchor with a tiny delay.
          enemy._baseDeployDelay = 0.4;
        }
        // v1.34: TEAM BATTLES give every NPC (allies and enemies alike) a lives
        // pool — default 3 — so a tagged kid respawns at its base until the pool
        // is spent. v1.36g: FFA may ALSO opt into a lives pool via `npcLives`
        // (e.g. a 5-life FFA). A per-kid `lives` on the enemySetup entry overrides
        // everything — used for JUGGERNAUTS (a couple of high-life enemies among
        // default-life allies). Modes without any of these keep health-only.
        const _isTeamBattle = (sc.winCondition === 'last_team_standing') && !sc.ffa;
        const _ffaWithLives = sc.ffa && (typeof sc.npcLives === 'number');
        const _perKidLives = (typeof es.lives === 'number') ? es.lives : null;
        if (_perKidLives !== null) {
          enemy.lives = _perKidLives;
          enemy.maxLives = _perKidLives;
        } else if (_isTeamBattle || _ffaWithLives) {
          const lv = (typeof sc.npcLives === 'number') ? sc.npcLives : 3;
          enemy.lives = lv;
          enemy.maxLives = lv;
        }
        built.enemies.push(enemy);
      }
      setupIdx++;
    }
  }

  // === v1.35: NIGHT flashlight — on night maps, enemy gunners carry working
  // flashlights (a real beam + SpotLight on their gun, pointing where they aim).
  // v1.36h: MORE light. Bumped from ~1-in-3 to ~2-in-3 carrying a flashlight,
  // and a separate ~half of the eligible gunners also get a cosmetic red laser
  // (independent roll), so the night woods read as a busy crisscross of beams.
  // Skipped in Infection (survive_untagged: taggers have no guns to mount on,
  // and the mode is its own thing). Only ENEMY-team gunners are eligible (not
  // the player's allies — but on team-vs-team night maps "enemy" is the red
  // team, which is what we want lit up downrange).
  if (_tod === 'night' && sc.winCondition !== 'survive_untagged') {
    const eligible = built.enemies.filter(e =>
      e && e.mesh && e.mesh.gunGroup &&
      e.behavior !== 'tagger' &&
      (e.team || 'enemy') !== 'player'      // not the player's allies
    );
    if (eligible.length > 0) {
      // Flashlights: ~2 of every 3 eligible gunners, minimum 1.
      const nFlash = Math.max(1, Math.round(eligible.length * 2 / 3));
      for (let i = 0; i < nFlash && i < eligible.length; i++) {
        attachKidFlashlight(eligible[i].mesh);
      }
      // Lasers: ~half the eligible gunners, minimum 1 (when there's more than
      // one enemy). Offset the start index so the same kids don't always get
      // both — spreads the two accessories across the squad. A kid CAN end up
      // with both (flashlight + laser), which looks great in the dark.
      // v1.36i: alternate RED / GREEN beams so the night reads as a mix.
      const nLaser = Math.max(1, Math.round(eligible.length / 2));
      const off = Math.floor(eligible.length / 3);   // start partway in
      for (let k = 0; k < nLaser && k < eligible.length; k++) {
        const col = (k % 2 === 0) ? 'red' : 'green';
        attachKidLaser(eligible[(k + off) % eligible.length].mesh, col);
      }
    }
  }

  // === v1.9: scenario-level player spawn override ===
  // If the scenario specifies a named spawn (`playerSpawn` field), use it.
  if (sc.playerSpawn && built.playerSpawns && built.playerSpawns[sc.playerSpawn]) {
    const ps = built.playerSpawns[sc.playerSpawn];
    built.spawn = ps.pos.clone();
    built.spawnYaw = ps.yaw;
    if (ps.y != null) built.spawn.y = ps.y;   // v1.138: a spawn up in the treehouse
  }
  // v1.28k: nudge the PLAYER spawn out of any obstacle it overlaps, same as we
  // already do for enemies. Backyard cover is placed randomly each load, so a
  // fixed spawn could land inside a bin/box/pile and trap the player ("stuck in
  // random obstacles that change every time"). findClearSpawn pushes to clear air.
  if (built.spawn && built.obstacles) {
    const cleared = findClearSpawn(built.spawn.x, built.spawn.z, built.obstacles, 0.4, (built.spawnFootY || built.spawn.y > 0.01) ? built.spawn.y : null);   // v1.306: the range's door is under the deck, below y 0
    built.spawn.x = cleared.x;
    built.spawn.z = cleared.z;
  }

  // v1.34: TEAM BATTLES (last_team_standing, not FFA) get cosmetic base flags —
  // one on the player/ally end (at the player spawn) and one on the enemy end
  // (centroid of the enemy-team fighting anchors, which now sit at the far end of
  // the street). Purely decorative: marks where each side respawns/regroups.
  {
    const _isTeamBattle = (sc.winCondition === 'last_team_standing') && !sc.ffa;
    if (_isTeamBattle && built.spawn && built.scene) {
      const gfn = built.groundY || ((x, z) => 0);
      const PLAYER_BLUE = 0x3d7bd6;   // friendly
      const ENEMY_RED   = 0xd6453d;   // opposing
      if (built.teamBases && built.teamBases.player && built.teamBases.enemy) {
        // v1.36f: builder gave explicit base positions (e.g. the two forts).
        // Assign by proximity to the ACTUAL player spawn so it's correct
        // regardless of which side the scenario puts the player on.
        const ps = built.spawn;
        const tb = built.teamBases;
        const dP = Math.hypot(tb.player.x - ps.x, tb.player.z - ps.z);
        const dE = Math.hypot(tb.enemy.x - ps.x, tb.enemy.z - ps.z);
        const playerBase = dP <= dE ? tb.player : tb.enemy;
        const enemyBase  = dP <= dE ? tb.enemy : tb.player;
        addBaseMarker(built.scene, playerBase.x, playerBase.z, PLAYER_BLUE, gfn, { poleAt: basePoleClearOfStart(playerBase, ps, built.spawnYaw) });
        addBaseMarker(built.scene, enemyBase.x, enemyBase.z, ENEMY_RED, gfn);
      } else {
        // Player base at the player's spawn point.
        addBaseMarker(built.scene, built.spawn.x, built.spawn.z, PLAYER_BLUE, gfn, { poleAt: basePoleClearOfStart(built.spawn, built.spawn, built.spawnYaw) });
        // Enemy base = centroid of enemy-team kids' fighting anchors (far end).
        let ex = 0, ez = 0, en = 0;
        for (const e of built.enemies) {
          if ((e.team || 'enemy') === 'player') continue;   // skip allies
          const a = e._deployAnchor || e.anchorPos || e.pos;
          if (a) { ex += a.x; ez += a.z; en++; }
        }
        if (en > 0) {
          addBaseMarker(built.scene, ex / en, ez / en, ENEMY_RED, gfn);
        }
      }
    }
  }

  // === v1.9: scenario-level naming override ===
  // Scenarios with data-driven setup have their own name/scenarioName/desc that
  // override what the builder emitted.
  if (sc.name) built.name = sc.name;
  if (sc.scenarioName) built.scenarioName = sc.scenarioName;
  if (sc.desc) built.desc = sideCountDesc(scenarioId, sc.desc);   // v1.349: the count a side as built

  Scenes.scenarios[scenarioId] = built;
  Game.scenario.active = scenarioId;
  Game.scenario.enemies = built.enemies;
  // v1.41: within a single battle, give each ENEMY-team kid a distinct BB color
  // where the palette allows it, so you can read whose rounds are whose in a
  // firefight. Allies (player team) keep their hash color — they're not shooting
  // at you, so collisions there don't matter. Falls back to the hash color once
  // more than NPC_BB_PALETTE.length hostiles are present.
  assignScenarioBBColors(Game.scenario.enemies);
  Game.scenario.cover = built.cover;
  Game.scenario.bounds = built.bounds;
  Game.scenario.groundY = built.groundY || null;   // v1.8: terrain fn (null = flat)
  Game.scenario.ladders = built.ladders || null;   // v1.138: climb zones (the treehouse ladder)
  Game.scenario.perches = built.perches || null;   // v1.143: what a kid who climbs a ladder holds (kidLadderStep)
  Game.scenario.range = (sc.range && built.range) || null;   // v1.257 (D.40): the backyard range's targets
  Game.player.climbing = null;
  // v1.67: silence any whistles still attached to BBs from a prior run before we
  // drop the array, so no audio node is orphaned and left droning.
  if (Game.scenario.bbs) for (const ob of Game.scenario.bbs) { if (ob._whistle) bbWhistleStop(ob); }
  _bbWhistleCount = 0;   // v1.68: authoritative reset — clears any drift from edge-case removals
  Game.scenario.bbs = [];
  Game.scenario.stuckBBs = [];
  Game.scenario.fragments = [];
  retireScene(Game.scene, built.scene);   // v1.377: the room or the last match leaves the GPU
  for (const k in Scenes.scenarios) if (k !== scenarioId) delete Scenes.scenarios[k];
  Game.scenario.scene = built.scene;
  Game.scenario.startTime = performance.now() / 1000;

  // === v1.9: timer-based scenarios ===
  // For survive_timer wins, stash the timer state on Game.scenario so updateScenarioTimer
  // can tick it down and check for win.
  Game.scenario.winCondition = sc.winCondition || 'kill_all';
  Game.scenario.ffa = !!sc.ffa;   // v1.134: read by the roster, the lives respawn and the free-for-all roam; was never set
  Game.scenario.vip = !!sc.vip;   // v1.170
  Game.scenario.ctfDef = sc.ctf || null;   // v1.189: capture the flag; the flags themselves are set up in startScenario
  Game.scenario.ctf = null;
  Game.scenario.squadOrder = null; Game.scenario.squadReply = null; Game.scenario.squadLog = []; Game.scenario._ordFields = null;   // v1.248 (D.35): orders hold for one round
  Game.scenario.timerRemaining = (sc.winCondition === 'survive_timer' || sc.winCondition === 'survive_untagged') ? (sc.timerSec || 90) : null;
  Game.scenario.winByTimer = false;
  Game.scenario.pickupClock = (sc.pickup && sc.pickup.clock) || 0;   // v1.204
  Game.scenario.pickupTimeUp = null;
  Game.scenario.scenarioType = sc.scenarioType || 'skirmish';
  Game.player._infected = false;   // v1.25: clear zombie-tag state each run

  // v1.39: remember the scenario id for the result-screen nav buttons.
  Game._lastScenarioId = scenarioId;

  // v1.257 (D.40): the backyard range has no briefing; you are straight out the back door
  if (sc.range) {
    hideAllMenus();
    document.getElementById('bedroomHud').style.display = 'none';
    Game.scene = built.scene;
    startScenario(built);
    return;
  }

  // === v1.39: Loading screen (replaces the old auto-advancing intro card) ===
  // Header + description.
  document.getElementById('introLoc').textContent = built.name.toUpperCase();
  document.getElementById('introName').textContent = built.scenarioName;
  document.getElementById('introDesc').textContent = built.desc;

  // Roster panel: allies / enemies / gear / lives, from the data table.
  const brief = getScenarioBriefing(scenarioId);
  document.getElementById('introRoster').innerHTML = renderBriefingRosterHTML(brief);
  { const w = document.getElementById('introWallet'); if (w) w.innerHTML = walletHTML(getMaxAmmoForGun(Game.persist.equipped.gun)); }   // v1.260 (D.43)

  // Birds-eye field map: enemy + ally + player starting positions, drawn from
  // the actually-spawned enemies (authoritative) and the resolved player spawn.
  drawIntroFieldMap(built, playerSpawnPos);

  const intro = document.getElementById('scenarioIntro');
  intro.style.display = 'flex';
  intro.style.opacity = '1';
  intro.style.transition = '';
  hideAllMenus();
  document.getElementById('bedroomHud').style.display = 'none';

  // Render the built scene from the player's spawn so the level is visible
  // behind/around the loading panel. We point Game.scene at the scenario scene
  // now (the main tick loop renders Game.scene every frame); the scenario_intro
  // mode runs no player/AI updates, so it stays a static preview until BEGIN.
  const loadHint = document.getElementById('introLoadHint');
  try {
    const previewCam = Game.camera;
    const sp = built.spawn || (playerSpawnPos || new THREE.Vector3(0, 0, 0));
    const eyeY = (built.groundY ? built.groundY(sp.x, sp.z) : 0) + (Game.player.eyeOffsetStand || 1.35);
    previewCam.position.set(sp.x, eyeY, sp.z);
    const yaw = (typeof built.spawnYaw === 'number') ? built.spawnYaw : 0;
    previewCam.rotation.order = 'YXZ';
    previewCam.rotation.set(0, yaw, 0);
    built.scene.add(previewCam);
    Game.scene = built.scene;   // tick loop will render this behind the overlay
    loadHint.textContent = 'Field ready — preview behind. Press BEGIN when set.';
  } catch (e) {
    loadHint.textContent = 'Press BEGIN when ready.';
  }

  if (sc.coop) coopEntered();   // v1.381 (D.73): the kids matched to who moves them
  // BEGIN button — start only when the player is ready (no auto-advance).
  const beginBtn = document.getElementById('introBeginBtn');
  const freshBegin = beginBtn.cloneNode(true);
  beginBtn.parentNode.replaceChild(freshBegin, beginBtn);
  freshBegin.disabled = false; freshBegin.textContent = 'BEGIN ▶';   // v1.230: an online match's BEGIN waited and said so
  const begin = () => {
    intro.style.transition = 'opacity 0.4s';
    intro.style.opacity = '0';
    setTimeout(() => {
      intro.style.display = 'none';
      intro.style.transition = '';
      startScenario(built);
    }, 400);
  };
  // v1.230 (D.2): online, the match starts when both players have pressed BEGIN
  freshBegin.addEventListener('click', () => (Net.active && (sc.online || sc.coop)) ? netBegin(freshBegin, built, begin) : begin());   // v1.381: and co-op
}

// ---------------------------------------------------------------------
// v1.39: Birds-eye field-map preview for the loading screen. Plots the
// player spawn, allies, and enemies on a top-down canvas, auto-fit to the
// spread of points (with the play-area bounds as a floor).
// ---------------------------------------------------------------------
function drawIntroFieldMap(built, playerSpawnPos) {
  const canvas = document.getElementById('introMap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Gather points: player + each spawned enemy/ally (team tells the color).
  const pts = [];
  const playerPt = playerSpawnPos
    ? { x: playerSpawnPos.x, z: playerSpawnPos.z, kind: 'you' }
    : (built.spawn ? { x: built.spawn.x, z: built.spawn.z, kind: 'you' } : null);
  if (playerPt) pts.push(playerPt);
  for (const e of (built.enemies || [])) {
    const p = e._spawnPos || e.pos;
    if (!p) continue;
    pts.push({ x: p.x, z: p.z, kind: (e.team === 'player') ? 'ally' : 'enemy' });
  }
  if (pts.length === 0) return;

  // Fit window: union of bounds and point spread, with margin.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  if (built.bounds) {
    minX = Math.min(minX, built.bounds.minX); maxX = Math.max(maxX, built.bounds.maxX);
    minZ = Math.min(minZ, built.bounds.minZ); maxZ = Math.max(maxZ, built.bounds.maxZ);
  }
  const pad = 4;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  // Keep aspect square so positions don't distort.
  const spanX = maxX - minX, spanZ = maxZ - minZ;
  const span = Math.max(spanX, spanZ, 1);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  minX = cx - span / 2; maxX = cx + span / 2;
  minZ = cz - span / 2; maxZ = cz + span / 2;

  const inset = 14;
  const toPx = (x, z) => {
    const u = (x - minX) / (maxX - minX);
    const v = (z - minZ) / (maxZ - minZ);
    return [inset + u * (W - inset * 2), inset + v * (H - inset * 2)];
  };

  // Grid backdrop.
  ctx.strokeStyle = 'rgba(212,165,116,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const gx = inset + (i / 6) * (W - inset * 2);
    const gy = inset + (i / 6) * (H - inset * 2);
    ctx.beginPath(); ctx.moveTo(gx, inset); ctx.lineTo(gx, H - inset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(inset, gy); ctx.lineTo(W - inset, gy); ctx.stroke();
  }

  // Play-area bounds outline.
  if (built.bounds) {
    const [bx1, by1] = toPx(built.bounds.minX, built.bounds.minZ);
    const [bx2, by2] = toPx(built.bounds.maxX, built.bounds.maxZ);
    ctx.strokeStyle = 'rgba(212,165,116,0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.min(bx1, bx2), Math.min(by1, by2), Math.abs(bx2 - bx1), Math.abs(by2 - by1));
  }

  // Markers.
  const colorOf = { you: '#4aa3ff', ally: '#6abf69', enemy: '#e74c3c' };
  for (const p of pts) {
    const [px, py] = toPx(p.x, p.z);
    ctx.beginPath();
    ctx.fillStyle = colorOf[p.kind] || '#fff';
    ctx.arc(px, py, p.kind === 'you' ? 7 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();
    if (p.kind === 'you') {
      // small ring to emphasize the player
      ctx.beginPath();
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 1.5;
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.stroke();
      // v1.59: facing arrow. Player forward in world space is
      // (-sin(yaw), -cos(yaw)); canvas-x tracks world-x and canvas-y tracks
      // world-z, so the same components give the on-canvas heading. Draw a small
      // triangle just outside the ring, pointing the way the player will spawn
      // looking — so the starting orientation relative to enemies/allies is clear.
      const yaw = (typeof built.spawnYaw === 'number') ? built.spawnYaw : 0;
      const fx = -Math.sin(yaw), fy = -Math.cos(yaw);
      const flen = Math.hypot(fx, fy) || 1;
      const dirX = fx / flen, dirY = fy / flen;
      // perpendicular for the arrow base width
      const perpX = -dirY, perpY = dirX;
      const tip = 18, base = 12, half = 4.5;   // distances from the dot center
      const tipX = px + dirX * tip,  tipY = py + dirY * tip;
      const bLX = px + dirX * base + perpX * half, bLY = py + dirY * base + perpY * half;
      const bRX = px + dirX * base - perpX * half, bRY = py + dirY * base - perpY * half;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(bLX, bLY);
      ctx.lineTo(bRX, bRY);
      ctx.closePath();
      ctx.fillStyle = '#4aa3ff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.stroke();
    }
  }
}

function startScenario(built) {
  if (Game.paused) closePauseMenu();   // v1.239
  Game.mode = 'scenario';
  Game.roundSeq = (Game.roundSeq || 0) + 1;   // v1.90: identifies this round for endScenarioLater
  Game.scenario.roundTime = 0;   // v1.101: simulated seconds since BEGIN (drives the opening hold)
  VOICE.globalCooldownUntil = 0; VOICE.walkieUntil = 0; VOICE.recentLines = []; VOICE.pending = [];   // v1.150: the speech cooldown runs on the round clock (v1.256: no lines left waiting)
  Game.scenario._startCalled = false;   // v1.151: the start call, once a round (Game.scenario persists between rounds)
  Game.scenario.stats = newMatchStats();   // v1.193: what the result screen tells you about your match
  Game.hitMarkerT = 0; Game.hitMarkers = 0;   // v1.321 (D.60)
  Game.hurtFlashT = 0; Game.hurtFlashes = 0; hurtFlashStep(0);   // v1.322 (D.62)
  { const gm = Game.persist.gunMatches, gt = Game.persist.equipped.gun;   // v1.262 (D.44): one more match for the gun you carry
    if (gm && typeof gm[gt] === 'number') gm[gt]++; }
  Game.scenario.ladderReached = false;   // v1.165: set when the first kid starts up a ladder (holdUntilLadder)
  Game.scenario.attackNear = false;      // v1.316: set when a kid first comes within holdUntilNear of you
  Game.scene = built.scene;
  // v1.356 (D.69): the bedroom theme gives way to the match's own loop (the range stays quiet)
  startMatchMusic();

  // Reset player at scenario spawn
  Game.player.pos.copy(built.spawn);
  Game.player.vel.set(0, 0, 0);
  Game.player.yaw = built.spawnYaw;
  Game.scenario.playerStart = { pos: built.spawn.clone(), yaw: built.spawnYaw };   // v1.170: where a VIP-match respawn puts you
  Game.scenario.playerRespawns = 0;
  Game.player._graceT = 0;
  Game.player._holdT = 0;   // v1.280
  Game.player._goingHome = false; Game.player._gunUp = 0;   // v1.290
  Game.player.pitch = 0;
  Game.player.hitsTaken = 0;
  // v1.28h: base lives default to 1 (one hit and you're out) — was a flat 3.
  // A scenario can still opt into more via its `playerLives` field; armor & head
  // protection add bonus hits on top.
  const _scDefLives = SCENARIOS[Game.scenario.active];
  const _baseLives = (_scDefLives && typeof _scDefLives.playerLives === 'number')
    ? _scDefLives.playerLives : 1;
  Game.player.maxHits = _baseLives + getArmorBonusHits();
  // v1.26: reset stamina full at match start.
  Game.player.staminaMax = STAMINA_MAX_BASE * (getEquippedShoeStats().staminaMult || 1);
  Game.player.stamina = Game.player.staminaMax;
  Game.player.exhausted = false;
  Game.player.airSprint = false;
  Game.player.bounds = built.bounds;
  settleYardProps(built.obstacles);   // v1.217 (D.27): no yard prop through a fence, a house, a tree or another prop
  Game.player.obstacles = built.obstacles;
  Game.player.crouching = false;
  Game.player.sprinting = false;
  Game.player.ads = 0;
  Game.player.adsTarget = 0;
  applyPlayerLook();   // v1.108: the mirror's height sets the eye height and hitbox
  Game.player.eyeOffset = Game.player.eyeOffsetStand;
  Game.player.velY = 0;
  Game.player.onGround = true;
  Game.player.sliding = false;
  Game.player.slideTime = 0;
  Game.player.canSlide = false;

  // Reset gun — load full spec from GUN_SPECS based on equipped gun
  Game.gun.type = Game.persist.equipped.gun;
  const spec = getGunSpec(Game.gun.type);
  Game.gun.muzzleVelocity = spec.muzzleVelocity * underPartMult('velocityMult');   // v1.169: the cardboard barrel slows the BB
  Game.gun.baseSpread = spec.baseSpread;
  Game.gun.adsSpreadMult = spec.adsSpreadMult;
  Game.gun.curveOnsetDistance = spec.curveOnsetDistance;
  Game.gun.curveStrengthMax = spec.curveStrengthMax;
  Game.gun.curveStrengthMin = spec.curveStrengthMin;   // v1.250: the curving cheap guns' floor (undefined for the rest)
  Game.gun.pelletsPerShot = spec.pelletsPerShot;
  Game.gun.cockType = spec.cockType;
  Game.gun.cockTime = spec.cockTime;
  // v1.20: auto-fire fields
  Game.gun.fireMode = spec.fireMode || 'semi';
  Game.gun.cyclicRPM = spec.cyclicRPM || 0;
  Game.gun.electric = !!spec.electric;   // v1.326
  Game.gun.semiRPM = spec.semiRPM || 0;
  Game.gun.gasFade = spec.gasFade || 0;   // v1.399: the Gas Pistol's gas cools as its mag empties
  Game.gun.burst = spec.burst || 0;   // v1.327
  Game.gun._burstLeft = 0;
  Game.gun._jamIn = 0;   // v1.250: no burst carries a jam into the next match
  Game.gun.autoFireTimer = 0;
  Game.gun._sinceShot = null;   // v1.292
  Game.gun.maxAmmo = getMaxAmmoForGun(Game.gun.type);
  // v1.60: snapshot the carried-gear weight penalty for this match (loadout is
  // fixed once the round starts, so compute once instead of every movement frame).
  Game.scenario.weightSpeedMult = loadoutWeightSpeedMult();
  // Starting ammo: take up to maxAmmo from bag
  const startTaken = Math.min(Game.gun.maxAmmo, Game.persist.bag);
  Game.gun.ammo = startTaken;
  Game.persist.bag -= startTaken;
  // v1.169: a taped twin mag loads next, from what the bag has left, up to the same size
  Game.gun.tapedMag = !!(getUnderPart(Game.gun.type) || {}).tapedMag;
  Game.gun.tapedAmmo = Game.gun.tapedMag ? Math.min(Game.gun.maxAmmo, Game.persist.bag) : 0;
  Game.persist.bag -= Game.gun.tapedAmmo;
  fillSpareMagsFromBag();   // v1.323 (B.14): the spare mags in your slots load next
  Game.gun.flipT = 0;
  Game.gun._rHeld = false;
  // v1.50: then top off any equipped speed loaders from what's left in the bag
  // (mag gets first claim). Loaders are reusable — they arrive full each round.
  refillEquippedSpeedLoadersFromBag();
  crewLoadLoans();   // v1.337 (D.28 step 4): then a crew kid on a gun of yours loads from what is left
  Game.gun.cocked = true;           // starts cocked, ready to fire
  Game.gun.cockProgress = 0;
  Game.gun.cockReleasing = false;
  Game.gun.cockReleaseProgress = 0;
  Game.gun.jammed = false;
  Game.gun.jamProgress = 0;
  Game.gun.fireCooldown = 0;
  Game.gun._reachedFullPull = false;
  Game.gun._releaseWillCock = false;
  Game.gun._successFlashTime = 0;
  Game.mouseLMB = false;
  Game.lmbConsumed = false;

  // Reset held state — start with gun (slot 0)
  Game.held.slotIdx = 0;
  Game.held.using = false;
  Game.held.useProgress = 0;
  Game.held.useKind = null;
  Game.held.swapBlock = 0;

  // Show combat HUD
  document.getElementById('ammoHud').style.display = 'block';
  document.getElementById('healthHud').style.display = 'block';
  document.getElementById('stanceHud').style.display = 'block';
  document.getElementById('loadoutHud').style.display = 'block';
  document.getElementById('rosterHud').style.display = 'block';
  document.getElementById('crosshair').style.display = 'block';
  if (Game.scenario.range) {   // v1.257 (D.40): nobody to count and nothing to lose in the range
    document.getElementById('rosterHud').style.display = 'none';
    document.getElementById('healthHud').style.display = 'none';
    rangeReset();
  }
  // v1.40: build the per-gun reticle shape + reset aim sway for a clean start.
  buildReticle(Game.gun.type);
  Game.player.sway = 0.18;
  Game.player.swayPhase = 0;
  Game.player.bobPosX = Game.player.bobPosY = Game.player.bobPosZ = 0;
  Game.player.bobRotX = Game.player.bobRotY = Game.player.bobRotZ = 0;
  document.getElementById('bedroomHud').style.display = 'none';
  // v1.28j: clear the bedroom interaction prompt ("E Open the neighborhood map")
  // — updateInteractables only runs in the bedroom branch, so a prompt visible at
  // launch used to linger into the match.
  { const ip = document.getElementById('interactPrompt'); if (ip) ip.style.display = 'none'; }
  hideBedroomLabels();   // v1.62 — clear floating labels when leaving the bedroom
  Game.focusedInteractable = null;
  // Build/select the FP gun mesh based on equipped gun type.
  // Hide all previously-built gun meshes (in case the player changed guns since last match)
  // and show only the active one.
  for (const key in fpGuns) {
    if (fpGuns[key]) fpGuns[key].visible = false;
  }
  fpGun = getOrBuildFPGun(Game.gun.type);
  if (!fpLoader) { fpLoader = buildFPLoader(); attachFpItemHand(fpLoader, 'loader'); }   // v1.219 (D.30): in your hand here,
  if (!fpMag) { fpMag = buildFPMag(); attachFpItemHand(fpMag, 'mag'); }                 // not in the shop's pictures
  if (!fpNoodle) fpNoodle = buildFPNoodle();   // v1.249 (D.36)
  fpNoodle.visible = false;
  Game.noodle = { t: -1, cd: 0, swings: 0, hits: [] };
  fpGun.visible = true;
  updateFPGunAccessory(fpGun, Game.gun.type);   // v1.27: show laser/flashlight if equipped
  fpLoader.visible = false;
  fpMag.visible = false;
  updateAmmoHud();
  updateHealthHud();
  updateLoadoutHud();

  // Move camera to scenario scene
  built.scene.add(Game.camera);
  if (!fpWalkie) fpWalkie = buildFPWalkie();   // v1.149: the walkie at your hip lives in the match's scene (D.10)
  else setFPBody(fpWalkie);   // v1.333 (B.16): your body, rebuilt if your look or gear changed
  fpWalkie.userData.last = null;
  built.scene.add(fpWalkie);
  updateFPWalkie(0, 0);
  showPauseHint();
  // v1.189: capture the flag: the two flags and their bases, in the scene the match is played in
  Game.scenario.ctf = Game.scenario.ctfDef ? ctfSetup(Game.scenario.ctfDef, built) : null;
  // v1.354 (D.71): the go-cart race: the cart, its line down the street, and you in it
  Game.scenario.race = SCENARIOS[Game.scenario.active] && SCENARIOS[Game.scenario.active].race && built.raceRoad ? raceSetup(built) : null;
  // v1.364 (D.72): the golf-cart ride, Eric driving the map's loop and you on the back
  if (SCENARIOS[Game.scenario.active] && SCENARIOS[Game.scenario.active].ride && built.rideLoop) Game.scenario.race = rideSetup(built);

  // v1.57: arm the guided tutorial only for tutorial scenarios; otherwise make
  // sure any prior tutorial state + banner are cleared.
  {
    const scDef = SCENARIOS[Game.scenario.active];
    if (scDef && scDef.tutorial) {
      // MOVE marker: a point partway from spawn toward the dummies' centroid, so
      // walking to it naturally brings the targets into view down range.
      if (!built.tutorialMarker) {
        const sp = built.spawn;
        const ens = (built.enemies || []).filter(e => e.team !== 'player');
        if (ens.length && sp) {
          let cx = 0, cz = 0;
          for (const e of ens) { const p = e._spawnPos || e.pos; cx += p.x; cz += p.z; }
          cx /= ens.length; cz /= ens.length;
          // 45% of the way from spawn toward the targets.
          built.tutorialMarker = new THREE.Vector3(sp.x + (cx - sp.x) * 0.45, 0, sp.z + (cz - sp.z) * 0.45);
        } else if (sp) {
          built.tutorialMarker = sp.clone();
        }
      }
      Tutorial.begin(built);
    } else {
      Tutorial.end();
    }
  }
  if (Net.active && Net.phase === 'begin') netAfterStart();   // v1.230 (D.2)
  // v1.269: the cells a kid fits in, worked out at BEGIN behind the opening hold, not on the first pocket route or
  // squad order mid-fight (a 50-550 ms step, critic 16 Oct)
  if ((Game.scenario.enemies || []).length) kidFreeCells();

  requestPointerLock();
}

// === v1.193 (D.17 "A better game" 5, Michael: C — step 2): THE RESULT SCREEN'S NUMBERS ===
// Each match counts your trigger pulls, your tags (each hit on a kid of the other side puts him out or sends him back),
// how far each one flew and when, and the hits on you. The result screen shows them with the match's time, picks one
// best moment, and says what the match opened: the next match it unlocked and any gun its pay put in reach.
function newMatchStats() { return { shots: 0, tags: [], hitOnYou: 0, damage: [] }; }   // v1.238: damage
function noteMatchTag(bb, c) {
  const st = Game.scenario.stats;
  const from = bb.spawnPos || bb.pos;
  st.tags.push({ name: c.name || 'a kid', dist: Math.hypot(c.pos.x - from.x, c.pos.z - from.z), t: Game.scenario.roundTime || 0,
    foe: combatantTeam(c) !== combatantTeam(Game.player) });   // v1.320 (D.59): a hit the bonus pays for
}
// v1.320 (backlog D.59, Michael 22 Oct: "some sort of 'Bonus' system to give you extra $ in each match? Like maybe you get
// an extra $0.50 per hit?"): every hit you land on a kid of the other side pays HIT_BONUS on top of the match's pay,
// won or lost. Cash is whole dollars, so it pays $1 for every two hits, the odd one dropped. A Pickup Game (it pays a
// little, never the ladder's money), the tutorial's targets and a forfeit pay none.
const HIT_BONUS = 0.5;
function matchHitBonus(outcome) {
  const def = SCENARIOS[Game.scenario.active], st = Game.scenario.stats;
  if (!st || !def || def.pickup || def.range || def.tutorial || outcome === 'forfeit') return { hits: 0, cash: 0 };
  const hits = st.tags.filter(t => t.foe).length;
  return { hits, cash: Math.floor(hits * HIT_BONUS) };
}
// v1.238 (backlog D.34, Michael 14 Oct: "a 'damage report' after you've been eliminated from a match that shows where
// you were shot on your player mesh, and by what weapon. If you have multiple lives, it should show each shot that
// landed on your character"). Each hit on you keeps where it landed on your body (its height up your hitbox, how far
// off your middle and which side it came from), who fired it, his gun, the distance, the time and which life it was.
function noteDamageOnYou(bb) {
  const P = Game.player, st = Game.scenario.stats;
  if (!st.damage) st.damage = [];
  const h = Math.max(0, Math.min(1, (bb.pos.y - P.pos.y) / (P.eyeOffset + 0.1)));
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);          // your facing
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);           // your right
  const dx = bb.pos.x - P.pos.x, dz = bb.pos.z - P.pos.z;
  const lat = dx * rx + dz * rz;                                // + to your right
  const vx = bb.vel ? bb.vel.x : -dx, vz = bb.vel ? bb.vel.z : -dz;
  const front = (-vx * fx - vz * fz) >= 0;                      // it came from in front of you
  const side = lat >= 0 ? 'right' : 'left';
  const part = h > 0.86 ? 'head' : h > 0.5 ? (Math.abs(lat) > 0.2 ? side + ' arm' : (front ? 'chest' : 'back'))
    : h > 0.4 ? (front ? 'stomach' : 'lower back') : side + ' leg';
  const e = bb.enemyRef;
  const from = bb.spawnPos || null;
  const pickup = !!(SCENARIOS[Game.scenario.active] && SCENARIOS[Game.scenario.active].pickup);
  st.damage.push({ part, front, h: +h.toFixed(3), lat: +Math.max(-0.3, Math.min(0.3, lat)).toFixed(3),
    by: e ? (e.name || 'a kid') : null, gun: e && e.weapon ? getGunDisplayName(e.weapon) : null,
    dist: from ? Math.round(Math.hypot(P.pos.x - from.x, P.pos.z - from.z)) : null,
    t: Game.scenario.roundTime || 0, life: pickup ? P.hitsTaken : (Game.scenario.playerRespawns || 0) + 1 });
}
// Shown on the result screen once you have been tagged out: a match lost, or any life lost in one you came back in.
const DAMAGE_REPORT = { renderer: null, scene: null, camera: null, kid: null, sig: '' };
const DAMAGE_W = 176, DAMAGE_H = 150, DAMAGE_ROWS = 8;
function damageReportHtml(outcome) {
  const st = Game.scenario.stats;
  const dmg = (st && st.damage) || [];
  if (!dmg.length || (outcome === 'win' && !(Game.scenario.playerRespawns > 0))) return '';
  const lives = new Set(dmg.map(d => d.life)).size > 1;
  let rows = '';
  dmg.slice(0, DAMAGE_ROWS).forEach((d, i) => {
    const who = d.by ? `${d.by}${d.gun ? ', ' + d.gun : ''}` : 'a stray BB';
    const extra = [d.dist != null ? d.dist + ' m' : '', fmtMatchTime(d.t), lives ? 'life ' + d.life : ''].filter(Boolean).join(' · ');
    rows += `<div class="rs-dmg-row"><span class="rs-dmg-n">${i + 1}</span>${d.part[0].toUpperCase() + d.part.slice(1)} — ${who}<br><span style="color:#9a8f7c">${extra}</span></div>`;
  });
  if (dmg.length > DAMAGE_ROWS) rows += `<div class="rs-dmg-row" style="color:#9a8f7c">and ${dmg.length - DAMAGE_ROWS} more</div>`;
  return `<div class="rs-damage" id="rsDamage"><div class="rs-dmg-fig"><canvas id="rsDamageCanvas" width="${DAMAGE_W}" height="${DAMAGE_H}"></canvas>` +
    `<svg id="rsDamageDots" viewBox="0 0 ${DAMAGE_W} ${DAMAGE_H}"></svg></div>` +
    `<div class="rs-dmg-list"><span class="rs-tag">DAMAGE REPORT</span>${rows}</div></div>`;
}
// v1.245: the report's own renderer is made, and its kid's shaders compiled, at the title (warmDamageReport). Made on the
// first loss it froze the game for 2–3 s there, waiting on the GPU (critic, 15 Oct); later losses took 3–6 ms.
function initDamageReport() {
  const D = DAMAGE_REPORT;
  if (D.renderer) return;
  D.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  D.renderer.setSize(DAMAGE_W, DAMAGE_H, false);
  D.scene = new THREE.Scene();
  D.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.95));
  const l = new THREE.DirectionalLight(0xffffff, 0.6); l.position.set(0, 3, 4); D.scene.add(l);
  const l2 = new THREE.DirectionalLight(0xffffff, 0.4); l2.position.set(0, 3, -4); D.scene.add(l2);
  D.camera = new THREE.PerspectiveCamera(30, (DAMAGE_W / 2) / DAMAGE_H, 0.1, 20);
}
function setDamageReportKid(look, gun, gk) {
  const D = DAMAGE_REPORT;
  const sig = JSON.stringify([look, gun, gk]);
  if (D.sig === sig) return;
  if (D.kid) D.scene.remove(D.kid.group);
  D.kid = createKid(Object.assign({}, look), gun);
  buildKidGear(D.kid, gk);
  D.scene.add(D.kid.group); D.sig = sig;
}
function warmDamageReport() {
  initDamageReport();
  const D = DAMAGE_REPORT;
  setDamageReportKid(Game.persist.look, Game.persist.equipped.gun, []);
  D.camera.position.set(0, 1, 4); D.camera.lookAt(0, 1, 0); D.camera.updateMatrixWorld(true);
  D.renderer.render(D.scene, D.camera);
}
// Your kid (your look, your gun, your gear) drawn twice, front and back, with a numbered dot where each hit landed:
// hits from in front on the front view, from behind on the back one.
function drawDamageReport() {
  const canvas = document.getElementById('rsDamageCanvas'), svg = document.getElementById('rsDamageDots');
  if (!canvas || !svg) return;
  const D = DAMAGE_REPORT;
  initDamageReport();
  setDamageReportKid(Game.persist.look, Game.persist.equipped.gun, loadoutKidGearKeys());
  const kid = D.kid.group;
  kid.rotation.set(0, 0, 0); kid.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(kid), tall = box.max.y - box.min.y;
  const cy = box.min.y + tall / 2, dist = tall / 2 / Math.tan(15 * Math.PI / 180) * 1.12;
  const r = D.renderer, half = DAMAGE_W / 2;
  r.setScissorTest(true);
  r.setClearColor(0x2a2f38, 1);
  const dots = [];
  const dmg = (Game.scenario.stats && Game.scenario.stats.damage || []).slice(0, DAMAGE_ROWS);
  for (const [i, back] of [[0, false], [1, true]]) {
    kid.rotation.y = back ? Math.PI : 0; kid.updateMatrixWorld(true);
    D.camera.position.set(0, cy, dist); D.camera.lookAt(0, cy, 0); D.camera.updateMatrixWorld(true);
    r.setViewport(i * half, 0, half, DAMAGE_H); r.setScissor(i * half, 0, half, DAMAGE_H);
    r.render(D.scene, D.camera);
    dmg.forEach((d, n) => {
      if (d.front === back) return;
      // the kid's right is −x and he faces +z; on the back view the group is turned round
      // on the leg or arm it hit, else near the middle (the hitbox is a cylinder, the kid is not)
      const sg = d.lat < 0 ? -1 : 1, ax = Math.abs(d.lat);
      const x = sg * (/leg/.test(d.part) ? 0.09 : /arm/.test(d.part) ? 0.27 : Math.min(ax, 0.15));
      const p = new THREE.Vector3(-x, box.min.y + d.h * tall, back ? -0.14 : 0.14).applyMatrix4(kid.matrixWorld).project(D.camera);
      dots.push({ n: n + 1, x: i * half + (p.x + 1) / 2 * half, y: (1 - p.y) / 2 * DAMAGE_H });
    });
  }
  r.setScissorTest(false);
  kid.rotation.y = 0;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(r.domElement, 0, 0, DAMAGE_W, DAMAGE_H);
  let html = `<text x="4" y="10" font-size="8" fill="#9a8f7c" letter-spacing="1">FRONT</text>` +
    `<text x="${half + 4}" y="10" font-size="8" fill="#9a8f7c" letter-spacing="1">BACK</text>` +
    `<line x1="${half}" y1="6" x2="${half}" y2="${DAMAGE_H - 14}" stroke="rgba(255,255,255,0.12)"/>`;
  for (const d of dots) html += `<g class="rs-dot" data-n="${d.n}"><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="6" fill="#e0503a" stroke="#fff" stroke-width="1"/>` +
    `<text x="${d.x.toFixed(1)}" y="${(d.y + 3).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">${d.n}</text></g>`;
  svg.innerHTML = html;
  Game.scenario.lastDamageDots = dots;
}
const MATCH_DOUBLE_SEC = 3, MATCH_LONG_TAG_M = 15;
function matchBestMoment(st, outcome) {
  const tags = st.tags;
  // two tags inside MATCH_DOUBLE_SEC: the quickest pair
  let dbl = null;
  for (let i = 1; i < tags.length; i++) {
    const dt = tags[i].t - tags[i - 1].t;
    if (dt <= MATCH_DOUBLE_SEC && tags[i].name !== tags[i - 1].name && (!dbl || dt < dbl.dt)) dbl = { a: tags[i - 1], b: tags[i], dt };
  }
  if (dbl) return `Two in ${dbl.dt.toFixed(1)} s: ${dbl.a.name}, then ${dbl.b.name}.`;
  const longest = tags.reduce((m, t) => (!m || t.dist > m.dist ? t : m), null);
  if (longest && longest.dist >= MATCH_LONG_TAG_M) return `A ${Math.round(longest.dist)} m tag on ${longest.name}.`;
  if (outcome === 'win' && st.hitOnYou === 0) return 'Not a mark on you.';
  if (longest) return `Your first tag: ${tags[0].name}, from ${Math.round(tags[0].dist)} m.`;
  return '';
}
function fmtMatchTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function scenariosOpenNow() {
  return new Set(Object.keys(SCENARIOS).filter(id => findScenarioListContext(id) && scenarioUnlockedForResult(id)));
}
function gunsInReach(cashBefore, cashAfter) {
  return ALL_GUN_TYPES.filter(gt => {
    const cfg = GUN_MAGS[gt];
    if (!cfg || !cfg.price || Game.persist.owned[cfg.ownFlag]) return false;
    return cfg.price > cashBefore && cfg.price <= cashAfter;
  }).map(gt => `${GUN_MAGS[gt].displayName} ($${GUN_MAGS[gt].price})`);
}
function renderMatchStats(outcome, openBefore, cashBefore, wonBefore) {
  const el = document.getElementById('resultStats');
  if (!el) return;
  const st = Game.scenario.stats || newMatchStats();
  const cell = (n, label) => `<div class="rs-cell"><div class="rs-num">${n}</div><div class="rs-label">${label}</div></div>`;
  const hitsLabel = st.tags.length === 1 ? 'tag' : 'tags';
  const shotsLabel = st.shots === 1 ? 'shot' : 'shots';
  let html = `<div class="rs-grid">${cell(st.tags.length, hitsLabel)}${cell(st.shots, shotsLabel)}` +
    `${cell(st.hitOnYou, st.hitOnYou === 1 ? 'hit on you' : 'hits on you')}${cell(fmtMatchTime(Game.scenario.roundTime || 0), 'time')}</div>`;
  const best = matchBestMoment(st, outcome);
  if (best) html += `<div class="rs-best"><span class="rs-tag">BEST</span> ${best}</div>`;
  const openNow = scenariosOpenNow();
  const opened = [...openNow].filter(id => !openBefore.has(id)).map(id => SCENARIOS[id].scenarioName || SCENARIOS[id].name || id);
  const reach = gunsInReach(cashBefore, Game.persist.cash);
  const rivalId = Game.scenario.active;   // v1.196: a match against Seth's crew says how it went and the summer's score
  const rival = isRivalMatch(rivalId) ? rivalResultLine(rivalId, outcome, outcome === 'win' && !wonBefore) : '';
  if (rival) html += `<div class="rs-new rs-rival"><span class="rs-tag">RIVALS</span> ${rival}</div>`;
  for (const name of opened) html += `<div class="rs-new"><span class="rs-tag">OPENED</span> ${name}</div>`;
  if (reach.length) html += `<div class="rs-new"><span class="rs-tag">IN REACH</span> at the shop: ${reach.join(', ')}</div>`;
  const dmgHtml = damageReportHtml(outcome);   // v1.238 (D.34)
  html += dmgHtml;
  el.innerHTML = html;
  if (dmgHtml) { try { drawDamageReport(); } catch (e) { console.warn('damage report', e); } }
  Game.scenario.lastResult = { tags: st.tags.length, shots: st.shots, hitOnYou: st.hitOnYou, hitBonus: Game.scenario.hitBonus || null,
    time: Game.scenario.roundTime || 0, best, opened, reach, rival, damage: dmgHtml ? (st.damage || []).slice() : [] };
}

function endScenario(outcome) {
  if (Game.forfeitAsk) closeForfeitAsk();   // v1.208
  if (Net.active) netEnded(outcome);   // v1.230 (D.2): your friend's game ends too
  if (Game.paused) closePauseMenu();   // v1.239
  Game.mode = 'result';
  stopMusic();   // v1.356 (D.69): the match loop stops, and the result card gets its sting
  if (outcome === 'win' || outcome === 'lose' || outcome === 'infected') playMusicSting(outcome === 'win' ? 'win' : 'lose');
  // v1.67/v1.72: silence any BB whistles still attached to in-flight BBs —
  // updateBBs stops running in result mode, so without this a mid-swell whistle
  // would drone (notably when the player's FINAL life is taken while a BB is
  // buzzing past). bbWhistleStop now stops the sound sources unconditionally, and
  // we reset the voice count so accounting stays clean even if a node leaked.
  if (Game.scenario && Game.scenario.bbs) {
    for (const bb of Game.scenario.bbs) { try { if (bb._whistle) bbWhistleStop(bb); } catch (e) {} }
  }
  _bbWhistleCount = 0;
  if (Tutorial.active) Tutorial.end();   // v1.57: tear down the coaching banner
  { const ip = document.getElementById('interactPrompt'); if (ip) ip.style.display = 'none'; }   // v1.142: the ladder prompt
  // v1.21: cancel any in-flight TTS so finished-scenario taunts don't bleed into the result screen.
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) {}
  document.getElementById('ammoHud').style.display = 'none';
  document.getElementById('healthHud').style.display = 'none';
  document.getElementById('stanceHud').style.display = 'none';
  document.getElementById('homeHud').style.display = 'none';   // v1.290
  document.getElementById('loadoutHud').style.display = 'none';
  document.getElementById('rosterHud').style.display = 'none';
  if (Game.squadWheel || Game.squadFlashT > 0) closeSquadWheel(false); document.getElementById('squadHud').style.display = 'none';   // v1.248
  document.getElementById('timerHud').style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';
  Game.hitMarkerT = 0; hitMarkerStep(0);   // v1.321 (D.60)
  Game.hurtFlashT = 0; hurtFlashStep(0);   // v1.322 (D.62)
  { const rd = document.getElementById('redDotReticle'); if (rd) rd.style.display = 'none'; }
  document.getElementById('adsVignette').style.opacity = '0';
  { const so = document.getElementById('scopeOverlay'); if (so) so.style.opacity = '0'; }
  // Hide combat progress bars so they can't leak into bedroom/result screens
  document.getElementById('cockBar').style.display = 'none';
  document.getElementById('jamBar').style.display = 'none';
  document.getElementById('useBar').style.display = 'none';
  if (fpGun) fpGun.visible = false;
  for (const key in fpGuns) {
    if (fpGuns[key]) fpGuns[key].visible = false;
  }
  if (fpLoader) fpLoader.visible = false;
  if (fpNoodle) fpNoodle.visible = false;   // v1.249
  if (fpMag) fpMag.visible = false;
  exitPointerLock();

  // Reset transient gun/equipment state so nothing carries over visually
  Game.gun.cockProgress = 0;
  Game.gun.cockReleasing = false;
  Game.gun.cockReleaseProgress = 0;
  Game.gun.cocked = true;
  Game.gun.jammed = false;
  Game.gun.jamProgress = 0;
  Game.gun._successFlashTime = 0;
  Game.gun._releaseWillCock = false;
  Game.gun._reachedFullPull = false;
  Game.held.using = false;
  Game.held.useProgress = 0;
  Game.held.useKind = null;
  Game.mouseLMB = false;
  Game.lmbConsumed = false;

  // Return remaining mag ammo to bag (you unload between matches)
  Game.persist.bag += Game.gun.ammo;
  Game.gun.ammo = 0;
  Game.persist.bag += Game.gun.tapedAmmo || 0;   // v1.169: and the taped twin mag's
  Game.gun.tapedAmmo = 0;
  returnSpareMagsToBag();   // v1.323 (B.14): and the spare mags'
  Game.gun.flipT = 0;
  // v1.50: also return any BBs still inside equipped speed loaders to the bag,
  // so nothing is lost between rounds and they refill cleanly next start.
  returnEquippedSpeedLoadersToBag();
  crewReturnLoans();   // v1.337: and what the crew didn't fire of yours
  if (Net.active) netRestoreBag();   // v1.230: online, your bag is as it was before the match
  // v1.257 (D.40): out of the range by the back door (or F): straight home, the BBs left in the gun back in the bag
  if (SCENARIOS[Game.scenario.active] && SCENARIOS[Game.scenario.active].range) {
    Game.scenario.range = null;
    updateRangeHud();
    enterBedroom();
    // v1.376 (D.74): home up the stairs, at their top facing into the landing
    const st = Scenes.bedroom.stairsSpawn;
    if (st) { Game.player.pos.copy(st); Game.player.yaw = Scenes.bedroom.stairsYaw; }
    saveGame();
    return;
  }

  // Cash reward — pull from SCENARIOS table (fallback for unregistered scenarios).
  // v1.28g: rewards dialed down 10x (rounded UP to the next whole dollar) — the
  // old payouts were too generous. scaledReward() is the single source of truth,
  // shared with the world-map preview so display & payout always agree.
  const scDef = SCENARIOS[Game.scenario.active];
  const reward = (scDef && scDef.rewards) || { win: 10, lose: 3 };
  const _openBefore = scenariosOpenNow(), _cashBefore = Game.persist.cash;   // v1.193: for "opened" and "in reach"
  const _wonBefore = !!Game.persist.completed[Game.scenario.active];   // v1.196: a first win over Seth's crew reads differently
  let cashEarned = 0;
  if (outcome === 'win') cashEarned = scaledReward(reward.win);
  else if (outcome === 'lose' || outcome === 'infected') cashEarned = scaledReward(reward.lose);
  const hitBonus = matchHitBonus(outcome), basePay = cashEarned;   // v1.320 (D.59)
  cashEarned += hitBonus.cash;
  Game.scenario.hitBonus = { hits: hitBonus.hits, cash: hitBonus.cash, base: basePay };
  Game.persist.cash += cashEarned;
  if (outcome === 'win' && !SCENARIOS[Game.scenario.active].pickup && !coopGuestMatch()) {   // v1.201: a pickup game is no step on the ladder (v1.381, D.73 1B: nor a friend's match: the pay is all a friend takes home)
    Game.persist.completed[Game.scenario.active] = true;
  }

  // Pull flavor lines from the primary enemy's character entry (first enemy in
  // the list). For multi-enemy scenarios we use slightly more aggregate wording.
  // v1.96: only the OTHER side's kids are named. Team maps put the player's allies in
  // the enemies list too, and naming them read as "…Sean, and Ryan, regroup".
  const _pTeam = (typeof combatantTeam === 'function') ? combatantTeam(Game.player) : 'player';
  const foes = (Game.scenario.enemies || []).filter(e => e.team !== 'player' && (e.team || 'enemy') !== _pTeam);
  const primary = foes[0] || (Game.scenario.enemies && Game.scenario.enemies[0]);
  const flavorBank = primary?.character?.flavor || {};
  const primaryName = primary?.name || 'They';
  const multi = foes.length > 1;
  const otherNames = multi ? foes.slice(1).map(e => e.name) : [];
  // v1.96: flavor lines are stored with their own quote marks; the templates add them.
  const unquote = str => String(str).replace(/^["\u201c](.*)["\u201d]$/s, '$1');
  // "Trey and Brooke" / "Sean, Nick, and Andrew" style oxford join
  function joinNames(list) {
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' and ' + list[1];
    return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
  }
  const othersStr = joinNames(otherNames);
  const allStr = joinNames(foes.length ? foes.map(e => e.name) : [primaryName]);   // v1.96: plural subject

  const card = document.getElementById('resultScreen');
  const outcomeEl = document.getElementById('outcomeText');
  const flavorEl = document.getElementById('flavorText');
  const rewardEl = document.getElementById('rewardText');
  // v1.9: detect timer-based win vs kill-em-all win for flavor variation
  const wonByTimer = outcome === 'win' && Game.scenario.winByTimer;
  const wasDefend = scDef?.scenarioType === 'defend';
  // v1.117 (Found in play, v1.101): the place words fit the map. A defend that isn't a fort says what was held
  // (scenario resultHold), and the woods have no road or curb (map defaults by builder).
  // v1.162 (Found in play, critic v1.160): the store is indoors, so its kids regroup in the stockroom, sit against the
  // shelves, and are called home by their phones rather than by screen doors.
  const _place = {
    buildHollowScene: { regroup: 'back in the trees', sit: 'sit down in the leaves' },
    buildGroceryStoreScene: { regroup: 'back in the stockroom', sit: 'slide down against the shelves', called: 'phones' },
  }[scDef?.builderFn] || {};
  const holdPlace = scDef?.resultHold || 'the fort';
  const regroupAt = scDef?.resultRegroup || _place.regroup || 'near the road';
  const sitDown = _place.sit || 'sit on the curb';
  // v1.170 (D.15): a VIP match is decided by one kid, so its lines name the VIP, not "the last one"
  const _vipTheirs = Game.scenario.vip ? (Game.scenario.enemies || []).find(e => e.vip && e.team !== 'player') : null;
  const _vipOurs = Game.scenario.vip ? (Game.scenario.enemies || []).find(e => e.vip && e.team === 'player') : null;
  const _ctf = Game.scenario.ctf;   // v1.189
  const _race = Game.scenario.race;   // v1.375: the derby's cart or the cart ride
  if (outcome === 'win' && _vipTheirs) {
    outcomeEl.textContent = 'YOU GOT THEM';
    outcomeEl.className = 'outcome win';
    flavorEl.textContent = `${_vipTheirs.name} pulls off the red cap. "Okay, okay — VIP's down." ${_vipOurs ? _vipOurs.name + ' made it through.' : 'That one counted.'}`;
  } else if (outcome === 'lose' && _vipOurs) {
    outcomeEl.textContent = `THEY GOT ${_vipOurs.name.toUpperCase()}`;
    outcomeEl.className = 'outcome lose';
    flavorEl.textContent = `${_vipOurs.name} takes one right on the blue cap. "Aw, man — I was the VIP!" ${allStr} regroup ${regroupAt}. "Run it back?"`;
  } else if (Game.scenario.pickupTimeUp && (outcome === 'win' || outcome === 'lose')) {
    // v1.204: the pickup clock ran out: more lives left wins; level is a draw, paid as a loss
    const o = Game.scenario.pickupTimeUp.ours, t = Game.scenario.pickupTimeUp.theirs;
    const ffaT = Game.scenario.ffa;
    if (o > t) {
      outcomeEl.textContent = `TIME — ${o} LIVES TO ${t}`;
      outcomeEl.className = 'outcome win';
      flavorEl.textContent = ffaT ? `Time. Nobody's got more left than you. ${primaryName} groans — "Fine. Next one's mine."`
        : `Time. ${primaryName} counts heads and groans — "${o} to ${t}? Fine. You had more."`;
    } else if (o < t) {
      outcomeEl.textContent = `TIME — THEY HAD ${t} TO ${o}`;
      outcomeEl.className = 'outcome lose';
      flavorEl.textContent = ffaT ? `Time. Somebody had more left than you. "Run it back?"`
        : `Time. They had more left. ${allStr} regroup ${regroupAt}. "Run it back?"`;
    } else {
      outcomeEl.textContent = `DRAW — ${o} LIVES EACH`;
      outcomeEl.className = 'outcome lose';
      flavorEl.textContent = `Time, and it's level. ${primaryName} shrugs. "A tie doesn't count. Run it back?"`;
    }
  } else if (_ctf && _ctf.timeUp) {
    // v1.191: the clock ran out: more flags wins; level is a draw, paid as a loss
    const o = _ctf.score.ours, t = _ctf.score.theirs;
    if (o > t) {
      outcomeEl.textContent = `FLAGS ${o}–${t}`;
      outcomeEl.className = 'outcome win';
      flavorEl.textContent = `Time. ${primaryName} checks his phone and groans — "${o}–${t}? Fine. You had more."`;
    } else if (o < t) {
      outcomeEl.textContent = `THEY WIN ${t}–${o}`;
      outcomeEl.className = 'outcome lose';
      flavorEl.textContent = `Time. They had more flags home. ${allStr} wave our blue flag at you from the top of the bulb. "Run it back?"`;
    } else {
      outcomeEl.textContent = `DRAW ${o}–${t}`;
      outcomeEl.className = 'outcome lose';
      flavorEl.textContent = `Time, and it's ${o}–${t}. ${primaryName} shrugs. "A tie doesn't count. Run it back?"`;
    }
  } else if (_ctf && outcome === 'win' && _ctf.score.ours >= _ctf.toWin) {
    // v1.189: capture the flag is decided by flags, so its lines give the score and who brought the last one home
    const last = _ctf.caps.filter(c => c.side === 'ours').pop();
    outcomeEl.textContent = `FLAGS ${_ctf.score.ours}–${_ctf.score.theirs}`;
    outcomeEl.className = 'outcome win';
    flavorEl.textContent = `${last && last.by !== 'you' ? last.by + ' plants' : 'You plant'} their red flag beside ours. ${primaryName} groans — "Two already? Okay, best of five next time."`;
  } else if (_ctf && outcome === 'lose' && _ctf.score.theirs >= _ctf.toWin) {
    outcomeEl.textContent = `THEY TOOK IT ${_ctf.score.theirs}–${_ctf.score.ours}`;
    outcomeEl.className = 'outcome lose';
    flavorEl.textContent = `Our blue flag ends up on their lawn for the second time. ${allStr} wave it at you from the top of the bulb. "Run it back?"`;
  } else if (_race && (outcome === 'win' || outcome === 'lose')) {
    // v1.375 (Found in play, critic v1.372): the derby and the cart ride are won at the finish, not by tagging everyone,
    // so their lines say how far you got and how many you tagged on the way, not "the last one's out"
    const _in = foes.filter(e => e.health > 0).length, _out = foes.length - _in;
    const _tags = _out === 0 ? 'You never tagged one of them' : _out === foes.length ? `You tagged all ${foes.length} of them on the way` : `You tagged ${_out} of the ${foes.length} on the way`;
    if (outcome === 'win') {
      outcomeEl.textContent = _race.ride ? 'TWO LAPS, YOU MADE IT' : 'YOU MADE IT DOWN';
      outcomeEl.className = 'outcome win';
      flavorEl.textContent = _race.ride
        ? `Eric pulls the cart back up to the barn. ${_tags}, and ${_in ? joinNames(foes.filter(e => e.health > 0).map(e => e.name)) + ' still ' + (_in > 1 ? 'pop' : 'pops') + ' up out of the bunkers and the trees, waving' : 'nobody was left to wave you in'}. "Same time tomorrow?"`
        : `The cart rolls to a stop in the bulb. ${_tags}. ${primaryName} jogs down the hill: "No way. My turn in that thing."`;
    } else {
      const _left = Math.max(0, Math.round(_race.finishS - _race.s));   // metres, for the derby
      outcomeEl.textContent = "YOU'RE OUT";
      outcomeEl.className = 'outcome lose';
      flavorEl.textContent = _race.ride
        ? `Eric stops the cart ${_race.s - _race.startS < _race.len ? 'before the first lap is done' : 'on the second lap'}. ${_tags}. ${allStr} climb out of the bunkers grinning. "Run it back?"`
        : `You climb out of the cart with ${_left} m still to go. ${_tags}. ${allStr} come down off the lawns laughing. "Run it back?"`;
    }
  } else if (outcome === 'win') {
    if (wonByTimer) {
      // Survive-timer win: the attackers' moms called them in
      outcomeEl.textContent = 'MOM CALLED THEM IN!';
      outcomeEl.className = 'outcome win';
      flavorEl.textContent = _place.called === 'phones'
        ? (multi
          ? `Their phones buzz all at once. ${primaryName} groans — "Aw, COME ON!" — and ${othersStr} ${otherNames.length > 1 ? 'head' : 'heads'} for the doors. You held the line.`
          : `${primaryName}'s phone buzzes. A groan — "Aw, COME ON!" — and they head for the doors. You held the line.`)
        : multi
        ? `Distant screen doors slam. ${primaryName} groans — "Aw, COME ON!" — and ${othersStr} ${otherNames.length > 1 ? 'start' : 'starts'} trudging home. You held the line.`
        : `A distant screen door slams. ${primaryName} groans — "Aw, COME ON!" — and trudges home. You held the line.`;
    } else if (wasDefend) {
      // Defender kill-all win: you held the position
      outcomeEl.textContent = 'YOU HELD IT';
      outcomeEl.className = 'outcome win';
      flavorEl.textContent = multi
        ? `Last one's out. ${allStr} ${sitDown}, defeated. "Yeah okay, we couldn't crack it."`
        : `${primaryName}'s out. They ${sitDown}, defeated. "Yeah okay, that was a good fort."`;
    } else {
      outcomeEl.textContent = 'YOU GOT THEM';
      outcomeEl.className = 'outcome win';
      if (multi) {
        flavorEl.textContent = `The last one's out. ${allStr} come walking out from behind cover. "Alright, alright — that was nuts."`;
      } else {
        flavorEl.textContent = flavorBank.hit
          ? `${primaryName} flinches. "${unquote(flavorBank.hit)}" — they're out.`
          : `${primaryName} flinches and yells "AH, OKAY OKAY, you got me!" — they're out.`;
      }
    }
  } else if (outcome === 'forfeit') {
    outcomeEl.textContent = 'FORFEITED';
    outcomeEl.className = 'outcome lose';
    flavorEl.textContent = multi
      ? `You called it. "I'm out — I gotta go." ${allStr} drop their guns, half-disappointed.`
      : `You called it. "I'm out — gotta go get more BBs." ${primaryName} shrugs from behind cover.`;
  } else if (outcome === 'infected') {
    // v1.25 zombie mode loss — you got tagged.
    outcomeEl.textContent = 'TAGGED!';
    outcomeEl.className = 'outcome lose';
    flavorEl.textContent = `A hand slaps your shoulder — "TAG! You're IT!" The whole pack erupts. You didn't make it.`;
  } else {
    outcomeEl.textContent = "YOU'RE OUT";
    outcomeEl.className = 'outcome lose';
    if (wasDefend) {
      // Lost a defend — they overran your position
      flavorEl.textContent = multi
        ? `They got through. ${allStr} take ${holdPlace}. "Our turn, dude."`
        : `They got through. ${primaryName} takes ${holdPlace}. "Our turn, dude."`;
    } else if (Game.scenario.ffa) {
      // v1.246 (Found in play, critic 15 Oct): nobody regroups with anybody in a free-for-all; name who got you
      const _dmg = (Game.scenario.stats && Game.scenario.stats.damage) || [];
      const _by = _dmg.length && _dmg[_dmg.length - 1].by;
      // v1.394 (Found in play, critic 30 Oct): with one kid left he has just won; crown him, not "the rest"
      const _left = (Game.scenario.enemies || []).filter(e => e.team !== 'player' && npcInFight(e));
      const _win = _left.length === 1 ? (_left[0].name || 'a kid') : null;
      flavorEl.textContent = !_win
        ? `Too many angles, not enough cover. ${_by || 'Somebody'} gets the last one on you, and the rest keep going at each other. "Every kid for himself, dude."`
        : _win === _by
          ? `Too many angles, not enough cover. ${_by} gets the last one on you, and that's the round: ${_win} is the last kid standing. "Every kid for himself, dude."`
          : `Too many angles, not enough cover. ${_by || 'Somebody'} gets the last one on you, and ${_win} is the last kid standing. "Every kid for himself, dude."`;
    } else if (multi) {
      flavorEl.textContent = `Too many angles, not enough cover. ${allStr} regroup ${regroupAt}. "Run it back?"`;
    } else {
      flavorEl.textContent = flavorBank.win
        ? flavorBank.win
        : `You took too many hits. ${primaryName} grins from behind cover. "Wanna run it back?"`;
    }
  }
  if (rewardEl) {
    if (cashEarned > 0) {
      // v1.320 (D.59): the hit bonus says what it paid for
      const hb = hitBonus.cash > 0 ? ` <span class="reward-bonus">$${basePay} + $${hitBonus.cash} hit bonus (${hitBonus.hits} hits)</span>` : '';
      rewardEl.innerHTML = `<span class="reward-label">EARNED${hb}</span> <span class="reward-amount">+$${cashEarned}</span>`;
    } else {
      rewardEl.innerHTML = `<span class="reward-label">NO REWARD</span> <span class="reward-amount">$0</span>`;
    }
  }

  renderMatchStats(outcome, _openBefore, _cashBefore, _wonBefore);   // v1.193; v1.196 the rival line
  Game.scenario.teammateAnswers = [];
  renderTeammateCard(scDef && !scDef.online && !coopGuestMatch() ? teammateAsksFor(Game.scenario.active, outcome, _wonBefore) : [], null);   // v1.297 (D.53)
  { const w = document.getElementById('resultWallet'); if (w) w.innerHTML = walletHTML(); }   // v1.260 (D.43)

  // v1.39: reload note + nav buttons (Previous / Play Again / Next).
  const reloadNote = document.getElementById('reloadNote');
  if (reloadNote) {
    reloadNote.textContent = 'Heads up: starting a match reloads your magazine(s) with BBs from your bag — make sure you\'ve got enough in reserve.';
  }
  const ctx = findScenarioListContext(Game._lastScenarioId);
  const prevBtn = document.getElementById('navPrevBtn');
  const nextBtn = document.getElementById('navNextBtn');
  const againBtn = document.getElementById('navAgainBtn');
  if (againBtn) againBtn.disabled = !Game._lastScenarioId;
  if (prevBtn && nextBtn) {
    if (ctx) {
      const prevId = ctx.idx > 0 ? ctx.ids[ctx.idx - 1] : null;
      const rawNextId = ctx.idx < ctx.ids.length - 1 ? ctx.ids[ctx.idx + 1] : null;
      // v1.48: Next is only offered if the next scenario is actually unlocked.
      // Winning the current scenario marks it completed before this renders,
      // so a win unlocks Next; a loss leaves it locked (you must win first).
      const nextId = (rawNextId && isScenarioUnlocked(rawNextId)) ? rawNextId : null;
      prevBtn.disabled = !prevId;
      nextBtn.disabled = !nextId;
      prevBtn.title = prevId ? (SCENARIOS[prevId]?.scenarioName || '') : 'First scenario in this area';
      nextBtn.title = nextId ? (SCENARIOS[nextId]?.scenarioName || '')
                    : (rawNextId ? 'Win this one first to unlock the next' : 'Last scenario in this area');
      // Stash the resolved ids so the click handlers don't recompute (and
      // can't navigate to a locked scenario).
      nextBtn.dataset.go = nextId || '';
      prevBtn.dataset.go = prevId || '';
    } else {
      // Scenario isn't part of a pin group (legacy single pin) — hide prev/next.
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      nextBtn.dataset.go = '';
      prevBtn.dataset.go = '';
    }
  }

  if (scDef && scDef.online) netResultCard(outcome);   // v1.230 (D.2)
  if (coopGuestMatch()) coopResultCard();   // v1.381 (D.73): at a friend's, the next match is his call
  card.classList.add('active');
  autoSave();   // v1.218 (D.29): the match's pay, unlocks and stats are saved as the result shows, not only back home
}
