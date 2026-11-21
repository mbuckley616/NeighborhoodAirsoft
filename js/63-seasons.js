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
const Season = { force: null, now: null, fx: null };   // force: tests ('summer' | 'fall' | 'winter'); now: the match's season
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
function applySeasonLook(built, season, timeOfDay) {
  Season.now = season || null;
  Season.fx = null;
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
  const info = { season, mats, verts, particles: fx ? fx.count : 0 };
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
  const fx = Season.fx;
  if (!fx || !fx.pts.parent || fx.pts.parent !== Game.scene) return;
  fx.t += dt;
  const S = fx.spec, a = fx.pts.geometry.attributes.position, p = a.array, cam = Game.camera.position;
  const hx = SEASON_BOX.x / 2, hz = SEASON_BOX.z / 2, lo = cam.y - SEASON_BOX.y * 0.4, hi = lo + SEASON_BOX.y;
  for (let i = 0; i < fx.count; i++) {
    const k = i * 3, ph = fx.phase[i];
    p[k] += (Math.sin(fx.t * 1.3 + ph) * S.sway + S.drift) * dt;
    p[k + 1] -= S.fall * (0.75 + 0.5 * ((ph * 7) % 1)) * dt;
    p[k + 2] += Math.cos(fx.t * 0.9 + ph) * S.sway * 0.6 * dt;
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
