// v1.88 (backlog A.1): a first-timer can go outside. On the map, clicking the Winnmark label on a new save opens
// Winnmark, not the locked Battleground pin sitting under it.
// v1.376 (backlog D.74, Michael: A from his photos, docs/refs/landing.md): the hall's door is open onto the upstairs
// landing, and "Go outside" is gone: matches start from the map table only. Checked: no front door prompt; you walk
// from the spawn through the open door onto the landing, west down the hallway to Sean's door and no further, east
// along the south wall to the top of the stairs and not down them (the stairs' E is the range, backyard-range.test);
// the map table opens the map; the crew you have taken in are on the landing (none with an empty crew; five in the
// order they joined, two on the futon, two at the desk chairs, one standing), and E by one gives his lines in turn.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(30);
const atSpawn = await page.evaluate(() => ({
  types: Game.interactables.map(i => i.type),
  prompt: document.getElementById('interactPrompt').textContent.trim(),
  labels: Game.interactables.map(i => i.label).filter(Boolean),
  crew: Game.interactables.filter(i => i.type === 'crew_kid').length,
}));
check('no front door: nothing in the house says "Go outside"', !atSpawn.types.includes('front_door') && !/Go outside/.test(atSpawn.prompt) && !atSpawn.labels.includes('Outside'), atSpawn);
check('a new game has nobody in the crew, so nobody on the landing', atSpawn.crew === 0, atSpawn.crew);

// walk: W held with the yaw set, so the walls and furniture are the game's own collisions
const walk = (x, z, yaw, frames) => page.evaluate(([x, z, yaw, n]) => {
  Game.mouse.locked = true; Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw;
  Game.keys = Game.keys || {}; Game.keys['KeyW'] = true;
  for (let i = 0; i < n; i++) stepGame(1 / 60);
  Game.keys['KeyW'] = false; stepGame(1 / 60);
  return { x: +Game.player.pos.x.toFixed(2), z: +Game.player.pos.z.toFixed(2), focused: Game.focusedInteractable && Game.focusedInteractable.type,
    prompt: document.getElementById('interactPrompt').textContent.trim() };
}, [x, z, yaw, frames]);
const s = await page.evaluate(() => [Scenes.bedroom.spawn.x, Scenes.bedroom.spawn.z]);
const south = await walk(s[0] - 0.3, s[1], Math.PI, 150);
check('from the spawn, walking south goes through the open door onto the landing (z past 7)', south.z > 7, south);
const hall = await walk(-2.0, 7.35, Math.PI / 2, 300);
check('west down the hallway you reach Sean\'s door at its end (x -6.9) and stop there', hall.x < -6.2 && hall.x > -6.9 && Math.abs(hall.z - 7.35) < 0.3, hall);
const top = await walk(0, 8.45, -Math.PI / 2, 150);   // between the coffee table and the desk chairs
check('east along the south wall you reach the top of the stairs, past the futon and table', top.x > 1.5 && top.x < 2.4, top);
const down = await walk(1.9, 9.0, Math.PI, 120);
check('and not down them: an invisible wall at the top (z stays short of 9.6)', down.z < 9.6 && down.z > 9.0, down);
check('there E is "Go out back (the range)"', down.focused === 'back_door' && /Go out back/.test(down.prompt), down);

// the map table is the way out
await page.evaluate(() => { const t = Game.interactables.find(i => i.type === 'map_table'); Game.player.pos.x = t.pos.x + 0.4; Game.player.pos.z = t.pos.z; stepGame(1 / 60); });
await page.keyboard.press('KeyE');
check('E at the map table opens the world map', await g.mode() === 'map');
await page.evaluate(() => closeMap());
check('the map closes back to the bedroom', await g.mode() === 'bedroom');

// the crew on the landing
const crew = await page.evaluate(() => {
  Game.persist.crew = ['diego', 'eric', 'alex', 'sean', 'nick'];
  enterBedroom(); stepGame(1 / 60);
  const seats = Scenes.bedroom.crewSeats.map(c => ({ id: c.id, x: +c.x.toFixed(2), z: +c.z.toFixed(2), seated: c.seated, inScene: Game.scene.children.includes(c.group),
    gun: (() => { let g = null; c.group.traverse(o => { if (o.userData.gunParts) g = o; }); return g ? g.visible : 'none'; })() }));
  return { seats, its: Game.interactables.filter(i => i.type === 'crew_kid').map(i => i.crewId) };
});
console.log('   crew:', JSON.stringify(crew.seats));
check('five crew kids on the landing, in the order they joined', crew.seats.map(c => c.id).join() === 'diego,eric,alex,sean,nick' && crew.its.join() === crew.seats.map(c => c.id).join(), crew);
check('the first two on the futon under the east window, the next two at the desk chairs, the fifth standing',
  crew.seats.slice(0, 2).every(c => c.seated && c.x > 0.6 && c.z > 5.5 && c.z < 7.7) &&
  crew.seats.slice(2, 4).every(c => c.seated && c.z > 9 && c.z < 9.6) && !crew.seats[4].seated && crew.seats.every(c => c.inScene && c.z > 4.9), crew.seats);
check('nobody holds a gun in the house', crew.seats.every(c => c.gun === false), crew.seats);
const talk = await page.evaluate(() => {
  const it = Game.interactables.find(i => i.crewId === 'sean');
  Game.player.pos.x = it.pos.x; Game.player.pos.z = it.pos.z - 0.9; stepGame(1 / 60);
  const before = document.getElementById('interactPrompt').textContent.trim();
  const said = [];
  for (let k = 0; k < 4; k++) { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); stepGame(1 / 60); said.push(document.getElementById('interactPrompt').textContent.trim()); }
  return { focused: Game.focusedInteractable && Game.focusedInteractable.crewId, before, said };
});
check('walking up to Sean: "Talk to Sean"', talk.focused === 'sean' && /Talk to Sean/.test(talk.before), talk);
check('E gives his lines one a press, round again after the last', talk.said.every(t => /Sean: “/.test(t)) && new Set(talk.said.slice(0, 3)).size === 3 && talk.said[3] === talk.said[0], talk.said);
const fewer = await page.evaluate(() => { Game.persist.crew = ['nick', 'eric']; enterBedroom(); stepGame(1 / 60);
  return Scenes.bedroom.crewSeats.map(c => c.id + (c.seated ? ':sits' : ':stands')); });
check('two in the crew: both on the futon', fewer.join() === 'nick:sits,eric:sits', fewer);
await page.evaluate(() => { Game.persist.crew = []; enterBedroom(); stepGame(1 / 60); });

// the other hall prompt still wins where it should: at the hall closet
const closet = await page.evaluate(() => {
  const it = Game.interactables.find(i => i.type === 'hall_closet');
  Game.player.pos.x = it.pos.x - 0.2; Game.player.pos.z = it.pos.z;
  for (let i = 0; i < 5; i++) stepGame(1 / 60);
  return Game.focusedInteractable && Game.focusedInteractable.type;
});
check('at the hall closet the workbench prompt still shows', closet === 'hall_closet', closet);

// the map: click every pin label's centre and each marker; each click reaches its own pin
async function clickAll(w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => openMap());
  // positions are read fresh before each click: the info panel grows and can shift the map
  const res = [];
  for (const sc of ['winnmark_court', 'bunratty_court', 'northcliff', 'hollow'])   // v1.130: Northcliff's pin was 'locked'
  for (const part of ['label', 'marker']) {
    const p = await page.evaluate(([sc, part]) => {
      const r = document.querySelector(`#worldMap .pin[data-scenario="${sc}"] .${part}`).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, [sc, part]);
    await page.evaluate(() => { const i = document.getElementById('scenarioInfo'); i.className = 'scenario-info empty'; i.textContent = ''; });
    await page.mouse.click(p.x, p.y);
    const name = await page.evaluate(() => document.querySelector('#scenarioInfo .sc-name')?.textContent || '');
    res.push({ sc, part, ...p, name: name.trim() });
  }
  await page.evaluate(() => closeMap());
  return res;
}
for (const [w, h] of [[1280, 720], [1920, 1080], [1024, 640]]) {
  const res = await clickAll(w, h);
  const wl = res.find(r => r.sc === 'winnmark_court' && r.part === 'label');
  check(`${w}x${h}: the Winnmark label opens Winnmark`, /Winnmark/.test(wl.name) && !/🔒/.test(wl.name), wl.name);
  const hm = res.find(r => r.sc === 'hollow' && r.part === 'marker');
  check(`${w}x${h}: the Battleground marker still opens the Battleground`, /Battleground/.test(hm.name), hm.name);
  const bl = res.find(r => r.sc === 'bunratty_court' && r.part === 'label');
  check(`${w}x${h}: the Bunratty label opens Bunratty`, /Bunratty/.test(bl.name), bl.name);
  const nl = res.find(r => r.sc === 'northcliff' && r.part === 'label');   // v1.130
  check(`${w}x${h}: the Northcliff label opens Northcliff`, /Northcliff/.test(nl.name), nl.name);
}
await page.setViewportSize({ width: 1280, height: 720 });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
