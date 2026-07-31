'use client'

/**
 * =============================================================================
 * FILE: hooks/useBalances.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Loads the token balances for an address and keeps them current.
 *
 * WHY IT EXISTS
 * -------------
 * Balances are needed in several places — the balances panel renders them, and
 * the send form uses the INJ balance to validate the amount. Fetching them in
 * each component would mean duplicated requests and two sources of truth that
 * can disagree.
 *
 * Encapsulating the fetch, the loading flag, the error and the refresh in one
 * hook means a component's entire relationship with the chain is one line:
 *
 *   const { balances, isLoading, error, refetch } = useBalances(address)
 *
 * That is the point of a custom hook. Not code reuse for its own sake, but
 * hiding a whole category of asynchronous complexity behind a value.
 *
 * WHEN TO USE
 * -----------
 * Any component that displays or reasons about balances.
 *
 * EXECUTION FLOW
 * --------------
 *   address changes (connect / disconnect / account switch)
 *        |
 *        v
 *   address is null? -> clear state, do NOT fetch
 *        |
 *        v
 *   lib/api.ts getBalances() -> /api/account/:address/balances -> node
 *        |
 *        v
 *   { balances, isLoading, error, refetch, getBalanceFor }
 *        |
 *        v
 *   poll every POLL_INTERVAL_MS; clear the timer on unmount
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/api.ts`, `lib/errors.ts`, `lib/constants.ts`
 * Depended on by: `components/balances/BalancesPanel.tsx`,
 *                 `components/transfer/SendInjForm.tsx`
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getBalances } from '@/lib/api'
import { AppError, toAppError } from '@/lib/errors'
import { INJ_DENOM, POLL_INTERVAL_MS } from '@/lib/constants'
import type { Balance } from '@/types'

export interface UseBalancesResult {
  /** All balances, INJ first. Empty array means "loaded, holds nothing". */
  balances: Balance[]
  /** True only during the first load for a given address. */
  isLoading: boolean
  /** The last failure, or `null`. */
  error: AppError | null
  /** Refetches immediately. Call this after a successful transfer. */
  refetch: () => Promise<void>
  /**
   * Convenience lookup for one denomination.
   *
   * Exists because the send form needs the INJ balance specifically, and
   * `balances.find(b => b.denom === 'inj')` appearing in three components is
   * three chances to typo the denom.
   */
  getBalanceFor: (denom: string) => Balance | undefined
  /**
   * The INJ balance in human units, e.g. `"1.5"`. `"0"` when absent.
   *
   * Pre-computed because it is what the amount validator needs, and because
   * "the user has no INJ entry at all" and "the user has 0 INJ" should behave
   * identically here.
   */
  injBalance: string
}

/**
 * Loads and polls the balances for an address.
 *
 * @param address The `inj1…` address to query, or `null`/`undefined` when no
 *                wallet is connected. Passing `null` clears state and performs
 *                no request — the hook is safe to call unconditionally.
 * @param options.pollIntervalMs Refresh interval. `0` disables polling.
 * @returns See `UseBalancesResult`.
 *
 * @example
 * ```tsx
 * function BalancesPanel() {
 *   const { account } = useWallet()
 *   const { balances, isLoading, error, refetch, injBalance } =
 *     useBalances(account?.injectiveAddress)
 *
 *   if (!account) return <EmptyState title="Connect a wallet" />
 *   if (isLoading) return <Skeleton />
 *   if (error) return <Alert message={error.message} onRetry={refetch} />
 *   if (balances.length === 0) return <EmptyState title="No tokens yet" />
 *
 *   return balances.map((b) => <BalanceRow key={b.denom} balance={b} />)
 * }
 * ```
 *
 * WHY THE HOOK IS CALLED UNCONDITIONALLY WITH A POSSIBLY-NULL ADDRESS
 * -------------------------------------------------------------------
 * React's rules of hooks forbid calling a hook inside a condition — the order
 * of hook calls must be identical on every render. So instead of
 *
 *     if (account) useBalances(account.address)   // ILLEGAL
 *
 * you always call the hook and let it decide internally whether to fetch. This
 * pattern — "the hook handles the null case" — is worth learning early, because
 * it comes up constantly in wallet-aware UIs.
 */
export function useBalances(
  address: string | null | undefined,
  options: { pollIntervalMs?: number } = {},
): UseBalancesResult {
  const { pollIntervalMs = POLL_INTERVAL_MS } = options

  const [balances, setBalances] = useState<Balance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const isMountedRef = useRef(true)

  /**
   * Guards against out-of-order responses.
   *
   * Scenario: the user switches from account A to account B. Two requests are
   * now in flight. If A's response arrives *after* B's — entirely possible,
   * since HTTP gives no ordering guarantee — the UI would show A's balances
   * under B's address.
   *
   * Recording which address each response belongs to and discarding stale ones
   * fixes it. This is a real bug that ships in a lot of dApps, and it is
   * exactly the kind of thing a library like TanStack Query handles for you.
   */
  const activeAddressRef = useRef<string | null | undefined>(address)

  const load = useCallback(
    async (targetAddress: string) => {
      try {
        const nextBalances = await getBalances(targetAddress)

        // Discard if we unmounted, or if the user has since switched accounts.
        if (!isMountedRef.current) return
        if (activeAddressRef.current !== targetAddress) return

        setBalances(nextBalances)
        setError(null)
      } catch (thrown) {
        if (!isMountedRef.current) return
        if (activeAddressRef.current !== targetAddress) return

        setError(toAppError(thrown, 'loading your balances'))
      } finally {
        if (isMountedRef.current && activeAddressRef.current === targetAddress) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    isMountedRef.current = true
    activeAddressRef.current = address

    // No wallet connected. Clear everything and make no request — there is
    // nothing to ask about, and an error state here would be misleading.
    if (!address) {
      setBalances([])
      setError(null)
      setIsLoading(false)
      return () => {
        isMountedRef.current = false
      }
    }

    // A new address means the previous balances are meaningless. Showing them
    // while the new ones load would briefly attribute one user's funds to
    // another — the kind of glitch that destroys trust instantly.
    setBalances([])
    setIsLoading(true)

    void load(address)

    if (pollIntervalMs <= 0) {
      return () => {
        isMountedRef.current = false
      }
    }

    const intervalId = setInterval(() => void load(address), pollIntervalMs)

    return () => {
      isMountedRef.current = false
      clearInterval(intervalId)
    }
  }, [address, load, pollIntervalMs])

  /**
   * Manual refresh, exposed for the "Refresh" button and for use immediately
   * after a successful transfer.
   *
   * Returns a promise so a caller can `await refetch()` and know the UI is up
   * to date before showing a success state.
   */
  const refetch = useCallback(async () => {
    if (!address) return
    await load(address)
  }, [address, load])

  const getBalanceFor = useCallback(
    (denom: string) => balances.find((balance) => balance.denom === denom),
    [balances],
  )

  // `?? '0'` collapses "no INJ entry at all" and "an INJ entry of zero" into the
  // same value, which is what every consumer actually wants.
  const injBalance = getBalanceFor(INJ_DENOM)?.formattedAmount ?? '0'

  return { balances, isLoading, error, refetch, getBalanceFor, injBalance }
}
