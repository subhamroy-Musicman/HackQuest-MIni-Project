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
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid gap-6 sm:grid-cols-2">
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

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--color-line-subtle)] pt-6">
          <p className="text-[11px] leading-relaxed text-[var(--color-content-muted)] text-center sm:text-left">
            NovaTip is currently pointed at{' '}
            <span className="text-[var(--color-content-secondary)]">
              {NETWORK_NAME}
            </span>
            .{' '}
            {IS_MAINNET
              ? 'Transactions here move real funds and cannot be reversed.'
              : 'Testnet tokens have no value — experiment freely.'}
          </p>
          
          <a
            href="https://github.com/subhamroy-Musicman"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-content-muted)] hover:text-white transition-colors group"
          >
            <span>Built by Subham Roy</span>
            <svg
              className="h-5 w-5 fill-current opacity-70 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
