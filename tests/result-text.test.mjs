// v1.96 (Found in play, v1.86): the result screen's flavor line. Flavor quotes were doubled (""Ow!""), and the
// multi-kid lines had a stray comma, named the player's own allies, and used a plural verb for one name. Ends
// several scenarios every way and checks the sentence.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const IDS = ['bunratty_sean', 'winnmark_seth_house', 'bunratty_night_lane', 'bunratty_brothers', 'hollow_skirmish_3v3',
             'hollow_defend_south_fort', 'winnmark_defend_culdesac', 'bunratty_infection'];
const lines = [];
for (const id of IDS) {
  await g.scenario(id);
  const r = await page.evaluate(() => {
    const pTeam = combatantTeam(Game.player);
    const allies = Game.scenario.enemies.filter(e => e.team === 'player' || (e.team || 'enemy') === pTeam).map(e => e.name);
    const out = [];
    for (const [o, timer] of [['win', false], ['win', true], ['lose', false], ['forfeit', false]]) {
      Game.mode = 'scenario'; Game.scenario.winByTimer = timer;
      endScenario(o);
      out.push({ o: o + (timer ? '/timer' : ''), text: document.getElementById('flavorText').textContent });
    }
    return { allies, out };
  });
  for (const x of r.out) lines.push({ id, ...x, allies: r.allies });
  await page.evaluate(() => enterBedroom()); await g.spin(5);
}
for (const l of lines) console.log(`  ${l.id} ${l.o}: ${l.text}`);
const bad = (re) => lines.filter(l => re.test(l.text)).map(l => `${l.id} ${l.o}: ${l.text}`);
check('no doubled quotes', bad(/""|“"|"”/).length === 0, bad(/""|“"|"”/));
check('no comma right before the verb (", regroup", "Ryan, Mitchell, regroup")', bad(/,\s+(regroup|take|come|start|starts|drop|sit)\b/).length === 0 && bad(/\b\w+, \w+, (regroup|take)/).length === 0, bad(/,\s+(regroup|take|come|start|starts|drop|sit)\b/));
check('no "X and Y, Z" list (a name list joined twice)', bad(/\b[A-Z]\w+ and [A-Z]\w+, [A-Z]/).length === 0, bad(/\b[A-Z]\w+ and [A-Z]\w+, [A-Z]/));
const allyNamed = lines.filter(l => l.allies.some(a => new RegExp('\\b' + a + '\\b').test(l.text)));
check("the player's allies aren't named as the other side", allyNamed.length === 0, allyNamed.map(l => `${l.id} ${l.o}: ${l.text} [allies ${l.allies}]`));
check('one name never takes "come walking out"', bad(/^The last one's out\. [A-Z]\w+ come\b/).length === 0, bad(/^The last one's out\. [A-Z]\w+ come\b/));
// An intermittent "Failed to execute 'connect' on 'AudioNode'" showed up once in three runs of this suite
// (12 at once, never in the other suites). It's filed in the backlog (Found in play, v1.96) and reported
// here, not failed on, until it's run down; any other page error fails.
const audio = g.errs.filter(e => /connect' on 'AudioNode'/.test(e));
if (audio.length) console.log(`  note: ${audio.length} AudioNode connect errors (backlog, Found in play v1.96)`);
check('no other page errors', g.errs.length === audio.length, g.errs.filter(e => !audio.includes(e)));
await g.close();
