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
import Image from 'next/image'

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
    <header className="sticky top-0 z-40 border-b border-[#00E5FF]/20 bg-[#030A0E]/60 shadow-[0_4px_30px_rgba(0,229,255,0.06)] backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/img/logo.jpg"
            alt="NovaTip Logo"
            width={36}
            height={36}
            className="shrink-0 rounded-[8px] border border-[#00E5FF]/20 shadow-sm"
          />

          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] bg-clip-text text-transparent">
              NovaTip
            </p>
            {/* Hidden on the smallest screens, where the connect button is the
                priority. The badge below still communicates the network. */}
            <p className="hidden truncate text-[11px] font-semibold uppercase tracking-wider text-[#00E5FF]/70 sm:block">
              Support Creators Instantly on Injective
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

          <button
            type="button"
            className="relative rounded-full bg-[var(--color-surface-raised)] p-2 text-[var(--color-content-muted)] hover:text-[#00E5FF] transition-colors border border-[var(--color-line-subtle)] hover:border-[#00E5FF]/50"
            aria-label="View notifications"
          >
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#6D5DF6] ring-2 ring-[#030A0E]"></span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>

          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}
