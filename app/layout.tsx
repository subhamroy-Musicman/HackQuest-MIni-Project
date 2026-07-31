

import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/context/WalletProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NovaTip | Support Creators Instantly on Injective',
  description:
    'A decentralized creator donation platform. Support builders and empower creators with fast, low-cost INJ tips securely on-chain.',
}

export const viewport: Viewport = {
  themeColor: '#07090d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="neon-wave-container" aria-hidden="true">
          <div className="neon-wave"></div>
          <div className="neon-wave"></div>
        </div>
        <WalletProvider>
          {/* A skip link. The first thing a keyboard user reaches, and hidden
              until focused — it lets them jump past the header instead of
              tabbing through it on every page. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[var(--color-brand)] focus:px-3 focus:py-2 focus:text-sm focus:text-[#04141a]"
          >
            Skip to main content
          </a>

          <Header />

          <main id="main-content">{children}</main>

          <Footer />
        </WalletProvider>
      </body>
    </html>
  )
}
