/**
 * =============================================================================
 * FILE: types/global.d.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Teaches TypeScript that browser extensions like Keplr and Leap inject objects
 * onto `window`. Without this file, `window.keplr` is a compile error.
 *
 * WHY IT EXISTS
 * -------------
 * A wallet extension has no npm package that you import. It is a browser
 * extension that, when installed, *mutates the global `window` object* of every
 * page you visit and adds `window.keplr` (and `window.leap`, `window.ethereum`,
 * and so on).
 *
 * That is the entire "wallet API": a global object that appeared out of nowhere.
 * This is the single most important mental model for wallet integration —
 * there is no server, no SDK call, no handshake. The extension is just *there*,
 * or it is not.
 *
 * Because the object is injected at runtime, TypeScript cannot know about it.
 * A `declare global` block is how we describe it to the compiler.
 *
 * WHEN TO USE
 * -----------
 * You never import this file. TypeScript picks up any `.d.ts` inside the
 * project automatically (see `include` in `tsconfig.json`). You only edit it
 * when you want to support an additional wallet.
 *
 * EXECUTION FLOW
 * --------------
 *   User installs Keplr extension
 *          |
 *          v
 *   Extension injects `window.keplr` into every page
 *          |
 *          v
 *   `lib/wallet.ts` reads `window.keplr`
 *          |
 *          v
 *   This file is what makes that read type-safe
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing (pure type declarations)
 * Depended on by:
 *   - `lib/wallet.ts`      (detects and connects wallets)
 *   - `lib/transactions.ts`(asks the wallet to sign)
 * =============================================================================
 */

/**
 * The minimal shape of a Cosmos "offline signer".
 *
 * "Offline" is historical Cosmos terminology and is slightly misleading. It
 * does NOT mean "no internet". It means: *this object can produce a signature
 * without the application ever seeing the private key*. The key stays inside
 * the extension's sandboxed storage; your page only ever receives the finished
 * signature.
 *
 * That guarantee is the whole reason wallets exist.
 */
export interface OfflineDirectSigner {
  /**
   * Returns the account(s) the user has unlocked for this chain.
   *
   * `pubkey` is the account's *public* key as raw bytes. Publishing it is
   * harmless — it is derived from the private key in a one-way fashion, and
   * the chain needs it to verify your signature.
   */
  getAccounts(): Promise<
    Array<{
      address: string
      algo: string
      pubkey: Uint8Array
    }>
  >

  /**
   * Signs a `SignDoc` using the SIGN_MODE_DIRECT scheme.
   *
   * SIGN_MODE_DIRECT means "sign the raw protobuf bytes of the transaction".
   * It is the modern, compact Cosmos signing mode and the one Injective uses
   * for Cosmos-native wallets. (The older `signAmino` mode signs a JSON
   * representation instead; Injective supports it too, but Direct is preferred.)
   *
   * The returned `signed` document is IMPORTANT: a wallet is allowed to modify
   * the fee before signing. You must broadcast the document the wallet returned,
   * not the one you sent it. `getTxRawFromTxRawOrDirectSignResponse()` in the
   * SDK handles this for you.
   */
  signDirect(
    signerAddress: string,
    signDoc: {
      bodyBytes: Uint8Array
      authInfoBytes: Uint8Array
      chainId: string
      accountNumber: bigint
    },
  ): Promise<{
    signed: {
      bodyBytes: Uint8Array
      authInfoBytes: Uint8Array
      chainId: string
      accountNumber: bigint
    }
    signature: {
      pub_key: { type: string; value: string }
      signature: string
    }
  }>
}

/**
 * The subset of the Keplr/Leap extension API that this project actually uses.
 *
 * Both wallets implement the same interface. Leap was written to be a drop-in
 * replacement for Keplr, which is why `lib/wallet.ts` can treat them
 * identically and only differ in which global it reads.
 */
export interface CosmosWalletProvider {
  /**
   * Asks the extension to unlock and expose the given chain to this website.
   *
   * This is the call that pops open the extension window and shows the user
   * "example.com wants to connect". Nothing else in the wallet API works until
   * `enable()` has resolved.
   *
   * Throws if the user clicks "Reject".
   */
  enable(chainId: string | string[]): Promise<void>

  /** Returns the address, name and public key for a chain the user has enabled. */
  getKey(chainId: string): Promise<{
    name: string
    algo: string
    pubKey: Uint8Array
    address: Uint8Array
    bech32Address: string
    isNanoLedger: boolean
  }>

  /**
   * Returns a signer bound to one chain.
   *
   * Note the name: `getOfflineSigner` is synchronous in Keplr and returns the
   * signer immediately. Some wallets also expose `getOfflineSignerAuto`, which
   * picks Direct vs Amino automatically (useful for Ledger, which cannot do
   * Direct signing). We use the explicit Direct signer for clarity.
   */
  getOfflineSigner(chainId: string): OfflineDirectSigner

  /**
   * Registers a chain the wallet does not know about yet.
   *
   * Keplr and Leap ship with Injective mainnet built in, but a brand-new
   * testnet — or a locally-run chain — has to be described to the wallet
   * before `enable()` will work. `lib/wallet.ts` calls this as a fallback.
   *
   * Typed loosely as `unknown` because the full `ChainInfo` shape is ~60 fields
   * and pinning it down here would obscure rather than teach.
   */
  experimentalSuggestChain?(chainInfo: unknown): Promise<void>
}

declare global {
  interface Window {
    /** Present only if the user has the Keplr browser extension installed. */
    keplr?: CosmosWalletProvider
    /** Present only if the user has the Leap browser extension installed. */
    leap?: CosmosWalletProvider
  }
}

// A `.d.ts` file containing `declare global` must also be a module, otherwise
// TypeScript treats the whole file as a script and the `Window` augmentation
// leaks in confusing ways. This empty export is the idiomatic way to say
// "yes, this is a module".
export {}
