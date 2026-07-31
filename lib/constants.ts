/**
 * =============================================================================
 * FILE: lib/constants.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The single source of truth for "which chain am I on and what does that
 * imply?". Network selection, chain id, RPC endpoints, gas defaults, the token
 * registry and the wallet catalogue all live here.
 *
 * WHY IT EXISTS
 * -------------
 * In a blockchain app, a hard-coded chain id in the wrong file is not a style
 * problem — it is a fund-loss problem. If one module thinks it is on testnet
 * and another builds a transaction for mainnet, the user signs something they
 * did not intend.
 *
 * Centralising configuration means switching from testnet to mainnet is
 * exactly one environment variable, and it is impossible for two modules to
 * disagree.
 *
 * WHEN TO USE
 * -----------
 * Import from here any time you need a chain id, an endpoint, a gas figure or
 * token metadata. Never re-declare these values locally.
 *
 * EXECUTION FLOW
 * --------------
 *   .env.local  (NEXT_PUBLIC_INJECTIVE_NETWORK=testnet)
 *        |
 *        v
 *   resolveNetwork()          -> Network.Testnet
 *        |
 *        v
 *   getNetworkEndpoints()     -> { rest, grpc, indexer, ... }   [Injective SDK]
 *        |
 *        v
 *   NETWORK_CONFIG            -> the frozen object everything else reads
 *        |
 *        +--> lib/clients.ts     (builds SDK clients from the endpoints)
 *        +--> lib/wallet.ts      (passes CHAIN_ID to the wallet)
 *        +--> lib/transactions.ts(stamps CHAIN_ID into the signed payload)
 *        +--> lib/helpers.ts     (builds explorer links)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `@injectivelabs/networks`, `@injectivelabs/ts-types`,
 *              `@injectivelabs/utils`
 * Depended on by: `lib/clients.ts`, `lib/wallet.ts`, `lib/queries.ts`,
 *                 `lib/transactions.ts`, `lib/helpers.ts`, UI components.
 * =============================================================================
 */

import { Network, getNetworkEndpoints } from '@injectivelabs/networks'
import { ChainId } from '@injectivelabs/ts-types'
import type { TokenMetadata, WalletMetadata } from '@/types'

/* ---------------------------------------------------------------------------
 * 1. NETWORK SELECTION
 * ------------------------------------------------------------------------- */

/**
 * The two networks this starter supports, expressed in our own vocabulary.
 *
 * The Injective SDK's `Network` object has ~17 members (MainnetK8s, MainnetLB,
 * TestnetSentry, Devnet3 …) which are infrastructure variants that would only
 * confuse a beginner. We expose two and map them below.
 */
export type SupportedNetwork = 'mainnet' | 'testnet'

/**
 * Reads `NEXT_PUBLIC_INJECTIVE_NETWORK` and turns it into a value we trust.
 *
 * Note the deliberate fail-safe: anything unrecognised becomes testnet. When a
 * configuration mistake could cost real money, the default must be the
 * harmless option. "Fail closed", not "fail open".
 *
 * @returns Either `'mainnet'` or `'testnet'`.
 *
 * @example
 * ```ts
 * // .env.local contains NEXT_PUBLIC_INJECTIVE_NETWORK=mainnet
 * resolveNetworkName() // => 'mainnet'
 *
 * // variable missing, or set to 'mainnett' (typo)
 * resolveNetworkName() // => 'testnet'
 * ```
 *
 * WORKFLOW
 *   read env var
 *        |
 *        v
 *   is it exactly 'mainnet'?
 *        |            \
 *       yes            no
 *        |              \
 *   'mainnet'         'testnet'
 */
function resolveNetworkName(): SupportedNetwork {
  // `process.env.NEXT_PUBLIC_*` is replaced with a literal string at build
  // time, which is why this works identically in the browser and on the server.
  return process.env.NEXT_PUBLIC_INJECTIVE_NETWORK === 'mainnet'
    ? 'mainnet'
    : 'testnet'
}

/** The network this build of the app targets. Computed once, at module load. */
export const NETWORK_NAME: SupportedNetwork = resolveNetworkName()

/** True when pointed at real funds. Used to render loud warnings in the UI. */
export const IS_MAINNET = NETWORK_NAME === 'mainnet'

/**
 * Our `SupportedNetwork` translated into the SDK's `Network` value.
 *
 * `Network.Testnet` and `Network.Mainnet` are what `getNetworkEndpoints()`
 * understands. Keeping the translation in one place means the SDK's naming
 * never leaks into application code.
 */
export const SDK_NETWORK: Network = IS_MAINNET ? Network.Mainnet : Network.Testnet

/**
 * The chain id — the string that uniquely names this blockchain.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 * -----------------------------------
 * The chain id is baked into every signature. When you sign a transaction, the
 * chain id is part of the signed bytes. That means a transaction signed for
 * `injective-888` is *cryptographically invalid* on `injective-1` — it cannot
 * be replayed from testnet to mainnet, or from Injective to any other Cosmos
 * chain. This is called replay protection, and it is why the wallet asks you
 * which chain you are connecting to.
 *
 *   injective-1   -> mainnet
 *   injective-888 -> testnet
 */
export const CHAIN_ID: string = IS_MAINNET ? ChainId.Mainnet : ChainId.Testnet

/* ---------------------------------------------------------------------------
 * 2. ENDPOINTS
 * ------------------------------------------------------------------------- */

/**
 * The public endpoints Injective operates for the selected network.
 *
 * `getNetworkEndpoints()` is a pure lookup table inside the SDK — no network
 * call happens here. It returns:
 *
 *   rest    — the Cosmos "LCD" gateway. Plain HTTP + JSON. Used for account
 *             lookups, latest block, and broadcasting a signed transaction.
 *   grpc    — the gRPC-web gateway. Protobuf over HTTP. Used by every
 *             `ChainGrpc*Api` class. Faster and strongly typed.
 *   indexer — Injective's own indexer, which serves derived data (order books,
 *             trade history, portfolios) that a raw node cannot answer.
 *   rpc     — the raw Tendermint/CometBFT RPC port. We do not use it directly.
 */
const sdkEndpoints = getNetworkEndpoints(SDK_NETWORK)

/**
 * Endpoints, with optional overrides from server-only environment variables.
 *
 * Note that the override variables have NO `NEXT_PUBLIC_` prefix. That is
 * intentional: in the browser these `process.env` reads evaluate to
 * `undefined`, so the public defaults are used there, while the server picks up
 * your private paid node. One object, two correct behaviours, zero leaks.
 *
 * `?? ''` is required because `process.env.X` is `string | undefined` and the
 * `||` chain needs a definite string for TypeScript.
 */
export const ENDPOINTS = {
  rest: process.env.INJECTIVE_REST_ENDPOINT || sdkEndpoints.rest,
  grpc: process.env.INJECTIVE_GRPC_ENDPOINT || sdkEndpoints.grpc,
  indexer: sdkEndpoints.indexer,
} as const

/**
 * Base URL of the block explorer for this network.
 *
 * Every transaction this app sends links here. Showing a learner the real
 * explorer entry for the transaction they just signed is, in practice, the
 * moment the whole thing clicks.
 */
export const EXPLORER_BASE_URL = IS_MAINNET
  ? 'https://explorer.injective.network'
  : 'https://testnet.explorer.injective.network'

/** Where a learner goes to get free testnet INJ. Surfaced in error hints. */
export const FAUCET_URL = 'https://testnet.faucet.injective.network'

/* ---------------------------------------------------------------------------
 * 3. GAS AND FEES
 * ------------------------------------------------------------------------- */

/**
 * The denomination used to pay transaction fees on Injective: native INJ.
 *
 * Every Cosmos chain has a fee token. On Injective it is `inj`. This is why
 * you can hold a million USDT on Injective and still be unable to move it —
 * without a little INJ for gas, nothing can be signed.
 */
export const FEE_DENOM = 'inj'

/** The native token's denom. Same string as `FEE_DENOM`, different meaning. */
export const INJ_DENOM = 'inj'

/**
 * How many decimal places INJ has.
 *
 * 18 is inherited from Ethereum's convention (INJ began life as an ERC-20).
 * Most Cosmos-native tokens use 6, and most bridged stablecoins on Injective
 * also use 6 — so do not assume 18 for anything except INJ itself.
 */
export const INJ_DECIMALS = 18

/**
 * Gas limit for a simple bank transfer.
 *
 * "Gas" is a measure of computational work. You declare an upper bound
 * (`gas`), and the chain charges `gasUsed * gasPrice`. Declaring too little
 * makes the transaction fail with "out of gas" *after* consuming your fee;
 * declaring too much is harmless on Injective because unused gas beyond
 * `gasUsed` is simply not charged against the account balance beyond the fee
 * you committed to.
 *
 * A `MsgSend` costs roughly 90,000–120,000 gas. 220,000 is a comfortable
 * ceiling with room for the account-creation surcharge that applies the first
 * time you send to a brand-new address.
 */
export const DEFAULT_GAS_LIMIT = 220_000

/**
 * Price per unit of gas, in the smallest unit of INJ.
 *
 * 160,000,000 wei-equivalent = 0.00000000016 INJ per gas unit. Combined with
 * the limit above that is roughly 0.0000352 INJ per transfer — a fraction of a
 * cent. Injective's fees being negligible is one of its selling points, but
 * "negligible" is not "zero", which is exactly why the faucet exists.
 */
export const DEFAULT_GAS_PRICE = '160000000'

/**
 * How many blocks into the future a transaction stays valid.
 *
 * Every transaction we build carries `timeoutHeight = currentHeight + this`.
 * Once the chain passes that height the transaction can never execute, even if
 * a node still holds it in its mempool.
 *
 * Why bother? Imagine you sign a transfer, your connection drops, and the
 * transaction sits in a mempool for two hours before being included. Without a
 * timeout, you get an unexpected transfer long after you gave up on it. With
 * one, it simply expires. Injective produces ~1.5 blocks per second, so 120
 * blocks ≈ 80 seconds.
 */
export const TX_TIMEOUT_BLOCKS = 120

/* ---------------------------------------------------------------------------
 * 4. TOKEN REGISTRY
 * ------------------------------------------------------------------------- */

/**
 * A minimal, hand-written token registry.
 *
 * WHY THIS IS HARD-CODED, AND WHY THAT IS THE RIGHT CHOICE HERE
 * -------------------------------------------------------------
 * The chain stores balances as `{ denom, amount }` and nothing else. It does
 * not know that `peggy0xdAC17...` is "USDT with 6 decimals" — that mapping is
 * pure off-chain convention, maintained by wallets and explorers.
 *
 * Production apps resolve it via Injective's token metadata service or the
 * bank module's `DenomsMetadata` query. We hard-code a few entries so the
 * concept stays visible instead of disappearing behind another API call.
 * `lib/queries.ts` degrades gracefully for anything not listed here.
 */
export const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  inj: {
    denom: 'inj',
    symbol: 'INJ',
    name: 'Injective',
    decimals: INJ_DECIMALS,
  },
  peggy0xdAC17F958D2ee523a2206206994597C13D831ec7: {
    denom: 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD (bridged from Ethereum)',
    decimals: 6,
  },
  peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48: {
    denom: 'peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin (bridged from Ethereum)',
    decimals: 6,
  },
}

/**
 * Decimals assumed for a denom we do not recognise.
 *
 * 6 is the Cosmos default and the most common value in the ecosystem. The UI
 * always flags these balances as unverified (`isKnownToken: false`) rather than
 * silently presenting a possibly-wrong number as fact.
 */
export const FALLBACK_DECIMALS = 6

/* ---------------------------------------------------------------------------
 * 5. WALLETS
 * ------------------------------------------------------------------------- */

/**
 * The wallets shown in the connect modal.
 *
 * Adding a third Cosmos wallet (Cosmostation, OWallet, …) is a matter of
 * appending one object here — no branching logic anywhere else, because
 * `lib/wallet.ts` reads `windowKey` from this data.
 */
export const SUPPORTED_WALLETS: WalletMetadata[] = [
  {
    id: 'keplr',
    name: 'Keplr',
    description: 'The most widely used Cosmos wallet. Available on all browsers.',
    downloadUrl: 'https://www.keplr.app/download',
    windowKey: 'keplr',
  },
  {
    id: 'leap',
    name: 'Leap',
    description: 'A fast, mobile-first Cosmos wallet with a browser extension.',
    downloadUrl: 'https://www.leapwallet.io/download',
    windowKey: 'leap',
  },
]

/**
 * `localStorage` key remembering which wallet the user last used.
 *
 * IMPORTANT SECURITY NOTE FOR LEARNERS
 * ------------------------------------
 * We store the wallet *name*, never an address and never anything sensitive.
 * On reload we ask the extension again for the address. That matters because
 * the user may have switched accounts inside their wallet while your tab was
 * closed — trusting a cached address would show them somebody else's balance.
 *
 * The rule: the wallet extension is the source of truth for identity. Your app
 * caches a hint, not an answer.
 */
export const LAST_WALLET_STORAGE_KEY = 'injective-starter:last-wallet'

/* ---------------------------------------------------------------------------
 * 6. UI TUNING
 * ------------------------------------------------------------------------- */

/**
 * How often data panels re-fetch, in milliseconds.
 *
 * Blockchains have no push notifications for ordinary web apps. Either you
 * poll, or you open a WebSocket stream. Polling is simpler and is what this
 * starter demonstrates; streaming is listed under "Next steps" in the README.
 */
export const POLL_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 15_000,
)

/**
 * How long we wait for a transaction to appear in a block before giving up.
 *
 * Injective blocks are fast (~0.65s), so 40 seconds is generous. We still need
 * a ceiling: without one, a UI spinner can hang forever when a node stalls.
 */
export const TX_CONFIRMATION_TIMEOUT_MS = 40_000
