'use client'

/**
 * =============================================================================
 * FILE: components/wallet/AccountPanel.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Displays the connected account: its label, both address formats, and a link
 * to the block explorer.
 *
 * WHY IT EXISTS
 * -------------
 * To make one specific concept concrete: **an Injective account has two
 * addresses, and they are the same account.**
 *
 *   inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm   <- bech32, Cosmos-native
 *   0x6881AF7bFA5b5875F818e380B8CB74133596CD6E   <- hex, Ethereum-compatible
 *
 * Those two strings encode the identical 20 bytes. Injective supports both
 * because it is a Cosmos chain with full EVM compatibility, so the same key
 * works in Keplr and in MetaMask. Cosmos tooling and explorers want `inj1…`;
 * EVM tooling wants `0x…`.
 *
 * Beginners routinely believe these are two different wallets and go looking
 * for funds "in the other one". Showing both side by side, labelled, prevents
 * that entire class of confusion.
 *
 * WHEN TO USE
 * -----------
 * On the dashboard, once a wallet is connected.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useWallet.ts`, `lib/helpers.ts`, `utils/format.ts`,
 *              `components/ui/*`
 * Depended on by: `app/page.tsx`
 * =============================================================================
 */

import { useWallet } from '@/hooks/useWallet'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { getExplorerAccountUrl } from '@/lib/helpers'
import { truncateAddress } from '@/utils/format'

/**
 * One labelled address row, with copy.
 *
 * @param props.label       What this address is, e.g. `"Injective (bech32)"`.
 * @param props.address     The full address.
 * @param props.description One line on when this format is used.
 * @returns A row.
 *
 * WHY A LOCAL SUB-COMPONENT INSTEAD OF DUPLICATING THE MARKUP
 * -----------------------------------------------------------
 * The row is used twice, in this file only. Extracting it removes the
 * duplication without adding a file that nothing else will ever import.
 * Not every reusable fragment needs to become a public component — proximity is
 * a feature.
 */
function AddressRow({
  label,
  address,
  description,
}: {
  label: string
  address: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-[var(--color-content-muted)] uppercase">
          {label}
        </span>
        <CopyButton value={address} label={`Copy ${label} address`} />
      </div>

      {/* Truncated for layout, copied in full by the button above. The `sm:`
          breakpoint shows more characters where there is room. */}
      <p className="mt-1.5 font-mono text-xs break-all text-[var(--color-content-primary)]">
        <span className="sm:hidden">{truncateAddress(address, 12, 8)}</span>
        <span className="hidden sm:inline">{address}</span>
      </p>

      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
        {description}
      </p>
    </div>
  )
}

/**
 * Renders the connected account panel.
 *
 * @returns A `Card` showing the account, or an empty state when disconnected.
 *
 * @example
 * ```tsx
 * <AccountPanel />
 * ```
 *
 * WORKFLOW
 *   useWallet()
 *        |
 *        +-- not connected -> EmptyState explaining what connecting does
 *        |
 *        +-- connected -> account name, both addresses, explorer link
 */
export function AccountPanel() {
  const { isConnected, account } = useWallet()

  if (!isConnected || !account) {
    return (
      <Card
        title="Your account"
        description="Who you are on Injective, once a wallet is connected."
      >
        <EmptyState
          icon="⬡"
          title="No wallet connected"
          description="Connect Keplr or Leap to see your address. Connecting shares only your public address — it grants this site no ability to move funds. Every transaction still needs your explicit approval."
        />
      </Card>
    )
  }

  return (
    <Card
      title="Your account"
      description="One key, two address formats. Both refer to the same account."
      headerAction={
        <Badge variant="success" withDot>
          {account.walletId === 'keplr' ? 'Keplr' : 'Leap'}
        </Badge>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-[var(--color-content-muted)] uppercase">
              Account name
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-content-primary)]">
              {account.name}
            </p>
          </div>

          <a
            href={getExplorerAccountUrl(account.injectiveAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-xs text-[var(--color-content-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-content-primary)]"
          >
            Explorer ↗
          </a>
        </div>

        <AddressRow
          label="Injective (bech32)"
          address={account.injectiveAddress}
          description="Use this to receive tokens on Injective and on any Cosmos chain via IBC. This is the address block explorers index."
        />

        <AddressRow
          label="Ethereum (hex)"
          address={account.ethereumAddress}
          description="The same account, encoded the Ethereum way. Used by MetaMask and EVM tooling. It is not a second wallet — sending here on Ethereum mainnet would NOT reach you on Injective."
        />
      </div>
    </Card>
  )
}
