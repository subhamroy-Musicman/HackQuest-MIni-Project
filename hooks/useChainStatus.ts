'use client'

/**
 * =============================================================================
 * FILE: hooks/useChainStatus.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Fetches the chain's latest block and keeps it fresh by polling.
 *
 * WHY IT EXISTS
 * -------------
 * It demonstrates the complete read path — component to hook to API route to
 * SDK to node and back — with the smallest possible payload and no wallet
 * involved. It is the first thing that should work in a fresh clone, and the
 * first thing to check when something is broken.
 *
 * WHY POLLING, AND WHAT THE ALTERNATIVE IS
 * ----------------------------------------
 * Blockchains do not push updates to web pages. There are two ways to stay
 * current:
 *
 *   POLLING     Ask again every N seconds. Simple, works everywhere, survives
 *               a dropped connection without any special handling. Costs one
 *               request per interval whether or not anything changed.
 *
 *   STREAMING   Open a WebSocket and receive events as they happen. Efficient
 *               and instant, but you now own reconnection, backoff, ordering
 *               and missed-event recovery.
 *
 * This project polls, because for a workshop the failure modes of streaming are
 * a distraction. The SDK does support streaming, and it is listed under "Next
 * steps" in the README.
 *
 * WHEN TO USE
 * -----------
 * Mounted once by `components/chain/ChainStatusPanel.tsx`.
 *
 * EXECUTION FLOW
 * --------------
 *   mount
 *     |
 *     v
 *   fetch immediately (so the panel is never empty for 15 seconds)
 *     |
 *     v
 *   setInterval(POLL_INTERVAL_MS)
 *     |
 *     v
 *   lib/api.ts getChainStatus() -> /api/chain/status -> node
 *     |
 *     v
 *   { status, isLoading, error, refetch }
 *     |
 *     v
 *   unmount -> clearInterval  (otherwise it polls forever)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/api.ts`, `lib/errors.ts`, `lib/constants.ts`
 * Depended on by: `components/chain/ChainStatusPanel.tsx`
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getChainStatus } from '@/lib/api'
import { AppError, toAppError } from '@/lib/errors'
import { POLL_INTERVAL_MS } from '@/lib/constants'
import type { ChainStatus } from '@/types'

export interface UseChainStatusResult {
  /** The latest snapshot, or `null` before the first successful load. */
  status: ChainStatus | null
  /** True only during the FIRST load. Background refreshes do not set this. */
  isLoading: boolean
  /** The last failure, or `null`. */
  error: AppError | null
  /** Triggers an immediate refetch, e.g. from a "Retry" button. */
  refetch: () => void
}

/**
 * Subscribes to the chain's latest block.
 *
 * @param options.pollIntervalMs How often to refetch. Defaults to
 *                               `POLL_INTERVAL_MS`. Pass `0` to fetch once and
 *                               never poll.
 * @returns `{ status, isLoading, error, refetch }`.
 *
 * @example
 * ```tsx
 * function ChainStatusPanel() {
 *   const { status, isLoading, error, refetch } = useChainStatus()
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Alert message={error.message} onRetry={refetch} />
 *
 *   return <p>Block {status!.latestBlockHeight}</p>
 * }
 * ```
 *
 * WORKFLOW
 *   load() sets isLoading only when there is no data yet
 *        |
 *        v
 *   getChainStatus()
 *        |
 *        +-- success -> store, clear error
 *        |
 *        +-- failure -> store AppError, KEEP the previous data
 *        |
 *        v
 *   repeat every pollIntervalMs
 *
 * TWO DESIGN DECISIONS WORTH COPYING
 * ----------------------------------
 * 1. `isLoading` is true only for the first load. If it flipped on every poll,
 *    the panel would flash a spinner every fifteen seconds. Users read that as
 *    a broken page. Background refreshes should be invisible.
 *
 * 2. On failure we keep the previous data. A momentarily unreachable node
 *    should not blank the screen — showing slightly stale data with an error
 *    banner is far more useful than showing nothing.
 */
export function useChainStatus(
  options: { pollIntervalMs?: number } = {},
): UseChainStatusResult {
  const { pollIntervalMs = POLL_INTERVAL_MS } = options

  const [status, setStatus] = useState<ChainStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  /**
   * Tracks whether the component is still mounted.
   *
   * A `useRef` holds a mutable value that survives re-renders WITHOUT causing
   * one when it changes — which is exactly what a "am I still here?" flag needs
   * to be. Setting state on an unmounted component is a real bug in a polling
   * hook: the user navigates away, the in-flight request resolves, and React
   * warns about an update to a component that no longer exists.
   */
  const isMountedRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const next = await getChainStatus()
      if (!isMountedRef.current) return

      setStatus(next)
      setError(null)
    } catch (thrown) {
      if (!isMountedRef.current) return
      // Deliberately NOT clearing `status`. See note 2 above.
      setError(toAppError(thrown, 'loading chain status'))
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    // Fetch straight away, so the panel is populated in a few hundred
    // milliseconds rather than after a full poll interval of blankness.
    void load()

    // `pollIntervalMs <= 0` means "load once", which is useful in tests and for
    // components that only need a snapshot.
    if (pollIntervalMs <= 0) {
      return () => {
        isMountedRef.current = false
      }
    }

    const intervalId = setInterval(() => void load(), pollIntervalMs)

    // The cleanup function is not optional. Without `clearInterval`, every
    // mount would leave a timer running forever, and navigating back and forth
    // would multiply the request rate until the endpoint rate-limits you.
    return () => {
      isMountedRef.current = false
      clearInterval(intervalId)
    }
  }, [load, pollIntervalMs])

  return { status, isLoading, error, refetch: () => void load() }
}
