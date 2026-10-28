
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
// v1.364 (backlog D.2 step 2, card fable/d2-online-teams; Michael: A on "Online play: go on to teams", 21 Oct, with
// D.67 "the host should be able to pick the zone/map and time of day ... and rematches" and D.68 "an NPC Draft to fill
// empty slots"): TEAMS ONLINE. The room takes up to eight people. The host's board sets the match as the Pickup Game
// board does (any opened map, 1v1 up to its biggest team size, day or night, lives, the clock); everyone in the room is
// on Blue (the host's side, the map's own start) or Red, and each side's slots nobody takes are kids, picked by the
// people on that side from the kids who play on that street. The host's game is still the referee, and now runs every
// kid too: it sends where everyone is ~20 times a second (`w`), and each other game moves its kids and people from that.
// Every shot is sent once and flies in every game; only the host's copy tags. A tagged player walks home as before;
// one with no lives left is out and watches with his gun up while his side plays on, and the match ends when a side has
// nobody left (or on the clock). A friend who drops out of a match leaves his kid behind: the host's game plays him as
// one of its own for the rest of the match. After it, REMATCH on the host's card takes everyone back to the room.
// The link is a star: each guest talks only to the host, who passes on what the others need.
// `Net.makeTransport` is the one function that knows about PeerJS; the tests swap it for a stub (no network in CI).
const NET_PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const NET_PEER_PREFIX = 'nbhd-airsoft-';
const NET_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I or O: they read as 1 and 0
const NET_SEND_SEC = { host: 1 / 20, guest: 1 / 30 };
const NET_HOST_ID = 'net_p0';   // each person's CHARACTERS entry while a match is up: net_p0 the host, net_p1... the guests
const NET_MAX_PEOPLE = 8;
const NET_SIDES = ['A', 'B'];
const NET_SIDE_NAMES = { A: 'Blue', B: 'Red' };
const Net = {
  active: false, role: null, phase: 'idle', tx: null, code: null, name: 'Friend', error: null,
  me: null, people: [], kids: { A: [], B: [] }, opts: null, lobby: null, roster: null, ents: new Map(), nextSlot: 1,
  ready: new Set(), localReady: false, begin: null, built: null, starts: null, sendT: 0, bagSaved: null, hudT: 0,
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
function netCleanId(id) { return typeof id === 'string' && /^[a-z0-9_]{1,24}$/.test(id) ? id : null; }
function netVec(a) {
  return Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) < 1e4) ? a : null;
}
const netR = n => Math.round(n * 1000) / 1000;
// To one guest (`to`, his link id), or with no `to` to every guest; a guest's only link is the host
function netSend(m, to) { if (Net.tx) { try { Net.tx.send(m, to); } catch (e) {} } }
function netSendOthers(m, notPid) { for (const p of Net.people) if (p.pid && p.pid !== notPid && !p.gone) netSend(m, p.pid); }

// --- the PeerJS transport: start(role, code, handlers) -> { send(m, to), close() } ---
// handlers: ready(code) (host: the room is open; guest: joined), connected(pid) (host: a friend is in), data(m, pid),
// closed(pid) (host: that friend's link; guest: the host's), error(kind)
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
  let peer = null, closed = false;
  const conns = new Map();   // the host's: one a friend, by his peer id; the guest's: the host's, as 'host'
  const anyOpen = () => [...conns.values()].some(c => c.open);
  const wire = (c, pid) => {
    conns.set(pid, c);
    let gone = false;
    const lost = () => {
      if (gone || closed) return;
      gone = true; conns.delete(pid);
      if (role === 'guest') closed = true;
      h.closed(pid);
    };
    c.on('open', () => {
      if (closed) return;
      if (role === 'host') h.connected(pid);
      else h.ready(code);
    });
    c.on('data', d => { if (closed) return; try { h.data(typeof d === 'string' ? JSON.parse(d) : d, pid); } catch (e) {} });
    c.on('close', lost);
    c.on('error', lost);
  };
  netLoadPeerJs().then(() => {
    if (closed) return;
    peer = role === 'host' ? new window.Peer(NET_PEER_PREFIX + code) : new window.Peer();
    peer.on('open', () => {
      if (closed) return;
      if (role === 'host') h.ready(code);
      else wire(peer.connect(NET_PEER_PREFIX + code, { reliable: true, serialization: 'json' }), 'host');
    });
    peer.on('connection', c => {
      if (role !== 'host' || conns.size >= NET_MAX_PEOPLE - 1) { c.on('open', () => { try { c.close(); } catch (e) {} }); return; }
      wire(c, c.peer || ('p' + conns.size));
    });
    peer.on('error', err => {
      if (closed) return;
      const t = err && err.type;
      if (anyOpen()) return;   // the matchmaker going away mid-match is not the match's business
      if (role === 'host' && t !== 'unavailable-id' && t !== 'browser-incompatible' && peer.open === false && conns.size) return;
      closed = true;
      h.error(t === 'unavailable-id' ? 'taken' : t === 'peer-unavailable' ? 'noroom' : t === 'browser-incompatible' ? 'browser' : 'net');
    });
  }).catch(() => { if (!closed) { closed = true; h.error('load'); } });
  return {
    send(m, to) {
      if (to) { const c = conns.get(to); if (c && c.open) c.send(m); }
      else for (const c of conns.values()) if (c.open) c.send(m);
    },
    drop(pid) { const c = conns.get(pid); conns.delete(pid); try { if (c) c.close(); } catch (e) {} },
    close() { closed = true; for (const c of conns.values()) { try { c.close(); } catch (e) {} } conns.clear(); try { if (peer) peer.destroy(); } catch (e) {} },
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
  full: 'That room is full.',
  started: 'That room’s match has started. Join when it is back in the room.',
};

// --- the room: who is on which side, and the kids who fill the rest ---
function netMap() { return PICKUP_MAPS.find(k => k.key === (Net.opts || pickupState).map) || PICKUP_MAPS[0]; }
function netOnSide(side) { return Net.people.filter(p => p.side === side && !p.gone); }
function netKidsNeeded(side) { return Math.max(0, Net.opts.size - netOnSide(side).length); }
function netMostOnASide() { return Math.max(...NET_SIDES.map(s => netOnSide(s).length)); }
// The host's board settings as the room's: teams only, at least as big as the most people on a side
function netHostOpts() {
  const open = pickupMapsOpen(), most = netMostOnASide();
  let m = open.find(k => k.key === pickupState.map && pickupMaxSize(k) >= most) || open.find(k => pickupMaxSize(k) >= most) || open[0];
  pickupState.map = m.key;
  pickupState.size = Math.max(most, 1, Math.min(pickupMaxSize(m), pickupState.size));
  Net.opts = { map: m.key, mode: 'teams', size: pickupState.size, tod: pickupState.tod === 'night' ? 'night' : 'day',
    lives: PICKUP_LIVES.includes(pickupState.lives) ? pickupState.lives : 3, clock: PICKUP_CLOCKS.includes(pickupState.clock) ? pickupState.clock : 0 };
  return Net.opts;
}
// Each side's kids: kids of this street, none on both sides, as many as the side has empty slots; a side short of
// picks is filled from the board's defaults (Blue from the map's allies, Red from its other side) unless `keepShort`
function netNormalizeKids(keepShort) {
  const m = netMap(), pool = pickupPool(m).map(k => k.charId), t = SCENARIOS[m.template];
  const defs = { A: t.enemySetup.filter(e => e.team === 'player').map(e => e.charId), B: t.enemySetup.filter(e => !e.team).map(e => e.charId) };
  for (const side of NET_SIDES) {
    const other = Net.kids[side === 'A' ? 'B' : 'A'] || [], n = netKidsNeeded(side);
    let ids = (Net.kids[side] || []).filter(id => pool.includes(id) && !other.includes(id)).slice(0, n);
    if (!keepShort) for (const id of defs[side].concat(defs[side === 'A' ? 'B' : 'A'], pool)) {
      if (ids.length >= n) break;
      if (pool.includes(id) && !ids.includes(id) && !other.includes(id)) ids.push(id);
    }
    Net.kids[side] = ids;
  }
}
function netRoomReady() {
  return Net.people.some(p => p.id !== NET_HOST_ID && !p.gone) && NET_SIDES.every(s => Net.kids[s].length === netKidsNeeded(s));
}
// The host tells each guest what the room is now
function netSendLobby() {
  if (Net.role !== 'host') return;
  const people = Net.people.filter(p => !p.gone).map(p => ({ id: p.id, name: p.name, side: p.side }));
  for (const p of Net.people) if (p.pid && !p.gone) netSend({ t: 'lobby', opts: Net.opts, people, kids: Net.kids, you: p.id }, p.pid);
}
function netRoomChanged(keepShort) { netHostOpts(); netNormalizeKids(keepShort); netSendLobby(); renderNetPanel(); }
// A pick on a side's kids (the host's own click, or a guest's 'kid' for his side): off if on, else on, in place of the last when full
function netToggleKid(side, id) {
  const ids = Net.kids[side], other = Net.kids[side === 'A' ? 'B' : 'A'];
  if (!pickupPool(netMap()).some(k => k.charId === id) || other.includes(id)) return;
  if (ids.includes(id)) ids.splice(ids.indexOf(id), 1);
  else { if (ids.length >= netKidsNeeded(side)) ids.pop(); if (netKidsNeeded(side) > 0) ids.push(id); }
  netRoomChanged(true);
}
function netMoveSide(p, side) {
  if (!NET_SIDES.includes(side) || p.side === side || p.id === NET_HOST_ID) return;
  if (netOnSide(side).length >= pickupMaxSize(netMap())) return;
  p.side = side;
  netRoomChanged(false);
}

// --- the panel on the Pickup Game board ---
function netPanelHTML() {
  const busy = Net.phase === 'lobby', inRoom = busy && (Net.role === 'host' ? !!Net.code : !!Net.lobby);
  const status = Net.error ? `<div class="pk-net-err" id="netStatus">${NET_ERRORS[Net.error] || NET_ERRORS.net}</div>`
    : busy && !inRoom ? `<div class="pk-note" id="netStatus">${Net.role === 'host' ? 'Opening a room…' : 'Looking for the room…'}</div>` : '<div class="pk-note" id="netStatus"></div>';
  const back = `<div class="pk-row"><button class="pk-opt" id="netBackBtn">${busy ? 'LEAVE THE ROOM' : '◀ BACK TO THE BOARD'}</button></div>`;
  const privacy = `<div class="pk-note pk-net-privacy">Online play connects your computer straight to your friends’, so each of you can see the others’ internet address, as in any voice chat. A free public service (PeerJS) passes on the room code to start it. Play with friends you know.</div>`;
  if (inRoom) return `<div class="pk-board">${netRoomHTML()}${status}${privacy}${back}</div>`;
  return `<div class="pk-board">
    <div class="pk-note">Play friends over the internet, up to eight of you: teams on any map the host has opened, and kids from the street in every slot nobody takes. The host’s board sets the match. Nothing on the line: no pay, and your save is untouched.</div>
    <div class="pk-row"><div class="pk-label">Your name</div><div class="pk-btns"><input class="pk-input" id="netName" maxlength="14" value="${netCleanName(Net.name)}"${busy ? ' disabled' : ''}></div></div>
    <div class="pk-row"><div class="pk-label">Host</div><div class="pk-btns"><button class="pk-opt" id="netHostBtn"${busy ? ' disabled' : ''}>HOST A ROOM</button></div></div>
    <div class="pk-row"><div class="pk-label">Join</div><div class="pk-btns"><input class="pk-input" id="netJoinCode" maxlength="4" placeholder="CODE" autocomplete="off"${busy ? ' disabled' : ''}><button class="pk-opt" id="netJoinBtn"${busy ? ' disabled' : ''}>JOIN</button></div></div>
    ${status}${privacy}${back}
  </div>`;
}
// The room: the code, the host's settings (buttons for him, words for a guest), the two sides and their kids
function netRoomHTML() {
  const host = Net.role === 'host', o = Net.opts, m = netMap(), most = netMostOnASide();
  const meP = Net.people.find(p => p.id === Net.me) || { side: 'A' };
  const row = (label, inner, id) => `<div class="pk-row"${id ? ` id="${id}"` : ''}><div class="pk-label">${label}</div><div class="pk-btns">${inner}</div></div>`;
  const btn = (grp, val, label, on, off) => `<button class="pk-opt${on ? ' on' : ''}" data-grp="${grp}" data-val="${val}"${off ? ' disabled' : ''}>${label}</button>`;
  const name = id => (CHARACTERS[id] || { name: id }).name;
  let html = `<div class="pk-net-code" id="netCode">${Net.code || ''}</div>`;
  html += `<div class="pk-note" id="netRoomNote">${host ? 'Your room. Friends press PLAY ONLINE on their board, type the code and press JOIN. Set the match, then START.'
    : `${(Net.people.find(p => p.id === NET_HOST_ID) || { name: 'The host' }).name}’s room. The host sets the match and starts it.`}</div>`;
  if (host) {
    html += row('Where', pickupMapsOpen().map(k => btn('map', k.key, k.name, k.key === o.map, pickupMaxSize(k) < most)).join(''));
    html += row('How many', [1, 2, 3, 4].filter(n => n <= pickupMaxSize(m)).map(n => btn('size', n, `${n}v${n}`, n === o.size, n < most)).join(''));
    html += row('When', btn('tod', 'day', 'Day', o.tod === 'day') + btn('tod', 'night', 'Night', o.tod === 'night'));
    html += row('Lives', PICKUP_LIVES.map(n => btn('lives', n, String(n), n === o.lives)).join(''));
    html += row('Clock', PICKUP_CLOCKS.map(n => btn('clock', n, n ? pickupClockText(n) : 'Off', n === o.clock)).join(''));
  } else {
    html += `<div class="pk-note" id="netMatchNote">${o.size}v${o.size} on ${m.name}, ${o.tod === 'night' ? 'after dark' : 'in the afternoon'}, ${o.lives === 1 ? 'one life' : o.lives + ' lives'} each, ${o.clock ? pickupClockText(o.clock) + ' on the clock' : 'no clock'}.</div>`;
  }
  const pool = pickupPool(m);
  for (const side of NET_SIDES) {
    const ppl = netOnSide(side), mine = meP.side === side, need = netKidsNeeded(side), kids = Net.kids[side] || [];
    const who = ppl.map(p => `<b>${p.name}</b>`).concat(kids.map(name)).join(', ') || 'nobody yet';
    const move = !mine && meP.id !== NET_HOST_ID && ppl.length < pickupMaxSize(m) ? ` <button class="pk-opt" data-grp="side" data-val="${side}">MOVE HERE</button>` : '';
    html += row(`${NET_SIDE_NAMES[side]}${mine ? ' (you)' : ''} <span class="pk-count">${ppl.length + kids.length}/${o.size}</span>`, `<span class="pk-net-side" id="netSide${side}">${who}</span>${move}`);
    if (mine && need > 0) {
      const other = Net.kids[side === 'A' ? 'B' : 'A'];
      html += row(`Kids <span class="pk-count">${kids.length}/${need}</span>`, pool.map(k => {
        const on = kids.includes(k.charId), off = !on && other.includes(k.charId);
        return `<button class="pk-opt pk-kid${on ? ' on' : ''}${off ? ' off' : ''}" data-grp="kid" data-val="${k.charId}"${off ? ' disabled' : ''}>${CHARACTERS[k.charId].name}</button>`;
      }).join(''), 'netKids');
    }
  }
  if (host) {
    const ok = netRoomReady(), alone = !Net.people.some(p => p.id !== NET_HOST_ID && !p.gone);
    html += `<div class="pk-row"><button class="pk-play nb-btn" id="netStartBtn"${ok ? '' : ' disabled'}>${ok ? 'START' : alone ? 'WAITING FOR FRIENDS' : 'PICK THE KIDS'}</button></div>`;
  }
  return html;
}
function renderNetPanel() {
  const body = document.getElementById('modalBody');
  if (!body || !document.getElementById('modalScreen').classList.contains('active')) return;
  if (Game.mode !== 'modal') return;
  body.innerHTML = netPanelHTML();
  const name = body.querySelector('#netName');
  if (name) {
    name.addEventListener('input', () => { Net.name = netCleanName(name.value); try { localStorage.setItem('na_online_name', Net.name); } catch (e) {} });
    name.addEventListener('keydown', ev => ev.stopPropagation());   // typing a name is not walking
    body.querySelector('#netHostBtn').addEventListener('click', () => netHost());
    body.querySelector('#netJoinBtn').addEventListener('click', () => netJoin(body.querySelector('#netJoinCode').value));
    body.querySelector('#netJoinCode').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') netJoin(ev.target.value); });
  }
  body.querySelectorAll('.pk-opt[data-grp]').forEach(b => b.addEventListener('click', () => netPanelClick(b.dataset.grp, b.dataset.val)));
  const start = body.querySelector('#netStartBtn');
  if (start) start.addEventListener('click', () => netStartRoom());
  body.querySelector('#netBackBtn').addEventListener('click', () => {
    if (Net.phase === 'lobby') netClose();
    Net.error = null;
    document.getElementById('modalTitle').textContent = 'Pickup Game';
    renderPickupBoard();
  });
}
function netPanelClick(grp, v) {
  const meP = Net.people.find(p => p.id === Net.me);
  if (grp === 'kid') {
    if (!meP) return;
    if (Net.role === 'host') netToggleKid(meP.side, v); else netSend({ t: 'kid', id: v });
  } else if (grp === 'side') {
    if (Net.role === 'guest') netSend({ t: 'side', side: v });
  } else if (Net.role === 'host') {
    pickupState[grp] = (grp === 'size' || grp === 'lives' || grp === 'clock') ? +v : v;
    if (grp === 'map') Net.kids = { A: [], B: [] };   // another street, other kids
    netRoomChanged(false);
  }
}
function openNetPanel() {
  try { const n = localStorage.getItem('na_online_name'); if (n) Net.name = netCleanName(n); } catch (e) {}
  Net.error = null;
  document.getElementById('modalTitle').textContent = 'Pickup Game: Online';
  renderNetPanel();
}
function netOpen(role, code) {
  netClose();
  Object.assign(Net, { active: true, role, phase: 'lobby', code, error: null, me: role === 'host' ? NET_HOST_ID : null,
    people: [], kids: { A: [], B: [] }, lobby: null, roster: null, nextSlot: 1 });
  netResetMatch();
  if (role === 'host') {
    Net.people.push({ id: NET_HOST_ID, pid: null, name: netCleanName(Net.name), look: Game.persist.look, gun: Game.persist.equipped.gun, side: 'A' });
    netHostOpts(); netNormalizeKids(false);
  }
  const tx = Net.makeTransport(role, code, {
    ready: c => { if (Net.tx !== tx) return; Net.code = c; if (role === 'guest') netSend({ t: 'hello', ver: netVersion(), name: netCleanName(Net.name), look: Game.persist.look, gun: Game.persist.equipped.gun }); renderNetPanel(); },
    connected: () => {},
    data: (m, pid) => { if (Net.tx === tx) netReceive(m, pid); },
    closed: pid => { if (Net.tx !== tx) return; if (role === 'host') netDropped(pid); else netLost(); },
    error: kind => {
      if (Net.tx !== tx) return;
      if (kind === 'taken' && role === 'host' && (Net._tries = (Net._tries || 0) + 1) < 4) { netOpen('host', netNewCode()); return; }
      netClose(); Net.error = kind; renderNetPanel();
    },
  });
  Net.tx = tx;
  renderNetPanel();
}
function netResetMatch() {
  for (const id of Object.keys(CHARACTERS)) if (/^net_p\d+$/.test(id)) delete CHARACTERS[id];
  if (Game.player) Game.player._netOut = false;
  Object.assign(Net, { roster: null, ents: new Map(), ready: new Set(), localReady: false, begin: null, built: null, starts: null, sendT: 0 });
}
function netHost() { Net._tries = 0; netOpen('host', netNewCode()); }
function netJoin(code) {
  code = netCleanCode(code);
  if (code.length !== 4) { Net.error = 'noroom'; renderNetPanel(); return; }
  netOpen('guest', code);
}
// Closes the link and forgets the room. Safe to call any time.
function netClose() {
  const tx = Net.tx;
  Net.tx = null;
  if (tx) { try { tx.close(); } catch (e) {} }
  if (Net.bagSaved != null) { Game.persist.bag = Net.bagSaved; Net.bagSaved = null; }
  Object.assign(Net, { active: false, role: null, phase: 'idle', people: [], lobby: null, me: null });
  netResetMatch();
  netHud('');
  const again = document.getElementById('navAgainBtn');
  if (again && again.dataset.netLabel != null) { again.textContent = again.dataset.netLabel; delete again.dataset.netLabel; }
}
// The host: a friend's link closed. In the room he is gone from his side; in a match his kid plays on (the host's AI).
function netDropped(pid) {
  const p = Net.people.find(x => x.pid === pid);
  if (!p || p.gone) return;
  p.gone = true;
  if (Net.phase === 'lobby') { Net.people.splice(Net.people.indexOf(p), 1); netRoomChanged(false); return; }
  const e = Net.ents.get(p.id);
  if (e && (Net.phase === 'begin' || Net.phase === 'play')) {
    netBotTakeover(e);
    const line = `${p.name.toUpperCase()} LEFT · A KID PLAYS THE SPOT`;
    netHud(line);
    netSendOthers({ t: 'gone', id: p.id, name: p.name });
    if (Net.phase === 'begin' && Net.localReady && netAllReady()) netGo();
  }
}
// v1.364 (D.2 step 3): his kid stays where he is, with his look, his gun and his lives left, and the host's game plays him
function netBotTakeover(e) {
  e.remote = false;
  e.netBot = true;
  e._netT = null;
  e._graceT = 0;
  if (e.health > 0) { e.state = 'hiding'; e.stateTime = 0; e.homeCover = null; e.targetPos = null; e.pendingBurst = []; }
  updateRosterHud();
}
// A short line on the screen in a match (who left)
function netHud(line, sec = 4) {
  const hud = document.getElementById('netHud');
  if (!hud) return;
  hud.textContent = line;
  hud.style.display = line ? 'block' : 'none';
  Net.hudT = line ? sec : 0;
}

// --- the messages ---
function netReceive(m, pid) {
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
  const host = Net.role === 'host';
  const from = host ? Net.people.find(p => p.pid === pid && !p.gone) : null;
  switch (m.t) {
    case 'hello': {   // a friend is in the room (host)
      if (!host || Net.people.some(p => p.pid === pid)) return;
      const nope = why => { netSend({ t: 'nope', why }, pid); if (Net.tx && Net.tx.drop) Net.tx.drop(pid); };
      if (m.ver !== netVersion()) return nope('ver');
      if (Net.phase !== 'lobby') return nope('started');
      const max = pickupMaxSize(netMap());
      const side = NET_SIDES.slice().reverse().filter(s => netOnSide(s).length < Math.max(max, 1))
        .sort((a, b) => netOnSide(a).length - netOnSide(b).length)[0];
      if (!side || Net.people.filter(p => !p.gone).length >= NET_MAX_PEOPLE) return nope('full');
      Net.people.push({ id: 'net_p' + (Net.nextSlot++), pid, name: netCleanName(m.name), look: netCleanLook(m.look), gun: netCleanGun(m.gun), side });
      netRoomChanged(false);
      return;
    }
    case 'lobby': {   // the room as the host has it (guest)
      if (host || Net.phase !== 'lobby') return;
      const o = m.opts || {}, map = PICKUP_MAPS.find(k => k.key === o.map);
      if (!map) return;
      Net.phase = 'lobby';
      Net.opts = { map: map.key, mode: 'teams', size: Math.max(1, Math.min(pickupMaxSize(map), o.size | 0)), tod: o.tod === 'night' ? 'night' : 'day',
        lives: PICKUP_LIVES.includes(o.lives) ? o.lives : 3, clock: PICKUP_CLOCKS.includes(o.clock) ? o.clock : 0 };
      Net.people = (Array.isArray(m.people) ? m.people : []).slice(0, NET_MAX_PEOPLE).filter(p => p && netCleanId(p.id))
        .map(p => ({ id: p.id, name: netCleanName(p.name), side: p.side === 'B' ? 'B' : 'A' }));
      const kids = m.kids || {}, pool = pickupPool(map).map(k => k.charId);
      Net.kids = { A: (Array.isArray(kids.A) ? kids.A : []).filter(id => pool.includes(id)), B: (Array.isArray(kids.B) ? kids.B : []).filter(id => pool.includes(id)) };
      Net.me = netCleanId(m.you);
      Net.lobby = true;
      renderNetPanel();
      return;
    }
    case 'kid': if (host && from && Net.phase === 'lobby') netToggleKid(from.side, String(m.id)); return;
    case 'side': if (host && from && Net.phase === 'lobby') netMoveSide(from, m.side); return;
    case 'match': {   // the host's match: who is who and where (guest)
      if (host || Net.phase !== 'lobby' || m.ver !== netVersion()) return;
      if (!Array.isArray(m.roster) || !Net.opts) return;
      Net.roster = m.roster.slice(0, 2 * 4 + 1).map(r => r && netCleanId(r.id) && {
        id: r.id, side: r.side === 'B' ? 'B' : 'A', human: !!r.human, name: netCleanName(r.name), look: netCleanLook(r.look),
        gun: netCleanGun(r.gun), anchor: typeof r.anchor === 'string' ? r.anchor : null,
      }).filter(Boolean);
      if (!Net.roster.some(r => r.id === Net.me)) return;
      netStartMatch();
      return;
    }
    case 'nope': if (!host) { netClose(); Net.error = NET_ERRORS[m.why] ? m.why : 'net'; renderNetPanel(); } return;
    case 'ready':
      if (!host || !from) return;
      Net.ready.add(from.id);
      if (Net.localReady && netAllReady()) netGo();
      return;
    case 'go': {
      if (host || Net.phase !== 'begin') return;
      Net.starts = {};
      for (const [id, v] of Object.entries(m.starts || {})) { const p = netVec(v); if (p && netCleanId(id)) Net.starts[id] = new THREE.Vector3(...p); }
      netLaunch();
      return;
    }
    case 's': {   // where a guest is (host)
      const e = from && Net.ents.get(from.id), p = netVec(m.p);
      if (!host || !e || !e.remote || !p || Net.phase !== 'play') return;
      if ((m.r | 0) < (e._netResp || 0)) return;   // sent before he heard he was tagged: he is walking home
      e._netT = { x: p[0], y: p[1], z: p[2], yaw: +m.y || 0, c: m.c ? 1 : 0, g: (m.g | 0) === 2 ? 2 : (m.g | 0) === 1 ? 1 : 0 };   // v1.332: g, walking home (2) or in his grace (1)
      return;
    }
    case 'w': {   // where everyone is, from the host's game (guest)
      if (host || Net.phase !== 'play' || !Array.isArray(m.e)) return;
      if (typeof m.rt === 'number' && isFinite(m.rt)) Game.scenario.roundTime = m.rt;   // the host's clock
      let roster = false;
      for (const a of m.e) {
        if (!Array.isArray(a) || a[0] === Net.me) continue;
        const e = Net.ents.get(a[0]), p = netVec(a.slice(1, 4));
        if (!e || !p) continue;
        e._netT = { x: p[0], y: p[1], z: p[2], yaw: +a[4] || 0, c: +a[5] || 0, g: (a[6] | 0) === 2 ? 2 : (a[6] | 0) === 1 ? 1 : 0 };
        const lives = Math.max(0, a[7] | 0);
        if (lives !== e.lives) { if (lives < e.lives) e.hitFlash = 0.6; e.lives = lives; roster = true; }
        const hp = lives > 0 ? (e.maxHealth || 1) : 0;
        if ((e.health > 0) !== (hp > 0)) { e.health = hp; roster = true; }
      }
      if (roster) updateRosterHud();
      return;
    }
    case 'f': {   // a shot: a guest's (host: it flies and can tag, and goes on to the others), or anyone's (guest: it flies)
      if (Net.phase !== 'play') return;
      if (host) { const e = from && Net.ents.get(from.id); if (e && e.remote && netSpawnShot(m, e)) netSendOthers(Object.assign({}, m, { id: from.id }), pid); }
      else { const e = Net.ents.get(m.id); if (e) netSpawnShot(m, e); }
      return;
    }
    case 'tag': {   // the host's game tagged you (guest)
      if (host || Net.phase !== 'play') return;
      const P = Game.player, n = Math.max(0, m.n | 0);
      if (n <= P.hitsTaken) return;
      P.hitsTaken = n;
      if (Game.scenario.stats) Game.scenario.stats.hitOnYou++;
      playHitOnPlayer(); flashDamage();
      Game.scenario.playerRespawns = Math.max(0, (m.r | 0) - 1);
      if (P.hitsTaken < P.maxHits) startPlayerWalkHome(true);   // v1.332 (B.15): on foot (it counts the respawn back up to m.r)
      else netPlayerOut();
      updateHealthHud();
      return;
    }
    case 'ht': {   // your shot tagged someone, in the host's game (guest)
      if (host || Net.phase !== 'play') return;
      const k = Net.ents.get(m.id);
      if (!k) return;
      if (typeof m.l === 'number') { k.lives = Math.max(0, m.l | 0); if (!k.lives) k.health = 0; }
      k.hitFlash = 0.6;
      playHitOnEnemy();
      showHitMarker(k);
      if (Game.scenario.stats) Game.scenario.stats.tags.push({ name: k.name, dist: +m.d || 0, t: Game.scenario.roundTime || 0 });
      updateRosterHud();
      return;
    }
    case 'gone': {   // a friend left the match; his kid plays on in the host's game (guest)
      if (host) return;
      const line = `${netCleanName(m.name).toUpperCase()} LEFT · A KID PLAYS THE SPOT`;
      if (Net.phase === 'play' || Net.phase === 'begin') netHud(line);
      return;
    }
    case 'end': {
      if (Net.phase !== 'play' && Net.phase !== 'begin') return;
      if (host) {   // a guest gave up the match (F): he is gone, and his kid plays on
        if (from) { netDropped(pid); if (Net.tx && Net.tx.drop) Net.tx.drop(pid); }
        return;
      }
      // the host's result is Blue's: Red flips it; the host leaving the match is Red's win and Blue's loss
      const blue = (Net.roster.find(r => r.id === Net.me) || {}).side !== 'B';
      const o = m.o === 'win' ? (blue ? 'win' : 'lose') : m.o === 'lose' ? (blue ? 'lose' : 'win') : (blue ? 'lose' : 'win');
      Net.phase = 'over';
      if (Game.mode === 'scenario') endScenario(o);
      return;
    }
    case 'room': if (!host && Net.phase === 'over') netBackToRoom(); return;   // the host pressed REMATCH
    case 'bye': if (!host) netLost(); return;
  }
}
function netAllReady() {
  return Net.roster.every(r => !r.human || r.id === NET_HOST_ID || Net.ready.has(r.id) || (Net.people.find(p => p.id === r.id) || { gone: true }).gone);
}
// START (host): the roster, each person and kid with his side and his spot. Blue's spots are the map's start (the
// host's) and its allies' anchors; Red's are its other side's. On each side the kids take the first spots (a kid on his
// own spot keeps it, as on the board) and the friends the last ones.
function netStartRoom() {
  if (Net.role !== 'host' || Net.phase !== 'lobby' || !netRoomReady()) return;
  const o = netHostOpts(), m = netMap(), t = SCENARIOS[m.template], pool = pickupPool(m);
  const spots = { A: t.enemySetup.filter(e => e.team === 'player').slice(0, o.size - 1), B: t.enemySetup.filter(e => !e.team).slice(0, o.size) };
  const roster = [];
  for (const side of NET_SIDES) {
    const friends = netOnSide(side).filter(p => p.id !== NET_HOST_ID), sp = spots[side];
    const kidSpots = sp.slice(0, sp.length - friends.length);
    pickupFill(kidSpots, Net.kids[side], pool, side === 'A' ? 'player' : undefined).forEach(e => {
      const s = pickupDayGun(e, o.tod);
      roster.push({ id: s.charId, side, gun: s.weapon, anchor: s.anchor, setup: s });
    });
    friends.forEach((p, i) => roster.push({ id: p.id, side, human: true, name: p.name, look: p.look, gun: p.gun, anchor: sp[sp.length - friends.length + i].anchor }));
  }
  const me = Net.people.find(p => p.id === NET_HOST_ID);
  roster.push({ id: NET_HOST_ID, side: 'A', human: true, name: netCleanName(Net.name), look: me.look, gun: me.gun,
    anchor: (spots.A[0] || spots.B[0]).anchor });   // the host stands at the map's start; the anchor only places his kid in the other games
  Net.roster = roster;
  Net.people = Net.people.filter(p => !p.gone);
  const wire = roster.map(r => ({ id: r.id, side: r.side, human: !!r.human, name: r.name, look: r.look, gun: r.gun, anchor: r.anchor }));
  netSendOthers({ t: 'match', ver: netVersion(), roster: wire });
  netStartMatch();
}
// Every game builds the same match from the roster, from its own side: its own person is the player, the others
// (people and kids) are kids in the scene, his side's on the player's team. In a guest's game every one of them is
// moved by the host's word; in the host's game the people are, and the kids are its own.
function netBuildMatch() {
  const o = Net.opts;
  const sc = buildPickupScenario({ map: o.map, mode: 'teams', size: o.size, tod: o.tod, lives: o.lives, clock: o.clock, holiday: 'none' });
  const mine = Net.roster.find(r => r.id === Net.me), host = Net.role === 'host';
  const other = Net.roster.filter(r => r.side !== mine.side && r.human).map(r => r.name);
  const mates = Net.roster.filter(r => r.side === mine.side && r.human && r.id !== Net.me).map(r => r.name);
  sc.enemySetup = Net.roster.filter(r => r.id !== Net.me).map(r => {
    if (r.human) CHARACTERS[r.id] = Object.assign({}, CHARACTERS.seth, r.look, { name: r.name, flavor: { hit: '', win: '' } });
    const e = host && r.setup ? Object.assign({}, r.setup) : { charId: r.id, weapon: r.gun, anchor: r.anchor };
    if (r.side === mine.side) e.team = 'player'; else delete e.team;
    return e;
  });
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  sc.scenarioName = `Online: ${o.size}v${o.size}`;
  sc.desc = `${NET_SIDE_NAMES[mine.side]} against ${NET_SIDE_NAMES[mine.side === 'A' ? 'B' : 'A']} on ${netMap().name}, ${o.tod === 'night' ? 'after dark' : 'in the afternoon'}` +
    (mates.length ? `, you with ${list(mates)}` : '') + (other.length ? `, against ${list(other)}` : '') + `; kids from the street fill the other spots. ` +
    `${o.lives === 1 ? 'One life' : o.lives + ' lives'} each; a tag sends you back to your start, and with none left you watch till your side is done` +
    (o.clock ? `; more lives left at ${pickupClockText(o.clock)} wins.` : '.') + ' Nothing on the line.';
  sc.rewards = { win: 0, lose: 0 };
  sc.online = true;
  return sc;
}
function netStartMatch() {
  Net.phase = 'matched';
  netResetMatchKeepRoster();
  netBuildMatch();
  if (document.getElementById('modalScreen').classList.contains('active')) closeModal();
  enterScenario('pickup_game');
  if (Game.mode !== 'scenario_intro') { netClose(); return; }
  Net.phase = 'begin';
  const host = Net.role === 'host';
  for (const e of Game.scenario.enemies) {
    const r = Net.roster.find(x => x.id === e.charId);
    if (!r) continue;
    Net.ents.set(r.id, e);
    if (host && !r.human) continue;
    e.remote = true;
    e.mesh.group.visible = false;   // till his game says where he is
    if (r.human) e.lives = Net.opts.lives;
    if (host) e._netPid = (Net.people.find(p => p.id === r.id) || {}).pid;
  }
}
function netResetMatchKeepRoster() {
  const roster = Net.roster;
  netResetMatch();
  Net.roster = roster;
}
// BEGIN on the briefing: the match starts when everyone has pressed it (the host says go)
function netBegin(btn, built, begin) {
  if (Net.localReady) return;
  Net.localReady = true; Net.built = built; Net.begin = begin;
  const waitFor = Net.role === 'host' ? 'YOUR FRIENDS' : (Net.roster.find(r => r.id === NET_HOST_ID) || { name: 'the host' }).name.toUpperCase();
  const others = Net.roster.filter(r => r.human && r.id !== Net.me);
  btn.textContent = `WAITING FOR ${others.length === 1 ? others[0].name.toUpperCase() : waitFor}…`;
  btn.disabled = true;
  if (Net.role === 'guest') netSend({ t: 'ready' });
  else if (netAllReady()) netGo();
}
// Everyone's start: the host's at the map's start, a friend's at his spot (Blue's beside the host, as allies start;
// Red's on his anchor, not in the kids' huddle), each kid where the host's game put him
function netGo() {
  if (Net.phase !== 'begin' || !Net.begin) return;
  const starts = {}, pl = (Net.built && Net.built.placements) || {};
  starts[NET_HOST_ID] = (Net.built && Net.built.spawn) ? Net.built.spawn.clone() : Game.player.pos.clone();
  for (const [id, e] of Net.ents) {
    const r = Net.roster.find(x => x.id === id);
    starts[id] = (r && r.human && e.team !== 'player' && pl[r.anchor]) ? pl[r.anchor].pos.clone() : e.pos.clone();
    if (r && r.human) e._netStartAt = starts[id].clone();
  }
  Net.starts = starts;
  const wire = {};
  for (const [id, v] of Object.entries(starts)) wire[id] = v.toArray().map(netR);
  netSendOthers({ t: 'go', starts: wire });
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
  const P = Game.player, S = Net.starts || {}, host = Net.role === 'host';
  P.maxHits = Net.opts.lives;
  P._netOut = false;
  if (!host && S[Net.me]) {
    P.pos.copy(S[Net.me]);
    P.pos.y = scenarioGroundY(P.pos.x, P.pos.z);   // a start comes on the ground plane
    const mySide = Net.roster.find(r => r.id === Net.me).side;
    const foes = Net.roster.filter(r => r.side !== mySide && S[r.id]).map(r => S[r.id]);
    if (foes.length) {
      const fx = foes.reduce((a, v) => a + v.x, 0) / foes.length, fz = foes.reduce((a, v) => a + v.z, 0) / foes.length;
      P.yaw = Math.atan2(-(fx - P.pos.x), -(fz - P.pos.z));   // facing the other side
    }
    Game.scenario.playerStart = { pos: P.pos.clone(), yaw: P.yaw };
  }
  for (const [id, e] of Net.ents) {
    const r = Net.roster.find(x => x.id === id);
    if (!e.remote) continue;
    const at = host ? e._netStartAt : S[id];
    if (at) { e.pos.copy(at); e._netStart = at.clone(); }
    if (r && r.human) e.lives = Net.opts.lives;
    e.state = 'online';
  }
  Net.phase = 'play';
  Net.sendT = 0;
  updateHealthHud();
  updateRosterHud();
}
// Out of lives online: you stay on the field gun up (nothing tags you, you can't fire) and watch your side play on
function netPlayerOut() {
  const P = Game.player;
  if (P._netOut) return;
  P._netOut = true;
  if (!P._goingHome) startPlayerWalkHome(true);
  if (Net.role === 'host') checkWinCondition();
}
// Once a step in a match: graces run down, and you send where you are (a guest) or where everyone is (the host)
function netStep(dt) {
  if (Net.hudT > 0 && (Net.hudT -= dt) <= 0) netHud('');
  if (Net.phase !== 'play') return;
  const P = Game.player, host = Net.role === 'host';
  for (const e of Net.ents.values()) if (e.remote && e._graceT > 0) e._graceT = Math.max(0, e._graceT - dt);
  if (P._netOut) {   // out: gun up for good, and the panel says why
    P._goingHome = true; P._graceT = 0;
    const txt = document.getElementById('homeText'), arrow = document.getElementById('homeArrow'), hud = document.getElementById('homeHud');
    if (txt && txt.textContent !== 'YOU’RE OUT · YOUR SIDE PLAYS ON') txt.textContent = 'YOU’RE OUT · YOUR SIDE PLAYS ON';
    if (arrow && arrow.style.display !== 'none') arrow.style.display = 'none';
    if (hud && hud.style.display !== 'block') hud.style.display = 'block';
  }
  Net.sendT -= dt;
  if (Net.sendT > 0) return;
  Net.sendT += NET_SEND_SEC[Net.role] || 0.05;
  if (Net.sendT < 0) Net.sendT = 0;
  const g = P._goingHome ? 2 : P._graceT > 0 ? 1 : 0;   // v1.332 (B.15): walking home, or in the grace
  if (!host) {
    netSend({ t: 's', p: [netR(P.pos.x), netR(P.pos.y), netR(P.pos.z)], y: netR(P.yaw), c: P.crouching ? 1 : 0, r: Game.scenario.playerRespawns || 0, g });
    return;
  }
  // the host: [id, x, y, z, yaw (as a camera's), crouch, g, lives] for himself, his friends and every kid
  const e = [[NET_HOST_ID, netR(P.pos.x), netR(P.pos.y), netR(P.pos.z), netR(P.yaw), P.crouching ? 1 : 0, g, Math.max(0, P.maxHits - P.hitsTaken)]];
  for (const [id, k] of Net.ents) {
    if (k.remote) {
      const T = k._netT || { x: k.pos.x, y: k.pos.y, z: k.pos.z, yaw: 0, c: 0, g: 0 };
      e.push([id, netR(T.x), netR(T.y), netR(T.z), netR(T.yaw), T.c, T.g, Math.max(0, k.lives | 0)]);
    } else {
      const out = k.health <= 0 || k.state === 'retreating';
      e.push([id, netR(k.pos.x), netR(k.pos.y), netR(k.pos.z), netR(k.yaw - Math.PI), netR((k.mesh.pose && k.mesh.pose.crouch) || 0),
        out ? 2 : k._graceT > 0 ? 1 : 0, typeof k.lives === 'number' ? Math.max(0, k.lives) : (k.health > 0 ? 1 : 0)]);
    }
  }
  netSend({ t: 'w', rt: netR(Game.scenario.roundTime || 0), e });
}
// A shot as it leaves the gun, sent once: yours (from fireBB), or on the host a kid's (spawnEnemyBB, `k`)
function netShot(bb, k) {
  if (Net.phase !== 'play') return;
  const m = { t: 'f', o: bb.pos.toArray().map(netR), v: bb.vel.toArray().map(netR), cd: bb.curveDir.toArray().map(netR),
    cs: netR(bb.curveStrength), co: netR(bb.curveOnsetDistance) };
  if (Net.role === 'host') { m.id = k ? k.charId : NET_HOST_ID; netSend(m); }
  else if (!k) netSend(m);
}
// Someone else's shot, flying the same way here. On the host it can tag; on a guest only the host's copy counts.
function netSpawnShot(m, k) {
  const o = netVec(m.o), v = netVec(m.v), cd = netVec(m.cd);
  if (!o || !v || !cd || Game.mode !== 'scenario') return false;
  if (Math.hypot(o[0] - k.pos.x, o[2] - k.pos.z) > 4) return false;   // a shot from where he isn't
  if (k.remote && k._netT && k._netT.g === 2) return false;   // v1.332: walking home, his gun is up
  const bb = makeBB(new THREE.Vector3(...o), new THREE.Vector3(...v), 'enemy', k,
    { curveOnsetDistance: +m.co || 4, curveStrengthMax: 0 }, combatantTeam(k));
  bb.curveDir.set(...cd);
  bb.curveStrength = Math.max(0, Math.min(60, +m.cs || 0));
  Game.scenario.bbs.push(bb);
  // v1.332 (backlog B.15, Michael: "I did not hear audio of my brother's shots"): heard from where he is, as a kid's shot
  playShot(o[0], o[2]);
  return true;
}
// The host's game: a BB from a friend's gun tagged `c` (the host, a kid or another friend). His game shows the hit.
function netTaggedBy(bb, c) {
  const shooter = bb.enemyRef, to = shooter && shooter.remote && shooter._netPid;
  if (Net.role !== 'host' || Net.phase !== 'play' || !to) return;
  const from = bb.spawnPos || bb.pos, at = c === Game.player ? Game.player.pos : c.pos;
  const lives = c === Game.player ? Math.max(0, Game.player.maxHits - Game.player.hitsTaken) : (typeof c.lives === 'number' ? Math.max(0, c.lives) : (c.health > 0 ? 1 : 0));
  netSend({ t: 'ht', id: c === Game.player ? NET_HOST_ID : c.charId, d: netR(Math.hypot(at.x - from.x, at.z - from.z)), l: lives }, to);
}
// The host's game tagged a friend's kid: a life gone and he walks back to his start, as you do (v1.221, v1.332)
function netTagRemote(bb, c) {
  if (c._graceT > 0 || (c._netT && c._netT.g > 0) || c.lives <= 0) return true;
  c.lives = Math.max(0, (c.lives | 0) - 1);
  if (bb.owner === 'player' && Game.scenario.stats) noteMatchTag(bb, c);
  if (bb.owner === 'player') showHitMarker(c);   // v1.321 (D.60)
  playHitOnEnemy();
  c.hitFlash = 0.6;
  c._netResp = (c._netResp || 0) + 1;
  if (c.lives > 0) c._graceT = VIP_GRACE;   // till his word that he is walking home comes back
  else c.health = 0;
  if (c._netT) c._netT.g = 2;   // v1.332: no jump to his start; he walks there, gun up
  netSend({ t: 'tag', n: Net.opts.lives - c.lives, r: c._netResp }, c._netPid);
  netTaggedBy(bb, c);
  updateRosterHud();
  if (c.lives <= 0) checkWinCondition();
  return true;
}
// Another player's kid (or, in a guest's game, any kid), moved to where his game says he is, posed as a kid who walks,
// crouches and holds his gun up, or gun up in the air when he is tagged or out
function netDriveRemote(e, dt) {
  const T = e._netT;
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
// From endScenario: the host tells everyone how it ended (Blue's result: each guest's game reads it for his side); a
// guest who leaves (F) tells the host, whose game hands his spot to his kid
function netEnded(outcome) {
  if (Net.phase === 'play' || Net.phase === 'begin') {
    if (Net.role === 'host') netSend({ t: 'end', o: outcome });
    else netSend({ t: 'end', o: 'forfeit' });
  }
  Net.phase = 'over';
  netHud('');
}
function netRestoreBag() { if (Net.bagSaved != null) { Game.persist.bag = Net.bagSaved; Net.bagSaved = null; } }
function netResultCard(outcome) {
  const mySide = (Net.roster && Net.roster.find(r => r.id === Net.me) || { side: 'A' }).side;
  const others = (Net.roster || []).filter(r => r.human && r.side !== mySide).map(r => r.name);
  const who = others.length === 1 ? others[0] : NET_SIDE_NAMES[mySide === 'A' ? 'B' : 'A'];
  document.getElementById('flavorText').textContent = outcome === 'win' ? `You beat ${who}.`
    : outcome === 'forfeit' ? `You left the match.` : `${who} got you this time.`;
  document.getElementById('rewardText').textContent = 'Online match: nothing on the line.';
  document.getElementById('reloadNote').textContent = '';
  for (const id of ['navPrevBtn', 'navNextBtn']) document.getElementById(id).disabled = true;
  // v1.364 (D.67): REMATCH takes the room back to the board, everyone still in it, for the host to start again
  const again = document.getElementById('navAgainBtn');
  if (again.dataset.netLabel == null) again.dataset.netLabel = again.textContent;
  const stays = outcome !== 'forfeit' && Net.active;
  again.textContent = !stays ? 'REMATCH' : Net.role === 'host' ? 'REMATCH' : 'REMATCH: THE HOST’S CALL';
  again.disabled = !(stays && Net.role === 'host');
}
// The result card's REMATCH (98-boot): the host takes everyone back to the room
function netRematch() {
  if (Net.role !== 'host' || Net.phase !== 'over') return;
  netSendOthers({ t: 'room' });
  netBackToRoom();
}
function netBackToRoom() {
  document.getElementById('resultScreen').classList.remove('active');
  cleanupScenarioScene();
  enterBedroom();
  Net.phase = 'lobby';
  netResetMatch();
  netHud('');
  openPickupBoard();
  openNetPanel();
  if (Net.role === 'host') { Net.people = Net.people.filter(p => !p.gone); netRoomChanged(false); }
}
// The link to the host closed (a guest), or the room is given up. In the room the board says so; in a match it ends
// (nothing paid, your bag put back) and you go home.
function netLost() {
  const phase = Net.phase, mode = Game.mode;
  if (phase === 'lobby') { netClose(); Net.error = 'net'; renderNetPanel(); return; }
  if (phase === 'over' || phase === 'idle') {
    netClose();
    const again = document.getElementById('navAgainBtn');
    if (mode === 'result' && again) again.disabled = true;
    return;
  }
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
  showModal('The host left', 'The connection to the host closed, so the match is over. Nothing was lost.');
}
