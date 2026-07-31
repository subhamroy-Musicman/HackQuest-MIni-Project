/**
 * =============================================================================
 * FILE: types/wallet.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Describes everything the application knows about "a connected wallet":
 * which extension it is, what state the connection is in, and what data we
 * hold once connected.
 *
 * WHY IT EXISTS
 * -------------
 * Wallet connection is not a boolean. Beginners model it as
 * `const [connected, setConnected] = useState(false)` and then immediately hit
 * three bugs:
 *
 *   1. The page renders "Not connected" for a split second on every reload,
 *      even for users who were connected — because reconnecting is async.
 *   2. "Connecting" and "connected" become indistinguishable, so the button
 *      can be clicked twice and two wallet popups appear.
 *   3. An error during connection leaves the UI stuck.
 *
 * Modelling the connection as an explicit *state machine* (`WalletStatus`)
 * removes all three bugs by construction. This is the single highest-value
 * design decision in the whole project, so it lives in its own type.
 *
 * WHEN TO USE
 * -----------
 * Import these types anywhere you touch wallet state: the provider, hooks,
 * and any component that renders differently when connected.
 *
 * EXECUTION FLOW
 * --------------
 *   disconnected --click--> connecting --success--> connected
 *        ^                      |
 *        |                      +--rejected/error--> errored
 *        |                                              |
 *        +----------------------------------------------+
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing
 * Depended on by:
 *   - `context/WalletProvider.tsx`
 *   - `hooks/useWallet.ts`
 *   - `lib/wallet.ts`
 *   - every wallet-aware component
 * =============================================================================
 */

/**
 * The wallets this app supports.
 *
 * Kept as a string-literal union rather than a TypeScript `enum` because the
 * values are persisted to `localStorage` and sent across the React tree. A
 * plain string survives `JSON.stringify` round-trips; an enum member does not
 * always behave the way beginners expect when it does.
 */
export type WalletId = 'keplr' | 'leap'

/**
 * Static, human-facing information about a wallet.
 *
 * This is what the wallet-picker modal renders. It is deliberately separate
 * from the runtime connection logic so that adding a third wallet is a data
 * change (add an entry to `SUPPORTED_WALLETS`) rather than a code change.
 */
export interface WalletMetadata {
  /** Stable machine identifier. Also the `localStorage` value. */
  id: WalletId
  /** Display name, e.g. "Keplr". */
  name: string
  /** One-line pitch shown under the name in the picker. */
  description: string
  /** Where to send users who do not have the extension installed. */
  downloadUrl: string
  /**
   * Which `window` property the extension injects.
   *
   * Storing the key as data (rather than writing `window.keplr` in an if/else)
   * is what lets `lib/wallet.ts` handle every wallet with one code path.
   */
  windowKey: 'keplr' | 'leap'
}

/**
 * The connection state machine.
 *
 * - `disconnected` — no wallet. The default, and the state after an explicit
 *   disconnect.
 * - `connecting`   — a popup is open, or we are restoring a previous session.
 *   The connect button must be disabled in this state.
 * - `connected`    — we have an address. `account` is guaranteed non-null.
 * - `errored`      — the last attempt failed. `error` is guaranteed non-null.
 */
export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'errored'

/**
 * The identity of a connected user.
 *
 * WHY TWO ADDRESSES?
 * ------------------
 * Injective is a Cosmos chain that is also fully Ethereum-compatible. Every
 * account therefore has two textual representations of the *same* underlying
 * key:
 *
 *   injectiveAddress : inj1... (bech32, the Cosmos-native form)
 *   ethereumAddress  : 0x...   (hex, the Ethereum form)
 *
 * They are not two accounts. They are two encodings of one 20-byte value, and
 * the SDK can convert between them losslessly with `getEthereumAddress()` /
 * `getInjectiveAddress()`. Cosmos tooling and block explorers expect `inj1...`;
 * MetaMask and EVM tooling expect `0x...`.
 */
export interface WalletAccount {
  /** Bech32 address, e.g. `inj1qqq...`. This is what you send tokens to. */
  injectiveAddress: string
  /** The same account rendered in Ethereum hex form, e.g. `0xabc...`. */
  ethereumAddress: string
  /** The label the user gave this account inside their wallet, e.g. "Account 1". */
  name: string
  /** Which extension produced this account. */
  walletId: WalletId
}

/**
 * Everything `useWallet()` hands back to a component.
 *
 * Exposing the raw `status` *and* a derived `isConnected` boolean is a small
 * ergonomic luxury: components that only care "is there an address?" stay
 * readable, while components that render a spinner can still switch on the
 * full state machine.
 */
export interface WalletContextValue {
  status: WalletStatus
  /** Non-null exactly when `status === 'connected'`. */
  account: WalletAccount | null
  /** Non-null exactly when `status === 'errored'`. */
  error: string | null
  /** Convenience derived flags, so components do not repeat string comparisons. */
  isConnected: boolean
  isConnecting: boolean
  /** Opens the given wallet's popup and, on success, stores the account. */
  connect: (walletId: WalletId) => Promise<void>
  /** Forgets the account locally. See `lib/wallet.ts` for why this is local-only. */
  disconnect: () => void
}
