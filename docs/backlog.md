# Backlog

Worked top-down by the builder, one item a run. `~~done~~ — v1.NN` when finished. Michael reorders freely.
Items marked **(design)** need his call in `docs/decisions.md` before code.

## A. Players (itch.io)
1. ~~First-time players may not find how to start a match. itch.io comment (July 2026) complains they "cant go outside"
   to play. Find what a new player sees between NEW GAME and the first scenario, and propose the fix **(design)**.~~
   — done, v1.88 (Michael: A — the front door opens the map; map label overlap fixed)

## B. Bugs
1. ~~Cars sink into the ground on slopes. Re-derive the car's base Y from the lowest wheel contact on the ground
   normal, not the centre sample (devlog v1.78–v1.85).~~ — done, v1.87
2. ~~Walk-anim intensity uses last-frame displacement: an anti-wedge teleport may pop a one-frame sprint swing.
   Clamp it when a teleport happens (v1.78).~~ — done, v1.89
3. ~~Kids fire into obstacles right in front of them: about a quarter of enemy BBs hit something within 3 m, before
   the target (v1.92, `tests/cover-fire.test.mjs`). The v1.77 lift reads only `Game.scenario.cover`, not fences,
   walls or houses, and measures cover from its centre. Check the shot's first 3 m against every obstacle and lift
   over it, or hold fire and move, within the 0.7 m cap. Target: under 3% of shots.~~ — done, v1.93 (0.4–2.2% now)

## C. Check in play (from the devlog's "Still open")
1. ~~Enemy laser-to-sky: confirm fixed on Bunratty with a living kid after v1.83–v1.85.~~ — done, v1.91 (standing test, none found)
2. ~~Over-cover muzzle lift reach 1.6 m: any into-cover shots from ~2 m back? (v1.77)~~ — checked, v1.92: yes, ~7% of enemy
   shots; worse, ~18% bury inside 1.6 m. Now B.3.
3. ~~ADS-tall hold 0.45 s: pose steady through an auto burst on the all-auto night map? (v1.77)~~ — checked, v1.94: yes
   after fixing a v1.93 slip (hold-fire skipped the aim-hold re-arm); standing test `tests/burst-pose.test.mjs`
4. ~~Small-gun full-aim hands sit ~4 cm off the grip at max extension (v1.80).~~ — checked, v1.95: 0.0 cm now, standing
   and crouched (`tests/grip.test.mjs`)
5. ~~Large-gun off hand sits 2.7–3.5 cm short of its foregrip in every pose (v1.95). Does it show on screen?~~ — checked,
   v1.97: no; the hand's centre is 0–1.8 cm from the gun body, so the hand box wraps it (`tests/grip.test.mjs`)

## D. Michael's ideas
<!-- the producer files Michael's notes here, in his words, with the date -->
1. More maps, locations and scenarios, based on real places around where the game sits (East Roswell / Chattahoochee
   River): e.g. a Centennial High School level, a parking lot skirmish, Horseshoe Bend Country Club pool / golf course,
   a grocery store battle. (Michael, 2026-09-28) **(design)** — Michael: **B**, a parking-lot zone first (control room,
   30 Sep). ~~The lot zone~~ — done, v1.102–v1.103: the Riverside Market lot, fourth on the ladder, five scenarios
   (Cart Return 1v1, Aisle Wars 3v3, Hold the Doors defend, Everybody for Themselves FFA, After Close night 4v4). v1.103 also fixed
   three ways kids froze while moving (solid car rows, the gunners' wall-follow, two bounding flips; also the critic's
   Whole Block report). Next zone (Michael: **A**, Northcliff, control room 1 Oct): ~~Northcliff Trace~~ — done,
   v1.130 (houses on a hill above a creek from the polished pieces; the pin is live; Down by the Creek 1v1 and The
   Stoneglen Twins 3v3; `tests/northcliff.test.mjs`). ~~More Northcliff scenarios~~ — done, v1.131 (Hold the Creek
   Fort defend, Bellfield After Dark night 4v4 capstone; Fernando's rifle holds the high yard). Northcliff is complete
   at four scenarios. Stoneglen Close and Bellfield Court have no maps of their own; another zone is a new question.
2. Online play: local-host sessions others can join, with a list of hosted servers to pick from. Startup offers
   Campaign (the current game) and Online Multiplayer, and maybe a third for Options/Settings. (Michael, 2026-09-28) **(design)**
3. Meshes across the board need a cleanup / polish pass. Houses, cars, people, trees, roads, etc. (Michael, 2026-09-29)
   **(design)** — Michael: **D**, one map end to end, Winnmark first, each step shown to him before
   the next (control room, 30 Sep). ~~Step 1, Winnmark's houses~~ — done, v1.104 (hip roofs with eaves, cross gable,
   framed and shuttered windows, panelled door, gutters, chimney; Winnmark only). Step 2 (Michael: A, go on): ~~cars~~
   — done, v1.112 (a profiled sedan with arches, glass, pillars, lights, plates, mirrors, hubcaps; same collision);
   ~~trees and hedges~~ — done, v1.113 (low-poly trees with limbs and clumped crowns, clumped shrubs); ~~the kid fort~~
   — done, v1.114 (plywood sheets on a frame, posts, bracing, KEEP OUT; same wall boxes); ~~the yard props~~ — done,
   v1.115 (moulded wheelie bins, taped moving boxes, plywood stacks with a lawn chair; same collision; mailboxes kept); ~~the road and
   kerbs~~ — done, v1.116 (one road mesh on the ground, gutter and rolled kerb dropped at driveways, manholes, drains).
   Step 2 is complete. Step 3 (Michael: A, the kids next: faces, hands, clothes; control room, 1 Oct): ~~faces~~ — done,
   v1.118 (rounded head; eye whites, irises, pupils, brows, nose, ears, mouth; open glasses frames; every kid, every map).
   ~~Hands~~ — done, v1.119 (a fist with a thumb, curled fingers and a wrist step, same node and grips). ~~Clothes~~
   — done, v1.120 (tucked shirt with yoke and collar, sleeve hems, jeans seams and cuffs, belt, sneakers on white soles,
   per-kid chest stripe or pocket and shoe colour). Step 3 is complete. Step 4 (Michael: A, carry Winnmark's pieces
   to the other maps; control room, 1 Oct): ~~Bunratty~~ — done, v1.125 (houses, cars, trees and bushes, bins, boxes,
   plywood stacks, the bulb fort; same collision; `tests/bunratty-polish.test.mjs`). ~~The lot's cars and trees, the
   Hollow's hardwoods~~ — done, v1.126 (pines stay pines; `tests/lot-hollow-polish.test.mjs`). ~~Bunratty's S-curve
   road and kerbs~~ — done, v1.127 (Winnmark's road builder shared as `buildStreetRoad`; `tests/bunratty-road.test.mjs`).
   Step 4 is complete.
4. ~~We should add the ability to jump on / over objects. Maybe even a 'vault' ability. (Michael, 2026-09-29) **(design)**~~
   — done, v1.105 (Michael: A — jump onto and over low things; stand on anything up to 1.05 m; no vault)
5. Revisit some of the interfaces, like the 'Your Loadout' interface (should probably show a character mesh/model, and
   what they have equipped on each part of the body; unique meshes for each item). The online shop is a bit wonky: see
   if the tabs / item groupings make sense, but do NOT lose the early 2000s website aesthetic. The loadout unlocks are
   something you wouldn't 'buy'... maybe rename it to like 'Holster' or 'Utility Belt' and the description informs what
   it unlocks for you. (Michael, 2026-09-29) **(design)** — Michael: **A** first (control room, 30 Sep). ~~A, the Utility Belt~~ — done,
   v1.106 (slot 3 is the Utility Belt, slot 4 the Drop-Leg Holster; texts say what each unlocks). ~~B, re-sort the shop~~ —
   done, v1.128 (Michael: A — four tabs: Guns, Ammo, Gear, Mods; `tests/shop-tabs.test.mjs`). C (Loadout screen with a
   3D kid; Michael: **A**, in steps, control room 1 Oct): ~~step 1, the kid, gun and labels~~ — done, v1.132 (your kid
   turns in a panel holding the slot-1 gun, a line from each body part to its item; `tests/loadout-kid.test.mjs`).
   Step 2: the gear meshes on the kid, a group at a time (eye pro, armour, shoes, belt and holster).
6. A character creator at the start of the game. Choose your height, shape, hair, eyes, skin color, clothing color /
   style, etc. (Michael, 2026-09-29) **(design)** — Michael: **C**, the mirror, and a new save opens on it once (control room,
   30 Sep). ~~Part 1, the bathroom mirror~~ — done, v1.107 (height, build, hair, hair colour, skin, shirt, pants,
   glasses; saved). ~~Part 2~~ — done, v1.108 (NEW GAME opens on the mirror once; height moves the eye line and
   hitbox ±8 cm). Eye colour and clothing style wait on new face and clothing meshes (built in v1.118–v1.120: the face
   takes `eyeColor`). ~~The mirror rows for eye colour and shirt front~~ — done, v1.123 (Eyes: brown, hazel, green, blue,
   gray; Shirt front: plain, stripe, pocket; saved, old saves get brown and plain).
7. Towers / ladders / elevated structures. Climb a ladder / walk up a ramp to elevated ground; you can jump off, but
   with a penalty like zeroing out your stamina instead of fall damage. Good setups for NPCs in scenarios. They don't
   need to be overlaid on the existing maps; a note for future builds. (Michael, 2026-09-29) **(design)**

## Found in play
<!-- the critic appends here, one line each with the version and the steps -->
- ~~**v1.126 (builder) — fix before Builder sessions merges.** Since v1.125, Bunratty Infection's Mitchell can spend the whole round at (−26.8, 25.3), held by a bin (−26.4…−25.2, 24.8…25.8), a moving box and a plywood stack in his backyard; `tests/taggers.test.mjs` fails its low-frame-rate pass (every third step 0.05 s) in about half the runs (v1.124: 0 of 3). v1.125's detailed props have the same collision boxes, but they draw from the per-scenario seeded RNG (`withSeededRandom`) in a different order, so the board changed. Either fix the tagger's way out of a three-prop pocket (v1.121 gave gunners a back-out after two blocked turn-rounds; taggers have only v1.100's sidestep commitment), or make the detailed builders draw the same random numbers as the old ones so every board stays as it was. Steps: `g.scenario('bunratty_infection')`, `Game.player._infected = true`, 45 s of `stepGame(f % 3 ? 1/60 : 0.05)`, read Mitchell's `pos`.~~ — done, v1.126 fix-up (the straight step's slide cancelled the fence detour's to the millimetre at the bin's west face; while a detour moves him there is no slide, a detour that slides one component is no longer banned as failed, and under 0.3 m net in 0.5 s counts as wedged; 10 of 10 mixed-step rounds reach the player)
- ~~v1.86 — Result flips from YOU'RE OUT to YOU GOT THEM and pays both: `checkWinCondition`'s `setTimeout(endScenario('win'), 600)` (and the timer win in `updateScenarioTimer`) don't check `Game.mode`; a BB in flight inside that 600 ms tags the player → lose, then win. Steps: `g.scenario('bunratty_sean')`; `Sean.health=0; checkWinCondition(); applyBBHit({}, Game.player)`; wait 1 s — cash +$1 then +$3. Seen naturally on Night Lane.~~ — done, v1.90
- ~~v1.86 — World map: the locked Battleground pin's hit box covers the Winnmark label; clicking "Winnmark Ct · Horseshoe Bend" on a new save shows the Battleground lock. Steps: NEW GAME → map table → click the Winnmark label text.~~ — done, v1.88
- ~~v1.86 — 1v1 win result shows doubled quotes (`Sean flinches. ""Ow! Yeah, that's a hit.""`): `flavor.hit` strings already carry quotes and the template adds more. Steps: win any 1v1.~~ — done, v1.96
- ~~v1.86 — Result grammar: "Mitchell come walking out" (Night Lane win, one name, plural verb); "…Sean, and Ryan, regroup near the road" (Hollow 3v3 loss, stray comma, allies listed with enemies).~~ — done, v1.96
- ~~v1.86 — The YOU'RE OUT → YOU GOT THEM double payout has two more paths: the tagger's `setTimeout(endScenario('infected'), 200)` against the timer win's 400 ms (Infection: +$2 then +$8), and `last_team_standing`'s 600 ms timeout (Hollow 3v3: +$2 then +$6). Guard all five delayed `endScenario` calls on `Game.mode === 'scenario'`. Steps: `g.scenario('bunratty_infection')`, `timerRemaining = 0.05`, 2 steps, tagger 0.5 m from player, 1 step, wait 1 s.~~ — done, v1.90
- ~~v1.86 — Bunratty Infection: Mitchell (spawn −29, 25) is stuck behind the backyard fence the whole round: 3 m moved in 90 s, 66 m from the player, always `chasing`. Steps: `g.scenario('bunratty_infection')`, player unkillable, spin 90 s in chunks, read Mitchell's `pos`.~~ — done, v1.98 (a box, not the fence: the fence detour now gives way to the wall-follow when it makes no progress)
- ~~v1.86 — Two in the Yards: Devon (sniper) fires 0.75–0.97 s after BEGIN from 37 m at the spawn and tags a standing player at ~1.5 s in 3 of 9 runs; one life, so the match can end before the player has moved. Steps: `g.scenario('winnmark_two_in_the_yards')`, stand still, spin 120.~~ — done, v1.101 (Michael: A — no kid fires in the first 2.5 s after BEGIN, any map)
- ~~v1.86 — More result grammar: "Seth and Ryan, Devon, Sean, and Mitchell take the fort" (South Fort lose); "…Nick, and Mitchell starts trudging home" (Infection win); "Ryan, Mitchell, regroup" (Brothers lose).~~ — done, v1.96
- ~~v1.86 — Night Prowl: Seth wedges in state `advancing` at (−5.3, −10.6) behind the car for 45–110 s, neither moving nor firing, once the player closes to ~14 m. With the mag empty, only a forfeit ends the round. Steps: `g.scenario('winnmark_night_prowl')`, walk the player to about (5, −2), spin 60 s in chunks, read Seth's `state`/`pos`. Seen 3 of 3 runs.~~ — done, v1.99 (a wedged bound re-picked the same cover every frame; it now rests bounding 1.5 s)
- ~~v1.96 (builder) — Intermittent page errors `Failed to execute 'connect' on 'AudioNode': Overload resolution failed` (12 at once), seen once in three runs of `tests/result-text.test.mjs` (8 scenario entries, each ended four times). Not seen in any other suite. Something calls `connect()` with an undefined node; find which.~~ — done, v1.96 fix-up (`stopMusic`'s 400 ms cleanup nulled a restarted theme's master gain; `tests/music.test.mjs`)
- ~~v1.98 (builder) — Infection tagger traps, both on v1.97 too (`tests/taggers.test.mjs`, player untaggable at spawn): Marcus stops for good against the tree at (16.4, 22.8) in 3 of 6 runs; the tagger wall-follow flips side after every 0.5 s of stuck time and oscillates round it. And the player's `bulb_center` spawn sits inside a 1.1 m planter wall: taggers from the west stop 5.6 m away against it while the player stands still.~~ — done, v1.100 (a wall-follow sidestep now commits 0.35–1.4 s; all six taggers reach the player)
- ~~v1.102 (builder) — The Hollow: the player spawns facing the back wall of the south fort. `buildHollowScene`'s `team_b` spawn has `yaw: Math.PI`, but yaw 0 faces −z (the field); every Hollow scenario that spawns on `team_b` opens looking at the flag pole. Steps: `g.scenario('hollow_skirmish_3v3')`, spin 2, screenshot.~~ — done, v1.109 (the two fort yaws were swapped; `tests/spawn-facing.test.mjs`)
- ~~v1.101 — The Whole Block: Seth freezes in `advancing` at (24, −1.4) behind the grey van, 4 m from a player at (28, 0.1), for 83 s of 90 without a shot (4 of 5 runs); Marcus the same at (20.8, 5.9), 81 s (2 of 5). The same wedge as Night Prowl's Seth, but in plain `advancing`, whose wall-follow has no sidestep commitment (v1.100 Still open). Steps: `g.scenario('winnmark_whole_block')`, player at (28, 0.1), drop hits on the player, spin 90 s in chunks, read Seth's `pos`/`state`.~~ — done, v1.103 (the bounding flips; `tests/whole-block.test.mjs`)
- ~~v1.101 — Priya's Pincer: Priya parks at (−5, 2) in `advancing`, 39 m from the `bulb_center` spawn, for 37–60 s and never flanks (3 of 6 runs, plus one where she tagged the player from there at 15.6 s). Steps: `g.scenario('bunratty_pincer')`, stand at spawn, drop hits on the player, spin 70 s, read Priya's `pos`/`state`.~~ — checked, v1.111: not reproduced on v1.109–v1.110 (0 of 9 rounds; likely cured by v1.103); standing test `tests/pincer.test.mjs`
- ~~v1.101 — BBs faster than 36 m/s pass through thin walls: `updateBBs` tests obstacles only at each 1/200 s sub-step's end point, so a BB moving more than a wall's thickness per sub-step skips it. Bunratty planter wall (18 cm): 0% through at 30 m/s, 18% at 45, 42% at 60, 61% at 75, still able to tag; a real Pincer loss came through it. Sweep oldPos→pos (`obsRayDist`) instead. Steps: `g.scenario('bunratty_pincer')`; `makeBB` at (28.4, 1.2, 2), velocity (60, 0, 0), `curveStrength = 0`; `updateBBs(1/200)` ×20; count `pos.x > 29.1` with `canDamage`.~~ — done, v1.110 (the sub-step now sweeps oldPos→pos; 0% through at 30–150 m/s, `tests/bb-sweep.test.mjs`)
- ~~v1.101 — Result lines that don't fit the map: Pincer's lose reads "…take the fort" (a cul-de-sac); Juggernauts and The Big Game lose on "…regroup near the road" (the woods). Steps: lose any of the three.~~ — done, v1.117 (Pincer takes the cul-de-sac, Hold the Doors the doors; the Hollow regroups back in the trees and sits down in the leaves)
- ~~v1.110 (builder) — Hollow 3v3 in `tests/cover-fire.test.mjs`: held trigger pulls (a kid pulls with a wall inside 3 m, so no BB) swing from 19 to 199 per run on the same build (v1.109: 20 and 101). At 199 the suite's 25% limit fails. Find which kid is holding over and over, and where. Steps: `node tests/cover-fire.test.mjs` a few times; log `held` per kid in hollow_skirmish_3v3.~~ — done, v1.122 (one kid a run in a fort corner, sent for cover past the wall; kids now only take cover they can walk straight to; also a burst-queue crash; `tests/hollow-held.test.mjs`)
- ~~v1.110 (builder) — Harness: a suite now and then stalls in `g.bedroom()` right after NEW GAME. The page stops answering `page.evaluate` and the suite sits until run.mjs's 10-minute timeout (utility-belt, front-door and music once each, 30 Sep; each passed alone; Chromium logged SSL handshake failures just before the music stall). CI would count it as a failure. (Builder, 1 Oct: three more in two full runs, market-lot, walk-anim, winnmark-trees, each at `g.bedroom()`'s first evaluate after NEW GAME; all passed alone.) (Builder, v1.122: `cars` the same, but as "Target page, context or browser has been closed" at `g.bedroom()`, so the browser can die there, not only hang.) (Builder, v1.123: reproduced off-suite, 6 boots in parallel: 2 of 120, then 6 of 150, ~2–4%. Split into steps it
  hangs in `enterBedroom()` (3 of 3 placed; 3 more hung earlier, at page load), not the mirror or `initAudio`. A CDP
  `Debugger.pause` sent during the hang gets no reply, so the main thread is blocked in native code, not a JS loop:
  most likely SwiftShader/GPU-process sync under load. Next: try launch flags in `tests/lib/game.mjs`
  (`--in-process-gpu` first) against the same 150-boot loop, described in the devlog's v1.123 note. (Builder, v1.124 run: `--in-process-gpu` does not cure it: 1 hang in `g.bedroom()` in 90 boots with it, 2 in 90 without, the two interleaved in one 6-browser loop. The v1.123 "hangs at page load" were Playwright's 30 s `page.goto` limit under load, not hangs: with 70 s, 0 of 180 at load. Next to try: `--disable-gpu-compositing`, or a fresh page and retry when `g.bedroom()` passes 75 s.)~~ — done, v1.129 (survived, not cured: `g.bedroom()` restarts a hung NEW GAME after 75 s in a fresh browser, once; 120 of 120 parallel boots and a full `npm test` each recovered one real stall; `tests/harness.test.mjs`)
- ~~v1.112 (builder) — Gunner wall-follow can pin a kid in a pocket: on the v1.112 Winnmark layout, Night Prowl's Seth stood still in `advancing` for 8.8 s (1 run in 6; 2.1 s in 3 more) at (22.3, 6.1), between a parked sedan's collision box and a 1.25 m post; CI failed `tests/night-prowl.test.mjs` on it (3.0 s) at 4117ad3. v1.113's tree pass moved the cars and the pocket went (0 s in 15 runs), but the cause stands: `advancing`'s wall-follow flips side every 0.5 s of stuck time and oscillates in a pocket, the shape v1.100 fixed for taggers (commit to a sidestep, longer on repeat wedges). Port that to `advancing`; reproduce with `git show 4117ad3:index.html` and the Night Prowl walk. (Builder, v1.117: `advancing` already has the commitment since v1.103, in the direct-push wall-follow; what it lacks is a way out of a pocket. With both sides blocked, a committed sidestep that can't move turns round at once, and the 0.5 s `_advStuck` flip still runs. Likely fix: after two blocked turn-rounds, back off along −(to target) for ~0.5 s before sidestepping again.)~~ — done, v1.121 (two blocked turn-rounds, or 2.5 s without 0.5 m of progress while wall-following, back him out until a sidestep clears the pocket; `tests/pocket.test.mjs`)
- ~~v1.123 (also main v1.117, v1.101) — Storm the North Fort / Night Assault: the player's `team_b` spawn (2, 28) stands in the south fort's front opening (x 0.64–3.36), and a player standing still is tagged within 18 s in 18 of 20 rounds (Night: 10 of 10, median 6 s, Devon's sniper from 55 m, 4 at 3.3 s). Steps: `g.scenario('hollow_attack_north_fort_night')`, don't move, step until `hitsTaken` is 1; screenshot docs/critic/2026-10-01-storm-north-fort-spawn-in-doorway.png.~~ — done, v1.124 (the spawn is at the back-left of the fort, (0.5, 32.3), off Devon's line through the port; 0 of 28 standing rounds tagged in 18 s; `tests/fort-spawn.test.mjs`)
- v1.123 — Riverside Market free-for-all (`lot_ffa`) is decided in the second after the 2.5 s opening hold: in 5 of 5 openings, 3–4 of the 6 kids were out between 2.6 and 3.6 s (Tyler first every time, 2.6–2.8 s), because every start is in sight of another kid. Steps: `g.scenario('lot_ffa')`, drop hits on the player, step until each kid's `health` is 0, log the times. (v1.103's Still open suggested starts behind cars.) (Builder, v1.128 run: reproduced, 3–4 of 6 out by 3.8 s in 8 of 8. Hidden starts beside cars spread the opening, but the kids then turn on the midfield player (tagged at 4–7 s, was 10–20 s) and two camp the whole round; a design question is in decisions, **(design)** until answered.)
- v1.126 (builder) — `tests/cover-fire.test.mjs` failed once on v1.126 at 5.3% (limit 5%): in Bunratty Hold the Fort, Sean or Mitchell hiding at (18.7, 6.8) put 51 BBs within 1.6 m into the cabin box of a lane car parked at (20.9, 6.9). The lane cars are a random pick from fixed slots each build, and the slot at (21.1, 6.9) is drawn on v1.124 too; on probes the near shots showed in 2 of 6 rounds on v1.126 and 0 of 6 on v1.124, which is within chance. The v1.93 clear-line check passes the line, so the BBs go in on spread or under the 10 cm margin. Steps: `bunratty_hold_the_fort` with that car drawn, player unkillable, log enemy BBs that hit an obstacle within 1.6 m (the suite's cast).
- v1.130 (builder) — `tests/laser.test.mjs` failed once in a full run (passed before it on v1.129 and twice alone on v1.130): `bunratty_night_team_2v2`, 3 of 215 samples with the dot above the player's head, Ryan in `deploying`, beam 15 m, pitch 9.4°, dot at y 6.32 against a head at 10.98 (so "above" by the 0.5 m-over-the-emitter rule, not the head). Find which rule tripped and whether a deploying kid's laser should aim at the player at all. Steps: `node tests/run.mjs laser` a few times; log the failing samples' kid, state and target.
