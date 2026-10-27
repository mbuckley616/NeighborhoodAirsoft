
// =====================================================================
// v1.201 (D.22 step 1, Michael: A on "A better game" 3, "a Pickup Game board in the bedroom: any opened zone, the mode,
// day or night, team sizes and which kids, lives, a clock; pays a little"). The corkboard on the bedroom's north wall
// sets up a team match on any map whose zone is open: how many a side (1v1 up to the map's 4v4, or 3v3 on Winnmark),
// day or night, and lives (1, 3 or 5, for every kid and for you as hits). Each map's match is its biggest team
// battle with the sides cut to size: your side's kids and theirs are the first ones it lists, at their own spots, with
// their own guns. PLAY writes it as SCENARIOS.pickup_game and goes through the usual briefing. It pays $3 for a win
// and $1 for a loss, and never counts as a ladder win. The mode (free-for-all), which kids, and a clock come next.
const PICKUP_MAPS = [
  { key: 'winnmark',     zone: 'winnmark_court', name: 'Winnmark Court',          template: 'winnmark_team_3v3', ffa: 'winnmark_ffa' },
  { key: 'bunratty',     zone: 'bunratty_court', name: 'Bunratty Court',          template: 'bunratty_team_4v4', ffa: 'bunratty_ffa' },
  { key: 'hollow',       zone: 'hollow',         name: 'The Hollow',              template: 'hollow_big_battle', ffa: 'hollow_ffa',
    // v1.202: the Ten-Way's first three share the south fort; take them spread out, one from each fort first
    ffaOrder: ['seth', 'sean', 'devon', 'priya', 'mason', 'ryan', 'brooke', 'eric', 'rebecca'] },
  { key: 'market_lot',   zone: 'market_lot',     name: 'Riverside Market lot',    template: 'lot_night_4v4', ffa: 'lot_ffa',
    // v1.265 (Michael: A on the free-for-all starts): Marcus and Jamie, its first two, both had your start nearer than
    // each other's, so a 3- or 4-way was them coming for you; in this order every size keeps the rule
    ffaOrder: ['tyler', 'priya', 'brooke', 'owen', 'marcus', 'jamie'] },
  { key: 'northcliff',   zone: 'northcliff',     name: 'Northcliff Trace',        template: 'northcliff_night_4v4' },
  { key: 'bellfield',    zone: 'northcliff',     name: 'Bellfield Court',         template: 'bellfield_night_4v4' },
  { key: 'high_school',  zone: 'high_school',    name: 'Hollins Ridge High',      template: 'school_night_4v4' },
  { key: 'country_club', zone: 'country_club',   name: 'Willow Bend',             template: 'club_night_4v4' },
  { key: 'store',        zone: 'grocery_store',  name: 'Inside Riverside Market', template: 'store_night_4v4' },
];
const PICKUP_LIVES = [1, 3, 5];
const PICKUP_REWARDS = { win: 30, lose: 10 };   // scaledReward: $3 and $1
// v1.204 (D.22 step 4, a clock): Off, or 3, 5 or 10 minutes. Time up, the side with more lives left wins (in a
// free-for-all, you need more than any one kid); level is a draw, paid as a loss, as the flags' clock (v1.191).
const PICKUP_CLOCKS = [0, 180, 300, 600];
// v1.352 (D.70 step 3, Michael: B, "shown around the real dates or switched on from the Pickup Game board"): the board's
// Holiday row. By the date (the default) is Halloween from 17 Oct to 1 Nov and nothing the rest of the year; Halloween
// puts the houses' lanterns and webs and the kids' costumes on whatever the date; Off takes them off in the season.
// It holds for the pickup match only; the ladder's matches always go by the date.
const PICKUP_HOLIDAYS = ['date', 'halloween', 'none'];
const PICKUP_HOLIDAY_LABELS = { date: 'By the date', halloween: 'Halloween', none: 'Off' };
const pickupState = { map: 'winnmark', mode: 'teams', size: 2, ways: 4, tod: 'day', lives: 3, clock: 0, holiday: 'date', ours: null, theirs: null, ffaKids: null };
function pickupMapsOpen() { return PICKUP_MAPS.filter(m => isZoneUnlocked(m.zone)); }
// The most a side can be on a map: its template's allies plus you, against its enemies, at most four
function pickupMaxSize(m) {
  const es = SCENARIOS[m.template].enemySetup;
  return Math.min(4, es.filter(e => e.team === 'player').length + 1, es.filter(e => !e.team).length);
}
// v1.202 (D.22 step 2, the mode): the four maps with a free-for-all of their own (Winnmark, Bunratty, the Hollow, the
// lot) can be played as one, 3-way up to that free-for-all's size with you in it, at most 8-way (a 4v4's headcount):
// the kids are its first ones (the Hollow's taken one from each fort first), at their own spread-out starts, with
// their own guns; lives and day or night as for teams; last kid standing. The team maps are unchanged.
function pickupMaxWays(m) { return m.ffa ? Math.min(8, SCENARIOS[m.ffa].enemySetup.length + 1) : 0; }
function pickupFfaKids(m, ways) {
  const es = SCENARIOS[m.ffa].enemySetup;
  const order = m.ffaOrder ? m.ffaOrder.map(id => es.find(e => e.charId === id)).filter(Boolean) : es;
  return order.slice(0, ways - 1);
}
// v1.203 (D.22 step 3, which kids): the board lists every kid who plays on that street (any match of its own, the
// tutorial and taggers aside) and you pick who is with you and who is against you, or who is in the free-for-all.
// The spots stay the map's: each side's first spots, in its biggest team battle (or its free-for-all); a kid you pick
// takes his own spot, with his gun there, when it is one of them; otherwise the next free one, with the gun he carries in
// that map's team battle or free-for-all, or failing those in his first match on the street. A kid keeps a
// spot's role (Fernando's nest) only on his own spot. With no picks it is v1.201-v1.202's game.
function pickupPool(m) {
  const t = SCENARIOS[m.template], seen = new Map();
  const take = es => { if (es.charId && es.weapon && !es.behavior && !seen.has(es.charId) && CHARACTERS[es.charId]) seen.set(es.charId, es.weapon); };
  for (const id of [m.template, m.ffa].filter(Boolean)) SCENARIOS[id].enemySetup.forEach(take);
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    if (id === 'pickup_game' || sc.tutorial || sc.street !== t.street || sc.builderFn !== t.builderFn) continue;
    (sc.enemySetup || []).forEach(take);
  }
  return [...seen].map(([charId, weapon]) => ({ charId, weapon }));
}
function pickupDefaults(m, side, n) {   // the kids v1.201-v1.202 put there
  if (side === 'ffaKids') return m.ffa ? pickupFfaKids(m, n + 1).map(e => e.charId) : [];
  return SCENARIOS[m.template].enemySetup.filter(e => side === 'ours' ? e.team === 'player' : !e.team).slice(0, n).map(e => e.charId);
}
// Fill a side's spots with the picked kids: his own spot first, then the next free one
function pickupFill(spots, ids, pool, team) {
  const left = spots.slice(), out = [];
  const gun = id => (pool.find(k => k.charId === id) || {}).weapon || 'pistol';
  const own = ids.filter(id => left.some(s => s.charId === id));
  for (const id of own) { const i = left.findIndex(s => s.charId === id); out.push(Object.assign({}, left[i])); left.splice(i, 1); }
  for (const id of ids.filter(id => !own.includes(id))) {
    const s = left.shift(); const e = { charId: id, weapon: gun(id), anchor: s.anchor };
    if (team) e.team = team;
    out.push(e);
  }
  return out;
}
function pickupNeeds(m, side) { return side === 'ours' ? pickupState.size - 1 : side === 'theirs' ? pickupState.size : pickupState.ways - 1; }
// Keep the picks to kids of this map, off the other side, and to the count; pad from the defaults
function pickupNormalize(m, pad) {
  const pool = pickupPool(m).map(k => k.charId);
  for (const side of ['ours', 'theirs', 'ffaKids']) {
    const n = pickupNeeds(m, side);
    let ids = (pickupState[side] || pickupDefaults(m, side, n)).filter(id => pool.includes(id));
    if (side === 'theirs') ids = ids.filter(id => !pickupState.ours.includes(id));
    ids = ids.slice(0, n);
    if (pad) for (const id of pickupDefaults(m, side, n).concat(pool)) {
      if (ids.length >= n) break;
      if (!ids.includes(id) && !(side === 'theirs' && pickupState.ours.includes(id)) && !(side === 'ours' && (pickupState.theirs || []).includes(id))) ids.push(id);
    }
    pickupState[side] = ids;
  }
}
// v1.207 (Found in play, critic 13 Oct; Michael: A on "Fernando's rifle in a Northcliff pickup game by day"): by day
// Fernando carries the AK he uses in Bellfield's matches, wherever he stands; on his own spot (the high yard's nest)
// he keeps its defender role. By night he keeps the rifle the night match gave him.
const PICKUP_DAY_GUNS = { fernando: 'ak47' };
function pickupDayGun(e, tod) {
  return tod === 'day' && PICKUP_DAY_GUNS[e.charId] ? Object.assign({}, e, { weapon: PICKUP_DAY_GUNS[e.charId] }) : Object.assign({}, e);
}
function buildPickupScenario(opts) {
  const m = PICKUP_MAPS.find(k => k.key === opts.map);
  if (!m) return null;
  const t = SCENARIOS[m.template];
  const size = Math.max(1, Math.min(pickupMaxSize(m), opts.size | 0));
  const lives = PICKUP_LIVES.includes(opts.lives) ? opts.lives : 3;
  const tod = opts.tod === 'night' ? 'night' : 'day';
  const clock = PICKUP_CLOCKS.includes(opts.clock) ? opts.clock : 0;   // v1.204
  const holiday = PICKUP_HOLIDAYS.includes(opts.holiday) ? opts.holiday : 'date';   // v1.352
  if (opts.mode === 'ffa' && m.ffa) return buildPickupFfa(m, opts, lives, tod, clock, holiday);
  let ours = t.enemySetup.filter(e => e.team === 'player').slice(0, size - 1);
  let theirs = t.enemySetup.filter(e => !e.team).slice(0, size);
  // v1.203: the kids you picked, each side at its own first spots
  if (opts.ours && opts.theirs && opts.ours.length === size - 1 && opts.theirs.length === size
      && !opts.ours.some(id => opts.theirs.includes(id))) {
    const pool = pickupPool(m);
    ours = pickupFill(ours, opts.ours, pool, 'player');
    theirs = pickupFill(theirs, opts.theirs, pool);
  }
  const names = es => es.map(e => (CHARACTERS[e.charId] || { name: e.charId }).name);
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const sc = {
    region: t.region, street: t.street, name: t.name, scenarioName: `Pickup Game: ${size}v${size}`,
    desc: `A pickup game ${tod === 'night' ? 'after dark' : 'in the afternoon'} on ${m.name}, nothing on the line. ` +
      (ours.length ? `You've got ${list(names(ours))}` : `It's just you`) + ` against ${list(names(theirs))}. ` +
      `${lives === 1 ? 'One life' : lives + ' lives'} for everyone, you included; last side standing` +
      (clock ? `, or the side with more lives left at ${pickupClockText(clock)}.` : '.'),
    builderFn: t.builderFn, builderArg: t.builderArg, timeOfDay: tod, scenarioType: 'skirmish',
    playerSpawn: t.playerSpawn, enemySetup: ours.concat(theirs).map(e => pickupDayGun(e, tod)),   // v1.207
    winCondition: 'last_team_standing', npcLives: lives, playerLives: lives, armorMult: 1,
    rewards: Object.assign({}, PICKUP_REWARDS), pickup: { map: m.key, size, tod, lives, clock, holiday },
  };
  if (t.enemySpawnCluster) sc.enemySpawnCluster = t.enemySpawnCluster;
  SCENARIOS.pickup_game = sc;
  return sc;
}
function buildPickupFfa(m, opts, lives, tod, clock, holiday = 'date') {   // v1.202
  const t = SCENARIOS[m.ffa];
  const ways = Math.max(3, Math.min(pickupMaxWays(m), opts.ways | 0));
  const kids = opts.ffaKids && opts.ffaKids.length === ways - 1   // v1.203: the kids you picked, at the first spots
    ? pickupFill(pickupFfaKids(m, ways), opts.ffaKids, pickupPool(m)) : pickupFfaKids(m, ways);
  const names = kids.map(e => (CHARACTERS[e.charId] || { name: e.charId }).name);
  const sc = {
    region: t.region, street: t.street, name: t.name, scenarioName: `Pickup Game: ${ways}-way free-for-all`,
    desc: `A pickup free-for-all ${tod === 'night' ? 'after dark' : 'in the afternoon'} on ${m.name}, nothing on the line: ` +
      `you, ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}, everyone for themselves. ` +
      `${lives === 1 ? 'One life' : lives + ' lives'} for everyone, you included; last kid standing` +
      (clock ? `, or the most lives left at ${pickupClockText(clock)}.` : '.'),
    builderFn: t.builderFn, builderArg: t.builderArg, timeOfDay: tod, scenarioType: 'skirmish',
    playerSpawn: t.playerSpawn, ffa: true, enemySetup: kids.map(e => Object.assign({}, e)), seedFrom: m.ffa,   // v1.267
    winCondition: 'last_team_standing', npcLives: lives, playerLives: lives, armorMult: 1,
    rewards: Object.assign({}, PICKUP_REWARDS), pickup: { map: m.key, mode: 'ffa', ways, tod, lives, clock: clock || 0, holiday },
  };
  SCENARIOS.pickup_game = sc;
  return sc;
}
function pickupBoardHTML() {
  const open = pickupMapsOpen();
  if (!open.some(m => m.key === pickupState.map)) pickupState.map = open[0].key;
  const m = PICKUP_MAPS.find(k => k.key === pickupState.map), max = pickupMaxSize(m);
  pickupState.size = Math.max(1, Math.min(max, pickupState.size));
  const maxWays = pickupMaxWays(m);   // v1.202: the mode
  if (!maxWays) pickupState.mode = 'teams';
  pickupState.ways = Math.max(3, Math.min(maxWays || 3, pickupState.ways));
  const ffa = pickupState.mode === 'ffa';
  if (pickupState.poolMap !== m.key) { pickupState.ours = pickupState.theirs = pickupState.ffaKids = null; pickupState.poolMap = m.key; }
  pickupNormalize(m, pickupState.pad !== false);
  pickupState.pad = true;
  const pool = pickupPool(m);
  const kidBtn = (grp, k, other) => {
    const on = pickupState[grp].includes(k.charId), off = !on && other.includes(k.charId);
    return `<button class="pk-opt pk-kid${on ? ' on' : ''}${off ? ' off' : ''}" data-grp="${grp}" data-val="${k.charId}"${off ? ' disabled' : ''}>${CHARACTERS[k.charId].name}</button>`;
  };
  const kidRow = (label, grp, other) => {
    const n = pickupNeeds(m, grp), have = pickupState[grp].length;
    return row(`${label} <span class="pk-count">${have}/${n}</span>`, pool.map(k => kidBtn(grp, k, other)).join(''));
  };
  const short = ffa ? pickupState.ffaKids.length < pickupState.ways - 1
    : (pickupState.ours.length < pickupState.size - 1 || pickupState.theirs.length < pickupState.size);
  const btn = (grp, val, label, on) => `<button class="pk-opt${on ? ' on' : ''}" data-grp="${grp}" data-val="${val}">${label}</button>`;
  const row = (label, inner) => `<div class="pk-row"><div class="pk-label">${label}</div><div class="pk-btns">${inner}</div></div>`;
  return `<div class="pk-board">
    <div class="pk-note">Pick it, play it. $3 a win, $1 if you lose; it doesn't count for the ladder.</div>
    ${row('Where', open.map(k => btn('map', k.key, k.name, k.key === pickupState.map)).join(''))}
    ${row('Mode', btn('mode', 'teams', 'Teams', !ffa) + (maxWays ? btn('mode', 'ffa', 'Free-for-all', ffa) : ''))}
    ${ffa ? row('How many', [3, 4, 5, 6, 7, 8].filter(n => n <= maxWays).map(n => btn('ways', n, `${n}-way`, n === pickupState.ways)).join(''))
      : row('How many', [1, 2, 3, 4].filter(n => n <= max).map(n => btn('size', n, `${n}v${n}`, n === pickupState.size)).join(''))}
    ${ffa ? kidRow('Who', 'ffaKids', []) : (pickupState.size > 1 ? kidRow('With you', 'ours', pickupState.theirs) : '') + kidRow('Against you', 'theirs', pickupState.ours)}
    ${row('When', btn('tod', 'day', 'Day', pickupState.tod === 'day') + btn('tod', 'night', 'Night', pickupState.tod === 'night'))}
    ${row('Lives', PICKUP_LIVES.map(n => btn('lives', n, String(n), n === pickupState.lives)).join(''))}
    ${row('Clock', PICKUP_CLOCKS.map(n => btn('clock', n, n ? pickupClockText(n) : 'Off', n === pickupState.clock)).join(''))}
    ${Holiday.parked ? '' : row('Holiday', PICKUP_HOLIDAYS.map(k => btn('holiday', k, PICKUP_HOLIDAY_LABELS[k] + (k === 'date' ? ` <span class="pk-count">${holidayByDate() ? 'Halloween' : 'none'}</span>` : ''), k === pickupState.holiday)).join('')) /* v1.361: hidden while the holidays are parked (B.18) */}
    <div class="pk-row"><button class="pk-play nb-btn" id="pickupPlayBtn"${short ? ' disabled' : ''}>${short ? 'PICK THE KIDS' : 'PLAY'}</button>
      <button class="pk-opt pk-online" id="pickupOnlineBtn">PLAY ONLINE</button></div>
  </div>`;
}
function renderPickupBoard() {
  const body = document.getElementById('modalBody');
  body.innerHTML = pickupBoardHTML();
  body.querySelectorAll('.pk-opt').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.val, grp = b.dataset.grp;
    if (grp === 'ours' || grp === 'theirs' || grp === 'ffaKids') {   // v1.203: a picked kid comes off; another goes on, in place of the last when full
      const ids = pickupState[grp], m = PICKUP_MAPS.find(k => k.key === pickupState.map);
      if (ids.includes(v)) ids.splice(ids.indexOf(v), 1);
      else { if (ids.length >= pickupNeeds(m, grp)) ids.pop(); ids.push(v); }
      pickupState.pad = false;   // leave a side short until you pick its last kid
    } else pickupState[grp] = (grp === 'size' || grp === 'ways' || grp === 'lives' || grp === 'clock') ? +v : v;
    renderPickupBoard();
  }));
  body.querySelector('#pickupPlayBtn').addEventListener('click', playPickupGame);
  body.querySelector('#pickupOnlineBtn').addEventListener('click', openNetPanel);   // v1.230 (D.2)
}
function openPickupBoard() {
  Game.prevMode = Game.mode;
  Game.mode = 'modal';
  exitPointerLock();
  document.getElementById('modalTitle').textContent = 'Pickup Game';
  document.getElementById('modalCloseBtn').textContent = 'CLOSE';   // closeModal puts OK back
  document.getElementById('modalBody').style.whiteSpace = 'normal';
  document.querySelector('#modalScreen .modal-card').classList.add('wide');
  renderPickupBoard();
  document.getElementById('modalScreen').classList.add('active');
}
function pickupClockText(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
// v1.204: lives left now: yours (hits you can still take) and your allies', against the best other side's (in a
// free-for-all, the best single kid's)
function pickupLivesLeft() {
  const by = new Map(), add = (team, n) => by.set(team, (by.get(team) || 0) + Math.max(0, n));
  const mine = combatantTeam(Game.player);
  add(mine, Game.player.maxHits - Game.player.hitsTaken);
  for (const e of Game.scenario.enemies || []) add(combatantTeam(e), typeof e.lives === 'number' ? e.lives : (e.health > 0 ? 1 : 0));
  const ours = by.get(mine) || 0;
  by.delete(mine);
  return { ours, theirs: Math.max(0, ...by.values()) };
}
// v1.204: the pickup clock, once a step from stepGame: at time, more lives left wins; level is a loss
function updatePickupClock() {
  const S = Game.scenario;
  if (Game.mode !== 'scenario' || !S.pickupClock || S.pickupTimeUp) return;
  if (Net.active && Net.role === 'guest') return;   // v1.230: online, the host's game keeps the clock
  if ((S.roundTime || 0) < S.pickupClock) return;
  const L = pickupLivesLeft();
  S.pickupTimeUp = L;
  S.winCondition = '__finished__';   // no last-standing end inside the 800 ms
  Game.player._graceT = 1;   // and no late tag on you: the count above is the result
  endScenarioLater(L.ours > L.theirs ? 'win' : 'lose', 800);
}
function playPickupGame() {
  if (document.getElementById('pickupPlayBtn').disabled) return;
  if (!buildPickupScenario(pickupState)) return;
  closeModal();
  enterScenario('pickup_game');
}
// =====================================================================
// v1.230 (backlog D.2 step 1, Michael: A on "Online play: how do two friends find each other", 14 Oct): ONLINE PLAY.
// PLAY ONLINE on the Pickup Game board: one friend hosts a room and gets a four-letter code, the other types it in,
// and the two play a 1v1 on Winnmark Court with the host's board settings for day or night, lives and the clock.
// The browsers talk directly (WebRTC); PeerJS's free public matchmaker only carries the first hello. Its code (about
// 90 KB) loads when someone presses HOST or JOIN, never at startup.
// The host's game is the referee: it runs the BBs, the tags, the lives and the clock. Each player moves his own kid and
// sends where he is ~30 times a second; each shot is sent once (where from, which way, its curve) and flies in both
// games, but only the host's copy can tag. On each screen the other player is a kid in his own look with his own gun.
// Nothing is on the line: no pay, no ladder, and the BBs in your bag are put back as they were.
// `Net.makeTransport` is the one function that knows about PeerJS; the tests swap it for a stub (no network in CI).
const NET_PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const NET_PEER_PREFIX = 'nbhd-airsoft-';
const NET_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I or O: they read as 1 and 0
const NET_SEND_SEC = { host: 1 / 20, guest: 1 / 30 };
const NET_FRIEND = 'net_friend';   // the other player's CHARACTERS entry while a match is up
const Net = {
  active: false, role: null, phase: 'idle', tx: null, code: null, name: 'Friend',
  remote: null, opts: null, kid: null, kidTarget: null, kidRespawns: 0, built: null,
  localReady: false, remoteReady: false, begin: null, starts: null, sendT: 0, bagSaved: null, error: null,
  makeTransport: null,   // set below to netPeerTransport
};
function netVersion() { const v = document.querySelector('#titleScreen .version, .version'); return v ? v.textContent.trim() : '?'; }
function netNewCode() { let s = ''; for (let i = 0; i < 4; i++) s += NET_CODE_LETTERS[Math.floor(gameRandom() * NET_CODE_LETTERS.length)]; return s; }
function netCleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }
function netCleanName(s) { return String(s || '').replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 14) || 'Friend'; }
// What the other game sends is checked before it is used: a look of plain values, a gun the game has, numbers that are numbers
function netCleanLook(look) {
  const out = {};
  if (look && typeof look === 'object') for (const [k, v] of Object.entries(look)) {
    if (!/^[A-Za-z]{1,24}$/.test(k)) continue;
    if (typeof v === 'number' && isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && /^[A-Za-z0-9_-]{0,24}$/.test(v)) out[k] = v;
  }
  return out;
}
function netCleanGun(g) { return ALL_GUN_TYPES.includes(g) ? g : 'pistol'; }
function netVec(a) {
  return Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) < 1e4) ? a : null;
}
const netR = n => Math.round(n * 1000) / 1000;
function netSend(m) { if (Net.tx) { try { Net.tx.send(m); } catch (e) {} } }

// --- the PeerJS transport: start(role, code, handlers) -> { send, close } ---
// handlers: ready(code) (host: the room is open; guest: joined), connected() (host: the friend is in), data(m), closed(), error(kind)
function netLoadPeerJs() {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script');
    s.src = NET_PEERJS_URL;
    s.onload = () => window.Peer ? res() : rej(new Error('no Peer'));
    s.onerror = () => rej(new Error('load'));
    document.head.appendChild(s);
  });
}
function netPeerTransport(role, code, h) {
  let peer = null, conn = null, closed = false;
  const wire = c => {
    conn = c;
    c.on('open', () => {
      if (closed) return;
      if (role === 'host') { h.connected(); try { peer.disconnect(); } catch (e) {} }   // the room code is free again; the link stays
      else h.ready(code);
    });
    c.on('data', d => { if (closed) return; try { h.data(typeof d === 'string' ? JSON.parse(d) : d); } catch (e) {} });
    c.on('close', () => { if (!closed) { closed = true; h.closed(); } });
    c.on('error', () => { if (!closed) { closed = true; h.closed(); } });
  };
  netLoadPeerJs().then(() => {
    if (closed) return;
    peer = role === 'host' ? new window.Peer(NET_PEER_PREFIX + code) : new window.Peer();
    peer.on('open', () => {
      if (closed) return;
      if (role === 'host') h.ready(code);
      else wire(peer.connect(NET_PEER_PREFIX + code, { reliable: true, serialization: 'json' }));
    });
    peer.on('connection', c => {
      if (role !== 'host' || conn) { c.on('open', () => { try { c.close(); } catch (e) {} }); return; }   // one friend a room
      wire(c);
    });
    peer.on('error', err => {
      if (closed) return;
      const t = err && err.type;
      if (conn && conn.open) return;   // the matchmaker going away mid-match is not the match's business
      closed = true;
      h.error(t === 'unavailable-id' ? 'taken' : t === 'peer-unavailable' ? 'noroom' : t === 'browser-incompatible' ? 'browser' : 'net');
    });
  }).catch(() => { if (!closed) { closed = true; h.error('load'); } });
  return {
    send(m) { if (conn && conn.open) conn.send(m); },
    close() { closed = true; try { if (conn) conn.close(); } catch (e) {} try { if (peer) peer.destroy(); } catch (e) {} },
  };
}
Net.makeTransport = netPeerTransport;

const NET_ERRORS = {
  taken: 'That room code was taken. Press HOST again for another.',
  noroom: 'No room with that code. Check the letters with your friend; the host has to be waiting on the board.',
  browser: 'This browser can’t do online play.',
  load: 'Couldn’t reach the matchmaker. Check your internet and try again.',
  net: 'Couldn’t reach your friend. Some school and office Wi-Fi blocks this; try another network.',
  ver: 'You and your friend have different versions of the game. Both of you reload the page and try again.',
};

// --- the panel on the Pickup Game board ---
function netPanelHTML() {
  const s = pickupState, busy = Net.phase === 'lobby';
  const clock = s.clock ? pickupClockText(s.clock) + ' on the clock' : 'no clock';
  const status = Net.error ? `<div class="pk-net-err" id="netStatus">${NET_ERRORS[Net.error] || NET_ERRORS.net}</div>`
    : busy && Net.role === 'host' && Net.code ? `<div class="pk-net-code" id="netCode">${Net.code}</div><div class="pk-note" id="netStatus">Waiting for your friend. Tell them the code; they press PLAY ONLINE on their board, type it and press JOIN.</div>`
    : busy ? `<div class="pk-note" id="netStatus">${Net.role === 'host' ? 'Opening a room…' : 'Looking for the room…'}</div>` : '<div class="pk-note" id="netStatus"></div>';
  return `<div class="pk-board">
    <div class="pk-note">Play a friend over the internet: a 1v1 on Winnmark Court, ${s.tod === 'night' ? 'after dark' : 'in the afternoon'}, ${s.lives === 1 ? 'one life' : s.lives + ' lives'} each, ${clock} (the host’s board sets these). Nothing on the line: no pay, and your save is untouched.</div>
    <div class="pk-row"><div class="pk-label">Your name</div><div class="pk-btns"><input class="pk-input" id="netName" maxlength="14" value="${netCleanName(Net.name)}"${busy ? ' disabled' : ''}></div></div>
    <div class="pk-row"><div class="pk-label">Host</div><div class="pk-btns"><button class="pk-opt" id="netHostBtn"${busy ? ' disabled' : ''}>HOST A ROOM</button></div></div>
    <div class="pk-row"><div class="pk-label">Join</div><div class="pk-btns"><input class="pk-input" id="netJoinCode" maxlength="4" placeholder="CODE" autocomplete="off"${busy ? ' disabled' : ''}><button class="pk-opt" id="netJoinBtn"${busy ? ' disabled' : ''}>JOIN</button></div></div>
    ${status}
    <div class="pk-note pk-net-privacy">Online play connects your computer straight to your friend’s, so each of you can see the other’s internet address, as in any voice chat. A free public service (PeerJS) passes on the room code to start it. Play with friends you know.</div>
    <div class="pk-row"><button class="pk-opt" id="netBackBtn">${busy ? 'CANCEL' : '◀ BACK TO THE BOARD'}</button></div>
  </div>`;
}
function renderNetPanel() {
  const body = document.getElementById('modalBody');
  if (!body || !document.getElementById('modalScreen').classList.contains('active')) return;
  body.innerHTML = netPanelHTML();
  const name = body.querySelector('#netName');
  name.addEventListener('input', () => { Net.name = netCleanName(name.value); try { localStorage.setItem('na_online_name', Net.name); } catch (e) {} });
  body.querySelector('#netHostBtn').addEventListener('click', () => netHost());
  body.querySelector('#netJoinBtn').addEventListener('click', () => netJoin(body.querySelector('#netJoinCode').value));
  body.querySelector('#netJoinCode').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') netJoin(ev.target.value); });
  name.addEventListener('keydown', ev => ev.stopPropagation());   // typing a name is not walking
  body.querySelector('#netBackBtn').addEventListener('click', () => {
    if (Net.phase === 'lobby') netClose();
    Net.error = null;
    document.getElementById('modalTitle').textContent = 'Pickup Game';
    renderPickupBoard();
  });
}
function openNetPanel() {
  try { const n = localStorage.getItem('na_online_name'); if (n) Net.name = netCleanName(n); } catch (e) {}
  Net.error = null;
  document.getElementById('modalTitle').textContent = 'Pickup Game: Online';
  renderNetPanel();
}
function netOpen(role, code) {
  netClose();
  Object.assign(Net, { active: true, role, phase: 'lobby', code, error: null, remote: null, kid: null, kidTarget: null,
    kidRespawns: 0, localReady: false, remoteReady: false, begin: null, built: null, starts: null, sendT: 0 });
  const tx = Net.makeTransport(role, code, {
    ready: c => { if (Net.tx !== tx) return; Net.code = c; if (role === 'guest') netSend({ t: 'hello', ver: netVersion(), name: netCleanName(Net.name), look: Game.persist.look, gun: Game.persist.equipped.gun }); renderNetPanel(); },
    connected: () => {},
    data: m => { if (Net.tx === tx) netReceive(m); },
    closed: () => { if (Net.tx === tx) netLost(); },
    error: kind => {
      if (Net.tx !== tx) return;
      if (kind === 'taken' && role === 'host' && (Net._tries = (Net._tries || 0) + 1) < 4) { netOpen('host', netNewCode()); return; }
      netClose(); Net.error = kind; renderNetPanel();
    },
  });
  Net.tx = tx;
  renderNetPanel();
}
function netHost() { Net._tries = 0; netOpen('host', netNewCode()); }
function netJoin(code) {
  code = netCleanCode(code);
  if (code.length !== 4) { Net.error = 'noroom'; renderNetPanel(); return; }
  netOpen('guest', code);
}
// Closes the link and forgets the match. Safe to call any time.
function netClose() {
  const tx = Net.tx;
  Net.tx = null;
  if (tx) { try { tx.close(); } catch (e) {} }
  if (Net.bagSaved != null) { Game.persist.bag = Net.bagSaved; Net.bagSaved = null; }
  Object.assign(Net, { active: false, role: null, phase: 'idle', kid: null, kidTarget: null, built: null, begin: null });
  delete CHARACTERS[NET_FRIEND];
}

// --- the match ---
function netReceive(m) {
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
  const host = Net.role === 'host';
  switch (m.t) {
    case 'hello': {   // a friend is in the room (host)
      if (!host || Net.phase !== 'lobby') return;
      if (m.ver !== netVersion()) { netSend({ t: 'nope', why: 'ver' }); netClose(); Net.error = 'ver'; renderNetPanel(); return; }
      Net.remote = { name: netCleanName(m.name), look: netCleanLook(m.look), gun: netCleanGun(m.gun) };
      Net.opts = { map: 'winnmark', mode: 'teams', size: 1, tod: pickupState.tod, lives: pickupState.lives, clock: pickupState.clock };
      netSend({ t: 'match', ver: netVersion(), opts: Net.opts, name: netCleanName(Net.name), look: Game.persist.look, gun: Game.persist.equipped.gun });
      netStartMatch();
      return;
    }
    case 'match': {   // the host's settings and his kid (guest)
      if (host || Net.phase !== 'lobby') return;
      if (m.ver !== netVersion()) { netClose(); Net.error = 'ver'; renderNetPanel(); return; }
      const o = m.opts || {};
      Net.opts = { map: 'winnmark', mode: 'teams', size: 1, tod: o.tod === 'night' ? 'night' : 'day',
        lives: PICKUP_LIVES.includes(o.lives) ? o.lives : 3, clock: PICKUP_CLOCKS.includes(o.clock) ? o.clock : 0 };
      Net.remote = { name: netCleanName(m.name), look: netCleanLook(m.look), gun: netCleanGun(m.gun) };
      netStartMatch();
      return;
    }
    case 'nope': if (!host) { netClose(); Net.error = m.why === 'ver' ? 'ver' : 'net'; renderNetPanel(); } return;
    case 'ready': Net.remoteReady = true; if (host && Net.localReady) netGo(); return;
    case 'go': {
      if (host || Net.phase !== 'begin') return;
      const gs = netVec(m.gs), hs = netVec(m.hs);
      if (gs && hs) Net.starts = { guest: new THREE.Vector3(...gs), host: new THREE.Vector3(...hs) };
      netLaunch();
      return;
    }
    case 's': case 'h': {   // where the other player is
      const p = netVec(m.p);
      if (!p || Net.phase !== 'play' || (host ? m.t !== 's' : m.t !== 'h')) return;
      if (host && (m.r | 0) < Net.kidRespawns) return;   // sent before he heard he was tagged: he is back at his start
      Net.kidTarget = { x: p[0], y: p[1], z: p[2], yaw: +m.y || 0, c: m.c ? 1 : 0, g: (m.g | 0) === 2 ? 2 : (m.g | 0) === 1 ? 1 : 0 };   // v1.332: g, walking home (2) or in his grace (1)
      if (!host && typeof m.rt === 'number' && isFinite(m.rt)) Game.scenario.roundTime = m.rt;   // the host's clock
      return;
    }
    case 'f': if (Net.phase === 'play' && Net.kid) netSpawnShot(m, Net.kid); return;
    case 'tag': {   // the host's game tagged you (guest)
      if (host || Net.phase !== 'play') return;
      const P = Game.player, n = Math.max(0, m.n | 0);
      if (n <= P.hitsTaken) return;
      P.hitsTaken = n;
      if (Game.scenario.stats) Game.scenario.stats.hitOnYou++;
      playHitOnPlayer(); flashDamage();
      if (P.hitsTaken < P.maxHits) { startPlayerWalkHome(true); Game.scenario.playerRespawns = m.r | 0; }   // v1.332 (B.15): on foot
      else updateHealthHud();
      return;
    }
    case 'ht': {   // you tagged the host (guest)
      if (host || Net.phase !== 'play' || !Net.kid) return;
      const n = Math.max(0, m.n | 0), k = Net.kid;
      k.lives = Math.max(0, Net.opts.lives - n);
      k.hitFlash = 0.6;
      playHitOnEnemy();
      if (Game.scenario.stats) Game.scenario.stats.tags.push({ name: k.name, dist: +m.d || 0, t: Game.scenario.roundTime || 0 });
      updateRosterHud();
      return;
    }
    case 'end': {
      if (Net.phase !== 'play' && Net.phase !== 'begin') return;
      const o = m.o === 'win' ? 'lose' : 'win';   // his win is your loss; his loss or his forfeit is your win
      Net.phase = 'over';
      if (Game.mode === 'scenario') endScenario(o);
      return;
    }
    case 'bye': netLost(); return;
  }
}
// Both games build the same match: the host's board settings, Winnmark 1v1, and the one kid on the other side is the
// other player (his look, his name, his gun) at the spot the board's own kid would take.
function netBuildMatch() {
  const sc = buildPickupScenario(Net.opts);
  const r = Net.remote;
  CHARACTERS[NET_FRIEND] = Object.assign({}, CHARACTERS.seth, r.look, { name: r.name, flavor: { hit: '', win: '' } });
  const spot = sc.enemySetup.find(e => !e.team) || sc.enemySetup[0];
  sc.enemySetup = [{ charId: NET_FRIEND, weapon: r.gun, anchor: spot.anchor }];
  sc.scenarioName = 'Online: 1v1';
  sc.desc = `You against ${r.name} on Winnmark Court, ${Net.opts.tod === 'night' ? 'after dark' : 'in the afternoon'}. ` +
    `${Net.opts.lives === 1 ? 'One life' : Net.opts.lives + ' lives'} each; a tag puts you back at your start` +
    (Net.opts.clock ? `; more lives left at ${pickupClockText(Net.opts.clock)} wins.` : '.') + ' Nothing on the line.';
  sc.rewards = { win: 0, lose: 0 };
  sc.online = true;
  return sc;
}
function netStartMatch() {
  Net.phase = 'matched';
  netBuildMatch();
  if (document.getElementById('modalScreen').classList.contains('active')) closeModal();
  enterScenario('pickup_game');
  if (Game.mode !== 'scenario_intro') { netClose(); return; }
  Net.phase = 'begin';
  const k = Game.scenario.enemies.find(e => e.charId === NET_FRIEND);
  if (k) { k.remote = true; k.lives = Net.opts.lives; k.mesh.group.visible = false; Net.kid = k; }
}
// BEGIN on the briefing: the match starts when both have pressed it (the host says go)
function netBegin(btn, built, begin) {
  if (Net.localReady) return;
  Net.localReady = true; Net.built = built; Net.begin = begin;
  btn.textContent = `WAITING FOR ${Net.remote ? Net.remote.name.toUpperCase() : 'YOUR FRIEND'}…`;
  btn.disabled = true;
  netSend({ t: 'ready' });
  if (Net.role === 'host' && Net.remoteReady) netGo();
}
function netGo() {
  const gs = Net.kid ? Net.kid.pos.clone() : new THREE.Vector3();
  const hs = (Net.built && Net.built.spawn) ? Net.built.spawn.clone() : new THREE.Vector3();
  Net.starts = { guest: gs, host: hs };
  netSend({ t: 'go', gs: gs.toArray().map(netR), hs: hs.toArray().map(netR) });
  netLaunch();
}
function netLaunch() {
  if (!Net.begin) return;
  const go = Net.begin; Net.begin = null;
  // a full bag for the match, and yours back as it was after it (endScenario)
  Net.bagSaved = Game.persist.bag;
  Game.persist.bag = Math.max(Game.persist.bag, 2000);
  go();
}
// From startScenario: lives as the board says (no armor bonus online), each at his own start
function netAfterStart() {
  const P = Game.player, S = Net.starts;
  P.maxHits = Net.opts.lives;
  if (Net.role === 'guest' && S) {
    P.pos.copy(S.guest);
    P.yaw = Math.atan2(-(S.host.x - S.guest.x), -(S.host.z - S.guest.z));   // facing the host's start
    Game.scenario.playerStart = { pos: S.guest.clone(), yaw: P.yaw };
  }
  const k = Net.kid;
  if (k) {
    k._netStart = (Net.role === 'host' ? k.pos : (S ? S.host : k.pos)).clone();
    k.pos.copy(k._netStart);
    k.lives = Net.opts.lives;
    k.state = 'online';
  }
  Net.phase = 'play';
  Net.sendT = 0;
  updateHealthHud();
  updateRosterHud();
}
// Once a step in a match: send where you are
function netStep(dt) {
  if (Net.phase !== 'play') return;
  const k = Net.kid;
  if (k && k._graceT > 0) k._graceT = Math.max(0, k._graceT - dt);
  Net.sendT -= dt;
  if (Net.sendT > 0) return;
  Net.sendT += NET_SEND_SEC[Net.role] || 0.05;
  if (Net.sendT < 0) Net.sendT = 0;
  const P = Game.player;
  const m = { t: Net.role === 'host' ? 'h' : 's', p: [netR(P.pos.x), netR(P.pos.y), netR(P.pos.z)], y: netR(P.yaw), c: P.crouching ? 1 : 0,
    r: Game.scenario.playerRespawns || 0, g: P._goingHome ? 2 : P._graceT > 0 ? 1 : 0 };   // v1.332 (B.15): walking home, or in the grace
  if (Net.role === 'host') m.rt = netR(Game.scenario.roundTime || 0);
  netSend(m);
}
// Your shot, sent once as it leaves the gun
function netShot(bb) {
  if (Net.phase !== 'play') return;
  netSend({ t: 'f', o: bb.pos.toArray().map(netR), v: bb.vel.toArray().map(netR), cd: bb.curveDir.toArray().map(netR),
    cs: netR(bb.curveStrength), co: netR(bb.curveOnsetDistance) });
}
// His shot, flying the same way here. On the host it can tag you; on the guest only the host's copy counts.
function netSpawnShot(m, k) {
  const o = netVec(m.o), v = netVec(m.v), cd = netVec(m.cd);
  if (!o || !v || !cd || Game.mode !== 'scenario' || k.health <= 0) return;
  if (Math.hypot(o[0] - k.pos.x, o[2] - k.pos.z) > 4) return;   // a shot from where he isn't
  if (Net.kidTarget && Net.kidTarget.g === 2) return;   // v1.332: walking home, his gun is up
  const bb = makeBB(new THREE.Vector3(...o), new THREE.Vector3(...v), 'enemy', k,
    { curveOnsetDistance: +m.co || 4, curveStrengthMax: 0 }, combatantTeam(k));
  bb.curveDir.set(...cd);
  bb.curveStrength = Math.max(0, Math.min(60, +m.cs || 0));
  Game.scenario.bbs.push(bb);
  // v1.332 (backlog B.15, Michael: "I did not hear audio of my brother's shots"): his shot fired silently here. Now it
  // is heard from where he is, as a kid's shot is (spawnEnemyBB); its whistle past you and its hits sounded already.
  playShot(o[0], o[2]);
}
// The host's game tagged the guest's kid: a life gone and back to his start, as yours (v1.221)
// v1.332 (B.15): he walks back himself; nothing tags him while his game says he is walking home or in his grace
function netTagRemote(bb, c) {
  if (c._graceT > 0 || (Net.kidTarget && Net.kidTarget.g > 0)) return true;
  c.lives = Math.max(0, (c.lives | 0) - 1);
  if (bb.owner === 'player' && Game.scenario.stats) noteMatchTag(bb, c);
  if (bb.owner === 'player') showHitMarker(c);   // v1.321 (D.60)
  playHitOnEnemy();
  c.hitFlash = 0.6;
  if (c.lives > 0) {
    c._graceT = VIP_GRACE;   // till his word that he is walking home comes back
    Net.kidRespawns++;
    if (Net.kidTarget) Net.kidTarget.g = 2;   // v1.332: no jump to his start; he walks there, gun up
  } else c.health = 0;
  netSend({ t: 'tag', n: Net.opts.lives - c.lives, r: Net.kidRespawns });
  updateRosterHud();
  if (c.lives <= 0) checkWinCondition();
  return true;
}
// The other player's kid, moved to where his game says he is, posed as a kid who walks, crouches and holds his gun up
function netDriveRemote(e, dt) {
  const T = Net.kidTarget;
  if (!T) { e.mesh.group.visible = false; return; }
  e.mesh.group.visible = true;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  const px = e.pos.x, pz = e.pos.z;
  const far = Math.hypot(T.x - e.pos.x, T.z - e.pos.z) > 2.5;   // a respawn: jump there
  if (far || !e._netSeen) e.pos.set(T.x, T.y, T.z);
  else { const a = Math.min(1, dt * 15); e.pos.x += (T.x - e.pos.x) * a; e.pos.y += (T.y - e.pos.y) * a; e.pos.z += (T.z - e.pos.z) * a; }
  e._netSeen = true;
  const want = T.yaw + Math.PI;   // the camera looks down -z, a kid's face is +z
  const d = Math.atan2(Math.sin(want - e.yaw), Math.cos(want - e.yaw));
  e.yaw = Math.atan2(Math.sin(e.yaw + d * Math.min(1, dt * 15)), Math.cos(e.yaw + d * Math.min(1, dt * 15)));
  e.mesh.group.position.set(e.pos.x, e.pos.y, e.pos.z);
  e.mesh.group.rotation.set(0, e.yaw, 0);
  e._netCrouch = (e._netCrouch || 0) + ((T.c || 0) - (e._netCrouch || 0)) * Math.min(1, dt * 10);
  if (e.mesh.pose) setKidCrouch(e.mesh, e._netCrouch);
  const fdx = far ? 0 : e.pos.x - px, fdz = far ? 0 : e.pos.z - pz, moved = Math.hypot(fdx, fdz);
  e._animSpeed = moved / Math.max(dt, 1e-3);
  e._footstepDist = (e._footstepDist || 0) + moved;
  if (e._footstepDist >= 0.6) { e._footstepDist = 0; playFootstep(e.pos.x, e.pos.z); }
  const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw), vx = fdx / Math.max(dt, 1e-3), vz = fdz / Math.max(dt, 1e-3);
  const ease = Math.min(1, dt * 8);
  e._gaitVF = (e._gaitVF || 0) + ((vx * sy + vz * cy) - (e._gaitVF || 0)) * ease;
  e._gaitVS = (e._gaitVS || 0) + ((vx * cy - vz * sy) - (e._gaitVS || 0)) * ease;
  e._walkInt = (e._walkInt || 0) + (Math.min(1, e._animSpeed / 3) - (e._walkInt || 0)) * Math.min(1, dt * 6);
  const gaitV = Math.hypot(e._gaitVF, e._gaitVS);
  if (gaitV > 0.05) e._walkPhase = (e._walkPhase || 0) + 2 * Math.PI * kidGaitCadence(gaitV, e.mesh.scaleXZ || 1) * dt;
  // v1.332 (B.15): walking home after a tag, his gun is up in the air, as a tagged kid's
  e._hitRaise = T.g === 2 ? Math.min(1, (e._hitRaise || 0) + dt * 4) : 0;
  if (e._hitRaise > 0) setKidHitPose(e.mesh, e._hitRaise);
  else setKidGunHold(e.mesh, e.weapon, 1, 0);
  setKidWalk(e.mesh, e._walkPhase || 0, e._walkInt, e._gaitVF, e._gaitVS);
  const torso = e.mesh.parts && e.mesh.parts.torso;
  if (torso) {
    if (e.hitFlash > 0) { torso.material.emissive = new THREE.Color(1, 0, 0); torso.material.emissiveIntensity = e.hitFlash / 0.6; }
    else torso.material.emissiveIntensity = 0;
  }
}
// From endScenario: tell the other game how it ended (the host decides tags and the clock; either may forfeit)
function netEnded(outcome) {
  if (Net.phase === 'play' || Net.phase === 'begin') netSend({ t: 'end', o: outcome });
  Net.phase = 'over';
}
function netRestoreBag() { if (Net.bagSaved != null) { Game.persist.bag = Net.bagSaved; Net.bagSaved = null; } }
function netResultCard(outcome) {
  const who = Net.remote ? Net.remote.name : 'Your friend';
  document.getElementById('flavorText').textContent = outcome === 'win' ? `You beat ${who}.`
    : outcome === 'forfeit' ? `You left the match with ${who}.` : `${who} got you this time.`;
  document.getElementById('rewardText').textContent = 'Online match: nothing on the line.';
  document.getElementById('reloadNote').textContent = '';
  for (const id of ['navPrevBtn', 'navAgainBtn', 'navNextBtn']) document.getElementById(id).disabled = true;
}
// The link closed. In the lobby the board says so; in a match it ends (nothing paid, your bag put back) and you go home.
function netLost() {
  const phase = Net.phase, mode = Game.mode;
  if (phase === 'lobby') { netClose(); Net.error = 'net'; renderNetPanel(); return; }
  if (phase === 'over' || phase === 'idle') { netClose(); return; }
  Net.phase = 'over';
  if (mode === 'scenario') {
    endScenario('forfeit');
    document.getElementById('resultScreen').classList.remove('active');
  } else if (mode === 'scenario_intro') {
    document.getElementById('scenarioIntro').style.display = 'none';
  }
  netClose();
  if (mode === 'scenario' || mode === 'scenario_intro') {
    cleanupScenarioScene();
    enterBedroom();
  }
  showModal('Your friend left', 'The connection to your friend closed, so the match is over. Nothing was lost.');
}
