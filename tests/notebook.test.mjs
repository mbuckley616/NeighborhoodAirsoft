// v1.283 (backlog D.46, Michael 17 Oct: "Can we make all of the UI elements look like they're on Notebook Paper, as if
// a kid ripped out some pages from a notebook for school and wrote on them?"; decision A, 20 Oct: every menu and card
// on paper, the HUD stays dark; every line of text sits on the ruled lines, and larger blocks are filled). This suite
// opens each paper screen and checks: no page errors and nothing fetched from the network (both fonts are embedded);
// every line of text has its baseline within 3 px of a rule; every filled block is a whole number of rules tall;
// every text colour holds 4.5 : 1 against the paper; the sticky-note buttons still click, and the pad's cursor rings
// them in red dashes.
import { boot, check } from './lib/game.mjs';
import { lineReport, contrast } from './lib/notebook.mjs';
const g = await boot(); const { page } = g;
const fetched = [];
page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) fetched.push(u); });
await g.bedroom();

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
  return [...root.querySelectorAll('.reward, .rs-cell, .rs-damage, .brief-objective, #introMap, .nb-btn')]
    .filter(e => e.getClientRects().length && !e.closest('.rs-grid') || e.classList.contains('rs-cell'))
    .map(e => { const cs = getComputedStyle(e);
      return { el: e.id || e.className.split(' ')[0], h: +(e.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)).toFixed(1) }; });
}, sel);
function wholeRules(name, bl) {
  const bad = bl.filter(b => Math.abs(b.h / 26 - Math.round(b.h / 26)) > 0.02);
  check(`${name}: each filled block and button takes a whole number of rules (${bl.length})`, !bl.length || !bad.length, bad);
}

// 1) the fonts are on the page without a fetch
await page.evaluate(() => Promise.all([document.fonts.load('17px "NB Hand"'), document.fonts.load('20px "NB Marker"')]));
const fonts = await page.evaluate(() => ({ hand: document.fonts.check('17px "NB Hand"'), marker: document.fonts.check('20px "NB Marker"'),
  faces: [...document.fonts].filter(f => /^"?NB /.test(f.family)).map(f => f.family + ':' + f.status) }));
check('both handwriting fonts load from the file itself', fonts.hand && fonts.marker, fonts);

// 2) the map's popup briefing
await page.evaluate(() => { isScenarioUnlocked = () => true; openScenarioBrief('bunratty_sean'); });
await page.evaluate(() => document.fonts.ready);
await g.shot('notebook-popup');
onRules('the map\'s briefing popup', await lineReport(page, '#scenarioBriefModal .brief-card'));
wholeRules('the map\'s briefing popup', await blocks('#scenarioBriefModal .brief-card'));
await page.evaluate(() => document.getElementById('briefCancelBtn').click());
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
