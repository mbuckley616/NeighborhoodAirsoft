# What CI runs (Michael in chat, 19 Oct 2026)

"Port the docs-only skip and the test-what-you-touch selection (plus the build-number stamp if it has one). Keep my review
on merges there for now." Ported from The Old Gates' pipeline, adapted to this repo's one-file game. Merging changed on 26 Oct
(below): decided work merges itself on green.

On 19 Oct The Old Gates' test runs filled the GitHub account's shared pool of 40 jobs and Airsoft's runs sat queued behind
them. Every Airsoft PR, docs included, ran all ten hour-long shards, and every push to a branch with an open PR ran them
twice (once for the push, once for the PR).

## What CI does now (`.github/workflows/check.yml`; basic tests, Michael in chat, 20 Oct 2026)
Michael, for every game: "This is a game I am making for fun, and do not plan to ever charge for. We don't need bulletproof
testing in this manner. Why can't we just have basic tests?" Every suite boots the whole game; the full run of 175 suites
is about 300 minutes in ten shards, and it ran on main after each merge, in the same pool of runners as The Old Gates'.
- **Pushes to branches do not run CI on their own.** A branch is tested through its pull request.
- **A docs-only PR runs no game suites**: only `docs/` or `.md` files (`devlog.md`, `CLAUDE.md`) changed. Parse still runs.
- **A code PR runs the smoke set and the suites it adds or edits** (`tests/lib/select.mjs`): `smoke`, `autosave`,
  `map-screen` and `pause-menu`, about three minutes of suites in one shard. The selection by the names a change reaches
  (19 Oct, `tests/lib/toplevel.cjs`) is gone.
- **Every suite runs once a week**, Sunday at 06:00 UTC, and on any branch when `check` is run by hand from the Actions tab.
  Main no longer runs every suite after each merge. The producer files each red of the weekly run in the backlog for the
  builder.
- **A new commit on a PR cancels that PR's older run.**
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
- **The build-number stamp.** The Old Gates' build number only counts builds, so main can set it. Airsoft's `v1.NN` names
  each piece of work: the devlog entry, the backlog's `done, v1.NN`, the `// v1.NN:` comments in the code, Slack posts and
  the control room all use the number the builder picks while it works. If main set it at merge, a batch of several
  versions would land as one number and none of those references would know their number until after the merge. Left as
  it is unless Michael wants that changed.

## Automerge on green (Michael in chat, 26 Oct 2026)
"Change the freeze rule so the builder keeps working during Fable cards, and switch decided work to automerge on green like
Old Gates." Ported from The Old Gates' `automerge` (19 Oct there). From 1 to 26 Oct a builder version waited a median of 8
hours (90th percentile 23) between its commit and main, for a tap on work Michael had already decided.
- **`automerge`** (`.github/workflows/automerge.yml`, `scripts/automerge.mjs`) runs when a `check` run finishes and every
  fifteen minutes. It merges an open PR whose `gate` is green on its head and which merges cleanly, unless it is a draft.
- **No tap** for a PR that leaves the pipeline alone and has no `hold` label: the builder's, the Fable session's, the
  critic's and the producer's.
- **A tap** for a PR labelled `hold` (any role may put it on, saying why; Michael may put it on anything) and for a PR that
  changes the pipeline (`.github/`, `tests/lib/`, `tests/run.mjs`, `scripts/automerge.mjs`): it merges on the comment
  `Approved by Michael: <sha>` from the repository's owner side, which the producer posts when he taps Approve. A held PR
  merges only at the approved head. A pipeline PR's later commits that leave the pipeline alone ride along; one that changes
  the pipeline again waits for a new tap, and the approved commit is merged by itself meanwhile.
- **Drafts never merge.** The builder opens its PR as a draft and marks it ready when its run ends; the Fable session keeps
  its PR a draft until the card is finished.
- **itch.io.** A merge made with the workflow's own token starts no push workflow, so after a merge that changed
  `index.html` or `js/` automerge starts `itch` on main by name. Every landing of game code ships to players: the folder,
  index.html and js/ (v1.355, D.75).
- **The title's version** (v1.355): no branch edits it. After any merge automerge.yml runs `node scripts/tag.mjs stamp` on
  main (the highest version in `docs/devlog/`), commits it with `[skip ci]`, and only then starts itch.
- `DRY_RUN=1 GH_TOKEN=$(gh auth token) node scripts/automerge.mjs` says what it would merge and changes nothing.
