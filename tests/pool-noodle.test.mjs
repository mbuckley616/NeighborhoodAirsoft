// v1.249 (backlog D.36, Michael: A): the pool noodle. Sold at airsoft.com for $15 on the Gear tab, carried in a
// loadout slot; V swings it from anything you hold, or hold its slot and click; a kid of the other side within 1.6 m,
// in front of you and not behind a wall, is tagged as a BB tags him and says something about it. Checked: the shop row
// and the buy, the loadout picker, then swings in the Hollow 3v3 with one of their kids stood where it should or
// shouldn't land (the other side's guns held, your side's too, so nothing else tags anyone).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- the shop
const shop = await page.evaluate(() => {
  Game.persist.cash = 50;
  openShop(); shopState.activeTab = 'Gear'; renderShop();
  const rows = [...document.querySelectorAll('#shopScreen .shop-item')];
  const row = rows.find(r => /Pool Noodle/.test(r.textContent));
  const out = { found: !!row, price: row && row.querySelector('.shop-item-price').textContent, pic: !!(row && row.querySelector('img')),
    header: [...document.querySelectorAll('#shopScreen .shop-section-header')].map(h => h.textContent).find(t => /Backup/.test(t)) || null };
  row.querySelector('.shop-item-buy').click();
  const row2 = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => /Pool Noodle/.test(r.textContent));
  out.after = { owned: Game.persist.owned.pool_noodle, cash: Game.persist.cash, button: row2 && row2.querySelector('.shop-item-buy').textContent };
  closeShop && closeShop();
  return out;
});
console.log('   shop:', JSON.stringify(shop));
check('the Gear tab sells the Pool Noodle for $15 under Backup, with its picture', shop.found && shop.price === '$15' && shop.pic && shop.header, shop);
check('buying it: owned, $15 gone, the button says OWNED', shop.after.owned === true && shop.after.cash === 35 && shop.after.button === 'OWNED', shop.after);

// --- the loadout
const lo = await page.evaluate(() => {
  const before = getAvailableSlotItems().filter(i => i.slotData.kind === 'noodle').length;
  Game.persist.loadoutSlots[1] = { kind: 'noodle' };
  const after = getAvailableSlotItems().filter(i => i.slotData.kind === 'noodle').length;
  return { before, after, desc: describeSlot(1), weight: computeLoadoutWeight().parts.find(p => /noodle/i.test(p.label)) };
});
console.log('   loadout:', JSON.stringify(lo));
check('the loadout offers it once, and not again once it is in a slot (slot 2, "Pool Noodle", 0.3 lb)', lo.before === 1 && lo.after === 0 && lo.desc.name === 'Pool Noodle' && lo.weight && lo.weight.w === 0.3, lo);

// --- swings in a match
await g.scenario('hollow_skirmish_3v3');
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.noFire = true; Game.player.maxHits = 999; for (let i = 0; i < 160; i++) stepGame(1 / 60); });
// stand one of their kids at (forward, right) metres from you, you facing -z on clear ground; returns his name
const place = (fwd, right) => page.evaluate(([fwd, right]) => {
  const P = Game.player;
  const c = findClearSpawn(0, 0, P.obstacles, 1.2); P.pos.x = c.x; P.pos.z = c.z; P.yaw = 0; P.pitch = 0;
  P.pos.y = scenarioGroundY(P.pos.x, P.pos.z);
  const k = Game.scenario.enemies.find(e => e.team !== 'player' && e.health > 0 && e.state !== 'retreating');
  for (const e of Game.scenario.enemies) if (e !== k) { e.pos.x = 60; e.pos.z = 60; }   // everyone else far off
  k.pos.x = P.pos.x + right; k.pos.z = P.pos.z - fwd; k.pos.y = scenarioGroundY(k.pos.x, k.pos.z);
  k._freeze = { x: k.pos.x, z: k.pos.z };
  Game.noodle.cd = 0;
  return k.name;
}, [fwd, right]);
// swing with a real V, step 0.5 s holding him where he stands; did he go out?
const swing = (how = 'V') => page.evaluate(async (how) => {
  const k = Game.scenario.enemies.find(e => e._freeze && e.health > 0);
  const before = { health: k.health, state: k.state, hits: Game.noodle.hits.length, swings: Game.noodle.swings };
  k._hits0 = Game.noodle.hits.length;
  return { k: k.name, before };
}, how).then(async (b) => {
  if (how === 'V') await page.keyboard.press('KeyV'); else await page.evaluate(() => onLmbDown());
  // fix-up (PR #75, CI on fe746aa): held where he stands through the swing itself too, not only after it; a kid
  // repositioning walked out of the 1 m reach during these steps and the swing missed
  const mid = await page.evaluate(() => {
    const k = Game.scenario.enemies.find(e => e._freeze && e.health > 0);
    for (let i = 0; i < 6; i++) { if (k && k.state !== 'retreating' && k.health > 0) { k.pos.x = k._freeze.x; k.pos.z = k._freeze.z; } stepGame(1 / 60); }
    return { noodle: fpNoodle.visible, gun: fpGun.visible, t: Game.noodle.t };
  });
  if (how === 'mid') await g.shot('pool-noodle-swing');
  const after = await page.evaluate((name) => {
    const k = Game.scenario.enemies.find(e => e.name === name);
    for (let i = 0; i < 30; i++) { if (k.state !== 'retreating' && k.health > 0 && k._freeze) { k.pos.x = k._freeze.x; k.pos.z = k._freeze.z; } stepGame(1 / 60); }
    const r = { tagged: Game.noodle.hits.slice(k._hits0).some(h => h.name === name), state: k.state, health: k.health, line: k._lastLine || null,
      swings: Game.noodle.swings, noodleAfter: fpNoodle.visible, gunAfter: fpGun.visible };
    k._freeze = null;
    return r;
  }, b.k);
  return { ...b, mid, ...after };
});
await place(1.2, 0.1);
const hit = await swing();
console.log('   1.2 m ahead:', JSON.stringify(hit));
check('V swings it over the gun: the noodle shows mid-swing, the gun after', hit.mid.noodle && !hit.mid.gun && hit.mid.t > 0 && !hit.noodleAfter && hit.gunAfter, [hit.mid, hit.noodleAfter, hit.gunAfter]);
check('a kid 1.2 m ahead is tagged, as a BB tags him (out, walking back or down), and complains about a noodle',
  hit.tagged && (hit.state === 'retreating' || hit.health <= 0) && /noodle|NOODLE|count|stung/.test(hit.line || ''), hit);
await place(2.2, 0);
const far = await swing();
check('a kid 2.2 m ahead is out of reach', !far.tagged, far);
await place(-1.0, 0);
const behind = await swing();
check('a kid 1 m behind you is not hit', !behind.tagged, behind);
await place(0.8, 1.2);
const side = await swing();
check('a kid 1.4 m off at 56° to your right is outside the cone', !side.tagged, side);
// a wall between: you and him 1.3 m apart with a 2 m wall (a copy of one of the map's own) across the gap
await place(1.3, 0);
const wall = await page.evaluate(() => {
  const P = Game.player, tmpl = P.obstacles.find(o => o.minX != null && !o.shape && (o.h ?? 0) > 1.6 && !o.bbPass);
  if (!tmpl) return null;
  const w = { ...tmpl, minX: P.pos.x - 1, maxX: P.pos.x + 1, minZ: P.pos.z - 0.75, maxZ: P.pos.z - 0.55, _test: true };
  P.obstacles.push(w);
  return { h: w.h, blocked: !hasLineOfSight(P.pos.x, P.pos.y + 1.2, P.pos.z, P.pos.x, P.pos.y + 1, P.pos.z - 1.3, P.obstacles) };
});
if (wall) {
  const thru = await swing();
  await page.evaluate(() => { const o = Game.player.obstacles; o.splice(o.findIndex(x => x._test), 1); });
  check('not through a wall: a kid 1.3 m off behind a wall is not hit', wall.blocked && !thru.tagged, [wall, thru.tagged]);
} else check('a wall to copy', false);
// its own slot held: 2 holds the noodle, a click swings it, and a picture mid-swing
await place(1.0, 0);
await page.keyboard.press('Digit2');
const held = await page.evaluate(() => { stepGame(1 / 60); return { slot: Game.held.slotIdx, noodle: fpNoodle.visible, gun: fpGun.visible, hint: document.getElementById('loadoutHint').textContent }; });
await g.shot('pool-noodle-held');
await place(1.0, 0);   // fix-up: again, after the key, the step and the picture let him walk off
check('key 2 holds the noodle: it shows and the gun does not, and the hint says click or V', held.slot === 1 && held.noodle && !held.gun && /swing/i.test(held.hint), held);
const click = await swing('mid');
check('holding its slot, a click swings it and tags the kid 1 m ahead', click.tagged && click.swings === click.before.swings + 1, click);
// one swing at a time
const twice = await page.evaluate(() => { Game.noodle.cd = 0; Game.noodle.t = -1; const a = startNoodleSwing(); stepGame(1 / 60); const b = startNoodleSwing(); for (let i = 0; i < 50; i++) stepGame(1 / 60); const c = startNoodleSwing(); return [a, b, c]; });
check('a second V mid-swing does nothing; after 0.85 s it swings again', twice[0] && !twice[1] && twice[2], twice);
// without it in a slot, V does nothing
const none = await page.evaluate(() => { Game.persist.loadoutSlots[1] = null; Game.held.slotIdx = 0; Game.noodle.cd = 0; Game.noodle.t = -1; return startNoodleSwing(); });
check('with no noodle in a slot, V does nothing', none === false);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
