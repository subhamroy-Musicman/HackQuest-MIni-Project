'use client'

/**
 * =============================================================================
 * FILE: components/wallet/WalletPickerModal.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Lets the user choose which wallet extension to connect with, and points
 * anyone without one at the download page.
 *
 * WHY IT EXISTS
 * -------------
 * A dApp cannot pick a wallet for the user. It can only detect which extensions
 * are present and offer them. That detection is the interesting part:
 *
 *   A wallet is "installed" if, and only if, it has injected an object onto
 *   `window`. There is no registry, no API, no capability query. You look for
 *   `window.keplr` and either it is there or it is not.
 *
 * Which means the honest UI has three states per wallet, not two:
 *   * installed        -> offer to connect
 *   * not installed    -> offer to install, do not pretend connecting will work
 *   * currently connecting -> disable everything
 *
 * Showing a connect button for an absent extension produces a confusing error;
 * showing an install link instead solves the user's actual problem.
 *
 * WHEN TO USE
 * -----------
 * Opened by `ConnectWalletButton`.
 *
 * EXECUTION FLOW
 * --------------
 *   user clicks "Connect Wallet"
 *        |
 *        v
 *   this modal opens; each wallet is probed with isWalletInstalled()
 *        |
 *        v
 *   user picks one -> useWallet().connect(walletId)
 *        |
 *        v
 *   extension popup -> approve -> modal closes
 *
 * RENDERED THROUGH A PORTAL
 * -------------------------
 * The overlay is portalled into `document.body` rather than rendered in place.
 * That is not a stylistic choice — an ancestor with `backdrop-filter` (our
 * frosted-glass header) becomes the containing block for `position: fixed`
 * descendants, which broke this modal into a thin strip inside the header. The
 * full explanation is inline, just above the `createPortal` call.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useWallet.ts`, `lib/wallet.ts`, `lib/constants.ts`,
 *              `components/ui/*`, `react-dom` (createPortal)
 * Depended on by: `components/wallet/ConnectWalletButton.tsx`
 * =============================================================================
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@/hooks/useWallet'
import { isWalletInstalled } from '@/lib/wallet'
import { SUPPORTED_WALLETS, CHAIN_ID, NETWORK_NAME } from '@/lib/constants'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import type { WalletId } from '@/types'

export interface WalletPickerModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Renders the wallet selection dialog.
 *
 * @param props.open    Whether the dialog is visible.
 * @param props.onClose Called when the user dismisses it.
 * @returns The dialog, or `null` when closed.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 * <WalletPickerModal open={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 *
 * WORKFLOW
 *   open
 *        |
 *        v
 *   probe each wallet for installation (in an effect — see below)
 *        |
 *        v
 *   user clicks a wallet -> connect() -> close on success
 *
 * WHY DETECTION HAPPENS IN AN EFFECT RATHER THAN DURING RENDER
 * ------------------------------------------------------------
 * `isWalletInstalled()` reads `window`, which does not exist during the server
 * render. Calling it while rendering would either crash or produce output that
 * differs between server and browser — a hydration mismatch. Running it in an
 * effect guarantees it only executes in the browser, after hydration.
 */
export function WalletPickerModal({ open, onClose }: WalletPickerModalProps) {
  const { connect, isConnecting, error, status } = useWallet()

  /**
   * Which wallets are installed. `null` means "not probed yet".
   *
   * Distinguishing "not yet checked" from "checked, absent" prevents a flash of
   * "Install Keplr" for users who do in fact have Keplr.
   */
  const [installed, setInstalled] = useState<Record<WalletId, boolean> | null>(null)

  const [pendingWalletId, setPendingWalletId] = useState<WalletId | null>(null)

  useEffect(() => {
    if (!open) return

    // Probed each time the modal opens rather than once on mount, so a user who
    // installs an extension and comes back gets an accurate answer without a
    // full page reload.
    setInstalled({
      keplr: isWalletInstalled('keplr'),
      leap: isWalletInstalled('leap'),
    })
  }, [open])

  // Close automatically once a connection succeeds. Leaving the modal open over
  // a connected wallet is a small thing that makes an app feel unfinished.
  useEffect(() => {
    if (status === 'connected' && open) {
      onClose()
    }
  }, [status, open, onClose])

  // Allow Escape to dismiss. Users expect it, and a modal that traps them is a
  // genuine accessibility failure.
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // `document` does not exist during the server render, and a portal needs a
  // real DOM node to attach to. `open` is always false on the server, so this
  // guard is belt-and-braces — but a portal without it is a classic SSR crash.
  if (!open || typeof document === 'undefined') return null

  const handleSelect = async (walletId: WalletId) => {
    setPendingWalletId(walletId)
    await connect(walletId)
    setPendingWalletId(null)
  }

  /* ---------------------------------------------------------------------------
   * WHY THIS IS RENDERED THROUGH A PORTAL — A GENUINELY SURPRISING CSS RULE
   * ---------------------------------------------------------------------------
   * `position: fixed` is normally positioned against the viewport. There is one
   * big exception, and this modal walked straight into it:
   *
   *   If ANY ancestor has a `transform`, `filter`, `backdrop-filter`,
   *   `perspective`, `contain` or `will-change`, that ancestor becomes the
   *   CONTAINING BLOCK for its fixed-position descendants. `fixed` then means
   *   "fixed relative to that ancestor" instead of "fixed to the viewport".
   *
   * This modal is rendered by <ConnectWalletButton>, which lives inside
   * <Header> — and the header has `backdrop-blur-md` for its frosted-glass
   * effect. That single utility made the header the containing block, so
   * `fixed inset-0` filled THE HEADER: a ~55px strip across the top of the
   * page. The backdrop only dimmed that strip, and the panel was squashed into
   * it. The same trap catches `z-index` too — the modal's `z-50` was scoped
   * inside the header's stacking context rather than competing page-wide.
   *
   * `createPortal` renders the markup into `document.body` instead, escaping
   * the header entirely, while keeping the component exactly where it belongs
   * in the React tree — state, context and event bubbling all still work
   * normally. React events even propagate through the portal to the React
   * parent, which is why the picker still closes correctly.
   *
   * The lesson worth keeping: any overlay that must cover the viewport belongs
   * in a portal. You cannot rely on no ancestor ever gaining a transform or a
   * filter — and when one does, the breakage looks like a layout bug rather
   * than the CSS containing-block rule that it actually is.
   * ------------------------------------------------------------------------- */
  return createPortal(
    <div
      // `items-center justify-center` centres the panel on every screen size.
      //
      // `backdrop-blur-md` blurs whatever is BEHIND this element rather than the
      // element itself — the page content shows through as a soft wash. Paired
      // with `bg-black/60`, the dashboard stays faintly visible, so the modal
      // reads as layered on top of the page rather than as a new page. The
      // translucency is doing real work: it keeps the user oriented.
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      // Clicking the backdrop closes the modal — another expected behaviour.
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-picker-title"
    >
      <div
        // Without this, a click anywhere inside the panel would bubble to the
        // backdrop handler above and close the modal the user is trying to use.
        onClick={(event) => event.stopPropagation()}
        // `max-h-full` + `overflow-y-auto` matter specifically BECAUSE the panel
        // is centred. A centred element grows from the middle outwards, so on a
        // short viewport — a phone in landscape, or a small laptop with devtools
        // open — a tall panel would run off the top and bottom at once with no
        // way to reach either end. Capping the height and letting the panel
        // scroll internally keeps every option reachable.
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line-subtle)] px-5 py-4">
          <div>
            <h2
              id="wallet-picker-title"
              className="text-sm font-semibold text-[var(--color-content-primary)]"
            >
              Connect a wallet
            </h2>
            <p className="mt-1 text-xs text-[var(--color-content-secondary)]">
              Connecting shares only your public address. Your private key never
              leaves the extension.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-[var(--color-content-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-content-primary)]"
          >
            ✕
          </button>
        </header>

        <div className="space-y-2 p-5">
          {SUPPORTED_WALLETS.map((wallet) => {
            // `installed === null` means detection has not run yet. Treat it as
            // "available" so the button is not briefly disabled for everyone.
            const isAvailable = installed === null || installed[wallet.id]
            const isPending = pendingWalletId === wallet.id

            if (!isAvailable) {
              // Not installed. Offer the thing that actually helps — a download
              // link — instead of a button that would only produce an error.
              return (
                <a
                  key={wallet.id}
                  href={wallet.downloadUrl}
                  target="_blank"
                  // `noopener` prevents the opened page from reaching back into
                  // this one via `window.opener`. Always pair it with
                  // `target="_blank"`.
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-[var(--color-line-strong)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-overlay)]"
                >
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-content-primary)]">
                      {wallet.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--color-content-muted)]">
                      Not installed — opens the download page
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-xs text-[var(--color-content-muted)]"
                  >
                    ↗
                  </span>
                </a>
              )
            }

            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => void handleSelect(wallet.id)}
                // Disable ALL wallet buttons while any connection is in flight.
                // Two simultaneous popups is a confusing state with no upside.
                disabled={isConnecting}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-overlay)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--color-content-primary)]">
                    {wallet.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-content-muted)]">
                    {wallet.description}
                  </span>
                </span>

                {isPending ? (
                  <Spinner size="sm" label={`Connecting to ${wallet.name}`} />
                ) : (
                  <span
                    aria-hidden="true"
                    className="text-xs text-[var(--color-content-muted)]"
                  >
                    →
                  </span>
                )}
              </button>
            )
          })}

          {/* Errors render inside the modal, where the user is looking, rather
              than behind it. */}
          {error && status === 'errored' && (
            <Alert variant="error" message={error} className="mt-3" />
          )}

          <p className="pt-2 text-center text-[11px] text-[var(--color-content-muted)]">
            Connecting to{' '}
            <span className="font-mono text-[var(--color-content-secondary)]">
              {CHAIN_ID}
            </span>{' '}
            ({NETWORK_NAME})
          </p>
        </div>
      </div>
    </div>,
    // The portal target. `document.body` has no transform or filter on it, so
    // `position: fixed` behaves the way everyone expects again.
    document.body,
  )
}
