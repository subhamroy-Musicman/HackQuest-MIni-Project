'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Shield, BarChart3, Globe2 } from 'lucide-react'

const FEATURES = [
  {
    id: 'speed',
    label: 'Instant Settlements',
    icon: Zap,
    title: 'Sub-second Tipping',
    description: 'Powered by Injective, every tip is processed and settled on-chain in less than a second. No waiting for confirmations, no pending states. Just instant support for creators.',
    color: 'from-[#00E5FF] to-[#0088FF]',
    glowColor: 'rgba(0, 229, 255, 0.4)',
    image: (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.1)_0%,transparent_70%)]" />
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 h-32 w-32 rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_50px_rgba(0,229,255,0.2)]"
        >
          <Zap className="h-16 w-16 text-[#00E5FF]" />
        </motion.div>
      </div>
    )
  },
  {
    id: 'fees',
    label: 'Zero Gas Fees',
    icon: Globe2,
    title: 'Keep What You Earn',
    description: 'Traditional platforms take a 10-30% cut. On NovaTip, creators keep 100% of their earnings. Gas fees on Injective are fractions of a cent, effectively making transactions free.',
    color: 'from-[#10b981] to-[#059669]',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    image: (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 flex gap-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="h-24 w-16 rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] flex items-end justify-center pb-2">
              <span className="text-sm font-bold text-[var(--color-content-muted)] line-through">30%</span>
            </div>
            <span className="text-xs text-[var(--color-content-muted)]">Web2</span>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="h-32 w-16 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 flex items-end justify-center pb-2 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-sm">
              <span className="text-sm font-bold text-[#10b981]">100%</span>
            </div>
            <span className="text-xs text-[#10b981]">NovaTip</span>
          </motion.div>
        </div>
      </div>
    )
  },
  {
    id: 'profiles',
    label: 'Decentralized',
    icon: Shield,
    title: 'Censorship-Resistant Profiles',
    description: 'Your profile, your data. NovaTip leverages on-chain registries so that no central authority can de-platform you or freeze your funds. You are fully in control.',
    color: 'from-[#6D5DF6] to-[#4F46E5]',
    glowColor: 'rgba(109, 93, 246, 0.4)',
    image: (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(109,93,246,0.1)_0%,transparent_70%)]" />
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="h-16 w-16 rounded-xl border border-[#6D5DF6]/30 bg-[#6D5DF6]/10 backdrop-blur-md flex items-center justify-center"
            >
              <Shield className="h-6 w-6 text-[#6D5DF6]" />
            </motion.div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'analytics',
    label: 'Rich Analytics',
    icon: BarChart3,
    title: 'Know Your Audience',
    description: 'Beautiful, high-profile analytics dashboards allow you to track your tip volume, identify top supporters, and measure your growth over time.',
    color: 'from-[#f59e0b] to-[#d97706]',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    image: (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[var(--color-surface-elevated)] flex items-end justify-center p-8 pb-0 gap-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.1)_0%,transparent_70%)]" />
        {[40, 70, 45, 90, 60].map((height, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: i * 0.1, duration: 0.6, type: "spring" }}
            className="w-10 rounded-t-xl bg-gradient-to-t from-[#f59e0b]/10 to-[#f59e0b] border-t border-l border-r border-[#f59e0b]/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] relative z-10"
          />
        ))}
      </div>
    )
  }
]

export default function LiquidGlassTabs() {
  const [activeTab, setActiveTab] = useState(FEATURES[0].id)

  const activeFeature = FEATURES.find((f) => f.id === activeTab) || FEATURES[0]

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Liquid Glass Tabs Navigation */}
      <div className="relative mx-auto flex w-full items-center justify-between rounded-full border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] p-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-4 overflow-x-auto no-scrollbar">
        {FEATURES.map((feature) => {
          const isActive = activeTab === feature.id
          const Icon = feature.icon

          return (
            <button
              key={feature.id}
              onClick={() => setActiveTab(feature.id)}
              className={`relative z-20 flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-sm font-medium transition-all duration-300 sm:px-6 sm:py-4 sm:text-base ${
                isActive ? 'text-[var(--color-content-primary)]' : 'text-[var(--color-content-muted)] hover:text-[var(--color-content-secondary)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-tab-indicator"
                  className="absolute inset-0 z-10 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.0) 100%)`,
                    boxShadow: `0 8px 32px 0 ${feature.glowColor}, inset 0 1px 1px rgba(255,255,255,0.2)`,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                  }}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.6 }}
                />
              )}
              <span className="relative z-30 flex items-center gap-2">
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? '' : 'opacity-70'}`} />
                <span className="hidden sm:inline">{feature.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Feature Content Display */}
      <div className="mt-12 overflow-hidden rounded-[2.5rem] border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid lg:grid-cols-2 h-full min-h-[450px]"
          >
            {/* Text Content */}
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
              <div className="mb-6 flex items-center gap-3">
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${activeFeature.glowColor}, transparent)` }}
                >
                  <activeFeature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-content-muted)]">
                  {activeFeature.label}
                </h3>
              </div>
              
              <h2 className="mb-6 text-3xl font-black tracking-tight text-[var(--color-content-primary)] sm:text-4xl lg:text-5xl">
                <span className={`bg-gradient-to-r ${activeFeature.color} bg-clip-text text-transparent`}>
                  {activeFeature.title}
                </span>
              </h2>
              
              <p className="text-lg leading-relaxed text-[var(--color-content-secondary)]">
                {activeFeature.description}
              </p>
            </div>

            {/* Visual Content */}
            <div className="relative p-6 lg:p-8 flex items-center justify-center">
              {/* Glass container for visual */}
              <div className="relative h-full w-full min-h-[300px] overflow-hidden rounded-3xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-overlay)] backdrop-blur-xl shadow-inner">
                {activeFeature.image}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
