// v1.258 (backlog D.41, Michael 15 Oct: the bedroom's map is ugly; make it look like the actual map). The map table's
// paper now carries the map screen's own map and zone pins. Checked: it is painted (and again on the next visit), it is
// the map (the land colour, the river's blue, parks' green, and many colours, not a blank sheet with ink strokes), the
// pins are where the map screen has them, red when open and grey when locked; it lies north to the wall and west on your
// left as you stand at the table; it still lies on the table (bedroom-shelves checks the 1 mm).
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const waitPaint = async (n) => { for (let i = 0; i < 100; i++) { if (await page.evaluate(n => (Game._mapTablePaint || 0) >= n, n)) return true; await g.spin(1); await page.waitForTimeout(20); } return false; };
check('the map table paper is painted once the room is built', await waitPaint(1));
const r = await page.evaluate(() => {
  let paper = null; Game.scene.traverse(o => { if (o.name === 'mt_paper') paper = o; });
  const cv = paper.material.map && paper.material.map.image, c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const px = (fx, fy) => Array.from(c.getImageData(Math.round(fx * W), Math.round(fy * H), 1, 1).data.slice(0, 3));
  const colours = new Set(); const d = c.getImageData(0, 0, W, H).data;
  for (let i = 0; i < d.length; i += 4 * 997) colours.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
  // the pin heads: 1.41 r above the point, r = 22 px at this size
  const head = (key) => { const p = document.querySelector(`#worldMap .pin[data-scenario="${key}"]`); return px(parseFloat(p.style.left) / 100, parseFloat(p.style.top) / 100 - 31 / H); };
  const open = Object.keys(PIN_SCENARIO_GROUPS).filter(k => document.querySelector(`#worldMap .pin[data-scenario="${k}"]`) && isZoneUnlocked(k));
  const shut = Object.keys(PIN_SCENARIO_GROUPS).filter(k => document.querySelector(`#worldMap .pin[data-scenario="${k}"]`) && !isZoneUnlocked(k));
  // orientation: where the texture's top (v = 1) and left (u = 0) land in the world
  paper.updateMatrixWorld(true);
  const pos = paper.geometry.attributes.position, uv = paper.geometry.attributes.uv, at = (u, v) => {
    for (let i = 0; i < uv.count; i++) if (uv.getX(i) === u && uv.getY(i) === v) return new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(paper.matrixWorld);
  };
  const tl = at(0, 1), tr = at(1, 1), bl = at(0, 0);
  return { size: [W, H], colours: colours.size, land: px(0.02, 0.02), open: open.map(k => [k, head(k)]), shut: shut.map(k => [k, head(k)]),
    topX: +((tl.x + tr.x) / 2).toFixed(3), bottomX: +bl.x.toFixed(3), leftZ: +((tl.z + bl.z) / 2).toFixed(3), rightZ: +tr.z.toFixed(3) };
});
console.log('   paper:', JSON.stringify(r));
check('it is the map: the land colour at its corner, and many colours (roads, parks, the river, labels)',
  Math.abs(r.land[0] - 0xef) < 8 && Math.abs(r.land[1] - 0xe5) < 8 && Math.abs(r.land[2] - 0xcf) < 8 && r.colours > 12, { land: r.land, colours: r.colours });
check('open zones carry a red pin where the map screen has them', r.open.length > 0 && r.open.every(([, c]) => c[0] > 150 && c[1] < 110 && c[2] < 100), r.open);
check('locked zones carry a grey pin', r.shut.length > 0 && r.shut.every(([, c]) => Math.abs(c[0] - c[1]) < 12 && Math.abs(c[1] - c[2]) < 12 && c[0] > 100 && c[0] < 170), r.shut);
check('north lies toward the wall, west on your left as you face it', r.topX < r.bottomX && r.leftZ > r.rightZ, r);
// win the first match of the next zone and come back: the paper is painted again, that zone's pin now red
const again = await page.evaluate(() => {
  const k = Object.keys(PIN_SCENARIO_GROUPS).find(z => !isZoneUnlocked(z) && document.querySelector(`#worldMap .pin[data-scenario="${z}"]`));
  for (const id of Object.keys(SCENARIOS)) Game.persist.completed[id] = true;
  const n = Game._mapTablePaint; enterBedroom(); return { k, n, unlocked: isZoneUnlocked(k) };
});
check('the next visit paints it again', await waitPaint(again.n + 1), again);
const after = await page.evaluate((k) => {
  let paper = null; Game.scene.traverse(o => { if (o.name === 'mt_paper') paper = o; });
  const cv = paper.material.map.image, c = cv.getContext('2d'), p = document.querySelector(`#worldMap .pin[data-scenario="${k}"]`);
  return Array.from(c.getImageData(Math.round(parseFloat(p.style.left) / 100 * cv.width), Math.round(parseFloat(p.style.top) / 100 * cv.height) - 31, 1, 1).data.slice(0, 3));
}, again.k);
check(`a zone opened since (${again.k}) shows red`, again.unlocked && after[0] > 150 && after[1] < 110, after);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
