'use client'

/**
 * =============================================================================
 * FILE: components/ui/CopyButton.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Copies a value to the clipboard and confirms it visually.
 *
 * WHY IT EXISTS
 * -------------
 * Every long value in a dApp is displayed truncated, because a 42-character
 * address and a 64-character hash destroy any layout they are placed in. But
 * the user frequently needs the *whole* value — to paste into an explorer, to
 * send to a friend, to check against a hardware wallet screen.
 *
 * So there is a rule this component enforces: **display truncated, copy in
 * full**. The `value` prop is always the complete string; what the user sees is
 * up to the surrounding markup.
 *
 * There is a security dimension too. Address-poisoning attacks work by
 * generating a lookalike address whose first and last characters match one you
 * have used, betting that you will only compare the truncated form. A reliable
 * copy button removes the temptation to retype from a truncated display.
 *
 * WHY `'use client'`
 * ------------------
 * It has an `onClick` handler and uses a hook. Server Components cannot do
 * either — they render once, on the server, and ship no JavaScript. Any
 * component that responds to user input has to opt into being a Client
 * Component with this directive.
 *
 * WHEN TO USE
 * -----------
 * Beside any address, transaction hash or long identifier.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useCopyToClipboard.ts`, `utils/cn.ts`
 * Depended on by: `components/wallet/AccountPanel.tsx`,
 *                 `components/transfer/TransactionReceipt.tsx`
 * =============================================================================
 */

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/utils/cn'

export interface CopyButtonProps {
  /** The COMPLETE value to copy — never the truncated display version. */
  value: string
  /** Accessible label, e.g. `"Copy your Injective address"`. */
  label?: string
  className?: string
}

/**
 * Renders a small copy-to-clipboard button.
 *
 * @param props.value The full value to place on the clipboard.
 * @param props.label Accessible label describing what is being copied.
 * @returns A `<button>` that shows a tick for two seconds after a copy.
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <code>{truncateAddress(address)}</code>
 *   <CopyButton value={address} label="Copy your Injective address" />
 * </div>
 * ```
 *
 * WORKFLOW
 *   click
 *        |
 *        v
 *   useCopyToClipboard().copy(value)
 *        |
 *        v
 *   icon swaps to a tick for 2s, then reverts
 *
 * ACCESSIBILITY
 * The icon is `aria-hidden`, so the button's accessible name comes entirely from
 * `aria-label`. `title` provides the same text as a mouse tooltip. Without
 * these, a screen reader would announce "button" with no indication of what it
 * copies — and there are usually several on the page.
 */
export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const { hasCopied, copy } = useCopyToClipboard()

  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      aria-label={hasCopied ? 'Copied to clipboard' : label}
      title={label}
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
        'text-[var(--color-content-muted)] transition-colors',
        'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-content-primary)]',
        hasCopied && 'text-[var(--color-success)]',
        className,
      )}
    >
      <span aria-hidden="true" className="text-xs leading-none">
        {hasCopied ? '✓' : '⧉'}
      </span>
    </button>
  )
}
