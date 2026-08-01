import { Metadata } from 'next'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export const metadata: Metadata = {
  title: 'Analytics | NovaTip',
  description: 'View real-time statistics and analytics for the NovaTip platform.',
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-content-main)] sm:text-4xl">
            Platform <span className="bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] bg-clip-text text-transparent">Analytics</span>
          </h1>
          <p className="mt-2 text-[var(--color-content-muted)] max-w-2xl">
            Real-time data and historical trends for the NovaTip ecosystem. Track tipping volume, active creators, and platform growth on the Injective network.
          </p>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </div>
  )
}
