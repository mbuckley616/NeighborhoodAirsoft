# Voice script

Every line the game can speak, by kid, for recording with VoiceStudio (backlog D.9, Michael: A, 21 Oct 2026).
**Generated** by `node scripts/voicescript.mjs` from the game’s own line tables: do not edit it by hand; change the
lines in `js/` and run the script again. `tests/voice-clips.test.mjs` fails when this file and the game disagree.

1034 lines: 818 are one kid’s own (his section below), 216 are shared lines that any kid of a kind may say (the
last section).

## How a clip is named

A clip is one kid’s reading of one line, saved as `<clip name>.ogg` (or `.mp3`, `.wav`):
- **His own line:** the clip name is the line’s id, as listed: `seth.taunt.3.ogg`.
- **A shared line:** his id, a dot, then the line’s id: Seth saying `teammate.4` is `seth.teammate.4.ogg`. Each
  kid’s section says which shared tables he draws from.
- **A line with {name}** (a friend’s name goes in when it is said): add `@` and the friend’s name in lower case,
  `seth.band.mid_agg.allyDown.1@sean.ogg`. These are many recordings for one line; leave them to the browser voice.

A line with no clip is spoken by the browser voice, as now, so a pack can be recorded a kid at a time.
`node scripts/voicepack.mjs <folder>` checks a folder of clips against this file and puts them in the game.

**Recording order:** each kid’s own lines first. A kid says one of his own lines 7 times in 10 (an excuse 1 in 2),
so his own lines are most of what you hear from him.

## The kids

### Seth (`seth`)

**Voice:** About 12. The ringleader who hosts the games: friendly trash talk, easy laugh, owns his yard. Tall, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `seth.playerHit.1` | Oh that's gotta sting! | pleased, quick: he just tagged someone |
| `seth.playerHit.2` | Hit! Eat that! | pleased, quick: he just tagged someone |
| `seth.playerHit.3` | Right in the chest! | pleased, quick: he just tagged someone |
| `seth.playerHit.4` | Welcome to my yard! | pleased, quick: he just tagged someone |
| `seth.playerHit.5` | Yes! Did you see that? | pleased, quick: he just tagged someone |
| `seth.npcHit.1` | Augh, okay you got me! | caught: owning it, or groaning |
| `seth.npcHit.2` | Ow, fine, FINE! | caught: owning it, or groaning |
| `seth.npcHit.3` | Nice shot! | caught: owning it, or groaning |
| `seth.npcHit.4` | Okay, okay, I'm out! | caught: owning it, or groaning |
| `seth.npcHit.5` | Dude, my own yard! | caught: owning it, or groaning |
| `seth.excuse.1` | Hold up, my goggles fogged! | whining, defensive: why that tag did not count |
| `seth.excuse.2` | My mom was calling me, dude! | whining, defensive: why that tag did not count |
| `seth.excuse.3` | That one bounced off the shed! | whining, defensive: why that tag did not count |
| `seth.excuse.4` | I tripped in my own yard! | whining, defensive: why that tag did not count |
| `seth.playerSpotted.1` | Yo, there he is! | urgent, calling it out |
| `seth.playerSpotted.2` | Got eyes on him! | urgent, calling it out |
| `seth.playerSpotted.3` | Behind the box, get him! | urgent, calling it out |
| `seth.playerSpotted.4` | Yo, he's by the fence! | urgent, calling it out |
| `seth.playerSpotted.5` | Found him, found him! | urgent, calling it out |
| `seth.taunt.1` | Where you hiding, man? | teasing, across the yard |
| `seth.taunt.2` | Come on out, I'm bored! | teasing, across the yard |
| `seth.taunt.3` | I see you back there! | teasing, across the yard |
| `seth.taunt.4` | My yard, my rules! | teasing, across the yard |
| `seth.taunt.5` | You're not even close, dude. | teasing, across the yard |
| `seth.looking.1` | My yard. I'll go find 'em. | telling his side he is heading out to find them |
| `seth.looking.2` | They're hiding from me. Going in! | telling his side he is heading out to find them |

### Trey (`trey`)

**Voice:** About 12. Cocky, laughs when you walk into it; short clipped lines, a smirk in the voice. Average height, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `trey.playerHit.1` | Got 'em! Easy. | pleased, quick: he just tagged someone |
| `trey.playerHit.2` | Walked right into that one. | pleased, quick: he just tagged someone |
| `trey.playerHit.3` | Boom, headshot. | pleased, quick: he just tagged someone |
| `trey.playerHit.4` | Too easy, dude. | pleased, quick: he just tagged someone |
| `trey.playerHit.5` | Ha! Called it. | pleased, quick: he just tagged someone |
| `trey.npcHit.1` | Dude! Ugh. | caught: owning it, or groaning |
| `trey.npcHit.2` | Aw come ON. | caught: owning it, or groaning |
| `trey.npcHit.3` | That was lucky! | caught: owning it, or groaning |
| `trey.npcHit.4` | Whatever, that barely counted. | caught: owning it, or groaning |
| `trey.npcHit.5` | Fine. FINE. I'm hit. | caught: owning it, or groaning |
| `trey.excuse.1` | I let you have that one. | whining, defensive: why that tag did not count |
| `trey.excuse.2` | Pfft. I was going easy on you. | whining, defensive: why that tag did not count |
| `trey.excuse.3` | My hopper jammed. Totally jammed. | whining, defensive: why that tag did not count |
| `trey.excuse.4` | You'd never get that twice. | whining, defensive: why that tag did not count |
| `trey.playerSpotted.1` | Found you! | urgent, calling it out |
| `trey.playerSpotted.2` | Hey, target! | urgent, calling it out |
| `trey.playerSpotted.3` | On him on him! | urgent, calling it out |
| `trey.playerSpotted.4` | Peekaboo, dude! | urgent, calling it out |
| `trey.playerSpotted.5` | Yep, I see you. | urgent, calling it out |
| `trey.taunt.1` | You're so dead, dude. | teasing, across the yard |
| `trey.taunt.2` | Pop out, I dare you. | teasing, across the yard |
| `trey.taunt.3` | Where'd you go? | teasing, across the yard |
| `trey.taunt.4` | Scared? You should be. | teasing, across the yard |
| `trey.taunt.5` | I could do this all day. | teasing, across the yard |
| `trey.looking.1` | Boring! I'm going to get 'em. | telling his side he is heading out to find them |
| `trey.looking.2` | Watch this, I'm going in. | telling his side he is heading out to find them |

### Brooke (`brooke`)

**Voice:** About 12, small. The best shot on the court: dry, a smirk, sorry not sorry. Short, skinny build; a quiet talker.
**Shared tables:** `band.low_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `brooke.playerHit.1` | Got him! Did you see that? | pleased, quick: he just tagged someone |
| `brooke.playerHit.2` | Sorry not sorry! | pleased, quick: he just tagged someone |
| `brooke.playerHit.3` | Right on target! | pleased, quick: he just tagged someone |
| `brooke.playerHit.4` | Told you I'd get you first. | pleased, quick: he just tagged someone |
| `brooke.playerHit.5` | That's what you get! | pleased, quick: he just tagged someone |
| `brooke.npcHit.1` | Oof, okay! | caught: owning it, or groaning |
| `brooke.npcHit.2` | Got me, fair! | caught: owning it, or groaning |
| `brooke.npcHit.3` | Ahh, dang it! | caught: owning it, or groaning |
| `brooke.npcHit.4` | Whatever. Reset. | caught: owning it, or groaning |
| `brooke.npcHit.5` | Okay, that one counts. | caught: owning it, or groaning |
| `brooke.excuse.1` | My scope got bumped, I swear! | whining, defensive: why that tag did not count |
| `brooke.excuse.2` | Ugh, my hair was in my eyes! | whining, defensive: why that tag did not count |
| `brooke.excuse.3` | That's the only one you get. | whining, defensive: why that tag did not count |
| `brooke.excuse.4` | My battery's dying, that's why. | whining, defensive: why that tag did not count |
| `brooke.playerSpotted.1` | I see him! | urgent, calling it out |
| `brooke.playerSpotted.2` | Over here, over here! | urgent, calling it out |
| `brooke.playerSpotted.3` | Got him in my sights! | urgent, calling it out |
| `brooke.playerSpotted.4` | Don't move. Too late. | urgent, calling it out |
| `brooke.playerSpotted.5` | There you are! | urgent, calling it out |
| `brooke.taunt.1` | Hellooo? | teasing, across the yard |
| `brooke.taunt.2` | You can't hide forever! | teasing, across the yard |
| `brooke.taunt.3` | I can hear you breathing! | teasing, across the yard |
| `brooke.taunt.4` | Come on, I'm bored! | teasing, across the yard |
| `brooke.taunt.5` | You're gonna miss anyway. | teasing, across the yard |
| `brooke.looking.1` | Fine, I'll go find them myself. | telling his side he is heading out to find them |
| `brooke.looking.2` | Moving up. Try to keep up. | telling his side he is heading out to find them |

### Jamie (`jamie`)

**Voice:** About 12. The new kid on the block: steady, polite, a bit unsure, never talks trash. Average height, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `jamie.playerHit.1` | Got you. Good game. | pleased, quick: he just tagged someone |
| `jamie.playerHit.2` | Nice try, though. | pleased, quick: he just tagged someone |
| `jamie.playerHit.3` | That one landed. | pleased, quick: he just tagged someone |
| `jamie.playerHit.4` | Okay, tagged. | pleased, quick: he just tagged someone |
| `jamie.npcHit.1` | Nice. Good shot. | caught: owning it, or groaning |
| `jamie.npcHit.2` | Yep, that's a hit. | caught: owning it, or groaning |
| `jamie.npcHit.3` | Okay, I'm out. | caught: owning it, or groaning |
| `jamie.npcHit.4` | Fair. Nice one. | caught: owning it, or groaning |
| `jamie.excuse.1` | Oh. My goggles fogged up, I think. | whining, defensive: why that tag did not count |
| `jamie.excuse.2` | I'm still learning these yards. | whining, defensive: why that tag did not count |
| `jamie.excuse.3` | I think my mag was empty. | whining, defensive: why that tag did not count |
| `jamie.excuse.4` | Sorry, I didn't know that was open. | whining, defensive: why that tag did not count |
| `jamie.playerSpotted.1` | I see him. | urgent, calling it out |
| `jamie.playerSpotted.2` | Okay, there he is. | urgent, calling it out |
| `jamie.playerSpotted.3` | Got him, by the fence. | urgent, calling it out |
| `jamie.playerSpotted.4` | He's moving. Watch left. | urgent, calling it out |
| `jamie.taunt.1` | Still here. | teasing, across the yard |
| `jamie.taunt.2` | Take your time, I'm fine. | teasing, across the yard |
| `jamie.taunt.3` | You can come out, you know. | teasing, across the yard |
| `jamie.taunt.4` | Nothing personal. | teasing, across the yard |
| `jamie.looking.1` | I'll go have a look, okay? | telling his side he is heading out to find them |
| `jamie.looking.2` | Moving up. I'll be careful. | telling his side he is heading out to find them |

### Marcus (`marcus`)

**Voice:** About 13, big and loud. Seth’s cousin visiting for the summer: pushy, doesn’t know the yards. Tall, heavy build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `marcus.playerHit.1` | Tagged! | pleased, quick: he just tagged someone |
| `marcus.playerHit.2` | Bam, got him. | pleased, quick: he just tagged someone |
| `marcus.playerHit.3` | That's how it's done! | pleased, quick: he just tagged someone |
| `marcus.playerHit.4` | SETH! Did you see that? | pleased, quick: he just tagged someone |
| `marcus.playerHit.5` | Lights out, dude! | pleased, quick: he just tagged someone |
| `marcus.npcHit.1` | Augh, lucky! | caught: owning it, or groaning |
| `marcus.npcHit.2` | Ugh, FINE. | caught: owning it, or groaning |
| `marcus.npcHit.3` | Yeah, yeah, okay. | caught: owning it, or groaning |
| `marcus.npcHit.4` | COME ON. That barely hit me! | caught: owning it, or groaning |
| `marcus.npcHit.5` | Whatever, man! | caught: owning it, or groaning |
| `marcus.excuse.1` | I don't even know these yards! | whining, defensive: why that tag did not count |
| `marcus.excuse.2` | Y'all have home field, that's why! | whining, defensive: why that tag did not count |
| `marcus.excuse.3` | Back home I'd have smoked you. | whining, defensive: why that tag did not count |
| `marcus.excuse.4` | That fence came outta nowhere! | whining, defensive: why that tag did not count |
| `marcus.playerSpotted.1` | He's RIGHT there, guys! | urgent, calling it out |
| `marcus.playerSpotted.2` | Get him, get him! | urgent, calling it out |
| `marcus.playerSpotted.3` | Right side! | urgent, calling it out |
| `marcus.playerSpotted.4` | Wait, which yard is this? | urgent, calling it out |
| `marcus.playerSpotted.5` | Found him! Go go go! | urgent, calling it out |
| `marcus.taunt.1` | Stop running, dude! | teasing, across the yard |
| `marcus.taunt.2` | Come fight me, dude! | teasing, across the yard |
| `marcus.taunt.3` | You're scared! | teasing, across the yard |
| `marcus.taunt.4` | I'm coming through the yard! | teasing, across the yard |
| `marcus.taunt.5` | Y'all have too many fences! | teasing, across the yard |
| `marcus.looking.1` | Where they at? I'm going! | telling his side he is heading out to find them |
| `marcus.looking.2` | Y'all wait here, I'm pushing! | telling his side he is heading out to find them |

### Devon (`devon`)

**Voice:** About 12. The careful one who plays sniper: patient, quiet, precise words. Tall, skinny build; a quiet talker.
**Shared tables:** `band.low_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `devon.playerHit.1` | Long shot, baby! | pleased, quick: he just tagged someone |
| `devon.playerHit.2` | Saw you coming a mile off. | pleased, quick: he just tagged someone |
| `devon.playerHit.3` | Patience pays. | pleased, quick: he just tagged someone |
| `devon.playerHit.4` | You stood still too long. | pleased, quick: he just tagged someone |
| `devon.playerHit.5` | Mm. Well played, but no. | pleased, quick: he just tagged someone |
| `devon.npcHit.1` | Tch. Nice one. | caught: owning it, or groaning |
| `devon.npcHit.2` | Got me clean. | caught: owning it, or groaning |
| `devon.npcHit.3` | Yeah, okay, point taken. | caught: owning it, or groaning |
| `devon.npcHit.4` | Well played. | caught: owning it, or groaning |
| `devon.npcHit.5` | Didn't see that angle. | caught: owning it, or groaning |
| `devon.excuse.1` | Wind took my shot. Lucky you. | whining, defensive: why that tag did not count |
| `devon.excuse.2` | My scope's off a click. | whining, defensive: why that tag did not count |
| `devon.excuse.3` | I was mid-reload. Doesn't count. | whining, defensive: why that tag did not count |
| `devon.excuse.4` | Sun's right on my glass. | whining, defensive: why that tag did not count |
| `devon.playerSpotted.1` | I've got him. | urgent, calling it out |
| `devon.playerSpotted.2` | Don't move, target. | urgent, calling it out |
| `devon.playerSpotted.3` | He's in my scope. | urgent, calling it out |
| `devon.playerSpotted.4` | Hold still for me. | urgent, calling it out |
| `devon.playerSpotted.5` | There. Got him lined up. | urgent, calling it out |
| `devon.taunt.1` | Take your time. I'm comfortable. | teasing, across the yard |
| `devon.taunt.2` | I'll wait. | teasing, across the yard |
| `devon.taunt.3` | I see everything. | teasing, across the yard |
| `devon.taunt.4` | Every peek is a mistake. | teasing, across the yard |
| `devon.taunt.5` | Go ahead, run for it. | teasing, across the yard |
| `devon.looking.1` | No shot from here. Repositioning. | telling his side he is heading out to find them |
| `devon.looking.2` | Moving up for a better angle. | telling his side he is heading out to find them |

### Tyler (`tyler`)

**Voice:** About 13, tall. Laid back, slow drawl, “aight”. Tall, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `tyler.playerHit.1` | Aight, got him. | pleased, quick: he just tagged someone |
| `tyler.playerHit.2` | Yep. Tagged. | pleased, quick: he just tagged someone |
| `tyler.playerHit.3` | Nice and easy. | pleased, quick: he just tagged someone |
| `tyler.playerHit.4` | Better luck next time. | pleased, quick: he just tagged someone |
| `tyler.playerHit.5` | That's a hit, man. | pleased, quick: he just tagged someone |
| `tyler.npcHit.1` | Aight, that was a good one. | caught: owning it, or groaning |
| `tyler.npcHit.2` | Okay, I'm hit. | caught: owning it, or groaning |
| `tyler.npcHit.3` | Cool. You got me. | caught: owning it, or groaning |
| `tyler.npcHit.4` | Yeah, I felt that. | caught: owning it, or groaning |
| `tyler.excuse.1` | Aight, my shoe came untied. | whining, defensive: why that tag did not count |
| `tyler.excuse.2` | Man, I was getting a drink. | whining, defensive: why that tag did not count |
| `tyler.excuse.3` | I wasn't even playing yet, man. | whining, defensive: why that tag did not count |
| `tyler.excuse.4` | A bug flew in my goggles. | whining, defensive: why that tag did not count |
| `tyler.playerSpotted.1` | Yeah, I see him. | urgent, calling it out |
| `tyler.playerSpotted.2` | Over there, by the car. | urgent, calling it out |
| `tyler.playerSpotted.3` | Got him. Chill. | urgent, calling it out |
| `tyler.playerSpotted.4` | Hey, there he goes. | urgent, calling it out |
| `tyler.taunt.1` | Take it easy out there. | teasing, across the yard |
| `tyler.taunt.2` | No rush, man. | teasing, across the yard |
| `tyler.taunt.3` | Still hiding? Aight. | teasing, across the yard |
| `tyler.taunt.4` | Come on, let's go already. | teasing, across the yard |
| `tyler.looking.1` | Aight, I'm gonna go look. | telling his side he is heading out to find them |
| `tyler.looking.2` | Aight, heading up. | telling his side he is heading out to find them |

### Garrett (`garrett`)

**Voice:** About 12. Seth’s crew: calm, sure of himself, a little bored by how easy it is. Tall, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `garrett.playerHit.1` | Got him. Easy. | pleased, quick: he just tagged someone |
| `garrett.playerHit.2` | That's one for Seth. | pleased, quick: he just tagged someone |
| `garrett.playerHit.3` | Right where I aimed. | pleased, quick: he just tagged someone |
| `garrett.playerHit.4` | Yep. Saw that coming. | pleased, quick: he just tagged someone |
| `garrett.playerHit.5` | Tagged. Next. | pleased, quick: he just tagged someone |
| `garrett.npcHit.1` | Huh. Okay. Good shot. | caught: owning it, or groaning |
| `garrett.npcHit.2` | Fine. That one's yours. | caught: owning it, or groaning |
| `garrett.npcHit.3` | Didn't see you there. | caught: owning it, or groaning |
| `garrett.npcHit.4` | Alright. I'm out. | caught: owning it, or groaning |
| `garrett.excuse.1` | Seth's the one who left that gap. | whining, defensive: why that tag did not count |
| `garrett.excuse.2` | I was covering Seth, not me. | whining, defensive: why that tag did not count |
| `garrett.excuse.3` | That won't happen twice. | whining, defensive: why that tag did not count |
| `garrett.excuse.4` | My gun shoots left. Always has. | whining, defensive: why that tag did not count |
| `garrett.playerSpotted.1` | There. By the fence. | urgent, calling it out |
| `garrett.playerSpotted.2` | Got him. Seth, left side. | urgent, calling it out |
| `garrett.playerSpotted.3` | See him. Moving up. | urgent, calling it out |
| `garrett.playerSpotted.4` | He's right there, guys. | urgent, calling it out |
| `garrett.taunt.1` | Seth said you were good. | teasing, across the yard |
| `garrett.taunt.2` | Is that all you got? | teasing, across the yard |
| `garrett.taunt.3` | Take your time, man. | teasing, across the yard |
| `garrett.taunt.4` | We've done this before. | teasing, across the yard |
| `garrett.looking.1` | This is too easy. I'll go get 'em. | telling his side he is heading out to find them |
| `garrett.looking.2` | Moving up. Don't wait for me. | telling his side he is heading out to find them |

### Sean (`sean`)

**Voice:** About 12. The AK, spray and pray: loud, excitable, shouts a lot. Average height, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`.

| Id | Line | Tone |
|---|---|---|
| `sean.playerHit.1` | Got him! Sprayed him good. | pleased, quick: he just tagged someone |
| `sean.playerHit.2` | Bullet hose, baby! | pleased, quick: he just tagged someone |
| `sean.playerHit.3` | AK go BRRRRT! | pleased, quick: he just tagged someone |
| `sean.playerHit.4` | Caught him in the open! | pleased, quick: he just tagged someone |
| `sean.playerHit.5` | Can't dodge all of them! | pleased, quick: he just tagged someone |
| `sean.npcHit.1` | Ow! Cheap shot! | caught: owning it, or groaning |
| `sean.npcHit.2` | Augh, fine! | caught: owning it, or groaning |
| `sean.npcHit.3` | Lucky, dude. | caught: owning it, or groaning |
| `sean.npcHit.4` | Hey, no fair! | caught: owning it, or groaning |
| `sean.npcHit.5` | Okay okay, I'm hit! | caught: owning it, or groaning |
| `sean.excuse.1` | My AK jammed, dude! JAMMED! | whining, defensive: why that tag did not count |
| `sean.excuse.2` | I was reloading! No fair! | whining, defensive: why that tag did not count |
| `sean.excuse.3` | I had you first, I swear! | whining, defensive: why that tag did not count |
| `sean.excuse.4` | My batteries are dead, man! | whining, defensive: why that tag did not count |
| `sean.playerSpotted.1` | There he is! Light him up! | urgent, calling it out |
| `sean.playerSpotted.2` | Spray and pray! | urgent, calling it out |
| `sean.playerSpotted.3` | Eyes on, full auto! | urgent, calling it out |
| `sean.playerSpotted.4` | Brother get over here! | urgent, calling it out |
| `sean.playerSpotted.5` | Target! Dump the mag! | urgent, calling it out |
| `sean.taunt.1` | Come on, peek out! | teasing, across the yard |
| `sean.taunt.2` | I got plenty of BBs! | teasing, across the yard |
| `sean.taunt.3` | Sit still for me! | teasing, across the yard |
| `sean.taunt.4` | You can't outrun the AK! | teasing, across the yard |
| `sean.taunt.5` | Still got half a mag! | teasing, across the yard |
| `sean.home.1` | I’ve been working on my aim. Don’t laugh. | relaxed, hanging out in Mike’s room |
| `sean.home.2` | The AK’s loud, but nobody argues with it. | relaxed, hanging out in Mike’s room |
| `sean.home.3` | Is there any more of that pizza? | relaxed, hanging out in Mike’s room |
| `sean.looking.1` | Where IS everybody?! I'm going! | telling his side he is heading out to find them |
| `sean.looking.2` | I'm going in, cover me! | telling his side he is heading out to find them |

### Nick (`nick`)

**Voice:** About 13, big. Calm and low, “keep moving”. Tall, heavy build; a quiet talker.
**Shared tables:** `band.low_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`.

| Id | Line | Tone |
|---|---|---|
| `nick.playerHit.1` | Got him. Told you to keep moving. | pleased, quick: he just tagged someone |
| `nick.playerHit.2` | Stationary target, easy. | pleased, quick: he just tagged someone |
| `nick.playerHit.3` | Patience pays, dude. | pleased, quick: he just tagged someone |
| `nick.playerHit.4` | Yep. You stopped. | pleased, quick: he just tagged someone |
| `nick.playerHit.5` | That's what standing still gets you. | pleased, quick: he just tagged someone |
| `nick.npcHit.1` | Augh. Good shot. | caught: owning it, or groaning |
| `nick.npcHit.2` | Yeah, alright. | caught: owning it, or groaning |
| `nick.npcHit.3` | Hmph. Nice. | caught: owning it, or groaning |
| `nick.npcHit.4` | Okay. That's me done. | caught: owning it, or groaning |
| `nick.npcHit.5` | Fair enough, man. | caught: owning it, or groaning |
| `nick.excuse.1` | Hm. Hard to hide this big. | whining, defensive: why that tag did not count |
| `nick.excuse.2` | My mask was crooked. | whining, defensive: why that tag did not count |
| `nick.excuse.3` | I was watching out for Ryan. | whining, defensive: why that tag did not count |
| `nick.excuse.4` | Too big for that bush, I guess. | whining, defensive: why that tag did not count |
| `nick.playerSpotted.1` | I see him. | urgent, calling it out |
| `nick.playerSpotted.2` | Got him. | urgent, calling it out |
| `nick.playerSpotted.3` | Standing right there. | urgent, calling it out |
| `nick.playerSpotted.4` | There. By the bins. | urgent, calling it out |
| `nick.playerSpotted.5` | He's out in the open. | urgent, calling it out |
| `nick.taunt.1` | Not going anywhere, dude. | teasing, across the yard |
| `nick.taunt.2` | Come to me. | teasing, across the yard |
| `nick.taunt.3` | You're gonna run out of cover, dude. | teasing, across the yard |
| `nick.taunt.4` | Keep moving, man. | teasing, across the yard |
| `nick.taunt.5` | I've got all afternoon. | teasing, across the yard |
| `nick.home.1` | You gotta keep moving, dude. That’s the whole secret. | relaxed, hanging out in Mike’s room |
| `nick.home.2` | I’d sit in a bush all day with the AR if you let me. | relaxed, hanging out in Mike’s room |
| `nick.home.3` | This futon is way comfier than it looks. | relaxed, hanging out in Mike’s room |
| `nick.looking.1` | Nothing here. Keep moving. | telling his side he is heading out to find them |
| `nick.looking.2` | I'll go take a look. Keep moving. | telling his side he is heading out to find them |

### Ryan (`ryan`)

**Voice:** About 11. The quick flanker, Mitchell’s brother: hyped, fast talker. Tall, skinny build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `ryan.playerHit.1` | HA! Flushed him out! | pleased, quick: he just tagged someone |
| `ryan.playerHit.2` | Told you I'd get him! | pleased, quick: he just tagged someone |
| `ryan.playerHit.3` | Mitchell did you see that?! | pleased, quick: he just tagged someone |
| `ryan.playerHit.4` | Right between the eyes! | pleased, quick: he just tagged someone |
| `ryan.playerHit.5` | Got him! Got him! | pleased, quick: he just tagged someone |
| `ryan.npcHit.1` | Hah! Okay, okay, that's one! | caught: owning it, or groaning |
| `ryan.npcHit.2` | Lucky! Lucky! | caught: owning it, or groaning |
| `ryan.npcHit.3` | Aw what! Come on! | caught: owning it, or groaning |
| `ryan.npcHit.4` | Fair, fair. | caught: owning it, or groaning |
| `ryan.npcHit.5` | Mitchell, he got me! | caught: owning it, or groaning |
| `ryan.excuse.1` | Mitchell didn't cover me! | whining, defensive: why that tag did not count |
| `ryan.excuse.2` | I tripped on a sprinkler! | whining, defensive: why that tag did not count |
| `ryan.excuse.3` | Hold up, my sling broke! | whining, defensive: why that tag did not count |
| `ryan.excuse.4` | Mitchell called the wrong side! | whining, defensive: why that tag did not count |
| `ryan.playerSpotted.1` | Mitchell I got him! | urgent, calling it out |
| `ryan.playerSpotted.2` | Pushing him, pushing him! | urgent, calling it out |
| `ryan.playerSpotted.3` | Right side, right side! | urgent, calling it out |
| `ryan.playerSpotted.4` | He's mine! | urgent, calling it out |
| `ryan.playerSpotted.5` | Going around! Going around! | urgent, calling it out |
| `ryan.taunt.1` | Stop hiding, scaredy! | teasing, across the yard |
| `ryan.taunt.2` | I'm coming around! | teasing, across the yard |
| `ryan.taunt.3` | Mitchell, cover me! | teasing, across the yard |
| `ryan.taunt.4` | Open up, dude! | teasing, across the yard |
| `ryan.taunt.5` | You can't watch both sides! | teasing, across the yard |
| `ryan.looking.1` | I'm flanking! Be right back! | telling his side he is heading out to find them |
| `ryan.looking.2` | Going around! I'll find 'em! | telling his side he is heading out to find them |

### Mitchell (`mitchell`)

**Voice:** About 13. The steady marksman, Ryan’s brother: calm, few words. Tall, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `mitchell.playerHit.1` | Mm. Nice shot. | pleased, quick: he just tagged someone |
| `mitchell.playerHit.2` | Got him. Clean. | pleased, quick: he just tagged someone |
| `mitchell.playerHit.3` | Patience, man. That's the whole game. | pleased, quick: he just tagged someone |
| `mitchell.playerHit.4` | Told you, Ryan. | pleased, quick: he just tagged someone |
| `mitchell.playerHit.5` | One shot. That's it. | pleased, quick: he just tagged someone |
| `mitchell.npcHit.1` | Mm. Nice shot. | caught: owning it, or groaning |
| `mitchell.npcHit.2` | Yeah, fair. | caught: owning it, or groaning |
| `mitchell.npcHit.3` | Got me. Clean. | caught: owning it, or groaning |
| `mitchell.npcHit.4` | Okay. Ryan, he's yours. | caught: owning it, or groaning |
| `mitchell.npcHit.5` | Good angle. | caught: owning it, or groaning |
| `mitchell.excuse.1` | Ryan gave away my spot. | whining, defensive: why that tag did not count |
| `mitchell.excuse.2` | My mag was dry. | whining, defensive: why that tag did not count |
| `mitchell.excuse.3` | Glare on my goggles. | whining, defensive: why that tag did not count |
| `mitchell.excuse.4` | Ryan was talking in my ear. | whining, defensive: why that tag did not count |
| `mitchell.playerSpotted.1` | I have him. | urgent, calling it out |
| `mitchell.playerSpotted.2` | He's exposed. | urgent, calling it out |
| `mitchell.playerSpotted.3` | Ryan, hold him there. | urgent, calling it out |
| `mitchell.playerSpotted.4` | Lined up. | urgent, calling it out |
| `mitchell.playerSpotted.5` | He's by the planter. | urgent, calling it out |
| `mitchell.taunt.1` | Take your time. | teasing, across the yard |
| `mitchell.taunt.2` | I can wait all day. | teasing, across the yard |
| `mitchell.taunt.3` | He'll show himself. | teasing, across the yard |
| `mitchell.taunt.4` | Ryan, stop yelling. | teasing, across the yard |
| `mitchell.taunt.5` | Still breathing out there? | teasing, across the yard |
| `mitchell.looking.1` | No targets. Moving up. | telling his side he is heading out to find them |
| `mitchell.looking.2` | I'll find a better spot. | telling his side he is heading out to find them |

### Joe (`joe`)

**Voice:** About 12. The good shot with the nice gun: quick, a little smug about his gear. Average height, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `joe.playerHit.1` | Got him. Clean. | pleased, quick: he just tagged someone |
| `joe.playerHit.2` | That's the UMP, man. | pleased, quick: he just tagged someone |
| `joe.playerHit.3` | Told you I'm quick. | pleased, quick: he just tagged someone |
| `joe.playerHit.4` | Right through the gap. | pleased, quick: he just tagged someone |
| `joe.playerHit.5` | Yep. Too easy. | pleased, quick: he just tagged someone |
| `joe.npcHit.1` | Okay. Clean. I'll take that. | caught: owning it, or groaning |
| `joe.npcHit.2` | Huh. Didn't see you. | caught: owning it, or groaning |
| `joe.npcHit.3` | Fine. Good shot. | caught: owning it, or groaning |
| `joe.npcHit.4` | Ugh. My gun's better, though. | caught: owning it, or groaning |
| `joe.npcHit.5` | Alright, I'm out. | caught: owning it, or groaning |
| `joe.excuse.1` | My gun's better. You got lucky. | whining, defensive: why that tag did not count |
| `joe.excuse.2` | My hop-up's set for long range. | whining, defensive: why that tag did not count |
| `joe.excuse.3` | That cheap gun shouldn't even count. | whining, defensive: why that tag did not count |
| `joe.excuse.4` | I'm still breaking in this gun. | whining, defensive: why that tag did not count |
| `joe.playerSpotted.1` | Got him. Moving up. | urgent, calling it out |
| `joe.playerSpotted.2` | There, by the car. | urgent, calling it out |
| `joe.playerSpotted.3` | See him. I'm quick. | urgent, calling it out |
| `joe.playerSpotted.4` | He's on the left. | urgent, calling it out |
| `joe.taunt.1` | You need a better gun. | teasing, across the yard |
| `joe.taunt.2` | I'm already moving. | teasing, across the yard |
| `joe.taunt.3` | Can't keep up, huh? | teasing, across the yard |
| `joe.taunt.4` | Still there? Okay. | teasing, across the yard |
| `joe.looking.1` | Nobody in range. Moving up. | telling his side he is heading out to find them |
| `joe.looking.2` | I'll go find 'em. Better gun anyway. | telling his side he is heading out to find them |

### Chris (`chris`)

**Voice:** About 12. The athlete: fast, loud, always charging, out of breath. Tall, average build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `chris.playerHit.1` | GOT HIM! Too slow! | pleased, quick: he just tagged someone |
| `chris.playerHit.2` | Ran right through you! | pleased, quick: he just tagged someone |
| `chris.playerHit.3` | That's what speed does! | pleased, quick: he just tagged someone |
| `chris.playerHit.4` | Ha! Couldn't catch me! | pleased, quick: he just tagged someone |
| `chris.playerHit.5` | Boom! Gone! | pleased, quick: he just tagged someone |
| `chris.npcHit.1` | Man! I was already on you! | caught: owning it, or groaning |
| `chris.npcHit.2` | No way! I was moving! | caught: owning it, or groaning |
| `chris.npcHit.3` | Aw, come ON! | caught: owning it, or groaning |
| `chris.npcHit.4` | Okay, okay! Next one! | caught: owning it, or groaning |
| `chris.npcHit.5` | That's lucky, man! | caught: owning it, or groaning |
| `chris.excuse.1` | My shoe came off, dude! | whining, defensive: why that tag did not count |
| `chris.excuse.2` | I'd have beat you, I swear! | whining, defensive: why that tag did not count |
| `chris.excuse.3` | I was tired from all that running! | whining, defensive: why that tag did not count |
| `chris.excuse.4` | That tree jumped in my way! | whining, defensive: why that tag did not count |
| `chris.playerSpotted.1` | I see him! Going! | urgent, calling it out |
| `chris.playerSpotted.2` | He's mine! I'm going in! | urgent, calling it out |
| `chris.playerSpotted.3` | Right there! Charging! | urgent, calling it out |
| `chris.playerSpotted.4` | Cover me, I'm going! | urgent, calling it out |
| `chris.taunt.1` | You can't outrun me! | teasing, across the yard |
| `chris.taunt.2` | I'm coming right at you! | teasing, across the yard |
| `chris.taunt.3` | Faster than you, man! | teasing, across the yard |
| `chris.taunt.4` | Run, man, run! | teasing, across the yard |
| `chris.looking.1` | Let's GO! I'm running up! | telling his side he is heading out to find them |
| `chris.looking.2` | Too slow! I'm going after 'em! | telling his side he is heading out to find them |

### Owen (`owen`)

**Voice:** About 13, heavy. The immovable anchor: slow, flat, unbothered; he just waits. Tall, heavy build; a quiet talker.
**Shared tables:** `band.low_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `owen.playerHit.1` | Hm. Good. You moved. | pleased, quick: he just tagged someone |
| `owen.playerHit.2` | Yep. | pleased, quick: he just tagged someone |
| `owen.playerHit.3` | Told you. I just wait. | pleased, quick: he just tagged someone |
| `owen.playerHit.4` | Walked into it. | pleased, quick: he just tagged someone |
| `owen.npcHit.1` | Hm. | caught: owning it, or groaning |
| `owen.npcHit.2` | Okay. Fair. | caught: owning it, or groaning |
| `owen.npcHit.3` | Good. You moved. | caught: owning it, or groaning |
| `owen.npcHit.4` | That's a hit. Fine. | caught: owning it, or groaning |
| `owen.excuse.1` | Hm. My leg fell asleep. | whining, defensive: why that tag did not count |
| `owen.excuse.2` | Wasn't worth moving for. | whining, defensive: why that tag did not count |
| `owen.excuse.3` | Gnats in my eyes. Fine. | whining, defensive: why that tag did not count |
| `owen.excuse.4` | I let that one go. | whining, defensive: why that tag did not count |
| `owen.playerSpotted.1` | There. | urgent, calling it out |
| `owen.playerSpotted.2` | Have him. | urgent, calling it out |
| `owen.playerSpotted.3` | He's in my lane. | urgent, calling it out |
| `owen.playerSpotted.4` | Got him. Holding. | urgent, calling it out |
| `owen.taunt.1` | I just wait. | teasing, across the yard |
| `owen.taunt.2` | Not moving. | teasing, across the yard |
| `owen.taunt.3` | Come to me. | teasing, across the yard |
| `owen.taunt.4` | Still here. Still waiting. | teasing, across the yard |
| `owen.looking.1` | Hm. Nobody's coming. I'll go. | telling his side he is heading out to find them |
| `owen.looking.2` | Fine. I'll go to them. | telling his side he is heading out to find them |

### Eric (`eric`)

**Voice:** About 11, short. Fast, fires a lot, eager: “again?”. Short, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`.

| Id | Line | Tone |
|---|---|---|
| `eric.playerHit.1` | Got him! Again? | pleased, quick: he just tagged someone |
| `eric.playerHit.2` | Ha! Too slow! | pleased, quick: he just tagged someone |
| `eric.playerHit.3` | Yes! Yes! | pleased, quick: he just tagged someone |
| `eric.playerHit.4` | Tagged! Run it back! | pleased, quick: he just tagged someone |
| `eric.playerHit.5` | Can't catch me! | pleased, quick: he just tagged someone |
| `eric.npcHit.1` | FINE. You got lucky. | caught: owning it, or groaning |
| `eric.npcHit.2` | Ugh, whatever! | caught: owning it, or groaning |
| `eric.npcHit.3` | Okay okay okay! | caught: owning it, or groaning |
| `eric.npcHit.4` | That's cheap! | caught: owning it, or groaning |
| `eric.npcHit.5` | Fine, I'm hit! | caught: owning it, or groaning |
| `eric.excuse.1` | I was out of BBs! No fair! | whining, defensive: why that tag did not count |
| `eric.excuse.2` | My hopper's empty, dude! | whining, defensive: why that tag did not count |
| `eric.excuse.3` | I'm too short to see over that! | whining, defensive: why that tag did not count |
| `eric.excuse.4` | That hit my gun, not me! | whining, defensive: why that tag did not count |
| `eric.playerSpotted.1` | There! There! | urgent, calling it out |
| `eric.playerSpotted.2` | Found him! Go! | urgent, calling it out |
| `eric.playerSpotted.3` | He's right there, dude! | urgent, calling it out |
| `eric.playerSpotted.4` | On him! Moving! | urgent, calling it out |
| `eric.taunt.1` | Come on, come on! | teasing, across the yard |
| `eric.taunt.2` | Too slow, dude! | teasing, across the yard |
| `eric.taunt.3` | Can't hit me! | teasing, across the yard |
| `eric.taunt.4` | Let's go, let's go! | teasing, across the yard |
| `eric.taunt.5` | Catch me if you can! | teasing, across the yard |
| `eric.home.1` | Again? I’m ready when you are. | relaxed, hanging out in Mike’s room |
| `eric.home.2` | I’ve been reading the map. Seth’s crew always comes up the same side. | relaxed, hanging out in Mike’s room |
| `eric.home.3` | Your TV’s tiny, man. | relaxed, hanging out in Mike’s room |
| `eric.looking.1` | Can't see anything! I'm going! | telling his side he is heading out to find them |
| `eric.looking.2` | I'm going up! Again! | telling his side he is heading out to find them |

### Rebecca (`rebecca`)

**Voice:** About 12. Unbothered and accurate: cool, a little superior, “predictable”. Short, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `rebecca.playerHit.1` | That counts. Reset. | pleased, quick: he just tagged someone |
| `rebecca.playerHit.2` | Predictable. | pleased, quick: he just tagged someone |
| `rebecca.playerHit.3` | Yep. Saw that coming. | pleased, quick: he just tagged someone |
| `rebecca.playerHit.4` | Called it. | pleased, quick: he just tagged someone |
| `rebecca.playerHit.5` | Next. | pleased, quick: he just tagged someone |
| `rebecca.npcHit.1` | That counts. Reset. | caught: owning it, or groaning |
| `rebecca.npcHit.2` | Okay. Fine. | caught: owning it, or groaning |
| `rebecca.npcHit.3` | Hm. Good. | caught: owning it, or groaning |
| `rebecca.npcHit.4` | Noted. | caught: owning it, or groaning |
| `rebecca.excuse.1` | That hit my gun. Fine. | whining, defensive: why that tag did not count |
| `rebecca.excuse.2` | My goggles fogged. Noted. | whining, defensive: why that tag did not count |
| `rebecca.excuse.3` | You got lucky. Predictably. | whining, defensive: why that tag did not count |
| `rebecca.excuse.4` | I lost count of your shots. | whining, defensive: why that tag did not count |
| `rebecca.playerSpotted.1` | There he is. | urgent, calling it out |
| `rebecca.playerSpotted.2` | Got him. | urgent, calling it out |
| `rebecca.playerSpotted.3` | Right there. Predictable. | urgent, calling it out |
| `rebecca.playerSpotted.4` | I see you. | urgent, calling it out |
| `rebecca.taunt.1` | Any day now. | teasing, across the yard |
| `rebecca.taunt.2` | You always go left. | teasing, across the yard |
| `rebecca.taunt.3` | Still waiting. | teasing, across the yard |
| `rebecca.taunt.4` | This again? | teasing, across the yard |
| `rebecca.looking.1` | They're not coming. Predictable. Moving up. | telling his side he is heading out to find them |
| `rebecca.looking.2` | I'll go find them. | telling his side he is heading out to find them |

### Andrew (`andrew`)

**Voice:** About 13, big. Friendly and warm, a thumbs up for a good play. Tall, heavy build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `andrew.playerHit.1` | Yep. That's me. | pleased, quick: he just tagged someone |
| `andrew.playerHit.2` | Got him! Solid. | pleased, quick: he just tagged someone |
| `andrew.playerHit.3` | Big hit! Haha! | pleased, quick: he just tagged someone |
| `andrew.playerHit.4` | That's a tag, buddy! | pleased, quick: he just tagged someone |
| `andrew.playerHit.5` | Down the hill, bud! | pleased, quick: he just tagged someone |
| `andrew.npcHit.1` | Yep. That's me. | caught: owning it, or groaning |
| `andrew.npcHit.2` | Good one! | caught: owning it, or groaning |
| `andrew.npcHit.3` | Ha, solid play. | caught: owning it, or groaning |
| `andrew.npcHit.4` | Okay! You got me! | caught: owning it, or groaning |
| `andrew.npcHit.5` | Fair hit, fair hit. | caught: owning it, or groaning |
| `andrew.excuse.1` | Ha, I'm too big to miss! | whining, defensive: why that tag did not count |
| `andrew.excuse.2` | My mask slid down, honest! | whining, defensive: why that tag did not count |
| `andrew.excuse.3` | I was giving you a thumbs up! | whining, defensive: why that tag did not count |
| `andrew.excuse.4` | Kinda hard to hide, dude. | whining, defensive: why that tag did not count |
| `andrew.playerSpotted.1` | There he is! Alex! | urgent, calling it out |
| `andrew.playerSpotted.2` | Got him, down the hill! | urgent, calling it out |
| `andrew.playerSpotted.3` | Found him! Go, go! | urgent, calling it out |
| `andrew.playerSpotted.4` | He's by the creek! | urgent, calling it out |
| `andrew.taunt.1` | Come on up the hill! | teasing, across the yard |
| `andrew.taunt.2` | I'm not hard to find! | teasing, across the yard |
| `andrew.taunt.3` | Let's go, buddy! | teasing, across the yard |
| `andrew.taunt.4` | Alex, push with me! | teasing, across the yard |
| `andrew.taunt.5` | Big yard, nowhere to hide! | teasing, across the yard |
| `andrew.looking.1` | Nobody here! Going looking, buddy! | telling his side he is heading out to find them |
| `andrew.looking.2` | I'll go find 'em! Thumbs up! | telling his side he is heading out to find them |

### Alex (`alex`)

**Voice:** About 12. Andrew’s buddy, the smart aleck: quick, “told you he’d try that”. Tall, skinny build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`.

| Id | Line | Tone |
|---|---|---|
| `alex.playerHit.1` | Told you he'd try that. | pleased, quick: he just tagged someone |
| `alex.playerHit.2` | OK, OK, got him. | pleased, quick: he just tagged someone |
| `alex.playerHit.3` | Saw that a mile away. | pleased, quick: he just tagged someone |
| `alex.playerHit.4` | Called it. Called it. | pleased, quick: he just tagged someone |
| `alex.playerHit.5` | Every time, dude. | pleased, quick: he just tagged someone |
| `alex.npcHit.1` | OK, OK, you got it. | caught: owning it, or groaning |
| `alex.npcHit.2` | Ugh. Fine. | caught: owning it, or groaning |
| `alex.npcHit.3` | Andrew, he got me. | caught: owning it, or groaning |
| `alex.npcHit.4` | Alright, alright. | caught: owning it, or groaning |
| `alex.npcHit.5` | Didn't see that one. | caught: owning it, or groaning |
| `alex.excuse.1` | Technically that was a ricochet. | whining, defensive: why that tag did not count |
| `alex.excuse.2` | I knew you'd try that. Mostly. | whining, defensive: why that tag did not count |
| `alex.excuse.3` | Andrew was standing in my way. | whining, defensive: why that tag did not count |
| `alex.excuse.4` | That's a gun hit, technically. | whining, defensive: why that tag did not count |
| `alex.playerSpotted.1` | Andrew, there! | urgent, calling it out |
| `alex.playerSpotted.2` | Yep, he's doing it. | urgent, calling it out |
| `alex.playerSpotted.3` | Got him. Called it. | urgent, calling it out |
| `alex.playerSpotted.4` | Up the hill, right side! | urgent, calling it out |
| `alex.taunt.1` | I know what you're doing. | teasing, across the yard |
| `alex.taunt.2` | Try it. Go on. | teasing, across the yard |
| `alex.taunt.3` | So predictable, dude. | teasing, across the yard |
| `alex.taunt.4` | Andrew, he's going left again. | teasing, across the yard |
| `alex.taunt.5` | Come on, surprise me. | teasing, across the yard |
| `alex.home.1` | Andrew says hey. He still thinks you got lucky. | relaxed, hanging out in Mike’s room |
| `alex.home.2` | Two lives each next time? I’m just saying. | relaxed, hanging out in Mike’s room |
| `alex.home.3` | Whose turn is it on the computer? | relaxed, hanging out in Mike’s room |
| `alex.looking.1` | Told you they'd hide. Going looking. | telling his side he is heading out to find them |
| `alex.looking.2` | Moving up. They're definitely hiding. | telling his side he is heading out to find them |

### Evan (`evan`)

**Voice:** About 12. The good sport: cheerful, fair, “best of three?”. Average height, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `evan.playerHit.1` | Got you! Best of three? | pleased, quick: he just tagged someone |
| `evan.playerHit.2` | Nice! That's one. | pleased, quick: he just tagged someone |
| `evan.playerHit.3` | Ha, got him clean! | pleased, quick: he just tagged someone |
| `evan.playerHit.4` | Tag! Rematch after? | pleased, quick: he just tagged someone |
| `evan.npcHit.1` | Got me clean. | caught: owning it, or groaning |
| `evan.npcHit.2` | Okay, good one! | caught: owning it, or groaning |
| `evan.npcHit.3` | Best of three? | caught: owning it, or groaning |
| `evan.npcHit.4` | Fair. Nice shot. | caught: owning it, or groaning |
| `evan.excuse.1` | My goggles fogged, but fair. | whining, defensive: why that tag did not count |
| `evan.excuse.2` | Best of three. My gun jammed. | whining, defensive: why that tag did not count |
| `evan.excuse.3` | Ha, I tripped. Still counts. | whining, defensive: why that tag did not count |
| `evan.excuse.4` | My sling caught. Nice one, though. | whining, defensive: why that tag did not count |
| `evan.playerSpotted.1` | Hey, there he is! | urgent, calling it out |
| `evan.playerSpotted.2` | Got him, got him! | urgent, calling it out |
| `evan.playerSpotted.3` | Okay, I see you! | urgent, calling it out |
| `evan.playerSpotted.4` | Over by the creek! | urgent, calling it out |
| `evan.taunt.1` | Come on, let's play already! | teasing, across the yard |
| `evan.taunt.2` | You can come out! | teasing, across the yard |
| `evan.taunt.3` | I'll give you a head start! | teasing, across the yard |
| `evan.taunt.4` | Where'd you go, man? | teasing, across the yard |
| `evan.looking.1` | I'll go find 'em. Good luck, guys! | telling his side he is heading out to find them |
| `evan.looking.2` | Heading up, see you out there! | telling his side he is heading out to find them |

### Haden (`haden`)

**Voice:** About 11. A twin with Connor: loud, yelling for his brother. Short, heavy build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `haden.playerHit.1` | OW! Wait, no, I got HIM! | pleased, quick: he just tagged someone |
| `haden.playerHit.2` | CONNOR! Did you SEE that? | pleased, quick: he just tagged someone |
| `haden.playerHit.3` | Got him! Got him! | pleased, quick: he just tagged someone |
| `haden.playerHit.4` | Yes! Twin power! | pleased, quick: he just tagged someone |
| `haden.playerHit.5` | Ha! Take that! | pleased, quick: he just tagged someone |
| `haden.npcHit.1` | OW. Connor, get him! | caught: owning it, or groaning |
| `haden.npcHit.2` | Connor! He got me! | caught: owning it, or groaning |
| `haden.npcHit.3` | Augh! Avenge me! | caught: owning it, or groaning |
| `haden.npcHit.4` | No fair! Connor! | caught: owning it, or groaning |
| `haden.npcHit.5` | OW. Okay. Ow. | caught: owning it, or groaning |
| `haden.excuse.1` | Connor was supposed to cover me! | whining, defensive: why that tag did not count |
| `haden.excuse.2` | CONNOR! You left me! | whining, defensive: why that tag did not count |
| `haden.excuse.3` | That was Connor's fault! | whining, defensive: why that tag did not count |
| `haden.excuse.4` | Connor bumped my gun! | whining, defensive: why that tag did not count |
| `haden.playerSpotted.1` | Connor, there he is! | urgent, calling it out |
| `haden.playerSpotted.2` | He's in the yard! | urgent, calling it out |
| `haden.playerSpotted.3` | Got him! Get him! | urgent, calling it out |
| `haden.playerSpotted.4` | There! By the shed! | urgent, calling it out |
| `haden.taunt.1` | Connor, where is he? | teasing, across the yard |
| `haden.taunt.2` | Come out, come out! | teasing, across the yard |
| `haden.taunt.3` | You're in OUR yard! | teasing, across the yard |
| `haden.taunt.4` | Connor, cover me! | teasing, across the yard |
| `haden.taunt.5` | I'm gonna get you! | teasing, across the yard |
| `haden.looking.1` | CONNOR! I'm going up! | telling his side he is heading out to find them |
| `haden.looking.2` | Going looking! Connor, come on! | telling his side he is heading out to find them |

### Connor (`connor`)

**Voice:** About 11. A twin with Haden: loud, yelling for his brother (a touch different from Haden). Short, heavy build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `connor.playerHit.1` | Got him! Haden, did you see? | pleased, quick: he just tagged someone |
| `connor.playerHit.2` | Yes! YES! | pleased, quick: he just tagged someone |
| `connor.playerHit.3` | Bunker rules! | pleased, quick: he just tagged someone |
| `connor.playerHit.4` | Tagged! Ha ha! | pleased, quick: he just tagged someone |
| `connor.playerHit.5` | Right over the bags, dude! | pleased, quick: he just tagged someone |
| `connor.npcHit.1` | Haden, AVENGE ME. | caught: owning it, or groaning |
| `connor.npcHit.2` | Augh! Haden! | caught: owning it, or groaning |
| `connor.npcHit.3` | No way! Haden, he got me! | caught: owning it, or groaning |
| `connor.npcHit.4` | OW. Okay. That's one. | caught: owning it, or groaning |
| `connor.npcHit.5` | He got me! Get him! | caught: owning it, or groaning |
| `connor.excuse.1` | Haden, you left me hanging! | whining, defensive: why that tag did not count |
| `connor.excuse.2` | HADEN! That's your fault! | whining, defensive: why that tag did not count |
| `connor.excuse.3` | Haden was in my way! | whining, defensive: why that tag did not count |
| `connor.excuse.4` | Haden said you were left! | whining, defensive: why that tag did not count |
| `connor.playerSpotted.1` | Haden! He's right there! | urgent, calling it out |
| `connor.playerSpotted.2` | I see him, I see him! | urgent, calling it out |
| `connor.playerSpotted.3` | There! By the fort! | urgent, calling it out |
| `connor.playerSpotted.4` | Got eyes on him from the bunker! | urgent, calling it out |
| `connor.taunt.1` | Haden, go around! | teasing, across the yard |
| `connor.taunt.2` | You'll never get in here! | teasing, across the yard |
| `connor.taunt.3` | This is OUR bunker! | teasing, across the yard |
| `connor.taunt.4` | Come on, I dare you! | teasing, across the yard |
| `connor.taunt.5` | Haden, where'd he go? | teasing, across the yard |
| `connor.looking.1` | HADEN! I'm moving up! | telling his side he is heading out to find them |
| `connor.looking.2` | I'm going! Haden, follow me! | telling his side he is heading out to find them |

### Mason (`mason`)

**Voice:** About 13. The sportsman: fair, upbeat, like a team captain. Tall, skinny build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `mason.playerHit.1` | Clean shot. That's a tag. | pleased, quick: he just tagged someone |
| `mason.playerHit.2` | Got him. Respect. | pleased, quick: he just tagged someone |
| `mason.playerHit.3` | Nice try, though. | pleased, quick: he just tagged someone |
| `mason.playerHit.4` | Tagged. Good round. | pleased, quick: he just tagged someone |
| `mason.playerHit.5` | Yep. That one's mine. | pleased, quick: he just tagged someone |
| `mason.npcHit.1` | Clean shot. Respect. | caught: owning it, or groaning |
| `mason.npcHit.2` | Good hit. | caught: owning it, or groaning |
| `mason.npcHit.3` | Okay. You earned that. | caught: owning it, or groaning |
| `mason.npcHit.4` | Fair. I'm out. | caught: owning it, or groaning |
| `mason.npcHit.5` | Nice angle. | caught: owning it, or groaning |
| `mason.excuse.1` | Sun in my eyes. Still counts. | whining, defensive: why that tag did not count |
| `mason.excuse.2` | My footing slipped. Good hit. | whining, defensive: why that tag did not count |
| `mason.excuse.3` | Fair, but my mag was dry. | whining, defensive: why that tag did not count |
| `mason.excuse.4` | Wet grass. No excuse, though. | whining, defensive: why that tag did not count |
| `mason.playerSpotted.1` | There he is. | urgent, calling it out |
| `mason.playerSpotted.2` | Got him. Pushing. | urgent, calling it out |
| `mason.playerSpotted.3` | Eyes on, left side. | urgent, calling it out |
| `mason.playerSpotted.4` | Found him. Let's go. | urgent, calling it out |
| `mason.taunt.1` | Want to try again? | teasing, across the yard |
| `mason.taunt.2` | Come on, let's play it straight. | teasing, across the yard |
| `mason.taunt.3` | I'm right here. | teasing, across the yard |
| `mason.taunt.4` | No hiding. Let's go. | teasing, across the yard |
| `mason.taunt.5` | Any time. | teasing, across the yard |
| `mason.looking.1` | Nobody here. I'll move up. | telling his side he is heading out to find them |
| `mason.looking.2` | Going up the field. Stay sharp. | telling his side he is heading out to find them |

### Christian (`christian`)

**Voice:** About 11. The excitable one: high energy, everything is a big deal. Short, heavy build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `christian.playerHit.1` | I GOT HIM! I got him! | pleased, quick: he just tagged someone |
| `christian.playerHit.2` | Did you SEE that? | pleased, quick: he just tagged someone |
| `christian.playerHit.3` | Yes! Finally! | pleased, quick: he just tagged someone |
| `christian.playerHit.4` | Ha! Got you! | pleased, quick: he just tagged someone |
| `christian.playerHit.5` | That one hit! It hit! | pleased, quick: he just tagged someone |
| `christian.npcHit.1` | AGH. Fine, fine. | caught: owning it, or groaning |
| `christian.npcHit.2` | Ow! Not again! | caught: owning it, or groaning |
| `christian.npcHit.3` | I'll get you next round! | caught: owning it, or groaning |
| `christian.npcHit.4` | Aw, come on! | caught: owning it, or groaning |
| `christian.npcHit.5` | Fine! Fine! Fine! | caught: owning it, or groaning |
| `christian.excuse.1` | NOT AGAIN! My gun hates me! | whining, defensive: why that tag did not count |
| `christian.excuse.2` | I was about to shoot you! | whining, defensive: why that tag did not count |
| `christian.excuse.3` | A bug flew in my mouth! | whining, defensive: why that tag did not count |
| `christian.excuse.4` | That's so unfair! I sneezed! | whining, defensive: why that tag did not count |
| `christian.playerSpotted.1` | There! There! There! | urgent, calling it out |
| `christian.playerSpotted.2` | He's right there, guys! | urgent, calling it out |
| `christian.playerSpotted.3` | Found him! Somebody get him! | urgent, calling it out |
| `christian.playerSpotted.4` | Over there! Look! | urgent, calling it out |
| `christian.taunt.1` | I'll get you this time! | teasing, across the yard |
| `christian.taunt.2` | Come on, come on! | teasing, across the yard |
| `christian.taunt.3` | Where are you? Come out! | teasing, across the yard |
| `christian.taunt.4` | I'm gonna hit you this time! | teasing, across the yard |
| `christian.taunt.5` | Hold still so I can hit you! | teasing, across the yard |
| `christian.looking.1` | I can't wait anymore! Going! | telling his side he is heading out to find them |
| `christian.looking.2` | Where are they?! I'm going to look! | telling his side he is heading out to find them |

### Fernando (`fernando`)

**Voice:** About 12. One of a pair with Diego: careful, gives the signals. Average height, average build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `fernando.playerHit.1` | Got him. Diego, your turn. | pleased, quick: he just tagged someone |
| `fernando.playerHit.2` | Easy. Next. | pleased, quick: he just tagged someone |
| `fernando.playerHit.3` | That's a tag. Move up! | pleased, quick: he just tagged someone |
| `fernando.playerHit.4` | Got him! Push, push! | pleased, quick: he just tagged someone |
| `fernando.playerHit.5` | One down. | pleased, quick: he just tagged someone |
| `fernando.npcHit.1` | You got me, you got me. | caught: owning it, or groaning |
| `fernando.npcHit.2` | Okay. Diego, go. | caught: owning it, or groaning |
| `fernando.npcHit.3` | Fine. Nice shot. | caught: owning it, or groaning |
| `fernando.npcHit.4` | Yeah, that's a hit. | caught: owning it, or groaning |
| `fernando.npcHit.5` | Diego, he's yours. | caught: owning it, or groaning |
| `fernando.excuse.1` | Diego was supposed to watch that side. | whining, defensive: why that tag did not count |
| `fernando.excuse.2` | Diego, why'd you move? | whining, defensive: why that tag did not count |
| `fernando.excuse.3` | My goggles fogged up. | whining, defensive: why that tag did not count |
| `fernando.excuse.4` | I was signaling Diego. | whining, defensive: why that tag did not count |
| `fernando.playerSpotted.1` | Diego, right there! | urgent, calling it out |
| `fernando.playerSpotted.2` | Got him! Moving up! | urgent, calling it out |
| `fernando.playerSpotted.3` | There he is. Go! | urgent, calling it out |
| `fernando.playerSpotted.4` | Found him. Flank him! | urgent, calling it out |
| `fernando.taunt.1` | Diego, your turn. | teasing, across the yard |
| `fernando.taunt.2` | Come on, let's finish this. | teasing, across the yard |
| `fernando.taunt.3` | Keep moving, keep moving! | teasing, across the yard |
| `fernando.taunt.4` | We've got you boxed in! | teasing, across the yard |
| `fernando.taunt.5` | No way out, man. | teasing, across the yard |
| `fernando.looking.1` | Diego, I'm going up. | telling his side he is heading out to find them |
| `fernando.looking.2` | I'll go look. Diego, stay here. | telling his side he is heading out to find them |

### Diego (`diego`)

**Voice:** About 12. One of a pair with Fernando: cool and short, “tch”. Short, average build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`.

| Id | Line | Tone |
|---|---|---|
| `diego.playerHit.1` | Tch. Got him. | pleased, quick: he just tagged someone |
| `diego.playerHit.2` | Told you. | pleased, quick: he just tagged someone |
| `diego.playerHit.3` | Yep. That's a hit. | pleased, quick: he just tagged someone |
| `diego.playerHit.4` | Fernando, told you. | pleased, quick: he just tagged someone |
| `diego.playerHit.5` | Easy. | pleased, quick: he just tagged someone |
| `diego.npcHit.1` | Tch. Nice shot. | caught: owning it, or groaning |
| `diego.npcHit.2` | Okay. That counts. | caught: owning it, or groaning |
| `diego.npcHit.3` | Fernando, he got me. | caught: owning it, or groaning |
| `diego.npcHit.4` | Hm. Fine. | caught: owning it, or groaning |
| `diego.npcHit.5` | Good one. | caught: owning it, or groaning |
| `diego.excuse.1` | Fernando gave me away. | whining, defensive: why that tag did not count |
| `diego.excuse.2` | Fernando was too loud. | whining, defensive: why that tag did not count |
| `diego.excuse.3` | My mag was half empty anyway. | whining, defensive: why that tag did not count |
| `diego.excuse.4` | Hm. Fernando's fault. | whining, defensive: why that tag did not count |
| `diego.playerSpotted.1` | Fernando, there. | urgent, calling it out |
| `diego.playerSpotted.2` | Got him. | urgent, calling it out |
| `diego.playerSpotted.3` | He's right there. Go. | urgent, calling it out |
| `diego.playerSpotted.4` | See him. Left side. | urgent, calling it out |
| `diego.taunt.1` | Any day now. | teasing, across the yard |
| `diego.taunt.2` | Fernando, he's hiding again. | teasing, across the yard |
| `diego.taunt.3` | Come on. Let's go. | teasing, across the yard |
| `diego.taunt.4` | We know where you are. | teasing, across the yard |
| `diego.taunt.5` | Told you he'd hide. | teasing, across the yard |
| `diego.home.1` | Tch. Fernando wants a rematch. Let him wait. | relaxed, hanging out in Mike’s room |
| `diego.home.2` | The MP5 eats BBs. Worth it. | relaxed, hanging out in Mike’s room |
| `diego.home.3` | Don’t tell anyone I fell asleep on your futon. | relaxed, hanging out in Mike’s room |
| `diego.looking.1` | Fernando, I'm moving. | telling his side he is heading out to find them |
| `diego.looking.2` | Hm. Going for a look. | telling his side he is heading out to find them |

### Colin (`colin`)

**Voice:** About 11. Seth’s crew: loud, fast, always running straight at you. Average height, average build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `colin.playerHit.1` | GOT HIM! Did you see?! | pleased, quick: he just tagged someone |
| `colin.playerHit.2` | Ha! Ran right at you! | pleased, quick: he just tagged someone |
| `colin.playerHit.3` | Yes! Again! Again! | pleased, quick: he just tagged someone |
| `colin.playerHit.4` | Told you I'm fast! | pleased, quick: he just tagged someone |
| `colin.playerHit.5` | Boom! Got you good! | pleased, quick: he just tagged someone |
| `colin.npcHit.1` | WHAT. No way! | caught: owning it, or groaning |
| `colin.npcHit.2` | Aw come on, again! | caught: owning it, or groaning |
| `colin.npcHit.3` | That's so lucky! | caught: owning it, or groaning |
| `colin.npcHit.4` | Okay okay, run it back! | caught: owning it, or groaning |
| `colin.excuse.1` | Seth said you'd be left! | whining, defensive: why that tag did not count |
| `colin.excuse.2` | My gun's way slower than yours! | whining, defensive: why that tag did not count |
| `colin.excuse.3` | My goggles slid down, dude! | whining, defensive: why that tag did not count |
| `colin.excuse.4` | No fair, I was gonna win! | whining, defensive: why that tag did not count |
| `colin.playerSpotted.1` | THERE! I'm going! | urgent, calling it out |
| `colin.playerSpotted.2` | Got him, I'm going in! | urgent, calling it out |
| `colin.playerSpotted.3` | He's mine, he's mine! | urgent, calling it out |
| `colin.playerSpotted.4` | Charging! Cover me, Seth! | urgent, calling it out |
| `colin.taunt.1` | I'm coming right at you! | teasing, across the yard |
| `colin.taunt.2` | Run, dude, run! | teasing, across the yard |
| `colin.taunt.3` | Can't hide from me! | teasing, across the yard |
| `colin.taunt.4` | Diego would've ran already! | teasing, across the yard |
| `colin.looking.1` | I'm going! Straight at 'em! | telling his side he is heading out to find them |
| `colin.looking.2` | Can't see 'em! Running up! | telling his side he is heading out to find them |

### Jordan (`jordan`)

**Voice:** About 15, a high schooler. Easygoing, knows the portables. Tall, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `jordan.playerHit.1` | Got you by the portables. | pleased, quick: he just tagged someone |
| `jordan.playerHit.2` | That's a tag, man. | pleased, quick: he just tagged someone |
| `jordan.playerHit.3` | Told you. My portables. | pleased, quick: he just tagged someone |
| `jordan.playerHit.4` | Right off the steps. | pleased, quick: he just tagged someone |
| `jordan.playerHit.5` | Okay, that one's mine. | pleased, quick: he just tagged someone |
| `jordan.npcHit.1` | Okay. Okay, that one's yours. | caught: owning it, or groaning |
| `jordan.npcHit.2` | Aw, off the steps too. | caught: owning it, or groaning |
| `jordan.npcHit.3` | Yeah, you got me. | caught: owning it, or groaning |
| `jordan.npcHit.4` | Alright, alright, I'm out. | caught: owning it, or groaning |
| `jordan.excuse.1` | Aw, I slipped on the steps. | whining, defensive: why that tag did not count |
| `jordan.excuse.2` | The portable's in my way, man. | whining, defensive: why that tag did not count |
| `jordan.excuse.3` | I was just looking around. | whining, defensive: why that tag did not count |
| `jordan.excuse.4` | Man, my strap got caught. | whining, defensive: why that tag did not count |
| `jordan.playerSpotted.1` | He's under the portables! | urgent, calling it out |
| `jordan.playerSpotted.2` | By the steps, right there! | urgent, calling it out |
| `jordan.playerSpotted.3` | Got him, between the buildings. | urgent, calling it out |
| `jordan.playerSpotted.4` | There, by the portable! | urgent, calling it out |
| `jordan.taunt.1` | Nobody knows these portables like me. | teasing, across the yard |
| `jordan.taunt.2` | Come around the steps, man. | teasing, across the yard |
| `jordan.taunt.3` | I'm in here somewhere, man. | teasing, across the yard |
| `jordan.taunt.4` | Every portable looks the same, huh? | teasing, across the yard |
| `jordan.looking.1` | I know a way round. Going. | telling his side he is heading out to find them |
| `jordan.looking.2` | I'll go check the portables. | telling his side he is heading out to find them |

### Caleb (`caleb`)

**Voice:** About 15, a high schooler. Fast and pushy, always nearly made it. Average height, average build; a pushy talker.
**Shared tables:** `band.high_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `caleb.playerHit.1` | Too slow, man! | pleased, quick: he just tagged someone |
| `caleb.playerHit.2` | Got you! Ran right past! | pleased, quick: he just tagged someone |
| `caleb.playerHit.3` | Ha! Right across the field! | pleased, quick: he just tagged someone |
| `caleb.playerHit.4` | Tagged! Keep up! | pleased, quick: he just tagged someone |
| `caleb.playerHit.5` | Yes! Called it! | pleased, quick: he just tagged someone |
| `caleb.npcHit.1` | Ugh! I was right THERE! | caught: owning it, or groaning |
| `caleb.npcHit.2` | No way! I was moving! | caught: owning it, or groaning |
| `caleb.npcHit.3` | Aw, I almost made it! | caught: owning it, or groaning |
| `caleb.npcHit.4` | Okay! Okay! I'm hit! | caught: owning it, or groaning |
| `caleb.excuse.1` | One more step and I had you! | whining, defensive: why that tag did not count |
| `caleb.excuse.2` | I was RIGHT there, though! | whining, defensive: why that tag did not count |
| `caleb.excuse.3` | I tripped over the hose! | whining, defensive: why that tag did not count |
| `caleb.excuse.4` | I was almost there! Doesn't count! | whining, defensive: why that tag did not count |
| `caleb.playerSpotted.1` | Going around, going around! | urgent, calling it out |
| `caleb.playerSpotted.2` | He's by the bleachers! | urgent, calling it out |
| `caleb.playerSpotted.3` | Got him! Cutting across! | urgent, calling it out |
| `caleb.playerSpotted.4` | Field side! Field side! | urgent, calling it out |
| `caleb.taunt.1` | Can't catch me, man! | teasing, across the yard |
| `caleb.taunt.2` | Faster than you, dude! | teasing, across the yard |
| `caleb.taunt.3` | I'm already behind you! | teasing, across the yard |
| `caleb.taunt.4` | Race you to the fence! | teasing, across the yard |
| `caleb.looking.1` | I'm going up! Almost there! | telling his side he is heading out to find them |
| `caleb.looking.2` | Pushing up! Watch me! | telling his side he is heading out to find them |

### Nathan (`nathan`)

**Voice:** About 15, a high schooler with glasses. Patient, has worked out where you’ll go. Tall, average build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `nathan.playerHit.1` | You crossed the field. | pleased, quick: he just tagged someone |
| `nathan.playerHit.2` | Everyone crosses the field. | pleased, quick: he just tagged someone |
| `nathan.playerHit.3` | Predictable. Sorry. | pleased, quick: he just tagged someone |
| `nathan.playerHit.4` | Hm. Got you. | pleased, quick: he just tagged someone |
| `nathan.playerHit.5` | That angle was open. | pleased, quick: he just tagged someone |
| `nathan.npcHit.1` | Hm. Fair. | caught: owning it, or groaning |
| `nathan.npcHit.2` | Okay. Didn't plan for that. | caught: owning it, or groaning |
| `nathan.npcHit.3` | Huh. Good angle. | caught: owning it, or groaning |
| `nathan.npcHit.4` | Noted. I'm out. | caught: owning it, or groaning |
| `nathan.excuse.1` | My glasses fogged under the goggles. | whining, defensive: why that tag did not count |
| `nathan.excuse.2` | Statistically, that shouldn't have hit. | whining, defensive: why that tag did not count |
| `nathan.excuse.3` | You weren't supposed to go there. | whining, defensive: why that tag did not count |
| `nathan.excuse.4` | My glasses slipped. | whining, defensive: why that tag did not count |
| `nathan.playerSpotted.1` | He's going for the field. | urgent, calling it out |
| `nathan.playerSpotted.2` | Movement, by the doors. | urgent, calling it out |
| `nathan.playerSpotted.3` | There. Between the portables. | urgent, calling it out |
| `nathan.playerSpotted.4` | Got him. Second window. | urgent, calling it out |
| `nathan.taunt.1` | The field is wide open. | teasing, across the yard |
| `nathan.taunt.2` | I've done the math. | teasing, across the yard |
| `nathan.taunt.3` | Don't cross the field. | teasing, across the yard |
| `nathan.taunt.4` | You'll have to come to me. | teasing, across the yard |
| `nathan.looking.1` | They should be ahead. Moving up. | telling his side he is heading out to find them |
| `nathan.looking.2` | I've worked out where they are. Going. | telling his side he is heading out to find them |

### Sophie (`sophie`)

**Voice:** About 15, a high schooler. The best shot at the school: cool, confident. Average height, skinny build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `sophie.playerHit.1` | Wrong side, dude. | pleased, quick: he just tagged someone |
| `sophie.playerHit.2` | Got you. Check your corners. | pleased, quick: he just tagged someone |
| `sophie.playerHit.3` | Wow. That was easy. | pleased, quick: he just tagged someone |
| `sophie.playerHit.4` | Right where I thought. | pleased, quick: he just tagged someone |
| `sophie.playerHit.5` | Nope. Mine. | pleased, quick: he just tagged someone |
| `sophie.npcHit.1` | Wow. Okay. Nice. | caught: owning it, or groaning |
| `sophie.npcHit.2` | Okay, that's fair. | caught: owning it, or groaning |
| `sophie.npcHit.3` | Ugh, I hate that angle. | caught: owning it, or groaning |
| `sophie.npcHit.4` | Fine. Good shot. | caught: owning it, or groaning |
| `sophie.excuse.1` | Ugh, my gun pulls left. | whining, defensive: why that tag did not count |
| `sophie.excuse.2` | My hair got in my eyes. | whining, defensive: why that tag did not count |
| `sophie.excuse.3` | Lucky. Won't happen again. | whining, defensive: why that tag did not count |
| `sophie.excuse.4` | I was lining up a better shot. | whining, defensive: why that tag did not count |
| `sophie.playerSpotted.1` | End of the portable, there! | urgent, calling it out |
| `sophie.playerSpotted.2` | He's on the wrong side! | urgent, calling it out |
| `sophie.playerSpotted.3` | Got him. Coming round. | urgent, calling it out |
| `sophie.playerSpotted.4` | I see you, by the doors. | urgent, calling it out |
| `sophie.taunt.1` | I'm coming round the end. | teasing, across the yard |
| `sophie.taunt.2` | Better check your corners. | teasing, across the yard |
| `sophie.taunt.3` | You picked the wrong side. | teasing, across the yard |
| `sophie.taunt.4` | I'm faster round the back. | teasing, across the yard |
| `sophie.looking.1` | I'll go round the end. | telling his side he is heading out to find them |
| `sophie.looking.2` | Moving up. I'll find a shot. | telling his side he is heading out to find them |

### Grant (`grant`)

**Voice:** About 15, a high schooler, big. Quiet, never leaves the cars. Tall, heavy build; a quiet talker.
**Shared tables:** `band.low_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `grant.playerHit.1` | Whole field's mine. | pleased, quick: he just tagged someone |
| `grant.playerHit.2` | Didn't even move. | pleased, quick: he just tagged someone |
| `grant.playerHit.3` | From the cars. Again. | pleased, quick: he just tagged someone |
| `grant.playerHit.4` | Yep. Clean. | pleased, quick: he just tagged someone |
| `grant.playerHit.5` | Long way from here. | pleased, quick: he just tagged someone |
| `grant.npcHit.1` | Huh. Didn't see you. | caught: owning it, or groaning |
| `grant.npcHit.2` | Huh. Okay. | caught: owning it, or groaning |
| `grant.npcHit.3` | Guess I'm out. | caught: owning it, or groaning |
| `grant.npcHit.4` | Didn't think you'd get here. | caught: owning it, or groaning |
| `grant.excuse.1` | Huh. The car was in my way. | whining, defensive: why that tag did not count |
| `grant.excuse.2` | Didn't hear you. Car alarm. | whining, defensive: why that tag did not count |
| `grant.excuse.3` | Thought that car covered me. | whining, defensive: why that tag did not count |
| `grant.excuse.4` | Too big for that car, I guess. | whining, defensive: why that tag did not count |
| `grant.playerSpotted.1` | Got him on the field. | urgent, calling it out |
| `grant.playerSpotted.2` | He's out in the grass. | urgent, calling it out |
| `grant.playerSpotted.3` | Lined up. By the cars. | urgent, calling it out |
| `grant.playerSpotted.4` | Saw that. Grass, left. | urgent, calling it out |
| `grant.taunt.1` | I'm not leaving the cars. | teasing, across the yard |
| `grant.taunt.2` | Nothing but grass out there. | teasing, across the yard |
| `grant.taunt.3` | Come on across. | teasing, across the yard |
| `grant.taunt.4` | I can see the whole field. | teasing, across the yard |
| `grant.looking.1` | Huh. Leaving the cars. Just this once. | telling his side he is heading out to find them |
| `grant.looking.2` | Nothing to shoot. Moving up. | telling his side he is heading out to find them |

### Malik (`malik`)

**Voice:** About 15, a high schooler. The shotgun: wants you close, bold. Average height, heavy build; a middling talker.
**Shared tables:** `band.mid_agg.*`, `excuse.*`, `teammate.*`, `squad.*`, `infection.*`, `noodle.*`, `home.1`.

| Id | Line | Tone |
|---|---|---|
| `malik.playerHit.1` | Close up, that's my range. | pleased, quick: he just tagged someone |
| `malik.playerHit.2` | Too close, man. | pleased, quick: he just tagged someone |
| `malik.playerHit.3` | Boom. Shotgun rules. | pleased, quick: he just tagged someone |
| `malik.playerHit.4` | Up close, every time. | pleased, quick: he just tagged someone |
| `malik.playerHit.5` | Got you round the corner. | pleased, quick: he just tagged someone |
| `malik.npcHit.1` | Aw, man. Clean. | caught: owning it, or groaning |
| `malik.npcHit.2` | Couldn't get close enough. | caught: owning it, or groaning |
| `malik.npcHit.3` | Okay, okay. Nice. | caught: owning it, or groaning |
| `malik.npcHit.4` | Aw, from way out there? | caught: owning it, or groaning |
| `malik.excuse.1` | My shotgun ran dry, dude! | whining, defensive: why that tag did not count |
| `malik.excuse.2` | The shells stuck. I had you! | whining, defensive: why that tag did not count |
| `malik.excuse.3` | Shotgun's slow to pump, man. | whining, defensive: why that tag did not count |
| `malik.excuse.4` | Next time I'm getting closer. | whining, defensive: why that tag did not count |
| `malik.playerSpotted.1` | He's close! Right there! | urgent, calling it out |
| `malik.playerSpotted.2` | Round the corner, I got him. | urgent, calling it out |
| `malik.playerSpotted.3` | In my range now. | urgent, calling it out |
| `malik.playerSpotted.4` | Right by the doors! | urgent, calling it out |
| `malik.taunt.1` | Come a little closer. | teasing, across the yard |
| `malik.taunt.2` | Corners are my thing, man. | teasing, across the yard |
| `malik.taunt.3` | Bring it in close. | teasing, across the yard |
| `malik.taunt.4` | I'll be round the corner. | teasing, across the yard |
| `malik.looking.1` | Too far for my shotgun. Going in. | telling his side he is heading out to find them |
| `malik.looking.2` | I need to get close. Moving up. | telling his side he is heading out to find them |

## Shared lines

Said by any kid named in **Who**: record each under that kid’s id (`<kid>.<id>`).

### `band.high_agg`

**Who:** marcus, ryan, chris, andrew, alex, haden, connor, mason, fernando, diego, colin, caleb.

| Id | Line | Tone |
|---|---|---|
| `band.high_agg.playerHit.1` | Got him! | pleased, quick: he just tagged someone |
| `band.high_agg.playerHit.2` | Easy! | pleased, quick: he just tagged someone |
| `band.high_agg.playerHit.3` | Eat that! | pleased, quick: he just tagged someone |
| `band.high_agg.playerHit.4` | Boom! Tagged! | pleased, quick: he just tagged someone |
| `band.high_agg.playerHit.5` | Too easy, dude! | pleased, quick: he just tagged someone |
| `band.high_agg.playerHit.6` | Ha! Got you! | pleased, quick: he just tagged someone |
| `band.high_agg.npcHit.1` | Ugh, fine! | caught: owning it, or groaning |
| `band.high_agg.npcHit.2` | Aw come on! | caught: owning it, or groaning |
| `band.high_agg.npcHit.3` | Lucky shot! | caught: owning it, or groaning |
| `band.high_agg.npcHit.4` | Whatever, I'm hit! | caught: owning it, or groaning |
| `band.high_agg.npcHit.5` | No way! Okay, okay! | caught: owning it, or groaning |
| `band.high_agg.npcHit.6` | That was cheap! | caught: owning it, or groaning |
| `band.high_agg.playerSpotted.1` | There he is! | urgent, calling it out |
| `band.high_agg.playerSpotted.2` | Get him! | urgent, calling it out |
| `band.high_agg.playerSpotted.3` | Push push push! | urgent, calling it out |
| `band.high_agg.playerSpotted.4` | Found him! Go! | urgent, calling it out |
| `band.high_agg.playerSpotted.5` | On him! Move! | urgent, calling it out |
| `band.high_agg.playerSpotted.6` | He's right there! | urgent, calling it out |
| `band.high_agg.taunt.1` | Come fight me! | teasing, across the yard |
| `band.high_agg.taunt.2` | Stop hiding! | teasing, across the yard |
| `band.high_agg.taunt.3` | I'm coming for you! | teasing, across the yard |
| `band.high_agg.taunt.4` | Let's go already! | teasing, across the yard |
| `band.high_agg.taunt.5` | You can't hide from me! | teasing, across the yard |
| `band.high_agg.taunt.6` | Come on, chicken! | teasing, across the yard |
| `band.high_agg.roundStart.1` | Game on! Let's go! | the game is on: loud and up |
| `band.high_agg.roundStart.2` | Here we come! | the game is on: loud and up |
| `band.high_agg.roundStart.3` | Go go go! | the game is on: loud and up |
| `band.high_agg.roundStart.4` | Let's get him! | the game is on: loud and up |
| `band.high_agg.roundStart.5` | Rush him! Rush him! | the game is on: loud and up |
| `band.high_agg.roundStart.6` | It's on, dude! | the game is on: loud and up |
| `band.high_agg.shotWhileOut.1` | Ow!! Dude, I literally have my hand in the air! | indignant: he is out and got shot anyway |
| `band.high_agg.shotWhileOut.2` | I'm OUT already!! What the heck, dude! | indignant: he is out and got shot anyway |
| `band.high_agg.shotWhileOut.3` | Hey! I'm out! Are you blind? | indignant: he is out and got shot anyway |
| `band.high_agg.shotWhileOut.4` | Dude! Hand's UP! | indignant: he is out and got shot anyway |
| `band.high_agg.playerOut.1` | I GOT HIM!! YES! | thrilled: he put someone out |
| `band.high_agg.playerOut.2` | Boom!! Got him! Did you see that?! | thrilled: he put someone out |
| `band.high_agg.playerOut.3` | YES! That's how it's done! | thrilled: he put someone out |
| `band.high_agg.playerOut.4` | Ha-ha! Got you, dude!! | thrilled: he put someone out |
| `band.high_agg.pressed.1` | Whoa! Okay, you wanna go?! | under fire, rattled |
| `band.high_agg.pressed.2` | He's shooting at me! Somebody help! | under fire, rattled |
| `band.high_agg.pressed.3` | Ha! Missed me! | under fire, rattled |
| `band.high_agg.pressed.4` | That was close! Get him! | under fire, rattled |
| `band.high_agg.allyDown.1` | They got {name}! Get 'em back! | a friend just went out ({name}: a friend’s name) |
| `band.high_agg.allyDown.2` | {name}'s out! Come on, guys! | a friend just went out ({name}: a friend’s name) |
| `band.high_agg.allyDown.3` | No way, {name}! Payback time! | a friend just went out ({name}: a friend’s name) |
| `band.high_agg.looking.1` | Nobody here! I'm going after 'em! | telling his side he is heading out to find them |
| `band.high_agg.looking.2` | I'm pushing up, come on! | telling his side he is heading out to find them |
| `band.high_agg.looking.3` | Forget this, I'm going to find 'em! | telling his side he is heading out to find them |
| `band.high_agg.looking.4` | Moving up! I'll find 'em! | telling his side he is heading out to find them |
| `band.high_agg.looking.5` | They're hiding! I'm going in! | telling his side he is heading out to find them |

### `band.mid_agg`

**Who:** seth, trey, jamie, tyler, garrett, sean, mitchell, joe, eric, rebecca, evan, christian, jordan, nathan, sophie, malik.

| Id | Line | Tone |
|---|---|---|
| `band.mid_agg.playerHit.1` | Got him! | pleased, quick: he just tagged someone |
| `band.mid_agg.playerHit.2` | Hit! | pleased, quick: he just tagged someone |
| `band.mid_agg.playerHit.3` | That's one. | pleased, quick: he just tagged someone |
| `band.mid_agg.playerHit.4` | Tagged you! | pleased, quick: he just tagged someone |
| `band.mid_agg.playerHit.5` | Nice, that landed. | pleased, quick: he just tagged someone |
| `band.mid_agg.playerHit.6` | Got you, dude! | pleased, quick: he just tagged someone |
| `band.mid_agg.npcHit.1` | Augh, okay! | caught: owning it, or groaning |
| `band.mid_agg.npcHit.2` | Fine, fair! | caught: owning it, or groaning |
| `band.mid_agg.npcHit.3` | Got me. | caught: owning it, or groaning |
| `band.mid_agg.npcHit.4` | Okay, that's a hit. | caught: owning it, or groaning |
| `band.mid_agg.npcHit.5` | Ow! Alright. | caught: owning it, or groaning |
| `band.mid_agg.npcHit.6` | Dang it. Fine. | caught: owning it, or groaning |
| `band.mid_agg.playerSpotted.1` | I see him! | urgent, calling it out |
| `band.mid_agg.playerSpotted.2` | On him! | urgent, calling it out |
| `band.mid_agg.playerSpotted.3` | Right there! | urgent, calling it out |
| `band.mid_agg.playerSpotted.4` | There he is! | urgent, calling it out |
| `band.mid_agg.playerSpotted.5` | Got him in sight! | urgent, calling it out |
| `band.mid_agg.playerSpotted.6` | Over there, over there! | urgent, calling it out |
| `band.mid_agg.taunt.1` | Where'd he go? | teasing, across the yard |
| `band.mid_agg.taunt.2` | Come on out! | teasing, across the yard |
| `band.mid_agg.taunt.3` | You can't hide forever! | teasing, across the yard |
| `band.mid_agg.taunt.4` | I know you're there. | teasing, across the yard |
| `band.mid_agg.taunt.5` | Come on, let's play! | teasing, across the yard |
| `band.mid_agg.taunt.6` | Any time now. | teasing, across the yard |
| `band.mid_agg.roundStart.1` | Game on! | the game is on: loud and up |
| `band.mid_agg.roundStart.2` | Okay, here we go! | the game is on: loud and up |
| `band.mid_agg.roundStart.3` | Let's play! | the game is on: loud and up |
| `band.mid_agg.roundStart.4` | Alright, let's do this. | the game is on: loud and up |
| `band.mid_agg.roundStart.5` | Ready or not! | the game is on: loud and up |
| `band.mid_agg.roundStart.6` | Spread out, spread out! | the game is on: loud and up |
| `band.mid_agg.shotWhileOut.1` | I'm out already!! What the heck, dude. | indignant: he is out and got shot anyway |
| `band.mid_agg.shotWhileOut.2` | Ow! My hand's up, man! | indignant: he is out and got shot anyway |
| `band.mid_agg.shotWhileOut.3` | Dude, I'm walking off! Quit it! | indignant: he is out and got shot anyway |
| `band.mid_agg.shotWhileOut.4` | Hey! I'm already out! | indignant: he is out and got shot anyway |
| `band.mid_agg.playerOut.1` | I got him!! I got him! | thrilled: he put someone out |
| `band.mid_agg.playerOut.2` | Yes! Got him! | thrilled: he put someone out |
| `band.mid_agg.playerOut.3` | Whoa, I actually got him! | thrilled: he put someone out |
| `band.mid_agg.playerOut.4` | Got him! Nice! | thrilled: he put someone out |
| `band.mid_agg.pressed.1` | Whoa, whoa! He's on me! | under fire, rattled |
| `band.mid_agg.pressed.2` | That was close! | under fire, rattled |
| `band.mid_agg.pressed.3` | I'm pinned, I'm pinned! | under fire, rattled |
| `band.mid_agg.pressed.4` | Somebody help me out here! | under fire, rattled |
| `band.mid_agg.allyDown.1` | They got {name}! | a friend just went out ({name}: a friend’s name) |
| `band.mid_agg.allyDown.2` | {name}'s down! Watch out! | a friend just went out ({name}: a friend’s name) |
| `band.mid_agg.allyDown.3` | Aw man, {name}'s out! | a friend just went out ({name}: a friend’s name) |
| `band.mid_agg.allyDown.4` | We lost {name}! Careful! | a friend just went out ({name}: a friend’s name) |
| `band.mid_agg.looking.1` | Can't see anyone. I'm moving up. | telling his side he is heading out to find them |
| `band.mid_agg.looking.2` | I'll go find 'em. | telling his side he is heading out to find them |
| `band.mid_agg.looking.3` | Heading up, see what's out there. | telling his side he is heading out to find them |
| `band.mid_agg.looking.4` | Nothing here. Going looking. | telling his side he is heading out to find them |
| `band.mid_agg.looking.5` | Moving up, I'll call it if I see 'em. | telling his side he is heading out to find them |

### `band.low_agg`

**Who:** brooke, devon, nick, owen, grant.

| Id | Line | Tone |
|---|---|---|
| `band.low_agg.playerHit.1` | Got him. | pleased, quick: he just tagged someone |
| `band.low_agg.playerHit.2` | Nice. | pleased, quick: he just tagged someone |
| `band.low_agg.playerHit.3` | Tagged. | pleased, quick: he just tagged someone |
| `band.low_agg.playerHit.4` | Yep. That's a hit. | pleased, quick: he just tagged someone |
| `band.low_agg.playerHit.5` | Saw you coming. | pleased, quick: he just tagged someone |
| `band.low_agg.playerHit.6` | Mm. Got you. | pleased, quick: he just tagged someone |
| `band.low_agg.npcHit.1` | Mm, okay. | caught: owning it, or groaning |
| `band.low_agg.npcHit.2` | Yeah, fair. | caught: owning it, or groaning |
| `band.low_agg.npcHit.3` | Got me. | caught: owning it, or groaning |
| `band.low_agg.npcHit.4` | Good shot. | caught: owning it, or groaning |
| `band.low_agg.npcHit.5` | Okay. I'm out. | caught: owning it, or groaning |
| `band.low_agg.npcHit.6` | Fair enough. | caught: owning it, or groaning |
| `band.low_agg.playerSpotted.1` | I have him. | urgent, calling it out |
| `band.low_agg.playerSpotted.2` | He's there. | urgent, calling it out |
| `band.low_agg.playerSpotted.3` | Got eyes. | urgent, calling it out |
| `band.low_agg.playerSpotted.4` | There he is. | urgent, calling it out |
| `band.low_agg.playerSpotted.5` | Got him lined up. | urgent, calling it out |
| `band.low_agg.playerSpotted.6` | He's in the open. | urgent, calling it out |
| `band.low_agg.taunt.1` | Take your time. | teasing, across the yard |
| `band.low_agg.taunt.2` | I can wait. | teasing, across the yard |
| `band.low_agg.taunt.3` | He'll show himself. | teasing, across the yard |
| `band.low_agg.taunt.4` | Still here. | teasing, across the yard |
| `band.low_agg.taunt.5` | No rush. | teasing, across the yard |
| `band.low_agg.taunt.6` | I'm not going anywhere. | teasing, across the yard |
| `band.low_agg.roundStart.1` | Game on. | the game is on: loud and up |
| `band.low_agg.roundStart.2` | Okay. Here we go. | the game is on: loud and up |
| `band.low_agg.roundStart.3` | Everybody find a spot. | the game is on: loud and up |
| `band.low_agg.roundStart.4` | Eyes open. | the game is on: loud and up |
| `band.low_agg.roundStart.5` | Take it slow. | the game is on: loud and up |
| `band.low_agg.roundStart.6` | Nice and easy. | the game is on: loud and up |
| `band.low_agg.shotWhileOut.1` | Ow. I'm out, man. | indignant: he is out and got shot anyway |
| `band.low_agg.shotWhileOut.2` | Seriously? My hand is up. | indignant: he is out and got shot anyway |
| `band.low_agg.shotWhileOut.3` | Okay, that's overshooting. | indignant: he is out and got shot anyway |
| `band.low_agg.shotWhileOut.4` | I'm already out, dude. | indignant: he is out and got shot anyway |
| `band.low_agg.playerOut.1` | Got him. That's it. | thrilled: he put someone out |
| `band.low_agg.playerOut.2` | And he's out. | thrilled: he put someone out |
| `band.low_agg.playerOut.3` | Clean hit. He's done. | thrilled: he put someone out |
| `band.low_agg.playerOut.4` | There we go. Got him. | thrilled: he put someone out |
| `band.low_agg.pressed.1` | Taking fire. | under fire, rattled |
| `band.low_agg.pressed.2` | He's got me pinned. | under fire, rattled |
| `band.low_agg.pressed.3` | Close one. | under fire, rattled |
| `band.low_agg.pressed.4` | Staying down, he's on me. | under fire, rattled |
| `band.low_agg.allyDown.1` | {name}'s out. Careful. | a friend just went out ({name}: a friend’s name) |
| `band.low_agg.allyDown.2` | We lost {name}. | a friend just went out ({name}: a friend’s name) |
| `band.low_agg.allyDown.3` | They got {name}. Stay low. | a friend just went out ({name}: a friend’s name) |
| `band.low_agg.looking.1` | Nothing from here. I'll move up. | telling his side he is heading out to find them |
| `band.low_agg.looking.2` | Going for a look. | telling his side he is heading out to find them |
| `band.low_agg.looking.3` | Moving up. Quietly. | telling his side he is heading out to find them |
| `band.low_agg.looking.4` | Can't see them. Heading out. | telling his side he is heading out to find them |
| `band.low_agg.looking.5` | I'll go take a look. | telling his side he is heading out to find them |

### `excuse`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `excuse.behind.1` | From behind? Seriously? | whining, defensive: why that tag did not count |
| `excuse.behind.2` | Dude, I wasn't even looking! | whining, defensive: why that tag did not count |
| `excuse.behind.3` | You shot me in the back, that's so cheap! | whining, defensive: why that tag did not count |
| `excuse.behind.4` | I didn't even see you, that's not fair! | whining, defensive: why that tag did not count |
| `excuse.far.1` | From way over there? That was pure luck! | whining, defensive: why that tag did not count |
| `excuse.far.2` | No way you aimed that from a mile away. | whining, defensive: why that tag did not count |
| `excuse.far.3` | Lucky shot! You couldn't even see me! | whining, defensive: why that tag did not count |
| `excuse.far.4` | That was a total fluke, dude. | whining, defensive: why that tag did not count |
| `excuse.close.1` | Way too close! That doesn't count! | whining, defensive: why that tag did not count |
| `excuse.close.2` | Dude, you can't shoot me from right there! | whining, defensive: why that tag did not count |
| `excuse.close.3` | That's point blank, man! Not cool! | whining, defensive: why that tag did not count |
| `excuse.close.4` | Ow! You were like two feet away! | whining, defensive: why that tag did not count |
| `excuse.moving.1` | I was running! That doesn't count! | whining, defensive: why that tag did not count |
| `excuse.moving.2` | Only 'cause I was moving, dude. | whining, defensive: why that tag did not count |
| `excuse.moving.3` | I tripped! I totally tripped! | whining, defensive: why that tag did not count |
| `excuse.moving.4` | You only got me 'cause I was out in the open. | whining, defensive: why that tag did not count |
| `excuse.any.1` | My gun jammed, I swear! | whining, defensive: why that tag did not count |
| `excuse.any.2` | The sun was in my eyes! | whining, defensive: why that tag did not count |
| `excuse.any.3` | That barely touched me! | whining, defensive: why that tag did not count |
| `excuse.any.4` | Whatever, your gun's way better than mine. | whining, defensive: why that tag did not count |
| `excuse.any.5` | I wasn't even ready! | whining, defensive: why that tag did not count |
| `excuse.any.6` | It bounced off a branch first! | whining, defensive: why that tag did not count |

### `teammate`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `teammate.1` | Push up with me! | to a friend on his side, half whisper |
| `teammate.2` | I got your back! | to a friend on his side, half whisper |
| `teammate.3` | Cover me, I'm moving! | to a friend on his side, half whisper |
| `teammate.4` | Watch the left side! | to a friend on his side, half whisper |
| `teammate.5` | Stay low, stay low! | to a friend on his side, half whisper |
| `teammate.6` | They're over there somewhere. | to a friend on his side, half whisper |
| `teammate.7` | Go, go, I'll cover you! | to a friend on his side, half whisper |
| `teammate.8` | Stick with me, dude. | to a friend on his side, half whisper |
| `teammate.9` | You see any of them? | to a friend on his side, half whisper |
| `teammate.10` | Let's flank around the house. | to a friend on his side, half whisper |

### `infection`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `infection.1` | We're gonna get you, dude! | goofy zombie voice, playing tag |
| `infection.2` | Oooh, I'm a zombie! | goofy zombie voice, playing tag |
| `infection.3` | Braaains... just kidding, you're it! | goofy zombie voice, playing tag |
| `infection.4` | You can't run forever! | goofy zombie voice, playing tag |
| `infection.5` | Here we come! | goofy zombie voice, playing tag |
| `infection.6` | One touch and you're one of us! | goofy zombie voice, playing tag |
| `infection.7` | Get him! Get him! | goofy zombie voice, playing tag |
| `infection.8` | Rrraaah! Zombie! | goofy zombie voice, playing tag |
| `infection.9` | You're gonna be infected! | goofy zombie voice, playing tag |
| `infection.10` | We're coming for youuu! | goofy zombie voice, playing tag |
| `infection.11` | Zombie arms! Zombie arms! | goofy zombie voice, playing tag |
| `infection.12` | Tag, you're dead! Just kidding! | goofy zombie voice, playing tag |

### `noodle`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `noodle.1` | A POOL NOODLE?! Are you serious?! | outraged and laughing: hit with a pool noodle |
| `noodle.2` | Dude, you got me with a NOODLE. | outraged and laughing: hit with a pool noodle |
| `noodle.3` | That does not count! ...It counts, doesn't it. | outraged and laughing: hit with a pool noodle |
| `noodle.4` | I just got noodled. Great. | outraged and laughing: hit with a pool noodle |
| `noodle.5` | Ow! Okay, that one actually stung. | outraged and laughing: hit with a pool noodle |
| `noodle.6` | Who brings a pool noodle to airsoft?! | outraged and laughing: hit with a pool noodle |

### `squad`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `squad.push.1` | Copy, pushing! | over a walkie, answering an order |
| `squad.push.2` | Moving up! | over a walkie, answering an order |
| `squad.push.3` | Going, going! | over a walkie, answering an order |
| `squad.push.4` | Pushing up, cover me! | over a walkie, answering an order |
| `squad.cover.1` | Copy, getting behind something! | over a walkie, answering an order |
| `squad.cover.2` | Taking cover! | over a walkie, answering an order |
| `squad.cover.3` | Finding cover! | over a walkie, answering an order |
| `squad.distance.1` | Copy, hanging back. | over a walkie, answering an order |
| `squad.distance.2` | Backing off! | over a walkie, answering an order |
| `squad.distance.3` | Keeping my distance. | over a walkie, answering an order |
| `squad.follow.1` | Right behind you! | over a walkie, answering an order |
| `squad.follow.2` | Copy, on you! | over a walkie, answering an order |
| `squad.follow.3` | Following! | over a walkie, answering an order |
| `squad.follow.4` | Lead the way! | over a walkie, answering an order |

### `home`

**Who:** every kid.

| Id | Line | Tone |
|---|---|---|
| `home.1` | Hey. | relaxed, hanging out in Mike’s room |
