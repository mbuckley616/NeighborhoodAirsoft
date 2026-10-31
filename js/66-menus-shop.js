
// ---------------------------------------------------------------------
// MENU UTILITIES
// ---------------------------------------------------------------------
function hideAllMenus() {
  ['titleScreen', 'worldMap', 'resultScreen', 'modalScreen', 'shopScreen', 'loadoutScreen', 'workbenchScreen', 'settingsScreen'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  if (typeof WB !== 'undefined') WB.active = false;
}
function showModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  document.getElementById('modalBody').style.whiteSpace = 'pre-line';
  document.getElementById('modalScreen').classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'modal';
  exitPointerLock();
}
function closeModal() {
  if (Net.phase === 'lobby') netClose();   // v1.230 (D.2): closing the board gives up the room
  document.getElementById('modalScreen').classList.remove('active');
  document.getElementById('modalCloseBtn').textContent = 'OK';   // reset (save menu may have changed it)
  document.querySelector('#modalScreen .modal-card').classList.remove('wide', 'phone');   // v1.194: the summer calendar widens it; v1.195: the phone styles it
  document.querySelector('#modalScreen .modal-card').classList.add('nb-paper');   // v1.285 (D.46): back on paper after the phone
  Game.mode = Game.prevMode || 'bedroom';
  if (Game.mode === 'bedroom') showPauseHint();
}

// === SAVE MENU (v1.37) === — opened from the bed. Saves immediately and shows
// a summary, plus a button to wipe the save (with confirm). Uses the modal
// shell but injects rich HTML into the body and rebinds the close button.
function profileSummaryHTML() {
  const p = Game.persist;
  const ownedGuns = ALL_GUN_TYPES   // v1.168: was its own list of the first eight
    .filter(g => p.owned[g]).length;
  const completed = Object.values(p.completed || {}).filter(Boolean).length;
  const accessories = Array.isArray(p.accessories) ? p.accessories.length : 0;
  const row = (label, val) =>
    `<div style="display:flex;justify-content:space-between;gap:24px;padding:3px 0;">
       <span style="opacity:0.75;">${label}</span><span style="font-weight:bold;">${val}</span>
     </div>`;
  return `<div style="text-align:left;font-size:13px;line-height:1.5;">
    ${row('Cash', '$' + (p.cash|0))}
    ${row('BBs at home', (p.bag|0))}
    ${row('Guns owned', ownedGuns)}
    ${row('Accessories owned', accessories)}
    ${row('Scenarios cleared', completed)}
  </div>`;
}
// v1.231 (D.29, Michael: A on "What does the bed do, now the game saves itself?"): the bed shows the summer so far:
// today's date off the calendar, the score against Seth's crew, and the next match on the ladder.
function nextLadderMatchId() {
  for (const z of ZONE_LADDER) {
    if (!isZoneUnlocked(z.key)) break;
    const id = (PIN_SCENARIO_GROUPS[z.key] || []).find(id => isScenarioUnlocked(id) && !Game.persist.completed[id]);
    if (id) return id;
  }
  return null;
}
function summerSoFarHTML() {
  const day = summerDayIndex(), d = summerDate(day);
  const s = rivalScore();
  const nextId = nextLadderMatchId(), sc = nextId && SCENARIOS[nextId];
  const next = sc ? `${sc.scenarioName || sc.name || nextId} · ${sc.name || ''}`.replace(/ · $/, '')
                  : 'Nothing left: the summer is won';
  const zone = day === SUMMER_BIG_DAY ? 'Bunratty Court' : summerZoneName(summerZoneKey());
  const row = (label, val) =>
    `<div style="display:flex;justify-content:space-between;gap:24px;padding:3px 0;">
       <span style="opacity:0.75;">${label}</span><span style="font-weight:bold;text-align:right;">${val}</span>
     </div>`;
  return `<div class="summer-so-far" style="text-align:left;font-size:13px;line-height:1.5;margin-bottom:10px;">
    ${row('Today', d.label + ' ' + SUMMER_YEAR)}
    ${row('Where', zone)}
    ${row(RIVAL_CREW.replace(/^\w/, c => c.toUpperCase()), s.beaten + ' of ' + s.total + ' beaten')}
    ${row('Next', next)}
  </div>`;
}

function openSaveMenu() {
  const res = saveGame();
  const titleEl = document.getElementById('modalTitle');
  const bodyEl  = document.getElementById('modalBody');
  const closeEl = document.getElementById('modalCloseBtn');
  Game.prevMode = Game.mode;
  Game.mode = 'modal';
  exitPointerLock();

  if (res.ok) {
    titleEl.textContent = 'The summer so far';   // v1.231: was "Saved — sleep tight"
    bodyEl.style.whiteSpace = 'normal';
    bodyEl.innerHTML =
      summerSoFarHTML() +
      profileSummaryHTML() +
      `<div style="margin-top:10px;opacity:0.7;font-size:11px;">Saved to this browser. The game saves itself, too.</div>` +
      `<div style="margin-top:16px;">` +
        `<button id="saveDeleteBtn" class="nb-btn" style="background:transparent;border:1px solid var(--ui-border);` +
        `color:#c88;padding:5px 14px;font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;border-radius:3px;">` +
        `DELETE SAVE</button>` +
      `</div>`;
    closeEl.textContent = 'OK';
    // v1.285 (D.46): DELETE SAVE, DELETE and KEEP carry nb-btn, so on the paper card they are notes, not dark-card buttons
    // Rebind the delete button each open (it's freshly injected).
    const del = document.getElementById('saveDeleteBtn');
    if (del) del.addEventListener('click', () => confirmDeleteSave());
  } else {
    // Storage blocked (private browsing, file:// in some browsers, quota).
    titleEl.textContent = "Couldn't save";
    bodyEl.style.whiteSpace = 'normal';
    bodyEl.innerHTML =
      `<div>This browser is blocking local storage (often the case in private/incognito windows, ` +
      `or when the file is opened directly off disk). Your progress still works for this session, ` +
      `but it can't be written to disk here.</div>` +
      `<div style="margin-top:8px;opacity:0.6;font-size:11px;">(${res.reason})</div>`;
    closeEl.textContent = 'OK';
  }
  document.getElementById('modalScreen').classList.add('active');
}

// Two-step delete: first click swaps the modal into a confirm state.
function confirmDeleteSave() {
  const titleEl = document.getElementById('modalTitle');
  const bodyEl  = document.getElementById('modalBody');
  titleEl.textContent = 'Delete your save?';
  bodyEl.style.whiteSpace = 'normal';
  bodyEl.innerHTML =
    `<div style="margin-bottom:14px;">This wipes your saved cash, guns, gear, and cleared scenarios from this browser. ` +
    `It can't be undone.</div>` +
    `<div style="display:flex;gap:10px;justify-content:center;">` +
      `<button id="saveDelYes" class="nb-btn" style="background:#a33;border:none;color:#fff;padding:6px 16px;` +
      `font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;border-radius:3px;font-weight:bold;">DELETE</button>` +
      `<button id="saveDelNo" class="nb-btn" style="background:transparent;border:1px solid var(--ui-border);color:inherit;` +
      `padding:6px 16px;font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;border-radius:3px;">KEEP</button>` +
    `</div>`;
  document.getElementById('modalCloseBtn').textContent = 'CANCEL';
  const yes = document.getElementById('saveDelYes');
  const no  = document.getElementById('saveDelNo');
  if (yes) yes.addEventListener('click', () => {
    deleteSaveAndReset();
    titleEl.textContent = 'Save deleted';
    bodyEl.innerHTML = `<div>Your save has been wiped and your profile reset to a fresh start. ` +
      `Anything you do from here is a brand-new game.</div>`;
    document.getElementById('modalCloseBtn').textContent = 'OK';
  });
  if (no) no.addEventListener('click', () => openSaveMenu());
}

function openMap() {
  document.getElementById('worldMap').classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'map';
  exitPointerLock();
  refreshMapPinStates();   // v1.48: grey locked zones, label Northcliff
  // v1.146 (D.8 step 1): the right column is never empty. It opens on the zone you last looked at, else the
  // furthest zone you have reached (where your next match is); was "Click a pin to see scenario details."
  selectMapZone(mapDefaultZone());
}
// v1.146: the zone the map opens on. The last pin clicked this session if it is still a zone, else the last
// unlocked zone on the ladder.
function mapDefaultZone() {
  if (Game._mapZone && PIN_SCENARIO_GROUPS[Game._mapZone]) return Game._mapZone;
  let key = ZONE_LADDER[0].key;
  for (const z of ZONE_LADDER) if (PIN_SCENARIO_GROUPS[z.key] && isZoneUnlocked(z.key)) key = z.key;
  return key;
}

// v1.48: reflect progression on the map pins. A zone pin whose zone is locked
// gets the grey `.locked` marker (and a "· locked" suffix); an unlocked one
// clears it. The Northcliff (comingSoon) pin always stays locked-styled and
// shows a "next up" hint once The Hollow is cleared.
function refreshMapPinStates() {
  document.querySelectorAll('#worldMap .pin').forEach(pin => {
    const key = pin.dataset.scenario;
    const label = pin.querySelector('.label');
    if (key === 'locked') {
      const nc = ZONE_LADDER.find(z => z.pin === 'locked');
      pin.classList.add('locked');
      if (label && nc) {
        const ready = isZoneUnlocked('northcliff');  // the zone before it cleared? (v1.102: the market lot)
        label.textContent = nc.name + (ready ? ' · coming soon' : ' · locked');
      }
      return;
    }
    if (PIN_SCENARIO_GROUPS[key]) {
      const unlocked = isZoneUnlocked(key);
      pin.classList.toggle('locked', !unlocked);
    }
  });
}
function closeMap() {
  document.getElementById('worldMap').classList.remove('active');
  Game.mode = 'bedroom';
  showPauseHint();
}

// === SHOP === (v1.26 rework: tabs + gun drill-in + equipment)
// Tabs: Guns · Ammo · Gear · Mods (v1.128, backlog D.5 B, Michael: A — four tabs by what it's for; was BBs · Loadout ·
// Guns · Accessories · Equipment). Ammo is the BB packs, speed loaders and BB colours; Gear the Belt & Holster, eyewear,
// armour and shoes; Mods the sights, lasers and flashlight. The rows, prices and look are unchanged; only where they sit.
// activeTab drives the top category bar; view 'list' shows the tab's grid,
// view 'gun' shows a single gun's detail page (mags + spares + attachment).
const SHOP_TABS = ['Guns', 'Ammo', 'Gear', 'Mods', 'Clothes'];   // v1.197: Clothes (D.21)
let shopState = { activeTab: 'Guns', view: 'list', detailGun: null, flash: null, gunKind: 'ALL' };   // v1.240: gunKind

function openShop() {
  document.getElementById('shopScreen').classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'shop';
  exitPointerLock();
  if (!SHOP_TABS.includes(shopState.activeTab)) shopState.activeTab = SHOP_TABS[0];
  shopState.view = 'list';
  shopState.detailGun = null;
  renderShop();
}

function closeShop() {
  document.getElementById('shopScreen').classList.remove('active');
  autoSave();   // v1.218 (D.29): whatever was bought or equipped
  Game.mode = 'bedroom';
  updateBedroomHud();
  showPauseHint();
}

// === v1.107 (backlog D.6, Michael: C): THE MIRROR — the character creator ===
// The bathroom mirror opens a screen with Mike in 3D (the kids' own createKid mesh) and a row of choices for each
// part of his look. Every click re-builds the preview and writes Game.persist.look; DONE saves if saving is on.
const LOOK_OPTIONS = [
  { key: 'height',    label: 'Height', kind: 'text', opts: [['short', 'Short'], ['average', 'Average'], ['tall', 'Tall']] },
  { key: 'build',     label: 'Build',  kind: 'text', opts: [['skinny', 'Skinny'], ['average', 'Average'], ['heavy', 'Heavy']] },
  { key: 'hairStyle', label: 'Hair',   kind: 'text', opts: [['short', 'Short'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['long', 'Long']] },
  { key: 'hairColor', label: 'Hair colour', kind: 'swatch', opts: [0x1a1410, 0x3a2818, 0x6a4a28, 0xa0703a, 0xd4b870, 0xb04a2a] },
  // v1.197 (D.21 step 1): the hats you own; the row shows once you have one, under the hair
  { key: 'hat', label: 'Hat', kind: 'text', owned: true,
    get opts() { return [['none', 'None'], ...KID_HAT_ORDER.filter(hatOwned).map(id => [id, KID_HATS[id].name])]; } },
  { key: 'skinColor', label: 'Skin',   kind: 'swatch', opts: [0xf0d0b0, 0xe6bf95, 0xe0b090, 0xc89870, 0xa87050, 0x7a4a30, 0x5a3420] },
  { key: 'shirtColor', label: 'Shirt', kind: 'swatch', opts: [0x3a5a8a, 0xc44a3a, 0x3a7a4a, 0xd8c040, 0x6a4a8a, 0xe8e4dc, 0x2a2a2a, 0xd07030] },
  // v1.198 (D.21 step 2): the tops you own, over the shirt; picking a Shirt colour or front takes the top off
  { key: 'top', label: 'Top', kind: 'text', owned: true,
    get opts() { return [['none', 'None'], ...KID_TOP_ORDER.filter(topOwned).map(id => [id, KID_TOPS[id].name])]; } },
  { key: 'pantsColor', label: 'Pants',  kind: 'swatch', opts: [0x2a2a2a, 0x2a3a5a, 0x5a4a3a, 0x4a5a3a, 0x8a8478, 0x6a2a2a] },
  // v1.199 (D.21 step 3): the shorts you own; a Pants colour puts the jeans back on
  { key: 'shorts', label: 'Shorts', kind: 'text', owned: true,
    get opts() { return [['none', 'None'], ...KID_SHORTS_ORDER.filter(shortsOwned).map(id => [id, KID_SHORTS[id].name])]; } },
  // v1.206 (D.21 shoes, Michael: A): the plain pair's colour, free; until you pick, the one you have on is lit
  { key: 'shoeColor', label: 'Sneakers', kind: 'swatch', opts: KID_SNEAKER_COLORS, current: lookShoeColor },
  { key: 'glasses',   label: 'Glasses', kind: 'text', opts: [[false, 'None'], [true, 'Glasses']] },
  // v1.123 (D.6): the rows that waited on the v1.118 face and v1.120 shirt
  { key: 'eyeColor',  label: 'Eyes',   kind: 'swatch', opts: ['brown', 'hazel', 'green', 'blue', 'gray'] },
  { key: 'shirtFront', label: 'Shirt front', kind: 'text', opts: [['plain', 'Plain'], ['stripe', 'Stripe'], ['pocket', 'Pocket']] },
  // v1.200 (D.21, your crew): a name and a colour; the colour is a bandana you and your allies wear
  { key: 'crewName', label: 'Crew name', kind: 'input', crew: true },
  { key: 'crewColor', label: 'Crew colour', kind: 'swatch', crew: true, get opts() { return [null, ...CREW_COLORS.map(c => c.hex)]; } },
];
// v1.200 (D.21, "then your crew: a name and colors your allies wear too"; Michael: C on "A better game" 2). The crew is
// set at the mirror under YOUR CREW. Its name heads your side on the briefing (YOUR SIDE until you name it); its colour
// is a bandana worn by you (when no hat is on) and by every ally in a match, except a VIP (his cap), Seth (the rival)
// and the tutorial. None takes the bandanas off.
const CREW_COLORS = [
  { hex: 0xe07a1e, name: 'orange' }, { hex: 0x2a5ad0, name: 'blue' }, { hex: 0x2f8a3a, name: 'green' },
  { hex: 0x6a3a9a, name: 'purple' }, { hex: 0xe0c020, name: 'yellow' }, { hex: 0x1e1e20, name: 'black' },
];
const CREW_NAME_MAX = 20;
function cleanCrewName(v) {
  return String(v == null ? '' : v).replace(/[<>&"`\\]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '').slice(0, CREW_NAME_MAX);
}
function crewName() { return cleanCrewName((Game.persist.look || {}).crewName).trim(); }
function crewColor() {
  const c = (Game.persist.look || {}).crewColor;
  return CREW_COLORS.some(k => k.hex === c) ? c : null;
}
function crewWornBy(sc, es, team) {
  if (team !== 'player' || es.vip || sc.tutorial || es.charId === 'seth') return null;
  return crewColor();
}
const MIRROR = { renderer: null, scene: null, camera: null, kid: null };
function _hexCss(n) { return '#' + n.toString(16).padStart(6, '0'); }
function ensureMirrorScreen() {
  let el = document.getElementById('mirrorScreen');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'menu-overlay'; el.id = 'mirrorScreen';
  // v1.289 (D.46): on paper (nb-paper), DONE a sticky note (nb-btn)
  el.innerHTML = `<div class="loadout-card nb-paper" style="max-width:860px">
    <div class="loadout-header"><div class="loadout-title">The Mirror</div><button class="loadout-close nb-btn" id="mirrorDoneBtn">DONE</button></div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
      <canvas id="mirrorCanvas" width="300" height="400" style="width:300px;height:400px;border-radius:6px;background:#2a2f38;flex:none"></canvas>
      <div id="mirrorOptions" style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:10px"></div>
    </div></div>`;
  document.body.appendChild(el);
  el.querySelector('#mirrorDoneBtn').addEventListener('click', closeMirror);
  return el;
}
function renderMirrorOptions() {
  const box = document.getElementById('mirrorOptions');
  box.innerHTML = '';
  const look = Game.persist.look;
  for (const row of LOOK_OPTIONS) {
    if (row.owned && row.opts.length < 2) continue;   // v1.197: nothing to choose yet
    if (row.crew && row.key === 'crewName') {          // v1.200: the crew's own heading
      const h = document.createElement('div');
      h.className = 'mirror-crew-head';
      h.style.cssText = 'margin-top:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,.18);font-size:13px;letter-spacing:.12em;color:#e8b070';
      h.textContent = 'YOUR CREW';
      box.appendChild(h);
    }
    const r = document.createElement('div');
    r.className = 'mirror-row'; r.dataset.key = row.key;
    r.innerHTML = `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-bottom:4px">${row.label}</div>`;
    if (row.kind === 'input') {   // v1.200: the crew name, typed; the game's keys don't see it
      const inp = document.createElement('input');
      inp.type = 'text'; inp.id = 'mirrorCrewName'; inp.maxLength = CREW_NAME_MAX; inp.placeholder = 'Name your crew';
      inp.value = cleanCrewName(look[row.key]);
      inp.style.cssText = 'width:100%;max-width:260px;box-sizing:border-box;padding:6px 8px;border-radius:4px;font:inherit;font-size:14px;color:#f4e9d8;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.25)';
      for (const ev of ['keydown', 'keyup', 'keypress']) inp.addEventListener(ev, e => e.stopPropagation());
      inp.addEventListener('input', () => {
        const v = cleanCrewName(inp.value);
        if (v !== inp.value) inp.value = v;
        Game.persist.look.crewName = v;
      });
      r.appendChild(inp);
      box.appendChild(r);
      continue;
    }
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
    for (const o of row.opts) {
      const val = row.kind === 'swatch' ? o : o[0];
      const cur = row.current ? row.current(look) : look[row.key];   // v1.206: the sneakers you have on
      const on = (cur === undefined ? null : cur) === val;   // v1.200: an old save's crew colour is none
      const b = document.createElement('button');
      b.className = 'mirror-opt' + (on ? ' on' : '');
      b.dataset.value = JSON.stringify(val);
      if (row.kind === 'swatch' && val === null) {   // v1.200: no crew colour
        b.textContent = '×';
        b.style.cssText = `width:30px;height:30px;border-radius:50%;cursor:pointer;color:#f4e9d8;font-size:16px;line-height:1;background:rgba(255,255,255,.08);border:${on ? '3px solid #f4e9d8' : '2px solid rgba(255,255,255,.2)'}`;
        b.title = 'none';
      } else if (row.kind === 'swatch') {
        const hex = typeof val === 'string' ? KID_EYE_COLORS[val] : val;   // v1.123: the eye row names its colours
        b.style.cssText = `width:30px;height:30px;border-radius:50%;cursor:pointer;background:${_hexCss(hex)};border:${on ? '3px solid #f4e9d8' : '2px solid rgba(255,255,255,.2)'}`;
        b.title = typeof val === 'string' ? val : ((CREW_COLORS.find(c => c.hex === val) || {}).name || _hexCss(val));
      } else {
        b.textContent = o[1];
        b.style.cssText = `padding:5px 12px;border-radius:4px;cursor:pointer;font:inherit;font-size:13px;color:#f4e9d8;background:${on ? '#b8562e' : 'rgba(255,255,255,.08)'};border:1px solid rgba(255,255,255,.2)`;
      }
      b.addEventListener('click', () => {
        Game.persist.look[row.key] = val;
        if (row.key === 'shirtColor' || row.key === 'shirtFront') Game.persist.look.top = 'none';   // v1.198: your own shirt again
        if (row.key === 'pantsColor') Game.persist.look.shorts = 'none';                              // v1.199: your jeans again
        renderMirrorOptions(); renderMirrorPreview();
      });
      btns.appendChild(b);
    }
    r.appendChild(btns);
    box.appendChild(r);
    if (row.key === 'crewColor') box.appendChild(mirrorCrewRow());   // v1.273: who is in it
  }
}
// v1.273 (D.28 step 1): the YOUR CREW card lists who has joined, out of five
function mirrorCrewRow() {
  const r = document.createElement('div');
  r.className = 'mirror-row'; r.dataset.key = 'crewMembers';
  const m = crewMembers();
  r.innerHTML = `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-bottom:4px">In it · ${m.length} of ${CREW_MAX}</div>
    <div id="mirrorCrewMembers" style="font-size:14px;color:#f4e9d8">${m.length ? m.map(id => CHARACTERS[id].name).join(' · ') : 'Just you so far. Friends ask to join by text as the summer goes.'}</div>`;
  return r;
}
function renderMirrorPreview() {
  const canvas = document.getElementById('mirrorCanvas');
  if (!MIRROR.renderer) {
    MIRROR.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    MIRROR.renderer.setSize(300, 400, false);
    MIRROR.scene = new THREE.Scene();
    MIRROR.scene.background = new THREE.Color(0x2a2f38);
    MIRROR.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.9));
    const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1.5, 3, 2.5); MIRROR.scene.add(d);
    MIRROR.camera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20);
    MIRROR.camera.position.set(0.9, 1.15, 3.6); MIRROR.camera.lookAt(0, 0.85, 0);
  }
  if (MIRROR.kid) MIRROR.scene.remove(MIRROR.kid.group);
  MIRROR.kid = createKid(Object.assign({}, Game.persist.look), 'pistol');
  MIRROR.kid.group.rotation.y = 0.35;
  MIRROR.scene.add(MIRROR.kid.group);
  MIRROR.renderer.render(MIRROR.scene, MIRROR.camera);
}
// v1.108 (D.6 part 2): height is not only cosmetic. A short Mike's eyes and hitbox sit 8 cm lower, a tall one's
// 8 cm higher (the kid mesh differs more; the game keeps the spread small so no choice is a real edge).
const LOOK_HEIGHT_DELTA = { short: -0.08, average: 0, tall: 0.08 };
function applyPlayerLook() {
  const d = LOOK_HEIGHT_DELTA[(Game.persist.look || {}).height] || 0;
  Game.player.eyeOffsetStand = 1.35 + d;
  Game.player.eyeOffsetCrouch = 0.8 + d * 0.6;
  Game.player.height = 1.5 + d;
}
function openMirror() {
  ensureMirrorScreen().classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'mirror';
  exitPointerLock();
  renderMirrorOptions();
  renderMirrorPreview();
}
function closeMirror() {
  closeStoryCards();   // v1.358: the cards come before the mirror; past the mirror they are done
  document.getElementById('mirrorScreen').classList.remove('active');
  autoSave();   // the look is part of the save (only once the player has opted in, as everywhere)
  Game.mode = 'bedroom';
  updateBedroomHud();
  showPauseHint();
}

// === v1.358 (D.77, Michael: C — the cards, then Eric's text): SETTING THE STAGE ===
// A new save opens on four story cards on notebook paper, over the mirror (so the mirror is next, and its DONE, which
// the cards cover, closes them too), with a short sting; NEXT or Enter goes on, SKIP or Esc closes them. The last one
// hands you to the room, where Eric's first text (SUMMER_TEXTS 'start') waits on the phone, the room tour's first stop.
// The title's STORY button plays them again, back to the title.
const STORY_CARDS = [
  { head: 'Friday, 30 May 2003', text: 'The last bell rings. No school till September: thirteen weeks of summer, and nothing you have to do.' },
  { head: 'Everybody has one', text: 'Every kid on the street has an airsoft gun now. Spring pistols from the mall, a battery rifle if your parents caved. Eye pro on, and a tag is a tag.' },
  { head: 'The streets', text: 'Winnmark, Bunratty, the Hollow down by the river, the lot behind the store: every street has its kids, and they all want the summer.' },
  { head: 'Down the road', text: 'Seth has set up targets at the end of Winnmark, and he’s putting a crew together. By August somebody runs this neighborhood.' },
];
const Story = { open: false, i: 0, then: null };
function openStoryCards(then) {
  Story.open = true; Story.i = 0; Story.then = then || null;
  document.getElementById('storyScreen').classList.add('active');
  renderStoryCard();
  playMusicSting('story');
}
function renderStoryCard() {
  const c = STORY_CARDS[Story.i], last = Story.i === STORY_CARDS.length - 1;
  document.getElementById('storyHead').textContent = c.head;
  document.getElementById('storyText').textContent = c.text;
  document.getElementById('storyDots').textContent = STORY_CARDS.map((_, k) => k === Story.i ? '●' : '○').join(' ');
  document.getElementById('storyNextBtn').textContent = last ? 'START THE SUMMER ▶' : 'NEXT ▶';
  document.getElementById('storySkipBtn').style.visibility = last ? 'hidden' : 'visible';
}
function nextStoryCard() {
  if (!Story.open) return;
  if (Story.i < STORY_CARDS.length - 1) { Story.i++; renderStoryCard(); } else closeStoryCards();
}
function closeStoryCards() {
  if (!Story.open) return;
  Story.open = false;
  document.getElementById('storyScreen').classList.remove('active');
  const then = Story.then; Story.then = null;
  if (then) then();
}
document.getElementById('storyNextBtn').addEventListener('click', nextStoryCard);
document.getElementById('storySkipBtn').addEventListener('click', closeStoryCards);
document.getElementById('titleStoryBtn').addEventListener('click', () => { initAudio(); openStoryCards(); });
// Enter, Space or → goes on; Esc skips. Caught first, so the mirror and the title never see these keys while the cards are up.
document.addEventListener('keydown', e => {
  if (!Story.open || e.repeat) return;
  if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'ArrowRight') nextStoryCard();
  else if (e.code === 'Escape') closeStoryCards();
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);

// === LOADOUT MANAGEMENT SCREEN ===
let loadoutPickerSlot = -1;

// v1.132 (backlog D.5 C step 1, Michael: A): the Loadout screen shows your kid (the mirror's look, createKid) turning
// slowly in a panel with the slot-1 gun in hand, and a leader line from each body part to what is equipped there: eye
// pro, chest, arms, legs, feet, belt and holster, the gun. The worn gear has no meshes on the kid yet (step 2, a group
// at a time); the lines name it. Part points are in the average kid's local frame (createKid's group scale applies).
const LOADOUT_KID = { renderer: null, scene: null, camera: null, kid: null, gun: null, yaw: 0, gear: null, gearSig: '', turn: 0 };   // v1.279: turn, the pad's
const LOADOUT_KID_PARTS = [
  { key: 'eyes',  part: 'EYES',  p: [0, 1.27, 0.15],      side: 'L' },   // the kid faces +z; eyes at 1.27 (head top 1.47)
  { key: 'chest', part: 'CHEST', p: [0, 0.92, 0.13],      side: 'L' },
  { key: 'arms',  part: 'ARMS',  p: [0.25, 0.85, 0.02],   side: 'R' },
  { key: 'belt',  part: 'BELT',  p: [0, 0.62, 0.13],      side: 'L' },
  { key: 'gun',   part: 'HANDS', p: [-0.27, 0.56, 0.2],   side: 'L' },   // the gun hangs at the right hip (screen left), pointing +z
  { key: 'legs',  part: 'KNEES', p: [-0.08, 0.32, 0.09],  side: 'R' },
  { key: 'feet',  part: 'FEET',  p: [-0.08, 0.04, 0.12],  side: 'R' },
  { key: 'walkie', part: 'HIP',  p: [0.15, 0.51, 0.165],   side: 'R' },   // v1.149: the walkie on the left hip (D.10)
];
function loadoutKidItems() {
  const eq = Game.persist.equipped, own = Game.persist.owned || {};
  const armor = (zone) => { const id = eq.armor && eq.armor[zone]; return id && ARMOR[id] ? ARMOR[id].name : 'nothing'; };
  const belt = getUnlockedSlotCount() >= 4 ? 'Belt & Holster' : getUnlockedSlotCount() >= 3 ? 'Utility Belt' : 'nothing';
  return {
    eyes: (EYEWEAR[eq.eyewear] || EYEWEAR.none).name, chest: armor('chest'), arms: armor('arms'), legs: armor('legs'),
    feet: (SHOES[eq.shoes] || SHOES.none).name, belt, gun: getGunDisplayName(eq.gun), walkie: 'Walkie-Talkie',
  };
}
// v1.133 (backlog D.5 C step 2): what is equipped is worn on the Loadout kid, a mesh group per body part: eye pro on
// the head, the chest rig or plate carrier on the torso, elbow pads on the elbows, knee pads on the legs, the shoe pair
// (a colour and a sole of its own), and the Utility Belt with pouches and the Drop-Leg Holster on the right thigh.
// Each piece is parented to the node it sits on (head, torso, elbow, leg, shoe), so a pose would carry it. Sneakers
// (default) and "nothing" add no mesh. Returns the meshes added by group, for the test.
const LOADOUT_GEAR_SHOES = {
  trail_shoes:  { upper: 0x7a6a48, sole: 0x3a3228, lugs: true },
  track_spikes: { upper: 0xf06a1a, sole: 0x1a1a1a, spikes: true },
  cushioned:    { upper: 0xd8dade, sole: 0xf4f4f0, accent: 0x2a6ad8, thick: true },
};
const _gearLensMats = {};
function _gearLensMat(color, opacity) {
  const k = color + ':' + opacity;
  return _gearLensMats[k] || (_gearLensMats[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, transparent: true, opacity }));
}
function loadoutKidGearKeys() {
  const eq = Game.persist.equipped, a = eq.armor || {};
  return { eyewear: EYEWEAR[eq.eyewear] ? eq.eyewear : 'none', chest: a.chest || null, arms: a.arms || null, legs: a.legs || null,
    shoes: SHOES[eq.shoes] ? eq.shoes : 'none', belt: getUnlockedSlotCount() };
}
function buildKidGear(kid, gear) {
  const po = kid.pose, out = { eyewear: [], chest: [], arms: [], legs: [], shoes: [], belt: [], walkie: [] };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const merge = (parent, group, b, mats) => {
    const gg = new THREE.Group(); gg.userData.kidGear = group;
    _propMerge(gg, b, mats); parent.add(gg); gg.traverse(m => { if (m.isMesh) out[group].push(m); });
  };
  // eye pro, in the head's frame (face plane z 0.14, eyes at y 0.012, the head 0.28 across)
  if (gear.eyewear && gear.eyewear !== 'none') {
    const def = EYEWEAR[gear.eyewear], F = 0.14, EY = 0.012;
    const b = {}; const add = _propAdder(b);
    const mats = { frame: _kidFaceMat('gframe', new THREE.Color(def.view.frameColor).getHex(), 0.5),
      strap: _kidFaceMat('gstrap', 0x1a1a1e, 0.8) };
    const strap = (y, t) => {   // a band round the head at height y
      add('strap', box(0.296, t, 0.012), 0, y, -0.148); add('strap', box(0.012, t, 0.29), -0.148, y, 0); add('strap', box(0.012, t, 0.29), 0.148, y, 0);
    };
    if (gear.eyewear === 'glasses_clear') {
      mats.lens = _gearLensMat(0xdfe8ff, 0.3);
      add('lens', box(0.2, 0.06, 0.006), 0, EY - 0.004, F + 0.022);             // one wraparound shield
      for (const sx of [-1, 1]) add('lens', box(0.006, 0.05, 0.05), sx * 0.103, EY - 0.004, F - 0.002);
      add('frame', box(0.21, 0.01, 0.012), 0, EY + 0.03, F + 0.022);           // brow bar
      for (const sx of [-1, 1]) add('frame', box(0.008, 0.01, 0.17), sx * 0.146, EY + 0.025, F - 0.07);   // temple arms
    } else if (gear.eyewear === 'goggles_swim') {
      mats.lens = _gearLensMat(0x1a3a9a, 0.65);
      for (const sx of [-1, 1]) {
        add('frame', box(0.07, 0.048, 0.016), sx * 0.058, EY, F + 0.012);
        add('lens', box(0.058, 0.036, 0.006), sx * 0.058, EY, F + 0.022);
      }
      add('frame', box(0.03, 0.008, 0.008), 0, EY + 0.004, F + 0.014);         // nose bridge
      strap(EY, 0.012);
    } else if (gear.eyewear === 'mesh_mask') {
      mats.mesh = _gearLensMat(0x202024, 0.72);
      add('frame', box(0.26, 0.016, 0.03), 0, EY + 0.045, F + 0.02);           // rim: brow, chin, sides
      add('frame', box(0.22, 0.02, 0.04), 0, -0.118, F + 0.012);
      for (const sx of [-1, 1]) add('frame', box(0.016, 0.18, 0.05), sx * 0.124, -0.035, F + 0.008);
      add('mesh', box(0.236, 0.15, 0.006), 0, -0.035, F + 0.03);              // the mesh over the whole face
      for (let i = 0; i < 5; i++) add('frame', box(0.236, 0.003, 0.004), 0, EY + 0.03 - i * 0.035, F + 0.034);   // grid rows
      strap(EY + 0.03, 0.016); strap(-0.07, 0.016);
    } else {
      // goggles: a chunky foam frame and one tinted lens, smoke or amber
      mats.lens = gear.eyewear === 'goggles_amber' ? _gearLensMat(0xe0a020, 0.6) : _gearLensMat(0x23252e, 0.7);
      add('frame', box(0.25, 0.085, 0.036), 0, EY, F + 0.012);
      add('lens', box(0.22, 0.062, 0.006), 0, EY, F + 0.032);
      add('frame', box(0.05, 0.03, 0.04), 0, EY - 0.04, F + 0.016);            // nose notch
      strap(EY, 0.03);
    }
    merge(po.head, 'eyewear', b, mats);
  }
  // chest, in the torso's frame (0.42 × 0.5 × 0.24, centre 0, the shirt's yoke at 0.23)
  if (gear.chest) {
    const heavy = gear.chest === 'chest_heavy';
    const b = {}; const add = _propAdder(b);
    const mats = { body: _kidFaceMat('gvest', heavy ? 0x4a5236 : 0x24262a, 0.85), pouch: _kidFaceMat('gpouch', heavy ? 0x3c4430 : 0x3a3c40, 0.85),
      buckle: _kidFaceMat('gbuckle', 0x101010, 0.5) };
    if (heavy) {
      add('body', box(0.36, 0.36, 0.05), 0, 0.03, 0.145); add('body', box(0.36, 0.36, 0.05), 0, 0.03, -0.145);   // front and back plates
      for (const sx of [-1, 1]) {
        add('body', box(0.06, 0.03, 0.31), sx * 0.12, 0.262, 0);              // shoulder straps
        add('body', box(0.035, 0.18, 0.26), sx * 0.22, -0.06, 0);             // cummerbund
      }
      for (const px of [-0.11, 0, 0.11]) { add('pouch', box(0.09, 0.12, 0.05), px, -0.08, 0.19); add('buckle', box(0.05, 0.02, 0.006), px, -0.03, 0.216); }
      add('pouch', box(0.24, 0.06, 0.012), 0, 0.15, 0.176);                   // the patch panel
    } else {
      add('body', box(0.32, 0.2, 0.035), 0, 0.0, 0.135);                       // foam front panel
      for (const sx of [-1, 1]) add('body', box(0.05, 0.022, 0.27), sx * 0.11, 0.255, 0);   // shoulder straps
      for (const sx of [-1, 1]) add('body', box(0.05, 0.25, 0.022), sx * 0.11, 0.13, -0.13);
      add('body', box(0.44, 0.04, 0.26), 0, -0.06, 0);                         // the strap round the back
      for (const px of [-0.09, 0, 0.09]) add('pouch', box(0.07, 0.11, 0.04), px, -0.01, 0.17);
    }
    merge(po.torso, 'chest', b, mats);
  }
  // elbow pads, on each elbow (the forearm hangs −y from it, the back of the arm is −z)
  if (gear.arms) {
    const mats = { pad: _kidFaceMat('gpad', 0x4a4c52, 0.7), band: _kidFaceMat('gband', 0x202024, 0.9) };
    for (const rig of [po.rigR, po.rigL]) {
      const b = {}; const add = _propAdder(b);
      add('pad', box(0.1, 0.1, 0.04), 0, -0.01, -0.068);
      add('band', box(0.124, 0.07, 0.136), 0, 0.0, 0);
      merge(rig.elbow, 'arms', b, mats);
    }
  }
  // knee pads, on each leg (0.16 × 0.55 × 0.18, centre at 0.275, so the knee is near local y 0.03)
  if (gear.legs) {
    const mats = { pad: _kidFaceMat('gpad', 0x4a4c52, 0.7), band: _kidFaceMat('gband', 0x202024, 0.9) };
    for (const leg of [po.legL, po.legR]) {
      const b = {}; const add = _propAdder(b);
      add('pad', box(0.13, 0.13, 0.04), 0, 0.03, 0.1);
      add('band', box(0.172, 0.03, 0.192), 0, 0.075, 0); add('band', box(0.172, 0.03, 0.192), 0, -0.02, 0);
      merge(leg, 'legs', b, mats);
    }
  }
  // shoes: the pair's colour on the uppers and a sole of its own (lugs, spikes, a thick cushion)
  const sd = LOADOUT_GEAR_SHOES[gear.shoes];
  if (sd) {
    const upper = new THREE.MeshStandardMaterial({ color: sd.upper, roughness: 0.7 });
    for (const sh of [po.shoeL, po.shoeR]) {
      sh.material = upper;
      const b = {}; const add = _propAdder(b);
      const mats = { sole: _kidFaceMat('gsole', sd.sole, 0.8), accent: _kidFaceMat('gaccent', sd.accent || sd.sole, 0.6) };
      if (sd.thick) { add('sole', box(0.19, 0.035, 0.27), 0, -0.035, 0); add('accent', box(0.192, 0.012, 0.1), 0, -0.03, -0.06); }
      if (sd.lugs) for (let i = 0; i < 5; i++) add('sole', box(0.17, 0.014, 0.025), 0, -0.047, -0.1 + i * 0.05);
      if (sd.spikes) for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add('accent', box(0.012, 0.025, 0.012), sx * 0.05, -0.052, 0.03 + i * 0.035);
      for (const sx of [-1, 1]) add('accent', box(0.006, 0.03, 0.2), sx * 0.081, 0.005, 0);   // a stripe down each side
      merge(sh, 'shoes', b, mats);
    }
  }
  // the Utility Belt (slot 3) over the jeans' belt with two pouches, and the Drop-Leg Holster (slot 4) on the right
  // thigh (the kid's right is −x, the gun side), in the kid's group frame
  if (gear.belt >= 3) {
    const b = {}; const add = _propAdder(b);
    const mats = { web: _kidFaceMat('gweb', 0x3a3a2e, 0.85), pouch: _kidFaceMat('gbpouch', 0x55553f, 0.85), buckle: _kidFaceMat('gbuckle', 0x101010, 0.5) };
    add('web', box(0.44, 0.05, 0.26), 0, 0.568, 0);
    add('buckle', box(0.06, 0.04, 0.012), 0, 0.568, 0.134);
    for (const sx of [-1, 1]) add('pouch', box(0.06, 0.08, 0.07), sx * 0.15, 0.548, -0.12);
    add('pouch', box(0.05, 0.07, 0.08), 0.225, 0.55, 0.0);
    if (gear.belt >= 4) {
      add('web', box(0.04, 0.12, 0.03), -0.2, 0.5, 0.0);                     // the drop strap from the belt
      add('pouch', box(0.04, 0.17, 0.1), -0.205, 0.37, 0.0);                  // the holster platform
      add('buckle', box(0.03, 0.06, 0.04), -0.21, 0.47, 0.025);               // a pistol grip in it
      for (const y of [0.42, 0.32]) add('web', box(0.17, 0.025, 0.19), -0.1, y, 0);   // the leg straps round the thigh
    }
    merge(kid.group, 'belt', b, mats);
  }
  // v1.149 (backlog D.10, Michael: A): every kid carries a walkie, clipped to the jeans' belt on the left hip (+x),
  // in front of the Utility Belt's side pouch; no slot, nothing to buy
  {
    const b = {}; const add = _propAdder(b);
    addWalkieParts(add, 0.15, 0.555, 0.133);
    merge(kid.group, 'walkie', b, walkieMats());
  }
  return out;
}
function renderLoadoutKid() {
  const canvas = document.getElementById('loKidCanvas');
  if (!canvas) return;
  const L = LOADOUT_KID;
  if (!L.renderer) {
    L.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    L.renderer.setSize(280, 380, false);
    L.scene = new THREE.Scene();
    L.scene.background = new THREE.Color(0x2a2f38);
    L.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.9));
    const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1.5, 3, 2.5); L.scene.add(d);
    L.camera = new THREE.PerspectiveCamera(30, 280 / 380, 0.1, 20);
    L.camera.position.set(0, 0.95, 4.0); L.camera.lookAt(0, 0.8, 0);
  }
  const gun = Game.persist.equipped.gun;
  if (L.kid) L.scene.remove(L.kid.group);
  L.kid = createKid(Object.assign({}, Game.persist.look), gun);
  L.gun = gun;
  const gk = loadoutKidGearKeys();   // v1.133: and wears what is equipped
  L.gear = buildKidGear(L.kid, gk); L.gearSig = JSON.stringify(gk);
  L.scene.add(L.kid.group);
  drawLoadoutKid();
}
// Turn the kid (called each step while the screen is open), render, and re-place the labels on the projected parts.
function updateLoadoutKid(dt) {
  if (!LOADOUT_KID.kid) return;
  LOADOUT_KID.yaw += dt * 0.35;
  drawLoadoutKid();
}
function drawLoadoutKid() {
  const L = LOADOUT_KID;
  L.kid.group.rotation.y = -0.45 + 0.35 * Math.sin(L.yaw) + (L.turn || 0);   // swings between three-quarter views, gun side and front to camera; v1.279: plus the pad's turn
  L.kid.group.updateMatrixWorld(true);
  L.renderer.render(L.scene, L.camera);
  const items = loadoutKidItems(), svg = document.getElementById('loKidLabels');
  const rows = { L: 0, R: 0 };
  let html = '';
  L.labels = [];
  for (const pt of LOADOUT_KID_PARTS) {
    const v = new THREE.Vector3(...pt.p).applyMatrix4(L.kid.group.matrixWorld).project(L.camera);
    const x = (v.x + 1) / 2 * 280, y = (1 - v.y) / 2 * 380;
    const i = rows[pt.side]++;
    const lx = pt.side === 'L' ? 6 : 274, ly = 40 + i * 50 + (pt.side === 'R' ? 150 : 0);
    const anchor = pt.side === 'L' ? 'start' : 'end';
    const none = items[pt.key] === 'nothing';
    html += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(pt.side === 'L' ? lx + 52 : lx - 52)}" y2="${ly + 4}" stroke="${none ? 'rgba(255,255,255,.25)' : '#ff8c42'}" stroke-width="1"/>`
      + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${none ? '#888' : '#ff8c42'}"/>`
      + `<text class="part" x="${lx}" y="${ly - 6}" text-anchor="${anchor}">${pt.part}</text>`
      + `<text x="${lx}" y="${ly + 7}" text-anchor="${anchor}" data-key="${pt.key}" opacity="${none ? 0.55 : 1}">${items[pt.key]}</text>`;
    L.labels.push({ key: pt.key, x, y, lx, ly, text: items[pt.key] });
  }
  svg.innerHTML = html;
}

function openLoadout() {
  document.getElementById('loadoutScreen').classList.add('active');
  Game.prevMode = Game.mode;
  Game.mode = 'loadoutMgr';
  loadoutPickerSlot = -1;
  exitPointerLock();
  renderLoadoutManager();
  renderLoadoutKid();   // v1.132
}

function closeLoadout() {
  autoSave();   // v1.218 (D.29): what was mounted or packed
  document.getElementById('loadoutScreen').classList.remove('active');
  Game.mode = 'bedroom';
  updateBedroomHud();
  showPauseHint();
}

// v1.334 (D.65): the places on your kid, for the one list. worn() is what is on it now ({ name, detail } or null),
// fits() what else you own that goes there (each with its wear()), takeOff() empties it.
const LOADOUT_WORN_SLOTS = [
  { key: 'eyes', letter: 'E', label: 'Eyes', icon: '◓', sells: 'safety glasses, goggles and a mesh mask',
    worn: () => { const id = Game.persist.equipped.eyewear; return id && id !== 'none' && EYEWEAR[id] ? { name: EYEWEAR[id].name, detail: wornHits(EYEWEAR[id].hp) } : null; },
    fits: () => Object.keys(EYEWEAR).filter(id => id !== 'none' && Game.persist.ownedEquipment.eyewear[id] && Game.persist.equipped.eyewear !== id)
      .map(id => ({ name: EYEWEAR[id].name, detail: crewLoanHolder('eyewear', id) ? CHARACTERS[crewLoanHolder('eyewear', id)].name + ' has them · takes them back' : wornHits(EYEWEAR[id].hp), wear: () => equipEyewear(id) })),   // v1.337
    takeOff: () => equipEyewear('none') },
  ...[['chest', 'C', 'Chest', 'a foam chest rig and a plate-carrier vest'], ['arms', 'A', 'Arms', 'elbow pads'], ['legs', 'K', 'Knees', 'knee pads']]
    .map(([zone, letter, label, sells]) => ({ key: zone, letter, label, icon: '⛊', sells,
      worn: () => { const id = (Game.persist.equipped.armor || {})[zone]; return id && ARMOR[id] ? { name: ARMOR[id].name, detail: wornHits(ARMOR[id].hp) } : null; },
      fits: () => Object.keys(ARMOR).filter(id => ARMOR[id].zone === zone && Game.persist.ownedEquipment.armor[id] && (Game.persist.equipped.armor || {})[zone] !== id)
        .map(id => ({ name: ARMOR[id].name, detail: wornHits(ARMOR[id].hp), wear: () => { Game.persist.equipped.armor[zone] = id; } })),
      takeOff: () => { delete Game.persist.equipped.armor[zone]; } })),
  // your sneakers are always on, so the feet are never empty: other pairs swap with them
  { key: 'feet', letter: 'F', label: 'Feet', icon: '👟', sells: 'trail runners, track spikes and cross-trainers',
    worn: () => { const id = Game.persist.equipped.shoes || 'none'; return { name: id === 'none' || !SHOES[id] ? 'Sneakers' : SHOES[id].name, detail: '' }; },
    fits: () => Object.keys(SHOES).filter(id => (id === 'none' || Game.persist.ownedEquipment.shoes[id]) && (Game.persist.equipped.shoes || 'none') !== id)
      .map(id => ({ name: id === 'none' ? 'Sneakers' : SHOES[id].name, detail: id === 'none' ? 'your own pair' : crewLoanHolder('shoes', id) ? CHARACTERS[crewLoanHolder('shoes', id)].name + ' has them · takes them back' : '', wear: () => equipShoes(id) })),   // v1.337
    takeOff: null },
];
function wornHits(hp) { return hp ? `+${hp} hit${hp > 1 ? 's' : ''}` : ''; }
function loadoutPickerItem(picker, icon, name, detail, onClick) {
  const pi = document.createElement('div');
  pi.className = 'picker-item';
  pi.innerHTML = `<span class="lo-pk-icon" style="color:var(--ui-accent)">${icon}</span> ${name} <span class="lo-pk-sub" style="color:#888; margin-left:auto">${detail || ''}</span>`;
  pi.addEventListener('click', () => { onClick(); loadoutPickerSlot = -1; renderLoadoutManager(); });
  picker.appendChild(pi);
}
function loadoutPickerNone(picker, sells, more) {
  const d = document.createElement('div');
  d.className = 'picker-none';
  d.textContent = (more ? 'Nothing else you own fits this' : 'Nothing you own fits this') + ` — airsoft.com sells ${sells}.`;
  picker.appendChild(d);
}
function renderLoadoutManager() {
  const unlocked = getUnlockedSlotCount();
  const slotsList = document.getElementById('loSlotsList');
  slotsList.innerHTML = '';

  for (let i = 0; i < 4; i++) {
    const slot = Game.persist.loadoutSlots[i];
    const desc = describeSlot(i);
    const locked = i >= unlocked;
    const isGun = i === 0;

    const div = document.createElement('div');
    div.className = 'lo-slot' + (locked ? ' locked' : '') + (isGun ? ' gun' : '') + (!slot && !locked && !isGun ? ' empty' : '');
    const keyEl = `<span class="lo-slot-key">${i+1}</span>`;
    if (locked) {
      // v1.106: say which piece of gear opens the slot
      const needs = i === 2 ? 'the Utility Belt' : 'the Drop-Leg Holster';
      div.innerHTML = `${keyEl}<span class="lo-slot-icon">·</span><div class="lo-slot-info"><div class="lo-slot-name">Locked</div><div class="lo-slot-desc">Needs ${needs}, at airsoft.com</div></div>`;
    } else if (isGun) {
      // Slot 0 — gun. Clicking opens a picker of owned guns so the player can swap.
      div.innerHTML = `${keyEl}<span class="lo-slot-icon">${desc.icon}</span><div class="lo-slot-info"><div class="lo-slot-name">${desc.name}</div><div class="lo-slot-desc">${desc.desc} — click to swap</div></div>`;
      div.addEventListener('click', () => {
        loadoutPickerSlot = (loadoutPickerSlot === 0) ? -1 : 0;
        renderLoadoutManager();
      });
    } else if (!slot) {
      div.innerHTML = `${keyEl}<span class="lo-slot-icon">+</span><div class="lo-slot-info"><div class="lo-slot-name">Empty slot</div><div class="lo-slot-desc">Click to see what fits</div></div>`;   // v1.334 (D.65)
      div.addEventListener('click', () => {
        loadoutPickerSlot = (loadoutPickerSlot === i) ? -1 : i;
        renderLoadoutManager();
      });
    } else {
      // v1.334 (D.65, Michael: A): a full slot opens its picker too, with "Take it out" first (it used to empty on a click)
      div.innerHTML = `${keyEl}<span class="lo-slot-icon">${desc.icon}</span><div class="lo-slot-info"><div class="lo-slot-name">${desc.name}</div><div class="lo-slot-desc">${desc.desc} · click to change</div></div>`;
      div.addEventListener('click', () => {
        loadoutPickerSlot = (loadoutPickerSlot === i) ? -1 : i;
        renderLoadoutManager();
      });
    }
    slotsList.appendChild(div);

    // Gun picker for slot 0 — list all owned guns, click to equip
    if (loadoutPickerSlot === 0 && isGun) {
      const picker = document.createElement('div');
      picker.className = 'picker';
      const ownedGuns = getOwnedGunTypes();   // v1.60: includes auto guns (was missing ak47/mp5/ump/mac10)
      for (const g of ownedGuns) {
        const pi = document.createElement('div');
        pi.className = 'picker-item';
        const isCurrent = Game.persist.equipped.gun === g;
        const spec = getGunSpec(g);
        const magSize = getMaxAmmoForGun(g);
        const lentTo = crewLoanHolder('gun', g);   // v1.337 (D.28 step 4): a crew kid has it; picking it takes it back
        pi.innerHTML = `<span class="lo-pk-icon" style="color:var(--ui-accent)">⌐</span> ${spec.displayName}${isCurrent ? ' <span class="lo-pk-sub" style="color:#888">· equipped</span>' : ''} <span class="lo-pk-sub" style="color:#888; margin-left:auto">${lentTo ? CHARACTERS[lentTo].name + ' has it · takes it back' : `${spec.muzzleVelocity} m/s · ${magSize} BB mag`}</span>`;
        pi.addEventListener('click', () => {
          crewTakeBack('gun', g);
          Game.persist.equipped.gun = g;
          // v1.60: drop any equipped spare mags that don't fit the new gun — they'd
          // only dry-click in-match. Speed loaders are gun-agnostic, so leave them.
          for (let s = 0; s < Game.persist.loadoutSlots.length; s++) {
            const sl = Game.persist.loadoutSlots[s];
            if (sl && sl.kind === 'spare_mag' && MAG_GUN_FIT[sl.refId] && MAG_GUN_FIT[sl.refId] !== g) {
              Game.persist.loadoutSlots[s] = null;
            }
          }
          loadoutPickerSlot = -1;
          renderLoadoutManager();
        });
        picker.appendChild(pi);
      }
      slotsList.appendChild(picker);
    }

    // Picker for equipment slots 2-4 (v1.334: full ones too, to take out or swap)
    if (loadoutPickerSlot === i && !locked && !isGun) {
      const picker = document.createElement('div');
      picker.className = 'picker';
      const avail = getAvailableSlotItems();
      const takeOut = () => {
        // v1.50: if unequipping a speed loader, return its remaining BBs to the bag.
        const slotData = Game.persist.loadoutSlots[i];
        if (slotData && slotData.kind === 'speed_loader') {
          const sl = Game.persist.speedLoaders.find(s => s.id === slotData.refId);
          returnSpeedLoaderToBag(sl);
        }
        Game.persist.loadoutSlots[i] = null;
      };
      if (slot) loadoutPickerItem(picker, '×', 'Take it out', 'leaves the slot empty', () => takeOut());
      if (avail.length === 0 && !slot) loadoutPickerNone(picker, 'spare mags and speed loaders');
      for (const item of avail) {
        loadoutPickerItem(picker, item.icon, item.name, item.detail, () => { takeOut(); Game.persist.loadoutSlots[i] = item.slotData; });
      }
      slotsList.appendChild(picker);
    }
  }

  // v1.334 (backlog D.65, Michael: A, "One list of every slot"): what you wear is in the same list, a row for each
  // place on your kid (eyes, chest, arms, knees, feet) under the four numbered slots. An empty one says "Empty slot";
  // a click on any row lists what you own that fits it (and "Take it off" when something is on), or says what
  // airsoft.com sells for it. The old WORN GEAR section below the columns is gone into it.
  for (const W of LOADOUT_WORN_SLOTS) {
    const on = W.worn();
    const div = document.createElement('div');
    div.className = 'lo-slot worn' + (on ? '' : ' empty');
    div.dataset.worn = W.key;
    div.innerHTML = `<span class="lo-slot-key">${W.letter}</span><span class="lo-slot-icon">${on ? W.icon : '+'}</span><div class="lo-slot-info">` +
      `<div class="lo-slot-name">${on ? on.name : 'Empty slot'}</div><div class="lo-slot-desc">${W.label}${on && on.detail ? ' · ' + on.detail : ''} · click to ${on ? 'change' : 'see what fits'}</div></div>`;
    div.addEventListener('click', () => {
      loadoutPickerSlot = (loadoutPickerSlot === W.key) ? -1 : W.key;
      renderLoadoutManager();
    });
    slotsList.appendChild(div);
    if (loadoutPickerSlot !== W.key) continue;
    const picker = document.createElement('div');
    picker.className = 'picker';
    const fits = W.fits();
    if (on && W.takeOff) loadoutPickerItem(picker, '×', 'Take it off', 'leaves the slot empty', W.takeOff);
    for (const f of fits) loadoutPickerItem(picker, W.icon, f.name, f.detail, f.wear);
    if (!fits.length && !on) loadoutPickerNone(picker, W.sells);
    else if (!fits.length) loadoutPickerNone(picker, W.sells, true);
    slotsList.appendChild(picker);
  }

  renderLoadoutCrew(slotsList);   // v1.337 (D.28 step 4)

  // Available items pool (reference)
  const poolList = document.getElementById('loPoolList');
  poolList.innerHTML = '';
  const avail = getAvailableSlotItems();
  if (avail.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'lo-pool-empty';
    empty.textContent = 'No equipment yet. Visit airsoft.com.';
    poolList.appendChild(empty);
  } else {
    for (const item of avail) {
      const div = document.createElement('div');
      div.className = 'lo-pool-item';
      div.innerHTML = `<span class="lo-pool-icon">${item.icon}</span><div class="lo-pool-info"><div class="lo-pool-name">${item.name}</div><div class="lo-pool-desc">${item.desc}</div></div><div class="lo-pool-count">${item.detail}</div>`;
      div.addEventListener('click', () => {
        // Equip to first empty non-gun slot
        const unlocked = getUnlockedSlotCount();
        for (let s = 1; s < unlocked; s++) {
          if (!Game.persist.loadoutSlots[s]) {
            Game.persist.loadoutSlots[s] = item.slotData;
            break;
          }
        }
        renderLoadoutManager();
      });
      poolList.appendChild(div);
    }
  }

  renderLoadoutWeight();
  // v1.132: a gun swap re-builds the kid (the gun is in its hands); a gear change only re-labels
  // v1.133: a gear change re-builds it too, since the kid now wears the gear
  if (LOADOUT_KID.kid && Game.mode === 'loadoutMgr') {
    if (LOADOUT_KID.gun !== Game.persist.equipped.gun || LOADOUT_KID.gearSig !== JSON.stringify(loadoutKidGearKeys())) renderLoadoutKid(); else drawLoadoutKid();
  }
}

// v1.337 (D.28 step 4, Michael: A, "a loan at the loadout"): a CREW row under your slots for each kid in your crew, with
// the gun he carries and what of yours he has on. A click lists, for his gun, HIS OWN first and then each gun you own
// that you aren't carrying (one another kid has passes to him), and for his eyes and feet what you own and aren't
// wearing, or Take it back.
function renderLoadoutCrew(list) {
  const crew = crewMembers();
  if (!crew.length) return;
  const head = document.createElement('div');
  head.className = 'lo-crew-head';
  head.textContent = 'Your Crew';
  list.appendChild(head);
  for (const kid of crew) {
    const ch = CHARACTERS[kid], gun = crewLent(kid, 'gun'), eye = crewLent(kid, 'eyewear'), shoe = crewLent(kid, 'shoes');
    const key = 'crew:' + kid;
    const div = document.createElement('div');
    div.className = 'lo-slot crew';
    div.dataset.crew = kid;
    const gear = [eye && EYEWEAR[eye].name, shoe && SHOES[shoe].name].filter(Boolean).join(', ');
    div.innerHTML = `<span class="lo-slot-key">${ch.name[0]}</span><span class="lo-slot-icon">⌐</span><div class="lo-slot-info">` +
      `<div class="lo-slot-name">${ch.name} · ${getGunDisplayName(gun || CREW_GUNS[kid])}</div>` +
      `<div class="lo-slot-desc">${gun ? 'your gun, your BBs' : 'his own gun and BBs'}${gear ? ' · ' + gear : ''} · click to change</div></div>`;
    div.addEventListener('click', () => { loadoutPickerSlot = (loadoutPickerSlot === key) ? -1 : key; renderLoadoutManager(); });
    list.appendChild(div);
    if (loadoutPickerSlot !== key) continue;
    const picker = document.createElement('div');
    picker.className = 'picker crew-picker';
    const sub = t => { const d = document.createElement('div'); d.className = 'picker-sub'; d.textContent = t; picker.appendChild(d); };
    sub('Gun');
    loadoutPickerItem(picker, gun ? '⌐' : '✓', `His own ${getGunDisplayName(CREW_GUNS[kid])}`, gun ? 'gives yours back' : 'carrying it', () => crewLend(kid, 'gun', null));
    for (const g of getOwnedGunTypes()) {
      if (g === crewYours('gun') || g === gun) continue;
      const other = crewLoanHolder('gun', g);
      loadoutPickerItem(picker, '⌐', getGunDisplayName(g), (other ? 'from ' + CHARACTERS[other].name + ' · ' : '') + `${CREW_LOAN_MAGS * getMaxAmmoForGun(g)} of your BBs a match`, () => crewLend(kid, 'gun', g));
    }
    for (const [kind, label, table, owned, gain] of [['eyewear', 'Eyes', EYEWEAR, Game.persist.ownedEquipment.eyewear, 'steadier aim'], ['shoes', 'Feet', SHOES, Game.persist.ownedEquipment.shoes, '5% faster']]) {
      sub(label);
      const on = crewLent(kid, kind);
      if (on) loadoutPickerItem(picker, '×', `Take back the ${table[on].name}`, 'gives them back', () => crewLend(kid, kind, null));
      const ids = Object.keys(table).filter(id => id !== 'none' && owned[id] && id !== on && crewYours(kind) !== id);
      for (const id of ids) {
        const other = crewLoanHolder(kind, id);
        loadoutPickerItem(picker, kind === 'shoes' ? '👟' : '◓', table[id].name, (other ? 'from ' + CHARACTERS[other].name + ' · ' : '') + gain, () => crewLend(kid, kind, id));
      }
      if (!on && !ids.length) { const d = document.createElement('div'); d.className = 'picker-none'; d.textContent = `Nothing you own and aren't wearing — airsoft.com sells ${kind === 'shoes' ? 'shoes' : 'eyewear'}.`; picker.appendChild(d); }
    }
    list.appendChild(picker);
  }
}

// v1.60: paint the weight readout. Shows total lb, a light/medium/heavy tier,
// a fill bar (relative to a 24 lb "full kit" reference), and the resulting
// move-speed effect from carried gear.
function renderLoadoutWeight() {
  const valEl  = document.getElementById('loWeightValue');
  const tierEl = document.getElementById('loWeightTier');
  const fillEl = document.getElementById('loWeightFill');
  const noteEl = document.getElementById('loWeightNote');
  if (!valEl) return;
  const w = computeLoadoutWeight();
  const tier = weightTier(w.total);
  valEl.textContent = `${w.total.toFixed(1)} lb`;
  tierEl.textContent = tier.label;
  tierEl.style.color = tierEl.closest('.nb-paper') ? tier.ink : tier.color;   // v1.287
  const pct = Math.max(4, Math.min(100, (w.total / 24) * 100));
  fillEl.style.width = pct + '%';
  fillEl.style.background = tier.color;
  const mult = loadoutWeightSpeedMult();
  const pen = Math.round((1 - mult) * 100);
  noteEl.textContent = pen > 0
    ? `Gun ${w.gunW.toFixed(1)} lb + gear ${w.gearW.toFixed(1)} lb. Gear slows you ${pen}% (on top of your gun's handling).`
    : `Gun ${w.gunW.toFixed(1)} lb. No extra gear weight — full speed.`;
}

// Build list of available equippable items (not already in slots)
function getAvailableSlotItems() {
  const out = [];
  // v1.249 (D.36): the pool noodle, when you own it and it isn't in a slot
  if (Game.persist.owned.pool_noodle && !noodleCarried())
    out.push({ icon: '〰', name: 'Pool Noodle', desc: 'V swings it; a hit tags.', detail: 'reach 1.6 m', slotData: { kind: 'noodle' } });
  // Unequipped speed loaders
  for (const sl of getUnequippedSpeedLoaders()) {
    const tier = SPEED_LOADER_TIERS[sl.tier];
    out.push({
      icon: '⌂',
      name: tier.name,
      desc: 'Plunger loader for the gun mag.',
      detail: `${sl.currentBBs} / ${tier.capacity} BBs`,
      slotData: { kind: 'speed_loader', refId: sl.id },
    });
  }
  // Spare mags — one row per type, "xN" suffix indicates count.
  // (Click a row N times to equip N mags into separate slots.)
  const SPARE_MAG_DEFS = [
    { refId: 'spare_mag_10',       name: 'Spare 10-rd Pistol Mag' },
    { refId: 'spare_mag_12',       name: 'Spare 20-rd Pistol Mag' },
    { refId: 'spare_mag_shotgun',  name: 'Spare 40-rd Shotgun Mag' },
    { refId: 'spare_mag_ar',       name: 'Spare 25-rd AR Mag' },
    { refId: 'spare_mag_sniper',   name: 'Spare 15-rd Sniper Mag' },
    { refId: 'spare_mag_ak47',     name: 'Spare 350-rd AK Drum' },
    { refId: 'spare_mag_ak47_500', name: 'Spare 500-rd AK Drum' },
    { refId: 'spare_mag_mp5',      name: 'Spare 150-rd MP5 Mag' },
    { refId: 'spare_mag_mp5_200',  name: 'Spare 200-rd MP5 Mag' },
    { refId: 'spare_mag_ump',      name: 'Spare 100-rd UMP Mag' },
    { refId: 'spare_mag_ump_200',  name: 'Spare 200-rd UMP Mag' },
    { refId: 'spare_mag_mac10',    name: 'Spare 50-rd MAC-10 Mag' },
    { refId: 'spare_mag_mac10_100',name: 'Spare 100-rd MAC-10 Mag' },
    { refId: 'spare_mag_famas',    name: 'Spare 25-rd FAMAS Mag' },   // v1.325
    { refId: 'spare_mag_epistol',  name: 'Spare 18-rd Electric Pistol Mag' },   // v1.326
    { refId: 'spare_mag_erifle',   name: 'Spare 30-rd Electric Rifle Mag' },
    { refId: 'spare_mag_burst',    name: 'Spare 90-rd Burst Rifle Mag' },   // v1.327
    { refId: 'spare_mag_semishotgun', name: 'Spare 60-rd Semi-Auto Shotgun Mag' },   // v1.328
    { refId: 'spare_mag_m249',    name: 'Spare 800-rd M249 Box' },   // v1.335
    { refId: 'spare_mag_l96',     name: 'Spare 10-rd L96 Mag' },   // v1.336
    { refId: 'spare_mag_p90',     name: 'Spare 200-rd P90 Mag' },   // v1.346
    { refId: 'spare_mag_vector',  name: 'Spare 100-rd Vector Mag' },   // v1.348
    { refId: 'spare_mag_g36',     name: 'Spare 300-rd G36 Mag' },   // v1.371
    { refId: 'spare_mag_aug',     name: 'Spare 330-rd AUG Mag' },   // v1.372
    { refId: 'spare_mag_m4',      name: 'Spare 300-rd M4 Mag' },   // v1.373
    { refId: 'spare_mag_svd',     name: 'Spare 20-rd SVD Mag' },   // v1.395
    { refId: 'spare_mag_rpk',     name: 'Spare 600-rd RPK Drum' },   // v1.396
    { refId: 'spare_mag_spas',    name: 'Spare 45-rd SPAS Shells' },   // v1.398
  ];
  for (const def of SPARE_MAG_DEFS) {
    // v1.60: only surface mags that fit the CURRENTLY EQUIPPED gun. Showing every
    // mag you own (across all guns) was misleading — an equipped mismatched mag
    // just dry-clicks in-match. The pool now tracks your equipped gun.
    if (MAG_GUN_FIT[def.refId] && MAG_GUN_FIT[def.refId] !== Game.persist.equipped.gun) continue;
    const equipped = Game.persist.loadoutSlots.filter(s => s && s.kind === 'spare_mag' && s.refId === def.refId).length;
    const owned = Game.persist.consumables[def.refId] || 0;
    const avail = owned - equipped;
    if (avail > 0) {
      out.push({
        icon: '▮',
        name: def.name,
        desc: 'Mag swap; fills from your bag every match.',   // v1.323 (B.14)
        detail: `x${avail}`,
        slotData: { kind: 'spare_mag', refId: def.refId },
      });
    }
  }
  return out;
}

function renderShop() {
  document.getElementById('shopCash').textContent = '$' + Game.persist.cash;
  document.getElementById('shopBag').textContent = Game.persist.bag;

  // --- Tab bar ---
  const catContainer = document.getElementById('shopCategories');
  catContainer.innerHTML = '';
  for (const tab of SHOP_TABS) {
    const el = document.createElement('div');
    const isActive = tab === shopState.activeTab;
    el.className = 'cat-tab' + (isActive ? ' active' : '');
    el.textContent = tab;
    el.addEventListener('click', () => {
      shopState.activeTab = tab;
      shopState.view = 'list';
      shopState.detailGun = null;
      renderShop();
    });
    catContainer.appendChild(el);
  }

  const c = document.getElementById('shopItems');
  c.innerHTML = '';

  // Flash message (purchase result)
  if (shopState.flash) {
    const flash = document.createElement('div');
    flash.className = 'shop-flash';
    flash.textContent = shopState.flash;
    c.appendChild(flash);
    setTimeout(() => { if (shopState.flash) { shopState.flash = null; renderShop(); } }, 2000);
  }

  // Route to the right renderer.
  if (shopState.view === 'gun' && shopState.detailGun) { renderGunDetail(c, shopState.detailGun); return; }
  switch (shopState.activeTab) {
    case 'Guns': renderGunsTab(c); break;
    case 'Ammo': renderBBsTab(c, renderSpeedLoaders); break;             // v1.128: BB packs, speed loaders, BB colours
    case 'Gear': renderBeltAndHolster(c); renderPoolNoodle(c); renderEquipmentTab(c); break;  // v1.128: belt & holster, eyewear, armour, shoes (v1.249: the noodle)
    case 'Mods': renderAccessoriesTab(c); break;
    case 'Clothes': renderClothesTab(c); break;   // v1.197
  }
}

// v1.197 (D.21 step 1, Michael: C on "A better game" 2): the Clothes tab. Hats for now; each row buys it (and puts it
// on), or wears or takes off one you own. A won hat can't be bought: its row says which match gives it.
function buyHat(id) {
  const h = KID_HATS[id];
  if (!h || h.won) return { ok: false, reason: 'not for sale' };
  if (hatOwned(id)) return { ok: false, reason: 'already owned' };
  if (Game.persist.cash < h.price) return { ok: false, reason: 'not enough cash' };
  Game.persist.cash -= h.price;
  Game.persist.ownedHats = Game.persist.ownedHats || {};
  Game.persist.ownedHats[id] = true;
  Game.persist.look.hat = id;
  autoSave();
  return { ok: true };
}
function wearHat(id) {
  if (id !== 'none' && !hatOwned(id)) return false;
  Game.persist.look.hat = id;
  autoSave();
  return true;
}
// v1.198 (D.21 step 2): tops, the same way
function buyTop(id) {
  const t = KID_TOPS[id];
  if (!t || t.won) return { ok: false, reason: 'not for sale' };
  if (topOwned(id)) return { ok: false, reason: 'already owned' };
  if (Game.persist.cash < t.price) return { ok: false, reason: 'not enough cash' };
  Game.persist.cash -= t.price;
  Game.persist.ownedTops = Game.persist.ownedTops || {};
  Game.persist.ownedTops[id] = true;
  Game.persist.look.top = id;
  autoSave();
  return { ok: true };
}
function wearTop(id) {
  if (id !== 'none' && !topOwned(id)) return false;
  Game.persist.look.top = id;
  autoSave();
  return true;
}
// v1.199 (D.21 step 3): shorts, the same way
function buyShorts(id) {
  const t = KID_SHORTS[id];
  if (!t || t.won) return { ok: false, reason: 'not for sale' };
  if (shortsOwned(id)) return { ok: false, reason: 'already owned' };
  if (Game.persist.cash < t.price) return { ok: false, reason: 'not enough cash' };
  Game.persist.cash -= t.price;
  Game.persist.ownedShorts = Game.persist.ownedShorts || {};
  Game.persist.ownedShorts[id] = true;
  Game.persist.look.shorts = id;
  autoSave();
  return { ok: true };
}
function wearShorts(id) {
  if (id !== 'none' && !shortsOwned(id)) return false;
  Game.persist.look.shorts = id;
  autoSave();
  return true;
}
function renderClothesTab(c) {
  // v1.198: two sections, hats then tops, each row the same (buy and wear, wear, take off, or earn it)
  const kinds = [{ head: ['Hats', 'Worn on your kid; change it here or at the mirror'], order: KID_HAT_ORDER, table: KID_HATS,
                   cls: 'shop-hat', data: 'hat', icon: '▲', own: hatOwned, buy: buyHat, wear: wearHat },
                 { head: ['Tops', 'Over your shirt; the mirror’s Shirt rows take it off'], order: KID_TOP_ORDER, table: KID_TOPS,
                   cls: 'shop-top', data: 'top', icon: '■', own: topOwned, buy: buyTop, wear: wearTop },
                 { head: ['Shorts', 'Instead of your jeans; the mirror’s Pants row puts them back'], order: KID_SHORTS_ORDER,
                   table: KID_SHORTS, cls: 'shop-shorts', data: 'shorts', icon: '▮', own: shortsOwned, buy: buyShorts, wear: wearShorts }];   // v1.199
  for (const k of kinds) {
  c.appendChild(shopSectionHeader(k.head[0], k.head[1]));
  for (const id of k.order) {
    const h = k.table[id], owned = k.own(id), wearing = Game.persist.look[k.data] === id;
    const wearHat = k.wear, buyHat = k.buy;   // v1.198: the hat or the top functions, by section
    const row = document.createElement('div');
    row.className = 'shop-item ' + k.cls + (owned ? ' owned' : '') + (!owned && h.won ? ' locked' : '');
    row.dataset[k.data] = id;
    const swatch = '#' + h.color.toString(16).padStart(6, '0');
    const status = wearing ? '<span class="shop-eq-tag">WEARING</span>' : (owned ? '<span class="shop-owned-tag">OWNED</span>' : '');
    row.innerHTML = `<div class="shop-item-icon" style="color:${swatch}">${k.icon}</div>
      <div class="shop-item-info"><div class="shop-item-name">${h.name} ${status}</div><div class="shop-item-desc">${h.desc}</div></div>
      <div class="shop-item-price">${h.won ? 'WON' : '$' + h.price}</div>`;
    shopIconImg(row.firstElementChild, shopClothesPic(k.data, id, 56, 56), h.name, { item: k.data + ':' + id });   // v1.210
    const btn = document.createElement('button');
    btn.className = 'shop-item-buy';
    if (wearing) btn.textContent = 'TAKE OFF';
    else if (owned) btn.textContent = 'WEAR';
    else if (h.won) { btn.textContent = 'EARN IT'; btn.disabled = true; }
    else if (Game.persist.cash < h.price) { btn.textContent = 'NEED $' + h.price; btn.disabled = true; }
    else btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (wearing) { wearHat('none'); shopState.flash = `Took off the ${h.name}`; }
      else if (owned) { wearHat(id); shopState.flash = `Wearing the ${h.name}`; }
      else { const r = buyHat(id); shopState.flash = r.ok ? `Purchased: ${h.name}` : `Couldn't buy: ${r.reason}`; if (r.ok) playShopChaching(); }
      renderShop();
    });
    row.appendChild(btn);
    c.appendChild(row);
  }
  }
}

// --- Shared row builder for simple catalog items (BBs, Loadout) ---
function shopCatalogRow(item) {
  const row = document.createElement('div');
  const owned = item.isOwned();
  const locked = item.isLocked();
  row.className = 'shop-item' + (owned ? ' owned' : '') + (locked ? ' locked' : '');
  const icon = document.createElement('div');
  icon.className = 'shop-item-icon';
  icon.textContent = iconForCategory(item.category);
  row.appendChild(icon);
  const info = document.createElement('div');
  info.className = 'shop-item-info';
  info.innerHTML = `<div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>`;
  row.appendChild(info);
  const price = document.createElement('div');
  price.className = 'shop-item-price';
  price.textContent = item.price > 0 ? '$' + item.price : 'FREE';
  row.appendChild(price);
  const btn = document.createElement('button');
  btn.className = 'shop-item-buy';
  btn.textContent = item.buttonLabel();
  const cantAfford = Game.persist.cash < item.price;
  btn.disabled = owned || locked || cantAfford;
  if (cantAfford && !owned && !locked) btn.textContent = 'NEED $' + item.price;
  btn.addEventListener('click', () => {
    const result = purchaseItem(item.id);
    shopState.flash = result.ok ? `Purchased: ${item.name}` : `Couldn't buy: ${result.reason}`;
    if (result.ok) playShopChaching();
    renderShop();
  });
  row.appendChild(btn);
  return row;
}

function shopSectionHeader(text, sub) {
  const h = document.createElement('div');
  h.className = 'shop-section-header';
  h.innerHTML = `<span>${text}</span>` + (sub ? `<span class="shop-section-sub">${sub}</span>` : '');
  return h;
}

// v1.128: the old Loadout tab's two sections, now on Gear (belt & holster) and Ammo (speed loaders). The catalog
// entries keep category 'Loadout' (their id and icon); only the tab they show on moved.
function renderBeltAndHolster(c) {
  // v1.106: the slot unlocks are a belt and a holster (D.5)
  const slots = SHOP_CATALOG.filter(x => x.category === 'Loadout' && x.id.startsWith('slot_'));
  if (slots.length) {
    c.appendChild(shopSectionHeader('Belt & Holster', 'Gear that opens more loadout slots'));
    slots.forEach(i => {
      const row = shopCatalogRow(i);
      const n = +i.id.slice(5);   // v1.210: slot_3 is the belt, slot_4 the holster (with the belt under it)
      shopIconImg(row.firstElementChild, shopGearPic('belt', n, 56, 56), i.name, { item: 'belt:' + n });
      c.appendChild(row);
    });
  }
}
function renderSpeedLoaders(c) {
  const loaders = SHOP_CATALOG.filter(x => x.category === 'Loadout' && x.id.startsWith('sl_'));
  if (loaders.length) {
    c.appendChild(shopSectionHeader('Speed Loaders', 'Refill your mag mid-match'));
    loaders.forEach(i => {
      const row = shopCatalogRow(i);
      shopIconImg(row.firstElementChild, shopAmmoPic(i.id, 56, 56), i.name, { item: 'ammo:' + i.id });   // v1.211
      c.appendChild(row);
    });
  }
}

function renderBBsTab(c, between) {
  c.appendChild(shopSectionHeader('Restock BBs', 'Adds to your home stash'));
  SHOP_CATALOG.filter(x => x.category === 'BBs').forEach(i => {
    const row = shopCatalogRow(i);
    shopIconImg(row.firstElementChild, shopAmmoPic(i.id, 56, 56), i.name, { item: 'ammo:' + i.id });   // v1.211
    c.appendChild(row);
  });
  if (between) between(c);   // v1.128: the Ammo tab puts the speed loaders between the packs and the colours
  // BB color picker
  c.appendChild(shopSectionHeader('BB Color', 'Cosmetic — tint the BBs you fire'));
  const grid = document.createElement('div');
  grid.className = 'shop-color-grid';
  for (const col of BB_COLOR_SHOP) {
    const owned = !!Game.persist.ownedBBColors[col.id];
    const equipped = Game.persist.bbColor === col.id;
    const cell = document.createElement('div');
    cell.className = 'shop-color-cell' + (equipped ? ' equipped' : '');
    const swatchStyle = col.glow
      ? `background:radial-gradient(circle at 50% 45%, #f2ffe6, ${col.hex} 55%, #6fae55);box-shadow:0 0 10px 2px ${col.hex}, inset 0 0 6px rgba(255,255,255,.7)`
      : `background:${col.hex}`;
    cell.innerHTML =
      `<div class="shop-color-swatch" style="${swatchStyle}"></div>` +
      `<div class="shop-color-name">${col.name}</div>` +
      `<div class="shop-color-tag">${equipped ? 'EQUIPPED' : owned ? 'OWNED' : (col.price>0?'$'+col.price:'FREE')}</div>`;
    const cantAfford = !owned && Game.persist.cash < col.price;
    if (cantAfford) cell.classList.add('locked');
    cell.addEventListener('click', () => {
      if (cantAfford) { shopState.flash = `Couldn't buy: not enough cash`; renderShop(); return; }
      const r = buyBBColor(col.id);
      if (r.ok && !r.equipped) playShopChaching();
      shopState.flash = r.ok ? (r.equipped ? `Equipped ${col.name}` : `Purchased ${col.name}`) : `Couldn't buy`;
      renderShop();
    });
    grid.appendChild(cell);
  }
  c.appendChild(grid);
}

// v1.240 (backlog D.37, Michael 14 Oct: "maybe having tabs on the guns tab to shift between pistols, rifles, shotguns,
// automatics, etc. Or at least grouping the weapons in sections by type on that page"): the Guns tab lists its guns
// under a header for each kind, and a row of chips over the list shows one kind or all of them. A gun's kind is its
// entry here; a gun missing from it goes by its fire mode (automatic or rifle).
const GUN_KINDS = [
  { id: 'PISTOLS', name: 'Pistols', guns: ['pistol', 'sixshooter', 'boltpistol', 'epistol'] },   // v1.326: the electrics after their spring kin
  { id: 'SHOTGUNS', name: 'Shotguns', guns: ['shotgun', 'thunder', 'spas', 'semishotgun'] },   // v1.328; v1.398: the SPAS-12 before it
  { id: 'RIFLES', name: 'Rifles', guns: ['ar', 'famas', 'erifle', 'burst', 'sniper', 'l96', 'svd'] },   // v1.325: the FAMAS by the AR; v1.336: the L96 after the sniper; v1.395: the SVD after it
  { id: 'AUTOMATICS', name: 'Automatics', guns: ['rattle', 'sprayer', 'ghost', 'ticktock', 'bucket', 'mp5', 'ump', 'p90', 'vector', 'mac10', 'ak47', 'g36', 'm4', 'aug', 'rpk', 'm249'] },   // v1.250: the cheap clear ones first; v1.335: the M249 last; v1.346: the P90 after the UMP; v1.348: the Vector after the P90; v1.371: the G36C after the AK; v1.372: the AUG after it; v1.373: the M4 between them
];
function gunKind(gt) {
  const k = GUN_KINDS.find(k => k.guns.includes(gt));
  if (k) return k.id;
  return getGunSpec(gt).fireMode === 'auto' ? 'AUTOMATICS' : 'RIFLES';
}
function renderGunsTab(c) {
  c.appendChild(shopSectionHeader('Guns', 'Click a gun to see its magazines & spares'));
  const chips = document.createElement('div');
  chips.className = 'shop-gun-kinds';
  for (const id of ['ALL', ...GUN_KINDS.map(k => k.id)]) {
    const n = id === 'ALL' ? GUN_ORDER.length : GUN_ORDER.filter(gt => gunKind(gt) === id).length;
    const chip = document.createElement('div');
    chip.className = 'shop-gun-kind' + (shopState.gunKind === id ? ' active' : '');
    chip.dataset.kind = id;
    chip.textContent = `${id} (${n})`;
    chip.addEventListener('click', () => { shopState.gunKind = id; renderShop(); });
    chips.appendChild(chip);
  }
  c.appendChild(chips);
  const equippedGun = Game.persist.equipped.gun;
  let lastKind = null;
  for (const gt of GUN_ORDER) {
    const cfg = GUN_MAGS[gt];
    if (!cfg) continue;
    const kind = gunKind(gt);
    if (shopState.gunKind !== 'ALL' && kind !== shopState.gunKind) continue;
    if (kind !== lastKind) {   // GUN_ORDER runs kind by kind, so each kind's header comes once
      const k = GUN_KINDS.find(x => x.id === kind);
      const h = shopSectionHeader(k ? k.name : kind, '');
      h.classList.add('shop-gun-kind-header');
      h.dataset.kind = kind;
      c.appendChild(h);
      lastKind = kind;
    }
    const owned = !!Game.persist.owned[cfg.ownFlag] || gt === 'pistol';
    const isEquipped = equippedGun === gt;
    const row = document.createElement('div');
    row.className = 'shop-item shop-gun-row' + (owned ? ' owned' : '');
    const icon = document.createElement('div');
    icon.className = 'shop-item-icon';
    icon.textContent = '⌐';
    shopGunIcon(icon, gt, 56, 56);   // v1.209: the gun's own picture
    row.appendChild(icon);
    const info = document.createElement('div');
    info.className = 'shop-item-info';
    const status = isEquipped ? '<span class="shop-eq-tag">EQUIPPED</span>' : (owned ? '<span class="shop-owned-tag">OWNED</span>' : '');
    const maxCap = gunMaxCapDisplay(gt);
    info.innerHTML = `<div class="shop-item-name">${cfg.displayName} ${status}</div>` +
      `<div class="shop-item-desc">Capacity: up to ${maxCap} BBs · ${cfg.mags.length} mag upgrade${cfg.mags.length!==1?'s':''}, ${cfg.spares.length} spare${cfg.spares.length!==1?'s':''} available</div>`;
    row.appendChild(info);
    if (!owned) {
      const price = document.createElement('div');
      price.className = 'shop-item-price';
      price.textContent = '$' + cfg.price;
      row.appendChild(price);
    }
    const btn = document.createElement('button');
    btn.className = 'shop-item-buy';
    btn.textContent = 'DETAILS ▸';
    btn.addEventListener('click', () => { shopState.view = 'gun'; shopState.detailGun = gt; renderShop(); });
    row.appendChild(btn);
    // Whole row clickable too
    info.style.cursor = 'pointer';
    info.addEventListener('click', () => { shopState.view = 'gun'; shopState.detailGun = gt; renderShop(); });
    c.appendChild(row);
  }
}

function gunMaxCapDisplay(gt) {
  const cfg = GUN_MAGS[gt];
  let cap = cfg.baseCap;
  for (const m of cfg.mags) cap = Math.max(cap, m.cap);
  return cap;
}

function renderGunDetail(c, gt) {
  const cfg = GUN_MAGS[gt];
  if (!cfg) { shopState.view = 'list'; renderShop(); return; }
  // Back button
  const back = document.createElement('button');
  back.className = 'shop-back-btn';
  back.textContent = '◂ Back to Guns';
  back.addEventListener('click', () => { shopState.view = 'list'; shopState.detailGun = null; shopState.sellArm = null; renderShop(); });
  c.appendChild(back);

  const owned = !!Game.persist.owned[cfg.ownFlag] || gt === 'pistol';
  const isEquipped = Game.persist.equipped.gun === gt;

  // Gun header / buy-or-equip
  const lentTo = owned && crewLoanHolder('gun', gt);   // v1.337 (D.28 step 4): a crew kid has it
  c.appendChild(shopSectionHeader(cfg.displayName, owned ? (isEquipped ? 'Equipped' : lentTo ? 'With ' + CHARACTERS[lentTo].name : 'Owned') : '$' + cfg.price));
  const gunRow = document.createElement('div');
  gunRow.className = 'shop-item' + (owned ? ' owned' : '');
  gunRow.innerHTML = `<div class="shop-item-icon">⌐</div>`;
  shopGunIcon(gunRow.firstChild, gt, 56, 56);   // v1.209
  // v1.209: and a large picture of it above, framed like a catalogue photo
  const photo = document.createElement('div');
  photo.className = 'shop-gun-photo';
  const pic = shopGunPic(gt, 420, 190);
  if (pic) {
    photo.innerHTML = `<img src="${pic}" alt="${cfg.displayName}" data-gun="${gt}"><div class="shop-gun-photo-cap">${cfg.displayName} · actual product may vary</div>`;
    c.appendChild(photo);
  }
  const ginfo = document.createElement('div');
  ginfo.className = 'shop-item-info';
  const spec = getGunSpec(gt);
  ginfo.innerHTML = `<div class="shop-item-name">${cfg.displayName}</div>` +
    `<div class="shop-item-desc">${cfg.blurb ? cfg.blurb + '<br>' : ''}${gunBlurb(gt)}</div>`;   // v1.168: a line of its own
  gunRow.appendChild(ginfo);
  const gbtn = document.createElement('button');
  gbtn.className = 'shop-item-buy';
  if (isEquipped) { gbtn.textContent = 'EQUIPPED'; gbtn.disabled = true; }
  else if (owned) {
    gbtn.textContent = lentTo ? `TAKE BACK FROM ${CHARACTERS[lentTo].name.toUpperCase()}` : 'EQUIP';   // v1.337: carrying it takes it back
    gbtn.addEventListener('click', () => { const r = buyGun(gt); shopState.flash = r.from ? `${CHARACTERS[r.from].name} gave back your ${cfg.displayName}` : `Equipped ${cfg.displayName}`; renderShop(); });
  }
  else {
    const cantAfford = Game.persist.cash < cfg.price;
    gbtn.textContent = cantAfford ? 'NEED $' + cfg.price : 'BUY $' + cfg.price;
    gbtn.disabled = cantAfford;
    gbtn.addEventListener('click', () => {
      const old = Game.persist.equipped.gun;
      const r = buyGun(gt); if (r.ok) playShopChaching(); shopState.flash = r.ok ? `Bought ${cfg.displayName}` : `Couldn't buy: ${r.reason}`;
      // v1.337 (D.28 step 4, Michael: A): you put your old gun down; Nick is asked, not given it (his own rifle beats some)
      shopState.handDown = r.ok && !r.equipped && old && old !== gt && crewMembers().includes('nick') ? { gun: old, for: gt } : null;
      renderShop();
    });
  }
  gunRow.appendChild(gbtn);
  c.appendChild(gunRow);

  // v1.337: "Give your <old gun> to Nick?" YES / KEEP IT, under the gun you just bought
  const hd = shopState.handDown;
  if (hd && hd.for === gt && crewLoanOwned('gun', hd.gun) && crewYours('gun') !== hd.gun) {
    const hrow = document.createElement('div');
    hrow.className = 'shop-item shop-handdown-row';
    const has = crewLent('nick', 'gun');
    hrow.innerHTML = `<div class="shop-item-icon">⌐</div><div class="shop-item-info"><div class="shop-item-name">Give your ${getGunDisplayName(hd.gun)} to Nick?</div>` +
      `<div class="shop-item-desc">He'd carry it instead of ${has ? 'your ' + getGunDisplayName(has) : 'his own ' + getGunDisplayName(CREW_GUNS.nick)}, on your BBs. Take it back any time at the loadout.</div></div>`;
    for (const [label, give] of [['YES', true], ['KEEP IT', false]]) {
      const b = document.createElement('button');
      b.className = 'shop-item-buy shop-handdown-' + (give ? 'yes' : 'no');
      b.textContent = label;
      b.addEventListener('click', () => {
        shopState.handDown = null;
        if (give && crewLend('nick', 'gun', hd.gun)) shopState.flash = `Nick has your ${getGunDisplayName(hd.gun)}`;
        renderShop();
      });
      hrow.appendChild(b);
    }
    c.appendChild(hrow);
  }

  // v1.262 (D.44): sell it back. The first press asks, the second sells.
  const q = gunSellQuote(gt);
  if (q) {
    const srow = document.createElement('div');
    srow.className = 'shop-item shop-sell-row';
    const extras = [q.mags.length || q.spares.length ? 'its mags' : '', q.parts.length ? 'the parts on it' : ''].filter(Boolean).join(' and ');
    const why = q.full ? `Full price back: it has been into ${q.used} of ${SELL_FREE_MATCHES} free-return matches.`
      : q.used === null ? 'Half back: it was bought before returns were counted.'
      : `Half back: it has been into ${q.used} matches (full price only within ${SELL_FREE_MATCHES}).`;
    srow.innerHTML = `<div class="shop-item-icon">$</div>` +
      `<div class="shop-item-info"><div class="shop-item-name">Sell it back</div>` +
      `<div class="shop-item-desc">${why}${extras ? ` ${extras[0].toUpperCase() + extras.slice(1)} go with it.` : ''} You paid $${q.paid}.` +
      `${lentTo ? ` ${CHARACTERS[lentTo].name} has it: take it back first.` : ''}</div></div>`;   // v1.337
    const sbtn = document.createElement('button');
    sbtn.className = 'shop-item-buy shop-sell-btn';
    if (lentTo) sbtn.disabled = true;
    const armed = shopState.sellArm === gt;
    sbtn.textContent = armed ? `SURE? SELL $${q.value}` : `SELL $${q.value}`;
    sbtn.addEventListener('click', () => {
      if (shopState.sellArm !== gt) { shopState.sellArm = gt; renderShop(); return; }
      shopState.sellArm = null;
      const r = sellGun(gt);
      if (r.ok) playShopChaching();
      shopState.flash = r.ok ? `Sold ${cfg.displayName} for $${r.value}` : `Couldn't sell it`;
      renderShop();
    });
    srow.appendChild(sbtn);
    c.appendChild(srow);
  }

  // Magazines (capacity upgrades)
  if (cfg.mags.length) {
    c.appendChild(shopSectionHeader('Magazines', `Bigger mag = more BBs per match (base ${cfg.baseCap})`));
    for (const mag of cfg.mags) {
      const mOwned = !!Game.persist.owned[mag.flag];
      const mLocked = mag.requires && !Game.persist.owned[mag.requires];
      const row = document.createElement('div');
      row.className = 'shop-item' + (mOwned ? ' owned' : '') + (mLocked ? ' locked' : '');
      row.innerHTML = `<div class="shop-item-icon">▮</div>` +
        `<div class="shop-item-info"><div class="shop-item-name">${mag.cap}-Round Mag</div>` +
        `<div class="shop-item-desc">Bring ${mag.cap} BBs into a match instead of ${cfg.baseCap}.${mag.requires?' Requires the smaller mag.':''}</div></div>` +
        `<div class="shop-item-price">$${mag.price}</div>`;
      shopIconImg(row.firstElementChild, shopMagPic(mag.cap, false, 56, 56), mag.cap + '-Round Mag', { item: 'mag:' + mag.flag });   // v1.212
      const btn = document.createElement('button');
      btn.className = 'shop-item-buy';
      const cantAfford = Game.persist.cash < mag.price;
      if (mOwned) { btn.textContent = 'OWNED'; btn.disabled = true; }
      else if (mLocked) { btn.textContent = 'LOCKED'; btn.disabled = true; }
      else if (cantAfford) { btn.textContent = 'NEED $' + mag.price; btn.disabled = true; }
      else { btn.textContent = 'BUY'; btn.addEventListener('click', () => { const r = buyGunMag(gt, mag.flag); if (r.ok) playShopChaching(); shopState.flash = r.ok ? `Bought ${mag.cap}-rd mag` : `Couldn't buy: ${r.reason}`; renderShop(); }); }
      row.appendChild(btn);
      c.appendChild(row);
    }
  }

  // Spare mags (consumables — carried in a loadout slot)
  if (cfg.spares.length) {
    c.appendChild(shopSectionHeader('Spare Mags', 'Yours to keep — carry one in a slot; it fills from your bag every match'));
    for (const sp of cfg.spares) {
      const held = Game.persist.consumables[sp.key] || 0;
      const sLocked = sp.needsFlag && !Game.persist.owned[sp.needsFlag];
      const row = document.createElement('div');
      row.className = 'shop-item' + (sLocked ? ' locked' : '');
      row.innerHTML = `<div class="shop-item-icon">▯</div>` +
        `<div class="shop-item-info"><div class="shop-item-name">${sp.label}${held?` <span class="shop-owned-tag">×${held}</span>`:''}</div>` +
        `<div class="shop-item-desc">${sLocked?'Requires the matching capacity mag first.':'Buy multiple to carry several.'}</div></div>` +
        `<div class="shop-item-price">$${sp.price}</div>`;
      const spCap = (sp.needsFlag && (cfg.mags.find(m => m.flag === sp.needsFlag) || {}).cap) || cfg.baseCap;   // v1.212
      shopIconImg(row.firstElementChild, shopMagPic(spCap, true, 56, 56), sp.label, { item: 'spare:' + sp.key });
      const btn = document.createElement('button');
      btn.className = 'shop-item-buy';
      const cantAfford = Game.persist.cash < sp.price;
      if (sLocked) { btn.textContent = 'LOCKED'; btn.disabled = true; }
      else if (cantAfford) { btn.textContent = 'NEED $' + sp.price; btn.disabled = true; }
      else { btn.textContent = 'BUY'; btn.addEventListener('click', () => { const r = buyGunSpare(gt, sp.key); if (r.ok) playShopChaching(); shopState.flash = r.ok ? `Bought ${sp.label}` : `Couldn't buy: ${r.reason}`; renderShop(); }); }
      row.appendChild(btn);
      c.appendChild(row);
    }
  }

  // v1.28: gun customization (mounting accessories) now lives at The Workbench
  // (hall closet). The shop only SELLS — here we just show this gun's capacity
  // and what's currently mounted, with a nudge to the workbench.
  const cap = getGunAccessoryCap(gt);
  ensureGunSlots(gt);
  const slots = Game.persist.equipped.attachments[gt];
  c.appendChild(shopSectionHeader('Accessory Slots',
    `${cap.sight} sight + ${cap.rails} rail${cap.rails!==1?'s':''}${cap.under ? ' + 1 under-barrel' : ''} · customize at The Workbench (hall closet)`));
  const summary = document.createElement('div');
  summary.className = 'shop-item-desc';
  summary.style.padding = '6px 2px';
  const mounted = getMountedAccessories(gt);
  if (mounted.length) {
    const parts = mounted.map(m => {
      const where = m.slot === 'sight' ? 'sight' : m.slot === 'under' ? 'under-barrel' : (cap.rails === 1 ? 'rail' : m.placement);
      return `${ATTACHMENTS[m.type].name} (${where})`;
    });
    summary.textContent = 'Currently mounted: ' + parts.join(', ') + '.';
  } else {
    summary.textContent = 'Nothing mounted yet. Buy accessories below, then assign them at The Workbench.';
  }
  c.appendChild(summary);
}

function gunBlurb(gt) {
  const s = getGunSpec(gt);
  // v1.168: the pump and the hammer read as themselves (the spring shotgun said "rack slide")
  const mode = s.fireMode === 'auto' ? `Full-auto (~${Math.round((s.cyclicRPM||600)/60)}/s)` : s.burst ? `${s.burst}-round burst, a pull at a time (electric)` : s.electric ? `Electric semi (a BB a pull, up to ${Math.round(s.semiRPM / 60)}/s)` : (s.cockType === 'bolt' ? 'Bolt-action' : (s.cockType === 'charge' ? 'Semi (charging handle)' : s.cockType === 'pump' ? 'Pump-action' : s.cockType === 'hammer' ? 'Single-action (thumb the hammer)' : 'Semi (rack slide)'));   // v1.326: the electrics
  const weight = ({light:'Light, fast', medium:'Medium', heavy:'Heavy, slower', very_heavy:'Very heavy, slowest'})[s.weightClass] || 'Medium';
  return `${mode} · ${weight} · muzzle ${s.muzzleVelocity} m/s`;
}

function renderAccessoriesTab(c) {
  c.appendChild(shopSectionHeader('Gun Mods',
    'Buy a copy per gun you want it on — each copy mounts on one gun at a time. Assign them at The Workbench (hall closet).'));
  for (const aid in ATTACHMENTS) {
    const a = ATTACHMENTS[aid];
    const owned = Game.persist.ownedEquipment.attachments[aid] || 0;
    const slotTag = a.slot === 'sight' ? 'SIGHT' : a.slot === 'under' ? 'UNDER' : 'RAIL';   // v1.169
    const row = document.createElement('div');
    row.className = 'shop-item' + (owned ? ' owned' : '');
    row.innerHTML = `<div class="shop-item-icon">⊹</div>` +
      `<div class="shop-item-info"><div class="shop-item-name">${a.name} ` +
      `<span class="shop-slot-tag">${slotTag}</span>` +
      `${owned ? ` <span class="shop-owned-tag">×${owned}</span>` : ''}</div>` +
      `<div class="shop-item-desc">${a.desc}</div></div>` +
      `<div class="shop-item-price">$${a.price}</div>`;
    const btn = document.createElement('button');
    btn.className = 'shop-item-buy';
    const cantAfford = Game.persist.cash < a.price;
    if (cantAfford) { btn.textContent = 'NEED $' + a.price; btn.disabled = true; }
    else { btn.textContent = owned ? 'BUY ANOTHER' : 'BUY'; btn.addEventListener('click', () => { const r = buyEquipment('attachments', aid); if (r.ok) playShopChaching(); shopState.flash = r.ok ? `Bought ${a.name}` : `Couldn't buy: ${r.reason}`; renderShop(); }); }
    row.appendChild(btn);
    shopIconImg(row.firstElementChild, shopModPic(aid, 56, 56), a.name, { item: 'mod:' + aid });   // v1.211
    c.appendChild(row);
  }
}

function renderEquipmentTab(c) {
  // --- Eyewear (changes view + head armor) ---
  c.appendChild(shopSectionHeader('Eyewear', 'Changes your in-match view · some add a hit of head protection'));
  const curEye = Game.persist.equipped.eyewear || 'none';
  for (const id in EYEWEAR) {
    const e = EYEWEAR[id];
    const owned = id === 'none' || !!Game.persist.ownedEquipment.eyewear[id];
    const equipped = curEye === id;
    c.appendChild(equipRow({
      icon: '◓', name: e.name,
      desc: (e.hp ? `+${e.hp} hit${e.hp>1?'s':''} protection. ` : '') + (e.view ? `View: ${e.view.label}${e.view.mesh?' (mesh)':''}.` : 'No view change.') + crewLentNote('eyewear', id),
      price: e.price, owned, equipped,
      onBuy: () => buyEquipment('eyewear', id),
      onEquip: () => equipEyewear(id),
      label: e.name, pic: ['eyewear', id],
    }));
  }
  // --- Armor (adds hit-points) ---
  c.appendChild(shopSectionHeader('Body Armor', 'Each piece adds hit-points (more total hits before you\u2019re out)'));
  const totalBonus = getArmorBonusHits();
  const bonusNote = document.createElement('div');
  bonusNote.className = 'shop-item-desc';
  bonusNote.style.cssText = 'padding:2px 2px 8px;';
  bonusNote.textContent = `Current total: ${3 + totalBonus} hits (3 base + ${totalBonus} from gear).`;
  c.appendChild(bonusNote);
  for (const id in ARMOR) {
    const a = ARMOR[id];
    const owned = !!Game.persist.ownedEquipment.armor[id];
    const equipped = Game.persist.equipped.armor[a.zone] === id;
    const locked = a.requires && !Game.persist.ownedEquipment.armor[a.requires];
    c.appendChild(equipRow({
      icon: '⛊', name: a.name,
      desc: `+${a.hp} hit${a.hp>1?'s':''} · ${a.zone} slot.${locked?' Requires '+ARMOR[a.requires].name+'.':''}`,
      price: a.price, owned, equipped, locked,
      onBuy: () => buyEquipment('armor', id),
      onEquip: () => { toggleArmor(id); },
      equipLabel: equipped ? 'EQUIPPED ✕' : 'EQUIP', pic: ['armor', id],
    }));
  }
  // --- Shoes (stamina/sprint) ---
  c.appendChild(shopSectionHeader('Shoes', 'Affect sprint speed & stamina'));
  const curShoe = Game.persist.equipped.shoes || 'none';
  for (const id in SHOES) {
    const s = SHOES[id];
    const owned = id === 'none' || !!Game.persist.ownedEquipment.shoes[id];
    const equipped = curShoe === id;
    c.appendChild(equipRow({
      icon: '👟', name: s.name,
      desc: (s.desc || 'Standard sneakers — no bonuses.') + crewLentNote('shoes', id),
      price: s.price, owned, equipped,
      onBuy: () => buyEquipment('shoes', id),
      onEquip: () => equipShoes(id), pic: ['shoes', id],
    }));
  }
}

// v1.337 (D.28 step 4): a line on a thing a crew kid has of yours
function crewLentNote(kind, id) { const k = crewLoanHolder(kind, id); return k ? ` ${CHARACTERS[k].name} has them: wearing them takes them back.` : ''; }
// Generic equip-style row: BUY when unowned, EQUIP/EQUIPPED when owned.
function equipRow({ icon, name, desc, price, owned, equipped, locked, onBuy, onEquip, equipLabel, pic }) {
  const row = document.createElement('div');
  row.className = 'shop-item' + (owned ? ' owned' : '') + (locked ? ' locked' : '');
  row.innerHTML = `<div class="shop-item-icon">${icon}</div>` +
    `<div class="shop-item-info"><div class="shop-item-name">${name}${equipped?' <span class="shop-eq-tag">EQUIPPED</span>':''}</div>` +
    `<div class="shop-item-desc">${desc}</div></div>`;
  if (pic) shopIconImg(row.firstElementChild, shopGearPic(pic[0], pic[1], 56, 56), name, { item: pic[0] + ':' + pic[1] });   // v1.210
  if (!owned) {
    const p = document.createElement('div');
    p.className = 'shop-item-price';
    p.textContent = price > 0 ? '$' + price : 'FREE';
    row.appendChild(p);
  }
  const btn = document.createElement('button');
  btn.className = 'shop-item-buy';
  if (locked) { btn.textContent = 'LOCKED'; btn.disabled = true; }
  else if (!owned) {
    const cantAfford = Game.persist.cash < price;
    btn.textContent = cantAfford ? 'NEED $' + price : 'BUY';
    btn.disabled = cantAfford;
    btn.addEventListener('click', () => { const r = onBuy(); if (r && r.ok) playShopChaching(); shopState.flash = (r && r.ok) ? `Bought ${name}` : `Couldn't buy: ${r ? r.reason : ''}`; renderShop(); });
  } else {
    btn.textContent = equipLabel || (equipped ? 'EQUIPPED' : 'EQUIP');
    if (equipped && !equipLabel) btn.disabled = true;
    btn.addEventListener('click', () => { onEquip(); if (!shopState.flash) shopState.flash = `Equipped ${name}`; renderShop(); });
  }
  row.appendChild(btn);
  return row;
}

function iconForCategory(cat) {
  if (cat === 'BBs') return '●';
  if (cat === 'Loadout') return '⚙';
  if (cat === 'Guns') return '⌐';
  if (cat === 'Accessories') return '⊹';
  if (cat === 'Equipment') return '◓';
  return '◆';
}

// Cha-ching sound for purchases
function playShopChaching() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  // Two-note up-arpeggio
  const notes = [880, 1320];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t + i * 0.06);
    g.gain.setValueAtTime(0.08, t + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
    osc.connect(g).connect(sfxOut());
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.16);
  });
}
function showPauseHint() {
  const hint = document.getElementById('pauseHint');
  hint.style.display = (Game.mouse.locked || Pad.active) ? 'none' : 'block';   // v1.241: not with a pad
}
