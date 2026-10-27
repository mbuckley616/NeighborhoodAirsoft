// v1.350 (backlog D.70, Michael: B, 23 Oct: "holiday looks first, Halloween now ... shown around the real dates or switched
// on from the Pickup Game board; play unchanged"), step 1: the street houses. From 17 Oct to 1 Nov by the computer's
// clock every buildSuburbanHouse house gets jack-o'-lanterns, cobwebs and a porch light, lit by night. Checked: the dates,
// what goes on Bellfield Court by day and by night, that it costs four draw calls at most and adds nothing solid, and
// that off season (or forced off) nothing is built.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const dates = await page.evaluate(() => {
  Holiday.force = null;
  return [[2026, 9, 16], [2026, 9, 17], [2026, 9, 31], [2026, 10, 1], [2026, 10, 2], [2027, 6, 4]].map(([y, m, d]) => holidayNow(new Date(y, m, d)));
});
check('Halloween runs 17 Oct to 1 Nov by the date: off the 16th, on the 17th, the 31st and 1 Nov, off the 2nd and in July',
  JSON.stringify(dates) === '[null,"halloween","halloween","halloween",null,null]', dates);

const read = () => page.evaluate(() => {
  const d = Game.scene.getObjectByName('holidayDecor');
  const houses = []; Game.scene.traverse(o => { if (o.userData && o.userData.holidayFront) houses.push(o); });
  const out = { houses: houses.length, obstacles: (Game.scenario.obstacles || []).length, decor: null };
  if (d) {
    const meshes = d.children.map(m => m.name);
    const bb = new THREE.Box3().setFromObject(d.getObjectByName('lanterns'));
    // every lantern stands on the ground or the step: none floats over a house's front ground by more than the 12 cm step
    let lowest = Infinity; d.getObjectByName('lanterns').geometry.computeBoundingBox();
    const pos = d.getObjectByName('lanterns').geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) lowest = Math.min(lowest, pos.getY(i));
    out.decor = Object.assign({}, d.userData, { meshes, lowest: +lowest.toFixed(3), top: +bb.max.y.toFixed(2) });
    const solid = (Game.scenario.obstacles || []).some(o => o.mesh && (o.mesh === d || d.children.includes(o.mesh)));
    out.solid = solid;
  }
  Game.renderer.render(Game.scene, Game.camera);
  out.calls = Game.renderer.info.render.calls;
  return out;
});

await page.evaluate(() => { Holiday.force = 'none'; });
await g.scenario('bellfield_3v3');
const off = await read();
await page.evaluate(() => { Holiday.force = 'halloween'; });
await g.scenario('bellfield_3v3');
const day = await read();
await g.shot('holiday-bellfield-day');
console.log('   off: ' + JSON.stringify(off));
console.log('   day: ' + JSON.stringify(day));
check('forced off, nothing is built', off.decor === null && off.houses === 7, off);
check('Bellfield by day: all seven houses, three lanterns and two webs each, a porch light each, no glow',
  day.decor && day.decor.houses === 7 && day.decor.lanterns === 21 && day.decor.webs === 14 && day.decor.lights === 7 && !day.decor.meshes.includes('porchGlow'), day.decor);
check('nothing solid: the same obstacles as with it off, none of them the decorations', day.obstacles === off.obstacles && !day.solid, [off.obstacles, day.obstacles]);
check('it costs three draw calls by day (lanterns, faces and lights, webs)', day.calls - off.calls <= 3 && day.decor.meshes.length === 3, [off.calls, day.calls]);
check('the lanterns stand on the ground: the lowest within 5 cm of Bellfield\'s ground (y 0)', Math.abs(day.decor.lowest) < 0.05, day.decor.lowest);

await g.scenario('bellfield_night_4v4');
const night = await read();
await g.shot('holiday-bellfield-night');
console.log('   night: ' + JSON.stringify(night));
check('by night the porch lights glow too (four meshes)', night.decor && night.decor.night && night.decor.meshes.includes('porchGlow') && night.decor.meshes.length === 4, night.decor);

await page.evaluate(() => { Holiday.force = null; });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
