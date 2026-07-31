'use client'

/**
 * =============================================================================
 * FILE: components/balances/BalancesPanel.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Displays every token the connected account holds, and handles all four states
 * that data can be in.
 *
 * WHY IT EXISTS
 * -------------
 * This component is the clearest illustration in the project of a rule worth
 * internalising: **every piece of remote data has four states, and you must
 * design all four.**
 *
 *   1. NOT REQUESTED  — no wallet connected. Not loading, not an error, not
 *                       empty. A distinct state with its own message.
 *   2. LOADING        — the first fetch. Skeleton, not spinner.
 *   3. ERROR          — the request failed. Show what went wrong AND how to fix
 *                       it, with a retry.
 *   4. SUCCESS        — which splits again:
 *                       4a. with data — render the list
 *                       4b. with NO data — a legitimate outcome for a new
 *                           wallet, and the one everyone forgets
 *
 * Ship only states 2 and 4a — the common shortcut — and a new user sees a blank
 * box and concludes the app is broken.
 *
 * WHEN TO USE
 * -----------
 * On the dashboard.
 *
 * EXECUTION FLOW
 * --------------
 *   useWallet() -> address (or null)
 *        |
 *        v
 *   useBalances(address)
 *        |
 *        v
 *   /api/account/:address/balances -> lib/queries.ts -> bank module
 *        |
 *        v
 *   render one of the four states above
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useWallet.ts`, `hooks/useBalances.ts`,
 *              `components/balances/BalanceRow.tsx`, `components/ui/*`,
 *              `lib/constants.ts`
 * Depended on by: `app/page.tsx`
 * =============================================================================
 */

import { useWallet } from '@/hooks/useWallet'
import { useBalances } from '@/hooks/useBalances'
import { BalanceRow } from './BalanceRow'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { BalanceRowSkeleton } from '@/components/ui/Skeleton'
import { FAUCET_URL, INJ_DENOM, IS_MAINNET } from '@/lib/constants'

/**
 * Renders the balances panel.
 *
 * @returns A `Card` showing balances, or the appropriate non-data state.
 *
 * @example
 * ```tsx
 * <BalancesPanel />
 * ```
 *
 * WHY THIS COMPONENT HOLDS NO STATE OF ITS OWN
 * --------------------------------------------
 * Everything it needs comes from two hooks. It decides what to render and
 * nothing else.
 *
 * That is a deliberate separation: `useBalances` owns fetching, polling, error
 * handling and race-condition guards; this file owns presentation. You can
 * rewrite the entire fetching strategy — swap polling for WebSocket streaming,
 * say — without touching a line of this component. Keeping data logic out of
 * rendering is what makes that possible.
 */
export function BalancesPanel() {
  const { account, isConnected } = useWallet()
  const { balances, isLoading, error, refetch, injBalance } = useBalances(
    account?.injectiveAddress,
  )

  /* --- STATE 1: no wallet connected -------------------------------------- */
  if (!isConnected || !account) {
    return (
      <Card
        title="Your balances"
        description="Every token this account holds, read from the chain's bank module."
      >
        <EmptyState
          icon="◇"
          title="Connect a wallet to see balances"
          description="Balances on a blockchain are public — this app could show anyone's. It needs your address first, which is what connecting provides."
        />
      </Card>
    )
  }

  const hasNoInj = Number.parseFloat(injBalance) === 0

  return (
    <Card
      title="Your balances"
      description="Read from the bank module. Amounts are converted from the chain's integer representation."
      headerAction={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refetch()}
          // Disabling during the first load prevents a second request that
          // would only race the first.
          disabled={isLoading}
        >
          Refresh
        </Button>
      }
    >
      {/* --- STATE 2: first load ------------------------------------------ */}
      {isLoading && <BalanceRowSkeleton rows={3} />}

      {/* --- STATE 3: failed, with nothing to fall back on ----------------- */}
      {!isLoading && error && balances.length === 0 && (
        <Alert
          variant="error"
          title="Could not load balances"
          message={error.message}
          hint={error.hint}
          onRetry={() => void refetch()}
        />
      )}

      {/* --- STATE 4b: loaded successfully, but the account holds nothing --- */}
      {!isLoading && !error && balances.length === 0 && (
        <EmptyState
          icon="○"
          title="This account holds no tokens yet"
          description={
            IS_MAINNET
              ? 'The address is valid — it has simply never received anything. Send it some INJ to get started.'
              : 'The address is valid — it has simply never received anything. Grab free testnet INJ from the faucet and this list will fill in within a few seconds.'
          }
          action={
            !IS_MAINNET && (
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-xs font-medium text-[#04141a] transition-colors hover:bg-[var(--color-brand-strong)] hover:text-white"
              >
                Open the testnet faucet ↗
              </a>
            )
          }
        />
      )}

      {/* --- STATE 4a: we have data --------------------------------------- */}
      {balances.length > 0 && (
        <div className="space-y-2">
          {/* A background refresh failed but we still have data. Warn quietly
              rather than replacing a working list with an error. */}
          {error && (
            <Alert
              variant="warning"
              message="Showing the last successfully loaded balances — the most recent refresh failed."
              hint={error.message}
              onRetry={() => void refetch()}
            />
          )}

          {hasNoInj && (
            <Alert
              variant="warning"
              title="No INJ for gas"
              message="This account holds tokens but no INJ, so it cannot pay transaction fees."
              hint={
                IS_MAINNET
                  ? 'Every transaction on Injective costs a small amount of INJ. Without it, the other tokens here cannot be moved.'
                  : `Every transaction costs a small amount of INJ, and the fee is always paid in INJ regardless of which token you are moving. Get some free at ${FAUCET_URL}.`
              }
            />
          )}

          {balances.map((balance) => (
            <BalanceRow
              key={balance.denom}
              balance={balance}
              highlight={balance.denom === INJ_DENOM}
            />
          ))}

          <p className="pt-1 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
            {balances.length} {balances.length === 1 ? 'token' : 'tokens'} · this
            list refreshes automatically. Expand any row to see the raw integer
            the chain actually stores.
          </p>
        </div>
      )}
    </Card>
  )
}
