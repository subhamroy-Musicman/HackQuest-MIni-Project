'use client'

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { Creator } from '@/lib/creators'
import { useWallet } from '@/hooks/useWallet'
import { useBalances } from '@/hooks/useBalances'
import { addNotification } from '@/lib/notifications'
import { useSendToken } from '@/hooks/useSendToken'
import { TransactionStepper } from '@/components/transfer/TransactionStepper'
import { TransactionReceipt } from '@/components/transfer/TransactionReceipt'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { validateAmount } from '@/utils/validation'
import { getTransactionFee } from '@/lib/helpers'
import { KNOWN_TOKENS } from '@/lib/constants'
import { isDisplayableError } from '@/lib/errors'
import { addTip } from '@/lib/tips'
import confetti from 'canvas-confetti'

interface DonationModalProps {
  creator: Creator
  onClose: () => void
  onSuccess?: (amount: string) => void
}

const PRESET_AMOUNTS = ['0.01', '0.05', '0.1', '0.5', '1']

export function DonationModal({ creator, onClose, onSuccess }: DonationModalProps) {
  const { account } = useWallet()
  const { getBalanceFor, refetch: refetchBalances } = useBalances(account?.injectiveAddress)

  const [selectedTokenKey, setSelectedTokenKey] = useState('inj')
  const [amount, setAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [memo, setMemo] = useState(`Tip for ${creator.name} via NeonTip`)
  
  const selectedToken = KNOWN_TOKENS[selectedTokenKey] || KNOWN_TOKENS['inj']
  const availableBalance = getBalanceFor(selectedToken.denom)?.formattedAmount ?? '0'
  
  const { stage, isSending, result, error, send, reset } = useSendToken({
    onSuccess: () => {
      refetchBalances()
      addTip({
        tipper: account?.injectiveAddress || 'Anonymous',
        amount: `${amount} ${selectedToken.symbol}`,
        creator: creator.name
      })
      addNotification('Tip Sent Successfully! 🚀', `You just tipped ${amount} ${selectedToken.symbol} to ${creator.name}`)
      onSuccess?.(amount)
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#00FFA3', '#6D5DF6', '#FFFFFF']
      })
    },
  })

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  const amountCheck = useMemo(
    () => validateAmount(amount, availableBalance, { maxDecimals: selectedToken.decimals }),
    [amount, availableBalance, selectedToken.decimals],
  )
  const { humanReadableFee } = useMemo(() => getTransactionFee(), [])

  const canSubmit = amountCheck.valid && !isSending

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault()
    if (!canSubmit) return

    void send({
      recipientAddress: creator.address,
      humanAmount: amount.trim(),
      denom: selectedToken.denom,
      decimals: selectedToken.decimals,
      memo: memo.trim() || undefined,
      availableBalance: availableBalance,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isSending && onClose()}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md">
        <Card 
          title={`Support ${creator.name}`} 
          headerAction={
            <button 
              onClick={onClose}
              disabled={isSending}
              className="text-[var(--color-content-muted)] hover:text-white transition-colors"
            >
              ✕
            </button>
          }
        >
          {result ? (
            <div className="space-y-6">
              <TransactionReceipt
                result={result}
                onDismiss={reset}
              />
              <Button onClick={onClose} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          ) : stage !== 'idle' ? (
            <div className="space-y-6">
              <TransactionStepper stage={stage} />
              {error && isDisplayableError(error) && (
                <Alert
                  variant="error"
                  title="Donation failed"
                  message={error.message}
                  onRetry={reset}
                />
              )}
              {error && (
                <Button onClick={reset} variant="secondary" className="w-full">
                  Try Again
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Creator Info */}
              <div className="flex items-center gap-4 rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#6D5DF6] shadow-lg">
                  <Image src={creator.avatar} alt={creator.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-content-primary)] truncate">
                    {creator.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-content-muted)] font-mono truncate">
                    {creator.address.slice(0, 8)}...{creator.address.slice(-4)}
                  </p>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium tracking-wide text-[var(--color-content-muted)] uppercase">
                    Select Amount
                  </label>
                  
                  {/* Token Selector */}
                  <div className="flex gap-1 bg-[var(--color-surface-overlay)] border border-[var(--color-line-subtle)] rounded-lg p-1">
                    {Object.entries(KNOWN_TOKENS).map(([key, token]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedTokenKey(key)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors uppercase ${
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
                <div className="flex justify-between items-center text-xs text-[var(--color-content-secondary)]">
                  <span>Balance: {availableBalance} {selectedToken.symbol}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmount(preset)
                        setIsCustom(false)
                      }}
                      className={`relative overflow-hidden rounded-xl border p-3 text-center transition-all ${
                        amount === preset && !isCustom
                          ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:border-[#00E5FF] dark:bg-[#00E5FF]/10 dark:text-[#00E5FF]'
                          : 'border-[var(--color-line-subtle)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-content-primary)]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAmount('')
                      setIsCustom(true)
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isCustom
                        ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:border-[#00E5FF] dark:bg-[#00E5FF]/10 dark:text-[#00E5FF]'
                        : 'border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-content-primary)]'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Custom Amount Input */}
              {isCustom && (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full rounded-lg border bg-[var(--color-surface-overlay)] px-4 py-3 font-mono text-sm text-[var(--color-content-primary)] placeholder-[var(--color-content-muted)] outline-none transition-colors focus:border-[var(--color-brand)] ${
                        amount && !amountCheck.valid
                          ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                          : 'border-[var(--color-line-strong)]'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-content-muted)]">
                      {selectedToken.symbol}
                    </span>
                  </div>
                  {amount && !amountCheck.valid && (
                    <p className="mt-2 text-xs text-[var(--color-error)]">
                      {amountCheck.error}
                    </p>
                  )}
                </div>
              )}

              {/* Personal Message */}
              <div>
                <label className="text-[11px] font-medium tracking-wide text-[var(--color-content-muted)] uppercase mb-2 block">
                  Add a message (Public)
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={128}
                  className="w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-overlay)] px-4 py-3 text-sm text-[var(--color-content-primary)] placeholder-[var(--color-content-muted)] outline-none transition-colors focus:border-[var(--color-brand)]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] text-white shadow-md hover:from-[#00FFA3] hover:to-[#00E5FF] transition-all disabled:opacity-50 disabled:hover:from-[#00E5FF] disabled:hover:to-[#6D5DF6] dark:from-[#00E5FF] dark:to-[#6D5DF6] dark:hover:from-[#00FFA3] dark:hover:to-[#00E5FF] dark:disabled:hover:from-[#00E5FF] dark:disabled:hover:to-[#6D5DF6]"
                >
                  Send Donation
                </Button>
                <p className="mt-3 text-center text-[10px] text-[var(--color-content-muted)]">
                  Network fee: ~{humanReadableFee} INJ. Transactions are final and cannot be reversed.
                </p>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
