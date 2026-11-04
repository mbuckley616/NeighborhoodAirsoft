// v1.433 (backlog D.85, Michael: A, gun batch 7, 4 Nov): the Derringer, a two-shot pocket pistol on the Double-Barrel's
// mechanism. Two barrels of a BB each, a pull each, then tip them up and load (0.9 s). Checked: the shop, the spec
// against the other pistols, and a match with it (the pair, the load, the barrels tipping up, the blade on the reticle).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'Derringer');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, line: text.includes('Break-action, 2 barrels'), paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare BB Tin (20)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { gt, v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, walk: s.playerSpeedMult, type: s.cockType, mode: s.fireMode, barrels: s.barrels || 0, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.d = sp('derringer'); out.pistols = ['pistol', 'sixshooter', 'boltpistol', 'epistol', 'gaspistol', 'magnum'].map(sp);
  out.fastest = Math.max(...ALL_GUN_TYPES.filter(t => t !== 'derringer').map(t => getGunSpec(t).playerSpeedMult || 1));
  out.lightest = Math.min(...ALL_GUN_TYPES.filter(t => t !== 'derringer').map(t => GUN_WEIGHT[t] || 99));
  out.pellets = [...new Set(Array.from({ length: 100 }, () => getGunSpec('derringer').pelletsPerShot()))];
  return out;
});
console.log('   PISTOLS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify(sh.d) + ' fastest other ' + sh.fastest + ' lightest other ' + sh.lightest);
check('Derringer: under PISTOLS after the Spring Pistol, with its picture and "Break-action, 2 barrels" in its line, $35 from its page, in your hands; the page sells its spare tin',
  JSON.stringify(sh.names) === '["Spring Pistol","Derringer","Six-Shooter","Bolt Pistol","Electric Pistol","Auto Pistol","Gas Pistol","Magnum","Snub-Nose"]' && sh.pic && sh.line && sh.paid === 35 && sh.equipped === 'derringer' && sh.spare, sh);
check('Derringer: two barrels of a BB each, "break", 0.9 s to load; the slowest, widest pistol BB that wanders soonest; the lightest gun and the fastest walk; 20 in the tin',
  sh.d.barrels === 2 && sh.d.type === 'break' && sh.d.mode === 'semi' && JSON.stringify(sh.pellets) === '[1]' && sh.d.cock === 0.9
  && sh.pistols.every(p => sh.d.v < p.v && sh.d.base >= p.base && sh.d.straight < p.straight)
  && sh.d.walk > sh.fastest && sh.d.w < sh.lightest && sh.d.cap === 20, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'derringer' }; });
await g.scenario('bunratty_sean');
const D = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { const a = Game.gun.ammo; Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); return a - Game.gun.ammo; };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  const pairs = [], ready = [], swing = [];
  const pivot = fpGun.userData.breakPivot;
  for (let k = 0; k < 4; k++) {
    const first = pull(); const cockedAfterFirst = Game.gun.cocked;
    for (let i = 0; i < 20; i++) step();
    const statusAfterFirst = document.getElementById('ammoStatus').textContent;
    const second = pull(); const cockedAfterSecond = Game.gun.cocked;
    for (let i = 0; i < 20; i++) step();
    const third = pull();
    // v1.436 (critic, 4 Nov): the ammo panel's status line follows the gun: READY with a barrel still to fire, HOLD LMB
    // TO RACK once both are fired, and still so while it is being loaded
    const st = () => document.getElementById('ammoStatus').textContent;
    pairs.push({ first, second, third, cockedAfterFirst, cockedAfterSecond, statusAfterFirst, status: st() });
    if (k === 0) { out.hint = (document.querySelector('#loadoutHint') || {}).textContent || document.body.textContent.match(/Click & hold LMB to [^.]*\./)?.[0] || ''; }
    let f = 0, maxSwing = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; maxSwing = Math.max(maxSwing, pivot.rotation.x); if (f === 20) pairs[k].statusLoading = st(); }
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    for (let i = 0; i < 20; i++) step();
    ready.push(+(f / 60).toFixed(2)); swing.push({ open: +(maxSwing * 180 / Math.PI).toFixed(1), shut: +(pivot.rotation.x * 180 / Math.PI).toFixed(2) });
  }
  out.pairs = pairs; out.ready = ready; out.swing = swing;
  for (let i = 0; i < 60; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrixWorld(true);
  const tip = pivot.getObjectByName('blade');
  tip.geometry.computeBoundingBox();
  const inv = new THREE.Matrix4().copy(Game.camera.matrixWorld).invert();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).applyMatrix4(tip.matrixWorld).applyMatrix4(inv);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  let barrels = 0; pivot.traverse(o => { if (o.name === 'barrel') barrels++; });
  out.barrels = barrels;
  out.parts = ['breech', 'frame', 'block', 'rib', 'hammer', 'trigger', 'grip'].every(n => !!fpGun.getObjectByName(n));
  const acc = fpGun.userData.accessories;
  out.rail = !!acc && acc.railAnchors.length === 1;
  return out;
});
await g.shot('gun-derringer-aimed');
console.log('   derringer ' + JSON.stringify(D));
check('Derringer: its own first-person gun, 20 in the tin, two barrels in the block, the breech, frame, rib, hammer, spur trigger and grip, one rail; aimed, the blade on the reticle (under 0.6°)',
  D.mesh === 'derringer' && D.max === 20 && D.barrels === 2 && D.parts && D.rail && D.sightErrDeg < 0.6, D);
check('Derringer: each time, two pulls fire a BB each with nothing worked between, and a third pull fires nothing until it is loaded',
  D.pairs.every(p => p.first === 1 && p.cockedAfterFirst && p.second === 1 && !p.cockedAfterSecond && p.third === 0), D.pairs);
check('Derringer: the status line reads READY with a barrel to fire, then HOLD LMB TO RACK once both are fired and while it loads (v1.436)',
  D.pairs.every(p => /^READY/.test(p.statusAfterFirst) && p.status === 'HOLD LMB TO RACK' && p.statusLoading === 'HOLD LMB TO RACK'),
  D.pairs.map(p => [p.statusAfterFirst, p.status, p.statusLoading]));
check('Derringer: the hint says to tip the barrels up', /tip the barrels up/.test(D.hint || ''), D.hint);
check('Derringer: loading it takes 0.9 to 1.2 s; the barrels tip up 30° or more and are home after', D.ready.every(t => t >= 0.85 && t < 1.2) && D.swing.every(s => s.open >= 30 && Math.abs(s.shut) < 0.5), { ready: D.ready, swing: D.swing });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
