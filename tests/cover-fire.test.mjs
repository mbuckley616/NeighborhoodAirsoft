// Backlog C.2 (v1.77): a kid behind cover lifts its BB over the lip, but only for cover within 1.6 m
// ahead. Does a kid 1.6–3 m back still fire into its own cover? Plays cover-heavy matches with the
// player unkillable and, for every enemy BB, casts its first 4 m against the map's obstacles.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const IDS = ['bunratty_team_2v2', 'winnmark_defend_culdesac', 'hollow_skirmish_3v3', 'bunratty_hold_the_fort'];
const all = { shots: 0, lifted: 0, near: 0, mid: 0, far: 0, why: {} };
for (const id of IDS) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const hit = window.__origHit = window.__origHit || applyBBHit;
    window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c);
    const mk = window.__origMake = window.__origMake || makeBB;
    const shots = [];
    window.makeBB = function (pos, vel, owner, enemyRef) {
      if (owner === 'enemy' && enemyRef) shots.push({ p: pos.clone(), v: vel.clone(), e: enemyRef, lifted: (enemyRef._firingOverCover || 0) >= 0.449 });
      return mk.apply(this, arguments);
    };
    const s = { shots: 0, lifted: 0, near: 0, mid: 0, far: 0, midKids: {}, examples: [] };
    for (let step = 0; step < 3600 && Game.mode === 'scenario'; step++) {
      stepGame(1 / 60);
      while (shots.length) {
        const sh = shots.shift(), d = sh.v.clone().normalize();
        const t = raycastObstacles(sh.p.x, sh.p.y, sh.p.z, d.x, d.y, d.z, 4, Game.player.obstacles);
        const tgt = sh.e._targetRef && sh.e._targetRef.pos ? sh.e._targetRef.pos : Game.player.pos;
        const toTgt = Math.hypot(tgt.x - sh.p.x, tgt.z - sh.p.z);
        s.shots++; if (sh.lifted) s.lifted++;
        if (t >= 4 || t >= toTgt) continue;             // clear for 4 m, or reached the target first
        // which obstacle, and why the v1.77 lift didn't clear it
        let ob = null, bt = 99;
        for (const o of Game.player.obstacles) { if ((o.h || 0) < 0.25) continue; const u = obsRayDist(o, sh.p.x, sh.p.y, sh.p.z, d.x, d.y, d.z, 4); if (u >= 0 && u < bt) { bt = u; ob = o; } }
        let why = 'other';
        const cov = Game.scenario.cover || [];
        const c = ob && cov.find(c => c === ob || (c.minX === ob.minX && c.maxX === ob.maxX && c.minZ === ob.minZ && c.maxZ === ob.maxZ && c.cx === ob.cx && c.cz === ob.cz));
        if (!ob) why = 'none';
        else if (!c) why = 'notInCoverList';
        else {
          const ex = sh.e.pos.x, ez = sh.e.pos.z, dl = Math.hypot(d.x, d.z) || 1, ux = d.x / dl, uz = d.z / dl;
          const cx = c.cx != null ? c.cx : (c.minX + c.maxX) / 2, cz = c.cz != null ? c.cz : (c.minZ + c.maxZ) / 2;
          const along = (cx - ex) * ux + (cz - ez) * uz, perp = Math.abs((cx - ex) * -uz + (cz - ez) * ux);
          const halfW = c.radius != null ? c.radius : Math.max(c.maxX - c.minX, c.maxZ - c.minZ) / 2;
          if (along <= 0 || along > 1.6) why = 'centreBeyondReach';
          else if (perp > halfW + 0.4) why = 'lateral';
          else if (sh.lifted) why = 'liftCapped';
        }
        s.why = s.why || {}; const band = t < 1.6 ? 'near' : t < 3 ? 'mid' : 'far';
        s.why[band + ':' + why] = (s.why[band + ':' + why] || 0) + 1;
        if (t < 1.6) s.near++; else if (t < 3) { s.mid++; s.midKids[sh.e.name] = (s.midKids[sh.e.name] || 0) + 1;
          if (s.examples.length < 3) s.examples.push({ kid: sh.e.name, state: sh.e.state, t: +t.toFixed(2), y: +(sh.p.y - sh.e.pos.y).toFixed(2), toTgt: +toTgt.toFixed(1) }); }
        else s.far++;
      }
    }
    window.makeBB = mk; window.applyBBHit = hit;
    return s;
  });
  console.log(`  ${id}: ${JSON.stringify(r)}`);
  for (const k of ['shots', 'lifted', 'near', 'mid', 'far']) all[k] += r[k];
  for (const [k, n] of Object.entries(r.why || {})) all.why[k] = (all.why[k] || 0) + n;
  if (await g.mode() === 'scenario') await page.evaluate(() => endScenario('forfeit'));
  await page.evaluate(() => enterBedroom()); await g.spin(5);
}
check('enemy shots sampled', all.shots > 100, all);
// Reported, not asserted: how many shots bury in cover inside 1.6 m (the lift's reach) vs 1.6–3 m back.
console.log('  into-cover shots: <1.6 m ' + all.near + ', 1.6–3 m ' + all.mid + ', 3–4 m ' + all.far + ' of ' + all.shots + '; causes ' + JSON.stringify(all.why));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
