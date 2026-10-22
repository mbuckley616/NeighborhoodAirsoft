// v1.193 (D.17 "A better game" 5, Michael: C — step 2): the result screen counts your tags, shots and the hits on
// you, gives the match's time and one best moment, and says what the match opened (the next match) and what its pay
// put in reach at the shop.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// Seth's House with only the tutorial done, and $1 short of the Spring Shotgun
const setup = await page.evaluate(() => {
  Game.persist.completed = { winnmark_tutorial: true };
  Game.persist.cash = GUN_MAGS.shotgun.price - 1;
  return { cash: Game.persist.cash, nextOpen: scenarioUnlockedForResult('winnmark_seth_shotgun_duel'),
    nextName: SCENARIOS.winnmark_seth_shotgun_duel.scenarioName };
});
check('the next match starts locked', setup.nextOpen === false, setup);
await g.scenario('winnmark_seth_house');
await page.evaluate(() => { Game.player._graceT = 1e9; });   // untaggable while we stage it
await g.spin(200);   // past the opening hold
const mid = await page.evaluate(() => {
  // two trigger pulls into the air, then one BB that reaches Seth, fired from 20 m back
  Game.player.pitch = 1.2;
  Game.gun.ammo = Math.max(Game.gun.ammo, 4);
  fireBB(); fireBB();
  const seth = Game.scenario.enemies.find(e => e.team !== 'player');
  const target = seth.pos.clone(); target.y += 1.0;
  const dir = new THREE.Vector3(1, 0, 0);
  const start = target.clone().addScaledVector(dir, -0.6);
  const bb = makeBB(start, dir.clone().multiplyScalar(40), 'player', null, null, combatantView(Game.player).team);
  bb.curveStrength = 0;
  bb.spawnPos = target.clone().addScaledVector(dir, -20);
  Game.scenario.bbs.push(bb);
  for (let i = 0; i < 30 && Game.mode === 'scenario'; i++) stepGame(1 / 60);
  Game.player._graceT = 0;
  return { stats: JSON.parse(JSON.stringify(Game.scenario.stats)), sethHealth: seth.health, name: seth.name };
});
check('two trigger pulls count as two shots', mid.stats.shots === 2, mid.stats);
check('the BB tags Seth and is counted from 20 m', mid.stats.tags.length === 1 && Math.abs(mid.stats.tags[0].dist - 20) < 0.7, mid.stats);
await page.waitForFunction(() => Game.mode === 'result', null, { timeout: 10000 });
const res = await page.evaluate(() => ({ r: Game.scenario.lastResult, outcome: document.getElementById('outcomeText').textContent,
  text: document.getElementById('resultStats').innerText, cells: document.querySelectorAll('#resultStats .rs-cell').length }));
check('the round is won', /GOT/.test(res.outcome), res.outcome);
check('four numbers: 1 tag, 2 shots, 0 hits on you, the time', res.cells === 4 && res.r.tags === 1 && res.r.shots === 2 && res.r.hitOnYou === 0, res.r);
check('the time is the match time (about 3.8 s → 0:04)', /0:0[34]/.test(res.text) && res.r.time > 3 && res.r.time < 5, { t: res.r.time, text: res.text });
check(`best moment: the 20 m tag on ${mid.name}`, res.r.best === `A 20 m tag on ${mid.name}.`, res.r.best);
check('OPENED names the next match', res.r.opened.length === 1 && res.r.opened[0] === setup.nextName, res.r.opened);
check('IN REACH names the Spring Shotgun', res.r.reach.length === 1 && /Spring Shotgun \(\$60\)/.test(res.r.reach[0]), res.r.reach);
check('the card shows all of it', /BEST/.test(res.text) && /OPENED/.test(res.text) && /IN REACH/.test(res.text), res.text);
await g.shot('result-stats-win');

// A replay of a match already won opens nothing new, and a loss with no tags shows no best moment
await page.evaluate(() => { document.getElementById('navAgainBtn').click(); });
await page.waitForFunction(() => { const b = document.getElementById('introBeginBtn'); return b && b.offsetParent !== null; }, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('introBeginBtn').click());
await page.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 30000 });
const lose = await page.evaluate(() => {
  const s0 = JSON.parse(JSON.stringify(Game.scenario.stats));
  Game.player._graceT = 0;
  Game.persist.cash = 0;
  applyBBHit({ enemyRef: null }, Game.player);
  for (let i = 0; i < 5 && Game.mode === 'scenario'; i++) applyBBHit({ enemyRef: null }, Game.player);
  return { s0, mode: Game.mode, r: Game.scenario.lastResult, text: document.getElementById('resultStats').innerText };
});
check('a new round starts its count at zero', lose.s0.shots === 0 && lose.s0.tags.length === 0 && lose.s0.hitOnYou === 0, lose.s0);
check('the loss counts the hits on you', lose.mode === 'result' && lose.r.hitOnYou >= 1 && lose.r.tags === 0, lose.r);
check('nothing opened, no best moment', lose.r.opened.length === 0 && lose.r.best === '' && !/BEST|OPENED/.test(lose.text), lose);

// The best-moment rules: a quick double beats a long tag; an untouched win; the first tag otherwise; time format
const rules = await page.evaluate(() => ({
  dbl: matchBestMoment({ tags: [{ name: 'Sean', dist: 30, t: 10 }, { name: 'Nick', dist: 8, t: 11.6 }], hitOnYou: 1 }, 'win'),
  slow: matchBestMoment({ tags: [{ name: 'Sean', dist: 30, t: 10 }, { name: 'Nick', dist: 8, t: 14 }], hitOnYou: 1 }, 'win'),
  clean: matchBestMoment({ tags: [{ name: 'Sean', dist: 6, t: 10 }], hitOnYou: 0 }, 'win'),
  first: matchBestMoment({ tags: [{ name: 'Sean', dist: 6.4, t: 10 }], hitOnYou: 2 }, 'lose'),
  sameKid: matchBestMoment({ tags: [{ name: 'Sean', dist: 6, t: 10 }, { name: 'Sean', dist: 6, t: 11 }], hitOnYou: 2 }, 'lose'),
  time: [fmtMatchTime(0), fmtMatchTime(59.6), fmtMatchTime(125)],
}));
check('two tags inside 3 s is the best moment', rules.dbl === 'Two in 1.6 s: Sean, then Nick.', rules.dbl);
check('otherwise a tag from 15 m or more', rules.slow === 'A 30 m tag on Sean.', rules.slow);
check('a win with no hits on you', rules.clean === 'Not a mark on you.', rules.clean);
check('else the first tag', rules.first === 'Your first tag: Sean, from 6 m.', rules.first);
check('the same kid twice is not a double', rules.sameKid === 'Your first tag: Sean, from 6 m.', rules.sameKid);
check('time reads 0:00, 1:00, 2:05', rules.time.join(' ') === '0:00 1:00 2:05', rules.time);

// v1.320 (backlog D.59, Michael 22 Oct: "an extra $0.50 per hit"): each hit you land on a kid of the other side pays
// 50¢ on top of the match's pay, won or lost; cash is whole dollars, so $1 for every two hits. Hits on your own side,
// a forfeit, the tutorial and a Pickup Game pay none. Aisle Wars (win $7, lose $2): five hits on their kids and one on each of yours.
await g.scenario('lot_team_3v3');
const bonus = await page.evaluate(() => {
  Game.player._graceT = 1e9; Game.persist.cash = 0;
  const E = Game.scenario.enemies, foes = E.filter(e => e.team !== 'player'), mates = E.filter(e => e.team === 'player');
  const shot = (c) => { c._graceT = 0; applyBBHit({ owner: 'player', pos: c.pos.clone(), spawnPos: c.pos.clone().add(new THREE.Vector3(10, 0, 0)) }, c); };
  // a tagged kid is back in the game at once, so the five hits can land on three kids
  for (let i = 0; i < 5; i++) { const c = foes[i % foes.length]; c.health = c.maxHealth; c.state = 'advancing'; shot(c); }
  for (const m of mates) shot(m);
  const tags = Game.scenario.stats.tags.map(t => t.foe);
  endScenario('win');
  return { tags, mates: mates.length, cash: Game.persist.cash, hb: Game.scenario.lastResult.hitBonus, reward: document.getElementById('rewardText').innerText };
});
console.log('  hit bonus', JSON.stringify(bonus));
check('five hits on their side and one on each of yours: the tags know which', bonus.tags.filter(f => f).length === 5 && bonus.mates >= 2 && bonus.tags.filter(f => !f).length === bonus.mates, bonus);
check('a win with five hits pays $7 and a $2 hit bonus (the fifth 50¢ dropped)', bonus.cash === 9 && bonus.hb.base === 7 && bonus.hb.cash === 2 && bonus.hb.hits === 5, bonus);
check('the card says so', /\+\$9/.test(bonus.reward) && /\$7 \+ \$2 hit bonus \(5 hits\)/.test(bonus.reward), bonus.reward);
const noBonus = await page.evaluate(() => {
  const st = Game.scenario.stats; st.tags = Array.from({ length: 6 }, () => ({ name: 'Tyler', dist: 10, t: 1, foe: true }));
  const lost = matchHitBonus('lose').cash, forfeit = matchHitBonus('forfeit').cash;
  const def = SCENARIOS[Game.scenario.active]; def.pickup = true; const pickup = matchHitBonus('win').cash; delete def.pickup;
  return { lost, forfeit, pickup };
});
check('six hits pay $3 in a loss too, nothing in a forfeit or a Pickup Game', noBonus.lost === 3 && noBonus.forfeit === 0 && noBonus.pickup === 0, noBonus);
const card = await page.evaluate(() => renderScenarioCard('lot_team_3v3', 2, false));
const tut = await page.evaluate(() => renderScenarioCard('winnmark_tutorial', 1, true));
check('the map card tells you: +50¢ A HIT (not on the tutorial\'s)', /WIN \+\$7 · LOSE \+\$2 · \+50¢ A HIT/.test(card) && !/A HIT/.test(tut), card.slice(0, 600));

// v1.321 (backlog D.60, Michael 22 Oct: "hit markers ... to confirm you were the one to hit someone"): your BB that tags
// a kid of the other side puts an X round the middle of the screen for 0.3 s, red when he is out for good. A teammate,
// a kid already out or a kid in his 3 s grace gives none. Aisle Wars again, with a real BB flown into each kid.
await g.scenario('lot_team_3v3');
await page.evaluate(() => { Game.player._graceT = 1e9; });
await g.spin(200);   // past the opening hold
const marker = await page.evaluate(() => {
  const E = Game.scenario.enemies, foe = E.find(e => e.team !== 'player'), mate = E.find(e => e.team === 'player');
  const el = document.getElementById('hitMarker');
  const fly = (c) => {
    const target = c.pos.clone(); target.y += 1.0;
    const dir = new THREE.Vector3(1, 0, 0), bb = makeBB(target.clone().addScaledVector(dir, -0.6), dir.clone().multiplyScalar(40), 'player', null, null, combatantView(Game.player).team);
    bb.curveStrength = 0; Game.scenario.bbs.push(bb);
    for (let i = 0; i < 2; i++) stepGame(1 / 60);
  };
  const look = () => ({ n: Game.hitMarkers, op: +getComputedStyle(el).opacity, red: el.classList.contains('out') });
  const before = look();
  fly(foe); const hit = look();
  for (let i = 0; i < 20; i++) stepGame(1 / 60);
  const after = look();
  fly(foe); const whileOut = look();   // he is walking back, out
  for (let i = 0; i < 20; i++) stepGame(1 / 60);
  mate._graceT = 0; fly(mate); const onMate = look();
  // his last life: the tag puts him out for good, and the X is red
  foe.state = 'advancing'; foe.health = foe.maxHealth; foe.lives = 1; foe._graceT = 0;
  fly(foe); const last = look();
  return { before, hit, after, whileOut, onMate, last, lives: foe.lives, mode: Game.mode };
});
console.log('  hit marker', JSON.stringify(marker));
check('no marker before a hit', marker.before.n === 0 && marker.before.op === 0, marker.before);
check('a tag on their kid shows a white X', marker.hit.n === 1 && marker.hit.op > 0.9 && !marker.hit.red, marker.hit);
check('it is gone a third of a second later', marker.after.op === 0, marker.after);
check('none for a kid already out, or for your own teammate', marker.whileOut.n === 1 && marker.onMate.n === 1 && marker.onMate.op === 0, marker);
check('the tag on his last life shows a red X', marker.last.n === 2 && marker.last.red && marker.last.op > 0.9 && marker.lives === 0, marker.last);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
