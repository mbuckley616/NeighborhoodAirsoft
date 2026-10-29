
// ---------------------------------------------------------------------
// REGIONS — neighborhoods, each containing one or more streets/maps
// ---------------------------------------------------------------------
const REGIONS = {
  horseshoe_bend: {
    name: 'Horseshoe Bend',
    streets: { winnmark_ct: "Winnmark Court", wayt_rd: "Wayt Road", willow_bend_cc: 'Willow Bend Country Club' },   // v1.157: + the country club
    // Approximate compass position relative to Mike's house (Sentinel) — used later for the world map
    direction: 'south',
  },
  sentinel: {
    name: 'Sentinel on the River',
    streets: { bunratty_ct: 'Bunratty Court' },
    direction: 'home',
  },
  east_roswell: {
    name: 'East Roswell',
    streets: { ridgestone_ct: 'Ridgestone Court', the_hollow: 'Battleground - Chattahoochee River', riverside_market: 'Riverside Market', hollins_ridge_high: 'Hollins Ridge High', riverside_market_inside: 'Inside Riverside Market' },   // v1.102: + the market lot; v1.155: + the high school; v1.159: + inside the store
    direction: 'east',
  },
  northcliff: {
    name: "Northcliff / Martin's Landing",
    streets: { northcliff_trace: 'Northcliff Trace', stoneglen_close: 'Stoneglen Close', bellfield_ct: 'Bellfield Court', northcliff_pool: 'Northcliff Pool' },   // v1.317: the pool
    direction: 'north',
  },
};

// ---------------------------------------------------------------------
// SCENARIOS — combat encounters. Builder fn refs are resolved at call time
// (so the build functions can be defined later in the file without hoisting headaches).
// ---------------------------------------------------------------------
// Fields:
//   region/street: where on the world map
//   name:          short location label ("Seth's Backyard")
//   scenarioName:  the matchup name ("Just You and Seth")
//   desc:          intro card description
//   enemies:       array of character IDs (resolved against CHARACTERS at build time)
//   builderFn:     function name (looked up via window[name] when scenario starts)
//   rewards:       { win, lose } in dollars (RAW; payouts are scaled by
//                  scaledReward() — see below — so these stay human-readable)
//   playerLives:   how many hits the player can take (default 1 — one hit and
//                  you're out; armor/head protection add bonus hits on top)
//   armorMult:     hit count multiplier for ALL enemies in this scenario (default 1; e.g. 2 = jackets)
// ---------------------------------------------------------------------
// v1.28g: scenario rewards are dialed down 10x and rounded UP to the next whole
// dollar (the raw `rewards` values above were too generous). One helper, used by
// BOTH the payout in endScenario AND the world-map preview, so what the map
// promises is exactly what you get.
function scaledReward(v) { return Math.ceil((v || 0) / 10); }

// ---------------------------------------------------------------------
// v1.39: SCENARIO BRIEFING — a single source of truth for "who's in this
// scenario, what are they carrying, how many lives does everyone have."
// Derived purely from the SCENARIOS data table (NOT the live spawned
// enemies), so it's available BEFORE the scene is built — used by the
// pre-start details popup, the loading screen, and the result modal.
//
// Returns:
//   { player: {lives}, allies: [...combatant], enemies: [...combatant],
//     winCondition, timerSec, scenarioType, ffa, name, scenarioName, desc,
//     timeOfDay }
// where each combatant is { name, charId, gun, lives }.
// ---------------------------------------------------------------------
function describeWinCondition(sc) {
  if (sc.tutorial === 'squad') return 'Run your squad — give an order, use the speed loader, tag all three';   // v1.324 (D.61)
  if (sc.tutorial) return 'Learn the ropes — tag the practice targets';   // v1.57
  if (sc.vip) return 'Tag their VIP, keep yours safe — everyone else comes back';   // v1.170
  if (sc.ctf) return `Carry their flag home to yours — first to ${sc.ctf.toWin || 2}${sc.ctf.clock ? `, or most flags in ${Math.floor(sc.ctf.clock / 60)}:${String(sc.ctf.clock % 60).padStart(2, '0')}` : ''}; everyone comes back`;   // v1.189; v1.191: the clock
  switch (sc.winCondition) {
    case 'survive_timer':    return `Hold out for ${sc.timerSec || 90}s — they respawn, so just survive`;
    case 'survive_untagged': return `Stay untagged for ${sc.timerSec || 90}s`;
    case 'last_team_standing': return (sc.ffa ? 'Last kid standing' : 'Last team standing') +
      (sc.pickup && sc.pickup.clock ? `, or most lives left at ${pickupClockText(sc.pickup.clock)}` : '');   // v1.204
    case 'kill_all':
    default:                 return 'Tag everyone out';
  }
}

// How many lives a given enemySetup entry has, mirroring the spawn-loop logic
// in enterScenario (per-kid `lives` → team-battle/FFA `npcLives` (default 3 for
// team battles) → otherwise a single hit).
function setupEntryLives(sc, es) {
  if (typeof es.lives === 'number') return es.lives;
  const isTeamBattle = (sc.winCondition === 'last_team_standing') && !sc.ffa;
  const ffaWithLives = sc.ffa && (typeof sc.npcLives === 'number');
  if (isTeamBattle || ffaWithLives) {
    return (typeof sc.npcLives === 'number') ? sc.npcLives : 3;
  }
  return 1;
}

// v1.349 (Found in play, critic v1.337): a briefing's "Four a side" is the match as first written; your crew (v1.274-
// v1.275) changes the sides, so the count is read from the sides as built: "Six a side", or "Six of you against seven"
const SIDE_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function sideCountDesc(scenarioId, desc) {
  if (!desc) return desc;
  const setup = crewSetup(scenarioId) || [];
  const ours = setup.filter(es => es.team === 'player').length + 1, theirs = setup.length - ours + 1;
  const word = n => SIDE_WORDS[n] || String(n);
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
  const says = ours === theirs ? `${word(ours)} a side` : `${word(ours)} of you against ${word(theirs)}`;
  const counted = /\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve) a side\b/;
  if (counted.test(desc)) return desc.replace(counted, cap(says));
  if (/\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve) of you against\b/.test(desc)) return desc;   // written as built already
  return desc + crewChangeLine(scenarioId, setup, says);   // v1.360
}
// v1.360 (Found in play, critic v1.353): a briefing with no count in it still names the sides as first written ("You
// and Sean against the brothers, Ryan and Mitchell") while your crew changes them (3 v 3 with Owen and Priya). When the
// sides as built differ from the written ones, one line after it says who is in and how many: "Today it's three a
// side: Owen is with you, and Priya is with them."
function crewChangeLine(scenarioId, setup, says) {
  const sc = SCENARIOS[scenarioId];
  const written = new Map((sc.enemySetup || []).map(es => [es.charId, es.team === 'player' ? 'ours' : 'theirs']));
  const built = new Map(setup.map(es => [es.charId, es.team === 'player' ? 'ours' : 'theirs']));
  const groups = { withYou: [], withThem: [], toYou: [], toThem: [], out: [] };
  const name = id => (CHARACTERS[id] && CHARACTERS[id].name) || id;
  for (const [id, side] of built) {
    const was = written.get(id);
    if (!was) groups[side === 'ours' ? 'withYou' : 'withThem'].push(name(id));
    else if (was !== side) groups[side === 'ours' ? 'toYou' : 'toThem'].push(name(id));
  }
  for (const id of written.keys()) if (!built.has(id)) groups.out.push(name(id));
  const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
  const is = a => a.length > 1 ? 'are' : 'is';
  const parts = [];
  if (groups.withYou.length) parts.push(`${list(groups.withYou)} ${is(groups.withYou)} with you`);
  if (groups.toYou.length) parts.push(`${list(groups.toYou)} ${is(groups.toYou)} on your side today`);
  if (groups.withThem.length) parts.push(`${list(groups.withThem)} ${is(groups.withThem)} with them`);
  if (groups.toThem.length) parts.push(`${list(groups.toThem)} ${is(groups.toThem)} on their side today`);
  if (groups.out.length) parts.push(`${list(groups.out)} ${groups.out.length > 1 ? 'aren’t' : 'isn’t'} playing`);
  if (!parts.length) return '';
  return ` Today it’s ${says}: ${list(parts)}.`;
}

function getScenarioBriefing(scenarioId) {
  const sc = SCENARIOS[scenarioId];
  if (!sc) return null;
  const allies = [];
  const enemies = [];
  const setup = crewSetup(scenarioId) || [];   // v1.274 (D.28 step 2): your crew's sides
  for (const es of setup) {
    const ch = CHARACTERS[es.charId];
    const combatant = {
      name: ch ? ch.name : es.charId,
      charId: es.charId,
      gun: getGunDisplayName(es.weapon || 'pistol'),
      gunType: es.weapon || 'pistol',
      lives: setupEntryLives(sc, es),
      vip: !!es.vip,   // v1.170
      crew: es.team === 'player' && crewMembers().includes(es.charId),   // v1.274
    };
    if (es.team === 'player') allies.push(combatant);
    else enemies.push(combatant);
  }
  // Legacy scenarios with no enemySetup default to a single pistol enemy.
  if (setup.length === 0) {
    enemies.push({ name: 'Opponent', charId: null, gun: getGunDisplayName('pistol'), gunType: 'pistol', lives: 1 });
  }
  // Player lives: scenario base + worn armor bonus (matches startScenario).
  const baseLives = (typeof sc.playerLives === 'number') ? sc.playerLives : 1;
  let armorBonus = 0;
  try { armorBonus = getArmorBonusHits(); } catch (e) { armorBonus = 0; }
  return {
    player: { lives: baseLives + armorBonus, baseLives, armorBonus, respawns: !!(sc.vip || sc.ctf) },   // v1.170: you come back in VIP; v1.189: and in capture the flag
    allies, enemies,
    winCondition: sc.winCondition || 'kill_all',
    winConditionText: describeWinCondition(sc),
    timerSec: sc.timerSec || null,
    scenarioType: sc.scenarioType || 'skirmish',
    ffa: !!sc.ffa,
    name: sc.name || '',
    scenarioName: sc.scenarioName || '',
    desc: sideCountDesc(scenarioId, sc.desc || ''),   // v1.349: the count a side as built
    timeOfDay: sc.timeOfDay === 'night' ? 'night' : 'day',
    rival: isRivalMatch(scenarioId) ? rivalScore() : null,   // v1.196: Seth's crew, and the summer's score against them
    tutorial: !!sc.tutorial,                                  // v1.200: no crew name over Seth in the tutorial
    // v1.274 (D.28 step 2): a team match takes your crew; who you left out
    crewMatch: crewTeamMatch(scenarioId) && crewMembers().length > 0,
    benched: crewTeamMatch(scenarioId) ? crewMembers().filter(id => crewBench.has(id)).map(id => CHARACTERS[id].name) : [],
  };
}

// Build the inner HTML for a briefing roster (allies + enemies + lives + the
// player's own life count). Shared by the pre-start popup and loading screen.
function renderBriefingRosterHTML(brief, opts) {
  if (!brief) return '';
  const bench = !!(opts && opts.bench && brief.crewMatch);   // v1.274: the pre-match briefing can bench a crew kid
  const youGun = getGunDisplayName(Game.persist.equipped.gun);
  const lifeStr = n => n >= 99 ? 'comes back' : `${n} ${n === 1 ? 'life' : 'lives'}`;   // v1.170: VIP's ∞
  if (opts && opts.lineup) return renderBriefingLineupHTML(brief, bench, lifeStr, youGun);   // v1.298 (D.54)
  const row = (c, side) =>
    `<div class="brief-combatant ${side}">
       <span class="brief-name">${c.name}${c.vip ? ' ★ VIP' : ''}</span>
       <span class="brief-gun">${c.gun}</span>
       <span class="brief-lives">${lifeStr(c.lives)}</span>
       ${bench && c.crew ? `<button class="brief-bench" data-bench="${c.charId}">Bench</button>` : ''}
     </div>`;
  let html = '';
  // YOUR side (you + any allies)
  html += `<div class="brief-section">
    <div class="brief-heading brief-heading-you">${brief.allies.length && !brief.ffa && !brief.tutorial && crewName() ? crewName().toUpperCase() : 'YOUR SIDE'}</div>
    <div class="brief-combatant you">
      <span class="brief-name">You</span>
      <span class="brief-gun">${youGun}</span>
      <span class="brief-lives">${brief.player.respawns ? 'comes back' : lifeStr(brief.player.lives)}${brief.player.armorBonus ? ` <em>(${brief.player.baseLives}+${brief.player.armorBonus} armor)</em>` : ''}</span>
    </div>
    ${brief.allies.map(c => row(c, 'ally')).join('')}
    ${bench ? crewMembers().filter(id => crewBench.has(id)).map(id =>
      `<div class="brief-combatant ally benched"><span class="brief-name">${CHARACTERS[id].name}</span><span class="brief-gun">on the bench</span><span class="brief-lives"></span><button class="brief-bench" data-unbench="${id}">Bring</button></div>`).join('') : ''}
  </div>`;
  // OPPONENTS
  const enemyHeading = brief.ffa ? 'EVERYONE ELSE (FREE-FOR-ALL)'
    : (brief.rival && brief.enemies.length > 1 ? RIVAL_CREW.toUpperCase() : 'OPPONENTS');   // v1.196
  html += `<div class="brief-section">
    <div class="brief-heading brief-heading-enemy">${enemyHeading}</div>
    ${brief.enemies.map(c => row(c, 'enemy')).join('')}
  </div>`;
  // Objective
  html += `<div class="brief-objective"><span class="brief-obj-label">OBJECTIVE</span> ${brief.winConditionText}</div>`;
  if (brief.rival) html += `<div class="brief-objective brief-rival"><span class="brief-obj-label">RIVALS</span> ${RIVAL_CREW}: ${rivalScoreText(brief.rival)}</div>`;   // v1.196
  return html;
}

// v1.298 (backlog D.54, Michael: A, 21 Oct): the map's briefing shows both sides lined up as 3D kids, each in his
// clothes with the gun he will carry (drawn after the HTML is in, by drawBriefingLineup), his name, gun and lives
// under him, and Bench / Bring under your crew kids. Five across a side at most; a bigger side stands in two rows.
function renderBriefingLineupHTML(brief, bench, lifeStr, youGun) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const wearsCrew = (c, side) => side === 'ally' && !c.vip && c.charId !== 'seth' && !brief.tutorial;
  const cell = (c, side, extra) => {
    const lives = extra && extra.benched ? 'on the bench' : c.lives === 'you' ? (brief.player.respawns ? 'comes back' : lifeStr(brief.player.lives)) : lifeStr(c.lives);
    return `<div class="brief-combatant ${side} lu-kid${extra && extra.benched ? ' benched' : ''}" title="${esc(c.name + ' · ' + c.gun + ' · ' + lives)}">
      <canvas class="lu-fig" width="102" height="117" data-kid="${c.charId || ''}" data-gun="${c.gunType || 'pistol'}" data-crew="${wearsCrew(c, side) ? 1 : 0}"${c.lives === 'you' ? ' data-you="1"' : ''}></canvas>
      <span class="brief-name">${c.name}${c.vip ? ' ★ VIP' : ''}</span><span class="brief-gun">${c.gun}</span><span class="brief-lives">${lives}</span>
      ${bench && c.crew ? `<button class="brief-bench" data-bench="${c.charId}">Bench</button>` : ''}${extra && extra.benched ? `<button class="brief-bench" data-unbench="${c.charId}">Bring</button>` : ''}
    </div>`;
  };
  const cols = n => n <= 5 ? n : Math.ceil(n / 2);
  const benched = bench ? crewMembers().filter(id => crewBench.has(id)) : [];
  const yours = [cell({ name: 'You', charId: 'you', gun: youGun, gunType: Game.persist.equipped.gun, lives: 'you' }, 'you')]
    .concat(brief.allies.map(c => cell(c, 'ally')))
    .concat(benched.map(id => cell({ name: CHARACTERS[id].name, charId: id, gun: getGunDisplayName(crewGun(id)), gunType: crewGun(id), lives: 0 }, 'ally', { benched: true })));
  const theirs = brief.enemies.map(c => cell(c, 'enemy'));
  const enemyHeading = brief.ffa ? 'EVERYONE ELSE (FREE-FOR-ALL)'
    : (brief.rival && brief.enemies.length > 1 ? RIVAL_CREW.toUpperCase() : 'OPPONENTS');
  let html = `<div class="brief-lineup">
    <div class="brief-section"><div class="brief-heading brief-heading-you">${brief.allies.length && !brief.ffa && !brief.tutorial && crewName() ? crewName().toUpperCase() : 'YOUR SIDE'}</div>
      <div class="lu-kids" style="--lu-cols:${cols(yours.length)}">${yours.join('')}</div></div>
    <div class="brief-section"><div class="brief-heading brief-heading-enemy">${enemyHeading}</div>
      <div class="lu-kids" style="--lu-cols:${cols(theirs.length)}">${theirs.join('')}</div></div>
  </div>`;
  html += `<div class="brief-objective"><span class="brief-obj-label">OBJECTIVE</span> ${brief.winConditionText}</div>`;
  if (brief.rival) html += `<div class="brief-objective brief-rival"><span class="brief-obj-label">RIVALS</span> ${RIVAL_CREW}: ${rivalScoreText(brief.rival)}</div>`;
  return html;
}
function drawBriefingLineup(root) {
  const cc = crewColor();
  for (const cv of root.querySelectorAll('canvas.lu-fig')) {
    try {
      if (cv.dataset.you) { drawKidPortrait(cv, Game.persist.look, Game.persist.equipped.gun, -0.45, loadoutKidGearKeys()); continue; }
      const ch = CHARACTERS[cv.dataset.kid];
      if (!ch) continue;
      const look = cc != null && cv.dataset.crew === '1' ? Object.assign({}, ch, { crewColor: cc }) : ch;
      drawKidPortrait(cv, look, cv.dataset.gun, cv.closest('.enemy') ? 0.45 : -0.45);
    } catch (e) { console.warn('lineup', e); }
  }
}

const SCENARIOS = {
  // === TUTORIAL (v1.57) — guided first level. Seth coaches from the shoulder
  // (friendly ally, near-passive), and trey/brooke/jamie volunteer as still
  // practice targets (statsOverride makes them effectively never shoot). The
  // Tutorial module (armed by `tutorial: true`) walks the player through move →
  // aim → cock & fire → tag all three → reload, then the kill_all win resolves. ===
  winnmark_tutorial: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Backyard Basics',
    desc: "First day out with the new gun. Seth's set up a few of the kids as targets at the end of the street so you can get a feel for it before any real games. Walk up, learn the gun, and tag the targets — nobody's shooting back. (Much.)",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    tutorial: true,
    // Seth is a friendly coach (ally), the three named kids are still targets.
    // The passive override zeroes aggression/fire so the dummies just stand there.
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol', anchor: 'tut_coach', team: 'player', noFire: true,
        statsOverride: { aggression: 0, fireRate: 0.01, accuracy: 0 } },
      { charId: 'trey',   weapon: 'pistol', anchor: 'tut_dummy_1', role: 'defender', noFire: true,
        statsOverride: { aggression: 0, fireRate: 0.01, accuracy: 0, moveSpeed: 0 } },
      { charId: 'brooke', weapon: 'pistol', anchor: 'tut_dummy_2', role: 'defender', noFire: true,
        statsOverride: { aggression: 0, fireRate: 0.01, accuracy: 0, moveSpeed: 0 } },
      { charId: 'jamie',  weapon: 'pistol', anchor: 'tut_dummy_3', role: 'defender', noFire: true,
        statsOverride: { aggression: 0, fireRate: 0.01, accuracy: 0, moveSpeed: 0 } },
    ],
    winCondition: 'kill_all',
    rewards: { win: 15, lose: 0 },
    playerLives: 5, armorMult: 1,
  },

  // === SKIRMISH — 1v1 Seth on the full Winnmark map ===
  winnmark_seth_house: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: "Seth's House", scenarioName: 'Just You and Seth',
    desc: "Seth's hiding somewhere in his backyard. The trees behind the house go on for a while — be careful, he could circle around.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_house',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'seth', weapon: 'pistol', anchor: 'seth_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 20, lose: 6 },
    playerLives: 1, armorMult: 1,
  },

  // v1.324 (backlog D.61, Michael: C): SQUAD BASICS, the second tutorial, after the first 1v1. Seth and Trey on your
  // side against Brooke, Jamie and Marcus, coached through the squad orders and the speed loader (Tutorial, kind
  // 'squad'); Seth hands you a 25-BB loader the first time. Nobody fires until the third step, and their side goes easy.
  winnmark_squad_basics: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Squad Basics',
    desc: "Seth and Trey are on your side today, against Brooke, Jamie and Marcus. Seth's going to show you how to run a squad: tell your team where to go, and keep a speed loader on you for when the mag runs low. He's even giving you one. They'll go easy on you. (Mostly.)",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    tutorial: 'squad',
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol', anchor: 'house2_backyard', team: 'player' },
      { charId: 'trey',   weapon: 'pistol', anchor: 'house1_backyard', team: 'player' },
      { charId: 'brooke', weapon: 'pistol', anchor: 'house7_backyard', statsOverride: { aggression: 0.2, fireRate: 0.5, accuracy: 0.35 } },
      { charId: 'jamie',  weapon: 'pistol', anchor: 'house6_backyard', statsOverride: { aggression: 0.2, fireRate: 0.5, accuracy: 0.35 } },
      { charId: 'marcus', weapon: 'pistol', anchor: 'trey_backyard',   statsOverride: { aggression: 0.2, fireRate: 0.5, accuracy: 0.35 } },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 15, lose: 5 },
    playerLives: 3, armorMult: 1,
  },

  // === SKIRMISH — 1v1 Seth, shotgun edition (he pushes you) ===
  winnmark_seth_shotgun_duel: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: "Seth's House", scenarioName: 'Seth\'s Got a Shotgun',
    desc: "Seth's been bragging about his new shotgun all week. He's not staying back. Close in fast or keep well back — his pellets spread, and the farther out you are, the fewer of them find you.",   // v1.181: was "past 14m and he can't touch you"; he reaches 20 m and more
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'seth', weapon: 'shotgun', anchor: 'seth_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 22, lose: 7 },
    playerLives: 1, armorMult: 1,
  },

  // === FFA — 5-way free-for-all in the yards (1v1v1v1v1) ===
  winnmark_ffa: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Every Kid for Themselves',
    desc: "Five-way free-for-all round Seth's place. No teams, no friends — everyone's a target, and everyone's shooting at you the second they see you. Keep moving, watch your back, and be the last one standing.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    ffa: true,
    // v1.57: spread to the FOUR CORNERS. The old anchors (house2/trey/brooke/
    // house6 backyards) clustered all four in the middle two-thirds with clear
    // backyard sightlines across the street — they opened fire on each other the
    // instant the round started. Now each kid starts in a different corner pocket,
    // tucked behind its own house with no initial line of sight to the others, so
    // the FFA actually develops instead of resolving in the first three seconds.
    enemySetup: [
      // v1.265: the hidden starts (ffa_1–4, Michael: A); in this order every Pickup Game subset keeps the rule too
      { charId: 'seth',   weapon: 'pistol',  anchor: 'ffa_1' }, // v1.341: the shared wood behind the east lot
      { charId: 'trey',   weapon: 'pistol',  anchor: 'ffa_2' }, // the west lot's wood
      { charId: 'brooke', weapon: 'shotgun', anchor: 'ffa_3' }, // over the creek, the far corner
      { charId: 'jamie',  weapon: 'pistol',  anchor: 'ffa_4' }, // the north lawn
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 45, lose: 10 },
    playerLives: 1, armorMult: 1,
  },

  // === ATTACK — 3v1 cul-de-sac (player attacks, defenders dug in at bulb) ===
  winnmark_cul_de_sac: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Storm the Cul-de-Sac',
    desc: "Seth, Trey, and Brooke have fortified the cul-de-sac. Trey's got the sniper from up on the plank fort — he'll see you coming. Brooke's got the shotgun behind the cars and won't stay there long. Push smart.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'attack',
    playerSpawn: 'road_east',
    enemySpawnCluster: 'cluster_bulb',
    enemySetup: [
      { charId: 'trey',   weapon: 'sniper',  anchor: 'cul_de_sac_plank', role: 'defender' },
      { charId: 'brooke', weapon: 'shotgun', anchor: 'cul_de_sac_car1',  role: 'defender' },
      { charId: 'seth',   weapon: 'pistol',  anchor: 'cul_de_sac_car2',  role: 'defender' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 50, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // === ATTACK — Seth's house with sniper overwatch from Trey ===
  winnmark_sniper_overwatch: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Trey on Overwatch',
    desc: "Seth's set up at his place again, but this time Trey's playing sniper from the front step of the house across the street. You won't get to Seth without crossing Trey's sight line. Use the cars and the trees.",   // v1.341 (D.51, Michael: A): was "from the far end of the street"
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    scenarioType: 'attack',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'seth', weapon: 'pistol', anchor: 'seth_backyard',    role: 'skirmisher' },
      { charId: 'trey', weapon: 'sniper', anchor: 'trey_overwatch',   role: 'defender' },   // v1.341: across the street from Seth's
    ],
    winCondition: 'kill_all',
    rewards: { win: 35, lose: 10 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 2v2 (You + Seth vs Trey + Brooke) ===
  winnmark_team_2v2: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Two on Two',
    desc: "You and Seth team up against Trey and Brooke. Seth'll push with you — call your shots, focus one of them down, and don't let them split you up. Trey and Brooke fight as a pair too, so expect them to gang up.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySpawnCluster: 'cluster_west',   // v1.341: they gather out of sight (the west lot's wood), not on the open street
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol',  anchor: 'house2_backyard', team: 'player' },
      { charId: 'trey',   weapon: 'pistol',  anchor: 'trey_backyard'   },
      { charId: 'brooke', weapon: 'shotgun', anchor: 'house7_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 40, lose: 10 },
    playerLives: 1, armorMult: 1,
  },

  // === DEFEND (timer) — Hold the treehouse, 2 attackers push up the road ===
  winnmark_defend_treehouse: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Defend the Treehouse',
    desc: "You grabbed the plank fort in the woods next door to Seth's first — best spot on Winnmark, and you're not giving it up. Marcus is back from his cousin's and brought Jamie, and they're cutting through Seth's backyard to flush you out. Hold the fort for 90 seconds before their moms call them in.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'treehouse',
    scenarioType: 'defend',
    playerSpawn: 'east_fort',
    enemySpawnCluster: 'cluster_treehouse',
    enemySetup: [
      { charId: 'marcus', weapon: 'shotgun', anchor: 'treehouse_push_e', role: 'attacker' },
      { charId: 'jamie',  weapon: 'pistol',  anchor: 'treehouse_push_w', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 30, lose: 8 },
    playerLives: 1, armorMult: 1,
  },

  // === DEFEND (kill all) — Cul-de-sac fort defense ===
  winnmark_defend_culdesac: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Hold the Fort',
    desc: "You got to the plank fort first. Seth, Trey, and Devon are coming up the road to push you out — and they don't quit. Tag one and he just runs back and comes again. Hold the bulb for 90 seconds. Use the cars and the fort.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'defend',
    playerSpawn: 'bulb_center',
    enemySpawnCluster: 'cluster_road_east',
    enemySetup: [
      { charId: 'seth',  weapon: 'pistol',  anchor: 'road_mid_north', role: 'attacker' },
      { charId: 'trey',  weapon: 'ar',      anchor: 'road_mid_south', role: 'attacker' },
      { charId: 'devon', weapon: 'sniper',  anchor: 'road_east_north', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 55, lose: 14 },
    playerLives: 1, armorMult: 1,
  },

  // === SKIRMISH — 2v1 in the backyards (the missing mid-difficulty step) ===
  // Jamie + Devon roam the yards. Bridges the gap between the 1v1s and the
  // 3v1 storm. Devon plays a slow, lethal sniper from deeper cover; Jamie is
  // an even-tempered pistol skirmisher who keeps the pressure up close.
  winnmark_two_in_the_yards: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Two in the Yards',
    desc: "Jamie and Devon are loose somewhere in the backyards. Devon's got the sniper and he's patient — he'll let Jamie flush you out, then take the shot. Don't get caught in the open between houses.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySpawnCluster: 'cluster_treehouse',   // v1.341: they gather out of sight (the foot of Seth's back yard), not on the open street
    enemySetup: [
      { charId: 'jamie', weapon: 'pistol', anchor: 'house2_backyard', role: 'skirmisher' },
      { charId: 'devon', weapon: 'sniper', anchor: 'brooke_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 30, lose: 8 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 2v3 (You + Seth vs Trey, Brooke, Jamie) ===
  winnmark_team_2v3: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Outnumbered',
    desc: "You and Seth against three of them — Trey, Brooke, and Jamie. They've got the numbers, so they'll try to corner you one at a time. Stick close to Seth, focus-fire whoever's exposed, and even the odds before they collapse on you.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol',  anchor: 'house2_backyard', team: 'player' },
      { charId: 'trey',   weapon: 'pistol',  anchor: 'trey_backyard'   },
      { charId: 'brooke', weapon: 'shotgun', anchor: 'house7_backyard' },
      { charId: 'jamie',  weapon: 'pistol',  anchor: 'house6_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 50, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // === ATTACK — 4v1 capstone, the whole block is out ===
  // Hardest fight in the zone. Devon snipes from the bulb fort, Marcus pushes
  // with the shotgun, Seth and Brooke hold the mid yards with pistols. A real
  // gauntlet from the road entry all the way to the cul-de-sac.
  winnmark_whole_block: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'The Whole Block',
    desc: "Word got around. Seth, Brooke, Marcus, and Devon are all out — Devon on the sniper up at the fort, Marcus charging with the shotgun, Seth and Brooke dug into the yards off the bulb. This is the big one. Take your time and pick them apart.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'attack',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'devon',  weapon: 'sniper',  anchor: 'cul_de_sac_plank', role: 'defender' },
      { charId: 'marcus', weapon: 'shotgun', anchor: 'house4_backyard',   role: 'skirmisher' },
      { charId: 'seth',   weapon: 'pistol',  anchor: 'seth_backyard',     role: 'skirmisher' },
      { charId: 'brooke', weapon: 'pistol',  anchor: 'house7_backyard',   role: 'skirmisher' },   // v1.343: the bulb's south lawn (house2 is your side's spot now)
    ],
    winCondition: 'kill_all',
    rewards: { win: 70, lose: 16 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 3v3 (You + Seth + Trey vs Brooke, Jamie, Marcus) ===
  winnmark_team_3v3: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Squad Up',
    desc: "Full squads — you, Seth, and Trey against Brooke, Jamie, and Marcus. Your team will collapse on whoever's weakest, so will theirs. This is the big one: spread out enough to cover lanes, but tight enough to focus a target down together.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol',  anchor: 'house2_backyard', team: 'player' },
      { charId: 'trey',   weapon: 'pistol',  anchor: 'house1_backyard', team: 'player' },
      { charId: 'brooke', weapon: 'shotgun', anchor: 'house7_backyard' },
      { charId: 'jamie',  weapon: 'pistol',  anchor: 'house6_backyard' },
      { charId: 'marcus', weapon: 'shotgun', anchor: 'trey_backyard'   },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 60, lose: 15 },
    playerLives: 1, armorMult: 1,
  },

  // === DEFEND (timer) — Last stand at the fort, 3 attackers, 120s ===
  // The longest, most frantic defend. You hold the bulb while three kids push
  // up the road. Marcus brings the shotgun in close, Trey lays down AR fire
  // from mid-road, Jamie flanks with the pistol. Survive 120s.
  winnmark_last_stand: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Last Stand at the Fort',
    desc: "You're holding the fort and they want it bad. Marcus is barreling up with the shotgun, Trey's got the AR from mid-road, and Jamie's swinging wide to flank. Two minutes until their moms call them in. Use the cars and don't let them surround you.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'cul_de_sac',
    scenarioType: 'defend',
    playerSpawn: 'bulb_center',
    enemySpawnCluster: 'cluster_road_east',
    enemySetup: [
      { charId: 'marcus', weapon: 'shotgun', anchor: 'road_east_north', role: 'attacker' },
      { charId: 'trey',   weapon: 'ar',      anchor: 'road_mid_south',  role: 'attacker' },
      { charId: 'jamie',  weapon: 'pistol',  anchor: 'road_east_south', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 120,
    rewards: { win: 45, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // =====================================================================
  // BUNRATTY COURT (Sentinel on the River) — v1.18
  // =====================================================================

  // === SKIRMISH — 1v1 Sean, the map intro ===
  // v1.20: Sean always carries his AK-47 in Sentinel scenarios. The auto-rifle
  // changes the encounter character considerably from the original pistol fight —
  // bursts of 5-8 BBs at 600 RPM. Stay in cover during his strings.
  bunratty_sean: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Just You and Sean',
    desc: "First time down Bunratty. Sean's somewhere in the backyards off the lane — the woods are thick down here, so watch the treeline. Heads up: he carries his AK-47 everywhere on this street, so expect bursts. Get in close between his strings; don't try to trade at range.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'sean', weapon: 'ak47', anchor: 'house1_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 24, lose: 7 },
    playerLives: 1, armorMult: 1,
  },

  // === SKIRMISH — 1v1 Nick, the slow tank with an AR ===
  // Plays Nick's identity: low aggression, holds his ground, but the AR gives
  // his patience real reach (18/32m). You can't just wait him out — you have
  // to move and flank, exactly what he taunts you about.
  bunratty_nick: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: "Nick Won't Budge",
    desc: "Nick's posted up in his backyard with the AR and no intention of moving. He won't chase — but that rifle reaches all the way down the lane, so you can't just sit either. Flank him. \"You gotta keep moving, dude.\"",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'nick', weapon: 'ar', anchor: 'house2_backyard', role: 'defender' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 24, lose: 7 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 2v1 (You + Nick vs Sean) ===
  bunratty_team_2v1: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'You and Nick',
    desc: "Nick's on your side this time — two of you against Sean. You've got the numbers, so use them: have Nick pressure Sean from one side while you take the other, and don't let Sean pick you off one at a time. Should be a quick one.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'nick', weapon: 'ar',     anchor: 'house1_backyard', team: 'player' },
      { charId: 'sean', weapon: 'ak47', anchor: 'house2_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 28, lose: 8 },
    playerLives: 1, armorMult: 1,
  },

  // === SKIRMISH — 2v1 the brothers, complementary pair ===
  // Ryan (agg 0.75, fast) flushes you out up close; Mitchell (acc 0.72, patient)
  // holds deeper cover and takes the shot once Ryan moves you. The mid step.
  bunratty_brothers: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'The Brothers',
    desc: "Ryan and Mitchell run this street as a team. Ryan's the one who'll come at you — fast, loud, right up in the yards. Mitchell sits back and waits for his brother to push you into the open. Break them up; don't let Ryan herd you onto Mitchell's line.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'ryan',     weapon: 'pistol', anchor: 'house1_backyard', role: 'skirmisher' },
      { charId: 'mitchell', weapon: 'pistol', anchor: 'house2_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 34, lose: 9 },
    playerLives: 1, armorMult: 1,
  },

  // === ATTACK — 3v1 storm the bulb ===
  // Push the whole wooded lane into a fortified east bulb. Mitchell snipes from
  // the plank fort, Ryan presses with the shotgun behind a car, Nick anchors
  // the second car with the AR. They stage from cluster_bulb.
  bunratty_storm_the_court: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Storm the Court',
    desc: "The whole far end is dug in at the cul-de-sac. Mitchell's got the sniper up on the plank fort and he does not miss. Ryan's behind the cars with the shotgun, itching to rush you. Nick's the wall with the AR. Push the lane smart — use the parked cars and don't get caught in the open coming in.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'attack',
    playerSpawn: 'lane_west',
    enemySpawnCluster: 'cluster_bulb',
    enemySetup: [
      { charId: 'mitchell', weapon: 'sniper',  anchor: 'bulb_plank', role: 'defender' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'bulb_car1',  role: 'defender' },
      { charId: 'nick',     weapon: 'ar',      anchor: 'bulb_car2',  role: 'defender' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 52, lose: 13 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 2v2 (You + Sean vs Ryan + Mitchell) ===
  bunratty_team_2v2: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Sean Has Your Back',
    desc: "You and Sean against the brothers, Ryan and Mitchell. They fight as a pair — Ryan rushes, Mitchell covers — so you and Sean need to do the same. Focus one brother down fast before the other can set up, or they'll trade you out of the fight.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house1_backyard', team: 'player' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'house2_backyard' },
      { charId: 'mitchell', weapon: 'ar',      anchor: 'house5_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 42, lose: 11 },
    playerLives: 1, armorMult: 1,
  },

  // === DEFEND (timer) — Hold the bulb, the brothers + Sean push up the lane ===
  // The Bunratty mirror of Winnmark's treehouse defense. You hold the east
  // bulb; three push from the west entry. Ryan charges shotgun, Mitchell lays
  // down AR from mid-lane, Sean flanks AK-47. Survive 90s.
  bunratty_hold_the_fort: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Hold the Cul-de-Sac',
    desc: "You got to the cul-de-sac fort first and they want it back. Ryan's barreling up the lane with the shotgun, Mitchell's covering him with the AR from the bends, and Sean's swinging wide through the yards with that AK — keep moving, his bursts will tear you up if you sit still. Ninety seconds until somebody's mom calls it. Use the cars and the fort and don't let them surround you.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'defend',
    playerSpawn: 'bulb_center',
    enemySpawnCluster: 'cluster_lane_west',
    enemySetup: [
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'lane_mid_north', role: 'attacker' },
      { charId: 'mitchell', weapon: 'ar',      anchor: 'lane_mid_south', role: 'attacker' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'lane_west_south', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 54, lose: 14 },
    playerLives: 1, armorMult: 1,
  },

  // === DEFEND (timer) — the flanker & Owen, the bounding-overwatch pair (v1.25) ===
  // Showcases the new cover-aware flank AI. The flanker (fast, flanker lane) bounds
  // cover-to-cover up one side while Owen (slow, deadly-accurate anchor) holds
  // the lane and lays down fire. A third pusher keeps the center honest. The
  // point: you can't just watch one lane — the flanker WILL come from your flank.
  // v1.368 (D.58, Michael: retire Priya): Joe is the flanker, and the match is The Pincer (docs/crew_ladder.md's name).
  bunratty_pincer: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'The Pincer',
    desc: "Joe figured out the yards on this street better than anyone — he'll bound cover-to-cover and come at you from the side while Owen pins you down from the lane with that scary-accurate AR. Sean keeps the middle busy. Hold the cul-de-sac for 90 seconds, but DON'T tunnel-vision the road — check your flanks or Joe tags you from the trees.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the cul-de-sac',   // v1.117: the lose line names what was held
    playerSpawn: 'bulb_center',
    enemySpawnCluster: 'cluster_lane_west',
    enemySetup: [
      { charId: 'joe',   weapon: 'ump', anchor: 'lane_west_north', role: 'attacker', flank: 'L' },   // v1.368: was Priya
      { charId: 'sean',  weapon: 'ak47', anchor: 'lane_mid_south', role: 'attacker', flank: 'C' },
      { charId: 'owen',  weapon: 'ar',   anchor: 'lane_west_south', role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 60, lose: 15 },
    playerLives: 1, armorMult: 1,
  },

  // === FFA — 7-way free-for-all (the whole street, no teams) ===
  bunratty_ffa: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Last Kid Standing',
    desc: "The entire Bunratty crew, no teams, everyone against everyone — you plus six others scattered across the street. Seven kids, one winner. Nobody's covering your back and everyone's a threat the instant they spot you. Pick your fights, use the chaos, and outlast all of them.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'ffa_side',   // v1.265: was lane_west
    ffa: true,
    enemySetup: [
      // v1.265: the hidden starts (ffa_1–6, Michael: A); in this order every Pickup Game subset keeps the rule too
      { charId: 'sean',     weapon: 'ak47',    anchor: 'ffa_1' },
      { charId: 'nick',     weapon: 'ar',      anchor: 'ffa_2' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'ffa_3' },
      { charId: 'mitchell', weapon: 'pistol',  anchor: 'ffa_4' },
      // v1.389: Owen and Chris swapped starts. Chris (v1.368, Priya's place) is quicker and pushier than she was: from
      // ffa_5 he marched at Mitchell along a line past your start and tagged you standing there at 6-8 s
      { charId: 'owen',     weapon: 'ar',      anchor: 'ffa_5' },
      { charId: 'chris',    weapon: 'mac10',   anchor: 'ffa_6' },   // v1.368: was Priya
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 70, lose: 15 },
    playerLives: 1, armorMult: 1,
  },

  // === ZOMBIE / TAG (timer survival) — "Infection at the Cul-de-Sac" (v1.25) ===
  // Not literal zombies — it's a neighborhood game of infection tag. 6 kids with
  // NO guns try to TAG you. One touch and you're infected → you lose. You DO have
  // your gun: a hit drops a tagger where they stand, but they get back up after
  // 10 seconds and resume the chase, so shooting only buys time. Most are joggers
  // (about your speed); two are sprinters (faster than your sprint) — those are
  // the ones to watch. Survive 90 seconds without getting tagged.
  bunratty_infection: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Infection at the Cul-de-Sac',
    desc: "New game: infection tag. Six kids, no guns — they just want to TAG you, and one touch means you're it (game over). You've still got your blaster: tag one and they hit the dirt, but they're back up in ten seconds. Most run about your speed; two are FAST, faster than your sprint, so don't get cornered. Keep moving, use the houses and cars to break their line, and survive 90 seconds.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    playerSpawn: 'bulb_center',
    enemySetup: [
      { charId: 'chris',    behavior: 'tagger', anchor: 'lane_west_north', zombieSprinter: true },   // v1.368: was Priya
      { charId: 'ryan',     behavior: 'tagger', anchor: 'house0_backyard', zombieSprinter: true },
      { charId: 'marcus',   behavior: 'tagger', anchor: 'house5_backyard' },
      { charId: 'sean',     behavior: 'tagger', anchor: 'lane_mid_south' },
      { charId: 'nick',     behavior: 'tagger', anchor: 'house2_backyard' },
      { charId: 'mitchell', behavior: 'tagger', anchor: 'house3_backyard' },
    ],
    winCondition: 'survive_untagged',
    timerSec: 90,
    rewards: { win: 75, lose: 18 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 2v4 (You + Sean vs Ryan, Mitchell, Nick, Joe) ===
  bunratty_team_2v4: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Two Against the World',
    desc: "Just you and Sean against four of them — Ryan, Mitchell, Nick, and Joe. This is a real underdog fight. They'll try to swarm you, so stay glued to Sean, never get caught alone, and whittle them down one at a time from cover. Winning this one means something.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house1_backyard', team: 'player' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'house2_backyard' },
      { charId: 'mitchell', weapon: 'ar',      anchor: 'house5_backyard' },
      { charId: 'nick',     weapon: 'ar',      anchor: 'hero_backyard'   },
      { charId: 'joe',      weapon: 'ump',     anchor: 'bulb_plank'      },   // v1.368: was Priya
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 65, lose: 16 },
    playerLives: 1, armorMult: 1,
  },

  // === TEAM — 4v4 (You + Sean + Nick + Ryan vs Mitchell, Chris, Owen, Tyler) ===
  // Tyler's from Winnmark Court one street over — kids cross streets for the big
  // games. He's the 7th NPC that makes a full 4v4 possible on this six-kid block.
  bunratty_team_4v4: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Four on Four',
    desc: "The biggest game on the street: full four-on-four. You, Sean, Nick, and Ryan against Mitchell, Chris, Owen, and Tyler (he came over from Winnmark for this one). Both squads will focus-fire and cover lanes, so this is won by coordination — push together, finish targets together, and don't let your team get picked apart.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house0_backyard', team: 'player' },
      { charId: 'nick',     weapon: 'ar',      anchor: 'house1_backyard', team: 'player' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'house2_backyard', team: 'player' },
      { charId: 'mitchell', weapon: 'ar',      anchor: 'bulb_car1'       },
      { charId: 'chris',    weapon: 'mac10',   anchor: 'bulb_car2'       },   // v1.368: was Priya
      { charId: 'owen',     weapon: 'ar',      anchor: 'house5_backyard' },
      { charId: 'tyler',    weapon: 'shotgun', anchor: 'hero_backyard'   },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 80, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // === RACE — v1.354 (backlog D.71, Michael: A, 23 Oct): the go-cart race down Bunratty's hill ===
  // You coast a homemade cart from up the street past the entry to the bulb, gravity only, while five kids on the front
  // lawns shoot at you. Three lives; a tag costs one and you roll on. Reach the bulb with one left and you win.
  bunratty_go_cart: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Downhill Derby',
    desc: "Ryan built a go-cart out of a plank, a milk crate and four lawnmower wheels, and the whole street wants a shot at you on the way down. No engine: the hill does the work. A and D steer, S drags your feet to brake, W kicks you along when you're crawling. Five kids are posted on the front lawns down the lane. Shoot back if you can, but mostly just keep rolling. Three tags and you're out; make the cul-de-sac with one left.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'race',
    race: true,
    playerSpawn: 'lane_west',
    enemySetup: [
      { charId: 'mitchell', weapon: 'ar',      anchor: 'race_n1', role: 'defender' },
      { charId: 'joe',      weapon: 'ump',     anchor: 'race_s1', role: 'defender' },   // v1.368: was Priya
      { charId: 'owen',     weapon: 'ar',      anchor: 'race_n2', role: 'defender' },
      { charId: 'tyler',    weapon: 'shotgun', anchor: 'race_s2', role: 'defender' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'race_n3', role: 'defender' },
    ],
    winCondition: 'race_finish',
    rewards: { win: 70, lose: 18 },
    playerLives: 3, armorMult: 1,
  },

  // =====================================================================
  // v1.35 — NIGHT scenarios. Same maps, lit by moon + streetlamps, with at
  // least one enemy carrying a flashlight (handled by the night-flashlight
  // pass in enterScenario). Two per map: a skirmish and a team battle.
  // =====================================================================

  // === Winnmark NIGHT — skirmish, Seth + Devon prowling the dark yards ===
  winnmark_night_prowl: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'After Dark',
    desc: "Nobody called the game on account of dark. Seth and Devon are still out there in the yards — and at least one of them's got a flashlight, so watch for the beam swinging across the grass. The streetlamps give you pools of light to fight around, but the gaps between them are black. Use the dark; don't get caught in a beam.",
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySpawnCluster: 'cluster_treehouse',   // v1.341: they gather out of sight (the foot of Seth's back yard), not on the open street
    enemySetup: [
      { charId: 'seth',  weapon: 'pistol', anchor: 'house2_backyard', role: 'skirmisher' },
      { charId: 'devon', weapon: 'sniper', anchor: 'brooke_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 40, lose: 11 },
    playerLives: 1, armorMult: 1,
  },

  // === Winnmark NIGHT — team battle, You + Seth vs Trey + Brooke ===
  winnmark_night_team_2v2: {
    region: 'horseshoe_bend', street: 'winnmark_ct',
    name: 'Winnmark Court', scenarioName: 'Night Game: Two on Two',
    desc: "Two-on-two, but at night. You and Seth against Trey and Brooke, three lives for every kid but you, respawning at their base flags until one side's wiped out. One of them's running a flashlight — it'll give away their push, but it'll also pin you if you're caught in the open. Fight around the lamps and the dark stretches between them.",   // v1.182: promised everyone lives; you have one (playerLives 1)
    builderFn: 'buildWinnmarkCourtScene',
    builderArg: 'seth_yards',   // v1.341 (D.51 step 4): Seth's area
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySpawnCluster: 'cluster_west',   // v1.341: they gather out of sight (the west lot's wood), not on the open street
    enemySetup: [
      { charId: 'seth',   weapon: 'pistol',  anchor: 'house2_backyard', team: 'player' },
      { charId: 'trey',   weapon: 'pistol',  anchor: 'trey_backyard'   },
      { charId: 'brooke', weapon: 'shotgun', anchor: 'house7_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 46, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // === Bunratty NIGHT — skirmish, the brothers running the dark lane ===
  bunratty_night_lane: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Lights Out on the Lane',
    desc: "The wooded lane is pitch black between the streetlamps, and Ryan and Mitchell know it better than you. One of the brothers has a flashlight and they'll use it to flush you — the other waits in the dark for you to break cover. Stay off the lit road when you can; the woods on the shoulders are your friend tonight.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySpawnCluster: 'cluster_bulb_night',   // v1.309: out of the lane's line (see the placement)
    enemySetup: [
      { charId: 'ryan',     weapon: 'pistol', anchor: 'house2_backyard', role: 'skirmisher' },
      { charId: 'mitchell', weapon: 'pistol', anchor: 'house5_backyard', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 42, lose: 11 },
    playerLives: 1, armorMult: 1,
  },

  // === Bunratty NIGHT — team battle, You + Sean vs Ryan + Mitchell ===
  bunratty_night_team_2v2: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Night Game: Sean Has Your Back',
    desc: "You and Sean on the dark lane against Ryan and Seth, who came over from Winnmark with a Spring AR to play for the other side — three lives for every kid but you, respawning at their base until one side's out. They fight as a pair and at least one's got a flashlight; let the beam tell you where they're pushing from. Stick with Sean, use the lamp pools, and finish one before the other can set up.",   // v1.182: promised everyone lives; you have one (playerLives 1). v1.362 (D.28 step 5): Seth in Mitchell's place
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    enemySpawnCluster: 'cluster_bulb_night',   // v1.309: out of the lane's line (see the placement)
    enemySetup: [
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house1_backyard', team: 'player' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'house2_backyard' },
      { charId: 'mitchell', weapon: 'ar',      anchor: 'house5_backyard' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 48, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // THE HOLLOW (East Roswell) — the woods battleground. Big team battles
  // drawn from the whole neighborhood roster. Player fights for TEAM B
  // (south fort, blue) vs TEAM A (north fort, red). 2–3 auto-gunners/side.
  // ===================================================================

  // --- On-ramp: 3v3 skirmish (You + Eric + Rebecca vs Seth + Sean + Ryan) ---
  hollow_skirmish_3v3: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'First Time in the Woods',
    desc: "Everyone hikes out to the spot in the woods east of the river — pallet forts at both ends, a creek down the middle, and barely any sun under the canopy. You're with Eric and Rebecca against Seth's crew. Three a side, five lives for every kid but you, respawning at their fort, so it's a real grind. Work the pallet walls, watch the open lanes, and let Eric rush while you and Rebecca hold an angle.",   // v1.182: promised everyone lives; you have one (playerLives 1)
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      // Your team (south, spawn near you)
      { charId: 'eric',    weapon: 'mp5',    anchor: 'b_left',   team: 'player' },
      { charId: 'rebecca', weapon: 'pistol', anchor: 'b_right',  team: 'player' },
      // Enemy team (north fort)
      { charId: 'seth',    weapon: 'ump',    anchor: 'a_center' },
      { charId: 'sean',    weapon: 'ak47',   anchor: 'a_left'   },
      { charId: 'ryan',    weapon: 'pistol', anchor: 'a_right'  },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 55, lose: 14 },
    playerLives: 1, armorMult: 1,
  },

  // --- Flagship: 5v5 last team standing, 5 lives, multiple auto-gunners ---
  hollow_big_battle: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'The Big Game',
    desc: "The whole neighborhood showed up. Five on five in the woods, five lives for every kid but you, last team standing wins — this is the one everybody talks about. You're on blue with Eric, Rebecca, Sean, and Brooke; red's got Seth, Ryan, Mitchell, Mason, and Devon dug in at the north fort. Three guns on each side are full-auto, so the lanes get hot fast — use the creek and the pallet clusters, push as a team, and don't try to trade in the open. First fort to run out of lives loses.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      // Your team — blue, south fort. Two autos (Eric MP5, Sean AK), Brooke sniper, Rebecca pistol.
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_left',   team: 'player' },
      { charId: 'sean',     weapon: 'ak47',   anchor: 'b_center', team: 'player' },
      { charId: 'brooke',   weapon: 'sniper', anchor: 'b_right',  team: 'player' },
      { charId: 'rebecca',  weapon: 'pistol', anchor: 'b_creek',  team: 'player' },
      // Enemy team — red, north fort. Three autos (Seth UMP, Mitchell AK, Devon MP5).
      { charId: 'seth',     weapon: 'ump',    anchor: 'a_center' },
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_left'   },
      { charId: 'devon',    weapon: 'mp5',    anchor: 'a_right'  },
      { charId: 'mason',    weapon: 'sniper', anchor: 'a_fort'   },
      { charId: 'ryan',     weapon: 'shotgun',anchor: 'a_creek'  },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 95, lose: 22 },
    playerLives: 1, armorMult: 1,
  },

  // --- Night 5v5 — same big battle, after dark under the canopy ---
  hollow_night_battle: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Night Game in the Woods',
    desc: "Same woods, same five-on-five, but now it's pitch dark under the canopy and the whole crew came loaded for night. Red's dug into the north fort and most of them are running lights — flashlight beams swinging through the trees and red laser dots crisscrossing the dark. The beams tell you where they're pushing, but they'll see you too. You've got Eric, Sean, Brooke, and Rebecca on blue. Five lives for every kid but you, last fort standing. Move between the pallet walls, use the dark, and don't silhouette yourself crossing the creek.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_left',   team: 'player' },
      { charId: 'sean',     weapon: 'ak47',   anchor: 'b_center', team: 'player' },
      { charId: 'brooke',   weapon: 'sniper', anchor: 'b_right',  team: 'player' },
      { charId: 'rebecca',  weapon: 'pistol', anchor: 'b_creek',  team: 'player' },
      { charId: 'seth',     weapon: 'ump',    anchor: 'a_center' },
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_left'   },
      { charId: 'devon',    weapon: 'mp5',    anchor: 'a_right'  },
      { charId: 'mason',    weapon: 'sniper', anchor: 'a_fort'   },
      { charId: 'ryan',     weapon: 'shotgun',anchor: 'a_creek'  },
    ],
    enemySpawnCluster: 'cluster_north_night',   // v1.309: out of your start's line (see the placement)
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },

  // --- 2v4 Night Team Deathmatch: You + Sean vs 4 ---
  hollow_2v4_night: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Two of Us, Four of Them (Night)',
    desc: "Just you and Sean out in the dark woods against four of them — Seth, Devon, Ryan, and Mason are dug into the north fort and you're outnumbered two to one. Five lives for every kid but you, respawning at their fort, so it's a long, ugly grind in the dark — and one hit puts you out. They came loaded for night — flashlight beams and red laser dots sweeping the trees; let the lights tell you where they're pushing. Stick tight with Sean, trade smart, and don't get caught in the open.",   // v1.182: promised everyone lives; you have one (playerLives 1)
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'sean',   weapon: 'ak47',    anchor: 'b_center', team: 'player' },
      { charId: 'seth',   weapon: 'ump',     anchor: 'a_center' },
      { charId: 'devon',  weapon: 'mp5',     anchor: 'a_left'   },
      { charId: 'ryan',   weapon: 'pistol',  anchor: 'a_right'  },
      { charId: 'mason',  weapon: 'sniper',  anchor: 'a_fort'   },
    ],
    enemySpawnCluster: 'cluster_north_night',   // v1.309: out of your start's line (see the placement)
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 85, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // --- 5v2 Juggernaut: You + 4 (spring guns) vs 2 AK juggernauts (3 lives each) ---
  hollow_juggernaut: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Juggernauts',
    desc: "Mitchell and Ryan went full juggernaut — each one's carrying a full-auto AK and takes THREE tags to put down for good. It's the five of you against the two of them, but they hit way harder than you do: your whole squad's on spring pistols (grab whatever you like) while they spray. Numbers and angles are your only edge — swarm them from multiple sides, make every shot count, and don't try to trade head-on with an AK. Put three on each and it's over.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      // Your squad — spring weapons, default lives.
      { charId: 'eric',     weapon: 'pistol', anchor: 'b_left',   team: 'player' },
      { charId: 'rebecca',  weapon: 'pistol', anchor: 'b_right',  team: 'player' },
      { charId: 'brooke',   weapon: 'pistol', anchor: 'b_center', team: 'player' },
      { charId: 'sean',     weapon: 'pistol', anchor: 'b_creek',  team: 'player' },
      // The two juggernauts — AK + 3 lives each (per-kid override).
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_center', lives: 3 },
      { charId: 'ryan',     weapon: 'ak47',   anchor: 'a_fort',   lives: 3 },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 1,
    rewards: { win: 90, lose: 22 },
    playerLives: 1, armorMult: 1,
  },

  // --- 10-way FFA, 5 lives each ---
  hollow_ffa: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Ten-Way Free-for-All',
    desc: "Ten kids in the woods, no teams, everyone against everyone — and this one runs long: every other kid has FIVE lives, so you'll be putting some of them down again and again. You get your usual one life (plus whatever your gear gives you), so you can't afford to get reckless. Use the trees and the creek to break lines, never stand still, and outlast all nine of them.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'ffa_west',   // v1.265: was midfield; the kids' hidden starts are ffa_1–9 (Michael: A)
    ffa: true,
    enemySetup: [
      { charId: 'seth',     weapon: 'pistol',  anchor: 'ffa_1' },
      { charId: 'eric',     weapon: 'mp5',     anchor: 'ffa_8' },
      { charId: 'rebecca',  weapon: 'pistol',  anchor: 'ffa_9' },
      { charId: 'devon',    weapon: 'shotgun', anchor: 'ffa_3' },
      { charId: 'mason',    weapon: 'sniper',  anchor: 'ffa_5' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'ffa_2' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'ffa_6' },
      { charId: 'joe',      weapon: 'ump',     anchor: 'ffa_4' },   // v1.368: was Priya
      { charId: 'brooke',   weapon: 'sniper',  anchor: 'ffa_7' },
    ],
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 120, lose: 28 },
    playerLives: 1, armorMult: 1,
  },

  // --- Infection (Night), 9 taggers ---
  hollow_infection_night: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Infection in the Dark',
    desc: "Infection tag, out in the pitch-black woods. Nine kids, no guns — arms stretched out like zombies, hollering 'we're gonna get you!' as they come. One touch and you're it (game over). You've got your blaster: tag one and they drop, but they're back up in ten seconds. Most run about your speed, a couple are FASTER than your sprint, and it's DARK — you'll hear them yelling before you see them. Keep moving, use the trees and the forts to break their line, and survive 90 seconds.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    playerSpawn: 'midfield',
    enemySetup: [
      { charId: 'eric',     behavior: 'tagger', anchor: 'a_fort',    zombieSprinter: true },
      { charId: 'chris',    behavior: 'tagger', anchor: 'b_fort',    zombieSprinter: true },   // v1.368: was Priya
      { charId: 'seth',     behavior: 'tagger', anchor: 'a_left'    },
      { charId: 'rebecca',  behavior: 'tagger', anchor: 'a_right'   },
      { charId: 'sean',     behavior: 'tagger', anchor: 'scatter_nw' },
      { charId: 'ryan',     behavior: 'tagger', anchor: 'scatter_ne' },
      { charId: 'mason',    behavior: 'tagger', anchor: 'scatter_sw' },
      { charId: 'devon',    behavior: 'tagger', anchor: 'scatter_se' },
      { charId: 'brooke',   behavior: 'tagger', anchor: 'b_center'  },
    ],
    winCondition: 'survive_untagged',
    timerSec: 90,
    rewards: { win: 100, lose: 24 },
    playerLives: 1, armorMult: 1,
  },

  // --- 5v5 Full-Auto Mayhem (Night) — EVERY NPC on full auto, 5 lives ---
  hollow_full_auto_mayhem: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Full-Auto Mayhem (Night)',
    desc: "The gloves are off: ten kids in the dark woods and EVERY single one of them is running full-auto — AKs, MP5s, UMPs, MAC-10s, the works. Five on five, five lives for every kid but you, last team standing. The air's going to be solid with BBs, flashlight beams, and red laser dots. You're on blue with Eric, Sean, Brooke, and Rebecca; red's got the whole rest of the crew dug into the north fort. There's no trading at range in this one — pick your moments between the strings, use the trees and the creek, and push as a unit or get shredded.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      // Blue (you) — all auto.
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_left',   team: 'player' },
      { charId: 'sean',     weapon: 'ak47',   anchor: 'b_center', team: 'player' },
      { charId: 'brooke',   weapon: 'ump',    anchor: 'b_right',  team: 'player' },
      { charId: 'rebecca',  weapon: 'mac10',  anchor: 'b_creek',  team: 'player' },
      // Red — all auto.
      { charId: 'seth',     weapon: 'ump',    anchor: 'a_center' },
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_left'   },
      { charId: 'devon',    weapon: 'mp5',    anchor: 'a_right'  },
      { charId: 'mason',    weapon: 'mac10',  anchor: 'a_fort'   },
      { charId: 'ryan',     weapon: 'ak47',   anchor: 'a_creek'  },
    ],
    enemySpawnCluster: 'cluster_north_night',   // v1.309: out of your start's line (see the placement)
    winCondition: 'last_team_standing',
    npcLives: 5,
    rewards: { win: 130, lose: 30 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // THE HOLLOW — ATTACK / DEFEND (fort objectives, v1.43)
  // These use the two pallet forts directly: storm one, or hold one. The
  // forts now have firing windows on all four walls (v1.42), so defenders
  // can hold the front line and attackers have to work the angles.
  // ===================================================================

  // --- ATTACK (day) — Storm the north fort, 5 dug-in defenders ---
  hollow_attack_north_fort: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Storm the North Fort',
    desc: "Seth's whole crew got to the north fort first and dug in — five of them. Mitchell's up on the lookout with the sniper covering the whole approach, and the rest are spread across the front and side windows. You're coming up from the south end alone, so you can't trade in the open — use the pallet clusters and the creek line, peel them off one angle at a time, and clear the fort.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    scenarioType: 'attack',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'mitchell', weapon: 'sniper',  anchor: 'a_fort',   role: 'defender' },
      { charId: 'seth',     weapon: 'ar',       anchor: 'a_center', role: 'defender' },
      { charId: 'ryan',     weapon: 'shotgun',  anchor: 'a_left',   role: 'defender' },
      { charId: 'sean',     weapon: 'ak47',     anchor: 'a_right',  role: 'defender' },
      { charId: 'mason',    weapon: 'mp5',       anchor: 'a_creek',  role: 'defender' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 70, lose: 16 },
    playerLives: 1, armorMult: 1,
  },

  // --- ATTACK (night) — Storm the north fort in the dark, 6 defenders ---
  hollow_attack_north_fort_night: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Night Assault on the Fort',
    desc: "Same north fort, but now it's pitch black under the canopy and the whole crew came loaded for night — six of them dug in. Devon's on the lookout with the sniper running a laser, and five more are spread across the front and side windows with lights sweeping the approach. The beams tell you where they're looking — but they'll see you the second you cross a lane. Work the dark between the clusters, pick them apart, and take the fort.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'attack',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'devon',    weapon: 'sniper',  anchor: 'a_fort',   role: 'defender' },
      { charId: 'seth',     weapon: 'ump',     anchor: 'a_center', role: 'defender' },
      { charId: 'mason',    weapon: 'mp5',     anchor: 'a_left',   role: 'defender' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'a_right',  role: 'defender' },
      { charId: 'mitchell', weapon: 'ak47',    anchor: 'a_creek',  role: 'defender' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'redoubt_e', role: 'defender' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 100, lose: 24 },
    playerLives: 1, armorMult: 1,
  },

  // --- DEFEND (day) — Hold the south fort 90s against 5 attackers ---
  hollow_defend_south_fort: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Hold the South Fort',
    desc: "You claimed the south fort and now Seth's whole crew wants it — five of them pushing up, and they don't quit. Tag one and he has to run all the way back to the north fort before he comes again, so every tag buys you time. Use the firing windows on all four walls, watch the front port and the creek flank at the same time, and hold for 90 seconds before they call it.",
    builderFn: 'buildHollowScene',
    builderArg: 'south_fort_walls',   // v1.345 (B.17, Michael: A): the south fort's blast wall and taller merlons
    seedArg: 'default',               // the woods as before
    scenarioType: 'defend',
    playerSpawn: 'team_b',
    enemySpawnCluster: 'redoubt_e',
    enemyRespawnCluster: 'cluster_north',   // v1.319 (B.13): tagged, they go back to the north fort, 65 m off
    enemySetup: [
      { charId: 'seth',     weapon: 'ar',      anchor: 'b_center', role: 'attacker' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'b_left',   role: 'attacker' },
      { charId: 'devon',    weapon: 'sniper',  anchor: 'b_creek',  role: 'attacker' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'b_right',  role: 'attacker' },
      { charId: 'mitchell', weapon: 'mp5',     anchor: 'redoubt_w', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 70, lose: 16 },
    playerLives: 1, armorMult: 1,
  },

  // --- DEFEND (night) — Hold the south fort against a 6-kid night push ---
  hollow_defend_south_fort_night: {
    region: 'east_roswell', street: 'the_hollow',
    name: 'Chattahoochee River', scenarioName: 'Hold the Fort (Night)',
    desc: "Same fort, pitch dark, and now six of them are coming — most running full-auto with lights and lasers, and they stage close so a tagged kid is back in seconds. They'll rush the front port and flank through the creek at the same time. Pick a wall, use the windows, swing to whichever side lights up, and survive 90 seconds in the dark.",
    builderFn: 'buildHollowScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'defend',
    playerSpawn: 'team_b',
    enemySpawnCluster: 'redoubt_e',
    enemySetup: [
      { charId: 'seth',     weapon: 'ump',     anchor: 'b_center', role: 'attacker' },
      { charId: 'mitchell', weapon: 'ak47',    anchor: 'b_left',   role: 'attacker' },
      { charId: 'mason',    weapon: 'mp5',     anchor: 'b_right',  role: 'attacker' },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'b_creek',  role: 'attacker' },
      { charId: 'devon',    weapon: 'sniper',  anchor: 'redoubt_w', role: 'attacker' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'b_center', role: 'attacker' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // v1.102: RIVERSIDE MARKET LOT (East Roswell) — the parking-lot zone (D.1,
  // Michael: B). Car-to-car team fights across three rows of parked cars.
  // v1.390 (D.51, real scale): the rows run north-south at the doors now, and the briefings say so (the rows, the truck
  // the store side gathers behind, Guadalajara's arches and patio, four lot lights).
  // ===================================================================

  // --- v1.103: the zone's opener, 1v1 with Marcus ---
  lot_1v1_marcus: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'Cart Return',
    desc: "Marcus's mom is inside doing the big shop, which gives you two about forty minutes. He's somewhere up on the walk by the store doors with his pistol; you're out by the road. The rows of parked cars run straight up at the doors, so every aisle is a lane he can see down — cross between the cars, crouch behind a bumper, and let him come to you. One hit each.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'marcus', weapon: 'pistol', anchor: 'a_store', role: 'skirmisher' },   // v1.391: on the walk, 48.5 m from you (the arches were 81 m)
    ],
    winCondition: 'kill_all',
    rewards: { win: 40, lose: 10 },
    playerLives: 1, armorMult: 1,
  },

  // --- On-ramp: 3v3 across the rows ---
  lot_team_3v3: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'Aisle Wars',
    desc: "Saturday morning, and the lot behind Riverside Market is half full. Marcus, Jamie and Tyler set up by the box truck at the store end; you've got Eric and Brooke at the road end. The rows of parked cars run straight up at the doors between you — every car is cover, every aisle is a long open lane. Don't stand in an aisle. Work up a row behind the bumpers, and let Brooke's rifle cover the crossings. Three lives for every kid but you, last team standing.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',   weapon: 'mp5',    anchor: 'b_road_w',  team: 'player' },
      { charId: 'brooke', weapon: 'sniper', anchor: 'b_road_e',  team: 'player' },
      { charId: 'marcus', weapon: 'ak47',   anchor: 'a_store_w' },
      { charId: 'jamie',  weapon: 'ump',    anchor: 'a_store_e' },
      { charId: 'tyler',  weapon: 'shotgun',anchor: 'a_truck'   },
    ],
    enemySpawnCluster: 'cluster_doors',   // v1.391: in front of the west doors (the night matches' huddle hides behind the truck)
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 70, lose: 18 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.103: hold the store front for 90 s against a push from the road ---
  lot_defend_store: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'Hold the Doors',
    desc: "You called the store front, so now you have to keep it. Jamie, Tyler and Owen come up from the road, row by row, and a tagged kid walks back to the road and comes again. The tower, the swings on the walk, the ice cage and the truck are your cover; the ends of the rows are theirs. Watch the aisles that run straight at you, and both ends of the fire lane. Survive 90 seconds.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the doors',   // v1.117: the lose line names what was held
    playerSpawn: 'team_a',
    enemySpawnCluster: 'cluster_south',
    enemySetup: [
      { charId: 'jamie', weapon: 'ump',     anchor: 'b_road_w', role: 'attacker', flank: 'L' },
      { charId: 'tyler', weapon: 'shotgun', anchor: 'b_road',   role: 'attacker', flank: 'C' },
      { charId: 'owen',  weapon: 'ar',      anchor: 'b_road_e', role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 80, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.103: free-for-all across the whole lot ---
  lot_ffa: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'Everybody for Themselves',
    desc: "No teams. Seven kids start hidden over the whole lot, behind a car, on the walk or under Guadalajara's arches, and anyone you see is a target. The aisles are long and open, so whoever crosses one first usually gets tagged. Stay in the rows, let the others find each other, and be the last one standing.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    // v1.134 (Michael: B): seven hidden starts, yours behind a car at the lot's east edge (was mid-lot, with the six
    // kids on the side lines in sight of each other, so 3–4 were out a second after the opening hold)
    playerSpawn: 'ffa_edge',
    ffa: true,
    enemySetup: [
      { charId: 'marcus',  weapon: 'ak47',    anchor: 'ffa_1' },
      { charId: 'jamie',   weapon: 'ump',     anchor: 'ffa_2' },
      { charId: 'tyler',   weapon: 'shotgun', anchor: 'ffa_3' },
      { charId: 'chris',   weapon: 'mac10',   anchor: 'ffa_4' },   // v1.368: was Priya
      { charId: 'owen',    weapon: 'ar',      anchor: 'ffa_5' },
      { charId: 'brooke',  weapon: 'pistol',  anchor: 'ffa_6' },
    ],
    winCondition: 'last_team_standing',
    rewards: { win: 90, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // --- Capstone: 4v4 after closing, under the lot lights ---
  lot_night_4v4: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'After Close',
    desc: "The store's dark, the lot's empty but for the night-shift cars, and the tall lot lights make four bright islands down the rows. Seth's crew holds the store front with Devon on the rifle by the truck; you've got Eric, Sean and Rebecca at the road. Four a side, four lives for every kid but you. Stay out of the lamplight — anyone standing under a lamp is lit up for the whole lot.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_road_w',  team: 'player' },
      { charId: 'sean',     weapon: 'ak47',   anchor: 'b_road_e',  team: 'player' },
      { charId: 'rebecca',  weapon: 'pistol', anchor: 'b_aisle_w', team: 'player' },
      { charId: 'seth',     weapon: 'ump',    anchor: 'a_store'   },
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_store_w' },
      { charId: 'devon',    weapon: 'sniper', anchor: 'a_truck'   },
      { charId: 'mason',    weapon: 'mp5',    anchor: 'a_dumpster'},
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 120, lose: 28 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // v1.130: NORTHCLIFF TRACE (Northcliff / Martin's Landing) — the fifth zone (D.1, Michael: A). Houses on a hill
  // above a creek: uphill yards, downhill yards, a bulb fort at the west end, the twins' fort on the creek bank.
  // ===================================================================

  // --- Opener: 1v1 with Evan down by the creek ---
  northcliff_1v1_evan: {
    region: 'northcliff', street: 'northcliff_trace',
    name: 'Northcliff Trace', scenarioName: 'Down by the Creek',
    desc: "First time up in Northcliff, and Evan says he'll show you how they play it here. The street runs along the side of a hill: the yards on the right climb to the woods, the ones on the left drop away to the creek. He's somewhere in the low yards with a pistol. Bigger yards than you're used to, and longer looks across them — don't cross one standing up. One hit each.",
    builderFn: 'buildNorthcliffScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'evan', weapon: 'pistol', anchor: 'yard_s2', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 50, lose: 12 },
    playerLives: 1, armorMult: 1,
  },

  // --- Capstone (for now): 3v3 against the Stoneglen twins ---
  northcliff_twins_3v3: {
    region: 'northcliff', street: 'northcliff_trace',
    name: 'Northcliff Trace', scenarioName: 'The Stoneglen Twins',
    desc: "Haden and Connor came over from Stoneglen Close with Fernando, and they've taken the bulb at the bottom of the street. Andrew and Alex are with you at the top. Fernando has the rifle and the high yards — he'll be looking down the whole street. The twins don't sit still: when one of them goes, the other comes after you. Three lives for every kid but you, last team standing.",
    builderFn: 'buildNorthcliffScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'andrew',   weapon: 'mp5',    anchor: 'road_e_n',  team: 'player' },
      { charId: 'alex',     weapon: 'ak47',   anchor: 'road_e_s',  team: 'player' },
      { charId: 'haden',    weapon: 'ump',    anchor: 'bulb_car_n' },
      { charId: 'connor',   weapon: 'ump',    anchor: 'bulb_car_s' },
      { charId: 'fernando', weapon: 'sniper', anchor: 'yard_n3', role: 'defender' },   // v1.131: holds the high yard (was: huddled at the bulb and stayed)
    ],
    enemySpawnCluster: 'cluster_bulb',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 130, lose: 30 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.131: defend the twins' creek fort, 90 s ---
  northcliff_defend_creek: {
    region: 'northcliff', street: 'northcliff_trace',
    name: 'Northcliff Trace', scenarioName: 'Hold the Creek Fort',
    desc: "The twins built their fort on the creek bank, and now it's yours to hold. Haden, Connor and Diego come down the hill from the street, yard by yard, and a tagged kid walks back up to the road and comes again. They have the high ground and you have the walls. Watch the yards either side of the fort, not just the slope in front of it. Survive 90 seconds.",
    builderFn: 'buildNorthcliffScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the creek fort',
    playerSpawn: 'creek_fort',
    enemySpawnCluster: 'cluster_road',
    enemySetup: [
      { charId: 'haden',  weapon: 'ump',     anchor: 'road_w',     role: 'attacker', flank: 'L' },
      { charId: 'connor', weapon: 'shotgun', anchor: 'road_mid_n', role: 'attacker', flank: 'C' },
      { charId: 'diego',  weapon: 'mp5',     anchor: 'road_mid_s', role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 90, lose: 22 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.131: the zone capstone, 4v4 at night against Bellfield Court ---
  northcliff_night_4v4: {
    region: 'northcliff', street: 'northcliff_trace',
    name: 'Northcliff Trace', scenarioName: 'Bellfield After Dark',
    // v1.362 (D.28 step 5): Seth in Fernando's place (SETH_ZONE_MATCHES)
    desc: "The Bellfield Court kids walked over after dinner, Mason, Christian and Diego, and Seth came up with them with a burst rifle. They've taken the bulb and the high yard above it. You've got Andrew, Alex and Evan at the top of the street. Four streetlamps, and everything between them is dark. Four a side, four lives for every kid but you. Keep out of the lamplight, and don't stand on the skyline in the high yards.",
    builderFn: 'buildNorthcliffScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'road_east',
    enemySetup: [
      { charId: 'andrew',    weapon: 'mp5',    anchor: 'road_e_n',  team: 'player' },
      { charId: 'alex',      weapon: 'ak47',   anchor: 'road_e_s',  team: 'player' },
      { charId: 'evan',      weapon: 'ump',    anchor: 'yard_n1',   team: 'player' },
      { charId: 'mason',     weapon: 'ak47',   anchor: 'bulb_car_n' },
      { charId: 'christian', weapon: 'shotgun',anchor: 'bulb_car_s' },
      { charId: 'diego',     weapon: 'mp5',    anchor: 'bulb_fort'  },
      { charId: 'fernando',  weapon: 'sniper', anchor: 'yard_n3', role: 'defender' },
    ],
    enemySpawnCluster: 'cluster_bulb',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 150, lose: 34 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.138: the twins' treehouse at Stoneglen Close (D.7, Michael: A) ---
  // v1.316 (D.55 step 6, Michael: A on "The twins' course"): the yard is their course now and the treehouse is gone, so
  // King of the Treehouse is King of the Course: Connor holds the big sandbag bunker where the oak stood. The id stays
  // (saves, the phone's texts and the ladder key off it).
  stoneglen_treehouse: {
    region: 'northcliff', street: 'stoneglen_close',
    name: 'Stoneglen Close', scenarioName: 'King of the Course',
    desc: "The twins built a course in their backyard: plywood walls with firing slots, tyre stacks, a pallet wall, a little plywood tower, and in the middle a big sandbag bunker. Connor has the bunker, and from in there he can see most of the yard. Haden starts at the fort by the west trees and comes looking for you. Work your way up the course from cover to cover and tag them both. One hit each.",
    builderFn: 'buildTwinsCourseScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'behind_shed',   // v1.185: out of Connor's sight (decisions, Michael: A); v1.316: out of the bunker's
    enemySetup: [
      { charId: 'connor', weapon: 'mp5',    anchor: 'bunker', role: 'defender' },
      { charId: 'haden',  weapon: 'pistol', anchor: 'fort', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 70, lose: 16 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.144: hold the treehouse while the twins climb up after you (D.7, Michael: A) ---
  // v1.316 (D.55 step 6, Michael: A): Hold the Bunker. 90 s in the big bunker while the twins come from the house end
  // and Evan shoots from the nest under the road bank. The climbing goes; v1.165's rule (Michael: C) stays in its new
  // form: Evan holds fire until the first twin is close (holdUntilNear).
  stoneglen_hold_treehouse: {
    region: 'northcliff', street: 'stoneglen_close',
    name: 'Stoneglen Close', scenarioName: 'Hold the Bunker',
    desc: "This time the big bunker is yours, and the twins want it back. Haden and Connor come out of the house and up the course at you; a tagged twin walks back to the patio and comes again. Evan is in the sandbag nest under the road bank behind you, and once a twin gets close he shoots at anything showing over the bags. Keep low, watch the way in on the west side, and don't let them in. Survive 90 seconds.",
    builderFn: 'buildTwinsCourseScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the bunker',
    openingHoldSec: 5,   // v1.316: nobody fires for 5 s (2.5 elsewhere): the twins come up the course before they shoot
    playerSpawn: 'bunker',
    enemySpawnCluster: 'cluster_patio',
    enemySetup: [
      { charId: 'haden',  weapon: 'ump',     anchor: 'boxes_w', role: 'attacker', flank: 'L' },
      { charId: 'connor', weapon: 'shotgun', anchor: 'boxes_e', role: 'attacker', flank: 'R' },
      // v1.165 (Michael: C), v1.316: Evan holds fire until a twin is within 7 m of you
      { charId: 'evan',   weapon: 'mp5',     anchor: 'road_bank', role: 'defender', holdUntilNear: 7 },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 80, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // v1.186: BELLFIELD COURT — the Bellfield kids' own cul-de-sac (decisions, Michael: C on the control room, 10 Oct:
  // a small map with a 1v1 and a 3v3). In Northcliff's chain after the treehouse, before the creek-fort defend.
  // ===================================================================

  // --- 1v1 with Mason on his own street ---
  bellfield_1v1_mason: {
    region: 'northcliff', street: 'bellfield_ct',
    name: 'Bellfield Court', scenarioName: "Mason's Court",
    desc: "Bellfield Court is a short dead end: three houses a side, one at the top of the bulb, and a little island with a tree in the middle of it. Mason says it's his street, so you play it his way: one pistol, one hit. He's down by the kid fort at the top of the bulb, and the backyards run behind the houses on both sides, fenced at the back, so he can come round either way. Don't walk down the middle of the road.",
    builderFn: 'buildBellfieldCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'entry',
    enemySetup: [
      { charId: 'mason', weapon: 'pistol', anchor: 'bulb_fort', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 75, lose: 18 },
    playerLives: 1, armorMult: 1,
  },

  // --- 3v3 against the Bellfield kids at home ---
  bellfield_3v3: {
    region: 'northcliff', street: 'bellfield_ct',
    name: 'Bellfield Court', scenarioName: 'Bellfield Bulb',
    desc: "Andrew and Evan came with you to Bellfield Court for a rematch on the Bellfield kids' own street. Christian and Diego are behind the cars at the mouth of the bulb, and Fernando has the fort on the lawn at the top of it. You start at the bottom of the street. The backyards behind both rows are the long way round, behind the fence and out of the street's sight. Three lives for every kid but you, last team standing.",
    builderFn: 'buildBellfieldCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'entry',
    enemySetup: [
      { charId: 'andrew',    weapon: 'mp5',     anchor: 'entry_n',    team: 'player' },
      { charId: 'evan',      weapon: 'ump',     anchor: 'entry_s',    team: 'player' },
      { charId: 'christian', weapon: 'shotgun', anchor: 'bulb_car_s' },
      { charId: 'diego',     weapon: 'mp5',     anchor: 'bulb_car_n' },
      { charId: 'fernando',  weapon: 'ak47',    anchor: 'bulb_fort'  },
    ],
    enemySpawnCluster: 'cluster_bulb',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.187: defend the kid fort at the top of the bulb, 90 s (decisions, "After Bellfield Court", Michael: C) ---
  bellfield_defend_fort: {
    region: 'northcliff', street: 'bellfield_ct',
    name: 'Bellfield Court', scenarioName: 'Hold the Bulb Fort',
    desc: "You got to the Bellfield kids' fort on the lawn at the top of the bulb before they did, and now they want it back. Mason, Christian and Diego come up the street from the bottom, and a tagged kid walks back down to the entry and comes again. The fort's wall faces the street, but its back is open to the head house's lawn, and they will come round the sides of it to get in. Watch the island and the cars at the mouth of the bulb, and look over your shoulder. Survive 90 seconds.",
    builderFn: 'buildBellfieldCourtScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the bulb fort',
    playerSpawn: 'fort',
    enemySpawnCluster: 'cluster_east',
    enemySetup: [
      { charId: 'mason',     weapon: 'mp5',     anchor: 'front_n',    role: 'attacker', flank: 'L' },
      { charId: 'christian', weapon: 'shotgun', anchor: 'front_s',    role: 'attacker', flank: 'C' },
      { charId: 'diego',     weapon: 'ump',     anchor: 'bulb_car_n', role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 85, lose: 20 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.188: a night 4v4 on the Bellfield kids' own street (decisions, "After Bellfield Court", Michael: C) ---
  bellfield_night_4v4: {
    region: 'northcliff', street: 'bellfield_ct',
    name: 'Bellfield Court', scenarioName: 'Lamplight on Bellfield',
    desc: "The twins wanted a rematch on Bellfield's own street, after dark. Haden, Connor and Evan are with you at the bottom of the street. Mason and Christian have the cars at the mouth of the bulb, Diego the island, and Fernando the kid fort at the top of it. No rifle tonight; Fernando says the street's too short for it. Four streetlamps light the street in pools, and everything between them, and the backyards behind both rows, is dark. Four a side, four lives for every kid but you. Don't stand under a lamp.",
    builderFn: 'buildBellfieldCourtScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'entry',
    enemySetup: [
      { charId: 'haden',     weapon: 'ump',     anchor: 'entry_n',      team: 'player' },
      { charId: 'connor',    weapon: 'mp5',     anchor: 'entry_s',      team: 'player' },
      { charId: 'evan',      weapon: 'ak47',    anchor: 'cluster_east', team: 'player' },
      // v1.266 (decisions, "Lamplight on Bellfield: Fernando's AK can reach your start", Michael: A): the four start in
      // the bulb houses' west yards, where the houses hide them from the entry, and walk out to their spots. From the
      // huddle at the bulb's mouth Fernando and Christian had a line down the street, and an AK tagged a player at the
      // entry at 4.6 s; the kid fort's 1.12 m walls hide no standing kid. They come back there when tagged, too.
      { charId: 'mason',     weapon: 'ak47',    anchor: 'bulb_car_n',  spawnAt: [-21, -17] },
      { charId: 'christian', weapon: 'shotgun', anchor: 'bulb_car_s',  spawnAt: [-21, 17] },
      { charId: 'diego',     weapon: 'mp5',     anchor: 'bulb_island', spawnAt: [-24, -20] },
      // v1.188: no rifle. From the fort it fired 0-3 shots a round at night; from the north car it tagged a player
      // standing at the entry 3.08 s after BEGIN in 6 of 8 rounds (the straight street gives it the entry from anywhere).
      // A UMP, not his 3v3 AK (and Evan the AK): the other way round our side lost 47 lives to their 31 in 4 rounds; this way 38 to 33
      { charId: 'fernando',  weapon: 'ump',     anchor: 'bulb_fort',   spawnAt: [-24, 20] },
    ],
    enemySpawnCluster: 'cluster_bulb',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 130, lose: 30 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.189: capture the flag, the second new match type (backlog D.15; decisions "After Bellfield's four", Michael: A).
  // One flag a side at each end of the street: ours by the entry, theirs on the head house's lawn by the fort. Walk onto
  // theirs to pick it up and carry it to ours to score; tagged while carrying, you drop it where you stood, and a kid of
  // its own side who touches it sends it home (so does 20 s on the ground). First to two. Everyone comes back when
  // tagged (99 lives, shown as ∞; you respawn at your start), as in VIP. One kid a side (`ctf: 'run'`) goes for the
  // flag; the rest fight as in a team match, and any kid near a loose flag grabs it or sends it home.
  // v1.191 (decisions "Flags on Bellfield never ends", Michael: C): a 5:00 clock (most flags wins, a tie pays as a loss),
  // and Christian (`ctf: 'push'`) no longer waits by their flag: only Fernando keeps it.
  bellfield_ctf: {
    region: 'northcliff', street: 'bellfield_ct',
    name: 'Bellfield Court', scenarioName: 'Flags on Bellfield',
    desc: "Capture the flag on the Bellfield kids' street. Our blue flag is in the road by the entry; theirs is red, on the head house's lawn by the kid fort at the top of the bulb. Walk onto theirs to grab it and bring it back to ours to score; get tagged with it and you drop it where you stand. Andrew goes for their flag and Evan holds the street with you; Mason runs for ours. Fernando keeps their flag from the fort; Christian comes down the street at you. Everybody comes back when tagged, so trading tags gets you nowhere. First to two flags, or whoever has more when the five minutes are up; a tie counts for nothing.",
    builderFn: 'buildBellfieldCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'entry',
    ctf: { ours: [30.5, 0], theirs: [-23, -3.2], toWin: 2, lanes: [[2, -22], [2, 22]], clock: 300 },   // lanes: the backyards, the way round; v1.191: a 5:00 clock
    enemySetup: [
      { charId: 'andrew',    weapon: 'mp5',     anchor: 'entry_n',    team: 'player', ctf: 'run' },
      { charId: 'evan',      weapon: 'ump',     anchor: 'entry_s',    team: 'player' },
      { charId: 'mason',     weapon: 'mp5',     anchor: 'bulb_car_n', ctf: 'run' },
      { charId: 'christian', weapon: 'shotgun', anchor: 'bulb_car_s', ctf: 'push' },   // v1.191: pushes; Fernando alone keeps the flag
      { charId: 'fernando',  weapon: 'ak47',    anchor: 'bulb_fort'  },
    ],
    enemySpawnCluster: 'cluster_bulb',
    winCondition: 'last_team_standing',
    npcLives: 99,
    rewards: { win: 120, lose: 28 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.317: the Northcliff pool, a 1v1 round the tennis courts (D.55 step 7, Michael: A, after Bellfield) ---
  pool_1v1_christian: {
    region: 'northcliff', street: 'northcliff_pool',
    name: 'Northcliff Pool', scenarioName: 'Round the Courts',
    desc: "The pool is where the whole neighborhood ends up, but at this hour it's just you and Christian. He's out on the far tennis court, and the courts are all fence: three metres of dark chain-link with a gate on the west side, one at each end and one more by the parking. BBs go through the fence, you don't, so pick your gate. You start behind the pump house between the pool and the courts. One pistol each, one hit.",
    builderFn: 'buildNorthcliffPoolScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'pump_house_w',
    enemySetup: [
      { charId: 'christian', weapon: 'pistol', anchor: 'court_b_far', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 80, lose: 18 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.318: the night game at the pool (D.55 step 7, Michael: A) ---
  pool_night_3v3: {
    region: 'northcliff', street: 'northcliff_pool',
    name: 'Northcliff Pool', scenarioName: 'Night Swim',
    desc: "Somebody left the pool lights on, and the whole neighborhood heard about it. The twins are with you at the parking lot; Mason, Christian and Diego came in over the fence by the tennis courts. The pool glows, three lamps light the parking and the courts' far corner, and the rest of the club is dark. The courts' fence stops you but not a BB. Three a side, three lives for every kid but you, last team standing.",
    builderFn: 'buildNorthcliffPoolScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'parking_west',
    enemySetup: [
      { charId: 'haden',     weapon: 'ump',     anchor: 'snack_bar',    team: 'player' },
      { charId: 'connor',    weapon: 'mp5',     anchor: 'parking_e',    team: 'player' },
      { charId: 'mason',     weapon: 'ak47',    anchor: 'court_a_far' },
      { charId: 'christian', weapon: 'shotgun', anchor: 'pump_house' },
      { charId: 'diego',     weapon: 'mp5',     anchor: 'deck_south' },
    ],
    enemySpawnCluster: 'cluster_courts',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // v1.155: HOLLINS RIDGE HIGH (East Roswell) — the sixth zone (D.1, Michael: A, control room 4 Oct). A made-up
  // high school: the brick front and the staff row, six portables, the practice field, the home bleachers.
  // ===================================================================

  // --- Opener: 1v1 with Jordan after school (v1.190: was Tyler, from Wayt Road; the id stays for saves) ---
  school_1v1_tyler: {
    region: 'east_roswell', street: 'hollins_ridge_high',
    name: 'Hollins Ridge High', scenarioName: 'After the Bell',
    desc: "The last bell's gone and the grounds are empty. Jordan says the portables are his: six trailer classrooms in two rows, with gaps between them you can see straight down. You start at the end of the home bleachers. He's in among the portables with his pistol, and he knows every corner. Cross the field and you're in the open the whole way. One hit each.",
    builderFn: 'buildHighSchoolScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'jordan', weapon: 'pistol', anchor: 'a_port_e', role: 'skirmisher' },   // v1.190: was Tyler
    ],
    winCondition: 'kill_all',
    rewards: { win: 55, lose: 13 },
    playerLives: 1, armorMult: 1,
  },

  // --- 3v3: the school's kids at the portables (v1.190: were the Bunratty kids) ---
  school_portables_3v3: {
    region: 'east_roswell', street: 'hollins_ridge_high',
    name: 'Hollins Ridge High', scenarioName: 'The Portables',
    desc: "Caleb, Nathan and Sophie go to Hollins Ridge, and they've taken the school side: the doors, the staff cars and the portables. Eric and Rebecca are with you at the bleachers. The field is wide open apart from the tackling sleds, so go round it: down past the concession stand to the portables, or along the cars. Nathan will sit back and pick; Sophie will come round the side. Three lives for every kid but you, last team standing.",
    builderFn: 'buildHighSchoolScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',     weapon: 'mp5',  anchor: 'b_bleach_w', team: 'player' },
      { charId: 'rebecca',  weapon: 'ak47', anchor: 'b_stand',    team: 'player' },
      { charId: 'caleb',    weapon: 'ump',  anchor: 'a_port_e' },     // v1.190: the school's own kids (were Ryan, Mitchell, Priya)
      { charId: 'nathan',   weapon: 'ak47', anchor: 'a_doors' },
      { charId: 'sophie',   weapon: 'mp5',  anchor: 'a_cars_e' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 140, lose: 32 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.156: hold the portables for 90 s against a push from the field ---
  school_defend_portables: {
    region: 'east_roswell', street: 'hollins_ridge_high',
    name: 'Hollins Ridge High', scenarioName: 'Hold the Portables',
    desc: "Caleb, Malik and Sophie want their portables back, and you're in the lane between the rows. They come across the field from the sleds: one round the north end by the container, one straight at you, one down past the court to the south row. A tagged kid walks back to the field and comes again. Every gap between two portables is a door they can come through, so don't watch just one. Survive 90 seconds.",
    builderFn: 'buildHighSchoolScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the portables',
    playerSpawn: 'portables',
    enemySpawnCluster: 'cluster_field',
    enemySetup: [
      { charId: 'caleb',  weapon: 'ump',     anchor: 'a_container', role: 'attacker', flank: 'L' },   // v1.190: were Marcus, Jamie, Trey
      { charId: 'malik',  weapon: 'shotgun', anchor: 'a_port_e',    role: 'attacker', flank: 'C' },
      { charId: 'sophie', weapon: 'mp5',     anchor: 'b_port_s',    role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 100, lose: 24 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.156: the zone capstone, 4v4 at night ---
  school_night_4v4: {
    region: 'east_roswell', street: 'hollins_ridge_high',
    name: 'Hollins Ridge High', scenarioName: 'Friday Night Lights',
    // v1.362 (D.28 step 5): Seth in Nathan's place (SETH_ZONE_MATCHES)
    desc: "No game tonight, so the field's yours. Caleb and Sophie are back with Seth, who's carrying a P90 now, and they've brought Grant, who's set up with the rifle by the staff cars where he can see the whole field. You've got Eric, Rebecca and Brooke at the bleachers. Four lamps on the grounds and the school's lit windows; the portables are dark. Four a side, four lives for every kid but you. Stay off the field when you can, and out of the lamplight.",
    builderFn: 'buildHighSchoolScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'stand',            // v1.177: behind the concession stand, out of the rifle's line (Owen's then, Grant's since v1.190)
    allyDeploy: true,                // v1.179: Eric, Rebecca and Brooke walk from the stand to their posts
    enemySetup: [
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_bleach_w', team: 'player' },
      { charId: 'rebecca',  weapon: 'ak47',   anchor: 'b_port_s',   team: 'player' },   // v1.179: was b_stand, the start itself
      { charId: 'brooke',   weapon: 'ump',    anchor: 'b_court',    team: 'player' },
      { charId: 'caleb',    weapon: 'ump',    anchor: 'a_port_e' },   // v1.190: the school's own kids (were Ryan, Mitchell, Priya, Owen)
      { charId: 'nathan',   weapon: 'ak47',   anchor: 'a_doors' },
      { charId: 'sophie',   weapon: 'mp5',    anchor: 'a_cars_e' },
      { charId: 'grant',    weapon: 'sniper', anchor: 'a_cars_w', role: 'defender' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 160, lose: 36 },
    playerLives: 1, armorMult: 1,
  },

  // ===================================================================
  // v1.157: WILLOW BEND COUNTRY CLUB (Horseshoe Bend) — the seventh zone (D.1, Michael: A, control room 4 Oct). A
  // made-up club next to Winnmark: the clubhouse and its veranda, the pool, the 18th green, the pond, the cart barn.
  // ===================================================================

  // --- Opener: 1v1 with Brooke at the shut pool ---
  club_1v1_brooke: {
    region: 'horseshoe_bend', street: 'willow_bend_cc',
    name: 'Willow Bend Country Club', scenarioName: "Pool's Closed",
    desc: "The club shut the pool for the season, so Brooke hopped the hedge. She's on the deck with her pistol, among the loungers and umbrellas, and you're down by the halfway hut. You can shoot across the water but you can't walk it, so the pool is a wall with a window in it. Come through a gap in the hedge, or round by the clubhouse. One hit each.",
    builderFn: 'buildCountryClubScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'brooke', weapon: 'pistol', anchor: 'a_pool_n', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 60, lose: 14 },
    playerLives: 1, armorMult: 1,
  },

  // --- 3v3: the Winnmark kids on the 18th ---
  club_eighteenth_3v3: {
    region: 'horseshoe_bend', street: 'willow_bend_cc',
    name: 'Willow Bend Country Club', scenarioName: 'The Eighteenth',
    desc: "Seth, Marcus and Jamie came over the back fence from Winnmark and took the clubhouse: the veranda, the pool and the cart barn. Sean and Trey are with you on the south lawn. The fairway's open apart from the willows and the pond, and the carts are the only cover on the green. Jamie will rush with the shotgun; Marcus likes the carts. Three lives for every kid but you, last team standing.",
    builderFn: 'buildCountryClubScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'sean',   weapon: 'mp5',     anchor: 'b_hut',     team: 'player' },
      { charId: 'trey',   weapon: 'ak47',    anchor: 'b_putt',    team: 'player' },
      { charId: 'seth',   weapon: 'ak47',    anchor: 'a_porch' },
      { charId: 'marcus', weapon: 'ump',     anchor: 'a_barn' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'a_pool_n' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 150, lose: 34 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.364 (backlog D.72, Michael: B, 27 Oct): the ride-along, Eric drives a golf cart round the course, you shoot ---
  // Two laps of the loop up the cart path and round the fairway (the scene's rideLoop) on the cart's back seat while
  // five kids in the bunkers and the trees shoot at you. Three lives; a tag costs one and he drives on (the race's rule).
  club_cart_ride: {
    region: 'horseshoe_bend', street: 'willow_bend_cc',
    name: 'Willow Bend Country Club', scenarioName: 'Cart Path Only',
    desc: "Eric found the key in one of the carts by the barn, and he's driving. You're on the back seat with your gun, facing wherever you like. He takes it up the cart path, along the top of the fairway, down by the east fence and back along the south lawn, twice round, slowing for the corners. Marcus, Jamie, Trey, Brooke and Devon are dug into the bunkers and the trees along the way, and you're the only thing on the course that moves. You can't steer and you can't get off: just shoot. Three tags and you're out; make two laps with one left.",
    builderFn: 'buildCountryClubScene',
    builderArg: 'ride',
    scenarioType: 'race',
    ride: true,
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'marcus', weapon: 'ump',     anchor: 'ride_green_bunker', role: 'defender' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'ride_green',        role: 'defender' },
      { charId: 'trey',   weapon: 'mp5',     anchor: 'ride_fairway',      role: 'defender' },
      { charId: 'brooke', weapon: 'ump',     anchor: 'ride_willow',       role: 'defender' },
      { charId: 'devon',  weapon: 'ar',      anchor: 'ride_barn',         role: 'defender' },
    ],
    winCondition: 'race_finish',
    rewards: { win: 120, lose: 28 },
    playerLives: 3, armorMult: 1,
  },

  // --- v1.158: hold the gazebo for 90 s against a push from the clubhouse lawn ---
  club_defend_gazebo: {
    region: 'horseshoe_bend', street: 'willow_bend_cc',
    name: 'Willow Bend Country Club', scenarioName: 'Hold the Gazebo',
    desc: "Marcus, Jamie and Trey want the gazebo, and you're in it. Its rails come up to your waist on every side but the east, where the steps are. They come down from the clubhouse lawn: one along the pool deck and the stone wall, one straight across the putting green, one round by the pond and the halfway hut. A tagged kid walks back up the lawn and comes again. Crouch and the rails cover you; stand and you can see. Survive 90 seconds.",
    builderFn: 'buildCountryClubScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the gazebo',
    playerSpawn: 'gazebo',
    enemySpawnCluster: 'cluster_course',
    enemySetup: [
      { charId: 'marcus', weapon: 'ump',     anchor: 'b_wall',  role: 'attacker', flank: 'L' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'b_putt',  role: 'attacker', flank: 'C' },
      { charId: 'trey',   weapon: 'mp5',     anchor: 'b_hut',   role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.158: the zone capstone, 4v4 at night ---
  club_night_4v4: {
    region: 'horseshoe_bend', street: 'willow_bend_cc',
    name: 'Willow Bend Country Club', scenarioName: 'Night Swim',
    desc: "The pool lights are on and nobody's swimming. Seth, Marcus and Jamie are back, and they've brought Devon, who's set up with the rifle on the veranda where he can see down the whole lawn. You've got Sean, Trey and Brooke by the halfway hut. The pool glows, so anyone on the deck is lit up; the course is dark past the lamp on the fairway. Four a side, four lives for every kid but you.",
    builderFn: 'buildCountryClubScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'sean',   weapon: 'mp5',     anchor: 'b_hut',     team: 'player' },
      { charId: 'trey',   weapon: 'ak47',    anchor: 'b_putt',    team: 'player' },
      { charId: 'brooke', weapon: 'ump',     anchor: 'b_fairway', team: 'player' },
      { charId: 'seth',   weapon: 'ak47',    anchor: 'a_porch' },
      { charId: 'marcus', weapon: 'ump',     anchor: 'a_barn' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'a_pool_n' },
      { charId: 'devon',  weapon: 'sniper',  anchor: 'a_porch_e', role: 'defender' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 170, lose: 38 },
    playerLives: 1, armorMult: 1,
  },
  // ===================================================================
  // v1.159: INSIDE RIVERSIDE MARKET (East Roswell) — the eighth zone (D.1, Michael: A, control room 5 Oct). The grocery
  // store whose lot is the fourth zone, from the inside: checkouts, five aisles, produce, freezers, the deli, the stockroom.
  // ===================================================================

  // --- Opener: 1v1 with Tyler in the aisles ---
  store_1v1_tyler: {
    region: 'east_roswell', street: 'riverside_market_inside',
    name: 'Inside Riverside Market', scenarioName: 'Cleanup on Aisle Five',
    desc: "Tyler's dad is the night manager, so Tyler gets the store before it opens. He's somewhere in the back by the dairy coolers with his pistol; you came in through the front doors. The shelves are taller than you and stop a BB, so every aisle is a corridor and the only way across is the gap halfway down or the open ends. The freezers and the produce tables are waist high: crouch behind them. One hit each.",
    builderFn: 'buildGroceryStoreScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'tyler', weapon: 'pistol', anchor: 'a_dairy', role: 'skirmisher' },
    ],
    winCondition: 'kill_all',
    rewards: { win: 64, lose: 15 },
    playerLives: 1, armorMult: 1,
  },

  // --- 3v3: the lot kids, checkouts against the stockroom ---
  store_price_check_3v3: {
    region: 'east_roswell', street: 'riverside_market_inside',
    name: 'Inside Riverside Market', scenarioName: 'Price Check',
    desc: "Marcus, Jamie and Tyler came in through the loading dock and hold the stockroom. Eric and Brooke are with you at the checkouts. There are three doorways through the back wall, and five aisles between you and them. Jamie's shotgun is made for an aisle; don't race him down one. The counters, the freezers and the produce are your cover out front; the pallets and the forklift are theirs. Three lives for every kid but you, last team standing.",
    builderFn: 'buildGroceryStoreScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',   weapon: 'mp5',     anchor: 'b_lane_w', team: 'player' },
      { charId: 'brooke', weapon: 'ump',     anchor: 'b_service', team: 'player' },
      { charId: 'marcus', weapon: 'ak47',    anchor: 'a_stock_w' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'a_dairy' },
      { charId: 'tyler',  weapon: 'ump',     anchor: 'a_frozen' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 155, lose: 35 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.160: hold the service desk for 90 s against a push out of the stockroom ---
  store_defend_desk: {
    region: 'east_roswell', street: 'riverside_market_inside',
    name: 'Inside Riverside Market', scenarioName: 'Customer Service',
    desc: "You've got the service desk, the corner behind the counter by the front doors. The counter comes up to your chest on two sides; the way in is along the east wall, past the deli. Marcus, Jamie and Tyler come out of the stockroom: one down the deli wall, one through the freezers, one round by the checkouts. A tagged kid walks back to the stockroom and comes again. Crouch and the counter covers you; stand and you can see over it. Survive 90 seconds.",
    builderFn: 'buildGroceryStoreScene',
    builderArg: 'default',
    scenarioType: 'defend',
    resultHold: 'the service desk',
    playerSpawn: 'desk',
    enemySpawnCluster: 'cluster_north',
    enemySetup: [
      { charId: 'marcus', weapon: 'ump',     anchor: 'b_deli_s',  role: 'attacker', flank: 'L' },
      { charId: 'jamie',  weapon: 'shotgun', anchor: 'b_frozen_s', role: 'attacker', flank: 'C' },
      { charId: 'tyler',  weapon: 'mp5',     anchor: 'b_doors',   role: 'attacker', flank: 'R' },
    ],
    winCondition: 'survive_timer',
    timerSec: 90,
    rewards: { win: 115, lose: 27 },
    playerLives: 1, armorMult: 1,
  },

  // --- v1.160: the zone capstone, 4v4 with the lights off ---
  store_night_4v4: {
    region: 'east_roswell', street: 'riverside_market_inside',
    name: 'Inside Riverside Market', scenarioName: 'Lights Out',
    desc: "The store's shut and the ceiling's dark. The coolers glow down the back aisle, the exit signs are red, and a few night lights hang over the floor; the aisles between them are black. Marcus, Jamie and Tyler are back, and they've brought Devon, who's set up with the rifle in the stockroom's middle doorway, where he can see straight down aisle 3. You've got Eric, Brooke and Rebecca at the checkouts. Four a side, four lives for every kid but you.",
    builderFn: 'buildGroceryStoreScene',
    builderArg: 'default',
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    enemySetup: [
      { charId: 'eric',    weapon: 'mp5',     anchor: 'b_lane_w',  team: 'player' },
      { charId: 'brooke',  weapon: 'ump',     anchor: 'b_service', team: 'player' },
      { charId: 'rebecca', weapon: 'ak47',    anchor: 'b_produce', team: 'player' },
      { charId: 'marcus',  weapon: 'ak47',    anchor: 'a_stock_w' },
      { charId: 'jamie',   weapon: 'shotgun', anchor: 'a_dairy' },
      { charId: 'tyler',   weapon: 'ump',     anchor: 'a_frozen' },
      { charId: 'devon',   weapon: 'sniper',  anchor: 'a_door_c', role: 'defender' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 4,
    rewards: { win: 175, lose: 40 },
    playerLives: 1, armorMult: 1,
  },

  // v1.205 (D.20 step 4, Michael: B on "The last Saturday: where is your street?", his note: "Bunratty Court should be
  // 'my street'"): the summer ends with one big match on your own street, Bunratty Court, on Saturday 30 August. A
  // day 6v6, last team standing, three lives each: your crew from the west entry against Seth's crew in the bulb. It is
  // the fifth card after the store's night match and the last match of the ladder; winning it turns the calendar to
  // the big day and brings a last text.
  last_saturday: {   // v1.275 (D.28 step 3): your crew v Seth and his seven, 6 v 8
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'The Last Saturday',
    desc: "Saturday 30 August, the last Saturday of summer, and it's on your street. Everybody came: your crew is with you at the west end, and Seth's whole crew has the bulb: Seth, Trey, Brooke, Tyler, Evan, Andrew, Garrett and Colin. Six of you against eight, three lives for everybody, last team standing; tagged, you walk back to the west end and go again. School's Tuesday. Make it count.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'default',
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    finale: true,
    // v1.251 (decisions "The Last Saturday: what is a life for you?", Michael: A): your three lives are three tags, each
    // sending you back to the west end with 2 s of cover, as in the Pickup Game; the briefing's promise kept
    tagSendsHome: true,
    enemySetup: [
      { charId: 'eric',     weapon: 'mp5',     anchor: 'lane_west_north', team: 'player' },
      { charId: 'rebecca',  weapon: 'ak47',    anchor: 'lane_west_south', team: 'player' },
      { charId: 'brooke',   weapon: 'shotgun', anchor: 'house0_backyard', team: 'player' },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house3_backyard', team: 'player' },
      { charId: 'trey',     weapon: 'ar',      anchor: 'house1_backyard', team: 'player' },
      { charId: 'seth',     weapon: 'ump',     anchor: 'bulb_car1'       },
      { charId: 'devon',    weapon: 'mp5',     anchor: 'house2_backyard' },
      { charId: 'mitchell', weapon: 'ak47',    anchor: 'bulb_car2'       },
      { charId: 'mason',    weapon: 'mp5',     anchor: 'bulb_plank'      },
      { charId: 'marcus',   weapon: 'ump',     anchor: 'hero_backyard'   },
      { charId: 'ryan',     weapon: 'shotgun', anchor: 'house5_backyard' },
    ],
    winCondition: 'last_team_standing',
    npcLives: 3,
    rewards: { win: 200, lose: 50 },
    playerLives: 3, armorMult: 1,
  },

  // v1.170 (backlog D.15, Michael: A): VIP. Each side guards one kid in a cap: one life, a pistol, holding his spot.
  // Everyone else, you included, comes back when tagged (99 lives, shown as ∞; you respawn at your start). Tag their
  // VIP and you win; lose yours and you lose.
  bunratty_vip: {
    region: 'sentinel', street: 'bunratty_ct',
    name: 'Bunratty Court', scenarioName: 'Protect Ryan',
    desc: "Ryan's wearing the blue cap, so Ryan's the VIP: one tag on him and your side loses. Mitchell's in the red cap down in the bulb, behind the plank. Everyone else — you, Sean and Nick, Joe, Owen and Tyler — runs back and comes again when tagged, as often as it takes. Keep Ryan out of the open and go get Mitchell.",
    builderFn: 'buildBunrattyCourtScene',
    builderArg: 'vip',   // v1.272: the default court plus a 1.5 m plank barricade at their VIP's spot
    seedArg: 'default',  // v1.272: laid out under the default seed, so every prop and tree stays where it was
    scenarioType: 'skirmish',
    playerSpawn: 'lane_west',
    vip: true,
    enemySetup: [
      { charId: 'ryan',     weapon: 'pistol',  anchor: 'house0_backyard', team: 'player', vip: true, role: 'defender', lives: 1 },
      { charId: 'sean',     weapon: 'ak47',    anchor: 'house1_backyard', team: 'player' },
      { charId: 'nick',     weapon: 'ar',      anchor: 'house2_backyard', team: 'player' },
      { charId: 'mitchell', weapon: 'pistol',  anchor: 'bulb_plank', vip: true, role: 'defender', lives: 1 },   // v1.368 (D.58): their VIP, was Priya
      { charId: 'joe',      weapon: 'ar',      anchor: 'house4_backyard' },   // v1.368: not Mitchell's old bulb_car1 (or bulb_car2): from the bulb Joe walked his advance through the fort and through Mitchell
      { charId: 'owen',     weapon: 'ar',      anchor: 'house5_backyard', spawnAt: [37.5, -1.9] },   // v1.178 (D.18, Michael: C): starts and comes back behind the east car, out of Sean's line (the fort's walls are too low to stop it)
      { charId: 'tyler',    weapon: 'shotgun', anchor: 'hero_backyard'   },
    ],
    winCondition: 'last_team_standing',
    npcLives: 99,
    rewards: { win: 90, lose: 22 },
    playerLives: 1, armorMult: 1,
  },

  // v1.170 (D.15): VIP at night in the lot. Seth guards the dumpsters in the red cap; Rebecca is yours, in blue.
  lot_vip_night: {
    region: 'east_roswell', street: 'riverside_market',
    name: 'Riverside Market', scenarioName: 'Night Shift',
    desc: "Same dark lot, new rules. Rebecca's in the blue cap — she's your VIP, one tag and it's over. Seth's in the red cap, back by the dumpsters at the store's west corner. Everybody else comes back as many times as it takes, so trading tags gets you nowhere: get a line on Seth, and keep one on whoever's hunting Rebecca.",
    builderFn: 'buildMarketLotScene',
    builderArg: 'vip_night',   // v1.175 (D.17): the default lot plus a dumpster at Rebecca's spot
    timeOfDay: 'night',
    scenarioType: 'skirmish',
    playerSpawn: 'team_b',
    vip: true,
    enemySetup: [
      { charId: 'rebecca',  weapon: 'pistol', anchor: 'b_road_w',  team: 'player', vip: true, role: 'defender', lives: 1 },
      { charId: 'eric',     weapon: 'mp5',    anchor: 'b_road_e',  team: 'player' },
      { charId: 'sean',     weapon: 'ak47',   anchor: 'b_aisle_w', team: 'player' },
      { charId: 'seth',     weapon: 'pistol', anchor: 'a_dumpster', vip: true, role: 'defender', lives: 1 },
      { charId: 'mitchell', weapon: 'ak47',   anchor: 'a_store'   },
      { charId: 'mason',    weapon: 'mp5',    anchor: 'a_store_w' },
      { charId: 'marcus',   weapon: 'ump',    anchor: 'a_store_e' },
    ],
    enemySpawnCluster: 'cluster_north',
    winCondition: 'last_team_standing',
    npcLives: 99,
    rewards: { win: 110, lose: 26 },
    playerLives: 1, armorMult: 1,
  },
};
