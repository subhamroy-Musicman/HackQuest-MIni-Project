'use client'

/**
 * =============================================================================
 * FILE: components/layout/Header.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The sticky top bar: project name, the network the app is pointed at, and the
 * connect/disconnect control.
 *
 * WHY IT EXISTS
 * -------------
 * Beyond navigation, the header carries one genuinely important piece of
 * information: **which network are we on?**
 *
 * Testnet and mainnet are visually identical in every other respect — same
 * address format, same interface, same flow. The only difference is that one
 * uses free tokens and the other uses money. Making the network permanently
 * visible, in a fixed position, on every screen, is a deliberate safety
 * decision rather than a design flourish.
 *
 * Note that mainnet is styled as a WARNING, not a success. Green suggests
 * "everything is fine, proceed"; amber suggests "pay attention". For an
 * irreversible environment, amber is the honest colour.
 *
 * WHEN TO USE
 * -----------
 * Once, in `app/layout.tsx`.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `components/wallet/ConnectWalletButton.tsx`,
 *              `components/ui/Badge.tsx`, `lib/constants.ts`
 * Depended on by: `app/layout.tsx`
 * =============================================================================
 */

import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton'
import { Badge } from '@/components/ui/Badge'
import { CHAIN_ID, IS_MAINNET } from '@/lib/constants'

/**
 * Renders the application header.
 *
 * @returns A sticky `<header>`.
 *
 * @example
 * ```tsx
 * <Header />
 * ```
 *
 * WHY STICKY
 * The network badge and the connect button are relevant at every scroll
 * position. `sticky top-0` keeps them reachable without the layout jumps that
 * `position: fixed` introduces, and `backdrop-blur` keeps content readable as
 * it scrolls underneath.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line-subtle)] bg-[var(--color-surface-base)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* A simple mark, drawn in CSS. Keeps the repo free of binary assets
              while still giving the header a visual anchor. */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-[#04141a]"
            aria-hidden="true"
          >
            ⬡
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-content-primary)]">
              Injective dApp Starter
            </p>
            {/* Hidden on the smallest screens, where the connect button is the
                priority. The badge below still communicates the network. */}
            <p className="hidden truncate text-[11px] text-[var(--color-content-muted)] sm:block">
              A workshop-ready tour of the Injective TypeScript SDK
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant={IS_MAINNET ? 'warning' : 'brand'}
            className="hidden md:inline-flex"
          >
            {CHAIN_ID}
          </Badge>

          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}
