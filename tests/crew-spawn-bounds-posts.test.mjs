// v1.393 (D.57 step 1): tests/crew-spawn-bounds.test.mjs's start checks (every kid inside the field, no two on one spot
// or one post) over the 14 matches your crew plays from `crewPosts`: the 12 solo matches turned crew and the 2 CLUTCH.
// Split off because one suite over all 46 ran past run.mjs's 10 minutes.
globalThis.CSB_POSTS = true;
await import('./crew-spawn-bounds.test.mjs');
