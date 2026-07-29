# Manual Test Plan

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

## Explicitly not yet tested, flagged rather than assumed fine

- Whether GenVM transaction writes are in fact atomic (the assumption
  the 1a fix is built on). This was inferred from the standard
  blockchain execution model and from every other assert-then-write
  pattern in this contract being consistent with it, but has not been
  independently confirmed against GenLayer's own documentation or
  observed directly. If 1a's test above doesn't behave as expected,
  this assumption is the first thing to re-examine.
- The exact shape of a write transaction's receipt object in
  `genlayer-js` (e.g. where a write's JSON return value surfaces, if
  anywhere, on the receipt) — deliberately left unparsed in the
  frontend rather than guessed at; see `docs/frontend.md`.
