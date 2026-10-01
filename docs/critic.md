# Critic

Daily playtest reports from the critic routine: headless play of the latest build plus the itch.io comments.
Newest entry at the bottom. Old entries are never rewritten.

Last itch comment seen: none yet — itch.io unreachable from the cloud session (2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01); the July 2026 "cant go outside" comment in backlog A.1 predates this file.

Covered so far: new-game bedroom → map (2026-09-28); winnmark_tutorial, bunratty_sean, bunratty_night_lane, bunratty_night_team_2v2 (lasers only), hollow_skirmish_3v3 (2026-09-28); winnmark_defend_treehouse, winnmark_defend_culdesac, winnmark_night_prowl, winnmark_two_in_the_yards, bunratty_infection, bunratty_brothers, hollow_defend_south_fort, hollow_attack_north_fort, hollow_full_auto_mayhem (AI watched, not played) (2026-09-29); winnmark_whole_block, bunratty_pincer, hollow_juggernaut, hollow_big_battle, winnmark_sniper_overwatch, hollow_infection_night (2026-09-30); new-save mirror → bedroom → front door, all five lot_* scenarios, winnmark_last_stand, winnmark_team_3v3, bunratty_team_4v4, hollow_attack_north_fort(_night), hollow_defend_south_fort_night (2026-10-01).

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

## 2026-09-30 — Whole Block, Priya's Pincer, Juggernauts, The Big Game, Trey on Overwatch, Infection at Night (v1.101)

I played v1.101 (main at 2c308c0; auto/build was not ahead of it). My bot aims, cocks and fires the spring pistol the
way the controls do: hold LMB to a full pull, release, then click. It walks at the nearest kid when it can't see one.
Where it says *untaggable* below, BB hits on the player were dropped so the round could run long. That was 34 rounds
over the six scenarios yesterday's post promised, plus Full-Auto Mayhem for the opening hold, with no page errors in
any of them. The harness smoke suite passed.

With the first-timer loadout (1 life, 10 BBs), Sniper Overwatch was lost at 3.1 s and 17.6 s, and Juggernauts at 3.8
and 6.2 s (the bot walks into the AKs). Standing at spawn, Juggernauts was lost at 24.6 s in 1 of 3 runs. The Big
Game was lost at 9.3 s and Pincer at 21.5 s. Infection at Night ended TAGGED at 7 s and 14 s. The Whole Block is a
kill_all, and the bot's ten BBs took Seth and Marcus in every fight run. Devon (sniper nest at −32, 0) and Brooke
(dug in at −8, −26) never came out, so every Whole Block run ran to my 150–180 s cap.

### Problems

**1. The Whole Block: Seth freezes behind the van 4 m from you, and Marcus 8 m away.** It's the same shape as Night
Prowl's Seth (v1.99). Stand at (28, 0.1), the spot a player reaches walking in from the `road_east` spawn. Seth then sits
at (24, −1.4) in state `advancing` behind the grey van for the rest of the round. Untaggable, player placed there, 90 s,
five runs: Seth was still for 83 s in 4 of 5, and Marcus for 81–82 s at (20.8, 5.9) in 2 of 5. In the runs where both
froze, neither fired a single shot in 90 s. In my first two 180 s fight runs (no placing) it happened by itself: Seth
still for 43 and 65 s at the same spot, first shot at 52 s and 73 s. With the player standing at spawn instead, they
work the yards (120–180 m walked in 90 s) and hit the untaggable player 93–111 times. So it's the 4 m approach that wedges him, as it was on
Night Prowl. The v1.99 fix rests a flanker's *bounding* when it wedges. Seth here is in plain `advancing`, whose
wall-follow v1.100's Still open already says has no sidestep commitment. Screenshot from the player's spot: the HUD
says Seth 4.3 m, and he is behind the van (`docs/critic/2026-09-30-whole-block-seth-behind-van.png`).

**2. Priya's Pincer: Priya parks in the middle of the road, 39 m out, and never flanks.** The scenario is sold on
her ("she'll bound cover-to-cover and come at you from the side"). With the player standing at the `bulb_center`
spawn (34, 2), she walks to (−5, 2) and stays there in `advancing`: 60 of 70 s in 2 of 4 untaggable runs, 37 s in 1 of 2
standing runs, and in the other she tagged the player from that spot at 15.6 s. In the other two untaggable runs
she did come in, to the planter. From
(−5, 2) she hit the untaggable player 0 and 2 times in 60 s, against Sean's 108–113. In my two fight runs Sean
wedged at nearly the same spot (−5.4, 2.3) for 6–7 s. It looks like the same `advancing` wedge as problem 1 on a
different map. Repro: `g.scenario('bunratty_pincer')`, drop hits on the player, stand still, spin 70 s in chunks, read
Priya's `pos`/`state` each second.

**3. Fast BBs pass through thin walls: 18–61% of the time, depending on speed.** The BB integrator is sub-stepped at
1/200 s, but it tests obstacles as points: `bb.pos` inside the box after each sub-step. A BB faster than 36 m/s moves
more than 18 cm per sub-step, so it can land on both sides of an 18 cm wall without ever being inside it. It's the
Bunratty bulb planter wall (x 28.81–28.99, 1.12 m high), which the Pincer and Infection player spawns stand behind.
BBs fired horizontally from 0.3–0.8 m in front of it, 100 per speed, still able to tag after passing: 0 at 30 m/s
(spring pistol), 18 at 45 (AR), 20 at 50, 42 at 60, and 61 at 75 m/s (sniper). The numbers track
1 − 0.18/(v/200), the sub-step gap. I saw it in a real round: Pincer, Sean's BB went through that wall at chest height
and put the player out at 47.9 s. Bunratty has 7 non-picket obstacles under 25 cm thick (11 under 37.5 cm) out of 314.
The same point test also let one of Marcus's shotgun BBs clip 5 cm through the top corner of the Winnmark car at
(20.6, 4.6) (1 of 302 hits logged in the Whole Block). The collision check already has the segment tool for this
(`obsRayDist`, as in `hasLineOfSight`): sweep oldPos→pos against each obstacle instead of testing the end point.
Repro: `g.scenario('bunratty_pincer')`; `makeBB` at (28.4, 1.2, 2) with velocity (60, 0, 0), `curveStrength = 0`;
`updateBBs(1/200)` ×20; count how often `pos.x > 29.1` with `canDamage` still true.

**4. Result lines that don't fit the map** (writing, small): Pincer's lose line is the shared defend one, "They got
through. Priya, Sean, and Owen take the fort", but Pincer is a cul-de-sac. Juggernauts and The Big Game lose on the
shared "…regroup near the road", which is Winnmark's street, not the woods by the river.

### What worked
- **The opening hold** (v1.101's Still open: does everyone open fire on one frame at 2.5 s?). No. In The Big Game 2 of 7
  shooters fired at 2.52 s, and the rest at 3.4–6.1 s. In Full-Auto Mayhem the first shot came at 4.5 s and the
  rest by 6.5 s. Juggernauts first shots: 2.5–5.8 s, except two allies (Rebecca, Brooke) who hide at
  spawn until 20–27 s. Pincer: Priya 9.6 s, Sean 14.4 s. Line of sight staggers them
  already; I see no need for a per-kid stagger.
- **The first-timer path** (v1.88) by real input: at spawn the prompt is "E Go outside", E opens the map, clicking the
  Winnmark label lists Backyard Basics as the only START, and START opens its confirm card (You 5 lives, Seth on your
  side, three targets). No wrong pin and no dead end.
- **Infection at Night:** the taggers were all moving (up to 38 m in 14 s) and none wedged; and the player was
  tagged at 7 s and 14 s. Shooting one downs it for 10 s, as the code says, and 4–6 of 7–10 shots landed.
- **Whole Block with the player at spawn:** Seth and Marcus flank round the yards (120–180 m in 90 s) and reach you in
  8–9 s. Marcus's shotgun tagged a standing first-timer at 8.5 s both times. Devon's nest and Brooke's dig-in hold all
  round, as the blurb says.
- **Step cost**, run one at a time: 0.3–1.4 ms average, p99 2–10 ms. The worst single steps (up to 420 ms) came from
  runs with three browsers sharing four cores, so they're this machine's contention, not the game.

### itch.io
Still unreachable: the egress proxy refuses mbuckley616.itch.io (curl gets no connection, WebFetch EGRESS_BLOCKED).
I read no comments. Slack's last 24 hours were the builder, producer and merge posts about v1.97–v1.101. Nothing in
them, or on any page, was addressed to me.

### The devlog's Still open, from play (v1.87–v1.101)
- v1.101, same-frame volley in the big battles: judged above. There is none.
- v1.101, Devon still has his line at 2.5 s: I didn't replay Two in the Yards. Trey on Overwatch is the same shape,
  and a player walking in from spawn was out at 3.1 s (Seth, from 19 m, 0.16 s after his first shot).
- v1.100, gunners' `advancing` wall-follow has no sidestep commitment ("nothing reported since v1.99"): it is
  reported now. Problems 1 and 2 are that path, as far as numbers can tell.
- v1.100, Infection harder for a player who stands still: on the Hollow night map a moving player lasted 7–14 s.
  Whether that feels fair needs a person.
- v1.93, a kid behind tall cover goes quiet instead of plinking: in Pincer, gunners pile against the planter's west
  wall (28.4, 2) in `advancing` for 11–37 s, 5.6 m from the player, but they keep firing over it (Sean 108–113 hits in
  70 s), so that's not a freeze.
- v1.87 car tilt, v1.88 OUTSIDE chip readability, v1.93 BBs leaving from above the gun, v1.94 burst pose on screen,
  v1.96 music by ear: need eyes or ears; not judged.
- v1.90, a last kill and your own tag-out inside 600 ms is now a loss: it didn't come up in 34 rounds.

## 2026-10-01 — The new save, the Riverside Market lot, Last Stand, Squad Up, Four on Four, the Hollow night forts (v1.123)

I played the builder's tip, `auto/build` at 05c9497 (v1.123: the kids' faces, hands and clothes, eye colour and
shirt front at the mirror, kids backing out of pockets). Main is at v1.117. I compared against main, and against v1.101,
wherever a problem might be older than the tip. This time I covered what no earlier run had: a new save through the
mirror to the front door, all five Riverside Market lot matches, Last Stand at the Fort, Squad Up, Bunratty's Four on
Four, and the Hollow's Storm the North Fort (day and night) and Hold the Fort (Night). I used the same aim-cock-fire bot as
before, now in two styles: one that pushes to 15 m, and one that holds its spot and shoots what it can see. I also
watched rounds with hits on the player dropped, and timed the first tag on a player standing at spawn. In all, 21 bot
rounds, 9 watched rounds, 50 first-tag rounds and 5 free-for-all openings, over 37 browser boots. There were no page
errors in any of them, and `node tests/run.mjs smoke` passes.

**A new save, as a first-timer.** NEW GAME opens the mirror with ten rows (height, build, hair, hair colour, skin,
shirt, pants, glasses, eyes, shirt front), and every click shows on the kid at once. In the preview, green eyes are
about 6 px across at 1280×720: you can see them, but only just (screenshot
`docs/critic/2026-10-01-mirror-new-save.png`). DONE puts you in the hall, and the first prompt is "E Go outside", from
the front door behind you. E opens the map with one open pin, Winnmark. There's no dead end anywhere on that path.

**Problem 1 — the lot's free-for-all is decided the moment the opening hold lifts.** In five openings of
`lot_ffa`, with the player made untaggable, 3 or 4 of the 6 kids were out between 2.6 s and 3.6 s every time.
Tyler was out first in all five, at 2.6–2.8 s. Brooke went at 2.8–3.0 s and Owen at 3.2–3.6 s. The 2.5 s hold
(v1.101) stops the first shot, but every kid starts in sight of somebody, so the first volley clears most of the
field. After that it's the player against Marcus and maybe Priya. Both of my bot rounds lost to one of those two, at
9 and 17 s. v1.103's Still open guessed "four of six out inside the first 10 s". It's quicker than that: the round is
settled in about one second of shooting. To see it: `g.scenario('lot_ffa')`, drop hits on the player, and step
until each kid's `health` hits 0.

**Problem 2 — Storm the North Fort: you spawn in the south fort's doorway.** The `team_b` spawn is (2, 28). The south fort's front wall
(z 26.8–27.2) has an opening from x 0.64 to 3.36, so the player stands in the gap. At spawn the door posts frame the screen on
both sides (screenshot `docs/critic/2026-10-01-storm-north-fort-spawn-in-doorway.png`). Standing still there,
the player was tagged inside 18 s in 18 of 20 rounds on v1.123, and 20 of 20 on main.
Night Assault was worst: 10 of 10, median 6 s, mostly Devon's sniper from 55 m, and 4 of 10 at 3.3 s, his first
shot after the hold. It isn't new. v1.101 gave 10 of 10 too, and on 29 Sep I logged "Attack North Fort at 7 s". That's
the Two in the Yards problem again (a sniper with a line on the spawn), on a map with one life and 55 m of field to cross.
Hold the Fort (Night) spawns at the same point. There, the first tag came at 4.9–14.9 s, from 14–36 m, by kids who had already
crossed the field. That's fair for a defend. Steps: `g.scenario('hollow_attack_north_fort_night')`, stand still, and step
until `hitsTaken` is 1. Note the time and `bb.enemyRef`.

**Problem 3 — Squad Up's last kids park out of range, and nothing ends the round.** In `winnmark_team_3v3` the
player's two allies were out by 90–210 s in 4 of 4 watched rounds. In every one of those, the enemies left standing
(Brooke and/or Jamie) then sat 32–50 m from the player in `hiding`/`peeking` for the rest of the 240–300 s. They didn't
move. One run's Jamie fired his last shot at 210 s and the next-best at 90 s; after that, nothing hit the player.
They're skirmishers with `aggression` 0.35 and 0.4, below the 0.45 march threshold, so they never advance. This is a
`last_team_standing` round with no timer, so a player who holds back faces a round with no end. It's the
same in Four on Four: Mitchell (0.4) and Owen (0.2) held the east end at (30–32, 0–3) for 150–195 s. Eight of the
roster sit below 0.45: Brooke, Jamie, Devon, Nick, Mitchell, Owen, Rebecca and Christian. I'm filing this as a
proposal, not a bug, because a camper kid is a fair character and the player can always go and get them.

**What worked.**
- **The lot's 1v1 (Marcus):** won with one shot at 30 s. The lose and win lines fit the lot ("take the doors" in Hold
  the Doors).
- **Last Stand:** the timer counts 120 → 0 at real time on all three defends, and the result screen leaves the clock
  readable behind it. Tagged out at 21 and 30 s, both with the attackers already in the bulb.
- **Four on Four:** played out to YOU GOT THEM at 225 s with the player standing still. The allies carried it, and the
  win line names all four.
- **Stuck kids:** in 30 rounds I saw no kid stuck for more than 2 s in `advancing`/`chasing`/`repositioning`. The one
  exception was the start, while kids wait their turn to leave the spawn huddle. v1.121–v1.122's pocket fixes hold
  here. Kids stand on the ground on every map, including on Bunratty's hill (allies at y 5.1–5.8 m on 5.1–5.8 m of
  ground).
- **Step cost**, one browser alone, 30 s each: lot 3v3 1.2 ms average (p95 4.8), lot night 4v4 1.1, Bunratty 4v4
  2.6, Night Assault 3.4, Squad Up 1.4. The 300–400 ms worst steps in some bot rounds came with six browsers
  sharing the machine.
- **Harness stall (v1.110, v1.123 note):** none in 37 boots, run three to six at a time. That doesn't say it's
  gone. The builder's loop found 8 in 270.
- **Aisle Wars (v1.102 Still open):** in two watched rounds our side was not the weaker one. At 90 s the allies had lost 3
  and 4 lives and the enemies 7 and 5. Brooke on our side stood at (3, 25) without moving for 90 s in one round and moved 9 m in the other.
  The builder already noted she barely moves. I'd call that a look for Michael, not a bug.

**A harness note.** My first timer check read 0:00 for 110 s with the round still open, because the timer win
is a `setTimeout` and one long synchronous evaluate never lets it fire. That's the 29 Sep note again. In chunks it ends
on time, so the game is fine.

### itch.io
Still unreachable: WebFetch gets EGRESS_BLOCKED for mbuckley616.itch.io, and curl gets no connection. I read no
comments. In Slack's last day there were the builder posts for v1.104–v1.117, the producer's posts, two merge cards
and two decisions, all answered. Nothing in them was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.102–v1.123)
- v1.103, free-for-all kids out in 10 s: confirmed, and faster (problem 1). v1.103's "starts behind cars" looks like
  the fix.
- v1.102 / fix-up, Aisle Wars allies weaker, Brooke never moves: see above. In 2 rounds the enemies lost more
  lives than we did, and Brooke stays put. Hard to judge from the bot.
- v1.123, the mirror preview's eyes are a few pixels: about 6 px, visible but small (screenshot). A closer camera
  would show them.
- v1.122, kids standing in the open under fire on the busy maps: I didn't count it. With the player untaggable in
  Squad Up and Four on Four, I saw nobody stuck in the open. The kids who stay in one place (problem 3) do it from cover.
- v1.117, "distant screen doors slam" in the Hollow: still in Hold the Fort (Night)'s win line. It's Michael's call.
- v1.105 jumping onto bins to see over cover; v1.109 the Hollow intro preview; v1.112–v1.120 every look at cars,
  trees, forts, props, road, faces, hands and clothes: these need eyes, so I didn't judge them. The kids read as kids at 8 m in the
  Bunratty shot.
- v1.108, an opening line at the mirror: there are no words now. A first-timer does find DONE, but nothing says the
  mirror is there to come back to.
