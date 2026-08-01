'use client'

import { useState, useEffect } from 'react'
import { Creator } from '@/lib/creators'
import { CreatorCard } from './CreatorCard'
import { DonationModal } from './DonationModal'
import { AddCreatorModal } from './AddCreatorModal'
import { useCreators } from '@/hooks/useCreators'
import { getRecentTips, subscribeToTips } from '@/lib/tips'
import { useSearchParams } from 'next/navigation'

export function CreatorDashboard() {
  const { creators, addCreator } = useCreators()
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [isAddingCreator, setIsAddingCreator] = useState(false)
  const [activeTippers, setActiveTippers] = useState(0)
  
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get('q')?.toLowerCase() || ''

  useEffect(() => {
    const updateTippers = () => {
      const tips = getRecentTips()
      const uniqueTippers = new Set(tips.map(t => t.tipper))
      setActiveTippers(uniqueTippers.size)
    }
    updateTippers()
    return subscribeToTips(updateTippers)
  }, [])

  const totalTipped = creators.reduce((sum, c) => sum + Number(c.totalRaised || 0), 0)

  // Filter creators based on search query
  const filteredCreators = creators.filter(creator => {
    if (!searchQuery) return true
    return (
      creator.name.toLowerCase().includes(searchQuery) ||
      creator.address.toLowerCase().includes(searchQuery) ||
      (creator.bio && creator.bio.toLowerCase().includes(searchQuery))
    )
  })

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-content-primary)]">
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Creator Directory'}
        </h2>
        <button
          onClick={() => setIsAddingCreator(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/20"
        >
          <span>+ Add Creator</span>
        </button>
      </div>

      {/* Platform Stats Row to fill the middle space */}
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-6 flex flex-col justify-center text-center">
            <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Total Creators</p>
            <p className="text-3xl font-bold text-[var(--color-content-primary)]">{creators.length}</p>
          </div>
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Total Value Tipped</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-[#00E5FF] dark:to-[#00FFA3] bg-clip-text text-transparent">
              {totalTipped.toFixed(1)} <span className="text-[var(--color-content-primary)]">INJ</span>
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-6 flex flex-col justify-center text-center">
            <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Active Tippers</p>
            <p className="text-3xl font-bold text-[var(--color-content-primary)]">{activeTippers}</p>
          </div>
        </div>
      )}

      {filteredCreators.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onDonate={setSelectedCreator}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--color-content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-[var(--color-content-primary)]">No creators found</h3>
          <p className="mt-2 text-sm text-[var(--color-content-secondary)]">We couldn&apos;t find anyone matching &quot;{searchQuery}&quot;. Try a different name or wallet address.</p>
        </div>
      )}

      {selectedCreator && (
        <DonationModal
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSuccess={() => {
            setSelectedCreator(null)
            window.dispatchEvent(new Event('novatip_creators_updated'))
          }}
        />
      )}

      {isAddingCreator && (
        <AddCreatorModal
          onClose={() => setIsAddingCreator(false)}
          onAdd={addCreator}
        />
      )}
    </div>
  )
}
