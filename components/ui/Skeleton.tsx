/**
 * =============================================================================
 * FILE: components/ui/Skeleton.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A shimmering placeholder shaped like the content that is loading.
 *
 * WHY IT EXISTS
 * -------------
 * A skeleton and a spinner solve different problems.
 *
 * A spinner says "something is happening". A skeleton says "a list of three
 * balances is arriving, and it will occupy exactly this space". The second is
 * better for initial page loads for two reasons:
 *
 *   1. It prevents layout shift. The page does not jump when data lands,
 *      because the space was already reserved.
 *   2. It feels faster. Users consistently rate skeleton loading as quicker
 *      than a spinner even when the elapsed time is identical, because there is
 *      something structured to look at.
 *
 * The rule of thumb: skeleton for the first load of a region, spinner for an
 * action the user just triggered.
 *
 * WHEN TO USE
 * -----------
 * First load of balances and chain status. Not for refreshes — replacing
 * existing data with a skeleton every fifteen seconds looks broken.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/cn.ts`
 * Depended on by: `components/balances/BalancesPanel.tsx`,
 *                 `components/chain/ChainStatusPanel.tsx`
 * =============================================================================
 */

import { cn } from '@/utils/cn'

export interface SkeletonProps {
  /** Tailwind sizing classes, e.g. `"h-4 w-32"`. */
  className?: string
}

/**
 * Renders a single placeholder block.
 *
 * @param props.className Sizing and shape classes.
 * @returns A pulsing `<div>`.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32" />
 * ```
 *
 * NOTE ON `aria-hidden`
 * A skeleton is meaningless to a screen reader — it would announce empty boxes.
 * Hiding it and letting the surrounding region carry `aria-busy` is the correct
 * pairing.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-surface-hover)]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

/**
 * A ready-made skeleton shaped like one row of the balances list.
 *
 * @param props.rows How many rows to render. Default 3.
 * @returns A vertical stack of row placeholders.
 *
 * @example
 * ```tsx
 * {isLoading ? <BalanceRowSkeleton rows={3} /> : balances.map(…)}
 * ```
 *
 * WHY SHIP A PRE-SHAPED SKELETON RATHER THAN COMPOSE IT AT EACH CALL SITE
 * -----------------------------------------------------------------------
 * The value of a skeleton comes from matching the real content's dimensions. If
 * the shape lives next to the component that renders the real rows, the two
 * stay in sync. Hand-composed skeletons drift the moment someone adjusts a
 * padding value, and a mismatched skeleton reintroduces the layout shift it was
 * meant to prevent.
 */
export function BalanceRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          // A static list that never reorders is the one case where an index
          // key is genuinely correct.
          key={index}
          className="glass-panel flex items-center justify-between rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
