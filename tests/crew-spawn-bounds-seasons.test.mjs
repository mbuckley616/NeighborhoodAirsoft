// v1.486 (D.96): tests/crew-spawn-bounds.test.mjs's start checks (every kid inside the field, no two on one spot or one
// post) over the fall's and winter's team matches, posts or not. Split off because the summer's two suites are already
// near run.mjs's 10 minutes.
globalThis.CSB_SEASON = true;
await import('./crew-spawn-bounds.test.mjs');
