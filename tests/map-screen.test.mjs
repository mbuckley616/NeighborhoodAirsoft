// v1.146 (backlog D.8 step 1, Michael: A): the world map fills the window in two columns, the map on the left at
// the drawing's own 700:380 and the chosen zone's scenarios in a scrolling column on the right. It opens on the
// furthest zone you have reached (or the one you last looked at), never on an empty "click a pin" box. Checked at
// four laptop/desktop sizes and one portrait window, where the two stack.
// v1.147 (D.8 step 2): the rows are cards in a grid, two or more across; at least 10 Winnmark cards in view at
// 1280x720 (7 rows in v1.146), and each card says its place, matchup, lives and whether it is done, next or locked.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const measure = () => page.evaluate(() => {
  const r = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const content = r(document.querySelector('#worldMap .map-content'));
  const area = r(document.getElementById('mapArea'));
  const left = r(document.getElementById('mapLeft'));
  const info = document.getElementById('scenarioInfo'), ir = r(info);
  const rows = [...info.querySelectorAll('.sc-card')].map(r);
  const visible = rows.filter(x => x.t >= ir.t - 0.5 && x.b <= ir.b + 0.5).length;
  const pinsIn = [...document.querySelectorAll('#worldMap .pin .marker')].every(m => {
    const b = m.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    return cx > area.l && cx < area.r && cy > area.t && cy < area.b;
  });
  const cols = new Set(rows.map(x => Math.round(x.l))).size;
  return { cols, vw: innerWidth, vh: innerHeight, content, area, left, info: ir, rows: rows.length, visible, pinsIn,
    scroll: info.scrollHeight > info.clientHeight + 1,
    selected: [...document.querySelectorAll('#worldMap .pin.selected')].map(p => p.dataset.scenario),
    name: (info.querySelector('.sc-name') || {}).textContent || '', empty: info.classList.contains('empty') };
});

// A new save: Winnmark is the only open zone, so the map opens on it.
for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080], [1024, 640]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => { Game._mapZone = null; openMap(); });
  const m = await measure();
  const ratio = m.area.w / m.area.h;
  console.log(`   ${w}x${h}: panel ${Math.round(m.content.w)}x${Math.round(m.content.h)}, map ${Math.round(m.area.w)}x${Math.round(m.area.h)}, list ${Math.round(m.info.w)}x${Math.round(m.info.h)}, ${m.visible} of ${m.rows} cards in view, ${m.cols} across`);
  check(`${w}x${h}: the panel fills the window`, m.content.w >= Math.min(w - 40, 1800) && m.content.h >= h - 40, m.content);
  check(`${w}x${h}: the map keeps the drawing's 700:380`, Math.abs(ratio - 700 / 380) < 0.02, +ratio.toFixed(3));
  check(`${w}x${h}: the map fills its column one way`, m.area.w >= m.left.w - 2 || m.area.h >= m.left.h - 2, { area: m.area, left: m.left });
  check(`${w}x${h}: map left, scenarios right`, m.area.r <= m.info.l && m.info.t < m.area.b, { area: m.area, info: m.info });
  check(`${w}x${h}: every pin sits on the map`, m.pinsIn);
  check(`${w}x${h}: opens on Winnmark, its pin marked`, /Winnmark/.test(m.name) && m.selected.join() === 'winnmark_court' && !m.empty, m);
  check(`${w}x${h}: all 16 Winnmark scenarios listed, at least 5 in view, the rest scroll (or all fit)`, m.rows === 16 && m.visible >= 5 && (m.scroll || m.visible === 16), m);
  check(`${w}x${h}: the cards sit at least two across`, m.cols >= 2, m.cols);
  if (w === 1280) check('1280x720: at least 10 Winnmark cards in view (7 rows in v1.146)', m.visible >= 10, m.visible);
  if (w === 1280) await g.shot('map-screen-1280');
  await page.evaluate(() => closeMap());
}

// Portrait: the two stack, the map on top at full width.
await page.setViewportSize({ width: 800, height: 1000 });
await page.evaluate(() => openMap());
const p = await measure();
console.log(`   800x1000: map ${Math.round(p.area.w)}x${Math.round(p.area.h)}, list ${Math.round(p.info.w)}x${Math.round(p.info.h)}, ${p.visible} rows in view`);
check('portrait: the map sits above the list', p.area.b <= p.info.t && Math.abs(p.area.w / p.area.h - 700 / 380) < 0.02, p);
check('portrait: the list is as wide as the panel', p.info.w > p.content.w * 0.8, p);
await g.shot('map-screen-portrait');
await page.evaluate(() => closeMap());
await page.setViewportSize({ width: 1280, height: 720 });

// Further along: with The Hollow cleared the lot is open, so the map opens on the lot.
const along = await page.evaluate(() => {
  for (const k of ['winnmark_court', 'bunratty_court', 'hollow']) for (const id of PIN_SCENARIO_GROUPS[k]) Game.persist.completed[id] = true;
  Game._mapZone = null; openMap();
  const first = { sel: document.querySelector('#worldMap .pin.selected')?.dataset.scenario,
    name: document.querySelector('#scenarioInfo .sc-name').textContent };
  // click Bunratty, close, reopen: it stays on Bunratty
  document.querySelector('#worldMap .pin[data-scenario="bunratty_court"] .marker').click();
  closeMap(); openMap();
  const again = { sel: document.querySelector('#worldMap .pin.selected')?.dataset.scenario,
    name: document.querySelector('#scenarioInfo .sc-name').textContent,
    sels: document.querySelectorAll('#worldMap .pin.selected').length };
  // a locked zone can be looked at, and is what it reopens on
  document.querySelector('#worldMap .pin[data-scenario="northcliff"] .marker').click();
  const locked = document.getElementById('scenarioInfo').textContent.replace(/\s+/g, ' ').trim();
  closeMap(); openMap();
  const after = document.querySelector('#worldMap .pin.selected')?.dataset.scenario;
  closeMap();
  return { first, again, locked, after };
});
check('with The Hollow cleared it opens on the lot', along.first.sel === 'market_lot' && /Riverside Market/.test(along.first.name), along.first);
check('the zone you clicked is the one it reopens on', along.again.sel === 'bunratty_court' && /Bunratty/.test(along.again.name) && along.again.sels === 1, along.again);
check('a locked zone still shows what opens it', /Clear Riverside Market/.test(along.locked), along.locked);
check('after looking at a locked zone, it reopens on that zone', along.after === 'northcliff', along.after);

// What a card says: place in the zone, matchup, badges, lives, pay; done / next / locked.
const cards = await page.evaluate(() => {
  Game._savedCompleted = { ...Game.persist.completed };
  for (const k in PIN_SCENARIO_GROUPS) for (const id of PIN_SCENARIO_GROUPS[k]) delete Game.persist.completed[id];
  const w = PIN_SCENARIO_GROUPS.winnmark_court;
  Game.persist.completed[w[0]] = true; Game.persist.completed[w[1]] = true;
  Game._mapZone = 'winnmark_court'; openMap();
  const info = document.getElementById('scenarioInfo');
  const all = [...info.querySelectorAll('.sc-card')];
  const t = el => el.textContent.replace(/\s+/g, ' ').trim();
  const out = { ids: all.map(c => c.dataset.id), group: w, count: t(info.querySelector('.sc-zone-count')),
    done: all.filter(c => c.classList.contains('done')).map(c => c.dataset.id),
    next: all.filter(c => c.classList.contains('next')).map(c => c.dataset.id),
    locked: all.filter(c => c.classList.contains('locked')).map(c => c.dataset.id),
    unlocked: w.filter(id => isScenarioUnlocked(id)),
    texts: Object.fromEntries(all.map(c => [c.dataset.id, t(c)])),
    nums: all.map(c => t(c.querySelector('.sc-card-num'))) };
  const night = Object.keys(SCENARIOS).find(id => w.includes(id) && SCENARIOS[id].timeOfDay === 'night');
  const defend = Object.keys(SCENARIOS).find(id => w.includes(id) && SCENARIOS[id].scenarioType === 'defend');
  out.night = night; out.defend = defend;
  out.lives1 = SCENARIOS[w[0]].playerLives || 1; out.match0 = scenarioMatchup(SCENARIOS[w[0]]);
  // everything open: one locked card's lock text on a fresh save
  closeMap();
  return out;
});
console.log(`   cards: ${cards.count}; next ${cards.next}; ${cards.locked.length} locked; #1 reads "${cards.texts[cards.ids[0]]}"`);
check('cards follow the zone order, numbered 1..16', cards.ids.join() === cards.group.join() && cards.nums.join() === cards.group.map((_, i) => i + 1).join(), cards);
check('the zone counts its won matches', cards.count === '2 of 16 won', cards.count);
check('won cards say DONE', cards.done.join() === cards.group.slice(0, 2).join() && /✓ DONE/.test(cards.texts[cards.group[0]]), cards.done);
check('exactly one NEXT, the first open match not yet won', cards.next.length === 1 && cards.next[0] === cards.unlocked.find(id => !cards.done.includes(id)) && /NEXT/.test(cards.texts[cards.next[0]]), cards);
check('locked cards are the ones the ladder locks, say which card opens them, and have no START', cards.locked.length === 16 - cards.unlocked.length && cards.locked.length > 0 && cards.locked.every(id => /🔒/.test(cards.texts[id]) && cards.texts[id].includes('Win #' + cards.group.indexOf(id) + ' to unlock') && !/START/.test(cards.texts[id])), cards.locked);
check('a card shows matchup, lives and pay', cards.texts[cards.group[0]].includes(cards.match0) && /♥ \d+ (life|lives)/.test(cards.texts[cards.group[0]]) && /WIN \+\$\d+ · LOSE \+\$\d+/.test(cards.texts[cards.group[0]]), cards.texts[cards.group[0]]);
check('night and defend matches carry their badges', (!cards.night || /🌙 NIGHT/.test(cards.texts[cards.night])) && (!cards.defend || /🛡 DEFEND/.test(cards.texts[cards.defend])), { n: cards.night, d: cards.defend });

// A click anywhere on an open card opens its briefing; a locked card does nothing.
const cardClick = await page.evaluate(() => {
  Game._mapZone = 'winnmark_court'; openMap();
  const info = document.getElementById('scenarioInfo');
  const lock = info.querySelector('.sc-card.locked'); lock.querySelector('.sc-card-title').click();
  const afterLock = document.getElementById('scenarioBriefModal').classList.contains('active');
  const open = info.querySelector('.sc-card.next'); open.querySelector('.sc-card-meta').click();
  const afterOpen = document.getElementById('scenarioBriefModal').classList.contains('active');
  const title = document.getElementById('scenarioBriefModal').textContent;
  document.getElementById('briefCancelBtn').click(); closeMap();
  Game.persist.completed = Game._savedCompleted;
  return { afterLock, afterOpen, ok: title.includes(SCENARIOS[open.dataset.id].scenarioName) };
});
check('a click on a locked card opens nothing', !cardClick.afterLock, cardClick);
check('a click on an open card opens its briefing', cardClick.afterOpen && cardClick.ok, cardClick);

// START on a card still opens the briefing, with a real click.
await page.evaluate(() => { Game._mapZone = 'winnmark_court'; openMap(); });
const btn = await page.evaluate(() => {
  const b = document.querySelector('#scenarioInfo .sc-go[data-launch="winnmark_seth_house"]');
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(btn.x, btn.y);
const brief = await page.evaluate(() => document.getElementById('scenarioBriefModal').classList.contains('active'));
check('START on a scenario opens its briefing', brief);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
