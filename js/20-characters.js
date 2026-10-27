
// ---------------------------------------------------------------------
// CHARACTERS — named NPCs in the neighborhood
// ---------------------------------------------------------------------
// Visual fields:
//   height: 'short' | 'average' | 'tall'         (Y scale on mesh)
//   build:  'skinny' | 'average' | 'heavy'        (X/Z scale on mesh)
//   hairStyle: 'short' | 'wavy' | 'curly' | 'long'  (extra mesh shape)
//   hairColor, skinColor, shirtColor, pantsColor: hex
//   glasses: bool (adds dark frame mesh on head)
//
// Combat fields (all 0..1 normalized unless noted):
//   aggression:    0=defensive (stays in cover, slow reposition), 1=rushdown (frequent reposition, shorter hide times)
//   fireRate:      multiplier on time-between-shots. 1.0 = baseline ~1.2-2.7s cycle. 1.5 = 50% faster.
//   accuracy:      0=spray-and-pray, 1=laser-focused. Maps inverse to aim-noise.
//   headshotBias:  0=aims chest, 1=aims head. Most kids 0..0.3; bullies/older kids higher.
//   hp:            integer hit count. Default 1 (kid airsoft rules). Can be raised for armor/jacket scenarios.
//   moveSpeed:     multiplier on baseline 2.5 m/s reposition speed.
//
// Tier note: the bandwidth of variance is intentionally modest — these are kids, not specops.
// Most accuracy values cluster around 0.4-0.7. Outliers go to ~0.85 for "Mike's older brother
// type" feel later. Default headshotBias is low; reserving high values for endgame antagonists.
// ---------------------------------------------------------------------
const CHARACTERS = {
  // === HORSESHOE BEND ===
  // -- Winnmark Court --
  seth: {
    name: 'Seth', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'tall', build: 'skinny', hairStyle: 'wavy', glasses: true,
    hairColor: 0xdcc88a, skinColor: 0xe8c4a0, shirtColor: 0x5a7a4a, pantsColor: 0x4a4438,
    aggression: 0.45, fireRate: 0.95, accuracy: 0.55, headshotBias: 0.15, hp: 1, moveSpeed: 1.0,
    flavor: { hit: 'AH! OKAY OKAY, you got me!', win: 'Seth grins from behind the cardboard. "Wanna run it back?"' },
  },
  trey: {
    name: 'Trey', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'average', build: 'average', hairStyle: 'short', glasses: false,
    hairColor: 0xc9a55a, skinColor: 0xe6c0a0, shirtColor: 0x7a3a3a, pantsColor: 0x3a3a4a,
    aggression: 0.6, fireRate: 1.1, accuracy: 0.55, headshotBias: 0.1, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"DUDE! Ugh, fine."', win: 'Trey laughs — "you walked right into it."' },
  },
  brooke: {
    name: 'Brooke', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'short', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0xe8d090, skinColor: 0xe8c4a0, shirtColor: 0xa84a78, pantsColor: 0x2a3a5a,
    aggression: 0.35, fireRate: 0.9, accuracy: 0.75, headshotBias: 0.2, hp: 1, moveSpeed: 0.95,
    flavor: { hit: '"Got me. Whatever."', win: 'Brooke smirks. "Told you I\'d get you first."' },
  },
  // The new kid on the block — moved in over the summer. Steady, doesn't talk trash.
  jamie: {
    name: 'Jamie', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'average', build: 'average', hairStyle: 'short', glasses: true,
    hairColor: 0x4a2818, skinColor: 0xd8a888, shirtColor: 0x3a5a4a, pantsColor: 0x2a3a4a,
    aggression: 0.4, fireRate: 1.0, accuracy: 0.7, headshotBias: 0.15, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"Nice. Good shot."', win: 'Jamie just shrugs and resets. "Round two?"' },
  },
  // Seth's cousin, visiting for the summer. Loud, aggressive, doesn't know the yards yet.
  marcus: {
    name: 'Marcus', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'tall', build: 'heavy', hairStyle: 'curly', glasses: false,
    hairColor: 0xdcc88a, skinColor: 0xe8c4a0, shirtColor: 0xc44a3a, pantsColor: 0x3a3a3a,
    aggression: 0.75, fireRate: 1.15, accuracy: 0.5, headshotBias: 0.1, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"COME ON. That barely hit me!"', win: 'Marcus pumps his fist. "SETH, did you SEE that?"' },
  },
  // The careful kid — patient, plays sniper a lot, doesn't fall for fakes.
  devon: {
    name: 'Devon', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'tall', build: 'skinny', hairStyle: 'wavy', glasses: false,
    hairColor: 0x2a1810, skinColor: 0xc88860, shirtColor: 0x2a4a5a, pantsColor: 0x3a3a3a,
    aggression: 0.25, fireRate: 0.85, accuracy: 0.85, headshotBias: 0.25, hp: 1, moveSpeed: 0.9,
    flavor: { hit: '"Mm. Well played."', win: 'Devon nods once, slowly. "You moved at the right moment."' },
  },
  // -- Wayt Road --
  tyler: {
    name: 'Tyler', neighborhood: 'horseshoe_bend', street: 'wayt_rd',
    height: 'tall', build: 'skinny', hairStyle: 'short', glasses: false,
    hairColor: 0xd4b870, skinColor: 0xe8c4a0, shirtColor: 0x3a5a7a, pantsColor: 0x5a4a3a,
    aggression: 0.5, fireRate: 1.0, accuracy: 0.6, headshotBias: 0.15, hp: 1, moveSpeed: 1.1,
    flavor: { hit: '"Aight, that was a good one."', win: 'Tyler nods. "Better luck next time."' },
  },
  // v1.273 (D.28 step 1, Michael's design): Garrett, one of Seth's crew. Lived in Seth's neighbourhood; tall, blond,
  // average build; mid- to high-tier guns; balanced aggression.
  garrett: {
    name: 'Garrett', neighborhood: 'horseshoe_bend', street: 'winnmark_ct',
    height: 'tall', build: 'average', hairStyle: 'short', glasses: false,
    hairColor: 0xe2cc8a, skinColor: 0xecc8a4, shirtColor: 0x8a3a3a, pantsColor: 0x3a3a44,
    aggression: 0.55, fireRate: 1.0, accuracy: 0.68, headshotBias: 0.15, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"Huh. Okay. Good shot."', win: 'Garrett shrugs. "Seth said you were good."' },
  },

  // === SENTINEL ON THE RIVER ===
  // -- Bunratty Court --
  sean: {
    name: 'Sean', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'average', build: 'average', hairStyle: 'curly', glasses: false,
    hairColor: 0x5a3a20, skinColor: 0xe6bf95, shirtColor: 0x4a6a4a, pantsColor: 0x3a3a3a,
    aggression: 0.55, fireRate: 1.05, accuracy: 0.6, headshotBias: 0.1, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"Ow! Yeah, that\'s a hit."', win: 'Sean shrugs. "I\'ve been working on my aim."' },
  },
  nick: {
    name: 'Nick', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'tall', build: 'heavy', hairStyle: 'short', glasses: false,
    hairColor: 0x4a2818, skinColor: 0xe0b890, shirtColor: 0x3a3a3a, pantsColor: 0x2a3a4a,
    aggression: 0.3, fireRate: 0.85, accuracy: 0.65, headshotBias: 0.05, hp: 1, moveSpeed: 0.85,
    flavor: { hit: '"Augh. Good shot."', win: 'Nick chuckles. "You gotta keep moving, dude."' },
  },
  // Ryan & Mitchell — brothers. Tall + lean, short brown hair (near-identical
  // visuals, swapped shirt colors per the twins convention). They play as a
  // complementary pair: Ryan is the quick, aggressive flanker who pushes and
  // closes; Mitchell is the steadier, accurate marksman who holds and picks.
  ryan: {
    name: 'Ryan', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'tall', build: 'skinny', hairStyle: 'short', glasses: false,
    hairColor: 0x4a3018, skinColor: 0xe6bf95, shirtColor: 0x3a5a8a, pantsColor: 0x2a2a2a,
    aggression: 0.75, fireRate: 1.1, accuracy: 0.6, headshotBias: 0.1, hp: 1, moveSpeed: 0.9,
    flavor: { hit: '"Hah! Okay, okay — that\'s one."', win: 'Ryan grins at his brother. "Told you I\'d flush him out."' },
  },
  mitchell: {
    name: 'Mitchell', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'tall', build: 'skinny', hairStyle: 'short', glasses: false,
    hairColor: 0x4a3018, skinColor: 0xe6bf95, shirtColor: 0x8a5a2a, pantsColor: 0x2a2a2a,
    aggression: 0.4, fireRate: 0.95, accuracy: 0.72, headshotBias: 0.12, hp: 1, moveSpeed: 0.95,
    flavor: { hit: '"Mm. Nice shot."', win: 'Mitchell lowers his gun, calm. "Patience, man. That\'s the whole game."' },
  },
  // v1.25: two new Bunratty regulars built for the bounding-flank AI.
  // Priya — the cleverest flanker on the street. Low-ish aggression but high
  // map-sense: she bounds cover-to-cover and comes at you from the side. Quick.
  priya: {
    name: 'Priya', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'average', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0x1a1208, skinColor: 0xc18a5c, shirtColor: 0x3a7a6a, pantsColor: 0x2a2a30,
    aggression: 0.6, fireRate: 1.0, accuracy: 0.7, headshotBias: 0.18, hp: 1, moveSpeed: 0.98,
    flavor: { hit: '"Yep — flanked you."', win: 'Priya is already three steps to your left. "You never check your sides."' },
  },
  // Owen — the immovable anchor. Slow, heavy, very accurate; he plants behind
  // the best cover and lays down fire while the others move. The overwatch half
  // of a bounding pair.
  owen: {
    name: 'Owen', neighborhood: 'sentinel', street: 'bunratty_ct',
    height: 'tall', build: 'heavy', hairStyle: 'short', glasses: true,
    hairColor: 0x6a4a28, skinColor: 0xe0b890, shirtColor: 0x4a4a52, pantsColor: 0x2a2a2a,
    aggression: 0.2, fireRate: 0.9, accuracy: 0.82, headshotBias: 0.2, hp: 1, moveSpeed: 0.8,
    flavor: { hit: '"Hm. Good. You moved."', win: 'Owen hasn\'t left his spot the whole match. "I just wait."' },
  },

  // === EAST ROSWELL ===
  // -- Ridgestone Court --
  eric: {
    name: 'Eric', neighborhood: 'east_roswell', street: 'ridgestone_ct',
    height: 'short', build: 'skinny', hairStyle: 'curly', glasses: false,
    hairColor: 0xd4b860, skinColor: 0xe8c4a0, shirtColor: 0x7a6a3a, pantsColor: 0x4a3a2a,
    aggression: 0.5, fireRate: 1.2, accuracy: 0.5, headshotBias: 0.1, hp: 1, moveSpeed: 1.15,
    flavor: { hit: '"FINE. You got lucky."', win: 'Eric is already moving for another shot. "Again?"' },
  },
  rebecca: {
    name: 'Rebecca', neighborhood: 'east_roswell', street: 'ridgestone_ct',
    height: 'short', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0x4a2818, skinColor: 0xe6bf95, shirtColor: 0x6a4a8a, pantsColor: 0x3a3a4a,
    aggression: 0.4, fireRate: 0.95, accuracy: 0.7, headshotBias: 0.25, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"That counts. Reset."', win: 'Rebecca lowers her gun, unbothered. "Predictable."' },
  },

  // === NORTHCLIFF / MARTIN'S LANDING ===
  // -- Northcliff Trace --
  andrew: {
    name: 'Andrew', neighborhood: 'northcliff', street: 'northcliff_trace',
    height: 'tall', build: 'heavy', hairStyle: 'long', glasses: false,
    hairColor: 0x3a2818, skinColor: 0xe0b890, shirtColor: 0x3a4a5a, pantsColor: 0x2a2a3a,
    aggression: 0.75, fireRate: 0.9, accuracy: 0.65, headshotBias: 0.1, hp: 1, moveSpeed: 0.9,
    flavor: { hit: '"Yep. That\'s me."', win: 'Andrew gives a thumbs up. "Solid play."' },
  },
  alex: {
    name: 'Alex', neighborhood: 'northcliff', street: 'northcliff_trace',
    height: 'tall', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0x3a2818, skinColor: 0xe0b890, shirtColor: 0x4a3a5a, pantsColor: 0x2a2a3a,
    aggression: 0.75, fireRate: 1.05, accuracy: 0.65, headshotBias: 0.15, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"OK, OK, you got it."', win: 'Alex looks over at Andrew. "Told you he\'d try that."' },
  },
  evan: {
    name: 'Evan', neighborhood: 'northcliff', street: 'northcliff_trace',
    height: 'average', build: 'average', hairStyle: 'wavy', glasses: false,
    hairColor: 0x4a2818, skinColor: 0xe6bf95, shirtColor: 0x5a7a5a, pantsColor: 0x3a3a3a,
    aggression: 0.5, fireRate: 1.0, accuracy: 0.6, headshotBias: 0.1, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"Got me clean."', win: 'Evan grins. "Best of three?"' },
  },
  // -- Stoneglen Close (the twins) --
  haden: {
    name: 'Haden', neighborhood: 'northcliff', street: 'stoneglen_close',
    height: 'short', build: 'heavy', hairStyle: 'short', glasses: false,
    hairColor: 0x3a2818, skinColor: 0xe0b890, shirtColor: 0x6a3a3a, pantsColor: 0x3a3a3a,
    aggression: 0.85, fireRate: 1.1, accuracy: 0.55, headshotBias: 0.1, hp: 1, moveSpeed: 0.95,
    flavor: { hit: '"OW. Connor, get him!"', win: 'Haden whoops. "Connor, did you SEE that?"' },
  },
  connor: {
    name: 'Connor', neighborhood: 'northcliff', street: 'stoneglen_close',
    height: 'short', build: 'heavy', hairStyle: 'short', glasses: false,
    hairColor: 0x3a2818, skinColor: 0xe0b890, shirtColor: 0x3a3a6a, pantsColor: 0x3a3a3a,
    aggression: 0.85, fireRate: 1.1, accuracy: 0.55, headshotBias: 0.1, hp: 1, moveSpeed: 0.95,
    flavor: { hit: '"Haden, AVENGE ME."', win: 'Connor laughs. "Haden! Did you see that?"' },
  },
  // -- Bellfield Court --
  mason: {
    name: 'Mason', neighborhood: 'northcliff', street: 'bellfield_ct',
    height: 'tall', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0xdcc88a, skinColor: 0xe8c4a0, shirtColor: 0x2a4a3a, pantsColor: 0x3a3a4a,
    aggression: 0.7, fireRate: 0.95, accuracy: 0.7, headshotBias: 0.2, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"Clean shot. Respect."', win: 'Mason pumps his pistol. "Want to try again?"' },
  },
  christian: {
    name: 'Christian', neighborhood: 'northcliff', street: 'bellfield_ct',
    height: 'short', build: 'heavy', hairStyle: 'curly', glasses: false,
    hairColor: 0xd4b870, skinColor: 0xe8c4a0, shirtColor: 0xc44a3a, pantsColor: 0x4a3a2a,
    aggression: 0.4, fireRate: 0.9, accuracy: 0.5, headshotBias: 0.1, hp: 1, moveSpeed: 0.9,
    flavor: { hit: '"AGH. Fine, fine."', win: 'Christian throws his hands up. "I\'ll get you next round!"' },
  },
  fernando: {
    name: 'Fernando', neighborhood: 'northcliff', street: 'bellfield_ct',
    height: 'average', build: 'average', hairStyle: 'short', glasses: false,
    hairColor: 0x1a1410, skinColor: 0xc89870, shirtColor: 0x3a5a7a, pantsColor: 0x2a2a3a,
    aggression: 0.8, fireRate: 1.05, accuracy: 0.65, headshotBias: 0.15, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"You got me, you got me."', win: 'Fernando grins. "Diego, your turn."' },
  },
  diego: {
    name: 'Diego', neighborhood: 'northcliff', street: 'bellfield_ct',
    height: 'short', build: 'average', hairStyle: 'short', glasses: false,
    hairColor: 0x1a1410, skinColor: 0xc89870, shirtColor: 0x7a5a3a, pantsColor: 0x2a2a3a,
    aggression: 0.65, fireRate: 1.15, accuracy: 0.6, headshotBias: 0.15, hp: 1, moveSpeed: 1.05,
    flavor: { hit: '"Tch. Nice shot."', win: 'Diego looks over at Fernando. "Told you."' },
  },
  // v1.273 (D.28 step 1, Michael's design): Colin, one of Seth's crew. Lived near Diego, Fernando, Christian and Mason;
  // medium height and build; cheap guns; high aggression; medium-high speed.
  colin: {
    name: 'Colin', neighborhood: 'northcliff', street: 'bellfield_ct',
    height: 'average', build: 'average', hairStyle: 'curly', glasses: false,
    hairColor: 0x6a4a28, skinColor: 0xe6bf95, shirtColor: 0xd07030, pantsColor: 0x2a3a5a,
    aggression: 0.88, fireRate: 1.1, accuracy: 0.5, headshotBias: 0.1, hp: 1, moveSpeed: 1.1,
    flavor: { hit: '"WHAT. No way. Again!"', win: 'Colin is already running back. "Again! Again!"' },
  },

  // === v1.190: HOLLINS RIDGE HIGH's own kids (decisions, Michael: B, control room 12 Oct). The school's four matches
  // borrowed Tyler, the Bunratty kids and the Winnmark kids; these six go to the school and play only there. Each
  // takes the numbers of the kid he or she replaces (Jordan: Tyler, Caleb: Ryan, Nathan: Mitchell, Sophie: Priya,
  // Grant: Owen, Malik: Jamie), so the matches play as they did and only the faces change.
  // -- Hollins Ridge High --
  jordan: {
    name: 'Jordan', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'tall', build: 'skinny', hairStyle: 'wavy', glasses: false,
    hairColor: 0x1a1410, skinColor: 0x8a5a3a, shirtColor: 0x7a2a2a, pantsColor: 0x6a6048,
    aggression: 0.5, fireRate: 1.0, accuracy: 0.6, headshotBias: 0.15, hp: 1, moveSpeed: 1.1,
    flavor: { hit: '"Okay. Okay, that one\'s yours."', win: 'Jordan leans on the portable steps. "Told you. My portables."' },
  },
  caleb: {
    name: 'Caleb', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'average', build: 'average', hairStyle: 'short', glasses: false,
    hairColor: 0xe0c890, skinColor: 0xf0cca8, shirtColor: 0x2a6a8a, pantsColor: 0x3a3a3a,
    aggression: 0.75, fireRate: 1.1, accuracy: 0.6, headshotBias: 0.1, hp: 1, moveSpeed: 0.9,
    flavor: { hit: '"Ugh! I was right THERE."', win: 'Caleb jogs back across the field. "Too slow, man."' },
  },
  nathan: {
    name: 'Nathan', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'tall', build: 'average', hairStyle: 'curly', glasses: true,
    hairColor: 0x2a1a10, skinColor: 0xa86a42, shirtColor: 0x4a4a2a, pantsColor: 0x2a2a30,
    aggression: 0.4, fireRate: 0.95, accuracy: 0.72, headshotBias: 0.12, hp: 1, moveSpeed: 0.95,
    flavor: { hit: '"Hm. Fair."', win: 'Nathan pushes his glasses up. "You crossed the field. Everyone crosses the field."' },
  },
  sophie: {
    name: 'Sophie', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'average', build: 'skinny', hairStyle: 'long', glasses: false,
    hairColor: 0x8a4a20, skinColor: 0xf0d0b0, shirtColor: 0xd8a030, pantsColor: 0x3a4a6a,
    aggression: 0.6, fireRate: 1.0, accuracy: 0.7, headshotBias: 0.18, hp: 1, moveSpeed: 0.98,
    flavor: { hit: '"Wow. Okay. Nice."', win: 'Sophie comes round the end of the portable. "Wrong side."' },
  },
  grant: {
    name: 'Grant', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'tall', build: 'heavy', hairStyle: 'short', glasses: false,
    hairColor: 0x7a5a30, skinColor: 0xe0b890, shirtColor: 0x5a2a2a, pantsColor: 0x4a4a4a,
    aggression: 0.2, fireRate: 0.9, accuracy: 0.82, headshotBias: 0.2, hp: 1, moveSpeed: 0.8,
    flavor: { hit: '"Huh. Didn\'t see you."', win: 'Grant hasn\'t moved from the cars. "Whole field\'s mine."' },
  },
  malik: {
    name: 'Malik', neighborhood: 'east_roswell', street: 'hollins_ridge_high',
    height: 'average', build: 'heavy', hairStyle: 'short', glasses: false,
    hairColor: 0x1a1010, skinColor: 0x6a4028, shirtColor: 0x9a9a9a, pantsColor: 0x2a2a3a,
    aggression: 0.4, fireRate: 1.0, accuracy: 0.7, headshotBias: 0.15, hp: 1, moveSpeed: 1.0,
    flavor: { hit: '"Aw, man. Clean."', win: 'Malik racks the shotgun. "Close up, that\'s my range."' },
  },
};

// ---------------------------------------------------------------------
// VOICE LINES (v1.21; v1.150 every kid, deeper pools, a recent-lines memory)
// ---------------------------------------------------------------------
// Categories (the situations a kid speaks in):
//   playerHit     — the kid just tagged you ("ooh, I bet that stings!"); v1.151: or tagged another kid
//   roundStart    — v1.151: the nearest hostile kid within earshot calls the start when the opening hold lifts
//   npcHit        — the kid just got tagged ("ow! okay, I'm hit!")
//   playerSpotted — the kid peeks out on a target in range ("there he is!")
//   taunt         — a random interjection between actions, and a bounding kid's covering burst
//   teammate      — v1.150: what a kid on YOUR side says instead of a taunt ("push up with me!")
//   infection     — the shared zombie-tag pool (INFECTION_BARKS below)
//
// v1.150 (D.9, Michael: A): every kid in CHARACTERS has bespoke lines in every category, at least four,
// and the three aggression bands' defaults are deeper. A kid's pool for a category is his own lines plus
// his band's; the picker prefers his own (7 in 10) and never repeats what he said last (a per-speaker
// memory of his last three lines) nor what anyone said in the last two lines. Early-2000s suburban kids:
// trash talk, nothing mean, no profanity, no real brands or schools. Lines stay at eight words or fewer
// (TTS runs ~3 words a second, so a line is out before the next thing happens); tests/voices.test.mjs
// walks these tables.
const VOICE_LINE_WORD_CAP = 8;   // v1.150: the longest line, in words (tests/voices.test.mjs)
const VOICE_LINES = {
  // === Horseshoe Bend (Winnmark Ct) ===
  // Seth: the ringleader, hosts the games, friendly trash talk.
  seth: {
    playerHit:     ["Oh that's gotta sting!", "Hit! Eat that!", "Right in the chest!", "Welcome to my yard!", "Yes! Did you see that?"],
    npcHit:        ["Augh, okay you got me!", "Ow, fine, FINE!", "Nice shot!", "Okay, okay, I'm out!", "Dude, my own yard!"],
    playerSpotted: ["Yo, there he is!", "Got eyes on him!", "Behind the box, get him!", "Yo, he's by the fence!", "Found him, found him!"],
    taunt:         ["Where you hiding, man?", "Come on out, I'm bored!", "I see you back there!", "My yard, my rules!", "You're not even close, dude."],
  },
  // Trey: cocky, laughs when you walk into it.
  trey: {
    playerHit:     ["Got 'em! Easy.", "Walked right into that one.", "Boom, headshot.", "Too easy, dude.", "Ha! Called it."],
    npcHit:        ["Dude! Ugh.", "Aw come ON.", "That was lucky!", "Whatever, that barely counted.", "Fine. FINE. I'm hit."],
    playerSpotted: ["Found you!", "Hey, target!", "On him on him!", "Peekaboo, dude!", "Yep, I see you."],
    taunt:         ["You're so dead, dude.", "Pop out, I dare you.", "Where'd you go?", "Scared? You should be.", "I could do this all day."],
  },
  // Brooke: the smirk, the best shot on the court, sorry not sorry.
  brooke: {
    playerHit:     ["Got him! Did you see that?", "Sorry not sorry!", "Right on target!", "Told you I'd get you first.", "That's what you get!"],
    npcHit:        ["Oof, okay!", "Got me, fair!", "Ahh, dang it!", "Whatever. Reset.", "Okay, that one counts."],
    playerSpotted: ["I see him!", "Over here, over here!", "Got him in my sights!", "Don't move. Too late.", "There you are!"],
    taunt:         ["Hellooo?", "You can't hide forever!", "I can hear you breathing!", "Come on, I'm bored!", "You're gonna miss anyway."],
  },
  // Jamie: the new kid on the block, steady, doesn't talk trash.
  jamie: {
    playerHit:     ["Got you. Good game.", "Nice try, though.", "That one landed.", "Okay, tagged."],
    npcHit:        ["Nice. Good shot.", "Yep, that's a hit.", "Okay, I'm out.", "Fair. Nice one."],
    playerSpotted: ["I see him.", "Okay, there he is.", "Got him, by the fence.", "He's moving. Watch left."],
    taunt:         ["Still here.", "Take your time, I'm fine.", "You can come out, you know.", "Nothing personal."],
  },
  // Marcus: Seth's cousin, visiting for the summer. Loud, pushy, doesn't know the yards.
  marcus: {
    playerHit:     ["Tagged!", "Bam, got him.", "That's how it's done!", "SETH! Did you see that?", "Lights out, dude!"],
    npcHit:        ["Augh, lucky!", "Ugh, FINE.", "Yeah, yeah, okay.", "COME ON. That barely hit me!", "Whatever, man!"],
    playerSpotted: ["He's RIGHT there, guys!", "Get him, get him!", "Right side!", "Wait, which yard is this?", "Found him! Go go go!"],
    taunt:         ["Stop running, dude!", "Come fight me, dude!", "You're scared!", "I'm coming through the yard!", "Y'all have too many fences!"],
  },
  // Devon: the careful one. Patient, plays sniper, doesn't fall for fakes.
  devon: {
    playerHit:     ["Long shot, baby!", "Saw you coming a mile off.", "Patience pays.", "You stood still too long.", "Mm. Well played, but no."],
    npcHit:        ["Tch. Nice one.", "Got me clean.", "Yeah, okay, point taken.", "Well played.", "Didn't see that angle."],
    playerSpotted: ["I've got him.", "Don't move, target.", "He's in my scope.", "Hold still for me.", "There. Got him lined up."],
    taunt:         ["Take your time. I'm comfortable.", "I'll wait.", "I see everything.", "Every peek is a mistake.", "Go ahead, run for it."],
  },
  // Tyler (Wayt Rd): laid back, tall, 'aight'.
  tyler: {
    playerHit:     ["Aight, got him.", "Yep. Tagged.", "Nice and easy.", "Better luck next time.", "That's a hit, man."],
    npcHit:        ["Aight, that was a good one.", "Okay, I'm hit.", "Cool. You got me.", "Yeah, I felt that."],
    playerSpotted: ["Yeah, I see him.", "Over there, by the car.", "Got him. Chill.", "Hey, there he goes."],
    taunt:         ["Take it easy out there.", "No rush, man.", "Still hiding? Aight.", "Come on, let's go already."],
  },
  // v1.273: Garrett, Seth's crew: calm, sure of himself, a little bored by how easy it is.
  garrett: {
    playerHit:     ["Got him. Easy.", "That's one for Seth.", "Right where I aimed.", "Yep. Saw that coming.", "Tagged. Next."],
    npcHit:        ["Huh. Okay. Good shot.", "Fine. That one's yours.", "Didn't see you there.", "Alright. I'm out."],
    playerSpotted: ["There. By the fence.", "Got him. Seth, left side.", "See him. Moving up.", "He's right there, guys."],
    taunt:         ["Seth said you were good.", "Is that all you got?", "Take your time, man.", "We've done this before."],
  },

  // === Sentinel (Bunratty Ct) ===
  // Sean: the AK, spray and pray, loud.
  sean: {
    playerHit:     ["Got him! Sprayed him good.", "Bullet hose, baby!", "AK go BRRRRT!", "Caught him in the open!", "Can't dodge all of them!"],
    npcHit:        ["Ow! Cheap shot!", "Augh, fine!", "Lucky, dude.", "Hey, no fair!", "Okay okay, I'm hit!"],
    playerSpotted: ["There he is! Light him up!", "Spray and pray!", "Eyes on, full auto!", "Brother get over here!", "Target! Dump the mag!"],
    taunt:         ["Come on, peek out!", "I got plenty of BBs!", "Sit still for me!", "You can't outrun the AK!", "Still got half a mag!"],
  },
  // Nick: big, calm, 'keep moving'.
  nick: {
    playerHit:     ["Got him. Told you to keep moving.", "Stationary target, easy.", "Patience pays, dude.", "Yep. You stopped.", "That's what standing still gets you."],
    npcHit:        ["Augh. Good shot.", "Yeah, alright.", "Hmph. Nice.", "Okay. That's me done.", "Fair enough, man."],
    playerSpotted: ["I see him.", "Got him.", "Standing right there.", "There. By the bins.", "He's out in the open."],
    taunt:         ["Not going anywhere, dude.", "Come to me.", "You're gonna run out of cover, dude.", "Keep moving, man.", "I've got all afternoon."],
  },
  // Ryan: the quick flanker, Mitchell's brother, hyped.
  ryan: {
    playerHit:     ["HA! Flushed him out!", "Told you I'd get him!", "Mitchell did you see that?!", "Right between the eyes!", "Got him! Got him!"],
    npcHit:        ["Hah! Okay, okay, that's one!", "Lucky! Lucky!", "Aw what! Come on!", "Fair, fair.", "Mitchell, he got me!"],
    playerSpotted: ["Mitchell I got him!", "Pushing him, pushing him!", "Right side, right side!", "He's mine!", "Going around! Going around!"],
    taunt:         ["Stop hiding, scaredy!", "I'm coming around!", "Mitchell, cover me!", "Open up, dude!", "You can't watch both sides!"],
  },
  // Mitchell: the steady marksman, Ryan's brother, calm.
  mitchell: {
    playerHit:     ["Mm. Nice shot.", "Got him. Clean.", "Patience, man. That's the whole game.", "Told you, Ryan.", "One shot. That's it."],
    npcHit:        ["Mm. Nice shot.", "Yeah, fair.", "Got me. Clean.", "Okay. Ryan, he's yours.", "Good angle."],
    playerSpotted: ["I have him.", "He's exposed.", "Ryan, hold him there.", "Lined up.", "He's by the planter."],
    taunt:         ["Take your time.", "I can wait all day.", "He'll show himself.", "Ryan, stop yelling.", "Still breathing out there?"],
  },
  // Priya: the cleverest flanker on the street, comes at you from the side.
  priya: {
    playerHit:     ["Yep. Flanked you.", "You never check your sides.", "Told you. Sides.", "From the left, by the way.", "Didn't even see me."],
    npcHit:        ["Okay, okay. Good.", "Hm. You checked.", "Fine. That's one.", "Nice. Didn't expect that."],
    playerSpotted: ["Got him. Going wide.", "There. Watch me.", "Found him. Flanking.", "He's looking the wrong way."],
    taunt:         ["Which side am I on?", "Keep watching the front.", "I'm already past you.", "Check your left. Or right."],
  },
  // Owen: the immovable anchor. Slow, heavy, very accurate; he just waits.
  owen: {
    playerHit:     ["Hm. Good. You moved.", "Yep.", "Told you. I just wait.", "Walked into it."],
    npcHit:        ["Hm.", "Okay. Fair.", "Good. You moved.", "That's a hit. Fine."],
    playerSpotted: ["There.", "Have him.", "He's in my lane.", "Got him. Holding."],
    taunt:         ["I just wait.", "Not moving.", "Come to me.", "Still here. Still waiting."],
  },

  // === East Roswell (Ridgestone Ct) ===
  // Eric: short, fast, fires a lot, 'again?'.
  eric: {
    playerHit:     ["Got him! Again?", "Ha! Too slow!", "Yes! Yes!", "Tagged! Run it back!", "Can't catch me!"],
    npcHit:        ["FINE. You got lucky.", "Ugh, whatever!", "Okay okay okay!", "That's cheap!", "Fine, I'm hit!"],
    playerSpotted: ["There! There!", "Found him! Go!", "He's right there, dude!", "On him! Moving!"],
    taunt:         ["Come on, come on!", "Too slow, dude!", "Can't hit me!", "Let's go, let's go!", "Catch me if you can!"],
  },
  // Rebecca: unbothered, accurate, 'predictable'.
  rebecca: {
    playerHit:     ["That counts. Reset.", "Predictable.", "Yep. Saw that coming.", "Called it.", "Next."],
    npcHit:        ["That counts. Reset.", "Okay. Fine.", "Hm. Good.", "Noted."],
    playerSpotted: ["There he is.", "Got him.", "Right there. Predictable.", "I see you."],
    taunt:         ["Any day now.", "You always go left.", "Still waiting.", "This again?"],
  },

  // === Northcliff (Northcliff Trace) ===
  // Andrew: big, friendly, a thumbs up for a good play.
  andrew: {
    playerHit:     ["Yep. That's me.", "Got him! Solid.", "Big hit! Haha!", "That's a tag, buddy!", "Down the hill, bud!"],
    npcHit:        ["Yep. That's me.", "Good one!", "Ha, solid play.", "Okay! You got me!", "Fair hit, fair hit."],
    playerSpotted: ["There he is! Alex!", "Got him, down the hill!", "Found him! Go, go!", "He's by the creek!"],
    taunt:         ["Come on up the hill!", "I'm not hard to find!", "Let's go, buddy!", "Alex, push with me!", "Big yard, nowhere to hide!"],
  },
  // Alex: Andrew's buddy, the smart aleck, 'told you he'd try that'.
  alex: {
    playerHit:     ["Told you he'd try that.", "OK, OK, got him.", "Saw that a mile away.", "Called it. Called it.", "Every time, dude."],
    npcHit:        ["OK, OK, you got it.", "Ugh. Fine.", "Andrew, he got me.", "Alright, alright.", "Didn't see that one."],
    playerSpotted: ["Andrew, there!", "Yep, he's doing it.", "Got him. Called it.", "Up the hill, right side!"],
    taunt:         ["I know what you're doing.", "Try it. Go on.", "So predictable, dude.", "Andrew, he's going left again.", "Come on, surprise me."],
  },
  // Evan: the good sport, 'best of three?'.
  evan: {
    playerHit:     ["Got you! Best of three?", "Nice! That's one.", "Ha, got him clean!", "Tag! Rematch after?"],
    npcHit:        ["Got me clean.", "Okay, good one!", "Best of three?", "Fair. Nice shot."],
    playerSpotted: ["Hey, there he is!", "Got him, got him!", "Okay, I see you!", "Over by the creek!"],
    taunt:         ["Come on, let's play already!", "You can come out!", "I'll give you a head start!", "Where'd you go, man?"],
  },
  // Haden and Connor (Stoneglen Close): the twins, loud, yelling for each other.
  haden: {
    playerHit:     ["OW! Wait, no, I got HIM!", "CONNOR! Did you SEE that?", "Got him! Got him!", "Yes! Twin power!", "Ha! Take that!"],
    npcHit:        ["OW. Connor, get him!", "Connor! He got me!", "Augh! Avenge me!", "No fair! Connor!", "OW. Okay. Ow."],
    playerSpotted: ["Connor, there he is!", "He's in the yard!", "Got him! Get him!", "There! By the shed!"],
    taunt:         ["Connor, where is he?", "Come out, come out!", "You're in OUR yard!", "Connor, cover me!", "I'm gonna get you!"],
  },
  connor: {
    playerHit:     ["Got him! Haden, did you see?", "Yes! YES!", "Bunker rules!", "Tagged! Ha ha!", "Right over the bags, dude!"],
    npcHit:        ["Haden, AVENGE ME.", "Augh! Haden!", "No way! Haden, he got me!", "OW. Okay. That's one.", "He got me! Get him!"],
    playerSpotted: ["Haden! He's right there!", "I see him, I see him!", "There! By the fort!", "Got eyes on him from the bunker!"],
    taunt:         ["Haden, go around!", "You'll never get in here!", "This is OUR bunker!", "Come on, I dare you!", "Haden, where'd he go?"],
  },
  // Bellfield Court: Mason the sportsman, Christian the excitable one, Fernando and Diego the pair.
  mason: {
    playerHit:     ["Clean shot. That's a tag.", "Got him. Respect.", "Nice try, though.", "Tagged. Good round.", "Yep. That one's mine."],
    npcHit:        ["Clean shot. Respect.", "Good hit.", "Okay. You earned that.", "Fair. I'm out.", "Nice angle."],
    playerSpotted: ["There he is.", "Got him. Pushing.", "Eyes on, left side.", "Found him. Let's go."],
    taunt:         ["Want to try again?", "Come on, let's play it straight.", "I'm right here.", "No hiding. Let's go.", "Any time."],
  },
  christian: {
    playerHit:     ["I GOT HIM! I got him!", "Did you SEE that?", "Yes! Finally!", "Ha! Got you!", "That one hit! It hit!"],
    npcHit:        ["AGH. Fine, fine.", "Ow! Not again!", "I'll get you next round!", "Aw, come on!", "Fine! Fine! Fine!"],
    playerSpotted: ["There! There! There!", "He's right there, guys!", "Found him! Somebody get him!", "Over there! Look!"],
    taunt:         ["I'll get you this time!", "Come on, come on!", "Where are you? Come out!", "I'm gonna hit you this time!", "Hold still so I can hit you!"],
  },
  fernando: {
    playerHit:     ["Got him. Diego, your turn.", "Easy. Next.", "That's a tag. Move up!", "Got him! Push, push!", "One down."],
    npcHit:        ["You got me, you got me.", "Okay. Diego, go.", "Fine. Nice shot.", "Yeah, that's a hit.", "Diego, he's yours."],
    playerSpotted: ["Diego, right there!", "Got him! Moving up!", "There he is. Go!", "Found him. Flank him!"],
    taunt:         ["Diego, your turn.", "Come on, let's finish this.", "Keep moving, keep moving!", "We've got you boxed in!", "No way out, man."],
  },
  diego: {
    playerHit:     ["Tch. Got him.", "Told you.", "Yep. That's a hit.", "Fernando, told you.", "Easy."],
    npcHit:        ["Tch. Nice shot.", "Okay. That counts.", "Fernando, he got me.", "Hm. Fine.", "Good one."],
    playerSpotted: ["Fernando, there.", "Got him.", "He's right there. Go.", "See him. Left side."],
    taunt:         ["Any day now.", "Fernando, he's hiding again.", "Come on. Let's go.", "We know where you are.", "Told you he'd hide."],
  },
  // v1.273: Colin, Seth's crew: loud, fast, always running straight at you.
  colin: {
    playerHit:     ["GOT HIM! Did you see?!", "Ha! Ran right at you!", "Yes! Again! Again!", "Told you I'm fast!", "Boom! Got you good!"],
    npcHit:        ["WHAT. No way!", "Aw come on, again!", "That's so lucky!", "Okay okay, run it back!"],
    playerSpotted: ["THERE! I'm going!", "Got him, I'm going in!", "He's mine, he's mine!", "Charging! Cover me, Seth!"],
    taunt:         ["I'm coming right at you!", "Run, dude, run!", "Can't hide from me!", "Diego would've ran already!"],
  },
  // v1.229: Hollins Ridge High's six (v1.190) came after the v1.150 tables; their own lines, from their flavor.
  // Jordan: easygoing, knows the portables.
  jordan: {
    playerHit:     ["Got you by the portables.", "That's a tag, man.", "Told you. My portables.", "Right off the steps.", "Okay, that one's mine."],
    npcHit:        ["Okay. Okay, that one's yours.", "Aw, off the steps too.", "Yeah, you got me.", "Alright, alright, I'm out."],
    playerSpotted: ["He's under the portables!", "By the steps, right there!", "Got him, between the buildings.", "There, by the portable!"],
    taunt:         ["Nobody knows these portables like me.", "Come around the steps, man.", "I'm in here somewhere, man.", "Every portable looks the same, huh?"],
  },
  // Caleb: fast, pushy, always nearly made it.
  caleb: {
    playerHit:     ["Too slow, man!", "Got you! Ran right past!", "Ha! Right across the field!", "Tagged! Keep up!", "Yes! Called it!"],
    npcHit:        ["Ugh! I was right THERE!", "No way! I was moving!", "Aw, I almost made it!", "Okay! Okay! I'm hit!"],
    playerSpotted: ["Going around, going around!", "He's by the bleachers!", "Got him! Cutting across!", "Field side! Field side!"],
    taunt:         ["Can't catch me, man!", "Faster than you, dude!", "I'm already behind you!", "Race you to the fence!"],
  },
  // Nathan: glasses, patient, has worked out where you'll go.
  nathan: {
    playerHit:     ["You crossed the field.", "Everyone crosses the field.", "Predictable. Sorry.", "Hm. Got you.", "That angle was open."],
    npcHit:        ["Hm. Fair.", "Okay. Didn't plan for that.", "Huh. Good angle.", "Noted. I'm out."],
    playerSpotted: ["He's going for the field.", "Movement, by the doors.", "There. Between the portables.", "Got him. Second window."],
    taunt:         ["The field is wide open.", "I've done the math.", "Don't cross the field.", "You'll have to come to me."],
  },
  // Sophie: the best shot at the school, comes round the end of the portable.
  sophie: {
    playerHit:     ["Wrong side, dude.", "Got you. Check your corners.", "Wow. That was easy.", "Right where I thought.", "Nope. Mine."],
    npcHit:        ["Wow. Okay. Nice.", "Okay, that's fair.", "Ugh, I hate that angle.", "Fine. Good shot."],
    playerSpotted: ["End of the portable, there!", "He's on the wrong side!", "Got him. Coming round.", "I see you, by the doors."],
    taunt:         ["I'm coming round the end.", "Better check your corners.", "You picked the wrong side.", "I'm faster round the back."],
  },
  // Grant: big, quiet, never leaves the cars.
  grant: {
    playerHit:     ["Whole field's mine.", "Didn't even move.", "From the cars. Again.", "Yep. Clean.", "Long way from here."],
    npcHit:        ["Huh. Didn't see you.", "Huh. Okay.", "Guess I'm out.", "Didn't think you'd get here."],
    playerSpotted: ["Got him on the field.", "He's out in the grass.", "Lined up. By the cars.", "Saw that. Grass, left."],
    taunt:         ["I'm not leaving the cars.", "Nothing but grass out there.", "Come on across.", "I can see the whole field."],
  },
  // Malik: the shotgun, wants you close.
  malik: {
    playerHit:     ["Close up, that's my range.", "Too close, man.", "Boom. Shotgun rules.", "Up close, every time.", "Got you round the corner."],
    npcHit:        ["Aw, man. Clean.", "Couldn't get close enough.", "Okay, okay. Nice.", "Aw, from way out there?"],
    playerSpotted: ["He's close! Right there!", "Round the corner, I got him.", "In my range now.", "Right by the doors!"],
    taunt:         ["Come a little closer.", "Corners are my thing, man.", "Bring it in close.", "I'll be round the corner."],
  },
};

// Default catalogs by aggression band. v1.150: deeper (six a category), and every kid draws from his band's
// pool as well as his own, so the pools are about ten lines a category.
const VOICE_LINES_DEFAULT = {
  high_agg: { // aggression >= 0.65
    playerHit:     ["Got him!", "Easy!", "Eat that!", "Boom! Tagged!", "Too easy, dude!", "Ha! Got you!"],
    npcHit:        ["Ugh, fine!", "Aw come on!", "Lucky shot!", "Whatever, I'm hit!", "No way! Okay, okay!", "That was cheap!"],
    playerSpotted: ["There he is!", "Get him!", "Push push push!", "Found him! Go!", "On him! Move!", "He's right there!"],
    taunt:         ["Come fight me!", "Stop hiding!", "I'm coming for you!", "Let's go already!", "You can't hide from me!", "Come on, chicken!"],
    roundStart:    ["Game on! Let's go!", "Here we come!", "Go go go!", "Let's get him!", "Rush him! Rush him!", "It's on, dude!"],   // v1.151
    shotWhileOut:  ["Ow!! Dude, I literally have my hand in the air!", "I'm OUT already!! What the heck, dude!", "Hey! I'm out! Are you blind?", "Dude! Hand's UP!"],   // v1.237 (D.33)
    playerOut:     ["I GOT HIM!! YES!", "Boom!! Got him! Did you see that?!", "YES! That's how it's done!", "Ha-ha! Got you, dude!!"],   // v1.256 (D.32)
    pressed:       ["Whoa! Okay, you wanna go?!", "He's shooting at me! Somebody help!", "Ha! Missed me!", "That was close! Get him!"],
    allyDown:      ["They got {name}! Get 'em back!", "{name}'s out! Come on, guys!", "No way, {name}! Payback time!"],
  },
  mid_agg: { // 0.4..0.65
    playerHit:     ["Got him!", "Hit!", "That's one.", "Tagged you!", "Nice, that landed.", "Got you, dude!"],
    npcHit:        ["Augh, okay!", "Fine, fair!", "Got me.", "Okay, that's a hit.", "Ow! Alright.", "Dang it. Fine."],
    playerSpotted: ["I see him!", "On him!", "Right there!", "There he is!", "Got him in sight!", "Over there, over there!"],
    taunt:         ["Where'd he go?", "Come on out!", "You can't hide forever!", "I know you're there.", "Come on, let's play!", "Any time now."],
    roundStart:    ["Game on!", "Okay, here we go!", "Let's play!", "Alright, let's do this.", "Ready or not!", "Spread out, spread out!"],   // v1.151
    shotWhileOut:  ["I'm out already!! What the heck, dude.", "Ow! My hand's up, man!", "Dude, I'm walking off! Quit it!", "Hey! I'm already out!"],   // v1.237 (D.33)
    playerOut:     ["I got him!! I got him!", "Yes! Got him!", "Whoa, I actually got him!", "Got him! Nice!"],   // v1.256 (D.32)
    pressed:       ["Whoa, whoa! He's on me!", "That was close!", "I'm pinned, I'm pinned!", "Somebody help me out here!"],
    allyDown:      ["They got {name}!", "{name}'s down! Watch out!", "Aw man, {name}'s out!", "We lost {name}! Careful!"],
  },
  low_agg: { // < 0.4
    playerHit:     ["Got him.", "Nice.", "Tagged.", "Yep. That's a hit.", "Saw you coming.", "Mm. Got you."],
    npcHit:        ["Mm, okay.", "Yeah, fair.", "Got me.", "Good shot.", "Okay. I'm out.", "Fair enough."],
    playerSpotted: ["I have him.", "He's there.", "Got eyes.", "There he is.", "Got him lined up.", "He's in the open."],
    taunt:         ["Take your time.", "I can wait.", "He'll show himself.", "Still here.", "No rush.", "I'm not going anywhere."],
    roundStart:    ["Game on.", "Okay. Here we go.", "Everybody find a spot.", "Eyes open.", "Take it slow.", "Nice and easy."],   // v1.151
    shotWhileOut:  ["Ow. I'm out, man.", "Seriously? My hand is up.", "Okay, that's overshooting.", "I'm already out, dude."],   // v1.237 (D.33)
    playerOut:     ["Got him. That's it.", "And he's out.", "Clean hit. He's done.", "There we go. Got him."],   // v1.256 (D.32)
    pressed:       ["Taking fire.", "He's got me pinned.", "Close one.", "Staying down, he's on me."],
    allyDown:      ["{name}'s out. Careful.", "We lost {name}.", "They got {name}. Stay low."],
  },
};

// v1.256 (backlog D.32, Michael 14 Oct: "more complaining and 'that's not fair because x' or 'You only got me because
// of y'"): a kid you tag sometimes gives an excuse instead of owning it, and the excuse fits how he was tagged: from
// behind, from far off, point blank, on the move, or any old reason. The pushier the kid the likelier (EXCUSE_CHANCE,
// by his band); the rest still say their npcHit line. Shared by every kid (category 'excuse_<why>').
const VOICE_EXCUSES = {
  behind: ["From behind? Seriously?", "Dude, I wasn't even looking!", "You shot me in the back, that's so cheap!", "I didn't even see you, that's not fair!"],
  far:    ["From way over there? That was pure luck!", "No way you aimed that from a mile away.", "Lucky shot! You couldn't even see me!", "That was a total fluke, dude."],
  close:  ["Way too close! That doesn't count!", "Dude, you can't shoot me from right there!", "That's point blank, man! Not cool!", "Ow! You were like two feet away!"],
  moving: ["I was running! That doesn't count!", "Only 'cause I was moving, dude.", "I tripped! I totally tripped!", "You only got me 'cause I was out in the open."],
  any:    ["My gun jammed, I swear!", "The sun was in my eyes!", "That barely touched me!", "Whatever, your gun's way better than mine.", "I wasn't even ready!", "It bounced off a branch first!"],
};
const EXCUSE_CHANCE = { high_agg: 0.6, mid_agg: 0.4, low_agg: 0.15 };
const EXCUSE_FAR = 30, EXCUSE_CLOSE = 4;   // m from you
function voiceBand(charId) {
  const ch = CHARACTERS[charId], agg = ch ? (ch.aggression ?? 0.5) : 0.5;
  return agg >= 0.65 ? 'high_agg' : agg < 0.4 ? 'low_agg' : 'mid_agg';
}
// what a kid you just tagged says: an excuse that fits (from behind, far, close, moving, any) or his npcHit line
function npcHitCategory(c) {
  if (c.behavior === 'tagger' || gameRandom() >= EXCUSE_CHANCE[voiceBand(c.charId)]) return 'npcHit';
  const P = Game.player.pos, dx = P.x - c.pos.x, dz = P.z - c.pos.z, d = Math.hypot(dx, dz);
  const facing = d > 0.01 && typeof c.yaw === 'number' ? (Math.sin(c.yaw) * dx + Math.cos(c.yaw) * dz) / d : 1;
  if (facing < -0.35) return 'excuse_behind';
  if (d > EXCUSE_FAR) return 'excuse_far';
  if (d < EXCUSE_CLOSE) return 'excuse_close';
  if (['advancing', 'chasing', 'repositioning'].includes(c.state) && gameRandom() < 0.5) return 'excuse_moving';
  return 'excuse_any';
}
// v1.256 (D.32): a line that waits for the voice cooldowns (a teammate's "they got Sean!" after Sean's own line),
// tried once the cooldowns clear, unless `until` passes first
function queueNpcLine(e, category, fill, delay, wait) {
  const now = Game.scenario?.roundTime || 0;
  VOICE.pending = (VOICE.pending || []).filter(q => q.e !== e);
  VOICE.pending.push({ e, category, fill, at: now + delay, until: now + delay + wait });
}
function voiceStep() {
  if (!VOICE.pending || !VOICE.pending.length) return;
  const now = Game.scenario?.roundTime || 0;
  VOICE.pending = VOICE.pending.filter(q => {
    if (now > q.until || q.e.health <= 0 || q.e.state === 'retreating') return false;
    if (now < q.at || now < VOICE.globalCooldownUntil || (q.e._voiceCooldownUntil && now < q.e._voiceCooldownUntil)) return true;
    tryNpcSpeak(q.e, q.category, q.fill);   // one try once the cooldowns are clear: out of earshot, it goes unsaid
    return false;
  });
}
// a kid of the tagged kid's team near him calls it (not in a free-for-all, not your friend online)
function callAllyDown(c) {
  const S = Game.scenario;
  if (!S || S.ffa) return;
  const team = c.team || 'enemy';
  let best = null, bd = 20;
  for (const m of S.enemies) {
    if (m === c || (m.team || 'enemy') !== team || m.health <= 0 || m.state === 'retreating' || m.remote || m.behavior === 'tagger') continue;
    const d = Math.hypot(m.pos.x - c.pos.x, m.pos.z - c.pos.z);
    if (d < bd) { bd = d; best = m; }
  }
  const name = c.name || c.character?.name;
  if (best && name) queueNpcLine(best, 'allyDown', { name }, 1.0, 3.0);
}
// a kid under fire: a second near miss inside 3 s, at most one line in 8 s, and only sometimes
const PRESSED_WINDOW = 3, PRESSED_GAP = 8, PRESSED_CHANCE = 0.6;
function notePressed(e, now) {
  if (inOpeningHold() || e.remote || e.behavior === 'tagger') return;
  e._pressHits = (e._pressHits || []).filter(t => now - t < PRESSED_WINDOW);
  e._pressHits.push(now);
  if (e._pressHits.length < 2 || (e._pressedLineAt != null && now - e._pressedLineAt < PRESSED_GAP)) return;
  e._pressedLineAt = now; e._pressHits = [];
  if (gameRandom() < PRESSED_CHANCE) tryNpcSpeak(e, 'pressed');
}

// v1.150: a kid on YOUR team (team 'player', not a free-for-all) is talking to you, not hunting you, so his
// taunt timer draws from this pool instead. Shared by every ally.
const VOICE_LINES_TEAMMATE = [
  "Push up with me!",
  "I got your back!",
  "Cover me, I'm moving!",
  "Watch the left side!",
  "Stay low, stay low!",
  "They're over there somewhere.",
  "Go, go, I'll cover you!",
  "Stick with me, dude.",
  "You see any of them?",
  "Let's flank around the house.",
];

// v1.36h: INFECTION barks — kids pretending to be zombies while playing tag.
// Goofy, kid-appropriate, NOT scary. Used by taggers (no per-character variants;
// every tagger draws from this shared pool). Kept short for the TTS rate.
const INFECTION_BARKS = [
  "We're gonna get you, dude!",
  "Oooh, I'm a zombie!",
  "Braaains... just kidding, you're it!",
  "You can't run forever!",
  "Here we come!",
  "One touch and you're one of us!",
  "Get him! Get him!",
  "Rrraaah! Zombie!",
  "You're gonna be infected!",
  "We're coming for youuu!",
  "Zombie arms! Zombie arms!",
  "Tag, you're dead! Just kidding!",
];

// v1.150: the pools a (charId, category) draws from: the kid's own lines and his band's defaults.
function voiceLinePools(charId, category) {
  if (category === 'infection') return { own: [], band: INFECTION_BARKS };
  if (category === 'teammate') return { own: [], band: VOICE_LINES_TEAMMATE };
  if (category.startsWith('excuse_')) return { own: [], band: VOICE_EXCUSES[category.slice(7)] || [] };   // v1.256
  const own = VOICE_LINES[charId]?.[category] || [];
  const bandKey = voiceBand(charId);   // v1.256: shared with the excuses
  const band = VOICE_LINES_DEFAULT[bandKey]?.[category] || [];
  return { own, band };
}

// Pull a line for (charId, category). v1.150: `speaker` (the enemy object, or any object in the tests) carries
// `_recentLines`, the last three lines it said; those and the last two lines anyone said (VOICE.recentLines)
// are left out while anything else remains, so a kid never says the same line twice running and two kids
// don't echo each other. The kid's own lines are preferred 7 in 10 over his band's.
const VOICE_RECENT_PER_SPEAKER = 3;
const VOICE_RECENT_GLOBAL = 2;
function pickVoiceLine(charId, category, speaker) {
  const { own, band } = voiceLinePools(charId, category);
  if (own.length + band.length === 0) return null;
  const recent = new Set([...(speaker?._recentLines || []), ...(VOICE.recentLines || [])]);
  let ownOk = own.filter(l => !recent.has(l));
  let bandOk = band.filter(l => !recent.has(l));
  if (ownOk.length + bandOk.length === 0) {
    // Every line is in memory (a pool this small is a test table): only the last line said is barred.
    const last = speaker?._recentLines?.[0];
    ownOk = own.filter(l => l !== last); bandOk = band.filter(l => l !== last);
    if (ownOk.length + bandOk.length === 0) { ownOk = own; bandOk = band; }
  }
  let pool;
  if (ownOk.length && bandOk.length) pool = gameRandom() < 0.7 ? ownOk : bandOk;
  else pool = ownOk.length ? ownOk : bandOk;
  const line = pool[Math.floor(gameRandom() * pool.length)];
  if (speaker) {
    speaker._recentLines = [line, ...(speaker._recentLines || [])].slice(0, VOICE_RECENT_PER_SPEAKER);
  }
  VOICE.recentLines = [line, ...(VOICE.recentLines || [])].slice(0, VOICE_RECENT_GLOBAL);
  return line;
}

// ---------------------------------------------------------------------
// TTS speech queue (v1.21) — speechSynthesis with cooldowns + voice per NPC.
// ---------------------------------------------------------------------
// Strategy: every kid gets a deterministically-picked voice from the browser's
// available speech voices (so 'Sean' always sounds like Sean). Two cooldowns:
//   - GLOBAL cooldown — at most one NPC speaks every 1.5s (no babble festival).
//   - PER-ENEMY cooldown — same kid can't repeat in <4s.
const VOICE = {
  globalCooldownUntil: 0,   // v1.150: on the round clock (Game.scenario.roundTime), reset by startScenario
  voicesCache: null,
  recentLines: [],          // v1.150: the last two lines anyone said (pickVoiceLine)
  log: [],                  // v1.150: the last 64 lines spoken, {t, charId, name, category, line} (tests)
  walkieUntil: 0,           // v1.268 (D.10): the next walkie line not before this (round clock), reset by startScenario
};
// v1.268 (backlog D.10, Michael: A): a teammate out of earshot comes in over the walkie instead of going unsaid,
// at most one walkie line every WALKIE_GAP seconds so a far-off fight is not a radio play
const WALKIE_GAP = 4;
function overWalkieMate(e, category) {
  const S = Game.scenario;
  if (!S || S.ffa || category === 'infection' || category === 'shotWhileOut') return false;
  return e.team === 'player' && e.behavior !== 'tagger' && !e.remote;
}

function ttsGetVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  // v1.61g: on macOS/Safari getVoices() often returns a SHORT partial list on
  // first call, then fills in via voiceschanged. Always poll the live list and
  // keep whichever is longer, so we don't lock onto the partial set (which could
  // miss the good natural voices and leave only novelty ones in range).
  let live = [];
  try { live = speechSynthesis.getVoices() || []; } catch (e) { live = []; }
  if (!VOICE.voicesCache || live.length > VOICE.voicesCache.length) {
    VOICE.voicesCache = live;
  }
  return VOICE.voicesCache || [];
}

// Deterministically map charId to a voice index (so each NPC has a stable voice).
// v1.23: prefer AMERICAN English voices (en-US). The kids are suburban-US, so
// British-sounding TTS broke the tone. Fallback chain: en-US → name looks
// US/American → any en* → any voice.
// v1.61g: macOS ships a pile of NOVELTY voices tagged en-US (Zarvox = robot,
// Whisper = unintelligible, Bells, Bad News, Boing, Cellos, Trinoids, Wobble,
// Bahh, etc.). They passed the en-US filter and got hashed onto kids, making
// half of them sound like droidekas. We now (a) hard-EXCLUDE those novelty
// voices at every tier, and (b) PREFER the known-good natural macOS voices
// (Samantha, Alex, Tom, Aaron, Nicky, ...) when present, before falling back.
const TTS_NOVELTY_VOICES = /^(zarvox|whisper|bells|bad news|good news|boing|bubbles|cellos|deranged|hysterical|pipe organ|trinoids|wobble|bahh|albert|jester|organ|superstar|junior|kathy|fred|ralph|princess|grandma|grandpa|reed|rocko|sandy|shelley|flo|eddy|wobble|bells)/i;
// Natural, intelligible US voices that ship on macOS / iOS — preferred when found.
const TTS_PREFERRED_NAMES = /\b(Samantha|Alex|Tom|Aaron|Nicky|Allison|Ava|Susan|Vicki|Victoria|Evan|Nathan|Joelle|Zoe)\b/i;
function _ttsUsable(v) {
  // Exclude novelty / non-speech voices by name.
  return v && v.name && !TTS_NOVELTY_VOICES.test(v.name.trim());
}
function voiceForCharId(charId) {
  const voices = ttsGetVoices().filter(_ttsUsable);   // novelty voices removed up front
  if (voices.length === 0) return null;
  // 0) Best case: a known natural US voice (Samantha/Alex/etc.).
  let pool = voices.filter(v => TTS_PREFERRED_NAMES.test(v.name) && /^en/i.test(v.lang));
  // 1) Explicit en-US locale.
  if (pool.length === 0) pool = voices.filter(v => /^en[-_]US/i.test(v.lang));
  // 2) Some platforms tag US voices only by name (e.g. "Google US English",
  //    "Microsoft David - English (United States)").
  if (pool.length === 0) {
    pool = voices.filter(v =>
      /US English|United States|\(US\)|American/i.test(v.name) ||
      /^en[-_]?US/i.test(v.lang)
    );
  }
  // 3) Any English voice that ISN'T explicitly GB/UK/AU (avoid the British read).
  if (pool.length === 0) {
    pool = voices.filter(v => /^en/i.test(v.lang) && !/GB|UK|AU|United Kingdom|Australia/i.test(v.lang + ' ' + v.name));
  }
  // 4) Any English voice at all.
  if (pool.length === 0) pool = voices.filter(v => /^en/i.test(v.lang));
  // 5) Anything (still novelty-filtered).
  if (pool.length === 0) pool = voices;
  let h = 0;
  for (let i = 0; i < charId.length; i++) h = (h * 31 + charId.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// v1.256: `fill` fills a line's {name}; returns true when the line was said
function tryNpcSpeak(enemy, category, fill) {
  if (enemy && enemy.remote) return false;   // v1.230: your friend online speaks for himself
  // v1.150: the cooldowns run on the round clock, not wall time, so a backgrounded tab or the headless
  // tests (which step a round far faster than real time) keep the same spacing as play.
  const now = Game.scenario?.roundTime || 0;
  if (now < VOICE.globalCooldownUntil) return false;
  if (enemy._voiceCooldownUntil && now < enemy._voiceCooldownUntil) return false;
  // v1.150: a kid on your side is talking to you, not hunting you: his taunt timer draws teammate lines.
  if (category === 'taunt' && !Game.scenario?.ffa &&
      (enemy.team || 'enemy') === ((Game.player && Game.player.team) || 'player')) category = 'teammate';
  // v1.22: positional TTS treatment.
  //   (A) Volume attenuated by distance via positionalAudio().
  //   (B) If volume would be too low to hear cleanly, skip the line entirely —
  //       distant kids shouldn't be muttering loudly across the map.
  //   (3) A short "voice marker" chirp plays POSITIONALLY (through the Web
  //       Audio panner pipeline) right before the TTS, giving you a spatial
  //       cue for WHERE the speaker is, since TTS itself has no pan API.
  // The brain merges the two sounds — you hear the direction from the marker,
  // and the words at attenuated volume so they don't dominate the soundscape.
  const VOICE_AUDIBLE_RANGE = 24;   // meters — past this we just don't speak
  const { vol: posVol } = positionalAudio(enemy.pos.x, enemy.pos.z, VOICE_AUDIBLE_RANGE);
  const walkie = posVol < 0.12 && overWalkieMate(enemy, category);   // v1.268 (D.10)
  if (posVol < 0.12 && !walkie) return false;  // too quiet to bother → don't speak (Option B; ~25m cutoff)
  if (walkie && now < VOICE.walkieUntil) return false;
  // v1.151: the line is picked after the earshot gate, so a kid's recent-lines memory holds only lines he was
  // heard to say (a pick for a kid out of range used to fill it, and a heard line could come round again).
  const line = pickVoiceLine(enemy.charId, category, enemy);
  if (!line) return false;
  const said = fill && fill.name ? line.replace('{name}', fill.name) : line;   // v1.256 (the log keeps the pool's line)

  // v1.150: the line counts as said from here: cooldowns and the log are set before the browser is asked
  // to speak, so headless Chromium (no voices, silent) and a real browser pace the kids the same way.
  VOICE.globalCooldownUntil = now + 1.5;
  enemy._voiceCooldownUntil = now + 4.0;
  VOICE.log.push({ t: +now.toFixed(2), charId: enemy.charId, name: enemy.name || enemy.character?.name, category, line, said, ...(walkie ? { walkie: true } : {}) });
  if (VOICE.log.length > 64) VOICE.log.shift();
  if (walkie) {
    // v1.268 (D.10): over the walkie: the talk button's click, his voice flat and from nowhere, and the line on the
    // squad box under the order (an order's answer holds the walkie WALKIE_GAP, longer than it shows, so is never
    // written over)
    VOICE.walkieUntil = now + WALKIE_GAP;
    Game.scenario.squadReply = { name: enemy.name || enemy.character?.name, line: said, until: now + 3.5 };
    updateSquadHud();
    walkieVoice(enemy, said);
    return true;
  }
  if (typeof speechSynthesis === 'undefined') return true;

  try {
    // (3) Positional voice-marker chirp — short blip from the NPC's location.
    // Cheap: just a single-osc tone routed through the same panner pipeline as
    // shots and footsteps. Quick enough (~80ms) to land right before the words.
    playVoiceMarker(enemy.pos.x, enemy.pos.z);

    // Cancel anything previous so we don't queue up a backlog.
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(said);
    const v = voiceForCharId(enemy.charId);
    if (v) u.voice = v;
    // Slightly varied pitch/rate per kid so two NPCs sharing a voice still feel distinct.
    let hp = 0;
    for (let i = 0; i < enemy.charId.length; i++) hp = (hp * 17 + enemy.charId.charCodeAt(i)) >>> 0;
    // v1.23: pitch is now anchored to the kid's HEIGHT so tall players sound
    // deeper and short ones higher (size → voice). A per-kid hash adds a small
    // ±variance on top so two same-height kids still differ.
    //   short kid  → base 1.30   (higher, squeakier)
    //   average    → base 1.05
    //   tall kid   → base 0.80   (deeper)
    const heightPitch = { short: 1.30, average: 1.05, tall: 0.80 };
    const hBase = heightPitch[enemy.character?.height] ?? 1.05;
    const pitchJitter = ((hp % 30) / 100) - 0.15;  // -0.15 .. +0.14
    u.pitch = Math.max(0.5, Math.min(2.0, hBase + pitchJitter)); // clamp to valid TTS range
    u.rate  = 1.05 + (((hp >>> 6) % 30) / 100); // 1.05..1.34
    // (A) Volume: cap at 0.5 (was 0.9 — TTS was dominating shots/footsteps),
    // then scale by the same positional vol curve as audio cues.
    u.volume = 0.5 * posVol * Settings.effects;   // v1.192: the effects volume
    speechSynthesis.speak(u);
  } catch (e) { /* TTS unavailable — ignore */ }
  return true;
}

// v1.22: short positional chirp that prefixes a TTS line. The brain merges the
// chirp's spatial cue with the (centered, system-played) TTS that follows, so
// the kid's voice feels like it's coming from their location even though TTS
// itself can't be panned.
function playVoiceMarker(srcX, srcZ) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const { pan, vol } = positionalAudio(srcX, srcZ, 24);
  if (vol < 0.05) return;
  // A "voice-like" attention chirp — two stacked sines (formant-ish), 220+440Hz,
  // shaped like a short consonant onset. Just enough texture to feel vocal.
  const fundamental = ctx.createOscillator();
  const formant = ctx.createOscillator();
  const gain = ctx.createGain();
  fundamental.type = 'triangle'; fundamental.frequency.setValueAtTime(220, t);
  formant.type = 'sine'; formant.frequency.setValueAtTime(440, t);
  formant.frequency.exponentialRampToValueAtTime(330, t + 0.08);
  gain.gain.setValueAtTime(0.12 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    fundamental.connect(gain); formant.connect(gain); gain.connect(p).connect(sfxOut());
  } else {
    fundamental.connect(gain); formant.connect(gain); gain.connect(sfxOut());
  }
  fundamental.start(t); formant.start(t);
  fundamental.stop(t + 0.1); formant.stop(t + 0.1);
}
