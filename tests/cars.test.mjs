// Cars on slopes (backlog B.1): every parked car's four tyres should touch the ground, none buried, none
// hovering. Builds each map several times (car cover is placed at random) and, for every car, samples the
// tread circles of all four wheels in world space against the map's groundY. A wheel's gap is its lowest
// tread point minus the ground under that point: below zero is buried, above zero is hovering.
import { boot, check } from './lib/game.mjs';
const g = await boot(); const { page } = g;
await g.bedroom();

const BUILDS = [['buildWinnmarkCourtScene', 'day'], ['buildBunrattyCourtScene', 'day']];   // the Hollow has no cars
const REPEATS = 4;
const res = await page.evaluate(([builds, repeats]) => {
  const out = {};
  const v = new THREE.Vector3();
  for (const [fn, tod] of builds) {
    const gaps = [], worst = []; let bodyMin = Infinity;
    for (let r = 0; r < repeats; r++) {
      const built = window[fn](undefined, tod);
      const gy = built.groundY;
      // a car body obox: half-extents 1.8 × 0.775, base at the mesh foot
      const cars = built.obstacles.filter(o => o.shape === 'obox' && o.hx === 1.8 && Math.abs(o.hz - 0.775) < 1e-6 && o.baseYLocal === 0);
      for (const car of cars) {
        const grp = car.mesh; grp.updateMatrixWorld(true);
        const wheels = grp.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry');
        const carGaps = [];
        for (const w of wheels) {
          const R = w.geometry.parameters.radiusTop, hw = w.geometry.parameters.height / 2;
          let gap = Infinity;
          // cylinder local: axis along Y, tread circle in XZ; sample both tread edges and the middle
          for (const yy of [-hw, 0, hw]) for (let k = 0; k < 48; k++) {
            const a = k / 48 * Math.PI * 2;
            v.set(R * Math.cos(a), yy, R * Math.sin(a)).applyMatrix4(w.matrixWorld);
            gap = Math.min(gap, v.y - gy(v.x, v.z));
          }
          carGaps.push(gap);
        }
        // the body's underside (car-local y = wheel radius, ±1.8 × ±0.775) must clear the ground too
        for (const bx of [-1.8, 0, 1.8]) for (const bz of [-0.775, 0.775]) {
          v.set(bx, 0.3, bz).applyMatrix4(grp.matrixWorld);
          bodyMin = Math.min(bodyMin, v.y - gy(v.x, v.z));
        }
        gaps.push(...carGaps);
        worst.push({ x: +grp.position.x.toFixed(1), z: +grp.position.z.toFixed(1), min: +Math.min(...carGaps).toFixed(3), max: +Math.max(...carGaps).toFixed(3) });
      }
      // throw the scene away
      built.scene && built.scene.traverse && built.scene.traverse(o => { o.geometry && o.geometry.dispose && o.geometry.dispose(); });
    }
    const buried = gaps.filter(x => x < -0.02).length, hover = gaps.filter(x => x > 0.03).length;
    out[fn] = { cars: worst.length, wheels: gaps.length, minGap: +Math.min(...gaps).toFixed(3), maxGap: +Math.max(...gaps).toFixed(3),
      buried, hover, bodyMin: +bodyMin.toFixed(3), worstCar: worst.sort((a, b) => a.min - b.min)[0] };
  }
  return out;
}, [BUILDS, REPEATS]);

for (const [fn, r] of Object.entries(res)) {
  const name = fn.replace(/^build|Scene$/g, '');
  check(`${name}: cars found`, r.cars > 0, { cars: r.cars });
  check(`${name}: no tyre buried more than 2 cm`, r.minGap >= -0.02, r);
  check(`${name}: every car body clears the ground`, r.bodyMin > 0.05, { bodyMin: r.bodyMin });
  check(`${name}: no tyre hovering more than 3 cm`, r.maxGap <= 0.03, { maxGap: r.maxGap, hover: r.hover, wheels: r.wheels });
}
check('no page errors', g.errs.length === 0, g.errs);
await g.close();
