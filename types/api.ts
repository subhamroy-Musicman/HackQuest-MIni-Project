/**
 * =============================================================================
 * FILE: types/api.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Defines the contract between this project's *own* backend (`app/api/**`) and
 * its frontend (`lib/api.ts`).
 *
 * WHY IT EXISTS
 * -------------
 * This app does not call Injective nodes directly from the browser. Every read
 * goes through a Next.js Route Handler first. That design is explained at
 * length in `lib/queries.ts`, but the short version is:
 *
 *   * RPC endpoints stay server-side, so a paid node's URL is never leaked.
 *   * No CORS problems, ever.
 *   * The heavy Injective SDK stays out of the browser bundle for reads.
 *
 * Because there is now a network hop that *we* own, it deserves a typed,
 * predictable envelope. Every route in this project answers with the same
 * shape, so `lib/api.ts` needs exactly one piece of unwrapping logic instead of
 * one per endpoint.
 *
 * WHEN TO USE
 * -----------
 * Whenever you add a route handler, wrap its response in `ApiResponse<T>`.
 *
 * EXECUTION FLOW
 * --------------
 *   component
 *      | calls
 *      v
 *   hooks/useBalances.ts
 *      | calls
 *      v
 *   lib/api.ts  --- fetch --->  app/api/.../route.ts
 *                                    | returns ApiResponse<T>
 *                                    v
 *                               lib/api.ts unwraps it
 *                                    |
 *                                    v
 *                               T, or a thrown AppError
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `types/injective.ts`
 * Depended on by: `lib/api.ts`, every file in `app/api/`
 * =============================================================================
 */

import type { Balance, ChainStatus, TransactionResult } from './injective'

/**
 * The error half of an API response.
 *
 * Note that this carries a `code` as well as a `message`. The code lets the
 * frontend react programmatically (e.g. offer a "Get testnet INJ" button when
 * the code is `INSUFFICIENT_BALANCE`) while the message is what a human reads.
 * Returning only a string forces the frontend to match on English text, which
 * breaks the moment anyone rewords an error.
 */
export interface ApiError {
  /** Machine-readable identifier. Mirrors `ErrorCode` in `lib/errors.ts`. */
  code: string
  /** Sentence explaining what went wrong, written for a learner. */
  message: string
  /** Concrete next step the user can take, when one exists. */
  hint?: string
}

/**
 * A discriminated union: exactly one of `data` or `error` is present.
 *
 * TypeScript narrows this automatically, so after `if (!response.ok)` the
 * compiler *knows* `response.error` exists. That is what makes the unwrap
 * helper in `lib/api.ts` short and safe.
 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }

/** Response body of `GET /api/chain/status`. */
export type ChainStatusResponse = ApiResponse<ChainStatus>

/** Response body of `GET /api/account/[address]/balances`. */
export type BalancesResponse = ApiResponse<{
  address: string
  balances: Balance[]
}>

/**
 * Response body of `GET /api/account/[address]/auth`.
 *
 * WHY THE FRONTEND NEEDS THIS
 * ---------------------------
 * Before you can sign a Cosmos transaction you must know two numbers that
 * live on-chain:
 *
 *   accountNumber — a permanent id assigned when the account first receives
 *                   funds. Never changes.
 *   sequence      — a per-account counter, incremented by every successful
 *                   transaction. This is Cosmos' replay protection: a signed
 *                   transaction is only valid for exactly one sequence value,
 *                   so an attacker cannot re-broadcast it later.
 *
 * Get the sequence wrong and the chain rejects the transaction with the
 * infamous "account sequence mismatch" error. See `lib/errors.ts`.
 */
export type AccountAuthResponse = ApiResponse<{
  address: string
  accountNumber: number
  sequence: number
  /**
   * The chain's current block height at the time of the query.
   *
   * Used to compute `timeoutHeight` — a "best before" block number after which
   * the transaction becomes invalid. Without it, a transaction stuck in a
   * mempool could execute hours later at a price the user never agreed to.
   */
  latestBlockHeight: string
}>

/**
 * Request body of `POST /api/tx/broadcast`.
 *
 * WHAT A SIGNED COSMOS TRANSACTION ACTUALLY IS
 * --------------------------------------------
 * A `TxRaw` — the thing you broadcast — has exactly three fields, and seeing
 * them spelled out here is worth more than any diagram:
 *
 *   bodyBytes     the messages, the memo and the timeout height, serialised
 *   authInfoBytes the public key, the fee and the sequence, serialised
 *   signatures    one signature per signer, over the two blobs above
 *
 * That is the entire transaction. Everything else — the hash, the block, the
 * result — is derived from these bytes by the network.
 *
 * All three are binary, and JSON has no binary type, so each is base64-encoded
 * for the trip from the browser to our server. The server rebuilds the object
 * and hands it to the SDK.
 *
 * Nothing secret travels here. A signed transaction is public by design — it is
 * about to be published to a global ledger — and it cannot be modified without
 * invalidating the signature. The private key never left the wallet extension.
 */
export interface BroadcastRequestBody {
  /** Base64 of the serialised `TxBody`: messages, memo, timeout height. */
  bodyBytes: string
  /** Base64 of the serialised `AuthInfo`: public key, fee, sequence. */
  authInfoBytes: string
  /** Base64 of each signature, in the same order as the signers. */
  signatures: string[]
}

/** Response body of `POST /api/tx/broadcast`. */
export type BroadcastResponse = ApiResponse<TransactionResult>
