/**
 * =============================================================================
 * FILE: lib/wallet.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Handles wallet connection and exposes the helper functions used throughout
 * the application: detecting installed extensions, connecting, reading the
 * user's address, and obtaining a signer.
 *
 * WHY IT EXISTS
 * -------------
 * "Connecting a wallet" sounds like a network operation. It is not. Nothing is
 * sent anywhere, no session is created on any server, and the blockchain is
 * never told that you connected. What actually happens is much simpler:
 *
 *   1. A browser extension has injected an object onto `window`.
 *   2. You call a method on that object.
 *   3. The extension shows the user a popup.
 *   4. If they approve, the extension hands your page a public address.
 *
 * That is the whole thing. "Connected" is a fact your JavaScript remembers,
 * nothing more — which is why `disconnect()` below is purely local, and why a
 * page reload starts over.
 *
 * The private key never appears in any of these steps. It stays inside the
 * extension's sandboxed storage. When you later need a signature, you hand the
 * extension a document and it hands back a signature. Your code never sees the
 * key, cannot see the key, and should be designed on the assumption that it
 * never will.
 *
 * WHEN TO USE
 * -----------
 * BROWSER ONLY. Every function here touches `window`. It is imported by
 * `context/WalletProvider.tsx`, which is a `'use client'` component.
 *
 * FLOW
 * ----
 *   User
 *     |  clicks "Connect Wallet"
 *     v
 *   Wallet extension popup
 *     |  user approves
 *     v
 *   Public address (inj1…)
 *     |
 *     v
 *   Injective Network (all later reads and writes use that address)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `types/global.d.ts`, `lib/constants.ts`, `lib/errors.ts`,
 *              `@injectivelabs/sdk-ts` (address conversion only)
 * Depended on by: `context/WalletProvider.tsx`, `lib/transactions.ts`
 * =============================================================================
 */

import { getEthereumAddress } from '@injectivelabs/sdk-ts'
import type { CosmosWalletProvider, OfflineDirectSigner } from '@/types/global'
import type { WalletAccount, WalletId } from '@/types'
import {
  CHAIN_ID,
  LAST_WALLET_STORAGE_KEY,
  SUPPORTED_WALLETS,
} from './constants'
import { toAppError, walletNotInstalledError, wrongNetworkError } from './errors'

/**
 * Looks up a wallet's static metadata by id.
 *
 * @param walletId `'keplr'` or `'leap'`.
 * @returns The matching `WalletMetadata`.
 * @throws {Error} If the id is not in `SUPPORTED_WALLETS` — a programming
 *                 error, not a user-facing one, so it stays a plain `Error`.
 *
 * @example
 * ```ts
 * getWalletMetadata('keplr').downloadUrl // 'https://www.keplr.app/download'
 * ```
 */
export function getWalletMetadata(walletId: WalletId) {
  const metadata = SUPPORTED_WALLETS.find((wallet) => wallet.id === walletId)
  if (!metadata) {
    throw new Error(`Unknown wallet id: "${walletId}". Add it to SUPPORTED_WALLETS.`)
  }
  return metadata
}

/**
 * Returns the injected provider object for a wallet, or `undefined`.
 *
 * PURPOSE
 * The one place in the codebase that reads from `window`. Everything else works
 * with the returned object, which makes the browser dependency easy to see and
 * easy to test around.
 *
 * @param walletId Which wallet to look for.
 * @returns The extension's injected API, or `undefined` when it is not
 *          installed (or when this runs on the server).
 *
 * @example
 * ```ts
 * const provider = getWalletProvider('keplr')
 * if (!provider) console.log('Keplr is not installed')
 * ```
 *
 * WORKFLOW
 *   are we in a browser?  -- no --> undefined
 *        | yes
 *        v
 *   read window[metadata.windowKey]
 *        |
 *        v
 *   return it (or undefined)
 *
 * WHY THE `typeof window === 'undefined'` GUARD
 * ---------------------------------------------
 * Next.js renders components on the server first. There is no `window` there,
 * and reading it throws `ReferenceError: window is not defined` — one of the
 * most common errors people hit when adding a wallet to a Next.js app. The
 * guard makes this function safe to call from anywhere.
 */
export function getWalletProvider(
  walletId: WalletId,
): CosmosWalletProvider | undefined {
  if (typeof window === 'undefined') return undefined

  const metadata = getWalletMetadata(walletId)
  return window[metadata.windowKey]
}

/**
 * Reports whether a wallet extension is installed.
 *
 * @param walletId Which wallet to check.
 * @returns `true` if the extension injected itself into this page.
 *
 * @example
 * ```tsx
 * <Button disabled={!isWalletInstalled('leap')}>Connect Leap</Button>
 * ```
 *
 * TIMING CAVEAT WORTH KNOWING
 * ---------------------------
 * Extensions inject their object during page load, and there is no standard
 * event announcing it. Calling this during the very first render can produce a
 * false negative on a slow machine.
 *
 * This app avoids the problem by only calling it in response to a user click,
 * by which time injection has long finished. If you ever need it during render,
 * check again after `window.onload` or after a short delay.
 */
export function isWalletInstalled(walletId: WalletId): boolean {
  return getWalletProvider(walletId) !== undefined
}

/**
 * Connects to a wallet and returns the user's account.
 *
 * PURPOSE
 * The main entry point of this module, and the function behind the "Connect
 * Wallet" button.
 *
 * @param walletId Which wallet to connect.
 * @returns A `WalletAccount` with both address formats and the account label.
 * @throws {AppError} `WALLET_NOT_INSTALLED` when the extension is absent;
 *                    `USER_REJECTED` when the user declines the popup;
 *                    `WRONG_NETWORK` when the wallet returns a different chain.
 *
 * @example
 * ```ts
 * try {
 *   const account = await connectWallet('keplr')
 *   console.log(account.injectiveAddress) // 'inj1…'
 * } catch (error) {
 *   // `error` is an AppError with a message and a hint
 * }
 * ```
 *
 * WORKFLOW
 *   is the extension installed?   -- no --> WALLET_NOT_INSTALLED
 *        | yes
 *        v
 *   provider.enable(CHAIN_ID)         <- POPUP APPEARS HERE
 *        |  (may throw if the wallet does not know this chain)
 *        v
 *   provider.getKey(CHAIN_ID)         <- returns bech32Address, name, pubKey
 *        |
 *        v
 *   derive the 0x… form from the inj1… form
 *        |
 *        v
 *   remember the wallet id in localStorage
 *        |
 *        v
 *   return WalletAccount
 *
 * WHY WE ASK FOR THE ADDRESS EVERY TIME INSTEAD OF CACHING IT
 * -----------------------------------------------------------
 * A user can switch accounts inside their wallet at any moment, including while
 * your tab is in the background. The extension is the only source of truth for
 * "who is this". We cache which *wallet* was used, never which *account*.
 */
export async function connectWallet(walletId: WalletId): Promise<WalletAccount> {
  const metadata = getWalletMetadata(walletId)
  const provider = getWalletProvider(walletId)

  // Check first and fail with a useful message. Without this, the next line
  // throws "Cannot read properties of undefined (reading 'enable')", which
  // tells a beginner nothing at all.
  if (!provider) {
    throw walletNotInstalledError(metadata.name, metadata.downloadUrl)
  }

  try {
    // ---------------------------------------------------------------------
    // STEP 1 — Ask permission.
    //
    // This is the call that opens the extension popup. Until the user clicks
    // "Approve", every other wallet method will fail. If they click "Reject",
    // this promise rejects — which is a completely normal outcome, not a bug.
    //
    // If the wallet has never heard of this chain id (common for a fresh
    // testnet), `enable` throws and we fall into `suggestInjectiveChain` below.
    // ---------------------------------------------------------------------
    try {
      await provider.enable(CHAIN_ID)
    } catch (enableError) {
      const message = String(
        enableError instanceof Error ? enableError.message : enableError,
      ).toLowerCase()

      // Only attempt the chain-suggestion recovery for "I do not know this
      // chain" failures. A rejection must propagate untouched — retrying would
      // pester the user with a second popup after they just said no.
      const walletDoesNotKnowChain =
        message.includes('there is no chain info') ||
        message.includes('chain info') ||
        message.includes('not found')

      if (!walletDoesNotKnowChain) throw enableError

      await suggestInjectiveChain(provider)
      await provider.enable(CHAIN_ID)
    }

    // ---------------------------------------------------------------------
    // STEP 2 — Read the account.
    //
    // `getKey` returns the address, the account's display name, and the public
    // key. Everything here is public information by design. The private key is
    // never part of this response and never will be.
    // ---------------------------------------------------------------------
    const key = await provider.getKey(CHAIN_ID)

    if (!key?.bech32Address) {
      throw wrongNetworkError('unknown')
    }

    // ---------------------------------------------------------------------
    // STEP 3 — Derive the Ethereum-format address.
    //
    // Injective accounts have two textual forms of the same underlying key:
    //   inj1…  bech32, used by Cosmos tooling and block explorers
    //   0x…    hex,    used by MetaMask and EVM tooling
    //
    // `getEthereumAddress` is a pure, offline conversion — decode the bech32,
    // re-encode the same 20 bytes as hex. No network call, no second account.
    // ---------------------------------------------------------------------
    const ethereumAddress = getEthereumAddress(key.bech32Address)

    // Remember only *which wallet* was used, so the next page load can offer to
    // reconnect. Never the address — see the note in `lib/constants.ts`.
    persistLastWallet(walletId)

    return {
      injectiveAddress: key.bech32Address,
      ethereumAddress,
      name: key.name || 'Account',
      walletId,
    }
  } catch (thrown) {
    throw toAppError(thrown, `connecting to ${metadata.name}`)
  }
}

/**
 * Returns a signer bound to the configured chain.
 *
 * PURPOSE
 * The object that produces signatures. `lib/transactions.ts` uses it, and
 * nothing else should.
 *
 * @param walletId Which wallet to get a signer from.
 * @returns An `OfflineDirectSigner`.
 * @throws {AppError} `WALLET_NOT_INSTALLED` if the extension has disappeared —
 *                    which genuinely happens if a user disables it mid-session.
 *
 * @example
 * ```ts
 * const signer = getOfflineSigner('keplr')
 * const { signature } = await signer.signDirect(address, signDoc)
 * ```
 *
 * WHY "OFFLINE" SIGNER
 * --------------------
 * Cosmos terminology, and a little misleading. It does not mean "no internet".
 * It means the signer can produce a signature *without your application ever
 * holding the private key*. The document goes in, a signature comes out, and
 * the key stays sealed inside the extension. That property is the entire
 * security model of browser wallets.
 */
export function getOfflineSigner(walletId: WalletId): OfflineDirectSigner {
  const provider = getWalletProvider(walletId)

  if (!provider) {
    const metadata = getWalletMetadata(walletId)
    throw walletNotInstalledError(metadata.name, metadata.downloadUrl)
  }

  return provider.getOfflineSigner(CHAIN_ID)
}

/**
 * Registers Injective testnet with a wallet that does not know it.
 *
 * PURPOSE
 * Keplr and Leap ship with Injective mainnet built in, but a wallet installed
 * before a given testnet existed will reject `enable('injective-888')`. This
 * describes the chain to the wallet so the user does not have to add it by hand
 * mid-workshop.
 *
 * @param provider The injected wallet provider.
 * @returns Nothing. Silently does nothing if the wallet lacks the API.
 *
 * WORKFLOW
 *   does the wallet support experimentalSuggestChain? -- no --> return
 *        | yes
 *        v
 *   call it with a full ChainInfo descriptor
 *        |
 *        v
 *   wallet shows an "Add chain?" popup
 *
 * NOTE ON THE `coinType: 60`
 * --------------------------
 * Most Cosmos chains use BIP-44 coin type 118. Injective uses **60** — the
 * Ethereum coin type — because its accounts are derived exactly the way
 * Ethereum accounts are. Get this wrong and the wallet derives a completely
 * different address from the same seed phrase, and the user's funds appear to
 * have vanished. It is the most consequential single number in this file.
 */
async function suggestInjectiveChain(
  provider: CosmosWalletProvider,
): Promise<void> {
  // Not every wallet exposes this. Older builds, and some mobile in-app
  // browsers, do not — in which case there is nothing we can do automatically.
  if (!provider.experimentalSuggestChain) return

  const isTestnet = CHAIN_ID === 'injective-888'

  await provider.experimentalSuggestChain({
    chainId: CHAIN_ID,
    chainName: isTestnet ? 'Injective Testnet' : 'Injective',
    rpc: isTestnet
      ? 'https://testnet.sentry.tm.injective.network'
      : 'https://sentry.tm.injective.network',
    rest: isTestnet
      ? 'https://testnet.sentry.lcd.injective.network'
      : 'https://sentry.lcd.injective.network',
    bip44: {
      // See the note above. 60, not 118.
      coinType: 60,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'inj',
      bech32PrefixAccPub: 'injpub',
      bech32PrefixValAddr: 'injvaloper',
      bech32PrefixValPub: 'injvaloperpub',
      bech32PrefixConsAddr: 'injvalcons',
      bech32PrefixConsPub: 'injvalconspub',
    },
    currencies: [
      {
        coinDenom: 'INJ',
        coinMinimalDenom: 'inj',
        coinDecimals: 18,
      },
    ],
    // `feeCurrencies` is what the wallet uses to suggest gas prices. It is
    // separate from `currencies` because on some chains you may hold a token
    // you cannot pay fees with.
    feeCurrencies: [
      {
        coinDenom: 'INJ',
        coinMinimalDenom: 'inj',
        coinDecimals: 18,
        gasPriceStep: { low: 0.0001, average: 0.00016, high: 0.0004 },
      },
    ],
    stakeCurrency: {
      coinDenom: 'INJ',
      coinMinimalDenom: 'inj',
      coinDecimals: 18,
    },
    features: ['ibc-transfer', 'ibc-go', 'eth-address-gen', 'eth-key-sign'],
  })
}

/* ---------------------------------------------------------------------------
 * Session persistence
 * ---------------------------------------------------------------------------
 * All three helpers below are wrapped in try/catch. `localStorage` throws in
 * Safari private mode and when a user has blocked site data. Losing the
 * "remember my wallet" convenience is acceptable; crashing the whole app
 * because of it is not.
 * ------------------------------------------------------------------------- */

/**
 * Remembers which wallet the user connected with.
 *
 * @param walletId The wallet to remember.
 */
export function persistLastWallet(walletId: WalletId): void {
  try {
    window.localStorage.setItem(LAST_WALLET_STORAGE_KEY, walletId)
  } catch {
    // Storage unavailable. Auto-reconnect will simply not happen next time.
  }
}

/**
 * Reads which wallet was last used, if any.
 *
 * @returns The stored `WalletId`, or `null`.
 *
 * @example
 * ```ts
 * const last = readLastWallet()
 * if (last) void connect(last) // silent reconnect on page load
 * ```
 */
export function readLastWallet(): WalletId | null {
  try {
    const stored = window.localStorage.getItem(LAST_WALLET_STORAGE_KEY)
    // Validate rather than trust. `localStorage` is user-writable, and an
    // unknown value here would throw deep inside `getWalletMetadata`.
    const isSupported = SUPPORTED_WALLETS.some((wallet) => wallet.id === stored)
    return isSupported ? (stored as WalletId) : null
  } catch {
    return null
  }
}

/**
 * Forgets the remembered wallet.
 *
 * WHY DISCONNECTING IS PURELY LOCAL
 * ---------------------------------
 * There is no "disconnect" on a blockchain, because there was never a
 * connection. Your app simply stops remembering the address. The wallet
 * extension may still consider your site approved, which is why clicking
 * "Connect" again often does not show a popup the second time.
 *
 * To truly revoke access, the user removes your site from their wallet's
 * connected-sites list. Worth saying out loud in a workshop — people expect
 * "disconnect" to mean more than it does.
 */
export function clearLastWallet(): void {
  try {
    window.localStorage.removeItem(LAST_WALLET_STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
