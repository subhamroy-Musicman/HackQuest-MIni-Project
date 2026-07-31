/**
 * =============================================================================
 * FILE: components/ui/Button.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The application's only button. Handles variants, sizes, a loading state and
 * full-width layout.
 *
 * WHY IT EXISTS
 * -------------
 * In a dApp, buttons trigger irreversible actions. That raises the stakes on
 * three details that are easy to get wrong when every button is styled ad hoc:
 *
 *   * DISABLED MUST REALLY BE DISABLED. A button that looks greyed out but
 *     still fires `onClick` can broadcast a transaction the user did not intend.
 *   * LOADING MUST BLOCK INPUT. Without it, a double-click produces two wallet
 *     popups and two transactions built with the same sequence number — the
 *     second is guaranteed to fail.
 *   * THE STATE MUST BE VISIBLE. "Is it working, or did my click not land?" is
 *     the question every unresponsive button provokes, and the answer is a
 *     spinner.
 *
 * Solving those once, here, is worth far more than the styling consistency.
 *
 * WHEN TO USE
 * -----------
 * Every clickable action. Use a plain `<a>` for navigation — a link that looks
 * like a button should still be a link, so it can be opened in a new tab.
 *
 * EXECUTION FLOW
 * --------------
 *   parent renders <Button isLoading={isSending}>Send</Button>
 *        |
 *        v
 *   isLoading -> disabled = true, spinner replaces the label
 *        |
 *        v
 *   clicks cannot fire while disabled
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `components/ui/Spinner.tsx`, `utils/cn.ts`
 * Depended on by: most components in the app.
 * =============================================================================
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'
import { cn } from '@/utils/cn'

/**
 * The visual weight of a button, which should map to the weight of its action.
 *
 * - `primary`   — the one action the user is expected to take on this screen.
 *                 There should be exactly one per view.
 * - `secondary` — a supporting action, e.g. "Refresh".
 * - `ghost`     — a tertiary action, e.g. "Copy".
 * - `danger`    — destructive or irreversible. Used sparingly, on purpose.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and disables the button. */
  isLoading?: boolean
  /** Replaces the label while loading, e.g. "Signing…". */
  loadingText?: string
  /** Icon rendered before the label. */
  leftIcon?: ReactNode
  fullWidth?: boolean
}

/** Shared across all variants: layout, transition, focus and disabled handling. */
const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand)] text-[#04141a] hover:bg-[var(--color-brand-strong)] hover:text-white',
  secondary:
    'bg-[var(--color-surface-overlay)] text-[var(--color-content-primary)] ' +
    'border border-[var(--color-line-strong)] hover:bg-[var(--color-surface-hover)]',
  ghost:
    'bg-transparent text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-overlay)] ' +
    'hover:text-[var(--color-content-primary)]',
  danger:
    'bg-[var(--color-danger-dim)] text-[var(--color-danger)] ' +
    'border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  // 40px tall — comfortably above the 24px minimum for pointer targets, and
  // close to the 44px mobile guideline.
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

/**
 * Renders a button.
 *
 * @param props.variant     Visual weight. Default `'primary'`.
 * @param props.size        Default `'md'`.
 * @param props.isLoading   Shows a spinner and disables the button.
 * @param props.loadingText Optional label shown while loading.
 * @param props.leftIcon    Icon before the label.
 * @param props.fullWidth   Stretch to the container width.
 * @param props.children    The label.
 * @returns A `<button>` element.
 *
 * @example
 * ```tsx
 * <Button variant="primary" isLoading={isSending} loadingText="Signing…" fullWidth>
 *   Send INJ
 * </Button>
 *
 * <Button variant="ghost" size="sm" onClick={refetch}>Refresh</Button>
 * ```
 *
 * WORKFLOW
 *   compose className from variant + size + fullWidth
 *        |
 *        v
 *   disabled = props.disabled OR isLoading
 *        |
 *        v
 *   render spinner + loadingText, or leftIcon + children
 *
 * WHY `disabled={disabled || isLoading}` AND NOT JUST `disabled`
 * --------------------------------------------------------------
 * Forcing the disabled attribute while loading means a caller cannot
 * accidentally leave a button clickable during an in-flight transaction. The
 * component enforces the safe behaviour rather than trusting every call site to
 * remember it.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // `type` defaults to "submit" inside a form, which causes surprise page
      // reloads. Defaulting to "button" and letting callers opt into "submit"
      // is the safer default. `...rest` is spread after, so an explicit
      // `type="submit"` still wins.
      type="button"
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  )
}
