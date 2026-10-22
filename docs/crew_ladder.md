# The crew-first ladder and Crew Captains

Michael's ask (local session, 2026-10-22): look at every scenario, zone by zone, for whether its title makes sense,
whether it should be a crew match, how hard it is, and anything else in that spirit; and whether there should be a set
of Crew Captains besides Seth, each zone a progression against one opposing crew ending in a showdown. This is the plan
he approved ("All of this looks great"), with his change: Priya is retired, Mitchell captains Bunratty, and two new
Bunratty kids, Joe and Chris, take her place (backlog D.58). Decisions: "The crew-first ladder and Crew Captains".

Worked from `main` at v1.311, with each match's sides as `crewFirstTime` / `crewSetup` field them the first time
through. Difficulty (1 easy to 5 brutal) is an estimate from the sides, guns, lives and the critic's headless rounds,
not a measured win rate; "a → b" is today's and after the change.

## What was wrong
1. Whether the crew plays was an accident of how each match was first written: 31 of the 73 ladder matches take it
   (27 of the 57 after Winnmark), and nothing on screen says why. Worst: just after Eric, Sean and Nick join, the
   Hollow's four fort matches are you alone against 5-6.
2. Kids change sides with no reason, because solo matches never swap anyone: Sean (your brother) attacks you in all four
   Hollow forts after he joins, Diego attacks you in Hold the Creek Fort right after he joins, Rebecca is against you in
   Friday Night Lights, Price Check and the store's Lights Out, and Ryan is your VIP while every other Bunratty match has
   him against you.
3. Titles with a headcount stopped being true with the crew (Two of Us, Four of Them is 4 v 6; Two Against the World is
   6 v 4 with all five; Outnumbered, Two on Two and Four on Four on a replay).
4. Repeated titles: Lights Out (Bunratty, the store), After Dark / Bellfield After Dark, Hold the Fort (Winnmark) / Hold
   the Fort (Night) (the Hollow), Every Kid for Themselves / Everybody for Themselves; ten titles begin "Hold the".
5. Zones are 16 / 15 / 12 / 6 / 11 / 4 / 4 / 5 matches long, every one gating the next.
6. Only Winnmark, the Hollow, Willow Bend and the Last Saturday have an opposing crew behind them.

## The rule: your crew plays unless the match says why not
Five match types, each a chip on the map card and one line on the briefing:

| Type | Briefing line | Used for |
|---|---|---|
| CREW | "Your crew's in: Eric, Sean, Nick." | the default |
| 1V1 CALLOUT | "A callout. Your crew watches from the curb." | duels; the captain's challenge that opens a zone |
| FREE-FOR-ALL | "Everybody for themselves. Crews don't count today." | free-for-alls, Infection |
| CLUTCH | "Your crew's already out. It's on you." | replaces "alone against 3 for no reason": the crew starts tagged out on the sideline |
| NO CREW YET | "You're the new kid on Seth's street." | Winnmark |

Every solo match without one of these reasons takes the crew or becomes CLUTCH: about 39 of the 57 after Winnmark take
the crew (27 today). A short night solo can say it outright ("you snuck out alone").

**Side matches:** a zone's extra matches pay and count toward the rival score but no longer gate the next match, so the
long zones shorten without anything deleted.

## Crew Captains
Seth is the rival who turns up everywhere (Gary, in Michael's Pokémon terms); the other captains are the gym leaders.

| Zone | Opposing crew | Captain | Why |
|---|---|---|---|
| Winnmark | Seth's crew from the finale on | **Seth** | his street; you try out for his crew and the finale is where he doesn't pick you |
| Bunratty | Ryan, Owen, Joe, Chris | **Mitchell** | Michael's pick (Priya retired); the older brother, "patience, that's the whole game", already "wants a rematch" |
| The Hollow | Seth's crew, round 1 | **Seth** | "seth is bringing his whole crew" |
| Riverside Market lot | Jamie, Owen and the lot's kids | **Marcus** | Seth's cousin; the lot is his turf |
| Northcliff | Christian, Fernando, Haden, Connor | **Mason** | "Mason's Court"; Diego leaves them for you |
| Hollins Ridge | Caleb, Nathan, Sophie, Grant, Malik | **Jordan** | "Told you. My portables." |
| Willow Bend | Seth's crew, round 2 | **Seth** (Brooke's callout) | Garrett's first match |
| The store | Seth's crew | **Tyler**, Seth's lieutenant | his dad is the night manager |
| Last Saturday | Seth and all seven | **Seth** | |

What a captain means in the game:
- each crew wears its own colour (a bandana, as yours does); kids in no crew wear none;
- a briefing heading and score line per crew, as the RIVALS line does for Seth today;
- the captain's 1v1 callout opens the zone; his whole crew plus one plays the finale;
- winning a finale pins their bandana on your bedroom wall;
- a captain is a notch better than his crew (aim or gun); Seth stays the best of them, once per zone (D.28 step 5).

Side consistency: a kid in your crew is never against you outside a free-for-all; a kid in Seth's crew is never with
you; Rebecca is never against you; a captain and his crew never play for another captain (Mitchell, Mason and Marcus
today stand with Seth in the Hollow's and the lot's matches, and need replacing there).

## Zone by zone

### Winnmark: tryouts at Seth's (no crew yet)
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | Backyard Basics | keep | tutorial | 1 | |
| 2 | Just You and Seth | keep | 1v1 | 2 | |
| 3 | Seth's Got a Shotgun | keep | 1v1 | 2 | |
| 4 | Every Kid for Themselves | keep, side | FFA | 3 | five kids is early for match 4 |
| 5 | Storm the Cul-de-Sac | keep, after Trey on Overwatch | no crew yet | 4 | the 1 v 3 with a sniper came before the 1 v 2 |
| 6 | Trey on Overwatch | keep | no crew yet | 3 | |
| 7 | Two on Two | **Seth's Wingman** | with Seth | 2.5 | says why Seth is with you |
| 8 | Defend the Treehouse | keep | no crew yet | 2 | a breather |
| 9 | Hold the Fort | **Keep the Plank Fort** | no crew yet | 4 | title clashed with the Hollow's |
| 10 | Two in the Yards | keep, side | no crew yet | 4.5 | Devon's sniper tags you in ~5 s (critic, 22 Oct) |
| 11 | Outnumbered | **Short a Player** | with Seth | 3 | no headcount |
| 12 | The Whole Block | keep, side | no crew yet | 4.5 | 1 v 4 |
| 13 | Squad Up | keep | with Seth and Trey | 2.5 | |
| 14 | Last Stand at the Fort | keep, side | no crew yet | 3.5 | the third fort defence |
| 15 | After Dark | keep | snuck out alone | 3.5 | |
| 16 | Night Game: Two on Two (finale) | **Seth Picks Teams**: you and Eric against Seth, Trey and Brooke | finale | 4 | Seth turns here, Eric fights beside you in the match that brings him; replaces the answered "Seth beside you in Winnmark's finale". Lost 4 of 4 with the starter pistol today, so at 2 v 3 it likely wants three lives |

### Bunratty: home street, against Mitchell's crew
Sean and Nick ask to join after You and Nick, not after the finale (replaces "Sean and Nick when Bunratty is done"), so
the crew forms at home and holds it all zone.

| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | Just You and Sean | keep | 1v1 | 2 | your brother's callout |
| 2 | Nick Won't Budge | keep | 1v1 | 2.5 | |
| 3 | You and Nick | keep, then Sean's and Nick's asks | crew | 2.5 | |
| 4 | The Brothers | **The Brothers Call You Out** | callout, 1 v 2 | 3 | Mitchell's first look at you |
| 5 | Storm the Court | keep | crew | 4 → 3 | Nick no longer defends against you |
| 6 | Sean Has Your Back | **The Rematch** | crew | 3 | Sean is crew now; "mitchell already wants a rematch" |
| 7 | Hold the Cul-de-Sac | keep | crew | 4 → 3 | Sean no longer attacks you |
| 8 | Priya's Pincer | **The Pincer** (Joe and Chris round both sides) | crew | 4 → 3.5 | Priya retired |
| 9 | Last Kid Standing | keep | FFA | 4 | |
| 10 | Infection at the Cul-de-Sac | keep | FFA | 3.5 | |
| 11 | Two Against the World | **Down Two** | crew, always two short | 4 | holds at any crew size |
| 12 | Four on Four | **Mitchell's Whole Crew** | crew | 3.5 | |
| 13 | Lights Out on the Lane | keep, side | snuck out alone | 3 | |
| 14 | Protect Ryan | **Cover Nick** (their VIP Mitchell) | crew, VIP | 3.5 | Ryan is Mitchell's brother and crew |
| 15 | Night Game: Sean Has Your Back (finale) | **When the Streetlights Come On** | finale | 4 | |

### The Hollow: Seth's crew, round 1
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | First Time in the Woods | keep | crew | 3 | |
| 2 | Storm the North Fort | **Take the North Fort** | crew | 5 → 3.5 | the worst clunk on the ladder |
| 3 | Hold the South Fort | keep | crew | 5 → 3.5 | |
| 4 | Night Assault on the Fort | keep, side | crew | 5 → 4 | |
| 5 | Hold the Fort (Night) | **Last One in the Fort** | CLUTCH | 5 → 4 | |
| 6 | Juggernauts | moved here | crew | 2 | a breather after the forts |
| 7 | Two of Us, Four of Them (Night) | **Down Two in the Dark** | crew | 4 | is 4 v 6 now |
| 8 | Ten-Way Free-for-All | keep | FFA | 4 | |
| 9 | Infection in the Dark | keep | FFA | 3.5 | |
| 10 | Full-Auto Mayhem (Night) | keep, side | crew | 4.5 | 7 of 7 lost (critic); a gimmick, not a finale |
| 11 | Night Game in the Woods | side | crew | 4 | the Big Game at night, same kids |
| 12 | The Big Game | **the finale**, 5 v 6 | finale | 4 | the name Seth's text uses |

### Riverside Market lot: Marcus's crew
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | Cart Return | keep | 1v1 | 2 | Marcus's callout |
| 2 | Aisle Wars | **Cart Corral** | crew | 3 | a lot has no aisles |
| 3 | Hold the Doors | keep | crew | 3.5 → 3 | |
| 4 | Everybody for Themselves | **Lot Free-for-All** | FFA | 4 | near-duplicate title |
| 5 | Night Shift | keep; their VIP Marcus, yours a crew kid | crew, VIP | 4 | Seth backing his cousin is his appearance here |
| 6 | After Close | keep; Marcus's crew plus Seth | finale | 4 | |

### Northcliff: Mason's crew (Alex at Stoneglen, Diego at Bellfield)
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | Down by the Creek | keep | 1v1 | 2.5 | Evan, Seth's old friend |
| 2 | The Stoneglen Twins | keep | crew | 3.5 | |
| 3 | King of the Treehouse | keep, "one climber at a time" | callout rule | 3 | the rule says why you're alone |
| 4 | Hold the Treehouse | keep | crew | 3.5 | Alex asks after it |
| 5 | Mason's Court | keep | 1v1 | 3 | the captain's callout |
| 6 | Bellfield Bulb | keep | crew | 3.5 | |
| 7 | Hold the Bulb Fort | keep | crew | 3.5 | |
| 8 | Lamplight on Bellfield | side | crew | 4 | night, against the finale's kids |
| 9 | Flags on Bellfield | keep | crew | 3.5 | Diego asks after it; up to 72% of a round is walking home and waiting (critic) |
| 10 | Hold the Creek Fort | keep | crew | 3.5 | Diego attacks you today right after joining |
| 11 | Bellfield After Dark (finale) | **Mason's Last Stand** | finale | 4.5 | it is played on Northcliff Trace |

### Hollins Ridge: Jordan's crew
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | After the Bell | keep | 1v1 | 2.5 | |
| 2 | The Portables | keep | crew | 3.5 | |
| 3 | Hold the Portables | keep | crew | 3 | |
| 4 | Friday Night Lights | keep | finale | 4.5 | Rebecca on their side, swap her; 1 win, 2 draws, 3 losses headless |

The zone jumps from a 1v1 to 6 v 6; one more match between would help.

### Willow Bend: Seth's crew, round 2
| # | Today | Proposed | Type | Diff |
|---|---|---|---|---|
| 1 | Pool's Closed | keep (Brooke's callout) | 1v1 | 2.5 |
| 2 | The Eighteenth | keep (Garrett's first match) | crew | 4 |
| 3 | Hold the Gazebo | keep | crew | 3 |
| 4 | Night Swim | keep | finale | 4.5 |

### The store, then the Last Saturday
| # | Today | Proposed | Type | Diff | Note |
|---|---|---|---|---|---|
| 1 | Cleanup on Aisle Five | keep | 1v1 | 2.5 | Tyler's callout |
| 2 | Price Check | keep | crew | 4 | Rebecca off their side |
| 3 | Customer Service | keep | CLUTCH | 3 | |
| 4 | Lights Out | **Graveyard Shift**, at plus one | the store's finale | 4 | duplicate title; 6 v 6 and not a finale today |
| 5 | The Last Saturday | keep | finale | 5 | 6 v 8, three lives |

## Owed
- The critic measures the main line's win rates once the order is in; the difficulty numbers above are estimates.
- Every briefing's `desc` is rewritten for its new sides (v1.274 and v1.275 left them naming the old allies).
- Texts that name a match or a kid moved here (Sean's and Nick's asks, Eric's at Winnmark, Seth's after the Big Game).
