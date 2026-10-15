// v1.240 (backlog D.37, Michael 14 Oct, the second half: "maybe having tabs on the guns tab to shift between pistols,
// rifles, shotguns, automatics, etc. Or at least grouping the weapons in sections by type on that page"). The Guns tab
// lists its twelve guns under a header for each kind, and a row of chips over the list (ALL, PISTOLS, SHOTGUNS,
// RIFLES, AUTOMATICS) shows one kind or all. Before v1.240 it was one list of twelve.
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
  '["ALL (12)","PISTOLS (3)","SHOTGUNS (2)","RIFLES (2)","AUTOMATICS (5)"]' && all.active === 'ALL', all.chips);
check('ALL: four headers in order, each once', JSON.stringify(all.groups.map(x => x.kind)) === '["PISTOLS","SHOTGUNS","RIFLES","AUTOMATICS"]', all.groups.map(x => x.kind));
check('all twelve guns, each under its own kind', all.groups.reduce((n, x) => n + x.guns.length, 0) === 12
  && kinds.order.every(([gt, k]) => all.groups.find(x => x.kind === k).guns.includes(kinds.names[gt])), all.groups);
check('the pistols are the Spring Pistol, Six-Shooter and Bolt Pistol', JSON.stringify(all.groups[0].guns) === '["Spring Pistol","Six-Shooter","Bolt Pistol"]', all.groups[0].guns);
check('the automatics are the Bucket Gun, MP5, UMP, MAC-10 and AK-47', JSON.stringify(all.groups[3].guns) === '["Bucket Gun","MP5","UMP","MAC-10","AK-47"]', all.groups[3].guns);
await g.shot('shop-gun-kinds-all');

await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="AUTOMATICS"]').click());
const auto = await read();
check('AUTOMATICS shows only its five, under its header', auto.active === 'AUTOMATICS' && auto.groups.length === 1
  && auto.groups[0].kind === 'AUTOMATICS' && auto.groups[0].guns.length === 5, auto.groups);
await g.shot('shop-gun-kinds-auto');
// a gun's details and back keep the chip
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-row .shop-item-buy').click());
const detail = await page.evaluate(() => shopState.view === 'gun' && shopState.detailGun);
await page.evaluate(() => document.querySelector('#shopScreen .shop-back-btn').click());
const back = await read();
check('details of the first automatic, then back: still on AUTOMATICS', detail === 'bucket' && back.active === 'AUTOMATICS' && back.groups.length === 1, { detail, back: back.active });
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="PISTOLS"]').click());
const pis = await read();
check('PISTOLS shows its three', pis.groups.length === 1 && pis.groups[0].guns.length === 3, pis.groups);
await page.evaluate(() => document.querySelector('#shopScreen .shop-gun-kind[data-kind="ALL"]').click());
check('ALL shows the twelve again', (await read()).groups.reduce((n, x) => n + x.guns.length, 0) === 12);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
