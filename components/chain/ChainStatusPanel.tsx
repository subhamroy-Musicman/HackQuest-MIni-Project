'use client'

/**
 * =============================================================================
 * FILE: components/chain/ChainStatusPanel.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Shows the chain id, the latest block height and when that block was produced.
 *
 * WHY IT EXISTS
 * -------------
 * This is the "hello world" of blockchain development, and it earns its place
 * at the top of the page for three reasons:
 *
 *   1. IT PROVES THE CONNECTION. If a block height appears, your endpoints are
 *      correct and the network is reachable. If it does not, nothing else can
 *      possibly work — so this is the first thing to check when debugging.
 *
 *   2. IT DEMONSTRATES PERMISSIONLESS READS. No wallet is connected when this
 *      loads. Reading a blockchain requires no account, no key, no gas and no
 *      permission from anyone.
 *
 *   3. IT MAKES THE CHAIN FEEL ALIVE. The height ticks up every fifteen
 *      seconds. Watching a number increase because validators somewhere in the
 *      world are producing blocks is, for most people, the moment the
 *      abstraction becomes real.
 *
 * WHEN TO USE
 * -----------
 * Once, near the top of the dashboard.
 *
 * EXECUTION FLOW
 * --------------
 *   mount
 *      |
 *      v
 *   useChainStatus() -> /api/chain/status -> lib/queries.ts -> node
 *      |
 *      v
 *   first load  -> skeleton
 *   failure     -> Alert with a retry
 *   success     -> chain id, height, block age
 *      |
 *      v
 *   repeats every POLL_INTERVAL_MS
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useChainStatus.ts`, `lib/constants.ts`,
 *              `utils/format.ts`, `components/ui/*`
 * Depended on by: `app/page.tsx`
 * =============================================================================
 */

import { useChainStatus } from '@/hooks/useChainStatus'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { CHAIN_ID, IS_MAINNET, NETWORK_NAME } from '@/lib/constants'
import { formatBlockHeight, formatRelativeTime } from '@/utils/format'

/**
 * One statistic in the panel's grid.
 *
 * @param props.label Small uppercase caption.
 * @param props.value The value, rendered monospaced.
 * @param props.hint  Optional one-line explanation of what the value means.
 */
function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-3">
      <p className="text-[11px] tracking-wide text-[var(--color-content-muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm break-all text-[var(--color-content-primary)]">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * Renders the chain status panel.
 *
 * @returns A `Card` with the network's live state.
 *
 * @example
 * ```tsx
 * <ChainStatusPanel />
 * ```
 *
 * A DETAIL WORTH NOTICING: THE CHAIN ID MISMATCH WARNING
 * ------------------------------------------------------
 * The panel compares the chain id the NODE reported against the one this build
 * was CONFIGURED with. Normally they match and nothing is shown. If they differ
 * — because `INJECTIVE_REST_ENDPOINT` points at a different network than
 * `NEXT_PUBLIC_INJECTIVE_NETWORK` claims — a warning appears immediately.
 *
 * Without this check, that misconfiguration stays invisible until the user
 * tries to sign, and then produces a signature failure with no obvious cause.
 * Surfacing a mismatch the moment it can be detected is worth the eight lines.
 */
export function ChainStatusPanel() {
  const { status, isLoading, error, refetch } = useChainStatus()

  const hasChainIdMismatch = status !== null && status.chainId !== CHAIN_ID

  return (
    <Card
      title="Network status"
      description="Read from the chain with no wallet, no account and no gas. Public data is genuinely public."
      headerAction={
        <Badge
          // Mainnet is styled as a warning, not a success. Real funds deserve a
          // colour that makes the user pause.
          variant={IS_MAINNET ? 'warning' : 'brand'}
          withDot
          pulse={!isLoading && !error}
        >
          {IS_MAINNET ? 'MAINNET · real funds' : 'TESTNET'}
        </Badge>
      }
    >
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
        </div>
      )}

      {/* Errors are shown ONLY when we have nothing to display. If a poll fails
          but we still hold a previous block, showing stale data quietly is far
          better than replacing a working panel with a red box. */}
      {!isLoading && error && !status && (
        <Alert
          variant="error"
          title="Could not reach the network"
          message={error.message}
          hint={error.hint}
          onRetry={refetch}
        />
      )}

      {status && (
        <div className="space-y-3">
          {hasChainIdMismatch && (
            <Alert
              variant="warning"
              title="Chain id mismatch"
              message={`This app is configured for "${CHAIN_ID}" but the endpoint answered as "${status.chainId}".`}
              hint="Your RPC endpoint points at a different network than NEXT_PUBLIC_INJECTIVE_NETWORK claims. Transactions signed here would be rejected. Fix .env.local and restart the dev server."
            />
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Chain id"
              value={status.chainId}
              hint="Baked into every signature, which is what makes a transaction impossible to replay on another chain."
            />
            <Stat
              label="Latest block"
              value={formatBlockHeight(status.latestBlockHeight)}
              hint="Increases roughly every 0.65 seconds as validators finalise blocks."
            />
            <Stat
              label="Block produced"
              value={formatRelativeTime(status.latestBlockTime)}
              hint="If this stops moving, the node you are reading from has stalled."
            />
          </div>

          <p className="text-[11px] text-[var(--color-content-muted)]">
            Network{' '}
            <span className="text-[var(--color-content-secondary)]">
              {NETWORK_NAME}
            </span>{' '}
            · served from{' '}
            <span className="font-mono break-all">{status.endpoint}</span>
          </p>
        </div>
      )}
    </Card>
  )
}
