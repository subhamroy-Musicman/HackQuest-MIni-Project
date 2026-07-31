/**
 * =============================================================================
 * FILE: app/page.tsx
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The single page of the application, and the workshop's running order.
 *
 * WHY IT EXISTS
 * -------------
 * The panels are arranged in the sequence a learner should meet the concepts,
 * and each step depends only on the ones before it:
 *
 *   1. NETWORK STATUS — reading a blockchain needs nothing at all. No wallet,
 *      no account, no gas. This works the moment you run `npm run dev`, which
 *      makes it the ideal first success.
 *
 *   2. YOUR ACCOUNT — connect a wallet. Learn that "connecting" is just an
 *      extension handing your page a public address, and that one Injective
 *      account has two address formats.
 *
 *   3. YOUR BALANCES — read data that belongs to a specific account. Meet
 *      denoms, decimals, and the difference between what the chain stores and
 *      what a human reads.
 *
 *   4. SEND INJ — write to the chain. Build a message, sign it, broadcast it,
 *      watch it confirm, then find it on a public explorer.
 *
 * Read the four panels top to bottom and you have covered the whole surface of
 * dApp development.
 *
 * WHY THIS FILE HAS NO `'use client'`
 * -----------------------------------
 * It is a Server Component. It renders no state and handles no events — it just
 * arranges components. The panels that DO need interactivity each carry their
 * own `'use client'`.
 *
 * That is the recommended App Router pattern: keep the client boundary as deep
 * in the tree as possible. Everything above it renders on the server and ships
 * no JavaScript, so the page arrives fast and the interactive parts hydrate
 * independently.
 *
 * EXECUTION FLOW
 * --------------
 *   app/layout.tsx
 *        |
 *        v
 *   THIS FILE (server-rendered)
 *        |
 *        +--> <ChainStatusPanel />  (client) -> /api/chain/status
 *        +--> <AccountPanel />      (client) -> wallet context
 *        +--> <BalancesPanel />     (client) -> /api/account/:address/balances
 *        +--> <SendInjForm />       (client) -> wallet + /api/tx/broadcast
 *
 * DEPENDENCIES
 * ------------
 * Depends on : every panel component, `lib/constants.ts`
 * Depended on by: nothing — this is a route.
 * =============================================================================
 */

import { ChainStatusPanel } from '@/components/chain/ChainStatusPanel'
import { AccountPanel } from '@/components/wallet/AccountPanel'
import { BalancesPanel } from '@/components/balances/BalancesPanel'
import { SendInjForm } from '@/components/transfer/SendInjForm'
import { FAUCET_URL, IS_MAINNET } from '@/lib/constants'

/**
 * A numbered section heading that doubles as the workshop's table of contents.
 *
 * @param props.step        The step number.
 * @param props.title       What this section covers.
 * @param props.description One sentence on the concept being taught.
 */
function StepHeading({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[11px] font-semibold text-[var(--color-content-secondary)]"
        aria-hidden="true"
      >
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-content-primary)]">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-content-secondary)]">
          {description}
        </p>
      </div>
    </div>
  )
}

/**
 * The dashboard.
 *
 * @returns The page.
 */
export default function HomePage() {
  return (
    <div className="relative">
      {/* Decorative grid behind the hero. `pointer-events-none` keeps it from
          intercepting clicks, and `aria-hidden` keeps it out of the
          accessibility tree — it carries no information. */}
      <div
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-64"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-4 sm:px-6 sm:pt-14">
        {/* --- Hero --------------------------------------------------------- */}
        <section className="mb-10 max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--color-brand)] uppercase">
            Learn Injective by reading the code
          </p>

          <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-[var(--color-content-primary)] sm:text-3xl">
            A full-stack Injective dApp, documented line by line.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[var(--color-content-secondary)]">
            Four steps take you from &ldquo;what is a block height?&rdquo; to a
            signed transaction on a public ledger. Every file in this repository
            opens with an explanation of what it does and why it exists — the
            code is the tutorial.
          </p>

          {!IS_MAINNET && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg bg-[var(--color-brand)] px-4 text-xs font-medium text-[#04141a] transition-colors hover:bg-[var(--color-brand-strong)] hover:text-white"
              >
                Get free testnet INJ ↗
              </a>
              <span className="text-xs text-[var(--color-content-muted)]">
                You will need a little to send anything in step 4.
              </span>
            </div>
          )}
        </section>

        {/* --- The four steps ----------------------------------------------- */}
        <div className="space-y-10 pb-6">
          <section>
            <StepHeading
              step={1}
              title="Read the chain"
              description="No wallet required. Reading a blockchain is permissionless — anyone, anywhere, with no account and no gas."
            />
            <ChainStatusPanel />
          </section>

          <section>
            <StepHeading
              step={2}
              title="Connect a wallet"
              description="An extension hands your page a public address. Your private key never leaves it, and this site never sees it."
            />
            <AccountPanel />
          </section>

          <section>
            <StepHeading
              step={3}
              title="Read account data"
              description="Balances are public. Meet denoms, decimals, and the gap between what the chain stores and what a person reads."
            />
            <BalancesPanel />
          </section>

          <section>
            <StepHeading
              step={4}
              title="Write to the chain"
              description="Build a message, sign it, broadcast it, watch it confirm — then find it on a public block explorer."
            />
            <SendInjForm />
          </section>
        </div>

        {/* --- Where to go next --------------------------------------------- */}
        <section className="rounded-xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-content-primary)]">
            Where to read next
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-content-secondary)]">
            Open these four files in order. Between them they contain every
            concept this page demonstrates.
          </p>

          <ul className="mt-4 space-y-2.5">
            {[
              {
                path: 'lib/constants.ts',
                what: 'Chain ids, endpoints, gas, and the token registry. Start here — everything else reads from it.',
              },
              {
                path: 'lib/queries.ts',
                what: 'Every read. Why reads need no wallet, and why this project performs them server-side.',
              },
              {
                path: 'lib/transactions.ts',
                what: 'Every write. The five-stage lifecycle, unit conversion, and where the wallet fits in.',
              },
              {
                path: 'lib/errors.ts',
                what: 'What each blockchain failure actually means, and what to do about it.',
              },
            ].map((entry) => (
              <li
                key={entry.path}
                className="rounded-lg border border-[var(--color-line-subtle)] bg-[var(--color-surface-base)] p-3"
              >
                <code className="font-mono text-xs text-[var(--color-brand)]">
                  {entry.path}
                </code>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-content-muted)]">
                  {entry.what}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
