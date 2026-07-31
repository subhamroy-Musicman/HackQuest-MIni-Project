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
import { sendInj } from '@/lib/transactions'
import { AppError, toAppError, walletNotConnectedError } from '@/lib/errors'
import { sleep } from '@/lib/helpers'
import { useWallet } from './useWallet'
import type { TransactionResult, TransactionStage } from '@/types'

export interface SendInjInput {
  recipientAddress: string
  /** Amount in human units, exactly as typed, e.g. `"0.1"`. */
  humanAmount: string
  memo?: string
  /** The sender's INJ balance in human units, for pre-flight validation. */
  availableBalance?: string
}

export interface UseSendInjResult {
  /** Current position in the transaction lifecycle. */
  stage: TransactionStage
  /** True while a transaction is in flight. Use it to disable the button. */
  isSending: boolean
  /** The confirmed result, or `null`. */
  result: TransactionResult | null
  /** The failure, or `null`. */
  error: AppError | null
  /** Starts the flow. Never throws — errors land in `error`. */
  send: (input: SendInjInput) => Promise<void>
  /** Clears result and error, returning the form to its initial state. */
  reset: () => void
}

/**
 * Manages one INJ transfer.
 *
 * @param options.onSuccess Called after a confirmed transaction. Used by the
 *                          form to refresh balances.
 * @returns See `UseSendInjResult`.
 *
 * @example
 * ```tsx
 * const { send, stage, isSending, result, error, reset } = useSendInj({
 *   onSuccess: () => refetchBalances(),
 * })
 *
 * <form onSubmit={(event) => {
 *   event.preventDefault()
 *   void send({ recipientAddress, humanAmount: amount })
 * }}>
 *   <Button type="submit" isLoading={isSending} disabled={isSending}>
 *     Send INJ
 *   </Button>
 * </form>
 * ```
 *
 * WORKFLOW
 *   guard: is a wallet connected?
 *        |
 *        v
 *   guard: is a send already running?  (see the re-entrancy note below)
 *        |
 *        v
 *   clear previous result/error
 *        |
 *        v
 *   sendInj(), forwarding every stage change into React state
 *        |
 *        +-- success -> store result; wait briefly; call onSuccess
 *        |
 *        +-- failure -> store AppError, stage = 'error'
 */
export function useSendInj(
  options: { onSuccess?: (result: TransactionResult) => void } = {},
): UseSendInjResult {
  const { onSuccess } = options
  const { account } = useWallet()

  const [stage, setStage] = useState<TransactionStage>('idle')
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState<AppError | null>(null)

  /**
   * Re-entrancy guard.
   *
   * A `useRef` rather than state, because it must be readable and writable
   * *synchronously*. `setState` is asynchronous: two clicks a few milliseconds
   * apart would both observe the old value and both proceed, opening two wallet
   * popups and — worse — building two transactions with the same sequence
   * number. The second is guaranteed to fail with a sequence mismatch.
   *
   * Disabling the button is not sufficient on its own. A double-click can fire
   * both events before React re-renders, and keyboard submits can bypass it
   * entirely. Guard the logic, not just the pixel.
   */
  const isSendingRef = useRef(false)
  const [isSending, setIsSending] = useState(false)

  const reset = useCallback(() => {
    setStage('idle')
    setResult(null)
    setError(null)
  }, [])

  const send = useCallback(
    async (input: SendInjInput) => {
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
        const transactionResult = await sendInj({
          sender: account,
          recipientAddress: input.recipientAddress,
          humanAmount: input.humanAmount,
          memo: input.memo,
          availableBalance: input.availableBalance,
          // Every stage transition inside `lib/transactions.ts` becomes a React
          // state update here. This callback is the entire reason the UI can
          // show a live stepper instead of an opaque spinner.
          onStageChange: setStage,
        })

        setResult(transactionResult)
        setStage('success')

        /* -----------------------------------------------------------------
         * Wait before refreshing balances.
         *
         * A node can confirm that a transaction is in a block a moment before
         * its own query state reflects the new balances — the two are served by
         * different subsystems. Refetching instantly therefore often returns
         * the OLD balance, and the user concludes the transfer did not work.
         *
         * A short pause is not a hack; it is an acknowledgement that a
         * distributed system is eventually consistent. Production apps handle
         * this more rigorously, by polling until the balance actually changes.
         * ----------------------------------------------------------------- */
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
