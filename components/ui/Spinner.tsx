/**
 * =============================================================================
 * FILE: components/ui/Spinner.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * An accessible loading indicator.
 *
 * WHY IT EXISTS
 * -------------
 * Blockchain operations are slow by web standards. Reading a balance takes a
 * few hundred milliseconds; a transaction takes seconds, and one of those
 * seconds is spent waiting for a human to click "Approve" in a popup.
 *
 * A spinner is therefore not decoration in a dApp — it is the difference
 * between "this is working" and "this is broken". Users who see no feedback
 * click again, and in this domain clicking again means signing again.
 *
 * ACCESSIBILITY
 * -------------
 * The spinner is a pure CSS animation with `aria-hidden`, paired with visually
 * hidden text that screen readers announce. A screen reader user gets "Loading"
 * rather than silence, and never hears a description of a rotating border.
 *
 * WHEN TO USE
 * -----------
 * Inside buttons during an action, and beside inline "refreshing" indicators.
 * For content that is loading for the first time, prefer `Skeleton` — it
 * communicates the *shape* of what is coming, which feels faster.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/cn.ts`
 * Depended on by: `components/ui/Button.tsx`, various panels.
 * =============================================================================
 */

import { cn } from '@/utils/cn'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Announced by screen readers. Default `"Loading"`. */
  label?: string
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5 border-[1.5px]',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-2',
}

/**
 * Renders a spinning ring.
 *
 * @param props.size      Default `'md'`.
 * @param props.className Extra classes, e.g. to change the colour.
 * @param props.label     Screen-reader text. Default `'Loading'`.
 * @returns A `<span>` containing the animated ring and hidden label.
 *
 * @example
 * ```tsx
 * <Spinner size="lg" label="Broadcasting transaction" />
 * ```
 *
 * HOW THE ANIMATION WORKS
 * A circle with a fully transparent top border. As it rotates, the gap travels
 * around the ring and reads as motion. Two Tailwind utilities, no SVG, no
 * JavaScript.
 */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span className="inline-flex items-center" role="status">
      <span
        className={cn(
          'animate-spin rounded-full border-current border-t-transparent',
          sizeClasses[size],
          className,
        )}
        // The visual element carries no information a screen reader can use;
        // the text below does.
        aria-hidden="true"
      />
      {/* `sr-only` positions the text off-screen without hiding it from
          assistive technology. `display: none` would hide it from both. */}
      <span className="sr-only">{label}</span>
    </span>
  )
}
