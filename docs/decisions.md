# Decisions

Questions for Michael and his answers. Agents add under Pending; the producer carries them to Slack
(#neighborhood-airsoft) and writes the `Michael:` line when he answers. Nothing is a spec without one.

## Pending

## Answered

- **The Hollow's free-for-all: the kids can't all be hidden from each other (builder, 2026-10-17, v1.265)**
  In the Hollow only the trees can hide a start, and its forest is not the same every time: the first match built after
  the game loads draws its trees differently from every later one, so 4–10 of the 45 kid pairs can see each other from
  their starts. A) fix the drift (seeded random numbers for the map builders, every layout the same on every load), then
  hide the Hollow's ten starts; B) leave it; C) cover at the starts. Builder's lean: A.
  Michael: **A — Fix the drift, then hide the Hollow's starts**. (2026-10-17)

- **Selling a gun back: what do you get for it? (builder, 2026-10-17, backlog D.44)**
  You asked to sell guns back with a resale penalty, "maybe a free return if you've only used it in 3 matches or
  something". The shop has no Sell today and nothing counts how many matches a gun has been used in; both are small to
  add (a per-gun match count in the save, from the day it ships; guns bought before count as used). Selling a gun also
  sells its mags and parts with it, at the same rate, and the starting Spring Pistol can't be sold. Which rate?
  - A) **Half back, always:** 50% of what you paid for the gun, its mags and parts. Simple, no counting
  - B) **Free return, then half:** the full price back if you've taken it into 3 matches or fewer, 50% after
  - C) **Free return, then less the more you use it:** full back up to 3 matches, then 70% down to 40% at 20 matches
  - D) Different (say in a note)
  Builder's lean: B. It is what you described, one number to remember, and a bad buy can be undone before it costs you.
  Michael: **B) Free return, then half** (17 Oct 2026)

- **Squad orders on a controller: which button (builder, 2026-10-17, backlog B.11)**
  Q's wheel (v1.248) has no pad button. You suggested the d-pad, but in a match the d-pad already picks gun slots 1-4
  (up 1, right 2, down 3, left 4, v1.241), and Y/RB and LB also step through the slots. The wheel's four orders sit
  the same way round: up push up, right find cover, down keep distance, left follow me.
  - A) **The d-pad gives the orders:** a press is that direction's order at once (the wheel flashes it and a teammate
    answers on the walkie); slots stay on Y/RB (next) and LB (back). Fastest; costs the d-pad's straight-to-a-slot
  - B) **Hold the d-pad for the wheel:** a tap still picks a slot; held 0.3 s the wheel opens, the right stick points
    at an order, letting go gives it. Keeps both, but a slow press in a fight swaps your gun
  - C) **Click the right stick (R3) for the wheel:** R3 is free; hold it, point the right stick, let go. The d-pad keeps
    the slots, but you can't look around while picking (as with Q and the mouse)
  Builder's lean: A. Orders are what you reach for mid-fight and the pad already has three ways to change gun; the
  on-screen hint would read "d-pad" on a pad.
  Michael: **A) The d-pad gives the orders** (control room). (2026-10-17)

- **A trade on the last tag is a loss (critic, 2026-10-16)**
  When you tag the last kid and his BB, already in the air, lands on you inside the next 600 ms, you lose: the win
  waits 600 ms so the hit shows on screen, and a tag on you ends the round at once (v1.90, "the first ending stands";
  its Still open left this to you). In 1v1s it's common up close: in Seth's House the critic's bot tagged Seth in 12
  rounds and 9 ended YOU'RE OUT, his BB landing 16–50 ms after the tag (he fired before it, from 1–8 m); Tyler in the
  store, 1 of 4. The card then reads "Seth grins from behind the cardboard" with Seth out and your tag counted.
  - A) **A trade goes to you:** once your last tag lands, nothing tags you during the 600 ms; you win
  - B) **A trade is a draw:** a new result, both out, no win, the loss's pay
  - C) **Leave it:** the round was still on, so the BB counts (today)
  Critic's lean: A. It is how a kid would call it ("I got you first!"), and the cost is one check in `applyBBHit`.
  Michael: **A) A trade goes to you**. (2026-10-16)

- **Free-for-all starts on Winnmark and Bunratty: one kid has your start (builder, 2026-10-15)**
  The critic (15 Oct, v1.244) found Every Kid for Themselves decided by Seth: your `road_east` start is 27.7 m from his
  backyard (the others 32–59 m), he has a line to you by 2–3 s, and tagged a player standing at the start at 4.4–7.7 s
  in 4 of 4 probes and took all 4 of the bot's losses. Bunratty's 6-way did the same on 14 Oct with Sean (all six of
  your lives from 17–20 m, each within 2–3 s of coming back). For the lot's free-for-all you chose B on 1 Oct: hidden
  starts, yours behind a car at the edge, "one of seven hidden kids"; the lot's test now holds every start 18 m or more
  from the next and none in sight of another. Winnmark's and Bunratty's free-for-alls never got that rule.
  - A) **The lot's rule on every free-for-all:** move starts (yours or the kids') until each is at least 18 m from the
    next, none in sight of another, and no kid nearer your start than the rest; a test holds it on all four maps,
    the Pickup Game's free-for-alls included. *(recommended: it is the rule you already set, and it keeps the
    briefing's "everyone shoots at you the second they see you" without one kid owning the start)*
  - B) Only move your start on Winnmark and Bunratty, away from Seth and Sean.
  - C) Leave it: in a free-for-all somebody is always nearest.
  The lose line that had all four "regroup near the road" together is fixed already (v1.246: it names who got you and
  says the rest keep going at each other).
  Michael: **A) The lot's rule on every free-for-all**. (2026-10-15)

- **Lamplight on Bellfield: Fernando's AK can reach your start (builder, 2026-10-15)**
  CI on PR #75 failed the check that a player standing at the entry in Lamplight on Bellfield (the night 4v4) is not
  tagged in the first 5 s: tagged at 4.6 s. Reproduced in 1 of 45 rounds (4.7 s): Fernando, 5 m from his start, landed
  an AK BB from 55.5 m. The test's own check prints that he and Christian have a line to the entry from their starts,
  and an AK engages out to 100 m. Of the other 44 rounds, one was tagged at 10 s, 32 at 13.8–29.1 s, 11 not in 30 s. It
  is rare, but it is a tag before you have moved, and it fails CI now and then.
  - A) **Move Fernando's (and Christian's) start out of the line to the entry**, behind a house or the island's
    hedge, so nobody can see your start at BEGIN. *(recommended: the same "no line from a start" rule the other night
    matches keep, and nothing else about the match changes)*
  - B) At night an AK engages out to 60 m, not 100 m, on every night map.
  - C) Leave the match; the check allows a tag from 4 s on.
  Michael: **A) Move Fernando's (and Christian's) start out of the line to the entry**. (2026-10-15)

- **Views past the edge of every map (D.24–D.25): generic now, or from your own pictures of the real streets? (deep-work session, 2026-10-15)**
  I stood at the middle of each map's four edges in a headless browser and looked outward. Pictures of the four worst:
  [Bunratty](https://raw.githubusercontent.com/mbuckley616/NeighborhoodAirsoft/auto/fable-d24-backdrops/docs/prototypes/d24-edges-BunrattyCourt.png),
  [the Riverside Market lot](https://raw.githubusercontent.com/mbuckley616/NeighborhoodAirsoft/auto/fable-d24-backdrops/docs/prototypes/d24-edges-MarketLot.png),
  [the Country Club](https://raw.githubusercontent.com/mbuckley616/NeighborhoodAirsoft/auto/fable-d24-backdrops/docs/prototypes/d24-edges-CountryClub.png),
  [Winnmark](https://raw.githubusercontent.com/mbuckley616/NeighborhoodAirsoft/auto/fable-d24-backdrops/docs/prototypes/d24-edges-WinnmarkCourt.png).
  What shows today: on Bunratty, looking north and west there is no ground at all, only sky. On Winnmark, looking east
  the grass stops and the sky begins. On the market lot, the high school and the country club, a flat green field runs
  to a hard line under an empty sky (at the school and the club, just past the chain-link fence). The grocery store's
  front windows show plain sky, not its parking lot. The Hollow, Bellfield and the treehouse yard are mostly fine: fences
  and a tree line close the view. Northcliff's hills hide most of its edge.
  How it would be built, whatever you pick: scenery past the fence that nobody can walk into or shoot through (BBs
  stop where they stop now). The ground runs on to the horizon. Rows of simple houses with roofs and yards stand behind
  the back fences, with tree lines, rooftops further out, and a soft haze. Each map gets what fits it: more houses behind
  the courts, a road and other shops beyond the market lot, playing fields and houses beyond the school and the club,
  and the lot through the grocery store's windows. It is cheap to draw: today an edge view costs 52–180 draw calls and a
  spawn view 330–1,650, and the backdrop adds at most 40 per map, checked by a test. Nothing loads from the internet.
  A cloud session cannot reliably pull satellite imagery, so the real look comes only from pictures you send. They
  would be a guide for shapes and placement (which side has houses, trees, a field or a road; how tall; how far). No
  photo goes into the game.
  Options:
  - A) **Generic backdrops for every map now.** The scenery above, made up to suit each map, with no real references.
    About two sessions. Nothing needed from you.
  - B) **A now, then map by map from your pictures.** A first, so no map has a hard edge. Then, as you send pictures of
    a street, that map's backdrop is reshaped to match it. What to send for each map: 2–4 screenshots from Google Maps
    (satellite or 3D view, or Street View), standing on the street and looking out past the houses or fences that are
    the map's edge. Attach them on the control room, or put them in the repo under `docs/refs/<map name>/`. If the repo
    is public, use the control room, since those pictures show real streets near your home. *(recommended: every map
    stops looking cut off after one step, and the real look comes map by map as your pictures arrive, with no waiting.)*
  - C) **Winnmark first, to your pictures, shown to you before the rest.** This waits on your pictures of Winnmark. The
    other maps keep their hard edges until you have seen Winnmark and said go.
  - D) Not now.
  Michael: **B) A now, then map by map from your pictures**. (2026-10-15)

- **Out kids and your BBs: one-way cover? (critic, 2026-10-15, v1.244)**
  Since v1.237 (your D.33) a kid who is out stops your BBs and complains. In a one-life match he stands with his hand
  up where he was tagged for the rest of the round, so he's a shield for whoever is behind him, but only against you:
  his teammates' BBs pass through him and still tag you. Checked directly in Storm the Cul-de-Sac, and seen once in 22
  bot rounds.
  - A) Out kids stop everyone's BBs, theirs too (cover for both sides)
  - B) After a few seconds with the hand up, an out kid walks off the field to his start or the street edge, as real
    airsoft players walk to the safe zone, and stops being in anyone's lane *(critic's recommendation: it's the real
    rule, and it keeps your "shoot him and he's mad" moment for the seconds he stands there)*
  - C) Leave it: it's rare
  Michael: **B) After a few seconds an out kid walks off the field**. (2026-10-15)

- **The backyard shooting range (D.40): where is it and what is on it? (builder, 2026-10-15)**
  You asked for a range in the backyard to test guns and setups outside a match: coke cans, bottles, paper stood up
  that BBs punch through, homemade bullseyes, every BB from your real bag, based on 235 Bunratty Court's backyard and
  pool deck. Whatever you pick: no kids, no clock, no money won; cans knock off and can be stood back up, bottles
  break, paper keeps every hole, bullseyes show where each BB landed and its ring; E at the bench stands everything
  back up; the gun, gear and BBs are your loadout's. The cloud can't open Zillow, so a few screenshots of the yard
  and deck (in Slack or the control room) would let the builder match it; without them it is a fenced lawn, a pool
  deck and a bench, from memory of the street map.
  - A) **Out your own back door.** A "Backyard" door in the bedroom's hall opens the range in your own yard (the
    house the bedroom is in), back in through the same door. *(recommended: it is your yard, one step from the shop
    and the workbench, so you buy a part and try it straight away)*
  - B) **A pin on the map** in the Bunratty Court zone, like a match, entered through a briefing.
  - C) A, and timed drills on the bench: knock all six cans, best time saved, shown on the bench next time.
  - D) Different (say where or what in a note).
  Michael: **A — Out your own back door**. (2026-10-15, on the control room)

- **The Last Saturday: what is a life for you? (builder, 2026-10-15)**
  The critic (14 Oct, v1.224) found The Last Saturday says "three lives for everybody", but your three lives are
  three hits where you stand: in 8 of 10 rounds two went within 0.75 s, in 2 of 10 all three inside 0.55 s (Mitchell's
  AK at 3.68, 4.15, 4.23 s). Your A on "Pickup Game: what is a life for you?" fixed this for the board only and kept
  the ladder untouched, so this one is yours to call. It is the only ladder match with more than one life for you.
  - A) **As in the Pickup Game:** a tag sends you back to your start with 2 s of cover and takes one life.
    *(recommended: it is what the briefing promises, the code is the Pickup Game's, and the finale stays three
    real chances)*
  - B) Keep a life as a hit where you stand, with 1 s of cover after each, so one burst costs one life.
  - C) Change only the words: "you can take three hits".
  Michael: **A — As in the Pickup Game**. (2026-10-15, on the control room)

- **The cheap clear-plastic automatics (D.37): which ones? (builder, 2026-10-15)**
  You asked for 3-4 "shitty" automatic guns in see-through white plastic: low rate of fire, wild spin so BBs go every
  which way, or prone to jamming. The shop's Guns tab now has an AUTOMATICS chip they would land under (v1.240). All
  of them would be cheaper than the Bucket Gun ($110), sold on airsoft.com, carried by no kid at first, each with its
  own model in clear plastic with an orange tip, and each bad in its own way:
  - A) **Three:** the *Clear Sprayer* ($35, a little battery SMG: 6 BBs a second but every BB curves hard, a 3 m
    circle at 15 m), the *Ghost Mini* ($45, a clear micro-uzi: steady aim, but jams about one burst in five, R held to
    clear it), and the *Tick-Tock* ($55, a clear rifle: dead accurate and the longest reach of the three, but only 2
    BBs a second, ticking like a clock). *(recommended: three kinds of bad, one each, cheap enough to buy early)*
  - B) A, and a fourth, the *Rattle Can* ($25, all three faults at once, a joke gun for the first week of summer).
  - C) Two only, the Sprayer and the Ghost Mini; rifles stay spring guns.
  - D) Different guns or faults (say which in a note).
  Michael: **B — A, and a fourth, the Rattle Can**. (2026-10-15, on the control room)

- **Squad commands (D.35): how do you give them? (builder, 2026-10-15)**
  You asked for Battlefront-style orders to your team: push up, keep distance, find cover, follow me. Your teammates
  are the ally kids in team matches (3v3, 4v4, VIP, flags, the Pickup Game). Whatever you pick: an order goes to every
  teammate in walkie range, they answer it on the walkie ("Copy, pushing!"), the HUD shows the order standing, and it
  holds until you give another or the round ends. Push up: they advance to the next cover toward the other side. Keep
  distance: they hang back 15-25 m and fight from range. Find cover: each takes the nearest cover and holds. Follow
  me: they stay within about 6 m of you and shoot what you shoot at.
  - A) **Hold Q for a wheel.** Hold Q, the four orders show round the crosshair, flick the mouse toward one, let go.
    The match keeps running while you choose. *(recommended: one key, nothing to remember, like Battlefront 2's)*
  - B) **Four keys, Z X C V**, one order each, no menu (all four are free today). Fastest, but four more keys to
    learn.
  - C) **The walkie: T talks, then 1-4.** Press T, a walkie card shows the four orders, a number picks one. Ties it to
    the walkie your kid already carries, but two key presses and 1-4 are the loadout keys while it is open.
  - D) A or B, and orders to one teammate (aim at him while giving it) as well as to everybody.
  Michael: **A — Hold Q for a wheel**. (2026-10-15, on the control room)

- **The pool noodle (D.36): bought or earned, and what does a hit do? (builder, 2026-10-15)**
  A pool noodle as a melee backup for when you are out of BBs. Whatever you pick: it goes in a loadout slot like the
  speed loader, a key (V) swings it in first person, it reaches about 1.6 m, and a kid hit by it reacts like a BB tag
  (a hit kid shouts something about it). Kids never carry one.
  - A) **Sold on airsoft.com for $15**, a hit is a tag like a BB. *(recommended: simple, and a real backup)*
  - B) **Earned**, not sold: it lies in the garage and becomes yours after a match (say the first Bellfield win), a
    hit is a tag.
  - C) A, but a noodle hit only counts if you hit from behind (a sneak tag), so it doesn't replace the gun.
  - D) A or B, but a hit is not a tag: it stuns the kid for 2 s (he stops shooting and complains), to buy you time to
    reload.
  Michael: **A — Sold on airsoft.com for $15**. (2026-10-15, on the control room)

- **Online play (D.2): how do two friends find each other, with no server of ours? (deep-work session, 2026-10-14)**
  You chose B on 12 Oct: online comes after the Pickup Game board, and the host sets the match up from it. The board is
  done (v1.201–v1.207). The game is one HTML file on itch.io, so the two browsers have to talk to each other directly
  (WebRTC, built into every browser). To start that talk, each browser first needs to hand the other a short "here is
  how to reach me" note. Something has to carry that note, and that is the question.
  How the match itself would work, whatever you pick: the host's game is the referee. It runs the kids, the BBs and
  the score exactly as today. The guest's game sends its keys and mouse about 60 times a second and draws what the
  host sends back about 20 times a second. On the host's screen the guest is one more kid, wearing the guest's look.
  The code already tags each BB with who fired it and which side he is on, so a guest's tag counts the way a kid's does.
  What it means for privacy, whatever you pick: a direct connection shows each player's internet address (IP) to the
  other, as any voice chat or console party does. So it is for friends you know, and the screen says so. No accounts,
  no names leave the game except the kid name the guest picks. Nothing loads at startup. The connection code (about
  100 KB) loads only when someone presses Online. Two players behind strict networks (some school and office Wi-Fi,
  some phone hotspots) may not connect at all. That is roughly one pair in ten. Fixing it needs a paid relay, which
  none of these options includes.
  Options:
  - A) **A free public matchmaker (PeerJS's).** The host presses Online on the board and gets a four-letter room code
    such as `KXRB`. The friend opens the game, presses Online, types the code, and they are in. Nothing for you to set
    up or pay. The catch: it is a stranger's free service. It sees the room code and both IPs, it has no promise to
    stay up, and it cannot list open rooms, so step 3 (a room list) would need B later. *(recommended: the only option
    that plays like a game today at no cost to you. If it ever goes away, the swap to B touches one function)*
  - B) **Your own tiny matchmaker.** The same room codes as A, but carried by a small free Cloudflare Worker on your own
    account. That is a free sign-up and about 15 minutes. I would write the code and the steps, and you would paste
    them in. It is under your control, nobody else sees the codes, and it can also hold the list of open rooms that
    step 3 needs. The catch: it waits on you, and it is one more account to keep.
  - C) **No service at all: copy-paste invites.** The host presses Online and gets a long invite code, about 400
    characters. They send it to the friend by text or Discord. The friend pastes it in and gets a reply code to send
    back, and the host pastes that. Nothing in the middle at all. The catch: two long pastes each way every match, and
    no room list ever.
  - D) Hold online play for now.
  The first playable step, for A, B or C: Winnmark Court only, a 1v1, you against your friend, with the board's lives
  and clock. Online appears as a button on the Pickup Game board, and the title screen stays as it is. Nothing is on
  the line: no pay, no progress, and each player's save is untouched. The guest needs no unlocks. If either player
  drops, the other sees "Your friend left" and goes back to the bedroom. Teams with kids filling the empty spots
  (step 2), the room list and a Campaign / Online / Settings title screen (step 3) come after, each shown to you first.
  Michael: **A) A free public matchmaker (PeerJS's)** (2026-10-14, control room)

- **What does the bed do, now the game saves itself? (builder, 2026-10-14)** Backlog D.29 (Michael, 13 Oct: "We
  need an autosave function ... I'm not sure what to do with the bed though then... maybe with the calendar and the
  campaign mode, we use it as a way to advance to the next day? Idk."). Autosave is built (v1.218): a new game saves
  itself coming home, after every match and after every buy, with a small "Saved" in the corner. The bed still says
  "Sleep (save your game)" and shows the save summary. The calendar's date moves with the matches you win, not with
  days you sleep. Options:
  - A) The bed shows the summer so far: the save summary as now (cash, guns, matches won), plus the date, the score
    against Seth's crew and what is next on the ladder; the prompt becomes "Sleep (how's the summer going?)"
    *(recommended: it keeps the bed useful without changing how the summer's dates work)*
  - B) Sleeping ends the day: the calendar moves on a day each time you sleep (as well as with wins), and a day
    that goes by without a match is crossed off
  - C) Sleeping switches day and night: the next match you start (or the Pickup Game board) is at night, and the
    next sleep turns it back
  - D) The bed is furniture: no prompt, nothing to do there
  Michael: **A) The bed shows the summer so far** (2026-10-14, control room)

- **Pickup Game: what is a life for you? (builder, 2026-10-13)** Found in play (critic, 13 Oct, v1.201): the board's
  briefing says "3 lives for everyone, you included", but a kid's life is a tag, a walk back to base and a return, while
  yours is one hit where you stand, with no gap between hits. In 6 of 20 headless 4v4 rounds at 3 lives all three of
  your hits landed within 1.1 s, once from a single shotgun blast (3 pellets in one frame, 3 lives). The critic's
  proposal (proposals, 13 Oct) is option A; the fix is a design call, so it is asked here before any code. Options:
  - A) In the Pickup Game only, a life works as it does in VIP and Flags: a tag sends you back to your start with
    `respawnPlayerVip()` and its 2 s grace, takes one life, and the HUD counts LIVES; the last one ends the match. One
    blast costs one life *(recommended: it is what the board promises, the code is already played in Flags and VIP,
    and the ladder is untouched)*
  - B) Keep a life as one hit where you stand, but after each hit nothing tags you for 1 s, so one blast or one burst
    costs one life; the words stay
  - C) Change only the words: "you can take 3 hits"; the shotgun can still take all three at once
  Michael: **A — A tag sends you back to your start**. (2026-10-13)
- **Fernando's rifle in a Northcliff pickup game by day (builder, 2026-10-13)** The critic's 13 Oct report: the
  Northcliff pickup game uses the night 4v4's spots, and by day Fernando's sniper rifle on the high yard (`yard_n3`)
  made 15 of 15 hits on a player walking at the nearest kid, one every 2.4–2.9 s, out at 15–17 s every round (5 of
  15 by night). Since v1.203 you can leave him out, but he is on their side by default. Options:
  - A) By day his spot keeps its defender role, but he carries the AK he uses in Bellfield's matches *(recommended:
    the nest still matters, and a rifle at 20–25 m in daylight is what made it a wall)*
  - B) By day he plays it as an ordinary kid with his rifle, free to leave the nest
  - C) Leave it: the board lets you take him off, and night is the match the spot was made for
  Michael: **A — Keep his nest, but he carries his AK by day**. (2026-10-13)
- **The last Saturday: where is your street? (builder, 2026-10-13)** Step 4 of the summer story is one big match on
  your own street on Saturday 30 August, after the store's night match; Seth's last text sets it up ("ur street,
  everybody. my crew vs yours"). Nothing in the game yet says which street is yours. Options:
  - A) Winnmark Court is your street: the summer started there and Seth lives on it. A day 6v6, last team standing,
    three lives each: Eric, Rebecca, Brooke, Sean and Trey with you against Seth, Devon, Mitchell, Mason, Marcus and
    Ryan; its own card after the store, dated 30 August on the calendar, and a last text after it *(recommended)*
  - B) A new short street of your own, built from the polished Winnmark pieces, with the same match
  - C) A, and the bedroom's calendar turns to a last page ("See you next summer") once it is won
  Michael: **B — A new short street of your own** — Bunratty court should be ‘my street’. (2026-10-13)
- **Does Seth's crew get a name? (builder, 2026-10-13)** v1.196 makes Seth's crew the summer's rival: 20 ladder
  matches have Seth on the other side, and the briefing, the result card and the calendar now call them "Seth's
  crew", as the texts already do. A name would go in one constant (`RIVAL_CREW`), so it is cheap either way; D.21 will
  give your own crew a name later. Options:
  - A) Keep "Seth's crew": it is what kids would call them, and it says who leads them *(recommended)*
  - B) A made-up crew name you pick (say it in a note), shown wherever "Seth's crew" is now
  - C) Wait until D.21's crew name for your side, then name both together
  Michael: **A — Keep "Seth's crew"**. (2026-10-13)
- **Shoes as looks, when shoes are already gear? (builder, 2026-10-13)** D.21's list ends "shorts and shoes". The
  shop's Gear tab already sells three pairs (Trail Runners, Track Spikes, Cushioned Cross-Trainers), each with its own
  stamina or sprint numbers and its own look on the Loadout kid (v1.133); with none bought you wear plain sneakers in a colour
  the game picks. A Clothes pair would have to sit beside or replace the gear pair. Options:
  - A) A Sneakers row at the mirror, free: six colours for the plain pair you wear when no gear pair is on; the gear
    pairs keep their own look *(recommended)*
  - B) Clothes shoes with no numbers (high-tops, skate shoes, flip-flops), worn only when no gear pair is on
  - C) Skip shoes; go on to your crew (a name and colours your allies wear)
  Michael: **A — A free Sneakers row at the mirror**. (2026-10-13)
- **A better game, 1 of 5: a story? (builder, 2026-10-12)** You asked whether the game needs a campaign or a simple
  storyline. Today the reason to play is the ladder: win a match, the next opens, zone after zone. Nothing says who
  these kids are to you or why this summer matters. Options:
  A) A light summer story told in the bedroom, no cutscenes: a wall calendar from the first week of June to the last
     day of August, each zone a few weeks of it; your friends (Eric, Rebecca, Brooke) text your flip phone between
     matches, a rival crew is named early, and it ends on the last Saturday of summer with one big match on your own
     street. Briefings and result lines pick up the thread.
  B) A as well as a few scripted moments inside matches: a friend pinned down that you go and get, an ambush on the walk
     home, the rival crew showing up mid-match.
  C) No story; a reason to replay instead: three stars a match (win; win without being tagged out; a match-specific
     one like "win with the pump only") and a neighbourhood rank from the stars.
  D) Neither for now.
  Builder recommends **A**, then C later: it is the summer-2003 kid fantasy the brief asks for, and it lives in the
  bedroom, the briefings and the result screen, so no match changes.
  Michael: **A — A light summer story told in the bedroom**. (2026-10-12)

- **A better game, 2 of 5: more of you (builder, 2026-10-12)** You asked whether the character needs more
  customisation. The mirror has height, build, hair and its colour, skin, eyes, shirt and its front, pants and glasses
  (v1.107–v1.123); the Loadout kid wears the gear you bought (v1.133). Options:
  A) Looks you earn or buy: caps worn forward or backward, bucket hats, bandanas, more hair, shorts, graphic tees, a
     hoodie, shoes; some bought at the shop's new Clothes tab, some won (the cap from the twins' street once you beat
     them), all chosen at the mirror.
  B) Your crew: a crew name and colours your allies wear too (a matching tee), shown on the briefing and the result.
  C) A then B.
  D) Enough as it is.
  Builder recommends **C**: A gives the money you win a second use beyond guns, and B is small once A's clothes exist.
  Michael: **C — A then B (looks you earn or buy, then your crew)**. (2026-10-12)

- **A better game, 3 of 5: custom games (builder, 2026-10-12)** You asked whether players should make their own
  games. Every match now is one written into the game. Options:
  A) A Pickup Game board in the bedroom: choose any zone you have opened, the mode (team, 1v1, free-for-all, VIP,
     capture the flag, defend, infection), day or night, how many a side and which kids, lives, a clock; it pays a
     little, so it is for fun, not farming.
  B) A, and a Match of the Day: one set-up a day, the same for everyone who plays that day, with its own small prize.
  C) Not now.
  Builder recommends **A**: it reuses every system the matches already have, gives a player who has finished the
  ladder something to do, and it is the screen an online host would pick a match from later (question 4).
  Michael: **A — A Pickup Game board in the bedroom**. (2026-10-12)

- **A better game, 4 of 5: online play now? (builder, 2026-10-12)** You asked whether to focus on online play and
  hosted rooms (backlog D.2, a Fable item). Your C of 30 Sep held it until the v2 zones were done; they are (Northcliff,
  Hollins Ridge High, Willow Bend, Inside Riverside Market, Bellfield Court). A browser game with no server of ours
  needs peers to connect directly (WebRTC), with a small free signalling service to find each other. Options:
  A) Start it now as a Fable card, in steps: first two friends in one match by a room code (a 1v1 on Winnmark), then
     teams, then a list of open rooms.
  B) After the Pickup Game board (question 3, A), so the host sets up the match from that board.
  C) Keep holding it.
  Builder recommends **B**: the board is the host's screen, so building it first saves building a second one; online
  is also the biggest change the game has had, so it is best started from a settled single-player game.
  Michael: **B — After the Pickup Game board**. (2026-10-12)

- **A better game, 5 of 5: which screen first? (builder, 2026-10-12)** You asked whether any interfaces need an
  upgrade. The map screen (v1.146–v1.148), the shop's tabs (v1.128) and the Loadout kid (v1.132–v1.133) are recent.
  What there is not: any settings at all (mouse sensitivity, volume, field of view, keys are fixed), and a result
  screen that says only who won and the pay. Options:
  A) A settings screen from the title and the bedroom: mouse sensitivity, aim sensitivity, music and effects volume,
     field of view, invert look; saved.
  B) A better result screen: your tags, shots, hits, time and the match's best moment, and what you can now buy or
     open.
  C) A then B.
  D) The bedroom first: a corkboard by the bed with your progress, the next match, and your money.
  Builder recommends **C**: settings are the first thing a new itch.io player looks for and the game has none, and
  the result screen is where every match ends.
  Michael: **C — A then B (a settings screen, then a better result screen)**. (2026-10-12)

- **Flags on Bellfield never ends (critic, 2026-10-12)** It is first to two, with no clock and everyone coming back.
  In 8 headless rounds of 150–240 s, none ended. There was one capture in 1,530 s, by Mason. A player who sprints for
  their flag reaches it about once every 3 minutes and is tagged within 1 s of grabbing it, because two of their three
  kids wait by the fort beside it. A player who fights down the street is tagged every 7 s and never gets there. A
  round that can't end only pays out if you quit. Options:
  A) A clock: 5 minutes, most flags wins, and a tie is a draw paid like a loss.
  B) Thin their defence: only one kid stays within 15 m of their flag, and the other two push, as Andrew and Evan do.
  C) Both A and B.
  D) Leave it until you've played it.
  Critic recommends **C**. The clock guarantees an end even if the balance is off, and B gives a player a real chance
  at the flag. My bot is a poor flag runner, so a human may do better than these numbers.
  Michael: **C) Both A and B** (2026-10-12; on the control room). Built in v1.191.

- **After the school's own kids (v1.190): what next? (builder, 2026-10-12)** Your B is built: Hollins Ridge High
  has its own six kids (Jordan, Caleb, Nathan, Sophie, Grant and Malik) in all four of its matches, in place of the
  kids it borrowed from Wayt Road, Bunratty and Winnmark. The backlog is empty again apart from items waiting on your
  look and the Fable cards. Options:
  A) Capture the flag on a second map (the school's practice field, end zone to end zone, would suit it).
  B) A new zone from another real place nearby (made-up name, as the others): say which in a note, e.g. a river park
     with a boat ramp on the Chattahoochee.
  C) Riverside Market gets kids of its own: the lot and the store borrow Marcus, Jamie, Tyler, Owen and Devon (Tyler
     stays, his dad is the night manager).
  D) Something else (say what in a note).
  Builder recommends **B**: it needs nothing from a playtest, while A is best built after you have played Flags on
  Bellfield and said whether it wants a clock or a second enemy runner.
  Michael: **D) Something else** (2026-10-12; on the control room): "I want work to go into imagining how this game
  can be more fun and elaborate. This progression is fun, but is there a need for a campaign / simple storyline? Do we
  need more character customization? Should we focus on online play & hosting server rooms? Should we allow for custom
  games? Do we need to upgrade any interfaces? Let’s imagine a better version of the game and build a healthy
  backlog." The builder's answer is the five questions under Pending ("A better game", 1–5), one per thing he asked.

- **After capture the flag (v1.189): what next? (builder, 2026-10-11)** Your A is built: Flags on Bellfield, a day
  3v3 capture the flag on Bellfield Court (blue flag by the entry, red at the top of the bulb, first to two, everyone
  comes back), after Lamplight on Bellfield in Northcliff. The backlog is empty again apart from items waiting on your
  look and the Fable cards. Options:
  A) Capture the flag on a second map (the school's practice field, end zone to end zone, would suit it).
  B) Hollins Ridge High gets kids of its own: a school roster (new names, faces and clothes) in place of the kids it
     borrows from other streets.
  C) A new zone from another real place nearby (made-up name, as the others): say which in a note, e.g. a river park
     with a boat ramp on the Chattahoochee.
  D) Something else (say what in a note).
  Builder recommends **B**: it needs nothing from a playtest, where A is best built after you have played Flags on
  Bellfield and said whether its balance (a clock, a second enemy runner) is right.
  Michael: **B) Hollins Ridge High gets kids of its own** (2026-10-12; on the control room)

- **After Bellfield's four (v1.188): what next? (builder, 2026-10-11)** Your C is built: Hold the Bulb Fort (a 90 s
  defend in the kid fort, v1.187) and Lamplight on Bellfield (a night 4v4 on the street, v1.188), so Bellfield Court
  has four matches. The backlog is empty again apart from items waiting on your look and the Fable cards. Options:
  A) Capture the flag, the second new match type D.15 asked for: one flag a side at each base, carry theirs home to
     score, first to two; built on one existing map first (Bellfield Court's two ends would suit it).
  B) Hollins Ridge High gets kids of its own: a school roster (new names, faces and clothes) in place of the kids it
     borrows from other streets.
  C) A new zone from another real place nearby (made-up name, as the others): say which in a note, e.g. a river park
     with a boat ramp on the Chattahoochee.
  D) Something else (say what in a note).
  Builder recommends **A**: still the one D.15 asked for, and it adds a new way to play every map.
  Michael: **A) Capture the flag, a second new match type** (2026-10-11; on the control room)

- **After Bellfield Court (v1.186): what next? (builder, 2026-10-11)** Your C on the last question is built: Bellfield
  Court has its own cul-de-sac with Mason's Court (1v1) and Bellfield Bulb (3v3), after the treehouse in Northcliff's
  chain. The backlog is empty again apart from items waiting on your look and the Fable cards. Options:
  A) Capture the flag, the second new match type D.15 asked for: one flag a side at each base, carry theirs home to
     score, first to two; built on one existing map first (Bellfield Court's two ends would suit it).
  B) Hollins Ridge High gets kids of its own: a school roster (new names, faces and clothes) in place of the kids it
     borrows from other streets.
  C) More Bellfield Court: a defend at the bulb's fort and a night match, so the street has four like the other maps.
  D) Something else (say what in a note).
  Builder recommends **A**: it is still the one D.15 asked for, and it adds a new way to play every map.
  Michael: **C) More Bellfield Court matches** (2026-10-11; on the control room; built as v1.187–v1.188)

- **Builder queue empty after v1.185: what next? (builder, 2026-10-10)** Every backlog item is done, waiting on your
  look, or a Fable card (online play, voices). Nothing is buildable until you pick. Options, each from an open note
  in the backlog:
  A) A second new match type: capture the flag (D.15 asked for 1–2 new types; VIP, v1.170, is the only one so far).
     One flag a side at each base, carry theirs home to score, first to two; built on one existing map first.
  B) Hollins Ridge High gets kids of its own: a school roster (new names, faces and clothes) in place of the kids it
     borrows from other streets.
  C) Bellfield Court, named in Northcliff's Bellfield After Dark but without a map of its own (Stoneglen Close got the
     treehouse yard, v1.138), gets one: a small cul-de-sac map with a 1v1 and a 3v3.
  D) Something else (say what in a note).
  Builder recommends **A**: it is the second match type D.15 asked for, and it reuses every map built so far.
  Michael: **C) A map of its own for Bellfield Court** (2026-10-10)

- **King of the Treehouse ends about 3 s after BEGIN (critic, 2026-10-09)**
  Connor holds the treehouse platform (2.6 m up) with an MP5 and can see the whole yard. The `side_gate` start is
  24.5 m from him, in the open, and he tags the player at 2.6–3.4 s in 17 of 17 critic rounds: standing, walking at
  him, or sprinting 2.5 s any of eight ways, even under the platform. One hit each, so a first-timer is out before
  finding the ladder. It has been the same since the map came in (v1.138). The v1.101 opening hold (2.5 s, any map)
  is shorter than any run to cover here.
  A) Move the player's start out of Connor's sight (behind the shed or the house corner)
  B) Add cover between the gate and the oak (a ply stack or bins) so there is somewhere to get to in 2.5 s
  C) A perch defender's first shot waits longer (4–5 s), this map or every map
  D) Leave it: the treehouse is meant to be hard
  The critic would take A: it changes one spawn and leaves Connor as he is.
  Michael: **A) Move the player's start out of Connor's sight** (2026-10-10)

- **D.20 Kids' walk, step A shown: go on to step B? (builder, 2026-10-09)** Your C answer to D.16 asked to see each
  step before the next. v1.171 (on main since 6 Oct) planted the kids' feet: each leg hangs from the hip, the stride
  follows his real speed, one foot is always down, and the low foot's slip is a median 0.014 of his travel (was 1.00).
  The price is a quick step at a run, about 5 a second at 3 m/s. Starts, stops and turns are unchanged: kids still
  start and stop at full speed and snap to face their target every frame. In game, watch any kid walk or run in any
  match. Options:
  A) Good, go on to step B: kids ease into starts and stops over a few tenths of a second, lean into a start or a
     turn, and turn their body over about 0.2 s instead of snapping (changes how fast they react).
  B) Fix the walk first: the run's step is too quick (the stride can open up, at the cost of a wider split).
  C) Change something else about the walk first (say what in a note).
  D) Stop here: step A is enough.
  Builder recommends **A**: the snap turn is now the stiffest thing left, and the walk tests hold the feet planted
  while B is built.
  Michael: **A) Good, go on to step B**. (2026-10-09)

- **D.19 A cautious ally can sit the whole round out. Fix Night Swim only, or every match? (builder, 2026-10-08)**
  In Night Swim (`club_night_4v4`), ally Brooke walked 0 m in 300 s in 2 of the critic's 3 rounds (7 Oct). It is the
  same thing v1.179 fixed in Friday Night Lights and v1.172 saw in Price Check: in team matches your allies start
  beside you (v1.33), and a cautious skirmisher (aggression under 0.45) never marches, so with no enemy in sight she
  hides and peeks all round. The last-kid march (v1.152) skips allies, snipers and defenders. It doesn't decide rounds
  (your other allies fight), but you are a kid short and she looks broken.
  A) Night Swim only: its allies walk out to their posts at the start, as Friday Night Lights' do since v1.179
  B) Every team match: allies walk out to their posts at the start; none starts beside you any more
  C) Any ally who neither moves 2 m nor fires with a line for 25–30 s goes looking, in every match, as the last kid
     does today; starts are unchanged
  D) Leave it: a cautious kid holding back is in character
  Builder recommends C: it fixes Night Swim and Price Check and any spot not yet seen, without moving any start, and
  a kid who is fighting never triggers it. A is the smallest change if you'd rather not touch the other matches.
  Michael: **C) An idle ally goes looking after 25–30 s, in every match**. (2026-10-09)

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

