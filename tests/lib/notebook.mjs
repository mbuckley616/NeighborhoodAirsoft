// v1.283 (D.46): helpers for the notebook-paper screens. lineReport(sel) walks every line of text on a .nb-paper page
// (outside its filled boxes and sticky-note buttons) and measures how far its baseline sits from the nearest blue
// rule; contrast(fg, bg) is the WCAG ratio of two CSS colours.
export const lineReport = (page, sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root || root.offsetParent === null && getComputedStyle(root).position !== 'fixed') return null;
  const RULE = parseFloat(getComputedStyle(root).getPropertyValue('--nb-rule')) || 26;
  const r0 = root.getBoundingClientRect(), origin = r0.top - root.scrollTop;
  const skip = '.nb-btn, .reward, .rs-cell, .rs-damage, .brief-objective, .nb-box, .sc-card, .map-area, .wb-viewport, canvas, svg, button, input, kbd';
  const out = [];
  const ctx = document.createElement('canvas').getContext('2d');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (el.closest(skip)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || !el.getClientRects().length) continue;
    // the baseline of the text's first line: the bottom of its first glyph box less the font's descent (a probe
    // element inserted beside the text would become a flex item of its own in a flex row)
    const range = document.createRange(); range.selectNodeContents(n);
    const box = [...range.getClientRects()].find(r => r.width > 0);
    if (!box) continue;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const base = box.bottom - ctx.measureText(n.textContent.trim()).fontBoundingBoxDescent;
    if (base < r0.top || base > r0.bottom) continue;   // scrolled out of the page
    const off = ((base - origin) % RULE + RULE) % RULE;   // the rule is the band's 6th pixel from the bottom
    let d = off - (RULE - 5.5); if (d < -RULE / 2) d += RULE;
    out.push({ text: n.textContent.trim().slice(0, 28), size: parseFloat(cs.fontSize), d: +d.toFixed(1), color: cs.color, opacity: +cs.opacity });
  }
  return out;
}, sel);
const lum = (c) => {
  const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (fg, bg) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
