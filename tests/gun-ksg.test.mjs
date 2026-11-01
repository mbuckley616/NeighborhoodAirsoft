// v1.411 (backlog D.63, Michael: A; batch 6 by his A of 1 Nov): the KSG, a bullpup pump shotgun. The Spring Shotgun's
// 2 or 3 BBs a pump from two tubes (60), a wider cloud from the short barrel, the quickest pump and the quickest walk
// of the shotguns. Checked: the shop, the spec against the other shotguns, and a match with it (pumped the real way,
// its model, hands and bead).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const sh = await page.evaluate(() => {
  Game.persist.cash = 1000; openShop();
  document.querySelector('#shopScreen .shop-gun-kind[data-kind="SHOTGUNS"]').click();
  const names = [...document.querySelectorAll('#shopScreen .shop-gun-row .shop-item-name')].map(e => e.childNodes[0].textContent.trim());
  const row = [...document.querySelectorAll('#shopScreen .shop-gun-row')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === 'KSG');
  const pic = !!row.querySelector('img');
  row.querySelector('.shop-item-buy').click();
  const cash0 = Game.persist.cash;
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const text = document.querySelector('#shopScreen').textContent;
  const out = { names, pic, paid: cash0 - Game.persist.cash, equipped: Game.persist.equipped.gun, spare: text.includes('Spare KSG Shells (60)') };
  document.querySelector('#shopScreen .shop-back-btn').click(); closeShop();
  const sp = gt => { const s = getGunSpec(gt); return { v: s.muzzleVelocity, base: s.baseSpread, straight: s.curveOnsetDistance, cock: s.cockTime, walk: s.playerSpeedMult, type: s.cockType, mode: s.fireMode, electric: !!s.electric, w: GUN_WEIGHT[gt], cap: getMaxAmmoForGun(gt) }; };
  out.k = sp('ksg'); out.others = ['shotgun', 'thunder', 'spas', 'semishotgun'].map(sp);
  const P = getGunSpec('ksg');
  out.pellets = [...new Set(Array.from({ length: 300 }, () => P.pelletsPerShot()))].sort();
  return out;
});
console.log('   SHOTGUNS: ' + sh.names.join(' · '));
console.log('   specs ' + JSON.stringify({ k: sh.k, others: sh.others }));
check('KSG: under SHOTGUNS after the SPAS-12, before the Semi-Auto Shotgun, with its picture, $150 from its page, in your hands; the page sells its spare shells',
  JSON.stringify(sh.names) === '["Spring Shotgun","Thunder Pump","SPAS-12","KSG","Semi-Auto Shotgun"]' && sh.pic && sh.paid === 150 && sh.equipped === 'ksg' && sh.spare, sh);
const [spring, thunder, spas] = sh.others;
check('KSG: a spring pump with the Spring Shotgun\'s 2 or 3 BBs at 30 m/s; a wider cloud (0.62) and straight for less (7 m); the quickest pump (0.7 s) and the quickest walk (1.04) of the shotguns; the most shells (60)',
  sh.k.type === 'pump' && sh.k.mode === 'semi' && !sh.k.electric && JSON.stringify(sh.pellets) === '[2,3]' && sh.k.v === spring.v
  && sh.k.base === 0.62 && sh.k.base > spring.base && sh.k.base > spas.base && sh.k.straight === 7 && sh.k.straight < spring.straight
  && sh.k.cock === 0.7 && sh.k.cock < spring.cock && sh.k.cock < thunder.cock && sh.k.cock < spas.cock
  && sh.others.every(o => sh.k.walk > o.walk) && sh.others.every(o => sh.k.cap >= o.cap) && sh.k.cap === 60
  && sh.k.w > spring.w && sh.k.w < spas.w, sh);
await page.evaluate(() => { Game.persist.bag = 3000; Game.persist.loadoutSlots[0] = { kind: 'gun', refId: 'ksg' }; });
await g.scenario('bunratty_sean');
const K = await page.evaluate(() => {
  Game.player.maxHits = 999; Game.player.pitch = 0;
  for (const e of Game.scenario.enemies) e.noFire = true;
  const step = () => stepGame(1 / 60);
  const up = () => { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); };
  const pull = () => { Game.mouseLMB = true; onLmbDown(); step(); step(); up(); step(); };
  const out = { mesh: fpGun && fpGun.userData.gunType, max: Game.gun.maxAmmo };
  for (let i = 0; i < 90; i++) step();
  const per = [], ready = [];
  for (let k = 0; k < 6; k++) {
    const a = Game.gun.ammo; pull(); per.push(a - Game.gun.ammo);
    let f = 0;
    Game.mouseLMB = true; onLmbDown();
    while (Game.gun.cockProgress < 0.95 && f < 600) { step(); f++; }
    up();
    while (!Game.gun.cocked && f < 900) { step(); f++; }
    ready.push(+(f / 60).toFixed(2));
  }
  out.per = per; out.ready = ready;
  for (let i = 0; i < 90; i++) step();
  Game.player.adsTarget = 1;
  for (let i = 0; i < 30; i++) { Game.player.ads = 1; step(); }
  fpGun.updateMatrix();
  let tip = null;
  fpGun.traverse(o => { if (o.userData && o.userData.frontSight) tip = o; });
  tip.geometry.computeBoundingBox();
  const p = new THREE.Vector3(0, tip.geometry.boundingBox.max.y, 0).add(tip.position).applyMatrix4(fpGun.matrix);
  out.sightErrDeg = +(Math.atan2(Math.hypot(p.x, p.y), -p.z) * 180 / Math.PI).toFixed(2);
  out.hands = !!(fpGun.userData.fpHands && fpGun.userData.fpHands.r && fpGun.userData.fpHands.l);
  out.pump = fpGun.userData.cockingParts.length === 1 && fpGun.userData.cockingParts[0].children.length > 10;
  let tubes = 0; fpGun.traverse(o => { if (o.name === 'tube') tubes++; });
  out.tubes = tubes;
  out.parts = ['grip', 'body', 'buttpad', 'bodyRail'].every(n => !!fpGun.getObjectByName(n)) && !fpGun.getObjectByName('wrist') && !fpGun.getObjectByName('stock');
  // the bullpup: the body runs back past where the Spring Shotgun's wrist began, the butt behind the grip
  const body = fpGun.getObjectByName('body'), grip = fpGun.getObjectByName('grip');
  out.buttBehindGrip = +(body.position.z + 0.10 - grip.position.z).toFixed(3);
  return out;
});
await g.shot('gun-ksg-aimed');
console.log('   ksg ' + JSON.stringify(K));
check('KSG: its own first-person gun, 60 in its tubes, two tubes under the barrel, a pistol grip and the long body back to the butt (16 cm or more behind the grip), the ribbed pump, both hands on it, aimed the bead on the reticle (under 0.6°)',
  K.mesh === 'ksg' && K.max === 60 && K.tubes === 2 && K.parts && K.buttBehindGrip >= 0.16 && K.pump && K.hands && K.sightErrDeg < 0.6, K);
check('KSG: six shots, pumped between, throw 2 or 3 BBs each', K.per.length === 6 && K.per.every(n => n === 2 || n === 3), K.per);
// shot to ready = the fire cooldown, the pull (0.95 of the cock time) and the 0.18 s spring forward: about 1.05 s for
// the KSG's 0.7 s pump, about 1.2 s for the Spring Shotgun's 0.85 and 1.35 for the SPAS-12's 1.0
check('KSG: from a shot to the next one ready takes about a second (0.9 to 1.15 s), quicker than the Spring Shotgun\'s 1.2', K.ready.every(t => t >= 0.9 && t < 1.15), K.ready);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
