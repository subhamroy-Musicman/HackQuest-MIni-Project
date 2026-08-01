'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import { useBalances } from '@/hooks/useBalances'
import { useSendInj } from '@/hooks/useSendInj'
import { validateInjectiveAddress, validateAmount } from '@/utils/validation'
import { TransactionReceipt } from '@/components/transfer/TransactionReceipt'
import confetti from 'canvas-confetti'

export function CustomDonationPanel() {
  const { account } = useWallet()
  const { injBalance } = useBalances(account?.injectiveAddress)
  const { send, isSending, result, reset } = useSendInj()

  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const addressCheck = validateInjectiveAddress(address)
  const amountCheck = validateAmount(amount, injBalance)

  const isValid =
    address && amount && addressCheck.valid && amountCheck.valid && !isSending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    await send({
      recipientAddress: address,
      humanAmount: amount,
      availableBalance: injBalance
    })
    
    // Trigger confetti on success
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00E5FF', '#6D5DF6', '#FFFFFF']
    })
  }

  if (result) {
    return (
      <Card title="Custom Tip Sent!">
        <div className="space-y-4">
          <TransactionReceipt result={result} onDismiss={reset} />
          <Button variant="secondary" className="w-full" onClick={reset}>
            Send Another Tip
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Custom Tip">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-content-secondary)]">
            Recipient Address
          </label>
          <input
            type="text"
            placeholder="inj1..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-content-primary)] focus:border-[var(--color-brand)] focus:outline-none"
          />
          {address && !addressCheck.valid && (
            <p className="mt-1.5 text-xs text-[var(--color-error)]">
              {addressCheck.error}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 flex justify-between text-xs font-semibold text-[var(--color-content-secondary)]">
            <span>Amount (INJ)</span>
            <span>Balance: {Number(injBalance).toFixed(4)}</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] px-3 py-2 pr-12 text-sm text-[var(--color-content-primary)] focus:border-[var(--color-brand)] focus:outline-none"
            />
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="text-xs font-medium text-[var(--color-content-muted)]">
                INJ
              </span>
            </div>
          </div>
          {amount && !amountCheck.valid && (
            <p className="mt-1.5 text-xs text-[var(--color-error)]">
              {amountCheck.error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!isValid || isSending}
        >
          {isSending ? 'Sending Tip...' : 'Send Tip'}
        </Button>
      </form>
    </Card>
  )
}
