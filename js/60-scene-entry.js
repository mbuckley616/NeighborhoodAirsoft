
// ---------------------------------------------------------------------
// SCENE TRANSITIONS
// ---------------------------------------------------------------------
// v1.377 (Found in play, the per-entry leak): a scene left behind kept its geometries, materials and textures on the
// GPU, since three.js frees them only on dispose(). Eight entries of the night Hollow took the renderer from 1,478
// geometries to 11,445, which is what crashed the long stuck sweeps. When Game.scene moves on, whatever the old scene
// holds that the new one (or the camera, with your gun on it) doesn't is disposed. A shared piece that is disposed
// and later drawn again is simply uploaded again, so disposing is never wrong, only sometimes wasted.
function sceneGPUResources(root, out, skip) {
  const addTex = t => { if (t && t.isTexture) out.add(t); };
  const visit = o => {
    if (o === skip) return;
    if (o.geometry) out.add(o.geometry);
    if (o.isLight && o.shadow && o.shadow.map) out.add(o.shadow.map);   // the sun's shadow map is a render target of its own
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      out.add(m);
      for (const k in m) addTex(m[k]);
      if (m.uniforms) for (const k in m.uniforms) addTex(m.uniforms[k] && m.uniforms[k].value);
    }
    for (const c of o.children) visit(c);
  };
  if (root) { addTex(root.background); addTex(root.environment); visit(root); }
  return out;
}
function retireScene(oldScene, newScene) {
  if (!oldScene || oldScene === newScene) return;
  const keep = sceneGPUResources(Game.camera, sceneGPUResources(newScene, new Set()));
  for (const r of sceneGPUResources(oldScene, new Set(), Game.camera)) if (!keep.has(r) && r.dispose) r.dispose();
}
function enterBedroom() {
  Game.mode = 'bedroom';
  Game.interactables = [];
  Scenes.bedroom = buildBedroomScene();
  retireScene(Game.scene, Scenes.bedroom.scene);   // v1.377
  Game.scene = Scenes.bedroom.scene;
  if (Game.camera.far !== 200) { Game.camera.far = 200; Game.camera.updateProjectionMatrix(); }   // v1.303 (D.51)
  Game.scenario.groundY = null;   // v1.8: bedroom is flat

  // Reset player at bedroom spawn
  Game.player.pos.copy(Scenes.bedroom.spawn);
  Game.player.vel.set(0, 0, 0);
  Game.player.yaw = Scenes.bedroom.spawnYaw;
  Game.player.pitch = 0;
  Game.player.hitsTaken = 0;
  Game.player.bounds = Scenes.bedroom.bounds;
  Game.player.obstacles = Scenes.bedroom.obstacles;
  // v1.294 (backlog B.12, Michael 21 Oct): aim held as a match ends no longer comes home. The right button's let-go
  // only counted in a match, so the room kept the aimed view (and field of view) until the next one.
  Game.player.ads = 0;
  Game.player.adsTarget = 0;
  Game.camera.fov = Settings.fov;
  Game.camera.updateProjectionMatrix();

  // Hide combat HUD
  document.getElementById('ammoHud').style.display = 'none';
  document.getElementById('healthHud').style.display = 'none';
  document.getElementById('stanceHud').style.display = 'none';
  document.getElementById('homeHud').style.display = 'none';   // v1.290
  document.getElementById('loadoutHud').style.display = 'none';
  document.getElementById('rosterHud').style.display = 'none';
  if (Game.squadWheel || Game.squadFlashT > 0) closeSquadWheel(false); document.getElementById('squadHud').style.display = 'none';   // v1.248
  document.getElementById('timerHud').style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';
  { const rd = document.getElementById('redDotReticle'); if (rd) rd.style.display = 'none'; }
  document.getElementById('adsVignette').style.opacity = '0';
  { const so = document.getElementById('scopeOverlay'); if (so) so.style.opacity = '0'; }
  document.getElementById('cockBar').style.display = 'none';
  document.getElementById('jamBar').style.display = 'none';
  document.getElementById('useBar').style.display = 'none';
  document.getElementById('bedroomHud').style.display = 'block';
  updateBedroomHud();
  // v1.28j: clear scenario-only overlays that don't belong in the bedroom.
  // The eyewear frame (goggles/mask) update only runs in the scenario branch, so
  // without this it lingered on-screen after returning home. Calling it here lets
  // its own (mode !== 'scenario') guard clear the SVG + canvas filter.
  updateEyewearOverlay();
  { const ip = document.getElementById('interactPrompt'); if (ip) ip.style.display = 'none'; }
  buildBedroomLabels();   // v1.62 — floating wayfinding labels for each interactable
  for (const key in fpGuns) {
    if (fpGuns[key]) fpGuns[key].visible = false;
  }
  if (fpLoader) fpLoader.visible = false;
  if (fpNoodle) fpNoodle.visible = false;   // v1.249
  if (fpMag) fpMag.visible = false;

  // Add camera into scene
  Game.scene.add(Game.camera);

  hideAllMenus();
  showPauseHint();
  // v1.37: auto-save on returning home (after a scenario, cash/BBs are settled).
  // No-op until the player has opted into persistence (loaded a save or slept).
  autoSave();
  // Start bedroom music (only takes effect after the audio context is unlocked,
  // which happens on the player's first click — startMusic guards against missing ctx)
  startMusic('bedroom');
}

// v1.23: nudge a spawn position out of any obstacle it overlaps (cars, boxes,
// bins, fences, houses). Fixes kids spawning stuck on top of cover and never
// moving (e.g. the Bunratty 3v1 stuck-enemy report). Pushes along the shortest
// exit axis, then re-checks; bails after a few iterations and returns the best
// effort. Operates on the builder's obstacle list directly (Game.player.obstacles
// isn't wired up yet during enterScenario).
// v1.277: the nearest spot to (x, z) at least CREW_START_GAP from every start already taken, inside the field and clear
// of cover (rings 0.75 m apart out to 6 m, twelve points on each); the spot itself when nothing nearer is free.
// 1.4 m is the ally fan's own step (v1.33), so the fan is left as it was and only a real stack moves.
const CREW_START_GAP = 1.4;
// v1.315: `gap` for the attack huddle's own ring (CREW_HUDDLE_GAP)
const CREW_HUDDLE_GAP = 0.75;
function crewSpreadStart(x, z, taken, bounds, obstacles, gap = CREW_START_GAP) {
  const free = (qx, qz) => taken.every(t => Math.hypot(t.x - qx, t.z - qz) >= gap);
  if (free(x, z)) return { x, z };
  const m = 0.8;
  const step = Math.min(0.75, gap);
  for (let r = step; r <= 6.01; r += step) for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r;
    if (bounds && (qx < bounds.minX + m || qx > bounds.maxX - m || qz < bounds.minZ + m || qz > bounds.maxZ - m)) continue;
    const c = findClearSpawn(qx, qz, obstacles, 0.4);
    if (Math.abs(c.x - qx) > 0.01 || Math.abs(c.z - qz) > 0.01 || !free(qx, qz)) continue;
    return { x: qx, z: qz };
  }
  return { x, z };
}
function findClearSpawn(x, z, obstacles, radius = 0.4, footY = null) {
  if (!obstacles || obstacles.length === 0) return { x, z };
  // v1.26: use a roomier effective radius than the kid's collision radius so a
  // spawned enemy ends up with breathing room around cover, not flush against
  // it (flush spawns read as "stuck in the bins" and make the first step fight
  // the AABB). The extra margin is dropped back to the true radius only if we
  // can't find clear space after the iterations.
  const margin = radius + 0.35;
  let px = x, pz = z;
  // v1.267: the first obstacle a spot is in (null when clear)
  const hitAt = (qx, qz) => {
    for (const o of obstacles) {
      // v1.138: a spawn up in the treehouse (footY) ignores what is under its feet or over its head
      if (footY != null && ((o.baseY ?? 0) + (o.h ?? 5) <= footY + 0.05 || (o.baseY ?? 0) >= footY + 1.5)) continue;
      if (qx + margin > o.minX && qx - margin < o.maxX &&
          qz + margin > o.minZ && qz - margin < o.maxZ) return o;
    }
    return null;
  };
  for (let iter = 0; iter < 16; iter++) {
    const hit = hitAt(px, pz);
    if (!hit) return { x: px, z: pz };
    // Compute penetration depth on each axis and exit along the smaller one.
    const pushE = (hit.maxX + margin) - px;   // distance to clear east
    const pushW = px - (hit.minX - margin);   // distance to clear west
    const pushN = pz - (hit.minZ - margin);   // distance to clear north (-Z)
    const pushS = (hit.maxZ + margin) - pz;   // distance to clear south (+Z)
    // v1.267: the shortest of the four exits that lands clear of everything, when one does. Taking the shorter axis
    // alone bounced a kid between a Hollow pallet and the tree 0.8 m behind it for all 16 tries, and he spawned in
    // the pallet and stood there all round (Infection in the Dark: Seth and Brooke, once the forest stopped moving).
    const exits = [[pushE + 0.02, 0, pushE], [-(pushW + 0.02), 0, pushW], [0, -(pushN + 0.02), pushN], [0, pushS + 0.02, pushS]]
      .sort((a, b) => a[2] - b[2]);
    const out = exits.find(([dx, dz]) => !hitAt(px + dx, pz + dz));
    if (out) return { x: px + out[0], z: pz + out[1] };
    const minX = Math.min(pushE, pushW);
    const minZ = Math.min(pushN, pushS);
    if (minX < minZ) {
      px += (pushE < pushW) ? pushE + 0.02 : -(pushW + 0.02);
    } else {
      pz += (pushS < pushN) ? pushS + 0.02 : -(pushN + 0.02);
    }
  }
  return { x: px, z: pz };
}

// v1.34: purely cosmetic team-base marker. Lays a flat translucent colored disc
// + a brighter ring border on the ground (sits just above terrain so it reads as
// painted-on), and plants a little flag (pole + triangular pennant) at the
// center to flag the base from a distance. No obstacle entry, no collision —
// BBs and bodies pass straight through. Returns the THREE.Group (added to scene)
// so the caller can keep a handle if needed.
// v1.365 (Found in play, critic v1.353): where your own base's pole stands. A base centred on or just ahead of your
// start put the 2.4 m pole in your face as the match opened (7 team matches, 0.12-1.5 m from your eye, through the
// crosshair). A pole within 3.5 m of your start moves 2 m behind you, pulled in to 0.6 m inside the ring if that is
// past it, so it still marks the base. Otherwise it stays at the centre.
function basePoleClearOfStart(base, start, yaw, radius = 4.2) {
  if (!base || !start || typeof yaw !== 'number') return null;
  if (Math.hypot(base.x - start.x, base.z - start.z) >= 3.5) return null;
  let px = start.x + Math.sin(yaw) * 2, pz = start.z + Math.cos(yaw) * 2;
  const d = Math.hypot(px - base.x, pz - base.z), r = radius - 0.6;
  if (d > r) { px = base.x + (px - base.x) * r / d; pz = base.z + (pz - base.z) * r / d; }
  return { x: px, z: pz };
}

function addBaseMarker(scene, x, z, color, groundYFn, opts = {}) {
  const radius = opts.radius ?? 4.2;
  const gy = (typeof groundYFn === 'function') ? groundYFn(x, z) : 0;
  const group = new THREE.Group();
  group.position.set(x, gy, z);

  // Flat filled disc — translucent team color.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.16,
      depthWrite: false, side: THREE.DoubleSide,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;                 // hover a hair above ground (no z-fight)
  group.add(disc);

  // Brighter ring border (annulus) so the boundary reads crisply.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.28, radius, 48),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55,
      depthWrite: false, side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  // Center flag — thin pole + triangular pennant in the team color.
  const poleH = 2.4;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, poleH, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, metalness: 0.3 })
  );
  pole.position.y = poleH / 2;
  pole.castShadow = true;
  // v1.365: the pole and pennant stand at `opts.poleAt` (world x/z, inside the disc) when given, so they need not be
  // planted in front of your eyes at your start (Night Swim's was 0.12 m from them)
  const flagRig = new THREE.Group();
  if (opts.poleAt) flagRig.position.set(opts.poleAt.x - x, 0, opts.poleAt.z - z);
  group.add(flagRig);
  flagRig.add(pole);

  // Pennant: a flat triangle hanging off the top of the pole (double-sided).
  const flagGeo = new THREE.BufferGeometry();
  const fh = 0.55, fl = 0.95, top = poleH - 0.1;
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, top, 0,
    fl, top - fh / 2, 0,
    0, top - fh, 0,
  ], 3));
  flagGeo.computeVertexNormals();
  const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
    })
  );
  flagRig.add(flag);
  group.userData.baseMarker = { color, pole: flagRig };

  scene.add(group);
  return group;
}
