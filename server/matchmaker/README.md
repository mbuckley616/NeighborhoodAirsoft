# The room list's matchmaker

A tiny server that keeps the list of open online rooms for Neighborhood Airsoft (backlog D.2 step 3, v1.460). It runs as a
**Cloudflare Worker** on Cloudflare's **free plan**: no card, nothing to pay. The game works without it; until its address
is pasted into the game, rooms are joined by their four-letter code only, as before.

What it does: a host who sets his room to **Listed** sends the room's code, his name, the map, the match and how many are
in it every 15 seconds. Anyone on the online screen sees the list (refreshed every 10 seconds) and joins with one click,
which does exactly what typing the code does. A room drops off the list when its host leaves, when its match starts (it
comes back when they are back in the room), or 45 seconds after the host's last word if his game vanished. The players'
games still talk to each other directly (WebRTC, through PeerJS's free service, as since v1.230): the matchmaker only
keeps the list. It stores nothing on disk, keeps no addresses and has no secrets.

## Files
- `rooms.mjs` — the rules (what a room is, who may change it, when it is stale). Plain JavaScript, no Cloudflare in it;
  `tests/room-list.test.mjs` runs it in Node as the game's stand-in matchmaker.
- `worker.mjs` — the Worker: one Durable Object, `Lobby`, holds the list, so every player sees the same one.
- `wrangler.toml` — the Worker's settings for `wrangler`, Cloudflare's command-line tool.

## Deploy it (about 15 minutes, once; with a local Claude Code session if you like)
You need Node.js 18 or later on your computer.

1. **Make the free account.** Go to https://dash.cloudflare.com/sign-up and sign up with an email and a password. No
   card is asked for. On first sign-in Cloudflare offers to pick a `workers.dev` subdomain (Workers & Pages → it asks for
   one): pick any name, e.g. your initials. Your Workers are then at `https://<worker>.<subdomain>.workers.dev`.
2. **Get the repo onto your computer** (a local session already has it) and open a terminal in `server/matchmaker/`.
3. **Sign in from the terminal:** `npx wrangler login`. A browser tab asks you to allow Wrangler; allow it.
4. **Deploy:** `npx wrangler deploy`. It prints the address at the end, something like
   `https://nbhd-airsoft-matchmaker.<subdomain>.workers.dev`.
5. **Check it:** open that address in a browser. It should say
   `{"ok":true,"what":"Neighborhood Airsoft matchmaker","rooms":"/rooms"}`. Add `/rooms` to the address: it should say
   `{"rooms":[]}`.
6. **Point the game at it:** in `js/94-pickup-online.js`, set the one setting
   `const NET_MATCHMAKER_URL = 'https://nbhd-airsoft-matchmaker.<subdomain>.workers.dev';` (no slash at the end is
   needed), commit, and open a PR (or ask the builder to). When it lands, itch.io gets it.
7. **Check it in the game:** on two computers (or two browser windows), press ONLINE on the title. One presses HOST A
   ROOM and sets **Who sees it** to **Listed**; within ten seconds the other's **Open rooms** shows "<name>'s room · 2v2
   on Winnmark Court · 1/6" with a JOIN. JOIN puts them in the room. `/rooms` in the browser shows the same room.

If something goes wrong, the game says "Couldn't reach the room list. Join by the code instead." and codes keep working.

## What it costs
Nothing. The Workers free plan allows 100,000 requests a day, and Durable Objects on the free plan (SQLite-backed, which
`wrangler.toml` asks for) another 100,000. A listed room sends 240 words an hour and an open online screen asks 360 times
an hour, so a few dozen people playing every evening stays far inside it. Past the daily allowance Cloudflare refuses
requests until midnight UTC rather than charging; the game then falls back to codes. Nothing can be billed on a free
account.

## Notes
- The repo is public, so nothing here is secret, and nothing secret should be added. `wrangler login` keeps your
  Cloudflare sign-in on your computer, not in the repo.
- Anyone who knows the address could list a fake room; joining it just fails with "No room with that code", the same as
  a mistyped code. Only a room's own host can change or remove it (his game sends a random key with each word).
- To take it down: `npx wrangler delete` in this folder, and set the game's setting back to `''`.
