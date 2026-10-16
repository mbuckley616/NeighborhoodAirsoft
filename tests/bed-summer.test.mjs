// v1.231 (D.29, Michael: A on "What does the bed do, now the game saves itself?"): the bed shows the summer so far:
// the save summary as before, plus today's date, the score against Seth's crew and the next match on the ladder.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(5);

const bed = await page.evaluate(() => { const it = Game.interactables.find(i => i.type === 'bed'); return it && { prompt: it.prompt, label: it.label }; });
check('the bed asks how the summer is going', bed && bed.prompt === 'Sleep (how’s the summer going?)', bed);

const open = () => page.evaluate(() => {
  Game.interactables.find(i => i.type === 'bed').action();
  const r = {
    mode: Game.mode, title: document.getElementById('modalTitle').textContent,
    text: document.getElementById('modalBody').innerText,
    open: document.getElementById('modalScreen').classList.contains('active'),
    saved: (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)).cash; } catch (e) { return null; } })(),
    del: !!document.getElementById('saveDeleteBtn'),
  };
  closeModal();
  return r;
});

// A new game: Sunday 1 June, Seth's crew 0 beaten, the first Winnmark match next
const first = await page.evaluate(() => ({ id: PIN_SCENARIO_GROUPS.winnmark_court[0], total: rivalScore().total,
  name: SCENARIOS[PIN_SCENARIO_GROUPS.winnmark_court[0]].scenarioName }));
const a = await open();
check('the bed opens the summer so far', a.open && a.mode === 'modal' && a.title === 'The summer so far', a.title);
check('a new game: today is Sunday 1 June 2003, in Winnmark', /Today\s*Sunday 1 June 2003/.test(a.text) && /Where\s*Winnmark/.test(a.text), a.text);
check(`Seth's crew: 0 of ${first.total} beaten`, new RegExp(`Seth's crew\\s*0 of ${first.total} beaten`).test(a.text), a.text);
check('next is the first Winnmark match', a.text.includes('Next') && a.text.includes(first.name), { want: first.name });
check('the save summary is still there (cash, guns, cleared) and the bed still saves', /Cash\s*\$/.test(a.text) && /Scenarios cleared\s*0/.test(a.text) && a.saved !== null && a.del, a);
const back = await page.evaluate(() => Game.mode);
check('OK goes back to the bedroom', back === 'bedroom', back);

// Mid-summer: Winnmark and Bunratty won, half the Hollow: Sunday 20 July, the Hollow, its seventh match next
const mid = await page.evaluate(() => {
  Game.persist.completed = {};
  for (const k of ['winnmark_court', 'bunratty_court']) for (const id of PIN_SCENARIO_GROUPS[k]) Game.persist.completed[id] = true;
  PIN_SCENARIO_GROUPS.hollow.slice(0, 6).forEach(id => Game.persist.completed[id] = true);
  const nid = PIN_SCENARIO_GROUPS.hollow[6];
  return { next: SCENARIOS[nid].scenarioName || SCENARIOS[nid].name, nextId: nextLadderMatchId(), want: nid, s: rivalScore() };
});
const b = await open();
check('mid-summer: Sunday 20 July, in the Hollow', /Today\s*Sunday 20 July 2003/.test(b.text) && /Where\s*The Hollow/.test(b.text), b.text);
check('the next match is the Hollow\'s seventh', mid.nextId === mid.want && b.text.includes(mid.next), mid);
check(`the score counts the rival matches won (${mid.s.beaten} of ${mid.s.total})`, mid.s.beaten > 0 && b.text.includes(`${mid.s.beaten} of ${mid.s.total} beaten`), mid.s);

// Everything but the last Saturday: it is next; then won, the summer is
const end = await page.evaluate(() => {
  for (const z of ZONE_LADDER) for (const id of PIN_SCENARIO_GROUPS[z.key]) if (id !== SUMMER_FINALE) Game.persist.completed[id] = true;
  return nextLadderMatchId();
});
const c = await open();
check('with the rest won, the last Saturday is next', end === 'last_saturday' && c.text.includes('The Last Saturday'), { end, text: c.text });
await page.evaluate(() => { Game.persist.completed.last_saturday = true; });
const d = await open();
check('the last Saturday won: Saturday 30 August, Bunratty Court, nothing left', /Today\s*Saturday 30 August 2003/.test(d.text) && /Where\s*Bunratty Court/.test(d.text) && d.text.includes('the summer is won'), d.text);
check('every rival match beaten by then', (() => { const m = d.text.match(/(\d+) of (\d+) beaten/); return m && m[1] === m[2]; })(), d.text);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
