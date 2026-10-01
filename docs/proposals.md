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

## 2026-10-01 — The last kid gets bored and comes looking (v1.123)
**Why.** In Squad Up, 4 of 4 watched rounds ended the same way: our allies were out, and Brooke and Jamie (aggression
0.35 and 0.4, under the 0.45 march threshold) sat 32–50 m away in cover. They didn't move for the rest of the round,
and after a while they stopped shooting too. Four on Four's Mitchell and Owen held their end the same way for 150–195 s.
In a `last_team_standing` round with no timer, a player who plays it safe gets a round with no end. Eight of the
roster sit under the threshold. Real kids don't wait five minutes behind a bin. They get bored, yell "come out!", and
come looking. A camper who eventually breaks cover is still a camper, and the kid fantasy keeps the game moving.
**What.** In team and kill-all rounds, once a side is down to its last one or two kids, and none of them has fired a
shot that could reach the player, or moved more than a couple of metres, for 25–30 s, they switch to the
`advancing` they already have (as an attacker would), with a taunt line to say so. The timer resets if they
see and shoot the player. Snipers stay in their nests. Defend rounds aren't touched, because their timer already ends them.
**Cost.** One builder session. It's a per-kid idle timer and a check in `updateEnemies` beside `marchEligible`, plus a
`tryNpcSpeak` line. Add a test that runs Squad Up with the player untaggable at spawn, and fails if the round is still
going at 240 s with no enemy within 25 m.
**Risk.** Low to medium. It could make the low-aggression kids feel the same as the rest late in a round. A kid who
comes looking needs a path, and wedges were the commonest bug of the last week, but v1.121–v1.122 hold up in today's
play.
**Recommendation.** Do it after the two Found-in-play items above. It's small, and it makes sure every team round ends.
