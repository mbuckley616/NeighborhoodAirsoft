// itch.io store screenshots. Stages each scene with the trailer's director (scripted aim and fire, nobody loses,
// nobody runs dry), drives it with fixed 1/60 steps of stepGame(), and saves a few candidate frames per scene at
// 1920x1080 (a 1280x720 page at device scale 1.5, so the HUD scales with it). Pick the best by eye, then caption.mjs.
//
//   node scripts/shots/capture.mjs                     # every scene -> scripts/shots/out/candidates/<scene>-<k>.png
//   node scripts/shots/capture.mjs --only night,ctf
import { boot } from '../../tests/lib/game.mjs';
import { installDirector } from '../trailer/director.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out', 'candidates');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const ONLY = opt('only') ? opt('only').split(',') : null;

async function enter(g, id, gun, bb) {
  await g.page.evaluate(([gun, bb]) => {
    const P = Game.persist; P.cash = 99999; P.bag = 99999;
    if (gun) buyGun(gun);
    P.ownedBBColors[bb] = true; P.bbColor = bb;
    TR.noEnd = true;
  }, [gun, bb]);
  await g.scenario(id);
  await g.page.evaluate(() => {
    window.tick = function () { requestAnimationFrame(window.tick); };
    const lives = Game.player.maxHits;
    TR.prep();
    // the HUD stays (ammo, roster, hits taken are part of the pitch), so keep the real lives and never let the last one go
    const p = Game.player; p.maxHits = lives; let ht = 0;
    Object.defineProperty(p, 'hitsTaken', { configurable: true, get: () => ht, set: (v) => { ht = Math.min(v, p.maxHits - 1); } });
    if (Game.scenario.timerRemaining != null) Game.scenario.timerRemaining = 252;
    Game.persist.bag = 1840;   // the BB bag the HUD shows, not the 99999 the shop needed
    // Michael retired Priya on 22 Oct (Joe and Chris replace her); until the build catches up, she is Joe on the roster
    for (const e of Game.scenario.enemies) if (e.name === 'Priya') e.name = 'Joe';   // a clock that reads like a round (4:12), not 1e9
    document.body.classList.remove('trHideHud');
  });
}

// A firefight: let the sides close for `warm` seconds, stand where the most hostiles are in sight, then fight and
// keep a frame every `every` steps.
function battle(id, gun, bb, o = {}) {
  return {
    setup: async (g) => {
      await enter(g, id, gun, bb);
      await g.page.evaluate((o) => {
        for (let k = 0; k < 60 * (o.warm ?? 8); k++) stepGame(1 / 60);
        const b = Game.scenario.bounds || { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
        TR.spot = TR.bestSpot({ x0: Math.ceil(b.minX + 1), x1: Math.floor(b.maxX - 1), z0: Math.ceil(b.minZ + 1), z1: Math.floor(b.maxZ - 1),
          step: 2, minDist: o.minDist ?? 6, maxDist: o.maxDist ?? 22 });
        for (let k = 0; k < 15; k++) stepGame(1 / 60);
        TR.resetFight();
      }, o);
    },
    step: (o) => TR.fight({ aimK: 0.08, tol: 0.05, maxDist: 50, drift: 0.04, los: o.los ?? true }),
    opts: o,
  };
}

const SCENES = {
  bedroom: {
    setup: async (g) => g.page.evaluate(() => {
      Game.persist.cash = 140; Game.persist.bag = 250; updateBedroomHud();
      const p = Game.player; p.pos.x = 1.3; p.pos.z = 2.5; p.pitch = -0.08; p.yaw = 0.35;
      for (let k = 0; k < 30; k++) stepGame(1 / 60);
    }),
    still: true,
  },
  mirror: {
    setup: async (g) => g.page.evaluate(() => {
      Game.persist.ownedHats = { cap_back: true, bandana_red: true }; Game.persist.ownedTops = { tee_flame: true, tee_shark: true };
      openMirror();
      const L = Game.persist.look;
      const pick = (key, i) => { const row = LOOK_OPTIONS.find(r => r.key === key); if (!row) return; const o = row.opts[i % row.opts.length]; L[key] = row.kind === 'swatch' ? o : o[0]; };
      pick('hat', 1); pick('top', 1); pick('hairStyle', 1); pick('hairColor', 3); pick('pantsColor', 1);
      renderMirrorOptions(); renderMirrorPreview();
      if (MIRROR.kid) { MIRROR.kid.group.rotation.y = 0.45; MIRROR.renderer.render(MIRROR.scene, MIRROR.camera); }
    }),
    after: async (g) => g.page.evaluate(() => closeMirror()),
    still: true,
  },
  workbench: {
    setup: async (g) => g.page.evaluate(() => { Game.persist.cash = 99999; buyGun('ak47'); openWorkbench(); }),
    // the bench turns the gun itself on the real loop; give it a moment and render
    shoot: async (g) => { await g.page.evaluate(() => { workbenchSelectGun('ak47'); WB.autoRotate = false; WB.yaw = 0.55; updateWorkbench(0); }); },
    after: async (g) => g.page.evaluate(() => closeWorkbench()),
    still: true,
  },
  map: {
    setup: async (g) => g.page.evaluate(() => { isScenarioUnlocked = () => true; isZoneUnlocked = () => true; openMap(); }),
    after: async (g) => g.page.evaluate(() => closeMap()),
    still: true,
  },
  duel: {
    setup: async (g) => {
      await enter(g, 'lot_1v1_marcus', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        const kid = Game.scenario.enemies[0], p = Game.player; let at = null;
        for (let k = 0; k < 24 && !at; k++) {
          const a = p.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2, x = p.pos.x - Math.sin(a) * 5.5, z = p.pos.z - Math.cos(a) * 5.5;
          if (collidesObstacles(x, z, 0.6)) continue;
          kid.pos.x = x; kid.pos.z = z; if (TR.sees(kid)) at = { x, z, a };
        }
        TR.pinAt = at; p.yaw = at.a + 0.25; p.pitch = 0;
        let hp = kid.health; Object.defineProperty(kid, 'health', { configurable: true, get: () => hp, set: (v) => { hp = Math.max(v, 1); } });
        for (let k = 0; k < 160; k++) { kid.pos.x = at.x; kid.pos.z = at.z; stepGame(1 / 60); }
        TR.resetFight();
      });
    },
    step: () => { const kid = Game.scenario.enemies[0]; TR.fight({ aimK: 0.09, tol: 0.02, los: false, fireAfter: 0.4, pin: [{ e: kid, x: TR.pinAt.x, z: TR.pinAt.z }] }); },
    every: 9, count: 10,
  },
  treehouse: {
    setup: async (g) => {
      await enter(g, 'stoneglen_treehouse', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        const p = Game.player; p.pos.x = 0; p.pos.y = 0; p.pos.z = -1.9; p.yaw = 0; p.pitch = 0.35; p.onGround = true; p.velY = 0;
        for (const e of Game.scenario.enemies) if (!e.perch) { e.pos.x = 14; e.pos.z = 14; }
      });
    },
    step: () => {
      const p = Game.player;
      if (TR.local < 1.9 && !(p.pos.y >= 2.59 && p.onGround && !p.climbing)) {
        Game.mouse.locked = true; Game.keys.KeyW = true; p.pitch += (0.35 - p.pitch) * 0.1;
        stepGame(1 / 60); TR.t += 1 / 60; TR.local += 1 / 60;
      } else TR.fight({ aimK: 0.14, tol: 0.03, target: () => Game.scenario.enemies.find(e => e.perch && e.health > 0) || null });
    },
    every: 14, count: 12,
  },
  woods: battle('hollow_big_battle', 'ak47', 'yellow', { warm: 9, maxDist: 24, minDist: 7 }),
  night: { ...battle('lot_night_4v4', 'mp5', 'glow', { warm: 9, maxDist: 40, los: false }), setup: async (g) => {
    await enter(g, 'lot_night_4v4', 'mp5', 'glow');
    await g.page.evaluate(() => { for (let k = 0; k < 60 * 9 + 20; k++) stepGame(1 / 60); TR.resetFight(); });
  } },
  zombies: {
    setup: async (g) => {
      await enter(g, 'bunratty_infection', 'shotgun', 'yellow');
      await g.page.evaluate(() => {
        const near = () => Math.min(...TR.hostiles().map(e => Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z)));
        for (let k = 0; k < 60 * 25 && near() > 9; k++) stepGame(1 / 60);
        TR.resetFight();
      });
    },
    step: () => TR.fight({ aimK: 0.12, tol: 0.04, keys: { KeyS: TR.local < 1.0 }, maxDist: 30, drift: 0.05 }),
  },
  ctf: battle('bellfield_ctf', 'ump', 'orange', { warm: 7 }),
  portables: battle('school_portables_3v3', 'mp5', 'blue', { warm: 7 }),
  club: battle('club_eighteenth_3v3', 'ump', 'pink', { warm: 7 }),
  store: battle('store_price_check_3v3', 'mac10', 'green', { warm: 6, maxDist: 22, minDist: 5 }),
  creek: battle('northcliff_twins_3v3', 'ak47', 'orange', { warm: 7 }),
  squad: battle('bunratty_team_4v4', 'ak47', 'yellow', { warm: 6 }),
  culdesac: battle('winnmark_whole_block', 'shotgun', 'yellow', { warm: 6, maxDist: 20, minDist: 5 }),
  woodsnight: battle('hollow_full_auto_mayhem', 'mp5', 'glow', { warm: 9, maxDist: 35, los: false }),
  result: {
    setup: async (g) => {
      await enter(g, 'winnmark_defend_culdesac', 'pistol', 'yellow');
      await g.page.evaluate(() => {
        for (let k = 0; k < 60; k++) stepGame(1 / 60);
        Game.scenario.winByTimer = true; TR.realEnd('win');
      });
    },
    still: true,
  },
};

fs.mkdirSync(OUT, { recursive: true });
const g = await boot({ scale: 1.5 }); const { page } = g;
await g.bedroom();
await page.evaluate(installDirector);
await page.evaluate(() => {
  Game.persist.cash = 99999; Game.persist.bag = 99999; document.body.classList.remove('trHideHud');
  // the loadout and stance panels list empty and locked slots (busy, and the wrong first impression); the hit vignette reads as a tint fault in a still
  const css = document.createElement('style'); css.textContent = '#loadoutHud, #stanceHud, #damageVignette { display:none !important; }'; document.head.appendChild(css);
});

const t0 = Date.now();
for (const [name, sc] of Object.entries(SCENES)) {
  if (ONLY && !ONLY.includes(name)) continue;
  try {
    await page.evaluate(() => { TR.spot = null; });
    await sc.setup(g);
    const save = async (k) => {
      await page.evaluate(() => TR.render());
      await page.screenshot({ path: path.join(OUT, `${name}-${String(k).padStart(2, '0')}.png`), timeout: 90000 });
    };
    if (sc.still) {
      if (sc.shoot) await sc.shoot(g);
      else await page.evaluate(() => TR.render());
      await page.screenshot({ path: path.join(OUT, `${name}-00.png`), timeout: 90000 });
    } else {
      const every = sc.every || 12, count = sc.count || 10, fn = `(${sc.step.toString()})`;
      for (let k = 0; k < count; k++) {
        await page.evaluate(([fn, n, o]) => {
          const f = eval(fn); for (let i = 0; i < n && Game.mode === 'scenario'; i++) f(o);
          Game.persist.bag = 1840; Game.persist.cash = 86; updateAmmoHud?.();   // the match HUD shows both (v1.260): plausible, not the shop's 99999
        }, [fn, every, sc.opts || {}]);
        await save(k);
      }
    }
    if (sc.after) await sc.after(g);
    const info = await page.evaluate(() => ({ mode: Game.mode, spot: TR.spot || null }));
    console.log(`${name}: done (${((Date.now() - t0) / 1000).toFixed(0)} s) ${JSON.stringify(info)}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message.split('\n')[0].slice(0, 200)}`);
    await page.evaluate(() => { if (Game.mode !== 'bedroom' && typeof enterBedroom === 'function') try { enterBedroom(); } catch {} }).catch(() => {});
  }
}
console.log('page errors:', JSON.stringify(g.errs));
await g.close();
