// v1.237 (backlog D.33, Michael 14 Oct): "Players that raise their arms and are 'out' should still be able to be shot,
// and if you shoot them, they should be mad and call you out for it." Before v1.237 your BBs passed through a kid who
// was out. Now a kid out with his hand up, or walking back to respawn, stops your BB and complains (a line from the
// new `shotWhileOut` pool, at most one a second); it changes nothing else: no tag, no life, the round goes on. A
// teammate's BBs still pass through him.
import { boot, check } from './lib/game.mjs';
let g = await boot(); let { page } = g;
await g.bedroom();

// every kid has something to say
const pool = await page.evaluate(() => {
  const missing = Object.keys(CHARACTERS).filter(id => !pickVoiceLine(id, 'shotWhileOut'));
  return { n: Object.keys(CHARACTERS).length, missing };
});
check('every kid has a shot-while-out line', pool.n > 5 && pool.missing.length === 0, pool);

// fire one BB straight at a kid's chest from 0.6 m off, as `owner` on `team`; step until it lands or 0.5 s pass
const install = () => page.evaluate(() => {
  window._said = [];
  const real = window.tryNpcSpeak;
  // v1.256: a teammate calling the tag (allyDown) is his own line, not the out kid's, and is left out of the record
  window.tryNpcSpeak = (e, cat, fill) => { if (cat !== 'allyDown') window._said.push([e.name, cat]); return real(e, cat, fill); };
  window._shootAt = (e, owner, team) => {
    const target = e.pos.clone(); target.y = (e.pos.y || 0) + 0.9;
    const dir = new THREE.Vector3(1, 0, 0);
    const bb = makeBB(target.clone().addScaledVector(dir, -0.6), dir.clone().multiplyScalar(40), owner, null, null, team);
    bb.curveStrength = 0;
    bb.spawnPos = target.clone().addScaledVector(dir, -10);
    Game.scenario.bbs.push(bb);
    for (let i = 0; i < 6 && Game.mode === 'scenario' && Game.scenario.bbs.includes(bb); i++) stepGame(1 / 60);
    // stopped at him: gone, and never more than a few cm past his middle
    return { gone: !Game.scenario.bbs.includes(bb), x: +(bb.pos.x - e.pos.x).toFixed(2) };
  };
});

// 1) Out with his hand up: a match with more than one kid against you, so the round goes on after the first tag
await g.scenario('winnmark_cul_de_sac');
await install();
await page.evaluate(() => { Game.player._graceT = 1e9; });
await g.spin(200);
const a = await page.evaluate(() => {
  const foes = Game.scenario.enemies.filter(e => e.team !== 'player');
  const kid = foes[0], team = combatantView(Game.player).team;
  const tag = _shootAt(kid, 'player', team);
  for (let i = 0; i < 30; i++) stepGame(1 / 60);   // his hand goes up
  const before = { health: kid.health, state: kid.state, tags: Game.scenario.stats.tags.length };
  window._said = [];
  const s1 = _shootAt(kid, 'player', team);
  const said1 = window._said.slice();
  const s2 = _shootAt(kid, 'player', team);   // straight after: hit, but no second line yet
  const said2 = window._said.slice();
  for (let i = 0; i < 75; i++) stepGame(1 / 60);
  const s3 = _shootAt(kid, 'player', team);   // 1.25 s later: another line
  const said3 = window._said.slice();
  const ally = _shootAt(kid, 'enemy-ally', 'player');   // a teammate's BB: no owner 'player'
  return { foes: foes.length, name: kid.name, tag, before, s1, s2, s3, ally, said1, said2, said3,
    after: { health: kid.health, tags: Game.scenario.stats.tags.length, outShots: Game.scenario.stats.outShots, mode: Game.mode,
      raise: +(kid._hitRaise || 0).toFixed(2) } };
});
console.log('   ' + JSON.stringify(a));
check('the match has more than one kid against you', a.foes >= 2, a.foes);
check('the first BB tags him out (hand up)', a.tag.gone && a.before.health <= 0 && a.after.raise > 0.9, { tag: a.tag, before: a.before, raise: a.after.raise });
check('a BB at the kid who is out stops at him', a.s1.gone && a.s1.x < 0.4 && a.s2.gone && a.s3.gone, [a.s1, a.s2, a.s3]);
check(`he calls you out (${a.name}, shotWhileOut)`, a.said1.length === 1 && a.said1[0][1] === 'shotWhileOut', a.said1);
check('a second BB the same moment: no second line', a.said2.length === 1, a.said2);
check('a second later he says it again', a.said3.length === 2 && a.said3[1][1] === 'shotWhileOut', a.said3);
check('it counts nothing: no tag, still out, the round goes on', a.after.tags === a.before.tags && a.after.health <= 0
  && a.after.mode === 'scenario' && a.after.outShots === 3, a.after);
check('a teammate\'s BB still passes through him', !a.ally.gone || a.ally.x > 0.4, a.ally);

// 2) Walking back: an attacker in a defend, out and on his way to respawn
check('no page errors (the first match)', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
g = await boot(); ({ page } = g);
await g.bedroom();
await g.scenario('winnmark_defend_treehouse');
await install();
await page.evaluate(() => { Game.player._graceT = 1e9; });
await g.spin(200);
const b = await page.evaluate(() => {
  const kid = Game.scenario.enemies.find(e => e.team !== 'player' && e.role === 'attacker' && e.health > 0);
  const team = combatantView(Game.player).team;
  const tag = _shootAt(kid, 'player', team);
  const state = kid.state;
  for (let i = 0; i < 20; i++) stepGame(1 / 60);
  window._said = [];
  const s = _shootAt(kid, 'player', team);
  return { name: kid?.name, tag, state, stateNow: kid.state, s, said: window._said.slice(), outShots: Game.scenario.stats.outShots };
});
console.log('   ' + JSON.stringify(b));
check('an attacker tagged in a defend walks back (retreating)', b.tag.gone && b.state === 'retreating' && b.stateNow === 'retreating', b);
check('a BB at him on his way back stops at him and he calls you out', b.s.gone && b.said.some(x => x[1] === 'shotWhileOut') && b.outShots === 1, b);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
