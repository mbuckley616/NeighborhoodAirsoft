// v1.485 (backlog D.96, Michael: B, 21 Nov 2026): the seasons' look. A match in fall or winter is the summer's map with
// its greens turned (straw lawns and orange trees; snow and frosted trees), the sky and light shifted, and falling
// leaves or snow round the camera. Checked: the summer is exactly as before, also after a winter match (the pass
// recolours copies, never the shared materials); fall and winter switch the look; the cover layout and what is solid
// are the same in every season; cars keep their paint; the leaves and snow fall and follow the camera.
// v1.486: and the two chapters on the ladder and the map (below). The weather's rules and the snow forts (v1.487, v1.488) are tests/seasons-weather.test.mjs.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const MAP = 'bunratty_sean';
const read = () => page.evaluate(() => {
  const kids = new Set((Game.scenario.enemies || []).map(e => e.mesh && e.mesh.group));
  const colors = [], cars = [];
  let green = 0, lightGround = 0, groundVerts = 0;
  const hsl = {};
  Game.scene.traverse(o => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (kids.has(p)) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) if (m && m.color) {
      colors.push(m.color.getHexString());
      m.color.getHSL(hsl);
      if (hsl.h >= 0.17 && hsl.h <= 0.47 && hsl.s > 0.1 && hsl.l > 0.04 && hsl.l < 0.85) green++;
    }
    let car = false;
    for (let p = o; p; p = p.parent) if (p.userData && p.userData.noSeason && !p.userData.cardboardBox && !/^season/.test(p.name)) car = true;
    if (car && o.material && o.material.color) cars.push(o.material.color.getHexString());
  });
  // the map's big ground mesh (vertex coloured): how much of it is light (snow)
  Game.scene.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.color || o.geometry.attributes.position.count < 2000 || o.name === 'seasonFx') return;
    const c = o.geometry.attributes.color, n = o.geometry.attributes.normal;
    for (let i = 0; i < c.count; i++) if (!n || n.getY(i) > 0.9) { groundVerts++; if (c.getX(i) + c.getY(i) + c.getZ(i) > 2.4) lightGround++; }
  });
  const fx = Game.scene.getObjectByName('seasonFx');
  const obs = (Game.player.obstacles || []).map(o => [o.minX, o.minZ, o.maxX, o.maxZ, o.h || 0].map(v => +(+v).toFixed(2)).join(',')).sort();
  return {
    season: Game.scene.userData.season || null, fx: fx ? fx.geometry.attributes.position.count : 0,
    colors: colors.sort().join(' '), green, cars: cars.sort().join(' '),
    snowShare: groundVerts ? +(lightGround / groundVerts).toFixed(3) : 0,
    bg: Game.scene.background.getHexString(), fogFar: Game.scene.fog ? Math.round(Game.scene.fog.far) : 0,
    obstacles: obs.length, obsKey: obs.join('|'),
  };
});
const enter = async (s) => { await page.evaluate(s => { Season.force = s; }, s); await g.scenario(MAP); return read(); };

const sum1 = await enter('summer');
const fall = await enter('fall');
const win = await enter('winter');
// the leaves and snow: they fall, and stay round the camera when it moves
const fxMove = await page.evaluate(() => {
  const p = Game.scene.getObjectByName('seasonFx').geometry.attributes.position;
  const y0 = p.getY(0), x0 = p.getX(5);
  for (let i = 0; i < 60; i++) seasonStep(1 / 60);
  const fell = y0 - p.getY(0);
  Game.camera.position.x += 40;   // walk the camera 40 m: the field wraps round it
  for (let i = 0; i < 10; i++) seasonStep(1 / 60);
  let near = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - Game.camera.position.x) <= 16.01) near++;
  Game.camera.position.x -= 40;
  return { fell: +fell.toFixed(3), near, count: p.count, x0 };
});
const sum2 = await enter('summer');
await page.evaluate(() => { Season.force = null; });
const byData = await page.evaluate(() => ({ none: seasonOf({}), fall: seasonOf({ season: 'fall' }), winter: seasonOf({ season: 'winter' }), junk: seasonOf({ season: 'spring' }) }));
const brief = x => ({ season: x.season, fx: x.fx, green: x.green, snowShare: x.snowShare, bg: x.bg, fogFar: x.fogFar, obstacles: x.obstacles });
console.log('   ' + JSON.stringify({ sum1: brief(sum1), fall: brief(fall), win: brief(win), sum2: brief(sum2), fxMove, byData }));

check('a match without a season is the summer: no pass, no leaves or snow', sum1.season === null && sum1.fx === 0, brief(sum1));
check('the summer after a winter match is the same, colour for colour (no shared material was changed)', sum2.colors === sum1.colors && sum2.bg === sum1.bg && sum2.fogFar === sum1.fogFar, { a: sum1.colors.length, b: sum2.colors.length });
check('fall: the greens turn (fewer than half the green materials left), leaves fall, the sky shifts', fall.season && fall.season.season === 'fall' && fall.green < sum1.green / 2 && fall.fx === 260 && fall.bg !== sum1.bg, brief(fall));
check('winter: the ground is snow (over 90% of its upward faces light, 30 points more than the summer), snow falls, the fog closes in', win.season && win.season.season === 'winter' && win.snowShare > 0.9 && win.snowShare - sum1.snowShare > 0.3 && win.fx === 900 && win.fogFar < sum1.fogFar, brief(win));
check('the cover layout and everything solid are the same in all three seasons', sum1.obsKey === fall.obsKey && sum1.obsKey === win.obsKey && sum1.obstacles > 0, { s: sum1.obstacles, f: fall.obstacles, w: win.obstacles });
check('cars and bins keep their paint', sum1.cars.length > 0 && fall.cars === sum1.cars && win.cars === sum1.cars);
check('the snow falls and stays round the camera as it moves', fxMove.fell > 0.5 && fxMove.near === fxMove.count, fxMove);
check("a scenario's season is read from its data; anything else is the summer", byData.none === null && byData.fall === 'fall' && byData.winter === 'winter' && byData.junk === null, byData);

// v1.486 (D.96 step 2): the two chapters. Four places a season, three matches each, after the summer on the ladder:
// Fall opens when the Last Saturday is won, Winter when Halloween Night is. The summer's ladder, its unlocks and the
// summer's score against Seth's crew are as they were. The map gets Summer, Fall and Winter tabs once the summer is won.
const ladder = await page.evaluate(() => {
  isScenarioUnlocked = scenarioUnlockedForResult;   // g.scenario() opened every match; the real rule back
  const P = Game.persist, keep = JSON.stringify(P.completed);
  const r = { summerZones: ZONE_LADDER.map(z => z.key).join(','), rivalTotal0: rivalScore().total };
  const ids = SEASON_CHAPTERS.flatMap(ch => ch.zones.flatMap(z => z.matches.map(m => m.id)));
  r.matches = ids.length;
  r.allSeasoned = ids.every(id => SCENARIOS[id] && SEASONS.includes(SCENARIOS[id].season) && SCENARIOS[SCENARIOS[id].seasonBase]);
  r.zonesPerSeason = SEASON_CHAPTERS.map(ch => ch.zones.length + 'x' + ch.zones.map(z => z.matches.length).join(''));
  r.summerUntouched = Object.keys(SCENARIOS).filter(id => !ids.includes(id)).every(id => !SCENARIOS[id].season);
  // nothing won: the fall is shut
  P.completed = {};
  r.fallShutAtStart = !isZoneUnlocked('fall_winnmark') && !isScenarioUnlocked('fall_wk_wingman');
  // the summer won but the Last Saturday: still shut
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) P.completed[id] = true;
  delete P.completed.last_saturday;
  r.fallShutBeforeFinale = !isZoneUnlocked('fall_winnmark');
  r.summerOpen = ZONE_LADDER.every(z => isZoneUnlocked(z.key));
  P.completed.last_saturday = true;
  r.fallOpen = isZoneUnlocked('fall_winnmark') && isScenarioUnlocked('fall_wk_wingman') && !isScenarioUnlocked('fall_wk_leaf_fort');
  r.nextAfterSummer = nextLadderMatchId();
  r.hollowShut = !isZoneUnlocked('fall_hollow');
  r.winterShut = !isZoneUnlocked('winter_bunratty');
  r.reason = scenarioLockReason('fall_hw_leaves');
  for (const z of SEASON_CHAPTERS[0].zones) for (const m of z.matches) P.completed[m.id] = true;
  r.winterOpen = isZoneUnlocked('winter_bunratty') && isScenarioUnlocked('winter_bn_first_snow');
  r.rivalTotal1 = rivalScore().total;
  P.completed = JSON.parse(keep);
  return r;
});
console.log('   ' + JSON.stringify(ladder));
check('24 new matches, four places a season with three each, each a summer match in fall or winter', ladder.matches === 24 && ladder.allSeasoned && ladder.zonesPerSeason.join() === '4x3333,4x3333', ladder);
check('the summer ladder is the eight places it was, and no summer match has a season', ladder.summerZones === 'winnmark_court,bunratty_court,hollow,market_lot,northcliff,high_school,country_club,grocery_store' && ladder.summerUntouched);
check('the fall is shut at the start and until the Last Saturday is won, with every summer place open', ladder.fallShutAtStart && ladder.fallShutBeforeFinale && ladder.summerOpen);
check('the Last Saturday opens the fall: its first match, not its second, and the bed names it as next', ladder.fallOpen && ladder.nextAfterSummer === 'fall_wk_wingman' && ladder.hollowShut, ladder);
check('a fall place says which place opens it', /Winnmark Court/.test(ladder.reason) && /Sweatshirt Weather/.test(ladder.reason), ladder.reason);
check('winter opens when the fall is won', ladder.winterShut && ladder.winterOpen);
check("the season matches don't count in the summer's score against Seth's crew", ladder.rivalTotal0 === ladder.rivalTotal1 && ladder.rivalTotal0 > 0, ladder);

// the map: no tabs in the summer; Summer and Fall once the Last Saturday is won; Fall shows the fall's places
const map = await page.evaluate(() => {
  isScenarioUnlocked = scenarioUnlockedForResult;
  const P = Game.persist, keep = JSON.stringify(P.completed);
  const tabs = () => { const b = document.getElementById('mapSeasons'); return b.hidden ? [] : [...b.querySelectorAll('button')].map(x => x.dataset.season + (x.classList.contains('on') ? '*' : '')); };
  const pin = k => document.querySelector(`#worldMap .pin[data-scenario="${k}"]`);
  const r = {};
  P.completed = {}; Game._mapZone = null; Game._mapSeason = null;
  openMap(); r.tabsNew = tabs(); closeMap();
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) P.completed[id] = true;
  Game._mapZone = null;
  openMap();
  r.tabsWon = tabs(); r.openedOn = Game._mapZone;
  document.querySelector('#mapSeasons button[data-season="fall"]').click();
  r.tabsFall = tabs(); r.zone = Game._mapZone;
  r.cards = [...document.querySelectorAll('#scenarioInfo .sc-card')].map(c => c.dataset.id + (c.classList.contains('locked') ? '-' : '+'));
  r.when = (document.querySelector('#scenarioInfo .sc-season-when') || {}).textContent;
  r.lotFaded = pin('market_lot').classList.contains('offseason');
  r.hollowLocked = pin('hollow').classList.contains('locked') && !pin('hollow').classList.contains('offseason');
  pin('bunratty_court').querySelector('.marker').click();
  r.bunratty = Game._mapZone + ' ' + /Clear Hollins Ridge High/.test(document.getElementById('scenarioInfo').textContent);
  pin('market_lot').querySelector('.marker').click();
  r.lotText = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  document.querySelector('#mapSeasons button[data-season="summer"]').click();
  r.backSummer = tabs().join() + ' ' + Game._mapZone + ' ' + document.querySelectorAll('#worldMap .pin.offseason').length + ' ' + pin('hollow').classList.contains('locked');
  closeMap();
  P.completed = JSON.parse(keep); Game._mapZone = null; Game._mapSeason = null;
  return r;
});
console.log('   ' + JSON.stringify(map));
check('a new game has no season tabs', map.tabsNew.length === 0, map.tabsNew);
check('the Last Saturday won: Summer and Fall tabs, and the map opens on the fall\'s first place', map.tabsWon.join() === 'summer,fall*' && map.openedOn === 'fall_winnmark', map);
check('the Fall tab: Winnmark\'s three fall matches, the first open, with the month', map.cards.join() === 'fall_wk_wingman+,fall_wk_leaf_fort-,fall_wk_squad-' && /Fall 2003 · September/.test(map.when || ''), map);
check('in Fall, a place with no fall matches fades, and one not yet reached is locked', map.lotFaded && map.hollowLocked, map);
check('a pin in Fall opens that place in fall (Bunratty, locked behind the school); a faded one says nothing is on there', map.bunratty === 'fall_bunratty true' && /Nothing on here in Fall 2003/.test(map.lotText), map);
check('back to Summer: no pin faded, and the summer\'s places as they were', map.backSummer === 'summer*,fall grocery_store 0 false', map.backSummer);

// a fall match plays in fall, and Halloween Night brings the parked Halloween back for itself
await g.scenario('fall_bn_halloween');
const hw = await page.evaluate(() => ({ season: (Game.scene.userData.season || {}).season, decor: !!Game.scene.getObjectByName('holidayDecor'),
  costumes: Game.scenario.enemies.filter(e => e.mesh.costume).length, kids: Game.scenario.enemies.length, night: Game.scenario.timeOfDay || SCENARIOS.fall_bn_halloween.timeOfDay }));
await g.scenario('winter_bn_first_snow');
const ws = await page.evaluate(() => ({ season: (Game.scene.userData.season || {}).season, decor: !!Game.scene.getObjectByName('holidayDecor'), costumes: Game.scenario.enemies.filter(e => e.mesh.costume).length }));
// v1.496 (critic, 26 Nov): the snow was pink on Bunratty and Winnmark: the big ground's vertex colours are multipliers
// on its green (red clay x1.6/0.74/0.97), and the material went white under them. What the ground shows (material x
// vertex) on its upward faces: no pink, nearly all snow.
const groundSnow = () => page.evaluate(() => {
  let best = null;
  Game.scene.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material) || !o.material || !o.material.vertexColors || !o.material.color || !o.geometry.attributes.color) return;
    if (o.material.color.getHex() === 0xffffff || o.name === 'seasonFx') return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, a = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
    if (a > 20000 && (!best || a > best.a)) best = { o, a };
  });
  if (!best) return null;
  const c = best.o.geometry.attributes.color, n = best.o.geometry.attributes.normal, M = best.o.material.color;
  let up = 0, pink = 0, snow = 0;
  for (let i = 0; i < c.count; i++) {
    if (n.getY(i) <= 0.9) continue;
    const R = c.getX(i) * M.r, G = c.getY(i) * M.g, B = c.getZ(i) * M.b;
    up++;
    if (R - G > 0.12 && B - G > 0.05) pink++;
    if (R + G + B > 2.2 && Math.max(R, G, B) - Math.min(R, G, B) < 0.15) snow++;
  }
  return { up, pink, snow: +(snow / up).toFixed(3) };
});
const snowBn = await groundSnow();
await g.scenario('winter_wk_short');
const snowWk = await groundSnow();
console.log('   ' + JSON.stringify({ snowBn, snowWk }));
check('winter on Bunratty and Winnmark: the ground\'s snow is white, not pink (no pink vertex, over 95% snow)', snowBn && snowWk && snowBn.pink === 0 && snowWk.pink === 0 && snowBn.snow > 0.95 && snowWk.snow > 0.95, { snowBn, snowWk });
await g.scenario('bunratty_night_team_2v2');
const sn = await page.evaluate(() => ({ season: Game.scene.userData.season || null, decor: !!Game.scene.getObjectByName('holidayDecor'), costumes: Game.scenario.enemies.filter(e => e.mesh.costume).length }));
console.log('   ' + JSON.stringify({ hw, ws, sn }));
check('Halloween Night: a fall night with lanterns on the houses and every kid but one in six in costume', hw.season === 'fall' && hw.decor && hw.costumes > 0 && hw.night === 'night', hw);
check('a winter match is in winter, with no Halloween', ws.season === 'winter' && !ws.decor && ws.costumes === 0, ws);
check('its summer match after it is the summer, with no Halloween (still parked)', sn.season === null && !sn.decor && sn.costumes === 0, sn);

// v1.497 (critic, 27 Nov): a season card names only kids who are on the field. Bellfield in the Snow said "Andrew and
// Evan are with you" and Lamplight in the Snow "Evan" has your back; neither was in the match (the crew takes the old
// allies' places). Each kid a card names is on one side or the other of its match, on this save.
const named = await page.evaluate(() => {
  const kids = Object.keys(CAPTAIN_CREWS).concat(...Object.values(CAPTAIN_CREWS)).filter((k, i, a) => a.indexOf(k) === i);
  const bad = [];
  for (const ch of SEASON_CHAPTERS) for (const z of ch.zones) for (const m of z.matches) {
    const on = (crewSetup(m.id) || []).map(e => e.charId);
    for (const k of kids) if (new RegExp('\\b' + k + '\\b', 'i').test(m.desc) && !on.includes(k)) bad.push(m.id + ': ' + k);
  }
  return { kids: kids.length, bad };
});
console.log('   ' + JSON.stringify(named));
check('every kid a season card names plays in its match', named.kids > 20 && named.bad.length === 0, named);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
