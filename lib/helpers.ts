/**
 * =============================================================================
 * FILE: lib/helpers.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The unit-conversion layer. Converts between what humans type ("1.5 INJ") and
 * what the blockchain stores ("1500000000000000000"), plus a few small
 * chain-aware utilities such as explorer links.
 *
 * WHY IT EXISTS
 * -------------
 * This is, without exaggeration, where beginners lose money.
 *
 * The blockchain has no concept of "1.5 INJ". It stores an integer count of the
 * smallest indivisible unit. INJ has 18 decimals, so:
 *
 *      1.5 INJ  ==  1500000000000000000 (base units)
 *
 * Every message you build must carry the second form. Send `1.5` where the
 * chain expects base units and you have transferred 1.5 × 10⁻¹⁸ INJ — a
 * rounding error. Send `1500000000000000000` to a UI expecting human units and
 * you display a balance a quintillion times too large.
 *
 * And you cannot do this arithmetic with JavaScript numbers. `Number` is a
 * 64-bit float, exact only up to 2^53 ≈ 9.007 × 10¹⁵. The value above is
 * 1.5 × 10¹⁸ — already beyond it. `1.5 * 1e18` in plain JS gives
 * `1500000000000000000` by luck, but `0.1 * 1e18` gives
 * `100000000000000000.00000001`. On a ledger, "by luck" is not a strategy.
 *
 * So every conversion here goes through `BigNumberInBase` / `BigNumberInWei`
 * from `@injectivelabs/utils`, which are arbitrary-precision decimals.
 *
 * A NOTE ON THE NAMES `Base` AND `Wei`
 * ------------------------------------
 * Injective's SDK inherits Ethereum's vocabulary:
 *   "base" = human-readable unit   (1.5 INJ)
 *   "wei"  = smallest unit          (1500000000000000000)
 * The names are historical and apply to every token, not just ETH-derived ones.
 *
 * WHEN TO USE
 * -----------
 * `toChainAmount` immediately before constructing any message.
 * `toHumanAmount` immediately after reading any balance.
 * Nowhere else — if you are converting in the middle of a flow, the flow is
 * probably carrying the wrong unit around.
 *
 * EXECUTION FLOW
 * --------------
 *   user types "1.5"
 *        |
 *        v
 *   toChainAmount('1.5', 18)  ->  "1500000000000000000"
 *        |
 *        v
 *   MsgSend { amount: { denom: 'inj', amount: "1500..." } }
 *        |
 *        v
 *   chain stores the integer
 *        |
 *        v
 *   toHumanAmount("1500...", 18) -> "1.5"
 *        |
 *        v
 *   UI
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `@injectivelabs/utils`, `lib/constants.ts`
 * Depended on by: `lib/queries.ts`, `lib/transactions.ts`,
 *                 `components/transfer/SendInjForm.tsx`,
 *                 `components/balances/*`
 * =============================================================================
 */

import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils'
import {
  EXPLORER_BASE_URL,
  FALLBACK_DECIMALS,
  KNOWN_TOKENS,
  DEFAULT_GAS_LIMIT,
  DEFAULT_GAS_PRICE,
  INJ_DECIMALS,
} from './constants'
import type { TokenMetadata } from '@/types'

/**
 * Converts a human-readable amount into the integer the chain expects.
 *
 * PURPOSE
 * This is the function that stands between a user typing "1.5" and a
 * transaction that actually moves 1.5 tokens. It exists so that no other file
 * ever has to think about decimals.
 *
 * @param humanAmount A decimal string as a person would write it, e.g. `"1.5"`.
 *                    A `number` is accepted for convenience but a string is
 *                    strongly preferred — it is what an `<input>` gives you and
 *                    it cannot have already lost precision.
 * @param decimals    How many decimal places the token has. INJ is 18, most
 *                    bridged stablecoins are 6. Defaults to INJ's 18.
 * @returns The amount in base units as an integer decimal string, e.g.
 *          `"1500000000000000000"`. Always a string — see the file header.
 *
 * @example
 * ```ts
 * toChainAmount('1.5', 18)   // '1500000000000000000'
 * toChainAmount('1', 6)      // '1000000'          (1 USDT)
 * toChainAmount('0.000001', 18) // '1000000000000'
 * toChainAmount('1.23456789', 6) // '1234567'      truncated, NOT rounded up
 * ```
 *
 * WORKFLOW
 *   receive "1.5", decimals 18
 *        |
 *        v
 *   BigNumberInBase("1.5")            <- exact decimal, no float involved
 *        |
 *        v
 *   .toWei(18)  == multiply by 10^18
 *        |
 *        v
 *   .toFixed(0, ROUND_DOWN)  == drop any sub-unit remainder
 *        |
 *        v
 *   "1500000000000000000"
 *
 * WHY ROUND DOWN AND NOT NEAREST
 * ------------------------------
 * If a user enters more decimal places than the token supports, we truncate
 * rather than round up. Rounding up would move *more* of the user's money than
 * they asked for. When in doubt, always err in the direction that moves less.
 */
export function toChainAmount(
  humanAmount: string | number,
  decimals: number = INJ_DECIMALS,
): string {
  // `BigNumberInBase` parses the decimal string exactly. Nothing here ever
  // becomes a JavaScript float, which is the entire point.
  const inBase = new BigNumberInBase(humanAmount)

  // `.toWei(decimals)` shifts the decimal point right by `decimals` places.
  // `toFixed(0, ROUND_DOWN)` then produces an integer string with no exponent
  // notation — critical, because `String(1.5e18)` would give "1.5e+18", which
  // the chain cannot parse.
  return inBase.toWei(decimals).toFixed(0, BigNumberInWei.ROUND_DOWN)
}

/**
 * Converts an on-chain integer amount back into human-readable form.
 *
 * PURPOSE
 * The exact inverse of `toChainAmount`. Every balance the chain reports passes
 * through here before a person sees it.
 *
 * @param chainAmount The raw base-unit amount as a string, e.g.
 *                    `"1500000000000000000"`.
 * @param decimals    The token's decimal places. Defaults to INJ's 18.
 * @returns An exact decimal string, e.g. `"1.5"`. Still exact — formatting for
 *          display is a separate, lossy step handled by `utils/format.ts`.
 *
 * @example
 * ```ts
 * toHumanAmount('1500000000000000000', 18) // '1.5'
 * toHumanAmount('1000000', 6)              // '1'
 * toHumanAmount('0', 18)                   // '0'
 * ```
 *
 * WORKFLOW
 *   receive "1500000000000000000", decimals 18
 *        |
 *        v
 *   BigNumberInWei(...)
 *        |
 *        v
 *   .toBase(18)  == divide by 10^18
 *        |
 *        v
 *   .toFixed()   == exact decimal string, no exponent
 *
 * NOTE
 * The returned string may have many decimal places (`"1.500000000000000000"`
 * normalises to `"1.5"`, but odd balances will not). Do not render it raw —
 * pass it through `formatAmount()` first.
 */
export function toHumanAmount(
  chainAmount: string,
  decimals: number = INJ_DECIMALS,
): string {
  return new BigNumberInWei(chainAmount).toBase(decimals).toFixed()
}

/**
 * Looks up display metadata for a denomination.
 *
 * PURPOSE
 * The chain tells you *how much* of a denom an account holds, never *what that
 * denom is*. This resolves the denom against our registry and degrades
 * gracefully — honestly labelling anything it does not recognise instead of
 * guessing confidently.
 *
 * @param denom The raw denomination, e.g. `"inj"` or `"peggy0xdAC17…"`.
 * @returns `{ metadata, isKnown }`. When `isKnown` is false, `metadata` is a
 *          best-effort placeholder built from the denom itself.
 *
 * @example
 * ```ts
 * resolveToken('inj')
 * // { metadata: { symbol: 'INJ', decimals: 18, … }, isKnown: true }
 *
 * resolveToken('factory/inj1abc.../mycoin')
 * // { metadata: { symbol: 'MYCOIN', decimals: 6, … }, isKnown: false }
 * ```
 *
 * WORKFLOW
 *   denom in KNOWN_TOKENS?  -- yes --> return it, isKnown: true
 *        | no
 *        v
 *   derive a readable symbol from the denom's last path segment
 *        |
 *        v
 *   assume FALLBACK_DECIMALS, return isKnown: false
 *
 * WHY NOT JUST FETCH THE METADATA?
 * You can — the bank module exposes `DenomsMetadata`, and Injective runs a
 * metadata service. Both are correct and both are what a production app does.
 * A hard-coded registry is used here so the concept ("denoms carry no decimals,
 * that knowledge is off-chain") stays visible rather than buried in a fetch.
 */
export function resolveToken(denom: string): {
  metadata: TokenMetadata
  isKnown: boolean
} {
  const known = KNOWN_TOKENS[denom]
  if (known) {
    return { metadata: known, isKnown: true }
  }

  // Token-factory denoms look like `factory/<creator-address>/<subdenom>`, and
  // IBC denoms like `ibc/<hash>`. Taking the last segment gives us something
  // more readable than the full string in both cases.
  const lastSegment = denom.split('/').pop() ?? denom
  const symbol = lastSegment.slice(0, 12).toUpperCase()

  return {
    metadata: {
      denom,
      symbol,
      name: 'Unrecognised token',
      decimals: FALLBACK_DECIMALS,
    },
    isKnown: false,
  }
}

/**
 * Builds a block-explorer URL for a transaction hash.
 *
 * PURPOSE
 * Linking to the explorer is the moment a workshop attendee stops taking your
 * word for it. They click, and there is their transaction on a public ledger,
 * visible to anyone in the world. Nothing else teaches finality as quickly.
 *
 * @param txHash The hex transaction hash returned by a broadcast.
 * @returns An absolute URL on the explorer for the configured network.
 *
 * @example
 * ```ts
 * getExplorerTxUrl('9C1D...E4')
 * // testnet -> 'https://testnet.explorer.injective.network/transaction/9C1D...E4'
 * ```
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/transaction/${txHash}`
}

/**
 * Builds a block-explorer URL for an account.
 *
 * @param address An `inj1…` address.
 * @returns An absolute URL to that account's explorer page.
 *
 * @example
 * ```ts
 * getExplorerAccountUrl('inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm')
 * ```
 */
export function getExplorerAccountUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/account/${address}`
}

/**
 * Computes the fee this app attaches to a transaction.
 *
 * PURPOSE
 * Produces the `StdFee` object every Cosmos transaction requires, and — just
 * as importantly — gives the UI a human-readable figure so the user can see
 * what they are about to pay *before* the wallet popup appears.
 *
 * @returns An object with the SDK-shaped `stdFee` and a display string.
 *
 * @example
 * ```ts
 * const { stdFee, humanReadableFee } = getTransactionFee()
 * // stdFee.amount[0] === { denom: 'inj', amount: '35200000000000000' }
 * // humanReadableFee === '0.0352'
 * ```
 *
 * WORKFLOW
 *   gasLimit (220000) x gasPrice (160000000)
 *        |
 *        v
 *   total fee in base units: 35200000000000000
 *        |
 *        +--> stdFee, for the transaction
 *        |
 *        +--> toHumanAmount() -> "0.0352", for the UI
 *
 * WHY A FIXED FEE RATHER THAN SIMULATION
 * --------------------------------------
 * Production apps often *simulate* the transaction first (`TxRestApi.simulate`)
 * to learn its exact `gasUsed`, then set the limit to that plus a margin. It is
 * more precise and it is the right thing to do for complex smart-contract
 * calls. For a bank transfer — whose cost barely varies — a generous fixed
 * limit is simpler, faster, and one fewer moving part to explain. Simulation is
 * listed under "Next steps" in the README.
 */
export function getTransactionFee(): {
  stdFee: {
    amount: Array<{ denom: string; amount: string }>
    gas: string
  }
  humanReadableFee: string
} {
  // Fee = gas limit x gas price. Both are integers in base units, so this
  // multiplication must be exact — hence BigNumberInWei rather than `*`.
  const totalFeeInBaseUnits = new BigNumberInWei(DEFAULT_GAS_PRICE)
    .times(DEFAULT_GAS_LIMIT)
    .toFixed(0)

  return {
    stdFee: {
      // `amount` is an array because Cosmos technically allows paying a fee in
      // several denominations at once. Injective only ever uses INJ, so this
      // array always has exactly one element.
      amount: [{ denom: 'inj', amount: totalFeeInBaseUnits }],
      // `gas` is the LIMIT, not the price, and the SDK wants it as a string.
      gas: DEFAULT_GAS_LIMIT.toString(),
    },
    humanReadableFee: toHumanAmount(totalFeeInBaseUnits, INJ_DECIMALS),
  }
}

/**
 * Pauses execution for a given number of milliseconds.
 *
 * @param ms How long to wait.
 * @returns A promise resolving after the delay.
 *
 * @example
 * ```ts
 * await sleep(1000) // wait one second before polling again
 * ```
 *
 * WHY THIS EXISTS
 * Blockchains are eventually consistent in a very literal way: a node can
 * accept your transaction and confirm it exists a fraction of a second before
 * its balance state reflects the change. Waiting briefly before refetching
 * avoids showing the user a stale balance right after a successful send.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
