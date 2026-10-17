// v1.256 (backlog D.32, Michael 14 Oct: more varied, circumstantial lines; more excited on a hit, more panic when
// pressed or a teammate is hit, more complaining "that's not fair because x" after a tag). Checked: a kid you tag gives
// an excuse that fits (from behind, far, point blank, on the move) at his band's rate; a teammate near him calls the tag
// with his name, after his own line; a kid under fire says so on a second near miss; the hit that puts you out is
// called louder (playerOut). Hits go through applyBBHit with a stand-in BB, so the lines come by the game's own path.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// --- 1. which excuse: by where you are, with the dice loaded
await g.scenario('winnmark_team_3v3');
const which = await page.evaluate(() => {
  const P = Game.player.pos, kid = Game.scenario.enemies.find(e => (e.team || 'enemy') !== 'player');
  const rnd = Math.random; Math.random = () => 0.01;
  const at = (dx, dz, yaw, state) => { kid.pos.x = P.x + dx; kid.pos.z = P.z + dz; kid.yaw = yaw; kid.state = state || 'hiding'; return npcHitCategory(kid); };
  // kid faces +z when yaw = 0 (sin yaw, cos yaw); the player at +z of him is in front
  const r = {
    front10: at(0, -10, 0), behind10: at(0, 10, 0), far40: at(0, -40, 0), close2: at(0, -2, 0),
    moving: at(0, -10, 0, 'advancing'),
  };
  Math.random = rnd;
  // the band rate: 3000 draws per band, player 10 m in front
  const rate = {};
  for (const band of ['high_agg', 'mid_agg', 'low_agg']) {
    const id = Object.keys(CHARACTERS).find(k => voiceBand(k) === band);
    const save = kid.charId; kid.charId = id; let n = 0;
    for (let i = 0; i < 3000; i++) { at(0, -10, 0); if (npcHitCategory(kid) !== 'npcHit') n++; }
    kid.charId = save; rate[band] = +(n / 3000).toFixed(3);
  }
  return { r, rate };
});
console.log('   situations:', JSON.stringify(which.r), ' excuse rate by band:', JSON.stringify(which.rate));
check('tagged from behind he says you shot him in the back', which.r.behind10 === 'excuse_behind');
check('from 40 m it was luck; from 2 m it was too close', which.r.far40 === 'excuse_far' && which.r.close2 === 'excuse_close');
check('in front at 10 m an excuse from the any pool; running, the moving pool', which.r.front10 === 'excuse_any' && which.r.moving === 'excuse_moving');
check('pushier kids make excuses more: about 60%, 40%, 15%',
  Math.abs(which.rate.high_agg - 0.6) < 0.04 && Math.abs(which.rate.mid_agg - 0.4) < 0.04 && Math.abs(which.rate.low_agg - 0.15) < 0.03, which.rate);

// --- 2. a real tag by you, with a teammate of his close by
const tag = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  Game.player.maxHits = 999; S.roundTime = 10; VOICE.log.length = 0; VOICE.globalCooldownUntil = 0;
  const foes = S.enemies.filter(e => (e.team || 'enemy') !== 'player');
  const [a, b] = foes;
  for (const e of S.enemies) if (e !== a && e !== b) { e.pos.x = P.x + 200; e.pos.z = P.z + 200; }
  a.pos.x = P.x; a.pos.z = P.z - 6; a.yaw = 0; a._voiceCooldownUntil = 0;
  b.pos.x = P.x + 3; b.pos.z = P.z - 7; b._voiceCooldownUntil = 0;
  const rnd = Math.random; Math.random = () => 0.01;   // he makes an excuse
  applyBBHit({ owner: 'player', team: 'player', pos: a.pos.clone(), spawnPos: P.clone(), vel: new THREE.Vector3(0, 0, -50), canDamage: true }, a);
  Math.random = rnd;
  return { a: a.name, b: b.name, log: VOICE.log.slice() };
});
for (let i = 0; i < 4; i++) await g.spin(60);
const tagLog = await page.evaluate(() => VOICE.log.slice());
console.log('   tag:', JSON.stringify(tagLog.map(l => [l.t, l.name, l.category, l.said])));
const first = tagLog[0], call = tagLog.find(l => l.category === 'allyDown');
check('the kid you tagged answers with an excuse', first && first.name === tag.a && /^excuse_/.test(first.category), first);
check(`a teammate (${tag.b}) calls it by name, after the tagged kid's own line`, call && call.name === tag.b && call.said.includes(tag.a) && call.t - first.t >= 1.5 - 0.02, call);
const pools = await page.evaluate(() => VOICE.log.every(l => voiceLinePools(l.charId, l.category).band.includes(l.line) || voiceLinePools(l.charId, l.category).own.includes(l.line)));
check('every line logged is from its pool', pools);

// --- 3. under fire: real BBs from you whizzing past a kid
const pressed = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  S.roundTime = 30; VOICE.log.length = 0; VOICE.globalCooldownUntil = 0;
  const k = S.enemies.find(e => (e.team || 'enemy') !== 'player' && e.health > 0 && e.state !== 'retreating');
  k.pos.x = P.x; k.pos.z = P.z - 8; k._voiceCooldownUntil = 0; k._pressedLineAt = null; k._pressHits = [];
  const rnd = Math.random; Math.random = () => 0.01;
  notePressed(k, 30.0); const one = VOICE.log.length;
  notePressed(k, 30.5); const two = VOICE.log.length;
  S.roundTime = 31; notePressed(k, 31); notePressed(k, 31.3); const gap = VOICE.log.length;   // inside 8 s: nothing more
  Math.random = rnd;
  return { name: k.name, one, two, gap, line: VOICE.log[0] };
});
check('one near miss says nothing; a second inside 3 s, he says he is under fire; not again inside 8 s',
  pressed.one === 0 && pressed.two === 1 && pressed.gap === 1 && pressed.line.category === 'pressed', pressed);
// and the near-miss check in updateBBs is what calls it
const live = await page.evaluate(() => ({ hooked: /notePressed\(e, now\)/.test(updateBBs.toString()) }));
check('updateBBs feeds the near misses to it', live.hooked);

// --- 4. the hit that puts you out
const out = await page.evaluate(() => {
  const S = Game.scenario, P = Game.player.pos;
  S.roundTime = 80; VOICE.log.length = 0; VOICE.globalCooldownUntil = 0;
  const k = S.enemies.find(e => (e.team || 'enemy') !== 'player' && e.health > 0 && e.state !== 'retreating');
  k.pos.x = P.x + 2; k.pos.z = P.z - 5; k._voiceCooldownUntil = 0;
  Game.player.maxHits = 3; Game.player.hitsTaken = 0; Game.player._graceT = 0;
  const bb = () => ({ owner: 'enemy', team: k.team || 'enemy', enemyRef: k, pos: new THREE.Vector3(P.x, P.y + 1.2, P.z), spawnPos: k.pos.clone(), vel: new THREE.Vector3(0, 0, 50), canDamage: true });
  applyBBHit(bb(), Game.player); const c1 = VOICE.log.at(-1)?.category;
  S.roundTime += 5; VOICE.globalCooldownUntil = 0; k._voiceCooldownUntil = 0; Game.player.hitsTaken = 2;
  applyBBHit(bb(), Game.player); const c2 = VOICE.log.at(-1)?.category;
  return { c1, c2, mode: Game.mode, line: VOICE.log.at(-1)?.said };
});
check('a hit that leaves you in is a playerHit line; the one that puts you out is playerOut', out.c1 === 'playerHit' && out.c2 === 'playerOut', out);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
