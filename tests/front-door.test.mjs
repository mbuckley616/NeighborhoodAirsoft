// v1.88 (backlog A.1): a first-timer can go outside. At spawn the hall's front door is the nearest
// interactable, its prompt is "Go outside", and E opens the world map. On the map, clicking the
// Winnmark label on a new save opens Winnmark, not the locked Battleground pin sitting under it.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await g.spin(30);
const atSpawn = await page.evaluate(() => ({
  focused: Game.focusedInteractable && Game.focusedInteractable.type,
  prompt: document.getElementById('interactPrompt').textContent.trim(),
  label: (Game.interactables.find(i => i.type === 'front_door') || {})._labelEl?.textContent.trim(),
  pos: [Game.player.pos.x, Game.player.pos.z].map(v => +v.toFixed(2)),
}));
check('at spawn the front door is the focused interactable', atSpawn.focused === 'front_door', atSpawn);
check('its prompt reads "Go outside"', /Go outside/.test(atSpawn.prompt), atSpawn.prompt);
check('its label reads OUTSIDE', /outside/i.test(atSpawn.label || ''), atSpawn.label);

// from the top of the hall, facing back down it: the door's label is on screen
await page.evaluate(() => {
  Game.player.pos.z = 2.5 + 0.3; Game.player.yaw = Math.PI; for (let i = 0; i < 5; i++) stepGame(1 / 60);
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
});
const facing = await page.evaluate(() => {
  updateBedroomLabels();
  const el = Game.interactables.find(i => i.type === 'front_door')._labelEl;
  const r = el.getBoundingClientRect();
  return { yaw: Game.player.yaw, op: +el.style.opacity, x: Math.round(r.x), y: Math.round(r.y) };
});
check('facing the door, the OUTSIDE label shows', facing.op > 0.5 && facing.x > 0 && facing.x < 1280 && facing.y > 0 && facing.y < 720, facing);

// back at spawn, E goes outside
await page.evaluate(() => { const s = Scenes.bedroom.spawn; Game.player.pos.x = s.x; Game.player.pos.z = s.z; for (let i = 0; i < 5; i++) stepGame(1 / 60); });
await page.keyboard.press('KeyE');
check('E at the door opens the world map', await g.mode() === 'map');
await page.evaluate(() => closeMap());
check('the map closes back to the bedroom', await g.mode() === 'bedroom');

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
  for (const sc of ['winnmark_court', 'bunratty_court', 'locked', 'hollow']) for (const part of ['label', 'marker']) {
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
}
await page.setViewportSize({ width: 1280, height: 720 });
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
