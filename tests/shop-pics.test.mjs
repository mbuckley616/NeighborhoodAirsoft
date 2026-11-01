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
check('the Guns tab lists all 36 guns (v1.411: the KSG; v1.410: the Magnum; v1.404: the M14; v1.403: the Thompson; v1.399: the Gas Pistol; v1.398: the SPAS-12; v1.325: the FAMAS; v1.326: the electrics; v1.327: the Burst Rifle; v1.328: the Semi-Auto Shotgun; v1.335: the M249; v1.336: the L96; v1.346: the P90; v1.348: the Vector; v1.371: the G36C; v1.372: the AUG; v1.373: the M4; v1.395: the SVD; v1.396: the RPK)', rows.length === 36 && order.length === 36, rows.map(r => r.name));
check('every gun row has a picture in place of the ⌐ glyph', rows.every(r => r.pic && r.glyph === ''), rows.filter(r => !r.pic));
const icons = await measure();
check('the pictures are in GUN_ORDER, drawn at 112×112 for a 56 px box',
  JSON.stringify(icons.map(i => i.gun)) === JSON.stringify(order) && icons.every(i => i.w === 112 && i.h === 112),
  icons.map(i => [i.gun, i.w, i.h]));
check('each gun fills its frame across (at least 80% of the width)', icons.every(i => i.spanX >= 0.8),
  icons.map(i => [i.gun, i.spanX]));
check('each picture has the gun drawn on it (at least 6% of its pixels)', icons.every(i => i.fill >= 0.06),
  icons.map(i => [i.gun, i.fill]));
check('no two guns share a picture', new Set(icons.map(i => i.hash)).size === 36);
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

// v1.210: the Clothes tab's hats, tops and shorts, each on a plain kid, framed on the part it covers
await page.evaluate(() => { shopState.view = 'list'; shopState.detailGun = null; });
await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Clothes').click());
const clothesRows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-item')].map(r => ({
  name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), pic: !!r.querySelector('.shop-item-icon.pic img'),
  glyph: r.querySelector('.shop-item-icon').textContent })));
const want = await page.evaluate(() => KID_HAT_ORDER.length + KID_TOP_ORDER.length + KID_SHORTS_ORDER.length);
check(`the Clothes tab's ${want} rows each have a picture in place of the glyph`, clothesRows.length === want && clothesRows.every(r => r.pic && r.glyph === ''),
  clothesRows.filter(r => !r.pic || r.glyph));
const cl = await measure();
check('the clothes pictures are drawn at 112×112 and the kid fills them (over 25% of the pixels)', cl.length === want &&
  cl.every(i => i.w === 112 && i.h === 112 && i.fill > 0.25), cl.map(i => [i.hash.slice(-8), i.fill]));
check('no two clothes share a picture', new Set(cl.map(i => i.hash)).size === want);
// each picture shows its item's colour: the commonest strong colour near the frame's centre is close to the item's
const tint = await page.evaluate(() => {
  const all = [...KID_HAT_ORDER.map(id => ['hat', id, KID_HATS[id].color]), ...KID_TOP_ORDER.map(id => ['top', id, KID_TOPS[id].color]),
    ...KID_SHORTS_ORDER.map(id => ['shorts', id, KID_SHORTS[id].color])];
  return all.map(([k, id, col]) => {
    const img = document.querySelector(`#shopScreen img[data-item="${k}:${id}"]`);
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const want = [(col >> 16) & 255, (col >> 8) & 255, col & 255];
    let best = 1e9;   // the nearest drawn pixel to the item's colour, lit or shaded (scaled to the same brightness)
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const px = [d[i], d[i + 1], d[i + 2]], sw = want.reduce((a, b) => a + b, 1), sp = px.reduce((a, b) => a + b, 1);
      const dist = Math.hypot(...px.map((v, j) => v / sp - want[j] / sw)) * 255;
      if (dist < best) best = dist;
    }
    return [k + ':' + id, Math.round(best)];
  });
});
check('each picture has its item’s colour in it (hue within 12/255)', tint.every(t => t[1] <= 12), tint);
await g.shot('shop-pics-clothes');

// v1.210: the Gear tab's belt and holster (v1.249: and the pool noodle), eye pro, armour and shoes, on the same kid, framed on the piece
await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Gear').click());
const gearRows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-item')].map(r => ({
  name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), pic: !!r.querySelector('.shop-item-icon.pic img') })));
const wantGear = await page.evaluate(() => 3 + Object.keys(EYEWEAR).length + Object.keys(ARMOR).length + Object.keys(SHOES).length);
check(`the Gear tab's ${wantGear} rows each have a picture`, gearRows.length === wantGear && gearRows.every(r => r.pic), gearRows.filter(r => !r.pic));
const ge = await measure();
check('the gear pictures are drawn at 112×112 with something on them (over 10% of the pixels)', ge.length === wantGear &&
  ge.every(i => i.w === 112 && i.h === 112 && i.fill > 0.1), ge.map(i => i.fill));
check('no two gear rows share a picture', new Set(ge.map(i => i.hash)).size === wantGear);
const shoes = await page.evaluate(() => [...document.querySelectorAll('#shopScreen img[data-item^="shoes:"]')].map(i => i.dataset.item));
check('the shoes rows show the pairs: one picture for each of the four', shoes.length === 4, shoes);
await g.shot('shop-pics-gear');

// v1.211: the Ammo tab's BB packs and speed loaders, and the Mods tab's parts, each mounted alone on the AR
await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Ammo').click());
const ammoRows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-item')].map(r => ({
  name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), pic: !!r.querySelector('.shop-item-icon.pic img'),
  glyph: r.querySelector('.shop-item-icon').textContent })));
check('the Ammo tab\'s 7 rows (4 BB packs, 3 speed loaders) each have a picture in place of the glyph',
  ammoRows.length === 7 && ammoRows.every(r => r.pic && r.glyph === ''), ammoRows);
const am = await measure();
// v1.330 (D.66): the 2,000 pack is a tall bottle now, as Michael asked ("look almost like a coke bottle"), so it fills
// less of its square than a bag: over 20%
check('the ammo pictures are drawn at 112×112: the packs fill over 30% of the pixels (the tall 2,000 bottle 20%), the thin loaders over 8%', am.length === 7 &&
  am.every((i, k) => i.w === 112 && i.h === 112 && i.fill > (k === 2 ? 0.2 : k < 4 ? 0.3 : 0.08)), am.map(i => i.fill));
check('each ammo item fills its frame across or top to bottom (at least 80%)', am.every(i => Math.max(i.spanX, i.spanY) >= 0.8),
  am.map(i => [i.spanX, i.spanY]));
check('no two ammo rows share a picture', new Set(am.map(i => i.hash)).size === 7);
console.log('    ammo (drawn, across, down):', am.map(i => `${i.fill} ${i.spanX} ${i.spanY}`).join('; '));
await g.shot('shop-pics-ammo');

await page.evaluate(() => [...document.querySelectorAll('#shopScreen .cat-tab')].find(e => e.textContent === 'Mods').click());
const modRows = await page.evaluate(() => [...document.querySelectorAll('#shopScreen .shop-item')].map(r => ({
  name: r.querySelector('.shop-item-name').childNodes[0].textContent.trim(), pic: !!r.querySelector('.shop-item-icon.pic img'),
  glyph: r.querySelector('.shop-item-icon').textContent })));
const wantMods = await page.evaluate(() => Object.keys(ATTACHMENTS).length);
check(`the Mods tab's ${wantMods} rows each have a picture in place of the ⊹ glyph`,
  modRows.length === wantMods && modRows.every(r => r.pic && r.glyph === ''), modRows);
const mo = await measure();
check('the mods pictures are drawn at 112×112 with something on them (over 8% of the pixels)', mo.length === wantMods &&
  mo.every(i => i.w === 112 && i.h === 112 && i.fill > 0.08), mo.map(i => i.fill));
check('no two mods share a picture', new Set(mo.map(i => i.hash)).size === wantMods);
// the part is in the middle of its picture: the frame is fitted on it, so its own pixels change the centre
const centred = await page.evaluate(() => Object.keys(ATTACHMENTS).map(aid => {
  const box = new THREE.Box3();
  const gun = buildBareGunMesh('ar'); const acc = ensureFPGunAccessory(gun, 'ar');
  updateFPGunAccessory(gun, 'ar', [{ type: aid, slot: ATTACHMENTS[aid].slot, placement: ATTACHMENTS[aid].slot === 'rail' ? 'left' : ATTACHMENTS[aid].slot }]);
  const shown = [acc.redDotOptic, acc.scopeOptic, acc.laserUnit, acc.flashUnit, ...Object.values(acc.underParts.meshes)].filter(m => m && m.visible).length;
  return [aid, shown];
}));
check('each part is the one thing mounted on its gun', centred.every(c => c[1] === 1), centred);
const held = await page.evaluate(() => getMountedAccessories('ar').length);
check('drawing them mounts nothing on your own AR', held === 0, held);
await g.shot('shop-pics-mods');

// v1.212: the gun page's Magazines and Spare Mags rows, a mag taller for more BBs, a pair for a spare
const magRes = [];
for (const gt of ['pistol', 'ar', 'mac10']) {
  await page.evaluate(gt => { shopState.view = 'gun'; shopState.detailGun = gt; renderShop(); }, gt);
  magRes.push(await page.evaluate(gt => {
    const rows = [...document.querySelectorAll('#shopItems .shop-item')].filter(r => r.querySelector('img[data-item^="mag:"], img[data-item^="spare:"]') ||
      ['▮', '▯'].includes(r.querySelector('.shop-item-icon').textContent));
    const cfg = GUN_MAGS[gt];
    // the drawn rows' heights: the topmost drawn pixel of each picture
    const tops = rows.map(r => {
      const img = r.querySelector('img'); if (!img) return null;
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      let top = cv.height, x0 = cv.width, x1 = -1, n = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { n++; if (y < top) top = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      return { item: img.dataset.item, w: cv.width, height: +(1 - top / cv.height).toFixed(2), across: +((x1 - x0 + 1) / cv.width).toFixed(2), fill: +(n / cv.width / cv.height).toFixed(3) };
    });
    return { gt, want: cfg.mags.length + cfg.spares.length, rows: rows.length, tops };
  }, gt));
}
check('every Magazines and Spare Mags row on the pistol, AR and MAC-10 pages has a picture', magRes.every(m => m.rows === m.want && m.tops.every(Boolean)),
  magRes.map(m => [m.gt, m.rows, m.want]));
const pm = magRes[0].tops;
check('the pistol\'s 20-round mag stands taller than its 10-round mag', pm[1].height > pm[0].height + 0.03, pm.map(t => [t.item, t.height]));
check('a spare-mag picture is a pair: wider than the single mag of the same size', pm[2].across > pm[0].across * 1.5, pm.map(t => [t.item, t.across]));
check('the mag pictures are drawn at 112×112 with the mag over 5% of the pixels', magRes.every(m => m.tops.every(t => t.w === 112 && t.fill > 0.05)),
  magRes.map(m => m.tops.map(t => t.fill)));
console.log('    mags (item, height, across):', magRes.map(m => m.tops.map(t => `${t.item} ${t.height} ${t.across}`).join('; ')).join(' | '));
await g.shot('shop-pics-mags');

// The workbench still mounts parts on its own copy (the bare model was split out of it)
const wb = await page.evaluate(() => {
  const m = buildWorkbenchGun('ar');
  return { acc: !!m.userData.accessories, kids: m.children.length };
});
check('the workbench gun still carries its accessory rig', wb.acc, wb);
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
