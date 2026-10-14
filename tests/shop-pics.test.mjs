// v1.209 (backlog D.23, Michael 13 Oct): the shop's guns show a picture of their own model, in the row and large on
// the details page. Each picture is checked by its pixels: the gun fills the frame, and every gun's picture differs.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
await page.evaluate(() => { Game.persist.cash = 1000; openShop(); });
await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Guns').click());

// Reads a picture's pixels: how much of it is drawn, and the drawn part's box as fractions of the frame
const measure = () => page.evaluate(async sel => {
  const out = [];
  for (const img of document.querySelectorAll(sel)) {
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, x0 = cv.width, x1 = -1, y0 = cv.height, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 40) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    out.push({ gun: img.dataset.gun, w: cv.width, h: cv.height, fill: +(n / (cv.width * cv.height)).toFixed(3),
      spanX: +((x1 - x0 + 1) / cv.width).toFixed(2), spanY: +((y1 - y0 + 1) / cv.height).toFixed(2), src: img.src.length,
      hash: img.src.slice(-200) });
  }
  return out;
}, '#shopScreen .shop-item-icon.pic img');

const rows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-gun-row')].map(r => ({
  name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(),
  pic: !!r.querySelector('.shop-item-icon.pic img'), glyph: r.querySelector('.shop-item-icon').textContent })));
const order = await page.evaluate(() => GUN_ORDER.slice());
check('the Guns tab lists all 12 guns', rows.length === 12 && order.length === 12, rows.map(r => r.name));
check('every gun row has a picture in place of the ⌐ glyph', rows.every(r => r.pic && r.glyph === ''), rows.filter(r => !r.pic));
const icons = await measure();
check('the pictures are in GUN_ORDER, drawn at 112×112 for a 56 px box',
  JSON.stringify(icons.map(i => i.gun)) === JSON.stringify(order) && icons.every(i => i.w === 112 && i.h === 112),
  icons.map(i => [i.gun, i.w, i.h]));
check('each gun fills its frame across (at least 80% of the width)', icons.every(i => i.spanX >= 0.8),
  icons.map(i => [i.gun, i.spanX]));
check('each picture has the gun drawn on it (at least 6% of its pixels)', icons.every(i => i.fill >= 0.06),
  icons.map(i => [i.gun, i.fill]));
check('no two guns share a picture', new Set(icons.map(i => i.hash)).size === 12);
console.log('    icons (gun, drawn, span across, span down):', icons.map(i => `${i.gun} ${i.fill} ${i.spanX} ${i.spanY}`).join('; '));
await g.shot('shop-pics-list');

// The details page: a large picture above the row, of the same gun
const big = [];
for (const gt of ['pistol', 'ak47', 'sniper', 'bucket']) {
  await page.evaluate(gt => { shopState.view = 'gun'; shopState.detailGun = gt; renderShop(); }, gt);
  const r = await page.evaluate(async () => {
    const img = document.querySelector('#shopScreen .shop-gun-photo img');
    if (!img) return null;
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, x0 = cv.width, x1 = -1, y0 = cv.height, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++)
      if (d[(y * cv.width + x) * 4 + 3] > 40) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const box = img.getBoundingClientRect();
    const order = [...document.querySelectorAll('#shopItems > *')].map(e => e.className);
    return { gun: img.dataset.gun, w: cv.width, h: cv.height, shownW: Math.round(box.width), fill: +(n / (cv.width * cv.height)).toFixed(3),
      spanX: +((x1 - x0 + 1) / cv.width).toFixed(2), spanY: +((y1 - y0 + 1) / cv.height).toFixed(2), cap: document.querySelector('.shop-gun-photo-cap').textContent,
      photoBeforeRow: order.indexOf('shop-gun-photo') >= 0 && order.indexOf('shop-gun-photo') < order.findIndex(c => c.startsWith('shop-item')),
      rowPic: !!document.querySelector('#shopItems .shop-item .shop-item-icon.pic img[data-gun]') };
  });
  big.push(r);
  if (gt === 'ak47') await g.shot('shop-pics-detail');
}
check('each details page has a large picture of its gun', big.every((r, i) => r && r.gun === ['pistol', 'ak47', 'sniper', 'bucket'][i]), big.map(r => r && r.gun));
check('drawn at 840×380 and shown at least 400 px wide', big.every(r => r.w === 840 && r.h === 380 && r.shownW >= 400), big.map(r => [r.w, r.h, r.shownW]));
check('the gun fills the large picture across, or top to bottom when it is the taller (at least 80%)',
  big.every(r => Math.max(r.spanX, r.spanY) >= 0.8 && r.fill >= 0.04), big.map(r => [r.gun, r.spanX, r.spanY, r.fill]));
check('the picture sits between the header and the gun’s row, which has the small picture too', big.every(r => r.photoBeforeRow && r.rowPic));
check('its caption names the gun', big[1].cap.startsWith('AK') || big[1].cap.includes('AK'), big[1].cap);

// The workbench still mounts parts on its own copy (the bare model was split out of it)
const wb = await page.evaluate(() => {
  const m = buildWorkbenchGun('ar');
  return { acc: !!m.userData.accessories, kids: m.children.length };
});
check('the workbench gun still carries its accessory rig', wb.acc, wb);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
