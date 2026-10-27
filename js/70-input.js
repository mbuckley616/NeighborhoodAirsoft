
// ---------------------------------------------------------------------
// POINTER LOCK
// ---------------------------------------------------------------------
function requestPointerLock() {
  // v1.96 fix-up: newer Chromium returns a promise and rejects it when there's no fresh
  // user gesture (e.g. startScenario reached from a script-driven BEGIN). The rejection
  // was unhandled and surfaced as a page error; the next click in the scene locks anyway.
  // It can also refuse at once ("Too many pointer lock requests in a short window"), as a throw
  // or a rejection depending on the build, so both are handled.
  try {
    const p = Game.renderer.domElement.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {}
}
function exitPointerLock() {
  if (document.pointerLockElement) document.exitPointerLock?.();
}
document.addEventListener('pointerlockchange', () => {
  const was = Game.mouse.locked;
  Game.mouse.locked = document.pointerLockElement === Game.renderer.domElement;
  if (was && !Game.mouse.locked && Game.mode === 'scenario') openPauseMenu();   // v1.239 (D.39): Escape let go of it
  document.getElementById('pauseHint').style.display =
    (!Game.mouse.locked && !Game.paused && !Pad.active && (Game.mode === 'bedroom' || Game.mode === 'scenario')) ? 'block' : 'none';
});

// ---------------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------------
document.addEventListener('keydown', e => {
  // v1.208: while the forfeit question is up, only its keys do anything
  if (Game.forfeitAsk) {
    if (!e.repeat) {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyY') answerForfeit(true);
      else if (e.code === 'Escape' || e.code === 'KeyN' || e.code === 'KeyF') answerForfeit(false);
    }
    e.preventDefault();
    return;
  }
  // v1.239 (D.39): the pause menu. Escape opens it in a match (when the mouse is already free; a held mouse lets go
  // first, and that opens it) and Escape again goes back; F there asks the forfeit question. The settings over it
  // take their own Escape.
  if (Game.paused) {
    if (!e.repeat && !document.getElementById('settingsScreen').classList.contains('active')) {
      // the Escape that let go of the mouse may also arrive as a key, just after the menu opened: not a second press
      if (e.code === 'Escape' && performance.now() - (Game._pausedAt || 0) > 300) resumeFromPause();
      else if (e.code === 'KeyF') { closePauseMenu(); askForfeit(); }
    }
    e.preventDefault();
    return;
  }
  if (e.code === 'Escape' && Game.mode === 'scenario' && !e.repeat) { openPauseMenu(); e.preventDefault(); return; }
  // v1.248 (D.35): hold Q for the squad orders wheel; letting go gives the order the pointer is on
  if (e.code === 'KeyQ' && Game.mode === 'scenario') { if (!e.repeat && !Game.squadWheel) openSquadWheel(); e.preventDefault(); return; }
  // Diagnostic: toggle the laser clip readout HUD with the backtick (`) key.
  if (e.code === 'Backquote' && !e.repeat) {
    const hud = document.getElementById('laserDiagHud');
    if (hud) {
      const showing = hud.style.display !== 'none';
      hud.style.display = showing ? 'none' : 'block';
      window.__LASER_DBG = !showing;
    }
    e.preventDefault();
    return;
  }
  // Jump (scenario only)
  if (e.code === 'Space' && Game.mode === 'scenario' && !e.repeat && !(Game.player._holdT > 0)) {   // v1.280: no jump while held at base
    if (Game.player.climbing) {
      // v1.138: Space on a ladder lets go: he drops from where he hangs (a long drop empties his stamina)
      Game.player.climbing = null;
      Game.player.velY = 0;
      Game.player.onGround = false;
      Game.player._lastGroundY = Game.player.pos.y;
    } else if (Game.player.onGround && !Game.player.sliding) {
      Game.player.velY = 4.2;
      Game.player.onGround = false;
      // v1.26: remember if we launched while sprinting so the leap keeps sprint
      // speed instead of snapping to jog the instant we leave the ground.
      Game.player.airSprint = !!Game.player.sprinting;
    }
    e.preventDefault();
    return;
  }
  // Crouch + Slide (scenario only)
  if (e.code === 'ControlLeft' && Game.mode === 'scenario' && !e.repeat) {
    if (Game.player.sprinting && Game.player.onGround && Game.player.canSlide && !Game.player.sliding) {
      startSlide();
    } else if (!Game.player.sliding && Game.player.onGround) {
      Game.player.crouching = !Game.player.crouching;
    }
    e.preventDefault();
    return;
  }
  Game.keys[e.code] = true;
  // E to interact (bedroom)
  if (e.code === 'KeyX' && Game.mode === 'bedroom' && !e.repeat) skipRoomTour();   // v1.357 (D.76)
  if (e.code === 'KeyE' && Game.mode === 'bedroom' && Game.focusedInteractable) {
    roomTourUse(Game.focusedInteractable);   // v1.357 (D.76)
    Game.focusedInteractable.action();
  } else if (e.code === 'KeyE' && Game.mode === 'scenario' && Game.scenario.range && !e.repeat) rangeUse();   // v1.257 (D.40): one press, one use
  // v1.249 (D.36): V swings the pool noodle, if you carry one
  if (e.code === 'KeyV' && Game.mode === 'scenario' && !e.repeat) startNoodleSwing();
  // F to forfeit (scenario); v1.208: it asks first
  if (e.code === 'KeyF' && Game.mode === 'scenario' && !e.repeat) {
    askForfeit();
  }
  // M to toggle music
  if (e.code === 'KeyM' && !e.repeat) {
    Music.enabled = !Music.enabled;
    if (Music.enabled) {
      // Resume the current scene's theme
      if (Game.mode === 'bedroom') startMusic('bedroom');
      else if (Game.mode === 'scenario') startMatchMusic();   // v1.356
    } else {
      stopMusic();
    }
  }
  // R held to unjam (only when jammed; handled in updateGun via Game.keys)
  // Number keys 1-4 to switch held equipment slot
  if (Game.mode === 'scenario' && !e.repeat) {
    let targetSlot = -1;
    if (e.code === 'Digit1') targetSlot = 0;
    else if (e.code === 'Digit2') targetSlot = 1;
    else if (e.code === 'Digit3') targetSlot = 2;
    else if (e.code === 'Digit4') targetSlot = 3;
    if (targetSlot >= 0) {
      trySwitchSlot(targetSlot);
      e.preventDefault();
    }
  }
});
document.addEventListener('keyup', e => {
  Game.keys[e.code] = false;
  if (e.code === 'KeyQ' && Game.squadWheel) closeSquadWheel(true);   // v1.248 (D.35)
});

document.addEventListener('mousemove', e => {
  if (Game.mouse.locked) {
    Game.mouse.dx += e.movementX;
    Game.mouse.dy += e.movementY;
  }
});

document.addEventListener('mousedown', e => {
  if (Game.forfeitAsk || Game.paused) return;   // v1.208: clicks on the forfeit question are its buttons' (v1.239: and the pause menu's)
  // Right-click → ADS in scenario
  if (e.button === 2 && Game.mode === 'scenario' && Game.mouse.locked) {
    Game.player.adsTarget = 1;
    return;
  }
  if (e.button !== 0) return;
  if (!Game.mouse.locked && (Game.mode === 'bedroom' || Game.mode === 'scenario')) {
    requestPointerLock();
    initAudio();
    return;
  }
  if (Game.mode === 'scenario' && Game.mouse.locked) {
    Game.mouseLMB = true;
    onLmbDown();
  }
});

document.addEventListener('mouseup', e => {
  if (e.button === 2) {   // v1.294 (B.12): let go anywhere, not only in a match
    Game.player.adsTarget = 0;
  }
  if (e.button === 0 && Game.mode === 'scenario') {
    Game.mouseLMB = false;
    Game.lmbConsumed = false;
    onLmbUp();
  }
});

document.addEventListener('contextmenu', e => {
  if (Game.mode === 'scenario' || Game.mode === 'bedroom') e.preventDefault();
});

// v1.241 (backlog D.38, Michael 14 Oct: "I think we have partial controller support - can we look into having full
// controller support?"): there was none; nothing read a gamepad. Now a pad in the browser's standard layout (Xbox,
// PlayStation, most others) plays a match and walks the bedroom. Read once a step (stepGame), it drives the same paths
// as the keys and mouse: the left stick moves (analog, so a half push walks slower), the right stick looks (the
// settings' sensitivities and invert apply), RT fires and LT aims, A jumps (in the bedroom it is E), B crouches and
// slides, X reloads (held, as R; it also clears a jam), Y and RB pick the next slot, LB the one before, the d-pad slots
// 1-4 (v1.255: in a match with teammates the d-pad gives the squad orders instead), a click of the left stick sprints until
// the stick lets go, Start pauses and resumes, Back/View asks to forfeit.
// On the pause menu and the forfeit question A is yes and B is no. A pad needs no pointer lock: once it is used the
// player moves without one, and the "click to capture" note stays hidden while it is.
const PAD_DEAD = 0.18;          // radial dead zone of each stick
const PAD_LOOK_PX = 1150;       // full right stick = this many mouse pixels a second (about 2.5 rad/s at 1.0×)
const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11,
                  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const Pad = { active: false, prev: [], move: { x: 0, z: 0 }, sprintLatch: false, ads: false, fire: false };
// v1.279 (backlog D.38, Michael: B, the hints then the drags): while the pad is in use every on-screen hint names the
// pad's button, not the key: the E prompts at the doors, shop, mirror, bed and board say A, the ladder's W / S / Space
// say the stick and A, the tutorial's steps, the ammo box, the jam and rack bars, the slot hint, and the pause and
// forfeit buttons. Touching the keyboard or the mouse (a real key or click, or the mouse moved) puts the keys back.
const PAD_WORDS = [
  [/<kbd>W<\/kbd> <kbd>A<\/kbd> <kbd>S<\/kbd> <kbd>D<\/kbd>/g, 'the <kbd>Left Stick</kbd>'],
  [/Hold <kbd>Shift<\/kbd>/g, 'Click <kbd>L3</kbd> (press the left stick)'],
  [/<kbd>Right-Mouse<\/kbd>/g, '<kbd>LT</kbd>'],
  [/Click <kbd>Left-Mouse<\/kbd>/g, 'Pull <kbd>RT</kbd>'],
  [/<kbd>Left-Mouse<\/kbd>/g, '<kbd>RT</kbd>'],
  [/<kbd>R<\/kbd>/g, '<kbd>X</kbd>'],
  [/<kbd>E<\/kbd>/g, '<kbd>A</kbd>'],
  [/<kbd>Space<\/kbd>/g, '<kbd>A</kbd>'],
  [/<kbd>W<\/kbd>/g, '<kbd>Stick ↑</kbd>'],
  [/<kbd>S<\/kbd>/g, '<kbd>Stick ↓</kbd>'],
  [/Click & hold LMB/g, 'Hold RT'],
  [/Click LMB/g, 'Pull RT'],
  [/Click or V to swing/g, 'Pull RT to swing'],
  [/(Hold|HOLD) LMB/g, '$1 RT'],
  [/CLICK TO FIRE/g, 'RT TO FIRE'],
  [/(Hold|HOLD) R\b/g, '$1 X'],
  [/\bR TO FLIP/g, 'X TO FLIP'],
  [/\bF TO FORFEIT/g, 'BACK TO FORFEIT'],
];
function padWords(s) {
  if (!Pad.active || !s) return s;
  for (const [re, to] of PAD_WORDS) s = s.replace(re, to);
  return s;
}
// the hints written into the page itself: [element, the keys' words, the pad's words]
const PAD_STATIC_HINTS = [
  ['#pauseResumeBtn', 'RESUME <kbd>ESC</kbd>', 'RESUME <kbd>START</kbd>'],
  ['#pauseForfeitBtn', 'FORFEIT <kbd>F</kbd>', 'FORFEIT <kbd>BACK</kbd>'],
  ['#forfeitKeepBtn', 'KEEP PLAYING <kbd>ESC</kbd>', 'KEEP PLAYING <kbd>B</kbd>'],
  ['#forfeitYesBtn', 'FORFEIT <kbd>ENTER</kbd>', 'FORFEIT <kbd>A</kbd>'],
  ['#jamBar .jam-label', 'JAMMED — HOLD R TO CLEAR', 'JAMMED — HOLD X TO CLEAR'],
  ['#cockBar .cock-hint', 'Hold LMB · release at FULL', 'Hold RT · release at FULL'],
  ['#workbenchScreen .wb-vp-hint', 'Drag to rotate · scroll to zoom', 'Right stick to turn · LT / RT to zoom'],
];
function padHintsRefresh() {
  for (const [sel, keys, pad] of PAD_STATIC_HINTS) {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = Pad.active ? pad : keys;
  }
  if (Game.mode === 'scenario' && Game.gun) { updateAmmoHud(); updateLoadoutHud(); }
  if (Tutorial.active && !Tutorial.done) {
    const base = Tutorial._reloadBaseline;
    Tutorial._renderStep();
    Tutorial._reloadBaseline = base;
  }
}
function padSetActive(on) {
  if (Pad.active === on) return;
  Pad.active = on;
  if (on) document.getElementById('pauseHint').style.display = 'none';
  else {   // the keys again: let go of whatever the pad was holding, and put the cursor away
    Pad.move.x = Pad.move.z = 0;
    if (Pad.sprintLatch) { Pad.sprintLatch = false; Game.keys['ShiftLeft'] = false; }
    padCursorShow(false);
  }
  padHintsRefresh();
}
document.addEventListener('keydown', e => { if (e.isTrusted && Pad.active) padSetActive(false); }, true);
document.addEventListener('mousedown', e => { if (e.isTrusted && Pad.active) padSetActive(false); }, true);
document.addEventListener('mousemove', e => {
  if (e.isTrusted && Pad.active && Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 3) padSetActive(false);
}, true);
function padStick(x, y) {
  const m = Math.hypot(x, y);
  if (m < PAD_DEAD) return { x: 0, y: 0, m: 0 };
  const k = Math.min(1, (m - PAD_DEAD) / (1 - PAD_DEAD)) / m;
  return { x: x * k, y: y * k, m: Math.min(1, m * k) };
}
function padKey(code, down) {   // the pad's buttons go through the keyboard's own handlers
  document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, cancelable: true }));
}
function padCycleSlot(dir) {
  const n = getUnlockedSlotCount();
  for (let i = 1; i < n; i++) {
    const idx = (Game.held.slotIdx + dir * i + n * 4) % n;
    if (Game.persist.loadoutSlots[idx]) { trySwitchSlot(idx); return; }
  }
}
// v1.242 (backlog D.38, step 2): the screens between matches by pad. Title, map, briefing, result, shop, loadout,
// mirror, workbench, the Pickup board, settings and the pause menu all want the mouse, so on them the pad drives a
// cursor (a yellow ring): the left stick moves it, the d-pad jumps it to the next thing you can click that way, A
// clicks (a slider takes the spot you click; the d-pad's left and right step a slider the cursor is on), B goes back
// (the screen's own close, back or done button, as Escape does), the right stick scrolls what is under it. The thing
// it would click is outlined. It shows only while the pad is in use and a screen is up.
const PAD_CURSOR_PX = 1100;     // full left stick = this many pixels a second
const PAD_BACK_IDS = ['settingsDoneBtn', 'newGameNoBtn', 'modalCloseBtn', 'briefCancelBtn', 'shopCloseBtn',
                      'loadoutCloseBtn', 'wbCloseBtn', 'mapCloseBtn', 'mirrorDoneBtn'];
const PadCursor = { x: 0, y: 0, shown: false, el: null, hover: null };
function padScreenUp() {
  if (document.getElementById('settingsScreen').classList.contains('active')) return true;
  if (Game.mode === 'scenario') return !!Game.paused;
  return Game.mode !== 'bedroom';
}
function padVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
  const cx = Math.min(innerWidth - 1, Math.max(0, (r.left + r.right) / 2)), cy = Math.min(innerHeight - 1, Math.max(0, (r.top + r.bottom) / 2));
  const top = document.elementFromPoint(cx, cy);
  return !!top && (top === el || el.contains(top) || top.contains(el));
}
function padClickable(el) {   // what a click lands on: a control, or anything the page styles with a pointer
  for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
    if (e === PadCursor.el) return null;
    if (e.disabled) return null;
    const tag = e.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A' || tag === 'LABEL') return e;
    if (getComputedStyle(e).cursor === 'pointer') return e;
  }
  return null;
}
function padTargets() {
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el === PadCursor.el || el.tagName === 'CANVAS') continue;
    const tag = el.tagName;
    if (!(tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A' || getComputedStyle(el).cursor === 'pointer')) continue;
    if (el.parentElement && padClickable(el.parentElement)) continue;   // the outermost clickable, not its insides
    if (padVisible(el)) out.push(el);
  }
  return out;
}
function padCenter(el) { const r = el.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; }
function padCursorPlace(x, y) {
  PadCursor.x = Math.max(0, Math.min(innerWidth - 1, x));
  PadCursor.y = Math.max(0, Math.min(innerHeight - 1, y));
  if (PadCursor.el) { PadCursor.el.style.left = PadCursor.x + 'px'; PadCursor.el.style.top = PadCursor.y + 'px'; }
  const hov = padClickable(document.elementFromPoint(PadCursor.x, PadCursor.y));
  if (hov !== PadCursor.hover) {
    if (PadCursor.hover) PadCursor.hover.classList.remove('pad-hover');
    PadCursor.hover = hov;
    if (hov) hov.classList.add('pad-hover');
  }
}
function padCursorShow(on) {
  if (on === PadCursor.shown) return;
  PadCursor.shown = on;
  if (!PadCursor.el) {
    PadCursor.el = document.createElement('div');
    PadCursor.el.id = 'padCursor';
    document.body.appendChild(PadCursor.el);
  }
  PadCursor.el.style.display = on ? 'block' : 'none';
  if (on) {   // start on the clickable thing nearest the middle of the screen
    let best = null, bd = Infinity;
    for (const el of padTargets()) {
      const c = padCenter(el), d = Math.hypot(c.x - innerWidth / 2, c.y - innerHeight / 2);
      if (d < bd) { bd = d; best = c; }
    }
    padCursorPlace(best ? best.x : innerWidth / 2, best ? best.y : innerHeight / 2);
  } else if (PadCursor.hover) { PadCursor.hover.classList.remove('pad-hover'); PadCursor.hover = null; }
}
function padSnap(dx, dy) {   // the nearest clickable that way, favouring ones straight ahead
  let best = null, bs = Infinity;
  for (const el of padTargets()) {
    if (el === PadCursor.hover) continue;
    const c = padCenter(el), vx = c.x - PadCursor.x, vy = c.y - PadCursor.y;
    const along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
    if (along < 4) continue;
    const score = along + across * 2.5;
    if (score < bs) { bs = score; best = c; }
  }
  if (best) padCursorPlace(best.x, best.y);
}
function padStepRange(el, dir) {
  const step = +el.step || 1, v = Math.max(+el.min, Math.min(+el.max, +el.value + dir * step));
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
function padCursorMove(ls, rs, pressed, dt) {
  const hov = PadCursor.hover;
  const range = hov && hov.tagName === 'INPUT' && hov.type === 'range';
  if (pressed(PAD_BTN.LEFT)) { if (range) padStepRange(hov, -1); else padSnap(-1, 0); }
  if (pressed(PAD_BTN.RIGHT)) { if (range) padStepRange(hov, 1); else padSnap(1, 0); }
  if (pressed(PAD_BTN.UP)) padSnap(0, -1);
  if (pressed(PAD_BTN.DOWN)) padSnap(0, 1);
  if (ls.m > 0) {
    const sp = PAD_CURSOR_PX * Math.pow(ls.m, 1.5) * dt / ls.m;
    padCursorPlace(PadCursor.x + ls.x * sp, PadCursor.y + ls.y * sp);
  }
  if (rs.y !== 0) {   // scroll the nearest scrolling box under the cursor
    for (let e = document.elementFromPoint(PadCursor.x, PadCursor.y); e && e !== document.documentElement; e = e.parentElement) {
      const oy = getComputedStyle(e).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 1) { e.scrollTop += rs.y * 900 * dt; break; }
    }
    padCursorPlace(PadCursor.x, PadCursor.y);
  }
}
// v1.279 (D.38, the drags): the workbench's gun turns with the right stick (sideways always; up and down while the
// cursor is on the gun, else it scrolls as before) and LT / RT zoom out and in, as the mouse's drag and wheel do. On the
// Loadout screen the right stick's sideways push turns the kid. Returns true when the stick's up and down are used.
const PAD_TURN = 2.4;   // rad/s at full stick
function padTurnViews(rs, now, dt) {
  if (Game.mode === 'workbench' && WB.active) {
    const onGun = document.elementFromPoint(PadCursor.x, PadCursor.y) === document.getElementById('wbCanvas');
    if (rs.x !== 0 || (onGun && rs.y !== 0)) WB.autoRotate = false;
    WB.yaw += rs.x * PAD_TURN * dt;
    if (onGun) WB.pitch = Math.max(-1.2, Math.min(1.2, WB.pitch + rs.y * PAD_TURN * 0.6 * dt));
    if (now(PAD_BTN.LT)) WB.dist = Math.min(2.0, WB.dist + 0.9 * dt);
    if (now(PAD_BTN.RT)) WB.dist = Math.max(0.4, WB.dist - 0.9 * dt);
    return onGun;
  }
  if (Game.mode === 'loadoutMgr' && LOADOUT_KID.kid && rs.x !== 0) {
    LOADOUT_KID.turn = (LOADOUT_KID.turn || 0) + rs.x * PAD_TURN * dt;
    drawLoadoutKid();
  }
  return false;
}
function padClick() {
  const el = PadCursor.hover;
  if (!el) return;
  if (el.tagName === 'INPUT' && el.type === 'range') {
    const r = el.getBoundingClientRect(), f = Math.max(0, Math.min(1, (PadCursor.x - r.left) / r.width));
    const step = +el.step || 1, min = +el.min, max = +el.max;
    el.value = Math.round((min + f * (max - min)) / step) * step;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'button') { el.focus(); return; }
  const o = { bubbles: true, cancelable: true, clientX: PadCursor.x, clientY: PadCursor.y, button: 0 };
  el.dispatchEvent(new MouseEvent('mousedown', o));
  el.dispatchEvent(new MouseEvent('mouseup', o));
  el.click();
  requestAnimationFrame(() => padCursorPlace(PadCursor.x, PadCursor.y));   // the screen may have changed under it
}
function padBack() {
  for (const id of PAD_BACK_IDS) {
    const el = document.getElementById(id);
    if (el && padVisible(el)) { el.click(); return; }
  }
  // a shop page's own BACK, or anything else labelled as a way back
  for (const el of padTargets()) {
    if (/^\s*(←\s*)?(back|close|done|cancel)\b/i.test(el.textContent || '')) { el.click(); return; }
  }
  padKey('Escape', true);
}
function pollGamepad(dt) {
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  let gp = null;
  for (const p of pads) if (p && p.connected !== false && p.buttons && p.buttons.length) { gp = p; break; }
  if (!gp) {
    if (Pad.active) { Pad.move.x = Pad.move.z = 0; Pad.prev = []; }
    return;
  }
  const btn = gp.buttons.map((b, i) => {
    const v = typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : +b;
    return (i === PAD_BTN.LT || i === PAD_BTN.RT) ? v > 0.4 : (typeof b === 'object' ? !!b.pressed || v > 0.5 : v > 0.5);
  });
  const ax = gp.axes || [];
  const ls = padStick(ax[0] || 0, ax[1] || 0), rs = padStick(ax[2] || 0, ax[3] || 0);
  const prev = Pad.prev;
  const was = i => !!prev[i], now = i => !!btn[i];
  const pressed = i => now(i) && !was(i), released = i => !now(i) && was(i);
  if (btn.some(Boolean) || ls.m > 0 || rs.m > 0) {
    if (!Pad.active) padSetActive(true);   // v1.279: and the hints turn to the pad's buttons
  }
  Pad.prev = btn;
  if (!Pad.active) return;
  const inMatch = Game.mode === 'scenario';
  // v1.242 (D.38 step 2): every screen that wants the mouse gets the pad's cursor
  const onScreen = padScreenUp();
  padCursorShow(onScreen);
  // the questions over a match: A is yes, B is no; Start resumes from the pause menu
  if (Game.forfeitAsk) {
    if (pressed(PAD_BTN.A)) padKey('Enter', true);
    else if (pressed(PAD_BTN.B) || pressed(PAD_BTN.BACK)) padKey('Escape', true);
    return;
  }
  if (Game.paused && !document.getElementById('settingsScreen').classList.contains('active')) {
    if (pressed(PAD_BTN.A) && PadCursor.hover) { padClick(); return; }   // v1.242: A clicks what the cursor is on
    if (pressed(PAD_BTN.START) || pressed(PAD_BTN.A) || pressed(PAD_BTN.B)) { Game._pausedAt = 0; padKey('Escape', true); }
    else if (pressed(PAD_BTN.BACK)) padKey('KeyF', true);
    else padCursorMove(ls, rs, pressed, dt);
    return;
  }
  if (onScreen) {
    const rsUsed = padTurnViews(rs, now, dt);   // v1.279: the workbench gun and the Loadout kid
    if (pressed(PAD_BTN.A)) padClick();
    else if (pressed(PAD_BTN.B)) padBack();
    else padCursorMove(ls, rsUsed ? { x: rs.x, y: 0, m: rs.m } : rs, pressed, dt);
    return;
  }
  if (!inMatch && Game.mode !== 'bedroom') { Pad.move.x = Pad.move.z = 0; return; }
  // sticks: movement and look (read by updatePlayer)
  Pad.move.x = ls.x; Pad.move.z = ls.y;
  Game.mouse.dx += Math.sign(rs.x) * Math.pow(Math.abs(rs.x), 1.6) * PAD_LOOK_PX * dt;
  Game.mouse.dy += Math.sign(rs.y) * Math.pow(Math.abs(rs.y), 1.6) * PAD_LOOK_PX * dt;
  if (Game.mode === 'bedroom') {
    if (pressed(PAD_BTN.A)) padKey('KeyE', true);
    else if (pressed(PAD_BTN.START)) openSettings();   // v1.242: the bedroom's SETTINGS
    else if (pressed(PAD_BTN.BACK)) skipRoomTour();   // v1.357 (D.76): skips the look round the room
    return;
  }
  if (pressed(PAD_BTN.START)) { padKey('Escape', true); return; }
  if (pressed(PAD_BTN.BACK)) { padKey('KeyF', true); return; }
  if (pressed(PAD_BTN.A)) { if (!(Game.scenario.range && rangeUse())) padKey('Space', true); }   // v1.257: A uses the range's bench and door
  if (pressed(PAD_BTN.B)) padKey('ControlLeft', true);
  if (pressed(PAD_BTN.X)) padKey('KeyR', true);
  if (released(PAD_BTN.X)) padKey('KeyR', false);
  if (pressed(PAD_BTN.Y) || pressed(PAD_BTN.RB)) padCycleSlot(1);
  if (pressed(PAD_BTN.LB)) padCycleSlot(-1);
  const dpad = [PAD_BTN.UP, PAD_BTN.RIGHT, PAD_BTN.DOWN, PAD_BTN.LEFT];
  // v1.255 (backlog B.11, Michael: A): with teammates the d-pad gives the squad orders, the wheel's way round (up push
  // up, right find cover, down keep distance, left follow me); slots stay on Y/RB and LB. With none it still picks slots.
  const orders = squadMates().length > 0, dpadOrder = ['push', 'cover', 'distance', 'follow'];
  for (let i = 0; i < 4; i++) if (pressed(dpad[i])) { if (orders) padSquadOrder(dpadOrder[i]); else trySwitchSlot(i); }
  // sprint: a click of the left stick holds Shift until the stick lets go
  if (pressed(PAD_BTN.L3) && ls.m > 0) { Pad.sprintLatch = true; Game.keys['ShiftLeft'] = true; }
  if (Pad.sprintLatch && ls.m === 0) { Pad.sprintLatch = false; Game.keys['ShiftLeft'] = false; }
  // triggers: aim and fire, as the right and left mouse buttons (by state, so a trigger let go while paused lets go)
  if (now(PAD_BTN.LT) !== Pad.ads) { Pad.ads = now(PAD_BTN.LT); Game.player.adsTarget = Pad.ads ? 1 : 0; }
  if (now(PAD_BTN.RT) !== Pad.fire) {
    Pad.fire = now(PAD_BTN.RT);
    if (Pad.fire) { Game.mouseLMB = true; onLmbDown(); }
    else { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); }
  }
}

// === Click handlers — dispatch based on what's held ===
function onLmbDown() {
  if (Game.noodle && Game.noodle.t >= 0) return;   // v1.249: mid-swing
  if (describeSlot(Game.held.slotIdx)?.kind === 'noodle') { startNoodleSwing(); return; }   // v1.249 (D.36)
  if (Game.gun.jammed) return;
  if (Game.gun.flipT > 0) return;   // v1.169: no shot while the taped mags are being flipped
  const heldSlot = describeSlot(Game.held.slotIdx);
  if (!heldSlot) return;
  if (heldSlot.kind === 'gun') {
    // If cocked and ammo > 0, fire immediately on click.
    // v1.20: auto guns bypass the fireCooldown gate — their rate is governed
    // by the cyclic timer in updateGun, not the semi-mode lockout.
    const cooldownOk = Game.gun.fireMode === 'auto' || Game.gun.fireCooldown <= 0;
    // v1.292 (backlog D.50, Michael: C, 20 Oct): a fresh click on an automatic fired at once, whatever its cycle, so
    // tapped the Tick-Tock (2 BBs a second held) fired a BB a click: 18 in 3 s at six clicks a second, against 6 held.
    // A click inside the gun's own cycle since its last shot now waits for it: the held stream picks up the time already
    // gone and fires when the cycle is done, and a click let go before then fires nothing. No automatic fires faster
    // tapped than held.
    if (Game.gun.cocked && Game.gun.ammo > 0 && Game.gun.fireMode === 'auto') {
      const cycle = 60 / Math.max(1, Game.gun.cyclicRPM);
      const since = Game.gun._sinceShot ?? 1e9;
      if (since < cycle - 1e-6) {
        Game.gun.autoFireTimer = since;
        const bj = getGunSpec(Game.gun.type).burstJam || 0;   // v1.250: the burst's jam roll, as on a click that fires
        Game.gun._jamIn = (bj && gameRandom() < bj) ? 1 + Math.floor(gameRandom() * 2) : 0;
        Game.gun._bursts = (Game.gun._bursts || 0) + 1;
        return;
      }
    }
    if (Game.gun.cocked && Game.gun.ammo > 0 && cooldownOk) {
      doFire();
      // v1.20: AUTO guns stay cocked between shots (bolt cycles internally) —
      // don't break the stream by un-cocking. They'll keep firing via the
      // auto-fire cycle in updateGun as long as LMB is held + ammo > 0.
      if (Game.gun.fireMode === 'auto') {
        // Stay cocked, reset the cycle timer so the NEXT auto shot waits a full cycle.
        Game.gun.autoFireTimer = 0;
        // v1.250 (D.37): a cheap gun's burst may jam, a few BBs in
        const bj = getGunSpec(Game.gun.type).burstJam || 0;
        Game.gun._jamIn = (bj && gameRandom() < bj) ? 1 + Math.floor(gameRandom() * 2) : 0;
        Game.gun._bursts = (Game.gun._bursts || 0) + 1;
        // Don't mark LMB consumed — the held trigger keeps the stream alive.
      } else if (Game.gun.electric) {
        // v1.326 (D.63): an electric semi stays cocked; the next pull fires once its cycle is done. Run dry, a new mag
        // is racked in as on any gun.
        Game.gun.fireCooldown = 60 / Math.max(1, Game.gun.semiRPM);
        if (Game.gun.burst > 1) {   // v1.327: the rest of the burst follows in updateGun; no new pull until it is out
          Game.gun._burstLeft = Game.gun.burst - 1;
          Game.gun.autoFireTimer = 0;
          Game.gun.fireCooldown = 1e9;
        }
        Game.lmbConsumed = true;
        if (Game.gun.ammo === 0) { Game.gun.cocked = false; Game.gun.cockProgress = 0; }
      } else {
        Game.gun.cocked = false;
        Game.gun.cockProgress = 0;
        // The current LMB-hold has been "used" for firing.
        // Player must release and click again to start cocking.
        Game.lmbConsumed = true;
      }
    }
  } else if (heldSlot.kind === 'speed_loader') {
    // v1.49: continuous feed. Just enter feeding mode if there's anything to do;
    // the per-frame step moves BBs loader->mag and stops when the mag is full or
    // the loader runs dry. No precomputed duration — the player holds until
    // satisfied and releases whenever they like.
    if (heldSlot.ref.currentBBs > 0 && Game.gun.ammo < Game.gun.maxAmmo) {
      Game.held.using = true;
      Game.held.useKind = 'speed_loader';
      Game.held._feedAccum = 0;        // fractional-BB accumulator
      Game.held._feedingActive = false;
    } else {
      // Nothing to feed (empty loader or already-full mag) — small dry click.
      playReloadClick();
    }
  } else if (heldSlot.kind === 'spare_mag') {
    // Check the spare mag is compatible with the equipped gun.
    // Pistol mags work only with pistol; shotgun/AR/sniper each have their own.
    const needsGun = MAG_GUN_FIT[heldSlot.refId];
    if (needsGun && needsGun !== Game.gun.type) {
      // Wrong gun — dry click, don't consume
      playReloadClick();
      return;
    }
    if (heldSlot.bbs <= 0) { playReloadClick(); return; }   // v1.323 (B.14): an empty spare mag dry-clicks
    Game.held.using = true;
    Game.held.useProgress = 0;
    Game.held.useDuration = 0.4;
    Game.held.useKind = 'spare_mag';
    Game.held.useMagCap = heldSlot.magCap;
  }
}

function onLmbUp() {
  const heldSlot = describeSlot(Game.held.slotIdx);
  if (!heldSlot) return;
  if (heldSlot.kind === 'gun') {
    // Releasing during the cocking pull-back
    if (!Game.gun.cocked && !Game.gun.cockReleasing) {
      const p = Game.gun.cockProgress;
      if (p >= 0.95) {
        // Full pull → start the spring-forward release → cocked
        startCockRelease(true);   // will become cocked when release completes
      } else if (p >= 0.5) {
        // Significant pull but not full → slide returns forward, but NOT cocked
        startCockRelease(false);
      } else if (p >= 0.1) {
        // Partial pull, low → small jam chance + slide returns NOT cocked
        if (gameRandom() < 0.3 && Game.gun.ammo > 0) {
          jamGun();
        } else {
          startCockRelease(false);
        }
      } else {
        // Barely touched — silent abandon
        Game.gun.cockProgress = 0;
      }
    }
  } else if (Game.held.using) {
    Game.held.using = false;
    Game.held.useProgress = 0;
    Game.held.useKind = null;
    Game.held._feedingActive = false;
  }
}

function startCockRelease(willCock) {
  Game.gun.cockReleasing = true;
  Game.gun.cockReleaseProgress = 0;
  Game.gun._releaseWillCock = !!willCock;
}

function jamGun() {
  Game.gun.jammed = true;
  Game.gun.cockProgress = 0;
  Game.gun.cocked = false;
  // Lose 2-3 BBs from the mag (the jammed BB plus a couple that get crushed)
  const lost = Math.min(Game.gun.ammo, 2 + Math.floor(gameRandom() * 2));
  Game.gun.ammo -= lost;
  Game.gun.jamProgress = 0;
  playJam();
  updateAmmoHud();
  updateLoadoutHud();
}

function trySwitchSlot(targetIdx) {
  const unlocked = getUnlockedSlotCount();
  if (targetIdx >= unlocked) return;
  if (targetIdx === Game.held.slotIdx) return;
  if (Game.gun.jammed) return;
  if (Game.held.using) {
    // Cancel current use
    Game.held.using = false;
    Game.held.useProgress = 0;
    Game.held.useKind = null;
    Game.held._feedingActive = false;
  }
  const slot = Game.persist.loadoutSlots[targetIdx];
  if (!slot) return; // can't switch to empty slot
  // If switching away from the gun mid-cock, lose the cock progress (slide eases back)
  if (Game.held.slotIdx === 0 && !Game.gun.cocked && Game.gun.cockProgress > 0.1) {
    Game.gun.cockProgress = 0;
    Game.gun.cocked = false; // still not cocked — will need to rack again
  }
  Game.held.slotIdx = targetIdx;
  Game.held.swapBlock = 0.15;
  playSlotSwap();
  updateAmmoHud();
  updateLoadoutHud();
}
