/**
 * =============================================================================
 * FILE: components/ui/EmptyState.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Renders the "there is nothing here" state of a panel, with an explanation and
 * a suggested next step.
 *
 * WHY IT EXISTS
 * -------------
 * There are four states any piece of remote data can be in, and a beginner
 * usually builds two of them:
 *
 *   1. loading   — usually built
 *   2. error     — usually built
 *   3. success with data     — always built
 *   4. success with NO data  — almost always forgotten
 *
 * State 4 is not an error. A brand-new wallet legitimately holds nothing. A
 * fresh address legitimately has no transactions. Rendering a blank area for
 * these makes a working app look broken, and rendering an error message for
 * them is actively wrong.
 *
 * The habit worth forming: whenever you write `data.map(...)`, ask what
 * `data.length === 0` looks like, and design it deliberately.
 *
 * WHEN TO USE
 * -----------
 * Any list or panel that can legitimately have nothing to show.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/cn.ts`
 * Depended on by: `components/balances/BalancesPanel.tsx`,
 *                 `components/transfer/*`
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  /** Optional glyph or icon above the title. */
  icon?: ReactNode
  /** What is empty, stated plainly. */
  title: string
  /** WHY it is empty and what would change that. This is the useful part. */
  description?: string
  /** A call to action, e.g. a faucet link or a connect button. */
  action?: ReactNode
  className?: string
}

/**
 * Renders an empty state.
 *
 * @param props.icon        Optional glyph.
 * @param props.title       Short statement of what is missing.
 * @param props.description Why, and what would change it.
 * @param props.action      Optional call to action.
 * @returns A centred block.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon="◇"
 *   title="No tokens yet"
 *   description="This address holds no tokens. On a testnet you can fund it from the faucet in seconds."
 *   action={<a href={FAUCET_URL}>Open the faucet</a>}
 * />
 * ```
 *
 * WRITING A GOOD EMPTY STATE
 * --------------------------
 *   Bad:    "No data"
 *   Better: "No tokens yet"
 *   Best:   "No tokens yet — this address has never received anything.
 *            Fund it from the faucet to see balances appear."
 *
 * The difference is that the last version tells the user what to do. An empty
 * state is a signpost, not a status report.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed',
        'border-[var(--color-line-strong)] px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <div className="text-2xl text-[var(--color-content-muted)]" aria-hidden="true">
          {icon}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[var(--color-content-primary)]">
          {title}
        </p>
        {description && (
          // `max-w-sm` keeps the line length readable. Text that stretches the
          // full width of a wide screen is measurably harder to read.
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-[var(--color-content-secondary)]">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
