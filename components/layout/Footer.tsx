/**
 * =============================================================================
 * FILE: components/layout/Footer.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Links to the resources a learner needs next: the SDK documentation, the
 * faucet, the explorer and the Injective developer portal.
 *
 * WHY IT EXISTS
 * -------------
 * A workshop ends. The footer is what a learner still has an hour later when
 * they are stuck on their own machine.
 *
 * It is placed in the app rather than only in the README on purpose — the app
 * is what stays open in a tab. Putting the faucet one click away from every
 * screen removes the single most common blocker in an Injective workshop:
 * "I have no testnet INJ and I cannot remember where to get it."
 *
 * WHEN TO USE
 * -----------
 * Once, in `app/layout.tsx`.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/constants.ts`
 * Depended on by: `app/layout.tsx`
 * =============================================================================
 */

import { EXPLORER_BASE_URL, FAUCET_URL, IS_MAINNET, NETWORK_NAME } from '@/lib/constants'

/** Links shown in the footer. Data rather than markup, so the list is trivial to extend. */
const RESOURCE_LINKS: Array<{ label: string; href: string; description: string }> = [
  {
    label: 'Injective docs',
    href: 'https://docs.injective.network',
    description: 'Chain concepts, modules and guides',
  },
  {
    label: 'TypeScript SDK',
    href: 'https://github.com/InjectiveLabs/injective-ts',
    description: 'Source, examples and release notes',
  },
  {
    label: 'Block explorer',
    href: EXPLORER_BASE_URL,
    description: 'Every transaction, publicly',
  },
  {
    label: 'Testnet faucet',
    href: FAUCET_URL,
    description: 'Free INJ for building',
  },
]

/**
 * Renders the application footer.
 *
 * @returns A `<footer>` with resource links and a network reminder.
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-line-subtle)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RESOURCE_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-[var(--color-line-subtle)] p-3 transition-colors hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-raised)]"
            >
              <p className="text-xs font-medium text-[var(--color-content-primary)]">
                {link.label}{' '}
                <span
                  className="text-[var(--color-content-muted)] transition-colors group-hover:text-[var(--color-brand)]"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
                {link.description}
              </p>
            </a>
          ))}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
          Built for teaching. Currently pointed at{' '}
          <span className="text-[var(--color-content-secondary)]">
            {NETWORK_NAME}
          </span>
          .{' '}
          {IS_MAINNET
            ? 'Transactions here move real funds and cannot be reversed.'
            : 'Testnet tokens have no value — experiment freely.'}
        </p>
      </div>
    </footer>
  )
}
