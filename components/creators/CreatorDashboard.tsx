'use client'

import { useState, useEffect } from 'react'
import { Creator } from '@/lib/creators'
import { CreatorCard } from './CreatorCard'
import { DonationModal } from './DonationModal'
import { AddCreatorModal } from './AddCreatorModal'
import { useCreators } from '@/hooks/useCreators'
import { getRecentTips, subscribeToTips } from '@/lib/tips'

export function CreatorDashboard() {
  const { creators, addCreator } = useCreators()
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [isAddingCreator, setIsAddingCreator] = useState(false)
  const [activeTippers, setActiveTippers] = useState(0)

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

  return (
    <div className="space-y-8">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-content-primary)]">
          Creator Directory
        </h2>
        <button
          onClick={() => setIsAddingCreator(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/20"
        >
          <span>+ Add Creator</span>
        </button>
      </div>

      {/* Platform Stats Row to fill the middle space */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-6 flex flex-col justify-center text-center">
          <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Total Creators</p>
          <p className="text-3xl font-bold text-[var(--color-content-primary)]">{creators.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-6 flex flex-col justify-center text-center">
          <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Total Value Tipped</p>
          <p className="text-3xl font-bold text-[#00E5FF]">{totalTipped.toFixed(1)} INJ</p>
        </div>
        <div className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-6 flex flex-col justify-center text-center">
          <p className="text-sm font-medium text-[var(--color-content-muted)] uppercase tracking-wider mb-1">Active Tippers</p>
          <p className="text-3xl font-bold text-[var(--color-content-primary)]">{activeTippers}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {creators.map((creator) => (
          <CreatorCard
            key={creator.id}
            creator={creator}
            onDonate={setSelectedCreator}
          />
        ))}
      </div>

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
