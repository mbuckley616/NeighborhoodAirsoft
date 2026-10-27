// v1.350 (backlog D.70, Michael: B, 23 Oct: "holiday looks first, Halloween now ... shown around the real dates or switched
// on from the Pickup Game board; play unchanged"), step 1: the street houses. From 17 Oct to 1 Nov by the computer's
// clock every buildSuburbanHouse house gets jack-o'-lanterns, cobwebs and a porch light, lit by night. Checked: the dates,
// what goes on Bellfield Court by day and by night, that it costs four draw calls at most and adds nothing solid, and
// that off season (or forced off) nothing is built.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const dates = await page.evaluate(() => {
  Holiday.force = null;
  return [[2026, 9, 16], [2026, 9, 17], [2026, 9, 31], [2026, 10, 1], [2026, 10, 2], [2027, 6, 4]].map(([y, m, d]) => holidayNow(new Date(y, m, d)));
});
check('Halloween runs 17 Oct to 1 Nov by the date: off the 16th, on the 17th, the 31st and 1 Nov, off the 2nd and in July',
  JSON.stringify(dates) === '[null,"halloween","halloween","halloween",null,null]', dates);

const read = () => page.evaluate(() => {
  const d = Game.scene.getObjectByName('holidayDecor');
  const houses = []; Game.scene.traverse(o => { if (o.userData && o.userData.holidayFront) houses.push(o); });
  const out = { houses: houses.length, obstacles: (Game.scenario.obstacles || []).length, decor: null };
  if (d) {
    const meshes = d.children.map(m => m.name);
    const bb = new THREE.Box3().setFromObject(d.getObjectByName('lanterns'));
    // every lantern stands on the ground or the step: none floats over a house's front ground by more than the 12 cm step
    let lowest = Infinity; d.getObjectByName('lanterns').geometry.computeBoundingBox();
    const pos = d.getObjectByName('lanterns').geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) lowest = Math.min(lowest, pos.getY(i));
    out.decor = Object.assign({}, d.userData, { meshes, lowest: +lowest.toFixed(3), top: +bb.max.y.toFixed(2) });
    const solid = (Game.scenario.obstacles || []).some(o => o.mesh && (o.mesh === d || d.children.includes(o.mesh)));
    out.solid = solid;
  }
  // v1.351: the kids' costumes are counted on their own below, so the houses' draw calls are read without the kids
  // (where they stand when it is read moves them in and out of view, by a few calls)
  const cos = (Game.scenario.enemies || []).map(e => e.mesh.group).filter(m => m.visible);
  for (const m of cos) m.visible = false;
  Game.renderer.render(Game.scene, Game.camera);
  out.calls = Game.renderer.info.render.calls;
  for (const m of cos) m.visible = true;
  return out;
});

await page.evaluate(() => { Holiday.force = 'none'; });
await g.scenario('bellfield_3v3');
const off = await read();
await page.evaluate(() => { Holiday.force = 'halloween'; });
await g.scenario('bellfield_3v3');
const day = await read();
await g.shot('holiday-bellfield-day');
console.log('   off: ' + JSON.stringify(off));
console.log('   day: ' + JSON.stringify(day));
check('forced off, nothing is built', off.decor === null && off.houses === 7, off);
check('Bellfield by day: all seven houses, three lanterns and two webs each, a porch light each, no glow',
  day.decor && day.decor.houses === 7 && day.decor.lanterns === 21 && day.decor.webs === 14 && day.decor.lights === 7 && !day.decor.meshes.includes('porchGlow'), day.decor);
check('nothing solid: the same obstacles as with it off, none of them the decorations', day.obstacles === off.obstacles && !day.solid, [off.obstacles, day.obstacles]);
check('it costs three draw calls by day (lanterns, faces and lights, webs)', day.calls - off.calls <= 3 && day.decor.meshes.length === 3, [off.calls, day.calls]);
check('the lanterns stand on the ground: the lowest within 5 cm of Bellfield\'s ground (y 0)', Math.abs(day.decor.lowest) < 0.05, day.decor.lowest);

await g.scenario('bellfield_night_4v4');
const night = await read();
await g.shot('holiday-bellfield-night');
console.log('   night: ' + JSON.stringify(night));
check('by night the porch lights glow too (four meshes)', night.decor && night.decor.night && night.decor.meshes.includes('porchGlow') && night.decor.meshes.length === 4, night.decor);

// v1.351 (D.70 step 2): kids in costumes. Every match kid, both sides, wears the costume his name picks; the crew
// bandana stays on; the head piece lowers with a crouch; nothing is added to the obstacles or changes a hit.
const kids = () => page.evaluate(() => {
  Game.renderer.render(Game.scene, Game.camera);
  const calls = Game.renderer.info.render.calls;
  return { calls, obstacles: (Game.scenario.obstacles || []).length, kids: Game.scenario.enemies.map(e => {
    const c = e.mesh.costume, hat = e.mesh.hat;
    return { id: e.charId, team: e.team, want: kidCostumeFor(e.charId), costume: c ? c.id : null,
      head: !!(c && c.head), body: !!(c && c.body && c.body.children.length), bandana: !!(hat && hat.userData.crewBandana && hat.visible),
      ownHat: !!(hat && !hat.userData.crewBandana) };
  }) };
});
await page.evaluate(() => { Game.persist.look.crewColor = CREW_COLORS[0].hex; Holiday.force = 'none'; });
await g.scenario('bellfield_3v3');
const plain = await kids();
await page.evaluate(() => { Holiday.force = 'halloween'; });
await g.scenario('bellfield_3v3');
const dressed = await kids();
await g.shot('holiday-costumes');
console.log('   costumes: ' + JSON.stringify(dressed.kids.map(k => k.id + ':' + k.costume + (k.bandana ? '+bandana' : ''))) + ', calls ' + plain.calls + ' -> ' + dressed.calls);
check('forced off, no kid is in costume', plain.kids.every(k => k.costume === null && k.want === null), plain.kids);
check('in season every kid of both sides wears the costume his name picks, a body part each',
  dressed.kids.length >= 6 && dressed.kids.every(k => k.costume === k.want && (!k.costume || k.body)) && dressed.kids.some(k => k.team === 'player' && k.costume) && dressed.kids.some(k => k.team !== 'player' && k.costume), dressed.kids);
check('a kid in his own hat keeps it and wears no head piece; the others with a hat costume wear it',
  dressed.kids.every(k => !k.costume || !['witch', 'devil', 'cat'].includes(k.costume) || (k.ownHat ? !k.head : k.head)), dressed.kids);
check('your side still wears the crew bandana under the costumes', dressed.kids.filter(k => k.team === 'player').every(k => k.bandana || k.ownHat), dressed.kids.filter(k => k.team === 'player'));
check('nothing solid is added', dressed.obstacles === plain.obstacles, [plain.obstacles, dressed.obstacles]);
const spread = await page.evaluate(() => {
  const n = {}; for (const id of Object.keys(CHARACTERS)) { const c = kidCostumeFor(id) || 'none'; n[c] = (n[c] || 0) + 1; }
  return { n, total: Object.keys(CHARACTERS).length };
});
console.log('   every kid: ' + JSON.stringify(spread));
check('across every kid in the game all five costumes are worn, and some come as themselves', Object.keys(spread.n).length === 6, spread);
const same = await page.evaluate(async () => {
  const a = Game.scenario.enemies.map(e => e.charId + ':' + (e.mesh.costume ? e.mesh.costume.id : '-')).sort();
  return a;
});
await g.scenario('bellfield_night_4v4');
const again = await page.evaluate(() => Game.scenario.enemies.map(e => e.charId + ':' + (e.mesh.costume ? e.mesh.costume.id : '-')));
check('a kid wears the same costume in the next match', again.every(s => !same.some(t => t.split(':')[0] === s.split(':')[0]) || same.includes(s)), [same, again]);
const crouch = await page.evaluate(() => {
  const e = Game.scenario.enemies.find(k => k.mesh.costume && k.mesh.costume.head);
  if (!e) return null;
  setKidCrouch(e.mesh, 0);
  const y0 = e.mesh.costume.head.position.y, h0 = e.mesh.pose.head.position.y;
  setKidCrouch(e.mesh, 1);
  const r = { dHat: e.mesh.costume.head.position.y - y0, dHead: e.mesh.pose.head.position.y - h0 };
  return r;
});
check('crouched, the head piece goes down with the head', crouch && crouch.dHead < -0.1 && Math.abs(crouch.dHat - crouch.dHead) < 0.01, crouch);
await g.spin(600);
check('a night match plays 10 s with everyone in costume', (await page.evaluate(() => Game.mode)) !== 'title', null);

// v1.352 (D.70 step 3): the Pickup Game board's Holiday row. By the date (lit to start), Halloween, Off; it holds for
// the pickup match, houses and kids, and the next ladder match goes by the date again.
const board = await page.evaluate(() => {
  Holiday.force = null;
  for (const z of ZONE_LADDER) Game.persist.completed[zoneCapstoneId(z.key)] = true;
  openPickupBoard();
  const grp = () => [...document.querySelectorAll('#modalBody .pk-opt[data-grp="holiday"]')];
  const r = { opts: grp().map(x => x.textContent), on: grp().filter(x => x.classList.contains('on')).map(x => x.dataset.val) };
  document.querySelector('#modalBody .pk-opt[data-grp="map"][data-val="bellfield"]').click();
  document.querySelector('#modalBody .pk-opt[data-grp="holiday"][data-val="none"]').click();
  r.lit = grp().filter(x => x.classList.contains('on')).map(x => x.dataset.val);
  r.state = pickupState.holiday;
  closeModal();
  return r;
});
check('the board has a Holiday row, By the date (saying what that is today), Halloween and Off, By the date lit; a click lights Off',
  board.opts.length === 3 && /^By the date/.test(board.opts[0]) && board.opts[1] === 'Halloween' && board.opts[2] === 'Off' && board.on.join() === 'date' && board.lit.join() === 'none', board);
const pickupRead = async () => { const d = await read(); const k = await kids(); return { decor: !!d.decor, costumes: k.kids.filter(x => x.costume).length, kids: k.kids.length }; };
await page.evaluate(() => buildPickupScenario(pickupState));
await g.scenario('pickup_game');
const pkOff = await pickupRead();
// out of season (the date read as July), Halloween on the board puts it all on
await page.evaluate(() => { window.__realByDate = holidayByDate; holidayByDate = () => null; pickupState.holiday = 'halloween'; buildPickupScenario(pickupState); });
await g.scenario('pickup_game');
const pkOn = await pickupRead();
await page.evaluate(() => { pickupState.holiday = 'date'; buildPickupScenario(pickupState); });
await g.scenario('pickup_game');
const pkDateJuly = await pickupRead();
await g.scenario('bellfield_3v3');
const ladderJuly = await pickupRead();
await page.evaluate(() => { holidayByDate = window.__realByDate; pickupState.holiday = 'none'; buildPickupScenario(pickupState); });
await g.scenario('pickup_game');
await g.scenario('bellfield_3v3');
const ladderAfterOff = await pickupRead();
console.log('   pickup: ' + JSON.stringify({ pkOff, pkOn, pkDateJuly, ladderJuly, ladderAfterOff }));
check('in season, a pickup game with Off has no lanterns and no costumes', !pkOff.decor && pkOff.costumes === 0 && pkOff.kids > 0, pkOff);
check('out of season, a pickup game with Halloween has the houses done up and kids in costume', pkOn.decor && pkOn.costumes > 0, pkOn);
check('out of season, By the date has neither, nor does a ladder match', !pkDateJuly.decor && pkDateJuly.costumes === 0 && !ladderJuly.decor && ladderJuly.costumes === 0, [pkDateJuly, ladderJuly]);
check('in season, the ladder match after an Off pickup game goes by the date again', ladderAfterOff.decor && ladderAfterOff.costumes > 0, ladderAfterOff);

await page.evaluate(() => { Holiday.force = null; });
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
