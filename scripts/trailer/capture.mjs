// Gameplay trailer, step 1 of 2: films the game frame by frame in headless Chromium and encodes the frames.
// The game's own loop is stopped; every frame runs fixed 1/60 calls of stepGame(), renders once and is captured, so the
// footage is smooth however slowly software GL draws. The sounds the game made are logged with their times
// (out/events.json) so step 2 (mix.mjs) can play them back over the picture.
//
//   node scripts/trailer/capture.mjs                    # the whole trailer -> scripts/trailer/out/picture.webm
//   node scripts/trailer/capture.mjs --stills 6         # every 6th frame as a JPEG in out/stills, no video
//   node scripts/trailer/capture.mjs --only night,zombies --stills 6
import { boot } from '../../tests/lib/game.mjs';
import { installDirector } from './director.mjs';
import { ffmpegPath } from './ffmpeg.mjs';
import { spawnSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const ONLY = opt('only') ? opt('only').split(',') : null;
const STILLS = opt('stills') ? +opt('stills') : 0;
const FPS = 30;   // each frame runs two 1/60 game steps


// ---------------------------------------------------------------------------------------------------------------
// The shot list. setup runs in Node (between shots, not filmed); frame(i, n) runs in the page, once per frame.
// ---------------------------------------------------------------------------------------------------------------
const sec = (s) => Math.round(s * FPS);

async function enter(g, id, gun, bb) {
  const { page } = g;
  await page.evaluate(([gun, bb]) => {
    const P = Game.persist; P.cash = 99999; P.bag = 99999;
    if (gun) buyGun(gun);
    P.ownedBBColors[bb] = true; P.bbColor = bb;
    TR.noEnd = true;
  }, [gun, bb]);
  await g.scenario(id);
  await page.evaluate(() => { window.tick = function () { requestAnimationFrame(window.tick); }; TR.prep(); });
}

const SHOTS = [
  {
    name: 'open', frames: sec(1.7),
    frame: (i, n) => {
      const a = Math.min(1, i / 8);
      TR.card(`<div class="big" style="opacity:${a}">Summer, 2003.</div>`, 'black', 1);
      TR.caption(null);
    },
  },
  {
    name: 'bedroom', frames: sec(2.4),
    setup: async (g) => {
      await g.page.evaluate(() => { TR.card('', '', 0); closeMirror(); Game.persist.cash = 140; Game.persist.bag = 250; updateBedroomHud();
        const p = Game.player; p.pos.x = 1.3; p.pos.z = 2.5; p.pitch = -0.08; });
    },
    frame: (i, n) => {
      const u = i / n, e = u * u * (3 - 2 * u); Game.player.yaw = -0.3 + 1.2 * e;
      stepGame(1 / 60); stepGame(1 / 60); TR.t += 2 / 60;
      TR.render(); TR.caption("School's out.", null, i, n);
    },
  },
  {
    name: 'mirror', frames: sec(2.3),
    setup: async (g) => { await g.page.evaluate(() => { openMirror(); TR.seed = 7; }); },
    frame: (i, n) => {
      if (i > 4 && i % 6 === 0) {   // a new look every 0.2 s
        const rand = () => (TR.seed = (TR.seed * 9301 + 49297) % 233280) / 233280;
        for (const row of LOOK_OPTIONS) {
          if (row.key === 'height' || row.key === 'eyeColor') continue;
          if (rand() < 0.55) { const o = row.opts[Math.floor(rand() * row.opts.length)]; Game.persist.look[row.key] = row.kind === 'swatch' ? o : o[0]; }
        }
        renderMirrorOptions(); renderMirrorPreview();
      }
      if (MIRROR.kid) { MIRROR.kid.group.rotation.y = 0.35 + Math.sin(i / 14) * 0.5; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); }
      TR.t += 2 / 60;
      TR.caption('Be any kid on the block.', null, i, n);
    },
  },
  {
    name: 'shop', frames: sec(2.2),
    setup: async (g) => { await g.page.evaluate(() => { closeMirror(); Game.persist.cash = 140; Game.persist.bag = 250; updateBedroomHud(); openShop(); }); },
    frame: (i, n) => {
      if (i === 26) { buyGun('shotgun'); playShopChaching(); renderShop(); }
      TR.t += 2 / 60;
      TR.caption('Spend your whole allowance.', null, i, n);
    },
  },
  {
    // a spring pistol at 7 m: shoot, rack, shoot
    name: 'duel', frames: sec(3.4),
    setup: async (g) => {
      await g.page.evaluate(() => closeShop());
      await enter(g, process.env.DUEL || 'lot_1v1_marcus', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        const kid = Game.scenario.enemies[0], p = Game.player;
        // 6.5 m straight ahead of where we spawn, or the first clear spot round from there
        let at = null;
        for (let k = 0; k < 24 && !at; k++) {
          const a = p.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2, x = p.pos.x - Math.sin(a) * 6.5, z = p.pos.z - Math.cos(a) * 6.5;
          if (collidesObstacles(x, z, 0.6)) continue;
          kid.pos.x = x; kid.pos.z = z; if (TR.sees(kid)) at = { x, z, a };
        }
        TR.pinAt = at; p.yaw = at.a + 0.3; p.pitch = 0;
        for (let k = 0; k < 160; k++) { kid.pos.x = at.x; kid.pos.z = at.z; stepGame(1 / 60); }   // his opening hold runs out
        TR.resetFight();
      });
    },
    frame: (i, n) => {
      const kid = Game.scenario.enemies[0];
      for (let s = 0; s < 2; s++) TR.fight({ aimK: 0.09, tol: 0.02, los: false, fireAfter: 0.45, pin: [{ e: kid, x: TR.pinAt.x, z: TR.pinAt.z }] });
      TR.render(); TR.caption('Rack it. Aim. <i>Pop.</i>', 'spring guns', i, n);
    },
  },
  {
    name: 'treehouse', frames: sec(3.6),
    setup: async (g) => {
      await enter(g, 'stoneglen_treehouse', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        const p = Game.player; p.pos.x = 0; p.pos.y = 0; p.pos.z = -1.9; p.yaw = 0; p.pitch = 0.35; p.onGround = true; p.velY = 0;
        for (const e of Game.scenario.enemies) if (!e.perch) { e.pos.x = 14; e.pos.z = 14; }   // Haden stays out of shot
      });
    },
    frame: (i, n) => {
      for (let s = 0; s < 2; s++) {
        const p = Game.player;
        if (TR.local < 1.9 && !(p.pos.y >= 2.59 && p.onGround && !p.climbing)) {   // climb
          Game.mouse.locked = true; Game.keys.KeyW = true; p.pitch += (0.35 - p.pitch) * 0.1;
          stepGame(1 / 60); TR.t += 1 / 60; TR.local += 1 / 60;
        } else {
          TR.fight({ aimK: 0.14, tol: 0.03, target: () => Game.scenario.enemies.find(e => e.perch && e.health > 0) || null });
        }
      }
      TR.render(); TR.caption('Take the treehouse.', null, i, n);
    },
  },
  {
    name: 'battle', frames: sec(3.4),
    setup: async (g) => {
      await enter(g, 'hollow_big_battle', 'ak47', 'yellow');
      await g.page.evaluate(() => {
        for (let k = 0; k < 60 * 9; k++) stepGame(1 / 60);   // let the lines meet
        TR.spot = TR.bestSpot({ x0: -14, x1: 14, z0: -10, z1: 26, step: 2, minDist: 8, maxDist: 30 });
        for (let k = 0; k < 20; k++) stepGame(1 / 60);
        TR.resetFight();
      });
    },
    frame: (i, n) => {
      for (let s = 0; s < 2; s++) TR.fight({ aimK: 0.07, tol: 0.06, maxDist: 50, drift: 0.04 });
      TR.render(); TR.caption('Five on five in the woods.', null, i, n);
    },
  },
  {
    name: 'night', frames: sec(3.2),
    setup: async (g) => {
      await enter(g, process.env.NIGHT || 'lot_night_4v4', 'mp5', 'glow');
      await g.page.evaluate(() => {
        for (let k = 0; k < 60 * 9; k++) stepGame(1 / 60);   // they come up the aisles; we hold the spawn, which looks down the lamp island
        for (let k = 0; k < 20; k++) stepGame(1 / 60);
        TR.resetFight();
      });
    },
    frame: (i, n) => {
      for (let s = 0; s < 2; s++) TR.fight({ aimK: 0.07, tol: 0.07, maxDist: 60, los: false });   // glowing BBs over the car roofs
      TR.render(); TR.caption('Stay out after the streetlights come on.', null, i, n);
    },
  },
  {
    name: 'zombies', frames: sec(2.8),
    setup: async (g) => {
      await enter(g, 'bunratty_infection', 'shotgun', 'yellow');
      await g.page.evaluate(() => {
        const near = () => Math.min(...TR.hostiles().map(e => Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z)));
        for (let k = 0; k < 60 * 25 && near() > 8; k++) stepGame(1 / 60);
        TR.resetFight();
      });
    },
    frame: (i, n) => {
      for (let s = 0; s < 2; s++) TR.fight({ aimK: 0.12, tol: 0.04, keys: { KeyS: TR.local < 1.0 }, maxDist: 30, drift: 0.05 });
      TR.render(); TR.caption('Zombie tag.', 'and when you get tired of guns', i, n);
    },
  },
  {
    name: 'result', frames: sec(1.6),
    setup: async (g) => {
      await enter(g, 'winnmark_defend_culdesac', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        for (let k = 0; k < 60; k++) stepGame(1 / 60);
        Game.scenario.winByTimer = true; TR.realEnd('win');
        const c = document.querySelector('#resultScreen .result-card'); c.style.transform = 'scale(1.3)';
      });
    },
    frame: (i, n) => { TR.t += 2 / 60; TR.render(); TR.caption(null); },
  },
  {
    name: 'end', frames: sec(3.2),
    frame: (i, n) => {
      const a = Math.min(1, i / 8);
      TR.card(`<div class="t">NEIGHBORHOOD AIRSOFT</div><div class="s">Summer · 2003</div>
        <div class="u" style="opacity:${Math.max(0, Math.min(1, (i - 14) / 8))}">play it in your browser · mbuckley616.itch.io/neighborhood-airsoft</div>`, '', a);
      TR.caption(null); TR.t += 2 / 60;
    },
  },
];

// ---------------------------------------------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const stillsDir = path.join(OUT, 'stills');
if (STILLS) { fs.rmSync(stillsDir, { recursive: true, force: true }); fs.mkdirSync(stillsDir, { recursive: true }); }

const g = await boot(); const { page } = g;
await g.bedroom();                                       // NEW GAME -> mirror -> bedroom
await page.evaluate(() => openMirror());                 // back to the mirror, the way NEW GAME left it
await page.evaluate(installDirector);
await page.evaluate(() => { Game.persist.cash = 99999; Game.persist.bag = 99999; });

// Playwright's ffmpeg reads files only (no pipe protocol): the JPEG frames go end to end into one temp file
const MJPEG = path.join(os.tmpdir(), `airsoft-trailer-${process.pid}.mjpeg`);
const frames = STILLS ? null : fs.openSync(MJPEG, 'w');

let frameNo = 0; const t0 = Date.now(); const timeline = [];
for (const shot of SHOTS) {
  if (ONLY && !ONLY.includes(shot.name)) {
    if (shot.setup && ['bedroom', 'mirror', 'shop'].includes(shot.name)) await shot.setup(g);   // keep the menus' state in order
    continue;
  }
  await page.evaluate(() => { TR.rec = false; });   // nothing a setup does is heard
  if (shot.setup) await shot.setup(g);
  await page.evaluate(() => { TR.local = 0; TR.rec = true; });
  timeline.push({ name: shot.name, start: +(frameNo / FPS).toFixed(3), t: await page.evaluate(() => TR.t) });
  const fn = `(${shot.frame.toString()})`;
  for (let i = 0; i < shot.frames; i++, frameNo++) {
    await page.evaluate(([fn, i, n]) => eval(fn)(i, n), [fn, i, shot.frames]);
    // keep the logged clock on the frame clock, whatever a shot's frame() added
    await page.evaluate((t) => { TR.t = t; }, (frameNo + 1) / FPS);
    if (process.env.TRDEBUG && i % 15 === 0) console.log(shot.name, i, await page.evaluate(() => {
      if (Game.mode !== 'scenario') return Game.mode;
      const p = Game.player, h = Game.scenario.enemies.map(e => `${e.name}/${e.team}/${e.state}/h${e.health}/${Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(0)}m/${TR.sees(e) ? 'S' : '-'}`);
      return `${JSON.stringify(TR.spot || null)} p(${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)}) yaw ${p.yaw.toFixed(2)} ammo ${Game.gun.ammo} ${TR.gs.phase} | ${h.join(' ')}`;
    }));
    if (STILLS) {
      if (i % STILLS === 0) await page.screenshot({ path: path.join(stillsDir, `${String(frameNo).padStart(4, '0')}-${shot.name}.jpg`), type: 'jpeg', quality: 80 });
    } else {
      fs.writeSync(frames, await page.screenshot({ type: 'jpeg', quality: 93 }));
    }
  }
  console.log(`${shot.name}: ${shot.frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s so far`);
}
const ev = await page.evaluate(() => TR.ev);
fs.writeFileSync(path.join(OUT, STILLS ? 'events.stills.json' : 'events.json'), JSON.stringify({ fps: FPS, frames: frameNo, timeline, events: ev }, null, 0));
console.log(`${frameNo} frames (${(frameNo / FPS).toFixed(1)} s), ${ev.length} sound events, page errors: ${JSON.stringify(g.errs)}`);
await g.close();
if (frames !== null) {
  fs.closeSync(frames);
  const r = spawnSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', MJPEG,
    '-c:v', 'libvpx', '-b:v', '12M', '-crf', '5', '-qmin', '0', '-qmax', '24', '-deadline', 'good', '-cpu-used', '1',
    '-pix_fmt', 'yuv420p', path.join(OUT, 'picture.webm')], { stdio: 'inherit' });
  fs.unlinkSync(MJPEG);
  if (r.status) process.exit(r.status);
  console.log('wrote', path.join(OUT, 'picture.webm'));
}
