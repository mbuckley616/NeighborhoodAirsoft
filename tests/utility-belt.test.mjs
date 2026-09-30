// v1.106 (backlog D.5, Michael: A): the loadout slot unlocks are gear, the Utility Belt (slot 3) and the Drop-Leg
// Holster (slot 4), and their text says what each unlocks. Checked in the shop's Loadout tab and on the Loadout
// screen, before and after buying them with real clicks.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => { Game.persist.cash = 500; openShop(); shopState.activeTab = 'Loadout'; renderShop(); });
const tab = () => page.evaluate(() => {
  const el = document.getElementById('shopScreen');
  return {
    headers: [...el.querySelectorAll('.shop-section-header span:first-child')].map(e => e.textContent),
    rows: [...el.querySelectorAll('.shop-item')].map(r => ({ name: r.querySelector('.shop-item-name').textContent, desc: r.querySelector('.shop-item-desc').textContent, btn: r.querySelector('.shop-item-buy').textContent })),
  };
});
let t = await tab();
console.log('  ', JSON.stringify(t.rows.slice(0, 2)));
const belt = t.rows.find(r => r.name === 'Utility Belt'), holster = t.rows.find(r => r.name === 'Drop-Leg Holster');
check('the Loadout tab lists the Utility Belt and the Drop-Leg Holster', belt && holster, t.rows.map(r => r.name));
check('no row is called a "Loadout Slot" any more', !t.rows.some(r => /Loadout Slot/.test(r.name)));
check('their section is "Belt & Holster"', t.headers.includes('Belt & Holster'), t.headers);
check('the belt says it unlocks slot 3', /slot 3/.test(belt.desc) && /third item/.test(belt.desc), belt.desc);
check('the holster says it unlocks slot 4 and needs the belt', /slot 4/.test(holster.desc) && /Utility Belt/.test(holster.desc), holster.desc);
check('the holster is LOCKED until the belt is bought', holster.btn === 'LOCKED', holster.btn);

const loSlots = () => page.evaluate(() => { openLoadout(); const r = [...document.querySelectorAll('#loSlotsList .lo-slot')].map(d => d.textContent.trim()); closeLoadout(); return r; });
let lo = await loSlots();
check('the Loadout screen names the belt on locked slot 3', /Needs the Utility Belt/.test(lo[2]), lo[2]);
check('and the holster on locked slot 4', /Needs the Drop-Leg Holster/.test(lo[3]), lo[3]);

// buy both with real clicks on the shop rows
for (const name of ['Utility Belt', 'Drop-Leg Holster']) {
  await page.evaluate((name) => {
    if (Game.mode !== 'shop') { openShop(); }
    shopState.activeTab = 'Loadout'; renderShop();
    const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').textContent === name);
    row.querySelector('.shop-item-buy').click();
  }, name);
}
t = await tab();
const flags = await page.evaluate(() => ({ s3: Game.persist.owned.slot_3, s4: Game.persist.owned.slot_4, n: getUnlockedSlotCount(), cash: Game.persist.cash }));
check('buying both unlocks four slots and costs $110', flags.s3 && flags.s4 && flags.n === 4 && flags.cash === 390, flags);
check('both rows now read OWNED', t.rows.filter(r => r.btn === 'OWNED').map(r => r.name).join() === 'Utility Belt,Drop-Leg Holster', t.rows.map(r => r.btn));
await page.evaluate(() => closeShop());
lo = await loSlots();
check('the Loadout screen has no locked slot left', !lo.some(s => /Locked/.test(s)), lo);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
