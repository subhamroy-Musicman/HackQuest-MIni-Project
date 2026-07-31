'use client'

/**
 * =============================================================================
 * FILE: hooks/useWallet.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The one way components read wallet state. Wraps `WalletContext` and fails
 * loudly if used outside the provider.
 *
 * WHY IT EXISTS
 * -------------
 * A component could call `useContext(WalletContext)` directly. Two problems
 * with that:
 *
 *   1. The value is typed `WalletContextValue | null`, so every component would
 *      have to handle `null` — a case that only happens through a setup
 *      mistake, not at runtime.
 *   2. If someone forgets to mount `<WalletProvider>`, they get a silent
 *      `null` and a connect button that does nothing, with no clue why.
 *
 * This hook narrows the type once and turns the setup mistake into an
 * immediate, explicit error. It is a tiny function that saves a genuinely
 * frustrating half hour.
 *
 * WHEN TO USE
 * -----------
 * Any client component that needs the address, the connection status, or the
 * connect/disconnect actions.
 *
 * EXECUTION FLOW
 * --------------
 *   component calls useWallet()
 *        |
 *        v
 *   useContext(WalletContext)
 *        |
 *        +-- null -> throw a message naming the actual fix
 *        |
 *        v
 *   return the fully-typed WalletContextValue
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `context/WalletProvider.tsx`
 * Depended on by: `components/wallet/*`, `components/balances/*`,
 *                 `components/transfer/*`, `hooks/useSendInj.ts`
 * =============================================================================
 */

import { useContext } from 'react'
import { WalletContext } from '@/context/WalletProvider'
import type { WalletContextValue } from '@/types'

/**
 * Reads the current wallet state.
 *
 * @returns The full `WalletContextValue`: status, account, error, derived
 *          booleans and the connect/disconnect actions.
 * @throws {Error} If called from a component that is not inside
 *                 `<WalletProvider>`.
 *
 * @example
 * ```tsx
 * function AccountBadge() {
 *   const { isConnected, account, disconnect } = useWallet()
 *
 *   if (!isConnected) return <p>Not connected</p>
 *
 *   return (
 *     <button onClick={disconnect}>
 *       {truncateAddress(account!.injectiveAddress)}
 *     </button>
 *   )
 * }
 * ```
 *
 * WORKFLOW
 *   read context
 *        |
 *        v
 *   null? -> throw with the fix spelled out
 *        |
 *        v
 *   return value (TypeScript now knows it is non-null)
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext)

  if (!context) {
    throw new Error(
      'useWallet() was called outside of <WalletProvider>. Wrap your app in <WalletProvider> — it is mounted in app/layout.tsx.',
    )
  }

  return context
}
