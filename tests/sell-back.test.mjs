// v1.262 (backlog D.44, Michael: B): sell a gun back in the shop: the full price within 3 matches, half after; a gun
// bought before this build counts as used; its mags and the parts mounted on it go with it; the Spring Pistol can't be
// sold. Checked through the shop's own buttons and real matches (enterScenario → BEGIN).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'winnmark_seth_house';
const sellBtn = () => page.evaluate(() => { const b = document.querySelector('#shopScreen .shop-sell-btn'); return b ? b.textContent : null; });
const openDetail = gt => page.evaluate(gt => { openShop(); shopState.view = 'gun'; shopState.detailGun = gt; renderShop(); }, gt);
const match = async () => {
  await page.evaluate(id => { isScenarioUnlocked = () => true; enterScenario(id); }, ID);
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  await page.evaluate(() => document.getElementById('introBeginBtn').click());
  await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
  await g.spin(5);
  await page.evaluate(() => { endScenario('lose'); enterBedroom(); });
};

// Bought fresh: shotgun $60, its 60-round mag $18, two spare mags $12 each, a red dot $35 mounted on it = $137.
const fresh = await page.evaluate(() => {
  Game.persist.cash = 500;
  buyGun('shotgun'); buyGunMag('shotgun', 'shotgun_mag_60'); buyGunSpare('shotgun', 'spare_mag_shotgun'); buyGunSpare('shotgun', 'spare_mag_shotgun');
  Game.persist.cash -= ATTACHMENTS.red_dot.price; const inst = makeAccessoryInstance('red_dot'); ensureGunSlots('shotgun'); mountAccessory('shotgun', inst.id, 'sight');
  Game.persist.loadoutSlots[1] = { kind: 'spare_mag', refId: 'spare_mag_shotgun' };
  const q = gunSellQuote('shotgun');
  return { cash: Game.persist.cash, paid: q.paid, value: q.value, full: q.full, used: q.used, parts: q.parts.length };
});
check('a gun just bought, with its mag, spares and a mounted sight, quotes the full $137 back', fresh.paid === 137 && fresh.value === 137 && fresh.full && fresh.used === 0 && fresh.parts === 1, fresh);

await openDetail('shotgun');
const b0 = await sellBtn();
await page.evaluate(() => document.querySelector('#shopScreen .shop-sell-btn').click());
const b1 = await sellBtn();
check('the shop\'s SELL button asks once before it sells', b0 === 'SELL $137' && b1 === 'SURE? SELL $137', { b0, b1 });
await page.evaluate(() => document.querySelector('#shopScreen .shop-sell-btn').click());
const sold = await page.evaluate(() => ({
  cash: Game.persist.cash, owned: !!Game.persist.owned.shotgun, mag: !!Game.persist.owned.shotgun_mag_60,
  spares: Game.persist.consumables.spare_mag_shotgun || 0, slot1: Game.persist.loadoutSlots[1], gun: Game.persist.equipped.gun,
  dots: Game.persist.accessories.filter(a => a.type === 'red_dot').length, dotCount: Game.persist.ownedEquipment.attachments.red_dot,
  btn: !!document.querySelector('#shopScreen .shop-sell-btn'), buy: [...document.querySelectorAll('#shopScreen .shop-item-buy')].map(b => b.textContent)[0],
  flash: shopState.flash,
}));
check('sold: the cash is back, the gun, its mag, spares and sight are gone, you carry the Spring Pistol', sold.cash === 500 && !sold.owned && !sold.mag && sold.spares === 0 && sold.slot1 === null && sold.gun === 'pistol' && sold.dots === 0 && sold.dotCount === 0 && !sold.btn && sold.buy === 'BUY $60', sold);
await page.evaluate(() => closeShop());

// Into 3 matches it is still a free return; the 4th makes it half.
await page.evaluate(() => { buyGun('shotgun'); });
for (let i = 0; i < 3; i++) await match();
const after3 = await page.evaluate(() => { const q = gunSellQuote('shotgun'); return { used: q.used, value: q.value }; });
await match();
const after4 = await page.evaluate(() => { const q = gunSellQuote('shotgun'); return { used: q.used, value: q.value, full: q.full }; });
check('three matches in it is still the full $60; the fourth makes it half, $30', after3.used === 3 && after3.value === 60 && after4.used === 4 && after4.value === 30 && !after4.full, { after3, after4 });
await openDetail('shotgun');
const desc4 = await page.evaluate(() => document.querySelector('#shopScreen .shop-sell-row .shop-item-desc').textContent);
check('the shop says why it is half', /Half back: it has been into 4 matches/.test(desc4), desc4);
await page.evaluate(() => closeShop());

// A match counts only for the gun you carry.
const carried = await page.evaluate(() => { buyGun('ar'); buyGun('shotgun'); return Game.persist.gunMatches.ar; });
await match();
const arAfter = await page.evaluate(() => Game.persist.gunMatches.ar);
check('a match counts for the gun you carry, not the others you own', carried === 0 && arAfter === 0, { carried, arAfter });

// Saved and loaded, the count holds.
const loaded = await page.evaluate(() => { saveGame(); Game.persist.gunMatches = {}; loadGame(); return Game.persist.gunMatches; });
check('the match counts survive a save and load', loaded.shotgun === 5 && loaded.ar === 0, loaded);

// A gun owned from before this build has no count: half back.
const old = await page.evaluate(() => { Game.persist.owned.sniper = true; delete Game.persist.gunMatches.sniper; const q = gunSellQuote('sniper'); return { value: q.value, used: q.used }; });
await openDetail('sniper');
const oldDesc = await page.evaluate(() => document.querySelector('#shopScreen .shop-sell-row .shop-item-desc').textContent);
check('a gun bought before returns were counted sells for half ($60 of $120)', old.value === 60 && old.used === null && /bought before returns were counted/.test(oldDesc), { old, oldDesc });

// The Spring Pistol can't be sold.
await openDetail('pistol');
const pistol = await page.evaluate(() => ({ q: gunSellQuote('pistol'), btn: !!document.querySelector('#shopScreen .shop-sell-btn') }));
check('the Spring Pistol has no SELL', pistol.q === null && !pistol.btn, pistol);
await page.evaluate(() => closeShop());
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
