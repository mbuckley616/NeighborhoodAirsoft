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
