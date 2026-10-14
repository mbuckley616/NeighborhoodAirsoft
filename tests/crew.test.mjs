// v1.200 (D.21, Michael: C on "A better game" 2, "then your crew: a name and colors your allies wear too"). The mirror
// has a YOUR CREW section: a crew name (typed) and a crew colour (none or six). The colour is a bandana you wear when no
// hat is on, and every ally wears it in a match, except a VIP (his cap), Seth and the tutorial. The name heads your
// side on the briefing. Saved; an old save has no crew.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

// A new game: no crew; the mirror's last two rows are the crew's, under a YOUR CREW heading
const d0 = await page.evaluate(() => {
  openMirror();
  const rows = [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key);
  const head = document.querySelector('#mirrorOptions .mirror-crew-head');
  const swatches = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt')];
  return { name: Game.persist.look.crewName, color: Game.persist.look.crewColor, rows: rows.slice(-2), head: head && head.textContent,
    swatches: swatches.map(b => b.title), lit: swatches.filter(b => b.classList.contains('on')).map(b => b.title),
    input: !!document.getElementById('mirrorCrewName'), bandana: !!(MIRROR.kid.hat) };
});
check('a new game has no crew name or colour', d0.name === '' && d0.color === null, d0);
check('the mirror ends with YOUR CREW: Crew name (a text box) and Crew colour', d0.head === 'YOUR CREW' && d0.rows.join() === 'crewName,crewColor' && d0.input, d0);
check('the colours: none and six, none lit', d0.swatches.join() === 'none,orange,blue,green,purple,yellow,black' && d0.lit.join() === 'none', d0.swatches);
check('no crew colour, no bandana on your kid', !d0.bandana, d0);

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

// Pick orange: you wear the orange bandana on the preview; one swatch lit
const picked = await page.evaluate(() => {
  [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt')].find(b => b.title === 'orange').click();
  const hat = MIRROR.kid.hat;
  let col = null; if (hat) hat.traverse(m => { if (m.isMesh && col === null) col = m.material.color.getHex(); });
  const lit = [...document.querySelectorAll('#mirrorOptions .mirror-row[data-key="crewColor"] .mirror-opt.on')].map(b => b.title);
  const box = hat ? new THREE.Box3().setFromObject(hat) : null;
  return { color: Game.persist.look.crewColor, crew: !!(hat && hat.userData.crewBandana), col, lit, top: box && +box.max.y.toFixed(3), name: document.getElementById('mirrorCrewName').value };
});
check('Crew colour orange: saved in the look, an orange bandana on your kid', picked.color === 0xe07a1e && picked.crew && picked.col === 0xe07a1e && picked.lit.join() === 'orange', picked);
check('clicking a colour keeps the typed name', picked.name === 'The Creek Rats', picked);
// A hat you wear goes over it: the hat shows, not the bandana
const hatOn = await page.evaluate(() => {
  Game.persist.look.hat = 'cap_red'; renderMirrorPreview();
  const r = { id: MIRROR.kid.hat && MIRROR.kid.hat.userData.kidHat, crew: !!(MIRROR.kid.hat && MIRROR.kid.hat.userData.crewBandana) };
  Game.persist.look.hat = 'none'; renderMirrorPreview();
  return r;
});
check('with a hat on you wear the hat; the bandana is for a bare head', hatOn.id === 'cap_red' && !hatOn.crew, hatOn);
await g.shot('crew-mirror');
await page.evaluate(() => closeMirror());

// The Loadout kid wears it
const lo = await page.evaluate(() => { openLoadout(); const h = LOADOUT_KID.kid && LOADOUT_KID.kid.hat; const r = !!(h && h.userData.crewBandana); closeLoadout(); return r; });
check('the Loadout kid wears the crew bandana', lo, lo);

// In a match: every ally wears it (a crouch lowers it with the head); the other side doesn't
const readKids = () => page.evaluate(() => (Game.scenario.enemies || []).map(e => {
  const h = e.mesh.hat; let col = null;
  if (h) h.traverse(m => { if (m.isMesh && col === null) col = m.material.color.getHex(); });
  return { id: e.charId, team: e.team, vip: !!e.vip, crew: !!(h && h.userData.crewBandana), col, vipCap: !!e.mesh.vipCap };
}));
const briefHead = id => page.evaluate(id => { const d = document.createElement('div'); d.innerHTML = renderBriefingRosterHTML(getScenarioBriefing(id));
  return d.querySelector('.brief-heading-you').textContent; }, id);

const h0 = await briefHead('hollow_skirmish_3v3');
check('the briefing heads your side with the crew name', h0 === 'THE CREEK RATS', h0);
await g.scenario('hollow_skirmish_3v3');
const k1 = await readKids();
console.log('   hollow 3v3:', JSON.stringify(k1.map(k => `${k.id}/${k.team}/${k.crew}`)));
const allies = k1.filter(k => k.team === 'player'), foes = k1.filter(k => k.team !== 'player');
check('Hollow 3v3: both allies wear the orange crew bandana', allies.length === 2 && allies.every(k => k.crew && k.col === 0xe07a1e), allies);
check('…and none of the other side does', foes.length >= 3 && foes.every(k => !k.crew), foes);
const crouch = await page.evaluate(() => {
  const e = Game.scenario.enemies.find(k => k.team === 'player'); const h = e.mesh.hat;
  // v1.204 fix-up: stand him up first. Read from his pose mid-round (part crouched or leaning), the drop was 0.145-0.158
  setKidCrouch(e.mesh, 0); e.mesh.group.updateMatrixWorld(true);
  const y0 = new THREE.Box3().setFromObject(h).max.y; setKidCrouch(e.mesh, 1); e.mesh.group.updateMatrixWorld(true);
  const y1 = new THREE.Box3().setFromObject(h).max.y; setKidCrouch(e.mesh, 0);
  return +(y0 - y1).toFixed(3);
});
check('a full crouch lowers an ally\'s bandana with his head', crouch > 0.15, crouch);
const run = await g.spin(600);
check('the match runs with the bandanas on (10 s)', run === 'scenario' || run === 'result', run);

// A VIP keeps his cap, and a free-for-all or the other side get nothing
await g.scenario('bunratty_vip');
const k2 = await readKids();
const vipOurs = k2.find(k => k.vip && k.team === 'player');
check('Protect Ryan: our VIP wears his blue cap, not the bandana', vipOurs && vipOurs.vipCap && !vipOurs.crew, vipOurs);
check('…the allies without the cap wear it', k2.filter(k => k.team === 'player' && !k.vip).every(k => k.crew), k2);

// The tutorial: Seth coaches on your side and wears none; no crew name over him
const ht = await briefHead('winnmark_tutorial');
await g.scenario('winnmark_tutorial');
const k3 = await readKids();
check('the tutorial: nobody wears the crew bandana, and your side is YOUR SIDE', k3.every(k => !k.crew) && ht === 'YOUR SIDE', { k3, ht });

// No name: YOUR SIDE; colour none: no bandanas
await page.evaluate(() => { Game.persist.look.crewName = '  '; Game.persist.look.crewColor = null; });
const h4 = await briefHead('hollow_skirmish_3v3');
await g.scenario('hollow_skirmish_3v3');
const k4 = await readKids();
check('no name: YOUR SIDE; no colour: no bandanas', h4 === 'YOUR SIDE' && k4.every(k => !k.crew), { h4, k4 });

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

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
