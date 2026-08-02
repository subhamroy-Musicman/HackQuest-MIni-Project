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
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { CHAIN_ID } from '@/lib/constants'
import { AppNotification, getNotifications, subscribeToNotifications, markAllAsRead, formatTimeAgo } from '@/lib/notifications'
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
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Load and subscribe to notifications
  useEffect(() => {
    setNotifications(getNotifications())
    const unsubscribe = subscribeToNotifications(() => {
      setNotifications(getNotifications())
    })
    
    const interval = setInterval(() => {
      setNotifications([...getNotifications()]) // Trigger re-render for time ago
    }, 60000)
    
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])
  
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
    <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto" suppressHydrationWarning>
      <header className="flex h-16 w-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 rounded-full border border-[var(--color-line-subtle)] bg-gray-200/80 dark:bg-transparent backdrop-blur-2xl transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          {/* LEFT: Logo & Name */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 bg-[#fbbf24] blur-md opacity-60 rounded-[8px]" aria-hidden="true" />
              <Logo className="relative z-10 w-full h-full rounded-[8px] object-cover border border-[#fbbf24]/30" />
            </div>
            <p className="hidden sm:block truncate text-lg font-black tracking-tight text-[var(--content-primary)]">
              NovaTip
            </p>
          </div>

          {/* CENTER: Search Bar (Hidden on small screens) */}
          <div className="hidden md:flex flex-1 max-w-[480px] mx-4 items-center rounded-full bg-[var(--color-surface-raised)]/50 px-4 py-2 border border-[var(--color-line-subtle)] text-[13px] text-[var(--color-content-secondary)] hover:border-[#00E5FF]/30 transition-colors">
            <svg className="h-4 w-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search creators, campaigns, or addresses..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-transparent border-none outline-none w-full text-[var(--color-content-primary)] placeholder-[var(--color-content-muted)]"
            />
          </div>

          {/* RIGHT: Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            <div ref={dropdownRef}>
              {/* Notifications */}
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  if (!showNotifications && unreadCount > 0) markAllAsRead()
                }}
                className="relative p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)]"
                aria-label="View notifications"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--surface-base)]"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-[72px] right-0 sm:right-6 w-[calc(100vw-32px)] sm:w-80 max-w-[320px] origin-top-right rounded-xl border border-[var(--color-line-subtle)] bg-[var(--surface-base)] shadow-2xl ring-1 ring-black/5 focus:outline-none z-[100]">
                  <div className="p-4 border-b border-[var(--color-line-subtle)] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--color-content-primary)]">Notifications</h3>
                    {unreadCount > 0 && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--color-content-muted)]">No notifications yet</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-3 rounded-lg transition-colors cursor-pointer mb-1 ${notif.read ? 'hover:bg-[var(--color-surface-hover)]' : 'bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10'}`}>
                          <p className="text-[13px] font-medium text-[var(--color-content-primary)]">{notif.title}</p>
                          <p className="mt-1 text-[11px] text-[var(--color-content-secondary)]">{notif.message}</p>
                          <p className="mt-1 text-[10px] text-[var(--color-content-muted)]">{formatTimeAgo(notif.timestamp)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:flex">
              <Badge
                variant="neutral"
                className="items-center gap-2 border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-content-secondary)] px-3 py-1"
              >
                <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                {CHAIN_ID}
              </Badge>
            </div>

            <ConnectWalletButton />
          </div>
      </header>
    </div>
  )
}
