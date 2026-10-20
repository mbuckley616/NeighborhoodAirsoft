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
  return { hold: P._holdT, at: [+P.pos.x.toFixed(2), +P.pos.z.toFixed(2)], start: [+Game.scenario.playerStart.pos.x.toFixed(2), +Game.scenario.playerStart.pos.z.toFixed(2)],
    respawns: Game.scenario.playerRespawns, mode: Game.mode };
});
check('tagged, you come back at your start held for 10 s', t0.mode === 'scenario' && t0.respawns === 1 && t0.hold === 10
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
await g.spin(7 * 60);
const t2 = await page.evaluate(() => ({ hold: Game.player._holdT, moved: Math.hypot(Game.player.pos.x - Game.scenario.playerStart.pos.x, Game.player.pos.z - Game.scenario.playerStart.pos.z) }));
check('still held at 9 s', t2.hold > 0.5 && t2.moved < 0.02, t2);
await g.spin(75);
const t3 = await page.evaluate(() => {
  const P = Game.player, st = Game.scenario.playerStart.pos;
  return { hold: P._holdT, moved: Math.hypot(P.pos.x - st.x, P.pos.z - st.z), grace: +P._graceT.toFixed(2),
    hud: document.getElementById('timerHud').textContent.replace(/\s+/g, ' ').trim() };
});
check('at 10 s you are let go and walk off (with the 2 s grace just begun)', t3.hold === 0 && t3.moved > 0.3 && t3.grace > 1.5 && t3.grace <= 2, t3);
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
for (const name of ['Mason', 'Evan']) {
  await g.scenario(ID);
  const r = await page.evaluate(async (name) => {
    const P = Game.player; P.invuln = true; P._graceT = 1e9;
    const k = Game.scenario.enemies.find(e => e.name === name);
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
  check(`${name} (${r.team}), tagged, walks back and waits 10 s at his base before he plays again`, r.arrived != null && r.wait != null && r.wait >= 10 && r.wait < 11.2, r);
  check(`${name} waits out: no shot, no flag, nothing to tag`, r.shotsHeld === 0 && !r.flagHeld && r.outAtHome, r);
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
