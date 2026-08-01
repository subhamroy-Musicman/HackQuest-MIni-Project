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
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSearch = searchParams?.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  // Sync search state if URL changes externally
  useEffect(() => {
    const currentQ = searchParams?.get('q') || ''
    setSearchTerm(currentQ)
  }, [searchParams])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    
    // We use router.replace to avoid flooding browser history on every keystroke
    // If not on the homepage, pushing to homepage with the query
    if (window.location.pathname !== '/') {
      router.push(`/?${params.toString()}`)
    } else {
      router.replace(`/?${params.toString()}`, { scroll: false })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="sticky top-6 z-50 flex justify-center px-4 sm:px-6 lg:px-8 pointer-events-none">
      <header className="pointer-events-auto w-full max-w-[1400px] rounded-2xl border border-[#00E5FF]/20 bg-[#030A0E]/80 shadow-[0_4px_30px_rgba(0,229,255,0.06)] backdrop-blur-xl transition-all duration-300">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          {/* LEFT: Logo & Name */}
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/img/logo.jpg"
              alt="NovaTip Logo"
              width={32}
              height={32}
              className="shrink-0 rounded-[8px] border border-[#00E5FF]/20 shadow-sm"
            />
            <p className="truncate text-lg font-black tracking-tight bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] bg-clip-text text-transparent">
              NovaTip
            </p>
          </div>

          {/* CENTER: Search Bar (Hidden on small screens) */}
          <div className="hidden md:flex flex-1 max-w-[480px] mx-4 items-center rounded-full bg-[#10192A]/50 px-4 py-2 border border-[#ffffff10] text-[13px] text-[var(--color-content-secondary)] hover:border-[#00E5FF]/30 transition-colors">
            <svg className="h-4 w-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search creators, campaigns, or addresses..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-transparent border-none outline-none w-full text-white placeholder-[var(--color-content-muted)]"
            />
          </div>

          {/* RIGHT: Actions */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full bg-[var(--color-surface-raised)] p-2 text-[var(--color-content-muted)] hover:text-[#00E5FF] transition-colors hover:bg-[var(--color-surface-hover)]"
                aria-label="View notifications"
              >
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[#6D5DF6]"></span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 origin-top-right rounded-xl border border-[#00E5FF]/20 bg-[#030A0E]/95 shadow-lg backdrop-blur-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="p-4 border-b border-[#00E5FF]/10">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    <div className="rounded-lg p-3 hover:bg-[#10192A] transition-colors cursor-pointer">
                      <p className="text-[13px] font-medium text-white">Welcome to NovaTip! 🎉</p>
                      <p className="mt-1 text-[11px] text-[var(--color-content-secondary)]">Set up your creator profile to start receiving INJ tips directly on-chain.</p>
                      <p className="mt-2 text-[10px] text-[#6D5DF6]">Just now</p>
                    </div>
                    <div className="mt-1 rounded-lg p-3 hover:bg-[#10192A] transition-colors cursor-pointer">
                      <p className="text-[13px] font-medium text-white">You received 0.5 INJ 🚀</p>
                      <p className="mt-1 text-[11px] text-[var(--color-content-secondary)]">An anonymous supporter just tipped you! View transaction on the explorer.</p>
                      <p className="mt-2 text-[10px] text-[#00E5FF]">2 hours ago</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Badge
              variant="default"
              className="hidden lg:inline-flex items-center gap-2 border-[#ffffff15] bg-[#10192A] text-[var(--color-content-secondary)] px-3 py-1"
            >
              <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
              {CHAIN_ID}
            </Badge>

            <ConnectWalletButton />
          </div>
        </div>
      </header>
    </div>
  )
}
