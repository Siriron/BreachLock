# Deployment

## Network config

| | Bradbury (testnet) | StudioNet |
|---|---|---|
| RPC | https://rpc-bradbury.genlayer.com | https://studio.genlayer.com/api |
| Chain ID | 4221 (0x107D) | 61999 (0xF22F) |
| Explorer | explorer-bradbury.genlayer.com | explorer-studio.genlayer.com |

Faucet: https://testnet-faucet.genlayer.foundation

## Contract deploy steps

1. Confirm line 1 of `contracts/breachlock.py` is the pinned hash
   `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` —
   never `"py-genlayer:test"`.
2. Run the full checklist in `docs/contracts.md`'s nondet section
   against the current file state.
3. Run `genvm-lint` locally (`pip install genvm-linter`) — must exit 0.
4. Go to studio.genlayer.com/contracts, upload the `.py` file directly
   (never paste code inline, never deploy via a MetaMask/EVM-style
   transaction — both are confirmed-rejected paths).
5. Repeat for both StudioNet and Bradbury.
6. Record both addresses and deploy TX hashes below and in the main
   README.

## Deployed addresses

Current deployment — the claim-based contract (two-arg `file_bounty`,
no evidence fetch). Both networks live, deployed Aug 6, 2026.

- **StudioNet:** `0x950d2497Ac764dead125EF95209eC28deE34517d` —
  deploy tx:
  [`0xd9377d0d78a94753d3214bba4565557898702ba3f8bf02e5766ce9dcac273957`](https://explorer-studio.genlayer.com/tx/0xd9377d0d78a94753d3214bba4565557898702ba3f8bf02e5766ce9dcac273957).
  Independently verified directly via the explorer: `GenVM Result:
  SUCCESS`, `Consensus Result: Accepted`, status `FINALIZED`, deployed
  Aug 6, 2026, 3:24:30 AM, creator `0x6c0173bbE686c193e2e0D1DB77e847a48dc66e9A`.
- **Bradbury:** `0x04e379Db6e62b6851D4B85D3E31A1D32B49DF900` —
  [explorer link](https://explorer-bradbury.genlayer.com/address/0x04e379Db6e62b6851D4B85D3E31A1D32B49DF900).
  Deploy tx hash not yet recorded here — add it once available. This
  network's explorer renders transaction data client-side, so it
  couldn't be independently confirmed the same way as StudioNet during
  this record's writing; confirm live and deployed by direct visual
  check instead before treating it as verified.

**Prior deployment, superseded:** the earlier fetch-based contract
(five-arg `file_bounty` — `repo_owner`/`repo_name`/`commit_hash`/
`file_path`/`disputed_claim`/`claimed_severity`) was deployed to
StudioNet at `0x04781181f8071B44411bF0Ebf1bc94e049Fc4677` and Bradbury
at `0x4fdb53874d4C4247D32A5A0570d73684492932fc` on Jul 29, 2026. Those
addresses are incompatible with the current frontend and current
contract ABI — do not use them. See `docs/contracts.md`'s "Design
history" section for why the fetch mechanism was removed.

## Frontend deploy (Vercel)

1. `npm install`, confirm `npm run build` succeeds locally first.
2. Push to GitHub.
3. Import the repo into Vercel.
4. Set `VITE_CONTRACT_ADDRESS_STUDIONET` and
   `VITE_CONTRACT_ADDRESS_BRADBURY` as Vercel project environment
   variables (these are public addresses, not secrets — no committed
   `.env` file required).
5. Confirm `vercel.json`'s SPA rewrite is present so client-side routes
   don't 404 on refresh.
6. Add a real `public/og-image.png` (1200×630px) before considering the
   deploy complete — see the open item in the main README.
