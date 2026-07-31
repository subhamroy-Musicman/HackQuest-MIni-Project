'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getBalances } from '@/lib/api'
import { AppError, toAppError } from '@/lib/errors'
import { INJ_DENOM, POLL_INTERVAL_MS } from '@/lib/constants'
import type { Balance } from '@/types'

export interface UseBalancesResult {
  
  balances: Balance[]
  
  isLoading: boolean
  
  error: AppError | null
  
  refetch: () => Promise<void>
  
  getBalanceFor: (denom: string) => Balance | undefined
  
  injBalance: string
}

export function useBalances(
  address: string | null | undefined,
  options: { pollIntervalMs?: number } = {},
): UseBalancesResult {
  const { pollIntervalMs = POLL_INTERVAL_MS } = options

  const [balances, setBalances] = useState<Balance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const isMountedRef = useRef(true)

  const activeAddressRef = useRef<string | null | undefined>(address)

  const load = useCallback(
    async (targetAddress: string) => {
      try {
        const nextBalances = await getBalances(targetAddress)
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
    if (!address) {
      setBalances([])
      setError(null)
      setIsLoading(false)
      return () => {
        isMountedRef.current = false
      }
    }
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

  const refetch = useCallback(async () => {
    if (!address) return
    await load(address)
  }, [address, load])

  const getBalanceFor = useCallback(
    (denom: string) => balances.find((balance) => balance.denom === denom),
    [balances],
  )
  const injBalance = getBalanceFor(INJ_DENOM)?.formattedAmount ?? '0'

  return { balances, isLoading, error, refetch, getBalanceFor, injBalance }
}
