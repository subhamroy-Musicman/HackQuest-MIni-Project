import { Suspense } from 'react'
import { AccountPanel } from '@/components/wallet/AccountPanel'
import { BalancesPanel } from '@/components/balances/BalancesPanel'
import { CreatorDashboard } from '@/components/creators/CreatorDashboard'
import { RecentDonations } from '@/components/creators/RecentDonations'
import { CustomDonationPanel } from '@/components/creators/CustomDonationPanel'

export default function HomePage() {
  return (
    <div className="relative min-h-screen pb-24">
      {/* Decorative ambient glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-[#00E5FF]/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1600px] px-4 pt-12 sm:px-6 lg:px-8 xl:px-12 sm:pt-20">
        
        {/* --- Hero --------------------------------------------------------- */}
        <section className="mb-16 text-center sm:mb-20">
          <div className="inline-flex items-center justify-center rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-1.5 mb-6 backdrop-blur-md">
            <span className="text-[11px] font-semibold tracking-wider text-[#00A3B8] uppercase">
              Powered by Injective
            </span>
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-bold tracking-tight text-[var(--color-content-primary)] sm:text-6xl">
            Support Builders. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] bg-clip-text text-transparent">
              Empower Creators.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-content-secondary)] sm:text-lg">
            Every tip lives on-chain. Connect your wallet to instantly send secure, low-cost INJ donations to your favorite Web3 creators.
          </p>
        </section>

        {/* --- Main App Layout ----------------------------------------------- */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          
          {/* Left Sidebar (Wallet & Balances) */}
          <div className="space-y-6 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
            <AccountPanel />
            <BalancesPanel />
            <CustomDonationPanel />
          </div>

          {/* Main Content (Creators Grid) */}
          <div className="space-y-8 lg:col-span-8 xl:col-span-9">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--color-surface-base)]"></div>}>
              <CreatorDashboard />
            </Suspense>
            <RecentDonations />
          </div>

        </div>

      </div>
    </div>
  )
}
