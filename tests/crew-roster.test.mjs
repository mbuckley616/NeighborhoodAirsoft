// v1.273 (D.28 step 1, Michael's design in decisions "Build your crew"): both crews are fixed rosters. Yours is Eric,
// Sean, Nick, Alex and Diego, each asking by text at a story moment (Eric when Winnmark is done, Sean and Nick when
// Bunratty is, Alex at Stoneglen, Diego at Bellfield); YES takes him in for good, NOT YET leaves the ask open. Seth's is
// eight, with two new kids, Garrett and Colin. The crew is saved; the mirror's YOUR CREW card lists it. No match
// changes in this step: a full crew still plays a team match with that match's own allies.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(3);

// The rosters
const ro = await page.evaluate(() => {
  const asks = SUMMER_TEXTS.filter(t => t.ask).map(t => ({ kid: t.ask, after: t.after, from: t.from, day: summerDayAfter(t.after) }));
  const both = CREW_ROSTER.filter(id => SETH_CREW_ROSTER.includes(id));
  const looks = ['garrett', 'colin'].map(id => { const k = createKid(CHARACTERS[id], 'pistol'); return { id, ok: !!k.group, scale: +k.group.scale.y.toFixed(2) }; });
  const pools = ['garrett', 'colin'].map(id => ['playerHit', 'npcHit', 'playerSpotted', 'taunt'].map(c => voiceLinePools(id, c).own.length));
  return { crew: CREW_ROSTER.slice(), seth: SETH_CREW_ROSTER.slice(), max: CREW_MAX, asks, both,
    known: [...CREW_ROSTER, ...SETH_CREW_ROSTER].every(id => !!CHARACTERS[id]), looks, pools,
    oldText: SUMMER_TEXTS.some(t => /sean from bunratty/.test(t.text)), evan: SUMMER_TEXTS.find(t => t.id === 'northcliff').text };
});
check('your crew: Eric, Sean, Nick, Alex, Diego; five at most', ro.crew.join() === 'eric,sean,nick,alex,diego' && ro.max === 5, ro.crew);
check("Seth's crew: Seth, Trey, Brooke, Tyler, Evan, Andrew, Garrett, Colin; nobody on both, Seth never yours",
  ro.seth.join() === 'seth,trey,brooke,tyler,evan,andrew,garrett,colin' && ro.both.length === 0 && !ro.crew.includes('seth'), ro.seth);
check('every kid on both rosters is a real character, Garrett and Colin among them', ro.known, ro);
check('Garrett and Colin are built, Garrett taller', ro.looks.every(l => l.ok) && ro.looks[0].scale > ro.looks[1].scale, ro.looks);
check('Garrett and Colin have their own lines in every situation (4 or more)', ro.pools.flat().every(n => n >= 4), ro.pools);
const askAt = Object.fromEntries(ro.asks.map(a => [a.kid, a]));
check('one ask each, from the kid himself, at his moment: Eric after Winnmark, Sean and Nick after You and Nick (v1.408, was after Bunratty), Alex at Stoneglen, Diego at Bellfield',
  ro.asks.length === 5 && ro.asks.every(a => a.from.toLowerCase() === a.kid) && askAt.eric.after === 'winnmark_night_team_2v2' &&
  askAt.sean.after === 'bunratty_team_2v1' && askAt.nick.after === 'bunratty_team_2v1' &&
  askAt.alex.after === 'stoneglen_hold_treehouse' && askAt.diego.after === 'bellfield_ctf', ro.asks);
check('the asks come in roster order through the summer', ro.asks.every((a, i) => i === 0 || a.day >= ro.asks[i - 1].day), ro.asks.map(a => a.day));
check("Eric's \"sean from bunratty\" text is gone; Evan is Seth's old friend", !ro.oldText && /seths old friend evan/.test(ro.evan), ro.evan);

// A new game: nobody in, no ask open; the mirror says so
const d0 = await page.evaluate(() => {
  openMirror();
  const row = document.querySelector('#mirrorOptions .mirror-row[data-key="crewMembers"]');
  const out = { crew: crewMembers(), open: CREW_ROSTER.filter(crewAskOpen), row: row && row.textContent.replace(/\s+/g, ' ').trim() };
  closeMirror();
  return out;
});
check('a new game: crew empty, no ask open', d0.crew.length === 0 && d0.open.length === 0, d0);
check('the mirror: "In it · 0 of 5", just you so far', /In it · 0 of 5/.test(d0.row) && /Just you so far/.test(d0.row), d0.row);

// Winnmark done: Sean calls you home and Eric asks. NOT YET leaves it open; YES takes him in
const w = await page.evaluate(() => {
  for (const id of PIN_SCENARIO_GROUPS.winnmark_court) Game.persist.completed[id] = true;
  return { open: CREW_ROSTER.filter(crewAskOpen), newest: summerTexts().slice(0, 2).map(t => t.id) };
});
check('after Winnmark: Eric\'s ask is open, Sean\'s "come home" beside it', w.open.join() === 'eric' && w.newest.join() === 'askEric,seanHome', w);
const ph = async () => page.evaluate(() => {
  const m = document.querySelector('#modalBody .ph-msg[data-id="askEric"]');
  return { buttons: m ? [...m.querySelectorAll('.ph-ask button')].map(b => b.textContent) : null, ask: m && m.querySelector('.ph-ask').textContent };
});
await page.evaluate(() => openPhone());
const p1 = await ph();
check("Eric's text has two buttons: Yes, you're in / Not yet", p1.buttons && p1.buttons.join('|') === "Yes, you're in|Not yet", p1);
await g.shot('crew-ask');
await page.evaluate(() => document.querySelector('#modalBody .ph-msg[data-id="askEric"] .ph-ask button[data-yes="0"]').click());
const p2 = await page.evaluate(() => ({ ask: document.querySelector('#modalBody .ph-msg[data-id="askEric"] .ph-ask').textContent, crew: crewMembers(), open: crewAskOpen('eric') }));
check('NOT YET: nobody joins, the ask stays open', p2.crew.length === 0 && p2.open && /Not yet/.test(p2.ask), p2);
await page.evaluate(() => { document.getElementById('modalCloseBtn').click(); openPhone(); });
const p3 = await ph();
check('reopening the phone, the buttons are back', p3.buttons && p3.buttons.length === 2, p3);
await page.evaluate(() => document.querySelector('#modalBody .ph-msg[data-id="askEric"] .ph-ask button[data-yes="1"]').click());
const p4 = await page.evaluate(() => ({ ask: document.querySelector('#modalBody .ph-msg[data-id="askEric"] .ph-ask').textContent, crew: crewMembers(), open: crewAskOpen('eric') }));
check('YES: Eric is in your crew, and his text says so', p4.crew.join() === 'eric' && !p4.open && p4.ask === 'Eric is in your crew', p4);
await page.evaluate(() => { document.getElementById('modalCloseBtn').click(); openPhone(); });
const p5 = await ph();
check('reopened, no buttons: "Eric is in your crew"', !p5.buttons.length && p5.ask === 'Eric is in your crew', p5);
await page.evaluate(() => document.getElementById('modalCloseBtn').click());

// Saved and loaded; an old save with no crew loads with nobody in it
const sv = await page.evaluate(() => {
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = crewMembers();
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY)); delete raw.persist.crew; localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
  Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r2 = loadGame();
  const old = { ok: r2.ok, crew: crewMembers(), open: CREW_ROSTER.filter(crewAskOpen) };
  Game.persist.crew = ['eric'];
  return { ok: r.ok, kept, old };
});
check('a save and load keeps Eric in', sv.ok && sv.kept.join() === 'eric', sv);
check('an old save (no crew in it) loads with nobody in, and Eric\'s ask open', sv.old.ok && sv.old.crew.length === 0 && sv.old.open.join() === 'eric', sv.old);

// The whole summer: each ask opens at its moment; say yes to all, five in, nobody else can join
const all = await page.evaluate(() => {
  const opened = [];
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) {
    Game.persist.completed[id] = true;
    for (const k of CREW_ROSTER) if (crewAskOpen(k)) { opened.push(k + '@' + id); crewTakeIn(k); }
  }
  const extra = crewTakeIn('seth') || crewTakeIn('garrett') || crewTakeIn('rebecca');
  Game.persist.crew = Game.persist.crew.concat('trey');   // a tampered save
  openMirror();
  const row = document.querySelector('#mirrorOptions .mirror-row[data-key="crewMembers"]').textContent.replace(/\s+/g, ' ').trim();
  closeMirror();
  return { opened, crew: crewMembers(), extra, row };
});
check('the asks open at Sean and Nick (You and Nick, v1.408), Alex (Stoneglen\'s hold), Diego (Bellfield\'s flags)',
  all.opened.join() === 'sean@bunratty_team_2v1,nick@bunratty_team_2v1,alex@stoneglen_hold_treehouse,diego@bellfield_ctf', all.opened);
check('five in, in the order they joined; Seth, Garrett or anybody else can\'t join, even from a tampered save',
  all.crew.join() === 'eric,sean,nick,alex,diego' && !all.extra, all);
check('the mirror: "In it · 5 of 5: Eric · Sean · Nick · Alex · Diego"', /In it · 5 of 5/.test(all.row) && /Eric · Sean · Nick · Alex · Diego/.test(all.row), all.row);

// Step 1 changes no match: with all five in, a team match fields its own allies, at its own count
await g.scenario('winnmark_team_3v3');
await g.spin(5);
const m = await page.evaluate(() => ({ mode: Game.mode,
  ours: Game.scenario.enemies.filter(e => e.team === 'player').map(e => e.charId).sort(),
  want: CREW_ROSTER.slice().sort(), seth: (Game.scenario.enemies.find(e => e.charId === 'seth') || {}).team }));
// v1.274 (D.28 step 2): the crew takes the field. v1.275 (step 3): with the whole ladder done, Lights Out is too, so on
// this replay Seth plays for the other side (tests/crew-balance)
check('a full crew plays Squad Up as your five, with Seth on the other side', m.mode === 'scenario' && m.ours.join() === m.want.join() && m.seth !== 'player', m);
// v1.297 (D.53, Michael: A): the win that brings an ask puts a New teammate card on the result screen, the kid in 3D
await page.evaluate(() => {
  Game.persist.crew = []; Game.persist.textsRead = {};
  for (const t of SUMMER_TEXTS) if (t.ask) delete Game.persist.completed[t.after];
});
const winNow = () => page.evaluate(() => { for (const e of Game.scenario.enemies) if (e.team !== 'player') e.health = 0; endScenario('win'); });
const card = () => page.evaluate(() => {
  const el = document.getElementById('resultTeammate'), r = el.getBoundingClientRect();
  const cv = el.querySelector('canvas');
  let inked = 0;
  if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0xf3) + Math.abs(d[i + 1] - 0xee) + Math.abs(d[i + 2] - 0xdd) > 60) inked++; }
  const btns = [...el.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent, inside: q.bottom <= r.bottom + 0.5 && q.top >= r.top }; });
  return { on: el.classList.contains('on') && el.offsetHeight > 0, h: el.offsetHeight,
    head: (el.querySelector('.rt-head') || {}).textContent, name: (el.querySelector('.rt-name') || {}).textContent,
    done: (el.querySelector('.rt-done') || {}).textContent, intro: (el.querySelector('.rt-intro') || {}).textContent,
    inked, btns, textInside: [...el.querySelectorAll('.rt-text > div')].every(d => d.getBoundingClientRect().bottom <= r.bottom + 0.5) };
});
const answer = yes => page.evaluate(yes => document.querySelector(`#resultTeammate button[data-yes="${yes ? 1 : 0}"]`).click(), yes);
await g.scenario('winnmark_night_team_2v2');
await g.spin(3);
await winNow(); await g.spin(3);
await page.evaluate(() => document.fonts.ready);
const c1 = await card();
await g.shot('crew-teammate-card');
check('Winnmark\'s last win: a New teammate card for Eric, his gun, his lines, YES / NOT YET',
  c1.on && c1.head === 'NEW TEAMMATE!' && /^ERIC wants in your crew/.test(c1.name) && /MP5/.test(c1.name) && c1.intro.length > 60 && c1.btns.length === 2, c1);
check('the card draws Eric in 3D (over 1500 pixels of him on its canvas)', c1.inked > 1500, c1.inked);
check('the card is 8 rules tall and everything on it fits inside', c1.h === 8 * 26 && c1.btns.every(b => b.inside) && c1.textInside, c1);
await answer(true);
const a1 = await page.evaluate(() => ({ crew: crewMembers(), read: !!Game.persist.textsRead.askEric, done: document.querySelector('#resultTeammate .rt-done').textContent,
  btns: document.querySelectorAll('#resultTeammate button').length, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).persist.crew }));
check('YES: Eric is in (saved), his text is read, the card says so', a1.crew.join() === 'eric' && a1.read && a1.done === 'Eric is in your crew.' && !a1.btns && (a1.saved || []).join() === 'eric', a1);
// the same match won again brings no card
await page.evaluate(() => document.getElementById('navAgainBtn').click());
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000 });
await winNow(); await g.spin(3);
const c2 = await card();
check('winning it again: no card', !c2.on, c2);
// a loss brings none; the win of You and Nick brings Sean, then Nick (v1.408, D.57 step 4: was Bunratty's last)
await g.scenario('bunratty_team_2v1');
await g.spin(3);
await page.evaluate(() => endScenario('lose')); await g.spin(3);
const c3 = await card();
check('a loss of You and Nick: no card', !c3.on, c3);
await g.scenario('bunratty_team_2v1');
await g.spin(3);
await winNow(); await g.spin(3);
const c4 = await card();
check('You and Nick won: Sean first', c4.on && /^SEAN wants in/.test(c4.name) && /AK/.test(c4.name), c4);
await answer(false);
const c5 = await card();
check('NOT YET to Sean: Nick comes up next ("AND ANOTHER ONE!"), on 8 rules', c5.on && c5.head === 'AND ANOTHER ONE!' && /^NICK wants in/.test(c5.name) && c5.h === 208 && c5.btns.every(b => b.inside) && c5.textInside, c5);
await answer(true);
const a2 = await page.evaluate(() => ({ crew: crewMembers(), seanOpen: crewAskOpen('sean'), seanRead: !!Game.persist.textsRead.askSean,
  nickRead: !!Game.persist.textsRead.askNick, done: document.querySelector('#resultTeammate .rt-done').textContent, unread: summerUnreadCount() }));
check('YES to Nick: Eric and Nick in; Sean\'s ask still open on the phone, unread', a2.crew.join() === 'eric,nick' && a2.seanOpen && !a2.seanRead && a2.nickRead && a2.done === 'Nick is in your crew.', a2);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
