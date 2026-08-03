'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { getRecentTips, subscribeToTips, formatTimeAgo, Tip } from '@/lib/tips'
import { EmptyState } from '@/components/ui/EmptyState'

export function RecentDonations() {
  const [tips, setTips] = useState<Tip[]>([])

  useEffect(() => {
    // Initial load
    setTips(getRecentTips())

    // Subscribe to new tips
    const unsubscribe = subscribeToTips(() => {
      setTips(getRecentTips())
    })

    // Update time ago every minute
    const interval = setInterval(() => {
      setTips([...getRecentTips()]) // trigger re-render to update times
    }, 60000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <Card title="Recent Tips">
      {tips.length === 0 ? (
        <EmptyState icon="✨" title="No tips yet" />
      ) : (
        <div className="space-y-4">
          {tips.map((tip) => (
            <div key={tip.id} className="flex items-start justify-between border-b border-[var(--color-line-subtle)] pb-4 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-[var(--color-content-primary)]">
                  {tip.tipper.slice(0, 8)}... <span className="font-normal text-[var(--color-content-secondary)]">tipped</span> {tip.amount}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-content-muted)]">
                  to {tip.creator}
                </p>
              </div>
              <span className="text-[10px] text-[var(--color-content-muted)]">
                {formatTimeAgo(tip.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
