// v1.200 (D.21, Michael: C on "A better game" 2, "then your crew: a name and colors your allies wear too"). The mirror
// has a YOUR CREW section: a crew name (typed) and a crew colour (none or six). The colour is your crew's jersey (v1.430,
// D.84, Michael: A; a bandana before), worn by you and every ally in a match, except a VIP (his cap), Seth and the tutorial. The name heads your
// side on the briefing. Saved; an old save has no crew.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// A new game: no crew; the mirror's last rows are the crew's, under a YOUR CREW heading
const d0 = await page.evaluate(() => {
  openMirror();
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  const head = document.querySelector('#mirrorOptions .mirror-crew-head');
  const swatches = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt')];
  return { name: Game.persist.look.crewName, color: Game.persist.look.crewColor, rows: rows.slice(-3), head: head && head.textContent,
    swatches: swatches.map(b => b.title), lit: swatches.filter(b => b.classList.contains('on')).map(b => b.title),
    input: !!document.getElementById('mirrorCrewName'), jersey: !!MIRROR.kid.jersey, num: document.getElementById('mirrorJerseyNumber') && document.getElementById('mirrorJerseyNumber').value };
});
check('a new game has no crew name or colour', d0.name === '' && d0.color === null, d0);
// v1.273: and who is in it (tests/crew-roster.test.mjs)
check('the mirror ends with YOUR CREW: Crew name (a text box), Crew colour, who is in it and your jersey (number 10 to start)', d0.head === 'YOUR CREW' && d0.rows.join() === 'crewColor,crewMembers,jersey' && d0.input && d0.num === '10', d0);
check('the colours: none and six, none lit', d0.swatches.join() === 'none,orange,blue,green,purple,yellow,black' && d0.lit.join() === 'none', d0.swatches);
check('no crew colour, no jersey on your kid', !d0.jersey, d0);

// Type a name as a player would: the game's keys don't see it, odd characters drop, 20 at most
const typed = await page.evaluate(() => {
  const inp = document.getElementById('mirrorCrewName');
  inp.focus();
  let seen = 0; const spy = () => seen++;
  document.addEventListener('keydown', spy);
  inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
  document.removeEventListener('keydown', spy);
  inp.value = 'The <Creek> Rats & co'; inp.dispatchEvent(new Event('input'));
  const a = Game.persist.look.crewName;
  inp.value = 'The Creek Rats of Holcomb Bridge'; inp.dispatchEvent(new Event('input'));
  const b = Game.persist.look.crewName;
  inp.value = 'The Creek Rats'; inp.dispatchEvent(new Event('input'));
  return { seen, a, b, c: Game.persist.look.crewName, max: inp.maxLength };
});
check('a key typed in the name box never reaches the game', typed.seen === 0, typed);
check('the name keeps letters and spaces, drops < > &', typed.a === 'The Creek Rats  co'.replace('  ', ' ') && typed.c === 'The Creek Rats', typed);
check('the name is 20 characters at most', typed.b.length === 20 && typed.max === 20, typed);

// Pick orange: you wear the orange jersey on the preview, no bandana; one swatch lit
const picked = await page.evaluate(() => {
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt')].find(b => b.title === 'orange').click();
  const j = MIRROR.kid.jersey;
  const lit = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt.on')].map(b => b.title);
  const T = MIRROR.kid.torso; T.updateMatrixWorld(true); T.geometry.computeBoundingBox();
  const tb = T.geometry.boundingBox.clone().applyMatrix4(T.matrixWorld), jb = j ? new THREE.Box3().setFromObject(j) : null;
  return { color: Game.persist.look.crewColor, crew: !!j, col: j && j.userData.crewJersey, hat: !!MIRROR.kid.hat, lit,
    sleeve: MIRROR.kid.pose.rigR.upper.material.color.getHex(), covers: !!(jb && jb.min.y < tb.min.y + 0.03 && jb.max.x > tb.max.x),
    back: !!(j && j.getObjectByName('jerseyBack')), front: !!(j && j.getObjectByName('jerseyFront')), num: j && j.userData.jerseyNumber,
    name: document.getElementById('mirrorCrewName').value };
});
check('Crew colour orange: saved in the look, an orange jersey over your shirt (the sleeves orange), a number front and back, no bandana',
  picked.color === 0xe07a1e && picked.crew && picked.col === 0xe07a1e && picked.sleeve === 0xe07a1e && picked.covers && picked.back && picked.front &&
  picked.num === 10 && !picked.hat && picked.lit.join() === 'orange', picked);
// Your number and the name on your back, typed: digits only, 0-99; the name in capitals, 10 at most
const jt = await page.evaluate(() => {
  const n = document.getElementById('mirrorJerseyNumber'), nm = document.getElementById('mirrorJerseyName');
  let seen = 0; const spy = () => seen++;
  document.addEventListener('keydown', spy);
  nm.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
  document.removeEventListener('keydown', spy);
  n.value = '2x3'; n.dispatchEvent(new Event('input'));
  nm.value = 'Mike <B> Buckley'; nm.dispatchEvent(new Event('input'));
  const j = MIRROR.kid.jersey;
  return { seen, num: Game.persist.look.jerseyNumber, box: n.value, name: Game.persist.look.jerseyName, on: j.userData.jerseyNumber, onName: j.userData.jerseyName };
});
check('number 23 and MIKE B BUC on the back: saved and on the preview; your keys never reach the game',
  jt.seen === 0 && jt.num === 23 && jt.box === '23' && jt.name === 'MIKE B BUC' && jt.on === 23 && jt.onName === 'MIKE B BUC', jt);
check('clicking a colour keeps the typed name', picked.name === 'The Creek Rats', picked);
// A hat you wear goes on with it: the hat and the jersey
const hatOn = await page.evaluate(() => {
  Game.persist.look.hat = 'cap_red'; renderMirrorPreview();
  const r = { id: MIRROR.kid.hat && MIRROR.kid.hat.userData.kidHat, crew: !!MIRROR.kid.jersey };
  Game.persist.look.hat = 'none'; renderMirrorPreview();
  return r;
});
check('with a hat on you wear the hat over the jersey', hatOn.id === 'cap_red' && hatOn.crew, hatOn);
await g.shot('crew-mirror');
await page.evaluate(() => closeMirror());

// The Loadout kid wears it
const lo = await page.evaluate(() => { openLoadout(); const r = !!(LOADOUT_KID.kid && LOADOUT_KID.kid.jersey); closeLoadout(); return r; });
check('the Loadout kid wears the crew jersey', lo, lo);

// In a match: every ally wears it (a crouch lowers it with the head); the other side doesn't
const readKids = () => page.evaluate(() => (Game.scenario.enemies || []).map(e => {
  const j = e.mesh.jersey;
  return { id: e.charId, team: e.team, vip: !!e.vip, crew: !!j, col: j ? j.userData.crewJersey : null, vipCap: !!e.mesh.vipCap,
    num: j ? j.userData.jerseyNumber : null, name: j ? j.userData.jerseyName : null, want: CHARACTERS[e.charId].name.toUpperCase(),
    bandana: !!(e.mesh.hat && e.mesh.hat.userData.crewBandana) };
}));
const briefHead = id => page.evaluate(id => { const d = document.createElement('div'); d.innerHTML = renderBriefingRosterHTML(getScenarioBriefing(id));
  return d.querySelector('.brief-heading-you').textContent; }, id);

const h0 = await briefHead('hollow_skirmish_3v3');
check('the briefing heads your side with the crew name', h0 === 'THE CREEK RATS', h0);
await g.scenario('hollow_skirmish_3v3');
const k1 = await readKids();
console.log('   hollow 3v3:', JSON.stringify(k1.map(k => `${k.id}/${k.team}/${k.crew}`)));
const allies = k1.filter(k => k.team === 'player'), foes = k1.filter(k => k.team !== 'player');
// v1.275 (D.28 step 3): the match is tuned for Eric, Sean and Nick in your crew, so with nobody in it the street fills
// your side to their count: three allies, every one in the jersey
check('Hollow 3v3: all three allies wear the orange crew jersey, no bandana', allies.length === 3 && allies.every(k => k.crew && k.col === 0xe07a1e && !k.bandana), allies);
check('…each with his own name and number on the back, none of them yours (23)', allies.every(k => k.name === k.want && k.num >= 1 && k.num <= 99 && k.num !== 23) && new Set(allies.map(k => k.num)).size === allies.length, allies);
// (v1.401, D.57 step 3: theirs wear their own crews' colours, never yours)
check('…and none of the other side wears yours', foes.length >= 3 && foes.every(k => k.col !== 0xe07a1e), foes);
const crouch = await page.evaluate(() => {
  const e = Game.scenario.enemies.find(k => k.team === 'player'); const h = e.mesh.jersey;
  // v1.204 fix-up: stand him up first. Read from his pose mid-round (part crouched or leaning), the drop was 0.145-0.158
  setKidCrouch(e.mesh, 0); e.mesh.group.updateMatrixWorld(true);
  const y0 = new THREE.Box3().setFromObject(h).max.y; setKidCrouch(e.mesh, 1); e.mesh.group.updateMatrixWorld(true);
  const y1 = new THREE.Box3().setFromObject(h).max.y; setKidCrouch(e.mesh, 0);
  return +(y0 - y1).toFixed(3);
});
check('a full crouch lowers an ally\'s jersey with his body', crouch > 0.05, crouch);
const run = await g.spin(600);
check('the match runs with the jerseys on (10 s)', run === 'scenario' || run === 'result', run);

// A VIP keeps his cap, the jersey under it
await g.scenario('bunratty_vip');
const k2 = await readKids();
const vipOurs = k2.find(k => k.vip && k.team === 'player');
check('Cover Nick (v1.406, was Protect Ryan): our VIP wears his blue cap over the crew jersey (v1.430)', vipOurs && vipOurs.vipCap && vipOurs.crew, vipOurs);
check('…the allies without the cap wear it', k2.filter(k => k.team === 'player' && !k.vip).every(k => k.crew), k2);

// The tutorial: Seth coaches on your side and wears none; no crew name over him
const ht = await briefHead('winnmark_tutorial');
await g.scenario('winnmark_tutorial');
const k3 = await readKids();
check('the tutorial: nobody wears the crew jersey, and your side is YOUR SIDE', k3.every(k => !k.crew) && ht === 'YOUR SIDE', { k3, ht });

// No name: YOUR SIDE; colour none: no jerseys
await page.evaluate(() => { Game.persist.look.crewName = '  '; Game.persist.look.crewColor = null; });
const h4 = await briefHead('hollow_skirmish_3v3');
await g.scenario('hollow_skirmish_3v3');
const k4 = await readKids();
check('no name: YOUR SIDE; no colour: no jerseys on your side', h4 === 'YOUR SIDE' && k4.filter(k => k.team === 'player').every(k => !k.crew), { h4, k4 });   // (v1.401: theirs wear their crews')

// Saved, and an old save has no crew
const save = await page.evaluate(() => {
  Game.persist.look.crewName = 'The Creek Rats'; Game.persist.look.crewColor = 0x2f8a3a;
  saveGame(); Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST)); const r = loadGame();
  const kept = { ok: r.ok, name: Game.persist.look.crewName, color: Game.persist.look.crewColor };
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.persist.look.crewName; delete raw.persist.look.crewColor;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame();
  return { kept, old: { name: crewName(), color: crewColor() } };
});
check('a save and load keeps the crew name and colour', save.kept.ok && save.kept.name === 'The Creek Rats' && save.kept.color === 0x2f8a3a, save.kept);
check('an old save has no crew', save.old.name === '' && save.old.color === null, save.old);

// v1.360 (Found in play, critic v1.353): a briefing without a count still named the sides as written ("You and Sean
// against the brothers, Ryan and Mitchell") while your crew made it 3 v 3; now a line after it says who is in and how many
const cl = await page.evaluate(() => {
  const W = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const out = { lines: 0, wrong: [], sean: null, quiet: null };
  for (const id of Object.keys(SCENARIOS)) {
    Game.persist.crew = crewFirstTime(id); Game.persist.completed = {}; crewBench.clear();
    const b = getScenarioBriefing(id), m = b.desc.match(/ Today it’s (\w+) (a side|of you against (\w+)): (.*)\.$/);
    if (id === 'bunratty_team_2v2') out.sean = { desc: b.desc, ours: b.allies.map(a => a.name), theirs: b.enemies.map(e => e.name) };
    if (!m) continue;
    out.lines++;
    const ours = W.indexOf(m[1]), theirs = m[3] ? W.indexOf(m[3]) : ours;
    const named = [...b.allies.filter(a => !a.out), ...b.enemies].filter(c => !(SCENARIOS[id].enemySetup || []).some(es => es.charId === c.charId)).every(c => m[4].includes(c.name));
    // (v1.400: a CLUTCH match's crew is out from the start, and the line counts only who plays)
    const playing = b.allies.filter(a => !a.out).length;
    if (ours !== playing + 1 || theirs !== b.enemies.length || !named) out.wrong.push({ id, line: m[0], ours: playing + 1, theirs: b.enemies.length });
  }
  Game.persist.crew = []; Game.persist.completed = {}; crewBench.clear();
  out.quiet = getScenarioBriefing('winnmark_tutorial').desc;
  return out;
});
console.log('   Sean Has Your Back:', JSON.stringify(cl.sean));
// v1.408 (D.57 step 4): The Rematch (was Sean Has Your Back) is first played with Eric, Sean and Nick: four a side
check('The Rematch, first time through, says four a side and who is with you and with them',
  /Today it’s four a side: .+ with you and .+ with them\.$/.test(cl.sean.desc) && cl.sean.ours.length === 3 && cl.sean.theirs.length === 4, cl.sean);
check(`every briefing the crew changes (${cl.lines}) counts the sides as built and names each kid not in the match as written`, cl.lines >= 10 && cl.wrong.length === 0, cl.wrong);
check('a match the crew does not change gets no line', !/Today it’s/.test(cl.quiet), cl.quiet);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
