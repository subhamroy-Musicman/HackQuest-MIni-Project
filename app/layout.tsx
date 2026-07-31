/**
 * =============================================================================
 * FILE: app/layout.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The root layout: the HTML shell every page is rendered inside, plus the
 * global providers, fonts, header and footer.
 *
 * WHY IT EXISTS
 * -------------
 * In the Next.js App Router, `app/layout.tsx` is mandatory. It is the only
 * place `<html>` and `<body>` are written, and it wraps every route.
 *
 * That makes it the correct home for anything that must exist exactly once for
 * the whole application:
 *
 *   * the global stylesheet
 *   * font loading
 *   * `<WalletProvider>`, so wallet state survives navigation
 *   * chrome that appears on every page
 *
 * A KEY APP ROUTER CONCEPT: THIS IS A SERVER COMPONENT
 * ----------------------------------------------------
 * Notice there is no `'use client'` at the top. In the App Router, components
 * are Server Components by default: they render to HTML on the server and ship
 * **zero JavaScript** to the browser.
 *
 * `<WalletProvider>` is a Client Component (it has `'use client'` and uses
 * hooks). Rendering it from here is completely fine and is the recommended
 * pattern — a Server Component can render a Client Component, and everything
 * inside that boundary becomes client-side.
 *
 * What you cannot do is the reverse: import a server-only module into a Client
 * Component. That is why `lib/queries.ts` is only ever imported by route
 * handlers.
 *
 * WHEN TO EDIT
 * ------------
 * To add another global provider, change the fonts, or adjust page metadata.
 *
 * EXECUTION FLOW
 * --------------
 *   request
 *      |
 *      v
 *   app/layout.tsx (server) — builds the HTML shell
 *      |
 *      v
 *   <WalletProvider> (client boundary begins here)
 *      |
 *      v
 *   <Header /> + {children} + <Footer />
 *      |
 *      v
 *   HTML to the browser, then hydration
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `app/globals.css`, `context/WalletProvider.tsx`,
 *              `components/layout/*`, `next/font`
 * Depended on by: every page.
 * =============================================================================
 */

import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/context/WalletProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

/**
 * The interface font.
 *
 * `next/font` downloads the font at BUILD time and self-hosts it. That means no
 * request to Google's servers at runtime — better privacy, one fewer network
 * dependency, and no flash of unstyled text because the font is preloaded from
 * the same origin.
 *
 * `variable` exposes it as a CSS custom property, which `app/globals.css`
 * consumes via `--font-sans`.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/**
 * The monospace font, used for every address, hash and amount.
 *
 * This is a correctness decision, not a stylistic one. In a proportional font,
 * `1`, `l` and `I` render almost identically — and in a string where a single
 * character determines who receives money, that ambiguity is a hazard.
 * Monospace faces are designed to keep those characters distinct.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

/**
 * Page metadata.
 *
 * Next.js turns this object into `<title>`, `<meta>` and Open Graph tags. It is
 * exported from a Server Component, which is why it can be static — there is no
 * `document.title` assignment anywhere in this project.
 */
export const metadata: Metadata = {
  title: 'Injective dApp Starter — learn by reading the code',
  description:
    'An educational, fully-commented full-stack Injective dApp. Connect a wallet, read chain state and send a transaction with the official TypeScript SDK.',
}

/**
 * Viewport configuration.
 *
 * Kept separate from `metadata` — Next.js 14 split them, and putting
 * `themeColor` in `metadata` now logs a warning.
 */
export const viewport: Viewport = {
  themeColor: '#07090d',
  width: 'device-width',
  initialScale: 1,
}

/**
 * The root layout.
 *
 * @param props.children The active route's page component.
 * @returns The full HTML document.
 *
 * WORKFLOW
 *   set lang + font variables on <html>
 *        |
 *        v
 *   <WalletProvider> — one wallet state for the whole app
 *        |
 *        v
 *   <Header /> — sticky, always visible
 *        |
 *        v
 *   <main>{children}</main>
 *        |
 *        v
 *   <Footer />
 *
 * WHY THE PROVIDER WRAPS THE HEADER TOO
 * The header contains the connect button, which needs wallet state. Any
 * component that calls `useWallet()` must be inside the provider — including
 * chrome. Placing the provider outside everything is the simplest way to
 * guarantee that.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `lang` is not decoration: screen readers use it to choose pronunciation
    // rules, and browsers use it for translation prompts.
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen antialiased">
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
