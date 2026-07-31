'use client'

/**
 * =============================================================================
 * FILE: context/WalletProvider.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Holds the wallet connection state for the entire application and makes it
 * available to any component via React Context.
 *
 * WHY IT EXISTS
 * -------------
 * The connected address is needed in half the components in the app: the
 * header shows it, the balances panel queries with it, the send form signs
 * with it. Passing it down through props ("prop drilling") would mean threading
 * the same value through components that have no interest in it.
 *
 * React Context solves exactly this: one component owns the state, and any
 * descendant can read it directly.
 *
 * WHY A PROVIDER RATHER THAN A GLOBAL VARIABLE
 * --------------------------------------------
 * A module-level `let currentAccount` would be simpler and would be wrong.
 * React does not know when a plain variable changes, so no component would
 * re-render on connect. Context is how you give React a value it can subscribe
 * to.
 *
 * WHY NOT REDUX / ZUSTAND / JOTAI
 * -------------------------------
 * They are all fine choices, and a larger app will want one. For a single piece
 * of state with four transitions, Context is built into React, requires no
 * dependency, and — for a teaching repository — has the enormous advantage that
 * a reader can see the entire mechanism in this one file.
 *
 * WHEN TO USE
 * -----------
 * Mounted once, near the root, in `app/layout.tsx`. Components consume it
 * through `useWallet()` and never import this file directly.
 *
 * FLOW
 * ----
 *   User clicks "Connect"
 *        |
 *        v
 *   connect(walletId)   [status: connecting]
 *        |
 *        v
 *   lib/wallet.ts -> extension popup
 *        |
 *        +-- approved -> WalletAccount   [status: connected]
 *        |
 *        +-- rejected -> AppError        [status: errored]
 *        |
 *        v
 *   every consumer re-renders
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/wallet.ts`, `lib/errors.ts`, `types/wallet.ts`
 * Depended on by: `app/layout.tsx` (mounts it), `hooks/useWallet.ts` (reads it)
 * =============================================================================
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearLastWallet,
  connectWallet,
  isWalletInstalled,
  readLastWallet,
} from '@/lib/wallet'
import { toAppError } from '@/lib/errors'
import type { WalletAccount, WalletContextValue, WalletId, WalletStatus } from '@/types'

/**
 * The context object itself.
 *
 * The default is `null` rather than a dummy value on purpose: it lets
 * `useWallet()` detect that a component was rendered outside the provider and
 * throw a message that says so, instead of silently handing back a
 * permanently-disconnected wallet and leaving you to wonder why the button does
 * nothing.
 */
export const WalletContext = createContext<WalletContextValue | null>(null)

/**
 * Provides wallet state to the component tree.
 *
 * @param props.children The application.
 * @returns A context provider wrapping `children`.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <WalletProvider>{children}</WalletProvider>
 * ```
 *
 * WORKFLOW
 *   mount
 *        |
 *        v
 *   read localStorage for a previously used wallet
 *        |
 *        +-- none, or extension gone -> stay 'disconnected'
 *        |
 *        +-- found -> silent reconnect attempt
 *        |
 *        v
 *   expose { status, account, error, connect, disconnect }
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  /* -------------------------------------------------------------------------
   * State
   * -------------------------------------------------------------------------
   * Three pieces of state, and the invariant that ties them together:
   *
   *   status === 'connected' <=> account !== null
   *   status === 'errored'   <=> error   !== null
   *
   * Every setter below updates them together to preserve that. Getting this
   * wrong — leaving a stale error visible after a successful reconnect, say —
   * is the most common bug in hand-rolled wallet state.
   * ---------------------------------------------------------------------- */

  const [status, setStatus] = useState<WalletStatus>('disconnected')
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Connects to a wallet and stores the resulting account.
   *
   * @param walletId Which wallet to connect.
   * @returns Nothing. Failures are captured into state rather than thrown, so
   *          that a component can call `void connect('keplr')` from an
   *          `onClick` without needing its own try/catch.
   *
   * WHY THE ERROR IS SWALLOWED HERE
   * A rejected promise from an event handler becomes an unhandled rejection in
   * the console and, in React 19, can escalate to an error boundary. Since the
   * error is already being rendered from state, re-throwing it would only
   * produce noise.
   */
  const connect = useCallback(async (walletId: WalletId) => {
    setStatus('connecting')
    setError(null)

    try {
      const connectedAccount = await connectWallet(walletId)
      setAccount(connectedAccount)
      setStatus('connected')
    } catch (thrown) {
      const appError = toAppError(thrown, 'connecting your wallet')
      setAccount(null)
      setError(appError.message)
      setStatus('errored')
    }
  }, [])

  /**
   * Forgets the connected account.
   *
   * @returns Nothing.
   *
   * WHAT THIS DOES NOT DO
   * There is no network call and nothing is revoked. A blockchain has no
   * sessions, so "disconnect" simply means your app stops remembering the
   * address. The wallet extension may still list your site as approved, which
   * is why reconnecting often skips the popup.
   *
   * To genuinely revoke access, a user removes the site from their wallet's
   * connected-sites list. This is worth saying out loud in a workshop, because
   * "disconnect" strongly implies more than it delivers.
   */
  const disconnect = useCallback(() => {
    clearLastWallet()
    setAccount(null)
    setError(null)
    setStatus('disconnected')
  }, [])

  /* -------------------------------------------------------------------------
   * Silent reconnect on page load
   * -------------------------------------------------------------------------
   * If the user connected before, try again without showing a popup. Wallets
   * remember approved sites, so `enable()` usually resolves instantly and the
   * user simply stays logged in across refreshes.
   *
   * Note what is NOT done here: we never restore a cached address. We ask the
   * extension again, because the user may have switched accounts while the tab
   * was closed. Showing them a stale address — and a stale balance — would be
   * worse than showing nothing.
   * ---------------------------------------------------------------------- */
  useEffect(() => {
    const lastWalletId = readLastWallet()
    if (!lastWalletId) return

    // The extension may have been uninstalled since the last visit. Checking
    // first avoids an error popup on a page the user just opened.
    if (!isWalletInstalled(lastWalletId)) {
      clearLastWallet()
      return
    }

    void connect(lastWalletId)
    // `connect` is wrapped in `useCallback` with an empty dependency array, so
    // it is referentially stable and this effect runs exactly once.
  }, [connect])

  /* -------------------------------------------------------------------------
   * React to account switching inside the wallet
   * -------------------------------------------------------------------------
   * Keplr and Leap fire a `keplr_keystorechange` / `leap_keystorechange` event
   * on `window` when the user changes account or network in the extension.
   *
   * Handling this is what separates a dApp that feels solid from one that feels
   * broken. Without it, a user switches account, the UI keeps showing the old
   * address and the old balance, and the next transaction fails with a
   * signature mismatch they have no way to understand.
   * ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!account) return

    const handleKeystoreChange = () => {
      // Re-run the full connect flow. It re-reads the address from the
      // extension, so whatever the user switched to becomes the new truth.
      void connect(account.walletId)
    }

    window.addEventListener('keplr_keystorechange', handleKeystoreChange)
    window.addEventListener('leap_keystorechange', handleKeystoreChange)

    // Cleanup matters. Without it, every re-render would add another listener
    // and a single account switch would eventually trigger dozens of
    // reconnects. React Strict Mode in development mounts effects twice
    // specifically to make a missing cleanup obvious.
    return () => {
      window.removeEventListener('keplr_keystorechange', handleKeystoreChange)
      window.removeEventListener('leap_keystorechange', handleKeystoreChange)
    }
  }, [account, connect])

  /* -------------------------------------------------------------------------
   * The context value
   * -------------------------------------------------------------------------
   * `useMemo` is not a micro-optimisation here. A context value object rebuilt
   * on every render is a NEW object each time, and every consumer re-renders
   * even when nothing meaningful changed. Memoising is the standard fix and is
   * effectively required for any non-trivial context.
   * ---------------------------------------------------------------------- */
  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      account,
      error,
      isConnected: status === 'connected' && account !== null,
      isConnecting: status === 'connecting',
      connect,
      disconnect,
    }),
    [status, account, error, connect, disconnect],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
