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
   a grocery store battle. (Michael, 2026-09-28) **(design)**
2. Online play: local-host sessions others can join, with a list of hosted servers to pick from. Startup offers
   Campaign (the current game) and Online Multiplayer, and maybe a third for Options/Settings. (Michael, 2026-09-28) **(design)**
3. Meshes across the board need a cleanup / polish pass. Houses, cars, people, trees, roads, etc. (Michael, 2026-09-29)
   **(design)**
4. We should add the ability to jump on / over objects. Maybe even a 'vault' ability. (Michael, 2026-09-29) **(design)**
5. Revisit some of the interfaces, like the 'Your Loadout' interface (should probably show a character mesh/model, and
   what they have equipped on each part of the body; unique meshes for each item). The online shop is a bit wonky: see
   if the tabs / item groupings make sense, but do NOT lose the early 2000s website aesthetic. The loadout unlocks are
   something you wouldn't 'buy'... maybe rename it to like 'Holster' or 'Utility Belt' and the description informs what
   it unlocks for you. (Michael, 2026-09-29) **(design)**
6. A character creator at the start of the game. Choose your height, shape, hair, eyes, skin color, clothing color /
   style, etc. (Michael, 2026-09-29) **(design)**
7. Towers / ladders / elevated structures. Climb a ladder / walk up a ramp to elevated ground; you can jump off, but
   with a penalty like zeroing out your stamina instead of fall damage. Good setups for NPCs in scenarios. They don't
   need to be overlaid on the existing maps; a note for future builds. (Michael, 2026-09-29) **(design)**

## Found in play
<!-- the critic appends here, one line each with the version and the steps -->
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
