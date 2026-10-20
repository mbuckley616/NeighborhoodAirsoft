# What CI runs (Michael in chat, 19 Oct 2026)

"Port the docs-only skip and the test-what-you-touch selection (plus the build-number stamp if it has one). Keep my review
on merges there for now." Ported from The Old Gates' pipeline, adapted to this repo's one-file game. Merging is unchanged:
code reaches `main` only after Michael approves.

On 19 Oct The Old Gates' test runs filled the GitHub account's shared pool of 40 jobs and Airsoft's runs sat queued behind
them. Every Airsoft PR, docs included, ran all ten hour-long shards, and every push to a branch with an open PR ran them
twice (once for the push, once for the PR).

## What CI does now (`.github/workflows/check.yml`)
- **Pushes to branches no longer run CI on their own.** A branch is tested through its pull request. Main is tested after
  every merge. Any branch can still be run by hand from the Actions tab (every suite).
- **A docs-only PR runs no game suites**: only `docs/` or `.md` files (`devlog.md`, `CLAUDE.md`) changed. Parse still runs.
- **A code PR runs only the suites its change can reach**, plus four quick ones (`smoke`, `autosave`, `map-screen`,
  `pause-menu`), in one shard per ~24 minutes of suites. `tests/lib/select.mjs` decides, with `tests/lib/toplevel.cjs`:
  - each changed line of `index.html`'s script sits inside one top-level function or constant; that name counts. A line
    inside one entry of a big table (`SCENARIOS`, `CHARACTERS`, `GUN_SPECS`, `VOICE_LINES`, `Game` …) counts as that entry's
    key: a change to Protect Ryan's entry names `bunratty_vip`, not `SCENARIOS`.
  - the functions that call a changed name count too (one step), unless more than twelve do, or the caller is one most
    suites use to drive the game (`stepGame`, named by 99 of 170 suites to move the clock).
  - a suite runs when its own file mentions one of those names, or when the suite itself changed.
  - blank and comment-only lines, the version label, and new lines in `run.mjs`'s table of suite times count for nothing.
- **Some changes run everything**: the page outside the script (its HTML and CSS), the test harness (`tests/lib/`,
  `tests/run.mjs`, the vendored three.js), CI, packages, `parsecheck`, and any selection worth more than half the full run.
- **Main runs every suite after each merge**, and the next merge does not cancel a run in progress. A break the selection
  missed shows there. A new commit on a PR still cancels that PR's older run.
- **One check, `gate`,** says whether a PR is fit to merge: parse passed, and the suites passed or were not needed. It
  replaces the old `headless` check.

## Measured on the PRs merged 12-19 Oct (36 PRs)
| | PRs | test shards each |
|---|---|---|
| Docs only (producer, critic) | 18 | 0 (was 10) |
| Code, a selection | 8 | 1-5 (was 10) |
| Code, everything | 10 | 10 |

243 fewer test jobs of up to 40 minutes over the week (360 before, 117 after), not counting the push runs that no longer happen.
Single builder versions, one at a time: v1.272 2 shards (31 suites), v1.271 2 (29), v1.270 1 (5), v1.269 1 (19).

## Not ported
- **Auto-merge**: Michael keeps his review on Airsoft merges.
- **The build-number stamp.** The Old Gates' build number only counts builds, so main can set it. Airsoft's `v1.NN` names
  each piece of work: the devlog entry, the backlog's `done, v1.NN`, the `// v1.NN:` comments in the code, Slack posts and
  the control room all use the number the builder picks while it works. If main set it at merge, a batch of several
  versions would land as one number and none of those references would know their number until after the merge. Left as
  it is unless Michael wants that changed.
