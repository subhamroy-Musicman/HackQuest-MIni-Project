/**
 * =============================================================================
 * FILE: components/ui/Alert.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Displays an error, warning, success or informational message, with an
 * optional "how to fix it" hint and a retry action.
 *
 * WHY IT EXISTS
 * -------------
 * This component is where this project's approach to errors becomes visible.
 *
 * Most apps render an error as one line of red text. That tells a user
 * something failed and nothing else. Here, every error carries two parts:
 *
 *   message — what happened, in plain language.
 *   hint    — what to do about it.
 *
 * The `hint` is the whole point. "Insufficient funds" is a statement.
 * "Insufficient funds — the fee comes out of the same balance, so you cannot
 * send everything; get free testnet INJ at <faucet>" is a lesson. In a
 * workshop, the errors are where most of the learning happens, so they deserve
 * more design attention than the happy path.
 *
 * See `lib/errors.ts` for where the messages and hints are written.
 *
 * WHEN TO USE
 * -----------
 * Whenever an `AppError` reaches a component, and for warnings such as "you are
 * on mainnet".
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `components/ui/Button.tsx`, `utils/cn.ts`
 * Depended on by: every panel that can fail.
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

export type AlertVariant = 'error' | 'warning' | 'success' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  /** Short headline. Optional — a bare message reads fine for simple cases. */
  title?: string
  /** What happened. Required. */
  message: string
  /** What the user can do about it. This is the valuable half. */
  hint?: string
  /** Renders a "Try again" button when provided. */
  onRetry?: () => void
  /** Extra content, e.g. an explorer link. */
  children?: ReactNode
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; symbol: string }
> = {
  error: {
    container: 'border-[var(--color-danger)]/30 bg-[var(--color-danger-dim)]',
    icon: 'text-[var(--color-danger)]',
    symbol: '!',
  },
  warning: {
    container: 'border-[var(--color-warning)]/30 bg-[var(--color-warning-dim)]',
    icon: 'text-[var(--color-warning)]',
    symbol: '!',
  },
  success: {
    container: 'border-[var(--color-success)]/30 bg-[var(--color-success-dim)]',
    icon: 'text-[var(--color-success)]',
    symbol: '✓',
  },
  info: {
    container: 'border-[var(--color-line-strong)] bg-[var(--color-surface-overlay)]',
    icon: 'text-[var(--color-brand)]',
    symbol: 'i',
  },
}

/**
 * Renders a message block.
 *
 * @param props.variant  Tone. Default `'info'`.
 * @param props.title    Optional headline.
 * @param props.message  What happened.
 * @param props.hint     What to do next.
 * @param props.onRetry  Shows a "Try again" button when provided.
 * @param props.children Extra content rendered under the hint.
 * @returns A `<div>` with the appropriate ARIA role.
 *
 * @example
 * ```tsx
 * <Alert
 *   variant="error"
 *   title="Could not load balances"
 *   message={error.message}
 *   hint={error.hint}
 *   onRetry={refetch}
 * />
 * ```
 *
 * ACCESSIBILITY
 * `role="alert"` makes a screen reader announce the content the moment it
 * appears, interrupting whatever it was reading. That is correct for errors —
 * the user needs to know now. For success and info, `role="status"` announces
 * politely, at the next natural pause, which avoids talking over the user.
 * Using the wrong one is a small mistake that makes an app noticeably ruder.
 */
export function Alert({
  variant = 'info',
  title,
  message,
  hint,
  onRetry,
  children,
  className,
}: AlertProps) {
  const styles = variantStyles[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border p-4', styles.container, className)}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold',
            styles.icon,
          )}
          aria-hidden="true"
        >
          {styles.symbol}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          {title && (
            <p className="text-sm font-semibold text-[var(--color-content-primary)]">
              {title}
            </p>
          )}

          {/* `break-words` matters here. Chain errors routinely contain a
              70-character address or hash with no spaces, which would otherwise
              push the layout sideways. */}
          <p className="text-sm leading-relaxed break-words text-[var(--color-content-primary)]">
            {message}
          </p>

          {hint && (
            <p className="text-xs leading-relaxed text-[var(--color-content-secondary)]">
              {hint}
            </p>
          )}

          {children}

          {onRetry && (
            <div className="pt-1">
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
