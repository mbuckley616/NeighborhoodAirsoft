# Decisions

Questions for Michael and his answers. Agents add under Pending; the producer carries them to Slack
(#neighborhood-airsoft) and writes the `Michael:` line when he answers. Nothing is a spec without one.

## Pending

- **The treehouse is built: what next for towers (D.7)? (builder, 2026-10-02)** v1.138 put a treehouse with a ladder
  in Stoneglen Close: you climb with W, a drop of 1.5 m or more empties your stamina, and Connor holds the platform
  in King of the Treehouse. Kids cannot climb, so a defend on the platform would leave the attackers standing under
  it, and there is no prompt at the ladder yet (the briefing says W climbs). With v1.139–v1.140 every bug found in
  play is closed, so this is the only open work.
  A) Kids climb ladders, then a defend: you hold the treehouse while kids climb up after you; a "W — climb" prompt at the ladder too *(recommended)*
  B) A ramp tower instead: a raised deck kids reach by walking up a ramp, so no climbing AI; plus the prompt
  C) Only the "W — climb" prompt for now, and wait for your playtest of the climb
  D) Nothing new: wait for your playtest of v1.130–v1.140
  Builder recommends A: it is what makes the platform a place to fight over rather than a sniper's nest, and the
  ladder code already moves the player, so kids can share it.

- **The map screen redesign (D.8): what shape? (builder, 2026-10-02)** The map is a 720 px parchment panel capped at
  92% of the window: a 380 px map on top and the scenario details under it in what is left, so on a laptop screen
  you see one or two scenarios at a time. Five zones now hold 52 scenarios (Winnmark alone has 16).
  A) Full-window two columns: the map on the left at full height, the chosen zone's scenarios as a scrolling list of
     cards on the right (name, type, lives, locked/done), same parchment style, map redrawn cleaner *(recommended)*
  B) Keep the map as a small header; below it, every zone's scenarios as tabbed card rows across the full width
  C) Drop the map for a zone ladder: one row per zone, each a strip of scenario cards; the map becomes a picture only
  D) Only widen the panel and let the scenario list scroll; no restyle yet
  Builder recommends A: it shows a whole zone at once and keeps the map as the way you pick where to go.

- **Better voices and more lines (D.9): how? (builder, 2026-10-02)** The kids talk through the browser's own speech
  (`speechSynthesis`), so the voice depends on the player's computer and browser. VoiceStudio is an app that runs AI
  voice models on your own machine; the cloud sessions can't run it, and the game is one HTML file with no audio files.
  A) More and more varied lines now, with the browser voices; recorded voices later *(recommended)*
  B) Pre-recorded lines: you generate a voice pack with VoiceStudio from a script the builder writes, the clips ship
     next to index.html on itch (a zip), with the browser voice as the fallback
  C) Both: the lines first (A), then the script and loader for your VoiceStudio pack (B)
  D) Leave voices as they are
  Builder recommends A, then C if the new lines land: B only works once you run VoiceStudio yourself, and every new
  line would need a fresh recording.

- **D.8, the map screen (your A): the builder or a Fable session? (builder, 2026-10-02)** You chose A on the control
  room: the map full-height on the left, the chosen zone's scenarios as scrolling cards on the right. The backlog does
  not mark D.8 (Fable), but CLAUDE.md names "a new map screen that touches every scenario entry" as Fable work, so the
  builder has not started it.
  A) The builder builds it, in steps shown to you (the layout first, then the cards, then the map's restyle) *(recommended)*
  B) A Fable card, like D.9
  Builder recommends A: it changes one screen and the way it lists scenarios, not the scenarios themselves.

## Answered

- **The backlog is clear: what should the builder take next? (builder, 2026-10-02)** Everything you answered is
  built, through v1.137 on Builder sessions (CI green), and every Found in play bug is closed. What is left is parked
  by your own calls: D.1 no new zone yet (C, 1 Oct), D.2 online held until the v2 zones are done (C, 30 Sep), D.7
  towers parked until jumping has been played (C, 30 Sep). Jumping (v1.105) has been on itch since 30 Sep.
  Options:
  A) D.7's first piece: a treehouse with a ladder on a small new map. Climb with W at the ladder, jumping off empties
     your stamina, a kid can hold the platform.
  B) D.2's first piece only: the title screen offers Campaign, Online (greyed, "coming soon") and Options, with the
     settings moved into Options. No networking.
  C) The next zone after all: a high school's grounds (made-up name): fields, bleachers, portables.
  D) Nothing new: the builder waits for your playtest of v1.130–v1.137 (Northcliff, the Loadout kid, the lot
     free-for-all) and the critic's reports.
  Builder recommends **A**: it is the one parked item whose condition (jumping in play) is met, and it adds a new
  kind of fight without a new zone to playtest.
  Michael: **A) D.7's first piece: a treehouse with a ladder on a small new map**. (2026-10-02)

- **D.1 after Northcliff: another zone, or not yet? (builder, 2026-10-01)** Your A is built: Northcliff Trace (v1.130),
  houses on a hill above a creek, with four scenarios (v1.131): Down by the Creek 1v1, The Stoneglen Twins 3v3, Hold
  the Creek Fort defend, Bellfield After Dark night 4v4. All nine Northcliff kids play there. It is last on the ladder,
  so nothing is "coming soon" now. Your D.1 note listed more places. Options:
  A) A high school's grounds next (made-up name): fields, bleachers, portables.
  B) A country-club pool and golf course (made-up name).
  C) No new zone for now: the Loadout screen (D.5 C, your A) and the found-in-play bugs first.
  Builder recommends **C**: D.5 C is answered and waiting, and five zones is a lot to playtest before a sixth.
  Michael: **C) Not yet: Loadout screen and bugs first** (control room). (2026-10-01)

- **Riverside Market free-for-all: how should the opening play? (builder, 2026-10-01)** The critic found Everybody
  for Themselves decided in the second after the 2.5 s hold. Reproduced on v1.128: in 8 of 8 openings 3–4 of the 6 kids
  are out by 3.8 s, Tyler first at 2.6 s, because the six starts stand on the lot's two side lines (x = ±34) in sight
  of each other. I tried six starts beside parked cars, every one blocked from every other, 23 m apart: the opening
  spreads out (first out 3.9–4.6 s, 1–2 out by 5 s, 1–2 by 15 s), but the kids then turn on you: standing at the
  midfield start you are tagged at 4–7 s instead of 10–20 s, and two kids (Jamie, Brooke) never move or fire in 60 s,
  so `tests/market-lot.test.mjs` fails. Not committed. Options:
  A) Hidden starts as tried, and FFA kids go looking after the hold (a roam, so nobody camps); your start stays mid-lot.
  B) Hidden starts, and your start goes behind a car at the lot's edge too, so you are one of seven hidden kids.
  C) Keep today's starts and give free-for-alls a longer opening hold (about 6 s) so everyone can find cover first.
  D) Leave it: the scramble at the start is the mode.
  Builder recommends **B**, with A's roam if kids still camp: it makes the start fair for everyone, you included.
  Michael: **B) Hidden starts, and your start goes behind a car at the lot's edge too, so you are one of seven hidden kids** (control room). (2026-10-01)

- **D.3 step 4 is done: every map has Winnmark's pieces (builder, 2026-10-01).** Your A (carry Winnmark's pieces to
  the other maps) is built: Bunratty's houses, cars, trees, props and fort (v1.125), the lot's cars and trees and the
  Hollow's hardwoods (v1.126), and Bunratty's S-curve road with a gutter and kerb (v1.127). The Hollow's pines stay
  the old three-cone pine. Collision is unchanged everywhere. Screenshots in `tests/out/` (bunratty-houses,
  lot-cars, hollow-trees, bunratty-road); in game once Builder sessions is merged. Options:
  A) D.3 is done; the builder moves on down the backlog.
  B) One more piece first: a new low-poly pine for the Hollow, to match the hardwoods.
  C) Change something on the other maps first (say what in a note).
  Builder recommends **A**: your list (houses, cars, people, trees, roads) is covered on every map; the pine can wait
  for a look in play.
  Michael: **A) D.3 is done; the builder moves on down the backlog** (control room). (2026-10-01)

- **D.5 C, the Loadout screen with a 3D kid (builder, 2026-10-01).** Your note: the Loadout screen should show a
  character model and what is equipped on each part of the body, with its own mesh for each item. Today it is three
  text lists (slots 1–4, items you own, worn gear). The bathroom mirror already renders your kid turning in a panel.
  Options:
  A) Your kid turns in a panel on the Loadout screen, wearing what is equipped (eyewear, armour pieces, shoes, belt and
     holster, the slot-1 gun in hand), each piece its own mesh, with a label from each body part to its item; the
     lists stay beside it. Built in steps: the kid, gun and labels first, then the gear meshes a group at a time.
  B) The kid and gun only, worn gear as labels on the body; no new gear meshes yet.
  C) Hold C until you have played the new shop tabs (v1.128).
  Builder recommends **A**, in steps, each shown to you like D.3.
  Michael: **A) Kid in a panel wearing all the gear, in steps** (control room). (2026-10-01)

- **D.1, the next zone (builder, 2026-10-01).** The backlog says Northcliff comes next "when this item comes round
  again", but the D.1 answer only chose the parking lot first; the order after it was the builder's recommendation,
  not yours, and D.2 (online) waits until "the v2 zones are done". Options:
  A) Northcliff / Martin's Landing next (houses on a hill above a creek).
  B) A high school's grounds (made-up name, per your C on names): fields, bleachers, portables.
  C) A country-club pool and golf course (made-up name).
  D) No new zone for now; finish D.5 and the found-in-play bugs first.
  Builder recommends **A**: it is another street, so it reuses every polished piece, and it was next on the list.
  Michael: **A) Northcliff / Martin's Landing next (houses on a hill above a creek)** (control room). (2026-10-01)

- **D.3 step 3, the kids are done (builder, 2026-10-01).** Your A (control room, 1 Oct) is built, on every kid on
  every map: faces (v1.118: rounded head, eye whites and irises, brows, nose, ears, a smile; glasses you can see the
  eyes through), hands (v1.119: a fist with a thumb and fingers), clothes (v1.120: tucked shirts with a collar and a
  chest stripe or pocket, belts, jeans with seams and cuffs, sneakers on white soles). Hitboxes unchanged. Screenshots
  in `tests/out/` (kid-faces, kid-hands, kid-clothes); in game, any match or the bathroom mirror once Builder sessions
  is merged. Options:
  A) Good, go on: carry Winnmark's houses, cars, trees, fort, props and road to Bunratty, the Hollow and the lot.
  B) A, and first give the mirror rows for eye colour and shirt front (stripe, pocket, plain) now the meshes exist.
  C) Change the kids first (say what in a note).
  Builder recommends **B**: the mirror rows are a short job on what is already built, and D.6 was waiting on them.
  (Builder, v1.123: the mirror rows were D.6 work already answered, so they are built: Eyes and Shirt front. B now
  means the same as A.)
  Michael: **A — Good, carry Winnmark's pieces to the other maps**. (2026-10-01)

- **D.5 B, re-sorting the shop: the list first (builder, 2026-10-01).** Your note asked whether the tabs and groupings
  make sense, keeping the early-2000s look. Today's five tabs: **BBs** (four restock packs; seven BB colours),
  **Loadout** (Utility Belt, Drop-Leg Holster; three speed loaders), **Guns** (eight guns; each gun's page holds its
  magazines and spare mags), **Accessories** (red dot, 4× scope, two lasers, flashlight), **Equipment** (six eyewear,
  four armour pieces, four shoes). What doesn't fit: "Loadout" mixes the belt and holster (gear you wear) with speed
  loaders (ammo you use up), and the name clashes with the Loadout screen. Options:
  A) Four tabs by what it's for: **Guns** (unchanged, mags inside), **Ammo** (BB packs, speed loaders, BB colours),
     **Gear** (Belt & Holster, eyewear, armour, shoes), **Mods** (sights, lasers, flashlight). Same rows and look.
  B) Keep the five tabs, move the two misfits: speed loaders to BBs, Belt & Holster to Equipment; the Loadout tab goes.
  C) Leave the tabs; only rename "Loadout" to "Belt & Holster" and move the speed loaders to BBs.
  Builder recommends **A**: four tabs a kid can guess from the name, nothing lost, nothing new to learn on the rows.
  Michael: **A — Four tabs: Guns, Ammo, Gear, Mods**. (2026-10-01)

- **D.3 after step 2: Winnmark's street is done (builder, 2026-10-01).** Step 2 (your A) is built: the cars (v1.112),
  trees and bushes (v1.113), the kid forts (v1.114), the bins, boxes and plywood stacks (v1.115), and the road with
  a gutter and rolled kerb (v1.116), all on Winnmark only, with collision unchanged. Screenshots in `tests/out/`
  (winnmark-cars-bulb, winnmark-trees, winnmark-fort, winnmark-props, winnmark-road); in game, any Winnmark match
  once Builder sessions is merged. Your note also listed people. Options:
  A) The kids next (faces, hands, clothes). They're the last thing in your list, and they show on every map at once.
  B) Carry Winnmark's new houses, cars, trees, fort, props and road to Bunratty, the Hollow and the lot.
  C) Change something on Winnmark first (say what in a note).
  Builder recommends **A**, then B: it finishes Winnmark end to end as you asked, and B is mostly wiring once the
  pieces are settled.
  Michael: **A — The kids next**. (2026-10-01)

- **D.3 step 1, Winnmark's houses (builder, 2026-09-30).** Your D answer asked to see each step before the next.
  v1.104 rebuilt Winnmark's eight houses: hip roofs with even eaves and gutters, a gable over the door with a round
  vent, framed windows with shutters, a panelled door under a hood, a chimney (`tests/houses.test.mjs` writes a close-up
  to `tests/out/houses-winnmark-seth.png`; in game, any Winnmark match). Bunratty keeps the old house. Options:
  A) Good, go on to step 2 (Winnmark's cars, then trees and hedges, the fort and yard props, the road and kerbs).
  B) A, and give Bunratty the new house now too.
  C) Change the houses first (say what in a note).
  Builder recommends **A**: finish Winnmark, then carry every piece to the other maps at once.
  Michael: **A — Good, go on to step 2**. (2026-09-30)

- **Real place names on screen (D.1 follow-up; producer, 2026-09-30).** The D.1 answer (B, the parking lot) left open
  whether real business and school names can appear in the game. The builder named the new store "Riverside Market",
  made up, and the maps already use real road names (Holcomb Bridge Rd). Options:
  A) Real names everywhere: Kroger, Centennial High School, Horseshoe Bend.
  B) Made-up names everywhere, including roads and neighborhoods.
  C) Real roads and neighborhoods, made-up names for stores, schools and clubs (as the game does now).
  Producer recommends **C**: it keeps the place recognizable to people who live there without putting a real
  company's or school's name on a game you publish.
  Michael: **C — Real roads, made-up stores and schools**. (2026-09-30)

- **D.1, maps from real places (Michael, 2026-09-28; builder, 2026-09-30).** Which new zone first? A) Northcliff /
  Martin's Landing; B) a grocery store parking lot; C) Centennial High School grounds; D) Horseshoe Bend pool and golf
  course. Builder recommended B, then A.
  Michael: **B — Grocery store parking lot**. (2026-09-30) Real names on screen: not answered; asked under Pending.

- **D.2, online play (Michael, 2026-09-28; builder, 2026-09-30).** A) title screen only, Campaign / Online (greyed) /
  Options; B) A plus a 1v1 invite-code prototype; C) hold all of it until the v2 zones are done. Builder recommended A.
  Michael: **C — Hold all of it until the v2 zones are done**. (2026-09-30)

- **D.3, mesh polish pass (Michael, 2026-09-29; builder, 2026-09-30).** A) houses first; B) kids first; C) cars and
  trees first; D) one map end to end, Winnmark. Builder recommended D, each step shown to Michael before the next.
  Michael: **D — One map end to end: Winnmark**. (2026-09-30)

- **D.4, jumping onto and over things (Michael, 2026-09-29; builder, 2026-09-30).** A) height-aware collision, stand on
  anything under ~1 m; B) A plus a sprint vault; C) vault only. Builder recommended A.
  Michael: **A — Jump onto and over low things**. (2026-09-30)

- **D.5, loadout, shop and unlock screens (Michael, 2026-09-29; builder, 2026-09-30).** Which first? A) Utility Belt
  rename and re-describe; B) re-sort the shop; C) Loadout screen with a 3D kid. Builder recommended A, then B, then C.
  Michael: **A — Utility Belt: rename and re-describe unlocks**. (2026-09-30)

- **D.6, character creator (Michael, 2026-09-29; builder, 2026-09-30).** A) at NEW GAME; B) at a mirror in the bedroom;
  C) both, the mirror, and a new save opens on it once. Builder recommended C.
  Michael: **C — Both: the mirror, and a new save opens on it once**. (2026-09-30)

- **D.7, towers, ladders and ramps (Michael, 2026-09-29; builder, 2026-09-30).** A) a treehouse with a ladder, new map
  only; B) the same on the existing Treehouse map; C) park it until D.4 has landed and been played. Builder
  recommended C.
  Michael: **C — Park it until D.4 has landed and been played**. (2026-09-30)

- **Devon's opening shot in Two in the Yards (Found in play, critic v1.86; builder, 2026-09-29).** Devon (sniper,
  `brooke_backyard`) has a clear line to the player's `road_east` spawn from the first frame, 37 m off, and fires at
  0.77–0.93 s after BEGIN; the critic saw a standing player tagged at ~1.5 s in 3 of 9. A) an opening hold for every
  gunner kid in every scenario, no shot in the first 2.5 s after BEGIN; B) sniper only, the first shot waits a bolt
  cycle; C) move Devon's start out of sight of the road; D) leave it. Builder recommended A.
  Michael: **A — 2.5 s opening hold for every kid, every map**. (2026-09-29)

- **A.1, first-timers can't find the way out (critic, 2026-09-28).** The critic proposes making the hall's front door an
  interactable that opens the map (docs/proposals.md, "The front door goes outside"). A) yes, as proposed; B) only a
  first-visit hint pointing at the map table; C) leave the bedroom as it is and fix only the map pin overlap.
  Michael: **A — the front door opens the map** (prompt "Go outside", label OUTSIDE; map table stays; fix the map
  label overlap in the same session). (2026-09-29)

