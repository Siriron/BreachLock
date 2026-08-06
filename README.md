# BreachLock

Bug bounty verdict arbitration on GenLayer.

A reporter stakes GEN and discloses a vulnerability as a detailed
written claim. The project may counter-stake and rebut within a
14-day window. Resolution runs independent leader/validator consensus
to judge the claim's specificity and internal consistency against the
rebuttal, producing a severity verdict. Stakes settle automatically
per the verdict.

**This contract originally fetched the actual disputed source code
from a pinned commit rather than judging free-text claims — that
mechanism was removed after extensive live testing found GenVM's
sandbox consistently rejects outbound fetches to every external domain
tried (GitHub, GitLab, an IPFS gateway) with `SystemError:6:
forbidden`.** See "Historical record" below for what was tried and
why, and the full investigation in `docs/testing.md`. This is a real,
honestly-stated reduction in what the contract can prove — see
`docs/contracts.md`'s design-history section for the complete
reasoning.

## Why this exists

This is the third GenLayer project in this line of work, and it's built
specifically to avoid two confirmed real bugs found in a prior project
(Copyleft) during self-audit — not retrofitted after the fact:

1. **(Historical — this contract no longer fetches external evidence;
   kept for the underlying lesson, which still applies to any future
   fetch-based contract.) Evidence must be contract-constructed, never
   party-submitted, for the authoritative leg.** A prior contract had
   an evidence-fetch leg that was documented as independently checking
   the disputed artifact, but the actual code fetched a different
   field entirely, and a separate "independent" leg just re-fetched
   whatever URL the responding party had submitted. This contract's
   own earlier fetch-based version fixed that by having
   `leader_fn`/`validator_fn` build the fetch URL themselves from
   pinned fields, never accepting one from either party — before the
   fetch mechanism itself was removed entirely for the reason above.
2. **No status may stay open with no finalization path.** A prior
   contract could leave stakes frozen indefinitely if a counterparty
   never engaged. Here, `resolve_dispute` is callable once the project
   has rebutted OR the 14-day response deadline has passed — silence
   never blocks resolution (see Known Issues Found & Fixed below for
   the full history of getting this right).

## Live deployment

Fresh deployment of the current, claim-based `contracts/breachlock.py`
(the two-arg `file_bounty(disputed_claim, claimed_severity)` ABI —
supersedes the old five-arg fetch-based deployment referenced
elsewhere in this repo's history). Both networks confirmed live.

| Network | Address | Deploy TX |
|---|---|---|
| StudioNet | `0x950d2497Ac764dead125EF95209eC28deE34517d` | [`0xd9377d0d...ac273957`](https://explorer-studio.genlayer.com/tx/0xd9377d0d78a94753d3214bba4565557898702ba3f8bf02e5766ce9dcac273957) |
| Bradbury | `0x04e379Db6e62b6851D4B85D3E31A1D32B49DF900` | [explorer link](https://explorer-bradbury.genlayer.com/address/0x04e379Db6e62b6851D4B85D3E31A1D32B49DF900) |

StudioNet's deploy transaction was independently verified directly via
the explorer: `GenVM Result: SUCCESS`, `Consensus Result: Accepted`,
status `FINALIZED`, deployed Aug 6, 2026, 3:24:30 AM. The Bradbury
explorer renders its transaction data client-side (the same
JS-rendering limitation project knowledge notes for this explorer and
the GenLayer SDK reference site), so its deploy tx hash couldn't be
independently pulled the same way here — confirm it directly in a
browser, or via the address link above, before citing a specific
Bradbury tx hash anywhere.

**Next step:** set `VITE_CONTRACT_ADDRESS_STUDIONET` and
`VITE_CONTRACT_ADDRESS_BRADBURY` to the two addresses above (Vercel
project environment variables, or a local `.env`), then deploy/run the
frontend against them. Run the reproducible full-cycle test in
`docs/testing.md` against these live addresses before considering the
claim-based design proven end-to-end — nothing has exercised a real
`resolve_dispute` judgment against this specific deployment yet.

Frontend: _pending Vercel deploy against the addresses above_
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

## Status on the current (claim-based) deployment

The addresses in "Live deployment" above are a fresh deploy of the
rewritten, claim-based contract — nothing has been exercised against
them yet. Run the reproducible full-cycle procedure in
`docs/testing.md` (`file_bounty` → `rebut` → `resolve_dispute`,
confirming fetch/settlement/persistence at each stage — minus the
fetch stage, which no longer exists) before treating this deployment
as proven.

## Historical record — the fetch-based contract's live testing and staff feedback

**Everything in this section describes the earlier, fetch-based
contract, which has since been removed and replaced by the current
claim-based design (see "Design history" below and
`docs/contracts.md`).** Preserved because the investigation itself —
and the reasoning behind the final decision to drop the fetch
mechanism entirely — is the most load-bearing context in this repo,
not because any of it describes the current deployment's state.

**First live test (Jul 30 2026):** bounty #1 filed and exercised
against the then-current StudioNet deployment
(`0x04781181f8071B44411bF0Ebf1bc94e049Fc4677`, now superseded). Filing,
deadline arithmetic, the early-resolution guard, and rebutting all
confirmed working. The evidence fetch itself failed inside GenVM for a
URL independently confirmed to work fine in a normal browser — the
first sign of what eventually became the `SystemError:6: forbidden`
finding below.

**Staff feedback (Jul 31 2026):** Pavel Kolosov requested (1) making
source-fetch failures retryable rather than instantly conclusive, and
(2) a reproducible test proving a full fetch → verdict → persistence →
payout cycle. Both were pursued in the fetch-based design — a bounded
retry counter was added, and a reproducible test procedure was
written — but neither ultimately mattered, because the investigation
that followed (three more rounds: an SDK-function switch, a host
switch from GitHub to GitLab, then a diagnostic-exception fix) found
that GenVM's sandbox rejects outbound fetches to every external domain
tried — GitHub, GitLab, and an IPFS gateway — with an identical,
deterministic `SystemError:6: forbidden`, regardless of function,
host, or retry logic. That finding is what led to removing the fetch
mechanism entirely rather than continuing to patch around it. The
complete round-by-round investigation — including the two disproven
theories (a GitHub rate limit, a diagnostic gap masking the real
error) — is preserved in full in `docs/testing.md`'s "Investigation"
section, since the reasoning behind each ruled-out theory is still
worth understanding even though none of them turned out to be the
actual cause.

## Known issues found & fixed during build

**(Historical — both issues below relate to the evidence-fetch
mechanism that has since been removed entirely; see "Design history"
in `docs/contracts.md`. Preserved because the underlying lessons —
atomic-write hazards, and not trusting a shared sanitizer across
fields with different safety requirements — are still worth knowing
for any future contract, not because either bug is still live in this
codebase.)**

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

**Status as of the current claim-based deployment:** the contract
itself is now live on both StudioNet and Bradbury (see "Live
deployment" above), confirmed via `GenVM Result: SUCCESS`,
`Consensus Result: Accepted` on StudioNet's deploy transaction. That
confirms the deploy succeeded — it does not confirm any write function
has been exercised against these specific addresses yet. Run the full
manual test plan in `docs/testing.md` (updated for the current
two-write-then-resolve flow, no fetch stage) before trusting this
live — it specifically calls out the edge cases (empty/short claims,
unrebutted deadline expiry, settlement math) most likely to hide a
real bug the way the two fixes above did during the fetch-based
contract's build.

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
