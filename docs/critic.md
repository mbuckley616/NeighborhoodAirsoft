# Critic

Daily playtest reports from the critic routine: headless play of the latest build plus the itch.io comments.
Newest entry at the bottom. Old entries are never rewritten.

Last itch comment seen: none yet — itch.io unreachable from the cloud session (2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01, 2026-10-02, 2026-10-05, 2026-10-06, 2026-10-07, 2026-10-08); the July 2026 "cant go outside" comment in backlog A.1 predates this file.

Covered so far: new-game bedroom → map (2026-09-28); winnmark_tutorial, bunratty_sean, bunratty_night_lane, bunratty_night_team_2v2 (lasers only), hollow_skirmish_3v3 (2026-09-28); winnmark_defend_treehouse, winnmark_defend_culdesac, winnmark_night_prowl, winnmark_two_in_the_yards, bunratty_infection, bunratty_brothers, hollow_defend_south_fort, hollow_attack_north_fort, hollow_full_auto_mayhem (AI watched, not played) (2026-09-29); winnmark_whole_block, bunratty_pincer, hollow_juggernaut, hollow_big_battle, winnmark_sniper_overwatch, hollow_infection_night (2026-09-30); new-save mirror → bedroom → front door, all five lot_* scenarios, winnmark_last_stand, winnmark_team_3v3, bunratty_team_4v4, hollow_attack_north_fort(_night), hollow_defend_south_fort_night (2026-10-01); all four northcliff_* scenarios, lot_ffa's hidden starts (v1.134), the Loadout screen's kid (2026-10-02); all four store_* scenarios, stoneglen_hold_treehouse, club_defend_gazebo, school_defend_portables (2026-10-05); bunratty_vip, lot_vip_night, school_1v1_tyler, school_portables_3v3, club_1v1_brooke, club_eighteenth_3v3, the four v1.168 guns against bunratty_sean, the Bucket Gun with a taped mag in hollow_skirmish_3v3 (2026-10-06); bunratty_vip and lot_vip_night again (v1.172 anchors, v1.175 dumpster), school_night_4v4, club_night_4v4, northcliff_night_4v4 (sniper opening only), new-game bedroom prompt (2026-10-07).

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

## 2026-10-02 — Northcliff Trace, all four matches; the lot free-for-all's hidden starts; the Loadout kid (v1.137)

I played the builder's tip, `auto/build` at 9907e67 (v1.137; main is at v1.129). Everything new since my last run is
there: Northcliff Trace (v1.130–v1.131), the Loadout screen's kid and gear (v1.132–v1.133) and the lot free-for-all's
hidden starts (v1.134). I played 17 bot rounds: Northcliff's 1v1 four times, the twins 3v3 three times, the creek-fort
defend four times, Bellfield After Dark three times and the lot free-for-all three times. I also watched six
free-for-all rounds with hits on the player dropped and timed 44 first tags on a player standing at spawn. On top of
that, I ran 15 walk probes from Northcliff's road spawn. There were no page errors anywhere, and `node tests/run.mjs
smoke` passes. The bot is the same as before: it aims, cocks, and fires at the nearest kid it can see. One version
pushes to 15 m and the other holds its spot. I changed it this time to step one second per evaluate. My first batch
ran each round in one long evaluate, so the game's `setTimeout` round ends never fired, and a 90 s defend "lost" at
94.7 s. That was the harness, not the game. I threw that batch out.

**Problem 1: Northcliff's road spawn walks you into a parked car you can't see.** All three road matches (Down by the
Creek, The Stoneglen Twins, Bellfield After Dark) start you at (35, 1), facing straight down the road. If you hold W
from there, you stop dead at (29.5, 1) after 5.5 m and 2 s. The screen shows open road all the way to the bulb, and the
car is below and left of the view (screenshot `docs/critic/2026-10-02-northcliff-road-spawn-stopped-by-car.png`). The
car is parked across the kerb at an angle (obox at (30.6, 2.3), angle 2.99 rad, about 9° off the road). Its near corner
reaches z 1.23, inside the player's 0.3 m radius at z 1. The player's movement tests x and z separately
(`collidesObstacles` at ~19525), so a push along x into a sloped face blocks x and has no z to slide on. You don't
slide past it. You stick. The results were the same in all three scenarios: turned 0°, 3° or 9° left, stuck at 1.5–2 s;
17° left or 9° right, through. A first-timer's first move on a new map is to hold W, and here the kid freezes for no
reason they can see. It's the axis-split slide, so any car at an angle can do this, but this is the one placed on the
spawn line. Steps: `g.scenario('northcliff_1v1_evan')`, `Game.keys.KeyW = true`, spin 240, read `Game.player.pos`.

**Problem 2 (small): the lot free-for-all opens with a windshield filling the screen.** v1.134 puts you at the east edge
"behind the last car, facing the lot". You actually face the car, close enough that its glass and pillars fill the
middle of the screen (screenshot `docs/critic/2026-10-02-lot-ffa-start-facing-windshield.png`). You have to turn to see
anything. It's hidden, as Michael asked, but a first-timer reads it as a wall. Turning the start yaw about 90° along
the row would keep the start hidden and show the aisle.

**The lot free-for-all now.** In six watched rounds, the first kid was out at 4.5–6.8 s (it was 2.6 s), with 4 of 6 out
by 10–17 s and 5 of 6 by 13–25 s (one round's Marcus lasted to 70 s). The last kid standing was **Jamie in 6 of 6**.
Jamie walked 93–152 m (the others 4–90 m), finished 2–3 m from your start, and was the first to hit you in every round,
at 36–109 s. So the opening is no longer settled in a second, and you can stand at your start for 36 s or more. But the
round ends the same way every time: the field clears itself in about 20 s and Jamie comes round to your car. The
holding bot won 3 of 3 that way, at 53 s, 81 s and late. Whether "Jamie always wins the scramble" is fine is a playtest
call. I'm not filing it as a bug.

**Northcliff, the rest.**
- **Down by the Creek (1v1, Evan):** 2 won with one shot each and 2 tagged at 15 s while pushing. Fair for an opener.
- **Fernando's high-yard rifle (v1.130 Still open):** I don't see it hurting a player who stays at spawn. In 20 standing
  rounds (twins 3v3 and Bellfield, 30 s each) the player was tagged in 5. Every tag came from a kid who had walked up
  the road: Haden or Connor at 13–19 m, Diego at 22 m, and once Mason at 60 m. None came from Fernando, who sat in
  `hiding`/`peeking` at (−15, −28) for the whole of each watched round. That's a defender doing his job.
- **The twins 3v3 and Bellfield, pushing:** the push bot was out at 8–17 s (twins) and 6.5–10 s (Bellfield) in all 6
  rounds. It walks down the middle of the road into the kids coming up, so that's my bot's fault, not the game's.
- **Hold the Creek Fort (v1.131 Still open):** this is the hardest defend I've played. Standing at the spawn (−6, 30.4),
  the player was tagged in 8 of 8 rounds at 3.9–11.8 s (median about 7 s). Connor's shotgun did it four times, once from
  26 m at 3.9 s down the slope. In the last four rounds the shot came from 2–3 m, with Haden or Connor already at the
  west wing (−8, 31), as the builder saw. The bot that fires back held the full 90 s in 1 of 4 rounds and was out at 17,
  31 and 31 s in the others. Winnmark's Last Stand gave 21 and 30 s against the same bot. The win line works ("Distant
  screen doors slam. Haden groans — "Aw, COME ON!" — and Connor and Diego start trudging home."). Whether one life
  against three kids with the high ground is fair over 90 s is for Michael's hands. From here it looks steep for a
  zone's second match.
- **Stuck kids:** in the Northcliff rounds I watched, none stood still in a moving state for more than a couple of
  seconds. Diego's west-fort fix (v1.134 fix-up) held.
- **Step cost**, one browser alone, 30 s each with the player untaggable: Bellfield After Dark 2.3 ms average (p95 4.4,
  worst 14), the twins 1.3, the creek defend 0.9, the lot free-for-all 0.4.

**The Loadout kid (v1.132–v1.133).** On a new save, the kid stands in the panel with seven labels, every one in place.
Two things to check by eye. "HANDS Spring Pistol" runs into the kid's hand and gun, the only label that overlaps the
model. The card is 762 px tall inside. At 1280×720 the Worn Gear section starts at the bottom edge, and the
shoes row needs about 100 px of scrolling (57 px at 1366×768, 175 px at 1024×640). The card scrolls, so nothing is
lost. On a laptop, though, the gear you pick sits below the fold, away from the kid wearing it.

### itch.io
Still unreachable: WebFetch gets EGRESS_BLOCKED for mbuckley616.itch.io. I read no comments. In the last day of Slack
there were builder posts for v1.121–v1.137, the producer's posts, one merge card (v1.124–v1.129, merged) and four
decisions. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.124–v1.137)
- v1.130, Fernando from the spawn: no, see above (0 of 25 first tags).
- v1.130, the slope across Northcliff's road: I can't judge how it feels to walk. The walk probes didn't snag on it.
- v1.131, the three attackers pressed against the creek fort's west wing: confirmed (2–3 m, 4 of 8 rounds), and the
  defend is steep (above).
- v1.132, the Loadout card on a laptop: it scrolls, and the worn gear is below the fold at 1280×720 (above).
- v1.133, the gear on the Loadout kid: it needs eyes. With nothing bought, I saw only the default kid.
- v1.134, whether the free-for-all feels slow: it doesn't. It's settled in 13–25 s, and Jamie wins it (above).
- v1.134 fix-up, Diego finding the west fort's open side: not seen stuck.
- v1.124, allies forming up in the Hollow's doorway; v1.125–v1.127, how the carried-over pieces look; v1.128, Guns vs
  Ammo as the shop's first tab: these need eyes or a real player, so I didn't judge them.
- v1.129 / v1.137, the harness stall: 0 restarts in 20 boots, run up to six at a time. At eight, `page.goto`'s 30 s limit
  timed out five times at page load. That's the v1.124 note again (load, not a hang).
- v1.137, shotgun pellets beside cover: not measured.

I have no proposal today. The three from earlier runs are still open in `docs/proposals.md`.

## 2026-10-05 — Inside Riverside Market, all four; Hold the Treehouse; the gazebo and portables defends (v1.160)

I played the builder's tip, `auto/build` at 0776e9a (v1.160; main is at v1.158). The store (v1.159–v1.160) is only on
that branch. I played 93 bot rounds: the store's four matches 64 times (Cleanup on Aisle Five 6, Price Check 20, Customer
Service 23, Lights Out 15), Hold the Treehouse 21, Hold the Gazebo 3, Hold the Portables 3, and Night Swim and
Bellfield After Dark once each for frame cost. Then a first-timer pass from the title. There were no page errors
anywhere, and `node tests/run.mjs smoke` passes. The bot is last run's, stepped one second per evaluate. It aims at the
nearest kid it can see, racks after 0.5 s, reloads after 2 s and fires. It either holds its spot, pushes to 15 m,
crouches, idles (doesn't fire) or watches (untaggable). New this run: every enemy BB that tags the player has its path
traced frame by frame against the obstacles. In the 46 tags I traced, none went through a shelf, wall or rail. One harness note: the
round's 600 ms end timer runs on wall time, so a kill-all win shows up seconds of sim time late. I timed wins from the
last kid's health reaching 0.

**Problem 1: Customer Service starts you beside the desk, not behind it.** The service desk is an L: a front from x 16.5
to 22.5 at z 11–12, facing the store, and a side arm at x 21.5–22.5 from z 12 to 15. The player starts at (24, 13.5),
outside the L, east of the side arm, in a 3.3 m gap between the desk's end and the east wall. The arm covers the west
and nothing covers the north. The start view (screenshot `docs/critic/2026-10-05-store-desk-start-open-to-the-north.png`)
has the desk on your left and the whole east aisle open ahead. Standing there, the player was tagged in 17 of 17 rounds
(14 holding and firing back, 3 crouched), at 7.6–14.3 s. Of the 11 tags I traced, 10 were Marcus from the same spot,
(20.6, 0.9), 13 m away, at 13.6–14.3 s, and his line passes the desk's end at x 23.3. Crouching behind the "desk"
changed nothing (13.6, 13.8, 14.3 s). I moved the start inside the L, to (19.5, 13.8), and the round became a fight: 6
rounds tagged at 21.1–70.3 s, all from 3–4.5 m once the kids reached the desk, and 1 of 6 held the full 90 s. The
builder's Still open asks whether 90 s behind the desk is fair. From where the round starts, you aren't behind it.
Steps: `g.scenario('store_defend_desk')`, stand still, step until `hitsTaken`. Read the hitter's position, or compare
`Game.player.pos` with the desk obstacles at h 1.1.

**Problem 2: Hold the Treehouse's Evan tags you from behind before you've turned round.** You start on the platform
at (0.6, 2.6, −6.6) facing south, toward the twins at the house 18 m away (screenshot
`docs/critic/2026-10-05-treehouse-start-facing-the-house.png`). Evan stands in the open by the shed at (11, −8.4),
11 m away behind your left shoulder (screenshot `docs/critic/2026-10-05-treehouse-evan-behind-your-shoulder.png`). He
fires the moment the 2.5 s opening hold ends. A player who doesn't move was tagged in 11 of 11 rounds by 11.1 s. Evan
did 8 of them, at 2.8, 2.9, 3.1, 3.8, 4.5, 4.7, 6.0 and 8.8 s, and Haden on the platform did the other 3 at 10–11 s.
With the bot firing back, 3 of 10 rounds were lost to Evan at 2.8–3.1 s. Five held the full 90 s without a hit (I
stopped the other two at 15 s), because the bot put Evan out early and then shot each twin at the top of the ladder. The match is one life. So it's
settled in the first 3 s, either by Evan or by whoever shoots him first. The twins coming up the ladder, the part the
match is about, barely matters. It's v1.101's Devon at the Two in the Yards spawn again, from 11 m instead of 37.
Either start the player facing the shed, or start Evan inside it or behind it. Steps:
`g.scenario('stoneglen_hold_treehouse')`, stand still, step until `hitsTaken`, read the hitter.

**Problem 3 (small): the store's result lines are the street's.** Losing Price Check or Lights Out reads "Marcus, Jamie,
and Tyler regroup near the road. "Run it back?"" inside a closed store. Winning Customer Service reads "MOM CALLED THEM
IN! Distant screen doors slam." `endScenario` picks the place words from a table that only knows the Hollow (~19422,
`resultRegroup` is never set), so every other map gets "near the road" and "sit on the curb". The store is the first
place where neither is true. v1.117 fixed the same thing for Pincer and the Hollow. Steps: lose Price Check, or hold the
desk 90 s.

**Problem 4 (small): Eric parks between the freezers in Price Check.** Your ally Eric stood in `advancing` within 1 m of
(17.2, −2.4) for 15.3 s, 13.2 s and 6.1 s in 3 of 10 rounds. That's the 2.5 m gap between the four 0.9 m freezers
(x 16–18.5, z −3 to −1). 15.3 s is just over the sweep's line. Nobody else in the store's 64 rounds held a moving state
past 4.7 s. Steps: `g.scenario('store_price_check_3v3')`, player untaggable at spawn, 150 s, track Eric's position.

**The store, the rest.**
- **Cleanup on Aisle Five (1v1, Tyler):** standing, the bot was tagged at 8.3 s from 14 m in 3 of 3. Pushing, it won 3
  of 3 with one shot at 5.7–10.9 s. That's a fair opener, and a short one.
- **Price Check (3v3):** both bots lost 14 of 14 at 10.6–75.8 s. Long shots down the aisles from 13–38 m, as the
  builder says, with Marcus the usual hitter. Untaggable, the allies and the bot won 3 of 6 within 150 s (120–133 s).
- **Lights Out (night 4v4):** standing, the bot won 5 of 11 at 108–147 s (5 lost at 12.9–79.4 s, 1 still going at
  150 s), with the allies doing most of the work, which
  fits the builder's 8-to-3 lives. Pushing into the stockroom was out at 5.3–5.4 s in 2 of 3, to Devon from 17–18 m.
  The doorway rifle bites if you walk at it, which looks like the point.
- **Customer Service:** see Problem 1. The attackers fire about 700 BBs a minute, as the builder counted, but from the
  start spot only one of them has to.
- **Through walls:** none. 0 of 46 traced tags crossed an obstacle. 3 tags early on read as "no line of sight" from the
  shooter's spot at the moment of the hit, but tracing showed the kid had stepped behind a shelf after firing.
- **Step cost**, one browser alone: Lights Out 0.66 ms average (p95 1.5, worst 10.8), Night Swim 1.0 (p95 2.1, worst
  15), Bellfield After Dark 1.8 (p95 3.6) with one 232 ms step. With six browsers at once the night maps all showed
  single steps of 95–290 ms, so that's load, not the store.

**The other defends.** Hold the Gazebo: standing, tagged in 3 of 3 at 7.1–14.8 s (Trey from 33 m, Jamie 13 m, Marcus 16
m). Hold the Portables: 3 of 3 at 6.5–12.5 s (Marcus 20–29 m, Trey 20 m). Last run's creek fort was 8 of 8 at 3.9–11.8
s. Every defend I've played since v1.131 ends for a standing player in 15 s. On the gazebo and the portables the shots
came from 13–33 m, over the cover rather than round its end, so I'm not calling those a spawn bug like the desk. It's
a pattern for Michael's hands: a 90 s hold with one life against three kids is short for anyone who doesn't play it
like a shooter.

**First-timer path.** NEW GAME opens the mirror, DONE goes to the bedroom, and from the spawn the prompt reads
"E   Go outside" with nothing else competing. The way out is found.

### itch.io
Still unreachable: WebFetch gets EGRESS_BLOCKED for mbuckley616.itch.io. I read no comments. In the last day of Slack
there were the builder's v1.153–v1.160 posts, the producer's 9pm post, the merge card for v1.153–v1.158 and two
what-next decisions (Willow Bend, then the store). Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.138–v1.160)
- v1.144, Hold the Treehouse's balance: Evan's opening shot decides it (Problem 2). The twins' 8.6–10.3 s climb leaves
  the opening quiet only if you've dealt with Evan.
- v1.160, 90 s behind the desk: the start isn't behind it (Problem 1).
- v1.160, Lights Out's allies losing fewer lives: consistent with 5 standing wins in 11, mostly the allies' doing.
- v1.159, the store's aisles: fights are long shots down an aisle, 13–38 m. Brooke near the west checkouts: she held
  (11.2, 16.7) in every round I watched, firing.
- v1.159 fix-up, kids frozen beside a cart or a hedge end: none in the store's enemies. One ally (Problem 4).
- v1.156 / v1.158, the portables and the gazebo: steep (above). Whether that's fair is still Michael's call.
- v1.158, Jamie hanging back in Night Swim: one round only, so I can't judge it.
- v1.138–v1.143, the climb's feel, the prompt box and the climbing pose: these need eyes. Headless, the twins reached
  the platform; Haden tagged from it at 1.7 m.
- v1.139, sliding along angled cars: not replayed here. The v1.137 Northcliff spawn car is the builder's test now.
- v1.146–v1.149, the map screen and the walkie at the hip: these need eyes.
- v1.152–v1.154, the last kid comes looking: not judged this run. No round I played had a camper left at the end.

I have no new proposal. The three in `docs/proposals.md` are all built (v1.88, v1.152, v1.153).

## 2026-10-06 — Protect Ryan and Night Shift (VIP), the school and club 1v1s and 3v3s, the backyard guns (v1.171)

I played the builder's tip, `auto/build` at 44512d0 (v1.171). Main is at v1.168, so the VIP matches (v1.170), the
under-barrel parts (v1.169) and the planted feet (v1.171) are only on that branch. I played 86 bot rounds: Protect
Ryan 16, Night Shift 21, Tyler at the school 6, the portables 3v3 6, Brooke at the club 8, the eighteenth-hole 3v3 6,
the four v1.168 guns and the spring shotgun against Sean 28, and the Bucket Gun with a Taped Twin Mag in the Hollow
3v3 3. There were no page errors in any of them, and `node tests/run.mjs smoke` passes. The bot is last run's: it aims
at the nearest kid it can see (their VIP first in a VIP match), cocks, fires, and refills an empty mag after 2 s. It
either holds its start, pushes to 15 m (8 m for the shotguns, once), walks at their VIP, or stands untaggable. I also
re-ran the first-timer path from the title. The round's 600 ms end timer runs on wall time, as last run noted, so I
timed each ending from the tag that decided it.

**Problem 1: your side's VIP never leaves your spawn.** In both VIP matches the VIP on your team is built as an ally,
and since v1.33 allies start in an arc 2–3.5 m from the player (`startScenario`, the `isAlly && playerSpawnPos`
branch). The VIP is also a `defender`, and a defender holds where he is, so he never walks to his anchor. Ryan's
anchor is house 0's backyard at (−29, −25), but he stands at (−20.8, −4.5) in the lane, 2.3 m from you, beside a
cardboard box (screenshot `docs/critic/2026-10-06-protect-ryan-vip-at-your-elbow-in-the-lane.png`). Rebecca's anchor
is the road side at (−14, 21), but she stands at (3.2, 21.0), at your start. I sampled both at 0, 2, 5, 10 and 20 s,
and neither moved a centimetre, in `hiding` and `peeking` the whole time. Their VIPs, Priya and Seth, have no ally
branch and spawn on their anchors. At 20 s every enemy in Night Shift had a line on Rebecca, from 17–56 m. So the
briefings are wrong: Protect Ryan says "Ryan starts in house 0's backyard" and "keep Ryan out of the open", and Night
Shift puts Rebecca "on the road side". What you're actually guarding is your own spawn point. This also explains the
builder's open question of why Rebecca falls and Ryan doesn't. Steps: `g.scenario('lot_vip_night')`, make the VIPs
untaggable, spin 20 s, and compare Rebecca's `pos` with her `anchorPos`. The same works for Ryan in `bunratty_vip`.

**Problem 2 (balance, mostly Problem 1): Night Shift goes to whoever moves first.** If you walk straight at Seth, you
win. The bot tagged him from 15 m at 12.3, 12.3, 14.5, 16.7 and 57.8 s, so 5 of 5, four of them inside 17 s. He stands
at his dumpster at (−30, −24.5) and never moves, the same as Rebecca. If you stay home, Rebecca is tagged at your
start. Holding and firing back, the bot lost her at 18.7, 29.1 and 68.2 s, and she survived 120 s once. Untaggable, it
lost her at 10.1 s (Marcus, 25 m), 22.6 s (Mason, 4.3 m) and 105.3 s (Mitchell, 39 m). Protect Ryan is slower and
fairer. Holding, the bot won 2 (Priya out at 69 and 117.5 s), lost Ryan once at 48.9 s, and 1 round was still going at
120 s. Walking at Priya, it won 3 of 3 at 76–113 s after 4–9 respawns, because the bulb plank covers her. Untaggable,
2 of 3 rounds were still level at 120 s, and Tyler tagged Ryan from 27.5 m in the third. I'd fix Problem 1 before
judging either match's balance.

**What worked.**
- **VIP rules:** respawns at your start with the 2 s grace worked in every round, up to 9 times in one round, with no
  page error. Every ending matched what happened: "YOU GOT THEM" with Priya's or Seth's cap line, and "THEY GOT
  RYAN/REBECCA" when ours fell.
- **Stuck kids:** none. My loose 1 m tracker flagged Sean in Night Shift (11–13 s), Owen in Protect Ryan, Trey at the
  club and Mitchell at the school. A per-frame probe (moving state only, more than 2.5 m from the player) found no kid
  over 3 s in 11 rounds of Protect Ryan, the club 3v3, the portables 3v3 and Brooke's 1v1. The flags were kids
  respawning beside their spawn or holding a spot.
- **The 1v1s:** Tyler at the school, standing, gave 1 win and 2 losses (tagged at 10.9 and 11.6 s, from 9–12 m).
  Pushing, the bot won 2 of 3. Brooke at the club tagged a standing bot at 44.6–52.4 s from 8–16 m in 3 of 3. Pushing,
  the bot was tagged at 10 and 12 s from 15 m twice and won once. Both read as fair duels.
- **The 3v3s:** the portables 3v3 ran the full 120 s three times with the allies trading. The eighteenth-hole 3v3
  ended at 64.5 s (Seth from 30 m), and two rounds were won at 98 and 115 s.
- **Backyard guns against Sean's AK (one life):** the Bucket Gun won 3 of 4. The Bolt Pistol won 2 of 4, the
  Six-Shooter 1 of 4 and the spring shotgun 1 of 4. The Thunder Pump lost 4 of 4 from 15 m and won 1 of 4 when closing
  to 8 m. The spring shotgun closing to 8 m lost all 4. Sean tags at 5–6 s from 10–15 m whatever you carry, so the
  pumps are underdogs here, and the Thunder Pump is no worse than the spring shotgun. That's the trade the builder
  described, not a bug. The Bucket Gun with a taped mag in the Hollow 3v3 was out at 18.7–54.8 s (1 life). My bot
  refills rather than flipping, so this run doesn't judge the taped mag.
- **Step cost** (three or four browsers at once): Night Shift averaged 0.8–2.6 ms with a p95 of 1.6–6.8, and Protect
  Ryan 1.5–2.3 ms with a p95 of 2.4–5.8. Single steps reached 230–390 ms under load, as last run's did.
- **First-timer path:** the title reads v1.171 with one button. The mirror, then DONE, puts you in the bedroom, and
  the first prompt is "E Go outside". Holding W from there walks past the mirror prompt to the computer.

### itch.io
Still unreachable: WebFetch gets EGRESS_BLOCKED for mbuckley616.itch.io, so I read no comments. In the last day of
Slack there were the builder's v1.164–v1.171 posts, the producer's posts, and the D.14/D.15/D.16 decisions and their
answers. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.161–v1.171)
- v1.170, VIP balance: see Problems 1 and 2. Rebecca falls because she stands at your spawn. Ryan lasts because the
  lane happens to be quieter, not because anyone is guarding him well. "VIP kids don't talk about being the VIP" is
  true, but it matters less than where they stand.
- v1.168, the gun trades: judged against one kid (above). Whether the Thunder Pump feels right at 10 m, and whether
  the Bucket Gun's 23 m/s BBs look slow, need hands. Prices: not judged.
- v1.169, the parts' trades: not judged. My bot doesn't flip the taped mag or sprint.
- v1.169 fix-up, the bored rifle kid holding at 40–50 m: not met this run.
- v1.171, planted feet: the builder's slip numbers are the headless measure. How it looks needs eyes. My side-on
  capture of a running kid failed (it rendered sky), so I have no picture for Michael.
- v1.171 fix-up, Brooke hiding at her anchor in the lot 3v3: not played.
- v1.161 / v1.165, the desk's ~20 s of cover and the treehouse's quiet 7 s: not replayed.
- v1.167, a crouched kid's chest-high carry over low cover: needs eyes.

I have no new proposal. Problem 1 is a bug, not a design question: the briefings already say where the VIPs should be.

## 2026-10-07 — Protect Ryan and Night Shift again, Friday Night Lights, Night Swim (v1.176)

I played the builder's tip, `auto/build` at c3defb3 (v1.176). Main is at v1.174, so the Night Shift dumpster (v1.175)
and the kids' game-time memory (v1.176) are only on that branch. I played 64 bot rounds: Night Shift 17, Protect
Ryan 11, Friday Night Lights 24, Night Swim 12, plus 12 thirty-second sniper openings (Night Swim and Northcliff's
night 4v4, 6 each). I also probed Protect Ryan's tags three times. There were no page errors anywhere, and
`node tests/run.mjs smoke` passes. Last run's bot didn't survive the session (tests/tmp is ignored), so I wrote a new
one. It aims at the nearest kid it can see (their VIP first when rushing), cocks for the gun's cock time plus 0.15 s,
fires, and refills an empty mag after 2 s. It either holds its start, pushes to 15 m from the nearest kid, or walks
straight at their VIP. It walks in a straight line, so on the lot it snags on cars for up to 5 s. The 600 ms end
timer runs on wall time, so I timed each ending from the tag that decided it.

**Problem 1: in Friday Night Lights, Owen tags you at your spawn about 3 s after BEGIN.** You start at the
bleachers at (5, 26.5), facing down the field 14° off Owen, who sits by the staff cars 48.3 m away with the spring
sniper (screenshot `docs/critic/2026-10-07-friday-night-lights-start-owen-48m-ahead.png`). The match gives you one
life. Standing still, you're out to Owen in 17 of 18 rounds, at 2.9–16.6 s, and 8 of those were inside 3.5 s, about
a second after the 2.5 s opening hold lifts. The bot fared no better. Holding and firing back, it was out at 3.1–3.5 s
in 3 of 3 rounds. Pushing up the field, it was out at 2.9–3.0 s in 3 of 3, from 36 m. It's survivable if you know
where to go. Sprinting 9.7 m left to the 3 m block at (−3, 21) and stopping behind it, away from Owen, takes 1.4 s, and
nobody touched me there for 20 s in 6 of 6 rounds. A first-timer won't know that, and the result screen's "Too many
angles, not enough cover" is the first they hear of it. This is the same failure as Two in the Yards (v1.86) and Hold
the Treehouse (v1.144). The other night snipers don't do it. Night Swim's Devon at 52 m and Northcliff's at 57 m fired
at 2.2–5 s but tagged a standing player 0 times in 12 rounds of 30 s. One more thing makes this worse: the briefing
text says "Four a side, four lives each", but the roster under it says "You … 1 life". All five night 4v4s (the
school, the club, Northcliff, the store and the lot) use the same "four lives" line with `playerLives: 1`. Steps:
`g.scenario('school_night_4v4')`, stand still, and `stepGame` until `Game.mode` is 'result'. Log the `enemyRef` of the BB
that hits you.

**Problem 2 (balance): Protect Ryan now goes to whoever walks at Priya, and a held round never ends.** Since v1.172
both VIPs stand on their anchors, at 0.0 m in every round. If you hold your start, no VIP fell on either side in 5
rounds of 120 s or 2 of 360 s (1,320 s of play), so a held round never ends. The match has no timer. If you walk
straight at Priya, you win 4 of 4. I tagged her from 12 m at 28.1, 33.1 and 39.4 s, and Sean got her at 15.2 s. Each
round cost 1–2 respawns. Last run, with Ryan at your elbow, the same walk took 76–113 s. Nobody on their side comes for
Ryan in house 0's backyard, so you lose nothing by leaving him. A player will find the walk quickly. I'm not filing
this as a bug. It's the trade v1.172 made by putting Ryan where the briefing says, and it's for Michael to judge with
hands.

**Night Shift with the dumpster (v1.175) is a different match.** I played 12 hold rounds: 6 of 120 s that could tag
me, and 6 of 60 s untaggable. Rebecca fell in 4 of the 12, at 19.1, 27.6, 45.5 and 48.1 s, every time to Mason. Two of
those were from 3 m, so he walked round the dumpster to her. The other two were from 11 m. Sean won one round, tagging
Seth from 29 m at 53.5 s. The other 7 were still level at the limit. Before the dumpster, last run, she fell in 6 of 7.
Walking straight at Seth won 0 of 5 for the bot, against 5 of 5 last run. Sean won one round at 46.6 s, and the other
4 were still going at 120 s, with the bot respawned 5–19 times on the way. Part of that is my straight-line walker
snagging on cars, so read it as "no longer a 15 s walk", not as "too hard". Mason getting to 3 m of her is worth a look
with hands.

**What worked.**
- **Night Swim plays as a match.** Pushing down the lawn with one life, the bot was out at 4.8–7.3 s (Seth from
  28 m, Marcus from 14 and 25 m), which fits the briefing's warning about the lit pool deck. Holding, it lost 1 round at
  58.3 s (Marcus, 28 m), and 2 were still going at 150 s. In 3 untaggable 300 s rounds, Trey finished Devon and Jamie
  at 105 and 112 s in two. In the third, our three were all out by 92 s, Jamie (4 lives) and Devon (3) were left, and
  nothing happened for the last 208 s. Ally Brooke walked 0 m in 300 s in 2 of the 3 rounds. That is the builder's open
  question from the v1.172 fix-up (a cautious ally far back sits the round out) on another map. The boredom march
  (v1.152) skips allies, snipers and defenders, so when Devon is the last kid, you have to cross 50 m to the veranda
  yourself.
- **D.18, Owen at his spawn:** 3 Protect Ryan rounds of 120 s, with every tag logged. Owen was tagged 1–2 times a round,
  and once at his spawn pen (29.3, 2.3). Tyler was the one tagged most, 7–8 times a round, by Sean and Nick, but all
  over the field (x −6 to 29) on his way in, not pinned. In this sample the pin D.18 describes is rare.
- **VIP endings:** every decided round matched what happened. A tagged Seth or Priya gave a win, and a tagged Rebecca
  a loss. Player respawns worked up to 19 times in one round, with no page error.
- **Stuck kids:** none seen. The bot itself was stuck on lot cars, which is my walker's fault.
- **Step cost** (four browsers at once): averages 0.8–4.5 ms, p95 1.7–11 ms. Single steps reached 815 ms under load,
  as before.
- **First-timer path:** the title reads v1.176. NEW GAME goes through the mirror to the bedroom, and the first prompt
  is "E Go outside".

### itch.io
Still unreachable: WebFetch gets EGRESS_BLOCKED for mbuckley616.itch.io, so I read no comments. In the last day of
Slack there were the builder's v1.170–v1.176 posts, the producer's posts, and D.17 with its answer (B). Nothing was
addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.172–v1.176)
- v1.172, VIP balance with both VIPs on their anchors: see Problem 2 and the Night Shift paragraph. Protect Ryan
  tilted toward the attacker, and Night Shift tilted toward nobody.
- v1.175, Rebecca leaving her spot (1 in 38 of the builder's rounds): not seen. She was 0.2 m off her anchor in all 17
  of my Night Shift rounds. Whether the dumpster makes Night Shift too safe with a real defender: with my bot, she
  still fell in 4 of 12, so it isn't too safe.
- v1.172 fix-up, a cautious ally sitting the round out: seen again in Night Swim (Brooke, 0 m in 300 s, 2 of 3). It's
  a design call, as the builder says.
- v1.173, workbench labels at in-between angles: not judged. It needs eyes.
- v1.174 and v1.176: nothing for play. With v1.176 my rounds run on game time anyway, and Devon's doorway was not
  replayed.
- D.18: rare in my sample (above).

I have no new proposal. Problem 1 is a bug of a kind the builder has fixed twice before, and Problem 2 is Michael's to
feel.

## 2026-10-08 — Storm the Court, Seth's Got a Shotgun, Two Against the World; Friday Night Lights and Protect Ryan again (v1.179)

I played main at e9be181 (v1.179). `auto/build` is ahead only by a decisions note (D.19), so main is the newest
build. I played 52 bot rounds: Friday Night Lights 12, Storm the Court 12, Seth's Got a Shotgun 16, Two Against the
World 6 and Protect Ryan 4. I also ran five probes. There were no page errors anywhere, and `node tests/run.mjs smoke`
passes. The bot is new again (tests/tmp doesn't survive). It aims at the nearest kid it can see, cocks for the gun's
cock time plus 0.15 s, fires, and refills an empty mag after 2 s. It either holds its start, or walks straight at the
nearest kid until it is 15 m away. One warning for whoever writes the next bot: making the player untaggable with
`maxHits = 1e9` freezes the page on the first hit, because `updateHealthHud` then builds that many pips. The vip suite
already says so. It cost me one 15-minute hang before I saw it. The untaggable rounds below ignore hits on the player
instead.

**Problem 1: kids on the cul-de-sac's raised bulb can't see over the plank fort, so they never fire.** In Storm the
Court, Mitchell has the sniper on the plank fort (`bulb_plank`, at (30.6, 2.3)), and the briefing says "he does not
miss". He fired 0 shots in all 12 rounds, and 0 in a 30 s probe where I walked the player from the lane to 12 m from him
and stopped there in the open. Ryan and Nick, behind the cars, fired 1–9 times a round. The cause is in the kids'
sight check. The bulb's ground sits at y 0.35, and the check that sets `_hasLOSNow` puts the kid's muzzle at
`(perch ? perch.y : 0) + 1.05 × scaleY`, which leaves the ground's height out. The code comment at v1.138 says so
("the ground's own height is still left out here"). For a kid on the bulb, that puts the eye about 0.8 m above his feet
instead of 1.2 m, which is below the plank's top. Over the same 30 s walk, I sampled his line to the player 53 times.
`_hasLOSNow`'s formula was clear 0 times, and the same line from his real height was clear 48 times. Priya, Protect
Ryan's VIP, holds the same anchor. She was clear 0 of 53 times against 40 of 53, and she fired 0 shots in that probe and
in all 4 of my Protect Ryan rounds, while Sean tagged her from 17–19 m. That explains last run's "walk straight at
Priya and win 4 of 4": the VIP can't shoot back. Screenshot `docs/critic/2026-10-08-storm-the-court-mitchell-hiding-at-12m.png`
shows Mitchell's head over the KEEP OUT plank at 12 m, in `hiding`, with 0 shots. So Storm the Court's sniper threat
doesn't exist, and with it most of the match's reason to "push the lane smart". Still, the straight walker was out in
6 of 6 rounds at 9.4–11.5 s, to Ryan and Nick from 15–22 m. Two Against the World's Priya (`bunratty_team_2v4`) also
starts at `bulb_plank`, but she isn't a defender and walks off it. I didn't check other raised ground. Any kid
standing on ground above y 0 behind cover just over 1 m should show the same thing. Steps: `g.scenario('bunratty_storm_the_court')`,
ignore hits on the player, walk him to (18.7, 1.4), and step 20 s. Count `spawnEnemyBB` calls from Mitchell, and
compare `hasLineOfSight` from `1.05 × scaleY` with one from `pos.y + 1.05 × scaleY`.

**Problem 2: Seth's Got a Shotgun's briefing promises "past 14m and he can't touch you", and he can.** When I held the
start, Seth ended 4 of 6 rounds at 3.5–4.5 s, tagging the player from 14.7, 14.7, 17.7 and 17.7 m. In 4 untaggable
probes he fired his first shot at 2.8 s from 20.1 m every time, his second from 16.9–17.3 m, and he hit from 15.0–17.7 m
in 3 of the 4 before closing to 5.7 m. The shotgun's AI bands are 6/8/25 (PUSH/NEAR/FAR), so he engages out to 25 m.
Either the line or Seth's range is wrong. A player who backs off to 15 m because the briefing told them to gets tagged
and doesn't know why. The match is otherwise a fair, fast duel: the bot won 4 of 12 (2 holding, 2 pushing), tagging
him from 5.7–5.8 m, and every round was decided by 8.2 s. Steps: `g.scenario('winnmark_seth_shotgun_duel')`, stand still,
and log the shooter's distance at each hit on the player.

**Friday Night Lights with the stand start (v1.177) and the allies walking out (v1.179).** Holding behind the stand,
nobody tagged me before 70 s in 6 of 6 rounds. Owen tagged nobody, and 4 rounds were still going at 120 s. The 2 I lost
were to Ryan, who walked in, at 70.6 s from 2.5 m and at 107.4 s from 21 m. Pushing up the field, I was out in 6 of 6 at
12–50 s, 5 of them to Ryan from 11–23 m. So the stand covers the start without making the round safe. Allies: Eric
walked 189–350 m and was out of lives by 120 s every time. Brooke fired 59–232 shots a round and Rebecca 26–77. Neither
sat out. But both stopped about 20–50 m from their start and stayed there 85–111 s of the 120: Rebecca at
(−16.4, 12.2), 7.5 m short of the south portable, and Brooke at (−22.4, 24.9). That matches the builder's v1.179 note.
They fight from there, so I'm not filing it. Mitchell on their side was the one who did least: 12–36 m walked, 7–50
shots, and still for 59–104 s in the stockroom corner at (−16, −22).

**Protect Ryan (v1.178).** I ran 4 rounds of 120 s, holding and untaggable. Owen reached his anchor at 18.3–18.4 s in 3
of them. In the fourth he was tagged on the way and ended up peeking behind the east car, his new spawn, for 61 s. Sean
tagged Priya at 43.3 and 100.8 s, so a held round now ends in 2 of 4 (last run: 0 of 7). With Problem 1, that's
because Priya can't shoot Sean back, not because of the spawn move.

**Two Against the World.** I ran 6 rounds holding the lane start with one life. I was out every time, at 9.6–21.7 s:
Priya twice (18.9 and 37 m), Ryan three times (5.5–14.7 m) and Mitchell once (27 m). Sean lost 1–2 of his 3 lives in
the same time. The briefing calls it "a real underdog fight", and it is one. I'm not filing it. Whether 10–20 s is
too short for a player is for hands.

**What worked.**
- **First-timer path:** the title reads v1.179, and the button says ENTER MIKE'S ROOM. NEW GAME goes through the
  mirror to the bedroom, and the first prompt is "E Go outside".
- **Stuck kids:** apart from the holders named above, none. The kids who stood still longest held cover at their
  posts, peeking and firing, and none of them was wedged on the way to one.
- **Step cost** (two to four browsers at once): averages 0.3–4.2 ms, p95 0.5–10.6 ms. Single steps reached 826 ms
  under load. The harness restarted one stalled NEW GAME (the known v1.123 stall).

### itch.io
Still unreachable: WebFetch can't resolve mbuckley616.itch.io, and curl gets a 403 from the proxy, so I read no
comments. In the last day of Slack there were the builder's v1.178 and v1.179 posts, the producer's posts, the D.18
decision, and two merge cards. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.177–v1.179)
- v1.177, whether the stand start is too safe for a capstone: it isn't. The start is safe from Owen, but Ryan walks in
  and ends 2 of 6 held rounds (above).
- v1.178, whether Owen's longer walk changes Protect Ryan's pace: he reaches his anchor at 18.3–18.4 s. I have no
  earlier number to compare against, and the pace is set by Problem 1 more than by Owen.
- v1.179, whether the west side feels crowded with two allies on it: the numbers say the two allies stop 7–20 m apart
  and both fire. How it feels needs hands.
- v1.179 and D.19, Night Swim's idle Brooke: not replayed. D.19 is with Michael.

I have no proposal. Problem 1 is a one-line kind of bug with a large effect on two matches, and Problem 2 is a line of
text or a range number. Both are the builder's.
