// v1.195 (D.20 step 2, Michael: A on "A better game" 1): your friends text your flip phone between matches. The phone
// is on the nightstand; a win brings a text, dated by the calendar; opening the phone reads them, and that is saved.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(5);

// A new game: one text from Eric, dated Sunday 1 June, unread; the phone says so
const d0 = await page.evaluate(() => {
  const it = Game.interactables.find(i => i.type === 'phone');
  return { texts: summerTexts(), unread: summerUnreadCount(), prompt: it && it.prompt, label: it && it.label,
    led: !!(it && it._led && it._led.visible), chip: it && it._labelEl && it._labelEl.textContent };
});
check('a new game has one text, from Eric, dated day 0', d0.texts.length === 1 && d0.texts[0].from === 'Eric' && d0.texts[0].day === 0, d0.texts);
check('the phone on the nightstand: "Check your phone (1 new)", its chip "Phone · 1 new", its light on',
  d0.prompt === 'Check your phone (1 new)' && /Phone · 1 new/.test(d0.chip) && d0.led, d0);

// Every text's trigger is a real scenario, and each is dated on its zone's calendar
const facts = await page.evaluate(() => SUMMER_TEXTS.map(t => ({ id: t.id, ok: !t.after || !!SCENARIOS[t.after],
  day: summerDayAfter(t.after), label: summerDate(summerDayAfter(t.after)).label })));
check('every text arrives after a real match', facts.every(f => f.ok), facts.filter(f => !f.ok));
const byId = Object.fromEntries(facts.map(f => [f.id, f]));
check('a zone\'s last match dates its text on the next zone\'s first day (Bunratty: Sunday 22 June; the store: Monday 25 August)',
  byId.seanHome.label === 'Sunday 22 June' && byId.store.label === 'Monday 25 August', [byId.seanHome, byId.store]);   // v1.273: Sean calls you home (was Eric's)
check('the last one comes the day before the big Saturday: Friday 29 August', byId.last.label === 'Friday 29 August', byId.last);
check('the dates never go backwards down the list', facts.every((f, i) => i === 0 || f.day >= facts[i - 1].day), facts.map(f => f.day));

// Win matches: each brings its text, and the day a win brings is the day the calendar then shows
const prog = await page.evaluate(() => {
  const out = [];
  ladder: for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) {
    Game.persist.completed[id] = true;
    const t = SUMMER_TEXTS.find(t => t.after === id);
    if (t) out.push({ id: t.id, after: id, day: summerDayAfter(id), calendar: summerDayIndex() });
    if (id === 'hollow_infection_night') break ladder;   // stop partway through the Hollow (v1.402: the night before the Big Game, its finale now)
  }
  return { out, n: summerTexts().length, unread: summerUnreadCount(), order: summerTexts().map(t => t.id) };
});
check('each text is dated on the day the calendar shows once its match is won', prog.out.length === 10 && prog.out.every(o => o.day === o.calendar), prog.out);
// the Hollow's chain stops at the big game; ladder order puts the big battle after the fort matches
// v1.273: thirteen, with Eric's, Sean's and Nick's asks to join your crew; v1.363: fifteen, with Seth's before Bunratty's finale and the big game
// v1.402 (D.57 step 4): the Big Game is the Hollow's finale now, so the night before it is fourteen, Seth's "big game tmrw" newest
check('fourteen texts the night before the Hollow\'s big game, all unread, newest first', prog.n === 14 && prog.unread === 14 &&
  prog.order[0] === 'sethHollow' && prog.order[prog.order.length - 1] === 'start', prog);

// Home: the phone shows 10 new; walk to it, E opens them, newest first, and reads them all
await page.evaluate(() => enterBedroom());
await g.spin(3);
await page.evaluate(() => { const it = Game.interactables.find(i => i.type === 'phone');
  Game.player.pos.set(it.pos.x - 0.45, 0, it.pos.z - 0.3); Game.player.yaw = -Math.PI / 2; Game.player.pitch = -0.5; });
await g.spin(3);
const near = await page.evaluate(() => ({ focus: Game.focusedInteractable && Game.focusedInteractable.type,
  prompt: document.getElementById('interactPrompt').textContent }));
check('beside the nightstand, the prompt is "Check your phone (14 new)"', near.focus === 'phone' && /Check your phone \(14 new\)/.test(near.prompt), near);
await g.shot('texts-phone');
await page.keyboard.press('KeyE');
const open = await page.evaluate(() => ({
  mode: Game.mode, title: document.getElementById('modalTitle').textContent,
  msgs: [...document.querySelectorAll('#modalBody .ph-msg')].map(m => ({ id: m.dataset.id, isNew: m.classList.contains('new'),
    from: m.querySelector('.ph-from').textContent, date: m.querySelector('.ph-date').textContent })),
  unread: summerUnreadCount(), stored: Object.keys(Game.persist.textsRead || {}).length,
  it: (() => { const it = Game.interactables.find(i => i.type === 'phone'); return { prompt: it.prompt, led: it._led.visible, chip: it._labelEl.textContent }; })(),
}));
check('E opens "Texts" over the bedroom', open.mode === 'modal' && open.title === 'Texts', open.mode);
check('fourteen messages, all marked NEW, newest first: Seth on the Hollow\'s big game first, Eric\'s first one last',
  open.msgs.length === 14 && open.msgs.every(m => m.isNew) && open.msgs[0].from === 'SETH' && open.msgs[13].id === 'start' && open.msgs[13].date === 'Sun 1 Jun', open.msgs);
check('opening them reads them all: none unread, fourteen kept in the save', open.unread === 0 && open.stored === 14, open);
check('the phone.s light goes off and its prompt and chip say "Phone" again', open.it.prompt === 'Check your phone' && !open.it.led && /Phone$/.test(open.it.chip.trim()), open.it);
await g.shot('texts-open');
await page.evaluate(() => document.getElementById('modalCloseBtn').click());
const shut = await page.evaluate(() => ({ mode: Game.mode, phone: document.querySelector('#modalScreen .modal-card').classList.contains('phone') }));
check('OK closes it back to the bedroom, and the modal loses its phone look', shut.mode === 'bedroom' && !shut.phone, shut);

// A save and a load keep them read; the next win brings one new one
const re = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const before = summerUnreadCount();
  for (const id of PIN_SCENARIO_GROUPS.hollow) Game.persist.completed[id] = true;   // the rest of the Hollow, its capstone too
  return { ok: r.ok, before, after: summerUnreadCount(), newest: summerTexts()[0].id };
});
check('a save and load keeps them read', re.ok && re.before === 0, re);
check('finishing the Hollow with the Big Game brings Seth\'s on it and Brooke\'s about the lot, the two new ones (v1.402)', re.after === 2 && re.newest === 'lot', re);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
