
// ---------------------------------------------------------------------
// BEDROOM SCENE
// ---------------------------------------------------------------------
// v1.258 (backlog D.41): the map table's paper is the map screen's own map. The SVG is drawn to a canvas through an
// <img> (it is all inline attributes, so it renders the same outside the page's CSS), then the zone pins on top from
// their places on the map screen. Asynchronous: the paper is plain until the image loads (a frame or two).
// `Game._mapTablePaint` counts the paints (for the tests).
const MAP_TABLE_PX = 2;   // canvas pixels per SVG unit
function paintMapTablePaper(paper) {
  const svg = document.querySelector('#mapArea svg');
  if (!svg) return;
  const W = 700 * MAP_TABLE_PX, H = 560 * MAP_TABLE_PX;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv);
  const src = new XMLSerializer().serializeToString(svg).replace('<svg ', `<svg width="${W}" height="${H}" `);
  const img = new Image();
  img.onload = () => {
    const c = cv.getContext('2d');
    c.drawImage(img, 0, 0, W, H);
    for (const pin of document.querySelectorAll('#worldMap .pin')) {
      const key = pin.dataset.scenario, x = parseFloat(pin.style.left) / 100 * W, y = parseFloat(pin.style.top) / 100 * H;
      if (!isFinite(x) || !isFinite(y)) continue;
      const open = key !== 'locked' && PIN_SCENARIO_GROUPS[key] && isZoneUnlocked(key);
      const r = 11 * MAP_TABLE_PX;   // the map screen's teardrop marker, point down on the place
      const cy = y - r * 1.41, a = Math.PI / 4;   // a round head, its two tangents meeting at the point
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * Math.cos(a), cy + r * Math.sin(a));
      c.arc(x, cy, r, Math.PI - a, a, false); c.closePath();
      c.fillStyle = open ? '#c94a3a' : '#8a8a8a'; c.fill(); c.lineWidth = 2 * MAP_TABLE_PX; c.strokeStyle = '#2a2520'; c.stroke();
      const label = (pin.querySelector('.label')?.textContent || '').split(' · ')[0];
      c.font = `bold ${10 * MAP_TABLE_PX}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top';
      const tw = c.measureText(label).width;
      c.fillStyle = 'rgba(244,233,216,0.92)'; c.fillRect(x - tw / 2 - 4 * MAP_TABLE_PX, y + 3 * MAP_TABLE_PX, tw + 8 * MAP_TABLE_PX, 14 * MAP_TABLE_PX);
      c.fillStyle = open ? '#2a2520' : '#6a6460'; c.fillText(label, x, y + 5 * MAP_TABLE_PX);
    }
    tex.needsUpdate = true;
    paper.material.map = tex; paper.material.color.set(0xffffff); paper.material.needsUpdate = true;
    Game._mapTablePaint = (Game._mapTablePaint || 0) + 1;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
}
// v1.376 (D.74): a crew kid sitting on the landing's futon or a desk chair. His hips at the seat (`seatY` in metres),
// his legs angled down from the hip to the floor in front, his hands in his lap. Starts from setKidCrouch's rest pose.
function poseKidSeated(kid, seatY) {
  const po = kid.pose;
  if (!po) return;
  setKidCrouch(kid, 0);
  const b = po.base, LEG = 0.55, hip = Math.min(LEG - 0.02, seatY / (kid.scaleY || 1));
  const drop = LEG - hip, th = Math.acos(Math.min(1, hip / LEG)) + 0.25;   // a little past the floor's angle: feet forward, knees up
  for (const [leg, shoe, x] of [[po.legL, po.shoeL, b.legL_x], [po.legR, po.shoeR, b.legR_x]]) {
    leg.rotation.x = -th;
    leg.position.set(x, hip - (LEG / 2) * Math.cos(th), (LEG / 2) * Math.sin(th));
    shoe.position.set(x, b.shoe_y, LEG * Math.sin(th) + 0.02);
  }
  po.torso.position.y = b.torso_y - drop;
  po.torso.rotation.x = -0.06;
  po.rigR.shoulder.position.set(b.shoulderR_x, b.shoulder_y - drop, 0);
  po.rigL.shoulder.position.set(b.shoulderL_x, b.shoulder_y - drop, 0);
  for (const rig of [po.rigR, po.rigL]) { rig.shoulder.rotation.x = -0.45; rig.elbow.rotation.x = -0.9; }
  po.neck.position.y = b.neck_y - drop;
  po.head.position.y = b.head_y - drop;
  if (po.hair) po.hair.position.y = b.hair_y - drop;
  if (po.headExtras) for (const ex of po.headExtras) ex.mesh.position.y = ex.baseY - drop;
}
// v1.376 (D.74, Michael: A): what each crew kid says when you walk up to him on the landing and press E, a line a press
const CREW_HOME_LINES = {
  eric:  ['“Again? I’m ready when you are.”', '“I’ve been reading the map. Seth’s crew always comes up the same side.”', '“Your TV’s tiny, man.”'],
  sean:  ['“I’ve been working on my aim. Don’t laugh.”', '“The AK’s loud, but nobody argues with it.”', '“Is there any more of that pizza?”'],
  nick:  ['“You gotta keep moving, dude. That’s the whole secret.”', '“I’d sit in a bush all day with the AR if you let me.”', '“This futon is way comfier than it looks.”'],
  alex:  ['“Andrew says hey. He still thinks you got lucky.”', '“Two lives each next time? I’m just saying.”', '“Whose turn is it on the computer?”'],
  diego: ['“Tch. Fernando wants a rematch. Let him wait.”', '“The MP5 eats BBs. Worth it.”', '“Don’t tell anyone I fell asleep on your futon.”'],
};
function crewHomeTalk(it) {
  const lines = CREW_HOME_LINES[it.crewId] || ['“Hey.”'];
  it.line = (it.line + 1) % lines.length;
  const name = (CHARACTERS[it.crewId] || {}).name || '';
  it.prompt = `${name}: ${lines[it.line]}`;
  if (typeof kidSayLine === 'function') kidSayLine({ pos: it.pos, charId: it.crewId }, lines[it.line].replace(/[“”]/g, ''));
}
function buildBedroomScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bbfe0);   // soft daylight sky as backdrop
  scene.fog = new THREE.Fog(0xe8d4b8, 14, 24);

  // ============================================================
  // LAYOUT CONSTANTS
  // ============================================================
  // World origin = center of bedroom main floor (not counting alcove).
  // +X = east, -X = west, +Z = south (toward player spawn), -Z = north (toward window).
  const BR_W = 6.0;            // bedroom width (E-W)
  const BR_D = 5.0;            // bedroom depth (N-S)
  const BR_H = 2.6;            // ceiling height (v1.378: the height of the east and west walls, where the vault starts)
  // v1.378 (D.74 step 2, docs/refs/landing.md, shape only): Michael's room has a vaulted ceiling, rising from the short
  // east and west walls to a ridge running north-south (real 2.4 m walls, a 3.8 m ridge), gabled on the north and south
  // walls; the dormer keeps its own lower flat ceiling, high enough for the arched window's half-round fanlight.
  const BR_RIDGE = 3.9;        // the ridge over the room's middle (x = 0)
  const AL_H = 2.95;           // the dormer's flat ceiling, under the vault where it meets the north wall
  // Alcove: indented on the north wall, juts further north
  const AL_W = 2.4;            // alcove opening width (E-W along north wall)
  const AL_DEPTH = 1.0;        // alcove juts north by this much
  const AL_X = -0.6;           // alcove centered slightly west of midline
  // Hallway: extends south from the bedroom's south wall, centered
  const HALL_W = 1.6;
  const HALL_D = 2.4;
  const HALL_X = 0.0;
  // Bathroom (west side of hall)
  const BATH_W = 2.0;
  const BATH_D = 1.8;
  // Hall closet (east side of hall) — wider for bifold doors
  const HCL_W = 1.0;           // depth east of hall wall (into the wall)
  const HCL_D = 1.8;           // length N-S (bifold opening is along this axis)
  // Big closet — NEW LOCATION: in the SE corner of the bedroom,
  // accessed via doorway in the SOUTH wall. Extends south.
  // Its west wall touches the hall closet's east wall (shared wall).
  // Its east wall is further east than the bedroom's east wall.
  const BCL_WEST = HALL_W/2 + HCL_W;       // = 1.8, shared with hall closet east wall
  const BCL_EAST = BR_W/2 + 1.0;           // = 4.0, sticks out east beyond bedroom
  const BCL_W = BCL_EAST - BCL_WEST;       // = 2.2 wide
  const BCL_D = 1.8;                        // N-S depth
  const BCL_DOORWAY_W = 1.0;                // opening in bedroom's south wall
  const BCL_X = (BCL_WEST + BCL_EAST) / 2;  // = 2.9
  // Doorway in south wall — keep it within the bedroom's east wall span (BR_W/2 = 3)
  // Center the doorway roughly within the bedroom-side portion of the closet.
  // South-wall stretch east of the hallway is x ∈ [HALL_W/2, BR_W/2] = [0.8, 3.0]
  // Place doorway centered in that east half so it's clearly inside the bedroom.
  const BCL_DOORWAY_X = (HALL_W/2 + BR_W/2) / 2 + 0.3;   // ≈ 2.2, gives a sensible bedroom-side approach
  // v1.376 (D.74, docs/refs/landing.md): the upstairs landing south of the hall, the hallway west to Sean's room and the
  // top of the stairs. The guide's real sizes are an adult's; the player and the crew are kids (1.5 m), and at real size
  // the landing read undersized and the hallway cramped (Michael, 28 Oct). So the rooms are drawn about 1.35 times the
  // real ones, as the bedroom and its hall already are, and the furniture keeps its real size.
  const LAND = {
    x0: -3.3, x1: 3.3, z0: BR_D/2 + HALL_D, z1: 11.2, h: 2.9,      // the landing: 6.6 x 6.3 m (real 4.8 x 4.7), a 2.9 m ceiling
    recessX0: -2.1, recessX1: 1.8, recessZ: 12.0,                   // the desk recess in the south wall, 3.9 x 0.8 m
    stairX0: 1.9, stairX1: 3.3,                                     // the stairwell going south from the south wall line, 1.4 m wide
    hallZ0: 7.4, hallZ1: 9.1, hallX0: -9.5, hallH: 2.8,             // the hallway to Sean's room, 1.7 x 6.2 m (real 1.1 x 4.5)
    winZ: 8.25, winW: 2.1, winSill: 0.8, winH: 1.5,                 // the pair of windows in the east wall, in line with the hallway
  };

  // ============================================================
  // MATERIALS
  // ============================================================
  const wallCream = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.95 });
  const wallRed   = new THREE.MeshStandardMaterial({ color: 0x6b1818, roughness: 0.9 });
  const ceilMat   = new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 1.0 });
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0xb89472, roughness: 0.85 });   // light wood
  const trimMat   = new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.7 });
  const doorMat   = new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.55 });
  const panelMat  = new THREE.MeshStandardMaterial({ color: 0xd5cebb, roughness: 0.7 });   // door panel insets
  const goldMat   = new THREE.MeshStandardMaterial({ color: 0xd4a64a, roughness: 0.35, metalness: 0.7 });
  const woodDark  = new THREE.MeshStandardMaterial({ color: 0x3a2515, roughness: 0.75 });
  const woodMed   = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.78 });
  const bookcaseMat = new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 0.7 });
  // Bedroom furniture (bed frame, nightstands) — black
  const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
  // Comforter (single solid grey)
  const beddingMat = new THREE.MeshStandardMaterial({ color: 0x7a8694, roughness: 0.95 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.95 });
  const pillowAccent = new THREE.MeshStandardMaterial({ color: 0xa63232, roughness: 0.85 });

  // ============================================================
  // LIGHTING — bright daytime feel via window
  // ============================================================
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.55);
  scene.add(ambient);

  // Warm sunlight angled in through the window (in the alcove, north side)
  const sunlight = new THREE.DirectionalLight(0xfff0d0, 0.95);
  sunlight.position.set(-1.5, 5, -8);
  sunlight.target.position.set(AL_X, 0.5, 0);
  scene.add(sunlight);
  scene.add(sunlight.target);

  // Soft fill from south (counter-light)
  const fill = new THREE.DirectionalLight(0xc8d8e8, 0.18);
  fill.position.set(0, 4, 6);
  scene.add(fill);

  // Floor-lamp warm point (NW corner)
  const lampLight = new THREE.PointLight(0xffc080, 0.6, 4.5, 1.6);
  lampLight.position.set(BR_W/2 - 0.55, 1.65, -BR_D/2 + 0.55);
  scene.add(lampLight);

  // ============================================================
  // FLOORS (bedroom + alcove + hallway + bathroom + hall closet + big closet)
  // ============================================================
  function addFloor(cx, cz, w, d) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(cx, 0, cz);
    f.receiveShadow = true;
    scene.add(f);
  }
  addFloor(0, 0, BR_W, BR_D);                                        // main bedroom
  addFloor(AL_X, -BR_D/2 - AL_DEPTH/2, AL_W, AL_DEPTH);              // alcove floor
  addFloor(HALL_X, BR_D/2 + HALL_D/2, HALL_W, HALL_D);               // hallway floor
  addFloor(HALL_X - HALL_W/2 - BATH_W/2, BR_D/2 + HALL_D/2, BATH_W, BATH_D);          // bathroom (decorative, blocked)
  addFloor(HALL_X + HALL_W/2 + HCL_W/2, BR_D/2 + HCL_D/2, HCL_W, HCL_D);              // hall closet (east of hall)
  addFloor(BCL_X, BR_D/2 + BCL_D/2, BCL_W, BCL_D);                                    // big closet (south of bedroom)

  // ============================================================
  // CEILINGS
  // ============================================================
  function addCeil(cx, cz, w, d) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    c.rotation.x = Math.PI / 2;
    c.position.set(cx, BR_H, cz);
    scene.add(c);
    return c;
  }
  addCeil(AL_X, -BR_D/2 - AL_DEPTH/2, AL_W, AL_DEPTH).position.y = AL_H;   // v1.378: the dormer's own flat ceiling
  // v1.378: the room's vault, two slopes from the east and west walls' tops to the ridge (the flat ceiling is gone)
  for (const side of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    const e = side * BR_W/2, zN = -BR_D/2, zS = BR_D/2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([e, BR_H, zN, 0, BR_RIDGE, zN, 0, BR_RIDGE, zS, e, BR_H, zN, 0, BR_RIDGE, zS, e, BR_H, zS], 3));
    g.computeVertexNormals();
    const v = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 1.0, side: THREE.DoubleSide }));
    v.name = 'br_vault';
    scene.add(v);
  }
  addCeil(HALL_X, BR_D/2 + HALL_D/2, HALL_W, HALL_D);
  addCeil(HALL_X - HALL_W/2 - BATH_W/2, BR_D/2 + HALL_D/2, BATH_W, BATH_D);
  addCeil(HALL_X + HALL_W/2 + HCL_W/2, BR_D/2 + HCL_D/2, HCL_W, HCL_D);
  addCeil(BCL_X, BR_D/2 + BCL_D/2, BCL_W, BCL_D);

  // ============================================================
  // WALL HELPER
  // ============================================================
  // Wall segments use BoxGeometry so they have thickness (avoids z-fight on corners)
  // dir: 'x' = wall runs along X axis (normal is Z), 'z' = wall runs along Z axis (normal is X)
  function addWall(cx, cz, len, dir, mat, h) {
    h = h || BR_H;
    let w, d;
    if (dir === 'x') { w = len; d = 0.1; }
    else { w = 0.1; d = len; }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wallCream);
    wall.position.set(cx, h/2, cz);
    wall.receiveShadow = true;
    scene.add(wall);
    return wall;
  }

  // ============================================================
  // BEDROOM WALLS
  // ============================================================
  // North wall has the alcove opening cut out: two segments on either side
  // West segment: from west wall to alcove opening's west edge
  const alW_left_end = AL_X - AL_W/2;
  const alW_right_start = AL_X + AL_W/2;
  addWall((-BR_W/2 + alW_left_end) / 2, -BR_D/2, alW_left_end - (-BR_W/2), 'x');
  // East segment: from alcove opening's east edge to east wall
  addWall((alW_right_start + BR_W/2) / 2, -BR_D/2, BR_W/2 - alW_right_start, 'x');

  // Alcove walls (three sides — west, north, east of the indented space)
  addWall(AL_X - AL_W/2, -BR_D/2 - AL_DEPTH/2, AL_DEPTH, 'z', null, AL_H);   // alcove west
  addWall(AL_X + AL_W/2, -BR_D/2 - AL_DEPTH/2, AL_DEPTH, 'z', null, AL_H);   // alcove east
  // Alcove north wall — has the window in it; built later with window cutout
  // For now, build it as two thin segments around a window opening
  const WIN_W = 1.4, WIN_H = 1.2, WIN_BOTTOM = 0.9;
  const winLeft = AL_X - WIN_W/2;
  const winRight = AL_X + WIN_W/2;
  const alcoveNorthZ = -BR_D/2 - AL_DEPTH;
  // Left of window
  addWall((AL_X - AL_W/2 + winLeft) / 2, alcoveNorthZ, winLeft - (AL_X - AL_W/2), 'x', null, AL_H);
  // Right of window
  addWall((winRight + AL_X + AL_W/2) / 2, alcoveNorthZ, (AL_X + AL_W/2) - winRight, 'x', null, AL_H);
  // Below window (sill)
  const winSill = new THREE.Mesh(new THREE.BoxGeometry(WIN_W, WIN_BOTTOM, 0.1), wallCream);
  winSill.position.set(AL_X, WIN_BOTTOM/2, alcoveNorthZ);
  scene.add(winSill);
  // Above window (header). v1.378: cut round the arched window's half-round fanlight, up to the dormer's ceiling
  const WIN_ARCH_R = WIN_W / 2;
  const archShape = new THREE.Shape();
  archShape.moveTo(-WIN_ARCH_R, 0);
  archShape.lineTo(-WIN_ARCH_R, AL_H - WIN_BOTTOM - WIN_H);
  archShape.lineTo(WIN_ARCH_R, AL_H - WIN_BOTTOM - WIN_H);
  archShape.lineTo(WIN_ARCH_R, 0);
  archShape.absarc(0, 0, WIN_ARCH_R, 0, Math.PI, false);
  const winHeader = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.1, bevelEnabled: false, curveSegments: 24 }), wallCream);
  winHeader.position.set(AL_X, WIN_BOTTOM + WIN_H, alcoveNorthZ - 0.05);
  winHeader.name = 'br_arch_wall';
  scene.add(winHeader);

  // South wall — has hallway opening centered AND big closet doorway in east half
  const hallLeft = HALL_X - HALL_W/2;
  const hallRight = HALL_X + HALL_W/2;
  const bclDoorLeft = BCL_DOORWAY_X - BCL_DOORWAY_W/2;
  const bclDoorRight = BCL_DOORWAY_X + BCL_DOORWAY_W/2;
  // West of hall opening
  addWall((-BR_W/2 + hallLeft) / 2, BR_D/2, hallLeft - (-BR_W/2), 'x');
  // Between hall and big closet doorway
  addWall((hallRight + bclDoorLeft) / 2, BR_D/2, bclDoorLeft - hallRight, 'x');
  // East of big closet doorway (small piece, since bclDoorRight should be close to BR_W/2)
  if (BR_W/2 - bclDoorRight > 0.05) {
    addWall((bclDoorRight + BR_W/2) / 2, BR_D/2, BR_W/2 - bclDoorRight, 'x');
  }
  // Header above big closet doorway
  const bclDoorTopHeader = new THREE.Mesh(new THREE.BoxGeometry(BCL_DOORWAY_W, BR_H - 2.1, 0.1), wallCream);
  bclDoorTopHeader.position.set(BCL_DOORWAY_X, 2.1 + (BR_H - 2.1)/2, BR_D/2);
  scene.add(bclDoorTopHeader);

  // v1.378: the gables over the north and south walls, up to the vault; the north one notched for the dormer's opening
  for (const gz of [-BR_D/2, BR_D/2]) {
    const gs = new THREE.Shape();
    gs.moveTo(-BR_W/2, BR_H);
    if (gz < 0) {
      gs.lineTo(alW_left_end, BR_H); gs.lineTo(alW_left_end, AL_H);
      gs.lineTo(alW_right_start, AL_H); gs.lineTo(alW_right_start, BR_H);
    }
    gs.lineTo(BR_W/2, BR_H);
    gs.lineTo(0, BR_RIDGE);
    gs.lineTo(-BR_W/2, BR_H);
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.1, bevelEnabled: false }), wallCream);
    gable.position.z = gz - 0.05;
    gable.name = 'br_gable';
    scene.add(gable);
  }

  // West wall (solid, two bookcases will sit against it)
  addWall(-BR_W/2, 0, BR_D, 'z');

  // East wall — RED ACCENT, now solid (big closet moved to south wall)
  addWall(BR_W/2, 0, BR_D, 'z', wallRed);

  // ============================================================
  // HALLWAY WALLS
  // ============================================================
  // Hall west wall (has bathroom doorway)
  const hallSouthZ = BR_D/2 + HALL_D;
  const bathDoorZ = BR_D/2 + 0.8;
  const bathDoorW = 0.85;
  const bathDoorTop = bathDoorZ - bathDoorW/2;
  const bathDoorBot = bathDoorZ + bathDoorW/2;
  addWall(-HALL_W/2, (BR_D/2 + bathDoorTop) / 2, bathDoorTop - BR_D/2, 'z');
  addWall(-HALL_W/2, (bathDoorBot + hallSouthZ) / 2, hallSouthZ - bathDoorBot, 'z');
  const bathDoorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, BR_H - 2.1, bathDoorW), wallCream);
  bathDoorHeader.position.set(-HALL_W/2, 2.1 + (BR_H - 2.1)/2, bathDoorZ);
  scene.add(bathDoorHeader);

  // Hall east wall (has BIFOLD hall closet doorway — wider, ~1.6m)
  const hclDoorW = 1.6;                          // 2x other doors for bifold
  const hclDoorZ = BR_D/2 + HCL_D/2;             // center along the closet's depth
  const hclDoorTop = hclDoorZ - hclDoorW/2;
  const hclDoorBot = hclDoorZ + hclDoorW/2;
  addWall(HALL_W/2, (BR_D/2 + hclDoorTop) / 2, hclDoorTop - BR_D/2, 'z');
  addWall(HALL_W/2, (hclDoorBot + hallSouthZ) / 2, hallSouthZ - hclDoorBot, 'z');
  const hclDoorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, BR_H - 2.1, hclDoorW), wallCream);
  hclDoorHeader.position.set(HALL_W/2, 2.1 + (BR_H - 2.1)/2, hclDoorZ);
  scene.add(hclDoorHeader);

  // v1.376 (D.74): the hall's south end is open onto the landing (its door stands open, below)

  // ============================================================
  // BATHROOM + HALL CLOSET (blocked interior walls — just enough to render)
  // ============================================================
  // Bathroom: small box west of hall
  const bathCenterX = -HALL_W/2 - BATH_W/2;
  const bathCenterZ = BR_D/2 + HALL_D/2;
  // West wall
  addWall(bathCenterX - BATH_W/2, bathCenterZ, BATH_D, 'z');
  // North wall
  addWall(bathCenterX, bathCenterZ - BATH_D/2, BATH_W, 'x');
  // South wall
  addWall(bathCenterX, bathCenterZ + BATH_D/2, BATH_W, 'x');

  // Hall closet (east of hall) — extends east, west wall is the hall east wall (already added)
  const hclCenterX = HALL_W/2 + HCL_W/2;
  const hclCenterZ = BR_D/2 + HCL_D/2;
  // East wall of hall closet — SHARED with big closet's west wall, but
  // since big closet's west wall is at the same X, build one wall here.
  // Note: this wall is at x = HALL_W/2 + HCL_W = 1.8 (= BCL west edge)
  addWall(hclCenterX + HCL_W/2, hclCenterZ, HCL_D, 'z');
  // North wall of hall closet (shared with bedroom south wall area, but the bedroom's
  // south wall extends across — actually no, the hall closet sits south of the bedroom's
  // south wall, east of the hall. Its north edge is at z = BR_D/2 = bedroom south wall line)
  addWall(hclCenterX, BR_D/2, HCL_W, 'x');                            // north wall (just to be safe; bedroom south wall handles main run)
  addWall(hclCenterX, hclCenterZ + HCL_D/2, HCL_W, 'x');              // south wall of hall closet

  // ============================================================
  // BIG CLOSET INTERIOR (walls — south of bedroom, SE corner)
  // ============================================================
  const bclCenterX = BCL_X;
  const bclCenterZ = BR_D/2 + BCL_D/2;
  // West wall is shared with hall closet's east wall (already added)
  // East wall (sticks out further east than bedroom)
  addWall(BCL_EAST, bclCenterZ, BCL_D, 'z');
  // South wall
  addWall(bclCenterX, bclCenterZ + BCL_D/2, BCL_W, 'x');
  // North wall portion that extends east beyond the bedroom's east wall.
  // This is the part of the closet's north wall that sits at x ∈ [BR_W/2, BCL_EAST], z = BR_D/2.
  if (BCL_EAST > BR_W/2) {
    const overhangW = BCL_EAST - BR_W/2;
    addWall(BR_W/2 + overhangW/2, BR_D/2, overhangW, 'x');
  }

  // ============================================================
  // 6-PANEL DOOR HELPER (white with gold knob)
  // ============================================================
  function buildDoor(width, height) {
    width = width || 0.8;
    height = height || 2.05;
    const g = new THREE.Group();
    // Slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), doorMat);
    slab.position.y = height/2;
    g.add(slab);
    // 6 panel insets on BOTH sides — 2 wide × 3 tall
    const panelW = width * 0.36;
    const panelH = height * 0.22;
    const cols = [-width*0.21, width*0.21];
    const rows = [height*0.78, height*0.5, height*0.22];
    for (const cx of cols) for (const ry of rows) {
      // Front face panel (recessed look via slightly inset darker rect with raised edges)
      const pFront = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.008), panelMat);
      pFront.position.set(cx, ry, 0.024);
      g.add(pFront);
      // Outline trim around the panel (slightly larger raised border, white)
      const trimT = new THREE.Mesh(new THREE.BoxGeometry(panelW + 0.04, 0.012, 0.012), doorMat);
      trimT.position.set(cx, ry + panelH/2 + 0.012, 0.025); g.add(trimT);
      const trimB = trimT.clone(); trimB.position.set(cx, ry - panelH/2 - 0.012, 0.025); g.add(trimB);
      const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.012, panelH + 0.04, 0.012), doorMat);
      trimL.position.set(cx - panelW/2 - 0.012, ry, 0.025); g.add(trimL);
      const trimR = trimL.clone(); trimR.position.set(cx + panelW/2 + 0.012, ry, 0.025); g.add(trimR);
      // Back face panel + trim (mirror)
      const pBack = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.008), panelMat);
      pBack.position.set(cx, ry, -0.024);
      g.add(pBack);
      const trimTb = trimT.clone(); trimTb.position.set(cx, ry + panelH/2 + 0.012, -0.025); g.add(trimTb);
      const trimBb = trimT.clone(); trimBb.position.set(cx, ry - panelH/2 - 0.012, -0.025); g.add(trimBb);
      const trimLb = trimL.clone(); trimLb.position.set(cx - panelW/2 - 0.012, ry, -0.025); g.add(trimLb);
      const trimRb = trimL.clone(); trimRb.position.set(cx + panelW/2 + 0.012, ry, -0.025); g.add(trimRb);
    }
    // Knobs on both sides
    const knobF = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), goldMat);
    knobF.position.set(width/2 - 0.08, height * 0.45, 0.055);
    g.add(knobF);
    const knobBaseF = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.015, 10), goldMat);
    knobBaseF.rotation.x = Math.PI / 2;
    knobBaseF.position.set(width/2 - 0.08, height * 0.45, 0.033);
    g.add(knobBaseF);
    const knobB = knobF.clone();
    knobB.position.set(width/2 - 0.08, height * 0.45, -0.055);
    g.add(knobB);
    const knobBaseB = knobBaseF.clone();
    knobBaseB.position.set(width/2 - 0.08, height * 0.45, -0.033);
    g.add(knobBaseB);
    return g;
  }

  // Bifold door — two narrow door slabs that share a hinge in the middle
  // Looks closed (folded flat against each other isn't realistic — closed bifolds
  // are two skinny panels flush across the opening, with a vertical seam in the middle)
  function buildBifoldDoor(totalWidth, height) {
    totalWidth = totalWidth || 1.6;
    height = height || 2.05;
    const g = new THREE.Group();
    const half = totalWidth / 2;
    // Left half
    const leftHalf = buildDoor(half * 0.96, height);
    leftHalf.position.x = -half / 2;
    g.add(leftHalf);
    // Right half
    const rightHalf = buildDoor(half * 0.96, height);
    rightHalf.position.x = half / 2;
    g.add(rightHalf);
    // Center vertical seam (the fold) — thin dark strip
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, height, 0.045),
      new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.6 })
    );
    seam.position.y = height / 2;
    g.add(seam);
    return g;
  }

  // ============================================================
  // PLACE DOORS
  // ============================================================
  // Bathroom door (closed, on hall's west wall)
  const bathDoor = buildDoor(bathDoorW * 0.95, 2.05);
  bathDoor.position.set(-HALL_W/2 + 0.025, 0, bathDoorZ);
  bathDoor.rotation.y = -Math.PI / 2;   // faces east (into hall)
  scene.add(bathDoor);

  // Hall closet — BIFOLD double-width doors (closed)
  const hclDoor = buildBifoldDoor(hclDoorW * 0.97, 2.05);
  hclDoor.position.set(HALL_W/2 - 0.025, 0, hclDoorZ);
  hclDoor.rotation.y = Math.PI / 2;     // faces west (into hall)
  scene.add(hclDoor);

  // Big closet door — OPEN, on bedroom's south wall (SE corner of bedroom)
  // Hinges on the WEST edge of the doorway; door swings INTO the closet
  // toward the closet's west wall. When fully open (90°), the door lies parallel
  // to the closet's west wall (which is the hall closet's east wall).
  const bclDoorOpenW = BCL_DOORWAY_W * 0.95;
  const bclDoor = buildDoor(bclDoorOpenW, 2.05);
  // Hinge point = west edge of doorway (x = bclDoorLeft, z = BR_D/2)
  // After 90° Y rotation, slab extends south along Z. Center of slab is hinge + (0, 0, width/2).
  bclDoor.position.set(bclDoorLeft + 0.02, 0, BR_D/2 + bclDoorOpenW/2 + 0.01);
  bclDoor.rotation.y = Math.PI / 2;     // slab faces east/west; lies along Z axis
  scene.add(bclDoor);

  // Bedroom suite entry door — at the SOUTH END of the hall, where the player spawns.
  // v1.376 (D.74, Michael: the real door between his room and the landing): drawn open, hinged on the east jamb and
  // swung out against the landing side, so the hall walks straight through onto the landing.
  const entryDoorW = 0.82;
  const entryDoor = buildDoor(entryDoorW, 2.05);
  entryDoor.position.set(HALL_W/2 - 0.03, 0, hallSouthZ + entryDoorW/2 + 0.03);
  entryDoor.rotation.y = Math.PI / 2;   // open: the slab lies north-south along the opening's east edge
  scene.add(entryDoor);
  // Casing for the entry door
  const entryCasingL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  entryCasingL.position.set(-HALL_W/2, 1.025, hallSouthZ - 0.02);
  scene.add(entryCasingL);
  const entryCasingR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  entryCasingR.position.set(HALL_W/2, 1.025, hallSouthZ - 0.02);
  scene.add(entryCasingR);
  const entryCasingTop = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.1, 0.08, 0.08), trimMat);
  entryCasingTop.position.set(0, 2.10, hallSouthZ - 0.02);
  scene.add(entryCasingTop);

  // Door casings/trim
  function addCasing(x, y, z, w, h, dir) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(dir === 'x' ? w : 0.08, h, dir === 'z' ? w : 0.08), trimMat);
    c.position.set(x, y, z);
    scene.add(c);
  }
  // Bathroom casing
  addCasing(-HALL_W/2 - 0.02, 1.025, bathDoorTop, 0.05, 2.10, 'z');
  addCasing(-HALL_W/2 - 0.02, 1.025, bathDoorBot, 0.05, 2.10, 'z');
  addCasing(-HALL_W/2 - 0.02, 2.10, bathDoorZ, bathDoorW + 0.1, 0.08, 'z');
  // v1.376 (D.74, Michael 28 Oct): v1.257's back door is gone (the real house had none there); the hall's west wall is
  // plain, and the way to the range is the stairs at the landing's south-east corner (buildLanding, below).
  // Hall closet casing (bifold)
  addCasing(HALL_W/2 + 0.02, 1.025, hclDoorTop, 0.05, 2.10, 'z');
  addCasing(HALL_W/2 + 0.02, 1.025, hclDoorBot, 0.05, 2.10, 'z');
  addCasing(HALL_W/2 + 0.02, 2.10, hclDoorZ, hclDoorW + 0.1, 0.08, 'z');
  // Big closet casing (south wall of bedroom)
  // Vertical strips at doorway edges
  const bclCasingL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  bclCasingL.position.set(bclDoorLeft, 1.025, BR_D/2 - 0.02);
  scene.add(bclCasingL);
  const bclCasingR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  bclCasingR.position.set(bclDoorRight, 1.025, BR_D/2 - 0.02);
  scene.add(bclCasingR);
  const bclCasingTop = new THREE.Mesh(new THREE.BoxGeometry(BCL_DOORWAY_W + 0.1, 0.08, 0.08), trimMat);
  bclCasingTop.position.set(BCL_DOORWAY_X, 2.10, BR_D/2 - 0.02);
  scene.add(bclCasingTop);
  // Bedroom-hall opening casing
  const brCasingL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  brCasingL.position.set(hallLeft, 1.025, BR_D/2 + 0.02);
  scene.add(brCasingL);
  const brCasingR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.10, 0.08), trimMat);
  brCasingR.position.set(hallRight, 1.025, BR_D/2 + 0.02);
  scene.add(brCasingR);
  const brCasingTop = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.1, 0.08, 0.08), trimMat);
  brCasingTop.position.set(0, 2.10, BR_D/2 + 0.02);
  scene.add(brCasingTop);

  // ============================================================
  // WINDOW (alcove north wall) + LIVE OUTDOOR BACKDROP
  // ============================================================
  // Glass pane (semi-reflective, mostly transparent so we see the backdrop behind it)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN_W, WIN_H),
    new THREE.MeshStandardMaterial({ color: 0xdcefff, transparent: true, opacity: 0.18, roughness: 0.1 })
  );
  glass.position.set(AL_X, WIN_BOTTOM + WIN_H/2, alcoveNorthZ - 0.05);
  scene.add(glass);

  // v1.378: the half-round fanlight over the two sashes, with its arched trim and three sunburst bars
  const fanlight = new THREE.Mesh(new THREE.CircleGeometry(WIN_ARCH_R, 24, 0, Math.PI), glass.material);
  fanlight.position.set(AL_X, WIN_BOTTOM + WIN_H, alcoveNorthZ - 0.05);
  fanlight.name = 'br_fanlight';
  scene.add(fanlight);
  const archTrim = new THREE.Mesh(new THREE.TorusGeometry(WIN_ARCH_R + 0.03, 0.04, 6, 24, Math.PI), trimMat);
  archTrim.position.set(AL_X, WIN_BOTTOM + WIN_H, alcoveNorthZ);
  scene.add(archTrim);
  for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(WIN_ARCH_R, 0.04, 0.05), trimMat);
    bar.position.set(AL_X + Math.cos(a) * WIN_ARCH_R / 2, WIN_BOTTOM + WIN_H + Math.sin(a) * WIN_ARCH_R / 2, alcoveNorthZ - 0.05);
    bar.rotation.z = a;
    scene.add(bar);
  }

  // Window frame (mullions — vertical + horizontal cross)
  const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.05, WIN_H, 0.06), trimMat);
  mullV.position.set(AL_X, WIN_BOTTOM + WIN_H/2, alcoveNorthZ - 0.05);
  scene.add(mullV);
  const mullH = new THREE.Mesh(new THREE.BoxGeometry(WIN_W, 0.05, 0.06), trimMat);
  mullH.position.set(AL_X, WIN_BOTTOM + WIN_H/2, alcoveNorthZ - 0.05);
  scene.add(mullH);
  // Outer frame
  const frameThick = 0.08;
  const fL = new THREE.Mesh(new THREE.BoxGeometry(frameThick, WIN_H + 0.12, 0.1), trimMat);
  fL.position.set(AL_X - WIN_W/2 - frameThick/2 + 0.01, WIN_BOTTOM + WIN_H/2, alcoveNorthZ);
  scene.add(fL);
  const fR = new THREE.Mesh(new THREE.BoxGeometry(frameThick, WIN_H + 0.12, 0.1), trimMat);
  fR.position.set(AL_X + WIN_W/2 + frameThick/2 - 0.01, WIN_BOTTOM + WIN_H/2, alcoveNorthZ);
  scene.add(fR);
  const fT = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.2, frameThick, 0.1), trimMat);
  fT.position.set(AL_X, WIN_BOTTOM + WIN_H + frameThick/2 - 0.01, alcoveNorthZ);
  scene.add(fT);
  const fB = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.2, frameThick, 0.1), trimMat);
  fB.position.set(AL_X, WIN_BOTTOM - frameThick/2 + 0.01, alcoveNorthZ);
  scene.add(fB);

  // Outdoor backdrop — drawn on a canvas, mapped to a big plane behind the window
  const outsideCanvas = document.createElement('canvas');
  outsideCanvas.width = 512;
  outsideCanvas.height = 384;
  const oct = outsideCanvas.getContext('2d');
  // Sky gradient
  const skyGrad = oct.createLinearGradient(0, 0, 0, outsideCanvas.height);
  skyGrad.addColorStop(0, '#7eb8e0');
  skyGrad.addColorStop(0.6, '#bbd9ee');
  skyGrad.addColorStop(1, '#e8f2d0');
  oct.fillStyle = skyGrad;
  oct.fillRect(0, 0, outsideCanvas.width, outsideCanvas.height);
  // Distant tree mass (darker, blurry)
  oct.fillStyle = '#3a5a30';
  for (let i = 0; i < 18; i++) {
    const x = i * 32 + (i % 2) * 16;
    const y = 200 + Math.sin(i * 1.7) * 14;
    oct.beginPath();
    oct.ellipse(x, y, 30 + (i%3)*5, 26, 0, 0, Math.PI*2);
    oct.fill();
  }
  // Closer tree (single, big — fills more of the right side)
  oct.fillStyle = '#2d4a25';
  oct.beginPath();
  oct.ellipse(360, 220, 80, 110, 0, 0, Math.PI*2);
  oct.fill();
  oct.fillStyle = '#1f3a1c';
  oct.beginPath();
  oct.ellipse(380, 260, 50, 70, 0, 0, Math.PI*2);
  oct.fill();
  // Trunk
  oct.fillStyle = '#4a3018';
  oct.fillRect(354, 280, 14, 50);
  // Ground (yard)
  oct.fillStyle = '#7ea848';
  oct.fillRect(0, 310, outsideCanvas.width, outsideCanvas.height - 310);
  // Some grass strokes
  oct.strokeStyle = '#8db452';
  for (let i = 0; i < 80; i++) {
    const x = gameRandom() * outsideCanvas.width;
    const y = 310 + gameRandom() * (outsideCanvas.height - 310);
    oct.beginPath();
    oct.moveTo(x, y);
    oct.lineTo(x, y - 4);
    oct.stroke();
  }
  // A few subtle clouds
  oct.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 4; i++) {
    const cx = 60 + i * 130;
    const cy = 60 + Math.sin(i) * 14;
    oct.beginPath();
    oct.ellipse(cx, cy, 36, 12, 0, 0, Math.PI*2);
    oct.fill();
  }
  const outsideTex = new THREE.CanvasTexture(outsideCanvas);
  outsideTex.wrapS = THREE.ClampToEdgeWrapping;
  outsideTex.wrapT = THREE.ClampToEdgeWrapping;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshBasicMaterial({ map: outsideTex })
  );
  backdrop.position.set(AL_X, WIN_BOTTOM + WIN_H/2, alcoveNorthZ - 2.0);
  scene.add(backdrop);

  // === Multiple foreground trees that sway === give the yard real life ===
  scene.userData.swayTrees = [];
  function makeSwayTree(trunkW, trunkH, leavesR, leavesY, trunkColor, leavesColor) {
    const g = new THREE.Group();
    // Pivot at base so the tree sways from the trunk's bottom
    const pivot = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(trunkW, trunkH, trunkW),
      new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.85 }));
    trunk.position.y = trunkH/2;
    pivot.add(trunk);
    // Multiple leaf clusters (a few overlapping spheres for organic look)
    const leafMat = new THREE.MeshStandardMaterial({ color: leavesColor, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(leavesR * (0.65 + gameRandom() * 0.4), 9, 7), leafMat);
      const angle = (i / 4) * Math.PI * 2;
      sphere.position.set(
        Math.cos(angle) * leavesR * 0.5,
        leavesY + Math.sin(angle) * leavesR * 0.25,
        Math.sin(angle) * leavesR * 0.4
      );
      pivot.add(sphere);
    }
    // Crown
    const crown = new THREE.Mesh(new THREE.SphereGeometry(leavesR, 10, 8), leafMat);
    crown.position.y = leavesY + leavesR * 0.6;
    pivot.add(crown);
    g.add(pivot);
    g.userData.pivot = pivot;
    g.userData.swayPhase = gameRandom() * Math.PI * 2;
    g.userData.swayAmp = 0.025 + gameRandom() * 0.025;
    g.userData.swayFreq = 0.0010 + gameRandom() * 0.0010;
    return g;
  }
  // A few trees arranged behind the window — bigger and more varied
  const treeSpecs = [
    // [x_offset, z_offset, trunkW, trunkH, leavesR, leavesY, trunkColor, leavesColor]
    [-1.2, -1.4, 0.10, 1.4, 0.9, 1.6, 0x3d2a15, 0x3a6228],
    [ 0.0, -2.0, 0.13, 2.0, 1.2, 2.2, 0x4a3018, 0x478030],
    [ 1.5, -1.0, 0.09, 1.1, 0.7, 1.3, 0x3d2a15, 0x507a25],
    [ 2.3, -1.8, 0.12, 1.6, 1.0, 1.8, 0x4a3018, 0x3e6628],
    [-2.2, -0.6, 0.08, 0.9, 0.55, 1.0, 0x3d2a15, 0x5c8a35],
  ];
  for (const spec of treeSpecs) {
    const t = makeSwayTree(spec[2], spec[3], spec[4], spec[5], spec[6], spec[7]);
    t.position.set(AL_X + spec[0], 0, alcoveNorthZ + spec[1]);
    scene.add(t);
    scene.userData.swayTrees.push(t);
  }
  // Keep the legacy single-tree handle for back-compat with the tick loop
  scene.userData.swayTree = scene.userData.swayTrees[0];

  // Window sill (interior shelf-like protrusion)
  const interiorSill = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.2, 0.04, 0.18), trimMat);
  interiorSill.position.set(AL_X, WIN_BOTTOM, alcoveNorthZ + 0.08);
  scene.add(interiorSill);

  // ============================================================
  // BED (east wall, headboard against red wall)
  // ============================================================
  const bedGroup = new THREE.Group();
  // Frame
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.45), bedFrameMat);
  bedFrame.position.y = 0.20;
  bedGroup.add(bedFrame);
  // Mattress (covered by comforter so doesn't matter much)
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 1.35), pillowMat);
  mattress.position.y = 0.50;
  bedGroup.add(mattress);
  // Single solid grey comforter — covers the mattress, hangs slightly over the sides at the foot
  const comforter = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.10, 1.40), beddingMat);
  comforter.position.set(-0.05, 0.66, 0);
  comforter.name = 'bed_comforter';
  bedGroup.add(comforter);
  // v1.214 (backlog D.26): small touches on the bed. A box with its corners pulled in toward a ball, for anything soft.
  const puffy = (w, h, d, mat, k) => {
    const geo = new THREE.BoxGeometry(1, 1, 1, 6, 4, 6), pa = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      const sph = v.clone().normalize().multiplyScalar(0.5);
      v.lerp(sph, k === undefined ? 0.45 : k);
      pa.setXYZ(i, v.x * w, v.y * h, v.z * d);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };
  const COMF_TOP = 0.71;   // the comforter's top face
  // the comforter falls over both sides of the mattress to the frame, and over the foot onto the footboard
  for (const side of [-1, 1]) {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(1.95, COMF_TOP - 0.375, 0.03), beddingMat);   // down to the frame's top (0.375)
    drape.position.set(-0.05, (COMF_TOP + 0.375) / 2, side * 0.71); drape.name = 'bed_drape';
    bedGroup.add(drape);
  }
  const footDrape = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 1.45), beddingMat);
  footDrape.position.set(-1.04, COMF_TOP - 0.08, 0); footDrape.name = 'bed_drape';
  bedGroup.add(footDrape);
  // the sheet folded back over the comforter under the pillows
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 });
  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 1.46), sheetMat);
  fold.position.set(0.32, COMF_TOP + 0.01, 0); fold.name = 'bed_fold';
  bedGroup.add(fold);
  // Pillows: two soft ones side by side against the headboard, and the red one leaning on them
  for (const side of [-1, 1]) {
    const pw = puffy(0.4, 0.14, 0.62, pillowMat);
    pw.position.set(0.7, COMF_TOP + 0.07 - 0.012, side * 0.33); pw.name = 'bed_pillow';   // pressed 1 cm into the bed
    pw.rotation.y = side * 0.04;
    bedGroup.add(pw);
  }
  // Accent red pillow
  const p2 = puffy(0.12, 0.36, 0.36, pillowAccent, 0.5);
  p2.position.set(0.5, COMF_TOP + 0.16, 0.02); p2.rotation.z = 0.38; p2.name = 'bed_throw';
  bedGroup.add(p2);
  // a folded red-and-cream blanket across the foot
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x8c2a2a, roughness: 0.95 });
  const blanket = puffy(0.34, 0.06, 1.2, blanketMat, 0.2);
  blanket.position.set(-0.72, COMF_TOP + 0.03 - 0.004, 0); blanket.name = 'bed_blanket';
  bedGroup.add(blanket);
  for (const dx of [-0.1, 0.1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 1.02), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.95 }));
    stripe.position.set(-0.72 + dx, COMF_TOP + 0.054, 0);   // woven across its top
    bedGroup.add(stripe);
  }
  // Headboard (tall, black, against the red wall)
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.6), bedFrameMat);
  headboard.position.set(0.97, 0.55, 0);
  bedGroup.add(headboard);
  // Headboard top trim
  const headTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.7), bedFrameMat);
  headTop.position.set(0.97, 1.10, 0);
  bedGroup.add(headTop);
  // Footboard
  const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.5), bedFrameMat);
  footboard.position.set(-1.0, 0.3, 0);
  bedGroup.add(footboard);

  // Position bed: headboard against east wall (x = BR_W/2 ≈ 3)
  // The bed's local +X is east; headboard at local x=0.97, so we want headboard at world BR_W/2 - 0.08
  bedGroup.position.set(BR_W/2 - 1.07, 0, 0.0);
  scene.add(bedGroup);

  // ============================================================
  // NIGHTSTANDS (flanking the bed, one north one south)
  // ============================================================
  function buildNightstand() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.5), bedFrameMat);
    body.position.y = 0.3;
    g.add(body);
    // Top trim
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.55), bedFrameMat);
    top.position.y = 0.62;
    g.add(top);
    // Drawer line
    const drawerLine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.005), new THREE.MeshStandardMaterial({ color: 0x1a0e08 }));
    drawerLine.position.set(0, 0.35, 0.252);
    g.add(drawerLine);
    // Drawer knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), goldMat);
    knob.position.set(0, 0.42, 0.253);
    g.add(knob);
    // v1.214 (D.26): a second drawer below the first, with its own knob, and a dark kick at the floor
    const knob2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), goldMat);
    knob2.position.set(0, 0.2, 0.253);
    g.add(knob2);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.005), new THREE.MeshStandardMaterial({ color: 0x0a0604 }));
    kick.position.set(0, 0.035, 0.252);
    g.add(kick);
    // Small lamp on top
    const lampMetal = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 12), lampMetal);
    lampBase.position.y = 0.67;   // v1.214: on the top (0.64), was sunk 2 cm into it
    lampBase.name = 'ns_lamp_base';
    g.add(lampBase);
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), lampMetal);
    lampPole.position.y = 0.81;
    g.add(lampPole);
    // v1.214: the socket and a lit bulb under the shade, the wire harp that holds the shade, and a finial on top
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xb8a060, roughness: 0.4, metalness: 0.6 }));
    socket.position.y = 0.94;
    g.add(socket);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffe0a0, emissiveIntensity: 0.9 }));
    bulb.position.y = 0.99; bulb.name = 'ns_bulb';
    g.add(bulb);
    for (const side of [-1, 1]) {
      const harp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.15, 6), lampMetal);
      harp.position.set(side * 0.045, 1.0, 0); harp.rotation.z = -side * 0.3;
      g.add(harp);
    }
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb8a060, roughness: 0.4, metalness: 0.6 }));
    finial.position.y = 1.085;
    g.add(finial);
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.18, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d4a0, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x5a4020, emissiveIntensity: 0.35 }));
    lampShade.position.y = 1.0; lampShade.name = 'ns_shade';
    g.add(lampShade);
    for (const ry of [0.91, 1.09]) {   // the shade's rolled rims
      const rim = new THREE.Mesh(new THREE.TorusGeometry(ry < 1 ? 0.13 : 0.10, 0.004, 4, 20), new THREE.MeshStandardMaterial({ color: 0xc9b07a, roughness: 0.8 }));
      rim.position.y = ry; rim.rotation.x = Math.PI / 2;
      g.add(rim);
    }
    return g;
  }
  const ns1 = buildNightstand();
  ns1.position.set(BR_W/2 - 0.35, 0, -1.05);   // north of bed
  scene.add(ns1);
  const ns2 = buildNightstand();
  ns2.position.set(BR_W/2 - 0.35, 0, 1.05);    // south of bed
  scene.add(ns2);

  // ============================================================
  // DESK (in alcove, with computer)
  // ============================================================
  const deskGroup = new THREE.Group();
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.6), woodMed);
  deskTop.position.y = 0.74;
  deskTop.castShadow = deskTop.receiveShadow = true;
  deskGroup.add(deskTop);
  // Legs
  for (const [lx, lz] of [[-0.82, -0.25], [0.82, -0.25], [-0.82, 0.25], [0.82, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), woodDark);
    leg.position.set(lx, 0.37, lz);
    deskGroup.add(leg);
  }
  // Desk position: inside alcove, against the north wall
  deskGroup.position.set(AL_X, 0, -BR_D/2 - AL_DEPTH + 0.35);
  scene.add(deskGroup);

  // === Computer on the desk (reuses 2003 CRT aesthetic) ===
  // v1.213 (backlog D.26, Michael 13 Oct: "the computer for example hovers off of the desk a bit"): the keyboard and
  // mouse sat half over the desk's front edge, in the air, and the monitor stood 1 cm proud of its stand. Everything now
  // stands on the desk top (DESK_Y) inside its edges: a CRT on a swivel foot with the tube's stepped back, airsoft.com
  // on its screen, a power light; the keyboard with its key rows; the mouse on a mouse pad; two little speakers; the
  // cables; and drive bays and a power light on the tower under the desk.
  const compGroup = new THREE.Group();
  const DESK_Y = 0.76;                          // the desk top's surface (0.74 + half its 0.04)
  const beigeMat = new THREE.MeshStandardMaterial({ color: 0xc8b896, roughness: 0.85 });
  const beigeDk = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.6 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.7 });
  const pcBox = (name, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.name = name; compGroup.add(m); return m;
  };
  // the swivel foot, then the monitor: the front case, and the tube's back stepping in toward the wall
  pcBox('pc_crt_foot', 0.24, 0.022, 0.22, beigeDk, 0, DESK_Y + 0.011, -0.04);
  pcBox('pc_crt_neck', 0.14, 0.012, 0.12, beigeDk, 0, DESK_Y + 0.028, -0.04);
  const crtBody = pcBox('pc_crt', 0.42, 0.36, 0.22, beigeMat, 0, DESK_Y + 0.034 + 0.18, 0.01);
  pcBox('pc_crt_back', 0.34, 0.29, 0.08, beigeMat, 0, crtBody.position.y - 0.01, -0.14);
  pcBox('pc_crt_back2', 0.24, 0.2, 0.08, beigeDk, 0, crtBody.position.y - 0.02, -0.22);
  const crtFaceZ = 0.01 + 0.11;
  pcBox('pc_crt_bezel', 0.37, 0.29, 0.006, darkMat, 0, crtBody.position.y + 0.015, crtFaceZ + 0.003);
  // airsoft.com on the screen, drawn like the shop's own page: the dark header, the red rule, the tabs, a row or two
  const scr = document.createElement('canvas'); scr.width = 256; scr.height = 192;
  const sx = scr.getContext('2d');
  sx.fillStyle = '#f4efe2'; sx.fillRect(0, 0, 256, 192);
  sx.fillStyle = '#0a4fbf'; sx.fillRect(0, 0, 256, 14);
  sx.fillStyle = '#1d1d1d'; sx.fillRect(0, 14, 256, 44);
  sx.fillStyle = '#ffffff'; sx.font = 'bold 22px Arial, sans-serif'; sx.fillText('AIRSOFT.COM', 12, 44);
  sx.fillStyle = '#d23a2a'; sx.fillRect(0, 58, 256, 4);
  sx.fillStyle = '#e8e2cf'; sx.fillRect(0, 62, 256, 18);
  sx.fillStyle = '#555'; sx.font = '10px Arial, sans-serif';
  ['Guns', 'Ammo', 'Gear', 'Mods', 'Clothes'].forEach((t, i) => sx.fillText(t, 12 + i * 46, 75));
  for (let i = 0; i < 4; i++) {
    sx.fillStyle = '#cfc8b4'; sx.fillRect(12, 92 + i * 24, 18, 18);
    sx.fillStyle = '#444'; sx.fillRect(38, 95 + i * 24, 90, 5);
    sx.fillStyle = '#999'; sx.fillRect(38, 104 + i * 24, 140, 3);
    sx.fillStyle = '#b8261c'; sx.fillRect(206, 94 + i * 24, 38, 12);
  }
  const scrTex = new THREE.CanvasTexture(scr);
  const crtFront = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.25), new THREE.MeshBasicMaterial({ map: scrTex, color: 0xd8e4f0 }));
  crtFront.position.set(0, crtBody.position.y + 0.015, crtFaceZ + 0.0065); crtFront.name = 'pc_screen';
  compGroup.add(crtFront);
  // Scanlines (drawn on a transparent canvas overlay)
  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = 64; scanCanvas.height = 64;
  const sct = scanCanvas.getContext('2d');
  sct.fillStyle = 'rgba(80,140,200,0.6)';
  for (let y = 0; y < 64; y += 2) sct.fillRect(0, y, 64, 1);
  const scanTex = new THREE.CanvasTexture(scanCanvas);
  scanTex.wrapS = THREE.RepeatWrapping; scanTex.wrapT = THREE.RepeatWrapping;
  scanTex.repeat.set(8, 8);
  const scanlines = new THREE.Mesh(
    new THREE.PlaneGeometry(0.33, 0.25),
    new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0.18 })
  );
  scanlines.position.set(0, crtBody.position.y + 0.015, crtFaceZ + 0.008);
  compGroup.add(scanlines);
  pcBox('pc_crt_button', 0.022, 0.012, 0.006, beigeDk, 0.15, crtBody.position.y - 0.155, crtFaceZ + 0.003);
  pcBox('pc_crt_led', 0.008, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x40e060 }), 0.125, crtBody.position.y - 0.155, crtFaceZ + 0.002);
  // Keyboard: on the desk in front of the monitor, its keys in four dark rows
  const kb = pcBox('pc_keyboard', 0.42, 0.022, 0.15, beigeMat, -0.04, DESK_Y + 0.011, 0.2);
  for (let r = 0; r < 4; r++) pcBox('pc_keys', 0.37, 0.004, 0.022, new THREE.MeshStandardMaterial({ color: 0x9a8c74, roughness: 0.8 }),
    -0.04 + (r === 3 ? -0.03 : 0), DESK_Y + 0.023, 0.152 + r * 0.03);
  // Mouse on a blue mouse pad, right of the keyboard
  pcBox('pc_mousepad', 0.2, 0.004, 0.17, new THREE.MeshStandardMaterial({ color: 0x24508a, roughness: 0.95 }), 0.33, DESK_Y + 0.002, 0.18);
  const mouse = pcBox('pc_mouse', 0.06, 0.024, 0.1, beigeMat, 0.33, DESK_Y + 0.004 + 0.012, 0.19);
  // Cables: the mouse's and the keyboard's, lying on the desk back to the computer
  pcBox('pc_cable', 0.006, 0.006, 0.26, cableMat, 0.31, DESK_Y + 0.003, 0.01);
  pcBox('pc_cable', 0.006, 0.006, 0.28, cableMat, -0.2, DESK_Y + 0.003, -0.015);
  // Two little speakers either side of the monitor
  for (const side of [-1, 1]) {
    const sp = pcBox('pc_speaker', 0.085, 0.15, 0.09, beigeMat, side * 0.33, DESK_Y + 0.075, -0.17);
    pcBox('pc_speaker_grille', 0.06, 0.07, 0.004, darkMat, sp.position.x, sp.position.y + 0.02, sp.position.z + 0.046);
  }
  // Tower (under desk), with two drive bays, a floppy slot and a power light on its front
  const tower = pcBox('pc_tower', 0.20, 0.45, 0.42, beigeMat, 0.65, 0.225, 0);
  pcBox('pc_tower_bay', 0.16, 0.04, 0.004, beigeDk, 0.65, 0.39, 0.211);
  pcBox('pc_tower_bay', 0.16, 0.04, 0.004, beigeDk, 0.65, 0.34, 0.211);
  pcBox('pc_tower_floppy', 0.1, 0.006, 0.004, darkMat, 0.65, 0.28, 0.212);
  pcBox('pc_tower_led', 0.01, 0.01, 0.004, new THREE.MeshBasicMaterial({ color: 0x40e060 }), 0.69, 0.22, 0.212);
  pcBox('pc_tower_button', 0.03, 0.03, 0.006, beigeDk, 0.65, 0.18, 0.212);
  compGroup.position.copy(deskGroup.position);
  scene.add(compGroup);

  // ============================================================
  // BOOKCASES (west wall) + MAP TABLE between them
  // ============================================================
  let bcSeed = 1;   // v1.215: each bookcase's books come from its own seed
  function buildBookcase() {
    const g = new THREE.Group();
    // Bookcase dimensions
    const BW = 0.9;        // width (Z direction since it sits against west wall)
    const BH = 1.8;        // height
    const BD = 0.32;       // depth from wall (X direction)
    const T = 0.025;       // panel thickness

    // Back panel (sits against the wall)
    const back = new THREE.Mesh(new THREE.BoxGeometry(T, BH, BW), bookcaseMat);
    back.position.set(-BD/2 + T/2, BH/2, 0);
    g.add(back);
    // Top
    const topP = new THREE.Mesh(new THREE.BoxGeometry(BD, T, BW), bookcaseMat);
    topP.position.set(0, BH - T/2, 0);
    g.add(topP);
    // Bottom (floor of bookcase, ~0.05 off ground)
    const botP = new THREE.Mesh(new THREE.BoxGeometry(BD, T, BW), bookcaseMat);
    botP.position.set(0, T/2 + 0.05, 0);
    g.add(botP);
    // Side panels
    const sideN = new THREE.Mesh(new THREE.BoxGeometry(BD, BH, T), bookcaseMat);
    sideN.position.set(0, BH/2, -BW/2 + T/2);
    g.add(sideN);
    const sideS = new THREE.Mesh(new THREE.BoxGeometry(BD, BH, T), bookcaseMat);
    sideS.position.set(0, BH/2, BW/2 - T/2);
    g.add(sideS);
    // Interior shelves — 4 of them visible from the front
    const shelfYs = [0.40, 0.78, 1.16, 1.54];
    for (const sy of shelfYs) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(BD - T*2, T, BW - T*2), bookcaseMat);
      sh.position.set(T/2, sy, 0);
      g.add(sh);
    }
    // Books on each shelf (placed in front area, visible)
    // v1.215 (backlog D.26): a book is never taller than its shelf's opening (the tallest went 4.5 cm up
    // through the shelf above, and the top shelf's through the top of the case), the books are the same every visit
    // (a seeded shuffle, was Math.random), a few have a pale band on the spine, and some shelves end in a book leaning
    // on the side or a short stack lying flat.
    let seed = bcSeed++ * 7919 + 17;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const bookColors = [0x8b1818, 0x1a3a6e, 0x3a5a25, 0x6b4a18, 0x5a2f6b, 0x205050, 0x3a3a3a, 0xb87c1e];
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xe8dcb0, roughness: 0.8 });
    const allShelfBases = [0.06].concat(shelfYs); // bottom shelf + 4 interior shelves
    const ceilings = shelfYs.concat([BH - T]).map(y => y - T / 2);   // the underside of the board above each shelf
    for (let s = 0; s < allShelfBases.length; s++) {
      const shelfTopY = allShelfBases[s] + T/2;
      const room = ceilings[s] - shelfTopY - 0.025;   // at least 2.5 cm of air over the tallest book
      let zCursor = -BW/2 + T + 0.02;
      let maxZ = BW/2 - T - 0.02;
      const ending = rnd();   // what closes the row: a stack lying flat, a book leaning on the side, or nothing
      if (ending < 0.4) {
        maxZ -= 0.24;
        let sy = shelfTopY;
        for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
          const th = 0.03 + rnd() * 0.02;
          const flat = new THREE.Mesh(new THREE.BoxGeometry(0.16 + rnd() * 0.05, th, 0.2 + rnd() * 0.04),
            new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(rnd() * bookColors.length)], roughness: 0.85 }));
          flat.position.set(BD/2 - 0.12, sy + th / 2, BW/2 - T - 0.13); flat.rotation.y = (rnd() - 0.5) * 0.2;
          flat.name = 'bc_book';
          g.add(flat); sy += th;
        }
      }
      while (zCursor < maxZ) {
        const bw = 0.04 + rnd() * 0.05;        // book width (along Z)
        if (zCursor + bw > maxZ) break;
        const bh = Math.min(room, 0.2 + rnd() * 0.11);
        const bd = 0.14 + rnd() * 0.06;        // depth (sticks out from back)
        const book = new THREE.Mesh(new THREE.BoxGeometry(bd, bh, bw),
          new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(rnd() * bookColors.length)], roughness: 0.85 }));
        // Position: x toward the front of the case (positive X), y resting on shelf
        book.position.set(BD/2 - bd/2 - 0.03, shelfTopY + bh/2, zCursor + bw/2);
        book.name = 'bc_book';
        g.add(book);
        if (rnd() < 0.3) {   // a pale band across the spine
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.018, bw * 0.9), bandMat);
          band.position.set(BD/2 - 0.03 + 0.0015, shelfTopY + bh * 0.78, zCursor + bw/2);
          g.add(band);
        }
        zCursor += bw + 0.003;
      }
      if (ending >= 0.4 && ending < 0.7 && maxZ - zCursor > 0.05) {
        // the last book leans over against the case's side, its foot on the shelf
        const bw = 0.035, bh = Math.min(room, 0.24), bd = 0.17, lean = 0.32;
        const book = new THREE.Mesh(new THREE.BoxGeometry(bd, bh, bw),
          new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(rnd() * bookColors.length)], roughness: 0.85 }));
        const sideZ = BW/2 - T;   // the inner face of the side it leans on
        // pivot: its outer bottom corner on the shelf, the top corner against the side
        book.rotation.x = lean;
        book.position.set(BD/2 - bd/2 - 0.03, shelfTopY + (bh / 2) * Math.cos(lean) + (bw / 2) * Math.sin(lean), sideZ - (bh / 2) * Math.sin(lean) - (bw / 2) * Math.cos(lean));
        book.name = 'bc_book';
        g.add(book);
      }
    }
    // a kick board across the front under the bottom shelf
    const kick = new THREE.Mesh(new THREE.BoxGeometry(T, 0.05, BW - T * 2), bookcaseMat);
    kick.position.set(BD/2 - T/2 - 0.01, 0.025, 0);
    g.add(kick);
    return g;
  }
  const bc1 = buildBookcase();
  bc1.position.set(-BR_W/2 + 0.22, 0, -1.6);
  scene.add(bc1);
  const bc2 = buildBookcase();
  bc2.position.set(-BR_W/2 + 0.22, 0, 1.6);
  scene.add(bc2);

  // Map table — sits between the two bookcases against the west wall
  const mapTableGroup = new THREE.Group();
  const mtTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 1.0), woodMed);
  mtTop.position.y = 0.75;
  mapTableGroup.add(mtTop);
  for (const [lx, lz] of [[-0.3, -0.45], [0.3, -0.45], [-0.3, 0.45], [0.3, 0.45]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), woodDark);
    leg.position.set(lx, 0.375, lz);
    mapTableGroup.add(leg);
  }
  // v1.258 (backlog D.41, Michael 15 Oct: "The map mesh in the bedroom is kind of ugly - can we clean it up / make it
  // look like the actual map?"): the paper was a blank sheet with six random ink strokes and three red dots. It is now
  // the neighborhood map itself, drawn from the map screen's own SVG with its zone pins (red open, grey locked, as on
  // the map screen when you build the room), lying north to the wall so it reads the right way up from the room. A
  // raised lip round the table top and four thumbtacks hold it down.
  const mapPaper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.64),
    new THREE.MeshStandardMaterial({ color: 0xf4e9d8, roughness: 1.0 })
  );
  mapPaper.rotation.set(-Math.PI / 2, 0, Math.PI / 2);   // the map's width along the table, its north toward the wall
  mapPaper.position.set(0, 0.7705, 0);
  mapPaper.name = 'mt_paper';
  mapTableGroup.add(mapPaper);
  paintMapTablePaper(mapPaper);
  for (const [lx, lz, w, d] of [[-0.335, 0, 0.03, 1.0], [0.335, 0, 0.03, 1.0], [0, -0.485, 0.7, 0.03], [0, 0.485, 0.7, 0.03]]) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), woodDark);
    lip.position.set(lx, 0.782, lz);
    mapTableGroup.add(lip);
  }
  for (const [tx, tz] of [[-0.3, -0.38], [-0.3, 0.38], [0.3, -0.38], [0.3, 0.38]]) {
    const tack = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 8), new THREE.MeshStandardMaterial({ color: 0xc83a2a, roughness: 0.5 }));
    tack.position.set(tx, 0.774, tz);
    mapTableGroup.add(tack);
  }
  mapTableGroup.position.set(-BR_W/2 + 0.45, 0, 0);
  scene.add(mapTableGroup);

  // ============================================================
  // FLOOR LAMP (NW corner)
  // ============================================================
  const lampGroup = new THREE.Group();
  const lampPoleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 }));
  lampPoleBase.position.y = 0.02;
  lampGroup.add(lampPoleBase);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
  lampPole.position.y = 0.80;
  lampGroup.add(lampPole);
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.95, emissive: 0xffc080, emissiveIntensity: 0.6 }));
  lampHead.position.y = 1.6;
  lampGroup.add(lampHead);
  lampGroup.position.set(BR_W/2 - 0.4, 0, -BR_D/2 + 0.4);
  scene.add(lampGroup);

  // ============================================================
  // CEILING FAN + LIGHT (center)
  // ============================================================
  const fanGroup = new THREE.Group();
  const fanMount = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.55, metalness: 0.4 }));
  fanMount.position.y = -0.04;
  fanGroup.add(fanMount);
  const fanMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.10, 14), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.55, metalness: 0.5 }));
  fanMotor.position.y = -0.14;
  fanGroup.add(fanMotor);
  // Light glass under the motor
  const fanGlass = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.85, emissive: 0xfff0c0, emissiveIntensity: 0.4 }));
  fanGlass.position.y = -0.24;
  fanGroup.add(fanGlass);
  // Blades — 4
  const bladesRoot = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.02, 0.16), new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.6 }));
    blade.position.set(0.50, -0.13, 0);
    const armPivot = new THREE.Group();
    armPivot.rotation.y = i * Math.PI/2;
    armPivot.add(blade);
    bladesRoot.add(armPivot);
  }
  fanGroup.add(bladesRoot);
  // v1.378: the fan hangs at the height it always had, on a downrod from the vault's ridge
  const fanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, BR_RIDGE - (BR_H - 0.10), 8), fanMount.material);
  fanRod.position.y = (BR_RIDGE - (BR_H - 0.10)) / 2;
  fanRod.name = 'br_fan_rod';
  fanGroup.add(fanRod);
  fanGroup.position.set(0, BR_H - 0.10, 0);
  scene.add(fanGroup);
  scene.userData.fanBlades = bladesRoot;   // animate in tick

  // ============================================================
  // POSTER — Spider-Man on south wall, visible from spawn
  // ============================================================
  const posterCanvas = document.createElement('canvas');
  posterCanvas.width = 320; posterCanvas.height = 480;
  const pct = posterCanvas.getContext('2d');
  // Background red
  pct.fillStyle = '#9a1a1a';
  pct.fillRect(0, 0, 320, 480);
  // Blue lower half
  pct.fillStyle = '#1a2a6e';
  pct.fillRect(0, 280, 320, 200);
  // Web pattern (white lines, faded)
  pct.strokeStyle = 'rgba(255,255,255,0.35)';
  pct.lineWidth = 1.5;
  // Radial webs from center
  const cx = 160, cy = 240;
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    pct.beginPath();
    pct.moveTo(cx, cy);
    pct.lineTo(cx + Math.cos(angle) * 240, cy + Math.sin(angle) * 240);
    pct.stroke();
  }
  for (let r = 1; r <= 6; r++) {
    pct.beginPath();
    for (let a = 0; a <= 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r * 35;
      const y = cy + Math.sin(angle) * r * 35;
      if (a === 0) pct.moveTo(x, y); else pct.lineTo(x, y);
    }
    pct.stroke();
  }
  // Spider-Man mask silhouette (simplified)
  pct.fillStyle = '#c81818';
  pct.beginPath();
  pct.ellipse(160, 220, 95, 115, 0, 0, Math.PI * 2);
  pct.fill();
  // Eyes (large white teardrop shapes with black outline)
  pct.fillStyle = '#ffffff';
  pct.beginPath();
  pct.ellipse(130, 210, 28, 22, -0.35, 0, Math.PI*2);
  pct.fill();
  pct.beginPath();
  pct.ellipse(190, 210, 28, 22, 0.35, 0, Math.PI*2);
  pct.fill();
  pct.strokeStyle = '#000000';
  pct.lineWidth = 3;
  pct.beginPath();
  pct.ellipse(130, 210, 28, 22, -0.35, 0, Math.PI*2);
  pct.stroke();
  pct.beginPath();
  pct.ellipse(190, 210, 28, 22, 0.35, 0, Math.PI*2);
  pct.stroke();
  // Title text
  pct.fillStyle = '#ffd200';
  pct.font = 'bold 48px Impact, sans-serif';
  pct.textAlign = 'center';
  pct.fillText('SPIDER-MAN', 160, 90);
  pct.fillStyle = '#ffffff';
  pct.font = 'bold 16px Impact, sans-serif';
  pct.fillText('THE NEIGHBORHOOD HERO', 160, 420);
  // Small poster border
  pct.strokeStyle = '#000';
  pct.lineWidth = 4;
  pct.strokeRect(2, 2, 316, 476);
  const posterTex = new THREE.CanvasTexture(posterCanvas);
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.05),
    new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.85 })
  );
  // South wall, west of hall opening
  poster.position.set(-BR_W/2 + 1.6, 1.45, BR_D/2 - 0.06);
  poster.rotation.y = Math.PI;
  scene.add(poster);

  // v1.194 (D.20 step 1): the summer calendar on the north wall, west of the alcove — this month, the days gone
  // crossed off, today ringed. It is redrawn on every visit (the bedroom is rebuilt each time).
  const calCanvas = document.createElement('canvas');
  calCanvas.width = 384; calCanvas.height = 576;
  drawSummerCalendar(calCanvas, summerDayIndex());
  const calGroup = new THREE.Group();
  const calPage = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.72),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(calCanvas), roughness: 0.9 }));
  calGroup.add(calPage);
  const calNail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), goldMat);
  calNail.rotation.x = Math.PI / 2;
  calNail.position.set(0, 0.39, 0);
  calGroup.add(calNail);
  calGroup.position.set(-2.3, 1.5, -BR_D/2 + 0.062);   // the wall is 0.1 thick, its face at -BR_D/2 + 0.05
  scene.add(calGroup);

  // v1.201 (D.22 step 1): the Pickup Game board, a corkboard on the north wall east of the window, a sheet pinned to it
  const pickupGroup = new THREE.Group();
  const corkMat = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.95 });
  const corkFrameMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
  const cork = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.58, 0.02), corkMat);
  pickupGroup.add(cork);
  for (const [w, h, x, y] of [[0.92, 0.03, 0, 0.305], [0.92, 0.03, 0, -0.305], [0.03, 0.64, -0.445, 0], [0.03, 0.64, 0.445, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), corkFrameMat);
    f.position.set(x, y, 0.005); pickupGroup.add(f);
  }
  const pkCanvas = document.createElement('canvas'); pkCanvas.width = 192; pkCanvas.height = 240;
  { const c = pkCanvas.getContext('2d');
    c.fillStyle = '#f4f0e4'; c.fillRect(0, 0, 192, 240);
    c.fillStyle = '#c0342a'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center';
    c.fillText('PICKUP', 96, 44); c.fillText('GAME', 96, 74);
    c.fillStyle = '#333'; c.font = '16px sans-serif';
    ['where?', 'how many?', 'day or night?', 'lives?'].forEach((t, i) => c.fillText(t, 96, 112 + i * 28));
    c.strokeStyle = '#2a4a8a'; c.lineWidth = 2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(30, 118 + i * 28); c.lineTo(162, 118 + i * 28); c.stroke(); } }
  const pkSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.375),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pkCanvas), roughness: 0.9 }));
  pkSheet.position.set(-0.12, -0.02, 0.012); pkSheet.rotation.z = 0.04; pickupGroup.add(pkSheet);
  const pkNote = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshStandardMaterial({ color: 0xf2e27a, roughness: 0.9 }));
  pkNote.position.set(0.24, 0.1, 0.012); pkNote.rotation.z = -0.08; pickupGroup.add(pkNote);
  for (const [x, y, col] of [[-0.12, 0.16, 0xd8402a], [0.24, 0.17, 0x2a6ad8]]) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
    pin.position.set(x, y, 0.022); pickupGroup.add(pin);
  }
  pickupGroup.position.set(1.65, 1.5, -BR_D/2 + 0.062);
  scene.add(pickupGroup);

  // v1.195 (D.20 step 2): your flip phone, shut, on the north nightstand; its little light is on while a text is unread
  const phoneGroup = new THREE.Group();
  const phoneShell = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.6 });
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.095), phoneShell);
  phoneGroup.add(phoneBody);
  const phoneHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), phoneShell);
  phoneHinge.rotation.z = Math.PI / 2;
  phoneHinge.position.set(0, 0, -0.047);
  phoneGroup.add(phoneHinge);
  const phoneLcd = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.02), new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.3 }));
  phoneLcd.rotation.x = -Math.PI / 2;
  phoneLcd.position.set(0, 0.0095, -0.02);
  phoneGroup.add(phoneLcd);
  const phoneLed = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x40ff70, emissive: 0x30ff60, emissiveIntensity: 1.5 }));
  phoneLed.position.set(0, 0.0095, 0.02);
  phoneGroup.add(phoneLed);
  phoneGroup.position.set(BR_W/2 - 0.35 - 0.17, 0.649, -1.05 + 0.14);
  phoneGroup.rotation.y = 0.5;
  scene.add(phoneGroup);
  const phoneUnread = summerUnreadCount();
  phoneLed.visible = phoneUnread > 0;

  // ============================================================
  // BIG CLOSET INTERIOR DECOR (visible through open doorway, looking south)
  // ============================================================
  // Hanging rod — runs E-W across the closet (parallel to the doorway)
  // Positioned in the middle/back of the closet so shirts hang facing the doorway
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, BCL_W - 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.7, roughness: 0.3 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(bclCenterX, 1.8, bclCenterZ + 0.2);
  scene.add(rod);
  // Top shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(BCL_W - 0.05, 0.03, BCL_D - 0.05), bookcaseMat);
  shelf.position.set(bclCenterX, 2.0, bclCenterZ);
  scene.add(shelf);
  // A few cosmetic shirts hanging side by side along the rod
  const shirtColors = [0x3a5a8a, 0x6a3a3a, 0x4a4a4a, 0x6a5a3a];
  for (let i = 0; i < 4; i++) {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.08),
      new THREE.MeshStandardMaterial({ color: shirtColors[i], roughness: 0.85 }));
    shirt.position.set(bclCenterX + (i - 1.5) * 0.22, 1.45, bclCenterZ + 0.2);
    scene.add(shirt);
  }

  // ============================================================
  // INTERACTABLES
  // ============================================================
  // Computer at desk → shop
  Game.interactables.push({
    type: 'computer',
    box: new THREE.Box3().setFromObject(compGroup),
    pos: new THREE.Vector3(AL_X, 1.0, -BR_D/2 - AL_DEPTH + 0.35),
    prompt: 'Use the computer (open airsoft.com)',
    label: 'Shop', icon: 'computer', labelY: 1.85,
    action: () => openShop(),
  });

  // Map table → world map
  Game.interactables.push({
    type: 'map_table',
    box: new THREE.Box3().setFromObject(mapTableGroup),
    pos: new THREE.Vector3(-BR_W/2 + 0.45, 0.8, 0),
    prompt: 'Open the neighborhood map',
    label: 'Map', icon: 'map', labelY: 1.7,
    action: () => openMap(),
  });

  // Big closet → loadout manager. Doorway is on the bedroom's south wall, SE corner.
  // Trigger box sits just north of the doorway, inside the bedroom.
  Game.interactables.push({
    type: 'closet',
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(BCL_DOORWAY_X, 1.0, BR_D/2 - 0.4),
      new THREE.Vector3(BCL_DOORWAY_W + 0.4, 2.0, 0.8)
    ),
    pos: new THREE.Vector3(BCL_DOORWAY_X, 1.0, BR_D/2 - 0.4),
    prompt: 'Manage your loadout',
    label: 'Loadout', icon: 'loadout', labelY: 2.05,
    action: () => openLoadout(),
  });

  // Hall closet → The Workbench (visual gun customization)
  Game.interactables.push({
    type: 'hall_closet',
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(HALL_W/2 + 0.2, 1.0, hclDoorZ),
      new THREE.Vector3(0.4, 2.0, hclDoorW + 0.3)
    ),
    pos: new THREE.Vector3(HALL_W/2 - 0.4, 1.0, hclDoorZ),
    prompt: 'Open the workbench (customize guns)',
    label: 'Workbench', icon: 'workbench', labelY: 2.05,
    action: () => openWorkbench(),
  });

  // v1.376 (D.74, Michael 28 Oct: "from the map table only"): v1.88's "Go outside" on the hall's entry door is gone;
  // that door is open onto the landing now, and every match starts from the map table. The range's way out (v1.257's
  // `back_door`) moved to the top of the stairs: buildLanding pushes it, with the crew.
  const landing = buildLanding();

  // Bathroom door → placeholder
  Game.interactables.push({
    type: 'bathroom',
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-HALL_W/2 - 0.2, 1.0, bathDoorZ),
      new THREE.Vector3(0.4, 2.0, bathDoorW + 0.3)
    ),
    pos: new THREE.Vector3(-HALL_W/2 + 0.4, 1.0, bathDoorZ),
    // v1.107 (D.6): the bathroom door was a placeholder; it's where the mirror is now
    prompt: 'Look in the bathroom mirror',
    label: 'Mirror', icon: 'bathroom', labelY: 2.05,
    action: () => openMirror(),
  });

  // v1.194 (D.20 step 1): the calendar → the summer so far
  Game.interactables.push({
    type: 'calendar',
    box: new THREE.Box3().setFromObject(calGroup),
    pos: new THREE.Vector3(-2.3, 1.0, -BR_D/2 + 0.45),
    prompt: 'Look at the calendar',
    label: 'Calendar', icon: 'calendar', labelY: 2.0,
    action: () => openSummerCalendar(),
  });

  // v1.201 (D.22 step 1): the corkboard → the Pickup Game board
  Game.interactables.push({
    type: 'pickup_board',
    box: new THREE.Box3().setFromObject(pickupGroup),
    pos: new THREE.Vector3(1.65, 1.0, -BR_D/2 + 0.45),
    prompt: 'Set up a pickup game',
    label: 'Pickup Game', icon: 'pickup', labelY: 2.0,
    action: () => openPickupBoard(),
  });

  // v1.195 (D.20 step 2): the phone → your texts
  Game.interactables.push({
    type: 'phone',
    box: new THREE.Box3().setFromObject(phoneGroup),
    pos: new THREE.Vector3(BR_W/2 - 0.6, 0.7, -0.95),
    prompt: phonePromptText(phoneUnread),
    label: phoneLabelText(phoneUnread), icon: 'phone', labelY: 1.25,
    action: () => openPhone(),
    _led: phoneLed,
  });

  // Bed → SAVE GAME (v1.37). Sleeping on it writes your progress to the browser.
  // v1.231 (D.29, Michael: A): the game saves itself (v1.218), so the bed shows the summer so far.
  // Fits the kid-bedroom framing and matches the original hub design pillar
  // ("Save, gear, world map"). Trigger box covers the whole bed footprint.
  Game.interactables.push({
    type: 'bed',
    box: new THREE.Box3().setFromObject(bedGroup),
    pos: new THREE.Vector3(BR_W/2 - 1.07, 0.6, 0.0),
    prompt: 'Sleep (how’s the summer going?)',   // v1.231: was "Sleep (save your game)"
    label: 'Summer', icon: 'bed', labelY: 1.5,
    action: () => openSaveMenu(),
  });

  // ============================================================
  // v1.376 (D.74, Michael: A, from his photos and floor plan in docs/refs/landing.md): THE LANDING
  // ============================================================
  // The common room outside his room: tan walls, beige carpet, white trim; the white built-in desk in the south wall's
  // recess with the TV platform at its west end (the corner unit cut at 45°, a CRT on top facing the room), two black
  // office chairs, the desk tops empty (Michael); the black futon under the east windows turned toward the TV with
  // the black coffee table; a bifold closet; the hallway west to Sean's room (both doors shut); the stairs down in the
  // south-east corner, no door, an invisible wall at the top and E there for the backyard range. The kids you have
  // taken into your crew are here, in the order they joined: the futon, the desk chairs, then by the hallway.
  function buildLanding() {
    const L = LAND;
    const landWall = new THREE.MeshStandardMaterial({ color: 0xd8c4ae, roughness: 0.95 });
    const carpet = new THREE.MeshStandardMaterial({ color: 0xc8beb2, roughness: 1.0 });   // the guide's #d4ccc2, a touch down for the sun on the floor
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.7 });
    const futonMat = new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.95 });
    const obstacles = [];
    // The room's sun comes in from the north through the bedroom window and, with no shadows, through every wall: a
    // face turned north out here would be in full sun. Those faces take the colour at half, about what the rest of the
    // landing gets from its own light.
    const _north = new Map();
    const northFaced = mat => {
      if (!_north.has(mat)) { const m = mat.clone(); m.color.multiplyScalar(0.5); _north.set(mat, [mat, mat, mat, mat, mat, m]); }
      return _north.get(mat);
    };
    // an axis-aligned box from its extents
    function box(x0, x1, y0, y1, z0, z1, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat.isMaterial ? northFaced(mat) : mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      scene.add(m);
      return m;
    }
    function plane(x0, x1, z0, z1, y, mat, down) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
      m.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      scene.add(m);
      return m;
    }
    const T = 0.1, BASE = 0.12;   // wall thickness; baseboard height

    // Floors and ceilings: the landing, the recess, the hallway, the stairwell's ceiling
    plane(L.x0, L.x1, L.z0, L.z1, 0, carpet);
    plane(L.recessX0, L.recessX1, L.z1, L.recessZ, 0, carpet);
    plane(L.hallX0, L.x0, L.hallZ0, L.hallZ1, 0, carpet);
    plane(L.x0, L.x1, L.z0, L.z1, L.h, ceilMat, true);
    plane(L.recessX0, L.recessX1, L.z1, L.recessZ, L.h, ceilMat, true);
    // (the stairwell's ceiling is with the stairs, below)
    plane(L.hallX0, L.x0, L.hallZ0, L.hallZ1, L.hallH, ceilMat, true);

    // North wall: the hall's opening (x -0.8..0.8) and the bifold closet at the east end
    const clX0 = 1.4, clX1 = 3.0;
    box(L.x0 - T, -HALL_W/2, 0, L.h, L.z0 - T/2, L.z0 + T/2, landWall);
    box(HALL_W/2, clX0, 0, L.h, L.z0 - T/2, L.z0 + T/2, landWall);
    box(clX1, L.x1 + T, 0, L.h, L.z0 - T/2, L.z0 + T/2, landWall);
    box(-HALL_W/2, HALL_W/2, 2.1, L.h, L.z0 - T/2, L.z0 + T/2, landWall);   // over the opening
    box(clX0, clX1, 2.08, L.h, L.z0 - T/2, L.z0 + T/2, landWall);           // over the closet
    box(clX0, clX1, 0, 2.08, L.z0 - 0.6, L.z0 - 0.55, wallCream);           // the closet's back
    const bif = buildBifoldDoor(clX1 - clX0 - 0.04, 2.05);
    bif.position.set((clX0 + clX1) / 2, 0, L.z0 + 0.03);
    scene.add(bif);
    addCasing(clX0, 1.04, L.z0 + 0.03, 0.05, 2.08, 'x');
    addCasing(clX1, 1.04, L.z0 + 0.03, 0.05, 2.08, 'x');
    addCasing((clX0 + clX1) / 2, 2.1, L.z0 + 0.03, clX1 - clX0 + 0.1, 0.08, 'x');
    addCasing(-HALL_W/2, 1.04, L.z0 + 0.03, 0.05, 2.12, 'x');
    addCasing(HALL_W/2, 1.04, L.z0 + 0.03, 0.05, 2.12, 'x');
    addCasing(0, 2.12, L.z0 + 0.03, HALL_W + 0.1, 0.08, 'x');

    // East wall with the pair of double-hung windows; trees outside, as through the bedroom window
    const wz0 = L.winZ - L.winW/2, wz1 = L.winZ + L.winW/2, wTop = L.winSill + L.winH;
    box(L.x1, L.x1 + T, 0, L.h, L.z0 - T/2, wz0, landWall);
    box(L.x1, L.x1 + T, 0, L.h, wz1, L.z1, landWall);
    box(L.x1, L.x1 + T, 0, L.winSill, wz0, wz1, landWall);
    box(L.x1, L.x1 + T, wTop, L.h, wz0, wz1, landWall);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(L.winW, L.winH),
      new THREE.MeshStandardMaterial({ color: 0xdcefff, transparent: true, opacity: 0.18, roughness: 0.1 }));
    glass.rotation.y = -Math.PI / 2; glass.position.set(L.x1 + 0.05, L.winSill + L.winH/2, L.winZ);
    scene.add(glass);
    for (const z of [wz0, L.winZ, wz1]) box(L.x1 - 0.03, L.x1 + 0.06, L.winSill, wTop, z - 0.04, z + 0.04, trimMat);   // jambs and the middle post
    for (const y of [L.winSill, L.winSill + L.winH/2, wTop]) box(L.x1 - 0.03, L.x1 + 0.06, y - 0.035, y + 0.035, wz0, wz1, trimMat);   // sill, meeting rails, head
    box(L.x1 - 0.08, L.x1, L.winSill - 0.05, L.winSill - 0.01, wz0 - 0.08, wz1 + 0.08, trimMat);   // the stool
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), new THREE.MeshBasicMaterial({ map: outsideTex }));
    outside.rotation.y = -Math.PI / 2; outside.position.set(L.x1 + 2.0, 1.5, L.winZ);
    scene.add(outside);

    // South wall: west of the recess; the recess (west jut, back, east side); the stairwell beyond it
    box(L.x0 - T, L.recessX0, 0, L.h, L.z1, L.z1 + T, landWall);
    box(L.recessX0 - T, L.recessX0, 0, L.h, L.z1, L.recessZ, landWall);
    box(L.recessX0 - T, L.recessX1 + T, 0, L.h, L.recessZ, L.recessZ + T, landWall);
    box(L.stairX0, L.stairX1, 2.4, L.h, L.z1 - T/2, L.z1 + T/2, landWall);   // the bulkhead over the stairs

    // West wall with the hallway's opening (no door)
    box(L.x0 - T, L.x0, 0, L.h, L.z0 - T/2, L.hallZ0, landWall);
    box(L.x0 - T, L.x0, 0, L.h, L.hallZ1, L.z1 + T, landWall);
    box(L.x0 - T, L.x0, 2.1, L.h, L.hallZ0, L.hallZ1, landWall);
    addCasing(L.x0 + 0.01, 1.04, L.hallZ0, 0.05, 2.12, 'z');
    addCasing(L.x0 + 0.01, 1.04, L.hallZ1, 0.05, 2.12, 'z');
    addCasing(L.x0 + 0.01, 2.12, (L.hallZ0 + L.hallZ1) / 2, L.hallZ1 - L.hallZ0 + 0.1, 0.08, 'z');

    // Baseboards
    box(L.x0, -HALL_W/2, 0, BASE, L.z0 + T/2, L.z0 + T/2 + 0.015, trimMat);
    box(HALL_W/2, clX0, 0, BASE, L.z0 + T/2, L.z0 + T/2 + 0.015, trimMat);
    box(L.x1 - 0.015, L.x1, 0, BASE, L.z0 + T/2, L.z1, trimMat);
    box(L.x0, L.recessX0, 0, BASE, L.z1 - 0.015, L.z1, trimMat);
    box(L.x0, L.x0 + 0.015, 0, BASE, L.z0 + T/2, L.hallZ0, trimMat);
    box(L.x0, L.x0 + 0.015, 0, BASE, L.hallZ1, L.z1, trimMat);

    // The hallway to Sean's room, two shut six-panel doors at its west end
    const hz = (L.hallZ0 + L.hallZ1) / 2;
    box(L.hallX0, L.x0, 0, L.hallH, L.hallZ0 - T, L.hallZ0, landWall);
    box(L.hallX0, L.x0, 0, L.hallH, L.hallZ1, L.hallZ1 + T, landWall);
    box(L.hallX0 - T, L.hallX0, 0, L.hallH, L.hallZ0 - T, L.hallZ1 + T, landWall);
    box(L.hallX0, L.x0, 0, BASE, L.hallZ0, L.hallZ0 + 0.015, trimMat);
    box(L.hallX0, L.x0, 0, BASE, L.hallZ1 - 0.015, L.hallZ1, trimMat);
    const seanX = L.hallX0 + 0.65;
    const seanDoor = buildDoor(0.8, 2.03);
    seanDoor.position.set(seanX, 0, L.hallZ0 + 0.025); scene.add(seanDoor);
    addCasing(seanX - 0.43, 1.03, L.hallZ0 + 0.02, 0.05, 2.08, 'x');
    addCasing(seanX + 0.43, 1.03, L.hallZ0 + 0.02, 0.05, 2.08, 'x');
    addCasing(seanX, 2.08, L.hallZ0 + 0.02, 0.96, 0.08, 'x');
    const endDoor = buildDoor(0.8, 2.03);
    endDoor.rotation.y = Math.PI / 2; endDoor.position.set(L.hallX0 + 0.025, 0, hz); scene.add(endDoor);
    addCasing(L.hallX0 + 0.02, 1.03, hz - 0.43, 0.05, 2.08, 'z');
    addCasing(L.hallX0 + 0.02, 1.03, hz + 0.43, 0.05, 2.08, 'z');
    addCasing(L.hallX0 + 0.02, 2.08, hz, 0.96, 0.08, 'z');
    // the attic hatch, the return-air grille, two recessed lights
    const hatchX = L.x0 - 3.0, grilleX = L.x0 - 0.9;
    box(hatchX - 0.45, hatchX + 0.45, L.hallH - 0.012, L.hallH, hz - 0.3, hz + 0.3, trimMat);
    box(hatchX - 0.4, hatchX + 0.4, L.hallH - 0.016, L.hallH - 0.012, hz - 0.25, hz + 0.25, ceilMat);
    box(grilleX - 0.25, grilleX + 0.25, L.hallH - 0.01, L.hallH, hz - 0.2, hz + 0.2, new THREE.MeshStandardMaterial({ color: 0xbdb8ae, roughness: 0.8 }));
    const canMat = new THREE.MeshStandardMaterial({ color: 0xfff8e8, emissive: 0xfff2d8, emissiveIntensity: 0.8 });
    for (const x of [L.x0 - 1.4, L.x0 - 4.8]) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16), canMat);
      can.position.set(x, L.hallH - 0.006, hz); scene.add(can);
    }
    const hallLight = new THREE.PointLight(0xfff0dc, 0.35, 6, 1.6);
    hallLight.position.set(L.x0 - 3.2, L.hallH - 0.4, hz); scene.add(hallLight);

    // The drum light in the middle of the landing's ceiling
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 0.7 }));
    drum.position.set(0, L.h - 0.06, (L.z0 + L.z1) / 2); scene.add(drum);
    const landLight = new THREE.PointLight(0xfff0dc, 0.45, 9, 1.6);
    landLight.position.set(0, L.h - 0.35, (L.z0 + L.z1) / 2); scene.add(landLight);

    // The stairs: four steps down south along the east wall to a square platform 0.76 m down, then the flight turns
    // west and goes on down out of sight (to the kitchen). A black handrail on the east wall. Not walkable: the
    // stairwell's top is an invisible wall, and E there goes out to the range.
    const RISE = 0.19, RUN = 0.28, SW = L.stairX1 - L.stairX0;
    const pz0 = L.z1 + RUN * 4, pz1 = pz0 + SW, wEnd = L.stairX0 - RUN * 8;   // the platform; the flight's last step in view
    for (let i = 0; i < 4; i++) box(L.stairX0, L.stairX1, -3, -RISE * (i + 1), L.z1 + RUN * i, L.z1 + RUN * (i + 1), carpet);
    box(L.stairX0, L.stairX1, -3, -RISE * 4, pz0, pz1, carpet);
    for (let j = 0; j < 8; j++) box(L.stairX0 - RUN * (j + 1), L.stairX0 - RUN * j, -3, -RISE * (5 + j), pz0, pz1, carpet);
    box(L.recessX1, L.stairX0, -3, L.h, L.z1, pz0, landWall);          // the stairwell's west side, past the recess
    box(L.stairX1, L.stairX1 + T, -3, L.h, L.z1, pz1 + T, landWall);   // the east wall on down
    box(wEnd, L.stairX1 + T, -3, L.h, pz1, pz1 + T, landWall);         // the stairwell's south wall
    box(wEnd - T, wEnd, -3, L.h, pz0, pz1 + T, landWall);              // its west end, past the last step in view
    box(wEnd, L.stairX0, -3, L.h, pz0 - T, pz0, landWall);             // under the recess, the flight's north side
    plane(wEnd, L.stairX1, L.z1, pz1, L.h, ceilMat, true);
    box(L.stairX0, L.stairX1, -0.02, 0, L.z1 - 0.03, L.z1, trimMat);   // the top step's nosing
    const railRun = RUN * 4;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(railRun, RISE * 4) + 0.3, 10), blackMat);
    rail.rotation.x = Math.atan2(RISE * 4, railRun) - Math.PI / 2;   // high at the top step, falling south
    rail.position.set(L.stairX1 - 0.07, 0.86 - RISE * 2, L.z1 + railRun / 2); scene.add(rail);

    // The desk build: one white built-in piece filling the recess. From the east: a drawer pedestal, the first computer
    // spot, a second pedestal, the second spot, and at the west end the corner unit cut at 45° (open shelves), its top
    // the TV platform, 0.39 m over the desk. Desk tops empty (Michael).
    const DESK_Y = 0.76, DESK_D = 0.6, dz0 = L.recessZ - DESK_D;
    const cX = L.recessX0 + 0.85, R = L.recessZ;   // the corner unit's east side; the recess's back
    const pedE = [L.recessX1 - 0.5, L.recessX1], pedW = [cX + 1.1, cX + 1.6];   // the drawer pedestals
    box(cX, L.recessX1, DESK_Y - 0.035, DESK_Y, dz0, L.recessZ, deskMat);
    const knob = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.4, metalness: 0.5 });
    for (const [px0, px1] of [pedE, pedW]) {
      box(px0, px1, 0, DESK_Y - 0.035, dz0 + 0.02, L.recessZ, deskMat);
      for (let k = 0; k < 3; k++) {
        const y0 = 0.06 + k * 0.215;
        box(px0 + 0.015, px1 - 0.015, y0, y0 + 0.2, dz0 + 0.005, dz0 + 0.02, deskMat);
        box((px0 + px1) / 2 - 0.05, (px0 + px1) / 2 + 0.05, y0 + 0.14, y0 + 0.155, dz0 - 0.01, dz0 + 0.005, knob);
      }
    }
    box(cX, L.recessX1, DESK_Y - 0.035, DESK_Y, L.recessZ - 0.015, L.recessZ, deskMat);
    const PLAT_Y = 1.15;
    const X0 = L.recessX0, cornerPts = [[X0, R], [cX, R], [cX, R - 0.4], [X0 + 0.5, R - 0.75], [X0, R - 0.75]];
    const cs = new THREE.Shape();
    cornerPts.forEach(([x, z], i) => (i ? cs.lineTo(x, -z) : cs.moveTo(x, -z)));
    const corner = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: PLAT_Y, bevelEnabled: false }), deskMat);
    corner.rotation.x = -Math.PI / 2;   // the shape's (x, y) → the floor's (x, -z), extruded up
    scene.add(corner);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xc9c5bb, roughness: 0.8 });
    for (const y of [0.32, 0.78]) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.34), shelfMat);
      sh.rotation.y = 3 * Math.PI / 4; sh.position.set((cX + X0 + 0.5) / 2 + 0.004, y, R - 0.575 - 0.004); scene.add(sh);
    }
    // Michael's TV on the platform: a CRT, facing north-east into the room
    const tv = new THREE.Group();
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.4), blackMat);
    tvBody.position.y = 0.2; tv.add(tvBody);
    const tvBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.12), blackMat);
    tvBack.position.set(0, 0.19, -0.24); tv.add(tvBack);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.29),
      new THREE.MeshStandardMaterial({ color: 0x1c2a36, emissive: 0x24384a, emissiveIntensity: 0.6, roughness: 0.2 }));
    screen.position.set(0, 0.21, 0.201); tv.add(screen);
    tv.position.set(X0 + 0.42, PLAT_Y, R - 0.4); tv.rotation.y = 3 * Math.PI / 4;
    scene.add(tv);
    obstacles.push({ minX: L.recessX0, maxX: L.recessX1, minZ: R - 0.75, maxZ: L.recessZ, h: PLAT_Y });

    // Two black office chairs at the computer spots, pulled out, facing the desk
    const chairZ = dz0 - 0.45, chairs = [{ x: (pedW[1] + pedE[0]) / 2, z: chairZ }, { x: (cX + pedW[0]) / 2, z: chairZ }];
    for (const c of chairs) {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.44), blackMat); seat.position.y = 0.46; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), blackMat); back.position.set(0, 0.8, -0.22); back.rotation.x = -0.1; g.add(back);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), knob); post.position.y = 0.24; g.add(post);
      for (let k = 0; k < 5; k++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.28), blackMat);
        const a = k / 5 * Math.PI * 2;
        leg.position.set(Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14); leg.rotation.y = a; g.add(leg);
      }
      g.position.set(c.x, 0, c.z);
      scene.add(g);
      obstacles.push({ minX: c.x - 0.25, maxX: c.x + 0.25, minZ: c.z - 0.27, maxZ: c.z + 0.23, h: 1.05 });
    }

    // The black futon under the east windows, turned 28° from facing west toward the TV, the coffee table before it
    const F = { x: L.x1 - 0.86, z: L.winZ }, fYaw = Math.atan2(-Math.cos(28 * Math.PI / 180), Math.sin(28 * Math.PI / 180));
    const toWorld = (lx, lz, o) => ({ x: o.x + lx * Math.cos(fYaw) + lz * Math.sin(fYaw), z: o.z - lx * Math.sin(fYaw) + lz * Math.cos(fYaw) });
    const futon = new THREE.Group();
    const fBox = (w, h, d, x, y, z, mat, rx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; futon.add(m); };
    fBox(1.9, 0.16, 0.74, 0, 0.36, 0.02, futonMat);              // the seat mattress
    fBox(1.9, 0.62, 0.16, 0, 0.72, -0.32, futonMat, -0.22);      // the back mattress, leaning back
    fBox(1.84, 0.05, 0.7, 0, 0.26, 0.0, blackMat);               // the frame
    for (const sx of [-1, 1]) {
      fBox(0.05, 0.5, 0.78, sx * 0.97, 0.3, 0.0, blackMat);      // the arms
      fBox(0.05, 0.05, 0.6, sx * 0.97, 0.58, 0.02, blackMat);
    }
    futon.position.set(F.x, 0, F.z); futon.rotation.y = fYaw;
    scene.add(futon);
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.45), blackMat); top.position.y = 0.42; table.add(top);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.02, 0.4), blackMat); shelf.position.y = 0.12; table.add(shelf);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), blackMat); leg.position.set(sx * 0.42, 0.21, sz * 0.2); table.add(leg);
    }
    const T0 = toWorld(0, 1.0, F);
    table.position.set(T0.x, 0, T0.z); table.rotation.y = fYaw;
    scene.add(table);
    // their footprints, as the boxes round them
    const aabb = (o, hw, hd, h) => {
      const ex = hw * Math.abs(Math.cos(fYaw)) + hd * Math.abs(Math.sin(fYaw)), ez = hw * Math.abs(Math.sin(fYaw)) + hd * Math.abs(Math.cos(fYaw));
      return { minX: o.x - ex, maxX: Math.min(L.x1, o.x + ex), minZ: o.z - ez, maxZ: o.z + ez, h };
    };
    obstacles.push(aabb(F, 0.95, 0.42, 0.95), aabb(T0, 0.45, 0.225, 0.44));

    // The crew, in the order they joined: two on the futon, two at the desk chairs, the fifth by the hallway
    const seats = [
      { ...toWorld(-0.45, 0.06, F), yaw: fYaw, seatY: 0.44 },
      { ...toWorld(0.45, 0.06, F), yaw: fYaw, seatY: 0.44 },
      { x: chairs[0].x, z: chairs[0].z + 0.02, yaw: 0, seatY: 0.5 },
      { x: chairs[1].x, z: chairs[1].z + 0.02, yaw: 0, seatY: 0.5 },
      { x: L.x0 + 0.6, z: L.hallZ1 + 0.8, yaw: Math.atan2(F.x - (L.x0 + 0.6), F.z - (L.hallZ1 + 0.8)), seatY: 0 },
    ];
    const crewSeats = [];
    const crew = crewMembers();
    crew.forEach((id, i) => {
      const s = seats[i], ch = CHARACTERS[id];
      if (!s || !ch) return;
      const kid = createKid(ch, CREW_GUNS[id] || 'pistol');
      kid.gunGroup.visible = false;   // no guns in the house
      if (s.seatY) poseKidSeated(kid, s.seatY); else setKidCrouch(kid, 0);
      kid.group.position.set(s.x, 0, s.z); kid.group.rotation.y = s.yaw;
      scene.add(kid.group);
      if (!s.seatY) obstacles.push({ minX: s.x - 0.25, maxX: s.x + 0.25, minZ: s.z - 0.25, maxZ: s.z + 0.25, h: 1.6 });
      crewSeats.push({ id, x: s.x, z: s.z, seated: !!s.seatY, group: kid.group });
      const it = {
        type: 'crew_kid', crewId: id, line: -1,
        box: new THREE.Box3().setFromObject(kid.group),
        pos: new THREE.Vector3(s.x, 1.0, s.z),
        prompt: `Talk to ${ch.name}`,
        label: ch.name, icon: 'crew', labelY: s.seatY ? 1.5 : 1.85,
        action: () => crewHomeTalk(it),
      };
      Game.interactables.push(it);
    });

    // The top of the stairs → the backyard range (v1.257's back door, moved here)
    const stairsZ = L.z1 - 0.35;
    Game.interactables.push({
      type: 'back_door',
      box: new THREE.Box3(new THREE.Vector3(L.stairX0, -1, L.z1 - 0.1), new THREE.Vector3(L.stairX1, 2.2, L.z1 + 1.0)),
      pos: new THREE.Vector3((L.stairX0 + L.stairX1) / 2, 1.0, stairsZ),
      prompt: 'Go out back (the range)',
      label: 'Backyard', icon: 'outside', labelY: 1.7,
      action: () => enterRange(),
    });
    return {
      obstacles, crewSeats,
      stairsSpawn: new THREE.Vector3((L.stairX0 + L.stairX1) / 2, 0, stairsZ), stairsYaw: 0.35,   // facing into the landing
    };
  }

  // ============================================================
  // SPAWN + BOUNDS + OBSTACLES
  // ============================================================
  // Player spawns at south end of hall, facing north (into bedroom)
  const spawn = new THREE.Vector3(HALL_X, 0, hallSouthZ - 0.5);
  const spawnYaw = 0;   // facing -Z (north)

  // Bounds: encompass everything (with a tiny padding)
  // v1.376 (D.74): out to the hallway's end in the west and the desk recess's back wall in the south; the blockers
  // below keep you on the floor you can walk (the stairwell's top is an invisible wall).
  const bounds = {
    minX: LAND.hallX0 - 0.5,
    maxX: BCL_EAST + 0.4,
    minZ: -BR_D/2 - AL_DEPTH - 0.4,
    maxZ: LAND.recessZ - 0.05,
  };

  // Obstacle approach: block everything OUTSIDE the walkable L (bedroom + alcove + hall),
  // then add furniture obstacles.
  // Walkable L:
  //   Bedroom: x ∈ [-BR_W/2, BR_W/2], z ∈ [-BR_D/2, BR_D/2]
  //   Alcove:  x ∈ [AL_X - AL_W/2, AL_X + AL_W/2], z ∈ [-BR_D/2 - AL_DEPTH, -BR_D/2]
  //   Hall:    x ∈ [-HALL_W/2, HALL_W/2], z ∈ [BR_D/2, hallSouthZ]
  const obstacles = [
    // === Outside-the-L blockers ===
    // North of bedroom, west of alcove
    { minX: bounds.minX, maxX: AL_X - AL_W/2, minZ: bounds.minZ, maxZ: -BR_D/2 },
    // North of bedroom, east of alcove
    { minX: AL_X + AL_W/2, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: -BR_D/2 },
    // West of bedroom + west of hallway (one big sliver outside west wall)
    { minX: bounds.minX, maxX: -BR_W/2, minZ: -BR_D/2, maxZ: BR_D/2 },
    // East of bedroom (outside east wall, north of big closet)
    { minX: BR_W/2, maxX: bounds.maxX, minZ: -BR_D/2, maxZ: BR_D/2 },
    // South of bedroom, west of hall — covers bathroom area and any empty pockets
    { minX: bounds.minX, maxX: -HALL_W/2, minZ: BR_D/2, maxZ: hallSouthZ },
    // South of bedroom, east of hall — covers hall closet area, big closet, and pockets
    { minX: HALL_W/2, maxX: bounds.maxX, minZ: BR_D/2, maxZ: hallSouthZ },
    // v1.376 (D.74): round the landing, its hallway and the desk recess; the stairwell's top
    { minX: bounds.minX, maxX: LAND.x0, minZ: hallSouthZ, maxZ: LAND.hallZ0 },          // west of the landing, north of its hallway
    { minX: bounds.minX, maxX: LAND.x0, minZ: LAND.hallZ1, maxZ: bounds.maxZ },        // and south of it
    { minX: bounds.minX, maxX: LAND.hallX0, minZ: LAND.hallZ0, maxZ: LAND.hallZ1 },    // the hallway's end wall (the far-end door)
    { minX: LAND.x1, maxX: bounds.maxX, minZ: hallSouthZ, maxZ: bounds.maxZ },         // east of the landing (the window wall)
    { minX: bounds.minX, maxX: LAND.recessX0, minZ: LAND.z1, maxZ: bounds.maxZ },      // the south wall west of the recess
    { minX: LAND.recessX1, maxX: bounds.maxX, minZ: LAND.z1, maxZ: bounds.maxZ },      // the recess's east side and the stairwell's top
    ...landing.obstacles,

    // === Furniture obstacles (inside the L) ===
    // Bed (footprint) — against the east wall, headboard east
    { minX: BR_W/2 - 2.05, maxX: BR_W/2 - 0.05, minZ: -0.75, maxZ: 0.75 },
    // North nightstand
    { minX: BR_W/2 - 0.65, maxX: BR_W/2 - 0.05, minZ: -1.35, maxZ: -0.75 },
    // South nightstand
    { minX: BR_W/2 - 0.65, maxX: BR_W/2 - 0.05, minZ: 0.75, maxZ: 1.35 },
    // Desk (in alcove)
    { minX: AL_X - 0.9, maxX: AL_X + 0.9, minZ: -BR_D/2 - AL_DEPTH + 0.05, maxZ: -BR_D/2 - AL_DEPTH + 0.65 },
    // Computer tower (under desk)
    { minX: AL_X + 0.55, maxX: AL_X + 0.75, minZ: -BR_D/2 - AL_DEPTH + 0.15, maxZ: -BR_D/2 - AL_DEPTH + 0.55 },
    // Bookcase 1 (north)
    { minX: -BR_W/2 + 0.05, maxX: -BR_W/2 + 0.45, minZ: -2.05, maxZ: -1.15 },
    // Bookcase 2 (south)
    { minX: -BR_W/2 + 0.05, maxX: -BR_W/2 + 0.45, minZ: 1.15, maxZ: 2.05 },
    // Map table
    { minX: -BR_W/2 + 0.12, maxX: -BR_W/2 + 0.78, minZ: -0.5, maxZ: 0.5 },
    // Floor lamp (NE corner)
    { minX: BR_W/2 - 0.55, maxX: BR_W/2 - 0.25, minZ: -BR_D/2 + 0.25, maxZ: -BR_D/2 + 0.55 },
  ];

  return {
    scene,
    spawn,
    spawnYaw,
    bounds,
    obstacles,
    stairsSpawn: landing.stairsSpawn, stairsYaw: landing.stairsYaw,   // v1.376: home from the range
    crewSeats: landing.crewSeats, landing: LAND,
    vault: { wallH: BR_H, ridgeH: BR_RIDGE, dormerH: AL_H, winTop: WIN_BOTTOM + WIN_H + WIN_W / 2 },   // v1.378
  };
}
