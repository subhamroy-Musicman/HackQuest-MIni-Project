'use client'

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

export const WalletContext = createContext<WalletContextValue | null>(null)

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
    if (!isWalletInstalled(lastWalletId)) {
      clearLastWallet()
      return
    }

    void connect(lastWalletId)
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
      void connect(account.walletId)
    }

    window.addEventListener('keplr_keystorechange', handleKeystoreChange)
    window.addEventListener('leap_keystorechange', handleKeystoreChange)
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
