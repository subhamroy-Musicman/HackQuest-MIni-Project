'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import { useBalances } from '@/hooks/useBalances'
import { useSendToken } from '@/hooks/useSendToken'
import { validateInjectiveAddress, validateAmount } from '@/utils/validation'
import { KNOWN_TOKENS } from '@/lib/constants'
import { TransactionReceipt } from '@/components/transfer/TransactionReceipt'
import confetti from 'canvas-confetti'

export function CustomDonationPanel() {
  const { account } = useWallet()
  const { getBalanceFor } = useBalances(account?.injectiveAddress)
  const { send, isSending, result, reset } = useSendToken()

  const [selectedTokenKey, setSelectedTokenKey] = useState('inj')
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const selectedToken = KNOWN_TOKENS[selectedTokenKey] || KNOWN_TOKENS['inj']
  const availableBalance = getBalanceFor(selectedToken.denom)?.formattedAmount ?? '0'

  const addressCheck = validateInjectiveAddress(address)
  const amountCheck = validateAmount(amount, availableBalance, { maxDecimals: selectedToken.decimals })

  const isValid =
    address && amount && addressCheck.valid && amountCheck.valid && !isSending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    await send({
      recipientAddress: address,
      humanAmount: amount,
      denom: selectedToken.denom,
      decimals: selectedToken.decimals,
      availableBalance: availableBalance
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
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-content-secondary)]">
              Amount
            </label>
            <div className="flex gap-1 bg-[var(--color-surface-overlay)] border border-[var(--color-line-subtle)] rounded-md p-1">
              {Object.entries(KNOWN_TOKENS).map(([key, token]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTokenKey(key)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors uppercase ${
                    selectedTokenKey === key
                      ? 'bg-[var(--color-surface-base)] text-[var(--color-brand)] shadow-sm'
                      : 'text-[var(--color-content-muted)] hover:text-[var(--color-content-primary)]'
                  }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-1.5 text-right text-[10px] text-[var(--color-content-secondary)]">
            Balance: {availableBalance} {selectedToken.symbol}
          </div>
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
                {selectedToken.symbol}
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
