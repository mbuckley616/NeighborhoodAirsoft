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
