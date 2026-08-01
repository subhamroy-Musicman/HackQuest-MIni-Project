'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { validateInjectiveAddress } from '@/utils/validation'
import { addNotification } from '@/lib/notifications'
import type { Creator } from '@/lib/creators'

interface AddCreatorModalProps {
  onClose: () => void
  onAdd: (creator: Omit<Creator, 'id' | 'totalRaised'>) => void
}

const AVATAR_OPTIONS = [
  '/img/avatar_web3.jpg',
  '/img/avatar_alice.jpg',
  '/img/avatar_builders.jpg',
  '/img/avatar_music.jpg',
  '/img/avatar_dev.jpg',
  '/img/avatar_defi.jpg',
  '/img/avatar_ui.jpg',
  '/img/avatar_auditor.jpg',
]

export function AddCreatorModal({ onClose, onAdd }: AddCreatorModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [customAvatar, setCustomAvatar] = useState('')

  const addressCheck = validateInjectiveAddress(address)

  const canSubmit = name.trim() && addressCheck.valid && bio.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    onAdd({
      name: name.trim(),
      address: address.trim(),
      bio: bio.trim(),
      avatar: customAvatar.trim() || avatar,
    })
    
    addNotification('New Creator Added! 🎉', `${name.trim()} was successfully added to your dashboard.`)
    onClose()
  }

  // Prevent background scroll
  useState(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md">
        <Card 
          title="Add New Creator" 
          headerAction={
            <button 
              onClick={onClose}
              className="text-[var(--color-content-muted)] hover:text-white transition-colors"
            >
              ✕
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-content-secondary)] uppercase tracking-wide">
                Creator Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Satoshi Nakamoto"
                maxLength={40}
                className="w-full rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-content-primary)] focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-content-secondary)] uppercase tracking-wide">
                Injective Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="inj1..."
                className={`w-full rounded-lg border bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-content-primary)] focus:outline-none ${
                  address && !addressCheck.valid
                    ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                    : 'border-[var(--color-line-subtle)] focus:border-[var(--color-brand)]'
                }`}
              />
              {address && !addressCheck.valid && (
                <p className="mt-1.5 text-xs text-[var(--color-error)]">
                  {addressCheck.error}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-content-secondary)] uppercase tracking-wide">
                Bio / Description
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What does this creator do?"
                maxLength={120}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-content-primary)] focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--color-content-secondary)] uppercase tracking-wide">
                Select Avatar Profile
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvatar(opt)}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      avatar === opt ? 'border-[#00E5FF] scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <Image src={opt} alt="Avatar option" fill sizes="48px" className="object-cover" />
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="url"
                  value={customAvatar}
                  onChange={(e) => setCustomAvatar(e.target.value)}
                  placeholder="Or paste custom image URL (https://...)"
                  className="w-full rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-content-primary)] focus:border-[var(--color-brand)] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#00E5FF] dark:to-[#6D5DF6] text-white shadow-md hover:from-blue-500 hover:to-indigo-500 dark:hover:from-[#00FFA3] dark:hover:to-[#00E5FF] transition-all disabled:opacity-50"
              >
                Create Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
