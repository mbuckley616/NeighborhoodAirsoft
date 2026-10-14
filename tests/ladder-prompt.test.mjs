// v1.142 (backlog D.7, Michael: A): the on-screen ladder prompt. At the treehouse ladder's foot, looking at it, the
// prompt reads "W climb"; on the ladder it lists W / S / Space; up top in the rail's gap, looking out, "S climb down";
// anywhere else, and after the round, it is hidden. Time through stepGame.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;

await g.scenario('stoneglen_treehouse');
await page.evaluate(() => { Game.player.invuln = true; applyBBHit = () => {}; });

const at = (o) => page.evaluate((o) => {
  const p = Game.player; Game.mouse.locked = true;
  if (o.at) { p.pos.x = o.at[0]; p.pos.y = o.at[1]; p.pos.z = o.at[2]; p.velY = 0; p.onGround = true; p.climbing = null; p._lastGroundY = o.at[1]; }
  if (o.yaw != null) { p.yaw = o.yaw; p.pitch = 0; }
  Game.keys['KeyW'] = !!o.w; Game.keys['KeyS'] = !!o.s;
  for (let i = 0; i < (o.n || 1); i++) { const was = !!p.climbing; stepGame(1 / 60); if (o.untilOff && was && !p.climbing) { Game.keys['KeyS'] = false; stepGame(1 / 60); break; } }
  Game.keys['KeyW'] = false; Game.keys['KeyS'] = false;
  const el = document.getElementById('interactPrompt');
  return { shown: el.style.display === 'block', text: el.textContent.replace(/\s+/g, ' ').trim(), climbing: !!p.climbing, y: +p.pos.y.toFixed(2) };
}, o);

const gate = await at({ at: [-13, 0, 14.4], yaw: -0.55, n: 2 });
check('at the side gate there is no prompt', !gate.shown, gate);
const foot = await at({ at: [0, 0, -3.6], yaw: 0, n: 2 });
check('at the ladder foot, looking at it: "W climb"', foot.shown && foot.text === 'W climb', foot);
const away = await at({ at: [0, 0, -3.6], yaw: Math.PI, n: 2 });
check('at the foot, looking away: no prompt (W would not climb)', !away.shown, away);
const on = await at({ at: [0, 0, -3.6], yaw: 0, w: true, n: 30 });
check('on the ladder: the three keys', on.climbing && on.shown && /^W up · S down · Space let go$/.test(on.text), on);
const top = await at({ w: true, n: 120 });
check('at the top he steps off and the climb prompt goes (he is not in the gap)', !top.climbing && top.y === 2.6 && !top.shown, top);
const gap = await at({ at: [0, 2.6, -4.5], yaw: 0, n: 2 });
check('in the rail\'s gap up top, back to the ladder: "S climb down"', gap.shown && gap.text === 'S climb down', gap);
const down = await at({ s: true, n: 30 });
check('S from the gap takes the ladder down, with the three keys shown', down.climbing && down.shown && /let go/.test(down.text), down);
const ground = await at({ s: true, n: 180, untilOff: true });
check('at the bottom the climb ends and the prompt is "W climb" again', !ground.climbing && ground.y === 0 && ground.text === 'W climb', ground);

// the result screen never keeps it
await at({ at: [0, 0, -3.6], yaw: 0, n: 2 });
const after = await page.evaluate(() => { endScenario('lose'); return document.getElementById('interactPrompt').style.display; });
check('after the round ends the prompt is hidden', after === 'none', after);

check('no page errors', g.errs.length === 0, g.errs);
await g.close();
