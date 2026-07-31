/**
 * =============================================================================
 * FILE: components/balances/BalanceRow.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Renders one token balance: symbol, name, amount, and — importantly — the raw
 * on-chain value behind it.
 *
 * WHY IT EXISTS
 * -------------
 * This row is where the "human units versus base units" idea stops being
 * abstract. It shows both:
 *
 *   1.5 INJ                        <- what a person understands
 *   1500000000000000000 inj        <- what the blockchain actually stores
 *
 * Most wallets hide the second number. This one shows it deliberately, because
 * a developer who has seen the two side by side is far less likely to build a
 * transaction that moves a quintillionth of what they intended.
 *
 * It also handles the *unknown token* case honestly. The chain reports a denom
 * and an integer, and nothing else. Whether that denom is "USDT with 6
 * decimals" is off-chain knowledge from a registry. When we do not have it, the
 * row says so rather than guessing confidently and displaying a wrong number.
 *
 * WHEN TO USE
 * -----------
 * Inside `BalancesPanel`, one per balance.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/format.ts`, `components/ui/Badge.tsx`, `utils/cn.ts`
 * Depended on by: `components/balances/BalancesPanel.tsx`
 * =============================================================================
 */

import { Badge } from '@/components/ui/Badge'
import { formatAmount, formatDenom } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Balance } from '@/types'

export interface BalanceRowProps {
  balance: Balance
  /** Renders the row with the accent colour. Used for the gas token. */
  highlight?: boolean
}

/**
 * Renders one balance.
 *
 * @param props.balance   The balance to display.
 * @param props.highlight Emphasise this row. Used for INJ.
 * @returns A row.
 *
 * @example
 * ```tsx
 * <BalanceRow balance={injBalance} highlight />
 * ```
 *
 * WHY THE RAW AMOUNT IS SHOWN IN A `<details>`
 * --------------------------------------------
 * It is genuinely useful but genuinely noisy. A collapsed disclosure keeps the
 * default view clean while making the underlying value one click away — which
 * is exactly the right trade-off for a teaching interface. Beginners open it
 * and learn something; everyone else ignores it.
 */
export function BalanceRow({ balance, highlight = false }: BalanceRowProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 transition-colors',
        highlight
          ? 'border-[var(--color-brand)]/25 bg-[var(--color-brand-dim)]/40'
          : 'border-[var(--color-line-subtle)] bg-[var(--color-surface-base)]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* A simple monogram avatar. Real apps fetch token logos from a
              registry; a letter keeps this file free of an image pipeline
              without losing the visual anchor a list needs. */}
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              highlight
                ? 'bg-[var(--color-brand)] text-[#04141a]'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-content-secondary)]',
            )}
            aria-hidden="true"
          >
            {balance.symbol.slice(0, 2)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-content-primary)]">
                {balance.symbol}
              </span>

              {/* Honesty over confidence. An unrecognised denom gets a visible
                  caveat instead of a plausible-looking wrong number. */}
              {!balance.isKnownToken && (
                <Badge variant="warning">decimals unverified</Badge>
              )}
            </div>

            <p className="mt-0.5 truncate text-xs text-[var(--color-content-muted)]">
              {balance.name}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-[var(--color-content-primary)]">
            {formatAmount(balance.formattedAmount)}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--color-content-muted)]">
            {formatDenom(balance.denom)}
          </p>
        </div>
      </div>

      <details className="group mt-2.5">
        <summary className="cursor-pointer list-none text-[11px] text-[var(--color-content-muted)] hover:text-[var(--color-content-secondary)]">
          <span className="group-open:hidden">▸ Show the raw on-chain value</span>
          <span className="hidden group-open:inline">▾ Raw on-chain value</span>
        </summary>

        <div className="mt-2 space-y-1.5 rounded-md border border-[var(--color-line-subtle)] bg-[var(--color-surface-overlay)] p-2.5">
          <p className="font-mono text-[11px] break-all text-[var(--color-content-secondary)]">
            <span className="text-[var(--color-content-muted)]">amount </span>
            {balance.amount}
          </p>
          <p className="font-mono text-[11px] break-all text-[var(--color-content-secondary)]">
            <span className="text-[var(--color-content-muted)]">denom </span>
            {balance.denom}
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--color-content-muted)]">
            The chain stores only that integer. Dividing by 10
            <sup>{balance.decimals}</sup> gives the {balance.decimals}-decimal
            value shown above. The blockchain has no concept of a decimal point.
          </p>
        </div>
      </details>
    </div>
  )
}
