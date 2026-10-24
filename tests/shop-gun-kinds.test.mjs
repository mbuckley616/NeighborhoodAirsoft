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
  '["ALL (23)","PISTOLS (4)","SHOTGUNS (3)","RIFLES (6)","AUTOMATICS (10)"]' && all.active === 'ALL', all.chips);
check('ALL: four headers in order, each once', JSON.stringify(all.groups.map(x => x.kind)) === '["PISTOLS","SHOTGUNS","RIFLES","AUTOMATICS"]', all.groups.map(x => x.kind));
check('all 23 guns (v1.250: four clear automatics; v1.325: the FAMAS; v1.326: the electrics; v1.327: the Burst Rifle; v1.328: the Semi-Auto Shotgun; v1.335: the M249; v1.336: the L96), each under its own kind', all.groups.reduce((n, x) => n + x.guns.length, 0) === 23
  && kinds.order.every(([gt, k]) => all.groups.find(x => x.kind === k).guns.includes(kinds.names[gt])), all.groups);
check('the pistols are the Spring Pistol, Six-Shooter, Bolt Pistol and Electric Pistol (v1.326)', JSON.stringify(all.groups[0].guns) === '["Spring Pistol","Six-Shooter","Bolt Pistol","Electric Pistol"]', all.groups[0].guns);
check('the automatics are the four clear ones (v1.250), the Bucket Gun, MP5, UMP, MAC-10, AK-47 and M249 (v1.335)', JSON.stringify(all.groups[3].guns) === '["Rattle Can","Clear Sprayer","Ghost Mini","Tick-Tock","Bucket Gun","MP5","UMP","MAC-10","AK-47","M249"]', all.groups[3].guns);
await g.shot('shop-gun-kinds-all');

await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click());
const auto = await read();
check('AUTOMATICS shows only its ten (v1.335: the M249), under its header', auto.active === 'AUTOMATICS' && auto.groups.length === 1
  && auto.groups[0].kind === 'AUTOMATICS' && auto.groups[0].guns.length === 10, auto.groups);
await g.shot('shop-gun-kinds-auto');
// a gun's details and back keep the chip
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-row .shop-item-buy').click());
const detail = await page.evaluate(() => shopState.view === 'gun' && shopState.detailGun);
await page.evaluate(() => document.querySelector('#shopScreen .shop-back-btn').click());
const back = await read();
check('details of the first automatic, then back: still on AUTOMATICS', detail === 'rattle' && back.active === 'AUTOMATICS' && back.groups.length === 1, { detail, back: back.active });
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click());
const pis = await read();
check('PISTOLS shows its four', pis.groups.length === 1 && pis.groups[0].guns.length === 4, pis.groups);
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="ALL"]').click());
check('ALL shows the 23 again', (await read()).groups.reduce((n, x) => n + x.guns.length, 0) === 23);

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
check('workbench: a header for each kind, those with a gun you own open (PISTOLS 2 of 4, RIFLES 1 of 6), the rest shut',
  JSON.stringify(w0.kinds) === '["PISTOLS open 2 of 4","SHOTGUNS shut 0 of 3","RIFLES open 1 of 6","AUTOMATICS shut 0 of 10"]', w0.kinds);
check('workbench: the open sections list their guns in the shop\'s order, nothing from the shut ones',
  JSON.stringify(w0.guns) === '["pistol","sixshooter","boltpistol","epistol","ar","famas","erifle","burst","sniper","l96"]', w0.guns);
await page.evaluate(() => document.querySelector('#wbGunList .wb-kind[data-kind="SHOTGUNS"]').click());
const w1 = await wb();
check('workbench: a click on SHOTGUNS opens it (its three guns show, not owned)', w1.kinds[1] === 'SHOTGUNS open 0 of 3' && w1.guns.length === 13 && w1.guns.includes('semishotgun'), w1);
await page.evaluate(() => document.querySelector('#wbGunList .wb-kind[data-kind="PISTOLS"]').click());
const w2 = await wb();
check('workbench: a click on PISTOLS folds it away; the rest stay as they were', w2.kinds[0] === 'PISTOLS shut 2 of 4' && w2.kinds[1] === 'SHOTGUNS open 0 of 3' && !w2.guns.includes('pistol') && w2.guns.length === 9, w2);
await page.evaluate(() => document.querySelector('#wbGunList .wb-gun[data-gun="famas"]').click());
const w3 = await wb();
check('workbench: a gun clicked in an open section goes on the bench, and the sections keep their state', w3.bench === 'famas' && JSON.stringify(w3.kinds) === JSON.stringify(w2.kinds), w3);
await g.shot('workbench-kinds');
await page.evaluate(() => { closeWorkbench(); openWorkbench(); });
const w4 = await wb();
check('workbench: closed and opened again, the sections are as you left them', JSON.stringify(w4.kinds) === JSON.stringify(w2.kinds), w4.kinds);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
