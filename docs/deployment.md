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

Both networks live, deployed Jul 29, 2026.

- **StudioNet:** `0x04781181f8071B44411bF0Ebf1bc94e049Fc4677` —
  deploy tx:
  [`0xf8d0d63081f2a68257e3ca11ebfa4374c97f11389570929a1531ab5440fa7904`](https://explorer-studio.genlayer.com/tx/0xf8d0d63081f2a68257e3ca11ebfa4374c97f11389570929a1531ab5440fa7904).
  Independently verified: `GenVM Result: SUCCESS`, `Consensus Result:
  Accepted`, status `FINALIZED`.
- **Bradbury:** `0x4fdb53874d4C4247D32A5A0570d73684492932fc` —
  [explorer link](https://explorer-bradbury.genlayer.com/address/0x4fdb53874d4C4247D32A5A0570d73684492932fc).
  Deploy tx hash not yet recorded here — add it once available. This
  network's explorer renders transaction data client-side, so it
  couldn't be independently confirmed the same way as StudioNet during
  this record's writing; confirmed live and deployed by direct visual
  check instead.

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
