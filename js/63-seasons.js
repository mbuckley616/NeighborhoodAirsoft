// ----------------------------------------------------------------------
// v1.485 (backlog D.96, Michael: B, 21 Nov 2026: "A, and the weather changes play"): the seasons. After the summer come
// two chapters on the maps you know, Fall 2003 and Winter 2003-04. A match says which season it is in (`sc.season`:
// 'fall' or 'winter'; none is the summer, which stays exactly as it was). This file is the look: once a map is built,
// applySeasonLook() passes over it and turns the summer's greens to the season's (lawns to straw and trees to orange
// and gold in fall; lawns to snow and trees frosted or dark in winter), shifts the sky, fog and light, and lays the
// falling leaves or snow round the camera (seasonStep, each step of a match). Every map is built from its own colours,
// so the pass recolours copies of the materials and vertex colours it finds, never the shared ones: the next summer
// match is untouched. It draws no game random numbers, so a map's cover layout is the same in every season. Nothing it
// adds is solid. The weather's rules of play come in later versions.
// ----------------------------------------------------------------------
const SEASONS = ['fall', 'winter'];
const Season = { force: null, now: null, fx: null,   // force: tests ('summer' | 'fall' | 'winter'); now: the match's season
  wind: null, moveMult: 1, prints: null };              // v1.487: the weather's rules (below)
// The season a scenario is played in: null for the summer
function seasonOf(sc) {
  if (Season.force) return Season.force === 'summer' ? null : Season.force;
  const s = sc && sc.season;
  return SEASONS.includes(s) ? s : null;
}
// A steady number in [0, 1) from a colour, so one tree's green always turns the same orange
function seasonHash(hex) {
  let h = (hex ^ 0x5bd1e995) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
const _seasonHSL = { h: 0, s: 0, l: 0 };
// One colour in its season. `role` is 'ground' (lawns, verges, the ground's own mesh), 'pine' (a cone) or 'leaf'
// (trees, hedges, bushes). Only the summer's greens change, and in winter the bare dirt of the ground too; every other colour (paint,
// brick, asphalt, cardboard, a car) is left alone. Writes into `out` (a THREE.Color) and returns whether it changed.
function seasonColor(color, role, season, out) {
  color.getHSL(_seasonHSL);
  const { h, s, l } = _seasonHSL;
  const green = h >= 0.17 && h <= 0.47 && s > 0.1 && l > 0.04 && l < 0.85;
  const dirt = role === 'ground' && h >= 0.04 && h < 0.17 && s > 0.08 && s < 0.6 && l > 0.12 && l < 0.6;
  const v = seasonHash(color.getHex());
  if (role === 'pine') {                          // a pine keeps its needles: green in fall, dark or frosted in winter
    if (!green || season !== 'winter') return false;
    if (v < 0.3) out.setHSL(0.55, 0.08, 0.78 + 0.08 * v);
    else out.setHSL(h, s * 0.7, Math.max(0.07, l * 0.8));
    return true;
  }
  if (season === 'fall') {
    if (!green) return false;
    if (role === 'ground') {                      // lawns gone dry: straw with a little green left in it
      out.setHSL(0.15 - 0.03 * v, Math.min(1, s * 0.75 + 0.05), Math.min(0.8, l * 1.08));
    } else if (v < 0.14) {                        // one tree in seven keeps its green a while
      out.setHSL(h * 0.85 + 0.03, s * 0.8, l);
    } else {                                      // orange, red-orange, gold, brown
      const hues = [0.075, 0.035, 0.115, 0.06];
      const k = Math.floor((v - 0.14) / 0.86 * hues.length) % hues.length;
      out.setHSL(hues[k], Math.min(0.95, s * 1.3 + 0.2), Math.min(0.7, l * 1.15 + 0.04));
    }
    return true;
  }
  if (season === 'winter') {
    if (role === 'ground' && (green || dirt)) {   // snow, a touch blue in the low places
      out.setHSL(0.6, 0.14 + 0.06 * v, 0.84 + 0.08 * v);
      return true;
    }
    if (!green) return false;
    if (v < 0.5) out.setHSL(0.58, 0.1, 0.74 + 0.1 * v);       // frosted
    else out.setHSL(0.38, s * 0.55, Math.max(0.08, l * 0.75)); // an evergreen, dark in the cold
    return true;
  }
  return false;
}
// What a mesh is: the ground (low and flat, or a plane, or the map's big ground) or something standing (trees, hedges)
function seasonRole(mesh, box, size) {
  if (mesh.userData && mesh.userData.seasonRole) return mesh.userData.seasonRole;   // a pine's crown says so
  if (mesh.geometry && mesh.geometry.type === 'PlaneGeometry') return 'ground';
  if (size.y < 0.6 && box.max.y < 1.2) return 'ground';
  if (size.x * size.z > 20000) return 'ground';
  if (mesh.geometry && mesh.geometry.type === 'ConeGeometry') return 'pine';
  return 'leaf';
}
// The pass over a built map. `built` is a scene builder's result; `timeOfDay` is 'day' or 'night'.
function applySeasonLook(built, season, timeOfDay, matchId) {
  Season.now = season || null;
  Season.fx = null;
  seasonWeather(built, season, timeOfDay, matchId);   // v1.487: the wind, the deep snow, the footprints
  if (!season || !built || !built.scene) return null;
  const scene = built.scene;
  const skip = new Set();
  for (const e of (built.enemies || [])) if (e.mesh && e.mesh.group) skip.add(e.mesh.group);
  const matMemo = new Map(), geoMemo = new Map();
  const box = new THREE.Box3(), size = new THREE.Vector3(), tmp = new THREE.Color();
  let mats = 0, verts = 0;
  const meshes = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p; p = p.parent) if (skip.has(p) || (p.userData && p.userData.noSeason)) return;
    meshes.push(o);
  });
  scene.updateMatrixWorld(true);
  for (const o of meshes) {
    box.setFromObject(o); box.getSize(size);
    const role = seasonRole(o, box, size);
    // the material: a recoloured copy, one per material and role
    const swap = m => {
      if (!m || !m.color || m.type === 'MeshBasicMaterial') return m;
      const key = m.uuid + '|' + role;
      if (matMemo.has(key)) return matMemo.get(key);
      let out = m;
      if (seasonColor(m.color, role, season, tmp)) { out = m.clone(); out.color.copy(tmp); mats++; }
      matMemo.set(key, out);
      return out;
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    // vertex colours: a recoloured copy of the geometry; a vertex on a flat, upward face is ground
    const g = o.geometry, col = g && g.attributes && g.attributes.color;
    const usesVC = col && (Array.isArray(o.material) ? o.material.some(m => m && m.vertexColors) : o.material && o.material.vertexColors);
    if (!usesVC) continue;
    let ng = geoMemo.get(g.uuid);
    if (!ng) {
      ng = g.clone();
      const c = ng.attributes.color, n = ng.attributes.normal, big = size.x * size.z > 20000;
      const out = new THREE.Color();
      for (let i = 0; i < c.count; i++) {
        tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i));
        const vRole = !big ? role : (n && n.getY(i) > 0.9 ? 'ground' : 'leaf');   // a big mesh (ground and scenery): by its faces
        if (seasonColor(tmp, vRole, season, out)) { c.setXYZ(i, out.r, out.g, out.b); verts++; }
      }
      c.needsUpdate = true;
      geoMemo.set(g.uuid, ng);
    }
    o.geometry = ng;
  }
  seasonSky(scene, season, timeOfDay);
  const fx = seasonParticles(scene, season, timeOfDay);
  const forts = season === 'winter' ? seasonSnowForts(built) : 0;   // v1.488: the boxes are snow blocks
  const info = { season, mats, verts, particles: fx ? fx.count : 0, forts };
  scene.userData.season = info;
  return info;
}
// The sky, the fog and the light. Fall: a warm, low, hazy sun. Winter: an overcast white sky, closer fog, cool light.
function seasonSky(scene, season, timeOfDay) {
  const night = timeOfDay === 'night';
  const S = season === 'fall'
    ? { bg: night ? null : 0xb4b0a4, mix: 0.45, fog: 0.88, sun: 0xffcf96, sunK: 0.92, amb: 0xc8bca8, ambK: 1, hemi: 0xd8c8b0 }
    : { bg: night ? 0x1c2536 : 0xc6ced8, mix: night ? 0.5 : 0.8, fog: 0.72, sun: 0xe4ecf8, sunK: 0.78, amb: 0xc8d4e4, ambK: 1.3, hemi: 0xe4ecf4 };
  if (scene.background && scene.background.isColor && S.bg != null) scene.background.lerp(new THREE.Color(S.bg), S.mix);
  if (scene.fog) {
    if (scene.background && scene.background.isColor) scene.fog.color.copy(scene.background);
    scene.fog.near *= S.fog; scene.fog.far *= S.fog;
  }
  scene.traverse(o => {
    if (night) {
      if (o.isAmbientLight && season === 'winter') o.intensity *= 1.25;   // snow throws the light back
      return;
    }
    if (o.isDirectionalLight) { o.color.lerp(new THREE.Color(S.sun), 0.7); o.intensity *= S.sunK; }
    else if (o.isAmbientLight) { o.color.lerp(new THREE.Color(S.amb), 0.6); o.intensity *= S.ambK; }
    else if (o.isHemisphereLight) { o.color.lerp(new THREE.Color(S.hemi), 0.6); }
    else if (o.isMesh && o.material && o.material.type === 'MeshBasicMaterial' && o.geometry && o.geometry.type === 'SphereGeometry'
             && o.position.length() > 100 && season === 'winter') {
      o.material = o.material.clone(); o.material.opacity = (o.material.transparent ? 0.08 : 1);   // the sun behind cloud
      if (!o.material.transparent) o.material.color.lerp(new THREE.Color(0xf4f6fa), 0.6);
    }
  });
}
// Falling leaves or snow in a box round the camera, wrapped as you move, so there is always some in view.
// One Points mesh, one draw call; never solid, never shot.
const SEASON_FX = {
  fall:   { count: 260, size: 0.16, fall: 0.9, sway: 1.1, drift: 0.6, colors: [0xc8621e, 0xd8902a, 0xa8401c, 0xe0b040, 0x8a5a2a] },
  winter: { count: 900, size: 0.09, fall: 1.3, sway: 0.35, drift: 0.15, colors: [0xffffff, 0xf0f4fa] },
};
const SEASON_BOX = { x: 32, y: 16, z: 32 };
function seasonParticles(scene, season, timeOfDay) {
  const S = SEASON_FX[season];
  if (!S) return null;
  let seed = season === 'fall' ? 1103 : 2207;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pos = new Float32Array(S.count * 3), col = new Float32Array(S.count * 3), phase = new Float32Array(S.count);
  const c = new THREE.Color();
  const cam = (Game.camera && Game.camera.position) || new THREE.Vector3();
  for (let i = 0; i < S.count; i++) {
    pos[i * 3] = cam.x + (rnd() - 0.5) * SEASON_BOX.x;
    pos[i * 3 + 1] = cam.y + (rnd() - 0.4) * SEASON_BOX.y;
    pos[i * 3 + 2] = cam.z + (rnd() - 0.5) * SEASON_BOX.z;
    c.setHex(S.colors[Math.floor(rnd() * S.colors.length)]);
    if (timeOfDay === 'night') c.multiplyScalar(0.45);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    phase[i] = rnd() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: S.size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'seasonFx';
  pts.frustumCulled = false;
  pts.userData.noSeason = true;
  scene.add(pts);
  Season.fx = { pts, phase, spec: S, t: 0, count: S.count };
  return Season.fx;
}
// One step of the falling leaves or snow (stepGame, in a match)
function seasonStep(dt) {
  if (Season.prints) seasonPrintsStep(dt);   // v1.487: footprints in the snow
  const fx = Season.fx;
  if (!fx || !fx.pts.parent || fx.pts.parent !== Game.scene) return;
  fx.t += dt;
  const S = fx.spec, a = fx.pts.geometry.attributes.position, p = a.array, cam = Game.camera.position;
  const hx = SEASON_BOX.x / 2, hz = SEASON_BOX.z / 2, lo = cam.y - SEASON_BOX.y * 0.4, hi = lo + SEASON_BOX.y;
  for (let i = 0; i < fx.count; i++) {
    const k = i * 3, ph = fx.phase[i];
    const W = Season.wind, wv = W ? seasonWindNow() * 0.5 : 0;   // v1.487: the leaves blow the way the wind does
    p[k] += (Math.sin(fx.t * 1.3 + ph) * S.sway + (W ? W.x * wv : S.drift)) * dt;
    p[k + 1] -= S.fall * (0.75 + 0.5 * ((ph * 7) % 1)) * dt;
    p[k + 2] += (Math.cos(fx.t * 0.9 + ph) * S.sway * 0.6 + (W ? W.z * wv : 0)) * dt;
    if (p[k + 1] < lo) p[k + 1] += SEASON_BOX.y;   // round again from the top
    else if (p[k + 1] > hi) p[k + 1] -= SEASON_BOX.y;
    if (p[k] < cam.x - hx) p[k] += SEASON_BOX.x; else if (p[k] > cam.x + hx) p[k] -= SEASON_BOX.x;
    if (p[k + 2] < cam.z - hz) p[k + 2] += SEASON_BOX.z; else if (p[k + 2] > cam.z + hz) p[k + 2] -= SEASON_BOX.z;
  }
  a.needsUpdate = true;
}

// ----------------------------------------------------------------------
// v1.486 (D.96 step 2): the two chapters. Each is four places with three matches each. The matches are the summer's own
// matchups replayed later in the year: a season match copies its summer match (`base`: the same kids, the same rules
// and the same cover, since it is built under the base match's seed) and gives it a new name, a new story and its
// season. Your crew comes along as it does in the summer. They come on the ladder after the summer
// (`SEASON_LADDER`, 90-progression): Fall opens when the Last Saturday is won, Winter when the fall's last match is.
// The summer's own matches are not touched.
// ----------------------------------------------------------------------
const SEASON_CHAPTERS = [
  { season: 'fall', name: 'Fall 2003', zones: [
    { key: 'fall_winnmark', pin: 'winnmark_court', name: 'Winnmark Court', region: 'horseshoe_bend', when: 'September', matches: [
      { id: 'fall_wk_wingman', base: 'winnmark_team_2v2', scenarioName: 'First Saturday Back',
        desc: "School's back and the first Saturday is warm enough. Seth's on your side again, against Trey and Brooke and whoever they bring, before the leaves come down for good. Same yards, less shade." },
      { id: 'fall_wk_leaf_fort', base: 'winnmark_defend_culdesac', scenarioName: 'The Leaf-Pile Fort',
        desc: "Somebody raked the whole cul-de-sac into one pile and built the plank fort around it. Seth, Trey and Devon want it. Hold out till the clock runs down." },
      { id: 'fall_wk_squad', base: 'winnmark_team_3v3', scenarioName: 'Sweatshirt Weather',
        desc: "Teams on Winnmark, hoods up. Seth and Trey are with you against Brooke, Jamie and Marcus's side, and it gets dark earlier now." },
    ] },
    { key: 'fall_hollow', pin: 'hollow', name: 'The Hollow · Chattahoochee', region: 'east_roswell', when: 'late September', matches: [
      { id: 'fall_hw_leaves', base: 'hollow_skirmish_3v3', scenarioName: 'Leaves Underfoot',
        desc: "The woods are loud now: every step crunches. Your crew's with you against Seth's side. They'll hear you coming, but you'll hear them too." },
      { id: 'fall_hw_north_fort', base: 'hollow_attack_north_fort', scenarioName: 'The North Fort in October',
        desc: "Mitchell's lot took the north fort back over the summer's end. The trees are thinner, so you can see them better, and they can see you." },
      { id: 'fall_hw_big', base: 'hollow_big_battle', scenarioName: 'The Fall Big Game',
        desc: "Everybody's back from vacation, so it's the Big Game again, everybody in, with the woods gone orange." },
    ] },
    { key: 'fall_school', pin: 'high_school', name: 'Hollins Ridge High', region: 'east_roswell', when: 'October', matches: [
      { id: 'fall_hs_portables', base: 'school_portables_3v3', scenarioName: 'After the Last Bell',
        desc: "The high schoolers have gone home, the lot's empty, and Caleb's crew is at the portables. Bring yours. You've got till the streetlights come on." },
      { id: 'fall_hs_homecoming', base: 'school_defend_portables', scenarioName: 'Homecoming Week',
        desc: "Homecoming banners on every portable. Hold the steps against Caleb's crew until the timer's done." },
      { id: 'fall_hs_lights', base: 'school_night_4v4', scenarioName: 'Under the Stadium Lights',
        desc: "There's a game Friday, and the stadium's lights are on early. Both crews, on the cold side of the bleachers." },
    ] },
    { key: 'fall_bunratty', pin: 'bunratty_court', name: 'Bunratty Court', region: 'sentinel', when: 'the end of October', matches: [
      { id: 'fall_bn_raking', base: 'bunratty_team_2v2', scenarioName: 'Raking Season',
        desc: "Your dad says rake the yard. Sean says rematch first. Ryan and Mitchell's side are waiting in the leaves." },
      { id: 'fall_bn_hold', base: 'bunratty_hold_the_fort', scenarioName: 'Hold the Court Before Dark',
        desc: "It's dark by six now. Hold the cul-de-sac against Mitchell's side until the timer's done, then everybody goes in for dinner." },
      { id: 'fall_bn_halloween', base: 'bunratty_night_team_2v2', scenarioName: 'Halloween Night', holiday: 'halloween',
        desc: "Trick-or-treating's done, the candy's counted, and the whole street's still out in costume. Sean's with you. Ryan and Mitchell's side are somewhere past the jack-o'-lanterns." },
    ] },
  ] },
  { season: 'winter', name: 'Winter 2003-04', zones: [
    { key: 'winter_bunratty', pin: 'bunratty_court', name: 'Bunratty Court', region: 'sentinel', when: 'December', matches: [
      { id: 'winter_bn_first_snow', base: 'bunratty_team_2v1', scenarioName: 'First Snow',
        desc: "It actually snowed. Not much, but enough. Nick's with you against Sean's side, before it melts." },
      { id: 'winter_bn_storm', base: 'bunratty_storm_the_court', scenarioName: 'Storm the Snowy Court',
        desc: "Mitchell's side have dug in at the cul-de-sac. Go take it. Stay off the ice on the driveways." },
      { id: 'winter_bn_crew', base: 'bunratty_team_4v4', scenarioName: 'Christmas Break',
        desc: "No school for two weeks. Mitchell's whole crew is out in their new coats, and so is yours." },
    ] },
    { key: 'winter_northcliff', pin: 'northcliff', name: "Northcliff / Martin's Landing", region: 'northcliff', when: 'Christmas week', matches: [
      { id: 'winter_bf_bulb', base: 'bellfield_3v3', scenarioName: 'Bellfield in the Snow',
        desc: "Andrew and Evan are with you on Bellfield against Christian's side. The bulb's white over and every yard has lights up." },
      { id: 'winter_bf_fort', base: 'bellfield_defend_fort', scenarioName: 'Hold the Snow Fort',
        desc: "The bulb fort's got a foot of snow on it now. Hold it against Mason's crew until the timer's done." },
      { id: 'winter_bf_lamplight', base: 'bellfield_night_4v4', scenarioName: 'Lamplight in the Snow',
        desc: "Teams on Bellfield after dark, the streetlamps on the snow. Haden, Connor and Evan have your back." },
    ] },
    { key: 'winter_market', pin: 'market_lot', name: 'Riverside Market', region: 'east_roswell', when: 'January', matches: [
      { id: 'winter_lot_corral', base: 'lot_team_3v3', scenarioName: 'Cart Corral on Ice',
        desc: "The lot's half plowed. Your crew against Marcus's, between the snowbanks." },
      { id: 'winter_lot_doors', base: 'lot_defend_store', scenarioName: 'Snowed In at the Doors',
        desc: "Hold the store's doors against Marcus's crew till the timer's done. The automatic doors keep opening on you." },
      { id: 'winter_lot_close', base: 'lot_night_4v4', scenarioName: 'After Close in January',
        desc: "The store's shut early for the weather and the lot's lit and empty. Seth's crew is out there, and so is yours." },
    ] },
    { key: 'winter_winnmark', pin: 'winnmark_court', name: 'Winnmark Court', region: 'horseshoe_bend', when: 'February', matches: [
      { id: 'winter_wk_short', base: 'winnmark_team_2v3', scenarioName: 'Cold Hands',
        desc: "Seth's with you against Trey, Brooke and Jamie's side. Gloves make the trigger hard to find." },
      { id: 'winter_wk_treehouse', base: 'winnmark_defend_treehouse', scenarioName: 'The Treehouse in the Snow',
        desc: "Marcus and Jamie want the treehouse, and its ladder is icy. Hold it till the timer's done." },
      { id: 'winter_wk_snow_day', base: 'winnmark_team_3v3', scenarioName: 'Snow Day',
        desc: "School's cancelled. The whole court's white and everybody's out. Seth and Trey are with you against Brooke, Jamie and Marcus's side, one last game before it melts." },
    ] },
  ] },
];
// The season matches as scenarios: a copy of the base with the chapter's name, story and season
for (const ch of SEASON_CHAPTERS) for (const z of ch.zones) for (const m of z.matches) {
  const base = SCENARIOS[m.base];
  if (!base) continue;
  SCENARIOS[m.id] = Object.assign({}, base, {
    scenarioName: m.scenarioName, desc: m.desc, season: ch.season, seasonBase: m.base,
    seedFrom: base.seedFrom || m.base,   // the summer match's cover, laid out the same
  }, m.holiday ? { holiday: m.holiday } : {});
}
// The season's zones, in ladder order (90-progression puts them after the summer's)
const SEASON_ZONES = SEASON_CHAPTERS.flatMap(ch => ch.zones.map(z => ({ key: z.key, pin: z.pin, name: z.name, region: z.region, season: ch.season, when: z.when })));
function seasonZone(key) { return SEASON_ZONES.find(z => z.key === key) || null; }
function seasonChapter(season) { return SEASON_CHAPTERS.find(ch => ch.season === season) || null; }

// ----------------------------------------------------------------------
// v1.487 (D.96 step 3, Michael: B, "A, and the weather changes play"): the weather's rules.
// - Fall, by day, is gusty. The wind pushes every BB in the air one way, harder in the gusts, from the point where the
//   BB's own curve starts (its gun's `curveOnsetDistance`, 4 m for most), so a shot inside about 10 m goes where it was
//   aimed and a long one drifts: the wobble you know, pushed one way. Both sides' BBs drift alike. The day's wind comes
//   from the match (the same every time you play it), and the falling leaves blow the same way, which is how you read it.
// - Winter: deep snow. Everybody moves at 85% (you and every kid, sprinting or not).
// - Winter: footprints. You and every kid leave prints in the snow as you walk, and they fill in over 30 s. A kid who
//   comes within 4 m of his target's trail while he can't see him follows it: he knows where its newest print is, as if
//   he had seen him there then (the way he reads a glow-stick tracer, v1.468), and plays it as a kid who just lost sight.
// ----------------------------------------------------------------------
const WIND_ACCEL = [2.5, 4.5];      // m/s² across the BB's path, the calm and the strong day (a gust adds up to 35%)
const SNOW_MOVE_MULT = 0.85;
const PRINT_STEP = 0.8, PRINT_LIFE = 30, PRINT_FOLLOW_M = 4, PRINT_MAX = 600;
function seasonWeather(built, season, timeOfDay, matchId) {
  Season.wind = null; Season.moveMult = 1;
  if (Season.prints && Season.prints.mesh && Season.prints.mesh.parent) Season.prints.mesh.parent.remove(Season.prints.mesh);
  Season.prints = null;
  if (season === 'fall' && timeOfDay !== 'night') {
    const k = 'wind|' + (matchId || ''), h1 = seasonHash(_hashStringToSeed(k)), h2 = seasonHash(_hashStringToSeed(k + '|s'));
    const a = h1 * Math.PI * 2;
    Season.wind = { x: Math.cos(a), z: Math.sin(a), accel: WIND_ACCEL[0] + (WIND_ACCEL[1] - WIND_ACCEL[0]) * h2, phase: h1 * 10 };
  }
  if (season === 'winter') {
    Season.moveMult = SNOW_MOVE_MULT;
    if (built && built.scene) Season.prints = seasonPrintField(built.scene);
  }
}
// The wind's push now, in m/s² (gusting over the round)
function seasonWindNow() {
  const W = Season.wind;
  if (!W) return 0;
  const t = (Game.scenario && Game.scenario.roundTime) || 0;
  return W.accel * (0.8 + 0.2 * Math.sin(t * 0.7 + W.phase) + 0.15 * Math.max(0, Math.sin(t * 2.3 + W.phase * 3)));
}
// One step of a BB in the wind (updateBBs); `ramp` is 0 inside the BB's curve onset and 1 past it
function seasonWindOnBB(bb, ramp, dt) {
  const W = Season.wind;
  if (!W || !(ramp > 0)) return;
  const a = seasonWindNow() * ramp * dt;
  bb.vel.x += W.x * a; bb.vel.z += W.z * a;
}
// The footprints: one instanced mesh of small dark ovals on the snow, each fading back to snow over PRINT_LIFE
function seasonPrintField(scene) {
  const geo = new THREE.CircleGeometry(0.5, 8);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.InstancedMesh(geo, mat, PRINT_MAX);
  mesh.name = 'seasonPrints';
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.userData.noSeason = true;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PRINT_MAX * 3), 3);
  scene.add(mesh);
  return { mesh, list: [], next: 0, last: new Map(), side: new Map() };
}
const _printM = new THREE.Matrix4(), _printQ = new THREE.Quaternion(), _printS = new THREE.Vector3(0.11, 1, 0.24), _printP = new THREE.Vector3();
const _printUp = new THREE.Vector3(0, 1, 0), _printSnow = new THREE.Color(0xdfe6ef), _printDark = new THREE.Color(0x7d8a9e), _printC = new THREE.Color();
// Lay a print for a walker who has gone PRINT_STEP since his last one
function seasonPrintStep(by, pos, now) {
  const F = Season.prints;
  const last = F.last.get(by);
  if (last && Math.hypot(pos.x - last.x, pos.z - last.z) < PRINT_STEP) return;
  F.last.set(by, { x: pos.x, z: pos.z });
  if (!last) return;
  const yaw = Math.atan2(pos.x - last.x, pos.z - last.z), side = F.side.get(by) ? 1 : -1;
  F.side.set(by, !F.side.get(by));
  const x = pos.x + Math.cos(yaw) * 0.1 * side, z = pos.z - Math.sin(yaw) * 0.1 * side;
  const fn = Game.scenario && Game.scenario.groundY;
  const y = (typeof fn === 'function' ? fn(x, z) : 0);
  const i = F.next; F.next = (F.next + 1) % PRINT_MAX;
  F.list[i] = { x, z, y, t: now, by };
  _printQ.setFromAxisAngle(_printUp, yaw); _printP.set(x, y + 0.02, z);
  F.mesh.setMatrixAt(i, _printM.compose(_printP, _printQ, _printS));
  F.mesh.setColorAt(i, _printDark);
  F.mesh.count = Math.max(F.mesh.count, i + 1);
  F.mesh.instanceMatrix.needsUpdate = true; F.mesh.instanceColor.needsUpdate = true;
}
// Each step of a winter match: prints for everyone walking, and the old ones filling in
function seasonPrintsStep(dt) {
  const F = Season.prints;
  if (!F || !F.mesh.parent || F.mesh.parent !== Game.scene || Game.mode !== 'scenario') return;
  const now = aiNow();
  if (Game.player.onGround !== false) seasonPrintStep(Game.player, Game.player.pos, now);
  for (const e of (Game.scenario.enemies || [])) if (e.health > 0 && e.pos && !e.remote) seasonPrintStep(e, e.pos, now);
  F._fadeT = (F._fadeT || 0) + dt;
  if (F._fadeT < 0.5) return;   // the filling-in, twice a second
  F._fadeT = 0;
  for (let i = 0; i < F.list.length; i++) {
    const p = F.list[i];
    if (!p) continue;
    const k = Math.min(1, (now - p.t) / PRINT_LIFE);
    F.mesh.setColorAt(i, _printC.copy(_printDark).lerp(_printSnow, k));
  }
  F.mesh.instanceColor.needsUpdate = true;
}
// A kid on his target's trail: the newest print of it (fresher than PRINT_LIFE), if one of them is within PRINT_FOLLOW_M
// of him, else null. Read by the kids' spotted memory (80-ai) when he has no line.
function seasonTrailFor(e, ref) {
  const F = Season.prints;
  if (!F || !ref || !e.pos) return null;
  const now = aiNow();
  let near = false, newest = null;
  for (const p of F.list) {
    if (!p || p.by !== ref || now - p.t > PRINT_LIFE) continue;
    if (!newest || p.t > newest.t) newest = p;
    if (!near && Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < PRINT_FOLLOW_M) near = true;
  }
  return near ? newest : null;
}

// ----------------------------------------------------------------------
// v1.488 (D.96 step 4, Michael: B, "snow forts can be knocked down"): in winter every cardboard box on the map
// (addHomeDepotBox, the cover the summer's matches are built round) is a block of packed snow instead, where it stood
// and as big. A BB that hits one is swallowed with a puff, and every hit counts, from either side: at SNOW_SLUMP_HITS
// it slumps to a bit over half its height (you can shoot over it, and a kid no longer picks it as cover to stand behind),
// and at SNOW_FALL_HITS it falls in and is gone from the map's obstacles and cover. Nothing else on the map breaks.
// ----------------------------------------------------------------------
const SNOW_SLUMP_HITS = 15, SNOW_FALL_HITS = 30, SNOW_SLUMP_H = 0.55;
function seasonSnowForts(built) {
  let n = 0;
  const snow = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 1 });
  const shade = new THREE.MeshStandardMaterial({ color: 0xc9d4e2, roughness: 1 });
  for (const o of (built.obstacles || [])) {
    const g = o && o.mesh;
    if (!g || !g.userData || !g.userData.cardboardBox) continue;
    let k = 0;
    g.traverse(m => { if (m.isMesh) m.material = (k++ === 0 ? snow : shade); });
    o.surface = 'snow'; o.snowFort = { hits: 0, h0: o.h, stage: 0 };
    g.userData.noSeason = true;
    n++;
  }
  return n;
}
// A BB hits a snow block (updateBBs): it is swallowed, and the block takes the hit. Returns true (the BB is gone).
function seasonSnowHit(o, bb) {
  const f = o.snowFort;
  f.hits++;
  if (typeof playImpactCardboard === 'function') playImpactCardboard(bb.pos);
  seasonSnowPuff(bb.pos);
  if (f.stage === 0 && f.hits >= SNOW_SLUMP_HITS) {
    f.stage = 1; o.h = f.h0 * SNOW_SLUMP_H;
    if (o.mesh) o.mesh.scale.y = SNOW_SLUMP_H;
  } else if (f.stage === 1 && f.hits >= SNOW_FALL_HITS) {
    f.stage = 2;
    if (o.mesh) o.mesh.visible = false;
    const rm = list => { const i = list ? list.indexOf(o) : -1; if (i >= 0) list.splice(i, 1); };
    rm(Game.player.obstacles); rm(Game.scenario.cover);
    for (let i = 0; i < 6; i++) seasonSnowPuff({ x: (o.minX + o.maxX) / 2 + (Math.random() - 0.5) * 0.8, y: f.h0 * 0.5 * Math.random(), z: (o.minZ + o.maxZ) / 2 + (Math.random() - 0.5) * 0.8 });
  }
  return true;
}
// A puff of snow where a BB went in: a few white flecks that fall (the BB fragments' own physics)
function seasonSnowPuff(at) {   // (each fleck its own geometry: updateFragments disposes it)
  if (!Game.scenario.fragments) Game.scenario.fragments = [];
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xf4f7fb, transparent: true, opacity: 0.9 }));
    mesh.position.set(at.x, at.y, at.z);
    Game.scene.add(mesh);
    Game.scenario.fragments.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), age: 0, lifetime: 0.8 });
  }
}
// The briefing's line for a season match: the season and what its weather does
function seasonBriefTag(sc) {
  if (sc.season === 'fall') return sc.timeOfDay === 'night' ? '🍂 FALL' : '🍂 FALL · WINDY: LONG SHOTS DRIFT';
  if (sc.season === 'winter') return '❄ WINTER · DEEP SNOW: EVERYONE SLOWER, AND YOU LEAVE TRACKS';
  return '';
}
