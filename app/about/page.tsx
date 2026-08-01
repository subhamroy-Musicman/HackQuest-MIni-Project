import { Card } from '@/components/ui/Card'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | NovaTip',
  description: 'Learn more about NovaTip, the decentralized creator donation platform.',
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          About <span className="bg-gradient-to-r from-[#00E5FF] to-[#6D5DF6] bg-clip-text text-transparent">NovaTip</span>
        </h1>
        <p className="mt-6 text-lg text-[var(--color-content-secondary)] max-w-2xl mx-auto">
          Empowering the next generation of Web3 creators on Injective.
        </p>
      </div>

      <div className="space-y-8">
        <Card title="Our Mission" className="border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.05)]">
          <div className="text-[var(--color-content-secondary)] leading-relaxed space-y-4">
            <p>
              NovaTip was born out of a simple idea: creators shouldn't have to rely on high-fee Web2 platforms to monetize their content and engage with their supporters. 
            </p>
            <p>
              Built natively on the <strong>Injective Protocol</strong>, NovaTip provides a lightning-fast, decentralized, and zero-compromise tipping experience. Every INJ sent on our platform goes directly to the creator's wallet instantly, secured entirely on-chain.
            </p>
          </div>
        </Card>

        <div className="grid gap-8 sm:grid-cols-2">
          <Card title="Fast & Feeless">
            <p className="text-sm text-[var(--color-content-secondary)] leading-relaxed">
              Leveraging Injective's unparalleled throughput, donations on NovaTip clear instantly with near-zero gas fees, making micro-transactions a reality.
            </p>
          </Card>
          
          <Card title="100% Decentralized">
            <p className="text-sm text-[var(--color-content-secondary)] leading-relaxed">
              No middlemen. No hidden cuts. No censorship. Smart contracts handle the routing so you retain absolute ownership over your earnings.
            </p>
          </Card>
        </div>

        <Card title="The HackQuest Mini-Project" className="relative overflow-hidden border-[#6D5DF6]/20 shadow-[0_0_15px_rgba(109,93,246,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="h-48 w-48" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="relative z-10 text-[var(--color-content-secondary)] leading-relaxed space-y-4">
            <p>
              NovaTip was conceptualized and developed by <strong>Subham Roy</strong> as a capstone submission for the prestigious <strong>Injective Co-Learning Camp</strong> hosted by HackQuest.
            </p>
            <p>
              This project demonstrates the seamless integration of Next.js, modern UI/UX design paradigms, and Web3 wallet connectivity via the Injective TypeScript SDK.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
