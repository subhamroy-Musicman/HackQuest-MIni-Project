# Build plan — educational Injective dApp starter

## Plan

- [x] Verify SDK APIs against installed typings (not memory)
- [x] Scaffold Next.js 15 + React 19 + TS 5.9 + Tailwind v4
- [x] `types/` — vocabulary layer (injective, wallet, api, global.d.ts)
- [x] `lib/constants.ts` — network, chain id, endpoints, gas, tokens, wallets
- [x] `lib/errors.ts` — AppError + translation of every realistic failure
- [x] `utils/` — format, validation, cn
- [x] `lib/helpers.ts` — exact unit conversion, explorer links, fee
- [x] `lib/clients.ts` — memoised SDK clients (server)
- [x] `lib/queries.ts` — reads (server)
- [x] `lib/wallet.ts` — detect / connect / signer (browser)
- [x] `lib/api.ts` — typed fetch client (browser)
- [x] `lib/transactions.ts` — build / sign / broadcast (browser)
- [x] `app/api/` — 4 route handlers + shared envelope
- [x] `context/WalletProvider.tsx` + 6 hooks
- [x] `components/ui/` — 7 primitives
- [x] Feature components — wallet, chain, balances, transfer
- [x] `app/layout.tsx`, `app/page.tsx`, `globals.css`, `icon.svg`
- [x] `public/` + directory README
- [x] `.env.example`, `.gitignore`, configs
- [x] README with Mermaid diagrams, FAQ, troubleshooting
- [x] Verify: typecheck, lint, build, live endpoints, signed-tx round trip

## Verification performed

Not assumed — actually run.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Lint | `npm run lint` | clean |
| Build | `npm run build` | 4 routes, 459 kB first load on `/` |
| SSR | `curl localhost:3000` | all four panels present in HTML |
| Chain read | `GET /api/chain/status` | live testnet block 135,207,045 |
| Balance read | `GET /api/account/inj1dzq…wzsz/balances` | `200`, empty array (correct for unfunded) |
| Unfunded account | `GET /api/account/inj1dzq…wzsz/auth` | `404 ACCOUNT_NOT_FOUND` |
| Bad prefix | `GET /api/account/cosmos1abc/balances` | `400 INVALID_ADDRESS`, caught locally |
| Bad checksum | `GET /api/account/inj1dzqd00…jxjm/balances` | `400 INVALID_ADDRESS`, caught by chain |
| Malformed body | `POST /api/tx/broadcast {"nope":1}` | `400 INVALID_REQUEST` |
| **Signed tx round trip** | locally-signed `MsgSend` POSTed to broadcast route | `422 TX_FAILED` — reached the node at `cosmos/tx/v1beta1/txs`, so encode → HTTP → decode → broadcast is proven |

The only path not machine-verified is the wallet-extension signature itself
(stage 2), which requires a browser extension and a human click.

## Review

### Architecture

Reads go browser → route handler → SDK → node. Writes are built and signed in
the browser, then relayed through a route handler. Rationale and the honest
trade-off are documented in README §8 and in `lib/queries.ts`.

Layering is strictly one-directional: `components/` → `hooks/` → `lib/` →
`types/`. `lib/` contains no React, so it is runnable from a script — which is
how the signed-transaction round trip above was tested.

### Deviations from the original brief, and why

1. **A backend was added.** The brief implied a frontend-only dApp. A thin
   read/relay backend keeps paid RPC URLs private, removes CORS entirely, and
   makes the project genuinely full-stack as requested. Both the reasoning and
   how to remove it are documented.

2. **Direct wallet injection instead of `@injectivelabs/wallet-strategy`.** The
   wallet packages pull a large dependency tree for functionality this project
   does not need. Reading `window.keplr` directly is fewer dependencies and, more
   importantly, shows a learner what a wallet API actually is.

3. **`TxRaw` is sent as three base64 fields, not one protobuf blob.** Forced:
   `@injectivelabs/sdk-ts` exports `TxRaw` as a *type* only — there is no runtime
   codec (verified: `typeof require('@injectivelabs/sdk-ts').TxRaw === 'undefined'`).
   Sending `{ bodyBytes, authInfoBytes, signatures }` avoids shipping a protobuf
   encoder to the browser and has a teaching benefit: the anatomy of a signed
   Cosmos transaction is visible in the network tab.

### Two bugs found by testing against a live node

Both would have shipped if the error mapping had only been reasoned about rather
than exercised:

- `account not found` never matched, because the chain interpolates the address
  into the message (`account inj1abc… not found`). Fixed with a regex.
- `failed to marshal error message` — Injective's LCD response when the ante
  handler rejects a transaction — mapped to `UNKNOWN`. Now translated into its
  realistic causes.

### Known limitations, stated honestly

- `validateInjectiveAddress` does not verify the bech32 checksum. Documented in
  the function's JSDoc; the chain catches it and `lib/errors.ts` explains it.
- Balances take the first page only. Fine for a workshop; noted in `lib/queries.ts`.
- The token registry is hard-coded. Deliberate — it keeps "denoms carry no
  decimal information" visible instead of hidden behind a fetch.
- Polling, not streaming. Deliberate; streaming is next-steps material.
