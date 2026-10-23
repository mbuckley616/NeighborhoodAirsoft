// v1.324 (backlog D.61, Michael: C): Squad Basics, the second tutorial match, after the first 1v1 on Winnmark. You,
// Seth and Trey against Brooke, Jamie and Marcus, coached in three steps: give an order, feed BBs from the speed
// loader, win it as a team. Nobody fires until the third step. The first time, Seth gives you a 25-BB speed loader,
// yours to keep, in your first empty slot. Checked: where it sits on the ladder, the loader and its BBs, the held fire,
// each step and what moves it on, the order box beside the coach's banner, the win, and no second loader on a replay.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'winnmark_squad_basics';

const lad = await page.evaluate((id) => {
  const ids = PIN_SCENARIO_GROUPS.winnmark_court, P = Game.persist;
  P.completed = { winnmark_tutorial: true };
  const before = isScenarioUnlocked(id);
  P.completed.winnmark_seth_house = true;
  return { at: ids.indexOf(id), after: ids[ids.indexOf(id) - 1], before, open: isScenarioUnlocked(id), next: isScenarioUnlocked(ids[ids.indexOf(id) + 1]), matchup: scenarioMatchup(SCENARIOS[id]) };
}, ID);
check('Squad Basics comes after Just You and Seth, and opens the shotgun duel', lad.after === 'winnmark_seth_house' && !lad.before && lad.open && !lad.next && lad.matchup === 'TUTORIAL', lad);

const enter = async () => {
  await page.evaluate((id) => { enterScenario(id); }, ID);
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  await page.evaluate(() => document.getElementById('introBeginBtn').click());
  await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
};
await page.evaluate(() => { const P = Game.persist; P.bag = 200; P.speedLoaders = []; P.loadoutSlots = [{ kind: 'gun' }, null, null, null]; delete P.sethLoaderGiven; });
await enter();
const s0 = await page.evaluate(() => {
  const P = Game.persist, i = Tutorial.loaderSlot, sl = i >= 0 && P.speedLoaders.find(s => s.id === P.loadoutSlots[i].refId);
  return { kind: Tutorial.kind, step: document.getElementById('tutStep').textContent, slot: i, tier: sl && sl.tier, bbs: sl && sl.currentBBs,
    bag: P.bag, ammo: Game.gun.ammo, held: Game.scenario.enemies.every(e => e.noFire), canOrder: squadCanOrder(), loaders: P.speedLoaders.length };
});
check('Seth\'s 25-BB loader goes in slot 2, full from the bag, and step 1 asks for an order', s0.kind === 'squad' && /STEP 1 OF 3/.test(s0.step) && s0.slot === 1 && s0.tier === 'sl_25' && s0.bbs === 25 && s0.bag === 200 - s0.ammo - 25 && s0.canOrder, s0);
await g.spin(600);
const quiet = await page.evaluate(() => ({ held: Game.scenario.enemies.every(e => e.noFire), hits: Game.player.hitsTaken || 0, lives: Game.player.lives, mode: Game.mode }));
check('nobody fires in the first two steps (10 s)', s0.held && quiet.held && quiet.hits === 0 && quiet.mode === 'scenario', quiet);
const s1 = await page.evaluate(() => { giveSquadOrder('follow'); updateSquadHud();
  const box = id => { const el = document.getElementById(id); if (!el || getComputedStyle(el).display === 'none') return null; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const a = box('squadHud'), b = box('tutorialHud');
  return { step: Tutorial.step, sq: a, tut: b, overlap: !!(a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) }; });
check('an order moves it to step 2, and the order box shows clear of the coach\'s banner', s1.step === 1 && s1.sq && s1.tut && !s1.overlap, s1);
await page.waitForFunction(() => /STEP 2 OF 3/.test(document.getElementById('tutStep').textContent), null, { timeout: 5000 });
await page.evaluate(() => { Game.gun.ammo -= 6; updateAmmoHud(); Game.held.slotIdx = Tutorial.loaderSlot; Game.mouseLMB = true; onLmbDown(); });
await g.spin(30);
const s2 = await page.evaluate(() => { Game.mouseLMB = false; onLmbUp(); const sl = describeSlot(Tutorial.loaderSlot).ref; return { step: Tutorial.step, ammo: Game.gun.ammo, max: Game.gun.maxAmmo, left: sl.currentBBs }; });
check('feeding BBs from the loader moves it to step 3', s2.step === 2 && s2.ammo === s2.max && s2.left === 25 - 6, s2);
await page.waitForFunction(() => /STEP 3 OF 3/.test(document.getElementById('tutStep').textContent), null, { timeout: 5000 });
const s3 = await page.evaluate(() => ({ free: Game.scenario.enemies.every(e => !e.noFire), instr: document.getElementById('tutInstr').textContent }));
check('step 3 lets everyone fire and counts the tags', s3.free && /0\/3 down/.test(s3.instr), s3);
await page.evaluate(() => { for (const e of Game.scenario.enemies.filter(e => e.team !== 'player')) { e.lives = 1; eliminateEnemy(e); } });
await page.waitForFunction(() => Game.mode !== 'scenario', null, { timeout: 5000 }).catch(() => {});   // the win lands 600 ms on
const won = await page.evaluate(() => {
  const P = Game.persist;
  return { mode: Game.mode, done: !!P.completed.winnmark_squad_basics, next: isScenarioUnlocked('winnmark_seth_shotgun_duel'), loaders: P.speedLoaders.length, slot: P.loadoutSlots[1] && P.loadoutSlots[1].kind };
});
check('tagging all three wins it, opens the shotgun duel, and the loader is still yours', won.mode === 'result' && won.done && won.next && won.loaders === 1 && won.slot === 'speed_loader', won);
await page.evaluate(() => enterBedroom());
await enter();
const again = await page.evaluate(() => ({ loaders: Game.persist.speedLoaders.length, slot: Tutorial.loaderSlot, bbs: describeSlot(Tutorial.loaderSlot).ref.currentBBs }));
check('a replay gives no second loader; yours fills again', again.loaders === 1 && again.slot === 1 && again.bbs === 25, again);
await page.evaluate(() => endScenario('forfeit'));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
