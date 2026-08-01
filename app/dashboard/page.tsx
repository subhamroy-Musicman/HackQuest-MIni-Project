'use client'

import { motion } from 'framer-motion'
import { Wallet, ArrowUpRight, Copy, Share2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { getRecentTips } from '@/lib/tips'

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const tips = getRecentTips().slice(0, 5) // Get latest 5 tips
  
  const totalEarned = tips.reduce((sum, tip) => sum + parseFloat(tip.amount), 0).toFixed(2)

  const copyToClipboard = () => {
    navigator.clipboard.writeText('https://novatip.app/inj1hur584a827fklz74kuk7qc88x2d8268dfwsls8')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--color-content-main)] sm:text-4xl">
                Creator <span className="bg-gradient-to-r from-[#6D5DF6] to-[#00E5FF] bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="mt-2 text-[var(--color-content-muted)] max-w-xl">
                Manage your profile, view recent supporters, and share your unique tipping link.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-[var(--color-surface-elevated)] p-2 pr-4 rounded-full border border-[var(--color-line-subtle)]">
              <button 
                onClick={copyToClipboard}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)] text-[var(--color-content-secondary)] transition-colors"
                title="Copy link"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-[#10b981]" /> : <Copy className="h-4 w-4" />}
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-content-muted)]">Your Link</span>
                <span className="text-sm font-medium text-[var(--color-content-main)] truncate max-w-[150px]">novatip.app/inj1...wsls8</span>
              </div>
            </div>
          </motion.div>

          {/* Top Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6 transition-all hover:border-[#6D5DF6]/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-content-muted)]">Total Earned</p>
                <div className="rounded-xl p-2.5 bg-[#6D5DF6]/10 text-[#6D5DF6]">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[var(--color-content-main)] tracking-tight">{totalEarned}</span>
                <span className="text-lg font-medium text-[var(--color-content-muted)]">INJ</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6 transition-all hover:border-[#00E5FF]/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-content-muted)]">Total Supporters</p>
                <div className="rounded-xl p-2.5 bg-[#00E5FF]/10 text-[#00E5FF]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[var(--color-content-main)] tracking-tight">124</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6 transition-all hover:border-[#10b981]/30 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-content-muted)] mb-2">Share Profile</p>
                <p className="text-sm text-[var(--color-content-secondary)]">Let your audience know they can support you instantly on Injective.</p>
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-raised)] px-4 py-3 text-sm font-semibold text-[var(--color-content-main)] transition-colors hover:bg-[var(--color-surface-hover)] border border-[var(--color-line-subtle)]">
                <Share2 className="h-4 w-4" /> Share on X
              </button>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] overflow-hidden">
            <div className="border-b border-[var(--color-line-subtle)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-content-main)]">Recent Tips Received</h2>
            </div>
            
            <div className="divide-y divide-[var(--color-line-subtle)]">
              {tips.map((tip) => (
                <div key={tip.id} className="flex items-center justify-between p-6 hover:bg-[var(--color-surface-hover)] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-[#6D5DF6]/20">
                      <ArrowUpRight className="h-5 w-5 text-[#6D5DF6]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-content-main)]">
                        Received from <span className="text-[#00E5FF]">{tip.tipper.slice(0, 6)}...{tip.tipper.slice(-4)}</span>
                      </p>
                      <p className="text-xs text-[var(--color-content-muted)] mt-0.5">{tip.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#10b981]">+{tip.amount} INJ</p>
                  </div>
                </div>
              ))}
              
              {tips.length === 0 && (
                <div className="p-8 text-center text-[var(--color-content-muted)]">
                  <p>No tips received yet. Share your link to get started!</p>
                </div>
              )}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
