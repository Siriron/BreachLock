# BreachLock

Commit-pinned bug bounty verdict arbitration on GenLayer.

A reporter stakes GEN and discloses a vulnerability against a specific
`(repo_owner, repo_name, commit_hash, file_path)`. The project may
counter-stake and rebut within a 14-day window, optionally citing a
patch at its own pinned commit. Resolution fetches the actual source at
the reporter-cited commit — the contract constructs this fetch URL
itself from the four identifying fields; neither party ever submits a
raw fetch URL for the code-evidence leg — and runs independent
leader/validator consensus to produce a severity verdict. Stakes settle
automatically per the verdict.

## Why this exists

This is the third GenLayer project in this line of work, and it's built
specifically to avoid two confirmed real bugs found in a prior project
(Copyleft) during self-audit — not retrofitted after the fact:

1. **Evidence must be contract-constructed, never party-submitted, for
   the authoritative leg.** A prior contract had an evidence-fetch leg
   that was documented as independently checking the disputed artifact,
   but the actual code fetched a different field entirely, and a
   separate "independent" leg just re-fetched whatever URL the
   responding party had submitted. Here, `leader_fn`/`validator_fn`
   build the fetch URL themselves from
   `f"https://raw.githubusercontent.com/{owner}/{repo}/{commit_hash}/{path}"`
   using only pinned fields on the record — there is no field on the
   `Bounty` struct a party could substitute a URL into for this leg, by
   construction.
2. **No status may stay open with no finalization path.** A prior
   contract could leave stakes frozen indefinitely if a counterparty
   never engaged. Here, `resolve_dispute` is callable once the project
   has rebutted OR the 14-day response deadline has passed — silence
   never blocks resolution. A failed fetch on the reporter's own cited
   commit resolves directly to an `"invalid"` verdict rather than
   reverting, so a bad hash can never leave a bounty stuck (see Known
   Issues Found & Fixed below for why this needed a second pass).

## Live deployment

| Network | Address | Deploy TX |
|---|---|---|
| StudioNet | `0x04781181f8071B44411bF0Ebf1bc94e049Fc4677` | [`0xf8d0d630...40fa7904`](https://explorer-studio.genlayer.com/tx/0xf8d0d63081f2a68257e3ca11ebfa4374c97f11389570929a1531ab5440fa7904) |
| Bradbury | `0x4fdb53874d4C4247D32A5A0570d73684492932fc` | — |

Both confirmed live and deployed (Jul 29, 2026). StudioNet's deploy
transaction was independently verified — `GenVM Result: SUCCESS`,
`Consensus Result: Accepted`, status `FINALIZED`. The Bradbury explorer
renders its transaction data client-side (same JS-rendering limitation
project knowledge already notes for the GenLayer SDK reference site),
so its deploy was confirmed by direct visual check rather than by an
automated fetch here — genuinely deployed, just verified by a different
method than StudioNet.

Next step: set these two addresses as
`VITE_CONTRACT_ADDRESS_STUDIONET` / `VITE_CONTRACT_ADDRESS_BRADBURY` in
the frontend's environment (Vercel project env vars, or a local `.env`)
before running or deploying the frontend.

Frontend: _pending Vercel deploy_
Repo: https://github.com/Siriron/breachlock

## Tech stack

- Contract: Python on GenVM (`contracts/breachlock.py`)
- Frontend: React + Vite + TypeScript + Tailwind CSS + Framer Motion
- Chain SDK: `genlayer-js` (root/`chains`/`types` subpaths only — see
  `docs/contracts.md` for why no other subpath is used)

## Setup

```bash
npm install
cp .env.example .env
# fill in VITE_CONTRACT_ADDRESS_STUDIONET / _BRADBURY after deploying
npm run dev
```

## Deploy workflow

1. `contracts/breachlock.py` → verify syntax, run the full pre-deploy
   audit in `docs/contracts.md`.
2. Run `genvm-lint` locally (`pip install genvm-linter`) — exit 0
   required before deploying.
3. Deploy via studio.genlayer.com UI (upload `.py` directly — never
   paste code, never MetaMask/EVM wallet deploy).
4. Copy the explorer TX link into this README and `docs/deployment.md`.
5. Push to GitHub, deploy frontend to Vercel, set the two
   `VITE_CONTRACT_ADDRESS_*` env vars.

## First live test results (Jul 30 2026)

Bounty #1 filed and exercised against StudioNet. Confirmed working:
filing, the 14-day deadline arithmetic (verified against real on-chain
timestamps), the early-resolution guard (correctly blocked by 5/5
validators before the deadline), rebutting, and — the more important
one — the fail-closed path when cited evidence can't be fetched
(resolved cleanly to `invalid` rather than getting stuck).

**Open question, not yet resolved:** the evidence fetch itself failed
inside GenVM for a URL independently confirmed to work fine in a normal
browser. The failure path handled it correctly (that's real, proven
signal), but a real successful fetch-and-judge cycle — the core thing
this contract exists to do — has not yet been exercised end to end.
See `docs/testing.md`'s "Live test results" section for the full
writeup and next steps if picking this back up.

## Known issues found & fixed during build

Documented here in full rather than silently corrected, since this is
exactly the kind of thing that's easy to get subtly wrong and worth a
permanent record — see `docs/contracts.md` for the complete writeup
with code.

1. **Status-stuck-forever revert risk.** An early draft of
   `resolve_dispute` wrote `status = "response_expired"` to storage
   *before* attempting the hard-required evidence fetch, then raised on
   failure. If GenVM transaction writes are atomic (the standard model),
   that raise would revert the status write too, leaving a bounty with
   a bad commit hash stuck at `"filed"` forever with no way to ever
   resolve. Fixed by making a failed reporter-evidence fetch a terminal,
   resolvable `"invalid"` verdict instead of a revert.
2. **Path-segment sanitization gap.** `repo_owner`/`repo_name`/
   `commit_hash` initially shared a sanitizer with `file_path` that
   allowed embedded `/` (needed for real file paths). This meant a
   crafted `repo_owner` like `"victim-org/../attacker-org"` could
   survive `..`-stripping as `"victim-org//attacker-org"` — a malformed
   but not actually exploitable path (GitHub's own routing would very
   likely just 404 it), but relying on a downstream service's routing
   to make a security boundary safe isn't a standard this project
   holds itself to elsewhere. Found via an actual attack-input test, not
   inspection. Fixed by splitting into `_segment_safe` (rejects slashes
   entirely, used for single-segment fields) and `_filepath_safe`
   (allows them, used only for `file_path`). Verified post-fix with the
   same attack input plus a legitimate multi-segment path.

Both were found via targeted testing during self-audit, not by a
reviewer after deploy. The custom pure-integer ISO-8601 date arithmetic
(used for the response deadline, since floats and stdlib datetime
determinism are both off-limits in nondet-reachable code) was fuzz
tested against Python's real `datetime` module across 7,305 cases
spanning four years including the 2028 leap year — zero mismatches.

**Not yet verified:** nothing here has touched a real GenVM runtime —
no `genvm-lint`, no Studio deploy, no live `gl.nondet.web.get()` call.
The build environment had no network access. Everything above is
Python-level logic testing and static audit against the documented
GenVM rules. Run the full manual test plan in `docs/testing.md` before
trusting this live — it specifically calls out the timeout and
unreachable-commit paths, since two of the two real bugs found so far
lived in edge cases a happy-path test wouldn't reach.

**Open item:** `og-image.png` referenced in `index.html`'s meta tags
does not exist yet — no image-generation tool was available during
build. Add a real 1200×630px image at `public/og-image.png` before
deploying, or social shares will show a broken image.

## Docs

- `docs/architecture.md` — system overview
- `docs/contracts.md` — full contract design, nondet pattern, audit
  checklist, and the two fixes above in detail
- `docs/deployment.md` — network config, deploy steps, addresses
- `docs/frontend.md` — SDK wiring, component map
- `docs/testing.md` — manual test plan, specifically the edge cases

## License

MIT — see `LICENSE`.
