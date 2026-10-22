# Critic

Daily playtest reports from the critic routine: headless play of the latest build plus the itch.io comments.
Newest entry at the bottom. Old entries are never rewritten.

Last itch comment seen: none yet — itch.io unreachable from the cloud session (2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01, 2026-10-02, 2026-10-05, 2026-10-06, 2026-10-07, 2026-10-08, 2026-10-09, 2026-10-12, 2026-10-13, 2026-10-14, 2026-10-15, 2026-10-16, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-22); the July 2026 "cant go outside" comment in backlog A.1 predates this file.

Covered so far: new-game bedroom → map (2026-09-28); winnmark_tutorial, bunratty_sean, bunratty_night_lane, bunratty_night_team_2v2 (lasers only), hollow_skirmish_3v3 (2026-09-28); winnmark_defend_treehouse, winnmark_defend_culdesac, winnmark_night_prowl, winnmark_two_in_the_yards, bunratty_infection, bunratty_brothers, hollow_defend_south_fort, hollow_attack_north_fort, hollow_full_auto_mayhem (AI watched, not played) (2026-09-29); winnmark_whole_block, bunratty_pincer, hollow_juggernaut, hollow_big_battle, winnmark_sniper_overwatch, hollow_infection_night (2026-09-30); new-save mirror → bedroom → front door, all five lot_* scenarios, winnmark_last_stand, winnmark_team_3v3, bunratty_team_4v4, hollow_attack_north_fort(_night), hollow_defend_south_fort_night (2026-10-01); all four northcliff_* scenarios, lot_ffa's hidden starts (v1.134), the Loadout screen's kid (2026-10-02); all four store_* scenarios, stoneglen_hold_treehouse, club_defend_gazebo, school_defend_portables (2026-10-05); bunratty_vip, lot_vip_night, school_1v1_tyler, school_portables_3v3, club_1v1_brooke, club_eighteenth_3v3, the four v1.168 guns against bunratty_sean, the Bucket Gun with a taped mag in hollow_skirmish_3v3 (2026-10-06); bunratty_vip and lot_vip_night again (v1.172 anchors, v1.175 dumpster), school_night_4v4, club_night_4v4, northcliff_night_4v4 (sniper opening only), new-game bedroom prompt (2026-10-07); bunratty_storm_the_court, winnmark_seth_shotgun_duel, bunratty_team_2v4, school_night_lights, bunratty_vip (2026-10-08); bunratty_storm_the_court and bunratty_vip after v1.180, stoneglen_treehouse, hollow_night_battle, hollow_2v4_night, the briefings' lives against `playerLives` (2026-10-09); bellfield_ctf, bellfield_1v1_mason, bellfield_defend_fort, school_portables_3v3 (2026-10-12); bellfield_ctf after v1.191, the v1.201 pickup game 4v4 on northcliff, country_club and store by day and night, bellfield_night_4v4, bellfield_3v3, new-game bedroom prompts (2026-10-13); the 14 and 15 Oct entries list theirs; last_saturday after v1.251, store_night_4v4 with squad orders, store_1v1_tyler with the pool noodle, lot_1v1_marcus with the Rattle Can, squad orders measured in hollow_skirmish_3v3 and store_night_4v4, new game → front door → map (2026-10-16); the 19 Oct entry lists its; hollow_defend_south_fort from the floor and the v1.259 deck, bunratty_vip after v1.272 (held, pushed, and flanking Priya), store_price_check_3v3, hollow_ffa and bunratty_ffa after v1.265–v1.267, bellfield_night_4v4 after v1.266, the crew build's club_eighteenth_3v3 (2026-10-20); with the crew a first time through gives: hollow_full_auto_mayhem, school_night_4v4, store_night_4v4, bunratty_vip after v1.282, bellfield_ctf after v1.280 to its 5:00 clock, hollow_skirmish_3v3 with no crew (the "Not yet" fill), new game → bedroom prompt (2026-10-21); winnmark_night_team_2v2 first time and replayed after it is won (and the other Winnmark team matches' sides on a replay), the New teammate card (Eric), last_saturday and bunratty_vip and bellfield_ctf for the walk home and the 3 s grace, hollow_attack_north_fort, winnmark_two_in_the_yards, the attack huddle's starts in the eight biggest team matches (2026-10-22).

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

## 2026-10-09 — King of the Treehouse, Night Game in the Woods, Two of Us Four of Them (Night); Storm the Court and Protect Ryan after v1.180 (v1.181)

I played main at c02adf8 (v1.181). `auto/build` is ahead only by a decisions note (D.20), so main is the newest
build. I played 61 bot rounds: King of the Treehouse 14 (8 on v1.181, 3 each on v1.179 and v1.138), Storm the Court
10, Protect Ryan 8, Night Game in the Woods 9 and Two of Us, Four of Them (Night) 6. I also ran four probes. There were
no page errors anywhere, and `node tests/run.mjs smoke` passes. The bot is new again. It aims from the camera at the
nearest kid it can see, holds the trigger to a full pull, releases, and fires when it has a line. It refills an empty
mag after 2 s. It either holds its start, or walks straight at the nearest kid until it is 15 m away. A note for
whoever writes the next bot: the win in a VIP or team match comes through a `setTimeout` (v1.90's guarded delays), so a
bot that runs the whole round inside one `page.evaluate` never sees it end. Step in chunks with an await between them.
My first VIP rounds showed Priya out with the round still going, and that was the bot's fault, not the game's.

**Problem 1: King of the Treehouse ends about 3 s after BEGIN, whatever the player does.** This is the first time I've
played it. Connor holds the treehouse platform with an MP5. You start by the bins at the side gate, 24.5 m from him, in
the open with the platform in full view (screenshot `docs/critic/2026-10-09-king-of-the-treehouse-spawn.png`). The
v1.101 opening hold ends at 2.5 s, and his first burst (5–9 BBs) tags you at 2.9–3.3 s. That happened in 8 of 8 rounds,
holding or walking at him, from 17–24.5 m. Then I sprinted for 2.5 s from the start in each of eight directions,
45° apart, and stopped. He had a line in 55 of 55 samples every time and tagged me at 2.6–3.4 s. That includes the run
straight under the platform to 6.1 m. In the 2.5 s the hold gives you there is no cover from a kid 2.6 m up, and one
hit ends the match. It isn't new. v1.138, the build that added the map, gives the same 3.0–3.3 s from 24.5 m in 3 of 3,
and so does v1.179. The briefing invites you to "get to the ladder and climb it", which takes about 1.5 s once you are
there. As it plays, a first-timer reads the card, clicks BEGIN and is out before they've found the ladder. It is
Devon's opening shot in Two in the Yards again, which Michael answered with the opening hold. This time the hold is
too short, because the shooter sees the whole yard. The fixes are a start out of his sight (behind the shed or the
house corner), cover between the gate and the oak, or a longer first-shot wait for a perch defender. Which one is a
design call, so I'm filing it and leaving the choice open. Steps: `g.scenario('stoneglen_treehouse')`, stand still
or sprint any way, step 8 s, and log the time of the first hit on the player.

**Problem 2: three briefings promise you five lives or respawns, and you get one.** Two of Us, Four of Them (Night) says
"Everyone's got five lives and respawns at their fort". The Hollow 3v3 (`hollow_skirmish_3v3`) says "everyone's got
five lives and respawns at their fort". Bunratty's Night Game: Sean Has Your Back (`bunratty_night_team_2v2`) says
"everyone respawning at their base", and Winnmark's night 2v2 says "both teams respawning at their base flags". All four
have `playerLives: 1`. The roster under each briefing says "You · 1 life" correctly, so only the prose is wrong
(screenshot `docs/critic/2026-10-09-two-of-us-briefing-five-lives.png`). In the six Two of Us rounds I was out on the
first hit every time, at 22.5–79.6 s. The other Hollow and lot battles already say it right ("five lives for every kid
but you"), so the fix is the same few words in four lines of text.

**Storm the Court after v1.180.** Mitchell shoots back now. Walking down the lane, I was out in 6 of 6 rounds at
5.6–8.8 s. Mitchell tagged me in all six, from 17.5–30.7 m, with his first or second shot (1–2 shots a round). Last run,
the same walk was out at 9.4–11.5 s, to Ryan and Nick. Holding the start, nobody fired a shot in 4 rounds of 90 s, and
none of those rounds ended. Whether a sniper who lands his first shot from 30 m is too hard is v1.180's Still open, and
it needs hands. A bot walking a straight line down the lane is the worst case. "He does not miss" now holds.

**Protect Ryan after v1.180.** Priya fires back now, 1–51 shots a round (0 in all four rounds last run). Holding the
start for 120 s, I won 1 of 4, when Sean tagged her at 71 s. The other 3 ran to 120 s. Walking at Priya, I won 3 of 4,
at 10.0, 82.5 and 105.5 s. I was tagged 1–9 times on the way (you come back in a VIP match), mostly by Mitchell from
19–26 m. Last run that walk won 4 of 4. It is harder now, but not shut.

**Night Game in the Woods (`hollow_night_battle`).** I played 8 rounds of 150 s. In the four I held, I was out in 3, at
53, 86 and 89 s, to Ryan from 5.7 and 19.6 m and Seth from 14.7 m. My "push" bot wedged against its own fort wall 4.6 m
from the start, so the other four rounds were holds too. I was not tagged in any of them, and all four went to 150 s.
The fight is real. Eric runs out of all 5 lives in 6 of 8 rounds, and Seth and Ryan lose theirs in 4 of 8. Two
allies stand still. Rebecca (pistol, posted to `b_creek`) stays at (1.7, 35.7) in her own fort in 8 of 8 rounds,
walks 0 m and fires 0–11 shots in 150 s. Brooke (sniper) walks 0 m in 7 of 8 and fires 18–46. That is D.19's cautious
ally on a third map, after Night Swim and Price Check. I've added one line under Found in play so whichever answer
Michael gives can be checked here. Solo, with nothing else running, the match steps at 1.97 ms on average, p95 4.4 ms,
worst 15.7 ms, with all its lights.

**Two of Us, Four of Them (Night).** I played 6 rounds, out at 22.5–79.6 s, to Ryan from 5.8–9.3 m four times and to
Seth from 14.7 and 19 m. The enemy sniper Mason walks 1 m a round and fires 2–12 shots from the north fort, which is a
sniper's job. Sean stays alive (0–2 lives lost) and fires 35–341 shots. Apart from Problem 2, it plays as the briefing
says.

**What worked.**
- **First-timer path:** the title reads v1.181, and the button says ENTER MIKE'S ROOM. NEW GAME goes through the mirror
  to the bedroom, and the first prompt is "E Go outside".
- **Kids' heights:** on Bunratty and the Hollow, every kid's feet are within 0.00 m of the ground under him, sampled
  each second for 30 s. Bunratty's west end really is 11.5 m up the hill, so Ryan at y 11.5 is standing on the ground.
- **Stuck kids:** none, apart from the allies above and the perch and fort defenders, who are meant to hold.
- **Step cost** (four browsers at once): averages 0.3–5.8 ms, p95 0.8–21.8 ms. Single steps reached 1.06 s under load.
  Solo figures are above.

### itch.io
Still unreachable. WebFetch can't resolve mbuckley616.itch.io, and curl's CONNECT is refused by the proxy, so I read no
comments. In the last day of Slack there were the builder's v1.180–v1.181 post, the producer's posts, the merge card,
D.19 and D.20. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.180–v1.181)
- v1.180, whether Storm the Court and Protect Ryan are now too hard: I could judge the numbers headless (above). A
  straight walk down the lane is out in 6–9 s, and walking at Priya still wins 3 of 4. Whether that feels too hard
  needs hands, and so does whether a player who uses the cars' cover lasts longer.
- v1.181, whether Seth should have a real safe range: not replayed. That one is Michael's.
- D.20, the kids' walk: I can't judge it headless.

I have no proposal. Problem 1 needs Michael's choice of fix, which I've put under Pending for the producer. Problem 2
is the builder's text edit.

## 2026-10-12 — Bellfield Court: Flags on Bellfield, Mason's Court, Hold the Bulb Fort; the school's new kids (v1.190)

I played v1.190 from `auto/build`. main is at v1.189, and v1.190 only changes the school's roster. A bot drove the
player. It walks the game's own distance field (`kidFieldTo`) to its goal, racks the spring and fires at the nearest
enemy it can see within 40 m, aiming dead on. When the mag runs dry the script refills it (14–20 times a round in the
long matches), because a real player would be feeding a speed loader. Three bot modes: *push* (go to the goal,
shooting), *run* (sprint to the goal, never shoot) and *stand* (at the start, never shoot). I played 25 rounds with
no page errors. The NEW GAME → bedroom path passed in smoke.

**Problem 1: Flags on Bellfield never ends.** It is first to two flags, with no clock and everyone coming back, and
none of my 8 rounds reached a result. Over 1,530 s of play there was one capture, by Mason. These were all on
`bellfield_ctf`:
- *Push*, 3 rounds of 240 s: 0–0, 0–0, 0–0. The player never got to their flag, and was tagged 33–36 times a round
  (every 7 s) in the middle of the street, mostly by Fernando's AK from 13–38 m and by Mason. In one stretch Fernando
  tagged him 14 times running, each one 2.0–3.5 s after the last, from 28–38 m. That is about one tag every time the
  2 s respawn grace ran out on the walk back in. Andrew (our runner) took their flag twice a round and lost it within
  2–7 s each time.
- *Run* (sprint for the flag, never shoot), 3 rounds of 180 s: 0–0, 0–0, 0–1. The player reached their flag 3 times
  in 540 s and was tagged with it within 1 s every time, after carrying it 1–5 m. Christian and Fernando wait by the
  kid fort beside the flag, 1–8 m away (screenshot `docs/critic/2026-10-12-flags-carry.png`: Christian at 6.7 m when
  you pick it up). The one capture was Mason's at 41 s in round 3. He took our flag twice more and lost it both times.
- *Stand* at the start, 2 rounds of 150 s: 0–0 both. Mason, their runner, comes for the player instead of the flag 4
  m away, and took our flag once a round. Tagged 6–9 times a round, mostly by Mason at 8–16 m.
The match does what v1.189 says it does. Taking, dropping, sending home and the HUD all behaved, and the timer box
reads "FLAGS · FIRST TO 2 0 – 0" or "OUR FLAG IS DOWN 0 – 1". But a player who can't score in four minutes has no way
out except quitting, and a round with no clock never pays out. The builder already listed a clock as Michael's
call once he had played it, so I've put the numbers under Pending (a clock, two defenders fewer by their flag, or
both) rather than pick a fix. My bot is a poor flag runner: it never uses the backyards or clears the fort before
grabbing. A real player will do better, and whether that is enough needs hands.

**Mason's Court** (`bellfield_1v1_mason`), *push*, 6 rounds: 3 wins and 3 losses, all decided at 8.9–13.3 s, 33 m
down the street, with the two pistols 7–10.5 m apart. Each side got one hit in. Mason walks to meet you rather than
sitting behind the fort, so the "58 m of open street" in v1.186's Still open never comes up: the fight happens at
pistol range in the middle. The result screen matched what happened every time (YOU GOT THEM +$8, YOU'RE OUT +$2).

**Hold the Bulb Fort** (`bellfield_defend_fort`), holding inside the fort and shooting back, 4 rounds of 90 s: 4 wins,
and the player was never tagged. The bot tagged 9–10 attackers a round in three waves (about 17–26 s, 43–56 s,
68–88 s) for 66–71 shots, and nobody ever reached the open back. v1.187 measured a player who never fires as tagged at
22–24 s. One who fires back is not tagged at all here. My bot aims perfectly and has no reaction time, so this is an
upper bound. Even so, it suggests the defend is easy for anyone who shoots back. "MOM CALLED THEM IN!" showed every
time, +$9.

**The Portables (v1.190's kids)** (`school_portables_3v3`), *push*, 3 rounds: out at 6.2, 6.4 and 25.3 s, to Caleb
from 13 m twice and to Nathan from 22 m. Sophie was tagged once. Caleb, Nathan and Sophie build, name themselves on
the roster and the result line ("Caleb, Nathan, and Sophie regroup near the road"), and fight. I can't tell whether
the faces read headless.

**What worked.**
- No page errors in 25 rounds. Every result screen matched the outcome.
- The CTF HUD and rules behaved as v1.189 lists them: pickup, the carrier's HUD line, drop on tag, return by touch
  and the 20 s timeout all showed up in play, not only in the scripted suite.
- Step cost (one browser, with a second one playing at the same time): Mason's Court averages 0.2–1.1 ms. Flags on
  Bellfield averages 1.0–1.2 ms, with its worst single step at 198 ms. The fort averages 0.4–0.6 ms, with spikes to
  119–359 ms while the other browser was busy. The Portables averages 1.1–2.1 ms.

**Not a bug, but noted:** `Game.scenario.aiClock` is never reset, so it keeps counting across rounds in one session
(my first logs showed rounds "ending" at 12, 22, 32 s). The kids' ban and route windows only compare it against
values taken in the same round, and the opening hold uses `roundTime`, so nothing in play is wrong. Suites that time
with it will be off after the first round.

### itch.io
Still unreachable. WebFetch can't resolve mbuckley616.itch.io, and curl's CONNECT gets a 403 from the proxy, so I
read no comments. Slack's last day had the builder's v1.187–v1.190 posts, the producer's posts, the v1.189 merge and
the two "what next" decisions. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.182–v1.190)
- v1.183, the kids' turn and lean: can't judge headless. Nothing in the numbers above looked like a kid snapping.
- v1.184, a bored ally walking out: not replayed this run.
- v1.185, the treehouse's shed start: not replayed. `treehouse-start` covers the numbers.
- v1.186, 58 m of open street for a pistol 1v1: judged headless (above). The duel happens at 7–10 m in the middle of
  the street, not across 58 m. Whether the backyards get used needs a human, because my bot never goes there.
- v1.187, whether the fort is fair: judged headless. Easy for a player who fires back (0 tags taken in 4 rounds).
- v1.188, lamplight pools: can't judge headless. Not played.
- v1.189, CTF balance and a clock: judged headless. It doesn't end (Problem 1).
- v1.190, the school kids' looks: can't judge headless. They play as the kids they replace.

I have no proposal this run. Problem 1 is under Pending for the producer.


## 2026-10-13 — Flags on Bellfield with its clock, the Pickup Game by day and night, Lamplight on Bellfield (v1.201)

I played v1.201 from `auto/build`; main is at v1.194. The bot is last run's, rebuilt: it walks `kidFieldTo` to a goal,
racks the spring by holding the trigger through `onLmbDown`/`onLmbUp` as a player does, and fires at the nearest enemy
it can see within 40 m, aiming dead on. When it has a line to a kid inside 25 m it stops walking to trade, which a
real player behind cover would not always do. Modes as before: *push*, *run* (sprint, never shoot), *stand*. 32
rounds, no page errors. Smoke passes. The NEW GAME path still works for a first-timer: the mirror opens, DONE puts you
in the hall with "E Go outside" on screen, and the new wall things (phone "1 new", the pickup board, the calendar) are
5.9–6.8 m away, so none of them takes the door's prompt.

**Flags on Bellfield after v1.191** (`bellfield_ctf`), 6 rounds. Every round ended on the clock, which is the fix
working: two draws 0–0 from *push*, and from *run* a draw 0–0, a win 1–0 (my capture at 287 s), a loss 0–1 and a
draw 1–1. Last week 0 of 8 ended. So four of six were draws, which pay as a loss (screenshot
`docs/critic/2026-10-13-flags-draw-card.png`: "DRAW 0–0", red, +$3, Mason's "A tie doesn't count. Run it back?").
- *Run* (4 rounds, about 1,250 s): the player took their flag at least 5 times and brought it home twice. Last week it was 3 takes
  and 0 home in 540 s. But the runner is tagged 48–61 times in five minutes, about every 5–6 s. Of 105 logged tags, only
  9 came within 15 m of their flag. The rest came in the street. Christian, now a pusher, made 38 of them at 0–13 m,
  because he runs to the middle of the street, which is the runner's route. Fernando made 41, mostly from 26–34 m with
  the AK. Mason made 26.
- *Push* (2 rounds): tagged 30 times a round. The bot tagged 24–27 kids a round and never got to their flag. Andrew
  took it 1–2 times a round and never got it home.
- v1.191's draw question: a draw shows in the lose colour and pays the loss pay. Mason's line reads right for a draw.
  Whether it should look different is still Michael's call.
- Step cost: 0.9–1.6 ms on average, 26–38 ms worst.

**The Pickup Game** (v1.201), 4v4 with 3 lives, built by `buildPickupScenario` and entered as `pickup_game`, 20
rounds on three of the six maps that used to be night only, day and night. I lost all 20, out at 8.1–38.3 s. Each
paid $1 and left `completed` at 0, so the ladder is untouched as promised. Two problems:

*Problem 1: your "lives" are not the kids' lives.* The briefing says "3 lives for everyone, you included". For a kid,
a life is a tag, a walk back to base and a return. For you, a life is one hit (`playerLives` → `maxHits`), with no
gap between hits and no return. An auto gun or a shotgun takes all three at once. In 6 of 20 rounds, all three of my
hits landed within 1.1 s:
- Store by night: Jamie's shotgun from 2 m landed 3 pellets in the same frame (19.6, 19.6, 19.6 s). Marcus's AK hit at
  9.0, 9.1, 9.2 and at 8.4, 9.0, 9.2.
- Store by day: Marcus's AK hit at 9.2, 9.4, 9.5.
- Willow Bend by day: Devon, then Seth, at 7.8, 7.9, 8.1.
- Northcliff by night: Mason at 15.6, 15.7, 16.7.

Store by day also had Jamie land two pellets in one frame. The same holds for 5 lives: one AK burst. The words promise
a fair trade that the rules don't give. I've filed it under Found in play and written a proposal.

*Problem 2: Northcliff by day belongs to Fernando's rifle.* The pickup game copies the night 4v4's spots, and Fernando
keeps the sniper on the high yard (`yard_n3`). By day he made 15 of the 15 hits on me in 5 rounds. They came from 20–25
m, one every 2.4–2.9 s, and I was out at 15.4–16.6 s every time. By night, from the same spots, he made 5 of 15, and the
rest were Diego, Mason and Christian. This is v1.201's "a sniper spot chosen for the dark may be strong in daylight",
and on Northcliff it is. My bot stood and traded at 25 m, so a real player who takes cover will last longer. Still, 15
of 15 is one kid deciding the match. On Willow Bend, Devon's veranda rifle made 2 of 6 by day and 1 of 6 by night.
Inside the store, Devon made none. There the AK and the shotgun decide it.
- The start view on Northcliff (screenshot `docs/critic/2026-10-13-pickup-northcliff-day.png`) has a street lamp dead
  centre about 3 m ahead. It has no collision box, so it is cosmetic, but it's the first thing you see. The ladder's
  night 4v4 shares this start.
- Step cost: Northcliff 2.6–8.4 ms average, 156–263 ms worst; Willow Bend 3.4–7.7 ms, 107–166 ms worst. The store
  is 1.1–3.7 ms, 42–54 ms worst. Northcliff's averages are the highest I've logged this month, but a second browser
  wasn't running here, so they may be real.

**Lamplight on Bellfield** (`bellfield_night_4v4`), *push*, 3 rounds: out at 4.0, 15.1 and 12.1 s, one life. Mason's AK
tagged me from 37 m at 4.0 s, 1.5 s after the opening hold and before I'd fired twice. The other two were Mason and
Diego from 17 m. **Bellfield Bulb** (`bellfield_3v3`), 3 rounds: out at 8.0–10.5 s, to Diego and Fernando from 21–35
m. My bot is a poor match for a 4v4 with one life, so I've only noted these. Nothing in them looked broken.

**What worked.**
- No page errors in 32 rounds. Every result card matched the round. TAGS and SHOTS on the card equal what the bot
  counted (230/230, 205/205). HITS ON YOU counts each respawn in Flags (30, 48, 61), which is right for that mode.
- The CTF clock: every round ended, the outcome text matched the score, and the 0.8 s freeze held.
- The pickup board's briefing reads right ("A pickup game in the afternoon on Northcliff Trace, nothing on the line.
  You've got Andrew, Alex and Evan against Mason, Christian, Diego and Fernando."). The pay and the ladder behave as
  v1.201 says.
- A harness note, not a game bug: `endScenarioLater` waits 800 ms of real time. A script that runs faster than real
  time sees CTF rounds end at 5:12–5:18. In real play it's 5:01.

### itch.io
Still unreachable. WebFetch can't resolve mbuckley616.itch.io (ENOTFOUND), so I read no comments. In Slack's last day
there were the builder's v1.192–v1.201 posts, the v1.192–v1.194 merge and the producer's posts. Nothing was addressed
to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.191–v1.201)
- v1.191, whether a player can get their flag home: judged headless. Yes, sometimes. My runner took it at least 5 times in 4
  rounds and got it home twice. The street is the problem now: about one tag every 5–6 s, mostly from the new pusher
  Christian up close and Fernando's AK from 26–34 m. The draw's colour is for Michael (it reads as a loss).
- v1.192, the settings ranges: can't judge headless.
- v1.193, best-moment thresholds: they fired sensibly ("Two in 1.3 s: Fernando, then Christian.", "A 25 m tag on
  Fernando."). Whether those are the moments a player would pick needs hands.
- v1.194–v1.196, the calendar spans, the texts' voice, the rival line: not played. They're about the long game, and
  I played no ladder run through.
- v1.197–v1.200, hats, tops, shorts, the crew bandana: can't judge headless. These are for Michael's eye.
- v1.201, the board: judged headless for three of its six day-from-night maps. They build and run with no errors.
  Northcliff by day is Fernando's rifle (Problem 2). Willow Bend and the store are not dominated by their snipers.
  Problem 1, lives, is new.

## 2026-10-14 — The Last Saturday, the Pickup Game after its lives fix (four day maps, two free-for-alls), Northcliff by day with Fernando's AK, a first-timer to the first match and back (v1.224)

I played v1.224 from `auto/build`; main is at v1.210. Same bot as last run, rebuilt in `tests/tmp/`: it walks `kidFieldTo`
to the nearest enemy, racks the spring by holding the trigger through `onLmbDown`/`onLmbUp`, aims dead on at the
nearest kid it can see inside 40 m and stops to trade inside 25 m. When the mag is empty it gets a full one after
2.5 s instead of using the loader, which is kinder than a real reload. This run it also logs who fired the BB that
hit you (`bb.enemyRef`), so the kid names below are the shooters. It ends rounds on stepped time rather than
`endScenarioLater`'s real 800 ms, so the times below are the game's own. Modes: *push*, *run* (sprint, never shoot),
*stand*. 32 rounds, no page errors. Smoke passes. The bot carries the new-game Spring Pistol everywhere, which matters
most in the Last Saturday (below).

**A first-timer, start to finish.** NEW GAME → mirror → DONE → the hall with "E Go outside" focused. E opens the map,
whose one open card is Backyard Basics, marked NEXT. START, then BEGIN, and the bot cleared it in 25.3 s with 20 shots.
BACK TO YOUR ROOM, then a page reload: the title offers CONTINUE, and it brings back the $37 (from $35) and the
tutorial ticked. The autosave (v1.218) works the way a player would test it.

**The Last Saturday** (`last_saturday`, v1.205), 10 rounds, all lost. It is the summer's last match, and the briefing
promises "Six a side, three lives for everybody", with "You … 3 lives" on the roster (screenshot
`docs/critic/2026-10-14-last-saturday-briefing.png`). The kids get three lives with a walk home between them. You get
three hits where you stand, which is the Pickup Game problem from 13 Oct. v1.222 fixed it for the board only.
- Two of your lives went within 0.75 s in 8 of 10 rounds. All three went inside 0.55 s in 2 of 10: Mitchell's AK at
  3.68, 4.15 and 4.23 s, and Mason's MP5 at 11.27, 11.47 and 11.57 s. Ryan's shotgun took two in 0.12 s from 7 m.
- Sprinting off the start without firing, you are out at 4.0, 4.5 and 4.2 s, 1.5–2 s after the opening hold.
  Pushing, you are out at 7.2–15.3 s. Standing at the start you last 152 and 200 s, because they come to you one
  at a time.
- The result card is the stock one ("regroup near the road. "Run it back?""), so the summer's last match ends on a
  generic line (screenshot `docs/critic/2026-10-14-last-saturday-out-at-4s.png`).
- A real player arrives here with a bought gun, and against six AKs, MP5s and UMPs my pistol is the worst case. But
  the lives problem doesn't depend on the gun. Filed under Found in play. Of the story matches, this is now the only
  one with more than one player life, not counting the tutorial, so Michael's A on the pickup question looks to cover it.
- Step cost: 4.7–8.4 ms on average, 482 ms worst. It's the heaviest map I've logged: eleven kids on Bunratty.

**The Pickup Game after v1.222** (a tag costs a life and sends you to your start with 2 s of cover), 3 lives, by day.
The 4v4s were on Bunratty, the lot, the school and Northcliff, and Winnmark ran its 3v3. The free-for-alls were
6-ways on Bunratty and the Hollow. 21 rounds: 1 won (Winnmark, *stand*, 210 s) and 2 ran to my 240 s cap with no
result (Bunratty and the school, *stand*, with 0 and 1 hits: nobody came; the clock was Off). The other 18 were lost.
- The fix holds. Across 54 lost lives, the shortest gap between two was 2.05 s. On 13 Oct, 6 of 20 rounds lost all
  three inside 1.1 s. *Push* rounds now last 15.0–50.6 s, up from 8.1–38.3 s.
- v1.222's camping worry holds on Bunratty's free-for-all. Sean's AK took all six of my lives in two rounds from
  17–20 m, each time within 2.05–2.9 s of my return to the start, and 3.07 s into the first round. *Push* was out at
  8.0 s and *stand* at 14.8 s. On the Hollow's 6-way, the kills were spread out (Sean at 4–6 m, Seth at 26 m, out at
  34.4 s). The team starts weren't camped: their gaps were 2.55 s and up, mostly 5–25 s.
- Northcliff by day with Fernando's AK (v1.207), 7 rounds, out at 18.0–68.8 s. In the 4 rounds I attributed, Fernando
  took your first life every time, at 6.8–9.7 s from 57.8 m, and none after that. The other 8 lives went to Diego
  (MP5), Mason (AK) and Christian (shotgun). He's no longer the whole match (15 of 15 hits with the rifle), but the nest
  still sees the start. An AK hitting from 58 m in the first 10 s of every round is longer than any other kid reached
  me in 32 rounds.
- Step cost: 0.6–3.7 ms on average. Worst frames: 400 ms on Bunratty, 424 ms at the school, 320 ms on Northcliff.

**What worked.** No page errors in 32 rounds. Every result card matched the round: TAGS, SHOTS and HITS ON YOU equal
the bot's counts, and the pickup pay was $1 a loss and $3 the win. The opening hold held everywhere: the earliest tag
was 3.07 s. The Last Saturday's briefing, roster, map and RIVALS line read right. The first-timer path is clean.

### itch.io
Still unreachable. WebFetch fails on mbuckley616.itch.io (ENOTFOUND), and curl gets no connection. I read no comments.
In Slack's last day there were the builder's v1.196–v1.224 posts, the producer's and Fable's posts, and the merge and
decision cards. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.202–v1.224)
- v1.202, the free-for-alls: two 6-ways built and ran, with no errors. Fun and the 8-way cap need hands. On Bunratty,
  one kid (Sean) with a line to your start decides it (above). I played no night free-for-all.
- v1.203, picking kids: not played. I used the defaults.
- v1.204, the clock: not judged. I ran with the clock Off, and two *stand* rounds stalemated at 240 s. That's an
  argument for the clock rather than against it.
- v1.205, the Last Saturday as the big finish: it reads right on the briefing and plays as a 4–15 s wipe for a player
  who moves. Most of that is the lives problem (filed). Whether 6v6 at three lives is the right length can only be
  judged once that's fixed.
- v1.206, sneakers; v1.209–v1.212, shop pictures; v1.213–v1.217, the room and the house backs; v1.219–v1.224, hands
  and guns: these are for Michael's eye. I can't judge them headless.
- v1.207, Fernando's AK by day: judged headless. He takes the first life from 58 m in 4 of 4 rounds and nothing after.
  He's strong in the opening, not dominant. Option B is still there if Michael feels it.
- v1.208, F asks before forfeiting: covered by its own test. I didn't play it.
- v1.218, the autosave: judged headless, through a real reload and CONTINUE (above). I didn't judge the "Saved"
  note's look.
- v1.222, the pickup life: judged headless. It works (shortest gap 2.05 s across 54 lives). The camping question is
  real on Bunratty's free-for-all start, and I didn't see it on the team starts.

## 2026-10-15 — Outnumbered, The Eighteenth, Every Kid for Themselves, Storm the Cul-de-Sac; the pause menu, the damage report and shooting out kids (v1.244)

I played v1.244 from `auto/build`; main is at v1.228. The bot is rebuilt in `tests/tmp/` the same way as last run:
it walks `kidFieldTo` toward the nearest live enemy, racks the spring by holding the trigger, aims dead on at the
nearest kid it can see inside 40 m, stops to trade inside 25 m, and gets a full mag 2.5 s after it runs dry. Modes:
*push* and *stand*. It carries the new-game Spring Pistol. None of these four had a critic run before. 22 bot
rounds, plus probes for the pause menu, out kids, the free-for-all starts, the result screen's cost and the bed card.
No page errors anywhere. Smoke passes. The rounds that the bot logs as 240 s wins are its own artifact: I step the
game inside one evaluate, so `endScenarioLater`'s real-time 600 ms never fires until the loop ends. The kills and
hits are right; those clocks are not.

**The first loss of a session freezes the game for seconds (v1.238).** It's the step where you get tagged out. In
the bot's first round of every boot, that step was the worst of the round: 1.4–5.5 s with two browsers running,
and 563 ms alone. Later rounds' worst steps were 6–60 ms. Timing `endScenario('lose')` alone, one browser, a fresh
boot: 2,227 ms and 3,338 ms the first time, then 3–6 ms. On main's v1.228 it's 7 ms, then 2–3 ms. `DAMAGE_REPORT.renderer`
is null before that call and set after it. The damage report makes its own WebGL renderer the first time it draws,
and that costs the whole freeze. Software GL makes this worse than a real GPU would, but a new context and its shaders
still cost something real on a laptop, and it lands at the moment you're tagged. Steps: a new game, any match, get tagged
out once. Filed under Found in play. The fix is probably to build the renderer at boot or at BEGIN, or to draw with the
game's own renderer.

**An out kid is cover for his team, and only against you (v1.237).** In a one-life match, a tagged kid stands with his
hand up where he was tagged for the rest of the round. Since v1.237 he stops your BBs. A teammate's BBs still pass
through him (as the devlog says). I checked it directly in Storm the Cul-de-Sac: Trey tagged and standing 6 m in front
of you, Brooke live behind him at 12 m. Your BB at Brooke stops on Trey (`outShots` +1) and Brooke is untouched.
Brooke's BB at you goes straight through Trey and tags you. In the bot's own rounds this came up once in 22, in
Outnumbered (*stand*, 123 s): a BB aimed at a live kid was stopped by an out one. It's rare, and Michael asked for out
kids to be shootable. But a permanent shield that works one way only isn't what he asked for. I filed it as a bug and
put the choice in decisions.md under Pending.

**Every Kid for Themselves** (`winnmark_ffa`, 5-way), 5 bot rounds plus 7 probes. You start on `road_east`, 27.7 m
from Seth's backyard and 32–59 m from the others. Seth walks straight at you and has a line from about 2–3 s. He tagged
a player standing at the start at 4.4, 7.5, 7.7 and 7.7 s in 4 of 4 probes, from 9–17 m. In the bot rounds he took
4 of the 4 losses (3.5–5.5 s, two of them from 1 m as he came round the hedge to you). The one *push* round I won took
all four kids. With the player made untouchable for 90 s, the kids tagged each other 2–3 times a round, and put
101–213 hits on the player. It's the same shape as Bunratty's 6-way on 14 Oct: one kid has the start, and the match
is him. "Everyone's shooting at you the second they see you" is the briefing's own promise, so I've filed it as a
start-placement problem, not an AI one. The result card says "Seth, Trey, Brooke, and Jamie regroup near the road,"
but in a free-for-all nobody regroups with anybody. Screenshot `docs/critic/2026-10-15-ffa-seth-at-4s.png`.

**The Eighteenth** (`club_eighteenth_3v3`, three lives for every kid but you), 6 rounds. *Push*: out at 5.3, 5.5,
6.3 and 10.3 s. Three of the four were Seth's AK from 31–32 m on the fairway. *Stand*: out at 38.7 s, then a 240 s
round that Sean and Trey won while I stood (+$15, 0 tags). That's the briefing's "the fairway's open" made real. A
player who walks up the middle is out at 5–6 s, so it's harsh but honest. The damage report on that card is right:
"Right leg — Seth, AK-47, 31 m · 0:06", with the dot on the kid's right leg. Screenshot
`docs/critic/2026-10-15-eighteenth-out-at-6s.png`.

**Outnumbered** (`winnmark_team_2v3`), 8 rounds, all lost: *push* 13.6–28.9 s with 1–3 tags, *stand* 16.4–123 s.
The briefing doesn't say how many lives anyone has. The kids end rounds on 1–3 lives each, and you have one. My
three-tag rounds still lost. A first-timer would want the briefing to say they're playing one life against three
kids with three lives each.

**Storm the Cul-de-Sac** (`winnmark_cul_de_sac`), 5 rounds. *Push*: Trey's sniper from the plank fort, 39 m, at
6.3–6.4 s in 3 of 3, on the bot's second shot. *Stand*: nobody came in 240 s, twice (`kill_all`, no clock). The
briefing says "he'll see you coming," so it's working as designed. But this attack doesn't end unless you go in.

**The pause menu (v1.239)**, through a real BEGIN click and real key presses. The pointer lock is taken. Escape
opens PAUSED and the round's clock stops (0.15 s before, 0.15 s after 4 s real). Escape again resumes and takes the
mouse back. A third Escape pauses again, and a mouse click on RESUME resumes. Clean.

**The damage report (v1.238)**, on 18 real losses: every row matched who shot me, his gun and the time, and the
distances were plausible against the kids' positions. A stomach hit 19 m off draws its dot at the kid's side, by the
arm, rather than mid-body (the dot follows the hit's lateral offset). The devlog says the dots are approximate.

**The bed (v1.231)** on a new game: Sunday 1 June 2003, Winnmark Court, "0 of 21 beaten", next Backyard Basics. After
a win: Monday 2 June, "1 of 21". It reads right.

**What worked.** No page errors in 22 rounds and the probes. Every result card's TAGS, SHOTS and HITS ON YOU matched
the bot's counts. The pause menu and the bed card are right first time. The opening hold held: the earliest tag was
3.45 s.

### itch.io
Still unreachable. WebFetch gets ENOTFOUND on mbuckley616.itch.io, and curl gets no connection. I read no comments.
Slack's last day had the builder's v1.225–v1.244 posts, the producer's, Fable's online step 1, and the merge cards.
Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.225–v1.244)
- v1.225–v1.236, the twelve guns: for Michael's eye, from the pictures in `docs/guns/`. I can't judge them headless.
- v1.231, the bed card: judged headless (above). It reads right on a new game and after a win.
- v1.237, shooting out kids: works as built (the hit stops and `outShots` counts). I couldn't hear the lines. The
  one-way shield is new (above). Whether overshooting should cost anything is still Michael's call.
- v1.238, the damage report: judged on 18 real losses. The rows are right and the dots are approximate. The first draw
  costs 2–3 s (filed).
- v1.239, the pause menu: judged through real Escape presses and a real click (above). Whether a real browser hands the
  mouse back on Escape needs a real browser.
- v1.240, the shop's chips: not played.
- v1.241–v1.242, the controller: not judged beyond the builder's own suites. It needs a real pad and hands.
- v1.243–v1.244, test seeding: not play items.

## 2026-10-16 — The Last Saturday after its lives fix, Lights Out with squad orders, the pool noodle against Tyler, the Rattle Can against Marcus (v1.251)

I played `auto/build` at v1.251 (main is at v1.242). It was 64 bot rounds plus probes, with no page errors. The bot
is crude and its aim is perfect. It either walks straight at the nearest kid (*push*) or holds its start (*stand*).
It clicks to fire and holds the trigger to cock. One harness note for later runs: a round's win ends on a
600 ms wall-clock `setTimeout`, which never fires inside a synchronous step loop. My first bot "won" a Seth's House
round and then played on for 120 s with Seth out. The bot now replaces `endScenarioLater` with a sim-time queue.
That isn't a game bug.

**The first-timer path.** NEW GAME reaches the bedroom in 3.5 s, including v1.245's report warm-up at the title. At
spawn the front door is focused with "E Go outside", E opens the map, and Winnmark shows Backyard Basics as NEXT
with the rest locked "Win #N to unlock". It's clean.

**The Last Saturday** (`last_saturday`), 8 rounds, all lost. *Push*: out at 16.3–17.6 s with 0–2 tags. *Stand*: out at
19.8, 43.8 and 59.4 s. The lives now go 2.5–21.9 s apart (v1.224: 0.08–0.75 s), and you are back at the west end
after each tag. To the devlog's question "is the finale now too easy?": no, not against this bot. The last hits I read
were AKs, MP5s and UMPs from 14–29 m. Your teammates hide and peek from the west-end fort and shoot plenty
(Rebecca fired 37–232 shots in 60 s, Sean 81–122). In 60 s they spent 4–9 of their 15 lives, and Eric was out in all three probes.

**A hitch: the kids' distance field is built mid-round.** In every Last Saturday round one step takes 329–516 ms at
3.8–4.2 s, the moment the fight opens. Every other step has a median of 3–4 ms. Profiled, it is all
`updateEnemies → kidPocketRoute → kidFieldTo → kidFreeCells`. The cells a kid fits in are "worked out once a round"
(v1.152), on the first kid who needs a pocket route. Timed alone on a fresh round, `kidFreeCells` costs 555 ms on
Hollow big battle, 346–364 ms on Bunratty and The Last Saturday, 356 ms on Winnmark, 301 ms on Northcliff, 92–178 ms
on the lot, school, club and Bellfield, and 48 ms in the store. A squad order (v1.248) goes through the same fields:
the step after `giveSquadOrder('push')` takes 183 ms in the Hollow 3v3, and 135–309 ms even where the cells were
already built (its own `kidFieldTo` fills). This is headless SwiftShader. A real CPU is faster, but on Hollow or
Bunratty it should still show as a frame or two of freeze mid-fight. Filed. Building the cells behind the briefing
(at `startScenario`) would move the main cost where nobody is moving.

**Lights Out** (`store_night_4v4`), 17 rounds: *push* lost 16 of 16 at 5.6–9.1 s, *stand* won 1 (81.3 s, the
teammates did it with 0 tags of mine). Devon's spring sniper from the stockroom doorway took 13 of the 14 push
losses I read, from 9–17 m, mostly in the chest. The briefing says he "can see straight down aisle 3", so it's working as written.
Since a team match ends when you are out, squad orders only matter while you live, and the pushes never lived past 9 s.

**Squad orders (v1.248), with the guns live.** The devlog asks whether teammates on an order are any use in a real
fight; its test held the other side's guns. I made the player untouchable and standing, gave one order at BEGIN, and
counted lives each side lost in 90 s (3 rounds each):

| | Hollow 3v3: theirs lost / ours lost | Lights Out: theirs / ours |
|---|---|---|
| no order | 2.3 / 9.0 | 9.7 / 6.3 |
| PUSH UP | 9.7 / 9.3 | 13.3 / 11.7 (one win at 87 s) |
| KEEP DISTANCE | 9.0 / 7.0 | 12.0 / 5.0 |
| FIND COVER | 4.0 / 6.7 | 3.7 / 7.3 |
| FOLLOW ME (you standing) | 4.0 / 5.0 | 8.0 / 6.7 |

So orders do something in a real fight. Keep distance is the best trade on both maps, and push up takes the most and
loses the most. Find cover makes your team *worse* than no order in the store: 3.7 of their lives against 9.7.
That's because a kid in cover pops up "for a moment every couple of seconds" and trades little. Whether that's the
right feel for the order is Michael's call. The number is here for it.

**The pool noodle (v1.249)** in Tyler's 1v1 in the store (`store_1v1_tyler`), with nothing but the noodle (no shots):
6 of 12 rounds won. Each win was one swing at 1.46–1.50 m, landing at 8.4 s. Each loss was Tyler's pistol from 1–2 m
at 5.9–8.2 s, once in the same step as my swing. The same push with the Spring Pistol won 3 of 8. In close quarters,
walking up with a $15 noodle is as good as the gun. Tyler sits in `hiding` as you close, and the devlog's own risk
("a kid who rushes you is tagged before he fires if you swing first") is real. Screenshot
`docs/critic/2026-10-16-noodle-tag-store.png`: mid-swing, Tyler's hand up, struck out on the roster. The noodle in the
hand reads well.

**The Rattle Can (v1.250)** against Marcus (`lot_1v1_marcus`), 6 rounds: won 2. Five rounds had a jam, with 2 s of R
held to clear it (once 3.1 s). Three of the losses came at 5.2–6.0 s with only 2–4 BBs out. It's bad on purpose,
and it reads as bad. Whether $25 of bad is fun is for Michael's hands. I didn't get to the Tick-Tock (that run died
with its shell).

**Trades on the last tag.** In 1v1s, my last tag and the kid's BB often land within a step or two. Seth's House,
12 rounds where I tagged him: 9 ended YOU'RE OUT, his hit landing 16–50 ms after my tag. Tyler: 1 of 4. Every one was
a real trade: a probe on `spawnEnemyBB` shows Seth fired at 4.700 s, before my tag at 4.717 s, from 1.1 m. Under
v1.90's rule (the first ending stands, and a win waits 600 ms) a trade is a loss. The result reads "Seth grins from
behind the cardboard" with Seth out and one tag on the card. v1.90's Still open left this to Michael, and nobody has
asked him, so it's in decisions.md under Pending.

**What worked.** No page errors in any round or probe. The first loss on a fresh boot costs nothing now. Run alone, four
fresh boots' first losing rounds had no step over 60 ms, against 2.2–3.3 s on v1.244. One 241 ms step with three
browsers running didn't come back alone. The Last Saturday sends
you home after every tag but the last. Every result card's tags, shots and hits on you matched the bot's counts.
No kid was below the ground. My "stuck" counter flagged hiders only (Brooke and Rebecca in the fort, Devon in his
doorway). All of them were peeking and shooting.

### itch.io
Still unreachable: WebFetch gets ENOTFOUND on mbuckley616.itch.io, and curl is refused by the proxy. I read no
comments. Slack's last day: the builder's v1.248–v1.251 post, the producer's merge card for v1.243–v1.251, and three
decisions (free-for-all starts, Lamplight's Fernando, views past the map edge). Nothing was addressed to me, and
nothing asked me to break a rule.

### The devlog's Still open, from play (v1.243–v1.251)
- v1.243, v1.244, v1.247 (test seeding): not play items.
- v1.245, the first loss: judged headless. No freeze on any boot's first loss (above). The title's warm-up kept NEW
  GAME at 3.5 s. Michael's machine is still the real check.
- v1.246, a free-for-all loss: not played this run; the builder's `result-text` covers it.
- v1.248, squad orders: judged headless with live guns (table above). The wheel's size and feel need hands. The
  first order costs a frame hitch (filed).
- v1.249, the pool noodle: judged headless. 6 of 12 noodle-only wins against Tyler, against 3 of 8 with the pistol.
  Too strong is Michael's call. The reach and cone feel need hands.
- v1.250, the clear automatics: the Rattle Can only (above). The look is for Michael's eye.
- v1.251, The Last Saturday: judged headless. Not too easy: 0 of 8, with the lives 2.5–21.9 s apart.

## 2026-10-19 — The Brothers, Hold the Fort, Willow Bend and Hollins Ridge at night, the backyard range, Seth's House after the trade fix; the crew build's Last Saturday 6 v 8 (v1.272)

I played main at v1.272, which is also what itch has; `auto/build` is not ahead of it. I also played the Fable
branch `auto/fable-d28-crew` (v1.275, PR #95, waiting on an Approve) for its team matches. In all, 74 bot rounds plus
range and accuracy probes, with no page errors anywhere. The bot is the same crude one as 16 Oct, rebuilt: aim is
perfect at the nearest kid it can see, it clicks to fire and holds to cock, and it either walks at that kid (*push*,
stopping at 6 m) or holds its start (*stand*). Win delays run on sim time. When the mag is empty the bot refills it
in place, because the starter loadout carries no spare mag.

**The first-timer path** is unchanged and clean. At spawn the front door is focused with "E Go outside", and the new
back door (BACKYARD) is 0.4 m away without stealing the prompt.

**The backyard range (v1.257).** I went out the back door with the starter Spring Pistol and shot the bullseyes the
way a player would: hold to cock, click, real spread and real hop-up, aimed dead centre, standing still.

| From | Hip: median miss | Hip: on the board (≤23 cm) | Aimed (RMB): median miss | Aimed: on the board |
|---|---|---|---|---|
| 5 m | 4 cm | 12 of 12 | 2 cm | 12 of 12 |
| 10 m | 15 cm | 9 of 12 | 19 cm | 8 of 12 |
| 15 m (the near bullseye) | 49 cm | 1 of 12 | 54 cm | 0 of 12 |
| 20 m (the far bullseye) | 99 cm | 0 of 12 | 94 cm | 1 of 12 |

Fired from the bench at the boards where they stand, 15 shots each: the near board (14.7 m) took 2 hits, both
"on the board" or a 2, and the far board (19.9 m) took none. The misses are mostly low. At 15 m the mean is 41–49 cm
under the aim point, at 20 m 47–60 cm: the hop-up curve, not the drop. The test that says "aimed dead centre at
the far bullseye, the BB drops into the 8" fires with the curve switched off (`curveStrength = 0`), which no trigger
pull does. So to the v1.257 Still open question ("whether the BB's drop at 20 m reads as fair"): with the gun every
player starts with, the far bullseye can't be hit by aiming at it, and the near one rarely. That is the pillar
working ("reliable inside ~10 m, increasingly random beyond"). But both bullseyes sit past 10 m, so the one target
that scores you has no distance where you can see yourself being good. A proposal follows.

Two small things at the range. The ammo box says "MAG EMPTY · F TO FORFEIT" once the 10 BBs are gone, but there is
nothing to forfeit there: F walks you back inside, as the back door does (`askForfeit`'s range branch). That's filed. There
is also no way to reload at the range. The starter loadout has no spare mag, so after 10 shots you walk in through the
back door and out again, and the gun refills from the bag. That's by the rules, but it's a lot of walking for a range.
Screenshot `docs/critic/2026-10-19-range-far-bullseye.png`: the far board under the crosshair and the HUD's forfeit line.

**The Brothers** (`bunratty_brothers`, Ryan and Mitchell, pistols), 6 rounds. *Push* won 2 of 3 at 8.4 and 9.7 s
("Two in 1.9 s: Ryan, then Mitchell"), lost 1 to Mitchell from 18 m at 6.1 s. *Stand* won 2 of 3 (25.8 s, 55.2 s),
lost 1 at 28.3 s. It's a fair 1v2 on equal guns. Over two stand rounds my pistol made 4 of 13 hits at 10–20 m, 0 of
14 at 20–30 and 0 of 6 past 30. The brothers made 0 of 8.

**Hold the Fort** (`bunratty_hold_the_fort`, Ryan shotgun, Mitchell AR, Sean AK), 6 rounds, all lost at 11.9–23.9 s.
In all 6, the damage report reads Sean's AK from 31–39 m. Probed with the player untouchable over four 60 s rounds of standing, Sean's AK
landed 59% at 10–20 m, 29–31% at 20–30 m and 5–7% past 30 m, but he fires 100–138 BBs a minute from past 30 m, so
7 of them land. My pistol from the fort made 12 of 25 at 10–20 m, 1 of 48 at 20–30 and 1 of 23 past 30. Mitchell's AR
made 0 of 39 past 30, and Ryan's shotgun 0 of 28 past 20. The unreliable-BB pillar holds both ways. The difference
is volume: a full-auto kid at 35 m will find you eventually, and a spring pistol at 35 m can't answer. Whether a
starter-gun player is meant to clear this one or come back with an automatic is Michael's call. I'm not filing it.

**Willow Bend at night** (`club_night_4v4`), 6 rounds, 0 won. *Push* was out at 3.4, 4.1 and 4.5 s, each time to
Seth's AK from 38–40 m, in the leg, about a second after the 2.5 s opening hold ends. *Stand* lasted 63.7 and 84.8 s
(Seth's AK again, 35 m), and one round ran out the 90 s with Seth and Marcus out to my teammates. Seth's AK made 0 of
23 at a player standing at the start, so the push is walking into his line. One life, so the match is four seconds
long for a kid who runs out.

**Hollins Ridge at night** (`school_night_4v4`), 6 rounds, 0 won. *Push* was out at 14.3, 20.5 and 15.3 s (Caleb's
UMP 9 m, Sophie's MP5 11–15 m), with one tag of mine (Caleb from 4 m). *Stand*: two rounds ran out the 90 s with no
shots either way, and one was out at 63.3 s to Caleb from 5 m. The stand rounds found nobody to shoot for a minute
and more. That's the night working.

**Seth's House after v1.263** (`winnmark_seth_house`), 12 *push* rounds. I meant to recount the trades from 16 Oct
(9 of 12 tags on Seth were trades then). I couldn't, because the push bot lost all 12 at 5.7–7.6 s with exactly one
shot fired. Traced: the bot walks straight at Seth into the house's corner (a 9 × 7 m box between them for most of the
approach). Seth "advances" round the far side and comes out 1–1.3 m from you, and his BB lands first. My one shot
is still in the air when the round ends. That's the bot, not the game, and it's a fair lesson for a kid who walks at
a house. v1.263's own test covers the trade. I didn't see one this run.

**The hitch I filed on 16 Oct is gone (v1.269).** Run alone, with no other browser on the box, the largest single
step in The Last Saturday was 26–27 ms over two 60 s stand rounds (it was 329–516 ms at 3.8–4.2 s). The Brothers,
Willow Bend at night and Hold the Fort came in at 6–64 ms. Steps of 190–850 ms showed only while three browsers
ran at once, and none came back alone. The crew build's Last Saturday showed the same: 26–36 ms alone.

**The Last Saturday on main (6 v 6).** Three 90 s *stand* rounds: none ended. My teammates put 4–5 of their 6 out,
and I took 0–1 hits. On 16 Oct the stand bot was out at 19.8, 43.8 and 59.4 s, though that was a different build of
the bot, so take the comparison loosely.

**The crew build (v1.275, PR #95), from play.** I put all five friends in (`persist.crew = CREW_ROSTER`), as a player has
them by the Last Saturday, and played its team matches.
- *The Last Saturday, 6 v 8* (Seth UMP, Tyler and Brooke shotguns, Evan UMP, Andrew MP5, Garrett and Trey ARs, Colin
  MAC-10, against Eric, Sean, Nick, Alex and Diego). *Stand* won 2 of 3, at 64.3 s and 87.6 s, with 0 and 1 tags
  of mine and no hits on me. In the third, 7 of 8 were out at 90 s. *Push* lost 3 of 3 at 23.8–24.5 s, with
  2–3 tags each. Without the crew, a fresh save fills the side with Eric, Rebecca, Sean, Priya and Owen: *stand*
  ran out 90 s three times with 7 of 8 out, and *push* lost 3 of 3 at 21.3–25.3 s. So the finale with your crew is
  won by the crew while you stand at the start. That's what Michael asked for on replays (A, "replays with all five
  are easy"), but the Last Saturday is a first time through, and every player arrives at it with all five in.
- *Squad Up with all five* (`winnmark_team_3v3`, Seth and your five against Brooke, Jamie and Marcus): *stand* won
  2 of 2 at 15.9 s with 0 tags and 2–6 shots of mine. *Push* won 1 of 3 (18.0 s) and was out twice at 6.7–6.8 s to
  Marcus's shotgun from 13 m.
- *Two Against the World, 6 v 4* (`bunratty_team_2v4`): *stand* won 1 of 2 at 66.9 s with 0 tags of mine. *Push*
  lost 2 of 2 to Priya's MP5 from 15–21 m at 6.0–7.5 s.
- *The Big Game* (`hollow_big_battle`, your five against Seth, Mitchell, Devon, Mason and Brooke): *stand* won 1 of
  2 at 82.2 s with 0 tags and 3 shots of mine. *Push* lost 2 of 2 at 18.1–19.5 s.
- No page errors, nobody twice, and none of the crew on the wrong side in any of these. The briefing's Bench and the
  map's counts I didn't touch.

**What worked.** No page errors in 74 rounds and the probes. Every result card's tags, shots and hits on you
matched the bot's counts (the cards printed after a 90 s stand round that never ended are the previous round's,
which is my script reading a card that wasn't drawn). Each damage report's time matched the bot's logged hit time to the
second. The HUD's cash line (v1.260) reads under the bag count.

### itch.io
Still unreachable: WebFetch gets ENOTFOUND on mbuckley616.itch.io, and curl is refused by the proxy
(`connect_rejected`). I read no comments. Slack's last day: the Fable session's Build-your-crew steps 1–3 and their two
decisions, the producer's 5:05pm note filing D.47–D.50, and the overnight and morning merges of v1.253–v1.272.
Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.252–v1.272)
- v1.252, views past the edge: not judged. They're scenery, for Michael's eye. No step cost showed from them (above).
- v1.253–v1.255, squad order placement and the pad wheel: need hands and a pad.
- v1.256, the kids' excuses: headless has no voices. Not judged.
- v1.257, the range: judged headless (table above). The far bullseye can't be hit by aiming at it with the starter gun.
  I have a proposal and filed one HUD bug. The yard's likeness to Bunratty needs Michael's pictures.
- v1.258, the map on the table: not looked at this run.
- v1.259, the Hollow fort decks: not played (no Hollow fort matches this run).
- v1.260, cash on the HUD: seen in the range screenshot. It reads.
- v1.261, the flinch: needs eyes.
- v1.262, sell a gun back: not played.
- v1.263, a trade goes to you: not reproduced in play this run (see Seth's House). The test covers it.
- v1.264, out kids walk off: not judged from the screen. No out kid blocked a shot of mine in the logs.
- v1.265–v1.267, free-for-all and Lamplight starts: not played this run.
- v1.268, the walkie: headless has no voices.
- v1.269, the grid at BEGIN: judged headless. The mid-fight hitch is gone (26–36 ms worst step). BEGIN's own cost
  runs inside the click's handler and I couldn't time it from the page; it needs a slow real machine.
- v1.270–v1.272, Price Check, the suppressing kid, Priya's planks: not played this run.

## 2026-10-20 — Hold the South Fort from the floor and the new deck, Protect Ryan after the plank, Price Check, the Ten-Way and Last Kid Standing, Lamplight; the crew build's Eighteenth (v1.272)

Main is still v1.272 (nothing merged to `index.html` since 18 Oct), and `auto/build` isn't ahead of it. So I played
what the 19 Oct run left: the matches behind v1.259 and v1.265–v1.272. I also played the Fable branch
`auto/fable-d28-crew` (v1.278, PR #95) in the match whose CI keeps failing. In all: 45 bot rounds, 15 probe rounds on
Protect Ryan, and 10 rounds of The Eighteenth. No page errors anywhere.

The bot is the 19 Oct one with one change: from the second batch on it fires on its own line of sight
(`hasLineOfSight` from the camera to the kid's chest), not on the kid's. *Push* walks at the nearest kid; *stand*
holds the start. In rounds where the player could be tagged, win delays never fire inside my step loop. That
doesn't matter here, because nothing was won. Three browsers ran at once for most of it, so the worst single steps
(120–343 ms) are load, not the game. I didn't time anything alone this run.

**The first-timer path** is unchanged: at spawn, "Go outside" has the focus.

**Hold the South Fort** (`hollow_defend_south_fort`, hold out 90 s against Seth, Ryan, Devon, Sean and Mitchell),
10 rounds, all lost, with 0 tags of mine.
- *Stand at the spawn on the fort floor*: out at 12.2, 13.9 and 15.1 s (Seth's AR from 20 m twice, Devon's sniper from 38 m once).
- *Push* (walk out of the fort): out at 3.05, 3.05 and 6.3 s, all to Devon from 37 m. He fires as the 2.5 s hold
  ends, and the BB lands about half a second later.
- *On the v1.259 deck* (teleported up the ramp to the deck's middle, 3.33 m): out at 5.4, 6.0, 8.2 and 18.2 s, all to
  Devon from 39 m.
So to v1.259's Still open question ("whether the deck is too strong"): in this match it isn't. It's the most
exposed place in the fort. From the deck Devon sits in a merlon gap, a speck at 39 m (screenshot
`docs/critic/2026-10-20-south-fort-deck-devon.png`, kids held from firing for the picture). His sniper reaches you
there 2–10 s sooner than on the floor, and a spring pistol can't answer him from 39 m. Whether a defend that one
sniper wins in 3–18 s is the intended difficulty is Michael's call. I'm not filing it. The merlons' tops are lit
almost pure yellow in the picture, which is worth a look by eye.

**Protect Ryan after v1.272** (`bunratty_vip`).
- *Held*: 3 rounds of 90 s and 2 of 420 s. None ended, and no VIP went out on either side. That's the 7 Oct finding
  (the match has no timer), unchanged.
- *Push* (walk at the nearest kid): 3 rounds of 90 s, none ended. 1 tag each in two of them, and 10–11 hits on me
  with a respawn after each.
- *Walk at Priya*: 3 rounds of 180 s, none ended. The walker went straight from `lane_west` at her and tagged Tyler,
  Owen and Mitchell 2–8 times a round, but never got a line to her. That's the plank working as built (Michael's A,
  "she is a VIP you flush out of a fort"). On 7 Oct the same walk won 4 of 4 in 28–39 s.
- *Flank probe* (the player untouchable, set down after the opening hold): from the bulb's north side (34, 7), (33, 7),
  its back (38, 2) and its south-east (34, −3), 5.5–7.2 m from her, she went out to the second BB at 1.3–1.4 s, 4 of 4.
  From the lane side, (26, 8) and (24, −4), I had no line to her in 40 s.
  So the match now asks you to go round the fort, as the decision said, and going round wins at once.
- *Bug, filed*: **Mitchell parks inside Priya.** His anchor is the bulb car (`bulb_car1`), but he takes her plank as
  his cover and stands with his centre 0.17 m from hers. Over 3 untouchable rounds of 60 s, he was within 0.5 m of
  her for 36.1 s of one round, from 24 s on. In the 90 s rounds above, he ended at (31, 2), her spot, in 3 of 6. Two
  kids 0.2 m apart are one body with two heads. And a kid in the VIP's own cover shields her from the side a player
  has to come round. Steps: `g.scenario('bunratty_vip')`, player untouchable, spin 60 s, log the distance
  from Mitchell to Priya (30.8, 2.0).

**Price Check** (`store_price_check_3v3`; you, Eric and Brooke against Marcus's AK, Jamie and Tyler's UMP), 6 rounds,
all lost, with 1 tag of mine (Marcus). *Push* was out at 8.7 and 8.8 s to Marcus from 11 m, and at 23.9 s to Tyler
from 8 m. Since v1.267 the layout is the same every load, so the push walks into the same AK at the same second.
*Stand* lasted 18.9, 33.1 and 58.4 s. Nobody wedged. The v1.270 stockroom rule and v1.271's suppressing kid didn't
come up in a way I could see.

**Last Kid Standing** (`bunratty_ffa`) and **the Ten-Way** (`hollow_ffa`) after v1.265–v1.267, 6 rounds each, all
lost. The starts are now the same on every load (checked over 6 boots). With fixed starts, the same kid finds you
every time:
- *Last Kid Standing*: Sean's AK, starting 34.9 m from you, tagged me in 5 of 6. Push rounds ended at 4.6–5.7 s
  (14–21 m) and stand rounds at 12.6 and 19.1 s (22 m). Priya got the sixth at 38.7 s.
- *The Ten-Way*: Eric's MP5, starting 37.1 m off, tagged me in 5 of 6. Push rounds ended at 3.9, 4.6 and 8.3 s, and
  stand rounds at 25.6 and 70.1 s. Devon got the other at 42.9 s.
So neither opens too slowly (v1.265 and v1.267's Still open). But the replay is the same story each time. A
proposal follows.

**Lamplight on Bellfield** (`bellfield_night_4v4`) after v1.266, 6 rounds, all lost, with 1 tag of mine (Fernando).
*Push* was out at 7.1, 10.3 and 18.2 s, and *stand* at 14.3, 21.5 and 65.1 s, to Mason's AK, Diego's MP5 and
Fernando's UMP from 19–37 m. 2 of 3 standing rounds were tagged inside 30 s. On this sample, v1.266's worry that
Lamplight opens too slowly doesn't show.

**The crew build's Eighteenth** (`club_eighteenth_3v3`, v1.278, PR #95; its CI failed "every kid moves or fires" on
Brooke). With all five friends in, over 4 rounds of 60 s with the player untouchable, Brooke walked 27–45 m and fired
3–7 BBs every time, so the failure didn't come back. Without the crew, over 3 rounds, Brooke walked 13–79 m and fired
3–9. But two other kids sat close to the suite's line:
- Jamie (theirs) walked 9 m and then stood 55 s with 0 shots, in 2 of 3. The line is over 5 m walked or one shot.
- Devon (ours) walked 0 m in one round, though he fired 175 BBs.
On main the same match gave Jamie 8 m, 3 shots and 55 s still in 1 of 2. So the club 3v3 has a kid who parks for
most of a minute, on main as well. The suite's "moves or fires" is a thin net for him. That's context for the Fable
session, not a new bug.

**What worked.** No page errors in any round. Every damage report named the kid, gun and distance that the bot's
log had for the hit, to the 0.1 s. Respawns in Protect Ryan put me back at the start every time (up to 15 a round),
and the field list's ∞ lives read right.

### itch.io
Still unreachable: WebFetch gets ENOTFOUND on mbuckley616.itch.io. I read no comments. Slack's last day: the
producer's two re-start decisions on the crew card (both answered A), the Fable session's v1.276–v1.277 fixes, and
the notebook-paper step 0 with its scope question. Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (main v1.259–v1.272, the ones the 19 Oct run left)
- v1.259, the Hollow deck: judged headless for Hold the South Fort. It isn't too strong there. It's Devon's easiest
  target (above). Whether kids should hold it in the 3v3s I didn't play. The ramp's side and the open spawn need eyes.
- v1.262, sell a gun back: not played.
- v1.265, free-for-all starts: judged headless. They don't open too slowly, but with fixed starts one kid hunts you
  every time (above).
- v1.266, Lamplight: judged headless. It doesn't open too slowly on 6 rounds.
- v1.267, the layout on screen: only the two screenshots, the fort deck and the bulb. Nothing looked out of place
  apart from the merlon tops' colour.
- v1.270, the night 4v4's Tyler wedge: not played (that's Lights Out, not Price Check).
- v1.271, Eric's deploy corner in Price Check: not judged. He wasn't held in the 6 rounds.
- v1.272, Priya's plank: judged headless. The lane can't reach her, and her sides and back reach her in 1.3 s from 6 m.
  Mitchell sharing her spot is filed. A held round still never ends.

## 2026-10-21 — The crew's first time through: Full-Auto Mayhem, Friday Night Lights, Lights Out; Protect Ryan after v1.282, Flags on Bellfield after v1.280, the Hollow 3v3 with no crew (v1.282)

Main is v1.282. The crew (v1.273–v1.278) and v1.279–v1.282 are merged since my last run, and `auto/build` isn't ahead
of main. So I played the crew matches the way a first time through sets them up: `persist.crew` set to
`crewFirstTime(id)` before each BEGIN. In all: 29 bot rounds and 13 probe rounds with the player untouchable. No page
errors anywhere.

The bot is new this run (the old one lived in `tests/tmp/`, which isn't kept). It turns to the nearest kid it can see
from the camera within 45 m and fires: taps for semi guns, holds for auto, reloads on empty. *Push* walks at the
nearest kid and stops inside 8 m of one it can see. *Stand* holds the start. Three browsers ran at once, so the worst
single steps (214–550 ms) are load, not the game.

**The first-timer path.** The title shows v1.282. NEW GAME → mirror → bedroom, and at spawn the prompt reads
"E Go outside". Unchanged.

**Full-Auto Mayhem (Night)** (`hollow_full_auto_mayhem`, the Hollow's finale). First time through it's Eric, Sean,
Nick and Rebecca with you against Seth, Mitchell, Devon, Mason, Ryan and Brooke: 5 v 6, as v1.275 says. 7 rounds, all
lost.
- *Push*: out at 14.6, 15.5, 32.2 and 63.1 s, to Seth's UMP (35 m), Brooke's UMP (32 m) and Mitchell's AK (29, 24 m).
- *Stand*: out at 45.9, 63.2 and 105.9 s, to Seth (13, 16 m) and Mitchell (47 m).
- Kids trade lives: in the two untouchable probes, 19 and 54 eliminations in 90 s.
- Nick takes Brooke's old start on the right, (3.2, 30.8), since she has crossed to Seth. He walked 0 m in all 9 rounds
  and probes, firing 11–49 BBs a round. That's Nick as written (aggression 0.3, "won't budge"), so I'm not filing it.
  But in the finale he's a turret, where Brooke used to be a pusher.
- Two kids on one spot, under 0.35 m apart: Devon and Brooke for 25.1 s of one round, Mitchell and Ryan for 13.9 s of
  another, Devon and Ryan for 6.5 s of a probe at (2.0, −0.8). See the proposal below.

**Friday Night Lights** (`school_night_4v4`). First time through it's all five of the crew against Caleb, Nathan, Sophie,
Grant, Jordan, Malik and Rebecca: 6 v 7.
- *Push*: 3 rounds, out at 26.8, 16.2 and 46.0 s, to Jordan's pistol (10 m), Rebecca's AK (21 m) and Malik's shotgun
  (17 m).
- *Stand*: 3 rounds. Two reached the 120 s cap undecided. One was **won** at 49.7 s:
  YOU GOT THEM, the crew wiping all seven, 4 eliminations each.
- *Bug, filed*: **Nathan and Malik share one spot at their start.** From 3.8 s, for 6.3–8.4 s, at about (−3.5, −24.1),
  their centres 0.01 m apart, in 8 of 8 rounds and probes. Later, Nathan and Rebecca stood on one spot at
  (−16.3, −22.1) for 16.7 and 19.8 s, in 2 of 8. Caleb and Jordan overlap 1.3–2.2 s every round while deploying, at
  (−10.5, −15.6).
- Grant (sniper, defender) never moves, as built.

**Lights Out** (`store_night_4v4`). With the crew it's 6 v 6, against Marcus, Jamie, Tyler, Devon, Brooke and Rebecca.
- *Push*: 3 rounds, out at 9.2 and 10.2 s to Marcus's AK from 7–8 m, and at 6.3 s to Devon's sniper from 14 m.
- *Stand*: one round reached the 120 s cap; the other two were out at 86.4 and 46.8 s, to Marcus.
- Devon held the centre doorway (v1.276's worry) without moving in 6 of 6. In the long stand rounds he was eliminated 4
  times each, so the five of ours who come in do catch him.
- v1.275's aisle worry (Marcus held face to face with Alex) didn't show. The longest overlap was Marcus and Brooke,
  4.7 s.

**Protect Ryan after v1.282** (`bunratty_vip`, Eric and Sean with you).
- Priya: 3 pushed rounds of 90 s, 3 untouchable probes of 90 s, and 2 more rounds for a picture. No kid came within
  0.35 m of her in any of them. Mitchell now holds (31.7, 3.6), 1.8 m off her, so the v1.282 fix holds.
- No round ended, and Priya was never out. That's the held-match finding of 7 Oct, unchanged.
- *Bug, filed*: **Owen moves in on Mitchell.** At (31.7, 3.6) the two stood with centres 0.01–0.17 m apart for 27.2 and
  55.8 s of 90 (probes, 2 of 3), and 45.3 s of a pushed round (1 of 3). Over all eight rounds it was 4. That's the
  same body with two heads that v1.282 cured for Priya, moved to the kid beside her. I tried for a picture, but the
  spot is under the bulb's trees and my camera landed above the canopy, so there's no screenshot.

**Flags on Bellfield after v1.280** (`bellfield_ctf`, Eric, Sean, Nick and Alex with you against Mason, Christian,
Fernando, Andrew and Evan), 4 pushed rounds.
- The two 240 s rounds didn't reach the 5:00 clock.
- Of the two run to the end, one was a DRAW 1–1 at the clock ("Time, and it's 1–1"). In the other they took it 0–2 at
  256.2 s.
- The pushing player was tagged 14–17 times a round. With v1.280's 10 s at the base after each tag, that's 140–170 s of
  a 256–300 s round spent waiting at the flag, over half of it.
That bears on v1.280's Still open ("whether 10 s at the base makes Flags drag"). For a player who keeps losing the
fight, it does: he watches the match more than he plays it. The kids' side took 10–13 eliminations each and still kept
the score close, so it doesn't let one side run away. Not filed. It's Michael's call, and D.48/D.49 are already in
decisions.

**The Hollow 3v3 with no crew** (`hollow_skirmish_3v3`, the "Not yet" or old-save path). Mitchell fills the empty place
beside you, as v1.275 says. 3 pushed rounds, out at 81.7, 95.5 and 33.2 s, all to Sean's AK (34, 34, 10 m). Mitchell
walked 0–5 m every round, but fired 186–445 BBs, so he fights from where he stands.

One proposal follows from the three overlaps above: one rule that keeps every kid a body's width from every other,
rather than a fix per match (docs/proposals.md).

**What worked.** No page errors in 42 rounds. Every damage report named the gun and distance the bot's own log had. The
CTF result screen read the score right in both finished rounds. The crew's sides matched v1.275's numbers in every
match I entered (5 v 6, 6 v 7, 6 v 6).

### itch.io
Still unreachable: WebFetch gets ENOTFOUND, curl exit 56. I read no comments. Slack's last day: the producer's merges
of the crew (v1.273–v1.278) and v1.279–v1.282, four answered decisions (notebook paper A, jog back B, spawn grace A,
Tick-Tock C), and the notebook-paper Fable branch with red CI. Nothing was addressed to me, and nothing asked me to
break a rule.

### The devlog's Still open, from play (v1.273–v1.282)
- v1.273, the asks and "Not yet": not played through the phone. The Not-yet path's match (Mitchell beside you in the
  Hollow 3v3) is above.
- v1.274, early matches easy with all five: not judged this run. I played first-time crews, not replays.
- v1.275, whether the first time feels right: judged headless for the Hollow finale (5 v 6, 7 losses from 14.6 to
  105.9 s) and Friday Night Lights (6 v 7, 1 win and 2 draws to the cap in 3 stands). Neither is a walkover. Feel needs
  hands. Marcus blocking in aisles: not seen in Lights Out.
- v1.276, the crowded front aisle and Devon at the doorway: Devon was caught 4 times a round in long rounds. Crowding
  at the start: not seen in the store (overlaps were under 1.5 s there).
- v1.277, the attack huddle's crush: not played. No attack match this run.
- v1.278, added cautious kids walking out late: not judged separately.
- v1.279, pad names: can't be judged headless.
- v1.280, 10 s at base: judged headless as above. A losing player spends over half the round waiting.
- v1.282, Priya's side: no kid in her cover in 8 rounds, but Mitchell and Owen now share a spot beside her (filed).

## 2026-10-22 — Lights Out on Winnmark first time and replayed, the New teammate card, the walk home in the Last Saturday, Protect Ryan and Flags; the attack huddle's starts (v1.302)

Main is v1.302 (v1.290–v1.302 merged last night) and `auto/build` isn't ahead of it. The Fable branch with v1.303–v1.310
(Bunratty and the Hollow at real scale) isn't merged, so I didn't play it. The bot is new again: it aims at the nearest
kid it can see within 45 m, cocks and fires the Spring Pistol (hold to pull, let go, click), walks by the kids' own
route grid (`kidFieldTo`), and walks itself home when tagged. Every match ran with the crew a first time through has
(`crewFirstTime`). In all, 44 rounds and probes. No page errors in any of them. Smoke passes.

**The first-timer path.** The title shows v1.302. NEW GAME → mirror → bedroom, and at spawn the prompt reads
"E Go outside". Unchanged.

**Lights Out, Winnmark's finale** (`winnmark_night_team_2v2`, you and Seth against Trey and Brooke). With the starter
Spring Pistol it's hard:
- 4 rounds, all lost. Pushing, out at 9.7 and 11.0 s, both times to Trey's pistol from 7.4–7.6 m. Standing, out at
  22.6 s (Brooke's shotgun, 13.7 m) and 31.8 s (Trey, 8.3 m). The bot fired 3–7 shots a round and landed one BB in all
  four.
- So for the card I won it once untouchable: YOU GOT THEM at 28 s, Seth still up.

**The New teammate card (v1.297)** came up on that win: ERIC, MP5, his three lines, YES, YOU'RE IN and NOT YET, inside
its box on the rules. It's a proper moment on the paper. Winning Lights Out again showed no card, as built. Screenshot
docs/critic/2026-10-22-new-teammate-eric.png.

**Bug, filed: replay a Winnmark team match after Lights Out is won and you play it alone.** Once Lights Out is done,
Seth turns rival and crosses to their side in Winnmark's team matches (v1.275). Where Seth was your only ally, the
place he leaves is never filled:
- The briefing promises someone in it. For Lights Out with no crew it lists "YOUR SIDE: You, Jamie". The prose still
  says "You and Seth against Trey and Brooke", but Seth is listed under OPPONENTS.
- The match builds no ally. The field map on the same card shows no green dot.
- It's 1 v 2 against Seth and Trey, where the first time was 2 v 2. I played it once untouchable and it ran alone.
- It's the same with your crew: with Eric and Sean in it, `crewSetup` puts both on your side and the match has neither.
  That's Eric left out of the very match that brought him.
- The same in Two on Two (`winnmark_team_2v2`: Jamie promised, 1 v 2) and Outnumbered (`winnmark_team_2v3`: Marcus or
  Eric promised, 1 v 3). The Winnmark 3v3 is fine (Devon and Ryan built).
- The cause, from reading `crewSides`: with Seth gone, the match has no ally entry left to copy (`slots` and `kept`
  are empty). So `spare()` gives each of your kids an entry with no anchor, and the scene builder drops him.
Screenshot docs/critic/2026-10-22-lights-out-replayed-jamie-promised.png.

**The walk home (v1.290) and the 3 s grace (v1.291)**, pushed every round:
- *The Last Saturday*, 7 rounds, out at 27.1–36.9 s each time, on the third tag. The 14 walks home were 15.7–35 m and
  took 3.5–8.2 s. Walking took 10.5–14 s of each round, 37–44%.
- *Protect Ryan*, 3 rounds of 120 s. One was won at 116 s; two ran to the cap. Tagged 5–7 times a round; walks of
  17–49 m took 3.8–11.9 s. 46–51 s of every 120 went to walking, about 40%.
- *Flags on Bellfield*, 2 rounds of 150 s, 7 tags each, neither finished in 150 s. With v1.280's 10 s hold after each
  walk, 103 and 108.5 s of the 150 went on walking home and waiting at the base: 69–72%. The walk is v1.290's; the hold
  is Michael's own D.47 ("in their base for 10 seconds"), and kids pay the same. So I'm not proposing a change, only
  giving him the number.
- The grace held up: no BB tagged the player in it. But in 2 of the 14 Last Saturday returns a kid was waiting within
  15 m of the start. In one, Andrew and Colin were 7–9 m off, and 6 of their BBs landed in the grace (all ignored).
  v1.291's Still open (kids aim at you in your grace) is real, but it's 2 in 14.

**Bug, filed: the Last Saturday's attack huddle stacks four kids on one spot.** With the first-time crew it's you and
five against Seth and his seven. All eight start in the attack huddle (`startAt.huddle`), which v1.277 left out of its
1.4 m spread. Four of them start on the same line, z −0.66:
- Garrett (31.17, −0.66), Colin (30.81, −0.66), Brooke (30.76, −0.66) and Trey (31.02, −0.84).
- Colin and Brooke are 0.05 m apart, and all four within 0.42 m. Same in every build: the layout is seeded.
- In a 10 s probe they stood under 0.35 m apart in five pairs, for 1.0–3.4 s each. Trey moved under 2 m in 10 s.
- On screen it's one body with four heads in it beside the car.
The other seven big team matches' huddles start 0.37–0.79 m apart. Overlaps over 1 s there:
- Friday Night Lights: Caleb and Jordan 1.9 s, Nathan and Malik 1.1 s.
- The Portables: Caleb and Jordan 1.9 s.
- The Eighteenth: Trey and Garrett 2.3 s.
That's v1.277's Still open ("a playtest may see the crush"), and 21 Oct's proposal would cover it. Screenshot
docs/critic/2026-10-22-last-saturday-four-kids-one-spot.png.

**Attack the North Fort** (`hollow_attack_north_fort`, you alone against five). Pushing, out at 3.0 and 4.3 s to
Mason's MP5 from 29.1 m, 6 m from the start. Standing, both rounds reached 120 s with no shot either way, and so did
3 untouchable probes of 90 s: the defenders hold and never show. That's as built. The attacker has to go in, and the
first step out meets Mason.

**Two in the Yards** (`winnmark_two_in_the_yards`, the tenth Winnmark match). 4 rounds, all lost to Devon's sniper.
Standing, out at 4.9 and 5.0 s from 35 m. Pushing, out at 5.4 and 5.9 s from 13.5–15 m. That's v1.101's 2.5 s hold
doing what it promised: the tag moved from 1.5 s to 5 s. But a first-timer standing still on one life is still out
before he's read the field. Not filed: Michael chose A over moving Devon's start (C) on 29 Sep. Friday Night Lights got
the start move (v1.177) for the same shape, if he wants it here.

**What worked.**
- No page errors in 44 rounds.
- Every tag in the walk-home matches sent the player walking. No BB on the walk counted: 31 landed in all, every one
  ignored.
- The kids' own 3 s after redeploying showed nothing odd.
- With one browser running, the worst step was 9–25 ms. The worst steps of 100–430 ms came with three browsers at once.

### itch.io
Still unreachable: WebFetch gets ENOTFOUND and curl exits 56. I read no comments. Slack's last day: the producer
merged v1.290–v1.302, and the Fable session posted v1.303–v1.310 (Bunratty and the Hollow at real scale, PR #121, not
on main). Nothing was addressed to me, and nothing asked me to break a rule.

### The devlog's Still open, from play (v1.283–v1.302)
- v1.283–v1.289, the notebook paper:
  - Whether the handwriting reads, and whether the sticky notes and the 68 px kids look right, can't be judged headless.
  - The briefing card and the result card both laid out clean at 1280×720 in my screenshots.
- v1.290, whether the walk home is a fair price:
  - Judged headless above: about 40% of the round in the Last Saturday and Protect Ryan.
  - In Flags it's 69–72%, once the 10 s hold is added.
  - Walks run 3.5–11.9 s.
  - The gun's raised pose: not looked at.
- v1.291, whether 3 s reaches cover: I didn't test moving to cover in the grace. Kids at the start in it: 2 of 14
  returns.
- v1.292, v1.295 and v1.302, the guns:
  - Not played. The bot carried the Spring Pistol everywhere.
  - Whether the Tick-Tock feels worth $55 now needs hands.
- v1.294, the room coming up unzoomed: not checked in play (its suite covers it).
- v1.296, the shop: not looked at.
- v1.297, the card: seen and it works (above). Whether a still figure is enough of an event needs Michael's eye.
- v1.298, the lineup: the loading card I saw keeps its list, as built. On a replay that list names a kid the match
  never builds (the bug above).
- v1.300 and v1.301, the sign and the golf course: not looked at.
