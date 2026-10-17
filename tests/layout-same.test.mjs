// v1.267 (decisions, "The Hollow's free-for-all: kids can see each other at the start", Michael: A, fix the drift).
// A match's layout is seeded by the match (v1.76), but the seed was a swap of the global Math.random, which three.js
// also draws from (four calls for every new object's uuid). The first build after a page load makes materials and
// geometries that later builds take from caches, so the first match's props, cars and trees fell differently from
// every later build's (Bunratty Last Kid Standing: 60,768 draws against 60,317, apart from the 202nd on). Now the
// game draws from gameRandom() and only that is seeded: every map's layout is the same in its first build, in a
// later one after other maps, and in another page load.
import { boot, check } from './lib/game.mjs';
const opts = process.env.SRC ? { src: process.env.SRC } : {};

// one match on each of the ten match maps
const IDS = ['winnmark_ffa', 'bunratty_ffa', 'hollow_ffa', 'lot_ffa', 'northcliff_1v1_evan', 'stoneglen_treehouse',
  'bellfield_1v1_mason', 'school_1v1_tyler', 'club_1v1_brooke', 'store_1v1_tyler'];

// what a build laid down: every obstacle's numbers, to the millimetre, and its count
const layout = (g) => g.page.evaluate(() => {
  const r = (v) => Math.round(v * 1000) / 1000;
  return Game.player.obstacles.map(o => {
    const n = {};
    for (const [k, v] of Object.entries(o)) if (typeof v === 'number') n[k] = r(v);
    return JSON.stringify(n);
  });
});
const end = async (g) => { await g.page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); }); await g.spin(30); };
const diff = (a, b) => {
  const sa = new Set(a), sb = new Set(b);
  return { n: [a.length, b.length], onlyFirst: a.filter(x => !sb.has(x)).slice(0, 2), onlySecond: b.filter(x => !sa.has(x)).slice(0, 2),
    count: a.filter(x => !sb.has(x)).length + b.filter(x => !sa.has(x)).length };
};

// page 1: every map's first build, in order; then every map again, in the reverse order
let g = await boot(opts); await g.bedroom();
const first = {}, errs = [];
for (const id of IDS) { await g.scenario(id); first[id] = await layout(g); await end(g); }
const later = {};
for (const id of [...IDS].reverse()) { await g.scenario(id); later[id] = await layout(g); await end(g); }
errs.push(...g.errs); await g.close();
for (const id of IDS) {
  const d = diff(first[id], later[id]);
  console.log(`  ${id}: ${d.n[0]} obstacles in the first build, ${d.n[1]} later, ${d.count} differ`);
  check(`${id}: the first build after a page load lays out the same as a later one`, d.count === 0 && first[id].length > 0, d);
}

// page 2: the Hollow and Bunratty first in a fresh load, against page 1's
g = await boot(opts); await g.bedroom();
for (const id of ['hollow_ffa', 'bunratty_ffa']) {
  await g.scenario(id); const again = await layout(g); await end(g);
  const d = diff(first[id], again);
  check(`${id}: the same layout in another page load`, d.count === 0, d);
}
// the Hollow's Pickup Game free-for-all, by night, lays out as the Ten-Way does (its seed, and the stars on a stream
// of their own), so the starts hidden there stay hidden
await g.page.evaluate(() => buildPickupScenario({ map: 'hollow', mode: 'ffa', ways: 8, tod: 'night', lives: 1 }));
await g.scenario('pickup_game');
{ const d = diff(first.hollow_ffa, await layout(g)); await end(g);
  check("the Hollow's Pickup free-for-all at night lays out as the Ten-Way", d.count === 0, d); }
errs.push(...g.errs); await g.close();
check('no page errors', errs.length === 0, errs);
