# Backlog

Worked top-down by the builder, one item a run. `~~done~~ — v1.NN` when finished. Michael reorders freely.
Items marked **(design)** need his call in `docs/decisions.md` before code.

## A. Players (itch.io)
1. First-time players may not find how to start a match. itch.io comment (July 2026) complains they "cant go outside"
   to play. Find what a new player sees between NEW GAME and the first scenario, and propose the fix **(design)**.

## B. Bugs
1. Cars sink into the ground on slopes. Re-derive the car's base Y from the lowest wheel contact on the ground
   normal, not the centre sample (devlog v1.78–v1.85).
2. Walk-anim intensity uses last-frame displacement: an anti-wedge teleport may pop a one-frame sprint swing.
   Clamp it when a teleport happens (v1.78).

## C. Check in play (from the devlog's "Still open")
1. Enemy laser-to-sky: confirm fixed on Bunratty with a living kid after v1.83–v1.85.
2. Over-cover muzzle lift reach 1.6 m: any into-cover shots from ~2 m back? (v1.77)
3. ADS-tall hold 0.45 s: pose steady through an auto burst on the all-auto night map? (v1.77)
4. Small-gun full-aim hands sit ~4 cm off the grip at max extension (v1.80).

## Found in play
<!-- the critic appends here, one line each with the version and the steps -->
- v1.86 — Result flips from YOU'RE OUT to YOU GOT THEM and pays both: `checkWinCondition`'s `setTimeout(endScenario('win'), 600)` (and the timer win in `updateScenarioTimer`) don't check `Game.mode`; a BB in flight inside that 600 ms tags the player → lose, then win. Steps: `g.scenario('bunratty_sean')`; `Sean.health=0; checkWinCondition(); applyBBHit({}, Game.player)`; wait 1 s — cash +$1 then +$3. Seen naturally on Night Lane.
- v1.86 — World map: the locked Battleground pin's hit box covers the Winnmark label; clicking "Winnmark Ct · Horseshoe Bend" on a new save shows the Battleground lock. Steps: NEW GAME → map table → click the Winnmark label text.
- v1.86 — 1v1 win result shows doubled quotes (`Sean flinches. ""Ow! Yeah, that's a hit.""`): `flavor.hit` strings already carry quotes and the template adds more. Steps: win any 1v1.
- v1.86 — Result grammar: "Mitchell come walking out" (Night Lane win, one name, plural verb); "…Sean, and Ryan, regroup near the road" (Hollow 3v3 loss, stray comma, allies listed with enemies).
