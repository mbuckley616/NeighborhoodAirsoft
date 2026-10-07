# Decisions

Questions for Michael and his answers. Agents add under Pending; the producer carries them to Slack
(#neighborhood-airsoft) and writes the `Michael:` line when he answers. Nothing is a spec without one.

## Pending

## Answered

- **D.18 Bunratty VIP: Sean pins Owen at his spawn. Protect a respawning kid, or leave it? (builder, 2026-10-07)**
  Owen respawns in the bulb fort, a low three-sided pen open to the east, and his anchor is through its closed west
  wall. Sean, on our side, holds 15 m west and fires over the wall. In about one headless round in twelve (player
  idle or strafing), Owen is tagged at his spawn every 1-2 s for 10-30 s and never gets out. Until v1.176's fix-up the
  rest of Sean's burst tagged him again the next frame, 4 lives in 0.4 s. A tagged kid is now out for at least 1 s,
  but Sean still re-tags him each time he stands up. He has lives enough that it never decides the round.
  A) Kids get the player's VIP grace (2 s that nothing tags them) after a respawn, in every mode with lives
  B) A respawning kid under fire fights back from the fort (answers the kid shooting him, not only the player)
  C) Move Owen's spawn out of Sean's line (behind the fort's east opening)
  D) Leave it: Sean holding an angle on a spawn is fair play
  Builder recommends C: it fixes this spot without changing a rule; A is the general fix if other spawns show it.
  Until then the stuck sweep counts a kid tagged in the span as being shot, not stuck.
  Michael: **C) Move Owen's spawn out of Sean's line**. (2026-10-07)

- **D.17 Night Shift: our VIP falls early. Move her, cover her, or leave it? (builder, 2026-10-06)** Since v1.172,
  Rebecca, our VIP in Night Shift (`lot_vip_night`), starts on the anchor the briefing names, at (-14, 21). With the
  player standing idle in a headless test, she is tagged within 40 s in 20 of 30 rounds, at 8-36 s (most at 8-15 s),
  nearly always by Mason, often while she is hiding. Their VIP, Seth, was never tagged in those 30 rounds. A real
  player who defends her changes this, but the spot gives Mason a line to her.
  A) Move her anchor to a spot with cover facing Mason's lane
  B) Keep the spot and add cover there (a parked car or a dumpster), so the briefing stays true
  C) Leave it: protecting her is the player's job, and early pressure is the point of the mode
  Builder recommends B: it keeps the critic's fix (she starts where the briefing says) and gives her a fair start.
  Until then `tests/vip.test.mjs` checks only that no VIP falls inside 5 s.
  Michael: **B) Keep the spot and add cover there**. (2026-10-06)

- **D.16 Kids' movement looks stiff and floaty: which fix first? (builder, 2026-10-05)** Your note: NPC movement is
  a little stiff/floaty. What the code does today: a walking kid swings his legs ±14° about 1.3 times a second, which
  carries a foot about 0.66 m/s. The kids move at 2.5–3.5 m/s, so their feet slide over the ground at four to five
  times their step. That is the float. The body bobs 1.2 cm, the knees never bend, he starts and stops at full speed,
  and his body snaps to face his target every frame, even while he walks sideways. That is the stiffness. His arms stay on his gun, which is right for a kid carrying one.
  A) Planted feet: stride and cadence follow his real speed, so the feet stop sliding; knees bend on the step, a
     bigger bob and a little hip sway. One run, with a test that the feet stay planted
  B) Weight: he speeds up and slows down over a few tenths of a second, leans into a start or a turn, and turns his
     body over about 0.2 s instead of snapping. This changes how fast kids react, so tests are re-checked
  C) Both, A first, then B, each shown to you before the next
  D) A and a run/jog difference: a sprinting kid (rushing, retreating) runs with a longer stride and leans forward;
     a kid advancing between covers jogs low
  Builder recommends C: A is pose only and fixes the float at no cost to the fight; B changes timing, so it goes
  second, after you've seen A.
  Michael: **C) Both: A first, then B** (2026-10-06)

- **D.14 More guns and attachments: which first? (builder, 2026-10-05)** Your note: more gun variety and attachments,
  but kid-toned, not military LARPing. Today there are 8 guns (spring pistol, shotgun, sniper and assault rifle, then
  MP5, UMP, MAC-10, AK-47) and 5 attachments (red dot, 4× scope, red and green laser, flashlight), on a sight slot and
  one or two side rails. Each option below is one or two builder runs, shown to you before the next.
  A) Backyard guns: four new guns kids actually own, each with its own feel: a pump-up "Thunder" air shotgun (pump
     between shots, wide spread), a revolver-style six-shooter (fast cock, six-round cylinder), a hopper-fed electric
     "bucket gun" (huge mag, weak and slow BBs), and a long-barrel bolt pistol (accurate, slow). Shop's Guns tab
  B) Homemade attachments: a new under-barrel slot and four parts with real trade-offs, not straight upgrades: a
     duct-taped second mag (faster reload, heavier), a sling (faster swap and sprint), a foregrip (less spread while
     moving, slower aim), a cardboard barrel extension (straighter BBs, slower handling). Mods tab and the workbench
  C) Paint and stickers: per-gun colour (orange tip stays), camo tape and stickers on the workbench; cosmetic only
  D) A then B: guns first, then the under-barrel parts for them
  Builder recommends D: new guns change matches most, and the parts then have more guns to sit on. Each piece is its own
  version and test; nothing is military in name or look.
  Michael: **D) A then B: guns first, then the parts** (2026-10-05)

- **D.15 A new match type: which, and where? (builder, 2026-10-05)** Your note: one or two new scenario types, e.g. VIP,
  where each side's VIP has one life and the rest respawn. Today every match is one of: eliminate (1v1s,
  free-for-alls), team last-standing (3v3, 4v4, Juggernaut), hold-out defends, and Infection.
  A) VIP, as you described: each team guards one VIP kid (one life, pistol only, a cap on his head); everyone else
     respawns. Tag their VIP to win, lose yours and you lose. Your side's VIP is an ally kid you escort. Two matches
     first: Bunratty day 4v4 and a night one at the market lot
  B) VIP with you as the VIP: one life, pistol only, your allies respawn round you. The same two matches
  C) Capture the Flag (kid style: a bandana on a fence post), unlimited respawns, first to 2 captures, 3v3 on The Hollow
     and the school's practice field
  D) A and C: VIP now, Capture the Flag after, two matches each
  Builder recommends A: it is the one you named, it uses the respawn and ally AI that already work, and B's one-life
  player is close to what defends already are. C needs new carry-and-return AI and is bigger.
  Michael: **A) VIP: each team guards an ally VIP kid** (2026-10-05)

- **Hold the Treehouse: Evan tags you from behind before the twins climb (builder, 2026-10-05)** You start on the
  platform facing the ladder, and Evan stands in the open by the shed 11 m behind you; a player who stands still is
  tagged at 2.7–9.6 s in 8 of 8 rounds, before the twins reach the ladder. One life.
  A) Put Evan behind the shed: the twins on the ladder are the whole fight, and Evan never fires
  B) Turn your start toward the shed, so you see Evan first
  C) Evan holds fire until the first twin reaches the ladder (about 8 s), then shoots at anything above the rail as now
  D) Leave it: standing up on the platform gets punished
  Builder recommends C.
  Michael: **C) Evan holds fire until the first twin reaches the ladder**. (2026-10-05)

- **After Inside Riverside Market, what next? (builder, 2026-10-05)** v1.159–v1.160 build your A: the grocery store is
  the eighth zone, with four scenarios (Cleanup on Aisle Five, Price Check, Customer Service, Lights Out). Its five
  aisles of shelving stop bodies and BBs, so fights run down the aisles and across the cross aisle. Every place on your
  D.1 list is now built. The walkie callouts still wait on PR #22.
  A) Kids of their own for the school, the club and the store: three or four new characters (their lines would want
     the voices work, PR #22, on main first)
  B) Widen the stuck-kid sweep: full rounds and a third player position, now over 60 matches (about 10 more minutes
     of CI per shard)
  C) A new place you name (D.1 is done; say where)
  D) Nothing new: wait for PR #22 and your playtests of v1.152–v1.160
  Builder recommends B: three zones arrived in two days, and the sweep watches only the first 60 s from two spots;
  A is better once the voices land.
  Michael: **B) Widen the stuck-kid sweep**. (2026-10-05)

- **After Willow Bend Country Club, what next? (builder, 2026-10-05)** v1.157–v1.158 build your A: the club is the
  seventh zone, next to Winnmark, with four scenarios (Pool's Closed, The Eighteenth, Hold the Gazebo, Night Swim).
  Its pool and pond stop bodies but not BBs. Its kids are Winnmark's. The walkie callouts still wait on PR #22.
  A) The last place on your D.1 list: a grocery store battle, inside Riverside Market (aisles, checkouts, the
     stockroom), as a new zone or as new scenarios on the lot's map
  B) Kids of their own for the school and the club: three or four new characters (their lines would want the voices
     work, PR #22, on main first)
  C) Widen the stuck-kid sweep: full rounds and a third player position (about 10 more minutes of CI per shard)
  D) Nothing new: wait for PR #22 and your playtests of v1.152–v1.158
  Builder recommends A: it is the last place on your list, and B is better once the voices land.
  Michael: **A) A grocery store battle inside Riverside Market**. (2026-10-05)

- **After Hollins Ridge High, what next? (builder, 2026-10-04)** v1.155–v1.156 build your A: the school is the sixth
  zone with four scenarios (After the Bell, The Portables, Hold the Portables, Friday Night Lights). Its kids are
  borrowed from Bunratty, Ridgestone and the lot. The walkie callouts still wait on PR #22.
  A) The next zone from your D.1 list: the Horseshoe Bend Country Club pool and golf course (made-up club name)
  B) School kids of its own: three or four new characters for the school matches (their lines would want the voices
     work, PR #22, on main first)
  C) Widen the stuck-kid sweep: full rounds and a third player position (about 10 more minutes of CI per shard)
  D) Nothing new: wait for PR #22 and your playtests of v1.152–v1.156
  Builder recommends A: it is the next place on your list a player will see, and B is better after the voices land.
  Michael: **A) The next zone: a country-club pool and golf course**. (2026-10-04)

- **After Nick's fix, the queue is empty again: what next? (builder, 2026-10-04)** v1.154 fixes the one kid the
  stuck-kid sweep found (Bunratty free-for-all's Nick by house 2's backyard), so the sweep now guards every match
  with nothing on its known list. The walkie callouts still wait on PR #22; D.2 (online) and D.9 (voices) are Fable
  work; every critic proposal is built.
  A) The next zone (D.1): a high school's grounds, made-up name: fields, bleachers, portables
  B) Widen the sweep: watch each match for the full round, and with the player in a third place (a flank), so kids
     who only wedge late or off the two current walks are found too (about 10 more minutes of CI per shard)
  C) Nothing new: the builder waits for PR #22 (then the callouts) and your playtests of v1.152–v1.154
  Builder recommends A: it is the one open idea of yours a player will see; the sweep already covers 104 rounds and
  found one kid.
  Michael: **A) The next zone: a high school's grounds**. (2026-10-04)

- **After the last kid comes looking, the queue is empty again: what next? (builder, 2026-10-04)** v1.152 builds your
  A (control room, 4 Oct). Reproducing the critic's camping rounds turned up two kids who were not camping but stuck,
  walking into a wall all round: Owen inside Bunratty's bulb fort and Jamie in a Winnmark house corner. Both are fixed
  (a kid stuck twice now follows a path out), but each was found by hand, on one map. The walkie callouts still wait
  on PR #22.
  A) The critic's stuck-kid sweep: one test that plays every match and fails on any kid frozen in a moving state, so
     the next fort or corner like these is found before you play it
  B) The next zone (D.1): a high school's grounds, made-up name: fields, bleachers, portables
  C) Nothing new: the builder waits for PR #22 (then the callouts) and your playtest of v1.152
  Builder recommends A: v1.152's two stuck kids sat in code that had tests, on maps no test walked.
  Michael: **A) Stuck-kid sweep across every match**. (2026-10-04)

- **After the walkie, the builder's queue is empty: what next? (builder, 2026-10-03)** v1.149 puts the walkie on your
  kid (D.10, your A): a yellow walkie on the left hip of the Loadout kid, and at your hip in a match, seen when you
  look down. The callouts over it (click, static, the line) are built on the voices work's teammate lines, which are
  on PR #22 and not on main yet, so they wait. Everything else you answered is built; D.2 (online) and D.9 (voices)
  are Fable work, and D.1 has no next zone (your C, 1 Oct). Two critic proposals have been waiting since 30 Sep–1 Oct.
  A) The critic's "last kid comes looking": in team and kill-all rounds, a last kid or two who hasn't moved or fired
     for ~25 s goes looking for you, with a line, so every round ends (Squad Up and Four on Four can stall for minutes)
  B) The critic's stuck-kid sweep: one test that runs every scenario and fails on any kid frozen in a moving state
  C) The next zone after all (D.1): a high school's grounds, made-up name: fields, bleachers, portables
  D) Nothing new: the builder waits for PR #22 (then the callouts) and your playtests
  Builder recommends A: it is small, it fixes rounds that today have no end, and B's sweep can follow it.
  Michael: **A) Last kid comes looking for you**. (2026-10-04)

- **The map screen's restyle (D.8 step 3): is D.8 done? (builder, 2026-10-03)** v1.148 is step 3, your A on the cards:
  the map is redrawn at 700:560, so it fills its column (97% of it at 1280×720, was 66%, with a band of parchment
  above and below). The style is cleaner: flat parks, the Chattahoochee with its banks and its name in the water,
  roads drawn as a dark edge with a pale fill and named (Holcomb Bridge Rd, Eves Rd, Steeplechase Dr, Nesbit Ferry
  Rd), small even house blocks, a cul-de-sac at each neighborhood, the market's lot, a compass, a ½ mile bar and a
  double border. The pins are where they were. Screenshot: `tests/out/map-screen-1280.png` after
  `node tests/run.mjs map-screen`.
  A) Good, D.8 is done *(recommended)*
  B) Change the map (say what in a note: colours, more or less detail, labels)
  C) Go further: draw each zone's own streets on the map, so the pin sits on its real cul-de-sac
  Builder recommends A: the screen now does what D.8 asked, and C is a bigger drawing job better judged in play.
  Michael: **A) Good, D.8 is done**. (2026-10-03)

- **The map screen's cards (D.8 step 2): look before the map's restyle? (builder, 2026-10-03)** v1.147 is step 2, your
  A on the layout: the zone's matches are numbered cards, two across at 1280×720 (three on a 1920 screen). Each card
  shows its matchup (1V1, 3V3, 5-WAY FFA), badges for attack, defend, night and a survive timer, the name, the place
  and your lives, the pay, and a START. Your won matches say ✓ DONE, the first one you haven't won says NEXT, and a
  locked one is greyed with "Win #3 to unlock" and no button. At 1280×720 10 Winnmark cards are in view.
  A) Good, go on to step 3: redraw the map taller to fill its column, in a cleaner style *(recommended)*
  B) A, but change the cards first (say what in a note: bigger, smaller, more or less on each)
  C) Stop here; the map stays as drawn
  Builder recommends A: the band of parchment above and below the map is the last thing that looks unfinished.
  Michael: **A) Good, go on to step 3: redraw the map taller** (control room). (2026-10-03)

- **Walkie-talkie callouts (D.10): what to build now? (builder, 2026-10-03)** Your note: teammate callouts in plain
  voice when in earshot, over a walkie otherwise, and a walkie the player carries; push-to-talk for online. Today a
  kid more than ~24 m away says nothing at all (v1.22's earshot cut-off), so a teammate across the map is silent. The
  kids speak through the browser's voice, which Web Audio can't filter, so a walkie is heard as a squelch click and a
  burst of static (made in Web Audio) around the line, with the line at full volume and not placed in space. The
  teammate lines come from the Fable voices work (v1.150–v1.151, PR #22), so this is built once that is on main.
  A) Teammates out of earshot come over the walkie (click, static, the line, click); a walkie clipped to your kid's
     belt, seen in first person and on the Loadout kid; push-to-talk waits for online (D.2) *(recommended)*
  B) A, and enemies' callouts to each other over their own walkies, faint, when you are near one of them
  C) Only the walkie callouts; no walkie on your kid yet
  D) Hold all of it for online play
  Builder recommends A: it gives team matches a voice across the map at once, and the carried walkie is where
  push-to-talk will live later.
  Michael: **A) Teammates out of earshot come over the walkie; a walkie on your kid's belt** (control room). (2026-10-03)

- **The map screen's layout (D.8 step 1): look before the cards? (builder, 2026-10-03)** v1.146 is step 1: the map
  screen fills the window, the map on the left at its true shape (it was stretched), the chosen zone's list on the
  right, scrolling, and it opens on your furthest zone instead of "Click a pin". At 1280×720 you see 7 Winnmark
  matches at once (0 before). The rows are the old ones; step 2 makes them cards. On a 16:9 screen the map leaves a
  band of parchment above and below it until step 3 redraws it taller. Screenshot: `tests/out/map-screen-1280.png`
  after `node tests/run.mjs map-screen`.
  A) Good, go on to step 2: the scenarios as cards (name, type, matchup, lives, locked/done) *(recommended)*
  B) A, and make the map column wider (or narrower) first (say which in a note)
  C) Change the layout first (say what in a note)
  Builder recommends A: the layout does what you asked, and the cards are where most of the screen's look is.
  Michael: **A) Good, go on to step 2: the scenarios as cards** (control room). (2026-10-03)

- **D.8, the map screen (your A): the builder or a Fable session? (builder, 2026-10-02)** You chose A on the control
  room: the map full-height on the left, the chosen zone's scenarios as scrolling cards on the right. The backlog does
  not mark D.8 (Fable), but CLAUDE.md names "a new map screen that touches every scenario entry" as Fable work, so the
  builder has not started it.
  A) The builder builds it, in steps shown to you (the layout first, then the cards, then the map's restyle) *(recommended)*
  B) A Fable card, like D.9
  Builder recommends A: it changes one screen and the way it lists scenarios, not the scenarios themselves.
  Michael: **A — The builder builds it, in steps shown to you**. (2026-10-03)

- **The map screen redesign (D.8): what shape? (builder, 2026-10-02)** The map is a 720 px parchment panel capped at
  92% of the window: a 380 px map on top and the scenario details under it in what is left, so on a laptop screen
  you see one or two scenarios at a time. Five zones now hold 52 scenarios (Winnmark alone has 16).
  A) Full-window two columns: the map on the left at full height, the chosen zone's scenarios as a scrolling list of
     cards on the right (name, type, lives, locked/done), same parchment style, map redrawn cleaner *(recommended)*
  B) Keep the map as a small header; below it, every zone's scenarios as tabbed card rows across the full width
  C) Drop the map for a zone ladder: one row per zone, each a strip of scenario cards; the map becomes a picture only
  D) Only widen the panel and let the scenario list scroll; no restyle yet
  Builder recommends A: it shows a whole zone at once and keeps the map as the way you pick where to go.
  Michael: **A) Full-window two columns: the map on the left, the chosen zone’s scenarios as cards on the right**. (2026-10-02)

- **Better voices and more lines (D.9): how? (builder, 2026-10-02)** The kids talk through the browser's own speech
  (`speechSynthesis`), so the voice depends on the player's computer and browser. VoiceStudio is an app that runs AI
  voice models on your own machine; the cloud sessions can't run it, and the game is one HTML file with no audio files.
  A) More and more varied lines now, with the browser voices; recorded voices later *(recommended)*
  B) Pre-recorded lines: you generate a voice pack with VoiceStudio from a script the builder writes, the clips ship
     next to index.html on itch (a zip), with the browser voice as the fallback
  C) Both: the lines first (A), then the script and loader for your VoiceStudio pack (B)
  D) Leave voices as they are
  Builder recommends A, then C if the new lines land: B only works once you run VoiceStudio yourself, and every new
  line would need a fresh recording.
  Michael: **A) More and more varied lines now, with the browser voices; recorded voices later**. (2026-10-02; built by the Fable session as v1.150–v1.151, PR #22)

- **The treehouse is built: what next for towers (D.7)? (builder, 2026-10-02)** v1.138 put a treehouse with a ladder
  in Stoneglen Close: you climb with W, a drop of 1.5 m or more empties your stamina, and Connor holds the platform
  in King of the Treehouse. Kids cannot climb, so a defend on the platform would leave the attackers standing under
  it, and there is no prompt at the ladder yet (the briefing says W climbs). With v1.139–v1.140 every bug found in
  play is closed, so this is the only open work.
  A) Kids climb ladders, then a defend: you hold the treehouse while kids climb up after you; a "W — climb" prompt at the ladder too *(recommended)*
  B) A ramp tower instead: a raised deck kids reach by walking up a ramp, so no climbing AI; plus the prompt
  C) Only the "W — climb" prompt for now, and wait for your playtest of the climb
  D) Nothing new: wait for your playtest of v1.130–v1.140
  Builder recommends A: it is what makes the platform a place to fight over rather than a sniper's nest, and the
  ladder code already moves the player, so kids can share it.
  Michael: **A) Kids climb ladders, then a defend** (with the "W — climb" prompt at the ladder). (2026-10-02)

- **The backlog is clear: what should the builder take next? (builder, 2026-10-02)** Everything you answered is
  built, through v1.137 on Builder sessions (CI green), and every Found in play bug is closed. What is left is parked
  by your own calls: D.1 no new zone yet (C, 1 Oct), D.2 online held until the v2 zones are done (C, 30 Sep), D.7
  towers parked until jumping has been played (C, 30 Sep). Jumping (v1.105) has been on itch since 30 Sep.
  Options:
  A) D.7's first piece: a treehouse with a ladder on a small new map. Climb with W at the ladder, jumping off empties
     your stamina, a kid can hold the platform.
  B) D.2's first piece only: the title screen offers Campaign, Online (greyed, "coming soon") and Options, with the
     settings moved into Options. No networking.
  C) The next zone after all: a high school's grounds (made-up name): fields, bleachers, portables.
  D) Nothing new: the builder waits for your playtest of v1.130–v1.137 (Northcliff, the Loadout kid, the lot
     free-for-all) and the critic's reports.
  Builder recommends **A**: it is the one parked item whose condition (jumping in play) is met, and it adds a new
  kind of fight without a new zone to playtest.
  Michael: **A) D.7's first piece: a treehouse with a ladder on a small new map**. (2026-10-02)

- **D.1 after Northcliff: another zone, or not yet? (builder, 2026-10-01)** Your A is built: Northcliff Trace (v1.130),
  houses on a hill above a creek, with four scenarios (v1.131): Down by the Creek 1v1, The Stoneglen Twins 3v3, Hold
  the Creek Fort defend, Bellfield After Dark night 4v4. All nine Northcliff kids play there. It is last on the ladder,
  so nothing is "coming soon" now. Your D.1 note listed more places. Options:
  A) A high school's grounds next (made-up name): fields, bleachers, portables.
  B) A country-club pool and golf course (made-up name).
  C) No new zone for now: the Loadout screen (D.5 C, your A) and the found-in-play bugs first.
  Builder recommends **C**: D.5 C is answered and waiting, and five zones is a lot to playtest before a sixth.
  Michael: **C) Not yet: Loadout screen and bugs first** (control room). (2026-10-01)

- **Riverside Market free-for-all: how should the opening play? (builder, 2026-10-01)** The critic found Everybody
  for Themselves decided in the second after the 2.5 s hold. Reproduced on v1.128: in 8 of 8 openings 3–4 of the 6 kids
  are out by 3.8 s, Tyler first at 2.6 s, because the six starts stand on the lot's two side lines (x = ±34) in sight
  of each other. I tried six starts beside parked cars, every one blocked from every other, 23 m apart: the opening
  spreads out (first out 3.9–4.6 s, 1–2 out by 5 s, 1–2 by 15 s), but the kids then turn on you: standing at the
  midfield start you are tagged at 4–7 s instead of 10–20 s, and two kids (Jamie, Brooke) never move or fire in 60 s,
  so `tests/market-lot.test.mjs` fails. Not committed. Options:
  A) Hidden starts as tried, and FFA kids go looking after the hold (a roam, so nobody camps); your start stays mid-lot.
  B) Hidden starts, and your start goes behind a car at the lot's edge too, so you are one of seven hidden kids.
  C) Keep today's starts and give free-for-alls a longer opening hold (about 6 s) so everyone can find cover first.
  D) Leave it: the scramble at the start is the mode.
  Builder recommends **B**, with A's roam if kids still camp: it makes the start fair for everyone, you included.
  Michael: **B) Hidden starts, and your start goes behind a car at the lot's edge too, so you are one of seven hidden kids** (control room). (2026-10-01)

- **D.3 step 4 is done: every map has Winnmark's pieces (builder, 2026-10-01).** Your A (carry Winnmark's pieces to
  the other maps) is built: Bunratty's houses, cars, trees, props and fort (v1.125), the lot's cars and trees and the
  Hollow's hardwoods (v1.126), and Bunratty's S-curve road with a gutter and kerb (v1.127). The Hollow's pines stay
  the old three-cone pine. Collision is unchanged everywhere. Screenshots in `tests/out/` (bunratty-houses,
  lot-cars, hollow-trees, bunratty-road); in game once Builder sessions is merged. Options:
  A) D.3 is done; the builder moves on down the backlog.
  B) One more piece first: a new low-poly pine for the Hollow, to match the hardwoods.
  C) Change something on the other maps first (say what in a note).
  Builder recommends **A**: your list (houses, cars, people, trees, roads) is covered on every map; the pine can wait
  for a look in play.
  Michael: **A) D.3 is done; the builder moves on down the backlog** (control room). (2026-10-01)

- **D.5 C, the Loadout screen with a 3D kid (builder, 2026-10-01).** Your note: the Loadout screen should show a
  character model and what is equipped on each part of the body, with its own mesh for each item. Today it is three
  text lists (slots 1–4, items you own, worn gear). The bathroom mirror already renders your kid turning in a panel.
  Options:
  A) Your kid turns in a panel on the Loadout screen, wearing what is equipped (eyewear, armour pieces, shoes, belt and
     holster, the slot-1 gun in hand), each piece its own mesh, with a label from each body part to its item; the
     lists stay beside it. Built in steps: the kid, gun and labels first, then the gear meshes a group at a time.
  B) The kid and gun only, worn gear as labels on the body; no new gear meshes yet.
  C) Hold C until you have played the new shop tabs (v1.128).
  Builder recommends **A**, in steps, each shown to you like D.3.
  Michael: **A) Kid in a panel wearing all the gear, in steps** (control room). (2026-10-01)

- **D.1, the next zone (builder, 2026-10-01).** The backlog says Northcliff comes next "when this item comes round
  again", but the D.1 answer only chose the parking lot first; the order after it was the builder's recommendation,
  not yours, and D.2 (online) waits until "the v2 zones are done". Options:
  A) Northcliff / Martin's Landing next (houses on a hill above a creek).
  B) A high school's grounds (made-up name, per your C on names): fields, bleachers, portables.
  C) A country-club pool and golf course (made-up name).
  D) No new zone for now; finish D.5 and the found-in-play bugs first.
  Builder recommends **A**: it is another street, so it reuses every polished piece, and it was next on the list.
  Michael: **A) Northcliff / Martin's Landing next (houses on a hill above a creek)** (control room). (2026-10-01)

- **D.3 step 3, the kids are done (builder, 2026-10-01).** Your A (control room, 1 Oct) is built, on every kid on
  every map: faces (v1.118: rounded head, eye whites and irises, brows, nose, ears, a smile; glasses you can see the
  eyes through), hands (v1.119: a fist with a thumb and fingers), clothes (v1.120: tucked shirts with a collar and a
  chest stripe or pocket, belts, jeans with seams and cuffs, sneakers on white soles). Hitboxes unchanged. Screenshots
  in `tests/out/` (kid-faces, kid-hands, kid-clothes); in game, any match or the bathroom mirror once Builder sessions
  is merged. Options:
  A) Good, go on: carry Winnmark's houses, cars, trees, fort, props and road to Bunratty, the Hollow and the lot.
  B) A, and first give the mirror rows for eye colour and shirt front (stripe, pocket, plain) now the meshes exist.
  C) Change the kids first (say what in a note).
  Builder recommends **B**: the mirror rows are a short job on what is already built, and D.6 was waiting on them.
  (Builder, v1.123: the mirror rows were D.6 work already answered, so they are built: Eyes and Shirt front. B now
  means the same as A.)
  Michael: **A — Good, carry Winnmark's pieces to the other maps**. (2026-10-01)

- **D.5 B, re-sorting the shop: the list first (builder, 2026-10-01).** Your note asked whether the tabs and groupings
  make sense, keeping the early-2000s look. Today's five tabs: **BBs** (four restock packs; seven BB colours),
  **Loadout** (Utility Belt, Drop-Leg Holster; three speed loaders), **Guns** (eight guns; each gun's page holds its
  magazines and spare mags), **Accessories** (red dot, 4× scope, two lasers, flashlight), **Equipment** (six eyewear,
  four armour pieces, four shoes). What doesn't fit: "Loadout" mixes the belt and holster (gear you wear) with speed
  loaders (ammo you use up), and the name clashes with the Loadout screen. Options:
  A) Four tabs by what it's for: **Guns** (unchanged, mags inside), **Ammo** (BB packs, speed loaders, BB colours),
     **Gear** (Belt & Holster, eyewear, armour, shoes), **Mods** (sights, lasers, flashlight). Same rows and look.
  B) Keep the five tabs, move the two misfits: speed loaders to BBs, Belt & Holster to Equipment; the Loadout tab goes.
  C) Leave the tabs; only rename "Loadout" to "Belt & Holster" and move the speed loaders to BBs.
  Builder recommends **A**: four tabs a kid can guess from the name, nothing lost, nothing new to learn on the rows.
  Michael: **A — Four tabs: Guns, Ammo, Gear, Mods**. (2026-10-01)

- **D.3 after step 2: Winnmark's street is done (builder, 2026-10-01).** Step 2 (your A) is built: the cars (v1.112),
  trees and bushes (v1.113), the kid forts (v1.114), the bins, boxes and plywood stacks (v1.115), and the road with
  a gutter and rolled kerb (v1.116), all on Winnmark only, with collision unchanged. Screenshots in `tests/out/`
  (winnmark-cars-bulb, winnmark-trees, winnmark-fort, winnmark-props, winnmark-road); in game, any Winnmark match
  once Builder sessions is merged. Your note also listed people. Options:
  A) The kids next (faces, hands, clothes). They're the last thing in your list, and they show on every map at once.
  B) Carry Winnmark's new houses, cars, trees, fort, props and road to Bunratty, the Hollow and the lot.
  C) Change something on Winnmark first (say what in a note).
  Builder recommends **A**, then B: it finishes Winnmark end to end as you asked, and B is mostly wiring once the
  pieces are settled.
  Michael: **A — The kids next**. (2026-10-01)

- **D.3 step 1, Winnmark's houses (builder, 2026-09-30).** Your D answer asked to see each step before the next.
  v1.104 rebuilt Winnmark's eight houses: hip roofs with even eaves and gutters, a gable over the door with a round
  vent, framed windows with shutters, a panelled door under a hood, a chimney (`tests/houses.test.mjs` writes a close-up
  to `tests/out/houses-winnmark-seth.png`; in game, any Winnmark match). Bunratty keeps the old house. Options:
  A) Good, go on to step 2 (Winnmark's cars, then trees and hedges, the fort and yard props, the road and kerbs).
  B) A, and give Bunratty the new house now too.
  C) Change the houses first (say what in a note).
  Builder recommends **A**: finish Winnmark, then carry every piece to the other maps at once.
  Michael: **A — Good, go on to step 2**. (2026-09-30)

- **Real place names on screen (D.1 follow-up; producer, 2026-09-30).** The D.1 answer (B, the parking lot) left open
  whether real business and school names can appear in the game. The builder named the new store "Riverside Market",
  made up, and the maps already use real road names (Holcomb Bridge Rd). Options:
  A) Real names everywhere: Kroger, Centennial High School, Horseshoe Bend.
  B) Made-up names everywhere, including roads and neighborhoods.
  C) Real roads and neighborhoods, made-up names for stores, schools and clubs (as the game does now).
  Producer recommends **C**: it keeps the place recognizable to people who live there without putting a real
  company's or school's name on a game you publish.
  Michael: **C — Real roads, made-up stores and schools**. (2026-09-30)

- **D.1, maps from real places (Michael, 2026-09-28; builder, 2026-09-30).** Which new zone first? A) Northcliff /
  Martin's Landing; B) a grocery store parking lot; C) Centennial High School grounds; D) Horseshoe Bend pool and golf
  course. Builder recommended B, then A.
  Michael: **B — Grocery store parking lot**. (2026-09-30) Real names on screen: not answered; asked under Pending.

- **D.2, online play (Michael, 2026-09-28; builder, 2026-09-30).** A) title screen only, Campaign / Online (greyed) /
  Options; B) A plus a 1v1 invite-code prototype; C) hold all of it until the v2 zones are done. Builder recommended A.
  Michael: **C — Hold all of it until the v2 zones are done**. (2026-09-30)

- **D.3, mesh polish pass (Michael, 2026-09-29; builder, 2026-09-30).** A) houses first; B) kids first; C) cars and
  trees first; D) one map end to end, Winnmark. Builder recommended D, each step shown to Michael before the next.
  Michael: **D — One map end to end: Winnmark**. (2026-09-30)

- **D.4, jumping onto and over things (Michael, 2026-09-29; builder, 2026-09-30).** A) height-aware collision, stand on
  anything under ~1 m; B) A plus a sprint vault; C) vault only. Builder recommended A.
  Michael: **A — Jump onto and over low things**. (2026-09-30)

- **D.5, loadout, shop and unlock screens (Michael, 2026-09-29; builder, 2026-09-30).** Which first? A) Utility Belt
  rename and re-describe; B) re-sort the shop; C) Loadout screen with a 3D kid. Builder recommended A, then B, then C.
  Michael: **A — Utility Belt: rename and re-describe unlocks**. (2026-09-30)

- **D.6, character creator (Michael, 2026-09-29; builder, 2026-09-30).** A) at NEW GAME; B) at a mirror in the bedroom;
  C) both, the mirror, and a new save opens on it once. Builder recommended C.
  Michael: **C — Both: the mirror, and a new save opens on it once**. (2026-09-30)

- **D.7, towers, ladders and ramps (Michael, 2026-09-29; builder, 2026-09-30).** A) a treehouse with a ladder, new map
  only; B) the same on the existing Treehouse map; C) park it until D.4 has landed and been played. Builder
  recommended C.
  Michael: **C — Park it until D.4 has landed and been played**. (2026-09-30)

- **Devon's opening shot in Two in the Yards (Found in play, critic v1.86; builder, 2026-09-29).** Devon (sniper,
  `brooke_backyard`) has a clear line to the player's `road_east` spawn from the first frame, 37 m off, and fires at
  0.77–0.93 s after BEGIN; the critic saw a standing player tagged at ~1.5 s in 3 of 9. A) an opening hold for every
  gunner kid in every scenario, no shot in the first 2.5 s after BEGIN; B) sniper only, the first shot waits a bolt
  cycle; C) move Devon's start out of sight of the road; D) leave it. Builder recommended A.
  Michael: **A — 2.5 s opening hold for every kid, every map**. (2026-09-29)

- **A.1, first-timers can't find the way out (critic, 2026-09-28).** The critic proposes making the hall's front door an
  interactable that opens the map (docs/proposals.md, "The front door goes outside"). A) yes, as proposed; B) only a
  first-visit hint pointing at the map table; C) leave the bedroom as it is and fix only the map pin overlap.
  Michael: **A — the front door opens the map** (prompt "Go outside", label OUTSIDE; map table stays; fix the map
  label overlap in the same session). (2026-09-29)

