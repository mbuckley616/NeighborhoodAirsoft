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
    const V = THREE.Vector3, o = new V(), d = new V(), hp = new V(); let tgtHead;
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
        // v1.136: "above the head" means above the head of whoever this kid is aiming at. In the night 2v2 Ryan aims
        // at Sean (the player's teammate) about half the time, and when Sean stood uphill his chest was above the
        // player's head: the dot sat on Sean, but the old rule measured it against the player and failed (v1.130).
        const tm = e._targetRef && e._targetRef !== Game.player && e._targetRef.mesh && e._targetRef.mesh.parts;
        if (tm && tm.head) { tm.head.getWorldPosition(hp); tgtHead = hp.y + 0.2; }
        else tgtHead = e._targetRef && e._targetRef !== Game.player ? tp.y + 1.75 : head;
        if (d.y > Math.max(tgtHead, o.y + 0.5)) { s.aboveHead++; s.above = s.above || { kid: e.name, state: e.state, tgt: e._targetRef && e._targetRef.name, dotY: +d.y.toFixed(2), tgtHead: +tgtHead.toFixed(2) }; }
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
  check(`${id}: no dot above its target's head (or 0.5 m above the emitter)`, r.aboveHead === 0, r);
  check(`${id}: no beam longer than 3 m pitched over 30°`, r.steep === 0, r);
  check(`${id}: no beam running past its target`, r.overshoot === 0, r);
  if (await g.mode() === 'scenario') await page.evaluate(() => endScenario('lose'));
  await page.evaluate(() => enterBedroom && enterBedroom());
  await g.spin(5);
}
// v1.136: the night 2v2 case staged, so it is tested every run, not one round in ten. Ryan (laser) aims at Sean, who
// stands uphill of him with a clear line (at z = −2 a lamp post blocks it), while the player stands low on the east
// lane: Sean's chest is above the player's head.
await g.scenario('bunratty_night_team_2v2');
await page.evaluate(() => { const hit = window.__origHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : hit(bb, c); });
const st = await page.evaluate(() => {
  const V = THREE.Vector3, o = new V(), d = new V(), hp = new V(), tc = new V();
  const by = n => Game.scenario.enemies.find(e => e.name === n);
  const ryan = by('Ryan'), sean = by('Sean');
  const s = { samples: 0, overPlayerHead: 0, overSeanHead: 0, maxPastChest: -99, onChest: 0, dotY: null, playerHead: null, seanHead: null };
  for (let step = 0; step < 240 && Game.mode === 'scenario'; step++) {
    // updatePlayer (which puts the player and camera on the low lane) moves no one without the lock; CI's Chromium
    // may refuse the real pointer lock, and the camera then stayed at the spawn on the hill (head 10.98, dot 5.69).
    Game.mouse.locked = true;
    Game.player.pos.x = 35; Game.player.pos.z = 5;
    ryan.pos.x = 20; ryan.pos.z = 0; sean.pos.x = 8; sean.pos.z = 1;
    ryan.health = sean.health = 99;
    ryan._targetRef = sean; ryan._targetReeval = 99;
    stepGame(1 / 60);
    if (step < 60 || step % 5) continue;
    const u = ryan.mesh._laserUnit;
    if (!u.userData.dot.visible || ryan._targetRef !== sean) continue;
    u.getWorldPosition(o); u.userData.dot.getWorldPosition(d);
    sean.mesh.parts.head.getWorldPosition(hp); sean.mesh.parts.torso.getWorldPosition(tc);
    const head = Game.camera.position.y + 0.15;
    s.samples++;
    if (d.y > Math.max(head, o.y + 0.5)) s.overPlayerHead++;
    if (d.y > Math.max(hp.y + 0.2, o.y + 0.5)) s.overSeanHead++;
    s.maxPastChest = Math.max(s.maxPastChest, +(o.distanceTo(d) - o.distanceTo(tc)).toFixed(2)); if (d.distanceTo(tc) < 0.5) s.onChest++;
    s.dotY = +d.y.toFixed(2); s.playerHead = +head.toFixed(2); s.seanHead = +(hp.y + 0.2).toFixed(2);
  }
  return s;
});
console.log('  staged, Ryan on Sean uphill: ' + JSON.stringify(st));
check('staged: Ryan\'s dot is sampled on Sean', st.samples >= 20, st.samples);
check('staged: the dot is above the player\'s head (what the old rule failed on)', st.overPlayerHead > 0, st);
check('staged: the dot sits on Sean\'s chest (within 0.5 m) and never runs past it', st.onChest === st.samples && st.maxPastChest < 0.3, st);
check('staged: never above Sean\'s head', st.overSeanHead === 0, st);
if (await g.mode() === 'scenario') await page.evaluate(() => endScenario('lose'));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
