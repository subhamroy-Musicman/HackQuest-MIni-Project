'use client'

import { useContext } from 'react'
import { WalletContext } from '@/context/WalletProvider'
import type { WalletContextValue } from '@/types'

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext)

  if (!context) {
    throw new Error(
      'useWallet() was called outside of <WalletProvider>. Wrap your app in <WalletProvider> — it is mounted in app/layout.tsx.',
    )
  }

  return context
}
