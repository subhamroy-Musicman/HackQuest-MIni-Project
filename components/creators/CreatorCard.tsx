'use client'

import { Creator } from '@/lib/creators'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface CreatorCardProps {
  creator: Creator
  onDonate: (creator: Creator) => void
}

export function CreatorCard({ creator, onDonate }: CreatorCardProps) {
  return (
    <div className="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#6D5DF6] shadow-lg">
          {creator.avatar.startsWith('/') ? (
            <Image src={creator.avatar} alt={creator.name} fill className="object-cover" />
          ) : (
            <span className="text-2xl text-white font-bold">{creator.avatar}</span>
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--color-content-primary)]">
            {creator.name}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-content-secondary)] line-clamp-2">
            {creator.bio}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex items-center justify-between border-t border-[var(--color-line-subtle)] pt-4">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-[var(--color-content-muted)] uppercase">
            Raised
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--color-content-primary)]">
            {creator.totalRaised} INJ
          </p>
        </div>
        <Button
          onClick={() => onDonate(creator)}
          className="bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] text-white shadow-md hover:from-[#00FFA3] hover:to-[#00E5FF] hover:shadow-lg transition-all duration-300 transform active:scale-95"
        >
          Donate
        </Button>
      </div>
    </div>
  )
}
