/**
 * =============================================================================
 * FILE: components/ui/Badge.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A small label for status: the network name, a connection indicator, a
 * "verified token" marker.
 *
 * WHY IT EXISTS
 * -------------
 * One badge in this app carries real weight: the network indicator.
 *
 * The difference between testnet and mainnet is the difference between play
 * money and real money, and the two look identical in every other respect —
 * same addresses, same interface, same transactions. Making the current network
 * permanently visible, and colouring mainnet as a warning rather than as
 * success, is a deliberate safety decision. Nobody should ever wonder which
 * chain they are about to sign on.
 *
 * WHEN TO USE
 * -----------
 * Short status text. Not for anything interactive — a badge is not a button.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/cn.ts`
 * Depended on by: `components/layout/Header.tsx`,
 *                 `components/chain/ChainStatusPanel.tsx`,
 *                 `components/balances/BalanceRow.tsx`
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  variant?: BadgeVariant
  /** Renders a small filled circle before the label. */
  withDot?: boolean
  /** Animates the dot, for genuinely live indicators only. */
  pulse?: boolean
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'border-[var(--color-line-strong)] bg-[var(--color-surface-overlay)] text-[var(--color-content-secondary)]',
  brand:
    'border-[var(--color-brand)]/30 bg-[var(--color-brand-dim)] text-[var(--color-brand)]',
  success:
    'border-[var(--color-success)]/30 bg-[var(--color-success-dim)] text-[var(--color-success)]',
  warning:
    'border-[var(--color-warning)]/30 bg-[var(--color-warning-dim)] text-[var(--color-warning)]',
  danger:
    'border-[var(--color-danger)]/30 bg-[var(--color-danger-dim)] text-[var(--color-danger)]',
}

/**
 * Renders a status badge.
 *
 * @param props.variant  Colour. Default `'neutral'`.
 * @param props.withDot  Show a leading dot.
 * @param props.pulse    Animate the dot.
 * @param props.children Label text.
 * @returns A `<span>`.
 *
 * @example
 * ```tsx
 * <Badge variant="success" withDot pulse>Connected</Badge>
 * <Badge variant="warning">MAINNET — real funds</Badge>
 * ```
 *
 * WHEN TO USE `pulse`
 * Only when something is genuinely live and updating, such as the block height.
 * Animation draws the eye, and an animation that means nothing spends the
 * user's attention for no return. Use it once per screen, at most.
 */
export function Badge({
  variant = 'neutral',
  withDot = false,
  pulse = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-medium whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {withDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
            pulse && 'pulse-dot',
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
