'use client'

/**
 * =============================================================================
 * FILE: hooks/useIsMounted.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Reports whether the component has finished its first render in the browser.
 *
 * WHY IT EXISTS
 * -------------
 * This hook exists because of "hydration mismatch", and understanding that
 * error is worth five minutes of anyone's time.
 *
 * Next.js renders your components twice:
 *
 *   1. On the SERVER, to produce the initial HTML. There is no `window` there,
 *      no wallet extension, no `localStorage`.
 *   2. In the BROWSER, to attach event handlers — this step is called
 *      hydration. Now `window` exists and the wallet may be installed.
 *
 * React requires the browser's first render to produce **exactly** the same
 * HTML the server produced. If it does not, you get:
 *
 *     "Hydration failed because the server rendered HTML didn't match the client"
 *
 * Anything wallet-related trips this, because the server always thinks "no
 * wallet" while the browser may think "Keplr is installed and connected".
 *
 * THE FIX
 * -------
 * Render the server-safe version first, then switch. `useIsMounted()` returns
 * `false` during the server render *and* during hydration, then flips to `true`
 * immediately afterwards — because effects only run in the browser, after
 * hydration is complete.
 *
 * WHEN TO USE
 * -----------
 * Any component whose output depends on `window`, `localStorage`, or wallet
 * state. Do NOT use it everywhere: guarding a component this way costs you
 * server-side rendering for that subtree.
 *
 * EXECUTION FLOW
 * --------------
 *   server render    -> isMounted = false -> render the neutral placeholder
 *        |
 *        v
 *   HTML sent to the browser
 *        |
 *        v
 *   hydration render -> isMounted = false -> SAME output, so React is happy
 *        |
 *        v
 *   effects run      -> setIsMounted(true)
 *        |
 *        v
 *   re-render        -> isMounted = true  -> real, browser-aware UI
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `react`
 * Depended on by: `components/wallet/ConnectWalletButton.tsx`
 * =============================================================================
 */

import { useEffect, useState } from 'react'

/**
 * Returns `true` once the component has mounted in the browser.
 *
 * @returns `false` on the server and during hydration; `true` thereafter.
 *
 * @example
 * ```tsx
 * function WalletButton() {
 *   const isMounted = useIsMounted()
 *   const { isConnected } = useWallet()
 *
 *   // Identical on the server and during hydration -> no mismatch.
 *   if (!isMounted) return <Skeleton className="h-10 w-36" />
 *
 *   return <button>{isConnected ? 'Connected' : 'Connect Wallet'}</button>
 * }
 * ```
 *
 * WORKFLOW
 *   useState(false)
 *        |
 *        v
 *   useEffect runs — browser only, after hydration
 *        |
 *        v
 *   setIsMounted(true) -> one extra render
 *
 * WHY THE EMPTY DEPENDENCY ARRAY
 * `[]` means "run once, after the first render". The effect never needs to run
 * again — a component cannot un-mount and stay mounted.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
