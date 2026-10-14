// v1.192 (D.17 "A better game" 5, Michael: C — settings first): the settings screen opens from the title and the
// bedroom; mouse and aim sensitivity, invert look and field of view change the look and the camera; music and effects
// volume reach the music master and the one effects bus every sound now goes through; it all survives a reload and
// a NEW GAME.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

// The title's SETTINGS opens the screen over the title, with six rows at their defaults
await page.evaluate(() => document.getElementById('titleSettingsBtn').click());
const t0 = await page.evaluate(() => ({
  open: document.getElementById('settingsScreen').classList.contains('active'),
  mode: Game.mode,
  rows: [...document.querySelectorAll('#settingsRows .settings-row')].map(r => r.textContent),
  settings: { ...Settings },
}));
check('the title opens settings and stays on the title', t0.open && t0.mode === 'title', t0.mode);
check('six rows: mouse, aim, music, effects, field of view, invert', t0.rows.length === 6, t0.rows);
check('defaults: 1×, 1×, 100%, 100%, 75°, off', JSON.stringify(t0.settings) ===
  JSON.stringify({ mouseSens: 1, aimSens: 1, music: 1, effects: 1, fov: 75, invertY: false }), t0.settings);
await g.shot('settings-title');

// Drive the controls as a player would: each input event applies and saves
const set = await page.evaluate(() => {
  const want = { mouseSens: 2, aimSens: 0.5, music: 0.5, effects: 0.25, fov: 90 };
  for (const [k, v] of Object.entries(want)) {
    const el = document.querySelector(`#settingsRows input[data-key=${k}]`);
    el.value = v; el.dispatchEvent(new Event('input'));
  }
  const inv = document.querySelector('#settingsRows input[data-key=invertY]');
  inv.checked = true; inv.dispatchEvent(new Event('change'));
  return { settings: { ...Settings }, stored: JSON.parse(localStorage.getItem(SETTINGS_KEY)),
    labels: [...document.querySelectorAll('#settingsRows .settings-val')].map(v => v.textContent) };
});
const WANT = { mouseSens: 2, aimSens: 0.5, music: 0.5, effects: 0.25, fov: 90, invertY: true };
check('the sliders and the box set every setting', JSON.stringify(set.settings) === JSON.stringify(WANT), set.settings);
check('saved at once', JSON.stringify(set.stored) === JSON.stringify(WANT), set.stored);
check('the values read 2.00×, 0.50×, 50%, 25%, 90°, On', set.labels.join(' ') === '2.00× 0.50× 50% 25% 90° On', set.labels);
await page.evaluate(() => document.getElementById('settingsDoneBtn').click());
check('DONE closes it on the title', await page.evaluate(() =>
  !document.getElementById('settingsScreen').classList.contains('active') && Game.mode === 'title'));

// A reload keeps them; junk in storage is clamped, not trusted
await page.reload();
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof stepGame === 'function', null, { timeout: 60000 });
const re = await page.evaluate(() => ({ ...Settings }));
check('a reload keeps them', JSON.stringify(re) === JSON.stringify(WANT), re);
const junk = await page.evaluate(() => sanitizeSettings({ mouseSens: 'x', aimSens: 99, music: -1, fov: 500, invertY: 'yes' }));
check('junk is clamped to the ranges or the default', JSON.stringify(junk) ===
  JSON.stringify({ mouseSens: 1, aimSens: 2, music: 0, effects: 1, fov: 100, invertY: false }), junk);

// NEW GAME keeps them (they belong to the browser, not the save); the bedroom shows a SETTINGS button while the mouse is free
await g.bedroom();
await g.spin(5);
const bed = await page.evaluate(() => ({ s: { ...Settings },
  btn: getComputedStyle(document.getElementById('bedroomSettingsBtn')).display, locked: Game.mouse.locked }));
check('NEW GAME keeps them', JSON.stringify(bed.s) === JSON.stringify(WANT), bed.s);
check('the bedroom shows SETTINGS with the mouse free', bed.btn === 'block' && !bed.locked, bed);
await page.evaluate(() => document.getElementById('bedroomSettingsBtn').click());
const bo = await page.evaluate(() => ({ mode: Game.mode, open: document.getElementById('settingsScreen').classList.contains('active') }));
check('it opens settings over the bedroom', bo.open && bo.mode === 'settings', bo);
await g.spin(2);
check('the bedroom button hides while it is open', await page.evaluate(() =>
  document.getElementById('bedroomSettingsBtn').style.display === 'none'));
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })));
check('Escape closes it back to the bedroom', await page.evaluate(() =>
  Game.mode === 'bedroom' && !document.getElementById('settingsScreen').classList.contains('active')));
await page.evaluate(() => { Game.mouse.locked = true; });
await g.spin(2);
check('the button hides once the mouse is taken', await page.evaluate(() =>
  document.getElementById('bedroomSettingsBtn').style.display === 'none'));

// The look: hip 2× and inverted; aimed 2 × 0.55 × 0.5
await g.scenario('winnmark_tutorial');
const look = await page.evaluate(() => {
  const P = Game.player, out = {};
  const turn = () => { const y = P.yaw, p = P.pitch; P.pitch = 0; Game.mouse.dx = 50; Game.mouse.dy = 20; stepGame(1 / 60);
    return { dyaw: P.yaw - y, dpitch: P.pitch }; };
  P.ads = 0; P.adsTarget = 0; out.hip = turn();
  P.ads = 1; P.adsTarget = 1; out.aim = turn();
  P.ads = 0; P.adsTarget = 0;
  return out;
});
const BASE = 0.0022;
const near = (a, b) => Math.abs(a - b) < 1e-6;
check('hip look turns at 2× the base', near(look.hip.dyaw, -50 * BASE * 2), look.hip);
check('invert look: moving the mouse down looks up', near(look.hip.dpitch, 20 * BASE * 2), look.hip);
check('aimed look turns at 2 × 0.55 × 0.5', near(look.aim.dyaw, -50 * BASE * 2 * 0.55 * 0.5), look.aim);

// The field of view: 90° at the hip, aiming narrows by the old 75→55 share (66°)
const fov = await page.evaluate(() => {
  const P = Game.player; P.adsTarget = 0; for (let i = 0; i < 120; i++) stepGame(1 / 60);
  const hip = Game.camera.fov; P.adsTarget = 1; for (let i = 0; i < 120; i++) stepGame(1 / 60);
  const aim = Game.camera.fov; P.adsTarget = 0; for (let i = 0; i < 60; i++) stepGame(1 / 60);
  return { hip, aim, zoom: getEquippedSightZoomBonus() };
});
check('the camera sits at 90° at the hip', Math.abs(fov.hip - 90) < 0.5, fov);
check('aiming takes it to 66° (no scope)', fov.zoom > 0 || Math.abs(fov.aim - 66) < 0.8, fov);

// The volumes: every effect goes through the effects bus, the music through its master, each at its setting
const audio = await page.evaluate(() => {
  initAudio();
  const ctx = Game.audio.ctx;
  if (!ctx) return { noAudio: true };
  const direct = [];
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest === ctx.destination && this !== Game.audio.sfx && this !== Music.masterGain) direct.push(this.constructor.name);
    return orig.call(this, dest, ...rest);
  };
  try {
    playShot(Game.player.pos.x + 3, Game.player.pos.z); playFootstep(Game.player.pos.x + 2, Game.player.pos.z);
    playPlayerFootstep(false); playReloadClick(); playHitOnPlayer(); playImpactWood(Game.player.pos.clone());
    playShopChaching();
  } finally { AudioNode.prototype.connect = orig; }
  const sets = [];
  const p = Game.audio.sfx.gain, os = p.setValueAtTime;
  p.setValueAtTime = function (v, t) { sets.push(v); return os.call(this, v, t); };
  openSettings();
  const e2 = document.querySelector('#settingsRows input[data-key=effects]');
  e2.value = 0.6; e2.dispatchEvent(new Event('input'));
  closeSettings();
  p.setValueAtTime = os;
  return { direct, sets, mode: Game.mode };
});
if (audio.noAudio) check('audio context available', false, audio);
else {
  check('no sound effect goes straight to the speakers', audio.direct.length === 0, audio.direct);
  check('moving the effects slider sets the bus to 60%', audio.sets.length > 0 && near(audio.sets.at(-1), 0.6), audio.sets);
  check('closing settings mid-match goes back to the match', audio.mode === 'scenario', audio.mode);
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
