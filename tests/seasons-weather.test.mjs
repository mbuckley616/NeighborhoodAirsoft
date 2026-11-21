// v1.487-v1.488 (backlog D.96, Michael: B, 21 Nov 2026: "A, and the weather changes play"): the fall and winter
// matches' weather, split from tests/seasons.test.mjs (which checks the look and the chapters) so each stays well inside
// the runner's 10 minutes. Three matches: Short a Player (the summer), First Saturday Back (a fall day) and Cold Hands
// (winter, the same map as the summer one).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// v1.487 (D.96 step 3): the weather's rules. A fall day's wind pushes long shots one way (a shot inside 10 m barely
// moves); deep snow slows you and the kids to 85%; you and the kids leave prints, and a kid on his target's trail knows
// where its newest print is. The summer and the fall's night have no wind; the summer has no snow.
const drift = () => page.evaluate(() => {
  const out = {};
  for (const dist of [10, 30]) {
    const b = Game.scenario.bounds, dir = new THREE.Vector3(1, 0, 0);
    if (Season.wind) dir.set(-Season.wind.z, 0, Season.wind.x);   // fired straight across the wind, high over the map
    const start = new THREE.Vector3((b.minX + b.maxX) / 2, 12, (b.minZ + b.maxZ) / 2).addScaledVector(dir, -15);
    const bb = makeBB(start.clone(), dir.clone().multiplyScalar(30), 'player', null, null, 'player');
    bb.curveStrength = 0;
    Game.scenario.bbs.push(bb);
    for (let n = 0; n < 2000 && bb.pos.distanceTo(start) < dist && Game.scenario.bbs.includes(bb); n++) updateBBs(1 / 200);
    const d = bb.pos.clone().sub(start), along = d.dot(dir);
    out['m' + dist] = +d.sub(dir.clone().multiplyScalar(along)).setY(0).length().toFixed(3);
    const i = Game.scenario.bbs.indexOf(bb); if (i >= 0) Game.scenario.bbs.splice(i, 1);
  }
  out.wind = Season.wind ? +Season.wind.accel.toFixed(2) + '@' + Math.atan2(Season.wind.z, Season.wind.x).toFixed(2) : null;
  return out;
});
// walk forward for 1 s from the start; metres covered
const walk = () => page.evaluate(() => {
  const p0 = Game.player.pos.clone();
  Game.keys.KeyW = true;
  for (let i = 0; i < 60; i++) stepGame(1 / 60);
  Game.keys.KeyW = false;
  for (let i = 0; i < 30; i++) stepGame(1 / 60);
  return +Math.hypot(Game.player.pos.x - p0.x, Game.player.pos.z - p0.z).toFixed(3);
});
await g.scenario('winnmark_team_2v3');
const wSummer = await drift();
const sSummer = await page.evaluate(() => Season.moveMult);
const vSummer = await walk();
await g.scenario('fall_wk_wingman');
const wFall = await drift();
// the same match's wind every time, and a fall night calm (the weather as enterScenario sets it, without a map)
const wRule = await page.evaluate(() => {
  const k = w => w && (w.accel.toFixed(3) + '@' + w.x.toFixed(3));
  seasonWeather(null, 'fall', 'day', 'fall_wk_wingman'); const a = k(Season.wind);
  seasonWeather(null, 'fall', 'day', 'fall_wk_wingman'); const b = k(Season.wind);
  seasonWeather(null, 'fall', 'day', 'fall_hs_portables'); const other = k(Season.wind);
  seasonWeather(null, 'fall', 'night', 'fall_bn_halloween'); const night = Season.wind;
  seasonWeather(null, null, 'day', 'winnmark_team_2v2'); const summer = Season.wind, mult = Season.moveMult;
  seasonWeather(null, 'winter', 'day', 'winter_wk_short'); const winter = Season.wind, wmult = Season.moveMult;
  return { same: a === b, differs: a !== other, night, summer, mult, winter, wmult };
});
console.log('   ' + JSON.stringify({ wSummer, wFall, wRule }));
check('the summer has no wind: a BB at 30 m/s goes straight', wSummer.wind === null && wSummer.m30 < 0.01, wSummer);
check('a fall day is windy: a shot drifts under 10 cm by 10 m and over 40 cm by 30 m', wFall.wind && wFall.m10 < 0.1 && wFall.m30 > 0.4, wFall);
check('the same match has the same wind every time (another match another); a fall night, the summer and winter are calm', wRule.same && wRule.differs && wRule.night === null && wRule.summer === null && wRule.winter === null && wRule.mult === 1 && wRule.wmult === 0.85, wRule);

await g.scenario('winter_wk_short');
const sWinter = await page.evaluate(() => Season.moveMult);
const vWinter = await walk();
console.log('   ' + JSON.stringify({ sSummer, vSummer, sWinter, vWinter, ratio: +(vWinter / vSummer).toFixed(3) }));
check('deep snow: you walk at about 85% (and the kids\' speed is 85%)', sSummer === 1 && sWinter === 0.85 && vWinter / vSummer > 0.8 && vWinter / vSummer < 0.9, { vSummer, vWinter });

// the prints: the kids walking out, and you
await g.spin(300);
const prints = await page.evaluate(() => {
  const L = Season.prints.list.filter(Boolean);
  return { n: L.length, walkers: new Set(L.map(p => p.by)).size, mine: L.filter(p => p.by === Game.player).length,
    drawn: Season.prints.mesh.count, solid: (Game.player.obstacles || []).some(o => o.mesh === Season.prints.mesh) };
});
// a trail: his target's prints laid from each kid's feet to where that target stands, fresh (in a team match most kids
// are after your crew, not you); a kid with no line to his target follows it
const trail = await page.evaluate(() => {
  const F = Season.prints, now = aiNow(), me = Game.player.pos;
  const foes = Game.scenario.enemies.filter(e => e.team !== 'player' && e.health > 0);
  const want = new Map();
  for (const e of foes) {
    const tgt = getTarget(e), who = tgt.ref, at = { x: tgt.pos.x, z: tgt.pos.z };
    want.set(e, { who, at });
    for (let k = 0; k <= 10; k++) { const t = k / 10; F.list.push({ x: e.pos.x + (at.x - e.pos.x) * t, z: e.pos.z + (at.z - e.pos.z) * t, y: 0, t: now - 1 + t, by: who }); }
  }
  const f0 = foes[0], w0 = want.get(f0), unit = seasonTrailFor(f0, w0.who), far = seasonTrailFor({ pos: { x: me.x + 400, z: me.z + 400 } }, w0.who);
  for (const e of foes) { e._onTrail = null; e._trailT = 1; }
  for (let i = 0; i < 30; i++) stepGame(1 / 60);
  const followed = foes.filter(e => e._onTrail && want.get(e) && e._onTrail.by === want.get(e).who);
  return { foes: foes.length, unitNewest: !!unit && Math.hypot(unit.x - w0.at.x, unit.z - w0.at.z) < 0.01, far: far === null, followed: followed.length,
    lastSeenAtTarget: followed.every(e => { const w = want.get(e), now = w.who.pos;   // where the trail ended, or (a kid target walks on, laying newer prints) where he is now
      return Math.min(Math.hypot(e._lastSeenPos.x - w.at.x, e._lastSeenPos.z - w.at.z), Math.hypot(e._lastSeenPos.x - now.x, e._lastSeenPos.z - now.z)) < 1.5; }) };
});
console.log('   ' + JSON.stringify({ prints, trail }));
check('winter: you and the kids leave prints in the snow, drawn in one mesh, nothing solid', prints.n > 40 && prints.walkers >= 4 && prints.mine >= 1 && prints.drawn > 0 && !prints.solid, prints);
check('a kid on his target\'s trail knows its newest print (where the target is), and one far from it knows nothing', trail.unitNewest && trail.far && trail.followed >= 1 && trail.lastSeenAtTarget, trail);

// the map card and the briefing say what the weather does
const tags = await page.evaluate(() => {
  isScenarioUnlocked = () => true;
  const card = id => [...new DOMParser().parseFromString(renderScenarioCard(id, 1, false), 'text/html').querySelectorAll('.sc-card-badge')].map(b => b.textContent).join('|');
  const r = { fall: card('fall_wk_wingman'), night: card('fall_bn_halloween'), winter: card('winter_bn_first_snow'), summer: card('bunratty_sean') };
  openScenarioBrief('winter_bn_first_snow'); r.brief = document.getElementById('briefLoc').textContent;
  document.getElementById('scenarioBriefModal').classList.remove('active');
  return r;
});
console.log('   ' + JSON.stringify(tags));
check('the cards: WINDY on a fall day, HALLOWEEN on Halloween Night, DEEP SNOW in winter, nothing new in the summer', /WINDY/.test(tags.fall) && !/WINDY/.test(tags.night) && /HALLOWEEN/.test(tags.night) && /DEEP SNOW/.test(tags.winter) && !/WINDY|SNOW|HALLOWEEN/.test(tags.summer), tags);
check('the briefing says it: winter, deep snow, slower, tracks', /WINTER · DEEP SNOW/.test(tags.brief), tags.brief);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
