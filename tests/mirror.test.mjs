// v1.107 (backlog D.6, Michael: C — part 1): the bathroom door is the mirror now.
// v1.108 (part 2): NEW GAME opens on the mirror once (CONTINUE doesn't), and height moves the eye and hitbox. E there opens the character
// screen with Mike in 3D; clicking choices changes Game.persist.look and rebuilds the preview; DONE goes back to
// the bedroom; the look survives a save and load, and an old save without one gets the default look.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
// NEW GAME, clicked as the player would: the mirror comes first, DONE goes to the bedroom
await page.evaluate(() => document.getElementById('startBtn').click());
await page.waitForFunction(() => Game.mode === 'bedroom' || Game.mode === 'mirror', null, { timeout: 60000 });
check('NEW GAME opens on the mirror', await g.mode() === 'mirror', await g.mode());
await page.evaluate(() => document.getElementById('mirrorDoneBtn').click());
check('its DONE goes on to the bedroom', await g.mode() === 'bedroom');
const it = await page.evaluate(() => { const i = Game.interactables.find(i => i.type === 'bathroom'); return { prompt: i.prompt, label: i.label }; });
check('the bathroom door reads "Look in the bathroom mirror", label Mirror', /mirror/i.test(it.prompt) && it.label === 'Mirror', it);

// walk to the door's trigger and press E
await page.evaluate(() => {
  const i = Game.interactables.find(i => i.type === 'bathroom');
  Game.player.pos.x = i.pos.x; Game.player.pos.z = i.pos.z; Game.player.yaw = Math.PI / 2;
  for (let k = 0; k < 5; k++) stepGame(1 / 60);
});
const focus = await page.evaluate(() => Game.focusedInteractable && Game.focusedInteractable.type);
check('at the bathroom door the mirror is the focused interactable', focus === 'bathroom', focus);
await page.keyboard.press('KeyE');
const open = await page.evaluate(() => ({ mode: Game.mode, rows: [...document.querySelectorAll('#mirrorOptions .mirror-row')].map(r => r.dataset.key), kid: !!(MIRROR.kid && MIRROR.kid.group.children.length) }));
check('E opens the mirror screen', open.mode === 'mirror', open.mode);
check('it offers height, build, hair, hair colour, skin, shirt, pants and glasses', open.rows.join() === 'height,build,hairStyle,hairColor,skinColor,shirtColor,pantsColor,glasses', open.rows);
check('the preview has Mike\'s kid mesh in it', open.kid);

// click one choice in each row (the last option), as a player would
const picked = await page.evaluate(() => {
  const out = {};
  for (const key of ['height', 'build', 'hairStyle', 'hairColor', 'skinColor', 'shirtColor', 'pantsColor', 'glasses']) {
    const btns = document.querySelectorAll(`#mirrorOptions .mirror-row[data-key="${key}"] .mirror-opt`);
    btns[btns.length - 1].click();
    out[key] = Game.persist.look[key];
  }
  const kidH = new THREE.Box3().setFromObject(MIRROR.kid.group).getSize(new THREE.Vector3()).y;
  return { look: out, onCount: document.querySelectorAll('#mirrorOptions .mirror-opt.on').length, kidH: +kidH.toFixed(2) };
});
console.log('  ', JSON.stringify(picked));
check('each click lands in the look', picked.look.height === 'tall' && picked.look.build === 'heavy' && picked.look.hairStyle === 'long' && picked.look.glasses === true && picked.look.skinColor === 0x5a3420, picked.look);
check('one choice is lit per row', picked.onCount === 8, picked.onCount);
const shortH = await page.evaluate(() => { document.querySelector('#mirrorOptions .mirror-row[data-key="height"] .mirror-opt').click(); return +new THREE.Box3().setFromObject(MIRROR.kid.group).getSize(new THREE.Vector3()).y.toFixed(2); });
check('the preview re-builds: short Mike is shorter than tall Mike', shortH < picked.kidH, { shortH, tallH: picked.kidH });
await g.shot('mirror');
await page.evaluate(() => document.getElementById('mirrorDoneBtn').click());
check('DONE goes back to the bedroom', await g.mode() === 'bedroom');

// save and load round trip, and an old save with no look
const rt = await page.evaluate(() => {
  saveGame();
  const before = JSON.stringify(Game.persist.look);
  Game.persist.look.height = 'average';
  loadGame();
  const after = JSON.stringify(Game.persist.look);
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY)); delete raw.persist.look; localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
  loadGame();
  return { same: before === after, old: Game.persist.look };
});
check('the look survives a save and load', rt.same);
check('a save from before v1.107 loads with the default look', rt.old && rt.old.height === 'average' && rt.old.hairStyle === 'short', rt.old);
// height moves the eye and the hitbox top, by 8 cm either way
const eyes = {};
for (const h of ['short', 'average', 'tall']) {
  await page.evaluate(h => { Game.persist.look.height = h; }, h);
  await g.scenario('winnmark_seth_house');
  eyes[h] = await page.evaluate(() => ({ eye: +Game.player.eyeOffsetStand.toFixed(2), crouch: +Game.player.eyeOffsetCrouch.toFixed(3), height: +Game.player.height.toFixed(2), cam: +(Game.camera.position.y - Game.player.pos.y).toFixed(2) }));
  await page.evaluate(() => endScenario('lose'));
}
console.log('  ', JSON.stringify(eyes));
check('eye height: short 1.27, average 1.35, tall 1.43', eyes.short.eye === 1.27 && eyes.average.eye === 1.35 && eyes.tall.eye === 1.43, eyes);
check('hitbox height: short 1.42, average 1.5, tall 1.58', eyes.short.height === 1.42 && eyes.average.height === 1.5 && eyes.tall.height === 1.58, eyes);

// CONTINUE from a save goes straight to the bedroom, no mirror
await page.evaluate(() => saveGame());
await page.reload();
await page.waitForFunction(() => typeof Game !== 'undefined' && document.getElementById('continueBtn') && document.getElementById('continueBtn').style.display !== 'none', null, { timeout: 60000 });
await page.evaluate(() => document.getElementById('continueBtn').click());
await page.waitForFunction(() => Game.mode !== 'title', null, { timeout: 60000 });
check('CONTINUE goes straight to the bedroom', await g.mode() === 'bedroom', await g.mode());
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
