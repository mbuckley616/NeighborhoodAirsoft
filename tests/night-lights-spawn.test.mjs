// v1.177 (Found in play, critic v1.176): Friday Night Lights started you at the bleachers' west end (5, 26.5), in
// Owen's line from the staff cars 48 m off; a player standing still was tagged in 17 of 18 of the critic's rounds
// (8 at about 3 s, just after the opening hold) with one life. The match now starts behind the concession stand.
// Also: the team-match briefings said "four lives each" (or three, or five) while you have one.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const R = 6, rounds = [];
let first = null;
for (let r = 0; r < R; r++) {
  await g.scenario('school_night_4v4');
  const res = await page.evaluate(() => {
    const p = Game.player, owen = Game.scenario.enemies.find(e => e.name === 'Owen');
    const start = { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), yaw: p.yaw };
    // Owen's chest-high line to your head, at the start
    const ox = owen.pos.x, oy = owen.pos.y + 1.3, oz = owen.pos.z;
    const tx = p.pos.x, ty = p.pos.y + p.eyeOffset, tz = p.pos.z;
    const dx = tx - ox, dy = ty - oy, dz = tz - oz, d = Math.hypot(dx, dy, dz);
    let block = null;
    for (const o of p.obstacles) { const t = obsRayDist(o, ox, oy, oz, dx / d, dy / d, dz / d, d); if (t != null && (block == null || t < block)) block = t; }
    let f = 0, who = null;
    const orig = window.applyBBHit;
    window.applyBBHit = function (bb, t) { if (t === Game.player && !who) who = (bb && bb.enemyRef && bb.enemyRef.name) || '?'; return orig.apply(this, arguments); };
    for (; f < 30 * 60 && Game.mode === 'scenario' && !p.hitsTaken; f++) stepGame(1 / 60);
    window.applyBBHit = orig;
    return { start, owenDist: +d.toFixed(1), blockedAt: block == null ? null : +block.toFixed(1), tag: p.hitsTaken ? +(f / 60).toFixed(1) : null, who };
  });
  rounds.push(res);
  if (!first) first = res;
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); enterBedroom(); });
  await g.spin(3);
}
console.log('  start', JSON.stringify(first.start), `Owen ${first.owenDist} m, line blocked at ${first.blockedAt} m`);
console.log('  tagged at', JSON.stringify(rounds.map(r => r.tag == null ? '-' : r.tag + ' ' + r.who)));
const s = first.start;
// the concession stand: x -6..0, z 18.5..23.5, 3 m tall
check('the start is behind the concession stand (south of it, within its width)', s.x > -6 && s.x < 0 && s.z > 23.5 && s.z < 27, s);
check("the stand blocks Owen's line to your head at the start", first.blockedAt != null && first.blockedAt < first.owenDist - 1, first);
const tags = rounds.filter(r => r.tag != null);
// v1.177 fix-up: counted inside 18 s, not 30. From 20 s on, Ryan and Priya have walked up and tag a player who stands
// still, as they should: CI had 3 of 6 at 22.9-25.1 s, and 7 local runs had 0-3 of 6, every one at 20.7-27.5 s and none
// by Owen. The bleachers' tags came at about 3 s, so 18 s still catches the start this test is about.
const early = tags.filter(r => r.tag < 18);
check(`standing still at the start, at most 2 of ${R} rounds are tagged inside 18 s (was 8 of 8 at the bleachers)`, early.length <= 2, rounds.map(r => r.tag));
check('nobody tags you before 10 s (the bleachers gave Owen 3.2 s)', tags.every(r => r.tag >= 10), tags);
check('Owen does not tag a player standing at the start', rounds.every(r => r.who !== 'Owen'), rounds.map(r => r.who));
// the day matches at the school keep the bleachers start
const day = await page.evaluate(() => ['school_1v1_tyler', 'school_portables_3v3'].map(id => SCENARIOS[id].playerSpawn));
check('After the Bell and The Portables still start at the bleachers (team_b)', day.every(k => k === 'team_b'), day);
// every briefing that gives a lives count matches what the kids and you get
const lives = await page.evaluate(() => {
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5 }, bad = [];
  let n = 0;
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    const m = /\b(one|two|three|four|five) lives (each|for every kid but you)\b/i.exec(sc.desc || '');
    if (!m) continue;
    n++;
    const k = words[m[1].toLowerCase()];
    if (m[2] === 'each' && (sc.playerLives || 1) !== k) bad.push(id + ': "' + m[0] + '", you ' + (sc.playerLives || 1));
    if (sc.npcLives && sc.npcLives !== k) bad.push(id + ': "' + m[0] + '", kids ' + sc.npcLives);
  }
  return { n, bad };
});
console.log(`  ${lives.n} briefings give a lives count`);
check('briefings that give a lives count are true for the kids and for you', lives.n >= 13 && lives.bad.length === 0, lives.bad);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
