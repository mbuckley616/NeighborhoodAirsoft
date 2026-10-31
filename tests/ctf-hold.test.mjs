// v1.280 (backlog D.47, Michael 18 Oct): "Capture the Flag needs a respawn timer, where enemies/teammates cannot start
// shooting again until they've been in their base for 10 seconds. The player should suffer the same penalty. You cannot
// move or shoot after you get back to your base for 10 seconds." Before, a tagged kid redeployed the moment he reached
// his base, and you came back at your start free to move and fire after a 2 s grace.
// Checked on Flags on Bellfield: you, tagged, held 10 s at your start (no walk, jump, shot or flag; nothing tags you; the
// flag box counts down), then let go; a kid of each side, tagged, waits 10 s at his base, still out, before he plays.
// Time through stepGame (g.spin).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'bellfield_ctf';

// --- you
await g.scenario(ID);
const t0 = await page.evaluate(() => {
  const P = Game.player;
  P._graceT = 0;
  for (const k of Game.scenario.enemies) { k.pos.x += 300; k.mesh.group.position.x = k.pos.x; }   // out of the way
  P.hitsTaken = P.maxHits - 1;
  P.pos.set(0, 0, 3);
  applyBBHit({ team: 'enemy', canDamage: true }, P);
  // v1.290 (D.48): a tag sends you walking home (vip.test walks it); the hold starts as you reach your start
  const walking = !!P._goingHome && !(P._holdT > 0);
  P.pos.copy(Game.scenario.playerStart.pos); playerWalkHomeStep(0);
  return { walking, hold: P._holdT, at: [+P.pos.x.toFixed(2), +P.pos.z.toFixed(2)], start: [+Game.scenario.playerStart.pos.x.toFixed(2), +Game.scenario.playerStart.pos.z.toFixed(2)],
    respawns: Game.scenario.playerRespawns, mode: Game.mode };
});
check('tagged, you walk home and are held 10 s at your start', t0.walking && t0.mode === 'scenario' && t0.respawns === 1 && t0.hold === 10
  && t0.at[0] === t0.start[0] && t0.at[1] === t0.start[1], t0);
await page.evaluate(() => { Game.keys.KeyW = true; Game.keys.KeyD = true; });
await g.spin(120);
const t1 = await page.evaluate(() => {
  const P = Game.player, st = Game.scenario.playerStart.pos;
  const moved = Math.hypot(P.pos.x - st.x, P.pos.z - st.z);
  // try to jump, fire and get tagged
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  Game.gun.cocked = true; Game.gun.ammo = Math.max(Game.gun.ammo, 3); Game.gun.fireCooldown = 0;
  const ammo = Game.gun.ammo, shots = Game.scenario.stats.shots;
  onLmbDown(); onLmbUp();
  const hits = P.hitsTaken;
  applyBBHit({ team: 'enemy', canDamage: true }, P);
  return { moved, velY: P.velY, ammo: Game.gun.ammo - ammo, shots: Game.scenario.stats.shots - shots, hit: P.hitsTaken - hits,
    hud: document.getElementById('timerHud').textContent.replace(/\s+/g, ' ').trim(), hold: +P._holdT.toFixed(2), respawns: Game.scenario.playerRespawns };
});
console.log('   held:', JSON.stringify(t1));
check('held: W and D walk you nowhere in 2 s', t1.moved < 0.02, t1.moved);
check('held: Space does not jump', t1.velY <= 0, t1.velY);
check('held: the trigger fires nothing', t1.ammo === 0 && t1.shots === 0, t1);
check('held: a BB does not tag you', t1.hit === 0 && t1.respawns === 1, t1);
check('the flag box counts it down', /BACK AT YOUR BASE · PLAY IN 8/.test(t1.hud), t1.hud);
// CI fix-up (20 Oct): stepped in the page to the moment of release. Between evaluates the page's own frame loop also
// steps the game on the real clock, so on CI (9/10, ea49739) the hold had already run out 0.65 s before the old fixed
// count of frames ended, and the grace read 1.35 against "just begun".
const t3 = await page.evaluate(() => {
  const P = Game.player, st = Game.scenario.playerStart.pos, from = () => Math.hypot(P.pos.x - st.x, P.pos.z - st.z);
  let at9 = null, rel = null, steps = 0;
  const left0 = P._holdT;
  for (; steps < 60 * 12 && P._holdT > 0; steps++) {
    if (at9 == null && P._holdT <= 1.0) at9 = { hold: +P._holdT.toFixed(2), moved: from() };
    stepGame(1 / 60);
  }
  rel = { hold: P._holdT, heldFor: +(10 - left0 + steps / 60).toFixed(2), grace: +P._graceT.toFixed(2), moved0: from() };
  for (let i = 0; i < 60; i++) stepGame(1 / 60);
  return { at9, ...rel, moved: from(), hud: document.getElementById('timerHud').textContent.replace(/\s+/g, ' ').trim() };
});
check('still held at 9 s', t3.at9 && t3.at9.hold > 0.5 && t3.at9.moved < 0.02, t3.at9);
check('at 10 s you are let go, with the 3 s grace just begun (v1.291), and walk off', t3.hold === 0 && Math.abs(t3.heldFor - 10) < 0.05
  && t3.grace > 2.9 && t3.grace <= 3 && t3.moved0 < 0.02 && t3.moved > 0.3, t3);
check('and the flag box drops the countdown', !/BACK AT YOUR BASE/.test(t3.hud), t3.hud);
const t4 = await page.evaluate(() => {
  Game.keys.KeyW = false; Game.keys.KeyD = false;
  Game.gun.cocked = true; Game.gun.ammo = Math.max(Game.gun.ammo, 3); Game.gun.fireCooldown = 0; Game.gun.jammed = false;
  const shots = Game.scenario.stats.shots;
  onLmbDown(); onLmbUp();
  return Game.scenario.stats.shots - shots;
});
check('let go, the trigger fires', t4 === 1, t4);

// --- a kid on each side
// (v1.397, D.57 step 2: the kid on yours is the match's first ally; Evan as written, Owen when the side rule takes
// Seth's Evan off your side)
for (const name of ['Mason', null]) {
  await g.scenario(ID);
  const r = await page.evaluate(async (name) => {
    const P = Game.player; P.invuln = true; P._graceT = 1e9;
    const k = Game.scenario.enemies.find(e => name ? e.name === name : e.team === 'player');
    for (let i = 0; i < 300; i++) stepGame(1 / 60);   // into the round
    const home = k._spawnPos || k._deployAnchor;
    eliminateEnemy(k);
    let arrived = null, back = null, shotsHeld = 0, t = 0, outAtHome = true, flagHeld = false;
    let seen = new Set();
    for (let i = 0; i < 60 * 40 && Game.mode === 'scenario'; i++) {
      stepGame(1 / 60); t += 1 / 60;
      const d = Math.hypot(k.pos.x - home.x, k.pos.z - home.z);
      if (arrived == null && k.state === 'retreating' && d < 1.2) arrived = t;
      if (arrived != null && back == null) {
        if (k.state !== 'retreating') back = t;
        else {
          if (ctfAlive(k)) outAtHome = false;
          if (ctfCarrying(k)) flagHeld = true;
          for (const b of (Game.scenario.bbs || [])) if (b.enemyRef === k && !seen.has(b)) { seen.add(b); shotsHeld++; }
        }
      }
    }
    return { arrived: arrived && +arrived.toFixed(2), back: back && +back.toFixed(2), wait: back && arrived ? +(back - arrived).toFixed(2) : null,
      shotsHeld, outAtHome, flagHeld, team: k.team || 'enemy' };
  }, name);
  console.log('  ', name, JSON.stringify(r));
  check(`${name || "Your side's kid"} (${r.team}), tagged, walks back and waits 10 s at his base before he plays again`, r.arrived != null && r.wait != null && r.wait >= 10 && r.wait < 11.2, r);
  check(`${name || "He"} waits out: no shot, no flag, nothing to tag`, r.shotsHeld === 0 && !r.flagHeld && r.outAtHome, r);
}

// --- a team match keeps its old respawn (no hold)
await g.scenario('bunratty_vip');
const vip = await page.evaluate(() => {
  const P = Game.player; P._graceT = 0; P.hitsTaken = P.maxHits - 1;
  applyBBHit({ team: 'enemy', canDamage: true }, P);
  return { hold: P._holdT || 0, mode: Game.mode };
});
check('Protect Ryan (VIP) has no hold: only capture the flag does', vip.hold === 0, vip);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
