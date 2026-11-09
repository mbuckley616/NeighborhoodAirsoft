// v1.240 (backlog D.37, Michael 14 Oct, the second half: "maybe having tabs on the guns tab to shift between pistols,
// rifles, shotguns, automatics, etc. Or at least grouping the weapons in sections by type on that page"). The Guns tab
// lists its twelve guns under a header for each kind, and a row of chips over the list (ALL, PISTOLS, SHOTGUNS,
// RIFLES, AUTOMATICS) shows one kind or all. Before v1.240 it was one list of twelve. Since v1.329 (D.64) the
// workbench's gun list has the same kinds as sections that fold.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); });
await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Guns').click());

const read = () => page.evaluate(() => {
  const out = { chips: [], groups: [], active: null };
  for (const ch of document.querySelectorAll('#shopScreen .shop-gun-kind')) {
    out.chips.push(ch.textContent);
    if (ch.classList.contains('active')) out.active = ch.dataset.kind;
  }
  let cur = null;
  for (const el of document.querySelectorAll('#shopItems > *')) {
    if (el.classList.contains('shop-gun-kind-header')) { cur = { kind: el.dataset.kind, title: el.textContent, guns: [] }; out.groups.push(cur); }
    else if (el.classList.contains('shop-gun-row')) {
      const name = el.querySelector('.shop-item-name').childNodes[0].textContent.trim();
      if (cur) cur.guns.push(name); else out.groups.push({ kind: null, guns: [name] });
    }
  }
  return out;
});
const all = await read();
console.log('   ' + JSON.stringify(all));
const kinds = await page.evaluate(() => ({ order: GUN_ORDER.map(gt => [gt, gunKind(gt)]), names: Object.fromEntries(GUN_ORDER.map(gt => [gt, GUN_MAGS[gt].displayName])) }));
check('five chips: ALL and the four kinds, with their counts', JSON.stringify(all.chips) ===
  '["ALL (50)","PISTOLS (10)","SHOTGUNS (7)","RIFLES (14)","AUTOMATICS (19)"]' && all.active === 'ALL', all.chips);
check('ALL: four headers in order, each once', JSON.stringify(all.groups.map(x => x.kind)) === '["PISTOLS","SHOTGUNS","RIFLES","AUTOMATICS"]', all.groups.map(x => x.kind));
check('all 50 guns (v1.449: the Long Revolver; v1.448: the DMR; v1.447: the Break-Barrel; v1.446: the Gas Carbine; v1.440: the Snub-Nose; v1.439: the Drum Shotgun; v1.438: the Auto Pistol; v1.437: the Clear Bullpup; v1.433: the Derringer; v1.432: the Double-Barrel; v1.416: the Pump Sniper; v1.414: the Uzi; v1.413: the M60; v1.412: the Lever Gun; v1.411: the KSG; v1.410: the Magnum; v1.404: the M14; v1.403: the Thompson; v1.399: the Gas Pistol; v1.398: the SPAS-12; v1.250: four clear automatics; v1.325: the FAMAS; v1.326: the electrics; v1.327: the Burst Rifle; v1.328: the Semi-Auto Shotgun; v1.335: the M249; v1.336: the L96; v1.346: the P90; v1.348: the Vector; v1.371: the G36C; v1.372: the AUG; v1.373: the M4; v1.395: the SVD; v1.396: the RPK), each under its own kind', all.groups.reduce((n, x) => n + x.guns.length, 0) === 50
  && kinds.order.every(([gt, k]) => all.groups.find(x => x.kind === k).guns.includes(kinds.names[gt])), all.groups);
check('the pistols are the Spring Pistol, Derringer (v1.433), Six-Shooter, Bolt Pistol, Electric Pistol (v1.326), Auto Pistol (v1.438), Gas Pistol (v1.399), Magnum (v1.410), Snub-Nose (v1.440) and Long Revolver (v1.449)', JSON.stringify(all.groups[0].guns) === '["Spring Pistol","Derringer","Six-Shooter","Bolt Pistol","Electric Pistol","Auto Pistol","Gas Pistol","Magnum","Snub-Nose","Long Revolver"]', all.groups[0].guns);
check('the automatics are the four clear ones (v1.250), the Bucket Gun, MP5, UMP, P90 (v1.346), Vector (v1.348), Thompson (v1.403), MAC-10, Uzi (v1.414), AK-47, G36C (v1.371), M4 (v1.373), AUG (v1.372), RPK (v1.396), M249 (v1.335) and M60 (v1.413)', JSON.stringify(all.groups[3].guns) === '["Rattle Can","Clear Sprayer","Ghost Mini","Tick-Tock","Bucket Gun","MP5","UMP","P90","Vector","Thompson","MAC-10","Uzi","AK-47","G36C","M4","AUG","RPK","M249","M60"]', all.groups[3].guns);
await g.shot('shop-gun-kinds-all');

await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click());
const auto = await read();
check('AUTOMATICS shows only its nineteen (v1.414: the Uzi; v1.413: the M60; v1.403: the Thompson; v1.396: the RPK; v1.335: the M249; v1.346: the P90; v1.348: the Vector; v1.371: the G36C; v1.372: the AUG; v1.373: the M4), under its header', auto.active === 'AUTOMATICS' && auto.groups.length === 1
  && auto.groups[0].kind === 'AUTOMATICS' && auto.groups[0].guns.length === 19, auto.groups);
await g.shot('shop-gun-kinds-auto');
// a gun's details and back keep the chip
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-row .shop-item-buy').click());
const detail = await page.evaluate(() => shopState.view === 'gun' && shopState.detailGun);
await page.evaluate(() => document.querySelector('#shopScreen .shop-back-btn').click());
const back = await read();
check('details of the first automatic, then back: still on AUTOMATICS', detail === 'rattle' && back.active === 'AUTOMATICS' && back.groups.length === 1, { detail, back: back.active });
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click());
const pis = await read();
check('PISTOLS shows its ten', pis.groups.length === 1 && pis.groups[0].guns.length === 10, pis.groups);
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="ALL"]').click());
check('ALL shows the 50 again', (await read()).groups.reduce((n, x) => n + x.guns.length, 0) === 50);

// v1.464 (backlog D.89, Michael 9 Nov: B): a sort row over the list: SHOP ORDER, PRICE, RATE, WEIGHT, OWNED FIRST. The kinds
// keep their headers; the sort reorders each kind's guns, and by rate or weight the row shows its number.
const sortRead = () => page.evaluate(() => {
  const out = { sorts: [], active: null, groups: [] };
  for (const el of document.querySelectorAll('#shopScreen .shop-gun-sort')) { out.sorts.push(el.textContent); if (el.classList.contains('active')) out.active = el.dataset.sort; }
  const byName = Object.fromEntries(GUN_ORDER.map(gt => [GUN_MAGS[gt].displayName, gt]));
  let cur = null;
  for (const el of document.querySelectorAll('#shopItems > *')) {
    if (el.classList.contains('shop-gun-kind-header')) { cur = { kind: el.dataset.kind, guns: [], vals: [] }; out.groups.push(cur); }
    else if (el.classList.contains('shop-gun-row')) {
      cur.guns.push(byName[el.querySelector('.shop-item-name').childNodes[0].textContent.trim()]);
      const v = el.querySelector('.shop-gun-sort-val'); cur.vals.push(v ? v.textContent : null);
    }
  }
  out.padReach = [...document.querySelectorAll('#shopScreen .shop-gun-sort')].every(el => getComputedStyle(el).cursor === 'pointer');
  return out;
});
const sortBy = id => page.evaluate(id => document.querySelector(`#shopScreen .shop-gun-sort[data-sort="${id}"]`).click(), id);
const s0 = await sortRead();
check('a sort row: SHOP ORDER, PRICE, RATE, WEIGHT, OWNED FIRST; shop order to start, no numbers on the rows, a pad reaches each',
  JSON.stringify(s0.sorts) === '["SHOP ORDER","PRICE","RATE","WEIGHT","OWNED FIRST"]' && s0.active === 'shop' && s0.padReach
  && s0.groups.every(x => x.vals.every(v => v === null)), s0.sorts);
const nums = await page.evaluate(() => Object.fromEntries(GUN_ORDER.map(gt => [gt, { price: GUN_MAGS[gt].price || 0, rate: shopGunRate(gt), lb: shopGunWeight(gt), owned: shopGunOwned(gt) }])));
const monotone = (groups, f, dir) => groups.every(x => x.guns.every((gt, i) => i === 0 || dir * (f(gt) - f(x.guns[i - 1])) >= 0));
const sameSets = (a, b) => a.length === b.length && a.every((x, i) => x.kind === b[i].kind && [...x.guns].sort().join() === [...b[i].guns].sort().join());
await sortBy('price');
const sp = await sortRead();
console.log('   price: ' + JSON.stringify(sp.groups.map(x => x.guns)));
check('PRICE: four headers as before, each kind its own guns, cheapest first', sp.active === 'price' && sameSets(sp.groups, all.groups.map(x => ({ kind: x.kind, guns: s0.groups.find(y => y.kind === x.kind).guns })))
  && monotone(sp.groups, gt => nums[gt].price, 1), sp.groups.map(x => x.guns.map(gt => nums[gt].price)));
check('PRICE: no second price under the name (it is on the right already)', sp.groups.every(x => x.vals.every(v => v === null)), sp.groups[3].vals);
await sortBy('rate');
const sr = await sortRead();
console.log('   rate: ' + JSON.stringify(sr.groups.map(x => x.guns.map(gt => gt + ' ' + nums[gt].rate.toFixed(1)))));
check('RATE: fastest first in each kind; the automatics led by a 10+ a second gun, a sniper last of the rifles', monotone(sr.groups, gt => nums[gt].rate, -1)
  && nums[sr.groups[3].guns[0]].rate >= 10 && ['sniper', 'l96', 'svd', 'pumpsniper', 'breakbarrel'].includes(sr.groups[2].guns.at(-1)), sr.groups[2].guns);
check('RATE: every rate is between 0.5 and 25 a second, and the row says "a second"', Object.values(nums).every(n => n.rate > 0.5 && n.rate < 25)
  && sr.groups.every(x => x.vals.every(v => / a second$/.test(v))), Object.entries(nums).filter(([, n]) => !(n.rate > 0.5 && n.rate < 25)));
await sortBy('weight');
const sw = await sortRead();
check('WEIGHT: lightest first in each kind, in pounds', monotone(sw.groups, gt => nums[gt].lb, 1) && sw.groups.every(x => x.vals.every(v => / lb$/.test(v)))
  && Object.values(nums).every(n => n.lb > 0 && n.lb < 30), sw.groups.map(x => x.vals));
await page.evaluate(() => { for (const gt of ['m60', 'thompson', 'svd']) Game.persist.owned[GUN_MAGS[gt].ownFlag] = true; renderShop(); });
await sortBy('owned');
const so = await sortRead();
check('OWNED FIRST: the guns you own lead their kind (the M60 and Thompson the automatics, the SVD the rifles), the rest in shop order, no numbers',
  JSON.stringify(so.groups[3].guns.slice(0, 2)) === '["thompson","m60"]' && so.groups[2].guns[0] === 'svd' && so.groups[0].guns[0] === 'pistol'
  && JSON.stringify(so.groups[3].guns.slice(2)) === JSON.stringify(s0.groups[3].guns.filter(gt => gt !== 'thompson' && gt !== 'm60'))
  && so.groups.every(x => x.vals.every(v => v === null)), so.groups[3].guns);
await g.shot('shop-gun-sort-owned');
await sortBy('price');
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="RIFLES"]').click());
const sk = await sortRead();
check('a kind chip and a sort together: RIFLES alone, by price', sk.active === 'price' && sk.groups.length === 1 && sk.groups[0].kind === 'RIFLES'
  && sk.groups[0].guns.length === 14 && monotone(sk.groups, gt => nums[gt].price, 1), sk.groups.map(x => x.kind));
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-row .shop-item-buy').click());
await page.evaluate(() => document.querySelector('#shopScreen .shop-back-btn').click());
const sb = await sortRead();
check('details and back keep the sort', sb.active === 'price' && sb.groups[0].kind === 'RIFLES', sb.active);
await g.shot('shop-gun-sort-rifles-price');
await page.evaluate(() => { document.querySelector('#shopScreen .shop-gun-kind[data-kind="ALL"]').click(); });
await page.evaluate(() => { for (const gt of ['m60', 'thompson', 'svd']) delete Game.persist.owned[GUN_MAGS[gt].ownFlag]; });
await sortBy('shop');
const sback = await sortRead();
check('SHOP ORDER puts it back as it was', JSON.stringify(sback.groups.map(x => x.guns)) === JSON.stringify(s0.groups.map(x => x.guns)));

// v1.329 (backlog D.64, Michael 22 Oct: "reconsider the workbench menu, and have collapsible sections by Gun Type"): the
// workbench's gun list under the same kinds, each header folding its section; a section with a gun you own starts open
await page.evaluate(() => {
  closeShop();
  for (const gt of ['famas', 'epistol']) Game.persist.owned[GUN_MAGS[gt].ownFlag] = true;
  Game.persist.equipped.gun = 'pistol';
  openWorkbench();
});
const wb = () => page.evaluate(() => {
  const out = { kinds: [], guns: [] };
  for (const el of document.querySelectorAll('#wbGunList > *')) {
    if (el.classList.contains('wb-kind')) out.kinds.push(el.dataset.kind + (el.classList.contains('open') ? ' open ' : ' shut ') + el.querySelector('.wb-kind-n').textContent);
    else out.guns.push(el.dataset.gun);
  }
  out.bench = WB.gunType;
  return out;
});
const w0 = await wb();
console.log('   workbench: ' + JSON.stringify(w0));
check('workbench: a header for each kind, those with a gun you own open (PISTOLS 2 of 10, RIFLES 1 of 14), the rest shut',
  JSON.stringify(w0.kinds) === '["PISTOLS open 2 of 10","SHOTGUNS shut 0 of 7","RIFLES open 1 of 14","AUTOMATICS shut 0 of 19"]', w0.kinds);
check('workbench: the open sections list their guns in the shop\'s order, nothing from the shut ones',
  JSON.stringify(w0.guns) === '["pistol","derringer","sixshooter","boltpistol","epistol","autopistol","gaspistol","magnum","snubnose","longrev","clearpup","ar","famas","lever","breakbarrel","erifle","gascarbine","burst","m14","dmr","sniper","pumpsniper","l96","svd"]', w0.guns);
await page.evaluate(() => document.querySelector('#wbGunList .wb-kind[data-kind="SHOTGUNS"]').click());
const w1 = await wb();
check('workbench: a click on SHOTGUNS opens it (its seven guns show, not owned)', w1.kinds[1] === 'SHOTGUNS open 0 of 7' && w1.guns.length === 31 && w1.guns.includes('semishotgun'), w1);
await page.evaluate(() => document.querySelector('#wbGunList .wb-kind[data-kind="PISTOLS"]').click());
const w2 = await wb();
check('workbench: a click on PISTOLS folds it away; the rest stay as they were', w2.kinds[0] === 'PISTOLS shut 2 of 10' && w2.kinds[1] === 'SHOTGUNS open 0 of 7' && !w2.guns.includes('pistol') && w2.guns.length === 21, w2);
await page.evaluate(() => document.querySelector('#wbGunList .wb-gun[data-gun="famas"]').click());
const w3 = await wb();
check('workbench: a gun clicked in an open section goes on the bench, and the sections keep their state', w3.bench === 'famas' && JSON.stringify(w3.kinds) === JSON.stringify(w2.kinds), w3);
await g.shot('workbench-kinds');
await page.evaluate(() => { closeWorkbench(); openWorkbench(); });
const w4 = await wb();
check('workbench: closed and opened again, the sections are as you left them', JSON.stringify(w4.kinds) === JSON.stringify(w2.kinds), w4.kinds);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
