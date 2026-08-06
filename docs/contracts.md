# Contracts

## Overview

`contracts/breachlock.py` implements a single contract, `BreachLock`,
with three writes (`file_bounty`, `rebut`, `resolve_dispute`) and three
views (`get_bounty`, `list_bounties`, `get_protocol_pool`).

## Design history: this contract originally fetched external evidence, and no longer does

An earlier version of this contract fetched the actual disputed source
code from a pinned commit — the fetch URL was always constructed by
the contract itself from four pinned identity fields
(`repo_owner`/`repo_name`/`commit_hash`/`file_path`), never accepted as
a URL from either party, closing the "caller-selected page proves only
itself" failure pattern a prior project in this line of work
(Copyleft) had been rejected for.

That design was removed after extensive live testing found that
GenVM's sandbox consistently, deterministically rejects outbound
fetches to external domains with `SystemError:6: forbidden`. This was
confirmed against three structurally unrelated real domains — GitHub's
raw-content service, GitLab's raw-file endpoint, and an IPFS gateway —
identical denial every time, across every validator (matching
`contract_state_hash` on every participant, so not node-specific
flakiness). Two earlier fix attempts (switching the underlying SDK
call from `gl.nondet.web.get()` to `gl.nondet.web.render()`, then
switching the evidence host from GitHub to GitLab) were tried, based
on real research at the time, and neither changed the outcome — both
are preserved in full in `docs/testing.md`'s "Investigation" section,
since the reasoning behind each attempt is still worth understanding
even though neither turned out to be the actual cause.

Whether this reflects a genuine GenVM sandbox restriction (e.g. an
outbound domain allowlist) or something else was never conclusively
answered before the decision was made to remove the fetch mechanism
entirely rather than continue chasing external-cause theories. A
question was posted to GenLayer's own Discord asking directly whether
`gl.nondet.web.render()` permits arbitrary external domains; as of this
writing, no definitive answer had come back.

**The consequence, stated plainly, not minimized:** this contract now
judges severity from the reporter's and project's own written claims,
not from independently fetched, contract-verified evidence. That is a
real reduction in what this contract can prove. It is closer to "two
parties argue, independent validators judge the argument" than to "an
oracle-verified fact is judged." The adversarial structure — a
reporter benefits from a false "valid" verdict, a project benefits
from a false "invalid" one — still holds, which is why multi-validator
consensus remains meaningful here rather than decorative (see this
project's own concept-evaluation framework's Test 1 for that
distinction), but a future revision that finds a working evidence-fetch
path (once GenVM's actual domain policy is confirmed, one way or the
other) would be a strictly stronger design than this one, not a
lateral change. If picking this back up: check whether a definitive
answer ever came back on the Discord question before re-attempting a
fetch-based design from scratch.

## The charter and what it now asks the model to judge

With no fetched evidence, `_CHARTER` instructs the model to judge
severity based on the plausibility, specificity, and internal
consistency of the reporter's claim, weighed against the project's
rebuttal if one was submitted — not against any externally-verified
fact. A vague, generic claim should score lower confidence or
`"invalid"`; a specific, technically detailed, internally consistent
claim the rebuttal fails to meaningfully contest should score higher.
This is a real, honest limitation: the model has no way to confirm a
claim is *true*, only to judge whether it *reads as* well-formed and
uncontested. See the design-history section above for the full
reasoning behind why this is the current model rather than an
evidence-verified one.

## The response-deadline design, and why silence escalates rather than resolves in either direction

`response_deadline = filed_at + 14 days`. `resolve_dispute` becomes
callable once **either** `status == "rebutted"` **or** the deadline has
passed. On silent expiry, the dispute is **not** auto-resolved as
valid, and the reporter's stake is **not** simply refunded with the
case closed. It escalates to a real resolution — judged off the
reporter's claim alone, with an empty rebuttal text the charter
explicitly tells the model to interpret as "the project chose not to
contest this on the merits," not as evidence of anything in
particular.

This was chosen deliberately over the two more obvious options because
either alternative breaks the contract's integrity under a rational
adversary:

- **Auto-resolve-as-valid on silence** would make silence strictly
  better than engaging whenever a project suspected a report might not
  hold up on the merits — the project's best move would always be to
  ignore it.
- **Refund-and-close on silence** would let a project kill *any* claim,
  including a genuinely critical one, just by not responding — which
  defeats the entire purpose of a bounty arbitration contract.

Escalating to a real verdict means a project's best move is always to
respond if it has a real rebuttal, and silence only helps it in the
case where it genuinely has nothing to say.

## Nondet / consensus checklist (run against every future contract, not just this one)

1. `run_nondet_unsafe(leader_fn, validator_fn)` — always positional,
   never keyword args.
2. `leader_fn` returns an already-parsed dict; `validator_fn`'s argument
   is a `gl.vm.Return | ...` wrapper — check `isinstance(x, gl.vm.Return)`
   before reading `.calldata`.
3. `leader_fn`/`validator_fn` are nested functions with **zero** `self`
   references anywhere in either body.
4. Storage-backed records are `gl.storage.copy_to_memory()`'d in the
   plain deterministic body, strictly before `run_nondet_unsafe`.
5. Every fixed/constant value (`_CHARTER`, alias tuples, tolerance
   bands) is module-level, never a class-body attribute with a type
   annotation.
6. Value transfers use `.emit_transfer(value=...)`, never `.send()`,
   strictly after `run_nondet_unsafe` returns.
7. No `float()` anywhere reachable from nondet code — confidence scores
   and date arithmetic both use pure integer parsing.

All seven were re-verified via direct grep against the final file
state after every edit, not assumed correct from having been checked
once earlier in the build. (An earlier version of this checklist had
an eighth item about `gl.nondet.web.get()` vs `.render()` — removed
along with the fetch mechanism itself; see `docs/testing.md` for that
history if it's ever relevant to a future fetch-based contract.)

## Datetime arithmetic

`gl.message_raw["datetime"]` gives an ISO-8601 string; stdlib
`datetime` isn't used for arithmetic on it (determinism concerns
consistent with the project's `float()` ban), so `_add_seconds_iso` and
`_iso_gte` implement pure-integer epoch-second conversion by hand.
Fuzz-tested against Python's real `datetime` module: every day across
2025–2029 (4 years, including the 2028 leap year), five offsets each
(+14d, +365d, +1s, +1hr, -1hr) — 7,305 cases, zero mismatches. Re-run
and reconfirmed after the fetch-removal rewrite, since these helpers
were hand-copied into the new file version — still zero mismatches.

## Settlement

`_settle()` runs strictly after `run_nondet_unsafe` returns. Two
branches:

- **`verdict_severity == "invalid"`**: reporter's stake settles 80% to
  the project (if one ever engaged) + 20% to the protocol pool. If no
  project ever engaged (silent-expiry path), the full 80% that would
  have gone to the project goes to the pool instead — there's no one
  to make whole. Any project counter-stake is returned in full.
- **Any real severity** (`critical`/`high`/`medium`/`low`): reporter's
  stake is always returned in full. If a project counter-staked, 80% of
  it settles to the reporter as payout, 20% to the pool.

This is a fixed, deterministic consequence of a judged verdict — not
chance-based, consistent with the ethics framework's stake/slash
pattern (a security-deposit mechanic, not a wager). Unaffected by the
fetch removal — this logic never depended on fetched evidence, only on
the final verdict severity, and was verified unchanged by direct
comparison against the pre-rewrite version during the rewrite.
