// v1.253 (backlog B.10, Michael 16 Oct): on a controller the bedroom's SETTINGS button stood there all the time (a pad
// never takes the pointer lock, and the button showed whenever the mouse was free), and it sat on top of the CASH/BBs
// box (both top right at 24 px). Now: with the mouse free the button sits under the box, as wide as it, touching
// nothing; on a pad it goes, the box gains a line "START Settings", and Start opens them.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const look = () => page.evaluate(() => {
  const r = id => { const el = document.getElementById(id); if (getComputedStyle(el).display === 'none') return null;
    const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
  return { btn: r('bedroomSettingsBtn'), box: r('bedroomHud'), pad: r('bedroomPadSettings'),
    padText: document.getElementById('bedroomPadSettings').textContent, mode: Game.mode, active: Pad.active };
});
const overlap = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// the mouse, free
await page.evaluate(() => { Game.mouse.locked = false; });
await g.spin(3);
const m = await look();
console.log('   mouse free:', JSON.stringify(m));
check('with the mouse free the button shows and touches nothing of the CASH/BBs box', m.btn && m.box && !overlap(m.btn, m.box), m);
check('it sits under the box, its edges in line with the box', m.btn[1] >= m.box[3] && m.btn[1] - m.box[3] <= 10 &&
  Math.abs(m.btn[0] - m.box[0]) <= 1 && Math.abs(m.btn[2] - m.box[2]) <= 1, [m.btn, m.box]);
check('no pad line without a pad', !m.pad);
await g.shot('bedroom-settings-mouse');
await page.evaluate(() => document.getElementById('bedroomSettingsBtn').click());
check('the button still opens settings', await page.evaluate(() => Game.mode === 'settings'));
await page.evaluate(() => closeSettings());

// v1.388 (Found in play, critic 29 Oct): a label behind a wall is hidden; the labels faded by distance only, so at a new
// save's spawn MAP and LOADOUT floated on the hall's closet doors, and from the landing WORKBENCH over its wall
const labels = (x, z, yaw, toward) => page.evaluate(([x, z, yaw, toward]) => {
  if (toward) { const t = Game.interactables.find(i => i.label && i.label.startsWith(toward)); yaw = Math.atan2(-(t.pos.x - x), -(t.pos.z - z)); }
  Game.player.pos.x = x; Game.player.pos.z = z; Game.player.yaw = yaw; Game.player.pitch = 0;
  stepGame(1 / 60);
  for (let i = 0; i < 7; i++) updateBedroomLabels();   // the wall test runs every 6 frames
  const o = {}; for (const it of Game.interactables) if (it._labelEl) o[it.label] = { op: +it._labelEl.style.opacity, blocked: !!it._labelBlocked };
  return o;
}, [x, z, yaw, toward]);
const L = (o, name) => { const it = Object.entries(o).find(([k]) => k.toLowerCase().includes(name)); return it && it[1]; };
const sp = await page.evaluate(() => { const s = Scenes.bedroom.spawn, t = Scenes.bedroom.stairsSpawn; return [s.x, s.z, t.x, t.z]; });
const atSpawn = await labels(sp[0], sp[1], 0);
const inRoom = await labels(0, 2, 0);
const fromStairs = await labels(sp[2], sp[3], 0, 'Workbench');
const facing = {}; for (const n of ['Loadout', 'Map', 'Phone', 'Summer']) facing[n] = L(await labels(0, 0, 0, n), n.toLowerCase());
console.log('   labels at the spawn:', JSON.stringify(atSpawn));
console.log('   in the room:', JSON.stringify(inRoom));
check('at the spawn, MAP and LOADOUT, behind the hall\'s walls, are hidden', L(atSpawn, 'map').op === 0 && L(atSpawn, 'map').blocked &&
  L(atSpawn, 'loadout').op === 0 && L(atSpawn, 'loadout').blocked, [L(atSpawn, 'map'), L(atSpawn, 'loadout')]);
check('standing in the bedroom, every label ahead of you shows: none is hidden by a wall', Object.values(inRoom).filter(v => v.blocked && v.op > 0).length === 0 &&
  Object.values(inRoom).filter(v => v.op > 0).length >= 5, inRoom);
check('from the middle of the bedroom, LOADOUT, MAP, the phone and the bed each show when you face them', Object.values(facing).every(v => v && v.op > 0 && !v.blocked), facing);
check('from the top of the landing\'s stairs, WORKBENCH in the next room is hidden', L(fromStairs, 'workbench').op === 0 && L(fromStairs, 'workbench').blocked, L(fromStairs, 'workbench'));
const cost = await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 60; i++) { _brLabelFrame += 5; updateBedroomLabels(); } return (performance.now() - t0) / 60; });
console.log('   a frame that tests every label:', cost.toFixed(2), 'ms');

// the pad
await page.evaluate(() => {
  window.__pad = { buttons: Array(17).fill(0), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [{ id: 'test pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0,
    axes: window.__pad.axes.slice(), buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })) }];
});
await page.evaluate(() => { window.__pad.axes = [0.6, 0, 0, 0]; });   // touch the stick
await g.spin(10);
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
const pads = [];
for (let i = 0; i < 6; i++) { await g.spin(30); pads.push(await look()); }
console.log('   pad:', JSON.stringify(pads[5]));
check('on a pad the button never shows in the bedroom (3 s sampled)', pads.every(p => p.active && p.mode === 'bedroom' && !p.btn), pads.map(p => p.btn));
check('the box says START opens the settings, inside the box', pads.every(p => p.pad && /START\s*Settings/.test(p.padText) &&
  p.pad[1] >= p.box[1] && p.pad[3] <= p.box[3]), pads[5]);
await g.shot('bedroom-settings-pad');
await page.evaluate(() => { window.__pad.buttons[9] = 1; });
await g.spin(2);
await page.evaluate(() => { window.__pad.buttons[9] = 0; });
await g.spin(2);
const st = await look();
check('Start opens them', st.mode === 'settings', st.mode);
await page.evaluate(() => closeSettings());
// the pad line is only for the bedroom: a match hides the box with it
await g.scenario('winnmark_team_2v2');
await g.spin(3);
check('in a match neither shows', await page.evaluate(() => getComputedStyle(document.getElementById('bedroomHud')).display === 'none' &&
  getComputedStyle(document.getElementById('bedroomSettingsBtn')).display === 'none'));
await g.close();
