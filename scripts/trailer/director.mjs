// In-page director shared by the trailer (capture.mjs) and the store screenshots (../shots/capture.mjs).
// installDirector() is passed to page.evaluate and runs inside the game page.
export function installDirector() {
  window.tick = function () { requestAnimationFrame(window.tick); };   // the game's loop now does nothing
  const TR = window.TR = { t: 0, ev: [], rec: false, noEnd: true, gs: { phase: 'ready', timer: 0 } };

  // overlay: captions and full-screen cards
  const css = document.createElement('style');
  css.textContent = `
    #trCap { position:fixed; left:0; right:0; bottom:150px; text-align:center; z-index:99999; pointer-events:none;
      font-family:Georgia,serif; font-weight:bold; font-size:46px; color:#f4e9d8; letter-spacing:1px;
      text-shadow:3px 3px 0 #000, 0 0 24px rgba(0,0,0,.65); opacity:0; }
    #trCap small { display:block; font-family:'Courier New',monospace; font-size:15px; letter-spacing:5px; color:#ff8c42;
      text-transform:uppercase; margin-bottom:6px; text-shadow:2px 2px 0 #000; }
    #trCard { position:fixed; inset:0; z-index:99998; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:linear-gradient(180deg,#1a2332 0%,#2d3e2a 70%,#4a5d3a 100%); opacity:0; pointer-events:none; }
    #trCard.black { background:#0b0d10; }
    #trCard .t { font-family:Georgia,serif; font-weight:bold; font-size:76px; color:#f4e9d8; letter-spacing:2px;
      text-shadow:3px 3px 0 #000, 6px 6px 20px rgba(0,0,0,.5); }
    #trCard .s { font-family:'Courier New',monospace; font-size:17px; color:#ff8c42; letter-spacing:6px; text-transform:uppercase; margin-top:10px; }
    #trCard .u { font-family:'Courier New',monospace; font-size:20px; color:#f4e9d8; letter-spacing:2px; margin-top:54px; opacity:.85; }
    #trCard .big { font-family:Georgia,serif; font-style:italic; font-size:50px; color:#f4e9d8; text-shadow:3px 3px 0 #000; }
    body.trHideHud #rosterHud, body.trHideHud #loadoutHud, body.trHideHud #stanceHud, body.trHideHud #healthHud,
    body.trHideHud #staminaHud, body.trHideHud #damageVignette, body.trHideHud #timerHud, body.trHideHud #laserDiagHud,
    body.trHideHud #interactPrompt, body.trHideHud #tutorialHud { display:none !important; }
    #pauseHint { display:none !important; }`;
  document.head.appendChild(css);
  const cap = document.createElement('div'); cap.id = 'trCap'; document.body.appendChild(cap);
  const card = document.createElement('div'); card.id = 'trCard'; document.body.appendChild(card);
  document.body.classList.add('trHideHud');

  TR.caption = (text, kicker, i, n) => {
    const el = document.getElementById('trCap');
    if (!text) { el.style.opacity = 0; return; }
    const html = (kicker ? `<small>${kicker}</small>` : '') + text;
    if (el.innerHTML !== html) el.innerHTML = html;
    const fin = Math.min(1, i / 7), fout = Math.min(1, (n - 1 - i) / 5);
    const a = Math.max(0, Math.min(fin, fout));
    el.style.opacity = a;
    el.style.transform = `translateY(${(1 - fin) * 14}px)`;
  };
  TR.card = (html, cls, alpha) => {
    const el = document.getElementById('trCard');
    if (el.innerHTML !== html) el.innerHTML = html;
    el.className = cls || '';
    el.style.opacity = alpha;
  };
  TR.render = () => { if (Game.scene && Game.camera) Game.renderer.render(Game.scene, Game.camera); };

  // a round never ends on its own while we film; the result shot ends it on purpose
  const realEnd = endScenario, realLater = endScenarioLater;
  window.endScenario = function (o) { if (TR.noEnd) return; return realEnd.apply(this, arguments); };
  window.endScenarioLater = function (o, ms) { if (TR.noEnd) return; return realLater.apply(this, arguments); };
  TR.realEnd = realEnd;

  // sound log: the name, the time, and what a replay needs (args, where the player stood)
  const SOUNDS = ['playShot', 'playFootstep', 'playPlayerFootstep', 'playReloadClick', 'playCockBack', 'playCockForward',
    'playJam', 'playUnjam', 'playSlotSwap', 'playHitOnEnemy', 'playHitOnPlayer', 'playImpactMetal', 'playImpactCardboard',
    'playImpactWood', 'playImpactShatter', 'playShopChaching'];
  const plain = (a) => (a && typeof a === 'object') ? (('x' in a) ? { x: a.x, y: a.y, z: a.z } : null) : a;
  for (const name of SOUNDS) {
    const f = window[name]; if (typeof f !== 'function') continue;
    window[name] = function (...args) {
      const p = Game.player;
      if (TR.rec) TR.ev.push({ t: +TR.t.toFixed(4), fn: name, args: args.map(plain), px: p.pos.x, py: p.pos.y, pz: p.pos.z, yaw: p.yaw });
      return f.apply(this, args);
    };
  }
  TR.mark = (fn, args) => TR.ev.push({ t: +TR.t.toFixed(4), fn, args: args || [] });

  // ---- combat ----
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  TR.hostiles = () => Game.scenario.enemies.filter(e => e.team !== 'player' && e.health > 0 && e.state !== 'retreating');
  TR.aimErr = (e, lead) => {
    const p = Game.player, eye = p.pos.y + (p.eyeOffset || 1.35);
    const tx = e.pos.x, tz = e.pos.z, ty = e.pos.y + 0.85 * ((e.mesh && e.mesh.scaleY) || 1);
    const d = Math.hypot(tx - p.pos.x, tz - p.pos.z);
    const yaw = Math.atan2(p.pos.x - tx, p.pos.z - tz);
    const pitch = Math.atan2(ty - eye, d) + (lead || 0) * d * 0.004;   // a little hold-over for drop
    return { dy: wrap(yaw - p.yaw), dp: pitch - p.pitch, d };
  };
  TR.sees = (e) => {
    const p = Game.player, eye = p.pos.y + (p.eyeOffset || 1.35);
    return hasLineOfSight(p.pos.x, eye, p.pos.z, e.pos.x, e.pos.y + 0.85 * ((e.mesh && e.mesh.scaleY) || 1), e.pos.z, p.obstacles);
  };
  // stand somewhere that sees the most of them (minDist..maxDist away), facing the nearest one seen
  TR.bestSpot = (o) => {
    const p = Game.player, ox = p.pos.x, oz = p.pos.z; let best = null;
    for (let x = o.x0; x <= o.x1; x += o.step || 2) for (let z = o.z0; z <= o.z1; z += o.step || 2) {
      if (collidesObstacles(x, z, 0.6)) continue;
      p.pos.x = x; p.pos.z = z;
      if (Game.scenario.groundY) p.pos.y = Game.scenario.groundY(x, z);
      let n = 0, near = null, nd = 1e9;
      for (const e of TR.hostiles()) {
        const d = Math.hypot(e.pos.x - x, e.pos.z - z); if (d < (o.minDist || 6) || d > (o.maxDist || 30)) continue;
        if (!TR.sees(e)) continue; n++; if (d < nd) { nd = d; near = e; }
      }
      const score = n * 10 - nd * 0.1;
      if (n && (!best || score > best.score)) best = { x, z, score, near, n };
    }
    if (!best) { p.pos.x = ox; p.pos.z = oz; return null; }
    p.pos.x = best.x; p.pos.z = best.z; p.yaw = Math.atan2(best.x - best.near.pos.x, best.z - best.near.pos.z); p.pitch = 0;
    return { x: best.x, z: best.z, n: best.n };
  };
  TR.pick = (o) => {
    let best = null, bd = 1e9;
    for (const e of TR.hostiles()) {
      const err = TR.aimErr(e); if (o.maxDist && err.d > o.maxDist) continue;
      if (o.los !== false && !TR.sees(e)) continue;
      const score = err.d + Math.abs(err.dy) * 25;   // prefer what's already in front of us
      if (score < bd) { bd = score; best = e; }
    }
    return best;
  };
  // one 1/60 step of a scripted player. o: { keys, aimK, target(e)|'nearest', fire, lead, sway }
  TR.fight = (o) => {
    const p = Game.player, gun = Game.gun, gs = TR.gs;
    Game.mouse.locked = true; Game.keys = Game.keys || {};
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) Game.keys[k] = !!(o.keys && o.keys[k]);
    let e = typeof o.target === 'function' ? o.target() : (o.target === false ? null : TR.pick(o));
    let aligned = false;
    if (e) {
      const err = TR.aimErr(e, o.lead);
      const k = o.aimK ?? 0.12;
      p.yaw += err.dy * k; p.pitch += err.dp * k;
      aligned = Math.abs(err.dy) < (o.tol ?? 0.03) && Math.abs(err.dp) < (o.tol ?? 0.03);
    }
    else if (o.drift) {   // nobody in sight: turn slowly toward where they are
      const h = TR.hostiles(); if (h.length) {
        let x = 0, z = 0; for (const q of h) { x += q.pos.x; z += q.pos.z; } x /= h.length; z /= h.length;
        p.yaw += wrap(Math.atan2(p.pos.x - x, p.pos.z - z) - p.yaw) * o.drift; p.pitch += (0 - p.pitch) * o.drift;
      }
    }
    if (o.pin) for (const q of o.pin) if (q.e.health > 0) { q.e.pos.x = q.x; q.e.pos.z = q.z; }
    if (gun.ammo < 3) gun.ammo = gun.maxAmmo;
    if (gun.jammed) { gun.jammed = false; gun.jamProgress = 0; }
    const fire = o.fire !== false && e && aligned && (!o.fireAfter || TR.local >= o.fireAfter);
    if (gun.fireMode === 'auto') {
      if (fire && !Game.mouseLMB) { Game.mouseLMB = true; onLmbDown(); }
      else if (!fire && Game.mouseLMB && (gs.hold = (gs.hold || 0) + 1) > 8) { Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); gs.hold = 0; }
      if (fire) gs.hold = 0;
    } else {
      gs.timer += 1 / 60;
      if (gs.phase === 'ready' && fire && gun.cocked && gun.fireCooldown <= 0) {
        Game.mouseLMB = true; onLmbDown(); gs.phase = 'fired'; gs.timer = 0;
      } else if (gs.phase === 'fired' && gs.timer > 0.1) {
        Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); gs.phase = 'wait'; gs.timer = 0;
      } else if (gs.phase === 'wait' && gs.timer > (o.recockDelay ?? 0.22)) {
        Game.mouseLMB = true; onLmbDown(); gs.phase = 'cocking'; gs.timer = 0;
      } else if (gs.phase === 'cocking' && (gun.cockProgress >= 0.97 || gun.cocked)) {
        Game.mouseLMB = false; Game.lmbConsumed = false; onLmbUp(); gs.phase = 'ready'; gs.timer = 0;
      }
    }
    stepGame(1 / 60); TR.t += 1 / 60; TR.local += 1 / 60;
  };
  TR.resetFight = () => { TR.gs = { phase: 'ready', timer: 0 }; TR.local = 0; Game.mouseLMB = false; Game.lmbConsumed = false; };
  TR.prep = () => {   // after BEGIN: can't lose, never runs dry
    Game.player.maxHits = 99999; Game.mouse.locked = true;
    if (Game.scenario.timerRemaining != null) Game.scenario.timerRemaining = 1e9;
    TR.resetFight();
  };
}

