// v1.452 (backlog D.88, Michael: B, a balance pass over the 50 guns): a headless 1v1 for every gun against the same kids.
// A bot stands at the player's start aimed in (ADS), turns to the chest of the nearest foe it can see within 70 m, pulls
// (holds an automatic), racks or breaks the gun open when it must, clears a jam with R, and swaps a fresh mag in
// 0.6 s + 0.4 s x the gun's reload time when it runs dry. A round ends at the first tag either way: a win if the bot
// tagged first. The bot turns to a kid the frame it sees him and first pulls a quarter second later. The renderer is switched off, so a round takes a few seconds.
//
//   node scripts/balance.mjs                         every gun in GUN_ORDER, 5 rounds in each match, 4 browsers
//   node scripts/balance.mjs --guns dmr,m14 --rounds 20 --maps bunratty_sean
//   node scripts/balance.mjs --out tests/tmp/bal.json
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
    await page.evaluate(() => {
      const REACT = 0.25;
      const B = window.__bot = { t: 0, shots: 0, see: null, reloadT: 0, tagT: null, hitT: null };
      const P = Game.player;
      if (!window.__origFire) { window.__origFire = doFire; doFire = function () { if (window.__bot) __bot.shots++; return __origFire.apply(this, arguments); }; }
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
          P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz));
          if (B.t - B.see < REACT) tgt = null;
        }
        const gun = Game.gun; P.adsTarget = 1;
        if (gun.ammo <= 0 && !gun.jammed) {
          B.release();
          if (B.reloadT <= 0) B.reloadT = 0.6 + 0.4 * getReloadMult(gun.type);
          B.reloadT -= dt;
          if (B.reloadT <= 0) { gun.ammo = gun.maxAmmo; gun.cocked = false; gun.cockProgress = 0; B.reloadT = 0; }
        } else if (gun.jammed) { B.release(); Game.keys['KeyR'] = true; }
        else {
          Game.keys['KeyR'] = false;
          if (!gun.cocked) {
            if (!gun.cockReleasing && gun.fireCooldown <= 0) {
              if (gun.cockProgress >= 0.97) B.release(); else if (!Game.mouseLMB) { Game.lmbConsumed = false; B.press(); }
            }
          } else if (tgt) {
            if (gun.fireMode === 'auto') B.press(); else if (Game.mouseLMB) B.release(); else B.press();
          } else B.release();
        }
        stepGame(dt);
        if (B.tagT === null && Game.scenario.enemies.some(e => e.team !== 'player' && (e.health <= 0 || e.state === 'retreating'))) { B.tagT = B.t; B.tagShots = B.shots; }
        if (B.hitT === null && P.hitsTaken > 0) B.hitT = B.t;
      };
    });
    // in chunks, so a win's own setTimeout can land between them; 150 s at most
    let mode = 'scenario';
    for (let T = 0; mode === 'scenario' && T < 150; T++) {
      mode = await page.evaluate(() => {
        for (let i = 0; i < 60 && Game.mode === 'scenario' && __bot.tagT === null && __bot.hitT === null; i++) __bot.step();
        if (Game.mode === 'scenario' && (__bot.tagT !== null || __bot.hitT !== null)) endScenario(__bot.tagT !== null ? 'win' : 'lose');
        return Game.mode;
      });
    }
    const out = await page.evaluate(() => { Game.mouseLMB = false; Game.keys['KeyR'] = false; const B = __bot; return { t: +B.t.toFixed(2), see: B.see, tagT: B.tagT, hitT: B.hitT, tagShots: B.tagShots }; });
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
  const p = spawn(process.execPath, [self, '--worker', sc, gs, '--rounds', String(ROUNDS)]);
  let buf = '';
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.startsWith('{')) rows.push(JSON.parse(l)); } });
  p.stderr.on('data', d => process.stderr.write(d));
  p.on('close', res);
});
const queue = jobs.slice();
await Promise.all(Array.from({ length: +arg('workers', 4) }, async () => { while (queue.length) await run(queue.shift()); }));
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(rows));
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const won = r => r.tagT !== null && (r.hitT === null || r.tagT <= r.hitT);
console.log(`| Gun | ${MAPS.join(' | ')} | Wins | First sight to tag (s) | Shots to tag |`);
console.log(`|---|${MAPS.map(() => '---|').join('')}---|---|---|`);
for (const gt of guns) {
  const rs = rows.filter(r => r.gt === gt), ws = rs.filter(won);
  const per = MAPS.map(sc => { const a = rs.filter(r => r.sc === sc); return `${a.filter(won).length}/${a.length}`; });
  const ttt = med(ws.map(r => r.tagT - r.see));
  console.log(`| ${gt} | ${per.join(' | ')} | ${ws.length}/${rs.length} | ${ttt === null ? '-' : ttt.toFixed(2)} | ${med(ws.map(r => r.tagShots)) ?? '-'} |`);
}
