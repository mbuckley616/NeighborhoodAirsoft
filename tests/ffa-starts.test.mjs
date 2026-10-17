// v1.265 (decisions, "Free-for-all starts on Winnmark and Bunratty", Michael: A, the lot's rule on every free-for-all).
// In Every Kid for Themselves Seth's backyard was 27.9 m from your start and you were the nearest start he had, so he
// walked straight in and tagged a player standing there at 4.4–7.7 s (4 of 4 probes, the critic); Bunratty's 6-way
// did the same with Sean, and the Hollow's ten-way had four pairs 9.5–14.7 m apart in sight of each other. Now every
// free-for-all keeps the lot's rule: every start at least 18 m from every other, none in sight of another (the kids'
// own sight rule, muzzle 1.05 m to chest 0.95 m over the ground), and no kid nearer your start than the rest: every
// kid has another kid's start nearer than yours. It holds for the Pickup Game's free-for-alls at every size too.
// Each map is checked in a fresh page, in its first build and its second. Until v1.267 the first match built after a
// page load drew its props and trees differently (three.js shared the seeded Math.random), and the Hollow's kids could
// only be held apart, not hidden; v1.267 (Michael: A) made every build the same and hid the Hollow's starts too.
const RANDOM_WOODS = {};
import { boot, check } from './lib/game.mjs';
const opts = process.env.SRC ? { src: process.env.SRC } : {};
let g = null, page = null;

const errs = [], done = async () => { if (g) { errs.push(...g.errs); await g.close(); } };
const IDS = ['winnmark_ffa', 'bunratty_ffa', 'hollow_ffa', 'lot_ffa'];
for (const id of IDS) for (let build = 0; build < 3; build++) {
  if (build === 0) { await done(); g = await boot(opts); page = g.page; await g.bedroom(); }
  // the third: the map's Pickup Game free-for-all at its most, which is built under its own seed
  if (build === 2) await page.evaluate((id) => { const m = PICKUP_MAPS.find(k => k.ffa === id);
    buildPickupScenario({ map: m.key, mode: 'ffa', ways: pickupMaxWays(m), tod: 'day', lives: 1 }); }, id);
  await g.scenario(build === 2 ? 'pickup_game' : id);
  const st = await page.evaluate((id) => {
    const G = (x, z) => scenarioGroundY(x, z) || 0, obs = Game.player.obstacles;
    const you = { x: Game.player.pos.x, z: Game.player.pos.z, name: 'you' };
    const kids = Game.scenario.enemies.map(e => ({ x: (e._spawnPos || e.pos).x, z: (e._spawnPos || e.pos).z, name: e.character.name, id: e.charId || e.character.id }));
    const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const sees = (a, b) => hasLineOfSight(a.x, G(a.x, a.z) + 1.05, a.z, b.x, G(b.x, b.z) + 0.95, b.z, obs);
    const rule = (ks) => {
      const pts = [you, ...ks], seen = [], near = [], hug = [];
      let mind = Infinity;
      for (let i = 0; i < pts.length; i++) for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        if (sees(pts[i], pts[j])) seen.push(pts[i].name + '→' + pts[j].name);
        mind = Math.min(mind, D(pts[i], pts[j]));
      }
      for (const k of ks) {
        const nk = Math.min(...ks.filter(o => o !== k).map(o => D(o, k)));
        if (nk >= D(k, you)) near.push(`${k.name}: you ${D(k, you).toFixed(1)} m, nearest kid ${nk.toFixed(1)} m`);
      }
      for (const p of pts) if (collidesObstacles(p.x, p.z, 0.3)) hug.push(p.name);
      return { n: pts.length, mind: +mind.toFixed(1), seen, near, hug };
    };
    const full = rule(kids);
    // the Pickup Game's free-for-alls on this map: its first kids (pickupFfaKids), 3-way up to its most
    const m = PICKUP_MAPS.find(k => k.ffa === id), sizes = [];
    if (m && Game.scenario.active !== 'pickup_game') for (let w = 3; w <= pickupMaxWays(m); w++) {
      const ids = pickupFfaKids(m, w).map(e => e.charId);
      const r = rule(ids.map(c => kids.find(k => k.id === c)).filter(Boolean));
      sizes.push({ w, n: r.n, mind: r.mind, seen: r.seen.length, near: r.near });
    }
    return { full, sizes, youNearest: kids.map(k => [k.name, +D(k, you).toFixed(1)]).sort((a, b) => a[1] - b[1]).slice(0, 3) };
  }, id);
  const what = build === 2 ? `${id} (Pickup Game)` : `${id} build ${build + 1}`;
  console.log(`  ${what}:`, JSON.stringify(st.full), 'nearest to you', JSON.stringify(st.youNearest));
  check(`${what}: every start clear of obstacles`, st.full.hug.length === 0, st.full.hug);
  check(`${what}: every start at least 18 m from every other`, st.full.mind >= 18, st.full.mind);
  if (RANDOM_WOODS[id]) {
    console.log(`  ${what}: ${st.full.seen.length / 2} pairs in sight through this forest`);
    // your start, at least, is hidden in the forest every match but the first after a page load has
    if (build > 0) check(`${what}: no kid can see your start from his`, !st.full.seen.some(s => /you/.test(s)), st.full.seen);
  }
  else check(`${what}: nobody can see anybody from the start`, st.full.seen.length === 0, st.full.seen);
  check(`${what}: every kid has another kid's start nearer than yours`, st.full.near.length === 0, st.full.near);
  if (st.sizes.length) {
    console.log(`  ${id} Pickup Game:`, JSON.stringify(st.sizes.map(s => [s.w, s.mind, s.seen, s.near.length])));
    check(`${id}: the Pickup Game's ${st.sizes[0].w}- to ${st.sizes[st.sizes.length - 1].w}-way keep the rule`,
      st.sizes.every(s => s.n === s.w && s.mind >= 18 && (s.seen === 0 || RANDOM_WOODS[id]) && s.near.length === 0), st.sizes);
  }
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(30);
}

// Standing at your start: nobody walks in and tags you at once (was 4.4–7.7 s by Seth on Winnmark, every probe)
for (const id of ['winnmark_ffa', 'bunratty_ffa', 'hollow_ffa']) {
  const times = [];
  for (let r = 0; r < 3; r++) {
    await g.scenario(id);
    times.push(await page.evaluate(() => {
      let f = 1;
      for (; f <= 20 * 60 && Game.mode === 'scenario' && !(Game.player.hitsTaken > 0); f++) stepGame(1 / 60);
      return Game.player.hitsTaken > 0 || Game.mode !== 'scenario' ? +(f / 60).toFixed(1) : null;
    }));
    await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
    await g.spin(30);
  }
  console.log(`  ${id}: standing at the start, first tagged at`, JSON.stringify(times), 's (null: not in 20 s)');
  if (!RANDOM_WOODS[id]) check(`${id}: standing at your start, nobody tags you in the first 8 s (3 rounds)`, times.every(t => t === null || t > 8), times);
}

await done();
check('no page errors', errs.length === 0, errs);
