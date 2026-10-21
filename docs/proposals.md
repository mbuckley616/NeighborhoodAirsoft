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

## 2026-10-13 — In a pickup game, a life brings you back (v1.201)
**Why.** The Pickup Game board offers 1, 3 or 5 lives "for everyone, you included". For a kid, a life means getting
tagged, walking back to base and coming back in. For you, it means one more BB you can take where you stand. In 20
headless 4v4 rounds with 3 lives, all three went within 1.1 s in 6 of them. One was a single shotgun blast that landed
3 pellets in one frame, and the others were AK bursts. Picking 5 lives on the board feels like a fair, longer game
against kids who also have 5, but one burst ends it anyway. A kid playing pickup at the cul-de-sac yells "hit!", walks
back to the curb and comes back in. The board should give you that too. Capture the flag and VIP already do it:
`respawnPlayerVip()` sends you back to your start with your hits refilled and `VIP_GRACE` seconds in which nothing tags
you.
**What.** In `pickup_game` only, set `maxHits` to 1 and count your lives separately. Each tag that isn't your last
calls `respawnPlayerVip()` and takes a life, and the HUD's HITS TAKEN circles become LIVES. When the last one goes,
`endScenario('lose')` as now. The ladder isn't touched, since its matches are written around one hit.
**Cost.** One builder session. That's a `Game.scenario.playerLivesLeft` counter, a branch in `applyBBHit` beside the
VIP/CTF one, the HUD label, and a test: a 3-life pickup game in which three hits in one frame cost one life, and three
separate tags with respawns end it.
**Risk.** Low. The respawn code is already played every day in Flags and VIP. A 5-life 4v4 lasts longer, which is
the point, but with no clock that could mean long rounds. The clock is already step 4 of D.22.
**Alternative.** Keep hits as lives and change the words to "you can take 3 hits". It's cheaper and honest, but it
leaves the shotgun able to take three at once.
**Recommendation.** Do it as part of D.22's next step, before anyone plays the board for real. It's the board's main
promise.

## 2026-10-19 — A bullseye inside 10 m at the range (v1.272)
**Why.** The range (v1.257) has two scored targets, the cardboard bullseyes at about 15 and 20 m. With the Spring
Pistol every player starts with, standing still and aiming dead centre, BBs land a median 49–54 cm off at 15 m and
94–99 cm at 20 m, mostly low, from the hop-up curve. On the boards: 1 of 12 at 15 m, 0–1 of 12 at 20 m, 2 of 15 from the
bench at the near one, 0 of 15 at the far one. At 5 m, 12 of 12 land within 9 cm, and at 10 m, 8–9 of 12 are on the
board (critic, 19 Oct). The brief's gimmick is "reliable inside ~10 m, increasingly random beyond", and the range is
where a kid should see that line for himself. Right now the scoring starts past it, so the scored part of the range
says only "you miss".
**What.** Move the near bullseye in to about 8 m and leave the far one at 20 m, or add a third one at 8 m. The tally
then shows a score you can earn next to one you mostly can't, which teaches holding over at range. Optionally, the HUD's
"Last:" line could say how far off a miss was ("40 cm low"), so you learn the hold-over at 20 m.
**Cost.** Part of one builder session: one easel position in `buildBackyardRangeScene` (or one more entry in
`R.eyes`), the range test's distances, and a range test that fires the real trigger at the 8 m board and expects most on
it. The "how far off" line is ~10 lines in the range's BB hook.
**Risk.** Low. It's the range only, and no match changes. A target at 8 m in the line of the 15 m one must not hide it.
**Recommendation.** Do the 8 m move. Leave the miss distance for after Michael has shot it himself.

## 2026-10-20 — Deal the free-for-all starts fresh each round (v1.272)
**Why.** Since v1.265–v1.267 every free-for-all start is hidden and the same on every load, which is what Michael
asked for. The kids stand on the same starts too, so the same kid hunts you in every replay. In Last Kid Standing,
Sean's AK (from `ffa_1`, 34.9 m off) tagged me in 5 of 6 rounds. In the Ten-Way, Eric's MP5 (37.1 m off) did the
same, 5 of 6 (critic, 20 Oct). A pushing player meets the same AK at the same second. A kid's free-for-all is a
scramble where you never know who's round the next hedge. The fixed deal makes it a set piece you solve once.
**What.** Keep the hidden starts and the player's start as they are. In a full free-for-all (all of a map's `ffa_N`
used), shuffle which kid gets which `ffa_N` at BEGIN, from the match's seeded random, so the layout stays the same
and only the deal changes. The Pickup Game's subsets keep their fixed order, since "in this order every subset
keeps the rule".
**Cost.** Part of one builder session: a shuffle of the anchors over `enemySetup` in `startScenario`'s ffa branch
(for the four full free-for-alls), plus a test that two BEGINs deal at least two kids differently and every start is
still used once. `ffa-starts` and `lamplight-starts` read the starts, not the kids, so they should hold.
**Risk.** Low. Each start passes the hidden rule whoever stands on it. What changes is who your nearest gun is. A
sniper dealt the start nearest you (`ffa_2` in Bunratty, 23.7 m) could make some rounds harder than any today, so
the test should log the opening tag time over a few deals.
**Recommendation.** Do it, unless Michael wants a free-for-all to be the same puzzle every time. One line in
decisions would settle that.

## 2026-10-21 — Kids keep a body's width apart (v1.282)
**Why.** Two kids standing in one place has now been filed three times, each time fixed for one match: Mitchell
inside Priya in Protect Ryan (20 Oct, fixed in v1.282 by moving his cover), and today Owen inside Mitchell one spot
over. On 21 Oct I timed pairs of living kids with centres under 0.35 m apart. Friday Night Lights had Nathan and
Malik in 8 of 8 rounds (6–8 s) and Nathan and Rebecca in 2 of 8 (17–20 s). Full-Auto Mayhem had Devon and Brooke for
25 s of one round and Mitchell and Ryan for 14 s of another. On screen that's two kids merged into one body with two
heads. In play, the front kid is a shield for the back one, and one BB can only find one of them. The kid fantasy
is a yard of real kids crouched behind the same car, shoulder to shoulder, not inside each other. `teammateCrowding()`
spreads kids over cover when they pick it, but nothing keeps two bodies apart once they're moving, so each match
grows its own case.
**What.** One rule for every kid: after `updateEnemies` moves them, any two living kids closer than about 0.6 m
(two body radii) are each pushed half the gap apart, along the line between them. Each push is checked against the
same obstacle test a kid's own step uses, so nobody is shoved into a wall or off a deck. The player is left out of it
(the player's own collision is a separate question).
**Cost.** About half of one builder session. It's a pair loop in `updateEnemies`: 20 kids is 190 pairs a frame, cheap
next to the line-of-sight calls. Add a check to an existing suite (`stuck-sweep` or `vip`): no two living kids under
0.4 m for more than 1 s, in Protect Ryan, Friday Night Lights and Full-Auto Mayhem.
**Risk.** Medium-low. A kid nudged off his exact cover spot may peek from a slightly worse place. A ring start that
packs eleven kids 0.7–0.8 m apart (v1.277's attack huddle) sits at the edge of the rule and may jostle for a moment.
Two kids sharing a narrow doorway could push each other back and forth, so the push should be capped per frame.
**Recommendation.** Do it, rather than a fourth one-match fix. It ends the class of bug, and Michael's playtests
won't meet two-headed kids.
