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

