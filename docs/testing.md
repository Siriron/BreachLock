# Manual Test Plan

> ## ⚠️ HISTORICAL RECORD — READ THIS FIRST
>
> **The contract's design changed after this document was written.**
> The evidence-fetch mechanism this entire test plan is built around
> (`repo_owner`/`repo_name`/`commit_hash`/`file_path`, contract-
> constructed fetch URLs, the fetch-failure retry counter) was **removed
> entirely** after extensive live testing found that GenVM's sandbox
> consistently, deterministically rejects outbound fetches to external
> domains with `SystemError:6: forbidden` — confirmed against three
> structurally unrelated real domains (GitHub, GitLab, an IPFS gateway).
>
> **Everything below this banner describes that removed mechanism and
> is preserved as historical record, not as a current, actionable test
> plan.** The current contract (see `docs/contracts.md`'s "Design
> history" section for the honest summary) takes a `disputed_claim`
> free-text field instead of the four identity fields, and has no
> fetch, no retry counter, and no fetch-failure branch to test at all.
> If picking this project back up to test the *current* contract, most
> of Priority 1 below no longer applies — the current write functions
> are `file_bounty(disputed_claim, claimed_severity)`,
> `rebut(bounty_id, project_rebuttal)`, and `resolve_dispute(bounty_id)`,
> and the interesting edge cases now are things like empty/very short
> claims, an unrebutted deadline expiry (Priority 1b below is still
> directly relevant and unchanged), and settlement math (Priority 2/
> the settlement section of `docs/contracts.md`, also unchanged) — not
> anything related to fetching.
>
> **Update (Aug 6 2026): the current claim-based contract is now
> deployed** — StudioNet `0x950d2497Ac764dead125EF95209eC28deE34517d`,
> Bradbury `0x04e379Db6e62b6851D4B85D3E31A1D32B49DF900` (see
> `docs/deployment.md` for deploy-tx detail). Nothing has been run
> against these addresses yet. All bounty numbers, transaction hashes,
> and the specific contract address referenced anywhere below this
> point belong to the *old*, now-superseded fetch-based deployment —
> useful as a record of what was tested and found, not as pointers to
> anything currently live.

Nothing in this contract has touched a real GenVM runtime yet — the
build environment had no network access, so everything so far is
Python-level logic testing and static audit. This plan is ordered by
priority, not by how the code reads top to bottom, because two of the
two real bugs found during self-audit lived in edge cases a happy-path
test would never reach. Run the edge cases *before* declaring the
happy path "done" — a write function working through its early stages
does not mean it's verified end to end (this exact lesson is why
project knowledge's own nondet bug catalog exists).

Use GenLayer Studio's "Run and Debug" panel
(studio.genlayer.com/run-debug) for all of this — it deploys directly
and exposes every write/view with an input form, no wallet or frontend
redeploy needed.

## Priority 1 — edge cases that produced real bugs in this build

### 1a. Unreachable reporter-cited commit

- File a bounty with a syntactically valid but nonexistent
  `commit_hash` (or a real repo/path but a hash that was never
  committed).
- Call `resolve_dispute`.
- **Expected:** resolves directly to `verdict_severity: "invalid"`,
  `confidence_bps: 1000`, a `reasoning_summary` explaining the source
  was unreachable, `status: "resolved"`. The response should include
  `"note": "resolved without consensus: reporter-cited source
  unreachable"`.
- **What this is checking:** the fix for the status-stuck-forever bug
  (see `docs/contracts.md`). If this instead throws an error and
  leaves the bounty stuck at `"filed"` on a second call, the fix did
  not work as intended and needs re-examination — do not assume the
  code-level fix transferred correctly to actual GenVM execution
  without seeing this pass live.

### 1b. Unrebutted bounty past the 14-day deadline

- File a bounty. Do not call `rebut`.
- Either wait 14 real days, or (for faster testing) confirm with
  whoever manages the Studio test environment whether contract-clock
  time can be manipulated for testing; if not, this specific case may
  need to be tested against real elapsed time.
- Call `resolve_dispute` after the deadline.
- **Expected:** succeeds without a rebuttal ever being filed. Status
  moves `filed` → `response_expired` → `resolved`. Verdict is reached
  using the reporter's report and the fetched code alone, with an empty
  rebuttal.
- Also check: calling `resolve_dispute` *before* the deadline with no
  rebuttal correctly rejects with "response window still open."

### 1c. Path-traversal / segment-injection attempt

- File a bounty with `repo_owner` containing `../` or an embedded `/`
  (e.g. `"victim/../attacker"`).
- **Expected:** the assert in `file_bounty` should either reject it
  outright (if sanitization reduces it to empty) or accept a cleaned
  value with **no `/` anywhere in it**. Check the stored value via
  `get_bounty` and confirm `repo_owner` contains no slash at all.
- Separately, confirm a legitimate multi-segment `file_path` (e.g.
  `"src/lib/utils/parser.py"`) is preserved exactly, not mangled.

## Priority 2 — happy paths

### 2a. Full lifecycle, project engages, report holds up

`file_bounty` → `rebut` (with a real or plausible patch commit) →
`resolve_dispute`. Confirm: `execution_result: SUCCESS` on all
participating nodes, non-empty `reasoning_summary`, verdict severity is
one of `critical`/`high`/`medium`/`low` (not `invalid`), settlement
transfers land correctly — reporter's full stake returned, 80% of
project's stake transferred to reporter, 20% to protocol pool (check
`get_protocol_pool` before/after).

### 2b. Full lifecycle, report does not hold up

Same as 2a, but craft a report that doesn't actually match the fetched
code (e.g. claim a vulnerability in a file that doesn't have it).
Confirm `verdict_severity: "invalid"`, and settlement moves 80% of the
reporter's stake to the project, 20% to the pool, project's own stake
refunded.

## Priority 3 — consensus behavior (expected variance, not bugs)

- Run 2a against an intentionally ambiguous report (real code, genuine
  disagreement possible on severity). A leader-rotation round (2+
  consensus rounds before finalizing) is healthy, expected behavior —
  confirmed pattern from prior GenLayer builds in this project. Check
  `execution_result` (`SUCCESS` vs `ERROR`) to distinguish healthy
  disagreement from an actual crash; a vote split where every node
  shows `SUCCESS` is fine, one where any node shows `ERROR` needs real
  investigation.
- Confirm confidence-score variance between leader and validators stays
  within the 200bps tolerance band on a clean run, and that a
  malformed/garbage LLM response correctly forces `validator_fn` to
  return `False` rather than the contract trying to force agreement on
  bad output.

## Priority 4 — frontend integration

- Confirm `writeContractMethod` correctly surfaces a timeout (waiting
  several minutes on a judged write) without treating it as a failure —
  the UI should show the "still waiting on consensus" message with a
  tx hash, not a bare error.
- Confirm the network toggle in the navbar does **not** trigger a
  wallet popup on click alone — only `ensureChain()` at actual write
  time should prompt a chain switch.
- Confirm wallet reconnects silently on page reload if previously
  authorized (`eth_accounts`, not `eth_requestAccounts`).

## Live test results (first real GenVM runs, Jul 30 2026)

Five real transactions run against the StudioNet deployment
(`0x04781181f8071B44411bF0Ebf1bc94e049Fc4677`), bounty #1:

1. **`file_bounty`** — succeeded. Confirmed the 14-day response deadline
   arithmetic exactly matches `filed_at + 14 days` against real on-chain
   timestamps (`2026-07-30T04:08:03` → `2026-08-13T04:08:03`) — the
   first live confirmation of the hand-written date-arithmetic helpers
   working correctly outside the earlier fuzz test.
2. **`resolve_dispute` called early (before rebuttal, before deadline)**
   — correctly reverted with `AssertionError: response window still
   open; wait for rebuttal or the 14-day deadline`, confirmed by 5/5
   validators independently (`Consensus Result: Accepted` on the
   *error*, meaning unanimous agreement that this call should fail).
   Bounty state confirmed untouched afterward. This is the Priority 1b
   scenario's early-resolution guard working correctly.
3. **`rebut`** — succeeded cleanly, `status: "rebutted"` returned,
   sanitized rebuttal text confirmed intact in the decoded transaction
   input.
4. **`resolve_dispute` called again (now rebutted)** — this was meant
   to test the full nondet path (`leader_fn`/`validator_fn`, the actual
   LLM judgment) for the first time. Instead, it hit the **fail-closed
   unreachable-source path**: `_fetch_text` on the reporter-cited commit
   (`octocat/Hello-World` at `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d`,
   path `README`) failed inside GenVM, resolving cleanly to
   `verdict_severity: "invalid"`, `confidence_bps: 1000`, with the note
   `"resolved without consensus: reporter-cited source unreachable"` —
   the exact terminal-verdict fix documented in `docs/contracts.md`,
   confirmed working on a real deployment for the first time.
5. **Manual follow-up check:** the exact same URL
   (`https://raw.githubusercontent.com/octocat/Hello-World/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d/README`)
   was opened directly in a normal mobile browser and returned the
   file's real content ("Hello World!") cleanly — confirming the commit
   hash, path, and repo were all correct, and the file is genuinely
   fetchable from outside GenVM.

**What this confirms, solidly:** the deadline math, the early-
resolution guard, the rebut flow, and — critically — the fail-closed
behavior on an unreachable evidence source all work correctly on a real
deployment. The bounty never got stuck in an intermediate state at any
point across all four write calls, which is the core guarantee the two
bugs documented in `docs/contracts.md` were fixed to provide.

**What remains a genuinely open question, not yet resolved:** why did
`gl.nondet.web.get()` fail to fetch a URL that a normal browser fetches
without issue? Neither confirmed nor ruled out:
- Whether this is specific to `raw.githubusercontent.com` (a redirect
  behavior, header requirement, or rate limit GenVM's fetch client
  handles differently than a browser).
- Whether it's specific to this one commit/path (unlikely, given the
  browser fetch succeeded cleanly, but not impossible if GenVM's fetch
  path differs in some URL-specific way).
- Whether `gl.nondet.web.get()` itself is the right method to be
  calling at all — GenLayer's own changelog shows an evolution from
  `gl.get_webpage()` (v0.1.0) to `gl.nondet.web.render()` (v0.1.3), and
  a separate "Web Access" doc page's examples use `gl.nondet.web.request()`
  rather than `.get()`. This project's use of `.get()` was confirmed at
  the time against three independent official doc pages (see
  `docs/contracts.md`'s Bug 1 writeup), but that confirmation has not
  been re-checked against these newer-looking `.render()`/`.request()`
  examples, and it's possible `.get()` is a less-exercised or
  differently-behaved corner of the current API.
- Whether this was transient (a timeout, a blip) rather than a
  systematic issue — only tested once, not repeated.

**If picking this back up:** the fastest way to actually narrow this
down would be filing a second bounty against a different repo/commit/
path and seeing whether it also fails, or checking GenLayer's own
community channels for others hitting fetch issues with this specific
method. Neither has been done yet. Until one of these happens, treat
the evidence-fetch leg of this contract as *unverified for the success
case* — the failure case is now proven solid, but whether a real,
successful fetch-and-judge cycle works end-to-end on live GenVM remains
untested.

## Reproducible test: full success path (fetch → verdict → persistence → payout)

Added per staff feedback (Pavel Kolosov, Jul 31 2026), which correctly
identified that every live test up to that point had exercised either
an early-rejection assert or the fetch-failure path — never a genuine
end-to-end successful judgment. This procedure is designed so anyone
(staff included) can run it and independently confirm the full cycle
completes.

**Evidence used:** this project's own public repository,
`github.com/Siriron/BreachLock`, specifically the `LICENSE` file at
repo root. Chosen deliberately over an external repo: its exact content
is fully known and verifiable (21 lines, MIT license text, authored as
part of this project) rather than inferred, which sidesteps the
uncertainty encountered earlier when trying to independently confirm a
third-party raw-content URL resolves before handing it over as a test
value.

**Steps:**

1. Get the current commit hash on `main`:
   `github.com/Siriron/BreachLock/commits/main` — copy the short or
   full hash of the latest commit.
2. Call `file_bounty` with:
   - `repo_owner`: `Siriron`
   - `repo_name`: `BreachLock`
   - `commit_hash`: the hash from step 1
   - `file_path`: `LICENSE`
   - `vulnerability_report`: any real, checkable claim about the file —
     e.g. `"This LICENSE file grants broader rights than the project intends; it should be more restrictive than standard MIT."`
     (a claim the LLM can genuinely evaluate against the real fetched
     text, expected to reasonably resolve toward `low` or `invalid`
     since the file is, in fact, a standard, correctly-formed MIT
     license)
   - `claimed_severity`: `low`
3. Call `rebut` (optional but recommended, to test the full lifecycle
   including the project side): a real rebuttal referencing the
   contract's actual practice, e.g. `"MIT is the license this project intentionally uses; this is not a vulnerability."`
4. Call `resolve_dispute`.
5. **If the response comes back with `"note": "source fetch failed... retryable"`**: this is the new retry path added above. Call
   `resolve_dispute` again on the same `bounty_id` — per the design,
   this is expected to succeed on a retry even if one attempt
   transiently fails, and should not require more than
   `_MAX_FETCH_RETRIES` (3) attempts before either succeeding or
   reaching a final terminal verdict.
6. **On success**, confirm all four stages directly:
   - **Fetch**: the returned `reasoning_summary` should reference real,
     specific content from the actual LICENSE text (e.g. mentioning
     "MIT," "permission," "copyright," or similar actual license
     language) — not generic phrasing that could apply to any file.
     This is the concrete test that the fetch genuinely happened and
     the LLM judged against real content, not a placeholder.
   - **Validator verdict**: check the transaction's `Consensus Result`
     and `Initial Validators` count in the block explorer — confirm
     multiple validators participated and reached agreement
     (`Accepted`), not just a single node's opinion.
   - **Persistence**: call the `get_bounty` view immediately after and
     confirm `status: "resolved"`, `verdict_severity` populated, and
     `reasoning_summary` matching what came back from the write —
     confirming the verdict was actually written to storage, not just
     returned transiently.
   - **Payout**: call `get_protocol_pool` before and after, and check
     the reporter's/project's wallet balances or transaction history on
     the block explorer for the `emit_transfer` calls specified in
     `_settle()` — confirming GEN actually moved according to the
     verdict, not just that a number changed in a return value.

This procedure has not yet been executed against a live deployment as
of this writing (Aug 1 2026) — it is the reproducible procedure being
handed to staff and to future testing, not a completed result. Update
this section with the actual outcome once run.

## Investigation: three (then four) consecutive fetch failures against raw.githubusercontent.com (Aug 2 2026) — REOPENED, then genuinely resolved

**Update 2:** the `.render()` fix documented below as "RESOLVED" was re-tested live and **did not work** — a fifth consecutive failure, against a fresh deployment, using the exact corrected code. This section's original "RESOLVED" framing was wrong; leaving that history intact below rather than deleting it, since the reasoning that led to it (and the reasoning for why it turned out incomplete) is itself useful record.

**What actually happened on re-test:** identical failure signature
(`fetch_failure_count: 1`, generic `unreachable_or_errored`) against
`torvalds/linux`'s README, on a freshly redeployed contract confirmed
to genuinely contain the `.render()` fix (verified directly by reading
the deployed contract's own visible source in the Studio UI, not
assumed). This ruled out "wrong SDK function" as the actual root
cause — both `.get()` and `.render()` fail identically against this
host, meaning the problem is not about which function makes the
request.

**Actual root cause, found via deeper research:** GitHub's own
official changelog (May 8, 2025, "Updated rate limits for
unauthenticated requests") confirms unauthenticated access to
`raw.githubusercontent.com` is deliberately, heavily rate-limited (60
requests/hour), and — critically — **scoped by originating IP
address, not by calling client, library, or SDK function.** This
directly explains why switching `.get()` to `.render()` made zero
difference: both originate from the same GenVM infrastructure IP(s)
regardless of which function makes the call. If that infrastructure is
shared across many validators/contracts network-wide, a 60/hour budget
is trivially exhausted by unrelated traffic before any single test
transaction runs. Corroborated by numerous independent real-world
reports (GitHub community discussions, OpenTofu, BuildKit, and Bazarr
project issues) of automated/non-browser callers hitting this exact
limit against this exact domain.

**The actual fix:** `_build_raw_url()` now constructs a GitLab raw-file
URL (`gitlab.com/{owner}/{repo}/-/raw/{ref}/{path}`) instead of a
GitHub one. GitLab's own admin documentation confirms its unauthenticated
raw-endpoint rate limit is scoped **per project**, not per calling IP —
a structurally different limiting model that doesn't degrade based on
unrelated traffic from a shared caller IP. A PAT/embedded-credential
approach (attaching a GitHub token via `.get()`'s documented `headers`
parameter) was considered and deliberately rejected: a token embedded
in public contract source is permanently exposed on-chain with no
revocation path short of a full redeploy — a real, disproportionate
security cost for what the host-switch achieves without it.

**Confidence level, stated honestly:** the GitLab URL format is
corroborated across multiple independent sources (a real user's
UI-observed working URL, a GitLab feature-request thread describing
the identical pattern, GitLab's own version-history behavior) but has
**not been verified by directly issuing a live request to it** from
this build environment — no network access here permits that, the same
limitation that applied throughout this entire investigation. **Before
spending GEN testing this on-chain, confirm the exact constructed URL
resolves in a real browser first** — the single check that, applied
more consistently earlier in this investigation, would have caught the
`.render()` fix's incompleteness before a live test cycle was spent on
it.

**Not yet re-tested live** as of this writing. The next concrete step:
redeploy, then repeat the same `file_bounty`/`rebut`/`resolve_dispute`
sequence citing a real GitLab-hosted repo. **Note:** an earlier draft
of this section recommended `gitlab-org/gitlab-foss` on branch
`master` — that specific combination was directly checked in a real
browser and returned a 404. The actual issue was almost certainly the
branch name (GitLab has moved many repos, including this one, off
`master` onto `main`), not the general URL pattern or the GitLab-vs-
GitHub host decision itself. **Confirmed working instead:**
`gitlab-org/gitlab-runner`, branch `main`, path `README.md` — verified
directly (a real, recent, officially-indexed page confirms this file
exists at this exact branch), and the constructed raw URL
(`https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/README.md`)
was checked in a real browser and confirmed to resolve. Use these
exact values for the live re-test.

## Update 3 (Aug 3 2026): GitLab host switch also failed — real diagnostic gap found

The GitLab host switch (previous update) was tested live and **also
failed** — identical `fetch_failure_count: 1`, identical
`unreachable_or_errored` marker, against
`gitlab-org/gitlab-runner/README.md` on branch `main`, a URL
personally, directly confirmed to resolve in a real browser
immediately beforehand. This is the sixth consecutive fetch failure
across two completely different fix attempts (function switch, then
host switch), and neither changed the outcome at all.

**A real gap was found on review, not another external theory:**
`_fetch_text`'s `except Exception:` block is a total, generic
catch-all. It cannot distinguish an actual network/fetch failure from
a plain Python error inside this project's own code — a wrong
argument, an unexpected return type from `gl.nondet.web.render()`,
anything. Every single failure tonight, across both the `.get()`-era
and `.render()`-era code, has produced the exact same
`"unreachable_or_errored"` marker. That marker has been treated all
night as evidence of a network-level failure, but it is actually only
evidence that *some* exception occurred somewhere inside the try
block — it says nothing about where or why. It's entirely possible
none of tonight's failures were genuine network failures at all, and
the real bug has been sitting in how this contract calls
`gl.nondet.web.render()`, invisible behind a catch-all that was never
built to distinguish it.

**This means the GitHub-rate-limit and GitLab-per-project-limit
research earlier tonight may have been chasing a real, well-documented,
but ultimately irrelevant external fact** — accurate research, wrong
target. Not confirmed either way; that's exactly the point. The
diagnostic gap needs fixing before the next external-cause theory is
worth pursuing further.

**Update (Aug 3 2026), done:** `_fetch_text`'s `except Exception:`
block now captures the real exception's class name and message
(sanitized, capped at 200 chars) into the failure marker itself —
e.g. `unreachable_or_errored[ConnectionError:Connection timed out]`
instead of the same fixed `unreachable_or_errored` string every time.
Verified with simulated exception types (TypeError, AttributeError,
ConnectionError, an empty-message case, and an oversized message) to
confirm sensible, safe, correctly-capped output before this was
considered done.

**The next test run is the one that actually matters now.** Whatever
comes back in the `note` field of a failed `resolve_dispute` call will
show the genuine underlying exception for the first time tonight — not
another guess. Read that value carefully:
- If it shows something like `TypeError`, `AttributeError`, or another
  clearly Python-level error class — the bug has been in this
  contract's own code (a wrong argument, a wrong attribute path, a
  version mismatch) the entire time, and neither the GitHub-rate-limit
  research nor the GitLab host switch were ever relevant to the actual
  problem, however accurate that research was on its own terms.
- If it shows something that reads as a genuine network-layer error
  (a timeout, a connection-refused, an SSL error) — that's real
  evidence the failures are external after all, and worth resuming the
  host/rate-limit investigation with an actual diagnosis in hand
  instead of a guess.

## Update 4 (Aug 3 2026): the diagnostic fix worked — result is `SystemError:6: forbidden`

Live re-test against GitLab (`gitlab-org/gitlab-runner`, `main`,
`README.md`) with the diagnostic fix in place returned:

```
source fetch failed (unreachable_or_errored [SystemError:6: forbidden]) — retryable (1/3)
```

This is neither of the two categories anticipated above — not a
Python-level bug class (`TypeError`, `AttributeError`), and not an
obviously network-layer error (timeout, connection-refused, SSL).
`SystemError` at this specific layer, with the message "forbidden," is
consistent with GenVM's own runtime deliberately rejecting the
request — a sandbox-level denial, not a remote server's response and
not a coding bug in this contract's own call. Confirmed deterministic
across every validator + leader (identical `contract_state_hash` on
all 5 participants), so this isn't node-specific flakiness.

**GenLayer's own official "Web Access" doc examples all target
`test-server.genlayer.com`** — GenLayer's own domain — never a real
external site. That's consistent with (but doesn't prove) GenVM
restricting outbound access to a specific allowlist rather than
permitting arbitrary external domains.

**However, a real counter-example was found:** a different
GenLayer project on the org's GitHub
(`genlayer-foundation/internetcourt`, specifically
`contracts/bridge/ShipmentDeadlineCourt.py`) contains working-looking
code that calls `gl.nondet.web.get()` against `IPFS_GATEWAY =
"https://ipfs.io/ipfs/"` — a real, non-GenLayer, non-git-hosting
external domain. This is genuine evidence against a blanket
"GenVM only allows pre-approved domains" theory, though it's precedent
(someone wrote this code, presumably expecting it to work) rather than
proof (no independent confirmation this specific contract has
succeeded live). Two other things worth noting about this example,
neither yet resolved: it uses `gl.eq_principle.prompt_non_comparative`
rather than this project's `gl.vm.run_nondet_unsafe` pattern, and it
reads `resp.status` rather than the `.status_code` this project has
used throughout — likely an older SDK-version artifact given
`get_webpage()`/`get()`'s v0.1.0-era history, not necessarily evidence
either attribute name is wrong, but not yet independently confirmed.

**Diagnostic probe added, not a permanent design change:**
`_build_raw_url()` now has a temporary path triggered only by the
sentinel `repo_owner == "ipfs-test"`, which builds an IPFS gateway URL
(`https://ipfs.io/ipfs/{commit_hash}`) using `commit_hash` to carry an
actual CID. This exists purely to test whether GenVM can reach
`ipfs.io` at all — a genuinely different kind of domain from both git
hosts tried so far — without redefining what the real fields mean for
actual bounties. Remove this block once the question is answered.

**Test values for this specific probe:**
- `repo_owner`: `ipfs-test` (exact sentinel — triggers the diagnostic path)
- `repo_name`: any placeholder, e.g. `x` (ignored by this path)
- `commit_hash`: `QmfM2r8seH2GiRaC4esTjeraXEachRt8ZsSeGaWTPLyMoG` — IPFS's
  own canonical "Hello World!" test CID, corroborated across 7+
  independent sources spanning 2015 to current IPFS/kubo documentation,
  making it about as reliable a permanent test value as this
  investigation has used
- `file_path`: any placeholder, e.g. `x` (ignored by this path)

**If this succeeds:** strong evidence the problem is specific to git
raw-content hosts (GitHub and GitLab both), not external domains in
general — worth understanding why those two specifically, but the
contract's real evidence model could plausibly move toward IPFS-pinned
evidence instead of git-hosted evidence, a genuinely different design
direction.

**If this also fails with the same `SystemError:6: forbidden`:**
strong evidence toward the domain-allowlist theory — meaning no
external git host, and possibly no arbitrary external domain at all,
will work for this contract's fetch-evidence design as currently
conceived, and the investigation should shift toward finding out what
IS on any such allowlist (GenLayer's own team, via the Discord
question already posted, would be the authoritative source).

### Original (incomplete) resolution — preserved for the record

The text below was written when the `.render()` switch was believed to
be the fix. It was not. Preserved rather than deleted, since the
underlying research (the documented `.get()` vs `.render()` API
distinction) is still accurate and correct on its own terms — it just
wasn't the actual cause of the observed failures.

**Root cause identified and fixed [This was wrong — see Update 2
above].** After a fourth consecutive failure (against `torvalds/linux`,
a completely different repo — see below), the investigation was redone
properly rather than continuing to guess at infrastructure-level
theories. The apparent root cause at the time: this contract was
calling the wrong function for the job.

**The fix (incomplete, superseded by the GitLab host switch above):**
`_fetch_text()` was changed to call `gl.nondet.web.render(url,
mode='text')` instead of `gl.nondet.web.get(url)`. Confirmed via
GenLayer's own current official documentation (the "Web Access" page's
real examples): `gl.nondet.web.get()` is documented and exemplified
for calling APIs that return JSON/data responses; every single
official example that fetches actual PAGE or FILE content — HTML,
plain text, or a screenshot — uses `gl.nondet.web.render(url,
mode=...)` instead. A file on `raw.githubusercontent.com` is file
content, not an API response — exactly the case `.render()` is
documented for. `render()`'s `mode='text'` option is confirmed current
directly from the SDK's own API reference.

**Why this wasn't caught in the original build:** the original
confirmation of `.get()` (see `docs/contracts.md`'s Bug 1 writeup) was
checked against Copyleft's own live-verified precedent — but that
check didn't go deep enough. Copyleft's actual working `.get()` calls
target `spdx.org` (an API-adjacent canonical-text endpoint) and
party-submitted URLs — never a `raw.githubusercontent.com`-style static
file fetch. Copyleft's success proved `.get()` works in general; it
never actually proved `.get()` works for *this specific kind of fetch*.
That's a real gap in the original verification, not something that
could have been caught without hitting the actual failure and digging
into GenLayer's current docs specifically for the page/file-fetching
case.

**Trade-off from the `.render()` switch, stated plainly:** `.render()`
returns a plain string with no documented `.status_code` — so
`_fetch_text` can no longer distinguish an HTTP 404 from another kind
of failure the way it briefly could with `.get()`. This trade-off
still applies with the GitLab host switch above, since `.render()` is
still the function in use — it's now just pointed at a different host.

### Full history of this investigation, preserved for the record

Live testing on two separate redeployed contract instances first
produced **three consecutive fetch failures** against
`raw.githubusercontent.com/octocat/Hello-World/7fd1a60.../README` — a
URL independently confirmed to resolve cleanly in a normal browser both
times it was checked. A **fourth failure** against a completely
different repo/file (`torvalds/linux`'s `README` at a different real,
independently-verified commit) confirmed this wasn't specific to one
repo — ruling in favor of something more general about the fetch
mechanism itself, which is what eventually led to the actual fix above.

Two theories were proposed and superseded before the real cause was
found, preserved here rather than deleted, since the reasoning and
what ruled each one out is itself useful record:

**Theory 1 (superseded): CORS/preflight issue.** Proposed based on
general sources describing CORS inconsistency with
`raw.githubusercontent.com`. Checked further and found weaker than
presented: the domain already sends a permissive
`Access-Control-Allow-Origin: *` header (confirmed via a GitLab
feature request citing this as something GitLab should match), which
argues against CORS being the actual blocker.

**Theory 2 (superseded): Fastly CDN User-Agent filtering.** Proposed
after confirming `raw.githubusercontent.com` is served via Fastly, and
that Fastly deployments generally support User-Agent-based filtering.
Plausible-sounding, but never actually confirmed against this specific
domain's real behavior, and ultimately not the actual cause — the real
issue was the fetch method, not the network layer.

**On finding a clean second test host — attempted, not needed in the
end:** two candidates were checked while pursuing Theory 2 and both
ruled out as ambiguous for that specific investigation (GitLab lacks
GitHub's permissive CORS header; `cdn.jsdelivr.net` uses a rotating
multi-CDN backend that includes Fastly itself). This effort became
moot once the real cause (wrong function, not wrong host) was found,
but the fourth test (a different repo, same host) ended up serving the
same isolating purpose by accident — ruling out "this one repo" while
still pointing at something host/mechanism-level, which was the actual
useful signal that led to re-deriving the fix from current docs.

**What this means for the contract's design:** nothing here suggests
`_build_raw_url()`'s core approach (constructing the fetch URL from
pinned identity fields, never accepting one from either party) was
wrong — that structural fix stands independent of this investigation.
The actual issue was one function call (`_fetch_text`'s underlying
`gl.nondet.web` call), now corrected. `raw.githubusercontent.com`
itself was never the problem; no change to the canonical host
convention is needed.

## Explicitly not yet tested, flagged rather than assumed fine

- Whether GenVM transaction writes are in fact atomic (the assumption
  the 1a fix is built on). This was inferred from the standard
  blockchain execution model and from every other assert-then-write
  pattern in this contract being consistent with it, but has not been
  independently confirmed against GenLayer's own documentation or
  observed directly. If 1a's test above doesn't behave as expected,
  this assumption is the first thing to re-examine. **Update:** the
  live test above (result #2) showed a reverted `resolve_dispute` call
  leaving bounty state fully untouched, which is consistent with atomic
  writes, though that test never reached the specific status-write-
  then-fetch-fail sequence the original concern was about (see
  `docs/contracts.md`'s correctness note) — it's supporting evidence,
  not a direct confirmation of the exact scenario.
- The exact shape of a write transaction's receipt object in
  `genlayer-js` (e.g. where a write's JSON return value surfaces, if
  anywhere, on the receipt) — deliberately left unparsed in the
  frontend rather than guessed at; see `docs/frontend.md`. **Update:**
  the explorer's own UI does show a `Return Value` field with the
  correctly-decoded JSON for every write tested so far (confirmed
  directly in screenshots during live testing), which confirms the
  *contract* is returning the right data — but this is the block
  explorer's own decoding, not necessarily proof of what shape
  `genlayer-js`'s `waitForTransactionReceipt()` actually hands back to
  frontend code. Still worth confirming directly before un-deferring
  this in the frontend.

