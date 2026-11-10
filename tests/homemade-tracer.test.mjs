// v1.468 (Michael: A, two more homemade parts, 9 Nov 2026): the Glow-Stick Tracer, two glow sticks taped along the end
// of a long gun's barrel. $6, 0.1 lb, the MUZZLE slot. At night your BBs draw a faint green streak behind them, so you
// see where they go; a kid of another side within 35 m who sees one go by knows where you fired from (a sighting of you
// and a pull toward you). By day the streak barely shows and the kids take nothing from it.
// Checked: the Mods tab, where it sits on the guns, the streak by night and by day, and the kids.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop: Mods tab, bought with a click
const shop = await page.evaluate(() => {
  Game.persist.cash = 1000; Game.persist.owned.ar = true; openShop();
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(t => t.textContent === 'Mods').click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent.startsWith('Glow-Stick Tracer'));
  if (!row) return null;
  const cash0 = Game.persist.cash;
  row.querySelector('.shop-item-buy').click();
  const out = { tag: row.querySelector('.shop-slot-tag').textContent, pic: !!row.querySelector('img, canvas'), paid: cash0 - Game.persist.cash,
    owned: Game.persist.ownedEquipment.attachments.glow_tracer };
  closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('Glow-Stick Tracer: in the Mods tab as MUZZLE with its picture, bought for $6', shop && shop.tag === 'MUZZLE' && shop.pic && shop.paid === 6 && shop.owned === 1, shop);

// --- on every gun with a muzzle slot: two sticks either side of the bore, reaching 4 cm past the muzzle
const geo = await page.evaluate(() => {
  const out = { rows: [], none: [] };
  for (const gt of ALL_GUN_TYPES) {
    const m = buildWorkbenchGun(gt);
    const mp = m.userData.accessories.muzzleParts;
    if (!getGunAccessoryCap(gt).muzzle) { out.none.push(gt + (mp ? '+' : '-')); continue; }
    const p = mp.meshes.glow_tracer; p.visible = true;
    m.updateWorldMatrix(true, true);
    const iv = new THREE.Matrix4().copy(m.matrixWorld).invert();
    const sticks = p.children.filter(o => o.userData.glowStick).map(o => new THREE.Box3().setFromObject(o).applyMatrix4(iv));
    const r3 = x => +x.toFixed(3);
    out.rows.push({ gt, n: sticks.length, past: r3(mp.frontZ - Math.min(...sticks.map(b => b.min.z))),
      xs: sticks.map(b => r3((b.min.x + b.max.x) / 2)) });
  }
  return out;
});
console.log('   guns:', geo.rows.length, JSON.stringify(geo.rows.slice(0, 3)), 'no slot:', geo.none.join(' '));
check('on every gun with a muzzle slot: two sticks, either side of the centre line, 4 cm past the muzzle',
  geo.rows.length >= 30 && geo.rows.every(r => r.n === 2 && Math.abs(r.past - 0.04) < 0.002 && r.xs[0] < -0.01 && r.xs[1] > 0.01), geo.rows);
check('the guns with no muzzle slot have no muzzle parts', geo.none.length > 0 && geo.none.every(s => s.endsWith('-')), geo.none);

// --- in a match on the AR, with the tracer or without
const mount = (type) => page.evaluate((type) => {
  const gt = 'ar'; Game.persist.owned[gt] = true; Game.persist.equipped.gun = gt; ensureGunSlots(gt);
  for (const k of ['sight', 'under', 'muzzle', 'stock']) clearGunSlot(gt, k, -1);
  for (const ri of [0, 1]) clearGunSlot(gt, 'rail', ri);
  if (type) { const i = getUnmountedInstances(type)[0] || makeAccessoryInstance(type); mountAccessory(gt, i.id, 'muzzle', -1); }
  Game.persist.bag = 2000;
  Game.persist.loadoutSlots = [{ kind: 'gun', refId: gt }, null, null, null];
  Game.persist.equipped.armor = {};
  return getMountedAccessories(gt).map(a => a.type);
}, type);

// fire one shot at each kid in turn (aimed at his chest), stepping the BB out; what the streak did and what each kid saw
const play = () => page.evaluate(() => {
  Game.player.maxHits = 999;
  Game.mouse.locked = true;
  for (const e of Game.scenario.enemies) e.noFire = true;
  for (let i = 0; i < 160; i++) stepGame(1 / 60);   // past the opening hold
  const out = { night: Game.scenario.timeOfDay, shots: [], weight: computeLoadoutWeight().parts.filter(p => p.label === 'Glow-Stick Tracer').map(p => p.w) };
  // a kid with no line to you who has just seen the streak takes it as a sighting of you where you fired from
  const blind = Game.scenario.enemies.find(e => e.health > 0 && aiSightY(e, combatantView(Game.player)) == null);
  if (blind) {
    blind._tracerSawAt = aiNow(); blind._tracerFrom = { x: Game.player.pos.x + 0.5, y: Game.player.pos.y, z: Game.player.pos.z };
    blind._lastSeenPos = null;
    blind._targetRef = Game.player;
    stepGame(1 / 60);
    out.blind = { kid: blind.charId, spotted: !!blind._recentlySpotted, at: blind._lastSeenPos && +(blind._lastSeenPos.x - Game.player.pos.x).toFixed(2) };
  }
  for (const e of Game.scenario.enemies) {
    if (e.health <= 0) continue;
    for (const b of Game.scenario.bbs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh); Game.scenario.bbs.length = 0;
    e._tracerLookAt = null;
    const seen0 = e._tracerSeen || 0;
    // stand 25 m from him where the line between you is clear, so the BB flies past him
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = e.pos.x + Math.cos(a) * 25, z = e.pos.z + Math.sin(a) * 25;
      if (collidesObstacles(x, z, 0.4) || !hasLineOfSight(x, 1.5, z, e.pos.x, 1.4, e.pos.z, Game.player.obstacles)) continue;
      const sb = Game.scenario.bounds; if (sb && (x < sb.minX + 1 || x > sb.maxX - 1 || z < sb.minZ + 1 || z > sb.maxZ - 1)) continue;
      Game.player.pos.x = x; Game.player.pos.z = z; Game.player.pos.y = scenarioGroundY(x, z); break;
    }
    Game.camera.position.set(Game.player.pos.x, Game.player.pos.y + Game.player.eyeOffset, Game.player.pos.z);
    Game.camera.lookAt(e.pos.x, (e.pos.y || 0) + 1.0, e.pos.z);
    Game.gun.ammo = Game.gun.maxAmmo;
    fireBB();
    const bb = Game.scenario.bbs[Game.scenario.bbs.length - 1];
    const s = bb._streak || null;
    const shot = { kid: e.charId, d: +Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z).toFixed(1), streak: !!s };
    if (s) { shot.opacity = s.material.opacity; shot.fog = s.material.fog; shot.child = s.parent === bb.mesh; }
    const lens = [];
    for (let f = 0; f < 8; f++) {
      stepGame(1 / 60);
      if (s && Game.scenario.bbs.includes(bb) && bb.canDamage) {
        const tail = new THREE.Vector3(0, 1, 0).applyQuaternion(s.quaternion);   // should point back the way it came
        lens.push({ len: +s.scale.y.toFixed(2), vis: s.visible, back: +(-tail.dot(bb.vel.clone().normalize())).toFixed(3) });
      }
    }
    for (let f = 0; f < 240 && Game.scenario.bbs.includes(bb) && bb.canDamage; f++) stepGame(1 / 60);   // the rest of its flight
    shot.flew = +bb.pos.distanceTo(bb.spawnPos).toFixed(1);
    shot.lens = lens;
    shot.saw = (e._tracerSeen || 0) - seen0;
    if (shot.saw) {
      shot.from = Math.hypot(e._tracerFrom.x - Game.player.pos.x, e._tracerFrom.z - Game.player.pos.z);
      const t0 = e._tracerSawAt, now = aiNow();
      const withIt = threatScore(e, Game.player);
      e._tracerSawAt = now - 10; const without = threatScore(e, Game.player); e._tracerSawAt = t0;
      shot.pull = +(without - withIt).toFixed(1);
    }
    out.shots.push(shot);
  }
  return out;
});

const R = {};
for (const [key, type, sc] of [['night', 'glow_tracer', 'winnmark_night_prowl'], ['bare', null, 'winnmark_night_prowl'], ['day', 'glow_tracer', 'winnmark_seth_house']]) {
  const on = await mount(type);
  await g.scenario(sc);
  R[key] = await play();
  R[key].on = on;
  await page.evaluate(() => endScenario('forfeit'));
  await page.waitForFunction(() => Game.mode !== 'scenario');
}
for (const k in R) console.log(`   ${k}:`, JSON.stringify(R[k]));
const N = R.night, B = R.bare, D = R.day;
check('night: every shot with the tracer draws a streak on the BB, bright (0.85) and unfogged', N.night === 'night' && N.shots.length > 0 && N.shots.every(s => s.streak && s.child && s.opacity === 0.85 && s.fog === false), N.shots);
check('the streak points back the way the BB came and grows to 1.4 m', N.shots.every(s => s.lens.length >= 2 && s.lens.every(l => l.vis && l.back > 0.99) && Math.max(...s.lens.map(l => l.len)) === 1.4), N.shots.map(s => s.lens));
check('without the tracer, no streak', B.shots.length > 0 && B.shots.every(s => !s.streak && !s.saw), B.shots);
check('day: the streak barely shows (0.12)', D.night === 'day' && D.shots.length > 0 && D.shots.every(s => s.streak && s.opacity === 0.12), D.shots);
check('night: a kid who sees the streak go by learns where you fired from, and turns to you (12 m nearer in his choice)',
  N.shots.some(s => s.saw) && N.shots.filter(s => s.saw).every(s => s.from < 0.01 && s.pull === 12), N.shots);
check('day: no kid takes anything from it', D.shots.every(s => !s.saw), D.shots);
check('a kid with no line to you who saw it takes it as a sighting of you there', N.blind && N.blind.spotted && N.blind.at === 0.5, N.blind);
check('Glow-Stick Tracer: 0.1 lb in the loadout weight', N.weight[0] === 0.1 && B.weight.length === 0, [N.weight, B.weight]);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
