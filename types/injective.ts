/**
 * =============================================================================
 * FILE: types/injective.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Defines the blockchain-domain vocabulary of this app: coins, balances,
 * tokens, chain status and transaction results.
 *
 * WHY IT EXISTS
 * -------------
 * The raw shapes returned by the Injective SDK are protobuf-generated and
 * carry a lot of fields we do not need. Rather than leaking those all over the
 * UI, we define small, honest, *serialisable* types here and convert once, at
 * the boundary, inside `lib/queries.ts`.
 *
 * There is a second, harder reason. Our chain reads happen on the server and
 * travel to the browser as JSON. JSON cannot represent `BigInt`, `Uint8Array`
 * or a protobuf class instance. Anything that crosses that boundary must be a
 * plain object of strings/numbers/booleans. These types enforce that.
 *
 * WHEN TO USE
 * -----------
 * Any time data flows: SDK -> route handler -> hook -> component.
 *
 * EXECUTION FLOW
 * --------------
 *   Injective node
 *        |  protobuf
 *        v
 *   SDK response object      (rich, non-serialisable)
 *        |  lib/queries.ts maps it
 *        v
 *   Types in THIS file       (plain, serialisable)
 *        |  JSON over HTTP
 *        v
 *   React components
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing
 * Depended on by: `lib/queries.ts`, `lib/api.ts`, all `app/api/**` routes,
 *                 all data-rendering components.
 * =============================================================================
 */

/**
 * A raw on-chain amount, exactly as the blockchain stores it.
 *
 * THE MOST IMPORTANT CONCEPT ON THIS PAGE
 * ---------------------------------------
 * Blockchains never store decimals. There is no `1.5 INJ` anywhere on
 * Injective. There is only an integer count of the smallest indivisible unit,
 * plus a separately-known number of decimal places.
 *
 * For INJ that unit has 18 decimals, so:
 *
 *   human-readable   1.5 INJ
 *   on-chain amount  1500000000000000000
 *   denom            "inj"
 *
 * `amount` is typed as a **string**, not a number, and that is not laziness.
 * JavaScript's `number` is a 64-bit float and loses precision above
 * 2^53 ≈ 9.007e15. The value above is 1.5e18 — already past that limit.
 * Storing it as a number would silently corrupt the user's balance.
 *
 * Rule to remember: on-chain amounts are strings; you convert them for display
 * and never for arithmetic.
 */
export interface Coin {
  /**
   * The token's on-chain identifier ("denomination").
   *
   * Examples you will actually see on Injective:
   *   "inj"                                        — the native gas token
   *   "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7" — bridged Ethereum USDT
   *   "factory/inj1.../mytoken"                    — a token-factory token
   *   "ibc/C4CFF46F..."                            — a token that arrived over IBC
   *
   * The denom is opaque: it tells you *which* token, never *how many decimals*
   * it has. That is why `Balance` below carries decimals separately.
   */
  denom: string
  /** Integer amount in the smallest unit, as a decimal string. */
  amount: string
}

/**
 * A balance enriched with everything the UI needs to display it.
 *
 * The chain gives us `{ denom, amount }`. It does NOT give us "USDT", "6
 * decimals", or a logo. Those come from a token registry — an off-chain
 * mapping maintained by wallets, explorers and `lib/constants.ts` in this repo.
 */
export interface Balance {
  denom: string
  /** Raw integer amount in the smallest unit. Always a string. See `Coin`. */
  amount: string
  /** Ticker for display, e.g. "INJ". Falls back to a shortened denom. */
  symbol: string
  /** Full name, e.g. "Injective". */
  name: string
  /** Decimal places for this token. INJ = 18, most bridged stablecoins = 6. */
  decimals: number
  /**
   * `amount` divided by `10 ** decimals`, formatted for humans.
   *
   * Computed once on the server so that every component displays the identical
   * string and nobody re-implements the division (and gets it wrong).
   */
  formattedAmount: string
  /**
   * True when we recognised the denom in our token registry.
   *
   * When false, the UI shows the raw denom and warns that decimals are a guess.
   * Being honest about unknown tokens is better than confidently showing a
   * wrong number.
   */
  isKnownToken: boolean
}

/**
 * Static metadata about a token, held in `lib/constants.ts`.
 *
 * In a production app you would fetch this from Injective's token metadata
 * service or the on-chain bank denom metadata. We hard-code a handful so the
 * concept stays visible instead of hiding behind another network call.
 */
export interface TokenMetadata {
  denom: string
  symbol: string
  name: string
  decimals: number
}

/**
 * A snapshot of the chain's health, used by the "Chain Status" panel.
 *
 * This is the simplest possible *read* from a blockchain — it needs no wallet,
 * no signature and no account. It is the first thing the workshop demonstrates
 * precisely because it proves the RPC connection works before any wallet is
 * involved.
 */
export interface ChainStatus {
  /** e.g. "injective-888". Confirms which network you are actually talking to. */
  chainId: string
  /** Height of the newest block. Increments roughly every 0.65 seconds. */
  latestBlockHeight: string
  /** ISO timestamp of that block, as reported by the chain's validators. */
  latestBlockTime: string
  /** The endpoint that answered, so the UI can show where the data came from. */
  endpoint: string
}

/**
 * The result of a transaction that has been included in a block.
 *
 * `code === 0` means success. Any other value is a chain-level error, and
 * `rawLog` explains it. Note this is *different* from the request failing:
 * a transaction can be perfectly delivered, mined into a block, charge the
 * user gas, and still have `code === 5` ("insufficient funds"). Beginners
 * routinely miss this and report success for failed transfers.
 */
export interface TransactionResult {
  /** Hex hash identifying the transaction. Paste it into an explorer. */
  txHash: string
  /** Block the transaction landed in. */
  height: number
  /** 0 = success. Non-zero = the chain rejected the message. */
  code: number
  /** Human-readable explanation, populated by the chain when `code !== 0`. */
  rawLog: string
  /** Gas the transaction reserved. */
  gasWanted: number
  /** Gas it actually burned. The difference is not refunded on Cosmos chains. */
  gasUsed: number
  /** Deep link to the block explorer for this hash. Built in `lib/helpers.ts`. */
  explorerUrl: string
}

/**
 * The stages a transaction moves through, used to drive the UI stepper.
 *
 * Making this explicit is a teaching device: most beginners think "send a
 * transaction" is one step. It is five, and each one can fail differently.
 *
 *   idle       — nothing happening
 *   preparing  — fetching account number & sequence, building the message
 *   signing    — the wallet popup is open, waiting on the human
 *   broadcasting — signed bytes are in flight to a node
 *   confirming — the node accepted it; we are waiting for block inclusion
 *   success    — included with code 0
 *   error      — failed at any of the above stages
 */
export type TransactionStage =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'success'
  | 'error'
