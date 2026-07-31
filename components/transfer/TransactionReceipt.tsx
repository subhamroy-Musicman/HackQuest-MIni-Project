/**
 * =============================================================================
 * FILE: components/transfer/TransactionReceipt.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Shows the result of a confirmed transaction: hash, block height, gas used and
 * a link to the block explorer.
 *
 * WHY IT EXISTS
 * -------------
 * The explorer link is the point of this component.
 *
 * Up to now everything has happened inside one browser tab, and a sceptical
 * attendee could reasonably suspect the whole thing is a simulation. Clicking
 * through to a public block explorer and finding their transaction there —
 * timestamped, signed, permanent, visible to anyone in the world — is the
 * moment it becomes real. In a workshop this single click teaches more than the
 * preceding twenty minutes.
 *
 * The gas figures are the secondary lesson. Seeing that a transfer cost 98,000
 * gas out of a 220,000 limit makes the fee model concrete in a way that a
 * paragraph of explanation does not.
 *
 * WHEN TO USE
 * -----------
 * After a successful send.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `components/ui/*`, `utils/format.ts`, `types/injective.ts`
 * Depended on by: `components/transfer/SendInjForm.tsx`
 * =============================================================================
 */

import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { formatBlockHeight, formatTxHash } from '@/utils/format'
import type { TransactionResult } from '@/types'

export interface TransactionReceiptProps {
  result: TransactionResult
  /** Resets the form so the user can send again. */
  onDismiss: () => void
}

/**
 * Renders a confirmed transaction receipt.
 *
 * @param props.result    The chain's response.
 * @param props.onDismiss Clears the receipt and resets the form.
 * @returns A success panel.
 *
 * @example
 * ```tsx
 * {result && <TransactionReceipt result={result} onDismiss={reset} />}
 * ```
 *
 * A NOTE ON WHAT "CONFIRMED" MEANS HERE
 * -------------------------------------
 * Injective uses Tendermint/CometBFT consensus, which gives **instant
 * finality**: once a block is committed it can never be reverted. There is no
 * concept of waiting for N confirmations, and no possibility of a chain
 * reorganisation undoing this transfer.
 *
 * That is a meaningful difference from Bitcoin or pre-merge Ethereum, where a
 * recently-mined transaction could still be orphaned and exchanges therefore
 * waited for many blocks. On Injective, one block is final. When this receipt
 * appears, the transfer has happened, permanently.
 */
export function TransactionReceipt({ result, onDismiss }: TransactionReceiptProps) {
  return (
    <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-dim)] p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-success)] text-[11px] font-bold text-[var(--color-success)]"
          aria-hidden="true"
        >
          ✓
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-content-primary)]">
              Transaction confirmed
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-content-secondary)]">
              Included in block {formatBlockHeight(String(result.height))} and
              final. Injective uses instant finality, so this can never be
              reversed or reorganised out of the chain.
            </p>
          </div>

          {/* The hash, truncated for layout but copied in full. */}
          <div className="rounded-md border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tracking-wide text-[var(--color-content-muted)] uppercase">
                Transaction hash
              </span>
              <CopyButton value={result.txHash} label="Copy transaction hash" />
            </div>
            <p className="mt-1 font-mono text-xs text-[var(--color-content-primary)]">
              <span className="sm:hidden">{formatTxHash(result.txHash)}</span>
              <span className="hidden break-all sm:inline">{result.txHash}</span>
            </p>
          </div>

          {/* Gas. `gasUsed` is what the transaction actually consumed;
              `gasWanted` is the limit that was reserved. */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-2.5">
              <p className="text-[11px] tracking-wide text-[var(--color-content-muted)] uppercase">
                Gas used
              </p>
              <p className="mt-0.5 font-mono text-xs text-[var(--color-content-primary)]">
                {formatBlockHeight(String(result.gasUsed))}
              </p>
            </div>
            <div className="rounded-md border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-2.5">
              <p className="text-[11px] tracking-wide text-[var(--color-content-muted)] uppercase">
                Gas limit
              </p>
              <p className="mt-0.5 font-mono text-xs text-[var(--color-content-primary)]">
                {formatBlockHeight(String(result.gasWanted))}
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--color-content-muted)]">
            The limit is what you reserved; the used figure is what the
            transaction actually consumed. Reserving more than you need is safe —
            reserving too little makes the transaction fail with &ldquo;out of
            gas&rdquo; after the fee has already been charged.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* The whole point of this component. */}
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-xs font-medium text-[#04141a] transition-colors hover:bg-[var(--color-brand-strong)] hover:text-white"
            >
              View on the block explorer ↗
            </a>

            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Send another
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
