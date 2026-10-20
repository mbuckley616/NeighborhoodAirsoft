// v1.279 (backlog D.38, Michael: B, the hints then the drags). With a pad in hand the hints still named keys: the E
// prompt at every door and the shop, mirror, bed and board, the treehouse's W / S / Space, the tutorial's WASD, Shift,
// mouse buttons and R, the ammo box and jam bar, and the pause and forfeit buttons (ESC, F, ENTER). Now, while the pad
// is in use, they name its buttons, and a real key press or mouse move puts the keys back.
// The pad here is a stand-in for navigator.getGamepads(), set button by button from the test.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

await page.evaluate(() => {
  window.__pad = { buttons: Array(17).fill(0), axes: [0, 0, 0, 0], on: true };
  navigator.getGamepads = () => window.__pad.on ? [{
    id: 'test pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0,
    axes: window.__pad.axes.slice(),
    buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })),
  }] : [];
});
const B = { A: 0, B: 1, X: 2, BACK: 8, START: 9 };
const btn = (i, v) => page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [i, v]);
const tap = async (i) => { await btn(i, 1); await g.spin(2); await btn(i, 0); await g.spin(2); };
const wake = async () => { await page.evaluate(() => { window.__pad.axes = [0.6, 0, 0, 0]; }); await g.spin(1);
  await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await g.spin(2); };
const txt = (sel) => page.evaluate(s => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const active = () => page.evaluate(() => Pad.active);

// 1) the bedroom's E prompt, at the first thing you can use
const atThing = () => page.evaluate(() => {
  const it = Game.interactables[0]; const p = Game.player;
  p.pos.x = it.pos.x + 0.6; p.pos.z = it.pos.z; Game.mouse.locked = true;
  stepGame(1 / 60);
  const el = document.getElementById('interactPrompt');
  return { shown: el.style.display === 'block', text: el.textContent.replace(/\s+/g, ' ').trim() };
});
const kb0 = await atThing();
check('in the bedroom, keys: the prompt names E', kb0.shown && /^E /.test(kb0.text), kb0);
await wake();
const pd0 = await atThing();
check('with the pad in use, the same prompt names A', pd0.shown && /^A /.test(pd0.text) && pd0.text.slice(2) === kb0.text.slice(2), pd0);
await page.mouse.move(100, 100); await page.mouse.move(180, 160);
const kb1 = await atThing();
check('a real mouse move puts the keys back: E again, and the pad is no longer in use', /^E /.test(kb1.text) && !(await active()), kb1);
await wake();
check('touching the pad again: A again', /^A /.test((await atThing()).text));
await page.keyboard.press('ShiftLeft');
check('a real key press puts the keys back too', /^E /.test((await atThing()).text) && !(await active()));

// 1b) the drags: the workbench's gun and the Loadout kid turn with the right stick
await page.evaluate(() => openWorkbench());
await wake();
const wb0 = await page.evaluate(() => ({ yaw: WB.yaw, pitch: WB.pitch, dist: WB.dist, hint: document.querySelector('#workbenchScreen .wb-vp-hint').textContent }));
check('the workbench viewport hint names the stick and triggers', wb0.hint === 'Right stick to turn · LT / RT to zoom', wb0.hint);
await page.evaluate(() => { window.__pad.axes = [0, 0, 1, 0]; });
await g.spin(30);
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
await g.spin(2);
const wb1 = await page.evaluate(() => ({ yaw: WB.yaw, auto: WB.autoRotate }));
check('the right stick turns the gun (half a second: about a radian), and stops its own turning', wb1.yaw - wb0.yaw > 0.8 && wb1.yaw - wb0.yaw < 1.4 && !wb1.auto, { d: wb1.yaw - wb0.yaw });
// the cursor on the gun: up and down tilt it
await page.evaluate(() => { const r = document.getElementById('wbCanvas').getBoundingClientRect(); padCursorPlace((r.left + r.right) / 2, (r.top + r.bottom) / 2); window.__pad.axes = [0, 0, 0, 1]; });
await g.spin(20);
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
const wb2 = await page.evaluate(() => WB.pitch);
check('with the cursor on the gun, the stick\'s up and down tilt it', wb2 - wb0.pitch > 0.3, { from: wb0.pitch, to: wb2 });
await btn(7, 1); await g.spin(30); await btn(7, 0);
const zIn = await page.evaluate(() => WB.dist);
await btn(6, 1); await g.spin(30); await btn(6, 0);
const zOut = await page.evaluate(() => WB.dist);
check('RT zooms in and LT zooms out', zIn < wb0.dist - 0.3 && zOut > zIn + 0.3, { from: wb0.dist, zIn, zOut });
await page.mouse.move(50, 50); await page.mouse.move(120, 90);
check('with the mouse back, the hint says drag and scroll', (await txt('#workbenchScreen .wb-vp-hint')) === 'Drag to rotate · scroll to zoom');
await page.evaluate(() => closeWorkbench());
await page.evaluate(() => openLoadout());
await g.spin(2);
await wake();
const k0 = await page.evaluate(() => ({ turn: LOADOUT_KID.turn, rot: LOADOUT_KID.kid.group.rotation.y }));
await page.evaluate(() => { window.__pad.axes = [0, 0, -1, 0]; });
await g.spin(60);
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
await g.spin(2);
const k1 = await page.evaluate(() => ({ turn: LOADOUT_KID.turn, rot: LOADOUT_KID.kid.group.rotation.y }));
check('on the Loadout screen the right stick turns the kid all the way round (1 s: about 2.4 rad)', k0.turn - k1.turn > 2 && k0.turn - k1.turn < 2.8, { k0, k1 });
await page.evaluate(() => closeLoadout());
await g.spin(2);
await page.keyboard.press('ShiftLeft');   // the keys again for the ladder's first look

// 2) the treehouse ladder: W / S / Space become the stick and A
await g.scenario('stoneglen_treehouse');
await page.evaluate(() => { Game.player.invuln = true; applyBBHit = () => {}; Game.mouse.locked = true; });
const foot = () => page.evaluate(() => {
  const p = Game.player; p.pos.x = 0; p.pos.y = 0; p.pos.z = -3.6; p.velY = 0; p.onGround = true; p.climbing = null;
  p._lastGroundY = 0; p.yaw = 0; p.pitch = 0;
  stepGame(1 / 60); stepGame(1 / 60);
  return document.getElementById('interactPrompt').textContent.replace(/\s+/g, ' ').trim();
});
const kFoot = await foot();
check('at the ladder foot, keys: "W climb"', kFoot === 'W climb', kFoot);
await wake();
const pFoot = await foot();
check('with the pad: "Stick ↑ climb"', pFoot === 'Stick ↑ climb', pFoot);
await page.evaluate(() => { window.__pad.axes = [0, -1, 0, 0]; });
await g.spin(30);
const pOn = await page.evaluate(() => ({ climbing: !!Game.player.climbing,
  text: document.getElementById('interactPrompt').textContent.replace(/\s+/g, ' ').trim() }));
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
await g.spin(2);
check('on the ladder by the stick: "Stick ↑ up · Stick ↓ down · A let go"', pOn.climbing && pOn.text === 'Stick ↑ up · Stick ↓ down · A let go', pOn);

// 3) the ammo box and the pause and forfeit buttons
const amm = await page.evaluate(() => { Game.gun.ammo = 0; Game.gun.tapedMag = null; updateAmmoHud(); return document.getElementById('ammoStatus').textContent; });
check('the ammo box with the pad: "MAG EMPTY · BACK TO FORFEIT"', amm === 'MAG EMPTY · BACK TO FORFEIT', amm);
check('the jam bar says HOLD X', (await txt('#jamBar .jam-label')) === 'JAMMED — HOLD X TO CLEAR');
await tap(B.START);
const pz = await page.evaluate(() => ({ paused: !!Game.paused }));
check('Start pauses, and the buttons name START and BACK', pz.paused && (await txt('#pauseResumeBtn')) === 'RESUME START'
  && (await txt('#pauseForfeitBtn')) === 'FORFEIT BACK', { pz, r: await txt('#pauseResumeBtn'), f: await txt('#pauseForfeitBtn') });
await tap(B.BACK);
const ask = await page.evaluate(() => !!Game.forfeitAsk);
check('Back asks to forfeit, and its buttons name B and A', ask && (await txt('#forfeitKeepBtn')) === 'KEEP PLAYING B'
  && (await txt('#forfeitYesBtn')) === 'FORFEIT A', { ask, k: await txt('#forfeitKeepBtn'), y: await txt('#forfeitYesBtn') });
await tap(B.B);
await page.keyboard.press('ShiftLeft');
await g.spin(2);
check('with a key pressed the buttons say ESC, F and ENTER again', (await txt('#pauseResumeBtn')) === 'RESUME ESC'
  && (await txt('#pauseForfeitBtn')) === 'FORFEIT F' && (await txt('#forfeitYesBtn')) === 'FORFEIT ENTER'
  && (await txt('#jamBar .jam-label')) === 'JAMMED — HOLD R TO CLEAR');
await page.evaluate(() => { if (Game.paused) resumeFromPause(); });
const ammK = await page.evaluate(() => { updateAmmoHud(); return document.getElementById('ammoStatus').textContent; });
check('and the ammo box says F', ammK === 'MAG EMPTY · F TO FORFEIT', ammK);

// 4) the tutorial's steps
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('lose'); });
await g.scenario('winnmark_tutorial');
const step = () => txt('#tutInstr');
const t0 = await step();
check('the tutorial, keys: WASD and Shift', /W A S D/.test(t0) && /Shift/.test(t0), t0);
await wake();
const t1 = await step();
check('the tutorial with the pad: the left stick and L3, no WASD', /the Left Stick to walk/.test(t1) && /L3/.test(t1) && !/W A S D|Shift/.test(t1), t1);
const t2 = await page.evaluate(() => { Tutorial.step = 1; Tutorial._renderStep(); return document.getElementById('tutInstr').textContent; });
check('step 2 says LT, not Right-Mouse', /Hold LT/.test(t2) && !/Mouse/.test(t2), t2);
const t3 = await page.evaluate(() => { Tutorial.step = 2; Tutorial._renderStep(); return document.getElementById('tutInstr').textContent; });
check('step 3 says Pull RT', /Pull RT/.test(t3), t3);
const t5 = await page.evaluate(() => { Tutorial.step = 4; Tutorial._renderStep(); return document.getElementById('tutInstr').textContent; });
check('step 5 says X to reload', /Press X to reload/.test(t5), t5);
await page.mouse.move(300, 300); await page.mouse.move(360, 340);
check('a mouse move puts the step back on the keys', /Press R to reload/.test(await step()));

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
