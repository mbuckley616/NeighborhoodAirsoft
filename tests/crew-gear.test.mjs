// v1.337 (D.28 step 4, Michael: A on "Hand-me-downs and the BB rule"): a loan at the loadout. You lend a crew kid a gun
// you own, eyewear or shoes, and take it back free. A kid on his own gun brings his own BBs; a kid on your gun loads
// from your bag at BEGIN (two of its mags), fires your BBs, gives back what he didn't fire, and goes back to his own gun
// when he runs dry. Eyewear +0.05 aim, shoes +5% speed. The gun you carry can't be lent; a lent gun can't be sold.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);
const ID = 'hollow_big_battle';

const setup = await page.evaluate(() => {
  const p = Game.persist;
  p.crew = CREW_ROSTER.slice(); crewBench.clear();
  p.owned.ak47 = true; p.ownedEquipment.eyewear.goggles_smoke = true; p.ownedEquipment.shoes.trail_shoes = true;
  p.equipped.gun = 'pistol';
  const carried = crewLend('eric', 'gun', 'pistol');   // the gun you carry stays yours
  const lent = [crewLend('diego', 'gun', 'ak47'), crewLend('sean', 'eyewear', 'goggles_smoke'), crewLend('nick', 'shoes', 'trail_shoes')];
  const sold = sellGun('ak47');
  saveGame(); p.crewGear = {}; loadGame();
  const s = crewSetup('hollow_big_battle'), kid = id => s.find(e => e.charId === id) || {};
  return { carried, lent, sold: sold.reason, kept: JSON.stringify(Game.persist.crewGear), holder: crewLoanHolder('gun', 'ak47'),
    diego: kid('diego').weapon, loan: !!kid('diego').crewLoan, eric: kid('eric').weapon, ericLoan: !!kid('eric').crewLoan,
    seanAim: (kid('sean').statsOverride || {}).accuracy, nickSpeed: (kid('nick').statsOverride || {}).moveSpeed, nickBase: CHARACTERS.nick.moveSpeed };
});
check('the gun you carry (the Spring Pistol) can\'t be lent', setup.carried === false, setup);
check('Diego takes your AK-47, Sean your smoke goggles, Nick your trail shoes', setup.lent.every(Boolean) && setup.holder === 'diego', setup);
check('a gun a kid has can\'t be sold until you take it back', setup.sold === 'lent', setup);
check('the loans persist through a save and reload', /"diego":\{"gun":"ak47"\}/.test(setup.kept) && /goggles_smoke/.test(setup.kept), setup.kept);
check('in the match setup Diego carries the AK-47 on your BBs; Eric his own MP5 on his', setup.diego === 'ak47' && setup.loan && setup.eric === 'mp5' && !setup.ericLoan, setup);
check('goggles: Sean aims 0.65 (0.60); shoes: Nick moves 5% faster', Math.abs(setup.seanAim - 0.65) < 1e-9 && Math.abs(setup.nickSpeed - setup.nickBase * 1.05) < 1e-9, setup);

// A round: who takes what from the bag, what he fires, what comes back
const round = async (bag, opts = {}) => {
  await page.evaluate(([bag, bench]) => { Game.persist.bag = bag; crewBench.clear(); if (bench) crewBench.add(bench); }, [bag, opts.bench || null]);
  await g.scenario(ID);
  const start = await page.evaluate(() => {
    Game.player.maxHits = 999;   // nothing ends the round on you while the kids fight
    const d = Game.scenario.enemies.find(e => e.charId === 'diego'), e = Game.scenario.enemies.find(e => e.charId === 'eric');
    return { bag: Game.persist.bag, mine: Game.gun.ammo, diego: d ? d.weapon : null, loaded: d && d.crewLoan ? d.crewLoan.bbs : null,
      eric: e.weapon, ericLoan: !!e.crewLoan, sean: (Game.scenario.enemies.find(e => e.charId === 'sean').character || {}).accuracy };
  });
  await g.spin(opts.frames || 60 * 60);
  let mid = await page.evaluate(() => {
    const d = Game.scenario.enemies.find(e => e.charId === 'diego');
    if (!d) return {};
    const gg = d.mesh.gunGroup;
    const out = { weapon: d.weapon, left: d.crewLoan.bbs, dry: !!d.crewLoan.dry, parts: gg.userData.gunParts.every(c => c.parent === gg), kids: gg.children.length };
    return out;
  });
  // (read and end in one call: the page's own frame loop runs between calls, and Diego fires on)
  const end = await page.evaluate(() => {
    const d = Game.scenario.enemies.find(e => e.charId === 'diego'), left = d && d.crewLoan ? d.crewLoan.bbs : null;
    if (Game.mode === 'scenario') endScenario('lose');
    return { bag: Game.persist.bag, left };
  });
  if (end.left != null) mid.left = end.left;
  return { bag, start, mid, end: end.bag };
};

let r = await round(5000);
const fired = r.start.loaded - r.mid.left;
check(`BEGIN: you load your 10 and Diego two AK mags (700) from the bag; nobody else draws (5000 to ${r.start.bag})`,
  r.start.mine === 10 && r.start.loaded === 700 && r.start.bag === 5000 - 10 - 700 && r.start.diego === 'ak47', r.start);
check('in the match Eric is on his own MP5 and Sean aims 0.65 with your goggles', r.start.eric === 'mp5' && !r.start.ericLoan && Math.abs(r.start.sean - 0.65) < 1e-9, r.start);
check(`Diego fired ${fired} of your BBs in a minute, and what he didn't fire came back: the bag ends ${r.end} (5000 less his ${fired})`,
  fired > 0 && r.end === 5000 - fired, { fired, r });

// A small bag: he loads what is left, runs dry and goes back to his own gun, and the bag pays no more
r = await round(10 + 30);
check('a 40-BB bag: you take 10, Diego the last 30', r.start.mine === 10 && r.start.loaded === 30 && r.start.bag === 0, r.start);
check('out of your BBs, Diego is back on his own MP5 (its model in his hands) for the rest of the match', r.mid.weapon === 'mp5' && r.mid.dry && r.mid.left === 0 && r.mid.parts, r.mid);
check('and the bag paid his 30 and no more (ends 10, your mag back)', r.end === 10, r);

// Your mag takes the last of the bag: he starts on his own gun
r = await round(10, { frames: 30 });
check('a 10-BB bag: you take them all, Diego starts on his own MP5', r.start.mine === 10 && r.start.loaded === 0 && r.start.diego === 'mp5' && r.end === 10, r);
const empty = await page.evaluate(() => { Game.persist.bag = 0; return crewSetup('hollow_big_battle').find(e => e.charId === 'diego').weapon; });
check('an empty bag: the briefing already has Diego on his own MP5', empty === 'mp5', empty);

// Benched, he takes nothing and costs nothing
r = await round(5000, { bench: 'diego', frames: 30 });
check('Diego benched: the bag pays only your 10, and gets them back', r.start.diego === null && r.start.bag === 4990 && r.end === 5000, r);

// The loadout's crew rows; the shop's take-back and the hand-down to Nick
const ui = await page.evaluate(() => {
  const out = {};
  openLoadout();
  out.rows = [...document.querySelectorAll('#loSlotsList .lo-slot.crew')].map(d => d.textContent);
  document.querySelector('#loSlotsList .lo-slot.crew[data-crew="sean"]').click();
  const items = [...document.querySelectorAll('#loSlotsList .crew-picker .picker-item')];
  out.picks = items.map(d => d.textContent.trim());
  items.find(d => /Take back the/.test(d.textContent)).click();
  out.seanEye = crewLent('sean', 'eyewear');
  document.querySelector('#loSlotsList .lo-slot.crew[data-crew="alex"]').click();
  [...document.querySelectorAll('#loSlotsList .crew-picker .picker-item')].find(d => /AK-47/.test(d.textContent) && /from Diego/.test(d.textContent)).click();
  out.akWith = crewLoanHolder('gun', 'ak47'); out.diegoGun = crewLent('diego', 'gun');
  closeLoadout();
  // The shop: EQUIP on a lent gun takes it back; a new gun asks about Nick
  Game.persist.cash = 1000;
  openShop(); shopState.view = 'gun'; shopState.detailGun = 'ak47'; renderShop();
  const take = [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /TAKE BACK FROM ALEX/.test(b.textContent));
  out.takeLabel = !!take; take.click();
  out.akAfter = crewLoanHolder('gun', 'ak47'); out.carry = Game.persist.equipped.gun;
  shopState.view = 'gun'; shopState.detailGun = 'mp5'; renderShop();
  [...document.querySelectorAll('#shopScreen .shop-item-buy')].find(b => /^BUY \$/.test(b.textContent)).click();
  const ask = document.querySelector('#shopScreen .shop-handdown-row');
  out.ask = ask ? ask.querySelector('.shop-item-name').textContent : null;
  ask.querySelector('.shop-handdown-yes').click();
  out.nick = crewLent('nick', 'gun'); out.carry2 = Game.persist.equipped.gun;
  closeShop();
  return out;
});
check('the Loadout lists your five crew kids, Diego "AK-47 · your gun, your BBs"', ui.rows.length === 5 && ui.rows.some(t => /Diego · AK-47/.test(t) && /your gun, your BBs/.test(t)), ui.rows);
check('Sean\'s picker: his own AK-47 first, your guns, and Take back the goggles; a click takes them back', /His own AK-47/.test(ui.picks[0]) && ui.picks.some(t => /Take back the/.test(t)) && ui.seanEye === null, ui.picks);
check('lending Alex the AK-47 Diego has passes it from Diego to Alex', ui.akWith === 'alex' && ui.diegoGun === null, ui);
check('the shop: TAKE BACK FROM ALEX on the AK-47 gives it back and you carry it', ui.takeLabel && ui.akAfter === null && ui.carry === 'ak47', ui);
check('buying the MP5 asks "Give your AK-47 to Nick?"; YES lends it to him', ui.ask === 'Give your AK-47 to Nick?' && ui.nick === 'ak47' && ui.carry2 === 'mp5', ui);

// An old save with no crewGear plays as today
const old = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.crewGear;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
  loadGame(); crewBench.clear();   // (the bench is the briefing's: Diego sat out the round above)
  const s = crewSetup('hollow_big_battle');
  return { gear: JSON.stringify(Game.persist.crewGear), guns: s.filter(e => e.team === 'player').map(e => e.charId + ':' + e.weapon).join(), loans: s.some(e => e.crewLoan) };
});
check('an old save with no crew gear loads with none lent, every kid on his own gun', old.gear === '{}' && !old.loans && /diego:mp5/.test(old.guns), old);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
