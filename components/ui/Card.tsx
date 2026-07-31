/**
 * =============================================================================
 * FILE: components/ui/Card.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The container every panel in the app sits inside: a bordered surface with an
 * optional title, description and header action.
 *
 * WHY IT EXISTS
 * -------------
 * The page is a set of independent panels — chain status, account, balances,
 * send. Each needs the same frame. Defining that frame once means adding a new
 * panel is a matter of writing its contents, and it guarantees every panel
 * aligns with the others.
 *
 * There is a small architectural point here too. This component takes
 * `children` and renders them, and knows nothing about blockchains. That is
 * what makes it reusable: a component that is agnostic about its contents can
 * be used everywhere, while one that reaches into wallet state can only be used
 * where that state exists.
 *
 * WHEN TO USE
 * -----------
 * Any self-contained section of the page.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `utils/cn.ts`
 * Depended on by: every panel component.
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps {
  /** Heading shown at the top left. */
  title?: string
  /** Supporting sentence under the title. */
  description?: string
  /** Rendered at the top right — typically a refresh button or a badge. */
  headerAction?: ReactNode
  /** The card's contents. */
  children: ReactNode
  className?: string
  /** Set false for a card whose contents manage their own padding. */
  padded?: boolean
}

/**
 * Renders a bordered content panel.
 *
 * @param props.title        Optional heading.
 * @param props.description  Optional supporting text.
 * @param props.headerAction Optional element rendered at the top right.
 * @param props.children     The panel contents.
 * @param props.padded       Apply default padding. Default `true`.
 * @param props.className    Extra classes for the outer element.
 * @returns A `<section>` element.
 *
 * @example
 * ```tsx
 * <Card
 *   title="Your balances"
 *   description="Read directly from the bank module."
 *   headerAction={<Button size="sm" variant="ghost" onClick={refetch}>Refresh</Button>}
 * >
 *   <BalanceList balances={balances} />
 * </Card>
 * ```
 *
 * WHY `<section>` RATHER THAN `<div>`
 * A section with a heading is a landmark. Screen reader users can jump between
 * landmarks to navigate a page, which turns a wall of `<div>`s into something
 * navigable. Choosing the right element costs nothing and is the cheapest
 * accessibility improvement available.
 */
export function Card({
  title,
  description,
  headerAction,
  children,
  className,
  padded = true,
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)]',
        // A soft shadow lifts the card off the near-black background just
        // enough to read as a distinct surface.
        'shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      {(title || headerAction) && (
        <header
          className={cn(
            'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line-subtle)]',
            padded ? 'px-5 py-4' : 'px-5 py-4',
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-content-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-content-secondary)]">
                {description}
              </p>
            )}
          </div>
          {/* `shrink-0` keeps the action button from being squeezed when the
              title is long. Without it, on a narrow screen, the button
              collapses to a sliver. */}
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </header>
      )}

      <div className={cn(padded && 'p-5')}>{children}</div>
    </section>
  )
}
