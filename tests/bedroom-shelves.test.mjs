// v1.215 (backlog D.26, small touches in the bedroom): the bookcases and the map table. No book goes up through the
// shelf above it or the top of the case, every book rests on a shelf or on another book, the books are the same every
// visit, and the map paper lies on its table.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();
const read = () => page.evaluate(() => {
  Game.scene.updateMatrixWorld(true);
  const cases = [];
  Game.scene.children.forEach(grp => {
    const books = []; const boards = [];
    grp.traverse(o => {
      if (!o.isMesh) return;
      if (o.name === 'bc_book') books.push(new THREE.Box3().setFromObject(o));
      else if (o.geometry.type === 'BoxGeometry' && Math.abs(o.geometry.parameters.height - 0.025) < 1e-6 && o.geometry.parameters.depth > 0.8) boards.push(new THREE.Box3().setFromObject(o));
    });
    if (books.length) cases.push({ books, boards });
  });
  const res = { cases: cases.length, books: 0, through: [], floating: [], sig: [] };
  for (const c of cases) {
    for (const b of c.books) {
      res.books++;
      res.sig.push([b.min.x, b.min.y, b.min.z, b.max.y].map(v => v.toFixed(3)).join(','));
      const above = c.boards.filter(s => s.min.y >= b.min.y + 0.01).sort((p, q) => p.min.y - q.min.y)[0];
      if (above && above.min.y - b.max.y < 0.015) res.through.push([+b.max.y.toFixed(3), +above.min.y.toFixed(3)]);
      const onShelf = c.boards.some(s => Math.abs(s.max.y - b.min.y) <= 0.003);
      const onBook = c.books.some(o => o !== b && Math.abs(o.max.y - b.min.y) <= 0.006 && o.max.x > b.min.x && o.min.x < b.max.x && o.max.z > b.min.z && o.min.z < b.max.z);
      if (!onShelf && !onBook) res.floating.push([+b.min.y.toFixed(3), +b.min.z.toFixed(3)]);
    }
  }
  let paper = null, table = null;
  Game.scene.traverse(o => { if (o.name === 'mt_paper') paper = new THREE.Box3().setFromObject(o); });
  Game.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.7 && o.geometry.parameters.depth === 1.0) table = new THREE.Box3().setFromObject(o); });
  res.paperGap = paper && table ? +(paper.min.y - table.max.y).toFixed(4) : null;
  return res;
});
const a = await read();
console.log(`    ${a.cases} bookcases, ${a.books} books`);
check('two bookcases with books on them', a.cases === 2 && a.books > 40, [a.cases, a.books]);
check('no book reaches within 1.5 cm of the shelf or top above it (they went 4.5 cm through)', a.through.length === 0, a.through);
check('every book rests on a shelf or on another book', a.floating.length === 0, a.floating);
check('the map paper lies on the table (within 1 mm; it floated 5 mm)', a.paperGap !== null && a.paperGap >= 0 && a.paperGap <= 0.001, a.paperGap);
// the same books on the next visit: go out to the map and come back
await page.evaluate(() => { enterBedroom(); });
await g.spin(2);
const b = await read();
check('the books are the same on the next visit', a.sig.join('|') === b.sig.join('|') && a.books === b.books, [a.books, b.books]);
await page.evaluate(() => { Game.player.pos.set(-1.0, 0, 0.3); Game.player.yaw = 1.75; Game.player.pitch = -0.2; });
await g.spin(2);
await g.shot('bedroom-shelves');
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
