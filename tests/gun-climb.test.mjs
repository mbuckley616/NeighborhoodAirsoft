// v1.458 (backlog D.88, Michael: B, "give held automatics a climb, then measure again", 8 Nov 2026): a held automatic's
// aim walks up and a little to the side, shot by shot, and comes back down on its own (slowly while the trigger is held,
// quickly once it is let go). The first shot of a pull goes where you aimed; a light gun climbs most, the belt-fed least;
// aimed and crouched less; the sock-padded stock and the shoelace sling ease it, the bipod's legs nearly stop it; a semi
// never climbs; your saved aim (`Game.player.pitch`) is never moved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// one held burst: the climb at 0.25, 1 and 2 s, the pitch each shot leaves at (first shot, last half second), then 0.5 s let go
async function burst(gt, opts = {}) {
  await page.evaluate(([gt, opts]) => {
    Game.persist.bag = 5000; Game.persist.owned[gt] = true;
    Game.persist.loadoutSlots[0] = { kind: 'gun', refId: gt }; Game.persist.equipped.gun = gt;
    ensureGunSlots(gt);
    const at = Game.persist.equipped.attachments[gt] || {};
    for (const k of ['under', 'stock']) if (at[k]) at[k] = null;
    for (const [slot, type] of opts.parts || []) { const i = makeAccessoryInstance(type); mountAccessory(gt, i.id, slot, -1); }
  }, [gt, opts]);
  await g.scenario('bunratty_sean');
  return page.evaluate((opts) => {
    const P = Game.player, G = Game.gun, step = () => stepGame(1 / 60);
    P.maxHits = 999; P.pitch = 0;
    for (const e of Game.scenario.enemies) { e.noFire = true; e.pos.x += 400; }
    P.adsTarget = opts.ads ? 1 : 0;
    if (opts.crouch) Game.keys['ControlLeft'] = Game.keys['KeyC'] = true;
    for (let i = 0; i < 90; i++) step();
    G.ammo = G.maxAmmo = 999; G.cocked = true; G.jammed = false; G._jamIn = 0;
    // the pitch each shot leaves at: the camera's, which fireBB aims down
    const shots = [];
    if (!window.__fb0) { window.__fb0 = fireBB; fireBB = function () { if (window.__shots) __shots.push(Game.camera.rotation.x); return __fb0.apply(this, arguments); }; }
    window.__shots = shots;
    Game.mouseLMB = true; onLmbDown();
    const out = { gt: G.type, mode: G.fireMode, saved: [] };
    for (let f = 1; f <= 120; f++) {
      step(); G.ammo = Math.max(G.ammo, 500); G.jammed = false;
      if (f === 90) out.n90 = shots.length;
      if (f === 15) out.c025 = G._climb || 0;
      if (f === 60) out.c1 = G._climb || 0;
      out.saved.push(P.pitch);
      if (G.fireMode !== 'auto' && f % 10 === 0) { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); step(); G.cocked = true; Game.mouseLMB = true; onLmbDown(); }
    }
    out.c2 = G._climb || 0; out.yaw2 = G._climbYaw || 0;
    const late = shots.slice(out.n90);
    out.first = shots[0]; out.late = late.length ? late.reduce((a, b) => a + b, 0) / late.length : null; out.shots = shots.length;
    window.__shots = null;
    Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp();
    for (let i = 0; i < 30; i++) step();
    out.after = G._climb || 0;
    out.savedMoved = Math.max(...out.saved.map(Math.abs)); delete out.saved;
    Game.keys['ControlLeft'] = Game.keys['KeyC'] = false;
    return out;
  }, opts);
}
const f = x => x == null ? x : +x.toFixed(4);
const show = (k, r) => console.log(`   ${k}: climb ${f(r.c025)} / ${f(r.c1)} / ${f(r.c2)} rad at 0.25/1/2 s, side ${f(r.yaw2)}, first BB ${f(r.first)}, late BBs ${f(r.late)}, let go 0.5 s ${f(r.after)}, saved aim moved ${f(r.savedMoved)}`);

const ak = await burst('ak47'); show('AK-47 hip', ak);
check('AK-47 held: the aim climbs and keeps climbing (0.25 s < 1 s < 2 s), 0.012-0.05 rad at 2 s, under the 0.08 cap', ak.c025 > 0 && ak.c1 > ak.c025 && ak.c2 > ak.c1 && ak.c2 > 0.012 && ak.c2 < 0.05, ak);
check('AK-47: the first BB goes where you aimed (within 0.01 rad of level) and the last half second\'s BBs fly higher', Math.abs(ak.first) < 0.01 && ak.late - ak.first > 0.01, ak);
check('AK-47: let go, the aim is back within a tenth in 0.5 s; your saved aim never moved', ak.after < ak.c2 * 0.1 && ak.savedMoved === 0, ak);
const akA = await burst('ak47', { ads: true }); show('AK-47 aimed', akA);
const akP = await burst('ak47', { ads: true, parts: [['stock', 'sock_stock'], ['under', 'sling']] }); show('AK-47 aimed, sock stock + shoelace sling', akP);
check('aimed, the AK climbs less than from the hip; the sock-padded stock and the shoelace sling ease it to about half (0.4-0.65)',
  akA.c2 < ak.c2 && akP.c2 / akA.c2 > 0.4 && akP.c2 / akA.c2 < 0.65, { ak: ak.c2, akA: akA.c2, akP: akP.c2 });
const mac = await burst('mac10'); show('MAC-10 hip', mac);
const m60 = await burst('m60'); show('M60 hip', m60);
check('the light MAC-10 climbs more than the AK, the belt-fed M60 less', mac.c2 > ak.c2 && m60.c2 < ak.c2, { mac: mac.c2, ak: ak.c2, m60: m60.c2 });
const pis = await burst('pistol'); show('Spring Pistol (semi)', pis);
check('a semi never climbs, however fast you pull', pis.mode !== 'auto' && pis.c2 === 0 && pis.c1 === 0, pis);
await g.close();
