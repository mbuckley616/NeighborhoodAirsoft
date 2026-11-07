// v1.452 (backlog D.88, Michael: B, a balance pass over the 50 guns): a headless 1v1 for every gun against the same kids.
// A bot stands at the player's start aimed in (ADS), turns to the chest of the nearest foe it can see within 70 m, pulls
// (holds an automatic), racks or breaks the gun open when it must, clears a jam with R, and swaps a fresh mag in
// 0.6 s + 0.4 s x the gun's reload time when it runs dry. A round ends at the first tag either way: a win if the bot
// tagged first. The bot turns to a kid the frame it sees him and first pulls a quarter second later. The renderer is switched off, so a round takes a few seconds.
// v1.455 (Michael: A, make the bot human): by default it now plays like a person: it holds the gun low until it sees
// him, steps out to the side for 0.3 s and aims in, reacts in 0.4-0.6 s (again after he has been out of view half a
// second), its aim wanders round him and settles to about a hand's width at 20 m the longer it holds still, it follows
// a running kid a beat late, and it taps a semi no faster than about six a second. --perfect is v1.454's bot.
//
//   node scripts/balance.mjs                         every gun in GUN_ORDER, 5 rounds in each match, 4 browsers
//   node scripts/balance.mjs --guns dmr,m14 --rounds 20 --maps bunratty_sean
//   node scripts/balance.mjs --out tests/tmp/bal.json
//   node scripts/balance.mjs --perfect               v1.454's perfect-aim bot, to compare
//
// Prints a markdown table: wins in each match, all wins, the median seconds from first sight to the tag in a win, and
// the median shots fired by then. Not a suite: it is for measuring before and after a tuning.
import { boot } from '../tests/lib/game.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAPS = arg('maps', 'bunratty_sean,lot_1v1_marcus').split(',');
const ROUNDS = +arg('rounds', 5);
const HUMAN = !process.argv.includes('--perfect');   // v1.455: --perfect is v1.454's bot

async function worker(sc, guns) {
  const g = await boot(); const { page } = g;
  await g.bedroom();
  await page.evaluate(() => { Game.renderer.render = () => {}; });
  for (const gt of guns) for (let r = 0; r < ROUNDS; r++) {
    await page.evaluate(gt => {
      Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: gt };
      Game.persist.bag = 9999;
    }, gt);
    await g.scenario(sc);
    await page.evaluate((HUMAN) => {
      // v1.455 (D.88, Michael: A, make the bot human): the reaction is 0.4-0.6 s, not 0.25 (HUMAN false keeps v1.454's)
      const REACT = HUMAN ? 0.4 + Math.random() * 0.2 : 0.25;
      const B = window.__bot = { t: 0, shots: 0, see: null, reloadT: 0, tagT: null, hitT: null,
        acq: null, lastSeen: -9, settleT: 0, ex: 0, ey: 0, stepT: 0, lastPress: -9, aimed: !HUMAN };
      const P = Game.player;
      // v1.454: the game's own outcome, for a round that ends with no tag the bot's per-frame check saw
      if (!window.__origEnd) { window.__origEnd = endScenario; endScenario = function (o) { if (window.__bot && __bot.outcome == null) __bot.outcome = o; return __origEnd.apply(this, arguments); }; }
      B.outcome = null;
      if (!window.__origFire) { window.__origFire = doFire; doFire = function () { if (window.__bot) __bot.shots++; return __origFire.apply(this, arguments); }; }
      // v1.454: hold-over. The BB falls under gravity less the hop-up's fading lift (78-bb-flight), so a chest aimed at
      // 30 m is a BB at his feet; the bot pitches up the way a player learns to: solve the pitch whose BB, at this gun's
      // speed (a gas gun's as its mag empties, fireBB), crosses his line at his chest height.
      B.drop = (T) => { let y = 0, vy = 0; const h = 1 / 200; for (let t = 0; t < T; t += h) { vy += (8.5 * Math.max(0, 1 - t * 1.5) - 9.8) * h; y += vy * h; } return y; };
      B.hold = (D, dy) => {
        const g = Game.gun, gas = g.gasFade ? 1 - g.gasFade * Math.max(0, Math.min(1, (g.maxAmmo - g.ammo) / Math.max(1, g.maxAmmo - 1))) : 1;
        const v = (g.muzzleVelocity || 30) * gas;
        let p = Math.atan2(dy, D);
        for (let k = 0; k < 4; k++) p = Math.atan2(dy - B.drop(D / (v * Math.cos(p))), D);
        return p;
      };
      B.press = () => { if (!Game.mouseLMB) { Game.mouseLMB = true; onLmbDown(); } };
      B.release = () => { if (Game.mouseLMB) { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); } };
      B.step = () => {
        const dt = 1 / 60; B.t += dt;
        const cam = { x: P.pos.x, y: P.pos.y + P.eyeOffset, z: P.pos.z };
        let tgt = null, best = 1e9;
        for (const e of Game.scenario.enemies) {
          if (e.team === 'player' || e.health <= 0 || e.state === 'retreating') continue;
          const v = combatantView(e), d = Math.hypot(e.pos.x - cam.x, e.pos.z - cam.z);
          if (d < best && d < 70 && hasLineOfSight(cam.x, cam.y, cam.z, e.pos.x, v.chestY, e.pos.z, P.obstacles)) { best = d; tgt = { e, y: v.chestY }; }
        }
        // turn to him first, so the pull below goes where he is; the first pull waits a reaction time after first sight
        if (tgt) {
          if (B.see === null) B.see = B.t;
          const dx = tgt.e.pos.x - cam.x, dz = tgt.e.pos.z - cam.z, dy = tgt.y - cam.y;
          const yaw = Math.atan2(-dx, -dz), pitch = B.hold(Math.hypot(dx, dz), dy);
          if (!HUMAN) { P.yaw = yaw; P.pitch = pitch; if (B.t - B.see < REACT) tgt = null; }
          else {
            // v1.455: a human aim. Each sighting after half a second out of view is a fresh one: a new reaction, and the
            // flick lands off him. The aim wanders round where he is (a smooth random walk, 0.3 s to turn), widest on
            // the flick (0.03 rad, 60 cm at 20 m) and settling the longer the bot holds still to a hand's width at 20 m
            // (0.005 rad); its own step out shakes it again. It follows a running kid a beat late (0.1 s).
            if (B.t - B.lastSeen > 0.5) {
              B.acq = B.t; B.settleT = 0; B.ex = (Math.random() - 0.5) * 0.06; B.ey = (Math.random() - 0.5) * 0.04;
              B.yaw = yaw; B.pitch = pitch;
              // the first sighting: step out to the side for 0.3 s (from behind whatever he can see you round) and aim in
              if (B.see === B.t) { B.stepT = 0.3; B.stepKey = Math.random() < 0.5 ? 'KeyA' : 'KeyD'; }
            }
            B.lastSeen = B.t; B.aimed = true;
            const dt = 1 / 60, amp = 0.005 + 0.025 * Math.exp(-B.settleT / 0.5), th = 0.3;
            const n = () => { let u = 0; for (let i = 0; i < 6; i++) u += Math.random(); return (u - 3) / Math.sqrt(0.5); };
            B.ex += -B.ex * dt / th + amp * Math.sqrt(2 * dt / th) * n();
            B.ey += -B.ey * dt / th + amp * 0.7 * Math.sqrt(2 * dt / th) * n();
            const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
            B.yaw += wrap(yaw - B.yaw) * Math.min(1, dt / 0.1); B.pitch += (pitch - B.pitch) * Math.min(1, dt / 0.1);
            P.yaw = B.yaw + B.ex; P.pitch = B.pitch + B.ey;
            if (B.t - B.acq < REACT) tgt = null;
          }
        }
        if (HUMAN) {
          B.settleT = B.stepT > 0 ? 0 : B.settleT + 1 / 60;
          Game.keys['KeyA'] = Game.keys['KeyD'] = false;
          if (B.stepT > 0) { Game.keys[B.stepKey] = true; B.stepT -= 1 / 60; }
        }
        const gun = Game.gun; P.adsTarget = B.aimed ? 1 : 0;   // v1.455: a human holds the gun low until he sees someone
        if (gun.ammo <= 0 && !gun.jammed) {
          B.release();
          if (B.reloadT <= 0) B.reloadT = 0.6 + 0.4 * getReloadMult(gun.type);
          B.reloadT -= dt;
          if (B.reloadT <= 0) { gun.ammo = gun.maxAmmo; gun.cocked = false; gun.cockProgress = 0; B.reloadT = 0; }
        } else if (gun.jammed) { B.release(); Game.keys['KeyR'] = true; }
        else {
          Game.keys['KeyR'] = false;
          if (!gun.cocked) {
            // v1.454: the pull that fired leaves the trigger held and spent (lmbConsumed), and the hammer or pump only
            // comes back on a fresh pull: let go first. v1.452's bot held on, so every racked gun fired once a round.
            if (!gun.cockReleasing && gun.fireCooldown <= 0) {
              if (gun.cockProgress >= 0.97) B.release(); else if (Game.mouseLMB && Game.lmbConsumed) B.release(); else if (!Game.mouseLMB) { Game.lmbConsumed = false; B.press(); }
            }
          } else if (tgt) {
            // v1.455: a human taps a semi no faster than about six a second
            if (gun.fireMode === 'auto') B.press(); else if (Game.mouseLMB) B.release(); else if (!HUMAN || B.t - B.lastPress >= 0.16) { B.press(); B.lastPress = B.t; }
          } else B.release();
        }
        stepGame(dt);
        if (B.tagT === null && Game.scenario.enemies.some(e => e.team !== 'player' && (e.health <= 0 || e.state === 'retreating'))) { B.tagT = B.t; B.tagShots = B.shots; }
        if (B.hitT === null && P.hitsTaken > 0) B.hitT = B.t;
      };
    }, HUMAN);
    // in chunks, so a win's own setTimeout can land between them; 150 s at most
    let mode = 'scenario';
    for (let T = 0; mode === 'scenario' && T < 150; T++) {
      mode = await page.evaluate(() => {
        for (let i = 0; i < 60 && Game.mode === 'scenario' && __bot.tagT === null && __bot.hitT === null; i++) __bot.step();
        if (Game.mode === 'scenario' && (__bot.tagT !== null || __bot.hitT !== null)) endScenario(__bot.tagT !== null ? 'win' : 'lose');
        return Game.mode;
      });
    }
    const out = await page.evaluate(() => { Game.mouseLMB = false; Game.keys['KeyR'] = Game.keys['KeyA'] = Game.keys['KeyD'] = false; const B = __bot; return { t: +B.t.toFixed(2), see: B.see, tagT: B.tagT, hitT: B.hitT, tagShots: B.tagShots, outcome: B.outcome }; });
    console.log(JSON.stringify({ sc, gt, ...out }));
  }
  await g.close();
}

const w = process.argv.indexOf('--worker');
if (w > 0) { await worker(process.argv[w + 1], process.argv[w + 2].split(',')); process.exit(0); }

// the driver: one job per match per ten guns, run --workers at a time
const g = await boot(); await g.bedroom();
const all = await g.page.evaluate(() => GUN_ORDER.slice());
await g.close();
const guns = arg('guns') ? arg('guns').split(',') : all;
const jobs = [];
for (const sc of MAPS) for (let i = 0; i < guns.length; i += 10) jobs.push([sc, guns.slice(i, i + 10).join(',')]);
const rows = [];
const self = fileURLToPath(import.meta.url);
const run = ([sc, gs]) => new Promise(res => {
  const p = spawn(process.execPath, [self, '--worker', sc, gs, '--rounds', String(ROUNDS), ...(HUMAN ? [] : ['--perfect'])]);
  let buf = '';
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.startsWith('{')) rows.push(JSON.parse(l)); } });
  p.stderr.on('data', d => process.stderr.write(d));
  p.on('close', res);
});
const queue = jobs.slice();
await Promise.all(Array.from({ length: +arg('workers', 4) }, async () => { while (queue.length) await run(queue.shift()); }));
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(rows));
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
// v1.454: a round that ended with neither tag seen counts by the game's own outcome
const won = r => r.tagT !== null ? (r.hitT === null || r.tagT <= r.hitT) : (r.hitT === null && r.outcome === 'win');
console.log(`| Gun | ${MAPS.join(' | ')} | Wins | First sight to tag (s) | Shots to tag |`);
console.log(`|---|${MAPS.map(() => '---|').join('')}---|---|---|`);
for (const gt of guns) {
  const rs = rows.filter(r => r.gt === gt), ws = rs.filter(won);
  const per = MAPS.map(sc => { const a = rs.filter(r => r.sc === sc); return `${a.filter(won).length}/${a.length}`; });
  const ttt = med(ws.map(r => r.tagT - r.see));
  console.log(`| ${gt} | ${per.join(' | ')} | ${ws.length}/${rs.length} | ${ttt === null ? '-' : ttt.toFixed(2)} | ${med(ws.map(r => r.tagShots)) ?? '-'} |`);
}
