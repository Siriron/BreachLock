# Contracts

## Overview

`contracts/breachlock.py` implements a single contract, `BreachLock`,
with three writes (`file_bounty`, `rebut`, `resolve_dispute`) and three
views (`get_bounty`, `list_bounties`, `get_protocol_pool`).

## Evidence construction — the core design decision

The contract never accepts a fetch URL from either party for the
code-evidence leg. Instead, `file_bounty` takes four separate fields —
`repo_owner`, `repo_name`, `commit_hash`, `file_path` — each run through
strict sanitization, and `_build_raw_url()` constructs the actual fetch
target from them:

```python
def _build_raw_url(repo_owner, repo_name, commit_hash, file_path) -> str:
    return f"https://raw.githubusercontent.com/{repo_owner}/{repo_name}/{commit_hash}/{file_path}"
```

This is deliberate and is the single most important structural choice
in this contract. A prior project in this line of work (Copyleft) had
an evidence leg that was *documented* as independently fetching a
disputed artifact, but the actual code fetched an unrelated field, and
a second "independent" leg just re-fetched a URL the responding party
had submitted — proving only that a page exists at that URL, the
confirmed "caller-selected page proves only itself" rejection pattern.
Making the fetch URL something the contract builds from pinned
identity fields, rather than something either party can hand it
directly, closes that gap by construction rather than by prompt
wording.

The reporter's vulnerability report and the project's rebuttal remain
free text the model weighs — that's legitimate, since those really are
one-sided claims, not the load-bearing artifact. Only the code-evidence
leg gets the stricter treatment.

## Sanitization: two functions, not one, and why

Two separate sanitizers are used for URL-bound fields, not one shared
one:

- **`_segment_safe(s, max_len)`** — for `repo_owner`, `repo_name`,
  `commit_hash`, and `patch_commit_hash`. Rejects `/` entirely, at any
  position. These are genuinely single path segments in the resulting
  URL.
- **`_filepath_safe(s, max_len)`** — for `file_path` only. Allows
  internal `/`, since real repo paths need it (`src/lib/foo.py`), but
  still strips `..` and a leading `/`.

**Why two functions:** an earlier draft used one shared sanitizer for
all four URL-bound fields, permissive enough to allow `file_path`'s
internal slashes. That meant a crafted `repo_owner` like
`"victim-org/../attacker-org"` survived `..`-removal as
`"victim-org//attacker-org"` — a malformed value that could still be
passed into `_build_raw_url()`. This was found by writing an actual
attack-input test (see `scripts/` history / conversation record — not
reconstructed from memory here, verified directly against the running
code), not by inspection. The resulting doubled-slash URL would very
likely just 404 against GitHub's own routing rather than escape
`raw.githubusercontent.com`, but a security boundary shouldn't depend
on a downstream service's routing behavior to stay safe — especially
in a contract whose entire design thesis is "don't trust a party-
controlled value to land where you expect." Splitting the function so
`repo_owner`/`repo_name`/`commit_hash` reject slashes outright removes
the ambiguity structurally.

## The response-deadline design, and why silence escalates rather than resolves in either direction

`response_deadline = filed_at + 14 days`. `resolve_dispute` becomes
callable once **either** `status == "rebutted"` **or** the deadline has
passed. On silent expiry, the dispute is **not** auto-resolved as
valid, and the reporter's stake is **not** simply refunded with the
case closed. It escalates to a real resolution — judged off the
reporter's report and the pinned code alone, with an empty rebuttal
text the charter explicitly tells the model to interpret as "the
project chose not to contest this on the merits," not as evidence of
anything in particular.

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

Escalating to a real verdict on the evidence means a project's
best move is always to respond if it has a real rebuttal, and silence
only helps it in the case where it genuinely has nothing to say — in
which case the code itself should still support or fail to support the
claim on its own.

## The status-stuck-forever fix, in detail

An early draft of `resolve_dispute` had this shape:

```python
if d.status == "filed" and deadline_passed:
    d.status = "response_expired"
    self.bounties[bounty_id] = d
    # ... entry.status update ...

d_mem = gl.storage.copy_to_memory(d)
code_url = _build_raw_url(...)

try:
    _fetch_text(code_url, hard_required=True)
except _FetchRequired as exc:
    raise gl.vm.UserError(f"code_fetch_required_failed:{exc}")
```

The problem: if GenVM transaction writes are atomic — reverted together
with the rest of the transaction on a raise, which is the standard
model and the only one consistent with every other assert-then-write
pattern in this contract — then raising `gl.vm.UserError` after the
`response_expired` write would revert that write too. Every future call
to `resolve_dispute` on that bounty would hit the identical fetch
failure and revert again, with no exit, since a reporter-supplied bad
commit hash can never self-correct. That's the exact "stuck forever"
failure class this whole contract exists to eliminate — just reached
through a bad hash instead of a silent counterparty, which is precisely
why it wasn't obvious until traced through explicitly.

**The fix:** a failed hard-required fetch on the reporter's own cited
commit is checked *before* any status-transition write happens, and
resolves directly to a terminal `"invalid"` verdict — settled the same
way any other `"invalid"` verdict settles — rather than raising at all.
The `response_expired` status write only happens after that check has
already passed cleanly. This guarantees a single call to
`resolve_dispute` always reaches some terminal, non-retriable outcome;
it never partially commits a status change and then fails.

The project's own cited patch fetch is intentionally **not** given this
same hard-required treatment — it fails soft (a missing/dead patch
reads as "no effective remediation was demonstrated," which is real
information the charter tells the model how to weigh), because the
patch is optional evidence offered in the project's own favor, not the
artifact the report itself depends on.

## Nondet / consensus checklist (run against every future contract, not just this one)

1. `gl.nondet.web.get()` returns a `Response` object (`.body`,
   `.status_code`), never a plain string.
2. `run_nondet_unsafe(leader_fn, validator_fn)` — always positional,
   never keyword args.
3. `leader_fn` returns an already-parsed dict; `validator_fn`'s argument
   is a `gl.vm.Return | ...` wrapper — check `isinstance(x, gl.vm.Return)`
   before reading `.calldata`.
4. `leader_fn`/`validator_fn` are nested functions with **zero** `self`
   references anywhere in either body.
5. Storage-backed records are `gl.storage.copy_to_memory()`'d in the
   plain deterministic body, strictly before `run_nondet_unsafe`.
6. Every fixed/constant value (`_CHARTER`, alias tuples, tolerance
   bands) is module-level, never a class-body attribute with a type
   annotation.
7. Value transfers use `.emit_transfer(value=...)`, never `.send()`,
   strictly after `run_nondet_unsafe` returns.
8. No `float()` anywhere reachable from nondet code — confidence scores
   and date arithmetic both use pure integer parsing.

All eight were re-verified via direct grep against the final file
state after every edit, not assumed correct from having been checked
once earlier in the build.

## Datetime arithmetic

`gl.message_raw["datetime"]` gives an ISO-8601 string; stdlib
`datetime` isn't used for arithmetic on it (determinism concerns
consistent with the project's `float()` ban), so `_add_seconds_iso` and
`_iso_gte` implement pure-integer epoch-second conversion by hand.
Fuzz-tested against Python's real `datetime` module: every day across
2025–2029 (4 years, including the 2028 leap year), five offsets each
(+14d, +365d, +1s, +1hr, -1hr) — 7,305 cases, zero mismatches.

## Settlement

`_settle()` runs strictly after `run_nondet_unsafe` returns. Two
branches:

- **`verdict_severity == "invalid"`**: reporter's stake settles 80% to
  the project (if one ever engaged) + 20% to the protocol pool. If no
  project ever engaged (silent-expiry or unreachable-source path), the
  full 80% that would have gone to the project goes to the pool instead
  — there's no one to make whole. Any project counter-stake is returned
  in full.
- **Any real severity** (`critical`/`high`/`medium`/`low`): reporter's
  stake is always returned in full. If a project counter-staked, 80% of
  it settles to the reporter as payout, 20% to the pool.

This is a fixed, deterministic consequence of a judged verdict — not
chance-based, consistent with the ethics framework's stake/slash
pattern (a security-deposit mechanic, not a wager).
