// v1.190 (decisions, "After capture the flag": Michael: B, control room 12 Oct). Hollins Ridge High gets kids of its
// own: Jordan, Caleb, Nathan, Sophie, Grant and Malik, in place of Tyler, the Bunratty kids and the Winnmark kids the
// school's four matches borrowed. Each takes the numbers of the kid he or she replaces, so the matches play as before;
// the allies (Eric, Rebecca, Brooke, your friends from Ridgestone and Winnmark) are unchanged.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const SCHOOL = ['jordan', 'caleb', 'nathan', 'sophie', 'grant', 'malik'];
const IDS = ['school_1v1_tyler', 'school_portables_3v3', 'school_defend_portables', 'school_night_4v4'];
const info = await page.evaluate(([SCHOOL, IDS]) => {
  const look = c => [c.height, c.build, c.hairStyle, c.glasses, c.hairColor, c.skinColor, c.shirtColor, c.pantsColor].join();
  const stats = c => [c.aggression, c.fireRate, c.accuracy, c.headshotBias, c.moveSpeed].join();
  const others = Object.keys(CHARACTERS).filter(k => !SCHOOL.includes(k));
  const kids = SCHOOL.map(id => {
    const c = CHARACTERS[id];
    return { id, look: c && look(c), ok: !!c, street: c && c.street, region: c && c.neighborhood, flavor: !!(c && c.flavor && c.flavor.hit && c.flavor.win),
      lookTwin: c ? others.filter(o => look(CHARACTERS[o]) === look(c)) : [], shirtTwin: c ? others.filter(o => CHARACTERS[o].shirtColor === c.shirtColor) : [] };
  });
  // where every school kid plays, and who plays at the school
  const playsAt = {}, enemiesAt = {}, alliesAt = {};
  for (const [sid, sc] of Object.entries(SCENARIOS)) for (const e of sc.enemySetup || []) {
    if (SCHOOL.includes(e.charId)) (playsAt[e.charId] = playsAt[e.charId] || []).push(sid);
    if (IDS.includes(sid)) ((e.team === 'player' ? alliesAt : enemiesAt)[sid] = (e.team === 'player' ? alliesAt : enemiesAt)[sid] || []).push(e.charId);
  }
  const twinStats = { jordan: 'tyler', caleb: 'ryan', nathan: 'mitchell', grant: 'owen', malik: 'jamie' };
  const sameStats = Object.entries(twinStats).filter(([a, b]) => stats(CHARACTERS[a]) !== stats(CHARACTERS[b])).map(([a]) => a);
  // v1.366 (D.58): Priya is retired, so Sophie is held to the numbers she took from her
  if (stats(CHARACTERS.sophie) !== [0.6, 1.0, 0.7, 0.18, 0.98].join()) sameStats.push('sophie');
  const descs = IDS.map(id => SCENARIOS[id].desc);
  return { kids, playsAt, enemiesAt, alliesAt, sameStats, descs, ids: IDS.filter(id => SCENARIOS[id]) };
}, [SCHOOL, IDS]);
console.log('  enemies', JSON.stringify(info.enemiesAt), 'allies', JSON.stringify(info.alliesAt));
check('the six school kids exist, go to Hollins Ridge High (East Roswell) and have their own hit and win lines',
  info.kids.every(k => k.ok && k.street === 'hollins_ridge_high' && k.region === 'east_roswell' && k.flavor), info.kids);
check('no school kid looks like any other kid in the game, and none shares another kid\'s shirt',
  info.kids.every(k => !k.lookTwin.length && !k.shirtTwin.length), info.kids);
check('the six school kids differ from each other in look', new Set(info.kids.map(k => k.look)).size === 6, info.kids.map(k => k.look));
check('each takes the numbers of the kid he or she replaces', !info.sameStats.length, info.sameStats);
check('the four school matches keep their ids (saves)', info.ids.length === 4, info.ids);
check('every enemy at the school is a school kid', IDS.every(id => (info.enemiesAt[id] || []).length && info.enemiesAt[id].every(c => SCHOOL.includes(c))), info.enemiesAt);
check('the allies are unchanged (Eric and Rebecca; Brooke at night)', (info.alliesAt.school_portables_3v3 || []).join() === 'eric,rebecca'
  && (info.alliesAt.school_night_4v4 || []).join() === 'eric,rebecca,brooke' && !info.alliesAt.school_1v1_tyler && !info.alliesAt.school_defend_portables, info.alliesAt);
check('the school kids play only at the school', Object.values(info.playsAt).flat().every(id => IDS.includes(id))
  && SCHOOL.every(id => info.playsAt[id]), info.playsAt);
const old = /\b(Tyler|Ryan|Mitchell|Priya|Owen|Marcus|Jamie|Trey|Bunratty)\b/;
check('no school briefing names a borrowed kid', info.descs.every(d => !old.test(d)), info.descs.filter(d => old.test(d)));
// v1.362 (D.28 step 5): Friday Night Lights has Seth in Nathan's place, and its briefing names him
const foeName = (id, c) => id === 'school_night_4v4' && c === 'nathan' ? 'Seth' : c[0].toUpperCase() + c.slice(1);
check('each briefing names its own enemies', IDS.every((id, i) => info.enemiesAt[id].every(c => info.descs[i].includes(foeName(id, c)))), info.enemiesAt);

// in each match: the kids build with their own looks and names, the roster shows them, and nobody is stuck at the start
for (const id of IDS) {
  await g.scenario(id);
  const r = await page.evaluate(SCHOOL => {
    const sc = Game.scenario;
    const foes = sc.enemies.filter(e => e.team !== 'player');
    stepGame(1 / 60);   // the roster fills on the first frame; CI could read it before the page's own loop had run one
    const roster = (document.getElementById('rosterHud') || {}).textContent || '';
    // v1.275 (D.28 step 3): their side is tuned for your first-time crew (six or seven), more than the school has
    // kids, so every school kid not on your side is on theirs and only then does anybody else make up the number
    const isSchool = e => SCHOOL.includes(e.charId || (e.character && e.character.name.toLowerCase()));
    const ours = sc.enemies.filter(e => e.team === 'player');
    return { names: foes.map(e => e.name), school: foes.filter(isSchool).length === Math.min(foes.length, SCHOOL.length - ours.filter(isSchool).length),
      shirts: foes.map(e => e.character && e.character.shirtColor), rosterHas: foes.every(e => roster.includes(e.name)),
      stuck: sc.enemies.filter(e => collidesObstacles(e.pos.x, e.pos.z, 0.3)).map(e => e.name) };
  }, SCHOOL);
  console.log(`  ${id}:`, JSON.stringify(r));
  check(`${id}: the enemies are the school's kids first (${r.names.join(', ')}) and the roster names them`, r.school && r.rosterHas, r);
  check(`${id}: every kid spawns clear`, !r.stuck.length, r.stuck);
  await g.spin(60);
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
  await g.spin(60);
}

// the six in a row in front of the bleachers, for a look
await g.scenario('school_portables_3v3');
await page.evaluate(SCHOOL => {
  const p = Game.player; p.pos.set(20, 0, 10); p.yaw = 0; p.pitch = 0;
  const g0 = new THREE.Group(); Game.scene.add(g0);
  SCHOOL.forEach((id, i) => { const k = createKid(CHARACTERS[id], 'pistol'); k.group.position.set(20 - 2.5 + i, 0, 6.5); k.group.rotation.y = 0; g0.add(k.group); });
  for (const e of Game.scenario.enemies) e.health = 0;
}, SCHOOL);
await page.evaluate(() => { const p = Game.player; Game.camera.position.set(p.pos.x, 1.4, p.pos.z); Game.camera.lookAt(p.pos.x, 1.0, 6.5); });
await g.shot('school-kids');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
