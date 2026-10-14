// v1.194 (D.20 step 1, Michael: A on "A better game" 1 — a light summer story told in the bedroom): a wall calendar
// in the bedroom shows the summer of 2003. Each zone is a few weeks of it; the date moves with the matches you win;
// the days gone are crossed off, today is ringed, and the last Saturday (30 August) is ringed twice.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(5);

// A new game: Sunday 1 June, in Winnmark
const d0 = await page.evaluate(() => ({ day: summerDayIndex(), label: summerDate(summerDayIndex()).label, zone: summerZoneKey(),
  cal: Game.interactables.find(it => it.type === 'calendar') ? true : false }));
check('a new game starts on Sunday 1 June, in Winnmark', d0.day === 0 && d0.label === 'Sunday 1 June' && d0.zone === 'winnmark_court', d0);
check('the bedroom has a calendar to look at', d0.cal);

// The spans: every zone has days, in ladder order, back to back, from 1 June to Friday 29 August
const spans = await page.evaluate(() => {
  const out = ZONE_LADDER.map(z => ({ key: z.key, span: SUMMER_SPANS[z.key] }));
  return { out, last: summerDate(89).label, big: summerDate(SUMMER_BIG_DAY).label };
});
let joined = spans.out[0].span[0] === 0;
for (let i = 1; i < spans.out.length; i++) joined = joined && spans.out[i].span && spans.out[i].span[0] === spans.out[i - 1].span[1] + 1;
check('each zone on the ladder has a span, back to back from 1 June', joined, spans.out.map(o => o.key + ' ' + o.span));
check('the last zone ends Friday 29 August; the big day is Saturday 30 August', spans.last === 'Friday 29 August' && spans.big === 'Saturday 30 August', spans);
check('the dates fall on the right weekdays (4 July 2003 was a Friday, 1 August a Friday)', await page.evaluate(() =>
  summerDate(33).label === 'Friday 4 July' && summerDate(61).label === 'Friday 1 August'));

// The date moves with the matches won: half of Winnmark's 16 → day 10; all of Winnmark (Bunratty opens) → 22 June
const prog = await page.evaluate(() => {
  const ids = PIN_SCENARIO_GROUPS.winnmark_court, out = {};
  ids.slice(0, 8).forEach(id => Game.persist.completed[id] = true);
  out.half = summerDate(summerDayIndex()).label;
  ids.forEach(id => Game.persist.completed[id] = true);
  out.zoneDone = { label: summerDate(summerDayIndex()).label, zone: summerZoneKey() };
  // the whole ladder but the last Saturday (v1.205), then that too
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) if (id !== SUMMER_FINALE) Game.persist.completed[id] = true;
  out.all = { label: summerDate(summerDayIndex()).label, zone: summerZoneKey() };
  Game.persist.completed[SUMMER_FINALE] = true;
  out.big = { label: summerDate(summerDayIndex()).label, zone: summerZoneKey() };
  // back to the middle of the Hollow: Winnmark and Bunratty done, 6 of the Hollow's 12
  Game.persist.completed = {};
  for (const k of ['winnmark_court', 'bunratty_court']) for (const id of PIN_SCENARIO_GROUPS[k]) Game.persist.completed[id] = true;
  PIN_SCENARIO_GROUPS.hollow.slice(0, 6).forEach(id => Game.persist.completed[id] = true);
  out.hollow = { day: summerDayIndex(), label: summerDate(summerDayIndex()).label, zone: summerZoneKey() };
  return out;
});
check('half of Winnmark won: Wednesday 11 June', prog.half === 'Wednesday 11 June', prog.half);
check('all of Winnmark won: Sunday 22 June, in Bunratty', prog.zoneDone.label === 'Sunday 22 June' && prog.zoneDone.zone === 'bunratty_court', prog.zoneDone);
check('the whole ladder won but the last Saturday: the last day of the store, Friday 29 August', prog.all.label === 'Friday 29 August' && prog.all.zone === 'grocery_store', prog.all);
check('the last Saturday won too: Saturday 30 August (v1.205)', prog.big.label === 'Saturday 30 August', prog.big);
check('half of the Hollow won: Sunday 20 July', prog.hollow.label === 'Sunday 20 July' && prog.hollow.zone === 'hollow', prog.hollow);

// Home again: the wall calendar shows July, the days before the 20th crossed off, the 20th ringed
await page.evaluate(() => enterBedroom());
await g.spin(3);
const wall = await page.evaluate(() => {
  const it = Game.interactables.find(i => i.type === 'calendar');
  // the page's canvas: read a crossed-off day (red) and today's ring (blue) from the drawing
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 576;
  drawSummerCalendar(cv, summerDayIndex());
  const c = cv.getContext('2d');
  const ph = 576 * 0.38, gy = ph + 72, cw = (384 - 32) / 7, ch = (576 - gy - 12) / 6;
  const cell = (d) => { const slot = (30 % 7) + d - 1; return { x: 16 + cw * (slot % 7), y: gy + ch * Math.floor(slot / 7) }; };
  const count = (d, test) => { const { x, y } = cell(d); const px = c.getImageData(x, y, cw, ch).data; let n = 0;
    for (let i = 0; i < px.length; i += 4) if (test(px[i], px[i + 1], px[i + 2])) n++; return n; };
  const red = (r, g, b) => r > 170 && g < 80 && b < 80, blue = (r, g, b) => b > 150 && r < 80;
  return { has: !!it, crossed19: count(19, red), crossed20: count(20, red), ring20: count(20, blue), ring21: count(21, blue) };
});
check('the wall calendar crosses off the 19th, not the 20th', wall.crossed19 > 40 && wall.crossed20 === 0, wall);
check('and rings the 20th, not the 21st', wall.ring20 > 40 && wall.ring21 === 0, wall);

// Walk up to it: the prompt, then E opens the three months
await page.evaluate(() => { Game.player.pos.set(-2.3, 0, -1.4); Game.player.yaw = 0; Game.player.pitch = 0; });
await g.spin(3);
const near = await page.evaluate(() => ({ focus: Game.focusedInteractable && Game.focusedInteractable.type,
  prompt: document.getElementById('interactPrompt').textContent }));
check('in front of it, the prompt is "Look at the calendar"', near.focus === 'calendar' && /Look at the calendar/.test(near.prompt), near);
await g.shot('calendar-wall');
await page.keyboard.press('KeyE');
const open = await page.evaluate(() => ({
  mode: Game.mode, title: document.getElementById('modalTitle').textContent,
  today: document.querySelector('#modalBody .sm-today').textContent,
  months: [...document.querySelectorAll('#modalBody .sm-name')].map(e => e.textContent),
  past: document.querySelectorAll('#modalBody .sm-day.past').length,
  todayCell: document.querySelector('#modalBody .sm-day.today')?.dataset.day,
  big: document.querySelector('#modalBody .sm-day.big')?.dataset.day,
  here: document.querySelectorAll('#modalBody .sm-day.here').length,
  note: document.querySelector('#modalBody .sm-note').textContent.replace(/\s+/g, ' ').trim(),
  wide: document.querySelector('#modalScreen .modal-card').classList.contains('wide'),
}));
check('E opens "Summer 2003" over the bedroom', open.mode === 'modal' && open.title === 'Summer 2003', open);
check('today is Sunday 20 July', open.today === 'Today is Sunday 20 July.', open.today);
check('June, July and August, 49 days crossed off, the 20th ringed, 30 August ringed twice',
  open.months.join() === 'June,July,August' && open.past === 49 && open.todayCell === '49' && open.big === '90', open);
check("the Hollow's 14 days are shaded", open.here === 14, open.here);
check('the note gives the zone\'s span and the days left', /The Hollow: 13 July to 26 July\./.test(open.note) && /41 days away/.test(open.note), open.note);
await g.shot('calendar-open');
await page.evaluate(() => document.getElementById('modalCloseBtn').click());
const shut = await page.evaluate(() => ({ mode: Game.mode, wide: document.querySelector('#modalScreen .modal-card').classList.contains('wide') }));
check('OK closes it back to the bedroom, and the modal is narrow again for the bed', shut.mode === 'bedroom' && !shut.wide, shut);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
