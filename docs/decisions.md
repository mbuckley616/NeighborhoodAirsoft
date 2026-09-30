# Decisions

Questions for Michael and his answers. Agents add under Pending; the producer carries them to Slack
(#neighborhood-airsoft) and writes the `Michael:` line when he answers. Nothing is a spec without one.

## Pending

- **Devon's opening shot in Two in the Yards (Found in play, critic v1.86; builder, 2026-09-29).** Devon (sniper,
  `brooke_backyard`) has a clear line to the player's `road_east` spawn from the first frame, 37 m off, and fires at
  0.77–0.93 s after BEGIN in every headless run; the critic saw a standing player tagged at ~1.5 s in 3 of 9. Nothing
  in the game holds a kid's fire at the start of a round. Options:
  A) An opening hold for every gunner kid in every scenario: no shot in the first 2.5 s after BEGIN (they still move
     and peek). Fixes this and any other spawn-in-sight start.
  B) Sniper only: the first shot waits a full bolt cycle, 2–3 s after BEGIN, the same floor v1.46 puts between shots.
  C) Move Devon's start anchor to a backyard with no line to the road, so he has to come find you, as the scenario
     blurb says ("he'll let Jamie flush you out").
  D) Leave it: a sniper that punishes standing still is the lesson.
  Builder recommends **A**: one rule, every map, and a first-timer reading the HUD gets 2.5 s. C also fits the blurb
  and could go with it.

- **D.4, jumping onto and over things (Michael, 2026-09-29; builder, 2026-09-30).** The player can already jump
  (4.2 m/s up, about 0.74 m of rise), but collision is flat: `collidesObstacles` blocks by footprint alone, so a
  0.6 m cardboard box stops you exactly like a house wall, in the air or not. Options:
  A) Height-aware collision: each obstacle gets a top height; anything the feet clear is passed over, and anything
     under ~1.0 m can be landed on and stood on (boxes, bins, low walls, car bonnets). Kids stay on the ground.
  B) A as well as a vault: sprint into cover up to ~1.2 m and press Space to go over it in a 0.5 s animation that
     costs stamina, instead of a jump.
  C) Vault only, no standing on things: cover stays a thing you shoot from, not a thing you stand on.
  Builder recommends **A** first (one session, it's what the note asks, and it's what D.7's towers need); B is a
  second session on top of it. A player standing on a bin sees over cover the kids were placed to hide behind, so
  some scenarios may need a look after it lands.

- **D.7, towers, ladders and ramps (Michael, 2026-09-29; builder, 2026-09-30).** He says it's a note for future builds,
  not for the existing maps. It needs D.4's A (standing on things) to exist first. Options for the first piece:
  A) A treehouse with a ladder in a new scenario only: climb with W at the ladder, jump off at the cost of all your
     stamina, and a kid can hold the platform.
  B) The same thing on the existing Treehouse defend map (the treehouse is already there, but as a prop).
  C) Park it until D.4 has landed and been played.
  Builder recommends **C**, then A: the drop penalty and kid pathing up a ladder are easier to judge once jumping
  onto things has been felt.

- **D.1, maps from real places (Michael, 2026-09-28; builder, 2026-09-30).** Four zones exist (Winnmark, Bunratty,
  The Hollow, and Northcliff as a locked "coming soon" pin). A new zone is a scene builder, spawn anchors, cover, and
  2–4 scenarios: about two to three builder sessions each. Which first?
  A) Northcliff / Martin's Landing: it's already on the map with a teaser and the ladder expects it next.
  B) A parking-lot skirmish (grocery store lot): cars as cover, open sightlines; the closest to the existing
     cul-de-sac kit, so the cheapest.
  C) Centennial High School grounds: the biggest and most distinctive, but most new geometry.
  D) Horseshoe Bend pool and golf course.
  Builder recommends **B** as a standalone zone right after The Hollow, then A. Say too whether real names
  (Kroger, Centennial HS) can go on screen, or should be made-up nearby names.

- **D.2, online play (Michael, 2026-09-28; builder, 2026-09-30).** The design brief puts PvP at v3, peer-hosted over
  WebRTC. A browser game on itch.io can't open a port, so "a list of hosted servers" needs a small always-on
  signalling and lobby server somewhere (a free-tier host), which is outside this repo today. Options:
  A) Only the title screen for now: Campaign / Online (greyed, "coming soon") / Options, and move the settings into
     Options. One session.
  B) A as well as a prototype: two browsers on one invite code, peer to peer (WebRTC with a public STUN server), 1v1 on
     Winnmark. No server list. Several sessions, and it needs a signalling server you'd set up.
  C) Hold all of it until the campaign's v2 zones are done, as the brief orders it.
  Builder recommends **A** now and **C** for the rest.

- **D.3, mesh polish pass (Michael, 2026-09-29; builder, 2026-09-30).** Every mesh is built from boxes and cylinders
  in code; there are no model files. Where to start?
  A) Houses first (rooflines, trim, windows, doors, porches): they fill every frame.
  B) Kids first (faces, hands, clothes): what you look at down the sights.
  C) Cars and trees first: the most repeated, so the cheapest to lift across every map.
  D) One map end to end (Winnmark, the first a new player sees), everything on it.
  Builder recommends **D**: one map done fully shows the target look, and the other maps then follow its pieces.
  It's judged by eye, so each step would need your look before the next.

- **D.5, loadout, shop and unlock screens (Michael, 2026-09-29; builder, 2026-09-30).** Three things in one note.
  Which first?
  A) Rename and re-describe the loadout unlocks as "Utility Belt" items whose text says what each unlocks. Small, one
     session.
  B) Re-sort the shop's tabs and groupings, keeping the early-2000s website look. One session; the new grouping
     would come to you as a list first.
  C) The Loadout screen with a 3D kid showing what's worn where (the in-game kid mesh, gear on each body part). Two
     sessions; unique meshes per item would follow later.
  Builder recommends **A, then B, then C**, in that order, each as its own version.

- **D.6, character creator (Michael, 2026-09-29; builder, 2026-09-30).** The design brief puts customisation at v2
  with "a mirror moment". Options:
  A) At NEW GAME, before the bedroom: height, build, skin, hair and eye colour, and shirt/shorts colour, on the
     existing kid mesh. Saved in the save file; old saves get today's look.
  B) In the bedroom, at a mirror you walk up to (the brief's mirror moment), changeable any time between matches.
  C) Both: B, and a new save opens on it once.
  Builder recommends **C**. Height would change your eye height and hitbox a little; if that should stay fixed for
  fairness, say so and height becomes cosmetic only.

## Answered

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

