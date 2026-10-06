// v1.170 (backlog D.15, Michael: A): VIP. Each side guards one kid in a cap (one life, a pistol, holding his spot);
// everyone else, the player included, comes back when tagged. Tag their VIP to win; lose yours and you lose.
// Two matches: Protect Ryan (Bunratty, day) and Night Shift (the market lot, night). Checked: the map card and the
// briefing, the kids as built (lives, guns, caps), the player's respawn and its grace, how each ending fires, and
// played rounds with the player untaggable at his start (how long each VIP lasts, who wins, no page error).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const MATCHES = { bunratty_vip: { ours: 'Ryan', theirs: 'Priya' }, lot_vip_night: { ours: 'Rebecca', theirs: 'Seth' } };

// --- the map card and the briefing
const card = await page.evaluate((ids) => ids.map(id => {
  const b = getScenarioBriefing(id);
  return { id, win: b.winConditionText, allies: b.allies.map(c => c.name + (c.vip ? '*' : '') + ':' + c.lives), enemies: b.enemies.map(c => c.name + (c.vip ? '*' : '') + ':' + c.lives),
    card: renderScenarioCard(id, 1, false).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    roster: renderBriefingRosterHTML(b).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), listed: !!findScenarioListContext(id) };
}), Object.keys(MATCHES)).catch(e => ({ err: String(e) }));
console.log('   briefing:', JSON.stringify(card));
for (const c of card) {
  const m = MATCHES[c.id];
  check(`${c.id}: in its zone's list; the objective names the VIP`, c.listed && /VIP/.test(c.win), c.win);
  check(`${c.id}: ${m.ours} and ${m.theirs} are the VIPs with one life, the rest come back`,
    c.allies.includes(m.ours + '*:1') && c.enemies.includes(m.theirs + '*:1') && [...c.allies, ...c.enemies].filter(x => !x.includes('*')).every(x => x.endsWith(':99')), [c.allies, c.enemies]);
  check(`${c.id}: the map card has a VIP badge and ♥ ∞`, /★ VIP/.test(c.card) && /♥ ∞/.test(c.card), c.card);
  check(`${c.id}: the briefing marks the VIPs and says the rest come back`, (c.roster.match(/★ VIP/g) || []).length === 2 && /You .* comes back/.test(c.roster), c.roster);
}

// --- in a match: the kids as built
const built = async (id) => {
  await g.scenario(id);
  return page.evaluate(() => {
    updateRosterHud();
    const ks = Game.scenario.enemies.map(e => ({ n: e.name, team: e.team || 'enemy', vip: !!e.vip, lives: e.lives, w: e.weapon, role: e.role,
      cap: e.mesh.vipCap ? e.mesh.vipCap.userData.vipCap : null,
      capOnHead: !!(e.mesh.vipCap && e.mesh.vipCap.parent === e.mesh.head) }));
    const roster = document.getElementById('rosterList').textContent.replace(/\s+/g, ' ').trim();
    return { ks, roster, vip: Game.scenario.vip, mode: Game.mode };
  });
};
// --- played rounds: the player can't be tagged and stands at his start; how long does each VIP last? Stepped a second
// per evaluate (a whole round in one evaluate runs past the page's patience on a loaded machine: about 2.5 s a second here).
// Played on from the entry above, LIMIT game seconds, so the suite fits run.mjs's 10 minutes.
const LIMIT = 40;
const played = [];
async function play(id) {
  await page.evaluate(() => { Game.player.maxHits = 1e9; window._vipT = { ours: null, theirs: null, f: 0 }; });
  for (let s = 0; s < LIMIT; s++) {
    const mode = await page.evaluate(() => {
      const T = window._vipT, vips = Game.scenario.enemies.filter(e => e.vip);
      for (let i = 0; i < 60 && Game.mode === 'scenario'; i++) {
        stepGame(1 / 60); T.f++;
        for (const v of vips) { const k = v.team === 'player' ? 'ours' : 'theirs'; if (T[k] == null && !npcInFight(v)) T[k] = +(T.f / 60).toFixed(1); }
      }
      return Game.mode;
    });
    if (mode !== 'scenario') break;
  }
  const res = await page.evaluate(() => ({ ...window._vipT, mode: Game.mode,
    spent: Game.scenario.enemies.filter(e => !e.vip).map(e => e.name + ':' + (99 - e.lives)).join(' '),
    shots: Game.scenario.enemies.filter(e => e.vip).map(e => e.name + ' ' + e.state).join(', ') }));
  res.id = id; played.push(res);
  console.log(`   ${id}, ${LIMIT} s: our VIP out at ${res.ours ?? '-'} s, theirs at ${res.theirs ?? '-'} s (${res.mode}); VIPs now ${res.shots}; tags each kid took: ${res.spent}`);
}
for (const id of Object.keys(MATCHES)) {
  const b = await built(id);
  console.log(`   ${id}: ${b.ks.map(k => `${k.n}${k.vip ? '*' : ''}(${k.team}, ${k.w}, ${k.lives}${k.cap ? ', ' + k.cap + ' cap' : ''})`).join(' ')} | roster: ${b.roster}`);
  const vips = b.ks.filter(k => k.vip);
  check(`${id}: enters and runs as a VIP match`, b.mode === 'scenario' && b.vip, b.mode);
  check(`${id}: two VIPs, one a side, each one life, a pistol, holding (defender), a cap on the head (blue ours, red theirs)`,
    vips.length === 2 && vips.every(k => k.lives === 1 && k.w === 'pistol' && k.role === 'defender' && k.capOnHead) &&
    vips.find(k => k.team === 'player')?.cap === 'blue' && vips.find(k => k.team !== 'player')?.cap === 'red', vips);
  check(`${id}: everyone else has 99 lives and no cap; the roster shows ∞ and stars the VIPs`,
    b.ks.filter(k => !k.vip).every(k => k.lives === 99 && !k.cap) && (b.roster.match(/★/g) || []).length === 2 && (b.roster.match(/∞/g) || []).length === 5, b.roster);
  await g.shot('vip-' + id);
  await play(id);   // v1.170: the played round goes on from this entry, not a fresh one
}

// --- the player's respawn, its grace, and the two endings (Bunratty)
await g.scenario('bunratty_vip');
const resp = await page.evaluate(() => {
  const st = Game.scenario.playerStart;
  Game.player.pos.x += 8; Game.player.pos.z += 3;
  applyBBHit({}, Game.player);
  const out = { mode: Game.mode, back: Math.hypot(Game.player.pos.x - st.pos.x, Game.player.pos.z - st.pos.z), hits: Game.player.hitsTaken, grace: Game.player._graceT, n: Game.scenario.playerRespawns };
  applyBBHit({}, Game.player);    // inside the grace: nothing
  out.inGrace = Game.player.hitsTaken;
  for (let i = 0; i < 125; i++) stepGame(1 / 60);
  Game.player.pos.x += 5;
  applyBBHit({}, Game.player);    // grace over: tagged out again, back again
  out.after = { mode: Game.mode, n: Game.scenario.playerRespawns, back: Math.hypot(Game.player.pos.x - st.pos.x, Game.player.pos.z - st.pos.z) };
  // a non-VIP of theirs tagged: a life spent, the round goes on
  const owen = Game.scenario.enemies.find(e => e.name === 'Owen');
  applyBBHit({}, owen);
  out.owen = owen.lives; out.modeAfterOwen = Game.mode;
  return out;
});
console.log('   respawn:', JSON.stringify(resp));
check('tagged out, you come back at your start with your lives back and 2 s of grace', resp.mode === 'scenario' && resp.back < 0.01 && resp.hits === 0 && resp.grace === 2 && resp.n === 1, resp);
check('inside the grace a hit does nothing; after it, the next tag sends you back again', resp.inGrace === 0 && resp.after.mode === 'scenario' && resp.after.n === 2 && resp.after.back < 0.01, resp);
check('a tagged kid who is not a VIP spends a life and the round goes on', resp.owen === 98 && resp.modeAfterOwen === 'scenario', resp);
const ending = async (who, fresh = true) => {
  if (fresh) await g.scenario('bunratty_vip');   // the win goes on from the respawn checks' entry
  await page.evaluate((who) => { const e = Game.scenario.enemies.find(k => k.name === who); applyBBHit({}, e); }, who);
  await page.waitForFunction(() => Game.mode !== 'scenario', null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => ({ mode: Game.mode, title: (document.querySelector('#resultScreen h1, #resultScreen .result-title') || {}).textContent || '', outcome: Game.lastOutcome || null, txt: document.getElementById('resultScreen').textContent.replace(/\s+/g, ' ').slice(0, 140) }));
};
const winR = await ending('Priya', false), loseR = await ending('Ryan');
console.log('   their VIP tagged:', JSON.stringify(winR));
console.log('   our VIP tagged:', JSON.stringify(loseR));
check('their VIP tagged: the round is won, and the line names Priya, not "the last one"', winR.mode === 'result' && /YOU GOT THEM/.test(winR.txt) && /Priya pulls off the red cap/.test(winR.txt) && !/last one/i.test(winR.txt), winR.txt);
check('our VIP tagged: the round is lost, and the result says they got Ryan', loseR.mode === 'result' && /THEY GOT RYAN/.test(loseR.txt) && /I was the VIP/.test(loseR.txt) && !/GOT THEM/.test(loseR.txt), loseR.txt);

check('in play no VIP falls in the first 15 s', played.every(r => (r.ours == null || r.ours >= 15) && (r.theirs == null || r.theirs >= 15)), played);
check('in play the kids trade tags and come back (some kid spent a life)', played.every(r => /:[1-9]/.test(r.spent)), played.map(r => r.spent));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
