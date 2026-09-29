# Critic

Daily playtest reports from the critic routine: headless play of the latest build plus the itch.io comments.
Newest entry at the bottom. Old entries are never rewritten.

Last itch comment seen: none yet — itch.io unreachable from the cloud session (2026-09-28, 2026-09-29); the July 2026 "cant go outside" comment in backlog A.1 predates this file.

Covered so far: new-game bedroom → map (2026-09-28); winnmark_tutorial, bunratty_sean, bunratty_night_lane, bunratty_night_team_2v2 (lasers only), hollow_skirmish_3v3 (2026-09-28); winnmark_defend_treehouse, winnmark_defend_culdesac, winnmark_night_prowl, winnmark_two_in_the_yards, bunratty_infection, bunratty_brothers, hollow_defend_south_fort, hollow_attack_north_fort, hollow_full_auto_mayhem (AI watched, not played) (2026-09-29).

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

## 2026-09-29 — Defends, Infection, Night Prowl, Two in the Yards, Hollow forts (v1.86)

The build is unchanged since yesterday: main moved only in CLAUDE.md, and there is no `auto/build` branch. So I played
what I hadn't covered: Defend the Treehouse, Hold the Fort (Winnmark cul-de-sac), Night Prowl, Two in the Yards,
The Brothers, Infection (Bunratty), and the Hollow's Defend South Fort and Attack North Fort. All of them from a new save
with the starting spring pistol, using the same aim-cock-fire bot as yesterday (it now reloads if it has a loader; a new
save has none). Then I watched Infection, Night Prowl and Full-Auto Mayhem for 90–120 s each with the player made
unkillable, to see what the kids do. 14 matches in all, no page errors in any of them, and the smoke suite passes.

**A harness note for whoever writes tests.** `g.spin(n)` runs all its steps in one synchronous `page.evaluate`, so
every `setTimeout` in the game (all the round endings: the 600 ms win, the 400 ms timer win, the 200 ms tag) waits
until the spin returns. My first Infection run held the round open for 144 s past 0:00 that way. So a test that spins
through the end of a round has to break the spin into chunks and yield between them, or it will see a match that
never ends. I ran everything below in 30-step chunks with a real wait in between.

Results, first-timer loadout (1 life, 10 BBs, no reload): Treehouse lost at 18 s (10 shots at ~28 m, none landed).
Night Prowl: the bot tagged Devon and then ran dry, and then Seth froze (problem 4). In a separate run, a player
standing at spawn was tagged at ~38 m inside 10 s. Two in the Yards lost at 1.3 s (below). Brothers lost at 15 s, Attack North Fort at 7 s (1 of 5 tagged),
Defend South Fort at 3.4 s against five attackers. Infection won (MOM CALLED THEM IN!) by running to the east end of
the court. The bag started at 25 BBs, and each match start refills the mag from it, so by the fourth match Hold the
Fort began with **1 BB** in the mag. The HUD said so honestly ("MAG EMPTY · F TO FORFEIT"), and so did the result
card's note.

### Problems

**1. The double result also happens in Infection and in team matches.** Yesterday's bug (YOU'RE OUT, then YOU GOT
THEM, paying both) has two more ways in, besides the three calls I named yesterday:
- Infection (`survive_untagged`): the tagger's contact code calls `setTimeout(() => endScenario('infected'), 200)` and
  the timer win calls `setTimeout(() => endScenario('win'), 400)`, and neither checks `Game.mode`. If a tag lands within
  400 ms of the clock running out, you get both results. Measured: infected +$2, then win +$8, cash 35 → 45, and the
  card reads MOM CALLED THEM IN! Repro: `g.scenario('bunratty_infection')`; `Game.scenario.timerRemaining = 0.05`;
  two `stepGame`s; put a tagger 0.5 m from the player; one `stepGame`; wait 1 s.
- `last_team_standing` (every team match and FFA): the same unguarded 600 ms timeout. Hollow 3v3: lose +$2, then
  win +$6, and the card reads YOU GOT THEM. Repro: `g.scenario('hollow_skirmish_3v3')`; set every red kid's
  `lives = 0, health = 0`; `checkWinCondition(); applyBBHit({}, Game.player)`; wait 1 s.

The fix is the same one-line guard the tutorial already has (`if (Game.mode === 'scenario')`), at five places. Filed
as one line that extends yesterday's.

**2. Infection: one tagger never leaves his backyard.** In Bunratty Infection, Mitchell spawns at (−29, 25) behind the
house at the west end. His chase is a straight line at the player with slide-and-wall-follow, and he runs into the
backyard fence and stays there. Watched for 90 s with the player unkillable at the east end (34, 2): Mitchell moved
3.0 m in total, 66 m from the player the whole time, state `chasing` in 180 of 180 samples. The other five covered
32–106 m each and reached the player. Priya also parked 5.6 m short for the last 60 s; three taggers stop at that
distance, probably against the bins round the player's spawn. Screenshot, from above: Mitchell is next to the
cardboard box with the fence line to his right (`docs/critic/2026-09-29-infection-mitchell-fenced-in.png`). One of six
zombies out of the game makes Infection easier than intended, and it will look broken to anyone who spots him.

**3. Two in the Yards: Devon's sniper fires within a second of BEGIN, from 37 m, at the spawn.** Nine runs, player
standing at spawn (32, 0), which is what a first-timer does while reading the HUD: Devon's first shot came at
0.75–0.97 s every time, and it tagged the player at 1.38–1.55 s in 3 of the 9. The bot's own run was out at 1.3 s,
before it had cocked its second shot. With one life, the match can be over before the player has seen who they're
fighting. The scenario's own comment calls this the "mid-difficulty step" between the 1v1s and the 3v1. Devon is in
`hiding` when the BB lands, so he never has to show himself first. South Fort also went in 3.4 s, but that's five attackers on a defend; this
is a 2v1 billed as the gentle step up. I'd call it a balance bug rather than a design question. Filed.

**4. Night Prowl: Seth freezes in `advancing` behind a car.** I walked the player up the street toward him and stopped
at 14 m (the bot's rule), at about (5, −2). Seth then sat at (−5.3, −10.6) in state `advancing`, behind the dark car
in front of the brick house, from 12 s until the run ended at 60 s, and 120 s in the longer run. He didn't move or
fire. It reproduced in all three runs where the player came within ~14 m (the synchronous run, and two chunked runs
with the player unkillable). Seen from the player, he stays hidden behind the car the whole time. If you've used your
10 BBs by then, there is no way to finish the round except F to forfeit. The same kid roams 186 m in 120 s when the
player stays back at spawn, so it's the approach that wedges him.

**5. More result grammar** (the same family as yesterday's line): Defend South Fort lose: "Seth and Ryan, Devon, Sean,
and Mitchell take the fort". Infection win: "Ryan, Marcus, Sean, Nick, and Mitchell starts trudging home" (a singular
verb). The Brothers lose: "Ryan, Mitchell, regroup near the road" (the comma before the verb again).

### What worked
Hold-the-line wins end on the right card with the right flavour. Taggers (except Mitchell) reach a player who stands
still at the far end of Bunratty inside 15 s, which feels right. On Night Prowl, with the player hanging back, Seth works
the whole map (186 m in 120 s, through advancing, peeking, hiding and repositioning) while Devon holds a sniper nest
(7.6 m), which is a readable pair. Step cost: 0.3–0.8 ms average on Winnmark and Bunratty and 1.7 ms on the Hollow's Attack North Fort.
The worst single step was 25 ms, in Infection. Scenario loads took 0.7–3.8 s headless.

### itch.io
Still unreachable: the egress proxy refuses mbuckley616.itch.io for both curl and WebFetch. No comments read. Slack
had only yesterday's critic post, and nothing in it or on any page was addressed to me.

### The devlog's Still open, from play
- C.3, ADS-tall hold through auto bursts (v1.77): judged headless on Full-Auto Mayhem (Night), 90 s, all ten kids on
  MP5/AK/UMP/MAC-10. There were 190 enemy bursts, 71 of which fired with the over-cover lift. In 68 of those 71 the lift
  held for the whole string. In 3 it dropped to zero partway through, for 25 of 2,357 frames (1%) in total. So it
  mostly reads continuously; the 3 dips are probably a kid stepping out of cover range mid-string. Whether that shows
  on screen I can't judge.
- C.1 laser to the sky: I didn't revisit it (judged fixed yesterday).
- C.2 over-cover lift reach, C.4 hands off the grip, and B.2 walk-anim pop after a teleport: not judged. They are pose
  questions that need eyes, not numbers.
- v1.86's "should feel exactly like v1.85": 14 more matches without a page error.
