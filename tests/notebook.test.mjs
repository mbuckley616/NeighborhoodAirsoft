// v1.283 (backlog D.46, Michael 17 Oct: "Can we make all of the UI elements look like they're on Notebook Paper, as if
// a kid ripped out some pages from a notebook for school and wrote on them?"; decision A, 20 Oct: every menu and card
// on paper, the HUD stays dark; every line of text sits on the ruled lines, and larger blocks are filled). This suite
// opens each paper screen and checks: no page errors and nothing fetched from the network (both fonts are embedded);
// every line of text has its baseline within 3 px of a rule; every filled block is a whole number of rules tall;
// every text colour holds 4.5 : 1 against the paper; the sticky-note buttons still click, and the pad's cursor rings
// them in red dashes. v1.284 adds the title, settings, PAUSED and the forfeit question; v1.285 the
// message card (messages, the bed, the calendar, the Pickup Game board and its online panel); v1.286 the map; v1.287 the
// loadout, the workbench and the shop; v1.288 the HUD's labels, the bedroom's prompts and the frame cost; v1.289 the mirror.
import { boot, check } from './lib/game.mjs';
import { lineReport, contrast } from './lib/notebook.mjs';
const g = await boot(); const { page } = g;
const fetched = [];
page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) fetched.push(u); });

const PAPER = 'rgb(251, 248, 239)';
let worstContrast = 99;
function onRules(name, rep) {
  if (!rep || !rep.length) { check(`${name}: the page shows text`, false, rep); return; }
  const off = rep.filter(x => Math.abs(x.d) > 3);
  const worst = Math.max(...rep.map(x => Math.abs(x.d)));
  console.log(`   ${name}: ${rep.length} lines, worst baseline ${worst.toFixed(1)} px from a rule`);
  check(`${name}: every line of text sits on a rule (within 3 px)`, !off.length, off.slice(0, 6));
  const low = [];
  for (const x of rep) {
    if (x.opacity < 1) continue;   // a disabled button's text, faded on purpose
    const c = contrast(x.color, PAPER); worstContrast = Math.min(worstContrast, c);
    if (c < 4.5) low.push({ text: x.text, color: x.color, c: +c.toFixed(2) });
  }
  check(`${name}: every text colour holds 4.5 : 1 on the paper`, !low.length, low.slice(0, 6));
}
const blocks = (sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  return [...root.querySelectorAll('.reward, .rs-cell, .rs-damage, .brief-objective, #introMap, .nb-btn, #loWeightBar, .lo-kid-col, .wb-viewport, #mirrorCanvas')]
    .filter(e => e.getClientRects().length && !e.closest('.rs-grid') || e.classList.contains('rs-cell'))
    .map(e => { const cs = getComputedStyle(e);
      return { el: e.id || e.className.split(' ')[0], h: +(e.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)).toFixed(1) }; });
}, sel);
function wholeRules(name, bl) {
  const bad = bl.filter(b => Math.abs(b.h / 26 - Math.round(b.h / 26)) > 0.02);
  check(`${name}: each filled block and button takes a whole number of rules (${bl.length})`, !bl.length || !bad.length, bad);
}

// 0) v1.284: the title, and settings over it
await page.evaluate(() => Promise.all([document.fonts.load('17px "NB Hand"'), document.fonts.load('20px "NB Marker"')]));
await g.shot('notebook-title');
onRules('the title', await lineReport(page, '#titleScreen .title-page'));
wholeRules('the title', await blocks('#titleScreen .title-page'));
const tfit = await page.evaluate(() => { const r = document.querySelector('#titleScreen .title-page').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
check('the title page fits on a 720 px screen', tfit.top >= 0 && tfit.bottom <= tfit.vh, tfit);
await page.evaluate(() => document.getElementById('titleSettingsBtn').click());
check('SETTINGS on the title opens settings', await page.evaluate(() => document.getElementById('settingsScreen').classList.contains('active')));
await g.shot('notebook-settings');
onRules('settings', await lineReport(page, '#settingsScreen .settings-card'));
wholeRules('settings', await blocks('#settingsScreen .settings-card'));
await page.evaluate(() => document.getElementById('settingsDoneBtn').click());
check('Done closes settings', await page.evaluate(() => !document.getElementById('settingsScreen').classList.contains('active')));
await g.bedroom();

// 1) the fonts are on the page without a fetch
await page.evaluate(() => Promise.all([document.fonts.load('17px "NB Hand"'), document.fonts.load('20px "NB Marker"')]));
const fonts = await page.evaluate(() => ({ hand: document.fonts.check('17px "NB Hand"'), marker: document.fonts.check('20px "NB Marker"'),
  faces: [...document.fonts].filter(f => /^"?NB /.test(f.family)).map(f => f.family + ':' + f.status) }));
check('both handwriting fonts load from the file itself', fonts.hand && fonts.marker, fonts);

// 1a) v1.288: the bedroom's prompts on paper: the "E to …" strip and the labels over the room
const prompts = await page.evaluate(() => {
  const ip = document.getElementById('interactPrompt');
  ip.innerHTML = '<kbd>E</kbd> &nbsp; Use the desk'; ip.style.display = 'block';
  const cs = getComputedStyle(ip), chip = document.querySelector('#bedroomLabels .br-chip'), name = document.querySelector('#bedroomLabels .br-name');
  const r = { promptBg: cs.backgroundColor, promptFont: cs.fontFamily, promptInk: cs.color,
    chipBg: chip && getComputedStyle(chip).backgroundColor, chipInk: name && getComputedStyle(name).color,
    cashLabel: getComputedStyle(document.querySelector('#bedroomHud .cash-label')).fontFamily };
  return r;
});
await g.shot('notebook-prompt');
check('the bedroom\'s prompt is a strip of paper in the hand', prompts.promptBg === PAPER && /NB Hand/.test(prompts.promptFont) && contrast(prompts.promptInk, PAPER) >= 4.5, prompts);
check('the bedroom\'s CASH and BBs labels are in the hand', /NB Hand/.test(prompts.cashLabel), prompts.cashLabel);
check('the labels over the room are paper tags in ink', prompts.chipBg === PAPER && contrast(prompts.chipInk, PAPER) >= 4.5, prompts);
await page.evaluate(() => { document.getElementById('interactPrompt').style.display = 'none'; });

// 1a2) v1.289: the mirror
await page.evaluate(() => openMirror());
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-mirror');
onRules('the mirror', await lineReport(page, '#mirrorScreen .loadout-card'));
wholeRules('the mirror', await blocks('#mirrorScreen .loadout-card'));
const mir = await page.evaluate(() => { const b = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="height"] .mirror-opt')].find(x => !x.classList.contains('on'));
  if (!b) return null; const v = JSON.parse(b.dataset.value); b.click(); return { v, now: Game.persist.look.height }; });
check('a choice on the paper mirror still picks', mir && mir.now === mir.v, mir);
onRules('the mirror after a pick', await lineReport(page, '#mirrorScreen .loadout-card'));
await page.evaluate(() => document.getElementById('mirrorDoneBtn').click());
check('DONE on the paper mirror goes back to the room', (await g.mode()) === 'bedroom');

// 1b) v1.285: the shared message card: a plain message, the bed's summer so far and its delete question, the calendar,
// the Pickup Game board and its online panel; the flip phone stays a phone
const card = '#modalScreen .modal-card';
async function modalPage(name, open, shot) {
  await page.evaluate(open);
  await page.evaluate(() => document.fonts.ready);
  if (shot) await g.shot('notebook-' + shot);
  check(`${name} opens on paper`, await page.evaluate(() => document.getElementById('modalScreen').classList.contains('active') &&
    document.querySelector('#modalScreen .modal-card').classList.contains('nb-paper')));
  onRules(name, await lineReport(page, card));
  wholeRules(name, await blocks(card));
  const fit = await page.evaluate(() => { const r = document.querySelector('#modalScreen .modal-card').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
  check(`${name} fits on a 720 px screen`, fit.top >= 0 && fit.bottom <= fit.vh + 0.5, fit);
}
const closeCard = () => page.evaluate(() => document.getElementById('modalCloseBtn').click());
await modalPage('a message', () => showModal('Locked', 'Win Just You and Seth first.\nSeth is waiting in his backyard.'), 'message');
await closeCard();
await modalPage('the summer so far (the bed)', () => openSaveMenu(), 'bed');
await modalPage('the delete question', () => document.getElementById('saveDeleteBtn').click());
await page.evaluate(() => document.getElementById('saveDelNo').click());
check('KEEP goes back to the summer so far', await page.evaluate(() => document.getElementById('modalTitle').textContent === 'The summer so far'));
await closeCard();
await modalPage('the calendar', () => openSummerCalendar(), 'calendar');
await closeCard();
await modalPage('the Pickup Game board', () => openPickupBoard(), 'board');
const pk = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#modalBody .pk-opt[data-grp="tod"]')].find(x => x.dataset.val === 'night'); b.click();
  return { tod: pickupState.tod, on: document.querySelector('#modalBody .pk-opt[data-grp="tod"][data-val="night"]').classList.contains('on') };
});
check('a choice on the paper board still picks (Night)', pk.tod === 'night' && pk.on, pk);
onRules('the board after a pick', await lineReport(page, card));
await page.evaluate(() => { const b = document.querySelector('#modalBody .pk-opt[data-grp="tod"][data-val="day"]'); b.click(); });
await modalPage('the online panel', () => document.getElementById('pickupOnlineBtn').click(), 'online');
await page.evaluate(() => document.getElementById('netBackBtn').click());
await closeCard();
const ph = await page.evaluate(() => { openPhone(); const c = document.querySelector('#modalScreen .modal-card');
  const r = { phone: c.classList.contains('phone'), paper: c.classList.contains('nb-paper') };
  document.getElementById('modalCloseBtn').click(); r.after = c.classList.contains('nb-paper'); return r; });
check('the flip phone is still a phone, and the card is paper again after it', ph.phone && !ph.paper && ph.after, ph);

// 1c) v1.286: the map screen, every zone, at two window sizes; every scenario card holds its words inside its four rules
const mapPage = '#worldMap .map-content';
for (const vp of [{ width: 1280, height: 720 }, { width: 1600, height: 900 }]) {
  await page.setViewportSize(vp);
  await page.evaluate(() => { isScenarioUnlocked = () => true; isZoneUnlocked = () => true; Game._mapZone = null; openMap(); });
  await page.evaluate(() => document.fonts.ready);
  const zones = await page.evaluate(() => [...document.querySelectorAll('#worldMap .pin')].map(p => p.dataset.scenario));
  let worst = 0, n = 0; const bad = [], spill = [];
  for (const z of zones) {
    await page.evaluate(z => selectMapZone(z), z);
    const rep = await lineReport(page, mapPage);
    for (const x of rep) { n++; worst = Math.max(worst, Math.abs(x.d)); if (Math.abs(x.d) > 3) bad.push({ z, ...x }); }
    for (const b of await blocks(mapPage)) if (Math.abs(b.h / 26 - Math.round(b.h / 26)) > 0.02) bad.push({ z, block: b });
    spill.push(...await page.evaluate(() => [...document.querySelectorAll('#worldMap .sc-card')]
      .filter(c => c.scrollHeight > c.clientHeight + 1).map(c => c.dataset.id + ':' + c.scrollHeight + '>' + c.clientHeight)));
    if (z === zones[0] || z === 'winnmark_ct') await g.shot(`notebook-map-${vp.width}-${z}`);
  }
  console.log(`   the map at ${vp.width}x${vp.height}: ${zones.length} zones, ${n} lines, worst baseline ${worst.toFixed(1)} px from a rule`);
  check(`the map at ${vp.width}x${vp.height}: every line on a rule and every block whole rules, in every zone`, !bad.length, bad.slice(0, 5));
  check(`the map at ${vp.width}x${vp.height}: every scenario card holds its words`, !spill.length, spill.slice(0, 5));
  const end = await page.evaluate(() => { const i = document.getElementById('scenarioInfo'); i.scrollTop = i.scrollHeight; return i.scrollTop; });
  const rep = await lineReport(page, mapPage);
  check(`the map at ${vp.width}x${vp.height}: scrolled to the end of the list, still on the rules`, rep.every(x => Math.abs(x.d) <= 3), { end, off: rep.filter(x => Math.abs(x.d) > 3).slice(0, 3) });
}
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => { const c = document.querySelector('#worldMap .sc-card:not(.locked)'); c.click(); });
check('a card on the paper map opens its briefing', await page.evaluate(() => document.getElementById('scenarioBriefModal').classList.contains('active')));
await page.evaluate(() => document.getElementById('briefCancelBtn').click());
await page.evaluate(() => document.getElementById('mapCloseBtn').click());
check('← BACK TO ROOM on the paper map goes home', (await g.mode()) === 'bedroom');

// 1d) v1.287: the loadout (with the gun picker open) and the workbench, with a second gun owned
await page.evaluate(() => { Game.persist.owned.mp5 = true; });
for (const [name, open, sel, shot] of [
  ['the loadout', () => openLoadout(), '#loadoutScreen .loadout-card', 'loadout'],
  ['the loadout with the gun picker', () => document.querySelector('#loSlotsList .lo-slot.gun').click(), '#loadoutScreen .loadout-card', 'loadout-picker'],
  ['the workbench', () => { hideAllMenus(); Game.mode = 'bedroom'; openWorkbench(); }, '#workbenchScreen .wb-card', 'workbench']]) {
  await page.evaluate(open);
  await g.spin(3);
  await page.evaluate(() => document.fonts.ready);
  await g.shot('notebook-' + shot);
  onRules(name, await lineReport(page, sel));
  wholeRules(name, await blocks(sel));
  const fit = await page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; }, sel);
  check(`${name} fits on a 720 px screen`, fit.top >= 0 && fit.bottom <= fit.vh + 0.5, fit);
}
await page.evaluate(() => document.getElementById('wbCloseBtn').click());
check('CLOSE on the paper workbench goes home', (await g.mode()) === 'bedroom');

// 1e) v1.287 put the shop's page on paper; v1.296 (backlog D.52, Michael 21 Oct) made airsoft.com the early-2000s
// website again. Its page is not paper, every tab, and DETAILS, BUY and the close box still work.
await page.evaluate(() => { hideAllMenus(); Game.mode = 'bedroom'; Game.persist.cash = 500; openShop(); });
const shopTabs = await page.evaluate(() => SHOP_TABS.slice());
for (const tab of shopTabs) {
  const look = await page.evaluate(t => { shopState.activeTab = t; shopState.view = 'list'; shopState.detailGun = null; renderShop();
    const b = document.querySelector('#shopScreen .shop-body');
    return { paper: !!b.closest('.nb-paper') || !!b.querySelector('.nb-paper'), font: getComputedStyle(document.querySelector('#shopScreen .shop-logo')).fontFamily }; }, tab);
  check(`the shop's ${tab} tab is the 2000s website, not paper`, !look.paper && !/NB Hand|NB Marker|Comic Sans/i.test(look.font), look);
}
await g.shot('notebook-shop-website');
await page.evaluate(() => { shopState.activeTab = 'Guns'; shopState.view = 'list'; renderShop(); document.querySelector('#shopScreen .shop-body').scrollTop = 0;
  document.querySelector('#shopItems .shop-item:not(.owned) .shop-item-buy').click(); });
check('DETAILS opens a gun\'s page', await page.evaluate(() => shopState.view === 'gun'));
const bought = await page.evaluate(() => { const cash = Game.persist.cash; const b = [...document.querySelectorAll('#shopItems .shop-item-buy')].find(x => !x.disabled && /BUY/i.test(x.textContent));
  if (b) b.click(); return { had: !!b, spent: cash - Game.persist.cash }; });
check('BUY in the shop still buys', bought.had && bought.spent > 0, bought);
await page.evaluate(() => document.getElementById('shopCloseBtn').click());
check('the shop\'s close box goes home', (await g.mode()) === 'bedroom');

// 2) the map's popup briefing
await page.evaluate(() => { isScenarioUnlocked = () => true; openScenarioBrief('bunratty_sean'); });
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-popup');
onRules('the map\'s briefing popup', await lineReport(page, '#scenarioBriefModal .brief-card'));
wholeRules('the map\'s briefing popup', await blocks('#scenarioBriefModal .brief-card'));
// v1.298 (D.54, Michael: A): the popup lines both sides up as 3D kids; the big game with a full crew, two rows of yours
await page.evaluate(() => document.getElementById('briefCancelBtn').click());
await page.evaluate(() => { Game.persist.crew = ['eric', 'sean', 'nick', 'alex', 'diego']; crewBench.clear(); openScenarioBrief('hollow_big_battle'); });
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-lineup');
onRules('the briefing popup\'s lineup (the big game, a full crew)', await lineReport(page, '#scenarioBriefModal .brief-card'));
const lu = await page.evaluate(() => {
  const side = sel => [...document.querySelectorAll(`#briefRoster ${sel} .lu-kid`)].map(k => {
    const cv = k.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let inked = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0xf3) + Math.abs(d[i + 1] - 0xee) + Math.abs(d[i + 2] - 0xdd) > 60) inked++;
    const r = k.getBoundingClientRect();
    return { name: k.querySelector('.brief-name').textContent, inked, x: Math.round(r.left), y: Math.round(r.top), bench: !!k.querySelector('[data-bench]') };
  });
  const [you, them] = [...document.querySelectorAll('#briefRoster .brief-lineup > .brief-section')];
  return { yours: side('.brief-lineup > .brief-section:first-child'), theirs: side('.brief-lineup > .brief-section:last-child'),
    youRight: you.getBoundingClientRect().right, themLeft: them.getBoundingClientRect().left };
});
console.log(`   lineup: ${lu.yours.map(k => k.name + ' ' + k.inked).join(', ')} | ${lu.theirs.map(k => k.name + ' ' + k.inked).join(', ')}`);
check('the lineup: you and your five on the left, their five on the right, every kid drawn (over 800 pixels each)',
  lu.yours.length === 6 && lu.yours[0].name === 'You' && lu.theirs.length === 5 && lu.youRight <= lu.themLeft &&
  [...lu.yours, ...lu.theirs].every(k => k.inked > 800), lu);
check('your six stand in two rows of three, each crew kid with Bench under him; theirs in one row of five',
  new Set(lu.yours.map(k => k.y)).size === 2 && new Set(lu.theirs.map(k => k.y)).size === 1 && lu.yours.slice(1).every(k => k.bench) && !lu.yours[0].bench, lu);
await page.evaluate(() => { Game.persist.crew = []; document.getElementById('briefCancelBtn').click(); });
check('← Back closes the popup', await page.evaluate(() => !document.getElementById('scenarioBriefModal').classList.contains('active')));

// 3) the briefing before BEGIN
async function briefing(id) {
  await page.evaluate(id => enterScenario(id), id);
  await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await g.shot('notebook-briefing-' + id);
  onRules(`the briefing (${id})`, await lineReport(page, '#scenarioIntro .intro-inner'));
  wholeRules(`the briefing (${id})`, await blocks('#scenarioIntro .intro-inner'));
  const fit = await page.evaluate(() => { const r = document.querySelector('#scenarioIntro .intro-inner').getBoundingClientRect(),
    n = document.getElementById('introName').getBoundingClientRect(); return { name: n.top, top: r.top, bottom: r.bottom, vh: innerHeight }; });
  check(`the briefing (${id}) fits on a 720 px screen, its name and all`, fit.name >= 0 && fit.bottom <= fit.vh, fit);
}
await briefing('bunratty_sean');
const ring = await page.evaluate(() => { const b = document.getElementById('introBeginBtn'); b.classList.add('pad-hover');
  const cs = getComputedStyle(b); const r = { style: cs.outlineStyle, color: cs.outlineColor, width: cs.outlineWidth }; b.classList.remove('pad-hover'); return r; });
check('the pad\'s cursor rings a sticky note in red dashes', ring.style === 'dashed' && ring.color === 'rgb(179, 38, 30)', ring);
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000 });
check('BEGIN on the paper starts the match', (await g.mode()) === 'scenario');

// 3b) v1.284: PAUSED and the forfeit question, in the match
await page.evaluate(() => { Game.player._graceT = 1e9; document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); });
check('Escape opens PAUSED on paper', await page.evaluate(() => !!Game.paused && document.getElementById('pauseMenu').classList.contains('active')));
await g.shot('notebook-pause');
onRules('PAUSED', await lineReport(page, '#pauseMenu .modal-card'));
wholeRules('PAUSED', await blocks('#pauseMenu .modal-card'));
await page.evaluate(() => document.getElementById('pauseForfeitBtn').click());
check('FORFEIT asks first', await page.evaluate(() => !!Game.forfeitAsk && document.getElementById('forfeitAsk').classList.contains('active')));
await g.shot('notebook-forfeit');
onRules('the forfeit question', await lineReport(page, '#forfeitAsk .modal-card'));
wholeRules('the forfeit question', await blocks('#forfeitAsk .modal-card'));
await page.evaluate(() => document.getElementById('forfeitKeepBtn').click());
await page.evaluate(() => { if (Game.paused) document.getElementById('pauseResumeBtn').click(); });
check('KEEP PLAYING and RESUME go back to the match', await page.evaluate(() => Game.mode === 'scenario' && !Game.paused && !Game.forfeitAsk));

// 3c) v1.288: the HUD keeps its dark panels and takes the hand for its labels only; the numbers keep their type.
// The frame cost: the HUD's text laid out again 400 times (each label's text re-set, each panel's layout forced), with
// the hand on the labels and with them put back in Courier, five rounds each way, alternating; the fastest round with
// the hand may cost no more than 25% over the fastest in Courier, or no more than 0.1 ms more per relayout (0.6% of a
// 60 fps frame): the ratio swings with the machine's CPU (30% on a CI runner, 0.25 ms against 0.19, where it is 1-10%
// here), the frame cost is what a player would feel. (Timing whole match steps measured the simulation, whose cost
// changes as the kids move, not the font.)
const hud = await page.evaluate(() => {
  const ff = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily : null; };
  const bg = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
  return { label: ff('#ammoHud .gun-name'), roster: ff('#rosterHud .label'), number: ff('#ammoHud .ammo-line'), panel: bg('#ammoHud') };
});
check('the HUD\'s labels are in the hand, its numbers in the type they had, its panels dark',
  /NB Hand/.test(hud.label) && /NB Hand/.test(hud.roster) && !/NB/.test(hud.number) && hud.panel === 'rgba(20, 24, 28, 0.92)', hud);
const cost = await page.evaluate(() => {
  const panels = ['ammoHud', 'rosterHud', 'healthHud', 'loadoutHud', 'stanceHud'].map(id => document.getElementById(id)).filter(p => p && p.offsetParent);
  const labels = [...document.querySelectorAll('#ammoHud .gun-name, #ammoHud .bag-line, #ammoHud .status, #rosterHud .label, #healthHud .label, #loadoutHud .label, #stanceHud span')]
    .map(e => [...e.childNodes].find(n => n.nodeType === 3 && n.data.trim())).filter(Boolean);
  const plain = document.createElement('style');
  plain.textContent = '#hud * { font-family: "Courier New", monospace !important; }';
  const lay = n => { for (let i = 0; i < n; i++) { for (const t of labels) t.data = i % 2 ? t.data + ' ' : t.data.trimEnd(); for (const p of panels) p.offsetHeight; } };
  const run = () => { lay(40); const t0 = performance.now(); lay(400); return performance.now() - t0; };   // 40 untimed after each switch
  const hand = [], courier = [];
  for (let k = 0; k < 5; k++) { hand.push(run()); document.head.appendChild(plain); courier.push(run()); plain.remove(); }
  for (const t of labels) t.data = t.data.trimEnd();
  // the fastest round of each: under load (CI, or suites side by side) a slow round is the machine, not the font
  return { hand: +(Math.min(...hand) / 400).toFixed(4), courier: +(Math.min(...courier) / 400).toFixed(4), labels: labels.length, panels: panels.length, mode: Game.mode };
});
console.log(`   the HUD's ${cost.labels} labels laid out again: ${cost.hand} ms with the hand, ${cost.courier} ms in Courier (fastest of 5 x 400 each)`);
check('the hand on the HUD\'s labels costs no more than 25% (or 0.1 ms a relayout) over Courier to lay out',
  cost.mode === 'scenario' && cost.labels >= 5 && (cost.hand <= cost.courier * 1.25 || cost.hand - cost.courier <= 0.1), cost);

// 4) the result card, a win
await page.evaluate(() => { for (const e of Game.scenario.enemies) e.health = 0; endScenario('win'); });
await g.spin(5);
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-result-win');
onRules('the result card (a win)', await lineReport(page, '#resultScreen .result-card'));
wholeRules('the result card (a win)', await blocks('#resultScreen .result-card'));

// 5) a loss with the damage report: Play Again, then three hits on the list and a forfeit
await page.evaluate(() => document.getElementById('navAgainBtn').click());
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
check('Play Again on the paper opens the briefing again', true);
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000 });
await page.evaluate(() => {
  const st = Game.scenario.stats;
  st.damage.push({ part: 'chest', front: true, h: 0.62, lat: 0, by: 'Sean', gun: 'AK-47', dist: 14, t: 31, life: 1 },
    { part: 'head', front: false, h: 0.93, lat: 0.03, by: 'Sean', gun: 'AK-47', dist: 9, t: 47, life: 1 },
    { part: 'left leg', front: true, h: 0.2, lat: -0.15, by: null, gun: null, dist: null, t: 52, life: 1 });
  endScenario('lose');
});
await g.spin(5);
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-result-lose');
const hasDmg = await page.evaluate(() => !!document.getElementById('rsDamage'));
check('a loss shows the damage report on the paper', hasDmg);
onRules('the result card (a loss)', await lineReport(page, '#resultScreen .result-card'));
wholeRules('the result card (a loss)', await blocks('#resultScreen .result-card'));
const fit = await page.evaluate(() => { const r = document.querySelector('#resultScreen .result-card').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
check('the result card with a damage report fits on a 720 px screen', fit.top >= 0 && fit.bottom <= fit.vh, fit);
await page.evaluate(() => document.getElementById('returnBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom', null, { timeout: 60000 });
check('← BACK TO YOUR ROOM on the paper goes home', (await g.mode()) === 'bedroom');

// 6) the biggest roster's briefing (eight kids and the objective)
await briefing('hollow_big_battle');
const scroll = await page.evaluate(() => { const r = document.getElementById('introRoster'); return { sh: r.scrollHeight, ch: r.clientHeight }; });
check('its roster scrolls inside the page rather than running off the screen', scroll.sh > scroll.ch, scroll);
await page.evaluate(() => { const r = document.getElementById('introRoster'); r.scrollTop = r.scrollHeight; });
onRules('the big battle\'s roster scrolled to its end', await lineReport(page, '#scenarioIntro .intro-inner'));

console.log(`   worst text contrast on the paper ${worstContrast.toFixed(2)} : 1`);
check('nothing fetched from the network (the fonts are in the file)', !fetched.length, fetched.slice(0, 5));
check('no page errors', !g.errs.length, g.errs);
await g.browser.close();
