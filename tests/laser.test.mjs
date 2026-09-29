// Backlog C.1 (v1.83–v1.85): kid lasers never run up into the sky. Plays the two Bunratty night maps
// whose kids carry lasers, with the player unkillable, and samples every visible kid beam every 15
// steps: where the dot ends, how steep the beam is, and whether it overshoots its target.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
for (const id of ['bunratty_night_lane', 'bunratty_night_team_2v2']) {
  await g.scenario(id);
  // unkillable: BB hits on the player are dropped (raising maxHits instead would build that many HUD pips)
await page.evaluate(() => { const hit = window.__origHit = window.__origHit || applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
  const r = await page.evaluate(() => {
    const V = THREE.Vector3, o = new V(), d = new V();
    const s = { samples: 0, lasered: 0, aboveHead: 0, steep: 0, overshoot: 0, maxPitch: 0, maxLen: 0, worst: null };
    for (let step = 0; step < 5400 && Game.mode === 'scenario'; step++) {
      stepGame(1 / 60);
      if (step % 15) continue;
      const head = Game.camera.position.y + 0.15;
      for (const e of Game.scenario.enemies) {
        const u = e.mesh && e.mesh._laserUnit;
        if (!u) continue; s.lasered++;
        if (!(e.health > 0) || !u.userData.dot.visible) continue;
        u.getWorldPosition(o); u.userData.dot.getWorldPosition(d);
        const len = o.distanceTo(d), pitch = Math.asin(Math.max(-1, Math.min(1, (d.y - o.y) / Math.max(len, 1e-6)))) * 180 / Math.PI;
        // the kid's own target (teammates of the player are targets too in the team maps)
        const tp = (e._targetRef && e._targetRef.pos) || Game.player.pos;
        const tH = e._targetRef && e._targetRef !== Game.player ? tp.y + 1.6 : head;
        const toTgt = Math.hypot(tp.x - o.x, tp.z - o.z);
        s.samples++;
        if (d.y > Math.max(head, o.y + 0.5)) s.aboveHead++;
        if (pitch > 30 && len > 3) s.steep++;
        if (len > Math.hypot(toTgt, Math.max(Math.abs(tH - o.y), Math.abs(tp.y - o.y))) + 1.0) { s.overshoot++; s.over = s.over || { kid: e.name, len: +len.toFixed(2), toTgt: +toTgt.toFixed(2), tgt: e._targetRef && e._targetRef.name }; }
        if (pitch > s.maxPitch) { s.maxPitch = pitch; s.worst = { kid: e.name, state: e.state, pitch: +pitch.toFixed(1), len: +len.toFixed(2), dotY: +d.y.toFixed(2), head: +head.toFixed(2) }; }
        s.maxLen = Math.max(s.maxLen, len);
      }
    }
    s.maxPitch = +s.maxPitch.toFixed(1); s.maxLen = +s.maxLen.toFixed(1); s.mode = Game.mode;
    return s;
  });
  check(`${id}: beams sampled`, r.samples > 50, r);
  check(`${id}: no dot above the player's head (or 0.5 m above the emitter)`, r.aboveHead === 0, r);
  check(`${id}: no beam longer than 3 m pitched over 30°`, r.steep === 0, r);
  check(`${id}: no beam running past its target`, r.overshoot === 0, r);
  if (await g.mode() === 'scenario') await page.evaluate(() => endScenario('lose'));
  await page.evaluate(() => enterBedroom && enterBedroom());
  await g.spin(5);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
