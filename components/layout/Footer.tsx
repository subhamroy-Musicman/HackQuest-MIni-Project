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

import Link from 'next/link'
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

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Creators', href: '/#creators' },
  { name: 'Dashboard', href: '/' },
  { name: 'Analytics', href: '/#analytics' },
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

        <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-content-secondary)] hover:text-[#00E5FF] transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--color-line-subtle)] pt-6">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p className="text-[11px] leading-relaxed text-[var(--color-content-muted)]">
              NovaTip is currently pointed at{' '}
              <span className="text-[var(--color-content-secondary)]">
                {NETWORK_NAME}
              </span>
              .{' '}
              {IS_MAINNET
                ? 'Transactions here move real funds and cannot be reversed.'
                : 'Testnet tokens have no value — experiment freely.'}
            </p>
            <p className="text-[11px] text-[var(--color-content-muted)]">
              &copy; 2026 NovaTip. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-[12px] font-medium text-[var(--color-content-muted)]">
            <span>Built by Subham Roy</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/subhamroy-Musicman"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-content-muted)] hover:text-white transition-colors group"
                aria-label="GitHub Profile"
              >
                <svg className="h-5 w-5 fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://x.com/SubhamRoy165760"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-content-muted)] hover:text-white transition-colors group"
                aria-label="X Profile"
              >
                <svg className="h-[18px] w-[18px] fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/subhamroyofficial_/?__pwa=1#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-content-muted)] hover:text-white transition-colors group"
                aria-label="Instagram Profile"
              >
                <svg className="h-[18px] w-[18px] fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
                </svg>
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=subhamroy5709@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-content-muted)] hover:text-white transition-colors group"
                aria-label="Email Me"
              >
                <svg className="h-[20px] w-[20px] fill-current opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
