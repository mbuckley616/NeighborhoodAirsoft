// v1.485 (backlog D.96, Michael: B, 21 Nov 2026): the seasons' look. A match in fall or winter is the summer's map with
// its greens turned (straw lawns and orange trees; snow and frosted trees), the sky and light shifted, and falling
// leaves or snow round the camera. Checked: the summer is exactly as before, also after a winter match (the pass
// recolours copies, never the shared materials); fall and winter switch the look; the cover layout and what is solid
// are the same in every season; cars keep their paint; the leaves and snow fall and follow the camera.
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
    for (let p = o; p; p = p.parent) if (p.userData && p.userData.noSeason && p.name !== 'seasonFx') car = true;
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
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
