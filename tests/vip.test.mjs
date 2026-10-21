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
      capOnHead: !!(e.mesh.vipCap && e.mesh.vipCap.parent === e.mesh.head),
      // v1.172: where he starts, against the anchor he holds and the player's start
      offAnchor: +Math.hypot(e.pos.x - e.anchorPos.x, e.pos.z - e.anchorPos.z).toFixed(2),
      offPlayer: +Math.hypot(e.pos.x - Game.player.pos.x, e.pos.z - Game.player.pos.z).toFixed(1) }));
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
  // v1.170 fix-up: untaggable by ignoring hits on him, as the other suites do. maxHits = 1e9 made updateHealthHud build
  // a billion hit slots on the first BB that reached him, which hung or crashed the page (the "lot crash", and CI's
  // VIP fall times that skipped game seconds).
  await page.evaluate(() => { window._vipHit = window._vipHit || applyBBHit; window.applyBBHit = (bb, c) => c === Game.player ? undefined : window._vipHit(bb, c); window._vipT = { ours: null, theirs: null, f: 0 }; });
  for (let s = 0; s < LIMIT; s++) {
    const mode = await page.evaluate(() => {
      const T = window._vipT, vips = Game.scenario.enemies.filter(e => e.vip);
      for (let i = 0; i < 60 && Game.mode === 'scenario'; i++) {
        stepGame(1 / 60); T.f++;
        for (const v of vips) { const k = v.team === 'player' ? 'ours' : 'theirs'; if (T[k] == null && !npcInFight(v)) T[k] = +(T.f / 60).toFixed(1);
          // v1.172: how far each VIP strays from the anchor he holds while he is in the fight
          if (T[k] == null) { const d = Math.hypot(v.pos.x - v.anchorPos.x, v.pos.z - v.anchorPos.z); T[k + 'Stray'] = Math.max(T[k + 'Stray'] || 0, +d.toFixed(2)); } }
      }
      return Game.mode;
    });
    if (mode !== 'scenario') break;
  }
  const res = await page.evaluate(() => ({ ...window._vipT, mode: Game.mode,
    spent: Game.scenario.enemies.filter(e => !e.vip).map(e => e.name + ':' + (99 - e.lives)).join(' '),
    shots: Game.scenario.enemies.filter(e => e.vip).map(e => e.name + ' ' + e.state).join(', ') }));
  res.id = id; played.push(res);
  // v1.172 (critic, 6 Oct): our VIP used to start beside the player (the allies' v1.33 spawn) and hold there
  check(`${id}: each VIP stays within 6 m of the spot he holds while he is in the fight`, (res.oursStray ?? 0) < 6 && (res.theirsStray ?? 0) < 6, res);
  await page.evaluate(() => { if (window._vipHit) window.applyBBHit = window._vipHit; });
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
    b.ks.filter(k => !k.vip).every(k => k.lives === 99 && !k.cap) && (b.roster.match(/★/g) || []).length === 2 && (b.roster.match(/∞/g) || []).length === b.ks.filter(k => !k.vip).length, b.roster);   // v1.275: was 5; the sides are tuned for your first-time crew now
  // v1.172 (critic, 6 Oct): Ryan stood 2.3 m from the player in the lane, Rebecca at the player's start
  check(`${id}: both VIPs start on their own anchors (within 1 m), ours ${'>'} 10 m from the player's start`,
    vips.every(k => k.offAnchor < 1) && vips.find(k => k.team === 'player').offPlayer > 10, vips.map(k => `${k.n} ${k.offAnchor} m off anchor, ${k.offPlayer} m from player`));
  await g.shot('vip-' + id);
  await play(id);   // v1.170: the played round goes on from this entry, not a fresh one
}

// v1.175 (D.17, Michael: B): Night Shift keeps Rebecca on the briefing's spot at (-14, 21) and puts a dumpster on the
// aisle just north of it, her cover against the store end. It is Night Shift's alone: the other lot matches are unchanged.
const dump = async (id) => { await g.scenario(id); return page.evaluate(() => {
  const at = Game.player.obstacles.filter(o => o.minX < -14 && o.maxX > -14 && o.minZ < 19.6 && o.maxZ > 19.6);
  const reb = Game.scenario.enemies.find(e => e.name === 'Rebecca');
  // does the line at chest height from her spot to Mason's lane (x -14, z 4; he tagged her from there before) hit it?
  const blocks = (tx, tz) => at.some(o => { const n = 40; for (let i = 1; i < n; i++) { const t = i / n, x = -14 + (tx + 14) * t, z = 21 + (tz - 21) * t;
    if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ && 1.0 < (o.baseY || 0) + o.h) return true; } return false; });
  return { n: at.length, h: at[0] ? at[0].h : null, rebCover: !!(reb && at.length && reb.homeCover === at[0]),
    lane: blocks(-14, 4), fromStoreW: blocks(-18, -21), obs: Game.player.obstacles.length };
}); };
const dumpVip = await dump('lot_vip_night'), dumpLot = await dump('lot_night_4v4');
console.log('   Night Shift dumpster:', JSON.stringify(dumpVip), '| Lights Out at that spot:', JSON.stringify(dumpLot));
check("Night Shift: a dumpster stands just north of Rebecca's spot, 1.5 m tall, and it is the cover she holds",
  dumpVip.n === 1 && dumpVip.h === 1.5 && dumpVip.rebCover, dumpVip);
check("Night Shift: it blocks her chest-high line to Mason's lane at x -14 and to his start by the store's west end",
  dumpVip.lane && dumpVip.fromStoreW, dumpVip);
check('the other lot night match has nothing there, one obstacle fewer', dumpLot.n === 0 && dumpLot.obs === dumpVip.obs - 1, dumpLot);

// v1.272 (Found in play, Michael: A): Bunratty Court climbs about 7 m to the west end, and Sean fired downhill from
// 30–41 m over the bulb fort's 1.12 m back wall to tag Priya (3 of 196 rounds, now and then inside 8 s). Protect Ryan
// gets a 1.5 m stacked-plank barricade inside the back wall, the cover she holds; the court is otherwise laid out as before.
const bar = await page.evaluate(() => {
  const sig = (obs) => obs.map(o => [o.minX, o.maxX, o.minZ, o.maxZ, o.h].map(v => (+v || 0).toFixed(2)).join(',')).sort();
  const mk = (arg) => withSeededRandom('bunratty_vip|default', () => buildBunrattyCourtScene(arg, 'day')).obstacles;
  const a = sig(mk('default')), b = sig(mk('vip'));
  const extra = b.filter(k => !a.includes(k)), gone = a.filter(k => !b.includes(k));
  return { extra, gone };
}).catch(e => ({ err: String(e) }));
await g.scenario('bunratty_vip');
const sight = await page.evaluate(() => {
  const gyf = Game.scenario.groundY, obs = Game.player.obstacles, p = Game.scenario.enemies.find(e => e.name === 'Priya');
  const at = obs.filter(o => o.h === 1.5 && o.minX > 28.8 && o.maxX < 30.6 && o.minZ < p.pos.z && o.maxZ > p.pos.z);
  const gy = gyf(p.pos.x, p.pos.z);
  const lines = (list) => { let n = 0, chest = 0, head = 0;
    for (let x = -20; x <= 22; x++) for (let z = -8; z <= 8; z++) {
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < 20) continue;
      const y = gyf(x, z); if (y - gy < 2) continue;   // up the hill, 2 m or more above her
      n++; if (hasLineOfSight(x, y + 1.3, z, p.pos.x, gy + 1.0, p.pos.z, list)) chest++; if (hasLineOfSight(x, y + 1.3, z, p.pos.x, gy + 1.45, p.pos.z, list)) head++; }
    return { n, chest, head }; };
  return { n: at.length, h: at[0] && at[0].h, cover: !!(at.length && p.homeCover === at[0]), off: +Math.hypot(p.pos.x - p.anchorPos.x, p.pos.z - p.anchorPos.z).toFixed(2),
    now: lines(obs), without: lines(obs.filter(o => !at.includes(o))) };
});
console.log('   Protect Ryan barricade:', JSON.stringify(bar), JSON.stringify(sight));
check("Protect Ryan: a 1.5 m barricade stands inside the bulb fort's back wall at Priya's spot, and it is the cover she holds",
  sight.n === 1 && sight.h === 1.5 && sight.cover && sight.off < 1, sight);
check('Protect Ryan: from up the hill (2 m+ above her, 20 m+ off) no line reaches her chest or head; without it many do',
  sight.now.n > 300 && sight.now.chest === 0 && sight.now.head === 0 && sight.without.chest > 100 && sight.without.head > 100, sight);
check('Protect Ryan: the court is laid out as before, with the barricade the one obstacle added', !bar.err && bar.extra.length === 1 && bar.gone.length === 0, bar);

// --- the player's respawn, its grace, and the two endings (Bunratty)
// v1.290 (backlog D.48, Michael: B): tagged, you are no longer put at your start in one frame. You walk yourself home,
// gun up: no aim, no shot, nothing tags you, no kid picks you, and an arrow points to your start. Back within 2 m of it,
// the 2 s grace starts.
await g.scenario('bunratty_vip');
const resp = await page.evaluate(() => {
  const P = Game.player, st = Game.scenario.playerStart;
  const back = () => +Math.hypot(P.pos.x - st.pos.x, P.pos.z - st.pos.z).toFixed(2);
  const rot = () => +((document.getElementById('homeArrow').style.transform.match(/-?[\d.]+/) || [NaN])[0]);
  P.pos.x += 8; P.pos.z += 3;
  const was = back();
  applyBBHit({}, P);
  const out = { mode: Game.mode, was, back: back(), going: !!P._goingHome, hits: P.hitsTaken, grace: P._graceT, n: Game.scenario.playerRespawns };
  applyBBHit({}, P);    // walking home: nothing
  out.whileWalking = P.hitsTaken;
  Game.gun.cocked = true; Game.gun.ammo = Math.max(Game.gun.ammo, 3); Game.gun.fireCooldown = 0; Game.gun.jammed = false;
  const ammo = Game.gun.ammo, shots = Game.scenario.stats.shots;
  onLmbDown(); stepGame(1 / 60); onLmbUp();
  out.fired = (ammo - Game.gun.ammo) + (Game.scenario.stats.shots - shots);
  P.adsTarget = 1; stepGame(1 / 60); out.ads = P.adsTarget;
  out.picked = Game.scenario.enemies.filter(e => opposingCombatants(e).includes(P)).length;
  const home = Math.atan2(-(st.pos.x - P.pos.x), -(st.pos.z - P.pos.z));
  P.yaw = home + Math.PI; stepGame(1 / 60); out.arrowAway = rot();
  P.yaw = home; stepGame(1 / 60); out.arrowHome = rot();
  out.hud = document.getElementById('homeHud').style.display; out.hudText = document.getElementById('homeHud').textContent;
  // walk yourself home: face the start and hold W
  Game.keys.KeyW = true;
  let f = 0;
  for (; f < 60 * 20 && P._goingHome && Game.mode === 'scenario'; f++) {
    P.yaw = Math.atan2(-(st.pos.x - P.pos.x), -(st.pos.z - P.pos.z));
    stepGame(1 / 60);
    if (f === 30) out.gunUp = +(P._gunUp || 0).toFixed(2);
  }
  Game.keys.KeyW = false;
  out.walk = { s: +(f / 60).toFixed(2), going: !!P._goingHome, back: back(), grace: +P._graceT.toFixed(2), hits: P.hitsTaken,
    hud: document.getElementById('homeHud').style.display, hudText: document.getElementById('homeHud').textContent, arrow: document.getElementById('homeArrow').style.display };
  // v1.291 (D.49): the 3 s grace counts down, and your own shot ends it
  applyBBHit({}, P); out.walk.inGrace = P.hitsTaken;
  for (let i = 0; i < 30; i++) stepGame(1 / 60);
  Game.gun.cocked = true; Game.gun.ammo = Math.max(Game.gun.ammo, 3); Game.gun.fireCooldown = 0; Game.gun.jammed = false;
  const shots2 = Game.scenario.stats.shots;
  onLmbDown(); stepGame(1 / 60); onLmbUp();
  out.shot = { fired: Game.scenario.stats.shots - shots2, grace: P._graceT, hud: document.getElementById('homeHud').style.display };
  for (let i = 0; i < 60; i++) stepGame(1 / 60);
  out.gunDown = +(P._gunUp || 0).toFixed(2);
  P.pos.x += 5;
  applyBBHit({}, P);    // grace over: tagged out again, walking home again
  out.after = { mode: Game.mode, n: Game.scenario.playerRespawns, going: !!P._goingHome };
  P.pos.copy(st.pos); stepGame(1 / 60);
  out.after.backAgain = !P._goingHome && P._graceT > 2.9;
  // a non-VIP of theirs tagged: a life spent, the round goes on
  const owen = Game.scenario.enemies.find(e => e.name === 'Owen');
  applyBBHit({}, owen);
  out.owen = owen.lives; out.modeAfterOwen = Game.mode;
  // v1.291 (D.49): he walks back, and redeploys with the same 3 s grace; a BB does not tag him in it, his own shot ends it
  P._graceT = 1e9;
  let f2 = 0;
  for (; f2 < 60 * 40 && owen.state === 'retreating' && Game.mode === 'scenario'; f2++) stepGame(1 / 60);
  out.kid = { back: owen.state !== 'retreating', s: +(f2 / 60).toFixed(1), grace: +(owen._graceT || 0).toFixed(2) };
  applyBBHit({ owner: 'player' }, owen);
  out.kid.livesAfterBB = owen.lives; out.kid.state = owen.state;
  spawnEnemyBB(owen, P.pos.clone());
  out.kid.graceAfterShot = owen._graceT;
  P._graceT = 0;
  return out;
});
console.log('   respawn:', JSON.stringify(resp));
check('tagged out, you stay where you were, lives back, walking home (no jump to the start)', resp.mode === 'scenario' && resp.was > 5
  && Math.abs(resp.back - resp.was) < 0.01 && resp.going && resp.hits === 0 && resp.n === 1, resp);
check('walking home: a BB does not tag you, the trigger fires nothing, you cannot aim, no kid picks you',
  resp.whileWalking === 0 && resp.fired === 0 && resp.ads === 0 && resp.picked === 0, resp);
check('walking home: the arrow points to your start (behind you: turned round; ahead: straight up)',
  Math.abs(Math.abs(resp.arrowAway) - Math.PI) < 0.05 && Math.abs(resp.arrowHome) < 0.05 && resp.hud === 'block' && /BACK TO YOUR START · \d+ m/.test(resp.hudText), resp);
check('walking home: the gun points at the sky', resp.gunUp === 1, resp.gunUp);
check('you steer yourself home; within 2 m of it the 3 s grace starts (v1.291), the arrow goes and the panel counts it', !resp.walk.going && resp.walk.back <= 2
  && resp.walk.s < 10 && resp.walk.grace > 2.9 && resp.walk.hud === 'block' && resp.walk.arrow === 'none' && /NOTHING TAGS YOU · 3/.test(resp.walk.hudText)
  && resp.walk.inGrace === 0 && resp.gunDown === 0, resp.walk);
check('your own shot ends the grace, and its panel', resp.shot.fired === 1 && resp.shot.grace === 0 && resp.shot.hud === 'none', resp.shot);
check('after the grace the next tag sends you walking home again', resp.after.mode === 'scenario' && resp.after.n === 2 && resp.after.going && resp.after.backAgain, resp.after);
check('a tagged kid who is not a VIP spends a life and the round goes on', resp.owen === 98 && resp.modeAfterOwen === 'scenario', resp);
check('he walks back and redeploys with 3 s in which a BB does not tag him; his own shot ends it (v1.291)', resp.kid.back && resp.kid.grace > 2.9
  && resp.kid.livesAfterBB === 98 && resp.kid.state !== 'retreating' && resp.kid.graceAfterShot === 0, resp.kid);
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

// v1.170 fix-up, v1.174: 5 s. Since v1.172 Night Shift's Rebecca starts on the briefing's anchor at (-14, 21) and was
// tagged at 8-36 s in 20 of 30 sampled rounds (CI, 6 Oct: 7.5 s), mostly by Mason (D.17). v1.175 (Michael: B): the
// dumpster at her spot; 1 of 12 sampled rounds tagged her inside 40 s, at 22.3 s, so the line is back at 8 s.
check('in play no VIP falls in the first 8 s', played.every(r => (r.ours == null || r.ours >= 8) && (r.theirs == null || r.theirs >= 8)), played);
check('in play the kids trade tags and come back (some kid spent a life)', played.every(r => /:[1-9]/.test(r.spent)), played.map(r => r.spent));
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
