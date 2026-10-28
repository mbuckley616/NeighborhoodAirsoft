// v1.88 (backlog A.1): a first-timer can go outside. On the map, clicking the Winnmark label on a new save opens
// Winnmark, not the locked Battleground pin sitting under it.
// v1.376 (backlog D.74, Michael: A from his photos, docs/refs/landing.md): the hall's door is open onto the upstairs
// landing, and "Go outside" is gone: matches start from the map table only. Checked: no front door prompt; you walk
// from the spawn through the open door onto the landing, west down the hallway to Sean's door and no further, east
// along the south wall to the top of the stairs and not down them (the stairs' E is the range, backyard-range.test);
// the map table opens the map; the crew you have taken in are on the landing (none with an empty crew; five in the
// order they joined, two on the futon, two at the desk chairs, one standing), and E by one gives his lines in turn.
// v1.382 (B.19, D.78): the futon kids' legs are on and in front of the seat, not in it; the recess runs to the west wall;
// the futon stands in the middle square to the TV, the table 1.8 x 0.9 m; nothing between the bedroom's door and the stairs.
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
const L = await page.evaluate(() => Scenes.bedroom.landing);
// sized for kids, not to the real (adult) measurements (Michael, 28 Oct: "remember these are meant to be children")
check('the landing is roomy for kids: at least 6 x 6 m under a 2.8 m+ ceiling (real 4.8 x 4.7 x 2.7)',
  L.x1 - L.x0 >= 6 && L.z1 - L.z0 >= 6 && L.h >= 2.8, L);
check('the hallway is at least as wide as the bedroom\'s hall (1.6 m; real 1.1) and 6 m long', L.hallZ1 - L.hallZ0 >= 1.6 && L.x0 - L.hallX0 >= 6, L);
const south = await walk(s[0] - 0.3, s[1], Math.PI, 200);
check('from the spawn, walking south goes through the open door onto the landing (2 m past the door)', south.z > L.z0 + 2, south);
const hz = (L.hallZ0 + L.hallZ1) / 2;
const hall = await walk(L.x0 + 0.4, hz, Math.PI / 2, 400);
check('west down the hallway you reach its end (Sean\'s door) and stop there', hall.x < L.hallX0 + 0.7 && hall.x > L.hallX0 && Math.abs(hall.z - hz) < 0.3, { hall, end: L.hallX0 });
const top = await walk(0, L.z1 - 1.2, -Math.PI / 2, 200);   // between the coffee table and the desk chairs
check('east along the south wall you reach the top of the stairs, past the futon and table', top.x > L.stairX0 && top.x < L.stairX1, { top, stairs: [L.stairX0, L.stairX1] });
const down = await walk((L.stairX0 + L.stairX1) / 2, L.z1 - 0.6, Math.PI, 120);
check('and not down them: an invisible wall at the top (z stays short of the top step)', down.z < L.z1 && down.z > L.z1 - 0.6, { down, top: L.z1 });
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
check('the first two on the futon in the middle of the room, the next two at the desk chairs, the fifth standing',
  crew.seats.slice(0, 2).every(c => c.seated && Math.abs(c.x) < 1.5 && Math.abs(c.z - (L.z0 + L.z1) / 2) < 1.5) &&
  crew.seats.slice(2, 4).every(c => c.seated && c.z > L.z1 - 1 && c.z < L.z1) && !crew.seats[4].seated && crew.seats.every(c => c.inScene && c.z > L.z0), crew.seats);
check('nobody holds a gun in the house', crew.seats.every(c => c.gun === false), crew.seats);
// v1.382 (B.19): the two on the futon sit on it, not in it. In the futon's own frame (the kids face the way it does),
// no box of their legs or shoes goes more than 1 cm into the seat mattress, the frame or an arm: the thighs lie on the
// seat, the shins hang in front of it to the floor.
const legs = await page.evaluate(() => {
  const fu = Scenes.bedroom.futon; Game.scene.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(fu.matrixWorld).invert();
  const parts = [];   // the futon's boxes, in its frame
  for (const m of fu.children) if (!m.rotation.x) { m.geometry.computeBoundingBox(); parts.push(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); }
  const out = [];
  for (const c of Scenes.bedroom.crewSeats.filter(c => c.onFuton)) {
    c.group.updateMatrixWorld(true);
    let worst = 0, n = 0, lowest = 9, front = -9;
    c.group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      for (let a = o; a; a = a.parent) if (!a.visible) return;   // the gun, put away
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));   // one step: no box round a turned box
      const centreY = (bb.min.y + bb.max.y) / 2;
      if (centreY > 0.62) return;   // the torso and up sit above the seat
      n++;
      lowest = Math.min(lowest, bb.min.y);
      for (const p of parts) {
        const dx = Math.min(bb.max.x, p.max.x) - Math.max(bb.min.x, p.min.x), dy = Math.min(bb.max.y, p.max.y) - Math.max(bb.min.y, p.min.y), dz = Math.min(bb.max.z, p.max.z) - Math.max(bb.min.z, p.min.z);
        if (dx > 0 && dy > 0 && dz > 0) worst = Math.max(worst, Math.min(dx, dy, dz));
      }
      if (bb.max.y < 0.3) front = Math.max(front, bb.min.z);
    });
    out.push({ id: c.id, boxes: n, worstInto: +worst.toFixed(3), lowest: +lowest.toFixed(3), shinsFrom: +front.toFixed(2) });
  }
  return out;
});
console.log('   futon legs:', JSON.stringify(legs));
check('the two on the futon: no leg or shoe more than 1 cm into its seat, frame or arms; feet on the floor in front',
  legs.length === 2 && legs.every(k => k.boxes >= 6 && k.worstInto <= 0.01 && k.lowest < 0.02 && k.shinsFrom > 0.39), legs);
// v1.382 (D.78): the room as Michael's second pass has it
const room = await page.evaluate(() => {
  const L = Scenes.bedroom.landing, fu = Scenes.bedroom.futon, t = Scenes.bedroom.coffeeTable;
  Game.scene.updateMatrixWorld(true);
  const tb = new THREE.Box3().setFromObject(t), fb = new THREE.Box3().setFromObject(fu);
  const fwd = { x: Math.sin(fu.rotation.y), z: Math.cos(fu.rotation.y) };
  const tv = { x: L.recessX0 + 0.42, z: L.recessZ - 0.4 }, to = { x: tv.x - fu.position.x, z: tv.z - fu.position.z };
  const d = Math.hypot(to.x, to.z);
  const top = t.children[0].geometry.parameters;
  return { recessX0: L.recessX0, x0: L.x0, futon: { x: +fu.position.x.toFixed(2), z: +fu.position.z.toFixed(2) },
    facingTV: +(Math.acos(Math.min(1, (fwd.x * to.x + fwd.z * to.z) / d)) * 180 / Math.PI).toFixed(1), table: { w: top.width, d: top.depth },
    tableBetween: (() => { const c = tb.getCenter(new THREE.Vector3()); return Math.hypot(tv.x - c.x, tv.z - c.z) < d; })(),
    clearOfWindow: fb.max.x < L.x1 - 1.5 };
});
check('the desk recess runs to the landing\'s west wall (no jut)', room.recessX0 === room.x0, room);
check('the futon stands out in the room (1.5 m+ from the east windows), square to the TV (within 3°), the table between', room.clearOfWindow && room.facingTV < 3 && room.tableBetween, room);
check('the coffee table is about the futon\'s width: 1.8 x 0.9 m', room.table.w === 1.8 && room.table.d === 0.9, room.table);
const door2stairs = await walk(0, L.z0 + 0.3, Math.atan2(-((L.stairX0 + L.stairX1) / 2), -(L.z1 - 0.4 - L.z0 - 0.3)), 420);
check('from the bedroom\'s door straight to the top of the stairs, nothing in the way', door2stairs.x > L.stairX0 && door2stairs.z > L.z1 - 0.8, door2stairs);
// v1.383 (D.78 step 2): the games room's things. Each kind is there, and each rests on what it should: the GameCube and
// the cases in the corner unit under the TV, the pad and the controller flat on the floor before it, the balls on the
// floor, two airsoft things on the coffee table and two on the desks, a Game Boy Advance or two and the cartridges about.
const things = await page.evaluate(() => {
  const P = Scenes.bedroom.landingProps, L = Scenes.bedroom.landing; Game.scene.updateMatrixWorld(true);
  const tv = { x: L.recessX0 + 0.42, z: L.recessZ - 0.4 };
  const info = o => { const b = new THREE.Box3().setFromObject(o); return { y0: +b.min.y.toFixed(3), x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2),
    toTV: +Math.hypot(o.position.x - tv.x, o.position.z - tv.z).toFixed(2), inScene: Game.scene.children.includes(o), tag: o.userData.ball || o.userData.thing || '' }; };
  const out = {}; for (const k in P) out[k] = P[k].map(info);
  return out;
});
console.log('   things:', JSON.stringify(Object.fromEntries(Object.entries(things).map(([k, v]) => [k, v.length]))));
const near = (y, at) => Math.abs(y - at) < 0.012;
check('a GameCube on the corner unit\'s lower shelf under the TV, its cases standing in the upper one',
  things.gamecube.length === 1 && things.gamecube[0].toTV < 0.6 && near(things.gamecube[0].y0, 0.15) &&
  things.cases.filter(c => near(c.y0, 0.61) && c.toTV < 0.6).length >= 5, { gc: things.gamecube, cases: things.cases });
check('a DDR pad flat on the floor before the TV, a second controller beside it, both on cords',
  things.ddrPad.length === 1 && near(things.ddrPad[0].y0, 0) && things.ddrPad[0].toTV < 1.3 &&
  things.controller.length === 1 && near(things.controller[0].y0, 0) && things.cords.length >= 6, { pad: things.ddrPad, ctl: things.controller });
check('loose discs about the TV, and 2-3 Game Boy Advances and a few cartridges about the room',
  things.discs.filter(d => d.toTV < 1.5).length >= 2 && things.gba.length >= 2 && things.gba.length <= 3 && things.carts.length >= 3, { discs: things.discs, gba: things.gba, carts: things.carts });
check('a football, a soccer ball and a tennis ball on the floor',
  ['football', 'soccer', 'tennis'].every(t => things.balls.some(b => b.tag === t && near(b.y0, 0))), things.balls);
check('airsoft things on the coffee table (top 0.44 m) and the desks (0.76 m), and every thing in the scene',
  things.airsoft.filter(a => near(a.y0, 0.44)).length >= 2 && things.airsoft.filter(a => near(a.y0, 0.76)).length >= 2 &&
  Object.values(things).flat().every(t => t.inScene), things.airsoft);
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
