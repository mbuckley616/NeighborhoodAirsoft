// v1.189 (backlog D.15; decisions "After Bellfield's four", Michael: A): capture the flag, on Bellfield Court. One flag
// a side, ours by the entry and theirs on the head house's lawn at the top of the bulb; carry theirs to ours to score,
// first to two; a carrier tagged drops it, and its own side sends it home by touching it (or 20 s on the ground).
// Checked: the map card, the briefing and the chain; the flags as built; every rule, scripted (take, carry, score, drop,
// return, the timeout, the HUD, the win and the loss and their result lines); then played rounds with the player out of
// the fight (kids only), counting what the runners do.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const ID = 'bellfield_ctf';

// --- the card, the briefing and where it sits in Northcliff's chain
const card = await page.evaluate((ID) => {
  const b = getScenarioBriefing(ID), ids = PIN_SCENARIO_GROUPS.northcliff, done = Game.persist.completed;
  for (const id of ids.slice(0, ids.indexOf('bellfield_night_4v4'))) done[id] = true;
  done[zoneCapstoneId('market_lot')] = true;
  const before = isScenarioUnlocked(ID);
  done.bellfield_night_4v4 = true;
  const after = { flags: isScenarioUnlocked(ID), creek: isScenarioUnlocked('northcliff_defend_creek') };
  for (const k of Object.keys(done)) delete done[k];
  return { win: b.winConditionText, lives: [...b.allies, ...b.enemies].map(c => c.name + ':' + c.lives),
    card: renderScenarioCard(ID, 1, false).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    roster: renderBriefingRosterHTML(b).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    at: ids.indexOf(ID), night: ids.indexOf('bellfield_night_4v4'), creek: ids.indexOf('northcliff_defend_creek'), before, after };
}, ID);
console.log('   card:', JSON.stringify(card));
check('the objective says carry their flag home, first to 2', /flag/i.test(card.win) && /first to 2/.test(card.win), card.win);
check('the map card has a FLAGS badge and ♥ ∞', /⚑ FLAGS/.test(card.card) && /♥ ∞/.test(card.card), card.card);
check('every kid comes back (99 lives), and so do you', card.lives.every(x => x.endsWith(':99')) && /You .* comes back/.test(card.roster), [card.lives, card.roster]);
check('it sits after Lamplight on Bellfield and before the creek fort, opening only on the night match',
  card.at === card.night + 1 && card.creek === card.at + 1 && !card.before && card.after.flags && !card.after.creek, card);

// --- the flags as built
await g.scenario(ID);
const built = await page.evaluate(() => {
  const C = Game.scenario.ctf, p = Game.player.pos;
  return { mode: Game.mode, has: !!C, toWin: C && C.toWin,
    flags: C ? ['ours', 'theirs'].map(s => { const f = C.flags[s]; return { s, x: +f.base.x.toFixed(2), z: +f.base.z.toFixed(2), clear: !collidesObstacles(f.base.x, f.base.z, 0.4),
      inScene: f.mesh.parent === Game.scene && f.baseMesh.parent === Game.scene, fromPlayer: +Math.hypot(f.base.x - p.x, f.base.z - p.z).toFixed(1) }; }) : [],
    lanes: C ? C.lanes.map(l => [+l.x.toFixed(1), +l.z.toFixed(1), !collidesObstacles(l.x, l.z, 0.4)]) : [],
    runners: Game.scenario.enemies.filter(e => e.ctfRole === 'run').map(e => e.name + ':' + (e.team || 'enemy')),
    hud: document.getElementById('timerHud').style.display };
});
console.log('   built:', JSON.stringify(built));
check('enters as a capture-the-flag match, first to 2', built.mode === 'scenario' && built.has && built.toWin === 2, built);
check('two flags on clear ground in the match\'s scene: ours within 6 m of your start, theirs over 45 m off',
  built.flags.length === 2 && built.flags.every(f => f.clear && f.inScene) && built.flags[0].fromPlayer < 6 && built.flags[1].fromPlayer > 45, built.flags);
check('the backyard lanes are on clear ground', built.lanes.length === 2 && built.lanes.every(l => l[2]), built.lanes);
check('Andrew runs for their flag and Mason for ours', built.runners.join() === 'Andrew:player,Mason:enemy', built.runners);

// a look at their flag from the island, for Michael: tests/out/ctf-their-flag.png
await page.evaluate(() => { Game.player.pos.set(-13, 0, -3.5); Game.player.yaw = Math.PI / 2; Game.player.pitch = -0.08; });
await g.spin(2); await g.shot('ctf-their-flag');

// --- the rules, scripted: the kids are held where they are and updateFlags is stepped by itself
const rules = await page.evaluate(() => {
  const C = Game.scenario.ctf, P = Game.player, out = {};
  const hud = () => ({ label: document.getElementById('timerLabel').textContent, value: document.getElementById('timerValue').textContent, shown: document.getElementById('timerHud').style.display });
  const far = (k) => { k.pos.x = -30; k.pos.z = 24; };   // the back of the south-west yard, out of every rule's way
  for (const k of Game.scenario.enemies) far(k);
  const step = (n = 1) => { for (let i = 0; i < n; i++) { updateFlags(1 / 60); updateTimerHud(); } };
  const ours = C.flags.ours, theirs = C.flags.theirs;
  // walking onto their flag picks it up
  P.pos.set(theirs.base.x + 0.8, 0, theirs.base.z); step();
  out.take = { carrier: theirs.carrier === P, hud: hud() };
  // carried halfway, it rides on your back
  P.pos.set(5, 0, 0); step();
  out.carried = { flagAt: [+theirs.mesh.position.x.toFixed(1), +theirs.mesh.position.z.toFixed(1)], up: +theirs.mesh.position.y.toFixed(2) };
  // home: a score, and the flag back on its base
  P.pos.set(ours.base.x + 2, 0, ours.base.z); step();
  out.score = { score: { ...C.score }, back: theirs.carrier === null && !theirs.dropped && theirs.pos.x === theirs.base.x, hud: hud(), caps: C.caps.length };
  // tagged while carrying: you drop it where you stood and walk back in at your start
  P.pos.set(theirs.base.x, 0, theirs.base.z); step();
  P.pos.set(0, 0, 3);
  applyBBHit({ team: 'enemy', canDamage: true }, P);
  out.drop = { dropped: theirs.dropped && !theirs.carrier, at: [+theirs.pos.x.toFixed(1), +theirs.pos.z.toFixed(1)],
    youAt: [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1)], respawns: Game.scenario.playerRespawns, mode: Game.mode };
  step(); out.drop.hud = hud();
  // one of theirs touching it sends it home
  const mason = Game.scenario.enemies.find(e => e.name === 'Mason');
  mason.pos.x = theirs.pos.x + 0.5; mason.pos.z = theirs.pos.z; step();
  out.returned = { home: !theirs.dropped && theirs.pos.x === theirs.base.x, log: C.log.slice(-1)[0] };
  far(mason);
  // Mason takes ours; tagged, he drops it; 20 s on the ground and it goes home by itself
  P.pos.set(-30, 0, -24);
  mason.pos.x = ours.base.x; mason.pos.z = ours.base.z; step();
  out.theyTake = { carrier: ours.carrier === mason, hud: hud(), urgent: document.getElementById('timerHud').classList.contains('urgent') };
  mason.pos.x = 10; mason.pos.z = 20;
  eliminateEnemy(mason);
  out.theyDrop = { dropped: ours.dropped && !ours.carrier, at: [+ours.pos.x.toFixed(1), +ours.pos.z.toFixed(1)], masonState: mason.state };
  far(mason); mason.state = 'advancing';
  step(60 * 19); out.at19 = ours.dropped;
  step(60 * 2); out.at21 = { dropped: ours.dropped, home: ours.pos.x === ours.base.x, log: C.log.slice(-1)[0] };
  return out;
});
console.log('   rules:', JSON.stringify(rules));
check('walking onto their flag picks it up, and the HUD says to bring it home', rules.take.carrier && /BRING IT HOME/.test(rules.take.hud.label) && rules.take.hud.shown === 'block', rules.take);
check('the carried flag rides on your back', Math.hypot(rules.carried.flagAt[0] - 5, rules.carried.flagAt[1]) < 1 && rules.carried.up > 0.2, rules.carried);
check('carried to your base it scores 1-0 and goes back to theirs', rules.score.score.ours === 1 && rules.score.score.theirs === 0 && rules.score.back && rules.score.caps === 1 && /1\s*–\s*0/.test(rules.score.hud.value), rules.score);
check('tagged carrying it, you drop it where you were and come back at your start',
  rules.drop.dropped && Math.hypot(rules.drop.at[0], rules.drop.at[1] - 3) < 0.8 && Math.abs(rules.drop.youAt[0] - 34.5) < 0.1 && rules.drop.respawns === 1 && rules.drop.mode === 'scenario', rules.drop);
check('a kid of their side touching it sends it home', rules.returned.home && rules.returned.log && rules.returned.log.ev === 'return', rules.returned);
check('Mason taking ours shows on the HUD, in red', rules.theyTake.carrier && /MASON HAS OUR FLAG/.test(rules.theyTake.hud.label) && rules.theyTake.urgent, rules.theyTake);
check('tagged, he drops it where he was', rules.theyDrop.dropped && Math.hypot(rules.theyDrop.at[0] - 10, rules.theyDrop.at[1] - 20) < 0.8 && rules.theyDrop.masonState === 'retreating', rules.theyDrop);
check('a dropped flag left alone goes home after 20 s, not at 19', rules.at19 === true && !rules.at21.dropped && rules.at21.home && rules.at21.log.ev === 'timeout', rules.at21);

// --- the second flag wins; their second loses
const ending = async (side) => {
  await g.scenario(ID);
  await page.evaluate((side) => {
    const C = Game.scenario.ctf;
    for (const k of Game.scenario.enemies) { k.pos.x = -30; k.pos.z = 24; }
    const flag = C.flags[side === 'ours' ? 'theirs' : 'ours'], home = C.flags[side].base;
    const who = side === 'ours' ? Game.player : Game.scenario.enemies.find(e => e.name === 'Mason');
    for (let n = 0; n < 2; n++) {
      who.pos.x = flag.base.x; who.pos.z = flag.base.z; updateFlags(1 / 60);
      who.pos.x = home.x; who.pos.z = home.z; updateFlags(1 / 60);
    }
  }, side);
  await page.waitForFunction(() => Game.mode !== 'scenario', null, { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => ({ mode: Game.mode, score: Game.scenario.ctf && Game.scenario.ctf.score,
    outcome: document.getElementById('outcomeText') ? document.getElementById('outcomeText').textContent : '',
    flavor: document.getElementById('flavorText').textContent }));
};
const won = await ending('ours');
console.log('   won:', JSON.stringify(won));
check('your second flag home wins: FLAGS 2-0', won.mode === 'result' && /FLAGS 2–0/.test(won.outcome) && /red flag/.test(won.flavor), won);
const lost = await ending('theirs');
console.log('   lost:', JSON.stringify(lost));
check('their second flag home loses: THEY TOOK IT 2-0', lost.mode === 'result' && /THEY TOOK IT 2–0/.test(lost.outcome) && /blue flag/.test(lost.flavor), lost);

// --- played rounds, kids only: the player is out of the fight (tagged out and parked behind the south-east fence, which a
// capture-the-flag match never ends on) and the kids play it out. Stepped a second per evaluate.
const LIMIT = 150;
const rounds = [];
for (let r = 0; r < 2; r++) {
  await g.scenario(ID);
  await page.evaluate(() => {
    Game.player.pos.set(36, 0, 25); Game.player.hitsTaken = Game.player.maxHits;
    window._ctfW = { walked: {}, wedge: {}, last: {}, still: {} };
  });
  for (let s = 0; s < LIMIT; s++) {
    const mode = await page.evaluate(() => {
      const W = window._ctfW;
      for (let i = 0; i < 60 && Game.mode === 'scenario'; i++) {
        stepGame(1 / 60);
        for (const k of Game.scenario.enemies) {
          const l = W.last[k.name];
          if (l) { const d = Math.hypot(k.pos.x - l[0], k.pos.z - l[1]); if (d < 0.3) W.walked[k.name] = (W.walked[k.name] || 0) + d; }
          W.last[k.name] = [k.pos.x, k.pos.z];
          // a runner held on his flag run within 1 m for over 4 s is wedged
          if (k._flagRun) {
            const st = W.still[k.name];
            if (!st || Math.hypot(k.pos.x - st.x, k.pos.z - st.z) > 1) W.still[k.name] = { x: k.pos.x, z: k.pos.z, t: 0 };
            else { st.t += 1 / 60; W.wedge[k.name] = Math.max(W.wedge[k.name] || 0, +st.t.toFixed(1)); }
          } else W.still[k.name] = null;
        }
      }
      return Game.mode;
    });
    if (mode !== 'scenario') break;
  }
  const res = await page.evaluate(() => {
    const C = Game.scenario.ctf, W = window._ctfW;
    return { mode: Game.mode, t: +(Game.scenario.roundTime || 0).toFixed(0), score: C.score,
      takes: C.log.filter(x => x.ev === 'take').map(x => x.by + '@' + x.t), caps: C.caps.map(x => x.by + '@' + x.t),
      returns: C.log.filter(x => x.ev === 'return' || x.ev === 'timeout').map(x => (x.by || 'timeout') + '@' + x.t),
      lanes: C.log.filter(x => x.ev === 'lane').map(x => x.wp),
      tags: Game.scenario.enemies.map(e => e.name + ':' + (99 - e.lives)).join(' '),
      walked: Object.fromEntries(Object.entries(W.walked).map(([k, v]) => [k, Math.round(v)])), wedge: W.wedge };
  });
  rounds.push(res);
  console.log(`   round ${r + 1}, ${res.t} s: score ${res.score.ours}-${res.score.theirs} (${res.mode}); takes ${res.takes.join(' ') || '-'}; caps ${res.caps.join(' ') || '-'}; sent home ${res.returns.join(' ') || '-'}; ` +
    `lanes ${['street', 'north', 'south'].map(w => w + ' ' + res.lanes.filter(x => x === w).length).join(', ')}; tags taken ${res.tags}; walked ${JSON.stringify(res.walked)}; runner wedges ${JSON.stringify(res.wedge)}`);
  check(`round ${r + 1}: both runners walk over 150 m`, (res.walked.Andrew || 0) > 150 && (res.walked.Mason || 0) > 150, res.walked);
  check(`round ${r + 1}: no runner is held on his flag run within 1 m for over 4 s`, Object.values(res.wedge).every(t => t <= 4.1), res.wedge);
  check(`round ${r + 1}: the backyards and the street are both used`, res.lanes.includes('street') && res.lanes.some(x => x !== 'street'), res.lanes);
}
check('over the rounds a kid takes a flag at least once', rounds.some(r => r.takes.length > 0), rounds.map(r => r.takes));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
