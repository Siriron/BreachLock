# Frontend

## Build errors found on first real Vercel build, and fixes

Nothing in this project touched a real `npm install` or `tsc` run
during initial development — no network access was available, so all
prior verification was syntax-only (esbuild) rather than a real
typecheck against actual installed dependencies. The first real Vercel
build surfaced two genuine errors that syntax checking alone couldn't
have caught:

1. **`Property 'env' does not exist on type 'ImportMeta'`**
   (`src/config/chains.ts`). Missing `src/vite-env.d.ts` — the file
   that gives TypeScript the ambient `ImportMeta.env` typing Vite
   projects rely on for `import.meta.env.VITE_*`. Standard Vite
   scaffolding always includes this; it was omitted here because the
   project was hand-assembled rather than generated via
   `npm create vite@latest`. Fixed by adding the file.
2. **`Type 'string' is not assignable to type '0x${string}' | Account | undefined'`**
   (`src/lib/useGenLayer.ts`, the `createClient({ account, ... })`
   call). The wallet-connected `account` state is typed as
   `string | null` (it comes straight from `eth_accounts`/
   `eth_requestAccounts`), but `genlayer-js`/viem's `createClient`
   wants the stricter template-literal type. A truthiness check
   narrows `string | null` to `string`, not down to the template
   literal, so `tsc` correctly flagged this. Fixed with a runtime regex
   check (`/^0x[0-9a-fA-F]{40}$/`) before the cast, rather than a bare
   `as` assertion — a malformed address now fails with a clear error
   here instead of a confusing one further inside the SDK.

While fixing #2, the same unguarded-cast pattern was found and fixed at
two more call sites (`readContractMethod`/`writeContractMethod`'s
`contractAddress as \`0x\${string}\``) by deliberately checking every
other place this project casts a plain string to that stricter type,
rather than only patching the one line the build error pointed at.
`assertContractAddress()` now guards both.

**Still not independently confirmed here:** whether these three fixes
are the *only* remaining build errors. This environment has no network
access, so a full `npm install` + real `tsc`/`vite build` run — the
same thing Vercel actually does — has not been reproduced locally. A
local global `tsc` binary (version 6.0.3, vs. this project's targeted
`^5.5.3`) was tried but is a version mismatch and returned an
ambiguous, likely non-representative result rather than a real
confirmation. Treat the next Vercel build log as the actual source of
truth, the same way this one was.

## Second build attempt — a different failure stage entirely

The first two fixes above got `tsc` to pass with zero errors. The very
next build failed at a *different* stage: Vite/Rollup's actual bundling
step, with `Rollup failed to resolve import "@/App" from
"/vercel/path0/src/main.tsx"`.

**Root cause:** `tsconfig.json` has a `paths` mapping for `@/*` →
`./src/*`, which is what let `tsc` type-check every `@/` import
successfully — but `tsc`'s `paths` config only affects
*type-checking*. Vite's actual bundler (Rollup, under the hood) does
its own, completely separate module resolution and has no knowledge of
`tsconfig.json`'s `paths` unless told explicitly via its own
`resolve.alias` config, which `vite.config.ts` didn't have at all. This
meant every single `@/` import across the whole project (confirmed: 27
import statements across 10 files) would have broken at build time,
even though the type-checking stage saw nothing wrong.

**Fixed** by adding `resolve.alias` to `vite.config.ts`, mapping `@` to
`path.resolve(__dirname, "./src")` — the standard, widely-documented
pattern for exactly this Vite error. Confirmed against multiple current
sources rather than assumed from memory, since this is the actual fix
Vercel will re-run, not just another local syntax pass.

`@types/node` was also added as a dev dependency, since `vite.config.ts`
now imports Node's `path` module and uses `__dirname` — both need
`@types/node` for proper typing (confirmed this is standard practice
alongside the alias fix, not an incidental addition). This file sits
outside `tsconfig.json`'s `"include": ["src"]` scope, so its absence
wasn't actually blocking the build, but leaving a real type-package gap
in place because it happens not to matter yet is exactly the kind of
thing worth closing properly rather than leaving as a silent gap.

**Why this wasn't caught earlier:** syntax-only esbuild checks (used
throughout initial development, since no network access meant no real
`npm install`) don't perform path-alias resolution against a real
`tsconfig.json` the way Rollup does — they check that a file parses as
valid syntax, not that its imports actually resolve to real files via a
specific bundler's resolution rules. This is a distinct failure class
from the first two `tsc` errors, caught at a later build stage, and is
exactly why the honest note above says to treat each new Vercel log as
its own source of truth rather than assume the previous round's fixes
were exhaustive.

## SDK wiring

`src/lib/useGenLayer.ts` is the single point of contact with the chain.
Confirmed subpaths in use: `genlayer-js` (root), `genlayer-js/chains`,
`genlayer-js/types`. There is deliberately no import from
`genlayer-js/utils` — it does not exist. Any Viem-shaped helper
(`parseEther`, `formatEther`) is imported directly from `viem`, which is
an explicit `package.json` dependency, never assumed as a hoisted
transitive one.

`getWriteClient()` always calls `ensureChain(network)` before
constructing the write client, and always passes `provider: eth` —
both required per confirmed working patterns from a prior project in
this line of work.

## Known unconfirmed item — write receipt shape

`writeContractMethod` does **not** attempt to parse a write's JSON
return value out of the transaction receipt. An earlier draft assumed a
field like `receipt.data` would hold it and tried to `JSON.parse()` it
to recover, e.g., a newly-filed bounty's ID — this was never confirmed
against real SDK documentation or types (no network access was
available during build to check), and guessing at an unverified field
name is exactly the class of mistake that caused a confirmed live bug
in a prior project (`.send()` on a contract-at result, which doesn't
exist). Per explicit instruction, this was removed rather than shipped
as a guess: filing/rebutting/resolving all surface success via the tx
hash and an explorer link only. If a future contributor confirms the
real receipt shape, this can be added back — see
`FileBountyForm.tsx`'s `handleSubmit` for the exact spot.

## Component map

- `RedactionHero` — the signature scroll-triggered reveal. Black
  redaction bars over a sample disclosure retract as the user scrolls,
  staggered per line. Has an explicit reduced-motion fallback (no bar
  animation at all, content shown plainly) rather than leaving a
  permanently-stuck redaction bar for users who've asked for less
  motion.
- `Navbar` — logo, network toggle (UI state only — does not itself
  trigger a chain switch), wallet connect/status.
- `FileBountyForm` — the filing flow. Argument order to
  `writeContractMethod("file_bounty", [...])` is verified against the
  contract's actual parameter order in `contracts/breachlock.py`, noted
  inline in a comment so a future edit to either side surfaces a
  mismatch quickly.
- `BountyDetail` — status, evidence, rebut/resolve actions. Re-fetches
  the record via `get_bounty` after every action rather than trying to
  parse anything off the write receipt.
- `BountyList` — reads `list_bounties`. The zero-address check for
  "has a project engaged yet" is built to exactly match the contract's
  own unset-`project_owner` construction
  (`Address("0x" + "0" * 40)`, 42 characters total) — verified by
  direct character count against the contract source after an earlier
  draft's constant was found to be 6 zero-characters short and would
  have silently never matched.
- `FeaturesSection`, `HowItWorksSection`, `StatsSection`,
  `CTAAndFooter` — landing sections. `StatsSection` reads real counts
  from the deployed contract rather than showing placeholder numbers —
  a fresh deploy legitimately shows zeros, which is real information,
  not a broken state.
- `ErrorBoundary`, `NotFound` — styled fallbacks, no blank white crash
  screens.

## Design tokens

- `paper` `#FFFFFF` (background)
- `ink` `#0A0A0A` (text — near-black, not pure, for body-copy comfort)
- `seal` `#F5C400` (primary accent — deep yellow, used for tags,
  redaction-reveal moments, and hover/active states; deliberately not
  used as large flat fills, to avoid reading as a generic warning
  banner)
- `seal-deep` `#B38F00`, `seal-press` `#1A1600` (accent variants for
  borders/hover states)
- `graphite` `#8A8A82` (secondary text/metadata)
- Type: a mono display face (Fragment Mono / IBM Plex Mono fallback)
  for headlines, tags, hashes, and numbers; Inter for body copy.

Never introduces a dark-mode-first treatment or a second accent hue —
the brief was specifically white/black/deep-yellow, and the palette in
`tailwind.config.js` has no near-black-background option to drift
toward during implementation.
