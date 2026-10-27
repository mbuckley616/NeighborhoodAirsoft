// Merge every open pull request that is ready (Michael in chat, 26 Oct 2026: "switch decided work to automerge on green like
// Old Gates"; ported from The Old Gates' scripts/automerge.mjs; .github/workflows/automerge.yml runs it). Michael decides
// designs, not merges: a PR that builds what he has decided merges itself once it passes. Ready: `check`'s gate is green on
// the commit, GitHub can merge it cleanly, it is not a draft (the builder and the deep-work session keep theirs as drafts
// while a run is still working), and
//   - it leaves the pipeline alone (.github/, the test harness tests/lib/ and tests/run.mjs, this script) and has no `hold`
//     label: no approval; or
//   - it changes the pipeline or is labelled `hold` (Michael's, or any role's that wants his eyes before players get it), and
//     Michael approved it: a comment on the PR from the repository's owner side, "Approved by Michael: <sha>". Later commits
//     that leave the pipeline alone, or merge main in, ride along; if a later commit changes the pipeline again, the approved
//     commit is merged by itself and the PR waits for a new approval. A held PR's approval covers its head only.
// Main ships to players (itch.yml), but a merge made with the workflow's own token starts no push workflow, so after a merge
// that changed the game (index.html or js/, v1.354) itch is started on main by name: by automerge.yml's last step, after it has
// stamped the title (scripts/tag.mjs stamp), when this runs there (it writes merged= and game= to $GITHUB_OUTPUT); by this
// script itself when run anywhere else. DRY_RUN=1 says what it would do and changes nothing.
const TOKEN = process.env.GH_TOKEN, REPO = process.env.REPO || 'mbuckley616/NeighborhoodAirsoft', DRY = !!process.env.DRY_RUN;
const API = `https://api.github.com/repos/${REPO}`;
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const APPROVAL = /^Approved by Michael\b[^\n]*?\b([0-9a-f]{7,40})\b/m;

async function gh(path, method = 'GET', body) {
  const r = await fetch(path.startsWith('http') ? path : API + path, { method, body: body && JSON.stringify(body),
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) { const e = new Error(`${method} ${path}: ${r.status} ${typeof data === 'object' && data ? data.message : text}`); e.status = r.status; throw e; }
  return data;
}
async function all(path) { const out = []; for (let p = 1; ; p++) { const page = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${p}`); out.push(...page); if (page.length < 100) return out; } }

const PIPELINE = f => f.startsWith('.github/') || f.startsWith('tests/lib/') || f === 'tests/run.mjs' || f === 'scripts/automerge.mjs';
const lowRisk = f => !PIPELINE(f);
// v1.354 (D.75): the game is index.html and the js/ files it loads
const GAME = f => f === 'index.html' || f.startsWith('js/');

// green: the gate passed on that commit
async function green(sha) {
  const runs = (await gh(`/commits/${sha}/check-runs?per_page=100`)).check_runs;
  const gate = runs.filter(r => r.name === 'gate').sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0];
  return !!gate && gate.status === 'completed' && gate.conclusion === 'success';
}

async function onMain(sha) { try { const c = await gh(`/compare/main...${sha}`); return c.status === 'behind' || c.status === 'identical'; } catch (e) { return false; } }

// do the commits after the approved one change only low-risk files (merges of main count as nothing)?
async function onlyLowRiskSince(approved, head) {
  const cmp = await gh(`/compare/${approved}...${head}`);
  for (const c of cmp.commits) {
    if (c.parents.length > 1) { if (await onMain(c.parents[1].sha)) continue; return { ok: false, why: `${c.sha.slice(0, 7)} merges another branch` }; }
    const files = (await gh(`/commits/${c.sha}`)).files.map(f => f.filename);
    const bad = files.find(f => !lowRisk(f));
    if (bad) return { ok: false, why: `${c.sha.slice(0, 7)} changes ${bad}` };
  }
  return { ok: true };
}

async function say(n, body, comments) {
  if (comments.some(c => c.body.trim() === body.trim())) return;
  console.log(`  #${n}: ${body}`);
  if (!DRY) await gh(`/issues/${n}/comments`, 'POST', { body });
}

let merged = 0, game = false;
for (const pr of await all('/pulls?state=open&base=main')) {
  const n = pr.number, head = pr.head.sha;
  try {
    if (pr.draft) { console.log(`#${n} ${pr.head.ref}: draft`); continue; }
    if (!(await green(head))) { console.log(`#${n} ${pr.head.ref}: not green on ${head.slice(0, 7)}`); continue; }
    const full = await gh(`/pulls/${n}`);
    if (full.mergeable === false || full.mergeable_state === 'dirty') { console.log(`#${n}: conflicts with main`); continue; }
    const files = (await all(`/pulls/${n}/files`)).map(f => f.filename);
    const held = (pr.labels || []).some(l => l.name === 'hold');
    let target = null, why = '';
    if (!held && files.every(lowRisk)) { target = head; why = 'gate green; no pipeline files'; }
    else {
      const comments = await all(`/issues/${n}/comments`);
      const approvals = comments.filter(c => TRUSTED.has(c.author_association) && APPROVAL.test(c.body));
      const last = approvals[approvals.length - 1];
      const waits = held ? 'is held' : 'changes the pipeline';
      if (!last) { console.log(`#${n}: ${waits}; waiting for Michael's approval`); continue; }
      const approved = APPROVAL.exec(last.body)[1];
      if (head.startsWith(approved)) { target = head; why = `approved at ${approved.slice(0, 7)}`; }
      else if (held) { console.log(`#${n}: held; approved ${approved.slice(0, 7)} is not the head ${head.slice(0, 7)}`); continue; }
      else {
        const since = await onlyLowRiskSince(approved, head);
        if (since.ok) { target = head; why = `approved at ${approved.slice(0, 7)}; later commits leave the pipeline alone`; }
        else if (await onMain(approved)) { console.log(`#${n}: the approved ${approved.slice(0, 7)} is on main; later commits wait for a new approval (${since.why})`); continue; }
        else if (await green(approved)) {
          console.log(`#${n}: merging the approved ${approved.slice(0, 7)} alone (${since.why})`);
          if (!DRY) await gh('/merges', 'POST', { base: 'main', head: approved, commit_message: `Merge ${pr.head.ref} at ${approved.slice(0, 7)} (PR #${n}), approved by Michael\n\nLater commits wait for a new approval: ${since.why}.` });
          await say(n, `automerge: merged the approved ${approved.slice(0, 7)} into main. Later commits wait for a new approval on the control room (${since.why}).`, comments);
          merged++; game = true; continue;
        } else { await say(n, `automerge: ${since.why} after the approved ${approved.slice(0, 7)}, and ${approved.slice(0, 7)} is not green, so this waits for a new approval.`, comments); continue; }
      }
    }
    console.log(`#${n} ${pr.head.ref}: merging ${target.slice(0, 7)} (${why})`);
    if (!DRY) await gh(`/pulls/${n}/merge`, 'PUT', { sha: target, merge_method: 'merge', commit_title: `Merge ${pr.head.ref} (PR #${n}): ${pr.title}`.slice(0, 250), commit_message: `automerge: gate green on ${target.slice(0, 7)}; ${why}.` });
    merged++; if (files.some(GAME)) game = true;
  } catch (e) { console.log(`#${n}: ${e.message}`); }
}

if (process.env.GITHUB_OUTPUT) (await import('fs')).appendFileSync(process.env.GITHUB_OUTPUT, `merged=${DRY ? 0 : merged}\ngame=${game && !DRY ? 1 : 0}\n`);
else if (game && !DRY)
  try { await gh('/actions/workflows/itch.yml/dispatches', 'POST', { ref: 'main' }); console.log('started itch on main'); } catch (e) { console.log(`dispatch itch.yml: ${e.message}`); }
console.log(`${merged} merged${DRY ? ' (dry run)' : ''}`);
