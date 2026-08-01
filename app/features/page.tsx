import { Metadata } from 'next'
import LiquidGlassTabs from '@/components/features/LiquidGlassTabs'

export const metadata: Metadata = {
  title: 'Features | NovaTip',
  description: 'Explore the special features that make NovaTip the ultimate decentralized creator platform.',
}

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen pt-24 pb-32 overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.05)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute top-3/4 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(109,93,246,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-black tracking-tight text-[var(--color-content-main)] sm:text-5xl md:text-6xl lg:text-7xl">
            Unleash Your <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#00E5FF] via-[#6D5DF6] to-[#10b981] bg-clip-text text-transparent">Creative Potential</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-content-secondary)]">
            Discover why creators and builders are moving to NovaTip. Built natively on Injective to provide lightning-fast, zero-fee, censorship-resistant tipping.
          </p>
        </div>

        <LiquidGlassTabs />
      </div>
    </div>
  )
}
