// v1.182 (critic, 9 Oct): four team briefings promised everyone lives or respawns ("everyone's got five lives",
// "both teams respawning") while the player has one life in each (`playerLives: 1`). Checked over every scenario:
// a one-life briefing never says everyone gets lives or respawns, and any "N lives for every kid but you" names the
// lives the kids really get (`setupEntryLives`). The four fixed matches are opened to read their intro cards.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const scan = await page.evaluate(() => {
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const promises = [], wrongCount = [];
  let read = 0;
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    if (!sc.desc) continue;
    read++;
    const one = (sc.playerLives ?? 1) === 1;
    if (one && /everyone(?:'s| has)? got \w+ lives|everyone respawn|both teams respawn|everyone(?:'s| is)? respawning/i.test(sc.desc)) promises.push(id);
    const m = sc.desc.match(/\b(\w+) lives for every kid but you/i);
    if (m) {
      const n = words[m[1].toLowerCase()] ?? Number(m[1]);
      const kids = (sc.enemySetup || []).filter(e => typeof e.lives !== 'number').map(e => setupEntryLives(sc, e));
      if (!kids.length || kids.some(k => k !== n)) wrongCount.push({ id, said: n, kids });
    }
  }
  return { read, promises, wrongCount };
});
console.log('   briefings read:', scan.read, 'promising lives to everyone:', JSON.stringify(scan.promises),
  'wrong count:', JSON.stringify(scan.wrongCount));
check('no one-life briefing promises everyone lives or respawns', scan.promises.length === 0, scan.promises);
check('every "N lives for every kid but you" names the kids\' real lives', scan.wrongCount.length === 0, scan.wrongCount);

for (const [id, lives] of [['hollow_2v4_night', 5], ['hollow_skirmish_3v3', 5], ['bunratty_night_team_2v2', 3], ['winnmark_night_team_2v2', 3]]) {
  await g.scenario(id);
  const card = await page.evaluate(id => ({ desc: document.getElementById('introDesc').textContent, playerLives: SCENARIOS[id].playerLives }), id);
  check(`${id} gives the player one life`, card.playerLives === 1, card.playerLives);
  const word = ['', 'one', 'two', 'three', 'four', 'five'][lives];
  console.log(`   ${id}: ${card.desc.slice(0, 140)}…`);
  check(`${id}'s card says ${word} lives for every kid but you`, new RegExp(`${word} lives for every kid but you`, 'i').test(card.desc), card.desc);
  check(`${id}'s card no longer promises everyone respawns`, !/everyone(?:'s got| respawn)|both teams respawn/i.test(card.desc), card.desc);
}

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
