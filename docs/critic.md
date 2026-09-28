# Critic

Daily playtest reports from the critic routine: headless play of the latest build plus the itch.io comments.
Newest entry at the bottom. Old entries are never rewritten.

Last itch comment seen: none yet — itch.io unreachable from the cloud session (2026-09-28); the July 2026 "cant go outside" comment in backlog A.1 predates this file.

Covered so far: new-game bedroom → map (2026-09-28); winnmark_tutorial, bunratty_sean, bunratty_night_lane, bunratty_night_team_2v2 (lasers only), hollow_skirmish_3v3 (2026-09-28).

## 2026-09-28 — First-timer path, tutorial, Bunratty day and night, Hollow 3v3 (v1.86)

What I played: a new game from the title the way a first-timer would (hold W from the hall spawn, turn round to the front
door, find the map table, open the map, click Winnmark); then Backyard Basics (the tutorial), Just Sean (bunratty_sean),
Night Lane (bunratty_night_lane) and the Hollow 3v3 skirmish, with a bot that aims at the nearest enemy, clicks to fire,
holds to cock, and walks in when further than 14 m. Two night matches were run a further 60–90 s with the player made
unkillable, sampling every kid laser every 15 steps. Seven matches, no page errors in any of them. Smoke suite passes.

Results: tutorial won in 30 s (8 shots, 3 tags, 0 hits, +$2). Sean lost in 7 s (5 shots; his AK against a spring
pistol, 1 life). Night Lane "won" in 8 s — see the first problem. Hollow 3v3 lost in 13 s: one life, tagged by Ryan at
~20 m while both allies were still standing, and the match ended there.

### Problems

**1. The match can end "YOU'RE OUT" and then flip to "YOU GOT THEM", paying both.** Every scenario with `kill_all` or
`survive_timer`. `checkWinCondition` ends the round with an unguarded `setTimeout(() => endScenario('win'), 600)`; the
game keeps running for those 600 ms, so a BB already in the air can tag the player. `applyBBHit` then calls
`endScenario('lose')` at once, and 600 ms later the timer calls `endScenario('win')` over the result screen. Measured
with `endScenario` wrapped: Sean lose (+$1) then win (+$3), cash 35 → 39; Night Lane lose (+$2) then win (+$5), 39 → 46.
It happened on its own in the natural Night Lane match: the result reads YOU GOT THEM, +$5, with `hitsTaken 1` of 1
(screenshot `docs/critic/2026-09-28-night-lane-win-after-out.png`). The tutorial's own delayed win already guards with
`if (Game.mode === 'scenario')`; the three calls at `checkWinCondition` and the timer win in `updateScenarioTimer` don't.
Repro: `g.scenario('bunratty_sean')`, then `Sean.health = 0; checkWinCondition(); applyBBHit({}, Game.player)`, and
wait 1 s.

**2. On the map, clicking the words "Winnmark Ct · Horseshoe Bend" opens the locked Battleground.** The Battleground pin's
box (457–695 px × 422–475 px) sits over the left two-thirds of the Winnmark label, so the only unlocked area on a new
save answers a click on its name with "🔒 Clear Bunratty Court … to unlock this area". `elementFromPoint` at the centre of
the Winnmark label returns the Battleground pin. Only the red marker itself opens Winnmark. For a first-timer this reads
as "everything's locked" — a fair candidate for what the July itch.io player hit (A.1). Screenshot
`docs/critic/2026-09-28-map-winnmark-label-opens-locked-pin.png`. The Northcliff label also overlaps the Bunratty pin.

**3. The front door is a wall.** From the spawn, the prompt that greets a new player is "E Open the workbench" (the hall
closet), not anything about going out. Turn round and walk into the door at the end of the hall — the one a kid would
use to go outside — and the camera stops 5 cm from it: a cream screen, no prompt, the workbench prompt still up
(`docs/critic/2026-09-28-hall-front-door.png`). The way out is the MAP table in the bedroom, labelled but never
explained. Holding W from spawn runs you to the computer in 3 s, past the map on your left. Combined with problem 2 this
is my best reading of A.1. Proposal filed.

**4. Every 1v1 win line has doubled quotes.** `Sean flinches. ""Ow! Yeah, that's a hit."" — they're out.` The
per-kid `flavor.hit` strings already carry their quotes and the result template wraps them again. All eight 1v1 kids.

**5. Result grammar in team matches.** Night Lane win: "Mitchell come walking out from behind cover" (one name, plural
verb). Hollow loss: "Eric, Rebecca, Seth, Sean, and Ryan, regroup near the road" (stray comma before the verb, and it
lumps your allies in with the enemies).

**Cars (backlog B.1), numbers.** Wheel centre minus 0.30 m radius against `scenarioGroundY` under each wheel: Bunratty's
four cars bury their wheels 10–55 cm, one floats two wheels 10–11 cm while burying the other two 44–45 cm; Winnmark's
seven cars are 1–16 cm buried, i.e. roughly right. On Bunratty the body rests on the road with the tyres gone to the
hubs (`docs/critic/2026-09-28-bunratty-car-on-hubs.png`, car at 8.1, 5.2).

### What worked
The tutorial reads cleanly and ends on "YOU GOT THEM" with the dummies walking out. Lasers (below) behave. Step cost is
low: 0.41 ms average on Bunratty day, 0.65 night, 1.69 on the Hollow; worst single step 55 ms on the Hollow and one
194 ms step in the tutorial that I did not see again. Scenario load 2–7 s headless.

### itch.io
The page could not be reached from this environment (the egress proxy refuses mbuckley616.itch.io, both curl and
WebFetch). No comments read. Nothing in Slack but the channel join; no instructions found in either.

### The devlog's Still open, from play
- v1.86 "should feel exactly like v1.85": no page errors across seven matches and the step split works for play; feel
  I can't judge.
- Cars sinking (B.1): judged, still sinking on Bunratty — numbers above.
- Laser to the sky (C.1): judged headless on Bunratty Night Lane and Night 2v2 with living kids, 538 beam samples:
  largest pitch 25° (a 1.6 m beam from a kid crouched right beside the player), none ending above the player's head,
  83 ending on the player. Looks fixed; how it looks on a real screen I can't judge.
- C.2 (over-cover muzzle lift), C.3 (ADS-tall hold on the all-auto night map), C.4 (hands 4 cm off the grip): not
  judged — pose and feel questions, and I did not play the all-auto map.
