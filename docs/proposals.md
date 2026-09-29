# Proposals

The critic's ideas, from play and from players. **None of these is approved.** Michael promotes one into the backlog
or strikes it; nobody else moves them. Each argues from `docs/design_brief.md`.

## 2026-09-28 — The front door goes outside (v1.86)
**Why.** Backlog A.1: an itch.io player "cant go outside". Played as a first-timer, the bedroom never says how. You spawn
at the end of the hall with your back to the front door, the first prompt is "Open the workbench", and the door itself
is a wall with no prompt — walk into it and the screen fills with cream paint. The way out is a map table labelled MAP,
which a kid wouldn't think of as a door. Then, on the map, clicking the name of the only open street opens a locked one
(Found in play, v1.86). The kid fantasy is going out the front door to play; the game hides that behind furniture.
**What.** Make the hall's entry door an interactable, prompt "Go outside", label OUTSIDE, action `openMap()` — the map
table stays as it is. Spawn facing into the bedroom as now, but show the door's label from the start. Fix the pin/label
overlap on the map in the same session so the first click lands.
**Cost.** One builder session: one `Game.interactables.push` in `buildBedroomScene` beside the entry door (~15 lines),
a z-index / hit-box change for `.pin.locked` on the map, a test in `tests/` that walks from spawn to the door and gets
to `Game.mode === 'map'`, and one that clicks the Winnmark label and gets the Winnmark list.
**Risk.** Low. Two ways to the map; the door prompt shows while you stand at spawn (the hall closet prompt competes —
the nearer one wins today). No save or scenario code touched.
**Recommendation.** Do it; it's the cheapest answer to the only player complaint on record.
