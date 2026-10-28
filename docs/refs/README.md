# Reference pictures: the real places behind the maps

Michael put reference pictures for each map in Google Drive on 16 Oct 2026 (backlog D.25):
https://drive.google.com/drive/folders/1ddoSIl1zFCvCbnqyv8xMsXCRAm8F5K0p (a folder per place, plus an overview map and
three heightmaps of the whole area). He wants the maps "as close to these images as possible".

**No picture is in this repo, on purpose.** The repo is public and the photos show homes people live in now. Each guide
below describes its folder in words and numbers so that a session without the pictures can build from it. A session
that has the Google Drive connector can open the folder by its id; one that doesn't works from the guide. Keep it that
way: no photos, no house numbers, no residents' names in the repo.

| Real place | Game map | Guide |
|---|---|---|
| Bunratty Court (Michael's street, Sentinel on the River) | Bunratty Court | [bunratty.md](bunratty.md) |
| Winnmark Court (Seth's street) | Winnmark Court | [winnmark.md](winnmark.md) |
| The Chattahoochee River field | The Hollow (river zone) | [chattahoochee.md](chattahoochee.md) |
| Kroger and its shopping centre, Holcomb Bridge Rd | Riverside Market lot, Inside Riverside Market | [kroger.md](kroger.md) |
| Horseshoe Bend Country Club | Willow Bend Country Club | [country-club.md](country-club.md) |
| Northcliff Trace, Stoneglen Close | Northcliff Trace, the treehouse yard | [northcliff.md](northcliff.md) |
| Centennial High School | Hollins Ridge High | [high-school.md](high-school.md) |
| The upstairs landing and Michael's bedroom (concept-art folder, 28 Oct) | The bedroom hub | [landing.md](landing.md) |

Bellfield Court has no real counterpart and no folder. The game keeps its made-up names for the store, the club and the
school (no real brands or school marks in the game).

## The whole area (overview map and heightmaps)
- Everything sits in East Roswell on the north bank of the Chattahoochee, inside about 4 km: Bunratty Court and
  Winnmark Court (Seth's) are about 1.5 km apart in the wooded hills between Eves Rd and Steeplechase Dr; Horseshoe Bend
  Country Club is just south of them on the river's big bend; Kroger and Centennial High School are about 3 km north on Holcomb Bridge
  Rd (GA 140), the area's one commercial strip. The neighbourhoods are dense tree canopy with houses in clearings; the
  only big open ground is the golf course, the school's fields and the shopping centre lots.
- The heightmaps (elevation 240-360 m) show the river in a valley cut about 60-90 m below the ridge tops, with steep
  ravines branching off it every 100-200 m, each with a creek. The neighbourhood streets run along the ridges and spurs
  between those ravines, so a cul-de-sac on a spur (Bunratty) has back yards that fall away steeply on three sides,
  while one on a broad ridge top (Winnmark) is nearly flat, its yards sloping off to the creek behind. The north side
  (Holcomb Bridge, the school, the store) is the high, flattest ground.
- The river's far (south) bank rises hard: Michael's "very aggressive slope" opposite the field. Past-the-edge scenery
  on the river maps should show that wooded bank climbing 40-60 m, not a flat horizon.

## Michael's answers (16 Oct)
The guides were written before Michael answered their questions. His answers are in `docs/decisions.md` ("The maps
from the reference pictures", under Answered) and override a guide where they differ. Most of all: he chose **real
scale throughout**, so most maps become one Fable rebuild each, not the in-place steps a guide's "Suggested order"
lists. Backlog D.51 has the plan.

## How to use a guide
Each guide has Michael's notes in his words, a table of every picture (with its Drive link), the real place in
metres and colours, the game map today, the gaps biggest first, and a suggested order of builder-sized steps. Items
marked **(design)** wait for Michael's answer in `docs/decisions.md`; **(Fable)** items are wholesale rebuilds.
Past-the-edge items feed the backdrop table `EDGE_BACKDROPS` (v1.252, on `auto/fable-d24-backdrops` until it merges).
