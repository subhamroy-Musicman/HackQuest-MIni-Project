/**
 * =============================================================================
 * FILE: utils/format.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Presentation helpers. Everything in this file turns data into a string a
 * human is meant to look at, and nothing in it touches the blockchain.
 *
 * WHY IT EXISTS
 * -------------
 * There is a hard rule worth internalising early: **formatting is not
 * arithmetic**. The moment you format a number you have thrown away precision,
 * so a formatted value must never travel back into a calculation, and
 * certainly never into a transaction.
 *
 * Keeping every formatter in one file that imports nothing from `lib/` makes
 * that separation physically enforceable. If you ever find yourself wanting to
 * import `lib/transactions.ts` here, something has gone wrong upstream.
 *
 * The chain-aware conversions (human units <-> smallest units) deliberately
 * live elsewhere, in `lib/helpers.ts`, because they are exact and must never be
 * confused with the lossy functions here.
 *
 * WHEN TO USE
 * -----------
 * Inside components, at the last possible moment before rendering.
 *
 * EXECUTION FLOW
 * --------------
 *   exact value from the chain (string)
 *        |
 *        v
 *   lib/helpers.ts converts units      <- still exact
 *        |
 *        v
 *   utils/format.ts formats for display <- lossy, terminal step
 *        |
 *        v
 *   JSX
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing
 * Depended on by: components under `components/`, `lib/queries.ts`
 * =============================================================================
 */

/**
 * Shortens a blockchain address for display.
 *
 * PURPOSE
 * A full Injective address is 42 characters and destroys any layout it is
 * dropped into. Truncating from both ends preserves what humans actually use
 * to recognise an address at a glance — the beginning and the end.
 *
 * @param address    The full address, e.g. `inj1qqqqqq...zzzz`.
 * @param leadingChars  How many characters to keep at the start. Default 10,
 *                      which keeps the `inj1` prefix plus six meaningful ones.
 * @param trailingChars How many to keep at the end. Default 6.
 * @returns A truncated string such as `inj1qqqqqq…4dzzzz`, or the original
 *          string if it is already short enough to display in full.
 *
 * @example
 * ```ts
 * truncateAddress('inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm')
 * // => 'inj1dzqd0…tjxjm'
 *
 * truncateAddress('inj1short', 4, 4) // string is short -> returned unchanged
 * ```
 *
 * WORKFLOW
 *   receive address
 *        |
 *        v
 *   would truncation actually save space? -- no --> return unchanged
 *        | yes
 *        v
 *   slice head + '…' + slice tail
 *
 * SECURITY NOTE
 * Always let users see and copy the FULL address somewhere. Address-poisoning
 * attacks work by generating a vanity address whose first and last characters
 * match one you have used before, betting that you will only check the
 * truncated form. This app therefore shows the truncated version but copies
 * the complete one.
 */
export function truncateAddress(
  address: string,
  leadingChars = 10,
  trailingChars = 6,
): string {
  if (!address) return ''

  // Truncating a string that is barely longer than the result is pointless and
  // looks broken, so we bail out unless there is something real to hide.
  if (address.length <= leadingChars + trailingChars + 1) return address

  return `${address.slice(0, leadingChars)}…${address.slice(-trailingChars)}`
}

/**
 * Formats a decimal-string amount for display.
 *
 * PURPOSE
 * Token balances arrive as exact decimal strings such as
 * `"12.345678901234567890"`. Showing all 20 characters is noise; showing too
 * few hides meaningful value. This picks a sensible middle ground and adds
 * thousands separators.
 *
 * @param value        An exact decimal string, e.g. `"1234.5678"`. Accepts a
 *                     `number` too, for convenience, but strings are preferred.
 * @param maxDecimals  Maximum fraction digits to render. Default 6.
 * @returns A locale-formatted string, e.g. `"1,234.5678"`.
 *
 * @example
 * ```ts
 * formatAmount('1234.56789012')  // '1,234.56789'
 * formatAmount('0.000000000001') // '<0.000001'   (too small to show honestly)
 * formatAmount('0')              // '0'
 * ```
 *
 * WORKFLOW
 *   parse to a float for formatting only
 *        |
 *        v
 *   is it exactly zero?          -- yes --> '0'
 *        | no
 *        v
 *   is it smaller than the smallest renderable digit? -- yes --> '<0.000001'
 *        | no
 *        v
 *   Intl.NumberFormat with grouping
 *
 * WHY THE `<0.000001` CASE MATTERS
 * Rounding a tiny non-zero balance to `"0.000000"` tells the user they have
 * nothing when they in fact hold dust. Saying "smaller than the smallest amount
 * I can show you" is honest; silently rounding to zero is not.
 */
export function formatAmount(value: string | number, maxDecimals = 6): string {
  const asNumber = typeof value === 'number' ? value : Number.parseFloat(value)

  // `Number.parseFloat('')` and `parseFloat('abc')` both yield NaN.
  if (!Number.isFinite(asNumber)) return '0'
  if (asNumber === 0) return '0'

  const smallestRenderable = 1 / 10 ** maxDecimals
  if (Math.abs(asNumber) < smallestRenderable) {
    return `<${smallestRenderable.toFixed(maxDecimals)}`
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(asNumber)
}

/**
 * Renders a token amount alongside its ticker.
 *
 * @param value  Human-readable amount, e.g. `"1.5"`.
 * @param symbol Ticker, e.g. `"INJ"`.
 * @param maxDecimals Passed through to `formatAmount`.
 * @returns e.g. `"1.5 INJ"`.
 *
 * @example
 * ```ts
 * formatTokenAmount('1500.25', 'INJ') // '1,500.25 INJ'
 * ```
 */
export function formatTokenAmount(
  value: string | number,
  symbol: string,
  maxDecimals = 6,
): string {
  return `${formatAmount(value, maxDecimals)} ${symbol}`
}

/**
 * Turns a block timestamp into a relative phrase.
 *
 * PURPOSE
 * "3 seconds ago" tells a learner that the chain is alive far more effectively
 * than an ISO timestamp does. When the number stops moving, something is wrong
 * — and that is instantly visible.
 *
 * @param isoTimestamp An ISO-8601 string, e.g. the `time` field of a block header.
 * @returns A short phrase such as `"just now"`, `"12s ago"`, `"3m ago"`.
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 45_000).toISOString()) // '45s ago'
 * ```
 *
 * WORKFLOW
 *   parse the timestamp
 *        |
 *        v
 *   invalid? -> 'unknown'
 *        |
 *        v
 *   difference in seconds -> pick the largest fitting unit
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const timestampMs = new Date(isoTimestamp).getTime()
  if (Number.isNaN(timestampMs)) return 'unknown'

  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))

  if (secondsAgo < 2) return 'just now'
  if (secondsAgo < 60) return `${secondsAgo}s ago`
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
  if (secondsAgo < 86_400) return `${Math.floor(secondsAgo / 3600)}h ago`
  return `${Math.floor(secondsAgo / 86_400)}d ago`
}

/**
 * Adds thousands separators to a block height.
 *
 * @param height Block height as a string, e.g. `"84213590"`.
 * @returns e.g. `"84,213,590"`.
 *
 * @example
 * ```ts
 * formatBlockHeight('84213590') // '84,213,590'
 * ```
 *
 * WHY A SEPARATE FUNCTION
 * Block heights are integers that are always safe to convert to `number`
 * (Injective would need ~400 million years to exceed `Number.MAX_SAFE_INTEGER`
 * at one block per second). Token amounts are *not* safe that way. Two
 * functions keeps that distinction obvious instead of relying on a comment.
 */
export function formatBlockHeight(height: string): string {
  const asNumber = Number(height)
  if (!Number.isFinite(asNumber)) return height
  return new Intl.NumberFormat('en-US').format(asNumber)
}

/**
 * Shortens a long token denomination for display.
 *
 * PURPOSE
 * Denoms such as `ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9`
 * are 68 characters of hash. This keeps the informative prefix and elides the rest.
 *
 * @param denom The raw denomination string.
 * @returns A display-safe string, e.g. `"ibc/C4CFF46F…"`.
 *
 * @example
 * ```ts
 * formatDenom('inj')                                  // 'inj'
 * formatDenom('peggy0xdAC17F958D2ee523a2206206994597C13D831ec7')
 * //                                                   'peggy0xdAC17F…'
 * ```
 */
export function formatDenom(denom: string): string {
  if (denom.length <= 20) return denom
  return `${denom.slice(0, 14)}…`
}

/**
 * Shortens a transaction hash for display.
 *
 * @param txHash A 64-character hex hash.
 * @returns e.g. `"A1B2C3D4…9F0E"`.
 */
export function formatTxHash(txHash: string): string {
  return truncateAddress(txHash, 8, 6)
}
