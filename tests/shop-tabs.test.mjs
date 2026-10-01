// v1.128 (backlog D.5 B, Michael: A): the shop has four tabs by what a thing is for, Guns · Ammo · Gear · Mods, in
// place of BBs · Loadout · Guns · Accessories · Equipment. Same rows, prices and look; only where they sit. Checked by
// clicking each tab: its sections, and that every catalog row, BB colour, eyewear, armour piece, shoe and mod shows
// on exactly one tab. Then a speed loader is bought from Ammo and a red dot from Mods with real clicks.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); });
const read = () => page.evaluate(() => {
  const el = document.getElementById('shopScreen');
  return {
    tabs: [...el.querySelectorAll('.cat-tab')].map(e => e.textContent),
    active: (el.querySelector('.cat-tab.active') || {}).textContent,
    headers: [...el.querySelectorAll('.shop-section-header span:first-child')].map(e => e.textContent),
    rows: [...el.querySelectorAll('.shop-item .shop-item-name')].map(e => e.childNodes[0].textContent.trim()),
    colours: [...el.querySelectorAll('.shop-color-name')].map(e => e.textContent),
  };
});
const clickTab = (name) => page.evaluate(name => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === name).click(), name);
const first = await read();
console.log('  ', JSON.stringify({ tabs: first.tabs, active: first.active }));
check('four tabs: Guns, Ammo, Gear, Mods', first.tabs.join() === 'Guns,Ammo,Gear,Mods', first.tabs);
check('the shop opens on Guns', first.active === 'Guns', first.active);
const seen = {};
for (const tab of first.tabs) {
  await clickTab(tab);
  const r = await read();
  seen[tab] = r;
  console.log(`   ${tab}: ${JSON.stringify(r.headers)} ${r.rows.length} rows, ${r.colours.length} colours`);
  await g.shot('shop-' + tab.toLowerCase());
}
check('Guns: the guns, as before', seen.Guns.headers.join() === 'Guns' && seen.Guns.rows.length >= 8, seen.Guns.headers);
check('Ammo: BB packs, speed loaders, BB colours', seen.Ammo.headers.join() === 'Restock BBs,Speed Loaders,BB Color' && seen.Ammo.colours.length >= 7, seen.Ammo.headers);
check('Gear: belt & holster, eyewear, armour, shoes', seen.Gear.headers.join() === 'Belt & Holster,Eyewear,Body Armor,Shoes', seen.Gear.headers);
check('Mods: the sights, lasers and flashlight', seen.Mods.headers.join() === 'Gun Mods', seen.Mods.headers);
const want = await page.evaluate(() => ({
  catalog: SHOP_CATALOG.map(i => i.name), mods: Object.values(ATTACHMENTS).map(a => a.name),
  gear: [...Object.values(EYEWEAR), ...Object.values(ARMOR), ...Object.values(SHOES)].map(e => e.name),
  guns: Object.keys(GUN_MAGS).length, colours: BB_COLOR_SHOP.map(c => c.name),
}));
const all = Object.values(seen).flatMap(r => r.rows);
const count = n => all.filter(x => x === n).length;
const missing = [...want.catalog, ...want.mods, ...want.gear].filter(n => count(n) !== 1);
check('every catalog row, mod and piece of gear is on exactly one tab', missing.length === 0, missing);
check('every BB colour is on Ammo', want.colours.every(c => seen.Ammo.colours.includes(c)), want.colours);
check('no tab is called Loadout, BBs, Accessories or Equipment', !first.tabs.some(t => /Loadout|BBs|Accessories|Equipment/.test(t)));

// buy with real clicks
const buy = (tab, name) => page.evaluate(([tab, name]) => {
  [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === tab).click();
  const row = [...document.querySelectorAll('#shopScreen .shop-item')].find(r => r.querySelector('.shop-item-name').childNodes[0].textContent.trim() === name);
  row.querySelector('.shop-item-buy').click();
  return { loaders: Game.persist.speedLoaders.length, reddot: Game.persist.ownedEquipment.attachments.red_dot || 0, cash: Game.persist.cash, flash: shopState.flash };
}, [tab, name]);
const before = await page.evaluate(() => ({ loaders: Game.persist.speedLoaders.length, cash: Game.persist.cash }));
const a = await buy('Ammo', 'Speed Loader (50 BBs)');
check('a speed loader bought from Ammo', a.loaders === before.loaders + 1 && a.cash === before.cash - 15, { before, a });
const redDot = await page.evaluate(() => Object.entries(ATTACHMENTS).find(([, v]) => /red.dot/i.test(v.name)));
const b = await buy('Mods', redDot[1].name);
check('a red dot bought from Mods', /Bought/.test(b.flash) && b.cash === a.cash - redDot[1].price, b);
// an old save's remembered tab falls back to the first
const back = await page.evaluate(() => { closeShop(); shopState.activeTab = 'Loadout'; openShop(); const t = shopState.activeTab; closeShop(); return t; });
check('a stale tab name opens on Guns', back === 'Guns', back);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
