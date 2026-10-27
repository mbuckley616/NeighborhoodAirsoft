
// ---------------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------------
// =====================================================================
// v1.57 — TUTORIAL MODULE (self-contained; no-op unless the active scenario
// has `tutorial: true`). Five guided beats taught through the coaching banner:
//   1) MOVE to a marked spot   2) AIM (hold RMB)   3) COCK + FIRE
//   4) TAG all 3 practice dummies   5) RELOAD (R)
// Beats 1/2/5 are polled from player/gun state; beat 3 is signalled by doFire()
// and beat 4 by eliminateEnemy() — both call Tutorial.notify(...). The round is
// won by the normal kill_all path once the 3 dummies are tagged; the reload beat
// is taught before that's possible (dummies are out of range / behind the line
// until you've moved up), so the sequence reads naturally. Nothing here touches
// other scenarios: enterScenario only arms it when sc.tutorial is set.
// =====================================================================
const Tutorial = {
  active: false,
  step: 0,                 // 0-based index into BEATS
  done: false,
  movePos: null,           // THREE.Vector3 target for the MOVE beat
  moveRadius: 2.5,
  dummiesTagged: 0,
  dummiesTotal: 0,
  startAmmo: 0,
  _reloadBaseline: 0,
  _stepEnteredAt: 0,
  _bannerEl: null, _stepEl: null, _instrEl: null, _dotsEl: null,
  kind: 'basics',          // v1.324 (D.61): 'basics' (Backyard Basics) or 'squad' (Squad Basics)
  beats: null,             // the kind's list: BEATS or SQUAD_BEATS
  loaderSlot: -1,          // v1.324: the slot Seth's loader is in

  BEATS: [
    { id: 'move',   label: 'STEP 1 OF 5 · MOVE',
      instr: 'Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to walk to the glowing marker on the driveway. Hold <kbd>Shift</kbd> to sprint.' },
    { id: 'aim',    label: 'STEP 2 OF 5 · AIM',
      instr: 'Hold <kbd>Right-Mouse</kbd> to raise your sights and aim down range. Your shots are tighter while aiming.' },
    { id: 'fire',   label: 'STEP 3 OF 5 · TAKE YOUR FIRST SHOT',
      instr: 'Your gun starts cocked and ready. Click <kbd>Left-Mouse</kbd> to fire a shot down range.' },
    { id: 'tag',    label: 'STEP 4 OF 5 · RE-COCK & TAG',
      instr: 'After each shot the spring is spent. Hold <kbd>Left-Mouse</kbd> to pull it back, release at the top to fire again. Tag all three targets.' },
    { id: 'reload', label: 'STEP 5 OF 5 · RELOAD',
      instr: 'Running low? Press <kbd>R</kbd> to reload from your speed loader. Do it now to finish up.' },
  ],

  // v1.324 (backlog D.61, Michael: C): Squad Basics' three beats. An instr may be a function (for the slot's key and
  // the pad's buttons). Nobody fires until the third beat (begin holds them, _renderStep lets them go).
  SQUAD_BEATS: [
    { id: 'order',  label: 'STEP 1 OF 3 · GIVE AN ORDER',
      instr: () => Pad.active
        ? 'Seth and Trey take orders from you. Press <kbd>D-PAD ←</kbd> for FOLLOW ME; the other three are on the d-pad too.'
        : 'Seth and Trey take orders from you. Hold <kbd>Q</kbd>, move the mouse toward FOLLOW ME and let go. The order holds until you give another.' },
    { id: 'loader', label: 'STEP 2 OF 3 · THE SPEED LOADER',
      instr: () => `Seth gave you his old speed loader; it fills from your bag every match. Fire a few shots, then ${Pad.active ? 'change slots with <kbd>RB</kbd>' : `press <kbd>${Tutorial.loaderSlot + 1}</kbd>`} and hold <kbd>Left-Mouse</kbd> to feed BBs into your mag. ${Pad.active ? '<kbd>LB</kbd>' : 'Press <kbd>1</kbd>'} goes back to your gun.` },
    { id: 'win',    label: 'STEP 3 OF 3 · WIN IT AS A TEAM',
      instr: () => `They can shoot now. Tag all three with your squad — <strong>${Tutorial.dummiesTagged}/${Tutorial.dummiesTotal}</strong> down. PUSH UP sends your team in; FIND COVER pulls them back.` },
  ],

  // Called from enterScenario when sc.tutorial is true. `built` is the scene
  // bundle; we pull the marker spot + count the practice dummies from it.
  begin(built) {
    this.active = true;
    this.step = 0;
    this.done = false;
    this.dummiesTagged = 0;
    const sc = SCENARIOS[Game.scenario.active] || {};
    this.kind = sc.tutorial === 'squad' ? 'squad' : 'basics';
    this.beats = this.kind === 'squad' ? this.SQUAD_BEATS : this.BEATS;
    // The MOVE marker: a point a short walk in front of the player spawn, toward
    // the dummies. enterScenario stashes it on built.tutorialMarker; fall back to
    // a sensible offset from spawn if absent.
    this.movePos = built.tutorialMarker
      ? built.tutorialMarker.clone()
      : (built.spawn ? built.spawn.clone() : new THREE.Vector3(0, 0, 0));
    // A glowing ground ring + floating beacon so the spot is unmistakable.
    if (this.kind === 'basics') this._spawnMarkerMesh(built.scene, this.movePos);
    if (this.kind === 'squad') {   // v1.324: everyone holds fire until the third beat, and Seth's loader goes in a slot
      for (const e of built.enemies || []) if (!e.noFire) { e.noFire = true; e._tutHold = true; }
      this.loaderSlot = giveSethsLoader();
    }
    // Count the practice dummies — hostiles only (the ally coach doesn't count).
    this.dummiesTotal = (built.enemies || []).filter(e => e.team !== 'player').length;
    this.startAmmo = Game.gun ? Game.gun.ammo : 0;
    this._bannerEl = document.getElementById('tutorialHud');
    this._stepEl   = document.getElementById('tutStep');
    this._instrEl  = document.getElementById('tutInstr');
    this._dotsEl   = document.getElementById('tutDots');
    if (this._bannerEl) this._bannerEl.style.display = 'block';
    // Hide the timer HUD — a tutorial has no clock.
    const th = document.getElementById('timerHud');
    if (th) th.style.display = 'none';
    this._renderStep();
    this._stepEnteredAt = performance.now();
  },

  _spawnMarkerMesh(scene, pos) {
    if (!scene) return;
    const gy = (typeof scenarioGroundY === 'function') ? scenarioGroundY(pos.x, pos.z) : 0;
    const grp = new THREE.Group();
    grp.position.set(pos.x, gy + 0.02, pos.z);
    // Flat glowing ring on the ground.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.9, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb24d, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    grp.add(ring);
    // A vertical beacon beam so it's visible from a distance.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 4.0, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb24d, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    beam.position.y = 2.0;
    grp.add(beam);
    scene.add(grp);
    this._markerMesh = grp;
  },

  _removeMarkerMesh() {
    if (this._markerMesh && this._markerMesh.parent) this._markerMesh.parent.remove(this._markerMesh);
    this._markerMesh = null;
  },

  end() {
    this.active = false;
    this._removeMarkerMesh();
    if (this._bannerEl) this._bannerEl.style.display = 'none';
  },

  _renderStep() {
    if (!this.active || this.done) return;
    const beat = this.beats[this.step];
    if (!beat) return;
    // Capture the reload baseline the moment that beat becomes active, so a later
    // ammo rise reads as "they reloaded".
    if (beat.id === 'reload' && Game.gun) this._reloadBaseline = Game.gun.ammo;
    if (beat.id === 'win') for (const e of Game.scenario.enemies || []) if (e._tutHold) { e.noFire = false; e._tutHold = false; }   // v1.324
    if (this._stepEl)  this._stepEl.textContent = beat.label;
    if (this._instrEl) {
      // The TAG beat shows live progress.
      if (beat.id === 'tag') {
        this._instrEl.innerHTML = padWords(`Hold <kbd>Left-Mouse</kbd> to re-cock, release to fire. Tag all three — <strong>${this.dummiesTagged}/${this.dummiesTotal}</strong> down.`);   // v1.279
      } else {
        this._instrEl.innerHTML = padWords(typeof beat.instr === 'function' ? beat.instr() : beat.instr);   // v1.324: or a function   // v1.279: the pad's buttons while it is in use
      }
      this._instrEl.classList.remove('done');
    }
    if (this._dotsEl) {
      let html = '';
      for (let i = 0; i < this.beats.length; i++) {
        const cls = i < this.step ? 'tut-dot done' : (i === this.step ? 'tut-dot active' : 'tut-dot');
        html += `<div class="${cls}"></div>`;
      }
      this._dotsEl.innerHTML = html;
    }
  },

  // Advance to the next beat (or finish). A brief "done" flash on the instruction.
  _advance() {
    if (!this.active || this.done) return;
    // Leaving the MOVE beat → retire the ground marker.
    if (this.beats[this.step] && this.beats[this.step].id === 'move') this._removeMarkerMesh();
    if (this._instrEl) this._instrEl.classList.add('done');
    this.step++;
    if (this.step >= this.beats.length) {
      // All beats taught. If the dummies are already all tagged the kill_all win
      // will fire on its own; otherwise we simply finish the coaching overlay and
      // let the player mop up (the win still resolves via kill_all). To make the
      // reload beat a clean finish, end the tutorial overlay and force a win if
      // every dummy is down.
      this.done = true;
      const banner = this._bannerEl;
      if (this._stepEl)  this._stepEl.textContent = 'NICE — YOU\u2019RE READY';
      if (this._instrEl) { this._instrEl.classList.add('done'); this._instrEl.innerHTML = 'That\u2019s the basics. Head out and win your first real match!'; }
      if (this._dotsEl)  this._dotsEl.innerHTML = '';
      setTimeout(() => { if (banner) banner.style.display = 'none'; }, 2600);
      // If all targets are down, close the round as a win; else leave it to kill_all.
      if (this.dummiesTagged >= this.dummiesTotal && this.dummiesTotal > 0) {
        if (typeof checkWinCondition === 'function') checkWinCondition();
      } else if (this.dummiesTotal === 0) {
        endScenarioLater('win', 600);
      }
      return;
    }
    setTimeout(() => this._renderStep(), 350);
    this._stepEnteredAt = performance.now();
  },

  // Event signals from gameplay code (fire / tag). Polled beats are in update().
  notify(evt) {
    if (!this.active || this.done) return;
    const beat = this.beats[this.step];
    if (!beat) return;
    if (evt === 'fired' && beat.id === 'fire') {
      this._advance();
    } else if ((evt === 'ordered' && beat.id === 'order') || (evt === 'fed' && beat.id === 'loader')) {
      this._advance();   // v1.324 (D.61)
    } else if (evt === 'tagged') {
      this.dummiesTagged++;
      if (beat.id === 'tag' || beat.id === 'win') {
        this._renderStep();   // refresh the X/Y counter
        if (this.dummiesTagged >= this.dummiesTotal) this._advance();
      }
    }
  },

  update(dt) {
    if (!this.active || this.done) return;
    // Gentle pulse on the ground marker so it reads as "go here".
    if (this._markerMesh) {
      const s = 1 + Math.sin(performance.now() * 0.004) * 0.12;
      this._markerMesh.scale.set(s, 1, s);
    }
    const beat = this.beats[this.step];
    if (!beat) return;
    if (beat.id === 'loader' && this.loaderSlot < 0) { this._advance(); return; }   // v1.324: no loader in a slot, no step
    // A small grace so a beat can't auto-complete on the same frame it appears.
    if (performance.now() - this._stepEnteredAt < 250) return;

    if (beat.id === 'move' && this.movePos && Game.player && Game.player.pos) {
      const dx = Game.player.pos.x - this.movePos.x;
      const dz = Game.player.pos.z - this.movePos.z;
      if (Math.hypot(dx, dz) <= this.moveRadius) this._advance();
    } else if (beat.id === 'aim') {
      if ((Game.player.ads ?? 0) > 0.6) this._advance();
    } else if (beat.id === 'reload') {
      // Completed when ammo rises above the beat-start baseline (a real reload),
      // OR — fallback so a player who's already full can't soft-lock here — when
      // the reload key is pressed at all.
      if ((Game.gun && Game.gun.ammo > this._reloadBaseline) || (Game.keys && Game.keys['KeyR'])) this._advance();
    }
  },

  // The reload beat baseline is captured in _renderStep when that beat shows.
};

// v1.324 (backlog D.61, Michael: C, "with the free 25-BB loader"): the first Squad Basics gives you Seth's old 25-BB
// speed loader, yours to keep, in your first empty slot (slot 2 if none is empty; what was there goes back to the
// closet). After that it is the loader in your slots, or the first one you own. It is filled from the bag at once,
// since BEGIN has already loaded the others. Returns the slot it is in, or -1 if it is in none.
function giveSethsLoader() {
  const P = Game.persist;
  if (!P.sethLoaderGiven) {
    P.sethLoaderGiven = true;
    P.speedLoaders.push({ id: newSpeedLoaderId(), tier: 'sl_25', currentBBs: 0, fromSeth: true });
    const sl = P.speedLoaders[P.speedLoaders.length - 1];
    let i = -1;
    for (let k = 1; k < getUnlockedSlotCount(); k++) if (!P.loadoutSlots[k]) { i = k; break; }
    if (i < 0) i = 1;
    P.loadoutSlots[i] = { kind: 'speed_loader', refId: sl.id };
    sl.currentBBs = Math.min(SPEED_LOADER_TIERS.sl_25.capacity, P.bag);
    P.bag -= sl.currentBBs;
    updateLoadoutHud(); updateAmmoHud();
    return i;
  }
  return P.loadoutSlots.findIndex(s => s && s.kind === 'speed_loader');
}

// v1.86: one simulation step, split out of tick() so the headless tests can drive
// the game in fixed 1/60 steps (tests/lib/game.mjs spin()). tick() = step + render.
function stepGame(dt) {
  pollGamepad(dt);   // v1.241 (D.38)
  updateBedroomSettingsBtn();   // v1.192: SETTINGS top right in the bedroom while the mouse is free
  if (Game.mode === 'loadoutMgr') updateLoadoutKid(dt);   // v1.132: the Loadout screen's kid turns
  if (Game.mode === 'bedroom') {
    updatePlayer(dt);
    updateInteractables(dt);
    updateBedroomLabels();   // v1.62 — project floating labels to screen each frame
    // Ambient bedroom animations
    if (Game.scene && Game.scene.userData) {
      if (Game.scene.userData.fanBlades) {
        Game.scene.userData.fanBlades.rotation.y += dt * 4.5;
      }
      const now = performance.now();
      if (Game.scene.userData.swayTrees) {
        for (const tree of Game.scene.userData.swayTrees) {
          tree.userData.pivot.rotation.z =
            Math.sin(now * tree.userData.swayFreq + tree.userData.swayPhase) * tree.userData.swayAmp;
        }
      }
    }
  } else if (Game.mode === 'scenario' && (Net.active || (!Game.forfeitAsk && !Game.paused))) {   // v1.208: paused while F asks (v1.239: and in the pause menu; v1.230: never online, your friend's game runs on)
    updatePlayer(dt);
    updateLadderPrompt();   // v1.142
    updateGun(dt);
    updateNoodle(dt);   // v1.249 (D.36)
    // Sub-step BB physics: BBs at 30+ m/s can skip through thin obstacles
    // in a single 16ms frame. Run physics at ~5ms steps.
    // v1.74: a BB hit can call endScenario() mid-substep (final-life loss), which
    // flips Game.mode to 'result' and stops all BB whistles. If we kept sub-
    // stepping, updateBBs would re-enter and RESTART the whistle on a BB still
    // buzzing past the player — and with no further updateBBs calls next frame
    // (mode is now 'result'), that restarted loop droned forever (the "whistle
    // persists after losing the last life, even back in the bedroom" bug). So we
    // break out the instant the mode is no longer 'scenario'.
    const BB_STEP = 1 / 200;
    let remaining = dt;
    while (remaining > 0.0001) {
      const step = Math.min(BB_STEP, remaining);
      updateBBs(step);
      if (Game.mode !== 'scenario') break;   // endScenario fired mid-substep
      remaining -= step;
    }
    updateStuckBBs(dt);
    updateFragments(dt);
    Game.scenario.roundTime = (Game.scenario.roundTime || 0) + dt;   // v1.101
    if (Game.player._graceT > 0) Game.player._graceT = Math.max(0, Game.player._graceT - dt);   // v1.170
    for (const k of Game.scenario.enemies) if (k._graceT > 0 && !k.remote) k._graceT = Math.max(0, k._graceT - dt);   // v1.291 (D.49)
    if (Game.player._holdT > 0) Game.player._holdT = Math.max(0, Game.player._holdT - dt);   // v1.280 (D.47)
    playerWalkHomeStep(dt);   // v1.290 (D.48)
    updateSquad(dt);   // v1.248 (D.35)
    voiceStep();   // v1.256 (D.32): lines waiting on the voice cooldowns
    if (Game.scenario.range) rangeStep(dt);   // v1.257 (D.40)
    updateEnemies(dt);
    kidWinceStep(dt);   // v1.261 (D.45): after the kids have posed themselves
    hitMarkerStep(dt);   // v1.321 (D.60)
    hurtFlashStep(dt);   // v1.322 (D.62)
    if (Net.active) netStep(dt);   // v1.230 (D.2)
    if (Game.scenario.ctf) updateFlags(dt);   // v1.189
    updateLaserDiagHud();
    updateStanceHud();
    updateReticleBloom();
    updateProgressBars();
    updateLoadoutHud();
    updateRosterHud();
    updateScenarioTimer(dt);
    updatePickupClock();   // v1.204
    updateTimerHud();
    updateStaminaHud();
    updateEyewearOverlay();
    if (Tutorial.active) Tutorial.update(dt);
  } else if (Game.mode === 'workbench') {
    updateWorkbench(dt);
  }
}

function tick() {
  const dt = Math.min(0.05, Game.clock.getDelta());
  stepGame(dt);

  if (Game.scene) {
    Game.renderer.render(Game.scene, Game.camera);
  }
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------
// UI WIRING
// ---------------------------------------------------------------------
// v1.192 (D.17 "A better game" 5, Michael: C): the settings screen. The title's SETTINGS opens it over the title; in
// the bedroom, with the mouse free, a SETTINGS button sits top right. Every change applies and saves at once.
const SETTINGS_ROWS = [
  { key: 'mouseSens', label: 'Mouse sensitivity', fmt: v => v.toFixed(2) + '×' },
  { key: 'aimSens',   label: 'Aim sensitivity',   fmt: v => v.toFixed(2) + '×' },
  { key: 'music',     label: 'Music volume',      fmt: v => Math.round(v * 100) + '%' },
  { key: 'effects',   label: 'Effects volume',    fmt: v => Math.round(v * 100) + '%' },
  { key: 'fov',       label: 'Field of view',     fmt: v => Math.round(v) + '°' },
  { key: 'invertY',   label: 'Invert look',       toggle: true },
];
function renderSettings() {
  const rows = document.getElementById('settingsRows');
  rows.innerHTML = '';
  for (const row of SETTINGS_ROWS) {
    const el = document.createElement('div');
    el.className = 'settings-row';
    const label = document.createElement('label');
    label.textContent = row.label;
    const val = document.createElement('span');
    val.className = 'settings-val';
    const input = document.createElement('input');
    input.dataset.key = row.key;
    if (row.toggle) {
      input.type = 'checkbox';
      input.checked = !!Settings[row.key];
      val.textContent = input.checked ? 'On' : 'Off';
      input.addEventListener('change', () => {
        Settings[row.key] = input.checked; val.textContent = input.checked ? 'On' : 'Off';
        saveSettings(); applySettings();
      });
    } else {
      const r = SETTINGS_RANGES[row.key];
      input.type = 'range'; input.min = r[0]; input.max = r[1]; input.step = r[2];
      input.value = Settings[row.key];
      val.textContent = row.fmt(Settings[row.key]);
      input.addEventListener('input', () => {
        Settings[row.key] = sanitizeSettings(Object.assign({}, Settings, { [row.key]: Number(input.value) }))[row.key];
        val.textContent = row.fmt(Settings[row.key]);
        saveSettings(); applySettings();
      });
    }
    el.append(label, input, val);
    rows.appendChild(el);
  }
}
function openSettings() {
  renderSettings();
  document.getElementById('settingsScreen').classList.add('active');
  if (Game.mode !== 'title') { Game.prevMode = Game.mode; Game.mode = 'settings'; }
  exitPointerLock();
}
function closeSettings() {
  document.getElementById('settingsScreen').classList.remove('active');
  if (Game.mode === 'settings') {
    Game.mode = Game.prevMode || 'bedroom';
    if (Game.mode === 'bedroom') showPauseHint();
  }
}
function updateBedroomSettingsBtn() {
  // v1.254 (B.10): a pad never takes the pointer lock, so the button stood there all the time; on a pad Start opens
  // the settings, and the cash box says so instead. With the mouse free the button sits under the box, as wide as it.
  const want = Game.mode === 'bedroom' && !Game.mouse.locked && !Pad.active ? 'block' : 'none';
  const btn = document.getElementById('bedroomSettingsBtn');
  if (btn.style.display !== want) btn.style.display = want;
  const padLine = document.getElementById('bedroomPadSettings'), padWant = Game.mode === 'bedroom' && Pad.active ? 'block' : 'none';
  if (padLine.style.display !== padWant) padLine.style.display = padWant;
  if (want === 'block') {
    const r = document.getElementById('bedroomHud').getBoundingClientRect();
    if (r.height) {
      const top = Math.round(r.bottom + 6) + 'px', right = Math.round(window.innerWidth - r.right) + 'px', w = Math.round(r.width) + 'px';
      if (btn.style.top !== top) btn.style.top = top;
      if (btn.style.right !== right) btn.style.right = right;
      if (btn.style.width !== w) btn.style.width = w;
    }
  }
}
document.getElementById('titleSettingsBtn').addEventListener('click', openSettings);
// v1.239 (D.39): the pause menu's buttons. Settings open over it; closing them leaves it up, the match still stopped.
document.getElementById('pauseResumeBtn').addEventListener('click', resumeFromPause);
document.getElementById('pauseSettingsBtn').addEventListener('click', openSettings);
document.getElementById('pauseForfeitBtn').addEventListener('click', () => { closePauseMenu(); askForfeit(); });
document.getElementById('bedroomSettingsBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
// its mousedown must not reach the document's, which would take the pointer lock for the bedroom
document.getElementById('bedroomSettingsBtn').addEventListener('mousedown', e => e.stopPropagation());
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && document.getElementById('settingsScreen').classList.contains('active')) closeSettings();
});
document.getElementById('settingsDoneBtn').addEventListener('click', closeSettings);
document.getElementById('forfeitYesBtn').addEventListener('click', () => answerForfeit(true));    // v1.208
document.getElementById('forfeitKeepBtn').addEventListener('click', () => answerForfeit(false));
document.getElementById('settingsResetBtn').addEventListener('click', () => {
  Object.assign(Settings, SETTINGS_DEFAULTS); saveSettings(); applySettings(); renderSettings();
});

// v1.37: title-screen entry points. If a save exists, show CONTINUE (load it,
// then enter) and relabel the primary button to NEW GAME (which starts fresh;
// v1.218: after asking, since the new game autosaves over the old one).
(function setupTitleButtons() {
  const startBtn = document.getElementById('startBtn');
  const continueBtn = document.getElementById('continueBtn');
  if (hasSaveGame()) {
    continueBtn.style.display = '';
    startBtn.textContent = 'NEW GAME';
    continueBtn.addEventListener('click', () => {
      initAudio();
      const r = loadGame();
      if (!r.ok) {
        // Corrupt/blocked — fall back to a fresh start rather than dead-ending.
        showModal('Save not loaded',
          "Couldn't read your save (" + r.reason + "), so we're starting fresh. Your old save is left alone.");
      }
      enterBedroom();
    });
  }
  // v1.218 (D.29): a NEW GAME saves itself as it goes. Over an existing save it asks first (START OVER / BACK),
  // since the first autosave replaces that save.
  const ask = document.getElementById('newGameAsk');
  const beginNewGame = () => {
    initAudio();
    // NEW GAME from a profile that already has a save → reset the in-memory
    // profile so the player actually starts fresh (don't carry a half-loaded state).
    if (hasSaveGame()) {
      Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST));
      _accInstanceSeq = 1;
    }
    Game._saveEnabled = true;   // v1.218: autosave from the start
    Game.persist.roomTour = { ticked: [] };   // v1.357 (D.76): a new save gets the look round the room once
    enterBedroom();
    openMirror();   // v1.108 (D.6, Michael: C): a new save opens on the mirror once; DONE goes to the bedroom
  };
  const showAsk = (on) => {
    ask.style.display = on ? 'flex' : 'none';
    startBtn.style.display = on ? 'none' : '';
    continueBtn.style.display = on || !hasSaveGame() ? 'none' : '';
  };
  startBtn.addEventListener('click', () => {
    if (hasSaveGame()) { showAsk(true); return; }
    beginNewGame();
  });
  document.getElementById('newGameYesBtn').addEventListener('click', () => { showAsk(false); beginNewGame(); });
  document.getElementById('newGameNoBtn').addEventListener('click', () => showAsk(false));
})();

document.getElementById('mapCloseBtn').addEventListener('click', closeMap);
