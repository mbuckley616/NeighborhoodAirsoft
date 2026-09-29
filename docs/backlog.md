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
2. Walk-anim intensity uses last-frame displacement: an anti-wedge teleport may pop a one-frame sprint swing.
   Clamp it when a teleport happens (v1.78).

## C. Check in play (from the devlog's "Still open")
1. Enemy laser-to-sky: confirm fixed on Bunratty with a living kid after v1.83–v1.85.
2. Over-cover muzzle lift reach 1.6 m: any into-cover shots from ~2 m back? (v1.77)
3. ADS-tall hold 0.45 s: pose steady through an auto burst on the all-auto night map? (v1.77)
4. Small-gun full-aim hands sit ~4 cm off the grip at max extension (v1.80).

## D. Michael's ideas
<!-- the producer files Michael's notes here, in his words, with the date -->
1. More maps, locations and scenarios, based on real places around where the game sits (East Roswell / Chattahoochee
   River): e.g. a Centennial High School level, a parking lot skirmish, Horseshoe Bend Country Club pool / golf course,
   a grocery store battle. (Michael, 2026-09-28) **(design)**
2. Online play: local-host sessions others can join, with a list of hosted servers to pick from. Startup offers
   Campaign (the current game) and Online Multiplayer, and maybe a third for Options/Settings. (Michael, 2026-09-28) **(design)**

## Found in play
<!-- the critic appends here, one line each with the version and the steps -->
- v1.86 — Result flips from YOU'RE OUT to YOU GOT THEM and pays both: `checkWinCondition`'s `setTimeout(endScenario('win'), 600)` (and the timer win in `updateScenarioTimer`) don't check `Game.mode`; a BB in flight inside that 600 ms tags the player → lose, then win. Steps: `g.scenario('bunratty_sean')`; `Sean.health=0; checkWinCondition(); applyBBHit({}, Game.player)`; wait 1 s — cash +$1 then +$3. Seen naturally on Night Lane.
- ~~v1.86 — World map: the locked Battleground pin's hit box covers the Winnmark label; clicking "Winnmark Ct · Horseshoe Bend" on a new save shows the Battleground lock. Steps: NEW GAME → map table → click the Winnmark label text.~~ — done, v1.88
- v1.86 — 1v1 win result shows doubled quotes (`Sean flinches. ""Ow! Yeah, that's a hit.""`): `flavor.hit` strings already carry quotes and the template adds more. Steps: win any 1v1.
- v1.86 — Result grammar: "Mitchell come walking out" (Night Lane win, one name, plural verb); "…Sean, and Ryan, regroup near the road" (Hollow 3v3 loss, stray comma, allies listed with enemies).
- v1.86 — The YOU'RE OUT → YOU GOT THEM double payout has two more paths: the tagger's `setTimeout(endScenario('infected'), 200)` against the timer win's 400 ms (Infection: +$2 then +$8), and `last_team_standing`'s 600 ms timeout (Hollow 3v3: +$2 then +$6). Guard all five delayed `endScenario` calls on `Game.mode === 'scenario'`. Steps: `g.scenario('bunratty_infection')`, `timerRemaining = 0.05`, 2 steps, tagger 0.5 m from player, 1 step, wait 1 s.
- v1.86 — Bunratty Infection: Mitchell (spawn −29, 25) is stuck behind the backyard fence the whole round: 3 m moved in 90 s, 66 m from the player, always `chasing`. Steps: `g.scenario('bunratty_infection')`, player unkillable, spin 90 s in chunks, read Mitchell's `pos`.
- v1.86 — Two in the Yards: Devon (sniper) fires 0.75–0.97 s after BEGIN from 37 m at the spawn and tags a standing player at ~1.5 s in 3 of 9 runs; one life, so the match can end before the player has moved. Steps: `g.scenario('winnmark_two_in_the_yards')`, stand still, spin 120.
- v1.86 — More result grammar: "Seth and Ryan, Devon, Sean, and Mitchell take the fort" (South Fort lose); "…Nick, and Mitchell starts trudging home" (Infection win); "Ryan, Mitchell, regroup" (Brothers lose).
- v1.86 — Night Prowl: Seth wedges in state `advancing` at (−5.3, −10.6) behind the car for 45–110 s, neither moving nor firing, once the player closes to ~14 m. With the mag empty, only a forfeit ends the round. Steps: `g.scenario('winnmark_night_prowl')`, walk the player to about (5, −2), spin 60 s in chunks, read Seth's `state`/`pos`. Seen 3 of 3 runs.
