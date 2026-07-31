'use client'

/**
 * =============================================================================
 * FILE: components/wallet/ConnectWalletButton.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The header control: shows "Connect Wallet" when disconnected and the
 * truncated address with a disconnect action when connected.
 *
 * WHY IT EXISTS
 * -------------
 * It is the entry point to everything else in the app, and it is the component
 * most likely to be copied into someone's own project. So it is written to
 * handle the states people forget:
 *
 *   * hydration — the server has no idea whether a wallet exists (see below)
 *   * connecting — the button must be disabled, or two popups appear
 *   * connected — show WHO is connected, not just THAT someone is
 *   * errored — recoverable; clicking again should retry
 *
 * THE HYDRATION PROBLEM, CONCRETELY
 * ---------------------------------
 * On the server this component renders "Connect Wallet", because there is no
 * `window` and no wallet. In the browser, a returning user may already be
 * connected, so it would render their address instead. React compares the two
 * and throws a hydration mismatch.
 *
 * `useIsMounted()` fixes it by rendering a neutral placeholder until after
 * hydration completes. See `hooks/useIsMounted.ts` for the full explanation.
 *
 * WHEN TO USE
 * -----------
 * Once, in the header.
 *
 * EXECUTION FLOW
 * --------------
 *   not mounted -> skeleton
 *        |
 *        v
 *   disconnected -> "Connect Wallet" -> opens WalletPickerModal
 *        |
 *        v
 *   connecting -> disabled, "Connecting…"
 *        |
 *        v
 *   connected -> address + disconnect
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useWallet.ts`, `hooks/useIsMounted.ts`,
 *              `components/wallet/WalletPickerModal.tsx`, `components/ui/*`,
 *              `utils/format.ts`
 * Depended on by: `components/layout/Header.tsx`
 * =============================================================================
 */

import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useIsMounted } from '@/hooks/useIsMounted'
import { WalletPickerModal } from './WalletPickerModal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { truncateAddress } from '@/utils/format'

/**
 * Renders the connect / connected control.
 *
 * @returns A button, plus the wallet picker modal when open.
 *
 * @example
 * ```tsx
 * <header>
 *   <ConnectWalletButton />
 * </header>
 * ```
 *
 * WORKFLOW
 *   useIsMounted() false -> render a skeleton of the same size
 *        |
 *        v
 *   isConnected -> address chip + "Disconnect"
 *        |
 *        v
 *   otherwise   -> "Connect Wallet", which opens the modal
 */
export function ConnectWalletButton() {
  const isMounted = useIsMounted()
  const { isConnected, isConnecting, account, disconnect } = useWallet()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // The placeholder is deliberately the same size as the real button. A
  // placeholder of a different size causes the header to jump when it resolves,
  // which is exactly the layout shift skeletons exist to prevent.
  if (!isMounted) {
    return <Skeleton className="h-10 w-36" />
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-overlay)] px-3 py-2 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          <span className="font-mono text-xs text-[var(--color-content-primary)]">
            {truncateAddress(account.injectiveAddress, 9, 5)}
          </span>
        </div>

        <Button variant="secondary" size="md" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setIsModalOpen(true)}
        isLoading={isConnecting}
        loadingText="Connecting…"
      >
        Connect Wallet
      </Button>

      <WalletPickerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
