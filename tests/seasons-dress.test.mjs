// v1.489 (backlog D.96 step 5, Michael: B, 21 Nov 2026): the season's looks on the kids and the houses. In fall every
// match kid wears long sleeves, trousers and a hood; in winter also a beanie, a scarf and gloves. Winter puts snow on
// the roofs, and the Christmas matches string lights on the houses. The summer is untouched. v1.490: the bedroom
// calendar turns to the fall and the winter once the Last Saturday is won.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const look = () => page.evaluate(() => {
  const es = Game.scenario.enemies || [];
  const d = es.map(e => e.mesh.seasonDress);
  const sleeves = es.filter(e => [e.mesh.pose.rigR, e.mesh.pose.rigL].every(r => r.fore.children.some(c => c.userData.kidSleeve))).length;
  const xm = Game.scene.getObjectByName('christmasLights');
  const s = Game.scene.userData.season || {};
  return { season: s.season || null, roofs: s.roofs || 0, kids: es.length, dressed: d.filter(Boolean).length, sleeves,
    beanies: d.filter(x => x && x.beanie).length, scarves: d.filter(x => x && x.scarf).length,
    hats: es.filter(e => e.mesh.hat || (e.mesh.costume && e.mesh.costume.head)).length,
    xmas: xm ? xm.userData.christmas : null };
});
const sum = await (async () => { await g.scenario('winnmark_team_3v3'); return look(); })();
const fall = await (async () => { await g.scenario('fall_wk_squad'); return look(); })();
const win = await (async () => { await g.scenario('winter_wk_snow_day'); return look(); })();
const xmas = await (async () => { await g.scenario('winter_bn_crew'); return look(); })();
const sum2 = await (async () => { await g.scenario('bunratty_team_4v4'); return look(); })();
console.log('   ' + JSON.stringify({ sum, fall, win, xmas, sum2 }));
check('summer: nobody dressed for a season, no roof snow, no lights', sum.dressed === 0 && sum.roofs === 0 && !sum.xmas && sum2.dressed === 0 && !sum2.xmas, { sum, sum2 });
check('fall: every kid in long sleeves and a hood, no beanies or scarves, no roof snow', fall.kids > 0 && fall.dressed === fall.kids && fall.sleeves === fall.kids && fall.beanies === 0 && fall.scarves === 0 && fall.roofs === 0, fall);
check('winter: every kid with sleeves, a scarf and gloves, a beanie on all but those with a hat of their own', win.kids > 0 && win.dressed === win.kids && win.scarves === win.kids && win.beanies === win.kids - win.hats, win);
check('winter: snow on the roofs', win.roofs > 0 && xmas.roofs > 0, { win: win.roofs, xmas: xmas.roofs });
check('Christmas Break: lights on the houses; Snow Day has none', xmas.xmas && xmas.xmas.houses > 0 && xmas.xmas.bulbs > 20 * xmas.xmas.houses / 2 && !win.xmas, { xmas: xmas.xmas, win: win.xmas });

// v1.490: the calendar. Summer before the Last Saturday; the fall's page after it; the winter's once the fall is won.
const cal = await page.evaluate(() => {
  const P = Game.persist.completed, r = {};
  const ids = Object.keys(P); for (const k of ids) delete P[k];
  r.summer = seasonCalendarNow();
  openSummerCalendar(); r.summerTitle = document.getElementById('modalTitle').textContent; closeModal && closeModal();
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key] || []) P[id] = true;
  P[SUMMER_FINALE] = true;
  r.fall = seasonCalendarNow();
  openSummerCalendar(); r.fallTitle = document.getElementById('modalTitle').textContent; r.fallBody = document.getElementById('modalBody').textContent.replace(/\s+/g, ' ');
  for (const z of SEASON_ZONES) if (z.season === 'fall') for (const id of PIN_SCENARIO_GROUPS[z.key]) P[id] = true;
  r.winter = seasonCalendarNow();
  openSummerCalendar(); r.winterTitle = document.getElementById('modalTitle').textContent;
  for (const z of SEASON_ZONES) for (const id of PIN_SCENARIO_GROUPS[z.key]) P[id] = true;
  r.end = seasonCalendarNow();
  openSummerCalendar(); r.endBody = document.getElementById('modalBody').textContent.replace(/\s+/g, ' ');
  r.summerDay = summerDayIndex();
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 576; drawSummerCalendar(cv, summerDayIndex());
  const px = cv.getContext('2d').getImageData(10, 200, 1, 1).data; r.wallPx = [px[0], px[1], px[2]];   // the picture's snowy ground
  for (const k of Object.keys(P)) delete P[k];
  return r;
});
console.log('   ' + JSON.stringify({ ...cal, fallBody: cal.fallBody.slice(0, 120), endBody: cal.endBody.slice(-80) }));
check('in the summer the calendar is the summer\'s', cal.summer === null && cal.summerTitle === 'Summer 2003', cal.summerTitle);
check('after the Last Saturday: Fall 2003, Saturday 6 September at Winnmark', cal.fall && cal.fall.season === 'fall' && cal.fall.label === 'Saturday 6 September' && cal.fallTitle === 'Fall 2003' && /Winnmark/.test(cal.fallBody), cal.fall);
check('the fall won: Winter 2003-04, Saturday 6 December at Bunratty', cal.winter && cal.winter.label === 'Saturday 6 December' && cal.winterTitle === 'Winter 2003-04' && /Bunratty/.test(cal.winter.zone.name), cal.winter);
check('the year won: Friday 20 February, and the view says so', cal.end && cal.end.label === 'Friday 20 February' && cal.end.yearWon && /the year is won/.test(cal.endBody), cal.end);
check('the wall page is the winter\'s picture, the summer\'s day count unchanged', cal.wallPx[0] > 230 && cal.wallPx[2] > 230 && cal.summerDay === 90, { px: cal.wallPx, day: cal.summerDay });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
