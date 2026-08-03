'use client'

/**
 * =============================================================================
 * FILE: hooks/useSendInj.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Drives the complete send-a-transaction flow from the UI's point of view:
 * stage tracking, the result, the error, and a reset.
 *
 * WHY IT EXISTS
 * -------------
 * `lib/transactions.ts` knows how to send INJ. It knows nothing about React,
 * and it should stay that way — it is a plain async function that could run in
 * a script or a test.
 *
 * This hook is the adapter between that function and a component: it holds the
 * transient state a UI needs (which stage are we in, is the button disabled,
 * what should the receipt show) without leaking React into the blockchain
 * logic.
 *
 * The split is worth naming, because it is the architectural pattern this whole
 * repository follows:
 *
 *   lib/    — pure logic. No React. Testable in isolation. Reusable anywhere.
 *   hooks/  — React state around that logic.
 *   components/ — rendering only.
 *
 * WHEN TO USE
 * -----------
 * From `components/transfer/SendInjForm.tsx`.
 *
 * EXECUTION FLOW
 * --------------
 *   user submits the form
 *        |
 *        v
 *   send({ recipientAddress, humanAmount, memo })
 *        |
 *        v
 *   lib/transactions.ts sendInj()
 *        |  reports each stage back through onStageChange
 *        v
 *   preparing -> signing -> broadcasting -> confirming -> success
 *        |
 *        v
 *   result stored; balances refreshed after a short delay
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/transactions.ts`, `lib/errors.ts`, `lib/helpers.ts`,
 *              `hooks/useWallet.ts`
 * Depended on by: `components/transfer/SendInjForm.tsx`
 * =============================================================================
 */

import { useCallback, useRef, useState } from 'react'
import { sendToken } from '@/lib/transactions'
import { AppError, toAppError, walletNotConnectedError } from '@/lib/errors'
import { sleep } from '@/lib/helpers'
import { useWallet } from './useWallet'
import type { TransactionResult, TransactionStage } from '@/types'

export interface SendTokenInput {
  recipientAddress: string
  /** Amount in human units, exactly as typed, e.g. `"0.1"`. */
  humanAmount: string
  /** The token's on-chain denomination. */
  denom: string
  /** The token's decimal precision. */
  decimals: number
  memo?: string
  /** The sender's balance in human units, for pre-flight validation. */
  availableBalance?: string
}

export interface UseSendTokenResult {
  /** Current position in the transaction lifecycle. */
  stage: TransactionStage
  /** True while a transaction is in flight. Use it to disable the button. */
  isSending: boolean
  /** The confirmed result, or `null`. */
  result: TransactionResult | null
  /** The failure, or `null`. */
  error: AppError | null
  /** Starts the flow. Never throws — errors land in `error`. */
  send: (input: SendTokenInput) => Promise<void>
  /** Clears result and error, returning the form to its initial state. */
  reset: () => void
}

/**
 * Manages one token transfer.
 *
 * @param options.onSuccess Called after a confirmed transaction. Used by the
 *                          form to refresh balances.
 * @returns See `UseSendTokenResult`.
 */
export function useSendToken(
  options: { onSuccess?: (result: TransactionResult) => void } = {},
): UseSendTokenResult {
  const { onSuccess } = options
  const { account } = useWallet()

  const [stage, setStage] = useState<TransactionStage>('idle')
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState<AppError | null>(null)

  const isSendingRef = useRef(false)
  const [isSending, setIsSending] = useState(false)

  const reset = useCallback(() => {
    setStage('idle')
    setResult(null)
    setError(null)
  }, [])

  const send = useCallback(
    async (input: SendTokenInput) => {
      if (!account) {
        setError(walletNotConnectedError())
        setStage('error')
        return
      }

      if (isSendingRef.current) return

      isSendingRef.current = true
      setIsSending(true)
      setResult(null)
      setError(null)

      try {
        const transactionResult = await sendToken({
          sender: account,
          recipientAddress: input.recipientAddress,
          humanAmount: input.humanAmount,
          denom: input.denom,
          decimals: input.decimals,
          memo: input.memo,
          availableBalance: input.availableBalance,
          onStageChange: setStage,
        })

        setResult(transactionResult)
        setStage('success')

        await sleep(1500)
        onSuccess?.(transactionResult)
      } catch (thrown) {
        setError(toAppError(thrown, 'sending your transaction'))
        setStage('error')
      } finally {
        isSendingRef.current = false
        setIsSending(false)
      }
    },
    [account, onSuccess],
  )

  return { stage, isSending, result, error, send, reset }
}
