// v1.163 (Found in play, critic v1.159): Price Check's ally Eric held 'advancing' within 1 m of (17.2, −2.4), the gap
// between the store's four chest freezers, for 6–15 s in 3 of 10 rounds. pickBoundCover judged "forward" by a cover's
// centre; for an 8 m freezer end-on to the target the centre is metres nearer and the stand spot (its near end) is level
// with him, so he bounded between the two freezers' ends across the gap. Checks a pick from that spot never offers a
// cover whose stand spot isn't at least 1 m nearer the target, and that in real rounds Eric no longer parks there.
import { boot, check } from './lib/game.mjs';
const g = await boot(process.env.SRC ? { src: process.env.SRC } : {}); const { page } = g;
await g.bedroom();
await g.scenario('store_price_check_3v3');
const pick = await page.evaluate(() => {
  const e = Game.scenario.enemies.find(k => k.charId === 'eric'), C = Game.scenario.cover;
  const out = [];
  for (const tx of [9.6, 12.2, 14.9, 17.3]) {
    const tgt = { x: tx, y: 0, z: -23 };
    e.pos.set(17.26, 0, -2.45); e.flankSide = -1;
    e._boundCover = C.find(c => c.minX === 14.5 && c.minZ === -11) || null;   // at the west freezer's south end
    e._boundBanCover = null;
    const c = pickBoundCover(e, C, tgt);
    if (!c) { out.push({ tx, none: true }); continue; }
    const sp = coverStandPos(c, tgt);
    const gain = Math.hypot(tgt.x - 17.26, tgt.z + 2.45) - Math.hypot(tgt.x - sp.x, tgt.z - sp.z);
    out.push({ tx, sp: [+sp.x.toFixed(2), +sp.z.toFixed(2)], gain: +gain.toFixed(2) });
  }
  return out;
});
console.log('  picks from the freezer gap', JSON.stringify(pick));
check('from the freezer gap, every bound offered gets him at least 1 m nearer the target', pick.every(p => p.none || p.gain >= 1), pick);
await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); }); await g.spin(3);

const R = 6, rows = [];
for (let r = 0; r < R; r++) {
  await g.scenario('store_price_check_3v3');
  rows.push(await page.evaluate(() => {
    const p = Game.player, real = applyBBHit;
    applyBBHit = (bb, t) => { if (t === p) return; return real(bb, t); };
    const e = Game.scenario.enemies.find(k => k.charId === 'eric');
    let a = null, t0 = 0, adv = 0, worst = 0;
    for (let i = 0; i < 120 * 60 && Game.mode === 'scenario'; i++) {
      stepGame(1 / 60);
      if (e.health <= 0) { a = null; continue; }
      if (!a || Math.hypot(e.pos.x - a.x, e.pos.z - a.z) > 1) { a = { x: e.pos.x, z: e.pos.z }; t0 = i; adv = 0; }
      if (e.state === 'advancing') adv++;
      // a stay within 1 m spent mostly advancing (a short retreat or deploy blip doesn't end it)
      if (adv > (i - t0 + 1) * 0.8) worst = Math.max(worst, (i - t0) / 60);
    }
    applyBBHit = real;
    return +worst.toFixed(1);
  }));
  await page.evaluate(() => { if (Game.mode === 'scenario') endScenario('forfeit'); }); await g.spin(3);
}
console.log(`  Eric's longest stay within 1 m, mostly advancing, per round: ${JSON.stringify(rows)}`);
check(`in ${R} rounds of Price Check, Eric never holds advancing within 1 m for 5 s or more (was 6–15 s in 3 of 10)`, rows.every(w => w < 5), rows);
check('no page errors', g.errs.length === 0, g.errs.slice(0, 3));
await g.close();
