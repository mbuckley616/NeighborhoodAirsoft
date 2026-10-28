# WIP (builder, 28 Oct, not a release): D.58 parked here
This branch holds D.58 (Priya out, Joe and Chris in) as far as it got. Everything in `docs/devlog/v1.366.md` is built,
with one exception: Protect Ryan is back to the first placement (Joe at Mitchell's old spot, `bulb_car1`). From there
`tests/vip-cover.test.mjs` fails "no kid stands within 0.5 m of the VIP for over 1 s". Joe, pushier than Mitchell
was, walks his advance through the bulb fort, right through Mitchell (their VIP now), for 1.1-3.3 s in 5 of 6 rounds.
Tried and dropped:
- A push out of a VIP's 0.6 m: it wedged Joe in the fort (6 m walked a round, 0 shots).
- Owen to the bulb car and Joe to Owen's east-car start: nobody came near the VIP, but `vip-spawn` failed. Owen sat
  in `deploying` at (34.2, 0.5) and never reached his anchor.
Passed on this placement: pincer, vip, vip-spawn, crew-field, pickup-ffa, bulb-sight, voices, smoke, crew-balance.
school-kids crashed its browser under load, and is owed.
Next: another start for Joe in Protect Ryan whose advance doesn't cross the fort (or a fix to how a kid routes past a
crouched teammate). Then rename this file's content into v1.NNN.md with a fresh `tag.mjs bump`, and delete this file.
