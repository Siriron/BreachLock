# Architecture

```
Reporter                          Project
   |                                 |
   | file_bounty(claim, severity)    |
   |-------------------------------->|
   |         [status: filed]         |
   |                                 |
   |          14-day window          | rebut(bounty_id, rebuttal_text)
   |<--------------------------------|
   |       [status: rebutted]        |
   |                                 |
        resolve_dispute(bounty_id)
                   |
                   v
   +-------------------------------------+
   |  Deterministic body:                |
   |  - assert status/deadline gates     |
   |  - copy_to_memory(bounty record)    |
   +-------------------------------------+
                   |
                   v
   +-------------------------------------+
   |  run_nondet_unsafe(leader_fn,       |
   |                    validator_fn)    |
   |  - leader judges claim vs rebuttal, |
   |    prompts LLM (no external fetch — |
   |    see docs/contracts.md's design-  |
   |    history section for why)         |
   |  - validator re-derives             |
   |    independently, compares          |
   +-------------------------------------+
                   |
                   v
   +-------------------------------------+
   |  Settlement (_settle) — strictly    |
   |  after nondet returns. Deterministic|
   |  stake split per verdict severity.  |
   +-------------------------------------+
```

## Components

- **Contract** (`contracts/breachlock.py`) — single `BreachLock`
  contract. See `docs/contracts.md` for full design rationale.
- **Frontend** (`src/`) — React + Vite. `src/lib/useGenLayer.ts` is the
  single point of contact with the chain; every component reads/writes
  through it, never calling `genlayer-js` directly.
- **Design system** — white background, near-black ink text, deep
  yellow ("seal") accent. Mono display type (case-file/disclosure
  aesthetic) paired with a sans body face. See `docs/frontend.md` for
  the token values.

## Data flow

All reads go through `readContractMethod`, which parses the JSON string
every view returns (`get_bounty`, `list_bounties`, `get_protocol_pool`).
All writes go through `writeContractMethod`, which handles chain-
switching (`ensureChain`), the `provider`/`value` requirements, and a
generous receipt-wait tuned per network (StudioNet vs Bradbury have
different retry/interval defaults — judged writes trigger an LLM call
and genuinely take real minutes).
