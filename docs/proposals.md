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

## 2026-09-30 — A standing stuck-kid sweep over every scenario (v1.101)
**Why.** A kid frozen in a moving state is now the commonest bug I find, and each one has been caught one map at a
time: Infection's Mitchell (v1.98), Night Prowl's Seth (v1.99), the Infection taggers (v1.100), and today Whole Block's
Seth and Marcus and Pincer's Priya. Each fix came with a test for its own map, but nothing looks at the other 36
scenarios. For a kid, a frozen opponent reads as a broken game. It also breaks kill_all rounds: with ten BBs spent
and a kid wedged out of sight, only F to forfeit ends the round.
**What.** One suite, `tests/stuck-sweep.test.mjs`. It runs every scenario in `SCENARIOS` for 60 s with hits on the
player dropped, twice: once with the player at spawn and once walked 10 m toward the nearest kid. It fails if any
living kid in a moving state (`advancing`, `repositioning`, `chasing`, `deploying`) stays within 1 m for more than
15 s. Sniper nests and `hiding` are exempt. It prints the kid, spot, state and seconds, so each failure is a
ready-made backlog line.
**Cost.** One builder session for the suite (my `tests/tmp/play.mjs` already does the per-kid stillness measure). It
takes about 40 × 2 minutes of CI, so it probably belongs in a nightly job rather than every push. The fixes it turns
up are separate sessions each, though problems 1 and 2 of today's report may share one fix, a sidestep commitment
for `advancing`.
**Risk.** Low for the game (test only). The risk is noise: some parks are design (Devon's nest, Brooke's dig-in), so
the exemptions need care, or the suite will cry wolf and get ignored.
**Recommendation.** Do it after the `advancing` fix, so it starts green and guards the whole roster from then on.
