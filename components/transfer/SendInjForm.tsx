'use client'

/**
 * =============================================================================
 * FILE: components/transfer/SendInjForm.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The complete end-to-end blockchain interaction: enter a recipient and an
 * amount, sign in your wallet, and watch the transfer land on-chain.
 *
 * WHY IT EXISTS
 * -------------
 * Everything else in this project is preparation for this form. It is where all
 * the concepts meet:
 *
 *   * validation before the network is touched      (utils/validation.ts)
 *   * unit conversion, human -> base units          (lib/helpers.ts)
 *   * message construction                          (lib/transactions.ts)
 *   * wallet signing                                (lib/wallet.ts)
 *   * broadcast and confirmation                    (app/api/tx/broadcast)
 *   * the lifecycle, made visible                   (TransactionStepper)
 *   * errors that teach                             (lib/errors.ts + Alert)
 *
 * A design decision worth calling out: **live validation with the button
 * disabled until the input is valid**. On a normal web form that is a nicety.
 * Here it prevents an irreversible mistake — a transfer to a mistyped address
 * cannot be cancelled, refunded or reversed by anybody, ever. Validation is the
 * last safety rail, and it should be loud.
 *
 * WHEN TO USE
 * -----------
 * On the dashboard, below the balances.
 *
 * EXECUTION FLOW
 * --------------
 *   user types      -> validate on every keystroke -> enable/disable submit
 *        |
 *        v
 *   submit          -> useSendInj().send()
 *        |
 *        v
 *   lib/transactions.ts: prepare -> sign -> broadcast -> confirm
 *        |
 *        v
 *   TransactionStepper follows along; receipt or error at the end
 *        |
 *        v
 *   balances refresh
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `hooks/useWallet.ts`, `hooks/useBalances.ts`,
 *              `hooks/useSendInj.ts`, `utils/validation.ts`, `lib/helpers.ts`,
 *              `lib/constants.ts`, `components/ui/*`, sibling components
 * Depended on by: `app/page.tsx`
 * =============================================================================
 */

import { useMemo, useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useBalances } from '@/hooks/useBalances'
import { useSendInj } from '@/hooks/useSendInj'
import { TransactionStepper } from './TransactionStepper'
import { TransactionReceipt } from './TransactionReceipt'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { validateAmount, validateInjectiveAddress } from '@/utils/validation'
import { getTransactionFee } from '@/lib/helpers'
import { FAUCET_URL, INJ_DECIMALS, IS_MAINNET } from '@/lib/constants'
import { ErrorCode, isDisplayableError } from '@/lib/errors'
import { formatAmount } from '@/utils/format'

/**
 * Renders the send-INJ form.
 *
 * @returns A `Card` containing the form, the lifecycle stepper and the result.
 *
 * @example
 * ```tsx
 * <SendInjForm />
 * ```
 *
 * WHY VALIDATION RUNS ON EVERY RENDER RATHER THAN ON SUBMIT
 * ---------------------------------------------------------
 * The checks are pure functions over the current input, so recomputing them is
 * effectively free and they can never be out of sync with what is on screen.
 * `useMemo` avoids re-running them when unrelated state changes.
 *
 * The alternative — validating in the submit handler — means the user only
 * learns about a problem after committing to the action, which for an
 * irreversible operation is exactly the wrong moment.
 */
export function SendInjForm() {
  const { account, isConnected } = useWallet()
  const { injBalance, refetch: refetchBalances } = useBalances(
    account?.injectiveAddress,
  )

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  // `touched` is what stops the form shouting at a user who has not typed
  // anything yet. Showing "Enter a recipient address" in red before the field
  // has ever been focused is hostile; showing it after they type and delete is
  // helpful.
  const [touched, setTouched] = useState({ recipient: false, amount: false })

  const { stage, isSending, result, error, send, reset } = useSendInj({
    // Refresh balances once the transfer is confirmed, so the user sees the new
    // number without reaching for the refresh button.
    onSuccess: () => void refetchBalances(),
  })

  const recipientCheck = useMemo(
    () => validateInjectiveAddress(recipient),
    [recipient],
  )

  const amountCheck = useMemo(
    () =>
      validateAmount(amount, injBalance, {
        maxDecimals: INJ_DECIMALS,
      }),
    [amount, injBalance],
  )

  // Computed once and displayed before the user commits, so the cost of the
  // action is known in advance rather than discovered in the wallet popup.
  const { humanReadableFee } = useMemo(() => getTransactionFee(), [])

  const canSubmit =
    isConnected && recipientCheck.valid && amountCheck.valid && !isSending

  /* --- Not connected ----------------------------------------------------- */
  if (!isConnected || !account) {
    return (
      <Card
        title="Send INJ"
        description="The complete write path: build a message, sign it, broadcast it, watch it confirm."
      >
        <EmptyState
          icon="→"
          title="Connect a wallet to send a transaction"
          description="Reading the chain needs nothing. Writing to it needs a signature, and only your wallet can produce one."
        />
      </Card>
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    // Without this the browser performs a full page reload and the transaction
    // never happens — the single most common React form mistake.
    event.preventDefault()

    if (!canSubmit) return

    void send({
      recipientAddress: recipient.trim(),
      humanAmount: amount.trim(),
      memo: memo.trim() || undefined,
      availableBalance: injBalance,
    })
  }

  /** Fills the amount with everything minus a gas reserve. */
  const handleUseMax = () => {
    const balance = Number.parseFloat(injBalance)
    if (!Number.isFinite(balance)) return

    // Deliberately NOT the full balance. The fee is paid in INJ out of this
    // same balance, so a true "max" would leave nothing to pay it with and the
    // chain would reject the transaction. 0.01 is generous — the actual fee is
    // around 0.0000352 — because a rejected transfer is far more annoying than
    // a slightly conservative maximum.
    const spendable = Math.max(0, balance - 0.01)
    setAmount(spendable.toFixed(6))
    setTouched((previous) => ({ ...previous, amount: true }))
  }

  return (
    <Card
      title="Send INJ"
      description="The complete write path: build a message, sign it in your wallet, broadcast it, watch it confirm."
    >
      <div className="space-y-4">
        {IS_MAINNET && (
          <Alert
            variant="warning"
            title="You are on mainnet"
            message="This will move real INJ. Transfers cannot be reversed by anyone, including Injective."
            hint="For learning, set NEXT_PUBLIC_INJECTIVE_NETWORK=testnet in .env.local and restart the dev server."
          />
        )}

        {/* The receipt replaces the form after a success, so the outcome is the
            only thing on screen and cannot be missed. */}
        {result ? (
          <TransactionReceipt
            result={result}
            onDismiss={() => {
              reset()
              setRecipient('')
              setAmount('')
              setMemo('')
              setTouched({ recipient: false, amount: false })
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- Recipient ------------------------------------------------ */}
            <div>
              <label
                htmlFor="recipient"
                className="block text-xs font-medium text-[var(--color-content-secondary)]"
              >
                Recipient address
              </label>

              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                onBlur={() =>
                  setTouched((previous) => ({ ...previous, recipient: true }))
                }
                placeholder="inj1…"
                // Address fields must never be autocorrected, capitalised or
                // spell-checked. A browser "helpfully" capitalising a bech32
                // address would make it invalid.
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isSending}
                aria-invalid={touched.recipient && !recipientCheck.valid}
                aria-describedby="recipient-help"
                className="mt-1.5 w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-base)] px-3 py-2.5 font-mono text-sm text-[var(--color-content-primary)] placeholder:text-[var(--color-content-muted)] focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-50"
              />

              <p id="recipient-help" className="mt-1.5 text-[11px] leading-relaxed">
                {touched.recipient && !recipientCheck.valid ? (
                  <span className="text-[var(--color-danger)]">
                    {recipientCheck.error}
                  </span>
                ) : (
                  <span className="text-[var(--color-content-muted)]">
                    Try your own address to send to yourself — a completely valid
                    transaction, and the safest way to test.
                  </span>
                )}
              </p>

              {/* A one-click way to test safely. Sending to yourself is a real
                  on-chain transaction that costs only gas. */}
              {account && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipient(account.injectiveAddress)
                    setTouched((previous) => ({ ...previous, recipient: true }))
                  }}
                  disabled={isSending}
                  className="mt-1 text-[11px] text-[var(--color-brand)] hover:underline disabled:opacity-50"
                >
                  Use my own address
                </button>
              )}
            </div>

            {/* --- Amount --------------------------------------------------- */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="amount"
                  className="block text-xs font-medium text-[var(--color-content-secondary)]"
                >
                  Amount (INJ)
                </label>
                <span className="text-[11px] text-[var(--color-content-muted)]">
                  Balance {formatAmount(injBalance)} INJ
                </span>
              </div>

              <div className="mt-1.5 flex gap-2">
                <input
                  id="amount"
                  // `inputMode="decimal"` shows a numeric keypad on mobile while
                  // keeping `type="text"`, which avoids the scroll-wheel and
                  // spinner behaviour of `type="number"` — genuinely dangerous
                  // on a field that moves money.
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={() =>
                    setTouched((previous) => ({ ...previous, amount: true }))
                  }
                  placeholder="0.1"
                  autoComplete="off"
                  disabled={isSending}
                  aria-invalid={touched.amount && !amountCheck.valid}
                  aria-describedby="amount-help"
                  className="w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-base)] px-3 py-2.5 font-mono text-sm text-[var(--color-content-primary)] placeholder:text-[var(--color-content-muted)] focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-50"
                />

                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleUseMax}
                  disabled={isSending}
                >
                  Max
                </Button>
              </div>

              <p id="amount-help" className="mt-1.5 text-[11px] leading-relaxed">
                {touched.amount && !amountCheck.valid ? (
                  <span className="text-[var(--color-danger)]">
                    {amountCheck.error}
                  </span>
                ) : (
                  <span className="text-[var(--color-content-muted)]">
                    Network fee ≈ {humanReadableFee} INJ, paid in INJ from this
                    same balance — which is why &ldquo;Max&rdquo; leaves a little
                    behind.
                  </span>
                )}
              </p>
            </div>

            {/* --- Memo ----------------------------------------------------- */}
            <div>
              <label
                htmlFor="memo"
                className="block text-xs font-medium text-[var(--color-content-secondary)]"
              >
                Memo{' '}
                <span className="font-normal text-[var(--color-content-muted)]">
                  (optional)
                </span>
              </label>

              <input
                id="memo"
                type="text"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="workshop demo"
                maxLength={256}
                disabled={isSending}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-base)] px-3 py-2.5 text-sm text-[var(--color-content-primary)] placeholder:text-[var(--color-content-muted)] focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-50"
              />

              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
                Stored on-chain in plain text, permanently, readable by anyone.
                Exchanges use memos to route deposits. Never put anything private
                in one.
              </p>
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
              {isSending ? 'Sending…' : 'Send INJ'}
            </Button>
          </form>
        )}

        {/* The lifecycle, visible while it happens. */}
        {stage !== 'idle' && stage !== 'success' && (
          <TransactionStepper stage={stage} />
        )}

        {/* Errors. A user rejection is filtered out by `isDisplayableError` —
            declining a wallet popup is a normal choice, not a malfunction. */}
        {error && isDisplayableError(error) && (
          <Alert
            variant="error"
            title="Transaction failed"
            message={error.message}
            hint={error.hint}
          >
            {/* Only the insufficient-balance case gets a faucet button. This is
                exactly why `AppError` carries a machine-readable code rather
                than only a message. */}
            {error.code === ErrorCode.INSUFFICIENT_BALANCE && !IS_MAINNET && (
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-xs font-medium text-[#04141a] transition-colors hover:bg-[var(--color-brand-strong)] hover:text-white"
              >
                Get free testnet INJ ↗
              </a>
            )}
          </Alert>
        )}

        {/* A rejection is acknowledged neutrally rather than as a failure. */}
        {error && error.code === ErrorCode.USER_REJECTED && (
          <Alert variant="info" message={error.message} hint={error.hint} />
        )}
      </div>
    </Card>
  )
}
