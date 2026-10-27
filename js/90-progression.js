
// Map pin selection
//
// Two pin-click modes supported:
//   1) A single scenario id (legacy)            → big launch button
//   2) A "region key" that maps to multiple     → list of scenario rows
//      scenarios via PIN_SCENARIO_GROUPS below.
//
// To add a new region pin, add an entry here and a `data-scenario="<key>"`
// on the pin div. To add an additional scenario to an existing pin, just
// add its id to the array.
const PIN_SCENARIO_GROUPS = {
  // Winnmark Court — the original slate plus teams/FFA modes (v1.32).
  winnmark_court: [
    'winnmark_tutorial',
    'winnmark_seth_house',
    'winnmark_squad_basics',   // v1.324 (D.61)
    'winnmark_seth_shotgun_duel',
    'winnmark_ffa',
    'winnmark_cul_de_sac',
    'winnmark_sniper_overwatch',
    'winnmark_team_2v2',
    'winnmark_defend_treehouse',
    'winnmark_defend_culdesac',
    'winnmark_two_in_the_yards',
    'winnmark_team_2v3',
    'winnmark_whole_block',
    'winnmark_team_3v3',
    'winnmark_last_stand',
    'winnmark_night_prowl',
    'winnmark_night_team_2v2',
  ],
  // Bunratty Court (Sentinel on the River) — slate plus teams/FFA modes (v1.32).
  bunratty_court: [
    'bunratty_sean',
    'bunratty_nick',
    'bunratty_team_2v1',
    'bunratty_brothers',
    'bunratty_storm_the_court',
    'bunratty_team_2v2',
    'bunratty_hold_the_fort',
    'bunratty_pincer',
    'bunratty_ffa',
    'bunratty_infection',
    'bunratty_team_2v4',
    'bunratty_team_4v4',
    'bunratty_go_cart',          // v1.354: Downhill Derby, the go-cart race (D.71)
    'bunratty_night_lane',
    'bunratty_vip',              // v1.170: VIP (D.15), before the capstone
    'bunratty_night_team_2v2',
  ],
  // The Hollow (East Roswell) — woods battleground, big team battles (v1.36).
  hollow: [
    'hollow_skirmish_3v3',
    'hollow_attack_north_fort',
    'hollow_defend_south_fort',
    'hollow_attack_north_fort_night',
    'hollow_defend_south_fort_night',
    'hollow_big_battle',
    'hollow_night_battle',
    'hollow_2v4_night',
    'hollow_juggernaut',
    'hollow_ffa',
    'hollow_infection_night',
    'hollow_full_auto_mayhem',
  ],
  // v1.102: Riverside Market lot (East Roswell) — the parking-lot zone (D.1).
  market_lot: [
    'lot_1v1_marcus',    // v1.103
    'lot_team_3v3',
    'lot_defend_store',  // v1.103
    'lot_ffa',           // v1.103
    'lot_vip_night',     // v1.170: VIP (D.15), before the capstone
    'lot_night_4v4',
  ],
  // v1.130: Northcliff Trace (Northcliff / Martin's Landing) — the fifth zone (D.1, Michael: A).
  northcliff: [
    'northcliff_1v1_evan',
    'northcliff_twins_3v3',
    'stoneglen_treehouse',       // v1.138: the twins' backyard treehouse (D.7)
    'stoneglen_hold_treehouse',  // v1.144: hold it while they climb (D.7)
    'bellfield_1v1_mason',       // v1.186: Bellfield Court, the Bellfield kids' own street (Michael: C)
    'bellfield_3v3',             // v1.186
    'bellfield_defend_fort',     // v1.187: hold the bulb fort (Michael: C, more Bellfield Court)
    'bellfield_night_4v4',       // v1.188: Lamplight on Bellfield, the street at night
    'bellfield_ctf',             // v1.189: Flags on Bellfield, capture the flag (D.15, Michael: A)
    'pool_1v1_christian',        // v1.317: the Northcliff pool, a 1v1 round the courts (D.55 step 7, Michael: A)
    'pool_night_3v3',            // v1.318: Night Swim, the night game at the pool
    'northcliff_defend_creek',   // v1.131
    'northcliff_night_4v4',      // v1.131: the zone capstone
  ],
  // v1.155: Hollins Ridge High (East Roswell) — the sixth zone (D.1, Michael: A).
  high_school: [
    'school_1v1_tyler',
    'school_portables_3v3',
    'school_defend_portables',   // v1.156
    'school_night_4v4',          // v1.156: the zone capstone
  ],
  // v1.157: Willow Bend Country Club (Horseshoe Bend) — the seventh zone (D.1, Michael: A).
  country_club: [
    'club_1v1_brooke',
    'club_eighteenth_3v3',
    'club_defend_gazebo',    // v1.158
    'club_night_4v4',        // v1.158: the zone capstone
  ],
  // v1.159: Inside Riverside Market (East Roswell) — the eighth zone (D.1, Michael: A).
  grocery_store: [
    'store_1v1_tyler',
    'store_price_check_3v3',
    'store_defend_desk',     // v1.160
    'store_night_4v4',       // v1.160: the store's capstone
    'last_saturday',         // v1.205: the last Saturday on your street, Bunratty Court (D.20 step 4); ends the ladder
  ],
};

// =====================================================================
// v1.48 — ZONE / SCENARIO PROGRESSION
//
// Single source of truth for the campaign ladder. Each zone maps to its
// PIN_SCENARIO_GROUPS key (the ordered scenario list). Progression rules:
//   - Within a zone: strict chain. The Nth scenario unlocks only when the
//     (N-1)th is in Game.persist.completed. The first scenario of zone 1 is
//     always open.
//   - Between zones: a zone unlocks when the PRIOR zone's CAPSTONE (its last
//     listed scenario) is completed. Zone 1 is always unlocked.
//   - The first scenario of zones 2+ additionally requires the prior zone's
//     capstone (it can't be open before its own zone is).
// Northcliff was a ladder node with no scenarios (comingSoon), shown as a locked
// teaser pin; since v1.130 it is a playable zone (Northcliff Trace).
// Everything downstream (pin state, row render, result nav, launch guard)
// reads from these functions — no gating logic is duplicated.
// =====================================================================
const ZONE_LADDER = [
  { key: 'winnmark_court', pin: 'winnmark_court', name: 'Winnmark Court',                 region: 'horseshoe_bend' },
  { key: 'bunratty_court', pin: 'bunratty_court', name: 'Bunratty Court',                 region: 'sentinel' },
  { key: 'hollow',         pin: 'hollow',         name: 'The Hollow · Chattahoochee',     region: 'east_roswell' },
  { key: 'market_lot',     pin: 'market_lot',     name: 'Riverside Market',               region: 'east_roswell' },   // v1.102
  { key: 'northcliff',     pin: 'northcliff',     name: "Northcliff / Martin's Landing",  region: 'northcliff',   // v1.130: playable (Northcliff Trace)
    teaser: "A new neighborhood is opening up north — Northcliff Trace, Stoneglen Close, and Bellfield Court. Bigger yards, longer sightlines, and the toughest kids on the river. Clear the Riverside Market lot to prove you're ready." },
  { key: 'high_school',    pin: 'high_school',    name: 'Hollins Ridge High',             region: 'east_roswell' },   // v1.155
  { key: 'country_club',   pin: 'country_club',   name: 'Willow Bend Country Club',       region: 'horseshoe_bend' },   // v1.157
  { key: 'grocery_store',  pin: 'grocery_store',  name: 'Inside Riverside Market',        region: 'east_roswell' },   // v1.159
];

// Index of a zone in the ladder (by its PIN_SCENARIO_GROUPS key).
function zoneLadderIndex(zoneKey) {
  return ZONE_LADDER.findIndex(z => z.key === zoneKey);
}
// The capstone (last) scenario id of a zone, or null if the zone has none.
function zoneCapstoneId(zoneKey) {
  const ids = PIN_SCENARIO_GROUPS[zoneKey];
  return (ids && ids.length) ? ids[ids.length - 1] : null;
}
// Is a zone unlocked? Zone 0 always; zones 1+ need the prior zone's capstone done.
function isZoneUnlocked(zoneKey) {
  const i = zoneLadderIndex(zoneKey);
  if (i <= 0) return i === 0;            // zone 0 unlocked; unknown key -> locked
  const prevCap = zoneCapstoneId(ZONE_LADDER[i - 1].key);
  return !!(prevCap && Game.persist.completed[prevCap]);
}
// Is a specific scenario unlocked? Needs its zone unlocked AND the prior
// scenario in its own list completed (strict chain). First scenario of a
// zone needs only the zone unlocked.
function isScenarioUnlocked(scenarioId) {
  const ctx = findScenarioListContext(scenarioId);
  if (!ctx) return true;                 // legacy single-pin scenarios: ungated
  // Already cleared it? Always replayable, regardless of chain state.
  if (Game.persist.completed[scenarioId]) return true;
  if (!isZoneUnlocked(ctx.group)) return false;
  if (ctx.idx === 0) return true;        // first in the zone
  const prevId = ctx.ids[ctx.idx - 1];
  return !!Game.persist.completed[prevId];
}
// v1.355 (D.75, the split): moved here from beside scenariosOpenNow, because a classic script cannot read a function
// declared in a later file while it loads. The real unlock rule, kept apart from the tests' isScenarioUnlocked stand-in so "opened" always means opened
const scenarioUnlockedForResult = isScenarioUnlocked;
