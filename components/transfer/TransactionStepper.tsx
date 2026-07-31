/**
 * =============================================================================
 * FILE: components/transfer/TransactionStepper.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Visualises the five stages a transaction moves through, highlighting the
 * current one.
 *
 * WHY IT EXISTS
 * -------------
 * This component is pure teaching, and it is the one most worth keeping when
 * you adapt this project.
 *
 * A normal app would show a spinner for the whole operation. That is fine for
 * a form submission, but a blockchain transaction is not one operation — it is
 * five distinct steps, each with its own duration and its own failure mode:
 *
 *   PREPARE      ~200ms   read accountNumber, sequence, block height
 *   SIGN         unbounded — a human has to click a button in a popup
 *   BROADCAST    ~300ms   deliver signed bytes to a node
 *   CONFIRM      ~1-3s    wait for a validator to include it in a block
 *   DONE         the chain reports success or failure
 *
 * Making them visible answers the questions users actually have — "is it stuck,
 * or is it waiting for me?" — and teaches the lifecycle by showing it. After
 * one transfer, an attendee understands what "broadcasting" means because they
 * watched it happen.
 *
 * WHEN TO USE
 * -----------
 * While `stage !== 'idle'`, inside the send form.
 *
 * EXECUTION FLOW
 * --------------
 *   lib/transactions.ts calls onStageChange('signing')
 *        |
 *        v
 *   hooks/useSendInj.ts setStage('signing')
 *        |
 *        v
 *   THIS COMPONENT re-renders with the new stage highlighted
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `types/injective.ts`, `components/ui/Spinner.tsx`, `utils/cn.ts`
 * Depended on by: `components/transfer/SendInjForm.tsx`
 * =============================================================================
 */

import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'
import type { TransactionStage } from '@/types'

/**
 * The steps shown in the UI, in order.
 *
 * Note that `success` and `error` are absent: they are terminal outcomes, not
 * steps, and are rendered separately by the receipt and the alert.
 */
const STEPS: Array<{
  stage: TransactionStage
  label: string
  detail: string
}> = [
  {
    stage: 'preparing',
    label: 'Preparing',
    detail: 'Reading your account number and sequence from the chain.',
  },
  {
    stage: 'signing',
    label: 'Awaiting signature',
    detail: 'Approve the request in your wallet. Nothing has been sent yet.',
  },
  {
    stage: 'broadcasting',
    label: 'Broadcasting',
    detail: 'Sending the signed transaction to an Injective node.',
  },
  {
    stage: 'confirming',
    label: 'Confirming',
    detail: 'Waiting for a validator to include it in a block.',
  },
]

/** Maps a stage to its index in `STEPS`. Terminal stages map past the end. */
function stageIndex(stage: TransactionStage): number {
  const index = STEPS.findIndex((step) => step.stage === stage)
  if (index !== -1) return index
  // 'success' and 'error' both mean every step is behind us.
  return stage === 'success' || stage === 'error' ? STEPS.length : -1
}

export interface TransactionStepperProps {
  stage: TransactionStage
}

/**
 * Renders the transaction lifecycle.
 *
 * @param props.stage The current stage.
 * @returns The stepper, or `null` while idle.
 *
 * @example
 * ```tsx
 * <TransactionStepper stage={stage} />
 * ```
 *
 * WORKFLOW
 *   stage -> index
 *        |
 *        v
 *   for each step: index < current ? done : index === current ? active : pending
 *        |
 *        v
 *   the active step gets a spinner and its explanatory detail
 *
 * ACCESSIBILITY
 * `aria-live="polite"` makes a screen reader announce each stage change as it
 * happens, without interrupting. A sighted user watches the steps advance; a
 * screen reader user hears them. Both get the same information, which is the
 * entire goal.
 */
export function TransactionStepper({ stage }: TransactionStepperProps) {
  if (stage === 'idle') return null

  const currentIndex = stageIndex(stage)
  const hasFailed = stage === 'error'

  return (
    <div
      className="space-y-1 rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-3"
      aria-live="polite"
    >
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex
        const isActive = index === currentIndex && !hasFailed
        const isFailedHere = hasFailed && index === currentIndex

        return (
          <div key={step.stage} className="flex items-start gap-3 py-1">
            {/* The status marker: tick, spinner, cross or empty circle. */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {isDone && (
                <span
                  className="text-xs text-[var(--color-success)]"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              {isActive && (
                <Spinner
                  size="sm"
                  className="text-[var(--color-brand)]"
                  label={step.label}
                />
              )}
              {isFailedHere && (
                <span
                  className="text-xs text-[var(--color-danger)]"
                  aria-hidden="true"
                >
                  ✕
                </span>
              )}
              {!isDone && !isActive && !isFailedHere && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-line-strong)]"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-xs font-medium transition-colors',
                  isDone && 'text-[var(--color-content-secondary)]',
                  isActive && 'text-[var(--color-brand)]',
                  isFailedHere && 'text-[var(--color-danger)]',
                  !isDone &&
                    !isActive &&
                    !isFailedHere &&
                    'text-[var(--color-content-muted)]',
                )}
              >
                {step.label}
              </p>

              {/* The explanation only appears for the step in progress. Showing
                  all four at once would be a wall of text nobody reads; showing
                  one at the moment it is relevant is read every time. */}
              {(isActive || isFailedHere) && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
